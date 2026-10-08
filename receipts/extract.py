"""Rule-based extractor for numeric price-style predictions.

It is deliberately strict: anything vague ("it'll go crazy") is NOT extracted, so a
speaker can't be scored on a claim they never clearly made. An LLM extractor can be
plugged in through `extract_with(transcript, fn)`; its output is validated the same way.
"""
import re
from datetime import date
from typing import Callable, Iterable, List

from .claims import ABOVE, BELOW, Claim

MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"], 1)}
UNITS = {"k": 1e3, "thousand": 1e3, "m": 1e6, "million": 1e6, "b": 1e9, "billion": 1e9}
UP = r"hit|reach|exceed|surpass|top|break"
DOWN = r"fall to|drop to|crash to|fall below|drop below"
PATTERN = re.compile(
    r"(?P<subj>[A-Z][\w&.\-]*(?: [A-Z][\w&.\-]*){0,3})\s+"
    r"(?:will|is going to|is gonna|gonna)\s+"
    rf"(?P<verb>{UP}|{DOWN})\s+\$?(?P<num>\d[\d,]*(?:\.\d+)?)\s*"
    r"(?P<unit>k|m|b|thousand|million|billion)?\s*"
    r"(?:by|before|in)\s+(?P<when>(?:the )?(?:end of )?(?:[a-z]+ )?20\d\d)",
    re.IGNORECASE)
FILLER = {"honestly", "basically", "so", "and", "but", "well", "now", "look", "yes", "no", "okay",
          "also", "then", "today", "frankly", "actually", "i", "we", "think", "believe", "guys"}
LAST_DAY = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}


def parse_deadline(text: str):
    m = re.search(r"(20\d\d)", text)
    if not m:
        return None
    year = int(m.group(1))
    month = next((n for name, n in MONTHS.items() if name in text.lower()), 12)
    return date(year, month, LAST_DAY[month])


def clean_subject(subj: str) -> str:
    words = subj.split()
    while words and words[0].lower().strip(",.") in FILLER:
        words.pop(0)
    return " ".join(words)


def extract(transcript: str, speaker: str, source_url: str, said_on: date) -> List[Claim]:
    claims = []
    for sentence in re.split(r"(?<=[.!?])\s+", transcript):
        m = PATTERN.search(sentence)
        if not m:
            continue
        deadline = parse_deadline(m.group("when"))
        subject = clean_subject(m.group("subj"))
        if not subject or not deadline or deadline < said_on:
            continue
        target = float(m.group("num").replace(",", "")) * UNITS.get((m.group("unit") or "").lower(), 1)
        direction = ABOVE if re.fullmatch(UP, m.group("verb"), re.I) else BELOW
        claims.append(Claim(speaker, source_url, said_on, sentence.strip(),
                            subject=subject, direction=direction,
                            target=target, deadline=deadline))
    return claims


def extract_with(transcript: str, fn: Callable[[str], Iterable[dict]], speaker: str,
                 source_url: str, said_on: date) -> List[Claim]:
    """Wrap any LLM/extractor returning dicts; invalid or vague items are marked unscorable."""
    out = []
    for d in fn(transcript):
        c = Claim(speaker, source_url, said_on, d.get("text", ""), d.get("subject", ""),
                  d.get("direction", ""), d.get("target"), d.get("deadline"), d.get("confidence"))
        if not c.scorable:
            c.status, c.note = "unscorable", "missing subject, direction, target or deadline"
        out.append(c)
    return out
