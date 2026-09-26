import json
from datetime import datetime, timedelta, timezone

import pytest

from relayflow import ai, audit, service
from relayflow.service import RelayError

LEAD = {"name": "Dana Diaz", "email": "dana@example.com", "service": "AC not cooling",
        "message": "Our HVAC unit stopped blowing cold air yesterday.", "source": "website"}


def actions(conn, ws_id):
    return [e["action"] for e in reversed(audit.entries(conn, ws_id, 1000))]


def test_workspace_creation_seeds_default_sequence_and_audit(conn, workspace):
    ws, user = workspace
    assert user["role"] == "owner"
    seq = service.get_sequence(conn, ws["id"])
    assert seq["steps"][0]["ai"] is True and len(seq["steps"]) == 3
    assert actions(conn, ws["id"])[:2] == ["workspace.created", "sequence.created"]


def test_workspace_validation(conn, workspace):
    with pytest.raises(RelayError):
        service.create_workspace(conn, "Other", "owner@coolair.test", "", "correct horse battery")
    with pytest.raises(RelayError):
        service.create_workspace(conn, "Other", "x@y.test", "", "short")


def test_lead_to_approved_send_flow(conn, settings, workspace):
    ws, user = workspace
    lead_id = service.create_lead(conn, ws["id"], LEAD, "webhook", "test")
    msg_id = service.prepare_lead(conn, settings, ws["id"], lead_id)

    lead = service.get_lead(conn, ws["id"], lead_id)
    assert "Dana Diaz" in lead["summary"]
    assert any("HVAC" in item or "System type" in item for item in lead["checklist"])
    msg = service.get_message(conn, ws["id"], msg_id)
    assert msg["status"] == "draft" and msg["created_by"] == "agent"
    assert msg["to_addr"] == "dana@example.com"

    # The approval gate: a draft cannot be sent.
    with pytest.raises(RelayError, match="approved"):
        service.send_message(conn, settings, user, msg_id)
    assert service.get_message(conn, ws["id"], msg_id)["status"] == "draft"

    service.approve_message(conn, user, msg_id)
    service.send_message(conn, settings, user, msg_id)

    msg = service.get_message(conn, ws["id"], msg_id)
    assert msg["status"] == "sent" and msg["approved_by"] == user["id"]
    lead = service.get_lead(conn, ws["id"], lead_id)
    assert lead["status"] == "contacted" and lead["first_response_at"]
    log = actions(conn, ws["id"])
    for expected in ["lead.created", "lead.summarized", "message.drafted", "message.send_blocked",
                     "message.approved", "message.sent"]:
        assert expected in log


def test_agent_cannot_approve(conn, settings, workspace):
    ws, _ = workspace
    lead_id = service.create_lead(conn, ws["id"], LEAD, "webhook", "test")
    msg_id = service.prepare_lead(conn, settings, ws["id"], lead_id)
    with pytest.raises(RelayError):
        service.approve_message(conn, None, msg_id)
    with pytest.raises(RelayError):
        service.approve_message(conn, {"id": 0, "workspace_id": ws["id"]}, msg_id)


def test_flagged_draft_requires_acknowledgement(conn, settings, workspace):
    ws, user = workspace
    lead_id = service.create_lead(conn, ws["id"], LEAD, "webhook", "test")
    msg_id = service.prepare_lead(conn, settings, ws["id"], lead_id)
    service.edit_draft(conn, user, msg_id, "Quote", "We can fix it for $199 tomorrow.")
    msg = service.get_message(conn, ws["id"], msg_id)
    assert set(msg["flags"].split(",")) == {"price", "schedule"}
    with pytest.raises(RelayError, match="flagged"):
        service.approve_message(conn, user, msg_id)
    service.approve_message(conn, user, msg_id, acknowledge_flags=True)


def test_template_drafts_are_not_flagged():
    prep = ai.prepare_lead(type("S", (), {"ai_provider": "template"})(), {"name": "Acme Plumbing"},
                           {"name": "Sam", "service": "leaking pipe", "message": "Burst pipe in basement"})
    assert prep.flags == []
    assert prep.urgency == "emergency"
    assert "$" not in prep.email_body


def test_workspace_isolation(conn, settings, workspace):
    ws, _ = workspace
    other_ws, other_uid = service.create_workspace(conn, "Other Co", "o@other.test", "", "correct horse battery")
    other = conn.execute("SELECT * FROM users WHERE id = ?", (other_uid,)).fetchone()
    lead_id = service.create_lead(conn, ws["id"], LEAD, "webhook", "test")
    msg_id = service.prepare_lead(conn, settings, ws["id"], lead_id)
    with pytest.raises(RelayError):
        service.get_lead(conn, other_ws["id"], lead_id)
    with pytest.raises(RelayError):
        service.approve_message(conn, other, msg_id)
    with pytest.raises(RelayError):
        service.set_lead_status(conn, other, lead_id, "booked")


def test_sequence_drafts_next_step_only_after_send_and_delay(conn, settings, workspace):
    ws, user = workspace
    lead_id = service.create_lead(conn, ws["id"], LEAD, "webhook", "test")
    stats = service.run_agent_tick(conn, settings, ws["id"])
    assert stats == {"prepared": 1, "drafted": 0}
    first = service.list_messages(conn, ws["id"], ("draft",))[0]

    # Unapproved draft outstanding: nothing else gets drafted.
    assert service.run_agent_tick(conn, settings, ws["id"])["drafted"] == 0

    service.approve_message(conn, user, first["id"])
    service.send_message(conn, settings, user, first["id"])
    assert service.run_agent_tick(conn, settings, ws["id"])["drafted"] == 0  # delay not elapsed

    later = datetime.now(timezone.utc) + timedelta(days=2, minutes=1)
    assert service.run_agent_tick(conn, settings, ws["id"], at=later)["drafted"] == 1
    step2 = service.list_messages(conn, ws["id"], ("draft",))[0]
    assert step2["step_index"] == 1
    assert step2["subject"] == "Following up on your AC not cooling request"
    assert "Hi Dana," in step2["body"] and "{" not in step2["body"]

    # Booking the job cancels pending drafts and stops the sequence.
    service.set_lead_status(conn, user, lead_id, "booked")
    assert service.get_message(conn, ws["id"], step2["id"])["status"] == "cancelled"
    much_later = later + timedelta(days=30)
    assert service.run_agent_tick(conn, settings, ws["id"], at=much_later)["drafted"] == 0
    assert service.dashboard(conn, ws["id"])["booked_jobs"] == 1


def test_pause_sequence(conn, settings, workspace):
    ws, user = workspace
    lead_id = service.create_lead(conn, ws["id"], LEAD, "webhook", "test")
    msg_id = service.prepare_lead(conn, settings, ws["id"], lead_id)
    service.reject_message(conn, user, msg_id, pause_sequence=True)
    assert service.get_lead(conn, ws["id"], lead_id)["sequence_paused"] == 1
    assert service.run_agent_tick(conn, settings, ws["id"], at=datetime.now(timezone.utc) + timedelta(days=9)) \
        == {"prepared": 0, "drafted": 0}


def test_lead_without_email_gets_summary_but_no_draft(conn, settings, workspace):
    ws, _ = workspace
    lead_id = service.create_lead(conn, ws["id"], {"name": "Phone Only", "phone": "555-0100"}, "user", 1)
    assert service.prepare_lead(conn, settings, ws["id"], lead_id) is None
    assert service.get_lead(conn, ws["id"], lead_id)["summary"]
    assert "draft.skipped" in actions(conn, ws["id"])


def test_lead_requires_contact(conn, workspace):
    ws, _ = workspace
    with pytest.raises(RelayError):
        service.create_lead(conn, ws["id"], {"name": "Nobody"}, "user", 1)
    with pytest.raises(RelayError):
        service.create_lead(conn, ws["id"], {"email": "not-an-email"}, "user", 1)


def test_sequence_validation_and_save(conn, workspace):
    ws, user = workspace
    seq = service.get_sequence(conn, ws["id"])
    with pytest.raises(RelayError):
        service.save_sequence(conn, user, seq["id"], [{"delay_days": 1, "subject": "", "body": ""}])
    with pytest.raises(RelayError):
        service.save_sequence(conn, user, seq["id"], [{"delay_days": 500, "subject": "a", "body": "b"}])
    service.save_sequence(conn, user, seq["id"], [{"delay_days": 0, "ai": True},
                                                  {"delay_days": 1, "ai": True, "subject": "s", "body": "b"}])
    steps = service.get_sequence(conn, ws["id"])["steps"]
    assert steps[1]["ai"] is False  # only the first step may be AI-drafted


def test_workflow_clone(conn, workspace):
    ws, user = workspace
    seq = service.get_sequence(conn, ws["id"])
    service.save_sequence(conn, user, seq["id"], [{"delay_days": 0, "ai": True},
                                                  {"delay_days": 4, "subject": "Hi {first_name}", "body": "x"}])
    bundle = json.loads(json.dumps(service.export_workflow(conn, ws["id"])))
    other_ws, uid = service.create_workspace(conn, "Clone Co", "c@clone.test", "", "correct horse battery")
    other = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    service.import_workflow(conn, other, bundle)
    assert service.get_sequence(conn, other_ws["id"])["steps"][1]["delay_days"] == 4
    with pytest.raises(RelayError):
        service.import_workflow(conn, other, {"hello": 1})


def test_csv_import_export(conn, workspace):
    ws, user = workspace
    raw = ("Name,Email,Phone,Service,Status\n"
           "Ann,ann@example.com,,Roof leak,quoted\n"
           "Bad,,,,\n"
           "=HYPERLINK(\"x\"),eve@example.com,,,\n").encode()
    result = service.import_leads_csv(conn, user, raw)
    assert result["created"] == 2 and len(result["errors"]) == 1
    leads = service.list_leads(conn, ws["id"])
    assert all(lead["sequence_id"] is None for lead in leads)  # imports never auto-enroll in outreach
    assert {lead["status"] for lead in leads} == {"quoted", "new"}
    out = service.export_leads_csv(conn, user)
    assert "ann@example.com" in out
    assert "'=HYPERLINK" in out  # formula injection neutralized
    assert "leads.imported" in actions(conn, ws["id"])


def test_csv_import_requires_contact_column(conn, workspace):
    _, user = workspace
    with pytest.raises(RelayError):
        service.import_leads_csv(conn, user, b"name,service\nA,B\n")


def test_dashboard_metrics(conn, settings, workspace):
    ws, user = workspace
    a = service.create_lead(conn, ws["id"], LEAD, "webhook", "t")
    b = service.create_lead(conn, ws["id"], {**LEAD, "email": "b@example.com"}, "webhook", "t")
    msg = service.prepare_lead(conn, settings, ws["id"], a)
    service.prepare_lead(conn, settings, ws["id"], b)
    service.approve_message(conn, user, msg)
    service.send_message(conn, settings, user, msg)
    service.set_lead_status(conn, user, b, "lost")
    stats = service.dashboard(conn, ws["id"])
    assert stats["total_leads"] == 2 and stats["leads_7d"] == 2
    assert stats["by_status"]["contacted"] == 1 and stats["by_status"]["lost"] == 1
    assert stats["median_response_minutes"] is not None
    assert stats["drafts_pending"] == 0 and stats["messages_sent"] == 1
    assert stats["win_rate"] == 0.0
    assert service.list_leads(conn, ws["id"])[0]["next_action"]


def test_member_cannot_add_users(conn, workspace):
    ws, owner = workspace
    uid = service.add_user(conn, owner, "m@coolair.test", "Mo", "correct horse battery")
    member = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    with pytest.raises(RelayError):
        service.add_user(conn, member, "z@coolair.test", "", "correct horse battery")
