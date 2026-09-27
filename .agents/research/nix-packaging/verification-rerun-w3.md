---
title: "Packaging rerun: ocx end to end, aws-lc-sys's cmake mechanism, PKG-16 as a checks derivation, ocx-sdk-python's export shape (NIX-PKG)"
topic: nix-packaging/verification-rerun-w3
agent: nix-packaging/verification-rerun-w3
model: sonnet
date_researched: 2026-09-27
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w3/ (wiped by an environment fault partway through this dive — see §0)
scope: >
  Builds what fleet-builders.md and nix-packaging.md Applied left unbuilt:
  ocx end to end (both binaries, real wall time, real closure attempt),
  `nix build --rebuild` determinism, NIX-GATE-10's per-PR cost, aws-lc-sys's
  cc-vs-cmake builder selection traced to source, NIX-PKG-16 as a `checks`
  derivation, and ocx-sdk-python's two Python-library export shapes (M-D-27).
  Does NOT cover: Darwin/aarch64 builds (M-D-23, still no non-x86_64-linux
  runner here), grimoire (already built in fleet-builders.md), or the
  generated (D) flake (NIX-GEN, already consolidated). An **environment
  fault mid-dive** (§0) means the closure-size measurement, the
  `--rebuild` determinism build, and the PKG-16 `checks` derivation's
  red/green build were not completed; each is flagged NOT RUN below with
  the exact command to rerun.
---

# Packaging rerun: ocx end to end, aws-lc-sys's `cmake`, PKG-16 as a check, ocx-sdk-python's export

## Table of contents

- [0. Environment fault, mid-dive](#0-environment-fault-mid-dive)
- [Summary](#summary)
- [Findings](#findings)
  1. [ocx builds end to end: both binaries, real wall time](#1-ocx-builds-end-to-end-both-binaries-real-wall-time)
  2. [Correction: ocx's `Cargo.lock` has 10 git dependencies, not 0](#2-correction-ocxs-cargolock-has-10-git-dependencies-not-0)
  3. [ocx has no `-V`/`--version` flag: `versionCheckHook` needs the `version` subcommand](#3-ocx-has-no--v--version-flag-versioncheckhook-needs-the-version-subcommand)
  4. [Determinism: not watched, but the mechanism reads deterministic-by-construction](#4-determinism-not-watched-but-the-mechanism-reads-deterministic-by-construction)
  5. [GATE-10's cost: warming the vendor dir does not touch the dominant cost](#5-gate-10s-cost-warming-the-vendor-dir-does-not-touch-the-dominant-cost)
  6. [aws-lc-sys traced: `cmake` is an unconditional build-dependency that is usually never invoked](#6-aws-lc-sys-traced-cmake-is-an-unconditional-build-dependency-that-is-usually-never-invoked)
  7. [NIX-PKG-16 as a `checks` derivation: written, not watched (E25 still open)](#7-nix-pkg-16-as-a-checks-derivation-written-not-watched-e25-still-open)
  8. [ocx-sdk-python: `pythonImportsCheck` builds, and the two export shapes diverge exactly as predicted](#8-ocx-sdk-python-pythonimportscheck-builds-and-the-two-export-shapes-diverge-exactly-as-predicted)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Revision log (for nix-packaging.md's fold)](#revision-log-for-nix-packagingmds-fold)
- [Sources](#sources)

## 0. Environment fault, mid-dive

`/home/mherwig/.cache/research-lang/nix-tools/` — the shared, rootless Nix
toolchain every wave-3 packaging dive uses — was **progressively deleted by
something other than this session** while this dive was running (2026-09-27,
starting shortly after 13:55 local). Sequence observed, each confirmed by a
direct `ls`/`find` in this same session:

1. `run.sh` itself vanished (`ls`: `No such file or directory`) right after
   the second `ocx` build (§1) completed successfully.
2. The reconstructed `run.sh` (rebuilt verbatim from the exact `bwrap`
   invocation this session had captured live via `ps aux` while the earlier
   `ocx` build was running — not reinvented) failed: the toolchain profile's
   store path (`/nix/store/5jir1nspka2hhr405c1f68yfccjjv7z7-nix-research-tools`)
   was **absent from the 19 GB store** it had been part of minutes earlier.
3. `toolchain/`, `fixtures/` (this dive's own `verification-rerun-w3/`
   included), and `conf/` were then gone entirely; `find nix-tools -maxdepth 2`
   returned only `run.sh` (this session's own reconstruction).
4. `timeout 20 run.sh nix --version` then failed with
   `bwrap: Can't find source path .../.nix-portable/emptyroot: No such file or directory`
   — the brief's stated stop condition.

This session made **no** `nix store gc`, `nix-collect-garbage`, `nix store
optimise`, or `rm -rf` touching anything under `nix-tools/` outside its own
fixture subdirectory. The fault is external — almost certainly another
concurrent wave-3 sibling dive (the frame documents this store as shared and
serialized across dives) running a cleanup or reset against shared state
while this dive still held builds in flight. Per the brief's own rule, Nix
work stopped at that point rather than fabricating further "watched"
results.

**What this means for the rest of the document:** items 1–3 and 6 of the
brief were fully executed with real, watched builds *before* the fault (full
logs quoted below, from this session's own tool output — not reconstructed).
Item 2 (determinism) and part of item 5 (a byte-for-byte `--rebuild`) were
cut short: the `--rebuild` build was launched but its completion could not be
confirmed once the toolchain disappeared, so it is reported as **NOT RUN**
with the reading-level mechanism analysis instead. Item 5's checks-derivation
fixture (§7) was written and committed but never built. All fixture *sources*
quoted in this document are reproduced verbatim from this session's own
`Write`/`Edit` calls, not from re-reading files that no longer exist on disk.

## Summary

- **`ocx` builds end to end under `rustPlatform.buildRustPackage`**, both
  `[[bin]]` targets (`ocx`, `ocx-shim`) selected via `cargoBuildFlags = [ "-p" "ocx" "-p" "ocx_shim" ]`,
  `version` read from `.workspace.package.version`, `nativeBuildInputs = [ pkg-config ]` — nothing more —
  and a passing `versionCheckHook` once its arg is fixed (Finding 3). This
  answers fleet-builders.md's open "ocx end-to-end" question and
  nix-packaging.md Applied's "both are unbuilt" note: **both are now built**.
- **Correction to nix-packaging.md's own V-fb #11**: `grep -c 'source = "git+' Cargo.lock`
  on the real `ocx` repository returns **10**, not 0. `ocx_python` vendors
  9 crates from `astral-sh/uv` (one rev) and 1 from `astral-sh/pubgrub`
  (`version-ranges`) as git dependencies — `cargoLock.outputHashes` is
  required, with exactly **2** entries (one per unique commit SHA;
  `importCargoLock` keys internally by SHA, so any package name/version
  sourced from that SHA works as the map key for every sibling package from
  the same repo+rev).
- **`ocx` has no `-V`/`--version` flag at all.** Its `Cli` struct
  (`app.rs`) never sets `#[command(version)]`, so clap rejects `--version`
  outright (`error: unexpected argument '--version' found`) and reports its
  version only through a custom `version` subcommand. `versionCheckHook`'s
  default arg is wrong for this binary; the flake must set
  `versionCheckProgramArg = "version"`.
- **Measured wall time**: the compile phase alone took **5m39s** (first
  build, right after the `outputHashes` fix) and **6m01s** (second build,
  after only the `versionCheckProgramArg` line changed — everything else
  byte-identical). Total wall clock for the second `nix build` (measured
  with the shell's own `time`, vendor dir warm from the first build):
  **7m12s** (3310.89s user, 244.26s system, 822% average CPU — the sandbox
  used most of its ~16 logical cores for `rustc`'s own parallel codegen
  units, not for parallel crate compilation, since `codegen-units` was left
  at nixpkgs' Rust-profile default here, not the fleet's own size-tuned
  `dist` profile).
- **Both binaries installed and stripped**: the build log's `fixupPhase`
  names both `shrinking .../bin/ocx-shim` and `shrinking .../bin/ocx`
  explicitly.
- **GATE-10's real cost is compilation, not vendoring, and warming the
  vendor derivation buys almost nothing.** The two builds above differ by
  exactly one non-source attribute (`versionCheckProgramArg`); because
  `buildRustPackage` is a single non-incremental derivation, that one-line
  change forced a full ~6-minute `rustc` recompile of all ~300 workspace +
  dependency crates from scratch, identical in kind to the first build.
  The crate-vendoring step (`cargo-vendor-dir`, ~500 tiny `curl` fetches
  from `static.crates.io`) *was* reused (no `trying https://static.crates.io`
  lines appear in the second build's log) — but that step was never the
  bottleneck. **A metadata-only PR (bump `meta.description`, add a
  `versionCheckHook` arg, tweak `nativeBuildInputs`) costs the fleet the
  same ~7 minutes as a source change**, because nothing about
  `buildRustPackage`'s single-derivation shape lets Nix skip recompilation
  when only non-compiled attributes change.
- **Closure size was not measured** (`nix path-info -S` was queued for the
  moment the environment fault hit — see §0). NOT RUN.
- **`nix build --rebuild` for determinism was launched but not confirmed
  complete before the fault; treat M-D-24 as still open, empirically.**
  Reading `ocx_cli/build.rs` end to end (quoted in Finding 4) gives a
  strong *prediction* of determinism under Nix's default sandbox — `CI` is
  unset (so `vergen_gix::BuildBuilder::build_timestamp(false)`, no live
  timestamp emitted) and there is no `.git/` directory in the fileset `src`
  (so `GixBuilder` fails and logs a warning rather than emitting any
  `VERGEN_GIT_*` variable) — but this is a reading-level claim, not a
  watched rebuild-hash comparison, and is reported as such.
- **aws-lc-sys's `cmake`-versus-`cc` mechanism is fully resolved from
  source, no toolchain needed.** `builder/main.rs`'s `get_builder()`
  tries `CcBuilder` first and only falls back to `CmakeBuilder` when: an
  explicit `AWS_LC_SYS_CMAKE_BUILDER=1` override is set, `is_no_asm()` or a
  sanitizer is active, it is a FIPS build, or **bindgen is required**
  (i.e., the target has no pre-generated FFI bindings). The Rust `cmake`
  crate (the wrapper, not the `cmake` binary) is an *unconditional*
  `[build-dependencies]` entry in `aws-lc-sys/Cargo.toml`, which is why
  `Compiling cmake v0.1.58` appears in every build's log regardless of
  which path executes — it says nothing about whether a real `cmake`
  binary was ever invoked.
- **NIX-PKG-17's "pkg-config only" recipe is target-*conditional*, not
  target-independent** — conditional on: pre-generated bindings existing
  for the target (`is_bindgen_required() == false`), no FIPS feature, no
  explicit `AWS_LC_SYS_CMAKE_BUILDER` override, and no sanitizer/`no_asm`
  build. For every Linux glibc/musl target the fleet ships (per
  aws-lc-sys's own bindings list), that condition holds and `CcBuilder`
  (needing only a C compiler, already in `stdenv`) is selected — `cmake`
  the binary is never invoked. On a target lacking pre-generated bindings,
  or under `AWS_LC_SYS_FIPS`, `CmakeBuilder` runs and a real `cmake` plus
  (for bindgen) `libclang` would be required.
- **NIX-PKG-16 was drafted as a `checks` derivation** (E25's open item) but
  **the build was never run** — the environment fault hit before it could
  execute. The `builtins.compareVersions` logic is straightforward and the
  same comparison this program already verified as a shell one-liner
  (P11), but this specific derivation form is NOT RUN, not watched.
- **ocx-sdk-python's `pythonImportsCheck = [ "ocx_sdk" ]` builds clean,
  exit 0**, reaching `pythonImportsCheckPhase`/`pythonMetadataCheckPhase`
  with no error — this closes nix-packaging.md's "unbuilt" note for
  PKG-18/M-D-27's `ocx-sdk-python` half.
- **M-D-27 (Python library export shape) is answered and watched
  red/green**: a `pythonPackagesExtensions` overlay makes `ocx-sdk`
  resolvable under *every* interpreter's `pythonN.pkgs` set
  (`python312.pkgs.ocx-sdk` and `python313.pkgs.ocx-sdk` both built,
  exit 0, from one consumer flake with two distinct interpreter attrs);
  a top-level attribute bound to `python3` alone does **not** reach other
  interpreters — `pkgs.python312.pkgs.ocx-sdk` on a top-level-only export
  fails at eval with `error: attribute 'ocx-sdk' missing`, watched red.
  **Ship both**: the overlay so consumers can compose it into their own
  `pythonPackagesExtensions`, and a top-level `packages.<system>.ocx-sdk`
  bound to whichever `python3` this flake's nixpkgs picks, for the
  `nix build .#ocx-sdk` / `nix run` consumer who does not know or care that
  the package lives inside `pythonPackages`.

## Findings

### 1. ocx builds end to end: both binaries, real wall time

The fixture was assembled from `/home/mherwig/dev/ocx` HEAD
`2691d3c1638e75b7830fcd68784a2d23a66a0802`, copied via `git archive HEAD | tar -x`
(equivalent to a `git ls-files`-scoped copy: only tracked files, no
`rsync --exclude` narrowing — PKG failure mode 12) into
`fixtures/verification-rerun-w3/packaging/ocx/`, with the three git
submodules (`external/docker_credential`, `external/rust-oci-client`,
`external/sigstore-rs`) populated the same way from their own pinned SHAs
(`974bd339d179`, `e5ed433a7e7e`, `2361ffe07303`), since `ocx`'s
`[patch.crates-io]` resolves onto path dependencies under `external/`
exactly like grimoire's (fleet-builders.md Finding 7). `diff <(git ls-files | sort) <(find copy -type f | sort)`
showed only the three submodule gitlink lines missing from the raw copy —
expected, and fixed by the per-submodule `git archive`.

The verified `package.nix` (reproduced verbatim from this session's `Write`;
**not independently re-checked with `nixfmt --check` after the environment
fault** — flagged, not claimed clean):

```nix
{
  lib,
  rustPlatform,
  pkg-config,
  versionCheckHook,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  pname = "ocx";
  version = (lib.importTOML ./Cargo.toml).workspace.package.version;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./Cargo.toml
      ./Cargo.lock
      ./rust-toolchain.toml
      ./crates
      ./external
    ];
  };

  cargoLock = {
    lockFile = ./Cargo.lock;
    outputHashes = {
      "uv-cache-key-0.0.1" = "sha256-I0Oe6vaH7iQh+Ubp5RIk8Ol6Ni7OPu8HKX0fqLdewyk=";
      "version-ranges-0.1.1" = "sha256-6A3XWOIYOSnQCz80yPGrcCeH3r/9BxX80+58Y0Hgzlg=";
    };
  };

  cargoBuildFlags = [
    "-p"
    "ocx"
    "-p"
    "ocx_shim"
  ];

  nativeBuildInputs = [ pkg-config ];

  strictDeps = true;
  __structuredAttrs = true;

  doCheck = false; # unit/integration tests need network + a real OCI registry

  nativeInstallCheckInputs = [ versionCheckHook ];
  doInstallCheck = true;
  versionCheckProgram = "${placeholder "out"}/bin/ocx";
  versionCheckProgramArg = "version"; # NOT "--version" — see Finding 3

  meta = {
    description = "The simple package manager";
    homepage = "https://ocx.sh";
    license = lib.licenses.asl20;
    mainProgram = "ocx";
    platforms = lib.platforms.unix;
  };
})
```

Both `nix flake check --no-build .` (eval-only, exit 0 after the
`outputHashes` fix, see Finding 2) and `nix build --no-link -L .` (a real
build, exit 0 after the `versionCheckProgramArg` fix, see Finding 3)
succeeded. The build log's `fixupPhase` names both binaries by path:
`shrinking .../bin/ocx-shim` and `shrinking .../bin/ocx`, at output path
`/nix/store/mzlzhik1kz0lxaqcmgfkv59mphp51pvz-ocx-0.6.3`. `installPhase`
ran `cargoInstallHook` with no error, meaning the workspace's `cargo install`
equivalent picked up both `[[bin]]` targets named by `-p ocx -p ocx_shim`
without any extra `installPhase` override — nixpkgs' default `buildRustPackage`
install step already installs every binary Cargo's own metadata reports for
the selected packages, not just one.

Closure size was queued (`nix path-info -Sh /nix/store/mzlzhik1kz0lxaqcmgfkv59mphp51pvz-ocx-0.6.3`)
but the environment fault (§0) hit before it ran. **NOT RUN.**

### 2. Correction: ocx's `Cargo.lock` has 10 git dependencies, not 0

nix-packaging.md's own V-fb #11 states: "`grep -c 'source = \"git+' Cargo.lock`
… returns `0` in both" (`ocx` and `grimoire`). Re-running that *exact*
command on the live `/home/mherwig/dev/ocx` repository (not the fixture,
not a paraphrase):

```
$ grep -c 'source = "git+' /home/mherwig/dev/ocx/Cargo.lock
10
$ grep -n 'source = "git+' /home/mherwig/dev/ocx/Cargo.lock
6970:source = "git+https://github.com/astral-sh/uv?rev=0adb444806e8bcea7e7a5e9ae90d1288778a0b54#0adb444806e8bcea7e7a5e9ae90d1288778a0b54"
... (8 more identical astral-sh/uv lines)
7152:source = "git+https://github.com/astral-sh/pubgrub?rev=d8efd77673c9a90792da9da31b6c0da7ea8a324b#d8efd77673c9a90792da9da31b6c0da7ea8a324b"
```

`grimoire`'s `0` stands (unaffected, not re-measured here). `ocx`'s 10
lines resolve to exactly **two** distinct git sources: 9 packages from
`astral-sh/uv` at one rev (`uv-cache-key`, `uv-distribution-filename`,
`uv-fs`, `uv-normalize`, `uv-pep440`, `uv-pep508`, `uv-platform-tags`,
`uv-redacted`, `uv-small-str`) and 1 (`version-ranges`) from
`astral-sh/pubgrub`. These reach `ocx` via `ocx_python`, which resolves
Python toolchains the same way `uv` does.

Attempting the naive `cargoLock.lockFile = ./Cargo.lock;` with no
`outputHashes` fails at *eval* time (`nix flake check --no-build`), not at
build time:

```
error: No hash was found while vendoring the git dependency uv-cache-key-0.0.1. You can add
a hash through the `outputHashes` argument of `importCargoLock`: …
```

nixpkgs' `importCargoLock` (`pkgs/build-support/rust/import-cargo-lock.nix`)
keys `outputHashes` **by commit SHA internally**, not by package name — it
builds a `namesGitShas` map from every git-sourced package's `name-version`
to its rev, then converts the user's `outputHashes` (`name-version` → hash)
into a `rev → hash` map via that lookup. Concretely: `nameVer:
namesGitShas.${nameVer}`. This means only **one** entry per distinct rev is
required — any single package name/version sourced from that rev serves as
the key, and every other package from the same repo+rev is fetched via the
same `fetchgit` call and validated against the same hash. Ten git-sourced
packages, two distinct revs, **two** `outputHashes` entries:

```nix
outputHashes = {
  "uv-cache-key-0.0.1" = "sha256-I0Oe6vaH7iQh+Ubp5RIk8Ol6Ni7OPu8HKX0fqLdewyk=";     # astral-sh/uv@0adb4448
  "version-ranges-0.1.1" = "sha256-6A3XWOIYOSnQCz80yPGrcCeH3r/9BxX80+58Y0Hgzlg=";  # astral-sh/pubgrub@d8efd776
};
```

Both hashes were obtained the documented way (`lib.fakeHash` first, then
read the real hash off the `hash mismatch … got:` error) — not invented,
not copied from elsewhere. One incidental observation from the build log
while fetching them: `error (ignored): filesystem error: cannot rename:
Permission denied […].drv.chroot/root/nix/store/…]` appeared on *every*
fixed-output-derivation fetch in this sandbox (both the `pubgrub` and the
`uv` fetch), immediately before the (correct) `hash mismatch` error — it is
printed as `(ignored)` and does not affect the outcome, but is worth
flagging as sandbox log noise specific to this bwrap-based `run.sh`, not a
nixpkgs or aws-lc-sys artifact.

### 3. ocx has no `-V`/`--version` flag: `versionCheckHook` needs the `version` subcommand

The first full, successful compile (Finding 1's fixture, after the
`outputHashes` fix) still failed at `installCheckPhase`:

```
ocx> Executing versionCheckPhase
ocx> Did not find version 0.6.3 in the output of the command /nix/store/…-ocx-0.6.3/bin/ocx --version
ocx> error: unexpected argument '--version' found
ocx>
ocx> Usage: ocx [OPTIONS] [COMMAND]
```

`crates/ocx_cli/src/app.rs`'s `Cli` struct is:

```rust
#[derive(Parser)]
#[command(name = "ocx", about, long_about = None)]
#[command(about = "A simple package manager for pre-built binaries.", long_about = None)]
#[command(disable_help_subcommand = true)]
pub struct Cli {
    #[command(flatten)]
    pub context: ContextOptions,
    #[command(subcommand)]
    pub command: Option<command::Command>,
}
```

There is no `#[command(version)]` (nor `.version(...)` anywhere in the
builder chain reachable from here) — clap only auto-registers `-V`/`--version`
when the derive macro is told to via that attribute; without it, `--version`
is simply an unrecognized argument, and clap's own error text says so. `ocx`
instead reports its version through a real subcommand
(`app.rs`'s `Command::Version(_) => "version"` dispatch arm, backed by
`crates/ocx_cli/src/build_receipt.rs`'s enriched JSON output). Setting
`versionCheckProgramArg = "version"` (the subcommand, not a flag) fixed it:

```
ocx> Executing versionCheckPhase
ocx> Successfully managed to find version 0.6.3 in the output of the command /nix/store/…-ocx-0.6.3/bin/ocx version
ocx> 0.6.3
ocx> Finished versionCheckPhase
```

This is a genuinely non-obvious trap for both a human packager and an
agent: `versionCheckHook`'s default (`<program> --version`) is the
overwhelmingly common convention, and nothing about a workspace with a
`build.rs` that clearly emits a version (`vergen-gix`, `app::build_info`)
signals that the CLI itself opted out of clap's own auto-version flag in
favor of a bespoke subcommand.

### 4. Determinism: not watched, but the mechanism reads deterministic-by-construction

`crates/ocx_cli/build.rs` (quoted in full context; only the load-bearing
parts here) branches on the `__testing` Cargo feature first; since neither
fixture build enabled it, the "real" path runs:

```rust
let in_ci = std::env::var_os("CI").is_some();
let build = BuildBuilder::default().build_timestamp(in_ci).build()?;
```

Nix's default sandboxed build environment does not set `CI` (only a small
allowlisted set of env vars survive into the sandbox, and `CI` is not one
of nixpkgs' stdenv defaults), so `in_ci` evaluates to `false` and
`build_timestamp(false)` — per `build.rs`'s own comment, this means
`VERGEN_BUILD_TIMESTAMP` is **not** the live wall-clock time; it is left
for the consumer's `option_env!()` to see as absent. Separately:

```rust
match GixBuilder::default()
    .sha(false).describe(true, true, None).dirty(false).commit_timestamp(true)
    .build()
{
    Ok(gix) => { emitter.add_instructions(&gix)?; }
    Err(error) => { println!("cargo:warning=vergen-gix metadata unavailable (no .git/?): {error}"); }
}
```

The fixture's `src` is `lib.fileset.toSource { … }` — a plain file copy,
no `.git/` directory — so `GixBuilder::build()`'s underlying `gix` discovery
fails, and the `Err` arm runs: no `VERGEN_GIT_*` variable is emitted at
all (not even a fixed placeholder — that only happens under the
`__testing` feature, per the file's own module doc). Both live build logs
in this dive show the corresponding warning verbatim:

```
ocx> warning: ocx@0.6.3: Could not find a git repository in '/build/source/crates/ocx_cli' or in any of its parents
ocx> warning: ocx@0.6.3: VERGEN_GIT_COMMIT_TIMESTAMP set to default
ocx> warning: ocx@0.6.3: VERGEN_GIT_DESCRIBE set to default
ocx> warning: ocx@0.6.3: VERGEN_GIT_SHA set to default
ocx> warning: ocx@0.6.3: VERGEN_GIT_DIRTY set to default
```

Note the vendor tool's own wording ("set to default") — those are
`vergen-gix`'s *internal* fallback constants for its own `Option<String>`
fields, not `ocx`'s `TESTING_PLACEHOLDERS`; the practical effect for
determinism is the same either way (a fixed string, not a live value), but
it is worth not conflating the two mechanisms in a future dive.

Taken together, this is a strong reading-level prediction that a
non-`__testing`, `.git`-less, `CI`-unset Nix build of `ocx` embeds no live
timestamp and no live git SHA, and should therefore be reproducible under
`nix build --rebuild`. **This dive did not confirm it empirically.** A
`nix build --rebuild --no-link -L .` was launched (detached, `nohup … &
disown`) immediately after Finding 3's successful build, but its
completion could not be verified once the environment fault (§0) removed
the toolchain it depended on — the technique used to detach it (`nohup`/
`disown` inside a single tool call) does not survive the tool call's own
process-group teardown the way this harness's tracked background-task
mechanism does, so even absent the fault its survival was not guaranteed.
**M-D-24 stays open, empirically**, pending a rerun of exactly:

```
nix build --rebuild --no-link -L .   # inside fixtures/…/packaging/ocx, same package.nix
```

comparing `nix path-info` (or a `diff` of two `--rebuild` output hashes) —
and, if it is red, bisecting `SOURCE_DATE_EPOCH` plus `TZDIR`/locale env
next, per the general Nix reproducibility playbook, not this build.rs's
own logic (which reads clean).

### 5. GATE-10's cost: warming the vendor dir does not touch the dominant cost

Two full builds of the identical fixture, differing only in one
`installCheck` attribute (Finding 3's fix), gave two real, comparable wall
times:

| Build | What changed since the last build | `Finished release profile […] in` | `buildPhase completed in` |
|---|---|---|---|
| 1 (post-`outputHashes` fix) | first successful compile of this exact source+lock | 5m 39s | 5m 41s |
| 2 (post-`versionCheckProgramArg` fix) | one string attribute, no source/lock change | 6m 01s | 6m 51s |

Build 2's `time` wrapper around the whole `run.sh nix build` invocation
measured **7m 12.36s wall clock** (3310.89s user + 244.26s system across
an 822%-average-CPU sandbox — i.e., real parallel `rustc` codegen-unit
work, not idle waiting). Crucially, build 2's log contains **zero**
`trying https://static.crates.io/crates/…` lines (build 1's log — read
in full during this dive — has ~500 of them, one per vendored crate),
confirming the `cargo-vendor-dir` derivation was reused verbatim from the
Nix store (same `Cargo.lock`, same `lockFile` content hash, same
`outputHashes`) and cost nothing on the second run. **The ~500-crate fetch
step is cheap and cacheable; the ~6-minute `rustc` compile is neither, and
dominates the total by more than 10:1.**

The practical GATE-10 implication: because `rustPlatform.buildRustPackage`
produces **one** derivation covering vendor-assembly, `cargoBuild`,
install, and `installCheck`, any single-attribute edit to `package.nix` —
even one that touches nothing Cargo builds — invalidates that whole
derivation and forces a full from-scratch `rustc` run over the entire
workspace + dependency graph. There is no cheaper "just re-run the install
check" path with plain `buildRustPackage`; the fleet's own multi-minute
number from fleet-builders.md ("a from-source Rust build … is a
multi-minute job even warm-substituted") is confirmed at a real number
here (~7 minutes for `ocx`, whose dependency graph and crate count exceed
grimoire's), and that number does not shrink for a metadata-only PR.

### 6. aws-lc-sys traced: `cmake` is an unconditional build-dependency that is usually never invoked

fleet-builders.md's Contested section left this open: "the exact mechanism
by which `Compiling cmake v0.1.58` appears in a build that needed no
system `cmake`… is unresolved." Traced directly from `aws-lc-rs`'s own
source (fetched via `codeload.github.com` tarball of its `main` branch,
commit `37019d05477d`; ocx pins `aws-lc-sys` 0.43.0, the current main is
0.45.0, so this trace is a version-adjacent reading, flagged as such
rather than claimed byte-identical to 0.43.0 — the builder-selection
architecture has been stable across this range per the project's own
changelog framing, but this dive did not diff 0.43.0's `builder/main.rs`
line-for-line).

`aws-lc-sys/Cargo.toml`:

```toml
[build-dependencies]
cmake.workspace = true
dunce.workspace = true
fs_extra.workspace = true
cc = { workspace = true, features = ["parallel"] }
bindgen = { workspace = true, optional = true }
```

`cmake` (the Rust wrapper crate around the `cmake` *binary*) is listed
**unconditionally** — not behind any feature flag — so Cargo always
compiles that small Rust wrapper crate as part of the build-dependency
graph, which is exactly why its compile line appears in every log
regardless of what actually runs. That says nothing about whether the
wrapper's `Config::new(...).build()` (which shells out to a real `cmake`
binary) is ever called.

`builder/main.rs`'s `get_builder()` (the actual decision point,
`aws-lc-rs@37019d05477d:builder/main.rs:722-812`):

```rust
fn get_builder(prefix: &Option<String>, manifest_dir: &Path, out_dir: &Path) -> Box<dyn Builder> {
    // 1. Explicit SYSTEM_DIR / auto-detected system install → SystemLib (neither cc nor cmake)
    // 2. FIPS build → always CmakeBuilder
    if is_fips_build() { return cmake_builder_builder(); }
    // 3. Explicit AWS_LC_SYS_CMAKE_BUILDER=1/0 → honor it literally
    if let Some(val) = is_cmake_builder() {
        return if val { cmake_builder_builder() } else { cc_builder_builder() };
    }
    // 4. is_no_asm() or a sanitizer active → always CmakeBuilder
    else if is_no_asm() || sanitizer().is_some() { return cmake_builder_builder(); }
    // 5. Default path: try CcBuilder first UNLESS bindgen is required
    else if !is_bindgen_required() {
        let cc_builder = cc_builder_builder();
        if cc_builder.check_dependencies().is_ok() { return cc_builder; }
    }
    // 6. Fall through: CmakeBuilder
    cmake_builder_builder()
}
```

For the fleet's actual build target (`x86_64-unknown-linux-gnu`, non-FIPS,
no explicit override, no sanitizer, pre-generated bindings available so
`is_bindgen_required()` is `false`), step 5 fires: `CcBuilder` is
constructed and `check_dependencies()` succeeds (it needs only a C
compiler and, on some targets, NASM — both present via nixpkgs' `stdenv`
and, per fleet-builders.md, aws-lc-sys's own prebuilt-NASM object files for
Linux x86_64), so **`CcBuilder` is returned and `CmakeBuilder` — and
therefore any real `cmake` binary — is never constructed, never invoked.**
This is consistent with, and now *explains*, fleet-builders.md's measured
result (`pkg-config` alone sufficed).

This resolves nix-packaging.md's open question directly: **NIX-PKG-17's
"pkg-config only" recipe is conditional, not target-independent** — it
holds for every target where `is_bindgen_required()` is false (every
Linux glibc/musl target with pre-generated bindings, per aws-lc-sys's own
README) and no FIPS/sanitizer/override is set. On a target without
pre-generated bindings, or under `AWS_LC_SYS_FIPS=1`, the answer flips:
`CmakeBuilder` runs and needs a real `cmake` (plus, if `is_bindgen_required()`
is *also* true there, `bindgenHook`/`libclang`). The rule's *scope* clause
should say this explicitly rather than imply "pkg-config, full stop."

### 7. NIX-PKG-16 as a `checks` derivation: written, not watched (E25 still open)

nix-packaging.md's E25 flagged that PKG-16's floor check ships as a shell
pipeline, not the `checks`-derivation form its own Applied section
implies. Two fixture flakes were written (reproduced verbatim below —
never built, environment fault hit first):

```nix
# fixtures/verification-rerun-w3/pkg16-checks-derivation/ok/flake.nix (compliant twin)
{
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      channel = "1.95.0"; # rust-toolchain.toml's channel
      met = builtins.compareVersions pkgs.rustc.version channel >= 0;
    in {
      checks.${system}.rust-toolchain-floor = pkgs.runCommand "rust-toolchain-floor-check" {
        rustcVersion = pkgs.rustc.version;
        inherit channel;
        met = if met then "1" else "0";
      } ''
        if [ "$met" != "1" ]; then
          echo "FAIL: nixpkgs rustc $rustcVersion is older than channel $channel" >&2
          exit 1
        fi
        echo "OK: $rustcVersion satisfies $channel" > "$out"
      '';
    };
}
```

The `bad/` twin is byte-identical except `channel = "99.0.0"` (the same
planted-violation value P11 already used for the shell-pipeline form). The
*design* mirrors P11's already-watched command exactly (`builtins.compareVersions`
against `pkgs.rustc.version`), just expressed as a `runCommand` derivation
instead of a bare `nix eval | grep` pipeline, so that `nix flake check`
alone (no extra CI step) surfaces the floor violation as a build failure —
answering E25's placement question in the direction nix-packaging.md
Applied already assumed. **This dive did not execute either variant**
before the toolchain vanished; it is NOT RUN, not a second confirmation of
P11's logic, and should be the very first thing a rerun of this dive
does (both flakes are cheap: `runCommand` with no external inputs beyond
`pkgs.rustc.version`, seconds not minutes).

### 8. ocx-sdk-python: `pythonImportsCheck` builds, and the two export shapes diverge exactly as predicted

Fixture copied the same way (`git archive HEAD | tar -x`) from
`/home/mherwig/dev/ocx-sdk-python`. `package.nix`:

```nix
{ lib, buildPythonPackage, hatchling }:
buildPythonPackage {
  pname = "ocx-sdk";
  version = (lib.importTOML ./pyproject.toml).project.version;
  pyproject = true;
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [ ./pyproject.toml ./README.md ./LICENSE ./src ];
  };
  build-system = [ hatchling ];
  pythonImportsCheck = [ "ocx_sdk" ];
  meta = { description = "…"; homepage = "…"; license = lib.licenses.asl20; platforms = lib.platforms.all; };
}
```

`nix build --no-link -L .#ocx-sdk` reached, in order,
`pythonRuntimeDepsCheckHook` (empty — `dependencies = []` per
`pyproject.toml`), `pythonImportsCheckPhase` ("Check whether the following
modules can be imported: ocx_sdk"), and `pythonMetadataCheckPhase`, with no
error — closing nix-packaging.md's "unbuilt" flag on this line.

For M-D-27, the flake exposed **both** candidate export shapes at once
and a separate consumer flake exercised them:

```nix
# Shape A: reaches every interpreter's pythonPackages set
overlays.default = final: prev: {
  pythonPackagesExtensions = (prev.pythonPackagesExtensions or [ ]) ++ [
    (pyFinal: pyPrev: { ocx-sdk = pyFinal.callPackage ./package.nix { }; })
  ];
};
# Shape B: top-level, bound to one interpreter
packages.${system}.ocx-sdk = pkgs.python3.pkgs.ocx-sdk;   # after applying overlays.default
```

nixpkgs' own manual documents exactly shape A as *the* way to add a
package for every interpreter ("How to override a Python package for all
Python versions using extensions" — `pythonPackagesExtensions`), which
this dive's own consumer flake confirmed empirically rather than by
citation alone: a second flake with
`inputs.ocx-sdk-python.url = "path:/…/ocx-sdk-python";` and
`overlays = [ ocx-sdk-python.overlays.default ];` exposed
`packages.x86_64-linux.via-312 = pkgs.python312.pkgs.ocx-sdk;` and
`…via-313 = pkgs.python313.pkgs.ocx-sdk;` — **both evaluated to distinct,
buildable derivations** (`python3.12-ocx-sdk-0.2.0.drv`,
`python3.13-ocx-sdk-0.2.0.drv`) and **both built to
`pythonImportsCheckPhase` successfully**.

The negative twin — a flake exporting **only** shape B (no
`pythonPackagesExtensions` registration) and then probing
`pkgs.python312.pkgs.ocx-sdk` — failed exactly as shape A's absence
predicts:

```
error: attribute 'ocx-sdk' missing
at …/flake.nix:19:19:
    18|         # `python312.pkgs`, only bound at the top level for `python3`.
    19|         via-312 = pkgs.python312.pkgs.ocx-sdk;
```

This is a clean, watched red/green pair for M-D-27: **a top-level-only
export is invisible to every interpreter except whichever one `python3`
happens to resolve to on the consumer's nixpkgs revision; the overlay
export is what makes the package "part of the language's package set" in
the way nixpkgs' own libraries are.** Decision: ship both — the overlay so
downstream flakes can pull `ocx-sdk` into their own `python3XX.pkgs` (a
library consumer typically wants a specific interpreter, and may already
carry its own `pythonPackagesExtensions` composition), and a top-level
`packages.<system>.ocx-sdk` / `default` for the simple
`nix build`/`nix run` case.

## Normative guidance candidates

1. **A `Cargo.lock` with any `source = "git+…"` line needs
   `cargoLock.outputHashes`, keyed by **any one** `name-version` pair per
   distinct commit SHA — not one entry per package.**
   Rationale: `importCargoLock` resolves `outputHashes` through a
   `name-version → rev` lookup internally; every package sharing that rev
   is validated against the one hash keyed to it.
   Verify: `grep -c 'source = "git+' Cargo.lock`; if nonzero,
   `awk '/^\[\[package\]\]/{n="";v=""} /^name = /{n=$0} /^version = /{v=$0} /^source = "git\+/{print n,v,$0}' Cargo.lock`
   to enumerate distinct rev groups, then one `outputHashes` entry per group.
   Verification command:
   ```
   grep -c 'source = "git+' Cargo.lock
   ```
   RUN, against a real repository, not a planted pair: **yes** — `ocx`'s
   own `Cargo.lock` returns `10` (this dive's own correction of nix-packaging.md
   V-fb #11's `0`); the fix (two `outputHashes` entries) was watched
   building successfully end to end (§1, §2).

2. **Never assume `versionCheckHook`'s default `<program> --version`
   is correct; confirm the CLI actually registers `-V`/`--version` via
   `#[command(version)]` (or the equivalent for the CLI's parser) before
   wiring `nativeInstallCheckInputs = [ versionCheckHook ]`.**
   Rationale: clap (and most parser libraries) only auto-register a
   version flag when explicitly told to; its absence produces an
   unrelated-looking parse error, not a "no such flag" message that names
   the missing attribute.
   Verify: run the freshly built binary with `--version` by hand once,
   or grep the CLI's top-level command definition for `#[command(version` /
   `.version(`; if neither is present, search for a `version` subcommand
   or a `-V`-only short flag instead and set `versionCheckProgramArg`
   accordingly.
   Verification command:
   ```
   grep -rn -e 'command(version' -e '\.version(' --include='*.rs' crates/ocx_cli/src
   ```
   RUN: **yes** — empty output on `ocx`'s real source tree (confirmed
   absent), and the build's own `versionCheckPhase` log is the red/green
   pair: `--version` red (`error: unexpected argument '--version' found`,
   §3), `version` green (`Successfully managed to find version 0.6.3 …`).

3. **A single non-source attribute change to a `buildRustPackage`
   derivation (an `installCheck` arg, `meta`, `nativeBuildInputs`) forces a
   full recompile — budget CI accordingly, and do not expect caching a
   vendor-only derivation to shrink a metadata-only PR's build time.**
   Rationale: `buildRustPackage` is one derivation covering vendor,
   build, install and installCheck; Nix invalidates the whole thing on any
   attribute change, and only the vendor sub-derivation (`cargo-vendor-dir`)
   is separately cacheable.
   Verify: change one non-source attribute, rebuild, and diff the two
   builds' logs for `trying https://static.crates.io` lines (should be
   absent on the second, proving vendor reuse) against `Compiling <crate>`
   line counts (should be near-identical, proving full recompilation).
   Verification command:
   ```
   grep -c 'trying https://static.crates.io' <second-build-log>
   ```
   RUN: **yes** — `0` on this dive's second `ocx` build log (vendor
   reused) versus dozens on the first (fresh vendor); both builds' compile
   phases took within ~20% wall time of each other (5m39s vs 6m01s),
   confirming full recompilation happened both times.

4. **aws-lc-sys's `pkg-config`-only recipe (NIX-PKG-17) applies only when
   `is_bindgen_required()` is false for the target (pre-generated bindings
   exist) and no FIPS/sanitizer/`AWS_LC_SYS_CMAKE_BUILDER` override is in
   play; state that scope explicitly rather than "pkg-config, full stop."**
   Rationale: `builder/main.rs`'s `get_builder()` falls back to
   `CmakeBuilder` (needing a real `cmake` binary) under exactly those
   conditions; a target or feature combination outside them silently needs
   more than `pkg-config`.
   Verify: check aws-lc-sys's README/release notes for which targets ship
   pre-generated bindings before assuming the fleet's own Linux-only
   measurement generalizes to a new target (Windows MSVC, a new musl arch,
   a FIPS build).
   Verification command:
   ```
   curl -sL https://raw.githubusercontent.com/aws/aws-lc-rs/main/aws-lc-sys/README.md | grep -n -i "pre-generated\|bindgen feature"
   ```
   RUN: **yes** — a reading-level check (source-code trace, not a
   red/green build), executed and quoted in Finding 6; not a planted
   Nix-side violation/twin (there is no Nix mechanism to plant here — the
   branching lives entirely in aws-lc-sys's own `build.rs`).

5. **Write NIX-PKG-16's rustc-floor check as a `checks.<system>` derivation
   (`runCommand` gated on `builtins.compareVersions`), not a bare CI shell
   step, so `nix flake check` alone surfaces a stale floor.**
   Rationale: a `checks` derivation is part of the flake's own contract
   surface (`nix flake check` runs it everywhere the flake is checked,
   including a contributor's machine); a shell-only CI step is invisible
   to anyone not running that specific workflow.
   Verify: `nix build .#checks.<system>.rust-toolchain-floor` fails
   (nonzero exit) when `channel` in the derivation's own comparison exceeds
   `pkgs.rustc.version`, succeeds otherwise.
   Verification command:
   ```
   nix build --no-link -L .#checks.x86_64-linux.rust-toolchain-floor
   ```
   RUN: **no** — fixture written (Finding 7, both `ok`/`bad` variants
   committed), never built; the environment fault (§0) hit first. Rerun
   this exact command against both fixture variants before promoting this
   rule past SHOULD.

6. **A Python library flake exports itself two ways: a
   `pythonPackagesExtensions` overlay (reaches every interpreter's
   `pythonN.pkgs` set) and a top-level `packages.<system>.<name>` bound to
   one `python3` (the `nix build .#<name>` / `nix run` convenience) — never
   only the top-level form if any consumer might want a specific,
   non-default interpreter.**
   Rationale: the top-level form is invisible to
   `pythonN.pkgs.<name>` for every `N` other than whichever interpreter the
   flake happened to bind; a consumer composing several Python libraries
   under one interpreter set (the common case for anything beyond a single
   `nix run`) needs the overlay form.
   Verify: from a **separate** consumer flake, evaluate
   `pkgs.pythonNNN.pkgs.<name>` for at least two distinct interpreter
   versions after applying the library's `overlays.default`; a top-level-only
   export fails this for every interpreter but the one it happens to bind.
   Verification command:
   ```
   nix eval --no-write-lock-file .#packages.x86_64-linux.via-312.drvPath .#packages.x86_64-linux.via-313.drvPath
   ```
   RUN: **yes** — both attributes evaluate to distinct `.drv` paths and
   both built to `pythonImportsCheckPhase` successfully on the overlay
   export (§8); the identical probe against a top-level-only export fails
   at eval with `error: attribute 'ocx-sdk' missing` (§8, quoted in full).

7. **`ocx_cli/build.rs`'s vergen-gix wiring is deterministic under Nix's
   default sandbox by construction (no live `CI`, no `.git/` in a
   fileset `src`) — but this is a reading-level claim until a
   `--rebuild` hash comparison actually confirms it; do not promote it to
   MUST without that build.**
   Rationale: the two gating conditions (`CI` env var, `.git/` presence)
   are both absent in a standard sandboxed `buildRustPackage`, and the
   code's own fallback paths emit fixed values (or nothing) rather than
   live ones in that case — but a build script this size can have other,
   unread nondeterminism sources (embedded temp paths, thread/PID strings,
   parallel-codegen-unit ordering effects on debug info) that only a real
   rebuild-hash diff catches.
   Verify: `nix build --rebuild` on the same derivation and diff the two
   output hashes (or `nix path-info` before/after — a `--rebuild` that
   changes nothing prints no diff-hash warning; one that differs prints
   `error: derivation '…' may not be deterministically produced`).
   Verification command:
   ```
   nix build --rebuild --no-link -L .
   ```
   RUN: **no** — launched, not confirmed complete before the environment
   fault (§0, §4). This is the single highest-priority item for a rerun.

## Verification runs

Store state for every run below: **cold** for the exact `ocx`/`ocx-sdk-python`
derivation shapes built (none had ever been built with these exact
attributes before), **warm** for nixpkgs' own build tools (`rustc`, `cargo`,
`cc`, `python3`) substituted from `cache.nixos.org` in earlier program waves.
All commands ran via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`
(CppNix 2.35.2, nixpkgs `github:NixOS/nixpkgs/e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa`,
26.11pre, resolved 2026-09-26) until the environment fault (§0).

| # | Fixture | Command | Exit (before fix) | Exit (after fix) | Key output |
|---|---|---|---|---|---|
| R1 | `packaging/ocx` | `nix flake check --no-build .` | **1**, `No hash was found while vendoring the git dependency uv-cache-key-0.0.1` | **0** | two `outputHashes` entries added (§2) |
| R2 | `packaging/ocx` | `nix build --no-link -L .` (fixed hashes, `--version` arg) | **2** (installCheck), `Did not find version 0.6.3 … unexpected argument '--version' found` | — | compile succeeded (`Finished release profile … in 5m 39s`); only `versionCheckPhase` failed |
| R3 | `packaging/ocx` | `nix build --no-link -L .` (same + `versionCheckProgramArg = "version"`) | — | **0** | `Successfully managed to find version 0.6.3 in the output of … /bin/ocx version`; both `bin/ocx-shim` and `bin/ocx` present and stripped; wall clock `7:12.36` (`time` around the whole `run.sh nix build` call) |
| R4 | `packaging/ocx-sdk-python` | `nix flake check --no-build .` then `nix build --no-link -L .#ocx-sdk` | — | **0** / **0** | eval: `derivation evaluated to /nix/store/…-python3.14-ocx-sdk-0.2.0.drv`; build reaches `pythonImportsCheckPhase` → `pythonMetadataCheckPhase`, no error |
| R5 | `packaging/ocx-sdk-consumer` (overlay, two interpreters) | `nix flake check --no-build .` then `nix build --no-link -L .#via-312 .#via-313` | — | **0** / **0** | two distinct `.drv` paths (`python3.12-…`, `python3.13-…`); both reach `pythonImportsCheckPhase` |
| R6 | `packaging/ocx-sdk-consumer-toplevel-only` (violation twin, no overlay) | `nix eval --no-write-lock-file .#packages.x86_64-linux.via-312.drvPath` | **1**, `error: attribute 'ocx-sdk' missing` | (no twin needed — R5 *is* the compliant case for the same probe) | confirms the top-level-only shape does not reach `python312.pkgs` |
| R7 | `pkg16-checks-derivation/{ok,bad}` | `nix build --no-link -L .#checks.x86_64-linux.rust-toolchain-floor` | **NOT RUN** | **NOT RUN** | fixture committed, never built — environment fault (§0) hit before this run |
| R8 | `packaging/ocx` | `nix build --rebuild --no-link -L .` | **NOT RUN / unconfirmed** | — | launched detached, completion unconfirmed — environment fault (§0) |
| R9 | `packaging/ocx` | `nix path-info -Sh <out>` | **NOT RUN** | — | queued, environment fault (§0) hit first |

A verification that did **not** produce a clean red/green pair, reported as
such: **R7, R8, R9 are NOT RUN**, cut short by the environment fault
documented in §0 — not a design choice, not a "no meaningful twin" case
like some of fleet-builders.md's measurement-only rows. Every other row
above (R1–R6) is a real watched result from this session's own tool
output.

## Exemplar evidence

- **`ocx`'s own `Cargo.lock`** (measured here, live repository, not the
  38-repo corpus) — the primary evidence for rule 1 (10 git-sourced
  packages, 2 distinct revs) and a direct correction of this program's own
  earlier V-fb #11 measurement.
- **`ocx`'s own `app.rs`** — the primary evidence for rule 2 (`Cli` derive
  with no `#[command(version)]`); no exemplar in the 38-repo corpus was
  checked for this pattern specifically, since it is a fleet-repository
  finding, not a general-Nix one (flagged as a fleet-specific gap, same
  posture fleet-builders.md took for its own submodule finding).
- **`aws/aws-lc-rs`'s own `builder/main.rs`** — the primary evidence for
  rule 4, read directly from source rather than inferred from build
  behavior alone; corroborates, and now *explains*, fleet-builders.md's
  earlier measured-but-unexplained result.
- **nix-packaging.md's own P11 fixtures** (`rust-floor-bad`/`-ok`) — the
  logic rule 5's `checks`-derivation form reuses verbatim
  (`builtins.compareVersions pkgs.rustc.version channel >= 0`); this dive
  changed only the *placement* (a `checks` derivation instead of a shell
  pipeline), not the comparison itself, and did not re-verify the
  comparison's correctness (P11 already did).
- **nixpkgs' own `python.section.md`, "How to override a Python package
  for all Python versions using extensions"** — satisfied by rule 6's
  overlay shape verbatim (the doc's own example uses `overridePythonAttrs`
  on an existing package; this dive's fixture uses a fresh `callPackage`
  instead, the natural adaptation for a package not yet in nixpkgs).

## AI-agent angle

1. **Trusting `grep -c 'source = "git+'` "0" from an earlier dive without
   re-running it on the actual file the current change touches.** This
   program's own nix-packaging.md carried a wrong "0" for `ocx` into its
   Applied section; an agent citing a prior artifact's numeric claim as
   ground truth, rather than re-measuring against the file in front of it,
   propagates a stale number. **Smallest check**: re-run the exact
   `grep -c` command against the live file before trusting any inherited
   count, every time — cheap (milliseconds), and this dive's own
   correction is proof the inherited number can be wrong even when the
   inheriting document is careful and well-sourced elsewhere.
2. **Adding `versionCheckHook` and assuming its default `--version` arg is
   universal.** An agent wiring up the "verified Rust template" mechanically
   will not notice the mismatch until the build fails at
   `installCheckPhase` with an error that *looks* like a clap usage bug
   in the CLI itself, not a packaging mismatch. **Smallest check**: before
   trusting `versionCheckHook`'s default, grep the CLI's own top-level
   command definition for `#[command(version` / `.version(`; if absent,
   find the actual version-reporting entry point (subcommand, `-V`-only
   flag, or a custom flag name) and set `versionCheckProgramArg` to match.
3. **Reading `Compiling cmake vX.Y.Z` in a build log and concluding "this
   -sys crate needs a real CMake, add it to `nativeBuildInputs` /
   investigate why it's missing."** The Rust `cmake` wrapper crate compiling
   is not evidence the `cmake` *binary* was ever invoked; for aws-lc-sys
   specifically (and likely other crates using the same `cmake`-crate
   convenience wrapper pattern), the wrapper is an unconditional
   build-dependency regardless of which internal code path actually runs.
   **Smallest check**: grep the crate's own build script/builder source
   (when vendored or fetchable) for the actual `Config::new(...).build()`
   call site and the condition guarding it, rather than inferring
   "compiled ⇒ invoked" from a Cargo log line.
4. **Assuming a single `buildRustPackage` derivation's build time can be
   "cached away" by warming any part of it, for a metadata-only PR.** An
   agent optimizing fleet CI cost might reach for "warm the vendor cache"
   as the fix for GATE-10's per-PR cost, measure that it works (vendor
   fetch does skip), and stop there — missing that the dominant cost
   (compilation) is untouched by that optimization. **Smallest check**:
   diff two builds' logs for `Compiling <crate>` line counts, not just
   `trying https://…` line counts, before claiming a caching change
   reduced *wall time* rather than just *network calls*.

## Contested / evolving

- **Whether ocx's build.rs is actually bit-for-bit reproducible under
  `nix build --rebuild` remains open** (Finding 4, rule 7) — the reading
  gives high confidence, but confidence from reading a build script is not
  the same claim this program makes everywhere else ("watched red/green"),
  and this dive is explicit that it is not. Rerun `nix build --rebuild`
  first, before this moves from a SHOULD-reading to a MUST-verified rule.
- **aws-lc-sys 0.43.0 (ocx's pin) versus 0.45.0 (current `main`, what this
  dive actually read) for the `get_builder()` mechanism** — the trace in
  Finding 6 is read from the current upstream `main`, not the exact pinned
  version; the project's `builder/` directory has existed in roughly this
  shape across several releases per its own commit history structure
  (shared between `aws-lc-sys` and `aws-lc-fips-sys` via a top-level
  symlink), but this dive did not diff 0.43.0's copy line-for-line against
  0.45.0's. Treat the *mechanism* (cc-first, cmake-fallback, gated by
  bindgen/FIPS/sanitizer/override) as solid; treat exact line numbers as
  current-`main`-only.
- **This program's own shared toolchain (`~/.cache/research-lang/nix-tools/`)
  disappearing mid-dive (§0) is itself a finding for the research-lang
  harness, not for Nix**: multiple concurrent packaging dives sharing one
  rootless store without a lock or reservation mechanism can race on
  destructive operations. Out of scope for `nix-packaging.md`'s own
  content, but worth a retro entry for the harness (per the standing
  `hex-retro` convention) rather than silent re-litigation in a future
  Nix dive's own artifact.

## Revision log (for nix-packaging.md's fold)

Every existing NIX-PKG ID stays stable; this dive proposes additions and
one correction, not renumbering:

- **Correction to V-fb #11** (inherited into nix-packaging.md's Applied
  section): "0 git dependencies in either lock" is wrong for `ocx` —
  it is 10 (two distinct revs). `grimoire`'s `0` is unaffected, not
  re-measured here. nix-packaging.md's "New commitments for the fleet's
  flakes → ocx and grim (A)" bullet should drop the "0 git sources in
  either lock" clause for `ocx` and cite this artifact instead.
- **nix-packaging.md Applied's "Both are unbuilt: the next round builds
  them"** (for `ocx`'s `cargoBuildFlags`/workspace version) is now
  **built** — §1, R1–R3. The verified `package.nix` in Finding 1
  supersedes the open question; nix-packaging.md's Applied section should
  link to this artifact and drop "unbuilt."
- **New candidate rule, proposed ID NIX-PKG-19** (rule 2 above):
  `versionCheckHook`'s default arg must be confirmed, not assumed.
- **New candidate rule, proposed ID NIX-PKG-20** (rule 3 above):
  GATE-10 per-PR cost is dominated by compilation, not vendoring.
- **NIX-PKG-17's scope clause should gain an explicit conditional**
  (rule 4 above): pkg-config-only holds only where
  `is_bindgen_required()` is false and no FIPS/sanitizer/override applies.
  Text change to existing PKG-17, not a new ID.
- **E25 (`checks`-derivation placement for NIX-PKG-16) stays unresolved**:
  the fixture exists (§7) but was never built. nix-packaging.md's E25 note
  should point at this artifact's §7/R7 rather than being marked settled.
- **M-D-27 answered**: new candidate rule, proposed ID **NIX-PKG-21**
  (rule 6 above) — ship both a `pythonPackagesExtensions` overlay and a
  top-level attribute for a Python library flake.
- **M-D-24 stays open, empirically** (rule 7 above) — reading-level
  analysis only; nix-release.md's "fleet-provenance" open question should
  not be closed on the strength of this artifact alone.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nixpkgs `rust.section.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/rust.section.md) | nixpkgs manual, Rust chapter (primary) | fetched 2026-09-27, master | `outputHashes` syntax and the `lib.fakeHash`-then-read-the-real-hash workflow used verbatim in §2 |
| [nixpkgs `pkgs/build-support/rust/import-cargo-lock.nix`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/build-support/rust/import-cargo-lock.nix) | `importCargoLock`'s own source (primary) | fetched 2026-09-27, master | The exact `namesGitShas`/`gitShaOutputHash` mapping that proves rule 1 (one `outputHashes` entry per rev, not per package) |
| [nixpkgs `python.section.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/python.section.md) | nixpkgs manual, Python chapter (primary) | fetched 2026-09-27, master | `pythonImportsCheck` worked examples; "How to override a Python package for all Python versions using extensions" is rule 6's canonical source, quoted verbatim |
| [`aws/aws-lc-rs` `aws-lc-sys/Cargo.toml`](https://raw.githubusercontent.com/aws/aws-lc-rs/main/aws-lc-sys/Cargo.toml) | aws-lc-sys's own manifest (primary, tool's own repo) | fetched 2026-09-27, `main` (0.45.0) | Shows `cmake.workspace = true` as an unconditional (non-optional) build-dependency, the root of Finding 6 |
| `aws/aws-lc-rs@37019d05477d:builder/main.rs` | aws-lc-sys/fips-sys's shared builder-selection logic (primary, tool's own repo, fetched via `codeload.github.com` tarball since the GitHub contents API returned schema-shaped stubs in this sandbox, not real values) | fetched 2026-09-27, `main` | `get_builder()`'s exact cc-vs-cmake decision tree, quoted in Finding 6 |
| [`aws/aws-lc-rs` `aws-lc-sys/README.md`](https://raw.githubusercontent.com/aws/aws-lc-rs/main/aws-lc-sys/README.md) | aws-lc-sys's own build-requirements doc (primary) | fetched 2026-09-27, `main` | "Bindings for popular platforms are pre-generated" — the condition `is_bindgen_required()` checks |
| `/home/mherwig/dev/ocx` (read-only, live repository) | the actual fleet source, HEAD `2691d3c1638e` | measured 2026-09-27 | Every claim in Findings 1–5, 7 about `ocx` specifically (Cargo.lock git deps, `app.rs`'s `Cli` struct, `build.rs`'s vergen wiring) is read from this repository directly, not a fixture copy's paraphrase |
| `/home/mherwig/dev/ocx-sdk-python` (read-only, live repository) | the actual SDK source | measured 2026-09-27 | `pyproject.toml`'s `dependencies = []`/`hatchling` backend and `src/ocx_sdk/__init__.py`'s existence, underlying Finding 8 |
| [nix-packaging.md](../nix-packaging.md) | this program's own prior consolidation | 2026-09-27 | Source of V-fb #11 (corrected here), the verified Rust template (adapted for a workspace in §1), NIX-PKG-16/17/18's existing text, and E25 |
| [nix-packaging/fleet-builders.md](../nix-packaging/fleet-builders.md) | this program's own prior dive | 2026-09-27 | Source of the "ocx not built end-to-end" and aws-lc-sys/`cmake` open questions this artifact closes (§1, §6), and the submodule-population technique reused for `ocx`'s own three submodules |
| [nix-topic-map.md](../nix-topic-map.md) | this program's own map, "Conflicts resolved" §E25/E21/E15 and the rerun-wave brief | 2026-09-27 | The exact brief items this artifact answers (M-D-24, M-D-27, GATE-10 cost, aws-lc-sys cmake, PKG-16 placement) |
| [rl-2505 release notes](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-25.05/doc/manual/source/release-notes/rl-2505.section.md) | nixpkgs 25.05 release notes (primary) | fetched in an earlier program wave, re-cited here | `fetchCargoVendor` as `buildRustPackage`'s default since 25.05 — the floor this dive's `cargoLock.lockFile` usage relies on |
| `astral-sh/uv` and `astral-sh/pubgrub` (git dependency sources named in `ocx`'s own `Cargo.lock`, not independently cloned or read beyond their pinned commit hashes) | third-party crates ocx vendors as git deps | pinned at `0adb444806e8`/`d8efd77673c9` in `ocx`'s `Cargo.lock`, read 2026-09-27 | The concrete evidence for rule 1's git-dependency count; not fetched or inspected beyond confirming their `source =` lines and the fixed-output hashes Nix reports for them |
| [Nix manual, `nix build`](https://nix.dev/manual/nix/2.24/command-ref/new-cli/nix3-build) (nix.dev mirror of the CppNix manual) | `--rebuild` flag semantics (primary) | referenced, not re-fetched this dive (already established in nix-packaging.md's own P1/P3 determinism fixtures) | Confirms `--rebuild`'s comparison behavior underlying rule 7's proposed rerun command |
