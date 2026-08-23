---
title: Python research program — frame
phase: 0
model: opus
date: 2026-08-22
---

# Frame (phase 0)

## Language and era

Python. Two version floors in the fleet, and rules must say which they apply to:

| Floor | Where | Notes |
|---|---|---|
| `>=3.10` | the `<repo>/test/` pytest harnesses | The binding constraint — no PEP 695 syntax, no `tomllib`-only paths without a fallback |
| `>=3.12` | `ocx-sdk-python` (classifiers through 3.14) | PEP 695, `type` aliases, `@override` available |

Current release at research time: 3.14. Toolchain is uv + ruff + pyright; mypy is
not in use anywhere. Tools are pinned and resolved through `ocx run`, so CI and a
contributor get identical versions.

## The adopting codebases — four shapes, not one

Measured 2026-08-22 under `/home/mherwig/dev`, excluding `.venv`, `node_modules`,
`external/`, `target/`, `.agents/worktrees/`.

| # | Shape | Size | Character |
|---|---|---|---|
| 1 | `<repo>/test/` pytest acceptance harness | ocx 190 files / 95k LOC; grimoire 76 / 35k; replicated in ocx-sion, ocx-soraka, ocx-evelynn, ocx-mirror, ocx-mcp, ocx-save, grimoire-duo | Black-box: drives Rust CLIs through subprocess/pexpect/docker-compose/an OCI registry. Dominates by volume |
| 2 | `ocx-sdk-python` | 38 files / 17k LOC | Shipped typed library: pyright strict on `src`, ruff `+D+ANN`, `fail_under = 100`, Sybil doctests, asyncio |
| 3 | `index/bot` | 93 files / 20k LOC | Automation |
| 4 | Single-file stdlib-only tools | `.claude/hooks/*.py` (10/repo), `grimoire-lore/scripts/`, `check-artifacts.py` | Zero third-party dependencies is a hard constraint |

Shape 1 is the volume and shape 2 is the strictness; a rule set that serves only
one of them serves neither. Shape 4's constraint (stdlib only) contradicts most
published Python advice, which assumes a dependency is free.

## Artifact set (what this program must converge to)

Mirrors the Rust set, whose shape is settled — see `.agents/HANDOFF.md`.

| Artifact | Glob | Why this carrier |
|---|---|---|
| `rules/python-quality.md` + `rules/python-quality/` | `**/*.py` | Index holds non-negotiables + a task-worded routing table; depth files hold the tables |
| `rules/python-packaging.md` | `**/pyproject.toml` | The only Python filename the build system *guarantees* — a safe narrow glob |
| `bundles/python-essentials.toml` | — | Members carry no tag |
| `docs/python-*.md` + `assets/lore-python.svg` | — | Per-package description companions; without them every package ships the index README |

Not shipping: a Python linter. Ruff, pyright and bandit exist; the Rust program
already decided against owning non-domain code and deleted its equivalent.

## Corpus namespace

The `.agents/research/` tree already holds the Rust corpus. Python uses the
`python-` prefix throughout: `python-topic-map.md`, `python-topic-map/<scout>.md`,
`python-audit/<axis>.md`, `python-<topic>.md`, `python-<topic>/<worker>.md`.
