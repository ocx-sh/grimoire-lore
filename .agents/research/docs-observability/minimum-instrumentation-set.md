---
title: Documentation design — minimum instrumentation set
topic: minimum-instrumentation-set
group: docs-observability
agent: docs-observability-minimum-instrumentation-set-researcher
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 12
scope: >
  What a docs site with zero measurement must instrument first, in what order,
  what artifact each signal writes and where, and how a reviewer checks
  "instrumented" and "reviewed" separately. Covers zero-result search mining,
  per-page feedback and its bias, docs-issue triage, time-to-hello-world, and
  agent-vs-human traffic share, all as candidate signals ranked by cost for
  this fleet. Does NOT cover freshness SLOs, link-check configuration, or the
  blocking-merge question — those belong to the sibling
  staleness-and-drift-gates topic.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [DORA's documentation-quality capability: the axis that pays off](#f1)
   2. [The 2024 AI-adoption wave: quality score up, stability down, same report](#f2)
   3. [What "measuring nothing" looks like, in this fleet and in the industry](#f3)
   4. [Time-to-hello-world: the one funnel number with an agreed scale](#f4)
   5. [Ranking the candidate signals by cost, for a static zero-analytics site](#f5)
   6. [What "instrumented" looks like as a shipped product](#f6)
   7. [Survivorship bias in every feedback channel, and its disclosure](#f7)
   8. [Zero-result search mining: the mechanism, and why this fleet's stack blocks it](#f8)
   9. [Distinguishing "instrumented" from "reviewed"](#f9)
   10. [Documentation debt is silent — drift signals over prose signals](#f10)
3. [Normative guidance candidates](#normative)
4. [AI-agent angle](#ai-agent)
5. [Contested / evolving](#contested)
6. [Sources](#sources)

## Summary

- Grade docs on findability and trust, DORA's own axis, not on sentence-level prose — a rule that only scores prose is scoring the wrong thing ([dora.dev](https://dora.dev/capabilities/documentation-quality/)).
- DORA's documentation-quality capability amplifies every other technical capability's payoff: above-average docs give a 1525% lift from trunk-based development vs 36% for below-average docs, 750% vs 34% for CI, 451% vs 37% for supply-chain security, 343% vs 79% for SRE ([dora.dev](https://dora.dev/capabilities/documentation-quality/)).
- The 2024 DORA wave is two-directional in the same report: +25% AI-assistant adoption correlates with +7.5% documentation-quality score but −7.2% delivery stability and −1.5% throughput ([Swimm's summary of the 2024 DORA report](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation)). More AI-authored docs is not the same as better docs.
- Resolve that conflict by grading the axis, not the volume: require every AI-authored docs change to state what it removed alongside what it added, so growth is visible and must be justified rather than free.
- On a static site with zero analytics, stand up the two zero-cost signals first: a `docs`-labeled GitHub issue template with a stated triage cadence, and a hand-measured time-to-hello-world (TTHW) number recorded in a checked-in file. Neither needs new infrastructure.
- Time-to-hello-world is the one funnel metric the DX field has an agreed benchmark scale for: under 30 minutes rates 5/5, 30–60 min 4/5, 1–2h 3/5, 2–4h 2/5, over 4h 1/5 ([Ably's scale, via Nordic APIs](https://nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/)); Twilio's own stated target is 5 minutes or less.
- 39% of surveyed docs teams track no success metric at all, and over a third never measure onboarding effectiveness separately from general page traffic ([State of Docs 2025](https://www.stateofdocs.com/2025/documentation-metrics-and-measurement)).
- Zero-result search-query mining is the cheapest, highest-leverage signal in the literature, but this fleet's entire search stack — VitePress's local minisearch, MkDocs Material's built-in search, mdBook's built-in lunr — is 9 of 9 client-side and 0 of 9 capable of reporting a zero-result query today. Treat it as blocked-pending-a-stack-change, not as a rule every repo must pass now.
- Per-page "was this helpful" widgets and support-ticket/issue mining share one bias: only readers who almost succeeded leave feedback. Absence of complaints is never evidence the docs work, and every reported percentage needs its channel and denominator stated next to it.
- Mintlify's shipped feedback product (thumbs, contextual free text, code-snippet reactions, agent-submitted structured feedback) is the concrete shape of "instrumented" to copy once a hosted platform is in play; it needs a paid plan and telemetry enabled, so it is a graduation target, not a fleet-wide requirement today ([Mintlify feedback docs](https://mintlify.com/docs/optimize/feedback)).
- Do not instrument agent-vs-human traffic share until there is a named, checkable consumer question to answer — this fleet's mostly-static hosting can't expose server logs anyway, and adding analytics purely to produce the number, with no named consumer, is the same cargo-culting the frame already rejected for llms.txt.
- Distinguish "instrumented" (the mechanism exists) from "reviewed" (someone acted on it inside the stated cadence). A check for the first must never silently stand in for the second.
- No source surveyed gives a validated review-cadence number for docs-issue triage. Tie the cadence to the adopting project's existing release or iteration cadence; only default to a fixed interval (monthly) when no such cadence exists, and label that default invented.
- Re-measure TTHW by hand whenever a PR changes the getting-started or quickstart page. A stale TTHW number is worse than none: it hides exactly the kind of drift this fleet's tested-example mechanism already exists to catch.
- Ship one instrumentation manifest file per repo listing every signal's status (instrumented / deferred-and-why), its last-review date, and its bias disclosure. A rule that says "measure X" with no single place recording whether X happened is unverifiable by a reviewer or an agent.
- Algolia's own zero-result remediation levers — `removeWordsIfNoResults`, `optionalWords`, `ignorePlurals`, `removeStopWords`, synonyms — are the graduation playbook once a site adopts hosted search, not an action item for the fleet's current client-side stack ([Algolia docs](https://www.algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results)).
- HN's own "worst documentation" threads name almost no complaints about tone. Nearly all are about whether the documented thing is true right now — the argument for weighting drift/staleness signals over prose signals inside any docs-observability rule.
- The DORA 2022 methodology aggregates an 8-item survey into a standardized 0–1 score per respondent; the live capability page as of September 2026 does not publish the 8 items' exact wording — cite the aggregate finding, not invented item text.

## Findings

### 1. DORA's documentation-quality capability: the axis that pays off {#f1}

DORA has scored documentation quality as a first-class capability since 2021: "a set of eight metrics that assess documentation attributes like clarity, findability, and reliability," aggregated per respondent into a standardized 0–1 score ([dora.dev/capabilities/documentation-quality](https://dora.dev/capabilities/documentation-quality/); confirmed independently on [Google Cloud's 2022 deep-dive blog](https://cloud.google.com/blog/products/devops-sre/deep-dive-into-2022-state-of-devops-report-on-documentation/), which states the same aggregation method: "For each respondent, we aggregated the responses and then expressed them as a number between zero and one to give a standardized score."). Three attributes, not sentence quality: clarity, findability, reliability.

The finding that repeats: documentation quality does not act as an independent capability, it **amplifies the payoff of every other technical capability measured**. Exact lift figures from the live capability page:

| Technical capability | Above-average documentation | Below-average documentation |
|---|---|---|
| Trunk-based development | 1525% | 36% |
| Continuous integration | 750% | 34% |
| Supply-chain security practices | 451% | 37% |
| Site Reliability Engineering practices | 343% | 79% |

([dora.dev/capabilities/documentation-quality](https://dora.dev/capabilities/documentation-quality/).) Note what is absent: neither the live capability page nor the 2022 Google Cloud blog publishes the exact wording of the eight survey items — the blog explicitly defers to a separate questions archive rather than reproducing them. A rule citing this finding should cite the aggregate lift numbers and the three named attributes (clarity, findability, reliability), and should not invent item-level wording that isn't published.

The practical read for a fleet-wide instrumentation rule: a project cannot fix "documentation" in the abstract, and a rule that only grades prose quality (readability score, em-dash count) is grading an axis DORA's own instrument does not claim predicts payoff. The instrumentation set this topic recommends is chosen to hit clarity/findability/reliability directly — not as a substitute for the plain-English rules owned by a different topic, but as the thing that must exist *in addition* to them.

### 2. The 2024 AI-adoption wave: quality score up, stability down, same report {#f2}

The 2024 DORA report adds an AI-adoption interaction that the live 2026 capability page does not itself restate — this finding is only recoverable through the report's own secondary summaries, not the current dora.dev page. [Swimm's summary](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation) states the exact figures: a 25% increase in AI-assistant adoption correlates with a 7.5% improvement in documentation-quality score, but the same increase associates with a 1.5% decrease in delivery throughput and a 7.2% decline in stability. The report's own explanation: "As AI generates more code, an unintended consequence emerges: development processes can slow down as the sheer volume of code becomes harder to understand" — more auto-generated code and docs raises the volume of things a team must understand without raising review capacity.

This is the single most load-bearing finding for a rule set that is itself read and applied by AI authors. It is not a reason to ban AI-authored documentation. It is a reason the rule must state, explicitly, that **volume is not the metric** — see Normative guidance candidate NG6.

### 3. What "measuring nothing" looks like, in this fleet and in the industry {#f3}

Internally: 0 of the fleet's 9 real docs sites has a feedback widget, an analytics script, or a docs-specific GitHub issue template. Edit-this-page is *configured* in 8 of 9 sites but silently dead in 2 of those 8 (`edit_uri` set without the Material theme feature flag that renders it) ([internal audit: `docs-audit/ux-observability-posture.md` §3](../docs-audit/ux-observability-posture.md)). The one real measured gate in the fleet — Lighthouse CI on 2 of 9 sites — runs against each generator's own fixture catalog output, not against the fleet's actual documentation content, so it does not count as content instrumentation.

Externally, the same absence is the industry median, not a fleet-specific failure: **39% of docs teams surveyed track no documentation success metric at all**, and over one-third don't measure onboarding effectiveness specifically even though nearly 80% believe their troubleshooting docs are "at least somewhat effective" — a belief unbacked by measurement ([State of Docs 2025, stateofdocs.com](https://www.stateofdocs.com/2025/documentation-metrics-and-measurement)). The report's own framing of the difficulty, quoting Rob Gray (Snowflake): "It's always really hard to show the value of documentation... what's the real concrete ROI?" More than a quarter of teams do track whether docs generate leads or trial sign-ups (more relevant to commercial SaaS docs than this fleet's OSS/internal tooling), and smaller companies are more likely to track lead generation than mid-sized ones.

The read for this fleet: "measure something" is not a solved problem elsewhere either, so the deliverable should not assume a mature off-the-shelf answer exists and should instead specify the cheapest signals that fit a project with genuinely zero traffic data.

### 4. Time-to-hello-world: the one funnel number with an agreed scale {#f4}

Time-to-hello-world (TTHW) / time-to-first-call (TTFC) — elapsed time from landing on the docs to a first successful result — is the most-cited single funnel metric in the DX literature, and unusually for this domain it has an agreed benchmark scale, attributed to Ably: under 30 minutes rates 5/5, 30–60 minutes 4/5, 1–2 hours 3/5, 2–4 hours 2/5, over 4 hours 1/5 ([Nordic APIs, "Why Time to First Call Is a Vital API Metric"](https://nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/)). Twilio's own stated target, per the same source: "get up and running in 5 minutes or less." The article's proposed definition is precise enough to operationalize by hand: "the time taken between a developer accessing documentation, and/or signing up for an API key, and making their first successful API call (of any complexity)."

This fleet already has the best possible instance of this number and has never recorded it anywhere: `ocx`'s `installation.md` reaches a runnable, successful command in 20 words and one heading; its `getting-started.md` reaches one in 185 words and two headings ([internal audit: `docs-audit/ux-observability-posture.md` §8](../docs-audit/ux-observability-posture.md)). That is a TTHW in the low single-digit minutes, comfortably inside the 5/5 band, and it is recorded nowhere as a number a maintainer can point to or watch for regression.

### 5. Ranking the candidate signals by cost, for a static zero-analytics site {#f5}

Five candidate signals, ranked by engineering cost for a repo with no analytics and no server-side logging today:

| Signal | Engineering cost | Blocking condition |
|---|---|---|
| Docs issue label + triage cadence | None — a GitHub label and a process | None |
| TTHW measured by hand | None — a stopwatch and a checked-in number | None |
| Per-page feedback widget | Low–medium — a static-compatible component or a hosted add-on | Needs enough traffic to make a signal meaningful; needs the bias disclosure from finding 7 the day it ships |
| Zero-result search-query capture | Medium–high — the fleet's current stack cannot report this without a change | Blocked: 9 of 9 fleet sites run client-side-only search (see finding 8) |
| Agent-vs-human traffic share | High — needs server logs or a hosted analytics layer most of the fleet's static hosting doesn't expose | Blocked until there is a named consumer question to answer (see NG5) |

The first two require zero new infrastructure and hit the findability/trust axis directly (an unresolved docs issue is a findability or trust failure by definition; a slow TTHW is a findability failure by definition). They are the two to add first. The other three wait on a stated precondition each — not on "later," which is unfalsifiable, but on a named blocking condition that a reviewer can check has or hasn't been cleared.

### 6. What "instrumented" looks like as a shipped product {#f6}

Mintlify (docs platform, 2026-era) productizes exactly this instrumentation set, and its shape is worth copying once a project graduates to a hosted platform. Its feedback surface bundles five distinct collection methods on one page: a thumbs up/down rating, edit suggestions and issue-raising (public repos only), contextual free-text feedback with optional email, and per-code-block reactions; submissions land in an Analytics dashboard's feedback section as a volume-over-time chart plus raw comments, exportable to CSV or a filterable API endpoint, and triaged through a Pending/In Progress/Resolved/Dismissed status field ([Mintlify feedback docs](https://mintlify.com/docs/optimize/feedback)). Two stated constraints matter for a portable rule: feedback requires a Pro or Enterprise plan, and it requires telemetry to be enabled — "If you disable telemetry in your `docs.json` file, you cannot enable feedback features," so a project that has opted out of tracking for privacy reasons cannot partially opt back in for feedback alone.

Mintlify's separate agent-analytics feature identifies AI-agent traffic by "analyzing incoming user agents and matching them against known AI agent signatures," and exposes which agents visited, which pages they hit most, and what they searched via MCP; the announcement states agents are "in many cases... reading it more often than humans" but gives no percentage ([Mintlify agent-analytics blog](https://mintlify.com/blog/agent-analytics)). This is the productized form of the agent-traffic-share candidate this topic defers (NG5) — worth naming as the concrete mechanism a project reaches for *if and when* it needs the number, not as evidence the number is needed now.

### 7. Survivorship bias in every feedback channel, and its disclosure {#f7}

Every self-selected feedback channel — thumbs widgets, support tickets, GitHub issues — shares one structural bias: the reader who is visible in the channel is the one who "survived to give you feedback"; the reader with the fundamental problem, who got lost before reaching the bottom of the page or the "was this helpful" prompt, is invisible ([dev.to, "The Developer Feedback You Are Actually Getting is Survivorship Bias"](https://dev.to/ben/the-developer-feedback-you-are-actually-getting-is-survivorship-bias-4b54)). The article's own analogy: returning WWII bombers showed damage only where a plane could survive being hit — the planes hit elsewhere never came home to be counted. "The people who are getting in touch with you are the ones who aren't having the biggest problems." The corrective the source names is not a math adjustment; it's actively seeking out the readers who *didn't* succeed (exit interviews, friction logs written in a deliberately adopted outside persona) rather than trusting the volunteer channel alone.

The mechanical consequence for this rule: any reported percentage from a feedback channel must state its channel and its denominator next to it. Compare:

**Bad — a bare percentage, unattributed:**
> 94% of readers found this page helpful.

**Good — channel and denominator stated:**
> Of the 12 visitors who submitted thumbs feedback this month (out of roughly 800 page views), 11 clicked helpful. This channel is self-selected toward readers who almost succeeded; it says nothing about the visitors who left before reaching the widget.

### 8. Zero-result search mining: the mechanism, and why this fleet's stack blocks it {#f8}

Zero-result query mining is named as the single highest-leverage, lowest-cost content-gap signal in the literature: it directly names what a reader searched for and didn't find, no separate user study required. Algolia's own optimization guide names the detection mechanism ("look... at which searches don't return any results" in the analytics dashboard) and five concrete remediation levers once a gap is found: `removeWordsIfNoResults` (progressively drops query terms until something matches), `optionalWords` (merges a dual query matching only some terms), `ignorePlurals`, `removeStopWords`, and synonym mapping for vocabulary variation ([Algolia docs](https://www.algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results)).

That mechanism presupposes a hosted, query-logging search backend. This fleet has none: 9 of 9 real docs sites run client-side-only search — VitePress's local `minisearch` integration, MkDocs Material's built-in search plugin, and mdBook's built-in `lunr` — and 0 of 9 report a zero-result query anywhere, in config, script, or CI (`grep -rliE "zero.result|search.analytics"` across all 9 repos returns no hits) ([internal audit: `docs-audit/ux-observability-posture.md` §2](../docs-audit/ux-observability-posture.md)). Requiring zero-result capture as a fleet-wide rule today would fail every repo for a reason no repo-level change can fix without first changing the search backend — see NG4.

### 9. Distinguishing "instrumented" from "reviewed" {#f9}

An issue template existing is not the same as the issue label being triaged. A feedback widget existing is not the same as anyone reading the feedback. A TTHW number sitting in a file is not the same as it being current. Every signal in this topic has two independently checkable states, and a rule that checks only the first (the mechanism exists) will pass a repo that has never once acted on it. The check for "instrumented" is a file-existence or config-key-presence check; the check for "reviewed" is a last-entry-date check against the stated cadence. Neither substitutes for the other — see NG9.

### 10. Documentation debt is silent — drift signals over prose signals {#f10}

"Documentation debt is a silent tax. It doesn't trigger alerts like failing builds, but it eats velocity all the same" ([OpsIntell, "Documentation Debt: The Most Undervalued Form of Technical Debt"](https://opsintell.com/documentation-debt-the-most-undervalued-form-of-technical-debt/)). Unlike a failing test or a lint error, nothing pages anyone when a doc goes stale — the source's own examples are architecture diagrams that "look polished, but are hopelessly outdated" and runbooks that "don't match what's deployed in production." This is consistent with the internal scout survey of three Hacker News "worst documentation" threads: almost none of the complaints collected were about tone or style; nearly all were about whether the documented thing is true right now ([internal: `docs-topic-map/failure-and-observability.md` finding 2](../docs-topic-map/failure-and-observability.md)).

For the instrumentation set specifically, this argues for weighting the two zero-cost signals this topic recommends first (docs-issue triage, TTHW) precisely because both are trip-wires for currency, not for prose: an issue filed against a doc page is a direct signal the doc stopped being true or findable; a TTHW that regressed is a direct signal a step broke or grew. Neither requires anyone to have an opinion about sentence quality.

## Normative guidance candidates {#normative}

1. **Grade documentation instrumentation on findability and trust, never on prose quality alone.** A rule that only scores readability or punctuation is scoring an axis DORA's own instrument does not tie to the measured payoff. *Verify:* the repo's `observability.md` support file (or equivalent) must name at least one non-prose signal from this list (issue triage, TTHW, feedback, zero-result, agent-share) as instrumented or explicitly deferred-with-reason; a reviewer rejects an observability file that only restates the plain-English rules. Evidence level: **measured** (DORA's lift table).

2. **Stand up the docs-issue label and its triage cadence before anything else.** Zero engineering cost, and it is a direct findability/trust trip-wire. *Verify:* `.github/ISSUE_TEMPLATE/` contains a docs-specific template (e.g. `docs-bug.yml`) that pre-applies a `docs` label; grep the repo's issue templates for `labels:` containing `docs`. Evidence level: **measured** (0 of 9 fleet sites have this today; industry gap confirmed at 39% tracking nothing).

3. **Measure time-to-hello-world by hand and record it in a checked-in file.** Zero engineering cost, and it is the one funnel number the DX field has an agreed benchmark scale for. *Verify:* a file (e.g. `docs/.meta/tthw.md`, or a `tthw_minutes` + `tthw_measured` frontmatter pair on the getting-started page) exists, holds a number, and holds a date; a script or CI job flags the file as missing or its date as absent. Evidence level: **measured** (Ably's 5-band scale, Twilio's 5-minute target, both cited to a primary-adjacent practitioner source).

4. **Re-measure TTHW whenever a PR touches the getting-started or quickstart page.** A stale TTHW number hides the exact drift the fleet's own tested-example mechanism exists to catch. *Verify:* a CI check comparing the PR's changed paths against the getting-started page path; if it changed, require the TTHW file's commit or mtime to be in the same PR. Evidence level: **argued** (no source gives a validated re-measurement trigger; this is the deliverable's own synthesis of the tested-example pattern applied to a metric instead of a command).

5. **Defer per-page feedback widgets until real traffic exists, but require the bias disclosure the moment one ships.** A feedback widget on a low-traffic page produces noise, not signal, and any percentage it produces is survivorship-biased. *Verify:* grep any status update, dashboard note, or README section reporting a feedback percentage for adjacent denominator language ("of N visitors," "self-selected channel"); reject a bare percentage. Evidence level: **codified** (Mintlify's shipped product defines the mechanism; dev.to's survivorship-bias argument defines the disclosure requirement).

6. **Every AI-authored docs change states what it removed, or states explicitly that nothing was removed.** Resolves the DORA two-directional finding by grading volume growth instead of adjudicating whether AI nets positive or negative. *Verify:* a PR/commit template requiring an "Added / Removed" pair, both non-empty (a literal "none" is an acceptable value for Removed, an absent field is not); a CI check or grep on the PR body enforces both keys are present. Evidence level: **measured** (DORA 2024: +7.5% doc-quality score, −7.2% delivery stability, −1.5% throughput at +25% AI adoption).

7. **Do not require zero-result search-query capture on this fleet's current search stack.** All 9 real docs sites run client-side-only search (minisearch, MkDocs Material's built-in search, mdBook's lunr) with no query-logging path; requiring the check would fail every repo for a reason no repo-level change fixes. *Verify:* the rule states the precondition explicitly — "requires a query-logging search backend (hosted Algolia/Typesense, or a Pagefind build hook with a capture endpoint)" — and a reviewer checks that precondition, not the log itself, on a repo that hasn't adopted one. Evidence level: **measured** (9 of 9 fleet sites confirmed client-side-only, 0 of 9 with any capture).

8. **Do not instrument agent-vs-human traffic share without naming the consumer question it answers.** Mirrors the llms.txt resolution: publishing infrastructure to produce a number nobody asked a specific question about is cargo-culting. *Verify:* any PR adding agent-traffic analytics must state, in its description, the specific question being answered (e.g. "does Claude Code read our llms.txt when pointed at this repo") in a form a later reader can check was answered, not a general claim like "helps us understand AI traffic." Evidence level: **argued** (no source gives fleet-specific agent-share guidance; this generalizes the llms.txt-audience-check reasoning from the sibling `docs-machine-readers` group).

9. **Separate "instrumented" from "reviewed" in the rule text and in the check.** An issue template existing, a feedback widget existing, or a TTHW file existing is not evidence anyone acted on what it captured. *Verify:* two independent checks per signal — a file-exists / config-key-present check for "instrumented," and a last-entry-date-within-the-stated-cadence check for "reviewed" — never one check standing in for both. Evidence level: **asserted** (this topic's own synthesis; directly requested by the brief's step 5).

10. **State a review cadence tied to the project's existing release or iteration cadence; only invent a fixed interval when no such cadence exists, and label it invented.** No source surveyed validates a specific docs-issue-triage interval. *Verify:* the observability file names either "triaged each release" / "triaged each sprint" (referencing a real, already-existing cadence elsewhere in the repo) or a fixed day count explicitly marked `(invented default, not evidence-based)`. Evidence level: **contested** (see below) — the labelling requirement itself is **asserted**.

11. **Ship one instrumentation manifest file per repo** (e.g. `docs/OBSERVABILITY.md`, or the `observability.md` support file named in the artifact-split plan) listing every signal in this topic with three fields: status (instrumented / deferred-and-why), last-review date, and bias disclosure where applicable. *Verify:* the file exists; a script parses it and fails if any listed signal is missing one of the three fields, or if a "reviewed" status carries no date. Evidence level: **asserted** (synthesizes NG1–NG10 into one checkable artifact; no external source ships this exact file shape, though Mintlify's dashboard is the hosted-product analogue).

## AI-agent angle {#ai-agent}

- **Volume over verification, exactly as DORA measured.** An LLM asked to "add observability" characteristically adds more dashboards, more metrics, more prose about metrics — the same failure mode the 2024 DORA wave measured at the code/docs level (+7.5% quality score, −7.2% stability) generalizes to instrumentation itself: an agent can ship five new tracked signals none of which anyone reviews. Smallest mechanical check: NG9's split — a signal counts as done only when its "reviewed" field is populated, not when its "instrumented" field is.
- **Inventing a plausible-sounding percentage.** An LLM will write "94% of users found this helpful" or "most readers complete this in under 5 minutes" with no backing data file, because it reads as a normal sentence in the genre. Smallest mechanical check: grep any docs status file or README for a `%` or "most"/"nearly all" quantifier with no adjacent link to a data source or manifest entry; flag for removal or backing.
- **Treating "no complaints" as "docs work."** An LLM evaluating its own documentation output has no channel to observe the silent, invisible reader who bounced in the first 10 seconds — it will report an absence of GitHub issues as evidence of quality. Smallest mechanical check: any claim of the form "no issues reported" or "no complaints" adjacent to a quality claim must be paired with the survivorship-bias disclosure from NG5/finding 7, or removed.
- **Adding infrastructure nobody asked for.** An LLM asked to "instrument the docs" will reach for Google Analytics, a hosted search swap, or an agent-analytics product regardless of whether the repo's static hosting can even use it, or whether anyone named a question the new infrastructure answers. Smallest mechanical check: NG8's requirement that any new analytics/tracking addition name its target consumer question in the PR description before merge.
- **Writing a cadence with no wiring behind it.** An LLM will write "reviewed weekly" in a rule or manifest file and never wire anything that checks whether a week actually passed with a review. Smallest mechanical check: NG11's manifest-parsing script — a "reviewed" status with no date, or a date older than the stated cadence, fails the check regardless of what the prose claims.
- **Fabricating a TTHW number from vibes instead of running the quickstart.** An LLM estimating "about 5 minutes" without literally executing the getting-started steps and timing them reproduces the exact untested-example failure mode this program already treats as unacceptable for code. Smallest mechanical check: NG3/NG4 require a date next to the number; a TTHW file with a number but no corresponding re-measurement after the quickstart page last changed is stale by construction and should fail the same way a stale tested-example script does.

## Contested / evolving {#contested}

- **Does AI adoption net-improve or net-harm documentation, per DORA?** The 2024 report is genuinely two-directional in the same release: +25% AI adoption correlates with +7.5% documentation-quality score and, simultaneously, −7.2% delivery stability and −1.5% throughput ([Swimm's summary of the 2024 DORA report](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation)). Notably, the live 2026 `dora.dev` capability page does not itself restate this interaction at all — it is only recoverable through the report's own secondary summaries. As of this survey, "AI makes docs better" and "AI makes docs worse" are both defensible from the same primary source depending on which axis is weighted, and the field has not converged. **This deliverable resolves it by declining to adjudicate the abstract question and instead grading a different axis than either side of the debate contests**: NG6 requires visibility into what was removed alongside what was added, which makes the volume-vs-stability tradeoff observable and reviewable on every PR, rather than requiring a rule to decide in advance whether AI-authored docs are net good or net bad. This sidesteps the conflict rather than resolving it in either direction — flagged here rather than claimed as settled.
- **What review cadence is correct for docs-issue triage or feedback review?** No source surveyed — DORA, State of Docs 2025, the DX practitioner sources — gives a validated number. This is trending toward commercial knowledge-base products building freshness tiers into their tooling (Mintlify's Pending/In Progress/Resolved workflow assumes *some* cadence without stating one) faster than open-source docs-as-code projects adopt an explicit one. NG10 resolves this for the shipped rule by tying cadence to whatever release/iteration cadence the adopting project already has, rather than inventing a universal number — this is the only honest resolution available given the evidence gap.
- **Is agent-vs-human traffic share worth instrumenting at all, this early?** Mintlify's own agent-analytics announcement claims agents are "in many cases... reading it more often than humans" but publishes no percentage, and this fleet's static hosting mostly cannot expose the server logs the measurement needs. As of September 2026 this looks like a metric in search of a question rather than a question in search of a metric for most of this fleet's repos — trending toward adoption only at projects large enough to have a genuine, named agent-consumption question (an MCP server, a published `llms.txt` with a claimed consumer), which NG8 makes the gating condition rather than banning the signal outright.

## Sources {#sources}

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [dora.dev/capabilities/documentation-quality](https://dora.dev/capabilities/documentation-quality/) | DORA's own live capability page | Live as of Sept 2026, cites 2022 research | Primary source for the 8-metric instrument, the 3 named attributes (clarity/findability/reliability), and the exact performance-lift table |
| [Google Cloud, "Deep dive into 2022 State of DevOps Report on documentation"](https://cloud.google.com/blog/products/devops-sre/deep-dive-into-2022-state-of-devops-report-on-documentation/) | DORA's own 2022 methodology blog post | 2022, DORA/Google-authored | Confirms the 0–1 aggregation method independently of the live capability page; names the amplification-across-capabilities finding directly |
| [Swimm, "Here's What the 2024 DORA Report Has to Say About Code Documentation"](https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation) | Vendor blog summarizing the 2024 DORA report | 2024/2025 | Only source found with the exact +25%/+7.5%/−7.2%/−1.5% AI-adoption figures, not restated on the live DORA page |
| [State of Docs Report 2025](https://www.stateofdocs.com/2025/documentation-metrics-and-measurement) | GitBook's own industry survey (450+ docs professionals) | 2025 | Primary source for "39% track no metric," the onboarding-measurement gap, and the stated-importance-vs-measured-impact gap |
| [Nordic APIs, "Why Time to First Call Is a Vital API Metric"](https://nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/) | Practitioner analysis citing Ably's benchmark scale and Twilio's target | Era not stated on page, cites established DX practice | Only source found with a full agreed TTHW/TTFC benchmark scale and a named 5-minute target |
| [Mintlify, "Feedback" docs](https://mintlify.com/docs/optimize/feedback) | The tool's own product documentation | 2026-era (current Mintlify feature set) | Primary source for what a shipped, productized feedback-instrumentation surface actually contains, and its plan/telemetry constraints |
| [Mintlify, "Agent Analytics" blog post](https://mintlify.com/blog/agent-analytics) | The tool's own product announcement | 2026-era | Primary source for the productized shape of agent-vs-human traffic measurement, and its stated absence of a hard percentage |
| [Algolia docs, "Empty or insufficient results"](https://www.algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results) | The tool's own product documentation | Current as of fetch, 2026 | Primary source for the exact zero-result remediation levers and the dashboard-based detection mechanism |
| [dev.to, "The Developer Feedback You Are Actually Getting is Survivorship Bias"](https://dev.to/ben/the-developer-feedback-you-are-actually-getting-is-survivorship-bias-4b54) | Practitioner essay | Era not stated on page | Sharpest available statement of the survivorship-bias mechanism and its correction, applied directly to developer-feedback channels |
| [OpsIntell, "Documentation Debt: The Most Undervalued Form of Technical Debt"](https://opsintell.com/documentation-debt-the-most-undervalued-form-of-technical-debt/) | Practitioner essay | Era not stated on page | Source of the "silent tax" framing that argues for drift/trip-wire signals over prose signals in this topic's ranking |
| [Internal: `docs-audit/ux-observability-posture.md`](../docs-audit/ux-observability-posture.md) §2, §3, §8 | This program's own fleet measurement pass | 2026-09-05 | Ground truth for the fleet's actual 0/9 instrumentation posture, the exact search-stack tool names per site, and the measured `ocx` TTHW numbers |
| [Internal: `docs-topic-map/failure-and-observability.md`](../docs-topic-map/failure-and-observability.md) findings 1, 5, 9, 12 | This program's own prior scout synthesis | 2026-09-05 | Source of the candidate-signal list this topic ranks, and the AI-agent-angle framing this file builds on directly |
