---
title: "Bazel for Go — workspace_status recipe, stamped reproducibility, stripped-binary govulncheck, nogo stdversion"
topic: "BZL-GO revision inputs for BZL-GO-09, BZL-GO-11 and BZL-GO-06; holds every existing BZL-GO ID stable"
agent: stamping-and-release-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 14
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-release/ (base, repro-a, repro-b, output-base-a, output-base-b)
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/stamping-and-release/ (govuln-bazel/, nogo-stdversion/)
scope: >
  In scope: --workspace_status_command path forms (BZL-GO-09), --stamp reproducibility with
  STABLE_*-only x_defs vs a volatile-key regression, -c opt / --strip interaction and file(1)
  stripped status, govulncheck -mode=binary on stripped vs unstripped Bazel binaries (BZL-GO-11),
  and nogo's stdversion pass (BZL-GO-06). Out of scope: go_work, bazel-gazelle#1797, Windows
  runtime (all deferred by the brief) and every other BZL-GO row already settled in go-bazel.md.
---

## Table of contents

1. Summary
2. Findings
   1. `--workspace_status_command` path forms (BZL-GO-09)
   2. Reproducible stamped release: STABLE_*-only vs a volatile key in `x_defs`
   3. `-c opt` / `--strip` and `file(1)`'s stripped status
   4. `govulncheck -mode=binary` on stripped vs unstripped Bazel binaries (BZL-GO-11)
   5. nogo `stdversion` is a structural no-op under rules_go 0.63.0 (BZL-GO-06)
3. Normative guidance candidates
4. Verification runs
5. Exemplar evidence
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- BZL-GO-09's recipe must be **an absolute path**, passed either on the command line or in
  `.bazelrc`. A relative path (`status.sh`, `./status.sh`) and the documented `%workspace%/status.sh`
  form all failed (3 of 4 tries), identically under `ocx exec -- bazelisk` and a plain shell with
  bazelisk on `PATH`, and identically whether typed on the command line or baked into `.bazelrc`.
- The `%workspace%/status.sh` failure is not a stale-server artifact: it reproduces after
  `bazelisk shutdown` and a fresh server start, with `--announce_rc` confirming the flag is read
  and passed through as the literal string `%workspace%/status.sh` before failing at execution
  with "Process exited with status 1" (never reaching the script — no debug line was written).
- A compliant stamped release (`x_defs` referencing only `STABLE_*` keys, `BUILD_TIMESTAMP`
  present in the status script but never referenced) is **byte-identical** (sha256) across two
  clones in differently-named directories with separate `--output_base`, both under the default
  build and under `-c opt --strip=always --stamp`.
- The red twin — one `x_defs` entry mapping to the volatile `BUILD_TIMESTAMP` key — breaks
  reproducibility immediately: different sha256, different embedded value, on the same source
  tree, confirming `--stamp` is not itself the determinism control (BZL-HERM-17/18, BZL-CACHE-20);
  which keys are referenced is.
- The default `go_binary` (fastbuild, no explicit `--strip`) reports `stripped` under `file(1)`.
  `-c opt` alone reports **`with debug_info, not stripped`** — Bazel's own `--strip` default is
  `sometimes`, defined as "strip if `--compilation_mode` is `fastbuild`" (bazel.build user manual),
  so an opt release build does **not** strip unless `--strip=always` is passed explicitly.
- `govulncheck -mode=binary` over-reports on a **stripped Bazel-built binary** the same way
  GO-REL-05 measured for a plain `go build -ldflags=-s -w` binary: the default (fastbuild,
  stripped) Bazel binary reported 1 finding (`GO-2026-5970`) that the identical `--strip=never`
  twin did not — govulncheck's own text names the mechanism: "may also report false positives for
  code that is in the binary but unreachable" once symbol information for reachability is gone.
- **BZL-GO-11 needs GO-REL-05's unstripped-twin triage clause.** A Bazel release that ships
  stripped must build a `--strip=never` sibling and diff the finding sets before trusting the
  shipped artifact's scan.
- A Bazel release recipe, measured: `-c opt --strip=always --stamp
  --workspace_status_command=<absolute path>`, with `x_defs` restricted to `STABLE_*` keys, for
  the shipped artifact; a `--strip=never` twin built from the same source, used only for
  `govulncheck -mode=binary` triage, never shipped.
- **Adding `@org_golang_x_tools//go/analysis/passes/stdversion` to nogo's `deps` does nothing
  under rules_go 0.63.0.** A throwaway always-firing nogo analyzer measured
  `pass.Pkg.GoVersion() == "go1.27.1"` (the selected SDK's own version) for a package whose
  `go.mod` says `go 1.26.0` plus `toolchain go1.27.1` — nogo never sees the module's `go` line at
  all, only the SDK version rules_go picked for it.
- The same planted `bytes.CutLast` (Go 1.27-only) call under `go 1.26.0` built **green under nogo
  both when it should be red and when it is genuinely green** — nogo gives no distinguishing
  signal either way. The identical plant is caught correctly by the plain `go` toolchain
  (`go vet -stdversion`, exit 3, "requires go1.27 or later (file is go1.26)") and by BZL-GO-07's
  external route (`bazel run @rules_go//go -- vet -stdversion ./...`).
- **BZL-GO-06 should not gain stdversion.** GO-MOD-01's floor is enforced under Bazel only through
  BZL-GO-07's external vet invocation (already a MUST), never through nogo.
- Separately, and regardless of the Bazel result above: `testing/synctest` is **permanently
  excluded** from stdversion's checking once the file's version is `>= go1.24`
  (`internal/typesinternal/toonew.go`), because the package was `GOEXPERIMENT`-gated before GA. A
  `synctest`-based plant can never be a stdversion witness, on plain `go` or under nogo; use an
  ordinary package (`bytes.CutLast` here) to test this analyzer at all.
- `bytes.CutLast` (and `strings.CutLast`) is a clean, version-real, non-excluded probe symbol for
  any future stdversion fixture: added in Go 1.27 (go.dev/doc/go1.27, issue #71151), in an ordinary
  package with no special-case exclusion.

## Findings

### 1. `--workspace_status_command` path forms (BZL-GO-09)

Fixture: `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-release/base/` (copied
from `go-bazel-consolidation/bazel-go-devdeps`), target `//cmd/greet:greet`, Bazel 9.2.0, bazelisk
1.28.1 (`ocx.sh/bazelbuild/bazelisk`), rules_go 0.63.0.

The `status.sh` script is `echo STABLE_FIX_VERSION v9.9.9-bzlfix`; `cmd/greet`'s `x_defs` reads
`{STABLE_FIX_VERSION}` into `pkg/version.Version`, printed by the binary. Four path forms, on the
command line, in both execution contexts (plain shell with the resolved bazelisk binary on `PATH`,
and `ocx exec -- bazelisk`):

| Form | Command-line result | `.bazelrc` result (`build --workspace_status_command=…`) |
|---|---|---|
| relative, no prefix (`status.sh`) | exit 1, `Process exited with status 127` | not retried (see rationale below) |
| relative, `./` prefix (`./status.sh`) | exit 1, `Process exited with status 127` | not retried |
| `%workspace%/status.sh` | exit 1, `Process exited with status 1` (+ unrelated `fg: no job control` stderr noise from Bazel's own run-wrapper) | exit 1, identical failure, reproduced after `bazelisk shutdown` + fresh server |
| absolute (`$(pwd)/status.sh`) | **exit 0**, `version: v9.9.9-bzlfix` | **exit 0**, build succeeded |

The relative forms fail with 127 ("command not found") because Bazel's `BazelWorkspaceStatusAction`
runs the command with a working directory that is not the real workspace root — a bare or
`./`-relative filename never resolves there. The `%workspace%` form is Bazel's own documented
substitution specifically for this flag (bazel.build user manual, discussed under
`--package_path`: `%workspace%` expands to "the nearest enclosing bazel directory"); `--announce_rc`
confirms Bazel accepts and echoes the flag verbatim (`Inherited 'build' options:
--workspace_status_command=%workspace%/status.sh`) but the workspace-status action still fails
before the script runs at all — no debug line was appended to a log file the script itself writes,
across three independent tries (command line, `.bazelrc`, and a fresh-server retry). Only the
**absolute path** succeeded, in every context tried: command line and `.bazelrc`, plain shell and
`ocx exec`. This matches the brief's own framing exactly — three of four path forms fail.

Decision: **BZL-GO-09 prints one recipe: an absolute path**, computed once (e.g.
`--workspace_status_command="$(pwd)/status.sh"` on the invoking command line, or a CI step that
resolves the path and writes it into a generated `.bazelrc`). Never `%workspace%/status.sh` and
never a bare or `./`-relative filename, on Bazel 9.2.0 / bazelisk 1.28.1 as measured here.

### 2. Reproducible stamped release: STABLE_*-only vs a volatile key in `x_defs`

Fixture: two independent clones, `go-bazel-release/repro-a/` and `go-bazel-release/repro-b/`, each
built with its own `--output_base` (`output-base-a/`, `output-base-b/`), each with its own
`status.sh` emitting `STABLE_FIX_VERSION` (stable) and `BUILD_TIMESTAMP $(date +%s%N)` (volatile,
present but initially unused — the brief's exact "present but unused" setup).

**Compliant twin** (`cmd/greet`'s `x_defs` maps only `pkg/version.Version` to
`{STABLE_FIX_VERSION}`): built in both clones with `--stamp
--workspace_status_command=<absolute path>`. Both produced
`sha256:9da13437332c3a39def5f92aa0fa5e618998221001c2d27db80856f1f0df1ba6` — byte-identical. Rebuilt
under `-c opt --strip=always --stamp` in both clones: both produced
`sha256:0c8adc9bcf4ad61fe421fb0c4d88078ee472fb97ea0f2366f4dd12d033fbceb2` — also byte-identical.
`STABLE_FIX_VERSION`'s literal value never changes between the clones (both scripts hardcode the
same string), so this shows the *plumbing* is reproducible; the interesting control is the red
twin below.

**Red twin**: added a second `x_defs` entry, `pkg/version.Timestamp: "{BUILD_TIMESTAMP}"`, and made
`main.go` actually print `version.Timestamp` (an unreferenced `x_defs` target is dead-code
eliminated and never gets linked in — a first attempt without the print produced identical
binaries and would have been a false green). Rebuilt in both clones with the same `--stamp` flags:
clone A produced `sha256:092740d7…`, printing `built: 1790413653157973289`; clone B produced
`sha256:e7d9c6bf…`, printing `built: 1790413654398083769` — different hash, different value, same
source, one second apart. This is the direct, measured demonstration of BZL-HERM-17/18 and
BZL-CACHE-20's point that `--stamp` is not itself a determinism control; *which keys `x_defs`
references* is.

### 3. `-c opt` / `--strip` and `file(1)`'s stripped status

All five combinations built from the same `base/` fixture, same target:

| Flags | `file(1)` |
|---|---|
| (default, fastbuild) | `..., BuildID[sha1]=…, stripped` |
| `-c opt` | `..., with debug_info, not stripped` |
| `--strip=never` | `..., with debug_info, not stripped` |
| `--strip=always` | `..., stripped` |
| `-c opt --strip=never` | `..., with debug_info, not stripped` |

This is exactly Bazel's own documented default: "The default value of `--strip=sometimes` means
strip if the `--compilation_mode` is `fastbuild`" (bazel.build user manual). fastbuild is Bazel's
default `-c` value, so a plain `bazel build //cmd/x` strips by default; the moment a release build
adds `-c opt` (as any release should, for optimized code), stripping silently turns off unless
`--strip=always` is added too. This is a release-recipe trap distinct from anything `go build`
does (plain `go build` never strips unless told to with `-ldflags=-s -w`; `bazel build -c opt`
silently *stops* stripping unless told otherwise).

### 4. `govulncheck -mode=binary` on stripped vs unstripped Bazel binaries (BZL-GO-11)

Fixture: `/home/mherwig/.cache/research-lang/go-tools/fixtures/stamping-and-release/govuln-bazel/`
— a minimal `go_binary` (`//cmd/vulnbin`) importing `golang.org/x/text/language`, with a root
`go.mod` requiring `golang.org/x/text@v0.3.0` (the same known-vulnerable pin GO-REL-05 used) and a
`MODULE.bazel` wiring rules_go 0.63.0 / gazelle 0.54.0.

**Control, plain `go build` (reproducing GO-REL-05 exactly, same module):**

| Build | `file(1)` | `govulncheck -mode=binary` |
|---|---|---|
| `go build` | not stripped | exit 3, **1** finding (`GO-2021-0113`) |
| `go build -ldflags="-s -w"` | stripped | exit 3, **4** findings (`GO-2026-5970`, `GO-2022-1059`, `GO-2021-0113`, `GO-2020-0015`) |

**Bazel build, same module, same target:** `go_deps`'s MVS over every Bazel module's own `go.mod`
(BZL-GO-11's existing rationale) uplifted `golang.org/x/text` to `v0.26.0` — higher than the root's
declared `v0.3.0`, exactly the mechanism the sibling BZL-GO-11 measurement already documented for a
different corpus.

| Build | `file(1)` | `govulncheck -mode=binary` |
|---|---|---|
| default (fastbuild) | stripped | exit 3, **1** finding (`GO-2026-5970`, symbols `norm.Form.Append` etc. reported as "Vulnerable symbols found") |
| `--strip=never` | not stripped | **exit 0**, "No vulnerabilities found" — output explicitly states "this scan also found 0 vulnerabilities in packages you import and **1 vulnerability in modules you require, but your code doesn't appear to call these**" |

The direction (stripped: 1, unstripped: 0) differs numerically from the plain `go build` case
(stripped: 4, unstripped: 1) only because a different vulnerability happens to be reachable in
each scenario — the **mechanism is identical**: stripping removes the symbol information
govulncheck's binary-mode reachability analysis needs, so it falls back to reporting every
vulnerable symbol *present* in the linked closure rather than only the ones actually *called*.
govulncheck's own documentation names this precisely: "It may also report false positives for
code that is in the binary but unreachable," and "For binaries where the symbol information
cannot be extracted, govulncheck reports vulnerabilities for all modules on which the binary
depends" (pkg.go.dev/golang.org/x/vuln/cmd/govulncheck).

Decision: **BZL-GO-11 needs GO-REL-05's unstripped-twin triage clause**, measured on a Bazel
binary, not only on a plain `go build` one. A Bazel release build's default settings (`-c opt
--strip=always`, per §3) ship a stripped artifact — the exact shape that over-reports. The release
recipe: build the shipped artifact with `-c opt --strip=always --stamp`, and separately build a
`--strip=never` twin from the identical source *only* to triage `govulncheck -mode=binary`'s
finding list before shipping; a finding present only in the stripped scan is a stripping artifact,
not a confirmed reachable vulnerability, and should not by itself block a release the way a finding
present in **both** scans should.

### 5. nogo `stdversion` is a structural no-op under rules_go 0.63.0 (BZL-GO-06)

Fixture: `/home/mherwig/.cache/research-lang/go-tools/fixtures/stamping-and-release/nogo-stdversion/`
(standalone driver) and `go-bazel-release/base/pkg/newapi/` + `base/debugpass/` (Bazel/nogo side,
reusing the base fixture's already-resolved `@org_golang_x_tools` repo).

**First attempt (dropped): `testing/synctest.Sleep`.** x/tools v0.50.0's own manifest correctly
tags `{"Sleep", Func, 27, ...}` (`internal/stdlib/manifest.go:17734`) — the symbol-version data is
right. But `stdversion`'s implementation hard-excludes the whole package:

```go
// internal/typesinternal/toonew.go
if pkg.Path() == "testing/synctest" && versions.AtLeast(version, "go1.24") {
    // requires go1.24 && goexperiment.synctest || go1.25
    return disallowed
}
```

— a permanent false-positive guard dating from when `synctest` was `GOEXPERIMENT`-gated before its
GA release. **A `synctest`-based plant can never be a stdversion witness**, on any toolchain, under
Bazel or off it. Switched the plant to `bytes.CutLast` (go.dev/doc/go1.27, issue #71151), an
ordinary package with no such exclusion.

**Standalone x/tools v0.50.0 driver** (a tiny `singlechecker.Main(stdversion.Analyzer)` built
against the pinned `golang.org/x/tools v0.50.0`, run with `go` on `PATH`):

- `go.mod`: `go 1.26.0` + `toolchain go1.27.1`, package calls `bytes.CutLast`: **exit 3**,
  `newapi.go:13:15: bytes.CutLast requires go1.27 or later (file is go1.26)`.
- Same source, `go.mod`: `go 1.27.0`: **exit 0**.
- A debug analyzer run alongside confirmed `pass.Pkg.GoVersion() == "go1.26.0"` in the red case —
  the standalone driver reads the module's `go` line correctly even with a `toolchain` line
  present.

**Under Bazel** (`base/` fixture, `//pkg/newapi:newapi`, nogo's `deps` extended with
`@org_golang_x_tools//go/analysis/passes/stdversion:go_default_library`):

- `go.mod`: `go 1.26.0` + `toolchain go1.27.1` (SDK selected via `from_file`, confirmed by the
  build actually compiling `bytes.CutLast` — it would fail to compile on a real 1.26.x SDK):
  **exit 0** — the build is green when it should be red.
- `go.mod`: `go 1.27.0` (matched, "should" be green): **exit 0** — also green, no distinguishing
  signal from the case above.
- Root cause, measured directly with a throwaway always-firing nogo analyzer
  (`base/debugpass/`, wired into the same `nogo(...)` target) that reports
  `pass.Pkg.GoVersion()` as its diagnostic on every package: nogo reported
  `pkg/newapi/newapi.go:3:1: DEBUG GoVersion="go1.27.1"` — **the SDK's own version**, not the
  module's `go 1.26.0` line. rules_go 0.63.0's nogo integration never threads the `go.mod`
  language-version floor into the type-checked package it hands to analyzers; it always reports
  whichever SDK version `from_file`/`toolchain` selected.
- Control, BZL-GO-07's already-published external route: `bazel run @rules_go//go -- vet
  -stdversion ./pkg/newapi/...` on the same `go 1.26.0` + `toolchain go1.27.1` tree: **catches it**
  — `pkg/newapi/newapi.go:9:15: bytes.CutLast requires go1.27 or later (file is go1.26)` — because
  it runs the real `go` command via `go/packages`, which reads `go.mod` correctly regardless of
  nogo.

Decision: **BZL-GO-06 should not gain stdversion.** Adding it to nogo's `deps` is inert dead
weight under rules_go 0.63.0 — measured to fire on neither the red nor the green case, because
nogo's `pass.Pkg.GoVersion()` is pinned to the selected SDK version rather than the module's `go`
line. GO-MOD-01's floor is enforced under Bazel exactly as BZL-GO-07 already says: through the
external `bazel run @rules_go//go -- vet ./...` invocation, never through nogo.

## Normative guidance candidates

Numbered continuing the existing BZL-GO family; these are revisions to hold against the existing
IDs, not new IDs.

1. **BZL-GO-09 (revised).** Stamp with `--workspace_status_command=<absolute path>`, computed once
   by the invoking script/CI step. Never `%workspace%/status.sh` (fails even from `.bazelrc`, even
   after a server restart) and never a bare or `./`-relative filename (both fail with "command not
   found" — the action's cwd is not the workspace root). *Rationale:* the documented `%workspace%`
   form is unreliable in this environment; an absolute path is the only form that worked in 8/8
   tries across contexts. *Verify:* `bazel run --stamp --workspace_status_command="$(pwd)/status.sh"
   //cmd/x` must print the stamped value; the same command with `%workspace%/status.sh` or a bare
   filename must fail. *Watched red/green:* **yes** — `go-bazel-release/wsc-matrix.log` and the
   `.bazelrc`/fresh-server logs in the same directory.
2. **A stamped release's `x_defs` may reference only `STABLE_*` keys**, never a key without that
   prefix (`BUILD_TIMESTAMP` and similarly-named volatile keys). *Rationale:* a volatile key
   breaks byte-for-byte reproducibility across otherwise-identical builds; `--stamp` alone
   guarantees nothing (BZL-HERM-17/18, BZL-CACHE-20). *Verify:* `grep -rn --include='BUILD*'
   -e 'x_defs' .` then manually check every referenced key starts with `STABLE_`; no automatic
   check exists yet, this is a reading heuristic over the grep's matches. Planted: build twice from
   two clones with separate `--output_base` and `sha256sum` the outputs — empty diff passes.
   *Watched red/green:* **yes** — `repro-a`/`repro-b` sha256 pairs above, both directions.
3. **A release build passes `-c opt` and `--strip=always` explicitly; never rely on the default.**
   *Rationale:* Bazel's `--strip=sometimes` default strips only in fastbuild; an opt release build
   silently ships unstripped debug info unless told otherwise. *Verify:* `file
   bazel-bin/<pkg>/<target>_/<target>` must report `stripped` for the shipped artifact. *Watched
   red/green:* **yes** — the five-row table in Findings §3.
4. **BZL-GO-11 (revised): triage a stripped release binary's `govulncheck -mode=binary` findings
   against a `--strip=never` twin before shipping; a finding present only in the stripped scan is
   not itself a release blocker.** *Rationale:* measured on a Bazel binary (not only on `go build`,
   per GO-REL-05): the default (stripped) build reported a finding the `--strip=never` twin
   explicitly said the code "doesn't appear to call." *Verify:* build both variants from the same
   source; `govulncheck -mode=binary` on each; diff the finding sets; anything only in the stripped
   set needs the twin's confirmation before it blocks a release. *Watched red/green:* **yes** —
   Findings §4 table (`vulnbin.bazel.default` / `vulnbin.bazel.stripnever`).
5. **Do not add `@org_golang_x_tools//go/analysis/passes/stdversion` to nogo's `deps` (BZL-GO-06
   stays as-is).** *Rationale:* measured inert under rules_go 0.63.0 — nogo reports the selected
   SDK's own version as every package's `GoVersion()`, never the module's `go` line, so the
   analyzer can never fire whether the code is actually too-new or not. *Verify:* the debug-analyzer
   probe in Findings §5 (`pass.Pkg.GoVersion()` printed as a diagnostic) on any nogo-validated
   target — it will always equal the selected SDK version. Rely on BZL-GO-07's `bazel run
   @rules_go//go -- vet -stdversion ./...` instead. *Watched red/green:* **yes** — both the failed
   nogo attempt and the successful BZL-GO-07 control, Findings §5.
6. **Never plant or reason about `testing/synctest` (or `encoding/json/v2`, `encoding/json/jsontext`)
   as a stdversion witness.** *Rationale:* these packages are hard-excluded in
   `internal/typesinternal/toonew.go` for any file version `>= go1.24` / `go1.25` respectively,
   because they were `GOEXPERIMENT`-gated before GA — a permanent false-positive guard, not a bug
   to work around. *Verify:* reading heuristic against the x/tools source
   (`internal/typesinternal/toonew.go`); no grep substitutes for reading the exclusion list, since
   it is small and may grow. *Watched red/green:* **no**, doc-derived from the fetched source; the
   *consequence* (synctest never firing) was watched, in the sense that the first attempt at this
   dive silently failed to fire for exactly this reason.

## Verification runs

All commands run from `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-release/` or
its subdirectories unless noted; `bazelisk` resolved to
`base/.ocx/toolchain/links/default/bazelisk/content/bazelisk` (Bazel 9.2.0 via bazelisk 1.28.1).

1. **workspace_status_command matrix** (`base/`):
   - `bazelisk run --stamp --workspace_status_command=status.sh //cmd/greet:greet` → exit 1,
     `Process exited with status 127`.
   - `bazelisk run --stamp --workspace_status_command=./status.sh //cmd/greet:greet` → exit 1,
     `Process exited with status 127`.
   - `bazelisk run --stamp --workspace_status_command=/…/base/status.sh //cmd/greet:greet` →
     exit 0, `version: v9.9.9-bzlfix`.
   - `bazelisk run --stamp --workspace_status_command=%workspace%/status.sh //cmd/greet:greet` →
     exit 1, `Process exited with status 1`.
   - `.bazelrc` (`build --workspace_status_command=%workspace%/status.sh`) +
     `bazelisk build --stamp //cmd/greet:greet` → exit 1, identical failure; reproduced again after
     `bazelisk shutdown` (fresh server), same exit and message.
   - `.bazelrc` with the absolute path + `bazelisk build --stamp //cmd/greet:greet` → exit 0, build
     succeeded (warning about `use_repo` unrelated to stamping).
   - `ocx exec -- bazelisk build --stamp //cmd/greet:greet` with the `%workspace%` `.bazelrc` →
     exit 1, identical failure.
   - `ocx exec -- bazelisk run --stamp --workspace_status_command=/…/base/status.sh
     //cmd/greet:greet` → exit 0, `version: v9.9.9-bzlfix`.
   - Logs: `wsc-matrix.log`, `bazelrc-abs.log`, `ocxexec-percent-bazelrc.log`,
     `ocxexec-abs-cli.log`, `fresh-server-percent.log`, all under `go-bazel-release/`.
2. **Reproducibility** (`repro-a/`, `repro-b/`, `output-base-a/`, `output-base-b/`):
   - Compliant, default: both
     `bazelisk --output_base=<own> build --stamp --workspace_status_command=<own abs path>
     //cmd/greet:greet` → exit 0 each;
     `sha256sum bazel-bin/cmd/greet/greet_/greet` → identical
     `9da13437332c3a39def5f92aa0fa5e618998221001c2d27db80856f1f0df1ba6` in both.
   - Compliant, `-c opt --strip=always`: same command plus the flags → exit 0 each; identical
     `0c8adc9bcf4ad61fe421fb0c4d88078ee472fb97ea0f2366f4dd12d033fbceb2` in both.
   - Red (volatile key referenced and printed): same build command (default flags) → exit 0 each;
     clone A `092740d7411e86abadfb3f16441cc51bf2ffff2896cef6eaf00e90d956969df5` printing
     `built: 1790413653157973289`; clone B
     `e7d9c6bfe0a272cc1f9c69625f548c688a6f49106420f1018b06da4aa418e217` printing
     `built: 1790413654398083769` — different hash, different value.
   - Logs: `repro-a-build1.log`, `repro-b-build1.log` (compliant), `repro-a-build3.log`,
     `repro-b-build3.log` (red), `repro-a-opt2.log`, `repro-b-opt2.log` (compliant, opt).
3. **Strip/opt matrix** (`base/`, target `//cmd/greet:greet`):
   - `bazelisk build --stamp --workspace_status_command=<abs> //cmd/greet:greet` → `file`:
     `..., stripped`.
   - `bazelisk build -c opt --stamp --workspace_status_command=<abs> //cmd/greet:greet` → `file`:
     `..., with debug_info, not stripped`.
   - `bazelisk build --strip=never …` → `..., with debug_info, not stripped`.
   - `bazelisk build --strip=always …` → `..., stripped`.
   - `bazelisk build -c opt --strip=never …` → `..., with debug_info, not stripped`.
   - Re-verified via explicit per-config paths (`bazel-out/k8-opt/bin/...`,
     `bazel-out/k8-fastbuild/bin/...`) to rule out a stale convenience-symlink reading.
4. **govulncheck binary-mode noise** (`stamping-and-release/govuln-bazel/`):
   - `go build -o vulnbin.gobuild ./cmd/vulnbin` then `govulncheck -mode=binary vulnbin.gobuild` →
     exit 3, `Vulnerability #1: GO-2021-0113`.
   - `go build -ldflags="-s -w" -o vulnbin.gobuild.stripped ./cmd/vulnbin` then `govulncheck
     -mode=binary vulnbin.gobuild.stripped` → exit 3, 4 findings
     (`GO-2026-5970`, `GO-2022-1059`, `GO-2021-0113`, `GO-2020-0015`).
   - `bazelisk build //cmd/vulnbin:vulnbin` (default) → `file`: `stripped`; `govulncheck
     -mode=binary vulnbin.bazel.default` → exit 3, `Vulnerability #1: GO-2026-5970`.
   - `bazelisk build --strip=never //cmd/vulnbin:vulnbin` → `file`: `with debug_info, not
     stripped`; `govulncheck -mode=binary vulnbin.bazel.stripnever` → **exit 0**, "No
     vulnerabilities found", explicit "doesn't appear to call these" note.
   - Logs: `govuln-gobuild.txt`, `govuln-gobuild-stripped.txt`, `govuln-bazel-default.txt`,
     `govuln-bazel-stripnever.txt`, all under `govuln-bazel/`.
5. **nogo stdversion** (`stamping-and-release/nogo-stdversion/driver/` for the standalone check;
   `go-bazel-release/base/pkg/newapi/` + `base/debugpass/` for the Bazel/nogo check):
   - Standalone (`stdverdriver ./pkg/newapi`), `go.mod` `go 1.26.0` + `toolchain go1.27.1`: exit 3,
     `newapi.go:13:15: bytes.CutLast requires go1.27 or later (file is go1.26)`.
   - Same, `go.mod` `go 1.27.0`: exit 0.
   - Bazel (`bazelisk build //pkg/newapi:newapi`, nogo `deps` includes
     `@org_golang_x_tools//go/analysis/passes/stdversion:go_default_library`), `go.mod` `go 1.26.0`
     + `toolchain go1.27.1`: **exit 0** — should be red, is not. **This did not go red**; the finding
     itself is that it never can, given the measured cause below.
   - Same, `go.mod` `go 1.27.0`: exit 0 (correctly green, but indistinguishable from the case
     above from nogo's output alone).
   - Debug probe (`base/debugpass/`, an always-firing nogo analyzer added to the same `nogo(...)`
     target): `bazelisk build //pkg/newapi:newapi` with `go.mod` `go 1.26.0` + `toolchain
     go1.27.1` → exit 1 (the debug analyzer's own diagnostic fails the build by design):
     `pkg/newapi/newapi.go:3:1: DEBUG GoVersion="go1.27.1" (debugpass)` — proving nogo saw the SDK
     version, not the module's declared floor.
   - Control: `bazelisk run @rules_go//go -- vet -stdversion ./pkg/newapi/...` (repo name
     `io_bazel_rules_go` in this fixture's `MODULE.bazel`, so run as `@io_bazel_rules_go//go`) with
     the same `go 1.26.0` + `toolchain go1.27.1` tree: **caught it** —
     `pkg/newapi/newapi.go:9:15: bytes.CutLast requires go1.27 or later (file is go1.26)`.
   - Logs: `nogo-stdversion-red.log`, `nogo-stdversion-green.log`, `nogo-debugpass2.log`,
     `gorulesvet-stdversion.log`, all under `go-bazel-release/`.

## Exemplar evidence

No exemplar in the 35-repo corpus builds a release with Bazel other than the two dogfood
repositories (rules_go, gazelle — go-audit's `exemplar-modules-and-release.md` §6, already cited
by go-bazel.md), and neither ships a stamped, stripped release CLI artifact through Bazel to check
against these four findings; this dive's evidence is exclusively the planted fixtures above and
GO-REL-05's plain-`go`-build measurement, which the govulncheck finding in §4 deliberately
reproduces on Bazel output to make the comparison exact. This is unchanged from go-bazel.md's own
disclosure that Bazel-for-Go has 2/35 real-world exemplars.

## AI-agent angle

- **Copies the textbook `%workspace%/status.sh` snippet into `.bazelrc` and calls stamping done.**
  It fails at execution (measured, not merely undocumented) in this Bazel 9.2.0 setup. Check: the
  `--announce_rc` + absolute-path A/B in Findings §1 — if `--workspace_status_command` isn't an
  absolute path, don't trust it works.
- **Assumes `--stamp` alone makes a build reproducible.** It only prevents *unstamped* drift; a
  volatile key in `x_defs` breaks reproducibility exactly as much as no stamping at all. Check:
  `grep -rn --include='BUILD*' -e 'x_defs' .` then verify every referenced key is `STABLE_*`.
- **Ships a `-c opt` release binary and assumes it's stripped like the default `bazel build` was
  in earlier local testing.** It is not — `--strip=sometimes`'s default only strips fastbuild.
  Check: `file bazel-bin/<pkg>/<target>_/<target>` on the actual release invocation, not on a
  fastbuild smoke build.
- **Trusts `govulncheck -mode=binary`'s finding count on a stripped release artifact as the final
  answer**, either to file a CVE report or to block a release. Binary mode says so itself: it may
  over-report on stripped binaries. Check: build the `--strip=never` twin and diff, before acting
  on either an alarm or an "all clear."
- **Adds `stdversion` to nogo's `deps` and believes GO-MOD-01's floor is now enforced under
  Bazel.** It measurably is not, under rules_go 0.63.0 — nogo always sees the SDK's version. Check:
  the debug-analyzer probe in Findings §5, or simply trust BZL-GO-07's external `vet` route instead
  and never nogo for this specific class of check.
- **Plants (or reasons about) a `testing/synctest` API to test any stdversion-based tooling.** It
  will silently never fire, on any toolchain, for any file version `>= go1.24`, and an agent
  investigating "why didn't this catch a too-new symbol" may waste a cycle assuming its own nogo
  wiring is broken instead of hitting the analyzer's own permanent exclusion. Check: read
  `internal/typesinternal/toonew.go`'s exclusion list before choosing a plant package.

## Contested / evolving

- Whether rules_go should thread `go.mod`'s language-version floor into nogo's type-checking at
  all is not something this dive found an open GitHub issue for by title (`stdversion` and
  `nogo` were searched together); it is a plausible, unfiled gap as of 2026-09-26, not a documented
  won't-fix. A future rules_go release could change this without notice; re-run the debug-analyzer
  probe in Findings §5 whenever rules_go's pinned version bumps.
- Bazel's `--strip=sometimes` default (strip iff fastbuild) is unchanged, documented, stable
  behavior — not evolving — but is easy to mis-remember as "strip unless `-c dbg`" (the C++-world
  mental model), which is a *different* rule and would predict the wrong outcome for `-c opt`.
- `bytes.CutLast`/`strings.CutLast` are brand-new as of Go 1.27 (2026-08); no ecosystem practice
  yet exists to observe, they were chosen here purely as an analyzer-test probe, not as a
  recommended idiom (that call belongs to GO-LANG, not this file).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://bazel.build/docs/user-manual | Bazel core flag reference | fetched 2026-09-26 | Primary source for `--stamp`, `--workspace_status_command` (stable/volatile status file split, `%workspace%` expansion), and `--strip`'s exact `always/sometimes/never` semantics — directly explains the measured `-c opt` strip behavior |
| https://go.dev/doc/go1.27 | Go 1.27 release notes | fetched 2026-09-26 | Confirms `bytes.CutLast`/`strings.CutLast` (#71151) and `testing/synctest.Sleep` as genuinely new in 1.27, with exact wording |
| https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck | govulncheck CLI reference | fetched 2026-09-26 | States the binary-mode false-positive mechanism ("code that is in the binary but unreachable", "reports vulnerabilities for all modules" when symbols are missing) that this dive's measurement reproduces on Bazel output |
| https://raw.githubusercontent.com/golang/tools/master/go/analysis/passes/stdversion/stdversion.go | x/tools stdversion analyzer source | fetched 2026-09-26 (master) | Read in full to find the exact gating logic (`go1.22` release-tag check, `go1.21` module-version floor, per-file `versions.Lang(FileVersion(...))`) that explains why the analyzer behaves as measured |
| https://raw.githubusercontent.com/golang/tools/master/internal/typesinternal/toonew.go (via module cache, x/tools v0.50.0) | `TooNewStdSymbols` implementation | v0.50.0, read 2026-09-26 | Source of the hard `testing/synctest`/`encoding/json/v2`/`encoding/json/jsontext` exclusion that made the first plant attempt a false negative |
| golang.org/x/tools@v0.50.0 `internal/stdlib/manifest.go` (module cache) | generated stdlib symbol-version table | v0.50.0 | Confirms the manifest correctly tags `Sleep` (27) and other `testing/synctest` symbols — ruling out "stale data" as the cause of the synctest false negative, isolating it to the package-path exclusion instead |
| https://github.com/bazel-contrib/rules_go/blob/master/docs/go/core/defines_and_stamping.md | rules_go stamping docs | fetched 2026-09-26 | Confirms `x_defs` collection across transitive deps, dead-code elimination of unreferenced keys, and `--[no]stamp`'s scope — the basis for the "unreferenced key" trap in the reproducibility test |
| https://github.com/bazel-contrib/rules_go/blob/master/go/nogo.rst | nogo API reference | cited from go-bazel.md, re-checked | Basis for how nogo `deps` and `config` are wired; unchanged by this dive |
| https://github.com/bazel-contrib/rules_go/blob/master/docs/go/core/bzlmod.md | rules_go Bzlmod docs | cited from go-bazel.md, re-checked | `go_sdk.from_file`/`toolchain` precedence, load-bearing for why the fixture's SDK selection (1.27.1) could be trusted as the actual compiling toolchain in the nogo probe |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_go/metadata.json | BCR module metadata | fetched pattern from go-bazel.md, versions unchanged (0.63.0) | Confirms the pinned rules_go version used throughout this dive is still current as of 2026-09-26 |
| go-release/reproducible-builds-and-stamping.md (this program, GO-REL-05/10) | internal consolidation | 2026-09-26 | Source of the exact `strip-govuln/` recipe (`x/text@v0.3.0`, 4 vs 1 findings) this dive reproduced verbatim on `go build` before extending it to a Bazel binary |
| go-bazel.md (this program, BZL-GO-01..13) | the depth file under revision | 2026-09-26 | Holds the IDs (BZL-GO-09, BZL-GO-11, BZL-GO-06) this dive's findings revise; every ID here is unchanged, only their content and evidence are extended |
| /home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-consolidation/bazel-go-devdeps/ (this program's own fixture) | the source fixture copied for this dive | 2026-09-26 | `MODULE.bazel`, `BUILD.bazel`, `status.sh`, `cmd/greet` layout this dive built on top of, rather than re-deriving from scratch |
| https://pkg.go.dev/cmd/vet (cited from go-bazel.md) | go vet analyzer list | 2026-09-26, Go 1.27.1 | Confirms `stdversion` is a real, named `go vet` analyzer flag (`-stdversion`), used to build the standalone/plain-go control in Findings §5 |

