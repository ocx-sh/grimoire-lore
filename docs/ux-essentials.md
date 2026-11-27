# ux-essentials

The interface quality set in one install: the `ux-quality` rule for pages, apps
and editor webviews, and the `ux-cli`, `ux-agent-interfaces` and `ux-review`
skills.

```sh
grim add ghcr.io/ocx-sh/lore/ux-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `ux-quality` | rule | A gate and 20 non-negotiables across eleven depth files: native widgets and ARIA, focus and colour, motion and announcements, page structure, editor extension UI, async states, forms, text, consequential actions, AI features, and what an agent may claim about accessibility, performance and users. Loads on markup and stylesheet extensions |
| `ux-cli` | skill | What a command-line tool prints and does above the language CLI contracts: help, version, typo suggestions, first run, colour and animation, error shape and destructive commands. A matrix script runs the binary |
| `ux-agent-interfaces` | skill | Interfaces whose caller is a program or an agent: JSON output and its envelope, MCP server tools, and approval of agent tool calls by consequence tier. Two scripts check a JSON mode and a saved MCP tool list |
| `ux-review` | skill | The explicit trigger: grades a page, a built route, a CLI or a branch by hand, tags each finding with an evidence class and lists what no tool decides |

`ux-quality-reference` is not a member. It carries the depth files and checks
scripts, and the rule and the skills require it, so grim installs it with them.

## Why one rule and three skills

`ux-quality` loads when an agent edits markup or a stylesheet. That is the
shape of a rule. No file glob reaches a command-line tool's source or an MCP
server's, so `ux-cli` and `ux-agent-interfaces` are skills that load on the
task. A rule that globbed every source file to catch them would load on every
edit.

`ux-review` exists because a rule only loads on an edit. Grading a page nobody
is touching, or a whole branch, needs a trigger someone can name.

The skills carry no rules of their own. They cite the `ux-quality` row IDs, such
as the action tiers and the shared error-wording rows, and never restate them.

## Why two bundles and no umbrella

This bundle is separate from `product-essentials`. A repository with an
interface and no public pitch needs this one only. A repository with both adds
both. Nested bundles are invalid, and a single union bundle would be a second
name for two sets.

## The premise

An agent writes interface code from a corpus where the defaults are broken. The
WebAIM Million 2026 report (updated 2026-03-30) found empty links on 46.3
percent of home pages, empty buttons on 30.6 percent and missing form labels on
51 percent.

A green automated run does not close that gap. An axe-core run covers at most
21 of the 55 A and AA criteria, none completely. So the set makes an agent
report what ran and what no tool decides. It never lets an agent write
"accessible" or "WCAG compliant" as a conclusion.

## What is not in it

Design tokens, the cascade and forced-colours mechanics belong to
`css-theming`. Markdown documentation belongs to `docs-quality`. Completion
registration per shell belongs to `shell-integration`. Commerce flows, real
assistive-technology runs and field performance data were not studied.

The bundle names its members without a tag. It says these four belong together.
Your `grimoire.lock` is what freezes them.

## Siblings

- **`product-essentials`**: the marketing rule and the channel skills for a
  repository with a public pitch.
- **`css-theming`**: co-loads on the same globs and owns the cascade that
  delivers a focus ring or a contrast pair. This set owns the outcome.
- **`docs-quality`**: owns Markdown content. The rendered page's accessibility
  is this set's.
