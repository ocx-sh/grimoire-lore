---
title: "code-docs surfaces: text that renders from code"
topic: surfaces
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-surfaces/interface-leak.md
  - .agents/research/code-docs-surfaces/rendered-summary.md
  - .agents/research/code-docs-surfaces/interface-check.md
date: 2026-09-27
revised: 2026-09-27
---

# Surfaces: text that renders from code

Question: what keeps internal references out of rendered help, schemas and
hover, and what must a doc comment's rendered summary carry?

Paths are relative to the worktree root unless absolute. Fleet HEADs read on
2026-09-27: ocx `2691d3c16`, grimoire `7b180c40` (revision re-read at
`be3a7382`), grimoire-vscode `b4f7ca3`, ocx-sdk-python `9713f0a`, ocx-catalog
`a16be21`. Help screens were re-captured from the installed `ocx` 0.6.3 (69
screens, root plus two levels); interface-check rebuilt ocx and grimoire from
source and walked 73 and 36 screens. Numbers marked "re-measured" come from a
consolidation run (first pass or this revision) and use the census lexer
(`rules/code-docs/checks/comment_census.py`) or the commands shown.

## Verdict

1. **Audience defines interface text, not the generator.** Interface text is any doc comment or description string that a generator copies to a reader outside the repo: clap help, JSON Schema, MCP tool descriptions, argparse/commander help, and the public API docs of a published package. It carries the user contract and nothing else (SRF-01).
2. **The leak is wider than the ID families measured in wave 2, and it reaches every generator family the fleet ships.** Re-measured: ocx's golden schemas hold 519 banned tokens, and 320 of them are raw rustdoc intra-doc links, against 157 ID-family tokens. 4 of the 69 ocx help screens print maintainer rationale, and 2 of 73 print code syntax (a `.rs` filename, ``[`Self::execute`]``). 3 of grimoire's 36 help screens print `crate::` intra-doc links, and its built schemas carry 16 links. ocx-sdk-python's rendered reference carries 15 distinct `C-` IDs plus `C-S1-1`. `ocx-catalog ci --help` prints `(C-007)`. Clean today: grimoire's 5 MCP tools and their argument schemas, grimoire-indexer's 9 commander subcommands, grimoire-vscode's `package.json` descriptions. The wave's "`--help` is clean" and "grimoire is clean" hold only for the ID regex.
3. **The gate runs on the output, not the source.** It walks the generator's own model, as ocx already does for clap (`ocx:crates/ocx_cli/src/app.rs:737`). A source-side scan runs first as a cheaper complement. This reverses interface-leak's order. Its "0 bypasses" came from grepping two attribute spellings, but the fleet has 25 hand-written `description` literals in ocx, 25 `cfg_attr` derives in ocx-mirror that the classifier misses, grimoire's `#[tool(description = …)]` MCP strings, and a string-literal surface in every Python and TS repo (SRF-03). One scanner serves every generator; only the walk differs. It was watched red on a planted leak and green without it for schemars, Python docstrings and commander.
4. **Cleaning interface text moves rationale into `//` and never deletes it** (SRF-02). The leak cleanup is the edit where guards die: two guards already render into `--help` (ocx `package exec`, grimoire `login`/`logout`).
5. **DOC-16 and DOC-01 stop at interface items.** Intra-doc links render raw in clap and schemars output (320 in ocx). Interface summaries follow the generator's convention, which is imperative for clap per DOC-11. ocx already writes them that way.
6. **The jargon wordlist is dropped.** 144 of interface-leak's 145 schema "jargon" hits are product vocabulary: the ocx user docs use each flagged term 48 to 243 times. The mechanical tell for a leaked implementation detail is code syntax, and SRF-01 already bans it.
7. **The summary cap is a ratcheted SHOULD, not rendered-summary's MUST** (SRF-04). The damage lands on listing pages that humans browse and agents rarely open. Hover shows the whole block anyway, and the fix preserves content.
8. **Hover truncates nothing.** rust-analyzer, typescript-go and pyright render the whole doc block, and LSP 3.17 has no length field. No rule may argue from hover truncation.
9. **Cut as duplicate or without fleet evidence:** summary-override tags, a pydantic/zod-specific rule, and a module-doc presence rule (DOC-10 already covers presence). A module states its "why" once (SRF-05).
10. **The token set holds across every captured generator: 17 families, 1 false positive in 333 hits, now fixed.** interface-check read every hit in context on ocx and grimoire help, both repos' schemas, ocx-sdk-python's rendered reference and ocx-catalog's help. It reported 0 false. This revision found one: a Windows SID (`S-1-5-…`, `ocx:crates/ocx_schema/tests/golden/execution-record.json:213`) that a must-print-nothing gate would flag forever. The `S-` family now excludes a following `-digit`. `short2char` stays out: re-measured 4 false of 16 (25%: `V1`, `V3` schema versions, `C0` control codes).
11. **Documented gap: no shipped gate enforces SRF-01 on any fleet surface.** ocx's clap test checks 3 of SRF-01's 17 families (`adr_`, the `C-S` label, ISO dates). It passes a bare `(C-999)` and missed the 2 code-syntax screens. ocx's help has 0 ID hits because of how its authors write, not because the gate stops them. `ocx:crates/ocx_schema/tests/schema_outputs.rs` has 15 tests and none reads description text. grimoire, ocx-sdk-python and ocx-catalog have no leak test at all, and ocx-catalog's leak shipped past a CLI test that asserts nothing about help text.
12. **Cleaning ocx's schema `description` text is a named golden regeneration, not a contract break.** `ocx:crates/ocx_schema/tests/golden_schemas.rs:4-20` pins every schema byte-for-byte and requires the regenerating commit's subject to name the schema change. ocx's changelog is built from those subjects. The owner's contract scope (`ocx:.agents/discussions/ocx-interface-contract.md:29`, 2026-09-25) is report JSON, CLI grammar, exit codes, `error.detail` slugs and the error envelope, all structural, and never names description prose. The SRF-01 cleanup therefore ships as a regeneration with a named subject. This reopens only if ocx's planned SDK codegen copies `description` into generated doc comments, and that call belongs to the interface-contract discussion.
13. **Documented gaps in coverage, measured but unproven:** argparse (ocx-indexbot 41 sites, arcana 17) has no output capture and no planted proof; source `help=` strings hold 0 hits. ocx-mirror's schema content is unmeasured. rmcp's doc-comment fallback has 0 occurrences. pydantic and zod are absent from the fleet.

## The ruleset

Five rules, three of them MUST. SRF-01's mechanical families are LNK-01's
prefixed families (`C-`, `S-`, `WP-`, `DEC-`, `DX-`, `RUL-`, `A-`, `D-`,
`D-V`, `ADR-N`, all from the linkage consolidation) plus the `C-S` clause
label (`C-S1-1`), which `\bC-[0-9]` cannot match, plus record filenames, ISO
dates and Rust code syntax. `D-`, `D-V` and `ADR-N` hit 0 times on ocx's
goldens and on ocx-sdk-python's rendered reference (re-measured). The
`short2char` family (`D4`, `C7`) stays out of the mechanical check. Its false
positives (`H1`–`H6`, `V1`, `V3`, `C0`, `K8s`) ran at 25% on interface-check's
fresh corpus, so review catches the roughly 12 true short labels left in ocx's
rendered output.

### SRF-01: Interface text states the user contract only

- **Rule.** Keep every piece of interface text free of the following: plan or process IDs, record or plan filenames, source filenames, ISO dates, and, on raw-copy surfaces (every generator but a published package's API docs, whose renderer resolves cross-references into links), code paths (`Self::`, `crate::`, private function names) and rustdoc intra-doc link syntax. Interface text is any doc comment or description string that one of these generators copies to a reader outside the repo:
  - clap and schemars;
  - an MCP tool list, including a `#[tool]` function's `///` when its `description` is unset;
  - argparse or commander;
  - a published package's API-doc build.

  Record pointers belong in `//` comments or in a module doc that never renders outside the repo, as in `grimoire:src/mcp/tool_args.rs:4-10`.
- **Rationale.** No generator filters what it copies. clap's long help and schemars' `description` render the whole doc body, and schemars has no short/long split ([interface-leak §1](code-docs-surfaces/interface-leak.md#1-generator-mechanics-confirmed-from-source)). rmcp's `#[tool]` and commander's `.description()` copy verbatim too ([interface-check §4, §6](code-docs-surfaces/interface-check.md#4-rust-rmcpmcp-grimoire-has-five-tools-clean-ocx-has-none)). Without this rule, ocx's golden schemas ship 519 tokens that no user can resolve, ocx-sdk-python's public reference ships `(C-011)` and `C-S1-1`, and `ocx-catalog --help` ships `(C-007)`. Intra-doc links also tie the goldens to refactors: `golden_schemas.rs` notes that moving a type "necessarily changes any doc link naming it".
- **Verification.** Output side: this command must print nothing. On 2026-09-27 it prints 256 lines on ocx and 8 lines on grimoire's `docs/dist/schemas` (16 intra-doc links, 4 `Self::`). The ocx count matches the first pass by coincidence: the `C-S` family adds `reports.json:3578`, and the SID fix drops `execution-record.json:213`.

  ```
  rg -n -e '\bC-[0-9]{1,4}\b' -e '\bC-S[0-9]+(-[0-9]+)?\b' -e '\bRUL-[0-9]{1,3}\b' -e '\bA-[0-9]{1,3}\b' -e '\bS-[0-9]{1,3}([^0-9-]|$)' -e '\bWP-[0-9]{1,3}\b' -e '\bDX-[0-9]{1,3}\b' -e '\bDEC-[A-Za-z0-9]{1,6}\b' -e '\bD-V?[0-9]{1,3}\b' -e '\bADR-[0-9]{1,4}\b' -e '\badr_[A-Za-z0-9_.-]+' -e '\bplan_[A-Za-z0-9_.-]+' -e '\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b' -e '\b[a-z_][a-z0-9_]*\.rs[^/a-z0-9]' -e '\b[a-z_][a-z0-9_]*\.rs$' -e '\[`[A-Za-z_][A-Za-z0-9_:]*`\]' -e '\bSelf::' -e '\bcrate::' crates/ocx_schema/tests/golden
  ```

  The two `.rs` patterns exclude a following `/`. The naive `\.rs\b`, which interface-check §7 reprints in its final set, matches the `https://grimoire.rs/schemas/…` `$id` in all 4 grimoire schemas. Non-Rust surfaces drop the last five patterns and add their own language's code syntax. Negative fixtures: `S-1-5-18` (Windows SID), `V1`, `C0`, `grimoire.rs/`. A sentence of maintainer rationale needs a reading heuristic: "would a user of this flag or field need this sentence to use it?"
- **Severity.** MUST. Its 333 measured hits held 1 false positive, which the tuned `S-` family now drops.
- **Portability.** Portable. The code-syntax tells are Rust-specific; each adopter adds its own language's syntax.

### SRF-02: Relocate rationale out of interface text; never delete it

- **Rule.** When interface text holds maintainer rationale (a guard, why the implementation has its shape, what later code relies on), move it verbatim in the same edit. It goes to a `//` comment at the line it protects or directly above the item, and it is never deleted on the way out.
- **Rationale.** The SRF-01 cleanup touches about 200 ocx interface blocks, and some of those blocks are the only statement of a guard. Two such guards render into `--help` today, both confirmed in interface-check's fresh captures:
  - `ocx:crates/ocx_cli/src/command/exec.rs:90-95` renders into `ocx package exec --help` and explains why `.split_first().expect(...)` is sound. The consequence it guards (a runtime panic on an empty argv) exists nowhere else as a comment.
  - `grimoire:src/command/login.rs:64-69` and `logout.rs:28-33` render into `grim login --help`. They explain why the field is named `host`: renaming it to `registry` collides with the global `--registry` flag's clap id.

  Deleting either guard satisfies SRF-01 and destroys the guard.
- **Verification.** Run the command below, then read the output. Every removed `///` sentence that names a breaking edit or a consequence must have a matching added `//` line. The cleanup group's comment-only diff check must also pass.

  ```
  git diff -U0 -- crates/ocx_cli/src | rg -n -e '^-\s*///' -e '^\+\s*//[^/!]'
  ```
- **Severity.** MUST.
- **Portability.** Portable. A Python docs build with `show_source: true` (ocx-sdk-python) still prints the relocated `#` comment inside its source listing. That listing shows code as code and is outside SRF-01; SRF-03's scan excludes it.

### SRF-03: The leak check runs on rendered output, with the source scan as pre-build complement

- **Rule.** Each generated surface a repo ships has a test that walks the generator's own model and fails on SRF-01's tokens. One scanner holds the token list, and each generator gets its own walk:
  - clap, commander, argparse: every subcommand's help. That is the clap `Command` tree, `--help` run recursively, `program.commands`, or `format_help()`.
  - schemars: every emitted JSON Schema (goldens, or `grim schema --kind` output).
  - MCP: the tool list in-process. It must cover `description =` strings, the function-doc fallback, and `JsonSchema` argument structs.
  - Python published docs: load the package with griffe (mkdocstrings-python's own loader) under the docs build's `filters`, then scan every docstring, attribute docstrings included.

  A source-side scan of interface-tagged doc lines runs before the build.
- **Rationale.** A source scan of doc comments cannot see five kinds of rendered text. The first four were measured in the fleet on 2026-09-27:
  - hand-written `description` literals: 25 in manual `impl JsonSchema` in ocx, for example `ocx:crates/ocx_trust/src/lib.rs:343`;
  - `#[cfg_attr(feature = "jsonschema", derive(schemars::JsonSchema))]`: 25 in ocx-mirror, for example `ocx-mirror:crates/ocx_mirror_spec/src/dist.rs:62`, which `RUST_IFACE_RE` at `comment_census.py:106` does not match;
  - explicit MCP tool descriptions read by agents, in `grimoire:src/mcp/server.rs:60`;
  - Python and TS help strings: 58 argparse `add_argument` sites and 12 commander `.description(` calls, one of which is the live `ocx-catalog:src/cli/main.ts:37` `(C-007)` leak;
  - rmcp's fallback. Dropping `description =` from a `#[tool]` silently publishes the function's `///`. It has 0 occurrences today.

  The walk must match the renderer's model. `inspect.getdoc()` cannot see attribute docstrings, and 4 of them render on ocx-sdk-python's reference page. A grep over the built HTML double-counts: 14 of the 54 `C-` hits there sit in `show_source` listings.

  The existing clap test proves the shape but not the coverage. ocx's help has 0 ID hits, yet `marker()` (`ocx:crates/ocx_cli/src/app.rs:779-800`) checks no `C-`, `A-`, `RUL-` or `S-` ID, no `.rs` name, no `Self::`/`crate::`, and no intra-doc link.
- **Verification.**
  - The clap harness exists:

    ```
    rg -n -e 'fn cli_help_text_has_no_internal_references' crates/ocx_cli/src
    ```

    Its token set (`adr_`, `§`, `handshake`, `amended`, the `C-S` clause label, ISO dates, 8+ digit runs) must grow to SRF-01's list. Today a bare `(C-999)` passes it.
  - Schema half: add the same assertion to `crates/ocx_schema/tests/schema_outputs.rs`.
  - Planted-token run: put `(C-999)` into one rendered field's doc comment. Then `cargo test -p ocx_schema --test schema_outputs` and `cargo test -p ocx_cli cli_help_text_has_no_internal_references` must both fail. interface-check watched the shared scanner go red on `(C-999, adr_planted_fixture.md)` and green without it for a schemars struct, a Python module and a commander tree ([§8](code-docs-surfaces/interface-check.md#8-per-generator-output-side-test-proved-redgreen-on-a-planted-leak-one-per-language)).
  - grimoire gitignores its built schemas (`grimoire:.gitignore:102`), so its test scans `grim schema --kind` output for `config`, `publish`, `lock` and `mcp`, plus the rmcp tool list. Today the schemas give 8 lines and the tool list gives 0.
  - ocx-catalog: scan `--help` recursively, or export `buildProgram()` from `src/cli/main.ts` and walk `.commands`. It must fail at HEAD on `(C-007)`.
- **Severity.** MUST. Every generator has a cheap walk, and the one unguarded TS CLI already shipped a leak.
- **Portability.** Portable. The test templates are fleet-specific.

### SRF-04: One short summary paragraph, then a blank line

- **Rule.** A doc comment that runs past its first paragraph opens with a summary of one sentence, at most 200 rendered characters, followed by a blank doc line. On clap-rendered items, DOC-11's ~70-character short line applies instead.
- **Rationale.** rustdoc listings, clap `-h`, TypeDoc and Click split at the first blank line, and none of them truncate. A run-on paragraph therefore becomes the whole summary ([rendered-summary §1, §3](code-docs-surfaces/rendered-summary.md#3-five-rendering-surfaces-converge-on-one-split-point-the-first-blank-line)).

  | Repo | Doc blocks over 200 chars (re-measured) | Long blocks with no break |
  |---|---|---|
  | ocx | 924 of 8,569 | 3.7% |
  | grimoire | 595 of 3,756 | 10.3% |
  | grimoire-vscode | 364 of 756 | 93 of 196 |
- **Verification.**
  - Rust: this command must hit under `[workspace.lints.clippy]`:

    ```
    rg -n --glob 'Cargo.toml' -e 'too_long_first_doc_paragraph' .
    ```

    Existing debt ratchets per crate on the pattern of `ocx:scripts/lint_ratchet.py`. The lint is in clippy's `nursery` group, so it needs an explicit opt-in.
  - Other languages: a first-paragraph-length field in `comment_census.py --list-blocks --kind doc --format json`, which is still to be built. A prototype on the census lexer reproduced every rendered-summary number on 2026-09-27.
- **Severity.** SHOULD, with a ratchet so new debt fails.
- **Portability.** Fleet default the adopter may override. The 200 is clippy's number and has not been validated for Python or TS; the human references exceed it in 0.7–6.7% of blocks.

### SRF-05: A module's "why" lives once, in its module doc

- **Rule.** State why a module exists once, in its module doc. Item docs in the same file describe only their local mechanism and never repeat the module's pointer or ID.
- **Rationale.** Without this rule, the reason is restated at nearly every item. In `ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs`, the module doc is 129 lines, `C-050` appears 57 times, and 340 `///` lines carry a `C-` or `RUL-` ID. 9 of the 17 top-mass ocx files that have a module doc repeat its token between 2 and 208 times ([rendered-summary §8](code-docs-surfaces/rendered-summary.md#8-module-front-pages-ocxs-top-25-files-presence-and-per-function-repetition), re-measured). Module-doc presence is not part of this rule: DOC-10 covers Rust, and 8 of ocx's top 25 files lack one, for example `ocx:crates/ocx_config/src/env.rs`.
- **Verification.** This command must print nothing:

  ```
  FILE=crates/ocx_package_manager/src/tasks/render_toolchain.rs
  rg -o -e '\bC-[0-9]{1,4}\b' -e '\badr_[a-z_]+\.md\b' -e '\bplan_[a-z_]+\.md\b' "$FILE" | sort | uniq -c | awk '$1 > 1'
  ```
- **Severity.** SHOULD. It becomes MUST only after the eval confirms it (see [Decisions for the eval](#decisions-for-the-eval)).
- **Portability.** Portable.

### Amendments this ruleset forces

- **DOC-01** (third-person present, closing period) applies to non-interface doc text only. ocx's interface summaries are imperative or noun phrases: re-measured, 24 of 337 first words in `ocx_cli/src/command/` read as a third-person verb. clap strips the trailing period anyway (`remove_period` in the pinned `clap_derive/src/utils/doc_comments.rs`).
- **DOC-11** keeps its clap form constraints (short line of about 70 chars, ASCII) and cites SRF-01 for content.
- **DOC-16** (intra-doc links) excludes raw-copy interface items (clap, schemars, MCP). A published crate's rustdoc keeps them: rustdoc resolves them, so banning them there would cost the links DOC-16 exists for. There, name user-visible things (flags, keys, fields) in plain backticks.
- **`comment_census.py`**: `RUST_IFACE_RE` must match `cfg_attr(…, derive(…))`.
- **LNK-01 and LNK-04** add the `C-S` clause-label family. `C-S1-1` sits 3 times in `ocx-sdk-python:src/ocx_sdk/_results.py` (lines 82, 320, 331), and neither family list matches it. LNK-04's output-side command is a subset of SRF-01's and folds into SRF-03's shared scanner.
- **Retire** `code-docs-topic-map/tooling.md`'s claim that rustdoc drops an over-long summary. The rustdoc book documents no drop and no truncation ([rendered-summary §1](code-docs-surfaces/rendered-summary.md#1-rustdocs-own-summary-contract-no-drop-no-truncate--just-everything-before-the-blank-line)).

## Applied to the fleet

| Repo | Satisfies | Violates | New commitment |
|---|---|---|---|
| ocx | SRF-03 clap harness: `crates/ocx_cli/src/app.rs:737` walks the clap tree; 0 ID hits across 73 help screens (census §5, interface-check §2) and 69 re-captured | SRF-01: `crates/ocx_cli/src/api/data/shell_state.rs:289-296` renders as `crates/ocx_schema/tests/golden/reports.json:4573` (C-050 plus two intra-doc links); 519 tokens in golden schemas; `C-S1-1` at `reports.json:3578`; `package test --help` names `toolchain_exec.rs`. SRF-02: guard text at `crates/ocx_cli/src/command/exec.rs:90-95`, clap attribute syntax at `crates/ocx_cli/src/command/toolchain_exec.rs:121`, private fn names `pull_all`/`find_plain` at `crates/ocx_cli/src/command/pull.rs:31`, all in `--help`. SRF-03: `marker()` covers 3 of 17 families. SRF-04: 924 over 200 chars. SRF-05: `render_toolchain.rs`, C-050 ×57 | SRF-03: grow `marker()` to SRF-01's list; add a token assertion to `crates/ocx_schema/tests/schema_outputs.rs` (15 tests, none on content) |
| grimoire | SRF-01 ID families: 0 in 1,129 interface lines (interface-leak §4), 0 in fresh `grim schema` output; MCP: 0 hits in the 5 `#[tool]` descriptions and their `tool_args.rs` schemas; pointer placement at `src/mcp/tool_args.rs:4-10` and the `//` rationale at `:29-33` | SRF-01 intra-doc links: `src/config/declaration.rs:260` renders ``[`Self::oci`]`` into built `docs/dist/schemas/grimoire-config.schema.json:66`; 16 links across 4 built schemas; `crate::` links in `login`, `logout` and `fetch --help` (`src/command/login.rs:68`, `logout.rs:32`, `fetch.rs:39`). SRF-02: the `host` naming guard at `src/command/login.rs:64-69` renders in `--help`. SRF-04: 595 over 200 chars | SRF-03: a test over `grim schema --kind` output, clap help and the rmcp tool list (`src/mcp/server.rs:60`) |
| ocx-sdk-python | SRF-04: 0 of 457 over 200 chars, p90 71–73 | SRF-01: `src/ocx_sdk/_results.py:1570` (`SignatureReport`, "(C-011)", "(D11)") is exported at `src/ocx_sdk/__init__.py:288` and rendered by mkdocstrings (`docs/reference/api.md`, `::: ocx_sdk`); the rendered page carries 15 distinct `C-` IDs in 40 docstring hits, plus `C-S1-1` from `ErrorEnvelope` (`_results.py:331`); the source carries 21 distinct across 56 lines | SRF-03: a griffe walk of the public API under the `mkdocs.yml` filters |
| ocx-catalog | none | SRF-01: `src/cli/main.ts:37` renders `(C-007)` in `ocx-catalog --help` and `ci --help`; `test/cli.test.ts` asserts nothing on help text | SRF-03: a recursive `--help` scan |
| grimoire-indexer | SRF-01: 0 hits across 9 commander subcommands (interface-check §6) | none measured | SRF-03: a recursive `--help` scan |
| grimoire-vscode | SRF-01: 0 hits in 6 `package.json` descriptions at HEAD | SRF-04: 364 of 756 over 200 chars; 93 of 196 long blocks have no break, e.g. `src/scopes.ts:198`, whose guard shows whole in hover | none (no generator surface) |
| ocx-mirror | none measured | none measured | SRF-03: the classifier misses 25 `cfg_attr` derives, e.g. `crates/ocx_mirror_spec/src/dist.rs:62` |
| ocx-indexbot, arcana | SRF-01: 41 and 17 argparse sites, 0 ID or date hits in `help=` strings | none measured | SRF-03: a `format_help()` walk, not yet captured or proved |

## AI-agent failure modes

Ranked by measured frequency.

1. **Writing for the rustdoc reader on an item a generator renders.** The agent follows DOC-16 and writes intra-doc links and `Self::` paths. Re-measured: 320 raw links and 14 code paths in ocx's golden schemas, 207 of 1,336 ocx interface blocks carrying a link, 16 links in grimoire's built schemas, and code syntax on 2 ocx and 3 grimoire help screens. SRF-01 bans them and the DOC-16 amendment removes the cue.
2. **Carrying plan IDs and record names into rendered text.** 157 ID tokens and 22 record names sit in ocx's golden schemas, and 103 ocx interface blocks carry an ID. ocx-sdk-python's rendered reference carries 15 distinct `C-` IDs and `C-S1-1`, and ocx-catalog's help carries `(C-007)`. SRF-01 and SRF-03 cover this.
3. **Writing the rationale as one unbroken paragraph.** 924, 595 and 364 over-cap summaries across three repos; 51.8% of grimoire-vscode's long blocks have no break ([rendered-summary §7](code-docs-surfaces/rendered-summary.md#7-the-failure-mode-measurement-predicts-no-paragraph-break-at-all)). SRF-04 covers this.
4. **Restating the module's "why" at every item.** Seen in 9 of 17 files, with up to 208 repeats. SRF-05 covers this.
5. **Putting guards and implementation notes in the rendered register.** 4 of 69 ocx help screens, grimoire's `login`/`logout` help, and 23 ocx interface blocks that point at code "below" or "above". It is rarer than 1–4 but costs the most, because the fix invites deleting the guard (SRF-02).
6. **Assuming only the first paragraph renders.** schemars renders the whole body, and so does hover in three clients ([rendered-summary §4](code-docs-surfaces/rendered-summary.md#4-hover-across-four-clients-two-show-the-whole-block-two-show-nothing-about-length-at-all)). The damage is in the counts of mode 1. No rule argues from truncation.
7. **Changing what renders without re-reading the doc.** The agent adds `JsonSchema` or `Parser` to an existing item, or drops `description =` from a `#[tool]` so rmcp falls back to the function's `///`. A hunk-scoped check misses both. There is no measured count; SRF-03's output test catches either once the surface is walked.

## Decisions for the eval

- **Arms.** No new arm.
  - The `rules` arm's recipe applies SRF-02 (interface rationale moves verbatim to `//` at the protected line) and SRF-05 (per-item restatements drop where the module doc states the "why").
  - The `pointer` arm writes its pointer as a `//` line on interface items, never as `///`.
- **Site properties.**
  - Add `renders` (interface item: yes or no) to the site JSON. No current site sits on an interface item. Three candidates carry a concrete breaking edit; eval-arms-and-sites writes those edits:
    - `ocx:crates/ocx_cli/src/command/exec.rs:90-95`;
    - `ocx:crates/ocx_cli/src/api/data/shell_state.rs:289-296`;
    - `grimoire:src/command/login.rs:64-69`, where renaming `host` to `registry` is the breaking edit.
  - OCX-09 (`render_toolchain.rs:891-900`) already sits in the heaviest restating file, so it is SRF-05's test site.
- **Where-found taxonomy.** Split "module doc" from "item doc", so the eval shows whether a reason was recovered from the front page.
- **Must confirm before MUST.** SRF-05 is promoted only if the `rules` arm holds guard survival within eval-scoring's 5-point non-inferiority margin on OCX-09 and at least one more restating site.
- **Needs no eval.**
  - SRF-01 and SRF-03 serve an external reader.
  - SRF-02 moves text verbatim. Any compression during the move falls under guard-shape and the `oneline` arm.
  - SRF-04 preserves content.
- **Hover.** Hover is not a channel: probes read source, and nothing needs to simulate it.

## Open questions

- **Human decision (one-way door).** Should ocx publish its JSON contract with stable public anchors? ocx-sdk-python cites "contract v0.1 C-003" (`src/ocx_sdk/_results.py:4`), and replacing those IDs under SRF-01 needs a public URL plus anchor to point at. Once published, the anchors must stay. The default is to drop the ID and keep the plain-language constraint until anchors exist.
- **Another round: vocabulary.** Is a term in interface text that the user docs never define (for example `singleflight`, 1 docs mention) a leak worth a CONSIDER check? This replaces the dropped wordlist.

## Sub-artifacts

- [interface-leak.md](code-docs-surfaces/interface-leak.md): how clap, schemars, pydantic and zod copy doc text into rendered surfaces, the measured schema leak, and source-side vs output-side prototypes. Superseded here on check order, jargon and the DOC-16 license.
- [rendered-summary.md](code-docs-surfaces/rendered-summary.md): rustdoc/clippy/clap/TypeDoc summary splitting, what hover shows in four clients, first-paragraph lengths on four fleet and six reference repos, and module front pages on ocx's top 25 files.
- [interface-check.md](code-docs-surfaces/interface-check.md): fresh builds and captures of every fleet generator, the per-family false-positive audit, the `C-S` family, planted red/green tests per language, and the evidence on whether schema description text is contract. Superseded here on four points: its §7 final set reprints the naive `.rs` pattern, its 0% false-positive claim misses one Windows SID, its Python walk uses `inspect.getdoc()` where griffe is needed, and it counts `show_source` listings as rendered docstrings.

## Key sources

- [clap_derive/src/utils/doc_comments.rs](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs), plus the pinned snapshot `/home/mherwig/.cache/research-lang/exemplars/code-docs/clap-rs__clap/clap_derive/src/utils/doc_comments.rs:11-69`: first-blank-line split and `remove_period`.
- [schemars_derive/src/attr/doc.rs](https://raw.githubusercontent.com/GREsau/schemars/master/schemars_derive/src/attr/doc.rs) and [schemars/src/_private/rustdoc.rs](https://raw.githubusercontent.com/GREsau/schemars/master/schemars/src/_private/rustdoc.rs): the whole body becomes `description`.
- [docs.rs rmcp-macros `#[tool]`](https://docs.rs/rmcp-macros/latest/rmcp_macros/attr.tool.html): `description` is used verbatim, and the function's doc comment is used when it is absent.
- [clippy too_long_first_doc_paragraph.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/too_long_first_doc_paragraph.rs): the 200-character gate.
- [rustdoc book, how to write documentation](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html): the summary is everything before the first blank line, with no drop.
- [rust-analyzer hover/render.rs](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/crates/ide/src/hover/render.rs) and [typescript-go internal/ls/hover.go](https://raw.githubusercontent.com/microsoft/typescript-go/main/internal/ls/hover.go): hover shows the whole block.
- [LSP 3.17 hover.md](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/language/hover.md): no length field.
- `/home/mherwig/dev/ocx/crates/ocx_cli/src/app.rs:737` and `:779-800`: the existing output-side clap test, the template for SRF-03, and its 3-of-17 family coverage.
- `/home/mherwig/dev/ocx/crates/ocx_schema/tests/golden_schemas.rs:4-20` and `/home/mherwig/dev/ocx/.agents/discussions/ocx-interface-contract.md:29`: the byte-pinned golden policy and the owner's structural contract scope.
- `/home/mherwig/dev/ocx/crates/ocx_cli/src/api/data/shell_state.rs:289` rendering as `/home/mherwig/dev/ocx/crates/ocx_schema/tests/golden/reports.json:4573`: all three leak classes in one field.
- `/home/mherwig/dev/ocx/crates/ocx_cli/src/command/exec.rs:90` and `/home/mherwig/dev/grimoire/src/command/login.rs:64`: guards rendered into `--help`.
- `/home/mherwig/dev/grimoire/src/mcp/tool_args.rs:4`: correct pointer placement on a schema-derived module.
- `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_results.py:1570` and `:331`: IDs in a published API reference.
- `/home/mherwig/dev/ocx-catalog/src/cli/main.ts:37`: a live commander leak with no test.
- `.agents/research/code-docs-audit/census.md` §5: the 182/64 schema leak and 0/73 help screens.
- `.agents/research/code-docs-linkage.md` LNK-01, LNK-04: the canonical ID families SRF-01 adopts.
- `rules/rust-quality/docs-and-tracing.md`: DOC-01, DOC-11 and DOC-16, the rules amended here.

## Revision log

- 2026-09-27, frontmatter: added `interface-check.md` to `consolidates` and set `revised`. Source: interface-check.
- SRF-01: added the `C-S` clause-label family (`\bC-S[0-9]+(-[0-9]+)?\b`). `C-S1-1` leaks in ocx's goldens and ocx-sdk-python's reference, and `\bC-[0-9]` misses it. Source: interface-check §7.
- SRF-01: adopted LNK-01's `D-`, `D-V` and `ADR-N` families, as the first pass's provisional note promised once linkage landed. They hit 0 times on the rendered surfaces. Source: this revision's re-measure.
- SRF-01: the `S-` family now excludes a following `-digit`. The Windows SID `S-1-5-…` at `execution-record.json:213` is clean user text that a must-print-nothing gate would flag forever, so interface-check's 0% false-positive claim was wrong. Source: this revision's re-measure against interface-check §7.
- SRF-01: kept the two guarded `.rs` patterns and rejected interface-check §7's naive `\.rs\b`, which matches grimoire's `$id` 4 times. Source: this revision's re-measure.
- SRF-01: the interface-text definition now names the rmcp doc-comment fallback and commander. Verification counts refreshed (256 ocx lines, 8 grimoire lines, 1 false positive in 333 hits, fixed). Severity MUST confirmed. Source: interface-check §4, §6, §7.
- SRF-02: added grimoire's `login`/`logout` `host` guard as a second guard rendered in `--help`, and noted the `show_source` caveat. Source: interface-check §2, re-read at grimoire `be3a7382`.
- SRF-03: corrected the overclaim that ocx's help "stays clean of IDs because such a test exists". `marker()` checks 3 of 17 families and passes a bare `(C-999)`. Source: interface-check §2, re-read `app.rs:779-800`.
- SRF-03: specified one walk per generator and one shared scanner. Named rmcp's fallback as a fifth source-invisible surface. Source: interface-check §4, §8, Decisions.
- SRF-03: the Python walk is griffe, not interface-check's `inspect.getdoc()`, which misses attribute docstrings (4 render on ocx-sdk-python). An HTML grep must exclude `show_source` listings (14 of 54 hits). Source: this revision's re-measure against interface-check §5, §8.
- SRF-03: severity MUST confirmed. Added ocx-catalog's live `(C-007)` leak and its assertion-free CLI test as evidence. Source: interface-check §6.
- Ruleset intro: `short2char` exclusion re-confirmed at 25% false positives (4 of 16). Source: interface-check §7.
- Amendments: LNK-01 and LNK-04 add the `C-S` family; LNK-04's output command folds into SRF-03's scanner. Source: interface-check §7, this revision.
- Verdict 2: extended to grimoire help, ocx-catalog and the clean surfaces. Verdicts 10–13 added (token-set result, the no-gate gap, the schema-description evidence, the coverage gaps). Verdict 3 records the red/green proofs. Source: interface-check.
- Open questions: removed "interface-surface check" (answered by Verdicts 10–11 and SRF-03). Removed the schema-`description` contract decision, now settled as Verdict 12. Source: interface-check §7–§9.
- Applied to the fleet: added ocx-catalog, grimoire-indexer and grimoire-vscode rows. Added grimoire help and MCP results. ocx-sdk-python's rendered count is corrected to 15 distinct `C-` IDs; 21 is the source count. Source: interface-check §5–§6, this revision's re-measure.
- Failure modes 1, 2, 5 and 7: counts updated, and mode 7 now covers the rmcp fallback. Source: interface-check §2, §4–§6.
- Decisions for the eval: added `grimoire:src/command/login.rs:64-69` as a `renders: yes` candidate site. Source: interface-check §2.
