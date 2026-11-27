#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Draft checks for microblog release posts (X, Bluesky, Mastodon, Threads).

Rules covered (the platform counters are in mb_count.mjs):
  CH-CORE-01/06/08  header keys, empty approval fields, label keys, sponsor line first
  CH-MB-07          post 1 carries exactly one release URL, later posts carry none
  CH-MB-08          post 1 names the product, the tag and one concrete change
  CH-MB-09          one post, or 2 to 3 posts for 2 or more items
  CH-MB-12          a Threads payload with link_attachment is a text-only post
  CH-MB-13          alt text present, within the registry limit, not a file name, equal across variants
  CH-MB-15          no unsourced claim about how a platform treats links, threads or replies
  CH-MB-16          no similar text on two X accounts
  CH-MB-22          every URL is written in full with https://
  CH-MB-23          a terminal screenshot's alt text quotes the recorded command and output

Draft format: see SKILL.md. Front matter between two `---` lines, then
`## <platform>[:<account>]` sections holding `### post N` blocks. Keyed lines
inside a post: image, video, alt, recorded, card, link_attachment, cw.

Usage:
  mb_check.py [--parse] [--compare OTHER] [--prose FILE ...] DRAFT ...
  mb_check.py --threads-payload FILE.json
  mb_check.py --self-test

--parse prints the parsed draft as JSON (the input of mb_count.mjs) and exits 0.
Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.

shortcut: the scheme-less domain test (CH-MB-22) uses a fixed TLD list, so a
domain on another TLD passes here. mb_count.mjs applies the exact twitter-text
URL extractor. Run both.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

HEADER_KEYS = (
    "platform",
    "account",
    "action",
    "labels",
    "ai_role",
    "sponsored",
    "spend",
    "open_asks",
    "approved_by",
    "approved_at",
)
DRAFT_KEYS = ("product", "release_tag", "summary", "items")
POST_KEYS = ("image", "video", "alt", "recorded", "card", "link_attachment", "cw")
PLATFORMS = ("x", "bluesky", "mastodon", "threads")
STOP = {"with", "from", "this", "that", "release", "version", "update"}
TLDS = (
    "com|org|net|io|dev|sh|rs|app|ai|co|me|xyz|tech|cloud|info|us|de|uk|eu|fr|nl|ch|"
    "se|no|fi|dk|jp|cn|in|ca|au|br|ru"
)
URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)
BARE_RE = re.compile(
    rf"(?<![\w@/.:#-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:{TLDS})\b(?:/\S*)?", re.IGNORECASE
)
ALT_BAD = (
    re.compile(r"^(IMG_|screenshot|image)\b", re.IGNORECASE),
    re.compile(r"\.(png|jpe?g|gif)$", re.IGNORECASE),
)
SIMILAR = 0.8  # project default, not a reading of the X policy (CH-MB-16)
POS = re.compile(
    r"penali[sz]|down-?rank|depriori|suppress|throttl|de-?boost|demot|boost|hurts?\b|reach|engagement",
    re.IGNORECASE,
)
SUBJ = re.compile(r"\blinks?\b|\bthreads?\b|\brepl(?:y|ies)\b", re.IGNORECASE)
SEV = {"CH-MB-07": "SHOULD", "CH-MB-08": "SHOULD", "CH-MB-09": "SHOULD", "CH-MB-23": "SHOULD"}


def registry_int(row_id: str) -> int:
    """First integer in a registry row's value cell (CH-MB-14: no limit literal in a checker)."""
    facts = Path(__file__).resolve().parent.parent / "references" / "facts.md"
    for ln in facts.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in ln.split("|")]
        if len(cells) > 5 and cells[1] == row_id:
            return int(re.search(r"\d[\d,]*", cells[4]).group(0).replace(",", ""))
    raise ValueError("registry row not found: " + row_id)


ALT_MAX = min(registry_int("X-F07"), registry_int("TH-F07"))


def urls(text: str) -> list[str]:
    return [u.rstrip(".,;:!?") for u in URL_RE.findall(text)]


def parse(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    out = {"path": str(path), "header": {}, "variants": []}
    i = 0
    if lines and lines[0].strip() == "---":
        i, cur = 1, ""
        while i < len(lines) and lines[i].strip() != "---":
            m = re.match(r"([a-z_]+):\s*(.*)$", lines[i])
            if m:
                cur = m.group(1)
                out["header"][cur] = m.group(2).strip()
            elif cur and lines[i].strip():  # indented continuation, e.g. a nested labels block
                out["header"][cur] += " " + lines[i].strip()
            i += 1
        i += 1
    var = post = None
    for n in range(i, len(lines)):
        ln = lines[n]
        m = re.match(r"##\s+([a-z]+)(?::(\S+))?\s*$", ln)
        if m and not ln.startswith("###"):
            var = {"platform": m.group(1), "account": m.group(2) or "", "line": n + 1, "posts": []}
            out["variants"].append(var)
            post = None
            continue
        if re.match(r"###\s+post\s+\d+", ln) and var is not None:
            post = {
                "line": n + 1,
                "text": "",
                "media": [],
                "card": "",
                "link_attachment": "",
                "cw": "",
            }
            var["posts"].append(post)
            continue
        if post is None:
            continue
        k = re.match(rf"({'|'.join(POST_KEYS)}):\s*(.*)$", ln)
        if k:
            key, val = k.group(1), k.group(2).strip()
            if key in ("image", "video"):
                post["media"].append({"path": val, "alt": "", "recorded": "", "line": n + 1})
            elif key in ("alt", "recorded") and post["media"]:
                post["media"][-1][key] = val
            elif key in ("card", "link_attachment", "cw"):
                post[key] = val
            continue
        post["text"] += ln + "\n"
    for v in out["variants"]:
        for p in v["posts"]:
            p["text"] = p["text"].strip()
    return out


def prose_hit(text: str) -> bool:
    """CH-MB-15: a paragraph with a platform-treatment claim and no URL, date and n=."""
    for para in re.split(r"\n\s*\n", text):
        if all(re.search(p, para) for p in (r"https?://", r"\b\d{4}-\d{2}-\d{2}\b", r"\bn=\d")):
            continue
        for sent in re.split(r"(?<=[.!?])\s+", para):
            a = [m.span() for m in POS.finditer(sent)]
            b = [m.span() for m in SUBJ.finditer(sent)]
            for x in a:
                for y in b:
                    gap = max(x[0], y[0]) - min(x[1], y[1])
                    if gap <= 60:
                        return True
    return False


def check(d: dict) -> list[tuple[int, str, str]]:
    f: list[tuple[int, str, str]] = []
    h = d["header"]
    for k in HEADER_KEYS:
        if k not in h:
            f.append((1, "CH-CORE-01", "header key missing: " + k))
    for k in ("approved_by", "approved_at"):
        if h.get(k):
            f.append((1, "CH-CORE-01", k + " must stay empty: a named human fills it"))
    for k in DRAFT_KEYS:
        if k not in h or not h[k]:
            f.append((1, "CH-MB-08", "header key missing or empty: " + k))
    if not d["variants"]:
        f.append((1, "CH-MB-01", "no variant section (## x, ## bluesky, ## mastodon, ## threads)"))
    tag = h.get("release_tag", "").lstrip("v")
    prod = h.get("product", "").lower()
    summary_words = {w.lower() for w in re.findall(r"[A-Za-z]{4,}", h.get("summary", ""))} - STOP
    summary_words -= {w.lower() for w in re.findall(r"[A-Za-z]{4,}", prod)}
    items = int(h["items"]) if h.get("items", "").isdigit() else 0
    alts: list[tuple[str, list[str]]] = []
    for v in d["variants"]:
        plat, ln = v["platform"], v["line"]
        tagv = f"{plat} section"
        if plat not in PLATFORMS:
            f.append((ln, "CH-MB-01", f"unknown platform {plat}"))
            continue
        labels = h.get("labels", "")
        need = {"x": ("made_with_ai", "paid_partnership"), "threads": ("is_made_with_ai",)}.get(
            plat, ()
        )
        for key in need:
            if not re.search(rf"\b{key}:\s*(true|false)\b", labels):
                f.append(
                    (ln, "CH-CORE-06", f"labels lacks an explicit {key}: true or false ({tagv})")
                )
        posts = v["posts"]
        if not posts:
            f.append((ln, "CH-MB-09", f"{tagv} has no post"))
            continue
        n = len(posts)
        if n > 3 or (n > 1 and items < 2):
            f.append(
                (
                    ln,
                    "CH-MB-09",
                    f"{tagv}: {n} posts for {items} item(s); allowed: 1 post, or 2 to 3 for 2 or more items",
                )
            )
        first = posts[0]
        u1 = set(urls(first["text"]))
        card = {first["card"]} if first["card"] else set()
        if len(u1) > 1:
            f.append(
                (first["line"], "CH-MB-07", f"{tagv}: post 1 has {len(u1)} URLs, want exactly one")
            )
        if not u1 and not (plat == "bluesky" and card):
            f.append(
                (
                    first["line"],
                    "CH-MB-07",
                    f"{tagv}: post 1 has no release URL and no Bluesky card",
                )
            )
        for k, p in enumerate(posts[1:], 2):
            extra = urls(p["text"])
            if extra:
                f.append(
                    (
                        p["line"],
                        "CH-MB-07",
                        f"{tagv}: post {k} holds a URL; the URL lives in post 1 only",
                    )
                )
        if h.get("sponsored", "").lower() == "true" and not re.match(
            r"(?i)(ad|sponsored|paid partnership|in partnership with)\b", first["text"]
        ):
            f.append(
                (
                    first["line"],
                    "CH-CORE-08",
                    f"{tagv}: sponsored post 1 must open with Ad: or Paid partnership:",
                )
            )
        pre = URL_RE.split(first["text"])[0]
        if tag and prod:
            low = pre.lower()
            if prod not in low:
                f.append(
                    (
                        first["line"],
                        "CH-MB-08",
                        f"{tagv}: text before the URL lacks the product name",
                    )
                )
            if tag not in pre:
                f.append(
                    (first["line"], "CH-MB-08", f"{tagv}: text before the URL lacks the tag {tag}")
                )
            words = {w.lower() for w in re.findall(r"[A-Za-z]{4,}", pre)} - STOP
            if summary_words and not (words & summary_words):
                f.append(
                    (
                        first["line"],
                        "CH-MB-08",
                        f"{tagv}: no concrete change shared with the summary line",
                    )
                )
        vals = []
        for k, p in enumerate(posts, 1):
            blank = URL_RE.sub(" ", p["text"])
            for m in BARE_RE.finditer(blank):
                f.append(
                    (
                        p["line"],
                        "CH-MB-22",
                        f"{tagv} post {k}: bare domain {m.group(0)!r}, write https://",
                    )
                )
            for u in urls(p["text"]):
                if u.lower().startswith("http://"):
                    f.append(
                        (p["line"], "CH-MB-22", f"{tagv} post {k}: {u} must start with https://")
                    )
            for mdx in p["media"]:
                alt = mdx["alt"].strip()
                vals.append(alt)
                if not alt:
                    f.append(
                        (
                            mdx["line"],
                            "CH-MB-13",
                            f"{tagv} post {k}: media {mdx['path']} has no alt text",
                        )
                    )
                elif len(alt) > ALT_MAX or any(r.search(alt) for r in ALT_BAD):
                    f.append(
                        (
                            mdx["line"],
                            "CH-MB-13",
                            f"{tagv} post {k}: alt text is a file name, a stub or over {ALT_MAX} characters",
                        )
                    )
                rec = mdx["recorded"]
                if rec and alt:
                    try:
                        run = [
                            s.strip()
                            for s in (Path(d["path"]).parent / rec)
                            .read_text(encoding="utf-8")
                            .splitlines()
                            if s.strip()
                        ]
                    except OSError:
                        f.append(
                            (
                                mdx["line"],
                                "CH-MB-23",
                                f"{tagv} post {k}: recorded run {rec} unreadable",
                            )
                        )
                        continue
                    if not run or run[0] not in alt or not any(o in alt for o in run[1:]):
                        f.append(
                            (
                                mdx["line"],
                                "CH-MB-23",
                                f"{tagv} post {k}: alt text must quote the recorded command and one output line",
                            )
                        )
            if prose_hit(p["text"]):
                f.append(
                    (
                        p["line"],
                        "CH-MB-15",
                        f"{tagv} post {k}: platform-treatment claim without URL, ISO date and n=",
                    )
                )
        if vals:
            alts.append((tagv, vals))
    if len({tuple(a[1]) for a in alts}) > 1:
        f.append(
            (1, "CH-MB-13", "alt text differs between variants: " + ", ".join(a[0] for a in alts))
        )
    xs = [v for v in d["variants"] if v["platform"] == "x"]
    for i, a in enumerate(xs):
        for b in xs[i + 1 :]:
            if a["account"] != b["account"] and similar(a, b):
                f.append(
                    (
                        b["line"],
                        "CH-MB-16",
                        f"x:{a['account']} and x:{b['account']} are over {SIMILAR} similar",
                    )
                )
    return f


def variant_text(v: dict) -> str:
    return "\n".join(p["text"] for p in v["posts"])


def similar(a: dict, b: dict) -> bool:
    return difflib.SequenceMatcher(None, variant_text(a), variant_text(b)).ratio() > SIMILAR


def compare(d: dict, other: dict) -> list[tuple[int, str, str]]:
    return [
        (a["line"], "CH-MB-16", f"x variant matches {other['path']} x:{b['account']}")
        for a in d["variants"]
        if a["platform"] == "x"
        for b in other["variants"]
        if b["platform"] == "x" and similar(a, b)
    ]


def threads_payload(p: dict) -> list[str]:
    if not p.get("link_attachment"):
        return []
    out = []
    if p.get("media_type") != "TEXT":
        out.append("media_type must be TEXT when link_attachment is set")
    for k in ("image_url", "video_url", "children"):
        if p.get(k):
            out.append(k + " must be absent when link_attachment is set")
    if p["link_attachment"] not in urls(p.get("text", "")):
        out.append("link_attachment must equal the URL in text")
    return out


def emit(path: str, found: list[tuple[int, str, str]]) -> int:
    for ln, rid, msg in sorted(found):
        sev = SEV.get(rid, "MUST")
        print(f"{path}:{ln}: {rid} [{sev}]: {msg}")
    return 1 if found else 0


def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "microblog"
    bad = 0

    def expect(ok: bool, what: str) -> None:
        nonlocal bad
        if not ok:
            bad += 1
            print("self-test FAIL: " + what, file=sys.stderr)

    for fx in sorted(here.glob("pass-*.md")):
        found = check(parse(fx))
        expect(not found, f"{fx.name} should pass, got {found}")
    for fx in sorted(here.glob("fail-*.md")):
        rid = fx.stem.removeprefix("fail-").upper()
        found = check(parse(fx))
        expect(
            any(r == rid for _, r, _ in found),
            f"{fx.name} should report {rid}, got {[r for _, r, _ in found]}",
        )
    expect(prose_hit("X does not hurt reach for links."), "CH-MB-15 plant 1")
    expect(prose_hit("Threads boost engagement."), "CH-MB-15 plant 2")
    expect(
        not prose_hit("Source https://example.com/a 2025-10-14 n=18800000: links lose reach."),
        "CH-MB-15 sourced twin",
    )
    expect(not prose_hit("Lock v4 pins resolve offline."), "CH-MB-15 decoy")
    a, b = parse(here / "pass-release.md"), parse(here / "pass-thread.md")
    expect(bool(compare(a, a)), "compare flags identical x text")
    expect(not compare(a, b), "compare passes distinct x text")
    for name, want in (("threads-ok.json", 0), ("threads-bad.json", 3)):
        got = len(threads_payload(json.loads((here / name).read_text())))
        expect(got == want, f"{name}: {got} findings, want {want}")
    print("self-test " + ("FAILED" if bad else "ok"))
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__.split("\n\n")[0], epilog="Exit 0 clean, 1 findings, 2 usage."
    )
    ap.add_argument("drafts", nargs="*", help="draft files")
    ap.add_argument("--parse", action="store_true", help="print the parsed draft as JSON")
    ap.add_argument(
        "--compare", metavar="OTHER", help="also compare x text against another draft (CH-MB-16)"
    )
    ap.add_argument(
        "--prose",
        nargs="+",
        default=[],
        metavar="FILE",
        help="run the CH-MB-15 paragraph check on plain files",
    )
    ap.add_argument(
        "--threads-payload", metavar="JSON", help="check a Threads container payload (CH-MB-12)"
    )
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rc = 0
    try:
        if a.threads_payload:
            for m in threads_payload(json.loads(Path(a.threads_payload).read_text())):
                print(f"{a.threads_payload}: CH-MB-12 [MUST]: {m}")
                rc = 1
        for p in a.prose:
            if prose_hit(Path(p).read_text(encoding="utf-8")):
                print(
                    f"{p}: CH-MB-15 [MUST]: platform-treatment claim without URL, ISO date and n="
                )
                rc = 1
        if not (a.drafts or a.prose or a.threads_payload):
            ap.error("give a draft, --prose FILE or --threads-payload JSON")
        other = parse(Path(a.compare)) if a.compare else None
        for p in a.drafts:
            d = parse(Path(p))
            if a.parse:
                print(json.dumps(d, indent=2))
                continue
            found = check(d) + (compare(d, other) if other else [])
            rc = max(rc, emit(p, found))
    except (OSError, ValueError) as e:
        print("error: " + str(e), file=sys.stderr)
        return 2
    return rc


if __name__ == "__main__":
    sys.exit(main())
