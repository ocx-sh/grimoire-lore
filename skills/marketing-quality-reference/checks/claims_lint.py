#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Claims lint for copy surfaces (MKT-CLAIM-01, 02, 03, 04, 05, 28).

Run from the repository root as `python3 -I claims_lint.py [options] [SURFACE ...]`.
Exit 0 clean, 1 findings, 2 usage or an unreadable claims file.

It reads `claims.toml` (`[[claim]]` rows, optional `[[allow]]` entries and a
`[defaults]` table) and runs five checks over the copy surfaces:

  A  schema     every row has the fields its class requires, valid dates, a valid source
  B  binding    every `claim:<id>` marker names a row, and every row's claim text is on its surface
  C  detection  every pattern hit (the 15 MKT-CLAIM-02 lines) is covered by a live row
  D  freshness  an expired row counts as absent; an interval over its class default fails
  E  blocked    count, price, attestation, AI and endorsement hits need a live row of that class;
                an [[allow]] entry never covers them (except the named exceptions)

Each finding prints as `path:line: MKT-CLAIM-NN [check] message`.

Options:
  --root DIR        repository root (default: the current directory)
  --claims FILE     claims file (default: ROOT/claims.toml)
  --base REF        scan only lines added since REF (git diff -U0); default: every line
  --today DATE      ISO date used for expiry (default: today); tests pin it
  --run-checks      run each `count` row's `check` command and compare its output to `value`
  --reading         also print the absolute-word and comparison-word reading lines (never a failure)
  --self-test       run the fixtures under fixtures/claims/ and exit non-zero on any surprise

With no SURFACE, the lint scans README.md, CHANGELOG.md, Cargo.toml, package.json,
pyproject.toml and every file a row lists in `surface`.

Shortcuts, each with the upgrade point:
  - Manifests are scanned only on description, keywords, summary and tagline lines.
  - Claim text is matched anywhere in the file, not inside one HTML element (upgrade: parse the built page).
  - `github:description`, the per-chart and per-cell checks (MKT-CLAIM-06, 30) and the sign-off review
    (MKT-CLAIM-16) need the network or a parsed page and are not run here.
"""

import argparse
import datetime as dt
import io
import json
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

# The 15 MKT-CLAIM-02 lines, in order. Arm numbers below are 1-based.
ARMS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        "[0-9]+([.,][0-9]+)? ?(%|\u00d7)",
        r"\b[0-9]+(\.[0-9]+)? ?(x|ms|MB|GB|seconds|minutes)\b",
        r"\b([0-9]+([,.][0-9]+)*\+?|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|fifty|hundred|dozens|hundreds|thousands|millions) (users|clients|agents|packages|skills|tools|platforms|integrations|customers|companies|teams|developers|downloads|stars|contributors)\b",
        r"[$€£][0-9]|\bper (seat|user|month)\b|/mo\b|\bfree (tier|plan|trial|forever)\b|\bunlimited\b",
        r"\b(fast|faster|fastest|instant(ly)?|blazing\w*|lightning\w*|lightweight|smaller|smallest|cheaper|cheapest|scalable|reliable|secure|safest|unhackable)\b",
        r"\b(SOC ?[123]|ISO ?(/IEC )?27001|GDPR|HIPAA|PCI|FedRAMP|certified|compliant|audited)\b",
        r"\b(trusted by|used by|loved by|adopted by|chosen by|recommended by)\b",
        r"\b(production-ready|battle-tested|enterprise-grade|industry-leading|best-in-class|world-class|military-grade|bank-grade)\b",
        r"\b(AI[- ](powered|driven|enabled)|powered by AI|agentic|intelligent|human-level|no hallucinations?|state-of-the-art)\b",
        r"\b(better|best|cheaper) than\b|\bunlike\b",
        r"\b[0-9]+([.,][0-9]+)? ?(µs|μs|ns|KB|kB|TB|req/s)\b|\b[0-9]+([.,][0-9]+)?s\b",
        r"\b[0-9][0-9,.]*[kKmMB]?\+",
        r"\bup to [0-9]|(^|[^A-Za-z0-9-])free\b|\bstarts at \$",
        r"\btrusted in production by\b|\bpowering (millions|thousands|businesses|the companies)",
        r"\bagentic\b|private alpha|zero[- ]trust|drop-in",
    ]
]
VERSION_FLOOR = re.compile(r"[0-9]+\.[0-9]+\+")
# arm -> classes whose live row may cover it; arm -> the rule it reports under
BLOCKED = {
    3: ("count",),
    4: ("price-or-limit",),
    6: ("security-attestation",),
    7: ("endorsement",),
    9: ("ai-capability",),
    12: ("count",),
    13: ("price-or-limit", "licence"),
    14: ("endorsement",),
}
ARM_RULE = {
    3: "MKT-CLAIM-03",
    4: "MKT-CLAIM-03",
    12: "MKT-CLAIM-03",
    13: "MKT-CLAIM-03",
    6: "MKT-CLAIM-14",
    7: "MKT-CLAIM-20",
    14: "MKT-CLAIM-20",
    9: "MKT-CLAIM-18",
}
# MKT-CLAIM-02: the bare-`free` sense test for an [[allow]] entry (check E).
FREE_P = re.compile(r"(^|[^A-Za-z0-9-])free\b", re.IGNORECASE)
FREE_S = re.compile(
    r"\b(times?|hours?|calendar|available|availability|busy|meet|slot|appointment|schedule|week|(mon|tues|wednes|thurs|fri|satur|sun)day)\b|[A-Za-z0-9]-free\b",
    re.IGNORECASE,
)
FREE_O = re.compile(
    r"\bfree (tier|plan|plans|trial|forever|users|of charge)|for free|(get|try|start|starts) (for )?free|\$[0-9]|\bpricing\b|\bnot free\b",
    re.IGNORECASE,
)
ABSOLUTE = re.compile(
    r"\b(guarantee[ds]?|never|always|no exceptions|infinite|invincible|failproof|without limits)\b|\bno more\b",
    re.IGNORECASE,
)
COMPARE = re.compile(
    r"\b(better|best|cheaper|faster|simpler) than\b|\bunlike\b|\bvs\b\.?(?!\s*code\b)|\bversus\b|\bcompared (to|with)\b|\balternative to\b",
    re.IGNORECASE,
)

CLAIM_RX = re.compile(r"claim:([a-z0-9-]+)")
ONLY_MARKER = re.compile(r"^\s*(<!--|//|#|\{/\*)\s*claim:[a-z0-9-]+\s*(-->|\*/\})?\s*$")
FENCE = re.compile(r"^\s*(```|~~~)")
MANIFEST_LINE = re.compile(
    r"""^\s*"?(description|keywords|summary|tagline)"?\s*[:=]""", re.IGNORECASE
)
MANIFESTS = {"Cargo.toml", "package.json", "pyproject.toml"}

CLASSES = [
    "performance",
    "comparison",
    "statistic",
    "count",
    "price-or-limit",
    "licence",
    "security-mechanism",
    "security-attestation",
    "security-commitment",
    "ai-capability",
    "endorsement",
    "maturity",
    "accolade",
]
SOURCE_TYPES = [
    "own-measurement",
    "vendor-data",
    "third-party-study",
    "primary-law",
    "authority-doc",
    "platform-doc",
    "owner-decision",
]
COMMON = ["id", "class", "claim", "surface", "source", "source_type", "observed", "refresh_by"]
REQUIRED = {
    "performance": ["value", "unit", "method", "window", "subject_version", "caveat"],
    "comparison": [
        "value",
        "unit",
        "method",
        "definition",
        "window",
        "subject_version",
        "caveat",
        "compared_party",
        "compared_kind",
        "third_party_as_of",
        "third_party_version",
    ],
    "statistic": ["value", "unit", "definition", "window", "caveat"],
    "count": ["value", "unit", "check", "definition", "subject_version"],
    "price-or-limit": [
        "value",
        "unit",
        "method",
        "definition",
        "subject_version",
        "caveat",
        "approved_by",
    ],
    "licence": ["check", "subject_version", "spdx_expression", "spdx_list_version"],
    "security-mechanism": ["check", "definition", "subject_version"],
    "security-attestation": [
        "definition",
        "window",
        "subject_version",
        "caveat",
        "approved_by",
        "examiner",
        "access_route",
    ],
    "security-commitment": ["value", "unit", "definition", "approved_by"],
    "ai-capability": [
        "value",
        "unit",
        "method",
        "definition",
        "window",
        "subject_version",
        "caveat",
        "approved_by",
    ],
    "endorsement": [
        "definition",
        "approved_by",
        "kind",
        "who",
        "permission",
        "permission_ref",
        "contact_ref",
        "connection",
    ],
    "maturity": ["definition", "subject_version", "caveat", "approved_by"],
    "accolade": ["check", "definition"],
}
# MKT-CLAIM-05 default intervals in days; None means "next-release" is the only default form.
DEFAULT_DAYS = {
    "performance": 90,
    "comparison": 90,
    "statistic": 366,
    "count": 30,
    "price-or-limit": 30,
    "ai-capability": 90,
    "security-commitment": 366,
    "endorsement": 366,
    "accolade": 366,
    "security-attestation": None,
    "licence": None,
    "security-mechanism": None,
    "maturity": None,
}
OBJECTIVE = ("performance", "comparison", "statistic", "count", "ai-capability")


def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    try:
        return dt.date.fromisoformat(str(v))
    except ValueError:
        return None


def hits(line):
    """arm number -> list of matched strings, for the arms that hit this line."""
    out = {}
    for i, rx in enumerate(ARMS, 1):
        ms = [m.group(0) for m in rx.finditer(line)]
        if i == 12:
            ms = [m for m in ms if not VERSION_FLOOR.search(m)]
        if ms:
            out[i] = ms
    return out


def free_sense_ok(line):
    return bool(FREE_P.search(line) and FREE_S.search(line) and not FREE_O.search(line))


def excluded_lines(lines):
    """1-based line numbers inside a fenced block or a <style> block."""
    skip, fence, style = set(), False, False
    for n, ln in enumerate(lines, 1):
        if FENCE.match(ln):
            fence = not fence
            skip.add(n)
            continue
        if re.search(r"<style[ >]", ln, re.IGNORECASE):
            style = True
        if fence or style:
            skip.add(n)
        if style and re.search(r"</style>", ln, re.IGNORECASE):
            style = False
    return skip


def added_lines(root, base, rel):
    if not base:
        return None
    git = shutil.which("git")
    if git is None:
        print("claims_lint: --base needs `git` on PATH", file=sys.stderr)
        raise SystemExit(2)
    try:
        # S603: argv is git, the --root directory and the --base ref the caller passed.
        out = subprocess.run(  # noqa: S603
            [git, "-C", str(root), "diff", "-U0", base, "--", rel],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
    if not out:
        return None
    added = set()
    for m in re.finditer(r"^@@ -\S+ \+(\d+)(?:,(\d+))? @@", out, re.MULTILINE):
        start, count = int(m.group(1)), int(m.group(2) or 1)
        added.update(range(start, start + count))
    return added


def manifest_version(root):
    for name in ("Cargo.toml", "pyproject.toml", "package.json"):
        p = root / name
        if not p.is_file():
            continue
        try:
            if name == "package.json":
                return str(json.loads(p.read_text()).get("version", "")) or None
            d = tomllib.loads(p.read_text())
            v = (
                d.get("package", {}).get("version")
                or d.get("workspace", {}).get("package", {}).get("version")
                or d.get("project", {}).get("version")
            )
            if v:
                return str(v)
        except (ValueError, OSError):
            continue
    return None


class Lint:
    def __init__(self, root, claims_path, today, base=None, run_checks=False):
        self.root, self.today, self.base, self.run_checks = root, today, base, run_checks
        self.findings, self.reading = [], []
        data = tomllib.loads(claims_path.read_text())
        self.rows = data.get("claim", [])
        self.allow = data.get("allow", [])
        self.defaults = data.get("defaults", {})
        self.claims_rel = (
            str(claims_path.relative_to(root))
            if claims_path.is_relative_to(root)
            else str(claims_path)
        )
        self.by_id = {}
        self.version = manifest_version(root)

    def add(self, path, line, rule, check, msg):
        self.findings.append((str(path), line, rule, check, msg))

    # ---- A: schema -------------------------------------------------------
    def check_a(self):
        for r in self.rows:
            rid = r.get("id", "?")
            if rid in self.by_id:
                self.add(self.claims_rel, 0, "MKT-CLAIM-04", "A", f"{rid}: duplicate id")
            self.by_id[rid] = r
        for r in self.rows:
            rid, cls = r.get("id", "?"), r.get("class")

            def err(m, rid=rid):
                self.add(self.claims_rel, 0, "MKT-CLAIM-04", "A", f"{rid}: {m}")

            if cls not in CLASSES:
                err(f"class {cls!r} is not one of the 13 classes")
                continue
            for f in COMMON + REQUIRED[cls]:
                if r.get(f) in (None, "", [], {}):
                    err(f"required field {f!r} is missing or empty for class {cls}")
            obs, ref = to_date(r.get("observed")), r.get("refresh_by")
            if r.get("observed") is not None and obs is None:
                err("observed is not an ISO date")
            if ref != "next-release" and ref is not None:
                rd = to_date(ref)
                if rd is None:
                    err('refresh_by is neither an ISO date nor "next-release"')
                elif obs and rd <= obs:
                    err("refresh_by is not after observed")
            if r.get("source_type") not in (None, *SOURCE_TYPES):
                err(f"source_type {r.get('source_type')!r} is not in the list")
            src = str(r.get("source") or "")
            if src and not (
                src.startswith("https://")
                or src.startswith("decision:")
                or re.fullmatch(r"[\w./@+-]+(:\d+(-\d+)?)?", src)
            ):
                err("source is not an https:// URL, a repository path or a decision: reference")
            if cls == "licence" and r.get("check") and not (self.root / str(r["check"])).exists():
                err(f"licence check path {r['check']!r} does not exist")
            if cls == "comparison":
                a, o = to_date(r.get("third_party_as_of")), obs
                if a and o and a > o + dt.timedelta(days=7):
                    err("third_party_as_of is more than 7 days after observed")
                if r.get("compared_kind") == "commercial" and not r.get("approved_by"):
                    err("a commercial comparison needs approved_by (MKT-CLAIM-16)")
            if cls == "endorsement":
                cref = str(r.get("contact_ref") or "")
                if "@" in cref or re.search(r"[0-9]{7,}", cref.replace(" ", "")):
                    err("contact_ref holds contact details, not a pointer (MKT-CLAIM-21)")
                if r.get("kind") == "badge":
                    pref = str(r.get("permission_ref") or "")
                    party, _, ptr = pref.partition(": ")
                    if not party or not ptr:
                        err("badge permission_ref must read '<party>: <pointer>'")
                    elif not ptr.startswith("https://") and not (self.root / ptr).exists():
                        err(f"badge permission_ref pointer {ptr!r} does not exist")

    # ---- D: freshness ----------------------------------------------------
    def expired(self, r):
        ref = r.get("refresh_by")
        if ref == "next-release":
            sv = str(r.get("subject_version") or "")
            return bool(self.version and sv and self.version not in sv)
        rd = to_date(ref)
        return rd is None or rd < self.today

    def live(self, rid):
        r = self.by_id.get(rid)
        return r is not None and not self.expired(r)

    def check_d(self):
        for r in self.rows:
            rid, cls = r.get("id", "?"), r.get("class")

            def err(m, rid=rid):
                self.add(self.claims_rel, 0, "MKT-CLAIM-05", "D", f"{rid}: {m}")

            if self.expired(r):
                err(f"expired (refresh_by {r.get('refresh_by')}); it counts as no record")
                continue
            if cls not in DEFAULT_DAYS:
                continue
            cap = self.defaults.get(cls, DEFAULT_DAYS[cls])
            ref, obs = r.get("refresh_by"), to_date(r.get("observed"))
            if ref == "next-release":
                continue  # always shorter than a date interval
            if cap is None:
                err(
                    "this class defaults to next-release; a date needs a [defaults] entry the owner wrote"
                )
            elif obs and to_date(ref) and (to_date(ref) - obs).days > cap:
                err(f"interval {(to_date(ref) - obs).days} days is over the {cap}-day default")

    # ---- surfaces ----------------------------------------------------------
    def surfaces(self, explicit):
        names = list(explicit) or [
            "README.md",
            "CHANGELOG.md",
            "Cargo.toml",
            "package.json",
            "pyproject.toml",
        ]
        for r in self.rows:
            for s in r.get("surface") or []:
                if not s.startswith("github:") and s not in names:
                    names.append(s)
        return [n for n in names if (self.root / n).is_file()]

    # ---- B, C, E: binding, detection, blocked -----------------------------
    def scan(self, explicit):
        files = self.surfaces(explicit)
        texts = {n: (self.root / n).read_text(errors="replace").splitlines() for n in files}
        for n, lines in texts.items():
            skip = excluded_lines(lines)
            only = added_lines(self.root, self.base, n)
            manifest = Path(n).name in MANIFESTS
            for i, ln in enumerate(lines, 1):
                for mid in CLAIM_RX.findall(ln):
                    if mid not in self.by_id:
                        self.add(n, i, "MKT-CLAIM-01", "B", f"marker claim:{mid} names no row")
                if i in skip or (only is not None and i not in only):
                    continue
                if manifest and not MANIFEST_LINE.match(ln):
                    continue
                self.line(n, lines, i, ln)
        for r in self.rows:
            for s in r.get("surface") or []:
                if s.startswith("github:"):
                    continue
                p = self.root / s
                body = p.read_text(errors="replace") if p.is_file() else None
                claim = str(r.get("claim") or "")
                if body is None:
                    self.add(
                        self.claims_rel,
                        0,
                        "MKT-CLAIM-01",
                        "B",
                        f"{r.get('id')}: surface {s} does not exist",
                    )
                elif claim and claim not in body:
                    self.add(
                        self.claims_rel,
                        0,
                        "MKT-CLAIM-01",
                        "B",
                        f"{r.get('id')}: claim text is not byte-equal on {s}",
                    )

    def covering(self, name, lines, i):
        """ids of live rows that cover line i: markers, then the surface binding."""
        ids = CLAIM_RX.findall(lines[i - 1])
        if i > 1 and ONLY_MARKER.match(lines[i - 2]):
            ids += CLAIM_RX.findall(lines[i - 2])
        for r in self.rows:
            if (
                name in (r.get("surface") or [])
                and str(r.get("claim") or "")
                and str(r["claim"]) in lines[i - 1]
            ):
                ids.append(r.get("id"))
        return [x for x in ids if self.live(x)]

    def allowed(self, name, line):
        return any(
            a.get("file") == name and a.get("text") and a["text"] in line and a.get("reason")
            for a in self.allow
        )

    def line(self, name, lines, i, ln):
        if ABSOLUTE.search(ln) or COMPARE.search(ln):
            self.reading.append(f"{name}:{i}: read: {ln.strip()[:120]}")
        h = hits(ln)
        if not h:
            return
        cover = self.covering(name, lines, i)
        classes = {self.by_id[x].get("class") for x in cover}
        allowed = self.allowed(name, ln)
        for arm, ms in sorted(h.items()):
            if arm in BLOCKED:
                if classes & set(BLOCKED[arm]):
                    continue
                low = {m.lower() for m in ms}
                if arm == 9 and low <= {"agentic", "intelligent"} and allowed:
                    continue
                if (
                    arm == 13
                    and all(re.fullmatch(r"\W?free", m, re.IGNORECASE) for m in ms)
                    and allowed
                    and free_sense_ok(ln)
                ):
                    continue
                need = "/".join(BLOCKED[arm])
                self.add(
                    name,
                    i,
                    ARM_RULE[arm],
                    "E",
                    f"{ms[0].strip()!r} needs a live {need} row; allow entries never cover this class",
                )
            elif not cover and not allowed:
                self.add(
                    name,
                    i,
                    "MKT-CLAIM-01",
                    "C",
                    f"pattern line {arm} hit {ms[0].strip()!r} with no live claim record",
                )

    # ---- E: row-level and count re-run -------------------------------------
    def check_e_rows(self):
        sh = shutil.which("sh")
        if self.run_checks and sh is None:
            print("claims_lint: --run-checks needs `sh` on PATH", file=sys.stderr)
            raise SystemExit(2)
        endorse = [r for r in self.rows if r.get("class") == "endorsement"]
        refs = {
            str(r.get(k))
            for r in endorse
            for k in ("id", "original_ref", "permission_ref")
            if r.get(k)
        }
        for r in self.rows:
            rid, cls = r.get("id", "?"), r.get("class")
            if cls in OBJECTIVE:
                if str(r.get("source")) in refs:
                    self.add(
                        self.claims_rel, 0, "MKT-CLAIM-28", "E", f"{rid}: source is an endorsement"
                    )
                if any(
                    str(r.get("claim") or "") and str(r["claim"]) in str(e.get("claim") or "")
                    for e in endorse
                ):
                    self.add(
                        self.claims_rel,
                        0,
                        "MKT-CLAIM-28",
                        "E",
                        f"{rid}: claim is text of an endorsement quote",
                    )
            if cls == "count" and self.run_checks and r.get("check") not in (None, "", "none"):
                try:
                    # S603: `check` is a shell command line the claims file's owner wrote,
                    # run only under --run-checks; that is what the check is for.
                    out = subprocess.run(  # noqa: S603
                        [sh, "-c", str(r["check"])],
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False,
                    ).stdout.strip()
                except (OSError, subprocess.TimeoutExpired):
                    out = "<check failed to run>"
                if out != str(r.get("value")):
                    self.add(
                        self.claims_rel,
                        0,
                        "MKT-CLAIM-03",
                        "E",
                        f"{rid}: check printed {out!r}, value is {r.get('value')!r}",
                    )


def expect(condition, message):
    """Self-test check that survives `python -O`, unlike a bare assert."""
    if not condition:
        raise SystemExit(message)


def run(argv, out=sys.stdout):
    ap = argparse.ArgumentParser(prog="claims_lint.py", description=__doc__.split("\n\n")[0])
    ap.add_argument("surface", nargs="*")
    ap.add_argument("--root", default=".")
    ap.add_argument("--claims")
    ap.add_argument("--base")
    ap.add_argument("--today")
    ap.add_argument("--run-checks", action="store_true")
    ap.add_argument("--reading", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args(argv)
    root = Path(a.root).resolve()
    cp = Path(a.claims) if a.claims else root / "claims.toml"
    today = to_date(a.today) if a.today else dt.date.today()
    if today is None:
        print("claims_lint: --today is not an ISO date", file=sys.stderr)
        return 2
    try:
        lint = Lint(root, cp.resolve(), today, a.base, a.run_checks)
    except (OSError, tomllib.TOMLDecodeError) as e:
        print(f"claims_lint: cannot read claims file: {e}", file=sys.stderr)
        return 2
    lint.check_a()
    lint.check_d()
    lint.scan(a.surface)
    lint.check_e_rows()
    for f, ln, rule, chk, msg in sorted(set(lint.findings)):
        print(f"{f}:{ln}: {rule} [{chk}] {msg}", file=out)
    if a.reading:
        for line in lint.reading:
            print(line, file=out)
    return 1 if lint.findings else 0


def self_test():
    here = Path(__file__).resolve().parent / "fixtures" / "claims"
    # pattern unit checks: each is a planted violation and its compliant twin
    expect(
        1 in hits("It is 50% smaller") and 5 in hits("Switch versions instantly"),
        "assertion failed: 1 in hits('It is 50% smaller') and 5 in hits('Switch versions instantl",
    )
    expect(
        13 not in hits("a dependency-free binary") and 13 in hits("Free forever for teams"),
        "assertion failed: 13 not in hits('a dependency-free binary') and 13 in hits('Free foreve",
    )
    expect(
        12 not in hits("On Windows (PowerShell 7.4+):") and 12 in hits("100k+ users"),
        "assertion failed: 12 not in hits('On Windows (PowerShell 7.4+):') and 12 in hits('100k+ ",
    )
    expect(
        9 in hits("AI-powered search") and not hits("Pins CLI tools by digest."),
        "assertion failed: 9 in hits('AI-powered search') and (not hits('Pins CLI tools by digest",
    )
    expect(
        free_sense_ok("an hour you're free on your calendar")
        and not free_sense_ok("Try Cloud free"),
        'assertion failed: free_sense_ok("an hour you\'re free on your calendar") and (not free_se',
    )
    expect(
        ONLY_MARKER.match("<!-- claim:a-b -->") and not ONLY_MARKER.match("text <!-- claim:a -->"),
        "assertion failed: ONLY_MARKER.match('<!-- claim:a-b -->') and (not ONLY_MARKER.match('te",
    )
    # the pattern set in claims.md and ARMS must stay the same 15 lines
    doc = here.parent.parent.parent / "claims.md"
    if doc.is_file():
        m = re.search(r"```pattern-set\n(.*?)```", doc.read_text(), re.DOTALL)
        lines = [ln for ln in m.group(1).splitlines() if ln and not ln.startswith("#")] if m else []
        want = [rx.pattern for rx in ARMS]
        expect(
            [ln.replace("[:alnum:]", "A-Za-z0-9") for ln in lines] == want,
            "claims.md pattern-set differs from ARMS",
        )
    # pass fixture: clean, with the count check re-run
    buf = io.StringIO()
    rc = run(["--root", str(here / "pass"), "--today", "2026-11-27", "--run-checks"], buf)
    expect(rc == 0, f"pass fixture reported findings:\n{buf.getvalue()}")
    # fail fixture: every planted violation named in expect.txt must be reported
    buf = io.StringIO()
    rc = run(["--root", str(here / "fail"), "--today", "2026-11-27", "--run-checks"], buf)
    got = buf.getvalue()
    expect(rc == 1, "fail fixture exited clean")
    for want in (here / "fail" / "expect.txt").read_text().splitlines():
        if want.startswith("!"):
            expect(want[1:] not in got, f"false positive: {want[1:]}\n{got}")
        elif want.strip():
            expect(want in got, f"expected finding missing: {want}\n{got}")
    # a missing claims file is a usage error
    expect(
        run(["--root", str(here / "nowhere")], io.StringIO()) == 2,
        "assertion failed: run(['--root', str(here / 'nowhere')], io.StringIO()) == 2",
    )
    print("claims_lint self-test: ok")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    sys.exit(run(sys.argv[1:]))
