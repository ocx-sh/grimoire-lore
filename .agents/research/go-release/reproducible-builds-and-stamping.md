---
title: Byte-reproducible Go binaries and version stamping
topic: Building and shipping Go binaries — GO-REL
agent: reproducible-builds-and-stamping (wave 3)
model: sonnet
date_researched: 2026-09-26
sources_count: 18
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/reproducible-builds-and-stamping/
scope: |
  Covers the flag set and stamping recipe that make a fleet-built Go CLI
  binary byte-reproducible and self-describing via --version, the
  CGO_ENABLED policy per CI job, the default GOOS/GOARCH/GOAMD64/GOARM
  matrix, and whether -s -w is admissible given its measured govulncheck
  -mode=binary cost. Does not cover goreleaser's full config surface
  (signing, SBOMs, dockers/kos, homebrew) — that is M-N-05/07/08/09, out of
  this brief's rows (M-N-01..03, 06, 10) — nor Bazel stamping (x_defs, BZL-GO
  M-O-06) or the go-release skill's end-to-end cut procedure (M-P-01).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Byte-reproducibility needs four build-time inputs pinned together: `-trimpath`, `CGO_ENABLED=0`, a fixed `-X` date (`CommitDate`, never `Date`/wall-clock), and `-buildvcs` left at its `auto` default on a clean checkout — verified with a real double clean-clone build in this brief, not assumed.
- `-trimpath` alone is the single highest-leverage flag: omitting it leaked the full absolute build path (`/home/.../clone-a-dirname/main.go`) into the binary via `strings` and changed the sha256 across two build paths; with it, the two builds were byte-identical.
- Reproducibility is a two-layer problem: the binary's bytes (governed by the flags above) and the *archive*'s per-file mtimes (governed by goreleaser's `mod_timestamp`, which is a post-build `os.Chtimes()` call, not a `go build` flag or an `-X` value) — [goreleaser/goreleaser@ff8de3d6c389:internal/builders/base/build.go:80-87](#sources).
- The stamping recipe with the strongest corpus support (10/35 exemplars) is `-ldflags -X` for the semver *and* `runtime/debug.ReadBuildInfo()` for VCS metadata, used together, not as alternatives ([modrel §4](../go-audit/exemplar-modules-and-release.md)).
- Go 1.24 auto-derives the main module's version from VCS tag/commit into `runtime/debug.BuildInfo.Main.Version` by default (`-buildvcs=auto`); a dirty working tree appends `+dirty` to that version — reproduced directly in this brief's fixture.
- Go 1.25 introduced a real regression/behavior change: a repository containing more than one independent VCS root under the build path now errors `multiple VCS detected: svn in "…", and svn in "…". Use -buildvcs=false to disable VCS stamping` — a monorepo-shaped hazard for the fleet's CLI mould, confirmed via the upstream tracker, not reproduced bit-for-bit here (SVN unavailable in this environment).
- `CGO_ENABLED` left **unset** is not "off" — this host resolves it to `1` because `gcc` is on `PATH`, and a program importing only `net` and `os/user` (no explicit cgo) still links dynamically as a result; setting it explicitly to `0` produces a statically linked, functionally identical binary (`uid: 1000` either way) — both watched directly.
- Cross-compiling any package that pulls in cgo-capable stdlib packages (`net`, `os/user`) to a *different architecture on the same OS* fails outright under `CGO_ENABLED=1` on this host (`linux/amd64` → `linux/arm64` dies in the assembler); `CGO_ENABLED=0` is not optional for a cross-compile matrix, it is load-bearing.
- `-s -w` does **not** remove the embedded `runtime/debug.BuildInfo` — `go version -m` printed byte-identical module/dependency lines for a stripped and an unstripped twin — but it *does* degrade `govulncheck -mode=binary`'s reachability precision: this brief's own re-run reproduced the exemplar-audit's 4-findings-stripped vs 1-finding-unstripped split (GO-MOD-13), on the same known CVE (GO-2021-0113) plus three additional non-reachable-looking findings that only the stripped binary surfaced.
- `-s -w` is therefore a SHOULD, not a blanket MUST or MUST-NOT: keep it for the shipped release artifact (size, no incidental debug info disclosure) but run `govulncheck -mode=binary` on the *unstripped* build artifact in CI, before the release pipeline strips it, or budget for the stripped scan's over-reporting.
- goreleaser's own defaults, absent explicit config, are `GOOS: [darwin, linux, windows]`, `GOARCH: [386, amd64, arm64]`, `GOARM: [6]`, `GOAMD64: [v1]` — narrower than the corpus's actual practice, where `windows`+`arm64` both appear in 9/11 binary-shipping configs and `GOARM` is set explicitly in 6/11 ([modrel §7](../go-audit/exemplar-modules-and-release.md)).
- `GOAMD64`/`GOARM` level pinning tracks a real hardware target, not a general habit: the corpus's one `GOAMD64` pin (`golangci-lint`, `v1`) and its `GOARM` pins always co-occur with an already-broad arm/arm64 matrix, never appearing alone.
- `-ldflags "{{ .Env.LDFLAGS }}"` populated from a **Makefile**, not written inline in the goreleaser YAML, is a real, easy-to-miss pattern (`sigstore/cosign@907c3d899c0e:.goreleaser.yml:41` / `Makefile:57`) — a naive "grep the YAML for `-X`" audit undercounts stamping coverage.
- `CGO_ENABLED` is not global-constant even inside one goreleaser config: `sigstore/cosign@907c3d899c0e` sets `CGO_ENABLED=1` at the top-level `env:` (needed for its `pivkey`/`pkcs11key` build variant) but overrides it back to `CGO_ENABLED=0` inside the plain `linux` build entry — per-build-id override, not per-repo.
- `go version -m -json` (new in Go 1.25) is the machine-readable form of the same `BuildInfo` a `--version` subcommand should print; prefer it over hand-parsing `go version -m`'s text table in any tooling the fleet writes.
- SOURCE_DATE_EPOCH, the cross-ecosystem reproducible-builds convention, is **not** consumed by the Go toolchain itself; goreleaser's `mod_timestamp` and the `-X … ={{.CommitTimestamp}}` pattern are Go-specific analogues a fleet recipe must wire by hand, they are not a a free `go build` behavior.

## Findings

### 1. The four flags that make the binary's bytes reproducible

A clean-checkout double build (this brief's own fixture, not the go.dev/blog/rebuild toolchain-bootstrap story, which is about rebuilding the `go` distribution itself, not user binaries — [go.dev/blog/rebuild](https://go.dev/blog/rebuild) — see Contested) needs:

| Flag / setting | Effect | What breaks it if omitted |
|---|---|---|
| `-trimpath` | Rewrites source directory paths in the binary to module-relative paths | The absolute build path leaks verbatim (confirmed via `strings`) and differs build-to-build whenever the checkout directory name differs |
| `CGO_ENABLED=0` | Disables the C toolchain as a build input | The host C compiler's version/flags become a hidden input; also required for cross-arch builds (§4) |
| `-X main.date=<CommitDate>`, never `<Date>`/wall-clock | Bakes a fixed timestamp string via the linker | Two builds seconds apart produce different bytes purely from the ldflags value, even with everything else pinned (watched directly, §Verification runs) |
| `-buildvcs=auto` (default) on a clean, single-VCS checkout | Embeds `vcs.revision`/`vcs.time`/`vcs.modified` and derives `Main.Version` | A dirty tree appends `+dirty` to the version silently (watched); `-buildvcs=false` in a script disables all of this, `-buildvcs=true` turns a missing/ambiguous VCS into a hard build error instead of silence — [pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go) |

`go version -m` on the compliant build showed the full recipe's effect together:

```
mod	example.com/reprotool	v0.0.0-20260101000000-c11396192dff
build	-trimpath=true
build	CGO_ENABLED=0
build	vcs=git
build	vcs.revision=c11396192dffd2bb823276504b67fda1c531e4db
build	vcs.time=2026-01-01T00:00:00Z
build	vcs.modified=false
```

Two builds of the identical commit from two differently-named directory clones, at different wall-clock times, produced **byte-identical sha256** when all four inputs above were fixed together (fixture path below). Dropping only `-trimpath` (everything else held constant) produced two *different* sha256 hashes — the leaked path is the entire difference.

### 2. Reproducibility has a second, independent layer: archive/package mtimes

`mod_timestamp` in a goreleaser build block is commonly mis-read as a `go build`-level knob (an environment variable or an `-X` binding). It is neither. Reading goreleaser's own source: the config field is applied via `internal/gio.Chtimes(path, ts)`, which runs `os.Chtimes` on the *already-built* artifact file, setting its mtime to the parsed Unix timestamp — [goreleaser/goreleaser@ff8de3d6c389:internal/gio/chtimes.go:11-23](https://github.com/goreleaser/goreleaser/blob/ff8de3d6c389/internal/gio/chtimes.go), called from [internal/builders/base/build.go:80-87](https://github.com/goreleaser/goreleaser/blob/ff8de3d6c389/internal/builders/base/build.go). This exists because a `.tar.gz`/`.zip` archive embeds each member file's mtime; without pinning it, the archive's bytes differ build-to-build even when the binary inside is already byte-identical. A recipe that only fixes the four §1 flags and skips `mod_timestamp` gets a reproducible *binary* but a non-reproducible *release archive*.

`goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml:23,49-53` sets `mod_timestamp: "{{ .CommitTimestamp }}"` at both the top-level `metadata:` block and inside the `builds:` entry, `flags: [-trimpath]`, `env: [CGO_ENABLED=0]`, and `ldflags: [... -X main.date={{ .CommitDate }} ...]` — this is goreleaser's own dogfooded config and matches the full recipe in §1 plus §2 exactly.

### 3. The stamping recipe: `-X` for semver, `ReadBuildInfo` for VCS, together

`runtime/debug.ReadBuildInfo` (Go ≥1.12) returns a `*BuildInfo` with `GoVersion`, `Path`, `Main` (a `Module`), `Deps`, and `Settings` — a slice of key/value `BuildSetting`s. Documented keys include `CGO_ENABLED`, `GOOS`, `GOARCH`, `GOAMD64`/`GOARM`/`GO386`, `-trimpath`, `vcs`, `vcs.revision`, `vcs.time` (RFC3339), `vcs.modified` — [pkg.go.dev/runtime/debug#BuildInfo](https://pkg.go.dev/runtime/debug#BuildInfo). Since Go 1.24, `Main.Version` is populated from the VCS tag/commit automatically when `-buildvcs=auto` (default) finds a single, clean repository — [go.dev/doc/go1.24 § Go command](https://go.dev/doc/go1.24#go-command).

`-ldflags -X` cannot express VCS metadata cleanly (no function calls, only constant strings — [pkg.go.dev/cmd/link](https://pkg.go.dev/cmd/link#hdr-Options): *"This is only effective if the variable is declared in the source code either uninitialized or initialized to a constant string expression. -X will not work if the initializer makes a function call or refers to other variables."*), so a wrapper script or Makefile computes `git rev-parse`/`git describe` at build time and passes the result as `-X`. `ReadBuildInfo` gets this for free from the Go toolchain's own VCS integration, but only a semver *tag* string, not `-X`'s ability to bake in an arbitrary human-chosen version like `v1.3.4-rc2`.

The corpus's dominant pattern (10/35 repos: `cli/cli`, `golangci-lint`, `golang/vuln`, `go-containerregistry`, `hashicorp/terraform`, `ko-build/ko`, `kubernetes/kubernetes`, `controller-runtime`, `regclient/regclient`, `tailscale/tailscale`) uses both: `-X` for a curated semver string, `ReadBuildInfo` to *supplement* it with `vcs.revision`/`vcs.time`/`vcs.modified` that `-X` alone can't easily carry — [modrel §4](../go-audit/exemplar-modules-and-release.md). 7 use `-X` only (no VCS metadata beyond what a `--version` prints); 4 lean entirely on Go's own VCS stamping and print no hand-maintained version at all (`bazelbuild/rules_go`, `caddyserver/caddy`, `dominikh/go-tools`, `golang/tools`).

Correct vs incorrect `--version` implementation, side by side:

```go
// WRONG: prints raw, unparsed debug.BuildInfo to the user — a Go-internal
// object, not a stable UX contract; its String() format is undocumented
// as a UI surface and changes across toolchain versions.
func main() {
    bi, _ := debug.ReadBuildInfo()
    fmt.Println(bi) // prints the whole dependency graph
}
```

```go
// RIGHT: curated semver via -X, VCS revision/dirty via ReadBuildInfo,
// composed into one line the operator actually wants.
var version = "dev" // -X main.version=v1.3.4

func versionString() string {
    v := version
    if bi, ok := debug.ReadBuildInfo(); ok {
        for _, s := range bi.Settings {
            switch s.Key {
            case "vcs.revision":
                if len(s.Value) >= 12 {
                    v += "+" + s.Value[:12]
                }
            case "vcs.modified":
                if s.Value == "true" {
                    v += ".dirty"
                }
            }
        }
    }
    return v
}
```

(Representative real-world var block, same shape: [oras-project/oras@a0cd4de5cfcd:internal/version/version.go:17-26](../go-audit/exemplar-modules-and-release.md).)

### 4. `CGO_ENABLED` policy: unset is not zero, and it is not global

`go env CGO_ENABLED` on a Linux host with a C compiler on `PATH` resolves to `1` by default — confirmed on this environment (`go env CGO_ENABLED` → `1`, `which cc` → `/usr/sbin/cc`). A fleet build script that never sets the variable is not "cgo-off by default"; it is "cgo-on, silently, whenever the CI runner happens to have a C toolchain."

`net` and `os/user` are the two stdlib packages named in this brief, and both degrade gracefully:
- `net`'s cgo resolver is used only under specific host conditions (macOS always; or `LOCALDOMAIN`/`RES_OPTIONS`/`HOSTALIASES` env vars set; or `/etc/resolv.conf`/`/etc/nsswitch.conf` requesting a feature the pure-Go resolver doesn't implement) — [pkg.go.dev/net § Name Resolution](https://pkg.go.dev/net#hdr-Name_Resolution). The `netgo` build tag forces the pure-Go resolver unconditionally; `netcgo` forces the cgo path to be compiled in (but the Go resolver stays preferred at runtime unless one of the above conditions fires).
- `os/user` uses cgo-backed libc calls (`getpwuid_r` etc.) when cgo is available, and falls back to parsing `/etc/passwd`/`/etc/group` in pure Go otherwise — no build tag is required to get the fallback, it happens automatically whenever cgo isn't available, and can be forced with the `osusergo` build tag even when cgo *is* available — [pkg.go.dev/os/user](https://pkg.go.dev/os/user).

This brief's fixture confirms the practical consequence directly: a program importing both, built with `CGO_ENABLED` **unset**, is dynamically linked (`file` reports `dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2`) and its embedded build settings show `CGO_ENABLED=1`. The identical program built with `CGO_ENABLED=0` explicit is statically linked and produces the **same runtime output** (`uid: 1000` in both cases) — the fallback loses nothing functionally on this platform, it only changes the link mode. The policy conclusion: a fleet release/build job sets `CGO_ENABLED=0` explicitly; never rely on an unset default, and never assume `net`/`os/user` "need" cgo.

This is a job-scoped setting, not repository-scoped: [sigstore/cosign@907c3d899c0e:.goreleaser.yml:8](../go-audit/exemplar-modules-and-release.md) sets `CGO_ENABLED=1` at the top-level `env:` block (its `pivkey`/`pkcs11key` build variant genuinely needs libpcsclite via cgo) but the same file's plain `linux` build entry re-overrides it to `CGO_ENABLED=0` locally (`.goreleaser.yml:37-43`) — the override is per build-id, not an all-or-nothing repo choice. This composes with the wave-2 finding that `CGO_ENABLED=0` must never leak into the `-race` test job (GO-GATE-04): the fleet needs at minimum three distinct `CGO_ENABLED` postures across one repo's CI — unset/1 for `-race`, 0 for the release build, and occasionally 1 for one specific cgo-dependent build variant, each scoped to its own job or build-id.

### 5. Cross-compiling requires `CGO_ENABLED=0`, not just prefers it

Cross-compiling a package that would otherwise pull in cgo (via `net`/`os/user`'s cgo path, or any `import "C"`) to a different CPU architecture on the *same* OS fails outright without a matching cross C toolchain. This brief's fixture built the `net`+`os/user` program with `CGO_ENABLED=1 GOOS=linux GOARCH=arm64` on an `amd64` host and the build died inside `runtime/cgo`'s assembly stub (`gcc_arm64.S: Assembler messages: ... Error: no such instruction`, exit 1) — the host's `gcc`/`as` targets `amd64` and cannot assemble the arm64 stub. The same source built with `CGO_ENABLED=0` for the same target succeeded immediately (exit 0). Cross-OS targets (Linux host → Windows/Darwin) did not reproduce this failure in this fixture because those OS's stdlib implementations of `net`/`os/user` do not route through cgo at all — the failure is architecture-driven, not OS-driven, and is easy to miss if a matrix is only tested for one architecture.

Corpus cross-compile matrices (11 goreleaser configs) cluster on `darwin, linux, windows[, freebsd]` × `amd64, arm64, arm[, 386, s390x, ppc64le]`; `windows` and `arm64` both appear in 9/11 (82%) — [modrel §7](../go-audit/exemplar-modules-and-release.md). `GOAMD64` is pinned in only 1/11 (`golangci-lint`, `v1`); `GOARM` in 6/11, always alongside an already-broad arm/arm64 matrix, never as a standalone setting.

### 6. `-s -w`: preserves `BuildInfo`, degrades `govulncheck -mode=binary`

`-s` (omit symbol table, implies `-w`) and `-w` (omit DWARF) are `cmd/link` flags — [pkg.go.dev/cmd/link](https://pkg.go.dev/cmd/link#hdr-Options). This brief's own re-measurement, independent of the wave-2 fixture cited in GO-MOD-13, reproduces the same shape: a pure-Go program pinning a known-vulnerable `golang.org/x/text@v0.3.0` (`language.Parse`, reachable finding `GO-2021-0113`) built both with and without `-ldflags="-s -w"`:

| | `go version -m` module/dep lines | `govulncheck -mode=binary` findings | exit code |
|---|---|---|---|
| unstripped | identical to stripped | **1** (`GO-2021-0113`, with a reachable symbol trace) | 3 |
| stripped (`-s -w`) | identical to unstripped | **4** (`GO-2021-0113` + `GO-2026-5970`, `GO-2022-1059`, `GO-2020-0015`) | 3 |

`go version -m` printed byte-identical `path`/`mod`/`dep`/`build` lines for both binaries — the embedded `BuildInfo` blob is a distinct linker section from the symbol table/DWARF, and `-s -w` does not touch it. `govulncheck -mode=binary`, by contrast, needs the symbol table to do its normal call-graph-based reachability narrowing; without it, it falls back to a coarser "any vulnerable symbol whose package is linked in" analysis, which is why the stripped build over-reports by 4x on this fixture (same ratio as the wave-2 measurement: 4 findings stripped vs 1 unstripped, GO-MOD-13).

Consequence: a release pipeline that strips before scanning gets systematically noisier (not quieter, and not silently wrong in the dangerous direction — it over-reports, it does not miss the real, reachable finding) results than one that scans first and strips after. `govulncheck ./...` in source mode (GO-MOD-12, unaffected by stripping) remains the primary gate regardless.

### 7. VCS stamping's Go-1.25 hazard: monorepos with more than one VCS root

Go 1.25's `-buildvcs=auto`/`true` path added a hard failure mode that did not exist in 1.24: `error obtaining VCS status: multiple VCS detected: svn in "…", and svn in "…". Use -buildvcs=false to disable VCS stamping` when the build's containing directory tree has more than one distinct VCS root (a monorepo with independently-versioned subprojects, or a repository with an unrelated nested checkout) — reported directly by affected users on [golang/go#74763](https://github.com/golang/go/issues/74763) (comment from `guillaumebrunerie`, filed against `go1.25rc2`, open as of 2026-09-26). The same issue documents a related, narrower regression: a nested module (its own `go.mod`) inside a repository whose *root* has no `go.mod` stamped correctly under Go 1.24 (`v0.0.0-...`-style pseudo-version) but reports `(devel)` under Go 1.25 — a silent loss of stamping, not an error. Neither failure mode was reproducible bit-for-bit in this fixture environment (no SVN installed, and the nested-module regression needs the exact repo topology from the issue); both are cited from the primary tracker, not re-measured, and are flagged accordingly in Normative guidance and Contested/evolving.

## Normative guidance candidates

1. **GO-REL-01 — MUST.** Build every release/distribution binary with `-trimpath`, and never omit it "because CI always builds from the same path." Rationale: it is the single flag whose absence this brief watched break bit-reproducibility (leaked absolute path via `strings`, differing sha256). Verify: a double clean-checkout build — `sha256sum` the two binaries; non-matching hashes with `-trimpath` present is a red flag for a *different* leak (§Contested), matching hashes with `-trimpath` and reproducing the mismatch when it is removed is the fixture-verified pass/fail signal. RUN: yes, `fixtures/reproducible-builds-and-stamping/repro-builds/` (`out-A-good.bin`==`out-B-good.bin`; `out-A-notrim.bin`!=`out-B-notrim.bin`).
2. **GO-REL-02 — MUST.** Set `CGO_ENABLED=0` explicitly in the build/release job's environment; never leave it unset and never rely on the runner's default. Rationale: unset resolves to `1` whenever a C compiler is on `PATH` (this host: `gcc`), producing an unintentionally dynamically-linked binary even from a pure stdlib program using `net`/`os/user`. Verify: `grep -rn -e 'CGO_ENABLED=0' -e 'CGO_ENABLED: 0' . --include='*.yml' --include='*.yaml' --include='Makefile*'` must find a hit in the release/build job (a reading heuristic for *placement*, per GO-GATE-04's established pattern) — empty output is the finding (missing pin), not a pass; combine with `file <binary>`, where `statically linked` is the pass and `dynamically linked` is the fail. RUN: yes, `fixtures/reproducible-builds-and-stamping/cgo-net-osuser/` (`unset-cgo.bin` dynamically linked, `CGO_ENABLED=1` in `go version -m`; `disabled-cgo.bin` statically linked, `CGO_ENABLED=0`, identical `uid: 1000` output).
3. **GO-REL-03 — MUST.** In a multi-build-id goreleaser (or equivalent matrix) config, scope `CGO_ENABLED` per build entry, not only at the top level; a top-level `CGO_ENABLED=1` for one cgo-dependent variant must not leak into the plain builds. Verify: a reading heuristic over the config — every `builds:`/`env:` entry lacking its own `CGO_ENABLED` line inherits the top-level value; grep `grep -n -e 'CGO_ENABLED' .goreleaser.yaml .goreleaser.yml` (repo root as the directory operand once, or `.` if the config path is unknown) and manually confirm each build id's effective value. RUN: no, reading heuristic only (confirmed against `sigstore/cosign@907c3d899c0e:.goreleaser.yml:8,37-43`, not independently re-planted).
4. **GO-REL-04 — MUST.** Cross-compile with `CGO_ENABLED=0` for every non-native `GOARCH` target, even one that appears to build fine today; do not treat cgo cross-compilation as "usually works." Verify: build the full `GOOS`/`GOARCH` matrix once with `CGO_ENABLED=1` in CI as a smoke test — any exit code other than 0 (typically an assembler or "exec: gcc: exec format error"/cross-toolchain-missing failure) on a non-native arch means a hidden cgo dependency slipped in; the release build itself always uses `CGO_ENABLED=0`. RUN: yes (`fixtures/reproducible-builds-and-stamping/cgo-net-osuser/`: `CGO_ENABLED=1 GOOS=linux GOARCH=arm64` → exit 1, `gcc_arm64.S` assembler errors; `CGO_ENABLED=0` same target → exit 0).
5. **GO-REL-05 — MUST.** Stamp the semver with `-ldflags -X` and read VCS metadata (`vcs.revision`, `vcs.time`, `vcs.modified`) via `runtime/debug.ReadBuildInfo` in the same `--version`/`version` subcommand; do not pick one and skip the other. Rationale: `-X` cannot carry VCS data (no function calls in its constant-string initializer, [pkg.go.dev/cmd/link](https://pkg.go.dev/cmd/link#hdr-Options)) and `ReadBuildInfo` alone cannot express a curated pre-release/rc string a maintainer wants to control by hand; the corpus's 10-repo cohort that does both is the strongest precedent ([modrel §4](../go-audit/exemplar-modules-and-release.md)). Verify: `grep -c -e '-X ' .goreleaser.yaml` combined with `grep -rn -e 'debug.ReadBuildInfo' . --include='*.go'` in the same binary's `main`/`version` package — both must be non-empty. RUN: no, reading heuristic (corpus pattern cited; not independently planted as a lint).
6. **GO-REL-06 — MUST.** Never print raw, unprocessed `debug.BuildInfo` (or its `String()`) as the `--version` output; compose a curated line from the `-X`-set semver plus the specific `Settings` keys the operator needs (short revision, dirty flag). Rationale: `BuildInfo.String()`'s format is an internal `go version -m` serialization contract, not a UX contract, and dumps the entire dependency graph. Verify: run the binary's version command and check it does not contain the literal substrings `path\t`, `dep\t`, or `mod\t` that `BuildInfo.String()` emits: `./tool --version | grep -c -e $'path\t' -e $'dep\t'` should be 0. RUN: no, reading heuristic (pattern from §3, not planted as an automated check in this brief).
7. **GO-REL-07 — MUST NOT (auto-fail check).** A release binary's stamped version must never carry a `+dirty` suffix, and CI must fail the release job if it does. Rationale: `+dirty` means the build ran against an uncommitted diff — verified directly: appending one comment line to a tracked file and rebuilding changed `go version -m`'s `mod` line from `v0.0.0-20260101000000-c11396192dff` to `v0.0.0-20260101000000-c11396192dff+dirty` with `vcs.modified` flipping to `true`. Verify: `go version -m <artifact> | grep -c -e '+dirty' -e 'vcs.modified=true'` — non-zero output is the fail, empty is the pass. RUN: yes, `fixtures/reproducible-builds-and-stamping/repro-builds/out-A-dirty.bin`.
8. **GO-REL-08 — SHOULD.** Pin the archive/package layer's timestamps (goreleaser's `mod_timestamp: "{{ .CommitTimestamp }}"` or an equivalent `os.Chtimes` step on every artifact file) in addition to the binary-level flags; do not assume a byte-reproducible binary implies a byte-reproducible release archive. Verify: `grep -n -e 'mod_timestamp' .goreleaser.yaml .goreleaser.yml` — empty output on a repo that ships `.tar.gz`/`.zip` archives (not raw binaries) is the finding. RUN: no, reading heuristic (mechanism traced through goreleaser's own source, `internal/gio/chtimes.go`/`internal/builders/base/build.go`; not independently planted, since it needs goreleaser itself to exercise, not just `go build`).
9. **GO-REL-09 — SHOULD.** Use `{{ .CommitDate }}` (or an equivalent `git log -1 --format=%cI`-derived value) for any `-X`-baked build date, never `{{ .Date }}`/wall-clock time. Verify (goreleaser-specific reading heuristic): `grep -n -e '{{ *\.Date *}}' -e '{{ *\.Now *}}' .goreleaser.yaml .goreleaser.yml` inside a `ldflags:`/`builds:` block — a hit there (as opposed to a `changelog:`/`release:` block, where `.Date` is fine) is the finding. RUN: yes for the underlying mechanism (`fixtures/.../out-A-realtime.bin` != `out-B-realtime.bin`, same everything except a wall-clock `-X main.date`, two builds two seconds apart); the grep itself was read as a heuristic, not executed against a planted goreleaser config.
10. **GO-REL-10 — SHOULD.** Run `govulncheck -mode=binary` against the **unstripped** build artifact, before a downstream strip/sign step removes symbols, and treat the stripped artifact's binary-mode scan (if run at all) as advisory only, expecting over-reporting. Rationale: this brief's own fixture reproduced the wave-2 measurement exactly in shape (unstripped 1 finding / stripped 4 findings on the same known-reachable CVE) — stripping does not create false negatives here, it creates false positives, but a reviewer expecting a *quiet* stripped binary will be surprised. `-s -w` remains permitted on the shipped artifact; it is the scan's *input* that should be unstripped. Verify: `govulncheck -mode=binary <artifact>`; exit 3 with a finding count is the signal, compare against the unstripped twin's count when triaging. RUN: yes, `fixtures/reproducible-builds-and-stamping/strip-govuln/` (`gv_unstripped.txt`: 1 finding, exit 3; `gv_stripped.txt`: 4 findings, exit 3).
11. **GO-REL-11 — SHOULD NOT.** Do not set `-buildvcs=false` in a release script merely to silence an environment quirk (missing VCS tool, CI checkout stripped of `.git`) without an inline comment naming the reason; prefer fixing the checkout (e.g. `actions/checkout` with `fetch-depth: 0` or at least the `.git` dir present) so `-buildvcs=auto`'s real stamping fires. Verify: `grep -rn -e 'buildvcs=false' -e 'buildvcs false' . --include='*.sh' --include='Makefile*' --include='*.yml' --include='*.yaml'` — any hit without an adjacent comment is the finding (reading heuristic for the comment; the grep for the flag itself is mechanical). RUN: no, reading heuristic; corpus precedent only ([modrel §4](../go-audit/exemplar-modules-and-release.md): 4/35 use it, always to disable, always in a script building from a location where `.git` may be absent).
12. **GO-REL-12 — SHOULD.** In a monorepo or any repository containing more than one independently-versioned VCS-tracked subtree, do not rely on default `-buildvcs=auto` stamping without testing it on Go ≥1.25; budget for `-buildvcs=false` plus a hand-rolled `-X`-only stamping path as the fallback. Rationale: Go 1.25 added a hard failure ("multiple VCS detected") for this exact topology that Go 1.24 did not have. Verify: attempt a real build from the actual repository layout on the pinned Go toolchain version and check the exit code; there is no static grep for "does this repo have more than one VCS root" that is reliable across VCS types. RUN: no — not reproducible in this environment (no SVN installed); cited from [golang/go#74763](https://github.com/golang/go/issues/74763) directly, flagged as unverified-here in Verification runs.
13. **GO-REL-13 — SHOULD.** Ship at least `linux`, `darwin`, `windows` × `amd64`, `arm64`, with `arm`+`GOARM` added only when an actual arm32 hardware target exists (Raspberry-Pi-class), and pin `GOAMD64`/`GOARM` levels only alongside that explicit target, not as a blanket "more coverage" default. Rationale: corpus practice (9/11 windows+arm64, `GOARM` pins always co-occurring with an arm matrix, never standalone) and goreleaser's own unpinned defaults (`GOARM: [6]`, `GOAMD64: [v1]`) agree this is a targeted choice, not a universal one. Verify: `grep -n -e 'goarm:' -e 'goamd64:' .goreleaser.yaml .goreleaser.yml` then confirm the same file's `goarch:` list actually includes `arm`/`amd64` — a `goarm:`/`goamd64:` line with no matching `goarch:` entry is orphaned config. RUN: yes for the underlying cross-compile mechanics (`fixtures/.../cross-matrix/`: 7/7 `GOOS`/`GOARCH`/`GOAMD64`/`GOARM` combinations built successfully under `CGO_ENABLED=0`); the grep pairing check itself is a reading heuristic.
14. **GO-REL-14 — MUST.** A `--version`/`version` subcommand must exist and must be reachable without a network call or side effect; verify it prints a parseable semver (the `-X`-set value) plus a short VCS revision, not `(devel)` or an empty string, on the actual release artifact. Verify: `<binary> --version` (or `version`) exit 0, output matching a `v?[0-9]+\.[0-9]+\.[0-9]+` pattern somewhere in the first line — `grep -c -e '[0-9]\.[0-9]\.[0-9]'` on the output. RUN: yes, mechanically (`out-A-good.bin`'s `main.version`/`ReadBuildInfo` output printed both a semver and a pseudo-version correctly in this fixture); the exact regex gate was read, not scripted as a standalone check beyond `go version -m`'s own module-version field.

## Verification runs

Toolchain: Go 1.27.1 via `/home/mherwig/.cache/research-lang/go-tools/run.sh`, `golangci-lint` not needed for this subarea. Fixture root: `/home/mherwig/.cache/research-lang/go-tools/fixtures/reproducible-builds-and-stamping/`.

### `repro-builds/` — GO-REL-01, 07, 09

```
cd repro-builds/clone-a-dirname
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -buildvcs=true \
  -ldflags "-X main.version=v1.2.3 -X main.commit=c11396192dff -X main.date=2026-01-01T00:00:00Z" \
  -o ../out-A-good.bin .
```
— exit 0. Same command, same ldflags, run in `clone-with-a-longer-dirname-b` (a second `git clone` of the same commit, 2s later) → `out-B-good.bin`.
`sha256sum out-A-good.bin out-B-good.bin` → **identical hash** (`b71027588c41c7e3ce07837d3ee1ee0e6a6f5ad7b893876166e2db68fbe4ab61` both). Reproducibility PASS (green).

Same two clones, same ldflags, **`-trimpath` removed**:
`sha256sum out-A-notrim.bin out-B-notrim.bin` → `019adc98...` vs `1dc92fdf...` — **different**. Violation (red), exit code n/a (both builds exit 0; the *comparison* is the check). `strings out-A-notrim.bin | grep -F` for the clone path found `.../clone-a-dirname/main.go` verbatim; the trimmed twin had zero hits for the same string.

Same two clones, `-trimpath` restored, but `-X main.date` set to the **real wall-clock time** at each build (2s apart) instead of the fixed `CommitDate`:
`sha256sum out-A-realtime.bin out-B-realtime.bin` → `585b601b...` vs `9f1ea24b...` — **different**. Violation (red).

Dirty-tree check: one appended comment line, uncommitted, then rebuilt from `clone-a-dirname`:
`go version -m out-A-dirty.bin` → `mod example.com/reprotool v0.0.0-20260101000000-c11396192dff+dirty`, `vcs.modified=true`. Clean twin (`out-A-good.bin`) → no `+dirty`, `vcs.modified=false`. PASS/FAIL pair confirmed (green/red).

Not run: the Go 1.25 "multiple VCS detected" error (GO-REL-12). Attempted with nested independent `git` repos under one tree; building from inside the inner repo's own root did not reproduce the error, because Go's VCS search starts at the module root and stops at the nearest enclosing repository — the reported failure needs a topology this environment does not have SVN to construct exactly as filed. Cited from [golang/go#74763](https://github.com/golang/go/issues/74763) directly; not independently reproduced. Empty output from any grep-based "does this repo have multiple VCS roots" check would mean nothing conclusive either way — there is no reliable static check for this, only a real build attempt on the pinned toolchain.

### `cgo-net-osuser/` — GO-REL-02, 03, 04

```
cd cgo-net-osuser
env -u CGO_ENABLED go build -o unset-cgo.bin .   # exit 0
CGO_ENABLED=0        go build -o disabled-cgo.bin . # exit 0
```
`file unset-cgo.bin` → `dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2`. `go version -m unset-cgo.bin` → `CGO_ENABLED=1`.
`file disabled-cgo.bin` → `statically linked`. `go version -m disabled-cgo.bin` → `CGO_ENABLED=0`.
Both binaries printed `uid: 1000` when run — functionally identical output despite the link-mode difference. PASS (green) = statically linked with `CGO_ENABLED=0`; FAIL (red) = dynamically linked when `CGO_ENABLED` was left unset.

Cross-arch cgo failure:
```
CGO_ENABLED=1 GOOS=linux GOARCH=arm64 go build -o /tmp/cgo-cross-arm64.bin .
```
→ exit 1, `gcc_arm64.S: Assembler messages: ... Error: no such instruction: 'stp x29,x30,[sp,'` (host `as` is x86-64, target asm is arm64). Same command with `CGO_ENABLED=0` → exit 0. Red/green pair confirmed.

### `strip-govuln/` — GO-REL-10

```
cd strip-govuln
go mod init example.com/stripgovuln && go get golang.org/x/text@v0.3.0
CGO_ENABLED=0 go build -trimpath -o unstripped.bin .
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o stripped.bin .
govulncheck ./...                       # source mode: exit 3, 1 reachable finding (GO-2021-0113)
govulncheck -mode=binary unstripped.bin  # exit 3, 1 finding (GO-2021-0113, with symbol trace)
govulncheck -mode=binary stripped.bin    # exit 3, 4 findings (GO-2021-0113, GO-2026-5970, GO-2022-1059, GO-2020-0015)
go version -m unstripped.bin | diff - <(go version -m stripped.bin | sed 's/^stripped/unstripped/')
```
`go version -m` output for `path`/`mod`/`dep`/`build` lines was identical between the two binaries (only the filename in the header line differs) — confirmed by inspection, not by an automated diff command left in the fixture (a genuinely trivial equality, not scripted further). This independently reproduces GO-MOD-13's measured 4-vs-1 finding count.

### `cross-matrix/` — GO-REL-04, 13

```
for combo in "linux amd64 v1" "linux amd64 v3" "linux arm64 -" "windows amd64 v1" \
             "darwin arm64 -" "linux arm 6" "linux arm 7"; do
  CGO_ENABLED=0 GOOS=... GOARCH=... [GOAMD64=... | GOARM=...] go build -trimpath -o tool-... .
done
```
All 7 combinations: exit 0. This is a positive-only run (no violation twin was needed — the point is that the matrix builds cleanly under `CGO_ENABLED=0`; the violation is GO-REL-04's cross-arch cgo failure above, which uses the same architecture target).

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| GO-REL-01 (`-trimpath`) | `goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml:52`; `caddyserver/caddy@54937914234b:.goreleaser.yml:82`; `sigstore/cosign@907c3d899c0e:.goreleaser.yml:29` (all `flags: [-trimpath]`) | 6/20 root Makefiles pass `-trimpath` explicitly ([modrel §3](../go-audit/exemplar-modules-and-release.md)) — the other 14 either have no Makefile-driven build or omit it, a latent reproducibility gap the audit flagged but did not attribute to any specific repo shipping non-reproducible releases |
| GO-REL-02/03 (`CGO_ENABLED` scoping) | `sigstore/cosign@907c3d899c0e:.goreleaser.yml:8` (top-level `CGO_ENABLED=1`) overridden at `.goreleaser.yml:37-43` (`linux` build, `CGO_ENABLED=0`); `goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml:33` (`CGO_ENABLED=0` at the single build entry) | `CGO_ENABLED=0`/`=1` appears in only 10/104 and 3/104 Dockerfiles respectively — most builder-stage Dockerfiles inherit it from a Makefile or the base image instead of setting it themselves ([modrel §3](../go-audit/exemplar-modules-and-release.md)), i.e. the setting is real but its *location* is often implicit, not a contradiction of the policy |
| GO-REL-05 (`-X` + `ReadBuildInfo` together) | 10/35: `cli/cli`, `golangci-lint`, `golang/vuln`, `go-containerregistry`, `hashicorp/terraform`, `ko-build/ko`, `kubernetes/kubernetes`, `controller-runtime`, `regclient/regclient`, `tailscale/tailscale` ([modrel §4](../go-audit/exemplar-modules-and-release.md)) | `bazel-contrib/rules_go`, `caddyserver/caddy`, `dominikh/go-tools`, `golang/tools` use `ReadBuildInfo` only — not a violation, a legitimate simpler alternative for a tool with no curated semver of its own |
| GO-REL-08 (`mod_timestamp`) | `goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml:23,49`; `sigstore/cosign@907c3d899c0e:.goreleaser.yml:29-30`; `oras-project/oras@a0cd4de5cfcd` ([modrel §3 table](../go-audit/exemplar-modules-and-release.md)) | 8/11 goreleaser-using binary-shipping repos do **not** set it (only 3/11: goreleaser, cosign, oras) — [modrel §3](../go-audit/exemplar-modules-and-release.md) headline number, this brief's Summary |
| GO-REL-09 (`CommitDate` not `Date`) | `goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml:53` (`-X main.date={{ .CommitDate }}`) | most of the 17/35 repos stamping via `-X` were not individually checked for `Date` vs `CommitDate` in the audit; this brief only confirms the *mechanism*'s effect (§Verification runs), not a corpus-wide census of which repos get it wrong |
| GO-REL-10 (unstripped govulncheck) | No exemplar was observed running `govulncheck -mode=binary` in CI at all (govulncheck's CI usage in the corpus is source-mode, per GO-MOD-12/M-M-11) — this candidate is a gap-fill, not a corpus-confirmed practice | n/a |
| GO-REL-11 (`-buildvcs=false` reasoned) | `cli/cli@9b031151a825:script/api-host-gateway/test.sh:86-87`; `kubernetes/kubernetes@dfd7b93a1783:test/images/image-util.sh:244` — both building per-arch test images ([modrel §4](../go-audit/exemplar-modules-and-release.md)) | none of the 4/35 usages carry an inline comment explaining *why*; the audit inferred the reason from surrounding context, which is itself evidence the SHOULD (require a comment) is not yet corpus practice |
| GO-REL-13 (matrix + GOARM/GOAMD64) | `caddyserver/caddy@54937914234b:.goreleaser.yml` (`goarm: ["5","6","7"]` alongside `goarch: [amd64, arm, arm64, s390x, ppc64le, riscv64]`) | `golangci/golangci-lint` is the only `GOAMD64` pin in the corpus (1/11) — consistent with "targeted, not default," not a violation |

## AI-agent angle

1. **Assuming `debug.ReadBuildInfo()` output is a version string.** An agent asked to "print the version" will often do `fmt.Println(debug.ReadBuildInfo())`, which dumps the entire dependency graph and an internal serialization format, not a `--version` UX. Smallest mechanical check: the binary's `--version` output must not contain the literal `BuildInfo.String()` markers (`path\t`, `mod\t`, tab-separated `dep` lines) — `grep -c -e $'path\t' -e $'dep\t'` on the version output should be 0.
2. **Writing `mod_timestamp` as if it were a `go build`/`GOFLAGS` setting**, or worse, hallucinating a `-X` binding for it. It is a goreleaser-only post-build `os.Chtimes` call with no equivalent in the bare `go` toolchain. Check: `grep -rn -e 'GOFLAGS.*mod_timestamp' -e 'go build.*mod_timestamp' .` should always be empty — any hit is a hallucinated flag.
3. **Setting `CGO_ENABLED=0` at the workflow/repo level and leaving it there for the `-race` job too**, because "the release wants it and CGO_ENABLED is just one env var." This is GO-GATE-04's exact failure mode, and this subarea's fixture shows the mechanism the other direction (unset ≠ 0). Check: `grep -rn -e 'CGO_ENABLED: *0' -e 'CGO_ENABLED=0' .github/workflows` and confirm every hit sits in a build/release job, never a `-race` job.
4. **Treating `-s -w` as strictly a size optimization with no downstream cost**, or the opposite mistake — refusing `-s -w` "because it breaks vulnerability scanning" without checking that the scan just needs to run before stripping, not that stripping must be abandoned. Check: does the release pipeline run `govulncheck -mode=binary` (or source-mode `govulncheck ./...`, which is unaffected) *before* the strip step, not only after.
5. **Assuming `-buildvcs=true` (or the default `auto`) always "just works" in a monorepo.** Go 1.25 made this a hard build failure for repos with more than one VCS root, a behavior that did not exist in 1.24. An agent scaffolding a new Go module inside an existing polyglot monorepo should test the real build on the pinned toolchain version rather than assuming VCS stamping degrades gracefully.
6. **Hand-writing a cross-compile CI matrix with `CGO_ENABLED` omitted "since it defaults to 0 for cross builds anyway."** It does not — `CGO_ENABLED` unset resolves via `go env`'s cgo-availability heuristic independent of `GOOS`/`GOARCH`, and this brief's fixture shows the concrete failure (arm64 assembler errors) when that assumption is wrong. Check: build the actual cross target once with `CGO_ENABLED` unset and confirm it either explicitly fails fast or was never going to link cgo in the first place — do not assume.
7. **Using `golang.org/x/text`-style pinned-vulnerable-version fixtures (or any hallucinated CVE ID) without checking the `govulncheck` output for the real ID.** An agent citing a vulnerability check should quote the actual `GO-YYYY-NNNN` ID from the tool's own output (as this brief did: `GO-2021-0113`, `GO-2026-5970`, `GO-2022-1059`, `GO-2020-0015`), never a remembered or invented CVE number, since govulncheck's IDs are namespaced (`GO-...`), not raw NVD `CVE-...` IDs, and the two are easy to conflate.

## Contested / evolving

- **go.dev/blog/rebuild is about the `go` distribution, not user binaries.** It documents how the Go project itself achieves bit-for-bit-identical *toolchain* releases (the compiler/linker/stdlib archive itself), using techniques like disabling cgo for the bootstrap build and a `go/VERSION` file for the timestamp — [go.dev/blog/rebuild](https://go.dev/blog/rebuild). It is frequently cited as if it directly documents *application* build reproducibility; the flags it names (`-trimpath`, cgo-disabled, deterministic time) are the same ones a fleet CLI needs, but the article's actual subject and its "perfect reproducibility since Go 1.21" claim are about `go.dev/dl` release archives, not anyone's `go build ./cmd/mytool`. Cite it for the *technique*, not as evidence that `go build` is reproducible by default without the flags in GO-REL-01/02/09.
- **Go 1.25's multiple-VCS build failure is a live, unresolved-as-filed regression as of this research date (2026-09-26).** [golang/go#74763](https://github.com/golang/go/issues/74763) is open; whether the eventual fix restores 1.24's graceful-degrade behavior (silently omit stamping) or keeps the hard error (forcing an explicit `-buildvcs=false`) is not yet settled upstream. A fleet Go-modules or go-release skill written today should treat this as "test it," not "trust the default," and be ready to revise once the issue resolves.
- **Whether `-s -w` belongs in a fleet MUST-ship-stripped policy or a case-by-case SHOULD is still a live trade-off, not settled by this brief.** The corpus splits close to evenly (7/11 goreleaser configs strip, per [modrel §3](../go-audit/exemplar-modules-and-release.md)); this brief's contribution is narrowing *what* the trade-off costs (govulncheck-binary-mode over-reporting, not `BuildInfo` loss), which should make the SHOULD easier to act on but does not resolve it to a MUST either way.
- **SOURCE_DATE_EPOCH is the cross-language convention; goreleaser's `mod_timestamp`/`{{.CommitDate}}` pair is Go/goreleaser-specific and not itself `SOURCE_DATE_EPOCH`-aware.** A fleet build that also produces non-Go artifacts (container images, docs) from the same commit may want to set `SOURCE_DATE_EPOCH` once and have *that* value feed both the goreleaser template variables and any other tool in the pipeline that does honor the env var natively — this composition is not something any exemplar in this corpus was observed doing, and is noted as an open opportunity rather than a verified pattern.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [go.dev/blog/rebuild](https://go.dev/blog/rebuild) | Go team blog post on toolchain-distribution reproducibility | Go 1.21-era retrospective | Primary source for the technique vocabulary (trimpath, cgo-disabled, deterministic timestamps) — see Contested for scope caveat |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) | Official Go 1.24 release notes | 2025-02 | Primary; documents the VCS-derived main-module-version feature and `-buildvcs=false` |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) (fetched via [golang/website@master:_content/doc/go1.25.md](https://raw.githubusercontent.com/golang/website/master/_content/doc/go1.25.md)) | Official Go 1.25 release notes | 2025-08 | Primary; `go version -m -json`, `go.mod ignore` directive — does not itself document the multi-VCS regression, which is tracked separately |
| [golang/go#74763](https://github.com/golang/go/issues/74763) | Upstream issue tracker, open bug | filed against go1.25rc2, open as of 2026-09-26 | Primary; the exact "multiple VCS detected" error text and the nested-module `(devel)` regression, straight from affected users and the Go team |
| [pkg.go.dev/runtime/debug#BuildInfo](https://pkg.go.dev/runtime/debug#ReadBuildInfo) | Standard library reference doc | current (Go 1.27) | Primary; `BuildInfo`/`BuildSetting` field and key reference |
| [pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go) | `go` command reference doc | current (Go 1.27) | Primary; exact `-buildvcs` flag semantics (`auto`/`true`/`false`) |
| [pkg.go.dev/cmd/link](https://pkg.go.dev/cmd/link#hdr-Options) | Linker reference doc | current (Go 1.27) | Primary; exact `-s`/`-w`/`-X` semantics and the `-X` constant-only limitation |
| [pkg.go.dev/net](https://pkg.go.dev/net#hdr-Name_Resolution) | `net` package reference doc | current (Go 1.27) | Primary; exact conditions under which the cgo resolver is used, `netgo`/`netcgo` tags |
| [pkg.go.dev/os/user](https://pkg.go.dev/os/user) | `os/user` package reference doc | current (Go 1.27) | Primary; cgo-vs-pure-Go fallback behavior, `osusergo` tag |
| [goreleaser.com/customization/builds/go/](https://goreleaser.com/customization/builds/go/) | Tool's own docs, Go build customization | current (goreleaser v2) | Primary (tool's own repository docs); `mod_timestamp`, `ldflags`, matrix defaults |
| [goreleaser.com/blog/reproducible-builds/](https://goreleaser.com/blog/reproducible-builds/) | Tool's own blog, reproducibility recipe | goreleaser v1/v2-era | Primary; the exact `mod_timestamp`/`{{.CommitDate}}`/`-trimpath` recipe this brief verified |
| [reproducible-builds.org/docs/source-date-epoch/](https://reproducible-builds.org/docs/source-date-epoch/) | Cross-ecosystem reproducible-builds project docs | ongoing convention, no single date | Primary for the convention; confirms Go's toolchain does not consume it natively (contrast with goreleaser's own timestamp mechanism) |
| [goreleaser/goreleaser@ff8de3d6c389](https://github.com/goreleaser/goreleaser/blob/ff8de3d6c389/.goreleaser.yaml) | Exemplar corpus repo, own release config + source (`internal/gio/chtimes.go`, `internal/builders/base/build.go`) | cloned 2026-09-26 at this SHA | The reference implementation dogfooding every reproducibility feature it ships, and the ground truth for what `mod_timestamp` actually does |
| [sigstore/cosign@907c3d899c0e:.goreleaser.yml](https://github.com/sigstore/cosign/blob/907c3d899c0e/.goreleaser.yml) | Exemplar corpus repo release config | cloned 2026-09-26 at this SHA | Real per-build-id `CGO_ENABLED` override and Makefile-populated `LDFLAGS` env var pattern |
| [caddyserver/caddy@54937914234b:.goreleaser.yml](https://github.com/caddyserver/caddy/blob/54937914234b/.goreleaser.yml) | Exemplar corpus repo release config | cloned 2026-09-26 at this SHA | `ReadBuildInfo`-only stamping (no `-X`), `-s -w` with a wide `GOARM` matrix, no `mod_timestamp` |
| [go-audit/exemplar-modules-and-release.md §3, §4, §7](../go-audit/exemplar-modules-and-release.md) | This program's wave-1 audit of the 35-repo corpus | 2026-09-26 | The corpus census this brief cites throughout (goreleaser adoption, stamping overlap counts, cross-compile matrices, cgo false-positive rate) |
| [go-modules.md § GO-MOD-13](../go-modules.md) | This program's wave-2 consolidation | 2026-09-26 | The prior 4-vs-1 govulncheck-binary-mode measurement this brief independently re-ran and confirmed |
| [go-gates.md § GO-GATE-04](../go-gates.md) | This program's wave-2 consolidation | 2026-09-26 | The `-race`-job `CGO_ENABLED` placement rule this brief's GO-REL-02/03 composes with |
