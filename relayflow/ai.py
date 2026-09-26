"""Lead preparation agent: summary, quote-request checklist, and a first follow-up draft.

The agent only *prepares*. It never sends, never quotes prices, and never commits to dates;
every draft it produces lands in the approval queue.
"""

import json
import logging
import re
from dataclasses import dataclass, field

from .config import Settings

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the lead-intake assistant for a home-service business (HVAC, plumbing, \
roofing, electrical, cleaning, remodeling). For each inbound lead you prepare three things for a \
human office manager to review:

1. summary: 1-3 sentences a busy owner can scan - who, what job, urgency, anything unusual.
2. checklist: the specific facts still needed before this job can be quoted (e.g. photos, \
equipment age/model, square footage, access, preferred visit window). Only list items the lead \
has not already answered. 3-7 items.
3. A short, warm first-response email from the business to the lead that confirms the request \
was received and asks for the most important missing checklist items.

Hard rules for the email - a human will approve it, but it must be safe to send as written:
- Never state or estimate a price, discount, or fee.
- Never promise an arrival time, date, or availability; invite them to share preferred windows.
- Never claim licensing, warranties, reviews, or credentials unless they appear in the business \
profile.
- Plain text, no markdown, under 150 words, signed with the business name.
"""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "urgency": {"type": "string", "enum": ["emergency", "soon", "flexible", "unknown"]},
        "checklist": {"type": "array", "items": {"type": "string"}},
        "email_subject": {"type": "string"},
        "email_body": {"type": "string"},
    },
    "required": ["summary", "urgency", "checklist", "email_subject", "email_body"],
    "additionalProperties": False,
}

# Commitments an agent is never allowed to make on its own (PRD §4, §6).
_RISK_PATTERNS = {
    "price": re.compile(r"\$\s?\d|\b\d+\s?(dollars|usd)\b|\bfree (of charge|estimate|quote|inspection|service)|\bdiscount", re.I),
    "schedule": re.compile(r"\b(today|tomorrow|tonight|within \d+ (hours?|minutes?)|guarantee)", re.I),
}


@dataclass
class LeadPrep:
    summary: str
    urgency: str
    checklist: list[str]
    email_subject: str
    email_body: str
    provider: str
    flags: list[str] = field(default_factory=list)


def risk_flags(text: str) -> list[str]:
    return [name for name, pattern in _RISK_PATTERNS.items() if pattern.search(text)]


def prepare_lead(settings: Settings, workspace: dict, lead: dict) -> LeadPrep:
    prep = None
    if settings.ai_provider == "anthropic":
        try:
            prep = _prepare_with_claude(settings, workspace, lead)
        except Exception:  # fall back rather than lose the lead; the audit log records which path ran
            log.exception("Claude lead preparation failed; using template drafter")
    if prep is None:
        prep = _prepare_with_template(workspace, lead)
    prep.flags = risk_flags(prep.email_subject + "\n" + prep.email_body)
    return prep


def _lead_text(workspace: dict, lead: dict) -> str:
    fields = ["name", "email", "phone", "address", "service", "message", "source"]
    lines = [f"{f}: {lead.get(f) or '(not provided)'}" for f in fields]
    profile = workspace.get("business_profile") or "(none provided)"
    return (
        f"Business name: {workspace['name']}\nBusiness profile:\n{profile}\n\n"
        "Inbound lead:\n" + "\n".join(lines)
    )


def _prepare_with_claude(settings: Settings, workspace: dict, lead: dict) -> LeadPrep | None:
    import anthropic

    client = anthropic.Anthropic()
    response = client.beta.messages.create(
        model=settings.ai_model,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        thinking={"type": "adaptive"},
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA}},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _lead_text(workspace, lead)}],
    )
    if response.stop_reason in ("refusal", "max_tokens"):
        log.warning("Claude stop_reason=%s for lead %s", response.stop_reason, lead.get("id"))
        return None
    text = next(b.text for b in response.content if b.type == "text")
    data = json.loads(text)
    return LeadPrep(
        summary=data["summary"].strip(),
        urgency=data["urgency"],
        checklist=[c.strip() for c in data["checklist"] if c.strip()],
        email_subject=data["email_subject"].strip(),
        email_body=data["email_body"].strip(),
        provider=f"anthropic:{response.model}",
    )


# --- Deterministic offline drafter ------------------------------------------------------------

_CHECKLISTS = {
    "hvac": ["System type (furnace, AC, heat pump) and approximate age", "Make/model if visible",
             "Symptoms and when they started", "Photos of the unit and thermostat"],
    "plumb": ["Location of the issue (fixture, room, floor)", "Is there active leaking or water damage?",
              "Photos of the affected area", "Main shutoff location known?"],
    "roof": ["Roof material and approximate age", "Visible damage or leaks inside?",
             "Photos from the ground", "Number of stories / roof pitch"],
    "electric": ["What is not working (outlets, breaker, panel, fixture)?", "Panel size/brand if known",
                 "Any burning smell, sparking, or heat? (if yes, advise calling 911)", "Photos of the panel"],
    "clean": ["Square footage and number of rooms", "One-time or recurring service",
              "Pets or special surfaces", "Preferred day of week"],
    "remodel": ["Room(s) and scope of work", "Target budget range the owner has in mind",
                "Desired start window", "Photos or inspiration images"],
}
_GENERIC = ["Service address", "Description of the job and its scope", "Photos of the area",
            "Preferred visit windows"]
_URGENT = re.compile(r"\b(emergency|urgent|asap|flood|leak(ing)?|no heat|no (ac|air)|burst|sparking|smoke)\b", re.I)


def _prepare_with_template(workspace: dict, lead: dict) -> LeadPrep:
    service = (lead.get("service") or "").strip()
    message = (lead.get("message") or "").strip()
    name = (lead.get("name") or "").strip() or "there"
    first = name.split()[0]
    key = next((k for k in _CHECKLISTS if k in f"{service} {message}".lower()), None)
    checklist = list(_CHECKLISTS.get(key, _GENERIC))
    if not lead.get("address"):
        checklist.insert(0, "Service address")
    if not lead.get("phone"):
        checklist.append("Best phone number to reach them")
    urgency = "emergency" if _URGENT.search(f"{service} {message}") else "unknown"

    snippet = (message[:180] + "…") if len(message) > 180 else message
    summary = f"{name if name != 'there' else 'Unnamed lead'} requested {service or 'service'}"
    summary += f" via {lead.get('source') or 'web'}."
    if snippet:
        summary += f' They wrote: "{snippet}"'
    if urgency == "emergency":
        summary += " Possible emergency - review first."

    asks = "\n".join(f"- {item}" for item in checklist[:3])
    body = (
        f"Hi {first},\n\n"
        f"Thanks for reaching out to {workspace['name']} about {service or 'your project'}. "
        "We received your request and a member of our team is reviewing it.\n\n"
        "To prepare an accurate quote, could you reply with:\n"
        f"{asks}\n\n"
        "Feel free to include a few times that work well for a visit or call.\n\n"
        f"Thank you,\n{workspace['name']}"
    )
    return LeadPrep(
        summary=summary,
        urgency=urgency,
        checklist=checklist,
        email_subject=f"We received your {service or 'service'} request",
        email_body=body,
        provider="template",
    )
