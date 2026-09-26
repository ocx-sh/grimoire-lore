---
title: "Package shape and the SDK surface (GO-API): consolidated"
topic: go-api
model: opus
id_family: GO-API
consolidates:
  - go-api/package-and-api-shape.md
  - go-api/sdk-surface.md
  - go-api/sdk-contract.md
cross_family_inputs:
  - go-gates/config-assembly.md
date: 2026-09-26
revised: 2026-09-26
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-api-consolidation/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-api-consolidation/revision/
toolchain: "Go 1.27.1 (GOTOOLCHAIN=local), golangci-lint 2.14.0 (bundled staticcheck 0.8.1), staticcheck 2026.2.1, apidiff/gorelease from golang.org/x/exp v0.0.0-20260908205506-85c1c2202aba"
---

# Package shape and the SDK surface (GO-API)

Owner file: `rules/go-quality/api-design.md` (topic map, section D, M-D-01..20).
Sources: three dives, [shape](go-api/package-and-api-shape.md),
[sdk](go-api/sdk-surface.md) and the wave-4 revision dive
[contract](go-api/sdk-contract.md), plus the audits and the GO-GATE dive
[assembly](go-gates/config-assembly.md) for the overlay config. I re-ran nine
checks to settle the first round's conflicts, on fixtures under
`fixtures/go-api-consolidation/`. Those runs are tagged **[C1]..[C9]**. The
revision re-ran the contract dive's tests and planted five more fixtures under
`fixtures/go-api-consolidation/revision/` (module `goapirev`, `go 1.27`). Those
runs are tagged **[R1]..[R6]**. Both sets are listed in
[Consolidation runs](#consolidation-runs). All commands run through
`/home/mherwig/.cache/research-lang/go-tools/run.sh`.

## Verdict

1. **The OCX Go SDK is one exported package over an `internal/` tree.** It wraps the `ocx` binary and nothing else. It has no OCI-library dependency (M-D-18 stays wrap-only, and GO-MOD-10's stdlib-only graph enforces it). Its surface is typed end to end: one result struct per command, with no `any`/`interface{}` in signatures, exported fields or interface methods. *(SDK)*
2. **The SDK is built with `NewClient(opts ...Option) (*Client, error)` and `type Option func(*options) error` over an unexported struct, from the first tag.** The sdk dive proposed `func(*Client)` with a later "upgrade" to return `error`. `apidiff` reports that change as incompatible [C3], so the error-returning shape is fixed up front. *(SDK; libraries use the GO-API-13 procedure.)*
3. **Library and SDK modules run one lint overlay on top of the GO-GATE baseline.** The overlay adds staticcheck `checks: [all]`, revive `exported`, `gochecknoglobals`, `gochecknoinits`, `ireturn` and `exhaustive`, and it carries **no exclusion preset at all** (`presets: []`). The baseline's `comments` preset silently drops ST1000/ST1020-22 and revive `exported` even when they are enabled [C1]. The shape dive's "watched red" doc-comment runs used no preset, so they did not prove the fleet config works. *Revised:* the overlay text now lives in GO-GATE as the complete file `lib-sdk.golangci.yml`; GO-API cites linter names only (map contradiction 6, [assembly] finding 6). The earlier overlay listed `std-error-handling` and `common-false-positives`, which GO-ERR-09 and GO-SEC-01 forbid, so they are gone (map contradiction 1). *(library, SDK)*
4. **`exhaustive` binds the SDK, not only CLIs.** GO-GATE-18 put it in the CLI overlay alone. The sdk dive saw it fire on the SDK's `ExitCode` switch ([sdk] run 4), so it moves into the library/SDK overlay. *(SDK, CLI)*
5. **`(nil, nil)` is banned on the SDK surface (MUST) and stays SHOULD elsewhere (GO-ERR-12).** `ocx` already has a typed absence (exit 79), so a silent nil adds a second way to say "not found". Outside the SDK, the deliberate nil-means-absent returns in ko and oras-go ([gates] §5) remain allowed. *(SDK)*
6. **Library releases are gated by `gorelease`, never by `apidiff`'s exit code.** `apidiff` exits 0 even on an incompatible change ([shape] run 8, re-confirmed [C3]). `gorelease` blocks only v1+ modules ([shape] run 9). A v0 SDK therefore reads the report by hand: an incompatible change needs a minor bump and a changelog line. The SDK stays v0 while `ocx` is pre-1.0 and tells users to pin an exact version. *(library, SDK)*
7. **The SDK's 100% coverage gate reads a `-coverpkg=./...` profile.** The bare default under-counts the SDK at 25.7% against 65.7% on the same run, because `internal/process` has no test files [C4]. The sdk dive also proposed a named exclusion for the `TestMain` helper-process branch. That exclusion is dropped: `_test.go` files never enter a coverage profile (0 lines [C4]). *(SDK)*
8. **Layout follows go.dev.** No new repository adds `pkg/`. A single binary keeps `main` at the module root. `cmd/<name>/` appears only when there is a second binary, or when the repository is also an importable library. `internal/` is mandatory for the SDK and optional for a single-binary CLI (map conflict 6, imported). *(all)*
9. **Interfaces sit at the consumer, and constructors return concrete types (SHOULD).** Producer-side interfaces are legitimate for a subsystem with several real implementations (map conflict 5). What a reviewer flags is an exported interface with one implementation, or a constructor that returns an interface without a stated reason. *(library, SDK)*
10. **Stored contexts are out of scope here.** GO-CONC-02 (MUST, `containedctx` in the baseline) owns them. The shape dive argued for "SHOULD with a documented reason". That argument is rejected for fleet code; the flagship repos that store contexts are recorded under "violated" below.
11. **The version handshake is settled: lazy, once per `*Client`, cached only on success (GO-API-18, gate clause now MUST).** `NewClient` never probes. Every typed method first calls an unexported gate. The gate runs plain `ocx version`, whose stdout is one bare semver token by contract (`ocx@2691d3c1638e:crates/ocx_cli/src/api/data/version.rs:9-15`), through the SDK's single spawn point with the caller's context. A failed probe and a `*VersionCompatError` are not cached. This mirrors `ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_client.py:676-679,831-857` ([contract] §1, reproduced [R1]). The contract dive's own comparator rejects `0.6.2-rc1` against a floor of `0.6.2`, although the dive claims pre-release tails are ignored [R4]. The rule therefore pins the comparator's behaviour with a table test. *(SDK)*
12. **A signal-killed `ocx` child becomes `*ExitError{Code: 128+n}` at the SDK's spawn point (GO-API-19, new, MUST).** An unchecked `ExitCode()` is −1 in-process and 255 once a CLI forwards it. Both values were watched for SIGTERM and SIGKILL ([contract] §2-3, reproduced [R1]). A `//go:build unix` tag on the classifier file breaks the Windows build instead of protecting it [R5]. **Documented gap:** runtime behaviour was watched on Linux only. macOS rests on the same POSIX `WaitStatus` and vets clean. Windows has no POSIX signal delivery (`Signaled()` is false), and its runtime path is untested. *(SDK)*
13. **The SDK timeout is settled, which closes wave-2 contradiction 12 and wave-3 contradiction 19 (GO-API-20, new, MUST).** The cause passed to `context.WithTimeoutCause` is a `*TimeoutError` whose `Is` targets `ErrOcxTimeout`, never the bare sentinel. GO-CONC-17's example `WithTimeoutCause(ctx, d, ErrOcxTimeout)` is superseded, though its mechanism stands. A bare-sentinel cause passes `errors.Is` and fails only `errors.AsType[*TimeoutError]` [R2], so a test suite that uses only `errors.Is` never catches it. The revision also found a composition bug that neither dive planted. A spawn point that classifies the exit before it looks at its own context reports its own timeout as `*ExitError{Code: 137}`, because `Cmd.Wait` prefers the process error over the context error (`go1.27.1:src/os/exec/exec.go:944-959`) and GO-API-19 then maps the kill to 137 [R3]. GO-IO-10's grep is silent on that shape [R3]. GO-API-20 therefore also fixes the order: check the context's cause first, then classify. *(SDK)*
14. **Overlay noise is measured and closed; the severities stand as written.** On go-cmp, zap, oras-go, go-containerregistry and go-github (tests and `internal/` excluded), [assembly] finding 7 measured weighted rates of `gochecknoglobals` 6.4, `gochecknoinits` 0.4, `ireturn` 14.9 and revive `exported` 3.3 per 10k LOC. A hand-read sample found **zero genuine false positives**: every hit is real debt in code that predates the rule. The overlay's MUST and SHOULD rows are admitted unchanged (map contradiction 22, confirmed). **Documented gap:** revive `exported` and the ST family ignore visibility, so they fire inside `internal/`. That inflated go-cmp's count 16× (193 → 12), and revive has no option to exclude `internal/`. The SDK writes new, documented `internal/` code, so it does not pay this cost. A library that adopts the overlay over a large existing `internal/` tree should measure its own numbers before it adds an exclusion. *(library, SDK)*
15. **Documented gap: interface placement at n=60 was never measured.** The map parked it as residue that does not bear load (`go-topic-map.md`:2419). `ireturn`'s hits in [assembly] are real constructors returning declared interfaces, several of them legitimate subsystem abstractions (e.g. `oras-project/oras-go@cb6d6dc79f83:content/cache/cache.go:53`). GO-API-07 therefore stays SHOULD, with a reasoned `//nolint:ireturn`, and gets no settings-level allowlist.

## The ruleset

Every golangci-lint verification assumes the GO-GATE baseline v2 config (`version: "2"`, golangci-lint pinned to 2.14.0) plus the **library/SDK overlay**. **GO-GATE owns the overlay text** as the complete file `lib-sdk.golangci.yml`. `golangci-lint config verify` on it exits 0 ([assembly] C-1). The first-round runs [C1]-[C8] used an earlier file, `fixtures/go-api-consolidation/sdk-overlay.yml`. Its stale presets filtered only gosec/errcheck text, so no GO-API finding depended on them. GO-API relies on these overlay settings, cited by name:

- **Linters added to the baseline:** `gochecknoglobals`, `gochecknoinits`, `ireturn`, `exhaustive`.
- **`staticcheck.checks: [all]`.** This turns on ST1000, ST1003, ST1016 and ST1020-22, none of which is on by default.
- **`exhaustive.default-signifies-exhaustive: false`.**
- **`revive.rules`: exactly four entries,** `context-as-argument`, `deep-exit`, `time-equal` and `exported`. The list replaces revive's defaults, so it repeats the baseline's three entries (map contradiction 3).
- **`linters.exclusions.presets: []`.** The overlay carries no preset (map contradiction 1).

A CLI (`package main` plus `internal/`) takes the overlay minus `gochecknoglobals` (cobra command vars) if it wants. GO-API-04 still binds its non-main packages at SHOULD.

**Grep checks run the other way round.** Output means a finding: grep exits 0 when it finds something and 1 when the tree is clean.

### Caught by `go list` / `go doc` scripts (SDK CI)

**GO-API-01 — MUST (SDK). Export exactly one package; put every other package under `internal/`.**
- **Rationale:** a non-`internal` helper package is importable forever. It is the Go analogue of leaking an underscore module past ocx-sdk-python's `__all__` (`ocx-sdk-python/src/ocx_sdk/__init__.py:19-21`). Go's `internal/` is enforced by the compiler ([go.dev/doc/modules/layout](https://go.dev/doc/modules/layout)).
- **Verification:** `n=$(go list ./... | grep -vc '/internal/'); test "$n" -eq 1`, run from the module root. Use `go list`, never `find`: a directory count over-reports by 1-66× on repos with nested modules ([shape] §1).
- **Watched:**
  - Red: **[C6]** `onepkg/violation` (`process/` without `internal/`) gave `exported packages=2`, exit 1.
  - Green: **[C6]** `onepkg/twin`, exit 0; [sdk] run 1, count 1.
- **Floor:** none.

**GO-API-02 — MUST (SDK). Keep `any` and `interface{}` off the exported surface: signatures, exported struct fields and interface methods. Decode each command into its own exported result struct with `encoding/json`, never into `map[string]any` or `json.RawMessage`.**
- **Rationale:** this is the Go equivalent of ocx-sdk-python's 100% typed surface ([cfg] §3). `json.Unmarshal` already ignores unknown keys, so an untyped map buys no forward compatibility (`ocx-sdk-python/src/ocx_sdk/_results.py:8-10`).
- **Verification:**
  ```sh
  go doc -all . | grep -E '^(func |type |var |const |	)' | grep -vE '^	+//' | grep -E '\bany\b|interface\{\}'
  ```
  The bracket holds a literal tab. The check reads declaration lines and tab-indented field and method lines, and skips comment lines and 4-space-indented prose.
- **Watched:**
  - Red: **[C2]** `anysurface/violation` → `Data any`, `Raw map[string]interface{}` and `Do(x any) error`, exit 0 (finding).
  - Green: **[C2]** `anysurface/twin` (whose prose says "any input"), exit 1.
  - The dive's regex `'^(func|type|var|const) .*(\bany\b|interface\{\})'` exits 1 on the violation, so it **misses all three** (conflict 4).
- **Floor:** go1.18 (`any`).

**GO-API-03 — MUST (SDK). Construct with `NewClient(opts ...Option) (*Client, error)`, where `type Option func(*options) error` closes over an unexported `options` struct, from the first tag. Required inputs are positional parameters. Never pass a `context.Context` through an option (GO-CONC-02).**
- **Rationale:** the SDK's option set grows with every `ocx` global flag. Changing `func(*Client)` to `func(*Client) error` later breaks the API ([C3]: `Option: changed from func(*Client) to func(*Client) error` under "Incompatible changes"). The exemplar shape is `google/go-github@48d0a668cde8:github/github.go:383,569-577`.
- **Verification:** `go doc -short . | grep -E '^type Option func\(\*options\) error'`. An empty match means the shape is wrong.
- **Watched:**
  - Red: **[C3]** `optiontype/v1` (`func(*Client)`), exit 1.
  - Green: **[C3]** `optiontype/v3`, exit 0.
- **Floor:** none.

### Caught by the library/SDK lint overlay

**GO-API-04 — MUST (library, SDK); SHOULD (non-main CLI packages). Give every package a `// Package x …` comment and every exported identifier a doc comment whose first word is its name. Enforce this with the overlay's staticcheck `checks: [all]` and revive `exported`. The overlay carries no exclusion preset (`presets: []`), and in particular never `comments`.**
- **Rationale:** pkg.go.dev is a library's only reference documentation ([go.dev/doc/comment](https://go.dev/doc/comment); "All top-level, exported names should have doc comments", [CodeReviewComments](https://go.dev/wiki/CodeReviewComments#doc-comments)). The `comments` preset drops exactly these findings (`golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:6-50`: `(ST1000|ST1020|ST1021|ST1022)` and revive's `exported … should have comment`).
- **Verification:** `golangci-lint run --config lib-sdk.golangci.yml ./...` (GO-GATE's file).
- **Watched:**
  - **[C1]** `doc/violation` under the fleet baseline: only ST1006 fired, and **no doc finding**.
  - The overlay with the preset kept is still silent on doc comments.
  - The overlay without the preset gives ST1000, ST1020 and revive `exported` ×2, exit 1.
  - `doc/twin`: `0 issues.`, exit 0.
  - [shape] runs 5-6 give the same result without a preset.
  - [assembly] C-10 on GO-GATE's assembled `lib-sdk.golangci.yml`: `apidoc/violation` under the baseline gives `0 issues.`, exit 0 (the silence the overlay exists to remove). Under the overlay it gives revive `exported` and ST1000, exit 1. The twin exits 0.
- **Noise:** the six ST checks over `google/go-github@48d0a668cde8` produced 0 hits. `oras-project/oras-go@cb6d6dc79f83` had 44 ST1000 hits and `google/go-cmp@b133f1f1932e` had 10 [C7]. [assembly] measured revive `exported` at 3.3/10k LOC with no genuine false positive once `internal/` is excluded (Verdict 14).
- **Floor:** go1.19 (doc-comment syntax).

**GO-API-05 — SHOULD. Name identifiers the Go way. Initialisms are all-caps (`URL`, `ID`). Every method on a type uses the same short receiver name, never `self`/`this`. Accessors have no `Get` prefix. Packages are never called `util`/`common`/`base`, and names do not stutter with the package name (`ocxsdk.Client`, not `ocxsdk.OcxClient`).**
- **Rationale:** callers read every exported name qualified by its package, so a mis-cased or stuttering name is permanent API ([Google decisions](https://google.github.io/styleguide/go/decisions)).
- **Verification:** the same overlay run. ST1003 checks initialisms, ST1016 checks receiver consistency and ST1006 (default-on) bans `self`. The `Get` prefix and package-name checks are reading heuristics.
- **Deduplication:** do **not** add revive `var-naming`/`receiver-naming`. They duplicate ST1003 and ST1016+ST1006 hit for hit (**[C1]**: `GetUrl` was reported by both ST1003 and `var-naming`).
- **Watched:**
  - Red: **[C8]** overlay on `doc/violation`: ST1003 `func GetUrl should be GetURL`, ST1016, ST1006, exit 1.
  - Green: `doc/twin`, exit 0.
  - Nothing flagged the `Get` prefix itself.
- **Noise:** 150 of oras-go's 152 ST1003 hits are in `_test.go` files, and all of them are real (`os_1`, `tagSchemaUrl`) [C7]. Outside tests and `internal/`, [assembly] measured ST1003 at 0.1/10k LOC.

**GO-API-06 — MUST (SDK); SHOULD (library). No mutable package-level variables and no `init()`. Put state in the `Client` or pass it as a parameter.**
- **Rationale:** Google's litmus test: if removing a global would change every caller's test setup, it should not be global ([best practices](https://google.github.io/styleguide/go/best-practices)). The corpus carries 4,875 mutable package vars and 1,040 `init()` ([shape] §4).
- **Verification:** `gochecknoglobals` and `gochecknoinits` in the overlay. `gochecknoglobals` already exempts `Err*` sentinels ([shape] run 4) and `regexp.MustCompile` vars ([C5] twin), so no allowlist is needed.
- **Watched:**
  - Red: **[C5]** `globals/violation` → `defaultExe is a global variable`, `don't use init function`, exit 1. [assembly] C-11 under `lib-sdk.golangci.yml`: `defaultTimeout is a global variable`, exit 1.
  - Green: `globals/twin`, exit 0 (both runs).
- **Noise:** 6.4 (`gochecknoglobals`) and 0.4 (`gochecknoinits`) per 10k LOC on five library exemplars, with zero genuine false positives ([assembly] finding 7). The severities are unchanged.
- **Floor:** none.

**GO-API-07 — SHOULD. Declare interfaces in the package that consumes them. Return concrete types from constructors. An exported interface needs either two or more real implementations or a doc sentence saying why it exists.**
- **Rationale:** a single-implementation interface blocks adding methods (every addition breaks implementers) and hides the concrete API ([CodeReviewComments §Interfaces](https://go.dev/wiki/CodeReviewComments#interfaces)). In a sample of 20, 80% of constructors return concrete types ([shape] §3).
- **Verification:** `ireturn` in the overlay, at its default allow list (`anon, error, empty, stdlib`). A legitimate subsystem constructor gets `//nolint:ireturn // <reason>`. The "one implementation" half is a reading heuristic.
- **Watched:**
  - Red: **[C5]** `NewRunner returns interface (goapicons/globals.Runner)`, exit 1; [shape] run 1 likewise; [assembly] C-11 likewise under `lib-sdk.golangci.yml`.
  - Green: `globals/twin`, exit 0.
- **Noise:** 14.9/10k LOC, all real constructors, some of them legitimate subsystem abstractions ([assembly] finding 7). No allowlist is added (Verdict 15).

**GO-API-08 — MUST (SDK, CLI); SHOULD (other code). Check every `switch` over a typed enum with `exhaustive` at `default-signifies-exhaustive: false`. A `default:` arm does not count as coverage. Enums whose values the package defines start at `iota + 1`, so the zero value means "unset". Externally defined values such as `ExitCode` keep their real numbers.**
- **Rationale:** Go has no closed sum types, so a new `ExitCode` constant is silently unhandled everywhere it is switched on. Starting enums at 1 comes from Uber's "Start Enums at One" ([uber-go/guide](https://raw.githubusercontent.com/uber-go/guide/master/style.md)).
- **Verification:** `exhaustive` in the overlay. This supersedes GO-GATE-18's CLI-only placement.
- **Watched:**
  - Red: [sdk] run 4, removing `case ExitPolicyBlocked:`, gave `missing cases in switch of type ocxsdk.ExitCode`, exit 1. [shape] run 7 also went red with a `default:` present.
  - Green: the full switch, exit 0.

**GO-API-09 — MUST (SDK). No exported SDK method returns `(nil, nil)`, and the SDK never suppresses `nilnil`.**
- **Rationale:** absence is exit 79, which already has a typed `*ExitError` (GO-ERR-20). A second, nil-shaped absence panics on the caller's first dereference.
- **Verification:** `nilnil` (baseline, GO-ERR-12) plus `grep -rnE --include='*.go' 'nolint:[a-z,]*nilnil' .` from the SDK root.
- **Watched:**
  - Red: [sdk] run 5, planted `findLocal`, gave `return both a nil error and an invalid value`, exit 1. **[C9]** the grep matches `//nolint:nilnil`, exit 0.
  - Green: [sdk] run 5 with the function removed, `0 issues.`. **[C9]** twin, exit 1.

### Caught at release: API evolution

**GO-API-10 — MUST (library, SDK). Before tagging, run `go run golang.org/x/exp/cmd/gorelease@<pinned> -base=<previous tag> -version=<proposed tag>`.**
- **v1+ modules:** a non-zero exit blocks the release.
- **v0 modules:** the release procedure reads the `## incompatible changes` section, and any entry forces a minor bump plus a changelog line.
- **Never** gate on `apidiff`'s exit code.
- **State the major-version strategy once in the README.** Either stay unsuffixed forever, as `grpc/grpc-go@acccf8cd101a` does, or accept `/vN` bumps, as `google/go-github@48d0a668cde8` does at `/v92`. The SDK stays at v0 while `ocx` is pre-1.0 and recommends exact pinning, the same policy as ocx-sdk-python's README "Stability" section ([cfg] §3).
- **Rationale:** the model sizes a version bump by diff length, not by API effect ([shape] AI angle). `gorelease`'s own doc comment exempts major version 0 from a non-zero exit ([gorelease.go](https://raw.githubusercontent.com/golang/exp/master/cmd/gorelease/gorelease.go)).
- **Verification:** the `gorelease` command above. For `apidiff`, only `apidiff old new | grep -q '^Incompatible changes:'` is admissible.
- **Watched:**
  - [shape] run 9: v1 with a removed method → `Cannot suggest a release version`, exit 1. v0 with the same removal → exit 0. v1 with no change → exit 0.
  - [shape] run 8 and **[C3]**: `apidiff` exits 0 on an incompatible change.
- **Floor:** none. Pin `x/exp` (the installed build is `v0.0.0-20260908205506-85c1c2202aba`, not the 2022 pseudo-version [shape] cites).

**GO-API-11 — SHOULD. Deprecate your own API with a paragraph that begins exactly `Deprecated: ` and names the replacement with a doc link (`[New]`). Where the replacement is expressible as a call, alias or constant, add `//go:fix inline`. GO-GATE-03's `go fix -diff ./...` then migrates callers.**
- **Rationale:** tooling and pkg.go.dev recognize only the exact prefix ([go.dev/doc/comment](https://go.dev/doc/comment#deprecations)). The inliner moves every caller mechanically ([go.dev/blog/inliner](https://go.dev/blog/inliner)).
- **Verification:**
  ```sh
  grep -rnE --include='*.go' '^\s*//\s*(deprecated|DEPRECATED|Deprecated)\b[^:]|^\s*//\s*(deprecated|DEPRECATED):' .
  ```
  This finds a misspelled prefix. `go fix -diff ./...` exits 1 while a call through an inlinable deprecated function remains.
- **Watched:**
  - Red: **[C9]** `deprecated/violation` → `// deprecated: use New.`, exit 0; [shape] run 3: `go fix -diff` exits 1.
  - Green: **[C9]** twin, exit 1; [shape] run 3: exit 0 after `go fix`.
- **Floor:** go1.26 (`//go:fix inline`).

### Caught by the coverage gate

**GO-API-12 — MUST (SDK). Feed GO-TEST-16's 100% gate the profile from `go test -coverpkg=./... -coverprofile=cover.out ./...`, never the bare per-package default. Exclude no `internal/` package and no `TestMain` branch.**
- **Rationale:** without `-coverpkg`, a package that is tested only through the public package reports 0%. The gate then reads a number that is wrong in either direction.
- **Measured:** on the sdk fixture, the default profile reads `total: 25.7%` with `internal/process` at 0.0%. The `-coverpkg=./...` profile reads 65.7% on the same tests.
- **The dive's proposed exclusion is unnecessary:** 0 lines from `_test.go` appear in either profile **[C4]**, so the helper-process branch is never counted.
- **Verification:** the command above, then `coverage_gate.sh cover.out 100` (GO-TEST-16).
- **Watched:** **[C4]** gate script at threshold 60:
  - default profile: `coverage 25.7% < threshold 60.0%`, exit 1;
  - `-coverpkg` profile: `65.7% >= 60.0%`, exit 0.
- **Floor:** go1.22 (packages without test files appear in the profile).

### Caught by SDK contract tests

These rows have no analyzer: the check is a contract test that ships with the SDK and uses GO-TEST-12's helper-process pattern (the test binary re-execs itself as a fake `ocx`). None of these contracts has a precedent in the corpus. No exemplar gates a wrapped binary's version, calls `WaitStatus.Signaled()` in its own code, or calls `WithTimeoutCause` ([contract] Exemplar evidence). The live counterexample is `cli/cli@9b031151a825:internal/ghcmd/cmd.go:209-210` (GO-CLI-12).

**GO-API-18 — MUST (SDK) for the version gate; SHOULD (SDK) for the error fields. `*ExitError` carries `Stderr string` and `Envelope *ErrorEnvelope` alongside GO-ERR-20's `Code ExitCode`. The SDK exports `TestedOcxVersion`, `MinSupportedOcx` and `*VersionCompatError`, and gates every typed call on the binary's version.**
- **Error fields (SHOULD, unchanged):** the envelope is decoded eagerly. Its decoder returns `nil`, never an error or a panic, on stdout that is not JSON.
- **Version gate (MUST, revised):**
  - `NewClient` never probes.
  - Every typed method first calls one unexported gate. The gate runs plain `ocx version` (never `--format json`) through `internal/process`, the single spawn point (GO-IO-13), with the caller's `ctx` (GO-CONC-01). It trims stdout to the version token.
  - The gate runs at most once per `*Client`: a mutex-guarded flag is set **only on success**. A spawn error, a timeout or a `*VersionCompatError` leaves the flag unset, so the next call probes again.
  - The comparison uses the numeric `MAJOR.MINOR.PATCH` core and ignores a `-pre` or `+build` tail (`0.6.2-rc1` reads as `0.6.2`). A version that does not parse is rejected. A version newer than `TestedOcxVersion` is accepted silently. Only a version older than `MinSupportedOcx` fails.
  - `*VersionCompatError` has the fields `Found string` and `Minimum string` and the message `ocx %s is older than the minimum supported %s`. That is Python's text without the trailing period, following the Go error-string convention.
  - No semver dependency (GO-MOD-10).
- **Rationale:** a caller that never makes a typed call pays no spawn. A cached success must not change mid-session. The shape mirrors `ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_client.py:676-679` (the probe goes through the normal `finish` path, with timeout and retry) and `:831-857` (`gate`/`accept`), plus `_types.py:30-34` and `_errors.py:354-368`.
- **Verification:** a contract test with three cases and one table test:
  - a version below the floor gives `*VersionCompatError` with `Found`/`Minimum` set;
  - a version above the floor gives `nil`;
  - a second call after a cached success does not re-exec, even when the fake now reports a failing version;
  - the comparator table includes `0.6.2-rc1` against `0.6.2` (not less), `0.6.10` against `0.6.2` (not less) and `garbage` (less).
- **Watched:**
  - Red: [contract] §1 `version/violation` (`Do` skips the gate) → `Do() = <nil>, want *VersionCompatError`, exit 1, reproduced **[R1]**. **[R4]** `vercore/violation`, the contract dive's own `versionLess` copied verbatim → `versionLess("0.6.2-rc1", "0.6.2") = true, want false`, exit 1.
  - Green: [contract] §1 `version/fixed`, all three cases PASS, exit 0 [R1]. **[R4]** `vercore/fixed` (cut the tail at `-`/`+`, require three numeric fields), exit 0.
  - **Do not copy the contract fixture's comparator.** Its `strconv.Atoi` turns `2-rc1` into 0, so it rejects every release candidate at the floor [R4].
  - The envelope half is still watched green only ([sdk] run 6), so it stays SHOULD. The exact message is a reading check; no run asserted it.
- **Floor:** none.

**GO-API-19 — MUST (SDK). The SDK's spawn point (`internal/process`) maps a signal-killed `ocx` child to `*ExitError.Code = 128 + int(ws.Signal())` whenever `ee.Sys().(syscall.WaitStatus)` reports `Signaled()`. It never passes on the raw `(*exec.ExitError).ExitCode()`, which is −1 for a signal death, and it never reports success. The classifier file carries no `//go:build` constraint.**
- **Rationale:** `(*os.ProcessState).ExitCode()` "returns … -1 if the process hasn't exited or was terminated by a signal" ([pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode)). The −1 is outside `os.Exit`'s portable range `[0, 125]` ([pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit)), and `wait()` truncates it to 255 once a CLI forwards it. This is GO-CLI-12 applied at the SDK layer, which is a different code path from a CLI's `main`. `syscall.WaitStatus` and its `Signaled`/`Signal` methods exist on every GOOS, so a `unix` tag only removes the classifier from the Windows build.
- **Verification:**
  - A contract test starts a blocking helper child, signals it and asserts `Code == 143` for SIGTERM and `Code == 137` for SIGKILL. It skips on `runtime.GOOS == "windows"`, where `Process.Signal` cannot send SIGTERM.
  - `GOOS=windows go vet ./internal/process/...` must exit 0.
  - `grep -rn --include='*.go' -F '.ExitCode()' internal/process` is only a **locator** for review: the compliant classifier itself reads `ExitCode()` before its `Signaled()` branch [R6].
- **Watched:**
  - Red: [contract] §2 `signal/violation` → `Code = -1, want 143`, `Code = -1, want 137`. [contract] §3 forwarded through `os.Exit` → `255, want 143` and `255, want 137`. Exit 1, all reproduced **[R1]**.
  - Green: `signal/fixed`, exit 0 [R1].
  - Build tag: **[R5]** `signaltag/violation` (`//go:build unix` on the classifier, called from an untagged file) → `GOOS=windows go vet` gives `undefined: Classify`, exit 1. Darwin and linux exit 0. The untagged twin exits 0 on all three GOOS values.
- **Gap:** runtime watched on Linux only (Verdict 12).
- **Floor:** none.

**GO-API-20 — MUST (SDK). The SDK's own timeout is `context.WithTimeoutCause(ctx, d, cause)` where `cause` is a `*TimeoutError` whose `Is` method targets the exported `ErrOcxTimeout`. The cause is never the bare sentinel. After `Wait`, the spawn point checks `context.Cause(ctx)` before classifying the exit (GO-IO-10). If the cause is its own `*TimeoutError`, it fills in `Stderr` and returns that error. Otherwise it classifies (GO-API-19). A caller's own earlier deadline surfaces as the caller's cause, never as `ErrOcxTimeout`.**
- **Rationale:**
  - A typed cause gives `errors.Is` simplicity and `errors.AsType` detail from one event. A bare-sentinel cause gives the first and rules out the second.
  - The cause value is fixed when `WithTimeoutCause` is called, before any stderr exists, so `Stderr` has to be filled in after `Wait`.
  - `Cmd.Wait` returns the `*exec.ExitError` from the kill in preference to the context error (`go1.27.1:src/os/exec/exec.go:944-959`). A spawn point that classifies first therefore reports its own timeout as `*ExitError{137}`, and a caller retries or reports the wrong failure kind (GO-ERR-20).
  - Under `WithTimeoutCause`'s documented rule, the first context to expire sets the cause ([pkg.go.dev/context#WithTimeoutCause](https://pkg.go.dev/context#WithTimeoutCause)).
- **Verification:** one contract test covering four properties plus one real-spawn case:
  - own deadline → `errors.Is(err, ErrOcxTimeout)`;
  - own deadline → `errors.AsType[*TimeoutError]`, with `Stderr` intact;
  - own deadline → `errors.AsType[*ExitError]` is false;
  - a shorter caller deadline gives `errors.Is(err, context.DeadlineExceeded)` and never `ErrOcxTimeout`;
  - a real helper child that writes to stderr and stalls past the SDK deadline yields `*TimeoutError` carrying that stderr, not `*ExitError`.
- **Watched:**
  - [contract] §5 `timeout/violation` (no cause) → `errors.Is … = false` and `AsType[*TimeoutError] = false`, exit 1. `timeout/fixed`, exit 0. Both reproduced **[R1]**. Property 4 passes on both of the dive's fixtures, so it did not tell them apart.
  - **[R2]** `timeoutcause/sentinel` (GO-CONC-17's literal example) → only `errors.AsType[*TimeoutError] = false, want true`, exit 1.
  - **[R2]** `timeoutcause/overcorrect` (maps every `DeadlineExceeded` to `*TimeoutError`) → `errors.Is(err, ErrOcxTimeout) = true, want false: the caller's deadline fired`, exit 1. This plant makes property 4 tell a violation from a twin.
  - **[R2]** `timeoutcause/fixed`, exit 0.
  - **[R3]** `spawnorder/violation` (classify first) → `got *spawnorder.ExitError`, `errors.AsType[*ExitError] = true (Code 137), want false`, exit 1. `spawnorder/fixed`, exit 0. GO-IO-10's grep exits 123 (no hit) on both, because the violation never inspects the context at all.
- **Floor:** go1.21 (`WithTimeoutCause`); go1.26 (`errors.AsType` in the test).

### Reading heuristics

**GO-API-13 — SHOULD (library). Choose the parameter shape with this procedure:**
1. Required inputs are positional parameters.
2. A small, closed, per-call optional set is a config struct whose zero value is the default, like oras-go's `CopyOptions` (`oras-project/oras-go@cb6d6dc79f83:copy.go:51`).
3. A published constructor whose options will grow uses func-typed functional options, `func(*options) error` whenever an option can fail or conflict. go-containerregistry rejects `WithAuth` together with `WithAuthFromKeychain` this way ([dom] §9).
4. Interface-typed options (`grpc/grpc-go@acccf8cd101a:dialoptions.go:102`) are used only when options must be opaque or comparable.
- **Rationale:** map conflict 4, and Google's "option structure" and "variadic options" criteria ([best practices](https://google.github.io/styleguide/go/best-practices)).
- **Measured [C7]:** 112 func-typed option types in the corpus (107 outside tests, [shape] §3), of which 7 return `error` (go-containerregistry 3, ko 3, go-github 1). 39 files declare interface-typed options. An agent that knows only `func(*T)` reproduces the 105/112 majority, including where options conflict.
- **Verification:** reading heuristic. GO-API-03 is the checkable SDK instance.

**GO-API-14 — SHOULD. Return `slices.Clone`/`maps.Clone` of internal slice or map fields, and clone caller-supplied ones before storing them, unless the doc comment says the value is shared and read-only.**
- **Rationale:** aliasing lets a caller corrupt internal state or race with it (Uber "Copy Slices and Maps at Boundaries").
- **Verification:** no analyzer exists. The check is a behavioural test that mutates the returned value and asserts the source is unchanged.
- **Watched:** behavioural only. [shape] run 10 has both tests PASS, each asserting the opposite planted behaviour.
- **Floor:** go1.21.

**GO-API-15 — SHOULD. Do not embed a type in an exported struct unless its promoted method set is documented as your API. In particular, never embed `*exec.ExitError` or any other stdlib error in the SDK's `*ExitError` (GO-ERR-16).**
- **Rationale:** adding a method to an embedded interface, or removing one from an embedded struct, breaks your API ([uber-go/guide](https://raw.githubusercontent.com/uber-go/guide/master/style.md)). An embedded `*exec.ExitError` makes `errors.As(sdkErr, &execErr)` true forever ([sdk] §4).
- **Verification:** reading heuristic for general embedding. For the SDK, a contract test asserts that `errors.As(err, new(*exec.ExitError))` is false. The GO-ERR-20 contract test covers the timeout half.

**GO-API-16 — SHOULD. State concurrency safety in the doc comment of every exported type with mutable state. The SDK's `Client` doc says it is safe for concurrent use.**
- **Rationale:** callers cannot infer it, and silence is not a safe default ([Google best practices](https://google.github.io/styleguide/go/best-practices)).
- **Verification:** reading heuristic.

**GO-API-17 — SHOULD. Never add a top-level `pkg/` to a new repository, and do not churn an existing one. A single-binary module keeps `main` at the root. `cmd/<name>/` holds binaries only when there are two or more, or when the repository is also a library.**
- **Rationale:** `pkg/` does not appear in [go.dev/doc/modules/layout](https://go.dev/doc/modules/layout). 10 of the 11 exemplars that use it state no reason ([shape] §1).
- **Verification:** `test ! -d pkg` at a new repository's root.
- **Watched:**
  - Red: **[C9]** `layout/violation`, exit 1.
  - Green: `layout/twin`, exit 0.

GO-API-18, formerly listed here, moved to [Caught by SDK contract tests](#caught-by-sdk-contract-tests) when its version gate became MUST. Its ID and meaning are unchanged.

**MUST count: 12** (01, 02, 03, 04, 06, 08, 09, 10, 12, 18 (version-gate clause), 19, 20). Every MUST was watched going red and green by a tool run. None rests on a reading heuristic alone.

**Dropped from the map's rows, with reason:**
- **M-D-12 (unkeyed foreign literals).** `go vet` `composites` catches them, and GO-GATE-02 already makes `go vet ./...` a separate step ([shape] run 2 watched it red and green). It is listed under failure modes, not as a rule.
- **M-D-06 (zero value useful).** Folded into GO-API-13 step 2.
- **M-D-19 (`io.Reader`/`fs.FS` parameters).** Common knowledge; the untrusted-name half is GO-IO-02.
- **M-D-17's retry placement.** GO-IO-13 (one spawn point) and GO-ERR-20 (75 only) already fix it. The sdk dive's "one retry loop" grep was never watched red, so it adds nothing.
- **[contract] candidate 5 as a separate row (no build tag, vet on every GOOS).** Folded into GO-API-19. The dive's own vet runs could not go red, because a tagged file is simply not compiled. [R5] supplies the red that matters.

### Consolidation runs

Fixture roots: `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-api-consolidation/` for [C1]-[C9], and its `revision/` subdirectory (module `goapirev`) for [R2]-[R6]. [R1] re-ran `/home/mherwig/.cache/research-lang/go-tools/fixtures/sdk-contract/` read-only.

| Run | Command (from the fixture dir) | Red | Green |
|---|---|---|---|
| C1 | `golangci-lint run --config ../{fleet,api-keep-comments,api}.yml ./...` in `doc/{violation,twin}` | fleet: 1 issue (ST1006 only), exit 1. keep-comments: 4 issues (ST1016, ST1006, revive receiver-naming, var-naming), no doc finding. api (no `comments` preset): 8 issues including ST1000, ST1020, revive `exported` ×2, exit 1. With `checks: [all]`: ST1003 and `var-naming` both report `GetUrl`. | twin: `0 issues.`, exit 0 under all three |
| C2 | `go doc -all . > X.doc.txt`, then the dive's regex and GO-API-02's regex | violation: dive regex exit 1 (miss). Refined regex: 3 hits (`Data any`, `Raw map[string]interface{}`, `Do(x any) error`), exit 0 | twin: both exit 1 |
| C3 | In `optiontype/{v1,v2,v3}`: `apidiff -w ../vN.export goapicons/ocxsdk`, then `apidiff v1.export v2.export`, then `go doc -short . \| grep -E '^type Option func\(\*options\) error'` | `Incompatible changes: - Option: changed from func(*Client) to func(*Client) error`, **exit 0**. v1 shape grep exit 1 | `apidiff v1.export v1.export`: empty, exit 0. v3 shape grep exit 0 |
| C4 | In `sdk-surface/sdk`, profiles written to `coverage/`: `go test -coverprofile=… ./...` and `go test -coverpkg=./... -coverprofile=… ./...`; `grep -c '_test\.go'`; `coverage_gate.sh <profile> 60` | default `total: 25.7%`, gate exit 1 | coverpkg `total: 65.7%`, gate exit 0. `_test.go` lines: 0 in both profiles |
| C5 | `golangci-lint run --config ../cfg.yml ./...` (`gochecknoglobals`, `gochecknoinits`, `ireturn`) in `globals/{violation,twin}` | 3 issues, exit 1 | `0 issues.`, exit 0 (the `Err*` sentinel and the `regexp.MustCompile` var are both present) |
| C6 | `n=$(go list ./... \| grep -vc '/internal/'); test "$n" -eq 1` in `onepkg/{violation,twin}` | n=2, exit 1 | n=1, exit 0 |
| C7 | Read-only in the exemplars: `staticcheck -checks=ST1000,ST1003,ST1016,ST1020,ST1021,ST1022 ./...`; `grep -rE '^type \w*Options?\w* func\('` over the corpus | oras-go: 44 ST1000 (root package `oras` has no package comment, `oras-project/oras-go@cb6d6dc79f83:content.go:16`), 152 ST1003 (150 in tests), 4 ST1020. go-cmp: 10 ST1000, 9 ST1003, 4 ST1016, 2 ST1021. Options: 112 func-typed, 7 return `error` | go-github: 0 hits on all six checks |
| C8 | `golangci-lint config verify --config sdk-overlay.yml`; the overlay on `doc/*` and `globals/*` | doc/violation: 7 issues (revive `exported` ×2, ST1000, ST1020, ST1016, ST1006, ST1003), exit 1. globals/violation: 3 issues, exit 1 | verify exit 0. Both twins `0 issues.`, exit 0 |
| C9 | The `nolint:…nilnil` grep, the deprecated-prefix grep and `test ! -d pkg` on `nolint/*`, `deprecated/*`, `layout/*` | matches, exit 0 / exit 0 / exit 1 | exit 1 / exit 1 / exit 0 |
| R1 | In `sdk-contract/`: `go test -count=1 ./{version,signal,timeout}/{violation,fixed}/...`; `-v` on `signal/violation` | version: `Do() = <nil>, want *VersionCompatError`, exit 1. signal: `Code = -1, want 143`, `Code = -1, want 137`, `forwarded exit status for SIGTERM = 255, want 143`, `… SIGKILL = 255, want 137`, exit 1. timeout: `errors.Is(err, ErrOcxTimeout) = false`, `errors.AsType[*TimeoutError] = false`, exit 1 | all three `fixed/`: `ok`, exit 0 |
| R2 | `go test -count=1 ./timeoutcause/{sentinel,overcorrect,fixed}/` (same four-property test in each) | sentinel: only `errors.AsType[*TimeoutError] = false, want true`, exit 1. overcorrect: `errors.Is(err, ErrOcxTimeout) = true, want false: the caller's deadline fired` and `errors.Is(err, context.DeadlineExceeded) = false, want true`, exit 1 | fixed: `ok`, exit 0 |
| R3 | `go test -count=1 ./spawnorder/{violation,fixed}/` (real helper child: writes `stalling on registry` to stderr, sleeps; SDK deadline 300 ms, `exec.CommandContext`); then GO-IO-10's grep `grep -rl --include='*.go' 'os/exec' spawnorder/X \| xargs -r grep -nE 'errors\.Is\([^)]*context\.(DeadlineExceeded\|Canceled)'` | violation: `got *spawnorder.ExitError`, `errors.AsType[*ExitError] = true (Code 137), want false`, `TimeoutError with the child's stderr: ok=false`, exit 1. GO-IO-10 grep: no output, exit 123 (miss) | fixed: `ok`, exit 0. GO-IO-10 grep: exit 123 |
| R4 | `go test -count=1 ./vercore/{violation,fixed}/` | violation (the contract dive's `versionLess` verbatim): `versionLess("0.6.2-rc1", "0.6.2") = true, want false`, exit 1 | fixed: `ok`, exit 0 |
| R5 | `GOOS={windows,darwin,linux} go vet ./signaltag/{violation,twin}/` | violation, windows: `vet: signaltag/violation/run.go:7:9: undefined: Classify`, exit 1 (darwin, linux: exit 0) | twin: exit 0 on all three |
| R6 | `grep -rn --include='*.go' -F '.ExitCode()' ../../sdk-contract/signal/fixed` | — | compliant twin: `process.go:29: code := exitErr.ExitCode()`, which sits *before* the `Signaled()` branch, exit 0. The dive's "every hit sits inside the `Signaled()` branch" criterion would flag the twin |

Sanity for the revision module: `go vet ./...` exit 0 and `gofmt -l .` empty.

## Applied to the exemplars and the future consumers

**Strict exemplars that already satisfy the rules:**
- **`google/go-github@48d0a668cde8`:**
  - GO-API-03/13: `NewClient(opts ...ClientOptionsFunc) (*Client, error)`, with options returning `error` (`github/github.go:383,569`).
  - GO-API-04/05: 0 hits across the six ST checks [C7].
  - GO-API-10: an explicit `/vN` strategy (`/v92`).
  - One public library package (`github`); its tools and examples are separate modules.
- **`grpc/grpc-go@acccf8cd101a`:** GO-API-10's other strategy (unsuffixed v1 forever) and GO-API-13's interface-typed options (`dialoptions.go:102`).
- **`oras-project/oras-go@cb6d6dc79f83`:** GO-API-13's split. Per-call config structs (`copy.go:51`, `content.go:269`) sit beside one functional-option constructor (`registry/remote/policy/evaluator.go:80`).
- **`google/go-containerregistry@0c8bedb78437`:** consumer-side unexported interfaces (`internal/retry/retry.go:34`) and error-returning conflicting options (GO-API-07/13).
- **`ocx-sdk-python@9713f0a9ff02`** (fleet, not Go): the template for GO-API-18's gate (`_client.py:831-857`).

**Prominent exemplars that violate a rule:**

| Rule | Where | What |
|---|---|---|
| GO-API-04 | `oras-project/oras-go@cb6d6dc79f83:content.go:16` | root package `oras` has no package comment (ST1000). Its golangci config never enables the check [C7] |
| GO-API-04/05 | `google/go-cmp@b133f1f1932e:cmp/internal/flags/flags.go:5` | ST1000, plus 4 ST1016 and 2 ST1021 hits in a Go-team-adjacent library [C7] |
| GO-API-05 | `oras-project/oras-go@cb6d6dc79f83:pack.go:78` | `PackManifestVersion1_1_RC4` (ST1003); `tagSchemaUrl`/`referrersUrl` in tests |
| GO-API-06 | `tailscale/tailscale@6b3a45f14ef6` | 860 mutable package vars and 212 `init()`, e.g. `posture/serialnumber_notmacos.go:68` ([shape] §4) |
| GO-API-07 | `kubernetes-sigs/controller-runtime@d0127f7f66de:pkg/webhook/conversion/conversion_registry.go:40` | `func NewRegistry() Registry` returns an interface ([shape] §6) |
| GO-API-02 (by analogy) | `etcd-io/etcd@7583cc6e7e27:tests/framework/config/client.go:28` | `type ClientOption func(any)`: an exported option over `any` [C7] |
| GO-API-17 | 10 of 11 `pkg/` users, e.g. trivy and oras | `pkg/` with no stated reason; only containerd documents one ([shape] §1) |
| GO-API-19 (by analogy) | `cli/cli@9b031151a825:internal/ghcmd/cmd.go:209-210` | forwards `extError.ExitCode()` unchecked on an embedded `*exec.ExitError`, so a signal-killed extension exits 255 (GO-CLI-12's evidence) |
| GO-CONC-02 (verdict 10) | `etcd-io/etcd@7583cc6e7e27:client/v3/concurrency/session.go:35,120` | stored context, including through a `WithContext` option |

**New commitments for the Go SDK** (none of them exist yet):
- GO-API-01/02/03/12 run as SDK CI script steps, next to GO-MOD-10's `go list -deps` step and GO-GATE-01's block.
- GO-API-04/06/07/08/09 run through GO-GATE's `lib-sdk.golangci.yml`.
- GO-API-10 is a release-procedure step, run with the v0 reading rule.
- GO-API-18 adds `Stderr`/`Envelope` on top of GO-ERR-20's `*ExitError`, plus the lazy version gate and its contract test.
- GO-API-19 and GO-API-20 ship as contract tests in `internal/process`. The signal cases skip on Windows, and `GOOS=windows go vet ./internal/process/...` runs on the Linux leg.
- The package layout is `ocxsdk` plus `internal/process`, the single spawn point of GO-IO-13. The version probe, the timeout cause and the signal mapping all live there.

**New commitments for Go CLIs:**
- GO-API-08 (`exhaustive` on the exit-table switch) and GO-API-17 (layout).
- GO-API-04/05 at SHOULD for their `internal/` packages.
- CLIs do not take GO-API-01/02/03/09/12/18/19/20. A CLI's own exit forwarding is GO-CLI-12.

**The general library adopter** takes the overlay (GO-API-04..08) and GO-API-10.

**Cross-family notes for convergence** (not edits to those files):
- GO-CONC-17's example `WithTimeoutCause(ctx, d, ErrOcxTimeout)` must become the typed `*TimeoutError` cause (GO-API-20). Its mechanism and SHOULD severity stand.
- GO-IO-10's grep finds only `errors.Is(waitErr, context.DeadlineExceeded)`. It is silent on a spawn point that never checks its context [R3]. In the SDK, GO-API-20's real-spawn contract case is what catches that shape.

## AI-agent failure modes

Items 1-11 are ranked by how often each bites; items 12-16 (the SDK contract, added in the revision) are ranked among themselves. Everything below except item 10 is SDK- or library-facing.

1. **Assuming "staticcheck is on" means doc comments are checked.** The ST10xx doc family is non-default, and golangci's `comments` preset silences it even when enabled [C1]. *Check:* GO-API-04's overlay; any preset in the overlay's `presets:` is the finding.
2. **`map[string]any`/`json.RawMessage` results "to stay forward-compatible".** *Check:* GO-API-02's `go doc` grep. The dive's own declaration-only grep missed struct fields [C2].
3. **`type Option func(*Client)` copied from the canonical posts, with a plan to add `error` later.** Adding it later is a breaking change [C3]. *Check:* GO-API-03's `go doc -short` grep; `gorelease` at release.
4. **An interface "for testability" in front of every dependency, returned from the constructor.** *Check:* `ireturn` (GO-API-07).
5. **A package-level `var defaultX`/`init()` to avoid threading a dependency.** *Check:* `gochecknoglobals`/`gochecknoinits` (GO-API-06).
6. **Trusting `go test -cover`'s printed percentage as the SDK number,** or adding a coverage exclusion for `TestMain`, which is never counted anyway. *Check:* GO-API-12's `-coverpkg` profile [C4].
7. **Sizing a version bump by diff length, and reading `apidiff`'s exit 0 as "compatible".** *Check:* `gorelease` (GO-API-10).
8. **A `default:` arm treated as exhaustive, or `(nil, nil)` for "not found" (Python/JS `None`/`null` habits).** *Check:* `exhaustive` (GO-API-08), `nilnil` plus the `nolint` grep (GO-API-09).
9. **Returning an internal slice from a getter; embedding a helper or `*exec.ExitError` to "get the methods".** *Check:* behavioural tests (GO-API-14) and the `errors.As` contract test (GO-API-15).
10. **Adding `pkg/` or `cmd/<only-binary>/` "because that's the standard layout"; `// deprecated:` in lower case with no `//go:fix inline`.** *Check:* `test ! -d pkg`, the deprecated-prefix grep, `go fix -diff` (GO-API-11/17).
11. **`libpkg.Point{1, 2}` copied from a README.** *Check:* `go vet` `composites`, already a separate step under GO-GATE-02.
12. **`return &ExitError{Code: ee.ExitCode()}` with no `Signaled()` branch.** It compiles, vets clean and passes every test that does not use a signal. *Check:* GO-API-19's SIGTERM/SIGKILL contract test [R1].
13. **Classifying the exit before checking the context, so the SDK's own timeout comes back as exit 137.** *Check:* GO-API-20's real-spawn case [R3]. GO-IO-10's grep does not see this shape.
14. **Copying GO-CONC-17's `WithTimeoutCause(ctx, d, ErrOcxTimeout)` literally.** `errors.Is` still passes, so a test suite that uses only `errors.Is` stays green. *Check:* the `errors.AsType[*TimeoutError]` property [R2].
15. **A hand-rolled `strconv.Atoi` version split that rejects every `-rc` build, or a semver dependency for a three-field compare.** *Check:* GO-API-18's comparator table [R4]; GO-MOD-10.
16. **Putting `//go:build unix` on the spawn-point file "to be safe on Windows".** *Check:* `GOOS=windows go vet ./internal/process/...` [R5].

## Open questions

**Owner decisions** (the program applies the default):
- **SDK import path and package name.** Default: module `github.com/ocx-sh/ocx-sdk-go`, package `ocxsdk`. GO-API-05's stutter rule then names types `ocxsdk.Client`, never `ocxsdk.OcxClient`.
- **Envelope decoding: eager (`*ExitError.Envelope` field) or lazy (a free `ErrorEnvelope(err)` like Python).** Default: eager (GO-API-18). Its cost on hot non-zero-exit paths was not measured ([sdk] Contested); the map deferred it (`go-topic-map.md`:2245).
- **Should the library/SDK overlay become the fleet baseline for every non-`main` package, CLIs included?** Default: no. CLIs opt in, because `gochecknoglobals` conflicts with cobra's package-level command vars, and that noise was not measured.
- **Should the SDK export an eager version check (e.g. `(*Client).CheckVersion(ctx) error`) for fail-fast callers?** Default: no, until a consumer asks. Today a caller forces the check with any cheap typed call ([contract] Contested).

**Subareas that deserve another research round:**
- **`api/windows-kill-path`.** Question: on a `windows-latest` leg (owner Q6), does an `ocx` child killed by the SDK's own deadline (`Process.Kill` → `TerminateProcess`) reach GO-API-20's `*TimeoutError` branch? And what `ExitCode()` does a child killed by something other than the SDK report there? GO-API-19's signal cases skip on Windows, so this path has no watched run.

## Sub-artifacts

- [go-api/package-and-api-shape.md](go-api/package-and-api-shape.md): layout, interface placement, the options procedure, global state, doc-comment and naming checks, `//go:fix inline`, `apidiff`/`gorelease` exit behaviour, composites, embedding, enums. 10 planted runs.
- [go-api/sdk-surface.md](go-api/sdk-surface.md): the OCX Go SDK's layout, constructor, typed results, `*ExitError`/`*TimeoutError` shapes, `exhaustive`/`nilnil` on the SDK, retry placement, default vs `-coverpkg` coverage, wrap-only, and the SDK CI list. 10 planted runs on a working SDK skeleton.
- [go-api/sdk-contract.md](go-api/sdk-contract.md): the lazy version handshake, the signal exit path at the SDK spawn point (−1 in-process, 255 forwarded), and the typed timeout cause. 3 planted contract pairs plus cross-GOOS vet. Corrected here on the comparator [R4], the `.ExitCode()` grep criterion [R6], message parity, and the undiscriminating property 4 [R2].

## Key sources

- [go.dev/doc/modules/layout](https://go.dev/doc/modules/layout): `internal/` and `cmd/` placement; `pkg/` absent.
- [go.dev/doc/comment](https://go.dev/doc/comment): doc-comment grammar, the `Deprecated: ` prefix, doc links.
- [go.dev/wiki/CodeReviewComments](https://go.dev/wiki/CodeReviewComments): interfaces, receivers, doc comments, package names, error strings.
- [google.github.io/styleguide/go/decisions](https://google.github.io/styleguide/go/decisions): naming, `Get` prefix, consumer-side interfaces.
- [google.github.io/styleguide/go/best-practices](https://google.github.io/styleguide/go/best-practices): option structure vs variadic options; the global-state litmus test.
- [go.dev/blog/inliner](https://go.dev/blog/inliner): `//go:fix inline` (Go 1.26).
- [uber-go/guide style.md](https://raw.githubusercontent.com/uber-go/guide/master/style.md): copy at boundaries, avoid embedding, enums at one, mutable globals.
- [Cheney, functional options](https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis) and [Pike, self-referential functions](https://commandcenter.blogspot.com/2014/01/self-referential-functions-and-design.html): the options canon.
- [gorelease source](https://raw.githubusercontent.com/golang/exp/master/cmd/gorelease/gorelease.go): v0 vs v1+ exit semantics.
- [nishanths/exhaustive](https://github.com/nishanths/exhaustive): `default-signifies-exhaustive`.
- [Antonboom/nilnil](https://github.com/Antonboom/nilnil): `checked-types`.
- [mgechev/revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md): `exported`, and the duplicate naming rules; `exported` has no `internal/` exclusion.
- [golang-standards/project-layout#117](https://github.com/golang-standards/project-layout/issues/117): the "standard layout" disclaims official status.
- [pkg.go.dev/context#WithTimeoutCause](https://pkg.go.dev/context#WithTimeoutCause): the SDK timeout cause (go1.21) and the rule that the first context to expire sets the cause.
- [pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode) and [pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit): −1 on signal death; portable range `[0, 125]`.
- [pkg.go.dev/errors#AsType](https://pkg.go.dev/errors#AsType): the go1.26 generic assertion the contract tests use.
- `go1.27.1:src/os/exec/exec.go:944-959`: `Cmd.Wait` prefers the process error over the context error.
- `ocx@2691d3c1638e:crates/ocx_cli/src/api/data/version.rs:9-15`: `ocx version`'s plain output is one bare semver token.
- `ocx-sdk-python@9713f0a9ff02:src/ocx_sdk/_client.py:676-679,831-857`, `_types.py:30-34`, `_errors.py:354-368`: the probe, gate and accept template, and the version-error text.
- [go-gates/config-assembly.md](go-gates/config-assembly.md): the assembled `lib-sdk.golangci.yml`, the overlay-noise census, and the `internal/` blind spot.

## Conflicts resolved

| # | Conflict | Resolution and reason |
|---|---|---|
| 1 | [sdk] §2: `Option func(*Client)` "upgrades to `func(*Client) error` without breaking the constructor's signature" | **False.** `apidiff` lists it under Incompatible changes [C3]. GO-API-03 fixes `func(*options) error` from the first tag. |
| 2 | [shape] rule 9 watched ST1000/ST1020 and revive `exported` red with no exclusion preset; the GO-GATE baseline keeps `presets: [comments, …]` | **The preset silences them** [C1], matching `golangci/golangci-lint@032d962e0399:pkg/result/processors/exclusion_presets.go:6-50`. The library/SDK overlay carries no preset (GO-API-04; revised by #17). |
| 3 | [shape] rule 18 enables revive `var-naming`/`receiver-naming` beside ST1003/ST1016 | **Duplicates** [C1]: same line, same finding. Keep staticcheck `checks: [all]` plus revive `exported` only (GO-API-05). |
| 4 | [sdk] candidate 10 claims its `go doc` grep covers struct-field lines; its regex anchors on `func\|type\|var\|const` only | **Misses fields and interface methods** [C2]. GO-API-02 uses the tab-line-aware grep. |
| 5 | [sdk] §9: the `TestMain` helper branch needs a named exclusion from the 100% gate | **Unnecessary.** `_test.go` never enters a profile (0 lines [C4]). Only `-coverpkg` matters (GO-API-12). This also answers go-testing's open "testing/coverage-scope" round. |
| 6 | GO-GATE-18 puts `exhaustive` in the CLI overlay only; [sdk] decision 3 measured it on the SDK | **SDK takes it too** (GO-API-08), via the library/SDK overlay. |
| 7 | GO-ERR-12 makes `(nil, nil)` SHOULD; [sdk] decision 4 makes it MUST | **MUST on the SDK surface only** (GO-API-09), because exit 79 already types absence. It stays SHOULD elsewhere, keeping ko/oras-go's deliberate nil-means-absent compliant. |
| 8 | [shape] §2 and Contested: a stored `context.Context` should be "SHOULD with a documented reason"; GO-CONC-02 is MUST | **GO-CONC-02 binds.** It is not a GO-API rule, and `containedctx` is already in the baseline. The exemplars that store contexts are recorded as violating. |
| 9 | [shape] rule 4 phrases "an exported interface must have >1 implementation" as a checkable rule; its own finding 3 calls `ireturn` a SHOULD with an override | **SHOULD** (GO-API-07). The implementation count is a reading heuristic. The n=60 study is parked as residue (Verdict 15). |
| 10 | [shape] Sources cite gorelease at `v0.0.0-20220909182711` | **Installed build is `v0.0.0-20260908205506-85c1c2202aba`** (`go version -m` on the binary). GO-API-10 pins `x/exp`. |
| 11 | [contract] Summary: "comparison ignores any pre-release tail (`0.5.8-rc1` reads as `0.5.8`)"; its fixture's `part()` uses `strconv.Atoi` per dot field | **False for its own code.** `Atoi("2-rc1")` fails to 0, so `0.6.2-rc1` < `0.6.2` and is rejected [R4]. GO-API-18 specifies the tail cut and a comparator table test. |
| 12 | [contract] §1 and AI angle 2: the `*VersionCompatError` message is "byte-for-byte" Python's, checked by an "exact-string assertion" | **Neither holds.** Python's message ends with a period (`_errors.py:368`), and `TestGateRejectsBelowFloor` asserts only the fields. GO-API-18 drops the period (Go error-string convention) and treats the text as a reading check. |
| 13 | [contract] candidate 4 and AI angle 3: every `.ExitCode()` grep hit "must sit inside a `ws.Signaled()` branch" | **Flags the compliant twin** [R6]: the correct classifier reads `ExitCode()` before the branch. The grep is only a review locator; the contract test is the check (GO-API-19). |
| 14 | [contract] §3: property 4 (a caller's shorter deadline) is part of the contract, yet passes on both its violation and its fixed twin; its violation plants "no cause", not GO-CONC-17's bare sentinel | **Both plants were missing.** [R2] `overcorrect` makes property 4 go red. [R2] `sentinel` shows the GO-CONC-17 shape fails only `AsType[*TimeoutError]`. |
| 15 | GO-CONC-17's text `WithTimeoutCause(ctx, d, ErrOcxTimeout)` vs GO-ERR-20's typed `*TimeoutError` (wave-2 contradiction 12, wave-3 contradiction 19, provisional) | **The typed cause wins, no longer provisional** (GO-API-20, [contract] §5 + [R2]). GO-CONC-17's mechanism stands; its example value is superseded (cross-family note). |
| 16 | [contract] §4: `gates/config-assembly` "has not landed", so GO-API-06/07 severities are held pending it | **It has since landed.** [assembly] finding 7 measured the overlay linters with zero genuine false positives and admitted them as written (map contradiction 22 confirmed). The severities are unchanged, now on evidence. |
| 17 | GO-API-04's overlay YAML listed `presets: [std-error-handling, common-false-positives]`; GO-ERR-09 forbids the first, GO-SEC-01 the second (map contradiction 1) | **The overlay carries `presets: []`** ([assembly] finding 1, C-10). This also answers the first round's open question on the baseline's `std-error-handling`. |
| 18 | GO-API-04's overlay revive list (`context-as-argument`, `deep-exit`, `exported`) vs GO-LANG-07's `time-equal` in the baseline (map contradiction 3) | **Four entries,** because the list replaces revive's defaults. GO-GATE owns the file text (map contradiction 6). GO-API cites names only. |
| 19 | [contract] fixture gate spawns `exec.Command(c.exe, "version")` without a context, outside `internal/process` | **A fixture shortcut, not the rule.** The probe goes through the single spawn point with the caller's `ctx` (GO-IO-13, GO-CONC-01), as Python's `probe` goes through `finish` with timeout and retry (`_client.py:676-679`). |
| 20 | [sdk] and [contract] treat the signal mapping (GO-API-19) and the timeout cause (GO-API-20) as independent | **They interact.** Classify-first turns the SDK's own timeout into `*ExitError{137}` [R3], because `Cmd.Wait` prefers the process error (`exec.go:944-959`). GO-API-20 fixes the order: check the context's cause first, then classify. |

## Revision log

- 2026-09-26 — **GO-API-18:** raised the version-gate clause from SHOULD to MUST (SDK). It now specifies lazy, once-per-`*Client`, success-only caching, the plain `ocx version` probe through `internal/process` with ctx, the pre-release-tolerant comparator and the message text. The envelope clause stays SHOULD. The row moved from Reading heuristics to the new "Caught by SDK contract tests" subsection; its ID and meaning are unchanged. Why: [contract] §1 watched it red and green [R1]; [R4] caught the dive's own comparator rejecting `-rc` builds.
- 2026-09-26 — **GO-API-19 (new, MUST, SDK):** signal-killed child → `128+n` at the SDK spawn point, no build tag. Why: [contract] §2-3 watched red and green [R1]; [R5] watched the build-tag red. The `.ExitCode()` grep was demoted to a locator after it flagged the compliant twin [R6].
- 2026-09-26 — **GO-API-20 (new, MUST, SDK):** typed `*TimeoutError` cause, a check of the context's cause before classifying, `Stderr` filled after `Wait`, and the caller's deadline never matched. Why: it closes wave-2 contradiction 12 / wave-3 contradiction 19 ([contract] §5, [R2]), and [R3] found the classify-first composition bug.
- 2026-09-26 — **GO-API-04:** the overlay carries `presets: []` (was "`comments` removed", with `std-error-handling` and `common-false-positives` left in). Verification now names GO-GATE's `lib-sdk.golangci.yml`. Why: map contradictions 1 and 6, [assembly] findings 1 and 6, C-10.
- 2026-09-26 — **The ruleset:** replaced the pasted overlay YAML with linter and setting names, including a four-entry revive list. Why: map contradictions 3 and 6. GO-GATE owns the file text.
- 2026-09-26 — **GO-API-05/06/07:** added the [assembly] noise figures and the C-11 re-watch. Severities are unchanged. Why: map contradiction 22 confirmed by [assembly] finding 7.
- 2026-09-26 — **Verdict:** item 3 revised in place (no preset; the overlay text moves to GO-GATE). Items 11-15 added: version handshake, signal path with its Linux-only gap, timeout cause with the ordering finding, overlay noise closed with the `internal/` gap, and interface placement at n=60 as a documented gap.
- 2026-09-26 — **Open questions:** removed `api/sdk-version-handshake`, `api/signal-exit-path` and `api/overlay-noise` (answered). Moved `api/interface-placement` to Verdict 15 (a gap). Removed the `std-error-handling` cross-family item (answered by map contradiction 1). Added the owner decision on an exported eager check, and `api/windows-kill-path`.
- 2026-09-26 — **MUST count:** 9 → 12 (adds 18's gate clause, 19 and 20).
- 2026-09-26 — **Conflicts resolved:** added 11-20. Revised 2 and 9 in place to point at the new resolutions.
- 2026-09-26 — **Failure modes:** added 12-16. Item 1's check reworded for `presets: []`.
- 2026-09-26 — **Frontmatter:** added `go-api/sdk-contract.md` to `consolidates`, `go-gates/config-assembly.md` as a cross-family input, the `revision/` fixture root, and `revised`.
