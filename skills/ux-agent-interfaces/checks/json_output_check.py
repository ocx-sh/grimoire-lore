#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Machine-output checks for a CLI (UX-AGENT-01, 02, 03, 04, 09, 11, 14).

Runs the CLI in machine mode over a success, a not-found and a usage case, each
twice (format flag before and after the subcommand), with stdin closed and
NO_COLOR=1, and checks what an agent would parse.

Usage:
  json_output_check.py [--success ARGS] [--not-found ARGS] [--usage ARGS]
      [--format-flag "--format json"] [--alias-flag --json] [--timeout SECONDS]
      [--classes a,b,c] [--rust-cli04] [--sentinel TEXT] [--must-only] -- CLI...
  json_output_check.py --self-test

  ARGS         the subcommand and its arguments as one quoted string, without the
               format flag. Example: --not-found 'describe nope/x'
  CLI          the binary and any fixed leading arguments, after `--`.
  --classes    comma list; when given, the error class must be one of them.
  --rust-cli04 the binary follows the Rust CLI-04 envelope: a missing
               schema_version or retryable in an error document is SHOULD, not MUST.
  --sentinel   text the caller put in a failing call (a fake token); it must not
               appear in stdout or stderr.
  --must-only  report SHOULD findings but do not fail on them.

Exit codes: 0 clean, 1 findings, 2 usage or a case that did not behave as named.
Run as: python3 -I json_output_check.py ...
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LEAK = re.compile(r"authorization:|bearer |traceback|\.rs:[0-9]+", re.IGNORECASE)


class Usage(Exception):
    pass


def run(argv: list[str], timeout: float) -> tuple[int | None, str, str]:
    env = dict(os.environ, NO_COLOR="1")
    try:
        p = subprocess.run(argv, stdin=subprocess.DEVNULL, capture_output=True, text=True,
                           timeout=timeout, env=env)
    except subprocess.TimeoutExpired as e:
        return None, e.stdout or "", e.stderr or ""
    except OSError as e:
        raise Usage(f"cannot run {argv[0]}: {e}") from e
    return p.returncode, p.stdout, p.stderr


def one_document(text: str):
    """The single JSON document in text, or None when it is not exactly one."""
    body = text.strip()
    if not body:
        return None
    try:
        doc, end = json.JSONDecoder().raw_decode(body)
    except ValueError:
        return None
    return doc if not body[end:].strip() else None


def check_error_doc(doc: dict, code: int | None, classes: set[str], cli04: bool, add) -> None:
    err = doc.get("error")
    if not isinstance(err, dict):
        add("UX-AGENT-09", "MUST", "error document has no `error` object")
        return
    slug = err.get("code", err.get("kind"))
    if not isinstance(slug, str) or not re.fullmatch(r"[a-z][a-z0-9_]*", slug):
        add("UX-AGENT-09", "MUST", "error class (`code` or `kind`) is not a lower-case slug")
    elif classes and slug not in classes:
        add("UX-AGENT-09", "MUST", f"error class {slug!r} is not in the documented vocabulary")
    exit_field = err.get("exit", err.get("exit_code", doc.get("exit_code", doc.get("exit"))))
    if exit_field != code or isinstance(exit_field, bool):
        add("UX-AGENT-09", "MUST", f"error exit field {exit_field!r} differs from process exit {code}")
    if "retryable" not in err:
        add("UX-AGENT-09", "SHOULD" if cli04 else "MUST", "`retryable` is absent (send it as false too)")
    elif not isinstance(err["retryable"], bool):
        add("UX-AGENT-09", "MUST", "`retryable` is not a boolean")
    if not isinstance(err.get("message"), str) or not err["message"].strip():
        add("UX-AGENT-09", "MUST", "`message` is missing or empty")
    ra = err.get("retry_after_seconds")
    if ra is not None and (isinstance(ra, bool) or not isinstance(ra, (int, float)) or ra < 0):
        add("UX-AGENT-09", "MUST", "`retry_after_seconds` is not a non-negative number")
    if '{"errors"' in str(err.get("message", "")):
        add("UX-AGENT-14", "MUST", "message echoes a raw upstream body")


def check(cli: list[str], cases: dict[str, str], fmt: list[str], alias: str, timeout: float,
          classes: set[str], cli04: bool, sentinel: str) -> list[tuple[str, str, str]]:
    findings: list[tuple[str, str, str]] = []
    for name, spec in cases.items():
        args = shlex.split(spec)

        def add(rid: str, sev: str, msg: str, name: str = name) -> None:
            findings.append((rid, sev, f"[{name}] {msg}"))

        after = run(cli + args + fmt, timeout)
        before = run(cli + fmt + args, timeout)
        if after[0] is None or before[0] is None:
            add("UX-AGENT-11", "MUST", f"no exit within {timeout:g} s: give the operation a deadline")
            continue
        want_ok = name == "success"
        runs = {"after": after, "before": before}
        good = {k: r for k, r in runs.items() if (r[0] == 0) == want_ok}
        if not good:
            raise Usage(f"case {name!r} exited {after[0]} and {before[0]}: give a command that "
                        f"{'succeeds' if want_ok else 'fails'}")
        parsed = [r for k, r in good.items() if isinstance(one_document(r[1]), dict)]
        ref = parsed[0] if parsed else next(iter(good.values()))
        for label, (code, out, err) in runs.items():
            if label not in good:
                add("UX-AGENT-01", "MUST", f"with the flag {label} the subcommand the exit code is {code}")
                continue
            doc = one_document(out)
            if not isinstance(doc, dict):
                add("UX-AGENT-03", "MUST", f"stdout with the flag {label} the subcommand is not exactly one JSON object")
                continue
            sv = doc.get("schema_version")
            if isinstance(sv, bool) or not isinstance(sv, int):
                sev = "SHOULD" if (cli04 and not want_ok) else "MUST"
                add("UX-AGENT-04", sev, f"no integer `schema_version` (flag {label})")
            if not want_ok and runs[label] is ref:
                check_error_doc(doc, code, classes, cli04, add)
            blob = out + err
            if sentinel and sentinel in blob:
                add("UX-AGENT-14", "MUST", "the sentinel text reaches stdout or stderr")
            if not want_ok and LEAK.search(blob):
                add("UX-AGENT-14", "MUST", "output carries an authorization value, a trace or a source location")
        if (after[0], after[1]) != (before[0], before[1]):
            add("UX-AGENT-01", "MUST", "exit code or stdout changes with the flag position")
        if want_ok and alias:
            alt = run(cli + args + [alias], timeout)
            if (alt[0], alt[1]) != (ref[0], ref[1]):
                add("UX-AGENT-02", "SHOULD", f"{alias} does not behave as {' '.join(fmt)}")
    return findings


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        return self_test()
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], add_help=True)
    p.add_argument("--success")
    p.add_argument("--not-found", dest="not_found")
    p.add_argument("--usage")
    p.add_argument("--format-flag", default="--format json")
    p.add_argument("--alias-flag", default="--json")
    p.add_argument("--timeout", type=float, default=30.0)
    p.add_argument("--classes", default="")
    p.add_argument("--rust-cli04", action="store_true")
    p.add_argument("--sentinel", default="")
    p.add_argument("--must-only", action="store_true")
    p.add_argument("cli", nargs="*", help="the binary, after --")
    a = p.parse_args(argv)
    cases = {k: v for k, v in (("success", a.success), ("not_found", a.not_found), ("usage", a.usage)) if v}
    if not a.cli or not cases:
        p.error("give the CLI after `--` and at least one of --success, --not-found, --usage")
    try:
        findings = check(a.cli, cases, shlex.split(a.format_flag), a.alias_flag, a.timeout,
                         {c for c in a.classes.split(",") if c}, a.rust_cli04, a.sentinel)
    except Usage as e:
        print(f"usage: {e}", file=sys.stderr)
        return 2
    for rid, sev, msg in findings:
        print(f"{rid} {sev}: {msg}")
    failing = [f for f in findings if f[1] == "MUST" or not a.must_only]
    return 1 if failing else 0


def self_test() -> int:
    def expect(cond: bool, what: str) -> None:
        if not cond:
            raise SystemExit(f"self-test: {what}")

    py = sys.executable
    cases = {"success": "about", "not_found": "describe nope/x", "usage": "about --bogus"}
    fmt = ["--format", "json"]
    good = check([py, str(HERE / "fixtures/json/pass_cli.py")], cases, fmt, "--json", 20, set(), False, "")
    expect(not good, f"clean fixture reported {good}")
    bad = check([py, str(HERE / "fixtures/json/fail_cli.py")], cases, fmt, "--json", 20, set(), False, "tok-X")
    ids = {f[0] for f in bad}
    for want in ("UX-AGENT-01", "UX-AGENT-02", "UX-AGENT-03", "UX-AGENT-04", "UX-AGENT-09", "UX-AGENT-14"):
        expect(want in ids, f"planted violation {want} not found in {sorted(ids)}")
    soft = check([py, str(HERE / "fixtures/json/fail_cli.py")], {"not_found": "describe nope/x"},
                 fmt, "", 20, set(), True, "")
    expect(any(f[0] == "UX-AGENT-04" and f[1] == "SHOULD" for f in soft), "rust-cli04 does not soften 04")
    expect(one_document('{"a":1}\n') == {"a": 1} and one_document('{"a":1}\n{"b":2}') is None, "one_document")
    try:
        check([py, str(HERE / "fixtures/json/pass_cli.py")], {"success": "describe nope"}, fmt, "", 20,
              set(), False, "")
        expect(False, "a failing success case must raise Usage")
    except Usage:
        pass
    print("json_output_check self-test: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
