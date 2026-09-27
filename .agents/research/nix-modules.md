---
title: Modules a flake exports — consolidation (NIX-MOD)
topic: nix-modules
model: opus
id_family: NIX-MOD
consolidates:
  - nix-modules/module-authoring.md
date: 2026-09-27
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-modules/ (this consolidation) and /home/mherwig/.cache/research-lang/nix-tools/fixtures/module-authoring/ (the dive)
toolchain: CppNix 2.35.2 via run.sh; nixpkgs 26.11pre 8d5d270900d3 (evaluation); corpus nixpkgs 9cab9ed832c3 (line citations); flake-parts 31729ca8cbdb
---

# Modules a flake exports (NIX-MOD)

## Verdict

1. **`modules.md` ships, and NIX-MOD is minted.** This overrules the dive's
   decision to fold its rows into other families
   ([module-authoring](nix-modules/module-authoring.md) Summary). The map's
   binding condition is that NIX-MOD ships "only if wave 4 produces rows that pass
   the four selection tests" ([map](nix-topic-map.md) "ID families"). The dive
   itself passed three rows, and this consolidation measured five more. The dive
   added a second criterion, "a feature the fleet does not plan to ship", which
   the map does not contain. That concern is already handled by routing: a depth
   file loads only when a task routes to it. The planned fold targets also turn
   the rows away. NIX-FLK-06 says "the evaluating check itself is left to NIX-MOD"
   ([nix-flakes](nix-flakes.md) Verdict 5 and FLK-06), and NIX-SEC's dive calls
   secret-typed options "NIX-MOD territory"
   ([trust-boundaries](nix-security/trust-boundaries.md):53,154). Folding would
   leave these rules with no family.
2. **Binds shape C (module flakes).** NIX-MOD-08 binds shape B, and only a flake
   that exports `flakeModules`. The fleet's A flakes (ocx, grim, ocx-sdk-python)
   and the D flake generated from the ocx index export no modules (Q7 default).
   NIX-MOD applies to them only if that default changes. An E template that ships
   a module example is bound like a C flake. The canonical NixOS templates are the
   worst violators.
3. **The module-evaluating check runs in the module's real host with the module
   enabled, and forces everything the module declares.** It is not the dive's bare
   `lib.evalModules` that reads one option. Both halves of the dive's check gave
   measured false negatives: bare `evalModules` rejects a correct service module
   (`The option 'systemd' does not exist`), and reading one option passes a type
   error in another option (runs M4b, M4c).
4. **Export modules as paths.** `importApply` does not deduplicate a module that is
   imported twice, and neither does a closure over `self`. Only a path or an
   explicit `key` does (runs M1a–d).
5. **Modules get packages from the consumer's `pkgs`, through a `package` option
   that defaults to `pkgs.callPackage`.** They never inject `nixpkgs.overlays`,
   because that breaks nixpkgs' own recommended `readOnlyPkgs` setup (run M5).
6. **Secret-path options are typed `pathWith { inStore = false; }`.** NIX-MOD owns
   the rule, and NIX-SEC cites it.
7. **Cited, not restated.** The deprecation mechanism is NIX-REL-10(e). Consumer
   `pkgs` is NIX-INP-02. `pkgs.system` is NIX-FLK-12, whose grep is
   directory-agnostic, so it already covers `modules/`. Plural names are
   NIX-FLK-04. "Green is not proof" is NIX-FLK-06.
8. **Dropped.** M-I-01 and M-I-02 (the `mkOption`/`mkIf`/`mkMerge` idiom, which
   models reproduce correctly by default; `mkPackageOption` arity errors are
   caught by NIX-MOD-04 for free). M-I-07 (P3).

## The ruleset

### NIX-MOD

All runs are CppNix 2.35.2 and nixpkgs `8d5d270900d3`, except where a row says
otherwise. Fixture paths are relative to `fixtures/nix-modules/` (F) or
`fixtures/module-authoring/` (D, the dive's). The verification runs are listed
after the tables. "Watched red" means this consolidation or the dive ran the
command on a planted violation and on a compliant twin.

#### Check 1 — export shape: `nix eval` over the module outputs

| ID | Rule | Rationale (failure prevented) | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-MOD-01 | Export every module as a path (`nixosModules.<name> = ./module.nix;`). A module that must close over `self` or `inputs` is exported as `{ key = "<flake-url>#<output>.<name>"; _file = ./module.nix; imports = [ (import ./module.nix self) ]; }`. Never export an inline `{ pkgs, ... }: { … }`, `import ./m.nix self`, or a bare `lib.modules.importApply`. | A consumer that imports the module twice (directly, and through another module that imports it too) fails with ``The option `services.foo.enable' in `<unknown-file>' is already declared in `<unknown-file>'``. Anonymous modules are keyed by position. `importApply` only sets `_file`, so it fails the same way, just with a file name in the message. | `nix eval --json .#nixosModules --apply 'ms: builtins.filter (n: !(builtins.isPath ms.${n} \|\| (builtins.isAttrs ms.${n} && ms.${n} ? key))) (builtins.attrNames ms)' \| jq -e 'length == 0'`. Repeat for `homeModules` and `darwinModules`. Exit 0 passes. | **Yes.** F `export-bad` exit 1 (`false`), `export-good` exit 0. Mechanism: F `dup/closure` exit 1, `dup/importapply` exit 1, `dup/keyed` exit 0, `dup/path` exit 0 (M1a–e). Remote run: `github:NixOS/templates/3348e5b6…?dir=rust-web-server` → `["rust-web-server"]`; disko and sops-nix → `[]`. | MUST (C, E) | `lib.modules.importApply` needs nixpkgs ≥24.11 (rl-2411.section.md:1061). The dedup semantics are nixpkgs `lib`, so they are the same on every implementation. Measured on CppNix only. |
| NIX-MOD-02 | Name module outputs by host class: `nixosModules`, `darwinModules`, `homeModules`, `flakeModules`, each with a `default`. `homeManagerModules` and `hmModules` survive only as deprecated aliases, using the NIX-REL-10 and NIX-FLK-04 mechanisms. | home-manager's own flake-parts module defines the output as `homeModules` (`home-manager@7b4c5ec4beda:flake-module.nix:28`), and nix-index-database renamed `hmModules` to `homeModules` behind `lib.warn` (`nix-index-database@9ad722673ab3:flake.nix:49`). Agents copy sops-nix's primary `homeManagerModules` (`sops-nix@2bd00bd9bb35:flake.nix:67-72`). | `grep -rn -E -e '\b(homeManagerModules\|hmModules)\b' --include=flake.nix <dir>`. A hit with no `homeModules` export next to it is a finding. Empty output means no legacy name, which passes. | **Yes.** F `export-bad` exit 0 (hit at `flake.nix:6`), `export-good` exit 1 (empty). | SHOULD (C) | — |
| NIX-MOD-03 | Set `_class` in every exported module file: `"nixos"`, `"darwin"`, `"homeManager"` or `"flake"`. | Every host passes `class` to `evalModules` (nixpkgs `eval-config-minimal.nix:40`, `nix-darwin@4cff07de74b5:eval-config.nix:81`, `home-manager@7b4c5ec4beda:modules/default.nix:32`). A tagged module imported into the wrong host fails at import with ``The module … (class: "homeManager") cannot be imported into a module evaluation that expects class "nixos"``. An untagged one fails later, with an unrelated `option … does not exist`. This matters most for flakes that ship one module per host, like sops-nix. | `grep -L -e '_class' <exported module files>` lists the untagged files. Empty output passes. | **Yes.** F `class/bad` exit 1 with the message above, `class/good` exit 0 (M3). grep: `dup/module.nix` listed, `tree/module.nix` not listed. | SHOULD (C, when more than one host class is exported); CONSIDER otherwise | Measured on nixpkgs `8d5d270900d3`. The release that introduced `class` was not measured (Open questions). |

#### Check 2 — the evaluating check under `checks`: `nix flake check --no-build`

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-MOD-04 | Give every exported module one `checks.<system>` entry. The entry evaluates the module inside its real host: `nixpkgs.lib.nixosSystem { modules = [ self.nixosModules.default { nixpkgs.hostPlatform = "<system>"; boot.isContainer = true; system.stateVersion = "<rel>"; services.<name>.enable = true; } ]; }` for a NixOS module. It forces everything the module declares and defines through `pkgs.writeText "<name>-eval.json" (builtins.toJSON { inherit (cfg.config.services) <name>; inherit (cfg.config.systemd.services.<name>) wantedBy serviceConfig; })`. Bare `lib.evalModules` is allowed only for a module that defines nothing outside its own options. | `nix flake check` never evaluates a module (NIX-FLK-06: `nixosModules.default = 42` passes). Three shortcuts fail in measured ways. Bare `evalModules` rejects a correct service module with ``The option `systemd' does not exist``, even when the module is disabled. `enable = false` hides a type error behind `mkIf`. Reading one option lets a type error in a sibling option through. `toJSON` forces a whole attribute set cheaply, and turns derivations into their `outPath`. | `nix flake check --no-build`: exit 1 is the finding, exit 0 passes, but only on a flake that has the entry. Check 1's reading heuristic (a C flake with no `checks` entry naming its module) catches the missing entry. | **Yes.** F `flake-check-bad` exit 1 (``A definition for option `systemd.services.foo.wantedBy' is not of type `list of string matching the pattern …'``), `flake-check-good` exit 0 in 5.1 s, `flake-check-nocheck` (same bad module) exit 0 (M4a). F `lazy/readone-bad` exit 0 against `lazy/tojson-bad` exit 1 (M4b). `tree/bare-enable-false` exit 1 on a correct module (M4c). `tree/toplevel-module-badtype-disabled` exit 0 (M4d). The dive's bare form: D `eval-check/{good,bad-42,bad-type}` exits 0, 1, 1. | MUST (C, E) | CppNix 2.35.2 measured. FLK-06's gap is identical on 2.31.5 and Lix 2.95.2 ([nix-flakes](nix-flakes.md)). The homeModules and darwinModules hosts were not measured (Open questions). |

#### Check 3 — consumer `pkgs`: evaluate under `readOnlyPkgs`, plus a grep

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-MOD-05 | Never set `nixpkgs.overlays`, `nixpkgs.config` or `nixpkgs.pkgs` in an exported module. Expose the program through a `package` option: `lib.mkPackageOption pkgs "<name>" { }` when the package is in nixpkgs, otherwise a `package` option whose `default = pkgs.callPackage ./package.nix { }`, the same file `packages` builds (NIX-PKG), with a `defaultText`. | nixpkgs' own flake tells flake users to pass `nixpkgs.pkgs` with `nixosModules.readOnlyPkgs` (`nixpkgs@9cab9ed832c3:flake.nix:62,275`). An overlay-injecting module then fails with ``The option `nixpkgs.overlays' is defined multiple times while it's expected to be unique. nixpkgs.overlays is set to read-only``. Defaulting through `pkgs.callPackage` also needs no `self`, so NIX-MOD-01's path export comes free. It also avoids NIX-FLK-12's `self.packages.${…}` lookup, which fails on any system the author did not list. | Grep: `grep -rn -E -e 'nixpkgs\.(overlays\|config\|pkgs)\s*=' --include='*.nix' <module-dir>`. Empty output passes. Eval: evaluate the module with `nixpkgs.nixosModules.readOnlyPkgs` and `nixpkgs.pkgs = pkgs`, forcing `config.system.build.toplevel.drvPath`. Exit 0 passes. | **Yes.** Eval: F `tree/extpkgs-module` exit 0 in 2.9 s, `tree/extpkgs-module-overlay` exit 1 with the message above (M5). grep: `module-overlay.nix:3` hit (exit 0), `module.nix` empty (exit 1). | MUST (C, E) | nixpkgs `8d5d270900d3`. `readOnlyPkgs` is present at `9cab9ed832c3`. |

#### Check 4 — option types: an eval probe that assigns a store path

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-MOD-06 | Type every option that holds the *path* of a secret (a password, key, token, credentials or environment file) as `lib.types.pathWith { inStore = false; }`, or `nullOr`/`listOf` of it. Never use `types.path`, `types.str` or a hand-rolled `mkOptionType`. `pathWith` takes named arguments and throws at construction time on `{ inStore = true; absolute = false; }`. | The NixOS manual documents `pathWith { inStore = false; }` as the type for "password files that shouldn't be leaked into the store". `types.path` accepts a world-readable `/nix/store/…` path without complaint. A hand-rolled predicate works, but duplicates `lib`: sops-nix carries the same seven-line `pathNotInStore` three times. | Probe: evaluate the module with the option set to `"${pkgs.writeText "x" "secret"}"`. It must exit 1 with `is not of type 'path not in the Nix store'`. Candidate grep: `grep -rn -E -e 'types\.path\b' -e 'hasStorePathPrefix' --include='*.nix' <module-dir>`. A hit on an option that holds a secret is a finding; a hit on a store-bound option (`sopsFile`) is not. Empty output passes. | **Yes.** Probe: F `secret/bad` (`types.path`) exit 0, printing the store path (the leak is accepted). `secret/good` exit 1. `secret/hand` exit 1 (M6). The dive's D `secret-path/{good,bad}` exits 0 and 1. grep: bad hit, good empty, hand hit. | MUST (C) | Measured on nixpkgs `8d5d270900d3` (`lib/types.nix:656-661` at `9cab9ed832c3`). The release that introduced `pathWith` was not measured. |
| NIX-MOD-07 | Expose structured program configuration as RFC 42 `settings`: a `submodule` with `freeformType = (pkgs.formats.<fmt> { }).type`, typed sub-options for the keys the module reads, and the file rendered with `.generate`. Keep an `extraConfig` of `types.lines` only for formats that nixpkgs cannot generate. | `extraConfig` has no merge semantics, `mkDefault` and `mkForce` do not apply to substrings, and the values cannot be inspected (RFC 42). The most-copied module collection teaches it by volume: `home-manager@7b4c5ec4beda:modules/` has 98 files declaring `extraConfig = mkOption` against 56 using `freeformType`. | `grep -rn -E -e 'extraConfig\s*=\s*(lib\.)?mkOption' --include='*.nix' <module-dir>`. A hit on a module whose program reads JSON, TOML, YAML or INI is a finding. Empty output passes. | **Yes.** F `rfc42/bad` hit (exit 0), `rfc42/good` empty (exit 1). The dive's D `eval-check/good.nix` evaluates the settings shape (exit 0, `8080`). | SHOULD (C) | RFC 42 is accepted. `pkgs.formats` measured on `8d5d270900d3`. |

#### Check 5 — flake-parts smoke consumer: `nix eval .#<output>`

| ID | Rule | Rationale | Verification | Watched red? | Severity | Floor / impl |
|---|---|---|---|---|---|---|
| NIX-MOD-08 | A flake-parts module declares flake-level options under `options.flake.<name>` and per-system options under `perSystem`, never at the file's top level. It is exported at `flakeModules.<name>` and `flakeModules.default`. The exporting flake imports its own module in its `mkFlake` (dogfooding), and CI evaluates one output that the module produces. | A top-level option is accepted silently: the consumer's value is merged into the flake-parts evaluation but never reaches the flake's outputs, and `nix flake check` passes. flake-parts' own `flakeModules` option already adds `_file`, `key` and `_class = "flake"` (`flake-parts@31729ca8cbdb:extras/flakeModules.nix`), so NIX-MOD-01 and NIX-MOD-03 come free. | `nix eval .#<output>.<example>` on the dogfooding flake. Exit 0 passes. | **Yes.** F `flake-parts-bad` exit 1 (`does not provide attribute … 'fooConfigurations.example'`) while `nix flake check --no-build` exits 0 on the same flake. `flake-parts-good` exit 0 (`"configured"`) (M8). | MUST (B, exporting `flakeModules` only) | flake-parts `31729ca8cbdb`, CppNix 2.35.2 |

#### Verification runs (this consolidation)

Every command below ran from `/home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-modules/`
through `run.sh`. `common.nix` pins `builtins.getFlake "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439"`.
`--impure` is used only for `getFlake` on the program's own fixtures, never on
third-party code. Every flake fixture ran `git init -q && git add -A` first.

| # | Command | Exit | Relevant output |
|---|---|---|---|
| M1a | `nix eval --impure --file dup/closure.nix` | 1 | ``The option `services.foo.enable' in `<unknown-file>' is already declared in `<unknown-file>'`` |
| M1b | `… dup/importapply.nix` | 1 | same error, naming `dup/module-self.nix` twice |
| M1c | `… dup/keyed.nix` | 0 | `true` |
| M1d | `… dup/path.nix` | 0 | `true` |
| M1e | `nix eval --json .#nixosModules --apply '<Check 1 filter>' \| jq -e 'length == 0'` in `export-bad` / `export-good` | 1 / 0 | `false` / `true` |
| M1f | the same filter with `--no-write-lock-file` on `github:NixOS/templates/3348e5b68b7a53c1ef9d20605c3cad169f65899a?dir=rust-web-server`, `github:nix-community/disko/725ea35e410ad83be4931d1bff7e090eacaf3563`, `github:Mic92/sops-nix/2bd00bd9bb35fe6d114888c8f1c2e946c541dd8f` | 0 each (eval) | `["rust-web-server"]` / `[]` / `[]` |
| M2 | `grep -rn -E -e '\b(homeManagerModules\|hmModules)\b' --include=flake.nix nix-modules/export-{bad,good}` | 0 / 1 | `export-bad/flake.nix:6: homeManagerModules.default = ./module.nix;` / empty |
| M3 | `nix eval --impure --file class/bad.nix` / `class/good.nix` | 1 / 0 | ``Verify that the module's `_class`, "homeManager" matches the expected `class` "nixos".`` / `{ }` |
| M4a | `nix flake check --no-build` in `flake-check-{good,bad,nocheck}` | 0 / 1 / 0 | bad: ``A definition for option `systemd.services.foo.wantedBy' is not of type …``; good 5.13 s; nocheck 0.82 s with the same broken module |
| M4b | `nix eval --impure --file lazy/{readone,tojson}-{bad,good}.nix` | readone-bad **0**, tojson-bad 1, both good 0 | ``A definition for option `services.foo.user' is not of type `string'`` only when forced through `toJSON` |
| M4c | `… tree/bare-enable-{false,true}.nix` (a correct module) | 1 / 1 | ``The option `systemd' does not exist`` |
| M4d | `… tree/nixos-module.nix` / `nixos-module-badtype.nix` (targeted) / `toplevel-module*.nix` / `toplevel-module-badtype-disabled.nix` | 0 (1.70 s) / 1 / 0 (5.60 s), 1 / **0** | a targeted read costs a third of `toplevel.drvPath`; `enable = false` hides the type error |
| M5 | `… tree/extpkgs-module.nix` / `extpkgs-module-overlay.nix` | 0 (2.89 s) / 1 | ``The option `nixpkgs.overlays' is defined multiple times … nixpkgs.overlays is set to read-only``; grep hit `module-overlay.nix:3`, twin empty |
| M6 | `… secret/{bad,good,hand}/storepath.nix` | **0** / 1 / 1 | bad prints `"/nix/store/rd13mhk0…-foo-password"`; good: ``is not of type `path not in the Nix store'`` |
| M7 | `grep -rn -E -e 'extraConfig\s*=\s*(lib\.)?mkOption' --include='*.nix' nix-modules/rfc42/{bad,good}` | 0 / 1 | hit / empty |
| M8 | `nix eval .#fooConfigurations.example` in `flake-parts-{bad,good}`, and `nix flake check --no-build` in `flake-parts-bad` | 1 / 0, check 0 | `does not provide attribute 'packages.x86_64-linux.fooConfigurations.example', … or 'fooConfigurations.example'` / `"configured"` |

For each grep, empty output means no candidate was found, which is the passing
state. It does not mean the check failed to run: each grep was watched producing
a hit on its planted violation. No command was blocked or timed out.

## Applied to the exemplars and the future consumers

| Rule | Satisfied by | Violated by |
|---|---|---|
| MOD-01 | `nix-community/disko@725ea35e410a:flake.nix:33-37`; `Mic92/sops-nix@2bd00bd9bb35:flake.nix:63-76`; `nix-community/home-manager@7b4c5ec4beda:flake.nix:13-26`; `nix-community/nix-index-database@9ad722673ab3:flake.nix:44-60` (all path exports) | `NixOS/templates@3348e5b68b7a:rust-web-server/flake.nix:111`, `c-hello/flake.nix:67`, `bash-hello/flake.nix:78`, `full/flake.nix:149` (inline closures; M1f measured the first) |
| MOD-02 | home-manager `flake-module.nix:28`; nix-index-database `flake.nix:49-54` | `Mic92/sops-nix@2bd00bd9bb35:flake.nix:67` (`homeManagerModules` is primary; `homeModules` at :72 is only an alias) |
| MOD-03 | flake-parts `extras/flakeModules.nix` and home-manager `flake-module.nix:28-35` inject `_class` in their output options | 0 files carry `_class` in sops-nix, disko, nix-index-database or nix-darwin (grep count). sops-nix ships nixos, home-manager and darwin variants of the same module untagged |
| MOD-04 | `nix-community/nix-index-database@9ad722673ab3:flake.nix:61-67` (a `runTest` check; heavier than MOD-04, but it evaluates the module) | the dive found no cheap evaluating check in sops-nix, disko or home-manager, which rely on VM tests ([module-authoring](nix-modules/module-authoring.md) Exemplar evidence row 1); NixOS/templates `c-hello` and `bash-hello` import the module only inside a VM test |
| MOD-05 | `Mic92/sops-nix@2bd00bd9bb35:modules/sops/default.nix:276-277` (`pkgs.callPackage ../.. { }` with `defaultText`); `nix-index-database@9ad722673ab3:nixos-module.nix:8` | `NixOS/templates@3348e5b68b7a:rust-web-server/flake.nix:114`, `c-hello/flake.nix:70`, `bash-hello/flake.nix:81` (`nixpkgs.overlays = [ self.overlay… ]`) |
| MOD-06 | `nix-community/home-manager@7b4c5ec4beda:modules/services/syncthing.nix:664-668` (`pathWith { inStore = false; absolute = true; }`) | `Mic92/sops-nix@2bd00bd9bb35:modules/sops/default.nix:365,385` (`age.sshKeyPaths`, `gnupg.sshKeyPaths`: private-key paths typed `listOf types.path`); `:19-25` plus two copies (hand-rolled `pathNotInStore`) |
| MOD-07 | home-manager: 56 files with `freeformType` (for example `modules/programs/pandoc.nix:20`) | home-manager: 98 files declaring `extraConfig = mkOption` (not every one is a violation; formats without a generator are exempt) |
| MOD-08 | `nix-community/disko@725ea35e410a:flake-module.nix` (`options.flake.diskoConfigurations`) with `flake.nix:35-37` | none measured (planted only) |

**New commitments.**
- **Fleet A flakes** (ocx, grim, ocx-sdk-python, setup-ocx) export no modules
  under Q7's default. The moment one ships (for example `homeModules.ocx`), it
  takes MOD-01 through MOD-06 as MUST/SHOULD from its first commit. The module
  lives in `nix/module.nix` next to `package.nix` and defaults `package` through
  `pkgs.callPackage ../package.nix { }` (MOD-05), so it never needs `self`.
- **The ocx generated flake (D)** exports no module (NIX-GEN). If a
  `programs.ocx-packages` module is ever proposed, MOD-05 decides that it takes
  packages from the generated overlay the consumer applies, never by injecting
  `nixpkgs.overlays` itself.
- **Adopters (c)** copying a NixOS template module must rewrite it: a path export,
  no overlay injection, and a `package` option (MOD-01, MOD-05).

## AI-agent failure modes

Ranked by how often they bite, judged from exemplar prevalence and how easily
training data supplies the wrong pattern.

1. **Copying the NixOS template module shape**: an inline closure that sets
   `nixpkgs.overlays = [ self.overlay ]`. All three NixOS/templates module
   examples do this, and they are the first search hit. Check: MOD-01's
   `nix eval … | jq -e` and MOD-05's grep.
2. **Treating a green `nix flake check` as proof that the module works**, then
   adding a check that reads one option, or evaluates with `enable = false`.
   Both pass a broken module (M4b, M4d). Check: MOD-04's `flake-check-bad`
   pattern, which exits 1 on a planted type error.
3. **Checking a service module with bare `lib.evalModules`** (the dive's own
   first draft), getting ``The option `systemd' does not exist``, and "fixing"
   it by removing the `systemd` definitions or by stubbing options. Check:
   MOD-04's rule that a host-touching module is evaluated through its host.
4. **Reaching for `importApply` to pass `self`** and assuming it deduplicates.
   Check: MOD-01's filter, since an `importApply` result has no `key`.
5. **Typing a key or password path as `types.path` or `types.str`**, or
   copy-pasting sops-nix's `pathNotInStore`. Check: MOD-06's store-path probe
   (exit 1 expected) plus its grep.
6. **Emitting `extraConfig = mkOption { type = types.lines; }`** for a JSON,
   TOML or YAML program, following home-manager's majority. Check: MOD-07's
   grep.
7. **Writing `homeManagerModules` as the primary output**, or a singular
   `nixosModule` or `flakeModule` (NIX-FLK-04). Check: MOD-02's grep, and
   FLK-04's `is deprecated; use` count.
8. **Declaring a flake-parts option at the module's top level.** Nothing reports
   it. Check: MOD-08's dogfood `nix eval .#<output>`.
9. **Guessing `mkPackageOption pkgs "x"` without the trailing `{ }`**, or passing
   `pathWith` positional arguments ([module-authoring](nix-modules/module-authoring.md)
   Findings 3 and 5). Check: none of its own; MOD-04 forces evaluation, so the
   arity error surfaces there.
10. **Indexing `self.packages.${pkgs.system}` inside a module.** It returns the
    right value with one rename warning per evaluation (the dive's
    `self-packages-system` twin: 1 warning against 0). Check: NIX-FLK-12's grep,
    which already covers `modules/`. MOD-05 removes the lookup entirely.

## Open questions

**Owner decisions (defaults applied):**
- **Q7: will a fleet flake export a module?** Default: no. `modules.md` ships
  anyway, for adopters (c) and for templates. If `homeModules.ocx` is proposed,
  NIX-MOD binds it from the first commit.
- **Should `modules.md` be listed in the index's non-negotiables?** Default: no.
  Only the routing-table row, "writing a NixOS, home-manager, nix-darwin or
  flake-parts module a flake exports", points to it. The row's "(only if
  `modules.md` ships)" qualifier is removed at authoring time.
- **NIX-SEC cross-reference.** Default: `security.md` cites NIX-MOD-06 for
  module-typed secret paths and does not restate it. The NIX-SEC consolidation
  (not yet written) should adopt this.

**Needs another round:**
- **modules/other-hosts:** what is the cheapest eval-only host for the MOD-04
  check on `homeModules` (home-manager's `homeManagerConfiguration`) and
  `darwinModules` (nix-darwin's `darwinSystem` evaluated on an x86_64-linux
  runner)? Is a stub host acceptable? Neither was measured; MOD-04's recipe is
  NixOS-only.
- **modules/version-floors:** which nixpkgs release introduced `evalModules`'s
  `class` / `_class` check and `types.pathWith`? The answer sets whether
  MOD-03 and MOD-06 need a fallback (`types.externalPath`, no tag) for consumers
  pinned to older stable branches. The NIX-SEC dive also notes an
  `externalPath` caveat that should be reconciled at the same time.
- **Held-out round (wave 5):** run Checks 1 to 5 verbatim over module flakes
  outside the corpus (for example agenix, impermanence, nixos-hardware,
  stylix), and rerun M1 and M4 on CppNix 2.31.5 and Lix 2.95.2. The module
  system is nixpkgs `lib`, so no difference is expected, but that has not been
  measured.

## Sub-artifacts

- [nix-modules/module-authoring.md](nix-modules/module-authoring.md): the wave-4
  dive. Covers option-helper shapes (`mkPackageOption` arity, `pathWith` named
  arguments), the RFC 42 pattern, the secret-path gap in sops-nix, the
  `pkgs.system` module twin, the flake-parts module shape, and the dive's
  "fold, do not ship" decision, which this consolidation overrules.

## Key sources

- NixOS manual, Writing NixOS Modules: https://nixos.org/manual/nixos/unstable/#sec-writing-modules
- NixOS manual, Option Types (`pathWith`, `pkgs.formats`, `freeformType`): https://nixos.org/manual/nixos/unstable/#sec-option-types
- nix.dev, module system deep dive: https://nix.dev/tutorials/module-system/deep-dive
- RFC 42, structural `settings`: https://github.com/NixOS/rfcs/blob/master/rfcs/0042-config-option.md
- nixpkgs `lib/modules.nix` (`evalModules`, `class`, `importApply`): https://github.com/NixOS/nixpkgs/blob/8d5d270900d3fc75655ea2d9d248b234f6631439/lib/modules.nix
- nixpkgs `lib/types.nix` (`pathWith`, `externalPath`): https://github.com/NixOS/nixpkgs/blob/8d5d270900d3fc75655ea2d9d248b234f6631439/lib/types.nix
- nixpkgs `lib/options.nix` (`mkPackageOption`): https://github.com/NixOS/nixpkgs/blob/8d5d270900d3fc75655ea2d9d248b234f6631439/lib/options.nix
- nixpkgs `flake.nix` (`readOnlyPkgs` recommendation) and `nixos/modules/misc/nixpkgs/read-only.nix`: https://github.com/NixOS/nixpkgs/blob/9cab9ed832c3e8665d945418b954d518af1c629e/flake.nix
- nixpkgs 24.11 release notes (`lib.importApply`): https://github.com/NixOS/nixpkgs/blob/9cab9ed832c3e8665d945418b954d518af1c629e/nixos/doc/manual/release-notes/rl-2411.section.md
- flake-parts, module arguments: https://flake.parts/module-arguments.html
- flake-parts `extras/flakeModules.nix` (automatic `key`/`_class`): https://github.com/hercules-ci/flake-parts/blob/31729ca8cbdb4fa927b34e5f4353e6a83f39e993/extras/flakeModules.nix
- home-manager `flake-module.nix` (`homeModules`, `_class`): https://github.com/nix-community/home-manager/blob/7b4c5ec4bedaf1e062bbc1bcaeddbc6bd242aa1b/flake-module.nix
- sops-nix module (the `pathNotInStore` and `sshKeyPaths` findings): https://github.com/Mic92/sops-nix/blob/2bd00bd9bb35fe6d114888c8f1c2e946c541dd8f/modules/sops/default.nix
- NixOS/templates `rust-web-server` (MOD-01 and MOD-05 violations): https://github.com/NixOS/templates/blob/3348e5b68b7a53c1ef9d20605c3cad169f65899a/rust-web-server/flake.nix
