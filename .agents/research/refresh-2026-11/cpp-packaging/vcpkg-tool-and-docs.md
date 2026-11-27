---
title: vcpkg-tool releases and vcpkg docs delta, 2026-09-26 to 2026-11-27
pair: cpp-packaging
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 9
---

# vcpkg-tool and vcpkg docs delta

## Summary

- One vcpkg-tool tag landed in the window: `2026-10-29` (published 2026-10-29T23:42:49Z). No other tag exists after `2026-09-26`.
- Nothing in the release affects a claim in the pair. Artifacts were NOT removed, `x-gha` still only warns, and no lockfile, dependency provider or CPS work landed.
- The only docs edits in the window to the commissioned pages are three small ones (binary caching nuget.config note, ZIP compression settings, and a GitHub Actions pinning change elsewhere). None touches a claim at risk.
- Recommended gate pin: `vcpkg-tool 2026-10-29`. Measured claims must be re-run on it before the pin moves; the source diff predicts they are unchanged.

## Tags in the window

| Tag | Published | Pre-release |
|---|---|---|
| `2026-10-29` | 2026-10-29T23:42:49Z | no |

Source: Releases API, https://api.github.com/repos/microsoft/vcpkg-tool/releases (baseline `2026-09-26` published 2026-09-26T06:19:05Z).

Release notes for `2026-10-29` (https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29), in full scope:
- x-update-baseline: fix host/target choosing different versions in the diff ([#2151](https://github.com/microsoft/vcpkg-tool/pull/2151)).
- `Test-Json -FetchExternalReference` in tests ([#2164](https://github.com/microsoft/vcpkg-tool/pull/2164)).
- Fix `x-package-info` always exiting with failure ([#2167](https://github.com/microsoft/vcpkg-tool/pull/2167)).
- Add JSON output to `depend-info` ([#2168](https://github.com/microsoft/vcpkg-tool/pull/2168), [#2173](https://github.com/microsoft/vcpkg-tool/pull/2173)).
- copy_file skip_existing no longer opens the source exclusively ([#2165](https://github.com/microsoft/vcpkg-tool/pull/2165)).
- Dependency bumps and vcpkg-scripts SHA 2026-10-28 plus curl decompressors enabled ([#2171](https://github.com/microsoft/vcpkg-tool/pull/2171)).

I also diffed the source: `git diff 2026-09-26 2026-10-29` in a shallow clone of https://github.com/microsoft/vcpkg-tool. Behavioural changes are limited to `src/vcpkg/commands.update-baseline.cpp`, `commands.depend-info.cpp`, `commands.package-info.cpp`, `base/files.cpp`, `base/downloads.cpp`. Neither `src/vcpkg/binarycaching.cpp` nor `src/vcpkg/configuration.cpp` is touched.

## Verdicts per claim

| Claim | Verdict | Evidence |
|---|---|---|
| Gate "vcpkg-tool 2026-09-26" | changed (pin is stale) | Newer tag `2026-10-29` exists. Update the gate pin after re-running the measured claims. |
| NN 13: artifacts "announced for removal", never "removed" (as of 2026-09-26) | unchanged; advance date to 2026-10-29 | At tag `2026-10-29`, `vcpkg-artifacts/` still in tree, `registry_config_requests_ce()` in `src/vcpkg/configuration.cpp` still treats `"kind": "artifact"` as a request for artifacts, and message `VcpkgCeIsExperimental` in `locales/messages.json` still reads "vcpkg artifacts will be removed shortly after July 1, 2026." No removal in release notes. |
| NN 4 / CMK-VCPKG-11: no lockfile, no dependency provider, no CPS | unchanged | Grep for lockfile, lock-file, dependency provider at tag: only hits are the pre-existing internal `LockFile` cache of git-registry commits in `src/vcpkg/registries.cpp` (not a user-facing lockfile). No CPS or provider in release notes or docs (docs grep for lockfile, dependency provider, CPS returned nothing). |
| D3 re-check: artifacts removal not executed; `"kind": "artifact"` rejection | unchanged / could not determine rejection | Not executed at `2026-10-29`. Because it is not removed, the registry kind is still accepted, so the "is it then rejected" question stays open until a removal tag exists. |
| CMK-VCPKG-08: provider table marks `x-gha` removed; x-azblob, x-azcopy, x-azcopy-sas, x-gcs, x-aws, x-aws-config, x-cos, x-az-universal "will change or be removed without warning" | unchanged | docs `vcpkg/reference/binarycaching.md` lines 25-33 (clone of MicrosoftDocs/vcpkg-docs, HEAD 2026-11-19): `x-gha` row "Removed: This feature has been removed from vcpkg"; the other eight rows carry "Experimental: will change or be removed without warning". Only change to that file in window: 2026-10-01 "Update binarycaching.md with nuget.config note (#614)". |
| CMK-VCPKG-08: tool "only warns on x-gha and exits 0" | unchanged by source; needs re-run | `src/vcpkg/binarycaching.cpp` ~line 2168 at `2026-10-29`: `else if (segments[0].second == "x-gha") { add_warning(msgGhaBinaryCacheDeprecated ...) }`. Message text: "The 'x-gha' binary caching backend has been removed. Consider using a NuGet-based binary caching provider instead". A warning, not an error. |
| CMK-VCPKG-08: unknown token is a hard error (exit 1) | could not determine from source alone; needs re-run | Not touched by the diff. Re-run on `2026-10-29`. |
| CMK-VCPKG-01: `x-update-baseline` x-prefixed, experimental | unchanged; advance date | `src/vcpkg/commands.update-baseline.cpp` line 367 still registers `"x-update-baseline"`; docs `commands/update-baseline.md` still includes the experimental banner (`[!INCLUDE [experimental]...]`). The command was edited in the window (host/target version fix, #2151), but not renamed. |
| CMK-VCPKG-01: Classic-mode quote | unchanged | docs `vcpkg/commands/update-baseline.md` line 117 and `users/versioning.md` unchanged since 2026-09-21; line 117 still says no configured registries and no `"builtin-baseline"` means Classic mode ignoring all versioning information. |
| CMK-VCPKG-01: `version>=` or `overrides` without baseline "is rejected outright" | could not determine | Docs unchanged; no release note touches it. Behavioural claim, needs a re-run on `2026-10-29`. |
| CMK-VCPKG-09: x-block-origin itself x-prefixed; no surveyed project uses it | unchanged | docs `users/assetcaching.md` lines 56-64 still document `x-block-origin`; file unchanged since 2026-09-21. The survey claim is outside this source's scope. |
| CMK-VCPKG-10: `VCPKG_PREFER_SYSTEM_LIBS` deprecated, warns at configure, no removal date | unchanged for the docs half | `users/buildsystems/cmake-integration.md` line 260: "This feature has been deprecated. Use empty overlay ports instead." No removal date; file unchanged since 2026-09-21. "Warns at configure" is a cmake-script behaviour (vcpkg-scripts, SHA bumped to 2026-10-28 by #2171), not verified here: could not determine. |
| CMK-VCPKG-10: `vcpkg new --application` no longer writes the entry | could not determine | Not in release notes or touched files; the `new` command is not in the diff. |
| CMK-VCPKG-02: overrides and dependency vcpkg-configuration.json ignored transitively; overlay precedence | unchanged | `vcpkg-json.md` and `vcpkg-configuration-json.md` unchanged since 2026-09-21; `configuration.cpp` untouched by the diff. |
| CMK-VCPKG-06: default triplet is the host's since September 2023 | unchanged | Historical; no change in diff or docs in window. |

## Artifacts decision

Artifacts were not removed as of `2026-10-29`. No replacement wording for NN 13 or CMK-VCPKG-10 is needed. The only edit: move the "as of" date from 2026-09-26 to 2026-10-29 (after re-running). Note the announced date (after 2026-07-01) is now four months past with no removal, so the "announced for removal, not executed" wording is the right one; do not hedge it into "removed". Registry-kind behaviour after removal remains unknown (warning vs error, exit code): no source exists to cite.

## Lockfile, provider, CPS

None landed or announced in the tool source, release notes or docs in the window.

## Gate pin and re-runs

Pin the gate at `vcpkg-tool 2026-10-29`. Re-run on that tag before changing the text:
1. `x-gha` in `VCPKG_BINARY_SOURCES` yields a warning and exit 0.
2. An unknown binary source token yields a hard error, exit 1.
3. `version>=` or `overrides` without a baseline is rejected (exit code and message).
4. `vcpkg new --application` omits `VCPKG_PREFER_SYSTEM_LIBS` and configure warns when it is set.
5. `x-update-baseline` still accepts the invocation form used in the rules (the command had a behaviour fix).

## Normative guidance candidates

1. Rule: update the Gate and every "as of 2026-09-26" to `2026-10-29` only after the five re-runs pass. Rationale: avoids dating unmeasured claims. Verification: `grep -rn '2026-09-26' rules/cpp-packaging.md skills/cpp-packaging-reference/` returns nothing afterwards, and each re-run log is cited.
2. Rule: keep NN 13 wording "announced for removal, never removed". Rationale: still true at `2026-10-29` (source: `VcpkgCeIsExperimental` message, `vcpkg-artifacts/` present). Verification: at the next refresh, `git ls-tree <tag> --name-only | grep vcpkg-artifacts` and `grep VcpkgCeIsExperimental locales/messages.json`.
3. Rule: keep NN 4 (no lockfile, provider, CPS). Rationale: no such code at tag. Verification: `grep -rniE 'dependency.provider|cps' src include` shows nothing user-facing; the `LockFile` hit in `registries.cpp` is an internal cache.

## AI-agent angle

Agents recall `x-gha` as a working provider; the tool now warns it is removed. Agents may also read the `LockFile` symbol in vcpkg source as a user lockfile. Check: grep the docs for `lockfile`; it is absent.

## Contested / evolving

Artifacts removal is announced, overdue, and unexecuted; trend: removal in an upcoming tag, date unknown. The `depend-info --format=json` addition and the `x-update-baseline` rework suggest tooling around baselines is still active but still experimental.

## Sources

| URL | What | Date |
|---|---|---|
| https://api.github.com/repos/microsoft/vcpkg-tool/releases | Releases API, tag list | read 2026-11-27 |
| https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29 | Release notes | 2026-10-29 |
| https://github.com/microsoft/vcpkg-tool (tags 2026-09-26, 2026-10-29) | Source diff, `binarycaching.cpp`, `configuration.cpp`, `locales/messages.json`, `commands.update-baseline.cpp`, `registries.cpp` | 2026-10-29 |
| https://github.com/MicrosoftDocs/vcpkg-docs (HEAD 2026-11-19) `vcpkg/reference/binarycaching.md` | provider table | 2026-10-01 last edit |
| same repo `vcpkg/users/assetcaching.md` | x-block-origin | 2026-09-21 |
| same repo `vcpkg/users/versioning.md` | baselines | 2026-09-21 |
| same repo `vcpkg/commands/update-baseline.md` | experimental banner, Classic quote | unchanged |
| same repo `vcpkg/users/buildsystems/cmake-integration.md` | PREFER_SYSTEM_LIBS deprecation | 2026-09-21 |
| same repo `vcpkg/reference/vcpkg-json.md`, `vcpkg-configuration-json.md`, `vcpkg/commands/common-options.md` | unchanged except ZIP settings | 2026-10-01 |

Note: fewer than the usual twelve sources because this is a delta with one tag; the window had little upstream change.
