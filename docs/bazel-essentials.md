# bazel-essentials

The Bazel set in one install: the `bazel-quality` rule, and the
`bazel-adopt` and `bazel-diagnose` skills.

```sh
grim add ghcr.io/ocx-sh/lore/bazel-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `bazel-quality` | rule | Nineteen non-negotiables and 328 rules across twelve depth files: Starlark and BUILD shape, Bzlmod and repository rules, hermeticity, caching and remote execution, testing, CI and target selection, architecture, flags and versions, and one file each for Rust, Python, TypeScript and C++ |
| `bazel-adopt` | skill | The go/no-go gate from measured signals, then the migration order: pins, lockfile, cache wiring, CI lanes, one branch per language |
| `bazel-diagnose` | skill | A build that is already wrong, routed by symptom to the command that settles it |

## Why one rule and two skills

`bazel-quality` is a merge gate. It loads on every BUILD, `.bzl`,
`MODULE.bazel` and rc edit and blocks on verifications. Adoption and
diagnosis differ in kind: one runs once per repository and leaves a plan,
the other runs when something is already wrong and leaves a fixed build.
Neither has a reason to load on every edit, so each is a skill, and the
rule's context budget stays free of a one-off procedure.

The two skills split because their evidence does not overlap. `bazel-adopt`
reads the repository, its build times and its coupling graph.
`bazel-diagnose` reads the profile, the execution log and the sandbox.

## The premise

The research behind this set ran its contested claims on real 8.7.0, 8.8.0
and 9.x binaries, and Bazel's documentation, the ruleset READMEs and the
release notes were each measured wrong at least once. The set therefore
trusts the binary's two help surfaces over any page, states which Bazel
version every claim was watched on, and says which way each check's silence
reads.

The bundle names its members without a tag. It says these three belong
together. Your `grimoire.lock` is what freezes them.
