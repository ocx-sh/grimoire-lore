---
title: Interactive documentation elements — a per-generator support contract
topic: interactive-elements-contract
group: docs-examples
wave: 2
agent: docs-examples-interactive-worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 31
scope: |
  Commissioned by the orchestrator (not a wave-1 topic-map row) to close the
  wave-1 critique's finding (b): interactive elements beyond the terminal
  player were thin. Covers, per generator (MkDocs Material 9.7.7, VitePress,
  mdBook) and independent of generator (sandboxes, consoles, Twoslash): copy
  buttons, code tabs/groups, tooltips and glossary popovers, live sandboxes
  and playgrounds, "try it" API consoles, and Twoslash hover types. For each:
  when required, when forbidden, the check that sees it from a checkout, and
  the Markdown-twin degradation (DOC-AGENT-01/03). Does NOT cover: the
  terminal/asciicast player (owned by `recording-layer-and-interactivity`),
  page-type contracts beyond the one glossary rule that belongs there, or
  use-case tiering.
revises:
  - docs-examples.md
  - docs-page-types.md
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Copy buttons: one config line, one config line, always-on](#1-copy-buttons-one-config-line-one-config-line-always-on)
  2. [Code tabs and groups: three shapes, one native, one absent](#2-code-tabs-and-groups-three-shapes-one-native-one-absent)
  3. [The tabs-vs-single-command decision is a first-contact rule](#3-the-tabs-vs-single-command-decision-is-a-first-contact-rule)
  4. [Tooltips and glossaries: MkDocs Material ships one, VitePress hand-builds one, mdBook has neither](#4-tooltips-and-glossaries-mkdocs-material-ships-one-vitepress-hand-builds-one-mdbook-has-neither)
  5. [Live sandboxes: a reach problem before it is a feature problem](#5-live-sandboxes-a-reach-problem-before-it-is-a-feature-problem)
  6. [Sandpack is measurably stale; CodeSandbox changed its business](#6-sandpack-is-measurably-stale-codesandbox-changed-its-business)
  7. [mdBook's own playground is opt-in and Rust-only, and the fleet uses none of it](#7-mdbooks-own-playground-is-opt-in-and-rust-only-and-the-fleet-uses-none-of-it)
  8. ["Try it" API consoles: a licensing split, not a feature split](#8-try-it-api-consoles-a-licensing-split-not-a-feature-split)
  9. [Twoslash: build-time only, TypeScript-only, has a current VitePress package, and is still not yet relevant to this fleet](#9-twoslash-build-time-only-typescript-only-has-a-current-vitepress-package-and-is-still-not-yet-relevant-to-this-fleet)
  10. [The Markdown-twin problem is one problem wearing six costumes](#10-the-markdown-twin-problem-is-one-problem-wearing-six-costumes)
  11. [The per-generator support table](#11-the-per-generator-support-table)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Copy buttons are a checkable per-generator fact, not a universal default.
  MkDocs Material needs `content.code.copy` in `theme.features`. It is off
  unless you set it. VitePress's own `preWrapper.ts` injects one into every
  code block with no feature flag at all — confirmed straight from its
  source. mdBook's own `Playground.copyable` config key defaults to `true`
  (confirmed straight from `mdbook-core`'s source), so it ships on by
  default but is a real, overridable key, not a hard-coded behavior.
- All 7 fleet MkDocs Material sites already set `content.code.copy` and
  `pymdownx.tabbed`. This is a fleet norm to preserve, not a gap to fix.
- Code tabs have one native shape per generator. MkDocs Material uses
  `pymdownx.tabbed`, plus `content.tabs.link` to sync labels site-wide.
  VitePress uses `::: code-group`. mdBook has no native equivalent.
- Tabs are for parallel equivalent paths, such as package managers, OS
  shells, or languages. They are not for sequencing steps. A page already
  typed `tutorial` must have zero tabs (DOC-DISC-17). This rule extends the
  same test to every other page type, based on step count and reader intent
  rather than page type alone.
- Vite and Tailwind tab 4-5 package managers at first contact. Bun shows
  exactly one command on its front door and defers the rest to a dedicated
  Installation page. The deciding fact is whether the reader's choice is
  already made. A CLI project has one binary, so Bun is not asking "which
  package manager" at that moment. Vite and Tailwind are, because the
  reader's own project already picked one.
- MkDocs Material's tooltip mechanism is the `abbr` markdown extension,
  using `*[TERM]: definition` syntax, plus `pymdownx.snippets` with
  `auto_append` for a shared glossary file. VitePress has no built-in
  equivalent. ocx hand-built one (`Tooltip.vue`, Reka UI primitives, 400ms
  hover delay). mdBook has neither.
- No fleet site has a glossary page, and nobody measures whether a tooltip
  is ever opened. A tooltip rule can state a shape, such as jargon that
  would otherwise break the sentence. It cannot yet cite engagement data for
  the threshold.
- StackBlitz WebContainers requires SharedArrayBuffer under cross-origin
  isolation. Full support is Chromium-only. Firefox is alpha. Safari is
  beta-only (16.4 TP). Mobile Safari and iOS are unsupported. Any embed
  built on it needs a static fallback for every other reader. That fallback
  is a requirement, not an enhancement.
- Sandpack's last release was 2025-02-14, over 18 months stale against this
  research's September 2026 era. "Unmaintained" is now a measured claim,
  not an assertion.
- mdBook has its own native, opt-in, Rust-only playground:
  `[output.html.playground]`. `runnable` defaults to true once any Rust
  example exists, and wires to play.rust-lang.org. `editable` defaults to
  false and uses the Ace editor. Zero fleet Rust crates use it, and zero set
  `html_playground_url` for rustdoc's own Run button, which is also off by
  default.
- Scalar's interactive console is MIT-licensed and free. Redocly's own
  pricing page lists no free tier at all for its "Reference" product, only
  Pro, Enterprise, and Enterprise+. This matches the wave-1 finding that Try
  It is paywalled there. Stoplight Elements is Apache-2.0 and free, but its
  own "Try It" console is listed as a roadmap item, not a shipped feature,
  as of this read.
- Twoslash runs at build time against the real TypeScript compiler. It
  produces static HTML with no client-side runtime and needs a Shiki-based
  renderer. 0 of 23 fleet docs surfaces have a meaningful TypeScript
  reference or an OpenAPI surface, so this stays a "when one appears" rule,
  not a default.
- Every interactive element in this file shares one failure mode. A
  Markdown twin generated by rendering the page and then scraping it loses
  whatever only shows after a click, a hover, or a runtime a headless scrape
  does not have. The fix is generator-specific. The check is the same shape
  every time: diff what the twin contains against what the page's raw
  source declares.

## Findings

### 1. Copy buttons: one config line, one config line, always-on

MkDocs Material's copy-to-clipboard button is off by default and requires the
`content.code.copy` feature flag under `theme.features` in `mkdocs.yml`; the
project's own reference page frames adding it as an explicit opt-in step
([squidfunk.github.io/mkdocs-material/reference/code-blocks](https://squidfunk.github.io/mkdocs-material/reference/code-blocks/)).
All 7 real MkDocs Material sites in the fleet already set it — confirmed by
direct read of `mkdocs.yml` in `ocx-catalog`, `ocx-mirror`, `ocx-mcp`,
`ocx-mirror-sdk`, `grimoire-indexer`, `ocx-indexbot`, and `ocx-sdk-python`,
each line 18-27 depending on file. This is the one interactive-element
control the fleet already gets uniformly right.

VitePress's default theme injects a copy button into every rendered code
block with no config key at all — confirmed by absence: `ocx/website`'s
`.vitepress/theme/` carries no copy-button component, no override CSS
targeting one, and the project's own markdown guide never mentions "copy"
because there is no flag to document
([vitepress.dev/guide/markdown](https://vitepress.dev/guide/markdown), read
in full, term absent). A site that already has a working copy button and no
custom code for it is confirming the default, not missing a feature.

mdBook ships a copy button on by default, gated by a config key the published
reference page never documents by name: `mdbook-core`'s own `Playground`
struct declares `pub copyable: bool` with the doc comment "Display the copy
button. Default: `true`" (`rust-lang/mdBook`
`crates/mdbook-core/src/config.rs:617-618,632`, read directly from source,
since the published `book.toml` reference page does not mention "copy" or
"clipboard" at all). `hbs_renderer.rs` only sets the template variable that
turns the button on when `html_config.playground.copyable` is true
(`crates/mdbook-html/src/html_handlebars/hbs_renderer.rs:543-545`), and
`book.js` wires that variable to a real `ClipboardJS('.clip-button', ...)`
instance (`crates/mdbook-html/front-end/js/book.js:768-798`). Grimoire's built
`docs/book/` output carries `clipboard-1626706a.min.js` alongside every page,
confirming the default fires in practice, not only in the source. A project
turns it off with one line, `[output.html.playground] copyable = false`, in
`book.toml` — the default is real and on, but it is a stated, overridable
config key, not a hard-coded, unremovable behavior.

Grimoire's own hand-authored landing page (`theme/index.hbs`, not a mdBook
content page) re-implements the same pattern by hand with `data-copy`
attributes and `navigator.clipboard.writeText()` (`theme/index.hbs:357-414,
517-519`) — evidence that a project builds its own copy button the moment a
page falls outside the generator's normal render path (a custom landing
template), not evidence that mdBook's own is missing.

### 2. Code tabs and groups: three shapes, one native, one absent

MkDocs Material's tabs come from `pymdownx.tabbed` (a `pymdown-extensions`
dependency, so no new package beyond what the theme already pulls in) with
`alternate_style: true` for the pill-style tab bar, syntax `=== "Label"` per
pane
([squidfunk.github.io/mkdocs-material/reference/content-tabs](https://squidfunk.github.io/mkdocs-material/reference/content-tabs/)).
`content.tabs.link` under `theme.features` makes every tab bar site-wide
switch together by label (click "pnpm" once, every code-group defaults to
pnpm from then on) — all 7 fleet sites set `pymdownx.tabbed`, and 3 of 7
(`ocx-mirror-sdk`, `grimoire-indexer`, `ocx-indexbot`) additionally set
`content.tabs.link`.

VitePress's equivalent is a `::: code-group` / `:::` fenced container with one
fenced block per tab, each carrying its own filename-as-label
([vitepress.dev/guide/markdown](https://vitepress.dev/guide/markdown), "You
can group multiple code blocks like this"). `ocx/website` uses it 11 times
across `faq.md`, `installation.md`, `user-guide.md`, `reference/*.md`, and
pairs it with `vitepress-plugin-group-icons` to attach a package-manager icon
to each tab label by string match (`.vitepress/config.mts:2,168-182`).

mdBook has no native tabs construct. `book.toml`'s full configuration
reference contains no tab-related key
([rust-lang.github.io/mdBook/format/mdbook.html](https://rust-lang.github.io/mdBook/format/mdbook.html)),
and the only occurrences of the word "tab" in grimoire's docs source are
prose describing the `Tab`/`Shift-Tab` keyboard shortcut inside grim's own TUI
(`src/commands.md:1468,1553`), not a documentation-authoring feature. A
project on mdBook wanting parallel-path content either accepts sequential
sections or hand-builds a tab widget the way grimoire hand-built its landing
page's OS toggle (`theme/index.hbs:346-361`, a `radiogroup` of two `<label>`s
with `data-os-row` panes shown/hidden by a matching `data-os` attribute — a
working, if narrow, precedent for the one-off case).

### 3. The tabs-vs-single-command decision is a first-contact rule

Vite's guide tabs five package managers (npm/yarn/pnpm/bun/deno) for every
scaffold command, and Tailwind's installation page tabs five installation
methods, both at the point of first contact
([vite.dev/guide](https://vite.dev/guide/),
[tailwindcss.com/docs/installation](https://tailwindcss.com/docs/installation),
both cited in `exemplar-sites.md` §6). Bun's own front door shows exactly one
command, `bun run index.tsx`, with every platform/manager variant deferred to
a separate Installation page
([bun.sh/docs](https://bun.sh/docs)). The difference is not house style: Vite
and Tailwind are consumed through someone else's package manager, so the
choice is real and already made by the reader's own project; Bun's front door
is demonstrating Bun itself, so there is no second tool whose identity the
tabs would be resolving. A tabs-or-one-command call should ask "does this
step have more than one genuinely different right answer for this reader," not
"how many ways can this be done."

This composes with, rather than duplicates, the already-shipped
`DOC-DISC-17` ("keep branching choices out of a page typed as a tutorial, and
put a quickstart on its own page,"
`docs-use-case-discovery.md:84`, `rg '(::: ?code-group\|<Tabs\|=== "\|\{% tab)'`
against `type: tutorial` pages). `DOC-DISC-17` forbids tabs on one page type;
this finding gives the rule that decides tabs-or-not on every other page type,
where the type-based ban does not apply.

### 4. Tooltips and glossaries: MkDocs Material ships one, VitePress hand-builds one, mdBook has neither

MkDocs Material's mechanism is the Python-Markdown `abbr` extension: a
paragraph anywhere in the source containing `*[TERM]: Definition text` makes
every later occurrence of `TERM` on that page get a dotted underline and
native-browser tooltip
([squidfunk.github.io/mkdocs-material/reference/tooltips](https://squidfunk.github.io/mkdocs-material/reference/tooltips/)).
Reusing one glossary across every page needs `pymdownx.snippets` with
`auto_append: [includes/abbreviations.md]` plus a `watch: [includes]` entry so
a build picks up edits to the shared file — this is the concrete mechanism
behind the topic-map's "glossary snippets" phrase. None of the fleet's 7
MkDocs Material `mkdocs.yml` files declare `abbr` or use `pymdownx.snippets`
for this purpose (confirmed: `abbr` appears in none of the 7; no fleet
`*.md` file contains a line starting `*[`), so the mechanism is available and
unused fleet-wide, not fleet-established practice.

VitePress has no built-in equivalent. `ocx` hand-built `Tooltip.vue` on Reka
UI's `TooltipRoot`/`TooltipTrigger`/`TooltipContent` primitives, a 400ms hover
delay, and a portal rendered outside the trigger's DOM subtree so it can sit
above the sidebar and nav z-index stack
(`ocx/website/.vitepress/theme/components/Tooltip.vue:1-30`). It is used 20
times across the site (`grep -rn '<Tooltip' src --include='*.md' | wc -l`),
and `docs-style.md` already states its own selection rule: "technical terms,
jargon, protocol-level concepts, long command sequences cluttering sentence"
are good candidates, "anything reader need to follow flow" is not
(`ocx/.claude/rules/docs-style.md:79-86`). Because Reka UI's primitives are
built for both pointer and keyboard interaction, the component inherits
focus-triggered disclosure by construction rather than by any code in
`Tooltip.vue` itself — but nothing in the fleet tests that this holds (no
existing rule or check touches it).

mdBook has neither an abbreviation extension nor a component system, so a
glossary on mdBook is either a dedicated glossary page (a target for a normal
Markdown link) or nothing; grimoire's own `SUMMARY.md` has no glossary entry.

No fleet site anywhere has a glossary page, and — as the topic map already
recorded — nobody instruments whether a tooltip ever gets opened
(`docs-topic-map.md:65`). A rule here can state shape (when a term earns
one) but the scaling question ("at what term count does inline tooltip stop
working and a glossary page start") stays unanswered by any fleet evidence.

### 5. Live sandboxes: a reach problem before it is a feature problem

StackBlitz WebContainers run a real Node.js toolchain in-browser via
WebAssembly and are "always free for open source"
([webcontainers.io/guides/introduction](https://webcontainers.io/guides/introduction)),
but the mechanism depends on `SharedArrayBuffer` under cross-origin isolation,
and that combination is full-strength only in Chromium-based browsers: Firefox
carries alpha support with known gaps in embedded server previews, and Safari
support exists only in the 16.4 Technology Preview, with older stable Safari
missing required primitives (`Atomics.waitAsync`, lookbehind regex); mobile
Safari/iOS is not listed as supported at all
([webcontainers.io/guides/browser-support](https://webcontainers.io/guides/browser-support)).
This is a hard reach ceiling, not a progressive-enhancement nicety: any reader
on stable Safari, Firefox, or a phone gets a broken or degraded embed unless
the page also carries the plain code as a real fallback, which is exactly the
DOC-AGENT-03 Markdown-twin requirement extended to a second axis (browser
capability, not just render-vs-scrape).

Vitest gets a cheaper version of the same effect: instead of a custom
sandbox, its guide links out to a table of StackBlitz-embedded example
projects rather than building a bespoke playground
([vitest.dev/guide](https://vitest.dev/guide/), cited in
`exemplar-sites.md` §6). Stripe's in-page API playground, pre-filled with the
reader's own live test key, is named by an independent teardown as "the
single biggest accelerator for time to first API call"
([writechoice.io/blog/best-api-documentation-stripe-teardown](https://writechoice.io/blog/best-api-documentation-stripe-teardown/),
cited in `exemplar-sites.md` §6) — the build cost there is justified by a
large API surface and a measured funnel metric, not by "sandboxes are good."

Python's browser-execution path, Pyodide, is a full CPython-on-WebAssembly
port distributed as its own package, MPL-2.0 licensed, that also runs
scientific packages with C/C++/Rust extensions (NumPy, pandas, SciPy)
([github.com/pyodide/pyodide](https://github.com/pyodide/pyodide), README).
LiveCodes is the closest thing to a vendor-neutral, self-hostable option
across the set: MIT-licensed, over 90 languages/frameworks including Python,
Go, Ruby and PHP alongside the JS ecosystem, fully client-side with "no
servers to configure," embeddable by CDN script tag, an npm SDK with
framework wrappers, or the standalone hosted app
([github.com/live-codes/livecodes](https://github.com/live-codes/livecodes),
README). None of the 23 fleet docs surfaces uses any live-sandbox mechanism
today (`docs-examples.md`'s own "rules deliberately not shipped" section,
confirmed independently here), so a default vendor choice remains
unjustified — the finding this file adds is the reach ceiling, not a pick.

### 6. Sandpack is measurably stale; CodeSandbox changed its business

Sandpack's most recent GitHub release is `v2.20.0`, dated 2025-02-14
([github.com/codesandbox/sandpack/releases](https://github.com/codesandbox/sandpack/releases)).
Measured against this research's September 2026 era that is over 18 months
with no release, on a package with 6.2k stars, 485 forks, and 140 open
issues still accumulating with no maintainer response visible in the
fetched listing. This upgrades wave-1's "unmaintained" framing
(`recent-shifts-and-tooling.md` §11, there labelled search-sourced) from
asserted to measured: the release-date gap is a fact read directly from the
project's own release history, not a third party's characterization.
CodeSandbox's own product direction has moved toward AI infrastructure rather
than the embeddable-playground use case Sandpack served (search-sourced,
carried over from wave 1, not independently re-verified here).

### 7. mdBook's own playground is opt-in and Rust-only, and the fleet uses none of it

mdBook ships a native playground distinct from any third-party sandbox:
`[output.html.playground]` in `book.toml` takes `editable` (default `false`,
wires in the Ace editor at https://ace.c9.io, replaceable only by overriding
the bundled `book.js`) and `runnable` (default `true` once any Rust example
exists in the book; setting it `false` removes the "Run" button entirely)
([rust-lang.github.io/mdBook/format/theme/editor.html](https://rust-lang.github.io/mdBook/format/theme/editor.html),
[rust-lang.github.io/mdBook/format/mdbook.html](https://rust-lang.github.io/mdBook/format/mdbook.html)).
Grimoire's `book.toml` sets neither key (confirmed: full file read, no
`[output.html.playground]` section), so it runs on the implicit default —
Run buttons on, in-place editing off — without the choice being a stated
decision anywhere in the repo.

Separately, rustdoc's own generated crate documentation gets a "Run" button
on a doctested example only when the crate opts in with
`#![doc(html_playground_url = "https://play.rust-lang.org/")]`; the rustdoc
book states plainly, "If you don't use this attribute, there will be no run
buttons"
([doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html](https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html)).
Zero Rust crates found in the fleet (`grimoire`, `rust-oci-client`,
`ocx-mirror`) set this attribute (`grep -rn html_playground_url`, no hits), so
every fleet rustdoc page that exists today ships with no Run button by
default, a fact rather than an oversight this file is naming for the first
time.

### 8. "Try it" API consoles: a licensing split, not a feature split

Scalar's API-reference renderer is MIT-licensed, free, and includes a
built-in interactive console described in its own README as coming "with an
API testing tool"
([github.com/scalar/scalar](https://github.com/scalar/scalar), README).
Redocly's public pricing page lists three tiers — Pro ($10/seat/month),
Enterprise ($24/seat/month), Enterprise+ (custom) — with no free tier for its
"Reference" product at all
([redocly.com/pricing](https://redocly.com/pricing)), consistent with wave
1's claim that Redocly paywalls Try It specifically (that page did not
itemize feature-by-tier, so the paywall's exact boundary is inherited from
wave 1, not independently re-confirmed line-by-line here). Stoplight Elements
is Apache-2.0 and free, but its own README lists the "API Console (a.k.a.
'Try it!')" under a roadmap section, not as a shipped capability
([github.com/stoplightio/elements](https://github.com/stoplightio/elements),
README) — a correction to any assumption that "open source" and "has Try It"
travel together across all three vendors; here they do not.

No fleet repo has an OpenAPI surface today (confirmed by wave 1,
`recent-shifts-and-tooling.md` §11, and not contradicted by anything read
here), so this stays a "when one appears, here is the state of the market"
finding rather than a default pick.

### 9. Twoslash: build-time only, TypeScript-only, has a current VitePress package, and is still not yet relevant to this fleet

Twoslash runs the real TypeScript compiler over a fenced code sample at build
time to produce hover types, inline errors, and completions baked directly
into static HTML, with "zero client-side JavaScript dependency" for the
result
([shikijs.github.io/twoslash](https://shikijs.github.io/twoslash/)). Because
it operates at build time against a real compiler rather than a live sandbox,
it carries none of the browser-reach problems in Finding 5 — the cost is
TypeScript-only scope and a Shiki-based render pipeline.

A first fetch of the standalone `shikijs/twoslash` repository's own
integrations page listed only older `remark`/`markdown-it`/generator-specific
plugin packages (Gatsby, Docusaurus, VuePress, Hexo, 11ty), which briefly read
as "no current VitePress-native package." That repository is itself the stale
half of the picture: its last push is 2024-02-19
(`gh api repos/shikijs/twoslash --jq .pushed_at`), because Twoslash's
VitePress integration moved into the actively maintained `shikijs/shiki`
monorepo as its own package, `@shikijs/vitepress-twoslash` — "Enable Twoslash
support in VitePress," MIT-licensed
(`shikijs/shiki` `packages/vitepress-twoslash/README.md`, read directly), live
on the npm registry today at version `4.4.3` in step with Shiki core itself
(confirmed via a live npm registry search query, not the stale standalone
repo), documented at `shiki.style/packages/vitepress#twoslash`. So the
current, first-party mechanism does exist and is maintained; the earlier read
of the wrong repository is corrected here, not repeated.

That correction changes what a project would reach for, not whether this
fleet should reach for it yet: 0 of 23 fleet docs surfaces carry a meaningful
TypeScript API reference or an OpenAPI surface (`docs-topic-map.md:143`, not
contradicted here), so this stays deferred exactly as the topic map already
flagged it — "revisit if one appears" — and this file adds no new obligation.

### 10. The Markdown-twin problem is one problem wearing six costumes

`DOC-AGENT-03` already requires that content "collapsed behind a `<details>`
block, a tab, or an accordion appears unfolded in that page's Markdown twin"
(`docs-machine-readers-and-prior-art.md:102-105`), because a twin generated by
scraping the rendered page silently drops whatever a click or a hover would
have revealed. Every element in this file is a specific instance of that same
generating fact:

- A code-group/tabbed block: the twin must contain every tab's code, not only
  the first or the default-selected one.
- A tooltip/abbreviation: the twin must contain the definition text inline
  (parenthetical or a footnote), not only the term, because there is no hover
  in a text file.
- A live sandbox or "try it" console: the twin must contain the same code the
  embed would have run, as an ordinary fenced block, because neither the
  sandbox's runtime nor the console's live-request form exists outside a
  browser.
- Twoslash output: the twin must contain the plain code (types-on-hover is
  necessarily lost; the code itself must not be).

The generator-specific fact only changes what has to be checked, never
whether it does: a Markdown twin is usually produced by a pipeline the doc
generator does not natively run (confirmed absent fleet-wide,
`docs-machine-readers-and-prior-art.md:251`), so today this is a forward-
looking check for whichever twin-generation mechanism a project adopts, not
something re-runnable against the fleet's current state.

### 11. The per-generator support table

Every finding above collapses into one checkable table. Each cell names the
exact config key, syntax, or package a checkout can grep for, not a general
capability claim.

| Element | MkDocs Material 9.7.7 | VitePress | mdBook |
|---|---|---|---|
| Copy button | Opt-in. `theme.features: [content.code.copy]` in `mkdocs.yml`. | Built in, unconditional. `preWrapper.ts` injects `<button class="copy">` into every code block with no feature flag at all (`vuejs/vitepress` `src/node/markdown/plugins/preWrapper.ts:46`, read directly). | On by default. `[output.html.playground] copyable = true` in `mdbook-core`'s own `Config` struct (`rust-lang/mdBook` `crates/mdbook-core/src/config.rs:617-618,632`, read directly); a project sets `copyable = false` in `book.toml` to remove it. |
| Code tabs / groups | Native. `pymdownx.tabbed` (+ `content.tabs.link` to sync tabs by label site-wide). | Native. `::: code-group` fenced container, one fence per tab, filename-as-label. | None native. Sequential sections or a hand-built widget (grimoire's own OS toggle on its non-mdBook landing page is the fleet's only precedent). |
| Tooltip / abbreviation | Native. `abbr` extension, `*[TERM]: Definition` syntax. | None native. A hand-built component (ocx's `Tooltip.vue`, Reka UI primitives). | None native. |
| Shared glossary | Native. `pymdownx.snippets` with `auto_append: [path/to/glossary.md]`. | Manual. One component call per use, or a linked glossary page. | Manual. A linked glossary page only; no reuse mechanism. |
| Runnable code playground | None native. | None native. | Native, Rust-only. `[output.html.playground] runnable = true` by default, wired to `play.rust-lang.org`; `editable` defaults `false` (read-only, Ace-editor-backed when turned on). |
| rustdoc "Run" button (crate docs, not the mdBook itself) | N/A | N/A | Separate mechanism from the mdBook playground above. Off by default; opt in with `#![doc(html_playground_url = "https://play.rust-lang.org/")]` on the crate root. |
| Live third-party sandbox (WebContainers / Sandpack / LiveCodes) | Bolted on via an embed or iframe. Nothing native. | Bolted on via an embed or iframe. Nothing native. | Bolted on via an embed or iframe. Nothing native. |
| OpenAPI "try it" console | Bolted on: Scalar (free, MIT) or Stoplight Elements (free, Apache-2.0, though its own README lists Try It as a roadmap item) ship it; Redocly's Reference product does not, at any tier. Nothing native to the generator itself. | Same vendor set, same gating, bolted on the same way. | Same vendor set, same gating, bolted on the same way. |
| Twoslash (TypeScript hover types) | No official integration package found. | Native package. `@shikijs/vitepress-twoslash`, MIT, published from the actively maintained `shikijs/shiki` monorepo (`shikijs/shiki` `packages/vitepress-twoslash/README.md`, read directly; confirmed live on the npm registry search API, version `4.4.3` tracking Shiki core). Docs at `shiki.style/packages/vitepress#twoslash`. | N/A — not a TypeScript surface. |

## Normative guidance candidates

1. **Set MkDocs Material's `content.code.copy` and `content.code.annotate`
   feature flags on any project using that generator. Do not leave the
   reader to select and copy code by hand.** Rationale: the flag is off by
   default and costs one config line. All 7 real fleet sites on this
   generator already made this call. It should be a named rule, not an
   implicit norm. Verify: run `grep -A5 'features:' mkdocs.yml | grep
   'content.code.copy'`. A MkDocs Material site (one with a `mkdocs.yml`)
   with no match fails. Evidence: **measured** (7 of 7 fleet MkDocs Material
   sites, all `mkdocs.yml` reads above). Severity: SHOULD. NEW beside
   DOC-EX-05. Proposed **DOC-EX-20**.

2. **Do not add a component, script, or plugin to give VitePress or mdBook a
   copy button. Both already ship one by default.** Rationale: a hand-rolled
   copy button on a generator that already has one wastes effort. It also
   adds a second thing to keep accessible, such as a label and keyboard
   focus, that the generator's own maintainers already solved. Verify:
   before adding any copy-button code, grep the generator's own
   default-theme output for a clipboard script. For mdBook, look for
   `clipboard*.min.js` in a fresh `mdbook build`, and confirm `book.toml`
   does not set `[output.html.playground] copyable = false` (its absence
   means the `true` default is in effect). For VitePress, confirm no custom
   implementation exists, since none is needed and none can be turned off
   either. Evidence: **measured**. mdBook: `clipboard-1626706a.min.js` is
   present in grimoire's built `docs/book/`, and `mdbook-core`'s own source
   names the controlling key and its default (`crates/mdbook-core/src/
   config.rs:617-618,632`). VitePress: no override is present in
   `ocx/website`, and its source unconditionally injects the button
   (`preWrapper.ts:46`) with no key to disable it at all. Severity: SHOULD.
   NEW beside DOC-EX-05.

3. **On MkDocs Material or VitePress, present parallel install or usage
   paths, such as package managers, shells, or languages, as tabs
   (`pymdownx.tabbed` or `::: code-group`) only when the reader's own
   context decides which one they need. Show one canonical command when the
   project itself is the only variable.** Rationale: Vite and Tailwind
   correctly tab because the reader already has an npm, yarn, pnpm, bun, or
   deno choice made upstream of this page. A project's own quickstart
   demonstrating itself, such as Bun's front door, has no such second axis.
   Tabbing it anyway manufactures a decision the reader does not have to
   make. Verify: for each tabbed block on a landing or quickstart page, name
   in one sentence what varies between tabs. If the answer is "nothing
   about the reader, only about us," the tabs are wrong for that spot. This
   is a reading heuristic. No lint distinguishes a genuinely open choice
   from a manufactured one. Evidence: **measured** (Vite, Tailwind, and Bun
   sources in Finding 3) plus a reading heuristic. Severity: SHOULD. NEW
   beside DOC-EX. Complements already-shipped **DOC-DISC-17**
   (`docs-use-case-discovery.md:84`), which forbids tabs specifically on
   `type: tutorial` pages. This rule covers every other type. Proposed
   **DOC-EX-21**.

4. **Every code-group or tabbed block's Markdown twin must contain every
   tab's content, not only the first or default-selected tab.** Rationale:
   both mechanisms render one tab visible and hide the rest by default. A
   twin built by scraping rendered DOM silently drops every non-default tab.
   This is exactly the failure `DOC-AGENT-03` already names for tabs in
   general. This rule makes it a concrete, generator-aware check. Verify:
   for MkDocs Material, confirm the twin-generation step reads the Markdown
   source, which contains every `=== "Label"` pane, rather than the
   rendered HTML. For VitePress, do the same for every fenced block inside a
   `::: code-group` container. A twin with fewer code blocks than the source
   page has tab-marker occurrences is the failing state. Evidence:
   **normative**, a direct extension of confirmed rule `DOC-AGENT-03`.
   Severity: MUST. It inherits `DOC-AGENT-03`'s severity. Extends
   **DOC-AGENT-03** (`docs-machine-readers-and-prior-art.md:102`).

5. **Reserve a tooltip or abbreviation for a term that would otherwise force
   a definitional clause into the reader's sentence. Never use one for
   content the reader must read to follow the page.** Rationale: this is the
   selection rule the fleet already states in prose (`docs-style.md:79-86`),
   but it ships as an unchecked opinion. Naming it as a portable rule keeps
   it from being lost when a project has no `docs-style.md` to copy from.
   Verify: this is a reading heuristic. Remove the tooltip's slot content
   and read the sentence aloud. If the sentence becomes false or unreadable
   without it, the term was load-bearing prose wrongly hidden in a tooltip.
   Evidence: **argued** (fleet house-style opinion, with zero engagement
   data anywhere in the fleet per `docs-topic-map.md:65`). Severity:
   CONSIDER. It is argued, with no usage data to promote it further. NEW
   beside DOC-TYPE. Proposed **DOC-TYPE-28** (`docs-page-types/how-to-and-
   explanation-contracts.md` already claims DOC-TYPE-22 through 27 for a
   different wave-2 addition; numbering here starts clear of that range).

6. **A tooltip's definition text must also appear in the page's Markdown
   twin, inline or as a footnote. It must never appear only inside the
   hover-triggered element.** Rationale: a twin is plain text. There is no
   hover state to scrape. A definition that exists only in the tooltip's
   slot content is invisible to any reader of the twin, agent or human.
   Verify: for each tooltip or expanded abbreviation on a page, confirm the
   twin-generation step either inlines the slot content in parentheses
   right after the term, or renders it as a footnote. A twin with the bare
   term and no nearby definition text fails. Evidence: **normative**, a
   direct extension of `DOC-AGENT-03`. Severity: MUST. Extends
   **DOC-AGENT-03**.

7. **Never make a WebContainers, Sandpack, or CodeSandbox class live sandbox
   the reader's only way to see a documented example. The same code must
   also render as an ordinary fenced block on the same page.** Rationale:
   full WebContainers support needs SharedArrayBuffer under cross-origin
   isolation. That combination works at full strength only in Chromium-based
   desktop browsers. Firefox is alpha. Stable Safari lacks required
   primitives entirely. Mobile Safari and iOS have no listed support at all.
   A reader on any of those gets a broken or absent embed with no fallback,
   unless one is built in on purpose. Verify: for any page embedding a live
   sandbox, grep for a fenced code block containing the same source directly
   on the page. It must not sit only inside the sandbox's own initial-file
   payload, since a non-supporting browser never renders that. Its absence
   is the finding. Evidence: **measured** (webcontainers.io's own
   browser-support page, Finding 5). Severity: MUST. NEW beside DOC-EX. It
   sits beside the recording layer's own no-single-point-of-failure
   principle, DOC-EX-15 and DOC-EX-16. Proposed **DOC-EX-22**.

8. **Do not propose Sandpack for any new embedded playground. If one
   already exists, flag it for a maintenance-risk review rather than a
   silent continuation.** Rationale: 18 or more months with no release, on a
   library with 140 open issues in the same listing, is a measured
   maintenance signal, not a guess. Recommending it for new work
   manufactures a dependency on a project already showing signs of
   abandonment. Verify: check the project's latest release date (for
   example, its GitHub releases page). A result more than 12 months old
   triggers the flag. Evidence: **measured** (Finding 6, release `v2.20.0`,
   dated 2025-02-14). Severity: SHOULD. This is a flag-for-review posture,
   not a hard block, since existing embeds are not broken by this alone. NEW
   beside DOC-EX. It touches the sandbox-vendor question `docs-examples.md`
   already declined to pin. Proposed **DOC-EX-23**.

9. **State the mdBook playground's `runnable` and `editable` keys
   explicitly in `book.toml`, rather than relying on the implicit default,
   whenever the book contains a Rust example.** Rationale: the default
   (`runnable = true`, `editable = false`) is a real, working choice. But an
   unstated default reads later as "nobody decided." A book that wants no
   Run button, such as for offline or air-gapped delivery, silently keeps
   one until someone notices. Verify: run `grep -A3
   '\[output.html.playground\]' book.toml`. Its absence on a book with
   fenced Rust blocks is the finding. Its presence with both keys stated is
   the passing state. Evidence: **measured** (grimoire's own `book.toml`
   sets neither key, Finding 7). Severity: SHOULD. NEW beside docs-examples'
   recording-layer rules. Proposed **DOC-EX-24**.

10. **Set `#![doc(html_playground_url = "https://play.rust-lang.org/")]` on
    any publicly-published Rust crate whose doc comments contain complete,
    runnable examples. Do not assume rustdoc adds a Run button on its own.**
    Rationale: rustdoc's own book states plainly that with no attribute
    there is no Run button. An author who has seen std's own docs, which do
    set it, can reasonably assume it is automatic. It is not. Verify: run
    `grep -rn html_playground_url src/lib.rs` (or the crate root) on any
    crate published to crates.io. Its absence alongside doctested examples
    in public API docs is the finding. Evidence: **normative** (rustdoc
    book, quoted verbatim in Finding 7). Severity: SHOULD. NEW beside
    docs-examples' doctest rules (DOC-EX-03). Proposed **DOC-EX-25**.

11. **Before adopting an OpenAPI "try it" console, name which vendor is
    meant: Scalar (free, MIT), Redocly Reference (no free tier), or
    Stoplight Elements (free, Apache-2.0, but Try It is roadmap-only as of
    this read). Confirm that vendor's current Try-It status directly rather
    than by category.** Rationale: "add an interactive try-it console" is
    not one decision across these three. One is free and shipped. One is
    paid only. One is free but not yet shipped for exactly the feature being
    asked for. Verify: before writing "use an OpenAPI try-it console" in any
    project-specific guidance, re-check the named vendor's own current
    docs, pricing page, or README for whether Try It is present, free, or
    both. Either fact can change faster than a rule gets re-read. Evidence:
    **measured** (Finding 8, three primary sources read directly). Severity:
    CONSIDER. It is asserted-shape and pins to a project decision once a
    vendor is actually chosen, at which point it becomes "pinned." NEW
    beside docs-examples. No current fleet OpenAPI surface needs a MUST yet.
    Proposed **DOC-EX-26**.

12. **Do not add Twoslash, any live sandbox, or any try-it console to a
    fleet project today. The fleet has no TypeScript reference and no
    OpenAPI surface for any of them to attach to.** Rationale: naming a
    default mechanism for a surface that does not exist yet is speculative
    scaffolding. The moment a project ships a real OpenAPI spec or a
    TypeScript SDK reference, this file's other findings (8, 9, 11) become
    live decisions. Until then, adopting any of them is unrequested
    complexity. Verify: search for `openapi*.yaml` or `openapi*.json` files,
    and grep for `.d.ts`-backed reference pages. Zero hits on both means
    this rule's precondition is unmet and no action is required. Evidence:
    **measured** (0 of 23 fleet surfaces on both counts, `docs-topic-map.md:143`,
    not contradicted here). Severity: CONSIDER. This is a standing "not yet"
    rather than a rule with teeth. NEW beside DOC-EX. Proposed **DOC-EX-27**.

13. **Any hover-triggered tooltip or abbreviation popup, whether MkDocs
    Material's native `abbr` rendering or a hand-built component such as
    ocx's `Tooltip.vue`, must also open and stay open on keyboard focus, must
    let the pointer move onto the popup without it closing, and must offer a
    way to dismiss it (typically Escape) without moving focus away.**
    Rationale: this is not a house-style nicety. WCAG Success Criterion
    1.4.13, Content on Hover or Focus, is a Level AA criterion with exactly
    three named conditions — dismissible, hoverable, persistent
    ([w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html),
    quoted verbatim) — and a tooltip is the textbook trigger for it. ocx's own
    `Tooltip.vue` wraps the trigger text in a plain `<span>` passed to Reka
    UI's `TooltipTrigger` with `as-child`, which is exactly the shape that
    silently loses keyboard-focus behavior if the underlying primitive does
    not itself add a `tabindex` and `aria-describedby` to that span — a fact
    this file did not independently verify against Reka UI's own source, so
    it is named here as the specific check a reviewer must run, not asserted
    as passing or failing. Verify: tab to the tooltip's trigger text with no
    mouse. The popup must appear. With it open, move a real mouse pointer
    from the trigger onto the popup's own content; the popup must not close.
    Press Escape; the popup must close without moving focus. Any of these
    three failing is a WCAG AA failure, not a matter of taste. Evidence:
    **normative** (WCAG 2.1 SC 1.4.13, Level AA, primary source read
    directly). Severity: MUST. This is a Level AA conformance requirement,
    not an argued house preference like rule 5 above — the two rules sit
    beside each other in the same finding but rest on different evidence and
    must not be merged. NEW beside DOC-TYPE, sibling to rule 5 above.
    Proposed **DOC-TYPE-29**.

## AI-agent angle

Ranked by how often each bites when an agent is asked to add or extend an
interactive element unsupervised.

1. **Builds a custom copy-to-clipboard component on VitePress or mdBook.**
   Both already ship one; a training-corpus habit of "docs sites need a copy
   button, so write one" produces dead code shadowing a working default and a
   second surface to keep accessible. Caught by rule 2.
2. **Tabs every install/usage variant reflexively, because tabbed installs
   are the majority pattern in training data (Vite, Tailwind, most framework
   docs).** The Bun counter-example is rare in training data precisely
   because it is the deliberate exception; an agent defaults to the majority
   shape without checking whether this page has a real second axis. Caught
   by rule 3.
3. **Adds a live sandbox (WebContainers, Sandpack) as the only way to see an
   example, because an embedded, "just works" playground reads as more
   polished than a plain fenced block.** The reach ceiling (Chromium-only for
   full WebContainers support) is invisible from the demo the agent tests
   against, which is very likely to itself be a Chromium-based browser.
   Caught by rule 7.
4. **Reaches for Sandpack specifically because it is the most-mentioned
   embeddable-playground library in training data, without checking whether
   it is still maintained.** A library that was actively promoted for years
   keeps appearing as "the" answer long after its release cadence stops.
   Caught by rule 8.
5. **Assumes rustdoc or mdBook's Run button is automatic because the
   agent has seen it working on `std`'s own docs or on a book that already
   set it.** Both are opt-in with a stated default of off; an agent copying
   the visible behavior without reading the config that produced it ships
   documentation with a silently missing button, or silently leaves one on
   that a project wanted off. Caught by rules 9 and 10.
6. **Overloads a tooltip with content the reader needs to read to follow the
   page**, because hiding detail reads as tidiness. Nothing forces the
   sentence-readability check unless a reviewer does it by hand. Caught by
   rule 5, which is a reading heuristic precisely because no lint can catch
   this class of error.
7. **Generates or updates a Markdown twin by rendering the page and
   stripping HTML tags, which silently drops every non-default tab and every
   tooltip's slot content.** This is the single highest-leverage failure in
   this file: it is invisible in the rendered site (which still looks
   correct) and only shows up to whichever reader — human or agent — relies
   on the twin instead of the rendered page. Caught by rules 4 and 6, both of
   which require checking the twin's source pipeline, not just its existence.
8. **Copies a tooltip component from a training-corpus example (or a UI
   library's demo) that opens only on `mouseenter`, because that is the
   overwhelmingly common shape in front-end training data, and a mouse-only
   manual check by the same agent never notices the keyboard gap.** An
   author who only ever hovers with a pointer while reviewing never
   discovers that Tab skips straight past the trigger. Caught by rule 13.

## Contested / evolving

- **Twoslash's current framework-integration surface.** A first read of the
  standalone `shikijs/twoslash` repository's own integrations listing named
  only older per-generator plugin packages (Gatsby, Docusaurus, VuePress,
  Hexo, 11ty), and wave 1's `recent-shifts-and-tooling.md` §11 describes
  Twoslash only in general terms without naming a VitePress integration
  either — together these read as "no current first-party VitePress
  package exists." That reading is wrong, and the fix is the repository
  choice, not the claim about Twoslash itself: `@shikijs/twoslash` moved into
  the actively maintained `shikijs/shiki` monorepo, which ships
  `@shikijs/vitepress-twoslash` as its own MIT-licensed package, versioned in
  lockstep with Shiki core (`4.4.3` at the time of this read) and documented
  at `shiki.style/packages/vitepress#twoslash`. Resolved: a current,
  first-party VitePress integration exists and is maintained; Finding 9 and
  rule 12 are updated to say so. This does not change rule 12's gate — the
  fleet still has 0 TypeScript reference surfaces for it to attach to — but
  it does mean a project reaching for this later has a real package to name,
  not a gap to build around.
- **Stoplight Elements' Try-It status.** Wave 1 named Stoplight Elements
  alongside Scalar and Redocly as part of the same "interactive try-it"
  comparison (`recent-shifts-and-tooling.md` §11) without distinguishing
  whether Elements itself ships Try It. This file's direct README read
  resolves it: Elements' own roadmap section lists "API Console (a.k.a.
  'Try it!')" as not yet shipped, which is a materially different position
  from Scalar's (shipped, free) and Redocly's (shipped, paid) — the
  three-way vendor comparison collapses into two vendors that have the
  feature and one that has announced intent to build it. Recommendation:
  route any actual OpenAPI console decision to rule 11, and re-check
  Stoplight's own repo before treating this line as settled, since a
  roadmap item is exactly the kind of fact most likely to have changed by
  the time this file is read.
- **Redocly's exact Try-It paywall boundary.** The pricing page fetched here
  confirms no free tier exists for the Reference product but does not
  itemize which specific features sit at which paid tier. Wave 1's more
  specific claim ("paywalls its 'Try It' feature specifically") is carried
  forward as inherited, not independently re-confirmed at the feature level
  in this pass — flagged here rather than silently upgraded to "confirmed."

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [squidfunk.github.io/mkdocs-material/reference/code-blocks](https://squidfunk.github.io/mkdocs-material/reference/code-blocks/) | Official MkDocs Material docs | fetched 2026-09-05 | `content.code.copy`/`content.code.annotate` are opt-in feature flags, confirmed verbatim |
| [squidfunk.github.io/mkdocs-material/reference/content-tabs](https://squidfunk.github.io/mkdocs-material/reference/content-tabs/) | Official MkDocs Material docs | fetched 2026-09-05 | `pymdownx.tabbed` config and `content.tabs.link` behavior, confirmed verbatim |
| [squidfunk.github.io/mkdocs-material/reference/tooltips](https://squidfunk.github.io/mkdocs-material/reference/tooltips/) | Official MkDocs Material docs | fetched 2026-09-05 | The `abbr`/`*[TERM]:` syntax and `pymdownx.snippets auto_append` glossary pattern |
| [vitepress.dev/guide/markdown](https://vitepress.dev/guide/markdown) | Official VitePress docs | fetched 2026-09-05 | `::: code-group` syntax confirmed; copy-button and tooltip absence confirmed by full-page read |
| [rust-lang.github.io/mdBook/format/mdbook.html](https://rust-lang.github.io/mdBook/format/mdbook.html) | Official mdBook config reference | fetched 2026-09-05 | Full `book.toml` key listing; `[output.html.playground]` `runnable`/`editable`, no copy/tabs/abbr keys anywhere |
| [rust-lang.github.io/mdBook/format/theme/editor.html](https://rust-lang.github.io/mdBook/format/theme/editor.html) | Official mdBook theme docs | fetched 2026-09-05 | Ace editor default, `editable` behavior for the native playground |
| [doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html](https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html) | Official rustdoc book | fetched 2026-09-05 | `html_playground_url` is opt-in; "no run buttons" without it, quoted verbatim |
| [shikijs.github.io/twoslash](https://shikijs.github.io/twoslash/) | Official Twoslash docs | fetched 2026-09-05 | Build-time, TypeScript-only, zero-runtime static output, confirmed verbatim |
| [webcontainers.io/guides/introduction](https://webcontainers.io/guides/introduction) | Official StackBlitz WebContainers docs | fetched 2026-09-05 | "Always free for Open Source," what runs in-browser |
| [webcontainers.io/guides/browser-support](https://webcontainers.io/guides/browser-support) | Official WebContainers docs | fetched 2026-09-05 | The Chromium-only/Firefox-alpha/Safari-beta/no-mobile reach ceiling behind rule 7 |
| [github.com/codesandbox/sandpack/releases](https://github.com/codesandbox/sandpack/releases) | GitHub releases listing | read 2026-09-05, latest release 2025-02-14 | Turns "Sandpack is unmaintained" from asserted to measured |
| [github.com/scalar/scalar](https://github.com/scalar/scalar) | GitHub README | fetched 2026-09-05 | MIT license, built-in API testing tool, confirmed |
| [redocly.com/pricing](https://redocly.com/pricing) | Official Redocly pricing page | fetched 2026-09-05 | No free tier for the Reference product, three paid tiers only |
| [github.com/stoplightio/elements](https://github.com/stoplightio/elements) | GitHub README | fetched 2026-09-05 | Apache-2.0; "Try it!" console listed under roadmap, not shipped |
| [github.com/live-codes/livecodes](https://github.com/live-codes/livecodes) | GitHub README | fetched 2026-09-05 | MIT, 90+ languages, fully client-side, three embedding methods |
| [github.com/pyodide/pyodide](https://github.com/pyodide/pyodide) | GitHub README | fetched 2026-09-05 | MPL-2.0, CPython-on-WASM, scientific-package support |
| `/home/mherwig/dev/ocx-catalog/mkdocs.yml`, and the same file in `ocx-mirror`, `ocx-mcp`, `ocx-mirror-sdk`, `grimoire-indexer`, `ocx-indexbot`, `ocx-sdk-python` | Fleet config, direct read | read 2026-09-05 | 7/7 MkDocs Material sites set `content.code.copy` and `pymdownx.tabbed`; 0/7 set `abbr` |
| `/home/mherwig/dev/ocx/website/.vitepress/config.mts` | Fleet config, direct read | read 2026-09-05 | `vitepress-plugin-group-icons` wiring, confirms live `::: code-group` usage |
| `/home/mherwig/dev/ocx/website/.vitepress/theme/components/Tooltip.vue` | Fleet component source, direct read | read 2026-09-05 | The fleet's one hand-built tooltip, Reka UI primitives, hover-delay config |
| `/home/mherwig/dev/grimoire/docs/book.toml`, `/home/mherwig/dev/grimoire/docs/theme/index.hbs`, built `docs/book/` output | Fleet config and build output, direct read | read 2026-09-05 | No `[output.html.playground]` section (implicit defaults); hand-rolled copy buttons on the non-mdBook landing page; bundled `clipboard*.min.js` proving the default theme's own copy button |
| `.agents/research/docs-topic-map/exemplar-sites.md` §6 | Wave-1 consolidated scout output | 2026-09-05 | Vite/Tailwind/Bun tabs contrast; Stripe/Vitest playground-investment contrast |
| `.agents/research/docs-topic-map/recent-shifts-and-tooling.md` §11 | Wave-1 consolidated scout output | 2026-09-05 | Origin of the Sandpack/CodeSandbox/Scalar/Redocly/Stoplight claims this file re-verifies |
| `.agents/research/docs-use-case-discovery.md` (DOC-DISC-17) | Wave-1 shipped rule | 2026-09-05 | The tutorial-typed tabs ban this file's rule 3 extends to every other type |
| `.agents/research/docs-machine-readers-and-prior-art.md` (DOC-AGENT-03) | Wave-1 shipped rule | 2026-09-05 | The Markdown-twin unfolding requirement this file's Finding 10 and rules 4/6 extend |
| [w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html) | WCAG 2.1 Understanding doc, Level AA | fetched 2026-09-05 | SC 1.4.13's three named conditions (dismissible, hoverable, persistent), quoted verbatim, behind rule 13 |
| `rust-lang/mdBook` `crates/mdbook-core/src/config.rs:611-637` | GitHub source, read via `gh api` | fetched 2026-09-05 | `Playground.copyable` (default `true`) and `Playground.runnable` (default `true`), the exact config-level source for mdBook's copy and run button defaults |
| `rust-lang/mdBook` `crates/mdbook-html/src/html_handlebars/hbs_renderer.rs:543-545` and `crates/mdbook-html/front-end/js/book.js:261-268,768-798` | GitHub source, read via `gh api` | fetched 2026-09-05 | Traces `copyable` from config through the template flag to the real `ClipboardJS('.clip-button', ...)` instantiation |
| `vuejs/vitepress` `src/node/markdown/plugins/preWrapper.ts:46` | GitHub source, read via `gh api` | fetched 2026-09-05 | The exact line that unconditionally injects `<button class="copy">` into every code block, with no feature flag |
| `shikijs/shiki` `packages/vitepress-twoslash/README.md` | GitHub source, read via `gh api` | fetched 2026-09-05 | Confirms `@shikijs/vitepress-twoslash` is a current, MIT-licensed, first-party package in the actively maintained monorepo |
| `registry.npmjs.org/-/v1/search?text=shikijs+twoslash+vitepress` | Live npm registry search API query | queried 2026-09-05 | `@shikijs/vitepress-twoslash` at version `4.4.3`, in step with Shiki core, confirming the package is published and current |
| `gh api repos/shikijs/twoslash` | Live GitHub API query | queried 2026-09-05 | `pushed_at: 2024-02-19`, proving the standalone repo (not the monorepo) is the stale half of the Twoslash picture |
