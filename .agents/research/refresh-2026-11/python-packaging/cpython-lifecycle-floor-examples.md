---
title: CPython lifecycle events and the version examples in PY-PKG-01 and PY-PKG-02
pair: python-packaging
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 6
---

# CPython lifecycle delta, 2026-08-23 to 2026-11-27

This is a delta against the baseline research dated 2026-08-23 (`.agents/research/python-packaging.md`). Only events inside the window are reported.

## Dated facts

| Event | Happened | Date | Source |
|---|---|---|---|
| CPython 3.10 end of life | Yes | 2026-10-01 | https://devguide.python.org/versions/ lists 3.10 as end-of-life, 2026-10-01 |
| Final 3.10 release | Yes, 3.10.22 | 2026-10-01 | https://www.python.org/downloads/release/python-31022/ says it "is its final release" and the series gets no further security updates; https://peps.python.org/pep-0619/ agrees |
| CPython 3.15.0 final | Yes | 2026-10-09 (matches PEP 790 schedule, rc3 was 2026-10-02) | https://www.python.org/downloads/release/python-3150/ and https://peps.python.org/pep-0790/ |
| Newer 3.15 point release | 3.15.2 supersedes 3.15.0 | by 2026-10-26 | python.org 3.15.0 page; python-build-standalone release 20261026 |
| python-build-standalone drops 3.10 | Yes | last 3.10 build 3.10.22 in tag 20261001; tag 20261013 excludes 3.10; tag 20261020 notes say 3.10 "is no longer included in releases" | https://github.com/astral-sh/python-build-standalone/releases |
| python-build-standalone ships 3.15.0 | Yes | tag 20261009 | same page |

Current statuses per the devguide: 3.11, 3.12, 3.13 security; 3.14 and 3.15 bugfix. 3.9 was already end of life (2025-10-31). Whether `uv python install 3.10` still resolves to an older pinned build was not checked (uv docs not fetched): could not determine.

## Claims at risk

### PY-PKG-01, the historical claim ("two harnesses here declared `>=3.10` while failing collection on it")

Unchanged. It describes past evidence and stays true.

### PY-PKG-01, the verification example (`uv python install 3.10` ... `--python 3.10`)

Changed. Old text: the command uses 3.10 as its worked example. New fact: 3.10 reached end of life on 2026-10-01 (devguide, 2026-10-01), and python-build-standalone stopped including it from 2026-10-13 and 2026-10-20 (releases page). An example that names an interpreter that no longer receives builds or fixes teaches the wrong floor.

Edit needed: yes. The mechanics stay (install the declared floor, collect against it). Only the example version and one rationale sentence change.

Replacement for the verification cell:

> From the project directory: `uv python install 3.11` then `uv run --python 3.11 python -m pytest --collect-only -q .`, substituting the declared floor. A collection error is the violation; clean collection is the pass.

(3.11 is the oldest CPython still receiving security fixes, until 2027-10.)

Replacement rule text, with one added clause for end-of-life floors:

> The declared `requires-python` floor is installed in CI and the suite collects against it — a floor nothing runs is a guess, and two harnesses here declared `>=3.10` while failing collection on it. A floor that names an end-of-life interpreter (3.10 since 2026-10-01) should move to the oldest supported release, because no toolchain will install it for long.

Verification for the new clause: compare each `requires-python` lower bound against the devguide status table at https://devguide.python.org/versions/; a floor whose row says end-of-life is the finding. Severity stays MUST for the collection check; the end-of-life sentence is advisory prose, no new mechanic.

### PY-PKG-02 ("advertising 3.13 while testing only 3.12 ships an untested promise")

Unchanged in substance. 3.12 and 3.13 are both supported releases, so the example is still valid and illustrative. 3.14 is bugfix and 3.15 shipped 2026-10-09, so naming the newest release is optional. Edit needed: no. Optional wording if the owner wants currency: "advertising 3.15 while testing only 3.14 ships an untested promise".

### Corpus context (python-frame.md)

Changed. The `>=3.10` floor (the `<repo>/test/` pytest harnesses) is now end of life as of 2026-10-01. The `>=3.12` floor (`ocx-sdk-python`) is supported until 2028-10. The frame line "Current release at research time: 3.14" is stale: the current feature release is 3.15, with 3.15.2 the latest point release seen. That file is outside this pair and was not edited.

## Normative candidates

1. Verification example 3.10 to 3.11 (above). Rationale: 3.10 end of life 2026-10-01 and no longer built. Verification: `grep -n "python install 3.10" rules/python-packaging.md` returns nothing after the edit.
2. One sentence on end-of-life floors in PY-PKG-01 (above). Rationale: the fleet's binding floor is now end of life. Verification: reading heuristic against the devguide status table.
