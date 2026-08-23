# python-quality

Standards for writing and reviewing Python: the gate, the non-negotiables,
the pinned exit-code contract, and twelve depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/python-quality
```

Loads on `**/*.py`. The index is 125 lines and always present; the depth is
read only when the work calls for it.

## Written against four shapes, not one

Most Python guidance assumes a single kind of codebase. This set was
derived by measuring four that share almost nothing:

| Shape | What makes it different |
|---|---|
| A subprocess-driven pytest acceptance harness (~130k LOC) | Black-box: it drives a compiled binary through pipes, PTYs and docker. Its correctness problems are process control, isolation and output stability, not application logic |
| A shipped typed library | Strict type checking, a real coverage gate, executable documentation examples, and **zero runtime dependencies** — so a rule whose answer is "add a library" is no answer |
| An unattended automation bot | Long-running, authenticated, talks to registries and forges; its failure mode is a 3am CI log nobody can read |
| Single-file stdlib-only tools | No dependencies, no test framework, no package manager. Most published advice silently assumes all three |

A rule that binds only one shape says so in its own row. Several rules
exist to *preserve* a property one of these already has, because the
failure mode is an agent regressing it.

## What is in it

The index carries the gate, eighteen merge-blocking non-negotiables, and
eight cross-cutting rules it owns outright. Depth files cover the CLI and
exit-code contract, process control and PTYs, the pytest suite, typing and
annotation evaluation, asyncio, HTTP clients, untrusted input, logging and
output, public API surface, data modelling, dependency-free tools, and the
mechanics of turning a gate on where none exists.

## Every rule carries a verification that was watched go red

The rule this set is strictest about is the one it applies to itself: a
check that cannot fail certifies an unchecked change as a checked one.
Every verification here was run against a deliberately broken copy before
it shipped. That discipline caught six distinct ways a check silently
passes forever — a search with no path operand reading stdin, `\|` in a
table cell that renders as alternation and pastes as a literal, `-e A -e B`
read as a conjunction when it is a union, `rg -L` mistaken for
`--files-without-match`, an unquoted `**` that bash truncates to one
directory level, and a self-test built on `assert` that `python -O` strips.

## Pinned decisions

Some rules are not derivable and are not meant to be re-litigated: the
exit-code table, the stdout/stderr split, and the deliberate carve-out
where one integration always exits `0` because its harness reads the
verdict from stdout. Those are marked as pinned. Adopt or replace them
wholesale.

## Sibling

`python-packaging` covers the manifest and distribution surface and loads
on `pyproject.toml` and `uv.lock`. The two are bundled as
`python-essentials`.
