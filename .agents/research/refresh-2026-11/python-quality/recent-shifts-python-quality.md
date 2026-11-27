---
title: Recent shifts scan for python-quality, 2026-08-23 to 2026-11-27
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 16
---

# Recent shifts scan for python-quality

## Verdict

Two shifts deserve action now, both in the supply-chain and archive areas. Everything else is "watch" or "out of scope". No pinned decision is reversed. The pyright-only assumption survives: ty is still 0.0.x and Astral itself calls it pre-stable, and pyrefly is stable but is not yet a drop-in gate.

This is a scan, not a verification of existing claims; the other briefs cover ruff, pyright, CPython, uv and pip-audit, pytest, CI and hooks, and httpx line by line. Entries about the python-packaging pair (manifests, lockfiles, build backends, publishing, uv cooldown settings as a packaging concern) are left out, except where the CI gate rule itself is touched.

## Contents

1. Ranked shifts
2. Claims at risk, claim by claim
3. Normative candidates
4. Could not determine
5. Sources

## 1. Ranked shifts

| Rank | Shift | Date | Primary source | Touches | Verdict |
|---|---|---|---|---|---|
| 1 | Mass GitHub Actions credential theft ("wfx" campaign): stolen developer credentials push a payload into workflows on the default branch, dump the `secrets` and `vars` objects, delete the run and its logs. At least 1,806 repositories exfiltrated, 61,764 probed. | 2026-11-10 to 2026-11-12 | [Endor Labs](https://www.endorlabs.com/learn/github-actions-supply-chain-attack-targeting-ci-secrets-at-scale) | PY-GATE-05, PY-GATE-06 (neither covers it); new PY-GATE-09 | Adopt now |
| 2 | PyPI package with a `.pth` startup hook stealing CI and cloud credentials: Microsoft `agent-framework` 1.26.1 and 1.26.2 requested GitHub Actions OIDC tokens. The hook runs on any interpreter start, with no import. | 2026-11-17 (reported 2026-11-19) | [Help Net Security](https://www.helpnetsecurity.com/2026/11/19/microsoft-agent-framework-package-pypi-compromised/) | PY-SEC-04 (bounds child environments only, not the installing process); new PY-GATE-10 | Adopt now |
| 3 | tarfile `filter='data'` and `'tar'` are bypassable on every interpreter below the fixed patch level: CVE-2026-11940 (symlink via hard link, published 2026-06-23, before the window but the fix levels matter now) and CVE-2026-82049 (hard link to symlink, published 2026-09-14). The pair's PY-SEC-01 treats `filter='data'` as the fallback guard. | 2026-09-14 | [OSV CVE-2026-82049](https://osv.dev/vulnerability/CVE-2026-82049), [OSV CVE-2026-11940](https://osv.dev/vulnerability/CVE-2026-11940) | PY-SEC-01 (wording change, not a new rule) | Adopt now |
| 4 | `tarfile`, `zipfile` and `gzip` command-line interfaces could execute an extracted script that shadows a stdlib module. CVE-2026-115791. | 2026-11-10 | [oss-security](https://www.openwall.com/lists/oss-security/2026/11/10/30) | PY-SEC-01 (CLI form of extraction); fits a one-line addition | Adopt now (fold into the rank 3 edit) |
| 5 | Astral guidance "Securing Python projects from supply-chain attacks": SHA-pin actions, verify downloaded binaries against SHA-256, zizmor in CI, Trusted Publishing with approval environments, cooldowns. | 2026-11-23 | [Astral](https://astral.sh/blog/securing-from-supply-chain-attacks) | PY-GATE-06 already matches; zizmor is a candidate lint, not yet in the pair | Watch, trigger: the python-quality owner decides whether zizmor joins the gate (it would replace the hand-written greps for PY-GATE-05 and PY-GATE-06 with one tool) |
| 6 | PyPI rejects malformed uploads and limits versions to 128 characters; project pages show security signals. | 2026-10-23, 2026-11-06, 2026-11-18 | [PyPI blog](https://blog.pypi.org/) | Publishing side only | Out of scope (python-packaging) |
| 7 | ty keeps shipping 0.0.x; latest 0.0.112 on 2026-11-26 with breaking rule splits in 0.0.105, 0.0.106 and 0.0.108. Astral's uv-ty post calls the integration "experimental" and says Astral is "continuing toward ty's stable release". `uv check` (needs uv 0.12.3 and ty 0.0.76) runs ty from the lockfile pin. | 2026-10-13, 2026-11-26 | [ty releases](https://github.com/astral-sh/ty/releases), [Astral](https://astral.sh/blog/uv-ty-integration) | rules/python-quality.md and typing.md pyright-only assumption | Watch, trigger: ty tagged 1.0 or Astral states "stable" |
| 8 | Pyrefly 1.5.0 (2026-11-19): `reportPrivateUsage` mapping, basedpyright section migration, `pyrefly init` baseline converter, 40% faster. Stable but still has a different diagnostic set and exit code 4 for version mismatch. | 2026-09-28 to 2026-11-19 | [pyrefly releases](https://github.com/facebook/pyrefly/releases) | Same pyright-only assumption | Watch, trigger: pyrefly documents a parity table against pyright's Standard mode, or the pair's owner wants a second checker |
| 9 | Python 3.15 released: PEP 728 TypedDict `closed=True` and `extra_items=`, PEP 747 `TypeForm`, PEP 800 disjoint bases, PEP 661 `sentinel`, PEP 814 `frozendict`, PEP 810 `lazy import`, `TaskGroup.cancel()`. Fleet `requires-python` floors are 3.12 and 3.13, so none of it is usable without `typing_extensions`, and the SDK is zero-dependency. | 2026-10-09 | [What's New in 3.15](https://docs.python.org/3.15/whatsnew/3.15.html), [Astral 3.15 post](https://astral.sh/blog/python-3.15) | PY-TYP-05 (TypedDict), PY-ASYNC (TaskGroup) | Watch, trigger: the fleet raises a `requires-python` floor to 3.15, or pyright adds support and the zero-dependency SDK may rely on it |
| 10 | Ruff 0.17: target default raises from 3.10 to 3.11; TC001 to TC003 recommend lazy imports on 3.15+. | 2026-10-09 | [Astral 3.15 post](https://astral.sh/blog/python-3.15) | PY-TYP-02 interplay only if the floor is 3.15 | Out of scope for now (the ruff brief covers ruff defaults) |
| 11 | Free-threaded build: no Phase III (default build) decision. PEP 779 still names none; PEP 803 `abi3t` approved March 2026 and shipped in 3.15; macOS official binaries now install free-threading support. | 2026-10-09 | [PEP 779](https://peps.python.org/pep-0779/), [What's New in 3.15](https://docs.python.org/3.15/whatsnew/3.15.html) | PY-TEST-03, async rules | Watch, trigger: a Phase III PEP is filed or the Steering Council accepts one. Today the GIL default keeps PY-TEST-03's four safety arguments valid |
| 12 | Typing discourse: no typing-council decision or accepted spec change found in the window. Open threads include "@override should not introduce new signature compatibility requirements" (2026-11-27), a draft PEP "More Expressive Type Expressions" (2026-09-21), intersections drafts, `TypedMapping for frozendict` (2026-11-25). | 2026-09 to 2026-11 | [typing category](https://discuss.python.org/c/typing/32/l/latest) | PY-TYP-01 to PY-TYP-05, PY-SURF-01: no change | Watch, trigger: a council decision on `@override` or intersections |

## 2. Claims at risk

| Claim | Verdict | Evidence |
|---|---|---|
| PY-TYP-01 to PY-TYP-04 (annotations, future import, quoting, cast) | unchanged | No spec change or council decision found in the typing category listing for the window. The listing shows titles and activity dates only; it does not prove no decision was made inside a thread. |
| PY-TYP-05 TypedDict boundary with `Required`/`NotRequired` | unchanged | PEP 728 `closed=True` exists in 3.15 only; floors are lower. Source: What's New in 3.15. |
| PY-SURF-01 `__all__` and `as` alias re-exports | unchanged | No re-export change surfaced; the pyright brief covers it. |
| "ty is beta and not CI-grade" | unchanged | Latest 0.0.112, breaking rule splits still occurring in November. Wording nuance: Astral says "pre-stable" and "experimental" for the uv integration, not "beta". Docs home page carries no maturity statement. |
| "pyrefly 1.0 in May 2026" | unchanged, advanced | 1.5.0 is now latest. The May 1.0 date was not re-verified; the releases page shows 1.3.2 to 1.5.0 inside the window. |
| PY-TEST-03 safety arguments assume the GIL | unchanged | No default free-threaded build. |
| PY-SEC-01 "`filter='data'` is written at the call site" as the guard when batch extract is unavoidable | changed | Old text: the filter is the replacement guard. New fact: the data and tar filters were bypassed by crafted link members (CVE-2026-11940, fixed 3.12.14, 3.13.15, 3.14.7; CVE-2026-82049, fixed 3.12.15, 3.13.16 per OSV). Source URLs above; upstream dates 2026-06-23 and 2026-09-14. Note: OSV lists the 3.14 fix for CVE-2026-82049 as `3.14.0b1`, which looks inconsistent with a September publication; the exact 3.14 patch level is unconfirmed. |
| PY-SEC-03, PY-SEC-04 credential and environment containment | unchanged, gap | The rules bound what a child process inherits. They say nothing about the installing process itself being hostile (the `.pth` case). |
| PY-GATE-05 and PY-GATE-06 | unchanged, gap | Both remain correct and remain what Astral recommends. Neither covers workflow-file review, `GITHUB_TOKEN` default permissions, or OIDC scoping, which the wfx campaign exploited. Line 137 of ci-gate.md mentions "zero default permissions" in passing only. |
| urllib, email, subprocess CVEs needing a rule | could not determine | No CVE found for subprocess or urllib in the window. 3.15 notes list an email generator change (error on unflattenable non-ASCII addresses) with no CVE attached. A direct read of the python-security-announce list for the window was not completed. |

## 3. Normative candidates

1. **PY-SEC-01 amendment (adopt).** Rule text addition: "`filter='data'` is a defence in depth, not a boundary; it is only as safe as the interpreter patch level (3.12.15, 3.13.16, 3.14.7 or later), so a tool that must call a batch extract on a downloaded archive states the minimum patch level and still rejects link members first." Rationale: two filter bypasses in four months. Verification: grep the changed file for `extractall(` and `extract(`; a hit without a link-member rejection beside it, or without a patch-level comment, is the violation. For CLI use: grep for `python -m tarfile`, `python -m zipfile` and `python -m gzip` run from a directory the archive extracts into; a hit is the violation (CVE-2026-115791, fixed by removing `sys.path[0]`; fixed versions not listed in the announcement).
2. **PY-GATE-09 (new, adopt).** "A workflow that holds a secret or an OIDC grant declares `permissions:` at the top level, defaults `GITHUB_TOKEN` to `contents: read`, and no step expands `toJSON(secrets)` or `toJSON(vars)`." Rationale: the wfx payload passes the whole `secrets` and `vars` objects as JSON. Verification: `grep -rn 'toJSON(secrets)\|toJSON(vars)' .github/workflows` (empty output is the pass, per PY-CORE-08) and `grep -L '^permissions:' .github/workflows/*.yml` (every listed file is the violation). Companion repository settings (code-owner review for `.github/workflows/**`, no direct pushes to the default branch including admins) are the Endor Labs mitigation list; verifying them needs the GitHub API, so label them SHOULD and judged by reading branch protection.
3. **PY-GATE-10 (new, adopt).** "The step that installs dependencies runs in a job that holds no secret and no `id-token: write`; a later job that needs a credential gets it only after the install and uses a lock or hash-verified install." Rationale: a `.pth` file runs at every interpreter start, so the `agent-framework` payload read GitHub Actions OIDC tokens in the install-then-publish job shape. Verification: reading heuristic. For each job that has `id-token: write` or a `secrets.*` reference, the same job must not contain `pip install`, `uv sync`, `uv pip install` or `uvx`; any job that does is the violation. This is a CI shape rule and does not touch lockfile mechanics, which stay with python-packaging.
4. **zizmor (watch, not a rule).** A lint that would replace hand-written greps for PY-GATE-05 and PY-GATE-06. Adopting it changes the gate's tool list, which is the owner's call. Verification if adopted: `zizmor .github/workflows`, exit code non-zero on a finding.

## 4. Could not determine

- Whether a typing-council decision landed inside any open thread in the window; the category page only lists titles and last-activity dates.
- Exact patched release for CVE-2026-82049 on 3.14, and for CVE-2026-115791 on any branch.
- Whether urllib, email or subprocess had a 2026-08-23 to 2026-11-27 CVE. The search found none; the security-announce archive itself was not read.
- The pyrefly 1.0 May 2026 date, not re-fetched.
- Python Discourse Packaging and Core Development categories, and PSF/OpenSSF blogs, were not read; only PyPI blog, Astral blog, typing category, PEP 779 and What's New were opened. The wfx and agent-framework facts come from security vendors and trade press, not from a PyPI or GitHub primary advisory; they are used as the source here because the PyPI blog index showed no incident post for them, and the vendor victim counts disagree between sources (1,806 exfiltrated per Endor Labs, 8,926 in the page's later change log). The rule candidates do not depend on the counts.
- What's New in 3.15 was read to 100,000 of 216,568 characters; the typing, urllib.parse and removed-module sections were not seen.

## 5. Sources

- https://astral.sh/blog (index)
- https://astral.sh/blog/securing-from-supply-chain-attacks
- https://astral.sh/blog/uv-ty-integration
- https://astral.sh/blog/python-3.15
- https://blog.pypi.org/ (index)
- https://github.com/astral-sh/ty/releases
- https://github.com/facebook/pyrefly/releases
- https://peps.python.org/pep-0779/
- https://docs.python.org/3.15/whatsnew/3.15.html
- https://discuss.python.org/c/typing/32/l/latest
- https://osv.dev/vulnerability/CVE-2026-82049
- https://osv.dev/vulnerability/CVE-2026-11940
- https://www.openwall.com/lists/oss-security/2026/11/10/30
- https://www.helpnetsecurity.com/2026/11/19/microsoft-agent-framework-package-pypi-compromised/
- https://www.endorlabs.com/learn/github-actions-supply-chain-attack-targeting-ci-secrets-at-scale
- https://docs.astral.sh/ty/
