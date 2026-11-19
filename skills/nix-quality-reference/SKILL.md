---
name: nix-quality-reference
description: Depth files behind the nix-quality rule, loaded on demand. Use when the nix-quality rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files behind the nix-quality rule
  keywords: nix,nixpkgs,flake,flakes,flake.lock,follows,derivation,package.nix,overlay,devshell,nixfmt,deadnix,statix,flake-checker,lix,nixconfig,generated-flake,release,reference
  claude.user-invocable: "false"
---

# nix-quality-reference

Depth for the `nix-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [flakes.md](flakes.md) | `flake.nix` outputs, system iteration, nixpkgs instance, packages, apps, devShells |
| [gates.md](gates.md) | Gate order: formatter, deadnix, statix, `nix flake check`, CI workflow pins, Lix legs |
| [generated-flakes.md](generated-flakes.md) | Flakes packaging prebuilt binaries or generated from an external index |
| [inputs.md](inputs.md) | Input declaration, `follows`, pinning, `flake.lock`, submodules, LFS |
| [language.md](language.md) | `rec`, string context, impure builtins, `//`, `with`, reading evaluation errors |
| [modules.md](modules.md) | NixOS, home-manager, nix-darwin and flake-parts modules a flake exports |
| [packaging.md](packaging.md) | Derivations and `package.nix`: fetchers, hashes, `src`, `meta`, phases, builders |
| [release.md](release.md) | Version strings, tags, deprecation, install instructions, non-flake bridge, nix-update |
| [security.md](security.md) | `nixConfig`, `accept-flake-config`, secrets in the store, evaluating foreign flakes |
