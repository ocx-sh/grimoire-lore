# python-essentials

The OCX Python set in one install: `python-quality`,
`python-packaging`, and the shared `code-docs` comment rule with its
cleanup skill.

```sh
grim add ghcr.io/ocx-sh/lore/python-essentials
```

| Member | Loads on | Covers |
|---|---|---|
| `python-quality` | `**/*.py` | The gate, eighteen non-negotiables, the pinned exit-code contract, and twelve depth files: CLI contract, process control, testing, typing, async, HTTP, security, observability, API surface, data modelling, single-file tools, gate adoption |
| `python-packaging` | `**/pyproject.toml`, `**/uv.lock` | The version floor that must actually run, dependency declaration, lockfiles, wheel contents, publishing credentials |
| `code-docs` | Every source extension, `**/*.py` included | Fifteen non-negotiables and 22 MUST rows across five depth files: the guard floor, where each clause of a comment goes, record pointers and process IDs, doc text that renders into help and schemas, and the length caps with their per-file ratchet. Shared by every language set |
| `code-docs-cleanup` | On request (skill) | A ten-step, guard-first procedure for shortening existing comments, gated by a structural diff check and a cold reason re-check per shortened guard |

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
