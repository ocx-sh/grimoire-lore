---
title: Spillover check for python-packaging
target: python-packaging
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://pypi.org/pypi/pytest-timeout/json
  - https://pypi.org/pypi/httpx/json
  - https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md
  - https://www.helpnetsecurity.com/2026/11/19/microsoft-agent-framework-package-pypi-compromised/
  - local evidence under .agents/research/refresh-2026-11/python-quality/ and python-quality.md
---

Target files: rules/python-packaging.md and skills/python-packaging-reference/ (SKILL.md, checks/context.awk). Neither names httpx, pytest-timeout, ruff's default Python version, or any install-versus-credential job split.

## 1. Cap httpx below 1 in bot dependency specs

Verdict: could not confirm as a rule need; the facts are real but only partly confirmed by a primary source. The PyPI JSON shows httpx latest is 0.29.0 (uploaded 2026-11-26) and no 1.0 final in the visible portion, but the page was truncated, so absence of 1.0 releases was not fully verified. The claim that 1.0.devN removes `Timeout`, `follow_redirects`, `raise_for_status`, `HTTPError` and `AsyncClient` rests on the originating pair's own inspection of the dev6 wheel (python-quality/httpx-urllib3-behaviour-delta.md), which I did not repeat. The originating note itself calls this a watch item, not a rule change, and the cap is aimed at http.md greps of the python-quality pair.

Affected text in target: none. rules/python-packaging.md has no sentence about httpx or dependency upper bounds for libraries; the closest is PY-PKG-03, which concerns only `requires-python`.

Smallest change: none for python-packaging. If the owner wants it, it belongs in python-quality's http rule, not here.

## 2. pytest-timeout 2.5.0 is yanked; hold 2.4.0

Verdict: confirmed by primary source. PyPI JSON for pytest-timeout: info.version 2.4.0 (uploaded 2025-05-05); 2.5.0 uploaded 2026-08-16, yanked true, reason "accidental breaking change (probably)". URL: https://pypi.org/pypi/pytest-timeout/json.

Affected text in target: none. The target never mentions pytest-timeout or pinning test tools; PY-PKG-07 only says "Development-only tooling lives in PEP 735 `[dependency-groups]`". A yank is already handled by any lock that resolves, because resolvers skip yanked releases unless pinned.

Smallest change: none needed in python-packaging. The claim belongs to python-quality PY-TEST rules (testing).

## 3. PY-GATE-10 candidate: no dependency install in a job holding id-token: write or secrets

Verdict: only secondary source. Help Net Security (trade press, https://www.helpnetsecurity.com/2026/11/19/microsoft-agent-framework-package-pypi-compromised/, article dated 2026-11-19) states `agent-framework` 1.26.1 and 1.26.2 carried a `.pth` hook, published 2026-11-17, with 1.26.2 adding requests for GitHub Actions OIDC tokens. It cites no PyPI or GitHub advisory or CVE, and says StepSecurity found only attempts, with no confirmation that tokens were issued, so "OIDC token theft" overstates it. No primary advisory was found.

Affected text in target: PY-PKG-10 in rules/python-packaging.md: "Publishing authenticates through Trusted Publishing (OIDC), never a long-lived token in a repository secret". It says nothing about separating dependency installation from the job holding `id-token: write`. Its checks only grep for `UV_PUBLISH_(TOKEN|PASSWORD)`.

Smallest change: if the owner accepts a trade-press source, add one clause to PY-PKG-10: the job that holds `id-token: write` builds and uploads only (no dependency install; build in a prior job and pass the artifact). Otherwise leave as is. The originating pair declined the candidate for this refresh and left it as an owner decision.

## 4. ruff 0.17.0 defaults to py311 when neither target-version nor requires-python is set

Verdict: confirmed by primary source. Ruff CHANGELOG, 0.17.0 dated 2026-10-09: "Ruff now defaults to Python 3.11 instead of 3.10 when no Python version is configured through" target-version or requires-python (sentence truncated by the fetch; the full wording is quoted in python-quality/ruff-rule-surface-delta.md). URL: https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md.

Affected text in target: rules/python-packaging.md "Where Tool Config Lives": "`[tool.ruff]` belongs in `pyproject.toml` wherever a `pyproject.toml` exists". The target does not state ruff's default Python, and every packaged project declares `requires-python` (PY-PKG-01), so the new default does not change any statement. Target is already correct.

Smallest change: none required. Optional: nothing.
