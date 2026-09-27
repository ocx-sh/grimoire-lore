---
title: Rendered doc-comment summaries
topic: rendered-summary
agent: code-docs-surfaces-scout
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 19
scope: |
  Covers what a doc comment's first paragraph must contain, how long it may run,
  and what five rendering surfaces (rustdoc module listings, clap `-h`/`--help`,
  LSP hover across four clients, Javadoc, TypeDoc) actually extract or truncate
  from it, grounded in fetched tool/protocol source plus first-paragraph-length
  measurement on four fleet repos against four reference repos. Also answers the
  folded-in module-front-page question (does a module doc say "why" once, or does
  every function repeat it) on ocx's top-25 highest-comment-mass files. Does not
  cover: schema/CLI-help jargon leakage (owned by the `interface-leak` dive),
  block-length caps for the *whole* doc comment beyond the first paragraph, or
  user-facing prose style (owned by `docs-quality`).
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Rustdoc's own summary contract: no drop, no truncate — just "everything before the blank line"](#1-rustdocs-own-summary-contract-no-drop-no-truncate--just-everything-before-the-blank-line)
  2. [clippy's `too_long_first_doc_paragraph`: the only hard cross-tool length cap, 200 chars](#2-clippys-too_long_first_doc_paragraph-the-only-hard-cross-tool-length-cap-200-chars)
  3. [Five rendering surfaces converge on one split point: the first blank line](#3-five-rendering-surfaces-converge-on-one-split-point-the-first-blank-line)
  4. [Hover across four clients: two show the whole block, two show nothing about length at all](#4-hover-across-four-clients-two-show-the-whole-block-two-show-nothing-about-length-at-all)
  5. [Javadoc `{@summary}` and TypeDoc `@summary`: the only two explicit override tags found](#5-javadoc-summary-and-typedoc-summary-the-only-two-explicit-override-tags-found)
  6. [Fleet measurement: first-paragraph length, four repos against four references](#6-fleet-measurement-first-paragraph-length-four-repos-against-four-references)
  7. [The failure mode measurement predicts: no paragraph break at all](#7-the-failure-mode-measurement-predicts-no-paragraph-break-at-all)
  8. [Module front pages: ocx's top-25 files, presence and per-function repetition](#8-module-front-pages-ocxs-top-25-files-presence-and-per-function-repetition)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- Rustdoc does **not** drop or truncate an over-long summary — the topic map's
  carried-forward claim ("a single missed period can make an item vanish") has
  no support in the rustdoc book's own page and should be retired. The book
  says only: "Everything before the first empty line will be reused to describe
  the component in searches and module overviews" ([how-to-write-documentation.html](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html), fetched 2026-09-27). Whatever is there, however long, renders.
- The one real, machine-checked length cap for a first paragraph anywhere in
  nine surveyed ecosystems is clippy's `too_long_first_doc_paragraph`: **>200
  characters** of the paragraph's rendered text, on items that appear on a
  module listing page, `nursery` group (opt-in) as of clippy on master fetched
  2026-09-27.
- Five independent tools split a doc comment at the identical point — **the
  first blank line** — for identical reasons: rustdoc's summary, clap's
  `about`/`long_about`, Click's `short_help`, TypeDoc's summary-vs-detail, and
  Go's synopsis. None of the five coordinate with each other; the convergence
  is structural, not copied.
- Hover clients split into two camps and neither the LSP spec nor any fetched
  client doc states a length contract: rust-analyzer and TypeScript's rewritten
  language service (`typescript-go`) show the **whole** doc/JSDoc comment
  (`docs.docs()` in [`hover/render.rs`](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/crates/ide/src/hover/render.rs); full JSDoc minus `@tag`s in [`hover.go`](https://raw.githubusercontent.com/microsoft/typescript-go/main/internal/ls/hover.go)'s `commentOnly` mode); pyright converts the **whole** docstring with no length constant found in [`docStringConversion.ts`](https://raw.githubusercontent.com/microsoft/pyright/main/packages/pyright-internal/src/analyzer/docStringConversion.ts). No client in this survey shows only the first paragraph on hover — that convention belongs to *listing* pages (rustdoc module index, TypeDoc module page), not to hover.
- The LSP 3.17 `Hover`/`MarkupContent` types, fetched in full, carry no size
  field of any kind — truncation, if any, is 100% client-side and undocumented
  at the protocol level ([hover.md](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/language/hover.md), [markupContent.md](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/types/markupContent.md), both fetched 2026-09-27).
- Measured 2026-09-27 (`comment_census.py --list-blocks --kind doc --scope prod`,
  first paragraph = text up to the first stripped-comment-marker-empty line):
  ocx's first-paragraph length runs **p50 72 / p90 206 chars** against
  clap's 61/117 and serde's 55/118 — the fleet's *median* is close to reference
  but its *tail* is 1.75-1.76x. grimoire is worse in the tail than ocx despite
  a lower overall comment ratio: **p50 71 / p90 255**, 2.16-2.18x reference.
- TypeScript is the worst outlier measured: grimoire-vscode **p50 195 / p90
  435 chars** against denoland/std's 64/174 and vite's 71/192 — a 2.3-3.0x gap,
  the largest of any language pair measured in this dive.
- Python is the one fleet repo that does **not** confirm the inflation
  hypothesis on this axis: ocx-sdk-python's first paragraph runs **p50 58 / p90
  71**, actually *shorter* at p90 than both psf/requests (151) and
  python-attrs/attrs (115). Zero of ocx-sdk-python's 457 doc blocks exceed 200
  characters, against 3.3-3.6% for the Python/Rust references measured. This
  contradicts the frame's general over-commenting hypothesis for at least this
  one axis on this one repo — worth citing as a limit on how far H1/H2
  generalize.
- 924/8,568 ocx doc blocks (10.8%) and 595/3,756 grimoire doc blocks (15.8%)
  have a first paragraph over 200 characters, against 0.7-6.7% across four
  reference repos. grimoire-vscode: **365/754 (48.4%)** — 7.2x denoland/std's
  6.7%.
- The mechanical reason: agents frequently write the whole rationale as one
  unbroken paragraph with **no internal blank line**, so every splitting tool's
  "short" text equals its "long" text. Measured on doc blocks of 6+ raw lines:
  ocx 3.7% have zero paragraph break, grimoire 10.3%, **grimoire-vscode 51.8%**
  — over half of grimoire-vscode's long doc comments have no split point at
  all, so whichever surface renders "the summary" renders the entire essay.
- Module front pages: of ocx's top-25 files by comment-mass (`census.md` §2),
  **8/25 (32%) carry no module (`//!`) doc at all**, despite being the
  highest-mass files in the repository. Of the 17 that do, **9 (53%) repeat
  the module doc's own ADR/plan-ID pointer two or more times across
  per-function `///` comments in the same file** — `render_toolchain.rs`
  repeats its module-level plan IDs 208 times across function docs;
  `toolchain_store.rs` 33 times; `activation.rs` 22 times. The "why" is stated
  once at the top and then re-stated, not referenced, at every call site.
- Rust's own DOC-01 already fixes summary *form* (one sentence, third-person,
  ends at the first blank line) but sets **no length cap** — this is the exact
  gap the P0 `length-cap` topic-map entry names, now sized for the first
  paragraph specifically.
- No shipped rule anywhere in this fleet's `python-quality`, `typescript-quality`
  or the Rust `docs-and-tracing.md` gives an **override** mechanism for a
  summary that must legitimately run long; Javadoc's `{@summary}` (JDK 10) and
  TypeDoc's `@summary` tag are the only two found, both because their own
  maintainers judged the bare first-sentence heuristic unreliable.

## Findings

### 1. Rustdoc's own summary contract: no drop, no truncate — just "everything before the blank line"

Source: [doc.rust-lang.org/rustdoc/how-to-write-documentation.html](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html), fetched 2026-09-27, the rustdoc book's own how-to page (not the lints reference page cited by the prior tooling survey).

Quoted directly: "Everything before the first empty line will be reused to describe the component in searches and module overviews," and separately, "It is good practice to keep the summary to one line: concise writing is a goal of good documentation." The page gives `std::env::args()`'s doc comment as a worked example of what ends up on the `std::env` module page. **The page does not say what happens if the first paragraph is very long or missing a closing period** — no drop, no truncation, no warning is documented anywhere on this page.

This directly corrects `code-docs-topic-map/tooling.md`'s carried-forward claim ("Rustdoc silently drops the summary line entirely if the first sentence is 'too long'... a single missed period can make an item vanish from a module listing with zero warning") — that claim was flagged there as unconfirmed ("undocumented exact threshold in the fetched page") and a direct fetch of the correct page finds no such behavior documented. Treat the "drop" claim as retracted; the actual failure mode is "renders in full, however long" (confirmed independently by measurement — see §6-7), which is a *different* problem needing a different fix (a length check, not a "make sure it ends with a period" check).

### 2. clippy's `too_long_first_doc_paragraph`: the only hard cross-tool length cap, 200 chars

Source: [`too_long_first_doc_paragraph.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/too_long_first_doc_paragraph.rs), fetched in full 2026-09-27, master branch.

The exact gate, read directly from source:

```rust
if first_paragraph_text_len <= 200
    || !matches!(
        item.kind,
        // This is the list of items which can be documented AND are displayed on the module
        // page. So associated items or impl blocks are not part of this list.
        ItemKind::Static(..)
            | ItemKind::Const(..)
            | ItemKind::Fn { .. }
            | ItemKind::Macro(..)
            | ItemKind::Mod(..)
            | ItemKind::TyAlias(..)
            | ItemKind::Enum(..)
            | ItemKind::Struct(..)
            | ItemKind::Union(..)
            | ItemKind::Trait { .. }
            | ItemKind::TraitAlias(..)
    )
{
    return;
}
```

Two things worth being exact about: (1) `first_paragraph_text_len` is the paragraph's **rendered plain text** length (markdown syntax stripped upstream before this function runs), not raw character count of the doc-comment lines — my own fleet measurement in §6 counts raw stripped-of-comment-marker characters and is therefore a conservative *upper bound* on what this exact lint would flag, not an exact reproduction of it. (2) The check is scoped to items that literally appear on a module listing page — `impl` blocks and associated items are explicitly excluded by the same comment in the source. The lint is `nursery` group (per `clippy_lints/src/doc/mod.rs`, corroborating the prior survey), meaning it does not fire under a bare `cargo clippy` without an explicit opt-in.

The lint also carries an auto-fix suggestion path: if the first doc line already ends in punctuation (`.`, `!`, `?`), it offers to insert a blank line after it, converting the over-long paragraph into a short summary plus a long-form continuation — i.e., its own fix is exactly the "make one paragraph into two, with a blank line" pattern this dive's §3 and §7 measure.

### 3. Five rendering surfaces converge on one split point: the first blank line

Source: [`clap_derive/src/utils/doc_comments.rs`](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs), fetched in full 2026-09-27 (re-confirms the prior tooling survey's paraphrase against the actual source rather than inheriting it); [TypeDoc `@summary`](https://typedoc.org/documents/Tags._summary.html), fetched 2026-09-27; Click's docs (search-corroborated, not independently re-fetched this pass — already primary-fetched in the prior tooling survey).

clap's own doc comment on the module states the rule in one line: `"#[derive(Parser)] works in terms of 'paragraphs'. Paragraph is a sequence of non-empty adjacent lines, delimited by sequences of blank (whitespace only) lines."` The mechanism, read directly from `format_doc_comment`:

```rust
} else if let Some(first_blank) = lines.iter().position(|s| is_blank(s)) {
    let short = lines[..first_blank].join("\n");
    let long = lines.join("\n");
    (Some(short), Some(long))
} else {
    let short = lines.join("\n");
    let long = force_long.then(|| short.clone());
    (Some(short), long)
}
```

No blank line anywhere in the comment → `short == long`: the entire doc comment becomes both the one-line `-h` summary and the full `--help` text. This is the exact mechanical trigger for the failure mode measured in §7.

TypeDoc's rule, quoted from the fetched page: "TypeDoc uses the first paragraph of comment's summary text (text before any block tags) as the member's summary on the modules page... if a `@summary` tag is present TypeDoc will render that block instead." Click's `short_help` defaults to the first sentence of a command's docstring, ellipsized with `...` if it overflows one line — the only one of the five that truncates visually rather than only splitting logically. Go's doc-comment synopsis (`go.dev/doc/comment`, fetched in the prior tooling pass) is "the first sentence" shown in listings and gopls hover, with no length guidance in the spec itself.

None of these five tools cite each other. The convergence is on the constraint every listing page shares — one line for the index, the rest for the detail page — not on shared design.

### 4. Hover across four clients: two show the whole block, two show nothing about length at all

Sources: [LSP 3.17 Hover Request](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/language/hover.md), fetched in full 2026-09-27 (the prior tooling survey's fetch was truncated mid-spec; this pass found the actual include file and fetched it whole); [`MarkupContent`](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/types/markupContent.md), fetched in full 2026-09-27; [rust-analyzer `hover/render.rs`](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/crates/ide/src/hover/render.rs), fetched 2026-09-27; [pyright `hoverProvider.ts`](https://raw.githubusercontent.com/microsoft/pyright/main/packages/pyright-internal/src/languageService/hoverProvider.ts) and [`docStringConversion.ts`](https://raw.githubusercontent.com/microsoft/pyright/main/packages/pyright-internal/src/analyzer/docStringConversion.ts), both fetched 2026-09-27; [`typescript-go` `internal/ls/hover.go`](https://raw.githubusercontent.com/microsoft/typescript-go/main/internal/ls/hover.go), fetched 2026-09-27.

**LSP 3.17 protocol.** The full `Hover` interface: `contents: MarkedString | MarkedString[] | MarkupContent; range?: Range`. `MarkupContent` is `{ kind: 'plaintext' | 'markdown'; value: string }` — no length field anywhere. The spec's only content-shaping note is a sanitization warning, not a truncation one: *"clients might sanitize the return markdown. A client could decide to remove HTML from the markdown to avoid script execution."* Both files were fetched to completion this pass (the prior survey's fetch of the monolithic `specification.md` cut off before reaching the Hover section, which is a Jekyll `{% include_relative %}` pulled from a separate file — `language/hover.md` — not inline in the page that was fetched before).

**rust-analyzer** shows the **whole** doc comment, not the first paragraph. `markup()` in `hover/render.rs` takes `docs.docs()` (the full stored doc string) and writes it verbatim into the hover buffer: `format_to!(buf, "{}", docs_str)`. The only doc-related toggle found is `config.documentation`, a boolean (matches search-corroborated evidence that this setting is on/off, not a length control) — there is no first-paragraph-only mode, no character cap, in this source path.

**pyright** converts the **whole** docstring. `hoverProvider.ts` passes the extracted `docString` straight to `docStringService().convertDocStringToMarkdown()` / `convertDocStringToPlainText()`; grepping the entire 872-line `docStringConversion.ts` for a length constant (`truncate`, `maxLen`, `substring(0`, `slice(0`) finds none — the three `slice(0, -1)` hits are all "drop the last character" cleanup on a builder string, unrelated to any cap. This corroborates the search-level finding that pyright's known hover problems are *correctness* bugs (docstring shown twice with certain client combinations, C-extension builtins have no docstring to show at all — Pylance papers over the second one with a runtime scraper) rather than a length-truncation policy.

**TypeScript's rewritten language service (`typescript-go`, the Go-based successor described in [Contested §1](#contested--evolving))** shows the whole JSDoc comment by default, with an explicit **content-scoping** mode rather than a length cap. Quoted directly from `hover.go`: `getDocumentationForSymbol` "tries each documentation source in turn (call-signature documentation, declaration JSDoc, root-symbol JSDoc, alias target JSDoc) and returns the first non-empty result, formatted for contentFormat. **commentOnly restricts the result to the JSDoc summary, excluding the `@tag` section.**" This is a real, shipped "summary vs. full" distinction — but it operates on *which content* (comment body vs. tags), not on *how much* of the comment body, and it exists to build a separate plain-text "VS rich hover" rendering path, not to cap paragraph length for the default hover. Separately, this codebase ships an experimental `HoverVerbosityLevel` capability that lets a client request progressively more detail — but the verbosity ladder expands the **type signature** (`vc.CanIncreaseVerbosity`, `checker.VerbosityContext`), not the documentation text; documentation is returned in full regardless of verbosity level.

**Conclusion for a code-docs rule**: no primary source anywhere in this survey licenses the assumption "the first paragraph is what shows in hover." Two of four clients show the whole block; none document a length contract at the protocol level. A code-docs rule that wants hover to show only a short summary must write that summary explicitly (the doc comment's real first paragraph, kept short per §2/§6) — it cannot rely on any client to do the truncation for it.

### 5. Javadoc `{@summary}` and TypeDoc `@summary`: the only two explicit override tags found

Sources: [Oracle JDK 21 `doc-comment-spec.html`](https://docs.oracle.com/en/java/javase/21/docs/specs/javadoc/doc-comment-spec.html), fetched 2026-09-27; [TypeDoc `@summary`](https://typedoc.org/documents/Tags._summary.html), fetched 2026-09-27.

Javadoc's spec, quoted: *"The first sentence of the main description should be a summary sentence that contains a concise but complete description of the declared entity."* The `{@summary text}` inline tag (JDK 10, JDK-8173425) exists as "an alternative to the default policy to identify and use the first sentence of the API description... The tag only has significance when used at the beginning of a main description." No length guidance and no algorithm detail (period-detection vs. `BreakIterator`) is given in the fetched spec text itself — the tag exists precisely because Oracle's own doclet maintainers judged the *bare* heuristic unreliable enough to need an escape hatch, not because they published a better heuristic.

TypeDoc's `@summary`, quoted: presence overrides the first-paragraph-as-summary default outright; absence plus `--useFirstParagraphOfCommentAsSummary` falls back to "the first paragraph of comment's summary text (text before any block tags)." Both tags are pure author overrides — neither tool auto-detects "this first sentence is unusual, use an override," and neither caps override length either.

No equivalent exists for Rust (clap's only escape hatch is `verbatim_doc_comment`, which disables *all* preprocessing including the short/long split, not a summary-only override) or for Go (no override found in the doc-comment spec fetched in the prior tooling pass).

### 6. Fleet measurement: first-paragraph length, four repos against four references

Method: `comment_census.py --root ROOT --list-blocks --kind doc --scope prod --format json` (ROOT=/home/mherwig/dev/ocx, one invocation per repo), run 2026-09-27 against the four commissioned fleet repos and against four repos in the reference corpus (`~/.cache/research-lang/exemplars/code-docs`, SHAs in `code-docs-audit/exemplars.tsv`), one matching each fleet repo's primary language. For each `doc`-kind block, comment markers were stripped per-language (`///`/`//!`/`/** */` for Rust, `/** */`/`//` for TypeScript, triple-quote markers for Python) and the block split at the first line whose stripped text is empty (this is the exact point rustdoc/clap/TypeDoc all split at — §3). Character count is on the joined, marker-stripped first paragraph. This is a conservative *upper bound* on what clippy's own `first_paragraph_text_len` would measure (§2), since it does not additionally strip Markdown syntax (backticks, link brackets) the way clippy's upstream markdown renderer does.

| Repo | Lang | n doc blocks | p50 chars | p90 chars | max | >200 chars (n / %) |
|---|---|---:|---:|---:|---:|---:|
| ocx | rust | 8,568 | 72 | 206 | 888 | 924 / 10.8% |
| grimoire | rust | 3,756 | 71 | 255 | 1,056 | 595 / 15.8% |
| ref: clap-rs/clap @ `6cde738` | rust | 222 | 61 | 117 | 397 | 8 / 3.6% |
| ref: serde-rs/serde @ `6693a89` | rust | 425 | 55 | 118 | 362 | 3 / 0.7% |
| ocx-sdk-python | python | 457 | 58 | 71 | 102 | 0 / 0.0% |
| ref: psf/requests @ `611c616` | python | 213 | 52 | 151 | 299 | 7 / 3.3% |
| ref: python-attrs/attrs (extra) | python | 152 | 61 | 115 | 264 | — |
| grimoire-vscode | ts | 754 | 195 | 435 | 1,117 | 365 / 48.4% |
| ref: denoland/std @ `f834d02` | ts | 1,087 | 64 | 174 | 1,063 | 73 / 6.7% |
| ref: vitejs/vite (extra) | ts | 214 | 71 | 192 | 1,184 | — |

Reading:

- **Rust**: ocx's median (72) sits close to both references (55-61); its p90 (206) is 1.75-1.76x theirs, and its raw over-200 rate (10.8%) is 3-15x. grimoire is worse in the tail than ocx (p90 255, 2.16-2.18x reference; 15.8% over-200) despite grimoire's overall comment:code ratio (0.65) sitting well below ocx's (0.89, per `code-docs-frame.md`) — length inflation of the rendered summary and overall comment density are not the same failure and do not move together.
- **Python is the one language here that does not confirm the tail-inflation pattern**: ocx-sdk-python's p90 (71) is *below* both python-attrs (115) and requests (151), and its over-200 rate is exactly zero against references' 3.3%. This is a genuine counter-example to the general "AI-authored code inflates comments" framing this program otherwise supports — on this specific axis (rendered first-paragraph length), one fleet Python repo is already better than two human reference libraries.
- **TypeScript is the clear worst case**: grimoire-vscode's median (195) already exceeds both references' p90 (174, 192); its own p90 (435) is 2.3-2.5x reference p90, and 48.4% of its doc blocks would need rewriting against a 200-char cap versus 6.7% for denoland/std. This is the strongest single number in this dive for "if the fleet only fixes one language's rendered summaries first, fix TypeScript's."

### 7. The failure mode measurement predicts: no paragraph break at all

Method: same block extraction as §6, restricted to blocks of 6 or more raw comment lines (long enough that a real paragraph break would matter), comparing each block's first-paragraph character length against its whole-block character length. Equal lengths mean the block has **zero** internal blank-marker line — no `///` (or equivalent) with empty text anywhere inside it.

| Repo | Doc blocks ≥6 lines | Zero paragraph breaks (n / %) |
|---|---:|---:|
| ocx | 3,589 | 134 / 3.7% |
| grimoire | 1,071 | 110 / 10.3% |
| grimoire-vscode | 195 | 101 / 51.8% |

This is the mechanical explanation behind §3's "short == long" clap behavior and §6's TypeScript outlier: over half of grimoire-vscode's long doc comments have no blank line anywhere in them, so any tool that splits at the first blank line (rustdoc, clap, TypeDoc) does not split at all — the entire multi-paragraph essay becomes the rendered summary verbatim. grimoire's 10.3% and ocx's 3.7% are smaller but not zero; ocx's better paragraph discipline (more comments overall, but more of them correctly broken into a short lead paragraph) is consistent with its lower over-200 rate in §6 despite similar or higher total comment volume.

### 8. Module front pages: ocx's top-25 files, presence and per-function repetition

Method: the 25 files named in `code-docs-audit/census.md` §2 ("Sweep list — top 25 files by comment lines held in blocks >10") were read directly from `/home/mherwig/dev/ocx` at HEAD. For each file: does it open with a `//!` module doc (after skipping any SPDX/copyright header)? If yes, does that module doc contain an ADR/plan/decision-ID token (`adr_*`, `plan_*`, or a `LETTERS-digits` code such as `C-044`)? If it does, how many times does that *same* token reappear inside a `///` (per-item) doc comment later in the file?

- **8/25 (32%) have no `//!` module doc at all**: `env.rs`, `activation.rs`'s sibling `resolve.rs`, `client.rs`, `chained_index.rs`, `local_index.rs`, `shell.rs`, `context.rs`, `state_store.rs` — these are among the highest-comment-mass files in the entire 636-file prod tree, yet none states, in one place, why the module exists.
- **17/25 (68%) do carry one**, and most state a real rationale rather than a restated signature — e.g. `crates/ocx_config/src/loader.rs`: "Discovery is deliberately separated from loading so that future tiers... can be added by extending [`ConfigLoader::discover_paths`] without rewriting any other function"; `crates/ocx_announce/src/forge/gitlab.rs`: "The second [`Forge`] implementation, holding the identical announce contract against a very different API. Three differences shape the whole file."
- **Of those 17, 9 (53%) repeat the module doc's own ADR/plan-ID token two or more times inside later `///` comments in the same file**, rather than stating it once and letting later comments describe local mechanism only:

| File | Module-doc ID tokens | Times repeated in per-function `///` docs |
|---|---|---:|
| `crates/ocx_package_manager/src/tasks/render_toolchain.rs` | 26 tokens (`C-003`…`C-084`, `RUL-*`, `plan_toolchain_activation`) | 208 |
| `crates/ocx_store/src/file_structure/toolchain_store.rs` | `C-001, C-002, C-004, C-010, C-052, C-078` | 33 |
| `crates/ocx_package_manager/src/activation.rs` | `A-11, C-018, C-028` | 22 |
| `crates/ocx_shell/src/shell/hook.rs` | `A-21, C-043, C-045, C-050` | 14 |
| `crates/ocx_index/src/store.rs` | `adr_index_indirection`, `CWE-22` | 6 |

`render_toolchain.rs` is the extreme case: a module doc names 26 distinct plan/rule IDs, and per-function doc comments in the same file cite one of those same 26 tokens 208 more times. This is a module whose "why" is not stated once and pointed back to — it is restated, token by token, at nearly every call site, which is exactly the plan-ID-collision failure this program's `plan-ids` dive measures from the other direction (0/30 sampled `C-` IDs resolve uniquely fleet-wide).

## Normative guidance candidates

1. **Rust: enable clippy's `too_long_first_doc_paragraph` at the workspace level rather than building a Rust-specific length check.** Rationale: the exact check this program needs for Rust already ships upstream and does the file/span/suggestion work correctly — writing a second one duplicates it and risks disagreeing with `cargo clippy`'s own output. Verify: `rg -n --glob 'Cargo.toml' -e 'too_long_first_doc_paragraph' .` finds it declared under `[workspace.lints.clippy]` (`warn` or `deny`), then `cargo clippy --workspace --all-features -- -D warnings` is clean. On ocx today (2026-09-27, not yet enabled): 924 of 8,568 doc blocks already exceed the 200-char paragraph the lint checks (§6) — phase in as a ratchet (baseline the current count, forbid growth) rather than a blocking gate on day one. **MUST** (new code) / phase-in ratchet (existing code).

2. **Every other language's doc-comment first paragraph is capped at 200 rendered characters, the same number clippy already enforces for Rust.** Rationale: no ecosystem outside Rust clippy and PMD's differently-shaped `CommentSize` (which counts whole non-header blocks in lines, not the summary paragraph in characters) has a shipped equivalent (`tooling.md` §1-19 survey, 33 sources); reusing Rust's own number keeps the fleet's cross-language rule single and avoids inventing a second arbitrary threshold that a reviewer has to justify separately. Verify: extend `comment_census.py`'s `--list-blocks --kind doc --format json` output with a first-paragraph-length field (split block text at the first line whose comment-marker-stripped text is empty, per §6's method) and flag `len > 200`; this dive's own script (ad hoc, not yet in the checks/ tree) found on 2026-09-27: ocx 10.8%, grimoire 15.8%, grimoire-vscode 48.4%, ocx-sdk-python 0.0%. **MUST**.

3. **A doc comment longer than one paragraph MUST contain at least one internal blank comment line before the 200-char cap is reached.** Rationale: this is the single mechanical trigger behind every measured outlier — clap's `format_doc_comment`, rustdoc's summary split and TypeDoc's summary/detail split all key off "is there a blank line," so a long comment with none makes its *entire* text the rendered summary everywhere at once (§3, §7). Verify: for blocks ≥6 raw lines, first-paragraph length equal to whole-block length is the finding; measured 2026-09-27: ocx 3.7%, grimoire 10.3%, grimoire-vscode 51.8% of long blocks fail this today. **MUST**.

4. **An explicit summary-override tag is allowed only where the target tool already defines one (`{@summary}` for Javadoc/KDoc-adjacent Java, `@summary` for TypeDoc-rendered TypeScript); Rust and Go get no override — the 200-char cap is not negotiable for them via any tag.** Rationale: Javadoc and TypeDoc added their override specifically because their own maintainers judged the bare first-sentence heuristic unreliable for some real comments (§5) — reusing an existing, tool-recognized override is cheaper and more interoperable than inventing a fleet-only one, but no such tag exists for clap or rustdoc to hook into, so a Rust "override" would only fool this program's own check while every downstream renderer still shows the raw (long) text. Verify: `rg -n --glob '*.java' --glob '*.kt' -e '\{@summary' .` and `rg -n --glob '*.ts' --glob '*.tsx' -e '@summary' .` are the only two accepted escape hatches; a Rust or Go file over the cap with no paragraph break is always a finding, no override grep applies. **SHOULD** (documents the exception, does not by itself relax the cap).

5. **A file whose doc-comment mass places it in the fleet's top-N by comment lines (reuse `comment_census.py`'s existing sweep-list ordering, `census.md` §2's method) MUST open with exactly one module-level doc comment (`//!`, module docstring, or file-header block comment) stating why the module exists.** Rationale: 8 of ocx's own top-25 highest-mass files have none today (§8) — these are the files where a cold agent most needs a one-paragraph orientation before reading 300+ lines of per-function comments, and they are exactly the files currently missing it. Verify: `comment_census.py --root ROOT --list-blocks --min-block 20` (ROOT=the repo directory) already surfaces the sweep list; for each listed FILE, `sed -n '1,15p' FILE` — no `//!`/module-docstring line before the first item declaration is the finding. Watched red 2026-09-27 on `crates/ocx_config/src/env.rs` (in the sweep list, confirmed no module doc by direct read). **SHOULD** (existing top-mass files) / **MUST** (new files entering the top-N band).

6. **Within one file, an ADR/plan/decision-ID token may appear in at most one doc comment; every other occurrence is either deleted (the module doc already established it) or replaced with a plain-register note carrying no ID.** Rationale: measured 2026-09-27, 9 of ocx's 17 top-mass files with a module doc repeat its own ID token 2-208 times in per-function comments (§8) — this is per-function restatement of a "why" that a reader already has from the module front page, and it is the same token-collision surface the `plan-ids` dive independently flags as unresolvable fleet-wide (0/30 sampled `C-` IDs resolve uniquely). This rule is narrower than that dive's fleet-wide ID ban: it fires only on *repetition within one file*, which a per-file grep can catch today without waiting for that dive's fleet-wide regex and exclusion list to land. Verify: FILE=path/to/module.rs; `rg -o --glob '*.rs' -e 'adr_[a-z_]+' -e 'plan_[a-z_]+' -e '\b[A-Z]{1,4}-[0-9]+\b' "$FILE" | sort | uniq -c | awk '$1>1'` — any line is a finding. Watched red 2026-09-27 on `crates/ocx_package_manager/src/tasks/render_toolchain.rs` (26 distinct IDs, several repeating 5+ times). **SHOULD** (defers the exact ID grammar and exclusion list to the `plan-ids` dive; this rule's own check is a narrower, already-runnable proxy).

7. **A code-docs rule must never claim that a specific hover client truncates or shows only the first paragraph of a doc comment — state the summary/detail split as a listing-page (module index, `--help`, generated schema/API-doc) behavior only.** Rationale: two of four hover clients fetched in full (rust-analyzer, typescript-go) show the whole comment on hover by default, and the LSP 3.17 `MarkupContent`/`Hover` types carry no length field at all (§4) — a rule that says "the reader will see only the summary on hover" is asserting unverified, and in two of four cases *false*, client behavior. **MUST** (a documentation-accuracy rule for the rule set itself, not a code check — verified by review against §4's fetched sources on any future edit to this rule).

8. **Where a first paragraph legitimately needs the header-level "why" this program's `routing-table` dive would otherwise push into a decision record, keep exactly one file-qualified pointer (path + anchor, per the `pointer-form-and-check` dive's convention once it lands) in the module doc and nowhere else in the file.** Rationale: this is the positive form of rule 6 — the fix for "why is missing from N functions" is never "copy the pointer into all N," it is "state it once, at the top, and let per-function comments describe only the local mechanism." No new verification beyond rule 6's repetition check and the `pointer-form-and-check` dive's resolution check once both exist. **SHOULD**.

## AI-agent angle

- **Writing the entire rationale as one unbroken paragraph.** An agent asked to explain *why* a module or function looks the way it does tends to produce one dense paragraph rather than a short lead sentence plus elaboration — because the prompt is "explain," not "summarize then explain." Measured directly: 51.8% of grimoire-vscode's long doc blocks and 10.3% of grimoire's have zero internal blank line (§7). The smallest mechanical check: flag any doc block ≥6 lines whose stripped first-paragraph length equals its stripped whole-block length (rule 3's verify command) — this needs no NLP, only the same block/line data `comment_census.py` already produces.
- **Restating the module's "why" at every call site instead of pointing back to it.** Once an agent has stated a rationale in a module doc, later edits to individual functions in the same file tend to re-derive and re-state the same rationale (with the same ID token) rather than writing "see the module doc" or omitting it. Measured: 9/17 of ocx's top-mass module-documented files repeat their own ID token 2-208 times (§8). The smallest mechanical check: rule 6's per-file token-frequency grep — a token count of 1 is fine, 2+ is the finding, with zero natural-language judgment required.
- **Assuming a hover tooltip will do the truncation for it.** An agent writing a long first paragraph "because hover will just show the summary" is relying on client behavior no primary source in this survey documents, and which two of four fetched clients (rust-analyzer, typescript-go) actively contradict — they show the whole block. The smallest mechanical check: none needed beyond the length cap itself (rule 2) — the assumption is wrong regardless of length, so the fix is "keep the first paragraph short because it renders everywhere long text renders," not "keep it short because hover will cut it off."
- **Treating `{@summary}`/`@summary` as available everywhere.** An agent porting a Rust or Go doc comment pattern from a Java/TypeScript file (or vice versa) may reach for a summary-override tag where the target language's toolchain does not recognize one at all (clap has no summary-only override; Go's spec defines none). The smallest mechanical check: rule 4's language-scoped grep — a `{@summary}` or `@summary` tag found inside a `.rs` or `.go` file is itself a finding (dead syntax, silently ignored by every tool that would read it).

## Contested / evolving

1. **TypeScript's language-service backend has moved off the JavaScript `tsserver` implementation this dive expected to fetch.** `microsoft/TypeScript`'s repository, as of this fetch (2026-09-27), no longer contains a `src/services/` tree with a JS-based `symbolDisplay.ts`; the package now ships from `packages/typescript/src/{api,ast,enums,internal}`, and the actual language-service logic (hover, quick info) now lives in the separate `microsoft/typescript-go` repository (`internal/ls/hover.go`), a Go implementation. This is a live, in-progress rewrite (the "Corsa"/native-TypeScript-compiler project), not a settled fact this dive can assume stays true — a future re-read of this rule should re-verify which repository is authoritative before citing TypeScript hover behavior. As of this fetch, `typescript-go`'s hover shows the full JSDoc body (minus `@tag`s in `commentOnly` mode) and adds an experimental `HoverVerbosityLevel` capability that expands the **type signature**, not the doc text, on repeated request — a genuinely new (2026) hover-verbosity model with no precedent in the other three clients fetched.
2. **Whether the first-sentence heuristic is reliable enough to use unescaped is trending toward "no" among actively-developed tools, unchanged among mechanical ones.** TypeDoc and Javadoc both ship an explicit override (§5); clap and Go ship none (§3) and show no sign of adding one. This dive's own recommendation (rule 4) follows the newer tools' judgment rather than the older ones' silence, but the newer tools are also the ones with a plugin/tag architecture flexible enough to add an override cheaply — clap and rustdoc's simpler split-on-blank-line mechanism may never grow one, which is itself a reason to hold Rust/Go to the cap with no escape hatch (rule 4) rather than wait for tooling that may not arrive.
3. **Name-first vs. third-person-verb summary conventions remain genuinely split and this fleet already ships both.** Go's `staticcheck` (ST1020-ST1022, fetched in the prior tooling pass) and this fleet's own `GO-API-04` ("every exported identifier a doc comment whose first word is its name") require the doc comment to open with the item's name; Rust's `DOC-01` requires the opposite (third-person present indicative, "Returns the resolved digest," never "resolve_digest returns..."). Neither is trending toward the other. A cross-language `code-docs` index entry on first-paragraph *form* cannot state one template — it must route to each language's existing convention (DOC-01 for Rust, GO-API-04 for Go) rather than invent a third.

## Decisions this dive proposes

- **First-paragraph content, per language**: Rust keeps DOC-01's existing form rule (one sentence, third-person present indicative, ends at the first blank line) unchanged — this dive adds only a length cap, not a content change. Python, TypeScript, Go, Java and Kotlin get no new content-form rule from this dive; each already has (Go: GO-API-04) or lacks (Python, TypeScript: confirmed by grep, no shipped summary-form rule) a convention, and inventing one cross-language template would contradict the Go/Rust split documented in Contested §3. Reason: a form template this dive could write would either duplicate DOC-01/GO-API-04 or contradict them; the gap this dive can actually close cleanly is length, which is language-agnostic.
- **Length cap**: 200 rendered characters for the first paragraph, uniformly across every language in this program's scope, enforced for Rust via clippy's existing `too_long_first_doc_paragraph` (rule 1) and via a `comment_census.py` extension for the rest (rule 2). Reason: reusing one number that a real, widely-run tool already picked avoids a second arbitrary threshold, and this dive's own fleet measurement (§6) shows 200 chars is not a number picked out of the air for this fleet either — it sits almost exactly at ocx's own current p90 (206), meaning the cap starts by flagging the fleet's existing worst decile rather than an unreachable ideal.
- **Override policy**: allowed only through a tool-recognized tag (`{@summary}`, `@summary`) where the target ecosystem defines one; no fleet-invented override syntax, and no override at all for Rust or Go (rule 4). Reason: an override that only this program's own check understands does nothing for the actual rendering surfaces (rustdoc, clap, hover) that will still show the raw over-long text — an override is worth adding only where it changes what a real tool renders.
- **Module front-page rule**: every file in the fleet's existing comment-mass sweep-list ordering (`census.md` §2's method, reused rather than re-invented) must carry exactly one module-level doc stating why the module exists, and any ADR/plan-ID token that doc introduces may not repeat inside the same file's per-function comments (rules 5-6). Reason: this is the cheapest fix for the pattern §8 measured directly on ocx (8/25 top files with no module doc, 9/17 of the rest repeating their own pointer up to 208 times) and needs no new tooling — it is a narrower, already-checkable instance of work the `plan-ids` and `pointer-form-and-check` dives will generalize.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [doc.rust-lang.org/rustdoc/how-to-write-documentation.html](https://doc.rust-lang.org/rustdoc/how-to-write-documentation.html) | Official rustdoc book page (primary) | fetched 2026-09-27 | The actual summary-line contract; corrects the prior survey's unconfirmed "drops the summary" claim |
| [clippy `too_long_first_doc_paragraph.rs`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/too_long_first_doc_paragraph.rs) | Primary tool source, fetched in full | master, fetched 2026-09-27 | The exact 200-char gate and its item-kind scope, read from the `if ... <= 200` check itself |
| [clap `clap_derive/src/utils/doc_comments.rs`](https://raw.githubusercontent.com/clap-rs/clap/master/clap_derive/src/utils/doc_comments.rs) | Primary tool source, fetched in full (independently re-fetched this pass) | fetched 2026-09-27 | `format_doc_comment`'s exact first-blank-line split logic between `about`/`long_about` |
| [LSP 3.17 Hover Request](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/language/hover.md) | Official protocol spec, the actual include file, fetched in full | fetched 2026-09-27 | The prior survey's fetch of the monolithic spec page truncated before this section; this is the complete `Hover`/`HoverParams` definition |
| [LSP 3.17 `MarkupContent`](https://raw.githubusercontent.com/microsoft/language-server-protocol/gh-pages/_specifications/lsp/3.17/types/markupContent.md) | Official protocol spec, fetched in full | fetched 2026-09-27 | Confirms no length field on the type hover content is carried in; only a sanitization note |
| [rust-analyzer `crates/ide/src/hover/render.rs`](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/crates/ide/src/hover/render.rs) | Primary tool source, fetched | fetched 2026-09-27 | `markup()`'s `docs.docs()` call proves the whole doc comment renders on hover, not just the first paragraph |
| [pyright `hoverProvider.ts`](https://raw.githubusercontent.com/microsoft/pyright/main/packages/pyright-internal/src/languageService/hoverProvider.ts) | Primary tool source, fetched | fetched 2026-09-27 | Shows the docstring pipeline into `convertDocStringToMarkdown`/`PlainText`, no paragraph splitting |
| [pyright `docStringConversion.ts`](https://raw.githubusercontent.com/microsoft/pyright/main/packages/pyright-internal/src/analyzer/docStringConversion.ts) | Primary tool source, fetched in full (872 lines, grepped for length constants) | fetched 2026-09-27 | Confirms no truncation/length constant anywhere in the docstring-to-markdown converter |
| [`microsoft/typescript-go` `internal/ls/hover.go`](https://raw.githubusercontent.com/microsoft/typescript-go/main/internal/ls/hover.go) | Primary tool source, fetched | fetched 2026-09-27 | The current (post-rewrite) quick-info/hover implementation; `commentOnly` mode and the new `HoverVerbosityLevel` capability |
| [Oracle JDK 21 `doc-comment-spec.html`](https://docs.oracle.com/en/java/javase/21/docs/specs/javadoc/doc-comment-spec.html) | Official language spec | fetched 2026-09-27 | The `{@summary}` tag's exact wording and its "alternative to the default policy" framing |
| [TypeDoc `@summary`](https://typedoc.org/documents/Tags._summary.html) | Official tool doc page | fetched 2026-09-27 | `@summary` vs. `useFirstParagraphOfCommentAsSummary` precedence, quoted verbatim |
| `rules/rust-quality/docs-and-tracing.md` (this worktree) | Fleet rule (primary, local) | read 2026-09-27 | DOC-01's existing form rule and its verification command, the baseline this dive adds a length cap onto |
| `rules/go-quality/api-design.md` (this worktree) | Fleet rule (primary, local) | read 2026-09-27 | GO-API-04, confirming this fleet already ships the "name-first" convention Contested §3 discusses |
| `.agents/research/code-docs-topic-map/tooling.md` (this worktree) | Prior research artifact (secondary, internal) | 2026-09-27 | The wave-1 survey this dive was commissioned to deepen; several of its claims (LSP truncation, rustdoc drop behavior) are corrected here against fresh primary fetches |
| `.agents/research/code-docs-audit/census.md` §2 (this worktree) | Fleet measurement (primary, local) | 2026-09-27 | The top-25-by-mass file list §8's module-front-page count was run against |
| `/home/mherwig/dev/ocx` at HEAD | Fleet repo (primary, measured directly) | measured 2026-09-27 | First-paragraph length distribution (§6) and module-doc/ID-repetition count (§8) |
| `/home/mherwig/dev/grimoire`, `/home/mherwig/dev/ocx-sdk-python`, `/home/mherwig/dev/grimoire-vscode` at HEAD | Fleet repos (primary, measured directly) | measured 2026-09-27 | First-paragraph length distributions and paragraph-break rates (§6-7) |
| `~/.cache/research-lang/exemplars/code-docs/{clap-rs__clap, serde-rs__serde, psf__requests, denoland__std}` | Reference corpus, pinned SHAs in `code-docs-audit/exemplars.tsv` (primary, measured directly) | measured 2026-09-27 | The four reference distributions §6's comparison is built on, one per fleet repo's language |
| `~/.cache/research-lang/exemplars/code-docs/{python-attrs__attrs, vitejs__vite}` | Reference corpus, extra repos beyond the required four (primary, measured directly) | measured 2026-09-27 | Corroborate the clap/serde and denoland/std distributions with a second reference point per language |
