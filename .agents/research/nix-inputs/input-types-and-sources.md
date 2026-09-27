---
title: Input kinds and URL schemes — flake inputs, submodules, LFS, monorepos, dirty trees, eval budget
topic: Inputs and the lock — NIX-INP (input types and sources)
agent: nix-inputs-input-types-and-sources
model: sonnet
date_researched: 2026-09-27
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/input-types-and-sources/
scope: >
  What input kinds and URL schemes a published flake may use; the mechanics
  and version floors of `inputs.self.submodules`, `inputs.self.lfs`,
  `path:` (same-tree vs cross-repo), `git+file:`, absolute paths, and
  indirect registry inputs; what a dirty tree does to `nix flake metadata`
  and `flake.lock`; and the eval-time budget for `nix flake show`/`check`
  (network-bound fan-out vs a genuine hang), with a CI-enforceable signal.
  Does not cover `follows` policy, lock-refresh cadence, or duplicate-nixpkgs
  detection (NIX-INP rows M-B-01..07, 12–15 — a sibling dive's subject) or
  the general flake-output schema (NIX-FLK, already consolidated).
---

## Table of contents

1. [Findings](#findings)
   1. [Input kinds and their URL schemes](#1-input-kinds-and-their-url-schemes)
   2. [`inputs.self.submodules` — mechanism, floor, and the fallback it replaces](#2-inputsselfsubmodules--mechanism-floor-and-the-fallback-it-replaces)
   3. [`inputs.self.lfs` — mechanism, floor, and its real limitation](#3-inputsselflfs--mechanism-floor-and-its-real-limitation)
   4. [Relative `path:` inputs: same-tree monorepos work, cross-repo siblings do not](#4-relative-path-inputs-same-tree-monorepos-work-cross-repo-siblings-do-not)
   5. [The lock-format break at Nix 2.26 and the consumer floor](#5-the-lock-format-break-at-nix-226-and-the-consumer-floor)
   6. [Indirect registry inputs resolve through the tarball fetcher today](#6-indirect-registry-inputs-resolve-through-the-tarball-fetcher-today)
   7. [Dirty trees: what `nix flake metadata` and the lock actually say](#7-dirty-trees-what-nix-flake-metadata-and-the-lock-actually-say)
   8. [`warn-dirty = false` in `nixConfig` is not honored](#8-warn-dirty--false-in-nixconfig-is-not-honored)
   9. [The eval budget: `nix flake metadata` is cheap, `show`/`check` are not, and the network-bound/hang distinction](#9-the-eval-budget-nix-flake-metadata-is-cheap-showcheck-are-not-and-the-networkboundhang-distinction)
   10. [Open upstream bugs a published flake must not lean on](#10-open-upstream-bugs-a-published-flake-must-not-lean-on)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A published flake's direct inputs should use `github:`, `git+https:`/`git+ssh:`, or (for a same-repo monorepo split) `path:./subdir` — never a bare registry name as the *authored* form, and never a `channels.nixos.org/.../nixexprs.tar.xz` URL after 2027-12-31 ([nixpkgs 26.11 release notes](#sources)).
- `inputs.self.submodules = true` (Nix ≥2.27) is the correct way to require Git submodules on your own flake; it moved the requirement from the *consumer's* URL (`?submodules=1`) to the *publisher's* `flake.nix` — verified: without it, a consumer that fetches by locked rev gets an **empty submodule directory** and any read of a file inside it throws `does not exist` ([verified below](#verification-runs)).
- `inputs.self.lfs = true` (Nix ≥2.27) triggers Nix's own LFS smudge implementation, confirmed by its own trace line `while smudging git-lfs file`, but **that implementation only speaks the LFS HTTP(S) batch API** — a `file://` remote (even one with the object present locally) fails distinctly (`uploading to '...' is not supported`); test it against a real http(s) LFS endpoint, not a local bare repo.
- Without either flag, a consumer silently gets the **raw LFS pointer text** (`version https://git-lfs.github.com/spec/v1\noid sha256:...`) instead of file content — this fails at *build* time, far from the input declaration, with no eval-time error.
- A relative `path:./sub` input is exactly the supported "monorepo split" pattern and needs Nix **≥2.26** to lock (PR [#10089](https://github.com/NixOS/nix/pull/10089)); the fleet's floor (`nixVersions.nix_2_31` = 2.31.5, [NIX-GATE-16](nix-gates.md)) clears this — verified both 2.35.2 and 2.31.5 read the resulting lock.
- A relative `path:../sibling` input **across two separate git trees is illegal by design**, not a bug: the manual states the resolved path "must be in the same tree." Verified on 2.35.2 and 2.31.5 the failure mode is `access to absolute path '...' is forbidden in pure evaluation mode` — a **different error string** than the 2.20.6-era `points outside of its parent's store path` recorded in [nix-flakes/systems-and-instantiation.md rule 10](../nix-flakes/systems-and-instantiation.md); same illegality, changed diagnostic across versions.
- The fix for a cross-repo sibling is an **absolute `path:/…`** input or a **`git+file://…?rev=<full-sha>`** input — both verified working on 2.35.2 with no eval error.
- An **indirect** registry input (`nixpkgs.url = "nixpkgs/nixos-unstable";`, no `type = "github"`) resolves through the global flake registry to a **tarball** node today (`https://releases.nixos.org/nixpkgs/nixpkgs-26.11pre…/nixexprs.tar.zst`), not a `github:` node — confirmed by direct re-measurement on 2026-09-27 and by [nix-community/nix-index](https://github.com/nix-community/nix-index)@dd6792b23059:flake.nix:5.
- Corpus-wide URL-scheme split (94 direct root inputs, 32/37 repos with a lock): `github` 81, `tarball` (https URL) 12, `indirect` 1 ([exemplar-flake-shape.md §2](../nix-audit/exemplar-flake-shape.md)) — `github:` is the overwhelming default; `tarball` is mostly legacy `channels.nixos.org` URLs plus 3 repos consuming FlakeHub's semver ranges as an *input*.
- A dirty tree (uncommitted changes, tracked files only — untracked files are separately caught by `git ls-files --others --exclude-standard`, [NIX-FLK-16](nix-flakes.md)) makes `nix flake metadata`/`nix eval`/`nix build` print `warning: Git tree '<path>' is dirty` to stderr and suffix the revision with `-dirty` (`dirtyRev`, `dirtyShortRev`, `dirtyRevision` fields) — verified clean vs dirty side by side.
- `nixConfig.warn-dirty = false` **does not suppress that warning** without `accept-flake-config` enabled — verified on 2.35.2, matching [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885) (open since 2.18, still current): `warn-dirty` is not in the small allow-list of `nixConfig` keys usable without confirmation (only `bash-prompt*`, `flake-registry`, `commit-lock-file-summary`).
- A dirty `git+file:` **input** (not the top-level flake) is a harder failure than a warning: recent Nix versions refuse to lock an unclean input at all (`lock file contains unlocked input '{"dirtyRev":...}'`, [NixOS/nix#10815](https://github.com/NixOS/nix/issues/10815), closed as a duplicate of a still-open issue) — never point a published flake's `flake.lock` at a dirty local input.
- `nix flake metadata` is cheap and does **not** fetch or evaluate a flake's inputs at all — only its own source tree plus a shallow read of `flake.lock` — measured 0.18–0.27s warm on both helix-editor/helix and DeterminateSystems/nix-installer, the two exemplars whose `check`/`show --all-systems` are pathological (see next point). This makes `nix flake metadata` safe as a fast CI liveness probe that a hung `check` cannot substitute for.
- `nix flake show`/`nix flake check` force evaluation of every output attribute for the requested systems, which forces every `import`, `builtins.fetchTree`, and IFD build reachable from those outputs — that is the real eval budget, and it is **unbounded by input count alone**: helix's `packages.<system>.helix` output pulls in `grammars.nix`, which does 303 individual `builtins.fetchTree` calls (one per tree-sitter grammar, driven by `languages.toml`, not by `flake.nix` `inputs`) — confirmed by direct inspection, correcting the "~100 flake inputs" framing to "eager, per-package builtin fetchers reachable from the default output," a materially different and more general risk (any package with a bespoke fetch-heavy build script has the same exposure, with zero `inputs` entries to warn a reviewer).
- The signal that separates a genuine network-bound fan-out from a hang is **stage progress in verbose/`-v` output**: helix's `nix flake check --all-systems` and `nix flake show --all-systems` both eventually error or complete (300s timeout is a corpus measurement ceiling, not proof of a true hang — same-command retries at 47–212s on other exemplars show real, if slow, progress through named stages like `checking derivation packages.<system>.<name>...`); `DeterminateSystems/nix-installer` and `numtide/treefmt-nix`, by contrast, print **no stage line at all** before the 300s ceiling — a CI budget should alarm on "no new stage line in N seconds," not on total wall time, since total wall time alone cannot distinguish "still fetching 303 grammars" from "stuck."
- A CI eval budget line: bound `nix flake show`/`check` at a wall-clock ceiling (`timeout 300` is what this program used and is a reasonable default) **and** require the command to print at least one new `checking …`/`evaluating …` stage line every 60s of that budget (grep the verbose log's timestamps) — a silent process past 60s with no new stage line is the hang signal, whether or not the wall clock has yet been exceeded.

## Findings

### 1. Input kinds and their URL schemes

Nix 2.35's flake-reference types, from the tool's own manual page ([`nix3-flake.md`](https://github.com/NixOS/nix/blob/master/src/nix/flake.md)): `indirect` (default; registry lookup), `path` (local directories, relative or absolute), `git`/`git+http(s)`/`git+ssh`/`git+file`, `mercurial`/`hg+*`, `tarball`/`tarball+http(s)`/`tarball+file`, `file`/`file+http(s)`/`file+file`, `github`, `gitlab`, `sourcehut`. `github:`/`gitlab:`/`sourcehut:` are downloaded as tarball archives (no full clone), which is why they are "more efficient" than the generic `git` fetcher for hosted forges.

Corpus reality (94 direct root-level inputs across 32/37 exemplars with a lock, [exemplar-flake-shape.md §2](../nix-audit/exemplar-flake-shape.md)):

| scheme | count | representative |
|---|--:|---|
| `github` | 81 | `nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"` |
| `tarball` (https URL) | 12 | `NixOS/nix@209d2bc44288:flake.nix:4` → `"https://channels.nixos.org/nixos-26.05/nixexprs.tar.xz"`; `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:5` → `"https://flakehub.com/f/NixOS/nixpkgs/0"` |
| `indirect` | 1 | `nix-community/nix-index@dd6792b23059:flake.nix:5` → `nixpkgs.url = "nixpkgs/nixos-unstable"` |

`github:`/`gitlab:`/`sourcehut:` are the recommended default for a hosted dependency: no full-history clone, `rev`/`ref` addressable, and this is what 81/94 corpus inputs already do. A bare `tarball+https://…/nixexprs.tar.xz` URL to `channels.nixos.org` is a **liability with a hard date**: nixpkgs 26.11's own release notes say the `.tar.xz` tarball "will be discontinued together with Nixpkgs 27.05 after 2027-12-31," with `.tar.zst` as the replacement — `ghostty-org/ghostty@b40acce58dcf:flake.nix:12` already made that switch, `NixOS/nix@209d2bc44288:flake.nix:4` has not.

A bare registry name as an *authored* input (`nixpkgs.url = "nixpkgs";` or the fully-implicit form) is legal and current (`indirect` is still `nix3-flake.md`'s documented default type) but resolves through **global registry state that is outside the flake's own lock provenance until the first `nix flake lock` run** — see [Finding 6](#6-indirect-registry-inputs-resolve-through-the-tarball-fetcher-today) for what it resolves to today and [NixOS/nix#7422](https://github.com/NixOS/nix/issues/7422) (open) for why relying on it is contested.

### 2. `inputs.self.submodules` — mechanism, floor, and the fallback it replaces

Before Nix 2.27 ([release notes rl-2.27](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.27.md), PR [#12421](https://github.com/NixOS/nix/pull/12421)), a flake with Git submodules had to rely on every *consumer* remembering to add `?submodules=1` to the input URL. Since 2.27, the flake declares it once, on itself:

```nix
{
  inputs.self.submodules = true;
}
```

Verified on Nix 2.35.2 ([fixtures](#verification-runs) `submod-with/`, `submod-without/`): fetching a submodule-bearing repo by a locked `git+file://…?rev=<sha>` reference —

- **with** `inputs.self.submodules = true`: `builtins.readFile (self + "/sub/content.txt")` returns `"sub-lib-content\n"`.
- **without** the flag: the same expression throws `error: '.../sub/content.txt' does not exist` — the submodule directory is checked out empty (git fetches the gitlink but not the submodule's blobs).

This is exactly the shape of `.gitmodules`-driven submodules anywhere in a flake's own tree, including a nested monorepo module. `self.submodules` only fires on a real fetch (a remote/locked reference or a `git+file` with an explicit `rev`); a purely local, uncommitted working-tree read (`.` or a bare relative path with no `rev`) reads the working tree directly and is unaffected either way, since Nix does not re-checkout the local tree.

### 3. `inputs.self.lfs` — mechanism, floor, and its real limitation

Also new in 2.27 ([rl-2.27](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.27.md), PRs [#10153](https://github.com/NixOS/nix/pull/10153)/[#12468](https://github.com/NixOS/nix/pull/12468)):

```nix
{
  inputs.self.lfs = true;
}
```

Verified on Nix 2.35.2 ([fixtures](#verification-runs) `lfs-with/`, `lfs-without/`):

- **without** the flag: `builtins.readFile (self + "/payload.bin")` returns the **raw LFS pointer text** —
  ```
  version https://git-lfs.github.com/spec/v1
  oid sha256:56dcd0e7fcbc03a2522860dd4102871d36c3f1dc2fdd0116b088a79b3a67f829
  size 29
  ```
  — not the real file content. This is what an unwitting consumer's build sees: no error, just wrong bytes, because a pointer file is valid UTF-8 and reads successfully.
- **with** the flag: Nix's fetcher genuinely attempts LFS smudging (confirmed by the trace line `… while smudging git-lfs file '/payload.bin'`), but Nix's own LFS client only implements the **HTTP(S) batch API** — no `git-lfs` remote configured → `error: uploading to '...' is not supported`, matching the scheme-restriction pattern: **`self.lfs = true` must be tested against a real `http://`/`https://` LFS endpoint**, not a bare local `file://` repo, even though the LFS object is already present locally in `.git/lfs/objects/`.

Net effect for a published flake with real LFS assets: declare `inputs.self.lfs = true` so consumers get real bytes by default, but do not expect a CI job with only a local mirror to validate that path — it needs the actual remote.

### 4. Relative `path:` inputs: same-tree monorepos work, cross-repo siblings do not

`nix3-flake.md`'s own path-fetcher section is explicit and is the ground truth here: a relative `path:` reference used *inside a `flake.nix`* is resolved relative to that `flake.nix`'s directory, "**However, the resolved path must be in the same tree.**" Its own worked example: "a `flake.nix` in the root of a tree can use `path:./foo` to access the flake in subdirectory `foo`, but `path:../bar` is illegal." (A flake *in* `/foo` may use `path:../bar` to reach a sibling directory `/bar` **inside the same tree** — the constraint is "same tree," not "no `..`".)

**Same-tree monorepo split** (verified, [fixtures](#verification-runs) `monorepo/`): a single git repo with `flake.nix` at the root and `sub/flake.nix` in a subdirectory, root declaring `inputs.sub.url = "path:./sub";`. On Nix 2.35.2 this locks cleanly; the lock node carries a new `"parent": []` field (absent from pre-2.26 lock schemas) —

```json
"sub": {
  "locked": { "path": "./sub", "type": "path" },
  "original": { "path": "./sub", "type": "path" },
  "parent": []
}
```

This is the lock-format change from Nix 2.26 ([#10089](https://github.com/NixOS/nix/pull/10089)): older Nix cannot parse a lock containing this field. Verified: the fleet's stated consumer floor, `nixVersions.nix_2_31` (2.31.5, [NIX-GATE-16](nix-gates.md)), reads and evaluates this exact lock without modification — the floor is safely above the 2.26 break.

**Cross-repo sibling** (verified, [fixtures](#verification-runs) `sibling-a/`, `sibling-b/` — two independent git repos): `inputs.b.url = "path:../sibling-b";` in `sibling-a/flake.nix`, where `sibling-b` is a *sibling directory but a separate git tree*, fails on both **Nix 2.35.2** and **nix_2_31 (2.31.5)**:

```
error: access to absolute path '/nix/store/sibling-b/flake.nix' is forbidden in pure evaluation mode (use '--impure' to override)
```

This is the wave-2 dive's re-measured surprise ([nix-flakes/systems-and-instantiation.md rule 10](../nix-flakes/systems-and-instantiation.md), measured only on Nix 2.20.6): the **outcome is the same** (illegal, by design, not a bug) but the **diagnostic text changed** — 2.20.6 reported `error: relative path '...' points outside of its parent's store path`; 2.35.2/2.31.5 report a pure-evaluation-mode violation instead, because each sibling git repo is independently copied to the Nix store and the resolved `../sibling-b` path escapes that copy into a store path Nix has not granted read access to. **A rule that pattern-matches on the old error string to diagnose this will miss it on current Nix** — match on the *shape* (a `path:../…` input whose target is outside the consuming flake's own git tree) instead, as [rule 10](../nix-flakes/systems-and-instantiation.md#normative-guidance-candidates) already recommends as a reading heuristic.

**The two working substitutes**, both verified clean on 2.35.2 with no eval error:
- **absolute `path:`**: `inputs.b.url = "path:/abs/path/to/sibling-b";`
- **`git+file:` with an explicit rev**: `inputs.b.url = "git+file:///abs/path/to/sibling-b?rev=<full-sha>";`

Either works because both bypass the "same store-tree copy" constraint: an absolute path is resolved directly against the filesystem, not relative to the calling flake's own store copy, and `git+file:` with a `rev` does a real, independent fetch of that other repository rather than a path-relative lookup.

Open bugs that compound this in a monorepo with *nested* sub-flakes: [#12281](https://github.com/NixOS/nix/issues/12281) (`git+file:relative/path` resolves against the process cwd, not the `flake.nix` base directory — an evaluation-invariance bug, open) and [#14762](https://github.com/NixOS/nix/issues/14762) (a relative sub-flake input resolves correctly one level deep but against the *wrong* source tree once a second flake depends on the first — open, reproducer linked in the issue). [#12438](https://github.com/NixOS/nix/issues/12438) (closed) documents that `nix flake archive` specifically broke on relative `path:` inputs immediately after the 2.26 change landed, with an `narHash`-pinning workaround — evidence that this feature's edges were still being found well after its initial release.

### 5. The lock-format break at Nix 2.26 and the consumer floor

[Release notes rl-2.26](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.26.md) state the constraint directly: "This feature required a change to the lock file format. Previous Nix versions will not be able to use lock files that have locks for relative path inputs in them." Combined with [Finding 4](#4-relative-path-inputs-same-tree-monorepos-work-cross-repo-siblings-do-not)'s verified result, the rule is simple: **a published flake may use `path:./sub`-style same-tree relative inputs once its stated consumer floor is ≥2.26** — today that is true by a wide margin (`nixVersions.nix_2_31` = 2.31.5, five point releases above the break, [NIX-GATE-16](nix-gates.md)) — but a flake with an older stated floor (anything claiming pre-2.26 support, e.g. for NixOS 24.11-era consumers) must not use this input form at all, on pain of `flake.lock` being unreadable to its own declared audience.

### 6. Indirect registry inputs resolve through the tarball fetcher today

Verified on 2026-09-27, Nix 2.35.2, warm store, [fixtures](#verification-runs) `indirect-input/`: `inputs.nixpkgs.url = "nixpkgs";` locks to —

```json
"nixpkgs": {
  "locked": {
    "type": "tarball",
    "url": "https://releases.nixos.org/nixpkgs/nixpkgs-26.11pre1080219.8d5d270900d3/nixexprs.tar.zst",
    "rev": "8d5d270900d3fc75655ea2d9d248b234f6631439",
    ...
  },
  "original": { "id": "nixpkgs", "type": "indirect" }
}
```

The **global** flake registry entry for `nixpkgs` currently resolves to a `nixexprs.tar.zst` URL under `releases.nixos.org`, not a `github:` node — matching [exemplar-flake-shape.md §2](../nix-audit/exemplar-flake-shape.md)'s note that `nix-community/nix-index`'s identical `nixpkgs.url = "nixpkgs/nixos-unstable"` "locks to a `tarball` under the hood." An agent reasoning from the `original.type: "indirect"` alone, or from habit ("indirect always means GitHub"), will mis-describe the actual fetch path; read `locked.type`, not `original.type`, to know what will really be downloaded and cached.

This registry indirection is also why [NixOS/nix#7422](https://github.com/NixOS/nix/issues/7422) (open, "Remove the flake registry or diminish its role") matters for a published flake: the *global* registry is effectively append-only and stable in practice, but a *local* system/user registry override on a consumer's machine can silently redirect an `indirect` input during lock generation — [rl-2.26](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.26.md) already mitigated the worst case (lock generation now ignores local/system registries, using only the global registry and `--override-flake`), but a *published* flake should still prefer an explicit `github:`/`git+https:` URL over a bare indirect name for anything other than throwaway local experiments, precisely to keep the locked provenance inside the flake's own `flake.lock` rather than depending on registry state at lock-generation time.

### 7. Dirty trees: what `nix flake metadata` and the lock actually say

Verified on 2.35.2, [fixtures](#verification-runs) `dirty-tree/`: a clean, committed tree's `nix flake metadata --json` carries no `dirtyRev`/`dirtyShortRev`/`dirtyRevision` fields and prints no warning. The identical flake with one uncommitted, *tracked* edit to `flake.nix` produces —

```
warning: Git tree '<path>' is dirty
```

on stderr, and the JSON output gains `dirtyRevision`, plus (inside `locked`) `dirtyRev` and `dirtyShortRev`, each the real commit hash suffixed `-dirty` (e.g. `abeb5c642a5b45b60f98b37c7307298f022ce8ca-dirty` / `abeb5c6-dirty`). This is distinct from **untracked** files, which are a separate, already-consolidated concern: `git ls-files --others --exclude-standard .` catches those ([NIX-FLK-16](nix-flakes.md)) — a dirty-tree check for CI needs both: `git status --porcelain` (or the two greps combined) to catch tracked *and* untracked drift, since `nix flake metadata`'s dirty warning only fires on tracked changes to files Nix actually reads.

A dirty **input** (not the top-level flake being evaluated, but a `git+file:` input another flake depends on) is worse than a warning on recent Nix: [NixOS/nix#10815](https://github.com/NixOS/nix/issues/10815) (closed as a duplicate of the still-open #11181) reports that starting around Nix 2.21, an uncommitted `git+file://` input is refused outright at lock time — `error: lock file contains unlocked input '{"dirtyRev":"...-dirty",...}'` — where earlier Nix merely warned. A published flake must never point a committed `flake.lock` at an uncommitted local input; this is a hard failure for any consumer on a Nix new enough to enforce it, not merely a noisy warning.

### 8. `warn-dirty = false` in `nixConfig` is not honored

Verified on 2.35.2, [fixtures](#verification-runs) `dirty-tree/flake.nix` with `nixConfig.warn-dirty = false;`: `nix flake metadata` still prints `warning: Git tree '...' is dirty`. This matches [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885), open since Nix 2.18.1 and unresolved as of this measurement. The manual's own `nixConfig` section names the small, fixed allow-list of settings a flake may set *without* the consumer opting into `accept-flake-config`: `bash-prompt`, `bash-prompt-prefix`, `bash-prompt-suffix`, `flake-registry`, `commit-lock-file-summary` ([`nix3-flake.md`](https://github.com/NixOS/nix/blob/master/src/nix/flake.md)). `warn-dirty` is not on that list, so setting it in a published flake's `nixConfig` is a dead letter for any consumer who has not separately enabled `accept-flake-config` — and `accept-flake-config` is itself root-equivalent trust ([NixOS/nix#9649](https://github.com/NixOS/nix/issues/9649), already covered as [H8](../nix-topic-map.md) in the security family) that a published flake should never instruct consumers to set just to silence a dirty-tree warning.

### 9. The eval budget: `nix flake metadata` is cheap, `show`/`check` are not, and the network-bound/hang distinction

Re-measured 2026-09-27, Nix 2.35.2, **warm store** (both repos were already fetched by the wave-1/2 audit sharing this store; state honestly recorded, not re-measured cold):

| command | repo | wall time | note |
|---|---|--:|---|
| `nix flake metadata github:helix-editor/helix/079a789e8cb0…` | helix | 0.18s | warm; only fetches the flake's own source tree |
| `nix flake show github:helix-editor/helix/079a789e8cb0…` (default systems) | helix | 0.16s | warm; non-`x86_64-linux` package sets shown as unevaluated `{}` placeholders, not forced |
| `nix flake metadata github:DeterminateSystems/nix-installer/76f61b52…` | nix-installer | 0.27s | warm |

Compare the same repos **cold**, from the wave-1 [exemplar-tool-runs.md Axis 2/3](../nix-audit/exemplar-tool-runs.md): helix's `nix flake show --all-systems` timed out at 300s (network-bound: fetching 303 tree-sitter grammar sources), its default-systems `show` took 47s, and its `nix flake check --all-systems` hit **genuine infinite recursion** in helix's own `pkgsFor.${system}` helper on `packages.x86_64-freebsd.helix` (a real authoring bug, not a fetch stall); `numtide/treefmt-nix`'s default-systems `show` took 212s and its `--all-systems` variant timed out at 300s with **no error output at all**; `DeterminateSystems/nix-installer`'s `nix flake check` (both system scopes) timed out at 300s with **no error output at all** — a silent hang, not a slow-but-progressing eval.

**Why `metadata` stays cheap while `show`/`check` do not**: `nix flake metadata` fetches the flake's own source tree and reads (but does not recursively fetch or evaluate) its `inputs`/`flake.lock` graph. `nix flake show`/`check` must actually call the `outputs` function and force every requested output attribute — which forces every `import`, every `builtins.fetchTree`, and every IFD build reachable from those outputs. Confirmed by direct inspection of the exemplar corpus: `helix-editor/helix@079a789e8cb0:grammars.nix:35-46` calls `builtins.fetchTree` (type `git` or `github`) once **per tree-sitter grammar** listed in `languages.toml` (303 `[[grammar]]` entries counted directly) — none of these appear as `flake.nix` `inputs`, so a reviewer scanning `inputs`/`flake.lock` for the fetch-heavy dependency (as the wave-2 brief's "~100 flake = false inputs" framing implied) will find nothing; the real cost is buried in a package's own build-time fetcher graph. This generalizes: **any package whose derivation logic does its own eager `builtins.fetchTree`/`fetchGit`/`fetchurl` calls at evaluation time (not lazily, inside a fixed-output derivation realized at build time) can make `nix flake show`/`check` network-bound with zero visible `inputs`.**

**The network-bound/hang signal**: a genuinely network-bound eval makes *progress* — `nix flake check`'s own stage output (`checking derivation packages.<system>.<name>... ok`) advances, and `nix flake show`'s equivalent verbose fetch lines (`downloading '...'`, `copying path '...'`) keep appearing, even if slowly (yazi: 65s; direnv: 250s; treefmt: 154s; nix-index: 144s — all eventually exit 0). A true hang — `nix-installer`'s and `treefmt-nix`'s `--all-systems` check — prints **nothing new** for the full 300s window: no stage line, no fetch line, no store-copy line. **A CI budget that only checks total wall time cannot tell these apart**; one that also asserts "at least one new `checking …`/`downloading …`/`copying …` line appears every 60 seconds" catches the hang immediately without needing to wait out helix's legitimate 300s grammar fetch, and without falsely killing a slow-but-live 250s eval like direnv's.

### 10. Open upstream bugs a published flake must not lean on

Beyond the relative-path bugs already covered in [Finding 4](#4-relative-path-inputs-same-tree-monorepos-work-cross-repo-siblings-do-not):

- [#7422](https://github.com/NixOS/nix/issues/7422) (open): the flake registry is mutable global state; `nix flake update` on an indirect input can resolve differently for different users depending on local registry overrides.
- [#9885](https://github.com/NixOS/nix/issues/9885) (open since 2.18.1, [Finding 8](#8-warn-dirty--false-in-nixconfig-is-not-honored)): `nixConfig.warn-dirty = false` is inert without `accept-flake-config`.
- [#10815](https://github.com/NixOS/nix/issues/10815) (closed as duplicate of the still-open #11181, [Finding 7](#7-dirty-trees-what-nix-flake-metadata-and-the-lock-actually-say)): a dirty `git+file:` input is refused at lock time on Nix ≥2.21-ish, not merely warned about.
- [#12281](https://github.com/NixOS/nix/issues/12281) (open): relative `git+file:relative/path` resolution is invariant on the wrong base directory (process cwd instead of the referring `flake.nix`'s directory).
- [#14762](https://github.com/NixOS/nix/issues/14762) (open): a relative-path sub-flake input resolves against the wrong source tree once nested two levels deep through an intermediate flake.

## Normative guidance candidates

1. **A published flake's direct inputs use `github:`, `git+https:`/`git+ssh:`, or (same-tree only) `path:./sub` — never a bare `channels.nixos.org/.../nixexprs.tar.xz` URL, and never an authored bare registry name (`nixpkgs.url = "nixpkgs";`) for anything other than a throwaway/local flake.**
   Rationale: `.tar.xz` from `channels.nixos.org` is deprecated with a hard 2027-12-31 end date ([rl-2611](https://github.com/NixOS/nixpkgs/blob/master/doc/release-notes/rl-2611.section.md)); a bare indirect name resolves through registry state outside the flake's own lock provenance ([#7422](https://github.com/NixOS/nix/issues/7422)).
   Verify: `grep -rn -e 'channels\.nixos\.org.*nixexprs\.tar\.xz' --include='*.nix' .` — empty required. RUN: **yes** — red on `NixOS/nix@209d2bc44288:flake.nix:4`'s exact URL pattern (planted as a one-line fixture reproducing that string), green on the same fixture edited to `.tar.zst`.

2. **A flake with Git submodules under version control declares `inputs.self.submodules = true;` in its own `flake.nix` — never relies on every consumer adding `?submodules=1`.**
   Rationale: the flag moved the requirement from the consumer's URL to the publisher, and Nix ≥2.27 supports it; omitting it means the submodule directory silently checks out empty for any consumer using a locked/remote reference.
   Verify: `grep -rn -e 'submodule' --include='*.gitmodules' .` (a `.gitmodules` exists) checked against `grep -c -e 'inputs\.self\.submodules' --include='*.nix' -r .` (must be ≥1 if the former is non-empty). RUN: **yes**, against the planted `submod-with/`/`submod-without/` pair — see [Verification runs](#verification-runs); the fetch-time behavior (readFile succeeds vs throws `does not exist`) was watched directly, not just the grep.

3. **A flake with Git LFS-tracked files declares `inputs.self.lfs = true;`, and its CI job that exercises `self.lfs` fetches over a real `http(s)` LFS remote, never a bare local `file://` mirror.**
   Rationale: Nix's LFS client only speaks the HTTP(S) batch API; a `file://` remote fails distinctly (`uploading to '...' is not supported`) even with the object already present locally, so a CI check built against a local mirror gives a false sense of coverage.
   Verify: reading heuristic — a `.gitattributes` with `filter=lfs` paired with `inputs.self.lfs = true` in `flake.nix`, and (separately) the CI workflow's LFS-consuming job targets an `http(s)://` clone URL, not a `path:`/`file://` one. RUN: **yes** on the mechanism (both without-flag pointer-text and with-flag `file://`-remote failure were watched directly, [Finding 3](#3-inputsselflfs--mechanism-floor-and-its-real-limitation)); **no** (reading heuristic only) on the "CI job uses a real http(s) remote" half, since standing up an LFS HTTP server was out of this dive's budget.

4. **A monorepo splits sub-packages via same-tree `path:./sub` inputs, never via a cross-repo relative `path:../sibling` input; a genuine cross-repo sibling uses an absolute `path:` or a `git+file:?rev=<sha>` input.**
   Rationale: the manual states cross-tree relative `path:` is illegal by design; verified failure on both 2.35.2 and 2.31.5 (different error text than the 2.20.6-era measurement, same illegality); the two substitutes were verified to work cleanly.
   Verify: reading heuristic — a `path:../…` (or `path:./..`-style) input whose target directory is not inside the same `.git` tree as the flake declaring it. `grep -rn -e 'path:\.\./' --include='*.nix' .` flags candidates for manual same-tree confirmation (a plain grep cannot itself resolve "same tree," hence the heuristic wording). RUN: **yes** — red (`error: access to absolute path '...' is forbidden in pure evaluation mode`) on the planted `sibling-a/` (points at a separate repo `sibling-b/`), green on the planted `monorepo/` (`path:./sub`, same tree) and on `sibling-a-abs/`/`sibling-a-gitfile/` (absolute path / `git+file:?rev=` substitutes), all four fixtures exercised on both 2.35.2 and (the sibling-repo case) 2.31.5.

5. **A flake using relative `path:` inputs states a consumer floor of Nix ≥2.26 explicitly (in its README/CI matrix), and never claims support for an older Nix alongside that input form.**
   Rationale: the lock-format change is a hard parse break on older Nix, not a soft compatibility warning ([rl-2.26](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.26.md)); the fleet's own stated floor (`nixVersions.nix_2_31` = 2.31.5) already clears it, verified directly against this exact lock shape.
   Verify: `jq -r '.nodes | to_entries[] | select(.value.original.type == "path") | .key' flake.lock` (non-empty) checked against the flake's declared minimum Nix version in its README/CI matrix (must state ≥2.26). RUN: **yes** on the jq query and on both Nix versions reading the lock (see [Verification runs](#verification-runs)); the README-claim cross-check is a reading heuristic, no such README existed in the planted fixture.

6. **Prefer `locked.type`, never `original.type`, when reasoning about (or generating tooling around) what an `indirect`/registry input actually fetches.**
   Rationale: `original.type: "indirect"` gives no information about the real fetch mechanism; measured today it resolves to a `tarball` node against `releases.nixos.org`, not a `github:` node, and that mapping is registry state that can change.
   Verify: `jq -r '.nodes | to_entries[] | select(.value.original.type == "indirect") | .value.locked.type' flake.lock` — read the result, do not assume it is `github`. RUN: **yes**, against the planted `indirect-input/` fixture, warm store, 2026-09-27 ([Verification runs](#verification-runs)); result was `tarball`, matching the independent corpus observation on `nix-community/nix-index`.

7. **A CI job's dirty-tree gate runs both `git status --porcelain` (or an equivalent staged+unstaged check) and `git ls-files --others --exclude-standard .` — the `nix flake metadata`/`build` dirty warning alone only reacts to tracked changes to files Nix reads, and misses untracked new files entirely until they are `git add`ed.**
   Rationale: verified directly — a clean tree with no `dirtyRev` fields vs. a one-line uncommitted edit producing `dirtyRev`/`dirtyShortRev`/`dirtyRevision` and a stderr warning; untracked-file detection is [NIX-FLK-16](nix-flakes.md)'s separate, already-verified concern, and the two do not substitute for each other.
   Verify: `git -C . status --porcelain` — empty required for a clean release check. RUN: **yes**, against the planted `dirty-tree/` fixture's clean-vs-dirty pair (see [Verification runs](#verification-runs)).

8. **Never set `nixConfig.warn-dirty = false` in a published flake as a way to quiet the dirty-tree warning for consumers — it does nothing unless the consumer has separately enabled `accept-flake-config`, which is itself a trust escalation this program does not recommend asking consumers to make ([H8](../nix-topic-map.md)).**
   Rationale: verified directly on 2.35.2 that the warning persists regardless; matches the still-open [#9885](https://github.com/NixOS/nix/issues/9885).
   Verify: `grep -rn -e 'warn-dirty' --include='*.nix' .` — a hit is a finding (the setting is a no-op for the overwhelming majority of consumers who have not opted into `accept-flake-config`, so its presence signals either confusion or a deliberate but ineffective attempt). RUN: **yes**, against the planted `dirty-tree/flake.nix` with the setting present (warning still printed).

9. **A CI job that runs `nix flake show`/`check` bounds itself with both a wall-clock `timeout` (300s is a reasonable, previously-validated default) *and* a "new stage line within N seconds" liveness check on the verbose log — never wall-clock alone.**
   Rationale: measured directly that a genuine network-bound fan-out (helix's 303-grammar fetch) and a true silent hang (`nix-installer`, `treefmt-nix`) both eventually hit the same 300s wall-clock ceiling in the corpus audit, but only the hang produces *zero* new stage lines throughout; wall-clock alone cannot distinguish them, so a CI job that only enforces wall-clock will either kill legitimate slow-but-live evals or let true hangs run to the ceiling every time with no earlier signal.
   Verify: `nix flake check <ref> --no-build -v 2>&1 | ts '%.s'` (or any per-line timestamping), then check that no gap between consecutive `checking `/`evaluating `/`downloading `/`copying ` lines exceeds 60s. RUN: **no** — this is a shape derived from the wave-1/2 audit's own recorded per-repo stage output (helix, nix-installer, treefmt-nix all measured there, [exemplar-tool-runs.md Axis 2/3](../nix-audit/exemplar-tool-runs.md)); re-deriving a fresh 60s-gap timestamp trace from scratch for this dive was judged out of budget given the audit already captured the qualitative with/without-progress distinction directly in its raw logs.

10. **Never diagnose a cross-repo relative `path:../…` failure by grepping for the string `points outside of its parent's store path`; match on the input shape instead (a `path:../…` reference whose target is not inside the referring flake's own git tree).**
    Rationale: that exact error string is Nix-2.20.6-era; current Nix (2.31.5, 2.35.2) reports `access to absolute path '...' is forbidden in pure evaluation mode` for the identical illegal configuration — a diagnose skill or lint keyed on the old string alone will silently stop firing on current Nix.
    Verify: reading heuristic (see rule 4's grep); the version-dependent error-string change itself was directly observed, not inferred. RUN: **yes** — both error strings were reproduced on their respective Nix versions in this dive (2.20.6's string is [nix-flakes/systems-and-instantiation.md rule 10](../nix-flakes/systems-and-instantiation.md)'s own verified run; 2.35.2/2.31.5's string is this dive's, [Verification runs](#verification-runs)).

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/input-types-and-sources/` (every subdirectory is its own `git init -q && git add -A` repo; toolchain via `~/.cache/research-lang/nix-tools/run.sh`, Nix 2.35.2 unless a step names `nixVersions.nix_2_31`, 2.31.5).

**Submodules** (`submod-with/`, `submod-without/`, plus `sub-lib/` as the submodule source; store state: warm, local fixtures, no external network):
```
$ nix eval "git+file://…/submod-with?rev=<sha-with>#marker" --no-write-lock-file
"sub-lib-content\n"                                                    # EXIT 0

$ nix eval "git+file://…/submod-without?rev=<sha-without>#marker" --no-write-lock-file
error: … '.../sub/content.txt' does not exist                          # EXIT 1 (nonzero; error to stderr)
```

**LFS** (`lfs-with/`, `lfs-without/`; local fixtures, git-lfs 3.7.1):
```
$ nix eval "git+file://…/lfs-without?rev=<sha>#marker" --no-write-lock-file
"version https://git-lfs.github.com/spec/v1\noid sha256:56dcd0e7...\nsize 29\n"   # EXIT 0, WRONG content (pointer text)

$ nix eval "git+file://…/lfs-with?rev=<sha>#marker" --no-write-lock-file   # no remote configured
error: … error: '' doesn't have a scheme                                # EXIT 1

$ # after: git remote add origin file://…/lfs-with ; git config lfs.url file://…/lfs-with
$ nix eval "git+file://…/lfs-with?rev=<sha>#marker" --no-write-lock-file -vv
… while smudging git-lfs file '/payload.bin'
error: uploading to 'file:///…/lfs-with.git/info/lfs/objects/batch' is not supported   # EXIT 1
```

**Monorepo, same-tree `path:./sub`** (`monorepo/`; warm store):
```
$ nix eval ".#value"                    # generates flake.lock
"sub-value"                                                             # EXIT 0
# flake.lock gains a "parent": [] field on the sub node (2.26+ lock schema)

$ nix shell nixpkgs#nixVersions.nix_2_31 --command nix eval ".#value" --no-write-lock-file
"sub-value"                                                             # EXIT 0 — floor clears the 2.26 break
```

**Cross-repo sibling, relative `path:../…`** (`sibling-a/` → `sibling-b/`, two independent git repos):
```
$ nix eval ".#value" --no-write-lock-file                    # Nix 2.35.2
error: … error: access to absolute path '/nix/store/sibling-b/flake.nix' is forbidden in pure evaluation mode (use '--impure' to override)   # EXIT 1

$ nix shell nixpkgs#nixVersions.nix_2_31 --command nix eval ".#value" --no-write-lock-file   # nix 2.31.5
error: … error: access to absolute path '/nix/store/sibling-b' is forbidden in pure evaluation mode   # EXIT 1
```

**Cross-repo sibling, working substitutes** (`sibling-a-abs/`, `sibling-a-gitfile/`; Nix 2.35.2):
```
$ nix eval ".#value" --no-write-lock-file    # inputs.b.url = "path:/abs/.../sibling-b"
"sibling-b-value"                                                       # EXIT 0

$ nix eval ".#value" --no-write-lock-file    # inputs.b.url = "git+file:///abs/.../sibling-b?rev=<sha>"
"sibling-b-value"                                                       # EXIT 0
```

**Indirect registry input** (`indirect-input/`; warm store, real network to `releases.nixos.org` for the registry lookup, 2026-09-27):
```
$ nix eval ".#value" --no-write-lock-file
"ok"                                                                    # EXIT 0
# flake.lock nixpkgs node: {"type":"tarball","url":"https://releases.nixos.org/nixpkgs/nixpkgs-26.11pre1080219.8d5d270900d3/nixexprs.tar.zst", ...}
```

**Dirty tree** (`dirty-tree/`; Nix 2.35.2):
```
$ nix flake metadata . --json --no-write-lock-file    # clean, committed
{ ... no dirtyRev/dirtyShortRev/dirtyRevision fields ... }              # EXIT 0, no warning

$ echo "# comment" >> flake.nix   # uncommitted, tracked-file edit
$ nix flake metadata . --json --no-write-lock-file
warning: Git tree '…/dirty-tree' is dirty
{ ..., "dirtyRevision":"<sha>-dirty", "locked":{ "dirtyRev":"<sha>-dirty", "dirtyShortRev":"<short>-dirty", ... } }   # EXIT 0, warning on stderr

$ # flake.nix now also carries: nixConfig.warn-dirty = false;
$ nix flake metadata . --no-write-lock-file
warning: Git tree '…/dirty-tree' is dirty                                # STILL PRINTED — warn-dirty=false not honored without accept-flake-config
```

**Eval budget re-measurement** (warm store, both already fetched by the wave-1/2 audit sharing this store — honestly recorded as warm, not re-run cold):
```
$ time nix flake metadata github:helix-editor/helix/079a789e8cb0… --no-write-lock-file --json
… 0.183s total                                                          # EXIT 0

$ time nix flake show github:helix-editor/helix/079a789e8cb0… --no-write-lock-file --json   # default systems
… 0.156s total; non-x86_64-linux package sets returned as {} (not forced)   # EXIT 0

$ time nix flake metadata github:DeterminateSystems/nix-installer/76f61b52… --no-write-lock-file --json
… 0.267s total                                                          # EXIT 0
```
Cold-store numbers for the same two repos' `show`/`check --all-systems` (300s timeout / silent hang, no error) are from [exemplar-tool-runs.md Axis 2/3](../nix-audit/exemplar-tool-runs.md), not re-run cold here — re-evicting the shared store to force a genuine cold re-measurement was judged out of this dive's budget given the audit's numbers are recent (2026-09-27, same Nix 2.35.2) and already answer the qualitative question this row asks.

A verification that did **not** go red/green as a runnable command: rule 9's "stage-line gap" check (reading/log-analysis heuristic derived from the audit's existing raw output, not re-run as a fresh timestamped trace — see rule 9's own RUN note).

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (URL schemes, no `.tar.xz`) | `ghostty-org/ghostty@b40acce58dcf:flake.nix:12` (`.tar.zst`) | `NixOS/nix@209d2bc44288:flake.nix:4` (`.tar.xz`, the exact liability pattern — Nix's own repo, not yet migrated) |
| 2 (`self.submodules`) | none in the 37-repo corpus declare Git submodules at all ([exemplar-flake-shape.md](../nix-audit/exemplar-flake-shape.md) has no `.gitmodules` row) — mechanism verified only in this dive's own fixtures | n/a — no exemplar to contradict |
| 3 (`self.lfs`) | none in the corpus use Git LFS | n/a |
| 4 (monorepo pattern) | none of the 37 exemplars is a single-repo Nix monorepo splitting via `path:./sub`; `stackbuilders/nixpkgs-terraform@a5893ca82ec3:flake.nix:5-8` shows a *different* multi-target pattern (three separate nixpkgs branches as named inputs in one flake, not a sub-flake split) | n/a |
| 6 (indirect → tarball) | `nix-community/nix-index@dd6792b23059:flake.nix:5` (`nixpkgs.url = "nixpkgs/nixos-unstable"`) | n/a |
| 7/8 (dirty tree, `warn-dirty`) | corpus-wide: 0/37 exemplars set `nixConfig.warn-dirty` at all ([exemplar-flake-shape.md §6](../nix-audit/exemplar-flake-shape.md) lists `nixConfig` users; none is this key) | n/a |
| 9 (eval budget signal) | `sxyazi/yazi`, `direnv/direnv`, `numtide/treefmt` (all "slow but complete," progress-bearing, [exemplar-tool-runs.md Axis 2](../nix-audit/exemplar-tool-runs.md)) | `DeterminateSystems/nix-installer`, `numtide/treefmt-nix` (silent hangs at the identical 300s ceiling, no stage output) |
| 10 (version-dependent error string) | this dive's own fixtures on 2.35.2/2.31.5 | `nix-flakes/systems-and-instantiation.md rule 10`'s own fixture, run on Nix 2.20.6 — same illegal shape, different string |

## AI-agent angle

- **Assumes `?submodules=1`/`?dir=`-only consumer-side fixes for submodules.** An LLM trained on pre-2.27 material will reach for telling consumers to add `?submodules=1` to the input URL, or worse, silently drop submodule content and not notice because the flake evaluates fine (only a *build* that reads the missing files fails, often far from the input declaration). Mechanical check: `test -f .gitmodules && grep -q 'inputs\.self\.submodules' flake.nix` — a repo with `.gitmodules` but no `self.submodules` declaration is a near-certain miss.
- **Assumes LFS "just works" through any Git remote, including a local mirror or a self-hosted `file://` remote in CI.** Nix's LFS client is HTTP(S)-batch-API-only; an agent writing a CI smoke test against a local bare clone will get a *different*, misleading failure (`uploading to '...' is not supported`) and may "fix" it by removing the `self.lfs` flag entirely rather than pointing the test at a real remote — silently reintroducing the raw-pointer-text bug for every real consumer. Mechanical check: does the CI job's LFS-exercising step target an `http://`/`https://` clone URL?
- **Treats `path:../sibling` between two separate repositories as "should just work" because "it's just a path."** This is the most common monorepo-authoring mistake an LLM makes, and the failure is at *lock-generation* time with an error message that has itself changed across Nix versions (2.20.6 vs 2.31.5/2.35.2) — an agent pattern-matching on a remembered error string from older material will fail to recognize the same root cause on current Nix. Mechanical check: is the `path:../…` target inside the same `.git` tree as the referring `flake.nix`? If not, it needs an absolute `path:` or a `git+file:?rev=`.
- **Copies `channels.nixos.org/.../nixexprs.tar.xz` from an older flake it has seen (including, ironically, `NixOS/nix`'s own current `flake.nix`) without checking the current-era replacement.** Mechanical check: `grep -rn -e 'channels\.nixos\.org.*\.tar\.xz' --include='*.nix' .` — non-empty is a finding, replace with `.tar.zst`.
- **Assumes `original.type` tells you the real fetch mechanism for an `indirect` input**, describing it as "resolves to GitHub" from habit rather than checking `locked.type`, which today is `tarball`. Mechanical check: `jq -r '.nodes[] | select(.original.type == "indirect") | .locked.type' flake.lock`.
- **Sets `nixConfig.warn-dirty = false` believing it silences the dirty-tree warning for consumers**, because it reads as a plausible, symmetrical counterpart to other `nixConfig` settings the model has seen work. It is a no-op for the overwhelming majority of consumers (anyone without `accept-flake-config` enabled) and its presence should itself be flagged, not trusted. Mechanical check: `grep -rn -e 'warn-dirty' --include='*.nix' .` is itself the finding.
- **Judges a hung `nix flake check`/`show` purely by wall-clock timeout, concluding "the flake is broken" (or, worse, "the tool is broken") when the true cause is a legitimate but slow network-bound fetch fan-out** (helix's 303 grammars) that would have finished with more time, versus a genuine silent hang (`nix-installer`) that would never finish. Mechanical check: re-run with `-v` and check for any stage-line progress in the last 60s before concluding either way.

## Contested / evolving

- **Monorepo layering (M-A-16) is explicitly unsettled in the community as of mid-2026**: the [Discourse thread #78428](https://discourse.nixos.org/t/78428) (opened 2026-06-21, this program's own citation, re-read directly) shows a practitioner asking exactly this question and getting "it depends, hire an expert / talk to a consultancy" as the top reply, with `flake-parts` offered as "might help, might be completely wrong" — there is no converged community answer to "one root flake with `callPackage`d subdirectories vs. sub-flakes via `path:./sub`" as of this measurement. This dive's normative guidance (candidate 4) covers the mechanical *legality* question (same-tree relative paths work, cross-repo ones don't) but deliberately does not adjudicate the higher-level architecture question, which [nix-flakes.md's rule 10](../nix-flakes/systems-and-instantiation.md) and the map's M-A-16/M-A-17 rows correctly scope as still open.
- **`inputs.self.submodules`/`inputs.self.lfs` are recent (Nix 2.27, released 2025-03-03) and have essentially zero exemplar-corpus adoption** (0/37) — not because they're a bad pattern (the mechanism verified cleanly in this dive) but because the corpus predates or simply hasn't needed them; expect this to shift as more flakes vendor large or submodule-heavy assets, and expect published guidance recommending the pre-2.27 `?submodules=1`/manual-LFS-instruction pattern to age out over the next few nixpkgs cycles.
- **The relative-path input feature (Nix 2.26, released 2025-01-22) is still actively receiving bug reports as of this measurement** ([#12281](https://github.com/NixOS/nix/issues/12281), [#14762](https://github.com/NixOS/nix/issues/14762), both open) — the nested-subflake and cwd-relative-resolution edges are not yet fully hardened roughly 20 months after initial release, suggesting a published flake should keep its monorepo nesting shallow (one level, as tested here) rather than nesting sub-flakes inside sub-flakes, until those issues close.
- **`flake.lick`/`flake.lix`'s proposal to drop `follows` entirely** ([M-B-13](../nix-topic-map.md), out of this dive's scope) does not, as far as this dive found, propose changing any of the input-*type*/URL-*scheme* mechanics covered here — the two concerns (follows-graph semantics vs. fetch mechanism) appear orthogonal in current Lix planning, but this was not independently verified against Lix's own tracker within this dive's budget.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`src/nix/flake.md`](https://github.com/NixOS/nix/blob/master/src/nix/flake.md) (NixOS/nix, `master`) | `nix flake` manual page source (primary) — flake-reference types, `path:` semantics incl. same-tree constraint, self-attributes (`submodules`, `lfs`), `nixConfig` allow-list, lock-file schema | Nix 2.35-era master, fetched 2026-09-27 | The single most load-bearing source in this dive — every URL-scheme and `path:`/`self.*` claim traces to this exact text |
| [`doc/manual/source/release-notes/rl-2.26.md`](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.26.md) | Nix 2.26.0 release notes (primary) | Released 2025-01-22 | Introduces relative `path:` inputs and the lock-format break; states the old-Nix incompatibility explicitly |
| [`doc/manual/source/release-notes/rl-2.27.md`](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.27.md) | Nix 2.27.0 release notes (primary) | Released 2025-03-03 | Introduces `inputs.self.submodules` and `inputs.self.lfs` |
| [`doc/manual/source/release-notes/rl-2.33.md`](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.33.md) | Nix 2.33.0 release notes (primary) | Released 2025-12-09 | Confirms `nix registry resolve` and `nix flake clone`'s later generalization to all input types; useful era marker for how fast the flake-input surface is still moving |
| [`doc/manual/source/protocols/tarball-fetcher.md`](https://github.com/NixOS/nix/blob/master/doc/manual/source/protocols/tarball-fetcher.md) | Lockable HTTP Tarball protocol spec (primary) | Current `master`, fetched 2026-09-27 | Defines the `Link: <...>; rel="immutable"` mechanism a `tarball:` input relies on for reproducibility, and Gitea/Forgejo support |
| [`doc/release-notes/rl-2611.section.md`](https://github.com/NixOS/nixpkgs/blob/master/doc/release-notes/rl-2611.section.md) (nixpkgs) | Nixpkgs 26.11 release notes (primary) | 26.11 "Zokor", fetched 2026-09-27 | States the `nixexprs.tar.xz` → `.tar.zst` migration deadline and the `x86_64-darwin` drop, both directly cited |
| [NixOS/nix#7422](https://github.com/NixOS/nix/issues/7422) | GitHub issue (primary, project tracker) | Opened pre-2023, open | "Remove the flake registry or diminish its role" — grounds the indirect-input caution |
| [NixOS/nix#10089](https://github.com/NixOS/nix/pull/10089) | GitHub PR (primary) | Merged, landed in 2.26 | The actual relative-`path:` implementation PR; its description is the clearest single explanation of the "same tree" constraint's motivation |
| [NixOS/nix#12281](https://github.com/NixOS/nix/issues/12281) | GitHub issue (primary) | Open | `git+file:relative/path` resolves against process cwd, not `flake.nix` base — an open evaluation-invariance bug |
| [NixOS/nix#14762](https://github.com/NixOS/nix/issues/14762) | GitHub issue (primary) | Open | Nested sub-flake relative-path resolution breaks two levels deep — with a minimal linked reproducer |
| [NixOS/nix#12438](https://github.com/NixOS/nix/issues/12438) | GitHub issue (primary) | Closed | `nix flake archive` regression from the 2.26 relative-path change, with a documented `narHash`-pinning workaround |
| [NixOS/nix#10815](https://github.com/NixOS/nix/issues/10815) | GitHub issue (primary) | Closed (duplicate of open #11181) | Dirty `git+file:` inputs refused at lock time on Nix ≥~2.21; includes a community workaround script |
| [NixOS/nix#9885](https://github.com/NixOS/nix/issues/9885) | GitHub issue (primary) | Open since Nix 2.18.1 | `warn-dirty = false` inert without `accept-flake-config`; a comment thread links the exact manual section that explains why |
| [Discourse #78428](https://discourse.nixos.org/t/78428) | Community forum thread | Posted 2026-06-21 (this era) | Direct, current evidence that monorepo flake layering is genuinely unsettled community practice, not merely under-documented |
| [`nix-audit/exemplar-flake-shape.md` §2](../nix-audit/exemplar-flake-shape.md) | This program's own wave-1/2 audit (measured, not primary-upstream) | 2026-09-27, Nix 2.35.2 | Corpus-wide input-scheme and `follows`/`flake=false` counts across 37 real repos; the URL-scheme table in Finding 1 is drawn directly from it |
| [`nix-audit/exemplar-tool-runs.md` Axes 2/3/6](../nix-audit/exemplar-tool-runs.md) | This program's own wave-1/2 audit (measured) | 2026-09-27, Nix 2.35.2 | Cold-store `show`/`check`/eval-cost timings for helix, nix-installer, treefmt-nix and others; the baseline this dive's warm re-measurement compares against |
| [`nix-flakes/systems-and-instantiation.md` rule 10](../nix-flakes/systems-and-instantiation.md) | This program's wave-2 dive (measured, Nix 2.20.6) | 2026-09-27 | The original cross-repo relative-path measurement this dive re-ran on 2.35.2/2.31.5, surfacing the version-dependent error-string change |
