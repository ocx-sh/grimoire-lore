---
title: Error-message-to-docs links and AI authoring policy
topic: error-message-links-and-ai-authoring-policy
group: docs-observability
wave: 2
agent: wave2-error-message-and-authoring-policy-rows
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 32
scope: >
  Wave 2 commission `error-message-and-authoring-policy-rows` from
  docs-topic-map/wave1-critique.md. Three map rows that fell out of wave 1:
  error-message-docs-link, ai-authoring-tooling-policy, and
  site-component-portability. Fetches Rust, Node, Deno, Python, Go, GitHub CLI
  and GitHub API sources for the first row, Google, GitLab, Kubernetes,
  Wikipedia and DORA for the second, and MkDocs Material, VitePress, mdBook,
  Docusaurus and Starlight for the third. Measures the fleet's own
  error-handling code, exit-code table and mdBook version where a claim was
  checkable locally.
revises:
  - docs-observability.md
  - docs-plain-english.md
  - docs-use-case-discovery.md
  - docs-page-types.md
---

# Error-message-to-docs links and AI authoring policy

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Three shapes of error-to-docs link](#1-three-shapes-of-error-to-docs-link)
   2. [The fleet already runs this pattern twice, unwired both times](#2-the-fleet-already-runs-this-pattern-twice-unwired-both-times)
   3. [The resolver question: reuse, do not rebuild](#3-the-resolver-question-reuse-do-not-rebuild)
   4. [Three real 2026 AI-authoring policies, three different answers](#4-three-real-2026-ai-authoring-policies-three-different-answers)
   5. [DORA measures the trade-off, not the disclosure](#5-dora-measures-the-trade-off-not-the-disclosure)
   6. [Site-component portability: the syntax table](#6-site-component-portability-the-syntax-table)
   7. [mdBook grew a native admonition, which changes an earlier claim](#7-mdbook-grew-a-native-admonition-which-changes-an-earlier-claim)
   8. [The shipped DOC-DISC-16 regex already has a portability gap](#8-the-shipped-doc-disc-16-regex-already-has-a-portability-gap)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Three ecosystems bind an emitted error identifier to a doc page today. Rust
  uses a numeric code (`E0308`) resolved by `rustc --explain` and a matching
  static URL. Node uses a string code (`ERR_INVALID_ARG_TYPE`) resolved by a
  matching anchor on one page. GitHub's REST API returns the link itself, as
  a `documentation_url` field in the error JSON.
- uv's own hint mechanism ships prose, not a link. Its documented build-failure
  hint is plain text with no URL.
- Deno does not run a numeric error-code scheme. Its error classes
  (`Deno.errors.NotFound`) each get their own docs page named after the class,
  which is a fourth, simpler shape: the identifier already is the anchor name.
- Python's `add_note()` (PEP 678) was designed for context, not links. Its own
  motivating examples are test failures and retry state, never a doc URL.
- Go's linter framework standardizes the identifier, not the destination.
  `go/analysis`'s `Analyzer.URL` field exists for exactly this purpose, but
  `go vet` prints no URL and staticcheck builds its own anchor page instead
  (`SA1019` at `staticcheck.dev/docs/checks`). mypy is the Python tool that
  actually runs the Rust/Node shape: a bracketed code shown by default,
  resolved on one fixed page, the working instance PEP 678 is not.
- One of the fleet's 12 repos, ocx, already defines a stable, documented
  error-identifier scheme, the fleet's best instance of this pattern. Its
  `command-line.md` exit-code table and `exit_code.rs` enum agree today with
  no test holding them together, correcting an earlier assumption that no
  fleet repo has this scheme at all.
- The fleet already consumes this pattern too, from someone else's API, and
  throws away the useful half. `grimoire/src/catalog/forge.rs` folds a GitHub
  error body containing `documentation_url` into one opaque string. The link
  survives in the raw text but nothing extracts or highlights it.
- A build-time check for "every error identifier this project owns resolves
  to a docs anchor" can reuse DOC-NAV-08's resolver rather than a new tool.
  The new work is only enumerating the identifiers and diffing two lists,
  the same shape DOC-EX-02 already uses for test bindings.
- The rule still ships at SHOULD. ocx proves the scheme is cheap to author,
  not that the check is. The check is new work in every repo, including ocx.
- Three real 2026 policies on AI-drafted docs disagree. Wikipedia bans LLMs
  from writing or rewriting article prose outright, with two narrow
  exceptions. GitLab reviews AI and human content by the same process and
  discloses AI use site-wide. Kubernetes requires per-PR disclosure and
  forbids listing AI as a co-author, while still allowing AI-drafted content.
- Kubernetes' shape fits an agent fleet with no dedicated docs reviewers
  better than GitLab's or Wikipedia's. It does not require a review team the
  fleet lacks, and it does not ban the exact workflow this program ships for.
- Google's Technical Writing Two course teaches drafting technique with an
  LLM. It carries no disclosure or governance policy at all. It is training
  material, not a policy source, and citing it as one would overstate it.
- DORA's 2024 figures measure a quality-versus-stability trade-off at 25%
  AI adoption. They say nothing about disclosure. This program already
  declined to adjudicate the trade-off (DOC-OBS-09) and that stands.
- The orchestrator's site-component-portability decision is confirmed as the
  right shape: name the intent, never one generator's literal syntax, and
  keep the syntax table in the depth file, not the rule.
- mdBook shipped native admonitions in 0.5.0 (`> [!NOTE]` through
  `> [!CAUTION]`), enabled by default. Grimoire's own `docs.yml` already pins
  `mdbook@0.5.3`, so the fleet's mdBook site has this today with zero
  configuration.
- The shipped DOC-DISC-16 regex (`::: tip`, `> [!NOTE]`, `!!! `, `<Aside>`)
  requires a literal space after `:::`. VitePress's own docs show that space.
  Docusaurus's and Starlight's own docs show no space (`:::tip`). The regex
  as shipped misses two of the five generators it should catch.
- The same regex also has no case for mdbook-admonish's fenced form
  (`` ```admonish type ``), the richer alternative to mdBook's native
  alerts, still real in the wild and not covered by the native-alert check.

## Findings

### 1. Three shapes of error-to-docs link

**Numeric code, resolved by a compiler flag.** Rust prints `error[E0308]`, then
tells the user to run `rustc --explain E0308`
([doc.rust-lang.org/error_codes/error-index.html](https://doc.rust-lang.org/error_codes/error-index.html),
fetched 2026-09-05). Every code also has a static URL of the same shape,
confirmed by fetching
[doc.rust-lang.org/error_codes/E0308.html](https://doc.rust-lang.org/error_codes/E0308.html)
directly. The code in the terminal and the anchor on the web page are the
same string. Nothing has to guess the mapping. A real compiler fixture shows
the exact terminal wording: `error: aborting due to 1 previous error` then
``For more information about this error, try `rustc --explain E0072`.``
([rust-lang/rust `tests/ui/span/E0072.stderr`](https://github.com/rust-lang/rust/blob/master/tests/ui/span/E0072.stderr),
fetched 2026-09-05).

**A shared framework field, inconsistently surfaced.** Go's own linter
framework, `go/analysis`, defines `Analyzer.URL string`, documented as "an
optional link to a web page with additional documentation for this analyzer"
([pkg.go.dev/golang.org/x/tools/go/analysis](https://pkg.go.dev/golang.org/x/tools/go/analysis),
fetched 2026-09-05). `go vet` itself does not print this URL to the terminal.
Staticcheck, built on the same framework, instead turns its own check codes
(`SA1019`, `ST1003`) into anchors on one page,
[staticcheck.dev/docs/checks](https://staticcheck.dev/docs/checks/#SA1019)
(fetched 2026-09-05), the same code-to-anchor shape as Rust and Node, with
the framework's own URL field left unused. Go standardizes the identifier
scheme and leaves the doc destination to each linter that builds on it.

**Python's working answer sits one tool over.** mypy prints a bracketed code
after every diagnostic by default, `[import-untyped]` for example, and shows
it unless a project opts out with `--hide-error-codes`
([mypy.readthedocs.io/en/stable/command_line.html](https://mypy.readthedocs.io/en/stable/command_line.html),
fetched 2026-09-05), then documents every code on one of two fixed pages,
[error_code_list.html](https://mypy.readthedocs.io/en/stable/error_code_list.html)
and
[error_code_list2.html](https://mypy.readthedocs.io/en/stable/error_code_list2.html)
(fetched 2026-09-05). This is the same bracket-then-anchor shape as Node's,
and it is the actual Python-ecosystem instance of the pattern, which PEP 678
below is not.

**String code, resolved by an anchor on one page.** Node names every error
`ERR_INVALID_ARG_TYPE`-style and documents each on
[nodejs.org/api/errors.html](https://nodejs.org/api/errors.html) under an
anchor of the same name (fetched 2026-09-05). The page states plainly that
`error.message` may change between versions and `error.code` is the stable
handle, which is the same discipline DOC-OBS-08 asks of a docs metric: the
unstable prose is not the identifier, the stable code is.

**The link travels inside the error itself.** GitHub's REST API returns a
`documentation_url` field in every error body. A real example, from a public
GitHub CLI discussion, shows the shape as actually returned:
`{"message":"Bad credentials","documentation_url":"https://docs.github.com/graphql"}`
([github.com/cli/cli discussion #9886](https://github.com/cli/cli/discussions/9886)).
GitHub's own troubleshooting page states the intent directly: "Most error
messages will provide a clue about what is wrong and a link to relevant
documentation"
([docs.github.com/en/rest/overview/troubleshooting-the-rest-api](https://docs.github.com/en/rest/overview/troubleshooting-the-rest-api),
fetched 2026-09-05). This is the shape to copy when the project is a client
of someone else's API, not the author of the error.

**The identifier already is the anchor name.** Deno raises typed error
classes (`Deno.errors.NotFound`, `Deno.errors.ConnectionRefused`) and
documents each on its own page,
[docs.deno.com/api/deno/~/Deno.errors.NotFound](https://docs.deno.com/api/deno/~/Deno.errors.NotFound)
for example (fetched 2026-09-05). There is no separate numeric or string
code layer. The class name in the stack trace and the page title are one
fact stated once. Simpler than Rust's or Node's scheme, and it works only
because the runtime already has typed error classes to hang the anchor on.

**Two named candidates in the brief that turned out not to fit.** uv's own
troubleshooting page shows the hint mechanism in full:

```
hint: `distutils` was removed from the standard library in Python 3.12.
Consider adding a constraint (like `numpy >1.19.5`) to avoid building a
version of `numpy` that depends on `distutils`.
```

([docs.astral.sh/uv/reference/troubleshooting/build-failures](https://docs.astral.sh/uv/reference/troubleshooting/build-failures/),
fetched 2026-09-05). The hint is prose, not a URL. It is a good example of a
readable error, not of an error-to-docs link.

**A sibling Astral tool does link, inline, in the same line.** uv's own hint
stays prose, but Astral's type checker `ty`, exercised inside uv's own test
suite, prints the URL directly beside the rule name in one diagnostic:
``info: rule `unresolved-import` is enabled by default`` followed by
`info: make sure your Python environment is properly configured:
https://docs.astral.sh/ty/modules/#python-environment`
([astral-sh/uv `crates/uv/tests/project/check.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv/tests/project/check.rs),
fetched 2026-09-05). One vendor, two tools, two different answers: uv's
hints stay prose, `ty`'s carry the link inline with no second command
needed, the strongest shape found in this dive. Python's PEP 678 `add_note()`
was built for the same reason, stated plainly in the PEP: test frameworks
attaching failure context and retry loops attaching iteration state
([peps.python.org/pep-0678](https://peps.python.org/pep-0678/), fetched
2026-09-05). Neither source names a doc-link use case. Citing them as the
error-to-docs pattern would overstate what they do.

### 2. The fleet already runs this pattern twice, unwired both times

**ocx documents an exit-code scheme and never checks it against the code.**
`ocx/website/src/docs/reference/command-line.md:311-324` carries a 14-row
table, one row per non-trivial exit code from 64 through 85, each with the
code's name, its POSIX `sysexits` label, a cause, and a suggested fix action.
Row 81, for example: `PolicyBlocked` / `OCX` / "A deliberate local policy
(`--offline` or `--frozen`) refused a network or resolution operation, not a
fault" / "Loosen the flag, or populate the local index first with
`ocx index update`". The matching `enum ExitCode` in
`ocx/crates/ocx_lib/src/cli/exit_code.rs:20-93` defines the same 14 variants
at the same numeric values (`PolicyBlocked = 81` among them). Nothing in
either crate parses the docs table and diffs it against the enum, the way
`client_target.rs` already does for the client-support matrix below. This
falsifies an earlier working assumption that no fleet repo defines a stable,
documented error-identifier scheme, `config-inventory.md`'s prose-rule count
never looked at a CLI's exit codes as a documentation surface at all. The
fleet's best example of this exact pattern sits one `#[test]` away from the
same drift protection `client_target.rs` already proves is cheap to write.

**grimoire receives a documentation link from someone else's API and throws
it away.** `grimoire/src/catalog/forge.rs:2345` carries a test fixture with
the exact GitHub shape:

```rust
let body = r#"{"message":"GitHub Actions is not permitted to create or approve
pull requests","documentation_url":"https://docs.github.com/rest/pulls/pulls#create-a-pull-request"}"#;
```

The function under test, `status_error` (`forge.rs:1577-1589`), does this
with it:

```rust
async fn status_error(response: reqwest::Response) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    // ...
    format!("HTTP status {status}: {body}")
}
```

The whole JSON body, `documentation_url` included, gets dumped as one
opaque string. The test only asserts that the `message` field surfaces, not
that the link does. The link is present in the bytes and absent from the
signal. This is a real, measured, small instance of the AI-agent failure
mode DOC-OBS-08 already names for metrics: a useful field arrives and gets
buried in a format string instead of read.

### 3. The resolver question: reuse, do not rebuild

DOC-NAV-08 already resolves "explicit ids, root-relative paths and
build-time anchors before a link checker may call a link dead"
(`docs-navigation-search.md:131`), built because an unfixed checker
misreported 2087 dead links against 68 real ones
(`docs-shape.md` §5, cited there). An error-code anchor is one more explicit
id in the same docs tree. The new work for an error-to-docs check is not a
second link checker. It is enumerating the source-side identifiers (the
error codes or classes the project's own code emits) and diffing that list
against the anchor set DOC-NAV-08 already produces, the same "diff two
lists, both must come back empty" shape DOC-EX-02 uses to bind a test to a
page (`docs-examples.md:62`). One resolver, two list-diffs.

### 4. Three real 2026 AI-authoring policies, three different answers

**Wikipedia bans it, with two narrow doors.** The policy passed as a Request
for Comment on 2026-03-20 and reads: "the use of LLMs to generate or rewrite
article content is prohibited"
([en.wikipedia.org/wiki/Wikipedia:Large_language_models](https://en.wikipedia.org/wiki/Wikipedia:Large_language_models),
fetched 2026-09-05). The two exceptions are narrow: LLM-assisted copyediting
limited to "typography, spelling, punctuation, capitalization, and
contractions", and LLM-assisted translation under a separate guideline.
Disclosure is encouraged but not mandatory for the copyedit case: "LLMs used
to generate or modify text should be mentioned in the edit summary, even if
their terms of service do not require it."

**GitLab reviews everything alike and discloses site-wide.** GitLab's own
policy page states plainly: "Some content on `docs.gitlab.com` was created
with the assistance of generative AI tools" and "All content, AI-generated
or human-created, is reviewed for accuracy and readability by a GitLab team
member"
([docs.gitlab.com/legal/use_generative_ai](https://docs.gitlab.com/legal/use_generative_ai/),
fetched 2026-09-05). This is a company-wide banner plus equal review, not a
per-page or per-PR disclosure. The internal AI-authoring workflow page
exists (`docs.gitlab.com/development/documentation/ai_guide/`) but defers
further detail to an internal handbook not published, so no Vale-specific
gate for AI content is confirmed anywhere public. Treat the "GitLab gates
AI docs on Vale before human review" framing in this program's own brief as
unconfirmed. What is confirmed is uniform review, not a special AI gate.

**Kubernetes requires per-PR disclosure and bans attribution to the tool.**
"Using AI tools to help write your PR is acceptable, but as the author, you
are responsible for understanding every change. If you used AI tools in
preparing your PR, you must disclose this in the description of your PR. A
simple statement in the PR description such as 'This PR was written in part
with the assistance of generative AI' is sufficient"
([kubernetes.io/blog/2026/06/26/open-source-maintainership-in-the-age-of-ai](https://kubernetes.io/blog/2026/06/26/open-source-maintainership-in-the-age-of-ai/),
fetched 2026-09-05). The same policy forbids "listing AI tooling as a
co-author, co-signing commits using an AI tool, or using the `assisted-by`,
`co-developed` or similar commit trailer." Large AI-generated PRs and
AI-generated commit messages are separately disallowed.

**Google teaches the skill and states no policy.** Technical Writing Two's
own overview page describes teaching "how to use LLMs to generate, edit,
format, and summarize technical documents more efficiently"
([developers.google.com/tech-writing/two](https://developers.google.com/tech-writing/two),
fetched 2026-09-05). It is a course in technique. No fetch of its content
pages surfaced a disclosure rule, a review gate, or a governance stance.
Citing it as a policy source would be the same fabricated-authority failure
mode DOC-PLAIN-17 exists to catch elsewhere in this program.

**The decision for this program.** Kubernetes' shape is the one to adopt.
Wikipedia's ban is written for an encyclopedia with a standing volunteer
editor corps checking every edit, which this fleet does not have, and
banning the workflow this program exists to run would be incoherent.
GitLab's shape assumes a paid technical-writing team doing equal review of
every page, which none of the twelve adopting repos have. Kubernetes'
shape assumes exactly this program's situation: an AI-assisted contributor,
a human merging the PR, and a project that wants a paper trail without a
review department. Ship a PR-level disclosure field and a ban on AI
co-author trailers, not a page-level badge and not a ban on AI drafting.

### 5. DORA measures the trade-off, not the disclosure

The 2024 report's documentation-quality figures were already verified in
wave 1 (`docs-observability.md`'s Verdict cites the 1525%/750%/451%/343%
lift table and the 7.5%/7.2%/1.5% AI-adoption figures, both re-confirmed by
the wave 1 critic against
[dora.dev/capabilities/documentation-quality](https://dora.dev/capabilities/documentation-quality/)
and
[Swimm's summary](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation)).
Re-fetching `dora.dev/research/2024/dora-report/` today for a disclosure or
governance recommendation found none. The report is a measurement of
outcomes, not a policy document. It has nothing to say about whether an
AI-drafted page should say so. DOC-OBS-09 already grades the one axis
neither side of the DORA finding contests, that every docs change states
what it removed. That rule stands unchanged. The disclosure question this
commission was asked to resolve is answered by Kubernetes' policy, not by
DORA's numbers.

### 6. Site-component portability: the syntax table

The orchestrator's decision, recorded as instructed: a portable rule states
the intent, "a callout your generator renders," and never a single
generator's literal syntax as the only accepted form. The depth file (this
one) carries the syntax table so the rule file stays generator-neutral.

| Generator | Syntax | Types (as documented) | Source |
|---|---|---|---|
| MkDocs Material | `!!! type` block, indented content; `???` for a collapsible version, `???+` for one that starts open | `note`, `abstract`, `info`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example`, `quote` | [squidfunk.github.io/mkdocs-material/reference/admonitions](https://squidfunk.github.io/mkdocs-material/reference/admonitions/), fetched 2026-09-05 |
| VitePress | `::: type` (space after the colons in the docs' own examples) … `:::` | `info`, `tip`, `warning`, `danger`, `details` | [vitepress.dev/guide/markdown#custom-containers](https://vitepress.dev/guide/markdown#custom-containers), fetched 2026-09-05 |
| mdBook (native, 0.5.0+) | Blockquote with a bracketed tag on the first line: `> [!NOTE]` | `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` | [rust-lang.github.io/mdBook/format/markdown.html#admonitions](https://rust-lang.github.io/mdBook/format/markdown.html#admonitions), fetched 2026-09-05 |
| mdBook (mdbook-admonish, richer/older) | Fenced block: `` ```admonish type `` … `` ``` `` | `note` (default when omitted), `info`, `warning`, `danger`, `example`, and more | [github.com/tommilligan/mdbook-admonish](https://github.com/tommilligan/mdbook-admonish), fetched 2026-09-05 |
| Docusaurus | `:::type` (no required space in the docs' own example) … `:::`, optional `[Title]` | `note`, `tip`, `info`, `warning`, `danger` | [docusaurus.io/docs/markdown-features/admonitions](https://docusaurus.io/docs/markdown-features/admonitions/), fetched 2026-09-05 |
| Starlight | `:::type` … `:::`, optional `[Title]` | `note`, `tip`, `caution`, `danger` | [starlight.astro.build/guides/authoring-content](https://starlight.astro.build/guides/authoring-content/), fetched 2026-09-05 |

A plain blockquote (`> Note: ...`) with no bracketed tag renders as plain
text everywhere with no special styling. It is the universal fallback for
a generator not in this table, and the honest thing to write when the
project's generator is unknown at authoring time.

### 7. mdBook grew a native admonition, which changes an earlier claim

Wave 1's `docs-page-types.md` proved, correctly, that YAML frontmatter
renders as visible text on grimoire's mdBook site because `book.toml`
configures no frontmatter preprocessor. That claim is about frontmatter and
still holds. It does not extend to admonitions. mdBook 0.5.0 added native
support, confirmed in the project's own changelog: "Added support for
admonitions. These are enabled by default, with the option
`output.html.admonitions` to disable it"
([raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md](https://raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md),
fetched 2026-09-05, under the 0.5 Migration Guide). Grimoire's own
`.github/workflows/docs.yml:69` pins `tool: mdbook@0.5.3`, which is version
0.5.0 or later, so the fleet's one mdBook site renders `> [!NOTE]` through
`> [!CAUTION]` today with zero added configuration. The syntax is the same
five-keyword GitHub-flavored-markdown alert convention GitHub itself uses in
READMEs, so a callout written this way degrades to a readable blockquote
with a visible literal tag on any renderer that does not special-case it,
including GitHub's own file viewer for a generator with no live build.

### 8. The shipped DOC-DISC-16 regex already has a portability gap

DOC-DISC-16's shipped verification is `rg '(::: ?code-group|<Tabs|=== "|
\{% tab)'` for the unrelated tabs ban (DOC-DISC-17), and for the callout
check itself: "Flag `::: tip`, `> [!NOTE]`, `!!! `, or `<Aside>` appearing
before that block" (`docs-use-case-discovery.md:83`). Read literally, `:::
tip` requires a space between the colons and the keyword. VitePress's own
docs example has that space. Docusaurus's own docs example does not:
`:::note Some **content**...`. Starlight's own docs example does not either.
A project on Docusaurus or Starlight writing the idiomatic form its own
generator's docs show would pass DOC-DISC-16's word-count check with a
callout the regex never saw, because the space the pattern requires is not
there. The same regex also has no branch for mdbook-admonish's fenced
`` ```admonish `` form, still real in projects that adopted it before native
alerts existed in 0.5.0, or that want its richer type list.

## Normative guidance candidates

IDs below continue each family's existing numbering as of this wave.
Final numbers are subject to the wave-2 integration pass, the same way wave
1's numbering settled after its own critique.

1. **Rule.** When a project's own code emits a stable, documented error
   identifier (a code or class name that does not change with wording, such
   as an `E0308`-style code or a `Deno.errors.NotFound`-style class), every
   such identifier must resolve to a docs anchor a checker can confirm
   exists. Skip this rule entirely for a project whose errors carry no
   stable identifier, only free-text messages.
   **Rationale.** An identifier with no page sends the reader to a search
   engine instead of a jump, the same gap DOC-NAV-08 was built to close for
   ordinary links.
   **Verification.** Grep the project's error-defining source for its
   identifier pattern (an enum of error codes, a set of named exception or
   error classes). Diff that list against the anchor set DOC-NAV-08's
   resolver already produces for the built docs. Both sides must come back
   empty. Reuse the resolver. Do not build a second checker.
   **Evidence level.** normative (Rust's error-index convention, Node's
   `errors.html` anchor convention, mypy's default-on bracketed code, all
   fetched and quoted above) for the pattern itself, measured (ocx's own
   `command-line.md` exit-code table and `exit_code.rs` enum already carry
   this scheme, agreeing today with zero test binding them, Finding 2) for
   the fleet cost, which is why this ships as a drift check on an existing
   scheme rather than a green-field retrofit.
   **Severity.** SHOULD. **Is new beside:** DOC-OBS (proposed DOC-OBS-16).

2. **Rule.** When error-handling code receives a docs link from a
   dependency's own error payload (a `documentation_url`-shaped field, a
   `--explain`-style pointer), surface that link to the reader. Do not fold
   it into an opaque dump of the raw body.
   **Rationale.** The link is the one part of the payload built to answer
   the reader's next question. `grimoire/src/catalog/forge.rs:1577-1589`
   already receives it and already throws it away into one format string.
   **Verification.** Unverified: reading heuristic. A reviewer opens the
   error-handling function that consumes an external API's error body and
   checks whether a link-shaped field (any key literally named
   `documentation_url`, `help_url`, or similar) is read out and shown
   separately, or only present inside a raw passthrough of the whole body.
   **Evidence level.** measured (the fleet instance named above) for the gap,
   argued for the remedy, since no source states a general rule for this,
   only the observed shape of the failure. **Severity.** SHOULD. **Is new
   beside:** DOC-OBS (proposed DOC-OBS-17).

3. **Rule.** A documentation-changing PR states whether AI assistance
   drafted it, using a fixed field alongside DOC-OBS-09's `Added:`/
   `Removed:` keys, for example `AI assistance: yes|no|partial`. Never
   attribute the change to the AI tool itself in a commit trailer, a
   co-author line, or a byline on the published page.
   **Rationale.** Kubernetes forbids exactly this attribution pattern
   because it breaks the accountability chain: "the human contributor
   remains fully responsible for every change," and an unlabelled AI draft
   reads as fully human-reviewed prose to the next person who trusts it.
   **Verification.** The PR template carries an `AI assistance:` key. CI
   greps the PR body for the key and fails when it is missing or empty.
   A second grep over the PR's commit trailers for
   `Co-Authored-By:.*([Cc]laude|[Gg][Pp][Tt]|[Cc]opilot|[Gg]emini)|assisted-by|co-developed`
   must return zero hits.
   **Evidence level.** argued, reasoned from three real but divergent 2026
   policies (Wikipedia, GitLab, Kubernetes), pinned as this program's own
   choice of the Kubernetes shape for the reasons in Finding 4.
   **Severity.** pinned (this decides fleet policy rather than merely
   suggesting one). **Is new beside:** DOC-PLAIN (proposed DOC-PLAIN-22).

4. **Rule.** Extend DOC-PLAIN-08's chatbot-artifact grep to also ban a
   page-level AI-authorship badge or disclosure banner on a published page.
   **Rationale.** A page-level badge is a second, unmaintained place for an
   authorship fact to rot as later revisions mix human and AI edits, and
   DOC-PLAIN-09 already forbids claiming a page's authorship in a finding,
   so the same page cannot honestly carry a static badge either. GitLab's
   own site-wide banner is a communications choice for a company with a
   review team, not a per-page fact this fleet has verified per page.
   **Verification.** Add
   `AI-generated|AI-assisted|written with (the )?(help|assistance) of (AI|Claude|ChatGPT|Copilot|Gemini)|assisted by (AI|Claude|ChatGPT|Copilot|Gemini)`
   to DOC-PLAIN-08's existing grep over published pages.
   **Evidence level.** argued, pinned (the same fleet-shape reasoning as
   candidate 3). **Severity.** SHOULD. **Changes:** DOC-PLAIN-08.

5. **Rule.** DOC-DISC-16's callout-detection regex tolerates optional
   whitespace after the triple colon and adds mdbook-admonish's fenced form,
   scoped to known callout keywords so it never collides with
   `::: code-group` or a future directive that also starts with three
   colons.
   **Rationale.** As shipped, the regex misses Docusaurus's and Starlight's
   own documented no-space form (`:::note`), which is a false negative on
   two of the five generators this program targets, measured directly
   against each generator's own docs example in Finding 8.
   **Verification.** Replace the callout branch with
   `` (:::\s*(tip|note|info|warning|danger|caution)\b|> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]|!!!\s|<Aside|```admonish) `` and confirm it matches a
   fixture page written in each of the six forms in the table in Finding 6,
   and does not match a fixture page containing `::: code-group`.
   **Evidence level.** measured (each generator's own docs example, quoted in
   Finding 8 and the table in Finding 6). **Severity.** SHOULD. **Changes:**
   DOC-DISC-16.

6. **Rule.** Any rule in this set that names an interactive or visual site
   component must state the intent the component serves, never one
   generator's literal syntax as the only accepted form, and must point at
   a syntax table (this file's Finding 6 is the current one) rather than
   embedding generator-specific literals in the rule's own row.
   **Rationale.** This operationalises the orchestrator's
   site-component-portability decision as a durable check, so a future rule
   author cannot repeat DOC-DISC-16's gap by copying one generator's docs
   example and calling it the rule.
   **Verification.** For each rule row naming a component (admonition,
   tabs, code group, aside), confirm its own text states the intent in a
   sentence that contains no generator-specific token (`:::`, `!!!`, `<Aside`,
   `` ``` ``) and that its verification either points at a syntax table file
   or lists more than one generator's form. A row with exactly one literal
   form and no citation to a table is the finding.
   **Evidence level.** codified (the frame's own portability constraint,
   `docs-frame.md`, "no fleet paths, no ocx-internal component names in the
   shipped files"), extended here from paths to component syntax by this
   commission's brief. **Severity.** SHOULD. **Is new beside:** DOC-TYPE
   (proposed as a meta-rule, alongside DOC-TYPE-02's mechanism-portability
   precedent).

## AI-agent angle

An agent asked to "make errors more helpful" reaches for prose, the uv
shape, because prose is free to write and a link needs an anchor to exist
first. It rarely notices that a dependency's error already carries a link
and instead writes a new sentence next to the dumped JSON, duplicating
information already present. The mechanical catch is candidate 2's reading
heuristic: look for a link-shaped field beside a raw-body passthrough in the
same function.

An agent asked to disclose AI authorship defaults to one of two wrong
shapes. It either says nothing, because nothing in the diff distinguishes
an AI-drafted paragraph from a human one, or it writes a page-level badge,
because a badge is the most visible way to satisfy an unspecified
transparency request. Candidate 3's PR-field grep catches the first.
Candidate 4's extended grep catches the second.

An agent asked to add a callout copies whatever syntax it saw most recently
in its context window, usually from whichever generator it read last, and
ships that literal syntax into a rule or a page for a different generator.
Candidate 5 and candidate 6 both exist because this exact failure already
happened once, inside DOC-DISC-16 itself: the shipped regex encodes
VitePress's spacing convention as if it were universal.

## Contested / evolving

**Does the shipped rule set state a disclosure policy, or decline to?**
Resolved: it states one. Declining was available (DORA's stance, effectively:
grade the outcome, not the process) and was rejected because this program's
own `docs-frame.md` already commits to a stance on em-dash and semicolon
bans as a decision rather than a hypothesis, and disclosure is the same
kind of question. The policy adopted is Kubernetes' shape: PR-level
disclosure, no tool-as-co-author, no page-level badge. See Finding 4 for the
full comparison and why Wikipedia's and GitLab's shapes were rejected.

**Is GitLab's Vale gate specific to AI-generated content?** Resolved: no.
This program's own commission brief assumed it was. Fetching GitLab's public
AI-content policy and its Vale testing page directly found uniform review
for AI and human content alike, with no AI-specific Vale gate stated
anywhere public. The internal handbook GitLab's AI guide defers to is not
published, so this cannot be confirmed further. Treat the assumption in the
brief as corrected, the same way wave 1 corrected DOC-NAV-13 against
mdBook's own primary source.

**Is mdBook's admonition support still absent, as an earlier consolidation's
adjacent frontmatter finding might suggest?** Resolved: no, and this was
never actually claimed. The frontmatter finding and the admonition question
are two separate mechanisms. mdBook 0.5.0 shipped native admonitions,
enabled by default, and the fleet's own mdBook site already runs 0.5.3. See
Finding 7.

**Does DOC-DISC-16 already cover all five target generators?** Resolved: no,
measured directly against each generator's own docs example. See Finding 8
and candidate 5.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [doc.rust-lang.org/error_codes/error-index.html](https://doc.rust-lang.org/error_codes/error-index.html) | Rust's compiler error-code index | fetched 2026-09-05 | Primary source for the numeric-code-to-static-URL shape |
| [doc.rust-lang.org/error_codes/E0308.html](https://doc.rust-lang.org/error_codes/E0308.html) | One error code's own page | fetched 2026-09-05 | Confirms the per-code URL pattern is real, not assumed |
| [rust-lang/rust `tests/ui/span/E0072.stderr`](https://github.com/rust-lang/rust/blob/master/tests/ui/span/E0072.stderr) | A real rustc diagnostic fixture | fetched 2026-09-05 | Confirms the exact terminal wording of the `--explain` hint |
| [pkg.go.dev/golang.org/x/tools/go/analysis](https://pkg.go.dev/golang.org/x/tools/go/analysis) | The `Analyzer.URL` field's doc comment | fetched 2026-09-05 | Primary source for Go's framework-level, inconsistently-surfaced shape |
| [staticcheck.dev/docs/checks](https://staticcheck.dev/docs/checks/) | Staticcheck's check-ID reference | fetched 2026-09-05 | Shows a Go linter choosing its own anchor page over the framework's unused URL field |
| [mypy.readthedocs.io/en/stable/command_line.html](https://mypy.readthedocs.io/en/stable/command_line.html) | mypy's CLI reference | fetched 2026-09-05 | Confirms bracketed error codes are shown by default, the real Python-ecosystem instance |
| [mypy.readthedocs.io/en/stable/error_codes.html](https://mypy.readthedocs.io/en/stable/error_codes.html) | mypy's error-code overview | fetched 2026-09-05 | Confirms the code-to-fixed-page lookup convention |
| [nodejs.org/api/errors.html](https://nodejs.org/api/errors.html) | Node's error-code reference | v26.8.1 docs, fetched 2026-09-05 | Primary source for the string-code-plus-anchor shape and the code-over-message discipline |
| [docs.deno.com/api/deno/~/Deno.errors.NotFound](https://docs.deno.com/api/deno/~/Deno.errors.NotFound) | One Deno error class's page | fetched 2026-09-05 | Primary source for the class-name-as-anchor shape, the fourth pattern |
| [docs.astral.sh/uv/reference/troubleshooting/build-failures](https://docs.astral.sh/uv/reference/troubleshooting/build-failures/) | uv's own troubleshooting page | fetched 2026-09-05 | Primary source showing uv's hint is prose, not a link, correcting the brief's assumption |
| [peps.python.org/pep-0678](https://peps.python.org/pep-0678/) | The exception-notes PEP | fetched 2026-09-05 | Primary source showing `add_note()`'s real motivating cases exclude doc links |
| [astral-sh/uv `crates/uv/tests/project/check.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv/tests/project/check.rs) | A `ty` diagnostic test fixture inside uv's own repo | fetched 2026-09-05 | Shows a sibling Astral tool embedding the doc URL inline, the strongest shape found |
| [github.com/cli/cli discussion #9886](https://github.com/cli/cli/discussions/9886) | Real GitHub API error output posted by a user | 2026 | Shows the `documentation_url` field's real shape in the wild |
| [docs.github.com/en/rest/overview/troubleshooting-the-rest-api](https://docs.github.com/en/rest/overview/troubleshooting-the-rest-api) | GitHub's own REST troubleshooting page | fetched 2026-09-05 | States the link-in-error intent directly, GitHub's own words |
| `ocx/website/src/docs/reference/command-line.md:311-324` | ocx's own exit-code table | current tree, 2026-09-05 | The fleet's actual documented error-identifier scheme, corrects the "no fleet repo has this" assumption |
| `ocx/crates/ocx_lib/src/cli/exit_code.rs:20-93` | ocx's `ExitCode` enum | current tree, 2026-09-05 | The code side of the same scheme, agrees with the docs table today, unchecked by any test |
| `grimoire/src/catalog/forge.rs:1577-1589,2345` | Grimoire's own error-body handling and its test fixture | current tree, 2026-09-05 | The fleet's one real, measured instance of receiving and discarding this exact field |
| `grimoire/src/install/client_target.rs:749` | The docs-to-code table-parity test | current tree, 2026-09-05 | The fleet's other strong verified-doc-check shape, cited for the resolver-reuse argument |
| [en.wikipedia.org/wiki/Wikipedia:Large_language_models](https://en.wikipedia.org/wiki/Wikipedia:Large_language_models) | Wikipedia's current LLM content policy | passed 2026-03-20, fetched 2026-09-05 | Primary source for the strictest of the three real 2026 policies |
| [docs.gitlab.com/legal/use_generative_ai](https://docs.gitlab.com/legal/use_generative_ai/) | GitLab's public generative-AI content policy | fetched 2026-09-05 | Primary source correcting the brief's Vale-gate assumption |
| [docs.gitlab.com/development/documentation/ai_guide](https://docs.gitlab.com/development/documentation/ai_guide/) | GitLab's internal AI-authoring workflow page | fetched 2026-09-05 | Shows the public page defers detail to an unpublished internal handbook |
| [kubernetes.io/blog/2026/06/26/open-source-maintainership-in-the-age-of-ai](https://kubernetes.io/blog/2026/06/26/open-source-maintainership-in-the-age-of-ai/) | Kubernetes' AI-contribution policy announcement | 2026-06-26, fetched 2026-09-05 | Primary source for the adopted disclosure shape |
| [developers.google.com/tech-writing/two](https://developers.google.com/tech-writing/two) | Google's Technical Writing Two overview | fetched 2026-09-05 | Confirms it teaches technique with no governance stance, so it is not a policy source |
| [dora.dev/capabilities/documentation-quality](https://dora.dev/capabilities/documentation-quality/) | DORA's documentation-quality capability page | fetched 2026-09-05, already verified wave 1 | Confirms the trade-off figures carry no disclosure guidance |
| [squidfunk.github.io/mkdocs-material/reference/admonitions](https://squidfunk.github.io/mkdocs-material/reference/admonitions/) | MkDocs Material's admonition reference | fetched 2026-09-05 | Primary syntax source, row 1 of the table |
| [vitepress.dev/guide/markdown#custom-containers](https://vitepress.dev/guide/markdown#custom-containers) | VitePress's markdown extensions guide | fetched 2026-09-05 | Primary syntax source, and the spacing convention the DOC-DISC-16 regex over-fit to |
| [rust-lang.github.io/mdBook/format/markdown.html#admonitions](https://rust-lang.github.io/mdBook/format/markdown.html#admonitions) | mdBook's own markdown reference | fetched 2026-09-05 | Primary source for native admonitions, corrects an implicit earlier assumption |
| [raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md](https://raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md) | mdBook's changelog | fetched 2026-09-05 | Confirms the 0.5.0 version and the default-on config key |
| [github.com/tommilligan/mdbook-admonish](https://github.com/tommilligan/mdbook-admonish) | The richer mdBook admonition preprocessor | fetched 2026-09-05 | Primary syntax source for the fenced form the native check misses |
| [docusaurus.io/docs/markdown-features/admonitions](https://docusaurus.io/docs/markdown-features/admonitions/) | Docusaurus's admonitions reference | v3.10.2 docs, fetched 2026-09-05 | Primary syntax source showing the no-space form |
| [starlight.astro.build/guides/authoring-content](https://starlight.astro.build/guides/authoring-content/) | Starlight's authoring guide | fetched 2026-09-05 | Primary syntax source, the fifth generator in the table |
| `grimoire/.github/workflows/docs.yml:69` | Grimoire's docs build workflow | current tree, 2026-09-05 | Confirms the fleet's mdBook site runs 0.5.3, so Finding 7 applies today, not hypothetically |
