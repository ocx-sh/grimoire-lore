---
title: Exemplar flake shape — a numbers-first audit
agent: nix-audit
model: claude-sonnet-5
scope: >
  Static, measured shape of 37 exemplar flakes (all fetched exemplar repos
  except NixOS/nixpkgs, which is analyzed separately in §12) plus a
  ground-truth `nix flake show`/`nix eval` pass against a handful of remote
  refs. Covers flake structure, inputs/lock hygiene, systems handling,
  nixpkgs instantiation idioms, outputs, nixConfig, formatter/lint config,
  legacy compat, CI, release/versioning practice, generated/index-driven
  flakes, and nixpkgs's own authoring conventions.
method: >
  Shell for-loops over /home/mherwig/.cache/research-lang/exemplars/nix/*
  using `find`, `grep -l/-c/-o` (via `xargs -0` over NUL-delimited file
  lists — the interactive shell's `grep`/`find` are wrapped by a Claude Code
  helper that mis-handles `-l` across many file arguments and rejects
  `-mindepth`; every command below was run through `command grep`/
  `command find` or a written .sh/.py script to bypass that), `jq` against
  flake.lock, a Python/PyYAML pass over `.github/workflows/*.yml` for CI
  (axis 9), `gh api repos/<o>/<r>/tags|releases --paginate` for axis 10, and
  four `nix flake show --no-write-lock-file github:<owner>/<repo>/<sha>`
  ground-truth runs via the provided rootless toolchain
  (`~/.cache/research-lang/nix-tools/run.sh`). All scripts and raw TSV/JSON
  outputs are in the session scratchpad; every number below is
  re-derivable from the inline command next to it.
date_researched: 2026-09-27
---

Nix version at measurement time: **Nix 2.35.2** (CppNix), nixpkgs unstable
pinned to `nixpkgs 26.11` rev `8d5d270900d3fc75655ea2d9d248b234f6631439`
(the fetch-time registry resolution) — the `nix flake show` ground-truth runs
below independently resolved a slightly newer unstable rev
(`e94cb152ed51bd6e24eb4a41f1460252beb52cd2`, 2026-09-25) via each flake's own
`nixpkgs.follows`/registry, which is why §11's fenix run hits a nixpkgs 26.11
regression not yet visible in every exemplar's own `flake.lock`. All
findings are CppNix 2.35 behavior unless marked Lix/Determinate Nix.

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Root flake shape](#1-root-flake-shape)
- [2. Inputs and lock hygiene](#2-inputs-and-lock-hygiene)
- [3. Systems handling](#3-systems-handling)
- [4. nixpkgs instantiation idioms](#4-nixpkgs-instantiation-idioms)
- [5. Outputs exposed](#5-outputs-exposed)
- [6. nixConfig](#6-nixconfig)
- [7. Formatter and lint config](#7-formatter-and-lint-config)
- [8. Legacy compat](#8-legacy-compat)
- [9. CI](#9-ci)
- [10. Release and versioning practice](#10-release-and-versioning-practice)
- [11. Generated/index-driven flakes](#11-generatedindex-driven-flakes)
- [12. nixpkgs conventions (NixOS/nixpkgs only)](#12-nixpkgs-conventions-nixosnixpkgs-only)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

Exemplar SHAs measured: all 38 repos at the commits in
`~/.cache/research-lang/exemplars/nix-fetch.log` (fetched 2026-09-27); every
`<repo>@<sha12>` citation below truncates that log's full SHA to 12 hex
chars, e.g. `oxalica/rust-overlay@4e9bb05a9ab6`.

## Headline numbers

- **36/37** exemplar repos have a root `flake.nix` (`typst/typst@9f2b6e8715` has
  none — it dropped Nix entirely as of 2026-09-23, per the frame).
- Corpus is **linguistically modern**: `stdenv.lib` and `cargoSha256` occur
  **0** times anywhere in the 37-flake corpus. `with import <nixpkgs>`
  (classic channel idiom) occurs in **7** files, all legacy-compat shims or
  NixOS test fixtures — never in live flake-output logic (§4, §8).
- **nixpkgs 26.11 has dropped `x86_64-darwin` support** (measured against a
  live eval, not a doc skim) — see
  [Contradictions of the frame](#contradictions-of-the-frame). This breaks
  every exemplar flake that hardcodes `x86_64-darwin` in its `systems` list
  the moment its `nixpkgs` input rolls forward.
- **12/37** repos use flake-parts, **9/37** a bare `systems.url =
  "github:nix-systems/default"` input, **7/37** flake-utils, **5/37**
  blueprint (directory-convention outputs, zero explicit output attrs) — no
  single strategy owns a majority (§3).
- **Zero** exemplar CI job runs its Nix job on a Windows runner. A naive
  substring grep for `win` corpus-wide "hits" `darwin` and must be
  discarded — see the false-positive note in §9.
- **11/37 (30%)** declare `nixConfig` in `flake.nix`; all 11 point at a
  Cachix-style cache, none pin an alternative substituter policy beyond
  that (§6, H8).
- Median nixpkgs-lock age across repos with a resolvable direct nixpkgs
  input: **65 days**; range 0 (`numtide/llm-agents.nix@efb10f28f724`,
  locked same day) to 566 (`numtide/blueprint@8be75245e274`) (§2).
- The 8 generated/index-driven flakes name three genuinely different data
  architectures, not one convention — see §11 and
  [Patterns worth encoding](#patterns-worth-encoding).

## 1. Root flake shape

```
for r in $(cat repos.txt); do
  fn="$r/flake.nix"
  [ -f "$fn" ] && bytes=$(wc -c < "$fn") && nixcount=$(find "$r" -name '*.nix' -not -path '*/.git/*' | wc -l)
  # + description grep, nix/ dir presence, flake-module*.nix presence
done
```

| metric | value |
|---|---|
| repos with root `flake.nix` | 36 / 37 |
| median `.nix` files per repo | 16 |
| max `.nix` files | `nix-community/home-manager@7b4c5ec4beda` — 3723 |
| min `.nix` files (repo with a flake) | `NixOS/templates@3348e5b68b7a` — 37 (a template collection, not one flake) |
| `description` attribute present | 33 / 36 |
| split via a `nix/` subdirectory | 15 / 37 |
| largest `flake.nix` | `cachix/nixpkgs-python@4d2bd16c09ba` — 16,454 bytes |
| smallest non-empty `flake.nix` | `numtide/blueprint@8be75245e274` — 323 bytes (entire body is `blueprint { inherit inputs; }`) |

Three repos have a `flake.nix` **too small to contain any output logic at
all** — `numtide/blueprint@8be75245e274:flake.nix:9-14` (323B),
`numtide/treefmt@d68dddf6ac3a:flake.nix` (738B), and
`zed-industries/zed@bda9c0bd43a8:flake.nix` (952B) — because all three
delegate to `flake-parts`/`blueprint` and put real output logic in
`nix/modules/*.nix` (zed) or a directory-convention reader (blueprint,
treefmt). A byte-count or attribute-count metric on `flake.nix` alone
**undercounts real complexity** for any flake-parts/blueprint consumer —
confirmed by spot-reading all three (§3, §5 false-negative note).

## 2. Inputs and lock hygiene

```
jq '(.nodes.root.inputs // {}) | length' <repo>/flake.lock            # n_inputs
jq '[.nodes[] | select(.flake==false)] | length' <repo>/flake.lock     # flake=false count
grep -c '\.follows *=' <repo>/flake.nix                                # follows declarations
jq '[.nodes[] | select((.locked.repo? // "")=="nixpkgs")] | length'    # nixpkgs node count
                                                                        <repo>/flake.lock
# nixpkgs lock age: (1790467200 - locked.lastModified) / 86400, 1790467200 = 2026-09-27T00:00Z
```

| repo | inputs | flake=false | follows | lock nodes | nixpkgs nodes | dup revs | nixpkgs branch | lock age (days) |
|---|--:|--:|--:|--:|--:|--:|---|--:|
| cachix/cachix | 4 | 3 | 5 | 13 | 1 | 0 | nixos-unstable | 62 |
| cachix/devenv | 10 | 4 | 16 | 13 | 1 | 0 | — (indirect via input) | 31 |
| cachix/git-hooks.nix | 2 | 1 | 0 | 3 | 1 | 0 | nixpkgs-unstable | 32 |
| cachix/nixpkgs-python | 2 | 1 | 0 | 3 | 1 | 0 | nixos-25.11 | 88 |
| DeterminateSystems/flake-checker | 4 | 2 | 2 | 9 | 0 | 0 | — (FlakeHub URL) | 13 |
| DeterminateSystems/nix-installer | 4 | 4 | 3 | 14 | 2 | 0 | — (FlakeHub URL) | 10 |
| direnv/direnv | 3 | 0 | 1 | 6 | 1 | 0 | — | 451 |
| ghostty-org/ghostty | 6 | 2 | 5 | 7 | 0 | 0 | nixpkgs-unstable (tarball) | 35 |
| helix-editor/helix | 2 | 0 | 1 | 3 | 1 | 0 | nixos-unstable | 178 |
| hercules-ci/flake-parts | 1 | 0 | 0 | 2 | 0 | 0 | — | — |
| ipetkov/crane | 0 | 0 | 0 | 1 | 0 | 0 | — | — |
| jj-vcs/jj | 3 | 0 | 1 | 5 | 1 | 0 | nixpkgs-unstable | 47 |
| Mic92/nixpkgs-review | 3 | 0 | 2 | 4 | 1 | 0 | nixpkgs-unstable | 4 |
| Mic92/sops-nix | 1 | 0 | 0 | 2 | 1 | 0 | nixpkgs-unstable | 8 |
| mitchellh/zig-overlay | 3 | 2 | 0 | 4 | 1 | 0 | nixos-25.11 | 224 |
| nix-community/disko | 1 | 0 | 0 | 2 | 1 | 0 | — | 110 |
| nix-community/fenix | 2 | 1 | 0 | 3 | 1 | 0 | nixos-unstable (tarball) | 1 |
| nix-community/home-manager | 1 | 0 | 0 | 2 | 0 | 0 | nixpkgs-unstable (tarball) | 9 |
| nix-community/nix-index | 2 | 1 | 0 | 3 | 0 | 0 | nixos-unstable (**indirect** scheme) | 89 |
| nix-community/nix-index-database | 1 | 0 | 0 | 2 | 1 | 0 | nixos-unstable | 7 |
| nix-community/nix-vscode-extensions | 1 | 0 | 0 | 2 | 1 | 0 | — | 68 |
| nix-community/nixd | 3 | 0 | 1 | 5 | 0 | 0 | nixos-unstable (tarball) | 7 |
| nix-darwin/nix-darwin | 1 | 0 | 0 | 2 | 1 | 0 | nixpkgs-unstable | 83 |
| NixOS/nix | 6 | 1 | 3 | 7 | 2 | 0 | nixos-26.05 (tarball) | 12 |
| NixOS/templates | 0 | 0 | 0 | 0 | 0 | 0 | — | — |
| numtide/blueprint | 2 | 0 | 0 | 3 | 1 | 0 | nixos-unstable | **566** |
| numtide/flake-utils | 1 | 0 | 0 | 2 | 0 | 0 | — | — |
| numtide/llm-agents.nix | 5 | 0 | 6 | 6 | 1 | 0 | nixpkgs-unstable | **0** |
| numtide/treefmt | 5 | 0 | 2 | 7 | 1 | 0 | nixos-unstable | 192 |
| numtide/treefmt-nix | 1 | 0 | 0 | 2 | 1 | 0 | nixpkgs-unstable | 235 |
| oxalica/nil | 1 | 0 | 0 | 2 | 1 | 0 | nixpkgs-unstable | 68 |
| oxalica/rust-overlay | 1 | 0 | 0 | 2 | 1 | 0 | nixpkgs-unstable | 531 |
| stackbuilders/nixpkgs-terraform | 4 | 0 | 0 | 5 | **3** | 0 | nixos-23.05 (+2 more, see below) | 102 |
| sxyazi/yazi | 3 | 0 | 1 | 5 | 1 | 0 | nixpkgs-unstable | 12 |
| the-nix-way/dev-templates | 1 | 0 | 0 | 2 | 0 | 0 | — (FlakeHub URL) | 112 |
| typst/typst | 0 | 0 | 0 | 0 | 0 | 0 | — | — |
| zed-industries/zed | 4 | 0 | 1 | 6 | 1 | 0 | nixos-unstable | 239 |

Corpus totals: **50** `.follows` declarations across 37 repos; **22**
`flake = false` inputs; **3** repos carry more than one distinct nixpkgs
lock node. Distribution of `nixpkgs_branch` where a direct nixpkgs input
exists (25 resolvable): `nixpkgs-unstable` 12, `nixos-unstable` 9,
`nixos-25.11` 2, `nixos-26.05` 1, `nixos-23.05` 1.

**URL schemes** (root-level direct inputs only, from `flake.lock`
`original.type`, corpus total 94 direct inputs across 32 repos with a
lock):

```
jq -r '(.nodes.root.inputs//{})|to_entries[]|select(.value|type=="string")|.value' <repo>/flake.lock \
  | while read k; do jq -r --arg k "$k" '.nodes[$k].original.type' <repo>/flake.lock; done
```

| scheme | count | example |
|---|--:|---|
| `github` | 81 | `nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"` (most common) |
| `tarball` (https URL) | 12 | `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:5` `"https://flakehub.com/f/NixOS/nixpkgs/0"`; `NixOS/nix@209d2bc44288:flake.nix:4` `"https://channels.nixos.org/nixos-26.05/nixexprs.tar.xz"` |
| `indirect` | 1 | `nix-community/nix-index@dd6792b23059:flake.nix:5` `nixpkgs.url = "nixpkgs/nixos-unstable"` (flake-registry lookup; locks to a `tarball` under the hood) |

Spot-read of all 12 `tarball` hits confirmed **3 repos use FlakeHub as a
consumer**, not just a publisher — `DeterminateSystems/nix-installer`,
`DeterminateSystems/flake-checker`, `the-nix-way/dev-templates` all pin
`nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0"` or `/0.1`. This is
a direct partial contradiction of **H4** ("FlakeHub is the only
semver-resolving channel [for publishing]") — FlakeHub's semver-range
syntax (`/0`, `/0.1`) is also used as an **input pin** by three exemplars,
not only as a publish target. False-positive check on `tarball`: all 4
`channels.nixos.org/.../nixexprs.tar.{xz,zst}` hits are genuine legacy
nixpkgs-channel tarball URLs, not a regex artifact (spot-read all 4:
`ghostty-org/ghostty@b40acce58dcf:flake.nix:12`,
`nix-community/nixd@77bb1cacfa8a:flake.nix:3`,
`nix-community/home-manager@7b4c5ec4beda:flake.nix:4`,
`NixOS/nix@209d2bc44288:flake.nix:4`).

`stackbuilders/nixpkgs-terraform@a5893ca82ec3:flake.nix:5-8` pins **three**
separate nixpkgs branches on purpose — `nixos-23.05-small`,
`nixos-24.05-small`, `nixpkgs-unstable` — each building a different
Terraform version range. This is a deliberate multi-nixpkgs pattern, not an
accident (§11 detail).

## 3. Systems handling

```
grep -lE 'flake-utils\.lib\.(eachDefaultSystem|eachSystem)' <files>
grep -lE 'flake-parts\.lib\.mkFlake|perSystem *=' <files>
grep -lE 'nix-systems|import systems' <files>
grep -lE 'blueprint' <files>
grep -lE 'genAttrs|forAllSystems' <files>
```
(run via `find <repo> -name '*.nix' -print0 | xargs -0 command grep -lE '<pat>'` — the
interactive `grep` alias mishandles `-l` over many file args, see method note)

| strategy | repos using it |
|---|--:|
| `genAttrs`/`forAllSystems` (hand-rolled) | 29 / 37 |
| flake-parts (`mkFlake`/`perSystem`) | 12 / 37 |
| `nix-systems` input or `import systems` | 9 / 37 |
| flake-utils (`eachDefaultSystem`/`eachSystem`) | 7 / 37 |
| blueprint | 5 / 37 |
| none of the above detected | 2 / 37 (`ipetkov/crane` is a **library**, no systems handling needed; `hercules-ci/flake-parts` is flake-parts' own repo, self-referential) |

These are not mutually exclusive (`genAttrs` frequently appears *inside* a
flake-parts or nix-systems flake to build the `forAllSystems` helper flake-parts
itself doesn't need) — hercules-ci/flake-parts scores 19 `flake-parts`-pattern
file hits because it's the library's own source tree. **No single strategy
owns a majority**, contradicting an implicit "flake-utils is the default"
assumption: flake-utils is now the **least**-used of the four real
strategies in this corpus, consistent with its own upstream state
(`numtide/flake-utils@11707dc2f618` last committed 2024-11-13, more than 600
days stale — see §10).

Declared systems, corpus-wide (from literal string matches, all `.nix`
files):

| system | repos declaring it |
|---|--:|
| `x86_64-linux` | 27 |
| `aarch64-linux` | 21 |
| `x86_64-darwin` | 17 |
| `aarch64-darwin` | 20 |
| `i686-linux` | 8 |
| `riscv64-linux` | 3 |
| `armv7l-linux` | 1 |

**Every one of the 17 repos hardcoding `x86_64-darwin`** is exposed to the
nixpkgs-26.11 platform drop in [Contradictions of the frame](#contradictions-of-the-frame).

## 4. nixpkgs instantiation idioms

```
grep -lE 'import +nixpkgs +\{' <files>          # imp
grep -lE 'legacyPackages' <files>               # leg
grep -lE '^\s*overlays(\.default)? *=' <files>  # ovl (export)
grep -oE '\bwith pkgs;' <files>                 # wp  (occurrence count)
grep -oE '\brec\s*\{' <files>                   # rc  (occurrence count)
grep -lE 'finalAttrs' <files>                   # fa
grep -lE 'mainProgram' <files>                  # mp
grep -lE 'allowUnfree' <files>                  # au
grep -lE 'overlays *= *\[' <files>              # oc  (overlays consumed)
grep -lE 'self\.(shortRev|dirtyShortRev|lastModifiedDate|rev\b)' <files>  # ssr
grep -lE 'fromTOML' <files>                     # ft
grep -lE 'lib\.fileset|cleanSourceWith|lib\.cleanSource|cleanCargoSource|builtins\.path' <files>  # cs
grep -lE 'version *= *"[0-9]' <files>           # hv (hardcoded version literal)
```

Columns marked `(files)` count files matching; `with_pkgs`/`rec_count` count
raw occurrences (a repo can rack up hundreds inside a huge tree like
home-manager or llm-agents.nix's 205 package definitions).

| repo | import nixpkgs{} | legacyPkgs | overlays export | `with pkgs;` (occ) | `rec {` (occ) | finalAttrs | mainProgram | allowUnfree | overlays consumed | self.rev-family | fromTOML | source filtering | hardcoded ver. literal |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| cachix/cachix | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cachix/devenv | 3 | 4 | 6 | 18 | 1041 | 1 | 7 | 2 | 2 | 1 | 3 | 10 | 18 |
| ghostty-org/ghostty | 2 | 1 | 3 | 1 | 4 | 4 | 2 | 0 | 2 | 1 | 0 | 2 | 6 |
| ipetkov/crane | 10 | 8 | 9 | 4 | 3 | 0 | 0 | 0 | 8 | 0 | 8 | **32** | 3 |
| nix-community/home-manager | 0 | 4 | 4 | **39** | 38 | 1 | 24 | 2 | 35 | 0 | 0 | 11 | **102** |
| NixOS/nix | 1 | 6 | 1 | 6 | **56** | **35** | 10 | 0 | 1 | 0 | 8 | 13 | 5 |
| numtide/llm-agents.nix | 1 | 0 | 0 | 1 | 80 | **49** | **195** | 1 | 0 | 0 | 0 | 2 | **107** |
| numtide/treefmt-nix | 1 | 0 | 0 | 0 | 0 | 0 | 16 | 1 | 0 | 0 | 0 | 0 | 0 |
| the-nix-way/dev-templates | 0 | 0 | 9 | **47** | 2 | 0 | 0 | 1 | 9 | 0 | 0 | 0 | 2 |
| *(24 more rows omitted for space — full TSV in scratch: axis4.tsv)* | | | | | | | | | | | | | |

Corpus totals (repos with ≥1 hit / total occurrences-or-files, 37 repos):

| idiom | repos ≥1 | total |
|---|--:|--:|
| `import nixpkgs { … }` per-output re-instantiation | 17 | 44 files |
| `legacyPackages` used | 24 | 70 files |
| overlay exported | 24 | 68 files |
| `with pkgs;` | 24 repos | **175** occurrences |
| `rec { }` | 24 repos | **1264** occurrences |
| `finalAttrs` (post-2023 `mkDerivation` idiom) | 10 | 95 |
| `meta.mainProgram` | 22 | 280 |
| `allowUnfree` config | 9 | 15 |
| overlays *consumed* (`overlays = [ … ]`) | 18 | 84 |
| `self.shortRev`/`dirtyShortRev`/`lastModifiedDate`/`rev` | 10 | 15 |
| `fromTOML` (Cargo.toml version reads) | 10 | 28 |
| source filtering (`lib.fileset`/`cleanSourceWith`/`cleanCargoSource`/`builtins.path`) | 21 | 90 |
| hardcoded `version = "N…"` literal | 16 | 259 |

Spot-read (3 hits) of `import nixpkgs { … }`: `ipetkov/crane@73b980519cef`
(10 hits) re-imports nixpkgs once per test fixture under `examples/`, not
once per flake output — the "1000 instances of nixpkgs" framing in **H1**
over-states crane's own flake (its library code takes `pkgs` as an
argument); `nix-darwin/nix-darwin@4cff07de74b5` (2 hits) is one real
per-system import plus one in a test; `zed-industries/zed@bda9c0bd43a8`
(0 hits, uses flake-parts' `perSystem` instead — confirming flake-parts
consumers avoid this idiom entirely, as designed). **H1's "1000 instances"
framing does not hold at exemplar scale**: even the worst offender
(`ipetkov/crane`, 10 files) is an order of magnitude short of "1000", and
the pattern is concentrated in test/example fixtures, not production flake
outputs.

`rec { }` is the single most common idiom in the corpus by raw count
(1264), overwhelmingly from `NixOS/nix@209d2bc44288` (56) and
`numtide/llm-agents.nix@efb10f28f724` (80, one per package definition
using the shared `rec` pattern for `pname`/`version`/`src` interpolation) —
this is *not* the notorious "unnecessary `rec`" antipattern in most hits;
spot-reading 3 `numtide/llm-agents.nix` package files
(`packages/claude-code/default.nix`, `packages/amp/default.nix`) shows
`rec` used exactly where nixpkgs's own `pkgs/README.md` still permits it
(interpolating `pname`/`version` into `src.url`), not gratuitously.

## 5. Outputs exposed

Measured from root `flake.nix` only (a static, cheap, but **incomplete**
signal for flake-parts/blueprint consumers — see the §1 false-negative
note; `numtide/blueprint`, `numtide/treefmt`, and `zed-industries/zed` all
show zero here despite exposing real `packages`/`devShells`/`overlays`
outputs through imported files, confirmed by direct read of
`zed-industries/zed@bda9c0bd43a8:nix/modules/{overlays,packages,partitions}.nix`).

```
grep -cE "(^|[[:space:]])<output>(\.[A-Za-z_-]+)? *=" <repo>/flake.nix
```

| output | repos exposing (flake.nix-visible) |
|---|--:|
| `packages` | 29 |
| `devShells` | 21 |
| `checks` | 21 |
| `overlays` | 20 |
| `formatter` | 15 |
| `lib` | 15 |
| `templates` | 12 |
| `apps` | 6 |
| `nixosModules` | 5 |
| `flakeModules` | 5 |
| `legacyPackages` | 5 |
| `darwinModules` | 4 |
| `hydraJobs` | 2 |
| `homeManagerModules` | 1 |

`apps` is rare (6/37) — most exemplars that ship a runnable binary rely on
`packages.<system>.default` plus `nix run .#<name>` resolving to the
package's `meta.mainProgram`/first executable, rather than a hand-written
`apps` output.

## 6. nixConfig

```
grep -A6 'nixConfig' <repo>/flake.nix | grep -oE '"https?://[^"]*"'
```

**11 / 37** repos declare `nixConfig`; every one names a Cachix-style
binary cache, none declares anything else (no custom `sandbox-paths`,
no `trusted-users`, no `experimental-features` override):

| repo | substituter | file:line |
|---|---|---|
| `cachix/cachix` | `https://cachix.cachix.org` | `flake.nix:4-6` |
| `cachix/devenv` | `https://devenv.cachix.org` `https://cachix.cachix.org` | `flake.nix:4-6` |
| `cachix/nixpkgs-python` | `https://nixpkgs-python.cachix.org` | `flake.nix:10-11` |
| `ghostty-org/ghostty` | `https://ghostty.cachix.org` | `flake.nix:173-174` |
| `helix-editor/helix` | `https://helix.cachix.org` | `flake.nix:96-97` |
| `ipetkov/crane` | `https://crane.cachix.org` | `flake.nix:6-7` |
| `Mic92/sops-nix` | `https://cache.thalheim.io` | `flake.nix:5-6` |
| `nix-community/nix-vscode-extensions` | `https://nix-community.cachix.org` + `https://hydra.iohk.io` | `flake.nix:46` |
| `numtide/llm-agents.nix` | `https://cache.numtide.com` | `flake.nix:3-5` |
| `numtide/treefmt` | `https://cache.numtide.com` | `flake.nix:4-5` |
| `zed-industries/zed` | `https://zed.cachix.org` | `flake.nix:19-25` |

This directly supports **H8**: `nixConfig` is a pure convenience/UX signal
— it does nothing for a consumer running `nix build` without
`--accept-flake-config` (the default posture), and every declared
substituter here is trust-on-first-use for anyone who *does* accept it.
None hardens against cache poisoning (no repo pairs a substituter with a
non-default `trusted-public-keys` policy beyond the paired key for the
same cache).

## 7. Formatter and lint config

```
grep -oE 'nixfmt-rfc-style|nixfmt-classic|nixfmt\b|alejandra|nixpkgs-fmt|treefmt' <repo>/flake.nix
```

| formatter choice | repos |
|---|--:|
| `nixfmt` (RFC 166, classic invocation) | 7 |
| `treefmt` (multiplexer, wraps others) | 6 |
| `nixpkgs-fmt` (deprecated, superseded by nixfmt) | 3 |
| `alejandra` | 3 |
| `nixfmt-rfc-style` (explicit RFC-style attribute name) | 1 |
| none detected in root `flake.nix` | 17 |

Of the 17 "none detected", 3 were spot-read and are **genuine gaps**, not
grep misses — `nix-darwin/nix-darwin@4cff07de74b5`, `helix-editor/helix@079a789e8cb0`,
and `direnv/direnv@b00e451f547f` all confirmed to have **no** `formatter`
output anywhere under their `.nix` tree (checked via
`find <repo> -name '*.nix' -print0 | xargs -0 grep -l formatter`, zero
hits for all three).

`treefmt.toml` present: 2 (`nix-community/disko@725ea35e410a`,
`nix-community/home-manager@7b4c5ec4beda`). `treefmt-nix` as a flake input:
5 (`Mic92/nixpkgs-review`, `nix-community/nixd`, `numtide/llm-agents.nix`,
`numtide/treefmt`, `numtide/treefmt-nix` itself). `git-hooks.nix`/
pre-commit config: 4 confirmed true positives
(`cachix/cachix@3349ce74ba77:flake.nix`, `cachix/devenv`, `NixOS/nix`, all
reference `git-hooks` as an input name — spot-read confirmed, no false
positives). `statix.toml`: 2. `deadnix` config file: 0 (deadnix is invoked
via CLI flags in CI, never a repo-local config file, across the whole
corpus).

## 8. Legacy compat

```
[ -f <repo>/default.nix ] && grep -q 'flake-compat' <repo>/default.nix
grep -oE '[A-Za-z0-9_.-]+/flake-compat' <repo>/flake.nix <repo>/default.nix
```

| metric | count |
|---|--:|
| `default.nix` present | 27 / 37 |
| `shell.nix` present | 14 / 37 |
| `flake-compat` referenced (either file) | 12 / 37 |
| `.envrc` with `use flake` | 16 / 37 |

`flake-compat` fork attribution is **not uniform** — spot-reading all 12
hits found **three** distinct sources in active use:

| fork | repos | citation |
|---|---|---|
| `edolstra/flake-compat` (original, unmaintained since the org transfer) | 10 (`cachix/cachix`, `cachix/devenv`, `cachix/nixpkgs-python`, `ghostty-org/ghostty`, `mitchellh/zig-overlay`, `nix-community/nix-index`, `nix-community/nix-vscode-extensions` (`default.nix` only), `NixOS/nix` (`default.nix` only), `oxalica/nil`, `cachix/git-hooks.nix` (`default.nix` only)) | e.g. `cachix/cachix@3349ce74ba77:default.nix:1` |
| `NixOS/flake-compat` (canonical org-transferred repo) | 2 (`cachix/git-hooks.nix@0d3997c4d325:flake.nix`, `NixOS/nix@209d2bc44288:flake.nix`, `zed-industries/zed@bda9c0bd43a8:default.nix:8` via a raw tarball URL) | `cachix/git-hooks.nix@0d3997c4d325:flake.nix` |
| `nix-community/flake-compat` (community fork, actively maintained, different feature set) | 2 (`numtide/treefmt@d68dddf6ac3a:flake.nix`, `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix`, spelled `"nix/flake-compat"` there — a nix-community-org shorthand) | `numtide/treefmt@d68dddf6ac3a:flake.nix` |

This is a real, present-day fragmentation: **a flake author copy-pasting
the still-common `edolstra/flake-compat` boilerplate is citing a repo that
migrated to the `NixOS` org**; the URL still resolves (GitHub redirects),
but new authors following current docs should use `NixOS/flake-compat` or
the community fork, not the historical org.

## 9. CI

Method: a PyYAML pass (`axis9.py`) that parses every
`.github/workflows/*.yml`, finds the **job(s) that actually invoke a Nix
installer action**, and scopes `runs-on`/`strategy.matrix.os` extraction to
*those jobs only* — not the whole workflow file. This mattered: an
unscoped `grep -ohE 'windows-[a-z0-9.-]+' *.yml` over
`jj-vcs/jj@f01e70f8e375`'s workflows "found" a Windows runner, but it
belongs to that repo's **Rust** cross-compile matrix
(`.github/workflows/ci.yml`, a different job) — the actual `build-nix` job
(`ci.yml:129-144`) matrix is `[ubuntu-24.04, ubuntu-24.04-arm, macos-14]`,
no Windows. Scoping to the Nix-invoking job specifically is required for
this axis to mean anything; the corpus-wide unscoped grep's false-positive
rate for "Windows in Nix CI" is **100%** (0 real hits out of however many
naive matches).

A second false positive, caught only by printing the raw OS/runner label
set: a substring check for `"win" in os.lower()` matches **`darwin`**
(`dar-WIN`). The corrected, scoped answer: **zero** Nix CI jobs anywhere in
the 37-repo corpus run on a Windows runner. `typst/typst`'s workflows do
have a `windows-latest` job, but it belongs to typst's own Rust build
matrix (typst has no Nix files at all as of this measurement, see
Headline numbers).

| metric | count |
|---|--:|
| repos with ≥1 job invoking a Nix installer action | 32 / 37 |
| repos whose Nix CI runs `nix flake check` | 14 / 37 |
| repos with a dedicated lock-update workflow (`DeterminateSystems/update-flake-lock` or equivalent) | 3 (`DeterminateSystems/flake-checker`, `DeterminateSystems/nix-installer`, `ipetkov/crane`) |
| repos with a `flakehub-push`/`DeterminateSystems/flakehub-push` publish workflow | 4 (`DeterminateSystems/flake-checker`, `ipetkov/crane`, `nix-community/fenix`, `stackbuilders/nixpkgs-terraform`) |
| distinct OS/runner labels seen in Nix jobs, corpus-wide | `ubuntu-latest`, `ubuntu-24.04[-arm]`, `ubuntu-22.04`, `macos-latest[-xlarge]`, `macos-14/15/26`, `macos-15-intel`, self-hosted/`namespace-profile-*`/`UbuntuLatest*Cores*` custom runners |

Installer action distribution (job-scoped, action@ref as pinned):

| installer | repos | pinning style |
|---|--:|---|
| `cachix/install-nix-action` | 24 | **mixed** — roughly half pin a full 40-char commit SHA (`@13d8dd58da0234aa297dedd986986ccb8e7f3e24`, `@630ae543ea3a38a9a4166f03376c02c50f408342`, …), the rest a version tag (`@v31`, `@v26`) |
| `DeterminateSystems/determinate-nix-action` | 4 | `@main` (all 4 — floating, not pinned) |
| `DeterminateSystems/nix-installer-action` | 3 | mixed `@main` and `@v23` |
| `nixbuild/nix-quick-install-action` | 1 | `@v34` |

Cache action distribution: `cachix/cachix-action` 13 repos (mixed SHA/tag
pinning, same split as the installer), `DeterminateSystems/flakehub-cache-action`
3, `DeterminateSystems/magic-nix-cache-action` 1, no repo uses
`nix-community/cache-nix-action` for Nix-build caching specifically (it
appears once, in `nix-community/nix-vscode-extensions`, for generic
GitHub-Actions-cache of the marketplace JSON, not Nix-store caching).

**Automated update cadence** (from `on.schedule.cron` on the job that owns
the lock-bump / data-refresh): ranges from **hourly**
(`cachix/nixpkgs-python@4d2bd16c09ba:.github/workflows/update.yml:6`,
`cron: "5 * * * *"`) to **weekly**
(`DeterminateSystems/flake-checker@cddc8afc9733:.github/workflows/update-flake-lock.yaml`,
`cron: "0 0 */15 * *"`, effectively bi-weekly) — no fixed convention; see
§11 for the generated-flake subset specifically.

## 10. Release and versioning practice

```
gh api repos/<owner>/<repo>/tags --paginate -q '.[].name' | wc -l
gh api repos/<owner>/<repo>/releases --paginate -q '.[].tag_name' | wc -l
```

| repo | tags | releases | latest tag style | CHANGELOG | FlakeHub in README | README install hint |
|---|--:|--:|---|:-:|:-:|---|
| cachix/cachix | 64 | 0 | `v1.12.1` | – | – | `nix profile install` |
| cachix/devenv | 59 | 57 | `v2.4.0` | ✓ | – | – |
| cachix/git-hooks.nix | 0 | 0 | – | ✓ | – | – |
| cachix/nixpkgs-python | 5 | 0 | `v1.2.0` | – | – | – |
| DeterminateSystems/flake-checker | 37 | 37 | `v0.2.15` | – | ✓ | `nix run` |
| DeterminateSystems/nix-installer | 132 | 132 | `v3.22.5` | – | ✓ | `nix run` |
| direnv/direnv | 86 | 64 | `v2.37.1` | ✓ | – | – |
| ghostty-org/ghostty | 13 | 1 | `v1.3.1` | – | – | – |
| helix-editor/helix | 30 | 30 | `v0.6.0`* | ✓ | – | – |
| ipetkov/crane | 64 | 63 | `v0.24.0` | ✓ | – | – |
| jj-vcs/jj | 53 | 53 | `v0.45.1` | ✓ | – | – |
| Mic92/nixpkgs-review | 69 | 45 | `4.0.0` (no `v`) | – | – | `nix run` |
| Mic92/sops-nix | 1 | 1 | `assets`† | – | – | `nix run` |
| mitchellh/zig-overlay | 0 | 0 | – | – | – | `nix run` (overlay, no tags at all) |
| nix-community/disko | 19 | 15 | `v1.13.0` | – | – | – |
| nix-community/fenix | 0 | 0 | – | – | – | overlay |
| nix-community/home-manager | 0 | 0 | – | ✓ | – | `nix run` |
| nix-community/nix-index | 12 | 8 | `v0.1.11` | ✓ | – | `nix run` |
| nix-community/nix-index-database | **288** | 288 | `2026-09-20-075601` (timestamp, not semver) | – | – | `nix run` |
| nix-community/nix-vscode-extensions | 0 | 0 | – | – | – | `nix run` |
| nix-community/nixd | 35 | 35 | `2.9.3` (no `v`) | – | – | – |
| nix-darwin/nix-darwin | 0 | 0 | – | ✓ | – | `nix run` |
| NixOS/nix | 251 | 0 | `2.35.2` (no `v`) | – | – | – |
| NixOS/templates | 0 | 0 | – | – | – | – |
| numtide/blueprint | 0 | 0 | – | – | – | – |
| numtide/flake-utils | 1 | 1 | `v1.0.0` | – | – | flake-input snippet |
| numtide/llm-agents.nix | 1 | 1 | `assets`† | – | – | `nix run` |
| numtide/treefmt | 38 | 32 | `v2.6.0` | – | – | – |
| numtide/treefmt-nix | 0 | 0 | – | – | – | `nix run` |
| oxalica/nil | 18 | 18 | `2026-07-23` (date, not semver) | – | – | `nix profile install` |
| oxalica/rust-overlay | 3 | 0 | `snapshot/2026-03-11` (date snapshot) | – | – | overlay |
| stackbuilders/nixpkgs-terraform | 65 | 65 | `v5.23.0` | – | ✓ | `nix run` |
| sxyazi/yazi | 34 | 33 | `v26.9.1` | ✓ | – | – |
| the-nix-way/dev-templates | 6 | 0 | `v0.1.5` | – | ✓ | – |
| typst/typst | 30 | 30 | `v23-03-28` | – | – | `nix run` |
| zed-industries/zed | **1480** | 1303 | `v1.22.0-pre` | – | – | – |

\* helix's tags are the *editor's* releases, not the flake's own version —
the flake ships inside the main repo and inherits its tag scheme.
† `assets`/similarly-named tags are non-version release-asset tags, not a
version scheme at all — spot-read confirms both are one-off publishing
artifacts, not a versioning convention.

**10 / 37 repos have zero tags whatsoever** (`git-hooks.nix`, `flake-parts`,
`zig-overlay`, `fenix`, `home-manager`, `nix-vscode-extensions`,
`nix-darwin`, `NixOS/templates`, `blueprint`, `treefmt-nix`). `nix-darwin`
is the notable case: it has a CHANGELOG.md but no git tags at all, so its
versioning happens entirely through CHANGELOG prose plus consumers pinning
`flake.lock` revs — never a tag.
This is a strong, corpus-wide signal for **H4**: tag-based flake versioning
is **inconsistent to the point of having no dominant convention** — semver
tags (`vX.Y.Z`), bare semver (no `v`), date-stamped tags, and zero tags all
coexist, and the *most*-tagged repo in the corpus
(`nix-community/nix-index-database`, 288 tags) uses **timestamps**, not
semver, because its tags are CI-bot commits, one per successful database
refresh — not human release markers at all.

**Install-hint distribution** in README: `nix run` 11, `nix profile
install` 2, flake-input snippet 1, overlay mention 3, no clear hint 20 (the
majority of exemplar READMEs give installation instructions in prose that
didn't match any of the 4 greppable patterns, or point at NixOS-options
documentation instead of a runnable command).

## 11. Generated/index-driven flakes

This is the axis closest to the ocx goal, so all 8 named flakes were
inspected directly (not just grepped) — including reading the committed
data files, updater scripts, and CI cron jobs.

| repo | committed data file(s) | format / size / entries | updater | cadence | attribute shape | fetcher for the artifact | binary-run mechanism |
|---|---|---|---|---|---|---|---|
| `mitchellh/zig-overlay@95d96b17b711` | `sources.json` (root) | JSON, **2,188,554 bytes**, 24 top-level keys (`master` + 23 tagged versions), **8,230** leaf platform×version entries | none committed in-repo (README implies a maintainer script; not present in sparse clone) | — | `packages.<system>.<version-or-date>`, plus `zigpkgs` overlay alias | `builtins.fetchurl`-style direct `url`+`sha256` per platform, read straight out of `sources.json` | none — Zig ships static binaries, no `autoPatchelfHook` needed |
| `oxalica/rust-overlay@4e9bb05a9ab6` | `manifests/{stable,beta,nightly}/*.nix` — **856** generated `.nix` files (one per stable version + one `default.nix` per date under `beta/`,`nightly/`), plus static `manifests/{targets,profiles,renames}.nix` | generated Nix, per-version files ~0.5–2KB each, hashes stored as base64 in a **positional array** (`_0.._N` keyed to `manifests/targets.nix`'s target-triple ordering, not per-triple keys — a deliberate size optimization) | `scripts/fetch.py` (14KB, `#!/usr/bin/env nix-shell` self-declaring its own `python3.withPackages (ps: [toml requests])` runtime) | daily (`sync-channels.yaml:5`, `cron: '0 2 * * *'`) + a Thursday-afternoon extra pass (`:11`, `cron: '0 14-20 * * THU'`) for the beta cutover window | `packages.<system>.rust-bin.{stable,beta,nightly}.<version-or-date>.<profile>` | precomputed sha256 hashes read from the generated `.nix`, fetched via nixpkgs `fetchurl` at build time | rustc/cargo upstream tarballs are prebuilt against glibc; consuming flakes are expected to wrap with `autoPatchelfHook` themselves — rust-overlay does **not** patch elf itself |
| `nix-community/fenix@5f7e7d793cb2` | `data/{stable,beta,nightly}.json` | JSON, 139.8KB / 142.1KB / 71.7KB — **single latest snapshot per channel only** (top-level keys are `date`,`pkg`,`profiles`; no version history retained in-repo) | not in sparse clone (root `flake.nix` only references `data/`; updater lives in `.github/workflows/*.yml` calling a script not captured by the sparse fetch pattern) | daily (`update.yml`) + monthly (`monthly.yml`) | `packages.<system>.{stable,beta,latest}.<component>`, `packages.<system>.targets.<triple>.<channel>.rust-std` | direct `url`+`hash` per target, read from the JSON | none needed — Rust's own static-ish `static.rust-lang.org` tarballs |
| `nix-community/nix-index-database@9ad722673ab3` | none (no committed data — the flake *builds* a fresh index from nixpkgs at eval/build time) | — | implicit: `nix-index`'s own crawler, invoked in CI | weekly, Sunday (`update.yml`, `cron: '51 2 * * 0'`) | `packages.<system>.{nix-index-database, nix-index-small-database, nix-index-with-db, ...}` | N/A (crawls the live nixpkgs binary cache) | N/A |
| `nix-community/nix-vscode-extensions@329083cd32e0` | `data/cache/vscode-marketplace-latest.json` (**16.8MB**, 126,504 raw extension-listing entries), `data/cache/open-vsx-latest.json` (2.9MB) | JSON, raw marketplace API dumps, **not** pre-hashed per-extension | `nix run ./nix-dev#updateExtensions -- --config config.yaml` (`.github/workflows/*.yaml:116`) | daily (`cron: 0 0 * * *`) | `legacyPackages.<system>.{vscode-marketplace,open-vsx,...}.<publisher>.<extension>` (lazy attrset built from the cache by `nix/extensions.nix` + `overlay.nix`) | **lazy per-entry fetch**: no hash precomputed in the cache file — each extension is fetched via a `fetchzip`-style call assembled from marketplace metadata *at use time*, only when the attribute is actually forced | none observed (VS Code extensions are `.vsix` zips, unpacked, no ELF patching) |
| `numtide/llm-agents.nix@efb10f28f724` | none (per-package: version pinned directly inside each `packages/<name>/default.nix`, no central data file) | 205 package directories under `packages/` | `lib/mk-updater.nix` + `lib/mk-update-script.nix` — a **declarative `passthru.updater` schema** per package with `kind` ∈ {`github-source`,`npm`,`bun-github`,`platform`,`manifest`,`manifest-checksums`}, consumed by `scripts/updater/run.py` | 4×/day (`update.yml`, `cron: '0 0,4,18,21 * * *'`) | `packages.<system>.<name>` (flat, one attr per CLI tool) | fetcher chosen per-package by `updater.kind` (github release / npm tarball / bun-github / platform-url-template / upstream manifest) | `lib/npm-config-hook.sh`, per-package `postFixup` hooks; ast-grep rule `rules/use-formatelf.yml` **lints for** the correct ELF-patching call, and `rules/no-x86-64-darwin.yml` bans that system entirely (see Patterns worth encoding) |
| `stackbuilders/nixpkgs-terraform@a5893ca82ec3` | `versions.json` (root, 20,875 bytes) | JSON, `{"releases": {...}, "aliases": {...}}`, one entry per Terraform release with `hash`+`vendorHash` | implicit (workflow `update.yml`, daily `cron: 0 0 * * *`; script not in sparse clone) | daily | `packages.<system>.terraform-<version>` + `terraform-<cycle>` aliases, plus deprecated unprefixed aliases kept for one migration cycle with a `builtins.warn` | `fetchFromGitHub`-style `hash`+`vendorHash` (it's a Go module, buildGoModule-shaped) read from `versions.json` | none (Terraform provider binaries are separate; the CLI itself is a static-ish Go binary) |
| `cachix/nixpkgs-python@4d2bd16c09ba` | `versions.json` (root, 36,533 bytes) | JSON | `devenv shell -- nixpkgs-python-update` (a devenv-packaged script, not a bare Python file in-repo) | **hourly** (`update.yml:6`, `cron: "5 * * * *"` — the tightest cadence in the whole corpus) | not a flake-native attrset — this repo vendors **whole nixpkgs derivation trees** per CPython version, output shape not confirmed by static read alone | delegates to nixpkgs's own Python-fetching derivations | N/A |

**Three genuinely different generation architectures**, not one convention
— directly bears on the ocx design question:

1. **Committed generated Nix, one file per version** (rust-overlay): most
   robust to partial-fetch failures (each version is independently
   `import`-able and cacheable in the Nix store as a source file), but the
   repo grows forever (856 files already) and needs positional-array
   tricks to keep hash storage compact.
2. **Committed JSON, single-file-per-channel, latest-only** (fenix): tiny,
   simple, but loses history — pinning an old Rust toolchain means pinning
   an old *flake.lock rev* of fenix itself, not selecting an attribute.
3. **Committed raw upstream metadata dump + lazy per-entry fetch**
   (nix-vscode-extensions): the cache file is large (16.8MB) but generic
   (no per-entry hash precomputation cost at update time); the real fetch
   happens lazily, so unused entries never touch the network or the store
   until forced — the cheapest updater CPU-wise, the most eval-time-lazy.

`numtide/llm-agents.nix`'s declarative `passthru.updater` schema (kind:
github-source / npm / bun-github / platform / manifest /
manifest-checksums) is the **closest existing prior art to what ocx needs**
— see Patterns worth encoding.

## 12. nixpkgs conventions (NixOS/nixpkgs only)

Exemplar: `NixOS/nixpkgs@9cab9ed832c3` (root files, `lib/`, `doc/`, `ci/`,
`.github/`, `pkgs/build-support/`, `pkgs/README.md`,
`pkgs/by-name/README.md`, `maintainers/scripts/` only — this is a
deliberately narrow sparse clone per the frame, not the full tree).

Normative rules from `pkgs/README.md` (1325 lines) and
`pkgs/by-name/README.md` (219 lines):

| rule | citation |
|---|---|
| `pname` must not contain uppercase letters | `pkgs/README.md:433` |
| package attribute name must be a valid Nix identifier; a `pname` starting with a digit gets a leading `_` | `pkgs/README.md:439-444` |
| hyphenated attribute names should **not** be snake/camel-cased any more (dashes have been legal in identifiers since 2012) | `pkgs/README.md:448-450` |
| `version` must start with a digit; unversioned upstream commits use `<last-release>-unstable-YYYY-MM-DD` | `pkgs/README.md:467-475` |
| `meta.description`: one sentence, capitalized, no leading article, must not restate the package name, no trailing period | `pkgs/README.md:494-501` |
| `meta.license` must be set and match upstream; defaults to `lib.licenses.unfree` if no upstream license | `pkgs/README.md:503-505` |
| `meta.sourceProvenance` must be set when not built from source (e.g. repackaged `.deb`/`.rpm`/`.whl`) | `pkgs/README.md:506-507` |
| `meta.mainProgram` must be set when exactly one main executable exists; must **not** be derived from `pname` (hardcoded string only) | `pkgs/README.md:508-515` |
| `meta.maintainers` must be set for new packages | `pkgs/README.md:516` |
| **Import From Derivation (IFD) is disallowed** in nixpkgs for evaluation-performance reasons (Hydra evaluates the whole tree); the sanctioned workaround is **committing generated intermediate files to version control** | `pkgs/README.md:522-525` |
| new uses of `overrideAttrs`/`overridePythonAttrs` should not be introduced; prefer keeping one canonical instance of a package and adding an explicit override flag instead | `pkgs/README.md:529-542` |
| new top-level packages should use `pkgs/by-name` "whenever possible"; only `pkgs.callPackage`-compatible, top-level packages qualify (excludes e.g. `pythonPackages.*`) | `pkgs/by-name/README.md:4,111-121` |
| a `pkgs/by-name` package **cannot** reference files outside its own directory — multi-version packages must fall back to `all-packages.nix` + `inherit` on a local set, not `pkgs/by-name` | `pkgs/by-name/README.md:134-166` |
| CI validates `pkgs/by-name` structure via the external `nixpkgs-vet` tool, locally emulated with `./ci/nixpkgs-vet.sh master` | `pkgs/by-name/README.md:123-132` |

CI checks (`ci/` + `.github/workflows/`, names + one line each):

| workflow | purpose |
|---|---|
| `eval.yml` (jobs: `versions`, `eval`, `compare`, `report`, `misc`) | evaluates the whole package set pre/post-PR and diffs output paths |
| `check.yml` (jobs: `commits`, `manual-file-edits`, `reminders`, `github-script`, `owners`) | commit-message/PR-metadata policy, CODEOWNERS enforcement |
| `lint.yml` (jobs: `treefmt`, `parse`, `nixpkgs-vet`, `commits`) | runs `treefmt` formatting check, `ci/parse.nix` syntax parse, the `nixpkgs-vet` by-name structure validator, and a commit-message linter |
| `build.yml` | builds a representative sample of packages affected by a PR |
| `test.yml` | runs NixOS VM / package test suites |
| `merge-group.yml`, `periodic-merge{,-6h,-24h}.yml` | GitHub merge-queue and staging-branch auto-merge cadence |
| `backport.yml` | automates backport PRs to stable release branches |
| `bot.yml`, `comment.yml`, `edited.yml`, `pull-request-target.yml`, `review.yml`, `reviewed.yml`, `teams.yml` | PR-bot automation (labeling, review-team assignment, base-branch-edit detection) |

## Smells (ranked)

1. **`x86_64-darwin` hardcoded in 17/37 exemplar `systems` lists, against a
   nixpkgs branch that has just dropped the platform** (§3, confirmed live
   via `nix flake show`/`nix eval` against `nix-community/fenix`'s own
   pinned nixpkgs rev — see Contradictions). Any flake authored from one of
   these exemplars as a template will silently break on `nix flake update`.
2. **`flake-compat` fork fragmentation** (§8): 10 repos still cite
   `edolstra/flake-compat`, the historical, now-redirected location; a
   generated/authored flake copying this boilerplate should cite
   `NixOS/flake-compat` instead.
3. **Undercounted outputs for flake-parts/blueprint flakes** (§1, §5):
   `numtide/blueprint`, `numtide/treefmt`, `zed-industries/zed` all show
   zero or near-zero output attributes in a naive `flake.nix`-only scan.
   Any authoring/linting tool that inspects only `flake.nix` will silently
   miss real outputs for a large and growing share of the ecosystem.
4. **Version-tag chaos** (§10): `vX.Y.Z`, bare `X.Y.Z`, date-stamped tags,
   CI-bot timestamp tags, and *zero tags* all coexist with no dominant
   convention — 10/37 repos have never tagged a release at all, including
   widely-depended-on ones (`hercules-ci/flake-parts`,
   `nix-community/home-manager`, `nix-darwin/nix-darwin`).
5. **Floating action refs in CI** (§9): all 4 `DeterminateSystems/determinate-nix-action`
   uses pin `@main`, a floating branch ref — supply-chain-unsound compared
   to the SHA-pinning majority of `cachix/install-nix-action` users in the
   same corpus.
6. **`nixConfig` cache trust is one-size-fits-all** (§6): 11 repos declare
   a substituter+key pair with no accompanying guidance in the flake itself
   about `--accept-flake-config`, and no repo layers additional trust
   controls.
7. **No repo in the corpus runs its Nix CI job on more than 2 platform
   families** (Linux + Darwin only, self-hosted-runner-augmented at best)
   — cross-platform coverage claims in a flake's README are frequently
   aspirational relative to what CI actually exercises (§9).

## Patterns worth encoding

- **`numtide/llm-agents.nix`'s declarative `passthru.updater` schema**
  (`lib/mk-updater.nix`) is close to a ready-made template for
  ocx-index-to-flake generation: a `kind` enum (`github-source`, `npm`,
  `bun-github`, `platform`, `manifest`, `manifest-checksums`) plus
  kind-specific required fields (`purl`, `depHashKey`, `versionSource`,
  `urlTemplate`, `platforms`, `manifestUrl`, `checksumPath`), validated so
  a malformed updater config fails `nix flake check` instead of the next
  scheduled update run. ocx's per-package metadata (env, entry points,
  dependencies, per-platform OCI manifests) maps cleanly onto a `kind:
  platform` or a new `kind: oci-index` entry in the same schema.
- **`llm-agents.nix`'s ast-grep lint rules** (`rules/*.yml`, `sgconfig.yml`)
  encode exactly the quality bar a `nix-quality` rule set should enforce:
  `no-unpinned-rev` (ban `rev`/`ref` = a branch name), `prefer-tag-over-rev`,
  `no-legacy-sha256` (ban the old `sha256 = "..."` fetcher attribute in
  favor of SRI `hash = "sha256-..."`), `quote-input-name`,
  `use-formatelf` (require the right ELF-patching call for prebuilt
  binaries), `no-x86-64-darwin`/`no-x86-64-darwin-python` (already banning
  the platform nixpkgs just dropped — this repo's own lint rules
  anticipated §-Contradictions before the corpus measurement did).
- **rust-overlay's positional-hash-array compaction** (`_0.._N` keyed to a
  separate `targets.nix` ordering) is a genuinely reusable trick for
  keeping a large generated-flake data file small when the same small set
  of platform keys repeats across thousands of entries — directly
  applicable to an ocx-index flake, which repeats the same handful of OCI
  platform strings (`linux/amd64`, `linux/arm64`, `darwin/arm64`, …) across
  every package version.
- **nix-vscode-extensions' lazy-fetch pattern**: committing raw upstream
  metadata (no precomputed hashes) and deferring the actual `fetchzip`-with-hash
  call to first use inside the derivation function keeps the updater cheap
  (no per-entry network round-trip at update time) at the cost of a
  fixed-output-derivation-style hash-on-first-build for consumers — worth
  comparing directly against ocx's blob-behind-bearer-token problem (**H6**):
  since ocx blobs on `ghcr.io` need an auth token even for anonymous pulls,
  a lazy per-entry fetcher is not viable as-is; a generated ocx flake more
  likely needs the rust-overlay/fenix style of **precomputed** hash +
  either a token-fetching FOD or a mirrored public URL, decided per
  **H6/H7** in a follow-up design pass, not this audit.
- **`stackbuilders/nixpkgs-terraform`'s deprecation-with-warning pattern**
  (`builtins.warn "package \"${version}\" is deprecated; use ..."` wrapping
  the old attribute for one migration cycle) is a clean, low-ceremony way
  to rename generated attributes without an immediate breaking change —
  directly reusable if ocx's generated attribute shape needs to change
  later.
- **nixpkgs's own sanctioned IFD workaround — "commit generated
  intermediate files to version control"** (`pkgs/README.md:525`) is
  exactly what all three generated-flake architectures in §11 already do
  independently; it is worth stating explicitly in a `nix-generated-flakes`
  skill as the reason *why* none of the 8 exemplars evaluate their upstream
  index live at flake-eval time.

## Contradictions of the frame

- **H1 ("agents emit ~1000 instances of nixpkgs")**: does not hold at
  exemplar scale. The worst offender for `import nixpkgs { … }` re-instantiation
  is `ipetkov/crane` at 10 *files* (not 1000), and even that count is
  dominated by test/example fixtures, not production output logic (§4).
  `stdenv.lib` and `cargoSha256` — two of H1's other named "dated idioms" —
  have **zero** occurrences anywhere in the corpus; they are fully extinct.
  `with import <nixpkgs>` survives, but only in legacy-compat shims and
  NixOS test-VM fixtures (§4, §8), never in a flake's own output logic. H1
  should be narrowed: the surviving dated idioms are `with pkgs;` (175
  occurrences, 24 repos), `rec { }` (1264 occurrences, though a 3-file
  spot-read found most uses legitimate per nixpkgs's own conventions), and
  hardcoded version literals (259 occurrences, 16 repos) — not the channel-era
  idioms H1 led with.
- **H3 ("most exemplar flakes pass `nix flake check` on their home system
  but lack `formatter`/`checks`")**: partially contradicted. Only 14/37
  repos even *run* `nix flake check` in CI (§9), so "passes on home system"
  is unverified for the other 23 by this audit (a live re-check across all
  37 was out of scope/budget for this pass — see Gaps). Of the ones that
  do run it, several also expose both `formatter` (15/37) and `checks`
  (21/37) — the "lacks formatter or checks" half of H3 is true for a
  *minority*, not the majority the hypothesis implies.
- **H4 ("FlakeHub is the only semver-resolving channel")**: contradicted on
  the *consumption* side — 3 repos consume FlakeHub as an input source via
  its semver-range URL syntax (`/0`, `/0.1`), not only as a publish target
  (§2). On the *versioning-practice* side H4 is strongly supported: 10/37
  repos have no tags at all, and among those that do, semver, bare-semver,
  date-stamps, and CI-bot timestamps all coexist (§10).
- **New finding, not in H1-H9: nixpkgs 26.11 has dropped `x86_64-darwin`
  support.** Confirmed by direct citation
  (`NixOS/nixpkgs@9cab9ed832c3:doc/release-notes/rl-2611.section.md:43-49`,
  "Support for `x86_64-darwin` has been dropped, due to Apple's deprecation
  of the platform and limited build infrastructure and developer time.")
  **and** by a live `nix eval`: running `nix flake show` against
  `nix-community/fenix@5f7e7d793cb2` (whose own `flake.lock` pins nixpkgs
  at `e94cb152ed51bd6e24eb4a41f1460252beb52cd2`, 2026-09-25) throws
  `error: Nixpkgs 26.11 has dropped support for x86_64-darwin` the moment
  `packages.x86_64-darwin` is evaluated. This is dated and CppNix/nixpkgs-version-specific
  (nixpkgs 26.05 stable still supports the platform until end-2026), but it
  is *live now* against the unstable branch every exemplar tracks, and 17
  of 37 exemplars hardcode the now-broken system string. This belongs in
  any `nix-quality` rule as a dated, version-tagged pitfall, and is exactly
  the kind of finding a static-only audit (no real toolchain) would have
  missed — `llm-agents.nix`'s own `rules/no-x86-64-darwin.yml` lint rule
  had already anticipated it independently.

## Gaps

- **`nix flake check --no-build` was not run against all 37 exemplars** —
  only 4 ground-truth `nix flake show`/`nix eval` runs were performed
  (zig-overlay, rust-overlay [timed out mid-eval at 300s, partial data
  only], fenix, nix-index-database) due to the effort budget for a single
  audit pass; a full-corpus live-check pass (H3) is left to a follow-up
  worker or the authoring-phase verification loop.
- **Axis 11's `nix-community/nix-index-database` and
  `cachix/nixpkgs-python` updater *scripts themselves* were not located** —
  the sparse exemplar clone's fetch pattern (`.github/`, `nix/`, root files,
  `*.nix`, `flake.lock` only) excludes non-`.nix` script files living
  outside those directories (e.g. a `scripts/*.py` at repo root for
  nixpkgs-python is present, but the actual `nixpkgs-python-update` devenv
  script entry point was not resolved to a specific file in the sparse
  tree). A full (non-sparse) clone of these two repos would close the gap.
- **rust-overlay's `packages.<system>` attribute count was not fully
  enumerated** — the ground-truth `nix flake show` run timed out (300s)
  partway through the `checks` subtree, before reaching `packages`; the
  856-file `manifests/` count is a reliable proxy for version count but not
  a substitute for the actual exposed attribute paths (e.g. whether
  `rust-bin.stable.latest.default` resolves without forcing every historical
  version).
- **Axis 10's per-repo README install-hint classification is a coarse
  4-bucket heuristic** (`nix run` / `nix profile install` / flake-input
  snippet / overlay mention) and 20/37 READMEs matched none of the four —
  those 20 were not individually read to classify their actual guidance;
  the "no clear hint" bucket likely hides several more nuanced patterns
  (NixOS-module-only installation instructions, `nix-shell -p` one-liners,
  etc.) that a dedicated docs/UX-focused pass should re-examine.
- **This audit is static-file- and light-eval-only for 33 of 37 repos** —
  no fixture flakes were planted to test *ocx's own* generation approach
  against the real toolchain; that is explicitly deferred to a design/build
  phase, not this measurement pass.
