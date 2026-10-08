"""Static-site builder: claims.csv + prices/*.csv -> site/ (HTML, SVG share cards)."""
import json
import os
import glob
import shutil
import subprocess
import sys
from collections import defaultdict
from datetime import date

from .claims import FALSE, PENDING, TRUE, Claim
from .data import load_claims, load_prices, load_resolutions
from .render import E, LABEL, card_svg, money, page, slug
from .resolve import resolve, resolve_evidence
from .score import MIN_RESOLVED, score

DEFAULT_CFG = {"name": "Receipts", "tagline": "What they predicted. What happened.",
               "url": "https://example.github.io/receipts", "repo": "OWNER/REPO"}


def load_cfg(path):
    cfg = dict(DEFAULT_CFG)
    if os.path.exists(path):
        cfg.update(json.load(open(path, encoding="utf-8")))
    return cfg


def pill(status):
    return f'<span class="pill {status}">{LABEL[status]}</span>'


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def find_chrome():
    for pat in ("/opt/pw-browsers/chromium-*/chrome-linux*/chrome",):
        m = sorted(glob.glob(pat))
        if m:
            return m[0]
    return shutil.which("chromium") or shutil.which("google-chrome")


def svg_to_png(svg_path):
    chrome = find_chrome()
    if not chrome:
        return False
    html_path = svg_path[:-4] + ".tmp.html"
    with open(html_path, "w") as fh:
        fh.write('<body style="margin:0"><img src="' + os.path.basename(svg_path) + '" width=1200 height=630>')
    subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                    "--screenshot=" + svg_path[:-4] + ".png", "--window-size=1200,900", "file://" + os.path.abspath(html_path)],
                   check=False, capture_output=True)
    os.remove(html_path)
    png = svg_path[:-4] + ".png"
    if not os.path.exists(png):
        return False
    try:  # headless Chrome's viewport is shorter than the window; crop to the card
        from PIL import Image
        im = Image.open(png)
        im.crop((0, 0, 1200, 630)).save(png)
    except ImportError:
        os.remove(png)
        return False
    return True


def build(data_dir, out_dir, cfg, png=False):
    claims = load_claims(os.path.join(data_dir, "claims.csv"))
    prices = load_prices(os.path.join(data_dir, "prices"))
    evidence = load_resolutions(os.path.join(data_dir, "resolutions.csv"))
    as_of = max([max(s) for s in prices.values() if s] + [e[2] for e in evidence.values()],
                default=date.today())
    sample = any(c.sample for c in claims)
    for c in claims:
        series = prices.get(c.asset.upper())
        if c.id in evidence:
            bv, bd, ao, c.evidence_url = evidence[c.id]
            resolve_evidence(c, bv, bd, ao)
        elif series is None:
            c.status, c.note = "unscorable", f"no price data for {c.asset}"
        else:
            resolve(c, series, as_of)
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    stats = score(claims)
    by_speaker = defaultdict(list)
    for c in claims:
        by_speaker[c.speaker].append(c)

    # ---- claim pages + cards
    for c in claims:
        svg_path = os.path.join(out_dir, "c", f"{c.id}.svg")
        write(svg_path, card_svg(cfg, c, c.sample))
        has_png = png and svg_to_png(svg_path)
        body = f"""<h1>{E(c.speaker)}</h1><p class="mut">said on {c.said_on.isoformat()} ·
<a href="{E(c.source_url)}" rel="noopener nofollow">source</a></p>
<blockquote>{E(c.text)}</blockquote>
<p>Claim: <b>{E(c.subject)}</b> {E(c.direction)} <b>{money(c.target)}</b> by <b>{c.deadline.isoformat()}</b></p>
<p>{pill(c.status)} <span class="mut">{E(c.note)} (data as of {as_of.isoformat()})</span>
{('<br><span class="mut">Evidence: <a href="' + E(c.evidence_url) + '" rel="noopener nofollow">data source</a></span>') if c.evidence_url else ''}</p>
<p><img src="{E(c.id)}.svg" alt="Share card" style="max-width:100%;border:1px solid var(--line);border-radius:8px"></p>
<p><a class="btn" href="https://twitter.com/intent/tweet?text={E(c.speaker)}%20said%20it.%20Here%27s%20what%20happened&amp;url={E(cfg['url'].rstrip('/'))}/c/{E(c.id)}.html">Share</a>
 <a href="../dispute.html">Dispute this</a></p>
<p><a href="../s/{slug(c.speaker)}.html">All receipts from {E(c.speaker)}</a></p>"""
        write(os.path.join(out_dir, "c", f"{c.id}.html"),
              page(cfg, f"{c.speaker}: {c.subject} {c.direction} {money(c.target)}", body, "../",
                   desc=f"{c.speaker} said {c.subject} would go {c.direction} {money(c.target)} by {c.deadline}. {LABEL[c.status]}.",
                   og=f"c/{c.id}." + ("png" if has_png else "svg"), sample=c.sample))

    # ---- speaker pages
    for sp, cs in by_speaker.items():
        s = stats[sp]
        rate = "n/a" if s["hit_rate"] is None else f"{s['hit_rate'] * 100:.0f}%"
        rank = ("" if s["ranked"] else f'<p class="mut">Fewer than {MIN_RESOLVED} resolved claims, so not ranked.</p>')
        rows = "".join(
            f'<tr><td>{c.said_on}</td><td><a href="../c/{E(c.id)}.html">{E(c.subject)} {E(c.direction)} {money(c.target)} by {c.deadline}</a></td><td>{pill(c.status)}</td></tr>'
            for c in sorted(cs, key=lambda x: x.said_on, reverse=True))
        body = f"""<h1>{E(sp)}</h1><p class="lead">{s['resolved']} resolved · {s['hits']} right · hit rate {rate}
 (conservative 95% lower bound {s['hit_rate_lower_95'] * 100:.0f}%) · {s['pending']} pending</p>{rank}
<table><tr><th>Said on</th><th>Claim</th><th>Result</th></tr>{rows}</table>"""
        write(os.path.join(out_dir, "s", f"{slug(sp)}.html"),
              page(cfg, f"{sp}'s track record", body, "../", sample=any(c.sample for c in cs)))

    # ---- leaderboard / home
    ranked = sorted(((sp, s) for sp, s in stats.items() if s["ranked"]),
                    key=lambda kv: -kv[1]["hit_rate_lower_95"])
    if claims:
        lb = "".join(
            f'<tr><td>{i}</td><td><a href="s/{slug(sp)}.html">{E(sp)}</a></td><td>{s["hit_rate"] * 100:.0f}%</td>'
            f'<td>{s["hit_rate_lower_95"] * 100:.0f}%</td><td>{s["resolved"]}</td></tr>'
            for i, (sp, s) in enumerate(ranked, 1))
        unranked = [sp for sp, s in stats.items() if not s["ranked"]]
        board = (f'<table><tr><th>#</th><th>Speaker</th><th>Hit rate</th><th>Conservative</th><th>Resolved</th></tr>{lb}</table>'
                 if ranked else '<p class="mut">No one has enough resolved claims to be ranked yet.</p>')
        extra = ("<p class='mut'>Not yet ranked: " + ", ".join(f'<a href="s/{slug(u)}.html">{E(u)}</a>' for u in unranked) + "</p>") if unranked else ""
        recent = "".join(
            f'<div class="card">{pill(c.status)} <b>{E(c.speaker)}</b> · {E(c.subject)} {E(c.direction)} {money(c.target)} by {c.deadline}'
            f'<br><a href="c/{E(c.id)}.html">See receipt</a></div>'
            for c in sorted(claims, key=lambda x: x.said_on, reverse=True)[:8])
    else:
        board = extra = ""
        recent = '<div class="card">No receipts published yet. <a href="submit.html">Submit the first one.</a></div>'
    body = f"""<h1>{E(cfg['tagline'])}</h1>
<p class="lead">Public, dated, falsifiable predictions, checked against real data. Ranked by a conservative score so tiny samples can't game it.</p>
<p><a class="btn" href="submit.html">Submit a prediction</a> <span class="mut">Data as of {as_of.isoformat()}</span></p>
<h2>Leaderboard</h2>{board}{extra}<h2>Latest receipts</h2>{recent}"""
    write(os.path.join(out_dir, "index.html"), page(cfg, "Home", body, sample=sample))

    # ---- static pages
    repo = cfg["repo"]
    write(os.path.join(out_dir, "methodology.html"), page(cfg, "Method", f"""<h1>How scoring works</h1>
<ol><li><b>What counts:</b> only public, dated, specific statements with a number and a deadline, e.g. "X will reach 100 by June 2026". Vague talk ("it's going to be huge") is never scored.</li>
<li><b>Evidence:</b> every receipt links to the original source. A human checks that the quote says what we say it says before it is published.</li>
<li><b>Resolution:</b> a claim is RIGHT if the stated price level was reached at any point between the day it was said and the deadline, WRONG if the deadline passed without that, PENDING otherwise. Price data and date are shown per receipt.</li>
<li><b>Ranking:</b> nobody is ranked below {MIN_RESOLVED} resolved claims. We rank by the Wilson 95% lower bound of the hit rate, so small lucky streaks can't top the board.</li>
<li><b>Limits:</b> a hit rate is not skill. It says nothing about intent, honesty or character, and it is not financial advice.</li></ol>""", sample=sample))
    write(os.path.join(out_dir, "submit.html"), page(cfg, "Submit", f"""<h1>Submit a prediction</h1>
<p class="lead">Found a clear, public prediction? Send the video/post link, the exact quote, and the date.</p>
<p><a class="btn" href="https://github.com/{E(repo)}/issues/new?template=submit-prediction.yml">Submit on GitHub</a></p>
<p class="mut">We only publish claims we have checked by hand against the source.</p>""", sample=sample))
    write(os.path.join(out_dir, "dispute.html"), page(cfg, "Dispute", f"""<h1>Dispute a receipt</h1>
<p class="lead">If we misquoted someone, got a date wrong, or used the wrong data, tell us. Errors are corrected publicly and quickly.</p>
<p><a class="btn" href="https://github.com/{E(repo)}/issues/new?template=dispute-claim.yml">File a dispute</a></p>""", sample=sample))
    write(os.path.join(out_dir, "404.html"), page(cfg, "Not found", "<h1>Page not found</h1><p><a href='index.html'>Home</a></p>"))
    write(os.path.join(out_dir, ".nojekyll"), "")
    return {"claims": len(claims), "speakers": len(by_speaker), "ranked": len(ranked), "as_of": as_of.isoformat()}


def main(argv=None):
    argv = argv or sys.argv[1:]
    data = argv[0] if argv else "data/receipts"
    out = argv[1] if len(argv) > 1 else "site"
    cfg = load_cfg("site.json")
    print(build(data, out, cfg))


if __name__ == "__main__":
    main()
