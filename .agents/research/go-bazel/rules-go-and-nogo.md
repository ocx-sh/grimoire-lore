---
title: "rules_go and Gazelle under Bzlmod: nogo parity, go_test modes, stamping and platforms"
topic: "BZL-GO — Bazel for Go (merged rules-go-bzlmod + nogo-tests-and-stamping dives, revised after wave 2 and owner Q7)"
agent: rules-go-and-nogo (wave 3)
model: sonnet
date_researched: 2026-09-26
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/rules-go-and-nogo/bazel-go
scope: |
  Covers rows M-O-01..10: Go SDK sourcing under go_sdk.from_file, go_deps
  external-module hygiene and Gazelle directives, nogo configuration and its
  parity gap against the gate of record, go_test race/pure modes, x_defs
  stamping, and cross-compilation via --platforms. Does not cover bzlmod
  fundamentals, hermeticity, caching, general CI or Starlark authoring
  (BZL-MOD/BZL-HERM/BZL-CACHE/BZL-CI/BZL-LARK own those) or whether to adopt
  Bazel for Go at all (M-O-11, the bazel-adopt skill).
---

# rules_go and Gazelle under Bzlmod: nogo parity, go_test modes, stamping and platforms

## Table of Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Go SDK sourcing: go_sdk.from_file and the toolchain/go precedence](#1-go-sdk-sourcing-go_sdkfrom_file-and-the-toolchaingo-precedence)
   2. [go_deps, use_repo hygiene, and bazel mod tidy](#2-go_deps-use_repo-hygiene-and-bazel-mod-tidy)
   3. [Gazelle directives and the BUILD-drift check](#3-gazelle-directives-and-the-build-drift-check)
   4. [GO_TOOLS and the tool directive](#4-go_tools-and-the-tool-directive)
   5. [Override precedence for Gazelle behavior](#5-override-precedence-for-gazelle-behavior)
   6. [Where MVS and Bazel module resolution diverge](#6-where-mvs-and-bazel-module-resolution-diverge)
   7. [nogo configuration and its parity gap against the gate of record](#7-nogo-configuration-and-its-parity-gap-against-the-gate-of-record)
   8. [The golangci-lint-to-nogo bridge: what exists, and its status](#8-the-golangci-lint-to-nogo-bridge-what-exists-and-its-status)
   9. [go_test race and pure modes](#9-go_test-race-and-pure-modes)
   10. [Stamping with x_defs and the workspace status command](#10-stamping-with-x_defs-and-the-workspace-status-command)
   11. [Cross-compilation with --platforms](#11-cross-compilation-with---platforms)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Measurement disclosure

Bazel **can** and **did** run here: bazelisk 1.28.1 via `ocx.sh/bazelbuild/bazelisk`,
which downloaded and ran **Bazel 9.2.0** in `fixtures/rules-go-and-nogo/bazel-go/`.
Every row below marked "RUN" in the Normative guidance table was watched go red
on a planted violation and green on a compliant twin inside that fixture, with
`rules_go` 0.63.0 and `gazelle` 0.54.0 pulled live from the Bazel Central
Registry (the versions current as of 2026-09-26 — see
[go_sdk sourcing](#1-go-sdk-sourcing-go_sdkfrom_file-and-the-toolchaingo-precedence)
for the version-drift measurement). Two rows (M-O-09's `bazel_dep`-wins case,
one direction only, and the `go_deps.config(checks=...)` internal
consistency case) are **doc-derived**: reading the primary source's own
words rather than a planted fixture, because reproducing a real cross-module
MVS conflict needs a second Bazel module with its own registry entry, which
was judged not worth the fixture budget for a P2 row. Both are flagged
"doc-derived" in the table, not silently folded into "RUN".

## Summary

- **`go_sdk.from_file`'s SDK-version precedence was measured, not just read**: with `go 1.27.0` and `toolchain go1.27.1` both present, Bazel's SDK resolves to **1.27.1** (`toolchain` wins); with the `toolchain` line removed it resolves to **1.27.0** (`go` line). This is exactly [GO-MOD-02](../go-modules.md)'s CLI-vs-library split, so a CLI's `go.mod` carrying a `toolchain` line gets that exact patch under Bazel too, and a library's bare `go` line is what Bazel builds it with when no other module raises the floor.
- **The Bazel Central Registry's current versions (rules_go 0.63.0, gazelle 0.54.0, measured 2026-09-26) are 6 and 9 minor releases ahead of the version numbers printed in rules_go's own `bzlmod.md` example snippet** (`0.57.0` / `0.45.0`). Never copy a version number out of a doc snippet; read `registry.bazel.build` or the BCR's `metadata.json` at fetch time.
- **`bazel mod tidy` (Bazel ≥7.1.1) is the drift-proof way to keep `use_repo` calls correct.** A hand-deleted `use_repo` entry fails the build with an unresolved-repository error; running `bazel mod tidy` regenerates the exact call and the build goes green again, with no other MODULE.bazel edit needed.
- **A missing or stale `BUILD.bazel` is a Gazelle problem, not a Bazel problem, and Bazel's own build can go green over it.** Only `gazelle -mode=diff` (exit 1 on any difference, 0 when clean) or `-mode=fix`/`update` catches drift; that must be its own CI step, run with `-strict` for a syntax or unknown-directive failure too.
- **`nogo`'s `vet = True` convenience and `TOOLS_NOGO` overlap, and combining them is a hard error, not a warning.** `vet = True` adds exactly the same 5 analyzers (`atomic`, `bools`, `buildtag`, `nilfunc`, `printf`) that `go test` already runs by default; `TOOLS_NOGO` is the *entire* `golang.org/x/tools/go/analysis/passes` tree and already dominates those 5, so writing `vet = True` alongside `TOOLS_NOGO` in `deps` fails Bazel's analysis phase with "Label ... is duplicated in the 'deps' attribute."
- **`TOOLS_NOGO` alone does not give [GO-GATE-02](../go-gates.md)'s "37 vet analyzers" parity, and it does not give [GO-GATE-11](../go-gates.md)'s nilness coverage or [GO-ERR-05/06](../go-errors.md)'s staticcheck coverage.** `TOOLS_NOGO` is x/tools' own analysis passes (vet-family plus a few extras); `nilness` lives in the same tree and is not wired in by default; staticcheck's SA-checks are a wholly separate module (`honnef.co/go/tools`) that must be added to `nogo`'s `deps` by hand, one analyzer package per check.
- **staticcheck analyzers reach `nogo` as ordinary `go_library` targets, because every staticcheck check is itself an `analysis.Analyzer`** (confirmed by reading `dominikh/go-tools@6cb65e58a558:staticcheck/sa9010/sa9010.go`). `@co_honnef_go_tools//staticcheck/sa4023` and `//staticcheck/sa9010` built and ran under `nogo` with no special plumbing beyond a `go_deps` entry.
- **A community bridge for golangci-lint-to-nogo exists (`sluongng/nogo-analyzer`), but its own README marks the golangci-lint half "POC-only. Should NOT be used except for research purposes"**; only its staticcheck half is marked "Stable." Its own pinned analyzer list is missing `SA9010` (`staticcheck` 2026.2's newest check) because the bridge's own `honnef.co/go/tools` pin predates it — do not assume the bridge tracks staticcheck's release cadence. There is no first-party or Bazel-module-registered bridge; this repository ships WORKSPACE-only, with no `MODULE.bazel` and no BCR listing.
- **`go_test`'s `race` and `pure` attributes are three-valued strings (`"on"`, `"off"`, `"auto"`), not booleans**, and the rules_go docs recommend controlling both from the command line via `--@rules_go//go/config:race`/`:pure` rather than per-target, in most cases. `race = "on"` on a genuinely racy test failed the build with the real Go race detector's report; the same target with the race fixed (mutex-protected) passed clean under the identical attribute.
- **Stamping is two Bazel primitives composed, not a Go-specific mechanism**: `--stamp` plus `--workspace_status_command=<script>` writes `bazel-out/{stable,volatile}-status.txt`; `x_defs` on a `go_binary`/`go_library` reads a key from those files by name inside `{CURLY_BRACES}` and rewrites the named Go variable at link time. Measured end to end: a fixture binary printed `dev` unstamped and the workspace-status value (`v9.9.9-bzlfix`) with `--stamp --workspace_status_command=<script>`.
- **Cross-compiling is one flag, not an environment variable pair.** `bazel build --platforms=@rules_go//go/toolchain:linux_arm64` produced a real ELF/aarch64 binary and `--platforms=@rules_go//go/toolchain:windows_amd64` produced a real PE32+ `.exe`, from the same `go_binary` target, no `GOOS`/`GOARCH` env anywhere in the build files.
- **Gazelle's directive census on both dogfood repos is `exclude`-dominated**, with `prefix`, `go_naming_convention` and `go_naming_convention_external` a distant second; zero `# gazelle:resolve` overrides were found in either repository, so the map's "stale resolve overrides" worry has no exemplar evidence behind it as of 2026-09-26.
- **`gazelle`'s own dogfood module resolves its Go dependencies from a `go.work` file, not a `go.mod` file** (`go_deps.from_file(go_work = "//:go.work")`), while `rules_go`'s own module uses `go_mod`. Both shapes are first-class; the `go.work` shape inherits [bazelbuild/bazel-gazelle#1797](https://github.com/bazelbuild/bazel-gazelle/issues/1797)'s open limitation: an indirect dependency that also participates in a dependency cycle across the workspace can diverge from the version `go.work` pins.
- **The `tool` directive (Go 1.24+) surfaces as a real, buildable `GO_TOOLS` dict once Gazelle ≥0.47.0 has run**: a fixture `tool golang.org/x/tools/cmd/stringer` line produced the generated file `GO_TOOLS = {"stringer": Label("@org_golang_x_tools//cmd/stringer:stringer")}`, confirmed by reading the generated repository directly.
- **`go_deps.gazelle_override` beats `go_deps.gazelle_default_attributes` beats the public registry's `default_gazelle_overrides.bzl`**, in that order, per rules_go's own `bzlmod.md`; the ruleset's own advice is to avoid the middle tier and upstream the override to the public registry instead of using it as a permanent local escape hatch.
- **MVS and Bazel module resolution diverge in two documented, distinct ways**: (1) a Go module a `bazel_dep` also provides is *always* the `bazel_dep`'s version, and `go_deps` cannot override it, full stop; (2) `go_deps.config(checks = ...)` governs whether a version mismatch between `go.mod`'s own resolution and an explicit `go_deps.module()` override is merely printed (`"warning"`, the default) or fails the build (`"error"`) — an inconsistency the plain `go` command would never surface the same way, since it has no `bazel_dep`-equivalent override source.

## Findings

### 1. Go SDK sourcing: `go_sdk.from_file` and the `toolchain`/`go` precedence

`go_sdk.from_file(go_mod = "//:go.mod")` is the documented default setup; it
downloads a Go SDK matching the module file's declared version, and "version
extraction follows the same precedence for both file types: the `toolchain`
directive takes precedence over the `go` directive. If neither directive is
present, rules_go selects its minimum supported SDK, Go 1.20"
([rules_go docs/go/core/bzlmod.md § Go SDKs](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/bzlmod.md)).
This was run, not just read: in `fixtures/rules-go-and-nogo/bazel-go/go.mod`
with `go 1.27.0` **and** `toolchain go1.27.1`,
`bazel run @io_bazel_rules_go//go -- version` printed `go version go1.27.1
linux/amd64`; with the `toolchain` line deleted (nothing else changed) the
same command printed `go version go1.27.0 linux/amd64`. That is
[GO-MOD-02](../go-modules.md)'s CLI-carries-a-toolchain-line /
library-carries-none split, reproduced under Bazel's own SDK selection: a
fixture shaped like a fleet CLI (`go` floor plus a pinned `toolchain`) gets
exactly that patch release under Bazel; a fixture shaped like a fleet library
(bare `go` line, no `toolchain`) gets whatever the bare `go` line says, which
is the lowest version the code actually needs, matching the wave-2 guidance
that a library must not force a higher floor on its consumers.

`go_sdk.host()` exists but is explicitly discouraged in the same document,
because many OS package managers install Go into a version-numbered
directory (e.g. Debian's `/usr/lib/go-1.22/`), so a host package upgrade
silently moves what `go_sdk.host()` resolves to, outside Bazel's own
versioning (cites
[enola-dev/enola#713](https://github.com/enola-dev/enola/issues/713)). This
row is P1 in the map and is now RUN, not doc-derived.

Version currency itself was measured, not assumed: the BCR's
`modules/rules_go/metadata.json` lists `0.63.0` as the newest, non-yanked
version, published 2026-08-16 ([release
v0.63.0](https://github.com/bazel-contrib/rules_go/releases/tag/v0.63.0));
`modules/gazelle/metadata.json` lists `0.54.0`, published 2026-09-03
([release v0.54.0](https://github.com/bazelbuild/bazel-gazelle/releases/tag/v0.54.0)).
`bzlmod.md`'s own worked example writes `bazel_dep(name = "rules_go",
version = "0.57.0")` and `bazel_dep(name = "gazelle", version = "0.45.0")` —
6 and 9 minor releases behind, confirming and sharpening the map's "gazelle's
README lags its own `MODULE.bazel` by three minors" note (M-O-01): the lag is
real, larger than three minors as of this measurement, and it is the doc's
own example, not a README specifically.

### 2. `go_deps`, `use_repo` hygiene, and `bazel mod tidy`

`go_deps.from_file(go_mod = "//:go.mod")` "performs [Minimal Version
Selection](https://go.dev/ref/mod#minimal-version-selection) on all
transitive Go dependencies of all Bazel modules... For every major version of
a Go module, there will only ever be a single version in the entire build,
just as in regular Go module builds"
([bzlmod.md § External dependencies](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/bzlmod.md)).
Only **direct** dependencies of the root module need a `use_repo` entry;
"When using Bazel 7.1.1 or higher, the `@rules_go//go` target automatically
updates the `use_repo` call whenever the `go.mod` file changes, using `bazel
mod tidy`." This was run: deleting the fixture's `"io_rsc_quote"` entry from
`use_repo(go_deps, ...)` made `bazel build //cmd/greet:greet` fail with `no
such package '@@[unknown repo 'io_rsc_quote' ...`; running `bazel mod tidy`
(no other edit) restored the exact original `use_repo` block and the build
went green again.

The Gazelle repo-naming convention that a `use_repo` entry must match is
reverse-domain-with-underscores: `honnef.co/go/tools` → `co_honnef_go_tools`,
`rsc.io/quote` → `io_rsc_quote`. An agent guessing `rsc_io_quote` (forward
order) is wrong — `bazel mod tidy` is what should compute this name, never a
hand-written guess.

### 3. Gazelle directives and the BUILD-drift check

Gazelle's own reference distinguishes general directives
([reference.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/reference.md):
`exclude`, `follow`, `ignore`, `resolve`, `resolve_regexp`, `map_kind`,
`build_file_names`, `build_tags`, `default_visibility`, `lang`, `repository`,
`repository_macro`, `alias_kind`, `directive_file`,
`generation_mode`) from Go-specific ones
([language/go/reference.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/language/go/reference.md):
`go_search`, `go_test`, `go_grpc_compilers`, `go_gc_goopts`,
`go_gc_linkopts`, `go_copts/cppopts/cxxopts/clinkopts`,
`go_naming_convention`, `go_naming_convention_external`,
`go_proto_compilers`, `importpath_prefix`, `prefix`, `go_visibility`,
`go_generate_proto`). Grepping both dogfood repos'
`BUILD`/`BUILD.bazel` files for `^# gazelle:` directives, `exclude` is the
overwhelming majority (testdata, vendor, third_party, generated test files);
`prefix` and the two `go_naming_convention*` directives appear a handful of
times each; **zero** `# gazelle:resolve` or `resolve_regexp` overrides were
found in either repository as of the pinned SHAs.

The drift check is a Gazelle flag, not a Bazel one: `-mode=diff` "prints a
unified diff to stdout and does not write files to disk," and "Without
`-strict`, Gazelle may still exit non-zero in some cases (for example,
`-mode=diff` when changes are detected)"
([reference.md § Flags](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/reference.md)).
This was run: adding an untracked `.go` file to a package with no matching
`BUILD.bazel` update made `bazel run //:gazelle -- -mode=diff` exit 1 with
the exact two-file unified diff Gazelle would apply; running Gazelle in its
default `fix`/`update` mode applied the diff, and the same `-mode=diff`
invocation then exited 0 with no diff. `-strict` is a separate, additive
flag: "Gazelle exits with a non-zero status if any errors occurred during
the run," e.g. a syntax error in a BUILD file or an unknown directive; it
does not by itself detect the srcs-vs-BUILD drift `-mode=diff` catches.

### 4. `GO_TOOLS` and the `tool` directive

Go 1.24's `tool` directive in `go.mod` is surfaced by Gazelle ≥0.47.0 as a
generated `GO_TOOLS` dictionary exported from `@gazelle//:go_tools.bzl`,
itself a re-export of `@bazel_gazelle_go_repository_config//:go_tools.bzl`
([bzlmod.md § Depending on tools (Go 1.24+)](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/bzlmod.md)).
This was run: the fixture's `go.mod` carries `tool
golang.org/x/tools/cmd/stringer` (added via `go get -tool
golang.org/x/tools/cmd/stringer`), and after `bazel run //:gazelle`, reading
the generated repository's file directly showed
`GO_TOOLS = {k: Label(v) for k, v in {"stringer":
"@org_golang_x_tools//cmd/stringer:stringer"}.items()}`. The pre-1.24
alternative (a `tools.go` file with `//go:build tools` and blank imports) is
what the fixture used to pull `honnef.co/go/tools`'s analyzer packages into
`go.sum` for [nogo](#7-nogo-configuration-and-its-parity-gap-against-the-gate-of-record):
`go mod tidy` will *prune* an otherwise-unused `require` on a build-time-only
module unless something imports it, which is exactly why the pre-1.24
convention exists and why an agent cannot skip the blank-import file and
expect `go mod tidy` to keep the dependency.

### 5. Override precedence for Gazelle behavior

`bzlmod.md` states the order explicitly: "1. Specific `go_deps.gazelle_override`
overrides per module[;] 2. `go_deps.gazelle_default_attributes`, which will
overwrite #3[;] 3. [the] public registry for default Gazelle overrides,"
and recommends avoiding tier 2 in favor of upstreaming the fix to tier 3's
`default_gazelle_overrides.bzl`
([bzlmod.md § Overrides § Gazelle directives](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/bzlmod.md)).
This is doc-derived (P2 row, no fixture built for it): reproducing all three
tiers simultaneously needs a dependency that both ships a public-registry
override and gets a local one, which was judged not worth the fixture budget
for a P2 row; the primary source states the order unambiguously and in one
place, so the risk of a wrong reading is low.

### 6. Where MVS and Bazel module resolution diverge

Two distinct, both-documented divergence points. First: "If a Go module is
provided by Bazel though (with `bazel_dep`), that version is always selected
and cannot be overridden. `replace` directives, `config` tags, and similar
mechanisms are only effective in the root Bazel module"
([extensions.md § go_deps](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/extensions.md)).
Plain `go build`/`go list -m` has no such override source at all — MVS over
`go.mod`/`go.sum` is the only voice. Second: `go_deps.config(checks = ...)`
("How to handle problems with inconsistent versions, like a Go module being
requested at different versions with `go_deps.module` and `go.mod`.
`"error"` fails the build... `"warning"` prints a message... `"off"`
suppresses") governs an inconsistency class that has no equivalent in plain
`go build` either, because there is no `go_deps.module()`-style manual
override to be inconsistent with. Both are doc-derived for this dive (see
[Measurement disclosure](#measurement-disclosure)); a reviewer's first look
for a resolution mismatch is `MODULE.bazel`'s `bazel_dep` list against
`go.mod`'s `require` list for the same module path, then `go_deps.config`'s
`checks` value.

### 7. nogo configuration and its parity gap against the gate of record

`nogo` "runs in an action after the Go compiler... and rejects sources that
contain disallowed coding patterns from the configured analyzers," is
configured by listing analyzer `go_library` targets in a `nogo` rule's
`deps`, and is registered once per Bazel module via `go_sdk.nogo(nogo =
"//:my_nogo", includes = [...], excludes = [...])`, honored only for the
root module
([nogo.rst](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/go/nogo.rst);
[bzlmod.md § Configuring nogo](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/bzlmod.md)).
Under Bzlmod, "external repositories are not validated with `nogo` by
default" — the opposite of the legacy WORKSPACE default, where external
targets were validated unless excluded.

**`vet = True` is a narrow convenience, and this dive ran into its overlap
with `TOOLS_NOGO` directly.** "`Setting `vet = True` is equivalent to adding
the `atomic`, `bools`, `buildtag`, `nilfunc`, and `printf` analyzers from
`@org_golang_x_tools//go/analysis/passes` to the `deps` list" — the exact 5
analyzers [go-gates.md](../go-gates.md)'s GO-GATE-02 cites as the subset `go
test` already runs (`go1.27.1:src/cmd/go/internal/test/test.go:654`).
Writing `nogo(vet = True, deps = TOOLS_NOGO + [...])` together — a natural
first attempt at "run everything" — failed Bazel's analysis phase outright:
`Label '@@gazelle++go_deps+org_golang_x_tools//go/analysis/passes/nilfunc:go_default_library'
is duplicated in the 'deps' attribute`. `TOOLS_NOGO` alone (the full
`x/tools` analysis-passes tree) is already broader than `vet = True`'s 5, so
the fix is to drop `vet = True` once `TOOLS_NOGO` is present, never the
reverse.

**Neither `vet = True` nor `TOOLS_NOGO` gives GO-GATE-02's full 37-analyzer
`go vet ./...` parity, and neither gives GO-GATE-11's `nilness` coverage.**
`TOOLS_NOGO` is x/tools' `analysis/passes` tree, which is the same source
tree `go vet` itself is built from, but nothing in the rules_go docs claims
`TOOLS_NOGO` enumerates the full analyzer set 1:1 with what a pinned `go
vet` binary runs, and `nilness` (GO-GATE-11's finding) is not one of the 5
`vet = True` adds. A repository that wants nogo-level GO-GATE-02/11 parity
must audit `TOOLS_NOGO`'s actual analyzer list against `go tool vet help`'s
output at the pinned Go version and add any gap (including `nilness`)
explicitly — this dive did not run that full cross-check (P1, flagged as a
gap below) because it is a large enumeration exercise outside this dive's
fixture budget.

**staticcheck's SA-checks reach `nogo` as ordinary Bazel `go_library`
targets, with no special integration, because every staticcheck check is
itself shaped as an `analysis.Analyzer`.** Reading
`dominikh/go-tools@6cb65e58a558:staticcheck/sa9010/sa9010.go:15-22` directly:
`var SCAnalyzer = lint.InitializeAnalyzer(&lint.Analyzer{Analyzer:
&analysis.Analyzer{Name: "SA9010", Run: run, ...}, ...})` and `var Analyzer
= SCAnalyzer.Analyzer` — a package-level `Analyzer` var of the exact type
`nogo`'s `deps` attribute expects. This was run: `@co_honnef_go_tools//staticcheck/sa4023`
and `//staticcheck/sa9010` in the fixture's `nogo` `deps` list built and ran
with no `def.bzl` helper, no patch, nothing beyond an ordinary `go_deps`
entry for `honnef.co/go/tools` (pulled in via the `tools.go` blank-import
convention from [§4](#4-go_tools-and-the-tool-directive), since nothing in
the fixture's real code imports it).

### 8. The golangci-lint-to-nogo bridge: what exists, and its status

One community project answers this, and its own status labels matter more
than its existence: [sluongng/nogo-analyzer](https://github.com/sluongng/nogo-analyzer)
(`README.md`, pushed 2026-07-23) ships three sub-packages. Its own words:
"[staticcheck](./staticcheck/README.md): Stable and ready to be used[;]
[golangci-lint](./golangci-lint/README.md): POC-only. Should NOT be used
except for research purposes[;] [goci-lint](./goci-lint/README.md): An
attempt to skim down `golangci-lint` to make it more suitable while using
with `nogo`." The repository is WORKSPACE-only (`http_archive`, `WORKSPACE`
present) with **no `MODULE.bazel`** and **no Bazel Central Registry
listing** — it predates Bzlmod and has not been ported. Its staticcheck
analyzer list (`staticcheck/def.bzl`'s `ANALYZERS`) includes `SA4023` but
**not `SA9010`**, because the bridge's pinned `honnef.co/go/tools` snapshot
predates SA9010's introduction at staticcheck 2026.2
([go-tools/shifts.md §10](../go-topic-map/shifts.md)); a repository adopting
this bridge for staticcheck coverage gets a stale analyzer roster unless it
re-pins `honnef.co/go/tools` itself and re-derives the list, which the
bridge's own tooling (`bazel run //staticcheck/cmd/list_analyzers`) supports
but does not do automatically. `rules_go`'s own `nogo.rst` links to this
same repository as its answer to "Relationship with other linters," and
frames the choice as size-based: "Because `nogo` benefits from Bazel's
incremental build and caching, it is more suitable for large code bases. If
you have a smaller code base, you could use `golangci-lint` instead,"
adding "there is no way for `nogo` to apply the fixers coupled with the
analyzers," so a linter with autofix (golangci-lint, staticcheck standalone)
stays the ergonomic tool for *fixing*, and nogo stays the build-blocking
gate.

### 9. `go_test` race and pure modes

Both `race` and `pure` on `go_binary`/`go_test` are three-valued strings —
`"on"`, `"off"`, `"auto"` (the default for both) — not booleans:
"[`race`] Controls whether code is instrumented for race detection... Not
available when cgo is disabled. In most cases, it's better to control this
on the command line with `--@rules_go//go/config:race`"; "[`pure`] ... If
`auto`, pure mode is enabled when no C/C++ toolchain is configured or when
cross-compiling"
([rules.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/rules.md)).
This was run: a `go_test` with a genuinely racy 50-goroutine unsynchronized
increment, `race = "on"`, failed with the real Go race detector's report
(`WARNING: DATA RACE`, `--- FAIL: TestRacy`, exit non-zero); the identical
attribute on a second `go_test` target running only the mutex-protected
twin passed clean. Cross-compiling defaults `pure` to `"on"` automatically
(disabling cgo), which is why the [platform section](#11-cross-compilation-with---platforms)'s
ARM64 and Windows builds needed no extra attribute to succeed with no C
toolchain registered for either target platform.

### 10. Stamping with `x_defs` and the workspace status command

Bazel's own two primitives, composed: `--workspace_status_command=<program>`
runs a script that must print `KEY value` lines, partitioned into "stable"
(`bazel-out/stable-status.txt`, keys named `STABLE_*` trigger a re-link on
change) and "volatile" (`bazel-out/volatile-status.txt`, pretended never to
change so it never by itself forces a re-link)
([bazel.build/docs/user-manual § Workspace status](https://bazel.build/docs/user-manual)).
rules_go's `x_defs` attribute — collected transitively across a binary's
whole dependency graph — maps a Go variable name to a literal or, with
`{CURLY_BRACES}`, a workspace-status key: "You can reference these in
`x_defs` using curly braces... `x_defs = {"example.com/repo/version.Version":
"{STABLE_GIT_COMMIT}"}`"
([defines_and_stamping.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/defines_and_stamping.md)).
`--[no]stamp` gates whether this happens at all for a `*_binary`-shaped rule
(default `stamp = -1`, meaning "follow `--stamp`"); `*_test` rules default
`stamp = 0`, unconditionally unstamped, "regardless of `--[no]stamp`."

This was run end to end: `pkg/version.Version` defaults to the literal
`"dev"`; the fixture's `go_binary` sets `x_defs =
{"example.com/bzlfix/pkg/version.Version": "{STABLE_FIX_VERSION}"}`; a
`status.sh` script prints `STABLE_FIX_VERSION v9.9.9-bzlfix`. `bazel run
--stamp --workspace_status_command=<abs path to status.sh>
//cmd/greet:greet` printed `version: v9.9.9-bzlfix`; `bazel run --nostamp
//cmd/greet:greet` (no status command) printed `version: dev`. Stamping is
link-only, "not when compiling a package," so a stamp-value-only change
re-links a binary without recompiling the libraries feeding it.

### 11. Cross-compilation with `--platforms`

"rules_go can cross-compile Go projects to any platform the Go toolchain
supports. The simplest way to do this is by setting the `--platforms` flag
on the command line[:] `bazel build
--platforms=@rules_go//go/toolchain:linux_amd64 //my/project`... By default,
cross-compilation will cause Go targets to be built in "pure mode""
([cross_compilation.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/cross_compilation.md)).
This was run twice: `bazel build
--platforms=@io_bazel_rules_go//go/toolchain:linux_arm64
//cmd/greet:greet` produced `bazel-bin/cmd/greet/greet_/greet`, and `file`
reported "ELF 64-bit LSB executable, ARM aarch64... statically linked";
`--platforms=@io_bazel_rules_go//go/toolchain:windows_amd64` produced
`bazel-bin/cmd/greet/greet_/greet.exe`, and `file` reported "PE32+
executable for MS Windows... x86-64." Platform-specific source and
dependency selection goes through `select()` over rules_go's pre-declared
`config_setting`s under `@rules_go//go/platform:*`, listable with `bazel
query 'kind(config_setting, @rules_go//go/platform:all)'`
([platform-specific_dependencies.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/platform-specific_dependencies.md));
Gazelle generates these `select()` blocks automatically from GOOS/GOARCH
build constraints, so a hand-written `select()` over these labels is rarely
needed outside a genuinely mixed-platform dependency list.

## Normative guidance candidates

| # | Rule | Rationale | Verification | RUN? |
|---|---|---|---|---|
| BZL-GO-01 | Never hand-write a `use_repo(go_deps, ...)` entry name; run `bazel mod tidy` and commit the result. | Gazelle's repo-naming convention (reverse-domain, underscored) is not guessable in general (`rsc.io/quote` → `io_rsc_quote`, not `rsc_io_quote`), and `bazel mod tidy` computes and writes it exactly. | `bazel mod tidy` then `git diff --exit-code MODULE.bazel` in CI: a nonzero exit is unpinned drift. Empty diff is the pass. | **yes** — `fixtures/rules-go-and-nogo/bazel-go`: deleted `use_repo` entry → build fails with `no such package '@@[unknown repo ...`; `bazel mod tidy` restores it, build passes. |
| BZL-GO-02 | Declare the SDK with `go_sdk.from_file(go_mod = "//:go.mod")`, never `go_sdk.host()`, and know that a `toolchain` line in that `go.mod` — not the `go` line — is what Bazel's SDK actually resolves to when both are present. | `go_sdk.host()` tracks whatever the machine's package manager currently has installed, which is non-reproducible across an OS upgrade (rules_go's own docs cite [enola-dev/enola#713](https://github.com/enola-dev/enola/issues/713)); `toolchain` silently overriding `go` surprises anyone assuming the `go` line is authoritative. | `grep -n -e 'go_sdk.host(' -e 'go_sdk.from_file(' MODULE.bazel .` (directory operand required); a `go_sdk.host()` hit is the finding. Then `bazel run @rules_go//go -- version` and compare against `go.mod`'s `toolchain` (if present) or `go` line. | **yes** — same fixture: `go 1.27.0` + `toolchain go1.27.1` → SDK resolves 1.27.1; toolchain line removed → SDK resolves 1.27.0. |
| BZL-GO-03 | Wire `nogo` via `TOOLS_NOGO`, never `vet = True` alongside it, and treat `TOOLS_NOGO` as necessary but not sufficient for [GO-GATE-02](../go-gates.md)/[GO-GATE-11](../go-gates.md) parity — audit its analyzer list against `go tool vet help` and add `nilness` explicitly. | `vet = True`'s 5 analyzers are a strict subset of `TOOLS_NOGO`'s tree, so combining them is a Bazel-level duplicate-label error, not a semantic choice; `TOOLS_NOGO`'s exact analyzer roster relative to a pinned `go vet` binary's 37 is not documented as 1:1, and `nilness` is absent from `vet = True`'s 5 either way. | `nogo(vet = True, deps = TOOLS_NOGO + [...])` in the same `BUILD.bazel` fails `bazel build --nobuild //...` outright. The full-parity audit itself is a reading heuristic: diff `bazel query 'kind(go_library, @org_golang_x_tools//go/analysis/passes/...)'` against `go tool vet help`'s analyzer list at the pinned Go version. | **yes** for the duplicate-label failure (fixture, see above); **no** (reading heuristic only) for the full 37-analyzer parity audit — not run this dive, flagged as a gap. |
| BZL-GO-04 | Wire staticcheck's `SA*` checks into `nogo` as direct `go_library` deps (`@co_honnef_go_tools//staticcheck/saNNNN`), pulled into `go_deps` via a `tools.go` blank-import file (pre-1.24) or a `tool` directive (1.24+) — never expect `sluongng/nogo-analyzer`'s convenience list to be current. | Every staticcheck check is a real `analysis.Analyzer`, so it needs no bridge to run under `nogo`, but the one popular convenience wrapper for enumerating checks (`sluongng/nogo-analyzer`) is pinned behind staticcheck's release cadence and is missing SA9010 as of this dive. | `bazel build //<pkg>:<lib>` over a target that imports the analyzer package, with the check's known-violation and known-clean twins as the fixture. | **yes** — fixture built `@co_honnef_go_tools//staticcheck/sa4023` and `//staticcheck/sa9010` directly; both ran and correctly flagged (SA9010) / did not flag (SA4023, no violation planted for it in this dive) the fixture code. |
| BZL-GO-05 | Never treat `golangci-lint` as available under `nogo`. If a repository must run both, run `golangci-lint` as a separate CI step (per [go-gates.md](../go-gates.md)), and reserve `nogo` for the analyzers it can host natively (vet-family, staticcheck's SA-checks). | The only public bridge marks its golangci-lint half "POC-only. Should NOT be used except for research purposes," in the maintainer's own words, and it has no `MODULE.bazel`/BCR listing at all. | `grep -rn -e 'nogo_analyzer.*golangci' -e 'goci-lint' MODULE.bazel BUILD.bazel BUILD go/ .` (directory operand required); any hit that isn't a comment explaining a deliberate, reviewed research use is the finding. | no — reading heuristic only; the underlying "POC-only" fact is a primary-source read (the bridge's own README), not a fixture run, because there is nothing runnable to plant a violation against. |
| BZL-GO-06 | Add a Gazelle drift check (`gazelle -mode=diff`, wired with `-strict`) as its own CI step, separate from and prior to `bazel build //...`. | Bazel's own build goes green over a stale or missing `BUILD.bazel` as long as the existing rules still compile; only Gazelle itself detects that the file no longer matches the source tree. | `bazel run //:gazelle -- -mode=diff`; nonzero exit is the finding (drift exists), zero is the pass. Add `-strict` for a hard-fail on a BUILD syntax error or unknown directive, which `-mode=diff` alone does not itself guarantee. | **yes** — fixture: untracked `.go` file added with no `BUILD.bazel` update → `-mode=diff` exits 1 with the exact diff; `bazel run //:gazelle` (fix mode) applies it; `-mode=diff` then exits 0. |
| BZL-GO-07 | Set `race = "on"` explicitly on any `go_test` a CI race lane must cover, never rely on the `"auto"` default to mean "on" — `"auto"`'s actual behavior is undocumented as a fixed value and the docs steer toward the `--@rules_go//go/config:race` command-line flag for fleet-wide control instead of the per-target attribute. | `race`/`pure` are three-valued strings, and an agent trained on booleans (`race = True`) writes a value Bazel rejects outright at analysis time — a louder failure than a silently-wrong default, but still a wrong first guess to avoid. | `bazel test //<pkg>:<test> --test_output=errors` with the attribute set; a genuinely racy fixture must print `WARNING: DATA RACE` and fail; its mutex-protected twin, same attribute, must pass. | **yes** — fixture: `race = "on"` on a 50-goroutine unsynchronized-increment test failed with the real race detector's report; the mutex-protected twin under the identical attribute passed. |
| BZL-GO-08 | Stamp a Go binary's version through `x_defs` plus `--stamp --workspace_status_command=<script>`, never through a hand-maintained `-ldflags -X` invocation wired around Bazel, and read the [GO-REL](../go-rel.md) recipe's key names when both a Bazel and a non-Bazel release path exist so the two agree on what "the version string" means. | `x_defs` is collected transitively across the whole dependency graph and is the only stamping surface rules_go documents; a parallel hand-rolled `-ldflags` path bypasses Bazel's caching semantics for stamped actions (stable vs. volatile status) entirely. | `bazel run --stamp --workspace_status_command=<script> //<pkg>:<bin>` then run the binary and read the stamped value back; `--nostamp` (or no `--workspace_status_command`) must show the `x_defs` literal default instead. | **yes** — fixture: `--stamp` + status script → binary prints `version: v9.9.9-bzlfix`; `--nostamp` → binary prints `version: dev`. |
| BZL-GO-09 | Cross-compile with `--platforms=@rules_go//go/toolchain:<goos>_<goarch>`, never by setting `GOOS`/`GOARCH` in the build environment or in a wrapper script around `bazel build`. | rules_go's own toolchain registration is what selects the SDK and the pure/cgo mode for the target platform; an env-var override sits outside Bazel's action graph entirely and produces a build Bazel's own cache does not know is platform-specific. | `bazel build --platforms=@rules_go//go/toolchain:<goos>_<goarch> //<pkg>:<bin>` then `file` on the output; the reported architecture/format must match the requested platform. | **yes** — fixture: `linux_arm64` → real ELF/aarch64; `windows_amd64` → real PE32+ `.exe`. |
| BZL-GO-10 | Never assume a Go module version conflict resolves the way plain `go build`'s MVS would once any Bazel module declares that same Go module via `bazel_dep` — read `MODULE.bazel`'s `bazel_dep` list first, `go.mod`'s `require` list second, and `go_deps.config`'s `checks` value third, in that order, when a version looks wrong. | "If a Go module is provided by Bazel (with `bazel_dep`), that version is always selected and cannot be overridden" — a plain `go list -m` mental model has no answer for this case at all, because it has no `bazel_dep`-equivalent override source to consult. | Doc-derived reading heuristic: grep `MODULE.bazel` for `bazel_dep(name = "<go-module-derived-name>"` alongside `go.mod`'s `require` for the same underlying module path; a mismatch with no comment explaining it is the finding. | no — doc-derived only this dive (see [Measurement disclosure](#measurement-disclosure)); reproducing the cross-module case needs a second registered Bazel module and was judged not worth the fixture budget for a P2 row. |

## Verification runs

All commands ran from `/home/mherwig/.cache/research-lang/go-tools/fixtures/rules-go-and-nogo/bazel-go`
via `ocx exec -- bazelisk <args>` (bazelisk 1.28.1 → Bazel 9.2.0, downloaded
live). `.bazelversion` pins `9.2.0`.

1. **`go_sdk.from_file` toolchain-vs-go precedence** (BZL-GO-02).
   - Violation-shaped input: `go.mod` with `go 1.27.0` and `toolchain go1.27.1`.
     `bazel run @io_bazel_rules_go//go -- version` → `go version go1.27.1
     linux/amd64`.
   - Twin: `toolchain` line deleted, `go.mod` left at bare `go 1.27.0`.
     Same command → `go version go1.27.0 linux/amd64`.
   - Not a pass/fail pair — both are correct behavior, demonstrating the
     documented precedence rule empirically rather than a MUST/finding pair.

2. **Missing `use_repo` entry** (BZL-GO-01).
   - Violation: `"io_rsc_quote"` deleted from `use_repo(go_deps, ...)` in
     `MODULE.bazel`. `bazel build //cmd/greet:greet` → exit 1: `ERROR: no
     such package '@@[unknown repo 'io_rsc_quote' requested from @@]//':
     The repository '@@[unknown repo 'io_rsc_quote' requested from @@]'
     could not be resolved`.
   - Fix: `bazel mod tidy` → exit 0, `MODULE.bazel` restored verbatim.
     `bazel build //cmd/greet:greet` → exit 0: `Target //cmd/greet:greet
     up-to-date`.

3. **`nogo`: `vet = True` + `TOOLS_NOGO` duplicate-label error** (BZL-GO-03).
   - Violation: `nogo(name = "my_nogo", vet = True, deps = TOOLS_NOGO + [...])`.
     `bazel run //:gazelle` (any build touching the `nogo` target's package
     graph) → exit 1: `ERROR: .../BUILD.bazel:8:5: Label
     '@@gazelle++go_deps+org_golang_x_tools//go/analysis/passes/nilfunc:go_default_library'
     is duplicated in the 'deps' attribute of rule 'my_nogo_actual'` (and 4
     more duplicate-label errors for `bools`, `printf`, `buildtag`, `atomic`).
   - Fix: `vet = True` removed, `deps = TOOLS_NOGO + [...]` unchanged.
     `bazel run //:gazelle` → exit 0, build completes.

4. **`nogo`: copylocks violation** (BZL-GO-03/04, GO-GATE-02).
   - Violation: `pkg/lockbug/lockbug.go` — `Bump(c Counter)` copies a
     `sync.Mutex`-carrying struct by value. `bazel build
     //pkg/lockbug:lockbug` → exit 1: `nogo: errors found by nogo during
     build-time code analysis: pkg/lockbug/lockbug.go:14:13: Bump passes
     lock by value: example.com/bzlfix/pkg/lockbug.Counter contains
     sync.Mutex (copylocks)`.
   - Twin: `pkg/lockbug_fixed/lockbug_fixed.go` — identical shape,
     `Bump(c *Counter)`. `bazel build //pkg/lockbug_fixed:lockbug_fixed` →
     exit 0.

5. **`nogo`: SA9010 violation** (BZL-GO-04, GO-ERR-06).
   - Violation: `pkg/timerbug/timerbug.go` — `defer Start()` discards the
     returned stop closure. `bazel build //pkg/timerbug:timerbug` → exit 1:
     `nogo: errors found by nogo during build-time code analysis:
     pkg/timerbug/timerbug.go:19:2: deferred return function not called
     (SA9010)`. Confirmed independently outside Bazel too: `staticcheck
     -checks SA9010 ./pkg/timerbug/...` → exit 1, same message.
   - Twin: `pkg/timerbug_fixed/timerbug_fixed.go` — `defer Start()()`.
     `bazel build //pkg/timerbug_fixed:timerbug_fixed` → exit 0.
     `staticcheck -checks SA9010 ./pkg/timerbug_fixed/...` → exit 0.

6. **BUILD drift via `gazelle -mode=diff`** (BZL-GO-06).
   - Violation: `pkg/version/extra.go` added, `BUILD.bazel` left untouched.
     `bazel run //:gazelle -- -mode=diff` → exit 1, printing the unified
     diff adding `extra.go` (and, incidentally, a second pre-existing
     unformatted `srcs` list in `cmd/greet/BUILD.bazel`) to the affected
     `srcs` attributes.
   - Fix: `bazel run //:gazelle` (default fix mode) → exit 0, BUILD files
     rewritten. `bazel run //:gazelle -- -mode=diff` re-run → exit 0, no
     diff.

7. **`go_test(race = "on")` against a real data race** (BZL-GO-07).
   - Violation: `cmd/greet/race_test.go`'s `TestRacy` increments a shared
     `int` from 50 goroutines with no synchronization; `go_test(name =
     "greet_test", race = "on")`. `bazel test //cmd/greet:greet_test
     --test_output=errors` → test target reports FAILED; log shows
     `WARNING: DATA RACE`, two conflicting writes at
     `cmd/greet/race_test.go:19`, and `--- FAIL: TestRacy (0.00s):
     testing.go:1865: race detected during execution of test`.
   - Twin: `cmd/greet/race_fixed_test.go`'s `TestRacyFixed` calls the
     package's mutex-protected `race()` helper instead; `go_test(name =
     "greet_fixed_test", race = "on")`. `bazel test
     //cmd/greet:greet_fixed_test --test_output=errors` → PASSED.

8. **Stamping via `x_defs` + `--workspace_status_command`** (BZL-GO-08).
   - Baseline (no stamp): `bazel run --nostamp //cmd/greet:greet` → prints
     `version: dev` (the `x_defs`-targeted variable's literal default).
   - Stamped: `status.sh` prints `STABLE_FIX_VERSION v9.9.9-bzlfix`;
     `go_binary`'s `x_defs = {"example.com/bzlfix/pkg/version.Version":
     "{STABLE_FIX_VERSION}"}`. `bazel run --stamp
     --workspace_status_command=<absolute path to status.sh>
     //cmd/greet:greet` → prints `version: v9.9.9-bzlfix`. (A relative
     `./status.sh` path failed with `status.sh: command not found` — the
     flag's value is resolved as a program to exec, not shell-relative to
     the invocation directory; an absolute path is what worked.)

9. **Cross-compilation via `--platforms`** (BZL-GO-09).
   - `bazel build --platforms=@io_bazel_rules_go//go/toolchain:linux_arm64
     //cmd/greet:greet` → exit 0; `file bazel-bin/cmd/greet/greet_/greet` →
     `ELF 64-bit LSB executable, ARM aarch64, ... statically linked`.
   - `bazel build --platforms=@io_bazel_rules_go//go/toolchain:windows_amd64
     //cmd/greet:greet` → exit 0, output path
     `bazel-bin/cmd/greet/greet_/greet.exe`; `file` → `PE32+ executable for
     MS Windows 10.00 (console), x86-64`.

10. **`tool` directive → `GO_TOOLS`** (BZL-GO from §4, informational, not a
    MUST row on its own).
    - `go.mod` carries `tool golang.org/x/tools/cmd/stringer` (added via
      `go get -tool golang.org/x/tools/cmd/stringer`). After `bazel run
      //:gazelle`, the generated repository's `go_tools.bzl` (read directly
      from the output-base's `external/gazelle++go_deps+bazel_gazelle_go_repository_config/`
      directory) contains: `GO_TOOLS = {k: Label(v) for k, v in
      {"stringer": "@org_golang_x_tools//cmd/stringer:stringer"}.items()}`.

Not run this dive (flagged, not silently assumed): the `bazel_dep`-wins MVS
override case and the `go_deps.config(checks=...)` internal-consistency
case (BZL-GO-10) — see [Measurement disclosure](#measurement-disclosure);
and the full `TOOLS_NOGO`-vs-`go tool vet help` 37-analyzer enumeration
(BZL-GO-03's "sufficient" half) — reading the two lists side by side is
mechanical but was not completed inside this dive's time budget, and is
recorded as a gap rather than a claimed pass.

## Exemplar evidence

Both Bazel-for-Go exemplars are dogfood, per the map's F-shape
([go-topic-map.md §5](../go-topic-map.md)):

- **`bazel-contrib/rules_go@970e99d77c8b:MODULE.bazel:33-46`** —
  `go_sdk.from_file(name = "go_default_sdk", go_mod = "//:go.mod")` plus
  `go_deps.from_file(go_mod = "//:go.mod")`: the `go.mod`-based shape, at
  the exact pinned SHA this program's audits used.
- **`bazelbuild/bazel-gazelle@63c9a3d2078f:MODULE.bazel:32-52`** — no
  `go_sdk.from_file` call of its own (rides `rules_go`'s auto-downloaded
  SDK) and `go_deps.from_file(go_work = "//:go.work")`: the `go.work`-based
  shape, the one [bazelbuild/bazel-gazelle#1797](https://github.com/bazelbuild/bazel-gazelle/issues/1797)'s
  limitation applies to. Confirms the map's F-shape split is real at the
  file level, not just "both use Bazel for Go" — the two canonical
  exemplars pick the two different `go_deps.from_file` shapes rules_go
  documents.
- **Gazelle directive census, both repos, `# gazelle:*` in
  `BUILD`/`BUILD.bazel`**: `exclude` dominates (testdata, vendor,
  third_party, `*_test.go`, generated files, tool-specific subtrees);
  `prefix`, `go_naming_convention`, `go_naming_convention_external` appear
  a handful of times each; **zero** `resolve`/`resolve_regexp` hits in
  either repository. This directly contradicts treating "stale `resolve`
  overrides" as a live concern for these two exemplars specifically — it
  may still be a real concern in a larger, non-dogfood Bazel-for-Go
  repository this program has no exemplar for.
- **`dominikh/go-tools@6cb65e58a558:staticcheck/sa9010/sa9010.go:15-22`**
  — the exact source confirming SA9010 is a plain `analysis.Analyzer`,
  cited above and used directly to build the fixture's nogo wiring.
- **No exemplar contradicts any Normative candidate above.** The corpus
  has exactly two Bazel-for-Go repositories and both are the ruleset's own
  dogfood, so "exemplar evidence" here is necessarily thin — the
  fixture-run verifications above are the primary evidence source for
  this depth file, with the exemplars serving mainly to confirm the two
  `go_deps.from_file` shapes and the directive census, not to independently
  corroborate the nogo/stamping/platform rows.

## AI-agent angle

1. **Writing `race = True` / `pure = True` (booleans) instead of the
   three-valued strings `"on"`/`"off"`/`"auto"`.** Every other
   Bazel-adjacent boolean-shaped attribute in rules_go and core Bazel
   really is a Starlark `bool`, so the pattern-match is natural and wrong
   here specifically; Bazel rejects it at analysis time with a type error,
   loudly, but an agent that "fixes" the error by guessing at a differently
   wrong value (e.g. `race = "true"`) burns a second round-trip. Mechanical
   check: `grep -rn -e 'race = True' -e 'race = False' -e 'pure = True' -e 'pure = False' --include='BUILD.bazel' --include='BUILD' .` — any hit is the finding, empty output is the pass (BZL-GO-07).
2. **Assuming `TOOLS_NOGO` already IS `go vet`'s full analyzer set**,
   because both are described as "the x/tools analyzers," and skipping the
   nilness/staticcheck gap entirely. The nogo docs never claim numeric
   parity with a pinned `go vet` binary; an agent that reads "run all the
   `golang.org/x/tools` analyzers" as "this is `go vet`" ships a
   Bazel-gated build that is quietly weaker than the CI's own `go vet
   ./...` step. Mechanical check: BZL-GO-03's list-diff heuristic; no
   single grep catches this, it needs the two enumerations compared.
3. **Wiring `vet = True` alongside `TOOLS_NOGO` "to be thorough."** This
   dive hit this exact failure while drafting the fixture — a natural
   first instinct that Bazel itself rejects with a duplicate-label error,
   not a silent double-run. Mechanical check: `nogo(vet = True, deps =
   TOOLS_NOGO + [...])` in the same rule is the pattern; `bazel build
   --nobuild //...` catches it immediately (BZL-GO-03).
4. **Reaching for `sluongng/nogo-analyzer`'s golangci-lint half as a
   working bridge**, because it is the only search result and its
   existence reads as "solved." Its own maintainer marks it POC-only; an
   agent that does not read the linked README past "a repository exists"
   ships a research-grade tool as a CI gate. Mechanical check: read the
   linked repository's own status table before citing it as a solution,
   never cite it from a search snippet alone (BZL-GO-05).
5. **Setting `GOOS`/`GOARCH` environment variables around a `bazel build`
   invocation**, the idiomatic plain-`go build` cross-compilation
   mechanism, instead of `--platforms`. Bazel's own action graph does not
   see an env var set outside its declared `--action_env`/`--repo_env`
   surface as a build input at all, so the env-var approach either does
   nothing (Bazel still builds for the host platform) or produces a build
   whose cache key does not reflect the platform it actually targeted.
   Mechanical check: `grep -rn -e 'GOOS=' -e 'GOARCH=' --include='*.sh' --include='*.yml' --include='*.yaml' .` in a Bazel-built Go repository's CI/scripts is the finding; the fix is `--platforms=@rules_go//go/toolchain:<goos>_<goarch>` (BZL-GO-09).
6. **Writing `-ldflags -X` flags into a `go_binary`'s attributes or a
   wrapper script, by analogy with plain-`go build` version stamping**,
   instead of `x_defs` plus `--stamp`/`--workspace_status_command`.
   rules_go does not document `-ldflags` as a supported `go_binary`
   attribute for this purpose; an agent porting a Makefile's `-ldflags
   "-X main.version=$(git describe)"` line finds no attribute to paste it
   into and may invent one. Mechanical check: `grep -rn -e 'ldflags.*-X' --include='BUILD.bazel' --include='BUILD' .` is the finding; the fix is `x_defs` (BZL-GO-08).
7. **Assuming `go_sdk.host()` is the "obvious" first choice** because it
   needs no version number and mirrors "just use whatever Go is on the
   machine," which is exactly the reproducibility failure rules_go's own
   docs warn against. Mechanical check: `grep -n 'go_sdk.host(' MODULE.bazel .` — any hit with no adjacent comment explaining a deliberate, narrow use is the finding (BZL-GO-02).
8. **Hand-typing a `use_repo` entry's repo name** instead of running
   `bazel mod tidy`, guessing the naming convention wrong in either
   direction (forward vs. reverse domain order) often enough that it is
   worth naming explicitly. Mechanical check: after any `go.mod` or
   `MODULE.bazel` edit touching dependencies, `bazel mod tidy` followed by
   `git diff --exit-code MODULE.bazel` in CI is the backstop regardless of
   how the entry was first written (BZL-GO-01).

## Contested / evolving

- **Whether `TOOLS_NOGO` should be read as "vet parity" is unsettled in the
  primary docs themselves** — nothing in `nogo.rst` or `bzlmod.md` states
  the analyzer list's relationship to a specific `go vet` version's
  roster, and this dive did not complete the enumeration to settle it
  empirically either (flagged as a gap in [§7](#7-nogo-configuration-and-its-parity-gap-against-the-gate-of-record)
  and BZL-GO-03). Direction: the map's own P1 framing (row M-O-05) treats
  this as worth closing, so a future revision of this file should run the
  `bazel query 'kind(go_library,
  @org_golang_x_tools//go/analysis/passes/...)'` vs. `go tool vet help`
  diff and publish the exact gap set.
- **The golangci-lint-to-nogo bridge question is trending toward "there
  isn't one, and that's an accepted state," not "one is coming."**
  rules_go's own `nogo.rst` frames the choice between `nogo` and
  `golangci-lint` as a repository-size decision, not a migration path
  ("if you have a smaller code base, you could use `golangci-lint`
  instead"), and the one community bridge attempt at the golangci-lint
  half stalled at POC. As of 2026-09-26 this reads as a stable equilibrium
  rather than an in-progress convergence.
- **`go.work`-based `go_deps.from_file` inherits an open upstream
  limitation** ([bazelbuild/bazel-gazelle#1797](https://github.com/bazelbuild/bazel-gazelle/issues/1797),
  filed against Gazelle 908ba74, open as of 2026-09-26) around indirect
  dependencies that also form a cycle across workspace boundaries. The
  one comment on the issue (2024-05-07) proposes a mapping-override
  design but no PR has landed; a repository choosing `go.work` under
  Bzlmod should read this issue's current state before relying on
  workspace-wide version pinning across a dependency cycle.
- **The `go_deps.config(checks = "warning")` default is a soft landing
  a repository must actively tighten.** The default silently prints a
  message on a version inconsistency rather than failing the build; this
  dive did not measure how many public Bazel-for-Go repositories override
  it to `"error"`, because the exemplar corpus has only the two dogfood
  repositories and neither exercises `go_deps.module()` overrides in a way
  that would surface this setting's effect. Direction unclear from this
  corpus alone.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_go docs/go/core/bzlmod.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/bzlmod.md) | Primary — rules_go's own Bzlmod setup guide | fetched 2026-09-26, `master` | The single source for `go_sdk.from_file` precedence, `go_deps` overrides, `GO_TOOLS`, and the override-precedence order; every §1–6 finding above traces back to this file. |
| [rules_go go/nogo.rst](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/go/nogo.rst) | Primary — rules_go's own nogo reference | fetched 2026-09-26, `master` | Full `nogo` API, `vet = True`'s exact analyzer list, the `nogo` vs. `golangci-lint` framing, and the pointer to `sluongng/nogo-analyzer`. |
| [rules_go docs/go/core/rules.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/rules.md) | Primary — generated Stardoc rule reference | fetched 2026-09-26, `master` | `go_binary`/`go_test`'s `race`, `pure`, `embedsrcs`, `x_defs`, `gc_goopts` attribute definitions and types. |
| [rules_go docs/go/core/defines_and_stamping.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/defines_and_stamping.md) | Primary — rules_go's own stamping guide | fetched 2026-09-26, `master` | The `x_defs` + workspace-status-command recipe verified end to end in this dive's fixture. |
| [rules_go docs/go/core/cross_compilation.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/cross_compilation.md) | Primary — rules_go's own cross-compilation guide | fetched 2026-09-26, `master` | `--platforms` syntax and the pure-mode-by-default-when-cross-compiling behavior confirmed in the fixture. |
| [rules_go docs/go/core/platform-specific_dependencies.md](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/docs/go/core/platform-specific_dependencies.md) | Primary — rules_go's own platform-select() guide | fetched 2026-09-26, `master` | `select()` over `@rules_go//go/platform:*` `config_setting`s, and that Gazelle generates these automatically. |
| [bazel-gazelle README.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/README.md) | Primary — Gazelle's own top-level README | fetched 2026-09-26, `master` | Orientation and links into `extend.md`/`reference.md`; confirms the repo's top-level doc structure used to find the other files below. |
| [bazel-gazelle extend.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/extend.md) | Primary — Gazelle's language-extension authoring guide | fetched 2026-09-26, `master` | Background on how Gazelle's Go extension and the `go_deps` module extension relate to Gazelle's core walk/merge/resolve pipeline. |
| [bazel-gazelle extensions.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/extensions.md) | Primary — generated Stardoc for `go_deps` | fetched 2026-09-26, `master` | The complete `go_deps` tag-class API: `from_file`, `config`, `module`, `module_override`, `archive_override`, `gazelle_override`, `gazelle_default_attributes` — the source for §2, §5, §6. |
| [bazel-gazelle reference.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/reference.md) | Primary — Gazelle's general command/flag/directive reference | fetched 2026-09-26, `master` | `-mode=diff`, `-strict`, and the general (language-agnostic) directive list used for the directive census in §3. |
| [bazel-gazelle language/go/reference.md](https://raw.githubusercontent.com/bazelbuild/bazel-gazelle/master/language/go/reference.md) | Primary — Gazelle's Go-extension directive reference | fetched 2026-09-26, `master` | The Go-specific directive list (`go_naming_convention`, `prefix`, `go_search`, etc.) completing the §3 census. |
| [bazelbuild/bazel-gazelle#1797](https://github.com/bazelbuild/bazel-gazelle/issues/1797) | Primary — open upstream issue | filed 2024-05-07, open as of 2026-09-26 | The exact, named limitation of `go_work`-based `go_deps.from_file` around dependency cycles across workspace boundaries; cited by `bzlmod.md` itself. |
| [bazel.build/docs/user-manual](https://bazel.build/docs/user-manual) | Primary — Bazel's own Commands and Options reference | page `dateModified` 2026-09-05, fetched 2026-09-26 | Canonical `--stamp` and `--workspace_status_command` semantics (stable vs. volatile status files), independent of rules_go. |
| [BCR rules_go metadata.json](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_go/metadata.json) | Primary — Bazel Central Registry module metadata | fetched 2026-09-26 | Ground truth for the current, non-yanked version list (0.63.0 newest) used to measure the docs' version-lag. |
| [BCR gazelle metadata.json](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/gazelle/metadata.json) | Primary — Bazel Central Registry module metadata | fetched 2026-09-26 | Same, for gazelle (0.54.0 newest). |
| [rules_go release v0.63.0](https://github.com/bazel-contrib/rules_go/releases/tag/v0.63.0) | Primary — GitHub release | published 2026-08-16 | Publish date for the version pinned in this dive's fixture `MODULE.bazel`. |
| [bazel-gazelle release v0.54.0](https://github.com/bazelbuild/bazel-gazelle/releases/tag/v0.54.0) | Primary — GitHub release | published 2026-09-03 | Publish date for the gazelle version pinned in this dive's fixture `MODULE.bazel`. |
| [sluongng/nogo-analyzer README.md](https://raw.githubusercontent.com/sluongng/nogo-analyzer/master/README.md) (+ `staticcheck/README.md`, `staticcheck/def.bzl`) | Secondary — community bridge project, linked from rules_go's own `nogo.rst` | pushed 2026-07-23, fetched 2026-09-26 | The only golangci-lint/staticcheck-to-nogo bridge found; its own status labels ("Stable" vs. "POC-only") are the primary evidence for §8/BZL-GO-05. |
| `dominikh/go-tools@6cb65e58a558:staticcheck/sa9010/sa9010.go` | Exemplar corpus — pinned clone, per [go-frame.md](../go-frame.md) | cloned 2026-09-26 at pinned SHA | Direct proof that SA9010 (and by construction every staticcheck check) is a plain `analysis.Analyzer`, which is why it needs no special nogo integration. |

## Gaps

- **The full `TOOLS_NOGO`-vs-`go tool vet help` analyzer enumeration was
  not run.** This is the single largest remaining hole against the map's
  P1 framing of M-O-05; closing it needs `bazel query 'kind(go_library,
  @org_golang_x_tools//go/analysis/passes/...)'` diffed against `go tool
  vet help`'s output at Go 1.27.1, both of which are mechanical but were
  not completed inside this dive.
- **M-O-08's override-precedence order and M-O-09's `bazel_dep`-wins /
  `checks=` divergence are doc-derived, not fixture-run**, for the reasons
  stated in each finding; both read unambiguously from a single primary
  source, which limits (but does not eliminate) the risk of a misreading.
- **The exemplar corpus has exactly two Bazel-for-Go repositories, and both
  are the tooling's own dogfood.** Every claim about "how a Bazel-for-Go
  repository looks in practice" beyond the two ruleset repositories
  themselves is untested against real-world adoption; this file's
  authority rests on primary documentation plus this dive's own fixture,
  not on breadth of exemplar practice.
