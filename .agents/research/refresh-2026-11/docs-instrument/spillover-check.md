---
title: docs-instrument spillover check from docs-quality
target: docs-instrument
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/rust-lang/mdBook/pull/3132
  - https://github.com/marxin/mdbook-linkcheck2
  - https://vitepress.dev/reference/site-config
  - https://lychee.cli.rs/guides/cli/
  - https://plausible.io/docs/custom-props/introduction
  - https://plausible.io/docs/custom-event-goals
  - https://umami.is/pricing
  - https://usefathom.com/docs/features/events
---

Evidence came from `.agents/research/refresh-2026-11/docs-quality.md` and its delta artifacts in `docs-quality/`. All sources below are vendor or project primary pages, fetched 2026-11-27.

## Item 1: wiring-by-generator.md, link-check rows

Item: mdBook row names `mdbook-linkcheck`, which fails on mdBook 0.5; name `mdbook-linkcheck2` with `[output.linkcheck2]`. VitePress row says "none shipped" but the build fails on a dead link by default. The lychee fallbacks need `--root-dir`.

### 1a. mdBook: confirmed by primary source
- Source: https://github.com/rust-lang/mdBook/pull/3132 ("Recommend linkcheck2 fork", merged 2026-06-08 per the research artifact). Quote: "With the addition of admonitions in 0.5.0, linkcheck broke, and the PR to fix it has been open for a good while."
- Source: https://github.com/marxin/mdbook-linkcheck2 README: options go "under the `output.linkcheck2` table in your `book.toml`" (`output.linkcheck` still works for compatibility).
- Not verified: that linkcheck2 0.13.0 builds against mdBook 0.5.4 (no build run; README names no supported range).
- Affected text, `skills/docs-instrument/references/wiring-by-generator.md` line 61: `| mdBook | `mdbook-linkcheck` as a backend in `book.toml` | `lychee --include-fragments book/` |`
- Smallest change: replace `mdbook-linkcheck` with `mdbook-linkcheck2` and write "as an `[output.linkcheck2]` backend in `book.toml`".

### 1b. VitePress "none shipped": confirmed by primary source
- Source: https://vitepress.dev/reference/site-config. `ignoreDeadLinks` defaults to `false`; "When set to `true`, VitePress will not fail builds due to dead links." The page is the 2.0.0-alpha.21 docs per the research artifact; stable 1.6.4 behavior is stated unchanged there.
- Affected text, line 62: `| VitePress | none shipped | `lychee --include-fragments .vitepress/dist/` |`
- Lines 99 to 101 ("VitePress and mdBook ship none, so that arm is a reading check") are about breadcrumbs, not link checks, and need no change.
- Smallest change: replace `none shipped` with "`vitepress build` fails on a dead internal link (`ignoreDeadLinks` defaults to `false`; keep it off)". Keep the lychee fallback for anchors and external links.

### 1c. lychee `--root-dir`: confirmed by primary source
- Source: https://lychee.cli.rs/guides/cli/. Quote: `--root-dir` "is required if absolute links appear in local files, otherwise those links will be flagged as errors." The path must be absolute.
- Affected text, lines 60 to 64: every fallback reads `lychee --include-fragments <dir>/` with no `--root-dir`.
- Smallest change: write each fallback as `lychee --root-dir "$PWD/<dir>" --include-fragments <dir>/`, for example `lychee --root-dir "$PWD/site" --include-fragments site/`.

## Item 2: reader-signals.md, vendor table

Table at lines 74 to 80.

### 2a. Plausible "on every plan": confirmed by primary source (for properties); event-availability claim could not be confirmed
- Source: https://plausible.io/docs/custom-props/introduction. Quote: "Custom properties is a Business plan feature." The research artifact records $19 a month on the homepage listing; the pricing URL returned 404 on 2026-11-27.
- https://plausible.io/docs/custom-event-goals does not state plan limits for named events, so "named events on every plan" is neither confirmed nor refuted. The zero-result and feedback-vote signals in this skill need a property (page, vote), so the Business plan is the true floor for them.
- Affected text, line 77: `| Plausible | free, AGPL | about 9 a month at the smallest tier | yes, on every plan |`
- Smallest change: set the last cell to "named events yes; properties need the Business plan (about 19 a month)". The "about 9 a month" entry-tier figure is not re-checked here; the pricing page was unreachable.

### 2b. Umami free tier: confirmed by primary source
- Source: https://umami.is/pricing. Hobby is $0 a month with up to 100K events a month (Pro $20 per research artifact).
- Affected text, line 78: `| Umami | free, MIT | a free hobby tier is reported, unconfirmed at the vendor's own page | yes, including the free tier |`
- Smallest change: replace the third cell with "free Hobby tier, 100K events a month". Also edit the intro sentence ("Two rows below were read from third-party trackers rather than the vendor") to count only the rows still unconfirmed.

### 2c. Fathom: confirmed by primary source
- Source: https://usefathom.com/docs/features/events. Events carry one required name and one optional options object whose only supported value is `_value`. No properties.
- Affected text, line 80: `| Fathom | not offered | about 45 a month | yes, on every plan |`
- Smallest change: set the last cell to "name and numeric value only, no properties". Then, because the feedback vote and zero-result signal need a property, the paragraph after the table ("A vendor with no named custom event cannot carry...") should also say a vendor with no properties cannot carry them, which rules out Fathom as well. The "about 45 a month" figure was not re-checked here.
