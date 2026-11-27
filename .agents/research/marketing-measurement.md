---
title: Measurement and attribution - what a project may measure, how it tags, and what it may claim from the numbers
topic: marketing-measurement
program: product
sub_program: marketing
date: 2026-11-27
model: opus
id_family: MKT-MEAS
consolidates:
  - marketing-measurement/measure-consent-free-config.md
  - marketing-measurement/measure-attribution-tagging.md
  - marketing-measurement/measure-metric-validity.md
grounding:
  - product-audit/distribution-posture.md
  - product-audit/site-shape.md
  - product-audit/config-inventory.md
revised: 2026-11-27
---

# Measurement and attribution

This is research, not legal advice. Every row that rests on law carries its provision, its status and its fetch date (2026-11-27) in the sub-artifact it cites. Where this file names a law fact, it names the sub-artifact section that holds the primary URL.

## Contents

1. [Verdict](#verdict)
2. [Conflicts resolved](#conflicts-resolved)
3. [The ruleset](#the-ruleset)
4. [Applied to the fleet](#applied-to-the-fleet)
5. [AI-agent failure modes](#ai-agent-failure-modes)
6. [What an agent must ask a human](#what-an-agent-must-ask-a-human)
7. [Decay](#decay)
8. [Open questions](#open-questions)
9. [Sub-artifacts](#sub-artifacts)
10. [Key sources](#key-sources)
11. [Revision log](#revision-log)

## Verdict

1. **"Cookieless" is a storage fact. It is not a consent fact.** EDPB Guidelines 2/2023 para 63 says client-side code that makes the browser send an identifier counts as gaining access, and Article 5(3) ePrivacy applies ([EDPB PDF, adopted 2024-10-07](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)). Whether consent is needed then depends on a national exemption. No regulator in France, Germany or the UK names Plausible or Fathom as consent-free. Their "no banner" statements are vendor claims ([consent-free-config, Summary and section 6](marketing-measurement/measure-consent-free-config.md#summary)).
2. **The fleet stance "measure without cookies or do not measure" becomes "measure server-side, or do not measure".** The fleet serves a German audience. The German regulators (DSK) decline to call any audience measurement consent-free, and allow only log counting without personal data, or a plain counter of the service itself (DSK Rn. 87-89). The federal commissioner (BfDI) says a counting pixel needs consent ([consent-free-config section 3](marketing-measurement/measure-consent-free-config.md#3-germany-tdddg-25-and-the-dsk-guidance)). So no browser script ships by default. That includes the "privacy-friendly" ones.
3. **What the fleet may measure today, with no owner decision:** the GitHub traffic API (14-day window, must be snapshotted), GitHub star counts from the count and history endpoints, binary-only release-asset download counts, registry download counts (npm, PyPI, crates.io), and the Discord member count. None of these measures people. Each is printed under its own definition (MKT-MEAS-13..17).
4. **A browser script is an owner decision, never an agent default.** The only configuration that passed every measured check is self-hosted Matomo with cookies off and with the URL and referrer stripped. That passes in France only. It is unresolved in the UK, because Schedule A1 para 5(2) excludes information the terminal emits automatically, and it needs consent in Germany ([consent-free-config 7.2](marketing-measurement/measure-consent-free-config.md#72-decision-allowed-tools-and-configurations-per-jurisdiction)).
5. **Attribution tags follow the collector.** No collector in the fleet records UTM parameters, so the default is to post the bare canonical URL. When an owner-approved collector records them, tags follow one closed, lower-case convention. They go only on links that the team places on surfaces it does not host. They never go on links to the fleet's own hosts.
6. **Self-reported attribution ("how did you hear about us", HDYHAU) is a companion signal.** Nobody builds a form to collect it. If a form exists for another reason, it gets one optional free-text field, and its answers are reported apart from click data.
7. **Every number states five fields: name, definition, source, window and as-of date.** Stars, clones, views, downloads, AI citations and daily-unique visits never stand for users, installs or adoption.
8. **No A/B test is worth running on any fleet surface.** A 10% relative lift at a 5% baseline needs about 31,000 visitors per arm, which takes 1,785 to 3,288 weeks at measured traffic (843 to 1,553 weeks at a 10% baseline). Ship the change and observe instead ([metric-validity section 7](marketing-measurement/measure-metric-validity.md#7-measurements-run-2026-11-27-utc)).
9. **The catalog contradicts itself and must be fixed.** `docs-instrument` and DOC-OBS-16 present Plausible, Umami, GoatCounter and Fathom as "privacy-preserving page analytics" with no consent gate. They must defer to MKT-MEAS-01..04 (see [Applied](#applied-to-the-fleet), row V1).

## Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| C1 | The attribution dive calls Plausible "the cookieless tool the fleet's stance favours" and writes rules against Plausible's parameter keep-list. The consent dive measured that Plausible and Fathom, as shipped, send the full URL with `utm_*` and the full referrer. Both fail the CNIL criteria, and in Germany any script needs consent. | No tool is favoured. The default is no script (MKT-MEAS-01, -03). The Plausible keep-list survives only as a tag-format constraint that applies once an owner approves a collector (MKT-MEAS-10). | The consent dive measured what the browser sends (HAR, 2026-11-27). The attribution dive relied on vendor pages and did not test consent. A measurement beats a vendor claim. |
| C2 | The attribution dive decided to tag every link placed off-site. The consent dive found that recording UTM or campaign identifiers is excluded from the French exemption (the CNIL self-evaluation tool, July 2025) and is an owner decision elsewhere. | Write tags only when an approved collector records them (MKT-MEAS-08). Otherwise post the bare canonical URL. | With no collector, a tag is read by nothing. It costs URL clarity and leaks a campaign name into third-party logs. Its yield is zero. Once a collector exists, the decision to record tags is part of the MKT-MEAS-01 owner decision, because it changes the consent route. |
| C3 | Three names for one quantity: "daily visitors" (consent dive), "daily-unique visits" (metric dive), and "visitors (per-day, summed over the range)". | One term, "daily-unique visits", for any window longer than one day (MKT-MEAS-16). | One term per thing makes the check a grep. |
| C4 | The metric dive sets no threshold below which a number is hidden. The CNIL self-evaluation tool requires reports rounded to the nearest ten, or an anonymity analysis. | No hide threshold for counts of public aggregate data (stars, registry downloads, GitHub traffic). The nearest-ten rule binds only reports from a tool that runs on the French exemption (MKT-MEAS-04). | The CNIL criterion covers audience-measurement tool output, not a public API count. Mixing them would hide true small numbers for no legal gain. |
| C5 | The internal-link UTM ban rests on a Plausible statement, and the GA4 pages read are silent on it. | Keep it as a MUST (MKT-MEAS-09). | The mechanism (session-start attribution) is shared by every tool that attributes by session. A tagged owned link also creates a duplicate URL for canonical and sharing. The rule costs nothing to follow. |
| C6 | The fleet copies of DOC-OBS-16 say `traffic/views` "must return 200". The catalog's newer DOC-OBS-16 adds a sample at least every 14 days. | Snapshot at least every 14 days, weekly preferred, to a file (MKT-MEAS-17). No figure for a span with no snapshot. | GitHub keeps traffic data 14 days ([GitHub traffic docs](https://docs.github.com/en/rest/metrics/traffic)). A one-off 200 proves nothing about any span. |
| C7 | HDYHAU: Recast and Outbrain say make it required. RevenueCat treats it as qualitative and does not require it. | Optional free text by default. "Required" is an owner decision (MKT-MEAS-12). | All four sources are vendors with an interest in the topic. Required fields trade completeness for form friction, which is a business call. Free text avoids the order and missing-option biases. |
| C8 | The metric dive's A/B gate uses "8 weeks" as a window. No source sets that number. | Keep 8 weeks as a labelled house default inside the gate (MKT-MEAS-18). The sourced part is n = duration x traffic. | The fleet is short by three orders of magnitude, so the default does not change any current verdict. |

## The ruleset

Severity: MUST, SHOULD or CONSIDER. "Rests on" names each platform or law fact, with its source, its date and how to re-check it.

### Collection: what may run at all

**MKT-MEAS-01 (MUST).** Add no analytics script, pixel, SDK, beacon or campaign-parameter collector to a site, docs site, app or CLI without a recorded owner decision. The decision names: the tool and its version, its host, the jurisdictions served, the consent route, and whether acquisition data (UTM tags, referrer paths) is collected.
- Why: every row of the law table turns on facts only the owner knows, and the fleet default is zero scripts.
- Verify: run `rg -n -i --glob '*.{html,astro,js,ts,mjs,cjs,jsx,tsx,vue,svelte,json,toml,yaml,yml}' 'plausible\.io/js|data-domain=|usefathom\.com|posthog-js|i\.posthog\.com|matomo\.js|piwik\.js|_paq\.push|cloud\.umami\.is|umami\.js|data-website-id=|googletagmanager\.com|google-analytics\.com|gtag\(|gc\.zgo\.at|goatcounter\.com/count|clarity\.ms|static\.hotjar\.com|cdn\.segment\.com|@segment/analytics|cdn\.mxpnl\.com|mixpanel-browser|@amplitude/|cdn\.amplitude\.com|cloudflareinsights\.com'` on the changed files. The pattern matches only script hosts, collector attributes and SDK package names, so prose in Markdown never trips it. Pass: no hit, or every hit's tool name appears in the decision record (for example `rg -i -q '<tool>' .agents/decisions/measurement.md` succeeds). Fail: any other hit. Run 2026-11-27 over the source trees of the fleet's sites and MkDocs repositories (dist and node_modules excluded): 0 hits. Known gap: a self-hosted collector at a custom path. Catch it with the MKT-MEAS-05 HAR and the MKT-MEAS-06 inventory. Also fill no empty analytics placeholder, such as a `<!-- Setup Google Analytics -->` block.

**MKT-MEAS-02 (MUST).** Never write "cookieless", "privacy-friendly" or a vendor's "no banner needed" as a legal conclusion. Write it as "the vendor states". Write "consent-free" only for a tool, version and configuration that passed the per-jurisdiction table. Never claim that a regulator approved a tool unless the regulator's own page names that tool and version. Never treat the Digital Omnibus audience-measurement carve-out as law.
- Why: the vendor pages are not regulators. The CNIL ended its evaluation list. The Omnibus (COM(2025)0837, procedure 2025/0360(COD)) showed "Awaiting committee decision" on 2026-11-27.
- Verify: two greps over `docs/ src/ privacy*`, each of which must print nothing.
  - `rg -n -i 'gdpr[- ]compliant|no (cookie )?banner|consent[- ]free|cnil[- ]approved|cookieless|privacy[- ](friendly|preserving)' docs/ src/ privacy* | rg -v -i '\b(states|claims|according to)\b|decisions/measurement\.md'`. A surviving line is an unattributed legal conclusion. Pass: the same line attributes the claim ("Plausible states ...") or links the decision record.
  - `rg -n -i 'omnibus' docs/ src/ privacy* | rg -v -i 'propos'`. A surviving line treats the Omnibus as law. Pass: the same line says "proposed" or "proposal".
  - The check is line-scoped. Keep one sentence per line in Markdown sources, or the attribution word may sit on a different line from the claim.
- Rests on: [OEIL 2025/0360(COD)](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD)), fetched 2026-11-27. Re-check the stage field on that page.

**MKT-MEAS-03 (MUST).** Where the audience includes Germany, load no client-side measurement script and no counting pixel before consent. The consent-free form is server-side counting without personal data, with no script. Treat Germany as served unless the owner's decision record says otherwise.
- Why: DSK Rn. 88-89 allows log counting and declines a general consent-free finding for anything else. The BfDI says a counting pixel needs consent.
- Verify: four checks, each with a fixed pass condition.
  - External scripts: `rg -oN --no-filename '<script[^>]+src="https?://[^"/]+' dist/ -g '*.html' | grep -oE 'https?://[^"/]+$' | sort -u` minus the allowed-hosts list in the decision record prints nothing. With no decision record the allowed list is empty, so any external script host fails.
  - Same-origin scripts, build against live: `diff <(rg -oN --no-filename '<script[^>]+src="/[^"]*' dist/ -g '*.html' | sed 's/.*src="//' | sort -u) <(for u in <one live URL per page type>; do curl -s "$u"; done | grep -oE '<script[^>]+src="/[^"]*' | sed 's/.*src="//' | sort -u)` prints nothing. A line only on the live side is a script the host or CDN injects (V4 is one: `/cdn-cgi/scripts/.../email-decode.min.js`). Each such line fails until the decision record names it.
  - Inline beacons: `rg -n 'navigator\.sendBeacon|/api/event|/matomo\.php|/collect\?|/j/collect|_paq\.push|gtag\(' dist/ -g '*.{html,js}'` prints nothing. Run 2026-11-27 over the ocx.sh and grimoire.rs builds: 0 hits.
  - Pixels: `rg -n '<img[^>]+(width|height)="1"' dist/ -g '*.html'` prints nothing.
  - Any counting job reads server-side data only.
- Rests on: [TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html) (in force); [DSK OH Digitale Dienste v1.2](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf) Rn. 87-91 (Stand November 2024); [BfDI Zählpixel](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/Z%C3%A4hlpixel.html) (undated); all fetched 2026-11-27. Re-check: a new DSK version number or a new BfDI page.

**MKT-MEAS-04 (MUST).** When a site relies on a consent exemption, meet every condition of that exemption.
- France: all seven conditions of CNIL sheet 16 and every criterion of the CNIL self-evaluation tool. That means a tracker lifetime of at most 13 months, retention of at most 25 months, the IP truncated by at least the last octet, an opt-out link on the privacy page, no User ID, no e-commerce data, no session replay or heatmaps, page views only, reports rounded to the nearest ten, no UTM or campaign identifiers, and the referrer cut to the host (Matomo: `setCustomUrl(origin+pathname)`, `setReferrerUrl(referrerOrigin + "/")`).
- UK (PECR Schedule A1 para 5): usage statistics only, used to improve the service; data shared only to make those improvements; the purpose stated; a working, free opt-out. Do not rely on para 5 for a hash of IP address and user agent until counsel confirms, because para 5(2) excludes automatically emitted information.
- Why: each exemption holds only if every condition holds.
- Verify: diff the tool configuration against the list. Then test with a HAR (MKT-MEAS-05) while loading `?utm_source=x&utm_campaign=y` with a referer that has a path. No beacon may contain `utm_`, and the referrer field may hold no path. After setting the opt-out, a reload must send no beacon.
- Rests on: [CNIL sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) (page date 2020-06-11); [CNIL self-evaluation tool](https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) (July 2025); [PECR Sch. A1](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1), in force since 2026-02-05 under [S.I. 2026/82](https://www.legislation.gov.uk/uksi/2026/82/made); all fetched 2026-11-27. Re-check: the CNIL page dates; the legislation.gov.uk "changes to legislation" banner.

**MKT-MEAS-05 (MUST).** After wiring any measurement tool, measure what it does.
- Load each page type headless and record a HAR.
- For a tool sold as cookieless, assert zero cookies and zero entries in localStorage, sessionStorage and IndexedDB.
- Assert what each beacon carries: page URL, referrer, query string.
- Pin the SDK or script version and record it beside the result.
- Why: vendor modes change between versions. PostHog 1.200.0 wrote storage under `cookieless_mode: 'always'` and 1.455.4 did not. Plausible, Fathom and Matomo all sent `utm_*` and the full referrer by default. Plausible sends nothing from `localhost` unless its local script variant is used.
- Verify: a Playwright check where `await ctx.cookies()` is empty and `page.evaluate('Object.keys(localStorage).length+Object.keys(sessionStorage).length')` equals 0, plus a grep of the HAR for `utm_`. A floating `latest` or an unversioned script URL fails.

**MKT-MEAS-06 (MUST).** Make the privacy statement match the shipped inventory, and check it in CI against the built output and against the live deployed page.
- The statement names every third-party host the page loads, every storage key it writes, and, for each measurement tool, its host, what it sends, its retention and its opt-out.
- The statement changes in the same commit that adds the tool.
- Why: France, Germany and the UK all begin with information to the visitor. A stale "no analytics" line makes the statement false. A CDN can inject scripts that the build never contains.
- Verify: `grep -rhoE '<(script|link|img|iframe)[^>]+(src|href)="https?://[^"/]+' "$DIST" --include=*.html | grep -oE 'https?://[^"/]+' | sort -u`. Look up each host in the statement; any host not named fails. Add `grep -rnoE 'document\.cookie|localStorage|sessionStorage|indexedDB' "$DIST"` and compare against the listed keys. Repeat over `curl -s <live URL>` for each page type. Known gap: hosts loaded by `import()` or at run time. Catch those with the MKT-MEAS-05 HAR.

**MKT-MEAS-07 (MUST).** Never configure PostHog `cookieless_mode: 'always'` where a visitor-level opt-out must be honoured. Never call `identify()` or `alias()` with it.
- Why: the vendor documents that `always` ignores opt-out calls, and an opt-out is a condition in both the CNIL and the UK tests.
- Verify: `rg -n "cookieless_mode" src/` together with `rg -n "identify\(|alias\(|opt_out_capturing"`. A repository with `'always'` plus an opt-out user interface, or plus `identify(`, fails.
- Rests on: [PostHog data collection docs](https://posthog.com/docs/privacy/data-collection), vendor data, undated, fetched 2026-11-27. Re-check the `cookieless_mode` section.

### Attribution tagging

**MKT-MEAS-08 (MUST).** Write UTM or other attribution parameters on a link only when an owner-approved collector (MKT-MEAS-01) records them on the target. Otherwise use the bare canonical URL.
- Why: with no collector, a tag is read by nothing. It leaks a campaign name into third-party logs, and in France recording it needs consent (conflict C2).
- Verify: if `rg -n 'utm_[a-z]+=' <drafts, posts, email templates>` returns a hit, the decision record must say acquisition data is collected.

**MKT-MEAS-09 (MUST NOT).** Put no UTM or attribution parameter on any link whose target is a host the project owns. This covers nav, footer, cards, docs cross-links, READMEs, release notes, package metadata, sitemaps, `rel=canonical` and `og:url`.
- Why: Plausible documents that an internal UTM overwrites the visit's original source and the visit shows as Direct. A tagged owned URL is also a duplicate URL.
- Verify: `rg -n 'href="[^"]*[?&](utm_[a-z]+|ref|source)=' <site src> <dist>` and `rg -n '\]\([^)]*utm_[a-z]+=' -g '*.md' -g '*.mdx'` return nothing that points at an owned host.
- Rests on: [Plausible UTM guide](https://plausible.io/blog/utm-tracking-tags), vendor data, updated 2026-11-12. The GA4 pages read are silent (C5).

**MKT-MEAS-10 (MUST).** Write every tag in one closed format.
- Values use lower case `a-z`, `0-9`, `-` and `_` only.
- `utm_source`, `utm_medium` and `utm_campaign` always appear together.
- `utm_medium` comes from the set `social`, `email`, `video`, `referral`, `affiliate`, `cpc`, `paid-social`. Never write `ai-assistant`, which GA4 assigns itself.
- `utm_source` is a platform or list name with no TLD and never a person's handle: `linkedin`, `youtube`, `hn`, `newsletter`.
- `utm_campaign` is `<topic>-<yyyymm>` or `<topic>-<release>`, at most 40 characters (a house limit).
- `utm_content` is the only per-link differentiator. `utm_term` is for paid keywords only.
- Invent no parameter such as `?from=`, `?src=` or `?campaign=`.
- Why: GA4 and Plausible values are case sensitive and split rows. GA4 channel rules key on the medium words, and unknown mediums land in Unassigned. Plausible strips every parameter except `ref`, `source`, the five UTMs, `gclid` and `msclkid`.
- Verify: `python3 -I -c 'import sys,re,urllib.parse as u;M={"social","email","video","referral","affiliate","cpc","paid-social"};bad=0
for l in sys.stdin:
 for url in re.findall(r"https?://[^\s\"<>)]+utm_[^\s\"<>)]+",l):
  q=u.parse_qs(u.urlsplit(url).query);k={x:q.get(x,[""])[0] for x in ("utm_source","utm_medium","utm_campaign")}
  ok=all(k.values()) and k["utm_medium"] in M and all(re.fullmatch(r"[a-z0-9_-]+",v) for v in k.values()) and "." not in k["utm_source"] and len(k["utm_campaign"])<=40 and set(q)<= {"utm_source","utm_medium","utm_campaign","utm_content","utm_term","ref"}
  bad+=not ok; print(("ok  " if ok else "BAD ")+url)
sys.exit(bad>0)' < campaigns.csv`
- Rests on: [GA4 URL builders](https://support.google.com/analytics/answer/10917952) and [GA4 default channel group](https://support.google.com/analytics/answer/9756891) (undated; Google states that its lists are reviewed at least yearly); [Plausible parameter handling](https://plausible.io/docs/stop-tracking-utm-tags) (vendor, undated); all fetched 2026-11-27. Re-check: the medium regexes on the channel-group page and the Plausible keep-list.

**MKT-MEAS-11 (SHOULD).** Keep one campaigns file per project (CSV or YAML) that lists each tagged URL with its source, medium, campaign, content, date, owner and the post it sits in. Read it before creating a tag.
- Why: it prevents variant spellings and reused campaign names, which neither tool can enforce.
- Verify: the format check is MKT-MEAS-10, run over this file. This rule adds the check that MKT-MEAS-10 cannot make, which is across rows. With columns `url,source,medium,campaign,content,date,owner,post`, run `python3 -I -c 'import csv,sys,re,collections as c
r=list(csv.DictReader(open(sys.argv[1])));v=c.defaultdict(set);k=c.Counter((x["source"],x["medium"],x["campaign"],x["content"]) for x in r)
for x in r:v[re.sub(r"[-_]","",x["campaign"].lower())].add(x["campaign"])
bad=[sorted(s) for s in v.values() if len(s)>1]+[t for t,n in k.items() if n>1];print(*bad,sep="\n");sys.exit(bool(bad))' campaigns.csv`. It exits 1 when two spellings of one campaign name exist (`launch-202611` and `Launch_202611`) or when one source, medium, campaign and content tuple is reused for two rows. Pass: exit 0. Tested 2026-11-27 on a three-row sample with one variant spelling: exit 1, as expected.

**MKT-MEAS-12 (SHOULD; vendor-sourced, low confidence).** Build no sign-up, trial or contact form in order to collect "how did you hear about us" (HDYHAU). Where such a form exists for another reason, add one optional free-text HDYHAU field and store the raw string. Report the answers apart from tagged-click numbers: never sum the two, and never rank channels by HDYHAU alone.
- Why: HDYHAU records perception and recall. Every source read (RevenueCat, Recast, Outbrain) is a vendor with a commercial interest in the topic, and they agree it over-reports familiar channels ([attribution-tagging section 6](marketing-measurement/measure-attribution-tagging.md#6-self-reported-attribution-hdyhau)). No independent study was found, so confidence is low. Re-check for one before raising the severity.
- Verify: `rg -n -i -A6 'how did you hear|heard about us|hdyhau' -g '*.{html,astro,jsx,tsx,vue,svelte}' <site src> | rg -i '<select|\brequired\b'` prints nothing, unless the decision record makes the field required. A surviving line is a select list or a required field. The fleet ran 0 files matching "how did you hear" on 2026-11-27 (attribution-tagging, fleet measurement table). The report half is a reading check, not a computed one: HDYHAU answers and click numbers sit in separate rows and are never summed.

### Claims: what a report or page may say

**MKT-MEAS-13 (MUST).** Print five fields beside every metric written into a report, README, page or dashboard: name, definition, source (the command or endpoint), window and as-of date.
- Label vendor-measured figures, for example "Ahrefs, vendor data, 2026-10-29".
- A channel breakdown also states the tool, the attribution model if GA4 (data-driven or last click), and the share of `(direct)` and `(not set)`.
- Write no figure from memory, and no claim about a platform's behaviour without a primary source.
- Safari, as the worked case: claim nothing about how Safari changes UTM attribution. WebKit documents query-parameter stripping only in Private Browsing, and in regular browsing only when the user enables advanced tracking and fingerprinting protection. It keeps campaign-only parameters and names no stripped parameter ([WebKit, Private Browsing 2.0, 2024-07-16](https://webkit.org/blog/15697/private-browsing-2-0/)). The Safari 26.0 post names no stripped parameter either. It says only that known fingerprinting scripts can no longer read query parameters and `document.referrer` ([WebKit, Safari 26.0, 2025-09-15](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Both fetched 2026-11-27 ([attribution-tagging section 5](marketing-measurement/measure-attribution-tagging.md#5-safari-26-and-parameter-stripping-record-of-what-the-pages-state)). A report that must mention Safari cites both posts and says the behaviour is only partly documented. "Safari 26 strips UTMs" and "Safari keeps UTMs" both fail.
- Why: dropped windows and denominators are the main agent failure. A figure with no date cannot be corrected later. This extends DOC-OBS-08 from docs metrics to marketing metrics.
- Verify: a regex for a figure followed by `(downloads|stars|visits|visitors|users|clones|views|citations)` with no `20[0-9]{2}-[0-9]{2}` date in the same sentence or table row fails. Metric tables carry `source`, `window` and `as_of` columns. `rg -n -i 'safari' <reports> | rg -i 'strip|remov|utm' | rg -v 'webkit\.org/blog/15697'` prints nothing.

**MKT-MEAS-14 (MUST NOT).** Never present stars, clones, views, release or registry downloads, AI citations, daily-unique visits or an activation proxy as users, installs, adoption or "trusted by". An adoption claim needs a named adopter with consent, a dependents link, or a stated opt-in measurement (as DOC-TYPE-15 requires). An activation figure needs a written definition: event, numerator, denominator and window, marked "proxy".
- Why: none of these counts identifies a person. ocx clones run 44 to 1 against views. A 2024 study found about six million suspected fake stars ([arXiv 2412.13459](https://arxiv.org/abs/2412.13459)).
- Verify: the pattern below matches only sentences that hold a figure. Either a figure sits beside a count noun and an adoption word in one sentence, or a figure is given directly as people (users, installs, developers, teams, companies). Every surviving line fails, so the pipeline must print nothing:
  `rg -n -i -P '(\b[0-9][0-9,.]*[km+]*\s+(\S+\s+){0,2}(stars|downloads|clones|views|users|installs|developers|teams|companies)\b[^.\n]*\b(users|installs|adopt\w*|trusted|used by)\b)|(\b(users|installs|adopt\w*|trusted by|used by)\b[^.\n]*\b[0-9][0-9,.]*[km+]*\s+(\S+\s+){0,2}(stars|downloads|clones|views|users|installs|developers|teams|companies)\b)|(\b[0-9][0-9,.]*[km+]*\s+(users|installs|developers|teams|companies)\b)' <pages> | rg -v '\]\(https?://|href="https?://'`
  - A line passes only with a link in the same line, which must be the named adopter's consent record, the dependents page or the opt-in measurement.
  - Tested 2026-11-27 on seven sample lines. These failed: "5k downloads from happy users", "Trusted by 120 teams", "Used by developers: 20 GitHub stars" and "1,200 users run ocx daily". These passed: "Install it with the users guide", "set up 3 tools", and the linked dependents sentence.
  - Known gap: the sentence limit `[^.\n]` stops at a decimal point or a dot in a URL. A reader still checks a claim that spans two sentences.

**MKT-MEAS-15 (MUST).** Use each count's own wording.
- Registry downloads: "N <registry> downloads in <period> to <date>; includes CI, mirrors and bots, share unmeasured". Drop the last clause only when a split was actually queried, for example the PyPI BigQuery `details.ci` field.
- Binary downloads: sum GitHub release assets only after excluding `*.sha256`, `dist-manifest.json` and installer scripts.
- crates.io: mark any crates.io series that crosses 2024-03-11 as discontinuous.
- Clones: call `traffic/clones` "clone requests", never people.
- GitHub uniques: label GitHub's `uniques` "as reported by GitHub", because GitHub does not define the term.
- Why: npm defines no "download". PyPI says mirrors, caches and scripts move its counts. crates.io changed its counting method on 2024-03-11. ocx has 18,325 of 119,372 release downloads (15.4%) on `.sha256` files.
- Verify: the summing script filters names: `gh api repos/<o>/<r>/releases --paginate -q '.[].assets[]|select(.name|test("(sha256|dist-manifest\\.json|install.*\\.(sh|ps1))$")|not)|.download_count'`. Grep reports for crates.io trend wording without "discontinuous".
- Rests on: [npm download-counts doc](https://github.com/npm/registry/blob/main/docs/download-counts.md) (undated); [PyPA analysing downloads](https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/); [crates.io change, 2024-03-11](https://blog.rust-lang.org/2024/03/11/crates-io-download-changes/); [GitHub release assets REST](https://docs.github.com/en/rest/releases/assets) (API version 2026-03-10, `download_count` undefined); all fetched 2026-11-27.

**MKT-MEAS-16 (MUST).** Call a daily-salt tool's visitor count "daily-unique visits" for any window longer than one day. Compute no retention, cohort, new-versus-returning or week-over-week unique-growth figure from such a tool.
- Why: the salt rotates every 24 hours, so a person who returns on another day counts again. A range total is a sum of daily counts. Fathom adds that a local day spans two UTC salts.
- Verify: `rg -n -i 'unique visitors|monthly (active )?users|returning visitors|retention|cohort'` in reports that cite a daily-salt source returns nothing. Pass: "420 daily-unique visits in the 7 days to 2026-11-26".
- Rests on: [Plausible data policy](https://plausible.io/data-policy) ("Last updated: November 2026"); [Fathom data page](https://usefathom.com/data) (undated); both vendor data, fetched 2026-11-27.

**MKT-MEAS-17 (MUST).** Snapshot GitHub `traffic/views`, `traffic/clones`, `traffic/popular/referrers` and `traffic/popular/paths` at least every 14 days, weekly preferred, into a committed or archived file stamped with the run date. Report no figure for a span with no snapshot. Read star counts only from `GET /repos/{o}/{r}/stargazers/count` or `/stargazers/history`. Never list or scrape `/stargazers`.
- Why: GitHub keeps traffic data for 14 days. The stargazer listing is restricted to collaborators (announced 2026-06-30).
- Verify: a scheduled workflow calls the four endpoints, and the snapshot file has an entry no older than 14 days. `rg -n '/stargazers' scripts/ .github/` shows only `/count` or `/history`.
- Rests on: [GitHub traffic REST](https://docs.github.com/en/rest/metrics/traffic) (API version 2026-03-10); [changelog 2026-06-30](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/); [starring REST](https://docs.github.com/en/rest/activity/starring); all fetched 2026-11-27. Re-check the retention line and the stargazer endpoints on each docs page.

**MKT-MEAS-18 (MUST).** Before running an A/B test, write down the baseline, the minimum detectable effect (MDE), alpha, power, the computed n per arm and the stop rule. Refuse the test when n per arm exceeds the surface's measured traffic over the window (house default: 8 weeks). Report no winner below n. Where the gate fails, ship the change and observe it.
- Why: checking significance after every observation raised a nominal 5% false-positive rate to 26.1% in Miller's worst case. At a 10% relative lift, filling both arms takes 1,785 (grimoire) to 3,288 (ocx) weeks at a 5% baseline, and 843 to 1,553 weeks at a 10% baseline. The weekly traffic used is repo-page uniques: ocx 19 and grimoire 35 a week ([metric-validity section 7](marketing-measurement/measure-metric-validity.md#7-measurements-run-2026-11-27-utc)).
- Verify: `python3 -I -c 'from statistics import NormalDist as N;import math;p1=.05;p2=p1*1.1;a,b=N().inv_cdf(.975),N().inv_cdf(.8);pb=(p1+p2)/2;print(math.ceil((a*math.sqrt(2*pb*(1-pb))+b*math.sqrt(p1*(1-p1)+p2*(1-p2)))**2/(p2-p1)**2))'` prints 31234, the required n per arm (command run 2026-11-27). The raw value is 31,233.44, and n per arm is its ceiling. The weeks figures come from 2 x 31,234 divided by weekly uniques, which gives 3,287.8 for ocx and 1,784.8 for grimoire. Divide n by measured weekly traffic per arm and compare the result with the window.
- Rests on: [Miller, How Not To Run an A/B Test](https://www.evanmiller.org/how-not-to-run-an-ab-test.html) (2010-04-18). Stable.

**MKT-MEAS-19 (MUST core, SHOULD defaults).** MUST: report AI-answer citations per engine, and record engine, location and run dates. Keep mentions and links in separate columns. Draw no conclusion from a single run. SHOULD, as defaults: use a frozen list of 20 to 50 prompts for at least 4 weeks before comparing periods, and report days cited out of 7 on a rolling basis.
- Why, MUST part: Ahrefs found that 50-83% of citations are gone by the next day, that about 75% of dropped citations return within 20 days, and that only about 28% of mentions carry a link. Both studies are vendor data from Ahrefs's own tool, and no independent study was found.
- Why, SHOULD part: the 20-50 prompts and the 4 weeks come from one practitioner's method, not validated by an independent study ([Growth Unhinged, 2026-07-15](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way); [metric-validity 5.3](marketing-measurement/measure-metric-validity.md)). The 7-day rolling window is a house default. Ahrefs implies it but states no formal cadence (metric-validity 5.1).
- Verify, MUST part: the report has the columns `engine`, `location`, `run_date`, `mentions` and `links`. A "visibility changed" claim based on one run per engine fails.
- Verify, SHOULD part: the report has `prompt_set_hash` and `days_cited_of_7`, and the prompt-file hash is the same across the compared runs. A comparison over fewer than 7 daily runs, or less than 4 weeks, says that it falls short of the default.
- Rests on: [Ahrefs citation stability](https://ahrefs.com/blog/how-stable-are-ai-citations/) (vendor data, 2026-10-29); [Ahrefs mentions vs links](https://ahrefs.com/blog/ai-citations-vs-impressions-study) (vendor data, 2025-11-26); [Growth Unhinged](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way) (practitioner, 2026-07-15). Re-check for a newer study, and ideally an independent one.

**MKT-MEAS-20 (SHOULD).** Give a count on a page as a dated number with a link to its record, for example "20 GitHub stars (GitHub API, 2026-11-27)". A live badge may sit beside the dated statement but never replaces it as support for a popularity or adoption claim. Hide no true small number. Whether to publish one at all is the owner's call.
- Why: a badge has no window and no definition. No source sets a threshold for hiding a count (C4).
- Verify: `rg -n 'img\.shields\.io/(github/stars|npm/d|pypi/d|crates/d|github/downloads)'` hits must sit next to a dated sentence. No hit may stand alone in a sentence that makes a claim.

Cross-territory, named and left to their owners: CLI telemetry consent flows belong to ux-cli-interaction. Tracking pixels in lifecycle email belong to marketing-release-announcements and owned-audience work. Per-platform post analytics and the GitHub profile as a channel belong to the channels sub-program. Citation targets for answer engines belong to marketing-discoverability, which should cite MKT-MEAS-19 for any report.

## Applied to the fleet

Evidence paths are relative to `/home/mherwig/dev` unless they start with `product-audit/` (this research tree) or `skills/` (this catalog).

| Row | Rule | Status | Evidence |
|---|---|---|---|
| S1 | MKT-MEAS-01, -03 | already satisfied | 0 of 413 crawled pages load an analytics script, and there is no consent banner (`product-audit/distribution-posture.md:40`, `:204-205`). |
| S2 | MKT-MEAS-06 (pattern) | already satisfied on grimoire.rs | The notice names its one storage key and gives a re-check grep: `grimoire-rs/grimoire/docs/public/privacy.html:23` ("No third-party subresources"), `:37` ("No cookies anywhere"), `:41-42`. This is the reference implementation for the rule. |
| S3 | MKT-MEAS-01 | already satisfied | grim telemetry is opt-in with "no default endpoint and no maintainer-run collector" (`grimoire-rs/grimoire/docs/src/content/docs/telemetry.md:6-12`, via `product-audit/distribution-posture.md:208`). |
| S4 | MKT-MEAS-09, -10 | already satisfied | 0 `utm_` links in 925 owned site, docs and README files. The one hit is a test input, `ocx-sh/catalog/test/site/lib/viewScript.test.ts:64` ([attribution-tagging, Fleet measurement](marketing-measurement/measure-attribution-tagging.md#fleet-measurement)). |
| S5 | MKT-MEAS-14, -20 | already satisfied | Neither landing page has a proof section. The landing files are `ocx-sh/website/site/src/components/Landing.astro` and `landing-content.ts` beside it (ocx.sh), and `grimoire-rs/grimoire/docs/src/pages/index.astro` and `grimoire-rs/grimoire/docs/src/data/landing.ts` (grimoire.rs). `grep -ciE 'stars\|trusted\|used by\|customers\|testimonial'` returns 0 for each of the four (`product-audit/site-shape.md:130`; re-run 2026-11-27 with the full paths). The README badges are CI, License, Website and Discord (`ocx-sh/ocx/README.md:9-12`), and CI, Release, Docs and License (`grimoire-rs/grimoire/README.md:10-13`). None is a count badge. |
| V1 | MKT-MEAS-01, -02 | **violated, in this catalog** | In this catalog: `skills/docs-instrument/SKILL.md:221` lists "Privacy-preserving page analytics with custom events" as a step-7 signal. The "Analytics vendors" section of `skills/docs-instrument/references/reader-signals.md:69-84` tables four vendors by price at lines 77-80: Plausible, Umami, GoatCounter and Fathom. DOC-OBS-16 (`skills/docs-quality-reference/observability.md:64`) names the same four as qualifying. `grep -ci consent` returns 0 for all three files (run 2026-11-27). In the fleet: the same table ships dormant at `ocx-sh/ocx/.opencode/skills/docs-instrument/references/reader-signals.md:77-80` (`product-audit/distribution-posture.md:207`). An agent following docs-instrument adds a script that MKT-MEAS-03 forbids for a German audience. Fix: docs-instrument step 7 and DOC-OBS-16 route any page analytics, and the DOC-NAV-10 search beacon, through MKT-MEAS-01. Drop "privacy-preserving" as an unattributed label. |
| V2 | MKT-MEAS-06 | **violated** | The MkDocs sites ocx-mirror, indexbot and indexer load `fonts.googleapis.com` and `fonts.gstatic.com` (`product-audit/distribution-posture.md:198`; re-probed 2026-11-27 with `curl -s https://ocx-sh.github.io/ocx-mirror/ \| grep -oE 'https://fonts\.[a-z]+\.com'`). No privacy statement names those hosts, and no `font:` key exists in any of the three configurations: `grep -cE '^[[:space:]]*font:'` returns 0 for `ocx-sh/ocx-mirror/mkdocs.yml`, `ocx-sh/indexbot/mkdocs.yml` and `grimoire-rs/indexer/mkdocs.yml` (run 2026-11-27). A bare `grep font` is not usable here, because the `fontawesome/...` icon names match it. Fix: `theme: font: false` ([Material for MkDocs, changing the fonts](https://squidfunk.github.io/mkdocs-material/setup/changing-the-fonts/), fetched 2026-11-27), or the privacy plugin, or naming the hosts. |
| V3 | MKT-MEAS-06, -01 | **violated** | The rules_ocx Jekyll site loads `cdnjs.cloudflare.com` with no statement naming it, and keeps an empty `<!-- Setup Google Analytics -->` block (`product-audit/distribution-posture.md:198`, `:209`). An agent asked to "add analytics" fills the placeholder. Fix: remove the block and name or self-host the host. |
| V4 | MKT-MEAS-06 (live half) | **violated (check gap)** | The grimoire.rs check greps `docs/dist` only (`privacy.html:41-42`). The live `privacy.html` carries a CDN-injected `/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js` that is in no build (`product-audit/distribution-posture.md:194`; re-probed 2026-11-27 with `curl -s https://grimoire.rs/privacy.html \| grep -oE '<script[^>]*>'`). It is same-origin, so "no third-party subresources" stays literally true, but the stated check cannot see what the CDN adds. Fix: run the inventory over the live page too. |
| V5 | MKT-MEAS-17 | **violated (data being lost)** | No workflow in the fleet snapshots traffic. `rg traffic/views` over `ocx-sh` and `grimoire-rs` finds only copies of the DOC-OBS-16 rule text. The 14-day windows measured on 2026-11-27 (ocx 180 views and 7,990 clones; grimoire 217 views and 3,847 clones: [metric-validity section 7](marketing-measurement/measure-metric-validity.md#7-measurements-run-2026-11-27-utc)) are the only record that will exist. |
| N1 | MKT-MEAS-15 | new commitment | No release-download claim exists yet. Any future one must exclude `.sha256` files (18,325 of 119,372 on ocx) and `dist-manifest.json` (983 fetches on grimoire v0.17.0 against 2-3 per archive). |
| N2 | MKT-MEAS-06 | new commitment | ocx.sh has no privacy statement (`find ocx-sh/website ocx-sh/ocx/website -iname '*privacy*'` outside `dist` returns nothing). Today it loads no third-party host (`product-audit/distribution-posture.md:198`), so nothing is false yet. The first host or tool added must bring the statement with it. |
| N3 | MKT-MEAS-08, -10, -11 | new commitment | There are no tagged links and no collector, so tags stay off. The format and the campaigns file apply from the first approved collector. |
| N4 | MKT-MEAS-18 | new commitment | No A/B test may run. At measured repo traffic (ocx 19 and grimoire 35 uniques a week), a test needs 1,785 to 3,288 weeks at a 5% baseline. |
| N5 | MKT-MEAS-13 | new commitment | The only usage numbers the fleet has are registry counts: npm `@ocx-sh/theme` 5,353 and `@grimoire-rs/indexer` 1,127 in the 30 days to 2026-11-26 (`product-audit/distribution-posture.md:211`). Stars are ocx 20 and grimoire 17 (`:222`). Any reuse prints all five fields. |

## AI-agent failure modes

Ranked by how often each bites, grouped by mechanism.

1. **The instrumentation reflex (most frequent).** Asked to "see what works", the agent adds a Plausible, GA4 or PostHog snippet to a layout. It fills an empty analytics placeholder (V3). It follows a catalog skill's vendor table (V1). Check: MKT-MEAS-01 grep on the diff.
2. **Counts promoted to people.** "5k downloads" becomes "5k users". All release assets get summed, checksums included. Clones get reported as developers. "Unique visitors this month" comes from a daily-salt tool. Checks: MKT-MEAS-14, -15 and -16 greps.
3. **Legal overclaim from vendor copy.** "Cookieless, so GDPR compliant, no banner." "CNIL-approved." The Omnibus treated as already in force. The UK exception missed (in force since 2026-02-05), or applied to IP and user-agent hashing. Check: the MKT-MEAS-02 grep.
4. **Tag hygiene.** UTM on internal and README links "to track clicks". `utm_source=LinkedIn` or `linkedin.com`. `utm_medium=organic` or `web`. Invented `?from=hn`. Checks: MKT-MEAS-09 and the MKT-MEAS-10 parser.
5. **A privacy statement that drifts.** A tool is added and the statement is left unchanged, or the check runs on the build while the CDN injects scripts (V4). Check: MKT-MEAS-06 over the build and the live page.
6. **Statistics without a gate.** A "winner" called after a few days. A single AI-citation run reported as a visibility change. Checks: MKT-MEAS-18 and -19.
7. **Figures from memory.** "90% of attribution is dark social." "Safari 26 strips UTMs." Star and download figures from training data. Check: MKT-MEAS-13, where every figure traces to a dated command or page.
8. **The localhost false negative.** The agent tests Plausible on `localhost`, sees no beacon, and concludes the tool sends nothing. Check: MKT-MEAS-05 with the vendor's local script variant and a pinned version.

## What an agent must ask a human

- Whether to measure beyond server-side counts at all, and whether to accept a consent banner, a configured exemption tool, or no tool.
- Which jurisdictions the audience is in. Without an answer, Germany is assumed and no script ships.
- Whether to collect acquisition data (UTM tags, referrer paths). That decides MKT-MEAS-08 and the French route.
- Self-hosting versus a third-party host, and where the data is stored.
- Counsel questions: whether a vendor's hashing equals CNIL IP truncation; whether an IP and user-agent hash sits inside UK Schedule A1 para 5 given para 5(2); whether a daily-salt hash is personal data for the records of processing.
- The legal wording of the privacy statement. An agent may draft the inventory table; the owner approves the words.
- A new `utm_medium` value, since it changes channel grouping in all history.
- Whether HDYHAU is required on any form.
- The minimum detectable effect, and any switch to a sequential testing method.
- Whether to publish a small number, and any adoption claim that rests on a private conversation (that needs the customer's consent).
- Whether to add a scheduled traffic-snapshot workflow that commits to a repository (V5).

## Decay

| Rule | Moving fact | Refresh interval | Next re-check |
|---|---|---|---|
| MKT-MEAS-02 | Digital Omnibus legislative stage | 3 months | 2027-02-27 |
| MKT-MEAS-03 | DSK guidance version, BfDI page, TDDDG §25 text | 6 months | 2027-05-27 |
| MKT-MEAS-04 | CNIL self-evaluation tool and sheet 16; PECR Sch. A1 and ICO guidance | 2 months (CNIL tool), 6 months (statute) | 2027-01-27 / 2027-05-27 |
| MKT-MEAS-05, -07, -16 | Vendor cookieless modes, salt behaviour, SDK versions | 3 months, and on every SDK upgrade | 2027-02-27 |
| MKT-MEAS-10 | GA4 channel-rule regexes; Plausible parameter keep-list | 12 months (Google reviews yearly); 3 months (Plausible) | 2027-11-27 / 2027-02-27 |
| MKT-MEAS-13 (Safari worked case) | WebKit link-tracking scope (posts of 2024-07-16 and 2025-09-15) | each Safari major release (September) | 2027-09-30 |
| MKT-MEAS-15 | Registry counting methods; GitHub `download_count` semantics | 12 months | 2027-11-27 |
| MKT-MEAS-17 | GitHub traffic retention; stargazer endpoint access | 3 months (the restriction had no stated enforcement day) | 2027-02-27 |
| MKT-MEAS-19 | AI-citation churn rates (vendor); practitioner prompt-set method | 6 months | 2027-05-27 |
| MKT-MEAS-12 | an independent HDYHAU study (none found; all sources vendor) | 12 months | 2027-11-27 |
| MKT-MEAS-18 | Miller's statistics | stable | none |
| MKT-MEAS-01, -06, -08, -09, -11, -14, -20 | none (policy and arithmetic) | on owner decision change | none |

## Open questions

Another research round (as questions):

1. Does server-side analytics from the CDN or host (Cloudflare in front of grimoire.rs; GitHub Pages, which exposes no access log to the owner) count as "server-log counting without personal data" under DSK Rn. 88? What does it actually expose, and can it be read without a script? This decides whether the fleet has any site-traffic number at all.
2. How does the ICO read Schedule A1 para 5(2) for IP and user-agent hashing? The ICO pages returned 403 this round.
3. What does the Council mandate of 2026-10-21 and the Parliament text say about the Omnibus audience-measurement carve-out (Article 88a): who may use it, do third-party providers qualify, and from when?
4. Does a zero-result search beacon sent to the project's own function (DOC-NAV-10) fall under Article 5(3) and TDDDG §25? It sends a query string from client code. The answer decides how far revision V1 must reach into docs-instrument.
5. What share of PyPI downloads of the fleet's package carries `details.ci = true` in BigQuery? `bq` was absent this round, and the answer decides whether MKT-MEAS-15 can ever drop its "share unmeasured" clause.

Owner decisions:

1. Accept "server-side or nothing" as the fleet stance, or name a tool, jurisdictions and consent route (MKT-MEAS-01).
2. Approve the V1 revision of `docs-instrument` and DOC-OBS-16 in this catalog, including the fleet copies.
3. Fix V2 (`font: false` or a statement) and V3 (remove the GA block, name or self-host cdnjs) in the repositories that own those sites.
4. Add the traffic-snapshot workflow (V5), and choose where its file lives.
5. Choose between publishing small dated counts or publishing none (MKT-MEAS-20).

## Sub-artifacts

- [marketing-measurement/measure-consent-free-config.md](marketing-measurement/measure-consent-free-config.md): EU, French, German and UK consent law for analytics; vendor cookieless modes measured with HAR; a per-tool CNIL check; the privacy-statement inventory script; what daily-salt uniques mean.
- [marketing-measurement/measure-attribution-tagging.md](marketing-measurement/measure-attribution-tagging.md): the GA4 and Plausible UTM facts, the closed medium set, the internal-link ban, the Safari 26 record, HDYHAU evidence, Hopkins keyed offers, and the fleet tag census.
- [marketing-measurement/measure-metric-validity.md](marketing-measurement/measure-metric-validity.md): per-metric definitions and windows (registries, GitHub stars, traffic and assets), the A/B sample-size gate with fleet arithmetic, AI-citation volatility, activation proxies, and the metric record table.

## Key sources

| URL | Why |
|---|---|
| https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf | Para 63: a cookieless script still counts as access (adopted 2024-10-07) |
| https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf | DSK Rn. 87-91: Germany allows only log counting (Stand November 2024) |
| https://www.gesetze-im-internet.de/ttdsg/__25.html | TDDDG §25, the German consent rule |
| https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf | CNIL criteria: no UTM, referrer host only, nearest ten (July 2025) |
| https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications | CNIL seven exemption conditions (2020-06-11) |
| https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1 | UK statistical exception, in force since 2026-02-05 |
| https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD) | Omnibus status: proposed |
| https://plausible.io/data-policy | Daily salt; vendor no-banner claim (vendor data, November 2026) |
| https://posthog.com/docs/privacy/data-collection | `cookieless_mode` ignores opt-out (vendor data) |
| https://support.google.com/analytics/answer/9756891 | GA4 channel rules keyed on medium |
| https://plausible.io/blog/utm-tracking-tags | Internal UTMs overwrite the source (vendor data, 2026-11-12) |
| https://docs.github.com/en/rest/metrics/traffic | 14-day traffic retention |
| https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/ | Stargazer listing restricted |
| https://blog.rust-lang.org/2024/03/11/crates-io-download-changes/ | crates.io series break |
| https://www.evanmiller.org/how-not-to-run-an-ab-test.html | Peeking raises false positives to 26.1% |
| https://ahrefs.com/blog/how-stable-are-ai-citations/ | AI-citation churn (vendor data, 2026-10-29) |
| https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way | Frozen 20-50 prompt set for 4+ weeks (one practitioner, 2026-07-15) |
| https://webkit.org/blog/15697/private-browsing-2-0/ | Safari parameter stripping is scoped to Private Browsing and advanced protection (2024-07-16) |
| https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ | Safari 26.0 names no stripped parameter (2025-09-15) |

## Revision log

Revision of 2026-11-27, after an adversarial check. No rule was retired or renumbered.

- MKT-MEAS-01: the verify regex now matches only script hosts, collector attributes and SDK package names (`clarity\.ms`, `cdn\.segment\.com`, `@amplitude/` and others), and the `*.md` and `*.mdx` globs are dropped. Bare words such as "clarity" and "segment" made it fail on ordinary prose. The pass condition is computable: each hit's tool is named in the decision record. Run over the fleet's site sources: 0 hits.
- MKT-MEAS-02: the verify now has a fixed pass pattern. An unattributed claim survives an `rg -v` for `states|claims|according to` or a decision-record link. An Omnibus line survives an `rg -v` for `propos`. Either pipeline must print nothing. "privacy-friendly" and "privacy-preserving" are added to the grep.
- MKT-MEAS-03: "shows no measurement host" was a judgement call, and it is replaced by four checks with fixed pass conditions. They are: an external-host allowlist (empty by default), a build-against-live diff of same-origin scripts, which catches the CDN injection in V4, a grep for inline beacons, and the pixel grep.
- MKT-MEAS-11: the `grep -F` check could not fail independently, and it duplicated MKT-MEAS-10. It is replaced by a cross-row check for variant campaign spellings and reused tag tuples, tested on a sample. The severity is unchanged.
- MKT-MEAS-12: labelled "vendor-sourced, low confidence". It gains a grep that finds a select or required HDYHAU field, and the report half is marked as a reading check. A Decay row now tracks the search for an independent study.
- MKT-MEAS-13: the Safari clause was an example with no source. It now states the WebKit finding (stripping documented only in Private Browsing and under advanced protection; Safari 26.0 names no parameter), cites both posts and adds a grep. The Decay row stays, because the rule now carries the moving fact.
- MKT-MEAS-14: the verify could not be computed, and it is replaced by a regex limited to sentences that hold a figure. Such a sentence pairs a count noun with an adoption word, or states a figure directly as people. Every match needs a link in the same line. Tested on seven sample lines.
- MKT-MEAS-18: the Why mixed baselines (843 is the 10%-baseline grimoire figure). It now gives 1,785 to 3,288 weeks at a 5% baseline and 843 to 1,553 at a 10% baseline. The verify cites the computed 31,234 (the ceiling of 31,233.44) and shows the weeks arithmetic.
- MKT-MEAS-19: the frozen 20-50 prompts, the 4 weeks and days-of-7 rested on one practitioner and on a cadence that Ahrefs only implies. They are demoted to SHOULD defaults and cite Growth Unhinged (2026-07-15). The MUST core keeps per-engine reporting, separate mention and link columns, and no conclusion from one run, and is labelled as resting on vendor data only.
- Verdict 8: names both baselines. Verdict 9: names all four vendors (adds GoatCounter).
- Applied V1: lists all four vendors, splits the catalog paths from the fleet path, and adds the `grep -ci consent` result.
- Applied V2: the evidence for "no `font: false`" is now `grep -cE '^[[:space:]]*font:'` returning 0 for each file. Before, it was the `theme:` line numbers.
- Applied S5: names the four landing files. The grep was re-run with full paths, and each file returned 0.
- Key sources: adds Growth Unhinged and the two WebKit posts.
