---
title: "Wave-2 verification rerun — flake structure and outputs (NIX-FLK)"
topic: nix-flakes
agent: verification-rerun-w2
model: sonnet
date_researched: 2026-09-27
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w2/ (new fixtures built this round); /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-flakes/oc/ and /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-flakes/sys/ (pre-existing, re-run)
scope: |
  Covered: every NIX-FLK verification `nix-flakes.md`/`outputs-contract.md` marked
  "not reached" or "reading heuristic" — devShells (`packages`/`buildInputs`/
  `inputsFrom`), the `apps` half of `nix run` resolution, a real two-flake
  overlay/`package-both` consumer test, the flake-parts show-vs-grep contrast
  (candidate 9), the `.checks` half of NIX-FLK-17's jq, and CppNix 2.35.2 vs
  2.31.5 vs Lix 2.95.2 on the full 18-fixture output-contract battery. Also the
  load-bearing `nix develop` run on `skeleton-a`, corrected where it over-claimed.
  Not covered: NIX-FLK-01..12,14,16 (already watched red by the original
  consolidation, unchanged here); NIX-MOD/NIX-INP/NIX-PKG/NIX-GEN seams (routed
  elsewhere per nix-topic-map.md); Determinate Nix (not installed in this
  environment).
---

## Table of contents

1. [Findings](#findings)
   1. [Store state and environment](#1-store-state-and-environment)
   2. [devShells: `packages` vs `buildInputs` vs `inputsFrom` (NIX-FLK-18)](#2-devshells-packages-vs-buildinputs-vs-inputsfrom-nix-flk-18)
   3. [The load-bearing `skeleton-a` run, corrected](#3-the-load-bearing-skeleton-a-run-corrected)
   4. [`nix run` via `apps` vs `meta.mainProgram` (NIX-FLK-15, candidate 7)](#4-nix-run-via-apps-vs-metamainprogram-nix-flk-15-candidate-7)
   5. [A real two-flake overlay consumer (NIX-FLK-13, `package-both`)](#5-a-real-two-flake-overlay-consumer-nix-flk-13-package-both)
   6. [`nix flake show --json` vs a `flake.nix`-only grep (candidate 9)](#6-nix-flake-show---json-vs-a-flakenix-only-grep-candidate-9)
   7. [NIX-FLK-17's `.checks` half](#7-nix-flk-17s-checks-half)
   8. [CppNix 2.35.2 vs 2.31.5 vs Lix 2.95.2 — the hard/soft table by implementation](#8-cppnix-2352-vs-2315-vs-lix-2952--the-hardsoft-table-by-implementation)
2. [Summary](#summary)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `inputsFrom = [ pkg ]` does **not** put `pkg` itself on the devShell's `PATH` — it forwards only `pkg`'s own `buildInputs`/`nativeBuildInputs`/`propagatedBuildInputs`, confirmed both empirically (`devshell-inputsfrom`: `which hello` fails) and in nixpkgs' own `mkShell` source ("this leaves actual dependencies of the derivations in `inputsFrom`, but never the derivations themselves").
- `pkgs.mkShell { }`, with nothing in `packages` or `inputsFrom` at all, already resolves `cc`/`gcc` — `mkShell` is `stdenv.mkDerivation` under a different name, so a bare mkShell always carries stdenv's default C toolchain; this confounds any devShell test that expects `inputsFrom` to explain `cc` being present.
- NIX-FLK-18 is now a **run** rule (`nix develop . --command which <tool>`), not a reading heuristic; `packages` and `buildInputs` are functionally identical on `mkShell` (both just add to `PATH`), so the choice between them is style, not correctness — `nix flake check` cannot tell them apart either.
- `apps.<system>.default` is a fully valid, `nix flake check`-invisible alternative to `meta.mainProgram` for `nix run` — a package with neither resolves 1:1 the same as one with a mismatched `mainProgram`: `unable to execute … No such file or directory`, with `nix flake check` green in both failing and passing cases.
- Two pre-existing planted fixtures (`oc/run-apps-output`, `oc/run-mainprogram-unset`) had an unrelated bug (`installPhase` writing to `/bin` instead of `$out/bin`) that made both fail at **build** time regardless of the question they were built to test; fixed copies live under this round's fixture dir.
- A genuine two-flake overlay consumer (not the `--impure getFlake` self-trick) reproduces NIX-FLK-13's drvPath-equality guarantee end to end, including a shadowing overlay whose effect (`pname` rewritten to `"hello-shadowed"`) is visible through the consumer's own evaluation.
- The same two-flake consumer test also reproduces the still-open monorepo/`path:` problem live: `path:../producer` from a `consumer` that is its own separate git repository fails with `error: access to absolute path '/nix/store/producer/flake.nix' is forbidden in pure evaluation mode`; an absolute `path:` (or `--override-input`) is the only working spelling.
- Candidate 9 (`nix flake show --json` vs a `flake.nix`-only grep) is now watched red on a planted twin, not exemplar-only: a flake-parts flake whose outputs live entirely in an *imported* file shows `packages`/`devShells`/`formatter` via `nix flake show --json` while a grep of `flake.nix` alone finds nothing.
- That same planted twin only proves the **flake.nix-only** mistake — a *recursive* grep over the whole repository still finds the literal attribute names in the imported file, so the fully attribute-name-invisible case (a directory-convention loader building names from a folder listing, as in `numtide/blueprint`) remains exemplar evidence, not independently re-verified this round.
- NIX-FLK-17's `.checks` half is now watched red: `nix flake show --json … | jq -e '.checks."x86_64-linux"'` exits 0 on a flake that declares `checks`, exits 4 (jq: no such key) on one that does not.
- **Lix 2.95.2 diverges from CppNix on two of the four `nix flake check` output-contract rows tested**: it does not enforce the overlay's first argument being literally named `final` (only that the lambda curries exactly two arguments), and it does not check `formatter.<system>` as a derivation at all — Lix's own source routes `formatter` through the same `checkApp` path as `apps`, never `checkDerivation`.
- `nixVersions.nix_2_31` (CppNix 2.31.5) reproduces every row of the CppNix 2.35.2 battery1 table exactly, same exit codes and same verbatim strings — the output-contract hard/soft table is stable across that CppNix range; 2.35.2 is not doing anything 2.31.5 didn't already do here.
- The load-bearing "`nix develop` on `skeleton-a` prints the package's toolchain from `inputsFrom`" run does succeed (`cc`, `gcc`, `nixfmt` all resolve), but does **not**, by itself, demonstrate `inputsFrom`'s contribution — `skeleton-a`'s `nixfmt` comes from its explicit `packages = [ pkgs.nixfmt ]`, and its `cc`/`gcc` would appear from a bare `mkShell {}` regardless of `inputsFrom`. A corrected fixture (a package with `nativeBuildInputs = [ pkgs.pkg-config ]`, an otherwise-empty devShell with only `inputsFrom`) isolates the real effect: `pkg-config` resolves, something no bare `mkShell` would ever provide.
- M-A-11 (fleet devShell default: plain devShell + nix-direnv, devenv only by stated intent) is retained, now backed by a passing `nix develop` run across all three devShell styles instead of no run at all.
- E6's exception clause is folded into NIX-FLK-15: a prebuilt package with several peer binaries and no single main one omits `meta.mainProgram` entirely; `nix run` of it is not promised (superseding the earlier "must derive and verify one" note).
- E1's resolution (NIX-FLK-07 stays canonical; NIX-GATE-09's triage row gets the reworded text "eval-time read through the flake's own source store path (NIX-FLK-07); author's fix: read the source-tree path") is recorded here verbatim for whoever next edits `nix-gates.md` — this file does not touch `nix-gates.md` itself, out of scope for this brief.
- Every ID in `nix-flakes.md` was held stable; the consolidation file was revised additively (existing rows enriched, one new subsection, a revision log) with no renumbering.

## Findings

### 1. Store state and environment

`timeout 60 run.sh nix --version` returned `nix (Nix) 2.35.2` immediately — no ENVIRONMENT FAULT. The shared on-disk store (`~/.cache/research-lang/nix-tools/.nix-portable/nix/store`) was **warm** for nixpkgs `8d5d2709` for every command in this file: no run showed multi-second "copying path" or network-fetch delays for evaluation, and the `nix flake check`/`nix flake show` calls below all returned within a few seconds. Actual **builds** did happen (`nix-shell-env.drv`, `octool-pkg-*.drv`, `hello`, `pkg-config-wrapper`), since these are fixture-specific derivations never built before; none of this round's candidates targeted NIX-FLK-07's cold-store isolation (that stays the original consolidation's result, unchanged). `nix shell nixpkgs#lix` and `nix shell nixpkgs#nixVersions.nix_2_31` both resolved from the same warm store with no delay.

### 2. devShells: `packages` vs `buildInputs` vs `inputsFrom` (NIX-FLK-18)

Three pre-existing, git-committed fixtures at `~/.cache/research-lang/nix-tools/fixtures/nix-flakes/oc/devshell-{packages,buildinputs,inputsfrom}/`, pinned `nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439`:

```nix
# devshell-packages: devShells.x86_64-linux.default = pkgs.mkShell { packages = [ pkgs.hello pkgs.jq ]; };
# devshell-buildinputs: devShells.x86_64-linux.default = pkgs.mkShell { buildInputs = [ pkgs.hello pkgs.jq ]; };
# devshell-inputsfrom: packages.x86_64-linux.default = pkgs.hello;
#                      devShells.x86_64-linux.default = pkgs.mkShell {
#                        inputsFrom = [ self.packages.x86_64-linux.default ]; packages = [ pkgs.jq ]; };
```

`nix flake check --no-build --no-write-lock-file .` exits 0 on all three — the check cannot distinguish them; this is a **run** conclusion, not an assumption. `nix develop --no-write-lock-file . --command which hello`:

| Fixture | `which hello` | Why |
|---|---|---|
| `devshell-packages` | exit 0, resolves | `hello` is directly in `packages` |
| `devshell-buildinputs` | exit 0, resolves | `buildInputs` on `mkShell` behaves exactly like `packages` — both just get merged into the shell's inputs |
| `devshell-inputsfrom` | **exit 1**, `which: no hello in (…)` | `inputsFrom = [ self.packages.default ]` where `self.packages.default = pkgs.hello` forwards `hello`'s own dependencies, never `hello` itself; `hello` is also not in `packages` here (only `jq` is) |

nixpkgs' own `mkShell` implementation ([pkgs/build-support/mkshell/default.nix@8d5d2709](https://raw.githubusercontent.com/NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439/pkgs/build-support/mkshell/default.nix)) confirms this is by design, not a fixture artifact:

```nix
mergeInputs = name:
  (attrs.${name} or [ ])
  ++ (lib.subtractLists inputsFrom (lib.flatten (lib.catAttrs name inputsFrom)));
  # "this leaves actual dependencies of the derivations in `inputsFrom`,
  #  but never the derivations themselves"
```

and `constructDrv = stdenv.mkDerivation;` — `mkShell` is `stdenv.mkDerivation` wearing a trench coat, which is why every `mkShell`, even `pkgs.mkShell { }` with nothing supplied, already has `cc`/`gcc` on `PATH` (see §3). NIX-FLK-18's practical shape is therefore: use `inputsFrom = [ <the package> ]` to get that package's *build* toolchain for free, and separately list the package itself under `packages` if a contributor should be able to run it directly inside the shell — the two are not substitutes for each other.

### 3. The load-bearing `skeleton-a` run, corrected

The brief's named load-bearing run — `nix develop` on `fixtures/nix-flakes/skeleton-a` printing the package's toolchain from `inputsFrom` — succeeds:

```
$ nix develop --no-write-lock-file . --command bash -c 'which cc; which gcc; which nixfmt'
cc: /nix/store/…-gcc-wrapper-15.3.0/bin/cc
gcc: /nix/store/…-gcc-wrapper-15.3.0/bin/gcc
nixfmt: /nix/store/…-nixfmt-1.5.0/bin/nixfmt
```

But `skeleton-a`'s `package.nix` is a bare `runCommand` derivation with no real `nativeBuildInputs` of its own, and `nixfmt` is resolved from `skeleton-a`'s own `packages = [ pkgs.nixfmt ]`, not from `inputsFrom`. To check the claim honestly, a control (`fixtures/verification-rerun-w2/devshell-empty-control/`, `devShells.x86_64-linux.default = pkgs.mkShell { };`, nothing in `packages` or `inputsFrom`) was built: `nix develop . --command which cc` **still resolves**, confirming `cc`/`gcc` say nothing about `inputsFrom` on this or any `mkShell`. A second fixture (`fixtures/verification-rerun-w2/devshell-inputsfrom-distinctive/`, a package with `nativeBuildInputs = [ pkgs.pkg-config ]` and a devShell with only `inputsFrom = [ <that package> ]`, no `packages =` at all) isolates the real effect: `nix develop . --command which pkg-config` resolves to `pkg-config-wrapper-0.29.2`, a tool no bare `mkShell` provides. **The corrected load-bearing claim**: `inputsFrom` is proven by a tool the package needs beyond stdenv's own defaults, never by `cc`/`gcc` alone.

### 4. `nix run` via `apps` vs `meta.mainProgram` (NIX-FLK-15, candidate 7)

`oc/run-apps-output/` and `oc/run-mainprogram-unset/` both failed at build time on first run (`error: builder … failed to produce output path`), unrelated to the apps-vs-mainProgram question: their `installPhase` wrote to `/bin` (the chroot root) instead of `$out/bin`. Corrected copies (`fixtures/verification-rerun-w2/run-apps-output-fixed/`, `run-mainprogram-unset-fixed/`, `installPhase` writing to `$out/bin`) were built, `git init && git add -A && git commit`, and re-run alongside the still-good `oc/run-mainprogram-set/`:

| Fixture | Shape | `nix run --no-write-lock-file .` | `nix flake check --no-build` |
|---|---|---|---|
| `run-mainprogram-set` | `meta.mainProgram = "octool"` set, no `apps` | exit 0, `ran via mainProgram` | exit 0 |
| `run-apps-output-fixed` | no `mainProgram`; `apps.default.program = "${pkg}/bin/octool-run"` | exit 0, `ran-via-apps` | exit 0 (warns "lacks attribute 'meta'" on the app) |
| `run-mainprogram-unset-fixed` | neither `mainProgram` nor `apps`; bin name (`octool-run`) ≠ `pname` (`octool-pkg`) | **exit 1**, `error: unable to execute '…/bin/octool-pkg': No such file or directory` | exit 0 |

`apps` is a fully valid, check-invisible alternative resolution path — the smoke test (`nix run`) is the only thing that tells a working flake from a broken one; `nix flake check` is green in all three cases. Source: resolution order (`mainProgram` → `pname` → `name`, no existence check) is `src/nix/app.cc:106-109` on CppNix 2.35.2, already cited by the original consolidation and unchanged here.

### 5. A real two-flake overlay consumer (NIX-FLK-13, `package-both`)

`oc/package-both/producer/` exports both `packages.x86_64-linux.default` (via its own overlay, applied to its own nixpkgs instance) and two overlays (`overlays.default` adding `octool`; `overlays.shadowHello` rewriting `hello`'s `pname` to `"hello-shadowed"`). `oc/package-both/consumer/` is a **separate git repository** with `inputs.producer.url = "path:../producer";` that applies each overlay to its own `import nixpkgs { … }` and exposes `packages.x86_64-linux.consumesOctool` / `consumesShadowedHello`.

- `nix build .#consumesOctool` from inside `consumer/` (relative `path:../producer`) **fails**: `error: access to absolute path '/nix/store/producer/flake.nix' is forbidden in pure evaluation mode (use '--impure' to override)`. `consumer` auto-resolves to `git+file://…?ref=…&rev=…` (it is its own git repo), and the relative `path:` is then resolved against the **store copy**, not the checkout — this reproduces `nix-flakes.md`'s already-flagged monorepo/`path:` open question (M-A-16) live, with a fresh 2026-09-27 repro under CppNix 2.35.2.
- The same command with `--override-input producer "path:/home/…/producer"` (an **absolute** path) succeeds: `nix build --no-write-lock-file --override-input producer "path:$ABS" .#consumesOctool` exits 0; `nix eval --raw … .#consumesShadowedHello.pname` prints `hello-shadowed`, confirming the shadowing overlay's effect is visible through a real, separate consumer flake (not a self-referential `--impure getFlake` trick).
- `nix eval --raw .#default.drvPath` on `producer` and `nix eval --raw --override-input … .#consumesOctool.drvPath` on `consumer` are **identical**: `/nix/store/4w5wqj3nff5li7dcndp1mym13fjs2kyb-octool.drv`. This is a stronger NIX-FLK-13 confirmation than the original consolidation's `both`/`both-diverge` fixtures, which used `--impure builtins.getFlake (toString ./.)` on a single flake rather than two independently-evaluated ones.

### 6. `nix flake show --json` vs a `flake.nix`-only grep (candidate 9)

The pre-existing `sys/flake-parts-persystem/` fixture (`perSystem = { pkgs, ... }: { packages.default = pkgs.hello; };`, written inline in `flake.nix`) does **not** demonstrate the "grep misses it" claim: `nix flake show --json` gives `["packages"]`, and `grep -nE -e 'packages' flake.nix` finds it too, on the same line, because the attribute name is literal text in `flake.nix` itself. A new fixture, `fixtures/verification-rerun-w2/flake-parts-imported/`, moves the same declarations into an imported file (`imports = [ ./modules/outputs.nix ];`, with `modules/outputs.nix` declaring `packages.default`, `devShells.default`, `formatter`):

- `nix flake show --json --no-write-lock-file . | jq -r 'keys'` → `["devShells","formatter","packages"]`, exit 0.
- `grep -nE -e 'packages' -e 'devShells' -e 'checks' -e 'formatter' -e 'apps' flake.nix` (the entry-point file alone) → **empty, exit 1** — a false negative reporting zero outputs on a flake that has three.
- Caveat, stated plainly: `grep -rnE … .` (recursive, whole directory) **does** find the same literal names inside `modules/outputs.nix`. This twin only proves "reading `flake.nix` alone is not enough" — it does not reproduce the fully name-invisible case from the exemplar corpus (`numtide/blueprint`'s directory-convention loader constructs attribute names from a folder listing at eval time; no grep, recursive or not, would find a literal string to match). That stronger case remains exemplar evidence only ([exemplar-flake-shape.md §5](../nix-audit/exemplar-flake-shape.md), `zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix`).

### 7. NIX-FLK-17's `.checks` half

`oc/good/` declares `checks.x86_64-linux.default = self.packages.x86_64-linux.default;`. `nix flake show --json --no-write-lock-file . | jq -e '.checks."x86_64-linux"'` exits 0, printing the check's derivation info (`name`, `type: derivation`). On `oc/alias-noselfsrc/` (declares no `checks` output at all), the same pipeline exits **4** — `jq`'s own exit code for "null (null) has no keys", i.e. there is no `.checks` key to select at all. This mirrors the already-watched `formatter` half exactly (exit 0 vs non-zero) and closes the gap the consolidation's table had left open.

### 8. CppNix 2.35.2 vs 2.31.5 vs Lix 2.95.2 — the hard/soft table by implementation

The consolidation's own `battery1.sh` (18 fixtures under `fixtures/nix-flakes/oc/`, `nix flake check --no-build --no-write-lock-file <fixture>`) was re-run three times: through `run.sh` directly (CppNix 2.35.2), through `run.sh nix shell nixpkgs#nixVersions.nix_2_31 --command nix` (CppNix 2.31.5), and through `run.sh nix shell nixpkgs#lix --command nix` (Lix 2.95.2, tag `2.95.2`, commit `609bc41e6f60d750b5bca6b5a8e66cf0c5d5fbe3`). Full table under [Verification runs](#verification-runs); the four rows that differ:

| Row | CppNix 2.35.2 / 2.31.5 | Lix 2.95.2 |
|---|---|---|
| `bad-formatter-string` (`formatter.x86_64-linux = "nixfmt";`) | hard, exit 1, `flake attribute 'formatter.x86_64-linux' is not a derivation` | **soft, exit 0, no diagnostic** |
| `overlay-self-super` (`self: super: { };`) | hard, exit 1, `overlay does not take an argument named 'final'` | **soft, exit 0** |
| `overlay-swapped-argname` (`prev: final: { };`) | hard, exit 1, same string | **soft, exit 0** |
| `overlay-formals-style` (`{ final, prev }: { };`) | hard, exit 1, `overlay does not take an argument named 'final'` | hard, exit 1, **different verbatim string**: `overlay is not a function with two arguments, but only takes one` |

This is source-grounded, not inferred from behavior alone. Lix's `nix/flake.cc` at the tested tag ([raw source](https://raw.githubusercontent.com/lix-project/lix/609bc41e6f60d750b5bca6b5a8e66cf0c5d5fbe3/lix/nix/flake.cc)) shows `checkOverlay` (lines 463-481) checking only that the value is a two-argument curried lambda — `if (!body) throw Error("overlay is not a function with two arguments, but only takes one");` and the "takes more than two" sibling — with **no check anywhere on the argument's name**; and the `formatter` branch of the output-checking loop (line 659) calls `checkApp(...)`, not `checkDerivation`, exactly like `apps` — never routing through the derivation check CppNix's `flake.cc` applies to `formatter`. CppNix 2.31.5 (nixVersions.nix_2_31) reproduces every one of the 18 rows identically to 2.35.2, same exit code and same verbatim string, so the divergence is Lix-specific, not a CppNix-version drift.

## Normative guidance candidates

1. **Never rely on `devShells.<system>.default`'s `inputsFrom` to make the referenced package's own binary callable inside the shell — add it to `packages` too if that is the intent.**
   Rationale: `mkShell`'s `inputsFrom` forwards only `buildInputs`/`nativeBuildInputs`/`propagatedBuildInputs` of the listed derivations, explicitly excluding the derivations themselves (nixpkgs `mkShell` source).
   Verify: `nix develop --no-write-lock-file . --command which <the package's own binary>` on a devShell using only `inputsFrom = [ <pkg> ]`.
   Run: **yes**, `fixtures/nix-flakes/oc/devshell-inputsfrom/`, exit 1 (`which: no hello in (…)`), red as intended.

2. **`packages` and `buildInputs` are interchangeable on `mkShell`; prefer `packages` for new code as a style/self-documentation choice, never as a functional fix.**
   Rationale: both are merged into the same `nativeBuildInputs`/env by `mkShell`'s `extendDrvArgs`; `nix flake check` and `nix develop` behave identically either way.
   Verify: `nix develop --no-write-lock-file . --command which <tool>` on twins using each spelling; both must resolve identically.
   Run: **yes**, `devshell-packages` and `devshell-buildinputs`, both exit 0, both resolve `hello`.

3. **Do not read `cc`/`gcc` resolving inside `nix develop` as proof that `inputsFrom` (or any specific input) supplied a build toolchain — `pkgs.mkShell { }` supplies it unconditionally.**
   Rationale: `mkShell`'s `constructDrv = stdenv.mkDerivation;` — every `mkShell` derivation carries `stdenv`'s default C toolchain regardless of `packages`/`inputsFrom` content.
   Verify: `nix develop --no-write-lock-file . --command which cc` on a bare `pkgs.mkShell { }` with nothing supplied.
   Run: **yes**, `fixtures/verification-rerun-w2/devshell-empty-control/`, exit 0, resolves `cc`.

4. **When demonstrating `inputsFrom`'s effect (for docs, a template, or a test), use a package with a real build dependency beyond `stdenv`'s default (`pkg-config`, `openssl`, a language toolchain) — never a trivial `runCommand`/`writeShellApplication` package, whose test proves nothing.**
   Rationale: a package with no real `nativeBuildInputs` beyond stdenv's default contributes nothing distinguishable from a bare `mkShell` through `inputsFrom`.
   Verify: `nix develop --no-write-lock-file . --command which pkg-config` where the sole package in `inputsFrom` has `nativeBuildInputs = [ pkgs.pkg-config ]` and the devShell has no `packages =`.
   Run: **yes**, `fixtures/verification-rerun-w2/devshell-inputsfrom-distinctive/`, exit 0, resolves `pkg-config-wrapper-0.29.2`.

5. **An `apps.<system>.default` pointing at an explicit `program` path is a complete, `nix flake check`-invisible substitute for `meta.mainProgram` — CI must run `nix run .#<name>` regardless of which spelling a flake uses, because neither `nix flake check` nor a static read distinguishes a working one from a broken one.**
   Rationale: `nix run`'s resolution order never checks the target file exists at check time; `nix flake check` on both a passing and a failing flake in this family exits 0.
   Verify: `nix run --no-write-lock-file .#<name>` in CI, for every package with an `apps` entry as well as every one relying on `meta.mainProgram`.
   Run: **yes**, `run-apps-output-fixed` (exit 0), `run-mainprogram-set` (exit 0), `run-mainprogram-unset-fixed` (exit 1) — all three `nix flake check` green.

6. **A prebuilt package with several peer binaries and no single main one omits `meta.mainProgram` entirely; do not guess one, and do not promise `nix run` for it (E6).**
   Rationale: nixpkgs forbids deriving `mainProgram` from `pname`/`name` (`pkgs/README.md:508-515`, cited by the original consolidation); `kitware/cmake`'s five peer binaries are the motivating multi-binary case for the ocx generated flake (NIX-GEN-13).
   Verify: reading heuristic — a generated package with >1 plausible entry-point binary and no author-declared main one should have no `mainProgram` attribute and no `apps` entry claiming one arbitrarily.
   Run: no — this is a generator-design constraint (NIX-GEN-13's territory), not independently plantable as a twin in this fixture round.

7. **Audit any flake's outputs with `nix flake show --json … | jq -r 'keys'`, never a `flake.nix`-only grep — but know that even a recursive grep can still miss a directory-convention loader (blueprint-style) that builds attribute names from a folder listing rather than writing them as literal text anywhere.**
   Rationale: a flake-parts (or blueprint) flake composing outputs from an imported file has none of the output-family names as literal text in `flake.nix`; `nix flake show --json` still resolves them because it evaluates the composed result, not the source text.
   Verify: `nix flake show --json --no-write-lock-file . | jq -r 'keys'` vs `grep -nE -e 'packages' -e 'devShells' -e 'checks' -e 'formatter' -e 'apps' flake.nix`.
   Run: **yes**, `fixtures/verification-rerun-w2/flake-parts-imported/`: show gives 3 keys, `flake.nix`-only grep gives 0 (exit 1). Recursive-grep caveat noted, not independently plantable this round (needs a dynamic/directory-convention loader).

8. **Treat `checks.<system>` the same way as `formatter.<system>` in a `nix flake show --json` audit: absence is a `jq -e` non-zero exit, not a silent pass.**
   Rationale: the same jq-exit-code mechanism that already covered `formatter` extends cleanly to `checks`.
   Verify: `nix flake show --json --no-write-lock-file . | jq -e '.checks."x86_64-linux"'`.
   Run: **yes**, `oc/good` exit 0, `oc/alias-noselfsrc` exit 4.

9. **A flake author targeting Lix as more than an advisory CI leg must not assume Lix's `nix flake check` catches a wrong overlay-argument name or a non-derivation `formatter` — CppNix's hard errors here are soft or absent on Lix 2.95.2.**
   Rationale: Lix's `checkOverlay` checks arity only (`lix/nix/flake.cc:463-481`, tag `2.95.2`); Lix's `formatter` branch calls `checkApp`, not `checkDerivation` (`lix/nix/flake.cc:659`).
   Verify: run the same fixture through `run.sh nix shell nixpkgs#lix --command nix flake check --no-build --no-write-lock-file .` and compare the exit code and any diagnostic to the CppNix run.
   Run: **yes**, full 18-fixture battery, both implementations, see [Verification runs](#verification-runs).

10. **Do not assume a CppNix-version gap (2.31.5 → 2.35.2) changed the output-contract hard/soft table — it did not, for any of the 18 fixtures tested.**
    Rationale: the fleet's promised consumer floor is `nixVersions.nix_2_31` (Q8); a rule authored against 2.35.2 alone risks silently assuming a fix or check that is actually present at the floor too, or (the more dangerous direction) absent at the floor when present later — neither happened here, but it needed checking, not assuming.
    Verify: re-run the same battery through `run.sh nix shell nixpkgs#nixVersions.nix_2_31 --command nix`.
    Run: **yes**, all 18 rows identical to 2.35.2, verbatim strings included.

## Verification runs

All commands via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, each under `timeout 300` (well inside the required `timeout 300` budget). Store warm throughout (§1). `oc/` and `sys/` fixtures are pre-existing and git-committed at the pinned rev; `verification-rerun-w2/` fixtures were built and `git init -q && git add -A && git commit`ted this round.

```
# devShells (NIX-FLK-18), fixtures/nix-flakes/oc/
nix flake check --no-build --no-write-lock-file ./devshell-packages      exit=0
nix flake check --no-build --no-write-lock-file ./devshell-buildinputs   exit=0
nix flake check --no-build --no-write-lock-file ./devshell-inputsfrom    exit=0
nix develop --no-write-lock-file ./devshell-packages    --command which hello   exit=0  /nix/store/…-hello-2.12.3/bin/hello
nix develop --no-write-lock-file ./devshell-buildinputs --command which hello   exit=0  /nix/store/…-hello-2.12.3/bin/hello
nix develop --no-write-lock-file ./devshell-inputsfrom  --command which hello   exit=1  which: no hello in (…)

# load-bearing run and its control/correction
nix develop --no-write-lock-file fixtures/nix-flakes/skeleton-a --command bash -c 'which cc gcc nixfmt'
  exit=0  cc/gcc -> gcc-wrapper-15.3.0, nixfmt -> nixfmt-1.5.0
nix develop --no-write-lock-file fixtures/verification-rerun-w2/devshell-empty-control --command which cc
  exit=0  /nix/store/…-gcc-wrapper-15.3.0/bin/cc   (bare mkShell {}, no packages/inputsFrom at all)
nix develop --no-write-lock-file fixtures/verification-rerun-w2/devshell-inputsfrom-distinctive --command which pkg-config
  exit=0  /nix/store/…-pkg-config-wrapper-0.29.2/bin/pkg-config   (inputsFrom-only, package needs pkg-config)

# apps vs mainProgram (NIX-FLK-15, candidate 7)
nix run --no-write-lock-file fixtures/nix-flakes/oc/run-mainprogram-set                         exit=0  "ran via mainProgram"
nix run --no-write-lock-file fixtures/nix-flakes/oc/run-apps-output                             exit=1  builder failed (installPhase bug: wrote to /bin not $out/bin)
nix run --no-write-lock-file fixtures/nix-flakes/oc/run-mainprogram-unset                       exit=1  same installPhase bug
nix run --no-write-lock-file fixtures/verification-rerun-w2/run-apps-output-fixed               exit=0  "ran-via-apps"
nix flake check --no-build --no-write-lock-file fixtures/verification-rerun-w2/run-apps-output-fixed          exit=0
nix run --no-write-lock-file fixtures/verification-rerun-w2/run-mainprogram-unset-fixed         exit=1  error: unable to execute '…/bin/octool-pkg': No such file or directory
nix flake check --no-build --no-write-lock-file fixtures/verification-rerun-w2/run-mainprogram-unset-fixed    exit=0

# package-both (NIX-FLK-13), fixtures/nix-flakes/oc/package-both/
nix build --no-write-lock-file ./producer#default                                              exit=0
(cd consumer && nix build --no-write-lock-file .#consumesOctool)                                exit=1  error: access to absolute path '/nix/store/producer/flake.nix' is forbidden in pure evaluation mode
(cd consumer && nix build --no-write-lock-file --override-input producer "path:$ABS_PRODUCER" .#consumesOctool)         exit=0
(cd consumer && nix eval --raw --no-write-lock-file --override-input producer "path:$ABS_PRODUCER" .#consumesShadowedHello.pname)  exit=0  hello-shadowed
nix eval --raw --no-write-lock-file ./producer#default.drvPath                                 exit=0  /nix/store/4w5wqj3nff5li7dcndp1mym13fjs2kyb-octool.drv
(cd consumer && nix eval --raw --no-write-lock-file --override-input producer "path:$ABS_PRODUCER" .#consumesOctool.drvPath)  exit=0  /nix/store/4w5wqj3nff5li7dcndp1mym13fjs2kyb-octool.drv   (identical)

# candidate 9, show vs grep
(cd fixtures/nix-flakes/sys/flake-parts-persystem && nix flake show --json --no-write-lock-file . | jq -r keys)
  exit=0  ["packages"]     (grep of flake.nix ALSO finds "packages" here — inline perSystem, not a hiding case)
(cd fixtures/verification-rerun-w2/flake-parts-imported && nix flake show --json --no-write-lock-file . | jq -r keys)
  exit=0  ["devShells","formatter","packages"]
(cd fixtures/verification-rerun-w2/flake-parts-imported && grep -nE -e 'packages' -e 'devShells' -e 'checks' -e 'formatter' -e 'apps' flake.nix)
  exit=1  (empty)
(cd fixtures/verification-rerun-w2/flake-parts-imported && grep -rnE -e 'packages' -e 'devShells' -e 'formatter' --include='*.nix' .)
  exit=0  modules/outputs.nix:3,4,5   (recursive grep DOES find it — caveat, see Finding 6)

# NIX-FLK-17 .checks half
(cd fixtures/nix-flakes/oc/good && nix flake show --json --no-write-lock-file . | jq -e '.checks."x86_64-linux"')          exit=0
(cd fixtures/nix-flakes/oc/alias-noselfsrc && nix flake show --json --no-write-lock-file . | jq -e '.checks."x86_64-linux"')  exit=4

# implementation matrix, battery1's 18 fixtures, three implementations — full verbatim log kept alongside this file's
# generation transcript; the four divergent rows are quoted in Finding 8. All 14 non-divergent rows matched
# CppNix 2.35.2 exactly on both 2.31.5 and Lix 2.95.2 (legacy-* deprecation warnings, bad-nonderiv-*, bad-unknown-output,
# schemas-output, nixosmodule-nonvalue).
```

## Exemplar evidence

No new exemplar re-measurement was needed for this brief (it is a fixture-rerun brief); the applicable exemplar citations are the ones already in `nix-flakes.md`'s Applied table and are not repeated verbatim here. Two additions this round:

- **NIX-FLK-18 / `inputsFrom`**: no exemplar was re-read this round; the fixture evidence (Finding 2) and the nixpkgs `mkShell` source (Finding 2) are sufficient and primary.
- **Candidate 9 / flake-parts hiding outputs**: `zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix` (already cited in `outputs-contract.md` §9) remains the citation for the fully name-invisible case my planted twin does not reach (Finding 6).
- **NIX-FLK-13 / package-both**: no exemplar directly matches a two-flake `path:`-input overlay consumer at fixture scale; `jj-vcs/jj@f01e70f8e375:flake.nix:22-23,67` (already cited under FLK-13 in `nix-flakes.md`'s Applied table) remains the single-flake overlay/packages exemplar.

## AI-agent angle

1. **Reading `nix develop`'s `PATH` containing `cc`/`gcc` as proof that `inputsFrom` "brought in the toolchain."** It proves nothing about `inputsFrom` specifically — any `mkShell`, empty or not, has `cc` by default (Finding 3). The mechanical check: build a bare `pkgs.mkShell {}` control fixture first, before crediting any specific input.
2. **Assuming `inputsFrom = [ pkg ]` makes `pkg`'s own binary runnable in the shell.** It does not — an agent writing a devShell for "build and use tool X" from `inputsFrom` alone will find `which X` fails. The check: `nix develop . --command which <tool>`, not `nix flake check`.
3. **Treating `apps` as merely "a secondary entry point" and skipping a `nix run` smoke test on a flake that only has `apps`, no `mainProgram`.** `apps` is a first-class, fully working `nix run` path that `nix flake check` cannot validate any better than `mainProgram`; skip the smoke test on either spelling at the same peril.
4. **Trusting a relative `path:../sibling` input inside a monorepo without testing the exact invocation cwd and git-repo boundaries.** It fails specifically when the referencing flake is its own separate git repository (auto-resolves to `git+file://`), not when invoked as a plain directory (`.`) without a `.git` at all — the failure mode is invisible until the flake is actually a git repo, which most real repos are.
5. **Grepping only `flake.nix` to answer "does this flake have a formatter/devShell/checks output" for a flake-parts or blueprint consumer.** `nix flake show --json` is the only reliable read; even then, know that a directory-convention loader defeats a recursive grep too, so `show --json` is not merely "better", it is the only mechanism that evaluates rather than pattern-matches.
6. **Assuming Lix behaves identically to CppNix on `nix flake check`'s hard/soft table.** An overlay written `self: super:` or with swapped argument order passes Lix's check silently; an agent whose only floor-testing was Lix would ship a flake that hard-fails the moment a CppNix (or Determinate) user runs `nix flake check`.
7. **Planting a fixture with a subtly wrong `installPhase` (writing to `/bin` instead of `$out/bin`) and concluding the wrong thing from its failure.** Both `run-apps-output` and `run-mainprogram-unset` failed at build time from this bug, not from the apps/mainProgram distinction they were built to isolate — the mechanical check is reading the actual error line (`failed to produce output path for output 'out'` is a build-phase failure, not `unable to execute … No such file or directory`, which is the `nix run`-resolution failure the fixture was meant to produce).

## Contested / evolving

- **Whether `buildInputs` on `mkShell` should be treated as a lint finding at all.** This round confirms it is functionally identical to `packages`; `nix-quality`-style rules that flag it do so purely on the "the wiki's dated example" argument (outputs-contract §7), not on any measured difference in behavior. As of 2026-09-27 this remains a SHOULD/style position, not a MUST.
- **Lix's overlay/formatter leniency: is it a Lix bug, an intentional simplification, or dormant (to be tightened later)?** Not settled by this round's evidence — the source comment at `checkOverlay`'s `// FIXME: if we have a 'nixpkgs' input, use it to evaluate the overlay.` (`lix/nix/flake.cc`, tag 2.95.2) suggests the check is known-incomplete upstream, not a deliberate final design; the fleet's stance (Q6: Lix advisory only) is unaffected either way, but this is worth re-checking against a later Lix release before promoting Lix past "advisory."
- **How to plant a fixture that defeats even a recursive grep for candidate 9.** As of this round, no fixture in this program isolates the fully attribute-name-invisible (directory-convention-loader) case; it may not be plantable cheaply without vendoring blueprint's actual loader code, in which case the exemplar citation stays the load-bearing evidence indefinitely rather than a temporary gap.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc) | CppNix source, `nix flake check`/`show` implementation | tag 2.35.2, 2026 era | Primary; the exact hard/soft classification CppNix enforces, already the consolidation's anchor, unchanged this round |
| [github.com/NixOS/nix/blob/2.35.2/src/nix/app.cc](https://github.com/NixOS/nix/blob/2.35.2/src/nix/app.cc) | CppNix source, `nix run` app resolution | tag 2.35.2 | Primary; resolution order `mainProgram → pname → name`, no existence check, backs Finding 4 |
| [raw.githubusercontent.com/lix-project/lix/609bc41e…/lix/nix/flake.cc](https://raw.githubusercontent.com/lix-project/lix/609bc41e6f60d750b5bca6b5a8e66cf0c5d5fbe3/lix/nix/flake.cc) | Lix source, `nix flake check` implementation, tag 2.95.2 | fetched 2026-09-27 | Primary, new this round; the exact source proving Lix's `checkOverlay` is arity-only and `formatter` routes through `checkApp` — grounds Finding 8/candidate 9's implementation-matrix claim, not just observed behavior |
| [raw.githubusercontent.com/NixOS/nixpkgs/8d5d2709…/pkgs/build-support/mkshell/default.nix](https://raw.githubusercontent.com/NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439/pkgs/build-support/mkshell/default.nix) | nixpkgs source, `mkShell` implementation, pinned rev | 26.11pre, fetched 2026-09-27 | Primary, new this round; `constructDrv = stdenv.mkDerivation` and the `mergeInputs` comment are the exact source of Findings 2 and 3 |
| [nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check) | Official manual, `nix flake check` | 2.35 manual | Primary; the documented (incomplete — omits `formatter`) contract, already the consolidation's anchor |
| [nix.dev/tutorials/working-with-local-files](https://nix.dev/tutorials/working-with-local-files) | nix.dev tutorial | current, checked 2026-09-27 | Primary; only tracked files enter a git-backed flake, relevant background for the `path:`/monorepo failure in Finding 5 |
| [github.com/NixOS/nix/issues/7107](https://github.com/NixOS/nix/issues/7107) | Nix issue tracker | open, long-running | Primary; the canonical report of the untracked/relative-path confusion class this round's `package-both` monorepo failure sits alongside |
| [raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2611.section.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2611.section.md) | nixpkgs 26.11 release notes | 26.11, current | Primary; era anchor for the pinned nixpkgs rev used in every fixture this round |
| [github.com/numtide/flake-utils/issues/86](https://github.com/numtide/flake-utils/issues/86) | flake-utils deprecation issue | opened 2024, still open 2026-09-27 | Secondary; background for why none of this round's fixtures use flake-utils |
| [flake.parts/options/flake-parts](https://flake.parts/options/flake-parts) | flake-parts option docs | current | Primary for the framework; documents `perSystem`/`imports`, the mechanism `fixtures/verification-rerun-w2/flake-parts-imported/` exercises for candidate 9 |
| [github.com/nix-community/fenix#readme](https://github.com/nix-community/fenix#readme) | fenix README | current | Secondary; the cache-footgun rationale behind NIX-FLK-13's overlay-vs-packages distinction, already cited by the consolidation |
| [jade.fyi/blog/flakes-arent-real/](https://jade.fyi/blog/flakes-arent-real/) | Blog post, Nix contributor | 2024-2025 era, still cited as current framing 2026 | Secondary; the "thin `flake.nix` over `callPackage`d files" framing behind NIX-FLK-13/14 |
| [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes) | Community wiki | actively maintained, checked 2026-09-27 | Secondary; the widely-read `buildInputs`-first devShell example this round's Finding 2/candidate 2 explicitly measures against `packages` |
| [github.com/lix-project/lix (GitHub mirror, tags API)](https://api.github.com/repos/lix-project/lix/tags) | Lix repository tag list | checked 2026-09-27, tag 2.95.2 present (609bc41e), 2.95.3 also present | Primary; version/commit anchor for the exact Lix source read in this round — Lix's canonical host is `git.lix.systems`, mirrored here |
