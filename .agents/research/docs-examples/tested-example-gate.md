---
title: Tested examples — what makes a documented command a test
topic: tested-example-gate
group: docs-examples
agent: docs-examples-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 16
scope: >
  What makes a documented shell/Python/Rust example an automated test, the
  binding convention between a doc page and the test that proves it, how a
  deliberately non-runnable snippet is marked, the equivalence claim between
  tested and displayed values, and failure ergonomics. Does NOT cover: the
  recording/cast layer (asciinema format, player, a11y, opt-in policy — owned
  by `recording-layer-and-interactivity`), reference-page structural drift
  tests (already covered fleet-wide, cited by pointer only), or non-example
  page-type contracts.
---

# Tested examples — what makes a documented command a test

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Two independent mechanisms, not one pattern](#1-two-independent-mechanisms-not-one-pattern)
  2. [Binding: declared metadata beats path-mirroring](#2-binding-declared-metadata-beats-path-mirroring)
  3. [Tiering and marking: what runs, what's checked, what's exempt](#3-tiering-and-marking-what-runs-whats-checked-whats-exempt)
  4. [The per-language mechanism landscape](#4-the-per-language-mechanism-landscape)
  5. [Equivalence is canonical, not byte-identical](#5-equivalence-is-canonical-not-byte-identical)
  6. [Failure ergonomics](#6-failure-ergonomics)
  7. [Cost, and the smallest adoptable version](#7-cost-and-the-smallest-adoptable-version)
  8. [A verified tooling gotcha: Sybil's own docs disagree with its code](#8-a-verified-tooling-gotcha-sybils-own-docs-disagree-with-its-code)
  9. [The corpus reality the marking convention must survive](#9-the-corpus-reality-the-marking-convention-must-survive)
  10. [Grimoire's mdBook site has no Rust content — the Rust mechanism doesn't apply to it](#10-grimoires-mdbook-site-has-no-rust-content--the-rust-mechanism-doesnt-apply-to-it)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A documented example is "tested" only when an automated run of it fails CI the moment it stops matching reality — recording a video of it running is a separate, optional concern, not the gate itself.
- Bind a doc page to its backing test with a declared slug/key in the test's own header, never by mirroring the test-tree's directory path into the doc-tree — path-mirroring breaks the moment either tree is reorganized.
- A failing example test must name the doc page slug and a human title in its failure message, not just the test file and line — otherwise every failure needs a manual reverse-map from test to page.
- Never promise "the page shows exactly what was tested" as byte-identity when a harness must vary inputs for parallel isolation — state the canonicalization step instead, or the claim is false.
- Pick the test mechanism by what the example actually exercises, not by language reflex: a call into your own project's language runtime belongs on that language's native doctest tool (Sybil for Python, `cargo test --doc`/`mdbook test` for Rust); a black-box CLI/product command with real network or registry side effects needs a custom acceptance-test harness because no doctest tool models that.
- Every fenced block that claims to be runnable needs a declared tier: runs for real, compiles/parses only, or is explicitly marked non-runnable with a reason — an untagged fence is invisible to any of these, not a fourth safe category.
- A deliberately non-runnable or historical snippet (documenting a *removed* command, for instance) needs a machine-readable, paired open/close marker naming why — a silent exemption is indistinguishable from an oversight.
- Sybil (Python) is a mainstream, zero-recorder, zero-registry way to get tested doc examples — a project should reach for it (or `cargo test --doc`/`mdbook test` for Rust) before building bespoke acceptance-test infrastructure.
- A custom acceptance-script harness the size of ocx's (7,925 lines behind 66 scripts) is the ceiling, not the floor — a small project's version is one script that globs the doc-example tree and runs each file as a subprocess test, no recorder, no isolation-prefix scheme, no registry.
- Sybil's own documentation describes its `patterns`/`pattern` arguments as `fnmatch.fnmatch`-style, but the shipped code (`Sybil.should_parse`) calls `pathlib.Path.match()`, whose `**` acts like a non-recursive `*` — a pattern like `docs/**/*.md` silently misses anything nested two or more directories under `docs/`; verify against the actual source, not the docstring.
- `mdbook test` (and the `cargo test --doc` it wraps) is Rust-only by design — non-Rust fences are skipped outright, so it cannot become a project's only tested-examples mechanism in a polyglot repo.
- Grimoire, the fleet's one mdBook site, ships zero Rust code fences in its own docs (all `sh`/`toml`/`yaml`/`json`/`console`) — the Rust-native doctest mechanism has no surface to apply to there; its actual gap is the same shell/CLI-acceptance-test shape as ocx's, not a doctest gap.
- 343 of the fleet's 3,065 fenced blocks carry no language tag at all, and only 61 of 1,470 shell/bash/console blocks (4.2%) use a `$`/`>` prompt convention — any marking or tiering rule has to be phased in (new/touched fences enforced, existing ones flagged) or it fails on day one across the whole corpus.
- Runme is a real third option — the markdown file itself becomes the executable unit (a notebook-like cell model, its own CLI and GitHub Action, no separate script tree) — but it commits a project to a different reading experience than any of the fleet's 9 static-generated sites use today; name it as a considered alternative for a runbook-shaped page, not the default pattern.
- A structural (non-executing) drift test belongs on enumerative reference pages instead of per-command execution — already covered fleet-wide with a runnable check on both sides (`test_doc_command_reference.py`, `client_target.rs`); cited here by pointer only, it is not re-derived as new guidance in this file.
- The frame's "tested examples as real asciicasts" hypothesis conflates two separable things: the acceptance-test gate (load-bearing, required) and the recorded replay (optional, additive, a separate concern owned by `recording-layer-and-interactivity`).

## Findings

### 1. Two independent mechanisms, not one pattern

The fleet has exactly two real, independent tested-documentation mechanisms, not a single pattern with variants. ocx binds 66 acceptance-tested `.sh` scripts under `test/doc_scripts/*.sh` to website pages via a header slug, collected by `test/src/doc_scripts.py` and run inside `task verify` regardless of whether the website is ever built — confirmed directly against the repo: 66 files, of which 35 declare `# cast: true` (`ocx/test/doc_scripts/*.sh`, verified with `ls | wc -l` and `grep -l`). Separately and without coordination, `ocx-sdk-python` wires **Sybil** (pinned `sybil>=9`, current stable **10.1.0** as of this research — [Sybil docs](https://sybil.readthedocs.io/en/latest/)) into `conftest.py` to run every fenced code block in `docs/**/*.md` and `README.md`, plus every docstring `Example:` section, as real pytest items — verified by reading `ocx-sdk-python/conftest.py:1-90` directly. Neither mechanism cites the other; each was built to solve the same problem for a different kind of artifact (a CLI binary with registry side effects, versus a pure Python library).

The portable shape, per [tested-examples-mechanism.md](../docs-audit/tested-examples-mechanism.md)'s own pattern/instance table (its final section), decomposes as: doc examples are acceptance tests; the recording is a separate, non-gating layer; the page binds to the test by declared metadata, not directory layout; drift failure names the doc page; historical mentions get an annotated exemption; tested-vs-displayed equivalence is proven, not assumed; one executor wraps old test infra instead of duplicating it; a structural check complements the executing one for enumerative pages. Everything below expands the load-bearing rows of that table with independently verified detail, and does not re-derive rows already covered elsewhere.

### 2. Binding: declared metadata beats path-mirroring

ocx's ADR scored two binding options and rejected the more obvious one. Option D1 (a slug declared in the script's own header, e.g. `# doc: getting-started/install`, decoupled from any file path) scored 4.45/5; Option D2 (mirror the test directory layout under the website's script-publish directory) scored 2.15/5, explicitly because it "violates tenet #2" — website paths would encode the test tree — and because it makes every test-tree refactor break every citing doc page (reversibility scored 1/5) (cited via [tested-examples-mechanism.md](../docs-audit/tested-examples-mechanism.md) §4, confirmed against `ocx/test/src/doc_scripts.py:78`, where `SLUG_RE = re.compile(r"^[a-z0-9]+(?:[-/][a-z0-9]+)*$")` validates the slug as a hard parse error on violation). Verified directly: all 66 published scripts under `website/src/_scripts/**` are named only by their `# doc:` slug, with zero orphans — the count of published scripts (66) equals the count of doc scripts, and both the 35-cast/31-transcluded split fully accounts for every website embed.

The generalizable rule: **the only contract between a test tree and a doc tree should be a declared key, not a shared path**. Either tree can then be reorganized independently, which is the entire reason the more "obvious" mirroring option lost.

### 3. Tiering and marking: what runs, what's checked, what's exempt

ocx-sdk-python's `conftest.py` declares four fence-language tiers, each a distinct Sybil parser matched by exact fence language (verified directly, `ocx-sdk-python/conftest.py:63-76`):

| Fence language | Behavior | Gate |
|---|---|---|
| ` ```python ` | Runs unconditionally | none (unit tier) |
| ` ```python-contract ` | Runs against a live, pinned `ocx` binary | skipped unless `OCX_SDK_CONTRACT=1` |
| ` ```python-acceptance ` | Runs against the full compose stack | skipped unless `OCX_SDK_ACCEPTANCE=1` |
| ` ```python-no-run ` | Compile-checked only (`ast.parse`), for snippets referencing unreachable infrastructure | never executed, always parsed |

A `>>>`-prefixed doctest-style example inside a docstring's `Example:` section still runs for real via Sybil's own `DocTestParser` — deliberately not stdlib `doctest --doctest-modules`, because that "would double-collect the same blocks" (verbatim from the module docstring, `ocx-sdk-python/conftest.py:26-28`). A `python` fence inside a *source docstring* (as opposed to a `docs/` page) gets a narrower net: it is illustrative API-doc content, so it is compile-checked only, never executed against a real binary (`ocx-sdk-python/conftest.py:71-76`) — a deliberate, reviewed decision (cited "WP09 review decision" in the same comment), not an oversight.

ocx's own marking convention for a *historical* mention — prose that names a command that has since been removed — is a paired, reason-bearing HTML-comment marker, confirmed directly in the repo:

```md
<!-- moved-command-ok: this section documents the removal; the bare forms are the subject, not an instruction -->
... (prose naming ocx shell hook/init/env, ocx self update, etc.) ...
<!-- /moved-command-ok -->
```

(`ocx/website/src/docs/user-guide.md:1182,1205`). This is the shape to generalize: **a marker names *why* a fence or a passage is exempt, and it is paired (open/close), not a single unqualified flag** — a bare `<!-- untested -->` with no reason is a strictly weaker version of the same idea and should not be the target shape.

The example, side by side:

```md
<!-- BAD: a bare exemption, no reason, unpaired -->
<!-- untested -->
ocx self update
```

```md
<!-- GOOD: paired, reason-bearing -->
<!-- moved-command-ok: this section documents the removal; the bare form is the subject, not an instruction -->
ocx self update
<!-- /moved-command-ok -->
```

### 4. The per-language mechanism landscape

The fleet is Rust (ocx's binary, grimoire, grimoire-indexer), Python (ocx-sdk-python, ocx-indexbot), TypeScript (kate-middlechild, ocx's website itself), and shell/CLI (every project's actual commands). Confirmed per-language mechanisms and their gaps:

| Language / surface | Native mechanism | Fleet instance | Verified detail |
|---|---|---|---|
| Shell / CLI commands with real side effects | A custom acceptance-script harness: each command is a script, run as a subprocess/PTY test, bound to a page by declared metadata | ocx: 66 `.sh` scripts, `test_doc_scripts.py` | Needed precisely because no mainstream doctest tool models a real OCI registry push or PTY interaction |
| Python (library calls, docstrings) | **Sybil** ≥9 — `PythonCodeBlockParser`, `DocTestParser`, `CodeBlockParser(language, evaluator)` per fence language | ocx-sdk-python `conftest.py` | Confirmed against [Sybil's markdown-parser docs](https://sybil.readthedocs.io/en/latest/markdown.html) and the [Sybil overview](https://sybil.readthedocs.io/en/latest/) (current 10.1.0) |
| Rust (doc comments) | `cargo test --doc`, driven by rustdoc attributes: `ignore`, `ignore (reason)`, `should_panic`, `no_run`, `compile_fail`, `edition20{15,18,21,24}`, `standalone_crate`, `ignore-{target}`, `test_harness` | none of the fleet's Rust projects wire this into their **docs site** content (see §10) | Confirmed against the [rustdoc documentation-tests page](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html); lines starting with `#` are hidden from rendered output but compiled and run |
| Rust code embedded in an **mdBook** book | `mdbook test -L <deps-dir>` (wraps rustdoc) | grimoire (the fleet's one mdBook site) has **zero** `` ```rust `` fences in `docs/` — inapplicable, not unwired (see §10) | Confirmed against the [mdBook `test` command docs](https://rust-lang.github.io/mdBook/cli/test.html): "at the moment, only Rust tests are supported" — every other fence language is skipped outright |
| Elixir (pattern reference only — no fleet repo is Elixir) | `ExUnit.DocTest`'s `doctest(Module)` macro runs `iex>`-prefixed examples from `@doc`/`@moduledoc` | none | Confirmed against [`ExUnit.DocTest` docs](https://ex-unit.hexdocs.pm/ExUnit.DocTest.html): explicitly warns doctests are unsuitable when an example has side effects ("doctest will not try to capture the output"), and examples run with **no sandboxing** — any module a doctest defines lingers for the rest of the suite |
| Any language, polyglot, "the doc file itself executes" | [Runme](https://runme.dev) — cell-based execution of Shell/JS/TS/Lua/Perl/Python/Ruby fences via its own CLI and a GitHub Action, no separate script tree | none in the fleet | A genuinely different paradigm, not a variant of either mechanism above — see [§Contested](#contested--evolving) |

TypeScript has **no** native-doctest or acceptance-test mechanism anywhere in the fleet; it is the load-bearing gap the "deliverable must decide" list implicitly calls out and this research did not find prior art for inside the corpus. The nearest transferable shape is the same one ocx uses for shell: a script per example, run as a real `ts-node`/`tsx` (or built-and-run) subprocess test, bound to its page by the same declared-slug convention — there is no mainstream TS-native doctest runner equivalent to Sybil or rustdoc's doctests as of this research (era: September 2026).

### 5. Equivalence is canonical, not byte-identical

ocx's drift gate runs the **raw** script body under a parallel-isolation-prefixed environment (`$PKG_*` values shaped `t_<8hex>_<repo>`), not the clean values the website displays. The guarantee implemented is "`declared == canonical(provisioned)`" — the SP7 isolation prefix is stripped before comparison — not byte-identity (`ocx/test/src/doc_scripts.py:469-476,550-616`, cross-checked at `state_providers.py:100,232`, cited via [tested-examples-mechanism.md](../docs-audit/tested-examples-mechanism.md) §3, EX10/DE6). This is a 2026-05-18 addendum that post-dates the original ADR's decision list — the mechanism is under active maintenance, not frozen at its initial design.

The consequence for any shipped rule: **"the page shows exactly what was tested" is false as a literal claim** wherever a harness must vary any input for isolation (parallel test IDs, temp paths, per-run credentials). The honest claim is "the page shows a canonical form of what was tested, modulo a documented, mechanical substitution" — and a rule that omits the canonicalization clause will be contradicted by its own worked example the first time someone checks.

### 6. Failure ergonomics

A failing doc-script test names the script path, the `# title` header value, and — when `# doc:` is present — the slug, so CI output maps a failure directly to a website page without anyone opening the script first (`design_spec_doc_command_scripts.md:249-263`, implemented; cited via [tested-examples-mechanism.md](../docs-audit/tested-examples-mechanism.md) §3, DG1-DG3). This is cheap relative to everything else in the mechanism and is the detail that keeps it usable once a project reaches dozens of examples — at 66 scripts, a bare pytest traceback naming only a file and line number would already cost real reviewer time per failure.

### 7. Cost, and the smallest adoptable version

The full ocx mechanism costs 7,925 lines of test/support Python behind 66 scripts (`wc -l` on the seven `test_doc_scripts*`/`test_doc_binding.py` modules, confirmed in [tested-examples-mechanism.md](../docs-audit/tested-examples-mechanism.md), "Counts" table) plus a registry container and, for 3-4 signing-flow scripts, a six-container Sigstore stack (`registry:2`, `dexidp/dex:v2.45.1`, `sigstore/fulcio:v1.8.8`, `sigstore/rekor-server:v1.4.2`, two Trillian processes, a Tesseract CT log). None of that scale is inherent to the *pattern* — it is inherent to testing a CLI with real OCI-registry and signing side effects at 66 commands. A team adopting the pattern without ocx's scope should expect something far smaller: one test file that globs a doc-example directory, runs each file as a subprocess (or, for a pure library, hands it to Sybil/`cargo test --doc` instead of writing a harness at all), and asserts exit code plus any declared `# expect:` fixture. Citing the line count here is itself useful: a rule that reads as "build a 7,900-line system" would misrepresent the pattern's actual floor.

### 8. A verified tooling gotcha: Sybil's own docs disagree with its code

Sybil's `Sybil.__init__` docstring describes `pattern`/`patterns` as "An optional [pattern](fnmatch.fnmatch)" — pointing readers at `fnmatch.fnmatch` semantics (confirmed by reading `src/sybil/sybil.py` directly via the GitHub API, [simplistix/sybil](https://github.com/simplistix/sybil), `main` branch). The actual matching method, `should_parse`, does this instead:

```python
def should_parse(self, path: Path) -> bool:
    ...
    if any(path.match(p) for p in self.patterns):
        include = True
```

`path.match()` is `pathlib.PurePath.match()`, not `fnmatch`. Per the [Python 3 `pathlib` docs](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.match), `PurePath.match()` explicitly states "the recursive wildcard `**` isn't supported (it acts like non-recursive `*`)" and matching a relative pattern "is done from the right." Concretely: a pattern of `"docs/**/*.md"` only matches paths with **exactly one** directory segment between `docs/` and the filename (e.g. `docs/guide/foo.md`), and silently fails to match anything nested one level deeper (`docs/guide/concepts/foo.md`) — confirmed against the official pathlib semantics, not inferred. ocx-sdk-python's own `conftest.py` already documents this exact gotcha and works around it by using a prefix-free pattern, `"**/*.md"`, scoped safely only because pytest already restricts collection to `testpaths` (`ocx-sdk-python/conftest.py:78-87`, confirmed by direct read). Anyone adopting Sybil for a docs tree with more than one level of nesting under `docs/` needs to know this before writing their first `patterns=[...]` argument, and cannot get it from Sybil's own docstring.

### 9. The corpus reality the marking convention must survive

Fleet-wide, 343 of 3,065 fenced code blocks carry no language tag, and of 1,470 shell/bash/console blocks only 61 (4.2%) open with a `$` or `>` prompt character (`docs-shape.md` §6, cited by pointer — [docs-shape.md](../docs-audit/docs-shape.md)). Any tiering or marking rule proposed here has to be phased, not retroactively mandatory on day one: enforce the declared-tier requirement on new and touched fences, and treat the existing untagged/unmarked backlog as a tracked warning, the same phased-rollout shape the plain-English lint rules in this program need for the same reason (that rollout mechanism itself is owned by a sibling topic; noted here only because it is a precondition for this rule to ship without blocking every open PR).

### 10. Grimoire's mdBook site has no Rust content — the Rust mechanism doesn't apply to it

Direct read of the repo (`grimoire/docs/`, `grimoire/docs/book.toml`): grimoire is the fleet's one mdBook site, and its fenced blocks are 65 `sh`, 46 `toml`, 27 `yaml`, 25 `json`, 23 `console`, 9 `text`, 2 `powershell`, 2 `markdown`, 2 `jsonc` — **zero** `` ```rust `` blocks. `mdbook test` and `cargo test --doc` are Rust-only by the tool's own design (confirmed, [mdBook docs](https://rust-lang.github.io/mdBook/cli/test.html)), so they have no applicable surface in grimoire's actual docs content regardless of whether the taskfile wires them in — grimoire's `taskfiles/docs.taskfile.yml` runs only `mdbook build`/`mdbook serve`, and no `mdbook test` invocation exists in its CI (`grimoire/.github/workflows/docs.yml`, confirmed by direct grep). This sharpens a fleet-wide finding rather than contradicting it: grimoire's real tested-examples gap is shell/CLI-shaped — the same shape as ocx's problem — not a missing-doctest-wiring gap. A rule that tells every Rust project to "just wire `mdbook test`" would be a non-answer for the one mdBook site this fleet actually has.

## Normative guidance candidates

1. **Every fenced example that claims to demonstrate a real, runnable command or API call must be backed by exactly one automated test that fails when the example goes stale.** Rationale: prevents a documented command silently drifting from the tool it describes — the exact failure mode ocx's own `command-line.md` audit (a sibling topic) found nowhere else in the fleet checks. Verify: a CI job whose failure blocks merge, independent of any docs-site build (`task verify` / `test:parallel` in ocx; the equivalent for any adopting project is "the doc-example suite runs in the same required gate as unit tests"). Evidence: **measured** (66/66 ocx scripts wired this way, confirmed by direct repo read).

2. **Bind a doc page to its backing test with a declared key inside the test's own header (e.g. a `doc:`/`slug:` field), never by mirroring the test-tree's file path into the doc-tree.** Rationale: path-mirroring makes every test-tree refactor break every citing doc page; a declared key lets either tree reorganize independently. Verify: grep every test file under the doc-example directory for the declared key field, and separately grep every doc page for a reference to that same key — flag any test with no citing page (orphaned test) or any doc page whose example has no matching key (untested example). Evidence: **measured** (ADR-scored: declared-slug binding 4.45/5 vs. path-mirroring 2.15/5, `tested-examples-mechanism.md` §4).

3. **Every fenced block that is not prose-illustrative must declare which of three tiers it belongs to: runs for real, is compile/parse-checked only, or is explicitly marked non-runnable with a stated reason.** Rationale: an untagged fence is invisible to any drift check, which is exactly how 343 of the fleet's 3,065 blocks currently sit — neither passing nor failing anything. Verify: a lint that requires every fence matching a code-language whitelist (`sh`, `python`, `rust`, `ts`, etc.) to carry one of a fixed set of tier-suffixed languages (mirroring Sybil's `python`/`python-contract`/`python-acceptance`/`python-no-run` model) or sit inside a paired non-runnable marker. Evidence: **codified** (Sybil's four-tier scheme, confirmed by direct read of `ocx-sdk-python/conftest.py:63-76`).

4. **A deliberately non-runnable or historical snippet must carry a paired, reason-bearing marker — not a bare "skip" flag.** Rationale: a marker with no reason is indistinguishable, on a later re-read, from an oversight that should have been caught; a reason lets a reviewer confirm the exemption is still valid. Verify: grep for the marker's open tag and require it to carry `: <reason text>`, and require a matching close tag before the next such marker or end of file. Evidence: **codified** (ocx's `<!-- moved-command-ok: ... --> ... <!-- /moved-command-ok -->` pair, confirmed at `ocx/website/src/docs/user-guide.md:1182,1205`).

5. **A failing example test's message must name the doc page (title and/or slug), not only the test file and line.** Rationale: without this, every CI failure costs a manual reverse-map from an anonymous test id to the page a reader would see broken; at dozens of examples this cost compounds. Verify: read the test framework's failure-formatting hook/fixture and confirm it interpolates a page identifier drawn from the same declared key used for binding (rule 2), not just the file path pytest/cargo already prints. Evidence: **codified** (ocx's DG1-DG3 failure-message requirement, `design_spec_doc_command_scripts.md:249-263`, implemented).

6. **Never state or imply that a documented example is byte-identical to what the test executed, when the test harness varies any input for isolation.** Rationale: a rule that promises literal identity is falsified by its own reference implementation the moment someone checks a parallel-safe test run — as ocx's own EX10/DE6 addendum shows. Verify: search any doc-authoring guidance for the words "exactly"/"identical"/"verbatim" applied to a rendered command or output block; each hit must be paired with a stated canonicalization rule (what gets substituted and why) or must be removed. Evidence: **argued from a confirmed instance** (EX10/DE6, `ocx/test/src/doc_scripts.py:469-476,550-616`).

7. **Pick the test mechanism by what the example exercises, not by project language:** a call into the project's own already-testable language runtime belongs on that language's native doctest tool; a black-box CLI/product command with real external side effects (network, registry, a PTY) needs a custom acceptance-test harness, because no mainstream doctest tool models that. Rationale: resolves the frame's shell-script-vs-doctest-runner conflict by decomposition instead of picking a universal winner (see [Contested](#contested--evolving)). Verify: for each documented example, ask "does running this only need the project's own compiler/interpreter, or does it need a real external system?" — a "no external system" answer that still uses a custom harness is a build-something-unnecessary flag. Evidence: **argued**, grounded in two confirmed fleet instances (ocx's registry-side-effect commands vs. ocx-sdk-python's pure-library calls).

8. **Recommend the mainstream tool by language, by default, before any custom harness is proposed: Sybil (≥9) for Python doc/docstring examples, `cargo test --doc` for Rust doc comments, `mdbook test -L <deps>` for Rust examples embedded in an mdBook book.** Rationale: all three exist, are maintained, and need zero bespoke recorder/registry/sanitizer infrastructure — the custom-harness cost (finding 7) is only justified once a language-native tool is confirmed inapplicable. Verify: before a new test/support module is added for doc-example testing, grep the project's own dependency manifest and docs build tool for whether a native doctest runner is already present or trivially addable. Evidence: **normative**, grounded in three confirmed, independently-maintained tools ([Sybil](https://sybil.readthedocs.io/en/latest/), [rustdoc doctests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html), [mdBook test](https://rust-lang.github.io/mdBook/cli/test.html)).

9. **Before writing a glob pattern to select doc files for any tool, confirm the tool's actual glob semantics against its source, not its docstring or README.** Rationale: Sybil's own docstring says `fnmatch.fnmatch`; its code calls `pathlib.Path.match()`, whose `**` is non-recursive — a pattern like `"docs/**/*.md"` silently drops anything nested more than one level under `docs/`, an error with no warning and no test failure, just missing coverage. Verify: for any tool whose docs mention glob/pattern matching, write one path two-plus levels deep and confirm the tool actually collects it, rather than trusting the stated semantics. Evidence: **asserted, independently verified against primary source** (`src/sybil/sybil.py::should_parse`, cross-checked against the [Python `pathlib.PurePath.match` docs](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.match)).

10. **A recording/replay of a tested example is a separate, optional, non-gating layer — never the thing that makes the example "tested."** Rationale: the frame's "tested examples as real asciicasts" hypothesis bundles two independent concerns; 31 of ocx's own 66 doc scripts (47%) ship with no recording at all and are still gated, proving the recording is not load-bearing for correctness. Verify: confirm the doc-example test suite passes/fails identically whether or not any recording step runs — if disabling the recorder changes the required-checks result, the two are wrongly coupled. Evidence: **measured** (`tested-examples-mechanism.md` §5-6; 35 of 66 scripts opt into a cast, all 66 are gated regardless). Ownership note: the recording layer itself (format, player, accessibility, opt-in policy) is out of scope here — see `recording-layer-and-interactivity`.

11. **Size the doc-example test infrastructure to what the examples actually exercise, and say so out loud in the shipped guidance.** Rationale: citing a bespoke system's full scale (7,925 lines, a 6-container Sigstore stack) without qualification reads as "build this much," which is wrong for the common case of a handful of CLI commands or a pure library. Verify: a reading heuristic — any shipped example/checklist in the rule set should show a minimal single-file harness alongside, or explicit language, stating that the floor is much smaller than the cited worked example. Evidence: **argued** (the audit's own "not portable as designed" caveat, `tested-examples-mechanism.md`, final sections).

12. **Roll out tiering/marking enforcement on new and touched fences first; treat the existing untagged/unmarked backlog as a tracked warning, not a day-one blocking failure.** Rationale: 343 of 3,065 fenced blocks fleet-wide are untagged and only 4.2% of shell blocks use a prompt convention — a rule requiring universal compliance immediately would fail on its first run across nearly every repo in the fleet. Verify: the lint config supports (and the shipped rule states) a `warn`-then-`error` or added-lines-only mode; a repo adopting the rule for the first time should see warnings on existing content and hard failures only on diffs. Evidence: **measured** (`docs-shape.md` §6 counts, cited by pointer).

13. **A generic "documented command exists somewhere in prose with no matching test" check should ship as a heuristic lead-generator, not a hard gate, until its false-positive rate is measured on the adopting project.** Rationale: ocx's own attempt at this (a 3-word-signature grep against script bodies) flagged 20 mentions in `user-guide.md`, of which 11 were legitimate historical mentions inside an annotated marker — a ~55% false-positive rate on one real page, by the audit's own admission ("a lead list, not a finding"). Verify: run the heuristic against the paired-marker convention (rule 4) first to strip known-exempt hits, then hand-check the remainder before treating any hit as an actionable defect. Evidence: **measured, with an admitted caveat** (`tested-examples-mechanism.md`, "Counts" table final row and its caveat paragraph).

## AI-agent angle

- **Hallucinating command output or flag names without ever running the command.** An LLM asked to write a "getting started" example will produce plausible-looking but unverified output. Smallest check: the gate itself — rule 1 above; nothing short of an actual execution catches this reliably, because the prose reads as confident either way.
- **Leaving a fence untagged, or tagging everything as runnable regardless of whether it can run.** Both are default LLM behaviors under time/context pressure: no tag is the path of least resistance, and a blanket "python" tag is the path of least *thought*. Smallest check: `markdownlint` [MD040](https://github.com/DavidAnson/markdownlint/blob/main/doc/md040.md) (fenced-code-language required) plus the tier-declaration lint from rule 3 — MD040 alone would still pass an over-broadly-tagged block that can't actually run.
- **Silently "fixing" a mention of a removed command instead of annotating it as historical.** An LLM revising a migration section under light instruction will often just delete the old command name rather than leave it under a marker, erasing genuinely useful "what changed" context, or leave it bare and trip a drift check that assumes every mention is current. Smallest check: grep for the paired marker (rule 4) around any prose that names a command absent from the current test/example tree.
- **Asserting byte-for-byte fidelity between a shown example and "what actually ran."** An LLM writing a testing-mechanism description characteristically overclaims precision ("this example shows exactly what was executed") because it reads as more rigorous, without knowing whether the underlying harness does any substitution. Smallest check: rule 6's grep for absolute-identity language paired with a canonicalization-clause requirement.
- **Reaching for a large bespoke test harness by default instead of the language's own doctest tool.** An LLM building "tested docs infrastructure" from scratch tends toward a general, novel solution (a custom script-execution framework) rather than checking whether Sybil, `cargo test --doc`, or `mdbook test` already solves the problem — the over-engineering failure mode this program's own persona actively resists. Smallest check: before approving new test/support code for doc examples, grep the project's dependency manifest and build config for an already-available native doctest mechanism (rule 8).
- **Mirroring the test-tree's directory layout into the doc-tree "for consistency."** Path-mirroring is the structurally "obvious" choice an LLM reaches for without being told the ADR already scored it 2.15/5 against a declared-key binding. Smallest check: grep for any doc-tree path that is a direct transform of a test-tree path (same segments, different root) — a hit means the binding is coupling two trees that should vary independently (rule 2).
- **Copying a cited worked example's scale (line count, container stack) as if it were the required floor.** An LLM summarizing "how ocx does it" will often present the full 7,925-line/6-container picture as the thing to build, because that is the concrete example available, without stating the much smaller floor a small project actually needs. Smallest check: a reading heuristic — any shipped rule citing a large worked example must pair it with an explicit smaller-floor statement (rule 11); its absence is the tell.

## Contested / evolving

**Named conflict: shell-script-plus-cast (ocx's ADR, and the frame's hypothesis 6) vs. a mainstream language-native doctest runner (ocx-sdk-python's Sybil).** Resolved, not by picking a winner but by decomposition: the two solve different problems and both are already present, unconflicted, in the same fleet.

- ocx's custom harness exists because its examples invoke a real CLI binary against real external systems (an OCI registry, occasionally a Sigstore signing stack) — no mainstream doctest tool models subprocess/PTY execution against live network side effects, so a bespoke acceptance-test layer is the only option once you need that.
- ocx-sdk-python's examples are calls into its *own* Python library — exactly what Sybil (or stdlib `doctest`) already tests without any bespoke infrastructure, and it does so with zero recorder, zero sanitizer, zero registry stack.
- The frame's hypothesis 6 ("tested examples embedded as real asciicasts are best practice") additionally conflates the *gate* (the acceptance test) with the *display* (the asciicast recording) as if they were one recommendation. ocx's own research doc already separates them explicitly, and 31 of ocx's own 66 doc scripts (47%) are gated with no recording at all — proof inside the same repo that the cast is not required for "tested."
- **Resolution for the shipped rule**: state the gate ("every documented command/example is backed by an automated test") as the one universal, load-bearing requirement; state the *mechanism* as chosen per what the example exercises (native doctest tool for a library call, custom harness for a black-box external-side-effect command); state the recording as an entirely separate, optional layer with its own topic. This is fully resolved by the fleet's own evidence — it does not need to remain an open question, and this file resolves it rather than deferring it.

**Not a named conflict, but flagged for a decision in the brief: is "the doc file itself executes" (Runme) a third option or a distraction?** Resolved as: a real, distinct third paradigm, but not the right default for this fleet, as of September 2026. Runme replaces the doc-file/test-file split entirely — a markdown file's own fences become the unit of execution, run via Runme's CLI or its GitHub Action, with no separate script tree to bind to a page at all. That is a genuinely different commitment (the docs site becomes a notebook-like surface) than any of the fleet's 9 static-generator sites currently make, and adopting it would mean re-authoring existing fences into Runme's cell model rather than layering a check over what exists. It is worth naming as the right tool for a project whose docs *are* runbooks end to end (creeptd-ng's two runbook-shaped pages, per [ux-observability-posture.md](../docs-audit/ux-observability-posture.md) §0, are the one candidate in this fleet that resembles that use case) — not as a replacement for the declared-slug-binding pattern this file recommends as the default.

**Genuinely still open, not resolved here**: TypeScript has no native-doctest equivalent to Sybil or rustdoc anywhere in the surveyed tooling as of this research. The nearest transferable shape (a subprocess-per-example script, bound by the same declared-key convention used for shell) is offered as a stopgap, not a settled recommendation — flag this explicitly in the shipped rule rather than implying a mature TS-native tool exists.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`docs-audit/tested-examples-mechanism.md`](../docs-audit/tested-examples-mechanism.md) | Internal file:line audit of ocx's tested-doc-examples mechanism | 2026-09-05 | The starting point named by the brief; every claim in it was spot-checked against the live repo in this research, not re-derived |
| [`docs-audit/docs-shape.md`](../docs-audit/docs-shape.md) | Internal fleet-wide docs corpus measurement | 2026-09-05 | Source of the fenced-block-language counts and the "mentions, not wiring" finding for non-ocx tested-docs tooling |
| `ocx/test/src/doc_scripts.py` (local repo, read directly) | The actual header-parser and drift-gate implementation | live repo, 2026-09 | Ground truth for `SLUG_RE`, `_RECOGNISED_KEYS`, and the EX5/EX9 parse-error conditions |
| `ocx/website/src/docs/user-guide.md` (local repo, read directly) | The page carrying the `moved-command-ok` marker | live repo, 2026-09 | Confirms the marker is paired (open/close) and reason-bearing, not a bare flag |
| `ocx-sdk-python/conftest.py` (local repo, read directly) | The Sybil wiring for doc/docstring examples | live repo, 2026-09 | Ground truth for the four fence-language tiers and the documented Sybil glob gotcha |
| `grimoire/docs/`, `grimoire/docs/book.toml`, `grimoire/.github/workflows/docs.yml` (local repo, read directly) | The fleet's one mdBook site's actual content and CI | live repo, 2026-09 | Establishes directly that grimoire has zero Rust fences and no `mdbook test` invocation — grounds finding 10 |
| [Sybil documentation — markdown parsers](https://sybil.readthedocs.io/en/latest/markdown.html) | Official tool docs | fetched 2026-09-05, current release 10.1.0 | Confirms `CodeBlockParser`/`PythonCodeBlockParser`/`DocTestParser` and the doctest-in-markdown support |
| [Sybil documentation — overview](https://sybil.readthedocs.io/en/latest/) | Official tool docs | fetched 2026-09-05, current release 10.1.0 | States Sybil's purpose and supported formats (ReST, Markdown, MyST) |
| [`simplistix/sybil` — `src/sybil/sybil.py`](https://github.com/simplistix/sybil/blob/main/src/sybil/sybil.py) | Primary source, the actual `Sybil` class | fetched 2026-09-05, `main` branch | Ground truth for `should_parse`'s use of `pathlib.Path.match()`, contradicting the docstring's `fnmatch.fnmatch` claim |
| [Python 3 docs — `pathlib.PurePath.match`](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.match) | Official language reference | current as of 3.13+ language docs, fetched 2026-09-05 | Confirms `**` acts as non-recursive `*` in `match()`, unlike `Path.glob()` — the basis for finding 8 |
| [mdBook — `mdbook test` CLI docs](https://rust-lang.github.io/mdBook/cli/test.html) | Official tool docs | fetched 2026-09-05 | Confirms Rust-only scope, the `-L`/`--library-path` dependency flag, and that other-language fences are skipped |
| [rustdoc — Documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html) | Official Rust tooling reference | fetched 2026-09-05 | Full attribute list (`ignore`, `no_run`, `should_panic`, `compile_fail`, `edition20xx`, `standalone_crate`, `ignore-{target}`, `test_harness`) and the hidden-`#`-line mechanic |
| [ExUnit.DocTest](https://ex-unit.hexdocs.pm/ExUnit.DocTest.html) | Official Elixir/ExUnit docs | fetched 2026-09-05 | Pattern-only reference per the brief (no fleet repo is Elixir); its named gotchas (no output capture, no sandboxing) are worth carrying into any doctest-adoption guidance regardless of language |
| [Runme](https://runme.dev) | Official tool site | fetched 2026-09-05 | Confirms the "markdown file itself executes" paradigm, its supported runtimes, and its CI/GitHub Action integration — grounds the Contested-section decision |
| [markdownlint — rule MD040](https://github.com/DavidAnson/markdownlint/blob/main/doc/md040.md) | Official lint-rule doc, a real repository | fetched 2026-09-05 | Confirms the zero-config, off-the-shelf check for "every fence has a declared language," a precondition this file's tiering rule builds on |
