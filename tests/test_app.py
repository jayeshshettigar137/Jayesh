import hashlib
import hmac
import json
import re
import time

import pytest
from fastapi.testclient import TestClient

from relayflow import db, service
from relayflow.app import create_app


@pytest.fixture
def client(settings):
    return TestClient(create_app(settings))


def signup(client, email="owner@acme.test"):
    r = client.post("/signup", data={"business": "Acme Plumbing", "name": "Ann", "email": email,
                                     "password": "correct horse battery"}, follow_redirects=False)
    assert r.status_code == 303
    return r


def csrf(client, path="/settings"):
    return re.search(r'name="csrf" value="([0-9a-f]+)"', client.get(path).text).group(1)


def workspace_row(settings):
    conn = db.connect(settings.database_path)
    try:
        return dict(conn.execute("SELECT * FROM workspaces").fetchone())
    finally:
        conn.close()


def test_requires_login(client):
    r = client.get("/leads", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/login"


def test_end_to_end_launch_gate(client, settings):
    """Workspace created -> lead received -> agent prepares draft -> approval required -> sent -> logged."""
    signup(client)
    ws = workspace_row(settings)

    public = TestClient(client.app)
    r = public.post(f"/hooks/leads/{ws['webhook_token']}",
                    json={"name": "Pat Lee", "email": "pat@example.com", "service": "Water heater leaking"})
    assert r.status_code == 201
    lead_id = r.json()["lead_id"]

    page = client.get(f"/leads/{lead_id}").text
    assert "Pat Lee" in page and "Quote-request checklist" in page

    approvals = client.get("/approvals").text
    msg_id = int(re.search(r"/messages/(\d+)/approve", approvals).group(1))
    token = csrf(client, "/approvals")

    # Sending without approval is refused.
    r = client.post(f"/messages/{msg_id}/send", data={"csrf": token}, follow_redirects=False)
    assert "approved" in r.headers["location"]

    r = client.post(f"/messages/{msg_id}/approve", data={"csrf": token}, follow_redirects=False)
    assert "Approved+and+sent" in r.headers["location"]

    audit_page = client.get("/audit").text
    for action in ["workspace.created", "lead.created", "lead.summarized", "message.drafted",
                   "message.send_blocked", "message.approved", "message.sent"]:
        assert action in audit_page


def test_csrf_required(client):
    signup(client)
    r = client.post("/settings", data={"business_profile": "x", "csrf": "nope"})
    assert r.status_code == 403


def test_public_intake_form(client, settings):
    signup(client)
    ws = workspace_row(settings)
    anon = TestClient(client.app)
    assert "Request a quote from Acme Plumbing" in anon.get(f"/f/{ws['slug']}").text
    r = anon.post(f"/f/{ws['slug']}", data={"name": "Kim", "email": "kim@example.com", "service": "Clogged drain"})
    assert "we got your request" in r.text
    r = anon.post(f"/f/{ws['slug']}", data={"name": "Bot", "email": "bot@example.com", "website": "spam"})
    assert "we got your request" in r.text  # honeypot looks successful but stores nothing
    conn = db.connect(settings.database_path)
    assert conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0] == 1


def test_webhook_rejects_bad_token_and_payload(client, settings):
    signup(client)
    ws = workspace_row(settings)
    assert client.post("/hooks/leads/wrong", json={"email": "a@b.co"}).status_code == 404
    assert client.post(f"/hooks/leads/{ws['webhook_token']}", json={"name": "x"}).status_code == 422
    assert client.post(f"/hooks/leads/{ws['webhook_token']}", content=b"[1]",
                       headers={"content-type": "application/json"}).status_code == 400


def test_csv_roundtrip(client):
    signup(client)
    token = csrf(client, "/data")
    csv_bytes = b"name,email,service\nJo,jo@example.com,Roof inspection\n"
    r = client.post("/data/import", data={"csrf": token}, files={"file": ("l.csv", csv_bytes, "text/csv")},
                    follow_redirects=False)
    assert "Confirm" in r.headers["location"]
    r = client.post("/data/import", data={"csrf": token, "confirm": "1"},
                    files={"file": ("l.csv", csv_bytes, "text/csv")})
    assert "1 leads imported" in r.text
    assert "jo@example.com" in client.get("/data/leads.csv").text


def _stripe_sig(payload: bytes, secret: str) -> str:
    ts = int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"


def test_stripe_webhook_updates_subscription(client, settings):
    signup(client)
    ws = workspace_row(settings)
    event = {"id": "evt_1", "object": "event", "type": "checkout.session.completed",
             "data": {"object": {"object": "checkout.session", "client_reference_id": str(ws["id"]),
                                 "customer": "cus_123", "subscription": "sub_123", "metadata": {}}}}
    payload = json.dumps(event).encode()
    assert client.post("/stripe/webhook", content=payload,
                       headers={"stripe-signature": "t=1,v1=bad"}).status_code == 400
    r = client.post("/stripe/webhook", content=payload,
                    headers={"stripe-signature": _stripe_sig(payload, settings.stripe_webhook_secret)})
    assert r.status_code == 200
    ws = workspace_row(settings)
    assert ws["subscription_status"] == "active" and ws["stripe_customer_id"] == "cus_123"

    cancel = {"id": "evt_2", "object": "event", "type": "customer.subscription.deleted",
              "data": {"object": {"object": "subscription", "id": "sub_123", "customer": "cus_123",
                                  "status": "canceled", "metadata": {}}}}
    payload = json.dumps(cancel).encode()
    client.post("/stripe/webhook", content=payload,
                headers={"stripe-signature": _stripe_sig(payload, settings.stripe_webhook_secret)})
    assert workspace_row(settings)["subscription_status"] == "canceled"


def test_billing_not_configured_message(client):
    signup(client)
    token = csrf(client, "/billing")
    r = client.post("/billing/checkout", data={"csrf": token}, follow_redirects=False)
    assert "not+configured" in r.headers["location"]


def test_sequence_editor_and_workflow_export(client):
    signup(client)
    token = csrf(client, "/sequence")
    r = client.post("/sequence", data={"csrf": token, "delay_0": "0", "ai_0": "1",
                                       "delay_1": "3", "subject_1": "Checking in", "body_1": "Hi {first_name}"},
                    follow_redirects=False)
    assert "saved" in r.headers["location"]
    bundle = client.get("/workflow/export").json()
    assert [s["delay_days"] for s in bundle["sequence"]["steps"]] == [0, 3]


def test_login_logout(client):
    signup(client)
    token = csrf(client)
    client.post("/logout", data={"csrf": token})
    assert client.get("/", follow_redirects=False).status_code == 303
    assert client.post("/login", data={"email": "owner@acme.test", "password": "wrong"}).status_code == 400
    r = client.post("/login", data={"email": "owner@acme.test", "password": "correct horse battery"},
                    follow_redirects=False)
    assert r.status_code == 303
    assert "Dashboard" in client.get("/").text
