"""Stripe subscription billing: Checkout for signup, Customer Portal for changes, webhooks for state.

Subscription changes are always initiated by a signed-in human (PRD §6); the app never
creates, upgrades, or cancels subscriptions on its own.
"""

import sqlite3

import stripe

from . import audit
from .audit import ACTOR_SYSTEM, ACTOR_USER
from .config import Settings
from .service import RelayError, get_workspace

HANDLED_EVENTS = {
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
}


def _client(settings: Settings) -> stripe.StripeClient:
    if not settings.billing_enabled:
        raise RelayError("Billing is not configured (set STRIPE_SECRET_KEY and STRIPE_PRICE_ID).")
    return stripe.StripeClient(settings.stripe_secret_key)


def create_checkout(conn: sqlite3.Connection, settings: Settings, actor) -> str:
    if actor["role"] != "owner":
        raise RelayError("Only the workspace owner can manage billing.")
    ws = get_workspace(conn, actor["workspace_id"])
    if ws["subscription_status"] in ("active", "trialing", "past_due"):
        raise RelayError("This workspace already has a subscription. Use Manage billing instead.")
    client = _client(settings)
    params = {
        "mode": "subscription",
        "line_items": [{"price": settings.stripe_price_id, "quantity": 1}],
        "client_reference_id": str(ws["id"]),
        "metadata": {"workspace_id": str(ws["id"])},
        "subscription_data": {"metadata": {"workspace_id": str(ws["id"])}},
        "success_url": f"{settings.base_url}/billing?checkout=success",
        "cancel_url": f"{settings.base_url}/billing?checkout=cancelled",
    }
    if ws["stripe_customer_id"]:
        params["customer"] = ws["stripe_customer_id"]
    else:
        params["customer_email"] = actor["email"]
    session = client.v1.checkout.sessions.create(params=params)
    audit.log(conn, ws["id"], ACTOR_USER, actor["id"], "billing.checkout_started", "workspace", ws["id"],
              session_id=session.id)
    return session.url


def create_portal(conn: sqlite3.Connection, settings: Settings, actor) -> str:
    if actor["role"] != "owner":
        raise RelayError("Only the workspace owner can manage billing.")
    ws = get_workspace(conn, actor["workspace_id"])
    if not ws["stripe_customer_id"]:
        raise RelayError("No Stripe customer yet - subscribe first.")
    session = _client(settings).v1.billing_portal.sessions.create(
        params={"customer": ws["stripe_customer_id"], "return_url": f"{settings.base_url}/billing"})
    audit.log(conn, ws["id"], ACTOR_USER, actor["id"], "billing.portal_opened", "workspace", ws["id"])
    return session.url


def handle_webhook(conn: sqlite3.Connection, settings: Settings, payload: bytes, signature: str) -> str:
    """Verify and apply a Stripe webhook. Returns the event type. Raises ValueError on bad signature."""
    if not settings.stripe_webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except stripe.SignatureVerificationError as exc:
        raise ValueError("invalid signature") from exc

    event = event.to_dict()
    etype = event["type"]
    if etype not in HANDLED_EVENTS:
        return etype
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        ws_id = _int(obj.get("client_reference_id")) or _int((obj.get("metadata") or {}).get("workspace_id"))
        if not ws_id or not conn.execute("SELECT 1 FROM workspaces WHERE id = ?", (ws_id,)).fetchone():
            return etype
        conn.execute(
            "UPDATE workspaces SET stripe_customer_id = ?, stripe_subscription_id = ?,"
            " subscription_status = CASE WHEN subscription_status = 'none' THEN 'active' ELSE subscription_status END"
            " WHERE id = ?",
            (obj.get("customer"), obj.get("subscription"), ws_id))
        audit.log(conn, ws_id, ACTOR_SYSTEM, "stripe", "billing.checkout_completed", "workspace", ws_id,
                  event_id=event["id"])
    elif etype.startswith("customer.subscription."):
        ws_id = _workspace_for(conn, obj)
        if ws_id is None:
            return etype
        status = "canceled" if etype.endswith(".deleted") else obj.get("status", "unknown")
        conn.execute(
            "UPDATE workspaces SET subscription_status = ?, stripe_subscription_id = ?,"
            " stripe_customer_id = COALESCE(stripe_customer_id, ?) WHERE id = ?",
            (status, obj.get("id"), obj.get("customer"), ws_id))
        audit.log(conn, ws_id, ACTOR_SYSTEM, "stripe", "billing.subscription_" + etype.rsplit(".", 1)[1],
                  "workspace", ws_id, status=status, event_id=event["id"])
    elif etype == "invoice.payment_failed":
        ws_id = _workspace_for(conn, obj)
        if ws_id is not None:
            audit.log(conn, ws_id, ACTOR_SYSTEM, "stripe", "billing.payment_failed", "workspace", ws_id,
                      event_id=event["id"])
    return etype


def _int(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _workspace_for(conn: sqlite3.Connection, obj) -> int | None:
    ws_id = _int((obj.get("metadata") or {}).get("workspace_id"))
    if ws_id and conn.execute("SELECT 1 FROM workspaces WHERE id = ?", (ws_id,)).fetchone():
        return ws_id
    customer = obj.get("customer")
    row = conn.execute("SELECT id FROM workspaces WHERE stripe_customer_id = ?", (customer,)).fetchone() \
        if customer else None
    return row["id"] if row else None
