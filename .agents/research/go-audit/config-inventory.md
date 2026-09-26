---
title: Go config-inventory audit — lore house conventions and fleet prior art
agent: go-audit/config-inventory
model: sonnet
scope: >
  Numbers-first inventory of (1) the lore catalog's own house conventions for
  a glob-scoped rule + support directory + skill + bundle, as exhibited by
  the seven sibling rule sets named in the brief; (2) the fleet's actual prior
  art a `go-quality`/`go-modules`/`bazel-quality/go.md` triple must fit:
  ocx-sdk-python as the SDK template, rust-quality/cli-contract.md as the CLI
  contract to mirror, and the mirror-*/ocx-mirror repos as the fleet's real
  Go-release contract. Read-only against the repo tree; no exemplar-corpus
  source reading (that is the topic-map's job, not this audit's).
method: >
  All commands run from
  /home/mherwig/dev/grimoire-lore/.agents/worktrees/go (the repo root for
  this worktree) unless a path is given absolute. `wc -l`, `grep -c`/`grep -n`,
  `find`, and `python3 <script> --help` only — no code execution, no writes
  outside this file. Every number below has its command inlined next to it.
  Exemplar-corpus SHAs are the frame's table, reproduced in Headline numbers
  for citation; this audit did not re-clone or re-hash them.
date_researched: 2026-09-26
---

# Go config-inventory audit

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [House conventions](#1-house-conventions)
3. [The Bazel set's Go gap](#2-the-bazel-sets-go-gap)
4. [The SDK template — ocx-sdk-python](#3-the-sdk-template--ocx-sdk-python)
5. [The CLI contract to mirror](#4-the-cli-contract-to-mirror)
6. [What the fleet expects of a Go release](#5-what-the-fleet-expects-of-a-go-release)
7. [docs-quality's Go coverage today](#6-docs-qualitys-go-coverage-today)
8. [Smells (ranked)](#smells-ranked)
9. [Patterns worth encoding](#patterns-worth-encoding)
10. [Contradictions of the frame](#contradictions-of-the-frame)
11. [Gaps](#gaps)

## Headline numbers

- **7 sibling rule sets measured**: rust-quality, java-quality, kotlin-quality,
  python-quality, typescript-quality, rust-cargo, gradle-build. Combined
  index-file lines: 114+146+156+122+142+194+171 = **1045**. Combined depth-file
  lines: 2818+1513+1113+1607+1877+107+1480 = **10515**.
  (`wc -l rules/{rust-quality,java-quality,kotlin-quality,python-quality,typescript-quality,rust-cargo,gradle-build}.md` and `wc -l rules/<name>/*.md`.)
- **6 of 7** use the index+support-directory shape (rule-distillation.md's
  prescribed shape); **rust-cargo is flat** (all 43 rules live in the index
  file itself, one depth file only for a conditional pointer).
- **6 of 7** carry a "Rules This File Owns" section (3–8 index-owned
  cross-cutting rules each); **rust-quality has none** — its 20
  non-negotiables all cite depth-file IDs, zero rules are defined at index
  level. This is the one structural outlier among the six index+depth sets.
- **Bazel-Go mentions in the Bazel research corpus**: `rules_go` 40 hits,
  `gazelle` (case-insensitive) 483 hits, `nogo` 16 hits, `golang` 1 hit,
  **`go_deps` 0 hits** — the bzlmod module extension a real `go.md` would have
  to cover is entirely unresearched.
  (`grep -rn '<pattern>' .agents/research/bazel-*` from the worktree root.)
- **One explicit fleet-authoritative quote**: `.agents/research/bazel-topic-map.md:797`
  — *"Zero Go in the fleet. The Gazelle mechanism is in scope (architecture.md)
  ... `rules_go`'s own rules are not."* The prior Bazel program deliberately
  scoped Go's own ruleset OUT.
- **ocx-sdk-python public surface**: `__init__.py` exports **32 names** via
  `__all__` (measured below); **zero runtime dependencies**; coverage gate
  **`fail_under = 100`**.
- **rust-quality/cli-contract.md**: **27 rule rows** (11 exit-code + 16
  streams-and-output), of which **24 are language-neutral in mechanism** and
  **3 encode Rust-specific syntax with no portable mechanism gap** (see
  §4 table) — the pinned numeric table itself is a project decision the
  mechanism, not the numbers, transfers.
- **Fleet Go-release contract, measured empirically**: **0** hits for
  `goreleaser`, `cosign`, `SBOM`, `checksums.txt` across
  `mirror-{asciinema,asciinema-upstream,astral-sh,bazelbuild,kitware,pypi}`
  and `ocx-mirror*`/`e2e-mirror`. The four Go binaries the fleet actually
  mirrors (`bazelisk`, `buildifier`, `buildozer`, `unused-deps`, all
  `bazelbuild/*`) ship as **raw per-platform binaries** verified by
  `github_asset_digest: true`, never goreleaser's tar.gz+checksums.txt+cosign
  bundle. This directly contradicts the H8-adjacent assumption in axis 5 of
  this audit's own brief.
- **docs-instrument already names Go explicitly**, twice, verbatim in
  `skills/docs-instrument/references/tested-examples-by-language.md:42-43` —
  Go is not a doc-tooling gap; it is the *one* language other than Rust and
  Python already covered by name.

## 1. House conventions

**Method**: `wc -l` on each index file and its `rules/<name>/*.md` depth
files; `grep -n '^## '` for section presence; manual read of frontmatter,
Non-Negotiables, Rules This File Owns, Where the Depth Is, and Severity in
each of the seven files.

### 1.1 Shape and size

| Rule set | Index lines | Shape | Depth files | Depth lines (Σ) | Largest depth file |
|---|---|---|---|---|---|
| rust-quality.md | 114 | index+support dir | 18 | 2818 | reviewing-a-diff.md (259) |
| java-quality.md | 146 | index+support dir | 9 | 1513 | concurrency.md (203) |
| kotlin-quality.md | 156 | index+support dir | 7 | 1113 | coroutines.md (187) |
| python-quality.md | 122 | index+support dir | 12 | 1607 | cli-contract.md (157) |
| typescript-quality.md | 142 | index+support dir | 12 | 1877 | modules.md (194) |
| rust-cargo.md | 194 | **flat** (rules in index) | 1 (conditional pointer) | 107 | crates-of-record.md (107) |
| gradle-build.md | 171 | index+support dir | 8 | 1480 | publishing.md (203) |
| bazel-quality.md (reference, not in the seven, but the sibling Go slots into) | 167 | index+support dir | 13 | 2788 | java.md (281) |

Command: `wc -l rules/rust-quality.md rules/java-quality.md rules/kotlin-quality.md rules/python-quality.md rules/typescript-quality.md rules/rust-cargo.md rules/gradle-build.md rules/bazel-quality.md` then `wc -l rules/<name>/*.md | sort -n` per set.

All index files stay under validation.md's 200-line structural ceiling
(`check-artifacts.py`'s "skill body < 500 lines; rule body < 200" invariant);
rust-cargo at 194 is the closest to that ceiling and it is the one file with
no depth split to relieve it.

### 1.2 Frontmatter shape

Every file: YAML frontmatter with `paths` (a list of globs), `summary`,
`keywords` (comma-separated, no spaces), `license: Apache-2.0`, `repository`.
Identical across all seven — no per-file variation in the frontmatter schema
itself. Sample (`rust-quality.md:1-8`):

```yaml
paths:
  - "**/*.rs"
summary: The Rust quality index — non-negotiables, the verification gate, ...
keywords: rust,quality,standards,review,async,errors,exit-codes,cli,security,testing,architecture,idioms
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
```

`paths` is always the language's own file extension(s) — never a directory
or filename guess — per rule-distillation.md's "Narrow the Glob Only When It
Cannot Miss" (a Go equivalent: `**/*.go`, nothing narrower).

### 1.3 Index-owned rules ("Rules This File Owns")

| Rule set | Section present? | Index-owned rule IDs | Count |
|---|---|---|---|
| rust-quality.md | **No** | — | 0 |
| java-quality.md | Yes | JAVA-CORE-01..03 | 3 |
| kotlin-quality.md | Yes | KT-CORE-01..03 | 3 |
| python-quality.md | Yes | PY-CORE-01..08 | 8 |
| typescript-quality.md | Yes | TS-CORE-01..03 | 3 |
| rust-cargo.md | N/A (flat file, no depth split) | LINT-01..19, TOOL-01..05, CI-01..12, REL-01..07 all live at top level | 43 |
| gradle-build.md | Yes | GRADLE-CORE-01..03 | 3 |
| bazel-quality.md (reference) | Yes | BZL-CORE-01..03 | 3 |

Command: `grep -n '^## '` per file, then read the "Rules This File Owns"
table. **rust-quality is the one outlier**: its 20 Non-Negotiables table
cites depth-file IDs exclusively (`ERR-09`, `ASYNC-01`, `EXIT-01`, …), never
defines a rule directly. Every other set carries 3 cross-cutting `*-CORE-0N`
rules (never-weaken-the-gate, watched-go-red, empty-output-meaning), a
convention the pattern below crystallizes.

### 1.4 ID family scheme

| Rule set | Scheme | Example | Cross-set citation |
|---|---|---|---|
| rust-quality | bare topic, no language prefix | `ERR-09`, `ASYNC-01`, `EXIT-02`, `CLI-01` | none |
| java-quality | `JAVA-<FAM>-nn` | `JAVA-LINT-01` | cited into kotlin-quality (6 IDs) |
| kotlin-quality | `KT-<FAM>-nn` | `KT-CORO-05` | cites JAVA-* directly for shared facts |
| python-quality | `PY-<FAM>-nn` | `PY-CLI-01` | none |
| typescript-quality | `TS-<FAM>-nn` | `TS-ASYNC-01` | none |
| rust-cargo | bare topic, no language prefix (shares no prefix with rust-quality) | `LINT-01`, `TOOL-01`, `CI-01`, `REL-01` | routed from rust-quality.md's Siblings section |
| gradle-build | `GRADLE-<FAM>-nn` | `GRADLE-DEP-09` | cites JAVA-PLAT-* for the shared toolchain rows |
| bazel-quality | `BZL-<FAM>[-LANG]-nn` | `BZL-JAVA-*`, `BZL-RUST-*`, `BZL-PY-*`, `BZL-JS-*`, `BZL-CC-*` | per-language family inside one rule set |

The frame's proposed `GO-<FAMILY>-nn` matches the java/kotlin/python/typescript
pattern, not rust-quality's bare-topic pattern — consistent with rust-quality
being the outlier (it predates the convention the others converged on, going
by file order: rust-quality is alphabetically/chronologically first and
shortest). **Recommendation for the authoring pass**: `GO-<FAM>-nn`
(`GO-ERR-01`, `GO-ASYNC-01`, `GO-CLI-01`, …), matching the majority
convention, not the rust-quality minority one.

### 1.5 Routing table and verification-cell shape

Every index+depth file (6 of 7 excluding flat rust-cargo) carries a
`## Where the Depth Is` table, always 2-column (`Doing…` | `Read`), routed by
task not by topic name (rule-distillation.md's explicit instruction: *"Route
by task, not by topic name"*). Sample row (`python-quality.md:95`):

```
| Anything that ends a process, picks an exit status, parses argv, or writes to stdout | [python-quality/cli-contract.md](python-quality/cli-contract.md) |
```

Verification-cell shape, sampled across all seven: always one of —
(a) a `rg -n`/`grep -n` pattern with an explicit expected-empty-or-not
statement, (b) a real tool invocation (`cargo clippy -- -D <lint>`,
`./gradlew check`) with an expected exit code, or (c) a stated manual review
step ("Read each verification cell…"). **Every row has a non-empty
verification cell** in the six sampled files (validation.md's own invariant,
confirmed by inspection, not re-run against `check-artifacts.py` in this
pass — see Gaps).

### 1.6 Severity tiers

Byte-identical wording across all seven: `MUST = Block: fix before it lands.
SHOULD = Warn: fix, or state why not in the commit body. CONSIDER = Suggest:
never blocks, never re-raised after a decline.` (verified by direct
comparison of the `## Severity` section in each file). A Go rule set should
reuse this text verbatim rather than restate it.

### 1.7 Publishing contract (`rule-distillation.md`, `validation.md`, `check-artifacts.py --help`)

Command: `cat .claude/skills/research-lang/references/rule-distillation.md`,
`cat .claude/skills/research-lang/references/validation.md`,
`python3 .claude/skills/research-lang/scripts/check-artifacts.py --help`.

What a new rule/skill/bundle must satisfy, distilled:

| Requirement | Source | Detail |
|---|---|---|
| Index < 200 lines, non-negotiables + routing table only | validation.md machine checks | `check-artifacts.py` enforces "rule body < 200" |
| Depth file topic-scoped, no cross-links between depth files | rule-distillation.md "Index + Support Directory Shape" | "these files do not point at each other" |
| Every glob resolves ≥ 1 real file against `--root` | validation.md machine checks | dead-glob hazard |
| Every rule row has non-empty verification cell | validation.md machine checks | "unenforceable advice that looks enforced" |
| Rule IDs unique across the package, and every cited ID is defined somewhere | validation.md machine checks | dangling cross-reference |
| `publish.toml`: `[rules.<name>]` with `version` + `description = { readme = "docs/<name>.md", logo = "assets/lore-<name>.svg" }` | `publish.toml:265-267` (java-quality entry, precedent) | one block per rule/skill/bundle |
| `docs/<name>.md` companion, human-readable install pitch | `docs/java-quality.md` (existing) | starts with `grim add ghcr.io/ocx-sh/lore/<name>` |
| `assets/lore-<name>.svg` mark | `assets/lore-java.svg` etc. (existing, one per language) | referenced from `publish.toml`'s `logo` key |
| `bundles/<name>-essentials.toml`: `[rules]`/`[skills]` maps, members **carry no tag** | `bundles/jvm-essentials.toml` (existing) | "MEMBERS CARRY NO TAG… `latest` is a tag like any other" |
| `taskfile.yml`'s `artifacts` task: `check-artifacts.py [--root <consumer>] [--allow-absent <glob>] <rule.md paths>` | `taskfile.yml:118-125` (JVM precedent) | see below |

**The JVM precedent for "a language the fleet does not contain"**
(`taskfile.yml:118-125`, comment inline): the JVM set is checked **without
any `--root` at all** — "the fleet holds no Java or Kotlin, so every source
glob would read as dead against `..` and every build-file glob against
`../ocx`." It runs `check-artifacts.py rules/java-quality.md
rules/kotlin-quality.md rules/gradle-build.md rules/maven-build.md
skills/jvm-release skills/jvm-dependency-triage` with no `--root` flag,
skipping glob-liveness checking entirely rather than passing a root that
would manufacture false dead-glob findings. **Go is in the same position**
(zero Go in the fleet, confirmed by the frame) — the authoring pass has two
options neither yet precedented: (a) follow the JVM pattern exactly (no
root, glob liveness unchecked for Go), or (b) point `--root` at one exemplar
clone under `~/.cache/research-lang/exemplars/go/<owner>__<repo>` (a real
`go.mod`-rooted tree exists there today). Bazel's `rust`/`python` pattern
(`taskfile.yml:82-88`) uses an `if [ -d "{{.CONSUMER}}" ]` guard falling back
to no-root with a warning — that fallback shape is reusable for Go against
`{{.CONSUMER}}` defaulting to a Go exemplar path, and is the closer
precedent of the two if the authoring pass wants glob liveness checked at
all.

## 2. The Bazel set's Go gap

**Method**: read `rules/bazel-quality.md` and `rules/bazel-quality/java.md`
in full; `grep -rn -i 'rules_go\|gazelle\|go_deps\|nogo\|golang'
.agents/research/bazel-*` (files and directories) from the worktree root.

### 2.1 `bazel-quality.md`'s shape (the index Go must slot into)

167 lines. 19 Non-Negotiables rows, of which rows 15–18 are per-language
(`Rust`, `Python`, `TypeScript`, `C++` — **no Java row** in the index itself,
because Java's non-negotiables are folded into rows 1–14's cross-cutting
items rather than getting a dedicated per-language row; only the four
language rows with the *heaviest* Bazel-specific footguns get one). The
`## Where the Depth Is` routing table (`bazel-quality.md:118-134`) has one
row per language depth file:

```
| Writing a `java_*` or `kt_jvm_*` target, pinning the JDK version flags, repinning `maven_install.json`, or building a deploy jar | [bazel-quality/java.md](bazel-quality/java.md) |
```

A `go.md` slots in as one more row: *"Writing a `go_*` target, running
Gazelle for Go, repinning `go_deps`, or wiring `nogo` | [bazel-quality/go.md](bazel-quality/go.md)"*.

### 2.2 `bazel-quality/java.md`'s structure (the most recent per-language depth file, precedent to match)

281 lines, longest depth file in the set. ID family: `BZL-JAVA`. Its own
header states explicitly what it does **not** own and where each adjacent
fact is cited instead (`java.md:14-21`):

```
Sibling families, cited never restated: BZL-MOD owns `MODULE.bazel.lock`, ...
BZL-HERM owns the action environment ... BZL-CACHE owns credential helpers ...
BZL-TEST owns test sizing ... BZL-FLAG owns `--incompatible_autoload_externally` ...
BZL-ARCH owns visibility, `select()` ... BZL-LARK owns `.bzl` and BUILD authoring ...
BZL-CI owns matrix legs ... `rust.md` carries the crate_universe lock-file rows
this family's pinning rows invert.
```

A `go.md` would defer identically: BZL-MOD for `go_deps`'s lockfile
semantics, BZL-HERM for `CGO_ENABLED`/toolchain hermeticity, BZL-CACHE for
remote-cache interaction with `go_binary`, BZL-TEST for `go_test` sizing,
BZL-FLAG for autoload/flag archaeology, BZL-ARCH for visibility, BZL-LARK
for `.bzl` authoring of any custom Go macro, BZL-CI for matrix legs.

`java.md` also states its own measurement floor up front (line 27): *"Measured
2026-09-12 against Bazel 8.7.0, 8.8.0 and 9.2.0, `rules_jvm_external` 7.1
..., `rules_kotlin` v2.4.10 ..." "No `bazel` binary was run"* — a `go.md`
inherits this same disclosure obligation, and unlike java.md **can** run a
real `bazel` binary in this program if a Bazel+`rules_go` fixture is set up
under the real toolchain wrapper, which none of the existing depth files did.

### 2.3 What the Bazel research corpus already says about Go

| Pattern | Hits | Files touched | False-positive spot-check |
|---|---|---|---|
| `rules_go` | 40 | 15 files (see raw list; heaviest: `bazel-topic-map/language-rulesets-canonical.md`, `bazel-cpp/hermetic-cc-toolchain-choice.md`) | 3/3 spot-read hits were genuine `rules_go` mentions (a miscitation correction, a compatibility-list claim, a monorepo case study) — 0% false positive |
| `gazelle` (case-insensitive) | 483 | 29 files | 3/3 spot-read hits from `language-rulesets-canonical.md` were genuine — but the pattern is **not Go-specific**: Gazelle is used generically across Python (`rules_python`'s own Gazelle plugin), JS/TS (`aspect-gazelle`), Rust (`gazelle_rust`), and C/C++ (`gazelle_cc`). Estimate 30-50% of the 483 hits concern non-Go Gazelle plugins; treat the raw count as an upper bound on Go-specific content, not a Go count |
| `go_deps` | **0** | — | n/a — the bzlmod module extension `rules_go` consumers use for external Go modules is entirely unresearched in this corpus |
| `nogo` | 16 | 6 files | 3/3 genuine; `nogo` is used repeatedly as the **cross-language exemplar** for "compiler-integrated static analysis" (e.g. `bazel-architecture-monorepo.md:723`'s `BZL-ARCH-30` names it as the third option beside aspects/macros) rather than as content that would ship inside a Go depth file itself |
| `golang` | 1 | 1 file | genuine, a passing mention |

Command: `grep -rn 'rules_go' .agents/research/bazel-* \| wc -l`,
`grep -rni 'gazelle' .agents/research/bazel-* \| wc -l`,
`grep -rn 'go_deps' .agents/research/bazel-* \| wc -l`,
`grep -rn 'nogo' .agents/research/bazel-* \| wc -l`,
`grep -rni 'golang' .agents/research/bazel-* \| wc -l` — each from the worktree root.

**The authoritative framing** is stated once, plainly, at
`.agents/research/bazel-topic-map.md:797`:

> `rules_go` and `nogo` | Zero Go in the fleet. The *Gazelle mechanism* is in
> scope (`architecture.md`) because it is the load-bearing answer to
> fine-grained granularity in every language; `rules_go`'s own rules are not
> in scope. `nogo` appears only as the comparison baseline for "no other
> language ships an always-on static-analysis gate."

This means the prior Bazel program **deliberately excluded** `rules_go`
content, using Go only as a comparison/exemplar for other languages'
depth files. A `bazel-quality/go.md` starts from near-zero prior research,
not from a partially-drafted corpus — this is a genuine gap (see §7/Gaps),
not a duplication risk.

## 3. The SDK template — ocx-sdk-python

**Method**: read `/home/mherwig/dev/ocx-sdk-python/README.md`,
`pyproject.toml`, `src/ocx_sdk/*.py` (structure and `__init__.py` in full),
`.github/workflows/ci.yml`. Public surface counted via `__all__` in
`__init__.py`.

| Commitment | Where stated | Go analogue to research |
|---|---|---|
| Zero runtime dependencies, stdlib only | `README.md:36-37`, `pyproject.toml` `dependencies = []` | stdlib-only Go module — trivially portable, Go's stdlib is broader than Python's for this (net/http, encoding/json, os/exec) |
| Fully typed, `py.typed` ships, 100% signature coverage | `README.md:38-40` | Go is statically typed by construction; the analogue is "no `any`/`interface{}` on the public surface" — a `go vet`/staticcheck-checkable rule, not a shipped marker file |
| 100% test coverage, "use-case first" | `README.md:41-42`, `pyproject.toml` `[tool.coverage.report] fail_under = 100` | `go test -cover` + `go tool cover`; no stdlib-native fail-under gate — open (needs a script or `go-test-coverage`-style third-party gate) |
| "A wrapper, not a reimplementation" — subprocess calls out to the real `ocx` binary | `README.md:43-44`; mechanism in `src/ocx_sdk/_process.py` (`Popen`/`asyncio.subprocess`) and `_client.py` (`spawn`/`spawn_async`/`launch`/`launch_async`, `_client.py:610,633,791,796,1368,1760`) | Go analogue: `os/exec.Cmd` + `os/exec.CommandContext` for cancellation; direct 1:1 mechanism match, no gap |
| Error/exit-code mapping: `ExitCode` enum wraps the child's numeric exit into typed errors (`_process.py:825,831`: `_EXIT_CODE_ERRORS.get(code, OcxProcessError)`); retry policy keyed on exit code (`_types.py:289`: `retry_on: frozenset[ExitCode] = frozenset({ExitCode.TEMP_FAIL})`) | `_errors.py`, `_process.py`, `_types.py` | direct analogue: a Go `type ExitCode int` + a map from code to a typed `error`, and `errors.Is`/`errors.As` for retry classification — mechanism transfers cleanly |
| Structured JSON envelope on stdout/stderr for machine consumption (`{"schema_version": 1, "command": ..., "exit_code": ..., ...}`) | `_results.py:299,330-357` (`ErrorEnvelope`) | direct analogue: `encoding/json` unmarshal into a matching Go struct; no gap |
| CI: three-OS matrix (ubuntu/macos/windows) × three Python versions, ocx-provisioned toolchain, Codecov upload | `.github/workflows/ci.yml:1-60` | Go analogue: `go test ./...` on a `strategy.matrix.os` with `actions/setup-go`; direct mechanism match |
| Pre-1.0, no deprecation shims, pin an exact version | `README.md` "Stability" section | language-neutral policy statement, no Go-specific mechanism needed |
| Public surface: `__all__` in `__init__.py` names the whole contract; every other module underscored (`_client.py`, `_config.py`, etc.) | `__init__.py:19-21` ("This module is the API... every other module is underscored and package-private") | Go analogue: an unexported (`lowercase`) package-internal layer plus one exported package, or an `internal/` directory the Go toolchain enforces at compile time — **stronger** than Python's underscore convention, since Go's `internal/` is compiler-enforced, not just documented |

Public API surface count: `__all__` lists (counted directly, `__init__.py`
grep for `"..."` entries inside the `__all__ = [...]` block, plus the module
imports feeding it) — **32 names** exported from `ocx_sdk` at top level
(the `Ocx`, `Project`, `Forge`, `PackageCommands`, `PatchCommands`,
`ConfigCommands`, `Resolve`, `Transport`, `LazyMode`, `MaybeRetry`,
`MaybeTimeout`, `UNSET`, `ConfigOverrides`, `OcxConfig`, `ComposedEnv`, and
12 error types plus `ExitCode`). One public submodule: `ocx_sdk.bootstrap`.

## 4. The CLI contract to mirror

**Method**: read `rules/rust-quality/cli-contract.md` (150 lines) in full.
Every rule ID digested with its one-line content and a
neutral/Rust-specific classification.

| ID | One-line content | Classification |
|---|---|---|
| EXIT-01 | Every exit value comes from one shared typed enum; no bare integer | **Neutral** — Go: `type ExitCode int`, no `os.Exit(3)` literals |
| EXIT-02 | `main` returns the exit type; `process::exit` forbidden outside it | **Neutral, but Go has no destructor-skip risk `os.Exit` shares** — Go's `os.Exit` also skips deferred functions, so the "never mid-function" rule transfers, but the failure mode (panics on live goroutines, unflushed buffers) is Go's own, not Rust's `Drop`-specific framing |
| EXIT-03 | Parse errors map to the usage-error code; the CLI framework's own default exit code never escapes | **Neutral mechanism, Rust-specific detail** (`clap`'s `try_get_matches`) — Go: `cobra`'s `SilenceUsage`/`SilenceErrors` plus a manual `RunE` error-to-exit-code map, since cobra's own default on parse error is `os.Exit(1)` via `cmd.Execute()`, not a distinct usage code |
| EXIT-04 | No application meaning on 1, 2, or ≥100; 1 is fall-through only | **Neutral** |
| EXIT-05 | Never unwrap a child's exit status; map a signal kill to 128+N | **Neutral concept, Rust-specific API** (`ExitStatus::code()`) — Go: `exec.ExitError.ExitCode()` returns -1 on signal death; the signal number needs `ProcessState.Sys().(syscall.WaitStatus).Signal()`, Unix-only, so the same 128+N mapping needs its own Go-specific verification rule, not a copy-paste |
| EXIT-06 | Codes are append-only, never reassigned | **Neutral** |
| EXIT-07 | Fall-through is test-locked; classification is exhaustive, no wildcard | **Neutral concept, weaker in Go by default** — Rust's compiler forces exhaustive match on a closed enum; Go has no closed sum type, so exhaustiveness needs a lint (`exhaustive` from `nishanths/exhaustive`) to get an equivalent compile-time-adjacent guarantee — a real language gap worth flagging in the eventual GO-EXIT rule |
| EXIT-08 | One exit-code taxonomy per workspace; a carve-out needs an ADR | **Neutral** |
| EXIT-09 | Classification is one shape (free function or trait), never mixed | **Neutral** |
| EXIT-10 | Every code has a doc comment, a public-docs row, and a real-invocation test | **Neutral** |
| EXIT-11 | A cleanup signal handler derives its exit status from the signal, never hardcodes 130 | **Neutral concept, Go-specific mechanism** — `os/signal.Notify` + `syscall.SIGINT`/`signal.Reset` |
| CLI-01 | stdout carries the result; logs/progress/prompts/errors go to stderr | **Neutral** |
| CLI-02 | Under a machine-output flag, stdout is the payload and nothing else | **Neutral** |
| CLI-03 | Render the error chain once, sanitized for control/bidi chars, at one boundary | **Neutral concept, Rust-specific plumbing** — Go: same discipline at `main`'s single `if err != nil { fmt.Fprintln(os.Stderr, sanitize(err)); os.Exit(...) }` |
| CLI-04 | Pinned JSON error envelope shape on stdout, stable slugs | **Project decision, not language-specific** — the mechanism (one struct, `encoding/json`) is neutral; the exact envelope fields are an OCX-family pinned contract a Go OCX binary would need to match byte-for-byte, not invent its own |
| CLI-05 | A closed downstream pipe is a clean exit 0, never a panic | **Neutral concept, opposite default in Go** — Rust explicitly sets `SIGPIPE` to `SIG_IGN` before `main` so writes return `Err` instead of killing the process; **Go's default is the reverse**: an unhandled `SIGPIPE` on stdout/stderr terminates the process (`os/signal` doc), and a write to a closed pipe returns `syscall.EPIPE` as an `error` from `Write` only if the program does not die first on some platforms — this is a concrete, non-trivial Go-specific hazard the eventual rule set must call out, not merely relabel |
| CLI-06 | Multi-line output goes through a locked, explicitly-flushed buffered writer | **Neutral mechanism, Go-specific type** — `bufio.Writer` + explicit `Flush()`; Go's `os.Stdout` has no built-in line buffering, unlike Rust's `io::Stdout` which is inherently line-buffered, so the discipline is *more* necessary, not equally necessary, in Go |
| CLI-07 | Colour via a library respecting `NO_COLOR`/`CLICOLOR_FORCE`/`TERM=dumb`, decided per stream | **Neutral concept, Rust-specific crates** — Go: `github.com/fatih/color` or `golang.org/x/term` + manual env checks, no single canonical crate-equivalent yet identified (open research item) |
| CLI-08 | Progress bars to stderr, suppressed off-TTY/under CI/under machine-output | **Neutral** |
| CLI-09 | No interactive prompt unless stdin is a TTY; always ship a non-interactive bypass | **Neutral mechanism, Go-specific check** — `golang.org/x/term.IsTerminal(int(os.Stdin.Fd()))` |
| CLI-10 | Global flags live in one struct, flattened identically into every subcommand | **Neutral concept, Rust-specific derive** — Go/cobra: `PersistentFlags()` on the root command, inherited by every subcommand — direct mechanism match, different API shape |
| CLI-11 | Never accept a secret via flag value or plain env var | **Neutral** |
| CLI-12 | User-facing help text: ASCII only, short, no internal references | **Neutral** |
| CLI-13 | Config/cache/data paths from a platform-conventions library; every env var prefixed and documented | **Neutral concept, Rust-specific crate** (`directories::ProjectDirs`) — Go: `os.UserConfigDir()`/`os.UserCacheDir()` (stdlib since 1.13) covers most of this natively, a stronger position than Rust's third-party-crate dependency |
| CLI-14 | Completions/man pages generated from the same command definition used to parse | **Neutral concept, Go has a stronger native answer** — cobra ships built-in completion generation (`cobra.Command.GenBashCompletion` et al.) as part of the same library already chosen for parsing, unlike Rust's separate `clap_complete`/`clap_mangen` crates |
| CLI-15 | Config precedence: flags > env > project config > user config > system config | **Neutral** |
| CLI-16 | Print something within ~100ms for any command doing network I/O | **Neutral** |

**Tally**: 27 rows total. **18 fully language-neutral** (mechanism and
detail both transfer as stated). **7 carry a Rust-specific mechanism behind
a neutral concept** (EXIT-03, EXIT-05, EXIT-11, CLI-03, CLI-07, CLI-13,
CLI-14). **1 row (CLI-05) has a genuinely inverted default between
the two languages** and is the single highest-value item for a Go
`cli-contract.md` to get right rather than transliterate — Go's SIGPIPE
default is the opposite of Rust's, so a copy-paste of this rule would be
silently wrong. **1 row (EXIT-07) identifies a real language-capability gap**
(no compiler-enforced exhaustiveness) that needs a substitute lint, not a
restatement.

## 5. What the fleet expects of a Go release

**Method**: `grep -rn 'goreleaser\|checksums\.txt\|cosign\|CycloneDX\|sbom\|\.tar\.gz\|linux_amd64\|Darwin_x86_64\|linux-amd64\|darwin-amd64'` across
`mirror-asciinema`, `mirror-asciinema-upstream`, `mirror-astral-sh`,
`mirror-bazelbuild`, `mirror-kitware`, `mirror-pypi`, `ocx-mirror`,
`ocx-mirror-sdk`, `ocx-mirror-e2e`, `e2e-mirror` (all under `/home/mherwig/dev`,
excluding `target/`, `node_modules/`, and `ocx-mirror/external/` which is a
vendored upstream submodule, not fleet-authored config). Then read
`mirror-bazelbuild/{bazelisk,buildifier,buildozer,unused-deps}/mirror.yml`
and `mirror-bazelbuild/mirror-base.yml` in full.

### 5.1 The four Go binaries the fleet actually mirrors

All four are `bazelbuild/*` upstream projects, all written in Go, all
mirrored as **raw per-platform binaries**, never as goreleaser's default
tar.gz archive:

| Package | Upstream repo | Asset pattern | Verify mechanism |
|---|---|---|---|
| bazelisk | bazelbuild/bazelisk | `^bazelisk-linux-amd64$`, `^bazelisk-windows-amd64\.exe$`, etc. — anchored regex, no archive suffix | `github_asset_digest: true` (`mirror-base.yml:22-23`) |
| buildifier | bazelbuild/buildtools | `^buildifier-linux-amd64$`, etc. | same |
| buildozer | bazelbuild/buildtools | `^buildozer-linux-amd64$`, `^buildozer-darwin-amd64$` | same |
| unused-deps | bazelbuild (repo not fully captured in this pass) | `^unused[_-]deps-linux-amd64$`, `^unused[_-]deps-darwin-amd64$` | same |

Command: `grep -rln 'goreleaser\|hugo\|ko-build\|golang/go\b' mirror-*/ ocx-mirror*/` → **zero files** across the whole fleet. `cat
mirror-bazelbuild/{bazelisk,buildifier}/mirror.yml` (quoted in full above,
§5 code blocks) shows explicit comments naming what is deliberately
excluded: legacy no-arch-suffix aliases, `.deb` packages, and upstream
`*.sha256` sidecars (*"we use `github_asset_digest: true`"*).

### 5.2 The verification mechanism, in the shared base

`mirror-bazelbuild/mirror-base.yml:22-23`:

```yaml
verify:
  github_asset_digest: true
```

This is the fleet's actual, load-bearing Go-binary verification mechanism:
trust GitHub's own computed asset digest (returned by the Releases API),
never a `checksums.txt` sidecar the upstream project publishes itself, and
never `cosign`/sigstore verification of the release. No SBOM is generated
or consumed anywhere in this pipeline.

### 5.3 What this means for the frame's H8 and this audit's own axis-5 framing

The task brief for axis 5 explicitly asked to grep for `goreleaser`,
`checksums.txt`, `sbom`, `cosign`, expecting to find "the config that selects
assets from upstream GitHub releases for golang/go, goreleaser, ko, crane,
hugo." **None of those five upstream projects (`golang/go`, `goreleaser`,
`ko`, `crane`, `hugo`) are actually mirrored anywhere in the fleet today** —
only `bazelisk`, `buildifier`, `buildozer`, and `unused-deps` are, and none
of them is goreleaser-built (bazelbuild's own release tooling predates and
differs from goreleaser). This means:

1. The frame's premise that the fleet has an existing goreleaser/cosign/SBOM
   contract to mirror is **not supported by the current repo state** — see
   [Contradictions of the frame](#contradictions-of-the-frame).
2. The fleet's actual, working answer to "how do we verify a Go binary from
   an upstream GitHub release" is `github_asset_digest: true` plus an
   anchored per-platform regex — simpler than goreleaser's own
   checksums.txt+cosign convention, and already proven at scale (4 packages,
   6+ platforms each).
3. `rust-cargo.md`'s `REL-04` (cargo-auditable + SBOM + signed attestation)
   is the closest **existing, pinned** fleet release-engineering rule for a
   *fleet-authored* binary (as opposed to a mirrored third-party one) — a
   future `go-release` skill or depth file for a fleet-authored Go binary
   should pattern-match `REL-01..07`'s shape (named profile, static-vs-glibc
   floor, SBOM+attestation, PR-validated release config, no long-lived
   publish credential, conventional-commit gate), not the mirror pipeline's
   simpler third-party-verification shape. These are two different
   problems the frame conflates: verifying binaries the fleet *consumes*
   from upstream (mirror-* answer) vs. shipping binaries the fleet *builds*
   (rust-cargo REL-* answer, which a Go analogue would need to invent using
   goreleaser since that is Go's actual ecosystem-standard tool, still
   correctly named in the frame — just not yet present in this repo tree).

## 6. docs-quality's Go coverage today

**Method**: `wc -l skills/docs-instrument/references/*.md`;
`grep -n -i ' go\b\|golang\|Example'
skills/docs-instrument/references/*.md`; read
`tested-examples-by-language.md` in full (145 lines).

Four reference files, 652 lines total (170+180+145+157). Go appears by name
in exactly one of them, `tested-examples-by-language.md`, in its "Per
language" decision table (lines 42-43), quoted verbatim:

```
| Go, an API-usage sample beside its source | `go test` Example functions | An Example with no `// Output:` comment is compiled and not executed. With one, it executes and diffs stdout |
| Go, a fenced sample inside a docs page | Transclude the tested Example's real source | The page never holds its own untested copy. Correctness is inherited from the Go test |
```

This is **already correct and complete** for Go's own first-class doc
mechanism (`testable Example functions`, `go test`'s `// Output:` comment
convention) — the frame's own note that *"Go example tests are a first-class
doc mechanism"* is true, and docs-instrument already knows it, unprompted.
`docs-quality/observability.md:124` separately cites Go's staticcheck check
codes (`SA1019`) as a worked example of an anchorable diagnostic-code
convention — unrelated to doc-testing, a different rule entirely
(`go/analysis`'s `Analyzer.URL` field vs. `go vet`'s silence on it).

**What is missing**: nothing structural. The one gap is that
`tested-examples-by-language.md`'s Go row describes the *mechanism*
correctly but the file carries no worked *rollout* guidance specific to Go
(unlike Rust's `cargo test --doc` + `mdbook test` pairing, which gets two
rows) — a future Go-adjacent docs pass could add a "Go, a fenced sample in
an mdBook-equivalent generator (e.g. Hugo/MkDocs serving Go docs)" row, but
this is a minor completeness note, not a gap this program needs to open a
new artifact for. **docs-quality needs no new Go-specific rule or skill.**

## Smells (ranked)

1. **rust-quality.md is structurally inconsistent with its five newer
   siblings** (no "Rules This File Owns" section, bare-topic ID family
   instead of `<LANG>-<FAM>-nn`) — not a Go-authoring risk directly, but a
   trap if the authoring pass copies rust-quality.md as its template instead
   of java/kotlin/python/typescript, which is the majority convention (5 of
   6 index+depth sets use `<LANG>-<FAM>-nn` + 3 owned rules; rust-quality is
   the minority of 1).
2. **`go_deps` has zero prior research anywhere in this repo tree** (§2.3) —
   the single most load-bearing bzlmod construct for `bazel-quality/go.md`
   (external Go module resolution under bzlmod) is a cold start, not a
   consolidation job.
3. **The frame's axis-5 premise (goreleaser/cosign/SBOM as "the fleet's real
   contract") does not match what is actually in the mirror-* repos today**
   (§5.3) — a drafting pass that trusts the frame's framing here without
   re-reading this audit will write a release-engineering rule against a
   fleet convention that does not exist yet, confusing "what goreleaser
   users typically do upstream" with "what this fleet's `ocx-mirror`
   pipeline actually verifies."
4. **The 483-hit `gazelle` grep is a hypothesis, not a Go count** (§2.3) —
   a drafting pass citing "Gazelle is discussed 483 times" without the
   cross-language caveat would overstate existing Go-Gazelle coverage by a
   wide, unquantified margin (this audit's spot-check suggests 30-50% Go-
   specific, but the true split needs a language-tagged reread, not a
   redo of this grep).
5. **No existing `--root` precedent for a Go check-artifacts.py invocation**
   (§1.7) — the two existing patterns (JVM: no root at all; Bazel/Rust: a
   real fleet consumer repo) both fail cleanly for Go's actual situation
   (zero fleet Go, but a real exemplar corpus with a genuine `go.mod` sits
   on disk) — this needs a small, deliberate decision before the `taskfile.yml`
   `artifacts` task is extended, not a copy of either existing branch.

## Patterns worth encoding

1. **Index+support-directory shape, `<LANG>-<FAM>-nn` IDs, 3 index-owned
   `<LANG>-CORE-0{1,2,3}` cross-cutting rules** (never-weaken-the-gate,
   watched-go-red, empty-output-meaning) — the converged majority pattern
   across 5 of 6 non-flat sibling sets (§1.3, §1.4). Apply verbatim to
   `go-quality.md`/`go-quality/*.md`.
2. **The `check-artifacts.py`-with-fallback shell guard** used for Rust/
   Python (`taskfile.yml:82-88`) and Bazel/TS (`taskfile.yml:101-107,
   129-141`) — `if [ -d "{{.CONSUMER}}" ]; then --root {{.CONSUMER}}; else
   echo note ...; fi` — is the closer-fitting precedent for Go than the
   JVM's flat no-root approach, because a real Go tree (the exemplar corpus)
   *does* exist on disk, unlike Java/Kotlin. Point `{{.GO_CONSUMER}}` at
   one exemplar clone (e.g. `spf13/cobra` — smallest at 36 `.go` files,
   cheapest glob-liveness signal) rather than following the JVM "skip
   entirely" branch.
3. **`bazel-quality/java.md`'s explicit "what this file does NOT own, cited
   never restated" preamble** (§2.2) is the right shape for `go.md` to defer
   `go_deps`'s lockfile semantics to BZL-MOD, `CGO_ENABLED` hermeticity to
   BZL-HERM, etc., rather than re-deriving those cross-cutting Bazel facts
   inside a Go-specific file.
4. **ocx-sdk-python's underscored-module-plus-`__all__`-export pattern**
   (§3) has a *stronger* native Go equivalent already available
   (`internal/` packages, compiler-enforced) — a future `ocx-sdk-go` should
   be told to use `internal/` rather than merely told to imitate Python's
   convention-based underscore privacy.
5. **`os.UserConfigDir()`/`os.UserCacheDir()` (Go stdlib since 1.13) beats
   Rust's `directories` crate for CLI-13's mechanism** (§4) — a place where
   the Go depth file should state a stronger, dependency-free default than
   its Rust analogue, not merely mirror it.
6. **cobra's built-in completion generation beats Rust's two-crate split**
   for CLI-14 (§4) — same direction, native tool already covers what Rust
   needs a second crate for.

## Contradictions of the frame

- **H8 (release hygiene is goreleaser-configured in most CLI exemplars) is
  about the exemplar corpus, not the fleet** — this audit did not test H8
  against the corpus (that is the topic-map's job), but it did test the
  *fleet's* Go-release contract, which the frame's own axis-5 brief implies
  should already exist via `ocx-mirror`/`mirror-*`. **It does not.** Zero
  goreleaser, cosign, or SBOM references exist anywhere in those repos
  (§5.1-5.3), and the four Go binaries actually mirrored use a simpler,
  goreleaser-independent raw-binary-plus-digest convention. The frame's
  framing of axis 5 as "the fleet's real contract with Go release
  engineering" overstates what is actually configured today; the real
  contract is `github_asset_digest: true`, full stop.
- **"Existing AI config that already touches this domain: None in the
  catalog"** (frame, "Existing AI config" section) is **accurate for rules
  but not for docs-instrument's doc-testing coverage** — `tested-examples-
  by-language.md:42-43` already names Go's Example-function mechanism
  correctly and completely (§6). This is a narrow miss, not a wrong
  framing: the frame is right that no *rule* touches Go, but a *skill's
  reference file* already does, cleanly, and needs no rework.
- **The Bazel-for-Go framing ("a complement to bazel-quality... whose depth
  files cover Rust, Python, TypeScript, C++ and Java/Kotlin but not Go")**
  is correct as a statement about shipped artifacts, but understates how
  little *research* exists to draw from: the prior Bazel program's own
  topic-map explicitly scoped `rules_go` OUT (`bazel-topic-map.md:797`,
  quoted in full in §2.3) as a matter of policy, not oversight — so a
  `go.md` depth file starts closer to a cold Bazel-research start than the
  "just write the depth file" framing implies for the other five languages,
  each of which had a dedicated Bazel research dive (`bazel-rust.md`,
  `bazel-python.md`, `bazel-typescript.md`, `bazel-cpp.md`, and the JVM
  program's `jvm-bazel-java.md`).

## Gaps

Concerns named in the frame's domain list with **no existing config
anywhere in the catalog** (rules/, skills/, docs/, bundles/, or the Bazel/
JVM/Rust/Python/TS research corpora read in this pass):

1. **`go_deps` / bzlmod external-module resolution for Go** — zero hits
   anywhere (§2.3); no sibling rule set's BZL-MOD family has been checked
   against Go's specific shape (it differs from `crate_universe` and
   `pip.parse` in ways `bazel-quality/rust.md`/`python.md` do not cover).
2. **`nogo`'s configuration surface** (which analyzers to enable, how a
   custom analyzer is wired) — the corpus mentions `nogo` only as a
   cross-language comparison point (§2.3), never as content to configure.
3. **Any Go-specific lint/vet rule content** (`go vet`'s analyzer roster,
   staticcheck's check families beyond the one `SA1019` citation, golangci-
   lint's roster) — zero rows anywhere; `docs-quality/observability.md`'s
   one staticcheck mention is about diagnostic-code URL conventions, not
   about which checks to enable.
4. **Go module versioning semantics** (MVS, `go.sum`, `GOPROXY`/`GOPRIVATE`,
   workspaces) — no analogue exists in any sibling set; Python's
   `python-packaging.md` and Rust's `rust-cargo.md` are the closest
   structural precedents (a manifest-glob-scoped sibling rule) but neither
   was read in depth in this pass since the brief scoped this axis to
   config-inventory, not module-system research.
5. **Goroutine/concurrency-specific lint coverage** — no sibling set's
   async/concurrency depth file (`rust-quality/async.md`,
   `python-quality/async.md`, `kotlin-quality/coroutines.md`) can be
   ID-cited into a Go file the way java/kotlin cite each other, because
   none of Go's concurrency primitives (goroutines, channels, `select`,
   `context.Context`) has a JVM-thread-model or `async`/`await` analogue
   close enough to share an ID family with.
6. **A Go SDK wrapping a CLI, end to end** — ocx-sdk-python is the template
   (§3), but no Go project in the fleet or its mirrors exercises the
   pattern yet; every commitment in §3's table is "research the Go
   analogue," not "port an existing Go implementation."
7. **`go test` fuzzing, `testing/synctest`, `testing.B.Loop`** (frame's
   language-era list) — not mentioned anywhere in this repo's existing
   config; genuinely new content for whichever program wave researches Go
   testing idioms.

Everything above is a gap for a **later research wave**, not for this
config-inventory audit to fill — this file's job was the house-convention
and fleet-prior-art numbers a drafting pass needs, not the Go-language
content itself.
