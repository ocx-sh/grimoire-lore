---
title: The Gate, CI and Implementations
summary: The NIX-GATE family, owning what fails a Nix change and in which order, the formatter package, deadnix, statix, the IFD ban, the all-systems triage, the build step, flake-checker, the CI workflow's pins, installer, cache and runners, and the Lix and floor legs
---

# The Gate, CI and Implementations

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns every command that decides whether a Nix change lands and the CI job that runs them: the formatter package, the format check, dead code, advisory lint, the IFD ban, the `--all-systems` triage, the build step, flake-checker, the workflow's pins, installer, cache and runners, and the implementation legs. The nine-step gate block and its order are the index's. Whether a flake exposes `formatter` and `checks` at all is `NIX-FLK`, and so is an eval-time read through the flake's own source path. The lock-freshness condition is `NIX-INP`. What a derivation's build must prove is `NIX-PKG`. The generated flake's per-update smoke build is `NIX-GEN`. The Nix version CI may run and substituter trust are `NIX-SEC`. The mixed-`rec` construct is `NIX-LANG`. Diagnosing an evaluation error is the `nix-diagnose` skill.

Contents: [Dates and Floors](#dates-and-floors) · [Format: nix fmt and the Name Grep](#format-nix-fmt-and-the-name-grep) ·
[Dead Code: deadnix](#dead-code-deadnix) · [Advisory Lint: statix and nixf-diagnose](#advisory-lint-statix-and-nixf-diagnose) ·
[Schema, IFD and Systems: nix flake check](#schema-ifd-and-systems-nix-flake-check) · [A Real Build](#a-real-build) ·
[Lock Freshness: flake-checker](#lock-freshness-flake-checker) · [The Workflow: Pins, Installer, Cache, Runners](#the-workflow-pins-installer-cache-runners) ·
[Implementation Legs: Lix and the Floor](#implementation-legs-lix-and-the-floor) · [Applied Evidence](#applied-evidence-held-out-round-2026-09-27) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **Tools**, all from nixpkgs 26.11pre `8d5d2709`: nixfmt-tree 2.6.0 (treefmt v2.6.0), statix 0.5.8-unstable-2026-07-17 (the molybdenumsoftware fork), nixf-diagnose 0.1.4. Re-check at each nixpkgs branch-off.
- **CppNix ≥2.32** skips substitutable checks in `nix flake check` (NIX-GATE-10). **CppNix ≥2.34** is the floor of the native `lint-url-literals` option (NIX-GATE-06). `allow-import-from-derivation` defaults to true on 2.35.2.
- **Lix 2.95.2** rejects mixed-`rec` merges and gates `inputs.self` behind `flake-self-attrs`. Lix froze flake support and is moving it into a plugin (2.95 release notes, re-check at each Lix release).
- **Actions**: `cachix/install-nix-action` v31.11.1 (2026-08-13) and `nix-community/cache-nix-action` v7 (2026-01-08). GitHub-hosted runner labels as of 2026-09.
- **Pinned default:** CppNix is the gate of record, Lix and the floor are advisory legs, and Determinate Nix is untested and never deliberately broken. **Pinned default:** no public binary cache, so every CI build really compiles. **Pinned default:** the consumer floor is NIX-GATE-16's computed floor, never a remembered number. An adopter overrides each once.

Every grep here is a violation locator unless its cell says otherwise. Every command was watched red on a planted violation and green on a compliant twin, on a warm store except where a row says cold.

In CI, run the index's gate block as one named target. Its step 2a security lines are NIX-SEC's, carried verbatim: the bracketed patterns (`accept-flake-[c]onfig`, `trusted-[u]sers`, `settings\.access-[t]okens`, `access-[t]okens *=`) and the `[$]{{ secrets[.]` and `[$]{{ github[.]token }}` filter keep the workflow or gate script from matching itself and GitHub from parsing the filter as an expression, and `--exclude-dir=.claude` (your client's directory) skips the installed rules. Write each locator as `if grep …; then exit 1; fi`. A negated `! grep …` never fails a `bash -e` step.

## Format: nix fmt and the Name Grep

```sh
nix fmt -- --ci
grep -rn -e 'nixfmt-rfc-style' -e 'nixfmt-classic' -e 'nixpkgs-fmt' --include='*.nix' .
```

`nix fmt -- --ci` exits 0 with `(0 changed)` on a formatted tree and exits 1 with `Error: unexpected changes detected, --fail-on-change is enabled` otherwise. It writes the fix into the checkout, so run it in a disposable CI checkout. The grep passes on empty output (exit 1). A hit that names the tool as data rather than as this flake's formatter, hook or package passes: a hook library's own hook definitions, a formatter registry, an option example or an unrelated package that shares the name.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-01 | Declare `formatter.<system>` as `pkgs.nixfmt-tree`, or a treefmt-nix wrapper that enables nixfmt. Never bare `pkgs.nixfmt`. | nixfmt formats only the files it is given. A bare `nix fmt` hands it none, so it reads stdin and exits 1 while the author believes the tree is formatted. `nix flake check` also hard-fails a `formatter` that is not a derivation. Whether to declare one at all is NIX-FLK-17. | Plant a misformatted tracked file, run `nix fmt`, then `git status --porcelain --untracked-files=all .`. Pass: exit 0 and the file listed as modified. Finding: exit 1 with `unexpected end of input`. | MUST (every shape that declares `formatter`) | CppNix 2.35.2 `nix fmt` passes no file arguments. nixfmt-tree 2.6.0, present before nixpkgs 25.05 |
| NIX-GATE-02 | Check formatting in CI with `nix fmt -- --ci`, never `nixfmt --check .`. | `--ci` is treefmt's fail-on-change mode. nixfmt's directory mode still runs but warns `Passing directories or non-Nix files (such as ".") is deprecated and will be unsupported soon`. | The section's first command and its exit codes. A treefmt-nix flake may instead expose `checks.<system>.formatting = treefmtEval.config.build.check self`, which turns `nix flake check` red on the same tree. | MUST (every shape that declares `formatter`) | treefmt v2 `--ci`, nixfmt 1.5.0 |
| NIX-GATE-03 | Never write `nixfmt-rfc-style`, `nixfmt-classic` or `nixpkgs-fmt` as a package, hook or formatter in new code. An alejandra repository keeps alejandra. | On nixpkgs 26.11pre `nixfmt-rfc-style` is a `warnAlias` that prints an evaluation warning on every instantiation, `nixfmt-classic` throws (removed 2026-07-01), and `nixpkgs-fmt` is archived (2024-07-24) yet still evaluates, so nothing forces the move. | The section's grep. Empty output (exit 1) is the pass, any hit (exit 0) is the finding. It also catches git-hooks.nix `hooks.nixfmt-rfc-style` and `hooks.nixpkgs-fmt`. | MUST (all shapes) | nixpkgs ≥25.11 rename, the classic throw from 26.11pre (re-check at each nixpkgs release) |
| NIX-GATE-04 | Exclude generated Nix, vendored trees and parser fixtures by directory, with one list shared by the formatter (`settings.excludes` or `settings.formatter.nixfmt.excludes`), deadnix `--exclude` and statix `-i`. | A formatter fights a generator's output, and linters grade code nobody wrote: in `oxalica/nil`, `test_data/` alone produced 596 of 599 statix syntax errors and 670 of 1,914 deadnix findings. A generated `data.json` is not `.nix`, so the list matters only for generated `.nix`. | With a misformatted `generated/data.nix`, `nix fmt -- --ci` exits 1 without the exclude and 0 with `pkgs.nixfmt-tree.override { settings.formatter.nixfmt.excludes = [ "generated/*" ]; }`. Reading heuristic: the three lists name the same directories. | MUST (any shape carrying such files, so every D) | nixfmt-tree `settings` override, nixpkgs 26.11pre |

```nix
{ pkgs, ... }:
{
  # wrong: nixfmt formats only the files it is given, and a bare `nix fmt` gives it none
  formatter.x86_64-linux = pkgs.nixfmt;
}
```

```nix
{ pkgs, ... }:
{
  # right: treefmt walks the tree, and generated Nix stays out of it (NIX-GATE-04)
  formatter.x86_64-linux = pkgs.nixfmt-tree.override {
    settings.formatter.nixfmt.excludes = [ "generated/*" ];
  };
}
```

## Dead Code: deadnix

```sh
deadnix --fail --no-lambda-pattern-names --exclude vendor tests/fixtures -- .
```

List only excluded directories that exist, taken from the NIX-GATE-04 list. Exit 0 with no output is the pass. Exit 1 with a list of unused names is the finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-05 | Gate on `deadnix --fail --no-lambda-pattern-names` over tracked Nix with the NIX-GATE-04 excludes. Fix a survivor by deleting the let binding or `_`-prefixing the positional argument. Never run `deadnix --edit` without `-L`. | Without `-L` deadnix flags the `self` in every `outputs = { self, nixpkgs }:` and every `callPackage` formal. Those are matched by name, so deleting them breaks callers. Without `--fail` it exits 0 on findings, and the step can never go red. | The section's command. Watched red: exit 1 with only `Unused let binding: unused`, and exit 0 with the findings printed when `--fail` is dropped. Plain `deadnix --fail` also prints `Unused lambda pattern: self`, the class `-L` removes. After `-L`, 34 findings survived on six exemplar flakes (NixOS/nixpkgs excluded), each fixed by a `_` prefix or a deletion that broke no caller. | MUST (all shapes) | deadnix ≥1.1 (`# deadnix: skip`), measured on 1.3.2 |

```nix
{ lib, pins }:
{
  # wrong: deadnix -L still reports `name`, a positional argument the signature forces
  versions = lib.mapAttrs (name: pin: pin.version) pins;
}
```

```nix
{ lib, pins }:
{
  # right: the `_` prefix keeps the arity and clears the finding
  versions = lib.mapAttrs (_name: pin: pin.version) pins;
}
```

## Advisory Lint: statix and nixf-diagnose

```sh
statix check -c statix.toml -o errfmt . | grep -e ':W:12:' -e ':W:17:'
grep -rn -e 'nixf-diagnose' .github/workflows
```

The statix line passes on empty output (grep exit 1), and any printed W12 or W17 line is the finding. Other W codes are style and never block. statix without a committed statix.toml prints `config error: path error` and exits 0, which means nothing was checked. The grep passes on empty output (exit 1), and exits 2 when the repository has no `.github/workflows`, which means nothing to check.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-06 | Never make statix a required gate. A repository that runs it commits `statix.toml` with `disabled = ["useless_parens", "repeated_keys", "manual_inherit", "manual_inherit_from", "empty_pattern"]` and acts only on W12 (unquoted URI) and W17 (`builtins.toPath`). | statix's volume is style. W20 targets `foo.a = …; foo.b = …;` by design (`statix explain W20`), and a literal `{ a = 1; a = 3; }` is already `error: attribute 'a' already defined` at evaluation. W10 fires on flake-parts' `{ ... }:`. | The section's statix command. Watched red: `W:12:Consider quoting this URI expression` and `W:17:`, exit 1, with the config committed. Watched green: W20, W10 and W08 on dotted keys, `{ ... }:` and `(1)` exit 1 without the config and 0 with it. | SHOULD (all shapes) | statix 0.5.8-unstable-2026-07-17. The native `--option lint-url-literals fatal` needs CppNix ≥2.34 (2.34.8 exits 1) and is a silent no-op below (2.31.5 prints `unknown setting`, exit 0), so it is never a consumer-floor check |
| NIX-GATE-07 | Run nixf-diagnose only in the editor or a pre-commit hook, with `-i sema-unused-def-lambda-noarg-formal`, never as a CI gate. | nixf-diagnose exits 1 on warnings, so every flake with an unused `self` goes red. Its `merge-diff-rec` also misses the `foo = rec { … }; foo.b = …;` shape of the NIX-LANG-05 mixed-`rec` merge, the one measured cross-implementation divergence. | The section's grep, where a hit is the finding. `nixf-diagnose flake.nix` exits 1 on an unused `self` (`sema-unused-def-lambda-noarg-formal`), and the same command with `-i sema-unused-def-lambda-noarg-formal` exits 0. | CONSIDER (all shapes) | nixf-diagnose 0.1.4, nixpkgs 26.11pre |

## Schema, IFD and Systems: nix flake check

```sh
nix flake check --no-build --option allow-import-from-derivation false
nix flake check --all-systems --no-build
```

Exit 0 with `all checks passed!` is the pass for both. Any other exit is a finding for the first. For the second, read the triage table before editing.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-08 | Ban IFD with `nix flake check --no-build --option allow-import-from-derivation false`. Never treat `--no-build` alone as an IFD ban. | `--no-build` depends on the store. An IFD flake fails on a cold store (`error: path '/nix/store/…-generated-value.nix.drv' is not valid`) and passes once a previous `nix eval` or a warm CI cache realised the IFD output. The option answers the same on every store. This cold-store `.drv` red is a checker limit, and it applies to IFD only. | The section's first command. Finding: exit 1 on a cold and on a warm store. A warm store prints `cannot build '…drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled`, and a cold store prints `path '/nix/store/…drv' is not valid`, a `.drv` path and not the `-source` row of the NIX-GATE-09 table. Pass: exit 0 on the twin. | MUST (B, C, D, and any package aimed at nixpkgs). An A flake whose builder needs IFD drops the option only with a comment naming the builder, and builds that path in CI (NIX-GATE-10) | CppNix 2.35.2 |
| NIX-GATE-09 | Run `nix flake check --all-systems --no-build` after the home-system check, and triage any red against the table below before editing the systems list or the flake. | The home-system check skips foreign systems with only a warning (`The check omitted these incompatible systems: …`). On the exemplar flakes (NixOS/nixpkgs excluded) most `--all-systems` reds came from nixpkgs or a toolchain, and an agent that deletes systems to go green throws the coverage away. | Reading heuristic over the first `error:` line, because one exit code covers most rows. Exit 0 is the pass. A red is classified by the table, and only the rows marked yes are the author's to fix. | MUST (A, B, C, D) for the step. The triage is a reading heuristic | CppNix 2.35.2 and 2.31.5, Lix 2.95.2 (strings per row) |

First name the failing system (evaluate the red output once per system). A red on a system the flake took from `flakeExposed`, `lib.systems.doubles` or `nix-systems/default` is a NIX-FLK-08 finding: iterate a literal list, then triage what remains.

| First error line (CppNix 2.35.2 unless noted) | Cause | Author's fix? |
|---|---|---|
| `Nixpkgs 26.11 has dropped support for x86_64-darwin` | nixpkgs dropped the platform | yes: drop the system (NIX-FLK owns the list) |
| `Refusing to evaluate package '…' … not available on the requested hostPlatform` | a platform-restricted dependency, or the flake's own package on a system its computed list added | no for a dependency, or an optional per-system guard; yes for the flake's own package (NIX-FLK-08) |
| `Package '…' … is marked as broken, refusing to evaluate` | nixpkgs marks a dependency broken on that system (devshell: `formatter.riscv64-linux` needs GHC) | no, or an optional per-system guard |
| `infinite recursion encountered`, nixpkgs path in the trace | a nixpkgs bug | no |
| `cannot bootstrap GHC on this platform` | a toolchain limit | no |
| `Cannot build '…drv'. Reason: platform mismatch Required system: 'aarch64-linux'` (exit 100) | foreign-system IFD | yes: remove the IFD (NIX-GATE-08) |
| `error: path '/nix/store/…drv' is not valid` (a `.drv` path, cold store) | IFD that `--no-build` could not realise | yes: remove the IFD (NIX-GATE-08) |
| `error: path '/nix/store/…-source' is not valid` (CppNix 2.35.2 and 2.31.5), `… did not exist in the store during evaluation` (Lix 2.95.2) | an eval-time read through the flake's own source store path (NIX-FLK-07, NIX-PKG-15), surfaced by `--no-build` on a cold store | yes: read the source-tree path |
| `flake attribute 'checks.<sys>.<n>' is not a derivation` | the flake, or a library it imports | yes |
| `infinite recursion encountered` in the flake's own per-system helper | the flake | yes |

## A Real Build

```sh
set -o pipefail; nix eval --raw .#packages.x86_64-linux --apply 'ps: toString (map (n: ".#packages.x86_64-linux.\\\"" + n + "\\\"") (builtins.attrNames ps))' | xargs -r nix build --no-link --print-build-logs
grep -rn -e 'nix build' -e 'nix-fast-build' .github/workflows
```

Substitute your system for `x86_64-linux` and run once per system the runner can build. The pipeline exits 0 when every package builds and exits 123 with `Cannot build '…'` when one fails. When the package set itself fails to evaluate, `nix eval` builds nothing and `pipefail` makes the line exit 1; without `pipefail` it exits 0. Each name is quoted (`\\\"` reaches `xargs` as `\"`), so an attribute name holding a dot (`0.10.0`) stays one attribute. For the grep, empty output is the finding, unless the workflow calls the index's chained gate target: then run the same grep over the file that defines that target, and a printed line passes.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-10 | Build every package the flake itself defines in CI, not only `.#default`. A green `nix flake check` is not a build. | Since Nix 2.32 `nix flake check` skips checks it can substitute (`running 1 flake checks...` for 2 declared), and it never builds `packages`. `nix build .#default` leaves every other package unbuilt. | The section's pipeline. Watched red: a broken second package exits 123, while `nix build .#default` on the same flake exits 0, and a package set that fails to evaluate exits 1 (0 without `pipefail`). Watched green: exit 0 on the twin. An unquoted `.#packages.x86_64-linux.0.10.0` (mitchellh/zig-overlay) resolves to `"0"."10"."0"` and fails, while the quoted name resolves. The workflow grep: empty output is the finding. | MUST (A: every own package. D: every package whose data changed, built and executed on the update PR per NIX-GEN-15. B and C: build their `checks`) | CppNix ≥2.32 behaviour, measured on 2.35.2 |

Cost note, measured 2026-09-27 on one sample: ocx's per-PR build takes 7m12s on x86_64-linux. A warm vendor derivation saves fetches, not compile time, and any attribute edit to a `buildRustPackage` package recompiles the whole crate graph. Budget CI for it rather than skip the build. NIX-PKG-20 is retired into this note and is not reused.

## Lock Freshness: flake-checker

```sh
flake-checker --no-telemetry --fail-mode --condition "numDaysOld < 30 && ((gitRef == '' && owner == '') || (supportedRefs.contains(gitRef) && owner == 'NixOS'))" flake.lock 2> flake-checker.err
grep -c -e 'Error: Invalid(' -e 'Error: FlakeLock(' flake-checker.err
```

The condition is NIX-INP-06's. Exit 0 from flake-checker is clean. On exit 1 the grep decides: a count of 0 (grep exit 1) is a finding, and a count of 1 or more (grep exit 0) means the tool could not run.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-11 | Run flake-checker as an advisory step with `--fail-mode` and NIX-INP-06's condition on A and D flakes that have a root `nixpkgs` input. Classify stderr containing `Error: Invalid(` or `Error: FlakeLock(` as "tool could not run", and never add a `nixpkgs` input to satisfy it. | Without `--fail-mode` the CLI exits 0 on findings. With it, findings and crashes both exit 1, so the exit code alone cannot tell them apart. flake-parts, flake-utils and crane crash it by having no nixpkgs input, correctly. An `indirect` nixpkgs node (NIX-INP-05) crashes it with the same `Error: Invalid("no nixpkgs dependency found…")`, so a crash on a lock that has a `nixpkgs` input is read as NIX-INP-05's finding. | The section's two commands. Watched: a fresh `nixos-unstable` lock exits 0. A `nixos-25.11` lock exits 1 with a count of 0. A lock with no nixpkgs node and a lock whose root is not a root node both exit 1 with a count of 1. | SHOULD (A and D with a root `nixpkgs` input), advisory | flake-checker 0.2.15, whose binary accepts only the 26.05 and unstable branches although its README lists 25.11. The binary wins (re-check at each flake-checker bump) |

## The Workflow: Pins, Installer, Cache, Runners

```sh
grep -rn -E -e 'uses: [^ ]+@' .github/workflows | grep -v -E -e '@[0-9a-f]{40} ' -e '@[0-9a-f]{40}$'
grep -rn -e '@main' -e 'nix-installer-action' -e 'magic-nix-cache-action@v[0-9]$' -e 'magic-nix-cache-action@v[0-9][^0-9]' -e 'magic-nix-cache-action@v10' .github/workflows
grep -rn -e 'install_url:' .github/workflows
grep -rn -E -e 'magic-nix-cache-action@[0-9a-f]{40} +# *v([0-9]|10)([^0-9]|$)' .github/workflows
grep -rn -e 'install_url:' .github/workflows | grep -v -e 'releases.nixos.org/nix/nix-[0-9]'
```

The first line is the pin check and the second the installer check. Both pass on empty output (exit 1), and each printed line is a finding. For the third, empty output is the finding. Every grep exits 2 when `.github/workflows` does not exist, which means there is no workflow to check. The fourth line catches a SHA-pinned `magic-nix-cache-action` whose version comment is below v11, and passes on empty output (exit 1). The fifth prints every `install_url` that is not a versioned `releases.nixos.org/nix/nix-X.Y.Z/install` URL. Each printed line is read: an expression that resolves to a versioned URL (a matrix value, `${{ env.NIX_VERSION }}`) passes, and an unversioned URL is the finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-12 | Pin every `uses:` in a Nix workflow to a 40-hex commit SHA with a version comment. | `@main` and `@vN` move under the flake. Among 37 exemplar flakes (NixOS/nixpkgs excluded), half the `install-nix-action` uses and all 4 `determinate-nix-action` uses float. | The pin check. Watched red: 5 floating refs printed, exit 0. Watched green: SHA-pinned refs with and without a trailing comment, empty, exit 1. The version comment is read. | MUST (every shape with a Nix workflow) | GitHub Actions, 2026-09 |
| NIX-GATE-13 | Install upstream CppNix with `cachix/install-nix-action` and pin the Nix version with `install_url: https://releases.nixos.org/nix/nix-2.35.2/install` (substitute your version). Use a Determinate installer only when Determinate Nix is the stated intent, and then `determinate-nix-action` SHA-pinned per NIX-GATE-12, never `nix-installer-action`. | `nix-installer-action` installs Determinate Nix by default, and its README calls upstream mode "not a supported configuration". The action SHA fixes Nix only implicitly (v31.11.1 hardcodes 2.35.2), so the next action bump silently changes Nix. | The installer check, where any hit is the finding, then the `install_url:` grep, where empty output is the finding. Watched red on a workflow using `nix-installer-action@main` and no `install_url`, green on its twin. | MUST (every shape with a Nix workflow) | install-nix-action v31.11.1, commit `13d8dd58da0234aa297dedd986986ccb8e7f3e24` (2026-08-13). The installed Nix carries the CVE-2026-39860 fix for its line (NIX-SEC-06) |
| NIX-GATE-14 | Cache the store with `nix-community/cache-nix-action` v7, SHA-pinned, with `primary-key` on `hashFiles('flake.lock')`. Never use `magic-nix-cache-action` below v11 or at `@main`. **Pinned default:** add no public substituter. | The pre-2025 Magic Nix Cache API died on 2025-02-01, and v11 onward is a community revival (v15 current on 2026-09-09). cache-nix-action wraps GitHub's own cache client and GC-bounds the saved store. Neither cache was measured on a real runner. | The installer check catches `magic-nix-cache-action@v2` and `@v9`, while `@v15` stays clean. The fourth line catches the SHA-pinned form (watched: `# v9` hit, exit 0, and `# v15` empty, exit 1). The `primary-key` is a reading heuristic. Substituter trust is NIX-SEC-01's. | SHOULD (every shape with CI) | cache-nix-action v7 (2026-01-08) |
| NIX-GATE-15 | Run the gate on `ubuntu-24.04`, `ubuntu-24.04-arm` and one Apple-silicon macOS runner (`macos-15` or `macos-14`) when the flake declares `aarch64-darwin`. Add no Intel macOS and no Windows runner. | x86_64-darwin throws on nixpkgs 26.11, and no exemplar runs Nix CI on Windows. | Reading heuristic: the set of runner OSes equals the set of OS halves of the declared systems. | SHOULD (A, B, C. A D flake evaluates darwin without building it, for the reason NIX-GEN states) | GitHub-hosted runner labels, 2026-09 (re-check when a label is retired) |

## Implementation Legs: Lix and the Floor

```sh
nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build --extra-experimental-features flake-self-attrs
nix eval --json --inputs-from . nixpkgs#nixVersions --apply 'v: builtins.filter (n: builtins.match "nix_2_[0-9]+" n != null && (builtins.tryEval (v.${n}.version or null)).success) (builtins.attrNames v)'
nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build
```

The first line is the Lix leg. Both legs take nixpkgs from the flake's lock with `--inputs-from .`, never from the global registry, which resolves `nixpkgs` to the latest nixpkgs-unstable. A flake with no `nixpkgs` input (a B flake per NIX-INP-02) falls back to the registry, so pin it there or run the legs from the test sub-flake. The second prints the live `nix_2_*` names in the flake's locked nixpkgs, and its first element is the floor. The third is the floor leg, with `nix_2_31` replaced by that first element. Both legs pass on exit 0 and run as `continue-on-error` jobs.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-GATE-16 | A published A, B or D flake runs two non-blocking legs of the home-system check: Lix, and the floor computed from the locked nixpkgs, never remembered. Add `--extra-experimental-features flake-self-attrs` to the Lix leg when `flake.nix` declares `inputs.self`. Treat a Lix-leg red on a mixed-`rec` merge as a NIX-LANG-05 finding. No flake relies on a Determinate-only feature (NIX-FLK-05). | Lix 2.95 rejects mixed `rec` merges that CppNix accepts silently, and without the flag it rejects every flake declaring `inputs.self`. The flag is a no-op on other flakes, so a workflow may carry it always. nixpkgs prunes old Nix versions: `nix_2_24` and `nix_2_30` throw `has been removed. use nix_2_31`. | Lix leg watched red: `inputs.self.submodules = true` exits 1 with `experimental Lix feature 'flake-self-attrs' is disabled`, green with the flag. A mixed-`rec` fixture exits 1 on Lix (`cannot be merged, because one set is marked as recursive`) and 0 on CppNix 2.35.2 and 2.31.5. The floor expression prints `["nix_2_31","nix_2_34","nix_2_35"]` on `8d5d2709`, and a remembered `nix_2_24` exits 1 naming the floor. | SHOULD for both legs (A, B, D). A mixed-`rec` red is MUST (every shape, NIX-LANG-05), and every other red on either leg is advisory | Floor today `nix_2_31` = 2.31.5, above the CVE-2026-39860 patch (2.31.4). Lix 2.95.2 (re-check at each Lix release) |

## Applied Evidence (held-out round 2026-09-27)

- numtide/devshell violates NIX-GATE-03 in `flake.nix:94`: `formatter = eachSystem ({ pkgs, ... }: pkgs.nixfmt-rfc-style);`. The section's grep hits it; its `modules/commands.nix:170` hit is an option example and passes.
- nix-community/impermanence violates NIX-GATE-03 in `flake.nix:49`: the devShell lists `pkgs.nixpkgs-fmt`, and the section's grep hits it.

## What Agents Get Wrong Here

Ranked by how often the exemplar flakes (NixOS/nixpkgs excluded) and the runs show them.

1. **A CI job that runs `nix flake check` alone**, so formatting, dead code, IFD and real builds go unchecked. Only 14 of 37 exemplar CIs run even that. `grep -rn -e 'nix fmt -- --ci' -e 'deadnix --fail' -e 'allow-import-from-derivation false' -e 'nix build' .github/workflows` must print one line per step, and a missing pattern is a missing step, unless the workflow calls the index's chained gate target: then run the same grep over the file that defines that target, and a printed line passes (NIX-GATE-02, NIX-GATE-05, NIX-GATE-08, NIX-GATE-10).
2. **The wrong formatter name or shape**: `nixfmt-rfc-style`, `nixpkgs-fmt`, or bare `pkgs.nixfmt` (NIX-GATE-01, NIX-GATE-03).
3. **Floating actions**, and `nix-installer-action` assumed to install upstream Nix (NIX-GATE-12, NIX-GATE-13).
4. **deadnix wired without `--fail`**, so the step is always green, as in `ipetkov/crane`'s CI, or `--edit` without `-L`, which deletes `self` and `callPackage` formals (NIX-GATE-05).
5. **"Fixing" an `--all-systems` red by deleting systems**, or dismissing `path '/nix/store/…-source' is not valid` as a checker limit when it is the flake reading its own source store path (NIX-GATE-09, NIX-FLK-07).
6. **Trusting `--no-build` as an IFD ban.** It goes green on a warm store (NIX-GATE-08).
7. **Trusting a green `nix flake check` as a build, or building only `.#default`** (NIX-GATE-10).
8. **Remembering a Nix floor** (`nix_2_24`) instead of computing it. A `has been removed. use nix_2_N` error names the real one (NIX-GATE-16).
9. **Waving off a Lix-leg red because the leg is advisory**, when it is a mixed-`rec` merge, or dropping the leg after `inputs.self` turned it red instead of adding the flag (NIX-GATE-16).
10. **Treating statix W20 or nixf-diagnose warnings as defects**, and merging, deleting or failing CI on them (NIX-GATE-06, NIX-GATE-07).
11. **Reading flake-checker's exit code as its verdict**, or adding a `nixpkgs` input to stop its crash (NIX-GATE-11).
