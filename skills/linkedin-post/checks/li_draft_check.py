#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check a LinkedIn draft file against the linkedin-post rules.

    python3 -I li_draft_check.py DRAFT [--source NOTES] [--plan FILE ...] [--final]
    python3 -I li_draft_check.py --self-test

DRAFT is a Markdown file: header lines `key: value`, a line `---`, the post body,
and optionally a line `<!-- hand-off -->` that starts notes for the human.
Only the body is measured as post text. Brief keys (first_hand, source,
consented, ...) travel in the same header.

Exit 0 = clean, 1 = findings, 2 = bad usage. Standard library only.
Every limit below names its facts.md row; --self-test asserts the two agree.
"""
from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
FACTS = HERE.parent / "references" / "facts.md"
FIX = HERE / "fixtures" / "draft"
HANDOFF = "<!-- hand-off -->"

# name: (facts row, value). Self-test asserts the row text carries the value.
LIMITS = {
    "post": ("LI-F01", 3000),
    "doc_mb": ("LI-F03", 100),
    "doc_pages": ("LI-F03", 300),
    "poll_q": ("LI-F06", 140),
    "poll_opt": ("LI-F06", 30),
    "alt": ("LI-F14", 120),
    "fold": ("LI-F27", 140),
}
BODY_MARGIN = 100  # CH-LI-06 keeps the body at or below limit minus this

CORE_KEYS = "platform account action labels ai_role sponsored spend open_asks approved_by approved_at".split()
LI_KEYS = "author goal metric format visual ai_role human_rewrite value_exchanged reviewed_by".split()
GOALS = {"awareness", "repo-traffic", "install", "credibility"}
METRICS = {"impressions", "members-reached", "github-referrers", "registry-downloads", "utm-clicks"}
FORMATS = {
    "awareness": {"text-image"},
    "repo-traffic": {"text", "document", "video"},
    "install": {"text", "video"},
    "credibility": {"document"},
}
VISUALS = {"none", "image", "document", "video"}
SEV = {
    "CH-CORE-01": "MUST", "CH-LI-02": "MUST", "CH-LI-03": "SHOULD", "CH-LI-04": "MUST",
    "CH-LI-06": "MUST", "CH-LI-07": "MUST", "CH-LI-08": "MUST", "CH-LI-09": "SHOULD",
    "CH-LI-11": "MUST", "CH-LI-12": "MUST", "CH-LI-13": "SHOULD", "CH-LI-14": "MUST",
    "CH-LI-15": "MUST", "CH-LI-16": "MUST", "CH-LI-17": "MUST", "CH-LI-19": "SHOULD",
    "CH-LI-20": "SHOULD", "CH-LI-21": "MUST", "CH-LI-22": "SHOULD", "CH-LI-23": "SHOULD",
}

R04 = re.compile(
    r"\b(I|we)('m| am| are)? ?(work(ed)? (at|for|on)|maintain|build|built|founded|co-founded|lead"
    r"|created?|sell|sold|(am|was|get|got) paid)\b|\b(maintainer|founder|co-founder|employee|author"
    r"|creator) of\b|\bmy (employer|company)\b|\bsponsored by\b|\bpaid partnership\b", re.I)
BAIT = [
    r"\b(comment|type|reply|drop|react)\b[^.\n]{0,40}\b(below|yes|'[^']+'|\"[^\"]+\"|🔥|👍|❤️|with)\b",
    r"\btag (a|your) (friend|colleague)", r"\b(like|react)[^.\n]{0,30}\b(comment|share)\b",
    r"\b(reshare|please share|share this with)\b", r"\bcomment\s+['\"“][^'\"”]+['\"”]",
    r"\breact with\b",
    r"\b(drop|react|reply|type)\b[^.\n]{0,20}[\U0001F300-\U0001FAFF☀-➿]",
]
POD = [
    r"\bengagement (group|pod)\b", r"\b(each other's|each others')\b[^.\n]{0,30}\b(posts?|launch)",
    r"\bpod thread\b",
    r"within the first (hour|\d+ ?min)", r"\b(everyone|team|staff)\b[^.\n]{0,60}\b(repost|reshare)",
    r"\bwill each repost\b", r"please (like|comment|share)", r"first hour", r"repost at",
]
BAIT_RX = re.compile("|".join(BAIT), re.I)
POD_RX = re.compile("|".join(POD), re.I)
RESET_RX = re.compile(r"delete (and|then) re-?post", re.I)
STYLED_RX = re.compile("[\U0001D400-\U0001D7FF]")
BAD_ALT_RX = re.compile(r"\.(png|jpe?g|gif|webp)$|^(image|screenshot|img)\b", re.I)
AGENT_RX = re.compile(r"\b(claude|agent|assistant|llm|gpt|chatgpt|codex|gemini|copilot|bot|ai)\b", re.I)
ORG_RX = re.compile(r"\b(inc|ltd|llc|gmbh|corp|team|labs?|page|company|official)\b", re.I)
URL_RX = re.compile(r"https?://\S+")


def graphemes(s: str) -> list[str]:
    """Stdlib approximation of UAX #29 extended grapheme clusters. Not exact."""
    out, i, n = [], 0, len(s)
    ri = lambda c: 0x1F1E6 <= ord(c) <= 0x1F1FF  # noqa: E731
    def ext(c: str) -> bool:
        o = ord(c)
        return (unicodedata.category(c) in ("Mn", "Me", "Mc") or 0x1F3FB <= o <= 0x1F3FF
                or o in (0xFE0F, 0x20E3) or 0xE0020 <= o <= 0xE007F)
    while i < n:
        j = i + 1
        if ri(s[i]) and j < n and ri(s[j]):
            j += 1
        while j < n:
            if ext(s[j]):
                j += 1
            elif s[j] == "‍" and j + 1 < n:
                j += 2
            else:
                break
        out.append(s[i:j])
        i = j
    return out


def u16(s: str) -> int:
    return len(s.encode("utf-16-le")) // 2


def split_draft(text: str):
    lines = text.split("\n")
    if "---" not in lines:
        return None
    i = lines.index("---")
    body, _, hand = "\n".join(lines[i + 1:]).partition(HANDOFF)
    items = []
    for line in lines[:i]:
        m = re.match(r"^([a-z][a-z0-9_]*):[ \t]*(.*)$", line)
        if m:
            items.append((m.group(1), m.group(2).strip()))
    return items, body.rstrip("\n"), hand


def sixgrams(text: str) -> set:
    w = re.findall(r"\w+", text.lower())
    return {tuple(w[i:i + 6]) for i in range(len(w) - 5)}


def case11_passed(facts: Path) -> bool:
    try:
        return re.search(r"^case11:\s*pass\s+20\d\d-\d\d-\d\d", facts.read_text(encoding="utf-8"), re.M) is not None
    except OSError:
        return False


def check_draft(path: Path, source: Path | None, plans: list[Path], facts: Path, final: bool):
    F: list[tuple[str, str]] = []  # (rule id, message)
    text = path.read_text(encoding="utf-8")
    parsed = split_draft(text)
    if parsed is None:
        return [("CH-LI-21", "no line `---` between the header and the body")]
    items, body, hand = parsed
    allv = lambda k: [v for kk, v in items if kk == k]  # noqa: E731
    get = lambda k: (allv(k) or [None])[-1]  # noqa: E731
    for k in LI_KEYS:
        if get(k) is None:
            F.append(("CH-LI-21", f"missing header key {k}"))
    for k in CORE_KEYS:
        if get(k) is None:
            F.append(("CH-CORE-01", f"missing package key {k}"))
    goal, metric, fmt, visual = get("goal"), get("metric"), get("format"), get("visual")
    sources = [v for v in allv("source") if v]
    blob = " ".join(sources)
    case11 = case11_passed(facts)

    # CH-LI-02, CH-LI-22
    if goal not in GOALS:
        F.append(("CH-LI-02", f"goal {goal!r} is not one of {sorted(GOALS)}"))
    if metric not in METRICS:
        F.append(("CH-LI-02", f"metric {metric!r} is not one of {sorted(METRICS)}"))
    if metric == "utm-clicks" and (get("analytics_on_target") or "").lower() != "true":
        F.append(("CH-LI-02", "metric utm-clicks needs analytics_on_target: true"))
    if goal in FORMATS and not get("format_reason"):
        allowed = FORMATS[goal] | ({"text-image"} if goal == "repo-traffic" and case11 else set())
        if fmt not in allowed:
            F.append(("CH-LI-22", f"format {fmt!r} is not in the {goal} row {sorted(allowed)}; set format_reason"))

    # CH-LI-03
    lines = body.split("\n")[:3]
    first3 = "\n".join(lines)
    if len(graphemes(first3)) > LIMITS["fold"][1]:
        F.append(("CH-LI-03", f"lines 1 to 3 hold {len(graphemes(first3))} graphemes (approximate count), want at most {LIMITS['fold'][1]}"))
    if any(not l.strip() for l in lines):
        F.append(("CH-LI-03", "blank line inside lines 1 to 3"))
    if URL_RX.search(first3):
        F.append(("CH-LI-03", "URL inside lines 1 to 3"))

    # CH-LI-04
    conn = get("connection")
    owes = (conn or "").lower() not in ("none", "") or (get("value_exchanged") or "").lower() == "true"
    if conn is None:
        F.append(("CH-LI-04", "set `connection: none` or state the author's tie to the tool"))
    elif owes:
        head2 = "\n".join(body.split("\n")[:2])
        m = R04.search(head2)
        if not (m and len(graphemes(body[:m.end()])) <= LIMITS["fold"][1]):
            F.append(("CH-LI-04", "no plain connection sentence in line 1 or 2 within the first 140 graphemes"))

    # CH-LI-06
    n = max(len(body), u16(body), len(graphemes(body)))
    if n > LIMITS["post"][1] - BODY_MARGIN:
        F.append(("CH-LI-06", f"body counts {n}, want at most {LIMITS['post'][1] - BODY_MARGIN}"))
    if STYLED_RX.search(body):
        F.append(("CH-LI-06", "Unicode mathematical bold or italic letters in the body"))

    # CH-LI-07, CH-LI-08
    fh = get("first_hand")
    if not fh:
        F.append(("CH-LI-07", "no first_hand: line; ask the human for a number with its command, or real output"))
    else:
        if fh not in body:
            F.append(("CH-LI-07", "first_hand text is not verbatim in the body"))
        if not re.search(r"[0-9]|`[^`]+`", fh):
            F.append(("CH-LI-07", "first_hand has no digit and no backtick span"))
        if not sources:
            F.append(("CH-LI-07", "first_hand has no non-empty source: line"))
    plain = URL_RX.sub(" ", body)
    missing = sorted({t.rstrip(".,") for t in re.findall(r"\d[\d.,]*\d|\d", plain)} - {""})
    missing = [t for t in missing if t not in blob]  # substring: a source line may carry "v0.9.0" for "0.9"
    if missing:
        F.append(("CH-LI-08", f"numbers with no source: line: {', '.join(missing)}"))
    for q in re.findall(r"[“\"]([^”\"]+)[”\"]", body):
        if len(q.split()) >= 3 and q not in blob:
            F.append(("CH-LI-08", f"quote with no source: line: {q[:40]!r}"))
    consented = [c.strip().lstrip("@").lower() for c in ",".join(allv("consented")).split(",") if c.strip()]
    for m in re.findall(r"@[A-Z][A-Za-z.-]+(?: [A-Z][A-Za-z.-]+)?", body):
        mm = m.lstrip("@").lower()
        if not any(mm.startswith(c) or c.startswith(mm) for c in consented):
            F.append(("CH-LI-08", f"mention {m} is not on the consented: list"))
    rb = get("reviewed_by") or ""
    if AGENT_RX.search(rb):
        F.append(("CH-LI-08", f"reviewed_by {rb!r} names an agent, not a human"))
    if final and not rb:
        F.append(("CH-LI-08", "reviewed_by is empty; a human fills it before hand-off"))

    # CH-LI-09
    urls = URL_RX.findall(body)
    if len(urls) > 1 or (goal in ("repo-traffic", "install") and len(urls) != 1):
        F.append(("CH-LI-09", f"{len(urls)} URLs in the body, want exactly one for goal {goal}, none beyond one otherwise"))
    if visual not in VISUALS:
        F.append(("CH-LI-09", f"visual {visual!r} is not one of {sorted(VISUALS)}"))
    if visual == "image" and urls and not case11:
        F.append(("CH-LI-09", "image post with a typed URL needs `case11: pass <date>` in facts.md"))

    # CH-LI-11
    groups: list[dict] = []
    for k, v in items:
        if k == "image":
            groups.append({"image": v})
        elif groups and k == "code_text":
            groups[-1].setdefault("code_text", []).append(v)
        elif groups and k in ("alt", "alt_long_reason"):
            groups[-1][k] = v
    if visual == "image" and not groups:
        F.append(("CH-LI-11", "visual image but no `image:` entry with `alt:`"))
    for g in groups:
        alt = g.get("alt", "")
        if not alt or BAD_ALT_RX.search(alt):
            F.append(("CH-LI-11", f"image {g['image']!r} has empty or filename-like alt text"))
        elif len(alt) > LIMITS["alt"][1] and not g.get("alt_long_reason"):
            F.append(("CH-LI-11", f"alt text of {g['image']!r} is {len(alt)} characters; set alt_long_reason"))
        for ct in g.get("code_text", []):
            if ct and ct not in body and ct not in alt:
                F.append(("CH-LI-11", f"code_text of {g['image']!r} is in neither the body nor the alt text"))

    # CH-LI-12
    if fmt == "document" or visual == "document":
        if not get("doc_title"):
            F.append(("CH-LI-12", "document post without doc_title"))
        for key, lim in (("pages", LIMITS["doc_pages"][1]), ("mb", LIMITS["doc_mb"][1])):
            v = get(key)
            if not (v and v.replace(".", "", 1).isdigit() and float(v) <= lim):
                F.append(("CH-LI-12", f"{key} is {v!r}, want a number at most {lim}"))
        slides = allv("slide")
        if not get("accessible_url") and (not slides or any(s.lower() not in body.lower() for s in slides)):
            F.append(("CH-LI-12", "slide headings are not all in the body and accessible_url is empty"))

    # CH-LI-13, CH-LI-14
    extra = [(p, p.read_text(encoding="utf-8")) for p in plans]
    m = BAIT_RX.search(body)
    if m:
        F.append(("CH-LI-13", f"engagement bait: {m.group(0)[:40]!r}"))
    for label, t in [("draft", body), ("hand-off", hand)] + [(str(p), x) for p, x in extra]:
        m = POD_RX.search(t)
        if m:
            F.append(("CH-LI-14", f"coordinated engagement in {label}: {m.group(0)[:40]!r}"))

    # CH-LI-15
    if source is not None:
        notes = source.read_text(encoding="utf-8")
        d = sixgrams(body)
        share = len(d & sixgrams(notes)) / max(len(d), 1)
        if share >= 0.20:
            F.append(("CH-LI-15", f"{share:.2f} of the 6-word sequences appear in the source, want below 0.20"))
        first = body.split("\n")[0].strip()
        if first and first in [l.strip() for l in notes.split("\n")]:
            F.append(("CH-LI-15", "line 1 is copied from the source"))

    # CH-LI-16
    role, rew = get("ai_role"), get("human_rewrite")
    if role not in ("none", "light", "heavy") or rew not in ("yes", "no", "unset"):
        F.append(("CH-LI-16", "ai_role must be none|light|heavy and human_rewrite yes|no|unset"))
    if role == "heavy" and rew != "yes":
        pol = get("ai_disclosure_policy")
        if not (re.search(r"\b(AI|assistant|LLM)\b", body, re.I) or (pol and Path(pol).exists())):
            F.append(("CH-LI-16", "ai_role heavy without human_rewrite yes needs a plain AI line in the body"))
    if rew == "yes" and rb and AGENT_RX.search(rb):
        F.append(("CH-LI-16", "human_rewrite yes but reviewed_by is an agent"))

    # CH-LI-17
    if (get("value_exchanged") or "").lower() == "true":
        if "Brand partnership" not in text.partition("\n---\n")[2]:
            F.append(("CH-LI-17", "value_exchanged true but the draft has no Brand partnership instruction"))
        if (get("visibility") or "").lower() != "public":
            F.append(("CH-LI-17", "value_exchanged true needs `visibility: public`"))

    # CH-LI-19
    pq = get("poll_question")
    if pq is not None:
        if len(pq) > LIMITS["poll_q"][1] or any(len(o) > LIMITS["poll_opt"][1] for o in allv("poll_option")):
            F.append(("CH-LI-19", "poll question or option over its limit"))
        if final and not get("poll_approved_by"):
            F.append(("CH-LI-19", "poll_approved_by is empty; a human approves the wording first"))
    for label, t in [("draft", body), ("hand-off", hand)] + [(str(p), x) for p, x in extra]:
        if RESET_RX.search(t):
            F.append(("CH-LI-19", f"plan to delete and repost a video in {label}"))

    # CH-LI-20
    au = get("author") or ""
    if not au or ORG_RX.search(au):
        F.append(("CH-LI-20", f"author {au!r} is not a person's name"))
    for p, t in extra:
        section = ""
        for line in t.split("\n"):
            if line.startswith("#"):
                section = line.lower()
            if re.search(r"create (a )?(company )?page", line, re.I):
                if "owner decision" not in section or not re.search(r"no dataset", t, re.I):
                    F.append(("CH-LI-20", f"{p.name}: Page idea outside an Owner decision section with the no-click-data sentence"))

    # CH-LI-23
    for label, t in [("hand-off", hand)] + [(p.name, x) for p, x in extra]:
        for line in t.split("\n"):
            pcts = set(re.findall(r"[0-9]+ ?%", line))
            if pcts and re.search(r"\b(link|url)", line, re.I) and not (re.search(r"3P|vendor", line) and len(pcts) >= 2):
                F.append(("CH-LI-23", f"{label}: link effect given as one number or without 3P and a range: {line.strip()[:60]!r}"))
    return F


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("draft", nargs="?", type=Path)
    ap.add_argument("--source", type=Path, help="release notes or README the draft came from (CH-LI-15)")
    ap.add_argument("--plan", type=Path, action="append", default=[], help="plan or hand-off note to scan (repeatable)")
    ap.add_argument("--facts", type=Path, default=FACTS, help="facts file holding the case11 line")
    ap.add_argument("--final", action="store_true", help="require the fields a human fills after review")
    ap.add_argument("--must-only", action="store_true", help="report MUST findings only")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args(argv)
    if a.self_test:
        return self_test()
    if a.draft is None:
        ap.error("DRAFT is required")
    try:
        found = check_draft(a.draft, a.source, a.plan, a.facts, a.final)
    except OSError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    found = [(i, m) for i, m in found if not a.must_only or SEV.get(i, "MUST") == "MUST"]
    for i, m in found:
        print(f"{a.draft}: {i} {SEV.get(i, 'MUST')}: {m}")
    return 1 if found else 0


def ids(path: str, **kw) -> set:
    d = lambda n: FIX / n  # noqa: E731
    found = check_draft(d(path), kw.get("source"), [d(p) for p in kw.get("plans", [])], FACTS, kw.get("final", True))
    return {i for i, _ in found}


def self_test() -> int:
    assert len(graphemes("é")) == 1 and len(graphemes("\U0001F468‍\U0001F469‍\U0001F467")) == 1
    assert len(graphemes("\U0001F1E9\U0001F1EA")) == 1 and len(graphemes("abc")) == 3
    assert u16("\U0001F600") == 2 and len("\U0001F600") == 1
    # every LIMITS value appears in its facts row
    rows = {}
    for line in FACTS.read_text(encoding="utf-8").split("\n"):
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        if line.startswith("| LI-F"):
            rows[c[0]] = c[3]
    for name, (row, val) in LIMITS.items():
        assert str(val) in rows[row].replace(",", ""), f"{name}: {row} does not carry {val}: {rows[row]!r}"
    # bait, pod and coordination patterns
    for t in ["Comment 'MYTOOL' and I'll DM you the link.", "Drop a \U0001F525 if you agree.", "Tag a friend who pins by hand.",
              "Type YES if you want the cheat sheet.", "React with \U0001F44D for npm.", "Reshare to help us reach 1,000."]:
        assert BAIT_RX.search(t), t
    for t in ["Please like and comment within the first hour.", "Join our engagement group.", "Pod thread in DMs.",
              "Everyone at the company, repost it today."]:
        assert POD_RX.search(t), t
    for t in ["I rewrote our resolver. Lockfile diff dropped from 4,100 lines to 310.", "Heads-up: I wrote this with an assistant and edited it."]:
        assert not BAIT_RX.search(t) and not POD_RX.search(t), t
    # fixtures
    notes = FIX / "notes.md"
    assert ids("pass.md", source=notes, plans=["plan-pass.md"]) == set(), ids("pass.md", source=notes, plans=["plan-pass.md"])
    want = {"CH-LI-02", "CH-LI-21", "CH-CORE-01"}
    got = ids("fail-header.md")
    assert want <= got, (want, got)
    want = {"CH-LI-03", "CH-LI-04", "CH-LI-06", "CH-LI-07", "CH-LI-08", "CH-LI-09", "CH-LI-11", "CH-LI-13",
            "CH-LI-14", "CH-LI-15", "CH-LI-16", "CH-LI-17", "CH-LI-19", "CH-LI-20", "CH-LI-22", "CH-LI-23"}
    got = ids("fail-body.md", source=notes, plans=["plan-fail.md"])
    assert want <= got, sorted(want - got)
    assert "CH-LI-12" in ids("fail-doc.md"), ids("fail-doc.md")
    # a 2,901-count body breaks CH-LI-06; the same body in a clean draft shape does not
    big = FIX / "pass.md"
    t = big.read_text(encoding="utf-8")
    tmp = HERE / "fixtures" / "draft" / ".big.md"
    try:
        tmp.write_text(t + "\n" + "x" * 2901, encoding="utf-8")
        assert "CH-LI-06" in {i for i, _ in check_draft(tmp, None, [], FACTS, True)}
    finally:
        tmp.unlink(missing_ok=True)
    print("self-test ok")
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
