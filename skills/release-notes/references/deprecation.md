---
title: Deprecations, removal windows and the runtime warning
summary: The MKT-REL rows for deprecating before removing, naming every window in the notes, warning on use, HTTP deprecation headers and closing windows that fall due
---

# Deprecations, removal windows and the runtime warning

Owns how a project announces that something is going away: the `Deprecated:`
trailer and its Migration line, the window before removal, the warning a
deprecated form prints on use, the HTTP headers for a served API, and the
release blocker when a window falls due. The template that renders the trailer
is `notes-template.md` (MKT-REL-05). The format of the warning line on stderr
belongs to the `ux-cli` skill. The licence or pricing notice is MKT-REL-13 in
`SKILL.md`.

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[Rules](#rules) · [Verification details](#verification-details) ·
[What agents get wrong here](#what-agents-get-wrong-here)

## Dates and versions

Read 2026-11-27.

| Fact | Source and date | Re-check | Interval |
|---|---|---|---|
| PEP 387 has the warning name the release in which the incompatibility is expected. Two-year floor | [PEP 387](https://peps.python.org/pep-0387/), page modified 2026-01-15 | Re-read the rules. The project's own window numbers live in its policy file, so upstream drift changes only the proposed default | 24 months |
| Kubernetes requires deprecations to be announced in the release notes and deprecated CLI elements to warn on use. It does not require a removal version in the notice. The default windows below borrow its rules 5a, 5b and its beta row | [Deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/), no date on the page, read 2026-11-27 | Re-read the rules | 24 months |
| SemVer asks for at least one minor release between deprecation and removal | [semver.org](https://semver.org/spec/v2.0.0.html) | Re-read item 7 | 24 months |
| Node.js runtime deprecations warn on use | [nodejs.org](https://nodejs.org/api/deprecations.html) | Re-read | 24 months |
| `Deprecation: @UNIX` header, `Sunset: HTTP-date` header, `Link: rel="deprecation"` | [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html) (March 2025), [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html) (May 2019) | Check the RFC errata or a successor | 36 months |

## Variables

`NAME` is the deprecated spelling, `V` the version being prepared, `GOLDEN` the
contract's golden file, `notes.md` the rendered body, and `CHANGELOG.md` the
changelog. The `jq` expressions below assume a golden file with `retired[]`
entries (`status`, `removal`) and `deprecated` objects (`removal`) on commands
and arguments. Adapt the paths to your contract's schema, and keep the
`removal` and `status` semantics.

## Rules

Severity comes from the consolidated ruleset on 2026-11-27. The window numbers
in MKT-REL-08 wait on an owner decision. They are proposed defaults, never
policy.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-REL-07 | Give every deprecation a `Deprecated:` trailer that names the replacement and the removal version or date, rendered as a `**Migration:**` line under the entry. Link the upgrade-guide anchor when one exists. | "Deprecated" alone tells the reader neither what to do nor when. PEP 387 has the warning name the release of the break. The removal version is PEP 387 plus RFC 8594's `Sunset`, adopted as a project choice. Kubernetes requires the announcement and a warning on use, but no removal version. Tested: `commit.footers \| filter(attribute="token", value="Deprecated")` renders the trailer. | `python3 -I "$CHECKS"/notes_check.py --notes notes.md` prints no MKT-REL-07 line: the `### Deprecated` section has one Migration line per item, and each names `removed in\|after\|on` a version or ISO date. A replacement word alone ("Use 2.0 mode") fails. "use `mytool index sync` instead; --mirror is removed in 0.9 or after 2027-03-01" passes (tested 2026-11-27). Where the contract publishes windows, the MKT-REL-08 contract check also passes on the same section | MUST |
| MKT-REL-08 | Deprecate before removing any surface the project has called stable: at least one release that warns and lists the item under `### Deprecated`, then removal after the window the project's published compatibility policy states. Skip the window only for a security fix, a legal requirement, or a surface labelled experimental, and state the reason in the Migration line. Never invent a window: when no policy exists, ask, and propose pre-1.0 at least 1 release and 90 days, post-1.0 at least 2 minor releases and 12 months for user-facing surfaces, or 1 minor and 6 months for machine and admin surfaces. Where the contract marks a surface Public, the compat gate already forbids removal outside a window, so the remaining work is the announcement. Name every open window the contract publishes under `### Deprecated` in the notes of the release that first ships it, with its old spelling, its replacement and its removal version. | In 26 removal-worded BREAKING entries of one measured set, 0 had an earlier deprecation. One measured project had 14 open windows, all warning on use, and 0 of them were announced where readers look. The defaults borrow Kubernetes rules 5a and 5b and its beta row. SemVer asks at least one minor release. | see block MKT-REL-08 | MUST |
| MKT-REL-09 | Make a deprecated flag, config key or environment variable print one stderr line on use that names the replacement and the removal version. Leave stdout and the exit code unchanged. | The release body reaches readers. The warning reaches the scripts that never read it (Kubernetes rule 6; Node.js runtime deprecations). Measured on a shipped binary: 6 of 14 windows exercised, all passed. | An acceptance test runs the deprecated form and asserts that stderr contains the replacement and the removal version, and that stdout and the exit code match the non-deprecated form. By hand for a shipped binary, see block MKT-REL-09 | MUST |
| MKT-REL-18 | For an HTTP surface the project serves, announce deprecation with `Deprecation: @UNIX`, `Sunset: HTTP-DATE` (Sunset not before Deprecation) and `Link` with `rel="deprecation"`, as well as in the release body. | RFC 9745 and RFC 8594. No measured repository served a versioned HTTP API. | see block MKT-REL-18 | CONSIDER |
| MKT-REL-19 | Close every deprecation window that falls due at the version being prepared, and treat a window still open at or after its removal version as a release blocker. Closing a window means: the spelling is gone from the release's golden contract, or marked `status = "removed"`, and the notes list it under `### Removed` with its replacement. Applies to repositories whose contract publishes windows with a removal version. | All 14 windows of one measured project fell due at one version and none was announced. After the removal release the contract has the retired name exit with a refusal and name its replacement, so users meet the refusal with no notice in the notes. | see block MKT-REL-19. The `### Removed` half is a reading check: each closed spelling appears in that section with its replacement | SHOULD |

## Verification details

MKT-REL-08, per removal-worded `**BREAKING:**` line: `grep -n -F -e "$NAME" CHANGELOG.md`
shows an earlier `### Deprecated` entry, or the Migration line contains
`security`, `legal` or `experimental`. `git log -S"$NAME" --format=%cs` dates the
window. The policy file exists and the README links it.

MKT-REL-08, contract check: list the windows from the golden file (the
MKT-REL-19 `jq` expression without the version filter). Each window needs its old
spelling, its replacement and its removal version inside the `### Deprecated`
section of the notes, which is the text from that heading to the next heading of
level 1 to 3. Search that section only. A whole-file search hits an unrelated
fix that mentions the same word. A window an earlier release introduced is
checked against that release's notes; find it with `git log -S` on the golden.

```sh
# MKT-REL-08: the section; run once per window and per field, 0 is the finding
awk '/^(#|##|###) /{s=($0=="### Deprecated")} s' notes.md | grep -c -F -e "$FIELD"
# MKT-REL-08: windows still listed in the golden contract
jq -c '[.retired[] | select(.status=="window")] + [.. | objects | .deprecated? | objects]' "$GOLDEN"
```

A script that ran this check for each window printed one `not announced:` line
per window (14 of 14) on a measured golden. Its controls passed a complete
section, named the one missing window when a line was removed, and rejected the
same text under `### Changed`. That script is not shipped.

```sh
# MKT-REL-09 by hand, shipped binary: throwaway HOME, no network. OLD_FORM and NEW_FORM are the two invocations
T="$(mktemp -d)"
HOME="$T" mytool $OLD_FORM > old.out 2> old.err; echo "$?" > old.code   # word splitting is intended
HOME="$T" mytool $NEW_FORM > new.out 2> new.err; echo "$?" > new.code
diff old.out new.out && diff old.code new.code   # prints nothing
grep -E -e 'removed in [0-9]' old.err            # must match
test ! -s new.err                                # the replacement form prints nothing on stderr
```

A deprecated environment variable warns only when a running command reads it.
Test it with a command that reads the variable: setting a logging variable and
running `mytool version` printed nothing in the measured case.

```sh
# MKT-REL-18: all three headers appear on the deprecated route
curl -sI "$URL" | grep -i -E -e '^(deprecation|sunset|link):'
```

```sh
# MKT-REL-19: V is the version being prepared. 0 is the pass
jq -r --arg v "$V" 'def ver: (split(".")|map(tonumber)) + [0,0,0] | .[0:3]; [.retired[] | select(.status=="window") | .removal] + [.. | objects | .deprecated? | objects | .removal] | map(select(ver <= ($v|ver))) | length' "$GOLDEN"
```

Measured with jq 1.7 on a golden with 14 open windows due at one version: `0`
for the earlier version and `14` for the due version. A tree at the due version
cannot be checked before its tag exists.

## What agents get wrong here

| Mistake | Caught by |
|---|---|
| Removes a flag in one release with no deprecation | MKT-REL-08 |
| Opens a window in code (a `deprecated` object, a stderr warning) and never names it in the notes | MKT-REL-08 contract check |
| Prepares the release at a window's removal version with the window still open | MKT-REL-19 |
| Writes a window number ("12 months") as if it were policy | MKT-REL-08: the number must trace to the policy file |
| Treats a green compat gate as proof that nothing breaking is unmarked | MKT-REL-02 stays per commit |
| Deprecates in the notes but prints nothing on use, or prints to stdout | MKT-REL-09 |
