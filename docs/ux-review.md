# ux-review

On-demand UX and accessibility review of a page, a built route, an app view, an
editor webview, a CLI or a whole branch. It grades the target against the
`ux-quality`, `ux-cli` and `ux-agent-interfaces` rule sets.

```sh
grim add ghcr.io/ocx-sh/lore/ux-review
```

Reach for it when you ask to review, audit or test accessibility. That includes
keyboard and screen-reader behaviour, contrast, focus, zoom and reflow, loading
and error states, or a CLI's help and first run. Also use it when you ask
whether a page or a change is accessible.

## The rule loads on an edit, so a review needs a trigger

`ux-quality` loads when an agent edits markup or a stylesheet. Grading a page
nobody is touching needs a trigger someone can name. This skill is that trigger.

It runs the static scans and the rendered checks against a served production
build. It runs the CLI matrix when the target is a CLI. Then it reads the code.

## It reports, and it never writes a verdict

Every finding carries a file and line, a verbatim quote and a one-line fix. It
also carries a WCAG 2.2 criterion from the 86 on the whitelist, and an evidence
class. Before it
reports, the skill tries to refute each finding. A hedged or untestable item
goes to a separate Needs human review list with eight labelled fields, so a
person can run it.

It never writes "accessible", "compliant" or "passes accessibility". It writes
what ran, on what, with which result and what was not covered. The report ends
with the criteria no run decided: an axe-core run covers at most 21 of the 55 A
and AA criteria.

## What it owns

Six rows, UX-VERIFY-18 to 23. They say when a screen-reader pass is required
and which criteria no axe rule covers. They also fix the evidence classes, the
finding shape, the Needs human review split and the gate-facts block that ends
every report. Every other rule it grades belongs to the rule sets it cites.

## What it does not cover

It does not fix findings unless asked. It does not review marketing copy or
claims, which is `marketing-review`, and it does not review Markdown
documentation, which is `docs-review`.

## Siblings

`ux-quality-reference` and `ux-cli` install with it. `ux-agent-interfaces`
owns the JSON output and MCP rows. Bundled as `ux-essentials`.
