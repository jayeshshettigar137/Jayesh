"""Core domain operations: workspaces, leads, follow-up sequences, approval queue, metrics.

Every state change writes an audit entry. Outbound messages can only be delivered after a
human user approves them (see `approve_message` / `send_message`).
"""

import csv
import io
import json
import re
import secrets
import sqlite3
import statistics
from datetime import datetime, timedelta, timezone

from . import ai, audit, mailer
from .audit import ACTOR_AGENT, ACTOR_SYSTEM, ACTOR_USER, ACTOR_WEBHOOK
from .auth import hash_password
from .config import Settings
from .db import now, parse_ts

LEAD_STATUSES = ["new", "contacted", "quoted", "booked", "lost"]
OPEN_STATUSES = ("new", "contacted", "quoted")
LEAD_FIELDS = ["name", "email", "phone", "address", "service", "message", "source"]
MAX_FIELD_LEN = 5000
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

DEFAULT_SEQUENCE = [
    {"delay_days": 0, "ai": True, "subject": "", "body": ""},
    {
        "delay_days": 2,
        "ai": False,
        "subject": "Following up on your {service} request",
        "body": "Hi {first_name},\n\nJust checking in on your {service} request. If you can share the "
        "details we asked about, we'll get your quote prepared.\n\nIf you've already taken care of it, "
        "no problem - just let us know.\n\nThank you,\n{business}",
    },
    {
        "delay_days": 5,
        "ai": False,
        "subject": "Should we keep your {service} request open?",
        "body": "Hi {first_name},\n\nWe haven't heard back, so we wanted to check whether you'd still "
        "like help with {service}. Reply to this email any time and we'll pick it up from here.\n\n"
        "Thank you,\n{business}",
    },
]


class RelayError(Exception):
    """A user-facing rule violation (bad input, missing approval, wrong state)."""


def _clean(value) -> str:
    return str(value or "").strip()[:MAX_FIELD_LEN]


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]
    return slug or "workspace"


# --- Workspaces & users -----------------------------------------------------------------------

def create_workspace(conn: sqlite3.Connection, name: str, owner_email: str, owner_name: str, password: str):
    name, owner_email = _clean(name), _clean(owner_email).lower()
    if not name:
        raise RelayError("Business name is required.")
    if not EMAIL_RE.match(owner_email):
        raise RelayError("A valid email is required.")
    if len(password) < 10:
        raise RelayError("Password must be at least 10 characters.")
    if conn.execute("SELECT 1 FROM users WHERE email = ?", (owner_email,)).fetchone():
        raise RelayError("An account with that email already exists.")

    base = slug = slugify(name)
    while conn.execute("SELECT 1 FROM workspaces WHERE slug = ?", (slug,)).fetchone():
        slug = f"{base}-{secrets.token_hex(2)}"
    ts = now()
    conn.execute("BEGIN")
    try:
        ws_id = conn.execute(
            "INSERT INTO workspaces (name, slug, webhook_token, reply_to, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, slug, secrets.token_urlsafe(24), owner_email, ts),
        ).lastrowid
        user_id = conn.execute(
            "INSERT INTO users (workspace_id, email, name, password_hash, role, created_at)"
            " VALUES (?, ?, ?, ?, 'owner', ?)",
            (ws_id, owner_email, _clean(owner_name), hash_password(password), ts),
        ).lastrowid
        seq_id = conn.execute(
            "INSERT INTO sequences (workspace_id, name, steps_json, is_default, created_at) VALUES (?, ?, ?, 1, ?)",
            (ws_id, "Default follow-up", json.dumps(DEFAULT_SEQUENCE), ts),
        ).lastrowid
        audit.log(conn, ws_id, ACTOR_USER, user_id, "workspace.created", "workspace", ws_id, name=name, slug=slug)
        audit.log(conn, ws_id, ACTOR_SYSTEM, "setup", "sequence.created", "sequence", seq_id, default=True)
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return get_workspace(conn, ws_id), user_id


def add_user(conn: sqlite3.Connection, actor, email: str, name: str, password: str) -> int:
    if actor["role"] != "owner":
        raise RelayError("Only the workspace owner can add users.")
    email = _clean(email).lower()
    if not EMAIL_RE.match(email):
        raise RelayError("A valid email is required.")
    if len(password) < 10:
        raise RelayError("Password must be at least 10 characters.")
    if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        raise RelayError("An account with that email already exists.")
    user_id = conn.execute(
        "INSERT INTO users (workspace_id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'member', ?)",
        (actor["workspace_id"], email, _clean(name), hash_password(password), now()),
    ).lastrowid
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "user.added", "user", user_id, email=email)
    return user_id


def get_workspace(conn: sqlite3.Connection, ws_id: int) -> dict:
    row = conn.execute("SELECT * FROM workspaces WHERE id = ?", (ws_id,)).fetchone()
    if not row:
        raise RelayError("Workspace not found.")
    return dict(row)


def workspace_by(conn: sqlite3.Connection, column: str, value: str) -> dict | None:
    assert column in ("slug", "webhook_token", "stripe_customer_id")
    row = conn.execute(f"SELECT * FROM workspaces WHERE {column} = ?", (value,)).fetchone()
    return dict(row) if row else None


def update_settings(conn: sqlite3.Connection, actor, business_profile: str, reply_to: str) -> None:
    reply_to = _clean(reply_to)
    if reply_to and not EMAIL_RE.match(reply_to):
        raise RelayError("Reply-to must be a valid email.")
    conn.execute(
        "UPDATE workspaces SET business_profile = ?, reply_to = ? WHERE id = ?",
        (_clean(business_profile), reply_to, actor["workspace_id"]),
    )
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "workspace.settings_updated", "workspace",
              actor["workspace_id"])


def rotate_webhook_token(conn: sqlite3.Connection, actor) -> None:
    if actor["role"] != "owner":
        raise RelayError("Only the workspace owner can rotate the webhook token.")
    conn.execute("UPDATE workspaces SET webhook_token = ? WHERE id = ?",
                 (secrets.token_urlsafe(24), actor["workspace_id"]))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "workspace.webhook_rotated", "workspace",
              actor["workspace_id"])


# --- Leads ------------------------------------------------------------------------------------

def default_sequence_id(conn: sqlite3.Connection, ws_id: int) -> int | None:
    row = conn.execute(
        "SELECT id FROM sequences WHERE workspace_id = ? ORDER BY is_default DESC, id LIMIT 1", (ws_id,)
    ).fetchone()
    return row["id"] if row else None


def create_lead(conn: sqlite3.Connection, ws_id: int, data: dict, actor_type: str, actor_id,
                status: str = "new", enroll: bool = True) -> int:
    fields = {f: _clean(data.get(f)) for f in LEAD_FIELDS}
    fields["email"] = fields["email"].lower()
    if not (fields["email"] or fields["phone"]):
        raise RelayError("A lead needs at least an email or a phone number.")
    if fields["email"] and not EMAIL_RE.match(fields["email"]):
        raise RelayError("Lead email is not valid.")
    if status not in LEAD_STATUSES:
        raise RelayError(f"Unknown status {status!r}.")
    ts = now()
    seq_id = default_sequence_id(conn, ws_id) if enroll else None
    lead_id = conn.execute(
        f"INSERT INTO leads (workspace_id, {', '.join(LEAD_FIELDS)}, status, sequence_id, created_at, updated_at)"
        f" VALUES (?, {', '.join('?' * len(LEAD_FIELDS))}, ?, ?, ?, ?)",
        (ws_id, *fields.values(), status, seq_id, ts, ts),
    ).lastrowid
    audit.log(conn, ws_id, actor_type, actor_id, "lead.created", "lead", lead_id,
              source=fields["source"], enrolled_sequence=seq_id)
    return lead_id


def get_lead(conn: sqlite3.Connection, ws_id: int, lead_id: int) -> dict:
    row = conn.execute("SELECT * FROM leads WHERE id = ? AND workspace_id = ?", (lead_id, ws_id)).fetchone()
    if not row:
        raise RelayError("Lead not found.")
    lead = dict(row)
    lead["checklist"] = json.loads(lead["checklist_json"] or "[]")
    return lead


def list_leads(conn: sqlite3.Connection, ws_id: int, status: str | None = None):
    sql = "SELECT * FROM leads WHERE workspace_id = ?"
    args: list = [ws_id]
    if status:
        sql += " AND status = ?"
        args.append(status)
    rows = conn.execute(sql + " ORDER BY created_at DESC, id DESC", args).fetchall()
    pending = {
        r["lead_id"]: r["n"]
        for r in conn.execute(
            "SELECT lead_id, COUNT(*) n FROM messages WHERE workspace_id = ? AND status IN ('draft','approved')"
            " GROUP BY lead_id", (ws_id,))
    }
    out = []
    for r in rows:
        lead = dict(r)
        lead["next_action"] = next_action(lead, pending.get(lead["id"], 0))
        out.append(lead)
    return out


def next_action(lead: dict, pending_messages: int) -> str:
    if lead["status"] in ("booked", "lost"):
        return "None - closed"
    if pending_messages:
        return "Approve follow-up draft"
    if not lead["summary"]:
        return "Agent preparing summary" if lead["sequence_id"] else "Prepare summary & draft"
    if lead["status"] == "quoted":
        return "Confirm booking or mark lost"
    if lead["sequence_paused"] or not lead["sequence_id"]:
        return "Follow up manually"
    return "Waiting for reply / next follow-up"


def set_lead_status(conn: sqlite3.Connection, actor, lead_id: int, status: str) -> None:
    if status not in LEAD_STATUSES:
        raise RelayError(f"Unknown status {status!r}.")
    lead = get_lead(conn, actor["workspace_id"], lead_id)
    if lead["status"] == status:
        return
    ts = now()
    booked_at = ts if status == "booked" else (lead["booked_at"] if status != "lost" else None)
    conn.execute("UPDATE leads SET status = ?, booked_at = ?, updated_at = ? WHERE id = ?",
                 (status, booked_at, ts, lead_id))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "lead.status_changed", "lead", lead_id,
              old=lead["status"], new=status)
    if status in ("booked", "lost"):
        _cancel_pending(conn, actor["workspace_id"], lead_id, reason=f"lead marked {status}")


def set_sequence_paused(conn: sqlite3.Connection, actor, lead_id: int, paused: bool) -> None:
    get_lead(conn, actor["workspace_id"], lead_id)
    conn.execute("UPDATE leads SET sequence_paused = ?, updated_at = ? WHERE id = ?", (int(paused), now(), lead_id))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"],
              "lead.sequence_paused" if paused else "lead.sequence_resumed", "lead", lead_id)
    if paused:
        _cancel_pending(conn, actor["workspace_id"], lead_id, reason="sequence paused")


def _cancel_pending(conn: sqlite3.Connection, ws_id: int, lead_id: int, reason: str) -> None:
    rows = conn.execute(
        "SELECT id FROM messages WHERE workspace_id = ? AND lead_id = ? AND status IN ('draft','approved')",
        (ws_id, lead_id)).fetchall()
    for r in rows:
        conn.execute("UPDATE messages SET status = 'cancelled' WHERE id = ?", (r["id"],))
        audit.log(conn, ws_id, ACTOR_SYSTEM, "sequence", "message.cancelled", "message", r["id"], reason=reason)


# --- Agent: lead preparation & sequence drafting ----------------------------------------------

def prepare_lead(conn: sqlite3.Connection, settings: Settings, ws_id: int, lead_id: int,
                 requested_by: str = "auto") -> int | None:
    """Agent step: summarize, build the quote checklist, and queue the first draft for approval.

    Returns the created draft message id (None if the lead has no email to draft to).
    """
    workspace = get_workspace(conn, ws_id)
    lead = get_lead(conn, ws_id, lead_id)
    prep = ai.prepare_lead(settings, workspace, lead)
    conn.execute(
        "UPDATE leads SET summary = ?, checklist_json = ?, updated_at = ? WHERE id = ?",
        (prep.summary, json.dumps(prep.checklist), now(), lead_id),
    )
    audit.log(conn, ws_id, ACTOR_AGENT, "lead-prep", "lead.summarized", "lead", lead_id,
              provider=prep.provider, urgency=prep.urgency, checklist_items=len(prep.checklist),
              requested_by=requested_by)
    if not lead["email"]:
        audit.log(conn, ws_id, ACTOR_AGENT, "lead-prep", "draft.skipped", "lead", lead_id, reason="no email")
        return None
    if conn.execute("SELECT 1 FROM messages WHERE lead_id = ? AND status IN ('draft','approved')",
                    (lead_id,)).fetchone():
        return None
    step_index = 0 if lead["sequence_id"] and lead["sequence_step"] == 0 else None
    msg_id = _create_draft(conn, ws_id, lead, prep.email_subject, prep.email_body, prep.flags,
                           lead["sequence_id"] if step_index is not None else None, step_index)
    if step_index is not None:
        conn.execute("UPDATE leads SET sequence_step = 1 WHERE id = ?", (lead_id,))
    return msg_id


def _create_draft(conn, ws_id: int, lead: dict, subject: str, body: str, flags: list[str],
                  sequence_id: int | None, step_index: int | None) -> int:
    msg_id = conn.execute(
        "INSERT INTO messages (workspace_id, lead_id, sequence_id, step_index, to_addr, subject, body, status,"
        " flags, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, 'agent', ?)",
        (ws_id, lead["id"], sequence_id, step_index, lead["email"], subject, body, ",".join(flags), now()),
    ).lastrowid
    audit.log(conn, ws_id, ACTOR_AGENT, "follow-up", "message.drafted", "message", msg_id,
              lead_id=lead["id"], step=step_index, flags=flags)
    return msg_id


def render_template(text: str, workspace: dict, lead: dict) -> str:
    name = lead.get("name") or ""
    values = {
        "{first_name}": name.split()[0] if name else "there",
        "{name}": name or "there",
        "{service}": lead.get("service") or "service",
        "{business}": workspace["name"],
    }
    for key, value in values.items():
        text = text.replace(key, value)
    return text


def run_agent_tick(conn: sqlite3.Connection, settings: Settings, ws_id: int | None = None,
                   at: datetime | None = None) -> dict:
    """Prepare new leads and draft due sequence steps. Never sends anything."""
    at = at or datetime.now(timezone.utc)
    ws_filter, args = ("AND workspace_id = ?", [ws_id]) if ws_id else ("", [])
    stats = {"prepared": 0, "drafted": 0}

    unprepared = conn.execute(
        f"SELECT id, workspace_id FROM leads WHERE summary = '' AND sequence_id IS NOT NULL"
        f" AND status IN {OPEN_STATUSES} {ws_filter}", args).fetchall()
    for r in unprepared:
        prepare_lead(conn, settings, r["workspace_id"], r["id"], requested_by="tick")
        stats["prepared"] += 1

    candidates = conn.execute(
        f"SELECT * FROM leads WHERE sequence_id IS NOT NULL AND sequence_paused = 0 AND summary != ''"
        f" AND email != '' AND status IN {OPEN_STATUSES} {ws_filter}", args).fetchall()
    for row in candidates:
        lead = dict(row)
        if conn.execute("SELECT 1 FROM messages WHERE lead_id = ? AND status IN ('draft','approved')",
                        (lead["id"],)).fetchone():
            continue  # one outstanding draft at a time; nothing piles up unapproved
        seq = conn.execute("SELECT * FROM sequences WHERE id = ?", (lead["sequence_id"],)).fetchone()
        steps = json.loads(seq["steps_json"]) if seq else []
        idx = lead["sequence_step"]
        if idx == 0 or idx >= len(steps):
            continue
        last_sent = conn.execute(
            "SELECT MAX(sent_at) s FROM messages WHERE lead_id = ? AND status = 'sent'", (lead["id"],)
        ).fetchone()["s"]
        if not last_sent or parse_ts(last_sent) + timedelta(days=steps[idx]["delay_days"]) > at:
            continue
        workspace = get_workspace(conn, lead["workspace_id"])
        subject = render_template(steps[idx]["subject"], workspace, lead)
        body = render_template(steps[idx]["body"], workspace, lead)
        _create_draft(conn, lead["workspace_id"], lead, subject, body, ai.risk_flags(subject + body),
                      lead["sequence_id"], idx)
        conn.execute("UPDATE leads SET sequence_step = ? WHERE id = ?", (idx + 1, lead["id"]))
        stats["drafted"] += 1

    audit.log(conn, ws_id, ACTOR_AGENT, "scheduler", "agent.tick", **stats)
    return stats


# --- Approval queue ---------------------------------------------------------------------------

def get_message(conn: sqlite3.Connection, ws_id: int, msg_id: int) -> dict:
    row = conn.execute("SELECT * FROM messages WHERE id = ? AND workspace_id = ?", (msg_id, ws_id)).fetchone()
    if not row:
        raise RelayError("Message not found.")
    return dict(row)


def list_messages(conn: sqlite3.Connection, ws_id: int, statuses: tuple[str, ...] | None = None,
                  lead_id: int | None = None):
    sql = ("SELECT m.*, l.name AS lead_name, l.service AS lead_service FROM messages m"
           " JOIN leads l ON l.id = m.lead_id WHERE m.workspace_id = ?")
    args: list = [ws_id]
    if statuses:
        sql += f" AND m.status IN ({','.join('?' * len(statuses))})"
        args += list(statuses)
    if lead_id:
        sql += " AND m.lead_id = ?"
        args.append(lead_id)
    return [dict(r) for r in conn.execute(sql + " ORDER BY m.id DESC", args)]


def edit_draft(conn: sqlite3.Connection, actor, msg_id: int, subject: str, body: str) -> None:
    msg = get_message(conn, actor["workspace_id"], msg_id)
    if msg["status"] != "draft":
        raise RelayError("Only drafts can be edited.")
    subject, body = _clean(subject), _clean(body)
    if not subject or not body:
        raise RelayError("Subject and body are required.")
    flags = ai.risk_flags(subject + "\n" + body)
    conn.execute("UPDATE messages SET subject = ?, body = ?, flags = ? WHERE id = ?",
                 (subject, body, ",".join(flags), msg_id))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "message.edited", "message", msg_id,
              flags=flags)


def approve_message(conn: sqlite3.Connection, actor, msg_id: int, acknowledge_flags: bool = False) -> None:
    """Human approval gate. `actor` must be a logged-in user row - agents cannot approve."""
    if actor is None or "password_hash" not in actor.keys():
        raise RelayError("Only a signed-in user can approve messages.")
    msg = get_message(conn, actor["workspace_id"], msg_id)
    if msg["status"] != "draft":
        raise RelayError(f"Message is {msg['status']}, not a draft.")
    if msg["flags"] and not acknowledge_flags:
        raise RelayError(f"This draft is flagged ({msg['flags']}). Review it and confirm before approving.")
    conn.execute("UPDATE messages SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?",
                 (actor["id"], now(), msg_id))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "message.approved", "message", msg_id,
              flags_acknowledged=msg["flags"] or None)


def reject_message(conn: sqlite3.Connection, actor, msg_id: int, pause_sequence: bool = False) -> None:
    msg = get_message(conn, actor["workspace_id"], msg_id)
    if msg["status"] not in ("draft", "approved"):
        raise RelayError(f"Message is already {msg['status']}.")
    conn.execute("UPDATE messages SET status = 'rejected' WHERE id = ?", (msg_id,))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "message.rejected", "message", msg_id)
    if pause_sequence:
        set_sequence_paused(conn, actor, msg["lead_id"], True)


def send_message(conn: sqlite3.Connection, settings: Settings, actor, msg_id: int) -> None:
    """Deliver an approved message. Refuses anything a human has not approved."""
    msg = get_message(conn, actor["workspace_id"], msg_id)
    if msg["status"] != "approved" or not msg["approved_by"]:
        audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "message.send_blocked", "message", msg_id,
                  status=msg["status"])
        raise RelayError("Message must be approved by a user before it can be sent.")
    workspace = get_workspace(conn, actor["workspace_id"])
    try:
        note = mailer.deliver(settings, msg["to_addr"], msg["subject"], msg["body"], workspace["reply_to"])
    except mailer.DeliveryError as exc:
        conn.execute("UPDATE messages SET status = 'failed', error = ? WHERE id = ?", (str(exc), msg_id))
        audit.log(conn, actor["workspace_id"], ACTOR_SYSTEM, "mailer", "message.failed", "message", msg_id,
                  error=str(exc))
        raise RelayError(f"Delivery failed: {exc}") from exc
    ts = now()
    conn.execute("UPDATE messages SET status = 'sent', sent_at = ?, error = '' WHERE id = ?", (ts, msg_id))
    conn.execute(
        "UPDATE leads SET first_response_at = COALESCE(first_response_at, ?),"
        " status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END, updated_at = ? WHERE id = ?",
        (ts, ts, msg["lead_id"]))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "message.sent", "message", msg_id,
              delivery=note, lead_id=msg["lead_id"])


# --- Sequences --------------------------------------------------------------------------------

def get_sequence(conn: sqlite3.Connection, ws_id: int, seq_id: int | None = None) -> dict:
    seq_id = seq_id or default_sequence_id(conn, ws_id)
    row = conn.execute("SELECT * FROM sequences WHERE id = ? AND workspace_id = ?", (seq_id, ws_id)).fetchone()
    if not row:
        raise RelayError("Sequence not found.")
    seq = dict(row)
    seq["steps"] = json.loads(seq["steps_json"])
    return seq


def validate_steps(steps) -> list[dict]:
    if not isinstance(steps, list) or not steps:
        raise RelayError("A sequence needs at least one step.")
    if len(steps) > 10:
        raise RelayError("A sequence can have at most 10 steps.")
    clean = []
    for i, step in enumerate(steps):
        try:
            delay = int(step.get("delay_days", 0))
        except (TypeError, ValueError, AttributeError):
            raise RelayError(f"Step {i + 1}: delay_days must be a whole number.")
        if not 0 <= delay <= 90:
            raise RelayError(f"Step {i + 1}: delay_days must be between 0 and 90.")
        use_ai = bool(step.get("ai")) and i == 0
        subject, body = _clean(step.get("subject")), _clean(step.get("body"))
        if not use_ai and not (subject and body):
            raise RelayError(f"Step {i + 1}: subject and body are required.")
        clean.append({"delay_days": delay, "ai": use_ai, "subject": subject, "body": body})
    return clean


def save_sequence(conn: sqlite3.Connection, actor, seq_id: int, steps) -> None:
    get_sequence(conn, actor["workspace_id"], seq_id)
    clean = validate_steps(steps)
    conn.execute("UPDATE sequences SET steps_json = ? WHERE id = ?", (json.dumps(clean), seq_id))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "sequence.updated", "sequence", seq_id,
              steps=len(clean))


def export_workflow(conn: sqlite3.Connection, ws_id: int) -> dict:
    """Portable workflow bundle so an operator can clone a proven setup into another workspace."""
    ws = get_workspace(conn, ws_id)
    seq = get_sequence(conn, ws_id)
    return {"relayflow_workflow": 1, "business_profile": ws["business_profile"],
            "sequence": {"name": seq["name"], "steps": seq["steps"]}}


def import_workflow(conn: sqlite3.Connection, actor, bundle: dict, include_profile: bool = False) -> None:
    if not isinstance(bundle, dict) or bundle.get("relayflow_workflow") != 1:
        raise RelayError("Not a RelayFlow workflow file.")
    steps = validate_steps((bundle.get("sequence") or {}).get("steps"))
    seq_id = default_sequence_id(conn, actor["workspace_id"])
    conn.execute("UPDATE sequences SET steps_json = ? WHERE id = ?", (json.dumps(steps), seq_id))
    if include_profile:
        conn.execute("UPDATE workspaces SET business_profile = ? WHERE id = ?",
                     (_clean(bundle.get("business_profile")), actor["workspace_id"]))
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "workflow.imported", "sequence", seq_id,
              steps=len(steps), profile=include_profile)


# --- Metrics ----------------------------------------------------------------------------------

def dashboard(conn: sqlite3.Connection, ws_id: int, at: datetime | None = None) -> dict:
    at = at or datetime.now(timezone.utc)
    leads = [dict(r) for r in conn.execute("SELECT * FROM leads WHERE workspace_id = ?", (ws_id,))]
    by_status = {s: 0 for s in LEAD_STATUSES}
    response_minutes = []
    for lead in leads:
        by_status[lead["status"]] += 1
        if lead["first_response_at"]:
            delta = parse_ts(lead["first_response_at"]) - parse_ts(lead["created_at"])
            response_minutes.append(delta.total_seconds() / 60)
    week_ago = at - timedelta(days=7)
    msg_counts = {r["status"]: r["n"] for r in conn.execute(
        "SELECT status, COUNT(*) n FROM messages WHERE workspace_id = ? GROUP BY status", (ws_id,))}
    total = len(leads)
    closed = by_status["booked"] + by_status["lost"]
    return {
        "total_leads": total,
        "leads_7d": sum(1 for lead in leads if parse_ts(lead["created_at"]) >= week_ago),
        "by_status": by_status,
        "booked_jobs": by_status["booked"],
        "booked_7d": sum(1 for lead in leads if lead["booked_at"] and parse_ts(lead["booked_at"]) >= week_ago),
        "win_rate": (by_status["booked"] / closed) if closed else None,
        "median_response_minutes": statistics.median(response_minutes) if response_minutes else None,
        "awaiting_first_response": sum(1 for lead in leads
                                       if not lead["first_response_at"] and lead["status"] in OPEN_STATUSES),
        "drafts_pending": msg_counts.get("draft", 0) + msg_counts.get("approved", 0),
        "messages_sent": msg_counts.get("sent", 0),
        "messages_failed": msg_counts.get("failed", 0),
    }


# --- CSV import / export ----------------------------------------------------------------------

MAX_IMPORT_ROWS = 5000


def import_leads_csv(conn: sqlite3.Connection, actor, raw: bytes) -> dict:
    """Human-initiated import. Imported leads are NOT auto-enrolled in outreach sequences."""
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise RelayError("CSV must be UTF-8 encoded.")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise RelayError("CSV is empty.")
    headers = {h.strip().lower(): h for h in reader.fieldnames if h}
    if not ({"email", "phone"} & headers.keys()):
        raise RelayError("CSV needs an 'email' or 'phone' column.")
    created, errors = 0, []
    conn.execute("BEGIN")
    try:
        for n, row in enumerate(reader, start=2):
            if n - 1 > MAX_IMPORT_ROWS:
                raise RelayError(f"CSV has more than {MAX_IMPORT_ROWS} rows; split it up.")
            data = {f: row.get(headers[f], "") for f in LEAD_FIELDS if f in headers}
            data.setdefault("source", "csv import")
            status = _clean(row.get(headers["status"], "")).lower() if "status" in headers else ""
            try:
                create_lead(conn, actor["workspace_id"], data, ACTOR_USER, actor["id"],
                            status=status or "new", enroll=False)
                created += 1
            except RelayError as exc:
                errors.append(f"row {n}: {exc}")
        audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "leads.imported", "workspace",
                  actor["workspace_id"], created=created, errors=len(errors))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return {"created": created, "errors": errors}


def _csv_safe(value) -> str:
    """Neutralize spreadsheet formula injection in exported cells."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def export_leads_csv(conn: sqlite3.Connection, actor) -> str:
    cols = ["id", *LEAD_FIELDS, "status", "summary", "first_response_at", "booked_at", "created_at"]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(cols)
    for lead in conn.execute("SELECT * FROM leads WHERE workspace_id = ? ORDER BY id", (actor["workspace_id"],)):
        writer.writerow([_csv_safe(lead[c]) for c in cols])
    audit.log(conn, actor["workspace_id"], ACTOR_USER, actor["id"], "leads.exported", "workspace",
              actor["workspace_id"])
    return buf.getvalue()


def export_audit_csv(conn: sqlite3.Connection, actor) -> str:
    cols = ["id", "created_at", "actor_type", "actor_id", "action", "entity_type", "entity_id", "details_json"]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(cols)
    for row in conn.execute("SELECT * FROM audit_log WHERE workspace_id = ? ORDER BY id", (actor["workspace_id"],)):
        writer.writerow([_csv_safe(row[c]) for c in cols])
    return buf.getvalue()


def intake_lead(conn: sqlite3.Connection, ws: dict, data: dict, source: str) -> int:
    """Public intake (web form or webhook). The agent prepares the lead afterwards."""
    data = {f: data.get(f) for f in LEAD_FIELDS}
    data["source"] = _clean(data.get("source")) or source
    return create_lead(conn, ws["id"], data, ACTOR_WEBHOOK, source)
