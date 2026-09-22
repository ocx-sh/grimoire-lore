# docs-review

The explicit trigger for the `docs-quality` gate. The rule loads when an agent
edits a page. This skill grades pages on demand: a named file, a directory, or
every docs page a branch changed.

```sh
grim add ghcr.io/ocx-sh/lore/docs-review
```

## Any directory, any format

Targets are whatever you name, wherever they live. Markdown and MDX get the
whole scripted gate. reStructuredText, MyST and AsciiDoc get the declaration
check on the source. The prose and page-type checks run on a `pandoc` copy
when one is available. Findings from a copy are mapped back to source lines.
Without a converter, those rows are read by hand and marked unverified.

## What it does not cover

Fixing what it finds, unless asked. Deciding which pages should exist, which
is `docs-plan`. Wiring the checks into CI, which is `docs-instrument`.

## Sibling

Needs the `docs-quality` rule installed, because the checks it runs ship in
that rule's `checks/` directory. The `docs-essentials` bundle installs both.
