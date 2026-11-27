#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""List form elements that fail the field checks of UX-STATE-20, 27 and 36.

Subcommands, one per check:
  unnamed  UX-STATE-20  input-like elements with no evidence of an accessible name
  elem     UX-STATE-27  step 1: person-data fields with no autocomplete of their own
  badtok   UX-STATE-27  step 3: autocomplete values that are not an HTML autofill token
  pwtok    UX-STATE-36  every password element with its own literal token

A tag grep finds nothing in Vue, Svelte and JSX components, or where a formatter
puts one attribute per line, so each check reads whole elements: any case,
one line or many. The tag and cue lists below came from six open-source
codebases. Add the project's own component names with --tag before running.
A listing is a candidate. Read each element before you report it.

Usage:
  form_fields.py {unnamed,elem,badtok,pwtok} [--tag NAME ...] [--tokens FILE] FILE ...
  form_fields.py --self-test

Output: one line per element, `path:line:<Tag>`, plus ` aria-only` (unnamed),
`autocomplete="value"` (badtok) or ` token=...` (pwtok).
Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
pwtok exits 1 when any password element has a token other than new-password
or current-password, including no token (read the wrapper default) and a
dynamic one.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

# The HTML Standard autofill field names (form-control-infrastructure, last
# updated 27 November 2026) plus on and off. section-* is matched by prefix.
TOKENS = frozenset(
    [
        "additional-name",
        "address-level1",
        "address-level2",
        "address-level3",
        "address-level4",
        "address-line1",
        "address-line2",
        "address-line3",
        "bday",
        "bday-day",
        "bday-month",
        "bday-year",
        "billing",
        "cc-additional-name",
        "cc-csc",
        "cc-exp",
        "cc-exp-month",
        "cc-exp-year",
        "cc-family-name",
        "cc-given-name",
        "cc-name",
        "cc-number",
        "cc-type",
        "country",
        "country-name",
        "current-password",
        "email",
        "family-name",
        "fax",
        "given-name",
        "home",
        "honorific-prefix",
        "honorific-suffix",
        "impp",
        "language",
        "mobile",
        "name",
        "new-password",
        "nickname",
        "off",
        "on",
        "one-time-code",
        "organization",
        "organization-title",
        "pager",
        "photo",
        "postal-code",
        "sex",
        "shipping",
        "street-address",
        "tel",
        "tel-area-code",
        "tel-country-code",
        "tel-extension",
        "tel-local",
        "tel-local-prefix",
        "tel-local-suffix",
        "tel-national",
        "transaction-amount",
        "transaction-currency",
        "url",
        "username",
        "webauthn",
        "work",
    ]
)

# One attribute run: plain text, quoted strings, and brace groups two deep.
# Possessive so a stray quote or brace cannot make the scan quadratic.
ATTR = r"""(?:[^>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*+"""

ELEM_TAGS = [
    "input",
    "Input",
    "PasswordInput",
    "VInput",
    "FormInput",
    "FormField",
    "Password",
    "InterfaceSystemInputPassword",
    "TextField",
    "Field",
]
UNNAMED_TAGS = [
    "input",
    "textarea",
    "select",
    "Input",
    "Textarea",
    "Select",
    "PasswordInput",
    "SensitiveInput",
    "VInput",
    "FormInput",
    "Password",
    "InterfaceSystemInputPassword",
    "OTPInput",
    "TextField",
    "FormField",
]
PW_TAGS = [
    "input",
    "Input",
    "PasswordInput",
    "SensitiveInput",
    "VInput",
    "FormInput",
    "FormField",
    "Password",
    "InterfaceSystemInputPassword",
]

CUE = re.compile(
    r"""type=["'{]+(?:email|password|tel)"""
    r"""|(?:name|id)=["'](?:user_?name|username|email|e-mail|password|new-?password|first_?name"""
    r"""|last_?name|full_?name|name|displayName|nickname|phone|tel|otp|totp\w*|code|backup\w*"""
    r"""|birth\w*|bday|dateOfBirth)["']"""
    r"""|v-model(?:\.\w+)?="[\w.\[\]]*(?:username|email|password|passcode|[Nn]ame)\""""
    r"""|bind:value=\{[\w.]*(?:[Ee]mail|[Pp]assword|[Nn]ame|[Cc]ode|[Bb]irth\w*)\}"""
    r"""|<PasswordInput|<Password\b|<InterfaceSystemInputPassword"""
)
FIELD_WINDOW = re.compile(r"""name=["'](?:email|password|name|username|code|backup\w*)["']""")
LABEL_NEAR = re.compile(
    r"<label|<FormLabel|<Field\.Label|<Field\s+label=|<UserSettingField|(?<![-\w])label="
)


def load(path: str) -> str | None:
    try:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"form_fields: cannot read {path}: {exc.strerror}", file=sys.stderr)
        return None
    # Whole-line // comments go, so an apostrophe in a comment cannot open a string.
    return re.sub(r"^[ \t]*//[^\n]*$", "", text, flags=re.MULTILINE)


def elements(text: str, tags: list[str]):
    pat = re.compile(r"<(" + "|".join(map(re.escape, tags)) + r")\b(" + ATTR + r")>")
    for m in pat.finditer(text):
        yield m.group(1), m.group(2), m.start()


def line_of(text: str, pos: int) -> int:
    return 1 + text.count("\n", 0, pos)


def window(text: str, pos: int, chars: int, lines: int) -> str:
    before = text[max(0, pos - chars) : pos]
    parts = before.split("\n")
    while parts and parts[-1] == "":  # a trailing newline is not a line
        parts.pop()
    return "\n".join(parts[-lines:])


def check_elem(text: str, tags: list[str]) -> list[tuple[int, str]]:
    out = []
    for name, body, pos in elements(text, tags):
        has_cue = CUE.search(f"<{name}{body}") is not None
        spread = FIELD_WINDOW.search(window(text, pos, 400, 8)) and "{...field}" in body
        if not (has_cue or spread) or re.search("autocomplete", body, re.IGNORECASE):
            continue
        out.append((line_of(text, pos), f"<{name}>"))
    return out


def check_unnamed(text: str, tags: list[str]) -> list[tuple[int, str]]:
    out = []
    for name, body, pos in elements(text, tags):
        if name == "FormField" and (
            not re.search(r"\btype=", body) or re.search(r"\brender=", body)
        ):
            continue
        if re.search(r"""type=["'](?:hidden|submit|button|checkbox|radio|file)["']""", body):
            continue
        if re.search(r"(?<![-\w])label=", body):
            continue
        if re.search(r"aria-label|aria-labelledby", body):
            out.append((line_of(text, pos), f"<{name}> aria-only"))
            continue
        m = re.search(r"""\bid=["']([^"'{}]+)["']""", body)
        if m and re.search(r"""(?:for|htmlFor)=["']""" + re.escape(m.group(1)) + r"""["']""", text):
            continue
        if LABEL_NEAR.search(window(text, pos, 900, 10)):
            continue
        out.append((line_of(text, pos), f"<{name}>"))
    return out


def check_badtok(text: str, tokens: frozenset[str]) -> list[tuple[int, str]]:
    out = []
    pat = re.compile(r"""(?<![-\w])autocomplete\s*=\s*(?:"([^"{}]*)"|'([^'{}]*)')""", re.IGNORECASE)
    for n, line in enumerate(text.split("\n"), 1):
        for m in pat.finditer(line):
            value = m.group(1) if m.group(1) is not None else m.group(2)
            bad = [
                w for w in value.lower().split() if w not in tokens and not w.startswith("section-")
            ]
            if bad:
                out.append((n, f'autocomplete="{value}"'))
    return out


PW_ELEM = re.compile(
    r"""type=["'{][^>]*password|<(?:PasswordInput|Password|SensitiveInput|InterfaceSystemInputPassword)\b""",
    re.IGNORECASE,
)


def check_pwtok(text: str, tags: list[str]) -> list[tuple[int, str]]:
    out = []
    for name, body, pos in elements(text, tags):
        if not PW_ELEM.search(f"<{name}{body}"):
            continue
        if m := re.search(r'autocomplete\s*=\s*"([^"]*)"', body, re.IGNORECASE):
            tok = m.group(1)
        elif m := re.search(r"autocomplete\s*=\s*\{([^}]*)\}", body, re.IGNORECASE):
            tok = "{" + m.group(1) + "}"
        elif re.search("autocomplete", body, re.IGNORECASE):
            tok = "(dynamic)"
        else:
            tok = "(none: read wrapper default)"
        out.append((line_of(text, pos), f"<{name}> token={tok}"))
    return out


def run(check: str, path: str, extra: list[str], tokens: frozenset[str]) -> list[str] | None:
    text = load(path)
    if text is None:
        return None
    if check == "elem":
        hits = check_elem(text, ELEM_TAGS + extra)
    elif check == "unnamed":
        hits = check_unnamed(text, UNNAMED_TAGS + extra)
    elif check == "badtok":
        hits = check_badtok(text, tokens)
    else:
        hits = check_pwtok(text, PW_TAGS + extra)
    return [f"{path}:{n}:{what}" for n, what in hits]


def is_finding(check: str, line: str) -> bool:
    if check != "pwtok":
        return True
    return not re.search(r"token=(?:new-password|current-password)$", line)


def self_test() -> int:
    here = Path(__file__).resolve().parent / "fixtures" / "states"
    ok = True

    def expect(cond: bool, what: str) -> None:
        nonlocal ok
        if not cond:
            ok = False
            print(f"self-test: FAIL {what}")

    for check in ("unnamed", "elem", "badtok", "pwtok"):
        fails = sorted(here.glob(f"{check}-fail-*"))
        passes = sorted(here.glob(f"{check}-pass-*"))
        expect(bool(fails) and bool(passes), f"{check}: need fail and pass fixtures")
        for f in fails:
            rows = run(check, str(f), [], TOKENS) or []
            expect(any(is_finding(check, r) for r in rows), f"{f.name} must be listed")
        for f in passes:
            rows = run(check, str(f), [], TOKENS) or []
            expect(
                not any(is_finding(check, r) for r in rows), f"{f.name} must be clean, got {rows}"
            )

    def rows(check: str, name: str) -> list[str]:
        return [r.split(":", 1)[1] for r in run(check, str(here / name), [], TOKENS) or []]

    expect(
        rows("unnamed", "unnamed-fail-placeholder.vue")
        == ["6:<VInput>", "9:<input>", "13:<SensitiveInput>"],
        f"unnamed placeholder rows {rows('unnamed', 'unnamed-fail-placeholder.vue')}",
    )
    expect(
        rows("unnamed", "unnamed-fail-aria-only.tsx") == ["3:<input> aria-only"], "aria-only row"
    )
    expect(
        rows("elem", "elem-fail-components.vue")
        == ["3:<VInput>", "5:<PasswordInput>", "6:<input>", "10:<VInput>"],
        f"elem rows {rows('elem', 'elem-fail-components.vue')}",
    )
    expect(rows("elem", "elem-fail-spread.tsx") == ["4:<Input>"], "elem spread row")
    expect(
        rows("badtok", "badtok-fail-password.vue")
        == ['2:autocomplete="password"', '3:autocomplete="new-pass"'],
        "badtok rows",
    )
    expect(rows("pwtok", "pwtok-fail-username.vue")[0].endswith("token=username"), "pwtok username")
    expect(len(TOKENS) == 64 and "section-x" not in TOKENS, "token list size")
    with tempfile.TemporaryDirectory() as tmp:  # a formatter-split tag with a brace group inside
        p = Path(tmp) / "x.vue"
        p.write_text('<VInput\n  :rules="{ a: { b: 1 } }"\n  type="email"\n/>\n')
        expect(run("elem", str(p), [], TOKENS) == [f"{p}:1:<VInput>"], "multi-line brace attribute")
    print(f"self-test: {'ok' if ok else 'FAILED'}")
    return 0 if ok else 1


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("check", nargs="?", choices=["unnamed", "elem", "badtok", "pwtok"])
    ap.add_argument("files", nargs="*")
    ap.add_argument(
        "--tag", action="append", default=[], help="extra component tag name (repeatable)"
    )
    ap.add_argument(
        "--tokens", help="file with one autofill token per line, replacing the built-in list"
    )
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.check or not args.files:
        ap.print_usage(sys.stderr)
        return 2
    tokens = TOKENS
    if args.tokens:
        try:
            tokens = frozenset(Path(args.tokens).read_text().split())
        except OSError as exc:
            print(f"form_fields: cannot read {args.tokens}: {exc.strerror}", file=sys.stderr)
            return 2
    found = False
    for path in args.files:
        out = run(args.check, path, args.tag, tokens)
        if out is None:
            return 2
        for line in out:
            print(line)
            found = found or is_finding(args.check, line)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
