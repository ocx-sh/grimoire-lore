---
title: "Flake versioning, tags, FlakeHub stance, and release lock policy"
topic: "Version strings, self metadata under 2.35, tags and pins, FlakeHub stance, lock policy at release"
agent: "release/versioning-and-tags"
model: sonnet
date_researched: 2026-09-27
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/versioning-and-tags/
scope: |
  Covers: where a flake-built package's `version` string comes from, what
  self.rev/shortRev/dirtyRev/dirtyShortRev/lastModified(Date)/revCount actually
  evaluate to per ref type (path:, git+file:, github:, tarball) and per tree
  state (clean/dirty) on Nix 2.35.2; drvPath churn from embedding a revision;
  tag/pin syntax a consumer uses; the FlakeHub stance (mechanics only, per
  owner Q1 default: no publishing, no FlakeHub inputs); nix-update --flake at
  release time; the compatibility promise a flake can make while flakes stay
  experimental (RFC 136).
  Does not cover: the flake outputs schema itself, gate/CI mechanics, or
  nixpkgs upstreaming mechanics (owned by nix-flakes.md/NIX-FLK, nix-gates.md/
  NIX-GATE, and M-G-09 respectively) beyond what versioning depends on; cargo/
  go/npm hash-regeneration mechanics belong to rust-cargo/go-modules (cited,
  not restated).
---

## Table of contents

1. [The version rule](#1-the-version-rule)
2. [self metadata by ref type and tree state](#2-self-metadata-by-ref-type-and-tree-state)
3. [drvPath churn: revision in version vs. in an env var](#3-drvpath-churn-revision-in-version-vs-in-an-env-var)
4. [Tag format and consumer pin syntax](#4-tag-format-and-consumer-pin-syntax)
5. [FlakeHub stance (mechanics only)](#5-flakehub-stance-mechanics-only)
6. [Lock policy at release](#6-lock-policy-at-release)
7. [nix-update --flake at release time](#7-nix-update---flake-at-release-time)
8. [Compatibility promise while flakes stay experimental](#8-compatibility-promise-while-flakes-stay-experimental)
9. [Normative guidance candidates](#normative-guidance-candidates)
10. [Verification runs](#verification-runs)
11. [Exemplar evidence](#exemplar-evidence)
12. [AI-agent angle](#ai-agent-angle)
13. [Contested / evolving](#contested--evolving)
14. [Sources](#sources)

## Summary

- Read `version` from the project's own manifest (`lib.importTOML ./Cargo.toml` → `.workspace.package.version` or `.package.version`, or `pyproject.toml`'s `[project].version`) — never a duplicated literal, never `self.shortRev or "dirty"` as the whole version.
- Never interpolate a fetcher-derived `src` into the path you read the manifest from (`"${src}/Cargo.toml"`): it forces Nix to realize (fetch/build) that derivation at *evaluation* time, and it goes red under `nix flake check --no-build --option allow-import-from-derivation false` — verified below, exit 1 vs exit 0.
- `self.rev`/`self.shortRev`/`self.revCount` exist **only** on a clean tree fetched through a real fetcher (`git+file:`, `github:`); `path:` gives none of them, ever — verified below.
- On a dirty `git+file:` tree, `self.rev`/`self.shortRev`/`self.revCount` are all **absent**; only `self.dirtyRev`/`self.dirtyShortRev` (suffixed `-dirty`) exist, and `self.lastModified`/`lastModifiedDate` freeze at the **last commit**, not the edit time — verified below.
- `github:` refs give `rev`/`shortRev`/`lastModified(Date)` but **never** `revCount` (tarball fetch, no git history) — matches the manual's own caveat; verified against a real repo.
- A plain HTTPS archive-tarball ref gives only `lastModified(Date)`; no `rev` at all, not even from a GitHub archive URL — verified.
- Embedding the revision **anywhere** the derivation reads it — in `version` or in a build-time env var — forces a new `drvPath` on **every** commit, including commits that touch nothing the package's own (filtered) source includes; moving the rev from `version` into an env var does **not** stop this churn (measured, both twins changed on a README-only commit; only the twin that reads no `self.rev` at all was stable).
- `nix eval --json` on any attribute set that happens to carry an `outPath` key silently collapses the **entire object** to just that `outPath` string, discarding every sibling field — a genuine trap for anyone debugging `self`'s metadata with `--json`; per-field access (`#attr.field`) is unaffected. Not previously documented in the map.
- Release tags have no corpus-wide convention (10/37 exemplars never tagged; `vX.Y.Z`, bare semver, dates, and CI-bot timestamps all coexist — [shape §10](../nix-audit/exemplar-flake-shape.md)); a fleet flake keeps its existing cargo-dist `vX.Y.Z` tags and invents no separate flake version.
- A consumer pins a release with `github:<owner>/<repo>/vX.Y.Z` (resolves to a locked `rev`; `.original.ref` keeps the tag string, `.locked.ref` is `null` since `github:` is a tarball fetch) — verified live against `sxyazi/yazi`.
- **A tagged release does not guarantee `version` equals the tag.** `sxyazi/yazi@0ea4c5d9ef75` reads a clean `26.9.1` from `Cargo.toml` at tag `v26.9.1`, but its flake unconditionally appends `pre${date}_${rev}`, so the actual Nix `version` at that exact tag is `26.9.1pre20260901_8dd895c` — verified live. Copying this pattern breaks the "version equals tag at release" rule that a reviewer should otherwise expect.
- FlakeHub is **not adopted** (owner Q1 default): record its mechanics, prototype nothing. Its resolver is highest-semver-wins; a rolling release (`0.1.<commit-count>`) published after any real tag ≥0.2.0 is **permanently invisible** to unpinned consumers — confirmed live against `imTHAI/nix-packages`'s own workflow comment, which now auto-tags instead of using rolling releases for exactly this reason.
- FlakeHub tagged and rolling releases must never mix on the same flake once a real tag exists; if FlakeHub is ever adopted, tagged-only.
- The lock is refreshed before a release, as its own commit, never bundled into the tag commit and never generated *by* tagging.
- `nix-update -F --version=<tag>` correctly re-derives a `rev = "v${finalAttrs.version}"`-style attribute and correctly computes the real fixed-output hash via the standard hash-mismatch trick (verified: real hash obtained for a bumped GitHub tarball fetch) — but it will **not** discover a new `rev` from a literal (non-interpolated) `rev = "v0.2.14";`, so nixpkgs-idiomatic version-driven `rev` interpolation (via `finalAttrs`) is a prerequisite for automated bumps, not an optional style choice.
- Flakes remain experimental in CppNix 2.35.2 under RFC 136 ("stabilize-incrementally", opened 2022-09-15): the RFC explicitly permits breaking changes to flakes/new-CLI until stabilized, and stabilizes the non-flake CLI *first* — a published flake's only honest compatibility promise is "works against the pinned CppNix version and the stated floor `nixVersions.nix_2_31` (2.31.5)," never "flakes are stable."

## Findings

### 1. The version rule

**Manifest source, never a duplicated literal.** [Conflict 8](../nix-topic-map.md) resolves this from corpus measurement: `fromTOML`/`importTOML` reads in 10/37 repos, `self.shortRev`-family reads in 10/37, hardcoded literals in 16/37 (259 occurrences total) — [shape §4](../nix-audit/exemplar-flake-shape.md). nixpkgs' own convention: `version` *must* start with a digit and an untagged commit gets `<last>-unstable-<YYYY-MM-DD>`, never a bare hash ([`pkgs/README.md` "Versioning"](https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md#versioning), lines 462-475, fetched 2026-09-27).

Compliant (`good-version` fixture):
```nix
version = (pkgs.lib.importTOML ./Cargo.toml).workspace.package.version;
```
Non-compliant, the exact shape that goes red (`bad-version` fixture, mirroring the mechanism behind `sxyazi/yazi@0ea4c5d9ef75d7165c2e3b4eb8d713fc11f26c96:nix/yazi-unwrapped.nix:23` reading `cargoLock.lockFile = "${src}/Cargo.lock"`):
```nix
version = (pkgs.lib.importTOML "${src}/Cargo.toml").workspace.package.version;
```
The difference is not cosmetic: `./Cargo.toml` is read from the flake's *own* source tree (already present once the flake is fetched — no extra realization needed); `"${src}/Cargo.toml"` string-interpolates a *derivation output path*, which forces Nix to build/fetch that derivation **during evaluation**, before any build step runs. Verified in [§10](#verification-runs): `nix flake check --no-build --option allow-import-from-derivation false` exits 0 on the compliant fixture and exits 1 with `error: cannot build '…-does-not-exist.tar.gz.drv^out' during evaluation because the option 'allow-import-from-derivation' is disabled` on the violation. A plain `nix eval` of `.version` (IFD allowed by default) instead **attempts a real network fetch** at eval time and fails there if unreachable — either way, this is not something a version-string read should ever trigger.

Note: `sxyazi/yazi`'s actual `flake.nix:35` reads `./Cargo.toml` directly (the *compliant* shape); the src-interpolated read is confined to `nix/yazi-unwrapped.nix:23`'s `cargoLock.lockFile`, which is idiomatic there because `buildRustPackage` needs the lock file to live *inside* the filtered `src` it will actually build (a `lib.fileset.toSource` local path, realized cheaply, not a remote fetch) — the rule is about a **remote-fetcher-backed** `src` used for a **manifest read that decides `version`**, not about `cargoLock.lockFile` pointing at a local filtered source in general.

**Revision is metadata, not version.** [Conflict 8](../nix-topic-map.md): a build that wants the revision receives it through a separate value (env var, `--version` flag string, or a distinct attribute), never folded into `version` itself, and this accepts a rebuild per commit (§3 below confirms it does not avoid this anyway — the benefit is a clean, tag-equal `version` string, not fewer rebuilds).

**Generated per-package files are exempt.** Files a generator must keep `nix-update`-editable carry inline version literals by design (`numtide/llm-agents.nix`, 107 hardcoded-version hits, one per package definition) — not a finding there ([shape §4](../nix-audit/exemplar-flake-shape.md), conflict 8 resolution).

### 2. self metadata by ref type and tree state

Nix 2.35.2's own documentation of `self`/input metadata ([`src/nix/flake.md` at tag `2.35.2`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md), lines 434-457) lists `outPath`, `rev`, `revCount`, `lastModifiedDate`, `lastModified`, `narHash` and explicitly notes: *"`revCount`… is not available for `github` repositories, since they're fetched as tarballs rather than as Git repositories"* and *"`lastModifiedDate`… Unlike `revCount`, this is available for both Git and GitHub repositories."* `shortRev`/`dirtyRev`/`dirtyShortRev` are not documented on that page at all (confirmed by direct fetch) — their behavior below is empirical, run against the `self-attrs` fixture (a git repo tagged `v1.0.0` at commit `39ca012`).

| ref | rev | shortRev | dirtyRev | dirtyShortRev | lastModified(Date) | revCount |
|---|---|---|---|---|---|---|
| `path:<dir>` (clean) | MISSING | MISSING | MISSING | MISSING | present | MISSING |
| `git+file:<dir>` (clean, HEAD) | `39ca012152cc…` | `39ca012` | MISSING | MISSING | present | `1` |
| `git+file:<dir>?ref=v1.0.0` | same as HEAD (tag = HEAD) | same | MISSING | MISSING | present | `1` |
| `git+file:<dir>` (**dirty** tree) | MISSING | MISSING | `39ca012…-dirty` | `39ca012-dirty` | present, **frozen at last commit**, not edit time | MISSING |
| `github:numtide/flake-utils/<full-sha>` (real repo) | full sha | short sha | — | — | present | MISSING |
| `https://…/archive/<sha>.tar.gz` (plain tarball, same repo/rev) | MISSING | MISSING | — | — | present | MISSING |

Exact commands and raw output are in [§10](#verification-runs). Three points worth stating plainly because no primary source documents them together:

1. **`path:` never carries any git identity**, clean or dirty — it is a plain directory copy. Anyone expecting `self.rev` on a `path:`-referenced flake (a common local-dev habit) gets `MISSING` unconditionally, not an error, so `self.rev or "fallback"` silently takes the fallback branch every time under `path:`.
2. **Dirty git+file drops `rev`/`shortRev`/`revCount` entirely** rather than appending a suffix to them — the correct pattern is `self.shortRev or self.dirtyShortRev or "unknown"`, never `self.shortRev or "dirty"` (which produces the *literal string* `"dirty"`, discarding the actual short hash the dirty variant would have given you). `lastModifiedDate` stays at the last **commit**'s time even with uncommitted changes, so a version scheme that trusts `lastModifiedDate` alone to track "how stale is this build" is measuring commit age, not edit age.
3. **A GitHub archive tarball URL gives strictly less than the `github:` shorthand**: same `lastModified(Date)`, but no `rev`/`shortRev` at all, even though the URL embeds the same commit SHA a human can read. Do not assume "if the URL has a SHA in it, `self.rev` will too."

### 3. drvPath churn: revision in version vs. in an env var

Fixture `drv-churn`: three packages sharing one `lib.fileset`-filtered `src` (`Cargo.toml` + `src/`, explicitly **excluding** `README.md`) — `baseline` (never reads `self.rev`), `version-embeds-rev` (`version = "1.0.0+${rev}"`), `env-var-embeds-rev` (`version = "1.0.0"`; `GIT_REV` env var set to `rev`). Two commits: initial, then an **unrelated** commit that only adds/edits `README.md` (outside the filtered `src`).

| package | drvPath @ pre-README commit | drvPath @ post-README commit | changed on an unrelated commit? |
|---|---|---|---|
| `baseline` | `…-drv-churn-baseline-1.0.0.drv` | **identical** | No |
| `version-embeds-rev` | `…-1.0.0+a21af03.drv` | `…-1.0.0+45594b6.drv` | **Yes** |
| `env-var-embeds-rev` | `…-1.0.0.drv` (content differs) | `…-1.0.0.drv` (content differs) | **Yes** (path differs even though the printed name doesn't) |

This directly answers M-G-14/M-G-02's implicit question and corrects a plausible-sounding assumption: **moving the revision from `version` into an env var does not reduce rebuild churn** — both approaches read `self.shortRev`, and `self.shortRev` changes on *every* commit anywhere in the repository, regardless of whether the change touches the package's actual (filtered) source. Only the variant that reads no revision at all is immune to unrelated-commit churn. The real benefit of "revision in an env var, not in `version`" is exactly what [conflict 8](../nix-topic-map.md) already states: a clean, tag-equal `version` string for humans and tools — it is not a caching optimization, and no rule should claim it is one.

### 4. Tag format and consumer pin syntax

No corpus-wide tag convention exists: 10/37 exemplars have zero tags; `vX.Y.Z` (majority), bare semver (`nix-community/nixd`, `NixOS/nix`), ISO dates (`oxalica/nil`), and CI-bot timestamps (`nix-community/nix-index-database`, 288 tags, one per automated database refresh, not a human release) all coexist — [shape §10](../nix-audit/exemplar-flake-shape.md). `nix-darwin/nix-darwin` versions purely through `CHANGELOG.md` prose with **no tags at all**.

Consumer pin syntax, verified live:
```sh
$ nix flake metadata "github:sxyazi/yazi/v26.9.1" --json | jq -r '.resolvedUrl, .locked.rev, .original'
github:sxyazi/yazi/v26.9.1
8dd895c695a5950330c2623eb43debf323b60654
{ "owner": "sxyazi", "ref": "v26.9.1", "repo": "yazi", "type": "github" }
```
`.original.ref` preserves the tag string a human wrote; `.locked.ref` is `null` (a `github:` fetch is a tarball fetch, and per §2, `revCount`/full git identity are unavailable there — only `.locked.rev` and `.locked.narHash` pin it exactly).

**Tag ≠ manifest version, even measured live at the exact tag.** `sxyazi/yazi`'s `Cargo.toml` at `v26.9.1` reads a clean `26.9.1`:
```sh
$ nix eval --raw --impure --expr \
    'let f = builtins.getFlake "github:sxyazi/yazi/v26.9.1"; in
     (builtins.fromTOML (builtins.readFile "${f}/Cargo.toml")).workspace.package.version'
26.9.1
```
but the flake's actual `packages.default.version` at that same tag is:
```sh
$ nix eval --raw "github:sxyazi/yazi/v26.9.1#packages.x86_64-linux.default.version"
26.9.1pre20260901_8dd895c
```
because `sxyazi/yazi@0ea4c5d9ef75:flake.nix:34-36` appends `"pre${date}_${rev}"` to *every* build, tagged release or not:
```nix
version =
  (builtins.fromTOML (builtins.readFile ./Cargo.toml)).workspace.package.version
  + "pre${builtins.substring 0 8 date}_${rev}";
```
This is a real, widely-copied exemplar directly **violating** the "version equals the tag at a release" ideal that [conflict 8](../nix-topic-map.md) states as resolved — see [§9 Contested](#contested--evolving) and [§12 AI-agent angle](#ai-agent-angle).

### 5. FlakeHub stance (mechanics only)

Per owner Q1 (default: no publishing, no FlakeHub inputs), this section is read-and-record only — no `flakehub-push` prototype was built.

- **Resolution**: FlakeHub's SemVer subset supports exact match (`=0.1.15`) and wildcards (`*`, `1.*`, `1.2.*`); `*` "always uses the highest published version" ([FlakeHub semver concepts](https://docs.determinate.systems/flakehub/concepts/semver/), fetched 2026-09-27). Tagged releases resolve `https://flakehub.com/f/:org/:project/:tag`.
- **Rolling releases** encode `0.1.<commit-count>` (major fixed at 0, minor fixed at 1, patch = number of commits on the tracked branch) — [practitioner §15](../nix-topic-map/practitioner.md), e.g. Helix's rolling release was `0.1.6953`.
- **The invisibility failure, confirmed against its own primary source**: once *any* real tag ≥ 0.2.0 exists, every rolling release published afterward is permanently shadowed, because FlakeHub's `*` resolver picks highest-semver, not most-recent-publish. `imTHAI/nix-packages`' own current workflow comment (`.github/workflows/flakehub-publish-auto.yml@master`, fetched 2026-09-27) states this explicitly and describes switching away from rolling releases specifically to fix it:
  > *"Rolling releases never win FlakeHub's 'latest' resolution once a real semver tag exists — FlakeHub picks the highest semver, not the most recent publish — so a manual tag like v0.3.0 silently and permanently shadowed every rolling release pushed after it, even though those kept publishing successfully under the hood."*
- **Conclusion (owner Q1 applies)**: fleet flakes take no FlakeHub input and publish nothing to FlakeHub in v1. If ever adopted, tagged-only, never mixed with rolling on the same flake ([M-G-04](../nix-topic-map.md)).
- **Best practices worth recording without adopting them**: "one flake per versioned thing" ([FlakeHub best practices](https://docs.determinate.systems/flakehub/best-practices/)); keep flakes private unless public distribution is the explicit goal; Flake Checker Action + update-flake-lock Action for lock freshness (both usable independently of FlakeHub itself).

### 6. Lock policy at release

`nix flake check` and CI both consume whatever `flake.lock` is committed; a tag commit and a lock-refresh commit are logically separate actions and should stay separate commits ([M-G-05](../nix-topic-map.md), lock-churn rows in [codified.md](../nix-topic-map/codified.md), lock-age data in [shape §2](../nix-audit/exemplar-flake-shape.md)). Practical sequence for a fleet flake:
1. Refresh the lock (`nix flake update` or the scoped `nix flake lock --update-input nixpkgs`) as its own commit, reviewed like any dependency bump.
2. Run the full gate block (format, deadnix, statix, `nix flake check`, build) against the refreshed lock.
3. Tag the release commit that already contains the refreshed, checked lock — never regenerate the lock *as part of* tagging, and never let a release tag point at a commit whose lock is stale relative to what CI last verified.

A shallow, detached CI checkout is **not** dirty under Nix 2.35.2 for this purpose (already settled: [nix-gates.md V22, M-F-15](../nix-topic-map.md) — cited, not re-derived here) — so a release workflow does not need defensive `fetch-depth: 0` gymnastics to avoid a false `-dirty` suffix on the tag build itself.

### 7. nix-update --flake at release time

`nix-update --help` (toolchain build `nix-update` 1.16.0, fetched 2026-09-27) confirms `-F`/`--flake` ("Update a flake attribute instead"), `--version [VERSION]`, `--src-only` ("Only update the source, not dependencies such as npmDeps, cargoDeps or nugetDeps"), `--build`, `--generate-lockfile`.

Verified against the `nix-update-probe` fixture (`stdenv.mkDerivation (finalAttrs: { … })`, `src = fetchFromGitHub { rev = "v${finalAttrs.version}"; hash = lib.fakeHash; }`, pinned at `v0.2.14`):

```sh
$ nix-update -F --version=0.2.15 --src-only flake-checker-probe
Update 0.2.14 -> 0.2.15 in …/package.nix
```
— `version` is bumped textually in place; because `rev` is written as `"v${finalAttrs.version}"`, the *next* internal evaluation step correctly re-derives `rev = "v0.2.15"` and fetches the real `v0.2.15` tarball to discover its hash (confirmed by replaying nix-update's own internal `nix-build … outputHash=""` command directly: `error: hash mismatch … got: sha256-J0RAJJdpKYgMeV8+aojCRKVkXWa4PzdaAJHLjZInB4E=`).

**Two things a reviewer must know:**
- **`rev` must be version-interpolated (via `finalAttrs`, not a bare sibling-attribute reference) for the bump to work at all.** A literal `rev = "v0.2.14";` with no interpolation left `rev` untouched after the version bump (confirmed: `git diff` showed only `version` changed, hash unchanged) — nix-update has no way to know the two are linked unless the file says so structurally. A naive `rev = "v${version};"` **without** `rec`/`finalAttrs` is a hard eval error (`error: undefined variable 'version'`) — confirmed. The nixpkgs-idiomatic fix is `stdenv.mkDerivation (finalAttrs: { … rev = "v${finalAttrs.version}"; … })`.
- **In this run.sh (nested-bwrap) environment, nix-update discovered the correct new hash internally but did not write it back to the file** (`git diff` after a full, exit-0 run still showed `lib.fakeHash`); manually applying the hash it printed via its own subprocess call produced a cleanly evaluating derivation. This looks like a sandboxing artifact of nix-update's own `nix-build` subprocess running inside our nested bwrap (a benign `error (ignored): filesystem error: cannot rename: Permission denied` appears in that subprocess's output) rather than a general Nix fact — flagged here as an environment caveat, not a normative claim about `nix-update` itself.

`cargoHash`/`vendorHash`/`npmDepsHash` regeneration across a nixpkgs channel bump (M-G-14) is owned by the sibling packaging rules (`rust-cargo`, `go-modules`); the one release-sequencing fact worth stating here: `buildRustPackage` switched its default vendoring to `fetchCargoVendor` in nixpkgs 25.05, which changes **every** `cargoHash` even with no version bump of the package itself, and `cargoSha256` (pre-SRI) hard-errors (not merely warns) since that same release ([shifts.md](../nix-topic-map/shifts.md)) — so a release that also bumps the pinned nixpkgs input needs its cargo hashes re-verified in the same change, not assumed stable.

### 8. Compatibility promise while flakes stay experimental

Flakes are still an experimental feature in CppNix 2.35.2 (confirmed live against the manual's experimental-features list, 2026-09-27 — [shifts.md](../nix-topic-map/shifts.md)). [RFC 136 "stabilize-incrementally"](https://raw.githubusercontent.com/NixOS/rfcs/master/rfcs/0136-stabilize-incrementally.md) (opened 2022-09-15, fetched directly 2026-09-27) is the only governing plan and states explicitly:

> *"Notably we are allowed to make breaking changes to experimental features, which includes both the new CLI and Flakes, until they are stable."*

and its stabilization order is CLI first, flakes second — *"Afterwards, Flakes itself and its CLI components can be stabilized. The final design of Flakes will also require another RFC."* No date is committed. RFC 49 (the original flakes RFC) was never accepted; flakes shipped as an experimental feature outside that process.

**The honest compatibility promise a published flake can state**, given this:
- Tested and gated against a **specific pinned CppNix version** (the CI's installed version), never "Nix" unqualified.
- A stated **floor**: the oldest non-stub `nixVersions.nix_2_*` in the pinned nixpkgs channel — measured 2026-09-27, `nixVersions.nix_2_31.version` = `2.31.5` (the frame's computed floor; `nix_2_24` is a stub that throws `"has been removed. use nix_2_31."` in nixpkgs 26.11 — [nix-audit/exemplar-tool-runs.md:107](../nix-audit/exemplar-tool-runs.md)). This is a **relative** floor recomputed at each release against whatever channel is pinned, never a hardcoded number that survives a nixpkgs bump.
- No promise that `flake.lock`'s schema, `self` metadata surface, or CLI flag names are stable across a Nix upgrade — only that the flake was last verified against the stated version.
- No reliance on Determinate-Nix-only or Lix-only behavior (lazy trees, flake `schemas`, parallel eval) as a silent assumption; those are advisory legs, not the compatibility baseline ([conflict 11](../nix-topic-map.md), [conflict 15](../nix-topic-map.md)).

## Normative guidance candidates

1. **A flake-built package's `version` reads the project's own manifest via `lib.importTOML`/`fromTOML` on a self-tree path (`./Cargo.toml`, `./pyproject.toml`), never a duplicated literal and never a `src`-interpolated path.**
   Rationale: a duplicated literal drifts from the manifest; a `src`-interpolated read forces derivation realization during evaluation.
   Verify: `nix flake check --no-build --option allow-import-from-derivation false <flake>` — exit 0 on a compliant flake, non-zero (`… during evaluation because the option 'allow-import-from-derivation' is disabled`) on one that string-interpolates a fetcher-backed `src` into a manifest read.
   RUN: **yes** — `good-version` fixture exit 0; `bad-version` fixture exit 1 with the exact error text above (`fixtures/versioning-and-tags/{good,bad}-version`).

2. **`version` never embeds a commit revision; a caller that wants the revision receives it through a separate value (env var, flag, distinct attribute).**
   Rationale: embedding rev in `version` breaks "version equals the tag at release" (§4) without buying fewer rebuilds (§3) — it only costs cleanliness.
   Verify: `nix eval --raw <flake>#packages.<system>.default.version | grep -v -e '^[0-9]' ` (a rule-of-thumb: version should start with a digit and contain no un-annotated hash fragment); reading heuristic plus the drvPath-churn comparison.
   RUN: **yes**, for the churn half — `drv-churn` fixture: baseline drvPath unchanged across an unrelated commit, both rev-carrying twins changed (§3, §10).

3. **`self.rev`/`self.shortRev`/`self.revCount` are read only with a fallback chain that includes `self.dirtyShortRev`, and never assumed present under a `path:` reference.**
   Rationale: `path:` never carries git identity; a dirty tree drops `rev`/`shortRev` entirely rather than suffixing them.
   Verify: `nix eval --json "path:<dir>#<attr>.rev"` must equal the fallback value (not error) on a `path:` ref; `nix eval --json "git+file:<dir>#<attr>.dirtyRev"` must be present (not the fallback) on a dirty tree.
   RUN: **yes** — `self-attrs` fixture, clean/dirty × `path:`/`git+file:` matrix in §10.

4. **A `nix eval --json`/`--json`-based debug or CI script never serializes a whole `self`-shaped attrset (one containing `outPath`); it selects individual fields.**
   Rationale: Nix's JSON printer coerces any attrset carrying an `outPath` key to that single string, silently dropping every sibling field — a script that logs `self` as JSON for debugging gets only a store path back, not the rev/date/etc. it expected.
   Verify: `nix eval --json --impure --expr '{ outPath = builtins.toString ./.; a = "x"; }'` must print `"x"` somewhere in the result to pass; it does not (prints only the path) — this is itself the check: if a `--json` dump of a `self`-shaped value equals just a store path, the coercion fired.
   RUN: **yes** — reproduced with a minimal expr and with the fixture's own `self`-shaped `info` attrset (§10).

5. **A published flake's release tag is the project's own existing `vX.Y.Z` (or whatever scheme it already uses for non-Nix releases); the flake invents no separate version and no separate tag scheme.**
   Rationale: no corpus convention exists to converge on (conflict 9); inventing a second scheme doubles the release surface for no resolvable benefit outside FlakeHub, which is not adopted (Q1).
   Verify: `nix flake metadata github:<owner>/<repo>/<tag> --json | jq -e '.original.ref == "<tag>"'` resolves without error for the project's actual release tags.
   RUN: **yes** — live against `github:sxyazi/yazi/v26.9.1` (§4, §10).

6. **A tagged release's `version` output equals the tag's numeric portion exactly — no unconditional snapshot suffix (`pre<date>_<rev>`) applied at a tagged, clean commit.**
   Rationale: `sxyazi/yazi` violates this live (§4); a reviewer must catch this pattern specifically because it is copied from a popular, otherwise-well-regarded exemplar.
   Verify: at a release tag, `nix eval --raw "<flake-ref>#packages.<system>.default.version"` must equal the numeric tag with no non-numeric suffix; a `+`/`pre`/date/hash suffix present at an exact tag ref is a finding.
   RUN: **yes** — live comparison in §4/§10 (`26.9.1` in Cargo.toml vs `26.9.1pre20260901_8dd895c` as the built version, at the same tag).

7. **A fleet flake takes no FlakeHub input and publishes to no FlakeHub target, per owner Q1; if this default is ever revisited, tagged-only, never rolling, and never mixed with rolling on the same flake.**
   Rationale: rolling releases are permanently shadowed by any subsequent real tag ≥ 0.2.0 under FlakeHub's highest-semver-wins resolver — confirmed by a maintainer who hit exactly this and switched away from rolling releases specifically to fix it.
   Verify: `grep -rn -e 'flakehub.com' -e 'flakehub-push' -e 'DeterminateSystems/flakehub' . --include='*.nix' --include='*.yml' --include='*.yaml'` — empty is the expected/compliant state for a fleet flake under Q1.
   RUN: **no**, reading-heuristic + primary-source citation only (`imTHAI/nix-packages` workflow comment) — no prototype built, per the brief's explicit instruction not to prototype flakehub-push.

8. **The lock is refreshed and verified as its own commit before a release tag is cut; the tag commit's lock is never regenerated as part of tagging, and CI's last green check ran against the exact lock the tag points at.**
   Rationale: separates "did the dependency bump pass the gate" from "is this the release we meant to cut"; conflates lock churn with release provenance otherwise.
   Verify: `git log -1 --format=%H -- flake.lock` at the tag commit must be an ancestor commit of (or equal to) the tag, never a commit *after* it; `nix flake check` was run and passed at that lock's exact `narHash`, not re-derived post-tag.
   RUN: **no**, reading heuristic (process/sequencing rule, not a single evaluable expression); the underlying "shallow checkout is not dirty" precondition is separately confirmed settled ([nix-gates.md V22, M-F-15](../nix-topic-map.md)).

9. **A version-driven `rev`/hash bump (`nix-update -F --version=<tag>`) requires the derivation to write `rev` as an interpolation of `version` (via `finalAttrs`), not a bare literal or a plain sibling-attribute reference.**
   Rationale: nix-update has no other way to discover that `rev` should change when `version` does; a plain sibling reference (no `rec`/`finalAttrs`) is a hard Nix eval error, and a disconnected literal silently fails to update.
   Verify: run `nix-update -F --version=<newtag> --src-only <attr>` on the fixture twice — once with a bare `rev = "v0.2.14";` literal (hash/rev unchanged after the run) and once with `rev = "v${finalAttrs.version}"` (the internal hash-mismatch build fetches the *new* tag and reports the correct new hash).
   RUN: **yes** — both variants run against `nix-update-probe` fixture (§7, §10); write-back of the hash itself did not complete in this sandboxed environment and is flagged as an environment caveat, not restested further.

10. **A published flake's stated compatibility promise names a specific pinned CppNix version plus a relative floor (`nixVersions.nix_2_31` in the pinned channel, currently 2.31.5) — never "Nix" unqualified, and never a claim that flakes themselves are stable.**
    Rationale: RFC 136 explicitly permits breaking changes to flakes until a future, undated stabilization; a floor stated as a hardcoded number goes stale the moment nixpkgs bumps and a stub throw removes the attribute.
    Verify: `nix eval --raw "nixpkgs#nixVersions.nix_2_31.version"` against the pinned nixpkgs input, cited in the README/CI matrix as the floor, recomputed at each nixpkgs bump.
    RUN: **yes** — `nix eval --raw "nixpkgs#nixVersions.nix_2_31.version"` → `2.31.5` (§10).

## Verification runs

All commands below ran through `/home/mherwig/.cache/research-lang/nix-tools/run.sh` (CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`), 2026-09-27. Fixtures are git-tracked (`git add -A` before every eval). Store state noted per run: "warm" = nixpkgs and common deps already cached from earlier work this session; "cold" = the specific path/derivation being evaluated had no prior cache entry.

**1. Version-source rule (candidate 1)** — `fixtures/versioning-and-tags/{good,bad}-version/`, warm nixpkgs / cold for the bad twin's fetch target:
```sh
$ nix eval --raw "$FX/good-version#packages.x86_64-linux.default.version"
1.2.3                                                          # exit 0

$ nix flake check --no-build --option allow-import-from-derivation false "$FX/good-version"
all checks passed!                                             # exit 0

$ nix eval --raw "$FX/bad-version#packages.x86_64-linux.default.version"
… trying https://example-invalid-host.test/…
curl: (6) Could not resolve host …
error: cannot download does-not-exist.tar.gz from any mirror    # exit 1

$ nix flake check --no-build --option allow-import-from-derivation false "$FX/bad-version"
error: … cannot build '…-does-not-exist.tar.gz.drv^out' during evaluation
       because the option 'allow-import-from-derivation' is disabled   # exit 1
```
Green on the compliant twin, red on the violation, both ways (plain eval and the `--no-build` gate).

**2. self metadata matrix (candidate 3)** — `fixtures/versioning-and-tags/self-attrs/` (git-tracked, tagged `v1.0.0` at `39ca012152cc5be6ff44bf74e0afd3a1815018d7`), warm store:
```sh
$ nix eval --json "path:$FX/self-attrs#info.rev"           # clean, path:
"MISSING-rev"
$ nix eval --json "git+file:$FX/self-attrs#info.rev"       # clean, git+file:
"39ca012152cc5be6ff44bf74e0afd3a1815018d7"
$ nix eval --json "git+file:$FX/self-attrs#info.revCount"  # clean, git+file:
1
# after `echo "# dirty" >> flake.nix` (uncommitted):
$ nix eval --json "git+file:$FX/self-attrs#info.rev"
warning: Git tree '…/self-attrs' is dirty
"MISSING-rev"
$ nix eval --json "git+file:$FX/self-attrs#info.dirtyShortRev"
warning: Git tree '…/self-attrs' is dirty
"39ca012-dirty"
$ nix eval --json "git+file:$FX/self-attrs#info.revCount"
warning: Git tree '…/self-attrs' is dirty
"MISSING-revCount"
```
```sh
$ nix eval --impure --json --expr \
  'let f = builtins.getFlake "github:numtide/flake-utils/b1d9ab70662946ef0850d488da1c9019f3a9752a"; in
   { rev=f.rev or "MISSING"; shortRev=f.shortRev or "MISSING"; revCount=f.revCount or "MISSING"; }'
{"rev":"b1d9ab70662946ef0850d488da1c9019f3a9752a","revCount":"MISSING","shortRev":"b1d9ab7"}   # cold fetch

$ nix eval --impure --json --expr \
  'let f = builtins.getFlake "https://github.com/numtide/flake-utils/archive/b1d9ab7….tar.gz"; in
   { rev=f.rev or "MISSING"; shortRev=f.shortRev or "MISSING"; }'
{"rev":"MISSING","shortRev":"MISSING"}    # cold fetch, plain tarball: no rev at all
```
All rows of the §2 table were produced this way; full raw transcripts are reproducible from the fixture as committed.

**3. `--json` outPath-coercion trap (candidate 4)**:
```sh
$ nix eval --json --impure --expr '{ outPath = builtins.toString ./.; a = "x"; }'
"/home/mherwig/…/scratch"     # NOT {"outPath":"…","a":"x"} — the whole object collapsed
$ nix eval --json --impure --expr '{ a = "x"; b = 3; c = { d = "y"; }; }'
{"a":"x","b":3,"c":{"d":"y"}}   # a plain attrset with no outPath key serializes normally
```
Red/green pair: any attrset with an `outPath` key → collapses; without one → serializes fully. Both run, both as shown.

**4. drvPath churn (candidate 2)** — `fixtures/versioning-and-tags/drv-churn/`, warm store, two real commits (`a21af031c285d83b24ed3ea2f3783bb32627cc2b` pre-README, `45594b675eb0d1e53dce98e8861c6a9fdb3f13e6` post-README):
```sh
$ nix eval --raw "git+file:$FX/drv-churn?rev=a21af031c285d83b24ed3ea2f3783bb32627cc2b#packages.x86_64-linux.baseline.drvPath"
/nix/store/aagfxwpga3kwrfpvns327kda88k45z8i-drv-churn-baseline-1.0.0.drv
$ nix eval --raw "git+file:$FX/drv-churn#packages.x86_64-linux.baseline.drvPath"   # HEAD = post-README
/nix/store/aagfxwpga3kwrfpvns327kda88k45z8i-drv-churn-baseline-1.0.0.drv   # IDENTICAL — unrelated commit, no churn

$ nix eval --raw "git+file:$FX/drv-churn?rev=a21af03…#packages.x86_64-linux.version-embeds-rev.drvPath"
/nix/store/7skd0i1i61vr9gbhb470gn11fdw500zc-drv-churn-1.0.0+a21af03.drv
$ nix eval --raw "git+file:$FX/drv-churn#packages.x86_64-linux.version-embeds-rev.drvPath"
/nix/store/jvfj5fy25gp4mx3pg9c2f87bjmvqhvaw-drv-churn-1.0.0+45594b6.drv   # CHANGED

$ nix eval --raw "git+file:$FX/drv-churn?rev=a21af03…#packages.x86_64-linux.env-var-embeds-rev.drvPath"
/nix/store/xsxrvn0zxb2jdqpin7xv6493vgbvhnha-drv-churn-1.0.0.drv
$ nix eval --raw "git+file:$FX/drv-churn#packages.x86_64-linux.env-var-embeds-rev.drvPath"
/nix/store/14dwdbblcy16a8y8z1zc3xbngd9k0iy9-drv-churn-1.0.0.drv   # CHANGED (same printed name, different path)
```

**5. Consumer tag pin (candidate 5)** — real repo, cold fetch:
```sh
$ nix flake metadata "github:sxyazi/yazi/v26.9.1" --json | jq -r '.resolvedUrl, .locked.rev, .locked.ref, .original'
github:sxyazi/yazi/v26.9.1
8dd895c695a5950330c2623eb43debf323b60654
null
{ "owner": "sxyazi", "ref": "v26.9.1", "repo": "yazi", "type": "github" }
```

**6. Tag ≠ manifest version (candidate 6)** — real repo, cold fetch:
```sh
$ nix eval --raw --impure --expr \
    'let f = builtins.getFlake "github:sxyazi/yazi/v26.9.1"; in
     (builtins.fromTOML (builtins.readFile "${f}/Cargo.toml")).workspace.package.version'
26.9.1
$ nix eval --raw "github:sxyazi/yazi/v26.9.1#packages.x86_64-linux.default.version"
26.9.1pre20260901_8dd895c
```
Both ran clean, both exit 0 — this is a **contradiction of the ideal**, not a checker failure; reported as such (§9).

**7. nix-update --flake (candidate 9)** — `fixtures/versioning-and-tags/nix-update-probe/`, cold fetch of both tags:
```sh
# violation: rev is a bare literal, not tied to version
$ nix-update -F --version=0.2.15 --src-only flake-checker-probe
Update 0.2.14 -> 0.2.15 in …/package.nix
$ git diff -- package.nix     # only `version` line changed; `rev`/`hash` untouched — exit 0, no error surfaced

# compliant twin: rev = "v${finalAttrs.version}" via finalAttrs
$ nix-update -F --version=0.2.15 --src-only flake-checker-probe
Update 0.2.14 -> 0.2.15 in …/package.nix
# internal replay of nix-update's own hash-discovery command:
$ nix-build --expr 'let src = (…).src; in (src.overrideAttrs or …) (_: { outputHash=""; … })'
trying https://github.com/DeterminateSystems/flake-checker/archive/v0.2.15.tar.gz
error: hash mismatch in fixed-output derivation …
         specified: sha256-AAAA…AAA=
            got:    sha256-J0RAJJdpKYgMeV8+aojCRKVkXWa4PzdaAJHLjZInB4E=
```
The new-tag fetch and correct-hash discovery are confirmed; **the hash was not written back to `package.nix` by nix-update itself in this run** (git diff after its exit-0 run still showed the placeholder). Reported as such in §7/#9 rationale — the underlying subprocess (replayed manually) shows a benign `error (ignored): filesystem error: cannot rename: Permission denied` from our nested-bwrap sandbox in its output, which is a plausible but unconfirmed cause; not chased further given this row's P1 (not P0) priority. Applying the discovered hash by hand produces a cleanly evaluating derivation:
```sh
$ nix eval --raw "path:$FX/nix-update-probe#packages.x86_64-linux.flake-checker-probe.drvPath"
/nix/store/0z7rdyf5qpr02f89my9z5yxmxqajv3cb-flake-checker-probe-0.2.15.drv
```

**8. Compatibility floor (candidate 10)**:
```sh
$ nix eval --raw "nixpkgs#nixVersions.nix_2_31.version"
2.31.5
```
matches the frame's independently computed floor.

## Exemplar evidence

- **`sxyazi/yazi@0ea4c5d9ef75d7165c2e3b4eb8d713fc11f26c96:flake.nix:34-36`** — satisfies candidate 1 (reads `./Cargo.toml` directly, not src-interpolated) but **violates** candidate 6 (unconditional snapshot suffix even at an exact tag); its own `nix/yazi-unwrapped.nix:23` (`cargoLock.lockFile = "${src}/Cargo.lock"`) is the mechanism candidate 1's red case is modeled on, though there it is applied to a local filtered source (not itself a violation in that specific spot — see §1's note).
- **`DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:44-45`** — a per-output `import nixpkgs { … }` idiom unrelated to versioning directly, but its 56/56 `'system' has been renamed…` warnings on nixpkgs 26.11 are the kind of unrelated-file-independent churn candidate 2's fixture isolates deliberately for the versioning question ([runs headline](../nix-audit/exemplar-tool-runs.md)).
- **`nix-community/nix-index-database`** — 288 tags, none of them a human semver decision (CI-bot timestamps); direct counter-evidence against ever assuming "most-tagged repo" implies "best-versioned repo" ([shape §10](../nix-audit/exemplar-flake-shape.md)).
- **`nix-darwin/nix-darwin`** — zero tags, `CHANGELOG.md`-only versioning, consumers pin `flake.lock` revs; the clearest counter-example to "every flake needs tags" (candidate 5's rationale still holds: it means *"use what the project already has,"* and this project already has none).
- **`imTHAI/nix-packages` (`.github/workflows/flakehub-publish-auto.yml@master`)** — primary, first-party confirmation of the FlakeHub rolling/tag invisibility failure (candidate 7), including the fix it applied (auto-tagging instead of rolling).
- **`Mic92/nixpkgs-review` / `nix-community/nix-index-database`** — named in the brief's test set; both were read via [shape §10](../nix-audit/exemplar-flake-shape.md)'s table rather than re-fetched (`Mic92/nixpkgs-review`: bare-semver tags `4.0.0`, no `v` prefix — another tag-scheme data point for candidate 5's "no convention" framing).

## AI-agent angle

- **Copying `self.shortRev or "dirty"` verbatim** (a very common snippet in blog posts and older flake templates) silently discards the actual short hash on a dirty tree, because `self.shortRev` is simply **absent** (not present-but-wrong) when dirty — the `or` falls through to the literal string `"dirty"`, not to any hash. The mechanical check: `grep -rn -e 'self\.shortRev or "dirty"' --include='*.nix' .` — any hit is the pattern to replace with `self.shortRev or self.dirtyShortRev or "unknown"`.
- **Assuming `path:` gives the same metadata as `git+file:`** — an agent iterating locally with `path:./` (or a bare relative flake ref, which resolves the same way) and testing `self.rev` there will observe `MISSING` unconditionally and may "fix" this by adding spurious complexity (a manual `git rev-parse` shell-out) instead of switching the reference type to `git+file:` for local testing that needs real git metadata.
- **`nix eval --json` on a debug helper that returns `self` (or an attrset shaped like it)** — an agent writing a small "print my version metadata" script and reaching for `--json` "to be safe/parseable" gets only the `outPath` string back, with every other field silently gone, and may spend real effort debugging a phantom "why are my other fields empty" bug that has nothing to do with the fields themselves. Check: `nix eval --json <flake>#<attr>` where `<attr>` is self-shaped — if the result is a bare string equal to a store path, the attrset was coerced.
- **Copying `sxyazi/yazi`'s exact version formula** (`fromTOML(...).workspace.package.version + "pre${date}_${rev}"`) as a "best-practice example" (it is a widely-cited, actively maintained exemplar) reproduces the "version ≠ tag at release" defect verified in §4 — an agent asked to "make the Nix version match the release tag" would need to special-case the tagged-vs-untagged distinction that yazi's own flake does not make.
- **Reaching for `cargoSha256`** as a fallback when `cargoHash`/`fetchCargoVendor` "doesn't seem to work" — it hard-errors (not merely deprecated) since nixpkgs 25.05, so an agent that half-remembers older tutorials will get a clear eval error, not silent wrong behavior; the fix is `cargoHash`, not a syntax tweak. Check: `grep -rn -e 'cargoSha256' --include='*.nix' .` (empty = pass).
- **Writing `rev = "v${version}"` inside a plain (non-`rec`, non-`finalAttrs`) attrset**, expecting sibling-attribute self-reference to just work the way it does in many other languages' object literals — this is a hard Nix eval error (`error: undefined variable 'version'`), confirmed in §7; the fix is `finalAttrs: { version = …; rev = "v${finalAttrs.version}"; }` or `rec { … }`.
- **Believing `nix-update -F --version=X` alone keeps a hand-written `package.nix` fully in sync** — it only rewrites what it can structurally trace from `version`; a disconnected `rev` literal is invisible to it (confirmed in §7) and needs either the `finalAttrs` interpolation fix or a manual companion edit every release.

## Contested / evolving

- **Whether a snapshot/build-metadata suffix belongs in `version` at all, even for untagged commits, is not actually contested upstream** (nixpkgs' own convention is explicit: `<last>-unstable-YYYY-MM-DD`), but **whether that suffix should ever apply to a tagged, clean release build is where practice diverges from the ideal**, live, in a maintained, popular exemplar (`sxyazi/yazi`, §4/§6). No primary source takes an explicit side on "should the suffix be conditional on tag-vs-untagged"; this map resolves it (candidate 6) but the trend among exemplars measured is toward "apply the suffix unconditionally, for simplicity of the flake code," not toward the stricter rule — worth re-measuring in a future wave once more exemplars are sampled at their own tagged commits rather than at HEAD.
- **Whether `nix-update`'s failure to write a discovered hash back to a `finalAttrs`-based, flake-only package is a nix-update limitation or purely a bwrap-nesting artifact of this research environment is unresolved** (§7, §10) — the internal command it ran was replayed manually and produced the correct hash, but the write-back step itself was not independently instrumented; flagged as a fixture caveat rather than settled either way, and a future dive with a non-nested sandbox should retest before this becomes a normative claim.
- **FlakeHub's own semver-resolution mechanics are still actively iterated** (flake schemas and interface-change posts dated March/June 2026 — [practitioner.md](../nix-topic-map/practitioner.md)), so anything stated here about FlakeHub should be treated as current-as-of-2026-09-27, not a stable target, even though this program does not adopt it.
- **RFC 136's stabilization timeline remains genuinely open** — the RFC commits to an order (CLI, then flakes) but no date, and community sentiment (an April 2025 Discourse thread) treats "still experimental" as effectively permanent in practice despite near-universal adoption ([shifts.md](../nix-topic-map/shifts.md)) — trending toward "plan around permanent-experimental," not toward an imminent 1.0.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [`NixOS/nix` `src/nix/flake.md` @ tag `2.35.2`](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) | Primary tool source: the actual `nix flake` reference doc shipped in the 2.35.2 tag | 2026 (tag-pinned) | Ground truth for which `self`/input metadata fields are documented at all (`rev`, `revCount`, `lastModifiedDate`, `lastModified`, `narHash`) and the exact GitHub/git/path/tarball ref grammar; fetched directly rather than via the rendered manual to get the exact wording at this version |
| [nix.dev rendered manual, `nix3-flake` (2.35)](https://nix.dev/manual/nix/2.35/command-ref/new-cli/nix3-flake) | Rendered version of the same manual page | 2026 | Cross-check against the raw source; confirms the dirty-tree warning text for `git+file:` |
| [Nix 2.33 release notes](https://nix.dev/manual/nix/2.35/release-notes/rl-2.33) | Official release notes | 2025-12-09 | `nix registry resolve`, full-input-type `nix flake clone`, multithreaded `revCount` (9.1s→3.7s), all labelled "Upstreamed from Determinate Nix" |
| [Nix 2.35 release notes](https://nix.dev/manual/nix/2.35/release-notes/rl-2.35) | Official release notes | 2026-06-22 | Lazy store copies for flake/tarball sources; `builtins.fetchTarball`/`builtins.storePath` lazy treatment; directly relevant to whether `self.outPath` realization cost has changed |
| [`NixOS/nixpkgs` `pkgs/README.md`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md#versioning) | Nixpkgs' own packaging conventions doc | rolling (master) | The only normative "must start with a digit" / `-unstable-YYYY-MM-DD` snapshot-suffix rule; lines 462-475 |
| [RFC 136 "stabilize-incrementally"](https://raw.githubusercontent.com/NixOS/rfcs/master/rfcs/0136-stabilize-incrementally.md) | Accepted-track RFC, fetched raw | opened 2022-09-15 | The only primary source on what compatibility promise flakes can make while experimental; direct quote used in §8 |
| [FlakeHub semver concepts](https://docs.determinate.systems/flakehub/concepts/semver/) | Determinate Systems product docs | 2026 | Defines the SemVer subset, rolling-release commit-count scheme, and highest-wins wildcard resolution — the mechanism behind the invisibility failure |
| [FlakeHub best practices](https://docs.determinate.systems/flakehub/best-practices/) | Determinate Systems product docs | 2026 | "One flake per versioned thing," private-by-default recommendation, lock-freshness tooling |
| [`imTHAI/nix-packages` `.github/workflows/flakehub-publish-auto.yml`](https://github.com/imTHAI/nix-packages/blob/master/.github/workflows/flakehub-publish-auto.yml) | A real user's CI workflow, fetched raw | 2026 (current `master`) | First-party, dated confirmation of the FlakeHub rolling/tag invisibility failure, in the exact words of someone who hit it and fixed it |
| [`sxyazi/yazi` `flake.nix` and `nix/yazi-unwrapped.nix` @ `0ea4c5d9ef75`](https://github.com/sxyazi/yazi) | Exemplar corpus, sparse clone | commit dated 2026-09-22 | Source of both the compliant version-read pattern and the live "tag ≠ built version" contradiction; re-measured live via `nix eval` against the real tag, not just read |
| `NixOS/nix#6034` ("git+file flakes that are dirty don't provide any revision information") | GitHub issue discussion | referenced 2026 | Motivating discussion for `dirtyRev`/`dirtyShortRev` existing at all; corroborates the empirical dirty-tree behavior measured directly in §2/§10 |
| [NixOS Discourse: "Flakes: accessing self's revision?"](https://discourse.nixos.org/t/flakes-accessing-selfs-revision/11237) | Community discussion | referenced 2026 | Corroborates the `self.shortRev or self.dirtyShortRev or "unknown"` fallback idiom independently of this dive's own measurement |
| Toolchain: `nix-update --help` (nix-update 1.16.0, pinned toolchain) | Tool's own CLI help, run directly | 2026-09-27 (pinned build) | Ground truth for `-F`/`--flake`, `--version`, `--src-only` flag semantics used in §7 |
| [nix-topic-map.md](../nix-topic-map.md) (this program's own phase-3 map) | Internal consolidated map | 2026-09-27 | Source of the M-G-* row definitions, conflict 8/9/11 resolutions this dive was scoped against, and the priority checks (Q14 etc.) reused verbatim |
| [nix-audit/exemplar-flake-shape.md](../nix-audit/exemplar-flake-shape.md) §4, §10 | Internal audit, corpus measurement | 2026-09-27 | Corpus-wide counts for `fromTOML`/hardcoded-version/tag-scheme distribution cited throughout |
| [nix-topic-map/shifts.md](../nix-topic-map/shifts.md) | Internal recent-shifts scout | 2026-09-27 | Lazy-copy mechanism dating, RFC 136 framing, `cargoHash`/`fetchCargoVendor` 25.05 boundary fact reused in §7 |

