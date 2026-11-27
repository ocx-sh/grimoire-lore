---
title: Claims and evidence record for product copy
program: product
sub_program: marketing
topic: marketing-claims-evidence
worker: claims-evidence-record
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
scope: Which words make a claim objective, and which evidence record must exist on disk before a performance claim, statistic, count, price or limit ships. Covers the US FTC tests, the EU misleading-action test, benchmark method fields, the record schema, its storage and its lint. Not covered - sector law (health, finance), UK DMCC Act, GDPR consent, platform ad policies (channels), email law (lifecycle), AI-feature interface disclosure (ux).
---

# Claims and evidence record for product copy

## Contents

1. Summary
2. Findings (1 FTC tests, 2 EU test, 3 other binding sources, 4 benchmark method fields, 5 fleet measurements, 6 the data-file pattern, 7 the schema)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Fetch failures
9. Sources

## Summary

- A claim is objective when a reader could falsify it with a measurement, a count, a lookup or a command. The FTC asks for a "reasonable basis" before a claim runs; the basis has to exist before publication, and evidence gathered later does not cure it ([FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation), page dated 1984-11-23).
- If copy states a level of proof ("tests prove", "studies show"), the firm needs at least that level. Implied claims need the support the ad conveys (same source).
- Puffery is narrow. The FTC generally skips only "obviously exaggerated or puffing representations ... that the ordinary consumers do not take seriously", and says exaggerated claims that consumers do take seriously are actionable ([FTC 1983 deception statement, archived copy](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm), footnotes 41-42).
- The EU test has no puffery clause in Art. 6(1): false information, or deception of the average consumer even with correct facts, on a listed element (price, main characteristics, and others) that is likely to change a transactional decision ([Art. 6](https://www.legislation.gov.uk/eudr/2005/29/article/6)).
- An agent cannot judge how a reasonable reader takes an adjective. So the rule must be mechanical: measurable-attribute words, comparatives, superlatives, absolutes, numbers, prices and counts are objective by default and need a record or a rewrite.
- The record lives in a data file beside the copy, and the copy renders its value from the record or carries a `claim:` marker. The fleet's `landing-content.ts` is the right shape for command output and wrong for claims: its dated source sits in a code comment, not beside the rendered text, and no test reads the date.
- Block, never warn, on a price, limit, plan name, count or "Nx" figure with no record.
- Fleet measurement: in 17 READMEs and 10 landing/index files, 16 hits of the 20-adjective list; 11 are product claims (4 objective, 3 puffery, 4 mechanism); 0 of the 4 objective ones has a number or proof beside it. 6 number-bearing claims on headline surfaces: 5 have a dated source in a data-file comment, 0 beside the rendered text.
- Benchmark pages differ sharply. uv names OS, Python version, workload, tool and commands but no date, no uv version and no hardware model. bun.sh puts hardware, workload, run count and a reproduce link beside most charts, as read by the fetch tool. SPEC's rules show the full field list.
- Every law row in this file carries `refresh_by` = fetch date + 6 months = 2027-05-27.

## Findings

### 1. FTC substantiation and deception (US)

Read from the primary FTC page and an archived copy of the primary FTC text (the live PDF returned compressed binary I could not extract).

| Question | What the source says | Source |
|---|---|---|
| Duty | Advertisers need a reasonable basis for objective claims before dissemination; lacking one is unfair or deceptive under Section 5. | [FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation) |
| Express level of proof | Where copy says "tests prove", "doctors recommend", "studies show", the firm needs at least that level. The page does not use the phrase "establishment claim". | same |
| Implied claims | Need the amount and type of support the ad conveys; the firm should know the reasonable readings of its claims. | same |
| No stated level | Readers are assumed to expect a reasonable basis. | same |
| Factors | Type of claim, product, consequences of falsity, benefit of truth, cost of substantiation, amount experts consider reasonable. | same |
| Timing | Post-claim evidence cannot replace prior substantiation. | same |
| Deception test | Three elements: a representation, omission or practice likely to mislead; judged from a consumer acting reasonably (from the target group's view where the claim is aimed at one); material, meaning likely to affect conduct or decision. | [FTC 1983, archive](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm) |
| Net impression | The whole ad is read, not isolated words; accurate fine print may not cure a false headline. | same |
| Likelihood | Test is "likely to mislead", not actual deception. | same |
| Puffery line | Not pursued: obviously exaggerated or puffing statements that ordinary consumers do not take seriously, and subjective claims (taste, feel, appearance, smell), and correctly stated opinion where the source and limits are understood. Pursued: opinions not honestly held, that misstate the holder's basis, or that readers take as implied fact; exaggerations taken seriously (the "electronic miracle" antenna case). n.42 quotes Pfizer (1972): themes that do not amount to affirmative product claims "for which either the Commission or the consumer would expect documentation". | same, text at footnotes 39-42 |

Reading for developer copy: the target group is sophisticated, and "the Simple Package Manager" is probably puffery to it. But the agent cannot know that, and "instantly", "fast" and "reproducible" are falsifiable by a stopwatch or a hash.

### 2. EU Directive 2005/29/EC, Art. 6-7 and Annex I

EUR-Lex answered with a CloudFront bot challenge (HTTP 202, `x-amzn-waf-action: challenge`) for every URL I tried, so the text below comes from the UK government's copy of the EU original at legislation.gov.uk. That copy may show the text as it stood when the UK retained it; later EU amendments to these articles are unverified, omitted.

- Art. 6(1): a practice is misleading if it contains false information, or deceives or is likely to deceive the average consumer even with factually correct information, on listed elements, and causes or is likely to cause a transactional decision the consumer would not otherwise take. Elements include (a) existence or nature, (b) main characteristics, (c) commitments, sponsorship or approval, (d) price or the manner it is calculated, (f) trader identity, qualifications, approvals ([Art. 6](https://www.legislation.gov.uk/eudr/2005/29/article/6)).
- Art. 6(2): confusion with a competitor's marks or products, and failure to honour a firm code-of-conduct commitment (same).
- Art. 7(1)-(2): omission of material information, or hiding it or giving it in an unclear, ambiguous or untimely way, is misleading; commercial intent not apparent from context counts. Art. 7(3): medium limits (space, time) are weighed ([Art. 7](https://www.legislation.gov.uk/eudr/2005/29/article/7)).
- Art. 7(4): in an invitation to purchase, material information includes main characteristics, trader identity and address, the price including taxes (or the calculation method and extra charges), and the right of withdrawal or cancellation where it exists (same).
- Annex I (always unfair, no case-by-case test): falsely claiming approval or endorsement (point 4), bait pricing (5), false limited-time availability (7), paid editorial passed off as editorial (11), "free" where the consumer pays more than unavoidable costs (20), posing as a consumer (22) ([Annex I](https://www.legislation.gov.uk/eudr/2005/29/annex/I)).
- Dates: the page gives directive date 11 May 2005; Art. 20 says in force "on the day following its publication in the Official Journal". The publication date was not on a page I read, so the in-force calendar date is unverified, omitted.
- Whether the EU treats exaggerated advertising as outside Art. 6: not found in a source I read; unverified, omitted.

### 3. Other binding or guiding sources read

- US reviews rule (16 CFR Part 465): effective 2024-10-21 per the [FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers); covers fake and AI-generated reviews of non-existent people, paid sentiment-conditioned reviews, undisclosed insider reviews, suppression, bought fake followers ([FTC press release, 2024-08-14](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)). Penalty dollar amount per violation: not stated on either page, unverified, omitted.
- AI claims: Operation AI Comply, [2024-09-25](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes): five actions; DoNotPay allegedly never tested whether its output matched a human lawyer's; order bars substitution claims "without evidence to back it up". Workado, [2025-04-28](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims): advertised "98 percent" detector accuracy, tested at 53 percent on general content; order requires "competent and reliable evidence" and annual compliance reports.
- Endorsements: the Endorsement Guides were finalised and announced 2023-06-29 (3-0 Commission vote; the Guides had last been revised in 2009; codified at 16 CFR Part 255; the release states no effective date) ([FTC press release, 2023-06-29](https://www.ftc.gov/news-events/news/press-releases/2023/06/federal-trade-commission-announces-updated-advertising-guides-combat-deceptive-reviews-endorsements)). They need clear and conspicuous disclosure of material connections, and the advertiser answers for what others do for it ([FTC Q&A](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking), which says only "revised in 2023" and carries no page date). The Guides are not binding law themselves.
- UK: CAP Code rule 3.7 requires marketers to "hold documentary evidence to prove claims that consumers are likely to regard as objective" ([ASA](https://www.asa.org.uk/type/non_broadcast/code_index/substantiation.html); the page carries no date, edition or amendment date, checked 2026-11-27). Dating by the authority's own notice: the ASA states the Codes were updated on 2025-04-07 for the DMCCA 2024 and that the pre-update Code applies to ads received before that date ([ASA archive page](https://www.asa.org.uk/resource/archive-cap-code-prior-to-6apr25-dmcca.html), the DMCCA changes took effect 2025-04-06). The ASA's register of changes lists no change to rule 3.7 ([register](https://asa.org.uk/codes-and-rulings/advertising-codes/register-of-cap-code-changes.html), no entry dates shown), and the page above still shows the wording under number 3.7; a DMCCA evaluation table PDF hints the rule may sit at 2.3 in the updated Code, but it could not be read (compressed PDF), so the current rule number is unverified. Treat the wording as in force on 2026-11-27 and check the number before citing it. Rules 3.9 and 3.33 were not on the page, unverified, omitted.

### 4. Benchmark method fields

| Source | Fields given | Fields missing | Fetch note |
|---|---|---|---|
| [uv BENCHMARKS.md](https://raw.githubusercontent.com/astral-sh/uv/main/BENCHMARKS.md) (file has no date; fetched 2026-11-27 from `main`) | OS (macOS), Python 3.12.4 for the non-uv tools, workload (Trio `docs-requirements.in`), tool (`hyperfine` via `scripts/benchmark`), exact commands (`uv run resolver ... --benchmark install-warm ...`), cold and warm definitions, caveats (OS and filesystem, package mix), a rendering command | uv version, hardware model, run count, date, raw JSON (charts are images) | independent-looking, but it is the vendor's own page: vendor data |
| [bun.sh](https://bun.sh/) as read by the fetch tool on 2026-11-27 | Per chart: workload size, cache state, hardware (Linux x64, EPYC 9R14), "medians of 3", tool versions, and a `[reproduce]` link to a path in the repo on the install, Express, Postgres and WebSocket charts | `bun test`, `bun check`, `bun fmt` rows lack hardware or a reproduce link; the Prettier "60 ms vs 17 s" sentence has no disclosure; one chart compares drivers rather than runtimes; the tool reported a unit mismatch (0.21 s vs "210 s") in a method table. I did not re-read the page to confirm that last point | vendor data; fetch tool summary, not a verbatim read |
| [SPEC CPU 2017 run rules](https://www.spec.org/cpu2017/Docs/runrules.html) (fetched 2026-11-27; first 100,000 of 125,266 characters read; fair-use section 5.3 not read) | Public results need full disclosure "sufficient for independent reproduction": system identification (model, test date as month and year, availability dates, tester), hardware (CPU name, MHz, cores, caches, memory, disk), software (OS and version, file system, compilers), all non-default settings and flags, a flags file (a result without one is invalid), raw files; a public result outside the rules must be marked as an estimate; performance may be estimated if labelled, energy may not; a performance drop above 1.75 percent on an overall metric triggers republishing for pre-production systems | n/a | industry benchmark authority |

Failure-corpus tie-in: the "unreproducible vendor benchmark" pattern is "no hardware, config or versions; mislabelled workload" ([ClickHouse, 2026-06-30](https://clickhouse.com/blog/databricks-reyden-benchmark-transparency-clickhouse), cited via the failure-corpus scout, not re-fetched).

Minimum method record for a developer-tool performance claim, built from the three above: subject and competitor versions, hardware (CPU model, cores, RAM, storage), OS and kernel, workload name and revision, cache and lockfile state, exact command, run count and statistic, non-default settings, date, raw-data path, and a one-line caveat on what the result does not show.

### 5. Fleet measurements

All commands run from `/home/mherwig/dev` on 2026-11-27, with `/usr/bin/grep` because the shell rewrites bare `grep`.

**Scope correction.** The scout's claim grep counted 193 lines, 110 in `ocx-sh/grimoire-lore`. Re-run over the same two roots with no excluded directories it returned 463, mostly `node_modules`, `.agents` and vendored VS Code test downloads. Command, product-relevant scope: `/usr/bin/grep -rIi --include='*.md' --include='*.mdx' --include='*.astro' --include='*.ts' --include='*.toml' --include='*.html' --exclude-dir={node_modules,.git,target,worktrees,dist,.astro,.agents,.claude,.opencode,grimoire-lore} -E "[0-9]+x faster|blazing|fastest" ocx-sh grimoire-rs` returns 11 lines. Split: 2 product docs (`ocx/website/.../publishing/test-locally.mdx` "The fastest way to find out", `grimoire/docs/.../package-index.md` "Fastest for consumers"), 5 in catalog rule and skill text (not product claims), 4 in vendored VS Code test downloads. Both product-docs hits are unproven comparatives. On the headline corpus below the grep returns 0.

**Headline corpus.** `text.sh` = `head -30` of the 17 READMEs under `ocx-sh/*/` and `grimoire-rs/*/` plus 10 landing or index files (all 10 exist; the audit names 14 and its command listing was truncated, so 4 are not covered, which can only add hits); 1,500 lines. Adjective command from the [messaging inventory](../product-audit/messaging-inventory.md): `grep -i -o -w -E "fast|faster|fastest|simple|simply|simplest|blazing|blazingly|powerful|seamless|seamlessly|effortless|effortlessly|robust|lightweight|modern|easy|easily|best|reliable|secure|scalable|instantly|instant|automation-first|cross-platform|zero|clean|reproducible|deterministic" corpus.txt | tr A-Z a-z | sort | uniq -c`.

Rubric, written before scoring:
- Objective: a reader could falsify it by a measurement, a count, a lookup or a command; includes comparatives, superlatives of measurable attributes, absences ("zero X"), universal quantifiers.
- Puffery: names a quality with no referent, no comparison, no number, and nothing to run.
- Mechanism: describes what the software does, checkable by running it or reading a test.
- Non-claim: code comment, CSS, link title, task note.

| Word | Hits | Classified |
|---|---|---|
| clean | 4 | 3 mechanism (clean environments, 265, 623, 1229), 1 non-claim ("needs a clean tree") |
| cross-platform | 3 | 1 objective ("cross-platform binary distribution platform", 740, no platform list beside it), 1 mechanism (340), 1 non-claim (link title) |
| zero | 2 | 1 objective ("Zero extra infrastructure", 740), 1 non-claim (CSS comment) |
| simple | 2 | 2 puffery ("The Simple Package Manager", 256, 739; a footnote on early development sits in `Landing.astro:157` per the audit) |
| reproducible | 2 | 1 objective (1229), 1 non-claim (link title) |
| instantly | 1 | 1 objective ("switch versions instantly", 265; no timing anywhere) |
| fast | 1 | non-claim (task comment) |
| automation-first | 1 | 1 puffery (621) |
| Total | 16 | 4 objective, 3 puffery, 4 mechanism, 5 non-claim |

0 of the 4 objective hits has a number, a source or a method beside it. The audit counted 12 unquantified claims because it included GitHub descriptions and `Cargo.toml`, outside this corpus; the two counts do not conflict.

**Other greps on the corpus.** Price pattern `[$€£][0-9]|[0-9]+ ?(/|per) ?(mo|month|seat|user|year)|free forever|unlimited|free tier|free plan` returns 0. Count-noun pattern (numeral or number word before users, clients, agents, packages, skills, tools, platforms, integrations, downloads, stars) returns 0. Numeral+unit pattern (`x`, `%`, MB, seconds) returns 0 after removing CSS units. The fleet currently states no price, limit or performance figure on headline surfaces; that is the state the block rule must keep.

**Number-bearing claims on headline surfaces** (hand count after `grep -n -E "\b[0-9]+(\.[0-9]+)?\b"` on the five headline files, CSS and example package tags excluded): 6. They are the four PROBLEM rows in `landing-content.ts:14-17` (Node 18, 20, 26, 26 plus end-of-life dates), `Landing.astro:85` ("Node 24 on macOS, Linux, Windows and CI"), and "10 clients" in the grimoire README (audit, `README.md:17-19`, not re-checked). Source and date beside them: 5 of 6 have a dated source in the header comments of `landing-content.ts:3-4` (run on ocx 0.6.5, Node v24.22.2, 2026-11-09) and `:9-10` (versions as of 2026-11-08, six named sources). 0 of 6 show source or date in the rendered copy. 0 of 6 have a machine-readable `refresh_by`. The "10 clients" claim has no record at all.

### 6. Does the `landing-content.ts` pattern generalise?

What it does well, from `ocx-sh/website/site/src/components/landing-content.ts:1-18` and `landing.test.ts`:
- Copy and illustrative data sit in one typed file, rendered at build time, imported by the test.
- The header states what was run and when, and states that "no timing or size is claimed" (a deliberate absence).
- `landing.test.ts` pins the sessions to the built HTML (`expect(html, line).toContain(line.trim())`), so a rendered line cannot drift from the data.

What it does not do:
- The date and source are prose in a comment; no test reads them, so nothing fails when 2026-11-08 becomes stale. The test file contains no date, version or `refresh` check (`grep -n -i "2026\|as of\|version" landing.test.ts` finds nothing on claims).
- It is TypeScript in one Astro site. The fleet also has MkDocs, READMEs, `Cargo.toml` descriptions and GitHub metadata, none of which can import it.
- It records command output, not claims with a class, unit or method.

Decision: the pattern generalises as "data file beside the copy, with a test that binds copy to data". It does not generalise as "dated comment in the data file". Use a language-neutral claims file (TOML) per repository, next to the surface directory, with the lint in section 3 binding copy to record by id.

### 7. Record schema

Start schema from the commission: claim, surface, class, value, unit, source, source_type, method, observed, refresh_by, definition, window, subject_version. Changes, each with a reason:

| Change | Reason |
|---|---|
| add `id` (kebab-case, unique per file) | The lint binds copy to record by id; line numbers drift. |
| add `copy` (the exact string as it appears) | The lint greps the copy for the string, so an edit to the copy without an edit to the record fails. |
| add `check` (a command that re-measures or re-fetches the value, or `none`) | A refresh without a command is a guess; a count or limit usually has one. |
| add `caveat` (one line, what the figure does not show) | uv and bun both print caveats beside charts; SPEC requires notes for non-default settings. |
| add `legal_hold` (`none` or a reason) | Lets a human block a claim without deleting the record (section 5 of this file). |
| keep `observed` as an ISO date | The substantiation duty is about evidence held before dissemination; the date proves order. |
| `source_type` extended with `authority-doc` for specs and statutes and kept `primary-law`, `platform-doc` | Distinguish a statute from a standards document. |

Required fields per class (X = required, o = only when it applies):

| Class | claim, copy, surface, id | value, unit | source, source_type | method, check | observed, refresh_by | definition | window | subject_version | caveat |
|---|---|---|---|---|---|---|---|---|---|
| performance | X | X | X | X (command, hardware, workload, run count) | X | o (what "fast" means) | X (period or run set) | X (subject and competitor) | X |
| statistic | X | X | X | o | X | X (population, measure) | X (period the source covers) | o | X |
| count | X | X | X | X (command that counts) | X | X (what is counted) | o | X | o |
| price-or-limit | X | X | X (pricing or limits source) | X (how to re-read) | X | X (plan name, tax inclusion, billing unit) | o | X | X |
| comparison | X | X | X | X | X | X (both sides named, same workload) | X | X (both sides) | X |
| licence | X | X (SPDX id) | X | X (file path of licence text) | X | o | n/a | X | n/a |
| security | X | o | X | X (test, audit report, scan) | X | X (scope, what "secure" means) | X | X | X |
| ai-capability | X | X (metric) | X | X (eval set, size, date) | X | X (task) | X | X (model and version) | X |
| endorsement | X | n/a | X (named source) | o | X | X (material connection) | n/a | o | n/a |
| maturity | X | n/a | X | o | X | X (criteria for "stable") | n/a | X | X |

Default `refresh_by` (my decision, not sourced; set by decay: figures tied to a release change at release, third-party figures change on the source's cadence): performance 90 days or the next minor release of the subject or a competitor, whichever first; statistic 12 months from the source's date; count 30 days, or the next release if the count comes from the code; price-or-limit 30 days; comparison 90 days; licence the next release; security 90 days; ai-capability 90 days or any model change; endorsement 12 months; maturity the next release; every law row 6 months from the fetch date.

Law row rule: every law row also carries fetch date, in-force date and provision number. Provisions not confirmed in a primary source are written "unverified, omitted" and get no rule row.

## Normative guidance candidates

Rule IDs are provisional (CLAIM-nn). They reference but do not restate DOC-PLAIN-12 (word choice), DOC-TYPE-15 (adoption-claim links, see [docs-quality](../../../rules/docs-quality.md) row 7) and DOC-OBS-08 (docs metrics).

1. **CLAIM-01, MUST (block).** Before writing copy that matches the objective-claim list, find or create a record with `id` in the repository's `claims.toml`. No record, no sentence: rewrite to a mechanism or delete. Rationale: reasonable basis is needed before dissemination, and later evidence does not cure it ([FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)). Verify: the lint in CLAIM-12 exits non-zero on a match with no `claim:` marker.
2. **CLAIM-02, MUST (block).** Never write a price, limit, quota, plan name, tier name, free-tier boundary or a count ("N clients", "N packages", "N stars") without a record whose `source` is the system of record (pricing config, limits file, registry query) and whose `observed` date is within `refresh_by`. Block, not warn. Rationale: price is a listed element in Art. 6(1)(d) and 7(4)(c) of the EU directive, and "free" has an Annex I trap (point 20). Verify: price grep `[$€£][0-9]|[0-9]+ ?(/|per) ?(mo|month|seat|user|year)|free forever|unlimited|free tier|free plan` on changed copy files must be empty or each match must carry `claim:` with a record of class `price-or-limit`; count grep below.
3. **CLAIM-03, MUST.** Treat a sentence as objective if it contains any of these. Pass: "Resolves the Trio lockfile in 1.2 s (claim:perf-01)". Fail: "Blazing fast resolution".
   - a numeral with a unit or ratio: `\b[0-9]+(\.[0-9]+)? ?(x|×|%|ms|s|MB|GB|k|M)\b`
   - a comparative or superlative of a measurable attribute: `\b(fast|faster|fastest|small|smaller|smallest|light|lighter|lightweight|secure|safer|safest|reliable|stable|scalable|instant|instantly|cheap|cheaper|cheapest|efficient)\b`
   - an absolute or universal: `\b(never|always|every|everywhere|zero|guaranteed|100 ?%|unlimited|all|any|only|no [a-z]+ required)\b`
   - a count: `\b([0-9][0-9,.]*\+?|two|three|four|five|six|seven|eight|nine|ten|dozens?|hundreds?|thousands?) (users|clients|agents|packages|skills|rules|tools|platforms|languages|integrations|registries|customers|downloads|stars|contributors)\b`
   - a compliance, security or privacy status: `\b(compliant|certified|audited|SOC ?2|ISO ?27001|GDPR|HIPAA|encrypted|private|no telemetry|no tracking)\b`
   - an adoption or social-proof phrase: `\b(trusted by|used by|loved by|adopted by|recommended by)\b`
   - a maturity or grade word: `\b(production-ready|battle-tested|enterprise-grade|stable|mature|industry-leading|best-in-class)\b`
   - a comparison: `\b(than|vs\.?|versus|unlike|compared to|alternative to|better than)\b`
   - an AI capability: `\b(AI-powered|accurate|detects|understands|replaces|human-level|state-of-the-art)\b`
   Rationale: the agent cannot judge how a reasonable reader takes an adjective, and the FTC puffery line is narrow and fact-dependent. Verify: run the patterns with `grep -n -i -E` over changed copy files; each hit has a `claim:` marker, an `allow` entry with a reason, or is deleted.
4. **CLAIM-04, MUST.** Rewrite an unproven objective word to a mechanism when no record can be made. Pass: "Switches the active version by changing one pointer; no download". Fail: "Switch versions instantly". Rationale: mechanism claims are checkable by running; "instantly" has no timing in the fleet today. Verify: the rewritten sentence names an action and a command or test an agent can run; reading heuristic: delete the adjective, and the sentence must still say something false-able.
5. **CLAIM-05, MUST.** Treat these as puffery only when all hold: no measurable attribute, no comparison, no number, no command that could test it, and the sentence is not the only description of the product. Otherwise use CLAIM-04. Examples from the fleet: "Automation-first" and "The Simple Package Manager" pass as puffery; "Zero extra infrastructure" fails (absence, checkable). Rationale: [FTC 1983](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm) fn. 41-42; exaggeration taken seriously is actionable. Verify: apply the five-part test sentence by sentence.
6. **CLAIM-06, MUST.** A performance, comparison or count claim states its method in its record: command, workload name and revision, hardware (CPU model, cores, RAM, storage), OS, subject version and competitor versions, cache state, run count and statistic, non-default settings, date, path to raw data. Rationale: SPEC requires disclosure "sufficient for independent reproduction" and the failure corpus names the unreproducible benchmark. Verify: `claims.toml` entry has every field in the class row of the schema table; the raw-data path exists (`test -f`).
7. **CLAIM-07, MUST.** Publish a performance figure next to its method on the same page (a linked benchmark page, as bun and uv do) and state the version it applies to. Never present a figure from a different machine, tool version or workload in the same chart without saying so. Rationale: bun's own page mixes Apple silicon and Xeon rows and a version older than the current release without comment; the FTC reads net impression. Verify: each figure in rendered copy sits within one paragraph or one figure caption of a link or caption that names hardware and version.
8. **CLAIM-08, MUST.** Write the evidence before the claim: the commit that adds a copy string must not precede the commit that adds its record, and a record's `observed` date must not be after the copy's commit date. Rationale: post-claim evidence does not cure a missing basis. Verify: `git log --diff-filter=A --format=%cI -- claims.toml` against `git log -S"<copy string>" --format=%cI -- <surface>`; the record date is the earlier or equal.
9. **CLAIM-09, MUST.** Mark vendor data as vendor data. A figure from the vendor's own product, a sponsor or a vendor-run survey carries `source_type = "vendor-data"` and the rendered copy says "our test" or names the vendor. Rationale: scouts found vendor-reported lifts quoted as fact; the FTC wants the level of proof the ad states. Verify: `grep -c 'source_type = "vendor-data"'` entries all have a `copy` string containing "we", "our", or a vendor name.
10. **CLAIM-10, MUST.** Never write a statistic from memory. A statistic record needs the source's own date, the population and the measure; where the figure is a heuristic its author disclaims, `definition` says so and the copy does not call it a rule. Rationale: canonical-guides scouts found 60:40 and 95:5 repeated as law. Verify: `source` is a URL that returns HTTP 200 (`curl -sIL -o /dev/null -w "%{http_code}" <url>`) and `observed` is not empty.
11. **CLAIM-11, MUST.** Record `refresh_by` using the class default unless a stated reason changes it, and treat a record past `refresh_by` as absent for CLAIM-01. Rationale: platform and law facts decay; every law row is 6 months. Verify: the lint fails on `refresh_by < today`.
12. **CLAIM-12, MUST.** Run the claim lint on every change to a copy surface. Rationale: the evidence must exist before the claim ships ([FTC 1984](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)), and an agent with no human reviewer needs a mechanical gate that fails the build on an unrecorded claim instead of relying on review. Spec:
    - Inputs: `claims.toml` next to each surface directory; the copy files in that directory.
    - Check A (schema): required fields per class (section 7); ISO dates; `refresh_by` after `observed`; `id` unique.
    - Check B (binding): each record's `copy` string appears in a copy file; each `claim:<id>` marker resolves to a record. Markers are `<!-- claim:perf-01 -->` in Markdown and HTML, `// claim:perf-01` in code, or a template call that renders the record's `value` (preferred where the site has a build).
    - Check C (detection): CLAIM-03 patterns on changed lines; a hit with no marker and no `allow` entry fails.
    - Check D (freshness): `refresh_by` in the future; `subject_version` equals the current version read from the manifest named in the file header.
    - Check E (blocked classes): price, limit, plan name and count hits fail without a record, with no `allow` bypass.
    A reference check, in shell: `git diff -U0 origin/main -- <copy files> | grep '^+' | grep -i -E -f claim-patterns.txt | grep -v 'claim:'` must print nothing.
13. **CLAIM-13, SHOULD.** Store records in a data file beside the copy (decision). A comment is allowed only for a one-off, unrendered example value (an example package tag) and never for the five blocked classes. Rationale: a data file can be linted, dated and diffed; the fleet's comment-only dates fail silently (section 6). Verify: `test -f <surface dir>/claims.toml` for every directory containing copy that matches CLAIM-03.
14. **CLAIM-14, SHOULD.** Render a claim's value from its record where the build allows (as `landing-content.ts` does for sessions), and add a test that the built HTML contains the record's `copy` string. Rationale: one source of truth, as `landing.test.ts` already shows for sessions. Verify: a test importing the record file exists and asserts `toContain(copy)`.
15. **CLAIM-15, SHOULD.** Keep claims about security, compliance, privacy and licence to what a file, test or scan shows. Record the file or report path in `check`. Where the repository states an absence ("no cookies, no analytics, no third-party resources"), cite the page that backs it. Rationale: Art. 6(1)(b) lists main characteristics; absence claims are checkable. Verify: `test -e` on the path in `check`.
16. **CLAIM-16, MUST.** AI-capability claims state a metric, an eval set, its size and the model version tested, with the result date. Never write "accurate", "detects" or "replaces" without a number. Rationale: Workado's "98 percent" tested at 53 percent ([FTC 2025-04-28](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims)); DoNotPay allegedly never tested ([FTC 2024-09-25](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes)). Verify: class `ai-capability` entry has `value`, `unit`, `method`, `subject_version`.
17. **CLAIM-17, MUST.** Never write testimonials, reviews, star ratings, customer logos or "trusted by" lines without a named, consenting source; never generate them. Where a material connection exists, `definition` states it and the copy discloses it. Rationale: 16 CFR Part 465 in force 2024-10-21; Endorsement Guides 2023. Verify: class `endorsement` entry has a named `source`; grep for `testimonial|review|trusted by` on copy files finds only marked lines.
18. **CLAIM-18, SHOULD.** Put the limit of a figure beside it: hardware class, workload, version, "as of" date. Rationale: uv prints OS and filesystem caveats; SPEC requires notes for non-default settings. Verify: each performance figure in rendered copy has a caption or sentence naming at least version and date.
19. **CLAIM-19, CONSIDER.** Add an "as of" date to the visible text for count, price and limit claims where the page is cached or static. Rationale: Art. 7(2) treats untimely information as a possible omission. Verify: the rendered paragraph contains an ISO date or month within 60 words of the figure.
20. **CLAIM-20, MUST.** Run the record schema validator before ship, not in review only. Rationale: the agent works without a human in the loop. Verify: CI step exit code.

Pointer rules, not restated: word choice stays in DOC-PLAIN-12; adoption-claim links in DOC-TYPE-15; docs metrics in DOC-OBS-08.

## Dated facts

| Fact | Source | Date the source states | Source type |
|---|---|---|---|
| FTC advertising substantiation statement: reasonable basis before dissemination; express level of proof; post-claim evidence does not cure | [FTC](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation) | 1984-11-23; fetched 2026-11-27; refresh_by 2027-05-27 | authority itself |
| FTC deception statement: three elements; reasonable consumer; materiality; puffery at fn. 41-42 | [FTC archived copy](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm) of ftc.gov (live page lists the PDF as 1983-10-14) | 1983-10-14 per the live page; archive copy 2013; fetched 2026-11-27; refresh_by 2027-05-27 | authority itself, archived copy |
| Directive 2005/29/EC Art. 6, 7, Annex I; Art. 20 in force the day after OJ publication (calendar date unverified, omitted) | [legislation.gov.uk copy of EU text](https://www.legislation.gov.uk/eudr/2005/29/article/6) | directive date 11 May 2005; fetched 2026-11-27; refresh_by 2027-05-27 | authority text, hosted by the UK government; EUR-Lex blocked |
| 16 CFR Part 465 reviews rule in force | [FTC Q&A](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers) | 2024-10-21; fetched 2026-11-27; refresh_by 2027-05-27 | authority itself |
| FTC reviews rule announced | [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) | 2024-08-14 | authority itself |
| Operation AI Comply, five actions; DoNotPay $193,000 proposed settlement | [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes) | 2024-09-25 | authority itself |
| Workado "98 percent" claim, 53 percent in testing; annual compliance reports for 3 years after the first | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims) | 2025-04-28 | authority itself |
| Endorsement Guides finalised (16 CFR Part 255); advertiser answers for endorsers | [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2023/06/federal-trade-commission-announces-updated-advertising-guides-combat-deceptive-reviews-endorsements); Q&A: [FTC](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) | 2023-06-29 (release; no effective date stated); fetched 2026-11-27; refresh_by 2027-05-27 | authority itself |
| CAP Code 3.7: documentary evidence for objective claims; Codes updated for DMCCA | [ASA rule page](https://www.asa.org.uk/type/non_broadcast/code_index/substantiation.html); [ASA archive page](https://www.asa.org.uk/resource/archive-cap-code-prior-to-6apr25-dmcca.html) | rule page undated; Code update in effect 2025-04-07 (DMCCA changes 2025-04-06) per the ASA archive page; fetched 2026-11-27; refresh_by 2027-05-27; current rule number unverified | authority itself |
| SPEC CPU 2017: public results need reproducible disclosure; 1.75 percent republish trigger for pre-production | [SPEC](https://www.spec.org/cpu2017/Docs/runrules.html) | page undated; fetched 2026-11-27 (first 100,000 of 125,266 characters) | industry authority |
| uv benchmark file: macOS, Python 3.12.4, Trio workload, hyperfine | [uv BENCHMARKS.md](https://raw.githubusercontent.com/astral-sh/uv/main/BENCHMARKS.md) | file undated; fetched 2026-11-27 | vendor data |
| bun.sh benchmark disclosures (EPYC 9R14, medians of 3, reproduce links) | [bun.sh](https://bun.sh/) | page shows Bun v1.4.x releases; fetched 2026-11-27 via a summarising fetch tool | vendor data |
| Fleet: 16 adjective hits (4 objective, 3 puffery, 4 mechanism, 5 non-claim); 6 number-bearing headline claims, 5 with a dated source in a code comment, 0 beside rendered text | commands in section 5 | measured 2026-11-27 | own measurement |
| `landing-content.ts` header dates | `ocx-sh/website/site/src/components/landing-content.ts:3-10` | run on ocx 0.6.5, Node v24.22.2, 2026-11-09; versions as of 2026-11-08 | own record |

## What an agent must not decide alone

- Whether to publish any price, plan, tier, limit, free-tier boundary or discount. Ask; record the owner's answer as the `source`.
- Whether a comparison names a competitor, and which competitors. A named-competitor claim is a legal and brand decision (Art. 6(2) covers confusion with a competitor's marks; this file does not settle comparative-advertising law).
- Whether to claim compliance, certification, security audit status or privacy status (SOC 2, GDPR, HIPAA, ISO). Needs a human who holds the report.
- Whether to use a testimonial, logo, review, star count or "trusted by" line, and whether a connection must be disclosed.
- Whether to run a benchmark against a third party's product, publish its numbers, or describe a competitor's configuration.
- Whether to call a product "stable", "production-ready" or "1.0". That is a release-management decision.
- Whether a law row is still correct. The six-month refresh is a fetch, not a legal opinion; counsel decides applicability by jurisdiction.
- Whether an exaggerated phrase is acceptable puffery for the audience. The agent applies the mechanical list and asks when the list says objective and no record can be built.

## AI-agent angle

| Typical error | Smallest mechanical check |
|---|---|
| Writes "blazingly fast", "lightning-fast install", "seamless" from training habit. | CLAIM-03 patterns on added lines. |
| Invents a plausible number ("3x faster", "50% smaller", "10,000+ users"). | Numeral+unit and count patterns with no `claim:` marker fail; record `source` must resolve. |
| Invents a price, plan name or free tier when drafting a pricing page. | CLAIM-02 block; price grep. |
| Copies a competitor's headline figure or a vendor chart as fact. | `source_type = "vendor-data"` requires "our"/vendor-name in the copy. |
| Writes "Nx faster" with no baseline, hardware or version. | Performance class requires `method`, `subject_version`, competitor version. |
| Quotes a statistic it remembers (95:5, 60:40, "78% of developers"). | Statistic class requires a fetched source URL and the source's date. |
| Carries a stale count after a release ("20 clients" after 22). | `check` command re-run and `refresh_by` freshness check in CI. |
| Treats "simple" as safe puffery. | CLAIM-05 five-part test; the audit shows "The Simple Package Manager" has no definition. |
| Writes "SOC 2 compliant", "GDPR-ready", "secure by default" in a README. | Compliance pattern list; blocks without a record whose `check` path exists. |
| Adds "trusted by" logos or invents quotes. | Endorsement class and the testimonial grep. |
| Writes the claim first and the evidence after. | CLAIM-08 git ordering check. |
| Says "AI-powered" or "accurate" without a metric. | AI pattern list; `ai-capability` fields. |

## Contested / evolving

- Puffery for a sophisticated audience. The FTC judges the representation from the perspective of the target group ([FTC 1983](https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm)), which could excuse "simple" to developers. The same text says exaggeration that consumers take seriously is actionable, and the CAP Code asks for evidence for claims "consumers are likely to regard as objective" ([ASA](https://www.asa.org.uk/type/non_broadcast/code_index/substantiation.html)). This file takes the conservative line for an agent; a human may accept more puffery. Not resolved by a source.
- US versus EU structure. The FTC statements are policy and case-law guidance; the EU text is a directive with an Annex I list of always-unfair practices. The EU statute text I read has no puffery carve-out in Art. 6(1); whether national courts and the Commission guidance treat exaggeration as outside Art. 6 was not sourced, unverified, omitted.
- Whether a data file or an inline comment is better. Inline comments are closer to the sentence and cost no tooling; data files are lintable but add a second place to edit. This file chooses the data file for the blocked classes and the five that need a method, and allows a comment only for unrendered example values. Practitioner evidence on either choice was not found.
- Vendor benchmarks as a class. A vendor page can carry full method (bun) or none (the failure-corpus cases). A disclosed method does not make the numbers independent; SPEC's model, where results are reviewed and published centrally, differs from self-published pages.
- Law currency. The reviews rule, AI-claim enforcement and Endorsement Guides all moved in the last 24 months; the dollar penalty for the reviews rule is unconfirmed here. Expect further FTC AI-claim actions and EU rules; the six-month `refresh_by` is the guard.

## Fetch failures

- EUR-Lex (`eur-lex.europa.eu`, three URL forms): bot challenge, no content. Text taken from legislation.gov.uk's copy of the original; later EU amendments unverified.
- `ftc.gov` deception PDF: binary, no extractor installed (`pdftotext`, `pypdf` missing). Read the archived HTML copies (UNT web archive and web.archive.org) instead; both show the same text.
- `docs.astral.sh/uv/benchmarks/`, `bun.sh/docs/install` and `github.com/astral-sh/uv/blob/main/BENCHMARKS.md` returned 404 or 503; the raw GitHub file and bun.sh home page worked.
- FTC "Keep your AI claims in check" blog (2023) returned 404; not used.
- eCFR Part 465 redirected to an unblock page; the FTC Q&A stood in for the rule's text, so section numbers 465.2-465.8 are unverified, omitted.
- `legislation.gov.uk/eudr/1998/6/article/6a` (price reduction announcements) returned 404; the EU 30-day prior-price rule is unverified, omitted.
- SPEC run rules: last 25,266 characters (fair-use section) not read.

None of these stops the central question; blocked = false.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | FTC substantiation policy statement (primary) | 1984-11-23 | The reasonable-basis duty and timing |
| https://web.archive.org/web/2013id_/http://www.ftc.gov/bcp/policystmt/ad-decept.htm | Archived copy of the FTC deception statement (primary) | 1983-10-14 (archive 2013) | Three elements, net impression, puffery at fn. 41-42 |
| https://www.ftc.gov/legal-library/browse/ftc-policy-statement-deception | FTC page for the deception statement (primary; text only as a PDF link) | 1983-10-14 | Date confirmation |
| https://webarchive.library.unt.edu/web/20130217094017/http://www.ftc.gov/bcp/policystmt/ad-decept.htm | UNT archive of the same statement (primary, archived) | archived 2013-02-17 | Second copy of the text |
| https://www.legislation.gov.uk/eudr/2005/29/article/6 | Art. 6, Directive 2005/29/EC (primary law, UK-hosted copy) | directive 2005-05-11 | Misleading actions |
| https://www.legislation.gov.uk/eudr/2005/29/article/7 | Art. 7 (primary law) | same | Misleading omissions, price in invitation to purchase |
| https://www.legislation.gov.uk/eudr/2005/29/annex/I | Annex I (primary law) | same | Always-unfair practices |
| https://www.legislation.gov.uk/eudr/2005/29/article/20 | Art. 20 entry into force (primary law) | same | In-force rule |
| https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes | FTC Operation AI Comply (primary) | 2024-09-25 | AI claims need evidence |
| https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-order-requires-workado-back-artificial-intelligence-detection-claims | FTC Workado order (primary) | 2025-04-28 | Accuracy claim versus test |
| https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials | FTC reviews rule release (primary) | 2024-08-14 | Prohibited review practices |
| https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers | FTC reviews rule Q&A (primary) | in force 2024-10-21 | Effective date |
| https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking | FTC Endorsement Guides Q&A (primary) | 2023 revision, page undated | Material connection and advertiser liability |
| https://www.ftc.gov/news-events/news/press-releases/2023/06/federal-trade-commission-announces-updated-advertising-guides-combat-deceptive-reviews-endorsements | FTC release on the revised Endorsement Guides (primary) | 2023-06-29 | Dates the revision |
| https://www.asa.org.uk/type/non_broadcast/code_index/substantiation.html | ASA CAP Code substantiation (primary, UK) | page undated | "Documentary evidence" wording |
| https://www.asa.org.uk/resource/archive-cap-code-prior-to-6apr25-dmcca.html | ASA archive note on the pre-DMCCA Code (primary, UK) | updated Code in effect 2025-04-07 | Dates the Code update |
| https://asa.org.uk/codes-and-rulings/advertising-codes/register-of-cap-code-changes.html | ASA register of Code changes (primary, UK) | entries undated | No change listed for 3.7 |
| https://www.spec.org/cpu2017/Docs/runrules.html | SPEC CPU 2017 run and reporting rules (industry authority) | undated | Required disclosure fields |
| https://raw.githubusercontent.com/astral-sh/uv/main/BENCHMARKS.md | uv benchmark page (vendor data) | undated | A method page with commands, no date |
| https://bun.sh/ | bun.sh benchmark charts and disclosures (vendor data) | 2026-11 era | Per-chart method lines and gaps |
| https://clickhouse.com/blog/databricks-reyden-benchmark-transparency-clickhouse | Vendor-benchmark failure example (cited via the failure-corpus scout, not re-fetched) | 2026-06-30 | The unreproducible-benchmark pattern |

17 pages read by this worker (counting the two archived copies of the deception statement as one); 14 are primary or authority sources.
