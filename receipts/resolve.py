from datetime import date
from typing import Dict

from .claims import ABOVE, FALSE, PENDING, TRUE, UNSCORABLE, Claim


def resolve(claim: Claim, series: Dict[date, float], today: date) -> Claim:
    """Resolve a price-style claim against {date: value}. Deterministic and auditable."""
    if not claim.scorable:
        claim.status = UNSCORABLE
        return claim
    window = [(d, v) for d, v in series.items() if claim.said_on <= d <= claim.deadline]
    hit = [d for d, v in window if (v >= claim.target if claim.direction == ABOVE else v <= claim.target)]
    if hit:
        claim.status, claim.note = TRUE, f"hit on {min(hit).isoformat()}"
    elif today > claim.deadline:
        claim.status, claim.note = FALSE, "deadline passed without hitting target"
    else:
        claim.status = PENDING
    return claim


def resolve_evidence(claim: Claim, best_value: float, best_date: date, as_of: date) -> Claim:
    """Resolve from one licensed-data summary: the peak (for 'above') or trough (for 'below')
    between claim.said_on and min(deadline, as_of). Lets a site publish evidence without
    redistributing a raw price series."""
    if not claim.scorable:
        claim.status = UNSCORABLE
        return claim
    reached = best_value >= claim.target if claim.direction == ABOVE else best_value <= claim.target
    word = "peak" if claim.direction == ABOVE else "low"
    if reached:
        claim.status, claim.note = TRUE, f"{word} {best_value:,.0f} on {best_date.isoformat()}"
    elif as_of > claim.deadline:
        claim.status, claim.note = FALSE, f"{word} was {best_value:,.0f} ({best_date.isoformat()}); target not reached"
    else:
        claim.status = PENDING
    return claim
