---
title: Claims, Records and the Evidence Gate
summary: The MKT-CLAIM rules for the evidence record, the claims lint, performance and statistic figures, rewrites, price reductions, caveats, named comparisons and AI-capability claims on copy surfaces
---

# Claims, Records and the Evidence Gate

Owns the gate that decides which sentences on a copy surface need an evidence record, the record schema and its expiry, and the rows for performance and statistic figures, rewrites, price reductions, caveats, named comparisons and AI-capability claims. Licence, security, compliance, endorsement, count-display and accolade rows are in `trust-claims.md`. The positioning record is `positioning.md`, the first screen is `first-screen.md`, and voice is `voice.md`.

A **copy surface** is a README, a landing or pitch page, a docs-site home page, a page title or meta description, a package-manifest description (`Cargo.toml`, `package.json`, `pyproject.toml`, an extension manifest), the repository description, release notes, a changelog, a pricing or service page, a trust or security page, or an email. Docs body pages are outside this gate. They keep DOC-PLAIN-12 (marketing words) and DOC-TYPE-15 (adoption-claim links) from `docs-quality`, which this file does not restate.

The rules run unchanged on every surface. Whether US, EU or UK law reaches a surface depends on who the page is aimed at, and an agent never decides that. The rules are the strictest common form of the FTC, EU and UK texts read for this set. No UK or EU text read was looser than the US one on these points.

Contents: [Dates and Versions](#dates-and-versions) · [The Lint and Its Five Checks](#the-lint-and-its-five-checks) ·
[Gate and Record](#gate-and-record) · [Performance, Statistics, Rewrites](#performance-statistics-rewrites) ·
[Prices, Captions and Comparisons](#prices-captions-and-comparisons) · [AI Capability](#ai-capability) ·
[Reading Checks and Open Gaps](#reading-checks-and-open-gaps) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Measured and fetched 2026-11-27. Every law or platform fact below carries the default `refresh_by` of MKT-CLAIM-05: 6 months from its fetch date, which is **2027-05-27**. Re-fetch the source and re-read the cited passage. The refresh is a fetch, not a legal opinion.

| Source | Date | Used for |
|---|---|---|
| [FTC substantiation policy statement](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation) | 1984-11-23 | Basis before the claim; later evidence does not cure a missing basis |
| [FTC deception statement, footnotes 41 and 42](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm) | archived copy | Where puffery ends |
| [Directive 2005/29/EC consolidated text](http://publications.europa.eu/resource/celex/02005L0029-20260927) | 2026-09-27 | Art. 6(1)(d) price; Annex I point 20 |
| [Directive 98/6/EC consolidation](http://publications.europa.eu/resource/celex/01998L0006-20220528) | 2022-05-28 | Art. 6a prior price; applies since 2022-05-28 |
| [Directive 2006/114/EC Art. 2(c), 4](https://www.legislation.gov.uk/eudr/2006/114/article/4) | UK-hosted copy | Comparative advertising limbs |
| [SI 2008/1276 reg. 4](https://www.legislation.gov.uk/uksi/2008/1276/regulation/4) | condition (b) substituted 2025-04-06 by SI 2025/381 | UK comparative advertising |
| [16 CFR 14.15](https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=14&section=14.15) | 1979-08-13 | The FTC encourages truthful naming of competitors |
| [CAP Code section 3](https://www.asa.org.uk/type/non_broadcast/code_section/03.html) | read 2026-11-27 | 3.7, 3.9, 3.49 |
| [ASA, Substantiation](https://www.asa.org.uk/advice-online/substantiation.html) | 2026-09-21 | A testimonial alone does not substantiate an objective claim |
| [FTC, "Keep your AI claims in check"](https://web.archive.org/web/2024/https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check) | 2023-02-27, archived | AI in the product versus AI in its development |
| [FTC Workado order](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims) and [final order](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-approves-final-order-against-workado-llc-which-misrepresented-accuracy-its-artificial) | 2025-04-28, 2025-08-28 | AI accuracy claims |
| [FTC DoNotPay](https://www.ftc.gov/node/87474) | 2025-02-11 | An untested "robot lawyer" claim |
| [SPEC CPU 2017 run rules](https://www.spec.org/cpu2017/Docs/runrules.html) | read 2026-11-27 | Disclosure "sufficient for independent reproduction" |

The pattern precision figures under MKT-CLAIM-02 were measured 2026-11-27 on 26 in-sample home pages and 19 held-out pages. Any change to the pattern set re-runs both corpora and updates the figures. The lint is `checks/claims_lint.py` (Python 3.11 standard library, `--self-test` over `checks/fixtures/claims/`).

## The Lint and Its Five Checks

"The lint" is `claims_lint.py`, run from the repository root with `python3 -I`. "Record" means a `[[claim]]` row in the repository-root `claims.toml`. The lint implements checks A to E below and prints `path:line: MKT-CLAIM-NN [check] message`. Exit 0 is clean and 1 is findings. It does not run the per-chart and per-cell checks of MKT-CLAIM-06 and 30, the GitHub description binding or the second-reviewer check of MKT-CLAIM-16 (a reading check: the lint sees no change author), because each needs a parsed page or the network. Those stay reading checks and named commands.

| Check | What it does | Fails when |
|---|---|---|
| A, schema | Reads every row against the field tables in MKT-CLAIM-04 | A required field for the class is missing or empty; `id` is not unique; `observed` is not an ISO date; `refresh_by` is neither an ISO date after `observed` nor `"next-release"`; a licence `check` path does not exist; `source` is not an `https://` URL, a repository path or a `decision:` reference. Endorsement rows: `contact_ref` holds an `@` or 7 or more digits, or a badge `permission_ref` is not `<party>: <pointer>` with an existing pointer. Comparison rows: a compared-party field is missing, or `third_party_as_of` is more than 7 days after `observed` |
| B, binding | Resolves every `claim:<id>` marker to a row and every row to its surfaces | A marker names no row; a row's `claim` string is not byte-equal in a file in its `surface` list. On HTML, write the claim inside one element, because a claim split across elements matches nowhere |
| C, detection | Runs the MKT-CLAIM-02 set on every added line of a copy surface, with fenced code and `<style>` blocks removed | A hit is not covered. A marker at the end of the hit line, a marker alone on the line directly above, or (for JSON and remote surfaces) a live row whose `surface` lists the file and whose `claim` is on the hit line covers it. An `[[allow]]` entry with `file`, `text` and `reason` covers a hit that is not a claim at all, except in check E's classes |
| D, freshness | Compares each `refresh_by` with today and with the product version | `refresh_by` is before today, or it is `"next-release"` and the manifest version differs from `subject_version`. An expired row counts as absent for B, C and E. An interval longer than the class default fails (MKT-CLAIM-05) |
| E, blocked classes | Re-checks the hits of lines 3, 4, 6, 7, 9, 12, 13 and 14 of MKT-CLAIM-02 | Such a hit is covered only by an `[[allow]]` entry, or by no live row of the matching class. For `class = "count"`, `--run-checks` re-runs `check` and fails when its output differs from `value`. A `performance`, `comparison`, `statistic`, `count` or `ai-capability` row whose `source` is an endorsement fails (MKT-CLAIM-28) |

Check E's exceptions, in order. A line-12 hit that matches `[0-9]+\.[0-9]+\+` (a version floor) is dropped first. A line-9 hit whose only match is `agentic` or `intelligent` may take an `[[allow]]` entry that names the proper noun or the essay topic. A line-13 hit whose only match is a `free` phrase is also covered by a live `licence` row when the same sentence names that row's SPDX id. A line-13 hit whose only match is the bare word `free`, used in a sense that is not a price, plan, licence or limit (a time slot), may take an `[[allow]]` entry that names the sense. The lint accepts that entry only when the line has a time-slot word and no offer, price or plan phrase (the sense test in `claims_lint.py`). The test passed the six calendar sentences of one measured site and no offer line. Its word list was widened after the sixth line was seen, so that result is in sample. A scheduling line with none of the listed words is refused, and a reviewed change extends the list.

Markers, by surface. Each marker sits at the end of the hit line, or alone on the line directly above it. A marker at the end of one line never covers the next line.

| Surface | Marker |
|---|---|
| Markdown, HTML, Astro templates | `<!-- claim:ID -->` |
| MDX (JavaScript comments in braces, per [mdxjs.com](https://mdxjs.com/docs/what-is-mdx/), page undated, read 2026-11-27) | `{/* claim:ID */}` |
| TypeScript, JavaScript | `// claim:ID` |
| TOML (`Cargo.toml`, `pyproject.toml`, `claims.toml`), YAML frontmatter | `# claim:ID` |
| JSON (`package.json`, extension manifests), `github:description` | no marker; covered only by the row's `surface` list |

## Gate and Record

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-CLAIM-01 | Run the claims lint in CI on every change to a copy surface, before publication. A pattern hit (MKT-CLAIM-02) on an added line is covered by a marker that resolves to a live record, by the record's `surface` binding, or by rendering its value from that record. Without a record, rewrite the sentence (MKT-CLAIM-08) or delete it. | The basis must exist before dissemination, and no human reviews an agent's copy. The FTC requires a reasonable basis before a claim runs. | `python3 -I claims_lint.py --base "$BASE"` exits 0 (checks A to E). Watched red on the planted fixture and green on its twin in `checks/fixtures/claims/` (`--self-test`). A shell form of the marker half of check C is in block MKT-CLAIM-01. | MUST |
| MKT-CLAIM-02 | Treat a sentence on a copy surface as an objective claim when it matches the 15-line set in block MKT-CLAIM-02, applied to prose outside fenced code blocks and `<style>` blocks. Lines 1 to 10 were written first, and lines 11 to 15 cover compact figures, `+` counts, limits and the bare word `free`, trust phrasing and labels. Line 13 matches `free` as MKT-CLAIM-13 does, so "dependency-free" is skipped. Line 15 repeats `agentic` from line 9, which is harmless. On headline lines only (title, tagline, hero H1 and subhead, meta description, manifest description, repository description), also read each universal quantifier (`every`, `all`, `any`, `never`, `always`, `zero`, `no <noun> required`): each needs a named list or a record beside it. On every line also read the absolute and comparison words in block MKT-CLAIM-02: a hit fails nothing, needs a named condition or a record on the same or next line, and a comparison hit routes the sentence to MKT-CLAIM-30. | The FTC's puffery line is narrow: exaggeration that readers take seriously is actionable. A broad quantifier arm is noise as a grep (170 of 2,610 headline lines matched, almost none claims). The narrow set matched 4 lines and all 4 were claim words. | The lint loads this set (`--self-test` compares its pattern lines with block MKT-CLAIM-02) and runs `grep` with `-a`: without it GNU grep prints only `binary file matches` for a line with a control character. A line-12 hit that matches a version floor is dropped. Fences and `<style>` blocks are removed first: unstripped, the percent arm matched 4 CSS lines (`88%`, `62%`, `inset(50%)`). The percent arm has no `\b` on either side of the sign. `python3 -I claims_lint.py --reading` prints the absolute and comparison reading lines. | MUST |
| MKT-CLAIM-03 | Never write a price, limit, quota, plan or tier name, free-tier boundary, discount or count without a record whose `source` is the system of record: the pricing config, the limits file, the owner's written decision, a registry or API query, or a command over the code. `[[allow]]` entries never apply to these classes. When no source exists, ask the owner. Do not draft a number as a placeholder. | Price is a listed element of the EU misleading-action test (Directive 2005/29/EC Art. 6(1)(d), consolidated 2026-09-27, fetched 2026-11-27), and "free" while the reader pays more than the unavoidable cost is always unfair (Annex I point 20, "shall in all circumstances be regarded as unfair", Art. 5(5)). A measured set of 17 repositories states no price, so any price an agent writes is invented. | Check E: a hit on a count line (3 and 12) or a price-and-limit line (4 and 13) with no live `count` or `price-or-limit` row fails, whatever `[[allow]]` says. For `class = "count"`, `check` holds a command, and `--run-checks` re-runs it and fails when its output differs from `value`. At each refresh, fetch the Cellar URL with `Accept: application/xhtml+xml` and `Accept-Language: en` (`text/html` returns 404) and confirm the two phrases in block MKT-CLAIM-03 each print 1. A 0 means the text moved: re-read the rationale before the next publish. | MUST |
| MKT-CLAIM-04 | Give every record the common fields plus the fields its class requires, as in the two tables under this one. A comparison row whose claim is a text fact sets `value = "text"` and `unit = "text"`. A `source` is an `https://` URL, a repository path or a `decision:` reference, and nothing else. | The list merges the shared contract with SPEC's reproduction fields, SPDX's licence fields and the endorsement fields of 16 CFR 255.1 and 255.5 ([eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255), 88 FR 48102, 2023-07-26). `contact_ref`, `verification_method`, the comparison fields and the prior-price fields come from CAP 3.47, UCPD Annex I 23b, Directive 2006/114/EC Art. 4(c) and Directive 98/6/EC Art. 6a. Without the text-fact form a text cell ("Yes", "Built-in") has no lawful `value`. | Check A. A missing required field fails, a date `refresh_by` must be after `observed`, `"next-release"` is the only non-date value, and a LICENSE or raw-data path must exist. The endorsement and comparison arms of check A were run on planted fixtures (an incomplete row, a `contact_ref` that holds an address, a badge without a party prefix) and on 607 generated comparison rows from 9 real comparison pages: all passed. | MUST |
| MKT-CLAIM-05 | Give every record a `refresh_by`, and treat an expired record as absent. Take the interval from the table below or from a `[defaults]` table in `claims.toml` that the owner wrote. An agent never lengthens an interval, in `[defaults]` or in a row. It may shorten one and say why in `caveat`. The MUST is the expiry. The intervals are owner-tunable defaults, not sourced numbers. | Claims decay at the rate of their source. 16 CFR 255.1(b) asks an advertiser to reconfirm an endorser's views "at reasonable intervals". That sources the duty to expire, not the numbers. | Check D. The lint fails a date `refresh_by` before today, a `"next-release"` row whose manifest version differs from `subject_version`, and an interval over its class default unless `[defaults]` allows it. `[defaults]` changes pass only under the MKT-CLAIM-16 review. For a `comparison` row about a third-party product, the release arm is checked by comparing the major.minor of the `tag_name` in the GitHub latest-release response with `third_party_version` (block MKT-CLAIM-05). Unauthenticated `api.github.com` answered HTTP 403 with `x-ratelimit-limit: 60` on 2026-11-27, so a run without `GITHUB_TOKEN` skips that arm with a warning and applies the 90-day limit. A 404 and a non-GitHub source are skipped the same way. With a token, HTTP 403 or 429 fails and the job reruns. What a token changes on the real service was not measured. `claims_lint.py` does not call the API: it applies the interval limit only. | MUST |

Default `refresh_by` by class (MKT-CLAIM-05, owner-tunable, not sourced). `claims_lint.py` accepts `"next-release"` only for the classes marked next release, and a date interval up to the stated limit elsewhere.

| Class | Default `refresh_by` |
|---|---|
| performance, comparison | 90 days, or the next minor release of the subject or any compared product, whichever comes first |
| statistic | 12 months from the source's own date |
| count from code | next release; the `check` command re-runs in the release pipeline |
| count from a third-party platform (stars, downloads, dependents) | 30 days, and the retrieval date is shown on the page |
| price-or-limit | 30 days, and on any change to the pricing source |
| licence | next release, any change to the LICENSE file, or a new SPDX list version |
| security-mechanism, maturity | next release |
| security-attestation | end of the audit period + 12 months, never past the certificate's expiry |
| security-commitment | 12 months, reconfirmed by the owner |
| ai-capability | 90 days, or any change of model or provider version, whichever comes first |
| endorsement | 12 months, rechecked with the endorser |
| accolade | the next issue of the ranking, or 12 months, whichever comes first |
| law or platform fact cited inside a rule | 6 months from the fetch date |

Fields of a record (MKT-CLAIM-04). `claims_lint.py` holds the required-by-class lists in `REQUIRED`.

| Field | Meaning |
|---|---|
| `id`, `class` | `id` is kebab-case and unique. `class` is `performance`, `comparison`, `statistic`, `count`, `price-or-limit`, `licence`, `security-mechanism`, `security-attestation`, `security-commitment`, `ai-capability`, `endorsement`, `maturity` or `accolade` |
| `claim`, `surface` | The exact copy string, byte-equal to the surface; a list of repository paths or `github:description` |
| `value`, `unit` | For every number-bearing claim |
| `source`, `source_type` | The form above; `source_type` is `own-measurement`, `vendor-data`, `third-party-study`, `primary-law`, `authority-doc`, `platform-doc` or `owner-decision` |
| `method`, `check` | How the value was made; a command that re-measures or re-reads it, or `none` |
| `observed`, `refresh_by` | An ISO date; an ISO date after `observed`, or `"next-release"` |
| `definition`, `window`, `subject_version`, `caveat` | What is counted; the period or run set; the version of this product and of each compared product; one line on what the figure does not show |
| `approved_by` | Human handle, required on sign-off classes (MKT-CLAIM-16; the owner's own name satisfies it). An offline hint only, never proof |
| `legal_hold` | `none`, or the reason a human blocked the claim |
| `compared_party`, `compared_kind`, `third_party_as_of`, `third_party_version` | Comparison rows: the third-party names exactly as printed; `commercial` or `open-source`; the date the third-party fact was read; that product's release on that date |
| `prior_price`, `prior_price_window` | Price rows on a reduction only (MKT-CLAIM-27) |
| Endorsement and licence fields | `trust-claims.md` |

| Class | Required beyond the common fields |
|---|---|
| performance | `value`, `unit`, `method` (command, hardware, OS, workload, revision, cache state, run count and statistic, raw-data path), `window`, `subject_version`, `caveat`; one row per chart, `claim` is the chart title (MKT-CLAIM-06) |
| comparison | `value`, `unit`, `method` (both arms on the same workload, or the URL or command that re-reads a cell), `definition` naming both sides, `window`, `subject_version` of both sides, `caveat`, the four comparison fields, `approved_by` if `compared_kind = "commercial"` |
| statistic | `value`, `unit`, `definition` (population, measure), `window`, `caveat` |
| count | `value`, `unit`, `check` (a command that counts), `definition`, `subject_version` |
| price-or-limit | `value`, `unit`, `method`, `definition` (plan, tax, billing unit), `subject_version`, `caveat`, `approved_by`; `prior_price` fields on a reduction |
| security-mechanism | `check` (a command or workflow file that shows it), `definition`, `subject_version` |
| security-commitment | `value`, `unit`, `definition`, `approved_by` |
| ai-capability | `value`, `unit` (the metric), `method` (eval set name and size, who ran it), `definition` (what counts as correct, conditions), `window`, `subject_version` (model and product), `caveat`, `approved_by` |
| maturity | `definition` (criteria for the grade), `subject_version`, `caveat`, `approved_by` |
| licence, security-attestation, endorsement, accolade | `trust-claims.md` |

```sh
# MKT-CLAIM-01: marker half of check C. Usage: git diff -U0 "$BASE" -- "$f" | unmarked "$f"
# One line per uncovered hit. The function neither strips fences nor applies the JSON surface
# binding; the lint does both. claim-patterns.txt is the 15 lines of block MKT-CLAIM-02.
unmarked() {
  awk '/^@@/{split($3,a,/[+,]/);n=a[2];next} /^\+\+\+/{next} /^\+/{print n++}' | while read -r n; do
    sed -n "${n}p" "$1" | grep -q -i -E -f claim-patterns.txt || continue
    sed -n "${n}p" "$1" | grep -q -E 'claim:[a-z0-9-]+' && continue
    [ "$n" -gt 1 ] && sed -n "$((n-1))p" "$1" | grep -q -E '^[[:space:]]*(<!--|//|#|\{/\*)[[:space:]]*claim:[a-z0-9-]+[[:space:]]*(-->|\*/\})?[[:space:]]*$' && continue
    echo "$1:$n: claim pattern without a claim:<id> marker"
  done; }
```

```pattern-set
# MKT-CLAIM-02: one extended regular expression per line, matched case-insensitively
[0-9]+([.,][0-9]+)? ?(%|×)
\b[0-9]+(\.[0-9]+)? ?(x|ms|MB|GB|seconds|minutes)\b
\b([0-9]+([,.][0-9]+)*\+?|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|fifty|hundred|dozens|hundreds|thousands|millions) (users|clients|agents|packages|skills|tools|platforms|integrations|customers|companies|teams|developers|downloads|stars|contributors)\b
[$€£][0-9]|\bper (seat|user|month)\b|/mo\b|\bfree (tier|plan|trial|forever)\b|\bunlimited\b
\b(fast|faster|fastest|instant(ly)?|blazing\w*|lightning\w*|lightweight|smaller|smallest|cheaper|cheapest|scalable|reliable|secure|safest|unhackable)\b
\b(SOC ?[123]|ISO ?(/IEC )?27001|GDPR|HIPAA|PCI|FedRAMP|certified|compliant|audited)\b
\b(trusted by|used by|loved by|adopted by|chosen by|recommended by)\b
\b(production-ready|battle-tested|enterprise-grade|industry-leading|best-in-class|world-class|military-grade|bank-grade)\b
\b(AI[- ](powered|driven|enabled)|powered by AI|agentic|intelligent|human-level|no hallucinations?|state-of-the-art)\b
\b(better|best|cheaper) than\b|\bunlike\b
\b[0-9]+([.,][0-9]+)? ?(µs|μs|ns|KB|kB|TB|req/s)\b|\b[0-9]+([.,][0-9]+)?s\b
\b[0-9][0-9,.]*[kKmMB]?\+
\bup to [0-9][0-9,.]*|(^|[^[:alnum:]-])free\b|\bstarts at \$
\btrusted in production by\b|\bpowering (millions|thousands|businesses|the companies)
\bagentic\b|private alpha|zero[- ]trust|drop-in
```

```sh
# MKT-CLAIM-02 reading checks, printed and never failed. Absolute words, every line of a copy surface:
#   \b(guarantee[ds]?|never|always|no exceptions|infinite|invincible|failproof|without limits)\b|\bno more\b
# Comparison words, every line (PCRE, so not portable grep; claims_lint.py --reading runs both):
#   \b(better|best|cheaper|faster|simpler) than\b|\bunlike\b|\bvs\b\.?(?!\s*code\b)|\bversus\b|\bcompared (to|with)\b|\b(alternative to|beats?|outperforms?|replaces)\b
# A guarantee of response time or uptime is a security-commitment and needs the MKT-CLAIM-16 sign-off.
```

```sh
# MKT-CLAIM-03: each prints 1 on 2026-11-27. Flatten the Cellar page, then count each phrase.
curl -sL -H 'Accept: application/xhtml+xml' -H 'Accept-Language: en' http://publications.europa.eu/resource/celex/02005L0029-20260927 \
  | tr '\n' ' ' | sed 's/<[^>]*>//g' | tr -s ' ' > "$SCRATCH"/ucpd.txt
grep -c -F -e 'the price or the manner in which the price is calculated' "$SCRATCH"/ucpd.txt
grep -c -F -e 'shall in all circumstances be regarded as unfair' "$SCRATCH"/ucpd.txt
```

```sh
# MKT-CLAIM-05: release arm for one GitHub-hosted comparison row. OWNER_REPO is the third party's owner/repo.
# Compare the major.minor of the printed tag with the row's third_party_version.
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER_REPO/releases/latest" | grep -F -e '"tag_name"'
```

**Precision of line 1 to 15, measured 2026-11-27.** The numbers are the evidence for a false-hit load of about 4 in 10 on new pages. Plan for it: a false hit costs a marker or an `[[allow]]` entry, which is the safe direction, and blocks nothing true.

| Corpus | Result |
|---|---|
| In sample: 26 home pages, 5,797 lines, written from these pages | Lines 1 to 10: 326 hits, 292 real (89.6 %). Lines 11 to 15 on the lines the first ten miss: 118 hits, 107 real (90.7 %). Recall at most 54.8 % against a sweep that found 241 missed real lines |
| Held out: 19 home pages never used to write a line, 2,788 labelled lines, labels frozen first | The 15-line set with the bare-`free` line 13 hit 311 lines, 185 real: 59.5 %. Recall at most 185 of 331 (55.9 %). With the frozen strict labels the earlier set scored 58.2 %, and 66.6 % with borderline calls. One reader labelled every line, so no second rater exists |
| Per arm, held out, strict | Percent 29 of 43; units 14 of 29; counts 6 of 8; prices 35 of 42; outcome words 37 of 79 (`secure` alone 7 of 21); compliance 13 of 13; social proof 13 of 14; maturity 3 of 4; AI words 7 of 38; comparison 1 of 2; `+` counts 20 of 21; limits and free 17 of 19; labels 4 of 22. Without lines 5, 9 and 15 the set is 74.4 % precise |
| 17 measured repositories | 5 hits, 4 after the version-floor filter, all claim words |

Recall is an upper bound, because 3,419 short lines with no digit were dropped before labelling. Consumer sites, pricing pages and docs home pages are not represented. What no pattern catches at useful precision stays with reading checks and MKT-CLAIM-08, 09 and 20: testimonial text, adopter sentences, vague outcome words and absolutes (35 of 38 held-out absolutes passed the set). Fifteen held-out false hits were figures inside a product mock-up ("3 agents", "Cost $0.02"). In a blocked class they cannot take an `[[allow]]` entry, so the only fix is a rewrite. Four held-out lines used "AI-powered" for something other than the product ("Defend against AI-powered attacks"), and the only exception is the `agentic` and `intelligent` one.

## Performance, Statistics, Rewrites

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-CLAIM-06 | Publish a performance or comparison figure only with a method page that the figure links within the same paragraph or caption. The page names hardware, OS, the version of each product, the workload, the run count and the statistic, the date and the path to the raw data. Never put figures from different machines, versions or workloads in one chart without saying so beside it. | SPEC requires disclosure "sufficient for independent reproduction". One public benchmark page omits date, version and hardware model, and one runtime's home page mixes hardware rows without comment (both vendor data, read 2026-11-27). | A figure in a sentence needs an `<a href>` to the record's `method` URL within 300 characters of its `value`. A figure in a chart is checked once per chart, by the procedure in block MKT-CLAIM-06. Measured on 39 charts of 10 pages against a hand label: 19 true passes, 20 true fails, 0 false passes, 0 false fails. The 300-character test found an anchor near 5 of 102 located values and passed 1 of 19 covered charts. The check proves the URL is in the chart's block, not that the page behind it reproduces the chart: four method URLs swapped among four charts in one `<section>` passed 4 of 4. The method-page fields stay a reading check. Not run by `claims_lint.py`. | MUST |
| MKT-CLAIM-07 | Never write a statistic from memory. A statistic record holds a fetched URL that returns HTTP 200, the source's own date, the population and the measure. A figure from the vendor's own product, a sponsor or a vendor-run survey gets `source_type = "vendor-data"`, and the copy names the vendor or says "our test". | Practitioner heuristics (60:40, 95:5) get repeated as laws. The FTC asks for the level of proof that the ad itself conveys. | `curl -sIL -o /dev/null -w '%{http_code}' "$SOURCE"` prints 200. In every `vendor-data` row, `claim` contains `our`, `we` or the vendor's name (reading check). | MUST |
| MKT-CLAIM-08 | When a claim has no record, rewrite it as a mechanism: the action the software takes, plus a command, file or test a reader can use to check it. An outcome word may stay only as a headline whose same or next sentence names the artefact and links its proof. A softer adjective is not a fix. | A mechanism can be checked by running the software. An adjective cannot. One measured site already pairs an outcome headline, a mechanism line and a link to its verify guide. | Every outcome word from line 5 of MKT-CLAIM-02, and every `safe`, `trusted`, `private`, `encrypted`, `protected` or `hardened`, shares its sentence or the next one with a mechanism token (`sha256`, `digest`, `signature`, `Sigstore`, `SBOM`, `attestation`, `TLS`, `AES`, `lockfile`, `cache`, a `--flag` or a backticked command) or a link. Reading check: pass "Switches the active version by moving one symlink; nothing is downloaded." Fail "Switch versions instantly." Unverified: reading heuristic. | MUST |
| MKT-CLAIM-09 | Leave an existing owner-written tagline adjective on a headline line as it is: neither delete it nor replace it on your own initiative. List each one you meet in the change description for the owner. Add no new one. | Puffery is a brand and legal call that an agent cannot make. An agent's default on a referent-free tagline is to "fix" it, and the owner decides. DOC-PLAIN-12 already covers word choice. In one measured repository the tagline adjective is the product's only description, which fails the puffery test, and whether it stays is the owner's call. | See block MKT-CLAIM-09. A match on an added line with no matching removed line in the same hunk warns (a new adjective). A match on a removed line with no matching added line warns (a deleted owner adjective). | SHOULD |
| MKT-CLAIM-10 | Never delete or soften a statement of absence or limitation while editing copy: "no third-party audit", "no signature verification", "early development", "pre-1.0", "unstable", "no bounty", "reviews are not checked", and any line the owner marked `keep:absence`. The only exception is a record or release that changes the fact. | Agents "tighten" copy by cutting negatives because they read badly. These are a repository's most honest claims. A line saying reviews are not checked is a material fact in the EU: UCPD Art. 7(6) treats "whether and how" reviews are checked as material (consolidated 2026-09-27). | See block MKT-CLAIM-10: it prints nothing unless the same commit changes the matching record or the release notes state the change. Any other protected absence carries a `keep:absence` marker in the surface's comment syntax. Measured on a 2,610-line headline corpus, the named phrases match 5 lines, all limitation statements. The first draft's pattern, with bare `does not` and `experimental`, matched 21. | MUST |

```sh
# MKT-CLAIM-06: the per-chart check, in words. The lint-side author runs it on the built page.
# 1. The chart has one performance row; its claim is the chart title (figcaption, caption, aria-label or the heading above it), unique on the page.
# 2. Find the text node that holds claim. Prefer one inside h1 to h6, caption or figcaption. Never take one inside a or nav.
# 3. Scope is the nearest section, article or aside ancestor. With none, the range from the nearest heading at or before the title
#    to the next heading of the same or a higher rank.
# 4. Pass when the scope holds an <a href> that, resolved against the page URL with the fragment removed, equals the row's method,
#    and method is not the page's own URL. The row has every performance field, and the raw-data path exists.
# Without the two guards in steps 2 and 4 a shortcut author got 11 false passes: a release-notes link in main, and a heading anchor.
```

```sh
# MKT-CLAIM-09: tagline adjectives added or removed on a changed line. BASE is the branch this change merges into.
BASE=origin/main
git diff -U0 "$BASE" | grep -v -e '^+++' -e '^---' | grep -i -w -E -e 'simple|easy|modern|clean|elegant|intuitive'
```

```sh
# MKT-CLAIM-10: removed lines that state an absence. Empty output is the pass.
BASE=origin/main
git diff -U0 "$BASE" | grep -e '^-' | grep -v -e '^---' \
  | grep -i -E -e 'no (third-party )?audit' -e 'no signature' -e 'early development' -e 'pre-1\.0' -e 'unstable' -e 'no bounty' -e 'keep:absence' -e 'reviews (are )?not (checked|verified)'
```

## Prices, Captions and Comparisons

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-CLAIM-27 | Never announce a price reduction ("was X, now Y", "N% off", "save N", a struck-through price) unless a `price-or-limit` row holds `prior_price` and `prior_price_window`. `prior_price` is the lowest price the trader applied in at least the 30 days before the reduction. The copy shows that prior price. A list price, a competitor's price or a "recommended" price is not a prior price. | Directive 98/6/EC Art. 6a(1) and (2): "Any announcement of a price reduction shall indicate the prior price", and "The prior price means the lowest price applied by the trader during a period of time not shorter than 30 days prior to the application of the price reduction". It has applied since 2022-05-28. The Directive defines no "product", and no national act or CJEU ruling was read, so whether a software subscription is covered is open: it stays a SHOULD. A false "was" price is still attackable under UCPD Art. 6(1)(d). MKT-CLAIM-03 already blocks any price an agent writes, so this rule bites once the owner supplies one. | See block MKT-CLAIM-27: every hit resolves to a live `price-or-limit` row with `prior_price`, a `prior_price_window` of at least 30 days that ends the day before the reduction, and a `check` that re-reads the price history. Tested 2026-11-27: `<s>$20</s> now $15`, `was $20`, `30% off`, `save $5` and `~~$20~~` all matched. 0 hits on the 17 measured repositories and on the 26 exemplar pages. | SHOULD |
| MKT-CLAIM-29 | When a record has a non-empty `caveat`, show that caveat string in the same element as the claim or in the element directly after it. A footer, tooltip, `<details>` element or linked page does not count. The caveat does not contradict the claim it qualifies. | CAP 3.9: marketing "must not mislead by omitting significant limitations and qualifications", and qualifications "must not mislead by contradicting the claims that they qualify". It is the UK form of the "clear and conspicuous" test applied to "free" in MKT-CLAIM-13. A SHOULD, because the caveat is owner-written and not every caveat belongs inline. | In the built HTML, find the element whose own text holds the `claim` string outside any `<details>`, then require the `caveat` string in that element or its next sibling, ignoring text inside `<details>` and in elements with a `title=` attribute. Run on fixtures it passed the inline caveat and failed one inside `<details>` and one in `title=`. It does not see `aria-describedby` targets, script tooltips or CSS-hidden text, and contradiction stays a reading check. Not run by `claims_lint.py`. | SHOULD |
| MKT-CLAIM-30 | Set a third-party product, project or company against this product (a comparison table, row, card, chart label or sentence) only through a `comparison` row that lists it in `compared_party`. Each cell states one fact about that product with its source and the date it was read. The source is the product's own documentation or an independent dataset, never marketing copy. Compare only products that meet the same need, on the same feature, on the same row. Use no evaluative word about the third party, no logo of it, no imitation of its brand, and nothing that suggests it endorses, sponsors or is part of this product. Delete a cell that has no source. Never state a competitor's limitation from memory: no script detects that clause, so read for it. A comparison cell holds its fact as text: an icon alone states nothing the lint can bind. Put no table inside a comparison cell. Naming a third party for another purpose (a list of supported clients, an integration) is not a comparison and needs no row. | Comparative advertising is "any advertising which explicitly or by implication identifies a competitor". It is permitted when it is not misleading, compares goods "meeting the same needs", "objectively compares one or more material, relevant, verifiable and representative features", does not "discredit or denigrate" and does not "create confusion" (Directive 2006/114/EC Art. 2(c), 4). The UK keeps the list in SI 2008/1276 reg. 4. The FTC "encourages the naming of" competitors "but requires clarity" (16 CFR 14.15). The US nominative-use test allows only as much of the name "as is reasonably necessary" and nothing that suggests "sponsorship or endorsement" ([Playboy v. Welles, 9th Cir. 2002](https://caselaw.findlaw.com/us-9th-circuit/1233126.html)). A cell from memory fails "verifiable" without the agent knowing. One measured site's card says a version manager has "no Windows" while that tool's own README says it should work through WSL, Git Bash or Cygwin. | The procedure in block MKT-CLAIM-30. Measured 2026-11-27 on 9 real comparison pages with 607 generated rows: step 1 passed the 7 compliant pages, failed the 2 with icon-only cells (95 cells), detected 512 of 512 single dropped markers and 27 of 27 tables stripped of all rows. A line-by-line variant failed all 9 pages and never changed its verdict when a marker was dropped. Step 3 found 2 of 36 hand-labelled evaluative texts and so proves only that its 8 words are absent: "DIY effort" and "can surprise teams" are found only by the reading list. Step 4 flagged 6 images, 4 of them competitor logos. Limits in the next section. Not run by `claims_lint.py`. | MUST |

```sh
# MKT-CLAIM-27: price-reduction forms. Every hit needs a price-or-limit row with prior_price. Empty output is the pass.
surfaces() { git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.md' ':(glob)**/*.mdx' ':(glob)**/*.astro' ':(glob)**/*.html' ':(glob)**/*.json' ':(exclude,glob)**/node_modules/**'; }
surfaces | xargs -0 -r grep -H -n -i -E -e 'was [$€£][0-9]' -e '[0-9]+ ?% off' -e 'save [$€£]?[0-9]' -e '~~[$€£][0-9]' -e '<(s|del)>[^<]*[$€£][0-9]' --
```

```sh
# MKT-CLAIM-30: the comparison check, in words.
# Party list:   yq -r '.claim[] | select(.class=="comparison") | .compared_party[]' claims.toml
# 1. A comparison block is a table whose first row has a cell naming a compared party, or a table that holds a claim:ID marker
#    of a comparison row. A block holds no nested table. Every body cell, in a column whose first-row cell names a compared party,
#    (a) has text, (b) carries a claim:ID marker inside the cell, (c) whose id resolves to a comparison row listing that party in
#    compared_party, and (d) whose claim is byte-equal to the cell text. A text node outside every block that names a compared
#    party is printed and never failed: that printout is the reading list, each line read once and marked "fact with a row"
#    or "not a claim".
# 2. The row's source returns 200:   curl -sIL -o /dev/null -w '%{http_code}' "$SOURCE"
# 3. No evaluative word about a compared party, in a cell or in prose that names one. Empty output is the pass:
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.html' ':(glob)**/*.md' ':(glob)**/*.astro' \
  | xargs -0 -r grep -H -n -i -w -E -e 'outdated|broken|bad|legacy|clunky|obsolete|dead|worthless' --
# 4. No img or svg on the page has a src, alt, title or aria-label that holds a compared party's name. An [[allow]] entry with a
#    reason covers a name set in plain type with no logo. The word "logo" is not a trigger. A person also reads each such image
#    for text inside the picture.
# 5. Check A for the comparison fields, and check D for third-party releases (MKT-CLAIM-05).
```

## AI Capability

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-CLAIM-18 | Label a product or feature "AI-powered", "AI-driven", "agentic" or "intelligent" only when the shipped artefact calls a model at runtime for the function the copy names. The record's `source` is the call-site path. Building the product with an AI assistant, or installing configuration for AI tools, does not qualify. | The FTC says "merely using an AI tool in the development process is not the same as a product having AI in it", and its technologists "can look under the hood" (2023-02-27, archived). | The trigger is line 9 of MKT-CLAIM-02. Each hit resolves to a record whose `source` path exists and contains a model-client call (block MKT-CLAIM-18). A hit that is a proper name or an essay topic takes an `[[allow]]` entry, for `agentic` and `intelligent` only. On the exemplar pages the widened arm has 9 hits, 5 real and 4 false (a third-party protocol name or an essay topic). On the measured repositories it has 0. | MUST |
| MKT-CLAIM-19 | Write an AI accuracy, precision, error-rate, time-saved, "better than", "replaces" or "as good as a professional" claim only with an `ai-capability` record. The record holds the metric, what counts as correct, the eval set name and size, who ran it, the model and product version, the conditions the figure holds under, and both arms of any comparison. Never write "no hallucinations", "always accurate" or "100% accurate". Never claim prediction of human behaviour, detection of AI-written text, legal, medical or financial advice, or replacement of a licensed professional without the owner's sign-off. | Workado claimed "98 percent" accuracy and measured 53 percent on general content. Its order requires "competent and reliable evidence ... at the time it is made" (FTC, 2025-04-28 and 2025-08-28). DoNotPay never tested its "robot lawyer" (FTC, 2025-02-11). | See block MKT-CLAIM-19. Every hit resolves to an `ai-capability` record with `method`, `window`, `subject_version` and `approved_by`. The banned phrases fail outright. | MUST |

```sh
# MKT-CLAIM-18: model-client call sites in the cited source path. SOURCE is the row's source file. Empty output means no call site.
grep -n -E -e 'anthropic|openai|generativeai|ollama|onnx|transformers' -- "$SOURCE"
```

```sh
# MKT-CLAIM-19: AI accuracy and replacement claims. Empty output is the pass.
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.md' ':(glob)**/*.mdx' ':(glob)**/*.astro' ':(glob)**/*.html' \
  | xargs -0 -r grep -H -n -i -E -e '[0-9]{1,3}(\.[0-9]+)? ?% ?(accura|precis|recall|correct|faster)' -e '(more|most) accurate' -e 'human[- ]level' -e 'replaces? (your|a|the) ' -e 'as good as' -e 'no hallucinat' -e '100% accurate' -e 'detect(s|or)? (AI|ChatGPT)' -e 'legal advice' -e 'diagnos' --
```

## Reading Checks and Open Gaps

Each gap names what is missing. The severities above already allow for them.

- **Chart method links (MKT-CLAIM-06).** Not settled: whether the page behind `method` reproduces the chart. On a page whose only heading is an `h1` the fallback range is the whole page. Charts drawn by script need a rendered page and were not measured. A page-header link counts as a borderline label: if it counts, one measured site's three charts are 3 false fails.
- **Comparison cells (MKT-CLAIM-30).** One row and one marker per compared-party cell: 607 on 9 pages, 243 on the largest. No owner has said that cost is acceptable, and a cheaper design (one row per table row) was not built. With no `comparison` row the party list is empty and step 1 is vacuous. A marker on a cell whose text equals its neighbour's ("Yes", an emoji) cannot be told from a marker on the right cell. No check reads text inside an image. A 200 status on a documentation root shows the root exists, not that it supports the cell. A card list is not a block, so its lines fall to the reading list until a card block is defined and measured.
- **Comparative-advertising case law.** The CJEU texts on "identifies a competitor" and "same needs" (C-381/05, C-159/09) were not fetched. No source says whether a free, non-commercial open-source project is a "competitor". No US case was found on a comparison cell that was true when written and false when read. The expiry in MKT-CLAIM-05 is a design choice.
- **Directive 98/6/EC and software subscriptions (MKT-CLAIM-27).** See the rule row.
- **Pattern precision.** See the table under block MKT-CLAIM-02: held-out recall is at most 55.9 %, there is no second rater, and the rendered-text corpus splits figures from their units, so whether a source-level lint sees the same misses is not measured.

What an agent must ask a human, from this file: any price, plan, tier, limit, quota, discount or free-tier boundary and the prior price of a reduction (MKT-CLAIM-27); whether to name a competitor or benchmark against one, and every addition, removal or re-ordering of a compared party (MKT-CLAIM-16, 30); whether a surface is aimed at UK or EU consumers rather than at developers acting for their business, and the seller's country; any AI accuracy figure, comparison or "replaces" claim, and whether a feature truly calls a model when the call site is not obvious; whether a referent-free tagline stays; whether a figure inside a product mock-up is a claim when it falls in a blocked class.

## What Agents Get Wrong Here

Ranked by how often each bites, from the measured failure modes.

1. **Filling a slot with plausible content.** An invented number ("3x faster", "10,000+ developers"), price, free tier, testimonial or analyst placement (MKT-CLAIM-02, 03, 07). A competitor's limitation written from memory (MKT-CLAIM-30). A number "backed up" by a customer quote (MKT-CLAIM-28).
2. **Training-data vocabulary.** "Blazing fast", "instantly", "secure by default" with no mechanism (MKT-CLAIM-08). "AI-powered" for a repository built with an AI assistant or for a tool that configures AI agents (MKT-CLAIM-18). "Agentic" or "intelligent" as a product label.
3. **Tightening for punch.** "Signed releases with SBOM" becomes "secure supply chain", so the mechanism token is gone. "No third-party audit", "early development" and "reviews are not checked" get cut as negative (MKT-CLAIM-10). A caveat moves into a tooltip or `<details>` (MKT-CLAIM-29).
4. **Stale carry-over.** A count survives a release ("10 clients" after an eleventh ships). A "was" price anchors on a list price (MKT-CLAIM-05, 27).
5. **Exemplar imitation.** A vendor benchmark chart reproduced without hardware or version (MKT-CLAIM-06). A comparison cell that shows only a check or cross icon. A judgement on a competitor set inside an image, where no text check reads it. Plausible demo figures in a product mock-up.
6. **Scope errors.** "Every coding agent" next to a list of 10. An unconditional guarantee in body copy ("never corrupts your data", "no exceptions").
7. **Gaming the gate.** A `claim:` marker with no record (check B stops it), an `[[allow]]` entry for a price (check E ignores it), a record the agent filled itself for a sign-off class (MKT-CLAIM-16 needs a recorded approval, and a review from a second identity is SHOULD), a lengthened `refresh_by` (check D rejects it), a `method` link that points at the nearest link or at the page's own heading anchor (MKT-CLAIM-06's guards), a marker on the wrong comparison cell (step 1(d) of MKT-CLAIM-30), a figure that cites a quote's page under another URL spelling such as `?utm_source=` (MKT-CLAIM-28).
