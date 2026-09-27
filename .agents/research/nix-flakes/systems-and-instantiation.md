---
title: "Systems iteration, the nixpkgs instance, and the skeleton every shape starts from"
topic: nix-flakes/systems-and-instantiation
agent: nix-flk-01
model: sonnet
date_researched: 2026-09-27
sources_count: 20
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/systems-and-instantiation/
scope: |
  Covers: how a flake iterates systems (genAttrs, nix-systems, flake-parts,
  flake-utils), how many nixpkgs instances a flake creates, the exact
  expression that emits nixpkgs 26.11's `'system'` rename warning, the
  warning-free spelling of a configured import, the x86_64-darwin drop and
  how a declared system list survives it, and default skeletons for shapes
  A-E. Does not cover: which flake outputs must be derivations (M-A-05..15,
  `flakes/outputs-and-checks`), input-follows policy beyond the systems-input
  case (`inputs/inputs-and-lock`), or packaging/fetcher rules (`nix-quality/packaging.md`).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Four real strategies, none a majority](#1-four-real-strategies-none-a-majority)
   2. [The hidden-default-list failure mode, reproduced](#2-the-hidden-default-list-failure-mode-reproduced)
   3. [nixpkgs instantiation: one call site, at most, per system](#3-nixpkgs-instantiation-one-call-site-at-most-per-system)
   4. [The `'system'` rename warning: not what the audit's headline implied](#4-the-system-rename-warning-not-what-the-audits-headline-implied)
   5. [The x86_64-darwin drop and how a system list survives it](#5-the-x86_64-darwin-drop-and-how-a-system-list-survives-it)
   6. [Lock growth: `follows` saves exactly one node, every time](#6-lock-growth-follows-saves-exactly-one-node-every-time)
   7. [flake-parts has a real, measurable per-eval cost](#7-flake-parts-has-a-real-measurable-per-eval-cost)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Four real systems-iteration strategies exist in current practice; no single one is a majority (`genAttrs`/hand-rolled 29/37, flake-parts 12/37, `nix-systems` 9/37, flake-utils 7/37 — [shape](../nix-audit/exemplar-flake-shape.md) §3).
- The sanctioned default is `nixpkgs.lib.genAttrs <explicit-literal-list>` mapping to `nixpkgs.legacyPackages.<system>` — it adds zero input nodes and zero lock growth to a consumer.
- flake-utils is never added to a new flake (last commit 2024-11-13, deprecation issue [#86](https://github.com/numtide/flake-utils/issues/86) open since 2023 with no maintainer resolution); an existing use is a SHOULD-migrate, not a MUST.
- flake-parts is accepted, never required, and its acceptance condition is concrete: the flake already imports flake-parts *modules* (treefmt-nix, git-hooks.nix) or exports a `flakeModule` — not "systems handling" alone.
- **Re-measured, contradicting the audit's own headline claim**: `import nixpkgs { inherit system; }` called once per output, by itself, does **not** emit nixpkgs 26.11's `'system' has been renamed…` warning — I built the minimal fixture and ran `nix flake check --no-build --all-systems` against it (packages + devShells, 3 systems): zero warnings. The warning fires only when code actually reads the deprecated `.system` attribute off a pkgs-shaped value (`pkgs.system`, `nixpkgs.legacyPackages.<system>.system`, `pkgsFor.${system}.system`) — verified: adding one such read to an otherwise-identical fixture produces the warning on every system, every eval.
- The warning's exact source, read from nixpkgs itself: `pkgs/top-level/aliases.nix:2498` — `system = warnAlias "'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'" stdenv.hostPlatform.system;`. It is a **top-level attribute alias**, not a warning on the `import nixpkgs {}` argument.
- The warning-free spelling is therefore not about which argument you pass to `import nixpkgs { … }` (all of `system`, `localSystem = system;`, and `localSystem.system = system;` elaborate identically via `lib.systems.elaborate`'s `systemToAttrs` coercion) — it is about never reading `pkgs.system` downstream; use `pkgs.stdenv.hostPlatform.system` (or `pkgs.stdenv.system`, itself un-aliased) everywhere a system string is needed.
- `import nixpkgs { inherit system; }`, even from inside a flake, still routes through `pkgs/top-level/impure.nix` (nixpkgs's root `default.nix` unconditionally imports it) — it remaps legacy `system` into `localSystem` before ever reaching `pkgs/top-level/default.nix`, so the two spellings are not actually two different code paths.
- nixpkgs 26.11 (rev `8d5d2709`) throws `"Nixpkgs 26.11 has dropped support for x86_64-darwin."` (`lib/trivial.nix:1003`) the instant any attribute under that system is evaluated; `nixos-26.05` still builds it but now itself warns "will be the last release to support x86_64-darwin" — confirmed live on both branches.
- A **hand-rolled explicit system list sidesteps the drop by omission**; both flake-utils's and `nix-systems/default`'s own default lists still include `x86_64-darwin` as of 2026-09-27, so adopting either "modern" helper does not itself protect a flake from `--all-systems` breakage — the fix is the literal list, not the helper choice.
- `nix flake check --no-build --all-systems` **is** a real, watchable check for this: it went red (exit 1, "Nixpkgs 26.11 has dropped support for x86_64-darwin") on both the flake-utils and nix-systems fixtures (their hidden 4-system default) and green (exit 0) on genAttrs/flake-parts fixtures using an explicit 3-system list.
- `follows` saves exactly one lock node per collapsed nixpkgs, confirmed across all four systems-strategies: consumer node counts (incl. `root`) were genAttrs 4→3, flake-utils 6→5, nix-systems 5→4, flake-parts 6→5 (no-follows → follows).
- The map's Q1 jq check (count of nixpkgs-shaped lock nodes) was watched red (`2`) on the no-follows consumer and green (`1`) on the follows consumer — a clean, reproducible red/green pair.
- Base-flake lock size by strategy (own nodes incl. root): genAttrs 2, nix-systems 3, flake-utils 4, flake-parts 4 — genAttrs is the only strategy that adds zero extra input nodes.
- flake-parts has a measurable per-eval cost distinct from its inputs: `nix eval .#packages.x86_64-linux --apply builtins.attrNames` took 2.17s against 0.22s for the equivalent genAttrs fixture (module-system evaluation overhead, not just a fetch).
- `lib.systems.flakeExposed` (used by `lib.genAttrs lib.systems.flakeExposed`, as `helix-editor/helix` does) is nixpkgs's own *descriptive* list of 8 systems including `x86_64-freebsd` and `powerpc64le-linux` — it is not "the systems I test," and evaluating it under `--all-systems` is exactly what triggers helix's own infinite recursion in its `pkgsFor` helper, per the tool-runs audit.
- `lib.systems.elaborate` accepts either a bare string or an attrset (`systemToAttrs`), so `localSystem = system;` (bare string) and `localSystem.system = system;` (attrset) are equivalent inputs to `import nixpkgs { … }` — neither is "more correct" than the legacy `system = system;` at the elaboration level; correctness lives entirely downstream, in never reading `.system` off the result.
- `packages` is exposed once per system via a single named `pkgsFor` binding; a configured import (unfree, an overlay the flake itself needs) happens at most once per system in that one binding, never inside an output attribute body.

## Findings

### 1. Four real strategies, none a majority

Systems iteration in current practice ([shape](../nix-audit/exemplar-flake-shape.md) §3, 37 exemplars): `genAttrs`/hand-rolled forAllSystems 29, flake-parts 12, `nix-systems` input 9, flake-utils 7, blueprint 5 (not mutually exclusive). flake-utils is the **least**-used of the four, and its own upstream is stalled: `numtide/flake-utils@11707dc2f618` last committed 2024-11-13; [issue #86](https://github.com/numtide/flake-utils/issues/86) (opened 2023-01-02) argues flake-parts should replace it because flake-parts "separat[es] attributes that are truly hermetic from those that depend on a particular system" — flake-utils cannot express that distinction and lets you nest a system-agnostic output like `nixosConfigurations` inside `eachSystem` by mistake, producing `nixosConfigurations.<system>.nixos` instead of `nixosConfigurations.nixos`.

Two independent practitioner sources make the same point about the *hidden list*, not about flake-utils's type-safety:

> "why should a command like `nix flake show` display all systems when the user only cares about just one?" — [nix-systems README](https://github.com/nix-systems/nix-systems)

> "over 4100 results" for `flake.lock` files containing `flake-utils_*` … "your `flake.lock` file can end up with multiple pins for flake-utils" — [nixcademy: 1000 instances of flake-utils](https://nixcademy.com/posts/1000-instances-of-flake-utils/)

nix-systems's design is genuinely different from flake-utils's: it is not a helper library, it is a *convention* — the `systems` input is reserved, `import systems` returns a plain list, and a consumer overrides it with `--override-input systems github:nix-systems/x86_64-linux` or a `follows`, without forking anything:

```nix
inputs.systems.url = "github:nix-systems/default";
outputs = { systems, nixpkgs, ... }:
  let eachSystem = nixpkgs.lib.genAttrs (import systems);
  in { packages = eachSystem (system: { /* ... */ }); };
```

flake-parts's own `systems` option is a plain list with no default (empty `[ ]`) — the framework never hides it:

```nix
outputs = inputs@{ flake-parts, nixpkgs, ... }:
  flake-parts.lib.mkFlake { inherit inputs; } {
    systems = [ "x86_64-linux" "aarch64-darwin" ];
    perSystem = { config, pkgs, ... }: { packages.hello = pkgs.hello; };
  };
```
([flake.parts/options/flake-parts](https://flake.parts/options/flake-parts))

### 2. The hidden-default-list failure mode, reproduced

I built four fixtures exposing an identical `packages.default = pkgs.hello;` under each strategy and ran `nix flake check --no-build --all-systems` against each (fixtures: `flake-utils-eachdefault/`, `nix-systems-input/`, `genattrs-legacy/`, `flake-parts-persystem/`).

- `flake-utils-eachdefault` (`flake-utils.lib.eachDefaultSystem`): **exit 1**. Fails on `packages.x86_64-darwin.default` with `error: Nixpkgs 26.11 has dropped support for x86_64-darwin.` flake-utils's hidden default list is `[ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ]` — the author never wrote `x86_64-darwin` anywhere, but it is in the flake's system matrix anyway.
- `nix-systems-input` (`import systems` from `github:nix-systems/default`): **exit 1**, identical error. `nix-systems/default`'s own list also still includes `x86_64-darwin` as of 2026-09-27 (confirmed by resolving its `HEAD`/`main`: `da67096a3b9bf56a91d16901293e51ba5b49a27e`).
- `genattrs-legacy` and `flake-parts-persystem` (both hand-authoring an explicit 3-system list `[ x86_64-linux aarch64-linux aarch64-darwin ]`, deliberately excluding `x86_64-darwin`): **exit 0** on both.

The lesson is not "flake-utils is broken" (H1's framing) and not "nix-systems is the fix" — it is that **an explicit, author-curated list is what survives a platform drop; the helper you pick to iterate that list is orthogonal.** A flake that adopts `nix-systems/default` for its "modern, consumer-overridable" story still inherits the same poisoned default unless the author overrides it to `nix-systems/default-linux` or a hand-picked list.

### 3. nixpkgs instantiation: one call site, at most, per system

[shape](../nix-audit/exemplar-flake-shape.md) §4 measured `import nixpkgs { … }` in 17/37 repos (44 files), concentrated in test/example fixtures (`ipetkov/crane@73b980519cef`'s 10 hits are all under `examples/`) rather than production outputs — H1's "1000 instances" framing over-states the exemplar corpus. But [runs](../nix-audit/exemplar-tool-runs.md)'s headline shows the idiom is still live-harmful at least once: `cachix/devenv@6d76db3889de`'s cold eval fetches **four distinct nixpkgs-shaped inputs** (`cachix/devenv-nixpkgs`, `NixOS/nixpkgs`, `oxalica/rust-overlay`, `cachix/nix`) and triggers a real local build during a plain `nix eval` (95.6s), because one of them is consumed as a fork the flake itself patches (IFD), not merely `follows`-collapsible.

The resolved default: one named binding per system.

```nix
let
  systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
  forAllSystems = nixpkgs.lib.genAttrs systems;
  pkgsFor = forAllSystems (system: import nixpkgs {
    inherit system;
    overlays = [ self.overlays.default ];   # only if the flake needs one
  });
in {
  packages = forAllSystems (system: { default = pkgsFor.${system}.hello; });
}
```

`packages`/`overlays` never call `import nixpkgs` a second time per system — every output reads the same `pkgsFor.${system}`. `nixpkgs.legacyPackages.${system}` is the even cheaper unconfigured form and needs no `pkgsFor` binding at all (used by `genattrs-legacy`, `nix-systems-input`; see §6 lock-size data).

### 4. The `'system'` rename warning: not what the audit's headline implied

The [tool-runs audit](../nix-audit/exemplar-tool-runs.md)'s headline attributes 56/56 observed `evaluation warning: 'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'` warnings to `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45`:

```nix
forSystem = system: f: f rec {
  inherit system;
  pkgs = import nixpkgs { inherit system; overlays = [ self.overlays.default ]; };
  lib = pkgs.lib;
};
```

**I could not reproduce the warning from this idiom alone.** Fixture `per-output-import/` calls `import nixpkgs { inherit system; }` independently inside both a `packages` output *and* a `devShells` output (the textbook "re-instantiate per output" anti-pattern) and I ran `nix flake check --no-build --all-systems` against it — forcing full derivations for 3 systems across two output kinds: **zero warnings**, exit 0. See [Verification runs](#verification-runs).

Fixture `pkgs-system-ref/` is identical except one output reads `pkgs.system` explicitly (`"hello-on-${pkgs.system}" = pkgs.hello;`): the warning fires on every one of the 3 systems, every time, both under plain `nix eval --apply builtins.attrNames` and under `nix flake check --all-systems`.

Reading nixpkgs's own source resolves the mechanism precisely — it is a **top-level attribute alias**, not anything about the `import` argument:

```nix
# pkgs/top-level/aliases.nix:2498
system = warnAlias "'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'" stdenv.hostPlatform.system; # Converted to warning 2025-10-28
```

`pkgs/top-level/impure.nix` (nixpkgs's own root `default.nix` unconditionally does `import ./pkgs/top-level/impure.nix`, so **even inside a flake**, `import nixpkgs { inherit system; }` goes through this file) shows the legacy `system` *argument* is remapped, harmlessly, before construction ever happens:

```nix
# pkgs/top-level/impure.nix
localSystem ? { system = args.system or builtins.currentSystem; },
system ? localSystem.system,
...
import ./. (removeAttrs args [ "system" ] // { inherit config overlays localSystem; })
```

So neither `system = system;`, `localSystem = system;`, nor `localSystem.system = system;` differ in what gets constructed — `lib.systems.elaborate`'s own `systemToAttrs = systemOrArgs: if isAttrs systemOrArgs then systemOrArgs else { system = systemOrArgs; };` coerces a bare string the same way. **The one thing that actually emits the warning is reading `.system` off the resulting value anywhere downstream** — `pkgs.system`, `nixpkgs.legacyPackages.${system}.system`, a helper's `pkgsFor.${system}.system`. The audit's attribution to line 44-45 in isolation does not reproduce; the true trigger, for nix-installer, is very likely a `.system` read somewhere in its actual dependency closure (crane/rustPlatform/stdenv splicing) that gets forced by evaluating `packages.<system>` fully — not visible from `flake.nix` alone, and not re-traced further in this dive (see [Surprises](#contested--evolving)).

**Warning-free spelling, nixpkgs 26.11**: use `pkgs.stdenv.hostPlatform.system` (or the un-aliased `pkgs.stdenv.system`) everywhere a system string is needed downstream; the import-argument spelling is not the lever.

### 5. The x86_64-darwin drop and how a system list survives it

`NixOS/nixpkgs@9cab9ed8`'s `lib/trivial.nix:1003` (`throwIf` gated by `config.allowDeprecatedx86_64Darwin != "force"`) throws on any attribute access under `x86_64-darwin`:

```
error: Nixpkgs 26.11 has dropped support for x86_64-darwin.
The 26.05 stable branch still supports x86_64-darwin, and will
receive security fixes until the end of 2026. ...
```

Confirmed live against the pinned rev `8d5d2709` (26.11pre). Against `nixos-26.05` (rev `5e2305d5`), the same system builds — but now the branch itself has started warning forward:

```
trace: evaluation warning: Nixpkgs 26.05 will be the last release to support x86_64-darwin; see https://nixos.org/manual/nixpkgs/unstable/release-notes#x86_64-darwin-26.05
```

The release notes ([rl-2511.section.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2511.section.md)) gave a full release of advance notice: "We expect to drop support for `x86_64-darwin` by Nixpkgs 26.11, in light of Apple's announcement that macOS 26 will be the final version to support Intel Macs." The drop itself is [rl-2611.section.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2611.section.md), anchor `#x86_64-darwin-26.11`.

`aarch64-darwin` is unaffected on either branch — only the Intel double is dropped. 17/37 exemplars hardcode `x86_64-darwin` in a systems list ([shape](../nix-audit/exemplar-flake-shape.md) §3); every one of them needs either an `x86_64-darwin` removal or a pin to `nixos-26.05` before end-2026.

### 6. Lock growth: `follows` saves exactly one node, every time

For each of the four systems-strategies, I built a consumer flake taking the fixture as a `path:` input, once without `nixpkgs.follows` and once with it (plus the strategy's own extra input followed too, e.g. `flake-utils.follows`). Node counts include the consumer's own `root`:

| strategy | base flake's own nodes | consumer, no follows | consumer, with follows |
|---|--:|--:|--:|
| genAttrs (literal list) | 2 | 4 | 3 |
| nix-systems input | 3 | 5 | 4 |
| flake-utils `eachDefaultSystem` | 4 | 6 | 5 |
| flake-parts `perSystem` | 4 | 6 | 5 |

`follows` collapses exactly the duplicate `nixpkgs` node in every case (−1), never more — the *strategy's own* extra nodes (`flake-utils`, `flake-utils/systems`, `flake-parts`, `flake-parts/nixpkgs-lib`, `systems`) persist regardless of the nixpkgs-follows decision; only following those specific inputs too removes them (done in the "with follows" column above). genAttrs is the only strategy whose base flake adds zero extra nodes beyond `nixpkgs` itself.

The map's Q1 jq check was run against both twins of the genAttrs consumer:

```
jq -r '[.locks.nodes | to_entries[] | select((.value.locked.repo // "") == "nixpkgs" or (.value.original.id // "") == "nixpkgs") | .key] | length' flake.lock
```
→ **2** on the no-follows twin (violation), **1** on the follows twin (compliant) — watched red then green.

### 7. flake-parts has a real, measurable per-eval cost

`nix eval .#packages.x86_64-linux --apply builtins.attrNames` (post-fetch, so this is evaluation cost, not network cost):

| fixture | wall time |
|---|--:|
| `genattrs-legacy` | 0.224s |
| `per-output-import` | 0.166s |
| `nix-systems-input` | 0.283s |
| `pkgs-system-ref` | 0.467s |
| `flake-utils-eachdefault` | 1.029s |
| `flake-parts-persystem` | 2.165s |

flake-parts pays a real, repeatable module-system evaluation cost distinct from its fetches — on a toy one-package flake, roughly 10x a bare `genAttrs` skeleton. This is consistent with [devenv](../nix-audit/exemplar-tool-runs.md)'s much larger 95.6s cold eval also involving flake-parts-shaped module composition, though devenv's number is dominated by its patched-nixpkgs IFD build, not flake-parts alone.

## Normative guidance candidates

1. **A new flake iterates systems with `nixpkgs.lib.genAttrs` over a literal, explicit list — never `lib.systems.flakeExposed` and never a helper's hidden default.**
   Rationale: an explicit list is the only thing that survives an upstream platform drop (§2, §5) or excludes a system nixpkgs never fully bootstraps (`x86_64-freebsd`, per helix's own infinite recursion).
   Verify: `grep -rn -e 'flake-utils' -e 'eachDefaultSystem' -e 'flakeExposed' --include='*.nix' .` — empty output = pass (no hidden-list helper in use). RUN: yes, against `flake-utils-eachdefault/` (hits) and `genattrs-legacy/` (empty).

2. **flake-utils is never added to a new flake.**
   Rationale: least-used of four real strategies, stalled upstream (last commit 2024-11-13), open unresolved deprecation issue, and its own default system list still includes the poisoned `x86_64-darwin`.
   Verify: `grep -rln -e 'flake-utils' --include='*.nix' .` empty = pass. RUN: yes, red on `flake-utils-eachdefault/`, green on `genattrs-legacy/`.

3. **flake-parts is accepted only when the flake imports a flake-parts *module* (treefmt-nix, git-hooks.nix) or exports a `flakeModule` — never adopted merely to get systems iteration.**
   Rationale: a bare `genAttrs` skeleton evaluates ~10x faster than an equivalent flake-parts skeleton (§7); the framework's value is module composition, not the `systems` list, which is a plain option with no special behavior over `genAttrs`.
   Verify: reading heuristic — does the flake's `perSystem`/`flake` bodies reference an imported flake-parts module (`imports = [ ... ]` at the flake-parts top level)? RUN: no (reading heuristic only), but the eval-cost delta (§7) was run and measured.

4. **`nix-systems` inputs do not, by themselves, avoid the x86_64-darwin trap; the fix is the literal list content, not the helper.**
   Rationale: `nix-systems/default`'s own list still includes `x86_64-darwin` (measured 2026-09-27); a flake using it must still either override to `default-linux` or hand-pick systems.
   Verify: `nix flake check <ref> --no-build --all-systems` — exit 0 required. RUN: yes, red (exit 1, "Nixpkgs 26.11 has dropped support for x86_64-darwin") on `nix-systems-input/`, green on the hand-curated `genattrs-legacy/`/`flake-parts-persystem/` twins.

5. **A configured nixpkgs instance (unfree, an overlay the flake needs) is created at most once per system, in one named `pkgsFor` binding — never inside an output attribute body.**
   Rationale: repeated `import nixpkgs {}` calls inside output bodies is the literal shape of the "1000 instances" antipattern and is measurably costly when one of the instances triggers an IFD build (devenv, 95.6s).
   Verify: `grep -rn -e 'import nixpkgs' -e 'import inputs.nixpkgs' --include='*.nix' .` — every hit must be the same named `pkgsFor`/`pkgs` binding site; more than one distinct call site is a finding. RUN: reading heuristic on this exact grep shape; the cost side (95.6s) is [runs](../nix-audit/exemplar-tool-runs.md) Axis 6, not re-run here (documented as network/build-heavy, out of this dive's budget).

6. **Never read `pkgs.system`; always read `pkgs.stdenv.hostPlatform.system` (nixpkgs ≥25.11/26.11 era).**
   Rationale: `pkgs.system` is a `warnAlias` (`pkgs/top-level/aliases.nix:2498`) that fires on every evaluation that forces it — a warning an agent that "knows" the old attribute will reintroduce.
   Verify: `nix eval .#packages.x86_64-linux --apply builtins.attrNames 2>&1 | grep -c -e "has been renamed to/replaced by 'stdenv.hostPlatform.system'"` — 0 required. RUN: yes — red (count ≥1, one per forced system) on `pkgs-system-ref/`, green (count 0) on `per-output-import/` and `genattrs-legacy/`, even under a full `--all-systems` `nix flake check`.

7. **The `import nixpkgs { … }` argument spelling (`system`, `localSystem = system;`, `localSystem.system = system;`) is not itself a lint target — none of the three differ in what gets elaborated.**
   Rationale: `lib.systems.elaborate`'s `systemToAttrs` coerces a bare string identically to an attrset; `pkgs/top-level/impure.nix` remaps the legacy `system` argument into `localSystem` before construction regardless. Flagging the argument spelling as the "fix" for the rename warning is a category error — re-measured, contradicting the audit's own headline attribution (§4).
   Verify: none proposed (this is a "do not add a check here" finding — the check belongs on rule 6's `.system`-read grep, not on the import call). RUN: n/a by design.

8. **A system list that includes `x86_64-darwin` must be paired with either a pin to `nixos-26.05` or an explicit removal plan before end-2026; `aarch64-darwin` is unaffected.**
   Rationale: nixpkgs 26.11 throws unconditionally on the former; the latter still builds.
   Verify: `grep -rn -e 'x86_64-darwin' --include='*.nix' .` read together with the flake's own nixpkgs pin (`jq -r '.nodes.nixpkgs.original.ref // .nodes.nixpkgs.original.rev' flake.lock`) — a hit on both the system string and a 26.11+/unstable pin is the finding. RUN: yes — red (throw) on `darwin-unstable/`, green (builds, with its own forward-deprecation trace) on `darwin-2605/`.

9. **`follows` on a systems-strategy's own auxiliary input (`flake-utils`, `flake-parts`, `systems`) is worth doing whenever that input is adopted at all — it is a strict lock-size win with no downside, unlike `nixpkgs.follows` on a package-serving input (see `inputs/inputs-and-lock.md` for the general policy).**
   Rationale: measured −1 lock node in all four strategies tested, with no observed behavior change.
   Verify: `jq -r '[.nodes | to_entries[] | select((.value.locked.repo // "") == "nixpkgs" or (.value.original.id // "") == "nixpkgs") | .key] | length' flake.lock` — 1 required (not 0: the consumer's own root nixpkgs still counts). RUN: yes, red (2) / green (1), all four strategies exercised for genAttrs; the other three followed the identical +1/−1 pattern (§6 table) without a repeated per-strategy Q1 run (time-bounded; the mechanism is `follows`, not the strategy, so the table's node-count deltas are the load-bearing evidence).

10. **A relative `path:../sibling` input only resolves when both flakes are tracked inside the *same* git tree; a sibling repository needs an absolute `path:/…` input or a real remote ref.**
    Rationale: mechanical gotcha hit while building this dive's own fixtures — `path:../genattrs-legacy` from a sibling git repo fails with `error: relative path '...' points outside of its parent's store path`, because each git repo is copied to the store independently and a relative `path:` input is resolved against *that copy*, not the real filesystate. This is the general shape of M-A-16's sub-flake question, one level more specific.
    Verify: reading heuristic — a `path:../…` input whose target is not inside the same `.git` tree as the consumer is a finding. RUN: yes, incidentally — this is exactly what broke my first version of every consumer fixture in this dive; fixed by switching to an absolute `path:` input (see fixture history in [Verification runs](#verification-runs)).

## Verification runs

All commands run via a **private** `nix-portable` store (`unset NP_LOCATION`, defaulting to `~/.nix-portable/`), Nix 2.20.6 bundled with nix-portable, nixpkgs pinned at `github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439` (26.11pre) unless noted. **Environment note**: the wave-shared store at `~/.cache/research-lang/nix-tools/.nix-portable/` was under sustained multi-worker lock contention for the whole session (hundreds of queued `nix`/`bwrap` processes observed via `ps`, oldest queued nearly an hour); every `run.sh`-mediated call to it timed out (exit 124) even at 500s+. Switching to a private, unshared nix-portable location (no `NP_LOCATION`) resolved every subsequent run in under 3s. This is a program-wide environment finding, not specific to this fixture set — see [Contested / evolving](#contested--evolving).

Fixture root: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/systems-and-instantiation/` (each subdirectory is its own git repo, `git init -q && git add -A` before every eval).

```
$ nix flake check /…/genattrs-legacy --no-build --all-systems --no-write-lock-file
checking derivation packages.x86_64-linux.default... ok
checking derivation packages.aarch64-linux.default... ok
checking derivation packages.aarch64-darwin.default... ok
EXIT: 0
```

```
$ nix flake check /…/flake-utils-eachdefault --no-build --all-systems --no-write-lock-file
checking derivation packages.x86_64-darwin.default...
error: Nixpkgs 26.11 has dropped support for x86_64-darwin.
EXIT: 1
```
(twin of the above; only the systems-iteration strategy differs — red because flake-utils's hidden default list includes `x86_64-darwin`, genAttrs's explicit list does not)

```
$ nix flake check /…/nix-systems-input --no-build --all-systems --no-write-lock-file
checking derivation packages.x86_64-darwin.default...
error: Nixpkgs 26.11 has dropped support for x86_64-darwin.
EXIT: 1
```

```
$ nix flake check /…/flake-parts-persystem --no-build --all-systems --no-write-lock-file
checking derivation packages.x86_64-linux.default... ok
checking derivation packages.aarch64-linux.default... ok
checking derivation packages.aarch64-darwin.default... ok
EXIT: 0
```

```
$ nix flake check /…/per-output-import --no-build --all-systems --no-write-lock-file
# forces packages.{x86_64-linux,aarch64-linux,aarch64-darwin}.default
# forces devShells.{x86_64-linux,aarch64-linux,aarch64-darwin}.default
# zero 'system'-rename warnings anywhere in the output
EXIT: 0
```

```
$ nix eval /…/pkgs-system-ref#packages.x86_64-linux --apply builtins.attrNames --no-write-lock-file
trace: evaluation warning: 'system' has been renamed to/replaced by 'stdenv.hostPlatform.system'
[ "hello-on-x86_64-linux" ]
EXIT: 0   (warning fires; twin of per-output-import, which produced none)
```

```
$ nix flake check /…/darwin-unstable --no-build --all-systems --no-write-lock-file   # nixpkgs @ 8d5d2709 (26.11pre)
error: Nixpkgs 26.11 has dropped support for x86_64-darwin.
EXIT: 1
```

```
$ nix flake check /…/darwin-2605 --no-build --all-systems --no-write-lock-file        # nixpkgs @ 5e2305d5 (nixos-26.05)
trace: evaluation warning: Nixpkgs 26.05 will be the last release to support x86_64-darwin; ...
checking derivation packages.x86_64-darwin.default... ok
checking derivation packages.aarch64-darwin.default... ok
EXIT: 0   (twin of darwin-unstable; only the nixpkgs pin differs)
```

```
$ jq -r '[.locks.nodes | to_entries[] | select((.value.locked.repo // "") == "nixpkgs" or (.value.original.id // "") == "nixpkgs") | .key] | length' consumer-genattrs-legacy-nofollows/flake.lock
2   # violation: duplicate nixpkgs (own + upstream's)
$ jq -r '[same query]' consumer-genattrs-legacy-follows/flake.lock
1   # compliant: nixpkgs.follows collapses the duplicate
```
Empty output would mean the query matched nothing (e.g. a flake with no `nixpkgs`-named input at all); here both twins returned a single integer, so no ambiguity case applied.

Lock node counts (`jq -r '.locks.nodes | keys | length'` on `nix flake metadata --json` output), full table in [§6](#6-lock-growth-follows-saves-exactly-one-node-every-time).

**Not re-run this dive** (out of budget, flagged rather than silently skipped): devenv's 95.6s four-instance cold eval ([runs](../nix-audit/exemplar-tool-runs.md) Axis 6) — cited from the audit, not reproduced; a fresh repro would need devenv's full 418-file tree fetched and is a build-cost, not a systems-iteration, measurement.

## Exemplar evidence

- `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45` — `import nixpkgs { inherit system; }` per output; audited as the site of 56/56 rename warnings, **not reproduced in isolation** by this dive's minimal fixture (§4) — flagged as a surprise, not overturned outright (the flake's own dependency closure was not re-traced to find the real `.system` read).
- `helix-editor/helix@079a789e8cb0:flake.nix:19` — `eachSystem = lib.genAttrs lib.systems.flakeExposed;`, `pkgsFor = eachSystem (system: import nixpkgs { localSystem.system = system; ...})` — uses nixpkgs's *descriptive* 8-system list (including `x86_64-freebsd`) as if it were "systems to build," and hits genuine infinite recursion in its own `pkgsFor` helper on `packages.x86_64-freebsd.helix` under `--all-systems` ([runs](../nix-audit/exemplar-tool-runs.md) Axis 3). Confirms rule 1's rationale directly.
- `ipetkov/crane@73b980519cef:flake.nix` — zero declared `inputs`; its `eachSystem`/`eachDefaultSystem` are hand-rolled inside the flake itself (not a dependency); `mkLib pkgs` takes `pkgs` as an argument rather than importing nixpkgs internally — the shape rule 3/M-B-03 (library flakes take `pkgs`, no `nixpkgs` input) exists to generalize.
- `cachix/devenv@6d76db3889de` — four nixpkgs-shaped inputs materialize despite widespread internal `.follows`, because its own root `nixpkgs` is `cachix/devenv-nixpkgs` (a patched fork), not `NixOS/nixpkgs` — illustrating that `follows` collapses *duplicate pins of the same input*, not "all things that are nixpkgs-shaped" ([runs](../nix-audit/exemplar-tool-runs.md) Axis 6).
- `NixOS/nixpkgs@9cab9ed8:lib/trivial.nix:1003` — the `throwIf` gating the x86_64-darwin drop.
- `NixOS/nixpkgs@9cab9ed8:pkgs/top-level/aliases.nix:2498` — the `warnAlias` behind the `'system'` rename warning (this dive's own grep, not previously cited by the audits at this exact line).
- `NixOS/nixpkgs@9cab9ed8:pkgs/top-level/impure.nix:12-18,55-59` — the legacy `system`→`localSystem` remap that fires for every `import nixpkgs { … }` call, flake or not.
- `NixOS/nixpkgs@9cab9ed8:lib/systems/flake-systems.nix` — the 8-entry `flakeExposed` list (`x86_64-linux`, `aarch64-linux`, `armv6l-linux`, `armv7l-linux`, `i686-linux`, `aarch64-darwin`, `powerpc64le-linux`, `riscv64-linux`, `x86_64-freebsd`), explicitly marked `:::{.warning} experimental :::` in its own doc comment.
- `NixOS/nixpkgs@9cab9ed8:lib/systems/default.nix:74-84` — `systemToAttrs` and `elaborate`, the shared coercion behind rule 7.

## AI-agent angle

- **Reflexive `flake-utils.lib.eachDefaultSystem` boilerplate.** An agent trained on pre-2024 material reaches for flake-utils by habit. Smallest check: `grep -rln -e 'flake-utils' --include='*.nix' .` on a new flake — any hit is a finding.
- **`import nixpkgs { inherit system; }` once per output, believing this is "the flake pattern."** Evaluates fine (confirmed: no warning, no error) so nothing *fails* — it just silently repeats work and risks a devenv-style multi-instance cost the moment one instance needs an overlay or a patch. Smallest check: `grep -rn -e 'import nixpkgs' --include='*.nix' .` — more than one distinct call site (not counting a single named `pkgsFor` binding) is the finding.
- **Believing the rename warning is about the `import` argument spelling and "fixing" it by renaming `system` to `localSystem` in the call.** This is a no-op — re-measured, both spellings elaborate identically (§4, rule 7). The actual fix is finding and removing the `.system` *read*, which is a different grep entirely (`\.system\b` excluding `hostPlatform.system`/`buildPlatform.system`/`targetPlatform.system`).
- **Copying `lib.systems.flakeExposed` (or any "give me every system nixpkgs knows about" list) as if it were a safe default.** It is nixpkgs's descriptive, experimental list, not a tested one — `x86_64-freebsd` under it hits genuine infinite recursion in a common per-system-pkgs helper pattern (helix, reproduced by the audit). Smallest check: `grep -rn -e 'flakeExposed' --include='*.nix' .` — a hit paired with no corresponding CI job for the unusual systems it adds (`riscv64-linux`, `x86_64-freebsd`, `powerpc64le-linux`) is a finding.
- **Hardcoding `x86_64-darwin` in a systems list against an `unstable`/`26.11`-pinned nixpkgs, from training data that predates the drop.** Evaluates fine on 26.05, throws on 26.11+ the instant that system's attribute is touched — an agent that only ever tests `x86_64-linux` locally will not see this until CI (or a Darwin user) runs `--all-systems`. Smallest check: `grep -rn -e 'x86_64-darwin' --include='*.nix' .` read together with `jq -r '.nodes.nixpkgs.original.ref // .nodes.nixpkgs.original.rev' flake.lock`.
- **Constructing a relative `path:../sibling-repo` input across two separate git checkouts, assuming it behaves like a shell-relative path.** It resolves against the *store copy* of the consumer, not the real filesystem, and fails only at lock/eval time with a message that does not obviously point at the fix. Smallest check: reading heuristic — is the `path:../…` target inside the same `.git` tree as the flake declaring it?

## Contested / evolving

- **Whether `flake-utils` deprecation is ever formalized.** [Issue #86](https://github.com/numtide/flake-utils/issues/86) has sat open since January 2023 with no maintainer resolution recorded; the library keeps working (it is not broken, only unmaintained and stale-default), so "never add it to new code" is this dive's position, not an upstream declaration.
- **The nix-installer warning-site attribution is an open thread, not a closed one.** This dive's minimal reproduction contradicts the audit's headline framing (§4) but did not itself trace nix-installer's actual `.system` read to a line — a follow-up would need to build nix-installer's full dependency closure (crane, rustPlatform, a real Rust toolchain) rather than a `hello`-package fixture, which is out of this dive's fixture budget. Treat rule 6 (never read `pkgs.system`) as settled; treat "line 44-45 is the cause" as **not** settled.
- **Whether nix-systems/default's system list will drop `x86_64-darwin` before nixpkgs' own 26.05 EOL.** As of this measurement (resolving its `HEAD`, `da67096a3b9bf56a91d16901293e51ba5b49a27e`) it has not; a flake relying on it for "future-proof" systems handling should not assume this changes automatically.
- **Shared-store contention as a program-wide constraint, not a topic-specific one.** The wave's shared `nix-portable` store was unusable for the bulk of this session under concurrent multi-worker load (see [Verification runs](#verification-runs) environment note); any other wave-2 dive hitting the same store will see the same `exit 124`s regardless of what it is testing. Worth escalating once, not per-dive.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [ayats.org/blog/no-flake-utils](https://ayats.org/blog/no-flake-utils) | practitioner blog post | undated, read 2026-09-27 | names the two failure modes (no output-shape validation; consumer lock pollution) and the flake-parts-vs-hand-rolled-genAttrs split this dive adopts |
| [nixcademy.com/posts/1000-instances-of-flake-utils](https://nixcademy.com/posts/1000-instances-of-flake-utils/) | practitioner blog post, Nixcademy | undated, read 2026-09-27 | the Sourcegraph "4100 results" measurement behind the lock-duplication argument; gives the `genAttrs` replacement snippet verbatim |
| [zimbatm.com/notes/1000-instances-of-nixpkgs](https://zimbatm.com/notes/1000-instances-of-nixpkgs) | practitioner note | undated, read 2026-09-27 | the ~100MiB/~1s-per-instance cost claim behind H1/H2; names `legacyPackages.$system` plus `follows` as the fix |
| [nix-systems README](https://github.com/nix-systems/nix-systems) (raw, fetched via curl) | primary — the tool's own repository | current, read 2026-09-27 | the reserved-`systems`-input convention, the `default`/`default-linux`/`default-darwin` split, and the `--override-input` CLI story |
| [flake.parts/options/flake-parts](https://flake.parts/options/flake-parts) | primary — the tool's own docs | current, read 2026-09-27 | `perSystem`, `systems` (no default), `flake`, `withSystem` — confirms flake-parts never hides a system list |
| [numtide/flake-utils#86](https://github.com/numtide/flake-utils/issues/86) | primary — the tool's own issue tracker | opened 2023-01-02, still open, read 2026-09-27 | the deprecation debate and its unresolved status, cited directly in rule 2 |
| [jade.fyi/blog/flakes-arent-real](https://jade.fyi/blog/flakes-arent-real/) | practitioner blog post | undated, read 2026-09-27 | the "flake.nix as thin entry point" argument (M-A-17) and the `packages.${system}` cross-compilation limitation, relevant to why `pkgsFor` needs to stay a single binding |
| [nixpkgs rl-2511.section.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2511.section.md) (raw, fetched via curl) | primary — nixpkgs release notes | 25.11, read 2026-09-27 | the advance notice of the x86_64-darwin drop and the nixfmt-attribute rename, one release ahead of each taking effect |
| [nixpkgs rl-2611.section.md](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/release-notes/rl-2611.section.md) (raw, fetched via curl) | primary — nixpkgs release notes | 26.11, read 2026-09-27 | the actual x86_64-darwin drop text, quoted verbatim in §5 |
| `NixOS/nixpkgs@9cab9ed8:lib/systems/flake-systems.nix` | primary — nixpkgs source, exemplar corpus | rev `8d5d2709`/`9cab9ed8`, read 2026-09-27 | the literal 8-system `flakeExposed` list, marked experimental in its own comment |
| `NixOS/nixpkgs@9cab9ed8:pkgs/top-level/impure.nix` | primary — nixpkgs source, exemplar corpus | same rev | the legacy `system`→`localSystem` remap, read directly rather than assumed |
| `NixOS/nixpkgs@9cab9ed8:pkgs/top-level/aliases.nix:2498` | primary — nixpkgs source, exemplar corpus | same rev | the exact `warnAlias` call behind the rename warning, found by this dive's own grep, not previously cited at this line by the wave-1 audits |
| `NixOS/nixpkgs@9cab9ed8:lib/systems/default.nix` | primary — nixpkgs source, exemplar corpus | same rev | `systemToAttrs`/`elaborate`, behind rule 7's "the argument spelling doesn't matter" claim |
| [nix-audit/exemplar-flake-shape.md](../nix-audit/exemplar-flake-shape.md) | wave-1 audit (this program) | 2026-09-27 | the corpus-wide §3/§4 measurements this dive built on rather than re-ran at scale |
| [nix-audit/exemplar-tool-runs.md](../nix-audit/exemplar-tool-runs.md) | wave-1 audit (this program) | 2026-09-27 | Axis 3 (helix infinite recursion), Axis 6 (devenv four-instance cold eval), and the headline 56/56-warning claim this dive re-tested and partly contradicted |
| [nix-topic-map.md](../nix-topic-map.md) | wave-1 map (this program) | 2026-09-27 | conflicts 1-3, the row list (M-A-01..04, M-A-17, M-B-03, M-J-05), and the Q1-Q4/Q16-Q17 named checks this dive ran |
| [nix-frame.md](../nix-frame.md) | phase-0 frame (this program) | 2026-09-27 | H1/H2 hypotheses this dive's findings confirm, narrow, or (§4) contradict |
| `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix` (exemplar corpus, direct read) | third-party flake source | fetched 2026-09-17 | the disputed warning-site citation, read in full rather than trusted from the audit's excerpt |
| `ipetkov/crane@73b980519cef:flake.nix` (exemplar corpus, direct read) | third-party flake source | fetched 2026-09-18 | the zero-input, `pkgs`-as-argument library shape behind rule/M-B-03 |
| `helix-editor/helix@079a789e8cb0:flake.nix` (exemplar corpus, direct read) | third-party flake source | fetched 2026-07-23 | the `flakeExposed`+`pkgsFor` pattern, read in full to confirm the exact expressions, not just the audit's summary |
