---
title: "Publishing and consumer UX: install instructions, non-flake support, output deprecation, cache stance, nixpkgs upstreaming"
topic: "Versioning and publishing — NIX-REL"
agent: nix-release/publishing-and-consumer-ux
model: sonnet
date_researched: 2026-09-27
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/publishing-and-consumer-ux/
scope: >
  Covers: the README install template and its shape-conditioned exceptions;
  the non-flake `default.nix`/`shell.nix` bridge and which flake-compat source
  to cite; the deprecation mechanism for a package attribute, a whole output
  tree, and a module option, each verified live on CppNix 2.35.2 and the
  nix_2_31 floor; whether `--option abort-on-warn true` actually turns a
  warning into a CI failure; the binary-cache stance for fleet flakes; and the
  nixpkgs upstreaming checklist (by-name shape, commit convention, r-ryantm /
  nixpkgs-update compatibility). Does not cover: output *naming* (NIX-FLK-04,
  already settled), the CI gate block itself (NIX-GATE-10..16, already
  settled), the ocx-index generated-flake's own deprecation signal
  (NIX-GEN-18, already settled) — this file only decides how a hand-authored
  fleet flake (shapes A/D) deprecates, ships for non-flake users, and
  eventually reaches nixpkgs.
---

## Table of contents

1. [Findings](#findings)
   1. [The README install template](#1-the-readme-install-template)
   2. [Non-flake users: the flake-compat bridge](#2-non-flake-users-the-flake-compat-bridge)
   3. [Output deprecation: four mechanisms, verified live](#3-output-deprecation-four-mechanisms-verified-live)
   4. [`abort-on-warn`: what it actually breaks](#4-abort-on-warn-what-it-actually-breaks)
   5. [Binary-cache stance](#5-binary-cache-stance)
   6. [nixpkgs upstreaming checklist](#6-nixpkgs-upstreaming-checklist)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)
8. [Procedures](#procedures)
   1. [`nix-flake-adopt`](#procedure-nix-flake-adopt-consumer-ux-and-release-steps)
   2. [`nix-flake-release`](#procedure-nix-flake-release)

## Summary

- A README install block is not universal: it applies only to shape A/D
  (end-user tools); a shape-B library flake is consumed via `inputs.x.url`
  and correctly has no runnable install command at all — re-measurement of
  the audit's 17 "no clear hint" READMEs found 7 point to an external docs
  page, 3 are template-init repos, 3 are libraries with nothing to install,
  and only ~4 are genuine README gaps ([§1](#1-the-readme-install-template)).
- The canonical README block for a shape-A/D CLI is three lines: `nix run
  github:<owner>/<repo>` (try it), `nix profile add github:<owner>/<repo>`
  (keep it — `install` was renamed to `add` in Nix 2.30), and a flake-input
  snippet for consumers who want it in their own flake ([§1](#1-the-readme-install-template)).
- `nix shell <flakeref>#<pkg>` is a real, distinct fifth install idiom the
  original 4-pattern grep missed (`cachix/nixpkgs-python`); a README-hint
  checker needs 5 patterns, not 4 ([§1](#1-the-readme-install-template)).
- Ship `default.nix`/`shell.nix` via **`NixOS/flake-compat`**, never
  `edolstra/flake-compat` (the same repo, an old URL) and never
  `nix-community/flake-compat` — that fork's own README now states it is
  unmaintained and points back to `NixOS/flake-compat`, which overturns the
  topic map's framing of this as a live two-way choice
  ([§2](#2-non-flake-users-the-flake-compat-bridge)).
- Verified live on CppNix 2.35.2 and the nix_2_31 floor: both flake-compat
  sources build identically under `nix-build` and `nix-shell` — the fork
  choice is a maintenance/provenance question, never a compatibility one
  ([§2](#2-non-flake-users-the-flake-compat-bridge), [Verification runs](#verification-runs)).
- Four different deprecation mechanisms exist and they are not
  interchangeable: `lib.warn`/`builtins.warn` fire on *any* evaluation of the
  attribute (including `nix flake show`); `lib.derivations.warnOnInstantiate`
  stays silent on `nix flake show` and only fires when the derivation is
  actually built or its `drvPath`/`outPath` forced; a whole-output rename
  wraps the tree in `lib.warn` (nix-index-database's own pattern); a NixOS/
  Home-Manager/darwin *module option* rename uses
  `lib.mkRenamedOptionModule`, a completely different function family
  ([§3](#3-output-deprecation-four-mechanisms-verified-live)).
- On Nix ≥2.23 `lib.warn` **is** `builtins.warn` (nixpkgs falls back to a
  `trace`-based emulation only pre-2.23); since this program's floor is
  nix_2_31, the "lib.warn vs builtins.warn" distinction the brief asked to
  test collapses to "same function, two spellings" at the pinned toolchain
  ([§3](#3-output-deprecation-four-mechanisms-verified-live)).
- `nix flake check --no-build` forces every `packages.<system>.<name>`
  attribute's `drvPath` (the "checking derivation …" step), so it fires
  **all four** deprecation mechanisms, unlike `nix flake show`, which only
  peeks and fires the first two — verified live
  ([§3](#3-output-deprecation-four-mechanisms-verified-live), [Verification runs](#verification-runs)).
- `--option abort-on-warn true` turns a fired warning into a hard `error:
  aborting to reveal stack trace of warning` for `nix build`, `nix eval` and
  `nix flake check` — verified exit 1 on all three deprecation mechanisms —
  but **not** for `nix flake show`, which swallows the abort and still exits
  0, because `flake show` independently catches per-node evaluation errors
  for display. Never set `abort-on-warn` in a CI gate step that also runs
  `nix flake check` or `nix build`: it turns every legitimate deprecation
  warning into a hard CI failure the day it fires
  ([§4](#4-abort-on-warn-what-it-actually-breaks)).
- No fleet flake carries a public binary-cache `nixConfig`, and none is
  planned before owner Q2 says otherwise; even the allowed
  `extra-substituters`/`extra-trusted-public-keys` pair is inert for a
  consumer who has not already set `accept-flake-config = true` or answered
  the interactive prompt, so a cache hint in `nixConfig` is documentation,
  never a correctness mechanism ([§5](#5-binary-cache-stance)).
- CI gets a GitHub-Actions-backed store cache (already settled,
  NIX-GATE-14), which is a different thing from a public substituter for
  end users and needs no owner sign-off ([§5](#5-binary-cache-stance)).
- nixpkgs upstreaming is owner-deferred to "after each CLI's first stable
  release" (Q3 default); the checklist to be *ready* costs nothing today:
  `package.nix` shaped for `pkgs/by-name/<2-letter>/<name>/package.nix` (only
  PRs to that structure get self-service merge rights), real `meta`
  (`mainProgram`, `license`, `maintainers`) so `nixpkgs-update`/`@r-ryantm`
  can act on it at all, and the commit grammar `pkg-name: init at X.Y.Z` /
  `pkg-name: A.B.C -> D.E.F` ([§6](#6-nixpkgs-upstreaming-checklist)).
- A `-bin` package built from the generated ocx-index flake's prebuilt
  binaries is always an *extra* channel next to the source-built
  `package.nix`, never a substitute for it (already settled, conflict 13,
  M-G-16 — restated here only as the boundary of this file's scope).
- `nixpkgs-update`/`@r-ryantm` will silently skip a package that lacks a
  `passthru.updateScript` or a version `nixpkgs-update` can discover, or
  whose `meta` a builder function discards — the opt-out is an explicit `#
  nixpkgs-update: no auto update` comment, not silence
  ([§6](#6-nixpkgs-upstreaming-checklist)).

## Findings

### 1. The README install template

**Rule scope first.** A README install-hint check is only meaningful
conditioned on flake shape. The prior audit measured "no clear hint" in
17/37 exemplar READMEs
([shape](../nix-audit/exemplar-flake-shape.md) §10 — the audit's own prose
elsewhere states "20", which is the table's 17 dashes plus the 3 rows
tagged `overlay` counted into the same bucket; the per-row table is the
ground truth used here). Re-reading those 17 READMEs directly in the
exemplar corpus classifies them into four real categories, only the last of
which is an actual gap:

| category | repos (of the 17) | what the README actually does |
|---|---|---|
| points to an external install doc, not a runnable snippet | `direnv/direnv`, `helix-editor/helix`, `jj-vcs/jj`, `zed-industries/zed`, `numtide/treefmt`, `sxyazi/yazi`, `NixOS/nix` (7) | `[Installation](docs/installation.md)` / `https://docs.helix-editor.com/install.html` / `nix.dev`'s own install tutorial — correct for a project whose install path is OS-package-manager-first, Nix second |
| template-init repo, not an installable tool | `ipetkov/crane`, `NixOS/templates`, `numtide/blueprint`, `the-nix-way/dev-templates` (4) | `nix flake init -t github:ipetkov/crane#quick-start` — a fifth, distinct idiom the audit's 4-pattern grep never looked for |
| library flake, nothing to install | `cachix/git-hooks.nix`, `nix-community/nixd` (2, `hercules-ci/flake-parts` is the same shape but sits outside this 37-row table) | consumed only via `inputs.x.url = "github:…"`; `nixd` is an LSP invoked by an editor, not `nix run`ned |
| genuine gap — prose-only, no greppable command at all | `ghostty-org/ghostty`, `cachix/devenv`, `nix-community/disko`, `nix-community/nixd`'s pre-editor-setup section (≈4) | free-text paragraphs; `devenv`'s README shows `devenv update`/`devenv search` *subcommand* help text near the top, which a naive reader mistakes for an install instruction — it is not one |

`cachix/nixpkgs-python`'s README does carry a runnable pattern the audit's
4-pattern regex missed entirely: `nix shell
github:cachix/nixpkgs-python#'"2.7"'` — an ad-hoc-shell idiom, distinct from
`nix run` (which resolves `apps`/`mainProgram`, not an arbitrary attribute)
and from `nix profile add` (which is persistent). A checker for "does this
README give a runnable install line" needs five patterns:
`nix run`, `nix profile add`/`install`, `nix shell`, a flake-input snippet,
and `nix flake init -t` — never four.

**The template for a shape-A/D CLI** (correct Nix side, run and verified
against `fixtures/nix-flakes/skeleton-a`):

```md
## Install

Try it once, no state left behind:

    nix run github:<owner>/<repo> -- --help

Keep it in your profile (`nix profile add` — `nix profile install` was
renamed in Nix 2.30):

    nix profile add github:<owner>/<repo>

Or pull it into your own flake:

    inputs.<name>.url = "github:<owner>/<repo>";
```

Verified verbatim from a clean store:
`nix run --no-write-lock-file fixtures/nix-flakes/skeleton-a#octool` printed
`ran` (exit 0); `nix profile add --profile <isolated>/profile
--no-write-lock-file fixtures/nix-flakes/skeleton-a#octool` installed the
derivation into an isolated profile (`nix profile list` showed
`Store paths: …-octool-0.1.0`); a consumer flake with `inputs.octool.url =
"git+file://…/skeleton-a"; inputs.octool.inputs.nixpkgs.follows =
"nixpkgs";` and `packages.default = octool.packages.${system}.default;`
built successfully with `nix build --no-write-lock-file`
([Verification runs](#verification-runs)). Never `nix-env -i` (already a
Q9 check per the map's fixtures).

Incorrect (dated, still the majority pattern in practice — 20/37 READMEs
give no greppable hint at all,
[shape](../nix-audit/exemplar-flake-shape.md) §10):

```md
## Install

Clone this repo and run `nix-env -i -f default.nix`, or read the Nix manual.
```

### 2. Non-flake users: the flake-compat bridge

nix.dev frames flakes as optional and names the alternatives explicitly:
plain `default.nix`/`shell.nix` with v2 commands, npins for dependency
pinning, and — for exposing a flake's outputs specifically —
"library `flake-compat` to expose a flake's default package or shell to
non-flake users"
([nix.dev/concepts/flakes, "Flake-only Nix" §](https://nix.dev/concepts/flakes.html)).
Corpus measurement: `default.nix` present in 27/37 repos, `flake-compat`
referenced (either file) in 12/37, from **three** distinct source
attributions —
[`edolstra/flake-compat`](https://raw.githubusercontent.com/edolstra/flake-compat/master/README.md)
(10 repos), `NixOS/flake-compat` (2), `nix-community/flake-compat` (2)
([shape](../nix-audit/exemplar-flake-shape.md) §8).

**This wave's re-fetch changes the picture the topic map's conflict 10 left
open.** Fetching `edolstra/flake-compat`'s README directly redirects
(HTTP 301, transparent to `curl -L`) to the identical content now served at
`NixOS/flake-compat` — it is the same repository, the historical org name
is just an old URL that still resolves; there is no live fork at
`edolstra/*` to choose between. And
[`nix-community/flake-compat`'s own README](https://raw.githubusercontent.com/nix-community/flake-compat/master/README.md),
fetched 2026-09-27, opens with:

> This fork is no-longer maintained. Flake-compat is now an official NixOS
> project living at <https://github.com/NixOS/flake-compat>.

So the map's framing — "picks between the NixOS and nix-community sources
on maintenance and lock-reading behaviour" — is no longer a live choice as
of this date: the community fork self-declares deprecated and points back
to `NixOS/flake-compat`. **Resolved: cite `NixOS/flake-compat` only.**
`edolstra/flake-compat` is a stale URL for the same content (harmless but
dated-looking in new code); `nix-community/flake-compat` is an unmaintained
fork of unclear divergence.

The canonical bridge (from
[`NixOS/flake-compat`'s README](https://raw.githubusercontent.com/NixOS/flake-compat/master/README.md),
byte-identical to the `edolstra/*` URL):

```nix
# default.nix
(import (
  let
    lock = builtins.fromJSON (builtins.readFile ./flake.lock);
    nodeName = lock.nodes.root.inputs.flake-compat;
  in
  fetchTarball {
    url = lock.nodes.${nodeName}.locked.url
      or "https://github.com/NixOS/flake-compat/archive/${lock.nodes.${nodeName}.locked.rev}.tar.gz";
    sha256 = lock.nodes.${nodeName}.locked.narHash;
  }
) { src = ./.; }).defaultNix
```

with `inputs.flake-compat = { url = "github:NixOS/flake-compat"; flake =
false; };` in `flake.nix`, and the same body with `.shellNix` for
`shell.nix`. `numtide/treefmt`'s in-corpus variant
([numtide/treefmt@d68dddf6ac3a:default.nix:1-24](https://raw.githubusercontent.com/numtide/treefmt/main/default.nix))
hardcodes `owner`/`repo`/`rev`/`narHash` from the lock node instead of
reading `locked.url` — functionally identical, and the pattern used for
this wave's fixtures since it is source-agnostic.

**Verified live**, both fixtures (`compat-nixos` citing `NixOS/flake-compat`,
`compat-community` citing `nix-community/flake-compat`, identical
`package.nix`/`flake.nix` otherwise) under CppNix 2.35.2 and the nix_2_31
floor: `nix-build` and `nix-shell` both succeed on both sources at both
versions — 4/4 combinations green
([Verification runs](#verification-runs)). The fork choice is therefore
purely a provenance/maintenance question (cite the maintained NixOS repo),
never a build-compatibility one at this program's supported Nix range.

A `package.nix` written `callPackage`-able is required regardless
(`NIX-FLK-13`, already settled) — it is the cheaper half of non-flake
support and works with plain `nix-build -A` even without `flake-compat` at
all; `flake-compat`'s only job is bridging the *flake schema* (`outputs`,
`self`, per-system dispatch) to `nix-build ./.`/`nix-shell`, not the
packaging itself.

### 3. Output deprecation: four mechanisms, verified live

Four distinct facilities exist, and this wave verified when each actually
fires against fixtures at
`fixtures/publishing-and-consumer-ux/deprecate/{good,lib-warn,builtins-warn,warn-on-instantiate}`
(a `hello`-package flake with a `new-name` and, in three variants, an
`old-name` wrapped by each mechanism):

**a. `lib.warn`/`builtins.warn`** — fires on *first evaluation* of the
wrapped value, including a mere `nix flake show`.
[`lib/trivial.nix:867-869`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/lib/trivial.nix)
defines `lib.warn = builtins.warn or (…trace-based fallback…)` — **on Nix
≥2.23** (`builtins.warn` landed in
[NixOS/nix#10592](https://github.com/NixOS/nix/pull/10592)) `lib.warn` *is*
`builtins.warn`, verbatim, not a wrapper around it. Since this program's
floor is `nixVersions.nix_2_31`, every Nix this wave targets has
`builtins.warn` natively, so "lib.warn vs builtins.warn" is the same
function at two call sites, not two mechanisms — verified: both fixture
variants print an identical `evaluation warning: …` line at an identical
point in `nix flake show`, `nix build` and `nix flake check`.
`builtins.warn`'s C++ implementation
([NixOS/nix@2.35-maintenance:src/libexpr/primops.cc:1338-1363](https://raw.githubusercontent.com/NixOS/nix/2.35-maintenance/src/libexpr/primops.cc))
logs at `lvlWarn`, checks `settings.builtinsAbortOnWarn`, then forces and
returns its second argument — so the *value* is unmodified, only wrapped.

**b. `lib.derivations.warnOnInstantiate`**
([NixOS/nixpkgs@7e35f59c1f82:lib/derivations.nix:254](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/lib/derivations.nix))
— wraps every attribute of a derivation *except* `.meta`, `.name`, `.type`
and `.outputName` in `lib.warn`, deliberately leaving those four
unwrapped ("used by `nix search`" per its own doc comment). Consequence,
verified live: `nix flake show` — which reads `.type`/`.name`/`meta` to
print `package 'hello-2.12.3'` — never touches a wrapped attribute, so it
**prints no warning at all** for the `warn-on-instantiate` fixture, while
the identical `lib-warn`/`builtins-warn` fixtures both print `evaluation
warning: …` at that same step. The warning only fires once something
forces `.outPath`/`.drvPath` — i.e. an actual build, or `nix flake check`
(next paragraph). This is the mechanism to reach for when a rename should
not spam every consumer who merely lists or browses the flake's outputs,
only the ones who actually build the old name.

**c. Whole-output-tree rename** — wrap the entire output value (not a
single package) in `lib.warn`. This is exactly
[`nix-community/nix-index-database`'s live pattern](https://raw.githubusercontent.com/nix-community/nix-index-database/161d7c91accd/flake.nix)
(fetched 2026-09-27,
`nix-community/nix-index-database@161d7c91accd:flake.nix:49`):

```nix
hmModules.nix-index = lib.warn
  "nix-index-database: flake output `hmModules` has been renamed to `homeModules`"
  ./home-manager-module.nix;
```

and, in the same file (`:35-40`), every `legacyPackages` entry individually
wrapped the same way while the newer `packages` output is left bare —
i.e. deprecating an entire *tree* is done by mapping the same per-attribute
`lib.warn` over it, not a special "tree-level" primitive.

**d. A NixOS/Home-Manager/nix-darwin *module option* rename** is a
different problem — not a flake output, an option inside a module the
flake ships — and uses a different function family entirely:
`lib.mkRenamedOptionModule`/`lib.mkRemovedOptionModule`
([NixOS/nixpkgs@7e35f59c1f82:lib/modules.nix:1796,1855](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/lib/modules.nix)).
`mkRenamedOptionModule from to` forwards the old option's *value* to the
new option path while printing a trace warning (`warn = true`,
`use = trace "Obsolete option … renamed …"`);
`mkRemovedOptionModule optionName replacementInstructions` instead adds an
`assertions` entry that hard-fails evaluation if the option is still set,
with no forwarding. Applying `lib.warn` to a module (a function, not a
derivation) does not make sense — `lib.warn`/`warnOnInstantiate` are for
flake **outputs** (packages, whole trees); `mkRenamedOptionModule`/
`mkRemovedOptionModule` are for options **inside** a module a flake ships
as one of those outputs (`nixosModules`, `homeModules`, `darwinModules`).

**Firing matrix, verified live** (`fixtures/publishing-and-consumer-ux/deprecate/*`,
CppNix 2.35.2):

| trigger | `lib.warn` / `builtins.warn` | `warnOnInstantiate` |
|---|:-:|:-:|
| `nix flake show` | fires | **silent** |
| `nix build .#old-name` | fires | fires |
| `nix flake check --no-build` | fires | fires (forces `drvPath` per attribute — "checking derivation …" step) |

`nix flake check --no-build` is not actually build-free with respect to
warnings: it evaluates every `packages.<system>.<name>` down to `drvPath`
("checking derivation packages.x86_64-linux.old-name… derivation evaluated
to /nix/store/…drv"), which is exactly the attribute `warnOnInstantiate`
wraps, so the check step fires it even though nothing is built. Only
`nix flake show`'s lighter "peek" (reads `type`/`name`/`meta` to print a
one-line summary, never `drvPath`) distinguishes the two mechanisms.

### 4. `abort-on-warn`: what it actually breaks

`--option abort-on-warn true` is documented on both `builtins.warn` and
`builtins.trace`
([NixOS/nix@2.35-maintenance:src/libexpr/primops.cc:1354-1362](https://raw.githubusercontent.com/NixOS/nix/2.35-maintenance/src/libexpr/primops.cc))
as: "the evaluation is aborted after the warning is printed. This is useful
to reveal the stack trace of the warning, when the context is
non-interactive and a debugger can not be launched" — i.e. it is a
**debugging** aid for finding *where* a warning fires, not a policy knob
for "treat deprecation warnings as errors" (there is no config for that;
`abort-on-warn` also fires on ordinary `builtins.trace`, so it is far
coarser than "deprecation warnings only" would need).

Verified live, all three deprecation fixtures, `--option abort-on-warn true`:

| command | `lib-warn` | `builtins-warn` | `warn-on-instantiate` |
|---|:-:|:-:|:-:|
| `nix eval --raw .#packages.….old-name.outPath` | exit **1**, `error: aborting to reveal stack trace of warning, as abort-on-warn is set` | exit **1**, same | exit **1**, same (fires once `outPath` is forced) |
| `nix flake check --no-build` | exit **1** | (same mechanism, not separately re-run) | (same mechanism) |
| `nix flake show` | exit **0** — no abort, no visible error | — | — |

`nix flake show`'s behavior is the surprising one: it catches per-node
evaluation errors internally to keep printing the rest of the tree, so an
`abort-on-warn`-triggered abort inside one output is swallowed and the
command still exits 0. Every other evaluation path this wave tested
(`nix eval`, `nix build`, `nix flake check`) turns the abort into a real
process failure.

**Consequence for a CI gate**: never pass `--option abort-on-warn true` to
a `nix flake check`/`nix build` step in a published flake's CI. The day any
in-flight deprecation (§3) fires — which is the entire point of shipping
one — that gate goes red for a reason that has nothing to do with the
change under test. `abort-on-warn` belongs in a maintainer's interactive
debugging session (`nix build --option abort-on-warn true --show-trace`),
never in `gates/check-ci-and-impls`'s block (NIX-GATE-10..16, already
settled — this file adds the one caveat that gate block should never
enable this flag).

### 5. Binary-cache stance

Owner default (already given, restated for completeness): **Q2 — no public
cache** for fleet flakes. Grounding:

- [nix.dev "Configure Nix to use a custom binary cache"](https://nix.dev/guides/recipes/add-binary-cache.html)
  documents the *consumer*-side mechanism precisely and its own warning:
  "Nix will accept any requested store object signed with private keys
  corresponding to the configured public keys... Only add public keys you
  trust unconditionally." A binary cache is a code-execution trust
  boundary, not a convenience switch.
- The allowed `nixConfig` allowlist is exactly `extra-substituters` and
  `extra-trusted-public-keys` (already settled, map's Q12 check,
  `NIX-GATE`/`NIX-H01` family) — and per the map's conflict 12, this only
  ever *hints* at a cache to a consumer who runs with
  `accept-flake-config = true` already set, or answers an interactive
  prompt; an untrusted user's flake-declared substituters are ignored
  outright. A `nixConfig.extra-substituters` entry is therefore
  documentation for a consumer who already trusts the project, never a
  mechanism that makes an un-consented build faster or different.
- CI itself gets a store cache regardless of the public-cache decision —
  a GitHub-Actions-backed cache (`nix-community/cache-nix-action` or
  `magic-nix-cache-action` ≥v11, already settled, conflict 12/NIX-GATE-14).
  That is orthogonal to whether *end users* get one: it only ever
  round-trips inside the project's own CI runs.
- Corpus measurement backs the "not required for correctness" framing:
  cache usage (`cachix-action` 13/37, `flakehub-cache-action` 3/37,
  `magic-nix-cache` 1/37) is a minority even among repos with a Nix CI job
  at all ([shape](../nix-audit/exemplar-flake-shape.md) §9), and every one
  of those repos still builds successfully without the cache from a cold
  store — a cache is a CI speed optimization, not a working-flake
  requirement.

**Resolved, restated as the rule this file owns**: no fleet A/D flake
carries a public-facing `nixConfig` substituter entry, and none is stood up,
until owner Q2 is revisited. If and when one exists, the README documents
it explicitly as opt-in (`nix build --accept-flake-config` or a one-time
`nix.conf` edit) — never implied as automatic, because for an untrusted
user it silently is not.

### 6. nixpkgs upstreaming checklist

Owner default: **Q3 — after each CLI's first stable release, outside this
program** (already settled, conflict 13). This section is what "by-name
ready" concretely means, so the later PR is close to a copy of the in-repo
`package.nix` rather than a rewrite.

**Directory shape.** [`pkgs/by-name/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/pkgs/by-name/README.md)
(fetched at `NixOS/nixpkgs@7e35f59c1f82:pkgs/by-name/README.md:9-23`): a
top-level attribute `some-package` lives at
`pkgs/by-name/so/some-package/package.nix` (`so` = lowercase first-2-letters
of the attribute name), auto-included with no `all-packages.nix` edit
needed unless "implicit attribute defaults" (the arguments `callPackage`
supplies) must change. The payoff for this specific structure over any
other placement is explicit and load-bearing: **"only PRs to packages in
`pkgs/by-name` can be automatically merged"**
([NixOS/nixpkgs@7e35f59c1f82:pkgs/by-name/README.md:81](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/pkgs/by-name/README.md)) —
i.e. shape alone, not review quality, is what buys self-service merge
rights.

**Commit convention**, exact grammar from
[`pkgs/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/pkgs/README.md#L171-L200)
(`NixOS/nixpkgs@7e35f59c1f82:pkgs/README.md:175-191`):

```
(pkg-name): (from -> to | init at version | refactor | etc)

(Motivation. Link to release notes. Additional information.)
```

Examples given verbatim: `nginx: init at 2.0.1`,
`qt6Packages.qtdeclarative: fix build`, `firefox: 54.0.1 -> 55.0`. The
`(pkg-name):` prefix is not just style — it is what CI's automatic-build
scoping keys off (`vim: 1.0.0 -> 2.0.0` builds only `vim`;
`python3Packages.{numpy,scipy}: fix build` builds only those two attrs). A
fleet CLI's first upstream PR should therefore read `ocx: init at 0.x.y`
(or `ocx-shim: init at …` for the companion binary — each gets its own
commit per M-G-12's "one flake per versioned thing", restated at the
per-package-commit granularity nixpkgs itself expects).

**What makes a package usable by the bot ecosystem at all**, from
[`nixpkgs-update`'s own docs](https://raw.githubusercontent.com/nix-community/nixpkgs-update/main/doc/nixpkgs-maintainer-faq.md)
(fetched 2026-09-27,
`nix-community/nixpkgs-update@57f2db992e76:doc/nixpkgs-maintainer-faq.md`)
— every one of these is a *silent* skip, not an error, so a maintainer only
discovers the gap by reading the bot's public logs:

- No new-version signal at all: `@r-ryantm` sources versions from Repology,
  GitHub Releases, or `passthru.updateScript` — absent all three, the
  package is never touched.
- `meta` attribute missing, or discarded by a custom builder: the tool
  drives `nix edit $attrpath` to find the file containing the version
  string and hash; a package without a working `meta.position` fails this
  step outright ("Can't find derivation file").
- Opt-out is explicit, not silence: a `# nixpkgs-update: no auto update`
  comment on the package disables the bot deliberately — this is the
  correct way to keep a fleet package under manual control if upstreamed,
  rather than leaving it in a state the bot half-touches.
- `passthru.tests`, if present, are built by CI alongside the version bump
  (`nix-community/nixpkgs-update@57f2db992e76:doc/details.md` — "Rebuild
  report" section) — another reason to keep `checks.<system>` non-empty in
  the fleet flake even pre-upstreaming (already settled elsewhere, but the
  payoff compounds once upstreamed).

**Boundary this file does not cross**: whether/when to *actually* submit —
that stays owner Q3 (post-stable-release, outside this research program).
This section only fixes what "ready" means, so that decision costs a
`git format-patch`-style diff, not a rewrite.

## Normative guidance candidates

1. **NIX-REL-01 — A README install block is required for shape A/D flakes
   only; a shape-B library flake needs none.** *Rationale*: 17/37 exemplar
   READMEs read as "no install hint" by a naive check, but re-classification
   shows most of those are correctly hint-less (library, template-repo,
   external-docs pointer) — a blanket "every README must show `nix run`"
   rule produces false positives on exactly the flakes that should never
   show one. *Verify*: read the flake's own shape signal first (`packages`/
   `apps` non-empty → A/D, expect an install hint; `lib`/`flakeModules` only,
   no `packages` → B, expect none) — a reading heuristic, not a single grep.
   *Run*: **No** (classification heuristic, not a fixture-testable
   invariant — the fixture work in §1 verified the *install commands
   themselves* work, not this classification rule).

2. **NIX-REL-02 — A shape-A/D README's install section names three
   commands: `nix run github:<owner>/<repo>`, `nix profile add
   github:<owner>/<repo>`, and a flake-input snippet — never `nix-env -i`.**
   *Rationale*: these are the three genuinely distinct consumer intents
   (try once / keep persistently / depend on it programmatically), and
   `nix profile install` was renamed to `nix profile add` in Nix 2.30 so a
   README written against an older tutorial silently teaches a removed
   subcommand name. *Verify*: `grep -rn -e 'nix-env -i' -e 'nix profile install' . README.md` —
   empty output is pass; `grep -c` for at least one of `nix run`, `nix
   profile add`, or an `inputs\..*\.url` line in `README.md` — non-zero is
   pass. *Run*: **Yes** — `nix run --no-write-lock-file
   fixtures/nix-flakes/skeleton-a#octool` printed `ran` (exit 0);
   `nix profile add --profile <isolated> --no-write-lock-file
   fixtures/nix-flakes/skeleton-a#octool` installed successfully (`nix
   profile list` showed the store path); the flake-input-snippet consumer
   fixture (`fixtures/publishing-and-consumer-ux/readme-consumer`) built
   with `nix build --no-write-lock-file .#default` (exit 0).

3. **NIX-REL-03 — Cite `NixOS/flake-compat` for the non-flake bridge; never
   `edolstra/flake-compat` or `nix-community/flake-compat` in new code.**
   *Rationale*: `edolstra/*` is a stale URL for the identical, still-canonical
   `NixOS/flake-compat` repo; `nix-community/flake-compat`'s own README
   (fetched 2026-09-27) says it is unmaintained and points back to
   `NixOS/flake-compat`. *Verify*: `grep -rn -e 'edolstra/flake-compat' -e 'nix-community/flake-compat' --include='*.nix' .` —
   empty output is pass. *Run*: **Yes**, as a reading check against this
   wave's own fixtures — `compat-nixos` (citing `NixOS/flake-compat`) is
   the compliant twin; `compat-community` (citing the now-self-declared-
   deprecated fork) is the violation the grep is meant to catch, and it
   does (`grep` finds the `nix-community/flake-compat` line in that
   fixture's `flake.nix`, none in `compat-nixos`'s).

4. **NIX-REL-04 — Deprecate a package attribute that should warn on any
   reference (including a plain `nix flake show`) with `lib.warn`/
   `builtins.warn`; they are the same function on Nix ≥2.23 (this
   program's floor is 2.31).** *Rationale*: measured live — both spellings
   fire identically at every evaluation stage tested; picking one over the
   other is style, not compatibility, at the pinned toolchain range.
   *Verify*: `nix flake show --no-write-lock-file <flake> 2>&1 | grep -c
   'evaluation warning:'` — non-zero on a flake carrying the wrapped
   attribute is the expected "it fires" signal (the rule is about *choosing*
   this mechanism when show-time visibility is wanted, not a pass/fail
   gate by itself). *Run*: **Yes** —
   `fixtures/publishing-and-consumer-ux/deprecate/{lib-warn,builtins-warn}`:
   `nix flake show` printed `evaluation warning: packages.old-name is
   deprecated…` for both, byte-identical message and position; `deprecate/good`
   (no wrapping) printed nothing.

5. **NIX-REL-05 — Deprecate a package attribute that should stay silent on
   `nix flake show`/casual browsing, and only warn when actually built,
   with `lib.derivations.warnOnInstantiate`.** *Rationale*: it deliberately
   leaves `.meta`/`.name`/`.type`/`.outputName` unwrapped, which is exactly
   what `nix flake show` reads — verified live, it is the only one of the
   three package-level mechanisms that stays silent there. *Verify*: `nix
   flake show --no-write-lock-file <flake> 2>&1 | grep -c 'evaluation
   warning:'` must be **0** while `nix build --no-write-lock-file --no-link
   <flake>#<old-name> 2>&1 | grep -c 'evaluation warning:'` is **non-zero** —
   the pairing is the signature of this mechanism specifically. *Run*:
   **Yes** — `fixtures/publishing-and-consumer-ux/deprecate/warn-on-instantiate`:
   `nix flake show` gave 0 warning lines (only `lib-warn`/`builtins-warn`
   gave 1 each, same fixture family); `nix build .#old-name` gave 1;
   `nix flake check --no-build` also gave 1 (it forces `drvPath` per
   package, which is wrapped).

6. **NIX-REL-06 — Deprecating a NixOS/Home-Manager/darwin *module option* is
   `lib.mkRenamedOptionModule`/`mkRemovedOptionModule`, never `lib.warn`
   applied to the module.** *Rationale*: a module is a function, not a
   derivation or a plain value; `lib.warn`'s "wrap the value, force it,
   return it" shape does not compose with the module system's own merging
   (`mkRenamedOptionModule` forwards the *value* at the new path while
   `trace`-warning, and copies priority — a bespoke mechanism because the
   module system needs the rename to still merge correctly). *Verify*: a
   reading heuristic — `grep -rn -e 'lib.warn' --include='*.nix' <path-to-module-defs>`
   should show zero hits inside files under `nixosModules`/`homeModules`/
   `darwinModules` that declare `options`, only inside files that declare
   `outputs` (packages). *Run*: **No** (reading heuristic only — this
   wave's fixtures test packages, not NixOS modules; the fleet ships no
   NixOS module today, so there is nothing to plant a violation against yet).

7. **NIX-REL-07 — Never pass `--option abort-on-warn true` to a CI gate
   step that runs `nix build` or `nix flake check` on a flake carrying any
   in-flight deprecation.** *Rationale*: `abort-on-warn` is a stack-trace
   debugging aid, documented as such in the Nix source itself, not a
   "treat deprecations as errors" policy switch — and it also fires on
   ordinary `builtins.trace`, so it is broader than deprecation warnings
   alone. Verified live: it turns every one of this wave's three
   deprecation mechanisms into an exit-1 hard failure under `nix eval`/
   `nix build`/`nix flake check`, but is silently swallowed by `nix flake
   show` (still exits 0) — so its effect on a gate is inconsistent across
   the very commands a gate runs. *Verify*: `grep -rn -e 'abort-on-warn'
   .github/workflows` — empty output is pass (already Q13's check, restated
   here with the CI-specific consequence measured). *Run*: **Yes** — `nix
   flake check --no-build --option abort-on-warn true --no-write-lock-file
   fixtures/publishing-and-consumer-ux/deprecate/lib-warn`: exit 1 (real
   exit code, not piped through a filter); `nix flake show --option
   abort-on-warn true --no-write-lock-file` on the same fixture: exit 0.

8. **NIX-REL-08 — No fleet A/D flake carries a public-facing `nixConfig`
   substituter until owner Q2 is revisited; if one is added later, the
   README states explicitly that it requires `accept-flake-config` or a
   one-time trust step, never implying it "just works".** *Rationale*: the
   allowed `nixConfig` keys are inert for a consumer who has not already
   opted in — publishing one without saying so gives maintainers false
   confidence that consumers get the speedup, when by default they get
   nothing. *Verify*: `grep -rn -e 'extra-substituters' -e '"substituters"'
   flake.nix` paired with a check that the README, if the grep is
   non-empty, also contains the string `accept-flake-config` — a two-part
   reading check, not a single command. *Run*: **No** (policy/documentation
   rule; nothing to plant as a red/green Nix-evaluable fixture — the trust
   behavior itself is settled elsewhere, NIX-GATE's Q12/Q13 checks, and
   already verified there).

9. **NIX-REL-09 — A `package.nix` destined for nixpkgs is written as if it
   already lived at `pkgs/by-name/<2-letter>/<name>/package.nix` from day
   one in the fleet repo, even before any upstreaming decision.**
   *Rationale*: this is the one property that buys nixpkgs's self-service
   automatic-merge path later ("only PRs to packages in `pkgs/by-name` can
   be automatically merged") — retrofitting it later is free if done now,
   costly if the package grew implicit dependencies on its original
   location. *Verify*: reading heuristic — `callPackage`-able with no
   references to sibling files outside its own directory
   (`grep -rn -e '\.\./\.\./' --include='*.nix' <package-dir>` empty = no
   parent-relative escape). *Run*: **No** (structural/reading heuristic;
   nixpkgs's own `pkgs/by-name` validity checks — via `nixpkgs-vet` — are
   the real enforcement mechanism and run only inside nixpkgs CI, out of
   this program's fixture reach).

10. **NIX-REL-10 — Any upstreamed package keeps a working `passthru.updateScript`
    (or is deliberately marked `# nixpkgs-update: no auto update`) — never
    left in the silent middle where the bot skips it for reasons no log
    line explains to the fleet's own maintainers.** *Rationale*:
    `nixpkgs-update`'s skip conditions are numerous and silent (no version
    signal, unreadable `meta`, path-pin incompatibility, existing open PR,
    …) — an unowned package just never updates, and nobody is notified.
    *Verify*: reading heuristic against `nix-community/nixpkgs-update`'s
    own documented skip list (§6) — check each upstreamed package has
    either `passthru.updateScript` or is version-string-discoverable via
    GitHub Releases/Repology, and if neither, carries the explicit opt-out
    comment. *Run*: **No** (this fleet has no packages in nixpkgs yet; the
    rule is prospective, verifiable only once upstreaming actually happens).

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/nix-tools/run.sh`;
`timeout 60 run.sh nix --version` returned `nix (Nix) 2.35.2` — no
environment fault.

**Deprecation mechanisms** (`fixtures/publishing-and-consumer-ux/deprecate/{good,lib-warn,builtins-warn,warn-on-instantiate}`,
each `git init -q && git add -A`'d):

| command | `good` | `lib-warn` | `builtins-warn` | `warn-on-instantiate` |
|---|---|---|---|---|
| `nix flake show --no-write-lock-file <dir>` | exit 0, no warning | exit 0, **1** `evaluation warning:` line | exit 0, **1** line | exit 0, **0** lines |
| `nix build --no-write-lock-file --no-link <dir>#old-name` | n/a (no `old-name`) | exit 0, **1** line | exit 0, **1** line | exit 0, **1** line |
| `nix flake check --no-build --no-write-lock-file <dir>` | exit 0, "all checks passed!" | exit 0, **1** line, still passes | exit 0, **1** line | exit 0, **1** line |
| `nix eval --raw --option abort-on-warn true --no-write-lock-file <dir>#packages.x86_64-linux.old-name.outPath` | n/a | **exit 1**, `error: aborting to reveal stack trace of warning, as abort-on-warn is set` | **exit 1**, same | **exit 1**, same |
| `nix flake check --no-build --option abort-on-warn true --no-write-lock-file <dir>` (on `lib-warn`) | — | **exit 1** | — | — |
| `nix flake show --option abort-on-warn true --no-write-lock-file <dir>` (on `lib-warn`) | — | **exit 0** (abort swallowed) | — | — |

Exit codes above were captured directly (`echo $?` immediately after the
bare command, never through a `| tail` pipe, which masks the real exit
status with the pipe's last stage — a mistake caught and corrected mid-run).

**Flake-compat sources** (`fixtures/publishing-and-consumer-ux/compat-{nixos,community}`,
each locked via `nix flake lock ./compat-<x>`, `git add -A`'d after
locking):

| build | `compat-nixos` (`NixOS/flake-compat`) | `compat-community` (`nix-community/flake-compat`) |
|---|---|---|
| `nix-build <dir> --no-out-link` (CppNix 2.35.2) | exit 0, `/nix/store/…-octool-fixture-0.1.0` | exit 0, identical output path |
| `nix-shell <dir> --run "echo shell-ok"` (2.35.2) | exit 0, printed `shell-ok` | exit 0, printed `shell-ok` |
| `nix shell nixpkgs#nixVersions.nix_2_31 --command nix-build <dir> --no-out-link` | exit 0, same output path | exit 0, same output path |

(The `nix-shell` runs also printed a benign, unrelated
`error: file 'nixpkgs' was not found in the Nix search path` from
`bashInteractive`'s own fallback probe, then fell back to the environment's
bash and ran the command anyway — an artifact of this sandbox having no
`NIX_PATH`, not a flake-compat failure; the requested command still ran and
printed `shell-ok` in both cases.)

**README install patterns** (`fixtures/nix-flakes/skeleton-a`, read-only —
pre-existing fixture from the flakes wave):

| command | result |
|---|---|
| `nix run --no-write-lock-file skeleton-a#octool` | exit 0, printed `ran` |
| `nix profile add --profile <isolated>/profile --no-write-lock-file skeleton-a#octool` | exit 0; `nix profile list --profile <isolated>/profile` showed `Store paths: …-octool-0.1.0` |
| `nix build --no-write-lock-file .#default` in `readme-consumer` (a separate flake with `inputs.octool.url = "git+file://…/skeleton-a"`) | exit 0 (added both `nixpkgs` and `octool` inputs in-memory and built) |

`nix flake lock` (writing the lock, as opposed to `--no-write-lock-file`)
on `readme-consumer` failed with `error: … because it has an unlocked
input ('git+file://…/skeleton-a')` — `skeleton-a`'s own git tree is
dirty (an expected property of a fixture reused read-only across waves,
not a defect in the input snippet itself); the `--no-write-lock-file`
build path, which is what a consumer actually runs to try a dependency
before committing to it, is unaffected and succeeded.

## Exemplar evidence

- **Flake-compat source split**: `edolstra/flake-compat` cited in 10 repos
  including `cachix/cachix@3349ce74ba77:default.nix:1`,
  `NixOS/flake-compat` in `cachix/git-hooks.nix@0d3997c4d325:flake.nix` and
  `NixOS/nix@209d2bc44288:flake.nix`, `nix-community/flake-compat` in
  `numtide/treefmt@d68dddf6ac3a:flake.nix` and
  `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix` (spelled
  `"nix/flake-compat"` there) — all per
  [shape](../nix-audit/exemplar-flake-shape.md) §8.
- **`nix run` as the dominant install hint** where one exists at all:
  `DeterminateSystems/flake-checker`, `DeterminateSystems/nix-installer`,
  `Mic92/nixpkgs-review`, `Mic92/sops-nix`, `nix-community/home-manager`,
  `nix-community/nix-index`, `nix-community/nix-index-database`,
  `nix-darwin/nix-darwin`, `stackbuilders/nixpkgs-terraform`,
  `typst/typst` — [shape](../nix-audit/exemplar-flake-shape.md) §10.
- **`nix profile install`/`add`**: `cachix/cachix`, `oxalica/nil` — both
  predate the Nix 2.30 rename in their README prose (a live example of the
  README-staleness this file's rule targets).
- **Whole-output deprecation via `lib.warn`**: live in
  `nix-community/nix-index-database@161d7c91accd:flake.nix:35-40,49` —
  confirmed by direct fetch 2026-09-27, matching the pattern this file
  recommends for §3c.
- **`builtins.warn`/terraform-style package alias**: already documented at
  `stackbuilders/nixpkgs-terraform@a5893ca82ec3:flake.nix:50,61`
  ([gen](../nix-generated-flakes.md) §7, restated here as the
  package-attribute case of §3a rather than re-derived).
- **Template-init idiom, missed by the audit's original 4-pattern grep**:
  `ipetkov/crane`'s README (`nix flake init -t
  github:ipetkov/crane#quick-start`), `NixOS/templates`'s README
  (`nix flake init --template templates#full`),
  `numtide/blueprint`'s README (`nix flake init -t
  github:numtide/blueprint`) — all confirmed present, none counted by the
  original `nix run`/`nix profile install`/overlay/flake-input-snippet
  4-pattern regex.
- **`nix shell` idiom, also missed**: `cachix/nixpkgs-python@4d2bd16c09ba:README.md:99-103`
  (`nix shell github:cachix/nixpkgs-python#'"2.7"'`).
- **Contradicting a naive "every README needs an install line" rule**:
  `cachix/git-hooks.nix` and `nix-community/nixd` — both library/tool
  flakes with genuinely no install command to give, confirming NIX-REL-01's
  shape-conditioning is necessary, not decorative.

## AI-agent angle

- **Reaching for `nix-env -i` or a bare `nix-shell -p`** when asked to write
  a flake's install instructions — both are pre-flake idioms an agent's
  training data over-represents relative to 2026 practice. Smallest check:
  `grep -rn -e 'nix-env -i' -e 'nix profile install' . README.md` — the
  second pattern catches the *specific* dated spelling (`install` vs
  `add`) that looks current enough to survive casual review.
- **Citing `edolstra/flake-compat`** because it is the name every older
  blog post and Stack Overflow answer uses — the URL still resolves via
  GitHub's redirect, so the mistake never surfaces as a build failure,
  only as a maintainer squinting at an org name that no longer exists.
  Check: `grep -rn -e 'edolstra/flake-compat' --include='*.nix' .`.
- **Treating `lib.warn` and `lib.derivations.warnOnInstantiate` as
  interchangeable** ("just wrap it in a warn") — an agent picking whichever
  name pattern-matches "warn" will happily use plain `lib.warn` on a
  package meant to stay quiet in `nix flake show`, spamming every consumer
  who lists the flake's outputs instead of only the ones who build the old
  name. Check: run `nix flake show` on the flake before and after the
  change and diff the `evaluation warning:` line count — it must be zero
  unless the intent really is show-time visibility.
- **Reaching for `--option abort-on-warn true` as a "fail CI on
  deprecation" mechanism** because the name reads like exactly that — it
  is a debugger aid, documented as such in Nix's own source, and (as
  measured here) is inconsistently honored across `nix flake show` versus
  `nix build`/`nix flake check`, so an agent that "verifies" the gate using
  `nix flake show` will conclude it works when it silently does not.
  Check: run the *same* gate command CI actually uses (`nix flake check`,
  not `nix flake show`) with the flag, on both a clean and a
  deprecation-carrying fixture, and diff exit codes.
- **Assuming a public `nixConfig.extra-substituters` line makes a cache
  "just work" for consumers** — an agent reading `nix.dev`'s consumer-side
  binary-cache guide in isolation, without the flake-declared-config trust
  model, will add the block and believe it is done; nothing observably
  breaks (untrusted consumers just silently do not use it, and never say
  so). Check: the reading heuristic in NIX-REL-08 — if `nixConfig` declares
  a substituter, the README must say `accept-flake-config` is required.
- **Writing an upstream-bound `package.nix` without `passthru.updateScript`
  and without a real `meta.mainProgram`/`meta.license`** because those
  fields "don't affect whether it builds" — true for `nix build`, false for
  ever entering the `nixpkgs-update`/`@r-ryantm` ecosystem, which silently
  and permanently skips a package missing either. Check: `nix eval --json
  .#packages.<system>.<name>.meta | jq -e '.mainProgram and .license'`
  (already a Q7 check elsewhere; restated here as the specific reason it
  matters for upstreaming, not just for `nix run`).

## Contested / evolving

- **`lib.warn` vs `builtins.warn` as separate spellings** was a real
  distinction pre-2.23 (`lib.warn` emulated the behavior via `trace` plus a
  `NIX_ABORT_ON_WARN` environment variable,
  [NixOS/nixpkgs@7e35f59c1f82:lib/trivial.nix:21-40](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f82/lib/trivial.nix)).
  As of 2026-09-27, with this program's floor at nix_2_31, the distinction
  is dead in practice for any flake this program touches — but nixpkgs
  itself still ships the fallback branch for anyone building against an
  older Nix than 2.23, so the two names will keep coexisting in nixpkgs
  source even though they resolve identically here.
- **Whether a public binary cache is table stakes for a "high quality"
  flake** is unsettled in the wider community (FlakeHub, Cachix and
  self-hosted `attic` all compete for this), but trending toward "CI cache
  yes, public consumer-facing cache no by default" for small/medium
  projects specifically because of the trust-boundary cost this file
  documents (§5) — `magic-nix-cache`'s free tier ending 2025-02-01
  ([shift](../nix-topic-map/shifts.md) §9, already noted elsewhere) is a
  concrete data point in that direction, not just a hypothesis.
  Determinate Systems and FlakeHub continue to push the opposite direction
  (a vendor-hosted cache as a product feature); this file's Q2 default
  takes the no-cache-by-default side for the fleet specifically, not as a
  claim about where the ecosystem lands.
- **`pkgs/by-name` as the default location for *every* new package** is
  itself only a few years old and its edge cases (packages needing
  non-default `callPackage` arguments, multi-output packages) are still
  being smoothed over in nixpkgs CONTRIBUTING/README updates — this file's
  "write it by-name-shaped from day one" guidance rides that trend rather
  than fighting it, but a fleet package with unusual build arguments may
  need the `all-packages.nix` escape hatch the by-name README itself
  documents.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [nix.dev/concepts/flakes](https://nix.dev/concepts/flakes.html) | official Nix documentation, "Flakes" concept page | fetched 2026-09-27, Nix 2.35 era | names the non-flake alternatives explicitly ("Flake-only Nix" section cites flake-compat by name) and gives the official framing for when *not* to reach for a flake |
| [nix.dev/guides/recipes/dependency-management](https://nix.dev/guides/recipes/dependency-management.html) | official Nix documentation, npins recipe | fetched 2026-09-27 | the canonical non-flake dependency-pinning alternative, including NixOS 26.05's `system.nix` entrypoint as an even-newer non-flake path |
| [nix.dev/guides/recipes/add-binary-cache](https://nix.dev/guides/recipes/add-binary-cache.html) | official Nix documentation, binary-cache recipe | fetched 2026-09-27 | states the trust-boundary warning verbatim, grounding this file's cache stance |
| [`NixOS/flake-compat` README](https://raw.githubusercontent.com/NixOS/flake-compat/master/README.md) | primary source, the canonical non-flake bridge's own repo | fetched 2026-09-27; `edolstra/flake-compat` URL confirmed to redirect here | gives the exact `default.nix`/`shell.nix` bridging snippet cited in §2 |
| [`nix-community/flake-compat` README](https://raw.githubusercontent.com/nix-community/flake-compat/master/README.md) | primary source, the community fork | fetched 2026-09-27 | its own text ("no-longer maintained") is the finding that overturns conflict 10's open-choice framing |
| [`NixOS/nixpkgs` `lib/derivations.nix`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/lib/derivations.nix) | nixpkgs library source, pinned `7e35f59c1f82` | fetched 2026-09-27, nixpkgs master (26.11 era) | exact `warnOnInstantiate` implementation (line 254), the source of the "which attributes stay unwrapped" fact verified live in §3 |
| [`NixOS/nixpkgs` `lib/trivial.nix`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/lib/trivial.nix) | nixpkgs library source, pinned `7e35f59c1f82` | fetched 2026-09-27 | `lib.warn`'s actual definition (line 867), proving it is `builtins.warn` verbatim on Nix ≥2.23 |
| [`NixOS/nixpkgs` `lib/modules.nix`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/lib/modules.nix) | nixpkgs library source, pinned `7e35f59c1f82` | fetched 2026-09-27 | `mkRenamedOptionModule`/`mkRemovedOptionModule` (lines 1796, 1855), the module-option-rename mechanism distinct from `lib.warn` |
| [`NixOS/nix` `src/libexpr/primops.cc`](https://raw.githubusercontent.com/NixOS/nix/2.35-maintenance/src/libexpr/primops.cc) | Nix C++ evaluator source, `2.35-maintenance` branch | fetched 2026-09-27 | `prim_warn`'s actual implementation (lines ~1338-1363), the ground truth for what `abort-on-warn` does and when |
| [`NixOS/nixpkgs` `pkgs/by-name/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/pkgs/by-name/README.md) | nixpkgs contributor documentation, pinned `7e35f59c1f82` | fetched 2026-09-27 | the directory shape and the exact "only PRs to `pkgs/by-name` auto-merge" payoff sentence |
| [`NixOS/nixpkgs` `pkgs/README.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/pkgs/README.md) | nixpkgs contributor documentation, pinned `7e35f59c1f82` | fetched 2026-09-27 | the exact commit-message grammar and CI auto-build-scoping behavior |
| [`NixOS/nixpkgs` `CONTRIBUTING.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/CONTRIBUTING.md) | nixpkgs top-level contributor guide | fetched 2026-09-27 | cross-references the per-directory commit-convention docs; confirms `pkgs/README.md` is the authority for package commits specifically |
| [nixpkgs-update maintainer FAQ](https://raw.githubusercontent.com/nix-community/nixpkgs-update/main/doc/nixpkgs-maintainer-faq.md) | `nixpkgs-update`/`@r-ryantm`'s own documentation | fetched 2026-09-27 | the full, otherwise-undiscoverable list of silent skip conditions grounding §6's checklist |
| [nixpkgs-update details / r-ryantm docs](https://raw.githubusercontent.com/nix-community/nixpkgs-update/main/doc/details.md) | same project, mechanism detail | fetched 2026-09-27 | the rebuild-report/checks/cache mechanics referenced for the `passthru.tests` payoff |
| [`numtide/treefmt` `default.nix`](https://raw.githubusercontent.com/numtide/treefmt/main/default.nix) | exemplar corpus repo, live non-flake bridge in production use | fetched 2026-09-27 (repo's `main` at time of fetch) | the owner/repo/rev/narHash variant of the flake-compat bridge, the pattern this wave's fixtures follow |
| [`nix-community/nix-index-database` `flake.nix`](https://raw.githubusercontent.com/nix-community/nix-index-database/161d7c91accd93034bb3c295224d9d895a778573/flake.nix) | exemplar repo, live whole-tree deprecation in production | fetched 2026-09-27, pinned `161d7c91accd` | the real `hmModules`→`homeModules` and `legacyPackages`-wide `lib.warn` pattern cited in §3c |

## Procedures

### Procedure: `nix-flake-adopt` (consumer-ux and release steps)

Full procedure is M-K-01's; steps outside this file's family (shape choice,
`package.nix` authoring, devShell/formatter/checks scaffolding — NIX-FLK,
NIX-GATE) are named but not elaborated here. This wave owns steps 7-10.

1. Choose the flake shape (A/B/C/D) and write `package.nix` with a real
   builder and hash — `NIX-FLK` family; proven by `nix build` succeeding
   from a clean clone.
2. Wire the skeleton outputs (`packages`, `devShells`, `overlays.default`,
   `checks`, `formatter`) per `NIX-FLK-04/-11/-13/-15` — proven by
   `nix flake check --no-build` passing and `nix run .#<name> -- --version`
   exiting 0.
3. Add the gate block and CI workflow of record — `NIX-GATE-10..16` —
   proven by the CI job going green on a PR that touches nothing but the
   gate config.
4. If the index-driven generated flake applies (not this repo's own
   flake), follow `NIX-GEN-06/-18` instead of this file's package-level
   rules.
5. **Add the non-flake bridge** (`NIX-REL-03`): `default.nix`/`shell.nix`
   via `NixOS/flake-compat` (`inputs.flake-compat = { url =
   "github:NixOS/flake-compat"; flake = false; };`), never
   `edolstra/flake-compat` or `nix-community/flake-compat` — proven by
   `nix-build . --no-out-link` and `nix-shell .` both succeeding from a
   clean clone, and `grep -rn -e 'edolstra/flake-compat'
   -e 'nix-community/flake-compat' --include='*.nix' .` returning empty.
6. **Write the README install section** (`NIX-REL-01/-02`): the three-line
   template (`nix run`, `nix profile add`, flake-input snippet) for a
   shape-A/D flake; nothing for shape B — proven by running each command
   verbatim from a clean store and by `grep -rn -e 'nix-env -i'
   -e 'nix profile install' . README.md` returning empty.
7. **Decide the cache line, if any** (`NIX-REL-08`): default is none; if
   the project already has one, the README states the trust requirement —
   proven by the reading pairing in NIX-REL-08 (no automated fixture).
8. **Shape `package.nix` by-name-ready** (`NIX-REL-09`) even without an
   upstreaming decision yet — proven by no parent-directory-relative
   references inside the package file.
9. Modernize an existing flake being adopted (the branch this row's
   M-K-05 covers): `flake-utils` → `genAttrs`, `nixfmt-rfc-style`/
   `nixfmt-classic` → `nixfmt`, `defaultPackage`/`devShell`/`overlay` →
   the plural forms — `NIX-FLK-04` and conflicts 1, 5, 15 — proven by the
   gate's Q9/Q10 greps returning empty post-migration.
10. Land the flake with all of steps 1-9 green in one PR; do not upstream
    to nixpkgs yet (owner Q3 default, `NIX-REL-10`'s checklist is
    satisfied but the submission itself is deferred).

### Procedure: `nix-flake-release`

Full procedure is M-K-02's; version-sync and build-matrix steps belong to
other rule families and are named, not elaborated, here.

1. Run the gate block plus `--all-systems` plus the build matrix plus the
   Lix advisory leg — `NIX-GATE-10..16` — proven by every leg reporting
   green on the release commit specifically (not a stale prior run).
2. Sync the package's `version` attribute to the manifest
   (`M-G-01`/`NIX-GATE` family) — proven by Q14 (`nix eval --raw
   .#packages.<system>.default.version` equals the manifest).
3. Refresh the lock in its own commit, before tagging, never at tag time
   (`M-G-05`) — proven by a clean `git diff` on `flake.lock` after the
   tag commit.
4. **Deprecate any output being renamed or removed as part of this
   release** (`NIX-REL-04/-05/-06`): a single-package rename needing
   show-time visibility gets `lib.warn`/`builtins.warn`; a rename that
   should stay quiet until build gets `warnOnInstantiate`; a whole-tree
   rename wraps the tree the way `nix-index-database` does; a module
   option rename uses `mkRenamedOptionModule` instead — proven by the
   firing matrix in §3 re-run against this release's actual diff
   (`nix flake show` and `nix flake check --no-build` both exercised, not
   just one).
5. **Confirm the CI gate never carries `--option abort-on-warn true`**
   on any step that runs `nix build`/`nix flake check` if step 4 added a
   warning (`NIX-REL-07`) — proven by `grep -rn -e 'abort-on-warn'
   .github/workflows` returning empty, and by that gate step's own exit
   code staying 0 with the new warning present.
6. Tag the release `vX.Y.Z` through the project's existing tagging
   (cargo-dist or equivalent) — never invent a flake-only version scheme
   (conflict 9, `M-G-03`) — proven by `nix flake metadata
   github:<owner>/<repo>/vX.Y.Z` resolving and Q14 equalling `X.Y.Z`.
7. Run `nix run github:<owner>/<repo>/vX.Y.Z` from a clean store as the
   final smoke test — the same command the README's install section
   promises (`NIX-REL-02`) — proven by that exact invocation succeeding,
   not a `path:`/local-clone stand-in.
8. Cache push is optional and stays off by default (`NIX-REL-08`,
   owner Q2) — if enabled, proven by the README's trust-requirement
   sentence being present alongside the `nixConfig` entry.
9. nixpkgs bump/upstreaming submission is optional and deferred to owner
   Q3 — if this release is the trigger (first stable release), confirm
   `NIX-REL-09`'s by-name shape and `NIX-REL-10`'s updateScript/opt-out
   checklist before opening the nixpkgs PR, using the exact commit
   grammar from `pkgs/README.md` (`pkg-name: init at X.Y.Z`).
