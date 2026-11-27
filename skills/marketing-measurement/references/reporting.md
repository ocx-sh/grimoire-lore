---
title: Tagging and reporting
summary: UTM format and campaign files, HDYHAU, the five metric fields, count wording, A/B pre-registration and AI-citation reports (MKT-MEAS-08 to 21)
---

# Tagging and reporting

This file owns MKT-MEAS-08 to 21: when a link may carry a tag, how a tag is written, and what a report, page or dashboard may say about a number. Rows cite a registry row in `facts.md` as `[MEAS-F13]`.

Contents: [Dates and versions](#dates-and-versions) · [Tagging](#tagging) · [Reporting](#reporting) · [Verification blocks](#verification-blocks) · [Detail](#detail) · [Siblings](#siblings)

## Dates and versions

- Every platform, vendor and study fact this file rests on is a row in `facts.md`, fetched 2026-11-27. Figures in this file are arithmetic or measurements dated 2026-11-27. The rest cite a row.
- Re-check this file when: a vendor changes its parameter keep-list or channel rules, GitHub changes the traffic retention or the stargazer endpoints, Safari ships a major release, or a cited preprint becomes peer reviewed or a promised follow-up appears.
- Scripts: `python3` 3.11 standard library only. `CHECKS=.claude/skills/marketing-measurement/checks`.
- Measured 2026-11-27: two repository pages drew 19 and 35 GitHub-reported uniques a week. The A/B arithmetic below uses those.

## Tagging

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-MEAS-08 | Write UTM or other attribution parameters on a link only when an owner-approved collector (MKT-MEAS-01) records them on the target. Otherwise use the bare canonical URL. | With no collector a tag is read by nothing, it leaks a campaign name into third-party logs, and in France recording it needs consent [MEAS-F06]. | `python3 -I "$CHECKS"/utm_check.py tags --decision .agents/decisions/measurement.md FILE...` over drafts, posts and email templates exits 0. A tag with no `acquisition_data: yes` in the record is the finding. | MUST |
| MKT-MEAS-09 | Put no UTM or attribution parameter on any link whose target is a host the project owns: nav, footer, cards, docs cross-links, READMEs, release notes, package metadata, sitemaps, `rel=canonical` and `og:url`. | An internal UTM overwrites the visit's original source, and the visit shows as Direct [MEAS-F13]. A tagged owned URL is also a duplicate URL. | `python3 -I "$CHECKS"/utm_check.py owned --host example.com FILE...` over site source and built output exits 0. It flags `utm_*`, `ref` and `source` on relative links and owned hosts. | MUST NOT |
| MKT-MEAS-10 | Write every tag in one closed format (the table under [Tag format](#tag-format)). | Values are case sensitive and split rows. Channel rules key on the medium words, and an unknown medium lands in Unassigned [MEAS-F16]. Plausible strips every parameter outside its keep-list [MEAS-F14]. | `python3 -I "$CHECKS"/utm_check.py tags --decision .agents/decisions/measurement.md FILE...` exits 0. It parses each tagged URL. | MUST |
| MKT-MEAS-11 | Keep one campaigns file per project (CSV) listing each tagged URL with its source, medium, campaign, content, date, owner and the post it sits in. Read it before creating a tag. | It prevents variant spellings and reused campaign names, which neither tool enforces. | `python3 -I "$CHECKS"/utm_check.py campaigns campaigns.csv` exits 0. Columns: `url,source,medium,campaign,content,date,owner,post`. It exits 1 on two spellings of one campaign name and on a reused source, medium, campaign and content tuple. | SHOULD |
| MKT-MEAS-12 | Build no sign-up, trial or contact form in order to collect "how did you hear about us" (HDYHAU). Where such a form exists for another reason, add one optional free-text HDYHAU field and store the raw string. Report the answers apart from tagged-click numbers: never sum the two, never rank channels by HDYHAU alone, and print `n_shown`, `n_answered` and `n_blank` as columns of every HDYHAU table, with `n_answered + n_blank = n_shown`. Low confidence: no independent HDYHAU study found as of 2026-11-27. | HDYHAU records perception and recall. Every HDYHAU-specific source read is a vendor measuring its own software. Independent survey evidence is adjacent only [MEAS-F34, MEAS-F35]. Free text is the default because it suggests no options. Its cost is blanks of unmeasured direction, which is why the blank count prints. | Form half: `python3 -I "$CHECKS"/report_check.py hdyhau-form FILE...` over form sources exits 0, unless the record says `hdyhau_required: yes`. Report half: `python3 -I "$CHECKS"/report_check.py hdyhau REPORT...` exits 0. Known gap: HDYHAU figures in prose outside a table are not seen, and that answers and click numbers are never summed stays a reading check (unverified: reading heuristic). | SHOULD |

### Tag format

| Part | Rule |
|---|---|
| Characters | Lower case `a-z`, `0-9`, `-` and `_` only |
| Required set | `utm_source`, `utm_medium` and `utm_campaign` always appear together |
| `utm_medium` | One of `social`, `email`, `video`, `referral`, `affiliate`, `cpc`, `paid-social`. Never `ai-assistant`, which GA4 assigns itself. A new medium is an owner decision, because it changes channel grouping in all history |
| `utm_source` | A platform or list name with no TLD, never a person's handle: `linkedin`, `youtube`, `hn`, `newsletter` |
| `utm_campaign` | `<topic>-<yyyymm>` or `<topic>-<release>`, at most 40 characters (a house limit, not a platform limit) |
| `utm_content` | The only per-link differentiator |
| `utm_term` | Paid keywords only |
| Anything else | Invent no parameter such as `?from=`, `?src=` or `?campaign=`. `ref` is the one allowed extra |

Worked pass: `https://example.org/post?utm_source=linkedin&utm_medium=social&utm_campaign=launch-202611`.

## Reporting

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-MEAS-13 | Print five fields beside every metric written into a report, README, page or dashboard: name, definition, source (the command or endpoint), window and as-of date. Label vendor-measured figures, for example "Ahrefs, vendor data, 2026-10-29". A channel breakdown also states the tool, the GA4 attribution model, and the share of `(direct)` and `(not set)`. Write no figure from memory and no claim about a platform's behaviour without a primary source. Claim nothing about how Safari changes UTM attribution. Where a report must mention Safari, it cites both WebKit posts and says the behaviour is only partly documented. | Dropped windows and denominators are the main agent failure. A figure with no date cannot be corrected later. This extends DOC-OBS-08 from docs metrics to marketing metrics. WebKit documents stripping only in Private Browsing and under advanced protection, and its Safari 26.0 post names no stripped parameter [MEAS-F24, MEAS-F25]. "Safari 26 strips UTMs" and "Safari keeps UTMs" both fail. | `python3 -I "$CHECKS"/report_check.py fields REPORT...` exits 0: no figure beside a count noun without a `20xx-xx` date in its sentence or row, no Safari line without the Private Browsing post, and every metric table carries `source`, `window` and `as_of`. | MUST |
| MKT-MEAS-14 | Never present stars, clones, views, release or registry downloads, AI citations, daily-unique visits or an activation proxy as users, installs, adoption or "trusted by". An adoption claim needs a named adopter with consent, a dependents link, or a stated opt-in measurement (as DOC-TYPE-15 requires). An activation figure needs a written definition: event, numerator, denominator and window, marked "proxy". | None of these counts identifies a person. In one measured repository clones ran 44 to 1 against views over 14 days (2026-11-27). Fake stars exist at scale [MEAS-F36]. | `python3 -I "$CHECKS"/report_check.py adoption PAGE...` exits 0. A line passes only with a link in the same line: the adopter's consent record, the dependents page or the opt-in measurement. Known gap: the sentence limit stops at a decimal point or a dot in a URL, so a reader still checks a claim that spans two sentences. | MUST NOT |
| MKT-MEAS-15 | Use each count's own wording. Registry downloads: "N REGISTRY downloads in PERIOD to DATE; includes CI, mirrors and bots, share unmeasured". Drop the last clause only when a split was queried, for example the PyPI BigQuery `details.ci` field. Binary downloads: sum GitHub release assets only after excluding `*.sha256`, `dist-manifest.json` and installer scripts. Mark any crates.io series that crosses 2024-03-11 as discontinuous. Call `traffic/clones` "clone requests", never people. Label GitHub's `uniques` "as reported by GitHub". | npm defines no "download" [MEAS-F21], PyPI says mirrors, caches and scripts move its counts [MEAS-F22], crates.io changed its counting method [MEAS-F23], and `download_count` is undefined [MEAS-F20]. In one measured repository 15.4% of release downloads (18,325 of 119,372, 2026-11-27) were `.sha256` files. | see block MKT-MEAS-15. Compare the wording of a registry count to the template (unverified: reading heuristic). | MUST |
| MKT-MEAS-16 | Call a daily-salt tool's visitor count "daily-unique visits" for any window longer than one day. Compute no retention, cohort, new-versus-returning or week-over-week unique-growth figure from such a tool. | The salt rotates every 24 hours, so a person who returns on another day counts again, and a range total is a sum of daily counts [MEAS-F10]. A local day can span two UTC salts [MEAS-F11]. | see block MKT-MEAS-16. Pass: "420 daily-unique visits in the 7 days to 2026-11-26". | MUST |
| MKT-MEAS-17 | State no figure for a span with no archived GitHub traffic snapshot, and read star counts only from the count and history endpoints. The archive workflow is CH-GH-25 and the stargazer-list rule is CH-GH-26, both in `github-presence`. This row keeps only the report-side clause. | GitHub keeps traffic data for a short window [MEAS-F17], and the stargazer listing is restricted to collaborators [MEAS-F18]. A one-off 200 from the API proves nothing about any span. | Every traffic figure in the report names a snapshot file or archive run inside its window (unverified: reading heuristic). `git log -1 --format=%cs -- ARCHIVE_DIR` prints a date no older than the window in MEAS-F17. The workflow lint is CH-GH-25. Star clause: the MKT-MEAS-17 grep under [Verification blocks](#verification-blocks) prints nothing (CH-GH-26 is the stricter check for repositories the actor does not administer). | MUST |
| MKT-MEAS-18 | Before running an A/B test, write down the baseline, the minimum detectable effect (MDE), alpha, power, the computed n per arm and the stop rule. Refuse the test when n per arm exceeds the surface's measured traffic over the window (house default: 8 weeks). Report no winner below n. Where the gate fails, ship the change and observe it. | Checking significance after every observation raised a nominal 5% false-positive rate to 26.1% in the worst case [MEAS-F26]. A small repository page falls short of the needed traffic by a factor of 223 to 411 (see [A/B arithmetic](#ab-arithmetic)). | `python3 -I "$CHECKS"/report_check.py abgate --baseline 0.05 --mde 0.10 --weekly 35` prints n per arm and exits 1 when two arms cannot fill inside the window. All six pre-registration fields are written before the first visitor (unverified: reading heuristic). | MUST |
| MKT-MEAS-19 | MUST core: report AI-answer citations per engine, and record engine, engine version (`unknown` where the engine exposes none), location and run dates. Keep mentions and links in separate columns. Draw no conclusion from a single run. Print the number of prompts and runs behind every share or rate. Call a difference between two periods or two domains real only when each side carries an interval, its method is named, and the intervals do not overlap. SHOULD defaults, each labelled "practitioner default, no independent test": see [AI-citation defaults](#ai-citation-defaults). | Citations vary between runs and over days to weeks, on vendor data and on three preprints that find the same direction [MEAS-F27, MEAS-F29, MEAS-F30, MEAS-F31]. The rates disagree and engines differ widely, so a change claim without counts and intervals cannot be told from noise. | MUST part: `python3 -I "$CHECKS"/report_check.py aicite REPORT.csv` exits 0 (columns `engine`, `engine_version`, `location`, `run_date`, `mentions`, `links`, `n_prompts`, `n_runs`, `ci_low`, `ci_high`). Reading heuristic (unverified): a claim that a figure "rose", "fell" or "changed" where the two intervals overlap fails, and a "visibility changed" claim built on one run per engine fails. SHOULD part: the same script reports a `prompt_set_hash` that differs across compared periods, and the report states which default it misses. | MUST core, SHOULD defaults |
| MKT-MEAS-20 | Give a count on a page as a dated number with a link to its record, for example "20 GitHub stars (GitHub API, 2026-11-27)". A live badge may sit beside the dated statement but never replaces it as support for a popularity or adoption claim. Hide no true small number. Whether to publish one at all is the owner's call. | A badge has no window and no definition. No source sets a threshold for hiding a count. | `python3 -I "$CHECKS"/report_check.py badges PAGE...` exits 0: a stars or downloads badge needs a full date within one line. | SHOULD |
| MKT-MEAS-21 | When a page, report or skill states how fast AI-answer citations change, name the engine, the quantity measured (next-day loss, share still cited after N weeks, or pairwise overlap between samples), the source and its date, and label the source `vendor` or `preprint` where it is one. Never pool engines into one rate. | The sources measure different quantities on different engines, from 0% to 47% still shared after the same span [MEAS-F30] and from 50% to 83% next-day loss [MEAS-F27]. One number is wrong for most readers. | `python3 -I "$CHECKS"/report_check.py churn PAGE...` exits 0. Known gaps: the check is line-based, a claim without a percentage ("fell by half") is not caught, a percentage on a different line from the noun is not caught, and a line naming two engines with one rate passes, so pooling stays a reading check (unverified: reading heuristic). | SHOULD |

Cross-territory, left to the owners named: CLI telemetry consent flows are `ux-cli`. Citation targets for answer engines belong to the `marketing-quality` rule's discoverability file, which cites MKT-MEAS-19 for any report and MKT-MEAS-21 for any churn figure. Per-platform post analytics and the GitHub profile as a channel are `github-presence` and the platform skills.

## Verification blocks

```sh
# MKT-MEAS-15: sum release-asset downloads without checksums, manifests and installers (read-only)
gh api repos/OWNER/REPO/releases --paginate \
  -q '.[].assets[]|select(.name|test("(sha256|dist-manifest\\.json|install.*\\.(sh|ps1))$")|not)|.download_count'
# MKT-MEAS-15: a crates.io trend line with no "discontinuous" is the finding
grep -H -n -i -E 'crates\.io' -- REPORT | grep -E -i -e 'trend|growth|since|rose|fell|grew|per (week|month)' | grep -v -i -e discontinuous
```

```sh
# MKT-MEAS-17: any line this prints is the finding; star reads use only /stargazers/count or /stargazers/history
grep -rnE '/stargazers' scripts .github 2>/dev/null | grep -vE '/stargazers/(count|history)'
```

```sh
# MKT-MEAS-16: in a report that cites a daily-salt source, any hit is the finding
grep -H -n -i -E 'unique visitors|monthly (active )?users|returning visitors|retention|cohort' -- REPORT
```

## Detail

### A/B arithmetic

The n per arm for a 5% baseline and a 10% relative lift, alpha 0.05, power 0.80, is 31,234 (the ceiling of 31,233.44). Both arms need 2 x 31,234 visitors. At 19 and 35 uniques a week (measured 2026-11-27) that is 3,287.8 and 1,784.8 weeks. At a 10% baseline the figures are 1,553 and 843 weeks. The 8-week window is a labelled house default. The sourced part is n = duration x traffic. Change the inputs with `abgate --baseline P --mde R --weekly N --weeks W`. A sequential method or a different MDE is an owner decision.

### AI-citation defaults

Each default is a practitioner default with no independent test [MEAS-F33, MEAS-F32, MEAS-F31, MEAS-F29]:

- Freeze the prompt list between compared periods at 20 to 50 prompts, and run at least 4 weeks before comparing periods.
- Repeat each prompt at least 7 times per measurement day, or 8 when the claim is about cited sources. The figure comes from one German-language set of 32 prompts and is not a universal standard.
- Where a citation share is reported to a 5-point interval, use at least 50 prompts per engine for Gemini and about 100 for Perplexity, and state that SearchGPT did not reach that width within 200 queries.
- Add 3 to 5 paraphrases per information need.
- "Days cited out of 7" may be reported as a convenience figure, never as a visibility rate.

Documented gap: no source tests the 20-to-50-prompt list, the 4 weeks or the days-out-of-7 figure. All three preprints are linked to monitoring businesses, so "independent" means independent of the vendor only. No single churn number may be quoted (MKT-MEAS-21).

## Siblings

- `github-presence`: CH-GH-23 (the reporting form for GitHub and registry numbers), CH-GH-25 (the traffic archive), CH-GH-26 (the stargazer list).
- `marketing-quality` rule: MKT-CLAIM-24 owns a popularity count on a copy surface. MKT-MEAS-14 owns the ban on calling a count users.
- `docs-quality`: DOC-OBS-08 (metrics in docs) and DOC-TYPE-15 (adoption claims on a landing page).
