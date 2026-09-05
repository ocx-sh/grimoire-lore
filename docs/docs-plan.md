# docs-plan

A discovery skill, not a writing skill. It turns a project's own evidence
into one durable artifact, holding:

- A ranked, tiered task list, one user need per task
- A typed inventory of every existing page
- A coverage map and a delete list
- An information architecture plan

```sh
grim add ghcr.io/ocx-sh/lore/docs-plan
```

Run it before writing or restructuring documentation. It stops once every
entry point maps to a task or a named out-of-scope line. Every task must then
carry a need and a tier, every page a `doc_type`, and the delete list only
pages two signals agree on.

## Evidence, never invention

Every claim in the artifact traces to the repository, its issue tracker, or a
run the skill actually performed. A candidate task never comes from an
existing page title, because that just rediscovers a page that already
exists. A user need is rejected if it names a page, a command, or a flag
instead of a task.

The most common failure this guards against is a fabricated number: "73% of
users need X" with no survey behind it. A friction log has to be run for
real, as a named persona, with verbatim output pasted in. Narrating what a
user would probably feel is not a substitute.

## What it produces

Thirteen steps, in order:

- The product shape, then a candidate longlist from real sources
- A shortlist, and a friction log per shortlisted task
- One ranking signal, and a user need per task
- A typed page inventory and a coverage table
- A tier per task, a delete list, and an IA plan
- Seeded `doc_type` and `doc_tier` lines, then the artifact file itself

Type comes from nine values. Tier comes from three: `first-steps`,
`everyday`, `integration`. Nav position never decides a tier, and
first-steps membership comes from dependency order, not from how painful a
task feels.

## What it does not cover

Writing page prose, which is `docs-quality`'s job. Wiring the checks that
grade that prose, which is `docs-instrument`'s job. Deleting a page: the
delete list is a proposal, and applying it needs a maintainer's word.

## Sibling

`docs-quality` is the rule this feeds. Its nine-value `doc_type` enum, its
three-value `doc_tier` model, and its declaration comment are the same
contract this skill seeds. Run `docs-instrument` next, so the inventory this
skill builds has a gate behind it.
