"""RelayFlow web app: server-rendered UI, public intake form, lead webhook, Stripe webhook."""

import hmac
import json
import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates

from . import audit, auth, billing, db, service
from .config import Settings, load_settings
from .service import LEAD_STATUSES, RelayError

log = logging.getLogger(__name__)
SESSION_COOKIE = "rf_session"
MAX_BODY = 64 * 1024

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="RelayFlow", docs_url=None, redoc_url=None)
    app.state.settings = settings
    db.connect(settings.database_path).close()  # create schema up front

    @contextmanager
    def open_db():
        conn = db.connect(settings.database_path)
        try:
            yield conn
        finally:
            conn.close()

    def get_conn():
        with open_db() as conn:
            yield conn

    def prepare_in_background(ws_id: int, lead_id: int) -> None:
        with open_db() as conn:
            try:
                service.prepare_lead(conn, settings, ws_id, lead_id)
            except Exception:
                log.exception("lead preparation failed for lead %s", lead_id)
                audit.log(conn, ws_id, audit.ACTOR_AGENT, "lead-prep", "lead.prepare_failed", "lead", lead_id)

    # --- auth helpers -------------------------------------------------------------------------

    class Ctx:
        def __init__(self, request: Request, conn: sqlite3.Connection):
            self.request = request
            self.conn = conn
            self.token = request.cookies.get(SESSION_COOKIE)
            self.user = auth.user_for_session(conn, self.token)
            self.workspace = service.get_workspace(conn, self.user["workspace_id"]) if self.user else None

        @property
        def csrf(self) -> str:
            return auth.csrf_token(settings.secret_key, self.token or "")

        def render(self, name: str, status_code: int = 200, **kw):
            kw.update(user=self.user, workspace=self.workspace, csrf=self.csrf, settings=settings,
                      flash=self.request.query_params.get("msg", ""),
                      error=kw.get("error") or self.request.query_params.get("err", ""))
            return templates.TemplateResponse(self.request, name, kw, status_code=status_code)

    def ctx(request: Request, conn: sqlite3.Connection = Depends(get_conn)) -> Ctx:
        return Ctx(request, conn)

    def require_user(c: Ctx = Depends(ctx)) -> Ctx:
        if not c.user:
            raise HTTPException(status_code=303, headers={"Location": "/login"})
        return c

    async def require_csrf(request: Request, c: Ctx = Depends(require_user)) -> Ctx:
        form = await request.form()
        if not hmac.compare_digest(str(form.get("csrf", "")), c.csrf):
            raise HTTPException(status_code=403, detail="Invalid form token; reload the page and try again.")
        return c

    def back(path: str, msg: str = "", err: str = "") -> RedirectResponse:
        from urllib.parse import urlencode
        q = urlencode({k: v for k, v in (("msg", msg), ("err", err)) if v})
        return RedirectResponse(f"{path}?{q}" if q else path, status_code=303)

    def login_response(conn, user_id: int, to: str = "/") -> RedirectResponse:
        token = auth.create_session(conn, user_id)
        resp = RedirectResponse(to, status_code=303)
        resp.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", secure=settings.secure_cookies,
                        max_age=auth.SESSION_DAYS * 86400)
        return resp

    # --- public -------------------------------------------------------------------------------

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    @app.get("/signup", response_class=HTMLResponse)
    def signup_form(c: Ctx = Depends(ctx)):
        return c.render("signup.html")

    @app.post("/signup")
    def signup(c: Ctx = Depends(ctx), business: str = Form(""), name: str = Form(""), email: str = Form(""),
               password: str = Form("")):
        try:
            _, user_id = service.create_workspace(c.conn, business, email, name, password)
        except RelayError as exc:
            return c.render("signup.html", status_code=400, error=str(exc), form={"business": business,
                                                                                  "name": name, "email": email})
        return login_response(c.conn, user_id, "/settings?msg=Workspace+created")

    @app.get("/login", response_class=HTMLResponse)
    def login_form(c: Ctx = Depends(ctx)):
        return c.render("login.html")

    @app.post("/login")
    def login(c: Ctx = Depends(ctx), email: str = Form(""), password: str = Form("")):
        user = c.conn.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
        if not user or not auth.verify_password(password, user["password_hash"]):
            return c.render("login.html", status_code=400, error="Wrong email or password.")
        audit.log(c.conn, user["workspace_id"], audit.ACTOR_USER, user["id"], "user.login", "user", user["id"])
        return login_response(c.conn, user["id"])

    @app.post("/logout")
    def logout(c: Ctx = Depends(require_csrf)):
        auth.delete_session(c.conn, c.token)
        resp = RedirectResponse("/login", status_code=303)
        resp.delete_cookie(SESSION_COOKIE)
        return resp

    @app.get("/f/{slug}", response_class=HTMLResponse)
    def intake_form(slug: str, request: Request, conn: sqlite3.Connection = Depends(get_conn)):
        ws = service.workspace_by(conn, "slug", slug)
        if not ws:
            raise HTTPException(404)
        return templates.TemplateResponse(request, "intake.html", {"ws": ws, "done": False, "error": ""})

    @app.post("/f/{slug}", response_class=HTMLResponse)
    async def intake_submit(slug: str, request: Request, tasks: BackgroundTasks,
                            conn: sqlite3.Connection = Depends(get_conn)):
        ws = service.workspace_by(conn, "slug", slug)
        if not ws:
            raise HTTPException(404)
        form = dict(await request.form())
        if form.get("website"):  # honeypot: humans never fill this hidden field
            return templates.TemplateResponse(request, "intake.html", {"ws": ws, "done": True, "error": ""})
        try:
            lead_id = service.intake_lead(conn, ws, form, "web form")
        except RelayError as exc:
            return templates.TemplateResponse(request, "intake.html", {"ws": ws, "done": False, "error": str(exc),
                                                                       "form": form}, status_code=400)
        tasks.add_task(prepare_in_background, ws["id"], lead_id)
        return templates.TemplateResponse(request, "intake.html", {"ws": ws, "done": True, "error": ""})

    @app.post("/hooks/leads/{token}")
    async def lead_webhook(token: str, request: Request, tasks: BackgroundTasks,
                           conn: sqlite3.Connection = Depends(get_conn)):
        ws = service.workspace_by(conn, "webhook_token", token)
        if not ws:
            raise HTTPException(404, "Unknown intake endpoint.")
        body = await request.body()
        if len(body) > MAX_BODY:
            raise HTTPException(413, "Payload too large.")
        if request.headers.get("content-type", "").startswith("application/json"):
            try:
                data = json.loads(body or b"{}")
            except json.JSONDecodeError:
                raise HTTPException(400, "Body is not valid JSON.")
            if not isinstance(data, dict):
                raise HTTPException(400, "Body must be a JSON object.")
        else:
            data = dict(await request.form())
        try:
            lead_id = service.intake_lead(conn, ws, data, "webhook")
        except RelayError as exc:
            raise HTTPException(422, str(exc))
        tasks.add_task(prepare_in_background, ws["id"], lead_id)
        return JSONResponse({"ok": True, "lead_id": lead_id}, status_code=201)

    @app.post("/stripe/webhook")
    async def stripe_webhook(request: Request, conn: sqlite3.Connection = Depends(get_conn)):
        payload = await request.body()
        try:
            etype = billing.handle_webhook(conn, settings, payload, request.headers.get("stripe-signature", ""))
        except ValueError as exc:
            raise HTTPException(400, str(exc))
        return {"received": etype}

    # --- app pages ----------------------------------------------------------------------------

    @app.get("/", response_class=HTMLResponse)
    def home(c: Ctx = Depends(ctx)):
        if not c.user:
            return RedirectResponse("/login", status_code=303)
        ws_id = c.user["workspace_id"]
        return c.render("dashboard.html", stats=service.dashboard(c.conn, ws_id),
                        leads=service.list_leads(c.conn, ws_id)[:10],
                        pending=service.list_messages(c.conn, ws_id, ("draft", "approved"))[:10])

    @app.get("/leads", response_class=HTMLResponse)
    def leads(status: str = "", c: Ctx = Depends(require_user)):
        status = status if status in LEAD_STATUSES else ""
        return c.render("leads.html", leads=service.list_leads(c.conn, c.user["workspace_id"], status or None),
                        status=status, statuses=LEAD_STATUSES)

    @app.post("/leads")
    def add_lead(tasks: BackgroundTasks, c: Ctx = Depends(require_csrf), name: str = Form(""),
                 email: str = Form(""), phone: str = Form(""), address: str = Form(""), service_: str = Form("", alias="service"),
                 message: str = Form(""), source: str = Form("manual")):
        data = dict(name=name, email=email, phone=phone, address=address, service=service_, message=message,
                    source=source)
        try:
            lead_id = service.create_lead(c.conn, c.user["workspace_id"], data, audit.ACTOR_USER, c.user["id"])
        except RelayError as exc:
            return back("/leads", err=str(exc))
        tasks.add_task(prepare_in_background, c.user["workspace_id"], lead_id)
        return back(f"/leads/{lead_id}", msg="Lead added; the agent is preparing a summary and draft.")

    @app.get("/leads/{lead_id}", response_class=HTMLResponse)
    def lead_detail(lead_id: int, c: Ctx = Depends(require_user)):
        ws_id = c.user["workspace_id"]
        try:
            lead = service.get_lead(c.conn, ws_id, lead_id)
        except RelayError:
            raise HTTPException(404)
        return c.render("lead.html", lead=lead, statuses=LEAD_STATUSES,
                        messages=service.list_messages(c.conn, ws_id, lead_id=lead_id),
                        history=audit.entries(c.conn, ws_id, 50, ("lead", lead_id)))

    @app.post("/leads/{lead_id}/status")
    def lead_status(lead_id: int, status: str = Form(...), c: Ctx = Depends(require_csrf)):
        try:
            service.set_lead_status(c.conn, c.user, lead_id, status)
        except RelayError as exc:
            return back(f"/leads/{lead_id}", err=str(exc))
        return back(f"/leads/{lead_id}", msg=f"Marked {status}.")

    @app.post("/leads/{lead_id}/sequence")
    def lead_sequence(lead_id: int, paused: str = Form("0"), c: Ctx = Depends(require_csrf)):
        try:
            service.set_sequence_paused(c.conn, c.user, lead_id, paused == "1")
        except RelayError as exc:
            return back(f"/leads/{lead_id}", err=str(exc))
        return back(f"/leads/{lead_id}", msg="Follow-up sequence " + ("paused." if paused == "1" else "resumed."))

    @app.post("/leads/{lead_id}/prepare")
    def lead_prepare(lead_id: int, c: Ctx = Depends(require_csrf)):
        try:
            msg_id = service.prepare_lead(c.conn, settings, c.user["workspace_id"], lead_id,
                                          requested_by=f"user:{c.user['id']}")
        except RelayError as exc:
            return back(f"/leads/{lead_id}", err=str(exc))
        return back(f"/leads/{lead_id}", msg="Summary refreshed." + (" Draft queued for approval." if msg_id else ""))

    # --- approval queue -----------------------------------------------------------------------

    @app.get("/approvals", response_class=HTMLResponse)
    def approvals(c: Ctx = Depends(require_user)):
        ws_id = c.user["workspace_id"]
        return c.render("approvals.html", pending=service.list_messages(c.conn, ws_id, ("draft", "approved")),
                        recent=service.list_messages(c.conn, ws_id, ("sent", "failed", "rejected", "cancelled"))[:25])

    @app.post("/messages/{msg_id}/edit")
    def message_edit(msg_id: int, subject: str = Form(""), body: str = Form(""), c: Ctx = Depends(require_csrf)):
        try:
            service.edit_draft(c.conn, c.user, msg_id, subject, body)
        except RelayError as exc:
            return back("/approvals", err=str(exc))
        return back("/approvals", msg="Draft updated.")

    @app.post("/messages/{msg_id}/approve")
    def message_approve(msg_id: int, ack: str = Form(""), send: str = Form("1"), c: Ctx = Depends(require_csrf)):
        try:
            service.approve_message(c.conn, c.user, msg_id, acknowledge_flags=ack == "1")
            if send == "1":
                service.send_message(c.conn, settings, c.user, msg_id)
        except RelayError as exc:
            return back("/approvals", err=str(exc))
        return back("/approvals", msg="Approved and sent." if send == "1" else "Approved.")

    @app.post("/messages/{msg_id}/send")
    def message_send(msg_id: int, c: Ctx = Depends(require_csrf)):
        try:
            service.send_message(c.conn, settings, c.user, msg_id)
        except RelayError as exc:
            return back("/approvals", err=str(exc))
        return back("/approvals", msg="Sent.")

    @app.post("/messages/{msg_id}/reject")
    def message_reject(msg_id: int, pause: str = Form(""), c: Ctx = Depends(require_csrf)):
        try:
            service.reject_message(c.conn, c.user, msg_id, pause_sequence=pause == "1")
        except RelayError as exc:
            return back("/approvals", err=str(exc))
        return back("/approvals", msg="Draft rejected.")

    # --- sequences & workflow -----------------------------------------------------------------

    @app.get("/sequence", response_class=HTMLResponse)
    def sequence_page(c: Ctx = Depends(require_user)):
        return c.render("sequence.html", seq=service.get_sequence(c.conn, c.user["workspace_id"]))

    @app.post("/sequence")
    async def sequence_save(request: Request, c: Ctx = Depends(require_csrf)):
        form = await request.form()
        seq = service.get_sequence(c.conn, c.user["workspace_id"])
        steps = []
        for i in range(11):
            if f"delay_{i}" not in form or form.get(f"remove_{i}") == "1":
                continue
            subject, body = str(form.get(f"subject_{i}", "")).strip(), str(form.get(f"body_{i}", "")).strip()
            is_ai = form.get(f"ai_{i}") == "1"
            if not (subject or body or is_ai):
                continue
            steps.append({"delay_days": form.get(f"delay_{i}") or 0, "ai": is_ai, "subject": subject, "body": body})
        try:
            service.save_sequence(c.conn, c.user, seq["id"], steps)
        except RelayError as exc:
            return back("/sequence", err=str(exc))
        return back("/sequence", msg="Sequence saved.")

    @app.get("/workflow/export")
    def workflow_export(c: Ctx = Depends(require_user)):
        bundle = service.export_workflow(c.conn, c.user["workspace_id"])
        audit.log(c.conn, c.user["workspace_id"], audit.ACTOR_USER, c.user["id"], "workflow.exported")
        return Response(json.dumps(bundle, indent=2), media_type="application/json",
                        headers={"Content-Disposition": 'attachment; filename="relayflow-workflow.json"'})

    @app.post("/workflow/import")
    async def workflow_import(file: UploadFile = File(...), profile: str = Form(""), c: Ctx = Depends(require_csrf)):
        try:
            bundle = json.loads((await file.read(MAX_BODY + 1))[:MAX_BODY])
            service.import_workflow(c.conn, c.user, bundle, include_profile=profile == "1")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return back("/sequence", err="That file is not valid JSON.")
        except RelayError as exc:
            return back("/sequence", err=str(exc))
        return back("/sequence", msg="Workflow imported.")

    # --- data, audit, settings, billing -------------------------------------------------------

    @app.get("/data", response_class=HTMLResponse)
    def data_page(c: Ctx = Depends(require_user)):
        return c.render("data.html")

    @app.post("/data/import")
    async def data_import(file: UploadFile = File(...), confirm: str = Form(""), c: Ctx = Depends(require_csrf)):
        if confirm != "1":
            return back("/data", err="Confirm you have permission to upload this customer data.")
        raw = await file.read(5 * 1024 * 1024 + 1)
        if len(raw) > 5 * 1024 * 1024:
            return back("/data", err="CSV must be under 5 MB.")
        try:
            result = service.import_leads_csv(c.conn, c.user, raw)
        except RelayError as exc:
            return back("/data", err=str(exc))
        return c.render("data.html", result=result)

    @app.get("/data/leads.csv")
    def data_export(c: Ctx = Depends(require_user)):
        return PlainTextResponse(service.export_leads_csv(c.conn, c.user), media_type="text/csv",
                                 headers={"Content-Disposition": 'attachment; filename="leads.csv"'})

    @app.get("/audit", response_class=HTMLResponse)
    def audit_page(c: Ctx = Depends(require_user)):
        return c.render("audit.html", entries=audit.entries(c.conn, c.user["workspace_id"], 300))

    @app.get("/audit.csv")
    def audit_export(c: Ctx = Depends(require_user)):
        return PlainTextResponse(service.export_audit_csv(c.conn, c.user), media_type="text/csv",
                                 headers={"Content-Disposition": 'attachment; filename="audit-log.csv"'})

    @app.get("/settings", response_class=HTMLResponse)
    def settings_page(c: Ctx = Depends(require_user)):
        users = c.conn.execute("SELECT id, email, name, role FROM users WHERE workspace_id = ?",
                               (c.user["workspace_id"],)).fetchall()
        return c.render("settings.html", users=users)

    @app.post("/settings")
    def settings_save(business_profile: str = Form(""), reply_to: str = Form(""), c: Ctx = Depends(require_csrf)):
        try:
            service.update_settings(c.conn, c.user, business_profile, reply_to)
        except RelayError as exc:
            return back("/settings", err=str(exc))
        return back("/settings", msg="Settings saved.")

    @app.post("/settings/rotate-webhook")
    def settings_rotate(c: Ctx = Depends(require_csrf)):
        try:
            service.rotate_webhook_token(c.conn, c.user)
        except RelayError as exc:
            return back("/settings", err=str(exc))
        return back("/settings", msg="Webhook URL rotated. Update any connected forms.")

    @app.post("/settings/users")
    def settings_add_user(email: str = Form(""), name: str = Form(""), password: str = Form(""),
                          c: Ctx = Depends(require_csrf)):
        try:
            service.add_user(c.conn, c.user, email, name, password)
        except RelayError as exc:
            return back("/settings", err=str(exc))
        return back("/settings", msg="User added.")

    @app.post("/agent/run")
    def agent_run(c: Ctx = Depends(require_csrf)):
        stats = service.run_agent_tick(c.conn, settings, c.user["workspace_id"])
        return back("/approvals", msg=f"Agent run: {stats['prepared']} leads prepared, {stats['drafted']} drafts queued.")

    @app.get("/billing", response_class=HTMLResponse)
    def billing_page(c: Ctx = Depends(require_user)):
        return c.render("billing.html", checkout=c.request.query_params.get("checkout", ""))

    @app.post("/billing/checkout")
    def billing_checkout(c: Ctx = Depends(require_csrf)):
        try:
            return RedirectResponse(billing.create_checkout(c.conn, settings, c.user), status_code=303)
        except RelayError as exc:
            return back("/billing", err=str(exc))

    @app.post("/billing/portal")
    def billing_portal(c: Ctx = Depends(require_csrf)):
        try:
            return RedirectResponse(billing.create_portal(c.conn, settings, c.user), status_code=303)
        except RelayError as exc:
            return back("/billing", err=str(exc))

    return app
