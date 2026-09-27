# nix-essentials

The OCX Nix set in one install: one rule for every Nix file you touch, and
three skills for the procedures you run occasionally.

```sh
grim add ghcr.io/ocx-sh/lore/nix-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `nix-quality` | rule | 15 non-negotiables and 83 MUST rows across nine depth files: flake outputs and systems, inputs and the lock, packaging, flakes generated from an external index, the formatter/lint/CI gates, release and consumer install UX, the language's traps, trust boundaries, and exported modules. Installed on `**/*.nix`, `**/flake.lock` and `**/statix.toml` |
| `nix-flake-adopt` | skill | A ten-step procedure to add a flake to a repository or modernize one, with a Rust-CLI, Rust-workspace-with-submodules and Python-library template |
| `nix-flake-release` | skill | A nine-step gate-ordered runbook to tag and prove a release, plus a no-tag branch for a flake generated from a package index, built around the fact that a flake cannot see its own tag |
| `nix-diagnose` | skill | Error-keyed diagnosis, routing a verbatim evaluation, check or build failure through a 46-row catalog across five categories to its cause and the rule that fixes it |

## The premise

Nix's default toolchain does not gate what it looks like it gates. `nix flake
check --no-build` proves the output schema and builds nothing. A warm store
lets an IFD flake pass the same command that fails cold. `deadnix` without
`--fail` exits 0 on findings it printed, and `flake-checker` without
`--fail-mode` does the same. Several checks invert outright: `nix eval` of an
attribute set collapses to its `outPath` string with exit 0, a wrong module
root prints `0 issues.`, and a bad lock entry can exit non-zero for reasons
that have nothing to do with the lock. On CppNix, Lix accepts overlays and a
string `formatter` that CppNix rejects, so a green run on one implementation
is not evidence for the other. This set was measured 2026-09-27 against a
38-repository upstream exemplar corpus plus 8 held-out flakes, on CppNix
2.35.2, nixpkgs 26.11pre, Lix 2.95.2 and the computed consumer floor CppNix
2.31.5.

## Why one rule and not several

Every file `nix-quality` governs (`flake.nix`, every `package.nix`, every
module, every depth file's subject) shares the same three globs. A Go
repository splits its rule because `.go` and `go.mod` are edited at different
moments and need different depth loaded. Nix does not split that way because
a flake's outputs, its inputs, its packaging and its gate all live in `.nix`
files an agent can touch in the same edit, and `flake.lock` and
`statix.toml` are the only non-`.nix` files the toolchain itself reads. One
rule, one glob family, nine depth files reached through an index's routing
table (`nix-quality.md`) rather than through separate frontmatter.

## Why three skills

`nix-flake-adopt`, `nix-flake-release` and `nix-diagnose` are three
procedures because they run at three different triggers, none of them "every
edit": once when a flake is born or modernized, once per release, once per
failing evaluation or build. Loading any of them on a routine `.nix` edit
would be dead context weight, so they carry no rules of their own. Each
restates the merge-blocking rows it enforces as findings with the `nix-quality`
rule IDs, so a review run without the rule loaded still reports them
correctly, and each says explicitly that the rule text and its verification
are settled in `nix-quality`, never in the skill.

## Pinned decisions

- No FlakeHub, as input or as publish target.
- No public binary cache and no `nixConfig`, so every CI build really compiles.
- Every `package.nix` is by-name-ready now and goes to nixpkgs after the CLI's
  first stable release.
- A generated flake lives in its own repository, updated by CI from the
  index through the index's own client, and keeps every digest until its
  data file passes 20 MB.
- CppNix is the gate of record. Lix and the computed floor are advisory legs.
  Determinate Nix is untested and never deliberately broken.
- The project exports no modules. The module rows ship for adopters who do.
- The consumer floor is the computed oldest supported `nixVersions.nix_2_*`,
  never a hardcoded version.

Each is a default an adopter overrides once, in the flake or the copied CI,
never per package and never per call site.

## What is not in it

Bazel: a repository that takes Nix-built tools into Bazel through
`rules_nixpkgs` gets that from `bazel-quality`, which has no Nix glob of its
own. README and CHANGELOG prose around the install block belongs to
`docs-quality`. This set only fixes the commands in that block. The manifest
a `package.nix` reads its version from stays with `rust-cargo`,
`python-packaging` and `go-modules`. This set owns only how Nix reads it.

The bundle names its members without a tag. It says these four belong
together. Your `grimoire.lock` is what freezes them.

## Siblings

- **`bazel-quality`**: Bazel builds that take tools from nixpkgs through
  `rules_nixpkgs`. It has no Nix glob of its own.
- **`docs-quality`**: README and CHANGELOG prose around the install block.
- **`rust-cargo`, `python-packaging`, `go-modules`**: the manifest and
  lockfile beside the flake. `nix-quality` owns only how Nix reads them.
