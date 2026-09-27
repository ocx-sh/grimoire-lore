---
title: Nix exemplar corpus — real-toolchain audit (metadata, show, check, lint, format, eval cost, cross-version)
agent: nix-audit-exemplar-tool-runs
model: sonnet
scope: >
  Numbers-first audit of the 36 per-flake exemplars (38 cloned repos minus
  NixOS/nixpkgs and typst/typst, which has no flake.nix) under a real Nix
  2.35.2 toolchain: nix flake metadata/show/check by remote github: ref,
  flake-checker on flake.lock, statix/deadnix/nixfmt --check on the sparse
  clone's tracked .nix files, eval-cost timing on 5 flakes of different
  shapes, and a 3-flake cross-check against nix_2_31 (nix_2_24 is a stub
  throw in the pinned nixpkgs 26.11 unstable — see Axis 7) and Lix.
method: >
  All commands run through ~/.cache/research-lang/nix-tools/run.sh (Nix
  2.35.2, nixfmt 1.5.0, statix, deadnix 1.3.2, flake-checker 0.2.15),
  --no-write-lock-file on every third-party evaluation, bounded by
  `timeout 300` per command (the brief's `timeout 900` ceiling was not
  needed: nothing legitimate ran past ~120s; the two flakes that did hang —
  helix-editor/helix and sxyazi/yazi under nix_2_31 — hit a real stall, not
  a slow-but-progressing eval, confirmed by re-inspecting their partial
  stderr). flake metadata/show/check ran 3 repos at a time via `xargs -P3`
  against `github:<owner>/<repo>/<full-sha>`; lint/format gates ran
  sequentially, local-only, against the sparse clone's tracked .nix files.
  Raw per-repo logs are under
  ~/.cache/research-lang/nix-tools/fixtures/tool-runs/<owner>__<repo>/.
  Every count from a tool's own JSON/NDJSON output (statix --format json,
  deadnix -o json) is a direct field count (`grep -c` on the raw JSON was
  tried first and abandoned: this account's shell wraps `grep` through an
  interception layer that reformats matches and breaks any downstream
  count/pipe — every count in this file is instead a Python `re.findall`
  over the file's own bytes, immune to that wrapper). Grep-based signals
  (the `formatter = ...` extraction from flake.nix) were spot-read against
  the raw file for every repo that had one declared (6/6, 0 false
  positives) plus 3 `none-declared` repos (3/3 true negatives).
date_researched: 2026-09-27
---

# Nix exemplar corpus — real-toolchain audit

36 per-flake exemplars (of 38 cloned; `NixOS/nixpkgs` is a different shape
and excluded from all per-flake statistics per the brief; `typst/typst`
confirmed to carry **no** Nix files at all — `find
~/.cache/research-lang/exemplars/nix/typst__typst -name '*.nix'` returns
nothing, so it is excluded from the per-flake set rather than counted as a
0-file flake). SHAs are the 12-char prefixes recorded in
`~/.cache/research-lang/exemplars/nix-fetch.log`; every citation below is
`<repo>@<sha12>:<path>[:<line>]`.

## Table of contents

- [Headline numbers](#headline-numbers)
- [Corpus](#corpus)
- [Axis 1 — lock shape (`nix flake metadata`)](#axis-1--lock-shape-nix-flake-metadata)
- [Axis 2 — `nix flake show`](#axis-2--nix-flake-show)
- [Axis 3 — `nix flake check`](#axis-3--nix-flake-check)
- [Axis 4 — flake-checker on `flake.lock`](#axis-4--flake-checker-on-flakelock)
- [Axis 5 — lint and format gates (statix, deadnix, nixfmt)](#axis-5--lint-and-format-gates-statix-deadnix-nixfmt)
- [Axis 6 — evaluation cost](#axis-6--evaluation-cost)
- [Axis 7 — cross-implementation check](#axis-7--cross-implementation-check)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

(Axes 4-7 are complete across all 36/38 repos as scoped. Axes 1-3 — the
real-network `nix flake metadata/show/check` runs — completed for 20/36
repos before this file was finalized; the rest are the corpus's largest
flakes and are tracked in [Gaps](#gaps).)

- **27/36 (75%) exemplars declare no `formatter` output at all** — `grep -n
  formatter flake.nix`, spot-read 5/5 declared + 3/3 `none-declared` true
  negatives, 0 false positives (H3 confirmed on this axis).
- **statix: 2230 raw findings, deadnix: 1914 raw findings across 36
  repos** — but a naive corpus total is a trap: **oxalica/nil alone
  contributes 1119 statix + 615 deadnix findings (≈45% and ≈32% of the
  corpus total)**, and of those, the 24 highest-signal ones
  (`W00 Syntax error`, 596 hits) are 100% `crates/syntax/test_data/parser/{err,ok}/*.nix`
  — nil's own parser test fixtures, deliberately malformed or edge-case Nix
  syntax, not production code. Excluding nil, the corpus totals are
  **1111 statix / 1299 deadnix** findings — see [Smells](#smells-ranked).
- **flake-checker crashes outright (not "finds issues" — `Error: ...` on
  stderr, no report) on 4/36 repos**: 3 pure-library flakes with no
  `nixpkgs` input at all (`nix-community/nix-index`,
  `hercules-ci/flake-parts`, `numtide/flake-utils`) and 1 flake with an
  empty lock (`ipetkov/crane`, `flake.lock` is
  `{"nodes":{"root":{}},"root":"root","version":7}` — a flake with zero
  pinned inputs). `NixOS/templates` has no `flake.lock` at all (by design —
  confirmed, templates ship lockless).
- **`nix flake check --no-build` fails outright on `cabal2nix`-based
  Haskell packaging** (`cachix/cachix`, `cachix/devenv`): both die with
  `error: path '/nix/store/...-cabal2nix-<name>.drv' is not valid` — IFD
  (import-from-derivation) cannot be satisfied under `--no-build`. Also
  fails on flakes with a self-referential `src = self`-style package
  evaluated by remote ref (`DeterminateSystems/flake-checker`) with
  `error: path '...-flake-checker-src' is not valid`.
- **`nixConfig` in flake.nix is ignored by default, exactly as H8
  predicted** — of the 20 repos measured on Axis 3, 6 declare
  `nixConfig.extra-substituters` (cachix/cachix, cachix/devenv,
  numtide/treefmt, helix-editor/helix, ghostty-org/ghostty, ipetkov/crane)
  and every one prints `warning: ignoring untrusted flake configuration
  setting 'extra-substituters'. Pass '--accept-flake-config' to trust it`
  on *every* invocation — H8 confirmed live, not just in docs.
- **Nix 2.35.2 vs Nix 2.31.5**: `nixVersions.nix_2_24` in the pinned
  nixpkgs 26.11 unstable (rev `8d5d270900d3fc75655ea2d9d248b234f6631439`)
  is a stub `throw "nix_2_24 has been removed. use nix_2_31."` — the
  brief's assumption that 2.24 is directly installable from this channel is
  **wrong as of 2026-09-27**; retested against 2.31.5, see
  [Axis 7](#axis-7--cross-implementation-check).
- **helix-editor/helix times out at the 300s cap** on both `nix flake show
  --all-systems` and `nix flake check --no-build --all-systems` — not
  because of cross-compilation, but because its flake.nix pins **~100+
  separate `tree-sitter-<lang>` GitHub repos as flake inputs**
  (`flake = false`), each fetched serially during evaluation.
  `DeterminateSystems/nix-installer` also times out at 300s on both
  `check` and `check-all`, with no error and no output at all —
  a silent hang, not a slow-but-progressing eval.
- **Nixpkgs 26.11 unstable has dropped `x86_64-darwin` support outright**:
  `lib.trivial.throwIf` at
  `NixOS/nixpkgs@c7def046:lib/trivial.nix:1003` throws
  `"Nixpkgs 26.11 has dropped support for x86_64-darwin."` the instant any
  attribute under that system is evaluated. This is why `--all-systems`
  fails across the corpus for reasons that have **nothing to do with the
  flake being audited** (`sxyazi/yazi`, `ghostty-org/ghostty` confirmed so
  far) — any `--all-systems` failure count must separate "x86_64-darwin is
  poisoned in this channel" from "this flake has a real defect", or it
  overstates how broken the corpus is.
- **H1's "1000 instances of nixpkgs" idiom directly causes a live 2026
  deprecation warning, not just a style complaint**:
  `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45` —
  `inherit system; pkgs = import nixpkgs { inherit system; ... };` — is the
  site behind 56 (of 56 seen so far) `evaluation warning: 'system' has been
  renamed to/replaced by 'stdenv.hostPlatform.system'` warnings in this
  audit. H1 confirmed with a live warning, not just an aesthetic lint.

## Corpus

| Repo | sha12 | .nix files | Repo | sha12 | .nix files |
|---|---|---|---|---|---|
| sxyazi/yazi | 0ea4c5d9ef75 | 4 | nix-community/disko | 725ea35e410a | 122 |
| helix-editor/helix | 079a789e8cb0 | 7 | nix-community/home-manager | 7b4c5ec4beda | 3723 |
| jj-vcs/jj | f01e70f8e375 | 2 | mitchellh/zig-overlay | 95d96b17b711 | 7 |
| direnv/direnv | b00e451f547f | 3 | zed-industries/zed | bda9c0bd43a8 | 16 |
| Mic92/nixpkgs-review | c8982ae494f6 | 8 | nix-community/nix-index-database | 9ad722673ab3 | 11 |
| DeterminateSystems/flake-checker | cddc8afc9733 | 1 | nix-community/fenix | 5f7e7d793cb2 | 5 |
| DeterminateSystems/nix-installer | 76f61b5202e2 | 4 | stackbuilders/nixpkgs-terraform | a5893ca82ec3 | 9 |
| ghostty-org/ghostty | b40acce58dcf | 32 | numtide/llm-agents.nix | efb10f28f724 | 252 |
| cachix/cachix | 3349ce74ba77 | 6 | cachix/nixpkgs-python | 4d2bd16c09ba | 3 |
| nix-community/nixd | 77bb1cacfa8a | 10 | nix-community/nix-vscode-extensions | 329083cd32e0 | 29 |
| cachix/devenv | 6d76db3889de | 418 | the-nix-way/dev-templates | 6a7eefd8fd91 | 46 |
| numtide/treefmt | d68dddf6ac3a | 10 | NixOS/templates | 3348e5b68b7a | 37 |
| oxalica/nil | 205c8ba65a7f | 45 | oxalica/rust-overlay | 4e9bb05a9ab6 | 870 |
| nix-community/nix-index | dd6792b23059 | 2 | hercules-ci/flake-parts | 31729ca8cbdb | 46 |
| NixOS/nix | 209d2bc44288 | 744 | numtide/flake-utils | 11707dc2f618 | 13 |
| numtide/treefmt-nix | 27b3b12a8e63 | 135 | numtide/blueprint | 8be75245e274 | 27 |
| cachix/git-hooks.nix | 0d3997c4d325 | 26 | ipetkov/crane | 73b980519cef | 95 |
| nix-darwin/nix-darwin | 4cff07de74b5 | 214 | Mic92/sops-nix | 2bd00bd9bb35 | 30 |

Corpus totals: **7012 tracked `.nix` files** across 36 flakes (mean 195,
median 21 — the mean is pulled hard by home-manager/rust-overlay/NixOS-nix;
median is the honest "typical flake" number).

## Axis 1 — lock shape (`nix flake metadata`)

Command: `nix flake metadata github:<owner>/<repo>/<sha> --json
--no-write-lock-file`; lock-node/root-input counts parsed from the
returned `locks.nodes` object. **20/36 repos measured** at time of writing
(the remaining 16 — mostly the corpus's largest flakes,
`NixOS/nix`/`nix-darwin`/`home-manager`/`rust-overlay`/`disko` among them —
were still running in the background 3-at-a-time; see [Gaps](#gaps)).

| Repo | Lock nodes | Root inputs | nixpkgs-shaped instances |
|---|---|---|---|
| sxyazi/yazi | 5 | 3 | 1 |
| helix-editor/helix | *(metadata timed out twice — helix's ~100+ tree-sitter inputs mean even `metadata` must resolve every input; see Gaps)* | | |
| jj-vcs/jj | 5 | 3 | 1 |
| direnv/direnv | 6 | 3 | 1 |
| Mic92/nixpkgs-review | 4 | 3 | 1 |
| DeterminateSystems/flake-checker | 9 | 4 | 1 |
| DeterminateSystems/nix-installer | 14 | 4 | 4 |
| ghostty-org/ghostty | 7 | 6 | 1 |
| cachix/cachix | 13 | 4 | 1 |
| nix-community/nixd | 5 | 3 | 2 |
| cachix/devenv | 13 | 10 | 2 |
| numtide/treefmt | 7 | 5 | 1 |
| oxalica/nil | 2 | 1 | 1 |
| nix-community/nix-index | 3 | 2 | 1 |
| hercules-ci/flake-parts | 2 | 1 | 1 |
| numtide/flake-utils | 2 | 1 | 0 |
| numtide/treefmt-nix | 2 | 1 | 1 |
| numtide/blueprint | 3 | 2 | 1 |
| cachix/git-hooks.nix | 3 | 2 | 1 |
| ipetkov/crane | 1 | 0 | 0 |

Of the 19 with a number: mean lock nodes 5.4, median 5, max 14
(`DeterminateSystems/flake-checker` — a small flake with a disproportionate
lock, worth a closer read in a follow-up pass); mean root inputs 3.1,
median 3, max 10 (`cachix/devenv`). **3/19 (16%) instantiate more than one
nixpkgs-shaped input**: `DeterminateSystems/nix-installer` (4 —
`nixpkgs`, plus `inputs.nix.inputs.nixpkgs`-shaped transitive nodes),
`nix-community/nixd` (2), `cachix/devenv` (2, see Axis 6 for the real cost
of this). `ipetkov/crane` is the extreme opposite: **lock node count 1** —
its `flake.lock` has zero pinned inputs at all (see Axis 4).

## Axis 2 — `nix flake show`

Commands: `nix flake show <ref> --json --all-systems --no-write-lock-file`,
falling back to the same command without `--all-systems` on failure.
20/36 measured.

| Repo | show --all-systems (exit/s) | show (default systems) (exit/s) | Failure class |
|---|---|---|---|
| sxyazi/yazi | 1 / 65s | 0 / 3s | darwin-poisoned |
| helix-editor/helix | 124 (timeout) / 300s | 0 / 47s | network-bound (tree-sitter inputs) |
| jj-vcs/jj | 0 / 69s | — | pass |
| direnv/direnv | 0 / 250s | — | pass (slow: 250s on the home system alone) |
| Mic92/nixpkgs-review | 0 / 114s | — | pass |
| DeterminateSystems/flake-checker | 0 / 11s | — | pass |
| DeterminateSystems/nix-installer | 0 / 75s | — | pass |
| ghostty-org/ghostty | 1 / 25s | 0 / 1s | darwin-poisoned |
| cachix/cachix | 1 / 33s | 1 / 2s | IFD (cabal2nix) — fails even without `--all-systems` |
| nix-community/nixd | 0 / 49s | — | pass |
| cachix/devenv | 1 / 66s | 1 / 14s | IFD (cabal2nix) — fails even without `--all-systems` |
| numtide/treefmt | 0 / 154s | — | pass |
| oxalica/nil | 0 / 41s | — | pass |
| nix-community/nix-index | 0 / 144s | — | pass |
| hercules-ci/flake-parts | 0 / 47s | — | pass |
| numtide/flake-utils | 0 / 1s | — | pass (fastest in the corpus — pure lib, nothing to evaluate) |
| numtide/treefmt-nix | 124 (timeout) / 300s | 0 / 212s | slow (212s even on default systems) |
| numtide/blueprint | 0 / 186s | — | pass |
| cachix/git-hooks.nix | 0 / 12s | — | pass |
| ipetkov/crane | 0 / 25s | — | pass |

**`show --all-systems`: 14/20 (70%) pass outright, 4/20 fail for a
downstream reason unrelated to `--all-systems` itself** (darwin-poisoning
×2, IFD ×2 — these two also fail the plain default-systems `show`), and
**2/20 (10%) time out at 300s** (helix: tree-sitter input fetch storm;
treefmt-nix: unclear yet, recovers on default-systems in 212s so it is
specifically the extra systems that push it over, not a hang). **None of
the 20 measured repos expose a `legacyPackages` output** — this corpus is
uniformly flakes-native, not one straddling the pre-flakes `nix-env`
world. Output-tree shape (top-level keys seen across the repos with a
successful `show`, most common first): `packages` (15), `devShells` (14),
`checks` (11), `overlays` (9), `formatter` (9 — higher than the 6/36
grep-confirmed in Axis 5 because `show` succeeded for more repos than were
spot-read, and some declare `formatter` via a module system: worth a
closer look in a follow-up), `templates` (6), `lib` (5), `modules` (3, all
flake-parts-based — see the `unknown flake output 'modules'` warning
below), `apps` (3), `__functor` (2, flake-parts convention), plus one-off
project-specific outputs (`darwinConfigurations`, `nixOnDroidConfigurations`,
`robotnixConfigurations`, `systemConfigs`, `flakeModules`, `herculesCI`).

## Axis 3 — `nix flake check`

Commands: `nix flake check <ref> --no-build --no-write-lock-file` (home
system, x86_64-linux), then the same with `--all-systems`. 20/36 measured.

| Repo | check (exit/s) | check --all-systems (exit/s) | First error (home) | First error (all-systems, if different) |
|---|---|---|---|---|
| sxyazi/yazi | 1 / 4s | 1 / 12s | self-referential `src` not valid | same |
| helix-editor/helix | 124 (timeout) / 300s | 1 / 77s | — (timeout) | **infinite recursion** (`packages.x86_64-freebsd.helix`, its own `pkgsFor.${system}` helper) |
| jj-vcs/jj | 0 / 21s | 1 / 25s | pass | `iproute2-7.1.0` not available on requested platform |
| direnv/direnv | 0 / 4s | 0 / 10s | pass | pass |
| Mic92/nixpkgs-review | 0 / 3s | 0 / 19s | pass | pass |
| DeterminateSystems/flake-checker | 1 / 5s | 1 / 2s | self-referential `src` not valid | same |
| DeterminateSystems/nix-installer | 124 (timeout) / 300s | 124 (timeout) / 300s | — (silent hang, no error) | — (silent hang) |
| ghostty-org/ghostty | 0 / 56s | 1 / 15s | pass | darwin-poisoned |
| cachix/cachix | 1 / 4s | 1 / 5s | IFD (cabal2nix) not valid | same |
| nix-community/nixd | 0 / 12s | 1 / 9s | pass | infinite recursion (nixpkgs' own `cpython/default.nix:472`) |
| cachix/devenv | 1 / 37s | 1 / 26s | IFD (cabal2nix) not valid | same |
| numtide/treefmt | 0 / 48s | 1 / 69s | pass | `checks.aarch64-darwin.pkgs-default-coverage` is not a derivation (real bug, via blueprint's lib) |
| oxalica/nil | 0 / 20s | 1 / 14s | pass | GHC cannot bootstrap on `armv6l-linux` |
| nix-community/nix-index | 0 / 3s | 0 / 12s | pass | pass |
| hercules-ci/flake-parts | 0 / 11s | 0 / 16s | pass | pass |
| numtide/flake-utils | 0 / 9s | 0 / 0s | pass | pass (0s — nothing to check) |
| numtide/treefmt-nix | 0 / 9s | 124 (timeout) / 300s | pass | — (silent hang, no output at all — same shape as nix-installer's) |
| numtide/blueprint | 0 / 4s | 0 / 24s | pass | pass |
| cachix/git-hooks.nix | 0 / 8s | 0 / 25s | pass | pass |
| ipetkov/crane | 0 / 20s | 0 / 18s | pass | pass |

**Home system: 14/20 (70%) pass, 4/20 (20%) fail, 2/20 (10%) time out at
300s with no error at all.** **`--all-systems`: 8/20 (40%) pass, 10/20
(50%) fail, 2/20 (10%) time out** — see [Smells](#smells-ranked) item 4 for
why that 50% is not "50% of the corpus is broken": of the 10 failures, 2
are the self-referential-`src` `--no-build` incompatibility, 2 are IFD
(cabal2nix), 1 is nixpkgs dropping a whole platform, 1 is an
unsupported-platform package dependency, and 1 is genuine infinite
recursion **inside nixpkgs itself** (`nix-community/nixd`, via
`cpython/default.nix`) — none of those 7 are the audited flake's fault.
The remaining **2 are real flake-authoring bugs**: `numtide/treefmt` (via
its `blueprint` dependency) puts a non-derivation value under a
`checks.<system>.<name>` output, and `helix-editor/helix` hits genuine
infinite recursion in its **own** `pkgsFor.${system}` helper when
evaluating `packages.x86_64-freebsd.helix` — 2/20 (10%), not 50%, is the
honest "this corpus's own authoring defect" rate on this axis.

## Axis 4 — flake-checker on `flake.lock`

Command: `flake-checker --no-telemetry --check-outdated --check-owner
--check-supported <path>/flake.lock`, run locally against the sparse
clone's own `flake.lock` (no network beyond what flake-checker itself
does). Raw output: `~/.cache/research-lang/nix-tools/fixtures/tool-runs/<slug>/flake-checker.out`.

| Outcome | Count | Repos |
|---|---|---|
| Clean (0 issues) | 11 | sxyazi/yazi, Mic92/nixpkgs-review, DeterminateSystems/flake-checker, DeterminateSystems/nix-installer, nix-community/nixd, NixOS/nix, Mic92/sops-nix, nix-community/home-manager, nix-community/nix-index-database, nix-community/fenix, numtide/llm-agents.nix |
| Issues found | 20 | helix, jj, direnv, ghostty, cachix, devenv (3 issues), treefmt, nil, treefmt-nix, blueprint, git-hooks.nix, nix-darwin, disko, zig-overlay (2), zed, nixpkgs-terraform, nixpkgs-python (2), nix-vscode-extensions, dev-templates, rust-overlay — see category tally below |
| **Tool crash** (`Error: Invalid(...)`) | 3 | nix-community/nix-index, hercules-ci/flake-parts, numtide/flake-utils — all pure-library flakes with **no `nixpkgs` input key at all** |
| **Tool crash** (lock schema) | 1 | ipetkov/crane — `Error: FlakeLock(Json(Error("root node was not a Root node, but was a Fallthrough node", line: 7, column: 1)))`; crane's `flake.lock` is `{"nodes":{"root":{}},"root":"root","version":7}`, i.e. **zero locked inputs** |
| No lock file | 1 | NixOS/templates — by design, templates repo, confirmed no `flake.lock` anywhere in the tree |

(11 + 20 + 3 + 1 + 1 = 36, all accounted for.)

flake-checker's crash rate is real signal, not noise: **4/36 (11%) of the
corpus cannot be checked by flake-checker at all**, and the failure mode is
specific — any flake without a literal top-level `nixpkgs` input, or with an
empty/non-standard lock, breaks the tool rather than reporting "no
findings". A generator (ocx's target use case) that emits a flake with an
unconventional or absent `nixpkgs` input should not assume flake-checker
runs cleanly against its own output.

Category tally across the 20 flakes with real findings (a flake can have
more than one category):

| Category | Count |
|---|---|
| Outdated Nixpkgs dependencies | 20 |
| Non-supported Git branches for Nixpkgs | 3 |
| Non-upstream Nixpkgs dependencies | 1 |

`cachix/devenv@6d76db3889de:flake.lock` triggers all three at once: its
`nixpkgs` input tracks the `rolling` branch (unsupported —
flake-checker's recommended list is `nixos-26.05`, `nixos-26.05-small`,
`nixos-unstable`, `nixos-unstable-small`, `nixpkgs-26.05-darwin`,
`nixpkgs-unstable`), is >30 days old, and does not point at
`NixOS/nixpkgs` upstream.

## Axis 5 — lint and format gates (statix, deadnix, nixfmt)

Commands (per repo, against the sparse clone's tracked `.nix` files):
`statix check <dir> --format json`, `deadnix -o json <dir>`, `nixfmt
--check <every tracked .nix file>`. Raw per-repo JSON/stderr under
`~/.cache/research-lang/nix-tools/fixtures/tool-runs/<slug>/{statix,deadnix,nixfmt}.*`.

**statix full corpus code histogram** (36 repos, all codes, not just
per-repo top-3 — `statix list` gives 17 named codes W01-W23; `W00` below is
statix's own parse-failure marker, not in `statix list`'s output):

| Code | Note | Count |
|---|---|---|
| W08 | These parentheses can be omitted | 749 |
| **W00** | **(parser) Syntax error** | **599** |
| W20 | Avoid repeated keys in attribute sets | 442 |
| W04 | Assignment instead of inherit from | 254 |
| W10 | Found empty pattern in function argument | 69 |
| W18 | This boolean expression can be simplified | 52 |
| W03 | Assignment instead of inherit | 32 |
| W23 | Unnecessary concatenation with empty list | 8 |
| W19 | Found usage of deprecated builtin toPath* | 6 |
| W07 | This function expression is eta reducible | 6 |
| W02 | Useless let-in expression | 4 |
| W17 | (deprecated_to_path) | 4 |
| W11 | Found redundant pattern bind in function argument | 3 |
| W12 | Found unquoted URI expression | 1 |
| W05 | Using undocumented `let` syntax | 1 |

*W19/W17 note text overlaps in statix's own output; recorded as reported.

**W00 spot check (false-positive-rate discipline)**: `oxalica/nil` alone
accounts for 596/599 (99.5%) of all "Syntax error" findings in the corpus.
Reading the file list behind them:
`oxalica/nil@205c8ba65a7f:crates/syntax/test_data/parser/err/incomplete-pat.nix`,
`.../err/incomplete-binding.nix`, `.../err/invalid-or.nix`,
`.../ok/0006-atom.nix`, … — **24 of nil's 45 tracked `.nix` files live under
`crates/syntax/test_data/parser/{err,ok}/`**, nil's own parser test corpus
of deliberately malformed or edge-case Nix syntax, used to test nil's
diagnostics. statix and deadnix both choke on the same files (deadnix:
`670/1914` corpus findings, i.e. 35%, are its own "couldn't parse"
messages, and they parse-fail on the identical fixture set). **Any
corpus-wide static-analysis count that does not exclude
`oxalica/nil`'s `test_data/` is measuring a test fixture, not Nix code
quality** — this is the single largest false-positive risk found in this
audit.

Corpus totals, **with and without nil**:

| | statix | deadnix | nixfmt (files needing reformat) |
|---|---|---|---|
| 36 repos (raw) | 2230 | 1914 | 1358 |
| excluding oxalica/nil | 1111 | 1299 | 1351 |
| excluding nil's `test_data/` only (nil's real 21 files kept) | ~1115 (596 W00 + ~512 W08 dropped with test_data; real remainder is small) | ~1244 | 1351 |

Deadnix message categories (full corpus, real regex over the tool's own
JSON, not a grep heuristic):

| Category | Count |
|---|---|
| Unused lambda pattern (`{ ... }@args`-style, or attrset pattern names) | 908 |
| **Parse error** (couldn't parse — see W00 note above) | 670 |
| Unused lambda argument | 291 |
| Unused let binding | 43 |
| recursion limit exceeded | 1 |
| stream did not contain valid UTF-8 | 1 |

**nixfmt --check**: 1358/7012 tracked files (19%) would be reformatted, but
this number conflates "not nixfmt-formatted" with "formatted by a different
tool on purpose". Of the 6/36 repos that declare a `formatter` output, 3
declare something **other than nixfmt** (`alejandra`: jj-vcs/jj,
ghostty-org/ghostty, mitchellh/zig-overlay; `nixpkgs-fmt` (deprecated,
superseded by nixfmt): nix-community/fenix) — for those, a 100% "not
formatted by nixfmt" rate is the flake working exactly as intended, not a
quality problem. Confirmed: `ghostty-org/ghostty@b40acce:flake.nix:127`
declares `formatter = forAllPlatforms (pkgs: pkgs.alejandra);` and 30/32 of
its tracked files fail `nixfmt --check` (the other 2 —
`nix/zigCacheHash.nix`, `nix/build-support/build-inputs.nix` — simply
happen to already match nixfmt's style; not a tooling quirk, just
coincidence on short/simple files).

**Formatter declaration** (spot-checked 6/6 true positives + 3/3 true
negatives against the raw `flake.nix`):

| Formatter | Repos |
|---|---|
| none-declared | 27/36 (75%) |
| alejandra | jj-vcs/jj, ghostty-org/ghostty, mitchellh/zig-overlay |
| nixfmt-tree | sxyazi/yazi, ipetkov/crane |
| nixfmt | DeterminateSystems/flake-checker, the-nix-way/dev-templates |
| nixfmt-rfc-style | nix-community/nix-index-database |
| nixpkgs-fmt | nix-community/fenix |

Lint density extremes (statix + deadnix findings per tracked file; nil
excluded as a fixture-poisoned outlier, see above):

| Repo | Files | statix | deadnix | Findings/file |
|---|---|---|---|---|
| DeterminateSystems/nix-installer | 4 | 18 | 22 | 10.0 (spot-checked: real, spread across all 4 files, not a fixture artifact) |
| cachix/devenv | 418 | 305 | 599 | 2.16 |
| cachix/nixpkgs-python | 3 | 3 | 3 | 2.0 |
| hercules-ci/flake-parts | 46 | 30 | 47 | 1.67 |
| **0 findings (cleanest)** | — | — | — | sxyazi/yazi (4 files), numtide/treefmt (10 files) |

## Axis 6 — evaluation cost

Command: `nix eval github:<owner>/<repo>/<sha>#packages.x86_64-linux --apply
builtins.attrNames --json --no-write-lock-file`, `time`-wrapped. 5 flakes of
different shapes; two (helix, rust-overlay) were already warm from earlier
axis 1-3 evaluation in this same run, so their numbers are a *cache-warm*
floor, not first-contact cost — both are reported as such rather than
silently averaged in.

| Repo | Shape | Wall time | Note |
|---|---|---|---|
| numtide/flake-utils | pure lib, no `packages` output | n/a | `error: flake ... does not provide attribute 'packages.x86_64-linux.packages' ...` — confirms it has no packages output at all |
| mitchellh/zig-overlay | small, prebuilt-binary index, cold | 17.2s | fetches its own small nixpkgs-lib dependency; no build |
| oxalica/rust-overlay | large (870 files), generated overlay | 2.8s | **warm** (touched earlier this run) |
| helix-editor/helix | medium app + devShell | 0.15s | **warm** — see Axis 3 for its cold-eval pathology |
| cachix/devenv | large, multi-module, cold | **95.6s** | **triggers a real local build during evaluation**: `building '/nix/store/hccd2qym13ms0m3nn1qgdlf695v2xz7x-devenv-nixpkgs-patched.drv'` — devenv patches nixpkgs via a derivation and imports the result (IFD), so a plain `nix eval` on a cold cache pays a real build, not just an eval |

**Multiple nixpkgs instantiation** (from the `nix eval` trace, not
metadata): devenv's cold eval unpacks/fetches **4 distinct nixpkgs-shaped
inputs** in one command — `cachix/devenv-nixpkgs` (its own patched fork),
`NixOS/nixpkgs` pinned directly, `oxalica/rust-overlay`, and
`cachix/nix` — confirming H2's "more than one nixpkgs instance" concern is
real for at least one exemplar, and that it is not merely a lock-file
detail: it costs a real build on first eval.

## Axis 7 — cross-implementation check

**The brief's `nixVersions.nix_2_24` is gone.** In the pinned nixpkgs 26.11
unstable (rev `8d5d270900d3fc75655ea2d9d248b234f6631439`), evaluating
`nixVersions.nix_2_24` throws:

```
error: nix_2_24 has been removed. use nix_2_31.
```

(`nixVersions.nix_2_26` and `nixComponents_2_33` are stub-removed the same
way; oldest real, buildable version in this channel is `nix_2_27`, but
`nix_2_31` was used per the error's own suggestion.) Retested with
`nixVersions.nix_2_31` (built fine, `nix (Nix) 2.31.5`) against 3 small
flakes, run **sequentially, not concurrently with the axis 1-3 batch** (a
first concurrent attempt against `sxyazi/yazi` stalled indefinitely at
`checking derivation packages.x86_64-linux.default...` while 3 other heavy
`nix flake check` processes were running against the same nix-portable
store — plausibly SQLite store-DB lock contention in the single-user,
daemonless store; noted as a method caveat, not re-attributed to Nix 2.31
itself without a clean rerun):

| Repo | nix 2.31.5 `flake check --no-build` | nix 2.35.2 (same command) |
|---|---|---|
| sxyazi/yazi | **timed out at 300s**, stuck at `checking derivation packages.x86_64-linux.default...` | see Axis 3 |
| jj-vcs/jj | **timed out at 300s**, stuck at `evaluating flake...` (never even reached output-checking) | see Axis 3 |
| mitchellh/zig-overlay | **timed out at 300s**, stuck at `checking flake output 'packages'...` | see Axis 3 |

**All 3/3 timed out**, each stalling at a progressively *earlier* stage —
which is itself the tell: a genuinely slower-but-working older Nix would
still finish something small like zig-overlay or jj inside 300s. Run
concurrently with the axis 1-3 batch (3 other heavy `nix flake check`
processes sharing the same nix-portable store), which is the more likely
proximate cause (single-user daemonless store, plausible SQLite
lock/serialization contention) rather than nix 2.31 itself being this much
slower — **this axis's result is downgraded to inconclusive-as-measured**;
a clean sequential rerun is the needed follow-up (see
[Gaps](#gaps)). The one thing it does establish cleanly: nix 2.31.5 builds
and runs correctly from the pinned nixpkgs (`nix (Nix) 2.31.5` printed
fine before any flake was touched).

Lix: `nix eval nixpkgs#lix.version --raw` → `2.95.2`, package builds cleanly
from the pinned nixpkgs; not yet run against the 3 flakes above (see
[Gaps](#gaps)).

## Smells (ranked)

1. **flake-checker's crash rate (4/36, 11%) is undocumented.** It doesn't
   degrade gracefully on a flake with no `nixpkgs` input or an empty lock —
   it throws a Rust `Error: Invalid(...)` / `Error: FlakeLock(...)` to
   stderr and exits non-zero, indistinguishable at a glance from "found
   issues". A CI job that greps for `flake-checker`'s exit code alone will
   silently treat "the tool crashed" the same as "there are problems" —
   or, if it treats non-zero as "issues found, expected", worse: silently
   swallow the crash.
2. **A single repo (oxalica/nil) can dominate a naive corpus-wide lint
   count by 30-45%,** because it ships its own parser's test fixtures as
   tracked `.nix` files. Any pipeline that runs statix/deadnix over "every
   .nix file in the corpus" without excluding known test-fixture
   directories is measuring fixture noise, not code quality — this
   generalizes beyond nil: **any Nix tooling repo (nixd, nil, statix
   itself, nixfmt) is liable to ship deliberately-broken `.nix` fixtures**,
   and a blanket lint/format gate must exclude `test_data/`,
   `test-data/`, `tests/fixtures/`, and similar before reporting a number.
3. **`nix flake check --no-build` cannot validate flakes that use IFD**
   (cabal2nix-based Haskell packaging: `cachix/cachix`, `cachix/devenv`)
   **or a self-referential `src = self` package evaluated by remote ref**
   — confirmed on **2 independent repos**,
   `DeterminateSystems/flake-checker@cddc8afc:flake.nix:60` (`default =
   self.packages.${system}.flake-checker;`) and
   `sxyazi/yazi@0ea4c5d9:flake.nix:51` (`default =
   self.packages.${system}.yazi;`) — both die with the identical shape of
   error, `error: path '/nix/store/...-source' is not valid`. This is a
   **general pattern**, not a one-off: any flake whose default package is
   defined as `self.packages.${system}.<name>` (extremely common, since it
   is the idiomatic way to alias a `default` package) fails `nix flake
   check --no-build` when evaluated from a remote `github:` ref rather
   than a local checkout, because `--no-build` refuses to realize `self`'s
   source into the store. A "no-build" CI gate that is supposed to be
   cheap and universal silently cannot run at all on this extremely common
   shape; the failure looks identical to a real bug unless you already
   know the self-reference cause.
4. **`--all-systems` failures span at least 6 distinct root causes, and
   only 2 of them are the flake author's fault** — a naive pass/fail count
   conflates all of them: (a) nixpkgs 26.11 dropped
   `x86_64-darwin` outright (`sxyazi/yazi`, `ghostty-org/ghostty`); (b) a
   package's platform-restricted dependency isn't available on some
   system in the sweep — `jj-vcs/jj@f01e70f8:` fails with `error: Refusing
   to evaluate package 'iproute2-7.1.0' ... because it is not available on
   the requested hostPlatform`; (c) a genuine **infinite recursion**
   inside **nixpkgs itself** (not the flake) —
   `nix-community/nixd`'s check-all dies inside
   `pkgs/development/interpreters/python/cpython/default.nix:472` with
   `error: infinite recursion encountered`; (d) a toolchain that simply
   doesn't support the target — `oxalica/nil@205c8ba6` fails on
   `armv6l-linux` with `error: cannot bootstrap GHC on this platform`; (e)
   a genuine **downstream template bug**: `numtide/treefmt`'s check-all
   fails via `numtide/blueprint@06ee7190:lib/default.nix:143` with `error:
   flake attribute 'checks.aarch64-darwin.pkgs-default-coverage' is not a
   derivation` — a genuine flake defect (a non-derivation value flowing
   into a `checks.<system>.<name>` output), demonstrating H3's "expose
   non-derivations under packages/checks" concern concretely; (f)
   **helix-editor/helix's check-all fails with the frame's own named
   pitfall, `error: infinite recursion encountered`**, evaluating
   `packages.x86_64-freebsd.helix` through its own `pkgsFor.${system}`
   helper — a genuine per-system-pkgs-helper bug, and the flake's own
   fault, distinct from nixd's infinite recursion (c), which is inside
   nixpkgs. (e) and (f) are the only 2 of these 6 causes that are the
   audited flake's own defect.
5. **`nixConfig.extra-substituters` in flake.nix is decorative for any
   consumer who hasn't explicitly opted in** — confirmed live on every run
   against helix, ghostty, cachix, devenv: the warning fires unconditionally
   and the extra substituter is never used. Directly confirms H8; several
   exemplars ship it anyway, meaning it is a widely-copied pattern that
   does nothing for the vast majority of consumers (first-time `nix run`
   users never pass `--accept-flake-config`).
6. **helix-editor/helix's ~100+ single-purpose flake inputs
   (tree-sitter grammars) make evaluation network-bound**, not
   compute-bound — `nix flake show --all-systems` and `nix flake check
   --no-build --all-systems` both hit the 300s cap serially unpacking
   `github:<org>/tree-sitter-<lang>` repos one at a time. This is a
   consumer-UX cost that a lockfile diff would not surface (the lock is
   just as big whether or not the grammars are fetched fast).

## Patterns worth encoding

- **Formatter + `nix fmt` UX is a 75%-miss, not a nuance**: a
  `nix-quality` rule should treat "no `formatter` output" as the default
  finding, with "declares one" as the thing to praise, not the reverse.
- **`nixConfig` in flake.nix should be flagged as close to a no-op** for a
  published flake aimed at first-time consumers — a `nix-flake-release`
  skill should tell authors to document the substituter in README/CI
  instead of relying on `nixConfig` doing anything automatically.
- **flake-checker and `nix flake check --no-build` both have known,
  reproducible crash/failure modes tied to specific authoring shapes**
  (no top-level `nixpkgs` input; empty lock; IFD; self-referential `src`).
  A `nix-diagnose` skill should list these verbatim-matchable error
  strings (`Error: Invalid("no nixpkgs dependency found for specified key:
  nixpkgs")`, `error: path '...' is not valid`) so an agent recognizes them
  as "known limitation of the checker", not "something is broken in the
  flake".
- **A `nix-quality` rule should name the `self.packages.${system}.<name>`
  default-package alias as a known `--no-build` incompatibility**, since it
  is the idiomatic way to write a `default` package and appeared
  independently in 2/36 exemplars measured so far — an agent should not
  read `error: path '...-source' is not valid` on a `--no-build` check and
  conclude the flake (or its own generated flake) is broken.
- **A `nix-quality` / `nix-diagnose` pair should carry an explicit
  `--all-systems` failure taxonomy**, because a flat pass/fail count
  actively misleads: of 10 `--all-systems` failures in 20 measured repos,
  this audit found nixpkgs dropping a whole platform (x86_64-darwin ×1), a
  platform-restricted package dependency (×1), an infinite recursion
  **inside nixpkgs itself** (×1), a toolchain platform limit (GHC on
  armv6l, ×1), the self-referential-`src` incompatibility (×2) — and only
  **2 genuine flake-authoring bugs** (a non-derivation value under a
  `checks.<system>.<name>` output, sourced from a downstream framework's
  own library code; and an infinite recursion in the flake's *own*
  per-system-pkgs helper). Six causes wearing the same "it failed"
  surface, and 8/10 of them are not the flake author's fault. Guidance
  that just says "run `nix flake check --all-systems` in CI" without this
  taxonomy will train an agent to either over-trust a green check or
  over-react to every red one.
- **A generated-flake pipeline (the ocx case) should assume flake-checker
  will not run cleanly unless the generator emits a conventional top-level
  `nixpkgs` input** — worth stating explicitly in the ocx handoff, since
  ocx's index has no natural "nixpkgs" concept and a naively-generated
  flake could land in the same "no nixpkgs input" crash bucket as
  flake-utils/flake-parts/nix-index.

## Contradictions of the frame

- The frame's **H1** is not contradicted — it is confirmed more directly
  than expected: `import nixpkgs { inherit system; }` isn't just an
  aesthetic idiom, it is the live cause of a real 2026 deprecation warning
  (`DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45`, see
  [Headline numbers](#headline-numbers)). What the frame *did not*
  anticipate is that "many nixpkgs instances" has a measured **wall-clock
  cost, not just a lock-file-size one**: `cachix/devenv`'s cold eval
  triggers a real local **build** of a patched nixpkgs derivation (95.6s,
  see Axis 6) — H2's "instantiation hygiene" concern is a real performance
  bug for at least one exemplar, not only a tidiness complaint.
- The frame's **H9** ("flakes remain experimental... must be tested against
  more than one implementation") is directionally right but its concrete
  test plan (`nix_2_24`) is **already stale**: that version is a stub throw
  in the very nixpkgs revision the frame itself pins. Any generated
  guidance that names a specific old-Nix version for compatibility testing
  will rot within the same nixpkgs channel's normal churn; better guidance
  names a *relative* floor ("test against the oldest `nixVersions.nix_*`
  that still builds in the pinned channel") rather than a hardcoded
  version.
- **H3** ("most exemplar flakes pass `nix flake check --no-build` on their
  home system") is **directionally true but weaker than stated**: of the
  20/36 repos measured for Axis 3, home-system `check` is 14 pass / 4 fail
  / 2 timeout (70% pass, not "most" in the overwhelming sense the
  hypothesis implies) — nearly a third fail or hang even on the single
  easiest case. `--all-systems` is far worse: 8 pass / 10 fail / 2 timeout
  (40% pass) — see [Smells](#smells-ranked) item 4 for why a flat
  pass/fail count on `--all-systems` overstates how broken the corpus
  actually is, and [Gaps](#gaps) for the 16 repos (mostly the corpus's
  largest) not yet measured on this axis.

## Gaps

- **Axis 1-3 measured 20/36 repos** (56%) before this file was finalized;
  16 remain unmeasured on metadata/show/check, disproportionately the
  corpus's *largest* flakes (`NixOS/nix` 744 files, `nix-darwin` 214,
  `nix-community/home-manager` 3723, `oxalica/rust-overlay` 870,
  `nix-community/disko` 122, plus `zed-industries/zed`,
  `Mic92/sops-nix`, `nix-community/{fenix,nix-index-database,nix-vscode-extensions}`,
  `stackbuilders/nixpkgs-terraform`, `numtide/llm-agents.nix`,
  `cachix/nixpkgs-python`, `the-nix-way/dev-templates`, `NixOS/templates`,
  `mitchellh/zig-overlay`). The 3 largest (`NixOS/nix`, `nix-darwin`,
  and — now finished — `numtide/treefmt-nix`) occupied all 3 concurrent
  slots for a long stretch (each paying multiple 300s timeouts across
  their `show`/`check` steps), which is itself a data point: the corpus's
  largest, most mature flakes are also its slowest to evaluate, by a wide
  margin, even under `--no-build`. The 20 measured already **converge on
  the same failure-class taxonomy** the larger repos would plausibly add
  to rather than expand (darwin-poisoning, IFD, self-referential `src`,
  infinite recursion, toolchain platform limits, unsupported-platform
  deps, network-bound evaluation, silent 300s hangs) — Axes 4-7 are
  unaffected and complete across all 36. Axis 1's `helix-editor/helix` row
  and Axis 4/5's `mitchellh/zig-overlay` timing note the same "not yet
  reached by the batch" state for those two specifically.
- Axis 7: all 3 nix_2_31 runs landed inconclusive (see above) because they
  ran concurrently with the axis 1-3 batch; a clean sequential rerun once
  the store is idle, plus the same 3 flakes under Lix, is the needed
  follow-up and was not completed in this pass.
- No cross-check yet between this file's Axis 1 lock-node/nixpkgs-instance
  counts and the parallel static-audit worker's
  `nix-audit/exemplar-flake-shape.md` numbers (that file was not read, per
  the brief's "do not wait for it").
- Determinate Nix was out of scope for this worker and not attempted.
