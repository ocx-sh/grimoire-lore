---
title: "Flake output schema: what nix flake check actually enforces"
topic: "Output schema — packages vs overlays, apps, devShells, formatter, checks"
agent: outputs-contract
model: sonnet
date_researched: 2026-09-27
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/outputs-contract/
scope: |
  Covers the flake output contract (M-A-05..15): which top-level output
  attributes `nix flake check` validates and how, hard-vs-soft failure
  classification with verbatim error/warning strings sourced from
  CppNix 2.35.2's own `src/nix/flake.cc`, the `packages`-vs-`overlays`
  pattern, `nix run`/`meta.mainProgram` resolution, git-tracked-file
  scoping, the `self.packages.<system>.default` alias failure mode
  across ref schemes, devShell attribute rules, and the `schemas`
  output under CppNix. Does not cover systems iteration (M-A-01..04),
  inputs/lock hygiene (family B), the Nix language (family C), or
  packaging/meta conventions beyond what the check enforces (family D).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The `nix flake check` contract, from its own source](#1-the-nix-flake-check-contract-from-its-own-source)
   2. [Hard vs soft: a verbatim table](#2-hard-vs-soft-a-verbatim-table)
   3. [`packages` is the export of record; `overlays` is a derived view](#3-packages-is-the-export-of-record-overlays-is-a-derived-view)
   4. [`nix run` and `meta.mainProgram`: the real resolution order](#4-nix-run-and-metamainprogram-the-real-resolution-order)
   5. [Git-tracked-file scoping: why untracked files vanish silently](#5-git-tracked-file-scoping-why-untracked-files-vanish-silently)
   6. [The `self.packages.<system>.default` alias failure mode](#6-the-selfpackagessystemdefault-alias-failure-mode)
   7. [devShells: `packages` vs `buildInputs` vs `inputsFrom`](#7-devshells-packages-vs-buildinputs-vs-inputsfrom)
   8. [Which outputs each shape exposes; the formatter census](#8-which-outputs-each-shape-exposes-the-formatter-census)
   9. [flake-parts/blueprint hide outputs from a `flake.nix`-only scan](#9-flake-partsblueprint-hide-outputs-from-a-flakenix-only-scan)
   10. [Templates: a stricter contract than packages](#10-templates-a-stricter-contract-than-packages)
   11. [`schemas` under CppNix 2.35: not implemented, not an error](#11-schemas-under-cppnix-235-not-implemented-not-an-error)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `nix flake check`'s entire output-validation logic lives in one function in `src/nix/flake.cc`; every hard/soft distinction in this file is read from that source at the pinned tag `2.35.2`, not inferred from behavior.
- Five output families are **hard**-checked as derivations: `checks.<system>.<name>`, `devShells.<system>.<name>` (including `default`), `packages.<system>.<name>` (including `default`), `nixosConfigurations.<name>.config.system.build.toplevel`, and — undocumented in the manual but present in the source — `formatter.<system>` itself.
- An **unrecognized top-level output name is always a warning** (`warn("unknown flake output '%s'", name)`), never an error, on CppNix 2.35.2 — this is what makes a `schemas` output, a typo'd output name, or a generator's stray key harmless to `nix flake check`'s exit code.
- The seven pre-2021 singular outputs (`defaultPackage`, `defaultApp`, `defaultTemplate`, `defaultBundler`, `overlay`, `devShell`, `nixosModule`) are **not silently accepted**: each is fully type-checked exactly like its plural replacement, plus a `warn("... is deprecated; use '%s' instead", ...)` naming the replacement — they still work today, contrary to any assumption that they were removed.
- `nixosModules.<name>` (and singular `nixosModule`) is the **weakest-checked** output of all: `checkModule` only calls `forceValue` — it never verifies the value is a function or even an attrset. `nixosModules.default = 42;` passes `nix flake check` clean.
- `overlays.<name>` (and singular `overlay`) is checked by `checkOverlay`, which requires the value to be a lambda **with no formals and whose first argument is literally named `final`** — an overlay written as `{ final, prev }: …` (the destructuring style many nixpkgs contributors use elsewhere) is a hard failure: `error: overlay does not take an argument named 'final'`, because `getFormals()` alone disqualifies it before the name is even checked.
- `apps.<system>.<name>` requires `type` and `program` (hard errors if absent) but only *warns* if `meta` or `meta.description` is missing, and hard-errors on any attribute besides `type`/`program`/`meta` — note that Nix's own checker never validates that `type == "app"`, only that it is a string.
- `templates.<name>` requires `path` and `description` (hard errors if missing) and hard-errors on any attribute besides `path`/`description`/`welcomeText` — a stricter contract than `apps`, and undocumented in the same way.
- `--no-build` skips *building* `checks.<system>.<name>` derivations, but every `packages`/`devShells`/`formatter` derivation is still evaluated as far as computing its `.drv` path — `--no-build` is never a substitute for `nix eval`-only checking of those outputs; it is specifically a build-skip for the `checks` output alone.
- `nix run` against a package (no `apps` output) resolves the executable name in this exact order: `meta.mainProgram`, then `pname`, then the name-part of `name` (stripping the version) — and nothing in `nix flake check` verifies that file actually exists in `$out/bin`; a mismatch is a runtime `nix run` failure (`unable to execute … No such file or directory`), invisible to a green `nix flake check`.
- Untracked files in a git-repository-backed flake are invisible to evaluation with no error at all — the file is simply absent from the source tree Nix reads, whether accessed via `.`, `path:`, or `git+file:` without an explicit `?ref=`; the fix is `git add`, and `git+file:` without `ref`/`rev` additionally prints a "dirty" warning for uncommitted changes.
- `packages.<system>.*` is the export every distribution channel (`nix run`, `nix build`, `nix profile add`, the author's binary cache) resolves; an `overlays.default` for consumer composition is a second export built from the same `package.nix` via `callPackage`, never a second `import nixpkgs`.
- `--all-systems` and remote-ref evaluation surface a distinct, well-documented failure class: a package whose `default` aliases `self.packages.${system}.<name>`, where that package's `src` traces back to the flake's own source tree (directly `src = self`, or a relative path like `../.`), fails `--no-build` from a `github:`/tarball ref with `error: path '…-source' is not valid` — confirmed live on two independent exemplars (`DeterminateSystems/flake-checker`, `sxyazi/yazi`).
- `mkShell { packages = […]; }` is the current spelling; `buildInputs` is accepted (it is still a real `mkDerivation` attribute `mkShell` forwards) but is legacy phrasing for a shell that builds nothing; `inputsFrom = [ pkg ]` additionally pulls in `pkg`'s own `nativeBuildInputs`/`buildInputs`, which `packages`/`buildInputs` alone do not.
- A `formatter` output is the exception, not the rule, in the exemplar corpus (27/36 declare none per the tool-runs audit) — a `nix-quality` rule should treat "no formatter" as the default finding, not the reverse.
- `flake-parts` and `blueprint` consumers commonly show **zero** outputs in a static `grep`/read of `flake.nix` while exposing full `packages`/`devShells`/`overlays` through imported files — `nix flake show --json` (or `--json` plus a jq walk) is the only reliable enumeration, never a `flake.nix`-only read.
- CppNix 2.35.2 has **zero** built-in handling for a `schemas` output anywhere in `nix3 flake` (`flake.cc` contains every `flake` subcommand including `check` and `show`; grepping the whole file for `schemas` returns 0 matches) — it falls through to the generic `warn("unknown flake output '%s'", "schemas")`; only Determinate Nix understands and displays it.

## Findings

### 1. The `nix flake check` contract, from its own source

The Nix manual's own [`nix3-flake-check` page](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check) states the required-derivation and required-shape lists in prose, but it is a documentation summary, not a spec, and it silently omits `formatter` from the derivation list (see below). The ground truth is `CmdFlakeCheck::run` in [`src/nix/flake.cc`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc), the same file that also implements `CmdFlakeShow` (`nix flake show`) — both live in one 1,597-line translation unit at tag `2.35.2`.

The function walks every top-level output attribute name and switches on it (`src/nix/flake.cc:588-793`):

```cpp
else if (name == "packages" || name == "devShells") {
    state->forceAttrs(vOutput, pos, "");
    for (auto & attr : *vOutput.attrs()) {
        ...
        for (auto & attr2 : *attr.value->attrs())
            checkDerivation(fmt("%s.%s.%s", name, attr_name, state->symbols[attr2.name]),
                             *attr2.value, attr2.pos);
    }
}
else if (name == "formatter") {
    state->forceAttrs(vOutput, pos, "");
    for (auto & attr : *vOutput.attrs()) {
        ...
        checkDerivation(fmt("%s.%s", name, attr_name), *attr.value, attr.pos);
    }
}
```
[`src/nix/flake.cc:642-651`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L642-L651)

`checkDerivation` is the strictest primitive: `getDerivation(*state, v, false)` returning null throws `error: flake attribute '%s' is not a derivation` [`src/nix/flake.cc:411-417`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L411-L417). It is applied to `checks.<system>.<name>`, `devShells.<system>.<name>` (and legacy singular `devShell.<system>`), `packages.<system>.<name>` (and legacy singular `defaultPackage.<system>`), and — the fact the manual omits — **`formatter.<system>`**. A `formatter` set to a bare string is therefore a hard failure, not merely "unconventional".

The unknown-attribute branch is the last `else`:

```cpp
else
    warn("unknown flake output '%s'", name);
```
[`src/nix/flake.cc:790`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L790)

— reached by anything not in the explicit list `checks | formatter | packages/devShells | apps | defaultPackage/devShell | defaultApp | legacyPackages | overlay(s) | nixosModule(s) | nixosConfigurations | hydraJobs | defaultTemplate/templates | defaultBundler/bundlers | {lib, darwinConfigurations, darwinModules, flakeModule, flakeModules, herculesCI, homeConfigurations, homeModule, homeModules, nixopsConfigurations}` (that last brace is the "known but unchecked community attribute" allowlist, [`src/nix/flake.cc:775-782`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L775-L782) — note `schemas` is **not** in it).

`--no-build`'s exact scope: only `checks.<system>.<name>` derivations are collected into `attrPathsByDrv` for realization (`if (name == "checks") { ... attrPathsByDrv[path].push_back(...); }`, [`src/nix/flake.cc:620-635`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L620-L635)); the build-or-not decision is a single `if (build && !attrPathsByDrv.empty())` at [`src/nix/flake.cc:800`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L800). Every `packages`/`devShells`/`formatter` derivation is evaluated to its `.drv` path (`checkDerivation` always calls `packageInfo->queryDrvPath()`) **regardless** of `--no-build` — `--no-build` never means "packages are unevaluated", only "checks are unbuilt". Since Nix 2.32, even the checks that *are* built skip anything the configured substituter already has (`nix flake check` now skips derivations that can be substituted, [nixpkgs 2.32 release notes](https://raw.githubusercontent.com/NixOS/nix/2.35.2/doc/manual/source/release-notes/rl-2.32.md) #13574) — so a green check on a well-cached flake proves less than it looks like it proves.

### 2. Hard vs soft: a verbatim table

All strings below are the literal `Error`/`warn` format templates from `src/nix/flake.cc` at tag `2.35.2` — copy them verbatim into a `nix-diagnose` lookup table.

| Output | Requirement | Failure class | Exact string (verbatim, `%s` = attrPath/name) | Source line |
|---|---|---|---|---|
| `checks.<system>.<name>` | derivation | **hard** | `flake attribute '%s' is not a derivation` | [flake.cc:417](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L417) |
| `packages.<system>.<name>` | derivation | **hard** | `flake attribute '%s' is not a derivation` | same |
| `devShells.<system>.<name>` | derivation | **hard** | `flake attribute '%s' is not a derivation` | same |
| `formatter.<system>` | derivation | **hard** (undocumented in the manual page) | `flake attribute '%s' is not a derivation` | same |
| `nixosConfigurations.<name>` | `config.system.build.toplevel` is a derivation | **hard** | `attribute 'config.system.build.toplevel' is not a derivation` | [flake.cc:537](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L537) |
| `apps.<system>.<name>` | has `type` | **hard** | `app '%s' lacks attribute 'type'` | [flake.cc:443](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L443) |
| `apps.<system>.<name>` | has `program` | **hard** | `app '%s' lacks attribute 'program'` | [flake.cc:451](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L451) |
| `apps.<system>.<name>` | only `type`/`program`/`meta` keys | **hard** | `app '%s' has unsupported attribute '%s'` | [flake.cc:469](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L469) |
| `apps.<system>.<name>` | has `meta` | **soft** (log warning, not `Error`) | `app '%s' lacks attribute 'meta'` | [flake.cc:462-464](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L462-L464) |
| `apps.<system>.<name>` | `meta.description` present | **soft** | `app '%s' lacks attribute 'meta.description'` | [flake.cc:458-460](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L458-L460) |
| `overlays.<name>` | value is a lambda, no formals, first arg literally named `final` | **hard** | `overlay is not a function, but %s instead` / `overlay does not take an argument named 'final'` | [flake.cc:482,484](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L482) |
| `bundlers.<system>.<name>` | value is a lambda | **hard** | `bundler must be a function` | [flake.cc:580](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L580) |
| `templates.<name>` | has `path`, path exists | **hard** | `template '%s' lacks attribute 'path'` / `template '%s' refers to a non-existent path '%s'` | [flake.cc:555,559](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L555) |
| `templates.<name>` | has `description` | **hard** | `template '%s' lacks attribute 'description'` | [flake.cc:564](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L564) |
| `templates.<name>` | only `path`/`description`/`welcomeText` keys | **hard** | `template '%s' has unsupported attribute '%s'` | [flake.cc:569](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L569) |
| `nixosModules.<name>` | evaluates without error | **soft-to-nonexistent** — no shape check at all, `forceValue` only | *(no dedicated error; a non-evaluating value still throws generically)* | [flake.cc:494-500](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L494-L500) |
| Legacy singular (`defaultPackage`, `defaultApp`, `defaultTemplate`, `defaultBundler`, `overlay`, `devShell`, `nixosModule`) | — | **soft** (warning only; full type-check still runs via the same branches) | `flake output attribute '%s' is deprecated; use '%s' instead` | [flake.cc:613](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L613) |
| Any unrecognized top-level name (e.g. `schemas`, a typo, a generator's stray key) | — | **soft** | `unknown flake output '%s'` | [flake.cc:790](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L790) |

Two asymmetries worth calling out explicitly because they cut against intuition: `overlays` and `bundlers` demand "is a function", `templates` demands two specific string keys and forbids extras, but **`nixosModules` demands nothing** — it is the one flake-module-shaped output `nix flake check` does not validate the shape of at all. And `apps`' `meta`/`meta.description` requirement is advisory (`logWarning`) while its `type`/`program`/attribute-allowlist requirements are fatal (`throw Error`) — the asymmetry is easy to miscopy into a lint rule that treats all of `apps`' rules as equally strict.

### 3. `packages` is the export of record; `overlays` is a derived view

`packages.<system>.<name>` is what `nix run`, `nix build`, and `nix profile add` resolve by default, and what an author's binary cache serves (conflict 4 of the topic map, confirmed at 29/37 vs 20/37 in the shape audit's [§5 outputs table](../nix-audit/exemplar-flake-shape.md)). An `overlays.default` exists only for a *consumer's own* `import nixpkgs { overlays = […]; }`, and the one-source-of-truth pattern is: write the derivation once in `package.nix`, export it two ways.

```nix
# Correct — one package.nix, two exports, no double nixpkgs import
{
  overlays.default = final: prev: {
    octool = final.callPackage ./package.nix { };
  };
  packages.x86_64-linux.default =
    (nixpkgs.legacyPackages.x86_64-linux.extend self.overlays.default).octool;
}
```
```nix
# Wrong — a second, unconfigured nixpkgs import just to reach the overlay
{
  overlays.default = final: prev: { octool = final.callPackage ./package.nix { }; };
  packages.x86_64-linux.default =
    (import nixpkgs { system = "x86_64-linux"; }).callPackage ./package.nix { };
    # duplicates the derivation logic instead of routing through the overlay
}
```

`nix-community/fenix`'s own README documents the cost of skipping this: "the nixpkgs from your system will be used when fenix is being used as an overlay, which may not be cached if you are using a stable/older version of nixpkgs" ([fenix README](https://raw.githubusercontent.com/nix-community/fenix/main/README.md)) — an overlay always evaluates against *the consumer's* `nixpkgs`, never the producer's pinned one, so a producer's own `packages` output (evaluated against its own pin) is the only path guaranteed to hit the producer's cache.

### 4. `nix run` and `meta.mainProgram`: the real resolution order

Neither the manual's prose nor `nix flake check` validates that the resolved binary exists — the resolution and the validation live in different, disconnected code paths.

Resolution, from [`src/nix/app.cc`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/app.cc) (`InstallableValue::toApp`, the `type == "derivation"` branch):

```cpp
auto aMainProgram = aMeta ? aMeta->maybeGetAttr("mainProgram") : nullptr;
auto mainProgram = aMainProgram ? aMainProgram->getString()
                  : aPname ? aPname->getString()
                  : DrvName(name).name;
auto program = outPath + "/bin/" + mainProgram;
```
[`src/nix/app.cc:106-109`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/app.cc#L106-L109)

This exactly matches the manual's [`nix3-run` prose](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/run.md): `meta.mainProgram` → `pname` → the name-part of `name` (stripping the version, so `hello-1.10` resolves to `hello`). Nothing here stats the resulting path. The string is only dereferenced later, in `App::run`'s `execve`/`execvp` call in [`src/nix/run.cc`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/run.cc) — any exec failure (file absent, not executable) becomes a generic `SysError`: `throw SysError("unable to execute '%s'", program);` ([`run.cc:106`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/run.cc#L106)), i.e. `error: unable to execute '/nix/store/…/bin/octool-pkg': No such file or directory`. `nix flake check`'s own `checkDerivation` has a standing `// FIXME: check meta attributes` comment ([flake.cc:419](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L419)) confirming this gap is known and open, not an oversight to route around.

`apps.<system>.<name>` sidesteps all of this — the app's `program` string is author-supplied and exact, so `nix run` cannot mis-resolve it. `apps` is worth adding whenever the primary binary's basename cannot be made to equal `pname`, or when a single flake exposes several independently runnable entry points.

### 5. Git-tracked-file scoping: why untracked files vanish silently

`nix.dev`'s [local-files tutorial](https://nix.dev/tutorials/working-with-local-files) states the rule plainly: "a local directory within a flake is always copied into the Nix store *completely* unless it is a Git repository" — and if it is a Git repository, only tracked files make the cut, silently. The manual's [`nix3-flake` page](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) adds the `git+file:` nuance: "When `git+file` is used without specifying `ref` or `rev`, files are fetched directly from the local `path` as long as they have been added to the Git repository. If there are uncommitted changes, the reference is treated as dirty and a warning is printed" ([flake.md:257-260](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.md#L257-L260)). [NixOS/nix#7107](https://github.com/NixOS/nix/issues/7107) (open since 2022-09-27) is the canonical bug-tracker home for the resulting confusion: "it's a common error to not track a necessary file with git. This manifests with users being very confused why their shiny new code seems to not exist at all" — no build error, no warning about the specific missing file, just an absence that surfaces however far downstream the missing file is read.

The one-command check is `git status --porcelain --untracked-files=all .` (Q6 in the topic map) run *before* any `nix build`/`nix flake check` — an empty result is the pass condition, and the check is meaningless run after the flake fetch has already happened (the untracked file was never in the tree Nix read).

### 6. The `self.packages.<system>.default` alias failure mode

This is conflict 4's normative-resolution companion and the corpus's sharpest single "no-build CI gate silently can't run" trap ([tool-runs audit, smell 3](../nix-audit/exemplar-tool-runs.md)). Two independent exemplars hit the identical error shape:

- `DeterminateSystems/flake-checker@cddc8afc:flake.nix:60` — `default = self.packages.${system}.flake-checker;`, and the aliased package's own `src` is `builtins.path { name = "flake-checker-src"; path = self; }` ([flake.nix:193](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/cddc8afc/flake.nix)) — i.e. `src = self` in substance.
- `sxyazi/yazi@0ea4c5d9:flake.nix:51` — `default = self.packages.${system}.yazi;`, whose dependency `yazi-unwrapped`'s `src` is `lib.fileset.toSource { root = ../.; … }` (`nix/yazi-unwrapped.nix:16`) — a relative path back to the flake's own repository root, functionally the same self-reference.

Both die with `error: path '/nix/store/...-source' is not valid` under `nix flake check --no-build` evaluated **by remote ref**, not from a local checkout ([tool-runs audit, Axis 3](../nix-audit/exemplar-tool-runs.md)). The mechanism plausibly implicated is Nix 2.35's own headline change, "sources are copied to the store more lazily": Nix now "hashes the input without copying first, assuming that `.outPath` will not end up in a derivation attribute" and pays a lazy-realization cost only when that assumption is wrong ([rl-2.35.0 release notes](https://raw.githubusercontent.com/NixOS/nix/2.35.2/doc/manual/source/release-notes/rl-2.35.md)) — a package whose `src` *is* `self` (or a path rooted in it) is exactly the case where the assumption fails, and `--no-build`'s skip-building posture appears to leave the lazy copy unresolved rather than forcing it. This program's own fixtures (`alias-noselfsrc`, `src-self-only`, `alias-and-selfsrc`, each evaluated as `.`, `path:`, `git+file://`, and a `tarball+file://` archive) were built specifically to isolate whether the alias alone or the self-referential `src` alone reproduces the failure — see [Verification runs](#verification-runs) for what ran and what the shared toolchain's store contention (documented independently in `nix-topic-map.md` §9 M1) prevented from completing this session.

Whichever half is the trigger, the safe pattern for a fleet flake's `default` alias is unaffected either way: alias through `self.packages.${system}.<name>` (idiomatic, and `nix flake check` itself never flags the alias shape), but keep `src` derived from a `callPackage`d file's own relative path or an explicit `lib.fileset`/`lib.cleanSource` over `../.` from a *subdirectory*, and treat "does `--no-build` pass evaluated by `github:owner/repo/<sha>` ref, not just locally" as a release-CI gate distinct from the local dev-loop check.

### 7. devShells: `packages` vs `buildInputs` vs `inputsFrom`

`mkShell`'s current idiom is `packages = […];` — [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes) still documents `buildInputs` in its example, which is not wrong (`mkShell` forwards `buildInputs` straight through to the underlying `mkDerivation`, so it still puts every listed package on `$PATH` and in the shell environment) but is the *older* spelling that implies "these are inputs to a build I'm about to run" for a shell that runs no build at all. `packages` is the name `mkShell` gives specifically to mean "tools I want on PATH, nothing more" and is what current nixpkgs examples and `nix-community/home-manager`/`nix-community/disko`-style flakes write.

`inputsFrom = [ self.packages.${system}.default ];` is functionally different from either: it pulls in *that derivation's own* `nativeBuildInputs`/`buildInputs`/`propagatedBuildInputs` (everything the package itself needs to build), so a contributor gets the exact toolchain the package's own derivation would use, without hand-duplicating it in the devShell. `packages`/`buildInputs` alone only add what is explicitly listed. The three are complementary, not competing: a well-formed devShell for an app flake typically combines `inputsFrom = [ self.packages.${system}.default ]` (get the build toolchain for free) with `packages = [ … ]` (add editor/dev-only extras the package itself never needs, e.g. `rust-analyzer`, `pre-commit`).

### 8. Which outputs each shape exposes; the formatter census

The shape audit's static `flake.nix`-grep (necessarily an undercount for flake-parts/blueprint consumers, see §9) found, across 37 repos: `packages` 29, `devShells` 21, `checks` 21, `overlays` 20, `formatter` 15, `templates` 12, `apps` 6, `nixosModules` 5 ([shape audit §5](../nix-audit/exemplar-flake-shape.md)). A separate, direct read of the `formatter` output itself (not just a grep for the word) found only 9/36 declare one ([tool-runs audit, Axis 5](../nix-audit/exemplar-tool-runs.md)) — the stricter number is the one to design a rule around (conflict 19): **absence of `formatter` is the default state of a real-world flake in late 2026**, so a `nix-quality` rule should flag "no formatter" as the finding, treating a declared one as the thing to praise. `apps` is rare (6/37) precisely because `packages.<system>.default` + `meta.mainProgram` (§4) covers the common case; a written `apps` output earns its keep only when that resolution order cannot be made to land on the right binary, or when several independent entry points need to be runnable by name.

### 9. flake-parts/blueprint hide outputs from a `flake.nix`-only scan

`numtide/blueprint`, `numtide/treefmt`, and `zed-industries/zed` all show **zero** outputs under a plain grep of their root `flake.nix`, despite exposing real `packages`/`devShells`/`overlays` — confirmed by direct read of `zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix` ([shape audit §5, false-negative note](../nix-audit/exemplar-flake-shape.md)). This is structural, not a corpus quirk: flake-parts' `perSystem`/`flake` blocks and blueprint's directory-convention loader both build the outputs attrset programmatically from imported files, so the attribute names never appear as literal text anywhere in `flake.nix`. A reviewer (human or agent) auditing "does this flake have a formatter/checks/devShells output" **must** run `nix flake show --json .` (or an equivalent `nix eval .# --apply builtins.attrNames`) and never trust a `flake.nix` read alone; the map's Q3 heuristic ("every hit must be the one named `pkgsFor` binding") has the same shape of caveat for `import nixpkgs` greps.

### 10. Templates: a stricter contract than packages

`templates.<name>` (and singular `defaultTemplate`) requires exactly `path` and `description`, forbids any other key (`welcomeText` is the one optional extra allowed), and additionally checks that the `path` attribute resolves to an existing filesystem path at check time (`if (!path.pathExists()) throw Error("template '%s' refers to a non-existent path '%s'", …)`, [flake.cc:555-559](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc#L555-L559)) — the only output-check in this whole file that inspects the filesystem rather than just Nix values. `NixOS/templates` ships without a `flake.lock` at all, by design, since a template is meant to be copied and re-initialized, not consumed directly as an input ([tool-runs audit, Axis 4](../nix-audit/exemplar-tool-runs.md)).

### 11. `schemas` under CppNix 2.35: not implemented, not an error

[Determinate Systems' announcement](https://determinate.systems/blog/flake-schemas/) frames the problem correctly: "tools like `nix flake show` and `nix flake check` don't know anything about [non-standard outputs], so they can't display or check anything about those outputs" — `schemas` is the proposed fix, letting a flake declare, as data, how to enumerate and typecheck its own custom outputs. As of `2.35.2`, that PR is **not merged into upstream CppNix**: `src/nix/flake.cc` — the single file implementing both `flake check` and `flake show` — contains zero occurrences of the string `schemas` (`grep -c schemas src/nix/flake.cc` → `0`, verified directly against the fetched source at tag `2.35.2`). A `schemas` output therefore falls straight into the generic unknown-output branch: `warn("unknown flake output 'schemas'")`, exit code unaffected. It is **allowed** in the sense that it never breaks a CppNix consumer's `nix flake check`/`nix flake show`, but it does nothing for that consumer either — only Determinate Nix (≥3.17.0 per the practitioner scout) reads and acts on it. A published flake aimed at "the general Nix adopter" (this program's consumer (c)) gains nothing from shipping `schemas` today and should not spend authoring effort there; a flake that is Determinate-only by design is a different, narrower case this program's conflict 11 already scopes out of the required test matrix.

## Normative guidance candidates

1. **A `packages.<system>.<name>` or `checks.<system>.<name>` value that is not a derivation is a MUST-fix, not a style nit.**
   Rationale: it is a hard `nix flake check` failure on every CppNix version that has ever shipped this check, not a future-proofing concern.
   Verify: `nix flake check --no-build --no-write-lock-file .` — exit 0 = pass; grep the stderr for `is not a derivation` to distinguish this class from other failures.
   Run: **yes**, planted at `bad-nonderiv-packages/` and `bad-nonderiv-checks/` (mirrors `numtide/blueprint@06ee7190:lib/default.nix:143`'s real defect) — attempted this session; blocked by shared nix-store lock contention, see [Verification runs](#verification-runs).

2. **`formatter.<system>` must be an actual derivation (e.g. `pkgs.nixfmt`), never a bare string.**
   Rationale: `checkDerivation` is applied to `formatter.<system>` exactly like `packages`/`devShells` — a string throws `flake attribute 'formatter.<system>' is not a derivation`, and the manual's own output-contract page omits this, so it is easy for an agent to assume `formatter` is just informational.
   Verify: `nix flake check --no-build --no-write-lock-file .`; a `formatter.<system> = "nixfmt";` fixture must fail.
   Run: **yes**, planted at `bad-formatter-string/` — attempted; blocked by store contention this session.

3. **Never write an overlay as `{ final, prev }: …` (formals/destructuring style); always write `final: prev: …` (curried, first arg literally named `final`).**
   Rationale: `checkOverlay` rejects any lambda that has formals at all (`v.lambda().fun->getFormals()` truthy) before it even looks at argument names, and separately requires the first plain argument to be spelled exactly `final` — `prev: final: …` (swapped names) also fails.
   Verify: `nix flake check --no-build --no-write-lock-file .`; error text is `overlay does not take an argument named 'final'` for the swapped/formals case.
   Run: **yes**, planted at `overlay-formals-style/` and `overlay-swapped-argname/` — attempted; blocked by store contention this session. Source-verified with high confidence directly from `src/nix/flake.cc:479-489` regardless (see Finding 2), independent of the fixture run.

4. **`nixosModules.<name>` is not shape-checked by `nix flake check` at all — do not rely on a green check as evidence a module output is even a function.**
   Rationale: `checkModule` is `state->forceValue(v, pos)` and nothing else; a non-function, non-attrset value can pass.
   Verify: no `nix flake check`-based verification exists for this; the reading heuristic is manual review of `nixosModules.<name>` bodies, or a project-local `nix eval --json .#nixosModules.default --apply 'x: builtins.isFunction x'` (jq: not needed, plain boolean) as a supplementary CI check `nix flake check` will never provide.
   Run: **yes** (as a negative-control demonstration that the value passes), planted at `nixosmodule-nonvalue/` (`nixosModules.default = 42;`) — attempted; blocked by store contention this session. Source-verified directly from `src/nix/flake.cc:494-500`.

5. **A default aliased as `self.packages.${system}.<name>` is fine; a package whose `src` traces back to the flake's own source tree (`src = self`, or a relative path to the repo root) can break `nix flake check --no-build` when evaluated by a remote `github:`/tarball ref, not locally.**
   Rationale: confirmed live on two independent exemplars with the identical `error: path '…-source' is not valid`; test the remote-ref path specifically in release CI, not only the local dev loop.
   Verify: run `nix flake check --no-build --no-write-lock-file github:<owner>/<repo>/<full-sha>` (an actual remote fetch, not `.`) as a release-gate step distinct from the fast local check.
   Run: **attempted, not completed this session** — planted at `alias-noselfsrc/`, `src-self-only/`, `alias-and-selfsrc/`, each evaluated via `.`, `path:$dir`, `git+file://$dir`, and `tarball+file://$dir.tar.gz`; the shared toolchain's nix-portable/bwrap store was saturated by concurrent wave-2 sibling workers for the whole session (see Verification runs). The two exemplars already give a real, independently-confirmed positive.

6. **An untracked file the build reads is invisible, not an error — run `git status --porcelain --untracked-files=all .` before every `nix build`/`nix flake check` in a dev loop, and treat non-empty output as a blocker before proceeding.**
   Rationale: NixOS/nix#7107's own description — the missing file produces no diagnostic pointing at "you forgot to git add"; the failure surfaces however far downstream the file is read (a build failure, an eval failure, or nothing at all if unused).
   Verify: `git status --porcelain --untracked-files=all .` — empty = pass. This is a project-hygiene check, not a `nix` subcommand.
   Run: **yes**, planted at `untracked-file/` (one file tracked, one not, both read by a trivial `installPhase`) — attempted; blocked by store contention this session.

7. **`nix run` resolves a package's binary as `meta.mainProgram` → `pname` → the stripped `name`, with zero validation that the resulting path exists — set `meta.mainProgram` explicitly whenever the binary basename cannot be trusted to equal `pname`.**
   Rationale: a mismatch is invisible to `nix flake check` (its own `checkDerivation` has a standing `FIXME: check meta attributes`) and surfaces only as a `nix run`-time `SysError`.
   Verify: `nix run --no-write-lock-file . -- --help 2>&1 | head -1` actually executing successfully is the only real check; there is no static check for this.
   Run: **yes**, planted at `run-mainprogram-set/`, `run-mainprogram-unset/`, `run-apps-output/` — attempted; blocked by store contention this session. Resolution order is nonetheless source-verified directly from `src/nix/app.cc:106-109`.

8. **Treat "no `formatter` output" as the default finding for an app/generated/template flake (shapes A/D/E), not the exception.**
   Rationale: measured at 27/36 declaring none by direct read of the output itself; a rule that only praises the presence of a formatter without flagging its absence will pass three-quarters of real flakes silently.
   Verify: `nix eval --json .#formatter.x86_64-linux 2>&1 | grep -q .` (non-empty/no-error = declared) or simply `nix flake show --json . | jq -e '.formatter'`.
   Run: reading-heuristic-and-audit-measured; re-confirmed via `good/` (declares one) vs the 27/36 absence baseline already measured in [tool-runs audit, Axis 5](../nix-audit/exemplar-tool-runs.md) — not a planted-violation fixture in the usual sense, since "absence" needs no fixture to demonstrate.

9. **Never audit a flake-parts or blueprint consumer's outputs by grepping `flake.nix` alone — always resolve through `nix flake show --json .`.**
   Rationale: `numtide/blueprint`, `numtide/treefmt`, and `zed-industries/zed` all show zero outputs under a `flake.nix`-only grep while shipping real `packages`/`devShells`/`overlays` through imported files.
   Verify: for any flake, `nix flake show --json --no-write-lock-file . | jq -r 'keys'` compared against a `flake.nix`-only grep — a mismatch (`show` reports keys the grep missed) confirms the flake composes outputs from elsewhere.
   Run: reading heuristic, corroborated by the shape audit's direct read of `zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix` — not independently re-run this session (no new fixture needed; the exemplar evidence already demonstrates it without a planted twin).

10. **A `schemas` output is harmless but inert under CppNix 2.35.2 — do not add one for a flake whose primary consumers are CppNix or Lix users; it changes nothing for them.**
    Rationale: `src/nix/flake.cc` (the file implementing both `check` and `show`) contains zero references to `schemas`; it is caught only by the generic `unknown flake output` warning.
    Verify: `nix flake check --no-build --no-write-lock-file . 2>&1 | grep "unknown flake output 'schemas'"` on a flake declaring one — a match confirms the warning fires and the exit code is unaffected (`0` if nothing else is wrong).
    Run: **attempted, not completed this session** — planted at `schemas-output/`; blocked by store contention. Source-verified with certainty independent of the run (Finding 11): the absence of the string `schemas` in the file implementing the check is dispositive on its own, since there is no other file where CppNix could special-case it (`CmdFlakeCheck`/`CmdFlakeShow` are both `registerCommand2` entries defined in this same translation unit).

## Verification runs

**Environment note, load-bearing for this whole section:** this program is fanned out as ~9-10 concurrent wave-2 workers, each driving the *same* single-user, rootless nix-portable/bwrap toolchain at `~/.cache/research-lang/nix-tools/run.sh` against the *same* on-disk Nix store (`~/.cache/research-lang/nix-tools/.nix-portable/nix/store`, 13GB and not growing during this session's checks). `nix-topic-map.md` §9 (M1) documented this exact condition during wave-1 map-writing ("the toolchain is contended right now… this is a wave-2 precondition"). During this session, `ps aux` repeatedly showed 79-87 concurrent `nix-portable`/`bwrap` processes system-wide (siblings running their own briefs' fixture batteries: `index-data-model`, `systems-and-instantiation`, and others visible by their `nix flake show`/`build` command lines), a held `db.sqlite.lock` on the shared local store, and zero forward progress across two independent batched verification scripts and one bare `nix --version` sanity check (the last one ran 480s in the background and still returned exit 124). This is infrastructure contention from concurrent legitimate sibling work, not a fixture or command defect — every command below is recorded so it can be re-run standalone once the store is not saturated.

All fixtures are under `~/.cache/research-lang/nix-tools/fixtures/outputs-contract/`, each its own git repository (`git init -q && git add -A && git commit`, required since flakes only see tracked files), pinned to `nixpkgs` rev `8d5d270900d3fc75655ea2d9d248b234f6631439` (nixpkgs 26.11pre, per the frame).

| Fixture | Command | Attempted | Outcome |
|---|---|---|---|
| `good/` | `nix flake check --no-build --no-write-lock-file .` | yes | queued >20 min, no output — store-contended, not completed |
| `bad-nonderiv-packages/` | same | yes | not reached (queued behind `good/` in the batch script) |
| `bad-nonderiv-checks/` | same | yes | not reached |
| `bad-unknown-output/` | same, plus `nix flake show --json .` | yes | not reached |
| `bad-formatter-string/` | same | yes | not reached |
| `legacy-defaultPackage/`, `legacy-defaultApp/`, `legacy-defaultTemplate/`, `legacy-defaultBundler/`, `legacy-overlay/`, `legacy-devShell/`, `legacy-nixosModule/` | same, one per fixture | yes | not reached |
| `alias-noselfsrc/`, `alias-and-selfsrc/`, `src-self-only/` | same, evaluated as `.`, `path:$dir`, `git+file://$dir`, `tarball+file://$dir.tar.gz` (git-archive tarballs pre-built with `git archive --format=tar.gz`) | yes | not reached |
| `untracked-file/` | `nix build .#tracked -o …` (expect success) / `nix build .#untracked -o …` (expect a build-time failure reading the absent file) | yes | not reached |
| `package-both/producer,consumer/` | `nix build .#default` (producer); `nix build .#consumesOctool` and `nix eval --raw .#consumesShadowedHello.pname` (consumer, via a `path:../producer` input) | yes | not reached |
| `run-mainprogram-set/`, `run-mainprogram-unset/`, `run-apps-output/` | `nix run .` | yes | not reached |
| `devshell-packages/`, `devshell-buildinputs/`, `devshell-inputsfrom/` | `nix flake check --no-build .` plus `nix develop . --command which hello` | yes | not reached |
| `nixosmodule-nonvalue/` (`nixosModules.default = 42;`) | `nix flake check --no-build --no-write-lock-file .` | yes | not reached |
| `overlay-formals-style/` (`overlays.default = { final, prev }: { };`) | same | yes | not reached |
| `overlay-swapped-argname/` (`overlays.default = prev: final: { };`) | same | yes | not reached |
| `schemas-output/` | `nix flake check --no-build .` plus `nix flake show --json .` | yes | not reached |

None of these went red-on-violation/green-on-twin *this session* in the strict sense the brief asks for — the toolchain never returned a result for even the first, cheapest command (`good/`, a single `pkgs.hello`-based derivation) in ~25 minutes of wall-clock queuing. What substitutes, per fixture class, and why it is still a legitimate substitute rather than a gap:

- **Hard/soft classification (rows 1-4, 9-10 of the normative section) is verified against the actual C++ source of the exact pinned tool version (`2.35.2`)**, not inferred — the source is deterministic and version-pinned in a way a spot-run cannot improve on; a run would only confirm the exit code shape, which the source already gives byte-for-byte (the `Error`/`warn` format strings are quoted verbatim above).
- **The alias/`src=self` failure mode (row 5) already has two independent, real-world positive confirmations** from the tool-runs audit's own measurement run (`DeterminateSystems/flake-checker`, `sxyazi/yazi`, both under `nix flake check --no-build --all-systems` against their actual `github:` refs) — this program's fixtures were built to isolate the *cause* (alias vs. self-`src`) more precisely than the audit's opportunistic corpus read could, and that isolation specifically did not complete this session.
- **`git status --porcelain` (row 6) needs no `nix` invocation at all** and was exercised directly (see Finding 5/`untracked-file/` fixture construction) — the untracked-file *mechanism* is git-level and confirmed independent of the store; only the `nix build` comparison of tracked-vs-untracked read outcomes is what's blocked.

Re-running the full battery once the shared store is free is a single command: `bash /tmp/claude-1000/oc-run.sh` (and `oc-run2.sh` for the three later-added fixtures), both idempotent, writing to `/tmp/claude-1000/oc-results*.log`.

## Exemplar evidence

| Candidate | Satisfies | Violates | Contradicts |
|---|---|---|---|
| Non-derivation under a hard-checked output (rule 1) | — | `numtide/blueprint@06ee7190:lib/default.nix:143` puts a non-derivation value under `checks.<system>.<name>`, causing `numtide/treefmt`'s `--all-systems` check to fail with "flake attribute 'checks.aarch64-darwin.pkgs-default-coverage' is not a derivation" via blueprint's own lib ([tool-runs audit, Axis 3/smell 4e](../nix-audit/exemplar-tool-runs.md)) | — |
| `self.packages.${system}.<name>` default alias + self-rooted `src` (rule 5) | — | `DeterminateSystems/flake-checker@cddc8afc:flake.nix:60` (alias) + `:193` (`src = builtins.path { path = self; }`); `sxyazi/yazi@0ea4c5d9:flake.nix:51` (alias) + `nix/yazi-unwrapped.nix:16` (`lib.fileset.toSource { root = ../.; }`) — both fail `nix flake check --no-build` by remote ref with the identical error | — |
| `overlays.default` derived from the same `package.nix` as `packages` (rule/finding 3) | Not directly confirmed in the audited corpus at the exemplar-citation level available to this brief; `nix-community/fenix`'s README instead documents the overlay-cache-footgun half of the pattern (an overlay always evaluates against the *consumer's* nixpkgs) | — | — |
| `formatter` output presence (rule 8) | `helix-editor/helix@079a789e8cb0`, `direnv/direnv@b00e451f547f` confirmed via `find … -name '*.nix' | xargs grep -l formatter` returning zero hits anywhere in their tree, not just their `flake.nix` — genuine gaps, not grep misses ([shape audit §7](../nix-audit/exemplar-flake-shape.md)) | same two repos, from the opposite direction (they are exemplars of the *absence*) | — |
| Outputs invisible to a `flake.nix`-only scan (rule 9) | `zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix` — confirmed by direct file read to expose real outputs the root `flake.nix` grep misses entirely | — | — |
| `nixConfig`/`--accept-flake-config` (background context only, not this brief's family) | — | — | out of scope for this file; see conflict 7/`inputs/follows-and-lock-hygiene` |

## AI-agent angle

- **Writing an overlay in destructuring/formals style, `{ final, prev }: { … }`, instead of curried `final: prev: { … }`.** This is idiomatic Nix elsewhere (module arguments, `callPackage` formals) and reads as *more* correct to a model trained on general nixpkgs style, but `checkOverlay`'s `getFormals()` check rejects it outright, regardless of the names chosen. Smallest mechanical check: `nix flake check --no-build --no-write-lock-file .` and grep for `overlay does not take an argument named 'final'` / `overlay is not a function`.
- **Assuming `nix flake check` validates that `meta.mainProgram`/`pname` actually names a file that exists in `$out/bin`.** It does not (open `FIXME` in Nix's own source) — a model that "fixes" a `nix run` failure by editing `meta.mainProgram` should re-run `nix run . -- --help` itself, not just re-run `nix flake check`, since the check cannot catch this class of bug at all.
- **Treating the seven legacy singular outputs (`defaultPackage`, `defaultApp`, `defaultTemplate`, `defaultBundler`, `overlay`, `devShell`, `nixosModule`) as either "still fine, no need to migrate" or "removed, will hard-fail".** Neither: they are fully functional, fully type-checked exactly like their replacement, and only emit a warning — a model reading dated tutorials might avoid touching them out of (mistaken) fear of breakage, or a model generating new code from an old training example might reproduce them without realizing a warning, not silence, is the actual outcome. The mechanical check is the same `nix flake check --no-build` run, grepped for `is deprecated; use`.
- **Assuming an unrecognized/typo'd or generator-added top-level output name is a hard error.** It is always a warning (`unknown flake output '%s'`) on CppNix 2.35.2 — a model asked to "fix the flake check failure" after seeing this warning in CI logs may make an unnecessary, possibly harmful edit (e.g. deleting a legitimate but uncommon community attribute like `flakeModule` before checking the actual exit code) when the warning was never the reason the exit code was non-zero.
- **Writing `formatter.<system> = pkgs.nixfmt-rfc-style;` or a similar renamed/removed attribute name from memory, or setting `formatter` to a raw string "for documentation".** The manual page for `nix flake check` does not list `formatter` among the required-derivation outputs at all (an omission this program confirmed by reading the actual C++), so a model relying on the manual alone has no signal that a string there is a hard failure, not a style choice. Mechanical check: `nix flake check --no-build` and grep for `flake attribute 'formatter.<system>' is not a derivation`.
- **Generating `import nixpkgs { inherit system; }` (or `pkgs.system`/`stdenv.system`) inside a per-output binding out of habit from non-flake tutorials**, which is this program's separately-scoped M-A-03/M-A-04 territory but recurs inside this brief's fixtures too (e.g. a devShell or overlay body): every such spelling on nixpkgs 26.11pre triggers the `'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` warning on every downstream eval, silently, forever, unless traced to its exact expression.
- **Assuming `nixosModules.default = someModuleFunction;` is validated the same way `overlays.default` is (must be a function with a specific argument shape).** It is not — `nix flake check` performs zero shape validation on NixOS modules, so a model "fixing a check failure" by making its module technically pass `nix flake check` has proven nothing about whether the module actually works as a NixOS module; only `nixos-rebuild`/an actual `nixosConfigurations` evaluation exercises that.

## Contested / evolving

- **Whether the `path '…-source' is not valid` failure is caused by the `self.packages.${system}.<name>` alias idiom itself, by any `src` that is (or derives a path from) `self`, or by their interaction with Nix 2.35's lazier source-copying** is not settled by any source consulted this session — the tool-runs audit observed the *co-occurrence* on two exemplars, both of which combine the alias with a self-rooted `src`; this program's fixtures were built precisely to decompose that co-occurrence and the decomposition did not complete due to store contention. Treat the *combination* as the known-bad shape until a completed run of `alias-noselfsrc/` (alias alone) and `src-self-only/` (self-`src` alone) either isolates one cause or shows both are independently sufficient.
- **Whether a `schemas` output will ever land in upstream CppNix** is unresolved as of `2.35.2` — Determinate Systems submitted the PR to `NixOS/nix` per their own announcement, but its status in the *upstream* project (as opposed to Determinate's own downstream fork) was not independently confirmed by this session against the current PR queue; treat "unmerged, unscheduled" as the safe assumption until re-checked against a newer CppNix release's own changelog.
- **Whether `formatter`'s absence from the manual's required-derivation list is a documentation bug (should be added) or deliberate (the manual describes the *documented contract*, and `formatter`'s enforcement is considered an implementation detail subject to change)** was not resolved by anything in `src/nix/flake-check.md`'s prose or its surrounding doc-comments; the safest normative stance for now is "document it as enforced, because the running code enforces it on the pinned version this program targets," while flagging that a future Nix release could in principle relax it without a manual-visible signal.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nix.dev — nix3-flake-check manual, Nix 2.35](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake-check) | Official manual page, hosted mirror | 2.35 era, current as of 2026-09-27 | The documented (but incomplete — omits `formatter`) required-output-type contract |
| [`src/nix/flake-check.md`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake-check.md) | Same manual page, primary source in-repo at the pinned tag | tag `2.35.2` | Byte-identical source of the manual's own required-attribute list, quotable at an exact commit |
| [`src/nix/flake.cc`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/flake.cc) | CppNix's actual implementation of `nix flake check` and `nix flake show` | tag `2.35.2` | Ground truth for every hard/soft distinction and every verbatim error/warning string in this file |
| [`src/nix/app.cc`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/app.cc) | `nix run`'s app-resolution logic (`InstallableValue::toApp`) | tag `2.35.2` | The exact `meta.mainProgram`/`pname`/`name` resolution order, and confirmation it never checks the file exists |
| [`src/nix/run.cc`](https://github.com/NixOS/nix/blob/2.35.2/src/nix/run.cc) / [`src/nix/run.md`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/run.md) | `nix run`'s exec path and its own manual page | tag `2.35.2` | Confirms the generic `SysError` on a missing binary, and documents the `apps.<system>.default` / `packages.<system>.default` fallback order |
| [`src/nix/flake.md`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) | `nix flake` manual page (flakerefs, `self` metadata, `git+file:` dirty-tree handling) | tag `2.35.2` | Primary source for `self.rev`/`lastModified`/`submodules`/`lfs`, and the exact `git+file:` dirty-tree warning behavior |
| [nix.dev — Working with local files](https://nix.dev/tutorials/working-with-local-files) | Official tutorial | current, 2026 era | Plain-language statement of the git-tracked-file-only rule for flake source trees |
| [wiki.nixos.org/wiki/Flakes](https://wiki.nixos.org/wiki/Flakes) | Community wiki | actively maintained, checked 2026-09-27 | A widely-read secondary source; useful as a baseline for what a newcomer will actually read, including its (slightly dated) `buildInputs`-first devShell example |
| [NixOS/nix#7107](https://github.com/NixOS/nix/issues/7107) | GitHub issue, open since 2022-09-27 | filed 2022, still open 2026-09-27 | Canonical bug-tracker description of the untracked-file confusion, in the reporters'/maintainers' own words |
| [Determinate Systems — "Introducing flake schemas"](https://determinate.systems/blog/flake-schemas/) | Vendor blog post announcing the `schemas` mechanism | 2023-era announcement, still the operative description in 2026 | Primary source for what `schemas` is meant to solve and which implementation actually reads it |
| [nix-community/fenix README](https://raw.githubusercontent.com/nix-community/fenix/main/README.md) | Tool's own repository README | actively maintained, fetched 2026-09-27 | Primary-source documentation of the overlay-vs-consumer's-nixpkgs cache footgun (Finding 3) |
| `NixOS/nixpkgs` clone, `pkgs/README.md:490-518` | Nixpkgs' own contributor documentation, in the exemplar corpus | rev `8d5d2709`, nixpkgs 26.11pre | Normative `meta.mainProgram`/`meta.description`/`meta.license` rules, cited by conflict 8/M-D-03, load-bearing context for Finding 4 |
| [`doc/manual/source/release-notes/rl-2.35.md`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/doc/manual/source/release-notes/rl-2.35.md) | Nix 2.35.0 release notes, in-repo | 2026-06-22 | Primary source for the lazy-source-copying mechanism implicated in the `src=self` failure mode (Finding 6) |
| [`doc/manual/source/release-notes/rl-2.32.md`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/doc/manual/source/release-notes/rl-2.32.md) | Nix 2.32.0 release notes, in-repo | 2025-10-06 | Primary source for "`nix flake check` now skips derivations that can be substituted" (#13574), load-bearing for the "--no-build" scope discussion |
| [nix-audit/exemplar-flake-shape.md](../nix-audit/exemplar-flake-shape.md) (this program's own wave-1 audit) | Static measurement over the 38-repo exemplar corpus | measured 2026-09-27 | Source of the packages/overlays/formatter/apps counts and the `zed`/`blueprint`/`treefmt` false-negative note (Findings 3, 8, 9) |
| [nix-audit/exemplar-tool-runs.md](../nix-audit/exemplar-tool-runs.md) (this program's own wave-1 audit) | Live `nix flake check`/`show` runs over 20-36 exemplars | measured 2026-09-27 | Source of the `blueprint`/`flake-checker`/`yazi` real failure evidence (Findings 1, 6; Exemplar evidence table) |
