---
title: Style standards and cited references, delta check for docs-quality
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 32
---

# Style standards and cited references, delta check

Scope: this is a delta update against the baseline of 2026-09-05. It checks whether each cited style guide, standard, survey or error index moved its URL or published a newer edition. It does not re-research anything that did not change. Every verdict below comes from a page fetched on 2026-11-27. Where a fetched page shows no date, the date of an upstream change is stated as "not shown on the page".

## Contents

- Summary
- Findings (one row per citation)
- Normative guidance candidates
- AI-agent angle
- Contested / evolving
- Sources

## Summary

- Only one citation moved: the GOV.UK source for the 25-word and 5-sentence thresholds now lives on the GOV.UK Publishing guidance site, and the old gov.uk URL answers 301 Moved Permanently. The thresholds themselves are unchanged.
- No threshold changed its number. 25 words, 5 sentences, 15 links, five troubleshooting entries, WCAG levels A, AAA and AA all still match the cited sources.
- State of Docs published a 2026 edition on 2026-11-20. The cited 39 percent figure is a 2025 figure and the 2025 page still states it. The 2026 report states 25 percent of respondents track no documentation metrics at all. The pair must keep labelling its figure as 2025, or move to 2026.
- DORA published a 2025 report, but its summary says nothing about documentation quality. The cited 7.5 percent figure is from DORA 2024 via Swimm and stays valid as a 2024 figure.
- Keep a Changelog has no 1.2 or 2.0. The newest release is v1.1.1 and the site is at 1.1.0.
- The Go row is the only one that could not be settled: whether `go vet` prints `Analyzer.URL` was not shown by any fetched primary source.

## Findings

Verdict key: unchanged, changed, dead link, could not determine.

### 1. Plain English (plain-english.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "Threshold 25 words (GOV.UK clear-language guidance)" (DOC-PLAIN-02) | unchanged (threshold); changed (URL) | The clear-language page at guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/ says "Try to split up sentences that are over 25 words long." The old www.gov.uk/guidance/content-design/writing-for-gov-uk now returns 301 to guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/tone-of-voice/, which has no threshold. Date of the move: not shown on the page. The pair's text names the guidance, not a URL, so no edit is forced. |
| 5 sentences per paragraph (DOC-PLAIN-03) | unchanged | Same clear-language page: "Paragraphs should have no more than 5 sentences each." |
| "Google's timeless-documentation list" (DOC-PLAIN-11) | unchanged | developers.google.com/style/timeless-documentation still lists "as of this writing", "currently", "does not yet", "eventually", "existing", "future", "latest", "new/newer", "now", "old/older", "presently/at present", "soon". No date shown. |
| "GitLab style guide states the 15-link cap" (DOC-PLAIN-16) | unchanged, with a precision note | The cap is not on the main style guide page. It is on docs.gitlab.com/development/documentation/styleguide/links/: "On any one page, try not to use more than 15 links to other pages." It is a soft guideline ("try not to"), not a hard rule. The pair's wording "states the 15-link cap" is correct for the links page, but the citation should point there and not to the style guide index. |
| "Wikipedia, Signs of AI writing" with "57 and 64 percent" (DOC-PLAIN-09) | unchanged | en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing is at the same title. Its "Your detection ability" section says "recognition rate of 57 % for AI texts and 64 % for human-generated texts", attributed in the page to a 2025 study on German theses (note key fiedler2025). The page is semi-protected until 2027-09-12. Only the first 100,000 of 250,368 characters were read, which covers this section. |
| "Freeburg 2026" | unchanged | slopdetector.org/blog/em-dash-ai-tell-data loads. It cites Freeburg (2026): GPT-4.1 at 10.62 em dashes per 1,000 words, human control 3.23, Llama 3.1 8B at 0.00. The Twain figure of 10.13 is the site's own measurement, not Freeburg's. This matches the earlier research file. |

### 2. Page types (page-types.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "(Keep a Changelog 1.1.0)" and the six category spellings (DOC-TYPE-37) | unchanged | keepachangelog.com/en/1.1.0/ lists Added, Changed, Deprecated, Removed, Fixed, Security. No 1.2 or 2.0 is linked or mentioned. The GitHub releases page lists v1.1.1 as latest (11 Nov and 06 Mar are the only dates shown, with no year). No draft or 2.0 appeared while signed out. Drafts are invisible without write access, so a hidden draft cannot be excluded. |
| "5 from the GitLab troubleshooting topic type" (DOC-TYPE-09) | unchanged | docs.gitlab.com/development/documentation/topic_types/troubleshooting/ says "If a page has five or more troubleshooting topics, put those topics on a separate page." |

### 3. Observability (observability.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "GitLab states that documentation reviews must not be blockers" (docs.gitlab.com/development/documentation/workflow/) | unchanged | URL still serves, no redirect notice. Text: "The documentation reviews must not be blockers." Maintainers may merge features with documentation as-is before final technical writer approval. |
| "State of Docs 2025" at 39 percent | changed (a newer edition exists) | The 2025 page (stateofdocs.com/2025/documentation-metrics-and-measurement) still says 39 percent "don't track metrics or measure the success of their documentation at all". The State of Docs Report 2026 was published 2026-11-20 and links from that page. Its measuring-docs-success section states 25 percent "don't track any documentation metrics", 35 percent do not track internal process metrics, 49 percent do not track internal docs metrics (down from 55 percent in 2025), and 57 percent do not track leads from docs. It also says the share tracking no metrics fell 7 percentage points year over year. The 2026 page does not reconcile 39 versus 25, so the two figures may use different definitions. Do not mix them. |
| "DORA 2024, via Swimm" | unchanged | swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation loads: "a 25% increase in AI use leading to a 7.5% improvement in documentation quality", with throughput down 1.5 percent and stability down 7.2 percent. dora.dev/research lists a 2025 report ("AI acts as an amplifier...") whose summary does not mention documentation quality. DORA 2025 does not supersede the cited figure from what the research index shows. The full 2025 report was not read. |
| "Ably's band 5 via Nordic APIs" | unchanged | nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/ (Art Anthony, 2021-11-09) lists "5/5 - under 30 mins", "4/5 - 30 mins to an hour", "3/5 - 1-2 hours", "2/5 - 2-4 hours", "1/5 - 4+ hours". Note it is Ably's benchmark for "time to hello world". |
| ekline.io runbook cost model | unchanged | Page loads. 3 stale steps in 30 (ten percent), 8 to 15 minutes per wrong step, so 24 to 45 added minutes against a 20 minute task. No per-minute dollar figure is given on the page. |

### 4. Error identifier table (observability.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| Rust error index URL | unchanged | doc.rust-lang.org/error_codes/error-index.html loads and lists E0001 to E0806. |
| `rustc --explain` | could not determine from the page | The index page does not mention it. The command was not re-verified from a primary source in this run. |
| Node `errors.html` anchors, `error.code` stable | unchanged | nodejs.org/api/errors.html (Node v26.13.1 docs) links `ERR_INVALID_ARG_TYPE` to `#err_invalid_arg_type`. It states "The error.message property of errors raised by Node.js may be changed in any versions. Use error.code to identify an error instead." |
| mypy error code pages | unchanged | mypy.readthedocs.io/en/stable/error_code_list.html (mypy 2.4.1) documents `[import-untyped]` and links the optional-checks page error_code_list2.html. The second page itself was not fetched. |
| staticcheck.dev checks | unchanged | staticcheck.dev/docs/checks loads, `#SA1019` anchor present. The newest "available since" marker is 2026.2. |
| "`go vet` does not print" `Analyzer.URL` | could not determine | The `URL` field exists: pkg.go.dev doc comment "URL holds an optional link to a web page with additional documentation for this analyzer." Go issue 57906 was accepted in March 2023 (commit titled "go/analysis: add Analyser.URL and Diagnostic.URI fields") but the issue records no decision on `cmd/vet` printing it, and the unitchecker page says nothing about URLs. The claim "does not print" is not contradicted and not confirmed by any fetched source. The Go 1.26 release notes were not opened. |
| `Deno.errors.NotFound` | changed (precision) | docs.deno.com/api/deno/~/Deno.errors.NotFound does not have a page of its own. It is a section on the "Errors" page. The pair's claim "A page per class" is therefore inexact. The table row should say an entry per class. |

### 5. Examples and navigation

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "WCAG 2.2.2 Pause Stop Hide, Level A" | unchanged | W3C WCAG 2.2 (Recommendation of 2024-12-12) lists Level A. |
| "WCAG 2.3.3 ... AAA" | unchanged | Level AAA. |
| "WCAG 2.1 SC 1.4.13 ... Level AA" | unchanged | Level AA. The same criterion is in WCAG 2.2. The page says WCAG 3 is a multi-year effort and is not a Recommendation. Only the first 100,000 of 269,706 characters were read. |
| navigation.md "NN/g's two open levels" | unchanged | nngroup.com/articles/progressive-disclosure/ loads: "designs that go beyond 2 disclosure levels typically have low usability". The pair's source is this article, not the mega-menus article. |

## Normative guidance candidates

1. Rule: In DOC-PLAIN-16, cite the GitLab links page (`/development/documentation/styleguide/links/`) and describe the cap as a soft guideline of 15. Rationale: the main style guide page has no such text, so a reader following the citation finds nothing. Verification: `grep -n "15" ` on the fetched links page for "not use more than 15 links".
2. Rule: In observability.md, state the State of Docs year beside the 39 percent figure, or replace it with the 2026 figure of 25 percent, and never combine them. Rationale: the 2026 edition is out and reports a different number, and DOC-OBS-08 already requires a stated date. Verification: grep the file for "39" and check the year label sits in the same sentence.
3. Rule: In the error table, change the Deno row from "A page per class" to "An entry per class on one Errors page". Rationale: the cited class has no page of its own. Verification: open docs.deno.com/api/deno/~/Deno.errors.NotFound and confirm the title reads "Errors".
4. Rule: Before keeping the "go vet does not print Analyzer.URL" clause, run a Go analyzer with a `URL` set under the current Go toolchain and read the output. Rationale: no fetched source settles it. Verification: `go vet -vettool=<binary> ./...` and grep the output for the analyzer URL.
5. Rule: Where the GOV.UK threshold is cited with a URL, use the `guidance.publishing.service.gov.uk/.../clear-language/` page. Rationale: the old gov.uk URL redirects to a page without the threshold. Verification: `curl -sIL https://www.gov.uk/guidance/content-design/writing-for-gov-uk` shows a 301 and the target.

## AI-agent angle

- An agent trained before the move will cite the old `www.gov.uk/guidance/content-design/writing-for-gov-uk` URL. Smallest check: a link checker that follows redirects and reports 301 on cited URLs.
- An agent will attribute the 15-link cap to the GitLab style guide index page. Check: grep the cited page for the number.
- An agent will quote a survey figure without its year. Check: DOC-OBS-08 style grep for a percentage with no four-digit year in the sentence.
- An agent may assume Keep a Changelog has a newer version. Check: the site header shows 1.1.0.

## Contested / evolving

- State of Docs 2026 (2026-11-20) trends toward more teams measuring, with the no-metrics share down 7 points year on year. The 39 versus 25 percent gap is not reconciled by the source.
- WCAG 3 remains a multi-year effort. WCAG 2.2 is the current Recommendation as of the fetch.
- Whether `go vet` surfaces `Analyzer.URL` is open in the fetched evidence.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/ | GOV.UK clear language | undated | 25 word and 5 sentence thresholds (primary) |
| https://www.gov.uk/guidance/content-design/writing-for-gov-uk | Old GOV.UK URL | 301 redirect | Proves the move |
| https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/tone-of-voice/ | Redirect target | undated | No threshold present |
| https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/ | Parent page | undated | No threshold present |
| https://developers.google.com/style/timeless-documentation | Google style guide | undated | Time-relative word list (primary) |
| https://docs.gitlab.com/development/documentation/styleguide/ | GitLab style guide | current | Has no link cap |
| https://docs.gitlab.com/development/documentation/styleguide/links/ | GitLab links rules | current | 15-link guideline (primary) |
| https://docs.gitlab.com/development/documentation/topic_types/troubleshooting/ | GitLab topic type | current | Five-topic rule (primary) |
| https://docs.gitlab.com/development/documentation/workflow/ | GitLab workflow | current | Non-blocking reviews (primary) |
| https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing | Wikipedia project page | revision 1388199657 | 57 and 64 percent (primary) |
| https://slopdetector.org/blog/em-dash-ai-tell-data | Secondary on Freeburg 2026 | 2026 | Em dash figures |
| https://keepachangelog.com/en/1.1.0/ | Keep a Changelog | 1.1.0 | Categories (primary) |
| https://github.com/olivierlacan/keep-a-changelog/releases | Repo releases | latest v1.1.1 | No 2.0 (primary) |
| https://www.stateofdocs.com/2025/documentation-metrics-and-measurement | State of Docs 2025 | 2025 | 39 percent (primary) |
| https://www.stateofdocs.com/2026 and /2026/measuring-docs-success | State of Docs 2026 | 2026-11-20 | Newer figures (primary) |
| https://dora.dev/research/ | DORA index | 2025 report listed | Supersession check (primary) |
| https://swimm.io/blog/heres-what-the-2024-dora-report-has-to-say-about-code-documentation | Swimm on DORA 2024 | 2024 | 7.5 percent figure |
| https://nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/ | Nordic APIs | 2021-11-09 | Ably bands |
| https://ekline.io/blog/why-your-incident-runbook-lies-to-you-at-3-a-m-and-how-to-tell-before-the-page-fires | ekline blog | undated | Runbook cost model |
| https://doc.rust-lang.org/error_codes/error-index.html | Rust error index | current | Primary |
| https://nodejs.org/api/errors.html | Node errors | Node 26.13.1 | Primary |
| https://mypy.readthedocs.io/en/stable/error_code_list.html | mypy error codes | mypy 2.4.1 | Primary |
| https://staticcheck.dev/docs/checks | staticcheck checks | through 2026.2 | Primary |
| https://pkg.go.dev/golang.org/x/tools/go/analysis#Analyzer | Analyzer API | current | URL field (primary) |
| https://github.com/golang/go/issues/57906 | Go proposal | accepted 2023-03-15 | Origin of the URL field |
| https://pkg.go.dev/golang.org/x/tools/go/analysis/unitchecker | unitchecker docs | current | No URL printing mentioned |
| https://docs.deno.com/api/deno/~/Deno.errors.NotFound | Deno API docs | current | Section, not a page |
| https://www.w3.org/TR/WCAG22/ | WCAG 2.2 | 2024-12-12 | Levels (primary) |
| https://www.nngroup.com/articles/progressive-disclosure/ | NN/g | undated | Two-level ceiling |
| https://www.nngroup.com/articles/mega-menus-work-well/ | NN/g mega menus | 2017-03-26 | Not the source of "two open levels" |
