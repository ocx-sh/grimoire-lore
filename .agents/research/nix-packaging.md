---
title: "Derivations and the fleet's builders — consolidated ruleset (NIX-PKG)"
topic: nix-packaging
model: opus
id_family: NIX-PKG
consolidates:
  - nix-packaging/derivation-conventions.md
  - nix-packaging/fleet-builders.md
  - nix-packaging/verification-rerun-w3.md (wave-3 rerun: ocx end to end, aws-lc-sys builder selection, PKG-16 as a check, Python library export)
  - nix-audit/exemplar-flake-shape.md (§4, §12)
  - nix-audit/exemplar-tool-runs.md (Axis 3, smell 3)
  - nix-audit/ocx-index-and-fleet.md (§4)
  - nix-topic-map.md (section D rows M-D-01..19, M-D-23, M-D-25, M-D-26; M-C-01, M-G-16; conflicts 8, 13, 14, 20)
date: 2026-09-27
revised: 2026-09-27
era: "CppNix 2.35.2 (run.sh), nixpkgs 26.11pre rev 8d5d2709 for every run added here (the dives and the w3 rerun used e158d9ed of 2026-09-26, same era); Lix 2.95.2 from the same nixpkgs rev; nixfmt 1.5.0 / nixfmt-tree 2.6.0, deadnix 1.3.2, nurl 0.4.1"
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-packaging/ (this consolidation), fixtures/derivation-conventions/, fixtures/fleet-builders/, fixtures/verification-rerun-w3/ (lost to the rerun's environment fault, §0 there). At revision time run.sh, the toolchain profile, every fixture directory and the exemplar corpus were absent, so nothing recorded here could be re-run during the revision (P15).
---

# Derivations and the fleet's builders (NIX-PKG)

## Verdict

1. **A warm store is not evidence.** A fixed-output derivation's path depends only on its name and hash, so a changed `rev`, a broken `tag` or a new URL "builds" while the old path is in the store. Every fetcher edit resets the hash, and the check is `nix build --rebuild .#<pkg>.src`. This consolidation caught two dive results that were green only because of store reuse (conflicts 1 and 2). NIX-GEN-08 states the same rule for the D transport; here it binds every shape.
2. **A (the fleet CLIs) builds from source with a `package.nix` at the repository root.** The file is a plain `callPackage` function with `src = lib.fileset.toSource` over an explicit list and `version` read from the manifest (NIX-REL). Rust uses `rustPlatform.buildRustPackage` with `cargoLock.lockFile = ./Cargo.lock`. A nixpkgs submission changes exactly `src`, `version` and `cargoLock` → `cargoHash`, so "upstream as a copy" (map conflict 13) means a copy plus a three-attribute swap.
3. **Nothing is read through `${src}`, including a `lib.fileset.toSource` result.** derivation-conventions' exemption for filesets was overturned by a run that went red cold and red locally (conflict 3). NIX-FLK-07 covers every source store path.
4. **The toolchain is the pinned nixpkgs `rustPlatform`, guarded by a floor check against `rust-toolchain.toml`.** It is never rust-overlay inside `package.nix`. fleet-builders' "pin via rust-overlay" is rejected (conflict 5).
5. **grimoire's submodule path dependencies are solved by `inputs.self.submodules = true` (NIX-INP-09).** They are not solved by consumer `?submodules=1` or by restructuring into flake inputs (conflict 6). Measured: Lix 2.95.2 rejects the attribute unless `flake-self-attrs` is enabled, so the advisory Lix leg (NIX-GATE-16) passes that feature flag.
6. **Every A package is proven at build time**: `strictDeps`, `runHook` discipline, `--replace-fail`, and `versionCheckHook`, which by default runs `meta.mainProgram --version`, then `--help`, inside the sandbox. That default is not universal: ocx has no `--version` flag and needs `versionCheckProgramArg = "version"` (PKG-19). `nix flake check` catches none of these (it caught none of them here either).
7. **`meta` minimum for every shape**: `description` (nixpkgs grammar), `license` (never a raw SPDX expression), and `platforms`. `mainProgram` is NIX-FLK-15 for A and NIX-GEN-13 for D, and `sourceProvenance` is NIX-GEN-12 for D. The combined jq in derivation-conventions was vacuous and is replaced (conflict 8).
8. **ocx-sdk-python is `buildPythonPackage { pyproject = true; build-system = [ hatchling ]; pythonImportsCheck = [ "ocx_sdk" ]; }`**, built (w3 R4). As a *library* it exports through a `pythonPackagesExtensions` overlay plus a top-level package (PKG-21): a top-level-only export is invisible to every `pythonNNN.pkgs` set (watched red, w3 R6). uv2nix only comes in with compiled runtime dependencies. setup-ocx gets no package (M-D-21 stays deferred).
9. **Source build first, `-bin` second** (M-G-16, map conflict 13, confirmed twice): both grimoire and now ocx built with `pkg-config` alone, so a source build is viable. The generated flake's prebuilt package is an extra channel.
10. **ocx builds end to end** (w3 R1-R3): a workspace `package.nix` with `version` from `.workspace.package.version`, `cargoBuildFlags = [ "-p" "ocx" "-p" "ocx_shim" ]` (both binaries installed, no `installPhase` override), `cargoLock.outputHashes` for its **10** git-sourced crates from **2** revs (PKG-22; the earlier "0 git sources" was wrong, conflict 12), and `inputs.self.submodules = true` for its **three** `[patch.crates-io]` submodules, like grimoire (NIX-INP-09).
11. **GATE-10's per-PR cost for ocx is measured: 7m12s wall** (x86_64-linux, 822% average CPU, one sample), dominated by `rustc`. The vendor derivation is reused across builds and saves only the ~500 crate fetches; any edit to `package.nix`, even `meta` or an `installCheck` argument, recompiles everything (PKG-20). GATE-10 stands; the cost is now a number, not "several minutes".
12. **Documented gaps** (the rerun established a limit, not an answer):
    - **PKG-17 is target-conditional.** aws-lc-sys picks its `cc` builder only when the target has pre-generated bindings and no FIPS, sanitizer, `no_asm` or `AWS_LC_SYS_CMAKE_BUILDER` override is set. Otherwise it runs CMake and possibly bindgen. The trace is read from aws-lc-rs `main` (aws-lc-sys 0.45.0); ocx pins 0.43.0. Nothing off x86_64-linux was built.
    - **`--rebuild` determinism of ocx (M-D-24) is a reading-level prediction only.** `build.rs` emits no live timestamp (`CI` unset) and no git metadata (no `.git` in a fileset `src`), but the `--rebuild` run (w3 R8) never completed.
    - **PKG-16's `checks`-derivation form is written but unwatched** (w3 R7 not run; the revision's re-run was blocked, P15). The floor check ships as a CI step (map E25).

### Conflicts resolved

1. **The short-rev result and its baseline (derivation-conventions).** The dive recorded that a short `rev` "did not go red" against a "full 40-hex" baseline. Its baseline `7fd1a60b…edf11` is itself 39 hex (the real SHA ends in `d`, per `git ls-remote`), and every fixture shared one hash, so the plain builds were store hits. Under `--rebuild`, a 7-hex rev still resolves on GitHub (P3). **Resolved:** the rule stays, because of fork ambiguity (`pkgs/README.md`), and it is enforced by a grep that went red and green (P4), not by a build.
2. **The dive's "fully gated" skeleton is broken.** `tag = "<39-hex>"`, copied from nurl, fetches `archive/refs/tags/<hex>.tar.gz`, which returns 404. Its static gates (nixfmt, deadnix, statix, `flake check --no-build`) cannot see this, and its build-dependent ones (`nix run`, the `passthru.tests` build) passed only because the output path was already in the store (P2). **Resolved:** the skeleton is superseded by the verified Rust template below, and PKG-04 makes `--rebuild` the fetcher check for every shape.
3. **Is a read through a `lib.fileset.toSource` path cold-safe?** derivation-conventions §4 said yes, from one local run; NIX-FLK-07 said no read through any source store path. Re-run with a fresh tarball and with a local checkout, `cargoLock.lockFile = "${finalAttrs.src}/Cargo.lock"` over a fileset is red both ways (P10). The dive's "cold" fileset content was most likely content-identical to a path already in the store. **Resolved:** FLK-07 stands without exemption, and yazi is a violator.
4. **`src = ./.` (fleet-builders) versus `lib.fileset.toSource` (derivation-conventions).** **Resolved for fileset**: `./.` rebuilds on every unrelated commit (V-dc §1), and the fileset form was built and cold-checked with `buildRustPackage` (P9, P10).
5. **Toolchain.** fleet-builders: "pin via `rust-bin.fromRustupToolchainFile`". Against it: the dive's own measurement (stock rustc 1.98.1 builds grimoire), a `package.nix` that can no longer go to nixpkgs (owner Q3), and an extra consumer lock input (NIX-INP). **Resolved:** stock `rustPlatform` plus a floor check that went red and green (PKG-16).
6. **Submodules.** fleet-builders offered "convert to flake inputs" or "`?submodules=1` everywhere"; NIX-INP-09 says `inputs.self.submodules = true`. **Resolved for INP-09**, because the consumer types nothing. New measurements: Lix 2.95.2 needs `flake-self-attrs`, and a local CppNix build fails with `not tracked by Git` rather than an empty directory (P12).
7. **`finalAttrs` everywhere (derivation-conventions PKG-02, map conflict 20) versus deadnix (NIX-GATE-05).** An unused `finalAttrs` fails the deadnix gate (P9). **Resolved:** use `finalAttrs` for self-reference and a plain attrset otherwise (PKG-14).
8. **The Q7 replacement.** derivation-conventions' combined jq ends in `(.hasProvenance or .hasMainProgram or true)`, which is constant-true, so it never gates `mainProgram`, and its watched-red evidence came from a different, single-package jq. **Resolved:** PKG-07's set-wide check (red on three twins, P8) owns description, license and platforms; FLK-15 and GEN-13 own `mainProgram`; GEN-12 owns provenance.
9. **`cargoHash` versus `cargoLock`, and "upstream is a copy".** The nixpkgs manual's default example uses `cargoHash`; fleet-builders uses `cargoLock`. **Resolved:** `cargoLock` in-repo (`rust.section.md:120-126`: `cargoHash` is "tedious … within a project") and `cargoHash` or `cargoLock` in nixpkgs (both permitted, `:71`). Map conflict 13's "copy" is refined to "copy plus three attributes".
10. **Build cadence.** fleet-builders: a real build is "too slow to gate every PR". NIX-GATE-10: MUST build every package in CI. fleet-builders measured no number ("several minutes", no seconds recorded). **Resolved:** GATE-10 stands. The next round measures ocx's cost.
11. **Minor.** Legacy `sha256 =` was a MUST in derivation-conventions but builds fine by its own run, so it is demoted to SHOULD (PKG-01). fleet-builders' alternative `cargoLock.lockFile = self + "/Cargo.lock"` is dropped, because NIX-FLK-07's `read-via-self` was red.
12. **ocx's git dependencies: 0 (V-fb #11) versus 10 (w3 §2).** Re-measured in this revision: `grep -c 'source = "git+' Cargo.lock` gives **10** for ocx at HEAD `2691d3c1638e` and **0** for grimoire (P16). The uv/pubgrub crates entered ocx's lock in `159469736` on 2026-09-23, before V-fb's 2026-09-27 run, so V-fb #11 was wrong when it was taken, not merely stale. **Resolved:** 10 git crates from 2 revs, so `outputHashes` is required (PKG-22, w3 R1). The Applied claim "0 git sources in either lock" is struck for ocx.
13. **The rerun's "verified" ocx `package.nix` wraps `buildRustPackage (finalAttrs: { … })` but never uses `finalAttrs`.** That fails GATE-05's deadnix gate under PKG-14 (P9 shows the exact error). The rerun also never ran `nixfmt --check` on it. **Resolved:** the workspace template below drops the wrapper. That one edit is unbuilt, and it cannot change the derivation.
14. **PKG-13 said `versionCheckHook` "runs `meta.mainProgram --version`" and scoped the rule to "a CLI with `--version`".** ocx has no `--version` (its clap `Cli` lacks `#[command(version)]`, P17), and the default failed after a full compile (w3 R2). Taken literally, the old scope exempted ocx from any version check, which contradicts Applied's commitment. **Resolved:** PKG-13 now covers every A CLI, and PKG-19 makes the entry point explicit (`versionCheckProgramArg`). The hook's fallback order (`--version`, then `--help`, then a substring match on `$version`) comes from `pkgs/by-name/ve/versionCheckHook/hook.sh`, read in this revision.
15. **PKG-17's "`pkg-config` only" reads as target-independent; aws-lc-sys's `get_builder()` makes it conditional** (w3 §6). **Resolved:** PKG-17's scope clause names the conditions in place (the rule's meaning is narrowed, not reversed), and fleet-builders' unexplained `Compiling cmake v0.1.58` is explained: the Rust wrapper crate is an unconditional build-dependency, and the `cmake` binary is never invoked on the `cc` path.
16. **PKG-08's rationale said "the fleet CLIs are dual-licensed Rust crates."** Measured in this revision: ocx, grimoire and ocx-sdk-python all declare `license = "Apache-2.0"` (P16). **Resolved:** the rationale is corrected. The rule is unchanged, because the compound-expression trap still bites any adopter's dual-licensed crate.
17. **NIX-FLK-13's overlay form `<name> = final.callPackage ./package.nix { }` versus a Python library.** A top-level overlay attribute never reaches `python312.pkgs`/`python313.pkgs` (w3 R6: `attribute 'ocx-sdk' missing`). **Resolved:** PKG-21 is the Python-library specialization of FLK-13 (register through `pythonPackagesExtensions`, and keep a top-level package for `nix build`). FLK-13 is not changed; it covers A and D applications.
18. **Applied put the PKG-16 floor check "in `checks`"; map E25 said it ships as a CI step until a `checks` form is watched.** The rerun wrote that form but never built it (R7), and the revision's re-run was blocked (P15). **Resolved for E25:** a CI step. Applied is corrected.
19. **Only grimoire was said to need `inputs.self.submodules`.** ocx has three gitlinks (`external/{docker_credential,rust-oci-client,sigstore-rs}`) resolved by `[patch.crates-io]` path dependencies (P17; w3 §1 had to populate them by hand). **Resolved:** ocx declares `inputs.self.submodules = true` too (NIX-INP-09). The owner question about forked submodules now covers both CLIs.

## The ruleset

Severity: **MUST** means a normative or measured source plus a verification watched red on a planted fixture here or in a sub-artifact. **SHOULD** allows a known exception class. **CONSIDER** depends on context. "V-dc §n" is derivation-conventions' *Verification runs*, "V-fb #n" is fleet-builders', "w3 Rn" is verification-rerun-w3's, and "P n" is the runs this consolidation added (table at the end of this section). w3 R1-R6 were watched in that session. Their fixtures were then lost to the environment fault, so they are admissible from the recorded output but cannot be re-run as they stand. Rules are grouped by the check that catches them. Rules another family already owns are cited, not restated: FLK-07 (eval-time source reads), FLK-13/14 (one `package.nix`, thin `flake.nix`), FLK-15 (`mainProgram` and the `nix run` smoke test), GATE-05 (deadnix), GATE-10 (build every package), GEN-11..14 (prebuilt template and meta), INP-09 (self submodules/LFS), REL (version from the manifest).

### NIX-PKG — A. Caught by `nix build --rebuild <pkg>.src` and a fetcher grep

**NIX-PKG-01 — Fetch every `src` with a nixpkgs fetcher (`fetchFromGitHub`, `fetchurl`, …), never a builtin (`builtins.fetchTarball`, `builtins.fetchGit`, `fetchTree`), and spell the hash `hash = "sha256-…"` (SRI), never `sha256 =`, `cargoSha256` or `vendorSha256`.**
- Rationale: builtins fetch at evaluation time into a path no substituter serves. nixpkgs forbids them (`doc/build-helpers/fetchers.chapter.md:6-17`). `hash` is "currently preferred" (`:866`). `cargoSha256` has been a hard error since nixpkgs 25.05.
- Verification: `grep -rn -e 'sha256 = "' -e 'cargoSha256' -e 'vendorSha256' --include='*.nix' .`, where empty output passes. The builtin half is a reading heuristic, because flake-compat shims (`default.nix`, `shell.nix`) use `fetchTarball` legitimately (map, "Explicitly not a defect").
- Watched red: **yes** for the grep (P6: `fetch-legacy-sha256` hit, exit 0; `fetch-good-hash` no hit, exit 1). The legacy attribute still **builds** on 26.11pre (V-dc §6), which is why this rule is a SHOULD and not a MUST.
- Severity: **SHOULD**. Floor: `hash` requires nixpkgs ≥ 21.11. The hard error on `cargoSha256` starts at nixpkgs 25.05.

**NIX-PKG-02 — Pin a git source with a full 40-hex `rev`, or with `tag` naming a real tag. Never use a short or truncated hex, never a branch name, and never `tag = "<hex>"`. When `nurl` prints `tag =` for a hex argument, re-run it with the full 40-hex SHA.**
- Rationale: GitHub shares commit hashes across forks, so a short hash can become ambiguous and 404 (`pkgs/README.md`, the short-hash incident, map M-D-04). `fetchFromGitHub { tag = X; }` fetches `archive/refs/tags/X.tar.gz`, so a hex "tag" is a 404 on any store that lacks the output (P2). nurl 0.4.1 prints `tag = "<hex>"` for every argument that is not exactly 40 hex characters and `rev =` for a 40-hex argument (P5). derivation-conventions' skeleton inherited this from nurl.
- Verification: `grep -rnE -e 'rev = "[0-9a-f]{7,39}"' -e 'tag = "[0-9a-f]{7,40}"' --include='*.nix' .`, where empty output passes. This overturns the dive's claim that the rule is "not automatable as a single grep".
- Watched red: **yes** (P4). Hits: `fetch-short-rev` (7 hex), `fetch-good-hash` (the dive's "full" rev is 39 hex), and `skeleton` (`tag` = 39 hex), each exit 0. No hit: `fetch-full-rev` (40 hex), exit 1. The short rev itself still resolves on GitHub with `--rebuild` (P3), so the grep is the gate, not a build.
- Severity: **MUST**.

**NIX-PKG-03 — Never write a hash by hand. Obtain it with `nurl` or `nix-prefetch-*`, or set one of exactly `lib.fakeHash`, `lib.fakeSha256`, `lib.fakeSha512` or `""`, build once, and copy the `got:` value.**
- Rationale: with any other placeholder, nixpkgs passes `--insecure` to curl, so the download is open to MITM even over HTTPS (`fetchers.chapter.md:55-66,157-160`). A guessed hash that happens to match a cached path also triggers PKG-04's silent reuse.
- Verification: `nix build .#<pkg>.src` fails with `error: hash mismatch in fixed-output derivation … specified: … got: …`. Copy the `got:` value.
- Watched red: **yes** (V-dc §6). `fetch-wrong-hash` and `fetch-fakehash` fail with the same drv and the same error, which shows `lib.fakeHash` is the all-`A` SRI literal. `fetch-good-hash` exits 0.
- Severity: **MUST**.

**NIX-PKG-04 — Whenever you change a fetcher argument (`url`, `rev`, `tag`, `owner`, `repo`, `curlOptsList`, …), reset `hash` to `lib.fakeHash` in the same edit, and verify with `nix build --rebuild .#<pkg>.src`. A plain `nix build` is not a verification.**
- Rationale: "existing store objects that match the output hash will be re-used rather than fetching new content" (`fetchers.chapter.md:40-42`). A bumped `rev` with a stale hash silently ships the *old* source.
- Verification: `nix build --no-link --rebuild .#<pkg>.src`.
- Watched red: **yes** (P1). `fetch-rev-bumped-stale-hash` (rev moved to `553c2077…`, hash kept) exits **0** on a plain build and prints the *old* store path `zn68jdid…-source`. With `--rebuild` it exits 1: `hash mismatch … specified: sha256-gdkPz7… got: sha256-MX8NoLcp…`. P2 shows the skeleton's 404 hidden the same way: plain exit 0, `--rebuild` exit 1 `curl: (22) … 404`. The compliant `fetch-full-rev` exits 0 under `--rebuild`.
- Severity: **MUST**. Floor: all Nix versions (the FOD path depends only on name and hash). This generalizes NIX-GEN-08/15 from D to every shape.

### NIX-PKG — B. Caught by a `drvPath` comparison and a layout grep

**NIX-PKG-05 — Set `src = lib.fileset.toSource { root = ./.; fileset = lib.fileset.unions [ … ]; }` with an explicit list (for Rust: `./Cargo.toml`, `./Cargo.lock`, `./src`, plus workspace member directories). Never use `src = ./.` or `src = self` unfiltered. Do not use `lib.fileset.gitTracked` for filtering inside a flake.**
- Rationale: an unfiltered `src` changes the `drvPath` on every edit to a README, a workflow or the docs, so every such commit triggers a full rebuild. Inside a flake the source is already a git-filtered store path, and `gitTrackedWith` "does not perform any filtering when the path is a Nix store path" (`lib/fileset/default.nix:946`), so it filters nothing.
- Verification: `a=$(nix eval --raw .#<name>.drvPath); echo x >> README.md; git add -A; b=$(nix eval --raw .#<name>.drvPath); [ "$a" = "$b" ]`
- Watched red: **yes**. On the naive twin the drvPath moved `2wgcf55…` → `cx3zlz0…`, while the fileset twin kept `mg76w0h…` (V-dc §1a-b). P9 confirms it on a real `buildRustPackage`: `pp4qdajj…-octool-0.1.0.drv` before and after the README edit.
- Severity: **MUST** (A). CONSIDER for a one-file package.

**NIX-PKG-06 — Put `package.nix` at the repository root as a plain `callPackage` function whose formals are only nixpkgs attributes. It uses no `../` path and no symlink out of its directory, so a nixpkgs `pkgs/by-name` submission changes only `src`, `version` and the cargo hash attribute.**
- Rationale: a by-name package "cannot reference files outside its own directory" (`pkgs/by-name/README.md:134-166`). A `nix/package.nix` with `root = ../.` can never be copied. Extra formals such as `src ? …` or `version ? "git"` (yazi's pattern) are not by-name compatible. This is the packaging half of NIX-FLK-13, whose drvPath-equality check still applies.
- Verification: `grep -rn -e '\.\./' --include='package.nix' .`, where empty output passes.
- Watched red: **yes** (P13). `byname-parentref/nix/package.nix` hits (exit 0); `rust-template` does not (exit 1).
- Severity: **SHOULD** (owner Q3 default: by-name-ready now, submit later).

### NIX-PKG — C. Caught by `nix eval` over `meta`

**NIX-PKG-07 — Every package sets `meta.description`, `meta.license` and `meta.platforms`, plus `meta.homepage`. The description follows nixpkgs grammar: it starts with a capital, has no leading article, has no trailing period, and does not restate the name. `mainProgram` is NIX-FLK-15 (A) or NIX-GEN-13 (D); `sourceProvenance` is NIX-GEN-12 (D).**
- Rationale: a missing field fails nothing (neither `nix flake check` nor the build) and silently degrades `nix search`, license gating and `meta.available`. The grammar comes from `pkgs/README.md:494-501` and the wrong/right pair in `doc/stdenv/meta.chapter.md`.
- Verification (whole set, both shapes):
  `nix eval --json --no-write-lock-file .#packages.x86_64-linux --apply 'ps: builtins.mapAttrs (n: p: { d = p.meta.description or null; l = p.meta ? license; p = p.meta ? platforms; }) ps' | jq -e 'all(.[]; .d != null and .l and .p and (.d | test("^[A-Z]") and (test("[.]$") | not) and (test("^(A|An|The) ") | not)))'`
- Watched red: **yes** (P8). `meta-missing-platforms`, `meta-missing-license` and `meta-bad-grammar` (`"A fixture CLI … minimum."`) each exit 1; `meta-good` exits 0. Presence was also red on four single-package twins (V-dc §7).
- Severity: **MUST** for presence, **SHOULD** for grammar. Floor: nixpkgs grammar as of 26.11pre.

**NIX-PKG-08 — Give `meta.license` as a `lib.licenses.<attr>` or a single SPDX id. Never pass a compound expression (`"Apache-2.0 OR MIT"`) to `lib.getLicenseFromSpdxId`; use a list of licenses instead. Evaluate your own packages in CI with `--option abort-on-warn true`.**
- Rationale: a compound expression does not parse, and it prints a warning into every consumer's evaluation. The Rust ecosystem's default `MIT OR Apache-2.0` makes it the first thing an agent writes for an adopter's crate. The fleet's own three packages are single-licence `Apache-2.0` (`lib.licenses.asl20`, P16), and that must still be written by hand.
- Verification: `nix eval --option abort-on-warn true --json .#packages.x86_64-linux.<name>.meta.license`
- Watched red: **yes** (V-dc §8). `meta-spdx-warn` prints `getLicenseFromSpdxId: No license with the given SPDX ID found: Apache-2.0 OR MIT` and exits 1; `meta-good` exits 0. NIX-GEN-14 holds the generator-side split.
- Severity: **MUST**. Floor: `abort-on-warn` exists in CppNix 2.35.2. On other implementations, check before relying on it.

### NIX-PKG — D. Caught by a real build (GATE-10's `nix build`)

**NIX-PKG-09 — Put build-time tools in `nativeBuildInputs` and link-time or runtime libraries in `buildInputs`, and set `strictDeps = true` from the first commit.**
- Rationale: under `strictDeps` only `nativeBuildInputs` reach `PATH`. nixpkgs-vet ratchets the setting one-way for by-name packages (RFC 140). Without it, a misplacement works natively and breaks cross builds.
- Verification: `nix build .#<name>`
- Watched red: **yes** (V-dc §9). `strictdeps-bad` fails with `stdenv-linux/setup: line 1771: hello: command not found`, exit 1; `strictdeps-good` exits 0. P9 builds `buildRustPackage` with `strictDeps = true`, exit 0.
- Severity: **MUST**.

**NIX-PKG-10 — Set `__structuredAttrs = true`. Keep `env.*` scalar (string, bool, int or derivation), and put list-valued attributes at the top level of the derivation.**
- Rationale: without structured attrs, a top-level list is space-joined and re-split, so `"--message=hello world"` becomes two arguments. That error is silent: exit 0 either way. `env` rejects lists with or without the flag.
- Verification: a build that echoes `${#name[@]}`, plus eval of `env.<x> = [ … ]`, which fails with `The 'env' attribute set can only contain derivation, string, boolean or integer attributes`.
- Watched red: **yes** (V-dc §10). The count is 3 without the flag and 2 with it; the `env` list fails eval. P9 confirms `buildRustPackage` accepts the flag, exit 0.
- Severity: **SHOULD**. MUST only for a by-name submission, where the vet ratchet applies.

**NIX-PKG-11 — Every overridden phase starts with `runHook pre<Phase>` and ends with `runHook post<Phase>`. Never set `phases`.**
- Rationale: without the hooks the package builds, but every downstream `overrideAttrs { postInstall = …; }` silently does nothing. No linter checks this (statix and deadnix only parse Nix, and the phase body is a shell string).
- Verification: on your own flake only, build `(builtins.getFlake (toString ./.)).packages.x86_64-linux.default.overrideAttrs (o: { postInstall = (o.postInstall or "") + "touch $out/MARKER"; })` with `nix build --impure --expr …`, then `test -e <out>/MARKER`. As a reading pre-check, every `Phase = ''` block contains `runHook`.
- Watched red: **yes** (V-dc §5). `runhook-bad` builds (exit 0) with no `MARKER`; `runhook-good` has `MARKER`.
- Severity: **MUST**.

**NIX-PKG-12 — `substituteInPlace` and `substitute` use `--replace-fail` (or `--replace-warn` where a miss is expected). Never use bare `--replace` in new code.**
- Rationale: bare `--replace` on a pattern that matches nothing exits 0 silently on 26.11pre. The deprecation is tracked in nixpkgs#356002 (open since 2024-11-14, about 7,000 in-tree uses), and the form has not been removed.
- Verification: `grep -rnE -e '--replace( |$)' --include='*.nix' .`, where empty output passes. It has false positives on unrelated CLIs' own `--replace` flag (git-hooks.nix's google-java-format), so read each hit.
- Watched red: **yes**. The grep hits `substitute-bare` (exit 0) and not `substitute-fail` (exit 1) (P7). Build: bare exits 0; `--replace-fail` exits 1 with `ERROR: pattern NONEXISTENT_TOKEN doesn't match anything in file` (V-dc §4).
- Severity: **MUST** in new code. Existing code migrates when touched.

**NIX-PKG-13 — Every A package that ships a CLI sets `nativeInstallCheckInputs = [ versionCheckHook ]; doInstallCheck = true;`, pointed at the CLI's real version entry point (PKG-19). Behaviour beyond the version goes in `passthru.tests` built against `finalAttrs.finalPackage`.**
- Rationale: `nix flake check` never runs the binary. With no `versionCheckProgramArg`, `versionCheckHook` runs `meta.mainProgram --version`, then `--help`, in the sandbox, and passes when either output contains the package `version` as a substring (`hook.sh`). It proves at build time what NIX-FLK-15's `nix run` smoke test proves at the end of CI: the binary exists, is the main program, and reports the manifest's version. *Revised:* the old scope ("a CLI with `--version`") exempted ocx, which has no such flag. The rule now covers every A CLI, and PKG-19 handles the entry point.
- Verification: `nix build .#<name>`
- Watched red: **yes** (P9). The `rust-template` build logs `Executing versionCheckPhase`, exit 0. `rust-template-wrong-version` (prints `9.9.9`) exits 1 with `Did not find version 0.1.0 in the output of the command …/bin/octool --version`. On real ocx, w3 R2/R3 are the entry-point pair (PKG-19). The `passthru.tests` mechanism was watched separately (V-dc §2, §11).
- Severity: **MUST** for A CLIs, **CONSIDER** elsewhere. Floor: `versionCheckHook` is present in nixpkgs 26.11pre and used by 134 llm-agents.nix package files.

**NIX-PKG-19 — Before relying on `versionCheckHook`'s default, confirm the CLI answers `--version` (or prints its version in `--help`). If it does not, set `versionCheckProgramArg` to the real entry point (ocx: `"version"`, a subcommand). Set `versionCheckProgram` only when the version-reporting binary is not `meta.mainProgram`. Never answer a `versionCheckPhase` failure with `doInstallCheck = false` or by removing the hook.**
- Rationale: clap registers `-V`/`--version` only when `#[command(version)]` is set. ocx's `Cli` (`crates/ocx_cli/src/app.rs`) omits it and reports its version through a `version` subcommand, so the default fails with `error: unexpected argument '--version' found`. That reads like a CLI bug, and it arrives only after a full compile (~6 min for ocx). The tempting "fix" of disabling the install check silently deletes PKG-13's guarantee.
- Verification: `nix build .#<name>`. As a reading pre-check for clap CLIs, empty output from `grep -rn -e 'command(version' -e '\.version(' --include='*.rs' <cli-crate>/src` means the default argument will fail.
- Watched red: **yes** (w3 R2/R3, real ocx 0.6.3). Default argument: the compile succeeds, then `Did not find version 0.6.3 in the output of the command …/bin/ocx --version`, and the hook exits 2. With `versionCheckProgramArg = "version"`: `Successfully managed to find version 0.6.3 in the output of the command …/bin/ocx version`, build exit 0. The clap grep is empty on ocx (P17), a reading heuristic, not a gate.
- Severity: **MUST** for A CLIs. Floor: nixpkgs 26.11pre `versionCheckHook` (`versionCheckProgramArg` replaces the default `--version`/`--help` loop).

**NIX-PKG-20 — Budget GATE-10's per-PR `nix build` of a `buildRustPackage` package as a full compile for *any* edit to the package, including `meta`, `nativeBuildInputs` and install-check attributes. Do not count a warm vendor derivation as a saving. Judge a caching change by the `Compiling` line count, not by the network fetches it removes.**
- Rationale: `cargo-vendor-dir` is a separate derivation and is reused when `Cargo.lock` and `outputHashes` are unchanged. The compile is one non-incremental derivation, and any attribute change rebuilds it from scratch. For ocx the compile dominates the vendor step by more than 10:1.
- Verification: a measurement, not a red/green pair. Change one non-source attribute, rebuild, then compare `grep -c 'trying https://static.crates.io'` (vendor reuse) with the count of `Compiling` lines (recompilation) across the two logs.
- Measured (w3 R2/R3, ocx, x86_64-linux, ~16 logical cores, one sample each): compile phase **5m39s** and then **6m01s** after a one-string install-check edit. Wall clock **7m12s** (3310.89 s user, 244.26 s system, 822% average CPU). About 500 crate fetches in the first log and **0** in the second. Closure size was not measured (w3 R9).
- Severity: **CONSIDER** (a cost fact for CI design; GATE-10's MUST is unchanged). Whether crane's `buildDepsOnly` split cuts this cost is an open question.

### NIX-PKG — E. Caught by deadnix (GATE-05) and evaluation

**NIX-PKG-14 — When the package refers to its own final attributes (`passthru.tests`, `finalAttrs.version` in a URL, `finalAttrs.finalPackage`), write `mkDerivation (finalAttrs: { … })`, never `rec { }`. When nothing refers to them, write a plain attrset: an unused `finalAttrs` fails the deadnix gate.**
- Rationale: `rec` cannot name the fixed-point output, and pasting `finalPackage` into `rec` gives `error: undefined variable 'finalPackage'`. `rec` for plain `pname`/`version` interpolation stays legitimate (map conflict 20; llm-agents.nix's 22 `mkDerivation rec`). deadnix `--no-lambda-pattern-names` ignores formal names but still flags an unused plain lambda argument.
- Verification: `deadnix --fail --no-lambda-pattern-names .` (GATE-05), and `nix flake check --no-build` for the `rec` case.
- Watched red: **yes**. `rust-template-unused-finalattrs` exits 1 with `Unused lambda argument: finalAttrs`, and the plain `rust-template` exits 0 (P9). `rec-bad` exits 1 at eval, while `finalattrs-good` and its test exit 0 (V-dc §2).
- Severity: **SHOULD**.

### NIX-PKG — F. The fleet's builders: caught by a cold `--no-build` and a build

**NIX-PKG-15 — Rust in-repo: `rustPlatform.buildRustPackage` with `cargoLock.lockFile = ./Cargo.lock`. Never `"${src}/Cargo.lock"` or `"${finalAttrs.src}/Cargo.lock"`, even when `src` is a fileset, and never `src = builtins.path { path = self; }`. Use `cargoHash` only in a nixpkgs submission. Crane is accepted with `src = craneLib.cleanCargoSource ./.`.**
- Rationale: the nixpkgs Rust manual calls `cargoHash` "tedious when using `buildRustPackage` within a project, since it requires that the hash is updated after every change to `Cargo.lock`" (`rust.section.md:120-126`). Both forms are permitted in nixpkgs (`:71`). The interpolated read is NIX-FLK-07's cold-store failure, and this rule is the builder spelling FLK-07 delegates to NIX-PKG.
- Verification: `nix flake check --no-build "tarball+file://$PWD/src.tar.gz"` after `git archive --format=tar.gz -o src.tar.gz HEAD`. A fresh tarball is cold by construction. Pre-check: `grep -rn -e 'lockFile = "${' -e 'builtins.path' --include='*.nix' .`
- Watched red: **yes**. On real grimoire, `grimoire-brp-bad` exits 1 (`path '…-source' is not valid`) and `-good` exits 0; `grimoire-crane-selfpath` exits 1 and `-bare` exits 0 (V-fb #1-2). With a fileset `src`, `rust-template-srcread` exits 1 both by tarball and locally (`path '/nix/store/9aqdx690…-source' is not valid`), while `rust-template-pathread` exits 0 on both (P10).
- Severity: **MUST**. Floor: `fetchCargoVendor` has been the default since nixpkgs 25.05 (`rl-2505.section.md:163-167`). Measured on CppNix 2.35.2; FLK-07 was also red on 2.31.5. A lock with git sources also needs `outputHashes` (PKG-22).

**NIX-PKG-22 — When `Cargo.lock` has any `source = "git+…"` entry, set `cargoLock.outputHashes` with one entry per distinct git revision. Key each entry by any one `name-version` from that revision, and obtain its hash with PKG-03's fake-hash procedure. When a git revision in the lock changes, reset its entry to `lib.fakeHash` in the same edit (PKG-04). Do not use `allowBuiltinFetchGit`.**
- Rationale: `importCargoLock` maps each `name-version` to its revision (`namesGitShas`) and validates every crate from that revision against one hash. So ocx's 10 git crates (9 from `astral-sh/uv@0adb444806e8`, 1 from `astral-sh/pubgrub@d8efd77673c9`) need exactly 2 entries. `allowBuiltinFetchGit` fetches with `builtins.fetchGit` at evaluation time, which is PKG-01's builtin-fetcher problem. That clause is a reading-level inference and was not run.
- Verification: `nix flake check --no-build .`. Pre-check: `grep -c 'source = "git+' Cargo.lock`, where a nonzero count means `outputHashes` is required.
- Watched red: **yes** (w3 R1, real ocx). Without `outputHashes`, exit 1 at evaluation with `No hash was found while vendoring the git dependency uv-cache-key-0.0.1. You can add a hash through the outputHashes argument of importCargoLock`. With the two entries (`uv-cache-key-0.0.1`, `version-ranges-0.1.1`), exit 0, and the full build then succeeded (R3). The stale-hash clause is PKG-04's mechanism applied to this fetcher and was not separately watched.
- Severity: **SHOULD**: the missing-entry failure is loud and cannot ship. Floor: nixpkgs 26.11pre `import-cargo-lock.nix`.

**NIX-PKG-16 — Build with the pinned nixpkgs `rustPlatform`, and add a check that its `rustc` is at least the `rust-toolchain.toml` channel. Never assume `buildRustPackage` reads `rust-toolchain.toml`. Do not put rust-overlay or fenix in `package.nix`. They may appear in a devShell (CONSIDER) for contributors who want the exact channel.**
- Rationale: nothing in nixpkgs parses the file (`rust.section.md:1003-1090`: a non-default Rust needs rust-overlay or fenix via `makeRustPlatform`). A rust-overlay `package.nix` cannot be submitted to nixpkgs, and it adds an input every consumer locks (NIX-INP). The pins drift apart over time. They are not broken today: the pinned rustc is 1.98.1 against channel 1.95.0, and grimoire builds with both (V-fb #8-9).
- Verification: `ch=$(sed -n 's/^channel *= *"\(.*\)"/\1/p' rust-toolchain.toml); v=$(nix eval --raw --inputs-from . nixpkgs#rustc.version); nix eval --expr "builtins.compareVersions \"$v\" \"$ch\" >= 0" | grep -qx true`
- Watched red: **yes** (P11). `rust-floor-ok` (channel 1.95.0, rustc 1.98.1) exits 0; `rust-floor-bad` (channel 99.0.0) exits 1.
- Placement: ship the command as a CI step. The `checks.<system>.rust-toolchain-floor` form (a `runCommand` gated on the same `builtins.compareVersions`, w3 §7) is written but **unwatched**: w3 R7 never ran, and this revision's re-run was blocked (P15). Do not move it into `checks` until it goes red and green (map E25).
- Severity: **SHOULD**.

**NIX-PKG-17 — Start native inputs at the minimum the build asks for (`nativeBuildInputs = [ pkg-config ]` for aws-lc-sys pulled in by rustls), and add a tool only when an error names it. Before adding `bindgenHook` or `libclang` for a `-sys` entry in `Cargo.lock`, trace it with `cargo tree --target all -i <crate>`.**
- Rationale: grimoire and ocx (both aws-lc-sys 0.43) built with `pkg-config` alone (V-fb #8, w3 R3). aws-lc-sys ships pre-generated bindings for the Linux gnu and musl targets, so CMake, bindgen and Go are "never required" there (aws-lc-sys README). ocx's `clang-sys` is aws-lc-sys's *optional* bindgen build-dependency, which Cargo locks but never activates on those targets. Preemptive inputs grow the closure and get copied forward by the next agent.
- Scope (*revised*: conditional, not target-independent): the recipe holds only while aws-lc-sys's `get_builder()` returns its `cc` builder. That requires pre-generated bindings for the target, no FIPS build, no `AWS_LC_SYS_CMAKE_BUILDER` override, and no sanitizer or `no_asm` (`aws/aws-lc-rs@37019d05477d:builder/main.rs:722-812`). If any condition fails, it runs `CmakeBuilder` (add `cmake`), plus bindgen when bindings are missing (add `rustPlatform.bindgenHook`). `Compiling cmake v0.1.58` in a log is the Rust wrapper crate, an unconditional `[build-dependencies]` entry, and does not show that the `cmake` binary ran. The trace reads aws-lc-rs `main` (aws-lc-sys 0.45.0); the fleet pins 0.43.0, so the mechanism holds but the line numbers are for `main`.
- Verification: `nix build --no-link -L .#<name>`, then `cargo tree --target all -i clang-sys` from the workspace root. For a new target or feature set, first check that aws-lc-sys lists pre-generated bindings for it (reading level).
- Watched red: **no clean pair**. The minimal builds succeeded (V-fb #8, w3 R3), the trace is a measurement (V-fb #10), and the builder selection is a source reading (w3 §6). Darwin, musl and aarch64 were not built.
- Severity: **SHOULD**. Scope: x86_64-linux, nixpkgs 26.11pre.

**NIX-PKG-18 — Python: `python3Packages.buildPythonPackage { pyproject = true; build-system = [ <backend> ]; }` with the backend `pyproject.toml` names (hatchling for ocx-sdk-python), not the setuptools the error message suggests. Reach for uv2nix/pyproject.nix only when the package has compiled runtime dependencies to reproduce from `uv.lock`.**
- Rationale: without `pyproject` or `format`, nixpkgs 26.11pre refuses to evaluate, and its message suggests `build-system = [ setuptools ]`, the wrong backend for a hatchling project. uv2nix's value is a resolved wheel graph, and ocx-sdk-python has `dependencies = []`.
- Verification: `nix build --no-link -L .#<name>` reaches `pythonMetadataCheckPhase`.
- Watched red: **yes**. `python-no-pyproject` fails eval with ``does not configure a `format`. To build with setuptools as before, set `pyproject = true` and `build-system = [ setuptools ]` ``, exit 1 (P14). `ocx-sdk-python-good` builds, exit 0 (V-fb #4). With `pythonImportsCheck = [ "ocx_sdk" ]` and a fileset `src`, it builds through `pythonImportsCheckPhase` and `pythonMetadataCheckPhase`, exit 0 (w3 R4).
- Severity: **SHOULD**. Floor: the explicit-format requirement (nixpkgs ≥ 25.11, map M-D-13).

### NIX-PKG — G. Caught by a second consumer flake's evaluation

**NIX-PKG-21 — A Python *library* flake exports two things. First, `overlays.default = final: prev: { pythonPackagesExtensions = (prev.pythonPackagesExtensions or [ ]) ++ [ (pyFinal: _pyPrev: { <name> = pyFinal.callPackage ./package.nix { }; }) ]; }`. Second, `packages.<system>.<name>` (and `default`), bound to the flake's own `python3`. Never export a Python library only as a top-level attribute, and never use NIX-FLK-13's top-level overlay form for it.**
- Rationale: nixpkgs' Python manual documents `pythonPackagesExtensions` as the way to add or override a package "for all Python versions". A top-level attribute exists only for the one `python3` the producer bound, so a consumer composing libraries under `python312.pkgs` cannot see it. The top-level package keeps `nix build .#<name>` and `nix run` working. FLK-13's `<name> = final.callPackage ./package.nix { }` fits applications, not a package whose formals (`buildPythonPackage`, `hatchling`) live inside a Python set.
- Verification: from a **separate** consumer flake that applies `producer.overlays.default`, run `nix eval --no-write-lock-file .#packages.x86_64-linux.via-312.drvPath .#packages.x86_64-linux.via-313.drvPath`, where `via-3NN = pkgs.python3NN.pkgs.<name>`.
- Watched red: **yes** (w3 R5/R6). With the overlay export, both attributes evaluate to distinct derivations (`python3.12-ocx-sdk-0.2.0.drv`, `python3.13-ocx-sdk-0.2.0.drv`) and both build through `pythonImportsCheckPhase`, exit 0. With a top-level-only export, the same probe exits 1: `error: attribute 'ocx-sdk' missing`. Unverified edits in the rule text: `_pyPrev` (the rerun wrote `pyPrev`; renamed for deadnix, per FLK-02's convention) and the drvPath equality between `packages.<system>.<name>` and the consumer's `python3.pkgs.<name>` (FLK-13's check, not run for this shape).
- Severity: **MUST** for a Python library flake (ocx-sdk-python). Floor: `pythonPackagesExtensions` in nixpkgs 26.11pre.

MUST count: **13** (02, 03, 04, 05, 07, 08, 09, 11, 12, 13, 15, 19, 21).

**Dropped from the dives' candidates, and why:**
- derivation-conventions PKG-13 (`updateScript`): an in-repo A package using `cargoLock` has no hash to bump, and D uses NIX-GEN-16's updater. It matters only at nixpkgs submission, which r-ryantm handles.
- PKG-14 (`overrideAttrs`): a negative rule. It moves to "not a finding" below.
- PKG-15 (`allowUnfree`): NIX-FLK-11 already owns the configured instance, and no consumer ships unfree code.
- PKG-16 (patches, `fetchpatch2`): no consumer patches, and nothing was verified.
- PKG-17 (the "no linter" checklist): not a behaviour.
- fleet-builders rule 1: this is NIX-FLK-07, which is cited, not duplicated.
- fleet-builders rule 9 (builders do not emit the `'system'` warning): a measurement (0/0/0, V-fb #5) that closes NIX-FLK-12's residue, not a rule.
- fleet-builders rule 7 ("0 git dependencies, no `outputHashes`"): wrong for ocx (conflict 12), and superseded by PKG-22.
- verification-rerun-w3 rule 4 (aws-lc-sys scope): folded into PKG-17's scope clause, not a new ID.
- verification-rerun-w3 rule 5 (PKG-16 as a `checks` derivation): unwatched, so it stays a placement note on PKG-16.
- verification-rerun-w3 rule 7 (ocx `build.rs` is deterministic): a reading-level prediction without a `--rebuild` run. It stays an open question (M-D-24).

**Not a finding** (leave alone):
- `overrideAttrs` in an out-of-tree or generated flake. The nixpkgs ban is in-tree only (`pkgs/README.md:529-542`).
- `rec` for `pname`/`version` interpolation.
- `fetchTarball` with a `sha256` inside a flake-compat `default.nix` shim.
- Legacy `sha256` in generated files (crate2nix `Cargo.nix`, bundix `gemset.nix`). These are excluded by NIX-GATE-04.

### The verified in-repo Rust template (for `nix-flake-adopt`)

`fixtures/nix-packaging/rust-template/package.nix`, paired with the NIX-FLK skeleton `flake.nix` (packages, `overlays.default`, `formatter = pkgs.nixfmt-tree`). Results: nixfmt `--check` 0; deadnix 0; `nix flake check --no-build --all-systems` 0 with 0 warnings; tarball-cold `--no-build` 0 (P10 `pathread`); build 0 with `versionCheckPhase` (P9); drvPath stable across a README edit (P9). It supersedes derivation-conventions' `skeleton/`, whose `src` is a 404 (P2).

```nix
{
  lib,
  rustPlatform,
  versionCheckHook,
}:

rustPlatform.buildRustPackage {
  pname = "octool";
  version = (lib.importTOML ./Cargo.toml).package.version; # workspace: .workspace.package.version (NIX-REL)

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./Cargo.toml
      ./Cargo.lock
      ./src
    ];
  };

  cargoLock.lockFile = ./Cargo.lock;

  strictDeps = true;
  __structuredAttrs = true;

  nativeInstallCheckInputs = [ versionCheckHook ];
  doInstallCheck = true;

  meta = {
    description = "Fixture CLI for the in-repo Rust package.nix template";
    homepage = "https://example.invalid/octool";
    license = lib.licenses.mit;
    mainProgram = "octool";
    platforms = lib.platforms.unix;
  };
}
```

The nixpkgs submission swaps three lines: `src` becomes `fetchFromGitHub { …; tag = "v${finalAttrs.version}"; hash = …; }`, `version` becomes a literal, and `cargoLock` becomes `cargoHash`. Since `tag` then refers to `finalAttrs`, the function becomes `(finalAttrs: { … })` (PKG-14).

**Workspace variant (ocx, built, w3 R1-R3).** This is the rerun's `package.nix` with one change: it drops the unused `(finalAttrs: …)` wrapper (conflict 13). That edit is unbuilt and does not change the derivation. The file has not been checked with `nixfmt --check`. The flake must declare `inputs.self.submodules = true` (NIX-INP-09), because the fixture populated `external/` by hand. Deltas from the single-crate template:

```nix
  version = (lib.importTOML ./Cargo.toml).workspace.package.version;
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [ ./Cargo.toml ./Cargo.lock ./rust-toolchain.toml ./crates ./external ];
  };
  cargoLock = {
    lockFile = ./Cargo.lock;
    outputHashes = {                                                                   # PKG-22: one per git rev
      "uv-cache-key-0.0.1" = "sha256-I0Oe6vaH7iQh+Ubp5RIk8Ol6Ni7OPu8HKX0fqLdewyk=";    # astral-sh/uv@0adb4448
      "version-ranges-0.1.1" = "sha256-6A3XWOIYOSnQCz80yPGrcCeH3r/9BxX80+58Y0Hgzlg="; # astral-sh/pubgrub@d8efd776
    };
  };
  cargoBuildFlags = [ "-p" "ocx" "-p" "ocx_shim" ];  # both [[bin]]s install; no installPhase override
  nativeBuildInputs = [ pkg-config ];                # PKG-17
  doCheck = false;                                   # tests need network and a real OCI registry
  versionCheckProgramArg = "version";                # PKG-19: ocx has no --version
  meta.license = lib.licenses.asl20;                 # Cargo.toml: license = "Apache-2.0"
```

The rerun also set `versionCheckProgram = "${placeholder "out"}/bin/ocx"`. That is redundant, because the hook falls back to `meta.mainProgram` (`hook.sh`), and PKG-19 reserves it for a version binary that is not the main program.

### Verification runs added by this consolidation

All runs: `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, CppNix 2.35.2, nixpkgs `8d5d270900d3…` (26.11pre), 2026-09-27, under `fixtures/nix-packaging/`, each `git init -q && git add -A`. Lix is 2.95.2 from the same nixpkgs revision.

| # | Fixture(s) | Command | Violation | Twin |
|---|---|---|---|---|
| P1 | `fetch-rev-bumped-stale-hash` / `fetch-full-rev` | `nix build --no-link [--rebuild] .` | plain **0** (old path `zn68jdid…-source`), `--rebuild` **1** `hash mismatch … got: sha256-MX8NoLcp…` | `--rebuild` **0** |
| P2 | `skeleton` (copy of the dive's) | `nix eval --raw .#octool.src.url`; `nix build --no-link [--rebuild] .#octool.src` | URL `…/archive/refs/tags/7fd1a60b…edf11.tar.gz`; plain **0**, `--rebuild` **1** `curl: (22) … 404` | — |
| P3 | `fetch-short-rev`, `fetch-full-rev` | `nix build --no-link --rebuild .` | 7-hex short rev **0** (GitHub resolves it; not a build gate) | 40-hex `…edf11d` **0**; `…edf11e` (typo) **1** 404 |
| P4 | four fetch fixtures | `grep -rnE -e 'rev = "[0-9a-f]{7,39}"' -e 'tag = "[0-9a-f]{7,40}"' --include='*.nix' <dir>` | short-rev **0**, good-hash (39 hex) **0**, skeleton **0** | full-rev **1** |
| P5 | — | `nurl https://github.com/octocat/Hello-World <sha>` (nurl 0.4.1) | 39-hex argument → `tag = "7fd1a60b…edf11"` | 40-hex argument → `rev = "…edf11d"` |
| P6 | dive's `fetch-legacy-sha256` / `fetch-good-hash` (read-only) | `grep -rn -e 'sha256 = "' -e 'cargoSha256' -e 'vendorSha256' --include='*.nix' <dir>` | **0** (hit) | **1** |
| P7 | dive's `substitute-bare` / `-fail` (read-only) | `grep -rnE -e '--replace( |$)' --include='*.nix' <dir>` | **0** (line 18) | **1** |
| P8 | `meta-missing-platforms`, `meta-missing-license`, `meta-bad-grammar` / `meta-good` | the NIX-PKG-07 command | **1** / **1** / **1** (`false`) | **0** (`true`) |
| P9 | `rust-template`, `-unused-finalattrs`, `-wrong-version` | `nixfmt --check`; `deadnix --fail --no-lambda-pattern-names .`; `nix flake check --no-build --all-systems .`; drvPath before/after README edit; `nix build --no-link -L .#octool` | deadnix **1** `Unused lambda argument: finalAttrs`; wrong-version build **1** `Did not find version 0.1.0` | nixfmt 0, deadnix 0, check 0 with 0 warnings, drvPath `pp4qdajj…` unchanged, build **0** with `versionCheckPhase` |
| P10 | `rust-template-srcread` / `-pathread` | `git archive …; nix flake check --no-build tarball+file://…` and `.` | **1** / **1** `path '/nix/store/9aqdx690…-source' is not valid` | **0** / **0** |
| P11 | `rust-floor-bad` / `-ok` | the NIX-PKG-16 command | **1** (99.0.0) | **0** (1.98.1 ≥ 1.95.0) |
| P12 | `self-submodules-without` / `-with` | `nix eval --no-write-lock-file --json .#probe` (CppNix, then Lix) | CppNix **1** `Path 'external/dep' in the repository … is not tracked by Git`; Lix on `-with` **1** `experimental Lix feature 'flake-self-attrs' is disabled` | CppNix `-with` **0** `["Cargo.toml"]`; `?submodules=1` **0**; Lix with `--extra-experimental-features flake-self-attrs` **0**; Lix `?submodules=1` **0** |
| P13 | `byname-parentref` / `rust-template` | `grep -rn -e '\.\./' --include='package.nix' <dir>` | **0** | **1** |
| P14 | `python-no-pyproject` | `nix eval --raw .#packages.x86_64-linux.default.drvPath` | **1** ``does not configure a `format` `` | V-fb #4 build **0** |
| P15 | (revision, attempt to re-run w3 R7) | `timeout 60 run.sh nix --version` | **blocked**, exit 1: `bwrap: Can't find source path /home/mherwig/.cache/research-lang/nix-tools/.nix-portable/emptyroot: No such file or directory`. `nix-tools/` holds only `run.sh` and `fixtures/nix-generated-flakes-rev3/`, and the exemplar corpus directory is gone | — |
| P16 | — (read-only, live repositories) | `grep -c 'source = "git+' {ocx,grimoire}/Cargo.lock`; `git log -S'astral-sh/uv?rev' -- Cargo.lock`; `grep -n license` in each manifest | ocx **10** (lines 6970-7094 uv, 7152 pubgrub), added in `159469736` (2026-09-23); grimoire **0**; `license = "Apache-2.0"` in ocx and grimoire `Cargo.toml` and ocx-sdk-python `pyproject.toml` | measurement |
| P17 | — (read-only, ocx `2691d3c1638e`) | `grep -rn -e 'command(version' -e '\.version(' crates/ocx_cli/src`; `git ls-files --stage . \| grep '^160000'`; `cat .gitmodules` | clap grep: no `Cli` hit (only an unrelated `format!("version {}")`); three gitlinks `external/{docker_credential,rust-oci-client,sigstore-rs}`, patched in by `[patch.crates-io]` | measurement |

**Runs folded from verification-rerun-w3** (CppNix 2.35.2, nixpkgs `e158d9ed`, ocx HEAD `2691d3c1638e`. Fixtures lost after the runs, see the note on severity above):

| # | Fixture | Command | Violation | Twin |
|---|---|---|---|---|
| R1 | `packaging/ocx` | `nix flake check --no-build .` | no `outputHashes`: **1** `No hash was found while vendoring the git dependency uv-cache-key-0.0.1` | two entries: **0** |
| R2/R3 | `packaging/ocx` | `nix build --no-link -L .` | default arg: compile OK (5m39s), then `Did not find version 0.6.3 … ocx --version` / `unexpected argument '--version' found` | `versionCheckProgramArg = "version"`: **0**, both binaries stripped, 7m12s wall |
| R4 | `packaging/ocx-sdk-python` | `nix flake check --no-build .`; `nix build --no-link -L .#ocx-sdk` | — | **0** / **0**, through `pythonImportsCheckPhase` |
| R5/R6 | `ocx-sdk-consumer` / `-toplevel-only` | `nix eval --no-write-lock-file .#packages.x86_64-linux.via-312.drvPath` (and `via-313`, plus builds) | top-level only: **1** `attribute 'ocx-sdk' missing` | overlay: **0**, two distinct drvs, both built |
| R7 | `pkg16-checks-derivation/{ok,bad}` | `nix build --no-link -L .#checks.x86_64-linux.rust-toolchain-floor` | **NOT RUN** (also blocked in revision, P15) | **NOT RUN** |
| R8 | `packaging/ocx` | `nix build --rebuild --no-link -L .` | **NOT RUN / unconfirmed** | — |
| R9 | `packaging/ocx` | `nix path-info -Sh <out>` | **NOT RUN** | — |

## Applied to the exemplars and the future consumers

**Satisfied by strict exemplars:**
- PKG-14 (`finalAttrs`): `NixOS/nix@209d2bc44288`, 35 files, for example `packaging/components.nix`; llm-agents.nix, 49 files ([shape §4](nix-audit/exemplar-flake-shape.md)).
- PKG-05 (fileset): `NixOS/nix@209d2bc44288:packaging/components.nix:81`; crane, 32 filtering files; 10 repositories use `fileset.toSource`.
- PKG-13 (`versionCheckHook`): `numtide/llm-agents.nix@efb10f28f724:packages/qwen-code/package.nix:86` and 133 more; ghostty 1.
- PKG-09 (`strictDeps`): crane 13 files (for example `ipetkov/crane@73b980519cef:examples/sqlx/flake.nix:43`), llm-agents 5, helix and nix 1 each.
- PKG-10 (`__structuredAttrs`): NixOS/nix 12 files.
- PKG-15 (`lockFile = ./Cargo.lock`): `oxalica/nil@205c8ba65a7f:flake.nix:38`.

**Violated by prominent exemplars:**
- **PKG-15 / FLK-07.**
  - `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:193` uses `src = builtins.path { path = self; }`, reproduced red on grimoire (V-fb #2).
  - `sxyazi/yazi@0ea4c5d9ef75:nix/yazi-unwrapped.nix:32` has `lockFile = "${src}/Cargo.lock"` over a fileset `src`. This is the exact P10 violation, and it matches yazi's audited remote-ref `--no-build` red (map, "checker limitations").
- **PKG-05 / PKG-06.**
  - `oxalica/nil@205c8ba65a7f:flake.nix:35` sets `src = self;` unfiltered on a `buildRustPackage` inlined in `flake.nix` (also NIX-FLK-14), with `version = "unstable-${date}"` (`:34`, NIX-REL: must start with a digit).
  - yazi's `package.nix`-equivalent takes `root = ../.` and extra formals (`version ? "git"`, `rev`, `date`), so it is not by-name-copyable.
- **PKG-12.**
  - `hercules-ci/flake-parts@31729ca8cbdb:template/package/hello/package.nix:22`. A template is copied verbatim, so this seeds the defect into every adopter.
  - `zed-industries/zed@bda9c0bd43a8:nix/livekit-libwebrtc/package.nix:179`.
  - `oxalica/rust-overlay@4e9bb05a9ab6:lib/mk-aggregated.nix:109-111`.
  - `mitchellh/zig-overlay@95d96b17b711:default.nix:42`.
- **PKG-02 / PKG-04.** derivation-conventions' own verified skeleton `fixtures/derivation-conventions/skeleton/package.nix:14` (`tag = "<39-hex>"`) passes every gate on a warm store and 404s on a cold one (P2).

**New commitments for the fleet's flakes:**
- **ocx and grim (A):**
  - The Rust template above: a root `package.nix`, a fileset `src` (including `crates/` and `external/` for ocx), `cargoLock.lockFile = ./Cargo.lock`, `pkg-config` only, `versionCheckHook`, the PKG-07/08 meta, and the PKG-16 floor check as a CI step (not in `checks`, E25).
  - grimoire's lock has 0 git sources. ocx's has 10 from 2 revisions and carries the two `outputHashes` entries (PKG-22, conflict 12).
  - ocx is **built** (w3 R1-R3; workspace variant above): `version` from `.workspace.package.version`, `cargoBuildFlags = [ "-p" "ocx" "-p" "ocx_shim" ]` (both binaries install), and `versionCheckProgramArg = "version"` (PKG-19). Per-PR build cost is 7m12s (PKG-20).
  - `meta.license = lib.licenses.asl20` for both, written by hand. Their index entries carry no license annotation (NIX-GEN-14 evidence), so nothing can be copied.
  - Both CLIs declare `inputs.self.submodules = true;` (NIX-INP-09): grimoire for two submodules and ocx for three (conflict 19). Each README notes that Lix needs `--extra-experimental-features flake-self-attrs` (P12). Without the declaration, a local `nix build .` fails with `not tracked by Git`, and a locked-rev fetch yields an empty directory (V-fb #6-7).
  - GATE-10 still requires `nix build` of each package on every PR. fleet-builders' "nightly or tag only" is not adopted (conflict 10), now with the cost measured (Verdict 11).
- **ocx-sdk-python (A, library):** PKG-18's shape with `pythonImportsCheck = [ "ocx_sdk" ]` (built, w3 R4), the PKG-07 meta (`license = lib.licenses.asl20`), and PKG-21's export: a `pythonPackagesExtensions` overlay plus `packages.<system>.ocx-sdk`/`default`. It gets no `mainProgram` and no `versionCheckHook`, because it is a library.
- **setup-ocx:** no package (M-D-21 deferred).
- **The ocx generated flake (D):** PKG-04 (the `--rebuild` discipline, already GEN-08/15), PKG-07 (description, license and platforms on top of GEN-12/13) and PKG-11 (its shared builder overrides `installPhase`) apply. PKG-05, -06, -13, -15..22 do not, because there is no source build. PKG-08 is implemented generator-side by GEN-14.

## AI-agent failure modes

Ranked by how often each bites an agent working unsupervised.

1. **Trusting a green build on a warm store.** The agent bumps `rev` and keeps the hash, pastes nurl's `tag = "<hex>"`, or changes a transport, and `nix build` stays green because the store reuses any path with the same name and hash. This hit a dive's own "fully verified" skeleton. Check: `nix build --rebuild .#<pkg>.src` (PKG-04), plus the P4 grep (PKG-02).
2. **Reading a manifest or lock through `${src}`.** It looks explicit and works on the author's machine, including with a fileset `src`, then fails on CI with an error that never names `cargoLock`. Check: `--no-build` against a fresh `git archive` tarball (PKG-15, FLK-07).
3. **Inventing a hash, or hand-truncating a SHA.** Check: fake-hash procedure only (PKG-03), then the P4 grep.
4. **`src = ./.` or `src = self`.** Every README commit rebuilds the CLI. Check: drvPath before and after an unrelated edit (PKG-05).
5. **Treating `nix flake check` as proof the package works.** Missing meta, missing `runHook`, and a binary that does not match `mainProgram` all pass it. Check: the PKG-07 jq, the `versionCheckHook` build (PKG-13), and the override marker (PKG-11).
6. **Copying bare `--replace` from pre-2024 examples**, including the flake-parts template. Check: the PKG-12 grep.
7. **Build tools in `buildInputs`.** Check: a build under `strictDeps = true` (PKG-09).
8. **Over-provisioning `-sys` native inputs "to be safe"** (cmake, clang, bindgenHook) because the name appears in `Cargo.lock`. Check: minimal build first, then `cargo tree --target all -i` (PKG-17).
9. **Believing Nix honours `rust-toolchain.toml`, or reflexively adding rust-overlay.** Check: the PKG-16 floor command.
10. **Wrapping every derivation in `finalAttrs:` by reflex** (deadnix red), or pasting `finalAttrs.finalPackage` into `rec` (eval error). Check: GATE-05 (PKG-14).
11. **Forgetting submodules**, or telling users to add `?submodules=1`. Check: `git ls-files --stage . | grep -e '^160000'` non-empty means `inputs.self.submodules = true` is required (NIX-INP-09, P12).
12. **Promoting a fixture bug to a finding.** fleet-builders' retracted "rustc 1.98 breaks grimoire" came from an unanchored `rsync --exclude`. Check: `diff <(cd fixture && find . -type f | sort) <(cd repo && git ls-files | sort)` before reporting any build failure.
13. **Disabling the version check when `versionCheckPhase` fails.** The error (`unexpected argument '--version' found`) looks like a CLI bug and arrives after a multi-minute compile, so `doInstallCheck = false` is the tempting fix. Check: find the real entry point and set `versionCheckProgramArg` (PKG-19).
14. **Trusting an inherited count.** A prior artifact's "0 git dependencies" was wrong for ocx, and an agent citing it skips `outputHashes`. Check: re-run `grep -c 'source = "git+' Cargo.lock` against the live file (PKG-22).
15. **Reading `Compiling cmake v…` as "needs cmake".** It is the Rust wrapper crate, compiled unconditionally. Check: the crate's builder selection for the target (PKG-17 scope), then a minimal build.
16. **Exporting a Python library like an application.** Pasting FLK-13's `<name> = final.callPackage ./package.nix { }` overlay, or a top-level-only `packages` entry, leaves the library missing from every `python3NN.pkgs`. Check: PKG-21's two-interpreter probe from a consumer flake.
17. **"Warm the vendor cache" as the CI speed-up.** Network fetches drop to zero while the compile stays at about 6 minutes. Check: compare the `Compiling` counts across two logs, not the fetch counts (PKG-20).

## Open questions

**Owner decisions, with the default the program applies:**
- **The CLIs' forked submodules** (grimoire: `external/docker_credential`, `external/rust-oci-client`; ocx: those two plus `external/sigstore-rs`). *Default:* keep them and declare `inputs.self.submodules = true`. Alternative: publish the forks and use Cargo `git =` dependencies, which then need `cargoLock.outputHashes` (PKG-22).
- **Exact-channel builds.** *Default:* the pinned nixpkgs `rustPlatform` plus the PKG-16 floor check. The exact 1.95.0 channel is offered only in the devShell, as CONSIDER.
- **Lix consumers of grimoire.** *Default:* README note plus the feature flag in the advisory Lix leg (NIX-GATE-16). Promote only if Lix ships `flake-self-attrs` enabled by default.

**Subareas that need another research round:**
- **packaging/ocx-determinism-and-closure (M-D-24).** Does `nix build --rebuild` of the built ocx derivation reproduce its output hash (w3 R8), and what is its closure size (`nix path-info -Sh`, R9)? If the rebuild differs, bisect `SOURCE_DATE_EPOCH`, then `TZDIR` and locale. Both runs need a restored toolchain (P15).
- **packaging/pkg16-checks-form (E25).** Build w3 §7's `rust-toolchain-floor` `runCommand` on the `ok` and `bad` twins (R7). If it goes red and green, move PKG-16's check into `checks` and name the channel source (`rust-toolchain.toml`, or ocx's `workspace.package.rust-version`, which equals the channel by policy).
- **packaging/rust-build-cost.** Does crane's `buildDepsOnly`/`buildPackage` split (or another dependency-artifact cache) bring ocx's metadata-only rebuild below PKG-20's 7m12s, and is it worth an extra input under NIX-INP?
- **packaging/darwin-and-aarch64 (M-D-23).** Do aws-lc-sys, `security-framework-sys` and `core-foundation-sys` build on aarch64-darwin (SDK 14.4 floor, nixpkgs 25.11+) and on aarch64-linux with only `pkg-config`, on a native runner? Nothing here built off x86_64-linux, and this host (WSL, x86_64) cannot. The PKG-17 scope trace predicts the Linux aarch64 targets are covered by pre-generated bindings.
- **inputs/self-submodules-remote.** Does `inputs.self.submodules` behave as P12 showed when fetched as `github:ocx-sh/grimoire/<rev>` (and now `github:ocx-sh/ocx/<rev>`) under the 2.31 floor, under Lix with the feature enabled, and under Determinate Nix? P12 ran only locally.

## Sub-artifacts

- [nix-packaging/derivation-conventions.md](nix-packaging/derivation-conventions.md): fetchers and hashes, `src` filtering, meta, phases, `substituteInPlace`, `strictDeps`/`__structuredAttrs`, `finalAttrs`. Ten red/green pairs. Its skeleton, its fileset exemption and its combined jq are superseded here.
- [nix-packaging/fleet-builders.md](nix-packaging/fleet-builders.md): grimoire under `buildRustPackage` and crane (cold-safe spellings, aws-lc-sys with `pkg-config`, the submodule blocker, the toolchain seam), ocx's `clang-sys` trace, ocx-sdk-python under `buildPythonPackage`, and source versus `-bin`. Its "0 git dependencies" (V-fb #11) is corrected for ocx here.
- [nix-packaging/verification-rerun-w3.md](nix-packaging/verification-rerun-w3.md): ocx end to end (outputHashes, versionCheckProgramArg, measured cost), aws-lc-sys's `cc`/`cmake` builder selection, ocx-sdk-python's `pythonImportsCheck` and its two export shapes. R7-R9 were not run because of an environment fault. Its ocx `package.nix` is corrected here (conflict 13).

## Key sources

- https://github.com/NixOS/nixpkgs/blob/master/doc/build-helpers/fetchers.chapter.md: FOD reuse caveat (`:40-42`), fake-hash procedure and `--insecure` (`:55-66`, `:157-160`), `tag` versus `rev` (`:864-877`).
- https://github.com/NixOS/nixpkgs/blob/master/doc/languages-frameworks/rust.section.md: `cargoHash` versus `cargoLock` (`:53-134`), `bindgenHook` (`:534`), community toolchains (`:1003-1090`).
- https://github.com/NixOS/nixpkgs/blob/master/doc/languages-frameworks/python.section.md: `buildPythonPackage`, `pyproject = true`, `build-system`.
- https://github.com/NixOS/nixpkgs/blob/master/doc/stdenv/meta.chapter.md: description grammar, `mainProgram`, `sourceProvenance`.
- https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md: naming, version, meta and review checklist (`:433-542`).
- https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/README.md: by-name structure (`:134-166`).
- https://github.com/NixOS/nixpkgs/blob/master/lib/fileset/default.nix: `toSource`, and `gitTrackedWith` doing no filtering on a store path (`:946`).
- https://nix.dev/tutorials/working-with-local-files: the whole-directory copy that motivates `fileset`.
- https://github.com/NixOS/nixpkgs-vet: `strictDeps`/`__structuredAttrs` ratchets.
- https://github.com/jtojnar/nixpkgs-hammering/tree/main/explanations: `missing-phase-hooks`, `no-flags-array`, `environment-variables-go-to-env`.
- https://github.com/NixOS/nixpkgs/issues/356002: bare `--replace` deprecation, still open.
- https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-25.05/doc/manual/source/release-notes/rl-2505.section.md: `fetchCargoVendor` default, `cargoSha256` removed.
- https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.27.md: `inputs.self.submodules`.
- https://raw.githubusercontent.com/aws/aws-lc-rs/main/aws-lc-sys/README.md: pre-generated bindings; CMake, bindgen and Go not required.
- https://github.com/nix-community/nurl: hash-and-fetcher emission (0.4.1 prints `tag` for a non-40-hex argument, P5).
- https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/build-support/rust/import-cargo-lock.nix: `outputHashes` resolved per git revision via `namesGitShas` (PKG-22).
- https://raw.githubusercontent.com/NixOS/nixpkgs/master/pkgs/by-name/ve/versionCheckHook/hook.sh: the default `--version`, then `--help`, loop, the `versionCheckProgram` → `NIX_MAIN_PROGRAM` → `pname` fallback, and the substring match (PKG-13, PKG-19). Read 2026-09-27.
- https://github.com/NixOS/nixpkgs/blob/master/doc/languages-frameworks/python.section.md, "How to override a Python package for all Python versions using extensions": `pythonPackagesExtensions` (PKG-21).
- `aws/aws-lc-rs@37019d05477d:builder/main.rs:722-812` and `aws-lc-sys/Cargo.toml` (`main`, aws-lc-sys 0.45.0): `get_builder()`'s `cc`-first and `cmake`-fallback conditions, and the unconditional `cmake` wrapper build-dependency (PKG-17 scope).

## Revision log

- 2026-09-27 (fold of verification-rerun-w3, plus revision re-measurements P15-P17):
  - **PKG-13, text changed in place:** the scope goes from "a CLI with `--version`" to every A CLI; the rationale now states the hook's real fallback order. Why: ocx has no `--version`, so the old scope exempted it (conflict 14).
  - **PKG-19, new (MUST):** confirm `versionCheckHook`'s entry point, set `versionCheckProgramArg`, and never disable the check. Why: w3 R2/R3 red/green on real ocx.
  - **PKG-20, new (CONSIDER):** GATE-10's Rust cost is a full compile for any package edit, and vendor caching does not reduce it. Why: w3 measured 7m12s. The rule is a measurement, with no red/green pair.
  - **PKG-21, new (MUST):** a Python library exports a `pythonPackagesExtensions` overlay plus a top-level package. Why: w3 R5/R6 red/green; answers M-D-27 and specializes FLK-13 (conflict 17).
  - **PKG-22, new (SHOULD):** `cargoLock.outputHashes`, one entry per git revision, obtained with fake hashes. Why: ocx has 10 git crates from 2 revisions (w3 R1, P16).
  - **PKG-17, scope changed in place:** "`pkg-config` only" is now conditional on aws-lc-sys's `cc`-builder selection, and `Compiling cmake` is explained. Why: w3 §6 source trace (conflict 15). Still no red/green pair and still SHOULD.
  - **PKG-16, placement note added:** a CI step; the `checks` form stays unwatched. Why: w3 R7 not run, and the revision's re-run was blocked (P15, E25, conflict 18). The rule text and severity are unchanged.
  - **PKG-08, rationale corrected:** the fleet is `Apache-2.0`, not dual-licensed (P16, conflict 16). The rule is unchanged.
  - **PKG-15, cross-reference to PKG-22 added.** PKG-18: `pythonImportsCheck` build evidence added (w3 R4).
  - **Verdict:** items 6, 8 and 9 updated; items 10 (ocx built), 11 (GATE-10 cost) and 12 (documented gaps: PKG-17 target-conditional, M-D-24 unwatched, PKG-16 `checks` form unwatched) added.
  - **Applied:** "0 git sources in either lock" struck for ocx (conflict 12); "unbuilt" struck for ocx and for ocx-sdk-python's `pythonImportsCheck`; ocx gains `inputs.self.submodules` (conflict 19); the PKG-16 check moves from `checks` to a CI step (conflict 18); the workspace template is added with its unused `finalAttrs` wrapper removed (conflict 13).
  - **Open questions:** "packaging/ocx-source-build" and "packaging/python-library-export" removed (answered). Added "ocx-determinism-and-closure" (M-D-24, R8/R9), "pkg16-checks-form" (E25, R7) and "rust-build-cost". The submodule owner question and the remote-submodules question now include ocx.
  - **MUST count:** 11 → 13.
