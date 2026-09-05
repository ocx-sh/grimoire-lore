# docs-instrument

A repository adopted `docs-quality`. Most of its rules carry a runnable
verification, and none of them runs yet. This skill turns that rule set into
a gate that actually fails, cheapest check first.

```sh
grim add ghcr.io/ocx-sh/lore/docs-instrument
```

Run it after `docs-plan`. It stops once every wired check passes its own
`--self-test` and has been seen red once on a planted violation. Every path a
rule or config names must also resolve on disk.

## The retrofit comes first

Eight other rule families read the `doc_type` and `doc_tier` declaration, and
none of their checks can classify a page until that declaration lands. On a
first run, expect every page to fail it. Seeding from the nav config or the
page heading measured 94.3 percent accurate over 122 pages, well ahead of a
path classifier at 68.1 percent.

Two traps destroy files on the way in. Writing the declaration as YAML front
matter renders as a fake heading on mdBook and enters the search index.
Placing the comment above existing front matter destroys that front matter
on every generator this program tested.

## Two severities, every check, every time

Every wired check runs twice: once over the changed files at error, once over
the whole tree at warning until the backfill lands. The median adopting page
already fails several prose rules, so a whole-tree error gate on day one
blocks every open pull request. A new lint earns its error severity only
after the ratchet baseline is recorded and driven down.

## What it stands up

- The declaration retrofit, and every script wired into the existing runner
- Markdownlint at tier 0, and Vale at tier 1 only where a rule does not need it
- Two link passes: the generator's own strict build, and a raw-markdown pass
  with a named source root
- A tested-example harness, using the language's own doctest runner first
- The reader signals the stack can actually carry, cheapest first, with the
  rest deferred and their precondition named

## What it does not cover

Deciding which pages to write or what the use-case tiers are, which is
`docs-plan`'s job. Rewriting prose while wiring a check: a retrofit changes
declarations and configs only, and a content fix belongs in its own change.

## Sibling

`docs-quality` names every script this skill wires by the same filename and
flag set. `docs-plan` supplies the typed inventory this skill's declaration
retrofit turns into checked comment lines.
