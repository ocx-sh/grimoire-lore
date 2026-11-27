# ux-quality

Standards for writing and reviewing a rendered interface: the gate, twenty
merge-blocking non-negotiables, and eleven depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/ux-quality
```

Loads on `.astro`, `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.css` and
`.scss` files. The index is 158 lines and always present. A depth file is read
only when the work calls for it. The depth files and checks scripts ship in the
`ux-quality-reference` skill, which the rule requires and grim installs with it
(grim 0.16.0 or later).

## It starts from what generated interface code does by default

Every line names a mistake an agent makes without being asked. A `div` takes
clicks. A focus ring is removed and never replaced.

An empty state shows while the fetch is still running. A toast carries the only
copy of an error. A "WCAG compliant" sentence follows one green run.

The prevalence is not rare. The WebAIM Million 2026 report (updated
2026-03-30) found empty links on 46.3 percent of home pages, empty buttons on
30.6 percent and missing form labels on 51 percent. Agents learn from that
corpus.

## The gate runs a real browser against a built site

The gate has four steps, and a fifth that proves it can go red. The four are
static lint, a page-structure check, an axe-core run and a rendered matrix. The
axe-core run covers every route, scheme and open state. The matrix covers reflow,
zoom, forced colours, reduced motion and Tab walks. The gate runs against a
served production build in a real browser, never a dev server and never jsdom.

The rule is honest about what a green run means. It covers at most 21 of the
55 A and AA criteria, none completely. So the report must name each command,
its exit status, the tool versions and what no automated step decides.
"Accessible" and "WCAG compliant" are never written as a conclusion.

## What is in it

Twenty non-negotiables in the index, and 159 rows across the depth files. 101 of
those rows are MUST. The files cover native widgets and ARIA refusals, focus and
colour, and motion and announcements.

They also cover page structure and editor extension UI. The rest are async
states, forms, text, consequential actions and AI features. One more file says
what an agent may claim about accessibility, performance and users.

Every row carries an ID, a rationale, a runnable verification and a severity.
A verification that cannot be run says so and is marked unverified.

## Pinned decisions

Some rows encode an agreed default, not a derivable fact. They are marked
pinned or house policy so a later reader does not re-litigate them. Examples
are the 1000 ms show-delay for loading indicators, the T0 to T3 action tiers and
the `data-ai-disclosure` marker. Others are one `<main>` and one `<h1>` per page,
and the pinned axe-core and Playwright versions. Each is a default an adopter
overrides once, with the reason recorded.

## What it does not cover

Commerce flows and deceptive patterns, real assistive-technology runs, field
performance data, and matrix behaviour in WebKit and Firefox. It does not own
design tokens or the cascade (`css-theming`), Markdown pages (`docs-quality`),
a page's head tags and claims (`marketing-quality`), or `.ts` extension host
mechanics (`typescript-quality`).

## Siblings

`ux-cli` covers CLI help, errors and destructive commands. `ux-agent-interfaces`
covers JSON output, MCP servers and agent approvals. `ux-review` grades an
untouched page or a pull request. All three cite this rule's IDs and never
restate them. Bundled as `ux-essentials`.
