---
title: code-docs topic map — tooling and rendered surfaces
corpus: "codified practice (linter/formatter rule catalogues across Rust, Python, TypeScript, Go, Java, Kotlin, Swift, SonarQube) and code-rendered surfaces (hover, generated CLI help, generated JSON Schema, generated API doc sites)"
agent: landscape-scout
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 33
scope: |
  Covers what named lints/checks across nine ecosystems actually enforce about
  comments and doc comments (exact rule IDs, defaults, thresholds), and what
  seven kinds of rendered surface show, truncate or generate from doc text.
  Does not cover: user-facing prose standards (owned by docs-quality), the
  eval/reason-recovery question, decision-record formats, or repeating the
  AI-comment-quality papers already covered by prior ocx research.
---

## Table of contents

- [Summary](#summary)
- [Survey](#survey)
  1. [Rust: clippy doc/comment lints](#1-rust-clippy-doccomment-lints)
  2. [Rust: rustdoc lints](#2-rust-rustdoc-lints)
  3. [Rust: clap derive — doc comment to CLI help](#3-rust-clap-derive--doc-comment-to-cli-help)
  4. [Rust: schemars — doc comment to JSON Schema](#4-rust-schemars--doc-comment-to-json-schema)
  5. [Python: ruff pydocstyle (D)](#5-python-ruff-pydocstyle-d)
  6. [Python: ruff ERA/FIX/TD (dead code and TODOs)](#6-python-ruff-erafixtd-dead-code-and-todos)
  7. [Python: docstring-to-schema (pydantic) and CLI (Click/Typer)](#7-python-docstring-to-schema-pydantic-and-cli-clicktyper)
  8. [Python: Sphinx autodoc/napoleon and mkdocstrings](#8-python-sphinx-autodocnapoleon-and-mkdocstrings)
  9. [TypeScript: eslint-plugin-jsdoc](#9-typescript-eslint-plugin-jsdoc)
  10. [TypeScript: eslint-plugin-tsdoc and typescript-eslint directive comments](#10-typescript-eslint-plugin-tsdoc-and-typescript-eslint-directive-comments)
  11. [TypeScript: TypeDoc rendering and zod → JSON Schema](#11-typescript-typedoc-rendering-and-zod--json-schema)
  12. [Go: doc comment spec, revive, staticcheck, godot/godox](#12-go-doc-comment-spec-revive-staticcheck-godotgodox)
  13. [Go: cobra CLI help fields and pkg.go.dev deprecation](#13-go-cobra-cli-help-fields-and-pkggodev-deprecation)
  14. [Java: checkstyle Javadoc checks and PMD Documentation rules](#14-java-checkstyle-javadoc-checks-and-pmd-documentation-rules)
  15. [Kotlin: detekt comments rule set](#15-kotlin-detekt-comments-rule-set)
  16. [Swift: SwiftLint doc-comment rules](#16-swift-swiftlint-doc-comment-rules)
  17. [Cross-language: SonarQube comment metrics and rules](#17-cross-language-sonarqube-comment-metrics-and-rules)
  18. [Cross-language: TODO/FIXME lifecycle tools](#18-cross-language-todofixme-lifecycle-tools)
  19. [Editors and protocol: hover surfaces](#19-editors-and-protocol-hover-surfaces)
- [Candidate topics](#candidate-topics)
- [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
- [Contested](#contested)
- [Sources](#sources)

## Summary

- Every major linter that touches doc comments enforces **structure and
  presence**, not length or content quality — length caps exist in exactly
  two places found in this corpus: clippy's `too_long_first_doc_paragraph`
  (200 characters) and PMD's `CommentSize` (`maxLines` = 6, `maxLineLength` =
  80, non-header comments only).
- Five independent ecosystems converge on the identical **split-at-first-
  paragraph** pattern for rendered surfaces: rustdoc's summary line, clap
  derive's `about`/`long_about`, Click's `short_help` (ellipsized if it
  overflows one line), TypeDoc's summary/`@remarks`, and Go's doc-comment
  synopsis. None of these are coordinated; the convergence is on the
  underlying constraint (a listing has one line, a detail page has the rest).
- `revive`'s `comments-density` rule enforces a **minimum** density (the
  SonarQube `comment_lines_density` formula, configurable floor, default 0)
  — the opposite polarity from this program's cut-density goal, and a live
  contradiction if a fleet ever adopts it uncritically (see Contested §1).
- No mainstream linter in this corpus checks **why a comment says what it
  says**, whether it is stale, or whether it should point at a decision
  record instead of restating one. Every rule found is structural: presence,
  placement, spacing, capitalization, punctuation, first-word, syntax
  validity. The "why vs what" distinction docs-and-tracing.md already
  encodes (DOC-18–20) has no lint-level analogue anywhere surveyed.
- `undocumented_unsafe_blocks` (clippy) is the closest thing in any tool
  catalogue to a machine-checked "why" requirement: it demands a `// SAFETY:`
  comment immediately preceding an `unsafe` block, checking placement only,
  never content quality.
- Directive-comment governance (`@ts-expect-error`, `#[allow]`-adjacent)
  converges independently in TypeScript (`ban-ts-comment`) and Go
  (`revive`'s `comment-spacings` allow-list for `//nolint:`, `//go:generate`
  pragmas): a suppression needs a reason string of minimum length, not just
  a bare directive.
- `eslint-plugin-unicorn`'s `expiring-todo-comments` is the most advanced
  TODO-lifecycle enforcement found: it can expire a TODO on a date, a
  package version, an engine version, or a dependency version/presence —
  strictly ahead of every "TODO must link an issue" checker surveyed.
- Two rules directly check for **uninformative** comments by content, not
  just structure: `eslint-plugin-jsdoc`'s `informative-docs` (fails a doc
  block containing no word absent from the declaration it documents) and
  `detekt`'s `CommentOverPrivateFunction`/`CommentOverPrivateProperty`
  (fails when a *private* member is commented at all, on the theory that a
  private symbol should be self-explanatory or renamed). Neither exists in
  the Rust, Python or Go catalogues surveyed.
- `staticcheck`'s ST1020–ST1022 and Go's doc-comment convention both require
  a doc comment to start with the name of the thing documented — the
  opposite emphasis from Rust's DOC-01 (third-person, not name-first), so a
  cross-language index cannot state one summary-sentence template.
- The `Deprecated:` convention (Go) is a machine-parsed **paragraph-prefix
  token**, not a special comment syntax: any paragraph starting with the
  literal string `Deprecated:` is picked up by `go vet`, `gopls`, and
  pkg.go.dev (which hides the deprecated doc by default and shows a
  strikethrough). This is a pattern the code-docs rule could reuse for its
  own machine-readable markers (e.g., a load-bearing-constraint prefix).
- Six of nine doc-comment-generating-schema tools found (schemars, pydantic,
  zod, ts-json-schema-generator, JSDoc `@description`, TypeDoc) put the doc
  text verbatim into a schema `description` field with **no length limit
  and no redaction step** — exactly the leak vector the prior ocx critique
  flagged for schemars specifically (finding #3, adversarial critique).
  None of the six tools' own documentation mentions a truncation or
  sanitization step; the leak is a property of the pattern, not a bug in
  any one tool.
- Rustdoc silently drops the summary line entirely if the first sentence is
  "too long" (undocumented exact threshold in the fetched page; the effect
  is "no summary shown" rather than a truncated one) — a single missed
  period can make an item vanish from a module listing with zero warning.
- Half the doc-comment lint catalogues surveyed (clippy, PMD, detekt,
  SwiftLint) shipped their comment-specific rules within the last two
  major/minor releases relative to this research date, evidence that
  tooling vendors are still actively expanding this surface, not treating
  it as settled (see Recent shifts).
- IDE hover (rust-analyzer/VS Code, JetBrains Quick Documentation, LSP
  `textDocument/hover`) has no documented content-length contract in any
  primary source fetched: the LSP spec defines `MarkupContent` (plaintext or
  markdown) with no size field, so truncation behavior is a client
  implementation detail, not a protocol guarantee — a rule that assumes
  "the first N characters render in hover" is assuming client behavior the
  spec does not promise.
- No tool in this corpus checks whether a comment's target (an ADR file, an
  issue, a plan ID) still exists — the "pointer must resolve" requirement
  the prior ocx critique recommended as priority 2 has no precedent in any
  linter surveyed; it would be a genuinely novel check for this rule set to
  add.

## Survey

### 1. Rust: clippy doc/comment lints

Source: [`clippy_lints/src/doc/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/mod.rs) (master, fetched 2026-09-27), plus [`missing_doc.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/missing_doc.rs) and [`undocumented_unsafe_blocks.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs).

20 lints declared in `doc/mod.rs` alone, each carrying a `#[clippy::version]` stamp. Full catalogue with the version each shipped (all quoted from `declare_clippy_lint!` doc comments):

| Lint | Group | Shipped | What it does |
|---|---|---|---|
| `DOC_BROKEN_LINK_CODE` (fn-named) | pedantic | 1.90.0 | unbroken doc links, catches links broken across multiple lines |
| `DOC_COMMENT_DOUBLE_SPACE_LINEBREAKS` | pedantic | 1.87.0 | detects double-space hard line breaks instead of `\` |
| `DOC_INCLUDE_WITHOUT_CFG` | restriction | 1.85.0 | `include_str!`'d doc files gated behind `cfg(doc)` |
| `DOC_LAZY_CONTINUATION` | style | 1.80.0 | CommonMark list/quote paragraph continuation lines |
| `DOC_LINK_CODE` | nursery | 1.87.0 | `` [`Item`]`<`[`T`]`>` `` adjacency |
| `DOC_LINK_WITH_QUOTES` | pedantic | 1.63.0 | `['foo']` (quotes) vs backticks in doc links |
| `DOC_MARKDOWN` | pedantic | pre 1.29.0 | `_`, `::`, camelCase outside backticks |
| `DOC_NESTED_REFDEFS` | suspicious | 1.85.0 | link reference definitions at list/quote start |
| `DOC_OVERINDENTED_LIST_ITEMS` | style | 1.86.0 | overindented list-item continuations |
| `DOC_PARAGRAPHS_MISSING_PUNCTUATION` | restriction | 1.93.0 | doc paragraphs without a closing period/punctuation |
| `DOC_SUSPICIOUS_FOOTNOTES` | suspicious | 1.89.0 | text that looks like a footnote reference |
| `EMPTY_DOCS` | suspicious | 1.78.0 | documentation that is empty |
| `MISSING_ERRORS_DOC` | pedantic | 1.41.0 | public fns returning `Result` without a `# Errors` section |
| `MISSING_PANICS_DOC` | pedantic | 1.51.0 | public fns that may panic without a `# Panics` section |
| `MISSING_SAFETY_DOC` | style | 1.39.0 | public `unsafe` fns without a `# Safety` section |
| `NEEDLESS_DOCTEST_MAIN` | style | 1.40.0 | `fn main() {}` wrapper in doctests |
| `SUSPICIOUS_DOC_COMMENTS` (mod-named) | suspicious | 1.70.0 | `///!` (outer doc comment immediately followed by `!`) |
| `TEST_ATTR_IN_DOCTEST` | suspicious | 1.76.0 | `#[test]` in a doctest without `ignore`/`no_run`/`compile_fail` |
| `TOO_LONG_FIRST_DOC_PARAGRAPH` | nursery | 1.82.0 | first-paragraph length — **hard threshold 200 characters**, source-verified in [`too_long_first_doc_paragraph.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/too_long_first_doc_paragraph.rs): `if first_paragraph_text_len <= 200 { return; }`, applied only to items shown on the module page (statics, consts, fns, macros, mods, type aliases, enums, structs, unions, traits, trait aliases) |
| `UNNECESSARY_SAFETY_DOC` | restriction | 1.67.0 | `# Safety` sections on *safe* fns/traits — the inverse of `MISSING_SAFETY_DOC` |

Two lints live outside `doc/mod.rs`:
- `MISSING_DOCS_IN_PRIVATE_ITEMS` (restriction, pre-1.29.0, `missing_doc.rs`): "detects missing documentation for private members," extending rustc's public-only `missing_docs`.
- `UNDOCUMENTED_UNSAFE_BLOCKS` (restriction) and `UNNECESSARY_SAFETY_COMMENT` (restriction), `undocumented_unsafe_blocks.rs`: requires a `// SAFETY:` comment on the line(s) immediately preceding an `unsafe` block — a blank line, other code, or an inline `/* SAFETY: */` all fail — and separately flags `// SAFETY:` comments attached to *safe* code as unnecessary.

`doc_valid_idents` (from [`clippy_config/src/conf.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_config/src/conf.rs)): the `doc_markdown` allow-list is a replaceable or appendable (`".."`  sentinel) `FxHashSet<String>` of identifiers exempt from the backtick requirement — the mechanism this fleet's rules already use to keep the lint from firing on domain vocabulary.

### 2. Rust: rustdoc lints

Source: [doc.rust-lang.org/rustdoc/lints.html](https://doc.rust-lang.org/rustdoc/lints.html), fetched 2026-09-27.

12 lints, split by where they run. `missing_docs` is the only one available in plain `rustc`; the rest require `rustdoc` itself: `broken_intra_doc_links` (warn), `private_intra_doc_links` (warn), `missing_docs` (allow), `missing_crate_level_docs` (allow), `missing_doc_code_examples` (allow, **nightly-only**), `private_doc_tests` (allow), `invalid_codeblock_attributes` (warn), `invalid_html_tags` (warn), `invalid_rust_codeblocks` (warn), `bare_urls` (warn), `unescaped_backticks` (allow), `redundant_explicit_links` (warn). Every lint here is a correctness check (does the doc build/link correctly); none checks content quality or length.

### 3. Rust: clap derive — doc comment to CLI help

Source: [`clap_derive/src/utils/doc_comments.rs`](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs), fetched 2026-09-27 (function names and logic read directly, not summarized).

`extract_doc_comment` strips one leading space per `///` line and trims leading/trailing blank lines. `format_doc_comment` then does the split that becomes `about`/`long_about`: if there's a blank-line-delimited first paragraph, everything before the first blank line becomes `short` (→ `about`, shown in `-h`), the whole doc comment becomes `long` (→ `long_about`, shown in `--help`). With no blank line, `short == long` unless `force_long` is set. `verbatim_doc_comment` disables all of this preprocessing (needed for ASCII art or markdown tables) but still strips exactly one leading space per line. This is a hard mechanical rule: **the first blank line in a doc comment is the API boundary between short and long CLI help**, independent of sentence structure.

### 4. Rust: schemars — doc comment to JSON Schema

Source: [GREsau/schemars examples](https://graham.cool/schemars/examples/6-doc_comments/) and [repository](https://github.com/GREsau/schemars), corroborated via search, 2026-09-27.

Any doc comment (or `#[doc]` attribute) on a struct, enum variant, or field becomes the schema's `description`. If the first line is an ATX heading (`# ...`), it becomes the schema `title` and the rest becomes `description`; `#[schemars(title = ..., description = ...)]` overrides both explicitly. No length limit, no ID/reference scrubbing — the exact mechanism the prior ocx adversarial critique (finding 3) identified as leaking `adr_index_indirection.md F5a`-style internal references into user-visible schema hover text.

### 5. Python: ruff pydocstyle (D)

Source: [`crates/ruff_linter/src/codes.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/codes.rs), fetched 2026-09-27 (the registry mapping every code to its rule struct — ground truth, not a doc-page summary).

44 `D`-prefixed rules, `D100`–`D107` (undocumented-*: module, class, method, function, package, magic-method, nested-class, `__init__`), `D200`–`D215` (formatting: one-line fit, blank-line placement × 4 variants, tab indentation, under/over-indentation, whitespace, multi-line summary placement, section indentation × 2), `D300`–`D301` (quote style, escape sequences), `D400`–`D421` (content: trailing period, imperative mood, no signature-in-docstring, capitalization, section naming/formatting × ~12 rules, `D417` undocumented-param, `D419` empty docstring, `D420` section order, `D421` property-docstring-starts-with-verb). Three **conventions** gate which subset applies: Google convention excludes `D203, D204, D213, D215, D400, D401, D404, D406–D409, D413`; NumPy excludes `D107, D203, D212, D213, D402, D413, D415–D417`; PEP257 excludes a similar ~17-rule set. No `D` rule caps docstring *length* — the entire family is presence/structure/style, matching the clippy pattern.

### 6. Python: ruff ERA/FIX/TD (dead code and TODOs)

Source: [`eradicate/rules/commented_out_code.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/rules/eradicate/rules/commented_out_code.rs), [`flake8_todos/rules/todos.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/rules/flake8_todos/rules/todos.rs), [`flake8_fixme/mod.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/rules/flake8_fixme/mod.rs) — all fetched raw source, 2026-09-27.

- `ERA001` commented-out-code (stable since v0.0.145): "Commented-out code is dead code... It should be removed." Explicitly documents its own false-positive risk ("prone to false positives when checking comments that resemble Python code, but are not actually Python code," linking [issue #4845](https://github.com/astral-sh/ruff/issues/4845)). `FIX_AVAILABILITY::None` — never auto-fixed.
- `flake8-fixme` (`FIX001`–`FIX004`, all pedantic): `LineContainsFixme`, `LineContainsTodo`, `LineContainsXxx`, `LineContainsHack` — a blanket "this tag exists at all" check, independent of and stricter than the TD family below (a bare `# TODO` trips `FIX002` even though it's the *correctly*-tagged form under TD001).
- `flake8-todos` (`TD001`–`TD006`, all pedantic, all stable since v0.0.269): `TD001` invalid-todo-tag (only `TODO` accepted; `FIXME`/`XXX` rejected — direct overlap/tension with FIX002/004 above, which ban `TODO` too), `TD002` missing-todo-author, `TD003` missing-todo-link (accepts a full URL or a bare "3-digit issue code" matching `[A-Z]+\-?\d+`), `TD004` missing-todo-colon, `TD005` missing-todo-description, `TD006` invalid-todo-capitalization (auto-fixable). No `TD007`/`TD008` exist in this source tree as of fetch date.

### 7. Python: docstring-to-schema (pydantic) and CLI (Click/Typer)

Sources: [pydantic JSON Schema docs](https://pydantic.dev/docs/validation/latest/concepts/json_schema/) (redirect-followed, fetched 2026-09-27), [Click documentation](https://click.palletsprojects.com/en/stable/documentation/) (via search, corroborated), [Typer command-help docs](https://typer.tiangolo.com/tutorial/commands/help/) (via search).

Pydantic: "The `description` for models is taken from either the docstring of the class or the argument `description` to the `Field` class" — quoted directly from the fetched page. Field-level docstrings are *not* used for field descriptions by default; `use_attribute_docstrings=True` (pydantic 2.7+) opts a model into reading a field's trailing docstring as its schema description. Click: a command's docstring becomes its full help text; for subcommand listings, `short_help` defaults to the first sentence of the docstring, **ellipsized (`...`) if it doesn't fit one line** — the same split-and-truncate shape as clap's `about`. Typer inherits Click's behavior and does not parse structured (Google/NumPy) docstring sections for per-parameter help — parameter help must be supplied explicitly, unlike clap where the doc comment alone drives both summary and detail.

### 8. Python: Sphinx autodoc/napoleon and mkdocstrings

Source: search-corroborated across [Sphinx autodoc](https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html), [Sphinx napoleon](https://www.sphinx-doc.org/en/master/usage/extensions/napoleon.html), [mkdocstrings-python](https://mkdocstrings.github.io/python/reference/api/), 2026-09-27.

`autodoc` imports the module and pulls docstrings + signatures directly (docs drift only if the docstring itself goes stale — it cannot go stale relative to a *different* source of truth, unlike hand-written prose). `napoleon` is a preprocessor converting Google-/NumPy-style docstrings to reStructuredText before autodoc renders them — three competing docstring dialects (Sphinx-native RST, Google, NumPy) are all live simultaneously in the Python ecosystem. `mkdocstrings`'s Python handler reads all three styles (auto-detect or pinned via `docstring_style: google|numpy|sphinx`). No length or content-quality gate at the rendering layer in any of the three — rendering is purely "take what's there and format it."

### 9. TypeScript: eslint-plugin-jsdoc

Source: [GitHub API rule-directory listing](https://api.github.com/repos/gajus/eslint-plugin-jsdoc/contents/src/rules) (69 files, fetched 2026-09-27) and [`.README/rules/informative-docs.md`](https://raw.githubusercontent.com/gajus/eslint-plugin-jsdoc/main/.README/rules/informative-docs.md).

69 distinct rules — by far the largest single catalogue in this survey. Beyond the expected presence/structure rules (`require-jsdoc`, `require-param`, `require-returns`, `check-tag-names`, `check-types`, `valid-types`), three are directly relevant to a comment-reduction program:
- `informative-docs`: "Reports on JSDoc texts that serve only to restate their attached name... This rule requires all docs comments contain at least one word not already in the code." Options: `aliases`, `excludedTags`, `uselessWords`. This is the only rule in the entire tooling survey that operationalizes the Ousterhout test as a runnable check rather than a review heuristic.
- `no-blank-block-descriptions` / `no-blank-blocks`: empty doc-comment bodies.
- `match-description`: regex-constrains description *content* (closest thing to a length/shape cap outside PMD/clippy, but user-configured, not a shipped default).
- `ts-ban-ts-comment`: this plugin's own port of the typescript-eslint rule below, applied to comments specifically inside JSDoc-adjacent contexts.

### 10. TypeScript: eslint-plugin-tsdoc and typescript-eslint directive comments

Sources: [tsdoc.org eslint-plugin-tsdoc](https://tsdoc.org/pages/packages/eslint-plugin-tsdoc/) (via search, corroborated against the [microsoft/tsdoc repo](https://github.com/microsoft/tsdoc)), [typescript-eslint ban-ts-comment](https://typescript-eslint.io/rules/ban-ts-comment/) (fetched directly, 2026-09-27).

`eslint-plugin-tsdoc` ships exactly one rule, `tsdoc/syntax`, validating doc comments against the formal TSDoc grammar (a spec, not a style guide — closer to rustdoc's link/codeblock lints than to pydocstyle's style rules). `@typescript-eslint/ban-ts-comment` default config: `ts-expect-error: 'allow-with-description'`, `ts-ignore: true` (banned outright), `ts-nocheck: true` (banned), `ts-check: false` (allowed freely), `minimumDescriptionLength: 3` — a directive-suppression comment needs a reason of at least 3 characters, which is a real but very low bar (`// x` clears it).

### 11. TypeScript: TypeDoc rendering and zod → JSON Schema

Sources: [TypeDoc `@summary` tag docs](https://typedoc.org/documents/Tags._summary.html) and [`@remarks` tag docs](https://typedoc.org/documents/Tags._remarks.html), both fetched 2026-09-27; [zod.dev/json-schema](https://zod.dev/json-schema), fetched 2026-09-27.

TypeDoc: "the first paragraph of comment's summary text (text before any block tags)" is the module-listing summary by default; an explicit `@summary` tag overrides it; `useFirstParagraphOfCommentAsSummary` is the flag gating the paragraph fallback. `@remarks` is capped at one occurrence per comment and renders under its own `# Remarks` heading in the default theme — TypeDoc is the only rendering tool surveyed with an explicit one-block-per-comment cap on a specific tag. Zod: `.meta({ description: ... })` (and its `.describe()` shorthand) copies straight into the generated JSON Schema's `description` field, confirmed from the fetched page's own example; the page states no length limit and (per the fetch) contains no discussion of editor/IDE surfacing — the same "no redaction, no cap" pattern as schemars and pydantic.

### 12. Go: doc comment spec, revive, staticcheck, godot/godox

Sources: [go.dev/doc/comment](https://go.dev/doc/comment) (fetched directly, 2026-09-27 — the official language spec for doc-comment markup, not a summary), [revive `RULES_DESCRIPTIONS.md`](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) (fetched raw, 2026-09-27), [staticcheck.dev/docs/checks](https://staticcheck.dev/docs/checks/) (fetched, 2026-09-27), godot/godox via search corroboration against their own repos ([tetafro/godot](https://github.com/tetafro/godot), [766b/godox](https://github.com/766b/godox)).

Go's own spec, quoted from the fetched page: headings use `#` syntax "added in Go 1.19"; link targets are defined by a block of `[Text]: URL` lines; every exported name "should have a doc comment"; the first sentence is the synopsis shown in listings and by gopls hover. No length guidance anywhere in the spec.

`staticcheck` ST1020/ST1021/ST1022 all require the doc comment to start with the documented name itself ("The documentation of an exported function should start with the function's name") — **the opposite convention from Rust's DOC-01** (third-person, not name-first: "Returns the resolved digest," not "`resolve_digest` returns..."). ST1000 requires a package comment matching the Go Code Review Comments format.

`revive` carries two rules with no analogue found in any other ecosystem surveyed: `comments-density` — "Spots files not respecting a **minimum** value for the comments lines density metric = comment lines / (lines of code + comment lines) * 100," configurable floor, **default 0** (off) — and `comment-spacings`, which requires a space after `//` except for an explicit allow-list of pragma prefixes (`//go:generate`, `//nolint:linter`, `//revive:disable:rule`, `//#nosec`, plus any user-added prefix). `exported` and `package-comments` are revive's ports of the original `golint` checks (undocumented exported identifiers, undocumented packages).

`godot` (disabled by default in golangci-lint) checks that comments end in a period, configurable scope (`declarations`, `toplevel`, `noinline`, `all`); `godox` flags comments starting with configurable keywords, default `["TODO", "BUG", "FIXME"]`.

### 13. Go: cobra CLI help fields and pkg.go.dev deprecation

Sources: [`spf13/cobra` `user_guide.md`](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) (fetched raw, 2026-09-27 — direct source, not a tutorial paraphrase), Go deprecation convention via search corroborated against [go.dev/wiki/Deprecated](https://go.dev/wiki/Deprecated).

Cobra has no doc-comment-to-help mechanism at all: `Short` and `Long` are separate hand-written struct fields (`Short: "Hugo is a very fast static site generator"`, `Long: "A Fast and Flexible Static Site Generator built with..."` — verified directly in the fetched guide's own examples), never derived from a Go doc comment on the command variable. This is the one CLI framework in this survey that does **not** repurpose a doc comment as help text.

Go's `Deprecated:` convention is a paragraph-prefix token, not special syntax: any paragraph starting with the literal string `Deprecated:` is recognized by `go vet`, `gopls` (which strikes through call sites), and pkg.go.dev (which renders a strikethrough + warning badge and **hides the deprecated doc text by default**). A prose "this is deprecated" buried mid-paragraph, or an all-caps `DEPRECATED` heading, is not recognized — only the exact literal token at paragraph start.

### 14. Java: checkstyle Javadoc checks and PMD Documentation rules

Sources: [checkstyle.org/checks/javadoc/index.html](https://checkstyle.org/checks/javadoc/index.html) (fetched, 2026-09-27, 34 checks enumerated), [checkstyle TodoComment](https://checkstyle.sourceforge.io/checks/misc/todocomment.html) (via search), [PMD Java Documentation rules](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html) (fetched, 2026-09-27), Javadoc `{@summary}` tag via search corroborated against [checkstyle SummaryJavadoc](https://checkstyle.sourceforge.io/checks/javadoc/summaryjavadoc.html).

Checkstyle ships 34 distinct Javadoc checks (fetched list, not truncated) — everything from `JavadocMethod`/`JavadocType`/`JavadocVariable` (presence + tag correctness) to fine-grained formatting (`JavadocLeadingAsteriskAlign`, `JavadocMissingWhitespaceAfterAsterisk`, `RequireEmptyLineBeforeBlockTagGroup`) to two rules with no precedent elsewhere in this survey: `JavadocNoErrorInThrowsTag` (bans documenting `Error` subtypes in `@throws`, since they're not meant to be caught) and `PreferCodeOrSnippetJavadocInlineTag` (prefers `{@code}`/`{@snippet}` over raw HTML). `TodoComment`'s `format` property defaults to the regex `"TODO:"` and is fully open-ended (any regex, e.g. `(?i)(TODO)|(FIXME)`) — the least prescriptive TODO-tagging mechanism surveyed (no author/link/colon sub-checks the way ruff's TD family has).

PMD's Documentation category: `CommentContent` (flags offensive/inappropriate terms — a content check, but for language policy, not accuracy or length), `CommentRequired` (configurable per-element-kind requirement), **`CommentSize` — the only other hard length cap found besides clippy's**: default `maxLines = 6`, `maxLineLength = 80`, applied to "non-header comments." `DanglingJavadoc` catches Javadoc placed somewhere the compiler won't associate it with a declaration (Java's structural analogue to SwiftLint's `orphaned_doc_comment`, §16).

Java 10 (JDK-8173425) added an explicit `{@summary}` tag so authors can mark the summary boundary directly instead of relying on Javadoc's period-and-`BreakIterator` heuristic to guess where the first sentence ends — a targeted fix for exactly the ambiguity that makes clippy's period-based summary detection (§1) occasionally guess wrong.

### 15. Kotlin: detekt comments rule set

Source: [detekt.dev/docs/rules/comments](https://detekt.dev/docs/rules/comments/), fetched 2026-09-27.

10 rules. Two have no analogue anywhere else surveyed: `DocumentationOverPrivateFunction` / `DocumentationOverPrivateProperty` — flags a **private** member for *having* documentation at all, on the premise that a private symbol should be self-explanatory through naming, not need a doc comment (the direct mechanical inverse of `MISSING_DOCS_IN_PRIVATE_ITEMS` in clippy, which flags a private member for *lacking* one). `OutdatedDocumentation` checks that a KDoc's `@param`/`@property` tags still match the declaration's actual parameter/property list and order (`matchDeclarationsOrder: true` by default) — this is the closest thing in the whole survey to a staleness check, though it only catches structural drift (renamed/reordered params), not semantic drift (a stale "why"). `EndOfSentenceFormat` requires the KDoc summary to end in `.`, `?`, `!`, or a URL, via a configurable regex (default `'([.?!][ \t\n\r\f<])|([.?!:]$)'`). `KDocReferencesNonPublicProperty` catches a public doc leaking a reference to an internal/private symbol — a narrower, Kotlin-specific version of the "internal reference leaking into a public surface" problem the ocx critique found in schemars output.

### 16. Swift: SwiftLint doc-comment rules

Source: [realm.github.io/SwiftLint orphaned_doc_comment](https://realm.github.io/SwiftLint/orphaned_doc_comment.html) and [missing_docs](https://realm.github.io/SwiftLint/missing_docs.html), both fetched 2026-09-27.

`orphaned_doc_comment` (enabled by default, warning severity): catches a `///` doc comment that is not immediately attached to a declaration — separated by a blank line, followed by a non-doc `//` comment before the real declaration, or with no declaration at all afterward. This is SwiftLint's version of Java's `DanglingJavadoc` and structurally close to what would be needed to catch a "why" comment that drifted away from the line it was guarding after a refactor. `missing_docs` (disabled by default, unlike most ecosystems' equivalent) requires documentation on declarations, configurable by access-control level.

### 17. Cross-language: SonarQube comment metrics and rules

Source: [SonarQube metrics-definition page](https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition.md), fetched 2026-09-27; S125/S1135 corroborated via search against SonarSource's own rule pages.

`comment_lines_density = [comment_lines / (lines + comment_lines)] * 100` — quoted verbatim from the fetched page. `comment_lines` itself is defined as "the number of lines containing either comment or commented-out code," explicitly *excluding* "non-significant comment lines (empty comment lines, lines with only special characters)." This is the exact formula `revive`'s `comments-density` rule reimplements (§12) — SonarQube is the origin of the metric, revive is a consumer. The fetched page states no default target percentage; Sonar's own quality gates historically ship no fixed threshold on this metric, leaving it purely informational unless a project sets its own gate. `S125` ("sections of code should not be commented out") is Sonar's per-language equivalent of ruff's `ERA001`, with the identical documented false-positive mode (code-like prose in comments). `S1135` ("Track uses of TODO tags") is presence-only, no author/link/colon sub-structure.

### 18. Cross-language: TODO/FIXME lifecycle tools

Sources: [`eslint-plugin-unicorn` `expiring-todo-comments.md`](https://raw.githubusercontent.com/sindresorhus/eslint-plugin-unicorn/main/docs/rules/expiring-todo-comments.md), fetched raw 2026-09-27; `todocheck` and `leasot` identified via search ([preslavmihaylov/todocheck](https://github.com/presmihaylov/todocheck), [pgilad/leasot](https://github.com/pgilad/leasot)) — **not independently fetched; content below is search-summary only and is flagged as such, per this report's sourcing rule.**

`expiring-todo-comments` (fetched, primary): six independent expiry conditions, all opt-in (date checks specifically require `checkDates: true`; `allowWarningComments` defaults `true`, meaning a plain unconditioned `// TODO` is *not* flagged by default) — date (`// TODO [2019-11-15]: ...`), package version (`// TODO [>=1.0.0]: ...`), Node engine version, dependency add/removal (`+dep`/`-dep`), dependency version, and peer-dependency version (compared against the floor of the peer range). This is a materially richer condition language than any other TODO tool surveyed.

`todocheck` (search-summary only, not fetched — fetch attempt against its README returned no content): reported to annotate TODOs with an issue-tracker reference and fail if the linked issue is closed or doesn't exist — the "pointer must resolve" check this survey otherwise found nowhere (see Summary, final bullet). This claim should be re-verified by a direct fetch before it is relied on for rule design. `leasot` (search-summary only): a parser/reporter for TODO/FIXME comments across many languages, used as a CI report generator rather than a pass/fail gate.

### 19. Editors and protocol: hover surfaces

Sources: [LSP 3.17 specification, `textDocument/hover`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_hover) (fetched, partial — the page is large and the fetch summarizer truncated before the full `Hover` interface definition), JetBrains Quick Documentation docs (via search), rust-analyzer hover behavior (via search, weak — no primary rust-analyzer source was successfully fetched on this pass).

Confirmed from the fetched LSP spec fragment: hover content is `MarkupContent`, which "represents a string value which content is interpreted based on its kind flag" — `plaintext` or `markdown`. No size/length field was found in the fetched portion of the spec, and no client-side truncation contract is defined at the protocol level; every editor's hover-length behavior (VS Code, JetBrains, any other LSP client) is therefore client-implemented, not protocol-guaranteed. This should be re-verified against the full spec text before any rule asserts a specific hover truncation point. JetBrains Quick Documentation (Ctrl+Q) renders full Javadoc/KDoc markup and reuses the same font-size setting as inline rendered docs; a second Ctrl+Q opens a dedicated tool window with (implicitly) more room than the popup, but no documented popup character/line limit was found.

## Candidate topics

| Topic | Why it matters | Source | Already covered? | Surface | Priority |
|---|---|---|---|---|---|
| Does a doc-comment length cap need a hard character/line threshold, and what do real tools use as that number? | Two tools in this whole survey ship a hard cap: clippy 200 chars (first paragraph), PMD 6 lines/80 chars (any non-header block). Neither is derived from a corpus measurement in its own docs. | [too_long_first_doc_paragraph.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/too_long_first_doc_paragraph.rs), [PMD CommentSize](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html) | no | check | P0 — directly sets the length-cap number H2/H6 need |
| Should a "why" comment require content-word novelty over the line it documents, the way `informative-docs` requires it over the declaration name? | This is the one shipped rule anywhere in the survey that operationalizes "would a newcomer write this just from the code" (the Ousterhout test) as a runnable check instead of a review heuristic. | [informative-docs](https://raw.githubusercontent.com/gajus/eslint-plugin-jsdoc/main/.README/rules/informative-docs.md) | no | check | P0 — turns DOC-19 from review-only to lintable |
| Should every comment-referenced document (ADR, plan, issue) be checked for existence at diff time, the way no surveyed tool does today? | This exact gap is what let `plan_toolchain_activation.md` go stale in ocx uncaught. No linter in nine ecosystems checks pointer resolution. | prior ocx critique; absence confirmed across this survey | no (genuinely novel) | check | P0 — closes the highest-value gap this survey found |
| Does a private/internal symbol commented at all indicate a naming failure, the way detekt's `CommentOverPrivateFunction`/`CommentOverPrivateProperty` assume? | Directly usable as a category-ban heuristic distinct from length: not "make it shorter" but "delete it, rename instead." | [detekt comments](https://detekt.dev/docs/rules/comments/) | no | inline comment | P1 — a second lever besides length |
| Should a `// SAFETY:`-style mandatory reason-comment pattern extend beyond `unsafe` to other load-bearing guards (locks, fail-open branches)? | `undocumented_unsafe_blocks` is the only "a reason comment is mandatory here" check found; it only fires on `unsafe`. The ocx critique's `_render_lock` and `is_ocx_trampoline` guards are exactly the non-`unsafe` cases this pattern doesn't reach. | [undocumented_unsafe_blocks.rs](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs) | partial (DOC-20 says "preserve," nothing says "require") | inline comment / check | P0 — the guardrail's actual enforcement mechanism |
| What machine-checkable syntax should mark a comment as load-bearing (never delete without replacing), analogous to Go's `Deprecated:` paragraph-prefix token? | Go proves a single literal-string-prefix convention is enough for three independent tools (`go vet`, `gopls`, pkg.go.dev) to agree on meaning with zero special syntax. | [go.dev/wiki/Deprecated](https://go.dev/wiki/Deprecated), [go.dev/doc/comment](https://go.dev/doc/comment) | no | inline comment / agent config | P1 — cheap, precedented mechanism for DOC-20 enforcement |
| Should internal identifiers/file paths be banned from any doc comment that also feeds a generated schema or CLI help, and can that be one check covering clap + schemars + pydantic + zod simultaneously? | Every schema/CLI generator surveyed (§3, §4, §7, §11) copies doc text verbatim with no redaction step — six tools, one shared leak shape. | [schemars docs](https://graham.cool/schemars/examples/6-doc_comments/), [zod.dev/json-schema](https://zod.dev/json-schema), [pydantic JSON Schema](https://pydantic.dev/docs/validation/latest/concepts/json_schema/), clap `doc_comments.rs` | partial (DOC-11 covers clap only; critique wants schemars too) | rendered surface / check | P0 — matches the critique's stated priority-1 fix |
| What is the actual character/line budget a hover popup renders before truncating, per client (VS Code, JetBrains, rust-analyzer), and does the LSP spec guarantee any of it? | The fetched LSP spec shows no length contract in `MarkupContent` — a rule that assumes "the first paragraph always shows in hover" is assuming unverified client behavior. | [LSP 3.17 spec](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_hover) | no | rendered surface | P1 — needs re-verification, flagged in survey §19 |
| Does a doc-comment summary sentence lead with the item's name (Go/staticcheck) or a third-person verb (Rust DOC-01), and does a cross-language rule need to pick one per language rather than one global template? | ST1020–ST1022 and Rust's own convention are opposite conventions; a single "how to write the first sentence" index entry cannot be language-neutral. | [staticcheck.dev/docs/checks](https://staticcheck.dev/docs/checks/) | partial (DOC-01 states the Rust rule, not the contrast) | doc comment | P1 — prevents a wrong cross-language generalization |
| Should a minimum comment-density floor ever be adopted from revive/SonarQube, or does it directly fight this program's cut-density goal? | `comments-density` is a real, shipped, configurable-floor rule reusing the exact SonarQube formula — the one tool found whose default direction opposes this program's. | [revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md), [SonarQube metrics](https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition.md) | no | check | P1 — a contested precedent worth stating explicitly in the rule's rationale |
| Should a directive-suppression comment (`#[allow]`, `@ts-expect-error`, `//nolint`) require a minimum-length reason string, and what floor is defensible? | `ban-ts-comment`'s default floor is 3 characters — real but nearly meaningless (`// x` passes). Revive's `comment-spacings` allow-list takes the opposite approach (an allow-list of known-good pragma prefixes, no length check at all). | [typescript-eslint ban-ts-comment](https://typescript-eslint.io/rules/ban-ts-comment/), [revive comment-spacings](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) | no | inline comment / check | P2 — narrow but concrete, low effort to adopt or reject |
| Should a TODO/FIXME comment expire on a condition (date, version, dependency) rather than merely require an author/link, the way `expiring-todo-comments` does? | Strictly more expressive than the "must link an issue" pattern this program's own missing-rules list #1 implies; a date/version expiry is checkable without an issue tracker at all. | [expiring-todo-comments.md](https://raw.githubusercontent.com/sindresorhus/eslint-plugin-unicorn/main/docs/rules/expiring-todo-comments.md) | no | check | P1 — directly extends the plan-ID/history-narration ban already drafted |
| Does a doc comment referencing a non-public symbol from a public API leak the same way KDoc's `KDocReferencesNonPublicProperty` catches? | A narrower, cheaper version of the schema-leak problem, catchable per-language without touching the schema-generation tools at all. | [detekt comments](https://detekt.dev/docs/rules/comments/) | no | doc comment / check | P2 |
| Should a doc comment be rejected for being *orphaned* (detached from its declaration by a blank line, a refactor, or an intervening non-doc comment), the way SwiftLint's `orphaned_doc_comment` and PMD's `DanglingJavadoc` both check? | A "why" comment that drifts away from the line it guards after a refactor is functionally deleted (it now explains nothing) but survives every content-based check. | [SwiftLint orphaned_doc_comment](https://realm.github.io/SwiftLint/orphaned_doc_comment.html) | no | check | P1 — catches silent guard loss that no other rule in this program's draft set would catch |
| What single split point should a doc comment define between its rendered summary and its full detail, given five ecosystems converge on "first blank line/paragraph"? | rustdoc, clap, Click, TypeDoc and Go's synopsis all use the same boundary independently — strong convergent evidence for where a code-docs rule should put its own summary/detail split for consistency with generated surfaces. | clap `doc_comments.rs`, [TypeDoc @summary](https://typedoc.org/documents/Tags._summary.html), Click docs (search), [go.dev/doc/comment](https://go.dev/doc/comment) | partial (DOC-01 sets the Rust summary rule but not the cross-tool convergence argument) | doc comment / rendered surface | P1 |
| Does rustdoc silently dropping an over-long first-sentence summary (no truncation, no warning) mean a length rule must fire *before* the item disappears from a listing, not after? | The fetched rustdoc page describes suppression, not truncation, as the failure mode for an over-long summary — a stronger argument for a proactive check than for relying on visual QA. | [doc.rust-lang.org/rustdoc/lints.html](https://doc.rust-lang.org/rustdoc/lints.html) context; general rustdoc summary-extraction behavior (search-corroborated, not independently fetched beyond the lints page) | no | rendered surface / check | P2 — needs a direct fetch of the summary-extraction rustdoc-book page to firm up before relying on it |
| Should `missing_docs`/`missing_docs_in_private_items`-style presence enforcement extend beyond Rust to the four other language rule sets in this fleet (python/typescript/go/java/kotlin-quality), none of which have an equivalent today? | Grep of the fleet's other quality rule files found no analogous presence-enforcement lint wired anywhere outside Rust. | this survey's fetches, cross-checked against `python-quality.md`, `typescript-quality.md`, `go-quality.md`, `java-quality.md`, `kotlin-quality.md` | no (for 4 of 5 non-Rust languages) | check | P2 — real gap, but out of this program's stated scope unless the owner extends it |
| Does a `// Step N:` phase-marker comment (explicitly protected by docs-and-tracing.md's "Patterns to Preserve") pass or fail `informative-docs`'s "must add a word not in the code" test? | The prior critique flagged phase markers as miscategorized narration; running the actual `informative-docs` heuristic against real ocx examples would settle whether the rule agrees. | [informative-docs](https://raw.githubusercontent.com/gajus/eslint-plugin-jsdoc/main/.README/rules/informative-docs.md); prior ocx critique | partial | inline comment | P2 — a concrete tie-breaker for an open disagreement in the prior research |
| What exact regex or grammar distinguishes a Javadoc/JSDoc/TSDoc block tag continuation line from a new paragraph, and does getting it wrong explain any of clippy's `doc_lazy_continuation`/`doc_overindented_list_items` false positives? | Both lints shipped within the last ~14 months (1.80.0, 1.86.0) specifically to fix CommonMark-continuation misparsing — a live source of noisy findings a fleet's own tooling could hit. | clippy `doc/mod.rs` | no | check | P3 — tooling-hygiene detail, not a content rule |
| Does PMD's `CommentContent` (offensive-term filtering) or checkstyle's `JavadocNoErrorInThrowsTag` have any equivalent worth adopting, or are they Java-specific enough to skip? | Neither generalizes cleanly; listed for completeness rather than because either clearly transfers. | [PMD Documentation rules](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html), [checkstyle Javadoc index](https://checkstyle.org/checks/javadoc/index.html) | no | doc comment | P3 |
| Should this fleet's own `comment_census.py` add a "block is orphaned from its declaration" detector, given no existing check in the ratchet set catches that failure mode? | Directly actionable addition to the shared classifier named in this program's context, informed by SwiftLint/PMD precedent. | SwiftLint, PMD (this survey) | no | check | P1 — concrete implementation task for the shared tool |
| Does the `Deprecated:`-token pattern (Go) suggest a reusable literal-prefix syntax for this program's own "load-bearing, do not delete" marker, distinct from a full decision-record pointer? | A one-word machine-parseable prefix is cheaper to check than a pointer-resolution check and works even where no decision record exists yet. | [go.dev/wiki/Deprecated](https://go.dev/wiki/Deprecated) | no | inline comment / agent config | P1 — directly actionable design choice for the rule's own syntax |
| Is a `# Errors`/`# Panics`/`# Safety`-style structured-section convention (Rust) transferable to Python/TypeScript/Go, where no equivalent structured tag set was found in this survey? | Ruff's `D` rules check *section presence* under a chosen docstring convention (Google/NumPy) but the sections named (Args, Returns, Raises) are prose-organizational, not safety/panic-specific the way Rust's are. | ruff `codes.rs` D400–D421 range | partial | doc comment | P2 |
| Should this fleet require `@throws`/`# Errors`-equivalent sections to name the *specific* error variant, matching what the prior census found ocx already does well? | The prior critique explicitly praised ocx's existing `# Errors` sections for naming specific errors, not boilerplate — this is a "keep doing this, formalize it" candidate, not a new invention. | prior ocx research (already covered), checkstyle `JavadocNoErrorInThrowsTag` for the adjacent Java rule | partial | doc comment | P2 |
| Does TypeDoc's one-`@remarks`-block-per-comment cap suggest an analogous "at most one design-argument paragraph per doc comment" structural rule, enforceable by a parser rather than by review? | The only shipped example of a rendering tool capping a *specific tag's* occurrence count rather than overall length. | [TypeDoc @remarks](https://typedoc.org/documents/Tags._remarks.html) | no | doc comment / check | P3 |
| Should test names carry a traceability marker the way an issue-linked TODO does, and does any tool in this survey already check test-name-to-requirement traceability? | No tool surveyed does this — it is a gap this program's brief explicitly asks about but this corpus (linters/rendered-surfaces) has nothing to say on it; the answer must come from a different corpus (BDD/TDD methodology, not tooling). | absence across all 33 sources | no | test | P1 — flag for the methodology-focused sibling research, not answerable from this corpus |
| Is there a shipped tool anywhere that checks a comment against the git blame date of the line it sits on, to flag likely staleness the way `OutdatedDocumentation` (detekt) checks KDoc-vs-signature drift? | detekt's rule only catches *signature* drift (param renamed/reordered), not semantic drift (the comment's claim about behavior became false while the signature stayed the same) — the harder, unsolved case. | [detekt comments](https://detekt.dev/docs/rules/comments/) | no | check | P2 — confirms DocChecker's ~72% ceiling (already covered) is the state of the art, nothing in this corpus beats it |
| Does golangci-lint's `comments` preset silently exclude findings the way `go-quality.md`'s own GO-CORE-02 already flagged, and does that change how this program should wire revive rules into CI? | Directly actionable operational finding already recorded in this fleet's own rules, now corroborated: a preset can hide doc-comment findings without erroring. | `go-quality.md` (this fleet), corroborated in spirit by revive's own configurability | yes (already found by this fleet) | check | P3 — confirmation, not new information |
| Should a "commented-out code" ban (ERA001/S125 pattern) extend from Python/multi-language SonarQube coverage into this program's Rust/TypeScript/Go rule depth files, where DOC-18 already exists for Rust only? | DOC-18 already bans this for Rust; ruff and Sonar prove the same check is standard practice elsewhere and worth explicit parity in the other language depth files. | ruff `commented_out_code.rs`, SonarQube S125 | partial (Rust only today) | check | P2 |
| What is the actual default severity/enablement state across these tools for doc-presence rules, and does defaulting a fleet rule to "off until configured" (SwiftLint's `missing_docs`) undercut the intended cut-and-hold ratchet? | Presence rules split roughly evenly between on-by-default (checkstyle, PMD `CommentRequired` when configured) and off-by-default (SwiftLint `missing_docs`, revive `comments-density` at floor 0) — a fleet adopting any of these needs to explicitly flip the default, not assume it. | cross-referenced across §14–§17 | no | check | P3 |

## Recent shifts seen in this corpus

- **Clippy shipped at least 9 of its 22 doc/comment lints within roughly the last 12–18 months relative to this research date** (versions 1.80.0 through 1.93.0; 1.93.0 is not yet a stable release as of 2026-09-27, meaning `DOC_PARAGRAPHS_MISSING_PUNCTUATION` is landing in this exact window). This is active, ongoing tooling investment in doc-comment correctness, not a settled area — a fleet pinning to an older clippy misses real recent lints, not just cosmetic ones.
- **`too_long_first_doc_paragraph` (2024, v1.82.0) and `empty_docs` (2024, v1.78.0) are themselves recent additions** — the length-cap and empty-doc-detection ideas this program wants to build on are less than two years old even in Rust's own tooling, meaning "no precedent for a length cap" would have been true as recently as 2023.
- **JSDoc's `informative-docs` and detekt's `Documentation*OverPrivate*` rules represent a shift toward checking comment *content* relative to code content**, not just structural presence — a meaningfully different (and harder to implement) class of check than anything in the Rust or Python catalogues, which remain purely structural even in their newest additions.
- **`eslint-plugin-unicorn`'s `expiring-todo-comments` generalizes TODO enforcement from "must have metadata" (author/link, the ruff TD family's approach) to "must resolve on a condition"** — a materially more capable model that postdates and supersedes the simpler author/link requirement as the state of the art for TODO governance.
- **JDK 10's `{@summary}` tag (already old by 2026 standards, but relevant precedent) shows that "first sentence = summary" heuristics were considered unreliable enough that a major, widely-used doc tool added explicit escape syntax** rather than improving the heuristic — evidence against relying on a bare period-detection heuristic for this program's own summary/detail split, in favor of an explicit marker.
- **Go's doc-comment markup language itself (headings, links, lists) is only from Go 1.19** — meaning the entire structured-markup convention `go.dev/doc/comment` describes, and everything `revive`/`staticcheck` check against, postdates most existing ocx code and is itself a "recent" convention by the standard of a codebase with older commits.
- **What agents writing/reading code changes for this corpus specifically**: nothing in the fetched linter/tool sources mentions AI-authored or AI-consumed code at all — every rule and threshold surveyed here was designed for a human reader and a human author. The only place "agents" appears in this cluster's material is this program's own frame and the prior ocx research (already covered). This is itself a finding: the tooling ecosystem has not yet adapted its comment rules for the agent-authorship shift the frame's hypotheses are about, so this program cannot borrow an "agent-era" length cap from any tool surveyed — it has to derive one from the reference-repo measurement (frame's H1/H2), not from tooling precedent.

## Contested

- **Comment density floor vs. ceiling.** `revive`'s `comments-density` and the underlying SonarQube metric are built to enforce a *minimum* (catch under-documented files); this program's premise is the opposite direction (ocx is over-documented). Both are real, shipped uses of the identical formula. Trend: no tool surveyed enforces both a floor and a ceiling simultaneously — that combination, if this program wants a ratchet with both, would be a genuinely novel configuration, not a precedented one.
- **Name-first vs. third-person-verb summary sentences.** Go/staticcheck require the doc comment to start with the item's name; Rust's own house rule (DOC-01) requires third-person present indicative starting with a verb. Both are actively enforced by real tools today; neither is trending toward the other in any source found. A cross-language code-docs index cannot state one template as universal.
- **Whether the first-sentence/first-paragraph heuristic is reliable enough to use un-escaped.** Javadoc's `{@summary}` tag and TypeDoc's `@summary` tag both exist specifically because their maintainers judged the plain heuristic (period-detection, blank-line-detection) insufficiently reliable for a subset of real doc comments. clap and Go, by contrast, ship no escape hatch beyond clap's blunter `verbatim_doc_comment` (all-or-nothing, not summary-specific). Trend: newer/more actively developed rendering tools (TypeDoc) are adding explicit override tags; older or more mechanical ones (clap, Go) are not — suggests this program's own summary/detail split should ship an explicit override from day one rather than relying purely on heuristic detection.
- **Whether a directive-suppression comment's minimum-reason-length should be enforced at all, and at what floor.** `ban-ts-comment`'s default of 3 characters is real but so low it is nearly cosmetic; `revive`'s `comment-spacings` takes a completely different approach (allow-list specific known-safe prefixes, no length check). No consensus number exists across the two approaches found.
- **Whether TODO governance should be metadata-based (author + link, the ruff/Sonar default) or condition-based (expiry on date/version, `expiring-todo-comments`).** The metadata approach is far more widely adopted (ruff, Sonar, checkstyle all use variants of it); the condition-based approach is more capable but found in exactly one tool in this survey. Trend unclear — not enough adoption data to call a direction, only to note the more expressive option exists and is unused elsewhere.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/rust-lang/rust-clippy — `clippy_lints/src/doc/mod.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/mod.rs) | Primary tool source (raw file, fetched in full) | master branch, fetched 2026-09-27; lints dated pre-1.29.0–1.93.0 | Ground truth for every clippy doc lint's exact name, group, and doc text — not a summary page |
| [github.com/rust-lang/rust-clippy — `missing_doc.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/missing_doc.rs) | Primary tool source | fetched 2026-09-27 | `MISSING_DOCS_IN_PRIVATE_ITEMS` exact rationale text |
| [github.com/rust-lang/rust-clippy — `undocumented_unsafe_blocks.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/undocumented_unsafe_blocks.rs) | Primary tool source | fetched 2026-09-27 | The one shipped "a reason comment is mandatory here" rule found in this survey |
| [github.com/rust-lang/rust-clippy — `too_long_first_doc_paragraph.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/too_long_first_doc_paragraph.rs) | Primary tool source | fetched 2026-09-27 | The 200-character threshold, read directly from the `if ... <= 200` check |
| [github.com/rust-lang/rust-clippy — `clippy_config/src/conf.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_config/src/conf.rs) | Primary tool source | fetched 2026-09-27 | `doc_valid_idents` config mechanics |
| [doc.rust-lang.org/rustdoc/lints.html](https://doc.rust-lang.org/rustdoc/lints.html) | Official rustdoc book page | fetched 2026-09-27 | Full 12-lint rustdoc-specific catalogue with default levels |
| [github.com/astral-sh/ruff — `crates/ruff_linter/src/codes.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/codes.rs) | Primary tool source (rule registry) | main branch, fetched 2026-09-27 | Authoritative full list of all 44 pydocstyle `D` codes and the flake8-fixme `FIX` codes |
| [github.com/astral-sh/ruff — `flake8_todos/rules/todos.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/rules/flake8_todos/rules/todos.rs) | Primary tool source | fetched 2026-09-27 | Full TD001–TD006 doc text, stable-since versions, exact examples |
| [github.com/astral-sh/ruff — `eradicate/rules/commented_out_code.rs`](https://raw.githubusercontent.com/astral-sh/ruff/main/crates/ruff_linter/src/rules/eradicate/rules/commented_out_code.rs) | Primary tool source | fetched 2026-09-27 | ERA001 exact rationale and documented false-positive mode |
| [docs.astral.sh/ruff/rules/commented-out-code](https://docs.astral.sh/ruff/rules/commented-out-code/) | Official rule doc page | fetched 2026-09-27 | Confirms ERA001 stability status independent of source comments |
| [github.com/gajus/eslint-plugin-jsdoc — rules directory listing](https://api.github.com/repos/gajus/eslint-plugin-jsdoc/contents/src/rules) | Primary tool source (directory listing via GitHub API) | main branch, fetched 2026-09-27 | Full 69-rule catalogue enumerated directly, not from a possibly-stale docs page |
| [github.com/gajus/eslint-plugin-jsdoc — `informative-docs.md`](https://raw.githubusercontent.com/gajus/eslint-plugin-jsdoc/main/.README/rules/informative-docs.md) | Primary tool source | fetched 2026-09-27 | The one shipped Ousterhout-test-as-a-check found in this survey |
| [typescript-eslint.io/rules/ban-ts-comment](https://typescript-eslint.io/rules/ban-ts-comment/) | Official rule doc page | fetched 2026-09-27 | Exact default config per directive and `minimumDescriptionLength` |
| [github.com/mgechev/revive — `RULES_DESCRIPTIONS.md`](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) | Primary tool source (full rule doc file) | fetched 2026-09-27 | `comments-density` and `comment-spacings` — no analogue found elsewhere |
| [staticcheck.dev/docs/checks](https://staticcheck.dev/docs/checks/) | Official tool doc page | fetched 2026-09-27 | ST1000/ST1020–ST1022 exact quoted descriptions |
| [checkstyle.org/checks/javadoc/index.html](https://checkstyle.org/checks/javadoc/index.html) | Official tool doc page | fetched 2026-09-27 | Full 34-check Javadoc catalogue |
| [docs.pmd-code.org/latest/pmd_rules_java_documentation.html](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html) | Official tool doc page | fetched 2026-09-27 | `CommentSize` exact defaults (maxLines 6, maxLineLength 80) — the second hard length cap found |
| [detekt.dev/docs/rules/comments](https://detekt.dev/docs/rules/comments/) | Official tool doc page | fetched 2026-09-27 | `DocumentationOverPrivate*` and `OutdatedDocumentation` — no analogue elsewhere |
| [realm.github.io/SwiftLint/orphaned_doc_comment.html](https://realm.github.io/SwiftLint/orphaned_doc_comment.html) | Official tool doc page | fetched 2026-09-27 | Exact triggering/non-triggering examples for detached-doc-comment detection |
| [docs.sonarsource.com — code-metrics/metrics-definition](https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition.md) | Official product doc page | fetched 2026-09-27 | Verbatim `comment_lines_density` formula — the metric revive's rule reimplements |
| [github.com/clap-rs/clap — `clap_derive/src/utils/doc_comments.rs`](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs) | Primary tool source | fetched 2026-09-27 | Exact `format_doc_comment` logic — the first-blank-line split that becomes `about`/`long_about` |
| [go.dev/doc/comment](https://go.dev/doc/comment) | Official language spec | fetched 2026-09-27 | Doc-comment markup grammar, Go-1.19-dated, quoted verbatim |
| [github.com/spf13/cobra — `site/content/user_guide.md`](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) | Primary tool source | fetched 2026-09-27 | Confirms `Short`/`Long` are hand-written fields, never doc-comment-derived |
| [typedoc.org/documents/Tags._summary.html](https://typedoc.org/documents/Tags._summary.html) | Official tool doc page | fetched 2026-09-27 | `@summary` vs `useFirstParagraphOfCommentAsSummary` precedence |
| [typedoc.org/documents/Tags._remarks.html](https://typedoc.org/documents/Tags._remarks.html) | Official tool doc page | fetched 2026-09-27 | One-`@remarks`-block-per-comment cap |
| [zod.dev/json-schema](https://zod.dev/json-schema) | Official library doc page | fetched 2026-09-27 | `.meta()`/`.describe()` → JSON Schema `description`, no length limit stated |
| [pydantic.dev/docs/validation/latest/concepts/json_schema](https://pydantic.dev/docs/validation/latest/concepts/json_schema/) | Official library doc page (redirect-followed) | fetched 2026-09-27 | Docstring-vs-`Field(description=)` precedence, quoted verbatim |
| [microsoft.github.io/language-server-protocol — 3.17 spec, `textDocument/hover`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_hover) | Official protocol spec | fetched 2026-09-27, partial | Confirms `MarkupContent` has no documented length field — flagged for re-fetch |
| [eslint-plugin-unicorn — `expiring-todo-comments.md`](https://raw.githubusercontent.com/sindresorhus/eslint-plugin-unicorn/main/docs/rules/expiring-todo-comments.md) | Primary tool source | fetched 2026-09-27 | Most expressive TODO-lifecycle mechanism found: 6 independent expiry conditions |
| [github.com/presmihaylov/todocheck](https://github.com/presmihaylov/todocheck) | Tool repository | identified via search 2026-09-27; **not independently fetched** | Cited only as a search-summary claim (issue-linked TODO resolution), flagged for re-verification |
| [github.com/pgilad/leasot](https://github.com/pgilad/leasot) | Tool repository | identified via search 2026-09-27; **not independently fetched** | Cited only as a search-summary claim, flagged for re-verification |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/rules/rust-quality/docs-and-tracing.md` | This fleet's existing rule (local file) | read 2026-09-27 | Baseline for every "already-covered" column judgment in the candidate table |
| `/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md` | Prior program research (local file, its adversarial critique treated as authoritative per task instructions) | 2026-09-27 | Source of the schemars-leak and pointer-resolution findings this survey corroborates from the tooling side |
