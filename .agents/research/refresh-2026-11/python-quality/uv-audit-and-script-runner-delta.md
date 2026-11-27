---
title: uv audit, malware check, script running and pip-audit delta, 2026-08-23 to 2026-11-27
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 14
---

# Verdict

No claim at risk is falsified. `uv audit` and the malware check are still preview as of uv 0.13.10 (2026-11-24). pip-audit has had no release in the window. The uv script runner changed in small ways that do not touch the pair's claims. One standing discrepancy remains between uv's docs and the corpus (item 3), and it is not new.

Newest uv at research time: 0.13.10, released 2026-11-24. Releases in the window run from 0.12.6 (2026-08-25) through 0.12.24 (2026-10-08) and 0.13.0 (2026-10-09) through 0.13.10.

# Per-claim result

## 1. security.md, Security Gate intro: "pip-audit is the advisory source and uv audit is not while it remains in preview"

Unchanged. The uv preview-features page (https://docs.astral.sh/uv/concepts/preview/, fetched 2026-11-27) still lists `audit-command` ("The `uv audit` and `uv tool audit` commands check project and installed-tool dependencies for known vulnerabilities") and `malware-check` among its 56 preview features. The uv changelog (https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md) files both window entries about `uv audit` under "Preview features": 0.13.7 (2026-11-03) "Report aliased OSV records as a single vulnerability in `uv audit`", and 0.13.8 (2026-11-12) "Report quarantined packages in `uv audit` when index URLs differ only in redacted query values". No changelog entry stabilizes either feature. The only stabilizations in the window are `no-distutils-patch` and `tar-codec` in 0.13.0 (2026-10-09).

## 2. security.md PY-SEC-09: "uv audit and UV_MALWARE_CHECK are faster and OSV-backed but explicitly preview, so they do not gate anything yet"

Unchanged in its conclusion. Decision: neither `uv audit` nor `UV_MALWARE_CHECK` left preview. pip-audit stays the gate.

Facts for the record, so the open question can be closed:
- The original blog post (https://astral.sh/blog/uv-audit, dated 2026-06-08) says: "Both of these features are in preview for now. They're considered unstable and there may be breaking changes as we iterate on their design." It gives no stabilization timeline or criteria. It says the malware check is opt-in and Astral will "evaluate enabling them by default in a future release". It also qualifies the speed claim: `pip-audit` with a fully primed cache "can be roughly as fast as `uv audit`". Speed is therefore not a reason to switch, which the corpus already holds.
- Docs wording on the malware check (https://docs.astral.sh/uv/concepts/projects/sync/): "On-sync malware checking is in preview, and is subject to change until stabilized."
- The environment-variable reference (https://docs.astral.sh/uv/reference/environment/) lists `UV_MALWARE_CHECK` and `UV_MALWARE_CHECK_URL`, both added in 0.11.16 (2026-05-21), with no preview note on that page. The settings reference likewise lists `audit.malware-check` (added 0.11.31) and `audit.malware-check-url` without a preview note. The absence of a note on those two reference pages is not stabilization: the preview page and the sync page still say preview. A reader grepping only the env-var page could wrongly conclude it is stable.
- Maturation inside the window that PY-SEC-09 may mention but need not: `uv tool audit` (0.12.2, 2026-08-05, before the window), `--no-default-groups` honoured in `uv audit` (0.12.22, 2026-10-01), a clear error when `uv audit` runs offline (0.12.22), preferred advisory IDs shown in reports, PYSEC then GHSA then CVE (0.12.24, 2026-10-08), aliased OSV records collapsed (0.13.7), quarantined packages reported (0.13.8). Earlier, 0.11.x added JSON output (0.11.15), SARIF output (0.11.22), `--ignore` and `--ignore-until-fixed` (0.11.3). These show an active, still-changing design, consistent with preview.

What PY-SEC-09 should say if it ever flips: not applicable now. Candidate trigger for a future refresh: the uv changelog stating that `audit-command` is stabilized, or the preview-features page dropping `audit-command`. Verification: `curl -s https://docs.astral.sh/uv/concepts/preview/ | grep -c audit-command` returns 0 once stabilized, and `uv audit` run without `--preview` stops printing the preview warning.

## 3. security.md PY-SEC-09 verification: export then `pip-audit -r`, and the editable and `--local` claim

Unchanged, partly undetermined.
- pip-audit: no release in the window. The newest is 2.10.1, dated 2026-06-10 (https://pypi.org/pypi/pip-audit/json and https://github.com/pypa/pip-audit/releases), before the window start. Its changelog (https://raw.githubusercontent.com/pypa/pip-audit/main/CHANGELOG.md) lists nothing newer. The README (https://github.com/pypa/pip-audit/blob/main/README.md) still describes `--skip-editable` as "don't audit packages that are marked as editable" and `--local` as "show only results for dependencies in the local environment", and mentions neither uv nor `--no-emit-project`. Since pip-audit did not change, the claim about direct venv runs cannot have changed on the pip-audit side. I did not rerun that experiment against a uv venv in this delta, so the corpus's own earlier test stands, and a uv-side change affecting it is "could not determine".
- uv export: window entries concern speed and correctness of extras (0.13.3, 0.13.5, 0.13.6), `pylock.toml` handling (0.12.11, 0.12.20, 0.13.2), `--batch` (0.12.14) and `--frozen` without a workspace manifest (0.12.23). None changes the `--no-hashes --no-emit-project --output-file` flags the pair uses. Export of lockfiles for publishing belongs to the python-packaging pair.
- Side fact worth a CONSIDER, not a change: pip-audit 2.9.0 (2025-04-07) added `--locked` auditing of `pylock.*.toml` and `pyproject.toml` project paths. That predates the window, and it is an alternative path (`uv export --format pylock.toml` then `pip-audit --locked`) that the corpus does not use. Not recommended without a test.

## 4. single-file-tools.md: `uv run`, `pipx run`, `hatch run` resolve the PEP 723 floor; ruff and mypy read it; omitting `dependencies` is valid under `uv run`; PY-SOLO-05 shebang

Unchanged for uv. I did not re-fetch pipx, hatch, ruff or mypy behaviour (outside this question's primary sources), so those parts are "could not determine".

uv-side findings:
- Shebang: the uv scripts guide (https://docs.astral.sh/uv/guides/scripts/) still shows `#!/usr/bin/env -S uv run --script` as the executable-script form. PY-SOLO-05 stands. Window-adjacent uv script changes: 0.11.17 (2026-05-28, before window) rejects duplicate script metadata blocks; 0.12.1 ignores malformed PEP 723 scripts during project checks; 0.12.4 gives a specific error for trailing whitespace on the closing `# ///` tag; 0.12.5 resolves relative index paths in scripts against the script directory; 0.12.24 (2026-10-08) "Honor exact managed Python patch pins when creating script environments instead of following patch upgrades"; 0.13.6 (2026-10-26) "Reuse cached or active environments when running PEP 723 scripts without dependencies" and a fix for `uv run --active --script`. None changes floor enforcement.
- Floor enforcement tested locally with uv 0.13.9: a script whose header is only `requires-python = ">=3.10"` ran; with `requires-python = ">=3.99"` `uv run` failed with "error: No interpreter found for Python >=3.99 in virtual environments, managed installations, or search path". So `uv run` still enforces the floor.
- Omitted `dependencies`: the same local test ran a header with no `dependencies` key successfully under uv 0.13.9. This confirms the corpus line. But the scripts guide still says "Note: The `dependencies` field must be provided even if empty." The corpus already calls that secondary claim untrue under testing; that remains correct and it is not a window change. The 0.13.6 entry ("PEP 723 scripts without dependencies") further treats a dependency-free script as a normal case.
- Candidate (optional, SHOULD-level wording only): in single-file-tools.md, name the uv docs sentence explicitly as the source of the discrepancy, with version 0.13.9 as the tested version. Rationale: a reviewer who reads the uv docs will otherwise "fix" the header. Verification: `printf '# /// script\n# requires-python = ">=3.10"\n# ///\nprint(1)\n' > t.py && uv run --no-project t.py` exits 0.

## 5. rules/python-quality.md The Gate: every command runs through `uv run`

Unchanged. No changelog entry in the window alters `uv run` for project commands. `uv run` still discovers projects relative to the script passed to it (0.12.0, 2026-07-28, before the window). `uv check` and `uv metadata` gained `--script` handling in 0.11.22 to 0.11.33; these are not named in the corpus and no corpus claim depends on them.

# Normative candidates

None required. Optional wording for PY-SEC-09: add that the malware check and `audit.malware-check` setting are documented as "in preview, and is subject to change until stabilized" (sync docs), and that the env-var and settings pages carry no preview note, so preview status must be read from the preview page. Rationale: prevents a false "stable" reading. Verification: `curl -s https://docs.astral.sh/uv/concepts/preview/ | grep -E 'audit-command|malware-check'` returns both names.

# Could not determine

- pip-audit behaviour against a uv venv containing the project's own unpublished distribution (not re-run).
- pipx, hatch, ruff and mypy PEP 723 handling in the window (outside this question).
- Exact date `UV_MALWARE_CHECK` first reached docs beyond 0.11.16 (2026-05-21, from the env-var page), and 0.11.20 (2026-06-10) "Add a small section for malware checks" in the docs.
- GitHub release pages were truncated at about 100,000 characters; changelog reads above came from the changelog files, which were read in full for audit and script keywords.

# Sources

- https://raw.githubusercontent.com/astral-sh/uv/main/CHANGELOG.md
- https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.12.x.md
- https://raw.githubusercontent.com/astral-sh/uv/main/changelogs/0.11.x.md
- https://github.com/astral-sh/uv/releases
- https://docs.astral.sh/uv/concepts/preview/
- https://docs.astral.sh/uv/reference/environment/
- https://docs.astral.sh/uv/reference/settings/
- https://docs.astral.sh/uv/concepts/projects/sync/
- https://docs.astral.sh/uv/guides/scripts/
- https://docs.astral.sh/uv/reference/cli/
- https://astral.sh/blog/uv-audit
- https://raw.githubusercontent.com/pypa/pip-audit/main/CHANGELOG.md
- https://github.com/pypa/pip-audit/releases
- https://pypi.org/pypi/pip-audit/json
- https://github.com/pypa/pip-audit/blob/main/README.md
