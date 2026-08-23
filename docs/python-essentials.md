# python-essentials

The OCX Python set in one install: `python-quality` and
`python-packaging`.

```sh
grim add ghcr.io/ocx-sh/lore/python-essentials
```

| Member | Loads on | Covers |
|---|---|---|
| `python-quality` | `**/*.py` | The gate, eighteen non-negotiables, the pinned exit-code contract, and twelve depth files: CLI contract, process control, testing, typing, async, HTTP, security, observability, API surface, data modelling, single-file tools, gate adoption |
| `python-packaging` | `**/pyproject.toml`, `**/uv.lock` | The version floor that must actually run, dependency declaration, lockfiles, wheel contents, publishing credentials |

## Why the two are separate

They have genuinely different globs, which is the only thing that
justifies a second rule file. Everything that loads on `**/*.py` lives in
one index plus an on-demand depth directory, because eight sibling rules
that all glob the same extension just rebuild a monolith with extra steps
— every one of them loads together.

## What it is derived from

Measurement of four dissimilar Python codebases — a 130k-LOC
subprocess-driven acceptance harness, a zero-dependency typed library, an
unattended automation bot, and a set of stdlib-only single-file tools —
against a cited research corpus covering the canonical curriculum, the
complete ruff rule index, practitioner argument, a failure catalogue, and
the last three release cycles.

Findings that turned out to be one line of tool configuration are shipped
as configuration, not as prose. Rules that merely restate what a linter
already denies were dropped. What remains is what an agent gets wrong
without being told.

The bundle names its members without a tag. It says these belong together;
your `grimoire.lock` is what freezes them.
