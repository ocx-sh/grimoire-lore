---
name: nix-flake-release
description: Ordered runbook for cutting a release of a Nix flake, from the lock and version checks through the full gate with --all-systems and the CppNix, floor and Lix legs, the vX.Y.Z tag, proving the tag with nix run from a clean store, deprecating a renamed output behind a warning, and the nix-update contract for a package.nix with a fetcher src, plus the no-tag branch for a flake generated from a package index. Use when tagging or releasing a flake, bumping a flake project's version, checking that the version a flake builds equals its tag, renaming or removing a published package or output, writing a Nix release workflow, preparing or bumping a nixpkgs copy with nix-update, or landing a data update to a generated flake. Not for adding a flake to a repository, and not for diagnosing a failing evaluation or build.
license: Apache-2.0
metadata:
  summary: Gate-ordered release procedure for Nix flakes, built around the fact that a flake cannot see its own tag, with its commands watched red and green on CppNix 2.35.2, CppNix 2.31.5 and Lix 2.95.2
  keywords: nix,flake,flakes,nixpkgs,release,tag,version,semver,flake.lock,nix-run,nix-flake-check,all-systems,lix,cppnix,versionCheckHook,nix-update,fetchFromGitHub,deprecation,lib.warn,abort-on-warn,flake-compat,generated-flake,github-actions
---

# nix-flake-release

## A flake cannot see its own tag. Read this before step 1

Evaluated at a tag, `self` carries `rev`, `shortRev`, `narHash` and
`lastModified`, and no `ref` or `tag` attribute (measured on CppNix 2.35.2). So
nothing inside `flake.nix` can tell a release commit from any other commit.
The version a flake builds equals its tag only because the manifest says so,
and only a check run from outside the flake, at the tag, proves it.

A consumer who pins `github:OWNER/REPO/vX.Y.Z` records the resolved `rev` and
`narHash` in their own `flake.lock`. Moving the tag later changes no lock
already written, and it makes one reference name two different trees. Two
consequences bind everything below.

- **Every gate runs before `git push origin "$TAG"`.** A defect found before
  the push costs a commit. After it, it costs a version number.
- **A bad release is followed by a new version**, never by a moved or deleted
  tag.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) · [The runbook](#the-runbook) · [The D branch](#the-d-branch-a-generated-flake-cuts-no-tags) ·
[The MUST rows](#the-must-rows-this-procedure-enforces) · [What agents get wrong here](#what-agents-get-wrong-here)

## Scope

Identify the flake's shape first (NIX-CORE-05): A app or CLI, B library,
C module, D generated from an external index, E template.

| Shape | Steps | Differences |
|---|---|---|
| A (a CLI or app with `packages`) | 1 to 9 | the full procedure |
| B or C (library or module flake) | 1 to 7, skipping the `nix run` proofs | tagged like A (NIX-REL-07). Gate steps 6 and 7 are skipped when the flake exports no packages. It builds its `checks` instead |
| D (generated from an index) | [the D branch](#the-d-branch-a-generated-flake-cuts-no-tags) | no tags. The lock revision is the version |
| E (template) | 1 and 5 | format and the gate's step 4 on the template directory |

Measured 2026-09-27 on CppNix 2.35.2 with nixpkgs 26.11pre `8d5d2709`, floor
`nix_2_31` = 2.31.5, Lix 2.95.2, nixfmt 1.5.0, deadnix 1.3.2, flake-checker
0.2.15 and nix-update 1.16.0. Determinate Nix is untested: nixpkgs packages no
Determinate Nix, so no leg below can run it (re-check when nixpkgs adds one).
The rules cited by ID live in the `nix-quality` rule and its depth files
(`release.md` owns NIX-REL, `gates.md` owns NIX-GATE). Run every command from
the repository root.

## Pinned defaults

These encode an agreed decision, not a derived fact. Each is a default the
adopter may override once, for the whole repository. Marked **pinned** so a
later reader does not re-litigate them.

| Decision | Default (pinned) | Override looks like |
|---|---|---|
| FlakeHub (Q1) | None, as input or as publish target. No `flakehub.com/f/` input, no `flakehub-push`, no `flakehub-cache-action` (NIX-REL-06) | Publish **tagged releases only**, and never rolling releases once any tag at or above 0.2.0 exists |
| Public binary cache (Q2) | None, and no `nixConfig` in `flake.nix` (NIX-REL-15, NIX-SEC-01) | A cache whose `nix.conf` pair the README documents as an explicit opt-in |
| Release tags | The project's existing `vX.Y.Z` tags. No flake-only version or tag (NIX-REL-07) | Whatever scheme the project already tags with |
| Implementations (Q6) | CppNix gated at the version CI pins. Lix and the floor are advisory legs. Determinate untested, never deliberately broken | Only by making a leg blocking, never by dropping one |
| Consumer floor (Q8) | The oldest non-stub `nixVersions.nix_2_*` in the pinned nixpkgs, computed at each release (2026-09-27: `nix_2_31` = 2.31.5) | None. A remembered floor goes stale |
| Revision in the build | No git SHA in `version` or anywhere a package reads it (NIX-REL-03) | An env var or flag, accepting a new `drvPath` on every commit |
| nixpkgs (Q3) | `package.nix` stays by-name-ready in the repository. Submission waits for the first stable release (NIX-REL-14) | Step 8 applies to the copy from the day it exists |

## The runbook

Run the steps in order. Steps 1 to 6 exist to fail before anything is pushed.

### 1. Read the era and the shape

```sh
nix --version                                   # implementation and version (NIX-CORE-04)
jq -r '.nodes[.nodes.root.inputs.nixpkgs // "nixpkgs"] | .original.ref // .original.url // .original.rev, .original.type, .locked.type' flake.lock   # the branch the lock follows (a channel URL names it, a rev when there is no ref), the input type, what is really fetched. null three times: no nixpkgs node. Exit 5: the root nixpkgs follows another input, read that node
```

`nix (Lix, like Nix) 2.95.2` is Lix. `nix (Nix) 2.35.2` is CppNix. Choose the
branch of this procedure by shape (see Scope). A D flake leaves the runbook
here.

### 2. Settle the lock before the release commit

The lock is refreshed in its own reviewed commit that already passed the full
gate, never in the release commit (NIX-REL-08). The weekly lock PR is the
normal route (NIX-INP-11). If the lock needs a bump now, land it as its own PR
first and start this procedure again from step 1 on the merged result. Move
one entry with `nix flake update nixpkgs`, never with
`nix flake lock --update-input` (NIX-INP-07: Lix 2.95.2 rejects the flag).

| Check | Command | Pass | Rule |
|---|---|---|---|
| No untracked file the flake reads | `git ls-files --others --exclude-standard .` | empty output. Any path is the finding: `git add` it | NIX-FLK-16 |
| No local input in the committed lock | the jq program below the table | prints `[]`. Any key is the finding | NIX-INP-04 |
| No cross-tree relative input | `grep -rn -e 'path:\.\./' --include='*.nix' .` | empty output (exit 1). A hit is a candidate to read. A sub-flake's `path:../..` that stays inside the git tree passes (numtide/flake-utils `examples/`), and the parent form `path:..` never matches | NIX-INP-04 |
| No deprecated lock flag in scripts | `grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='CHANGELOG*' -e 'nix .*--update-[i]nput' -e 'nix .*--recreate-[l]ock-file' .` | empty output (exit 1). A line in a script or workflow that runs `nix` is the finding. A hit in code that forwards a user's flags (shell completions, an argument parser) is not | NIX-INP-07 |

```sh
# NIX-INP-04. Prints [] when the lock holds no absolute path: or git+file: input.
jq -c '[.nodes | to_entries[] | select((.value.original.type=="git" and ((.value.original.url//"") | startswith("file:"))) or (.value.original.type=="path" and ((.value.original.path//"") | startswith("/")))) | .key]' flake.lock
```

### 3. Sync the version to the manifest

The package reads `version` from the project's own manifest through a
source-tree path, `(lib.importTOML ./Cargo.toml).package.version`
(`.workspace.package.version` for a Cargo workspace,
`(lib.importTOML ./pyproject.toml).project.version` for Python). Never a
literal, never through `"${src}/…"`, and never with a suffix: no
`pre<date>_<rev>`, `+<rev>`, `-dirty` or `-unstable-…`, not even "only for
untagged builds" (NIX-REL-01, NIX-REL-02). A conditional suffix cannot be
written, because `self` has no tag to condition on.

Bump the manifest in the release commit, then check both sides:

```sh
VERSION=1.2.3 # rename: the version you are releasing, without a leading v
nix eval --raw .#packages.x86_64-linux.default.version | grep -x -F -e "$VERSION"
grep -m1 -E -e '^version[[:space:]]*=' Cargo.toml | grep -F -e "\"$VERSION\""
```

Both must exit 0. Exit 1 on the first is the finding: a literal `1.2.2` against
a manifest at `1.2.3` fails it, and so does `1.2.3pre20260927_d960db0`, because
`-x` needs the whole line (watched 2026-09-27). Substitute your manifest
(`pyproject.toml`) and your attribute when `default` is not the CLI. The first
`version =` line must sit under `[package]` or `[workspace.package]`; when the
root has neither, grep the member crate's `Cargo.toml`.

**Check (NIX-REL-03):** `grep -rn -e 'self[.]rev[^[:alpha:]]' -e 'self[.]rev$' -e 'self[.]dirtyRev' -e 'self[.]shortRev' -e 'self[.]dirtyShortRev' -e 'self[.]lastModified' -e 'self[.]revCount' --include='*.nix' .`
prints nothing (exit 1). A hit in an exported derivation rebuilds it on every
commit, README commits included. A hit in an app or banner is NIX-REL-04's.

### 4. Deprecate a renamed or removed output, never delete it

Compare the outputs the last release published with the ones this commit
publishes. Write the lists outside the checkout: a file inside it makes the
tree dirty.

```sh
PREV=v1.2.2 # rename: the last published tag
OUT=${TMPDIR:-/tmp}/outputs-check
mkdir -p "$OUT"
nix flake show --all-systems --json --no-write-lock-file "git+file://$PWD?ref=refs/tags/$PREV" 2>/dev/null |
  jq -r 'paths(type == "object" and has("type")) | join(".")' | sort >"$OUT/prev.txt"
nix flake show --all-systems --json --no-write-lock-file . 2>/dev/null |
  jq -r 'paths(type == "object" and has("type")) | join(".")' | sort >"$OUT/head.txt"
comm -23 "$OUT/prev.txt" "$OUT/head.txt"
```

Empty output passes. Each printed line (`packages.x86_64-linux.old-name`) is
an output that vanished. It is a finding unless `PREV` already carried it
behind a warning, in which case this release is the one that deletes it
(NIX-REL-10). Watched 2026-09-27: silent with a `lib.warn` shim, and three
lines, one per system, with the output deleted outright.

Pick the mechanism by what is being deprecated (NIX-REL-10):

| Deprecated thing | Mechanism | Warns on |
|---|---|---|
| A package that should warn on any reference | `lib.warn` around the new package | `nix flake show`, `nix build`, `nix flake check` |
| A package that should warn only when built | `lib.derivations.warnOnInstantiate` | build and check. Silent on `nix flake show` |
| A whole tree of outputs | map `lib.warn` over each attribute | as `lib.warn` |
| A legacy singular output (`defaultPackage`) | the `builtins.warn` shim (NIX-FLK-04) | as `lib.warn` |
| An option inside an exported module | `lib.mkRenamedOptionModule` or `mkRemovedOptionModule`, never `lib.warn` | module evaluation |

```nix
{
  packages = forAllSystems (
    pkgs:
    let
      mytool = pkgs.callPackage ./package.nix { };
    in
    {
      default = mytool;
      new-name = mytool;
      # Remove in the release after this one (NIX-REL-10).
      old-name = pkgs.lib.warn "packages.old-name is renamed to packages.new-name and is removed in the next release" mytool;
    }
  );
}
```

Never make warnings fatal on the whole flake: `--option abort-on-warn true` on
`nix flake check` or a whole-flake `nix build` turns every shim above into a
red gate (NIX-REL-11). Apply it to named current attributes, or to a
`packages.x86_64-linux` set that carries no shims:

```sh
nix eval --option abort-on-warn true --raw .#packages.x86_64-linux.new-name.drvPath # exit 0: a current attribute
nix eval --option abort-on-warn true --raw .#packages.x86_64-linux.old-name.drvPath # exit 1: proves the shim fires
```

Watched 2026-09-27 on a shimmed flake: `default` and `new-name` exit 0,
`old-name` exits 1 with `aborting to reveal stack trace of warning`, and
`nix flake check --no-build --option abort-on-warn true` exits 1. Do not verify
with `nix flake show`: it swallows the abort and exits 0.

**Check (NIX-REL-11):** `grep -rn -e 'abort-on-warn' .github/workflows`. Every
line printed must name a single attribute or a shim-free `packages.x86_64-linux`
set. A hit on a `flake check` line is the finding. Empty output passes. A
reading heuristic.

### 5. Run the gate at the exact commit, on every system and every leg

Run the `nix-quality` gate block in order, from a clean local checkout of the
commit you will tag, never by remote ref (NIX-GATE-09). `git status --porcelain`
must print nothing first. Steps 1 to 6 of the block must pass. Never make a
step pass by weakening it: no disabled lint, no dropped system, no
`doInstallCheck = false` (NIX-CORE-01). Three parts of the block carry the
release.

**`--all-systems` (NIX-GATE-09).** `nix flake check --all-systems --no-build`
evaluates every declared system, including the ones CI has no runner for. A red
result is triaged against the GATE-09 cause table before the systems list or
the flake is touched. Only one row there makes dropping a system the author's
fix: `Nixpkgs 26.11 has dropped support for x86_64-darwin` (NIX-FLK-09). A
red that is a nixpkgs bug, a platform-restricted dependency or a toolchain
limit is not fixed by deleting the system.

**Build every package the flake defines (NIX-GATE-10).** `nix flake check`
skips substitutable checks since Nix 2.32, and runs no binary.

```sh
# Exit 0 passes. Exit 123 means at least one package failed to build.
nix eval --json .#packages.x86_64-linux --apply builtins.attrNames |
  jq -r '.[]' | xargs -r -I{} nix build --no-link --print-build-logs '.#{}'
```

Watched 2026-09-27: exit 0 on the compliant flake, exit 123 with one planted
failing package. Each package's `versionCheckPhase` runs here (NIX-PKG-13). If
it fails with `unexpected argument '--version' found`, the CLI answers its
version elsewhere: set `versionCheckProgramArg` to the real entry point (ocx:
`"version"`) and never disable the check (NIX-PKG-19).

**The implementation legs (NIX-GATE-16).** The gate of record is CppNix at the
version CI installs through `install_url` (NIX-GATE-13). Compute the floor from
the pinned nixpkgs at every release, then run both advisory legs with
`--inputs-from .`, so `nixpkgs#` resolves to the locked nixpkgs and not to the
global registry:

```sh
# The floor is the first name printed (2026-09-27: nix_2_31). Substitute it for nix_2_31 on the next line.
nix eval --json --inputs-from . nixpkgs#nixVersions --apply 'v: builtins.filter (n: builtins.match "nix_2_[0-9]+" n != null && (builtins.tryEval (v.${n}.version or null)).success) (builtins.attrNames v)' | jq -r '.[0]'
nix shell --inputs-from . nixpkgs#nixVersions.nix_2_31 --command nix flake check --no-build
nix shell --inputs-from . nixpkgs#lix --command nix flake check --no-build
```

- When `flake.nix` declares `inputs.self.submodules` (or `lfs`), the Lix leg
  appends `--extra-experimental-features flake-self-attrs`. Without
  it, Lix 2.95.2 exits 1 with `experimental Lix feature 'flake-self-attrs' is
  disabled`. With it, the same flake passes (watched 2026-09-27).
- A flake that declares `inputs.self.lfs` marks the Lix leg expected-fail with
  a comment: Lix 2.95.2 has no `self.lfs`. It keeps the flag (NIX-INP-09).
- The legs are advisory, with one exception. A Lix red on a mixed `rec` and
  non-`rec` merge of one attribute path is a NIX-LANG-05 finding and blocks.
- A remembered floor fails loudly: `nixVersions.nix_2_30` throws
  `nix_2_30 has been removed. use nix_2_31.` on nixpkgs `8d5d2709`.

**Release greps.** Run these alongside the gate:

| Check | Command | Pass | Rule |
|---|---|---|---|
| No FlakeHub (pinned) | `grep -rn -e 'flakehub.com/f/' -e 'flakehub-push' -e 'flakehub-cache-action' --include='*.nix' --include='*.yml' --include='*.yaml' .` | empty output (exit 1). Any line is the finding | NIX-REL-06 |
| No accepted flake config | `grep -rn --exclude-dir=.git --exclude-dir=.claude -e 'accept-flake-[c]onfig' .` | empty output (exit 1). Any line is the finding | NIX-SEC-02 |
| No `nix-env` install line | `grep -n -e 'nix-env -i' -e 'nix-env --install' README.md` | empty output (exit 1). Any line is the finding. Exit 2 means no root `README.md`: name the file that carries the install section. Nested READMEs of vendored or example code are out of scope | NIX-REL-09 |
| `nix profile install` only as the Lix fallback comment | `grep -c -e '^ *nix profile install' README.md` | prints `0` with exit 1. A higher count (exit 0) means a README line Lix accepts and CppNix warns on | NIX-REL-09 |

Bracketed letters keep a workflow from matching its own grep line. Installed
copies of these rules and skills name every banned string, so the greps exclude
`.claude`: substitute your agent client's install directory.

### 6. Tag locally and prove the tag before pushing

```sh
TAG=v1.2.3 # rename. VERSION from step 3 is TAG without the v
git tag -a "$TAG" -m "$TAG"
git describe --tags --exact-match HEAD | grep -x -F -e "v$VERSION"
nix eval --raw .#packages.x86_64-linux.default.version | grep -x -F -e "$VERSION"
git diff --quiet "$TAG~1" "$TAG" -- flake.lock
nix run "git+file://$PWD?ref=refs/tags/$TAG" -- --version 2>/dev/null | grep -E -e "[[:space:]v]${VERSION//./[.]}\$" -e "^${VERSION//./[.]}\$"
```

| Line | Pass | Finding | Rule |
|---|---|---|---|
| `git describe` plus the `nix eval` | both exit 0 | exit 1 on the eval: the version at the tag is not the tag | NIX-REL-02 |
| `git diff --quiet` | exit 0 | exit 1: the tag commit modified `flake.lock`. Exit 128 means the tag has no parent commit | NIX-REL-08 |
| `nix run` of the local tag | the version printed, exit 0 | exit 1: the tag builds a different version, or `mainProgram` is wrong | NIX-REL-16 (local form), NIX-FLK-15 |

Pass the version entry point NIX-PKG-19 names: `-- --version` by default, and
`-- version` for a CLI such as ocx whose version is a subcommand. Watched
2026-09-27 on a planted flake tagged `v1.2.3`: the compliant tree printed
`reltool 1.2.3` and passed every line. A literal `version = "1.2.2"` printed
`reltool 1.2.2` and exited 1, and so did `reltool 1.2.3pre20260927_d960db0`,
`reltool 1.2.3-1ccb0bf` and `reltool 1.2.3+dirty`: the version must end the line,
alone or after a space or `v` (`grep -F -w` passed the last two). A CLI that
prints text after the version needs its own anchor. A tag commit that also
added `flake.lock` made `git diff` exit 1.

The local run proves that the tag commit builds and reports its version. It is
not NIX-REL-16's proof, which needs the pushed tag. Until the push, a failed
line is fixed in a new commit: delete the local tag with `git tag -d "$TAG"`
and start again from step 3.

### 7. Push, then prove the pushed tag from a clean store

```sh
OWNER=example REPO=mytool TAG=v1.2.3 VERSION=1.2.3 # rename all four
git push origin "$TAG"
set -o pipefail
nix flake metadata --no-write-lock-file --json "github:$OWNER/$REPO/$TAG" | jq -e --arg t "$TAG" '.original.ref == $t and (.locked.rev | length) == 40'
nix run --no-write-lock-file "github:$OWNER/$REPO/$TAG" -- --version 2>/dev/null | grep -E -e "[[:space:]v]${VERSION//./[.]}\$" -e "^${VERSION//./[.]}\$"
```

- The metadata line prints `true` and exits 0 when the tag resolves
  (NIX-REL-07). An unknown tag exits 4 with GitHub's `"status": "422"`
  (watched 2026-09-27 on `github:numtide/flake-utils/v1.0.0` and
  `/v99.99.99`).
- The `nix run` line passes with exit 0 (NIX-REL-16). It is the only check that
  proves together that the tag resolves, the package builds, `mainProgram` is
  right and the version equals the tag. Watched on a real pushed tag:
  `github:Mic92/nixpkgs-review/4.0.0` printed `nixpkgs-review 4.0.0`, exit 0,
  on CppNix 2.35.2. A `nix run` of a tag also exits 0 on CppNix 2.31.5 and
  Lix 2.95.2. A bare-semver tag drops the `v` from `TAG`, and `VERSION` equals
  it.
- Run it where the store has not built this commit: a fresh CI runner with no
  store cache restored. Never substitute a `path:` or local-clone run, and
  never announce the release before it passes.
- Then run each README install line verbatim against the tag (NIX-REL-09).

State the promise in the release notes in NIX-REL-12's terms: gated on CppNix
at the version CI pins (2.35.2 on 2026-09-27), minimum the computed floor
(`nixVersions.nix_2_31` = 2.31.5), Lix advisory, Determinate Nix untested, and
flakes experimental per RFC 136. Update both numbers from steps 1 and 5 at
each release. Never write "works with Nix".

### 8. A `package.nix` with a fetcher `src`: the nix-update contract

This step binds any `package.nix` whose `src` is a forge fetcher: the nixpkgs
copy of an A package (pinned: not yet submitted) and hand-written packages. An
in-repository flake that reads `src` from its own tree skips it.

Before the bump, the ref interpolates the version and the hash is literal SRI
text (NIX-REL-13, NIX-REL-17). `tag` and `rev` behave the same here, and
NIX-PKG-02 owns the choice between them.

```nix
{
  stdenvNoCC,
  fetchFromGitHub,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "mytool";
  version = "0.2.15";

  src = fetchFromGitHub {
    owner = "example";
    repo = "mytool";
    tag = "v${finalAttrs.version}";
    hash = "sha256-…"; # the current literal hash, never lib.fakeHash (NIX-REL-17)
  };
})
```

Run the bump, then the three checks. `nix-update` 1.16.0 was measured on the
`src` hash path with `--src-only`. Its dependency-hash path (`cargoHash`) is
read from its code, not run, so treat a rewritten `cargoHash` as unverified
and confirm it with NIX-PKG-04's `--rebuild` of the changed fetch.

```sh
VERSION=0.2.15 # rename
nix-update -F --version="$VERSION" --src-only default
grep -rn -e '^[^#]*lib\.fakeHash' -e '^[^#]*lib\.fakeSha256' -e '^[^#]*lib\.fakeSha512' --include='*.nix' .
nix eval --json .#packages.x86_64-linux.default --apply 'p: let s = p.src.rev or p.src.url; in assert builtins.replaceStrings [ p.version ] [ "" ] s != s; true'
grep -rn -E -e 'rev = "v?[0-9]+\.[0-9]' -e 'tag = "v?[0-9]+\.[0-9]' --include='*.nix' .
```

| Line | Pass | Finding | Rule |
|---|---|---|---|
| the fake-hash grep | empty output (exit 1). A commented-out line never matches | a line: `nix-update` never replaces the `lib.fakeHash` symbol, and still exits 0. Obtain the hash by hand (NIX-PKG-03) | NIX-REL-17 |
| the `nix eval` (authoritative) | prints `true`, exit 0: the fetched ref contains the version | `assertion … failed`, exit 1: the ref is a literal, so the new version builds the old release's bytes. `attribute 'url' missing` means `src` is no fetcher: the row does not apply | NIX-REL-13 |
| the ref pre-screen grep | empty output (exit 1) | a line needs reading. A literal pin of a *different* source (a flake-compat `default.nix`) is allowed, and the eval decides | NIX-REL-13 |

Watched 2026-09-27 on planted packages at version `0.2.15`: the interpolated
`tag` printed `true` and matched no grep. `tag = "v0.2.14"`, `rev = "v0.2.14"`
and a bare-semver `tag = "0.2.14"` each failed the assertion and hit the
pre-screen. The eval reads `src.rev` first: `fetchSubmodules = true` switches
`fetchFromGitHub` to its git backend, whose `src.url` carries no version.
`hash = lib.fakeHash` hit the fake-hash grep. The eval applies to a package
that follows a release tag: a 40-hex `rev` pin of an untagged commit also
fails it and is outside this check. Never accept "the hash changed as
well as `version`" as proof: with a literal ref, `nix-update` rewrites both,
the new hash belongs to the old release, and `nix build` still succeeds.

### 9. A release went out wrong

- **A bad build or a wrong version:** ship a new patch version and run this
  procedure from step 1. Never move, delete or re-push the published tag.
- **An output deleted without a warning:** restore it in the next patch
  release behind step 4's shim, and delete it one release later.

## The D branch: a generated flake cuts no tags

A flake generated from an external package index (ocx's generated flake is the
worked example) has no tags. Its lock revision is its version, and the merged
data-update PR is the release (NIX-REL-07). NIX-REL-16 does not bind it: it
has no `packages.default` and no tag to run. Its release-time proof is this
list, run on every update PR before merge.

1. **The gate block with no IFD exemption.** Step 4 of the block runs with
   `--option allow-import-from-derivation false` (NIX-GATE-08). The generated
   data directory sits in the formatter and linter exclude list (NIX-GATE-04).
2. **`nix flake check --all-systems --no-build`.** Systems without a runner,
   such as `aarch64-darwin`, are evaluated and not built, and the README says
   so.
3. **Smoke-build every package whose data changed (NIX-GEN-15).**
   `nix build --no-link -L .#checks.x86_64-linux.smoke` runs each changed
   binary, and `nix build .#actionlint-actionlint` builds each changed package
   (substitute each changed attribute). `--no-build` never realizes a
   fixed-output derivation, so a corrupted digest passes it and fails only
   here, with a 404. On a runner with a warm store, rebuild each changed layer
   fetch with `--rebuild` (NIX-PKG-04).
4. **Execute every README `nix run` example**, never only evaluate it. `nix run`
   is shown only on a single-binary package (NIX-GEN-13). ocx's measured
   example: `#legacyPackages.x86_64-linux.actionlint.actionlint."1.7.12"` with
   `-- -version` printed `1.7.12`. A package with several peer binaries is
   shown with `nix shell`, because it has no `mainProgram`, and `nix run` on
   it fails with `unable to execute '…/bin/kitware-cmake'`.
5. **Licenses without warnings (NIX-GEN-14).** Evaluate `meta.license` with
   `--option abort-on-warn true` over `.#packages.x86_64-linux` only, never over
   `legacyPackages`, whose deprecated versions warn by design (NIX-REL-11).
6. **Deterministic data (NIX-GEN-17).** `jq -S . data.json | cmp - data.json`
   exits 0.
7. **A reviewed PR, never a push (NIX-GEN-16).** The lock bump rides the same
   PR (NIX-INP-11). The check below prints each workflow that pushes, by
   `git push` or a push action, without opening a PR: a printed path is the
   finding, empty output the pass, whatever the exit code. A workflow that opens
   its PR with `gh pr create` is printed too, and is read by hand.

```sh
grep -rl -e 'git push' -e 'github-push-action' -e 'git-auto-commit-action' -e 'add-and-commit' .github/workflows | xargs -r grep -L -e 'create-pull-request' -e 'create-pr'
```

Deprecation in a D flake follows NIX-GEN-18: once the index populates a
status, a yanked version stays in `legacyPackages` and leaves `packages`, and a
deprecated one is wrapped in `lib.warn`. Until then, invent no signal.

## The MUST rows this procedure enforces

Merge-blocking rows, restated as findings so a review that runs this procedure
without the rule files loaded still reports them with the right ID. The
rationale and full verification live with the rule named by the ID.

| # | Finding | Rule |
|---|---|---|
| 1 | The gate block was not run on the tagged commit, or a step was weakened to pass (a disabled lint, a dropped system, `doInstallCheck = false`) | NIX-CORE-01 |
| 2 | An `--all-systems` red was answered by deleting a system without the cause-table triage | NIX-GATE-09 |
| 3 | A package the flake defines was not built before the tag | NIX-GATE-10 |
| 4 | `version` is a literal, or is read through `"${src}/…"` | NIX-REL-01 |
| 5 | The version built at the tag differs from the tag without its `v`, or carries a suffix | NIX-REL-02 |
| 6 | An A, B or C flake invents a flake-only tag scheme, or a D flake is tagged | NIX-REL-07 |
| 7 | `abort-on-warn` is applied to `nix flake check` or a whole-flake build | NIX-REL-11 |
| 8 | A fetcher `src` names a literal version-shaped `rev` or `tag` for the source `version` names | NIX-REL-13 |
| 9 | The pushed tag was never run with `nix run github:…/TAG`, or a local or `path:` run stood in for it | NIX-REL-16 |
| 10 | A `versionCheckPhase` failure was answered by disabling the check instead of naming the entry point | NIX-PKG-19 |
| 11 | The committed `flake.lock` holds an absolute `path:` or `git+file:` input, or a relative `path:` that leaves the flake's git tree | NIX-INP-04 |
| 12 | A release script uses `--update-input` or `--recreate-lock-file` | NIX-INP-07 |
| 13 | The flake takes a FlakeHub input or runs a FlakeHub publish step (pinned default) | NIX-REL-06 |
| 14 | `accept-flake-config` appears anywhere in the repository | NIX-SEC-02 |
| 15 | A D update merged without smoke-running every changed package | NIX-GEN-15 |
| 16 | A D README shows `nix run` on a package with several binaries | NIX-GEN-13 |

## What agents get wrong here

Ranked by how often it bites.

1. **Copies a suffixed version formula**, such as
   `+ "pre${date}_${rev}"`, or "adds the SHA for traceability". The version at
   the tag then differs from the tag. Step 3's `grep -x` catches it.
2. **Writes `version` as a literal** "to keep it simple". It drifts at the next
   manifest bump.
3. **Looks for the tag inside the flake** (`if self ? ref`). No such attribute
   exists, so the check is always false.
4. **Bumps the lock in the release commit**, so the tag points at a lock CI
   never gated.
5. **"Fixes" an `--all-systems` red by deleting systems**, or reads
   `path '/nix/store/…-source' is not valid` from a remote-ref run as a
   checker limit when the flake reads its own source store path at evaluation
   time (NIX-FLK-07).
6. **Hardcodes `nix_2_24` as the floor**, or runs the legs through the registry
   `nixpkgs`, which evaluates a nixpkgs the lock never pinned.
7. **Drops the Lix leg or the `self.submodules` declaration** when Lix says
   `flake-self-attrs is disabled`, instead of passing the feature flag.
8. **Disables `versionCheckPhase`** after `unexpected argument '--version'`,
   instead of passing the CLI's real entry point.
9. **Deletes a renamed output outright**, or wraps the shim in `lib.warn` and
   then adds `abort-on-warn` to `nix flake check` "to make deprecations
   visible", verifying with `nix flake show`, which exits 0.
10. **Proves the release with `nix run .` or a local clone**, which cannot show
    that the pushed tag resolves.
11. **Trusts the `git diff` after `nix-update`**: with a literal ref both lines
    change and the hash is the old release's. Or primes the hash with
    `lib.fakeHash` and expects `nix-update` to fill it in. It never does.
12. **Tags a generated flake**, or shows `nix run` on a multi-binary package in
    its README without executing it.
