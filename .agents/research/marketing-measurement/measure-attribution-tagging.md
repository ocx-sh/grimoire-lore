---
title: UTM convention, internal-link ban and self-reported attribution
program: product
sub_program: marketing
topic: marketing-measurement
worker: measure-attribution-tagging
agent: deep-dive researcher
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
sources_count: 18
scope: >
  Covers the UTM vocabulary an agent may write, where UTMs are banned, whether a "how did you hear about us" (HDYHAU)
  field is needed, what Safari 26 documents about query parameters, and the keyed-offer method that preceded all of it.
  Does not cover consent law for the analytics tool itself (sibling worker), platform-specific metric definitions,
  or MMM and incrementality tests beyond naming them as the causal alternative.
---

# UTM convention, internal-link ban and self-reported attribution

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

Fetch notes: pages were read through WebFetch on 2026-11-27, which returns a small-model rendering of each page, so quoted wording is that rendering. Failed fetches, stated so nobody trusts holes: the Plausible URL-builder docs page (404), the Project Gutenberg and Internet Archive plain-text copies of Hopkins (service down; the PDF at draytonbird.com was read instead), and the Growth Unhinged archive (opened; it holds no HDYHAU post, so no Growth Unhinged claim is made anywhere below). A search snippet is used nowhere as a source except where a row says "search result, unverified".

## Summary

- Decision: the fleet tags links with a closed, lower-case UTM vocabulary, only on links the team places on a surface it does not host (posts, email, bios, talks). Never on any link whose target is the fleet's own site or docs.
- GA4 values are case sensitive, so `utm_source=LinkedIn` and `utm_source=linkedin` are two rows ([GA4 URL builders](https://support.google.com/analytics/answer/10917952)). Lower-case only is the single most checkable rule.
- GA4's default channel rules key on `utm_medium`; a medium outside the recognised set lands in Unassigned or another channel ([GA4 default channel group](https://support.google.com/analytics/answer/9756891)). The medium set is therefore a closed list, not free text.
- Plausible documents that UTMs on internal links overwrite the visit's original referral source ([Plausible UTM guide, updated 2026-11-12](https://plausible.io/blog/utm-tracking-tags)). GA4's own pages read this run are silent on internal links, so the ban rests on that vendor statement plus the mechanism; label it so.
- Fleet measurement: zero `utm_` links in 925 owned site, docs and README files; zero analytics tags; zero sign-up forms. There is nothing to migrate, and nothing is measured yet.
- Decision on HDYHAU: do not build a form to carry it. The fleet has no sign-up, so there is no field to add. If a sign-up, trial or contact form appears, add one optional free-text field; whether it is required is a business decision to ask about.
- Decision on attribution: UTMs for tagged links (cheap, mechanical, no form needed); HDYHAU as qualitative companion once a form exists; neither is causal evidence.
- Safari 26: the WebKit post the commission names does not use the words link tracking protection and lists no stripped parameters. It says known fingerprinting scripts can no longer read query parameters and `document.referrer`. The 2024 WebKit post says Private Browsing strips parameters identified as cross-site tracking and keeps campaign-only ones. UTM survival in regular Safari browsing is documented by no primary source read.
- Plausible, the cookieless tool the fleet's stance favours, keeps `ref`, `source`, five UTMs, `gclid` and `msclkid` and strips every other query parameter ([Plausible](https://plausible.io/docs/stop-tracking-utm-tags)). A custom parameter name will be silently dropped.
- Hopkins (keyed ads, traced returns) is the pre-digital version of UTM tagging: a distinct key per placement, a record of returns per key. It supports the keying rule and nothing about HDYHAU.
- HDYHAU sources (all vendor or practitioner) agree on bias: familiar and recent channels are over-reported, answers mirror spend, and the answer is perception not causation.
- Report rule: a report that quotes channel numbers states the tool, the attribution model if GA4, the window, and that `(not set)` and Direct absorb untagged traffic.

## Findings

### 1. What GA4 says about UTM parameters

Source type for this section: platform documentation (Google), primary.

- Parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` (paid keywords), `utm_content` (differentiates similar links) ([legacy URL builder article](https://support.google.com/analytics/answer/1033863)). The GA4 article adds `utm_id` (campaign ID) and `utm_source_platform`, and "strongly" recommends setting `utm_source`, `utm_medium`, `utm_campaign`, `utm_id` and `utm_source_platform` ([GA4 URL builders](https://support.google.com/analytics/answer/10917952)).
- Rule of three: "you should always use `utm_source`, `utm_medium`, and `utm_campaign`" (both articles).
- Case: "Parameter values are case sensitive, e.g. `utm_source=google` is different from `utm_source=Google`" ([GA4 URL builders](https://support.google.com/analytics/answer/10917952)). The channel-group page adds that the channel definitions themselves are not case sensitive ([default channel group](https://support.google.com/analytics/answer/9756891)). Consequence: capitalised values still reach the right channel but split into separate source rows.
- Missing parameters: "Missing UTM parameters will result in (not set) values being present in reporting" ([GA4 URL builders](https://support.google.com/analytics/answer/10917952)).
- Manual and auto-tagging are mutually exclusive: "You cannot use manual tagging and auto-tagging together" and Analytics "will issue an error" on a mix ([traffic-source dimensions](https://support.google.com/analytics/answer/11604890); the fetch noted the page text was truncated at the end).
- Internal links: neither GA4 article read says anything about them. The ban is not a GA4-documented rule; see finding 3.
- UTM values do not appear in the "Landing page + query string" and "Page path + query string" dimensions; they appear in Page location ([GA4 URL builders](https://support.google.com/analytics/answer/10917952)).

### 2. Default channel grouping: which medium values land where

Source type: platform documentation, primary. Page undated; Google states the site lists are reviewed at least yearly ([default channel group](https://support.google.com/analytics/answer/9756891), via the scout artifact).

| Channel | Rule keyed on medium or source (quoted from the page) |
|---|---|
| Direct | source `(direct)` and medium `(not set)` or `(none)` |
| Organic Social | source in a social-site list, or medium one of `social`, `social-network`, `social-media`, `sm`, `social network`, `social media` |
| Email | source or medium matches `email`, `e-mail`, `e_mail`, `e mail` |
| Referral | medium one of `referral`, `app`, `link` |
| Organic Video | source in a video-site list, or medium matches `^(.*video.*)$` |
| Paid (any) | medium matches `^(.*cp.*|ppc|retargeting|paid.*)$` plus a source list per channel |
| Affiliates | medium `affiliate` |
| AI Assistant | medium exactly `ai-assistant` (set by GA4 when the referrer is a listed AI assistant) |
| Unassigned | when no other rule matches |

Reading: the fleet's medium vocabulary should reuse these exact words, so a tagged link lands in a channel without a custom channel definition. `ai-assistant` is a value GA4 assigns; a team must not write it by hand.

### 3. Internal links with UTMs

Source type: vendor documentation (Plausible, an analytics vendor; the statement is about its own behaviour).

- "If you add UTM parameters to links within your own site, it overwrites the original referral source for that session." A visitor who arrived from a newsletter would then show as a new direct visit ([Plausible UTM guide](https://plausible.io/blog/utm-tracking-tags), updated 2026-11-12).
- Sessions: referral sources and UTMs are recorded only when they start a visit; a visit ends after 30 minutes without activity (same page).
- Not verified for GA4: the GA4 articles read are silent. The scout row for this topic (analytics-attribution.md #10) was flagged "inference, verify in dive"; the verification result is: documented by Plausible, not found in GA4 documentation read here. Treat the ban as sound practice, not as a GA4 rule.

### 4. What the tool keeps: Plausible query-parameter handling

Source type: vendor documentation.

- Plausible strips all query parameters "for privacy reasons, with a few exceptions": kept are `ref`, `source`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, and `gclid` and `msclkid` (read to identify paid search) ([Plausible](https://plausible.io/docs/stop-tracking-utm-tags)).
- The Plausible manual-link-tagging page is a short overview and defers naming conventions to its UTM guide ([Plausible docs](https://plausible.io/docs/manual-link-tagging/)). Case sensitivity is stated in the UTM guide ("UTM tags are case-sensitive", `LinkedIn` and `linkedin` appear separately) and its examples are lower-case ([Plausible UTM guide](https://plausible.io/blog/utm-tracking-tags)).
- Consequence for agents: a bespoke parameter such as `?campaign=launch` or `?from=hn` is dropped by Plausible and creates a link that looks tagged and reports nothing. Use `ref` or the UTMs only.

### 5. Safari 26 and parameter stripping (record of what the pages state)

Source type: platform (WebKit and Apple), primary; one vendor summary labelled.

- WebKit, Safari 26.0 features, 2025-09-15: the page has a Privacy section but does not mention link tracking protection or query-parameter stripping by name, lists no stripped parameters, names no browsing mode for stripping, and gives no start date beyond the post date. It states: "Safari 26.0 now prevents known fingerprinting scripts from reliably accessing web APIs that may reveal device characteristics", and that Safari "prevents known fingerprinting scripts from reading state that could be used for navigational tracking, such as query parameters and `document.referrer`" ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Nothing beyond that is claimed here.
- WebKit, Private Browsing 2.0, 2024-07-16: Link Tracking Protection added in Safari 17.0; Safari removes "a subset of query parameters that have been identified as being used for pervasive cross-site tracking"; parameters used only for campaign attribution, such as `campaign`, are kept; the protection applies in Private Browsing, and when a user enables advanced tracking and fingerprinting protection it is available in regular browsing too. The article names no specific parameters ([WebKit](https://webkit.org/blog/15697/private-browsing-2-0/)).
- Apple Safari product page: the comparison table row "Removes unique trackers from URLs in Private Browsing" is Yes for Safari, No for Chrome; the page says nothing outside Private Browsing ([Apple](https://www.apple.com/safari/)).
- Vendor summary, not a primary source: Improvado (marketing data vendor, 2026-09-23) tabulates Apple-documented removal for Messages, Mail, Private Browsing and normal tabs where the user enabled All Browsing, and says Apple does not publish its parameter list or the share of clicks in those modes. It treats removal of `gclid`, `fbclid`, `msclkid` as "an observation to test, not a spec" ([Improvado](https://improvado.io/blog/ios-26-link-tracking-protection-attribution)).
- Status: unresolved. No primary page read states that `utm_*` survives or is stripped in default regular browsing. Practical reading: UTMs are campaign-attribution parameters in the sense of the 2024 post and are most likely kept, but this is an inference, and the first-party Safari 26 post contains a script-visibility restriction whose effect on analytics scripts is not stated.

### 6. Self-reported attribution (HDYHAU)

Source types are labelled per row. None of these is an independent study with a published response-rate method.

| Source | Type, date | What it states | Rate or number |
|---|---|---|---|
| [RevenueCat, David Vargas](https://www.revenuecat.com/blog/growth/how-did-you-hear-about-us-surveys.md) | vendor blog (app-subscription platform), 2025-12-16 | HDYHAU "over-attribute[s] conversions to the most recognizable platforms"; answers mirror spend split; reflects "perceived influence, brand familiarity, and recall under pressure", not causality; use as qualitative context once several channels run; use geo holdouts, ads on/off, budget ramps for causality | reports no response rate; one case: daily HDYHAU vs Meta-reported installs differed by about 95 |
| [Recast, Shaifali Agrawal](https://getrecast.com/hdyhau/) | vendor blog (MMM vendor), 2023-05-31 | recall, order and recency bias; dishonest answers if the true option is missing; make the field required; free text plus string matching; combine with software data | "nearly 30%" skip it when optional |
| [Outbrain, Phil Burns](https://www.outbrain.com/blog/?p=47652) | vendor blog (ad network), undated ("3 years ago" on fetch) | free text for low volume, fixed list of at most about 20 for high volume with "Other"; make required; A/B test the form; overlapping categories blur results | claims no significant conversion drop but shares no data |
| [Databox report](https://databox.com/beyond-attribution-the-disappearing-buyer-trail) | vendor survey of "300+ GTM leaders", undated, page footer 2026 | 80% monitor dark social, "only 33-42%" connect it to high-quality opportunities; one in four say at least a quarter of last quarter's pipeline was misattributed | no sampling, fieldwork dates or question wording given; the "90% gap" figure a search snippet attributed to a report is NOT on this page |

Reading: every row is vendor content with a commercial interest in the topic (the Recast and RevenueCat authors sell measurement or subscription tooling). The sources agree on the direction of bias and disagree on whether the field must be required. No independent response-rate figure was found; do not write one into a rule.

### 7. Hopkins and keyed offers

Source type: primary text, a book; the PDF read does not state its publication year, so none is given here.

- Method: "We learn the principles and prove them by repeated tests. This is done through keyed advertising, by traced returns, largely by the use of coupons." Large agencies record coupon returns "on hundreds of different lines", sometimes "on thousands of separate ads" ([Hopkins, Scientific Advertising, ch. 1, PDF](https://draytonbird.com/wp-content/uploads/2012/08/Hopkins_Scientific_Advtg.pdf)).
- Use: headline comparison by keyed returns ("keyed returns on nearly two thousand headlines used on a single product"); "with every keyed return in our record appears the headline that we used" (same, ch. 5).
- Offer design (ch. 13): where a coupon is presented determines return cost; sample inquiries by mail averaged 70 cents each against 18 to 22 cents when coupons were presented at a local store (same).
- Transfer to the fleet: the keyed-offer principle is one distinct, recorded key per placement and the key travels with the response. UTMs are that key. Hopkins offers no support for asking the customer how they heard, and the keyed method needs a response event to key to; the fleet's CLI and docs sites have none the maintainer can see.

## Normative guidance candidates

IDs are local to this worker (MA-n) and will be renumbered by the consolidator.

1. MA-1 (MUST). Write every `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` value in lower case, using only `a-z`, `0-9`, `-` and `_`; no spaces, no percent-encoded spaces, no capitals. Rationale: GA4 and Plausible treat values case sensitively, so capitals split one channel into several rows. Verify: `grep -rEn 'utm_[a-z_]+=[^&"#) ]*[A-Z%+]' <paths>` returns nothing. Pass: `?utm_source=linkedin&utm_medium=social&utm_campaign=launch-0-16`. Fail: `?utm_source=LinkedIn&utm_medium=Social Media`.
2. MA-2 (MUST). Always set `utm_source`, `utm_medium` and `utm_campaign` together; `utm_content` is the only per-link differentiator; `utm_term` is for paid keywords only. Rationale: Google says "you should always use" the three; a missing one yields `(not set)`. Verify: a script that parses each tagged URL and fails if any of the three is absent (`python3 -c` with `urllib.parse.parse_qs`), or the grep `utm_source=` count equals `utm_medium=` count equals `utm_campaign=` count per file.
3. MA-3 (MUST). `utm_medium` comes from this closed set: `social`, `email`, `video`, `referral`, `affiliate`, `cpc`, `paid-social`. Never invent a medium; never write `ai-assistant`. Rationale: these words match GA4 default channel rules (finding 2); free text lands in Unassigned or the wrong channel. Verify: parse each tagged URL; `utm_medium` must be in the set. Adding a medium needs a human decision (see below).
4. MA-4 (MUST). `utm_source` is the lower-case platform or list name without a TLD: `linkedin`, `youtube`, `reddit`, `hn`, `newsletter`, `github`, `bluesky`; never `linkedin.com`, never a person's name or handle. Rationale: one name per platform keeps rows merged; a personal handle in a URL is a personal-data and privacy risk (reasoned rule, no source read). Verify: parse; source must match `^[a-z0-9_-]+$` and must not contain `.`.
5. MA-5 (MUST). `utm_campaign` is `<topic>-<yyyymm>` or `<topic>-<release>`, lower case, at most 40 characters, never reused across different efforts. Rationale: stable keying across reports; the GA4 value limits are not read for this parameter, so 40 is a house limit, not a platform fact. Verify: regex `^[a-z0-9]+(-[a-z0-9]+)*$` and length check.
6. MA-6 (MUST NOT). No UTM on any link whose target is a fleet-owned site, docs or catalog host, wherever the link appears: nav, footer, cards, docs cross-links, READMEs, release notes, package metadata, sitemaps, `rel=canonical`, `og:url`. Rationale: Plausible documents that internal UTMs overwrite the original referral source and turn the visit into Direct; the same logic applies to any tool that attributes by session start. Verify (re-runnable): in the site source, `grep -rEn 'href="[^"]*(utm_|[?&](ref|source)=)' <site src>` and `grep -rEn '\]\([^)]*utm_[a-z]+=' <docs and READMEs>` must return nothing; link-check the built output for `utm_` in any `<a href>` pointing at an owned host.
7. MA-7 (MUST NOT). Do not invent query parameters for attribution (`?from=`, `?campaign=`, `?src=`). Use the UTMs, or `ref` only where a person shares a bare link. Rationale: Plausible strips every parameter not on its keep list. Verify: grep tagged links for parameters outside `utm_*`, `ref`, `source`, `gclid`, `msclkid`.
8. MA-8 (MUST). Place UTMs only on links the team posts on a surface it does not host: a social post, an email, a profile bio, a conference slide, a paid ad. Do not tag links to third-party documentation, registries or other people's sites. Rationale: the tag belongs where a visit into the fleet's property starts; tags elsewhere leak a campaign name into other people's logs for no measured gain. Verify: every URL carrying `utm_` has an owned host as its target and appears in a campaign file, post draft or email template, not in a published page.
9. MA-9 (SHOULD). Keep one `campaigns` file (CSV or YAML) per project listing each tagged URL with source, medium, campaign, content, date, owner and the post it sits in; an agent reads it before creating a new tag. Rationale: stops variant spellings and reused campaign names; GA4 gives no way to enforce this on its own. Verify: any `utm_` URL in a draft must appear in the file (`grep -F`).
10. MA-10 (MUST). Do not add UTM to a link and then add auto-tagging to the same traffic source; one method per source. Rationale: GA4 states the two methods are mutually exclusive and errors on a mix. Verify: for paid campaigns, check platform auto-tagging is off when manual tags are used (human check; cannot be read from the repo).
11. MA-11 (SHOULD). Do not build a sign-up, trial or contact form for the purpose of carrying an HDYHAU field. Rationale: the fleet has no such form; asking users to register in order to measure a channel costs more than the number is worth, and two of the four sources read say HDYHAU is qualitative once several channels run. Verify: no new `<form>` or sign-up route in a change whose stated purpose is measurement.
12. MA-12 (SHOULD). If a sign-up, trial or contact form exists, add one free-text field "How did you hear about us?", stored raw next to the signup record, with no required validation unless a human decides otherwise. Rationale: free text avoids the order bias and missing-option dishonesty that Recast and RevenueCat describe; required versus optional trades completeness for form friction and is a business call. Verify: the field is a text input, not a select; the stored value is the raw string; the field is not mapped to a UTM column.
13. MA-13 (MUST). Report self-reported answers separately from tagged-click numbers; never sum them, never rank channels by them alone. Rationale: they measure different things (perception versus click), and the sources read agree HDYHAU is not causal. Verify: report-review heuristic. Pass: "12 of 40 free-text answers mention a podcast; tagged clicks from the podcast: 3". Fail: "Podcast drove 15 signups."
14. MA-14 (MUST). A report that cites a channel breakdown states: tool, date range, attribution model if GA4 (data-driven, paid-and-organic last click or Google-paid last click, per [GA4](https://support.google.com/analytics/answer/10596866)), and the share of sessions that are `(direct)` or `(not set)`. Rationale: direct traffic gets no credit in last-click unless the path is all direct, and untagged traffic lands there. Verify: report-review heuristic; the four items are present.
15. MA-15 (SHOULD). Claim nothing about Safari traffic share or the effect of Safari 26 on attribution. If a report must mention it, say: "Safari 26 privacy behaviour for query parameters is only partly documented by Apple; see WebKit posts of 2024-07-16 and 2025-09-15." Rationale: no primary source read states UTM survival in default browsing. Verify: grep reports for "Safari" together with "strip|remov|UTM" and check the sentence cites the two WebKit URLs.
16. MA-16 (SHOULD). Test a tagged link in a private window and in a normal window before it is posted, and wait 30 minutes after the last pageview before retesting. Rationale: Plausible records the source only when a visit starts and a visit ends after 30 minutes' inactivity. Verify: human or browser-test check; record the result in the campaigns file.
17. MA-17 (CONSIDER). Use a keyed placement even without a tool: one distinct, recorded URL per placement (a short redirect or a UTM) plus a written log of the response. Rationale: this is Hopkins' keyed-return method, and it works with no form. Verify: each placement in the campaigns file maps to one URL.

## Dated facts

| Fact | Source | Date the source states | Source type |
|---|---|---|---|
| UTM values are case sensitive; always use source, medium, campaign; missing UTM yields `(not set)`; GA4 adds `utm_id` and `utm_source_platform` | [GA4 URL builders](https://support.google.com/analytics/answer/10917952) | undated | platform |
| Legacy article: five UTM parameters, case sensitive, `utm_term` and `utm_content` optional, marked legacy Universal Analytics | [GA article 1033863](https://support.google.com/analytics/answer/1033863) | undated | platform |
| Default channel rules quoted in finding 2; channel definitions are not case sensitive; site lists in a downloadable sheet | [GA default channel group](https://support.google.com/analytics/answer/9756891) | undated | platform |
| Attribution models: data-driven, paid-and-organic last click, Google-paid last click; first click, linear, time decay, position-based "no longer available as of November 2023"; conversions reattributed up to 7 days; direct gets no credit unless the path is all direct | [GA attribution models](https://support.google.com/analytics/answer/10596866) | page undated; change November 2023 | platform |
| Manual and auto-tagging cannot be used together | [GA traffic-source dimensions](https://support.google.com/analytics/answer/11604890) | undated; page text truncated | platform |
| Safari 26.0: known fingerprinting scripts blocked from reading query parameters and `document.referrer`; no stripping list on the page | [WebKit Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) | 2025-09-15 | platform |
| Link Tracking Protection since Safari 17.0; strips parameters used for pervasive cross-site tracking; keeps campaign-only parameters; in Private Browsing, and regular browsing when advanced protection is enabled | [WebKit Private Browsing 2.0](https://webkit.org/blog/15697/private-browsing-2-0/) | 2024-07-16 | platform |
| Safari strips unique trackers from URLs in Private Browsing (comparison table) | [Apple Safari](https://www.apple.com/safari/) | undated; fetched 2026-11-27 | platform |
| Apple publishes no parameter list or Private/All Browsing click share | [Improvado](https://improvado.io/blog/ios-26-link-tracking-protection-attribution) | 2026-09-23 | vendor |
| Plausible keeps `ref`, `source`, five UTMs, `gclid`, `msclkid`; strips the rest | [Plausible](https://plausible.io/docs/stop-tracking-utm-tags) | undated | vendor documentation |
| Internal-link UTMs overwrite the session's original referral source; visit ends after 30 minutes' inactivity; UTM values case sensitive | [Plausible UTM guide](https://plausible.io/blog/utm-tracking-tags) | updated 2026-11-12 | vendor |
| HDYHAU: optional field skipped by "nearly 30%"; make required, free text | [Recast](https://getrecast.com/hdyhau/) | 2023-05-31 | vendor |
| HDYHAU over-attributes to familiar platforms; treat as qualitative with multiple channels | [RevenueCat](https://www.revenuecat.com/blog/growth/how-did-you-hear-about-us-surveys.md) | 2025-12-16 | vendor |
| 80% of surveyed leaders monitor dark social, 33-42% connect it to quality opportunities (300+ respondents, no method given) | [Databox](https://databox.com/beyond-attribution-the-disappearing-buyer-trail) | undated, 2026 footer | vendor survey |
| Keyed ads and traced returns as the testing method; mail sample inquiries 70 cents versus 18-22 cents at store | [Hopkins PDF](https://draytonbird.com/wp-content/uploads/2012/08/Hopkins_Scientific_Advtg.pdf) | book; year not stated in the PDF read | primary text |

## What an agent must not decide alone

- Whether HDYHAU is required or optional on a form, and its wording and option list: a conversion-friction trade-off and a brand voice call.
- Adding a new `utm_medium` value or renaming an existing one: it changes channel grouping in every historical report.
- Turning on analytics, or adding a sign-up form in order to measure: the consent and legal posture belongs to the sibling worker's rules and to a human.
- Tagging links in paid campaigns, affiliate or partner links, or any link where a counterparty sees the campaign name: contractual and brand exposure.
- Whether to put any person's name, handle or customer identifier in a tag (the rule says no; an exception is a legal decision).
- Whether to publish a statement about Safari's effect on the numbers: only a human with test data can state it.

## AI-agent angle

| Characteristic mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| Capitalised or spaced values (`utm_medium=Social Media`, `utm_source=Twitter`) | copied from tutorials and the Google builder UI examples | MA-1 grep |
| Adding `?utm_source=website&utm_medium=nav` to internal links "to track clicks" | confuses UTM with event tracking | MA-6 grep on site source and built HTML |
| Using `utm_medium=organic` for a social post, or `utm_medium=web` | training data mixes search medium with social | MA-3 closed-set check |
| Inventing parameter names (`?from=linkedin`) | looks tagged, but Plausible drops it | MA-7 |
| Writing `utm_source=linkedin.com` or a personal handle | assumes "source" means domain | MA-4 regex |
| Adding a UTM to the README link to the project's own site | treats GitHub as an ad channel | MA-6 on READMEs; GitHub already arrives as a referral |
| Putting an HDYHAU `<select>` with 8 options on a new form | pattern from SaaS signup tutorials | MA-12: must be a text input |
| Stating "Safari 26 now strips UTM parameters" or the opposite | vendor blogs both ways; WebKit posts silent | MA-15 requires the two WebKit citations |
| Summing HDYHAU answers into channel totals | mixes perception and click data | MA-13 reading heuristic |
| Quoting "90% of attribution is dark social" as fact | circulates in search snippets; the Databox page read does not state it | any percentage in a rule or page must trace to a fetched page with its date |

## Contested / evolving

| Question | Position A | Position B | Trend, as of 2026-11-27 |
|---|---|---|---|
| Should HDYHAU be required? | Required, free text, string-match after ([Recast](https://getrecast.com/hdyhau/); [Outbrain](https://www.outbrain.com/blog/?p=47652), which also says A/B test it) | Optional skipped by 30% but required fields risk junk and friction; RevenueCat does not recommend required, uses closed lists and treats the data as qualitative ([RevenueCat](https://www.revenuecat.com/blog/growth/how-did-you-hear-about-us-surveys.md)) | open; all sources are vendors |
| Free text or fixed list? | Free text for low volume, list for high volume ([Outbrain](https://www.outbrain.com/blog/?p=47652)) | Free text with string matching always ([Recast](https://getrecast.com/hdyhau/)); closed list in the RevenueCat example | fleet volume is near zero, so free text; revisit when volume exists |
| Is HDYHAU attribution or context? | complement that catches dark social ([Recast](https://getrecast.com/hdyhau/); [Databox](https://databox.com/beyond-attribution-the-disappearing-buyer-trail)) | qualitative context, not evidence, once multi-channel ([RevenueCat](https://www.revenuecat.com/blog/growth/how-did-you-hear-about-us-surveys.md)) | the rules here take position B for reporting claims and A for discovery of channels nobody tags |
| Does Safari 26 strip UTMs outside Private Browsing? | Not stripped by default; parameters hidden from known fingerprinting scripts ([WebKit 2025-09-15](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/); [Improvado](https://improvado.io/blog/ios-26-link-tracking-protection-attribution), vendor, which also marks click-ID removal as untested) | Stripping applies when the user enables advanced protection and in Private Browsing, Messages, Mail ([WebKit 2024-07-16](https://webkit.org/blog/15697/private-browsing-2-0/); Improvado) | unresolved by any primary source; the commission's flag stands |
| Internal-link UTMs harmful in GA4? | Overwrite source (documented by Plausible) | GA4 pages read are silent | rule stands as a precaution; verify in a GA4 property if one is ever created |

## Fleet measurement

Commands run from `/home/mherwig/dev` on 2026-11-27 (read-only).

| Finding | Command | Result |
|---|---|---|
| Owned source files scanned | `find ocx-sh/website ocx-sh/ocx/website grimoire-rs/grimoire/docs grimoire-rs/vscode/README.md ocx-sh/ocx/README.md grimoire-rs/grimoire/README.md -type f \( -name '*.astro' -o -name '*.md' -o -name '*.mdx' -o -name '*.html' -o -name '*.yml' \) -not -path '*/node_modules/*' -not -path '*/dist/*' \| wc -l` | 925 |
| UTM links in owned sites, docs, READMEs | `grep -rEl --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=worktrees --exclude-dir=.venv --exclude-dir=.vscode-test --exclude-dir=.agents --exclude-dir=dist -e 'utm_[a-z]+=' ocx-sh/website ocx-sh/ocx grimoire-rs/grimoire grimoire-rs/vscode/README.md` | 0 files |
| UTM anywhere, repo-wide | `grep -rEn --include='*.astro' --include='*.html' --include='*.md' --include='*.mdx' --include='*.yml' --include='*.ts' --include='*.json' --include='*.toml' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=.agents --exclude-dir=worktrees -e 'utm_(source\|medium\|campaign\|content\|term)' ocx-sh grimoire-rs` | one fleet file, a test: `ocx-sh/catalog/test/site/lib/viewScript.test.ts:64` (a `?utm_source=x` input to a view-script test); the rest are third-party files in `.venv` and `.vscode-test` (Microsoft Copilot readme, pyright typeshed readme), not fleet content |
| Non-UTM tracking-like parameters in owned content | same grep with `[?&](ref\|source\|fbclid\|gclid\|mc_cid\|ref_src)=` and `-o` | only `?ref=v1.4.0` and `?ref=refs` in API calls and shell snippets (git refs), none on links |
| Sign-up or HDYHAU fields | `grep -rEli --include='*.astro' --include='*.html' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=worktrees -e '<form\|newsletter\|sign ?up\|how did you hear' ocx-sh grimoire-rs` | matches only research scratch HTML and built docs text in `grimoire-rs/grimoire/docs/dist/`; no sign-up form in site source; `grep -rEli ... 'how did you hear'` found 0 files |

Reading: the fleet has no tagged links, no internal-link UTMs, no sign-up form and no analytics tag (scout: 0 files for `googletagmanager|gtag\(`). The rules are therefore forward commitments, not corrections.

## Sources

| URL | What it is | Date/era | Type | Why worth reading |
|---|---|---|---|---|
| https://support.google.com/analytics/answer/10917952 | GA4 URL builders | undated | primary | the case-sensitivity and `(not set)` statements |
| https://support.google.com/analytics/answer/1033863 | legacy UA campaign URL article | undated, legacy | primary | five parameters; "always use" three |
| https://support.google.com/analytics/answer/9756891 | GA4 default channel group | undated, yearly list review | primary | the medium words that drive channel assignment |
| https://support.google.com/analytics/answer/10596866 | GA4 attribution models | models removed Nov 2023 | primary | what a channel report means |
| https://support.google.com/analytics/answer/11604890 | GA4 traffic-source dimensions, manual vs auto-tagging | undated, text truncated | primary | tagging method exclusivity |
| https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ | WebKit Safari 26.0 features | 2025-09-15 | primary | what the commission asked to record |
| https://webkit.org/blog/15697/private-browsing-2-0/ | WebKit Private Browsing 2.0, Link Tracking Protection | 2024-07-16 | primary | the only WebKit statement on stripping scope |
| https://www.apple.com/safari/ | Apple Safari product page | fetched 2026-11-27 | primary | Private Browsing claim |
| https://draytonbird.com/wp-content/uploads/2012/08/Hopkins_Scientific_Advtg.pdf | Hopkins, Scientific Advertising (PDF copy) | book; year not stated in PDF | primary | keyed ads and traced returns |
| https://plausible.io/docs/stop-tracking-utm-tags | Plausible parameter handling | undated | primary for its own behaviour, vendor | which parameters survive |
| https://plausible.io/docs/manual-link-tagging/ | Plausible manual link tagging overview | undated | vendor | points to naming guide |
| https://plausible.io/blog/utm-tracking-tags | Plausible UTM guide | updated 2026-11-12 | vendor | internal-link overwrite statement |
| https://improvado.io/blog/ios-26-link-tracking-protection-attribution | Safari 26 scope summary | 2026-09-23 | vendor | maps documented vs undocumented scope |
| https://www.revenuecat.com/blog/growth/how-did-you-hear-about-us-surveys.md | HDYHAU surveys | 2025-12-16 | vendor | bias argument, causal alternatives |
| https://getrecast.com/hdyhau/ | HDYHAU limitations | 2023-05-31 | vendor | bias types, 30% skip |
| https://www.outbrain.com/blog/?p=47652 | Self-reported attribution guide | undated | vendor | field design advice, caveats |
| https://databox.com/beyond-attribution-the-disappearing-buyer-trail | dark-social survey | undated, 2026 | vendor survey | shows how weak the evidence base is |
| https://www.growthunhinged.com/ | newsletter index, opened | fetched 2026-11-27 | practitioner | checked; holds no HDYHAU post, nothing cited from it |

Primary count: 10 of 18 (five Google, three platform/Apple/WebKit, Hopkins, Plausible own-behaviour page). Not read, no claim drawn: Project Gutenberg and Internet Archive Hopkins copies, Plausible URL-builder page (404).
