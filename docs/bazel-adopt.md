# bazel-adopt

A decision-and-migration skill, not a build skill. It answers whether a
repository should move to Bazel from measured signals, and on a go it writes
the migration plan: the order, the pins, the lock mechanism per language and
the first CI lane.

```sh
grim add ghcr.io/ocx-sh/lore/bazel-adopt
```

Run it before the first `MODULE.bazel` exists. It stops when a written
adoption decision names every measured signal, and, on a go, when a plan
file in the repository names the order, the pins, the lock mechanism per
language and the first lane.

## Signals, never a threshold

No primary source publishes a target count or a build time above which Bazel
pays for itself; the numbers quoted in blog posts are one company's context
paraphrased. The go/no-go gate therefore collects the signals a repository
can measure about itself — whole-build wall-clock, the coupling query, the
generator's maturity for each language, who will own the build — and hands
a mixed result to the owner instead of inventing a tie-breaker.

## The order is the point

Most migrations fail on sequencing, not on Starlark. The procedure fixes the
order: pin `.bazelversion` and decide 8.x versus 9.x first, because four
behaviours flip at 9.0.0; commit the lockfile and run at
`--lockfile_mode=error` from the first day; wire the disk cache, then a
read-only remote cache, then writes behind a credential helper that no
tracked rc file names, and remote execution last if at all; make whole-repo
`bazel test //...` the pipeline before any target-selection tool.

## One branch per language

| Branch | What it settles |
|---|---|
| Rust | `rules_rust` 0.74.0, the explicit toolchain pin, `crate_universe` with a named lockfile and the repin command that survives Bazel 9, `build.rs` porting, prost |
| Python | `rules_python` 2.3.3, the interpreter pin bound to every `pip.parse`, the pytest entrypoint trap, the requirements lock |
| TypeScript | `rules_js` 3.4.1 and `rules_ts` 3.10.1, pnpm as the lockfile of record and the cost of converting to it, `ts_project` transpiler choice |
| C++ | `rules_cc` 0.2.22, the toolchain choice, `layering_check` confirmed on the compile command — with no fleet example behind it, and it says so |

## What it does not cover

Diagnosing a build that is already on Bazel — that is `bazel-diagnose`. The
standards themselves — those are the `bazel-quality` rules, which this skill
cites by ID and assumes installed.

## Sibling

`bazel-quality` is the rule set this feeds; its first nineteen
non-negotiables are the ones a migration violates first. Run
`bazel-diagnose` when the migrated build misbehaves.
