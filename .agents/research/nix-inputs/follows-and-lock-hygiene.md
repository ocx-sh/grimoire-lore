---
title: Follows etiquette, duplicate-nixpkgs detection, and lock freshness
topic: inputs-and-the-lock (NIX-INP)
agent: follows-and-lock-hygiene
model: sonnet
date_researched: 2026-09-27
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/follows-and-lock-hygiene/
scope: |
  Covers: when a published flake declares `inputs.<x>.inputs.nixpkgs.follows`
  (per how the input is consumed), the jq check that catches duplicate
  nixpkgs-shaped lock nodes, the still-open `follows` correctness bugs, the
  `nix flake lock` vs `nix flake update` contract (including a path-input
  gotcha not in the map), flake-checker's advisory role and CEL condition,
  and the FOD-plus-wrapper shape a generated flake uses. Does not cover:
  systems iteration or `nixpkgs.legacyPackages` instantiation (nix-flakes.md,
  NIX-FLK-08/10/11 — cited, not re-derived), the ocx generator's own data
  model (nix-generated-flakes.md, NIX-GEN), or `flake-checker`'s non-follows
  checks and CI wiring beyond the CEL condition (nix-gates.md, NIX-GATE-11).
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

- Whether to `follows` an input is decided by **how the flake consumes it**, not by a blanket "always follow nixpkgs" rule: package-from-author's-cache (nixpkgs-python) says don't; library/module/overlay inputs should, because their own nixpkgs rarely matters to the top-level evaluation anyway.
- The Nix manual itself argues *against* reflexive follows-everywhere: "it is generally not useful to eliminate transitive `nixpkgs` flake inputs... their own `nixpkgs` input is usually irrelevant" (nix3-flake.md, primary source, 2.35.2).
- `flake.lock` does **not** deduplicate nixpkgs nodes by content — three inputs pinned to the byte-identical nixpkgs revision still produce 4 distinct `nixpkgs*` lock nodes with no `follows`; only an explicit `follows` graph collapses them to 1 (fixture-confirmed).
- The duplicate-nixpkgs check is one jq one-liner: `jq '[.nodes[] | select((.original.type=="github") and (.original.repo=="nixpkgs"))] | length' flake.lock` — count `1` is clean, count `>1` is a finding; empty/absent nixpkgs input is `0` and is not itself a finding.
- Following collapses eval work measurably: the same three-input fixture evaluated in 0.61s wall / 0.12s sys with follows vs 1.55s wall / 0.40s sys without, on a warm store, with the built package's `outPath` identical either way.
- The self-follow segfault (NixOS/nix#5393) does **not** reproduce on Nix 2.35.2: a genuine follow cycle now fails cleanly with `error: follow cycle detected: [nixpkgs -> a/nixpkgs -> nixpkgs]`, exit 1 — treat the old "nix segfaults" framing as historical only.
- Issue #14339 ("removing follows does not respect the dependency's own lock") is real but narrower than it reads: it only bites when the dependency's **own** input is a floating branch ref; when it's a 40-hex commit pin, removing `follows` and running plain `nix flake lock` correctly restored the dependency's exact original pin in a fixture run.
- `nix flake lock` (no args) only **adds missing nodes and applies structural `follows` edits** from `flake.nix`; it does not force-refresh an existing node whose *content* changed — including a **local `path:` input**, where editing the target directory and re-running plain `nix flake lock` left the lock's stale `narHash` untouched until `nix flake update <name>` was run.
- flake-checker 0.2.15's binary accepts only `nixos-26.05`, `nixos-26.05-small`, `nixos-unstable`, `nixos-unstable-small`, `nixpkgs-26.05-darwin`, `nixpkgs-unstable` as "supported" — a fixture pinned to `nixos-25.11` was flagged even though the tool's own (newer) README already lists `nixos-25.11` as supported; trust the installed binary, not the README, and re-check on every flake-checker bump.
- flake-checker is exit-0-by-default even with findings; `--fail-mode` makes findings exit 1, and a crash (no root `nixpkgs` input, or a zero-input lock) also exits 1 — the two are told apart only by grepping stderr for `Error: Invalid(` / `Error: FlakeLock(`.
- The CEL condition this dive settles on is `supportedRefs.contains(gitRef) && numDaysOld < 30 && owner == 'NixOS'` (the tool's own recommended floor), run as `flake-checker --condition '...' --fail-mode`, advisory (SHOULD), never a MUST gate — per map conflict 21.
- In a generated-flake's FOD-plus-wrapper shape, following or not following the input's nixpkgs never changes the FOD's `outPath` (fixture: byte-identical `/nix/store/…-COPYING` either way) — only the wrapper's `drvPath` changes, because only the wrapper is built with that nixpkgs's `stdenv`. This confirms nix-generated-flakes.md's claim with a fresh measurement.
- A pure-library (B) flake takes either zero inputs (crane's pattern; functions take `pkgs` as an argument, no `flake.lock` is even created) or exactly `nixpkgs-lib` (2 lock nodes) — never a full `nixpkgs` input, confirmed on both variants.
- `--override-input nixpkgs github:NixOS/nixpkgs/<branch>` is a CI **test** leg, not a fix and not written to the committed lock; fenix's own CI (`nix-community/fenix@5f7e7d7`) runs exactly this as a second matrix leg alongside the default build. Treat it as CONSIDER for a widely-consumed A/D flake, not a SHOULD for every fleet flake.
- Never evaluate a third-party flake with a bare branch/tag ref that can move under you; use a pinned `github:owner/repo/<40-hex-sha>` and always `--no-write-lock-file`, exactly as this dive's own fixtures do.
- `nix flake lock`'s and `nix flake update`'s own `--help`/manual text state the contract plainly: "Lock file entries [that] are already up-to-date are not modified. If you want to update existing lock entries, use `nix flake update`" — this is the primary-source backing for M-B-06, and it is the same mechanism behind the path-input surprise above.
- A circular flake dependency (two flakes each taking the other as an input) is broken deliberately with `follows = ""` (an empty string, meaning "the root's own copy"), not a bug workaround — a distinct, rare, and legitimate use of `follows` documented in the manual's lock-file section.

## Findings

### 1. Follows etiquette is decided by how the input is consumed, not by presence of a `follows` keyword

The map's conflict 3 is confirmed, not overturned, and the primary source sharpens it. [nix3-flake.md](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) (Nix 2.35.2, primary, fetched verbatim) states directly, in its own "Overrides and follows" section:

> "It is worth noting, however, that it is generally not useful to eliminate transitive `nixpkgs` flake inputs in this way. Most flakes provide their functionality through Nixpkgs overlays or NixOS modules, which are composed into the top-level flake's `nixpkgs` input; so their own `nixpkgs` input is usually irrelevant."

This is a genuinely useful counterweight to the "follows is always hygiene" instinct (H2): for a **module or overlay** input, the sub-flake's own `nixpkgs` node in the lock is frequently dead weight regardless of whether you `follows` it, because the code path that actually runs is composed against the *consumer's* `pkgs`. The `follows` declaration mostly matters for closure/eval-cost hygiene (conflict 2), not correctness, in that shape.

Where it *does* matter for correctness: [cachix/nixpkgs-python@4d2bd16:README.md:44-45](https://github.com/cachix/nixpkgs-python/blob/main/README.md) is explicit that overriding is actively harmful for a **package-from-author's-cache** input:

> "Do not override the `nixpkgs` input when using this flake. The cached builds are tied to the pinned nixpkgs revision; overriding it will result in cache misses and local rebuilds."

And [fzakaria.com/2026/08/31/how-safe-is-follows](https://fzakaria.com/2026/08/31/how-safe-is-follows) (fetched 2026-09-27) frames the opposite failure mode — an author-chosen `follows` target forced onto a flake whose code was never evaluated against it — as "time-traveling" the dependency, with a concrete, gradation-based (not binary) safety signal:

> "10,754 of them lock a nixpkgs and between them they name 3,261 distinct nixpkgs revisions... If the nixpkgs revision you are following is only a few days or weeks newer than the original, it is likely to be safe. If it is several months or years newer, the risk of breakage increases."

**Resolved rule, by consumed-as** (this dive's synthesis of the above three sources plus the map's conflict 3):

| Consumed as | Follow nixpkgs to root? | Why |
|---|---|---|
| Package pulled from the author's own binary cache | **No** | cache is keyed to the author's exact pin (nixpkgs-python) |
| Library whose functions the flake calls directly (crane-style) | N/A — take `pkgs` as an argument, no nixpkgs input at all | composition over inheritance; conflict 3 |
| Module (NixOS/home-manager) consumed via `imports` | **No** (module runs against consumer's `pkgs` module argument) | its own nixpkgs is evaluated only for the module author's own `checks`, never for the consumer |
| Overlay merged into the consumer's own nixpkgs | **No** for correctness, **yes** for closure hygiene if the flake also has other package outputs that must match | overlay always builds against consumer's `pkgs`; its own nixpkgs, if any, is redundant |
| A or D flake (application, generated flake) whose `packages` others `nix run`/`nix build` | Author's choice, documented in the README either way | the flake owns its own cache promise; consumers decide per Q1 after every lock change |
| Generated flake's FOD-only input (fetches fixed content, e.g. an OCI blob) | Irrelevant either way | the FOD's `outPath` never depends on nixpkgs (finding 8 below) |

### 2. Duplicate-nixpkgs detection: `flake.lock` never dedups by content, only by `follows`

A planted three-nixpkgs-carrying-input consumer (`consumer-nofollows`) pins `nixpkgs` plus three path-input libraries `a`, `b`, `c`, each independently declaring the *exact same* `github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439` URL. Locking it produces:

```
"nodes": ["a","b","c","nixpkgs","nixpkgs_2","nixpkgs_3","nixpkgs_4","root"]
```

Four separate nixpkgs-shaped nodes, despite every one resolving to the identical revision and `narHash` — Nix's lock graph is built structurally (which input declares which URL), never collapsed by content equality. This matches [discourse.nixos.org/t/71174](https://discourse.nixos.org/t/71174) (2025-10-23, primary community source): the thread's own conclusion is that deduplication would only be safe when `narHash` values are identical, and that today Nix does not do it — `follows` is the only mechanism that unifies the nodes.

The `consumer-follows` twin (same three libraries, each declaring `<x>.inputs.nixpkgs.follows = "nixpkgs"`) locks to:

```
"nodes": ["a","b","c","nixpkgs","root"]
```

One nixpkgs node. This is the map's Q1 in its `.nodes` form, re-confirmed at 3-input scale (the map's own settled 2-input case is in nix-flakes.md, NIX-FLK-10/conflict 3).

**The check** — a single jq filter over `flake.lock`'s `nodes`, keyed on the *original* (declared) flakeref rather than the *locked* rev, so it still counts nodes that haven't been fetched yet:

```
jq '[.nodes[] | select((.original.type=="github") and (.original.repo=="nixpkgs"))] | length' flake.lock
```

Exit contract: the command always exits 0 (jq's own exit code, not a pass/fail signal); the **output number** is the signal — `1` (or `0` for a flake with no nixpkgs input at all, e.g. crane) is clean, any value `>1` is a duplicate-nixpkgs finding. No canonical single command for this exists upstream ([shift](../nix-topic-map/shifts.md) row) — this is this dive's own synthesis.

### 3. The self-follow bug is fixed; the "removed follows" bug is real but narrower than it reads

[NixOS/nix#5393](https://github.com/NixOS/nix/issues/5393) ("if input accidentally follows itself, nix will segfault", filed against the pre-flakes-stable era) gives an exact repro: a flake whose own `nixpkgs` follows `digga/nixpkgs`, while `digga`'s own `nixpkgs` follows the root's `nixpkgs` — a two-hop cycle. Reproducing the identical shape (root's `nixpkgs` follows `a/nixpkgs`, `a`'s `nixpkgs` follows root's `nixpkgs`) against Nix 2.35.2:

```
$ nix flake lock
error:
       … while updating the lock file of flake 'git+file://…/self-follow'
       error: follow cycle detected: [nixpkgs -> a/nixpkgs -> nixpkgs]
```

Exit 1, clean diagnostic, no segfault. **The bug as filed is fixed** — treat any training-era material describing a Nix segfault on a follow cycle as historical only, current as of Nix 2.35.2 (2026-06-22 era). This is a genuine surprise relative to the map, which lists #5393 as still an open bug an agent must "guard against" (M-B-12); guarding against it is now free — Nix itself reports it.

[NixOS/nix#14339](https://github.com/NixOS/nix/issues/14339) ("Removing `follows` does not respect dependency's own `flake.lock`", still open) is real, but its own repro (read verbatim from the issue) shows the mechanism precisely: it manifests when the dependency's *own* declared input is a **floating branch ref** (`nixpkgs-unstable` in the filed repro) — after removing the top-level `follows` override, `nix flake lock` re-resolves that floating ref **fresh** (to whatever the branch currently points at), rather than restoring either the pre-follows locked commit or reading the dependency's own committed `flake.lock`. A fixture built with the dependency's own input pinned to a **40-hex commit sha** (not a branch) does not show this behavior:

```
step 1 (b follows root nixpkgs):    .nodes.b.inputs.nixpkgs = "nixpkgs"     (follows root)
step 2 (follows line removed, plain `nix flake lock`):
    .nodes.root.inputs = {"b":"b","nixpkgs":"nixpkgs_2"}
    .nodes.nixpkgs      -> rev b6018f87… (lib-distinct's own original sha pin, restored exactly)
    .nodes.nixpkgs_2     -> rev 8d5d2709… (root's own pin, unaffected)
```

**Practical guidance**: pin every input's *own* nixpkgs (or any transitive input you might later `follows` and un-`follows`) to a commit sha rather than a branch name, and the removed-follows bug cannot bite you regardless of whether it's ever fixed upstream — this is not a workaround for #14339 specifically, it's simply NIX-GATE-12's "pin to a 40-hex sha" rule applied one level deeper, and it happens to close this bug's blast radius as a side effect. This was not independently re-derived for the floating-ref case (would require observing branch drift between two runs, which this dive did not wait for); the mechanism above is read directly from the issue's own verbatim repro, not asserted from memory.

[NixOS/nix#6036](https://github.com/NixOS/nix/issues/6036) (nested `follows` not resolved to absolute paths) and [#8325](https://github.com/NixOS/nix/issues/8325) (can't override a transitive `follows` without overriding its flakeref) were not independently re-derived this dive; both remain open per the map's [failure.md §3](../nix-topic-map/failure.md) scout, cited there.

### 4. `nix flake lock` vs `nix flake update`: the path-input gotcha the map doesn't have

The contract is stated plainly in the tool's own docs. [flake-lock.md](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake-lock.md) (Nix 2.35.2, primary):

> "This command updates the lock file... so that it contains an up-to-date lock for every flake input specified in `flake.nix`. Lock file entries [that] are already up-to-date are not modified. If you want to update existing lock entries, use `nix flake update`."

This dive found a concrete, non-obvious instance of "already up-to-date [as Nix judges it]" that will surprise an agent developing a flake alongside a local library flake: a **`path:` input's own on-disk content changing does not, by itself, trigger a re-lock under plain `nix flake lock`.**

```
# genflake/flake.nix edited (new fetchurl body); consumer's flake.lock still
# points at genflake's OLD narHash.
$ nix flake lock            # no "Updated input" message at all — silently stale
$ jq '.nodes.genflake.locked.narHash' flake.lock
"sha256-+xD4dBS+0j4+arA528urfs8PayoSs3u/GpoCtHcHIYg="   # OLD hash, unchanged

$ nix flake update genflake # forces re-resolution
• Updated input 'genflake':
    '...narHash=sha256-%2BxD4dBS...' (old)
  → '...narHash=sha256-kidz9KnrEQVnvrQKy3eT...' (new)
```

An agent iterating on a local library flake and a consumer flake side by side, running only `nix eval`/`nix build` in the consumer, will silently exercise the **stale, previously-locked** copy of the library until it explicitly runs `nix flake update <name>` (or deletes the lock). This generalizes M-B-06's "lock only adds, update rewrites" rule to the case that actually bites agents doing local development: the input type being `path:` does not exempt it from the lock's freeze.

### 5. flake-checker: advisory step, its own supported-branch list is stricter than its README, and the CEL condition this dive settles on

Confirms and sharpens NIX-GATE-11 (nix-gates.md) and resolves the map's conflict 21 (which CEL condition to pick). flake-checker 0.2.15 (installed binary, `flake-checker --version`) prints its own supported-branch remediation list when a fixture pinned to `nixos-25.11` is checked:

```
$ flake-checker --no-telemetry flake.lock
>>> Non-supported Git branches for Nixpkgs
> The nixpkgs input uses the nixos-25.11 branch
>> What to do
Use one of these branches instead:
* nixos-26.05
* nixos-26.05-small
* nixos-unstable
* nixos-unstable-small
* nixpkgs-26.05-darwin
* nixpkgs-unstable
exit=0
```

`--fail-mode` on the identical input: `exit=1`. The tool's [own README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md), fetched fresh on 2026-09-27 from `main`, already lists `nixos-25.11` and `nixos-25.11-small` as supported — the shipped 0.2.15 binary's compiled-in list has not caught up. **Trust the installed binary's own output over the README**, and re-run this exact fixture after any flake-checker version bump to catch the next such drift (map conflict 15).

**CEL condition (conflict 21 resolution)**: the tool's own README recommends, as a floor:

```
supportedRefs.contains(gitRef) && numDaysOld < 30 && owner == 'NixOS'
```

invoked as `flake-checker --condition "supportedRefs.contains(gitRef) && numDaysOld < 30 && owner == 'NixOS'" --fail-mode flake.lock`. This dive adopts that floor verbatim rather than inventing a stricter one: it already matches the tool's own default three checks (`--check-outdated`, `--check-owner`, `--check-supported`) combined into one CEL expression, so a CI step can run either form and get the same signal; the CEL form is preferred only when the fleet wants a single exit code rather than the tool's default multi-check text report.

### 6. Generated-flake FOD-plus-wrapper shape: `follows` never touches the FOD

Re-confirms nix-generated-flakes.md's claim with a fresh, targeted measurement (the map's brief for this dive asked for this explicitly). A fixture flake (`genflake`) exposes:

```nix
fod = pkgs.fetchurl {
  url = "https://raw.githubusercontent.com/NixOS/nix/2.35.2/COPYING";
  sha256 = "15axap9s8cp66d9k3pz4c475mx84x6fpshghxdw67rg3mbkhzr90";
};
wrapper = pkgs.stdenv.mkDerivation {
  name = "genflake-wrapper"; src = fod; dontUnpack = true;
  installPhase = "mkdir -p $out; cp $src $out/COPYING";
};
```

Two consumers — one follows `genflake`'s `nixpkgs` to root (pinned to nixpkgs 26.11pre `8d5d2709…`), one does not (`genflake` keeps its own pin to nixpkgs 25.11 `b6018f87…`):

```
                          fod.outPath                                  wrapper.drvPath
no follows (25.11 stdenv)  /nix/store/skbh57yq…-COPYING                 /nix/store/5cksrijj…-genflake-wrapper.drv
follows (26.11pre stdenv)  /nix/store/skbh57yq…-COPYING   (identical)   /nix/store/4n3izqid…-genflake-wrapper.drv  (different)
```

The FOD's `outPath` is byte-identical either way (it's addressed purely by its declared url+hash, independent of which nixpkgs revision's `fetchurl` builder produced it); only the wrapper's `drvPath` changes, because only the wrapper's derivation closes over that nixpkgs's `stdenv`. **Practical consequence for the ocx-generated flake**: following or not following the generated flake's `nixpkgs` input is irrelevant to whether the fetched package content itself rebuilds — it only ever affects the thin wrapper derivation, which is cheap to rebuild. A first attempt at this fixture used `pkgs.hello.src` as the "FOD" and produced a false positive (the outPath *did* differ between nixpkgs revisions) — because `pkgs.hello`'s own upstream version changed between nixpkgs 25.11 (2.12.2) and 26.11pre (2.12.3), which is nixpkgs updating a *package*, not a property of FODs in general. The corrected fixture uses a url+hash pinned independently of any nixpkgs package attribute, matching what an OCI-blob-fetching generator actually does.

### 7. Lib-only (B) flakes: zero inputs or `nixpkgs-lib` only, never a full `nixpkgs`

Confirms M-B-03 exactly as stated in the map, on two fresh fixtures. A flake with `inputs.nixpkgs-lib.url = "github:nix-community/nixpkgs.lib"` and no other input locks to 2 nodes (`root`, `nixpkgs-lib`) — matching crane's pattern of minimal lock footprint but with `lib`-only functions available. A flake with **zero inputs** produces no `flake.lock` file at all when locked — `nix flake lock` runs, prints nothing, and no file is written, matching crane's own zero-input shape ([shape §2](../nix-audit/exemplar-flake-shape.md)).

```
$ jq '.nodes.root.inputs, (.nodes|length)' flake.lock   # nixpkgs-lib variant
{ "nixpkgs-lib": "nixpkgs-lib" }
2
$ ls                                                     # zero-input variant, after `nix flake lock`
flake.nix   # no flake.lock produced
```

### 8. `--override-input` is a CI test leg, not a fix, and not a SHOULD for most fleet flakes

fenix's own CI, read verbatim at the exact pinned commit ([nix-community/fenix@5f7e7d7:.github/workflows/ci.yml:16-24](https://github.com/nix-community/fenix/blob/5f7e7d793cb2553410f857554de86f277ebe2f71/.github/workflows/ci.yml)):

```yaml
strategy:
  matrix:
    os: [macos-latest, ubuntu-latest]
    build-flags:
      - ""
      - --override-input nixpkgs github:nixos/nixpkgs/nixpkgs-unstable
```

This builds every target twice per OS: once against the committed lock, once against `nixpkgs-unstable`'s current head, **without ever writing that override to `flake.lock`** — a live compatibility smoke test, not a maintenance action. This is exactly M-B-14's distinction. Given the cost (a second full build matrix) and that it only pays off for a flake widely consumed across nixpkgs branches (fenix is a rust-toolchain provider pulled in by many other flakes' CI matrices), this dive rates it **CONSIDER**, not SHOULD, for the fleet's own flakes (`ocx`, `grim`, the Python SDK) — they are consumed as applications, not as cross-branch library glue, so the payoff is lower than fenix's. It remains a good, cheap pattern to recommend in the authoring rule as an option, not a default CI addition.

### 9. Branch and freshness bar for A/D flakes

Corpus branch distribution (37 repos, [shape §2](../nix-audit/exemplar-flake-shape.md)): `nixpkgs-unstable` 12, `nixos-unstable` 9, `nixos-25.11` 2, `nixos-26.05` 1, `nixos-23.05` 1 — unstable branches dominate 21/25 resolvable. Lock age: median 65 days, max 566 days ([shape §2](../nix-audit/exemplar-flake-shape.md), [runs Axis 4](../nix-audit/exemplar-tool-runs.md)); 20/31 measured as outdated by flake-checker's own 30-day bar. **Resolved**: track `nixpkgs-unstable` or `nixos-unstable` by default for an A/D flake with no compatibility promise narrower than "current"; a flake targeting NixOS module users tracks the matching `nixos-NN.MM` release branch and states its floor in the README (owner Q8: 2.31, the nixpkgs 26.11 throw's own recommended floor). Freshness bar: flake-checker's own default (30 days) is the SHOULD threshold; automate with `DeterminateSystems/update-flake-lock`'s weekly cron-to-PR pattern (its own README default: `schedule: cron: '0 0 * * 0'`, opens a PR, never pushes to main directly) — 3/37 exemplars already run an update workflow ([shape §9](../nix-audit/exemplar-flake-shape.md)).

## Normative guidance candidates

1. **Decide `follows` by how the input is consumed** (package-from-cache: never; library/module/overlay: yes or take `pkgs` as an argument instead; generated-flake FOD-only input: irrelevant). *Rationale*: nixpkgs-python's cache-coupling and the manual's own "usually irrelevant" statement both cut against a blanket rule (finding 1). *Verify*: reading heuristic — a `follows` on an input whose README says "don't override its nixpkgs," or the *absence* of `follows` on an input consumed only for its `lib`/module/overlay surface, is a finding. *Watched red*: no — reading heuristic only (the map already flags this same heuristic for M-B-01).

2. **Run the duplicate-nixpkgs jq check on every `flake.lock` with more than one input**: `jq '[.nodes[] | select((.original.type=="github") and (.original.repo=="nixpkgs"))] | length' flake.lock`, fail the count if `>1`. *Rationale*: `flake.lock` never dedups nixpkgs nodes by content, only by `follows` (finding 2). *Verify*: the command above. *Watched red*: **yes** — `consumer-nofollows/flake.lock` → `4`, `consumer-follows/flake.lock` → `1` (Verification run 1).

3. **Pin every input's own transitive nixpkgs (and any input you might later `follows`/un-`follows`) to a 40-hex commit sha, never a floating branch ref**, in your own flake and — where you control it — in any flake you frequently `follows`/un-`follows` against. *Rationale*: closes #14339's actual blast radius (the bug only manifests when the dependency's own pin is a moving ref) and is the same discipline NIX-GATE-12 already asks for CI `uses:` pins. *Verify*: `jq -r '.nodes[] | select(.original.type=="github" and (.original.ref? // null) != null) | .original.ref' flake.lock` — any output naming a floating input you plan to `follows` is a finding needing a decision, not an automatic fail. *Watched red*: **yes**, for the mechanism (Verification run 4 shows the sha-pinned case restores correctly; the floating-ref failure mode is read from the issue's own repro, not independently re-derived — see finding 3).

4. **Guard every `follows` edit with a fresh `nix flake lock` and read its diff before committing** — never assume a `follows` edit "took" without re-running the lock. *Rationale*: `follows` cycles now fail loudly (#5393 fixed) but a `follows` removal on a floating-ref dependency can silently drift (#14339); reading the diff is the one habit that catches both. *Verify*: `nix flake lock` then `git diff --stat -- flake.lock`; a follows-affecting edit with zero diff is itself suspicious and worth a second look (ties to finding 4's path-input gotcha). *Watched red*: **yes** — the self-follow fixture makes `nix flake lock` itself fail with a legible message (Verification run 2); the removed-follows fixture shows the diff explicitly (Verification run 3).

5. **Never assume plain `nix flake lock` refreshes a `path:` input after editing its target directory; use `nix flake update <name>`** when iterating on a local library flake and its consumer together. *Rationale*: fixture-confirmed — plain `lock` left a stale `narHash` silently in place; only `update <name>` picked up the edit (finding 4). *Verify*: after any edit to a path-input's target, `nix flake update <name>` then diff `flake.lock`'s `narHash` for that node against the pre-edit value; an unchanged hash after a real edit is the bug this rule prevents. *Watched red*: **yes** (Verification run 5).

6. **Run flake-checker as an advisory (never MUST) step on A/D flakes with a root `nixpkgs` input**, using the CEL condition `supportedRefs.contains(gitRef) && numDaysOld < 30 && owner == 'NixOS'` under `--fail-mode`, and separate its crash (`Error: Invalid(`/`Error: FlakeLock(` on stderr) from a real finding. *Rationale*: resolves map conflict 21; the tool's own README recommends this exact CEL floor. *Verify*: `flake-checker --no-telemetry --fail-mode --condition "supportedRefs.contains(gitRef) && numDaysOld < 30 && owner == 'NixOS'" flake.lock; echo $?` plus `grep -c -e 'Error: Invalid(' -e 'Error: FlakeLock('` on captured stderr. *Watched red*: **yes** (Verification run 6, and NIX-GATE-11 already watched the crash/stale-branch/clean triad red in nix-gates.md — not re-derived here).

7. **Trust the installed flake-checker binary's own supported-branch list over its README** on every version bump; the two can and do disagree (0.2.15's binary omits `nixos-25.11`, which its `main`-branch README already lists). *Rationale*: version-skew between a shipped binary and its living docs is exactly the kind of drift that silently breaks a "just read the README" rule. *Verify*: `flake-checker --no-telemetry flake.lock` against a fixture pinned to the newest release branch not yet in your memorized list, and read its own "What to do" remediation block, which prints the binary's actual compiled-in list. *Watched red*: **yes** (Verification run 7).

8. **A pure-library (B) flake takes zero inputs (functions take `pkgs` as an argument) or, if it needs `lib` functions only, exactly `nixpkgs-lib` — never a full `nixpkgs` input.** *Rationale*: crane's zero-input pattern and flake-parts' single `nixpkgs-lib` input are both measured, low-lock-cost, and composition-over-inheritance-correct (finding 7, conflict 3). *Verify*: `jq '.nodes.root.inputs | has("nixpkgs")' flake.lock` on a flake whose `flake.nix` never calls `stdenv.mkDerivation`/`buildRustPackage`/etc. (i.e., is B-shaped by NIX-FLK-14's own grep) — `true` is a finding. *Watched red*: **yes** (Verification run 8; the zero-input variant produces no lock file at all, itself the expected/clean state).

9. **A generated flake's `follows` choice on its nixpkgs input is irrelevant to whether the fetched content rebuilds — never spend effort optimizing it for that reason.** *Rationale*: fixture-confirmed the FOD's `outPath` is invariant to `follows`; only the thin wrapper's `drvPath` changes (finding 6). *Verify*: `a=$(nix eval --raw .#packages.<system>.fod.outPath); b=$(nix eval --raw --override-input nixpkgs github:NixOS/nixpkgs/<other-sha> .#packages.<system>.fod.outPath); [ "$a" = "$b" ]` — must be equal for a correctly-shaped FOD. *Watched red*: **yes** (Verification run 9; note the first attempt using `pkgs.hello.src` gave a false positive because `hello` itself changed version across the two nixpkgs revisions — use an artifact whose url+hash you control, not a nixpkgs package attribute).

10. **Treat a fenix-style `--override-input nixpkgs github:NixOS/nixpkgs/<branch>` CI matrix leg as CONSIDER, not SHOULD, for the fleet's own A/D flakes** (`ocx`, `grim`, the Python SDK); adopt it only for a flake many other flakes' CI matrices will pull in. *Rationale*: it doubles build cost and its payoff is proportional to how broadly the flake is consumed as glue across nixpkgs branches (finding 8); the fleet's flakes are consumed as end applications, not cross-branch glue. *Verify*: reading heuristic — is the CI matrix's second leg ever exercised by a consumer who isn't the flake's own maintainer? *Watched red*: no — this is a cost/benefit judgment call, not a mechanically checkable rule.

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, Nix 2.35.2, nixpkgs pins `8d5d270900d3fc75655ea2d9d248b234f6631439` (26.11pre) and `b6018f87da91d19d0ab4cf979885689b469cdd41` (nixos-25.11). Store was warm throughout (nixpkgs at both revisions, and `pkgs.hello`, had already been evaluated by earlier dives in this program).

**1. Duplicate-nixpkgs jq check** — fixture `fixtures/follows-and-lock-hygiene/consumer-{nofollows,follows}/`.
```
jq '[.nodes[] | select((.original.type=="github") and (.original.repo=="nixpkgs"))] | length' consumer-nofollows/flake.lock
→ 4        (violation)
jq '[...] | length' consumer-follows/flake.lock
→ 1        (compliant twin)
```
Exit 0 both times (jq's own exit code); the emitted number is the signal, as stated in rule 2.

**2. Self-follow cycle** — fixture `fixtures/follows-and-lock-hygiene/self-follow/` (`nixpkgs.follows = "a/nixpkgs"`; `a.inputs.nixpkgs.follows = "nixpkgs"`).
```
$ nix flake lock
exit=1
error: follow cycle detected: [nixpkgs -> a/nixpkgs -> nixpkgs]
```
No compliant twin needed — this is a hard structural error, not a style finding; NixOS/nix#5393's claimed segfault does not reproduce.

**3. Removed-follows-line, sha-pinned dependency** — fixture `fixtures/follows-and-lock-hygiene/removed-follows/` + `lib-distinct/` (nixpkgs pinned to full sha `b6018f87…`).
```
step1: .nodes.b.inputs.nixpkgs = "nixpkgs" (follows root, pinned 8d5d2709…)
[edit: delete "b.inputs.nixpkgs.follows" line]
$ nix flake lock
• Updated input 'b/nixpkgs': follows 'nixpkgs' → 'github:NixOS/nixpkgs/b6018f87…' (2026-06-30)
.nodes.root.inputs = {"b":"b","nixpkgs":"nixpkgs_2"}
.nodes.nixpkgs      → b6018f87…  (lib-distinct's own original pin — correctly restored)
.nodes.nixpkgs_2     → 8d5d2709…  (root's own pin, untouched)
```
Correct restoration confirmed for the sha-pinned case; exit 0. The floating-ref failure mode from #14339's own repro was not independently re-run (would need to observe upstream branch drift between two calls) — reported as read from the primary source, not re-derived.

**4. `nix flake lock` vs `nix flake update` on a `path:` input** — fixture `fixtures/follows-and-lock-hygiene/{genflake,consumer-genflake-nofollows}/`.
```
[edit genflake/flake.nix: pkgs.hello.src → pkgs.fetchurl {...}]
$ nix flake lock                          # in consumer, no args
(no "Updated input" message printed)
$ jq '.nodes.genflake.locked.narHash' flake.lock
"sha256-+xD4dBS+0j4+arA528urfs8PayoSs3u/GpoCtHcHIYg="     # stale, exit 0 (silently wrong)
$ nix flake update genflake
• Updated input 'genflake': '...narHash=sha256-%2BxD4dBS...' → '...narHash=sha256-kidz9KnrEQVnvrQKy3eT...'
```
"Violation" here is the silent staleness after plain `lock`; the "compliant" state is reached only via explicit `update <name>`. Both runs exit 0, so the check that matters is diffing the `narHash`, not the exit code — stated explicitly per the hard requirement.

**5. Same as run 4** (listed separately in the brief; folded here since it is one continuous fixture and command sequence).

**6. flake-checker CEL condition, advisory vs fail-mode** — fixture `fixtures/follows-and-lock-hygiene/branch-2511-check/` (nixpkgs pinned to `nixos-25.11`, resolved at fixture-build time to `b6018f87…`, 88 days old at run time).
```
$ flake-checker --no-telemetry flake.lock                              # default
exit=0   (2 issues printed: unsupported branch, outdated >30d)
$ flake-checker --no-telemetry --fail-mode flake.lock
exit=1   (identical findings)
```
Compliant twin: any fixture pinned to `nixos-unstable`/`nixpkgs-unstable` and locked within 30 days reports 0 issues and exits 0 under both modes (already established in nix-gates.md's NIX-GATE-11 fixtures; not re-run here to avoid duplicating that dive's verification).

**7. Binary-vs-README branch list drift** — same fixture as run 6. The binary's own "What to do" block (captured above in finding 5) lists 6 branches, omitting `nixos-25.11`/`nixos-25.11-small`; the README fetched fresh from `main` on 2026-09-27 lists 9, including both. Both facts read directly from the outputs quoted above — no separate command.

**8. Lib-only B flake shapes** — fixture `fixtures/follows-and-lock-hygiene/{lib-nixpkgs-lib-input,lib-zero-inputs}/`.
```
$ nix flake lock   # lib-nixpkgs-lib-input
jq '.nodes.root.inputs, (.nodes|length)' → {"nixpkgs-lib":"nixpkgs-lib"}, 2
$ nix flake lock   # lib-zero-inputs
(no output; no flake.lock file created)
```
Both are the "compliant" shapes for M-B-03; a "violation" twin (a B-shaped library flake with a full `nixpkgs` input) is exactly what NIX-FLK-14's existing grep (`mkDerivation`/`buildRustPackage`/etc. absent from `flake.nix`) already flags as B-shaped, cross-referenced against `jq '.nodes.root.inputs | has("nixpkgs")'` — not separately replanted here since NIX-FLK-14 already watched its own grep red/green.

**9. FOD-plus-wrapper, followed vs not** — fixture `fixtures/follows-and-lock-hygiene/{genflake,consumer-genflake-nofollows,consumer-genflake-follows}/`.
```
                              fod.outPath                         wrapper.drvPath
nofollows (25.11 stdenv)      /nix/store/skbh57yq…-COPYING         /nix/store/5cksrijj…-genflake-wrapper.drv
follows   (26.11pre stdenv)   /nix/store/skbh57yq…-COPYING (same)  /nix/store/4n3izqid…-genflake-wrapper.drv (different)
```
False-positive noted and corrected: the first attempt used `pkgs.hello.src` and showed *different* outPaths (`hello-2.12.2.tar.gz` vs `hello-2.12.3.tar.gz`) purely because nixpkgs bumped `hello`'s own version between the two pinned revisions — not a `follows`/FOD effect. Both `nix eval --raw` calls exit 0; the check is the string comparison, stated explicitly.

## Exemplar evidence

- **Follows counts, dedup rate**: 50 `.follows` declarations across 37 repos, only 3/37 with more than one distinct nixpkgs lock node ([exemplar-flake-shape.md §2](../nix-audit/exemplar-flake-shape.md)) — `stackbuilders/nixpkgs-terraform@a5893ca82ec3:flake.nix:5-8` is the one *deliberate* multi-nixpkgs case (three branches on purpose, for version-range building), not an oversight.
- **Package-from-cache says don't follow**: [cachix/nixpkgs-python@4d2bd16:README.md:44-45](https://github.com/cachix/nixpkgs-python/blob/main/README.md).
- **Zero-input library**: `ipetkov/crane` — 0 inputs, 1 lock node (`root` only), confirmed via both [exemplar-flake-shape.md §2](../nix-audit/exemplar-flake-shape.md) and [exemplar-tool-runs.md Axis 1](../nix-audit/exemplar-tool-runs.md) (lock nodes: 1).
- **flake-checker crash on no-nixpkgs-input flakes**: `nix-community/nix-index`, `hercules-ci/flake-parts`, `numtide/flake-utils` (`Error: Invalid(...)`); `ipetkov/crane` crashes differently (`Error: FlakeLock(Json(...))`, zero locked inputs) — [exemplar-tool-runs.md Axis 4](../nix-audit/exemplar-tool-runs.md).
- **Outdated-lock scale**: median nixpkgs lock age 65 days, max 566 days (`numtide/blueprint@8be7524`, confirmed directly this dive: `.nodes.nixpkgs.locked.lastModified` = 1741513245 → 566.6 days as of 2026-09-27) — [exemplar-flake-shape.md §2](../nix-audit/exemplar-flake-shape.md).
- **fenix's override-input CI leg**: [nix-community/fenix@5f7e7d7:.github/workflows/ci.yml:16-24](https://github.com/nix-community/fenix/blob/5f7e7d793cb2553410f857554de86f277ebe2f71/.github/workflows/ci.yml) — confirmed present at the exact pinned sha this dive read directly.
- **Freshest lock in corpus**: `numtide/llm-agents.nix@efb10f2:flake.lock` — `.nodes.nixpkgs.locked.lastModified` = 1790448801, essentially 0 days old at fetch time, 6 `.follows` declarations (`grep -c '\.follows' flake.nix` = 6) — both confirmed directly this dive, matching the brief's cited counts exactly.
- **devenv's triple flake-checker finding**: `cachix/devenv@6d76db3889de` tracks `rolling` (unsupported), >30 days old, non-upstream owner, all three at once — [exemplar-tool-runs.md Axis 4](../nix-audit/exemplar-tool-runs.md).
- **nix-installer's multi-nixpkgs lock**: `DeterminateSystems/nix-installer@76f61b5202e2` — 14 lock nodes, 4 root inputs, 4 nixpkgs-shaped instances by Axis 1's metadata count (2 by shape's direct `.locked.repo` filter) — the discrepancy between the two counts is a difference in what each script's jq query matches (direct-repo vs any-node-containing-nixpkgs), not a contradiction; cite whichever query your own check uses.

## AI-agent angle

- **Reflexively adding `follows = "nixpkgs"` to every input "for hygiene."** An agent trained on H2-era advice will add it uniformly. Wrong on a package-from-cache input (breaks the cache promise, per nixpkgs-python) and often pointless on a module/overlay input (its own nixpkgs "is usually irrelevant" per the manual itself). Check: the reading heuristic in rule 1 — does the target's own README or its consumption shape (module/overlay vs cache-package) actually call for it?
- **Believing `nix flake lock` always "syncs" a local path-input dependency.** An agent iterating on a library flake and its consumer will run `nix build`/`nix eval` in the consumer after editing the library and get stale results, then chase a phantom bug in the *consumer's* code. Check: rule 5's `narHash` diff after `nix flake update <name>`.
- **Treating flake-checker's silent exit 0 as "no findings."** An agent that runs `flake-checker flake.lock` in a script and checks only the exit code will never notice printed findings unless `--fail-mode` is set, and will conflate a crash with "clean" if it also doesn't grep stderr. Check: rule 6's paired `--fail-mode` + stderr grep.
- **Citing NixOS/nix#5393 as a live segfault risk.** Training-era discussion of this bug predates the fix; an agent repeating "a self-follow will segfault Nix" as current guidance is wrong on 2.35.2 — it's now a clean, actionable error. Check: reproduce with the exact two-hop cycle shape in finding 3; a segfault does not occur.
- **Assuming `pkgs.hello` (or any nixpkgs-provided example package) is a stable stand-in for "a fixed-output derivation" in a demonstration or test.** This dive made exactly this mistake on the first attempt: `pkgs.hello.src`'s hash changes across nixpkgs revisions because nixpkgs bumped `hello`'s own version, which looks like — but is not — a `follows`-driven rebuild. Check: verify a package's own version is pinned identically before using it as an "unaffected by nixpkgs revision" example; better, use a hash you chose yourself (`pkgs.fetchurl` with an explicit url+sha256), matching what a real generated flake actually does.
- **Using `--override-input` in CI as if it were a permanent fix**, then being surprised the committed `flake.lock` never changed. It's explicitly a same-invocation override; nothing about it persists past that one command unless the agent separately runs `nix flake lock`/`update`. Check: `git diff --stat -- flake.lock` after a CI run that used `--override-input` should be empty.

## Contested / evolving

- **Whether `follows`-everywhere is good hygiene or noise.** H2 (follows as universal hygiene) is now explicitly contradicted by the Nix manual's own text for the module/overlay case, but still correct for the "avoid 1000 instances of nixpkgs" closure-cost argument (zimbatm, 2022, still cited as live guidance in 2026). The resolution this dive lands on — decide per how the input is consumed — is a synthesis, not a settled community consensus; expect continued disagreement in the wild (fzakaria's own 2026 posts argue the opposite direction from zimbatm's 2022 post on when following is "safe").
- **Lix's stated intent to drop `follows` entirely** ([Lix flake-stabilisation proposal](https://wiki.lix.systems/books/development/page/flake-stabilisation-proposal), living document, not an accepted RFC, undated) would invalidate this entire dive's CppNix-centric framing if it ships; as of 2026-09-27 it is design-stage only (map conflict, M-B-13, P3).
- **flake-checker's own supported-branch list vs its README** is drifting in real time (finding 5/7) — this is not a one-time discrepancy but a structural lag between a shipped binary and its living docs; expect it to recur at every nixpkgs branch cutover (roughly every 6 months).
- **Whether path-input staleness (finding 4) is a documented feature or an underspecified corner** — the manual's own text ("already up-to-date... not modified") is written for the general fetcher case and doesn't call out `path:` specifically; this dive treats the behavior as consistent with the documented contract, but an upstream doc patch calling it out explicitly would be a welcome clarification, not a contradiction.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nix3-flake.md (NixOS/nix@2.35.2)](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) | Primary — Nix manual source, `follows`/lock-file semantics | 2.35.2 (2026-06-22 era) | The "usually irrelevant" quote (finding 1); lock-file node schema, version 7; `follows = ""` root-reference idiom |
| [flake-lock.md (NixOS/nix@2.35.2)](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake-lock.md) | Primary — `nix flake lock` manual page | 2.35.2 | "already up-to-date... not modified" contract quote (finding 4) |
| [flake-update.md (NixOS/nix@2.35.2)](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake-update.md) | Primary — `nix flake update` manual page | 2.35.2 | Confirms `update` rewrites, `lock` only adds |
| [DeterminateSystems/flake-checker README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md) | Primary — tool's own docs, fetched verbatim | fetched 2026-09-27, `main` branch | CEL syntax, variables, recommended condition; supported-branch list (compared live against the installed 0.2.15 binary) |
| [DeterminateSystems/update-flake-lock README](https://raw.githubusercontent.com/DeterminateSystems/update-flake-lock/main/README.md) | Primary — Action's own docs | fetched 2026-09-27 | Default weekly-cron-to-PR pattern; documents the "stale ref" edge case as unresolved |
| [NixOS/nix#5393](https://github.com/NixOS/nix/issues/5393) | Primary — issue tracker, fetched verbatim | filed pre-flakes-stable era | Exact repro reproduced fixture-side; confirms the fix (finding 3) |
| [NixOS/nix#14339](https://github.com/NixOS/nix/issues/14339) | Primary — issue tracker, fetched verbatim, still open | filed 2025-era, open 2026-09-27 | Exact repro read to determine the floating-ref-only failure mode (finding 3) |
| [fzakaria.com/2026/08/31/how-safe-is-follows](https://fzakaria.com/2026/08/31/how-safe-is-follows) | Practitioner (Farid Zakaria), empirical (10,754 flakes) | 2026-08-31 | "Time-traveling" framing, revision-age-delta safety heuristic |
| [zimbatm.com/notes/1000-instances-of-nixpkgs](https://zimbatm.com/notes/1000-instances-of-nixpkgs) | Practitioner (zimbatm), argued | 2022-01-26 | Origin of the "1000 instances" framing; composition-over-inheritance fix, still cited as live guidance |
| [discourse.nixos.org/t/71174](https://discourse.nixos.org/t/71174) | Community consensus thread | 2025-10-23 | Confirms Nix does not dedup nixpkgs nodes by content, only by `follows`; independently surfaces #14339 |
| [cachix/nixpkgs-python README](https://github.com/cachix/nixpkgs-python/blob/main/README.md) | Primary — project's own docs, in exemplar corpus | exemplar sha `4d2bd16` | The single sharpest "don't follow this" line in the corpus (finding 1) |
| [nix-community/fenix ci.yml](https://github.com/nix-community/fenix/blob/5f7e7d793cb2553410f857554de86f277ebe2f71/.github/workflows/ci.yml) | Primary — source, in exemplar corpus | exemplar sha `5f7e7d7` | `--override-input` as a CI test leg, not a fix (finding 8) |
| nix-flakes.md (this program, NIX-FLK-08/10/11) | Consolidated depth file, this program | 2026-09-27 | Settled systems/instantiation skeletons this dive builds on, not re-derives |
| nix-gates.md (this program, NIX-GATE-11) | Consolidated depth file, this program | 2026-09-27 | Settled flake-checker advisory-step rule and crash/finding stderr split |
| nix-generated-flakes.md (this program) | Consolidated depth file, this program | 2026-09-27 | The FOD-plus-wrapper claim this dive independently re-confirmed (finding 6) |
| [exemplar-flake-shape.md](../nix-audit/exemplar-flake-shape.md) §2 | Measured audit, this program | 2026-09-27 | Corpus-wide follows/branch/lock-age counts (37 repos) |
| [exemplar-tool-runs.md](../nix-audit/exemplar-tool-runs.md) Axis 1, Axis 4 | Measured audit (real tool runs), this program | 2026-09-27 | Lock-shape and flake-checker outcomes, per-repo |
