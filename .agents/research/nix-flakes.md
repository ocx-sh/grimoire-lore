---
title: "Flake structure and outputs — consolidated ruleset (NIX-FLK)"
topic: nix-flakes
model: opus
id_family: NIX-FLK
consolidates:
  - nix-flakes/systems-and-instantiation.md
  - nix-flakes/outputs-contract.md
  - nix-flakes/verification-rerun-w2.md (all findings; two of its verifications corrected by re-run, see Revision log)
  - nix-audit/exemplar-flake-shape.md (§1, §3, §4, §5, §7, §8, Smells, Contradictions)
  - nix-audit/exemplar-tool-runs.md (Headline, Axis 2, Axis 3, Axis 5, Smells, Patterns)
  - nix-audit/ocx-index-and-fleet.md (§4)
  - nix-topic-map.md (section A rows M-A-01..18, M-B-03, M-J-05; conflicts 1, 2, 3, 4, 14, 18, 19; wave-2 harvest E1, E6, E7, E8, S5, S7, S8, S10, S12)
date: 2026-09-27
revised: 2026-09-27
era: "CppNix 2.35.2 and 2.31.5 (nixVersions.nix_2_31, the consumer floor), Lix 2.95.2 (tag 2.95.2, 609bc41e) where stated, nixpkgs 26.11pre rev 8d5d2709 (and nixos-26.05 rev 5e2305d5 where stated), nixfmt 1.5.0, deadnix 1.3.2, statix (toolchain pin)"
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-flakes/ and /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w2/
---

# Flake structure and outputs (NIX-FLK)

## Verdict

1. **Every flake shape starts from `nixpkgs.lib.genAttrs` over a literal system list mapped to `nixpkgs.legacyPackages.${system}`**: `x86_64-linux`, `aarch64-linux`, `aarch64-darwin`. The list never contains `x86_64-darwin` against nixpkgs ≥26.11. flake-utils is never added. `lib.systems.flakeExposed` and the unmodified `nix-systems/default` list are never used, because both hidden lists still contain the dropped system. This binds shapes A, D and E. B flakes have no system iteration.
2. **flake-parts is accepted only when a flake composes flake-parts modules (treefmt-nix, git-hooks.nix) or exports a `flakeModule`.** The fleet's app flakes (ocx, grim, ocx-sdk-python) do not use it.
3. **The output contract is what CppNix's `nix flake check` enforces, identically on 2.31.5 (the floor) and 2.35.2 — all 18 battery rows, same exit codes, same strings.** These are hard errors on CppNix: non-derivations under `packages`, `checks`, `devShells` or `formatter`; overlays that are not curried `final: …`; unknown keys in `apps` or `templates`. The seven legacy singular outputs and unknown outputs produce only warnings. `nixosModules` is not checked at all. **Documented gap: Lix 2.95.2 does not enforce two of these hard errors** — a string `formatter` and a `self: super:` or `prev: final:` overlay exit 0 on Lix, which checks overlay arity only. A Lix green is therefore not evidence for NIX-FLK-01's formatter clause or NIX-FLK-02 (NIX-FLK-19).
4. **Put one derivation in one callPackage-able `package.nix`.** `packages.<system>.<name>` is the export of record. An A or D flake also exports `overlays.default = final: _prev: { name = final.callPackage ./package.nix { }; }`. Measured: the overlay and the package produce the same `drvPath`, both self-referentially and through a genuine second consumer flake.
5. **The `error: path '…-source' is not valid` failure of `--no-build` is caused by an eval-time read through the store path of the flake's own source. The `default = self.packages…` alias is not the cause.** Examples of such a read: `"${src}/Cargo.lock"`, or `"${builtins.path { path = self; }}/…"`. The failure reproduces locally on a cold store on 2.35.2 and on 2.31.5. So the fleet reads eval-time files from the source tree (`./Cargo.lock`). CI's cold runner is the check.
6. **`nix run` is proven by running it.** Every runnable package hardcodes `meta.mainProgram`; `apps` is used only for secondary entry points. Both resolution paths are invisible to `nix flake check` (green on a working and on a broken flake alike), so CI runs `nix run` for every package and every `apps` entry. A prebuilt package with several peer binaries and no main one omits `mainProgram` and promises no `nix run` (E6, NIX-GEN-13).
7. **Everything the flake reads is `git add`ed before evaluation.** An untracked file is silently absent from a git-backed flake.
8. **Never read `pkgs.system`.** The nixpkgs 26.11 rename warning comes from reading that alias, not from the spelling of the `import nixpkgs { … }` argument. The wave-1 headline blamed the wrong expression.
9. **Shape bindings:**
   - A (app, the fleet CLIs) uses the skeleton below: packages, overlay, devShell, checks and formatter.
   - B (library) takes `pkgs` as a function argument and has zero inputs. See the NIX-INP seam.
   - C (module) is covered by conditional NIX-MOD. Until then, NIX-FLK-06 applies.
   - D (the ocx generated flake) is A's output contract plus NIX-GEN's attribute shape (`packages.<system>.<ns>-<pkg>`, versions in `legacyPackages`, from map conflict 18).
   - E (template) must itself pass every rule here, because it is copied verbatim.
10. **A devShell is `mkShell { inputsFrom = [ pkg ]; packages = [ … ]; }`, and `inputsFrom` never puts `pkg` itself on `PATH`.** It forwards only the package's build inputs. `packages` and `buildInputs` are functionally identical on `mkShell`; the preference is style. A devShell claim is proven only by `nix develop -i … --command bash -c 'command -v <tool>'`: without `-i` the host `PATH` is appended and a host tool (`/usr/bin/pkg-config`) turns a violation green (NIX-FLK-18).
11. **Documented gaps (researched, no answer exists or none is plantable):**
    - *Lix leniency* (Verdict 3). Lix's `checkOverlay` carries `// FIXME: if we have a 'nixpkgs' input, use it to evaluate the overlay.`, so the gap may close upstream; re-check at the next Lix release. Fleet stance unchanged: Lix is an advisory leg (Q6, NIX-GATE-16).
    - *Directory-convention loaders* (NIX-FLK-17). A flake whose output names are built from a folder listing (numtide/blueprint) defeats even a recursive grep. No fixture reproduces it without vendoring blueprint's loader; the evidence stays exemplar-only (`zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix`), and `nix flake show --json` is the only enumeration.
    - *devenv vs nix-direnv* (M-A-11). The `nix develop` runs measure `mkShell` styles only. The fleet default (plain devShell plus nix-direnv, devenv by stated intent) is an owner default with no comparative run behind it.

## The ruleset

### NIX-FLK

The rules are grouped by the check that catches them. Unless a row says otherwise, "Watched red" means red on the planted violation and green on the compliant twin under CppNix 2.35.2 and nixpkgs 26.11pre `8d5d2709`. These runs were made in this consolidation under `fixtures/nix-flakes/`, in the wave-2 rerun under `fixtures/verification-rerun-w2/`, and in this revision's re-runs. The command logs are `battery1.log`, `battery2.log`, `greps.sh`, [verification-rerun-w2.md § Verification runs](nix-flakes/verification-rerun-w2.md#verification-runs), and [Consolidation verification runs](#consolidation-verification-runs). Check 1 is the same check as gate step 4 (map E8); the [gate] block is canonical, and `--no-write-lock-file` is added only when the flake is not your own.

#### Check 1: `nix flake check --no-build --no-write-lock-file .` (the output contract)

| ID | Rule | Rationale (failure prevented) | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-01 | Make every value under `packages.<system>.<name>`, `checks.<system>.<name>`, `devShells.<system>.<name>` and `formatter.<system>` a derivation. `formatter` is included even though the manual's list omits it. | Hard failure `error: flake attribute '<path>' is not a derivation`. The source is `src/nix/flake.cc:411-417,642-651` ([outputs-contract](nix-flakes/outputs-contract.md) §1-2). | `nix flake check --no-build --no-write-lock-file .` on CppNix: exit 0 passes. For triage, grep stderr for `is not a derivation`. | **Yes**. Exit 1 on `oc/bad-nonderiv-packages` (`packages.x86_64-linux.default = 42`), `oc/bad-nonderiv-checks` (`= true`) and `oc/bad-formatter-string` (`= "nixfmt"`, error `flake attribute 'formatter.x86_64-linux' is not a derivation`). Exit 0 on `oc/good`. Identical on 2.31.5. **Lix 2.95.2: `bad-formatter-string` exits 0 with no diagnostic** (re-run this revision), because Lix routes `formatter` through `checkApp` (`lix/nix/flake.cc:659`); the `packages`/`checks` rows stay hard on Lix. | MUST | CppNix ≥2.31.5 (measured 2.31.5, 2.35.2). Lix 2.95.2: the `formatter` clause is unchecked → NIX-FLK-19 |
| NIX-FLK-02 | Write every exported overlay as a curried lambda whose first argument is literally `final`, with no formals: `final: _prev: { … }`. `self: super:`, `{ final, prev }:` and `prev: final:` are hard errors. Use `_prev` (or `prev` when it is used) so deadnix `--no-lambda-pattern-names` stays green. | `checkOverlay` rejects formals and any first argument not named `final` with `error: overlay does not take an argument named 'final'` (`flake.cc:479-489`). The `self: super:` spelling agents learned from pre-flake nixpkgs fails the same way. | Same command, on CppNix. The fast pre-check is `grep -rnE -e 'overlays?(\.[A-Za-z_-]+)? *= *(self\|\{)' --include='*.nix' .`, and empty output passes. The grep is implementation-independent. | **Yes**. Exit 1 on `overlay-self-super`, `oc/overlay-formals-style` and `oc/overlay-swapped-argname`. Exit 0 on `overlay-final-prev`. The grep hit 1/1/0. Identical on 2.31.5. **Lix 2.95.2 (re-run this revision): `overlay-self-super` and `oc/overlay-swapped-argname` exit 0; `oc/overlay-formals-style` exits 1 with a different string, `overlay is not a function with two arguments, but only takes one`** (arity check only, `lix/nix/flake.cc:463-481`). The skeleton with `final: _prev:` passes check, nixfmt, deadnix and statix. | MUST | CppNix ≥2.31.5. Lix 2.95.2 catches only the formals form → NIX-FLK-19 and the grep |
| NIX-FLK-03 | In `apps.<system>.<name>`, use only `type`, `program` and `meta`, and give it `meta.description`. In `templates.<name>`, use only `path`, `description` and optionally `welcomeText`. | Unknown keys and a missing `description` are hard errors: `app '…' has unsupported attribute 'name'`, `template '…' lacks attribute 'description'`, `template '…' has unsupported attribute 'name'`. A missing `meta` on an app only warns (`app '…' lacks attribute 'meta'`). | Same command. | **Yes**. Exit 1 on `app-extrakey`, `tpl-nodesc` and `tpl-extrakey`. Exit 0 on `tpl-good`. `oc/good` exit 0 printed the `lacks attribute 'meta'` warning. | MUST | CppNix 2.35.2 (the `apps`/`templates` fixtures are outside battery1, so 2.31.5 and Lix 2.95.2 were not run on these rows) |
| NIX-FLK-04 | Emit only plural output names in new code: `packages.<system>.default`, `apps.<system>.default`, `devShells.<system>.default`, `overlays.default`, `nixosModules.default`, `templates.default`, `bundlers.<system>.default`. Never emit `defaultPackage`, `defaultApp`, `devShell`, `overlay`, `nixosModule`, `defaultTemplate` or `defaultBundler`. When an existing singular output is renamed, keep it for one cycle behind `builtins.warn` (the fenix shim; release policy is NIX-REL's). | Every consumer's check prints `flake output attribute '<x>' is deprecated; use '<y>' instead` (`flake.cc:613`). Agents trained on 2020-21 posts emit the singular forms. | `nix flake check --no-build --no-write-lock-file . 2>&1 \| grep -c 'is deprecated; use'`: 0 passes. | **Yes**. Exit 0 with the deprecation warning on all 7 `oc/legacy-*` fixtures. No warning on `oc/good`. Identical warnings on 2.31.5 and Lix 2.95.2. | MUST (new code), SHOULD (migrating existing) | CppNix ≥2.31.5, Lix 2.95.2; the outputs still work |
| NIX-FLK-05 | Do not add a `schemas` output. Do not "fix" an `unknown flake output '<x>'` warning by deleting a community output (`flakeModule`, `homeModules`, `lib`). | Unknown top-level names only warn and never change the exit code (`flake.cc:790`). CppNix has no `schemas` handling (0 matches in `flake.cc`). Only Determinate Nix ≥3.17.0 reads it ([outputs-contract](nix-flakes/outputs-contract.md) §11). | `nix flake check --no-build . 2>&1 \| grep "unknown flake output 'schemas'"`: empty passes. | **Yes**. `oc/schemas-output` and `oc/bad-unknown-output` exited 0 with `warning: unknown flake output 'schemas'` / `'somethingUnknownTopLevel'`. Identical on 2.31.5 and Lix 2.95.2. | SHOULD | CppNix ≥2.31.5, Lix 2.95.2; Determinate differs (not installed, not run) |
| NIX-FLK-06 | Do not treat a green `nix flake check` as evidence that a `nixosModules`, `homeModules` or `darwinModules` output works. A C flake adds a `checks` entry that evaluates the module (`lib.nixosSystem`/`lib.evalModules`). | `checkModule` only forces the value, so `nixosModules.default = 42;` passes (`flake.cc:494-500`). | Reading heuristic: a C flake with no module-evaluating entry under `checks` is a finding. | **Watched not catching**: `oc/nixosmodule-nonvalue` exited 0 on 2.35.2, 2.31.5 and Lix 2.95.2. The evaluating check itself is left to NIX-MOD. | SHOULD (C only) | all three implementations |

#### Check 2: the same `--no-build` check on a cold store (a fresh CI runner)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-07 | Never read a file at evaluation time through the store path of the flake's own filtered or copied source, such as `cargoLock.lockFile = "${src}/Cargo.lock"`, `importTOML "${src}/Cargo.toml"` or `readFile "${builtins.path { path = self; }}/x"`. Read the source-tree path instead (`./Cargo.lock`, `../Cargo.toml`). A builder that derives such reads from `src` itself (crane's Cargo.toml discovery) gets its manifest paths passed explicitly; the builder spellings belong to NIX-PKG. | On a store that has not yet copied that source, `nix flake check --no-build` dies with `error: path '/nix/store/…-source' is not valid`. The check goes green as soon as any `nix eval` or `nix build` has copied the source, so a warm laptop hides what a cold CI runner reports. This is the real cause of the wave-1 "`self.packages` alias" failure, and an author defect, not a checker limit (map E1; NIX-GATE-09's triage row cites this rule). | (a) CI runs `nix flake check --no-build` on a fresh runner. (b) Fast pre-check: `grep -rn -e '"${src}/' -e '"${self}/' --include='*.nix' .`, where empty output passes. The grep misses reads hidden inside a builder, as with crane, so (a) is authoritative. | **Yes**. `read-via-storepath` and `read-via-self` exited 1 both as a local git ref and as `tarball+file://`. `read-via-sourcepath` exited 0 on both. `read-via-storepath-cold` stayed red on two consecutive `--no-build` runs, then went green after `nix build`. `read-via-storepath-231` was red on **Nix 2.31.5** too. `alias-noselfsrc`, `alias-and-selfsrc` and `src-self-only`, which have no eval-time read, were green on `.`, `path:`, `git+file://…?rev=` and fresh `tarball+file://`. The grep hit 1/1/0. | MUST | ≥2.31.5 (measured on 2.31.5 and 2.35.2). Not the 2.35 lazy-copy mechanism. Lix 2.95.2 words it `… did not exist in the store during evaluation` (NIX-GATE-09 triage row) |

#### Check 3: `nix flake check --no-build --all-systems` (the systems list)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-08 | Iterate systems with `nixpkgs.lib.genAttrs` over a literal list of the systems CI evaluates. Never add flake-utils. Never iterate `lib.systems.flakeExposed`. Never use `nix-systems/default` unless it is overridden to a list without `x86_64-darwin`. Migrating an existing flake-utils use is SHOULD, done through `nix-flake-adopt`. | A hidden or descriptive default list adds systems nobody tests. flake-utils and `nix-systems/default` both still carry `x86_64-darwin`. `flakeExposed` adds `x86_64-freebsd`, `armv6l-linux` and more (helix recursion, jj iproute2). flake-utils has been stalled since 2024-11-13 ([#86](https://github.com/numtide/flake-utils/issues/86)). | `nix flake check --no-build --all-systems --no-write-lock-file .` must exit 0. Pre-check: `grep -rn -e 'flake-utils' -e 'eachDefaultSystem' -e 'flakeExposed' -e 'nix-systems/default' --include='*.nix' .`, where empty passes. | **Yes**, re-run on 2.35.2. `sys/flake-utils-eachdefault` and `sys/nix-systems-input` exited 1 with `error: Nixpkgs 26.11 has dropped support for x86_64-darwin.`. `sys/genattrs-legacy` and `sys/flake-parts-persystem` exited 0. The grep hit 4/1/0/0. | MUST | nixpkgs ≥26.11 makes the hidden lists fatal |
| NIX-FLK-09 | Do not declare `x86_64-darwin` in a flake whose nixpkgs is 26.11 or unstable. A flake pinned to `nixos-26.05` may keep it until that branch's end of life at the end of 2026, and drops it in the same change that moves the pin. | `lib/trivial.nix:1003` throws the moment any `x86_64-darwin` attribute is evaluated. 17/37 exemplars list it ([shape](nix-audit/exemplar-flake-shape.md) §3). | The `--all-systems` check above. A grep for `x86_64-darwin` is read together with `jq -r '.nodes.nixpkgs.original.ref // .nodes.nixpkgs.locked.rev' flake.lock` (map Q16+Q17). | **Yes**. `sys/darwin-unstable` exited 1. `sys/darwin-2605` exited 0, printing `Nixpkgs 26.05 will be the last release to support x86_64-darwin`. | MUST | nixpkgs 26.11 |
| NIX-FLK-10 | Adopt flake-parts only when the flake imports flake-parts modules or exports a `flakeModule`. Never adopt it just to iterate systems. | Every consumer pays 2 extra lock nodes (4 vs 2, measured), and the module system obscures outputs from static review (NIX-FLK-17's planted `flake-parts-imported` twin). Eval cost is **not** the reason: 0.17 s vs 0.06 s CPU on 2.35.2 (conflict 5 below). | Reading heuristic: a `mkFlake` call with no `imports = [ … ]` of a flake-parts module is a finding. `nix flake metadata --json . \| jq '.locks.nodes\|length'` gives 4 vs 2. | Lock counts re-run on 2.35.2 (genattrs 2, nix-systems 3, flake-utils 4, flake-parts 4). The heuristic is reading only. | SHOULD | — |

#### Check 4: grep plus the warning count (the nixpkgs instance)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-11 | Read packages from `nixpkgs.legacyPackages.${system}`. Create a configured instance (`config.allowUnfree`, an overlay the flake itself needs) at most once per system, in one named binding (`pkgsFor`), and never inside an output body. Never create one only to apply the flake's own overlay (NIX-FLK-13). | Repeated instances multiply evaluation work. devenv's four nixpkgs-shaped inputs cost a 95.6 s cold eval ([runs](nix-audit/exemplar-tool-runs.md) Axis 6), but that is dominated by an IFD fork. Per-output imports alone produce no warning and no error, which is why agents never notice them. | `grep -rn -e 'import nixpkgs' -e 'import inputs.nixpkgs' --include='*.nix' .`: at most 1 site per flake, and that site is the named binding. | **Yes**. `sys/per-output-import` had 3 sites, `sys/genattrs-legacy` 0. | SHOULD (demoted from map P0: no measured failure at fixture scale) | — |
| NIX-FLK-12 | Never read `pkgs.system`, `legacyPackages.${system}.system` or a helper's `.system`. Use `pkgs.stdenv.hostPlatform.system`. The `import nixpkgs` argument spelling (`system`, `localSystem`) is not a lint target. | `pkgs/top-level/aliases.nix:2498` is a `warnAlias` that prints `'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` on every evaluation, per system, into every consumer's log. | `nix flake check --no-build --all-systems . 2>&1 \| grep -c "has been renamed to/replaced by 'stdenv.hostPlatform.system'"`: 0 passes. Pre-check: `grep -rnE -e '\bpkgs\.system\b' --include='*.nix' .` | **Yes**, re-run on 2.35.2. `sys/pkgs-system-ref` printed 3 warnings (one per system), `sys/per-output-import` printed 0. The grep hit 2 on `sys/pkgs-system-ref` and 0 on `sys/per-output-import`. | MUST | nixpkgs ≥25.11 alias (warning since 2025-10-28) |

#### Check 5: `drvPath` equality (one source of truth)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-13 | Put each derivation in a `callPackage`-able `package.nix`. `packages.<system>.<name>` is `legacyPackages.${system}.callPackage ./package.nix { }`. An A or D flake whose package should join a consumer's set also exports `overlays.default = final: _prev: { <name> = final.callPackage ./package.nix { }; }`. Never write a second derivation body, and never add a second `import nixpkgs` to reach the flake's own overlay. D satisfies this through one shared builder file called per data entry; its attribute path is NIX-GEN's (map E7). | Two bodies drift. `packages` is what `nix run`, `nix build`, `nix profile add` and the author's cache resolve, while an overlay builds against the consumer's nixpkgs, which the author's cache may not have ([fenix README](https://github.com/nix-community/fenix#readme)). | **Self form (own flake only, `--impure`):** `a=$(nix eval --raw .#packages.x86_64-linux.<name>.drvPath); b=$(nix eval --impure --raw --expr 'let f = builtins.getFlake (toString ./.); in (f.inputs.nixpkgs.legacyPackages.x86_64-linux.extend f.overlays.default).<name>.drvPath'); [ "$a" = "$b" ]`. **Cross-flake form (no `--impure`, preferred):** a second consumer flake applies `producer.overlays.default` to its own `import nixpkgs`; compare `nix eval --raw <producer>#default.drvPath` with `nix eval --raw <consumer>#<attr>.drvPath`. A consumer in a separate git repository takes the producer by an **absolute** `path:` or `--override-input` (see Open questions, monorepo). | **Yes**. `both` gave equal drvPaths (exit 0). `both-diverge` gave different drvPaths (exit 1). `direct`, `viaExtend` and `viaImport` produce one identical drvPath. **Cross-flake, wave-2 rerun:** `oc/package-both/{producer,consumer}` gives `producer#default.drvPath` == `consumer#consumesOctool.drvPath` == `/nix/store/4w5wqj3nff5li7dcndp1mym13fjs2kyb-octool.drv`, and a shadowing overlay applied through the real input evaluates `consumesShadowedHello.pname` to `"hello-shadowed"`. | MUST (A, D) | CppNix 2.35.2 |
| NIX-FLK-14 | Keep `flake.nix` a thin entry point: no `mkDerivation`, `buildRustPackage`, `buildPythonApplication`, `buildGoModule` or `craneLib.buildPackage` bodies in `flake.nix`. | Packaging inside `flake.nix` cannot be `callPackage`d, overlaid or copied into nixpkgs by-name (map conflict 13, M-A-17). 5/36 exemplars inline builders. | `grep -n -e 'mkDerivation' -e 'buildRustPackage' -e 'buildPythonApplication' -e 'buildGoModule' -e 'craneLib.buildPackage' flake.nix`: empty passes. | **Yes**. 1 hit on `alias-and-selfsrc`, 0 on `oc/good`. | SHOULD | — |

#### Check 6: `nix run` smoke test (nothing static catches it)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-15 | Give every runnable package a hardcoded `meta.mainProgram` (never derived from `pname`), and prove it with `nix run .#<name> -- --version` in CI. Add an `apps` output only for secondary entry points or a program that is not the package's main binary, and smoke-run every `apps` entry the same way. **Exception (map E6):** a prebuilt package with several peer binaries and no main one omits `meta.mainProgram` entirely (NIX-GEN-13), and `nix run` of it is not promised. `kitware/cmake`'s five peer binaries are the motivating case. | `nix run` resolves `apps.<system>.<name>` first, else `meta.mainProgram`, then `pname`, then the name part of `name`, and never checks that the file exists (`src/nix/app.cc:106-109`). `nix flake check` stays green on a working and a broken flake alike (`FIXME: check meta attributes`, `flake.cc:419`). nixpkgs forbids deriving `mainProgram` (`pkgs/README.md:508-515`). | `nix run --no-write-lock-file .#<name> -- --version` exits 0, for every package and every `apps` entry. Static half: `nix eval --raw .#packages.x86_64-linux.<name>.meta.mainProgram` exits 0 (A only). | **Yes**. `run-mismatch` exited 1 with `error: unable to execute '/nix/store/…-octool-pkg-0.1.0/bin/octool-pkg': No such file or directory`, while `nix flake check` on the same fixture exited **0**. `run-mainprogram` printed `ran`. The meta eval exited 1 and 0 respectively. **Apps half (wave-2 rerun):** `verification-rerun-w2/run-apps-output-fixed` (no `mainProgram`, an `apps.default` naming a differently named binary) exit 0 `ran-via-apps`; `verification-rerun-w2/run-mainprogram-unset-fixed` (neither) exit 1, same `unable to execute` error; `oc/run-mainprogram-set` exit 0. `nix flake check --no-build` exit 0 on all three. The `oc/run-apps-output` and `oc/run-mainprogram-unset` originals are not admissible: their `installPhase` wrote to `/bin`, so both failed at build time. | MUST | 2.35.2 |

#### Check 7: `git ls-files` before evaluation

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-16 | `git add` every new file that a git-backed flake reads before running any `nix eval`, `build` or `flake check`. That includes `package.nix`, patches and `flake.lock`. | Untracked and ignored files are absent from the source tree Nix reads. No error names them, and the failure shows up wherever the file is read ([NixOS/nix#7107](https://github.com/NixOS/nix/issues/7107), [nix.dev local files](https://nix.dev/tutorials/working-with-local-files)). | `git ls-files --others --exclude-standard .`: empty passes. This is narrower than map Q6's `git status --porcelain`, because modified tracked files *are* seen, with a "dirty" warning. | **Yes**. `untracked-file` listed `untracked.txt`, and `nix build .#untracked` exited 1 with `cat: …-source/untracked.txt: No such file or directory`, while `.#tracked` exited 0. `oc/good` listed nothing. | MUST | all flake-capable versions |

#### Check 8: `nix flake show --json` and `nix develop -i` (what a shape exposes)

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-17 | An A, D or E flake exposes `formatter.<system>` (a derivation; which formatter package is NIX-GATE-01's decision) and `checks.<system>` entries that build its packages. Review a flake's outputs with `nix flake show --json`, never by grepping `flake.nix`. | 27/36 exemplars expose no formatter ([runs](nix-audit/exemplar-tool-runs.md) Axis 5, conflict 19). flake-parts and blueprint flakes show zero outputs in `flake.nix` (blueprint, treefmt, zed, [shape](nix-audit/exemplar-flake-shape.md) §1, §5). A blueprint-style directory loader defeats even a recursive grep (Verdict 11, documented gap). | `nix flake show --json --no-write-lock-file . > show.json` must exit 0, then `jq -e '.formatter."x86_64-linux"' show.json` and `jq -e '.checks."x86_64-linux"' show.json` each exit 0. Split the two commands: in a pipe, a flake that fails to evaluate also turns `jq -e` red (exit 4, no input) and masks which property failed. Output census: `jq -r 'keys' show.json`. | **Yes**. Formatter: `oc/good` exit 0, `alias-noselfsrc` exit 1. **Checks (re-run this revision):** `oc/good` exit 0, `alias-noselfsrc` exit **1** (`keys` = `["packages"]`). The wave-2 rerun's red on `oc/alias-noselfsrc` (exit 4) is **not admissible**: that fixture does not evaluate (`error: undefined variable 'system'`, `flake.nix:2`, an interpolation in `description`), so `nix flake show` printed nothing. **Show vs `flake.nix` grep (wave-2 rerun):** `verification-rerun-w2/flake-parts-imported` (outputs declared in `modules/outputs.nix`) gives `["devShells","formatter","packages"]` from `show`, while `grep -nE -e 'packages' -e 'devShells' -e 'checks' -e 'formatter' -e 'apps' flake.nix` exits 1 (empty). A recursive grep still finds the names there. | SHOULD | — |
| NIX-FLK-18 | Write `devShells.<system>.default` as `pkgs.mkShell { inputsFrom = [ <the package> ]; packages = [ <dev-only tools> ]; }`. Use `packages`, never `buildInputs`, for the direct tool list (style). **Do not rely on `inputsFrom` to put the package's own binary on `PATH`.** It does not, so add the package to `packages` too if a contributor should run it inside the shell. Prove a devShell claim with `nix develop -i`, and prove `inputsFrom` with a tool beyond stdenv's defaults, never with `cc`/`gcc`. | `inputsFrom` forwards the listed derivation's `nativeBuildInputs`/`buildInputs`/`propagatedBuildInputs`, "but never the derivations themselves" (nixpkgs `pkgs/build-support/mkshell/default.nix@8d5d2709`, `mergeInputs`). `mkShell` is `stdenv.mkDerivation` (`constructDrv`), so even `mkShell { }` carries stdenv's C toolchain. `buildInputs` on `mkShell` behaves exactly like `packages` but is the wiki's dated example ([outputs-contract](nix-flakes/outputs-contract.md) §7). `nix develop` without `-i` appends the host `PATH`, so a host tool fakes a pass. | Functional: `nix develop -i --no-write-lock-file . --command bash -c 'command -v <tool>'` exits 0 for every tool the shell promises (`-i` = `--ignore-env`, present on 2.31.5 and 2.35.2; `which` is not in stdenv, `command -v` is a bash builtin). `nix flake check` is green regardless of style and does not distinguish them. Style half (`buildInputs` in `mkShell`): reading heuristic. | **Yes, with `-i` (re-run this revision).** `oc/devshell-packages` exit 0 and `oc/devshell-buildinputs` exit 0, resolving `…-hello-2.12.3/bin/hello`; `oc/devshell-inputsfrom` (`inputsFrom = [ hello ]`, no `hello` in `packages`) exit 1. `verification-rerun-w2/devshell-inputsfrom-distinctive` (the package has `nativeBuildInputs = [ pkg-config ]`, the shell has only `inputsFrom`) resolves `pkg-config-wrapper-0.29.2` (exit 0); `verification-rerun-w2/devshell-empty-control` (`mkShell { }`) exits 1 for `pkg-config` but resolves `…-gcc-wrapper-15.3.0/bin/cc`. **Without `-i`, the wave-2 rerun's form is not admissible:** `devshell-empty-control` exits **0** for `pkg-config`, resolving the host's `/usr/bin/pkg-config`. | SHOULD | CppNix 2.31.5 / 2.35.2 (`-i` flag) |

#### Check 9: the implementation the check runs on

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-FLK-19 | Count Check 1 (and gate step 4) as passed only when it ran on CppNix ≥2.31.5. On a host whose `nix --version` prints `Lix`, run it through `nix shell nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build …` before reporting the output contract green. The Lix leg stays advisory (NIX-GATE-16) and never replaces the CppNix step. | Lix 2.95.2 exits 0 on a string `formatter` and on `self: super:` / `prev: final:` overlays that CppNix hard-fails (NIX-FLK-01, 02). An agent or author on a Lix host ships a flake that fails every CppNix and Determinate consumer's check. CppNix 2.31.5 and 2.35.2 agree on all 18 rows, so the floor version is a sufficient CppNix run. | `nix --version` names the implementation. The admissible check: `nix shell nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build --no-write-lock-file .` exit 0. | **Yes (re-run this revision).** `overlay-self-super`: Lix 2.95.2 exit 0, CppNix 2.31.5 via `nix shell` exit 1. `oc/bad-formatter-string`: Lix exit 0, 2.31.5 exit 1. Twin `overlay-final-prev`: Lix 0, 2.31.5 0, 2.35.2 0. | MUST | Lix 2.95.2 diverges; re-check at the next Lix release |

#### The verified skeletons

**Shape A** (the fleet CLIs; D adds its data reader to the same frame). This is the file `fixtures/nix-flakes/skeleton-a/flake.nix`. With nixpkgs locked to `8d5d2709` it gave: `nix flake check --no-build --all-systems` exit 0; `nixfmt --check` exit 0; `deadnix --fail --no-lambda-pattern-names .` exit 0; `statix check .` exit 0; `nix run .` printed `ran`; overlay drvPath equals package drvPath; 2 lock nodes; Q1 = 1. `nix develop` resolves `nixfmt` from `packages` and `cc`/`gcc` from stdenv. Because `package.nix` here is a bare `runCommand`, that run says nothing about `inputsFrom`; NIX-FLK-18's `devshell-inputsfrom-distinctive` pair is the `inputsFrom` evidence. A real fleet package (Rust, Python) forwards its toolchain through `inputsFrom`, and the devShell adds the package to `packages` only if contributors run it in the shell.

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

**Shape B** (library; crane's shape). This is `fixtures/nix-flakes/skeleton-b/flake.nix`: zero inputs, and `nix flake check --no-build`, nixfmt and deadnix all exit 0. Library functions take `pkgs`. Whether a B flake keeps `nixpkgs-lib` or a checks-only nixpkgs is NIX-INP's decision (M-B-03).

```nix
{
  description = "octool-lib: helpers that build against the caller's nixpkgs";

  outputs = _: {
    lib.mkOctool = pkgs: pkgs.callPackage ./package.nix { };
    overlays.default = final: _prev: { octool = final.callPackage ./package.nix { }; };
  };
}
```

**Shape C** is NIX-MOD's (conditional); NIX-FLK-06 applies meanwhile. **Shape D** is shape A plus NIX-GEN (data file and reader; attribute shape per map conflict 18; `legacyPackages` version trees are not walked by `nix flake check`). **Shape E** is a `templates.<name> = { path; description; welcomeText; }` output, and the template directory's own `flake.nix` must satisfy NIX-FLK-01..19.

#### Consolidation verification runs

All runs used `/home/mherwig/.cache/research-lang/nix-tools/run.sh` (CppNix 2.35.2) with fixtures under `fixtures/nix-flakes/`. `oc/` is a copy of the outputs-contract dive's fixtures, and `sys/` is a copy of the systems dive's fixtures. Each fixture is its own git repository with nixpkgs pinned at `8d5d2709`, except `sys/darwin-2605`, which pins `5e2305d5`. The original dives' runs need two caveats:

- The **systems** dive ran on nix-portable's bundled **Nix 2.20.6** with a private store, not on 2.35.2.
- The **outputs-contract** dive completed **no** run because of store contention (later diagnosed as a stale SQLite lock plus WAL forced off, map (d)).

Every load-bearing claim of both was therefore re-run here. The wave-2 rerun ([verification-rerun-w2.md](nix-flakes/verification-rerun-w2.md)) closed the rows still unrun, and this revision re-ran the rerun's Lix rows, its devShell rows and its `.checks` row (store warm throughout).

```
# battery1.sh — nix flake check --no-build --no-write-lock-file <fixture>
good exit=0 (warning: app 'apps.x86_64-linux.default' lacks attribute 'meta')
bad-nonderiv-packages exit=1   error: flake attribute 'packages.x86_64-linux.default' is not a derivation
bad-nonderiv-checks exit=1     error: flake attribute 'checks.x86_64-linux.default' is not a derivation
bad-formatter-string exit=1    error: flake attribute 'formatter.x86_64-linux' is not a derivation
overlay-final-prev exit=0
overlay-self-super exit=1      error: overlay does not take an argument named 'final'
overlay-formals-style exit=1   error: overlay does not take an argument named 'final'
overlay-swapped-argname exit=1 error: overlay does not take an argument named 'final'
legacy-{overlay,defaultPackage,defaultApp,devShell,nixosModule,defaultTemplate,defaultBundler} exit=0
                               warning: flake output attribute '<x>' is deprecated; use '<y>' instead
bad-unknown-output exit=0      warning: unknown flake output 'somethingUnknownTopLevel'
schemas-output exit=0          warning: unknown flake output 'schemas'
nixosmodule-nonvalue exit=0    (no diagnostic for nixosModules.default = 42)
tpl-good exit=0 | tpl-nodesc exit=1 (lacks attribute 'description') | tpl-extrakey exit=1 | app-extrakey exit=1

# battery2.sh + follow-ups — the "path '…-source' is not valid" isolation
alias-noselfsrc   .|path:|git+file:?rev=|tarball+file:  exit 0 0 0 0
alias-and-selfsrc .|path:|git+file:?rev=|tarball+file:  exit 0 0 0 0   (no eval-time read of src)
src-self-only     .|path:|git+file:?rev=|tarball+file:  exit 0 0 0 0
read-via-storepath  . / tarball+file:  exit 1 1   error: path '/nix/store/942crj…-source' is not valid
read-via-self       . / tarball+file:  exit 1 1   error: path '/nix/store/g4aqnf…-x-src' is not valid
read-via-sourcepath . / tarball+file:  exit 0 0
read-via-storepath-cold: --no-build run1 exit 1, run2 exit 1, nix build exit 0, --no-build again exit 0
read-via-storepath-231 (nix shell nixpkgs#nixVersions.nix_2_31 → nix (Nix) 2.31.5): exit 1, same error
github:DeterminateSystems/flake-checker/cddc8afc9733e3ff695df50f2be3d8d85345c9eb --no-build: exit 1,
  error: path '/nix/store/1hjhfj…-flake-checker-src' is not valid (trace at flake.nix:60, cause at :193 via crane)

# systems re-runs, nix flake check --no-build --all-systems (2.35.2)
genattrs-legacy 0 | flake-utils-eachdefault 1 | nix-systems-input 1 | flake-parts-persystem 0
per-output-import 0 (rename warnings 0) | pkgs-system-ref 0 (rename warnings 3)
darwin-unstable 1 (Nixpkgs 26.11 has dropped support for x86_64-darwin.) | darwin-2605 0 (26.05 last-release warning)
eval stats, nix eval --no-eval-cache .#packages.x86_64-linux --apply builtins.attrNames:
  genattrs cpu 0.062 s | flake-utils 0.118 s | flake-parts 0.171 s (19,404 thunks)

# Q1 on a real flake.lock (sys/consumer-genattrs-legacy-*, locked by this consolidation)
jq '[.nodes | to_entries[] | select((.value.locked.repo // "") == "nixpkgs" or (.value.original.id // "") == "nixpkgs") | .key] | length' flake.lock
  nofollows → 2, follows → 1;  the dive's '.locks.nodes' form on flake.lock → "jq: error … null (null) has no keys"

# NIX-FLK-13 drvPath equality (both / both-diverge), NIX-FLK-15 run, NIX-FLK-16 untracked: see the rule rows

# revision re-runs, 2026-09-27 (store warm)
# Lix vs CppNix (NIX-FLK-01, 02, 19): <impl> nix flake check --no-build --no-write-lock-file <fixture>
                              lix-2.95.2  cppnix-2.35.2  cppnix-2.31.5
oc/bad-formatter-string            0           1              1
overlay-self-super                 0           1              1
oc/overlay-swapped-argname         0           1              —
oc/overlay-formals-style           1           1              —     (Lix: overlay is not a function with two arguments, but only takes one)
overlay-final-prev                 0           0              0
# NIX-FLK-17 .checks half: nix flake show --json … | jq -e '.checks."x86_64-linux"'
oc/good 0 | alias-noselfsrc 1 (keys ["packages"]; formatter half also 1)
oc/alias-noselfsrc: nix flake show exit 1, error: undefined variable 'system' (flake.nix:2) → jq exit 4; inadmissible twin
# NIX-FLK-18: nix develop [-i] --no-write-lock-file <fixture> --command bash -c 'command -v <tool>'
                                             with -i   without -i
oc/devshell-packages hello                      0          0
oc/devshell-inputsfrom hello                    1          1
w2/devshell-inputsfrom-distinctive pkg-config   0          0   (…-pkg-config-wrapper-0.29.2)
w2/devshell-empty-control pkg-config            1          0   (without -i: /usr/bin/pkg-config from the host PATH)
w2/devshell-empty-control cc                    0 (…-gcc-wrapper-15.3.0/bin/cc)
nix develop --help (2.35.2 and 2.31.5): '--ignore-env / -i  Clear the entire environment'
```

## Applied to the exemplars and the future consumers

| Rule | Satisfied by | Violated by (repo@sha12:path:line) | Fleet and ocx generated flake |
|---|---|---|---|
| FLK-01 | `DeterminateSystems/nix-installer`, `jj-vcs/jj` pass the home-system check ([runs](nix-audit/exemplar-tool-runs.md) Axis 3) | `numtide/blueprint@06ee7190dc26:lib/default.nix:143` (treefmt's locked blueprint) puts a non-derivation under `checks.aarch64-darwin.pkgs-default-coverage` | New: every fleet flake passes it in CI; the generator must never emit a version tree under `packages` (conflict 18). |
| FLK-02 | `jj-vcs/jj@f01e70f8e375:flake.nix:22` (`overlays.default = final: prev:`) | `cachix/devenv@6d76db3889de:examples/overlays/subflake/flake.nix:5` (`overlays.default = self: super:`) | New: the generator emits `final: _prev:` (map E2). |
| FLK-04 | `nix-community/fenix@5f7e7d793cb2:flake.nix:89` keeps `overlay` behind a `warn` shim | `NixOS/templates@3348e5b68b7a:full/flake.nix:141,149,176` (`overlay`, `nixosModule`, `defaultTemplate` in a template agents copy) | New commitment |
| FLK-07 | — | `sxyazi/yazi@0ea4c5d9ef75:nix/yazi-unwrapped.nix:32` (`lockFile = "${src}/Cargo.lock"`); `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:193` (`builtins.path { path = self; }` read by crane), re-run red 2026-09-27 | **Load-bearing for ocx and grim** (Rust, `Cargo.lock`): `cargoLock.lockFile = ./Cargo.lock`, never `"${src}/…"`. The ocx generated flake is data-only and unaffected. |
| FLK-08 | `sys/genattrs-legacy` shape; `NixOS/nix`, `nix-installer` hand-roll `genAttrs` ([shape](nix-audit/exemplar-flake-shape.md) §3: 29/37) | `jj-vcs/jj@f01e70f8e375:flake.nix:28` (`flake-utils.lib.eachSystem nixpkgs.lib.systems.flakeExposed`: `--all-systems` fails on `iproute2`); `helix-editor/helix@079a789e8cb0:flake.nix:19` (`flakeExposed`: infinite recursion on `x86_64-freebsd`); `oxalica/rust-overlay@4e9bb05a9ab6:flake.nix:17` | New: fleet list = `x86_64-linux aarch64-linux aarch64-darwin`, which matches cargo-dist's non-Windows, non-Intel-mac targets ([ocx](nix-audit/ocx-index-and-fleet.md) §4). |
| FLK-09 | `numtide/llm-agents.nix@efb10f28f724` ships `rules/no-x86-64-darwin.yml` | 17/37 exemplars list `x86_64-darwin` ([shape](nix-audit/exemplar-flake-shape.md) §3; fenix measured throwing) | New: the ocx generated flake maps OCI `darwin/amd64` manifests to nothing on nixpkgs ≥26.11, even though cargo-dist still ships `x86_64-apple-darwin`. |
| FLK-11/12 | `cachix/cachix`, `jj` read `legacyPackages` | `ipetkov/crane@73b980519cef` `examples/` (10 imports, fixtures only); nix-installer's 56 rename warnings ([runs](nix-audit/exemplar-tool-runs.md) headline) do **not** reproduce from `flake.nix:44-45` alone (open question) | New commitment |
| FLK-13 | `jj-vcs/jj@f01e70f8e375:flake.nix:22-23,67` (one `./default.nix`, overlay plus packages) | — (the outputs-contract dive's own "correct" snippet used `.extend`; see conflict 4) | New: `ocx` and `grim` each get `package.nix` (by-name-ready, map conflict 13). The generated flake's overlay adds one namespace attribute (NIX-GEN-07; D equality path per map E7). |
| FLK-14 | `jj`, `yazi`, `ghostty` `callPackage` files | `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:199`, `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:55`, `nix-community/nix-index@dd6792b23059:flake.nix:21`, `NixOS/nix@209d2bc44288:flake.nix:116`, `oxalica/nil@205c8ba65a7f:flake.nix:32` | New commitment |
| FLK-15 | `jj-vcs/jj@f01e70f8e375:default.nix:79` (`mainProgram = "jj"`) | `apps` is written in 6/37 while `mainProgram` is in 22/37 repos; no exemplar runs `nix run` in CI ([shape](nix-audit/exemplar-flake-shape.md) §4, §5, §9) | New: ocx has 2 bins (`ocx`, `ocx-shim`), so `mainProgram = "ocx"` and no `apps`; grim sets `mainProgram = "grim"`. Index packages have no mainProgram key ([ocx](nix-audit/ocx-index-and-fleet.md) §1.8), so the generator sets one only when a package has exactly one binary and otherwise omits it (NIX-GEN-13, map E6); it never derives or guesses one. |
| FLK-17 | `ghostty-org/ghostty@b40acce58dcf:flake.nix:127`, `jj-vcs/jj@f01e70f8e375:flake.nix:64`, `nix-community/nixd@77bb1cacfa8a:flake.nix:89` declare a formatter | `helix-editor/helix@079a789e8cb0`, `direnv/direnv@b00e451f547f`, `nix-darwin/nix-darwin@4cff07de74b5` have no formatter anywhere ([shape](nix-audit/exemplar-flake-shape.md) §7); 27/36 overall | New commitment |
| FLK-18 | — (no exemplar re-read; nixpkgs `mkShell` source is primary) | the wiki's `buildInputs`-first devShell example ([outputs-contract](nix-flakes/outputs-contract.md) §7) | New: ocx and grim devShells take `inputsFrom = [ <pkg> ]` for the Rust toolchain; CI or the adopt skill proves promised tools with `nix develop -i`. |
| FLK-19 | CppNix is the gated implementation (Q6) | — (no exemplar evidence; divergence measured on fixtures) | New: gate step 4 runs on CppNix; the Lix leg (GATE-16) is advisory. |

The setup-ocx Action is a devShell-only flake (A without `packages`) if it ships one at all ([ocx](nix-audit/ocx-index-and-fleet.md) §4). ocx-sdk-python is an A flake built with `buildPythonApplication`/`buildPythonPackage`; the builder is NIX-PKG's.

## AI-agent failure modes

The list is ranked by expected frequency: how common the idiom is in training-era material, times how silently it fails.

1. **`flake-utils.lib.eachDefaultSystem` or `lib.systems.flakeExposed` boilerplate, which brings a hidden `x86_64-darwin`.** It is red under `--all-systems` on nixpkgs 26.11. Check: NIX-FLK-08's `--all-systems` run plus its grep.
2. **Overlays written `self: super:` or `{ final, prev }:`.** These are hard `nix flake check` errors on CppNix. Agents also "fix" deadnix's unused-`prev` finding by switching to formals, which trades one red for another. Check: NIX-FLK-02, spelled `final: _prev:`.
3. **`cargoLock.lockFile = "${src}/Cargo.lock"` or `importTOML "${src}/Cargo.toml"`.** It is green on the author's warm machine and red on a fresh CI runner, and agents then blame the `default = self.packages…` alias. Check: NIX-FLK-07's cold `--no-build` run and its grep.
4. **A new file used before `git add`.** The file is silently absent, and the agent chases a phantom build error. Check: `git ls-files --others --exclude-standard .` (NIX-FLK-16).
5. **`nix flake check` treated as proof that `nix run` works.** No `meta.mainProgram` and a binary name ≠ `pname` gives `unable to execute …`; an `apps` entry is just as unchecked. Check: `nix run .#<name> -- --version` for every package and app (NIX-FLK-15).
6. **Legacy singular outputs** (`defaultPackage`, `devShell`, `overlay`) from 2020-21 examples, including the official `NixOS/templates` "full" template. Check: `grep -c 'is deprecated; use'` on check output (NIX-FLK-04).
7. **`pkgs.system` reads, and the false "fix" of renaming the `import nixpkgs` argument to `localSystem`.** Check: the rename-warning count (NIX-FLK-12).
8. **`import nixpkgs { inherit system; }` inside every output body.** It produces no warning and no error, so nothing flags it. Check: the Q3 grep with at most one site (NIX-FLK-11).
9. **`inputsFrom = [ pkg ]` expected to put `pkg`'s own binary on the devShell `PATH`, and the claim "proven" with `which` in a non-`-i` `nix develop`.** The binary is never forwarded, and the host `PATH` leaks in without `-i`. `cc` resolving proves nothing either, since every `mkShell` carries stdenv. Check: `nix develop -i … command -v <tool>` (NIX-FLK-18).
10. **Deleting a legitimate output to silence `unknown flake output`**, or adding `schemas` for Determinate. Check: the exit code is unchanged, so read it before editing (NIX-FLK-05).
11. **Auditing a flake-parts flake by reading `flake.nix`**, which leads to wrongly reporting a missing formatter or checks. Check: `nix flake show --json . > show.json` then `jq` (NIX-FLK-17).
12. **Writing the derivation twice**, once in `packages` and once in the overlay. Check: drvPath equality (NIX-FLK-13).
13. **Trusting a Lix `nix flake check` green.** A `self: super:` overlay or a string `formatter` passes on Lix 2.95.2 and fails every CppNix consumer. Check: re-run through `nixVersions.nix_2_31` (NIX-FLK-19).
14. **Crediting a red to the property the fixture was built for, when the fixture itself is broken.** This happened twice in this family's own wave-2 rerun (an `installPhase` writing to `/bin`; a `description` interpolating an undefined `${system}`). Check: read the first error line, and confirm the twin evaluates (`nix flake show` exit 0) before reading `jq -e`'s code.

## Open questions

**Owner decisions (with the default the program applies):**
- **Fleet system list.** Default: `x86_64-linux aarch64-linux aarch64-darwin` on `nixos-unstable`. Intel-mac users use the cargo-dist binary or the ocx index, not the flake.
- **Should fleet A flakes export `overlays.default`?** Default: yes. It costs one line, and NIX-FLK-13 keeps it honest.
- **`apps` for ocx's second binary (`ocx-shim`)?** Default: no `apps`; `ocx-shim` is reachable as `${pkg}/bin/ocx-shim`.
- **Should the fleet publish a `templates.default` for its own new flakes (M-A-14)?** Default: no. The `nix-flake-adopt` skill carries skeleton A instead.
- **When is a flake the wrong tool (M-A-18)?** Default: every fleet repo except setup-ocx ships a flake; setup-ocx gets a devShell only if a contributor asks.
- **Fleet devShell tooling (M-A-11).** Default: plain `mkShell` devShell plus nix-direnv; devenv only by stated intent. This is an owner default, not a measured comparison (Verdict 11).

**Subareas needing another research round:**
- **nixpkgs instantiation** (packaging/fleet-builders, wave 3): which expression in `DeterminateSystems/nix-installer`'s evaluation closure emits the 56 `'system' has been renamed` warnings? If a common builder (crane, rustPlatform) reads `pkgs.system`, NIX-FLK-12's grep has a blind spot.
- **Builders × cold-store eval reads (NIX-PKG seam, packaging/fleet-builders, wave 3)**: do crane `buildPackage`/`buildDepsOnly` with `src = craneLib.cleanCargoSource ./.`, `rustPlatform.buildRustPackage` with `cargoHash`, and uv2nix/pyproject.nix fail NIX-FLK-07's cold `--no-build`, and what is each builder's safe spelling? This must be answered before ocx and grim flakes are written.
- **Modules (NIX-MOD, shape C, wave 4)**: what is the smallest `checks` entry that proves a `nixosModules` or `homeModules` output evaluates, given that `nix flake check` checks nothing?
- **Monorepo sub-flakes (M-A-16, inputs/input-types-and-sources, wave 3)**: a relative `path:../producer` from a consumer that is its own git repository fails on CppNix 2.35.2 with `error: access to absolute path '/nix/store/producer/flake.nix' is forbidden in pure evaluation mode`; an absolute `path:` or `--override-input` works (wave-2 rerun, `oc/package-both`). The 2.31.5 floor, the same-git-tree `path:./sub` case and the sub-flake lock format (Nix ≥2.26) are still unmeasured.

## Conflicts resolved

1. **What breaks `--no-build` by remote ref.** [runs](nix-audit/exemplar-tool-runs.md) smell 3 says any `default = self.packages.${system}.<name>` alias fails. [outputs-contract](nix-flakes/outputs-contract.md) §6 says the alias combined with `src = self` fails, probably through 2.35's lazy copying. **Both are wrong.** The alias and the self-source without a read are green on four ref schemes. An eval-time read through the source's store path is red locally on a cold store, on 2.35.2 **and 2.31.5**, so the cause is not the 2.35 lazy-copy mechanism. Resolved as NIX-FLK-07; the alias is fine and used in skeleton A.
2. **Source of the `'system'` rename warning.** The [runs](nix-audit/exemplar-tool-runs.md) headline blames `import nixpkgs { inherit system; }` at nix-installer:44-45. [systems-and-instantiation](nix-flakes/systems-and-instantiation.md) §4 blames `pkgs.system` reads. The dive was right, and this was re-confirmed on 2.35.2: 3 warnings versus 0. The dive's own runs had used Nix 2.20.6. Resolved as NIX-FLK-12, with the import spelling explicitly not a lint target.
3. **The Q1 lock query.** The dive's `.locks.nodes` form is for `nix flake metadata --json` and errors on a `flake.lock`. The map's `.nodes` form is correct for `flake.lock`: 2 versus 1, measured.
4. **How `packages` reaches the overlay's package.** The outputs-contract "correct" snippet uses `legacyPackages.extend self.overlays.default`, while map conflict 4 uses a direct `callPackage`. All three spellings give an identical drvPath. `.extend` builds a second fixpoint (258,440 versus 174,072 thunks) for no benefit. Resolved: direct `callPackage` is the default, `.extend` is tolerated rather than a finding, and the enforced property is drvPath equality (NIX-FLK-13).
5. **flake-parts cost.** The dive measured about 10× wall time (2.17 s vs 0.22 s) on Nix 2.20.6. Re-measured on 2.35.2 with `--no-eval-cache`, CPU is 0.171 s versus 0.062 s, about 2.8× and 0.11 s absolute. Cost is dropped as a reason. NIX-FLK-10 rests on consumer lock nodes (+2) and output opacity.
6. **deadnix versus the overlay contract.** deadnix `--no-lambda-pattern-names` flags the unused `prev`, and the map's conflict-4 spelling `final: prev:` trips it. Formals are forbidden by `checkOverlay`. Resolved: `final: _prev:` passes check, deadnix, statix and nixfmt (skeleton A).
7. **Whether `nix-systems` is an allowed consumer-overridable list.** Map conflict 1 allows `import inputs.systems`, but the dive measured `nix-systems/default` red under `--all-systems`, confirmed here. Narrowed: allowed only when pointed at a list without `x86_64-darwin`.
8. **Severity of per-output `import nixpkgs`.** The map rates it P0 (M-A-03). No warning or error was measured at fixture scale, and devenv's 95.6 s is dominated by IFD. Demoted to SHOULD (NIX-FLK-11); the MUST is NIX-FLK-12.
9. **Is the output contract implementation-independent?** Verdict 3 and NIX-FLK-01/02 were written against CppNix 2.35.2 and read as "`nix flake check` enforces". The wave-2 rerun measured Lix 2.95.2 lenient on the `formatter` derivation check and on the overlay argument name, and this revision re-ran both (Lix exit 0, CppNix exit 1). Resolved: the hard/soft table is scoped to CppNix ≥2.31.5 (2.31.5 is identical to 2.35.2), the Lix divergence is recorded per row, and NIX-FLK-19 requires a CppNix run before Check 1 counts as passed.
10. **How to verify a devShell (NIX-FLK-18).** The wave-2 rerun used `nix develop . --command which <tool>` and read `pkg-config` resolving on `devshell-inputsfrom-distinctive` as `inputsFrom`'s proof. This revision found that the same command exits 0 on the empty control too, via the host's `/usr/bin/pkg-config`, because `nix develop` appends the caller's `PATH`. Resolved: the verification is `nix develop -i … --command bash -c 'command -v <tool>'`, which is red on the control (exit 1) and green on the distinctive fixture (exit 0). The rerun's `hello` rows are unchanged under `-i`.
11. **The `.checks` half of NIX-FLK-17.** The wave-2 rerun recorded red as `oc/alias-noselfsrc` exit 4. That fixture fails to evaluate (`undefined variable 'system'` in its `description`), so the red came from `nix flake show` failing, not from a missing `checks` output. Resolved by re-running on the evaluating twin `alias-noselfsrc` (exit 1), and the verification now splits `show` from `jq`.
12. **`apps` as a secondary convenience vs a full `nix run` path.** The rerun showed `apps` resolves `nix run` as completely as `mainProgram`, and is equally unchecked. Resolved: NIX-FLK-15 keeps `mainProgram` as the primary spelling (owner default: no `apps` for `ocx-shim`) and extends the smoke test to every `apps` entry.
13. **The generator and `mainProgram` (map E6).** NIX-FLK-15's Applied row said the generator "must derive and verify one"; NIX-GEN-13 says set it only for exactly one binary and never guess. Resolved per E6: NIX-GEN-13 holds for D, the Applied row is rewritten, and NIX-FLK-15 carries the multi-binary exception.
14. **Did the rerun settle M-A-11 (devenv vs nix-direnv)?** The rerun's summary called it "backed by a passing `nix develop` run". Those runs compare `mkShell` spellings only. Resolved: the `mkShell` shape is verified (NIX-FLK-18); the tooling choice stays an owner default and is recorded as a gap (Verdict 11).

## Sub-artifacts

- [nix-flakes/systems-and-instantiation.md](nix-flakes/systems-and-instantiation.md): systems-iteration strategies, the `x86_64-darwin` drop, the `pkgs.system` alias, and lock growth per strategy. Its runs used Nix 2.20.6 and were re-run here.
- [nix-flakes/outputs-contract.md](nix-flakes/outputs-contract.md): the hard/soft output table read from CppNix 2.35.2 `flake.cc`, `nix run` resolution, untracked files, overlay-versus-packages, and `schemas`. Its fixtures were run here for the first time.
- [nix-flakes/verification-rerun-w2.md](nix-flakes/verification-rerun-w2.md): the wave-2 rerun of every verification the two files above and this consolidation's own battery left unrun — devShells, the apps half of `nix run`, the cross-flake overlay/`package-both` test, flake-parts show-vs-grep, and the Lix 2.95.2 / CppNix 2.31.5 implementation matrix. Two of its verifications (the devShell `which` form and the `.checks` red twin) were superseded by this revision's re-runs (conflicts 10, 11). It also records E1's rewording of NIX-GATE-09's triage row for the next `nix-gates.md` edit.

## Revision log

- **2026-09-27, wave-2 rerun (first pass, additive).** Evidence added to NIX-FLK-13 (cross-flake drvPath and shadowing overlay), NIX-FLK-15 (apps half, E6 clause), NIX-FLK-17 (`.checks` half, candidate 9) and NIX-FLK-18 (`nix develop` runs); Lix/2.31.5 matrix added. No ID changed.
- **2026-09-27, revision (this pass).** Folded [verification-rerun-w2.md](nix-flakes/verification-rerun-w2.md) and re-ran its Lix, devShell and `.checks` rows. No ID was renumbered, reassigned or retired.
  - **Verdict 3, NIX-FLK-01, NIX-FLK-02: overclaim fixed.** "What `nix flake check` enforces" is now scoped to CppNix ≥2.31.5, with Lix 2.95.2's leniency (string `formatter`, `self: super:`/`prev: final:` overlays exit 0) recorded per row and as a documented gap. Why: a Lix green was being read as the contract.
  - **NIX-FLK-19 added (MUST):** Check 1 counts only on CppNix ≥2.31.5; on a Lix host, run it through `nixVersions.nix_2_31`. Why: the Lix divergence needs an enforceable rule, not a footnote.
  - **NIX-FLK-18: verification replaced.** `nix develop … which <tool>` (the rerun's form) went green on the empty-control violation via the host `/usr/bin/pkg-config`; it is replaced by `nix develop -i … command -v <tool>`, watched red and green. Rule text adds "prove `inputsFrom` with a non-stdenv tool". Why: the old verification cannot go red on a host that has the tool.
  - **NIX-FLK-17: red twin replaced for the `.checks` half.** `oc/alias-noselfsrc` (exit 4) does not evaluate; the half was re-run on `alias-noselfsrc` (exit 1), and the verification now splits `show` from `jq`. Why: the recorded red was a broken fixture.
  - **NIX-FLK-15: text extended.** The `apps` smoke test is added, the resolution order names `apps` first, and the Applied row's "derive and verify one" is replaced by NIX-GEN-13's rule. Why: map E6 and the rerun's apps half.
  - **NIX-FLK-13:** the cross-flake form is now the preferred verification; the D equality path cites map E7. **NIX-FLK-07:** Lix's wording and the E1 author-defect framing are cited. **NIX-FLK-03..06:** implementation scope recorded.
  - **Verdict 10 and 11 added:** the devShell shape, plus the three documented gaps (Lix leniency, directory-convention loaders, devenv vs nix-direnv).
  - **Open questions:** removed the closed "wave-2 rerun" block; M-A-11 moved to an owner default; the monorepo item narrowed to what is still unmeasured (2.31.5, same-tree `path:./sub`, lock format).
  - **AI-agent failure modes 9, 13, 14 added.** **Conflicts 9-14 added.** The separate "Wave-2 rerun verification" section is folded into the rule rows and the verification log.

## Key sources

- https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc — the `nix flake check` contract and its verbatim error strings
- https://github.com/NixOS/nix/blob/2.35.2/src/nix/app.cc — `nix run` resolution (`mainProgram` → `pname` → `name`)
- https://raw.githubusercontent.com/lix-project/lix/609bc41e6f60d750b5bca6b5a8e66cf0c5d5fbe3/lix/nix/flake.cc — Lix 2.95.2 `checkOverlay` (arity only, lines 463-481) and `formatter` via `checkApp` (line 659)
- https://raw.githubusercontent.com/NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439/pkgs/build-support/mkshell/default.nix — `mkShell`: `constructDrv = stdenv.mkDerivation`, `inputsFrom` forwards inputs, never the derivations
- https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check — manual contract (omits `formatter`)
- https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md — flakerefs, `git+file` dirty handling, `self` attributes
- https://raw.githubusercontent.com/NixOS/nix/2.35.2/doc/manual/source/release-notes/rl-2.32.md — `nix flake check` skips substitutable derivations
- https://nix.dev/tutorials/working-with-local-files — only tracked files enter a git-backed flake
- https://github.com/NixOS/nix/issues/7107 — the untracked-file confusion
- https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2611.section.md — the `x86_64-darwin` drop
- https://github.com/numtide/flake-utils/issues/86 — flake-utils deprecation debate (last commit 2024-11-13)
- https://github.com/nix-systems/nix-systems — the reserved `systems` input and its `default` list
- https://flake.parts/options/flake-parts — `systems` has no default; `perSystem`
- https://github.com/nix-community/fenix#readme — the overlay builds against the consumer's nixpkgs (the cache footgun)
- https://determinate.systems/blog/flake-schemas/ — `schemas`, Determinate-only
- https://nixcademy.com/posts/1000-instances-of-flake-utils/ and https://zimbatm.com/notes/1000-instances-of-nixpkgs — lock-duplication and instance-cost arguments
- https://jade.fyi/blog/flakes-arent-real/ — thin `flake.nix` over `callPackage`d files
