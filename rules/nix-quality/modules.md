---
title: Modules a Flake Exports
summary: The NIX-MOD family, owning how a flake exports NixOS, home-manager, nix-darwin and flake-parts modules, the check that evaluates them, how they take packages, and how they type secret paths and settings
---

# Modules a Flake Exports

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`. Floor `nix_2_31` = 2.31.5. Lix 2.95.2. nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns every module a flake exports under `nixosModules`, `homeModules`,
`darwinModules` or `flakeModules`: the export shape, the host class tag, the
`checks` entry that evaluates the module in its real host, where the module
gets its packages, the type of a secret-path option, the `settings` shape, and
the flake-parts module contract. The output names and their plural form, the
"a green `nix flake check` proves nothing about modules" rule and the
`pkgs.system` rename are NIX-FLK (NIX-FLK-04, NIX-FLK-06, NIX-FLK-12). Taking
the consumer's `pkgs` rather than a pinned nixpkgs is NIX-INP-02. The
`package.nix` a module defaults to is NIX-PKG. Deprecating a renamed option or
output is NIX-REL-10. NIX-SEC cites NIX-MOD-06 for secret paths and does not
restate it. Running the gate is NIX-GATE.

Contents: [Dates and Floors](#dates-and-floors) · [Export Shape](#export-shape) ·
[The Evaluating Check](#the-evaluating-check) · [Option Types](#option-types) ·
[flake-parts Modules](#flake-parts-modules) · [Applied Evidence](#applied-evidence-held-out-round-2026-09-27) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **The module system is nixpkgs `lib`**, so a row's behaviour follows the
  consumer's nixpkgs, not the Nix implementation. Every row was measured on
  CppNix 2.35.2 only. CppNix 2.31.5 and Lix 2.95.2 are expected to match and
  are unmeasured (re-check at the next held-out round).
- **`types.pathWith`, the `_class` import check and `lib.modules.importApply`**
  are all present on `nixos-25.11` (`b6018f87`) and `nixos-26.05` (`5e2305d5`),
  probed 2026-09-27 with `nix eval --json github:NixOS/nixpkgs/nixos-26.05#lib.types --apply 't: t ? pathWith'`
  (`true` on both, cold store). No supported branch needs a fallback.
  `importApply` needs nixpkgs 24.11 or later.
- **`nixosModules.readOnlyPkgs`** and `pkgs.formats` measured on nixpkgs 26.11pre
  `8d5d2709`. flake-parts measured at `31729ca8`.
- **Shapes.** A app, B library, C module flake, D generated, E template. An E
  template that ships a module example is bound as C. NIX-MOD-08 binds B only
  when it exports `flakeModules`.
- **Pinned default (override once):** an application (A) or generated (D)
  flake exports no module. The first module it does export takes every row
  here from its first commit.
- **Pinned default (override once):** the module lives at `nix/module.nix`
  and defaults its `package` to `pkgs.callPackage ../package.nix { }`, with
  `package.nix` at the repository root. Every grep below runs over `.` and each
  hit is read. Only code an exported module output reaches is in scope: a
  hit in a test, an example, a host configuration (`nixosConfigurations`, a VM
  definition) or NIX-MOD-04's `checks` recipe, whose `nixpkgs.pkgs = pkgs;`
  configures the host, is not a finding (watched 2026-09-27: home-manager's
  tests and microvm's examples). A grep given a directory that does not exist
  exits 2 with `No such file or directory` and empty stdout, never a pass.

Every grep is a violation locator: empty output is the pass and a printed line
in scope is the finding. Every command was watched red on a planted violation and green
on its twin on 2026-09-27 (warm store for nixpkgs `8d5d2709`, cold for
flake-parts).

## Export Shape

```sh
# NIX-MOD-01 filter: prints true, exit 0, when every module is a path or carries a key
nix eval --json .#nixosModules --apply 'ms: builtins.filter (n: !(builtins.isPath ms.${n} || (builtins.isAttrs ms.${n} && ms.${n} ? key))) (builtins.attrNames ms)' | jq -e 'length == 0'
grep -rn -w -e 'homeManagerModules' -e 'hmModules' --include='flake.nix' .
grep -L -e '_class' nix/module.nix   # run on each file a module output exports; substitute each path
```

Run the filter once per exported output (`nixosModules`, `homeModules`,
`darwinModules`). A `does not provide attribute` error means the flake does
not export that output, which is not a finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-MOD-01 | Export every module as a path (`nixosModules.foo = ./nix/module.nix;`). A module that must close over `self` or `inputs` is exported as `{ key = "github:owner/repo#nixosModules.foo"; _file = ./nix/module.nix; imports = [ (import ./nix/module.nix self) ]; }`. Never export an inline `{ pkgs, ... }: { … }`, `import ./m.nix self` or a bare `lib.modules.importApply`. | A consumer that imports the module twice (directly and through another module) fails with ``The option `services.foo.enable' in `<unknown-file>' is already declared``. Only a path or an explicit `key` deduplicates. `importApply` sets `_file` only. | The filter above. `false` with exit 1 is the finding, `true` with exit 0 passes. Watched red: an inline closure prints `false`, exit 1. Green: path exports plus a keyed attrset print `true`, exit 0. | MUST (C, E) | nixpkgs `lib`, identical on every implementation. Measured CppNix 2.35.2 |
| NIX-MOD-02 | Name module outputs by host class, each with a `default`: `nixosModules`, `darwinModules`, `homeModules`, `flakeModules`. `homeManagerModules` and `hmModules` survive only as deprecated aliases (NIX-REL-10, NIX-FLK-04). | home-manager's own flake module defines the output as `homeModules`. Agents copy the `homeManagerModules` primary that sops-nix ships. | The `grep -rn -w` above. Empty output (exit 1) passes. A hit with no `homeModules` export beside it is the finding. Watched red: `homeManagerModules.default` hit, exit 0. Green: empty, exit 1. | SHOULD (C, E) | Naming only, every implementation |
| NIX-MOD-03 | Set `_class` in every exported module file: `"nixos"`, `"darwin"`, `"homeManager"` or `"flake"`. A file exported under more than one host class (one body for `nixosModules` and `darwinModules`) stays untagged. Export a thin tagged wrapper per class that imports it. | A tagged module imported into the wrong host fails at import with ``(class: "homeManager") cannot be imported into a module evaluation that expects class "nixos"``. An untagged one fails later with an unrelated ``option … does not exist``. | The `grep -L` above lists module files with no `_class`. Empty output passes. A listed file that a module output exports is the finding. Judge by output, not exit code: grep 3.12 exits 0 when any file matched, even while it lists another. Watched red: the untagged `nix/module.nix` listed. Green: empty. A listed file that two outputs of different classes export is not a finding. | SHOULD (C, E) when the flake exports more than one host class. CONSIDER otherwise | Import check present on `nixos-25.11` and `nixos-26.05` (probed 2026-09-27) |

```nix
{
  # wrong: an anonymous closure is keyed by position, so a second import redeclares every option
  nixosModules.default =
    { pkgs, ... }:
    {
      nixpkgs.overlays = [ self.overlays.default ];
      environment.systemPackages = [ pkgs.foo ];
    };
}
```

```nix
{
  # right: a path deduplicates, and the module takes its package from the consumer's pkgs
  nixosModules.foo = ./nix/module.nix;
  nixosModules.default = ./nix/module.nix;
}
```

## The Evaluating Check

```sh
nix flake check --no-build
grep -rn -e 'nixpkgs\.overlays[[:space:]]*=' -e 'nixpkgs\.config[[:space:]]*=' -e 'nixpkgs\.pkgs[[:space:]]*=' --include='*.nix' .
```

`nix flake check` never evaluates a module on its own: `nixosModules.default = 42`
passes it (NIX-FLK-06). It evaluates the module only through a `checks` entry,
so a flake with no entry passes with the module broken. Reading heuristic
"module without a check": `nix eval --json .#checks.x86_64-linux --apply builtins.attrNames`
lists the entries, and an exported module that no entry evaluates is the
finding.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-MOD-04 | Give every exported module one `checks.<system>` entry that evaluates it inside its real host with the module enabled, and forces everything the module declares and defines through `pkgs.writeText "foo-module-eval.json" (builtins.toJSON { … })` (the recipe below). Bare `lib.evalModules` is allowed only for a module that defines nothing outside its own options. The principle binds every host. | Three shortcuts pass a broken module. Bare `evalModules` rejects a correct service module with ``The option `systemd' does not exist``. `enable = false` hides a type error behind `mkIf`. Reading one option lets a type error in a sibling option through. `toJSON` forces a whole attrset cheaply and turns derivations into their `outPath`. | `nix flake check --no-build`. Exit 1 is the finding, exit 0 passes only with the entry present (the heuristic above). Watched red: `wantedBy = "multi-user.target"` exits 1 with ``is not of type `list of string …'``. Green: the recipe's twin exits 0 in 1.0 s. The same broken module with no entry exits 0. | MUST (C, E) for `nixosModules`. SHOULD for `homeModules` and `darwinModules` until a host recipe is watched red there | CppNix 2.35.2, nixpkgs `8d5d2709`. No home-manager or nix-darwin host measured |
| NIX-MOD-05 | Never set `nixpkgs.overlays`, `nixpkgs.config` or `nixpkgs.pkgs` in an exported module. Expose the program through a `package` option: `lib.mkPackageOption pkgs "foo" { }` when nixpkgs has it, otherwise `default = pkgs.callPackage ../package.nix { }` (the file `packages` builds) with a `defaultText`. | nixpkgs' own flake tells flake users to pass `nixpkgs.pkgs` with `nixosModules.readOnlyPkgs`. An overlay-injecting module then fails with ``The option `nixpkgs.overlays' is defined multiple times while it's expected to be unique``. `pkgs.callPackage` also needs no `self`, so NIX-MOD-01's path export comes free. | Eval: the recipe below hosts the module under `readOnlyPkgs`, so `nix flake check --no-build` exits 1 on injection. Watched red: a module setting `nixpkgs.overlays` exits 1. Green: twin exits 0. Grep: the second command above. Empty (exit 1) passes. Watched red: `nixpkgs.overlays` hit, exit 0. Green: empty. The grep misses the nested `nixpkgs = { overlays = …; }` form, which the eval catches. | MUST (C, E) | `readOnlyPkgs` measured on nixpkgs `8d5d2709` |

```nix
# checks.${system}.foo-module-eval, inside the flake's per-system map
let
  pkgs = nixpkgs.legacyPackages.${system};
  host = nixpkgs.lib.nixosSystem {
    modules = [
      nixpkgs.nixosModules.readOnlyPkgs
      self.nixosModules.default
      {
        nixpkgs.pkgs = pkgs;
        boot.isContainer = true;
        system.stateVersion = "26.05";
        services.foo.enable = true;
      }
    ];
  };
in
{
  foo-module-eval = pkgs.writeText "foo-module-eval.json" (
    builtins.toJSON {
      inherit (host.config.services) foo;
      inherit (host.config.systemd.services.foo) wantedBy serviceConfig;
    }
  );
}
```

Substitute your option path and the host attributes the module defines, and
set `system.stateVersion` to your nixpkgs release.

## Option Types

```sh
grep -rn -w -e 'types\.path' -e 'attrsOf path' -e 'listOf path' -e 'nullOr path' -e 'type = path' -e 'either [[:alnum:]]* path' -e 'either path' -e 'coercedTo path' -e 'hasStorePathPrefix' --include='*.nix' .
grep -rn -E -e 'extraConfig[[:space:]]*=[[:space:]]*(lib\.)?mkOption' --include='*.nix' .
# NIX-MOD-06 store-path probe: exit 1 with "path not in the Nix store" is the pass
nix eval --impure --expr 'let f = builtins.getFlake (toString ./.); in (f.inputs.nixpkgs.lib.nixosSystem { modules = [ f.nixosModules.default { nixpkgs.hostPlatform = "x86_64-linux"; boot.isContainer = true; system.stateVersion = "26.05"; services.foo.passwordFile = "/nix/store/00000000000000000000000000000000-secret"; } ]; }).config.services.foo.passwordFile'
```

Substitute your secret option for `services.foo.passwordFile`. `--impure` is
there only for `getFlake` on your own tree. Never run the probe on a flake you
do not own.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-MOD-06 | Type every option that holds the path of a secret (password, key, token, credentials or environment file) as `lib.types.pathWith { inStore = false; }`, or `nullOr` or `listOf` of it. Never `types.path`, `types.str` or a hand-rolled `mkOptionType`. `pathWith` takes named arguments only. | `types.path` accepts a world-readable `/nix/store/…` path without complaint. The NixOS manual documents `pathWith { inStore = false; }` for password files. A hand-rolled predicate duplicates `lib`, and sops-nix carries the same one three times. | Probe above: exit 1 with ``is not of type `null or path not in the Nix store'`` passes. Exit 0 printing the store path is the finding (watched red on `types.path`, green on `pathWith`). Grep: the first command above. It also matches the `with types;` spellings (`attrsOf path`, `either str path`, `coercedTo path …`). Watched 2026-09-27: it hits microvm's `credentialFiles`, which the `types\.path` form missed, and a planted `with lib.types; either str path` and `coercedTo path toString str`, which the previous form missed, and it stays empty on a `pathWith` twin. A hit on a secret-holding option is the finding, a hit on a store-bound option (`sopsFile`) is not. Empty (exit 1) passes. Watched red: `types.path` hit, exit 0. Green: empty. | MUST (C, E) | `pathWith` present on `nixos-25.11` and `nixos-26.05` (probed 2026-09-27) |
| NIX-MOD-07 | Expose structured program configuration as RFC 42 `settings`: a `submodule` with `freeformType = (pkgs.formats.json { }).type` (or the program's format), typed sub-options for the keys the module reads, and the file rendered with `.generate`. Keep a `types.lines` `extraConfig` only for a format nixpkgs cannot generate. | `extraConfig` has no merge semantics, `mkDefault` and `mkForce` do not apply to substrings, and its values cannot be inspected. home-manager teaches it by volume, 98 `extraConfig` modules against 56 `freeformType`. | The second grep above. Empty (exit 1) passes. A hit on a module whose program reads JSON, TOML, YAML or INI is the finding. Watched red: an `extraConfig = lib.mkOption` hit, exit 0. Green: the `settings` twin, empty. | SHOULD (C, E) | RFC 42 accepted. `pkgs.formats` measured on nixpkgs `8d5d2709` |

```nix
{
  # wrong: accepts "/nix/store/…-password", world-readable to every local user
  passwordFile = lib.mkOption { type = lib.types.path; };
}
```

```nix
{
  # right: a store path fails evaluation with "path not in the Nix store"
  passwordFile = lib.mkOption {
    type = lib.types.nullOr (lib.types.pathWith { inStore = false; });
    default = null;
  };
}
```

## flake-parts Modules

```sh
nix eval .#fooConfigurations.example
```

Substitute an output your module produces on the exporting flake. `nix flake check --no-build`
exits 0 on the broken flake, so it is no substitute.

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-MOD-08 | A flake-parts module declares flake-level options under `options.flake.<name>` and per-system options under `perSystem`, never at the file's top level. Export it at `flakeModules.<name>` and `flakeModules.default`, import it in the exporting flake's own `mkFlake`, and have CI evaluate one output it produces. | A top-level option is accepted silently: the consumer's value merges into the flake-parts evaluation and never reaches the flake's outputs. flake-parts' `flakeModules` option adds `_file`, `key` and `_class = "flake"`, so NIX-MOD-01 and NIX-MOD-03 come free. | The `nix eval` above on the dogfooding flake. Exit 0 printing the value passes. Exit 1 with ``does not provide attribute … 'fooConfigurations.example'`` is the finding. Watched red: top-level option, exit 1, while `nix flake check --no-build` exits 0. Green: `"configured"`, exit 0. | MUST (B exporting `flakeModules`) | flake-parts `31729ca8`, CppNix 2.35.2 |

```nix
{ lib, ... }:
{
  # wrong: a top-level option, merged and then dropped before the outputs
  options.fooConfigurations = lib.mkOption {
    type = lib.types.lazyAttrsOf lib.types.str;
    default = { };
  };
}
```

```nix
{ lib, ... }:
{
  # right: under options.flake, so the value reaches the flake's outputs
  options.flake.fooConfigurations = lib.mkOption {
    type = lib.types.lazyAttrsOf lib.types.str;
    default = { };
  };
}
```

## Applied Evidence (held-out round 2026-09-27)

- nix-community/impermanence violates NIX-MOD-01 in `flake.nix`: `nixosModules.impermanence = import ./nixos.nix`. Importing it beside `nixosModules.default` fails with ``The option `environment.persistence' … is already declared``.
- ryantm/agenix violates NIX-MOD-06 in `modules/age.nix`: `age.identityPaths` is `listOf types.path` and accepted `/nix/store/0000…-secret` with exit 0.
- astro/microvm.nix violates NIX-MOD-06 in `nixos-modules/microvm/options.nix`: `credentialFiles` is `attrsOf path` under `with types;` and accepted a store path with exit 0.
- NixOS/nixos-hardware violates NIX-MOD-05 in `pine64/pinebook-pro/default.nix`: hosted under `readOnlyPkgs`, it fails with `nixpkgs.overlays` is defined multiple times.
- astro/microvm.nix violates NIX-MOD-05 in `nixos-modules/microvm/optimization.nix`, which sets `nixpkgs.overlays` in an exported module.
- ryantm/agenix violates NIX-MOD-02 in `flake.nix`: it exports `homeManagerModules` with no `homeModules`.
- ryantm/agenix violates NIX-MOD-03 in `modules/age-home.nix`: the file carries no `_class` and is exported only as a home-manager module, while the flake exports nixos, darwin and home modules.

## What Agents Get Wrong Here

1. **Copying the NixOS template module shape**: an inline closure that sets
   `nixpkgs.overlays = [ self.overlay ]`. The first search hit, the NixOS
   `templates` repository, does this in all three of its module examples. Caught
   by NIX-MOD-01's filter and NIX-MOD-05's grep and eval.
2. **Treating a green `nix flake check` as proof the module works**, then
   adding a check that reads one option or sets `enable = false`. Both pass a
   broken module. NIX-MOD-04's recipe exits 1 on the planted type error.
3. **Checking a service module with bare `lib.evalModules`**, getting
   ``The option `systemd' does not exist``, and "fixing" it by deleting the
   `systemd` definitions or stubbing options. NIX-MOD-04 evaluates a
   host-touching module through its host.
4. **Reaching for `importApply` to pass `self`** and assuming it deduplicates.
   NIX-MOD-01's filter flags it, since the result carries no `key`.
5. **Typing a key or password path as `types.path` or `types.str`**, or
   pasting sops-nix's hand-rolled `pathNotInStore`. NIX-MOD-06's probe and grep.
6. **Emitting `extraConfig = mkOption { type = types.lines; }`** for a JSON,
   TOML or YAML program, following home-manager's majority. NIX-MOD-07's grep.
7. **Writing `homeManagerModules` as the primary output**, or a singular
   `nixosModule` or `flakeModule` (NIX-FLK-04). NIX-MOD-02's grep.
8. **Declaring a flake-parts option at the module's top level.** Nothing
   reports it. NIX-MOD-08's dogfood `nix eval`.
9. **Writing `mkPackageOption pkgs "foo"` without the trailing `{ }`**, or
   passing `pathWith` positional arguments. No check of its own: NIX-MOD-04
   forces evaluation, so the arity error surfaces there.
10. **Indexing `self.packages.${pkgs.system}` inside a module.** It warns once
    per evaluation and fails on any system the author did not list. NIX-FLK-12's
    grep covers it, and NIX-MOD-05's `pkgs.callPackage` default removes the
    lookup.
