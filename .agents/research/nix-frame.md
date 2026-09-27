---
title: Nix and flakes (language, packaging, flake authoring, versioning, publishing, generated flakes) — phase 0 frame
program: nix
date: 2026-09-27
method: research-lang (one language and its package/flake ecosystem; publishing flakes at a high quality bar; generating flakes from an external package index for ocx)
status: active
branch: nix worktree (/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix) — research lands on branch `nix`, not `main`
---

# Nix — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The brief

"nix (https://nixos.org/). Especially best practices and how to author,
maintain, version and publish flakes, incl. great UX, common pitfalls and so
forth. We should be able to release nix flakes after with high quality
standard and maintain them. In the context of ocx we probably want to be able
to generate flakes from indexes as well."

Read as: the seed is *flake authoring, maintenance, versioning, publishing,
consumer UX, pitfalls*, plus one concrete product question (ocx index →
generated flake). The scout wave decides what else belongs.

## The domain and its era

- **The language**: laziness, attrsets, `rec` and `let`, `with`, `inherit`,
  string context, paths vs strings, `import`, IFD, `builtins.*`, `lib.*`,
  fixed points and overlays, the module system (`options`, `config`,
  `mkIf`, `mkMerge`, `mkDefault`, types).
- **Packaging**: `stdenv.mkDerivation` (phases, `finalAttrs`),
  `callPackage`, `pkgs/by-name`, fetchers and fixed-output hashes, language
  builders (Rust: `rustPlatform.buildRustPackage`, crane, naersk; Go:
  `buildGoModule`; Python: `buildPythonApplication`, uv2nix, pyproject.nix),
  `meta` (`mainProgram`, `license`, `platforms`), cross, prebuilt binaries
  (`autoPatchelfHook`, nix-ld).
- **Flakes**: schema of outputs, `inputs` and `follows`, `flake.lock`,
  systems handling (flake-utils, flake-parts, nix-systems, hand-rolled),
  `self` and source filtering, `nixConfig`, `formatter`, `checks`,
  `devShells`, `overlays`, `nixosModules`, `templates`, `apps`.
- **Toolchain and gates**: `nix flake check|show|metadata|update|lock`,
  nixfmt (RFC 166), statix, deadnix, nixd/nil, flake-checker, treefmt,
  git-hooks.nix, `nix-update`, `nurl`.
- **Publishing and distribution**: git tags, FlakeHub (semver flakes),
  binary caches (cache.nixos.org, Cachix, FlakeHub Cache, attic, self-hosted),
  CI installers (`DeterminateSystems/nix-installer-action`,
  `cachix/install-nix-action`), `update-flake-lock`, upstreaming into
  nixpkgs, NUR.
- **Implementations**: CppNix (NixOS/nix), Lix, Determinate Nix — flakes
  behave differently across them (lazy trees, flake schemas).

Era **measured 2026-09-27**, not assumed (the recent-shifts scout re-checks):
`nixVersions.latest` in nixpkgs is **Nix 2.35.2**; the `nixpkgs` registry
entry resolves to nixpkgs **26.11** unstable
(rev `8d5d270900d3fc75655ea2d9d248b234f6631439`); nixfmt 1.5.0, deadnix
1.3.2, flake-checker 0.2.15, nixd 2.9.2 (all from that rev).

## The codebases that will adopt the output

**The fleet has no Nix code** (measured 2026-09-27: `find /home/mherwig/dev
-maxdepth 6 -name '*.nix' -o -name flake.lock`, pruning `.git`,
`node_modules`, `target`, `.worktrees`, `.agents/worktrees`, `.tmp-*`,
`.probe-*`, returns nothing; no `nix` binary on the host). So:

1. **Future fleet flakes** — the fleet's Rust CLIs (`ocx`, `grimoire`/`grim`),
   the Python SDK (`ocx-sdk-python`), and GitHub Actions (`setup-ocx`) are the
   first candidates to ship `flake.nix` so `nix run github:ocx-sh/ocx` works.
   The Rust `cli-contract` and release material already in the catalog is the
   contract reference; a flake wraps it, it does not redefine it.
2. **A flake generated from the ocx index** — `index.ocx.sh` serves
   `/p/<ns>/<pkg>.json` (tags → content digest) and
   `/p/<ns>/<pkg>/o/sha256/<hex>.json` (the OCI image index verbatim:
   per-platform manifests, `artifactType: application/vnd.sh.ocx.package.v1`).
   The local checkout `/home/mherwig/dev/index` holds 125 packages across 98
   namespaces and 2011 stored image indexes; blobs live at
   `ghcr.io/ocx-contrib/<ns>/<pkg>`. Package metadata (env, entry points,
   dependencies) is specified in `ocx/website/src/docs/reference/metadata.md`.
   ocx today touches Nix only in its FAQ (NixOS needs nix-ld for libc
   detection).
3. **The exemplar corpus** stands in for grounding: 38 repositories fetched
   2026-09-27 as blob-less depth-1 sparse clones (Nix files, locks, CI, root
   files; nixpkgs narrower) under `~/.cache/research-lang/exemplars/nix/<owner>__<repo>`,
   1.1 GB. Recreate with `nix-audit/scratch/fetch-exemplars.sh <dir>`; SHAs in
   `~/.cache/research-lang/exemplars/nix-fetch.log`. Categories: app flakes
   (helix, jj, ghostty, zed, typst, yazi, direnv, nixpkgs-review,
   nix-installer, flake-checker, devenv, cachix, NixOS/nix, nixd, treefmt,
   nil, nix-index); library/framework/module flakes (flake-parts,
   flake-utils, treefmt-nix, blueprint, git-hooks.nix, crane, home-manager,
   nix-darwin, disko, sops-nix); **generated/index-driven flakes** (zig-overlay,
   rust-overlay, fenix, nix-index-database, nix-vscode-extensions,
   llm-agents.nix, nixpkgs-terraform, nixpkgs-python); templates
   (NixOS/templates, dev-templates); nixpkgs (conventions, lib, docs, CI).
   Already a finding: `typst/typst` at 2026-09-23 has **no** Nix files — it
   dropped its flake.
4. **A measurement toolchain** exists on disk, rootless:
   `~/.cache/research-lang/nix-tools/run.sh <cmd>` runs any command inside
   nix-portable (bwrap) with a pinned toolchain flake
   (`nix-tools/toolchain/flake.nix`) on PATH: Nix 2.35.2, nixfmt, statix,
   deadnix, nixd, nil, flake-checker, nix-update, nurl, nix-prefetch-git,
   nix-tree, nix-diff, treefmt, skopeo, git, jq. Sandboxed builds work
   (`sandbox = true`), substituter is cache.nixos.org, experimental features
   `nix-command flakes fetch-tree`. The store lives under
   `~/.cache/research-lang/nix-tools/.nix-portable/` (disk, never `/tmp`).
   Verification commands can therefore be **run** against planted fixture
   flakes, not only read. Fixtures live under
   `~/.cache/research-lang/nix-tools/fixtures/<slug>/`.

## Existing AI config that already touches this domain

None in the catalog (to be confirmed by the inventory audit). Adjacent sets a
Nix topic must not duplicate: `bazel-quality` (hermeticity, remote caching —
the closest conceptual sibling), the Rust/Go/Python release and packaging
material (a flake packages those; it does not restate them), `docs-quality`.

## Orchestrator's hypotheses (to test, not to assume)

- **H1** Agents emit dated idioms: `flake-utils.lib.eachDefaultSystem`
  everywhere, `import nixpkgs { inherit system; }` per output (the "1000
  instances of nixpkgs" problem), `with pkgs;` blocks, `rec` attrsets,
  `cargoSha256`, `nixpkgs-fmt`/`nixfmt-rfc-style` naming, `stdenv.lib`,
  `mkShell { buildInputs }`, `builtins.currentSystem`, unpinned
  `fetchTarball`, `nix-env -i`, channels.
- **H2** Input hygiene (`follows`, number of nixpkgs instances, lock churn,
  `flake = false`) is the largest flake-UX surface for consumers.
- **H3** Most exemplar flakes pass `nix flake check --no-build` on their home
  system but expose non-derivations under `packages`, lack `formatter` or
  `checks`, or fail on another system.
- **H4** Flake versioning is ad hoc: git tags without semver meaning for
  consumers, `version = self.shortRev or "dirty"`, and FlakeHub is the only
  semver-resolving channel.
- **H5** Generated flakes (zig-overlay, rust-overlay, nix-index-database) use
  a committed data file (JSON or generated Nix) plus a small reader plus a
  scheduled CI updater — the template for an ocx-index flake.
- **H6** ghcr.io serves blobs only behind a bearer token, even anonymously, so
  a plain `fetchurl` cannot fetch an ocx package layer; a generator needs a
  token-fetching fixed-output derivation, a public mirror URL, or a
  different fetcher.
- **H7** Upstream release binaries (what ocx mirrors) need
  `autoPatchelfHook` on Linux and nothing on Darwin; static builds need
  nothing; ocx's `os.features` libc detection maps onto that choice.
- **H8** `nixConfig` (extra substituters, trusted keys) in `flake.nix` is a
  UX and security trap: ignored for untrusted users, prompts on
  `accept-flake-config`, and invites cache-poisoning trust.
- **H9** Flakes remain "experimental" in CppNix 2.35 while Lix and
  Determinate Nix diverge (lazy trees, schemas), so a published flake must
  be tested against more than one implementation.

## Artifact set (what this program must converge to)

Hypothesis, revised by the map:

| Artifact | Kind | Glob / trigger | Owns |
|---|---|---|---|
| `nix-quality` | rule (index + depth dir) | `**/*.nix`, `**/flake.lock` | language pitfalls, packaging, flake structure, inputs, devShells, modules, gates |
| `nix-flake-release` | skill | release/publish/version a flake | tag, lock policy, check matrix, FlakeHub/cache publish, deprecation |
| `nix-diagnose` | skill | eval/build failure triage | infinite recursion, hash mismatch, untracked-file, IFD, follows diamonds |
| `nix-generated-flakes` | depth file or skill | generate a flake from an external index | data file + reader + updater; OCI blob fetching; the ocx case |
| `nix-essentials` | bundle | — | untagged members |
| ocx handoff | research artifact | — | design position for ocx-index → flake generation, for an ocx ADR |

## Wave plan (sizing)

A language plus its ecosystem and tooling: 3 grounding workers, 6 scouts
(the five corpora plus a generated-flake prior-art corpus), 1 map, then dive
waves of at most 9–10 agents each (session guideline), consolidations on the
strongest tier, a harvest after every wave. Authoring and review follow the
Go program's shape, sized down. Budget ceiling: ~15M subagent tokens across
the program; stop earlier on convergence.

## Corrections (appended after wave 1, from the map, 2026-09-27)

- H1 narrowed: stdenv.lib and cargoSha256 occur 0 times in 37 repos; surviving dated idioms are with pkgs; (175), rec { (1,264, mostly legitimate) and hardcoded versions (259) [shape §4]
- H1 '1000 instances' not exemplar-scale (worst: crane examples/) but live-harmful: 56/56 nixpkgs 26.11 'system' rename warnings trace to import nixpkgs { inherit system; } and devenv's four instances cost a 95.6 s cold eval [shape §4, runs headline, runs Axis 6]
- H2 confirmed and qualified: duplicate nixpkgs in 3/37 locks, but follows is not universally correct (nixpkgs-python forbids overriding; following time-travels inputs) [shape §2, gen §8, prac §11]
- H3 corrected: 27/36 lack a formatter but checks exist in 21/37; only 14/37 CIs run nix flake check; --all-systems passes 8/20 and only 2/20 failures are author defects [runs Axis 3 Axis 5, shape §5 §9]
- H4 partly contradicted: FlakeHub is consumed as an input (3 repos); tags have no convention (10/37 never tagged); FlakeHub rolling releases vanish after any tag >=0.2.0 [shape §2 §10, gen §12]
- H5 confirmed and refined: three data architectures plus llm-agents.nix inline per-package files; nix-update cannot drive JSON-backed data [shape §11, gen §10]
- H6 confirmed and sharpened: token is one anonymous GET; the real obstacle is a 307 to a ~10-minute SAS URL; nix-prefetch-url 401; untested escape is fetchurl with Homebrew's Bearer QQ== header; the layer digest is itself a valid FOD hash [ocx §3, gen §1]
- H7 half confirmed: static half confirmed (actionlint), glibc half unprobed; 19/125 packages' latest linux/amd64 offer is glibc-only [ocx §3f, map M4]
- H8 confirmed live and extended (warning on every run; accept-flake-config is root-equivalent, NixOS/nix#9649) but contested in practice (11/37 exemplars, 3/8 generators ship nixConfig) [runs headline, fail, shape §6, gen]
- H9 confirmed with a stale test plan: nixVersions.nix_2_24 is a removed stub in nixpkgs 26.11; nix-installer-action installs Determinate Nix by default; Lix 2.95 rejects code CppNix accepts [runs Axis 7, shift §7 §10]
- New: nixpkgs 26.11 dropped x86_64-darwin and throws on any attribute under it (lib/trivial.nix:1003, rl-2611.section.md:43-49); 17/37 exemplars list it [shape Contradictions, runs headline]
- New: pure-eval does not forbid IFD (devenv builds during pure nix eval); allow-import-from-derivation defaults to true [runs Axis 6, canon survey 3]
- New: nix flake check skips substitutable derivations since Nix 2.32 [shift §1]
- New: ocx and grimoire are already packaged in the ocx index, and basename cli collides across github/gitlab/grimoire/ocx [map M3]
- Era: nixfmt-rfc-style became nixfmt in nixpkgs 25.11 (tool docs followed in 1.3.0); nixpkgs-fmt archived 2024-07-24 [shift §5 §11, cod §6]
- Era: flake-checker 0.2.15 binary supports only 26.05 and unstable branches although its README lists 25.11 [runs Axis 4]
- Era: flake-utils stalled (last commit 2024-11-13, deprecation issue #86 open) [shift §12]
- ocx data: 1,720 stored image indexes, not 2,011; variants populated in 0/125; no mainProgram-like key at index layer; 7.4% of indexes lack a license [ocx §1.2 §1.6 §1.8]
- Artifact set: nix-generated-flakes is a depth file plus an ocx handoff, not a skill; skills are nix-flake-adopt, nix-flake-release, nix-diagnose [map, conflict 17]
- Artifact set: glob list adds **/statix.toml (Nix-only); .envrc, workflows and treefmt.toml are routed, never globbed [map M5]
- Artifact set: inputs, packaging and security split into their own depth files; NIX-MOD conditional on wave 4 [map]
- Environment: the wave-1 tool-runs worker.sh batch is still running on the single-user store; run.sh nix --version timed out at 60 s twice; wave 2 must wait for it or stop it, and dives serialize on the store [map M1]

## Owner questions — defaults applied (autonomous run)

- Q1 Publish fleet flakes to FlakeHub? Default: no; releases are the existing vX.Y.Z git tags, and fleet flakes take no FlakeHub inputs.
- Q2 Run a public binary cache for fleet flakes? Default: none in v1; CI uses a GitHub-Actions store cache, and READMEs point at the generated flake's prebuilt package as the fast path.
- Q3 Upstream ocx and grim to nixpkgs? Default: write every package.nix by-name-ready now; propose to nixpkgs after each CLI's first stable release, outside this program.
- Q4 Where does the generated flake live and who owns it? Default: new repo ocx-sh/ocx-nix, generated by CI from ocx-sh/index, generator implemented as an ocx subcommand; the ADR confirms.
- Q5 Scope of the generated set? Default: every package and every distinct digest, never pruned until the data file passes 20 MB, then a rolling window; packages carries latest only.
- Q6 Implementation promise? Default: CppNix supported and gated; Lix an advisory CI leg; Determinate Nix untested but never deliberately broken.
- Q7 Will any fleet flake export a NixOS or home-manager module (e.g. programs.ocx)? Default: none planned; wave 4 researches modules at low priority and modules.md ships only if its rows pass selection.
- Q8 Minimum Nix version promised to consumers? Default: the oldest non-stub nixVersions.nix_2_* in the pinned nixpkgs (today 2.31, the version nixpkgs 26.11's own throw recommends).
