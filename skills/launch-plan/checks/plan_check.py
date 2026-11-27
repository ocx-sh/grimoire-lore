#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check a launch plan file against CH-LAUNCH-04, 05, 06, 07, 08, 10, 11, 13 and 14.

    python3 -I plan_check.py PLAN [--artifacts FILE ...]
    python3 -I plan_check.py --self-test

PLAN is the Markdown file of the plan template: front matter, then the tables
`Venue admission`, `Items`, `Schedule` and `Shifts`, and a `Venue facts` list.
--artifacts adds files to the CH-LAUNCH-05 vote-ask scan (the plan is always
scanned). Prints `PATH:LINE: CH-LAUNCH-nn: message`. Exit 0 clean, 1 findings,
2 bad usage. Standard library only. Nothing here reaches the network.
"""

import argparse
import re
import sys
from datetime import UTC, date, datetime, timedelta
from itertools import pairwise
from pathlib import Path

CLASSES = {"community", "editorial", "owned"}
VERDICTS = {"fit", "mismatch", "excluded-by-default", "unverified", "deferred", "owner-override"}
MAJOR = re.compile(r"^v?[1-9][0-9]*\.0\.0$")
ASK = re.compile(
    r"(please |pls )?upvote (us|our)\b|please upvote|vote (for|on) us"
    r"|support us on (product hunt|hn|hacker news|devhunt|uneed)"
    r"|(help us|push us to) (get to |reach )?(#?1|the top)",
    re.IGNORECASE,
)
ORDER = ["release", "record", "venue", "social", "directory", "recap"]
COUNTERS = {f"C{n}" for n in range(1, 12)}
# owner-major:REF points at a written decision: a URL, a path, #N, a commit or a plan line (L12).
REF = re.compile(r"https?://\S+|\S*[/.]\S*|#\d+|[0-9a-f]{7,40}|L\d+")


def slug(venue):
    """Canonical slug of a venue name: `Product Hunt` and producthunt.com give product-hunt."""
    name = venue.strip().lower()
    key = re.sub(r"[^a-z0-9]", "", name)
    if "producthunt" in key:
        return "product-hunt"
    if "showhn" in key or ("ycombinator" in key and "show" in key):
        return "show-hn"
    return name


def parse(text):
    """Return (front matter dict, {section: [(lineno, row dict)]}, lines, key line numbers)."""
    lines = text.splitlines()
    fm, at, start = {}, {}, 0
    if lines and lines[0] == "---":
        end = lines.index("---", 1) if "---" in lines[1:] else 0
        for n, line in enumerate(lines[1:end], 2):
            key, _, value = line.partition(":")
            fm[key.strip()] = value.strip()
            at[key.strip()] = n
        start = end + 1
    tables, section, header = {}, "", None
    for n, line in enumerate(lines[start:], start + 1):
        if line.startswith("## "):
            section, header = line[3:].strip().lower(), None
        elif line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if header is None:
                header = [c.lower() for c in cells]
            elif not set("".join(cells)) <= set("-: "):
                tables.setdefault(section, []).append((n, dict(zip(header, cells, strict=False))))
        else:
            header = None
    return fm, tables, lines, at


def val(fm, key):
    """A front-matter value, or '' when it is absent or still an `ask:`."""
    v = fm.get(key, "")
    return "" if v.lower().startswith("ask:") else v


def day(s):
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def stamp(s):
    try:
        return datetime.strptime(s, "%Y-%m-%dT%H:%MZ").replace(tzinfo=UTC)
    except ValueError:
        return None


def pt_offset(d):
    """Hours from UTC of US Pacific at 00:01 local on date d.

    shortcut: the offset of day d is used for the whole day, so the hour on the
    two switch days is off by one; upgrade to zoneinfo if a plan lands on one.
    """

    def nth_sunday(year, month, n):
        first = date(year, month, 1)
        return first + timedelta(days=(6 - first.weekday()) % 7 + 7 * (n - 1))

    return -7 if nth_sunday(d.year, 3, 2) < d <= nth_sunday(d.year, 11, 1) else -8


def covered(blocks, need_start, need_end):
    """True when the sorted (start, end) blocks leave no gap across the span."""
    blocks = sorted(blocks)
    if not blocks or blocks[0][0] > need_start:
        return False
    reach = blocks[0][1]
    for s, e in blocks[1:]:
        if s > reach:
            return False
        reach = max(reach, e)
    return reach >= need_end


def check(path, text, artifacts=()):
    fm, tables, lines, at = parse(text)
    out = []

    def k(key):
        """Line of a front-matter key, or 1 when the key is absent."""
        return at.get(key, 1)

    def bad(n, rule, msg):
        out.append((n, rule, msg))

    plan_date = day(val(fm, "plan_date"))
    launch_date = day(val(fm, "launch_date"))
    schedule = tables.get("schedule", [])

    # CH-LAUNCH-04: the admission record
    if not plan_date:
        bad(k("plan_date"), "CH-LAUNCH-04", "plan_date is missing or not YYYY-MM-DD")
    for n, r in tables.get("venue admission", []):
        verdict, quote = r.get("verdict", "").lower(), r.get("scope_quote", "")
        if verdict not in VERDICTS:
            bad(n, "CH-LAUNCH-04", f"verdict {verdict!r} is not one of {sorted(VERDICTS)}")
        if verdict == "unverified":
            if "page states no scope" not in quote.lower():
                bad(
                    n,
                    "CH-LAUNCH-04",
                    "an unverified row says `page states no scope; human decides`",
                )
        elif not quote:
            bad(n, "CH-LAUNCH-04", f"{r.get('venue')}: no scope quote")
        if not r.get("url", "").startswith("http"):
            bad(n, "CH-LAUNCH-04", f"{r.get('venue')}: no venue URL")
        if plan_date and r.get("fetched") != plan_date.isoformat():
            bad(
                n,
                "CH-LAUNCH-04",
                f"{r.get('venue')}: fetched {r.get('fetched')!r} is not the plan date",
            )
        if "console" in r.get("venue", "").lower() and r.get("lane") not in ("Tools", "Betas"):
            bad(n, "CH-LAUNCH-04", "a Console.dev row holds lane Tools or Betas")

    # CH-LAUNCH-05: no vote asks
    for name in [path, *artifacts]:
        body = text if name == path else Path(name).read_text(encoding="utf-8")
        for n, line in enumerate(body.splitlines(), 1):
            if ASK.search(line):
                out.append((n, "CH-LAUNCH-05", f"{name}: vote ask: {line.strip()[:60]}"))

    # CH-LAUNCH-06: classes, one community venue per day, staffing
    seen_days, community = {}, []
    admitted = {
        slug(r.get("venue", "")): r.get("url", "") for _, r in tables.get("venue admission", [])
    }
    for n, r in schedule:
        cls, venue = r.get("venue_class", "").lower(), slug(r.get("venue", ""))
        if cls not in CLASSES:
            bad(n, "CH-LAUNCH-06", f"venue_class {cls!r} is not one of {sorted(CLASSES)}")
        launch_day = r.get("launch_day", "").lower() == "true"
        if launch_day and cls != "community":
            bad(n, "CH-LAUNCH-06", "launch_day: true is only for a community row")
        if launch_day and cls == "community":
            community.append((n, venue, r.get("date", "")))
            if r.get("date") in seen_days:
                bad(n, "CH-LAUNCH-06", f"two community launch-day venues on {r.get('date')}")
            seen_days[r.get("date")] = venue
            if venue not in ("show-hn", "product-hunt") and not admitted.get(venue, "").startswith(
                "http"
            ):
                bad(
                    n,
                    "CH-LAUNCH-06",
                    f"{venue}: an unknown community venue; use show-hn or product-hunt, or "
                    "give it a Venue admission row whose url is the fetched page that shows its reply surface",
                )
        pub = r.get("publish_date", "")
        if cls == "editorial" and pub != "not-scheduled" and not pub.startswith("http"):
            bad(
                n,
                "CH-LAUNCH-06",
                "an editorial row holds publish_date: not-scheduled, or a link to the venue's confirmation",
            )
    shifts = tables.get("shifts", [])
    for n, venue, d in community:
        hours = val(fm, "hn_duty_hours")
        if venue == "show-hn" and not (hours.isdigit() and int(hours) >= 1):
            bad(n, "CH-LAUNCH-06", "hn_duty_hours must be a whole number of at least 1")
        rows = [(m, s) for m, s in shifts if slug(s.get("venue", "")) == venue]
        if not rows or any(not s.get("owner") for _, s in rows):
            bad(n, "CH-LAUNCH-06", f"{venue}: name an owner for every shift block")
            continue
        blocks = [(stamp(s.get("start_utc", "")), stamp(s.get("end_utc", ""))) for _, s in rows]
        if any(a is None or b is None or b <= a for a, b in blocks):
            bad(
                rows[0][0],
                "CH-LAUNCH-06",
                f"{venue}: shift times must be YYYY-MM-DDTHH:MMZ with end after start",
            )
            continue
        dd = day(d)
        if venue == "show-hn":
            start = min(a for a, _ in blocks)
            if hours.isdigit() and not covered(blocks, start, start + timedelta(hours=int(hours))):
                bad(
                    rows[0][0],
                    "CH-LAUNCH-06",
                    f"show-hn: shift blocks leave a gap or fall short of {hours} hours",
                )
        elif venue == "product-hunt" and dd:
            go = datetime(dd.year, dd.month, dd.day, 0, 1, tzinfo=UTC) - timedelta(
                hours=pt_offset(dd)
            )
            if not covered(blocks, go, go + timedelta(hours=23, minutes=58)):
                bad(
                    rows[0][0],
                    "CH-LAUNCH-06",
                    "product-hunt: blocks must cover 12:01 AM to midnight Pacific with no gap",
                )
            if plan_date and not 1 <= (dd - plan_date).days <= 30:
                bad(n, "CH-LAUNCH-06", "the Product Hunt date is 1 to 30 days after the plan date")

    # CH-LAUNCH-07: launch reason
    reason, tag = val(fm, "launch_reason"), val(fm, "launched_tag")
    if not re.fullmatch(r"first-launch|major-version|owner-major:\S+", reason):
        bad(
            k("launch_reason"),
            "CH-LAUNCH-07",
            "launch_reason is first-launch, major-version or owner-major:REF; a routine "
            "release is not a launch, so stop and ask the owner",
        )
    if reason.startswith("owner-major:") and not REF.fullmatch(reason.partition(":")[2]):
        bad(
            k("launch_reason"),
            "CH-LAUNCH-07",
            "owner-major:REF needs a URL, a path, #N, a commit or a plan line, not a placeholder",
        )
    if reason == "major-version" and not MAJOR.match(tag):
        bad(
            k("launched_tag"), "CH-LAUNCH-07", f"major-version needs a tag like v2.0.0, not {tag!r}"
        )
    if reason == "first-launch" and not val(fm, "first_launch_evidence"):
        bad(
            k("first_launch_evidence"),
            "CH-LAUNCH-07",
            "first-launch needs first_launch_evidence: the venue search and its output",
        )
    for n, r in schedule:
        if slug(r.get("venue", "")) in ("show-hn", "product-hunt"):
            for v in re.findall(r"\d+\.\d+\.\d+", r.get("title", "")):
                if not MAJOR.match(v):
                    bad(
                        n,
                        "CH-LAUNCH-07",
                        f"the title names version {v}, which is not a major version",
                    )
    last = day(val(fm, "last_ph_launch"))
    if last and launch_date and (launch_date - last).days <= 60 and not val(fm, "relaunch_request"):
        bad(
            k("last_ph_launch"),
            "CH-LAUNCH-07",
            "a second Product Hunt launch inside 60 days needs relaunch_request",
        )

    # CH-LAUNCH-08: order. The first date of each step is compared with the step before it.
    first, row_at = {}, {}
    for n, r in schedule:
        step = r.get("step")
        if step in ORDER and (step != "venue" or r.get("launch_day", "").lower() == "true"):
            i, d = ORDER.index(step), r.get("date", "")
            if d < first.get(i, "9999"):
                first[i], row_at[i] = d, n
    ranks = sorted(first)
    for a, b in pairwise(ranks):
        if first[b] < first[a]:
            msg = f"{ORDER[b]} ({first[b]}) comes before {ORDER[a]} ({first[a]})"
            bad(row_at[b], "CH-LAUNCH-08", msg)
    if 0 in first and 2 in first and first[0] >= first[2]:
        msg = "the release date is not strictly earlier than the venue date"
        bad(row_at[2], "CH-LAUNCH-08", msg)

    # CH-LAUNCH-10: launch week
    if val(fm, "launch_shape") == "launch-week":
        need = int(val(fm, "week_min_items")) if val(fm, "week_min_items").isdigit() else 5
        done = sum(1 for _, r in tables.get("items", []) if r.get("released", "").lower() == "yes")
        if done < need:
            bad(
                k("launch_shape"),
                "CH-LAUNCH-10",
                f"a launch week needs {need} released items; the plan lists {done}",
            )

    # CH-LAUNCH-11: one numeric goal
    for key in ("goal", "counter", "read_command", "baseline_window", "target", "read_on"):
        if not val(fm, key):
            bad(k(key), "CH-LAUNCH-11", f"front matter lacks {key}")
    counter, approved = val(fm, "counter"), val(fm, "owner_approved_counter") == "true"
    if counter and counter not in COUNTERS:
        bad(k("counter"), "CH-LAUNCH-11", f"counter {counter!r} is not one of C1 to C11")
    if counter in ("C1", "C11") and not approved:
        bad(
            k("counter"),
            "CH-LAUNCH-11",
            f"{counter} is a venue or star count; use C5, C6, C3 or C4, or set owner_approved_counter: true",
        )
    if counter in ("C3", "C4") and not val(fm, "traffic_archive"):
        bad(k("counter"), "CH-LAUNCH-11", "a C3 or C4 counter needs traffic_archive (CH-GH-25)")
    if re.search(
        r"\b(stars?|points?|rank(ing)?|trending|upvotes?)\b", val(fm, "goal"), re.IGNORECASE
    ):
        bad(k("goal"), "CH-LAUNCH-11", "the goal names stars, points or a rank (CH-GH-24)")
    window = re.fullmatch(r"28 days ending (\d{4}-\d{2}-\d{2})", val(fm, "baseline_window"))
    if val(fm, "baseline_window") and not (
        window and launch_date and day(window.group(1)) == launch_date - timedelta(days=1)
    ):
        bad(
            k("baseline_window"),
            "CH-LAUNCH-11",
            "baseline_window is `28 days ending` the day before launch_date",
        )
    reads = [day(s.strip()) for s in val(fm, "read_on").split(",") if s.strip()]
    if val(fm, "read_on") and (
        launch_date is None or reads != [launch_date + timedelta(days=k) for k in (1, 2, 7)]
    ):
        bad(k("read_on"), "CH-LAUNCH-11", "read_on is launch_date plus 1, 2 and 7 days")

    # CH-LAUNCH-13: venue figures carry their URL
    in_facts = False
    for n, line in enumerate(lines, 1):
        if line.startswith("## "):
            in_facts = line[3:].strip().lower() == "venue facts"
        elif in_facts and re.search(r"\d", line) and "https://" not in line:
            bad(n, "CH-LAUNCH-13", f"a venue figure without its fetched URL: {line.strip()[:50]}")
        if re.search(r"\b(75|700)\b.*(char|pitch)", line, re.IGNORECASE):
            bad(
                n,
                "CH-LAUNCH-13",
                "75 and 700 are an unreproduced figure; fetch the limit and write it under Venue facts",
            )

    # CH-LAUNCH-14: Product Hunt account
    ph_rows = [n for n, r in schedule if slug(r.get("venue", "")) == "product-hunt"]
    if ph_rows:
        acct = val(fm, "ph_account").lower()
        if not acct:
            msg = "name the maker's personal Product Hunt account in ph_account"
            bad(at.get("ph_account", ph_rows[0]), "CH-LAUNCH-14", msg)
        elif acct in (val(fm, "org").lower(), val(fm, "product").lower()):
            bad(k("ph_account"), "CH-LAUNCH-14", f"ph_account {acct!r} is the org or product name")
    return [(path, *f) for f in sorted(out)]


def expect(condition, message):
    """Self-test check. A bare assert is stripped by python -O; this is not."""
    if not condition:
        raise SystemExit(str(message))


def self_test():
    here = Path(__file__).resolve().parent / "fixtures" / "launch"
    good = check("good-plan.md", (here / "good-plan.md").read_text(encoding="utf-8"))
    expect(not good, good)
    bad_found = {
        f[2] for f in check("bad-plan.md", (here / "bad-plan.md").read_text(encoding="utf-8"))
    }
    want = {f"CH-LAUNCH-{n}" for n in ("04", "05", "06", "07", "08", "10", "11", "13", "14")}
    expect(want <= bad_found, sorted(want - bad_found))
    expect(
        pt_offset(date(2026, 12, 1)) == -8 and pt_offset(date(2026, 7, 1)) == -7,
        "self-test expectation failed",
    )
    t0 = datetime(2026, 12, 3, 8, 1, tzinfo=UTC)
    h = timedelta(hours=1)
    expect(
        covered([(t0, t0 + 4 * h), (t0 + 4 * h, t0 + 8 * h)], t0, t0 + 8 * h),
        "self-test expectation failed",
    )
    expect(
        not covered([(t0, t0 + 3 * h), (t0 + 4 * h, t0 + 8 * h)], t0, t0 + 8 * h),
        "self-test expectation failed",
    )
    # Venue names are normalised: `Show HN` and `producthunt.com` count as the slugs.
    alias = (here / "alias-plan.md").read_text(encoding="utf-8")
    found = check("alias-plan.md", alias)
    by_rule = {f[2]: f[1] for f in found}
    expect({"CH-LAUNCH-06", "CH-LAUNCH-07", "CH-LAUNCH-14"} <= set(by_rule), found)
    expect(by_rule["CH-LAUNCH-14"] > 1 and by_rule["CH-LAUNCH-07"] > 1, found)
    spelled = (
        (here / "good-plan.md").read_text(encoding="utf-8").replace("| show-hn |", "| Show HN |")
    )
    expect(not check("spelled-plan.md", spelled), "a spelled venue name must pass like its slug")
    unknown = spelled.replace("| venue | Show HN |", "| venue | HN launch |")
    expect(
        any("unknown community venue" in f[3] for f in check("unknown-plan.md", unknown)),
        "an unknown community venue must be flagged",
    )
    ref = (
        (here / "good-plan.md")
        .read_text(encoding="utf-8")
        .replace(
            "launch_reason: major-version", "launch_reason: owner-major:docs/decisions/launch.md"
        )
    )
    expect(not check("ref-plan.md", ref), "a path REF must pass")
    print("plan_check self-test: ok")
    return 0


def main(argv):
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("plan", nargs="?")
    ap.add_argument("--artifacts", nargs="*", default=[])
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.plan or not Path(args.plan).is_file():
        ap.print_usage(sys.stderr)
        return 2
    findings = check(args.plan, Path(args.plan).read_text(encoding="utf-8"), args.artifacts)
    for path, n, rule, msg in findings:
        print(f"{path}:{n}: {rule}: {msg}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
