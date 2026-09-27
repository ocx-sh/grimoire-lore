# nix-flake-adopt

A step-ordered procedure for giving a repository its first `flake.nix` and
`package.nix`, or for migrating an existing flake off its legacy forms, with
the exact template for each package shape and the command that proves each
step actually did what it claims.

```sh
grim add ghcr.io/ocx-sh/lore/nix-flake-adopt
```

Reach for it when a repository gets its first `flake.nix` or `package.nix`,
when wiring Nix CI or a README install section, or when migrating a flake off
`flake-utils`, per-system `import nixpkgs`, `pkgs.system`, `rec` derivations,
file-scope `with pkgs`, `nixfmt-rfc-style`, singular outputs or
`x86_64-darwin`.

## Two facts decide the order

An untracked file does not exist to Nix: a flake inside a git repository
evaluates only tracked paths, so an un-`git add`ed `package.nix` fails with an
error that never names the real cause. And a green `nix flake check
--no-build` proves the output schema and nothing else, it builds nothing and
runs no binary, so the ten-step procedure interleaves the check with the
commands that actually build, run and gate the tree rather than trusting the
schema check alone. Step 2 also decides when to stop: a library-, module-,
generated- or template-only flake routes to a different rule or depth file
instead of running the rest of the procedure.

## What is distinctive

Three package templates (a Rust CLI, a Rust workspace with git-submodule path
dependencies, and a Python library) are each copied whole and built against a
toy fixture, not paraphrased, down to which argument name survives
`deadnix --fail --no-lambda-pattern-names` on an unused overlay parameter. The
CI workflow this procedure writes was run line for line under
`bash --noprofile --norc -eo pipefail`, the shell GitHub Actions actually
uses, which is why its trust-boundary step avoids a bare `! grep` (an `-e`
shell never fails on it) and its secret patterns are bracketed so the grep
does not flag its own workflow file. A devShell proof always adds `-i`, since
a bare `nix develop` lets a host binary on `PATH` stand in for a tool the
shell never actually provides.

## What is measured, not asserted

Every command was run against CppNix 2.35.2, nixpkgs 26.11pre, Lix 2.95.2 and
the computed consumer floor (CppNix 2.31.5) on 2026-09-27, on toy fixtures
built for the occasion rather than the fleet's own code, which carries no Nix
of its own. The procedure restates 21 merge-blocking findings by rule ID at
its end, each watched red on a planted defect before being written down: an
`x86_64-darwin` system entry failing nixpkgs 26.11's `--all-systems` check, an
untracked `package.nix` failing evaluation, a CLI printing the wrong version
string failing its install check, and a missing `inputs.self.submodules`
failing the build on a git-submodule path dependency. A twelve-item list ranks
the mistakes an agent makes most often against this procedure, from pasting
`flake-utils` boilerplate that still carries `x86_64-darwin` to trusting a
`flake check` that passed only because a hash was still `lib.fakeHash`.

## Pinned decisions

`nixos-unstable` on three systems (`x86_64-linux`, `aarch64-linux`,
`aarch64-darwin`), `nixpkgs` plus `flake-compat` as the only inputs,
`nixfmt-tree` as the required formatter, and nixpkgs `rustPlatform` rather
than crane or rust-overlay for a Rust build. No FlakeHub input or publish
target, no binary cache and no `nixConfig`, and a `package.nix` written
by-name-ready but not submitted upstream yet. CppNix is the gated
implementation. Lix and the computed consumer floor run as advisory legs, and
Determinate Nix is left untested rather than deliberately broken. Each row is
a default an adopter overrides once, in their own repository.

## What it does not cover

A library-, module-, generated- or template-only flake stops at step 2 and
routes elsewhere: `nix-quality`'s depth files for library and module shapes,
and a separate generated-flakes artifact for a flake built from an external
package index. Cutting a release, a version bump policy, the check matrix
before a tag, or publishing to FlakeHub or a binary cache belongs to
`nix-flake-release`. Triaging an evaluation or build failure that is not part
of first adoption, infinite recursion, a hash mismatch already narrowed down,
or an IFD or `follows` diamond, belongs to `nix-diagnose`. Both are read for
their own procedures rather than restated here.

## Siblings

The 21 merge-blocking rows this procedure enforces are restated as findings
with their rule IDs, a hedge against the `nix-quality` rule set not being
loaded, where the rule text and full verification live. `nix-flake-release`
is the release-engineering half of the same lifecycle, and `nix-diagnose` is
the failure-triage half. Bundled as `nix-essentials`.
