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
