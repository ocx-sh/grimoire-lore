---
title: python-quality spillover check
target: python-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/astral-sh/uv/releases/tag/0.13.10
---

# Spillover check for python-quality

## Item 1 (from python-packaging): pin an explicit uv version in CI

Item: "python-quality (ci-gate.md): pin an explicit uv version in CI, because uv 0.13.10 (2026-11-24) tightened `uv lock --check`/`--locked` validation, so a lock that passed on 0.12.x can fail after a uv upgrade."

Verdict: confirmed by primary source (the factual premise). The pin recommendation itself is a judgement, not a sourced fact.

Evidence: the uv 0.13.10 release page, https://github.com/astral-sh/uv/releases/tag/0.13.10, states release date 2026-11-24. It says uv now validates that dependency requirements in `uv.lock` match the locked package versions, explains why a lockfile needs updating when `--locked` rejects it, and reports dependencies whose package entries are missing from `uv.lock`. The originating pair's evidence is in `.agents/research/refresh-2026-11/python-packaging/uv-cli-and-uv-build.md` (section 2, "PY-PKG-05") and `recent-packaging-shifts.md` (item 3), which also say that source flagged "CI should pin or note the uv version". The exit code of `--check` on a stale lock was not measured there.

Affected text in the target: the target says nothing about pinning the uv version in CI. `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/python-quality-reference/ci-gate.md` has PY-GATE-04, which pins tools through the project pin and never `$PATH`: "Tools resolve through the project pin, never through `$PATH`." It names linters and does not cover uv itself. `/home/mherwig/dev/ocx-sh/grimoire-lore/rules/python-quality.md` mentions `uv.lock` only as a packaging topic ("and `uv.lock`."). No text covers the uv version used by CI.

Smallest change to make the target true on 2026-11-27: none is required for correctness, because nothing in the target is false. If the owner wants the point stated, add one sentence to PY-GATE-04's rationale in ci-gate.md: "The same holds for uv itself: CI pins an explicit uv version, because uv 0.13.10 (2026-11-24) validates `uv.lock` more strictly under `--locked` and `--check`, so a lock that passed on 0.12.x can fail after an unpinned upgrade." That is an optional addition, not a correction.
