---
title: Search engines, analytics vendors, hosting tiers and forge APIs behind the zero-result loop and reader-signal rules (delta)
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 24
---

# Delta: search and analytics vendors, 2026-09-05 to 2026-11-27

Scope: one row per at-risk claim in `skills/docs-quality-reference/navigation.md` and `observability.md`. This is an update of the earlier research (`docs-navigation-search.md`, `docs-observability.md`), not a re-creation. Anything not listed below is untouched. All facts below were read from the vendor page or the upstream repository on 2026-11-27.

Method limits. The documentation pages were read through a fetch tool that summarises the page, so quotes are the summariser's rendering of the page text. Upstream release dates come from the GitHub API and the npm registry. The upstream change date for a docs-page fact is "not published" where the page carries no date.

## Summary

- Search libraries are unchanged. lunr, minisearch and elasticlunr have no release in the window, so DOC-NAV-11 stands.
- Pagefind shipped 1.6.0 on 2026-11-01. Its notes add no zero-result hook and no synonym or stop-word key. `pagefind.search()` still exists. DOC-NAV-16 stands.
- Cloudflare Workers Free (100,000 requests a day) and Paid ($5 a month) are unchanged.
- Umami's pricing page renders now. Hobby is $0 (100K events), Pro is $20 a month. The "roughly $20 a month hosted" claim holds for Umami, and `umami-cloud-pricing` can close.
- One claim is wrong against the current docs: Fathom events carry only a name and an optional `_value`, with no properties. DOC-OBS-16 says Fathom carries named events with properties.
- Plausible custom properties are a Business-plan feature ($19 a month on the homepage listing). The "up to roughly $20" figure still holds, but the cheapest tier does not carry properties.
- DocSearch v5 is stable and v4 is marked Legacy. Ask AI in v5 runs on Agent Studio only.
- Everything else (GA4, GitHub traffic API, giscus, `createDiscussion`, GitHub Pages) is unchanged.

## Findings (one row per claim)

| # | Claim at risk | Verdict | Evidence |
|---|---|---|---|
| 1 | DOC-NAV-11: none of lunr, minisearch, elasticlunr reads `synonyms`, `removeWordsIfNoResults`, `optionalWords`, `ignorePlurals`, `removeStopWords`; none exposes a zero-result hook | unchanged | lunr latest is 2.3.9 (last commit 2020-08-19, npm modified 2023-07-10). minisearch latest is 7.2.0 (2025-09-16, before the window; npm `latest` 7.2.0). elasticlunr latest tag v0.9.6 (last commit 2019-10-10; npm 0.9.5, modified 2022-06-16). No release in the window for any of the three. Sources: [lunr tags](https://github.com/olivernn/lunr.js/tags), [minisearch releases](https://github.com/lucaong/minisearch/releases), [elasticlunr tags](https://github.com/weixsong/elasticlunr.js/tags), npm registry entries for each. Caveat: Material for MkDocs and VitePress wrap these libraries; wrapper releases were not checked in this pass. |
| 2 | DOC-NAV-16: "Calling `pagefind.search()` passes" (Pagefind API) | unchanged | [Pagefind JS API](https://pagefind.app/docs/api/) still documents `await pagefind.search("static")` returning `results` with `id` and `data()`, plus `filters` and `sort`. No zero-result hook and no synonym or stop-word option is documented. [v1.6.0 notes](https://github.com/CloudCannon/pagefind/releases/tag/v1.6.0) (2026-11-01) cover ICU4X segmentation, `--max-fragments`, sub-result titles, Component UI attributes, `excerptEllipsis`, and fixes. Note: the API page says 1.5.0 introduced the Component UI that replaces the Default UI (`PagefindUI`). Rule text that names `PagefindUI` as the shipped UI should not claim it is the current default. |
| 3 | mdBook / elasticlunr row ("`searcher.js` is internal") | unchanged | mdBook latest release v0.5.4 on 2026-07-06 (before the window). No release in the window. |
| 4 | Sink table: "$0 on a serverless free tier of 100,000 requests a day, $5 a month past it" | unchanged | [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): Free 100,000 requests per day. Paid $5 minimum per month, 10 million requests included, $0.30 per extra million. Change notes concern Workers Logs pricing from 2026-12-01, Workflows, and Durable Objects storage, none of which the sink uses. |
| 5 | Sink table: Umami "up to roughly $20 a month hosted" | unchanged | [Umami pricing](https://umami.is/pricing) renders. Hobby $0 with 100K events a month; Pro $20 with 1 million events and $0.00003 per extra event; Business $200; Enterprise custom. Custom events with properties are listed on every plan. Each saved property also counts toward event usage. |
| 6 | Sink table: Plausible "up to roughly $20 a month hosted" | unchanged on price, with a new qualifier | The [Plausible pricing URL](https://plausible.io/pricing) returned 404 on 2026-11-27. The [homepage](https://plausible.io/) lists Starter $9, Growth $14, Business $19 a month, a 30-day free trial, yearly billing with two months free. The [custom properties docs](https://plausible.io/docs/custom-props/introduction) say "Custom properties is a Business plan feature", up to 30 properties per event, scalar values. So the zero-result event with a query property needs Business at $19, still under $20. The earlier text does not say properties need the top listed tier; consider adding that. The homepage prices could not be confirmed on a dedicated pricing page. |
| 7 | "GitHub Pages logs visitor requests and never exposes that log to the owner" | unchanged | [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) says the visitor IP address "is logged and stored for security purposes" and mentions no owner access or traffic statistics. [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) says nothing about logs or analytics. Absence of an owner-facing log is confirmed only by absence in these pages. |
| 8 | "Enabling GA4 Enhanced Measurement never satisfies this" (DOC-NAV-10) | unchanged | [GA4 enhanced measurement](https://support.google.com/analytics/answer/9216061) lists `view_search_results`, which fires "each time a user is presented with a search results page, as indicated by the presence of a URL query parameter" (q, s, search, query, keyword). It is keyed to a URL query parameter, not to a result count, and the page does not say it fires on zero results. A site whose search runs client-side without a URL parameter fires nothing. The live DebugView check (`ga4-debugview-last-mile`) is still not run. |
| 9 | DocSearch free-tier "No Results Rate" dashboard | could not determine | [Algolia analytics metrics](https://www.algolia.com/doc/guides/search-analytics/concepts/metrics/) lists "No results rate" under Overview: "The No Results Rate chart shows the percentage of searches with no results." The page does not say which plans include it, and the [DocSearch intro](https://docsearch.algolia.com/docs/what-is-docsearch) does not mention analytics. Whether the free DocSearch program exposes the dashboard is still unconfirmed. Keep `docsearch-free-tier-dashboard` open. |
| 10 | Legacy status of DocSearch v4 Ask AI | changed (clarified) | [Migrate from v4](https://docsearch.algolia.com/docs/migrating-from-v4) (page last updated 2026-08-07, before the window start; no v5 release date given): version menu lists v5.x as Stable and v4.x, v3.x, v1.x to v2.x as Legacy. In v5 the legacy Ask AI token and chat transport are removed, Agent Studio is the only backend, `assistantId` becomes `agentId`, `indexName` is replaced by an `indices` array. DocSearch 5.0.0 is available. The claim "v4 Ask AI is legacy" holds and is now stronger: the v4 transport is removed in v5. The page gives no end-of-support date for v4. |
| 11 | DOC-OBS-16: "Plausible, Umami and Fathom carry named events with properties" | changed (Fathom part is wrong against current docs) | [Fathom events](https://usefathom.com/docs/features/events) and [events overview](https://usefathom.com/docs/events/overview): an event takes a required name and one optional options object whose only supported key is `_value` ("Value in cents"). No properties, metadata or attributes are described. Plausible (Business plan) and Umami (all plans) do carry properties. A secondary source in a web search also says Fathom has no custom properties. I could not tell from the page whether Fathom ever had properties, so the date of an upstream change is "not published"; the claim is wrong against the current docs regardless. Fix: drop Fathom from the qualifying list, or restate it as "named events with a numeric value only". The 30-day nonzero-traffic denominator is still satisfied by Fathom's pageview count; the properties are what a feedback widget needs. |
| 12 | DOC-OBS-16: GoatCounter does not carry properties | unchanged | [GoatCounter events](https://www.goatcounter.com/help/events): fields are name, title, referrer and a no-session flag; "There is currently no real way to record the path with the event." No custom properties. |
| 13 | DOC-OBS-16: Cloudflare Web Analytics does not carry named events | unchanged (absence only) | [CF Web Analytics docs](https://developers.cloudflare.com/web-analytics/) and [high-level metrics](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/) list Visits, Page views, Page load time, Core Web Vitals; no custom events. The full docs index lists no custom-events page. This is an absence finding, not a negative statement by Cloudflare. |
| 14 | `gh api repos/<owner>/<repo>/traffic/views` must return 200 | unchanged | [REST traffic docs](https://docs.github.com/en/rest/metrics/traffic?apiVersion=2022-11-28): `GET /repos/{owner}/{repo}/traffic/views`, for repositories "that you have write access to", returns 200 with `count`, `uniques`, `views[]`, last 14 days, other status 403. Live check with an authenticated `gh` returned a body with `count`; an unauthenticated request returned 401. Practical note for the rule: the check needs a token with push access, and the data window is only 14 days, so a 30-day nonzero check needs periodic sampling. |
| 15 | DOC-OBS-17: giscus visitors must authorize the app through the GitHub OAuth flow | unchanged | [giscus.app](https://giscus.app/): "To comment, visitors must authorize the giscus app to post on their behalf using the GitHub OAuth flow." Visitors may instead comment directly on the GitHub Discussion. Repo must be public, the app installed, Discussions enabled. |
| 16 | DOC-OBS-17: `createDiscussion` mutation needs no reader account | unchanged (schema), authorization not shown | Live GraphQL introspection on 2026-11-27: `createDiscussion` exists, "Create a discussion.", input fields `repositoryId`, `title`, `body`, `categoryId`, `clientMutationId`. The docs pages fetched did not state an auth requirement. The mutation itself needs an authenticated caller; "no reader account" means the call is made by a server-held token, not the reader. The rule should keep saying the token is the owner's. |
| 17 | Open question `umami-cloud-pricing` | close | The vendor's own page [umami.is/pricing](https://umami.is/pricing) now renders: Hobby $0 / 100K events, Pro $20 / 1M events, Business $200 / 10M events, Enterprise custom, properties on every plan. The Plausible equivalent is not closed: the dedicated pricing URL 404s and only homepage figures were read. |

## Normative guidance candidates

1. Rule to change: DOC-OBS-16 list of qualifying signals.
   - Rule: Name only Plausible (Business plan) and Umami as custom-event-with-properties signals. Remove Fathom, or list it as events with a numeric value only.
   - Rationale: Fathom's docs allow only a name and `_value`, so a feedback widget cannot carry a page or a vote as a property.
   - Verification: read the [Fathom events page](https://usefathom.com/docs/features/events); `grep -n "Fathom" skills/docs-quality-reference/observability.md` must show it outside the properties list.
2. Rule to add as a qualifier on the Plausible entry (DOC-NAV sink table, DOC-OBS-16).
   - Rule: State that Plausible properties need the Business plan ($19 a month on its homepage).
   - Rationale: the cheapest tiers carry events without properties; a manifest naming Plausible would otherwise be unachievable.
   - Verification: reading heuristic. A manifest naming Plausible for a zero-result event with a query property also names the plan.
3. Rule to refresh: DOC-OBS-16 traffic check.
   - Rule: Add that `traffic/views` needs push access and returns only the last 14 days.
   - Rationale: a one-shot call cannot prove 30 consecutive nonzero days.
   - Verification: `gh api repos/<owner>/<repo>/traffic/views --jq '.count'` returns a number; the manifest records the sampling schedule.
4. Rule to refresh: DOC-NAV-16 and any prose naming `PagefindUI`.
   - Rule: Prefer `pagefind.search()` and the Component UI; do not describe `PagefindUI` as the current default.
   - Rationale: the API docs say 1.5.0 introduced the Component UI that replaces the Default UI.
   - Verification: `grep -rn "PagefindUI" skills/docs-quality-reference rules/docs-quality.md` finds no "current default" wording.

## AI-agent angle

- An agent will list Fathom beside Plausible and Umami as property-capable because older blog posts and generic analytics comparisons say so. Check: fetch the vendor events page and grep for "propert".
- An agent will treat Plausible's Starter tier as enough for custom properties. Check: the plan named in the manifest is Business or higher.
- An agent will use `PagefindUI` from older Pagefind snippets. Check: the grep in candidate 4.
- An agent will call `traffic/views` without a token and read the 401 as "no traffic". Check: the command is run with an authenticated `gh`.

## Contested / evolving

- DocSearch v5 is Stable and Ask AI moves to Agent Studio. Trend: keyword search and Ask AI are split into separate entry points. As of 2026-08-07 (page date); no v5 release date is published.
- Cloudflare Workers Logs move to Cloudflare Observability pricing on 2026-12-01. This does not touch the Workers request pricing used by the sink, but a Worker that logs its beacon hits may see a bill after that date.
- Pagefind has no zero-result hook; a site on Pagefind still needs to wrap `pagefind.search()` and test `results.length`. Not a change in the window.

## Not determined

- Whether the free DocSearch program exposes the No Results Rate dashboard.
- Whether a live GA4 DebugView session shows `view_search_results` for a client-side search with no URL parameter (`ga4-debugview-last-mile`).
- A dedicated Plausible pricing page (the URL 404ed); homepage prices were used.
- Whether Fathom ever supported event properties; only the current docs were read.
- Wrapper releases (Material for MkDocs, VitePress, mdBook search UI) were not checked, only the underlying libraries.

## Sources

| URL | What it is | Date / era | Why read |
|---|---|---|---|
| https://github.com/olivernn/lunr.js/tags | lunr tags | latest 2.3.9, 2020 | row 1 |
| https://github.com/lucaong/minisearch/releases | minisearch releases | latest 7.2.0, 2025-09-16 | row 1 |
| https://github.com/weixsong/elasticlunr.js/tags | elasticlunr tags | latest 0.9.6, 2019 | row 1 |
| https://registry.npmjs.org/lunr, /minisearch, /elasticlunr | npm metadata | modified 2023, 2025, 2022 | rows 1 |
| https://github.com/CloudCannon/pagefind/releases/tag/v1.6.0 | Pagefind 1.6.0 notes | 2026-11-01 | row 2 |
| https://pagefind.app/docs/api/ | Pagefind JS API | current | row 2 |
| https://github.com/rust-lang/mdBook/releases | mdBook releases | v0.5.4, 2026-07-06 | row 3 |
| https://developers.cloudflare.com/workers/platform/pricing/ | Workers pricing | current | row 4 |
| https://umami.is/pricing | Umami pricing | current | rows 5, 17 |
| https://plausible.io/ | Plausible homepage pricing | current | row 6 |
| https://plausible.io/docs/custom-props/introduction | Plausible custom properties | current | rows 6, 11 |
| https://plausible.io/docs/custom-event-goals | Plausible custom events | current | row 11 |
| https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages | Pages overview | current | row 7 |
| https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | Pages limits | current | row 7 |
| https://support.google.com/analytics/answer/9216061 | GA4 enhanced measurement | current | row 8 |
| https://www.algolia.com/doc/guides/search-analytics/concepts/metrics/ | Algolia metrics | current | row 9 |
| https://docsearch.algolia.com/docs/what-is-docsearch | DocSearch intro | current | rows 9, 10 |
| https://docsearch.algolia.com/docs/migrating-from-v4 | DocSearch v4 to v5 | page dated 2026-08-07 | row 10 |
| https://usefathom.com/docs/features/events | Fathom events | current | row 11 |
| https://usefathom.com/docs/events/overview | Fathom events overview | current | row 11 |
| https://usefathom.com/pricing | Fathom pricing | current | row 11 (price context only) |
| https://www.goatcounter.com/help/events | GoatCounter events | current | row 12 |
| https://developers.cloudflare.com/web-analytics/ and /data-metrics/high-level-metrics/ | CF Web Analytics | current | row 13 |
| https://docs.github.com/en/rest/metrics/traffic?apiVersion=2022-11-28 | REST traffic | current | row 14 |
| https://giscus.app/ | giscus | current | row 15 |
| GitHub GraphQL introspection via `gh api graphql` (CreateDiscussionInput, Mutation) | live schema | 2026-11-27 | row 16 |
