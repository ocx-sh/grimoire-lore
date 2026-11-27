---
title: Encoding a voice guide so an agent applies it, and who owns which word list
program: product
sub_program: marketing
topic: marketing-voice-ai-authorship
worker: voice-guide-encoding
date_researched: 2026-11-27
model: sonnet
sources_fetched: 21
scope: How published voice guides (Mailchimp, Atlassian, Monzo, Microsoft, GOV.UK, Google, GitLab, Slack) are structured, how Vale formats encode word rules, what the docs-quality tier-0 script measures on marketing surfaces versus docs pages in the fleet, and the encoding, scoping and ownership decision. Out of scope - AI-disclosure law (voice-ai-disclosure), AI-tell baselines (voice-ai-tells-baseline), the hero copy itself (first-screen-copy), error-string UI patterns beyond one cross-territory line (ux).
---

# Encoding a voice guide so an agent applies it, and who owns which word list

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. Structure of the published guides](#1-structure-of-the-published-guides)
  - [2. Vale as an encoding target](#2-vale-as-an-encoding-target)
  - [3. Measurement: tier-0 script over marketing surfaces and docs pages](#3-measurement-tier-0-script-over-marketing-surfaces-and-docs-pages)
  - [4. Docs register versus marketing register](#4-docs-register-versus-marketing-register)
  - [5. The decision](#5-the-decision)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Dated facts](#dated-facts)
- [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Principles alone are uncheckable. The Mailchimp voice page has four principles, zero word lists and zero example copy; its word list is a separate page ([Mailchimp voice](https://styleguide.mailchimp.com/voice-and-tone/), (c) 2023).
- The checkable parts of real guides are three artefacts: a surface-to-personality matrix (Monzo), a word table with a replacement and an exception per row (GOV.UK, Google, Mailchimp, GitLab), and a tone-by-user-state table (Atlassian).
- A blanket ban loses to a table with exceptions. GOV.UK's "words to avoid" has 31 entries plus 6 metaphor entries; 13 of the 31 carry a literal-sense exception ("robust (unless talking about a sturdy object)").
- Exceptions are mostly semantic ("unless military"). A script cannot decide them. Encode each as a machine-checkable allow pattern where one exists and otherwise as a waiver comment that must carry a reason.
- Vale existence and substitution rules both accept `exceptions` as a plain string array and a `level`; neither is a place to hold the reason, the owner or the source. Keep one source table and generate the Vale file from it, so Vale stays optional.
- Measured: DOC-PLAIN-12 fires 0 times on 6 fleet marketing surfaces and 2 times on 160 docs pages, and both docs hits are false (a literal "robust consumer" and "SYSTEM-locked"). The current list is inert where marketing copy lives.
- Measured: pointed at `.astro` and `.ts` pitch sources, `prose.py` returns 40 findings, 23 of them TypeScript semicolons and 7 of them string literals fused into 30 to 172 word "sentences". Copy needs an extractor before any word table can run on pitch pages.
- Measured: 90 of the 200 README findings sit in one file (`grimoire-rs/vscode/README.md`). Marketing-surface findings are almost all mechanics (punctuation, length, time-relative words), not vocabulary.
- docs-style's "No sales pitch or marketing open" is a docs-register rule. It stays, scoped to pages whose `doc_surface` is not `pitch`, using the key page-surface-scope chose.
- The lexical ban is the same in both registers (empty adjectives, bureaucratic verbs). What differs is personality level and structure, which the surface matrix carries, not the word table.
- Words such as fast, simple, easy, secure are not banned on pitch surfaces. They need evidence in the same block (a number, a unit or a link), which a script can check.
- AI-tell vocabulary must not be a per-hit ban. The excess-word set shifts by year ("delves" peaked in 2024 abstracts; Wikipedia's page lists a different set for mid-2026). Keep tells as a density signal with an observed date.
- docs-quality keeps DOC-PLAIN-12 as an ID but its word source moves to the table, filtered to the docs register. The marketing reference skill owns the table. A human owns each row.
- Tell the model what to write, not what to avoid. Anthropic's prompting guide says "Tell Claude what to do instead of what not to do", so every ban row needs a replacement column that the skill renders as a positive instruction ([Anthropic prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).
- Error and failure strings take no exclamation mark and no humour. Atlassian: be "less bold and more prescriptive" in errors; Monzo: no humour in customer service and serious moments, apologise once.

## Findings

### 1. Structure of the published guides

All pages fetched 2026-11-27. "Date" is what the page states.

| Guide | Principles | Word list | Example copy | Exceptions | Tone by situation | Date |
|---|---|---|---|---|---|---|
| [Mailchimp voice and tone](https://styleguide.mailchimp.com/voice-and-tone/) | 4: plainspoken, genuine, translators, dry humor | none on page; separate [word list](https://styleguide.mailchimp.com/word-list/) | none | Freddie mascot "Don't write in his voice"; "If you're unsure, keep a straight face" | general: clarity before entertainment; "forced humor can be worse than none at all" | (c) 2023 |
| [Atlassian voice and tone](https://atlassian.design/foundations/content/voice-tone) | 3 traits (Bold, Optimistic, Practical, "with a wink") and 6 principles | none | none, personas instead | "When to be more / less" per trait | explicit by user state: errors "less bold and more prescriptive"; success: wink allowed; "Delight means little flourishes, not humor or being cheeky" | (c) 2026 |
| [Monzo writing principles](https://monzo.com/tone-of-voice/) | 3: straightforward kindness, everyday magic, warm wit | no formal list; named swaps (blacklist to blocklist, "tame your bills") | yes, worked examples | "Serious isn't the same as formal" | matrix of 6 channels by 3 principles; apologise once, "We're sorry" not "We'd like to apologise" | undated |
| [Microsoft voice](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human) | 3: warm and relaxed, crisp and clear, ready to lend a hand | in other pages | none | "Occasionally, we're fun" | "we adapt our tone" to the customer's state of mind | ms.date 2018-01-19, updated_at 2026-10-15 |
| [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) | "Plain English is mandatory for all of GOV.UK" | 31 verbs plus 6 metaphors | embedded replacements | 13 of 31 verbs carry a literal-sense exception | n/a | undated |
| [Google developer style word list](https://developers.google.com/style/word-list) | n/a | alphabetical, tagged "Don't use / Avoid / Use with caution / OK to use" | Recommended and Not recommended pairs | "Sometimes, *just* is useful for conveying that one approach is simpler" | n/a | undated |
| [GitLab word list](https://docs.gitlab.com/development/documentation/styleguide/word_list/) | n/a | alphabetical, "Use:" and "Instead of:" lists | yes | "However, you can make an exception for right-click and click-through demo" | n/a | "As of January 2026" appears in text |
| [Slack content design and AI](https://slack.design/articles/slack-content-design-in-the-age-of-ai/) | etiquette principles incl. "Disclose AI use and give credit" | none | none | none | review AI copy to the same bar as human copy | (c) 2026 |

What this means for encoding:

1. Entry shape that works: term, instruction, replacement, reason, exception. GOV.UK writes the exception inline in the term ("leverage (unless in the financial sense)") and the replacement after it. Mailchimp's word list sorts entries into three bands ("Standardized spellings", "Words to use carefully", "Words to avoid"), which is a severity column in prose form.
2. GOV.UK gives the reason once at list level, not per row: the metaphor entry says metaphors "do not say what you actually mean and lead to slower comprehension". A row-level reason is therefore a local addition, and worth it, because an agent otherwise cannot decide an edge case.
3. Monzo's matrix is the only fully checkable personality artefact. Operational comms: kindness "maxed out", wit "none". Organic social: wit "maxed out". An agent can read its target surface and look up a level.
4. Atlassian's page states its scope: it covers UI and app content, "not marketing". A product voice guide for a product UI does not automatically bind marketing copy, and the reverse holds for Monzo's wit.
5. Mailchimp and Atlassian have no example copy on the page. An agent given only those pages has principles it cannot test. A usable encoding adds one pass and one fail sentence per principle.

Error tone, as encoded by the sources: Atlassian "Be less bold and more prescriptive" in errors and warnings and point to next steps; Monzo "say sorry once, sincerely", do not apologise for what is not Monzo's fault, "Avoid [humour] in customer service and in sensitive or serious moments". Both are checkable only in part: an exclamation mark, a joke marker or a second apology can be grepped; "sincere" cannot.

### 2. Vale as an encoding target

Context7 was not available in this session. The Vale pages were fetched directly from `docs.vale.sh` on 2026-11-27, and the fetches state no version or date. Where a page was silent, this artefact says so rather than filling from memory.

Existence ([docs](https://docs.vale.sh/checks/existence)):

```yaml
extends: existence
message: Consider removing '%s'
level: warning
ignorecase: true
tokens:
  - appears to be
  - arguably
```

Keys listed: `message` (`%s` is the matched text), `level`, `ignorecase`, `tokens` (compiled into one word-bounded group), `raw`, `nonword`, `exceptions` (string array). `scope` is not documented on that page.

Substitution ([docs](https://docs.vale.sh/checks/substitution)):

```yaml
extends: substitution
message: Consider using '%s' instead of '%s'
level: warning
ignorecase: false
swap:
  abundance: plenty
  accelerate: speed up
```

Keys listed: `swap`, `ignorecase`, `matchcase`, `nonword`, `exceptions`, `vocab`, `capitalize`, `affix`. Pipe-separated alternatives are allowed (`masterful: skilled|authoritative|commanding`). The page gives no example of `exceptions` and does not state how they match. `scope` is not on that page.

Scopes ([docs](https://docs.vale.sh/topics/scopes.md)): a rule's scope is a selector over dot-separated parts, matched when all of its parts appear in the block's scope. Values include `heading`, `heading.h1`, `list`, `sentence`, `paragraph`, `raw`, `meta`; selectors combine with arrays (OR), `~` (negation) and `&` (AND); `doc(...)` takes a CSS selector. Scope selects a Markdown element, not a page type.

Per-file scoping ([BasedOnStyles](https://docs.vale.sh/keys/basedonstyles)): `BasedOnStyles` sits under a glob section; "When several sections match a file, the last one's `BasedOnStyles` replaces the earlier ones." Individual rule settings accumulate. A rule is disabled with `Style.Rule = NO`, and `Style.Rule = warning` overrides the level. Style-wide level needs Vale v3.17.0 or later; the page links `MinAlertLevel` for the exit-code effect.

Vocabularies ([docs](https://docs.vale.sh/keys/vocabularies)): a folder `<StylesPath>/config/vocabularies/<name>/` holds `accept.txt` and `reject.txt`, one regex per line, case-sensitive by default. `accept.txt` entries are added to every style's exception list; `reject.txt` entries are flagged as errors by `Vale.Avoid`. This is the closest Vale has to "preferred terms", and it carries no replacement text.

Packages ([docs](https://docs.vale.sh/keys/packages)): `Packages = Microsoft, write-good`, installed with `vale sync`; a package can be pinned to a release URL or a SHA-256 digest (v3.29.0 or later).

Conclusions for encoding:

- Vale has no place for a reason, a source URL, an owner or a verified-on date. The word table must be the source of truth; the Vale files are generated, optional output. `skills/docs-quality-reference/checks/vale.ini` already states "Vale is never a rule's only verification" and warns that two different packages ship as "vale-ai-tells", so the generated file is the safer path than a third-party package for brand words.
- The page type is invisible to Vale. Scoping by page surface needs a Vale glob section per surface (a path), which DOC-TYPE-02 rejects ("read a page's type from its declaration comment, never from its directory or file name", per [page-surface-scope](../marketing-first-screen-copy/page-surface-scope.md)). Surface scoping therefore belongs to the tier-0 script, which can read the declaration comment.
- Substitution `swap` is the natural target for rows with one replacement; existence `tokens` for rows with none. Rows whose exception cannot be a string (military sense, financial sense) emit only `existence` at `level: suggestion`, never `error`.

### 3. Measurement: tier-0 script over marketing surfaces and docs pages

All commands run from `/home/mherwig/dev` on 2026-11-27, with `P=<worktree>/skills/docs-quality-reference/checks/prose.py` and `python3 -I`. The script self-test passes (`python3 -I $P --self-test` printed "self-test passed"). Words are `wc -w` over the raw files, so markup counts as words.

Marketing surfaces:

- README set (10): `ocx-sh/ocx`, `ocx-sh/website`, `grimoire-rs/grimoire`, `grimoire-rs/grim-mirror`, `grimoire-rs/vscode`, `grimoire-rs/grim-gui`, `ocx-sh/ocx-mirror`, `ocx-sh/indexbot`, `ocx-sh/rules_ocx`, `ocx-sh/devcontainer-features`, each `README.md`. Missing files were skipped (all 10 existed).
- Pitch sources (4): `ocx-sh/website/site/src/components/Landing.astro`, `.../landing-content.ts`, `grimoire-rs/grimoire/docs/src/pages/index.astro`, `grimoire-rs/grimoire/docs/src/data/landing.ts`.
- Pitch MDX (1): `ocx-sh/website/site/src/content/docs/index.mdx`.

Docs pages: `ocx-sh/ocx/website/src/content/docs` (116 pages) and `grimoire-rs/grimoire/docs/src/content/docs` (45 pages).

Command per set: `python3 -I $P --root . <paths> | grep -o 'DOC-PLAIN-[0-9]*' | sort | uniq -c`.

| Surface | Files | Words | Findings | Per 1,000 words | By rule |
|---|---|---|---|---|---|
| READMEs | 10 | 8,088 | 200 | 24.7 | 01: 123, 02: 53, 11: 21, 03: 2, 13: 1 |
| Pitch sources (.astro, .ts) | 4 | 2,913 | 40 | 13.7 | 01: 29, 02: 10, 11: 1 |
| Pitch MDX | 1 | 69 | 1 | 14.5 | 01: 1 |
| ocx docs | 116 | 227,306 | 670 | 2.9 | 01: 507, 02: 71, 03: 60, 11: 29, 05: 2, 12: 1 |
| grimoire docs | 45 | 233,384 | 2,378 | 10.2 | 01: 1,260, 02: 793, 11: 164, 03: 158, 13: 1, 12: 1, 05: 1 |

Classification of the findings on marketing surfaces:

- DOC-PLAIN-12 (the superlative list): 0 hits on all marketing surfaces. 2 hits on docs, both false: `grimoire-rs/grimoire/docs/src/content/docs/json-interface.md:1299` ("A robust consumer therefore branches on ...", the engineering sense) and `ocx-sh/ocx/website/src/content/docs/reference/configuration.md:264` ("SYSTEM-locked" matched `unlock\w*`). The list produced no true positive anywhere in the fleet.
- Adjective grep (the 25-word list from messaging-inventory.md pattern 8, trimmed to `fast|faster|fastest|simple|simply|simplest|blazing|blazingly|powerful|seamless|seamlessly|effortless|effortlessly|robust|lightweight|modern|easy|easily|best|reliable|secure|scalable|instantly|instant`, `grep -ioE "\b(...)\b"`): pitch sources 0, READMEs 6 (instantly 2, instant 2, simple 1, fast 1; 0.74 per 1,000 words), docs 107 over 460,690 words (0.23 per 1,000; best 34, simply 19, instant 16, fast 16). The docs hits were not read line by line, so "best" may be "best practice" and no claim is made about their quality.
- DOC-PLAIN-01 on pitch sources: 29 hits, of which 23 are semicolons that are TypeScript syntax (`landing.ts:6 label: string;`) and 6 are em dashes in real copy (`index.astro:38` "Package manager for AI-agent config — skills, rules, ..."; `index.astro:46` "Grimoire — a lockfile for your AI-agent config"). Only the 6 are true.
- DOC-PLAIN-02 on pitch sources: 10 hits of 30 to 172 words; the long ones (`index.astro:34` 172 words, `landing.ts:35` 162, `landing-content.ts:11` 107) are adjacent string literals read as one sentence. They are extraction artefacts, not copy.
- READMEs: 90 of 200 findings are in `grimoire-rs/vscode/README.md` (`python3 -I $P --root . grimoire-rs/vscode/README.md | wc -l` printed 90), mostly em dashes and semicolons, plus the time-relative words "newer", "older", "soon" (DOC-PLAIN-11, lines 34, 43, 92, 104, 192-219). That is a punctuation and staleness problem, not a voice problem.
- Result: the tier-0 script today detects mechanics on markdown and noise on source files. It has no marketing-voice rule that fires on marketing copy, and `prose.py` accepts `.astro` and `.ts` when passed explicitly but its directory walk takes only `.md`, `.mdx`, `.markdown` (`strip_prose.py:31`, `DOC_SUFFIXES`), so a directory scan skips pitch sources entirely.

The audit's own hypothesis ("grimoire headline surfaces use 0 of the 20-adjective list") is confirmed for the pitch sources (0) and slightly contradicted for READMEs (6 hits over 8,088 words, 0.74 per 1,000, about 3 times the docs rate).

### 4. Docs register versus marketing register

Read: `skills/docs-quality-reference/plain-english.md` (DOC-PLAIN-12 row), `prose.py` lines 91-97, `ocx-sh/ocx/.claude/rules/docs-style.md:22`, and [page-surface-scope](../marketing-first-screen-copy/page-surface-scope.md).

- DOC-PLAIN-12 (CONSIDER) lists 10 forms: `powerful`, `seamless`, `revolutionary`, `game-chang`, `supercharge`, `unlock`, `empower`, `cutting-edge`, `robust`, `effortless`. Its own text says "The list has no published ancestor". Of the 10, only `empower` and `robust` appear in GOV.UK's list ([A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/)); the other 8 have no fetched source in this artefact.
- docs-style (ocx, 194 lines) says: "No sales pitch or marketing open. 'One identifier. All platforms. No hash list.' — avoid. Examples make case." The twins in grimoire and grim-mirror say the same. The banned thing is a structure (stacked fragments as an opener), not a vocabulary, and it is stated for docs narrative pages.
- Pitch surfaces are identified by `doc_surface: pitch`, the key page-surface-scope chose. That key does not exist in the scripts yet (`strip_prose.py:61` regex covers `doc_(type|tier)` only).

Where the two registers genuinely differ, by what a script or heuristic can see:

| Property | Docs register | Pitch register | Checkable by |
|---|---|---|---|
| Empty adjectives and bureaucratic verbs | banned | banned (same table) | tier-0 word table |
| Claim words (fast, simple, easy, secure, reliable) | banned unless a number is in the same sentence | allowed only with a number, unit or link in the same block | tier-0 table, `needs-evidence` action |
| Stacked fragment opener | banned (docs-style) | allowed once, in the h1 or tagline, followed by a plain sentence naming the category (first-screen-copy decides the exact shape) | reading heuristic with pass and fail pair |
| Personality (wit, wordplay) | none | per surface matrix | matrix lookup, reading heuristic |
| Second person and contractions | either | either | none, skip |
| Time-relative words | banned | banned | `prose.py` DOC-PLAIN-11 |

### 5. The decision

See [Normative guidance candidates](#normative-guidance-candidates). Compact form:

1. Encoding. One voice file per project plus one word table in the marketing reference skill. The voice file holds principles with a pass and a fail sentence each, a surface matrix keyed by `doc_surface` (and by named surfaces: error string, email, release note), and a tone-by-state table. The word table is a TSV read by a tier-0 script (`checks/voice_words.py`, to be written; no such script exists today). Vale files are generated from it and optional.
2. Coexistence with docs-style. Reword the "No sales pitch or marketing open" line to "On pages that do not declare `doc_surface: pitch`". On `pitch` pages the same lexical table applies and the structural rule is replaced by the surface-matrix and first-screen rules.
3. Which list docs-quality keeps. docs-quality keeps ID DOC-PLAIN-12 (published artefacts cite it, per the reviser contract) and keeps its register-`docs` slice of the table. The marketing reference skill owns the table file and every `pitch` and `all` row. The 10-word superlative list moves into the table as register `all` rows, with the two measured false-positive patterns added as exceptions, and with a source column (GOV.UK for `empower` and `robust`, "asserted" for the rest, as today).

Proposed table columns, one row per term:

| Column | Content | Example |
|---|---|---|
| `id` | stable, never reused | `VW-014` |
| `pattern` | word-bounded, case-insensitive regex | `\bleverag(e\|es\|ed\|ing)\b` |
| `action` | `avoid`, `swap`, `needs-evidence`, `term` (exact-case preferred term) | `swap` |
| `replacement` | positive instruction the skill prints | `use "use" or name the action` |
| `register` | `all`, `docs`, `pitch` | `all` |
| `allow` | machine exception regex, may be empty | `\bfinancial\b` within 8 words |
| `exception_note` | human sense not machine-checkable | `financial sense` |
| `severity` | MUST, SHOULD, CONSIDER | `SHOULD` |
| `source` | URL, or `asserted` | GOV.UK URL |
| `verified` | date the source was last read | `2026-11-27` |
| `owner` | named human or role | `docs lead` |

Waiver for a semantic exception the script cannot see: `<!-- voice-ok: VW-014 financial sense -->` on the line above or `// voice-ok: VW-014 reason` in a source file. The script counts waivers and fails a waiver with no reason.

## Normative guidance candidates

Severity is for an agent following the rule without a human in the loop.

1. **VG-01 (MUST).** Keep one word table with the columns above in the marketing reference skill; every row has `source` and `verified`, or the literal `asserted`. Rationale: Vale files and GOV.UK-style pages cannot hold reason, owner or date, and an unsourced list ages silently (DOC-PLAIN-12 today). VERIFY: `python3 checks/voice_words.py --check-table words.tsv` exits 2 on a missing column, a duplicate `id`, a non-compiling `pattern`, or a row with neither a source URL nor `asserted`.
2. **VG-02 (MUST).** Every ban row carries a `replacement`, and the skill renders it as a positive instruction ("write X") before any prohibition. Rationale: the Anthropic prompting guide says "Tell Claude what to do instead of what not to do". VERIFY: `--check-table` fails an `avoid` or `swap` row with an empty `replacement`.
3. **VG-03 (MUST).** Encode an exception as an `allow` pattern when the sense is lexically detectable, else as `exception_note` plus a `voice-ok` waiver that carries the row id and a reason. Rationale: 13 of 31 GOV.UK verbs carry a literal-sense exception, and the fleet's two DOC-PLAIN-12 hits were both exception cases. VERIFY: `grep -rn 'voice-ok' <copy paths>` returns only lines matching `voice-ok: VW-[0-9]+ \S+`; the script reports waiver count.
4. **VG-04 (MUST).** No voice rule rests on Vale alone. Generate Vale `existence` and `substitution` files from the table with `--emit-vale`, never hand-edit them, and emit `level: suggestion` for rows that have an `exception_note`. Rationale: docs-quality DOC-PLAIN-19 and `vale.ini` already forbid a Vale-only rule, and Vale cannot hold the page surface. VERIFY: `python3 checks/voice_words.py --emit-vale | diff - styles/Brand/generated.yml` is empty in CI.
5. **VG-05 (MUST).** Scope the table to a page by its declared `doc_surface` and `doc_type`, never by path. A page with neither declaration is skipped and the skip is counted in the output. Rationale: DOC-TYPE-02; 12 pages carry `doc_type: landing` and only 1 is a pitch (page-surface-scope). VERIFY: run the script over a fixture page with no declaration; expect "skipped 1" and exit 0.
6. **VG-06 (MUST).** Extract copy before checking source files. For `.astro`, `.ts`, `.tsx` read only string literals and JSX text, join each literal separately, and do not feed code to the sentence splitter. Rationale: measured 23 of 29 DOC-PLAIN-01 hits on pitch sources are TypeScript semicolons and the 107 to 172-word "sentences" are fused literals. VERIFY: `python3 -I checks/voice_words.py grimoire-rs/grimoire/docs/src/data/landing.ts` reports 0 semicolon findings and 0 sentence over 100 words.
7. **VG-07 (SHOULD).** Treat claim words (fast, faster, simple, easy, secure, reliable, lightweight, scalable, instant) as `needs-evidence` rows: allowed on a pitch surface when the same sentence or the next block holds a digit with a unit, or a link, else a finding. Rationale: GOV.UK names unsupported claims as vague; DOC-TYPE-15 already requires a link for an adoption claim. VERIFY: `grep -inE '\b(fast|faster|simple|easy|secure|reliable|lightweight|scalable|instant(ly)?)\b' <pitch file>`; each hit must have a digit or a URL within the same sentence or the next line. Pass: "Starts in 40 ms (measured)". Fail: "Blazing fast startup".
8. **VG-08 (MUST).** Do not ban AI-tell vocabulary per hit. Keep tells as a density measure (DOC-PLAIN-10) and record the date each tell list was observed. Rationale: the excess-word set moves with the models (see Dated facts), so a per-hit ban expires and makes a model swap words. VERIFY: no row in the table has `source` pointing at Wikipedia's "Signs of AI writing" or Kobak et al.; `grep -c 'wikipedia' words.tsv` prints 0.
9. **VG-09 (SHOULD).** Review any `verified` date older than 12 months. Rationale: guides drift: the Wikipedia tell page lists different words by year, and GitLab's list prints "As of January 2026". VERIFY: `--check-table` warns when `verified` is more than 365 days before today.
10. **VG-10 (MUST).** Write error, failure and warning strings with no exclamation mark, no joke and at most one apology, naming the next step. Rationale: Atlassian errors are "less bold and more prescriptive"; Monzo apologises once and avoids humour in serious moments. VERIFY: `grep -nE '!' <error string files>` returns nothing outside code; `grep -ciE "sorry|apologi[sz]e" <one message>` is at most 1. (Cross-territory: where error strings live in UI code belongs to ux.)
11. **VG-11 (SHOULD).** The voice file holds, per principle, one pass sentence and one fail sentence, and a surface matrix with a level per surface (none, low, medium, high), keyed by `doc_surface` plus named surfaces. Rationale: Mailchimp and Atlassian publish principles with no sample copy and cannot be tested; Monzo's matrix can. VERIFY: reading heuristic. For each principle, a reviewer takes the agent's draft and asks "could the fail sentence have come from this draft?". Pass for "Plainspoken": "Pin a tool to one digest." Fail: "Unlock seamless reproducibility."
12. **VG-12 (MUST).** The agent proposes table rows and voice-file changes as a diff for the owner and never merges its own additions. Rationale: a word ban is a brand decision (see below). VERIFY: `git log --format=%an -- words.tsv` shows the owner as author or approver on every change; CI blocks a change to `words.tsv` without a CODEOWNERS review.
13. **VG-13 (SHOULD).** Reword docs-style's "No sales pitch or marketing open" to apply to pages that do not declare `doc_surface: pitch`, and cite the table for the lexical part. Rationale: the rule as written would forbid the only pitch copy a landing page exists to carry. VERIFY: `grep -n 'marketing open' <fleet>/.claude/rules/docs-style.md` shows the scoping clause.
14. **VG-14 (SHOULD).** Keep DOC-PLAIN-12's ID and make it read the table's `docs` and `all` rows. Rationale: published artefacts cite the ID and its current list has 0 true positives on 460,690 docs words plus 6 marketing surfaces. VERIFY: `grep -n 'DOC-PLAIN-12' rules/docs-quality.md skills/docs-quality-reference/plain-english.md` names the table, and the script's `MARKETING_RE` constant is gone.
15. **VG-15 (SHOULD).** Record preferred terms (product name casing, the one category noun) as `term` rows with exact-case patterns and check them with a case-sensitive grep. Rationale: the category noun drifts across title, README and meta description in the fleet (page-surface-scope section 4), and Vale vocabularies are case-sensitive by default and cannot carry a replacement. VERIFY: `grep -rn 'Ocx\b\|OCX' <copy>` against the `term` row for the product name; every hit equals the chosen casing.

## Dated facts

| Fact | Source | Date the source states | Kind |
|---|---|---|---|
| Mailchimp voice principles: plainspoken, genuine, translators, dry humor; "forced humor can be worse than none at all"; no word list or sample copy on the page | [Mailchimp voice](https://styleguide.mailchimp.com/voice-and-tone/) | (c) 2023 | the company itself |
| Mailchimp word list has three bands: "Standardized spellings", "Words to use carefully", "Words to avoid"; entries such as "ninja, rockstar, wizard, unicorn (unless referring to a literal ninja, rockstar, wizard, or unicorn)" | [Mailchimp word list](https://styleguide.mailchimp.com/word-list/) | undated | the company itself |
| Atlassian: errors "less bold and more prescriptive"; "Delight means little flourishes, not humor or being cheeky"; page covers UI content, not marketing | [Atlassian](https://atlassian.design/foundations/content/voice-tone) | (c) 2026 | the company itself |
| Monzo channel matrix, 6 channels; operational comms wit "None"; organic social wit "Maxed out"; "It's never 'We'd like to apologise', it's 'We're sorry'"; cites a plain-English judge study, 66% to 34% | [Monzo](https://monzo.com/tone-of-voice/) | undated (a vendor-quoted study, not independently checked here) | the company itself |
| Microsoft voice: 3 principles; "we adapt our tone" | [Microsoft](https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human) | ms.date 2018-01-19, updated_at 2026-10-15 | the company itself |
| GOV.UK: "Plain English is mandatory for all of GOV.UK so avoid using these words"; 31 words, 6 metaphors, 13 verbs with an exception; `robust` "unless talking about a sturdy object"; `leverage` "unless in the financial sense"; `in order to` "usually not needed - do not use it" | [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) | undated; built by Government Digital Service | the authority itself |
| Google word list: tags "Don't use / Avoid / Use with caution / OK to use"; `in order to` "Use ... when needed to clarify meaning" | [Google](https://developers.google.com/style/word-list) | undated | the company itself |
| GitLab word list entries name Vale rule files (`SubstitutionWarning.yml`, `InclusiveLanguage.yml`, `LatinTerms.yml`, `FutureTense.yml`); exceptions inline | [GitLab](https://docs.gitlab.com/development/documentation/styleguide/word_list/) | "As of January 2026" appears in text | the company itself |
| Vale existence: keys `message`, `level`, `ignorecase`, `tokens`, `raw`, `nonword`, `exceptions`; substitution: `swap`, `matchcase`, `exceptions`, `vocab`, `capitalize`, `affix` (v3.25.0 or later) | [existence](https://docs.vale.sh/checks/existence), [substitution](https://docs.vale.sh/checks/substitution) | undated | the tool's own docs |
| Vale `BasedOnStyles`: later matching glob replaces earlier; style-wide level needs v3.17.0 or later; package digest pin v3.29.0 or later | [BasedOnStyles](https://docs.vale.sh/keys/basedonstyles), [packages](https://docs.vale.sh/keys/packages) | undated | the tool's own docs |
| Vale vocabularies are `accept.txt` and `reject.txt` under `config/vocabularies/<name>/`, regex per line, case-sensitive by default | [vocabularies](https://docs.vale.sh/keys/vocabularies) | undated | the tool's own docs |
| Excess style words rose after LLMs: "delves" r=28.0, "showcasing" r=10.2, "underscores" r=10.9 (2024 versus projection); at least 13.5% of 2024 PubMed abstracts LLM-processed, about 40% in some subcorpora; earlier preprint said 10% and 30% | [arXiv 2406.07016](https://arxiv.org/abs/2406.07016) (Kobak et al.; v1 2024-06-11, v5 2025-07-03; published in Science Advances 2025-07-02, per the arXiv page); ratios from a search summary of the preprint, not re-read in the paper | 2024 to 2025 | independent study |
| The authors publish all 900 excess words for 2013 to 2024 and a July 2025 update | [berenslab/llm-excess-vocab](https://github.com/berenslab/llm-excess-vocab) | July 2025 update | independent study |
| Wikipedia's tell page lists a different word set by era ("delve" 2023 to early 2024; "challenge", "leverage", "multifaceted" listed for mid-2026) and states "Not all text featuring these indicators is AI-generated"; text mentions "As of October 2026" | [Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | no edit date shown; read only the first 100,000 of 250,368 characters | community editors, not an authority |
| Slack: "Disclose AI use and give credit"; AI copy reviewed to the same bar; built an agent skill from its style guide | [Slack](https://slack.design/articles/slack-content-design-in-the-age-of-ai/) | (c) 2026 | the company itself |
| Anthropic: "Tell Claude what to do instead of what not to do"; "Match your prompt style to the output you want" | [prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | undated; lists models through Sonnet 5.5 | the vendor itself |

## What an agent must not decide alone

- Which words are banned for a project's brand, and the voice principles themselves. Ask the owner; propose a diff (VG-12).
- Whether a literal-sense exception applies when the allow pattern cannot tell. Waive only with a stated reason, and list waivers for the owner.
- The personality level of a surface (how much wit on organic social versus the pitch page). A matrix is a brand decision.
- Whether to apologise, and in what words, in a customer-facing incident message. Legal and brand own that; the agent drafts.
- Whether a project uses a competitor or trademarked name in copy (not researched here; belongs to claims-evidence).
- Whether a pitch page's tagline may use the stacked-fragment form docs-style bans. Owner decision, given first-screen-copy's findings.
- Adopting a third-party Vale package for brand words. The package's rule count and error share are a gate decision (`vale.ini` comments), not the agent's.

## AI-agent angle

| What an LLM gets wrong | Smallest mechanical check |
|---|---|
| Treats a banned-word list as a blocklist and swaps in a synonym with the same emptiness ("leverage" becomes "harness"). Untested here; stated as a hypothesis from the Wikipedia and Kobak observation that tell words rotate by era | the table's `replacement` column forces a concrete verb; check `needs-evidence` words for a number, not just for the listed word |
| Reads "no marketing open" and strips all persuasion from a pitch page, or ignores it on a docs page, because it cannot tell the page type | the `doc_surface` declaration (VG-05); the script reports skipped pages |
| Writes the principle ("plainspoken") back as an adjective in the copy ("our plainspoken tool") | grep for the principle names in copy; pass and fail pairs in the voice file |
| Applies a docs voice file to an error string or a post, because Atlassian-style files say they cover UI "not marketing" and it ignores the scope sentence | surface matrix lookup before drafting; VG-10 grep on error strings |
| Runs a prose checker over `.astro` or `.ts` and "fixes" TypeScript semicolons | VG-06 extractor; fail if a code file is passed without extraction |
| Adds an exception for itself with a vague reason ("fine here") | waiver regex requires row id and a reason; the script prints the waiver count for the owner |
| Writes a negated instruction into a generated skill ("do not use leverage") and the model then primes the word | render the `replacement` first; Anthropic's guide advises the positive form |
| Takes the Wikipedia tell list as a style guide for brand voice | VG-08; tells are density-only |

## Contested / evolving

- **Whether a word list belongs in a voice guide at all.** Mailchimp's voice page has none while its word list page does; Atlassian has no list at all and Monzo only examples. GOV.UK and Google make the list the core of the guide. Position here: a list is the only part an agent can check, so keep it, with exceptions. The counter-view, that lists fix words and not voice, is in the guides' own structure and was not tested in this research.
- **Same lexicon across registers or separate lexicons.** Atlassian scopes itself to UI and not marketing; Monzo gives marketing more wit than operations; GOV.UK and Microsoft apply plain language to everything they publish. This artefact sides with one lexicon and a surface matrix, because the measured pitch sources use 0 empty adjectives already. If a project's pitch copy reads dull under this rule, the matrix level is the lever, not the table.
- **Per-hit ban versus density for AI tells.** The Wikipedia page says signs are "only potential signs of a problem, not the problem itself" and warns against relying on detectors or on one's own judgement alone; the Kobak work supports using excess words as a population-level estimate, not a per-document test. docs-quality's DOC-PLAIN-10 already measures density. Trend as of 2026-11-27: the tell set keeps moving, so any fixed list is short-lived.
- **Em dash as a tell.** The Wikipedia page lists overuse of em dashes as a historical indicator "through September 2026" (as fetched), while docs-quality bans em dashes outright (DOC-PLAIN-01). The fleet's 6 pitch em dashes come from copy a human wrote. Treat it as a punctuation rule, not as proof of authorship.
- **Vale as the encoding.** Vale's per-glob `BasedOnStyles` is path-based; docs-quality rejects path-based typing (DOC-TYPE-02). A team that accepts paths can do surface scoping in Vale alone; this artefact does not, because tier 1 stays optional.

## Sources

Fetched 2026-11-27 unless noted. "Primary" means the publisher of the guide or tool itself, or the study authors.

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://styleguide.mailchimp.com/voice-and-tone/ (primary) | Mailchimp voice and tone | (c) 2023 | principles without lists or samples |
| https://styleguide.mailchimp.com/word-list/ (primary) | Mailchimp word list | undated | three-band entry shape with exceptions |
| https://atlassian.design/foundations/content/voice-tone (primary) | Atlassian traits and principles | (c) 2026 | tone by user state, scope statement |
| https://monzo.com/tone-of-voice/ (primary) | Monzo writing principles | undated | channel matrix, apology rule |
| https://learn.microsoft.com/en-us/style-guide/brand-voice-above-all-simple-human (primary) | Microsoft voice | updated 2026-10-15 | three principles with style tips |
| https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/ (primary) | GOV.UK A to Z, words to avoid | undated | entry shape with replacements and exceptions |
| https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/ (primary) | GOV.UK writing standards index | undated | fetched to find ownership; states only "Built by the Government Digital Service", no change process |
| https://developers.google.com/style/word-list (primary) | Google developer style word list | undated | tagged entries, "OK to use" exceptions; read the first 100,000 of 177,884 characters |
| https://docs.gitlab.com/development/documentation/styleguide/word_list/ (primary) | GitLab word list tied to named Vale rules | "As of January 2026" in text | word list plus Vale rule linkage; read the first 100,000 of 127,773 characters |
| https://slack.design/articles/slack-content-design-in-the-age-of-ai/ (primary) | Slack on AI and content design | (c) 2026 | AI copy review and disclosure etiquette; vendor view |
| https://docs.vale.sh/checks/existence (primary) | Vale existence rule | undated | key list, example |
| https://docs.vale.sh/checks/substitution (primary) | Vale substitution rule | undated | key list, example |
| https://docs.vale.sh/topics/scopes.md (primary) | Vale scopes | undated | selector semantics |
| https://docs.vale.sh/keys/basedonstyles (primary) | Vale BasedOnStyles | undated | per-glob behaviour, level override |
| https://docs.vale.sh/keys/vocabularies (primary) | Vale vocabularies | undated | accept and reject files |
| https://docs.vale.sh/keys/packages (primary) | Vale packages | undated | sync, pinning |
| https://docs.vale.sh/keys | Vale key index | undated | fetched; listed keys only, no scope or level values |
| https://arxiv.org/abs/2406.07016 (primary) | Kobak et al., excess vocabulary | v1 2024-06-11, v5 2025-07-03 | independent evidence that tell words shift |
| https://github.com/berenslab/llm-excess-vocab (primary) | Authors' word lists and code | July 2025 update | the lists themselves; the page says nothing on change over time |
| https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing | Community essay on AI tells | text mentions October 2026 | era-dated tell sets and its own caveats |
| https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (primary) | Anthropic prompting guide | undated, current models | positive instruction guidance |

Not fetched or failed: `https://www.gov.uk/guidance/style-guide/a-to-z-of-gov-uk-style` (redirect, replaced by the guidance.publishing.service.gov.uk URL above); `https://docs.vale.sh/topics/scoping` (404, replaced by `/topics/scopes.md`); Context7 for Vale was not available in this session, so Vale was read from its own documentation site. The Science Advances article page was not fetched; Kobak figures other than those on the arXiv page come from a search summary and the authors' GitHub page, and are labelled so above. The `voice_words.py` script does not exist yet; the VG rules describe what it must do.

Cross-territory, left to others: how error strings are placed in UI code (ux, interface-states); disclosure law and platform labels (voice-ai-disclosure); AI-tell baseline numbers (voice-ai-tells-baseline).
