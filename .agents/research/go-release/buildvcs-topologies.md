---
title: "buildvcs across fleet repository shapes — submodules, nested repos, worktrees"
topic: "golang/go#74763 and GO-REL-03/GO-REL-06 vs. fleet repository topologies"
agent: go-release/buildvcs-topologies
model: sonnet
date_researched: 2026-09-26
sources_count: 13
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-release-vcs/
scope: >
  Covers whether Go 1.27.1's default -buildvcs=auto VCS stamping succeeds,
  fails, or silently degrades Main.Version on five concrete repository
  topologies (git submodule, independent nested git repo, nested Go module
  with no go.mod at the git root, git worktree, plain clone), and whether
  GO-REL-03 and GO-REL-06 as published in go-release.md hold for each. Does
  not re-derive reproducible-build flags, signing, SBOMs, or nested-module
  tag syntax (GO-MOD-14) — those stay with go-release.md and go-modules.md.
---

## Table of contents

1. [Findings](#findings)
   1. [The mechanism: three `vcs.FromDir` calls, not one](#1-the-mechanism-three-vcsfromdir-calls-not-one)
   2. [Git-on-git is never "multiple VCS" — worktrees included](#2-git-on-git-is-never-multiple-vcs--worktrees-included)
   3. [Shape (a): git submodule](#3-shape-a-git-submodule)
   4. [Shape (b): independent nested git repo](#4-shape-b-independent-nested-git-repo)
   5. [Shape (c): nested module, no go.mod at the git root](#5-shape-c-nested-module-no-gomod-at-the-git-root)
   6. [Shape (d): git worktree](#6-shape-d-git-worktree)
   7. [Shape (e): plain clone (control)](#7-shape-e-plain-clone-control)
   8. [What actually is golang/go#74763](#8-what-actually-is-golanggo74763)
   9. [The fleet's own repos](#9-the-fleets-own-repos)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Verification runs](#verification-runs)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- GO-REL-03 (never `-buildvcs=false`) and GO-REL-06 (tag-derived `Main.Version` fallback) **hold as written for every one of the five fleet-realistic shapes**, provided the main package being built sits at the repository's own top level — which is exactly where the fleet already puts every CLI entrypoint ([§9](#9-the-fleets-own-repos)).
- The brief's premise needs splitting into two unrelated Go behaviors: (1) a hard **"multiple VCS detected"** error, which requires two genuinely *different* VCS tools nested (git+svn, git+hg) and **never fires for any pure-git topology**, submodule or worktree included — confirmed by reading `vcsGitRoot.isRoot` and `FromDir`'s explicit `vcsCmd == vcsGit && vcs == vcsGit` exemption (go1.27.1:src/cmd/go/internal/vcs/vcs.go:516-521); and (2) a silent **`Main.Version=(devel)` degrade**, which is the real, reproducible bug and is [golang/go#74763](https://github.com/golang/go/issues/74763), still open, still present on Go 1.27.1.
- **golang/go#74763's actual shape is exactly fixture shape (c)**: a git repository whose top-level directory has no `go.mod`, with a nested Go module one or more directories down. Reproduced verbatim on 1.27.1: `go build -buildvcs=true` exits **0** and stamps `Main.Version=(devel)` even at a tag, with `vcs=git`, `vcs.revision` and `vcs.modified=false` all correctly populated — the version alone is wrong, silently, with no error and no warning.
- A **second, related but functionally distinct degrade** exists that #74763 does not describe: building a main package whose own directory sits *inside* a nested git boundary (a submodule or an untracked independent nested repo) also produces `Main.Version=(devel)`, but here **every** `vcs.*` setting is dropped too (not just the version) — this is the `pkgRepoDir != repoDir` branch (go1.27.1:src/cmd/go/internal/load/pkg.go:2591-2601), a different code path than #74763's `goModPath` branch (:2634-2637).
- `-buildvcs=true` turns the submodule/nested-repo-interior degrade into a **hard build failure** (`exit 1`, `"main package is in repository … but current directory is in repository …"`) instead of a silent one — it turns the *monorepo-shape-(c)* degrade into **nothing**: still exit 0, still `(devel)`, because that path never reaches the mismatch check at all.
- **Neither `-buildvcs=false` nor `-buildvcs=true` changes the observable output** for shapes (a)/(b)'s interior-package case: `-buildvcs=auto`'s silent omission and `-buildvcs=false`'s explicit omission produce byte-identical `go version -m` output. GO-REL-11's ban on `-buildvcs=false` is therefore neither the cause of nor the cure for this failure mode — it is orthogonal.
- The **only fix that reproducibly restores GO-REL-06's fallback** in shape (c) requires two things together: a real `go.mod` at the git repository's true top level, **and** the nested module's declared path in `go.mod` must be a genuine subpath of the root module's path (`root/tools/mytool`, not an unrelated name) — a root-level `go.mod` alone, with a mismatched nested module path, still produced `(devel)` in this fixture.
- **Git worktrees fully and correctly stamp VCS info** on Go 1.27.1, including tag-derived `Main.Version`, with no special flag. This is a shipped, tested feature (`.git` file / `gitdir:` pointer support, [golang/go#58218](https://github.com/golang/go/issues/58218), milestone Go1.27) — confirmed both by reading `vcsGitRoot.isRoot` (go1.27.1:src/cmd/go/internal/vcs/vcs.go:570-605, which explicitly cites the issue) and by building inside a real linked worktree.
- This means **the fleet's own dev topology — building from inside `.agents/worktrees/<name>`, exactly like this research task runs — is not at risk**, and neither is any repo that vendors non-Go dependencies as git submodules the way `ocx` and `grimoire` already do.
- The `GODEBUG=allowmultiplevcs=1` escape hatch exists for the *other* thing — the true "multiple VCS detected" hard error — and was backported to 1.24.5/1.23.11 and made default-strict starting 1.25rc2 ([go.dev/doc/godebug](https://go.dev/doc/godebug)) as a VCS-injection mitigation, not as a fix or workaround for #74763.
- **Decide, restated:** GO-REL-03 needs no revision for the fleet as it builds today. Add one SHOULD (below) covering the shape-(c) monorepo case only, since a future multi-module Go repo (if the fleet ever adopts one) would hit it silently and `go build` gives zero indication anything is wrong.
- GO-REL-06's fallback clause ("when `-X` is empty, fall back to `debug.ReadBuildInfo().Main.Version`") is **not universally reliable** and should carry an explicit caveat: it is reliable only when the main package, its module, and the invocation directory are the same repository and that repository has a `go.mod` at its detected VCS root — which is every fleet shape tested except a not-yet-built multi-module monorepo.
- `dominikh/go-tools@6cb65e58a558:.gitmodules` is exemplar precedent matching the fleet's own submodule pattern exactly: a submodule (`website/themes/docsy`) holding a non-Go asset (a Hugo theme), never the module's own main package.
- Practical corollary for anyone debugging a `(devel)` version in the wild: `go version -m` on the binary is not enough to diagnose *why* — a binary can show `(devel)` with full `vcs.*` fields present (shape c) or `(devel)` with zero `vcs.*` fields (shapes a/b interior) and these mean two different failures with two different fixes.

## Findings

### 1. The mechanism: three `vcs.FromDir` calls, not one

`setBuildInfo` (go1.27.1:src/cmd/go/internal/load/pkg.go:2371) does not call `vcs.FromDir` once. It calls it up to three times and requires all three to agree:

1. `repoDir, vcsCmd, err = vcs.FromDir(base.Cwd(), "")` — from the **current working directory** (:2564).
2. `pkgRepoDir, _, err := vcs.FromDir(p.Dir, "")` — from the **main package's directory** (:2591).
3. `modRepoDir, _, err := vcs.FromDir(p.Module.Dir, "")` — from the **main module's root directory** (:2603).

Each call independently walks upward from its starting directory looking for a VCS root (`.git`, `.hg`, `.svn`, `.fslckout`/`_FOSSIL_`), and returns the **deepest** one found from that starting point (go1.27.1:src/cmd/go/internal/vcs/vcs.go:488-538). If `pkgRepoDir != repoDir` or `modRepoDir != repoDir`, the behavior forks on the `-buildvcs` value:

- `-buildvcs=auto` (default): `goto omitVCS` — silent, no error, `Main.Version` stays `(devel)`, no `vcs.*` settings at all (:2601, :2613).
- `-buildvcs=true`: `setVCSError(...)` and the build **fails**, `exit 1`, with the exact message `"main package is in repository %q but current directory is in repository %q"` (:2598) or the module-level equivalent (:2610).
- `-buildvcs=false`: the whole block is skipped from the start (`wantVCS` is `false`); output is identical to the `auto` silent-omission case.

This documented invariant is stated tersely in `go help build`/`pkg.go.dev/cmd/go`: *"version control information is stamped into a binary if the main package, the main module containing it, and the current directory are all in the same repository"* ([pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go)). The three-call mechanism above is what that sentence compiles to.

### 2. Git-on-git is never "multiple VCS" — worktrees included

`FromDir`'s inner loop checks, at each directory level as it walks upward, whether **any** VCS root type is present (go1.27.1:src/cmd/go/internal/vcs/vcs.go:500-525). The hard failure path is:

```go
if vcsCmd == vcsGit && vcs == vcsGit {
    // Nested Git is allowed, as this is how things like
    // submodules work. Git explicitly protects against
    // injection against itself.
    continue
}
return "", nil, fmt.Errorf("multiple VCS detected: %s in %q, and %s in %q", ...)
```
(:516-522)

This exemption is **unconditional** — it does not check `allowmultiplevcs`, whether the nested `.git` is a real submodule, an independent nested repo, or a worktree pointer file. Two `.git` roots of the same VCS type at different levels of the walk are always fine; the error requires two *different* VCS command names (`git` vs `svn`, `git` vs `hg`, etc.) — a shape none of this brief's five fixtures produce, and one that in practice only arises from a vendored tarball that happens to carry a stray `.svn`/`.hg` directory, or a deliberate VCS-injection attempt (the scenario `GODEBUG=allowmultiplevcs` is a mitigation for; [go.dev/doc/godebug](https://go.dev/doc/godebug)).

A worktree's `.git` is a regular file containing `gitdir: <path>`, not a directory. `vcsGitRoot.isRoot` explicitly parses this form and treats it as a valid git root (go1.27.1:src/cmd/go/internal/vcs/vcs.go:570-605), citing [golang/go#58218](https://github.com/golang/go/issues/58218) in its own comment. That issue's milestone is **Go1.27** — this worktree support is new as of the exact toolchain version this program measures against, not a long-standing feature.

### 3. Shape (a): git submodule

Fixture: `submodule-repo-root/` (outer, `example.com/submodrepo`, `go.mod` at root) with `external/sub` added via `git submodule add`, confirmed as a real gitlink (`160000 commit …`) plus a `.git` *file* (`gitdir: ../../.git/modules/external/sub`) inside the submodule (git-scm's ["Git Tools - Submodules"](https://git-scm.com/book/en/v2/Git-Tools-Submodules) documents the `160000` gitlink mode). The submodule directory also contains a Go `main` package (`external/sub/cmd/subtool`) purely to exercise the mechanism — this is not how the fleet's real submodules are used (see [§9](#9-the-fleets-own-repos)).

| Build | `-buildvcs` | Exit | `vcs=git` present | `Main.Version` |
|---|---|---|---|---|
| Outer root package (`.`) | auto | 0 | yes | pseudo-version, then `v1.2.3` after tag |
| Outer root package (`.`) | true | 0 | yes | same |
| `./external/sub/cmd/subtool` | auto | 0 | **no** | `(devel)`, unaffected by tagging the outer repo |
| `./external/sub/cmd/subtool` | true | **1** | — | build fails: `main package is in repository ".../external/sub" but current directory is in repository "..."` |
| `./external/sub/cmd/subtool` | false | 0 | no | `(devel)` — identical output to the `auto` row |

The outer package is completely unaffected by the submodule's existence: `FromDir(cwd=outer)` never descends into `external/sub`, so nothing about the submodule is even examined when building the module's own top-level package.

### 4. Shape (b): independent nested git repo

Fixture: `nested-repo-root/` (outer, `example.com/nestedrepo`) with `vendor-src/` initialized as its **own independent** `git init` — no `.gitmodules` entry, no gitlink; `git status --porcelain` on the outer repo shows it as a plain untracked directory (`?? vendor-src/`) until `.gitignore`d. `vendor-src/tool` is a second `main` package.

Results are **identical in kind** to shape (a): outer root package builds and stamps cleanly under both `auto` and `true`; `./vendor-src/tool` degrades to `(devel)` with no `vcs.*` fields under `auto`/`false`, and fails outright under `true` with the same `"main package is in repository … but current directory is in repository …"` message. The mechanism does not distinguish "is this a registered submodule" from "is this just some other git repo somebody dropped in a subdirectory" — both are, from `FromDir`'s point of view, a second git root nested inside the first, and the *only* thing that matters is whether the package being built and the invocation directory land in the same one.

One shape-specific gotcha: before `.gitignore`-ing `vendor-src/`, the **outer** build showed `vcs.modified=true` / `+dirty` even though `vendor-src` itself had zero uncommitted changes — because `git status --porcelain` at the outer level reports the whole untracked directory as dirty. An independent nested repo that is not `.gitignore`d poisons the outer release build's cleanliness check, which is a real, silent way to accidentally ship a `+dirty` release artifact for a totally unrelated reason.

### 5. Shape (c): nested module, no go.mod at the git root

Fixture: `monorepo-root/` — a single `git init` with **no `go.mod`** at that top level, and `tools/mytool/go.mod` several directories down. This is [golang/go#74763](https://github.com/golang/go/issues/74763)'s exact shape.

Building from `tools/mytool/`: `cwd`, `p.Dir`, and `p.Module.Dir` are **all the same directory**, so `FromDir` returns the same `repoDir` (the outer `.git`) for all three calls — no mismatch, the `pkgRepoDir != repoDir` branch never fires. The code proceeds past that check, runs `git status`/`git log` successfully, and **appends `vcs`, `vcs.revision`, `vcs.time`, `vcs.modified` to `info` already** (go1.27.1:src/cmd/go/internal/load/pkg.go:2624-2632) — then hits:

```go
rootModPath := goModPath(repoDir)
if rootModPath == "" {
    goto omitVCS
}
```
(:2634-2637)

`goModPath` reads `go.mod` **at `repoDir` exactly**, with no fallback (:1290-1305 in the same file). Since there is none, `rootModPath == ""`, and the jump to `omitVCS` skips only the version-computation block — the `vcs.*` settings already appended stay in the binary. The result: `go version -m` shows a **fully-populated, correct `vcs=git`/`vcs.revision`/`vcs.time`/`vcs.modified=false`**, but `Main.Version` stuck at `(devel)`. This is verified identical under `-buildvcs=true` (exit 0, not exit 1 — the mismatch branch that produces the hard error is a different piece of code, never reached here) and stays `(devel)` **after tagging** both a plain `v1.2.3` at the repo root and a correctly-shaped `tools/mytool/v2.0.0`.

The fix, verified: a `go.mod` at the true repository root is **necessary but not sufficient** — a root `go.mod` with an unrelated module path still produced `(devel)` in this fixture. Only once the nested module's declared path was rewritten to be a genuine subpath of the root module's path (`example.com/monorepo-root-marker/tools/mytool` under a root `go.mod` declaring `example.com/monorepo-root-marker`) did `Main.Version` become a real (pseudo-)version. `goModPath`+`module.SplitPathVersion`+`Fetcher.LookupLocal` (:2634-2653) require this subpath relationship to resolve a revision at all; nested-module tag conventions (`dir/vX.Y.Z`, GO-MOD-14) are what that lookup then matches against, but the path relationship comes first and this fixture shows tag convention alone does not compensate for its absence.

### 6. Shape (d): git worktree

Fixture: `worktree-main/` (a normal repo) with `git worktree add -b feature-branch .agents/worktrees/feature main`, mirroring this program's own `.agents/worktrees/go` layout and `.git` file exactly (`gitdir: <repo>/.git/worktrees/feature`).

Building inside the linked worktree, with no flags: full, correct stamping, both before and after tagging — `vcs=git`, `vcs.revision`, `vcs.time`, `vcs.modified=false`, and `Main.Version` moving from a pseudo-version to `v1.2.3` on tag, byte-for-byte the same shape as the plain-clone control. `FromDir(cwd)`, `FromDir(p.Dir)` and `FromDir(p.Module.Dir)` all return the **worktree's own `.git` file as the root** (not the main checkout's `.git` directory) — `vcsGitRoot.isRoot` treats the gitdir-pointer file as a first-class root in its own right (go1.27.1:src/cmd/go/internal/vcs/vcs.go:574-580: a directory `.git` returns true immediately; the pointer-file branch at :583-604 is reached only when it is not a directory), so all three calls agree trivially and no cross-worktree comparison ever happens.

### 7. Shape (e): plain clone (control)

Fixture: `plain-clone/` — single `git init`, `go.mod` at root, one commit. Behaves exactly as documented: pseudo-version before tagging, `vX.Y.Z` after, `vcs.modified=false` when the tree is clean, flips to `true`/`+dirty` the moment an untracked file (even a leftover build artifact) sits in the working tree — a reminder that "before/after tagging" fixture builds must write their output *outside* the repo, or every build looks dirty regardless of VCS shape.

### 8. What actually is golang/go#74763

The GitHub issue (opened by dmitshur, 2025-07-26; **currently open**, milestone **Backlog**, labels `BugReport`, `GoCommand`, `NeedsInvestigation`) reports precisely shape (c): `go run -buildvcs=true .` in a nested module reports `v0.0.0-20250726003140-f31775ad565e` on Go 1.24.5 and `(devel)` on Go 1.25rc2 for the identical repository. **This program's fixtures show the regression is still present, unchanged, on Go 1.27.1** — nearly two full release cycles after the report, with no linked fix, no milestone target, and no mention in the [Go 1.25](https://go.dev/doc/go1.25) or (by inspection during this dive) Go 1.26 release notes. It is not release-noted anywhere; the only places this behavior is documented at all are the tracker issue itself and the terse "same repository" sentence in `go help build`.

The brief's paraphrase — "fails with multiple VCS detected, or degrades Main.Version to (devel)" — bundles two things the source code keeps completely separate: the `(devel)` degrade (§5, §3/§4) is unconditional and silent under `auto`, and never produces a "multiple VCS detected" message under any of the five shapes tested. The literal "multiple VCS detected" string is unreachable by any pure-git topology (§2) and needs an actual second VCS tool to trigger. The wave-3 dive's "could not reproduce it (no SVN)" note is correctly scoped to *that* string; it did not attempt shape (c), which needs no second VCS tool at all and reproduces on nothing more exotic than a two-line `git init` plus a subdirectory.

### 9. The fleet's own repos

Read-only check per the brief: `/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire` **both carry a `.gitmodules`** (three and two submodule entries respectively, all pointing at `ocx-sh/*` Rust crates — `rust-oci-client`, `docker_credential`, `sigstore-rs`); `/home/mherwig/dev/ocx-sdk-python` has **no `.gitmodules`**. In both `ocx` and `grimoire`, the submodules live under `external/` and hold vendored *Rust* dependency source; the crates' own entrypoints live in `crates/`/`src/` at the repository's own top level, never inside `external/`. This is structurally identical to the exemplar precedent in [§Exemplar evidence](#exemplar-evidence) and is exactly the shape this dive's §3/§4 findings say is safe: the package that gets `-X`/VCS-stamped is never the one sitting inside the nested git boundary.

## Normative guidance candidates

1. **GO-REL-03 needs no wording change.** "Never pass `-buildvcs=false` to a release build" holds for every fleet-realistic shape tested (plain clone, submodule, independent nested repo, git worktree), because in every case the release build's main package sits at the invoking repository's own top level. Rationale: `-buildvcs=false` and the silent `auto` degrade produce byte-identical output for the one shape that *does* fail (§3/§4), so banning `false` neither helps nor is undermined by that shape — and every other shape needs no flag at all. **Verify:** the existing GO-REL-03 grep (`grep -rn -e 'buildvcs=false' .goreleaser.y*ml Makefile .github/workflows`, directory operand `.`, empty output = pass). **RUN:** yes — re-confirmed on all five shapes in this dive's fixtures; no new check needed.
2. **New SHOULD — GO-REL-15 candidate.** Before building a nested Go module whose containing git repository has no `go.mod` at the repository's own top level, verify `go version -m` on a throwaway build shows a real (pseudo-)version, not `(devel)`, at the module's actual release tag — do not assume `-buildvcs=true` will catch the mismatch, because for this specific shape it does not: it returns exit 0. Rationale: this is [golang/go#74763](https://github.com/golang/go/issues/74763), open and unfixed on 1.27.1; the failure is silent and version-string-only, so a CI job that only checks the build's exit code will not catch it. **Verify:** `go build -o /tmp/x ./... && go version -m /tmp/x | grep -c -e '(devel)'` at a tag — non-zero output is the finding, `0` is the pass. Directory operand is the module dir; empty grep output (exit 1 from grep) means pass. **RUN:** yes — `fixtures/go-release-vcs/monorepo-root/tools/mytool/` (`mono-tagged-auto.bin` prints `(devel)`, count 1, exit 0; `mono-fixed2-auto.bin` after adding a correctly-subpathed root `go.mod` prints `v1.2.4-0.2026...`, count 0, exit 1 — the grep's own exit code, not go build's).
3. **New SHOULD — GO-REL-16 candidate.** Never locate a Go `main` package's source inside a git submodule's working directory or inside any git-tracked subtree that has its own independent `.git`. If a build ever needs to produce a binary from such a location, pin `-buildvcs=false` explicitly for that one build id with a comment naming the nested-repo boundary, since `auto` will silently strip all VCS metadata (not just the version) and `true` will hard-fail the build. Rationale: `pkgRepoDir != repoDir` (go1.27.1:src/cmd/go/internal/load/pkg.go:2591-2601) degrades this shape completely — no `vcs.revision` at all, unlike shape (c) which keeps `vcs.revision` and only loses the version. **Verify:** `go build -buildvcs=true <pkg-inside-submodule>`; exit 1 with `"main package is in repository"` in stderr is the signal that the boundary exists; a clean exit 0 on the fleet's actual release build ids means this rule is moot for the current fleet. **RUN:** yes — `fixtures/go-release-vcs/submodule-repo-root/` and `fixtures/go-release-vcs/nested-repo-root/` both watched red (exit 1, message quoted) and green (outer package, exit 0, correct tag).
4. **Confirm, do not change, GO-REL-06.** The fallback ("`-X` if set, otherwise `debug.ReadBuildInfo().Main.Version`") is reliable for the fleet's own git-worktree development flow. Rationale: worktree support (`.git` file / `gitdir:` pointer) shipped in the **Go1.27** milestone ([golang/go#58218](https://github.com/golang/go/issues/58218)) — the exact toolchain version this program targets — and was watched fully green here with no special handling. **Verify:** `go build ./... && go version -m <bin>` from inside a `git worktree add`-created directory at a tag; `grep -c -e '(devel)'` on the output must be `0`. **RUN:** yes — `fixtures/go-release-vcs/worktree-main/.agents/worktrees/feature/` (`worktree-tagged.bin`: `v1.2.3`, count 0).
5. **Do not conflate "multiple VCS detected" with any of the above.** That specific error string requires two *different* VCS tool roots (git+svn, git+hg) nested or adjacent in the walk; it is not reachable by any submodule, nested-git, or worktree shape, regardless of `GODEBUG=allowmultiplevcs`. Rationale: `vcsCmd == vcsGit && vcs == vcsGit` is an unconditional exemption in the walk (go1.27.1:src/cmd/go/internal/vcs/vcs.go:516-521), independent of the godebug flag, which only governs the *different-VCS-type* case. **Verify:** reading heuristic — grep the fixture's stderr/error text for the literal string `multiple VCS detected` across all five shapes; it must never appear. **RUN:** yes, negatively — none of the ~20 builds run across shapes (a)-(e) under `auto`/`true`/`false` ever produced that string; the only two error strings observed were the two `"…is in repository…"` messages quoted in §3/§4.
6. **`.gitignore` any independent nested git repo you keep inside a release checkout.** An untracked nested `.git` directory (shape b, before `.gitignore`) makes the *outer* build report `vcs.modified=true`/`+dirty` even though nothing in the nested repo or the outer repo's tracked files changed. Rationale: `git status --porcelain` at the outer level reports the whole untracked directory, and Go's `gitStatus` (go1.27.1:src/cmd/go/internal/vcs/vcs.go:230-256) treats any non-empty `status --porcelain` output as `Uncommitted: true`. **Verify:** `git -C <repo> status --porcelain --ignored=no | grep -c -e '^??'` before a release build — non-zero is the finding (an untracked path exists that will poison the dirty check); `0` is the pass. **RUN:** yes — `fixtures/go-release-vcs/nested-repo-root/` (`?? vendor-src/` present → `+dirty` on the outer build; after `.gitignore` → `vcs.modified=false`).
7. **A `dir/vX.Y.Z` nested-module tag alone does not fix a missing root `go.mod`.** If a repository ever needs both a top-level `go.mod` marker and nested modules (the general fix for candidate 2 above), the root module's declared path and the nested module's declared path must line up as parent/child (GO-MOD-14's existing convention), not merely both exist. Rationale: this fixture tried a correctly-formatted `tools/mytool/v2.0.0` tag against a root `go.mod` with an unrelated module path and still got `(devel)` — the path relationship, not the tag format, gates `Fetcher.LookupLocal`'s resolution (go1.27.1:src/cmd/go/internal/load/pkg.go:2649-2653). **Verify:** reading heuristic — compare the root `go.mod`'s `module` line against the nested `go.mod`'s `module` line; the nested one must literally be `<root module>/<relative dir path>`. **RUN:** yes, both the mismatched-name attempt (still `(devel)`) and the corrected-subpath attempt (real version) are in this dive's fixtures.

## Verification runs

Toolchain: Go 1.27.1 via `/home/mherwig/.cache/research-lang/go-tools/run.sh`, `GOTOOLCHAIN=local`. Fixture root: `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-release-vcs/`. All binaries were built to `fixtures/go-release-vcs/out/` (outside every repo, to avoid the leftover-artifact `+dirty` trap described in candidate 6).

| Shape | Command | Exit | Relevant `go version -m` / stderr lines |
|---|---|---|---|
| (e) plain-clone, before tag | `go build -o out/plain-notag.bin .` (in `plain-clone/`) | 0 | `mod example.com/plainclone v0.0.0-2026…-1963f1ff8c3e`, `vcs.modified=false` |
| (e) plain-clone, after `v1.2.3` | `go build -o out/plain-tagged.bin .` | 0 | `mod example.com/plainclone v1.2.3`, `vcs.modified=false` |
| (d) worktree, before tag | `go build -o out/worktree-notag.bin .` (in `.agents/worktrees/feature/`) | 0 | `mod example.com/worktreemod v0.0.0-2026…-c7b2d3ddaa81` |
| (d) worktree, after `v1.2.3` | `go build -o out/worktree-tagged.bin .` | 0 | `mod example.com/worktreemod v1.2.3`, `vcs.modified=false` |
| (a) submodule, outer, before tag | `go build -o out/submod-outer-notag.bin .` (in `submodule-repo-root/`) | 0 | `mod example.com/submodrepo v0.0.0-2026…-f0b511eea67c` |
| (a) submodule, outer, after tag | `go build -o out/submod-outer-tagged.bin .` | 0 | `mod example.com/submodrepo v1.2.3`, `vcs.modified=false` |
| (a) submodule, **interior** pkg, auto | `go build -o out/submod-inner-notag-auto.bin ./external/sub/cmd/subtool` | 0 | `mod example.com/submodrepo (devel)` — **no `vcs*` lines at all** |
| (a) submodule, interior pkg, auto, after outer tag | `go build -o out/submod-inner-tagged-auto.bin ./external/sub/cmd/subtool` | 0 | still `(devel)` — outer tag has zero effect |
| (a) submodule, interior pkg, `-buildvcs=true` | `go build -buildvcs=true -o out/submod-inner-notag-true.bin ./external/sub/cmd/subtool` | **1** | `error obtaining VCS status: main package is in repository ".../external/sub" but current directory is in repository "..."` |
| (a) submodule, interior pkg, `-buildvcs=false` | `go build -buildvcs=false -o out/submod-inner-false.bin ./external/sub/cmd/subtool` | 0 | `(devel)`, no `vcs*` lines — **identical to the `auto` row** |
| (b) independent nested repo, outer, before tag (untracked, not ignored) | `go build -o out/nested-outer-notag.bin .` (in `nested-repo-root/`) | 0 | `mod example.com/nestedrepo v0.0.0-…+dirty`, `vcs.modified=true` (poisoned by the untracked `vendor-src/`) |
| (b) same, after `.gitignore` + tag | `go build -o out/nested-outer-tagged.bin .` | 0 | `mod example.com/nestedrepo v1.2.3`, `vcs.modified=false` |
| (b) interior pkg, auto | `go build -o out/nested-inner-notag-auto.bin ./vendor-src/tool` | 0 | `mod example.com/nestedrepo (devel)` — no `vcs*` lines |
| (b) interior pkg, `-buildvcs=true` | `go build -buildvcs=true -o out/nested-inner-notag-true.bin ./vendor-src/tool` | **1** | `main package is in repository ".../vendor-src" but current directory is in repository "..."` |
| (c) nested module, no root go.mod, auto, before tag | `go build -o out/mono-notag-auto.bin .` (in `monorepo-root/tools/mytool/`) | 0 | `mod example.com/mytool (devel)` **with** `vcs=git`, `vcs.revision=…`, `vcs.modified=false` all present |
| (c) same, `-buildvcs=true` | `go build -buildvcs=true -o out/mono-notag-true.bin .` | 0 | same — `true` does **not** turn this into an error |
| (c) same, after root `v1.2.3` tag | `go build -o out/mono-tagged-auto.bin .` | 0 | still `(devel)` |
| (c) same, after `tools/mytool/v2.0.0` tag, still no root go.mod | (same build as above; tag alone, no go.mod, does not change anything) | 0 | still `(devel)` |
| (c) fix attempt 1: root go.mod with unrelated module path | `go build -o out/mono-fixed-auto.bin .` | 0 | still `(devel)` |
| (c) fix attempt 2: root go.mod as true parent path + `tools/mytool/v2.0.0` tag | `go build -o out/mono-fixed2-auto.bin .` | 0 | `mod example.com/monorepo-root-marker/tools/mytool v1.2.4-0.2026…` — **real version, not `(devel)`** |

Candidate 5's negative check (`grep -c -e 'multiple VCS detected'` over every stderr capture above) printed `0` in all ~20 runs; the only two error strings ever observed are the `"…is in repository…"` lines quoted above, both from `-buildvcs=true` on shapes (a)/(b)'s interior package.

## Exemplar evidence

- **Satisfies §9's "submodules hold vendored non-Go assets, never the module's own entrypoint" pattern:** `dominikh/go-tools@6cb65e58a558:.gitmodules` — one submodule, `website/themes/docsy` (a Hugo theme for the project's docs site), unrelated to and outside every Go package the repo builds. This is the *only* `.gitmodules` in the 35-repo corpus (checked at depth 2 across all exemplars).
- **No exemplar reproduces shape (c).** A depth-3 scan for "no top-level `go.mod` but a nested one" across the corpus found zero matches — every multi-module exemplar (the 4/35 with a committed `go.work`, per the go-modules dive's H6 correction) keeps a `go.mod` at its own repository root as well as in its member directories. This is negative evidence that shape (c) is a genuinely uncommon layout among widely-used Go repos, which is consistent with #74763 being reported once, in 2025, and left unfixed rather than repeatedly hit.
- **`ocx@<HEAD>:.gitmodules` and `grimoire@<HEAD>:.gitmodules`** (both read-only, both outside the exemplar corpus proper but named in the brief) are the fleet's own precedent for shape (a): three and two submodules respectively, all Rust crates under `external/`, entrypoints in `crates/`/`src/` at the repo root — the safe half of §3's table, never the interior-package half.
- **`ocx-sdk-python`** carries no `.gitmodules` at all — irrelevant to this dive's shapes, confirming the brief's read-only check as requested.

## AI-agent angle

1. **Treating `(devel)` as one failure mode instead of two.** An agent debugging a `(devel)` version report will typically check "is `-buildvcs` set" and stop there. This dive shows `(devel)` has at least two distinct root causes on Go 1.27.1 with different fixes: no `vcs.*` fields at all (submodule/nested-repo interior — fix is architectural, don't build a main package from inside a nested git boundary) versus full `vcs.*` fields but no version (monorepo shape c — fix is a root `go.mod` with a correctly-subpathed nested module). **Smallest check:** `go version -m <bin> | grep -c -e '^\s*build\s*vcs='` — `0` means the first family, `1`+ with `(devel)` on the `mod` line means the second.
2. **Assuming `-buildvcs=true` converts every silent `(devel)` into a loud failure.** It does for the submodule/nested-repo-interior mismatch (§3/§4) but explicitly does **not** for the monorepo shape (§5) — verified exit 0 both ways. An agent that "fixes" a `(devel)` report by adding `-buildvcs=true` to CI and seeing it still pass (because the build still exits 0) will wrongly conclude the flag worked. **Smallest check:** after adding `-buildvcs=true`, still grep the *build's own output artifact* for `(devel)`, never just the build's exit code.
3. **Believing `GODEBUG=allowmultiplevcs=1` is the fix for a `(devel)` report.** It addresses a different, much rarer error (`"multiple VCS detected"` with two different VCS tool types) that this dive could not trigger with any pure-git topology. Setting it in response to a `(devel)`/submodule/worktree report is a no-op that does nothing observable. **Smallest check:** grep the actual error text for the literal string `multiple VCS detected` before reaching for this godebug; if that string is absent, the godebug is the wrong lever.
4. **Assuming git worktrees are second-class for Go tooling.** An agent generalizing from older training data (`.git`-as-file support in `cmd/go` is a **Go1.27** milestone item, [golang/go#58218](https://github.com/golang/go/issues/58218)) might over-defensively avoid building or add unnecessary `-buildvcs=false`/manual `-X`-only workarounds when working inside a linked worktree — unnecessary on 1.27.1+, verified fully green here with zero special handling. **Smallest check:** `go version -m` on a worktree-built binary; if `vcs.revision` is present, no workaround is needed.
5. **Copying goreleaser/CI recipes that build a path inside `vendor/`, `external/`, or `third_party/` as if it were an ordinary subpackage** without checking whether that path is a separate git checkout. A recipe like `go build ./external/...` looks completely ordinary and will build silently-degraded binaries with no error under `auto`. **Smallest check:** before adding any `go build`/`go install` target under a vendored directory, run `git -C <dir> rev-parse --show-toplevel` and compare it against the module root's own `rev-parse --show-toplevel` — a mismatch means candidate 3's rule applies.

## Contested / evolving

- **Whether golang/go#74763 will be fixed before Go 1.28 or later is genuinely open.** As of 2026-09-26 it carries no milestone, no linked CL, and no maintainer comment beyond the original report (per the tracker's own metadata: milestone Backlog, label `NeedsInvestigation`). This dive adds independent, current-toolchain (1.27.1) confirmation that it is unfixed; a future re-check against 1.28+ should re-run the exact `monorepo-root/` fixture rather than trust this note past its version.
- **The `allowmultiplevcs` hardening is recent and has a real backport history** (default-strict starting 1.25rc2, backported to 1.24.5 and 1.23.11 per [go.dev/doc/godebug](https://go.dev/doc/godebug)) that is easy to conflate with #74763 because both shipped in the same Go 1.25 cycle and both involve "VCS" and "(devel)"/error language. Treat them as two separate changes with two separate godebugs/flags; this dive found no single godebug that affects #74763's shape.
- **Whether the fleet should adopt a multi-module Go repository at all** is upstream of whether GO-REL-15 (candidate 2) is ever load-bearing. The frame's H6 correction already notes multi-module repos are a minority pattern (4/35, always with a committed `go.work`) and always keep a root `go.mod`; if the fleet follows that norm, candidate 2 stays a defensive SHOULD that this program has pre-verified rather than a live risk.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [go1.27.1 src/cmd/go/internal/vcs/vcs.go](https://go.googlesource.com/go/+/refs/tags/go1.27.1/src/cmd/go/internal/vcs/vcs.go) (read locally at `$GOROOT/src/cmd/go/internal/vcs/vcs.go`) | The toolchain's own VCS-root-detection source, this program's measured 1.27.1 | 2026-09-26 (go1.27.1) | `FromDir`, `vcsGitRoot.isRoot`, the nested-git exemption — the actual mechanism, not a description of it |
| [go1.27.1 src/cmd/go/internal/load/pkg.go](https://go.googlesource.com/go/+/refs/tags/go1.27.1/src/cmd/go/internal/load/pkg.go) (read locally) | `setBuildInfo`, the three-`FromDir`-call comparison, `goModPath` | 2026-09-26 (go1.27.1) | Exact line numbers for every branch cited above; primary source for §1, §5 |
| [pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go) | `go help build` reference, `-buildvcs` flag doc | current, fetched live | The one-sentence documented invariant ("same repository") that the three-call mechanism implements |
| [golang/go#74763](https://github.com/golang/go/issues/74763) | Bug tracker issue: "multiple VCS detected"/`(devel)` regression | opened 2025-07-26, open, Backlog | The exact bug this dive targets; ground truth for shape (c) |
| [golang/go#58218](https://github.com/golang/go/issues/58218) | Bug tracker issue: cmd/go doesn't recognize `.git` worktree files | milestone Go1.27 | Confirms worktree support is new in the exact version this program measures against |
| [go.dev/doc/go1.25](https://go.dev/doc/go1.25) | Go 1.25 release notes | August 2025 | Confirms the regression is **not** release-noted anywhere — an agent reading only release notes would never learn of it |
| [go.dev/doc/go1.24](https://go.dev/doc/go1.24) | Go 1.24 release notes, go-command section | February 2025 | Primary source for tag-derived `Main.Version` and `+dirty`, cited by GO-REL-06 |
| [go.dev/doc/godebug](https://go.dev/doc/godebug) | GODEBUG history page | current, fetched live | `allowmultiplevcs` — its exact backport history (1.23.11/1.24.5/1.25rc2) and what it actually gates |
| [pkg.go.dev/runtime/debug#BuildInfo](https://pkg.go.dev/runtime/debug#BuildInfo) | `debug.BuildInfo`/`Module` API doc | current, fetched live | The shape `go version -m` serializes; confirms `Module.Version` and the `BuildSetting` key list this dive reads |
| [git-scm.com/book Git Tools - Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) | Pro Git book chapter | current, fetched live | The `160000` gitlink mode and the "submodule data lives in the superproject's `.git`" mechanic that underlies the `.git`-file-in-a-submodule shape |
| [go-release.md](../go-release.md) (this program) | Consolidated GO-REL ruleset, 2026-09-26 | this program | GO-REL-03/06/11's current text and the open question this dive answers (`## Open questions` › "release / reproducible-builds") |
| [go-release/reproducible-builds-and-stamping.md](reproducible-builds-and-stamping.md) (this program) | Wave-3 dive, candidate GO-REL-12 | this program | The prior "could not reproduce (no SVN)" note this dive corrects and narrows |
| [go-topic-map.md](../go-topic-map.md) (this program) | Wave-1 topic map, H6 multi-module-repo correction | this program | Corpus base rate for multi-module repos, used in Exemplar evidence |

Fixtures on disk: `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-release-vcs/` — `plain-clone/`, `worktree-main/` (+ `.agents/worktrees/feature/`), `submodule-source/` + `submodule-repo-root/`, `nested-repo-root/` (+ `vendor-src/`), `monorepo-root/` (+ `tools/mytool/`), and built artifacts under `out/`.
