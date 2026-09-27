---
title: Modules a flake exports — module authoring, the smallest evaluating check, and the ships-or-folds decision
topic: nix-modules/module-authoring
agent: module-authoring
model: sonnet
date_researched: 2026-09-27
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/module-authoring/
scope: |
  Covers NixOS/home-manager/nix-darwin option authoring (mkOption, mkEnableOption,
  mkPackageOption, the RFC 42 settings pattern, secret path types, deprecation
  helpers) and flake-parts module consumability, for a flake that EXPORTS a
  module for other flakes to import. Does not cover NixOS system configuration
  authoring (writing a system's own configuration.nix), and does not re-derive
  NIX-FLK-06 (nix flake check's nixosModules handling), NIX-FLK-12 (pkgs.system),
  NIX-INP-02 (consumer's pkgs) or NIX-REL-10(e) (deprecation mechanism), which
  are already settled and cited, not re-tested, except where a module-specific
  variant needed its own fixture.
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

- **Decision: `modules.md` does not ship. The `NIX-MOD` prefix is never used.** Of the 8 assigned rows, only 3 survive rule-distillation's four-test selection bar, and each folds as a one-line addendum into a file that already exists (`flakes.md`/NIX-FLK or `security.md`/NIX-SEC) rather than founding an eighth depth file for a feature the fleet does not plan to ship (owner Q7 default).
- **M-I-05 (deprecation helpers) is not a new finding — it is `NIX-REL-10(e)`, already settled and already fixture-verified** (`module-rename/good.nix`/`bad.nix`); this dive adds nothing to it and the row is retired as a duplicate.
- **M-I-01/M-I-02 (`mkOption`/`mkEnableOption`/`mkPackageOption` idiom; `mkIf`/`mkMerge`/`mkDefault`/`mkForce` semantics) fail selection test 1.** An agent that has seen `nixpkgs` in training data reproduces these correctly by default; they are manual restatement, not a "wrong by default" trap, so they are dropped rather than folded.
- **M-I-03 (RFC 42 `settings` via `pkgs.formats.<fmt>` + `freeformType`, not a stringly `extraConfig`) is real but not module-export-specific** — it is nixpkgs-wide module-authoring practice; drop from a dedicated family and leave it as one example line if `flakes.md` ever gains a "module authoring" subsection.
- **M-I-04 (a secret path option must use `lib.types.pathWith { inStore = false; }`, never bare `types.path`) survives all four tests and folds into `security.md` (NIX-SEC)**: `sops-nix@2bd00bd9`, the most security-sensitive of the three test targets, still hand-rolls a duplicated `pathNotInStore` type in three module files instead of the built-in one — direct evidence this is a real gap, not hypothetical.
- **M-I-06 (an exported module must read `pkgs.stdenv.hostPlatform.system`, never `pkgs.system`, when indexing `self.packages`) survives and folds into `flakes.md` as an addendum to `NIX-FLK-12`**: planted and measured — indexing `self.packages.${pkgs.system}` inside a module fires the exact same `pkgs/top-level/aliases.nix:2498` rename warning as a top-level flake read, once per evaluation, with the value still correct (a silent-degradation defect, not a crash).
- **M-I-06's other half — a module must take `pkgs` from its own module arguments, never the flake's own nixpkgs input — is already NIX-INP-02 and needs no new fixture**: `Mic92/sops-nix@2bd00bd9:modules/sops/default.nix`, `nix-community/disko@725ea35:module.nix` and `nix-community/home-manager@7b4c5ec:modules/modules.nix:114` all take `pkgs`/`config` purely from the module function's own arguments; none imports its own `nixpkgs` flake input inside the module.
- **M-I-08 (a flake-parts module needs `options.flake.<name>` plus export at `self.flakeModules.default`) survives and folds into `flakes.md`** as the flake-parts-specific half of module authoring, since a fleet flake is far more likely to consume a flake-parts module (treefmt-nix, git-hooks.nix) than to export a NixOS one.
- **`nix flake check` does not evaluate a module's options at all — it only checks `nixosModules.<name>` is present under that attribute name (NIX-FLK-06).** A `nixosModules.default = 42` twin and a `nixosModules.default` with a genuine option-type error both need a second, cheap check that actually calls `lib.evalModules` on the module; this dive plants and measures that check.
- **The smallest such check is `lib.evalModules { modules = [ self.nixosModules.default ]; specialArgs = { inherit pkgs; }; }` forced by reading one option's value** — no `lib.nixosSystem`, no real NixOS option tree, no build. Measured cold-ish (warm store, one nixpkgs fetch already cached): **1.76 s** for the correct module; both broken twins fail in well under a second once evaluation starts.
- **The 42 twin does not fail on "not a module" — it fails later, on `cannot coerce an integer to a string: 42`** inside `lib/modules.nix:404` (`config = checked (removeAttrs config [ "_module" ])`), because `evalModules` treats a non-function, non-attrset list element as an implicit `_file`-carrying value merge that only breaks once something tries to read it as a set. The failure is real and reliable, but its error text does not name the actual mistake — worth stating in the write-up so a reviewer does not chase the wrong lead.
- **`lib.types.pathWith` takes named struct args `{ inStore ? null; absolute ? null; }`, not positional ones**, and it throws at type-construction time (not merge time) if you ask for `inStore = true; absolute = false;` (nixpkgs `lib/types.nix:661-668`) — an agent guessing at the signature from the name alone is likely to pass a bool positionally or invert the throw condition.
- **`lib.types.pathWith { }` (all fields null) exists and is used in the wild for "don't care" paths** (`nix-community/home-manager@7b4c5ec:modules/programs/nvchecker.nix:39,49`), and `types.pathWith { inStore = false; absolute = true; }` is already the exact secret-path idiom this dive was asked to plant, found independently in `nix-community/home-manager@7b4c5ec:modules/services/syncthing.nix:664-668` for `encryptionPasswordFile`.
- **`mkPackageOption`'s real signature takes a list-or-string package path plus an options bag** (`nullable`, `default`, `example`, `extraDescription`, `pkgsText`) and defaults `default` to the same name given (`mkPackageOption pkgs "hello" { }` implies `default = "hello"`) — an agent commonly forgets the extra `{ }` argument is mandatory (nixpkgs `lib/options.nix:309-334`).
- **A `flake-parts` module meant for import declares `options.flake.<name>` (or `perSystem.<name>`), never a bare top-level attribute**, and the exporting flake sets `flakeModules.default = self.flakeModules.<name>` by convention, matching `flake-parts` itself, which auto-tags every entry under its own `flakeModules` option with `_file`/`key`/`_class = "flake"` (`hercules-ci/flake-parts@31729ca:extras/flakeModules.nix`).
- All five planted checks in this dive were run to completion (not blocked, no timeout): three eval-check variants, one system-warning-count pair, one secret-path-type pair.

## Findings

### 1. `nix flake check` does not evaluate module contents (already settled; this dive's evaluating check answers it)

[NIX-FLK-06](../nix-flakes.md) already measured that `nixosModules.default = 42` **passes** `nix flake check` on CppNix 2.35.2, 2.31.5 and Lix — the checker only verifies the attribute exists under the right name, never that it evaluates as a module. That leaves two classes of defect a published flake's module can carry silently past the standard gate:

1. The export is not a module at all (a stray literal, an accidental package reference, a typo'd `self.nixosModule` singular).
2. The export is a module, but a definition inside it — or an option's own default — fails NixOS's type check once something actually merges it.

Neither is caught by `nix flake check`, `nix flake check --all-systems`, `statix`, `deadnix` or `nixfmt`: all five are either schema-shape checkers or formatters, none of them instantiates the module system. The only way to catch either class is to actually call `lib.evalModules` (or `lib.nixosSystem`) somewhere a check can see it fail.

### 2. The smallest module-evaluating check

```nix
# eval-check/good.nix (fixtures/module-authoring/eval-check/good.nix)
let
  flake = builtins.getFlake "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439";
  lib = flake.lib;
  pkgs = flake.legacyPackages.x86_64-linux;
  nixosModulesDefault = { lib, pkgs, ... }: {
    options.services.foo = {
      enable = lib.mkEnableOption "foo";
      package = lib.mkPackageOption pkgs "hello" { };
      settings = lib.mkOption {
        type = lib.types.submodule {
          freeformType = (pkgs.formats.json { }).type;
          options.port = lib.mkOption { type = lib.types.port; default = 8080; };
        };
        default = { };
      };
    };
  };
  evaled = lib.evalModules {
    modules = [ nixosModulesDefault ];
    specialArgs = { inherit pkgs; };
  };
in evaled.config.services.foo.settings.port
```

Run with `nix eval --impure --file eval-check/good.nix` (the same `builtins.getFlake`-pinned-lib idiom [NIX-REL-10(e)](../nix-release.md) already established for `module-rename/good.nix`). It returns `8080`, exit 0, in 1.76 s warm.

To wire this into a real flake's `checks` attribute (not run in this dive, since it adds build cost the eval-only form does not need): put the same `lib.evalModules` call's result into a derivation's `name` string, e.g. `checks.${system}.modules-eval = pkgs.runCommand "modules-eval-${toString evaled.config.services.foo.settings.port}" { } "touch $out";` — `nix flake check --no-build` still forces derivation names to compute `drvPath`, so the module is evaluated without anything being built.

The two broken twins:

- **`eval-check/bad-42.nix`** sets `nixosModulesDefault = 42;` and feeds it to the same `evalModules` call. It fails, but not where you'd expect: the error is `cannot coerce an integer to a string: 42`, raised from `lib/modules.nix:404` (`config = checked (removeAttrs config [ "_module" ]);`) while the module system tries to merge `42` as if it were an attrset-shaped module contributing to `config`. **The error text never says "42 is not a module"** — a reviewer chasing "coerce an integer to a string" without knowing the fixture's own setup could easily misdiagnose this as a string-interpolation bug three files away.
- **`eval-check/bad-type.nix`** keeps the correct module and adds a second module `{ services.foo.settings.port = "not-a-port"; }`. It fails cleanly and legibly: `error: A definition for option 'services.foo.settings.port' is not of type '16 bit unsigned integer; between 0 and 65535 (both inclusive)'. Definition values: - In '<unknown-file>': "not-a-port"` — `types.port` is nixpkgs's `types.ints.u16` under the hood, confirmed by this exact error text (Nix 2.35.2, nixpkgs 26.11pre `8d5d2709`).

### 3. `mkOption`, `mkEnableOption`, `mkPackageOption`: exact shapes

`lib.mkEnableOption` (`nixpkgs/lib/options.nix:187-194`, pinned rev `8d5d2709`) is a two-line wrapper:

```nix
mkEnableOption = name: mkOption {
  default = false;
  example = true;
  description = "Whether to enable ${name}.";
  type = lib.types.bool;
};
```

`lib.mkPackageOption` (`lib/options.nix:309-334`) is not a two-argument function — it is `pkgs: name: { nullable?, default?, example?, extraDescription?, pkgsText? }:`, and the third argument is mandatory even when empty:

```nix
mkPackageOption pkgs "hello" { }
# => { default = pkgs.hello; defaultText = literalExpression "pkgs.hello"; description = "The hello package to use."; type = package; }

mkPackageOption pkgs [ "python3Packages" "pytorch" ] { extraDescription = "..."; }
# => default = pkgs.python3Packages.pytorch (attribute-path form, name' = last of the list)

mkPackageOption pkgs "dbus" { nullable = true; default = null; }
# => type = nullOr package, default = null
```

`name` may be a string or an attribute-path list; `default` defaults to `name` itself (so it resolves through `pkgs`), and passing `default = null` together with `nullable = true` is how an optional package option is spelled — there is no separate `optional` flag.

### 4. RFC 42's `settings` pattern (structural config, not `extraConfig`)

[RFC 42](https://github.com/NixOS/rfcs/blob/master/rfcs/0042-config-option.md) (accepted; merged as the manual's "Options for Program Settings" / "Freeform Modules" sections) replaces stringly `extraConfig` with a `submodule` carrying a `freeformType` from `pkgs.formats.<fmt>`:

```nix
# correct (RFC 42)
settingsFormat = pkgs.formats.json { };
options.services.foo.settings = lib.mkOption {
  type = lib.types.submodule {
    freeformType = settingsFormat.type;
    options.port = lib.mkOption { type = lib.types.port; default = 8080; };
  };
  default = { };
};

# dated idiom RFC 42 exists to replace
options.services.foo.extraConfig = lib.mkOption {
  type = lib.types.lines;
  default = "";
};
```

The RFC's own rationale: `extraConfig` "can't be even implemented correctly with configuration formats like JSON" (no merge semantics, `mkDefault`/`mkForce` don't apply to substrings, values aren't inspectable). This pattern is nixpkgs-wide, not module-export-specific — `nix-community/home-manager@7b4c5ec` alone has 30+ modules using `freeformType`/`pkgs.formats` (`modules/programs/pandoc.nix:20`, `modules/programs/aria2.nix`, `modules/services-modular/default.nix`, etc.), confirming it is the settled convention, not a contested one.

### 5. Secret path types: the built-in exists, the security-critical exemplar doesn't use it

`nixpkgs/lib/types.nix:648-686` (pinned rev `8d5d2709`) defines the whole family from one function:

```nix
path        = pathWith { absolute = true; };
pathInStore = pathWith { inStore = true; };
externalPath = pathWith { absolute = true; inStore = false; };
pathWith = { inStore ? null, absolute ? null }:
  if inStore != null && absolute != null && inStore && !absolute
  then throw "In pathWith, inStore means the path must be absolute"
  else mkOptionType { name = "path"; check = ...; merge = mergeEqualOption; ... };
```

`pathWith` throws **at type-construction time** (not at merge time) for the one impossible combination (`inStore = true; absolute = false;`) — an agent that inverts the guard while hand-writing a similar helper will get a throw the moment the module file is imported, not when someone sets the option.

Planted and measured (`fixtures/module-authoring/secret-path/`): a module declaring `type = lib.types.pathWith { inStore = false; };` accepts `"/run/secrets/foo"` (exit 0) and rejects a real Nix store path built by the fixture itself, `"${pkgs.hello}/bin/hello"` (`/nix/store/xl1h9i29pgq2q5cszjhm5wpfxfbbqwyi-hello-2.12.3/bin/hello`), with `error: A definition for option 'secretPath' is not of type 'path not in the Nix store'.`

Yet `Mic92/sops-nix@2bd00bd9:modules/sops/default.nix:19-25` (and the identical block duplicated in `modules/home-manager/sops.nix:80-86` and `modules/nix-darwin/default.nix:20-26`) hand-rolls the same predicate from scratch instead:

```nix
pathNotInStore = lib.mkOptionType {
  name = "pathNotInStore";
  description = "path not in the Nix store";
  descriptionClass = "noun";
  check = x: !lib.path.hasStorePathPrefix (/. + x);
  merge = lib.mergeEqualOption;
};
```

used at `modules/sops/default.nix:338` (`age.keyFile`'s type). This is the single most on-point security-relevant finding of this dive: the most secret-handling exemplar in the test set duplicates, three times, logic the standard library already ships — likely because `pathWith` postdates whichever nixpkgs version sops-nix's authors last checked against, or because `pathNotInStore` predates it and nobody has revisited the type once written. `nix-community/home-manager@7b4c5ec` has already migrated: `modules/services/syncthing.nix:664-668`'s `encryptionPasswordFile` uses `lib.types.nullOr (lib.types.pathWith { inStore = false; absolute = true; })` verbatim, and `modules/programs/nvchecker.nix:39,49` uses the all-null `lib.types.pathWith { }` for paths where store-or-not genuinely does not matter.

### 6. `pkgs` source and `self.packages` indexing inside an exported module

All three test targets take `pkgs` (and `config`, `lib`) exclusively from the module function's own arguments — none imports its own `nixpkgs` flake input inside a module body:

- `Mic92/sops-nix@2bd00bd9:modules/sops/default.nix` — every `pkgs.*` reference (`pkgs.callPackage`, `pkgs.gnupg`, `pkgs.age`, `pkgs.pkgsBuildHost.callPackage`) resolves through the function's own `pkgs` argument; a repo-wide search for `inputs.nixpkgs` or `import nixpkgs` under `modules/` returns nothing.
- `nix-community/disko@725ea35:module.nix` — same; `pkgs.qemu_kvm`, `pkgs.linuxPackages_testing`, `pkgs.zstd` all come from the module argument.
- `nix-community/home-manager@7b4c5ec:modules/modules.nix:114` — `nixpkgs.system = lib.mkDefault pkgs.stdenv.hostPlatform.system;` both takes `pkgs` from the module argument **and** already reads the correct, non-deprecated attribute.

This confirms [NIX-INP-02](../nix-inputs.md) needs no module-specific addendum: "a flake's modules use the consumer's `pkgs`" already holds across every module-exporting exemplar measured.

The narrower, module-specific failure mode is indexing `self.packages` by the deprecated `pkgs.system` alias from *inside* a module's `config`. None of the three exemplars does this (none indexes `self.packages` from a module body at all — `disko`'s and `home-manager`'s `self.packages.${system}` reads are in their own top-level `flake.nix`, where `system` is a plain string from a `genAttrs`/`forAllPkgs` loop, not `pkgs.system`). This dive plants the failure mode directly:

```nix
# self-packages-system/violation.nix — M-I-06 violation
config.result = self.packages.${pkgs.system}.default;   # fires the alias warning
# self-packages-system/twin.nix — compliant
config.result = self.packages.${pkgs.stdenv.hostPlatform.system}.default;  # silent
```

Both return the correct value (`"the-cli-package"`), but the violation prints exactly one `evaluation warning: 'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` per evaluation (the `pkgs/top-level/aliases.nix:2498` `warnAlias`, per [NIX-FLK-12](../nix-flakes.md)), and the twin prints zero. This is the same mechanism as top-level `pkgs.system` reads, applied inside a module — it does not need a new rule ID, it needs [NIX-FLK-12](../nix-flakes.md)'s grep (`grep -rnE -e '\bpkgs\.system\b' --include='*.nix' .`) run over `modules/` too, which it already is (the grep is directory-agnostic).

### 7. flake-parts module consumability

A `flake-parts` module meant for other flakes to `imports = [ inputs.foo.flakeModules.default ]` is a plain module file, but it declares its options nested under `options.flake.<name>` (flake-scope options) or plain `perSystem = { ... }: { ... }` (per-system scope) — never a bare top-level attribute, because `flake-parts` itself only merges attributes it knows about (`perSystem`, `flake`, `imports`, etc.):

```nix
# disko@725ea35:flake-module.nix — a real, minimal consumable flake-parts module
{ lib, ... }:
{
  options.flake.diskoConfigurations = lib.mkOption {
    type = lib.types.lazyAttrsOf lib.types.raw;
    default = { };
    description = "Instantiated Disko configurations. Used by `disko` and `disko-install`.";
  };
}
```

Exported from the flake as (`disko@725ea35:flake.nix:35-37`):

```nix
flakeModule = self.flakeModules.default;   # legacy singular alias
flakeModules.default = self.flakeModules.disko;
flakeModules.disko = ./flake-module.nix;
```

`flake-parts` itself (`hercules-ci/flake-parts@31729ca:extras/flakeModules.nix`) defines the `flakeModules` option every flake-parts-based flake gets for free, and it auto-tags every entry:

```nix
flakeModulesOption = mkOption {
  type = types.lazyAttrsOf types.deferredModule;
  apply = mapAttrs (k: v: {
    _file = "${toString moduleLocation}#flakeModules.${k}";
    key = "${toString moduleLocation}#flakeModules.${k}";
    imports = [ v ];
    _class = "flake";
  });
};
```

so a consumer importing `inputs.foo.flakeModules.default` gets a `_class = "flake"`-tagged module with a traceable `_file`/`key` for free — an author does not need to hand-roll either. The convention (`flakeModules.default` as the single-module alias) is identical to the NixOS-module convention `nixosModules.default` — an agent that already knows the NixOS idiom transfers it correctly here, but only if it remembers the option lives at `options.flake.<name>`, not at the module's own top level.

## Normative guidance candidates

Numbered for reference in this file only — none of these mint a `NIX-MOD` ID; each names its fold target. Ship as an addendum line in the target file's next revision, not as new depth-file content.

1. **A flake's `checks` must include one derivation that forces `lib.evalModules` over every exported `nixosModules.<name>` (at minimum `.default`), not just its presence.** *Rationale*: `nix flake check` alone lets `nixosModules.default = 42` and every option-type error inside a module through silently (NIX-FLK-06). *Verify*: `nix eval --impure --file eval-check/good.nix` returns the module's own known-good value; the same call against a broken module errors. *Run*: **yes** — `fixtures/module-authoring/eval-check/{good,bad-42,bad-type}.nix`, exit 0 / 1 / 1. *Fold target*: `flakes.md`, addendum to NIX-FLK-06.

2. **A secret-like path option must be typed `lib.types.pathWith { inStore = false; }` (or `nullOr` of it), never bare `types.path` or a hand-rolled predicate.** *Rationale*: bare `types.path` accepts a Nix-store path, which is world-readable; a hand-rolled check duplicates logic nixpkgs already ships and risks the same subtle bugs (`sops-nix` carries the identical ~7-line predicate three times). *Verify*: `nix eval --impure --file secret-path/bad.nix` on the candidate module with a real store path substituted for the option's value must error `is not of type 'path not in the Nix store'`; the reading heuristic is `grep -rn -e 'type = .*types\.path\b' -e 'type = .*lib\.types\.path\b' --include='*.nix' <module-dir>` with zero hits on options whose description mentions "secret" or "key". *Run*: **yes** — `fixtures/module-authoring/secret-path/{good,bad}.nix`, exit 0 / 1. *Fold target*: `security.md` (NIX-SEC), new addendum.

3. **`self.packages` must be indexed by `pkgs.stdenv.hostPlatform.system`, never `pkgs.system`, including inside an exported module's `config`.** *Rationale*: identical to NIX-FLK-12 at top level; this dive confirms the same `pkgs/top-level/aliases.nix:2498` warning fires from inside `lib.evalModules`-evaluated `config`, once per evaluation, silently (value stays correct, only the warning is lost in noisy CI logs). *Verify*: NIX-FLK-12's existing grep, `grep -rnE -e '\bpkgs\.system\b' --include='*.nix' <dir>`, run over the module directory; zero hits passes. *Run*: **yes** — `fixtures/module-authoring/self-packages-system/{violation,twin}.nix`: 1 warning vs 0, both exit 0 (value correct either way — this is a silent-degradation class, not a crash class). *Fold target*: `flakes.md`, addendum to NIX-FLK-12 (state explicitly that the grep also covers `modules/`).

4. **A module a flake exports takes `pkgs`, `lib`, `config` only from its own function arguments — never `import`s or closes over the flake's own `nixpkgs` input.** *Rationale*: already NIX-INP-02; no new evidence changes it, this dive just reconfirms it holds across all three test targets. *Verify*: `grep -rn -e 'import nixpkgs' -e 'inputs\.nixpkgs' --include='*.nix' <module-dir>`, zero hits passes. *Run*: **no, reading heuristic only** — confirmed present (zero hits) in all three exemplars by direct grep in Finding 6, not a planted fixture (nothing to force red on; the rule is already stated and fixture-verified under NIX-INP-02). *Fold target*: none — already covered, cite only.

5. **A consumable flake-parts module declares its options under `options.flake.<name>` (or plain `perSystem`), never a bare top-level attribute, and the flake exports it at `self.flakeModules.default` (plus `self.flakeModules.<name>`) by the same singular/plural convention as `nixosModules`.** *Rationale*: `flake-parts` only merges attributes it recognizes at its own top level (`perSystem`, `flake`, `imports`); a bare top-level option is silently ignored, not an error, which is worse than a crash for an agent to debug. *Verify*: reading heuristic — the module file's outermost `options` (if any) must be nested under `flake.` or absent (relying on `perSystem` alone), and the exporting `flake.nix` must set `flakeModules.default`. No lint enforces this; `nix flake check` does not evaluate `flakeModules` contents any more than it evaluates `nixosModules` contents (same class of gap as candidate 1, unverified whether a `flakeModules`-specific evaluating check is cheap enough to be worth planting — deferred, see Contested). *Run*: **no, reading heuristic only** (not planted; M-I-08 was P2/B-corpus, lowest-effort row assigned, and the exemplar evidence in Finding 7 was sufficient without a fixture). *Fold target*: `flakes.md`, new short subsection ("consuming and exporting flake-parts modules").

6. **Dropped, not folded**: M-I-01 (`mkOption`/`mkEnableOption`/`mkPackageOption` exist and their signatures are as documented) and M-I-02 (`mkIf`/`mkMerge`/`mkDefault`/`mkForce` merge semantics) — manual restatement; an agent trained on nixpkgs reproduces these correctly by default (selection test 1 fails). M-I-03 (RFC 42 `settings` pattern) — real, but nixpkgs-wide rather than module-export-specific (see Finding 4); leave as an example, not a rule, unless a future dive finds a fleet flake actually authoring a module with `settings`. M-I-05 — retired as a duplicate of `NIX-REL-10(e)`, already settled and fixture-verified. M-I-07 (extensible option types) — already deferred by the map (P3).

## Verification runs

Toolchain: Nix 2.35.2, nixpkgs 26.11pre `8d5d270900d3fc75655ea2d9d248b234f6631439` (pinned via `builtins.getFlake`), via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`. Store: warm (nixpkgs input already fetched/cached from earlier waves; the only network wait observed was "waiting for another Nix process to finish fetching input" on the timed run, resolved from cache, not re-downloaded). Fixtures: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/module-authoring/` (`git init -q && git add -A` done before any eval).

| # | Command | Exit (violation) | Exit (twin/good) | Relevant output |
|---|---|---|---|---|
| 1a | `nix eval --impure --file eval-check/good.nix` | — | **0** | `8080` |
| 1b | `nix eval --impure --file eval-check/bad-42.nix` | **1** | — | `error: cannot coerce an integer to a string: 42` (raised from `lib/modules.nix:404`, merging `config`) |
| 1c | `nix eval --impure --file eval-check/bad-type.nix` | **1** | — | `error: A definition for option 'services.foo.settings.port' is not of type '16 bit unsigned integer; between 0 and 65535 (both inclusive)'. ... - In '<unknown-file>': "not-a-port"` |
| 1 (timing) | `time nix eval --impure --file eval-check/good.nix` (warm store) | — | — | `elapsed=1.76 s` |
| 2a | `nix eval --impure --file secret-path/good.nix` | — | **0** | `"/run/secrets/foo"` |
| 2b | `nix eval --impure --file secret-path/bad.nix` | **1** | — | `error: A definition for option 'secretPath' is not of type 'path not in the Nix store'. Definition values: - In '<unknown-file>': "/nix/store/xl1h9i29pgq2q5cszjhm5wpfxfbbqwyi-hello-2.12.3/bin/hello"` |
| 3a | `nix eval --impure --file self-packages-system/violation.nix 2>&1` | (both exit 0 — this is a warning-count class, not a pass/fail exit-code class) | | `"the-cli-package"` on stdout; `evaluation warning: 'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` on stderr, **1** match for `grep -c "has been renamed to/replaced by 'stdenv.hostPlatform.system'"` |
| 3b | `nix eval --impure --file self-packages-system/twin.nix 2>&1` | | | `"the-cli-package"`, **0** matches for the same grep |

Empty output meaning, stated per check: for 1a/1c/2a/3a/3b, no output on stderr beyond what is quoted is expected and normal (a clean eval prints nothing else); for the grep in row 3, **zero matches is the pass state** (the twin), and any non-zero count is the fail state (the violation) — the grep's own output being empty means "no rename warnings seen," not "the check did not run."

All five checks ran to completion; none was blocked or timed out. No `--accept-flake-config`, no `--impure` flag beyond `--impure` (required only because `builtins.getFlake` needs it — not used to bypass sandboxing of anything under test), no third-party flake was built.

## Exemplar evidence

| Candidate | Satisfies | Violates / gap | Contradicts |
|---|---|---|---|
| 1 (module-evaluating check) | None of the three test targets ships one either — `Mic92/sops-nix@2bd00bd9`, `nix-community/disko@725ea35` and `nix-community/home-manager@7b4c5ec` all rely on `nix flake check` plus their own NixOS-test-based CI (heavier, not a substitute at eval-check's cost) | All three — no exemplar plants a cheap module-evaluating `checks` entry | none |
| 2 (secret path type) | `nix-community/home-manager@7b4c5ec:modules/services/syncthing.nix:664-668` (`encryptionPasswordFile`, `pathWith { inStore = false; absolute = true; }`), `modules/programs/nvchecker.nix:39,49` (`pathWith { }`, don't-care case) | `Mic92/sops-nix@2bd00bd9:modules/sops/default.nix:19-25,338` and the identical duplicate in `modules/home-manager/sops.nix:80-86,244` and `modules/nix-darwin/default.nix:20-26,285` — hand-rolled `pathNotInStore` instead of the built-in | none |
| 3 (`self.packages` by `hostPlatform.system`) | `nix-community/disko@725ea35:flake.nix:39-57` (`system` from `forAllSystems`/`genAttrs`, never `pkgs.system`), `nix-community/home-manager@7b4c5ec:flake.nix:222` (`nixpkgs.lib.elem pkgs.stdenv.hostPlatform.system supportedSystems`), `modules/modules.nix:114` (`nixpkgs.system = lib.mkDefault pkgs.stdenv.hostPlatform.system;`) | none found in the three targets — no exemplar indexes `self.packages` from inside a module body at all (both real `self.packages.${system}` reads are in each flake's own top-level `flake.nix`, not a module) | none |
| 4 (`pkgs` from module args, not the flake's own nixpkgs) | All three: `Mic92/sops-nix@2bd00bd9:modules/sops/default.nix`, `nix-community/disko@725ea35:module.nix`, `nix-community/home-manager@7b4c5ec:modules/modules.nix` | none | none |
| 5 (flake-parts module shape) | `nix-community/disko@725ea35:flake-module.nix` + `flake.nix:35-37` (`options.flake.diskoConfigurations`, `flakeModules.default` convention), `hercules-ci/flake-parts@31729ca:extras/flakeModules.nix` (the mechanism itself) | none in the three named test targets export a flake-parts module (only `disko` does, from the wider corpus) | none |

## AI-agent angle

- **Writing `extraConfig`-shaped stringly options instead of the RFC 42 `settings` + `freeformType` pattern.** Dated training data (pre-2021 nixpkgs modules, still common in blog posts) teaches the `extraConfig` idiom. Smallest check: `grep -rn -e 'mkOption' -A3 --include='*.nix' <module-dir> | grep -B3 'types\.lines'` combined with a description mentioning "extra" — a reading heuristic, not a lint (statix/deadnix do not flag this).
- **Guessing `mkPackageOption`'s signature as two arguments** (`mkPackageOption pkgs "hello"` without the trailing `{ }`) or as accepting the package directly rather than its name/path. This is a real, mechanical hallucination risk since the function's shape (`pkgs -> name -> optionsBag -> Option`) is unusual among `lib.mk*` helpers. Smallest check: it simply fails to evaluate (`error: anonymous function ... called without required argument`) the moment the option set is force-evaluated — the same eval-check mechanism from candidate 1 catches this class for free, no dedicated grep needed.
- **Hand-rolling a secret/path predicate instead of reaching for `lib.types.pathWith`.** `sops-nix` itself is the live example (Finding 5) — an agent asked to "add a path option that must not be a store path" is more likely to pattern-match on the nearest example in the codebase it is editing (which may itself be the dated hand-rolled version) than to know `pathWith` exists. Smallest check: candidate 2's grep plus a one-line reading heuristic ("does this option's own description mention secrets/keys/passwords, and if so is its type `path` or a custom `mkOptionType` rather than `pathWith`?").
- **Believing `nix flake check` validates a module's contents.** This is the single most consequential wrong belief in this dive's scope — an agent that adds `checks = { }` empty or relies on `nix flake check` passing as proof the module is correct will ship `nixosModules.default = 42`-class breakage undetected. Smallest check: candidate 1's eval-check derivation, which is the fix, not merely a detector.
- **Indexing `self.packages` (or any per-system flake output) by `pkgs.system` inside a module**, carried over from the same dated `import nixpkgs { inherit system; }` era that produces the top-level version of this mistake (already NIX-FLK-12). The fix transfers directly (`pkgs.stdenv.hostPlatform.system`), but an agent fixing the top-level instances and missing the ones inside `config = { ... }` bodies is plausible, since the grep in NIX-FLK-12 already covers this (it is directory-agnostic) but a reviewer skimming only `flake.nix` would not think to also check `modules/`.
- **Writing a flake-parts module's options at the file's own top level** (e.g. `options.diskoConfigurations = ...` instead of `options.flake.diskoConfigurations = ...`). This fails silently — `flake-parts` ignores attributes it does not recognize rather than erroring — which is a worse failure mode for an agent to self-correct than a crash, since nothing in the tool chain reports it. No planted check exists for this in the current dive (see Contested); the mechanical tell is that `nix flake show` on the *importing* flake will simply not list the expected option/output.
- **Reusing the singular `nixosModule`/`flakeModule` (no trailing `s`) output names.** These are the pre-2021 singular outputs `nix flake check` rewrites with a warning (already NIX-FLK's territory, [nix-flakes.md M-A-06]); both `disko` and `home-manager` still export the singular alias (`flakeModule = self.flakeModules.default;`) purely for backward compatibility with older consumers, which could mislead an agent copying the exemplar into thinking the singular form is still the primary spelling rather than a compatibility shim.

## Contested / evolving

- **Whether a `flakeModules`-evaluating check (candidate 5's counterpart to candidate 1) is worth planting.** `flake-parts` modules are typically evaluated the moment any consumer imports them into a real `mkFlake` call in CI, unlike a `nixosModules` export which may sit entirely untested if the flake itself has no `nixosConfigurations`. This dive did not plant that check (reading heuristic only, candidate 5) because the marginal cost of a `nix flake check`-integrated smoke consumer (a tiny `mkFlake { imports = [ self.flakeModules.default ]; }` under `checks`) was judged out of proportion to a feature (M-I-08, "B-corpus", P2) the fleet does not currently plan to export — revisit if a fleet flake ever ships a `flakeModules.default`.
- **`lib.types.pathWith`'s adoption is mid-migration, not settled.** As of this dive's measurement (2026-09-27, nixpkgs 26.11pre `8d5d2709`), `home-manager` uses it in at least three modules while `sops-nix` — arguably the module with the most to gain from it — still hand-rolls the equivalent. This is not "sops-nix is wrong" so much as "the built-in postdates a lot of still-current module code"; trend is toward `pathWith`, not settled practice yet. A future dive re-measuring this corpus at a later SHA should recheck whether `sops-nix` has migrated.
- **Whether `NIX-MOD` should ever be minted later.** This dive's conclusion is conditional on Q7's default (no fleet flake exports a module) holding. If that default changes — a fleet CLI later ships a NixOS or home-manager module (e.g., `programs.ocx`) — candidates 1-3 and 5 above are the seed of that family, already fixture-verified, and M-I-03 (the RFC 42 `settings` pattern) should be promoted from "dropped" to "kept" at that point, since it stops being generic nixpkgs trivia and starts being a rule the fleet's own module must actually follow.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nixos.org/manual/nixos/unstable — Writing NixOS Modules](https://nixos.org/manual/nixos/unstable/index.html#sec-writing-modules) | NixOS manual, unstable branch | fetched 2026-09-27, tracks nixpkgs unstable | Primary source for `mkOption`/`mkEnableOption`/`mkPackageOption` module structure and `config`/`options` split |
| [nixos.org/manual/nixos/unstable — Options Types](https://nixos.org/manual/nixos/unstable/index.html#sec-option-types) | NixOS manual, unstable branch | fetched 2026-09-27 | Primary source for `types.path`/`pathInStore`, `pkgs.formats.json`, `freeformType`, extensible `types.enum` |
| [nix.dev/tutorials/module-system/deep-dive](https://nix.dev/tutorials/module-system/deep-dive.html) | nix.dev tutorial | fetched 2026-09-27 | Primary source for module priority (`mkOverride`/`mkForce`/`mkDefault` numeric priorities), `_module.args`, submodules |
| [NixOS/rfcs — 0042-config-option.md](https://github.com/NixOS/rfcs/blob/master/rfcs/0042-config-option.md) | RFC 42, accepted | authored 2019-03, fetched verbatim via raw GitHub 2026-09-27 | Primary source for the `settings`-via-`freeformType` pattern and its rationale over `extraConfig` |
| `nixpkgs/lib/options.nix` at `8d5d270900d3fc75655ea2d9d248b234f6631439` | nixpkgs source, `lib/options.nix` | pinned rev, matches the frame's nixpkgs 26.11pre | Primary source, exact `mkEnableOption`/`mkPackageOption` implementations, fetched raw and read in full for the relevant sections |
| `nixpkgs/lib/modules.nix` at `8d5d270900d3fc75655ea2d9d248b234f6631439` | nixpkgs source, `lib/modules.nix` | pinned rev | Primary source, exact `mkRenamedOptionModule`/`mkRemovedOptionModule`/`mkAliasOptionModule`/`mkChangedOptionModule`/`evalModules` implementations |
| `nixpkgs/lib/types.nix` at `8d5d270900d3fc75655ea2d9d248b234f6631439` | nixpkgs source, `lib/types.nix` | pinned rev | Primary source, exact `pathWith`/`path`/`pathInStore`/`externalPath` implementations (lines 648-686) |
| [flake.parts/module-arguments.html](https://flake.parts/module-arguments.html) | flake-parts documentation | fetched 2026-09-27 | Primary source for `perSystem` vs top-level module arguments and reusable-module authoring guidance |
| `Mic92/sops-nix@2bd00bd9:modules/sops/default.nix`, `modules/home-manager/sops.nix`, `modules/nix-darwin/default.nix` | exemplar corpus, sparse clone | fetched into corpus 2026-09-27, SHA per `nix-fetch.log` | Test target named by the brief; source of the `pathNotInStore` duplication finding |
| `nix-community/disko@725ea35:flake.nix`, `module.nix`, `flake-module.nix` | exemplar corpus, sparse clone | fetched into corpus 2026-09-27 | Test target; source of the `pkgs`-from-module-args and flake-parts-module-shape evidence |
| `nix-community/home-manager@7b4c5ec:flake.nix`, `modules/modules.nix`, `modules/services/syncthing.nix`, `modules/programs/{pandoc,nvchecker}.nix` | exemplar corpus, sparse clone | fetched into corpus 2026-09-27 | Test target; source of the `hostPlatform.system` and `pathWith` adoption evidence |
| `hercules-ci/flake-parts@31729ca:extras/flakeModules.nix` | exemplar corpus, sparse clone | fetched into corpus 2026-09-27 | Source of the `flakeModules` option's own auto-tagging mechanism (`_file`/`key`/`_class`) |
| `nix-topic-map.md` (M-I-01..08, Artifact set decision, Conflicts resolved) and `nix-flakes.md` (NIX-FLK-06, NIX-FLK-12), `nix-inputs.md` (NIX-INP-02), `nix-release.md` (NIX-REL-10(e)) | this program's own prior consolidations | wave 1-3, 2026-09-27 | Already-settled findings this dive cites rather than re-derives |
| `references/rule-distillation.md` (research-lang skill) | this program's own method reference | — | Source of the "four selection tests" applied to decide the ships-or-folds question |

