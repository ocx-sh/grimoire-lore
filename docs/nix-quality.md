# nix-quality

Standards for writing and reviewing Nix: the gate, fifteen merge-blocking
non-negotiables, and nine depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/nix-quality
```

Loads on `**/*.nix`, `**/flake.lock` and `**/statix.toml`. The index is 198
lines and always present. A depth file is read only when the work calls for
it.

## It starts by naming the flake before judging it

A rule set that reads every flake the same way fails half of them. A library
that takes no nixpkgs input needs the opposite advice from an app that pins
one, a generated flake never builds every package the way an app must, and a
module export needs a check `nix flake check` never runs. So before any rule
applies, the index has you name the flake's shape from its outputs (app,
library, module, generated, template) and read the era: `nix --version` and
the locked nixpkgs node of `flake.lock`. Both gate the rows that follow.
nixpkgs 26.11 throws on any evaluated `x86_64-darwin` attribute, and Lix
2.95.2 accepts overlays and a string `formatter` that CppNix rejects, so the
same repository can read compliant on one implementation and broken on the
other.

## What agents get wrong by default, measured

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre, Lix 2.95.2 and CppNix
2.31.5, over a 38-repository upstream exemplar corpus plus 8 held-out flakes
(the fleet itself carries no Nix). Checks invert both ways more than most
languages': `nix flake check` prints `all checks passed!` without building a
package, `git ls-files` exits 0 whether or not it lists a file, deadnix
without `--fail` exits 0 on findings, and a plain `nix build` after a fetcher
edit reuses the stale source rather than re-verifying the hash. Each of those
reads as a pass to a model that judges by exit code alone. Reading a file
through the flake's own store path (`"${src}/Cargo.lock"`) instead of
`./Cargo.lock` fails only on a cold store, so it survives on a warm laptop and
breaks on the first clean checkout. The corpus also carries a generated-flake
category (rust-overlay, fenix, nix-index-database and similar) whose
data files are hand-edited by agents unaware a CI updater will revert the
change on its next run.

## What is in it

The index carries the gate, fifteen non-negotiables, and six cross-cutting
rules it owns outright. 142 rules in total, 88 of them merge-blocking, spread
over nine depth files: flake structure and outputs, inputs and the lock,
packaging and derivations, generated flakes, the gate itself, release and
versioning, the language, security, and modules.

Every rule carries an ID, a rationale, a runnable verification and a
severity, and states which way empty output reads. NIX-CORE-02 requires each
verification to have been watched go red on a planted violation and green on
its compliant twin before it enters the set, so a check that cannot fail
(deadnix without `--fail`, flake-checker without `--fail-mode`) is never
mistaken for one that gates.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact, and they
are marked pinned so a later reader does not re-litigate them. No FlakeHub,
as input or as publish target. No public binary cache and no `nixConfig`, so
every CI build really compiles. CppNix is the gate of record. Lix and the
computed floor (`nix_2_31`, today 2.31.5) are advisory legs, and Determinate
Nix is untested and never deliberately broken. A `package.nix` is by-name
ready from the start and moves to nixpkgs after the CLI's first stable
release. A generated flake lives in its own repository, updated by CI from
the index through the index's own client, and keeps every digest until its
data file passes 20 MB.

Each is a default an adopter overrides once, in the flake or the copied CI,
never per package and never per call site. Overriding one is a decision,
recorded with its reason. Ignoring one is a violation.

## What it does not cover

No restatement of the Nix language manual or the nixpkgs manual, which are
already in the model. It names traps, not maps: the shape of a particular
flake is discoverable by reading it, and once a rule's depth file is read,
that file does not point at another.

It also does not cover `.envrc`, workflow files, `treefmt.toml` or README
install blocks, none of which the glob reaches. The routing table inside the
index sends those to the depth files by task instead, so a non-`.nix` edit
still pays for the gate rules that govern it.

## Siblings

`rust-cargo`, `python-packaging` and `go-modules` own the manifest a
`package.nix` reads its version from and the lockfile it vendors. This set
owns only how Nix reads them.

`bazel-quality` covers Bazel builds that take tools from nixpkgs through
`rules_nixpkgs`. It has no Nix glob of its own.

`docs-quality` covers README and CHANGELOG prose around a flake's install
block. The commands inside that block are this set's.

`nix-flake-adopt`, `nix-flake-release` and `nix-diagnose` are procedures that
cite this set's rule IDs by number and never restate them. Bundled together
as `nix-essentials`.
