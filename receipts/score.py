import math
from collections import defaultdict
from typing import Dict, Iterable

from .claims import FALSE, TRUE, Claim

MIN_RESOLVED = 10


def wilson_lower(hits: int, n: int, z: float = 1.96) -> float:
    if n == 0:
        return 0.0
    p = hits / n
    d = 1 + z * z / n
    centre = p + z * z / (2 * n)
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (centre - margin) / d


def brier(claims: Iterable[Claim]):
    """Mean squared error of stated confidence, only over claims that stated one."""
    xs = [(c.confidence - (1.0 if c.status == TRUE else 0.0)) ** 2
          for c in claims if c.confidence is not None and c.status in (TRUE, FALSE)]
    return sum(xs) / len(xs) if xs else None


def score(claims: Iterable[Claim]) -> Dict[str, dict]:
    by = defaultdict(list)
    for c in claims:
        by[c.speaker].append(c)
    out = {}
    for speaker, cs in by.items():
        resolved = [c for c in cs if c.status in (TRUE, FALSE)]
        hits = sum(c.status == TRUE for c in resolved)
        n = len(resolved)
        out[speaker] = {
            "resolved": n, "hits": hits,
            "hit_rate": hits / n if n else None,
            "hit_rate_lower_95": round(wilson_lower(hits, n), 3),
            "brier": brier(resolved),
            "ranked": n >= MIN_RESOLVED,
            "pending": sum(c.status == "pending" for c in cs),
            "unscorable": sum(c.status == "unscorable" for c in cs),
        }
    return out
