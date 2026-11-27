# Measurement facts

Dated law, vendor and platform facts for `marketing-measurement`. `SKILL.md` and the depth files keep no copy of a limit or a date. They cite a row as `[MEAS-F05]`. This is research, not legal advice.

Contents: [Dates and versions](#dates-and-versions) · [Refresh](#refresh) · [Registry](#registry) · [Notes](#notes)

## Dates and versions

- Every row was fetched on 2026-11-27. Its `expect` pattern matched the fetched text after tags were stripped with `sed 's/<[^>]*>/ /g'`.
- Law rows: EDPB Guidelines 2/2023 (adopted 2024-10-07), the German DSK guidance version 1.2 (Stand November 2024), CNIL sheet 16 (page date 2020-06-11), the CNIL self-evaluation tool (July 2025), PECR Schedule A1 (in force since 2026-02-05 under S.I. 2026/82), the Digital Omnibus proposal (procedure 2025/0360(COD), stage "Awaiting committee decision" on 2026-11-27).
- Vendor rows describe vendor behaviour on the fetch date. A vendor mode changes between versions, so re-run the MKT-MEAS-05 measurement on every SDK or script upgrade, whatever `refresh_days` says.
- GitHub rows: REST API version 2026-03-10.
- Re-check early on these events: a new DSK version number or BfDI page; a change of the legislation.gov.uk "changes to legislation" banner; a new Omnibus stage; a CNIL page date change; a Safari major release (each September); a new GitHub API version; any of the three preprints appearing peer reviewed; the promised follow-up of the Sielinski preprint.

## Refresh

Every row carries `refresh_days`: 90, because each row is policy, an API behaviour, a vendor claim or a third-party statistic. No row is within 60 days of a stated effective date, so none uses 30. `checks/facts_check.py` in `channel-publishing` fails on the first overdue row. Re-fetch the row and update `verified`. Never extend the date without fetching.

Weekly re-fetch job: run each row's `url` and match `expect`, as `channel-publishing` documents. The three PDF rows (MEAS-F01, MEAS-F02, MEAS-F06) use `%PDF` as `expect`, which proves only that the URL still serves a PDF. A human re-reads the cited clause at each refresh.

## Registry

Columns: `id, platform, fact, value, url, source_date, verified, refresh_days, provenance, expect`.

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| MEAS-F01 | eu-law | EDPB Guidelines 2/2023 paragraph 63 | Client-side code that makes the browser send an identifier counts as gaining access, so Article 5(3) ePrivacy applies even with no cookie | https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf | 2024-10-07 | 2026-11-27 | 90 | authority | %PDF |
| MEAS-F02 | de-law | DSK Orientierungshilfe Digitale Dienste, Rn. 87 to 91 | Log counting without personal data, or a plain counter of the service itself, is allowed; no other audience measurement is called consent-free | https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf | relative:Stand November 2024@2026-11-27 | 2026-11-27 | 90 | authority | %PDF |
| MEAS-F03 | de-law | BfDI page on counting pixels | A counting pixel needs consent | https://www.bfdi.bund.de/DE/Buerger/Inhalte/Telemedien/Z%C3%A4hlpixel.html | none | 2026-11-27 | 90 | authority | Zählpixel |
| MEAS-F04 | de-law | TDDDG section 25 | The German consent rule for storing and reading information on a terminal device, in force | https://www.gesetze-im-internet.de/ttdsg/__25.html | none | 2026-11-27 | 90 | authority | Endeinrichtung |
| MEAS-F05 | fr-law | CNIL sheet 16 | Audience-measurement exemption with seven conditions; tracker lifetime at most 13 months; a retention limit, IP truncation and an opt-out also bind (see MKT-MEAS-04) | https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications | 2020-06-11 | 2026-11-27 | 90 | authority | 13 months |
| MEAS-F06 | fr-law | CNIL self-evaluation tool for audience measurement | No UTM or campaign identifiers, referrer cut to the host, reports rounded to the nearest ten, retention at most 25 months | https://www.cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf | relative:July 2025@2026-11-27 | 2026-11-27 | 90 | authority | %PDF |
| MEAS-F07 | uk-law | PECR Schedule A1 paragraph 5 | Statistical exception: usage statistics only, used to improve the service, data shared only for that, purpose stated, free opt-out; paragraph 5(2) excludes information the terminal emits automatically | https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1 | none | 2026-11-27 | 90 | authority | statistical purposes |
| MEAS-F08 | uk-law | S.I. 2026/82 | Brought Schedule A1 into force on 2026-02-05 | https://www.legislation.gov.uk/uksi/2026/82/made | none | 2026-11-27 | 90 | authority | 2026 |
| MEAS-F09 | eu-law | Digital Omnibus procedure file | COM(2025)0837, procedure 2025/0360(COD), stage "Awaiting committee decision"; a proposal, not law | https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD) | none | 2026-11-27 | 90 | authority | Awaiting committee decision |
| MEAS-F10 | plausible | Plausible data policy | Visitor hash uses a salt that rotates every 24 hours; the "no banner needed" statement is the vendor's own (last updated November 2026) | https://plausible.io/data-policy | relative:Last updated November 2026@2026-11-27 | 2026-11-27 | 90 | vendor | salt |
| MEAS-F11 | fathom | Fathom data page | Daily salt; a local day spans two UTC salts | https://usefathom.com/data | none | 2026-11-27 | 90 | vendor | salt |
| MEAS-F12 | posthog | PostHog data collection docs | cookieless_mode set to always ignores opt-out calls | https://posthog.com/docs/privacy/data-collection | none | 2026-11-27 | 90 | vendor | cookieless_mode |
| MEAS-F13 | plausible | Plausible UTM guide | An internal UTM overwrites the visit's original source and the visit shows as Direct | https://plausible.io/blog/utm-tracking-tags | 2026-11-12 | 2026-11-27 | 90 | vendor | [Dd]irect |
| MEAS-F14 | plausible | Plausible parameter handling | Keeps only ref, source, the five UTM parameters, gclid and msclkid | https://plausible.io/docs/stop-tracking-utm-tags | none | 2026-11-27 | 90 | vendor | msclkid |
| MEAS-F15 | ga4 | GA4 campaign URL builders | Parameters utm_source, utm_medium and utm_campaign name a campaign visit | https://support.google.com/analytics/answer/10917952 | none | 2026-11-27 | 90 | platform | utm_source |
| MEAS-F16 | ga4 | GA4 default channel group | Channel rules key on the medium words; an unknown medium lands in Unassigned; Google reviews the lists at least yearly | https://support.google.com/analytics/answer/9756891 | none | 2026-11-27 | 90 | platform | Unassigned |
| MEAS-F17 | github | GitHub traffic REST | Views, clones, referrers and paths cover only the past 14 days (API version 2026-03-10) | https://docs.github.com/en/rest/metrics/traffic | none | 2026-11-27 | 90 | platform | 14 days |
| MEAS-F18 | github | GitHub changelog on stargazer access | The stargazer listing is restricted to collaborators; announced 2026-06-30 with no stated enforcement day | https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/ | 2026-06-30 | 2026-11-27 | 90 | platform | [Ss]targazers |
| MEAS-F19 | github | GitHub starring REST | Reference for the stargazer endpoints; read star counts from the count and history endpoints | https://docs.github.com/en/rest/activity/starring | none | 2026-11-27 | 90 | platform | stargazers |
| MEAS-F20 | github | GitHub release assets REST | download_count has no documented definition (API version 2026-03-10) | https://docs.github.com/en/rest/releases/assets | none | 2026-11-27 | 90 | platform | download_count |
| MEAS-F21 | npm | npm download-counts document | npm defines no "download" beyond its counting rule | https://github.com/npm/registry/blob/main/docs/download-counts.md | none | 2026-11-27 | 90 | platform | download |
| MEAS-F22 | pypi | PyPA guide to analysing downloads | Mirrors, caches and scripts move the counts | https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/ | none | 2026-11-27 | 90 | platform | mirrors |
| MEAS-F23 | crates-io | crates.io download counting change | The counting method changed on 2024-03-11, so a series that crosses that date is discontinuous | https://blog.rust-lang.org/2024/03/11/crates-io-download-changes/ | 2024-03-11 | 2026-11-27 | 90 | platform | download |
| MEAS-F24 | webkit | WebKit, Private Browsing 2.0 | Query-parameter stripping is documented only in Private Browsing, and in regular browsing only when the user enables advanced tracking and fingerprinting protection; campaign-only parameters are kept | https://webkit.org/blog/15697/private-browsing-2-0/ | 2024-07-16 | 2026-11-27 | 90 | platform | query parameter |
| MEAS-F25 | webkit | WebKit, Safari 26.0 | Names no stripped parameter; known fingerprinting scripts can no longer read query parameters and document.referrer | https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ | 2025-09-15 | 2026-11-27 | 90 | platform | [Qq]uery parameters |
| MEAS-F26 | statistics | Miller, How Not To Run an A/B Test | Checking significance after every observation raised a nominal 5% false-positive rate to 26.1% in the worst case | https://www.evanmiller.org/how-not-to-run-an-ab-test.html | 2010-04-18 | 2026-11-27 | 90 | independent | 26\.1% |
| MEAS-F27 | ai-citations | Ahrefs, how stable are AI citations | Vendor data: 50% to 83% of citations are gone by the next day; about 75% of dropped citations return within 20 days | https://ahrefs.com/blog/how-stable-are-ai-citations/ | 2026-10-29 | 2026-11-27 | 90 | vendor | citations |
| MEAS-F28 | ai-citations | Ahrefs, AI mentions versus links | Vendor data: about 28% of mentions carry a link | https://ahrefs.com/blog/ai-citations-vs-impressions-study | 2025-11-26 | 2026-11-27 | 90 | vendor | mentions |
| MEAS-F29 | ai-citations | Sielinski, arXiv 2603.08924v2 (preprint, author affiliated with IQRush) | Median Jaccard 0.29 to 0.31 for Gemini, 0.33 to 0.40 for SearchGPT and 0.50 for Perplexity between daily samples; prompts needed for a 5-point interval differ by engine | https://arxiv.org/html/2603.08924v2 | 2026-06-09 | 2026-11-27 | 90 | independent | Jaccard |
| MEAS-F30 | ai-citations | Chen and Koudas, arXiv 2610.15033 (preprint, authors run the monitoring platform that collected the data) | Still shared after two weeks: 40% ChatGPT, 47% Gemini, 22% Perplexity; after ten weeks: 14%, 29%, 0%; the findings describe 2026 | https://arxiv.org/html/2610.15033 | 2026-10-10 | 2026-11-27 | 90 | independent | two weeks |
| MEAS-F31 | ai-citations | Schulte et al., arXiv 2604.07585 (preprint, first author affiliated with Aurora Intelligence) | Day-to-day Jaccard 0.34 to 0.42 over 45 to 46 days; 7 to 8 runs per prompt per day gave a standard error below 0.10 on one German-language set of 32 prompts | https://arxiv.org/html/2604.07585 | 2026-04-08 | 2026-11-27 | 90 | independent | Jaccard |
| MEAS-F32 | ai-citations | Martinez, survey of AI-citation measurement, arXiv 2607.14035 | 3 to 5 paraphrases per information need; the 7-runs figure "is not a universal standard" | https://arxiv.org/html/2607.14035 | 2026-07-15 | 2026-11-27 | 90 | independent | paraphras |
| MEAS-F33 | ai-citations | Growth Unhinged newsletter (practitioner, sponsored by an AI-visibility vendor) | Practitioner default: freeze 20 to 50 prompts and run at least 4 weeks; no independent test | https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way | 2026-07-15 | 2026-11-27 | 90 | vendor | prompts |
| MEAS-F34 | surveys | Survey Practice article 3003, split-ballot of 12,825 respondents | On one question a closed list produced fewer blanks than an open field; the sign differs by question, so no general order or blank effect is known | https://www.surveypractice.org/article/3003 | 2010-07-31 | 2026-11-27 | 90 | independent | split |
| MEAS-F35 | surveys | Romberg et al. 2020, full text on Europe PMC | Recall of a named, shown campaign tracks logged exposure, odds ratio 2.52; it does not test "how did you hear about us" accuracy | https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7177256/fullTextXML | none | 2026-11-27 | 90 | independent | 2\.52 |
| MEAS-F36 | github-stars | He et al., arXiv 2412.13459 | Fake stars exist at scale: version 1 reported about six million suspected fake stars, and version 2 (2025-09-06) reports 3.81 million after postprocessing | https://arxiv.org/html/2412.13459v2 | 2025-09-06 | 2026-11-27 | 90 | independent | 3\.81 |

## Notes

- Reja et al. 2003 (open versus closed web-survey questions, abstract only, https://repozitorij.uni-lj.si/IzpisGradiva.php?id=6266) found that closed lists raise the share of listed options and that open fields raise missing and inadequate answers. It is not a registry row, because the page reset the connection on 2026-11-27 and a row needs the agent's own fetch.
- Documented gap: no independent study of "how did you hear about us" accuracy was found as of 2026-11-27. Every source on it is a vendor measuring its own software, so no row holds one. Re-check for one at each 12-month review.
- Documented gap: no source tests the prompt-set defaults in MKT-MEAS-19. MEAS-F33 is the only origin of the 20-to-50-prompt and 4-week figures.
- Re-check when a legal provision changes: the file records the provision text as read, not a legal conclusion.
