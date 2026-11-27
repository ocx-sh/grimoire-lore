---
title: What a site may collect
summary: The decision record, consent-law limits, cookieless claims, the privacy statement and vendor modes (MKT-MEAS-01 to 07)
---

# What a site may collect

This file owns MKT-MEAS-01 to 07: whether a script, pixel, SDK or beacon may run at all, what a "cookieless" claim may say, and how the privacy statement stays true. Rows that rest on law or a vendor cite a registry row in `facts.md` as `[MEAS-F01]`. This is research, not legal advice.

Contents: [Dates and versions](#dates-and-versions) · [The decision record](#the-decision-record-pinned) · [The rules](#the-rules) · [Verification blocks](#verification-blocks) · [Exemption conditions](#exemption-conditions) · [Measuring a tool](#measuring-a-tool) · [Siblings](#siblings)

## Dates and versions

- Every law and vendor fact this file rests on is a row in `facts.md`, fetched 2026-11-27. This file carries no figure of its own.
- Re-check this file when: the German DSK publishes a new guidance version, the UK legislation page changes its "changes to legislation" banner, the CNIL page dates change, the Digital Omnibus changes stage, or a vendor releases a new SDK or script version.
- Scripts: `python3` 3.11 standard library only. The Playwright snippet is Node, with exact versions pinned in the project's own `package.json`, and is not self-tested here.

## The decision record (pinned)

Pinned default. An adopter may move the path once and say where. The path is `.agents/decisions/measurement.md`. It is a text file of `key: value` lines, written by the owner or approved by the owner. An agent drafts it and never marks it approved.

| Key | Holds |
|---|---|
| `tools` | The tool names, or `none` |
| `version` | The pinned tool or SDK version |
| `host` | Where the collector runs and who operates it |
| `jurisdictions` | The audience's jurisdictions (a missing entry means Germany is served, MKT-MEAS-03) |
| `consent_route` | `server-side only`, `banner`, or the named exemption and its conditions |
| `acquisition_data` | `yes` or `no`: whether UTM tags and referrer paths are collected (decides MKT-MEAS-08) |
| `allowed_hosts` | External script hosts the pages may load; empty by default |

`inventory_check.py decision` exits 1 when a key is missing. Every key the owner has not answered stays empty, and the empty key fails. Do not fill one from a guess.

## The rules

Severity is the rule's own. Verification commands read `$CHECKS`, the `checks/` directory of this skill: `CHECKS=.claude/skills/marketing-measurement/checks`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-MEAS-01 | Add no analytics script, pixel, SDK, beacon or campaign-parameter collector to a site, docs site, app or CLI without a recorded owner decision. The decision names the tool and its version, its host, the jurisdictions served, the consent route, and whether acquisition data (UTM tags, referrer paths) is collected. Fill no empty analytics placeholder. | Each row of the law table turns on facts only the owner knows, and the default is zero scripts. | see block MKT-MEAS-01. Known gap: a self-hosted collector at a custom path. Catch it with the MKT-MEAS-05 recording and the MKT-MEAS-06 inventory. | MUST |
| MKT-MEAS-02 | Never write "cookieless", "privacy-friendly" or a vendor's "no banner needed" as a legal conclusion. Write "the vendor states". Write "consent-free" only for a tool, version and configuration that passed the per-jurisdiction conditions. Never claim a regulator approved a tool unless the regulator's own page names that tool and version. Never treat the Digital Omnibus audience-measurement carve-out as law. | Vendor pages are not regulators. The Omnibus was a proposal on 2026-11-27 [MEAS-F09]. | `python3 -I "$CHECKS"/report_check.py legal FILE...` over docs, source strings and the privacy page exits 0. The check is line-scoped: keep one sentence per line in Markdown. | MUST |
| MKT-MEAS-03 | Where the audience includes Germany, load no client-side measurement script and no counting pixel before consent. The consent-free form is server-side counting with no personal data and no script. Treat Germany as served unless the decision record says otherwise. | German regulators allow log counting and decline a general consent-free finding for anything else [MEAS-F02]. The federal commissioner says a counting pixel needs consent [MEAS-F03]. The consent rule is in force [MEAS-F04]. | see block MKT-MEAS-03: four checks, all must exit 0. Any counting job reads server-side data only. | MUST |
| MKT-MEAS-04 | When a site relies on a consent exemption, meet every condition of that exemption (the table under [Exemption conditions](#exemption-conditions)). | Each exemption holds only if every condition holds. | Reading heuristic: unverified, diff the tool configuration against the conditions table. Then record a HAR as in MKT-MEAS-05 with `?utm_source=x&utm_campaign=y` and a referrer that has a path: `python3 -I "$CHECKS"/inventory_check.py har RECORDED.har` exits 0. After the opt-out is set, a reload sends no beacon (read the second recording). | MUST |
| MKT-MEAS-05 | After wiring any measurement tool, measure what it does. Load each page type headless and record a HAR. For a tool sold as cookieless, assert zero cookies and zero entries in localStorage, sessionStorage and IndexedDB. Assert what each beacon carries: URL, referrer, query string. Pin the SDK or script version and record it beside the result. | Vendor modes change between versions. Measured 2026-11-27: one vendor's cookieless mode wrote storage in one SDK version and not in another, and three tools sent `utm_*` and the full referrer by default. A tool tested on localhost may send nothing from there. | `python3 -I "$CHECKS"/inventory_check.py har RECORDED.har --cookieless` exits 0, and the snippet under [Measuring a tool](#measuring-a-tool) exits 0. A floating `latest` or an unversioned script URL fails: `inventory_check.py scan` reports it. | MUST |
| MKT-MEAS-06 | Make the privacy statement match the shipped inventory, and check it in CI against the built output and against the live deployed page. The statement names every third-party host the page loads, every storage key it writes, and for each measurement tool its host, what it sends, its retention and its opt-out. It changes in the same commit that adds the tool. | France, Germany and the UK all begin with information to the visitor. A stale "no analytics" line makes the statement false, and a CDN can inject scripts the build never contains. | see block MKT-MEAS-06. Known gap: hosts loaded by `import()` or at run time. Catch them with the MKT-MEAS-05 recording. | MUST |
| MKT-MEAS-07 | Never configure PostHog `cookieless_mode: 'always'` where a visitor-level opt-out must be honoured. Never call `identify()` or `alias()` with it. | The vendor documents that `always` ignores opt-out calls [MEAS-F12], and an opt-out is a condition of both the French and the UK test. | `python3 -I "$CHECKS"/inventory_check.py scan` over the source files exits 0: it reports `always` beside `identify(`, `alias(` or `opt_out_capturing`. | MUST |

## Verification blocks

```sh
# MKT-MEAS-01: every analytics host, SDK or placeholder in changed files names a tool in the record
git diff --name-only -z --diff-filter=d --merge-base origin/HEAD -- \
  ':(glob)**/*.html' ':(glob)**/*.astro' ':(glob)**/*.js' ':(glob)**/*.mjs' ':(glob)**/*.cjs' \
  ':(glob)**/*.ts' ':(glob)**/*.jsx' ':(glob)**/*.tsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' \
  ':(glob)**/*.json' ':(glob)**/*.toml' ':(glob)**/*.yml' ':(glob)**/*.yaml' \
  | xargs -0 -r python3 -I "$CHECKS"/inventory_check.py scan --decision .agents/decisions/measurement.md --
# MKT-MEAS-01: the record is complete once any tool is named
python3 -I "$CHECKS"/inventory_check.py decision .agents/decisions/measurement.md
```

```sh
# MKT-MEAS-03: DIST is the build directory, LIVE holds one saved copy per page type
# (curl -s URL -o "$LIVE"/PAGE.html); the allowed list is empty when there is no record
python3 -I "$CHECKS"/inventory_check.py hosts "$DIST" --own example.com --decision .agents/decisions/measurement.md
python3 -I "$CHECKS"/inventory_check.py live-diff "$DIST" "$LIVE" --decision .agents/decisions/measurement.md
python3 -I "$CHECKS"/inventory_check.py beacons "$DIST"
python3 -I "$CHECKS"/inventory_check.py hosts "$LIVE" --own example.com --decision .agents/decisions/measurement.md
```

```sh
# MKT-MEAS-06: the statement is a text file; run on the build and on the saved live pages
python3 -I "$CHECKS"/inventory_check.py hosts "$DIST" --own example.com --statement privacy.md
python3 -I "$CHECKS"/inventory_check.py hosts "$LIVE" --own example.com --statement privacy.md
```

## Exemption conditions

An agent never decides that a configuration qualifies. It lists the conditions and the owner and counsel decide. Each row cites the registry row that holds the limit.

| Jurisdiction | Conditions to meet, all of them | Source row |
|---|---|---|
| France | Every condition of the CNIL sheet on audience measurement: a cap on tracker lifetime, a cap on retention, the IP address truncated, an opt-out link on the privacy page, no User ID, no e-commerce data, no session replay or heatmaps, page views only. Every criterion of the CNIL self-evaluation tool: reports rounded to the nearest ten, no UTM or campaign identifiers, the referrer cut to its host (Matomo: `setCustomUrl(origin + pathname)`, `setReferrerUrl(referrerOrigin + "/")`) | MEAS-F05, MEAS-F06 |
| United Kingdom | PECR Schedule A1 paragraph 5: usage statistics only, used to improve the service; data shared only to make those improvements; the purpose stated; a working, free opt-out. Do not rely on paragraph 5 for a hash of IP address and user agent until counsel confirms, because paragraph 5(2) excludes automatically emitted information | MEAS-F07, MEAS-F08 |
| Germany | No measurement script passes without consent. The consent-free form is log counting or a plain counter of the service itself, with no personal data | MEAS-F02, MEAS-F03, MEAS-F04 |
| EU level | Client-side code that makes the browser send an identifier counts as access, so the ePrivacy consent rule applies even with no cookie. Whether consent is then needed depends on a national exemption | MEAS-F01 |

The only configuration that passed every measured check on 2026-11-27 was self-hosted Matomo with cookies off and with the URL and referrer stripped. It passes in France only. It is unresolved in the UK, and it needs consent in Germany. No regulator in France, Germany or the UK names Plausible or Fathom as consent-free: their "no banner" statements are vendor claims.

## Measuring a tool

Record one HAR per page type. The snippet below is not shipped as a script and is not self-tested.

```js
// record-har.mjs. Node with Playwright; pin exact versions in package.json.
import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ recordHar: { path: out } });
const page = await ctx.newPage();
await page.goto(url + '?utm_source=x&utm_campaign=y', { waitUntil: 'networkidle', referer: 'https://ref.example.org/some/path' });
const cookies = (await ctx.cookies()).length;
const storage = await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length);
const idb = await page.evaluate(async () => (await indexedDB.databases()).length);
await ctx.close();
await browser.close();
console.log(JSON.stringify({ cookies, storage, idb }));
process.exit(cookies || storage || idb ? 1 : 0);
```

Test a tool with its production host or its documented local-script variant. A tool that sends nothing from `localhost` has not been shown to send nothing.

## Siblings

- `marketing-quality` rule: head tags, robots, the `positioning.toml` record and claims on copy surfaces.
- `docs-instrument` and DOC-OBS-16 in `docs-quality`: a page-analytics script or the zero-result search beacon (DOC-NAV-10) satisfies MKT-MEAS-01 to 04 first.
- `ux-cli`: CLI telemetry consent flows.
- `github-presence`: GitHub traffic, stars and registry download reporting (CH-GH-23, CH-GH-25, CH-GH-26).
- `release-notes`: tracking pixels in lifecycle email are owned-audience work, not this file.
