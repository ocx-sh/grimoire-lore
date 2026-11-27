---
title: Consent-free analytics configurations (EU, UK, Germany) and the privacy-statement match
program: product
sub_program: marketing
topic: marketing-measurement
worker: measure-consent-free-config
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
scope: >
  Covers which analytics configurations a software project may run without a consent banner in the EU (France as the
  worked regulator), Germany and the UK, the status of the EU Digital Omnibus, vendor cookieless modes (labelled vendor
  claims), a local measurement of what each tool writes, the privacy-statement versus script-inventory check, and what
  "unique visitors" may mean under a daily salt. Not covered: US state law, CLI telemetry, consent-banner design,
  email tracking pixels (lifecycle-email owns them), advertising and attribution cookies.
---

# Consent-free analytics configurations (EU, UK, Germany) and the privacy-statement match

This is research, not legal advice. Every row that rests on law carries a fetch date, a provision, and a status. Items
that could not be confirmed on the primary page are marked "unverified, omitted" and carry no rule.

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Dated facts](#dated-facts)
8. [Sources](#sources)

## Summary

- No regulator in the three jurisdictions publishes a list that blesses Plausible or Fathom. Their "no banner" statements are vendor claims ([Plausible](https://plausible.io/data-policy), [Fathom](https://usefathom.com/data)).
- Germany is the strictest: the German regulators' guidance (DSK, Nov 2024) refuses to say any "Reichweitenmessung" is consent-free in general and says a ruling can only hold for one exactly defined configuration ([DSK OH Digitale Dienste v1.2, Rn. 87-89](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf)). The default for a script-based tool in Germany is consent.
- In Germany, counting page views from server logs without personal data, or a plain counter of the directly called service, is the only form the DSK guidance describes as sufficient without further data (Rn. 88). No browser script is needed for it.
- The UK has a statutory analytics exception since 5 February 2026 (PECR Schedule A1 para 5): sole purpose statistics to improve the service, clear information, a free and simple way to object, no sharing except to make those improvements ([Schedule A1](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1), [commencement SI 2026/82](https://www.legislation.gov.uk/uksi/2026/82/made)).
- France has a published, condition-based exemption: [CNIL sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) (page date 11 June 2020, seven conditions), the [CNIL French page](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience) (4 July 2025) and the [CNIL self-evaluation tool for providers](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) (July 2025), which is the most detailed text: it excludes UTM and campaign identifiers, limits the referrer to the host, and excludes acquisition-channel measurement.
- EDPB Guidelines 2/2023 v2.0 (adopted 7 October 2024) say a client-side script that tells the browser to send an identifier is "gaining access" and Article 5(3) ePrivacy applies (para 63); an IP address triggers it when it originates from the terminal (para 55) ([EDPB guidelines PDF](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)). Hashing server-side does not remove the access step that the script causes.
- Article 5(3) applying does not mean consent is needed: an exemption must be assessed per case (EDPB para 56, [same PDF](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)). That is where the national regimes differ.
- The Digital Omnibus is a proposal, not law: the Parliament file 2025/0360(COD) shows "Awaiting committee decision" as of the fetch ([OEIL](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD))). No rule may assume the audience-measurement carve-out exists.
- Measured locally on 2026-11-27 (Playwright HAR, command in section 7, files under `~/.cache/research-lang/exemplars/product/mcf-measure/har/`): Plausible script (local build) and Fathom wrote no cookie and no storage; Matomo with `disableCookies` wrote none, Matomo default wrote two cookies; PostHog default wrote a cookie plus localStorage, PostHog `cookieless_mode: 'always'` wrote nothing. Plausible, Fathom and Matomo each sent the full page URL including `utm_*` parameters and the full referrer URL including its query string by default (section 7); that contradicts the CNIL self-evaluation tool unless stripped, and a measured Matomo configuration strips both.
- Decision (section 7.2): the only configuration that passes the law protocol without a banner in some jurisdiction is a self-hosted Matomo, cookies off, URL and referrer stripped, opt-out on the privacy page, in France and, with the Schedule A1 conditions, the UK. In Germany no browser script is allowed without consent; server-log counting is the only consent-free form.
- The privacy statement must name every third-party host the build loads and every storage key it writes: the UK exception, the German rule and the CNIL conditions all start with information to the visitor.
- Under a daily salt a "visitor" is a per-day hash. A range count is a sum of daily counts, not people. Label it so.
- The fleet stance (0 of 413 crawled pages load a third-party script, measured 2026-11-27 by `crawl.py` and reported in `.agents/research/product-audit/distribution-posture.md` lines 40 and 204; grimoire's privacy notice at `/home/mherwig/dev/grimoire-rs/grimoire/docs/public/privacy.html` lines 37-41 says no cookies and no third-party subresources and gives the re-check grep) is the lowest-risk position in all three jurisdictions. Adding any script is a business and legal decision.

## Findings

### 1. France: CNIL sheet 16 and the French page

Source: [CNIL sheet 16, English](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) (page date 11 June 2020, no later date shown; fetched 2026-11-27; regulator itself). Cookies for audience measurement are exempt only if all of these hold:

1. Inform the user.
2. Offer a way to object.
3. Purpose limited to audience measurement and A/B testing.
4. No cross-checking with other processing (customer files, other sites).
5. Tracker scope limited to one publisher's site or application.
6. Truncate the last byte of the IP address.
7. Tracker lifetime at most 13 months.

The page says most large audience-measurement offerings do not fall within the exemption "regardless of their configuration". It names no commercial tool and points to open-source software you configure yourself, such as Matomo.

Source: [CNIL French page "solutions pour les outils de mesure d'audience"](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience) (last update 4 July 2025; fetched 2026-11-27; regulator itself). It restates the exemption in terms of: use for the publisher's sole account, anonymous statistics only, no cross-referencing, no sharing of non-anonymous data with third parties, no cross-site identifier. It recommends (not conditions) retention of at most 25 months and tracker lifetime about 13 months, not extended on new visits. It does not mention identifier rotation or opt-out. The 2020 English sheet lists seven numbered conditions including IP truncation and an objection route; the 2025 French page lists purpose and data limits and a recommended retention; the July 2025 self-evaluation tool (below) is the most detailed. Apply the stricter union of all three.

Source: [CNIL self-evaluation tool for consent-exempt audience measurement](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) (cover "Juillet 2025", PDF metadata 3 July 2025; fetched 2026-11-27, text extracted locally; regulator itself). It is addressed to providers and lists the criteria a tool must meet when configured; where it names a technical measure, that is a CNIL recommendation and a provider may show an equivalent. The criteria used in section 7.1:

- Sole purpose is audience measurement: performance, navigation problems, technical optimisation, server sizing, content analysis. Marketing measurement is excluded and must be off by default: "performance of conversion channels, advertising campaigns, acquisition channels", and cohort creation.
- Collected data minimised; at most three event types (page presence, use of a feature, load/scroll/time statistics); HTTP header data (browser, OS) reduced to major versions.
- Provider acts as processor under an Article 28 DPA; no pooling of raw data across clients; no reuse for the provider's own account for any purpose, including improving its service or fraud control.
- No tracking outside the site: no import of external data; disable collection or import of customer IDs, UTM or campaign identifiers in URLs; referrer limited to the host; no third-party tool integrations; first-party cookie only; IP gives city-level location then has at least the last octet removed; a fingerprint-derived identifier must include a site-specific component and a time component so it has a limited life.
- Reach or deduplicated cross-content measurement excluded.
- Reports contain only anonymous statistics: aggregation and presentation to the nearest ten, or an anonymity analysis (G29 opinion); no session replay.
- Opposition: a clickable button or link in the privacy policy, and a durable way to honour it (an opt-out cookie or a deny-list entry for a fingerprint).

Source: [CNIL Matomo Analytics exemption configuration guide](https://www.cnil.fr/sites/cnil/files/atoms/files/matomo_analytics_-_exemption_-_guide_de_configuration.pdf) (6 pages, no date in the text; opened and extracted locally 2026-11-27; published on cnil.fr, written by the Matomo vendor, so vendor data hosted by the regulator). Steps: disable the visits log and visitor profile; add an opt-out on the privacy page; keep IP anonymisation on (default removes the last two octets of an IPv4); no cross-domain tracking or third-party cookies; no User ID; no e-commerce tracking; disable heatmaps and session recording with `_paq.push(['HeatmapSessionRecording::disable']);`; keep personal data out of URLs, titles, custom dimensions and events. It quotes the Matomo Cloud DPA ("does not pursue its own purposes"). It says nothing about UTM parameters or the referrer, which the self-evaluation tool above does address.

The CNIL page that listed evaluated tools and versions was not opened (a search summary said the evaluation programme has ended and the list is no longer updated). The versioned tool names stay unverified and omitted; the guide above is the regulator-hosted evidence that Matomo is the reference configurable tool.

### 2. EDPB Guidelines 2/2023 (technical scope of Article 5(3) ePrivacy)

Source: [EDPB document page](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en) (Version 2.0, final; fetched 2026-11-27), and the [PDF](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf) text read locally (cover: "Version 2.0, Adopted on 7 October 2024"; the EDPB page shows 16 October 2024; regulator itself).

- Para 47-51: a tracking pixel or link used to send information to its host is within scope; adding tracking information to URLs or images sent to the user constitutes storage or access.
- Para 54-55: IP-only tracking can trigger Article 5(3) where the IP "originates from the terminal equipment" (a static outbound IPv4 from a user's router, and IPv6 addresses); under CGNAT it may not. "Unless the entity can ensure" otherwise, it must follow Article 5(3).
- Para 56: applicability "does not systematically mean that consent needs to be collected"; the exemption is assessed case by case. The guidelines do not analyse the exemptions.
- Para 63: for unique identifiers on websites, the collector "is instructing the browser (through the distribution of client-side code) to send that information. As such a 'gaining of access' is taking place and Article 5(3) ePD applies."

Consequence for a cookieless script: it is not outside Article 5(3) merely because it stores nothing. Whether it needs consent turns on the national exemption.

### 3. Germany: TDDDG §25 and the DSK guidance

Source: [§25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html) (fetched 2026-11-27; official legal database; law title "Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz"; the fetched content showed no "Stand" line). Abs. 1: storage on, and access to information in, the end-user device is allowed only with consent after clear and comprehensive information. Abs. 2: no consent needed only if (1) the sole purpose is transmitting a message, or (2) the storage or access is "unbedingt erforderlich" for the provider to deliver the digital service the user explicitly asked for.

Source: [DSK OH Digitale Dienste v1.2, "Stand: November 2024"](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) (read locally; regulators' conference). Rn. 87-91, in short:

- The authorities deliberately make no statement that audience measurement may run without consent under §25(2) Nr. 2.
- Rn. 88: a pure count of page views is possible from log files without personal data, or through a simple counter pixel of the directly called service that collects no further user data. Third-party measurement services regularly process far more.
- Rn. 89: a consent-free finding "can at most be made for a precisely defined configuration and purpose" and lapses once further user information or another result is added.
- Rn. 90: even measuring visitor numbers is not per se part of the base service the user requested; it depends on the purpose.

Source: [BfDI page on Zählpixel](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/Z%C3%A4hlpixel.html) (no date shown; federal commissioner). It says a counting pixel is not technically necessary for the requested service, the §25(2) Nr. 2 exception does not apply, and consent under §25(1) is required. This is stricter than DSK Rn. 88's description and is a live disagreement (see Contested).

Source: [Matomo FAQ](https://matomo.org/faq/new-to-piwik/how-do-i-use-matomo-analytics-without-consent-or-cookie-banner/) (vendor data, no date shown, footer 2026). The vendor itself says only server-side methods (log analytics or the HTTP Tracking API) are "clearly recognised" as outside §25 in Germany, and it advises treating JavaScript tracking as consent-requiring until a supervisory authority clarifies.

### 4. UK: PECR regulation 6 and Schedule A1 (Data (Use and Access) Act 2025)

- [Regulation 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6): fetched 2026-11-27; regulation 6 substituted on 5 February 2026 by Data (Use and Access) Act 2025 ss. 112(2), 142(1), as commenced by S.I. 2026/82 reg. 2(w); the page reports no outstanding effects. Para 1: subject to Schedule A1, no storing or accessing information in a user's terminal equipment. Para 2: "instigating the storage or access" is included; collecting information the equipment emits automatically counts as gaining access unless otherwise provided. Status: in force.
- [Schedule A1](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1): inserted by the 2025 Act s. 142(1) and Sch. 12, in force 5 February 2026 (S.I. 2026/82 reg. 2(z13)); fetched 2026-11-27. Para 5, the statistical purposes exception, applies if all hold: the person provides an information society service; the sole purpose is collecting statistics on how the service or website is used, with a view to making improvements; the information is not shared with anyone except to help make those improvements; the user receives clear and comprehensive information about the purpose; the user has a simple, free means to object and does not object. The page summary also states that para 5(2) excludes collecting information the terminal emits automatically; read para 5(2) on the page before relying on a tool that reads such data. Para 5(3): for repeated use for the same purpose, information and objection need only be provided on the first use.
- [S.I. 2026/82](https://www.legislation.gov.uk/uksi/2026/82/made): "The Data (Use and Access) Act 2025 (Commencement No. 6 and Transitional and Saving Provisions) Regulations 2026", made 29 January 2026, brings section 112 (storing information in terminal equipment) into force on 5 February 2026. Commencement confirmed from a commencement regulation on legislation.gov.uk, as the commission requires.
- ICO guidance on the exception was seen only in a search result; the ICO pages returned HTTP 403 to this worker (a search summary said the exception needs clear information and an objection route and fails if the same data serves advertising). Unverified, omitted.

### 5. EU: Digital Omnibus status

- [Commission news item, 19 November 2025](https://commission.europa.eu/news-and-media/news/simpler-digital-rules-help-eu-businesses-grow-2025-11-19_en): the proposals "will now be submitted to the European Parliament and the Council for adoption"; it says only that "modernised cookie rules will improve users' experience". Fetched 2026-11-27.
- [Commission Digital Package FAQ](https://digital-strategy.ec.europa.eu/en/faqs/digital-package) (updated 20 November 2025): proposes a "whitelist" of situations benign for privacy, "such as statistics and aggregated audience measurements". Written as a proposal.
- [European Parliament Legislative Observatory, 2025/0360(COD)](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD)): proposal COM(2025)0837 published 19 November 2025; committee referral 19 January 2026; stage "Awaiting committee decision". The page lists later documents (committee draft report 22 June 2026, committee opinions to 20 November 2026) so it may lag; no adoption is shown. Status: proposed, not in force.
- The Council press release of 21 October 2026 on a negotiating mandate was seen in a search result but returned HTTP 403 to this worker; the EUR-Lex text of COM(2025) 837 also could not be fetched. Anything about the final shape of the audience-measurement carve-out (who may use it, whether third-party providers qualify, application date) is unverified, omitted. A secondary report that the Council mandate keeps cookie rules in the ePrivacy Directive is not relied on.

### 6. Vendor configurations (vendor claims, labelled)

| Vendor | Claim (source, date) | What it implies for the legal tests |
|---|---|---|
| Plausible | Page "Last updated: November 2026". Visitor ID is `hash(daily_salt + website_domain + ip_address + user_agent)`; salt "rotated and deleted every 24 hours"; no cookies, cache or local storage to identify visitors; script reads `plausible_ignore` from local storage, never writes it; raw IP and User-Agent not stored; "you do not need cookie banners" ([data policy](https://plausible.io/data-policy)). Vendor data. | The no-banner statement is the vendor's view. The script is still client-side code that makes the browser send the URL and referrer (measured below). EDPB para 63 applies. The page gives no retention period. |
| Fathom | No date on page. "SHA-256 visitor signature" from IP, user-agent, site id and daily salt; salt rotates at midnight UTC; signatures are stored with event records, and "salt rotation is not the same as deleting stored analytics records"; IP still appears in request handling, rate limiting and bot records; no legal analysis of consent ([data page](https://usefathom.com/data)). Vendor data. | Same as Plausible. A local day spans two UTC salts, so counts can shift. Stored signatures mean the "daily" identifier is kept as data. |
| PostHog | `cookieless_mode: "always"`: nothing in cookies or local/session storage, counts by a server-side hash, ignores `opt_in_capturing` and `opt_out_capturing`, `identify()` not blocked but discouraged, `alias()` events dropped; `"on_reject"`: nothing stored until the visitor answers; the page says "Doesn't require a cookie banner (unless something else on your website uses cookies)", requires a project setting, and warns that the mode alone does not cover compliance ([PostHog docs](https://posthog.com/docs/privacy/data-collection); no page date). Vendor data. | `always` ignores a visitor's opt-out, which conflicts with the "way to object" condition (CNIL 2, UK Schedule A1 para 5). Do not combine it with `identify()`. |
| Matomo | Settings for consent-free use: cookies off, IP anonymised by at least 2-3 bytes, referrer anonymised, no personal data in URLs/titles/custom data, no User ID, single site only, opt-out form on the privacy page, privacy policy updated; Germany: only server-side tracking is clearly recognised ([vendor FAQ](https://matomo.org/faq/new-to-piwik/how-do-i-use-matomo-analytics-without-consent-or-cookie-banner/), no page date). Vendor data. | Matches CNIL conditions on paper, and the only product here with a configuration guide hosted by the CNIL (section 1). It still sends UTM parameters and the full referrer by default (section 7), so it needs the strip settings. Self-hosted is required to keep data off third parties. |

### 7. Measured locally (2026-11-27)

Method. Playwright (Python, Chromium headless shell build 1255) loaded one static page per tool from `http://localhost:8123`, with a HAR recorded per run (`har/<name>.har` under `~/.cache/research-lang/exemplars/product/mcf-measure/`). Vendor script requests were passed through; every other request was answered with HTTP 204 and logged. After 5 seconds the run printed cookies (`ctx.cookies()`), `localStorage`, `sessionStorage`, `document.cookie` and `indexedDB.databases()`. Command: `uv run --with playwright python -I run.py plausible2 fathom posthog_always posthog_default matomo_nocookie matomo_default`. Required unprivileged extraction of the Ubuntu runtime libraries (libnss3 and others) into `libs/` and `LD_LIBRARY_PATH`. Limits: localhost origin, stubbed responses, a single page view, no consent flow.

| Run | Cookies | local/sessionStorage, IndexedDB | Request observed |
|---|---|---|---|
| Plausible `script.js` | none | none | none: the script does not send from `localhost`; rerun with `script.local.js` |
| Plausible `script.local.js` | none | none | `POST https://plausible.io/api/event`, body `{"n":"pageview","v":37,"u":"<page url>","d":"example.test","r":null}` |
| Fathom `script.js`, `data-site` set | none | none | `GET https://cdn.usefathom.com/?h=<host>&p=<path>&r=&sid=<site id>&qs={}&cid=<random number>` |
| PostHog (`posthog-js` 1.455.4) `cookieless_mode: 'always'`, `person_profiles: 'never'` | none | none | none observed: the remote config fetch was stubbed, so the "enabled in project settings" gate (per the vendor page) was never satisfied; storage result is valid, request result is not |
| PostHog 1.455.4 default | `ph_phc_<key>_posthog` | same key in localStorage holding `distinct_id`, `$device_id`, session ids | `GET .../array/<key>/config`, `POST .../flags/` carrying the `distinct_id` |
| Matomo (`matomo.js` from `cdn.matomo.cloud`) with `disableCookies` | none | none | `POST <tracker>/matomo.php?action_name=...&idsite=1&rec=1&url=...` |
| Matomo default | `_pk_id.1.1fff`, `_pk_ses.1.1fff` | none | same beacon |

An earlier PostHog run with `posthog-js` 1.200.0 wrote a cookie and localStorage under `cookieless_mode: 'always'`: that version predates the option. Pin and check the SDK version before relying on the mode.

Second run (attribution tags, 2026-11-27). Same harness with `run2.py` (copy of `run.py` that loads `?utm_source=nl&utm_campaign=launch&ref=abc` with `referer: https://news.example.org/a/b?q=secret`; HARs `har/utm_<name>.har`). Command: `uv run --with playwright python -I run2.py plausible2 fathom matomo_nocookie matomo_strip`. Result: every tool sent the campaign parameters and the full referrer URL by default; the last row shows a Matomo configuration that removes both.

| Run | What the request carried |
|---|---|
| Plausible `script.local.js` | `"u":"http://localhost:8123/plausible2.html?utm_source=nl&utm_campaign=launch&ref=abc"`, `"r":"https://news.example.org/a/b?q=secret"` |
| Fathom `script.js` | `r=https://news.example.org/a/b?q=secret`, `qs={"utm_source":"nl","utm_campaign":"launch","ref":"abc"}` |
| Matomo `disableCookies` | `url=...matomo_nocookie.html?utm_source=nl&utm_campaign=launch&ref=abc`, `urlref=https://news.example.org/a/b?q=secret` |
| Matomo `disableCookies` + `setCustomUrl(origin+pathname)` + `setReferrerUrl(referrer origin + "/")` + `HeatmapSessionRecording::disable` | `url=http://localhost:8123/matomo_strip.html`, `urlref=https://news.example.org/`; no cookie, no storage |
| PostHog | not measured for campaign parameters (the `always` run produced no request, see above) |

Limit: this shows what the browser sends. A vendor server may drop parameters before storing them; none of the fetched vendor pages says so, so treat the client request as the data collected.

### 7.1 Each tool against the CNIL conditions

Criteria are those of the [CNIL self-evaluation tool (July 2025)](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) and the seven conditions of [sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications). Cell values: PASS-M passes by local measurement (section 7); PASS-V passes on a vendor statement only (label: vendor data); FAIL-M fails by local measurement; FAIL-V fails on the vendor's own documentation; CONFIG needs a setting the CNIL guide names; CONFIG-M needs a setting this run measured; UNVERIFIED no fetched source decides it. Configurations: Plausible and Fathom as shipped (they offer no cookie mode to change); PostHog `cookieless_mode: 'always'`; Matomo cookies off.

| Criterion | Plausible | Fathom | PostHog `always` | Matomo, cookies off |
|---|---|---|---|---|
| No cookie or storage, lifetime within 13 months (sheet 16 cond. 7) | PASS-M | PASS-M | PASS-M (storage only; request not observed) | PASS-M |
| UTM and campaign identifiers not collected (tool, URL criterion) | FAIL-M | FAIL-M | UNVERIFIED | FAIL-M by default; CONFIG-M with `setCustomUrl` |
| Referrer limited to host | FAIL-M | FAIL-M | UNVERIFIED | FAIL-M by default; CONFIG-M with `setReferrerUrl` |
| Identifier has a site-specific and a time component (tool, fingerprint criterion) | PASS-V (domain + daily salt, [data policy](https://plausible.io/data-policy)) | PASS-V (site id + daily salt, [data page](https://usefathom.com/data)) | UNVERIFIED (vendor says server-side hash, no salt terms fetched) | UNVERIFIED |
| IP truncated by at least the last octet (sheet 16 cond. 6; tool) | Deviation: IP is hashed, not truncated; the tool lets a provider show an equivalent, the owner must see that justification (UNVERIFIED) | same deviation | UNVERIFIED | PASS-V (default removes two IPv4 octets, per the [CNIL-hosted Matomo guide](https://www.cnil.fr/sites/cnil/files/atoms/files/matomo_analytics_-_exemption_-_guide_de_configuration.pdf)) |
| Objection through a link or button in the privacy policy, honoured durably (cond. 2; tool) | UNVERIFIED (vendor page describes only a `plausible_ignore` flag a visitor sets in their own browser) | UNVERIFIED | FAIL-V (`always` ignores opt-out calls, [PostHog docs](https://posthog.com/docs/privacy/data-collection)) | CONFIG (opt-out iframe on the privacy page, CNIL guide step 2) |
| Provider as processor, no reuse for its own account, no pooling (cond. 3-4; tool) | UNVERIFIED (DPA not fetched) | UNVERIFIED | UNVERIFIED | PASS-V for Matomo Cloud (DPA quoted in the CNIL guide); not applicable when self-hosted |
| No cross-domain identifier, no User ID, no e-commerce, no session replay or heatmap | n/a: not features of the script | n/a | UNVERIFIED (replay and autocapture are separate settings, not measured) | CONFIG (CNIL guide steps 3b-3e) |
| Reports are anonymous statistics (aggregation to the nearest ten, or an anonymity analysis) | UNVERIFIED (dashboards show exact counts; no analysis fetched) | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| At most three event types; purpose limited to audience measurement | CONFIG (pageviews only, no custom events) | CONFIG | CONFIG | CONFIG |

Verdict per tool for the CNIL exemption: Plausible and Fathom as shipped are not shown to pass (two measured failures, one mechanism deviation, processor terms unverified). PostHog `always` fails the objection criterion on its own documentation. Matomo with cookies off passes the measured items once the URL and referrer are stripped and the CNIL guide steps are applied; the "nearest ten" reporting criterion stays unverified for every tool and is a counsel question.

### 7.2 Decision: allowed tools and configurations per jurisdiction

"Allowed" means: passed the law protocol (primary text fetched 2026-11-27, provision cited, status in force) and the section 7.1 check. It is not a legal opinion, and "no consent banner" never removes the GDPR duties (information, processor terms, rights).

| Jurisdiction | Consent-free configurations allowed | Not allowed without consent | Basis (all fetched 2026-11-27) |
|---|---|---|---|
| France | Self-hosted Matomo, or Matomo Cloud under its DPA, with: cookies off (or first-party cookie of at most 13 months), visits log and profile disabled, opt-out link in the privacy page, IP anonymisation on, no User ID or e-commerce, replay and heatmaps disabled, `setCustomUrl` without query string, `setReferrerUrl` host only, pageviews only. Also: server-log counting without personal data. | Plausible, Fathom, PostHog `always` as shipped; any tool that records UTM or campaign identifiers (the exemption excludes acquisition-channel measurement); any tool with reach, cohort, User ID or replay features on. | [CNIL self-evaluation tool](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) (July 2025, guidance, in force as the regulator's published position); [sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) (2020-06-11); measurements in 7 |
| Germany | Server-log counting without personal data; a plain counter of the directly called service that collects no further user data (DSK Rn. 88; the BfDI disagrees for pixels, see Contested, so treat only log counting as safe). | Any browser script that sends the page view, including every tool in 7.1, until consent. | [TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html) (in force); [DSK OH Digitale Dienste v1.2](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) Rn. 87-91 (Stand November 2024); [BfDI Zählpixel](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/Z%C3%A4hlpixel.html) |
| UK | Server-log counting. A script is allowed without consent only when it meets every limb of [PECR Schedule A1 para 5](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1) (in force 2026-02-05): provider of an information society service; sole purpose statistics about use of the service with a view to improvements; no sharing except to help make those improvements; clear and comprehensive information; a free, simple objection that is not used. Candidate: the France Matomo configuration, with the opt-out and the privacy-page purpose text added. | Any tool for acquisition-channel or advertising use; any use that shares data beyond improving the site; and, on the statutory text, collection of information the terminal emits automatically. Para 5(2): "does not include a reference to collecting or monitoring information automatically emitted by the terminal equipment", while [regulation 6(2)(b)](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6) counts collecting such information as gaining access. A hash built from IP and user agent (Plausible, Fathom, cookieless Matomo) reads such information, so it is not shown to sit inside para 5. The ICO reading could not be fetched (HTTP 403). | Statute text above; commencement [S.I. 2026/82](https://www.legislation.gov.uk/uksi/2026/82/made) (made 2026-01-29, in force 2026-02-05) |

Result for the fleet: the only consent-free option that passes in all three jurisdictions is no script and server-log counting. A browser script is a consent-free option in France only (Matomo, stripped), is unresolved in the UK (the para 5(2) text, counsel question), and needs consent in Germany. UTM-style attribution tags are not consent-free in France; they are an owner decision elsewhere.

### 8. Privacy statement versus script inventory

Why they must match: every regime above begins with information. TDDDG §25(1) requires consent on "clear and comprehensive" information; Schedule A1 para 5 requires clear and comprehensive information about the purpose plus an objection route; the CNIL's first condition is to inform. An analytics script absent from the statement, or a statement claiming "no analytics" while one loads, breaks the information condition and makes the statement false. Fleet reference: grimoire's notice lists each stored key and states no third-party subresources and a check re-runs `grep` over the build output (file `/home/mherwig/dev/grimoire-rs/grimoire/docs/public/privacy.html`, line 37 "No cookies anywhere" and lines 41-42 "Re-check with `grep -rl 'localStorage\|sessionStorage\|document.cookie' docs/dist`", read 2026-11-27 with `sed -n 35,45p`; the audit reporting it is `.agents/research/product-audit/distribution-posture.md` lines 205-206 and 288, dated 2026-11-27).

A mechanical match check (tested on the fixture pages in this run; it flags `cdn.matomo.cloud` and `cdn.usefathom.com` when the statement only names `plausible.io`): see rule MEAS-CF-09. It does not see hosts loaded by `import` or by a script at run time (the PostHog module import from esm.sh was not matched), so it is a floor, not a proof.

### 9. What "unique visitors" may mean under a daily salt

- Plausible: "someone who returns on another day or uses another device" is counted as a separate visitor; multiple sessions on one day are one visitor ([metrics definitions](https://plausible.io/docs/metrics-definitions), updated 26 November 2026, vendor data). The page does not say how a multi-day range aggregates. This worker did not find it stated; treat any multi-day "visitors" figure as a sum of daily counts unless the vendor documents otherwise.
- Fathom: the hash changes with each daily salt; a local reporting day can span two UTC salts, "which can affect unique-visitor counts" ([data page](https://usefathom.com/data), vendor data).
- Matomo: the vendor notes that rotating the visit hash reduces accuracy of unique visitor metrics (FAQ above, vendor data).
- Therefore: the number is "distinct per-day device signatures". It is not people, not accounts, not installs. It cannot support "new versus returning", cohort retention, or week-over-week unique growth. Page-view counts, referrer counts and same-day visitor counts are safe comparisons.

## Normative guidance candidates

All rules assume the project is a software product or service site. Law rows refresh by 2027-05-27 (fetch + 6 months) unless noted.

| ID | Rule | Rationale | Severity | Verification |
|---|---|---|---|---|
| MEAS-CF-01 | MUST NOT add any analytics script, pixel, SDK or beacon to a site, docs or app without an explicit owner decision naming the tool, the jurisdictions served and the consent route. | Every row in the law table turns on facts only the owner knows; the fleet default is zero scripts. | MUST | Run `rg -n --glob '*.{html,astro,md,mdx,js,ts,toml,yaml}' -i 'plausible\|fathom\|posthog\|matomo\|umami\|googletagmanager\|gtag\|goatcounter\|clarity\|hotjar\|segment\|mixpanel\|amplitude'` before and after the change; a hit that is not in the owner-approved tool list fails. Pass: no new hits. |
| MEAS-CF-02 | MUST NOT write a vendor's "no banner needed" claim as a legal conclusion; write it as "the vendor states". | Vendor pages are not regulators and none of the three regulators names Plausible or Fathom. | MUST | Reading heuristic. Fail: "Plausible is GDPR compliant, no consent needed". Pass: "Plausible states that it needs no cookie banner (vendor claim, [data policy](https://plausible.io/data-policy))". |
| MEAS-CF-03 | For visitors in Germany, MUST NOT load a client-side analytics script before consent. The consent-free option is server-log counting without personal data, with no script. | DSK Rn. 88-89 refuse a general consent-free finding; BfDI treats a counting pixel as consent-requiring; EDPB para 63 treats client-side identifier collection as access. | MUST | `rg -n '<script[^>]+src="https?://' dist/ -g '*.html'` returns no analytics host; the log-count job reads server logs only. Law row: [TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html), in force, official text fetched 2026-11-27 (no Stand shown), with [DSK OH Digitale Dienste v1.2](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) Rn. 88-89 (Stand November 2024) and [EDPB Guidelines 2/2023](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf) para 63 (adopted 2024-10-07), refresh_by 2027-05-27. |
| MEAS-CF-04 | In the UK, if analytics are used without consent under Schedule A1 para 5, MUST: use the data only for usage statistics to improve the service, share it only to make those improvements, state the purpose on the privacy page, and give a working opt-out. | These are the statutory conditions in force from 5 February 2026. | MUST | Checklist on the page and tool config: (a) privacy page names tool and purpose; (b) a control or documented setting that stops measurement for that visitor works (test: set it, reload, confirm no beacon in the HAR); (c) vendor contract or data policy forbids secondary use. Law row: [PECR Sch. A1 para 5](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1) with [reg. 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6), in force 2026-02-05 by [S.I. 2026/82](https://www.legislation.gov.uk/uksi/2026/82/made) (made 2026-01-29), fetched 2026-11-27, refresh_by 2027-05-27. Also MUST NOT rely on para 5 for a hash built from IP and user agent until counsel confirms, because para 5(2) excludes information the terminal emits automatically. |
| MEAS-CF-05 | In France, if analytics run on the CNIL exemption, MUST satisfy all seven conditions of sheet 16 and every criterion of the CNIL self-evaluation tool, and keep tracker lifetime at most 13 months and retention at most 25 months. | CNIL exemption is all-conditions-or-nothing and says most large offerings fail. | MUST | Tool config diff against the seven conditions; `rg -n 'Max-Age\|expires' har/*.har` shows no tracker over 13 months; privacy page states retention. Law row: [CNIL sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) (page date 2020-06-11), [French page](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience) (2025-07-04) and [self-evaluation tool](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) (July 2025), regulator guidance, fetched 2026-11-27, refresh_by 2027-05-27. |
| MEAS-CF-06 | MUST NOT use PostHog `cookieless_mode: 'always'` where a visitor-level opt-out must be honoured, and MUST NOT call `identify()` or `alias()` with it. | The vendor says `always` ignores opt-out calls and a persistent ID is personal data; opt-out is a condition in the CNIL and UK tests. | MUST | `rg -n "cookieless_mode" src/ ` and `rg -n "identify\(\|alias\(\|opt_out_capturing_by_default"`; a repo with `'always'` and a consent or opt-out UI, or with `identify(`, fails. |
| MEAS-CF-07 | MUST measure storage after wiring any analytics: load each page type headless and assert zero cookies and zero localStorage/sessionStorage/IndexedDB entries for a tool sold as cookieless. | Vendor modes depend on version (PostHog 1.200.0 wrote storage under `always`; 1.455.4 did not). | MUST | Playwright check: `await ctx.cookies()` empty and `page.evaluate('Object.keys(localStorage).length+Object.keys(sessionStorage).length')` equals 0, with the pinned SDK version recorded. Fail on any key. |
| MEAS-CF-08 | MUST name every analytics tool, its host, what is sent (page URL, referrer, truncated or hashed IP, user agent), retention, and the opt-out in the privacy statement in the same change that adds the tool. | The information condition in all three regimes; a false "no analytics" statement is a defect. | MUST | Run the check in MEAS-CF-09 and grep the statement: `rg -n -i '<tool name>' privacy.*` must hit. Fail: tool present, statement says "no analytics". |
| MEAS-CF-09 | MUST run the script-inventory match in CI: every third-party host in the built HTML is named in the privacy statement, and every storage API call is listed. | Statement drift is silent; this is the fleet's existing grimoire pattern. | MUST | `sh check.sh <dist> <dist>/privacy/index.html` where check.sh is `grep -rhoE '<(script\|link\|img\|iframe)[^>]+(src\|href)="https?://[^"/]+' "$B" --include=*.html \| grep -oE 'https?://[^"/]+' \| sort -u`, each host looked up in the statement, plus `grep -rnoE 'document\.cookie\|localStorage\|sessionStorage\|indexedDB' "$B"`. Any `UNDECLARED host` fails. Known gap: hosts loaded by `import()` or at run time. |
| MEAS-CF-10 | MUST self-host the analytics script and endpoint, or name the third-party host, for any tool used. | A script fetched from a vendor CDN is a third-party request on every page view (observed: Matomo `cdn.matomo.cloud`, Fathom `cdn.usefathom.com`). | MUST | Same grep as MEAS-CF-09 shows the host; prefer a path on the project's own domain. |
| MEAS-CF-11 | MUST label a daily-salt "visitors" metric as "daily visitors" or "visitors (per-day, summed over the range)", and MUST NOT report a multi-day total as people, as unique people, or as new-versus-returning. | The identifier resets daily (Plausible, Fathom) so a returning person is counted again. | MUST | Reading heuristic on any report, README badge or page claim. Fail: "12,400 unique visitors this month" from a daily-salt tool. Pass: "12,400 daily visitors summed over 30 days (a person visiting on 5 days counts 5 times)". `rg -n -i 'unique visitors\|monthly users\|returning visitors'` in reports: each hit needs the caveat within two lines. |
| MEAS-CF-12 | SHOULD compare only page views, referrers and same-day visitors across weeks; MUST NOT compute retention or cohort metrics from a daily-salt tool. | Cross-day identity does not exist in the data. | SHOULD | Report template review: any "retention", "cohort", "returning", "lifetime" metric on a Plausible or Fathom source fails. |
| MEAS-CF-13 | MUST NOT claim a regulator evaluated or approved a tool unless the regulator's own page names it for that configuration and version. | The CNIL hosts a Matomo configuration guide and ended an evaluation programme; no German or UK regulator names any tool. | MUST | Fail: "CNIL-approved analytics". Pass: a link to the CNIL page that names the tool and version, with its date. |
| MEAS-CF-14 | MUST NOT write any rule, page copy or compliance claim that treats the Digital Omnibus audience-measurement exemption as law. | The proposal is awaiting committee decision (OEIL, fetched 2026-11-27). | MUST | `rg -n -i 'omnibus\|88a' docs/ privacy*` hits must say "proposed". Law row: Digital Omnibus [2025/0360(COD)](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD)) (COM(2025)0837, published 2025-11-19, [Commission news](https://commission.europa.eu/news-and-media/news/simpler-digital-rules-help-eu-businesses-grow-2025-11-19_en)), proposed, fetched 2026-11-27, refresh_by 2027-02-27 (legislative file moving; sooner than 6 months). |
| MEAS-CF-15 | SHOULD pin the analytics SDK and script version and record it beside the measurement result. | Behaviour of cookieless modes changed across versions (PostHog 1.200.0 vs 1.455.4). | SHOULD | `rg -n 'posthog-js@\|matomo.js\|script.js' package.json src/`; a floating `latest` or unversioned URL fails. |
| MEAS-CF-16 | MUST NOT record UTM or other campaign parameters, or the full referrer URL, on a site that relies on the French consent exemption; strip them in the tracker (Matomo: `setCustomUrl` without the query string, `setReferrerUrl` with the origin only). Attribution by UTM is an owner decision with a consent route. | The CNIL self-evaluation tool requires disabling UTM and campaign identifiers in URLs and limiting the referrer to the host, and excludes acquisition-channel measurement. Measured: Plausible, Fathom and Matomo send both by default. | MUST | Playwright HAR of a load with `?utm_source=x&utm_campaign=y` and a path-bearing referer: no request body or query contains `utm_`, and `urlref` or `r` has no path. Fail: any `utm_` string in a beacon. |
| MEAS-CF-17 | MUST apply the per-tool check of section 7.1 before an agent writes "consent-free" for a tool; a tool with any FAIL cell is "consent required" in the copy. | The tools differ on measured and documented criteria; none of Plausible, Fathom or PostHog `always` passes as shipped. | MUST | Read the 7.1 table row for the tool and version; the copy says "consent-free in France with configuration X" or "consent required". Fail: "cookieless therefore no banner". |

## What an agent must not decide alone

- Whether to measure at all, and whether to accept a banner, a cookieless tool or no tool (business and legal).
- Which jurisdictions the audience is in; a German audience changes the default to consent.
- Whether a vendor's hashing counts as meeting the CNIL's "truncate the last byte" (needs counsel, section 7).
- Whether a daily-salt hash is personal data under GDPR for the project's DPA and records of processing.
- The text of the lawful basis and the privacy statement's legal wording (agent may draft the inventory table; the owner approves the words).
- Any claim to a regulator, customer or procurement form that the site is "compliant".
- Whether to use a third-party host or self-host, and where the data is stored.
- Whether to record UTM tags or referrers at all: in France that needs consent (MEAS-CF-16); the choice between losing channel attribution and adding a consent route is the owner's.
- Whether a hash of IP and user agent sits inside UK Schedule A1 para 5 given para 5(2) (section 7.2): a counsel question.

## AI-agent angle

| Typical error | Smallest mechanical check |
|---|---|
| Adds a Plausible or Google Analytics snippet to a layout "to track visits", with no ask. | MEAS-CF-01 grep on the diff. |
| Writes "cookieless means no consent needed" as fact. | MEAS-CF-02 reading heuristic; grep for "no consent needed\|GDPR compliant" near a tool name. |
| Uses old cookie banner defaults ("analytics cookies need opt-in everywhere"), missing the UK exception since 2026-02-05. | Law row dates in the rule file; reviewer checks the UK rule cites Schedule A1 para 5. |
| Assumes the Digital Omnibus already removed the banner duty. | MEAS-CF-14. |
| Sets PostHog `cookieless_mode: 'always'` and `identify()` together. | MEAS-CF-06 grep. |
| Reports "unique visitors" from a weekly chart as people. | MEAS-CF-11 grep. |
| Leaves "no analytics" in the privacy page after adding a tool, or adds a tool and an older cached privacy page. | MEAS-CF-09 CI check. |
| Counts localhost in tests and concludes the tool sends nothing (Plausible skips localhost). | MEAS-CF-07 uses the vendor's local-test script variant and records the version. |

## Contested / evolving

- Do storage-free hashed counters need consent? Vendors say no ([Plausible](https://plausible.io/data-policy), [Fathom](https://usefathom.com/data)). The EDPB says a client-side script that makes the browser send an identifier is "gaining access" and Article 5(3) applies (para 63), then leaves the exemption question to each state (para 56). Germany's DSK declines a general finding (Rn. 89) and the BfDI says a counting pixel needs consent. The CNIL says most large offerings fail the exemption regardless of configuration but allows a configured exemption. Sources agree only that the answer is per-configuration.
- DSK versus BfDI on counters: DSK Rn. 88 describes a log-based count or a simple counter of the directly called service as sufficient without further user data; the BfDI page treats a counting pixel as consent-requiring. Treat any pixel as consent-requiring in Germany.
- Digital Omnibus direction: the Commission proposal frames audience measurement by media service providers as low-risk ([Commission FAQ](https://digital-strategy.ec.europa.eu/en/faqs/digital-package)); the EDPB-EDPS joint opinion and some member states argued over scope in secondary reports (not opened: unverified). Trend as of 2026-11-27: still in the Parliament committee stage per OEIL; Council mandate reported for 21 October 2026 (primary page returned 403: unverified). Re-check by 2027-02-27.
- UK para 5(2): the statute excludes information the terminal emits automatically from the exception, while regulation 6(2)(b) counts collecting it as access; whether cookieless IP and user-agent hashing is therefore outside the exception cannot be settled from the statute alone, and the ICO page returned 403 ([Sch. A1](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1)). Both readings are open.
- UK: the statutory exception exists; ICO guidance wording could not be fetched (403), so how the ICO reads "sole purpose" for vendor-hosted tools is unverified. Re-check.

## Dated facts

Fetch date for every row: 2026-11-27. "Status" uses the commission's words.

| Item | Provision | Status | Source and its date | Type | refresh_by |
|---|---|---|---|---|---|
| Consent for terminal storage/access in Germany | TDDDG §25(1)-(2) | in force | [gesetze-im-internet.de](https://www.gesetze-im-internet.de/ttdsg/__25.html), no Stand shown | authority (official text) | 2027-05-27 |
| UK PECR regulation 6 | Reg. 6(1)-(2) as substituted | in force from 2026-02-05 | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6) | authority | 2027-05-27 |
| UK statistical purposes exception | PECR Sch. A1 para 5 | in force from 2026-02-05 | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1) | authority | 2027-05-27 |
| Commencement of DUAA s.112 and Sch. 12 | S.I. 2026/82 reg. 2(w), 2(z13), made 2026-01-29 | commenced 2026-02-05 | [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2026/82/made) | authority | 2027-05-27 |
| Art. 5(3) technical scope guidance | EDPB Guidelines 2/2023 v2.0 | final, adopted 2024-10-07 | [EDPB](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en) | authority | 2027-05-27 |
| CNIL exemption conditions (7) | CNIL sheet 16 | regulator guidance, page date 2020-06-11 | [CNIL](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) | authority | 2027-05-27 |
| CNIL retention 25 months, tracker about 13 months | CNIL French page | recommendation, page updated 2025-07-04 | [CNIL](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience) | authority | 2027-05-27 |
| German regulators' position on audience measurement | DSK OH Digitale Dienste v1.2 Rn. 87-91 | regulator guidance, Stand November 2024 | [DSK](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) | authority | 2027-05-27 |
| Digital Omnibus | COM(2025)0837, 2025/0360(COD) | proposed; "Awaiting committee decision" | [OEIL](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD)) | authority | 2027-02-27 |
| CNIL self-evaluation tool (criteria: no UTM, referrer host only, nearest ten, opt-out link) | CNIL "Outil d'auto-évaluation", July 2025 | regulator guidance, document dated 2025-07-03 | [CNIL PDF](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) | authority | 2027-01-27 |
| CNIL Matomo configuration guide | 6-page guide hosted on cnil.fr, no date in text | vendor-written, regulator-hosted | [CNIL PDF](https://www.cnil.fr/sites/cnil/files/atoms/files/matomo_analytics_-_exemption_-_guide_de_configuration.pdf) | vendor data | 2027-01-27 |
| UK statistical exception text incl. para 5(2) | PECR Sch. A1 para 5(1)-(3); reg. 6(2)(b) | in force from 2026-02-05 | [Sch. A1](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1), [reg. 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6) | authority | 2027-05-27 |
| Plausible identifier and storage claims | data policy | vendor claim, "Last updated: November 2026" | [Plausible](https://plausible.io/data-policy) | vendor data | 2027-02-27 |
| Plausible visitor definition | metrics definitions | vendor claim, updated 2026-11-26 | [Plausible docs](https://plausible.io/docs/metrics-definitions) | vendor data | 2027-02-27 |
| Fathom hashing and salt | data page | vendor claim, no date | [Fathom](https://usefathom.com/data) | vendor data | 2027-02-27 |
| PostHog cookieless modes | docs | vendor claim, no date | [PostHog](https://posthog.com/docs/privacy/data-collection) | vendor data | 2027-02-27 |
| Matomo consent-free settings | FAQ | vendor claim, no date | [Matomo](https://matomo.org/faq/new-to-piwik/how-do-i-use-matomo-analytics-without-consent-or-cookie-banner/) | vendor data | 2027-02-27 |

Unverified, omitted (no rule row): ICO guidance text; Council press release of 2026-10-21 and the Council mandate text; EUR-Lex text of Article 88a in COM(2025) 837; the CNIL evaluation list page naming tool versions; any Parliament position; GDPR Article 13 text (EUR-Lex returned empty).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications | CNIL sheet 16, primary | 2020-06-11 | The seven conditions |
| https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf | CNIL self-evaluation tool, primary | 2025-07 | Detailed criteria incl. UTM, referrer, opt-out |
| https://www.cnil.fr/sites/cnil/files/atoms/files/matomo_analytics_-_exemption_-_guide_de_configuration.pdf | CNIL-hosted Matomo guide, vendor-written | undated | Config steps |
| https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience | CNIL French page, primary | updated 2025-07-04 | Retention 25 months, no cross-site identifier |
| https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en | EDPB document page, primary | v2.0, 2024-10 | Final status |
| https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf | EDPB guidelines text, primary | adopted 2024-10-07 | Paras 47-56, 61-63 |
| https://www.gesetze-im-internet.de/ttdsg/__25.html | TDDDG §25, primary | current at fetch | German rule |
| https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf | DSK guidance v1.2, primary | 2024-11 | Rn. 87-91 on audience measurement |
| https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/Z%C3%A4hlpixel.html | BfDI page, primary | undated | Counting pixel needs consent |
| https://www.legislation.gov.uk/uksi/2003/2426/regulation/6 | PECR reg. 6, primary | 2026-02-05 version | Current text and amendment note |
| https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1 | PECR Sch. A1, primary | 2026-02-05 version | Statistical purposes exception |
| https://www.legislation.gov.uk/uksi/2026/82/made | Commencement regulation, primary | made 2026-01-29 | Commencement date |
| https://commission.europa.eu/news-and-media/news/simpler-digital-rules-help-eu-businesses-grow-2025-11-19_en | Commission news, primary | 2025-11-19 | Proposal status |
| https://digital-strategy.ec.europa.eu/en/faqs/digital-package | Commission FAQ, primary | 2025-11-20 | "Whitelist" for audience measurement |
| https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD) | Parliament procedure file, primary | fetched 2026-11-27 | Stage reached |
| https://plausible.io/data-policy | Vendor policy | 2026-11 | Daily salt, storage claims |
| https://plausible.io/docs/metrics-definitions | Vendor docs | 2026-11-26 | Visitor definition |
| https://usefathom.com/data | Vendor page | undated, 2026 | Hash and salt behaviour |
| https://posthog.com/docs/privacy/data-collection | Vendor docs | undated | `cookieless_mode` values |
| https://matomo.org/faq/new-to-piwik/how-do-i-use-matomo-analytics-without-consent-or-cookie-banner/ | Vendor FAQ | undated, 2026 | Settings and German caveat |

Measurement artifacts (local, not published): `~/.cache/research-lang/exemplars/product/mcf-measure/` holds `run.py`, `run2.py` (UTM and referrer run), `site/matomo_strip.html`, `site/*.html`, `har/*.har`, `check.sh`, and the extracted guideline texts.
