# nix-flake-release

An ordered runbook for cutting a release of a Nix flake, from reading the era
and shape through the lock, version and deprecation checks, the full gate at
the exact commit across every system and both the CppNix and Lix legs, the
local tag proof, the pushed-tag proof from a clean store, the nix-update
contract for a `package.nix` with a forge fetcher, and the no-tag branch for a
flake generated from a package index. It is a list of gates rather than a
list of steps, for one reason.

```sh
grim add ghcr.io/ocx-sh/lore/nix-flake-release
```

Run it when tagging or releasing a Nix flake, bumping a flake project's
version, checking that the version a flake builds equals its tag, renaming or
removing a published package or output, writing a Nix release workflow,
bumping a nixpkgs `package.nix` with `nix-update`, or landing a data update to
a flake generated from an external index.

## A flake cannot see its own tag

Evaluated at a tag, `self` carries `rev`, `shortRev`, `narHash` and
`lastModified`, and no `ref` or `tag` attribute. Nothing inside `flake.nix`
can tell a release commit from any other commit, so the version a flake
builds equals its tag only because the manifest says so, and only a check
run from outside the flake, at the tag, proves it. A consumer who pins
`github:OWNER/REPO/vX.Y.Z` records the resolved `rev` in their own lock.
Moving the tag later changes nothing already fetched and makes one reference
name two different trees. Every gate here runs before the tag is pushed, and
a bad release is followed by a new version, never a moved or deleted tag.

Two more consequences follow. The lock is refreshed in its own reviewed
commit that already passed the gate, never in the release commit, so a bump
needed now goes out first and the procedure restarts on the merged result.
And a renamed or removed package or output is deprecated behind a warning
one release before it is ever deleted outright, so a consumer's pin has a
release to catch the warning in.

## Proof over reading

Every claim the runbook makes about a release is checked on the built
artifact or the pushed tag, never on the config or a local run standing in
for either. `nix flake check` alone is not the gate: it skips substitutable
checks and builds no package, so the runbook builds every declared package
separately and reads `--all-systems` against a cause table before a red
result is ever answered by dropping a system. A local `nix run` proves the
tag commit builds. Only `nix run github:OWNER/REPO/TAG` against a fresh,
uncached store proves the pushed tag resolves, builds and reports its
version together, which is why the procedure keeps the two checks distinct
rather than treating the first as a stand-in for the second.

The same discipline covers `nix-update`: its `git diff` after a bump is not
trusted on its own. A fetcher `src` whose ref interpolates a literal
version-shaped string rebuilds the old release's bytes under the new
version number, and only an evaluation that the interpolated ref still
contains the version catches it.

## The shape decides how much of the runbook applies

An app or CLI flake runs all nine steps. A library or module flake runs
through step 7, skipping the `nix run` proofs and building its `checks`
instead. A flake generated from an external package index takes its own
seven-item branch: it cuts no tags, and its lock revision is its version. A
template flake runs only the format and gate checks. Two implementation legs
ride alongside the gate of record (CppNix, at the version CI installs): Lix
is advisory except for one finding that blocks outright, and Determinate Nix
stays untested because nixpkgs packages none yet.

## Pinned decisions

Seven decisions here encode an agreement rather than a derivation, and each
is a default an adopter overrides once for the repository: no FlakeHub input
or publish target, no public binary cache and no `nixConfig` in `flake.nix`,
the project's existing `vX.Y.Z` tags with no flake-only version scheme, no
git SHA anywhere `version` is read, a `package.nix` staying by-name-ready in
the repository until the project's first stable release, CppNix gated at
what CI pins with Lix and the floor advisory, and a consumer floor computed
fresh at every release from the pinned nixpkgs rather than remembered.

## What it does not cover

Adding a flake to a repository that has none is `nix-flake-adopt`'s
procedure, not this one. Triaging a failing evaluation, build or
`--all-systems` red once the cause is unclear is `nix-diagnose`'s job. This
runbook only tells a red apart from a pass and routes the one row where
dropping a system is the fix, never the rest of the cause table. Writing or reviewing the flake's structure,
inputs, packaging or module outputs stays with the `nix-quality` rule's
depth files, which this skill's sixteen restated findings point back to.
Exporting a NixOS or home-manager module has no release step of its own here
beyond the deprecation mechanism its options need.

## Siblings

The sixteen merge-blocking findings this runbook restates are drawn from
`nix-quality`'s release and gate depth files, so a review that runs this
procedure without the rule set loaded still reports them by rule ID. The
rule text and rationale stay there. `nix-flake-adopt` covers giving a
repository its first flake or modernizing one already carrying dated idioms.
`nix-diagnose` routes a failing evaluation or build once one is already red.
`nix-essentials` bundles all three skills with `nix-quality`.
