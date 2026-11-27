---
title: Recent upstream shifts the code-docs pair does not mention
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 17
---

# Recent upstream shifts the code-docs pair does not mention

Scope: a delta scan from 2026-09-27 to 2026-11-27 for upstream changes that would need a new rule, a new generator row or a changed severity in `rules/code-docs.md` or `skills/code-docs-reference/`. Existing claims are not re-checked, except the GRD-05 citation, which the commission asked to check. The honest headline is that the window holds no change that forces a new MUST rule. Nothing found would conflict with the caps in `rules/code-docs.md`. Anything dated on or before 2026-09-27 is excluded from the ranked list.

Method note: the web tools return page text through a small summarising model, so every fact below is what that fetch reported for the page named, not a raw copy. Search snippets were used only to find URLs. Where a primary page did not show a year or a detail, it is marked "could not determine".

## Contents

1. Ranked candidate shifts
2. GRD-05 citation check
3. Claims at risk
4. Excluded as dated on or before the baseline
5. Could not determine
6. Sources

## 1. Ranked candidate shifts

Ranked by how much the pair would change. None is a MUST.

### 1. GRD-05 rationale: second source for comment-borne injection (amend, low priority)

- Source: [arXiv 2611.28763, "Who Is Prompt-Injecting Coding Agents?"](https://arxiv.org/abs/2611.28763), submitted 2026-11-21, v1 only.
- What changed: a 145-million-item GitHub study found 2,281 validated hidden AI-directed texts in issues, pull requests and comments, plus 107 READMEs. About two thirds are first-party orchestration markers. Replayed attacks succeeded 19 percent of the time on one small model and never once HTML comments were stripped.
- Limit: it covers GitHub issue, pull-request and README text, not source-code comments. It supports the general claim in GRD-05 that agent-readable comment text is an injection vector, and nothing more.
- Touches: `skills/code-docs-reference/guards.md`, GRD-05 rationale column.
- Verdict: amend existing rule. Add this paper as a second citation only after the first citation is fixed (see section 2), because the current cite does not support the sentence it is attached to.
- Verification: a reviewer opens the cited abstract and confirms it says imperative or hidden text in text agents read is the attack and that stripping it is the mitigation.

### 2. springdoc-openapi MCP support: a Java generator row for surfaces.md (amend, CONSIDER)

- Source: [springdoc-openapi CHANGELOG](https://raw.githubusercontent.com/springdoc/springdoc-openapi/main/CHANGELOG.md) lists 3.2.0 on 2026-10-24 and 3.2.1 on 2026-11-20. Per the search result for its docs, 3.2.0 registers OpenAPI operations as MCP tools, and `@McpToolDescription` on a controller method overrides the OpenAPI summary or description in the tool definition. That description-override detail came from a search summary of the docs, not from a page I opened, so treat it as unconfirmed.
- What changed: a Java and Kotlin Spring stack can now publish tool text from annotation strings (`@Operation`, `@McpToolDescription`). The MCP row in `surfaces.md` ("What Interface Text Is") names only rmcp. The 3.2.1 entries I read concern input-schema structure, not description text.
- Touches: `skills/code-docs-reference/surfaces.md`, the generator table (a new row for Spring and springdoc MCP and OpenAPI), and SRF-01 and SRF-03 for the output-side test.
- Verdict: amend existing rule. The row would read: source is annotation strings, not Javadoc, so the doc-comment source scan does not see it. The output-side test is the serialized tool list or the OpenAPI document fed to `checks/interface_leak.py`.
- Why only CONSIDER: no evidence yet that Javadoc itself flows into the description, and the census does not lex annotation strings.
- Verification: `python3 checks/interface_leak.py <openapi.json>` on the generated document exits 0.

### 3. Rust 1.100 `invalid_markdown_table` rustdoc lint (no action)

- Source: [Rust RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md) lists 1.100.0 on 2026-11-12 adding it. The [rustdoc lints page](https://doc.rust-lang.org/rustdoc/lints.html) documents it as warn by default: an unescaped `|` in a table row creates an extra column and rustdoc drops the rest.
- Touches: nothing in this pair. It is a markdown correctness lint, owned by rust-quality's doc rules, and it is not a comment-policy lint. It does not change GRD, LEN or SRF.
- Verdict: no action. Route to the rust-quality refresh if it keeps a rustdoc lint list.
- Verification: `cargo doc` warns on a doc table containing `code_with(|arg| arg)`.

### 4. Rust 1.99 rustdoc changes (no action)

- Source: [Rust RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md), 1.99.0 dated 2026-10-01: a new `unused_footnote_definition` rustdoc lint (the default level did not appear in the page I read, so it is undetermined), a warning on an invalid `doc` attribute on a macro invocation, and invalid attributes in doc code blocks becoming an error.
- Touches: none of the pair's rules. All three are about doc syntax, not about what comments say or how long they are.
- Verdict: no action.

### 5. Clippy 1.99 and 1.100 doc-lint fixes (no action)

- Source: [clippy CHANGELOG](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md). Rust 1.99 fixed `unnecessary_safety_comment` for compound assignments and a `doc_paragraphs_missing_punctuation` false positive. Rust 1.100 added `WebAuthn` to the default `doc-valid-idents`. The two new 1.100 lints, `option_zip_none` and `needless_nonzero_get`, are not about docs. No docs lint was added or moved.
- Touches: `surfaces.md` SRF-04 names `too_long_first_doc_paragraph` only; its status was not re-checked here and I read no move for it. A fix to the SAFETY-comment lint touches GRD-01's mandated `SAFETY:` label only as a false-positive fix.
- Verdict: no action. Confirms that no clippy lint became an owner under GRD-08 in this window, as far as the first 100,000 characters of the changelog show.

### 6. Ruff 0.17.0 and 0.17.2 (no action)

- Source: [Ruff CHANGELOG](https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md). 0.17.0 (2026-10-09): `E501` and `W505` now ignore trailing pragma comments when computing line length; preview rule `RUF067` allows docstrings in strict mode. 0.17.2 (2026-10-22): `D417` treats backslash-escaped `*args` and `**kwargs` as documented. No new docstring or comment lint.
- Touches: if `length.md` ever counts comment width through Ruff `W505`, pragma comments no longer count. The pair's caps are line counts from its own census, so nothing changes.
- Verdict: no action.

### 7. MCP SDK releases (no action)

- Source: [Python SDK releases](https://github.com/modelcontextprotocol/python-sdk/releases) show v2.3.0 on 2 October; [TypeScript SDK releases](https://github.com/modelcontextprotocol/typescript-sdk/releases) show 2.3.1 on 5 October and 2.4.0 on 23 October (the pages gave no year). Neither page mentions a change in where tool descriptions come from, and no docstring or JSDoc fallback appeared. The TypeScript 2.4.0 "Skills over MCP" item came from an aggregator search summary only and was not confirmed.
- Touches: the MCP row in `surfaces.md`, which today covers rmcp's `///` fallback.
- Verdict: no action. A later read of the Python SDK's `Tool.from_function` source would be needed to know whether a docstring fallback exists there. That is a gap in the pair's MCP row, not a change in this window.

### 8. Python typing PEPs on docstrings (no action, watch)

- Source: [PEP 727](https://peps.python.org/pep-0727/) is still Withdrawn, last modified 2025-05-06, with no successor named. [PEP 846, "Docstrings for Type Aliases"](https://peps.python.org/pep-0846/) is a Draft targeting 3.16, created 2026-09-06 and last modified 2026-09-22, so it falls before the window. It would store a string after a `type` statement as the alias `__doc__`.
- Verdict: no action. If PEP 846 is accepted, the census in `checks/comment_census.py` would need to count a string after a `type` statement as a doc block. Recheck at the next refresh.

## 2. GRD-05 citation check

- The pair cites [arXiv 2603.21642](https://arxiv.org/abs/2603.21642) for "the published mitigation strips" imperative comment text. The page I fetched is titled "Are AI-assisted Development Tools Immune to Prompt Injection?", by Huang, Huang and Milani Fard, with one version, v1 on 2026-03-23.
- Changed: there is no revised version. The abstract describes tool poisoning across seven MCP clients and a comparison of their guardrails. It does not mention source-code comments or stripping imperative text. This is a claim at risk, not a confirmed error, because the abstract is only a summary of the paper.
- Candidate replacement, dated before the window and so not ranked: [arXiv 2606.19235, CodeSentinel](https://arxiv.org/abs/2606.19235), v1 on 2026-06-17, a Tree-sitter sanitizer that removes or neutralizes flagged nodes before a code model sees them. Its abstract names comments as one hiding place but does not confirm that imperative comment text is stripped as a class.
- Verdict: amend existing rule. Someone should read the full text of 2603.21642 before the next refresh. If it does not support the sentence, GRD-05's rationale should keep the "imperative text is the injection shape" argument and cite the source that does, or state it as the pair's own judgement.

## 3. Claims at risk

| Claim | Status | Detail |
|---|---|---|
| GRD-05: arXiv 2603.21642 supports stripping imperative comment text | could not determine | Abstract covers MCP tool poisoning only; v1 is the only version. See section 2. |
| surfaces.md: rmcp `#[tool]` falls back to the function's `///` | unchanged | No SDK or rmcp release in the window reported a change. rmcp itself was not opened. |
| surfaces.md: clap derive and schemars copy the doc comment | could not determine | Not re-checked, per the brief. |
| SRF-04: clippy `too_long_first_doc_paragraph` | unchanged | No move of it appeared in the changelog text I read (first 100,000 characters). |
| PEP 727 is withdrawn | unchanged | Still Withdrawn, no successor. |

## 4. Excluded as dated on or before the baseline

- Go 1.27, released 2026-08-19: `go doc` gained `package@version` and `-ex`, `fmtappendf` removed from vet. No doc-comment rule change.
- Rust 1.93 (2026-01-22): `rustdoc::invalid_doc_attributes` deny by default.
- arXiv 2609.09242, "Talking to Itself While Coding": self-emitted comment volume ranges from 0.1 percent of output tokens (Nemotron) to 71.4 percent (Gemini). Its ID places it in September, but its date was not confirmed, so it may fall inside the window. It is a study of whether comments help generation, so it would not change a rule either way.
- PEP 846 draft history (see candidate 8).

## 5. Could not determine

- ESLint 10.12.0 to 10.15.0 (2026-10-02 to 2026-11-13): the [blog page](https://eslint.org/blog/) gave only one-line summaries, so any comment or JSDoc rule change is unknown.
- Biome 2.6 (said to be dated 15 October 2026, promoting 59 nursery rules): reported only by a secondary comparison and not checked against Biome's changelog.
- Kotlin, Dokka, Detekt, Checkstyle, Javadoc, TypeDoc and TSDoc: searches returned no in-window release with a doc-comment feature, but I opened no primary changelog for them. This is absence of evidence, not a finding.
- Cobra: the changelog URL I tried returned HTTP 404. Cobra and Huma were not checked.
- Agent harness guidance from Anthropic, OpenAI, Google or Cursor: the only results were third-party blogs. No vendor primary page on code comments was found, so nothing is claimed.
- A new in-window paper measuring comment density in agent-written code: none found. The search returned review-comment studies, which measure a different thing.

## Normative guidance candidates

Only two candidates carry text, both minor.

1. Rule: in `guards.md` GRD-05, cite only a source whose text supports "comment-borne imperative text is an injection vector". Rationale: an unsupported citation in a rule file reads as evidence the pair does not have. Verification: open the cited arXiv abstract and full text and search for "comment".
2. Rule: add a Spring and springdoc row to the interface-text table in `surfaces.md`, source "annotation strings", test "serialize the MCP tool list or OpenAPI document and run `checks/interface_leak.py`". Rationale: a generator that publishes text and is not in the table gets no SRF-03 test. Verification: the planted-token test in SRF-03, with `(C-999)` placed in an `@Operation` description, fails the scan.

## 6. Sources

| URL | What it is | Date or era |
|---|---|---|
| https://arxiv.org/abs/2603.21642 | GRD-05 citation target; MCP tool-poisoning study | v1 2026-03-23 |
| https://arxiv.org/abs/2611.28763 | Hidden AI-directed text on GitHub | v1 2026-11-21 |
| https://arxiv.org/abs/2606.19235 | CodeSentinel injection sanitizer | v1 2026-06-17 |
| https://peps.python.org/pep-0727/ | PEP 727, Withdrawn | modified 2025-05-06 |
| https://peps.python.org/pep-0846/ | PEP 846 docstrings for type aliases, Draft | created 2026-09-06 |
| https://peps.python.org/pep-0000/ | PEP index | read through 2026-11 |
| https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md | Rust releases 1.92 to 1.100.1 | to 2026-11-27 |
| https://doc.rust-lang.org/rustdoc/lints.html | rustdoc lint list | current |
| https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md | Clippy changelog | 1.99, 1.100 |
| https://raw.githubusercontent.com/astral-sh/ruff/main/CHANGELOG.md | Ruff 0.17.x | 2026-10 |
| https://eslint.org/blog/ | ESLint release posts | 2026-10 to 2026-11 |
| https://github.com/modelcontextprotocol/python-sdk/releases | MCP Python SDK | v2.3.0 |
| https://github.com/modelcontextprotocol/typescript-sdk/releases | MCP TypeScript SDK | 2.4.0 |
| https://raw.githubusercontent.com/springdoc/springdoc-openapi/main/CHANGELOG.md | springdoc 3.2.0 and 3.2.1 | 2026-10-24, 2026-11-20 |
| https://raw.githubusercontent.com/golang/go/master/doc/next/index.md | Go next-release notes (404) | failed |
| https://raw.githubusercontent.com/spf13/cobra/main/CHANGELOG.md | Cobra changelog (404) | failed |
| https://github.com/rust-lang/rfcs/pulls | Rust RFC list; only #3397 rustdoc image bundling, open, updated 2026-10-13 | 2026-10 |
