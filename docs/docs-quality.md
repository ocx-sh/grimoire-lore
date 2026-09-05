# docs-quality

One rule, one index and seven depth files that turn documentation review into
counted limits and runnable scripts.

Eighteen non-negotiables block any docs edit. Each depth file adds more,
scoped to a page type, a generator, or a mechanism. Every row names a command
you can run, or says it is a reading heuristic and states what to look for.

```sh
grim add ghcr.io/ocx-sh/lore/docs-quality
```

Loads on `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/**`, `doc/**`,
`website/**`, `site/**`, and the config file for MkDocs Material, mdBook,
VitePress and Docusaurus. The index is always present. A depth file loads
only when the work calls for it.

## The fleet has no gate today

Twenty-three docs surfaces across the measured fleet hold 248 pages and about
92 prose rules between them. Two of those rules cite a runnable check. Zero
of the 248 pages declare a type. Zero of nine real docs sites log a
zero-result search, run analytics, or ship a feedback widget.

The prose that exists already reads generated. It measures 18.3 em dashes
and 5.8 semicolons per 1000 words across the same fleet. That rate does not
prove any one sentence was written by a model, so this set does not claim it
can detect one. It bans the marks anyway, as a house style choice, and checks
the ban with a script rather than a reader's ear.

## What is in it

Eighteen non-negotiables sit at the index. The seven depth files add 43 MUST
rows in total, split across:

- Page types and the `doc_type` and `doc_tier` declaration
- Plain English limits: sentence and paragraph length, punctuation, tells
- Tested and recorded examples, plus the interactive-element contract
- Navigation depth, page-length limits, and the zero-result search loop
- The observability signals a docs site usually has none of
- What a site owes an agent reader

Eight Python scripts back the checks above. Each is standard library only,
each carries a passing and a failing fixture, and each runs its own
`--self-test`.

## What it does not cover

- Page-level accessibility: alt text, contrast, keyboard order, table semantics
- A validated freshness interval, so no rule gates on a page's age
- Versioned docs, translations, print or offline output

No page in the calibration corpus declares a type yet, so every type-scoped
check stays inert until an adopter runs the retrofit.

## Siblings

`docs-plan` is the discovery skill. Run it first, so a tiered use-case list
and a typed page inventory exist before this rule's checks have anything real
to grade. `docs-instrument` is the gate skill. It retrofits the declaration,
wires every check above into CI, and picks a link checker and a
tested-example harness per generator.

Nothing here co-loads with `css-theming`. That set owns a docs site's own
stylesheet. This one stops at what reaches the page.
