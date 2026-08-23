---
title: Python AI-config inventory — existing rules, skills, hooks touching Python across the family
agent: config-inventory-auditor
model: sonnet
scope: /home/mherwig/dev/{ocx,grimoire,index,ocx-sdk-python,grimoire-lore,ocx-mirror-sdk}, excluding .agents/worktrees/, target/, node_modules/, .venv/
method: >
  Directory discovery via `find <repo> -maxdepth N \( -iname CLAUDE.md -o -iname AGENTS.md \)`
  and `find <repo>/.claude/{rules,hooks,skills,agents} -maxdepth 3 -type f`.
  File identity via `md5sum` and `diff` (GNU diffutils) to detect copy-paste vs. divergence.
  Content selection via `grep -nEi '\b(python|pytest|ruff|pyright|mypy|\buv\b)\b'` over every
  rule/skill/hook file, then full reads of every match. Frontmatter/activation checked via
  `head -1` (blank-vs-`---`) and `sed -n '2,10p' | grep '^paths:'` per file — no frontmatter
  or no `paths:` key means the rule loads unconditionally every session (confirmed against
  the repos' own `meta-ai-config.md`, which documents and structurally tests this contract).
  Rust-set shape read from `rules/rust-quality.md`, `rules/rust-quality/errors.md`,
  `rules/rust-cargo.md`, `bundles/rust-essentials.toml`, and
  `.claude/skills/research-lang/references/rule-distillation.md`. ID prefixes taken via
  `grep -rhoE '\b[A-Z][A-Z-]{1,15}-[0-9]+\b' rules/ | sed -E 's/-[0-9]+$//' | sort -u`.
  Every command above is copy-runnable from the stated repo root.
---

# Python AI-config inventory

**Headline**: the family already has a near-complete, near-identical Python quality rule
duplicated four times (byte-identical in 3 of 4 copies), a second near-identical pytest rule
duplicated twice, and one repo (`ocx-mirror-sdk`) that accidentally promoted 192 lines of
Python guidance to always-on-every-session status. `grimoire-lore` itself — the repo that
will house the new Python rule set and already carries 815 lines of its own Python tooling —
has **zero** Python rules of any kind. The four-codebase-shapes hypothesis holds, with one
correction: hooks exist in only 2 of the 6 audited repos, not all of them.

Contents: [1. Full inventory](#1-full-inventory) · [2. Normative digests](#2-normative-content-digests-verbatim)
· [3. Portable vs repo-specific](#3-portable-vs-repo-specific) · [4. Collisions, gaps, always-on cost](#4-collisions-gaps-always-on-cost)
· [5. Rust set shape + taken ID prefixes](#5-rust-set-shape--taken-id-prefixes) · [6. Hooks](#6-hooks)

---

## 1. Full inventory

Every file whose content governs Python, pytest, ruff, uv, packaging, or the test harness,
found by `grep -rlEi '\b(python|pytest|ruff|pyright|mypy|\buv\b)\b'` across
`{ocx,grimoire,index,ocx-sdk-python,grimoire-lore,ocx-mirror-sdk}/.claude/{rules,skills,hooks,agents}`
plus root `CLAUDE.md`/`AGENTS.md`, then manually triaged for files whose *content*, not just an
incidental mention, governs Python.

| # | Path | Lines | Activation | Trigger |
|---|---|---|---|---|
| 1 | `ocx/.claude/rules/quality-python.md` | 114 | glob-scoped | `paths: **/*.py, **/pyproject.toml, **/requirements*.txt` (`ocx/.claude/rules/quality-python.md:2-5`) |
| 2 | `grimoire/.claude/rules/quality-python.md` | 114 | glob-scoped | identical glob; **byte-identical file** (md5 `46b9f0ac…`) |
| 3 | `ocx-sdk-python/.claude/rules/quality-python.md` | 114 | glob-scoped | identical glob; **byte-identical file** (md5 `46b9f0ac…`) |
| 4 | `ocx-mirror-sdk/.claude/rules/quality-python.md` | 114 | glob-scoped | identical glob; **byte-identical file** (md5 `46b9f0ac…`) |
| 5 | `index/.claude/rules/quality-python.md` | 144 | glob-scoped | same glob; base text identical to #1–4 plus one extra section (`CI Bots / Security-Critical Automation`, lines 86-113) |
| 6 | `ocx-sdk-python/.claude/rules/quality-tests.md` | 303 | glob-scoped | `paths: tests/**, **/conftest.py, **/test_*.py` (`:2-5`) |
| 7 | `ocx-mirror-sdk/.claude/rules/quality-tests.md` | 303 | glob-scoped | same glob; 1-line diff from #6 (module name `ocx_sdk`→`ocx_mirror_sdk`, line 52) |
| 8 | `ocx/.claude/rules/subsystem-tests.md` | 216 | glob-scoped | `paths: test/**` — pytest acceptance harness design doc |
| 9 | `grimoire/.claude/rules/subsystem-tests.md` | 118 | glob-scoped | `paths: test/**` — same role, own fixtures (`GrimRunner` vs `OcxRunner`) |
| 10 | `ocx-sdk-python/.claude/rules/architecture.md` | 177 | glob-scoped | `paths: src/**, tests/**, pyproject.toml` |
| 11 | `ocx-mirror-sdk/.claude/rules/architecture.md` | 81 | glob-scoped | `paths: src/**, tests/**` |
| 12 | `ocx-mirror-sdk/.claude/rules/quality-errors.md` | 113 | **always-on (global)** | **no frontmatter at all** — `head -1` returns `# Error Handling`, not `---` |
| 13 | `ocx-mirror-sdk/.claude/rules/quality-enums.md` | 79 | **always-on (global)** | **no frontmatter at all** |
| 14 | `ocx/.claude/rules/quality-core.md` | 240 | always-on (global) | no frontmatter; language-agnostic, incl. "Unchecked Green" (§193-220) |
| 15 | `grimoire/.claude/rules/quality-core.md` | 168 | always-on (global) | no frontmatter; language-agnostic, no Unchecked Green section |
| 16 | `index/.claude/rules/quality-core.md` | 170 | always-on (global) | no frontmatter; = `ocx-sdk-python`/`ocx-mirror-sdk` copy (md5 match), diverges from `ocx`'s |
| 17 | `ocx/.claude/rules/product-tech-strategy.md` | 50 | always-on (global) | no frontmatter; `### Python (Acceptance Tests)` table (lines 29-35) |
| 18 | `grimoire/.claude/rules/product-tech-strategy.md` | 40 | always-on (global) | same table pattern (lines 21-27) |
| 19 | `ocx/.claude/rules/meta-ai-config.md` | 212 | glob-scoped | `paths: .claude/**` — governs how `quality-python.md`-shaped files must be authored |
| 20 | `grimoire/.claude/rules/meta-ai-config.md` | 292 | glob-scoped | `paths: .claude/**`; near-identical to #19 |
| 21 | `index/.claude/rules/meta-ai-config.md` | 68 | glob-scoped | `paths: .claude/**` |
| 22 | `ocx/.claude/rules/workflow-swarm.md` | — | glob-scoped | `paths: .claude/agents/**, .claude/skills/swarm-*/**`; line 20 names `quality-python.md` + `subsystem-tests.md` in the mandatory pre-write reading order |
| 23 | `index/.claude/rules/workflow-swarm.md` | — | glob-scoped | same glob and routing statement |
| 24 | `{ocx,grimoire,ocx-sdk-python,ocx-mirror-sdk}/.claude/rules/workflow-bugfix.md` | — | glob-scoped | one line each: "Acceptance-level bugs: pytest test in `test/tests/`" |
| 25 | `{ocx,grimoire}/.claude/rules/subsystem-ci.md` | — | glob-scoped | `astral-sh/setup-uv@v6` CI step reference |
| 26 | `ocx-sdk-python/.claude/rules/subsystem-ci.md` | — | glob-scoped | full uv/ruff/task CI wiring (lines 23, 41, 119) |
| 27 | `ocx-mirror-sdk/.claude/rules/subsystem-ci.md` | — | glob-scoped | same wiring |
| 28 | `{ocx-sdk-python,ocx-mirror-sdk}/.claude/rules/subsystem-taskfiles.md` | — | glob-scoped | `uv run <tool>` Taskfile examples |
| 29 | `ocx-sdk-python/CLAUDE.md` | 135 | always-on (root) | direct Python task table (lines 56-76, 118-119) |
| 30 | `ocx-mirror-sdk/CLAUDE.md` | 106 | always-on (root) | direct Python task table (lines 43-64, 86-89) |
| 31 | `ocx/CLAUDE.md` | 152 | always-on (root) | one command example (line 63); no Python standards |
| 32 | `grimoire/CLAUDE.md` | 7 | always-on (root) | thin pointer file, no Python content |
| 33 | `index/CLAUDE.md` | 146 | always-on (root) | **zero** python/pytest/ruff/uv matches |
| 34 | `{ocx,grimoire}/.claude/skills/{qa-engineer,builder}/SKILL.md` | — | skill description | reference `quality-python.md`, add no new normative content |
| 35 | `ocx-mirror-sdk/.claude/skills/qa-engineer/SKILL.md` | — | skill description | line 43-49: pytest command routing |
| 36 | `ocx-mirror-sdk/.claude/skills/code-check/SKILL.md` | — | skill description | lines 16, 35, 41-42: routes to `quality-python.md`, `task lint`/`task types` |
| 37 | `ocx/.claude/hooks/pre_commit_verification.py` | 218 | hook: `PreToolUse(Bash)` | lines 133-147: detects `ruff`/`pytest`/`mypy` in `pyproject.toml` |
| 38 | `grimoire/.claude/hooks/pre_commit_verification.py` | 178 | hook: `PreToolUse(Bash)` | lines 99-113: same detection, forked copy |
| 39 | `grimoire-lore/scripts/make-mark.py` | 227 | **ungoverned** | no rule/skill anywhere in `grimoire-lore` covers this file |
| 40 | `grimoire-lore/.claude/skills/research-lang/scripts/check-artifacts.py` | 588 | **ungoverned** | same — no Python quality rule exists in this repo |

Not included (checked, content is incidental — a passing `uv`/Python mention in a Rust-scoped
file, not governance): `ocx/.claude/rules/rust-quality/{performance,testing}.md`,
`ocx/.claude/rules/subsystem-website.md`, `ocx/.claude/rules/subsystem-script.md`,
`{ocx,grimoire}/.claude/rules/product-context.md`, `grimoire/.claude/rules/subsystem-file-structure.md`.

---

## 2. Normative content digests (verbatim)

### `quality-python.md` (identical core, files #1-5) — the anti-pattern list

Block tier (`ocx/.claude/rules/quality-python.md:22-34`):
> - **Bare `except:` or `except Exception:`** — swallow `KeyboardInterrupt`, `SystemExit`, hide bugs. Always name exception(s). Ruff rule: `E722`.
> - **`assert` for input validation** in production — asserts stripped with `python -O`. Use explicit `if`/`raise` for runtime invariants.
> - **Mutable default arguments** — `def f(x=[])` make one shared object across all calls. Use `None` sentinel, set inside body. Ruff rule: `B006`.
> - **Wildcard imports (`from module import *`)** — … Ruff rule: `F403`.
> - **`dict[str, Any]` or untyped `TypedDict` at public API boundaries** — …
> - **Exception chaining dropped** — … Always `raise NewError(...) from e` … Ruff rule: `B904`.
> - **`asyncio.gather(*tasks)` for new async code** — use `asyncio.TaskGroup` (3.11+) …
> - **Missing type annotations on public functions** — … Ruff rule: `ANN` group (enable selectively).
> - **`eval()` / `exec()` on user input** — injection risk.
> - **Shadowing built-ins** (`list`, `dict`, `id`, `type`, `input`, `map`, `filter`)
> - **Comparing with `is` for value equality** (except `None`, `True`, `False`)

Tooling table (`:74-82`):
> | **uv** | Package manager, venv, script runner | pip, virtualenv, poetry, pipx, pyenv |
> | **ruff** | Linter + formatter | flake8, black, isort, pylint |
> | **pyright** | Type checker (production default) | mypy |
> | **ty** | Type checker (Astral, Beta 2026) | mypy/pyright long run — 10-60x faster, lacks plugin system |
> | **pytest** + **pytest-asyncio** | Testing | unittest |
> "2026 recommendation: `uv` + `ruff` + `pyright` = default stack."

`index`'s extra section, absent from the other 4 copies (`index/.claude/rules/quality-python.md:86-113`):
> - **100% coverage gate**: `[tool.coverage.run] branch = true`; `[tool.coverage.report] fail_under = 100`, `show_missing = true`. No inline `# pragma: no cover` — only a small reviewed `exclude_also` list …
> - **Untrusted input (Block-tier)**: length-cap BEFORE regex; `re.fullmatch` only (never `match`/`search`); no nested quantifiers (ReDoS — `re` has no timeout); …
> - **ruff `S` group is opt-in — enable it** + bandit in CI. Key codes: S113 (HTTP call without timeout), S310 (URL scheme check), S603/S607 (subprocess).
This section cites three derived docs — `research_python_bot_stack.md`, `research_python_coverage_gate.md`, `research_python_bot_security.md` — that **do not exist** as separate files; they turned out to be `index/.claude/artifacts/research_python_{bot_stack,coverage_gate,bot_security}.md` (confirmed present via `find`). The rule text names them without the `.claude/artifacts/` path, so the reference resolves only by search, not by the literal string given.

### `quality-tests.md` (#6-7) — pytest standards, 15-point cheat sheet

`ocx-sdk-python/.claude/rules/quality-tests.md:20-28` (FIRST):
> | **F**ast | Milliseconds. No real network, no real disk outside `tmp_path`, no `time.sleep`. |
> | **I**ndependent | Any order, any subset. No shared mutable state. |
> …

Forbidden list (`:222-229`):
> - `time.sleep`, `asyncio.sleep` — use a clock seam.
> - Real network — inject the client + `MockTransport`.
> - Real disk outside `tmp_path` — never write to `~`, `/tmp`, or cwd directly.
> - Shared mutable state between tests …
> - Bare `pytest.raises(Exc)` without `match=`.
> - `assert True` / `assert 1 == 1` placeholder asserts.

Severity table (`:278-284`):
> | **Block** | Real network in unit test; `time.sleep` in unit test; bare `pytest.raises`; tests assert on private implementation details |
> | **Warn** | `MagicMock` chain depth > 2; mocking owned interfaces instead of faking; `autouse` without justification; parametrize without `id="…"` |

Only diff between the two copies: `test/test_<module>.py mirrors src/ocx_sdk/<module>.py` (#6, line 52) vs. `src/ocx_mirror_sdk/<module>.py` (#7, line 52).

### `subsystem-tests.md` (#8-9) — acceptance harness, repo-specific but same pattern

`ocx/.claude/rules/subsystem-tests.md:12`:
> "Session-scoped registry (started once in `pytest_sessionstart`) enables fast parallel runs with pytest-xdist. UUID-prefixed repo names provide isolation on shared registry, no per-test cleanup."

`ocx`'s copy carries an "Unfalsifiable Greens" table (`:185-200`) that names **exactly the defect class the task brief calls out** — a verification that cannot go red:
> | **Exit-code tolerance band** — `rc in (64, 65, 74)` | Cannot tell "still a stub" from "the binary rejected my input" | Assert the one exit code the contract names |
> | **A skip naming an assumed condition** | "skipped: X unimplemented" outlives X being implemented; the reason was never observed | Assert the condition, or observe it before skipping |
> "A whole file skipping itself away is indistinguishable from a pass — prefer a failed assert on a missing prerequisite over `pytest.skip`."
`grimoire`'s copy (`grimoire/.claude/rules/subsystem-tests.md`) has **no equivalent section** — this content exists in exactly one of the two repos that need it.

### `quality-errors.md` / `quality-enums.md` (#12-13) — labeled repo-specific, content mostly isn't

`ocx-mirror-sdk/.claude/rules/quality-errors.md:1-19`:
> "Project-specific rule for `ocx-mirror-sdk`. … The SDK exposes ~15 public symbols … Callers should be able to write **one** `try / except` clause around the whole SDK and recover meaningfully."
> 1. **One base class.** Every exception raised from `src/ocx_mirror_sdk/**` inherits `OcxMirrorError`.
> 2. **No bare stdlib raises from SDK code.** No `raise RuntimeError`, `raise ValueError`, `raise KeyError`, `raise TypeError` inside `src/`.
> 3. **Always chain with `from e`** … Ruff `B904` is enforced.
> 7. **No `None` sentinel for exceptional cases.** Return `None` *iff* the absence is expected on a healthy system …

`ocx-mirror-sdk/.claude/rules/quality-enums.md:9-18` (decision matrix):
> | **`StrEnum`** (3.11+ stdlib) | Closed set of named choices crossing the public API … |
> | **`IntEnum`** | Closed set of integer wire values … |
> | **`Literal[...]`** | Pure static-type narrowing … Promote to `StrEnum` once a second public callsite uses the same set. |
> 5. **Coerce input via the constructor**: `Backend(value)`, never `Backend[value]`.

### Hook enforcement (#37-38)

`ocx/.claude/hooks/pre_commit_verification.py:133-147`:
```
pyproject = root / "pyproject.toml"
if pyproject.exists():
    ...
    if "ruff" in py_text:
        tools.append("ruff")
    if "pytest" in py_text:
        tools.append("pytest")
    if "mypy" in py_text:
        tools.append("mypy")
```
This is a **nudge**, not an automated check: it only detects which tool *names* appear in `pyproject.toml` text, to require the agent assert it ran verification before commit. It never invokes ruff/pytest itself, and it recognizes `mypy` but not `pyright` — the tool `quality-python.md` names as "production default" (§2 above) — so a `pyright`-only repo gets no Python line in the detected-tools list at all.

---

## 3. Portable vs repo-specific

| Claim | Portability | Basis |
|---|---|---|
| The full `quality-python.md` anti-pattern/type-system/async/tooling/checklist content (#1-5) | **Portable** | No OCX/Grimoire/index type or module name anywhere in the file; already reused verbatim across 4 unrelated repos |
| `quality-tests.md`'s FIRST/Right-BICEP/CORRECT, AAA structure, mocking rules, fakes-over-mocks, forbidden list, severity table (#6-7) | **Portable** | Only repo-specific token is one file-path example per copy (`src/ocx_sdk/` vs `src/ocx_mirror_sdk/`) |
| `subsystem-tests.md`'s *pattern* — session-scoped registry, UUID-prefixed isolation, "Unfalsifiable Greens" catalog (#8-9) | **Portable pattern, repo-specific instance** | Fixture names (`OcxRunner`/`GrimRunner`), binary names, and registry topology are repo decisions; the isolation strategy and the five unfalsifiable-shape rows generalize to any subprocess-driving pytest harness |
| `quality-errors.md` exception-hierarchy rules (#12) | **Portable mechanism, repo-specific hierarchy** | Rules 1-3, 5-7, 9-11 (single base class, chain with `from e`, validate-at-boundary, `None` only for expected absence, log-once-at-boundary, name everything `*Error`) hold for any SDK; the concrete `OcxMirrorError` tree and "~15 public symbols" framing are this repo's |
| `quality-enums.md` decision matrix (#13) | **Portable** | `StrEnum`/`IntEnum`/`Literal` selection criteria, `Backend(value)` vs `Backend[value]` constructor-vs-lookup rule, and `UPPER_SNAKE_CASE` convention are language rules with zero repo-specific nouns |
| `architecture.md` (#10-11) | **Repo-specific** | CLI-wrapper positioning, `_process.py`/`_env.py`/`_results.py` module layout, `ExitCode` mapping — these are `ocx-sdk`/`ocx-mirror-sdk`'s own design, not extractable |
| Tech-stack tables in `product-tech-strategy.md` (#17-18) | **Repo-specific decision, portable as a *default*** | "Python 3.13+, uv, Ruff, pytest" is this family's pinned choice, presentable to an adopter as an overridable default per the distillation doc's Portability section |
| `index`'s CI-Bots section (#5, security/coverage) | **Portable mechanism, narrow scope** | 100%-branch-coverage-with-`exclude_also`, ReDoS-safe regex rules, and the `S`-group ruff codes generalize to any credential-holding automation, not just `index/bot` |

---

## 4. Collisions, gaps, always-on cost

**Collisions counted**: 2.
1. `quality-python.md` is **byte-identical across 3 repos** (`ocx`, `grimoire`, `ocx-mirror-sdk`; md5 `46b9f0ac8545b5551fa60f48d2ef2753`) and diff-identical in a 4th (`ocx-sdk-python`) — 4 independent copies of one 114-line file, none of which import from a shared source. A new authored rule that doesn't explicitly supersede/absorb this text will either duplicate ~90 lines or contradict an existing, already-adopted standard.
2. `quality-tests.md` is diff-identical across 2 repos (`ocx-sdk-python`, `ocx-mirror-sdk`) modulo one file path — same risk, smaller footprint (303 lines).

**Gaps found** (subjects with zero coverage anywhere in the 6 repos, verified by grep):
- **pydocstyle / docstring convention** — `ocx-sdk-python/pyproject.toml:71,76-77` enables ruff's `D` group and pins `convention = "google"`, but no rule file anywhere states a docstring convention; an agent only learns it by reading `pyproject.toml` directly, which no rule points it to.
- **pexpect usage** — the harness genuinely uses it (`ocx/test/tests/test_login.py`, confirmed), but zero rule files mention `pexpect` by name; `subsystem-tests.md` documents the OcxRunner/GrimRunner subprocess wrapper but not the pexpect-driven interactive-shell paths.
- **argparse/CLI-authoring conventions for Python tools** (as distinct from the ocx/grim Rust CLI contract) — absent everywhere, despite `index/bot` (93 files/20k LOC) and 10 hook scripts per repo being CLI-shaped Python.
- **`.claude/hooks/*.py` and `grimoire-lore`'s own `scripts/`/`check-artifacts.py`** — the single-file, stdlib-only, PEP-723 style Python actually used for the AI-config tooling itself has no governing quality rule in any of the 6 repos, `grimoire-lore` included.
- **`grimoire-lore` has zero Python rules of its own** — confirmed by `find grimoire-lore/.claude/rules -type f` returning nothing (the directory doesn't exist) and `find grimoire-lore -iname 'quality-python*'` returning nothing, despite the repo carrying 815 lines of Python (`scripts/make-mark.py` 227 + `.claude/skills/research-lang/scripts/check-artifacts.py` 588).

**Always-on Python-guidance lines paid per session, by repo** (files with no `paths:` frontmatter, per the repos' own `meta-ai-config.md:22-30` contract, filtered to files whose content is Python-specific):

| Repo | Always-on Python-specific lines | Source |
|---|---|---|
| `ocx` | 0 | `quality-python.md` is glob-scoped; `quality-core.md`'s always-on content is language-agnostic |
| `grimoire` | 0 | same |
| `index` | 0 | `quality-python.md` glob-scoped; `quality-indexbot-security.md` (108 lines, always-on) has zero python/pytest/ruff matches |
| `ocx-sdk-python` | 0 | `quality-python.md`, `quality-tests.md`, `architecture.md` all glob-scoped |
| `ocx-mirror-sdk` | **192** | `quality-errors.md` (113) + `quality-enums.md` (79) — **both missing `paths:` frontmatter entirely**, so both load unconditionally, in a repo that has no `meta-ai-config.md` of its own to catch the drift (`ocx`/`grimoire` have a structural test — `test_global_rule_count_matches`, referenced at `ocx/.claude/rules/meta-ai-config.md:29` — enforcing exactly 3 globals; `ocx-mirror-sdk` has no such rule or test, and sits at 4) |

This 192-line finding is the most actionable single item in this audit: it looks like an authoring mistake (two project-specific companion rules that should have shipped with the same `paths:` frontmatter every other repo-specific rule uses) rather than a deliberate choice, and it's currently costing every session in `ocx-mirror-sdk` 192 lines of context regardless of what file is open.

---

## 5. Rust set shape + taken ID prefixes

Read from `rules/rust-quality.md`, `rules/rust-quality/errors.md`, `rules/rust-cargo.md`,
`bundles/rust-essentials.toml`, `.claude/skills/research-lang/references/rule-distillation.md`.

**Shape**: index + support directory, exactly as `rule-distillation.md:101-119` prescribes:
```
rules/
  rust-quality.md        # index: non-negotiables + routing table, 115 lines
  rust-quality/           # 16 depth files, read on demand
    architecture.md errors.md async.md testing.md security.md ...
  rust-cargo.md           # second rule: genuinely different glob (Cargo.toml/clippy.toml/rustfmt.toml)
    rust-cargo/crates-of-record.md
```
- **Index frontmatter** (`rules/rust-quality.md:1-8`): `paths`, `summary`, `keywords`, `license`, `repository` — this is the *published* shape (grim catalog metadata), richer than the internal `.claude/rules/*.md` files audited above, which carry only `paths:`.
- **Index anatomy**: "The Gate" (five ordered shell commands, narrowest-scope-first) → "Non-Negotiables" (20-row table: `# | Rule | ID`, MUST-tier only) → "Where the Depth Is" (routing table, **worded by task**, e.g. "Ending a process, choosing a status, or writing to stdout?" not "CLI contract") → "Severity" (MUST=Block/SHOULD=Warn/CONSIDER=Suggest) → "Siblings" (when to also read `rust-cargo.md`).
- **Depth-file rule-row anatomy** (`rules/rust-quality/errors.md:53-60`): `| ID | Rule | Verification | Severity |` — one imperative sentence, one exact grep/lint/command, no verification = no rule. Confirmed against `rule-distillation.md:135-149`, which specifies exactly these five fields.
- **Bundle** (`bundles/rust-essentials.toml`): flat `[rules] rust-quality = "./rust-quality"`, **no version pin** — `# MEMBERS CARRY NO TAG` (line 11), matching the `[[bundles-never-pin]]` convention already in this session's memory.

**ID prefixes already in use anywhere in `rules/`** (`grep -rhoE '\b[A-Z][A-Z-]{1,15}-[0-9]+\b' rules/ | sed -E 's/-[0-9]+$//' | sort -u`):

```
API ARCH ASYNC CI CLI CVE CWE DATA-DET DATA-DIG DATA-FMT DEP DOC ERR EVO
EXIT IDIOM LINT OBS PERF PKG PLAT REL RUSTSEC SEC SHA STATE TEST TOOL TUI UTF
```

A Python rule set reusing any of `ARCH`, `ASYNC`, `CI`, `DEP`, `DOC`, `ERR`, `LINT`, `PERF`,
`SEC`, `TEST`, `TOOL` for a *different* concept would collide by prefix even though rule IDs
are locally scoped per file — worth a distinct prefix family (e.g. `PY-*` or per-topic
`PYERR`/`PYTEST`/`PYASYNC`) rather than bare reuse of `ERR`/`TEST`/`ASYNC`.

---

## 6. Hooks

Hooks exist in exactly 2 of the 6 audited repos: `ocx` and `grimoire`. `index`,
`ocx-sdk-python`, `ocx-mirror-sdk`, and `grimoire-lore` have **no** `.claude/hooks/` directory
at all — this contradicts the framing's "10 per repo" premise for the non-Rust repos; the
project-context claim of "10 per repo" holds only for the two repos that carry the full swarm
tooling.

All 10 scripts are PEP 723 single-file tools (`# /// script` / `requires-python = ">=3.10"`),
invoked via `uv run "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.py"` from `ocx/.claude/settings.json`:

| Event | Matcher | Script(s) |
|---|---|---|
| `SessionStart` | `startup\|resume` | `session_start_loader.py` (identical in both repos) |
| `PreToolUse` | `Write\|Edit\|MultiEdit` | `pre_tool_use_validator.py` (identical) |
| `PreToolUse` | `Bash` | `pre_commit_verification.py`, `conventional_commit_validator.py`, `pre_push_main_blocker.py` (all 3 forked/diverged) |
| `PostToolUse` | `Edit\|MultiEdit\|Write` | `post_tool_use_tracker.py` (forked/diverged) |
| `Stop` | — | `stop_validator.py` (identical) |
| `SubagentStop` | — | `subagent_stop_logger.py` (forked/diverged) |
| `UserPromptSubmit` | — | `user_prompt_router.py` (identical) |

`hook_utils.py` is a shared (but independently forked, not identical) utility module imported
by the others, not bound to an event itself.

**File identity**: 4 of 10 scripts are byte-identical between `ocx` and `grimoire`
(`user_prompt_router.py`, `session_start_loader.py`, `pre_tool_use_validator.py`,
`stop_validator.py`); the other 6 have diverged (`conventional_commit_validator.py`,
`post_tool_use_tracker.py`, `pre_commit_verification.py`, `hook_utils.py`,
`pre_push_main_blocker.py`, `subagent_stop_logger.py`) — these are forks, not a synced copy,
confirmed via `diff -q`.

**Python-convention enforcement**: exactly one hook touches Python conventions —
`pre_commit_verification.py` (`ocx:133-147`, `grimoire:99-113`) — and it is detection, not
enforcement: it greps `pyproject.toml` text for the literal substrings `ruff`, `pytest`,
`mypy` to build a list of tools the agent must claim to have verified before allowing a Bash
`git commit`. It never runs ruff/pytest itself, and does not recognize `pyright` (see §2). No
hook lints, formats, or type-checks Python; the actual enforcement is delegated entirely to
`task lint`/`task test`/`task types` invoked by the agent, gated only by this text-presence
nudge.
