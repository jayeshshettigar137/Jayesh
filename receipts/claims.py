from dataclasses import dataclass, field
from datetime import date
from typing import Optional

ABOVE, BELOW = "above", "below"
PENDING, TRUE, FALSE, UNSCORABLE = "pending", "true", "false", "unscorable"


@dataclass
class Claim:
    speaker: str
    source_url: str
    said_on: date
    text: str
    subject: str = ""
    direction: str = ""          # "above" / "below"
    target: Optional[float] = None
    deadline: Optional[date] = None
    confidence: Optional[float] = None   # stated probability 0-1, if the speaker gave one
    status: str = PENDING
    note: str = ""
    id: str = ""
    asset: str = ""
    sample: bool = False
    evidence_url: str = ""

    @property
    def scorable(self) -> bool:
        return bool(self.subject and self.direction and self.target is not None and self.deadline)
