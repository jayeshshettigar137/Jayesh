"""Outbound email delivery. Only called for messages a human has approved."""

import smtplib
from email.message import EmailMessage

from .config import Settings


class DeliveryError(Exception):
    pass


def deliver(settings: Settings, to_addr: str, subject: str, body: str, reply_to: str = "") -> str:
    """Deliver one email. Returns a short delivery note for the audit log."""
    if settings.mail_mode == "outbox":
        return "recorded in outbox (RELAYFLOW_MAIL_MODE=outbox; not delivered)"
    if settings.mail_mode != "smtp":
        raise DeliveryError(f"unknown mail mode {settings.mail_mode!r}")
    if not settings.smtp_host:
        raise DeliveryError("SMTP_HOST is not configured")

    msg = EmailMessage()
    msg["From"] = settings.mail_from
    msg["To"] = to_addr
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError) as exc:
        raise DeliveryError(str(exc)) from exc
    return f"delivered via SMTP {settings.smtp_host}"
