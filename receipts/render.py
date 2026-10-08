import html
import re
import textwrap

E = html.escape
COLORS = {"true": "#0a7f4f", "false": "#c0392b", "pending": "#8a6d00", "unscorable": "#666666"}
LABEL = {"true": "RIGHT", "false": "WRONG", "pending": "PENDING", "unscorable": "UNSCORABLE"}


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "x"


def money(v: float) -> str:
    return f"{v:,.0f}" if v >= 100 else f"{v:g}"


CSS = """
:root{--bg:#fff;--fg:#14171a;--mut:#5b6670;--card:#f5f7f9;--line:#e1e6ea;--acc:#1d4ed8;--ok:#0a7f4f;--bad:#c0392b;--warn:#8a6d00}
@media (prefers-color-scheme:dark){:root{--bg:#0e1114;--fg:#eef1f4;--mut:#9aa6b2;--card:#171b20;--line:#262c33;--acc:#7aa2ff;--ok:#38c98a;--bad:#ff7a6b;--warn:#e0b84a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main,header .in,footer .in{max-width:880px;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--line)}header .in{display:flex;gap:16px;align-items:center;justify-content:space-between;height:56px;flex-wrap:wrap}
header a{color:var(--fg);text-decoration:none}.brand{font-weight:800;letter-spacing:-.02em}nav a{margin-left:16px;color:var(--mut)}
h1{font-size:clamp(28px,5vw,44px);line-height:1.1;letter-spacing:-.03em;margin:32px 0 8px}h2{margin-top:32px}
.lead{color:var(--mut);font-size:18px;max-width:640px}.banner{background:#fff4d6;color:#5a4500;border:1px solid #ecd48a;padding:10px 14px;border-radius:8px;margin:16px 0}
table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--mut);font-weight:600;font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;color:#fff}
.true{background:var(--ok)}.false{background:var(--bad)}.pending{background:var(--warn)}.unscorable{background:#666}
a{color:var(--acc)}blockquote{margin:8px 0;padding-left:12px;border-left:3px solid var(--line)}.mut{color:var(--mut);font-size:14px}
.btn{display:inline-block;background:var(--acc);color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600}
footer{border-top:1px solid var(--line);margin-top:48px;padding:24px 0;color:var(--mut);font-size:14px}
@media (max-width:560px){th:nth-child(n+4),td:nth-child(n+4){display:none}}
"""


def page(cfg, title, body, rel="", desc=None, og=None, sample=False):
    d = E(desc or cfg["tagline"])
    og_tags = ""
    if og:
        og_tags = (f'<meta property="og:image" content="{E(cfg["url"].rstrip("/") + "/" + og)}">'
                   '<meta name="twitter:card" content="summary_large_image">')
    banner = ('<div class="banner"><b>SAMPLE DATA.</b> Every speaker, quote and price on this '
              'site version is fictional and for demonstration only.</div>') if sample else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)} · {E(cfg["name"])}</title>
<meta name="description" content="{d}"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{d}">{og_tags}
<style>{CSS}</style></head><body><header><div class="in"><a class="brand" href="{rel}index.html">{E(cfg["name"])}</a>
<nav><a href="{rel}methodology.html">Method</a><a href="{rel}submit.html">Submit</a><a href="{rel}dispute.html">Dispute</a></nav></div></header>
<main>{banner}{body}</main><footer><div class="in">{E(cfg["name"])} scores only public, dated, clearly stated predictions.
We report what was said and what happened, nothing about intent or character. Not financial advice.</div></footer></body></html>"""


def card_svg(cfg, claim, sample):
    status = claim.status
    q = textwrap.wrap(f"“{claim.text}”", 46)[:5]
    if len(textwrap.wrap(f"“{claim.text}”", 46)) > 5:
        q[-1] = q[-1].rstrip(".") + "…"
    lines = "".join(f'<text x="60" y="{210 + i * 46}" font-size="34" fill="#14171a">{E(l)}</text>' for i, l in enumerate(q))
    sub = f"{claim.subject} {'above' if claim.direction == 'above' else 'below'} {money(claim.target)} by {claim.deadline.isoformat()}"
    wm = '<text x="600" y="330" font-size="150" fill="#00000012" text-anchor="middle" transform="rotate(-18 600 330)" font-weight="800">SAMPLE</text>' if sample else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Helvetica,Arial,sans-serif">
<rect width="1200" height="630" fill="#ffffff"/><rect x="0" y="0" width="1200" height="14" fill="{COLORS[status]}"/>
<text x="60" y="80" font-size="28" font-weight="700" fill="#5b6670">{E(claim.speaker)} · said on {claim.said_on.isoformat()}</text>
<text x="60" y="130" font-size="26" fill="#5b6670">{E(sub)}</text>{lines}{wm}
<rect x="60" y="500" width="260" height="70" rx="12" fill="{COLORS[status]}"/>
<text x="190" y="548" font-size="38" font-weight="800" fill="#ffffff" text-anchor="middle">{LABEL[status]}</text>
<text x="350" y="548" font-size="26" fill="#14171a">{E(claim.note)}</text>
<text x="1140" y="600" font-size="22" fill="#5b6670" text-anchor="end">{E(cfg["name"])}</text></svg>"""
