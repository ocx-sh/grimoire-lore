# positioning-brief

A procedure that writes the one positioning record of a product, as a single
machine-readable file, from the repository's own text. Every field the text
does not support is left for the owner.

```sh
grim add ghcr.io/ocx-sh/lore/positioning-brief
```

Reach for it when you ask for positioning, a value proposition, a tagline, a
one-liner or messaging. Also use it for a target audience, or a category or
competitor framing. The `marketing-quality` rule sends the agent here when it
finds no record before an edit to a README, a manifest description or a site
head.

## One file, and an empty field beats a plausible one

The record is `.agents/positioning.toml`, at most 80 lines. It holds the
audience and the non-target, the category and object nouns, and the one
product sentence. It also holds the alternatives a buyer uses today, the
forbidden noun variants, the do-not-say entries and the owner's review state.

The skill never invents an audience, a category noun, an alternative or a
differentiator. Each field holds a value copied from repository text with a
`path:line` source, or the literal `ASK-OWNER`. It writes `status =
"unreviewed"` and never moves `review_by`. Only the owner sets `reviewed`.

## The check

The procedure ends with `positioning_check.py` from the
`marketing-quality-reference` skill. Its `fields`, `sourced`, `audience` and
`alternatives` modes must exit 0. The `sentence` mode exits 0 once the
sentence, the category and the object are all filled. The report lists every
`ASK-OWNER` field as a question.

## What it does not cover

It does not write page copy from an existing record. The `marketing-quality`
rule governs that. It does not sequence a launch, which is `launch-plan`. It
never writes the GitHub About field, because that write publishes at once.
It proposes the text in its report.

## Siblings

The schema and the MKT-POS rows live in `marketing-quality-reference`, which
installs with this skill. `marketing-review` grades a surface against the
record. Bundled as `product-essentials`.
