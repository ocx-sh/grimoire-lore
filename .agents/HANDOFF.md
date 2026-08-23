# Handoff — language quality artifact programs

Two programs have run in this repository, both with
`.claude/skills/research-lang/`. The Rust one shipped 2026-08-16; the Python
one shipped 2026-08-23. The Rust sections below are unchanged and still
authoritative for the decisions they record — most of them are
language-agnostic and the Python program inherited them rather than
re-deciding.

---

# Python quality artifact program

Written 2026-08-23, for a cold resume.

## What shipped

| Artifact | Path | Notes |
|---|---|---|
| `python-quality` (rule) | `rules/python-quality.md` + `rules/python-quality/` | 123-line index, globs `**/*.py`. 12 depth files, 100 depth rules + 8 index-owned `PY-CORE` rules |
| `python-packaging` (rule) | `rules/python-packaging.md` | 78 lines, 10 rules. Globs `**/pyproject.toml` and `**/uv.lock` |
| `python-essentials` (bundle) | `bundles/python-essentials.toml` | Members carry **no tag** |
| Description companions | `docs/python-{quality,packaging,essentials}.md` | `assets/lore-python.svg` already existed |

Wired in `publish.toml`. `ocx run task -- task verify` is green including
`grim publish --dry-run`. **Merging to `main` publishes.**

Research corpus: `.agents/research/python-*`, ~35 files.
`python-topic-map.md` is the index — 193 rows, the deferred backlog, and the
"explicitly not a defect" list.

## Decisions that are load-bearing

1. **Python rule IDs are `PY-<FAMILY>-nn`.** Rust took 31 bare prefixes
   (`ERR`, `TEST`, `ASYNC`, `SEC`…) and a prefix belongs to exactly one rule
   set. `PY-` keeps review output unambiguous forever. Families: `CORE`,
   `TEST`, `TYP`, `PROC`, `CLI`, `ASYNC`, `HTTP`, `SEC`, `OBS`, `SURF`,
   `MODEL`, `SOLO`, `GATE`, `PKG`.
2. **One package, twelve depth files.** `testing` and `security` both glob
   `**/*.py`, so splitting them into sibling rules rebuilds the monolith
   with extra steps. Same reasoning as the Rust `cli-contract` decision.
3. **`python-packaging` globs only `**/pyproject.toml` and `**/uv.lock`** —
   the two names a build system guarantees. `ruff.toml` and
   `pyrightconfig.json` were rejected as globs: both are dead against ocx.
4. **The index's Non-Negotiables contain only MUST-severity rules.** Three
   SHOULD rules were removed from that table rather than promoted — the
   depth file is the definition site and its severity wins.

## Python is four shapes, not one

Measured, and it is the fact the whole rule set turns on: a subprocess-driven
pytest acceptance harness (~130k LOC, `ocx/test` + `grimoire/test`, replicated
byte-identically in three more repos); `ocx-sdk-python` (typed library,
zero runtime dependencies, pyright strict, 100% real coverage);
`index/bot` (automation, pyright full strict, pure httpx, **zero** asyncio and
**zero** `logging` imports); and stdlib-only single-file tools. A rule that
serves one serves none of the others unless it says which it binds.

## What the program found in this repository, and fixed

- **`check-artifacts.py --self-test` was defeated by `python -O`**, which
  strips every bare `assert`. A planted regression printed `self-test: ok`,
  exit 0. Now uses `expect()` raising `SystemExit`, matching `make-mark.py`.
  This was the publishing gate, and it could not go red.
- **`BrokenPipeError`**: 82KB through `head -1` produced a traceback and exit
  120. Python installs `SIG_IGN` for SIGPIPE so the failure surfaces at the
  interpreter's shutdown flush, past any handler; the fix is restoring
  `SIG_DFL`, with the `BrokenPipeError` guard kept for Windows.
- **Two new validator detectors**, from mechanisms the corpus sweep found by
  running commands rather than reading them: `rg -L` (which is `--follow`,
  not `--files-without-match`, so the check prints the compliant files) and
  unquoted `**` (bash without `globstar` reads it as one level).
- **A pre-existing scope bug**: `check_runnable_spans` only ran on lines
  starting with `|`, so any verification written in prose was unchecked for
  every mechanism. Now checked, with the escaped-pipe check kept table-only
  because a pipe in prose is a real pipe.
- **The escaped-pipe check was too broad**: GNU grep's BRE treats `\|` as real
  alternation, so only `rg` is bitten. Narrowed; corpus findings 86 → 51.
- `python.yml` pinned `actions/setup-python` to an unreviewed README commit
  labelled `# v6.0.0`; the real v6.0.0 SHA is `e797f83bcb11…`.
- `python.yml` claimed the scripts declare a floor in PEP 723 headers. Zero
  exist; CI pins 3.11 because `ruff.toml` targets `py311`.

## Verification discipline — six mechanisms, not four

The Rust program documented four ways a check silently passes forever. The
Python program found three more and retired one:

| Mechanism | Status |
|---|---|
| Dead glob; `\|` table escaping; `-e A -e B` union; `rg` with no path operand | Rust's four, all still real |
| `rg -L` mistaken for `--files-without-match` | New — inverts the check |
| Unquoted `**` truncated by bash without `globstar` | New — measured 95% blindness in one case |
| `--pcre2` `\s*` backtracking defeating its own negative lookahead | New — not automated, needs regex analysis |
| A bare-`assert` self-test under `python -O` | New — applies to any tool carrying its own proof |
| `grep '\|'` | **Retired as a false positive** — GNU BRE alternation works |

A **placeholder in a path operand** (`<file>`, `<dir>`) is acceptable: it
fails loudly with exit 2. A placeholder inside a *search pattern* is the
silent trap, and the validator catches that one.

## Live defects in the audited codebases — not fixed here

This repo ships config, not code. All measured, all cited in
`.agents/research/python-audit/fleet-fix-list.md` (19 rows).

- `ocx/test` and `grimoire/test` declare `requires-python = ">=3.10"` and
  **fail collection on it** — 4 and 6 errors. Real floors 3.12 and 3.11.
  Byte-identical trees in ocx-sion, ocx-soraka, ocx-evelynn multiply it.
- 11 undefined-name forward references, caught by `ruff check --select F821`
  with zero configuration. Neither harness runs ruff at all.
- A missing `assert` keyword at `ocx/test/.../test_update.py:389` — a bare
  tuple expression silently discarding its message.
- `grimoire/test/tests/test_fix_locking.py:102` — live pipe deadlock, N
  concurrent `Popen(PIPE)` reaped by a bare `wait()`, 64KiB threshold measured.
- `index/bot`'s `github_api.py::_paginate` follows `Link: rel=next` on the
  authenticated client with **no host check** (CVE-2018-20060 shape); the
  sibling `registry_v2.py` has the guard and tests it.
- `${{ }}` interpolated into `run:` in four workflows across ocx-save, ocx and
  grimoire — script-injection shape, zizmor auto-fixes it.
- `ocx-mirror-sdk`: reachable `idna` vulnerability via httpx.
- `ocx-mirror-sdk/.claude/rules/{quality-errors,quality-enums}.md` ship with
  no `paths:` frontmatter, so 192 lines load always-on there.

## The adopted rule this set supersedes

`quality-python.md` (114 lines) exists as **four byte-identical copies** in
ocx, grimoire, ocx-mirror-sdk and ocx-sdk-python; `quality-tests.md` (303
lines) in two. `.agents/research/python-audit/existing-rules-ledger.md`
grades all 94 of their normative claims. Its Block tier leads with a **false**
rule — that `except Exception` swallows `KeyboardInterrupt` and `SystemExit`
(both inherit `BaseException`) — cited to `E722`, which does not check the
claim the prose makes. Nobody owns the four copies; removing them is four PRs.

## Open, deliberately

- Five of the map's twelve owner questions are unanswered; they are listed at
  the end of `python-topic-map.md`.
- The four AST checker scripts `exemplar-patterns.md` depends on lived in a
  worker scratchpad and are gone. Either rebuild them or drop those rules.
- `scout-agent-legibility.md` is graded C (40% unsound verification cells).
  Nothing sourced only to it exceeds CONSIDER. Re-check before promoting.

---

# Handoff — Rust quality artifact program

Written 2026-08-14, last revised 2026-08-16, for a cold resume.

## What shipped

Two publishable rules plus a bundle. `grim publish --dry-run` passes.
**No skills** — see "Rules only, no skills" below.

| Artifact | Path | Notes |
|---|---|---|
| `rust-quality` (rule) | `rules/rust-quality.md` + `rules/rust-quality/` | Index, globs `**/*.rs`. 18 depth files |
| `rust-cargo` (rule) | `rules/rust-cargo.md` + `rules/rust-cargo/` | Globs manifests and tool configs. One depth file, `crates-of-record.md` |
| `rust-essentials` (bundle) | `bundles/rust-essentials.toml` | Members carry **no tag** — `latest` counts as a pin |

Wired in `publish.toml`. Merging to `main` runs `grim publish --announce`, so
**merging is publishing**.

Local reusable skill: `.claude/skills/research-lang/` — the whole method,
language-agnostic, plus `scripts/check-artifacts.py`.

Research corpus: `.agents/research/`, 111 files. `README.md` there is the index.

## Three decisions the owner made, which are load-bearing

1. **A narrow glob is a guess about filenames.** `rust-cli-contract` was a
   separate artifact globbing `**/main.rs`, `**/exit_code.rs`, `**/cli/**/*.rs`.
   Measured: grimoire has 20+ files referencing `ExitCode`; the glob matched 3.
   It is now `rules/rust-quality/cli-contract.md`, routed to from the index by
   subject. Generalised in `references/rule-distillation.md`. Do not re-split it.
2. **Bundles never pin.** Members are bare `"./name"`. Not a digest, not a
   version, not `latest`. Never release with `--pin`.
3. **A glob matches a language, never a filename convention.** `rust-cargo`
   used to glob `.github/workflows/*.yml`. A workflow filename says nothing
   about its language: ocx has 18 workflows and 5 are not Rust at all, and
   this catalog's only workflow is `python.yml`. It paid the whole 190-line
   file to deliver its 17-line CI section, often onto a website deploy. The
   glob is gone; CI is routed to by subject from `rust-quality.md`.
   Same lesson as (1) seen from the other side — that glob was too narrow
   and silently missed files, this one was too wide and silently loaded
   noise. Glob only what the build system *guarantees* (`**/Cargo.toml`);
   route everything else by subject.

## Rules only, no skills

`rust-review` and `rust-restructure` were built as skills and **deleted on
purpose** on 2026-08-16. Both wrapped a generic orchestration harness —
scope, refute, severity, report, loop bounds for one; work-package sizing,
worktree hygiene, topological merge for the other — around a small Rust
core. That harness is `hex`'s (`ghcr.io/michael-herwig/arcana/hex`), which
owns it better and actually executes it. Two playbooks for one phase is a
drift generator.

The Rust core survived as depth files, which is the better kind for a
second reason: **hex workers read rules, not skills.** hex's universal
worker protocol rule 1 is "read the project's relevant rules first",
located via `hex.md › Pointers`; there is exactly one pluggable-skill slot
(`adversary`, cross-model) and no discovery of installed skills at all. A
skill would have been unreachable from the swarm that needs it.

| Was | Now |
|---|---|
| `rust-review/references/dimensions.md` + scope table + evidence bar | `rules/rust-quality/reviewing-a-diff.md` |
| `rust-review/references/diff-integrity.md` | `rules/rust-quality/diff-integrity.md` |
| `rust-restructure/references/transforms.md` + diagnostics + move rules | `rules/rust-quality/restructuring.md` |
| `rust-restructure/references/parity-harness.md` | Handed to arcana — `arcana/.agents/research/parity-oracle-gate.md` |

The parity oracle is the one thing hex genuinely lacks and it is
language-agnostic, so it went to arcana as a discussion note rather than
into a Rust catalog. Nothing in this repo depends on that landing.

## ID namespaces

Published rules and the research corpus **deliberately share prefixes** —
research `ARCH-20` is published `ARCH-20`, and that traceability from source
to shipped rule is the point. Do not "fix" it.

`ECO` was the one exception and is now resolved. Published
`crates-of-record.md` had invented its own `ECO-01…08` under a prefix
`rust-ecosystem.md` already used for 81 different rules — two rule sets, one
prefix, 7 of 8 numbers meaning different things. The published eight are now
**`DEP-01…08`** (dependency selection and hygiene, which is what they
actually govern). `ECO-nn` now always means the research file; `DEP-nn`
always means the published rule.

Measured before acting, so a future session need not re-audit: every other
family agrees or the apparent conflict is an artifact of table shape.
`SEC-25/31/32`, `REL-04`, `TOOL-05` are rows in `rust-ecosystem.md`'s **audit
table**, where column 2 is the codebase's current state, not a competing rule
definition. `ARCH-20`, `ERR-04`, `PLAT-23`, `SEC-37` are the same rule worded
differently on each side. Sixteen candidates, one real collision.

The rule going forward: a prefix belongs to exactly one rule set. When a
published file needs rules that are not a distillation of the research file's
same-prefix set, it takes a new prefix rather than restarting the numbering.

## The defect class this program kept finding

A verification command that **cannot go red** is worse than no verification:
it launders an unchecked change as a checked one. Four instances, each
arrived at differently:

- A rule scoped by a glob that matches nothing — silent non-load.
- `rg 'a\|b'` in a Markdown table cell. The `\|` is table escaping; rendered
  it is alternation, but an agent reads the **raw file** and pastes a
  literal. 205 spans across 18 files.
- `rg -e A -e B` is a **union**, so a cell whose prose says "both constants"
  reads as a pass when one occurs zero times. PKG-05 was certifying a missing
  decompression limit as present.
- **`rg` with no path operand searches stdin, not the tree.** Whenever stdin
  is not a TTY it reads the pipe, finds nothing, exits 1, prints nothing — a
  clean read. A human testing in a terminal gets a recursive search and
  concludes the command works; an agent, whose shell always has stdin on a
  pipe, gets silence. An earlier blanket instruction to "drop the path
  argument" created this in 297 spans. All 320 `rg` spans now carry an
  explicit `.`, and the validator rejects a path-less one.

`check-artifacts.py` detects all four, plus `-tn`, unsubstituted
`<template>` inside a search pattern, `$(...)`, shell globs in bare path
operands, dangling rule-ID citations, duplicate IDs, empty verification
cells, budgets, and description hygiene. It caught the escaped-pipe bug in
`diff-integrity.md` during the 2026-08-16 fold — the gate works.

Also fixed: three cells line-anchored against call chains rustfmt breaks
across lines (SEC-17, PLAT-28, EXIT-05 → `-nU` with `\s*`), and API-01,
which verified compliance instead of naming the violation
(`--files-without-match`; the crate roots it lists **are** the finding).
That is the general lesson: **write the check so its output is the
violation, not the compliance.**

### Verification cells: known-imperfect, and that is the 0.1.0

Swept twice, much better than they were, not all verified. An adversarial
pass found roughly 45 noise cells whose instruction requires reading
100–1000 hits, 8 that exit non-zero on one of the two repos, and ~51 that
never state whether empty output is a pass or the finding. The prose and the
rationale are the strong part of this corpus; the greps are the weak part.
Treat a cell as a starting point for a reading agent, never as a gate.

Scope discipline when editing one:

- **Module-scoped** — keep the wide command, add a plain-words clause telling
  the reader to discard hits outside the module under change. No placeholders.
- **Diff-scoped** — steady-state counts that are never zero. Copy IDIOM-04's
  clause verbatim: *restrict to added lines on a diff*.
- **Absence assertions** — zero is expected, union semantics are correct,
  leave alone.

Corpus-wide: `--glob '!external/**'` on `--type rust` commands, an explicit
path operand always, `--glob '**/Cargo.toml'` rather than `crates/*/Cargo.toml`
(the shell expands the latter and aborts on a single-crate repo), no `$(...)`,
and conjunctions split into separate commands because `-e A -e B` is a union.

## Decided against: a Python linter for Rust

A `rules/rust-quality/check.py` was built, worked, and was **deleted on
purpose**. It carried 36 regex checks with inline self-test samples, emitted
JSON findings, and caught a real unbounded registry read in grimoire that the
table-cell greps missed. It is still the wrong artifact, for the owner's
reason: it is a new linting tool. The Rust ecosystem already has clippy,
cargo-deny, cargo-audit and cargo-shear, and this catalog's own IDIOM-12 says
do not own non-domain code.

Deleted with it: `run-cells.py` and the `fixtures/rust-violations/` tree.
**What replaced it: nothing, deliberately.** An agent reads the rules and the
code. If a future session is tempted again, the argument that settled it is
that the linter's real value was auditing *our rules*, not reviewing Rust —
and that job is done.

`check-artifacts.py` survives because it validates the artifacts this
repository publishes, not the language they describe. `grim build` covers
only the frontmatter schema. It never ships to consumers — it lives under
`.claude/`.

## The local dev loop

Tools are pinned in `ocx.toml` and resolved through `ocx run`, so CI and a
contributor run identical versions:

```sh
ocx run task -- task            # list tasks
ocx run task -- task verify     # lint, format, test, self-test, artifacts, build
```

The artifact gate needs `--root` pointing at a **consuming** repo — this
catalog has no Rust source, so glob liveness is meaningless against `.`:

```sh
python3 .claude/skills/research-lang/scripts/check-artifacts.py \
  --root /home/mherwig/dev/ocx rules .claude/skills/research-lang
```

`.github/workflows/python.yml` runs the same `verify`. It is hand-written and
that is safe: `verify-ci` diffs only the four files `grim-indexer` generates
from `index.config.json`, confirmed with a probe file.

## Open tasks

- **#10** Done 2026-08-16, see "ID namespaces". The follow-up that remains:
  apply the ranked promotion list at the end of `rust-ecosystem.md`.
- **Deferred, not rejected**: DOC-21 (doctest init helper) —
  `docs-and-tracing.md` sits at 168 lines and nothing there was worth
  displacing for a CONSIDER. It keeps its ID; promote it next revision.
- **ocx migration** has not started: no `grimoire.toml`, no hex skills there
  yet. 147 references to `quality-rust*.md` under `.claude/` will need
  renaming — `rules.md` (26), `worker-reviewer` (10), `worker-builder` (8),
  `worker-tester` (6), rest in artifacts/ADRs (historical, leave). ocx's link
  linter will go red, which is the right gate.

## Gotchas that will waste an hour otherwise

- **`rg` is shadowed** by a Claude Code shell-snapshot function, and the RTK
  hook rewrites `grep`/`rg` invocations. Test real behaviour through
  `ocx run ripgrep -- rg …` rather than a bare `rg`.
- **Shell tool output is post-processed.** `ls`/`grep` results reaching the
  agent are reformatted, so verify a file's existence with `test -f` or
  `stat`, never by eyeballing an `ls`.
- **Repo shapes differ.** ocx is a workspace (`crates/*/`); grimoire is a
  single crate (`src/`). A command assuming `crates/` aborts on grimoire
  before it runs. Every cell must work on both.
- **Web research runs on Sonnet**, consolidation and anything that becomes an
  enforced rule on Opus. Every spawn sets `model` explicitly and carries a
  `Model rationale:` line.

## Live defects found in the audited codebases

Not fixed here — this repo ships config, not code. Worth filing.

- `grimoire/src/catalog/index_source.rs:173-176` — unbounded `.bytes().await`
  on a **remote catalog index**, no size cap before deserialization (SEC-17).
- Neither repo declares `[profile.release]` — grimoire has only
  `[profile.dist]`, ocx's root manifest has no profile section at all. So
  `overflow-checks` is unset in the binary users actually run (SEC-30).
- `missing_debug_implementations` is declared in neither root manifest (API-01).
- `grimoire/src/tui/app.rs:1026-1039` — `map_key` matches `key.code` and
  discards `key.modifiers`, so **Ctrl-C does not quit the TUI**; it clears marks.
- `ocx/crates/ocx_cli/Cargo.toml:21-24,38-39` — `__testing` forwards across a
  `[dependencies]` edge, so `--all-features` ships the test escape hatch.
- `ocx_schema/src/main.rs:15` — raw `process::exit(1)` for a usage error;
  the pinned contract says 64.
- `grimoire/src/main.rs:191` — writes `{err:#}` unsanitized (CWE-150) where
  ocx neutralizes the same terminal-injection surface.
- ocx leaks credential-helper stdout/stderr through `{err:#}` (CWE-532); grim
  already fixed that path.
- Exit code 82 `DirtyRcBlock` is shipped and tested but documented nowhere.
- ocx has no `StdoutPipeClosed` handling, so `ocx … | head` can panic.
