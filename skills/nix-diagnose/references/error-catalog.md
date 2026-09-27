# The Nix error catalog

Read this at step 2 of the procedure, after `nix --version` and the input shape
are recorded. Look a failure up by (shape, implementation, version) first and by
string second. A string is a fingerprint for one implementation and version
range, never a universal key (NIX-LANG-08).

Contents: [How to read a row](#how-to-read-a-row) ·
[Same fault, different text](#same-fault-different-text) ·
[A. Language and modules](#a-language-and-modules) ·
[B. Flake output contract](#b-flake-output-contract) ·
[C. Gate tools](#c-gate-tools) · [D. Inputs and the lock](#d-inputs-and-the-lock) ·
[E. Packaging and builds](#e-packaging-and-builds) ·
[Generated flakes](#generated-flakes) ·
[Misattributed diagnostics](#misattributed-diagnostics)

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`, floor
`nix_2_31` = 2.31.5, Lix 2.95.2, nixfmt 1.5.0, deadnix 1.3.2, nixf-diagnose
0.1.4, flake-checker 0.2.15. Re-check the Lix rows at each Lix release and the
nixpkgs-message rows at each nixpkgs branch-off.

## How to read a row

- **Impl / version** names where the string was seen. "All three" means CppNix
  2.35.2, CppNix 2.31.5 and Lix 2.95.2 printed the same key fragment with the
  same exit code.
- **Shape** is the flake shape: A app, B library, C module, D generated,
  E template, or all.
- **Status** is `re-verified-2026-09-27` (planted again and run on the named
  implementations for this skill) or `carried-from-research` (a watched run from
  the research corpus, not re-planted). A carried row is still evidence. Re-run
  it before you cite it as the only cause.
- **First command** is the cheapest command that reproduces the line. Replace
  `.#default` with your attribute.
- The string column holds a **key fragment**. Store hashes and your attribute
  names differ, so match the fragment, not the whole line.

## Same fault, different text

Class C20. Each row is one fault, planted once, printed differently.

| Fault | CppNix 2.31.5 / 2.35.2 | Lix 2.95.2 | Status |
|---|---|---|---|
| A `path:../sibling` input leaves the flake's git tree | `access to absolute path '/nix/store/sibling…' is forbidden in pure evaluation mode (use '--impure' to override)` | `relative path '../sibling' points outside of its parent's store path '/nix/store/…-source'` | re-verified-2026-09-27. The research recorded Lix as matching CppNix. This re-run contradicts that. CppNix 2.20.6 also printed the `points outside` text |
| A `follows` chain cycles | `error: follow cycle detected: [nixpkgs -> a/nixpkgs -> nixpkgs]` | `error: stack overflow (possible infinite recursion)`, no input named | re-verified-2026-09-27 |
| Eval-time read through the flake's own source store path, cold store | `error: path '/nix/store/…-source' is not valid` | `error: path '/nix/store/…-source' did not exist in the store during evaluation` | re-verified-2026-09-27 |
| `nix flake lock --update-input a` | `warning: '--update-input' is a deprecated alias for 'flake update' and will be removed in a future version.`, exit 0 | ``error: `nix flake lock --update-input a` has been replaced by `nix flake update a` ``, exit 1 | re-verified-2026-09-27 |
| A string `formatter`, or a `self: super:` overlay | hard error, exit 1 | exit 0, no diagnostic | re-verified-2026-09-27 |
| An `apps` entry with an extra key | `has unsupported attribute 'name'`, exit 1 | exit 0, no diagnostic | re-verified-2026-09-27 |
| One attribute path defined by a `rec` set and a plain one | accepted, exit 0 | `cannot be merged, because one set is marked as recursive and the other isn't`, exit 1, for every attribute of the file | re-verified-2026-09-27 |
| `imports` computed from `config` | targeted hint plus `infinite recursion encountered` | bare `infinite recursion encountered`, no hint even under `--show-trace` | re-verified-2026-09-27, new |
| Reading `pkgs.system` | `evaluation warning: 'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` | `warning: 'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` | re-verified-2026-09-27, new |
| Fixed-output hash mismatch | `specified:` and `got:` lines | adds `likely URL:`, then `specified:` and `got:` | re-verified-2026-09-27 |

## A. Language and modules

| # | Verbatim string (key fragment) | Impl / version | Shape | Cause | First command | Fix | Status | Rule |
|---|---|---|---|---|---|---|---|---|
| 1 | ``… you probably reference `config` in `imports`.`` then `error: infinite recursion encountered` | CppNix 2.35.2 and 2.31.5 with nixpkgs `8d5d2709` print the hint without `--show-trace`. Lix 2.95.2 prints only the bare line | C | `imports` computed from `config` | `nix eval .#default`, then `nix eval --show-trace .#default` on Lix, where the trace names the `imports =` line | Make `imports` unconditional and put `lib.mkIf` inside `config` | re-verified-2026-09-27 | NIX-LANG-10 |
| 2 | `error: infinite recursion encountered` with a code frame on the overlay's `final.x` read | All three | A, B, D | An overlay reads `final.x` to define `x` | `nix eval .#default` (the frame often shows bare). Add `--show-trace` when the frame is missing or inside nixpkgs | Read `prev.x` | re-verified-2026-09-27 | NIX-LANG-10 |
| 3 | `error: infinite recursion encountered` in a per-system helper under `--all-systems` | CppNix 2.35.2 | A, D | A `pkgsFor`-style helper indexes its own unfinished result set, or bootstraps a system it cannot build (seen on `x86_64-freebsd` from `lib.systems.flakeExposed`) | `nix eval --show-trace .#packages` | Build the per-system set once, or drop the unsupported system | carried-from-research | NIX-LANG-10, NIX-FLK-08 |
| 4 | `error: infinite recursion encountered` whose innermost frame is under the nixpkgs source (seen in `cpython/default.nix`) | CppNix 2.35.2 | all | A nixpkgs-internal recursion | `nix flake check --all-systems --no-build`, then `--show-trace` | None in the flake. File upstream or wait. Keep the systems list | carried-from-research | NIX-LANG-10, NIX-GATE-09 |
| 5 | `error: undefined variable 'x'` for every attribute of the file | All three | all | No enclosing `with`, so name resolution is static and whole-file | `nix eval .#default` fails even on an attribute that never uses `x` | Fix the name | re-verified-2026-09-27 | NIX-GATE-07 |
| 6 | `error: undefined variable 'x'` only on the attribute that forces it | All three | all | An enclosing `with scope;` defers the lookup to run time | Evaluate a sibling attribute (exit 0), then the forcing one (exit 1) | Fix the name, and drop the scope-wide `with` | re-verified-2026-09-27 | NIX-LANG-07 |
| 7 | `[sema-undefined-variable] Error: undefined variable` | nixf-diagnose 0.1.4, exit 1. It is not on the default PATH | all | Static check, no evaluation | `nix run nixpkgs#nixf-diagnose -- flake.nix`, unlocked: `--inputs-from .` evaluates the flake and dies on the same undefined variable | Fix the name in the editor. Never a CI gate | re-verified-2026-09-27 | NIX-GATE-07 |
| 8 | `error: Refusing to evaluate package 'unrar-7.3.1' in … because it has an unfree license` | All three, nixpkgs `8d5d2709` | A, D | `config.allowUnfree` is false | `nix eval .#packages.x86_64-linux.default.outPath` | `allowUnfree` or `allowUnfreePredicate` in the one configured instance | re-verified-2026-09-27 | NIX-FLK-11 |
| 9 | `error: Refusing to evaluate package '…' … because it is not available on the requested hostPlatform` | CppNix 2.35.2, nixpkgs `8d5d2709` | A, D | `meta.platforms` excludes the system | `nix eval .#packages.x86_64-linux.default.outPath` | Guard the output per system. Not an author defect by default | carried-from-research | NIX-GATE-09 |
| 10 | `nix eval --json .#pkg` prints only `"/nix/store/…-hello-1"` | All three, exit 0 | all | The JSON encoder collapses any attribute set with `outPath` to that string | `nix eval --json .#default` | `nix eval --json .#default --apply 'p: { inherit (p) pname version; }'` returns an object | re-verified-2026-09-27 | NIX-LANG-11 |
| 11 | The original error re-printed after a fix that should have changed it | CppNix 2.35.2. Staleness not reproduced on bare attributes | all | The eval cache keyed by flake narHash and attribute path ([NixOS/nix#3872](https://github.com/NixOS/nix/issues/3872)) | Run the identical command twice | Re-run with `--no-eval-cache`. Non-reproduction is an environment gap, not proof | carried-from-research | NIX-LANG-08 |
| 12 | `app 'apps.x86_64-linux.default' has unsupported attribute 'name'` on CppNix, silence on Lix | CppNix 2.35.2 and 2.31.5 exit 1, Lix 2.95.2 exit 0 | A | Lix's app check skips unknown keys | `nix flake check --no-build --no-write-lock-file .` per implementation | Treat a Lix green as no evidence | re-verified-2026-09-27 | NIX-FLK-19 |
| 13 | Template checks enforced alike | All three exit 1 | E | Lix's template check is not part of the leniency gap | Same | No implementation caveat for templates | re-verified-2026-09-27 | NIX-FLK-03 |
| 14 | `path '…' is not a flake (because it's not a directory)` for a symlinked flake | Reported on 2.14.1 ([NixOS/nix#8013](https://github.com/NixOS/nix/issues/8013), open). Not reproduced: all three resolve the link, exit 0 | all | An old report | `nix eval ./link#default` | Re-test an old issue on the pinned version before citing it | re-verified-2026-09-27 | NIX-LANG-08 |

## B. Flake output contract

| # | Verbatim string (key fragment) | Impl / version | Shape | Cause | First command | Fix | Status | Rule |
|---|---|---|---|---|---|---|---|---|
| 15 | `error: flake attribute 'packages.x86_64-linux.default' is not a derivation` | All three, exit 1 | all | A non-derivation under `packages`, `checks` or `devShells` | `nix flake check --no-build --no-write-lock-file .` | Make the value a derivation | re-verified-2026-09-27 | NIX-FLK-01 |
| 16 | `error: flake attribute 'formatter.x86_64-linux' is not a derivation` | CppNix 2.35.2 and 2.31.5 exit 1. Lix 2.95.2 exit 0, silent | all | A string `formatter` | Same | Set `formatter` to a derivation | re-verified-2026-09-27 | NIX-FLK-01, NIX-FLK-19 |
| 17 | `error: overlay does not take an argument named 'final'` | CppNix 2.35.2 and 2.31.5 exit 1 for `self: super:` and `{ final, prev }:`. Lix 2.95.2 exits 0 on `self: super:` | A, B, D | Pre-flake overlay spelling, or formals | Same | `final: prev: { … }`, with `_` on an argument the body never reads | re-verified-2026-09-27 | NIX-FLK-02, NIX-FLK-19 |
| 18 | `error: overlay is not a function with two arguments, but only takes one` | Lix 2.95.2 only, exit 1, for `{ final, prev }:` | A, B, D | Lix's arity-only overlay check | Same, on Lix | Same fix as row 17 | re-verified-2026-09-27 | NIX-FLK-02, NIX-FLK-19 |
| 19 | `error: app 'apps.x86_64-linux.default' has unsupported attribute 'name'` | CppNix 2.35.2 and 2.31.5, exit 1 | A, D | An extra key in an `apps` entry | Same | Keep `type`, `program` and `meta` | re-verified-2026-09-27 | NIX-FLK-03 |
| 20 | `error: template 'templates.default' lacks attribute 'description'` | All three, exit 1 | E | Required key missing | Same | Add `description` | re-verified-2026-09-27 | NIX-FLK-03 |
| 21 | `warning: flake output attribute 'defaultPackage' is deprecated; use 'packages.<system>.default' instead` | All three, exit 0 | all | A pre-2021 singular output | Same | Rename to the plural form | re-verified-2026-09-27 | NIX-FLK-04 |
| 22 | `warning: unknown flake output 'schemas'` | All three, exit 0 | all | Only Determinate Nix reads `schemas` | Same | Remove `schemas`. Never delete a community output (`lib`, `homeModules`) for this warning | re-verified-2026-09-27 | NIX-FLK-05 |
| 23 | `error: path '/nix/store/…-source' is not valid` | CppNix 2.35.2 and 2.31.5, exit 1, from the local checkout on a cold store | all | An eval-time read through the flake's own source store path (`"${src}/Cargo.lock"`, `builtins.path { path = self; }`), or through an input's: the store name then names the input (DeterminateSystems/flake-checker@cddc8afc: `…-easy-template-source`, whose crane build reads its `Cargo.lock`, `--show-trace`, remote ref, 2026-09-27) | `nix flake check --no-build --no-write-lock-file .` on a fresh clone | Read the source-tree path (`./Cargo.lock`). In an input, report it upstream or bump the input | re-verified-2026-09-27 | NIX-FLK-07, NIX-PKG-15 |
| 24 | `… did not exist in the store during evaluation` | Lix 2.95.2, exit 1 | all | Same fault as row 23 | Same, on Lix | Same fix | re-verified-2026-09-27 | NIX-FLK-07 |
| 25 | `error: Nixpkgs 26.11 has dropped support for x86_64-darwin.` | All three, nixpkgs `8d5d2709` | all | `x86_64-darwin` in the systems list against nixpkgs 26.11 or unstable | `nix flake check --no-build --all-systems --no-write-lock-file .` | Drop the system, or stay on `nixos-26.05` until its end of life (end of 2026) | re-verified-2026-09-27 | NIX-FLK-09 |
| 26 | `'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` | All three, exit 0 (prefix differs, see C20) | all | A read of `pkgs.system`. The `import nixpkgs { system = …; }` argument is not the cause | `nix eval .#default` and count the warnings | Read `pkgs.stdenv.hostPlatform.system` | re-verified-2026-09-27 | NIX-FLK-12 |
| 27 | `error: unable to execute '/nix/store/…/bin/octool-pkg': No such file or directory` | CppNix 2.35.2. `nix flake check` green on the same flake | A, D | `meta.mainProgram` absent or wrong, so `nix run` guessed a name | `nix run .#default -- --version` | Set `meta.mainProgram`, or an `apps` entry for the real binary | carried-from-research | NIX-FLK-15 |
| 28 | `cat: …-source/untracked.txt: No such file or directory` at build time | CppNix 2.35.2 | all | A file the build reads was never `git add`ed | `git ls-files --others --exclude-standard .` (any output is the finding) | `git add` the file | carried-from-research | NIX-FLK-16 |

## C. Gate tools

| # | Verbatim string (key fragment) | Impl / version | Shape | Cause | First command | Fix | Status | Rule |
|---|---|---|---|---|---|---|---|---|
| 29 | `Warning: Bare invocation of nixfmt is deprecated. Use 'nixfmt -' for anonymous stdin.` then `unexpected end of input` | nixfmt 1.5.0 under CppNix 2.35.2, exit 1 with empty stdin. With a terminal on stdin it waits for input | A, D, E | Bare `pkgs.nixfmt` as `formatter`, so `nix fmt` passes no files | `nix fmt` | `formatter = pkgs.nixfmt-tree` | re-verified-2026-09-27 | NIX-GATE-01 |
| 30 | `error: nixfmt-classic has been removed as it is deprecated and unmaintained.` and `evaluation warning: nixfmt-rfc-style is now the same as pkgs.nixfmt…` | All three for `nixfmt-classic`. CppNix 2.35.2 for `nixfmt-rfc-style` | all | A dead formatter name | `nix eval .#formatter.x86_64-linux` | `nixfmt` or `nixfmt-tree` | re-verified-2026-09-27 (classic), carried-from-research (rfc-style) | NIX-GATE-03 |
| 31 | `error: cannot build '/nix/store/…-v.nix.drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled` | All three, identical, exit 1 | B, C, D | IFD with the option off. Deterministic whatever the store holds | `nix flake check --no-build --option allow-import-from-derivation false .` | Remove the IFD, or keep it only in an A flake with a comment naming the builder | re-verified-2026-09-27 | NIX-GATE-08 |
| 32 | `error: Cannot build '…drv'. Reason: platform mismatch Required system: 'aarch64-linux'` (exit 100) | CppNix 2.35.2 | all | Foreign-system IFD under `--all-systems` | `nix flake check --all-systems --no-build` | Remove the IFD or scope it per system | carried-from-research | NIX-GATE-09, NIX-GATE-08 |
| 33 | `error: attribute 'foo.b' cannot be merged, because one set is marked as recursive and the other isn't. Use --extra-deprecated-features rec-set-merges to disable this error…` | Lix 2.95.2 only, exit 1 for every attribute of the file. CppNix 2.35.2 and 2.31.5 exit 0 | all, hardest B, C, D | `foo = rec { … }; foo.b = …;` | `nix shell --inputs-from . nixpkgs#lix --command nix eval .#default` | Write the value once. Never add the deprecated-features flag | re-verified-2026-09-27 | NIX-LANG-05, NIX-GATE-16 |
| 34 | `error: nix_2_24 has been removed. use nix_2_31.` | All three, nixpkgs `8d5d2709` | all | A remembered floor version | The GATE-16 floor expression | Compute the floor from `nixVersions` at each pin | re-verified-2026-09-27 | NIX-GATE-16 |
| 35 | `Error: Invalid("no nixpkgs dependency found for specified key: nixpkgs")` or `Error: FlakeLock(Json(…Fallthrough node…))` | flake-checker 0.2.15, exit 1 | B, D | No root `nixpkgs` input, or an empty lock. A tool limit | See "Classify flake-checker" in the SKILL | Classify stderr. Never add a `nixpkgs` input for it | re-verified-2026-09-27 (Invalid), carried-from-research (FlakeLock) | NIX-GATE-11 |
| 36 | `warning: Git tree '…' is dirty` | All three | all | Staged or modified tracked files that are not committed | `nix flake metadata` | Expected on a working tree. In CI, commit before evaluating | re-verified-2026-09-27 | NIX-FLK-16 |

## D. Inputs and the lock

| # | Verbatim string (key fragment) | Impl / version | Shape | Cause | First command | Fix | Status | Rule |
|---|---|---|---|---|---|---|---|---|
| 37 | `error: follow cycle detected: [nixpkgs -> a/nixpkgs -> nixpkgs]` | CppNix 2.35.2 and 2.31.5, exit 1 | all | A self-referential `follows` chain | `nix flake metadata --no-write-lock-file .` | Break the cycle | re-verified-2026-09-27 | NIX-INP-08 |
| 38 | `error: stack overflow (possible infinite recursion)` | Lix 2.95.2, exit 1 | all | Same fault as row 37. Lix names no input | Same, on Lix | Same fix. Read `follows` lines, not the trace | re-verified-2026-09-27 | NIX-INP-08 |
| 39 | ``error: `nix flake lock --update-input a` has been replaced by `nix flake update a` `` | Lix 2.95.2 exit 1. CppNix 2.35.2 and 2.31.5 warn and exit 0 | all | Pre-2023 command | `nix flake lock --update-input a` | `nix flake update a` | re-verified-2026-09-27 | NIX-INP-07 |
| 40 | `error: access to absolute path '…' is forbidden in pure evaluation mode` | CppNix 2.35.2 and 2.31.5. Lix 2.95.2 prints `relative path '../sibling' points outside of its parent's store path` instead (C20) | all | A `path:` input outside the flake's git tree, or an absolute `path:` in a committed lock | `nix eval --no-write-lock-file .#default` | `--override-input` on the command line, never committed | re-verified-2026-09-27 | NIX-INP-04 |
| 41 | `error: unable to download 'http://127.0.0.1:9/grammar.tar.gz'` | All three (Lix appends `(curl error code=7)`). With no `sha256`, all three first fail `in pure evaluation mode, 'fetchurl' requires a 'sha256' argument` | all | An eval-time `builtins.fetchurl` or `fetchTree` reachable from an output | `nix eval --no-write-lock-file .#default` | Declare the source as an input, or fetch inside a derivation | re-verified-2026-09-27 | NIX-INP-10 |

## E. Packaging and builds

| # | Verbatim string (key fragment) | Impl / version | Shape | Cause | First command | Fix | Status | Rule |
|---|---|---|---|---|---|---|---|---|
| 42 | `error: hash mismatch in fixed-output derivation '…': specified: … got: …` | All three (layout differs, see C20) | all | A guessed, stale or drifted `hash` | `nix build --rebuild .#default.src` | Copy the `got:` value, or re-run `nurl` | re-verified-2026-09-27 | NIX-PKG-03, NIX-PKG-04 |
| 43 | ``does not configure a `format`. To build with setuptools as before, set `pyproject = true` and `build-system = [ setuptools ]` `` | nixpkgs 25.11 and later | A (Python) | `buildPythonPackage` without `pyproject` | `nix build --no-link -L .#default` | `pyproject = true` with the project's real backend | carried-from-research | NIX-PKG-18 |
| 44 | `Did not find version 0.1.0 in the output of the command …/bin/octool --version` | CppNix 2.35.2 | A | `versionCheckHook` found a version or entry-point mismatch | `nix build .#default` | Fix the version, or point `versionCheckProgramArg` at the real entry point | carried-from-research | NIX-PKG-13, NIX-PKG-19 |
| 45 | `Unused lambda argument: finalAttrs` | deadnix 1.3.2, exit 1 | A, D | `mkDerivation (finalAttrs: { … })` that never reads `finalAttrs` | `deadnix --fail --no-lambda-pattern-names .` | Use a plain attribute set, or read `finalAttrs` | re-verified-2026-09-27 | NIX-PKG-14 |
| 46 | `error: Path 'external/dep' in the repository … is not tracked by Git` or (Lix) `experimental Lix feature 'flake-self-attrs' is disabled` | CppNix 2.35.2 / Lix 2.95.2 | A | Submodule content needed but `inputs.self.submodules` unset, or the Lix feature off | `nix build .#default` | `inputs.self.submodules = true`. On Lix add `--extra-experimental-features flake-self-attrs` | carried-from-research | NIX-INP-09, NIX-GATE-16 |

## Generated flakes

A generated flake (D) that fetches prebuilt OCI layers has its own failure
family: `curl: (22) The requested URL returned error: 401` (no anonymous
bearer header, NIX-GEN-08), a bare 404 on a manifest GET (no OCI `Accept`
header, NIX-GEN-05), a 404 for a corrupted layer digest (NIX-GEN-09), and
auto-patchelf's missing-library error (NIX-GEN-11, NIX-GEN-19). Those rows live
with the rules in the `nix-quality` rule's generated-flakes depth file. Two of
them are misattributions and appear below.

## Misattributed diagnostics

Class C7. The error names a symptom far from its cause, and the nearest
expression gets the blame. The guard is the same every time: remove the
suspected clause, keep everything else, re-run, and watch whether the error
persists.

| Symptom | Wrongly blamed | Actual cause | The discriminating run | Rule |
|---|---|---|---|---|
| `error: path '…-source' is not valid` near `default = self.packages.${system}.x` | The `self.packages` alias | An eval-time read through the flake's own source store path elsewhere in the flake | Remove the alias, keep the read: still red. The grep in the SKILL's step 4 finds the read | NIX-FLK-07 |
| `error: cannot coerce an integer to a string: 42` (all three, re-verified-2026-09-27) | A coercion bug in module code | A module list holds a non-module value (`nixosModules.default = 42`). No message says "not a module", and `nix flake check` alone passes it | Evaluate the module list alone in `lib.evalModules` | NIX-FLK-06 |
| A bare 404 on an OCI manifest GET | A missing or renamed package | The request lacks `Accept: application/vnd.oci.image.manifest.v1+json` | Repeat the GET with the header | NIX-GEN-05 |
| A 404 on a layer blob after a digest edit | A server outage, or an expected hash mismatch that never came | The URL carries the digest, so a wrong digest is a 404. A mismatch appears only when a second stored hash copy drifts | Compare the URL's digest with the index | NIX-GEN-09 |
| `Did not find version … in the output of the command …/bin/ocx --version` after a full compile | A CLI bug, answered with `doInstallCheck = false` | The CLI reports its version through a subcommand (`ocx version`), not `--version` | Run the binary's `--help` and look for the real entry point | NIX-PKG-19 |
| `nix flake check` silent for 300 s (nix-installer) | A hang | Progressing module evaluation with no output at default verbosity | Re-run with `-v` and timestamps (the SKILL's watchdog block). A moving stream is not a hang | NIX-INP-13 |
| `warning: 'system' has been renamed…` on every system | The `import nixpkgs { system = …; }` argument | A downstream read of `pkgs.system` | Replace the read and count the warnings again | NIX-FLK-12 |
| `nix flake show --all-systems` taking minutes (helix) | Many flake inputs | Eval-time `builtins.fetchTree` calls reachable from `packages` | `nix flake check --no-build` with no network must download nothing | NIX-INP-10 |
| `error: infinite recursion encountered` | One cause with one fix | Five classes with incompatible fixes | Classify by the innermost frame first | NIX-LANG-10 |
| `error: stack overflow (possible infinite recursion)` on Lix during locking | A Nix crash | A `follows` cycle (row 38) | Run the same lock on CppNix, which names the cycle | NIX-INP-08 |
