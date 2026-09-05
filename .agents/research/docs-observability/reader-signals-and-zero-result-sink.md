---
title: Reader signals and the zero-result sink
topic: reader-signals-and-zero-result-sink
group: docs-observability
wave: 2
agent: docs-observability-reader-signals-researcher
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 25
scope: >
  Commission zero-result-ownership-and-sink, widened by the orchestrator to
  cover the reader-signal half of observability. Adjudicates the DOC-NAV-10
  vs DOC-OBS-12 zero-result-capture ownership conflict. Prices a sink for the
  zero-result beacon on a static-hosted MkDocs Material, VitePress and mdBook
  site: a self-hosted endpoint, a static-host log line, and Pagefind with
  capture. Prices a per-page feedback widget and names where its vote lands.
  Compares four privacy-preserving analytics vendors on what each can answer
  about a docs funnel. Prices what a repo with zero backend can still
  capture. Settles the GA4 Enhanced Measurement overlay-search question by
  mechanism. Does not re-litigate nav depth, the plain-English rules, or the
  drift and link-check rules already settled in docs-observability.md.
revises:
  - docs-navigation-search.md
  - docs-observability.md
  - docs-observability/minimum-instrumentation-set.md
  - docs-navigation-search/search-contract-and-zero-result-loop.md
---

# Reader signals and the zero-result sink

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Why the two groups disagreed](#f1)
   2. [Pricing the zero-result sink](#f2)
   3. [GA4 Enhanced Measurement, settled by mechanism](#f3)
   4. [The mkdocs-material search-worker override is not currently broken](#f4)
   5. [The feedback widget: bias, and where the vote lands](#f5)
   6. [Four privacy-preserving analytics vendors, priced](#f6)
   7. [What a repo with zero backend can still capture](#f7)
   8. [The exact wiring check, per generator](#f8)
   9. [What the rule requires, what it defers, and why](#f9)
3. [Normative guidance candidates](#normative)
4. [AI-agent angle](#ai-agent)
5. [Contested / evolving](#contested)
6. [Sources](#sources)

## Summary

- The DOC-NAV-10 vs DOC-OBS-12 conflict is not a disagreement about facts. It is two groups pricing different halves of the same problem. Nav priced the beacon (cheap, works today). Observability priced the sink (never priced at all). Once the sink is priced, both halves clear, so the signal moves from deferred to required.
- Require the zero-result event fleet-wide. The blocking precondition DOC-OBS-12 named, a query-logging search backend, does not exist for any of the fleet's three engines and never will without a migration. That was never the actual blocker. The actual blocker was that nobody had priced where the event goes, and every option turns out to cost zero to twenty dollars a month.
- Cheapest sink: a Cloudflare Worker on the free tier (100,000 requests a day, no card required) writing to a KV or D1 store, or an existing Umami instance's custom-event API if the site already runs Umami for page analytics. Both clear the fleet's real traffic by several orders of magnitude.
- The "static-host log line" option the brief asked me to price turns out to be the expensive one, not the cheap one. GitHub Pages logs visitor IPs for its own security purposes and does not expose those logs to the site owner at all ([GitHub Pages docs](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)). A log-line sink only exists on a host that exposes raw logs to the owner, which for most of this fleet means paying for a tier the free options already beat.
- Pagefind-with-capture is not a cheaper sink. Pagefind ships no analytics of its own. "With capture" means writing the same beacon this file already prices, on top of a real migration off the generator's built-in search. Its advantage is a documented public search API instead of a monkey-patched internal file, not a lower cost.
- GA4 Enhanced Measurement's automatic `view_search_results` event is confirmed, from Google's own mechanism description, to fire only when one of five URL query parameters is present at a page view ([Google Analytics Help](https://support.google.com/analytics/answer/9216061)). MkDocs Material's overlay search never writes a query parameter into the URL during normal typing, so the automatic event cannot fire for it. This was argued before. It is now settled by mechanism, with one honest gap: no live GA4 DebugView session was run, because this pass has no browser-control tool. A 10-minute manual check on a live site would close that gap completely, and the mechanism evidence already predicts what it will show.
- `squidfunk/mkdocs-material#2973`, the search-worker override bug DOC-NAV-16 cites, was fixed and released in Material 7.2.6, confirmed directly against the closed issue's own last comment. The fleet pins 9.7.7, many releases later. The override point is not broken on the fleet's pinned version. DOC-NAV-16's underlying reason to prefer Pagefind's public API still holds, because Material's own maintainer states in that same issue thread that custom search workers get no further support beyond the shipped documentation.
- Confirmed live against GitHub's own GraphQL schema: `createDiscussion` exists as a real, callable mutation, taking `repositoryId`, `categoryId`, `title` and `body`. A serverless function holding a repo-scoped token can file a feedback vote as a Discussion with no reader-facing GitHub account required. This is a cheaper, less biased sink than the popular alternative.
- The popular alternative, giscus, requires the reader to authorize a GitHub OAuth app before posting ([giscus.app](https://giscus.app/)). That adds a second selection filter on top of the survivorship bias every feedback channel already has: only a reader both engaged enough to vote and willing to hand a docs site GitHub OAuth access shows up in the count.
- Restore the dropped feedback-widget rule (`minimum-instrumentation-set.md` NG5), and give it the checkable precondition it lacked: require a real 30-day page-analytics number to exist before a feedback widget ships, and require the bias disclosure the moment it does.
- Of the four privacy-preserving vendors compared, only Plausible, Umami and Fathom support named custom events with properties, the shape a zero-result beacon or a feedback vote needs. GoatCounter and Cloudflare Web Analytics are pageview-only and cannot carry either signal.
- Umami is the only one of the four with a genuine free tier at both ends: self-hosted is MIT-licensed and free with no usage cap (confirmed against Umami's own GitHub repository), and its hosted Cloud plan's free Hobby tier reportedly covers 100,000 events a month. Plausible has no perpetual free tier, starting at $9 a month for 10,000 monthly pageviews. Fathom has no free tier at all, starting at $45 a month for up to 500,000 pageviews.
- None of the four vendors ships a pre-built "docs funnel" report. "Funnel" is a name for goal and custom-event tracking a project assembles itself, by naming an event at each tier boundary (first-steps reached, everyday task completed) the way `docs-use-case-discovery.md`'s tier model already names them.
- A repo with genuinely zero backend, no generator, no site, no build, still has one free signal available with no setup at all: GitHub's own Repository Traffic API, 14 days of daily or weekly views and top paths, for any repo the caller can push to ([GitHub REST API docs](https://docs.github.com/en/rest/metrics/traffic)). Confirmed live against this program's own repository during this research.
- That Traffic API measures github.com browsing of the repository, not a deployed docs site's own domain. It is the right fit for exactly the three fleet surfaces this program already found with a `docs/` tree and no generator, `creeptd-ng`, `kate-middlechild` and `grimoire-lore`, since they have no other traffic signal available to them at all.
- Algolia's own analytics docs confirm "No Results Rate" and "Searches without Results" are base-plan metrics with no paid-tier callout, unlike its revenue metrics ([Algolia docs](https://www.algolia.com/doc/guides/search-analytics/concepts/metrics/)). This raises confidence, without fully confirming it, that DocSearch's free program includes the same dashboard.
- Own the requirement in the DOC-NAV family, not DOC-OBS. DOC-NAV already carries the beacon's full lifecycle, fire, fix, classify, review, bind. DOC-OBS-12 keeps its general "defer a genuinely blocked signal" shape, but loses zero-result search as its worked example, since this research clears that signal's blocking precondition. Agent-versus-human traffic share becomes DOC-OBS-12's new example, since it is still genuinely blocked on most of this fleet's static hosting.
- The one gap this file cannot close by desk research: whether a beacon with a sink URL but no deployed listener still passes a bare `grep` for the event name. It does, today. Close it by requiring the same file also contain a network call, `fetch` or `sendBeacon`, in the same script, not just the event string.

## Findings

### 1. Why the two groups disagreed {#f1}

`docs-navigation-search.md` requires a zero-result event fleet-wide at SHOULD (DOC-NAV-10). `docs-observability.md` explicitly refuses that same requirement and defers it at SHOULD instead (DOC-OBS-12), citing "9 of 9 fleet sites run client-side search with no query-logging path." Both statements are true and both cite the same underlying measurement, `ux-observability-posture.md` §2's 0-of-9 finding. They read the same fact in opposite directions because they were scoped to different halves of the mechanism.

The nav sub-artifact, `search-contract-and-zero-result-loop.md` §3, priced the part that fires the event: a DOM-level beacon on the existing search box, roughly 20 to 30 lines of JavaScript, costing nothing and needing no backend, because the browser already computes the zero-result state to render it to the reader. That part is genuinely unblocked today.

The observability sub-artifact, `minimum-instrumentation-set.md` §8, only considered the part that stores and reads the event, and correctly noted the fleet has no hosted, query-logging search backend of the kind Algolia's remediation playbook assumes. That part looked genuinely blocked, because nobody had priced an alternative sink.

Neither group was wrong about its own half. The conflict exists because "requires a query-logging search backend" was stated as the precondition for the whole signal, when it is really only the precondition for one specific *kind* of sink, the kind that ships built into a hosted search product. A sink does not require a hosted search backend. It requires somewhere to send an event, which the next finding prices.

### 2. Pricing the zero-result sink {#f2}

Three sink shapes, priced against a static-hosted docs site with no existing infrastructure.

**Self-hosted endpoint.** A Cloudflare Worker's free tier includes 100,000 requests a day and 10 milliseconds of CPU time per invocation, with no card required ([Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). Writing the event to a KV store adds 1,000 free writes a day and 1 GB of free storage on the same tier. Writing it to a D1 database instead adds 100,000 free row writes a day and 5 GB of free storage. None of the fleet's nine sites is close to that volume. The paid tier, if a project ever outgrows the free one, starts at $5 a month for 10 million requests. This is the cheapest and most portable option: the same Worker can also receive the feedback-widget vote from Finding 5, so a project that builds it once pays the fixed cost once.

**Static-host log line.** This is the option that looked cheapest on paper and is not. GitHub Pages, the host this fleet's repos are most likely to reach for, logs visitor IP addresses "for security purposes" but that log is never exposed to the site owner ([GitHub Pages docs](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)). A beacon fired as a plain GET request to a tracking pixel has nowhere to land unless the host is one that does expose raw access logs to its owner, and the hosts that do (Cloudflare's Logpush, a self-managed VPS) either gate that feature behind an Enterprise plan or require running a server this fleet does not run today. A "log line" sink therefore collapses back into standing up a serverless function, the same cost as the option above, with no advantage.

**Pagefind with capture.** Pagefind ships no built-in analytics of its own. The fetched sub-artifact already established this. "With capture" means the same `results.length === 0` check and the same beacon this finding already prices, called against Pagefind's documented `pagefind.search()` API instead of watching a theme's rendered DOM text ([pagefind.app](https://pagefind.app/)). Its cost is not the beacon, which is identical either way. Its cost is the migration: disabling the generator's built-in search plugin and standing up a custom search UI against Pagefind's index. That is real engineering, worth doing for a site that also wants Pagefind's chunked-index scaling on a large site, not worth doing for the zero-result signal alone.

**Which fleet hosting was actually measured.** No prior audit in this program recorded which host each of the nine sites deploys to, so this pass checked directly with `gh api repos/<owner>/<repo>/pages`. Eight of the nine sites confirm `build_type: workflow`, meaning they deploy through GitHub's own Pages Actions build: `ocx-sh/catalog`, `grimoire-rs/grimoire`, `grimoire-rs/indexer`, `ocx-sh/indexbot`, `ocx-sh/ocx-mcp`, `ocx-sh/ocx-mirror-sdk`, `ocx-sh/ocx-sdk-python` and `ocx-sh/ocx-mirror`. The ninth, `ocx-sh/ocx`, reports `has_pages: false` on the same API and deploys instead to Cloudflare Pages, confirmed against its own `.github/workflows/deploy-website.yml:252-300`, which runs `wrangler pages deploy` and is fronted by an nginx reverse proxy the project already operates at its own domain (the workflow's own comment: "nginx proxies ocx.sh -> ocx-website.pages.dev"). So the GitHub-Pages log limitation this finding prices applies to 8 of 9 sites exactly as stated. The ninth already owns a reverse proxy that could, in principle, log a beacon as a plain access-log line at close to zero marginal cost, cheaper than standing up a new Worker, but this research could not inspect what that proxy currently logs, since nginx's own configuration lives on infrastructure outside any repo this program can read. A project on Netlify or Cloudflare Pages directly, with no reverse proxy of its own, still lands on the same Worker-based sink priced above, see Finding 6 for the vendor alternative.

The upshot: every sink shape a project would actually reach for costs at most a few dollars a month and most cost nothing. The precondition DOC-OBS-12 named for this signal is cleared.

### 3. GA4 Enhanced Measurement, settled by mechanism {#f3}

`docs-navigation-search.md`'s open question `ga4-overlay-search-verification` asked for a live DebugView observation on a Material 9.7.7 site to settle whether Enhanced Measurement's site-search detection fires for an overlay search. This research could not run that live observation, because this pass has no browser-control tool, only fetch-based reading. It can, and does, settle the question a different way: by reading Google's own description of the trigger mechanism closely enough that the live observation becomes predictable rather than open.

Google's own help article states the exact trigger condition: "By default, the event is triggered based on the presence of one of the following 5 query parameters in the URL: q, s, search, query, keyword," configurable to watch additional parameters, and evaluated against the URL at each page view ([Google Analytics Help: view_search_results](https://support.google.com/analytics/answer/9216061)). The mechanism is a URL check on navigation, not a DOM check on the search box.

Material for MkDocs's own search feature docs confirm its default search box never writes a query parameter into the address bar while a reader types. The one feature that touches the URL at all is `search.share`, and its own docs state plainly that it acts "when a user clicks the share button," not automatically on every query ([Material for MkDocs: search setup](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/)). A reader who gets zero results and gives up, the exact case this whole signal exists to catch, has no reason to click a share button on a page with nothing to share.

Combining the two: GA4's automatic detection needs a URL parameter that Material's search never sets during normal use, so the event cannot fire for a zero-result search under Enhanced Measurement's documented mechanism. This upgrades the claim from argued, resting on reasoning about how the pieces probably interact, to measured, resting on two primary sources' own stated mechanisms read together. The one honest residual gap: nobody has watched the DebugView panel while typing a nonsense query into a live site. That is a ten-minute check for whoever wants the literal last mile, and this finding predicts what it will show.

### 4. The mkdocs-material search-worker override is not currently broken {#f4}

`docs-navigation-search.md`'s open question `mkdocs-material-worker-override-status` asked whether the fleet's pinned 9.7.7 carries the fix for `squidfunk/mkdocs-material#2973`, the override bug DOC-NAV-16 cites as its measured reason to prefer Pagefind's public API over patching Material's internals.

Fetched directly against the issue itself: it was filed in August 2021, and its own maintainer, having implemented the fix, states in the closing comment, "Released as part of 7.2.6." The fleet pins Material 9.7.7, many major and minor releases later. The override point is not broken on any version this fleet runs.

This does not overturn DOC-NAV-16. The same issue thread's maintainer comment adds, immediately after describing the fix, "we cannot provide further support for implementing a custom search worker beyond what's already listed in the documentation." An override point that works but carries no support commitment is still a worse bet than Pagefind's documented, versioned public API for a rule meant to survive generator upgrades unattended. What changes is the confidence label: the fleet's current exposure to this specific bug is nil, so DOC-NAV-16's rationale should cite the maintainer's declined-support statement as its primary reason going forward, not the closed bug.

### 5. The feedback widget: bias, and where the vote lands {#f5}

`minimum-instrumentation-set.md` NG5 required a bias disclosure the moment a feedback widget ships. The consolidation into `docs-observability.md` kept the disclosure requirement folded into DOC-OBS-08's general metric rule but dropped the feedback-widget rule itself, so the shipped rule set has no standing rule about per-page feedback at all. This finding restores it and prices its sink.

Every self-selected feedback channel shares one bias, already established: the reader who almost succeeded is the one who stays to click a widget, and the reader who was completely lost leaves no trace at all (`minimum-instrumentation-set.md` §7, citing the survivorship-bias framing). A "was this helpful" widget adds a second, mechanism-specific bias on top, depending on where its vote goes.

**GitHub Discussions via giscus.** Giscus is a free, open-source, no-tracking widget that posts a reader's comment as a GitHub Discussion. Its own site states plainly that "visitors must authorize the giscus app to post on their behalf using the GitHub OAuth flow" ([giscus.app](https://giscus.app/)). Every vote through this sink is filtered twice: once by the baseline survivorship bias, and again by whether the reader has a GitHub account and is willing to hand it OAuth access. A reader new enough to the ecosystem to be genuinely confused by the docs is exactly the reader least likely to clear that second filter.

**GitHub Discussions via a serverless function.** Confirmed live against GitHub's own GraphQL schema during this research: `createDiscussion` exists as a real, documented mutation, requiring `repositoryId`, `categoryId`, `title` and `body`. A small serverless function, the same Cloudflare Worker priced in Finding 2, can hold a repo-scoped token and file the vote as a Discussion on the reader's behalf, with no GitHub account and no OAuth step required of the reader. This clears the second filter giscus cannot, at the same infrastructure cost this file already prices for the zero-result sink, meaning a project that stands up one Worker gets both signals for one fixed cost.

**A form endpoint.** A hosted form product (the shape the brief named) can also receive the vote. This research could not confirm current exact pricing at the primary source. The vendor's pricing page did not return usable content to a non-JavaScript fetch. Given that the serverless-function sink above already exists at the same infrastructure cost this file prices for the zero-result beacon, a form endpoint is not the cheaper path once a project has any reason to stand up a Worker at all, and it is not recommended as the default.

**An analytics vendor's custom event.** Both Umami (`data-umami-event="feedback-yes"`, or the JavaScript `umami.track()` call) and Plausible (`plausible('Feedback', {props:{vote:'yes'}})`) accept a feedback vote as a named custom event with properties, landing in that vendor's own dashboard rather than a Discussions thread. This is the natural sink for a project that already runs one of these vendors for page analytics, see Finding 6, since it needs no second integration.

The disposition: defer the widget until real traffic exists, restoring NG5, but give the precondition a check it never had, in Finding 9's normative candidates.

### 6. Four privacy-preserving analytics vendors, priced {#f6}

| Vendor | Self-host cost | Hosted free tier | Cheapest paid tier | Custom events | License / confirmation |
|---|---|---|---|---|---|
| Plausible | Free, own infra | None found, only a 30-day trial | $9/month, 10,000 monthly pageviews, one site | Yes, all plans, `plausible('Name', {props:{...}})` | AGPL-3.0, confirmed against [plausible/analytics](https://github.com/plausible/analytics) |
| Umami | Free, MIT, no cap | Reportedly 100,000 events/month, 3 sites, 6-month retention on the Hobby Cloud plan | Reportedly $20/month for 1,000,000 events | Yes, all tiers including free, `data-umami-event` attribute or `umami.track()` | MIT, confirmed directly against [umami-software/umami](https://github.com/umami-software/umami)'s own repository metadata |
| GoatCounter | Free, open source | Free "for reasonable public usage" of personal or small-to-medium sites ([goatcounter.com](https://www.goatcounter.com/)) | No paid tier found on the vendor's own site, donation-supported instead | Click-tracking only via `data-goatcounter-click`, no arbitrary named event with properties | Source-available, self-hosted from [arp242/goatcounter](https://github.com/arp242/goatcounter) |
| Fathom | Not offered (hosted-only product) | None | $45/month, up to 500,000 pageviews, custom events included at no extra fee, forever retention ([usefathom.com/pricing](https://usefathom.com/pricing)) | Yes, all tiers, "billed as if they were pageviews" | Closed-source hosted product |

Two rows have lower confidence than the rest. Plausible and GoatCounter's own pricing pages were fetched directly and returned usable content. Umami's live pricing page did not render usable content to this pass's fetch tool, a JavaScript-rendered page returning only its title. The Umami figures above come from independent pricing-tracker sites, not the vendor's own page, and should be re-confirmed before being cited as a hard number in a shipped rule. The self-host cost and license for both Plausible and Umami are confirmed directly against each project's own GitHub repository, which does not depend on the pricing page rendering.

What each can answer about a docs funnel, concretely: none of the four ships a pre-built "docs funnel" report. Plausible, Umami and Fathom all support named custom events and goal-style conversions, which is what a vendor calls "funnel" support once a project defines its own steps, for example an event at the first-steps page and a second event at a page representing "everyday task reached." GoatCounter answers only "which pages got how many views," with no way to attach a named step to a specific reader action beyond an outbound click. Cloudflare Web Analytics, a free RUM script any static site can add, answers the same page-traffic question as GoatCounter and nothing more. Its own docs describe it as collecting "page views and visitors" via the Performance API, with no custom-event mechanism found in its documentation ([Cloudflare Web Analytics docs](https://developers.cloudflare.com/web-analytics/about/)).

Algolia's own analytics reference, fetched directly, lists "No Results Rate" and a "Searches without Results" drill-down among its base metrics with no plan-restriction notice, unlike its revenue-related metrics which explicitly carry one ([Algolia docs](https://www.algolia.com/doc/guides/search-analytics/concepts/metrics/)). This is evidence, not confirmation, that a site accepted into the free DocSearch program gets the same dashboard: DocSearch's own program page is silent on analytics entirely, so a project relying on this should verify its own dashboard once accepted rather than assume it from this reading.

### 7. What a repo with zero backend can still capture {#f7}

A repo with no generator config, no build, no site at all still has one signal available at zero cost and zero setup: GitHub's own Repository Traffic API. Fetched directly and then confirmed live: the endpoint returns 14 days of view and unique-visitor counts at daily or weekly granularity, plus a ranked list of the most-visited paths in the repository, for anyone with push access ([GitHub REST API: Repository traffic](https://docs.github.com/en/rest/metrics/traffic)).

```
$ gh api repos/ocx-sh/grimoire-lore/traffic/views
{"count":9,"uniques":1,"views":[{"timestamp":"2026-08-24T00:00:00Z","count":2,"uniques":1}, ...]}

$ gh api repos/ocx-sh/grimoire-lore/traffic/popular/paths
[{"path":"/ocx-sh/grimoire-lore","title":"Overview","count":3,"uniques":1}, ...]
```

Both calls were run live against this program's own repository during this research and returned real, current data with no configuration of any kind. This is the cheapest signal in this entire file, and it needs nothing shipped to a reader's browser at all.

Its limit is exactly why it matters for this program specifically: it measures traffic to the github.com rendering of the repository, not to a deployed docs site's own domain. That makes it the wrong fit for the nine sites that already have a real generator and a real domain, where the vendors in Finding 6 answer the same question better. It is the right fit for the three surfaces the wave-1 critique's "surfaces never studied" list already named as ungoverned, `creeptd-ng`, `kate-middlechild` and `grimoire-lore`, each a `docs/` tree with no generator and therefore no other traffic signal available to it at all, at any price.

### 8. The exact wiring check, per generator {#f8}

Every generator watches a different DOM shape for its own rendered "no results" state, per DOC-NAV-16's existing boundary: read the rendered output or a public API, never the engine's internal file.

| Generator | Where the script lives | What it watches | Sink call location | Build-time verification |
|---|---|---|---|---|
| MkDocs Material | An `extra_javascript` entry declared in `mkdocs.yml`, a plain file under `docs/javascripts/` | A `MutationObserver` on the search results container, keyed to the engine's own localized no-results string, not a CSS class | A `fetch()` or `navigator.sendBeacon()` call to the Worker endpoint, in the same file, immediately after the event dispatch | `grep -rl "docs:zero-result-search"` over `docs/javascripts/`, then confirm both the event-listener registration and a `fetch\|sendBeacon` call appear in that same file, then confirm the string survives into `site/assets/javascripts/*.js` after build |
| VitePress | A theme enhancement registered in `.vitepress/theme/index.ts`'s `enhanceApp`, or a script referenced from `head` in `.vitepress/config.*` | A `MutationObserver` on the `.VPLocalSearchBox` results container's localized no-results string | Same fetch/beacon call, co-located in the theme file | Same two-part grep against `.vitepress/theme/`, then confirm the string survives into `.vitepress/dist/assets/*.js` |
| mdBook | An `additional-js` entry in `book.toml`, a plain file alongside, never `theme/searcher.js` itself | The rendered `#searchresults` container's empty-state text, since `copy-js: true` ships the bundled search JS as a plain readable file but DOC-NAV-16 forbids patching it directly | Same fetch/beacon call, in the separate additional-js file | Same two-part grep against the `additional-js` file, then confirm the string survives into `book/` after `mdbook build` |

The two-part grep closes the gap `docs-navigation-search.md`'s open question 1 already named: "a beacon with no listener is a no-op that still passes the grep." A grep for the event name alone cannot tell a wired beacon from a dead one. Requiring both the listener registration and a network call in the same file can.

### 9. What the rule requires, what it defers, and why {#f9}

| Signal | Disposition | Precondition, if deferred |
|---|---|---|
| Zero-result search event, fired client-side | Require | Cleared. Finding 2 prices a sink at $0 to $20/month for every fleet repo |
| A named sink for that event | Require | The sink must accept a named custom event or a webhook-style POST. GoatCounter and Cloudflare Web Analytics do not qualify on their own |
| GA4 Enhanced Measurement as a substitute for the above | Never accept, at any confidence level | Not applicable. Finding 3 settles this as a non-satisfier by mechanism |
| Docs issue template with a `docs` label | Require, unchanged | Already DOC-OBS-11 |
| Time to first working result, hand-measured and dated | Require, unchanged | Already DOC-OBS-07 |
| Per-page "was this helpful" widget | Defer | Requires a page-analytics vendor already reporting nonzero monthly pageviews for 30 days, so the widget's percentage has a real denominator the day it ships |
| Bias disclosure the moment a feedback percentage is published | Require the moment the widget ships | Not deferrable once the widget exists |
| Agent-versus-human traffic share | Defer | Requires a named, checkable consumer question in the PR description. Most of this fleet's static hosting cannot expose the data anyway |
| A hosted search migration (Pagefind, Algolia DocSearch, Typesense) | Never require | Named as an optional upgrade for other reasons, exactly as DOC-NAV-10 already states |

Ownership: the DOC-NAV family keeps the zero-result requirement, since it already owns the beacon's full lifecycle, fire, fix by rewording, classify, review cadence, and the public-API binding. DOC-OBS-12 keeps its general shape, defer a signal the stack genuinely cannot produce and name the precondition, but loses zero-result search as its worked example, since this file clears that precondition. Agent-versus-human traffic share takes its place as DOC-OBS-12's example, since Finding 6 and `minimum-instrumentation-set.md` NG8 both still find it genuinely blocked on most of this fleet's static hosting.

## Normative guidance candidates {#normative}

1. **Require a sink, not only a beacon, before DOC-NAV-10 counts as satisfied.** A grep that finds the event name alone cannot tell a wired beacon from a dead one.
   *Rationale:* closes the failure mode `docs-navigation-search.md` already named: a beacon with no listener is a no-op that still passes the grep.
   *Verification:* the same file that dispatches `docs:zero-result-search` also contains a `fetch(` or `sendBeacon(` call naming a same-repo-declared endpoint, checked with `grep -A5 "docs:zero-result-search" <file> | grep -E "fetch\(|sendBeacon\("`.
   *Evidence level:* measured (Finding 2 and Finding 8, whose endpoint options are priced, not assumed).
   *Severity:* SHOULD, matching DOC-NAV-10's existing severity.
   *Changes:* DOC-NAV-10.

2. **Retire the blocking precondition on zero-result capture.** A query-logging search backend is not required to fire or store the event. A serverless function or an already-adopted analytics vendor is enough, and both are priced at $0 to $20/month.
   *Rationale:* the precondition DOC-OBS-12 stated for this signal never actually described the cheapest sink shape, only the hosted-search-vendor shape.
   *Verification:* `unverified: reading heuristic`. A reviewer confirms the rule text no longer names "a query-logging search backend" as this signal's precondition, and instead names one of the sinks in Finding 2.
   *Evidence level:* measured (Finding 2's pricing table, three independently priced sink shapes).
   *Severity:* SHOULD, unchanged from DOC-NAV-10.
   *Changes:* DOC-OBS-12 (removes zero-result search as its worked example).

3. **Name agent-versus-human traffic share as DOC-OBS-12's new worked example.** It is still genuinely blocked: most of this fleet's static hosting cannot expose server logs, and no repo has named a consumer question the number would answer.
   *Rationale:* DOC-OBS-12's shape, defer a signal the stack cannot produce and record the precondition, still needs one live worked example once zero-result search is retired from that role.
   *Verification:* `unverified: reading heuristic`. The manifest entry for this signal names its precondition as "a stated, checkable consumer question," per `minimum-instrumentation-set.md` NG8.
   *Evidence level:* codified (`minimum-instrumentation-set.md` NG8, unchanged from wave 1).
   *Severity:* SHOULD, unchanged.
   *Changes:* DOC-OBS-12.

4. **Restore a per-page feedback-widget rule, deferred until a real denominator exists.** No standing rule about per-page feedback survived the wave-1 consolidation.
   *Rationale:* a feedback percentage published before any page-analytics number exists has no honest denominator, which is exactly what DOC-OBS-08 already forbids. This rule gives that prohibition a concrete precondition for this one signal.
   *Verification:* a feedback widget may ship only once the repo's page-analytics vendor (Finding 6) or its GitHub Traffic API fallback (Finding 7) reports a nonzero monthly figure for 30 consecutive days, checked against the vendor dashboard or `docs/.meta/observability.md`.
   *Evidence level:* codified (`minimum-instrumentation-set.md` NG5's disclosure requirement) + argued (the 30-day, nonzero-traffic threshold itself, which no external source supplies).
   *Severity:* CONSIDER, capped there because the operative verification number is argued, not because the disclosure duty itself is weak.
   *Changes:* NEW beside DOC-OBS-08, restores dropped NG5. Proposed ID: DOC-OBS-16.

5. **Name the vote's sink and its bias in the same manifest entry the moment a feedback widget ships.** A giscus-based sink adds a GitHub-OAuth filter on top of ordinary survivorship bias. A serverless-function sink to `createDiscussion` does not.
   *Rationale:* `minimum-instrumentation-set.md` §7 already requires a channel and denominator beside any reported percentage. This names the second, mechanism-specific bias a GitHub-Discussions sink specifically adds.
   *Verification:* the manifest entry for a "feedback" signal names its sink mechanism (giscus, a serverless `createDiscussion` call, a vendor custom event) and, if the sink requires reader authentication, states that plainly beside any reported percentage.
   *Evidence level:* measured (giscus's own stated OAuth requirement, confirmed against [giscus.app](https://giscus.app/), and GitHub's `createDiscussion` mutation, confirmed live against GitHub's own GraphQL schema).
   *Severity:* CONSIDER, following DOC-OBS-16, since it only ever fires alongside that already-deferred rule.
   *Changes:* NEW beside DOC-OBS-16. Proposed ID: DOC-OBS-17.

6. **Require at least one custom-event-capable page-analytics signal, or the GitHub Traffic API fallback, as the precondition DOC-OBS-16 names.** GoatCounter and Cloudflare Web Analytics do not qualify on their own, since neither supports a named custom event with properties.
   *Rationale:* a page-analytics vendor that cannot carry a named event cannot also serve as the zero-result or feedback sink, which matters if a project wants one vendor to serve both jobs.
   *Verification:* the observability manifest names the chosen vendor or endpoint and, for a repo with no generator config at all, names the GitHub Traffic API call in its place, checked with `gh api repos/<owner>/<repo>/traffic/views` returning a 200.
   *Evidence level:* measured (Finding 6's vendor comparison table and Finding 7's live Traffic API call).
   *Severity:* CONSIDER for the three no-generator repos specifically, since the signal is a nice-to-have with no other rule depending on it.
   *Changes:* NEW beside DOC-NAV-01's applicability boundary. Proposed ID: DOC-OBS-18.

7. **Upgrade the GA4-Enhanced-Measurement non-satisfier claim from argued to measured.** Both halves of the mechanism, Google's own trigger description and Material's own search-sharing behavior, are now read together and cited by their own primary sources.
   *Rationale:* an agent reaching for "just enable GA4 site search" should be stopped by a documented mechanism, not by a hedge.
   *Verification:* `unverified: reading heuristic` for the residual gap, a live DebugView session, but the evidence line itself should cite both fetched sources rather than reading "argued."
   *Evidence level:* measured (Google Analytics Help's `view_search_results` trigger description and Material for MkDocs's own `search.share` description).
   *Severity:* No change to DOC-NAV-10's own severity. This only strengthens its evidence citation.
   *Changes:* DOC-NAV-10 evidence line, and the sub-artifact rule it descends from, DOC-SEARCH-02.

8. **Confirm `squidfunk/mkdocs-material#2973` is fixed on the fleet's pinned version, and re-cite DOC-NAV-16's rationale to the maintainer's declined-support statement.** The bug is not the fleet's live risk. The lack of a support commitment for the override point still is.
   *Rationale:* a rule whose cited evidence is a bug that no longer applies to the pinned version reads as stale the moment anyone checks it.
   *Verification:* the issue's own closing comment, "Released as part of 7.2.6," fetched directly against `github.com/squidfunk/mkdocs-material/issues/2973`.
   *Evidence level:* measured.
   *Severity:* No change to DOC-NAV-16's severity. This only corrects its citation.
   *Changes:* DOC-NAV-16 evidence line.

## AI-agent angle {#ai-agent}

- **Ships a beacon and calls the signal done.** An agent asked to "capture zero-result searches" will write the `CustomEvent` dispatch, see the grep pass, and stop, leaving the event firing into a void with nothing listening. Smallest mechanical check: NG1's requirement that the same file also contain a `fetch` or `sendBeacon` call, not just the event name.
- **Reaches for GA4 as if enabling Enhanced Measurement is the whole job.** An agent that read Material's own analytics setup page will propose "just turn on GA4 site search," missing that the mechanism Google itself documents cannot see a query that never touches the URL. Smallest mechanical check: any PR claiming GA4 satisfies the zero-result rule is rejected unless it also ships the client-side beacon from Finding 2.
- **Picks giscus as the default feedback sink because it is the best-known option.** An agent will reach for the most-starred, most-blogged widget without reading that it gates every vote behind a reader's willingness to OAuth into GitHub. Smallest mechanical check: DOC-OBS-17 requires the sink's own bias to be named beside any reported feedback percentage, which a reviewer can check against the actual widget chosen.
- **Adds a feedback widget to a page that has never had a single measured visit.** An agent asked to "add feedback" reaches for the widget first, since it is the most visible ask, before there is any denominator to make its percentage meaningful. Smallest mechanical check: DOC-OBS-16's 30-day nonzero-traffic precondition, checked against the same manifest DOC-OBS-10 already requires.
- **Treats "add analytics" as one undifferentiated task and reaches for whichever vendor it already knows, regardless of whether that vendor can carry a named event.** GoatCounter and Cloudflare Web Analytics both look like reasonable "privacy-first analytics" picks and neither can serve as a zero-result or feedback sink. Smallest mechanical check: Finding 6's table, cited by name, before a vendor choice is accepted as satisfying DOC-OBS-18.
- **Assumes the fleet's own repository traffic and a deployed docs site's traffic are the same number.** An agent asked to instrument `grimoire-lore/docs/` might reach for a page-analytics vendor as if a site existed to embed a script into. Smallest mechanical check: DOC-NAV-01's existing generator-config gate already routes this correctly, and DOC-OBS-18 makes explicit that the GitHub Traffic API, not a vendor script, is the right signal when that gate says not applicable.

## Contested / evolving {#contested}

- **DOC-NAV-10 vs DOC-OBS-12 ownership.** Resolved above (Finding 9, NG2 and NG3): DOC-NAV keeps the requirement, since it already owns the beacon's full lifecycle. DOC-OBS-12 keeps its general shape but trades zero-result search for agent-traffic-share as its example, since this file prices the sink that clears the former's blocking precondition.
- **`search-sink-and-privacy`**, named by the nav group as "the most load-bearing gap in the group." Resolved above (Finding 2): three sink shapes priced, with the self-hosted-endpoint and vendor-custom-event shapes both viable at $0 to $20/month, and the static-host-log-line shape shown to be the expensive option rather than the cheap one, at least for a GitHub-Pages-hosted site.
- **`zero-result-unblock-cost`**, named by the observability group as an unpriced assumption. Resolved above (Finding 2): the unblock cost is the sink, not a search-vendor migration, and it is priced.
- **`ga4-overlay-search-verification`.** Resolved by mechanism (Finding 3), not by a live observation, since this pass has no browser-control tool. This is a genuine, stated limitation of this research pass rather than a claim of full confirmation. A live DebugView session remains the one way to close the gap completely, and it should take about ten minutes on any site that already runs GA4.
- **`mkdocs-material-worker-override-status`.** Resolved (Finding 4): fixed in 7.2.6, long before the fleet's pinned 9.7.7. Not currently a live risk, though DOC-NAV-16's preference for Pagefind's public API still holds on the maintainer's own declined-support statement.
- **Whether DocSearch's free program includes the same "No Results Rate" dashboard as paid Algolia.** Not fully resolved. Algolia's own metrics reference names this as a base-plan metric with no paid-tier callout, which raises confidence without confirming it for the free DocSearch program specifically, since the DocSearch program page itself is silent on analytics. A project actually accepted into the program should verify its own dashboard before this is cited as settled, exactly as the nav sub-artifact already flagged.
- **Umami's cloud pricing figures.** Lower confidence than the rest of Finding 6's table. The vendor's own pricing page did not render usable content to this pass's fetch tool. The self-host cost and MIT license are confirmed directly against the project's own GitHub repository and do not depend on the pricing page. Re-confirm the cloud numbers before citing them as a hard figure in a shipped rule.

## Sources {#sources}

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Google Analytics Help: view_search_results](https://support.google.com/analytics/answer/9216061) | Google's own Enhanced Measurement reference | Current, fetched 2026-09-05 | The exact trigger mechanism (five default URL query parameters) that settles Finding 3 |
| [Material for MkDocs: setting up site search](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) | Vendor's own documentation | Current, 9.x era, matches fleet's pinned 9.7.7 | Confirms `search.share` only acts on a manual click, the other half of Finding 3 |
| [github.com/squidfunk/mkdocs-material/issues/2973](https://github.com/squidfunk/mkdocs-material/issues/2973) | The actual GitHub issue, fetched live via `gh api` | Filed 2021, closed 2021-09-01 | The maintainer's own "Released as part of 7.2.6" comment, settling Finding 4 |
| [developers.cloudflare.com/workers/platform/pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Vendor's own pricing page | Current, fetched 2026-09-05 | The free-tier request, CPU, KV and D1 figures behind the self-hosted-endpoint price in Finding 2 |
| [docs.github.com: About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) | Vendor's own documentation | Current, fetched 2026-09-05 | Confirms GitHub Pages logs visitor IPs but never exposes them to the owner, the finding behind the static-host-log-line pricing in Finding 2 |
| [pagefind.app](https://pagefind.app/) | Vendor's own project site | Current, actively maintained, 2026 | Confirms Pagefind ships no built-in analytics and its public `pagefind.search()` contract, behind Finding 2's Pagefind-with-capture pricing |
| [giscus.app](https://giscus.app/) | Vendor's own project site | Current, 2026 | Confirms the reader-facing GitHub OAuth requirement behind Finding 5's bias comparison |
| GitHub GraphQL schema, `createDiscussion` mutation | Fetched live via `gh api graphql` against GitHub's own live schema | Live, 2026-09-05 | Confirms the mutation and its exact input fields exist, behind Finding 5's anonymous-sink alternative to giscus |
| [plausible.io](https://plausible.io/) | Vendor's own pricing and marketing page | Current, fetched 2026-09-05 | Pricing tiers and custom-event availability behind Finding 6's comparison table |
| [plausible.io/docs/custom-event-goals](https://plausible.io/docs/custom-event-goals) | Vendor's own documentation | Current, fetched 2026-09-05 | The exact `plausible()` JS call shape used in Finding 5 and 6 |
| GitHub repository metadata, `plausible/analytics` and `umami-software/umami`, fetched via `gh api` | Each project's own GitHub repository | Live, 2026-09-05 | Confirms license (AGPL-3.0, MIT) independent of either vendor's marketing page, behind Finding 6's self-host cost claims |
| [docs.umami.is/docs/track-events](https://docs.umami.is/docs/track-events) | Vendor's own documentation | Current, fetched 2026-09-05 | The exact custom-event API (data attributes and `umami.track()`) used in Finding 5 and 6 |
| [goatcounter.com](https://www.goatcounter.com/) | Vendor's own project site | Current, fetched 2026-09-05 | Free-tier terms and the confirmed absence of a named custom-event feature, behind Finding 6 |
| [usefathom.com/pricing](https://usefathom.com/pricing) | Vendor's own pricing page | Current, fetched 2026-09-05 | Exact pricing tier and confirmed custom-event inclusion at no extra fee, behind Finding 6 |
| [developers.cloudflare.com/web-analytics/about](https://developers.cloudflare.com/web-analytics/about/) | Vendor's own documentation | Current, fetched 2026-09-05 | Confirms the free product is pageview/performance-only with no custom-event mechanism found, behind Finding 6 |
| [algolia.com/doc/guides/search-analytics/concepts/metrics](https://www.algolia.com/doc/guides/search-analytics/concepts/metrics/) | Vendor's own documentation | Current, fetched 2026-09-05 | Confirms "No Results Rate" as a base-plan metric, behind Finding 6's DocSearch discussion |
| [docs.github.com: Repository traffic](https://docs.github.com/en/rest/metrics/traffic) | Vendor's own REST API reference | Current, fetched 2026-09-05 | The 14-day retention window and access requirement behind Finding 7 |
| GitHub Traffic API, `ocx-sh/grimoire-lore`, called live via `gh api` | This program's own repository, live data | Live, 2026-09-05 | Direct confirmation that the zero-backend signal in Finding 7 works today with no setup |
| GitHub Pages API, `gh api repos/<owner>/<repo>/pages` across all 9 fleet docs repos | Live API calls against this program's own fleet | Live, 2026-09-05 | Confirms 8 of 9 sites deploy via GitHub Pages and the ninth (`ocx`) does not, behind Finding 2's revised hosting paragraph |
| `ocx/.github/workflows/deploy-website.yml:252-300` | This fleet's own deploy workflow, read directly | Current, 2026-09-05 | Confirms `ocx` deploys to Cloudflare Pages behind a project-owned nginx reverse proxy, the exception in Finding 2 |
| [docs-navigation-search.md](../docs-navigation-search.md) | This program's own wave-1 consolidation | 2026-09-05 | DOC-NAV-10 through DOC-NAV-16, the family this file's rules descend from |
| [docs-observability.md](../docs-observability.md) | This program's own wave-1 consolidation | 2026-09-05 | DOC-OBS-01 through DOC-OBS-15, the family this file's rules descend from |
| [docs-navigation-search/search-contract-and-zero-result-loop.md](../docs-navigation-search/search-contract-and-zero-result-loop.md) | This program's own wave-1 sub-artifact | 2026-09-05 | The DOM-beacon pricing and the three-way engine comparison this file builds on directly |
| [docs-observability/minimum-instrumentation-set.md](minimum-instrumentation-set.md) | This program's own wave-1 sub-artifact | 2026-09-05 | NG5, the dropped feedback-widget rule this file restores, and NG8, the agent-traffic-share deferral this file reuses |
| [docs-topic-map/wave1-critique.md](../docs-topic-map/wave1-critique.md) | This program's own wave-1 completeness critique | 2026-09-05 | The commission brief this file answers, and the exact conflict it names |
