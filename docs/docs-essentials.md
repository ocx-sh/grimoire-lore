# docs-essentials

The documentation design set in one install: the `docs-quality` rule, and the
`docs-plan` and `docs-instrument` skills.

```sh
grim add ghcr.io/ocx-sh/lore/docs-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `docs-quality` | rule | Eighteen non-negotiables and 43 MUST rows across seven depth files: page types and the declaration, plain English limits, tested examples, navigation and search, observability, and what a site owes an agent reader |
| `docs-plan` | skill | Discovery: a tiered task list from real evidence, a typed page inventory, a coverage map, a delete list, an IA plan |
| `docs-instrument` | skill | The gate: retrofits the declaration, wires the checks into CI, and picks a link checker and example harness per generator |

## Why one rule and two skills

`docs-quality` is a merge gate. It loads on every docs edit and blocks on
counted limits. Discovery and instrumentation differ in kind. Each runs once,
produces a durable artifact or a wired gate, and has no reason to load on
every edit after that. Splitting them into skills keeps the rule's own
context budget small, and keeps a one-off procedure from re-running on every
file it touches.

The two skills split further because their evidence sources do not overlap.
`docs-plan` reads the repository, its issues and its logs. `docs-instrument`
reads the docs-quality rule set and the repository's own CI runner. Neither
step benefits from the other's context loaded at the same time.

## The premise

Across the measured fleet, 248 pages carry about 92 prose rules and two
runnable checks between them. Zero of those pages declare a type. Zero of
nine real docs sites log a zero-result search or run analytics.

This set closes that gap with scripts, not a style guide. `docs-plan`
decides what to build, `docs-instrument` makes it checkable, and
`docs-quality` holds the line once both have run.

The bundle names its members without a tag. It says these three belong
together. Your `grimoire.lock` is what freezes them.
