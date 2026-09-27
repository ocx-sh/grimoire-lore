---
title: Flake Structure and Outputs
summary: The NIX-FLK family, owning the flake.nix output contract, system iteration, the nixpkgs instance, one package.nix per derivation, nix run proof, git-tracked sources, exposed outputs and devShells
---

# Flake Structure and Outputs

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns what `flake.nix` exports and how: the output contract `nix flake check`
enforces, the system list, the one nixpkgs instance per system, one
`package.nix` per derivation shared by `packages` and `overlays.default`,
proving `nix run`, tracking files before evaluation, the outputs a shape
exposes and the devShell. Inputs, `follows` and the lock are `NIX-INP`. The
body of `package.nix`, its builders, `meta` and the version entry point are
`NIX-PKG`. The gate block, the formatter package and the `--all-systems`
triage are `NIX-GATE` and the index. The attribute shape of a generated flake
(shape D) is `NIX-GEN`. Deprecation shims and install blocks are `NIX-REL`.
The check that evaluates a module is `NIX-MOD`. Evaluating a flake you do not
own is `NIX-SEC`.

Contents: [Dates and Floors](#dates-and-floors) · [The Output Contract](#the-output-contract) ·
[The Cold Store](#the-cold-store) · [The Systems List](#the-systems-list) ·
[The nixpkgs Instance](#the-nixpkgs-instance) · [One Source of Truth](#one-source-of-truth) ·
[Proving nix run](#proving-nix-run) · [Before Evaluation](#before-evaluation) ·
[What a Flake Exposes](#what-a-flake-exposes) · [Verified Skeletons](#verified-skeletons) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here) · [Applied Evidence](#applied-evidence-corpus-sweep-2026-09-27)

## Dates and Floors

Shapes: A app, B library, C module, D generated, E template (NIX-CORE-05).
"Gate step 4" is the index's `nix flake check --no-build --option allow-import-from-derivation false`,
run from the checkout. Add `--no-write-lock-file` only for a flake you do not own (NIX-SEC-05).

- **CppNix 2.31.5 and 2.35.2** agree on every output-contract row: same exit codes, same strings.
- **Lix 2.95.2** exits 0 on a string `formatter`, on `self: super:` and `prev: final:` overlays, and on unknown `apps` keys. It checks overlay arity only (re-check at each Lix release). NIX-FLK-19 carries the consequence.
- **nixpkgs 26.11** (and unstable since the 26.11 branch-off) throws on any evaluated `x86_64-darwin` attribute. `nixos-26.05` is the last branch that supports it, until its end of life at the end of 2026 (re-check then).
- **`pkgs.system`** is a `warnAlias` in nixpkgs since 2025-10-28 (25.11 line).
- **`schemas`** is read only by Determinate Nix 3.17.0 or later. Determinate was not run. CppNix and Lix only warn.
- **`nix develop -i`** (`--ignore-env`) exists on 2.31.5 and 2.35.2.
- **Pinned default:** CppNix is the gated implementation, Lix is an advisory leg, Determinate Nix is untested and never deliberately broken. An adopter overrides this once.
- **Pinned default:** systems `x86_64-linux aarch64-linux aarch64-darwin` on `nixos-unstable`, A and D flakes export `overlays.default`, the devShell is plain `mkShell` plus nix-direnv (an owner default with no comparative run). An adopter overrides each once.

Every grep here except the FLK-07 candidate grep (read each hit), the FLK-09
grep (read with its jq line), the FLK-11 site count and the FLK-04 and FLK-12
counts (`0` is the pass) is a violation locator: empty output (exit 1) is the
pass, a hit (exit 0) is the finding. Every command was watched red on a planted violation
and green on its twin on CppNix 2.35.2 with a warm store, unless its cell says
reading heuristic.

## The Output Contract

```sh
nix flake check --no-build --option allow-import-from-derivation false .   # gate step 4, exit 0 = pass, exit 1 = contract error
nix flake check --no-build . 2>&1 | grep -c 'is deprecated; use'           # FLK-04, prints 0 (grep exit 1) = pass
nix flake check --no-build . 2>&1 | grep "unknown flake output 'schemas'"   # FLK-05, empty = pass
grep -rnE --include='*.nix' -e 'overlays?(\.[A-Za-z_-]+)? *= *self *:' -e 'overlays?(\.[A-Za-z_-]+)? *= *prev *:' -e 'overlays?(\.[A-Za-z_-]+)? *= *[{][^}=]*[}] *:' .   # FLK-02 pre-check, empty = pass
nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --option allow-import-from-derivation false .   # FLK-19 on a Lix host, exit 0 = pass, nix_2_31 replaced by gate step 9 floor element
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-01 | Make every value under `packages.<system>.<name>`, `checks.<system>.<name>`, `devShells.<system>.<name>` and `formatter.<system>` a derivation. `formatter` counts even though the manual's list omits it. Which formatter package is NIX-GATE-01's. | A non-derivation is a hard failure, `error: flake attribute 'formatter.x86_64-linux' is not a derivation` (CppNix `src/nix/flake.cc`). | Gate step 4. Exit 1 with `is not a derivation` is the finding, exit 0 the pass. Watched red on `packages…default = 42`, `checks…default = true` and `formatter… = "nixfmt"`. | MUST, every shape | CppNix ≥2.31.5. Lix 2.95.2 leaves the `formatter` clause unchecked (NIX-FLK-19) |
| NIX-FLK-02 | Write every exported overlay as a curried two-argument lambda with no formals whose first argument is named `final`, or `_final` or `_` when it is unused: `final: prev: { … }`. Never `self: super:`, `prev: final:` or `{ final, prev }:`. Name the second argument `prev`, or `_prev` or `_` when it is unused (deadnix `--no-lambda-pattern-names`, NIX-GATE-05); CppNix does not check the second name. | `checkOverlay` accepts a first argument named `final`, `_final` or `_` and rejects any other name and any formals with `error: overlay does not take an argument named 'final'`. It never checks the second argument (`final: super:` exits 0). The `self: super:` spelling comes from pre-flake nixpkgs. Switching to formals to silence deadnix trades one red for another. | Gate step 4, exit 1 is the finding. The FLK-02 grep above is the implementation-independent pre-check, empty output is the pass. It ignores the `overlays = { default = …; }` attrset form, which a single-pattern grep false-hits. Watched red on all three spellings, green on `final: _prev:` and on the attrset form. Watched 2026-09-27 on CppNix 2.35.2 and 2.31.5: exit 0 for `final: prev:`, `final: _prev:`, `_final: prev:`, `_final: _prev:`, `final: _:`, `_: prev:`, `final: super:`, exit 1 for `self: super:`, `prev: final:`, `{ final, prev }:`, `f: p:`, `_foo: prev:`, `finalx: prev:`. CppNix also passes a one-argument `final: { … }` and a three-argument overlay, which Lix 2.95.2 rejects, so review holds the second name and the Lix leg holds the arity. | MUST, every shape that exports an overlay (A, B, D, E) | CppNix ≥2.31.5 checks the first argument name only. Lix 2.95.2 checks arity only: it rejects formals, a one-argument and a three-argument overlay and passes every name, so the grep and NIX-FLK-19 carry the names there |
| NIX-FLK-03 | In `apps.<system>.<name>` use only `type`, `program` and `meta`, and give it `meta.description`. In `templates.<name>` use only `path`, `description` and optionally `welcomeText`. | Unknown keys and a missing template `description` are hard errors: `app '…' has unsupported attribute 'name'`, `template '…' lacks attribute 'description'`. A missing app `meta` only warns. | Gate step 4, exit 1 is the finding. Watched red on an extra app key, a template without `description` and an extra template key. | MUST, A and E (any flake exporting `apps` or `templates`) | CppNix 2.31.5 and 2.35.2. Lix 2.95.2 accepts unknown `apps` keys (NIX-FLK-19) |
| NIX-FLK-04 | Emit only plural output names in outputs written or edited in the change: `packages.<system>.default`, `apps.<system>.default`, `devShells.<system>.default`, `overlays.default`, `nixosModules.default`, `templates.default`, `bundlers.<system>.default`. Never emit `defaultPackage`, `defaultApp`, `devShell`, `overlay`, `nixosModule`, `defaultTemplate` or `defaultBundler`. Renaming an existing singular output keeps it one cycle behind a `builtins.warn` shim, whose release policy is `NIX-REL`'s. | Every consumer's check prints `flake output attribute '…' is deprecated; use '…' instead`. Agents trained on 2020-21 examples, including the official "full" template, emit the singular forms. | The FLK-04 count above. `0` (grep exit 1) is the pass, any other number the finding. Watched: `defaultPackage` printed 1, the twin 0. | MUST for written or edited outputs, SHOULD when migrating, every shape | CppNix ≥2.31.5, Lix 2.95.2. The singular outputs still work |
| NIX-FLK-05 | Never add a `schemas` output, and never delete a community output (`flakeModule`, `homeModules`, `lib`) to silence `unknown flake output '…'`. | Unknown top-level names only warn and never change the exit code. CppNix has no `schemas` handling. | The FLK-05 grep above, empty output is the pass. Read the exit code before editing: an `unknown flake output` warning with exit 0 is not a defect. | SHOULD, every shape | CppNix ≥2.31.5, Lix 2.95.2. Determinate ≥3.17.0 reads `schemas` (not run) |
| NIX-FLK-06 | Never treat a green `nix flake check` as evidence that a `nixosModules`, `homeModules` or `darwinModules` output works. The module-evaluating check is NIX-MOD-04's. | `checkModule` only forces the value, so `nixosModules.default = 42;` passes. | Reading heuristic: a flake exporting a module with no module-evaluating `checks` entry (NIX-MOD-04) is the finding. Watched not catching: `nixosModules.default = 42` exits 0 on all three implementations. | SHOULD, C (any flake exporting a module) | CppNix 2.31.5 and 2.35.2, Lix 2.95.2 |
| NIX-FLK-19 | Count gate step 4 as passed only when it ran on CppNix ≥2.31.5. On a host whose `nix --version` prints `Lix`, rerun it through the FLK-19 line above before reporting the output contract green. The Lix leg (NIX-GATE-16) stays advisory and never replaces the CppNix step. | Lix 2.95.2 exits 0 on a string `formatter`, on `self: super:` and `prev: final:` overlays and on unknown `apps` keys that CppNix hard-fails. A Lix-host author ships a flake that fails every CppNix and Determinate consumer's check. | `nix --version` names the implementation. The FLK-19 line, exit 0 is the pass. Watched: `self: super:` exits 0 on Lix 2.95.2 and 1 on CppNix 2.31.5, the `final: _prev:` twin exits 0 on both. | MUST, every shape | Lix 2.95.2 diverges (re-check at each Lix release) |

```nix
{
  # wrong: CppNix rejects it, Lix 2.95.2 accepts it
  overlays.default = self: super: { octool = self.callPackage ./package.nix { }; };
}
```

```nix
{
  # right: `final` first, unused `_prev` keeps deadnix green
  overlays.default = final: _prev: { octool = final.callPackage ./package.nix { }; };
}
```

## The Cold Store

```sh
grep -rn --include='*.nix' -e '"${[A-Za-z_.]*src}/' -e '"${builtins.path' .   # FLK-07 pre-check, empty = pass, read each hit
```

The authoritative check is gate step 4 on a fresh CI runner, whose store has
never copied the flake's source. A warm laptop hides the failure.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-07 | Never read a file at evaluation time through the store path of the flake's own filtered or copied source, such as `cargoLock.lockFile = "${src}/Cargo.lock"`, `importTOML "${src}/Cargo.toml"` or `readFile "${builtins.path { path = self; }}/x"`, or `readFile "${./sub}/x"` on a path literal. Read the source-tree path (`./Cargo.lock`, `./Cargo.toml`). A builder that derives such reads from `src` itself gets its manifest paths passed explicitly, and the builder spellings are NIX-PKG-15's. | On a store that has not copied that source, `--no-build` dies with `error: path '/nix/store/…-source' is not valid`. It goes green once any `nix build` copied the source. This is an author defect with a known fix, not a checker limit, and agents wrongly blame the `default = self.packages…` alias. | (a) Gate step 4 on a fresh runner, exit 1 with `is not valid` is the finding. (b) The grep above locates candidates, and empty output is the pass. A hit is the finding when the string reaches `readFile`, `import`, `importTOML`, `lockFile` or another eval-time read. A string that only reaches a builder is NIX-LANG-02's and passes. A hit whose src is self itself evaluates green. The grep misses reads hidden inside a builder, so (a) is authoritative. Watched red locally on a cold store and by `tarball+file://`, green on the source-tree twin. | MUST, every shape | CppNix 2.31.5 and 2.35.2 (not the 2.35 lazy-copy mechanism). Lix 2.95.2 words it `… did not exist in the store during evaluation` |

```nix
{
  # wrong: red with "path '/nix/store/…-source' is not valid" on a cold store
  cargoLock.lockFile = "${src}/Cargo.lock";
  version = (lib.importTOML "${src}/Cargo.toml").package.version;
}
```

```nix
{
  # right: evaluation reads the source tree, the builder still gets `src`
  cargoLock.lockFile = ./Cargo.lock;
  version = (lib.importTOML ./Cargo.toml).package.version;
}
```

## The Systems List

```sh
nix flake check --no-build --all-systems .   # gate step 5, exit 0 = pass
grep -rnE --include='*.nix' -e 'flake-utils' -e 'flakeExposed' -e 'systems\.doubles' -e 'nix-systems/default"' .   # FLK-08, empty = pass
grep -rn --include='*.nix' -e 'x86_64-darwin' .   # FLK-09, read with the next line
jq -r '.nodes[.nodes.root.inputs.nixpkgs // "nixpkgs"] as $n | if $n then $n.original | .ref // .url // .rev // "no ref: the default branch" else "no nixpkgs node" end' flake.lock   # FLK-09, the nixpkgs branch (a channel URL names it)
nix flake metadata --json . | jq '.locks.nodes|length'   # FLK-10, lock node count
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-08 | Iterate systems with `nixpkgs.lib.genAttrs` over a literal list of the systems CI evaluates. Never add flake-utils, never iterate `lib.systems.flakeExposed` or `lib.systems.doubles.*`, and never use `nix-systems/default` unless it is overridden to a list without `x86_64-darwin`. **Pinned default:** `x86_64-linux aarch64-linux aarch64-darwin`. Migrating an existing flake-utils use is SHOULD. | flake-utils and `nix-systems/default` still carry `x86_64-darwin`, and `flakeExposed` adds `x86_64-freebsd`, `armv6l-linux` and more, so the flake exports systems nobody tests. flake-utils has had no commit since 2024-11-13. | Gate step 5, exit 1 is the finding. The FLK-08 grep, empty output is the pass. Watched red: `eachDefaultSystem` and a `nix-systems` input exit 1 with `Nixpkgs 26.11 has dropped support for x86_64-darwin.` Green: `genAttrs` and flake-parts `perSystem` with a literal list. `nix-systems/default/future-26.11` and `default-linux` carry no `x86_64-darwin` and pass; a local helper named `eachDefaultSystem` over a literal list passes. | MUST, A, D and E (B has no system iteration) | nixpkgs ≥26.11 makes the hidden lists fatal |
| NIX-FLK-09 | Never declare `x86_64-darwin` in a flake whose nixpkgs is 26.11 or unstable. A flake pinned to `nixos-26.05` may keep it until that branch's end of life and drops it in the change that moves the pin. | nixpkgs throws the moment any `x86_64-darwin` attribute is evaluated. | Gate step 5, exit 1 is the finding. The FLK-09 grep is read with the jq line, which follows the root's `nixpkgs` input even when the lock names that node `nixpkgs_2` (exit 5 `Cannot index object with array` means the root input follows another, whose node is read instead): a hit with an unstable or 26.11 ref is the finding. Watched red: a `formatter.x86_64-darwin` against `8d5d2709` exits 1, the twin 0, and `nixos-26.05` exits 0 with its last-release warning. A hit that removes the system (`lib.remove "x86_64-darwin"`) passes. | MUST, A, D and E | nixpkgs 26.11 (re-check at `nixos-26.05` end of life) |
| NIX-FLK-10 | Adopt flake-parts only when the flake imports flake-parts modules (treefmt-nix, git-hooks.nix) or exports a `flakeModule`. Never adopt it to iterate systems. | Every consumer pays 2 extra lock nodes (4 against 2), and the module system hides outputs from static review. Eval cost is not the reason: 0.17 s against 0.06 s CPU on 2.35.2. | Reading heuristic: a `mkFlake` call with no `imports` of a flake-parts module is the finding. The FLK-10 count prints the lock nodes: 2 for `genAttrs`, 4 for flake-parts, measured on 2.35.2. | SHOULD, every shape | CppNix 2.35.2 |

The right form is the `forAllSystems` binding in the shape A skeleton below.

## The nixpkgs Instance

```sh
grep -rn --include='*.nix' -e 'import nixpkgs' -e 'import inputs.nixpkgs' .   # FLK-11, at most one site
grep -rnE --include='*.nix' -e '^pkgs\.system[^[:alnum:]_-]' -e '^pkgs\.system$' -e '[^[:alnum:]_.-]pkgs\.system[^[:alnum:]_-]' -e '[^[:alnum:]_.-]pkgs\.system$' .   # FLK-12 pre-check, empty = pass
nix flake check --no-build --all-systems . 2>&1 | grep -c "has been renamed to/replaced by 'stdenv.hostPlatform.system'"   # FLK-12, prints 0 = pass
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-11 | Read packages from `nixpkgs.legacyPackages.${system}`. Create a configured instance (`config.allowUnfree`, an overlay the flake itself needs) at most once per system, in one named binding such as `pkgsFor`, never inside an output body, and never only to apply the flake's own overlay (NIX-FLK-13). | Each instance multiplies evaluation work, and per-output imports produce no warning and no error, so nothing flags them. | The FLK-11 grep. More than one site, or a site outside the named binding, is the finding. Watched: 3 sites on a per-output import, 0 on `legacyPackages`. | SHOULD, A, D and E | nixpkgs 26.11pre |
| NIX-FLK-12 | Never read `pkgs.system`, `legacyPackages.${system}.system` or `.system` on any package set, including `self.packages.${pkgs.system}` inside a module. Use `pkgs.stdenv.hostPlatform.system`. The `import nixpkgs` argument spelling (`system`, `localSystem`) is not a lint target. | The alias prints `'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` on every evaluation, once per system, into every consumer's log. Agents blame the `import` argument and rename it, which changes nothing. | The FLK-12 count, `0` (grep exit 1) is the pass. Watched: 3 warnings on a `pkgs.system` read, 0 on the twin. The grep is the pre-check over every directory, empty output is the pass. It skips `pkgs.systemd` and the `nixpkgs.system` module option. A hit escaped as `''${pkgs.system}` inside an indented string is option text and passes. Watched red on `${pkgs.system}` and a bare `pkgs.system` argument, green on `stdenv.hostPlatform.system` and `pkgs.systemd`. | MUST, every shape | nixpkgs ≥25.11 (warning since 2025-10-28) |

## One Source of Truth

```sh
nix eval --raw .#packages.x86_64-linux.octool.drvPath
nix eval --impure --raw --expr 'let f = builtins.getFlake (toString ./.); in (f.inputs.nixpkgs.legacyPackages.x86_64-linux.extend f.overlays.default).octool.drvPath'
grep -rn --include='flake.nix' -e 'mkDerivation' -e 'buildRustPackage' -e 'buildPythonApplication' -e 'buildGoModule' -e 'craneLib.buildPackage' .   # FLK-14, empty = pass
```

Substitute your attribute for `octool` in both `nix eval` lines. The two
printed store paths must be identical. The stronger form needs no `--impure`:
a second consumer flake applies `overlays.default` to its own nixpkgs, and its
attribute's `drvPath` equals the producer's `packages` one. A consumer in a
separate repository takes the producer by an absolute `path:` or
`--override-input`.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-13 | Put each derivation in a `callPackage`-able `package.nix`. `packages.<system>.<name>` is `legacyPackages.${system}.callPackage ./package.nix { }`. An A or D flake whose package should join a consumer's set also exports `overlays.default = final: _prev: { name = final.callPackage ./package.nix { }; }` (**pinned default:** A and D export it). Never write a second derivation body, and never add a second `import nixpkgs` to reach the flake's own overlay. D satisfies this through one shared builder called per data entry, on the attribute path NIX-GEN-07 names. | Two bodies drift. `packages` is what `nix run`, `nix build` and `nix profile add` resolve, while the overlay builds against the consumer's nixpkgs. Direct `callPackage` and `.extend` give one drvPath, and `.extend` costs a second fixpoint for nothing. | The two `nix eval` lines, whose outputs must match. Different store paths are the finding, and a non-zero exit from either line means the attribute is missing. Watched: equal on a shared `package.nix`, different on a second body in `packages`. | MUST, A and D | CppNix 2.35.2 |
| NIX-FLK-14 | Keep `flake.nix` a thin entry point with no `mkDerivation`, `buildRustPackage`, `buildPythonApplication`, `buildGoModule` or `craneLib.buildPackage` body. The body lives in `package.nix` (NIX-PKG-06). | Packaging inside `flake.nix` cannot be `callPackage`d, overlaid or copied into nixpkgs by-name. | The FLK-14 grep over every `flake.nix` in the tree, empty output is the pass. Watched red on a `stdenv.mkDerivation` in `flake.nix`, green on the `callPackage` twin. | SHOULD, A, D and E | none |

## Proving nix run

```sh
nix run .#default -- --version                                    # FLK-15, exit 0 = pass, repeat per package and apps entry
nix eval --raw .#packages.x86_64-linux.default.meta.mainProgram   # FLK-15 static half (A), exit 0 = pass
```

Substitute each package and `apps` entry for `default`, and the version entry
point NIX-PKG-19 names for `-- --version` (ocx takes `-- version`).

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-15 | Give every runnable package a hardcoded `meta.mainProgram`, never derived from `pname`, and prove it in CI with `nix run` on the version entry point NIX-PKG-19 names. Add an `apps` output only for a secondary entry point or a program that is not the package's main binary, and smoke-run every `apps` entry the same way. Exception: a prebuilt package with several peer binaries and no main one omits `meta.mainProgram` (NIX-GEN-13), and `nix run` of it is not promised. cmake, with five peer binaries, is the case. | `nix run` resolves `apps` first, then `meta.mainProgram`, then `pname`, then the name part of `name`, and never checks that the file exists. `nix flake check` is green on a working and a broken flake alike. nixpkgs forbids deriving `mainProgram`. | The `nix run` line exits 0 for every package and `apps` entry. Exit 1 with `unable to execute '…/bin/…': No such file or directory` is the finding. The static half exits 0 when `mainProgram` is set. Watched red on a package whose binary name differs from its `pname` with no `mainProgram`, while gate step 4 exited 0 on it. Watched green on the hardcoded twin. | MUST, A (D follows NIX-GEN-13) | CppNix 2.35.2 |

## Before Evaluation

```sh
git ls-files --others --exclude-standard .   # FLK-16, empty = pass
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-16 | `git add` every new file a git-backed flake reads before any `nix eval`, `nix build` or `nix flake check`, including `package.nix`, patches and `flake.lock`. | Untracked and ignored files are absent from the source Nix reads. No error names them, and the failure surfaces wherever the file is read, so the agent chases a phantom build error. | The line above, empty output is the pass, any listed path is the finding. Modified tracked files are seen, with a "dirty" warning, so `git status` is the wrong check. Watched red: an untracked file listed and `nix build` failing with `No such file or directory`, green on the tracked twin. | MUST, every shape | every flake-capable version |

## What a Flake Exposes

```sh
nix flake show --json --no-write-lock-file . > show.json   # must exit 0 before the jq lines mean anything
jq -e '.formatter."x86_64-linux"' show.json                # FLK-17, exit 0 = present
jq -e '.checks."x86_64-linux"' show.json                   # FLK-17, exit 0 = present
jq -r 'keys' show.json                                      # output census
nix develop -i --no-write-lock-file . --command bash -c 'command -v pkg-config'   # FLK-18, exit 0 per promised tool
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-FLK-17 | Expose `formatter.<system>` (a derivation, the package is NIX-GATE-01's) and `checks.<system>` entries that build the flake's packages. Review a flake's outputs with `nix flake show --json`, never by grepping `flake.nix`. | Most flakes expose no formatter. flake-parts and directory-loader flakes declare zero outputs in `flake.nix`, so a grep reports a missing formatter that exists. A folder-listing loader defeats even a recursive grep. | The `show` line must exit 0 first, then each `jq -e` line exits 0 for present and 1 for missing. Run them split: in a pipe, a flake that fails to evaluate turns `jq -e` red with exit 4 and masks which output is missing. Watched: exit 0 on a full flake, 1 on a packages-only flake. | SHOULD, A, D and E | none |
| NIX-FLK-18 | Write `devShells.<system>.default` as `pkgs.mkShell { inputsFrom = [ pkg ]; packages = [ … ]; }` with `packages`, not `buildInputs`, for the tool list. Add the package itself to `packages` if contributors run it in the shell, because `inputsFrom` never puts it on `PATH`. Prove a devShell claim with `nix develop -i`, and prove `inputsFrom` with a tool beyond stdenv's defaults, never with `cc` or `gcc`. | `inputsFrom` forwards the listed derivation's build inputs, never the derivation. `mkShell` is `stdenv.mkDerivation`, so even `mkShell { }` carries a C toolchain. `nix develop` without `-i` appends the host `PATH`, so a host tool fakes a pass. | The `nix develop -i` line, once per promised tool (substitute each for `pkg-config`), exit 0 is the pass and exit 1 the finding. `buildInputs` in `mkShell` is a reading heuristic. Watched red: `mkShell { }` exits 1 for `pkg-config` with `-i` and 0 without it (host `/usr/bin/pkg-config`), and `inputsFrom = [ hello ]` exits 1 for `hello`. Watched green: a package with `pkg-config` in `nativeBuildInputs` forwarded through `inputsFrom`. | SHOULD, A (any flake with a devShell) | CppNix 2.31.5 and 2.35.2 (`-i` flag) |

## Verified Skeletons

Shape A, the minimal portable app flake. With nixpkgs at `8d5d2709` it passes
gate step 4, `--all-systems`, `nixfmt --check`, `deadnix --fail
--no-lambda-pattern-names`, `statix check` and `nix run`, the overlay drvPath
equals the package drvPath, and the lock holds 2 nodes. A project template
built on it adds its own inputs (flake-compat per NIX-REL-05,
`inputs.self.submodules` per NIX-INP-09) and is re-verified as composed.

```nix
{
  description = "octool: one-line summary";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      overlays.default = final: _prev: { octool = final.callPackage ./package.nix { }; };
      packages = forAllSystems (pkgs: {
        octool = pkgs.callPackage ./package.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.octool;
      });
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          inputsFrom = [ self.packages.${pkgs.stdenv.hostPlatform.system}.octool ];
          packages = [ pkgs.nixfmt ];
        };
      });
      checks = forAllSystems (pkgs: {
        inherit (self.packages.${pkgs.stdenv.hostPlatform.system}) octool;
      });
      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
```

Shape B, a library: zero inputs, functions take the caller's `pkgs`. It passes
gate step 4, nixfmt and deadnix. Whether it keeps a checks-only nixpkgs is
`NIX-INP`'s. Shape C is `NIX-MOD`'s, shape D is shape A plus `NIX-GEN`'s data
reader, and shape E's template directory must itself pass every row here,
because it is copied verbatim.

```nix
{
  description = "octool-lib: helpers that build against the caller's nixpkgs";

  outputs = _: {
    lib.mkOctool = pkgs: pkgs.callPackage ./package.nix { };
    overlays.default = final: _prev: { octool = final.callPackage ./package.nix { }; };
  };
}
```

## What Agents Get Wrong Here

Ranked by how common the idiom is in training-era material, times how silently it fails.

1. **`flake-utils.lib.eachDefaultSystem` or `flakeExposed` boilerplate**, bringing a hidden `x86_64-darwin` that nixpkgs 26.11 rejects (NIX-FLK-08, NIX-FLK-09).
2. **Overlays written `self: super:` or `{ final, prev }:`**, or "fixing" deadnix's unused `prev` with formals (NIX-FLK-02).
3. **`cargoLock.lockFile = "${src}/Cargo.lock"`**, green on a warm laptop and red on CI, then blamed on the `default = self.packages…` alias (NIX-FLK-07).
4. **Using a file before `git add`**, then chasing a phantom build error (NIX-FLK-16).
5. **Treating `nix flake check` as proof that `nix run` works**, with no `mainProgram` and a binary name that differs from `pname` (NIX-FLK-15).
6. **Legacy singular outputs** (`defaultPackage`, `devShell`, `overlay`) copied from 2020-21 examples (NIX-FLK-04).
7. **Reading `pkgs.system`**, then renaming the `import nixpkgs` argument as the false fix (NIX-FLK-12).
8. **`import nixpkgs { inherit system; }` inside every output body**, which nothing flags (NIX-FLK-11).
9. **Expecting `inputsFrom = [ pkg ]` to put `pkg` on `PATH`**, and "proving" a devShell without `-i` or with `cc` (NIX-FLK-18).
10. **Deleting a legitimate output to silence `unknown flake output`**, or adding `schemas` (NIX-FLK-05).
11. **Auditing a flake-parts flake by reading `flake.nix`** and reporting a missing formatter or checks (NIX-FLK-17).
12. **Writing the derivation twice**, once in `packages` and once in the overlay (NIX-FLK-13).
13. **Trusting a Lix `nix flake check` green** on an overlay or `formatter` that CppNix rejects (NIX-FLK-19).
14. **Crediting a red to the property under test when the fixture itself is broken.** Read the first error line and confirm the twin evaluates (`nix flake show` exit 0) before reading `jq -e`'s code (NIX-FLK-17, NIX-CORE-02).

## Applied Evidence (corpus sweep 2026-09-27)

- hercules-ci/flake-parts violates NIX-FLK-07 in `extras/partitions.nix`: it reads the `dev` partition through flake-compat on the `./dev` path literal. Gate step 4 on a cold store is red with `path '/nix/store/…-dev' is not valid`, and the FLK-07 grep is silent, which is why (a) is authoritative.
- sxyazi/yazi violates NIX-FLK-07 in `nix/yazi-unwrapped.nix:32`: `cargoLock.lockFile = "${src}/Cargo.lock"`. Gate step 4 on a cold store is red with `path '/nix/store/…-source' is not valid`, and the FLK-07 grep hits.
- ipetkov/crane violates NIX-FLK-07 in `checks/vendorGitSubset.nix:12`: `builtins.readFile "${src}/Cargo.lock"` with `src = ./git-overlapping`. The FLK-07 grep hits, and a path-literal twin is red on a cold store.
