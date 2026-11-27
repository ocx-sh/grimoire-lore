#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check what a page or report may claim from measurement (MKT-MEAS-02, 12, 13, 14, 18, 19, 20, 21).

Subcommands:
  legal FILE...             MKT-MEAS-02: a legal conclusion with no attribution; the Omnibus not called a proposal
  fields FILE...            MKT-MEAS-13: a figure with no date in its sentence or row; Safari claims
                            without the WebKit post; metric tables without source, window and as_of
  adoption FILE...          MKT-MEAS-14: a count presented as users, installs or adoption, with no link
  hdyhau FILE...            MKT-MEAS-12: an HDYHAU table has n_shown, n_answered, n_blank and they add up
  hdyhau-form [--decision FILE] FILE...
                            MKT-MEAS-12: a select list or required field near an HDYHAU question
  abgate --baseline P --mde R --weekly N [--weeks W] [--alpha A] [--power B]
                            MKT-MEAS-18: n per arm, and refusal when both arms cannot fill in W weeks
  aicite FILE.csv           MKT-MEAS-19: the report columns, integer counts, ordered interval
  churn FILE...             MKT-MEAS-21: a citation-change percentage with engine, date and label
  badges FILE...            MKT-MEAS-20: a live count badge with no dated sentence beside it
  --self-test               run the fixtures under fixtures/report

A line-scoped check needs one sentence per line in Markdown sources.
Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I report_check.py ...
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import sys
from pathlib import Path
from statistics import NormalDist

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "report"
DATE = re.compile(r"20[0-9]{2}-[0-9]{2}")
FULL_DATE = re.compile(r"20[0-9]{2}-[0-9]{2}-[0-9]{2}")
FENCE = re.compile(r"^\s*(```|~~~)")
LINKED = re.compile(r"\]\(https?://|href=\"https?://")

LEGAL = re.compile(
    r"gdpr[- ]compliant|no (cookie )?banner|consent[- ]free|cnil[- ]approved|cookieless|privacy[- ](friendly|preserving)",
    re.IGNORECASE,
)
ATTRIBUTED = re.compile(
    r"\b(states|claims|according to)\b|decisions/measurement\.md", re.IGNORECASE
)

COUNT_NOUN = r"(?:downloads|stars|visits|visitors|users|clones|views|citations)"
FIGURE = re.compile(rf"\b[0-9][0-9,.]*[kKmM]?\+?\s+(?:\S+\s+){{0,2}}?{COUNT_NOUN}\b")
METRIC_HEADS = {
    "downloads",
    "stars",
    "visits",
    "visitors",
    "clones",
    "views",
    "citations",
    "users",
    "value",
    "count",
}

_N = r"[0-9][0-9,.]*[km+]*"
_NOUN = r"(?:stars|downloads|clones|views|users|installs|developers|teams|companies)"
_WORD = r"(?:users|installs|adopt\w*|trusted|used by)"
ADOPTION = re.compile(
    rf"(\b{_N}\s+(?:\S+\s+){{0,2}}{_NOUN}\b[^.\n]*\b{_WORD}\b)"
    rf"|(\b(?:users|installs|adopt\w*|trusted by|used by)\b[^.\n]*\b{_N}\s+(?:\S+\s+){{0,2}}{_NOUN}\b)"
    rf"|(\b{_N}\s+(?:users|installs|developers|teams|companies)\b)",
    re.IGNORECASE,
)

HDYHAU = re.compile(r"hdyhau|how did you hear|heard about us", re.IGNORECASE)
SHIELD = re.compile(r"img\.shields\.io/(github/stars|npm/d|pypi/d|crates/d|github/downloads)")

CHURN_TRIGGER = re.compile(
    r"\b[0-9]{1,3}\s?%[^.\n]*\b(citations?|cited)\b[^.\n]*\b(gone|drop(ped)?|churn|change[sd]?|disappear\w*|stable|retain\w*|still (shared|cited)|lost|shared|overlap\w*)\b",
    re.IGNORECASE,
)
ENGINES = re.compile(r"ChatGPT|Gemini|Perplexity|AI Overviews|SearchGPT|Copilot|AI Mode")
LABEL = re.compile(r"\b(vendor|preprint)\b", re.IGNORECASE)
AICITE_COLUMNS = (
    "engine",
    "engine_version",
    "location",
    "run_date",
    "mentions",
    "links",
    "n_prompts",
    "n_runs",
    "ci_low",
    "ci_high",
)


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def prose_lines(path: Path):
    """Yield (number, line) outside fenced code blocks."""
    fenced = False
    for number, line in enumerate(read_lines(path), 1):
        if FENCE.match(line):
            fenced = not fenced
        elif not fenced:
            yield number, line


def cmd_legal(path: Path) -> list[str]:
    out = []
    for n, line in prose_lines(path):
        if LEGAL.search(line) and not ATTRIBUTED.search(line):
            out.append(
                f"{path}:{n}: MKT-MEAS-02: unattributed legal conclusion: {line.strip()[:90]}"
            )
        if re.search(r"omnibus", line, re.IGNORECASE) and not re.search(
            r"propos", line, re.IGNORECASE
        ):
            out.append(f"{path}:{n}: MKT-MEAS-02: the Omnibus is not law; say proposed")
    return out


def table_cells(line: str) -> list[str]:
    return [c.strip().lower() for c in line.strip().strip("|").split("|")]


def cmd_fields(path: Path) -> list[str]:
    out = []
    lines = list(prose_lines(path))
    for i, (n, line) in enumerate(lines):
        if line.lstrip().startswith("|"):
            segments = [line]
            if (
                i + 1 < len(lines)
                and lines[i + 1][1].lstrip().startswith("|")
                and (i == 0 or not lines[i - 1][1].lstrip().startswith("|"))
            ):
                heads = table_cells(line)
                if METRIC_HEADS & set(heads) and not {"source", "window", "as_of"} <= set(heads):
                    out.append(
                        f"{path}:{n}: MKT-MEAS-13: metric table lacks source, window and as_of columns"
                    )
        else:
            segments = re.split(r"(?<=[.!?])\s+", line)
        for seg in segments:
            if FIGURE.search(seg) and not DATE.search(seg):
                out.append(f"{path}:{n}: MKT-MEAS-13: figure with no date: {seg.strip()[:90]}")
        low = line.lower()
        if (
            "safari" in low
            and re.search(r"strip|remov|utm", low)
            and "webkit.org/blog/15697" not in line
        ):
            out.append(
                f"{path}:{n}: MKT-MEAS-13: Safari claim without the WebKit Private Browsing post"
            )
    return out


def cmd_adoption(path: Path) -> list[str]:
    return [
        f"{path}:{n}: MKT-MEAS-14: count presented as people or adoption: {line.strip()[:90]}"
        for n, line in prose_lines(path)
        if ADOPTION.search(line) and not LINKED.search(line)
    ]


def cmd_hdyhau(path: Path) -> tuple[list[str], bool]:
    lines = read_lines(path)
    out, found, i = [], False, 0
    while i < len(lines):
        if not lines[i].lstrip().startswith("|"):
            i += 1
            continue
        j = i
        while j < len(lines) and lines[j].lstrip().startswith("|"):
            j += 1
        table = lines[i:j]
        if HDYHAU.search(" ".join(lines[max(0, i - 3) : i]) + " " + table[0]):
            found = True
            heads = table_cells(table[0])
            names = ("n_shown", "n_answered", "n_blank")
            if not all(c in heads for c in names):
                out.append(
                    f"{path}:{i + 1}: MKT-MEAS-12: HDYHAU table lacks n_shown, n_answered or n_blank"
                )
            else:
                idx = [heads.index(c) for c in names]
                for k, row in enumerate(table[2:], i + 3):
                    cells = [c.strip() for c in row.strip().strip("|").split("|")]
                    try:
                        shown, answered, blank = (int(cells[x]) for x in idx)
                    except (ValueError, IndexError):
                        out.append(f"{path}:{k}: MKT-MEAS-12: a count is not an integer")
                        continue
                    if answered + blank != shown:
                        out.append(f"{path}:{k}: MKT-MEAS-12: {answered} + {blank} != {shown}")
        i = j
    return out, found


def cmd_hdyhau_form(path: Path, required_ok: bool) -> list[str]:
    if required_ok:
        return []
    lines = read_lines(path)
    out = []
    for i, line in enumerate(lines):
        if HDYHAU.search(line):
            window = "\n".join(lines[i : i + 7])
            if re.search(r"<select|\brequired\b", window, re.IGNORECASE):
                out.append(
                    f"{path}:{i + 1}: MKT-MEAS-12: select list or required field near an HDYHAU question"
                )
    return out


def sample_size(baseline: float, mde: float, alpha: float, power: float) -> int:
    p1, p2 = baseline, baseline * (1 + mde)
    a, b = NormalDist().inv_cdf(1 - alpha / 2), NormalDist().inv_cdf(power)
    pb = (p1 + p2) / 2
    return math.ceil(
        (a * math.sqrt(2 * pb * (1 - pb)) + b * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
        / (p2 - p1) ** 2
    )


def cmd_abgate(
    baseline: float, mde: float, weekly: float, weeks: float, alpha_power: tuple[float, float]
) -> tuple[list[str], str]:
    n = sample_size(baseline, mde, *alpha_power)
    needed = 2 * n / weekly
    line = f"n_per_arm={n} weeks_to_fill_both_arms={needed:.1f} window_weeks={weeks:g}"
    if needed > weeks:
        return [f"MKT-MEAS-18: refuse the test; ship the change and observe it ({line})"], line
    return [], line


def cmd_aicite(path: Path) -> list[str]:
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows, header = list(reader), reader.fieldnames or []
    missing = [c for c in AICITE_COLUMNS if c not in header]
    if missing:
        return [f"{path}: MKT-MEAS-19: missing columns {', '.join(missing)}"]
    out, hashes = [], {}
    for n, row in enumerate(rows, 2):
        if not row["engine"].strip():
            out.append(f"{path}:{n}: MKT-MEAS-19: empty engine")
        if not FULL_DATE.fullmatch(row["run_date"].strip()):
            out.append(f"{path}:{n}: MKT-MEAS-19: run_date is not YYYY-MM-DD")
        for col in ("n_prompts", "n_runs"):
            if not row[col].strip().isdigit() or int(row[col]) < 1:
                out.append(f"{path}:{n}: MKT-MEAS-19: {col} is not a positive integer")
        try:
            if float(row["ci_low"]) > float(row["ci_high"]):
                out.append(f"{path}:{n}: MKT-MEAS-19: ci_low is above ci_high")
        except ValueError:
            out.append(f"{path}:{n}: MKT-MEAS-19: interval is not numeric")
        if "prompt_set_hash" in row:
            hashes.setdefault(row["engine"], set()).add(row["prompt_set_hash"])
    out += [
        f"{path}: MKT-MEAS-19 (SHOULD): {e} compares periods over different prompt sets"
        for e, h in hashes.items()
        if len(h) > 1
    ]
    return out


def cmd_churn(path: Path) -> list[str]:
    return [
        f"{path}:{n}: MKT-MEAS-21: churn figure needs an engine, a date and a vendor or preprint label: {line.strip()[:90]}"
        for n, line in prose_lines(path)
        if CHURN_TRIGGER.search(line)
        and not (ENGINES.search(line) and DATE.search(line) and LABEL.search(line))
    ]


def cmd_badges(path: Path) -> list[str]:
    lines = read_lines(path)
    out = []
    for i, line in enumerate(lines):
        if SHIELD.search(line) and not any(
            FULL_DATE.search(x) for x in lines[max(0, i - 1) : i + 2]
        ):
            out.append(
                f"{path}:{i + 1}: MKT-MEAS-20: live count badge with no dated sentence beside it"
            )
    return out


def report(findings: list[str]) -> int:
    for line in findings:
        print(line)
    return 1 if findings else 0


def self_test() -> int:
    ok, bad = FIXTURES / "pass", FIXTURES / "fail"

    def expect(label: str, got: list[str], want_clean: bool, needle: str = "") -> None:
        if want_clean and got:
            raise SystemExit(f"self-test {label}: expected clean, got {got}")
        if not want_clean and (not got or needle not in " ".join(got)):
            raise SystemExit(f"self-test {label}: expected {needle!r}, got {got}")

    expect("legal pass", cmd_legal(ok / "legal.md"), True)
    expect("legal fail", cmd_legal(bad / "legal.md"), False, "unattributed")
    expect("omnibus fail", cmd_legal(bad / "legal.md"), False, "not law")
    expect("fields pass", cmd_fields(ok / "fields.md"), True)
    for needle in ("figure with no date", "Safari", "lacks source, window and as_of"):
        expect(f"fields {needle}", cmd_fields(bad / "fields.md"), False, needle)
    expect("adoption pass", cmd_adoption(ok / "adoption.md"), True)
    got = cmd_adoption(bad / "adoption.md")
    if len(got) != 4:
        raise SystemExit(f"self-test adoption: want 4 findings, got {got}")
    good, seen = cmd_hdyhau(ok / "hdyhau.md")
    if good or not seen:
        raise SystemExit(f"self-test hdyhau pass: {good}, seen={seen}")
    expect("hdyhau sum", cmd_hdyhau(bad / "hdyhau.md")[0], False, "!=")
    expect("hdyhau columns", cmd_hdyhau(bad / "hdyhau.md")[0], False, "lacks")
    if cmd_hdyhau(ok / "unrelated.md") != ([], False):
        raise SystemExit("self-test hdyhau unrelated table was read as HDYHAU")
    expect("form pass", cmd_hdyhau_form(ok / "form.html", False), True)
    expect("form fail", cmd_hdyhau_form(bad / "form.html", False), False, "select list")
    expect("form allowed", cmd_hdyhau_form(bad / "form.html", True), True)
    n = sample_size(0.05, 0.10, 0.05, 0.80)
    if n != 31234:
        raise SystemExit(f"self-test abgate: want 31234, got {n}")
    expect("abgate refuse", cmd_abgate(0.05, 0.10, 19, 8, (0.05, 0.80))[0], False, "refuse")
    expect("abgate allow", cmd_abgate(0.05, 0.10, 100000, 8, (0.05, 0.80))[0], True)
    expect("aicite pass", cmd_aicite(ok / "aicite.csv"), True)
    for needle in ("missing columns",):
        expect("aicite columns", cmd_aicite(bad / "aicite-short.csv"), False, needle)
    for needle in ("run_date", "n_runs", "ci_low is above", "different prompt sets"):
        expect(f"aicite {needle}", cmd_aicite(bad / "aicite.csv"), False, needle)
    expect("churn pass", cmd_churn(ok / "churn.md"), True)
    got = cmd_churn(bad / "churn.md")
    if len(got) != 2:
        raise SystemExit(f"self-test churn: want 2 findings, got {got}")
    expect("badges pass", cmd_badges(ok / "badges.md"), True)
    expect("badges fail", cmd_badges(bad / "badges.md"), False, "MKT-MEAS-20")
    print("report_check self-test: ok")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--self-test", action="store_true")
    sub = parser.add_subparsers(dest="cmd")
    for name in ("legal", "fields", "adoption", "hdyhau", "churn", "badges"):
        sub.add_parser(name).add_argument("files", nargs="+", type=Path)
    p = sub.add_parser("hdyhau-form")
    p.add_argument("--decision", type=Path)
    p.add_argument("files", nargs="+", type=Path)
    p = sub.add_parser("abgate")
    p.add_argument("--baseline", type=float, required=True)
    p.add_argument("--mde", type=float, required=True)
    p.add_argument("--weekly", type=float, required=True)
    p.add_argument("--weeks", type=float, default=8)
    p.add_argument("--alpha", type=float, default=0.05)
    p.add_argument("--power", type=float, default=0.80)
    sub.add_parser("aicite").add_argument("file", type=Path)
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.cmd:
        parser.print_usage(sys.stderr)
        return 2
    try:
        if args.cmd == "abgate":
            if not (0 < args.baseline < 1 and args.mde > 0 and args.weekly > 0):
                print("report_check: baseline in (0,1), mde and weekly above 0", file=sys.stderr)
                return 2
            findings, line = cmd_abgate(
                args.baseline, args.mde, args.weekly, args.weeks, (args.alpha, args.power)
            )
            print(line)
            return report(findings)
        if args.cmd == "aicite":
            return report(cmd_aicite(args.file))
        findings: list[str] = []
        for path in args.files:
            if args.cmd == "hdyhau":
                got, seen = cmd_hdyhau(path)
                findings += got
                if not seen:
                    print(f"{path}: no HDYHAU table found")
            elif args.cmd == "hdyhau-form":
                required_ok = bool(
                    args.decision
                    and args.decision.is_file()
                    and re.search(
                        r"hdyhau[_ -]?required\s*:\s*yes",
                        args.decision.read_text(encoding="utf-8"),
                        re.IGNORECASE,
                    )
                )
                findings += cmd_hdyhau_form(path, required_ok)
            else:
                findings += {
                    "legal": cmd_legal,
                    "fields": cmd_fields,
                    "adoption": cmd_adoption,
                    "churn": cmd_churn,
                    "badges": cmd_badges,
                }[args.cmd](path)
        return report(findings)
    except OSError as err:
        print(f"report_check: {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
