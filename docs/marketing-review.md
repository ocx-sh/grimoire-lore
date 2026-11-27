# marketing-review

On-demand review of marketing surfaces against the `marketing-quality` rule
set. It reports findings with rule IDs and a separate list of questions for
the owner.

```sh
grim add ghcr.io/ocx-sh/lore/marketing-review
```

Reach for it when you ask to review, check or audit a landing page, a home
page, a hero or a README pitch. Also use it for a tagline, product copy or a
claim such as fast, secure or free. It also fits a testimonial, or a pull
request that touches marketing copy.

## The rule loads on an edit, so a review needs a trigger

`marketing-quality` loads when an agent edits a copy surface. Grading a
surface nobody is editing, or a whole branch, needs a trigger someone can
name. This skill is that trigger.

## What it does

It picks the targets, loads the rules, and runs the positioning, claims, head
and voice checks in order. Then it works through a landing checklist and an
AI-marker pass. Before it reports, it tries to refute each finding.

A finding reads `path:line: RULE-ID [SEVERITY]: message`. A finding no script
produced is marked as a reading heuristic. The report has three parts:
findings, owner questions and checks that did not run. It never writes a
verdict such as "good copy" or "compliant".

## It reports and does not rewrite

The skill never fixes unless asked. It never changes a positioning sentence,
a category noun or a claim record. Those are the owner's.

## What it does not cover

Accessibility and interface review belong to `ux-review`. Documentation pages
belong to `docs-review`.

## Siblings

`marketing-quality-reference` supplies the rows and the checks and installs
with this skill. `positioning-brief` writes the record the review compares
against. Bundled as `product-essentials`.
