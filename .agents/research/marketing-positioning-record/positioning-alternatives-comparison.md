---
title: Naming the alternative, saying when not to use, and keeping a comparison fair and dated
program: product
sub_program: marketing
topic: marketing-positioning-record
worker: positioning-alternatives-comparison
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
---

# Naming the alternative, saying when not to use, and keeping a comparison fair and dated

Scope: comparative-advertising law (EU and US text), a measurement of 40 upstream READMEs and their linked comparison pages, the Stack Overflow survey on why developers reject tools, and the decisions the commission asks for. Not covered: national transposition laws, trademark case law, UK and non-EU law (see "Unverified, omitted"). Fetch date for every source below is 2026-11-27 unless a row says otherwise.

## Table of contents

1. Summary
2. Findings (law; reader behaviour; measurement; decisions)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested
8. Unverified, omitted
9. Sources

## Summary

- Decision: a README MAY name alternatives as a bare linked list (no factual claim, no row). Any factual statement about an alternative (version, speed, feature, price, "no Windows") needs a comparison row and lives on a comparison page; the README links to it.
- Decision: "when not to use" is authoritative in the docs (one page, explanation type); the README carries a short pointer or at most 5 bullets; the landing page carries none except an optional one-line fit statement.
- Decision: a comparison row has 13 fields (below; `source` and `source_type` are two fields); `subject_version` is the field this worker owns in the shared evidence record.
- Decision (judgement, no authority sets a number): a comparison row is pulled or re-run 12 months after `observed`; a row that states a package-registry or release fact (a version a competitor ships) 6 months; either one sooner on a new major release of the competitor or a new minor of the subject.
- EU Directive 2006/114/EC Art. 4 permits comparative advertising only if each of 8 conditions holds, among them: same needs or purpose, "material, relevant, verifiable and representative" features, no denigration, no confusion ([OJ text](http://publications.europa.eu/resource/celex/32006L0114), in force 12 Dec 2007).
- The US position (16 CFR 14.15, 44 FR 47328, 13 Aug 1979) encourages naming competitors, "but requires clarity, and, if necessary, disclosure"; the bases of comparison must be "clearly identified" ([eCFR](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15)).
- Neither text sets a staleness window. Staleness is a verifiability and substantiation problem: the FTC requires "a reasonable basis ... before they are disseminated" ([FTC 1984 statement](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)); a stale competitor claim loses that basis.
- Measured: in 40 upstream READMEs, 12 files have a heading that matches the comparison regex; 6 name an alternative; 1 has an explicit "why not use this" section (ripgrep); 2 of 12 comparison units show a date to the reader. 3 of the 5 units whose age can be read are older than 12 months.
- Stack Overflow 2025 (survey page: "over 49,000+ responses from 177 countries", [survey home](https://survey.stackoverflow.co/2025/), undated page, independent survey; the rejection question itself has n = 34,188, section 2): "Availability of better alternatives" ranks 3rd among reasons to reject a technology, after security or privacy and prohibitive pricing. The 2026 survey has no such question.
- The ocx drift table is the only dated, sourced comparison in the fleet, but its date sits in a source comment, not on the rendered row (checked in the file header; the rendered page was not opened).
- Grimoire names no alternative on any surface (audit measurement).

## Findings

### 1. What the law requires of a comparison

**EU, Directive 2006/114/EC.** Fetched from the Publications Office OJ text (L 376/21, 27.12.2006) because EUR-Lex answered non-browser requests with an empty HTTP 202. Provision numbers as in that text:

| Provision | Content (paraphrase; quoted words are verbatim) |
|---|---|
| Art. 2(c) | "comparative advertising" is any advertising that "explicitly or by implication identifies a competitor or goods or services offered by a competitor". A table that never names the rival but is recognisable counts. |
| Art. 4(a) | not misleading under Arts 2(b), 3, 8(1) of this Directive or Arts 6 and 7 of Directive 2005/29/EC |
| Art. 4(b) | compares goods or services "meeting the same needs or intended for the same purpose" |
| Art. 4(c) | "objectively compares one or more material, relevant, verifiable and representative features ... which may include price" |
| Art. 4(d) | does not "discredit or denigrate" a competitor's marks, goods, services, activities or circumstances |
| Art. 4(f), (g), (h) | no unfair advantage of a competitor's reputation; no presenting as imitation or replica; no confusion between advertiser and competitor |
| Art. 3(a) | misleading-ness weighs "the results and material features of tests or checks carried out" and "date of manufacture or provision" among the features |
| Art. 11 | in force 12 December 2007 |

Consequence for copy: "verifiable" and "representative" (4c) is the legal hook for a dated, method-linked row; "same needs" (4b) is the hook for comparing like with like (a runtime manager against a runtime manager, not against a package manager). The Directive covers business-to-business advertising; the consumer-facing misleading rules it points at are in Directive 2005/29/EC.

**EU, Directive 2005/29/EC (UCPD), Arts 6 and 7.** Art. 6(1) makes a practice misleading if it "contains false information" or "in any way, including overall presentation, deceives ... even if the information is factually correct", about, among others, "the results and material features of tests or checks carried out on the product". Art. 7(1) makes it a misleading omission to omit "material information that the average consumer needs" to decide. This matters to the when-not-to-use decision: a comparison that lists only wins can be misleading by omission toward consumers; toward businesses Art. 3 of 2006/114 reaches the same result through "in any way, including its presentation". Entry into force: "the day following its publication" (OJ 11.6.2005), so 12 June 2005 by derivation. Source: [OJ text](http://publications.europa.eu/resource/celex/32005L0029).

**US, 16 CFR 14.15 (FTC Policy Statement on Comparative Advertising, 44 FR 47328, 13 August 1979).** Read on eCFR "current". Key text: "Commission policy in the area of comparative advertising encourages the naming of, or reference to competitiors, but requires clarity, and, if necessary, disclosure to avoid deception of the consumer"; the Commission "has supported the use of brand comparisions where the bases of comparision are clearly identified"; disparagement is permissible "so long as it is truthful and not deceptive"; and comparative claims are judged "in the same manner as all other advertising techniques" with no higher substantiation bar. The footnote defines comparative advertising as "advertising that compares alternative brands on objectively measurable attributes or price, and identifies the alternative brand by name, illustration or other distinctive information". Source: [eCFR 14.15](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15).

**US, FTC Policy Statement Regarding Advertising Substantiation (23 November 1984, appended to Thompson Medical Co., 104 F.T.C. 648, 839).** "advertisers and ad agencies have a reasonable basis for advertising claims before they are disseminated"; "The reasonable basis doctrine requires that firms have substantiation before disseminating a claim." Source: [ftc.gov](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation).

What the law does not give: a staleness window, a requirement to state the competitor's strengths, or a requirement to publish "when not to use". Those are practice decisions; the rules below label them as such. The "clearly identified bases" (US) and "verifiable" (EU) texts do justify requiring version, date and method in the row.

### 2. Why the reader looks for alternatives

Stack Overflow Developer Survey 2025, question "What would turn you off or cause you to reject it (most to least important)?", 34,188 responses (69.7 percent of respondents), ranked, no percentages: 1 security or privacy concerns, 2 prohibitive pricing, 3 availability of better alternatives, 4 poor usability, 5 inefficient or time-costly, 6 outdated or obsolete technology or features, 7 ethical concerns, 8 lack of or sub-par API, 9 lack of AI or AI agents ([survey page](https://survey.stackoverflow.co/2025/work/)). Same page: "What attracts you" ranks easy-to-use API and robust API first and second; "Influence on technology purchases": 19.8 percent influenced a substantial purchase, 15.5 percent endorsed an open-source tool without purchase, 3.8 percent endorsed a tool that was not adopted.

Stack Overflow Developer Survey 2026 (results blog dated 6 October 2026, "more than 30,000" respondents): the site index (Work, AI, Technology, Community, Knowledge, Methodology) has no rejection question; it was not repeated ([2026 home](https://survey.stackoverflow.co/2026/), [blog](https://stackoverflow.blog/2026/10/06/the-results-of-the-2026-developer-survey-are-here/)). The nearest 2026 item is AI adoption factors (n = 11,462): price matches value 27.0 percent, security and privacy 28.7 percent. These measure adoption, not rejection; do not cite them as reasons to reject.

What it supports and what it does not: a reader who is deciding is already weighing alternatives (rank 3), so a page that names none leaves the comparison to a third party. It does not show that candour raises conversion; the scout's claim that developers "reward guides that say how not to use a product" rests on a book review not fetched here (see Contested).

### 3. Measurement: upstream comparison units

Corpus rebuilt because it was absent: `~/.cache/research-lang/exemplars/product/exemplar-readmes/readme/` holds 40 READMEs fetched 2026-11-27 with `gh api repos/$r/readme -H 'Accept: application/vnd.github.raw'`; the repo list `repos.txt` is the 40 names in the `CAD` dictionary of the [audit appendix](../product-audit/exemplar-readmes.md) (line 549). The linked pages were fetched with `gh api repos/$r/contents/$path` (raw) or the web.

Heading scan, command (fences skipped):
`for f in readme/*.md; do awk -v F=$f 'BEGIN{fence=0} /^(```|~~~)/{fence=!fence;next} !fence && /^#+[ \t]*.*([Ww]hy|[Cc]ompar|[ ]vs[ .]|[Vv]ersus|[Aa]lternativ|[Mm]otivation|[Bb]enchmark|[Dd]iffer)/{print F": "NR": "$0}' $f; done`
It returned 20 heading lines in 12 files (the audit counted 11; my pattern adds "differ" within "Customizing for different types of input" in fzf and similar). Six of the 20 are false positives (fzf x2, bat "different pager", fd "Parallel vs. serial", lazygit "Compare two commits", k9s "Benchmark Your Applications"). Reading the sections gives these comparison units, plus the claim-with-link units from the READMEs of uv and ruff (no heading, "10-100x faster" in the feature list):

| # | Unit | Where | Date shown to reader | Versions named | Method linked | Last change (git or page) | Older than 12 months at 2026-11-27 |
|---|---|---|---|---|---|---|---|
| A | ripgrep "Is it really faster", linked blog | README then blog | yes, 2016-09-23 ([blog](https://burntsushi.net/ripgrep/)) | yes: rg 0.1.2, GNU grep 2.25, git grep 2.7.4, ag/ucg/pt/sift by commit | yes (benchsuite, raw CSV) | 2016-09-23 | yes |
| B | ripgrep "Feature comparison" | README, points to a third-party table | no; text says "recently" | no | no | not determinable | unknown |
| C | just "Alternatives and Prior Art" | README, 11 names, one line each | no | no | no | not determinable | unknown |
| D | gh "Comparison with hub" | README then docs/gh-vs-hub.md | no ("announced in early 2020" in text) | no | no | 2020-09-17 (`gh api "repos/cli/cli/commits?path=docs/gh-vs-hub.md&per_page=1"`) | yes |
| E | bat "Project goals and alternatives" | README then doc/alternatives.md | no | no | yes (script in the doc) | 2025-10-31 (same command pattern) | yes (about 13 months) |
| F | lazygit "Alternatives" | README, 3 names, "may be a better fit" | no | no | no | not determinable | unknown |
| G | earthly "different from Dockerfiles / Bazel" | README prose | no | no | no | not determinable | unknown |
| H | esbuild "Why?" | README bar chart | no | no | no | not determinable | unknown |
| I | pnpm "Benchmark" | README then [pnpm.io/benchmarks](https://pnpm.io/benchmarks) | yes: "Data fetched Nov 26, 2026" | yes: npm v12.2.3, pnpm v11.28.13, v12.23.0 | yes (pnpm/benchmarks repo, "fastest of the three most recent runs") | 2026-11-26 | no |
| J | fd "Benchmark" | README inline | no | no (tool versions absent) | yes (commands, hyperfine, warm cache stated) | not determinable | unknown |
| K | uv "10-100x faster" | README then [BENCHMARKS.md](https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md) | no | partial: "Python 3.12.4", macOS; compared tools not versioned | yes (`scripts/benchmark`, hyperfine) | 2026-10-08 (`gh api "repos/astral-sh/uv/commits?path=BENCHMARKS.md&per_page=1"`) | no |
| L | ruff "10-100x faster" | README chart; FAQ | no | no | no (chart image only; FAQ ">99.9% of lines formatted identically" gives no method) | not determinable | unknown |

Docs-page units (fetched via WebFetch, summaries by the fetch tool, quotes below are its excerpts of the page):

| # | Page | Date shown | Versions | Method | When-not-to-use content |
|---|---|---|---|---|---|
| M | [uv pip compatibility](https://docs.astral.sh/uv/pip/compatibility/) | yes, footer 14 Oct 2026 | yes (uv v0.1.39, pip 26.0) | none (links PEPs and issues) | not titled so, but lists 8 differences: no `--user` installs, ignores pip config files, etc. |
| N | [Bun Node.js compatibility](https://bun.sh/docs/runtime/nodejs-compat) | no ("We update this page regularly") | yes: Bun v1.4.5, Node.js v26 | described, not linked: "thousands of tests from Node.js' test suite" | status markers: not implemented, partial |
| O | [Bun vs esbuild](https://bun.com/docs/bundler/esbuild) | no | Bun only; esbuild unversioned | described ("10 copies of three.js"), not linked | yes: "no built-in development server", "no syntactic down-leveling", plugin API a subset |
| P | [Deno Node compatibility](https://docs.deno.com/runtime/fundamentals/node/) | yes, "Last updated on July 30, 2026" | yes (Deno 2.0 to 2.9, Node v26.3.0) | none | yes: partial APIs, install scripts do not run, `node` shim best-effort |
| Q | [Ruff FAQ](https://docs.astral.sh/ruff/faq/) | no | no | none | yes: "does not support custom lint rules"; "Ruff is a linter, not a type checker" |

Tallies (from the two tables):
- Comparison or benchmark units at README level: 12 (A-L). Date shown to the reader: 2 of 12 (A, I). Competitor versions named: 2 of 12 fully (A, I), 1 partial (K). Method linked or inline: 5 of 12 (A, E, I, J, K).
- Docs-page units: 5 (M-Q). Date shown: 2 of 5 (M, P). Versions named: 3 of 5 fully (M, N, P), 1 partial (O). Method linked: 0 of 5.
- Units with a determinable last-change date: A, D, E, I, K = 5. Older than 12 months: 3 (A, D, E). The other 7 README units and Q cannot be aged from the page; under a "date required" rule they fail by construction.
- READMEs among 40 that name at least one alternative or rival in a comparison heading: ripgrep, just, gh, bat, lazygit, earthly = 6 (the 20-line scan, hand-classified). READMEs with an explicit "why not use this": ripgrep ("Why shouldn't I use ripgrep?": need a portable POSIX tool, rely on a feature elsewhere, a performance edge case, no platform build) = 1; lazygit points to better fits = 1 more as a pointer.
- Fleet baseline from the audit (not re-measured): 0 of 18 fleet READMEs name an alternative (`product-audit/exemplar-readmes.md` line 140 and smell 5, `grep -n -i -E 'asdf|mise|homebrew|brew|nix|alternative|compared|unlike| vs '`).
- Fleet drift table: `ocx-sh/website/site/src/components/landing-content.ts` lines 1-18 (read-only): header states "Every command and output line was run against ocx 0.6.5 (Node v24.22.2, 2026-11-09)"; the `PROBLEM` array comment gives "Versions as of 2026-11-08" and six source pages; rows read for example "Node 18 · end of life since 2025". The date is in a code comment; whether the rendered page repeats it was not checked. The row "nvm: per shell, from .nvmrc · no Windows" is an unversioned negative claim about another tool and has no version of nvm in the row.

Reading: the best exemplars (A, I, K) all pair the claim with a linked method; only A and I show a date to the reader, and only I regenerates the data (dated the day before the fetch). The pages that name alternatives most plainly (C, F) make no factual claim and so need no row: that is the pattern the first decision rests on.

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER. "Row" means a comparison row in the evidence record (class `comparison`).

**PAC-01 (MUST).** Put every factual statement about a named alternative (a version, a number, a feature present or absent, a price, "no Windows") in a comparison row; do not write it in prose without one.
Rationale: EU Art. 4(c) requires "verifiable" features; the FTC requires substantiation before dissemination.
Verify: list the sentences on the page that contain a competitor name from the positioning record and a verb of state (`has`, `lacks`, `supports`, `no`, `requires`, `is end of life`): each has a row id or a link to the row. Fail example: "nvm: no Windows" with no row. Pass: the same text followed by a link to the row with nvm version, observed date and source.

**PAC-02 (MUST).** A comparison row has these 13 fields (`source` and `source_type` count as two): `competitor` (name and URL), `competitor_version` (exact release, or commit hash where no release exists), `subject_version` (the product's own exact version; the field this worker owns), `dimension` (one objective attribute, a word from a closed list kept in the record), `claim`, `result_subject`, `result_competitor`, `competitor_strength` (at least one attribute where the other tool wins or fits better; may be a fit statement), `method` (a link or a command), `observed` (ISO date the check ran), `source` plus `source_type` (own-measurement, vendor-data, third-party-study, platform-doc), `refresh_by` (ISO date).
Rationale: each field maps to a legal or reading test (4b same needs = `dimension`; 4c verifiable = `source`, `method`; 4d no denigration and fairness = `competitor_strength`; staleness = `observed`, `refresh_by`).
Verify: a lint reads the record file and fails on any empty field; for `competitor_version` fails on `latest`, `current`, `stable`, or a bare major without the date. Command shape: `grep -E '^(competitor_version|subject_version):\s*(latest|current|stable|)\s*$' <record>` returns no line.

**PAC-03 (MUST).** Show `observed` and both versions to the reader on the same surface as the claim (a visible "Checked 2026-11-08 against X 24.22, Y 0.6.5" line), not only in a source comment or frontmatter.
Rationale: units A and I are the only upstream ones with a visible date; the fleet date sits in a code comment. A reader cannot discount an undated claim.
Verify: render or read the built HTML; the string of `observed` appears within the section containing the comparison (`grep -c '<observed ISO date>' <built page>` is at least 1 for each row on it). Fail: date only in `landing-content.ts` comment.

**PAC-04 (MUST).** Link or print the method for any performance or measurable claim: a script path, a command with its flags, hardware and the cache state; "no timing or size is claimed" is an allowed alternative.
Rationale: 16 CFR 14.15 requires "bases of comparison ... clearly identified"; units A, I, K and J do; C, F, G, H, L do not.
Verify: for each row with `dimension` in a performance set, `method` is a URL that returns 200 or a command that begins with an executable name; reviewer re-runs it once.

**PAC-05 (MUST).** Pull or re-run a comparison 12 months after `observed`; a row that states a version or availability fact about a competitor (what a registry, package manager or platform ships) 6 months; and on a new major release of the competitor or a minor of the subject, whichever is first. "Pull" means remove the sentence or replace it with a link to a fresh row; it does not mean leave it and add a caveat.
Rationale: no law sets a number (Findings 1); this is a judgement. Evidence: 3 of the 5 units whose age is readable were older than 12 months (A 10 years, D 6 years, E about 13 months), and the ocx drift rows name versions that change at each distribution release.
Verify: `refresh_by <= today` in the record fails the build; `refresh_by` is `observed` plus 12 months (6 for the version-fact class) unless the record states an earlier release trigger. Command shape: a script comparing ISO dates; no grep substitute.

**PAC-06 (MUST).** Compare like with like: both tools meet the same need, on the same attribute, at stated settings (cold or warm cache, same operating system, same package set).
Rationale: EU Art. 4(b) and 4(c) "representative".
Verify: reading heuristic: for each row the sentence "Both are used to ___" can be completed from the `dimension` field with no change of noun. Fail: "ocx is faster than apt" (apt installs OS packages; the dimension is not the same need). Pass: "To get Node 24 on a fresh Ubuntu 24.04 machine: apt gives Node 18, ocx gives Node 24, checked 2026-11-08".

**PAC-07 (MUST).** Each comparison names at least one thing the competitor does better or a case where it fits better (`competitor_strength`), in the same section as the claims in the subject's favour.
Rationale: omitting material information can be misleading (UCPD Art. 7(1)); PostHog's handbook ([vendor policy](https://posthog.com/handbook/marketing)) sets the same bar for its own copy ("Don't unfairly criticize or make false claims about our competitors"; competitors "will be a better solution for what a customer needs").
Verify: reading heuristic with pass and fail: the section contains the competitor's name followed within two sentences by a statement of a strength or fit ("use X if you need ..."). Pass: ripgrep "The best tool for this job is good old grep." ([ripgrep README](https://github.com/BurntSushi/ripgrep/blob/master/README.md)) Fail: a table where every cell favours the subject.

**PAC-08 (MUST NOT).** Do not use disparaging words about a named alternative; state the attribute and the result.
Rationale: EU Art. 4(d) forbids discrediting or denigrating; the US allows truthful disparagement but a lint cannot judge truth, so the safe rule is neutral facts.
Verify: grep the section for a closed list: `grep -n -i -E 'bloated|slow|clunky|outdated|legacy|dead|broken|painful|terrible|worse' <page>` on text adjacent to a competitor name returns no hit unless the same sentence carries a row link. Pass: "Node 18 · end of life since 2025" (a dated fact with a source). Fail: "apt ships ancient Node".

**PAC-09 (MUST).** Do not use a competitor's logo, wordmark or styling; use the name in plain text.
Rationale: EU Art. 4(f) and 4(h) (reputation, confusion); trademark case law was not fetched (see Unverified, omitted), so the rule stays conservative.
Verify: no competitor logo file in the page's asset list; `grep -r -i -E '<competitor>.*\.(svg|png)' <assets dir>` returns nothing.

**PAC-10 (SHOULD).** A README names the alternative the reader uses today as a bare linked list or one sentence ("Instead of X"), in the first screen or a section titled "Alternatives" with no factual claim.
Rationale: SO 2025 ranks "better alternatives" third among rejection reasons; 6 of 40 upstream READMEs do (just, lazygit and gh with no claim attached).
Verify: `grep -n -i -E '^#+.*(alternativ|compar|instead of|vs\.? )' README.md` returns at least one heading, and every linked name appears in the positioning record's `alternatives` list; no sentence in the section matches PAC-01's state verbs without a row link. A README must not carry a numeric or version claim about an alternative; it links to the comparison page.

**PAC-11 (MUST).** The docs carry one page that lists when not to use the product, in the explanation style: 3 to 7 reasons, each one a condition the reader can check, each naming the better tool or "no tool in this space does".
Rationale: Art. 7 omission risk; the exemplar pattern (ripgrep [README](https://github.com/BurntSushi/ripgrep/blob/master/README.md), uv compatibility, Bun [Node compat](https://bun.sh/docs/runtime/nodejs-compat) and [esbuild](https://bun.com/docs/bundler/esbuild) pages, Deno [Node compat](https://docs.deno.com/runtime/fundamentals/node/), Ruff FAQ) shows 5 of 17 units with explicit limits; it is where a reader making an adoption decision looks.
Verify: heading regex `^#+.*(not (to )?use|when not|limitations|non-goals|shouldn't|alternatives)` matches exactly one docs page per product; count of bullets 3 to 7; reading heuristic: each bullet is falsifiable by the reader without asking the maintainer. Pass: "You need a portable and ubiquitous tool ... good old grep". Fail: "Not for everyone".

**PAC-12 (SHOULD).** The README carries a one-line pointer to the when-not-to-use page, or at most 5 bullets copied from it with a link; the landing page needs none but MAY put one fit sentence beside the call to action.
Rationale: the README is where 40 of 40 exemplars are read first; ripgrep keeps it in the README (4 bullets, [source](https://github.com/BurntSushi/ripgrep/blob/master/README.md)); the landing page serves conversion and PAC-11 is the single source.
Verify: `grep -n -i -E 'when not to use|not for you|shouldn.t use|limitations' README.md` returns a heading or a link whose target is the PAC-11 page, and the bullets (if present) are a subset of that page (string match).

**PAC-13 (SHOULD).** Prefer data regenerated from a committed benchmark repo over hand-typed numbers; the page prints the generation date.
Rationale: pnpm's page ([pnpm.io/benchmarks](https://pnpm.io/benchmarks), vendor data, 2026-11-26) prints "Data fetched Nov 26, 2026 from pnpm/benchmarks" and states the rule "fastest of the three most recent runs".
Verify: the number in the copy equals the value in the committed data file (`grep` the figure in both); the page prints the date.

**PAC-14 (CONSIDER).** Build the comparison table as a data file and render it, so `refresh_by` can fail the build.
Rationale: moves PAC-05 from review to the pipeline.
Verify: a CI step fails when any `refresh_by` is in the past.

Law rows (each: provision, source, fetch date, in-force date, refresh_by = fetch + 6 months):

| Row | Provision | Primary URL | Fetched | In force | refresh_by |
|---|---|---|---|---|---|
| LAW-1 | Directive 2006/114/EC Art. 2(c), 3, 4(a)-(h) | http://publications.europa.eu/resource/celex/32006L0114 | 2026-11-27 | 2007-12-12 (Art. 11) | 2027-05-27 |
| LAW-2 | Directive 2005/29/EC Arts 6(1), 7(1) (misleading actions and omissions) | http://publications.europa.eu/resource/celex/32005L0029 | 2026-11-27 | 2005-06-12 (derived: day after publication 2005-06-11) | 2027-05-27 |
| LAW-3 | 16 CFR 14.15, FTC Policy Statement on Comparative Advertising | https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15 | 2026-11-27 (eCFR "current") | statement 1979-08-13 (44 FR 47328); still codified | 2027-05-27 |
| LAW-4 | FTC Policy Statement Regarding Advertising Substantiation | https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | 2026-11-27 | 1984-11-23 | 2027-05-27 |

Rules PAC-01, 02, 06, 07, 08 cite LAW-1 and LAW-2; PAC-04 cites LAW-3; PAC-01, 05 cite LAW-4.

## Dated facts

| Fact | Value | URL | Date the source states | Source kind |
|---|---|---|---|---|
| Comparative advertising conditions | 8 conditions, Art. 4(a)-(h) | http://publications.europa.eu/resource/celex/32006L0114 | OJ L 376, 27.12.2006; in force 12 Dec 2007 | authority (EU OJ) |
| Directive 2006/114/EC text status | OJ original (codified version); later amendments not checked | same | generated 2025-06-15 per file header | authority |
| UCPD misleading omission | Art. 7(1) | http://publications.europa.eu/resource/celex/32005L0029 | OJ L 149, 11.6.2005 | authority |
| FTC comparative advertising policy | "encourages the naming of, or reference to competitiors" | https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15 | 44 FR 47328, 13 Aug 1979 | authority |
| FTC substantiation | reasonable basis before dissemination | https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | 23 Nov 1984 | authority |
| SO 2025 reasons to reject | "better alternatives" rank 3 of 10; n = 34,188 (69.7 percent) | https://survey.stackoverflow.co/2025/work/ | survey 2025; results blog 2025-07-29 (seen only in search listing) | independent survey (platform's own) |
| SO 2026 survey | no rejection question; results 2026-10-06; "more than 30,000" respondents | https://stackoverflow.blog/2026/10/06/the-results-of-the-2026-developer-survey-are-here/ | 2026-10-06 | independent survey |
| pnpm benchmark | "Data fetched Nov 26, 2026"; npm v12.2.3, pnpm v12.23.0 | https://pnpm.io/benchmarks | 2026-11-26 | vendor data (project's own) |
| uv benchmarks | Python 3.12.4 on macOS; no date in page; repo last change 2026-10-08 | https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md | 2026-10-08 (git) | vendor data |
| uv pip compatibility | footer 14 Oct 2026; uv v0.1.39, pip 26.0 | https://docs.astral.sh/uv/pip/compatibility/ | 2026-10-14 | vendor docs |
| Deno Node compatibility | "Last updated on July 30, 2026" | https://docs.deno.com/runtime/fundamentals/node/ | 2026-07-30 | vendor docs |
| Bun Node compatibility | Bun v1.4.5 against Node.js v26; no date | https://bun.sh/docs/runtime/nodejs-compat | none | vendor docs |
| ripgrep benchmark post | 2016-09-23; rg 0.1.2 | https://burntsushi.net/ripgrep/ | 2016-09-23 | vendor (author) data |
| gh vs hub page | last commit 2020-09-17 | https://github.com/cli/cli/blob/trunk/docs/gh-vs-hub.md | 2020-09-17 (git) | vendor docs |
| bat alternatives | last commit 2025-10-31 | https://github.com/sharkdp/bat/blob/master/doc/alternatives.md | 2025-10-31 (git) | vendor docs |

## What an agent must not decide alone

- Which competitors to name at all, and whether to name one at all in a jurisdiction the owner has not cleared; the list lives in the positioning record and a human signs it.
- Whether a comparison is lawful for a given product and market: national transposition and trademark use were not fetched; ask a lawyer before the first named-competitor table ships.
- Whether to publish a "when not to use" reason that affects sales (for example a missing platform): the owner decides the wording; the agent drafts only from the product's own issue tracker or docs.
- Whether to run a benchmark against a competitor's product (licence terms of some products restrict publishing benchmarks; not researched here).
- Whether a 12-month window is acceptable for a regulated sector (finance, health) where the agent should ask for a shorter one.
- Any claim about a competitor's security, pricing or legal status: ask, do not infer from a cached page.

## AI-agent angle

| Mistake an LLM characteristically makes | Smallest mechanical check |
|---|---|
| States a competitor's current version or feature set from training data (a runtime, a package manager) | PAC-02 lint: `competitor_version` and `observed` must be filled from a fetch in the same session; fail on any competitor state verb with no row |
| Writes "faster", "lighter", "simpler" than a rival with no number | grep for comparative adjectives next to a competitor name: `grep -n -i -E '(faster|lighter|simpler|better|cheaper) than' <page>`; each hit needs a row id |
| Compares unlike things (a version manager against an OS package manager) | PAC-06 "Both are used to ___" completion test |
| Lists only subject wins | PAC-07: no `competitor_strength` field empty |
| Copies a benchmark figure from a README or blog without date, version or hardware | method and observed fields required; fail when `method` empty |
| Adds a hedge ("as of writing") instead of a date | grep `as of (writing|now|today)` returns no hit; the date is an ISO string |
| Invents "when not to use" bullets that are really marketing ("not for teams that don't value quality") | PAC-11 falsifiability test; each bullet needs a checkable condition |
| Treats a vendor's own benchmark as neutral | `source_type` must read `vendor-data` or `own-measurement` on the row, and the page says whose data it is |

## Contested

- **Name rivals in the README or not.** For: PostHog's handbook says it compares itself "to help customers make a decision" and accepts that a competitor "will be a better solution" ([handbook](https://posthog.com/handbook/marketing)); the FTC encourages naming ([16 CFR 14.15](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15)). Against, by practice: 34 of 40 upstream READMEs do not name an alternative in a comparison heading (scan above), including uv, Bun and Deno, which move the comparison to docs pages. Position taken: names only in the README, claims on a comparison page.
- **Whether candour about limits helps conversion.** The scout cites a book review ([Nordic APIs](https://nordicapis.com/book-review-developer-marketing-does-not-exist/), not fetched here) for developers rewarding "how not to use". SO 2025 shows rejection reasons but does not test candour. No controlled study was found; the rule rests on the legal omission risk and exemplar practice, not on a conversion effect.
- **Benchmarks in the README at all.** ripgrep links a method-heavy post; esbuild and ruff show a chart with no linked method; pnpm and uv link a method. The rule (PAC-04) requires the method wherever the claim appears; practice is split.
- **Staleness window.** No authority names one. pnpm regenerates its data and prints the date; Bun says "We update this page regularly" with no date; Deno prints a last-updated date. The 12-month and 6-month values are this worker's judgement; the alternative (regenerate on every release) is stricter and better where a benchmark repo exists (PAC-13).

## Unverified, omitted

No rule row exists for these; each needs a primary fetch before use.
- National transposition of Directive 2006/114/EC (Germany UWG sec. 6, France, others): not fetched.
- Trademark case law on naming a competitor in comparison (CJEU decisions): not fetched; scout row #23 itself says "case law not fetched".
- UK Business Protection from Misleading Marketing Regulations 2008, US Lanham Act sec. 43(a), and state unfair-competition law: not fetched.
- Later amendments or consolidated versions of Directive 2006/114/EC after 2006: the OJ original was read; EUR-Lex consolidated view returned HTTP 202 empty. In-force date of the Directive as read is 12 December 2007; amendment status unverified.
- FTC comparative-advertising URL named in the commission (`ftc.gov/...comparative-advertising`) returned HTTP 403 to curl and 404 to the fetch tool; the same text was read on eCFR (16 CFR 14.15).
- PostHog `handbook/company/competitors` returned 404; only the handbook marketing page was read.
- Stack Overflow 2025 publication date was read only from a search listing of the results blog (2025-07-29), not fetched; the survey page itself states no date.
- The uv `BENCHMARKS.md` page returned HTTP 503 to the fetch tool; it was read through `gh api` raw content.
- Docs pages M to Q were read through the fetch tool, whose output is a model summary of the page; quotes in this file are from that summary, not from a raw copy.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| http://publications.europa.eu/resource/celex/32006L0114 | Directive 2006/114/EC, OJ text (primary) | 2006-12-12, in force 2007-12-12 | Art. 4 conditions |
| http://publications.europa.eu/resource/celex/32005L0029 | Directive 2005/29/EC UCPD, OJ text (primary) | 2005-05-11, OJ 2005-06-11 | Arts 6, 7 misleading action and omission |
| https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.15 | 16 CFR 14.15 FTC comparative advertising policy (primary) | 1979-08-13 | US position on naming competitors |
| https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation | FTC substantiation statement (primary) | 1984-11-23 | reasonable basis before a claim |
| https://survey.stackoverflow.co/2025/work/ | SO 2025 survey, work section (primary survey) | 2025 | reasons to reject, rank 3 alternatives |
| https://survey.stackoverflow.co/2026/ | SO 2026 survey index (primary survey) | 2026 | confirms no rejection question |
| https://stackoverflow.blog/2026/10/06/the-results-of-the-2026-developer-survey-are-here/ | SO 2026 results blog (primary) | 2026-10-06 | respondent count, adoption data |
| https://github.com/BurntSushi/ripgrep/blob/master/README.md | ripgrep README, fetched via gh (primary exemplar) | fetched 2026-11-27 | "Why shouldn't I use ripgrep?" |
| https://burntsushi.net/ripgrep/ | ripgrep benchmark post (primary exemplar) | 2016-09-23 | versions, method, anti-pitch |
| https://github.com/sharkdp/bat/blob/master/doc/alternatives.md | bat alternatives table (primary exemplar) | last commit 2025-10-31 | table with script, no date |
| https://github.com/cli/cli/blob/trunk/docs/gh-vs-hub.md | gh vs hub (primary exemplar) | last commit 2020-09-17 | candid "should I use" section |
| https://github.com/astral-sh/uv/blob/main/BENCHMARKS.md | uv benchmarks (primary exemplar) | last commit 2026-10-08 | method with caveats |
| https://docs.astral.sh/uv/pip/compatibility/ | uv pip compatibility (primary exemplar) | 2026-10-14 | dated, versioned differences |
| https://pnpm.io/benchmarks | pnpm benchmarks (primary exemplar) | 2026-11-26 | dated, versioned, method linked |
| https://bun.sh/docs/runtime/nodejs-compat | Bun Node compatibility (primary exemplar) | undated | versions, no date |
| https://bun.com/docs/bundler/esbuild | Bun vs esbuild (primary exemplar) | undated | named gaps |
| https://docs.deno.com/runtime/fundamentals/node/ | Deno Node compatibility (primary exemplar) | 2026-07-30 | dated, limits stated |
| https://docs.astral.sh/ruff/faq/ | Ruff FAQ comparisons (primary exemplar) | undated | limits without date |
| https://posthog.com/handbook/marketing | PostHog handbook (vendor policy) | undated | fairness rule for competitor copy |
| `~/.cache/research-lang/exemplars/product/exemplar-readmes/readme/` | 40 upstream READMEs rebuilt this session | 2026-11-27 | the measurement above |
| `ocx-sh/website/site/src/components/landing-content.ts` (read-only, lines 1-18) | fleet drift table | 2026-11-08 and 2026-11-09 in comments | only dated fleet comparison |
