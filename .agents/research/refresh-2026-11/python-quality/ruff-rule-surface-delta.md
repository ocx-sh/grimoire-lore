---
title: Ruff rule-surface delta, 2026-08-23 to 2026-11-27
pair: python-quality
date_researched: 2026-11-27
window_start: 2026-08-23
model: sonnet
sources_fetched: 13
---

# Ruff rule-surface delta

Scope: ruff releases 0.16.3 (2026-08-13, baseline measured 0.16.1/0.16.3) through 0.17.6 (2026-11-19). Delta update, not a re-creation. Method: the changelog files and the per-rule and settings pages were opened with WebFetch. The fetch tool returns summaries, so quotes are short fragments; no claim rests on a search snippet. Where a doc page is silent about stability, that silence is not proof of stable status, and the verdict says so.

## Summary

- Ruff 0.17.0 (2026-10-09) is the only release in the window that changes defaults: default Python is now 3.11 (was 3.10), several DTZ rules left the default set, F406 joined it.
- Three rules were stabilized in 0.17.0: TID254, TID255, RUF071. None is a rule this pair names. No rule the pair relies on moved from preview to stable.
- `--preview` is still load-bearing for B909, PLW1514, DOC201 and DOC502: their rule pages still say "The `--preview` flag is required for use."
- PY-MODEL-05 ("DTZ is not in ruff's default selection") is wrong against current docs: the default-rules page lists DTZ002, DTZ003, DTZ004.
- PY-PROC-01: ruff 0.16.6 made PLW1514 and ASYNC230 recognise `builtins.open`; a verification that depends on that spelling being missed must change.
- 0.16.3 extended S602, S603, S607, S609 to check keyword arguments.
- New preview rule `tarfile-ignore-zeros-true` (0.17.4) is a tarfile hardening check; it is not one of bandit B325/B614/B615.
- 0.16.5 added category selectors and rules without codes; 0.17.5 added `ASYNC401` (preview).

## Verdicts per claim

| File / ID | Claim | Verdict | Note |
|---|---|---|---|
| data-modelling PY-MODEL-07 | B909 preview-only, silently absent without `--preview` | unchanged (preview status); silence not re-tested | [B909 page](https://docs.astral.sh/ruff/rules/loop-iterator-mutation/): "Preview (since v0.3.7)", "The `--preview` flag is required for use." No B909 entry in any changelog 0.16.3-0.17.6. The "silently absent, no warning" behaviour is not documented on the page: could not determine without running ruff. |
| PY-MODEL-03 | PLW1641 is stable | could not determine from docs | [Page](https://docs.astral.sh/ruff/rules/eq-without-hash/) carries no preview banner (added 0.12.0, category pedantic) but also states no stability. Absence of a banner plus no changelog entry in the window means no change; the original measurement stands. |
| PY-MODEL-04 | UP042 inert below py311; inferred from requires-python | unchanged, with a new default | [Settings](https://docs.astral.sh/ruff/settings/): `target-version` default is now `"py311"`; `target-version` takes precedence over `requires-python`. Effect: with nothing configured, UP042 is no longer inert. UP042 page (added 0.15.0) names no version threshold; the py311 gate is not documented there. Changelog 0.17.0: "Ruff now defaults to Python 3.11 instead of 3.10 when no Python version is configured through target-version or requires-python." Replacement wording: "UP042 is inert below `target-version = "py311"`. Since ruff 0.17.0 an unconfigured project defaults to py311, so UP042 is active there; set `requires-python` or `target-version` explicitly." |
| PY-MODEL-05 | DTZ not in default selection | changed | [Default rules](https://docs.astral.sh/ruff/default-rules/) lists DTZ002, DTZ003, DTZ004 as default. [0.17.0](https://github.com/astral-sh/ruff/blob/main/CHANGELOG.md): "Several of the flake8-datetimez rules (DTZ001, DTZ005, DTZ006, DTZ007, DTZ011, DTZ012, and DTZ901) are no longer enabled by default" (2026-10-09). The DTZ001/005/006/007/011/012/901 set was default before and is not now. Replacement: "Only DTZ002, DTZ003 and DTZ004 are in ruff's default selection (0.17.0); select `DTZ` explicitly to get the rest." Whether the original sentence was already wrong at 0.16.1 cannot be established from these sources. |
| processes PY-PROC-01 | `--preview` load-bearing: PLW1514 inert without it | unchanged | [PLW1514 page](https://docs.astral.sh/ruff/rules/unspecified-encoding/): "in preview, since v0.1.1 ... `--preview` flag is required". Addendum: 0.16.6 (2026-09-03) "Recognize `builtins.open` (`ASYNC230`, `PLW1514`)". |
| PY-PROC-01 | Rule covers files only, never subprocess | unchanged | Page says "`open` and related calls", examples use `open(...)`; no subprocess mention. The page does not name the related calls, so the "never subprocess" half rests on the earlier measurement. |
| PY-PROC-07 | PLW1510 fires on omitted `check=`, never missing `timeout=`; no ruff/bandit rule checks timeout | unchanged | [PLW1510 page](https://docs.astral.sh/ruff/rules/subprocess-run-without-check/): checks "uses of `subprocess.run` without an explicit `check` argument", no timeout. No timeout rule in any changelog 0.16.3-0.17.6 (the S113 note in 0.17.3 is a docs clarification about httpx request timeouts, not subprocess). The "verified against 0.16.1" tag should become "re-checked against 0.17.6 docs; behaviour not re-run". |
| PY-PROC-04 | S605 covers os.system/os.popen; S602/S604 cover shell=True | unchanged | [S605 page](https://docs.astral.sh/ruff/rules/start-process-with-a-shell/) names `os.system`, `popen`. S602/S604 page not re-fetched: could not determine beyond no changelog entry. 0.16.3: "Also check keyword arguments (S602, S603, S607, S609)" widens detection but does not change coverage claims. |
| api-surface PY-SURF-08 | `--preview` required for DOC; "Selection `DOC` has no effect" | unchanged for status; message text could not determine | [DOC502](https://docs.astral.sh/ruff/rules/docstring-extraneous-exception/) (since 0.5.5) and [DOC201](https://docs.astral.sh/ruff/rules/docstring-missing-returns/) (since 0.5.6) both still "unstable and in preview". Pages do not quote the warning text. |
| PY-SURF-08 | DOC502/DOC201 false positives | unchanged | Both pages still list the same exemptions (abstract methods, stub bodies; DOC201 also functions returning only None). Docs-only; behaviour not re-run. |
| observability PY-OBS-03 | G family recognises logger, log, LOG, LOGGER, _logger, not _log/_LOG | could not determine | Settings page `logger-objects` text was not in the portion read. Changelog window touches only G004 (0.17.4 fix hardening, 0.17.5 "Mark G004 fix as unsafe"). No entry on logger-name recognition. Treat as unchanged but unverified. |
| PY-OBS-01 | LOG002 only `__file__`/`__cached__` | unchanged | [LOG002 page](https://docs.astral.sh/ruff/rules/invalid-get-logger-argument/): "any usage of `__cached__` and `__file__` as an argument to `logging.getLogger()`". |
| security PY-SEC-01 | S202 sees zipfile `.extractall()` only when tarfile imported | could not determine | [S202 page](https://docs.astral.sh/ruff/rules/tarfile-unsafe-members/) describes `tarfile.extractall` only; says nothing about zipfile or an import dependency. The quirk is an implementation behaviour that docs neither confirm nor deny. No changelog entry. |
| PY-SEC-07 | B325, B614, B615 never ported | unchanged | No ruff rule with those bandit equivalents appeared. Nearest new rule: preview `tarfile-ignore-zeros-true` ([page](https://docs.astral.sh/ruff/rules/tarfile-ignore-zeros-true/), preview since 0.17.4, security); page states no bandit equivalent and no numeric code. |
| single-file-tools PY-SOLO-05 | EXE001/EXE002 not enforced on Windows or WSL | unchanged | [EXE001 page](https://docs.astral.sh/ruff/rules/shebang-not-executable/): only available on Unix-like systems, not enforced on Windows or WSL. EXE002 page not fetched; no changelog entry. |
| async PY-ASYNC-08 | ASYNC115 trio/anyio only | unchanged | [ASYNC115](https://docs.astral.sh/ruff/rules/async-zero-sleep/) flags `trio.sleep(0)` and `anyio.sleep(0)`; asyncio not mentioned. No changelog entry. Note ASYNC115 is in the default set. |
| PY-ASYNC-01 | Blocking families ASYNC210/212/220/221/222/230/240/250/251 | unchanged list, behaviour extended | 0.16.5 "Detect blocking generic HTTP requests (ASYNC210)"; 0.16.6 "Recognize builtins.open (ASYNC230, PLW1514)" and ASYNC240 documented under thread offloading. New 0.17.5 preview `ASYNC401` (`pytest-raises-exception-group`) is not a blocking family. Default set contains ASYNC100/105/115/116/210/220/221/222/230/251 only. |
| testing PY-TEST-05 | raises-extend-require-match-for needs fully qualified names; bare name silently matches nothing | could not determine | [Settings](https://docs.astral.sh/ruff/settings/): option text is "List of additional exception names that require a match= parameter"; example `requests.RequestException`; globs accepted. Docs do not state the fully-qualified requirement or the silent failure. |
| rules/python-quality PY-CORE-05 | unsafe fixes turn `assert False` into `raise AssertionError` | could not determine | No changelog entry. Separate 0.17.0 change: the default `full` output now shows unsafe fixes; applying them still needs explicit opt-in. Existing wording about applying stays correct; add that they are now displayed by default. |
| PY-CORE-03 / typing.md | No ruff setting closes TC vs get_type_hints gap | could not determine | Not found in settings read. Window adds TC010 fix (0.17.6, preview) and lazy-import preference for TC001-TC003 on Python 3.15 (0.16.8). Neither is a setting. |
| ci-gate PY-GATE-08 | PGH003/PGH004 deny bare `# type: ignore`/`# noqa` | unchanged | [PGH003](https://docs.astral.sh/ruff/rules/blanket-type-ignore/) (restriction) and [PGH004](https://docs.astral.sh/ruff/rules/blanket-noqa/) (pedantic) both exist with the described behaviour. Both are in default family PGH only partially: default-rules page lists the PGH family but not which codes; do not claim they are default. |

## Promotions from preview to stable in the window

Only 0.17.0: `lazy-import-mismatch` (TID254), `lazy-import-immediately-resolved` (TID255), `os-path-commonprefix` (RUF071). The pair names none of them, so `--preview` stays load-bearing for B909, PLW1514, DOC201, DOC502 exactly as written.

## New rules that could mechanize current hand or grep checks (all preview unless noted)

1. `tarfile-ignore-zeros-true` (0.17.4): flags `tarfile` opened with `ignore_zeros=True`. Candidate for PY-SEC-07 wording; verify with `ruff check --preview --select <name>`; no stable code is given.
2. `ASYNC401` (0.17.5, `pytest-raises-exception-group`): pytest/async test hygiene; relevant to PY-TEST/PY-ASYNC. Verify on a fixture with `pytest.raises` around a TaskGroup.
3. New unnamed-code rules `unnecessary-regular-expression-compile` (0.17.2) and `shared-clock-mock` (0.17.3): no pair claim depends on them; do not add without a use case.
4. 0.16.5 "Allow rules without codes" means preview rules may lack a code: a verification that greps for `[A-Z]+[0-9]+` in ruff output must also accept a rule name.
5. 0.16.5 "Introduce category selectors": selectors by category exist now; the docs list categories on each rule page (pedantic, suspicious, restriction, style, security). Untested whether `--select` by category should replace prefix lists. Verification: `ruff check --select` with a category per the 0.16.x migration guide, not run here.

## Normative guidance candidates

1. State "default Python is 3.11 when neither `target-version` nor `requires-python` is set (ruff 0.17.0)" next to UP042. Rationale: a bare script directory now sees UP042 and other py311 upgrades. Verify: `ruff check --select UP042 --show-settings | grep target`.
2. Replace PY-MODEL-05 with the DTZ002/003/004-only wording above. Verify: `ruff check --show-settings | grep -i DTZ`, or read the [default rules page](https://docs.astral.sh/ruff/default-rules/).
3. Keep `--preview` in the PY-PROC-01, PY-MODEL-07, PY-SURF-08 verifications. Verify per rule: `ruff rule <code>` should show the preview banner.
4. PY-PROC-01: drop any reliance on `builtins.open` being missed by PLW1514/ASYNC230 (changed in 0.16.6).
5. Date-stamp every "verified against 0.16.1" as superseded by "docs re-read at 0.17.6, behaviour not re-run".

## AI-agent angle

An agent trained before 0.17 will assume default py310, DTZ off, and `--select ALL` semantics from older docs; the smallest check is `ruff check --show-settings`. An agent will also assume a stabilized rule list from memory; the check is `ruff rule <code>`.

## Contested / evolving

Ruff moved to category selectors and codeless rules in 0.16.5-0.17.5; selector spelling in rule files may need a later pass. As of 2026-11-27 the 0.17.x line is current (0.17.6).

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md | main changelog, 0.17.x | to 2026-11-19 | primary, defaults |
| https://raw.githubusercontent.com/astral-sh/ruff/main/changelogs/0.16.x.md | 0.16.x changelog | to 2026-10-01 | primary |
| https://docs.astral.sh/ruff/default-rules/ | default rule set | current | primary |
| https://docs.astral.sh/ruff/settings/ | settings reference | current | primary (partial read) |
| https://docs.astral.sh/ruff/rules/loop-iterator-mutation/ | B909 | current | primary |
| https://docs.astral.sh/ruff/rules/eq-without-hash/ | PLW1641 | current | primary |
| https://docs.astral.sh/ruff/rules/replace-str-enum/ | UP042 | current | primary |
| https://docs.astral.sh/ruff/rules/unspecified-encoding/ | PLW1514 | current | primary |
| https://docs.astral.sh/ruff/rules/subprocess-run-without-check/ | PLW1510 | current | primary |
| https://docs.astral.sh/ruff/rules/start-process-with-a-shell/ | S605 | current | primary |
| https://docs.astral.sh/ruff/rules/docstring-extraneous-exception/ | DOC502 | current | primary |
| https://docs.astral.sh/ruff/rules/docstring-missing-returns/ | DOC201 | current | primary |
| https://docs.astral.sh/ruff/rules/invalid-get-logger-argument/ | LOG002 | current | primary |
| https://docs.astral.sh/ruff/rules/tarfile-unsafe-members/ | S202 | current | primary |
| https://docs.astral.sh/ruff/rules/shebang-not-executable/ | EXE001 | current | primary |
| https://docs.astral.sh/ruff/rules/async-zero-sleep/ | ASYNC115 | current | primary |
| https://docs.astral.sh/ruff/rules/blanket-type-ignore/ | PGH003 | current | primary |
| https://docs.astral.sh/ruff/rules/blanket-noqa/ | PGH004 | current | primary |
| https://docs.astral.sh/ruff/rules/tarfile-ignore-zeros-true/ | new preview rule | 0.17.4 | primary |

Limits: the fetch tool summarizes pages, so exact changelog line text for 0.16.x comes from summaries; S602/S604, EXE002, `logger-objects`, `raises-extend-require-match-for` fully-qualified text and the "inferring the Python version" section were not read. Section count: 19 distinct URLs listed, though `sources_fetched` counts 13 distinct fetch goals.
