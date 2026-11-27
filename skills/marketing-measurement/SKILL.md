---
name: marketing-measurement
description: "Rules for measuring a site, docs, README or campaign without breaking consent law or misreporting a number: whether an analytics script, pixel or beacon may be added at all, cookieless and consent-exemption claims, privacy-statement drift, UTM and campaign tagging, metric definitions, AI answer citations, and A/B test pre-registration. Use when someone proposes adding analytics (Plausible, Umami, GoatCounter, Fathom, PostHog, Google Analytics, Cloudflare Web Analytics), a tracking pixel, UTM parameters, a metrics dashboard or report, a growth number on a page, or an A/B test. Not for GitHub stars, clones or download counts, which is github-presence, and not for head tags or robots.txt, which the marketing-quality rule set covers."
license: Apache-2.0
metadata:
  summary: Decision record before any analytics script, a closed UTM format, five fields beside every number, and a pre-registered gate for A/B tests and AI-citation reports
  keywords: analytics,measurement,consent,cookieless,gdpr,eprivacy,cnil,plausible,matomo,posthog,utm,attribution,campaign,privacy-statement,metrics,a-b-test,ai-citations,hdyhau
---

# marketing-measurement

An agent asked to "see what works" adds a script, tags every link and quotes a count as users. This skill stops that. Default: no client-side measurement, no tags, and no number without its definition. The numbers behind each rule are dated rows in [facts.md](references/facts.md). This is research, not legal advice, and an agent never decides a legal question.

Contents: [Pinned defaults](#pinned-defaults) · [Stop condition](#stop-condition) · [Steps](#steps) · [The MUST list](#the-must-list) · [What to ask a human](#what-to-ask-a-human) · [Routing](#routing) · [Dated facts](#dated-facts) · [Siblings](#siblings)

## Pinned defaults

Pinned means a default an adopter overrides once and records.

- The owner decision lives at `.agents/decisions/measurement.md`, as `key: value` lines (keys in `references/collection.md`).
- Germany counts as served unless the record names the jurisdictions otherwise (MKT-MEAS-03).
- One campaigns file per project, `campaigns.csv`, with the columns in MKT-MEAS-11.
- `CHECKS=.claude/skills/marketing-measurement/checks` (`$CLAUDE_CONFIG_DIR/skills/marketing-measurement/checks` when installed globally). Every script runs as `python3 -I`, exits 0 clean, 1 on a finding, 2 on bad usage, and has `--help` and `--self-test`.

## Stop condition

Stop when every measurement change or number in scope has a verdict: `path:line: MKT-MEAS-nn: message`, or `clean`. A change that needs an owner decision (see [What to ask a human](#what-to-ask-a-human)) stops at a drafted record and the questions. Never mark a record approved, and never add a script because the owner might say yes. Mark any finding no script produced `unverified: reading heuristic`.

## Steps

1. **Find the decision record.** Input: the task. Run `test -f .agents/decisions/measurement.md` and, when it exists, `python3 -I "$CHECKS"/inventory_check.py decision .agents/decisions/measurement.md`. Done: either the record is complete, or its missing keys are listed. No record and a task that adds a script, pixel, SDK or beacon (MKT-MEAS-01): stop, draft the record with empty keys, ask the owner.
2. **Scan the changed files for collectors.** Input: the diff. Run the MKT-MEAS-01 block in [collection.md](references/collection.md). Done: every hit names a tool in the record, no placeholder block was filled, no unpinned script URL exists (MKT-MEAS-05), and PostHog `always` stands with no opt-out or identify call (MKT-MEAS-07).
3. **Use the right words about consent.** Input: any copy, comment or privacy text you write. Write "the vendor states", never "consent-free", "cookieless" or "no banner" as a conclusion, and call the Digital Omnibus a proposal (MKT-MEAS-02). Run `python3 -I "$CHECKS"/report_check.py legal FILE...`. Done: exit 0.
4. **Measure a tool the owner approved.** Input: an approved record. Record a HAR per page type, assert cookies and storage, and read what each beacon carries (MKT-MEAS-04, 05; the snippet and exemption conditions are in `collection.md`). Run `python3 -I "$CHECKS"/inventory_check.py har RECORDED.har --cookieless`. Done: exit 0 and the pinned version sits beside the result.
5. **Keep the privacy statement true.** Input: the build directory, saved copies of the live pages, the statement. Run the MKT-MEAS-03 and MKT-MEAS-06 blocks in `collection.md`. Done: exit 0 on the build and on the live copies. The statement changes in the same commit as the tool. You draft the inventory table, and the owner approves the words.
6. **Tag links only when a collector records tags.** Input: the record's `acquisition_data` key and the links. Run `python3 -I "$CHECKS"/utm_check.py tags --decision .agents/decisions/measurement.md FILE...`, then `utm_check.py owned --host YOUR_HOST FILE...` (never tag an owned host, MKT-MEAS-09), then `utm_check.py campaigns campaigns.csv`. Done: all exit 0. With no collector, post the bare canonical URL.
7. **Print five fields beside every number.** Input: any report, README, page or dashboard text with a count. Name, definition, source, window and as-of date, with vendor figures labelled (MKT-MEAS-13). Use each count's own wording (MKT-MEAS-15, 16), never users, installs or adoption (MKT-MEAS-14), a dated number beside any badge (MKT-MEAS-20). Run `report_check.py fields REPORT...` and `report_check.py adoption PAGE...`. Done: exit 0. Traffic figures need an archive snapshot in their window (MKT-MEAS-17).
8. **Gate an A/B test before it starts.** Input: baseline, MDE, weekly traffic of the surface. Run `python3 -I "$CHECKS"/report_check.py abgate --baseline P --mde R --weekly N`. Done: exit 0 and all six fields written down, or the test is refused and the change ships instead (MKT-MEAS-18).
9. **Report AI-answer citations per engine.** Input: run data. Use the columns in MKT-MEAS-19, intervals on both sides of any comparison, and the labelled churn wording of MKT-MEAS-21. Run `report_check.py aicite REPORT.csv` and `report_check.py churn PAGE...`. Done: exit 0.
10. **Treat HDYHAU as a companion signal.** Input: a form that already exists. Add one optional free-text field and print `n_shown`, `n_answered` and `n_blank` (MKT-MEAS-12). Run `report_check.py hdyhau-form FILE...` and `report_check.py hdyhau REPORT...`. Done: exit 0. Build no form for it.
11. **Report.** One line per finding, grouped by file, ordered by rule ID, a count at the end, and the owner questions last.

## The MUST list

Repeated here because the rule that loads this skill may not have fired. The depth is in the two reference files.

- MKT-MEAS-01: no analytics script, pixel, SDK, beacon or collector without the recorded owner decision.
- MKT-MEAS-02: no legal conclusion from vendor copy, and the Omnibus is a proposal.
- MKT-MEAS-03: no client-side script or counting pixel before consent where Germany is served.
- MKT-MEAS-04: a consent exemption holds only when every condition holds.
- MKT-MEAS-05: measure what the tool does, with a pinned version.
- MKT-MEAS-06: the privacy statement matches the built output and the live page.
- MKT-MEAS-07: PostHog `cookieless_mode: 'always'` with no opt-out and no `identify()`.
- MKT-MEAS-08, 09, 10: tag only with a collector, never an owned host, in the closed format.
- MKT-MEAS-13 to 16: five fields, no count as people, each count's own wording, daily-unique visits.
- MKT-MEAS-17: no traffic figure for a span with no snapshot.
- MKT-MEAS-18: no A/B test below its sample size.
- MKT-MEAS-19: AI-citation reports per engine, with counts and intervals.

## What to ask a human

An agent never answers these:

- Whether to measure beyond server-side counts, and whether to accept a banner, a configured exemption tool, or no tool.
- Which jurisdictions the audience is in. With no answer, Germany is assumed and no script ships.
- Whether to collect acquisition data (UTM tags, referrer paths).
- Self-hosting versus a third-party host, and where the data is stored.
- Counsel questions: whether a vendor's hashing equals IP truncation, whether an IP and user-agent hash sits inside the UK statistical exception, whether a daily-salt hash is personal data for the records of processing.
- The legal wording of the privacy statement.
- A new `utm_medium` value, since it changes channel grouping in all history.
- Whether HDYHAU is required on any form.
- The minimum detectable effect, and any switch to a sequential testing method.
- Whether to publish a small number, and any adoption claim that rests on a private conversation (that needs the customer's consent).
- Whether to add a scheduled traffic-snapshot workflow that commits to a repository (CH-GH-25).

## Routing

| Read | When |
|---|---|
| [references/collection.md](references/collection.md) | Adding or reviewing a script, pixel, SDK or beacon, a "cookieless" claim, a privacy statement, or a consent exemption (MKT-MEAS-01 to 07) |
| [references/reporting.md](references/reporting.md) | Tagging links, writing a campaigns file, printing a metric, reporting registry or GitHub counts, running an A/B test, or reporting AI-answer citations (MKT-MEAS-08 to 21) |
| [references/facts.md](references/facts.md) | You need the source, date or value behind a law, vendor or platform fact, or you are refreshing one |

## Dated facts

Every law, vendor and platform fact lives in `references/facts.md` with its source URL, source date and `refresh_days`. Refresh cadence: 90 days, and 30 days for any fact within 60 days of an effective date. Re-fetch an overdue row and update `verified`. Never extend a date without fetching. `channel-publishing/checks/facts_check.py` validates the file. This skill repeats no limit from it.

## Siblings

- `marketing-quality` rule: head tags, robots.txt, claims on copy surfaces. `github-presence`: stars, clones, downloads and the traffic archive (CH-GH-23, 25, 26). `docs-instrument` and `docs-quality` (DOC-OBS-16): a page-analytics script or the search beacon clears MKT-MEAS-01 to 04 first. `ux-cli`: CLI telemetry consent flows.
