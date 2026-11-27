---
title: publint and attw code, rule-name and flag delta, 2026-08-29 to 2026-11-27
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 14
---

# publint and attw delta

This is a delta update. The baseline is 2026-08-29, when attw was 0.18.5 (published 2026-07-09) and problems.ts listed 12 problem kinds. Source files were read from the main branch heads on 2026-11-27.

## Summary

- publint moved from 0.3.24 (2026-08-19, before the window) to 0.3.25 (2026-10-01). 0.3.25 is the only publint release inside the window. Its changes are a `.ctsx` extension fix for `FILE_INVALID_JSX_EXTENSION` and a skipped file-existence check for `browser` values that point at another package. Neither touches a code the rule matches on. Source: [publint CHANGELOG](https://raw.githubusercontent.com/publint/publint/master/packages/publint/CHANGELOG.md), `npm view publint time`.
- attw has no new release. `@arethetypeswrong/cli` is still 0.18.5 (2026-07-09), and `@arethetypeswrong/core` is still 0.18.5. The repo has no commits to the packages since 2026-08-29. Open issues from 2026-11-06 concern the exit code under `--profile`, not rule names. Source: `npm view`, [GitHub commits API](https://api.github.com/repos/arethetypeswrong/arethetypeswrong.github.io/commits?since=2026-08-29T00:00:00Z) (empty list).
- problems.ts still lists exactly 12 problem kinds, unchanged from the baseline.
- attw core bundles its own `typescript` at the exact version `5.6.1-rc`, as a regular dependency, not a peer. It has no tsgo path. It is therefore unaffected by a repo using TypeScript 7 (latest on npm is 7.0.2).
- Every claim at risk is unchanged. The one open question, whether publint inspects the tarball mode bit, is answered no.

## Findings

### 1. Per-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| TS-PKG-04 `EXPORTS_TYPES_SHOULD_BE_FIRST` | unchanged | Still emitted in [core.js](https://raw.githubusercontent.com/publint/publint/master/packages/publint/src/shared/core.js) (line 1034) and listed on [publint.dev/rules](https://publint.dev/rules). |
| TS-PKG-04 `EXPORTS_DEFAULT_SHOULD_BE_LAST` | unchanged | Still emitted in core.js (line 1062). For `imports` the code is `IMPORTS_DEFAULT_SHOULD_BE_LAST`, which the rule does not match on. |
| TS-PKG-05 `BIN_FILE_NOT_EXECUTABLE` | unchanged, shebang only | The check at core.js line 1386 fires only when `!startsWithShebang(binContent)`. core.js has no mode, stat or executable-bit read anywhere. The message text says "It should start with a shebang" ([message.js](https://raw.githubusercontent.com/publint/publint/master/packages/publint/src/shared/message.js)). Decision: publint does not inspect the tarball mode bit as of 0.3.25. The rule's two-half framing (shebang gated by publint, mode bit checked with `ls -l`) stays correct. |
| TS-PKG-08 `EXPORTS_MISSING_ROOT_ENTRYPOINT` | unchanged in name and trigger, one new trigger path | Still a warning, fires when `main` or `module` exists, `exports` exists and has no `"."` key. New since the baseline era: when `files` is absent and internal files are found, it also sets `hasRootExports = false`, so the warning can appear alongside `USE_FILES`. The warning requires `main` or `module`, so a bin-only package with neither field is not flagged at all. |
| TS-PKG-15 `USE_FILES` | unchanged in name, broader detection | 0.3.22 recognized more internal files and 0.3.23 (2026-08-04) detects nested test files recursively and reports `args.internalFilePaths`. Both predate the window. Suggestion severity, fires when `files` is absent and internal paths are packed. |
| TS-PKG-10 `USE_ENGINES_NODE` "only checks presence" | unchanged | core.js line 194 fires when `engines.node == null`. It never examines the value. Added in 0.3.20 (2026-05-08, before the baseline), suggestion type. The message text adds "(This may be a breaking change)". |
| TS-PKG-06 `cjs-resolves-to-esm` | unchanged | [problemUtils.ts](https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/src/problemUtils.ts) maps `CJSResolvesToESM` to `cjs-resolves-to-esm`. |
| TS-PKG-06 `--ignore-rules` | unchanged | [cli index.ts](https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/src/index.ts) line 86: `--ignore-rules <rules...>`, choices are the problemFlags values, default `[]`. |
| TS-PKG-06 `NoResolution`, `InternalResolutionError` | unchanged | Both present in [problems.ts](https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/core/src/problems.ts). The CLI flag names are `no-resolution` and `internal-resolution-error`. |
| `publint run <tarball>` | unchanged | [cli.js](https://raw.githubusercontent.com/publint/publint/master/packages/publint/src/cli.js) line 25: `run [path]`, "Lint a directory or tarball file path". `publint deps` is marked deprecated, which the rule does not use. |

### 2. Problem-kind count

problems.ts on main lists 12 kinds: NoResolution, UntypedResolution, FalseCJS, FalseESM, NamedExports, CJSResolvesToESM, FallbackCondition, CJSOnlyExportsDefault, FalseExportDefault, MissingExportEquals, UnexpectedModuleSyntax, InternalResolutionError. Count unchanged from the baseline. The CLI `problemFlags` map has the same 12 entries.

### 3. attw and TypeScript 7

`@arethetypeswrong/core@0.18.5` depends on `"typescript": "5.6.1-rc"` (exact pin, regular dependency, `npm view @arethetypeswrong/core dependencies`). The CLI depends only on core. So attw installs its own TS 5.6 and does not read the repo's TypeScript. Issue [#254](https://github.com/arethetypeswrong/arethetypeswrong.github.io/issues/254) (maintainer comment 2026-06-22) states that the pin exists because many internal TypeScript APIs are used, that they are "not working on TypeScript 6.x anymore", and that "moving to 7.x isn't quite possible yet and will be a bigger rewrite". Changelog 0.18.3 uses `@typescript/native-preview` only for attw's own local build and type check, not for analysis. Verdict: attw runs on a TS 7 repo because it bundles TS 5.6.1-rc, with no tsgo analysis path; the cost is that its module-resolution emulation is frozen at TS 5.6 semantics. Risk to watch: a hoisting package manager (the issue's bun case) may dedupe or fail on the exact pin when the repo uses a different TypeScript.

If attw were unusable on a TS 7 repo, TS-PKG-06 should say: run attw from an isolated install (`npx --yes @arethetypeswrong/cli@0.18.5`, not as a repo devDependency alongside TS 7) and keep the single `cjs-resolves-to-esm` ignore. This is a contingency only. Nothing found today requires it.

### 4. Exit-code caveat, new in the window

Issue [#284](https://github.com/arethetypeswrong/arethetypeswrong.github.io/issues) (2026-11-06) reports that `--profile` is ignored by the exit code for kinds without `resolutionKind` (InternalResolutionError, FalseCJS, and others), with a fix PR open. It does not rename any flag. It does mean an `InternalResolutionError` may fail the build under profiles that should hide it. Treat as "evolving", not a rule change.

## Normative guidance candidates

1. Keep TS-PKG-04, 05, 06, 08, 10, 15 and the `publint run <tarball>` form as written. Rationale: every code and flag verified unchanged. Verification: grep core.js for each code name and the CLI index.ts for `--ignore-rules`.
2. Optional wording tweak for TS-PKG-05: add that publint 0.3.25 checks the shebang only and never the mode bit, so `ls -l` stays mandatory. Rationale: the research left this open and it is now decided. Verification: grep core.js for `BIN_FILE_NOT_EXECUTABLE` and confirm the guard is `startsWithShebang`.
3. Optional addition to TS-PKG-06: pin attw to an exact version in CI (currently 0.18.5) because its bundled TS is frozen at 5.6.1-rc. Rationale: avoids surprises from the exit-code fix in #284 changing results. Verification: grep CI for `@arethetypeswrong/cli@` with a full version.
4. Optional note for TS-PKG-08: the warning needs `main` or `module` to fire, so the suppression is only needed when one of them exists. Verification: read the publint ignore list against `jq '.main,.module,.exports' package.json`.

## AI-agent angle

- An LLM may claim attw cannot run with TypeScript 7 or must be given a tsgo path. Wrong: it bundles TS 5.6.1-rc. Check: `npm view @arethetypeswrong/core dependencies.typescript`.
- An LLM may assume publint verifies the executable mode. It checks the shebang only. Check: `ls -l` on the built bin.
- An LLM may write `--ignore-rules CJSResolvesToESM` (the kind name). The flag value is the kebab-case `cjs-resolves-to-esm`. Check: `attw --help` choices list.

## Contested / evolving

- attw's move off its pinned TS is unscheduled; the maintainer calls TS 7 support a bigger rewrite (2026-06-22). Trend: stagnant, last release 2026-07-09.
- attw exit-code behavior under `--profile` is under active fix as of 2026-11-06.
- publint keeps adding suggestions (`USE_ENGINES_NODE`, `sideEffects`). Suggestions do not fail `publint run` by default level, so verify the CI `--level` before relying on them as gates.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/publint/publint/master/packages/publint/CHANGELOG.md | publint changelog | to 2026-10-01 | release deltas |
| https://raw.githubusercontent.com/publint/publint/master/packages/publint/src/shared/core.js | rule logic | main, 2026-11-27 | codes, bin check |
| https://raw.githubusercontent.com/publint/publint/master/packages/publint/src/shared/message.js | message texts | main | shebang wording |
| https://raw.githubusercontent.com/publint/publint/master/packages/publint/src/cli.js | CLI | main | `run [path]` |
| https://publint.dev/rules | rules page | 2026-11-27 | code listing |
| https://api.github.com/repos/publint/publint/releases | release list | 2026-10-01 | dates |
| https://api.github.com/repos/publint/publint/commits?since=2026-08-29T00:00:00Z | commits | window | confirms only 0.3.25 |
| https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/core/src/problems.ts | problem kinds | main | count 12 |
| https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/src/problemUtils.ts | flag names | main | kebab names |
| https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/src/index.ts | CLI options | main | `--ignore-rules` |
| https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/CHANGELOG.md | CLI changelog | to 0.18.5 | no new release |
| https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/core/CHANGELOG.md | core changelog | to 0.18.5 | no new release |
| https://github.com/arethetypeswrong/arethetypeswrong.github.io/issues/254 | TS pin discussion | 2026-06-22 | TS 7 stance |
| npm registry (`npm view publint`, `@arethetypeswrong/cli`, `core`, `typescript dist-tags`) | versions, deps | 2026-11-27 | pins, TS 7.0.2 latest |

Primary count: all 14 are primary. Limits: the publint.dev rules page was matched by code name only, not read in full; GitHub release-note pages were read through the API listing and changelogs, not the web UI.
