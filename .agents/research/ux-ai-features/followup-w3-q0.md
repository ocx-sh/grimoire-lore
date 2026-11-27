---
title: "UX-AI wave 3 q0: NY art. 48 chaptered text check, and a held-out run of UX-AI-05 and UX-AI-15"
program: product
topic: ux-ai-features
worker: followup-w3-q0
wave: 3
date_researched: 2026-11-27
model: sonnet
sources_fetched: 25
---

# UX-AI wave 3 q0

## Summary

1. The signed text of New York Chapter 368 of 2026 could not be fetched as a slip law. The Senate bill page links no chapter-law text. The nearest primary text is the Senate's consolidated General Business Law (GBS) article 48, read on 2026-11-27. It agrees with the as-passed S9051-B on every section read, at summary level (the fetch tool refuses verbatim section text, see 1.1), and it adds one fact the consolidation does not use: section 1804.
2. The Assembly print that was substituted for the Senate bill (A10379-C) has the same operative text as S9051-B. A word-level diff of the two PDFs (command and output in 1.4) differs only in the bill number, the page footers and one drafting-office code, in 4 hunks of 3 or 2 words each.
3. UX-AI-24 needs one change. Its age-determination clause cites only 1801(1)(b), and 1804 sets an interim standard that binds until regulations exist. That standard has three checkable limits (self-declaration, number of methods, deletion).
4. Three more statute facts are missing from UX-AI-24's rationale: the penalty also covers disgorgement and destruction of "any algorithm trained in such data", contract waivers are void, and affiliates can be jointly liable.
5. UX-AI-05 and UX-AI-15 were run on seven open-source AI products that appear nowhere in the wave-1 or wave-2 artifacts. UX-AI-05 has a vacuous-pass hole: with no owner record the rule never triggers, so no product fails it. UX-AI-15 step 1 has 3 false-fail causes and 4 false passes.
6. The false passes share one class the consolidation does not list: a retrieval relevance or similarity score shown to the end user next to a citation, in four of seven products, one of them colour-coded green to red. This is a new rule at CONSIDER (UX-AI-25), because only prevalence was measured, not harm.

## Part 1. Does the chaptered text of NY art. 48 match the as-passed text?

### 1.1 What was tried

All reads on 2026-11-27. Scratch directory: `~/.cache/research-lang/exemplars/product/wave2/ux-ai-w3q0/`.

| Page | Client | Result |
|---|---|---|
| `https://legislation.nysenate.gov/pdf/bills/2025/S9051B` | curl | HTTP 200, `application/pdf`, 15518 bytes. Text extracted with `uv run --with pypdf`. |
| `https://legislation.nysenate.gov/pdf/bills/2025/A10379C` (Assembly print, substituted) | curl | HTTP 200, 15484 bytes. |
| `https://legislation.nysenate.gov/pdf/bills/2025/A10379A` and `A10379B` | curl | HTTP 200 (not compared; superseded prints). |
| `https://legislation.nysenate.gov/pdf/bills/2025/A10090B` (guess) | curl | HTTP 404. |
| `https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B` | curl | HTTP 403, 5601 bytes of HTML. |
| `https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B` | WebFetch | Read. Actions table below. No link to a chapter-law text. |
| `https://www.nysenate.gov/legislation/laws/GBS/A48`, `/1801`, `/1802` | curl | HTTP 403. |
| `https://www.nysenate.gov/legislation/laws/GBS/A48`, `/1800` to `/1805` | WebFetch | Read. The tool returns summaries and quotes of at most 125 characters, so these reads are not byte-level. |
| `https://legislation.nysenate.gov/api/3/laws/GBN/A48` and `/GBS/1800` | curl | HTTP 401 (API key required). |
| `https://www.nysenate.gov/legislation/laws/GBS/1801`, `/1802`, `/1804` (second read, asked for verbatim text) | WebFetch | Each reply: "I can't reproduce ... verbatim" and a paraphrase. The tool does not return full section text, so "consolidated agrees" below means agreement at the level of that paraphrase, nothing stronger. |
| WebSearch `"Laws of New York" 2026 chapter 368 S9051 AI companion slip law` | WebSearch | Ten secondary or tracker hits (listed in 1.5). No page carrying the chapter text. |
| WebSearch `New York session laws 2026 chapters slip laws host Department of State "Laws of New York" online` | WebSearch | Assembly "new laws taking effect" monthly PDFs (summaries, not texts) and Senate bill-list pages. No Department of State session-laws host was returned. |
| `https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/new-york-enacts-prohibition-on-unsafe-ai-companion-features-for-minors-s9051-b` | WebFetch | HTTP 403. |

Bill page actions (WebFetch, 2026-11-27): Oct 28, 2026 "approval memo.6", "signed chap.368", "delivered to governor"; Jun 5, 2026 "returned to senate", "passed assembly"; Jun 4, 2026 "passed senate", "substituted for a10379c"; Jun 1, 2026 "amended on third reading (t) 9051b"; Jan 27, 2026 "referred to internet and technology". The page states S9051B is the active version and the Assembly companion is A10379, version C.

### 1.2 Operative passages

Quotes tagged "PDF" are from the as-passed bill print [S9051-B](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), fetched 2026-11-27 (text extracted locally, line numbers in `S9051B.txt`). Tags "consolidated" mean the Senate consolidated-law page for that section, read through WebFetch on 2026-11-27 as a paraphrase only: [1800](https://www.nysenate.gov/legislation/laws/GBS/1800), [1801](https://www.nysenate.gov/legislation/laws/GBS/1801), [1802](https://www.nysenate.gov/legislation/laws/GBS/1802), [1803](https://www.nysenate.gov/legislation/laws/GBS/1803), [1804](https://www.nysenate.gov/legislation/laws/GBS/1804), [1805](https://www.nysenate.gov/legislation/laws/GBS/1805), article index [A48](https://www.nysenate.gov/legislation/laws/GBS/A48). No quote below was checked word for word against the consolidated text.

- **Default-off condition, 1801(1)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27; [consolidated 1801](https://www.nysenate.gov/legislation/laws/GBS/1801) paraphrase agrees): "it shall be unlawful for an operator to provide unsafe AI companion features to a covered user unless: (a) the covered user is not a covered minor; and (b) the operator has used methods that are permissible under article forty-five of this chapter and its implementing regulations and any additional regulations promulgated pursuant to this article to determine that the covered user is not a covered minor."
- **Exemption, 1801(2)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27; [consolidated 1801](https://www.nysenate.gov/legislation/laws/GBS/1801) paraphrase agrees, including that the "unable to respond" proviso is stated for (a) and (b)): applies "solely for the purpose of: (a) customer service or to strictly provide users with information about available commercial services or products ..., provided that the covered AI companion is unable to respond on topics outside of the specified purpose; (b) providing efficiency improvements or research or technical assistance, provided that the covered AI companion is unable to respond on topics outside of the specified purpose; or (c) with respect to any system used by a business entity, internal purposes or employee productivity."
- **Covered operator, 1800(6) and (5) and (10)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27): "'Operator' shall mean any person, partnership, association, firm, or business entity, or any member, affiliate, subsidiary or beneficial owner of any partnership, association, firm, or business entity who provides a covered AI companion to a user." "'Covered AI companion' shall mean a generative artificial intelligence system with a natural language interface, including via writing or sound, that provides ongoing, adaptive responses to user inputs." "'Covered user' shall mean a user of a covered AI companion in the state of New York who is not acting as an operator, or agent or affiliate of an operator." [Consolidated 1800](https://www.nysenate.gov/legislation/laws/GBS/1800) paraphrase agrees.
- **Unsafe features, 1800(8)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27): the lead-in is "one or more covered AI companion design features that, at any point during a covered AI companion-user interaction", then twelve items (a) to (l). The [consolidated 1800](https://www.nysenate.gov/legislation/laws/GBS/1800) paraphrase lists twelve items too. Two items depend on the Attorney General or on minors: (g) "are deceptive as to minors concerning the mechanical and non-sentient nature of the covered AI companion" and (h) "any other design feature that simulates companionship or an interpersonal relationship with a user or is deceptive as to minors as identified via regulations promulgated by the attorney general".
- **Covered minor, 1800(9)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27): "when the operator has actual knowledge that the covered user is a minor."
- **Penalty, 1802(1)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27; [consolidated 1802](https://www.nysenate.gov/legislation/laws/GBS/1802) paraphrase agrees: injunction, restitution, disgorgement "including destroying unlawfully obtained data and any algorithm trained on it", damages, civil penalties up to $25,000 per violation; 1802(3) void waivers; 1802(4) joint and several affiliate liability): the Attorney General may sue "to obtain civil penalties of up to twenty-five thousand dollars per violation", plus injunction, restitution, disgorgement "including but not limited to the destruction of unlawfully obtained data and any algorithm trained in such data", and damages.
- **Interim age-assurance standard, 1804(1)** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B) lines 190-208, 2026-11-27; [consolidated 1804](https://www.nysenate.gov/legislation/laws/GBS/1804) paraphrase agrees on (a) to (c), on the data limit and on the art. 47 clause): "To the extent rules or regulations referenced in section eighteen hundred three ... or rules and regulations regarding age assurance methods promulgated pursuant to article forty-five of this chapter are not in effect, an operator shall rely on a determination ... made using a reasonable age assurance method that meets the following requirements: (a) ... reasonably guard against circumvention and reasonably minimize the retention of information collected for age assurance purposes; (b) an operator may only rely on self-declaration as a reasonable age assurance method if the user self-declares minor status; and (c) an operator must make available more than one age assurance method to covered users, including at least one method that either does not rely on government issued identification or that allows a covered user to maintain anonymity as to the operator." 1804(2): information collected "shall not be used for any purpose other than to make such determination and shall be deleted immediately after an attempt to determine whether a covered user is a covered minor, except where necessary for compliance with any applicable provisions of New York state or federal law or regulation" (PDF lines 202-206). The consolidated paraphrase has the same exception.
- **Effective date, section 3** ([PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 2026-11-27): "This act shall take effect January 1, 2027." The consolidated pages carry "NB Effective January 1, 2027" on 1800 to 1805 (1801 and 1802 and 1804 re-read in this repair pass, same wording).

### 1.3 Differences from what the consolidation states

Compared against `ux-ai-features.md` Verdict 2 and 8, C13, and UX-AI-24 (read in this session).

| # | Consolidation says | Text says | Effect |
|---|---|---|---|
| D1 | Age determination uses "a method the owner approves as permissible under 1801(1)(b)". The art. 45 regulations "were not read". | 1804 sets a statutory standard that applies until regulations exist: self-declaration counts only for a user who declares minor status, at least two methods, one without government ID or anonymous, and deletion right after the attempt. | UX-AI-24 changes (see Effect). This is the one substantive gap. |
| D2 | The exemption "covers only a system offered solely for customer service, research or technical assistance that 'is unable to respond on topics outside of the specified purpose'". | The "unable to respond on topics outside" proviso is in (a) and (b). (c), internal or employee productivity, has none. (b) also names "efficiency improvements". | Wording only. The rule text over-applies the proviso to (c). |
| D3 | Penalty "up to $25,000 per violation (1802(1))". | Same figure. 1802(1) also allows disgorgement including destruction of "any algorithm trained in such data". 1802(3) voids contract waivers, and 1802(4) adds joint and several liability for affiliates that limit liability on purpose. | Rationale gains the remedy. Not in the consolidation. |
| D4 | "Chaptered text is unread". | The chaptered slip law is still unread. The consolidated-law pages, which reflect the enacted text, agree, but only at paraphrase level because the fetch tool will not return section text. The two bill prints differ only in bill number, page footers and one drafting code (1.4). | Verdict 8 gap narrows. It does not close. |
| D5 | "twelve 'unsafe AI companion features' unlawful for a user unless the operator has determined that the user is not a minor". | Correct for (a) to (f), (i) to (l). Items (g) and (h) are defined by deception "as to minors", and (h) depends on future Attorney General regulations. | Twelve is right. "Read all twelve from the statute" stays right. Add that (h) is open-ended. |
| D6 | Title of article not stated. | The article is titled "Prohibition On Unsafe AI Companion Features For Minors" on the consolidated page, but 1801(1) restricts the features for every covered user unless a non-minor determination is made. | Consistent with C13. A reader of the title alone would miss the default-off effect. |
| D7 | Not stated. | 1805: the article applies to conduct "in whole or in part in the state of New York". Conduct is wholly outside only if the user is physically outside New York. | Add to the scope record: geolocation of the user, not the operator's seat, decides. |
| D8 | Not stated. | 1804(3): the article "shall not supersede, amend, or repeal article forty-seven". | Both art. 47 (UX-AI-05) and art. 48 (UX-AI-24) can bind one product. |

One open flag: the bill page lists an "approval memo.6" on 2026-10-28. A search result summary (see 1.5) says governors sometimes sign with an agreed chapter amendment; none was found for S9051. The consolidated pages carry no amendment marker, but the memo text was not read.

No difference was found in the effective date, the signing date and chapter, the twelve features, the covered-minor definition, or the penalty figure.

### 1.4 The two bill prints, diffed

Both PDFs were fetched with curl on 2026-11-27 ([S9051B](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), 15518 bytes; [A10379C](https://legislation.nysenate.gov/pdf/bills/2025/A10379C), 15484 bytes), text-extracted with `uv run --with pypdf`, then compared word by word from the first occurrence of "1800" to the end:

```
for f in S9051B A10379C; do sed -n '/1800/,$p' $f.txt | tr -s '[:space:]' '\n' | grep -v '^$' > $f.w2; wc -w $f.w2; done
diff S9051B.w2 A10379C.w2; echo "exit=$?"
```

Output:

```
2051 S9051B.w2
2051 A10379C.w2
98,100c98,100
< LBD14579-09-6
< S.
< 9051--B
---
> LBD14579-08-6
> A.
> 10379--C
648,649c648,649
< S.
< 9051--B
---
> A.
> 10379--C
1264,1265c1264,1265
< S.
< 9051--B
---
> A.
> 10379--C
1897,1898c1897,1898
< S.
< 9051--B
---
> A.
> 10379--C
exit=1
```

Both files hold 2051 words from "1800" on. The earlier draft of this file said "1821 words each, diff empty"; that was wrong on both counts. The only differences are the bill number in the page footers (4 times) and the drafting-office code `LBD14579-09-6` against `-08-6`. No operative word differs. Files: `S9051B.txt` and `A10379C.txt` in the scratch directory.

### 1.5 Search for a chapter-law host

Searches run 2026-11-27 (WebSearch, standard mode), queries as listed in 1.1. First query returned: [Holland & Knight note, 2026-11-05](https://www.hklaw.com/en/insights/publications/2026/11/new-york-enacts-ai-chatbot-safeguards-for-minors), [Akin Gump tracker](https://www.akingump.com/en/insights/ai-law-and-regulation-tracker/new-york-enacts-prohibition-on-unsafe-ai-companion-features-for-minors-s9051-b), [Digital Policy Alert, chapter 368 entry](https://digitalpolicyalert.org/event/45185-governor-of-new-york-signed-bill-prohibiting-artificial-intelligence-companions-from-using-features-considered-unsafe-for-minors-sb-9051bab-10379c-into-law-as-chapter-368-of-the-laws-of-2026), [Recording Law](https://www.recordinglaw.com/news/new-york-ai-companion-chatbot-law-chapter-368/), [regulations.ai](https://regulations.ai/regulations/RAI-US-NY-S9051B0-2026), and the Senate's own S9051 and A10379 bill pages. All are secondary or the bill pages already read. The second query returned Assembly monthly "new laws taking effect" PDFs (for example [Assembly, September 2026](https://www.nyassembly.gov/write/upload/member_files/083/20230203_0104850/pdfs/2026/sept_new_laws_2026.pdf), vendor-neutral state publication, summary only) and no session-laws host. This shows that no chapter-text host was found by these two searches. It does not show that none exists.

## Part 2. Held-out check of UX-AI-05 and UX-AI-15

### 2.1 Surfaces

Selection rule: products that appear nowhere in `ux-ai-features.md` or its sub-artifacts. Check, run from `.agents/research/` on 2026-11-27 over the 6 files that existed besides this one (`ux-ai-features.md` and five files under `ux-ai-features/`, this file excluded):

```
find ux-ai-features.md ux-ai-features -type f ! -name followup-w3-q0.md > ff.txt
for n in <name>; do xargs grep -hiF -- "$n" < ff.txt | wc -l; done
```

Counts for the 14 candidate names: SillyTavern 0, Open WebUI 0, open-webui 0, LibreChat 0, LobeChat 0, lobe-chat 0, vercel/ai-chatbot 0, Dify 0, janhq 0, Jan AI 0, jan.ai 0, text-generation-webui 0, AnythingLLM 0, ai-chatbot 9. The 9 `ai-chatbot` lines were all substrings of the URL slug `first-nation-ai-chatbot-safeguards-...` (Padilla press release) or of `new-york-enacts-ai-chatbot-safeguards-for-minors` (Holland & Knight); `grep -nw Jan` found nothing. So the seven were held out. (text-generation-webui and AnythingLLM were candidates but not used.) Cloned with `git clone --depth 1` into `.../ux-ai-w3q0/repos/`; remotes read with `git remote get-url origin`. Never run, never logged into.

| Product | Repository | Commit (commit date) | UI dirs scanned |
|---|---|---|---|
| SillyTavern (character and roleplay chat) | [SillyTavern/SillyTavern](https://github.com/SillyTavern/SillyTavern) | `82b64a4` (2026-11-19) | `public/scripts`, `public/index.html` |
| Open WebUI | [open-webui/open-webui](https://github.com/open-webui/open-webui) | `926f826` (2026-11-25) | `src/lib/components` |
| LibreChat | [danny-avila/LibreChat](https://github.com/danny-avila/LibreChat) | `4700c44` (2026-11-19) | `client/src` |
| LobeChat | [lobehub/lobe-chat](https://github.com/lobehub/lobe-chat) | `661feee4` (2026-11-27) | `src` |
| Vercel `ai-chatbot` | [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) | `a8989b5` (2026-11-03) | `components`, `app` |
| Dify | [langgenius/dify](https://github.com/langgenius/dify) | `3ec320d6` (2026-11-27) | `web/app` |
| Jan | [janhq/jan](https://github.com/janhq/jan) | `49a84bd` (2026-11-18) | `web-app/src` |

File paths below resolve as `<repo URL>/blob/<commit>/<path>`. All repository data is first-party source code at the listed commit, not vendor claims.

### 2.2 UX-AI-15, steps as written

Commands, run in each repo (script `s15.sh`, run with `bash`):

```
grep -rnE "confidence|certainty|probability" <dirs> --include='*.js' --include='*.ts' --include='*.tsx' --include='*.svelte' --include='*.html' --include='*.vue' | grep -E "%|toFixed|percent|\* ?100|Math\.round"
git grep -il "calibration" -- docs adr .agents
git grep -nE "model:.*prompt:.*n=[0-9]+.*(Brier|ECE)=" -- docs adr .agents
```

Raw output of `bash s15.sh <repo> <dirs>` followed by the record-regex command (long lines cut at 200 characters), captured 2026-11-27:

```
##### SillyTavern (public/scripts public/index.html)
step1 total: 10
public/scripts/world-info.js:5043:  console.debug(`WI entry ${entry.uid} passed probability check of ${entry.probability}%`);
public/scripts/extensions/tts/lib/kokoro.web.js:1:var e,A,t={"./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm":...
public/scripts/logprobs.js:209:  const percentText = $('<span></span>').text(`${(+probability * 100).toFixed(2)}%`);
public/scripts/nai-settings.js:811:  // them with a logprob of -Infinity (0% probability)
public/index.html:1043: ... title="Min P sets a base minimum probability.&#13;This is scaled according to the top ...
public/index.html:1051: ... title="Top A sets a threshold for token selection based on the square of the highest ...
public/index.html:1297: ... data-i18n="[title]Min_P_desc" title="Min P sets a base minimum probability. This is s...
public/index.html:1305: ... title="Top A sets a threshold for token selection based on the square of the highest ...
public/index.html:4866: <option data-order="asc" data-field="probability" value="11" data-i18n="Trigger% ↗">Trigger% ↗</option>
public/index.html:4867: <option data-order="desc" data-field="probability" value="12" data-i18n="Trigger% ↘">Trigger% ↘</option>
step2 calibration docs:        (nothing; rc=1)
record-regex:                  (nothing; rc=1)
##### open-webui (src/lib/components)     step1 total: 0   step2: nothing   record-regex: nothing
##### LibreChat (client/src)
step1 total: 1
client/src/hooks/Chat/__tests__/useSteering.spec.tsx:2900:    ] as const)('marks delivery uncertainty correctly for %s', (_scenario, error, uncertain) => {
step2: nothing   record-regex: nothing
##### lobe-chat (src)
step1 total: 0
step2 calibration docs (rc=0, 21 files):
.agents/skills/alint-ruleset/SKILL.md
.agents/skills/alint-ruleset/references/{calibration,cost,promotion,weekly}.md
.agents/skills/alint-ruleset/scripts/{collect-rejections,sample-findings}.ts
.agents/skills/deep-review/SKILL.md
.agents/skills/deep-review/references/dimensions/{ai-coding-bad-habits,business-logic,code-style,logic,new-feature,observability,performance,security,ux}.md
.agents/skills/deep-review/references/{light-review-prompt,review-prompt,verify-prompt}.md
docs/development/database-schema.dbml
record-regex: nothing
##### ai-chatbot (components app)   step1 total: 0   step2: nothing   record-regex: nothing
##### dify (web/app)                step1 total: 0   step2: nothing   record-regex: nothing
##### jan (web-app/src)             step1 total: 0   step2: nothing   record-regex: nothing
```

(The brace groups in the LobeChat list are a compression of the 21 literal paths for readability; the run printed one path per line.) Step 2 lists 21 files in LobeChat, not 14 as an earlier draft said: 20 under `.agents/skills/` that use "calibration" in a lint-review sense and `docs/development/database-schema.dbml`. The record regex printed nothing in all seven. Step 2 only runs after a step-1 hit, so these LobeChat files did not change any verdict, but the word-only grep is a false-pass risk.

Verdict per the rule as written, then the true reading:

| Product | As written | Cause | True reading |
|---|---|---|---|
| SillyTavern | FAIL (10 hits, no record) | `public/scripts/logprobs.js:209`: ``$('<span></span>').text(`${(+probability * 100).toFixed(2)}%`)`` shows token probabilities in a developer viewer of the sampling API. The other nine are noise: `public/index.html:1043,1051,1297,1305` sampler tooltips ("Min P sets a base minimum probability"), `:4866-4867` lorebook "Trigger%" sort options, `world-info.js:5043` a `console.debug`, `nai-settings.js:811` a comment, and a minified vendored `kokoro.web.js:1`. | **False fail.** No self-reported certainty is shown. A token logprob is not a self-report. |
| LibreChat | FAIL (1 hit) | `client/src/hooks/Chat/__tests__/useSteering.spec.tsx:2900`: `'marks delivery uncertainty correctly for %s'`. The word `uncertainty` contains `certainty`, and `%s` is a format placeholder in a test. | **False fail** on that line. The rule also misses what LibreChat does show (see below). |
| Open WebUI | PASS (0 hits) | `src/lib/components/chat/Messages/Citations/RelevanceBadge.svelte:9,28`: `Math.round(distance * 10000) / 100` and `{percentage.toFixed(2)}%`, with classes `bg-green-200` for 80% and up (lines 13-14), `bg-yellow-200` from 60%, `bg-orange-200` from 40%, else `bg-red-200` (lines 15-19). It is rendered in `Citations/CitationModal.svelte:173` (`<RelevanceBadge distance={document.distance} {showPercentage} />`), and `Citations.svelte:19` defaults `showRelevance = true`. | **False pass.** A colour-coded percentage in the citation view. The file has no keyword the grep looks for. |
| Dify | PASS (0 hits) | `web/app/components/base/chat/chat/citation/popup.tsx:252`: `<ProgressTooltip data={Number(source.score.toFixed(2))} />`; `progress-tooltip.tsx:22` sets a bar `width: ${data * 100}%`. | **False pass.** A retrieval score bar beside each citation source. |
| Jan | PASS (0 hits) | `web-app/src/components/CitationLink.tsx:79`: `citation.score.toFixed(2)` in a badge. | **False pass.** Same class. |
| LibreChat (second finding) | already FAIL | `client/src/components/Web/Citation.tsx:145` and `SourceHovercard.tsx:85`: `{localize('com_ui_relevance')}: {Math.round(fileRelevance * 100)}%`. | The real cue is missed, and the FAIL is for the wrong reason. |
| LobeChat | PASS (0 hits) | `src/features/AgentChannel/WakeRecords/RecordTable.tsx:167` shows `item.judge.score.toFixed(2)` in an operator view of agent runs, and `SimilaritySearchList/Item.tsx:52` a knowledge-base similarity tag. Neither sits beside an end-user answer. | Correct pass. A judge score is an LLM-assigned number, but shown in an admin table. |
| ai-chatbot | PASS (0 hits) | No numeric score in `components` or `app`. | Correct pass. |

Totals: 2 false fails (SillyTavern, LibreChat), 3 false passes (Open WebUI, Dify, Jan), plus one correct-looking FAIL with the wrong cause (LibreChat). Two correct passes.

Step 1 depends on the directory scope. When the first run scanned `dify/web` instead of `dify/web/app`, a doc comment in `web/types/app.ts:186` ("top 10% probability mass samples") added a hit. The rule says "answer components" and does not say how to find them.

Step 3 (freshness) and step 4 (categorical label) were not reached: no repo has a calibration record, and no repo contains the phrase "confidence label". Open WebUI's four colour bins are a categorical label with no defined action, and step 4 never sees them.

### 2.3 A grep that does catch the class

A filename-scoped search over citation and source components, run in all seven repos:

```
git ls-files | grep -iE "(citation|source|reference|relevance).*\.(tsx|svelte|vue)$" | grep -viE "test|spec|stories|locales|docs/" | xargs -r grep -nE "toFixed|Math\.round|\* ?100"
```

Raw output, 2026-11-27 (lines cut at 190 characters; each repo ran from its root):

```
##### SillyTavern   (nothing)
##### open-webui
src/lib/components/chat/Messages/Citations/RelevanceBadge.svelte:9:		return Math.round(distance * 10000) / 100;
src/lib/components/chat/Messages/Citations/RelevanceBadge.svelte:28:			{percentage.toFixed(2)}%
src/lib/components/chat/Messages/Citations/RelevanceBadge.svelte:33:		({distance.toFixed(4)})
##### LibreChat
client/src/components/Chat/Messages/Content/UIResourceCarousel.tsx:126:                animationDelay: `${index * 100}ms`,
client/src/components/Web/Citation.tsx:145:                    {localize('com_ui_relevance')}: {Math.round(fileRelevance * 100)}%
client/src/components/Web/SourceHovercard.tsx:85:              {localize('com_ui_relevance')}: {Math.round(fileRelevance * 100)}%
client/src/components/Web/Sources.tsx:319:              {(file.bytes / 1024).toFixed(1)} KB
##### lobe-chat
packages/builtin-tool-skills/src/client/Render/ReadReference/index.tsx:46:  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
packages/builtin-tool-skills/src/client/Render/ReadReference/index.tsx:47:  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
src/features/ResourceManager/components/ChunkDrawer/SimilaritySearchList/Item.tsx:52:        <Tag variant={'filled'}>{similarity.toFixed(2)}</Tag>
src/routes/(main)/(create)/music/features/PromptInput/ReferenceAudio.tsx:50:  const maxSizeMb = maxFileSize ? Math.round(maxFileSize / 1024 / 1024) : undefined;
src/routes/(main)/memory/preferences/features/List/GridView/PreferenceCard.tsx:27:          percent={(preference.scorePriority ?? 0) * 100}
src/routes/(main)/memory/preferences/features/PreferenceDetail.tsx:65:          percent={(preference.scorePriority ?? 0) * 100}
##### ai-chatbot   (nothing)
##### dify
web/app/components/base/chat/chat/citation/popup.tsx:252:                            <ProgressTooltip data={Number(source.score.toFixed(2))} />
web/app/components/base/chat/chat/citation/progress-tooltip.tsx:22:            style={{ width: `${data * 100}%` }}
web/app/components/datasets/documents/create-from-pipeline/data-source/website-crawl/base/crawled-result.tsx:97:          time: usedTime.toFixed(1),
web/app/components/datasets/documents/create-from-pipeline/data-source/website-crawl/base/crawled-result.tsx:123:              time: usedTime.toFixed(1),
web/features/new-rag/sources/runtime-controller.tsx:17:const INITIAL_SOURCE_POLL_TIMEOUT = 10 * 60 * 1000
web/features/new-rag/sources/setup/sync-policy-field.tsx:91:  return { unit: 'hours' as const, value: Math.max(1, Math.round(clamped / HOUR_SECONDS)) }
web/features/new-rag/sources/setup/sync-policy-field.tsx:177:  const normalizedAmount = Math.min(maximum, Math.max(1, Math.round(amount ?? 1)))
##### jan
web-app/src/components/CitationLink.tsx:79:              {typeof citation.score === 'number' ? citation.score.toFixed(2) : ''}
web-app/src/components/Citations.tsx:45:  typeof s === 'number' ? s.toFixed(2) : ''
```

True hits: 3 (Open WebUI) + 2 (LibreChat) + 2 (Dify) + 2 (Jan) = 9 lines in 4 products. Noise: 13 lines (LibreChat 2, LobeChat 6 including `Item.tsx:52`, a knowledge-base similarity tag in a resource-manager drawer, not beside an answer, Dify 5). Total 22 printed lines, recounted with GNU grep: 0, 3, 4, 6, 0, 7, 2 for the seven repos in table order. The filename scope also misses any component not named citation, source, reference or relevance. This earlier draft said "eight true hits, about six noise lines"; the counts above replace that.

A word-boundary form of step 1, run with GNU grep (`/usr/bin/grep -rnE '\b(confidence|certainty|probability)\b' <dirs> --include=... | /usr/bin/grep -E '%|toFixed|percent|\* ?100|Math\.round' | wc -l`), printed 0 for LibreChat `client/src` (the false hit is gone) and 10 for SillyTavern `public/scripts public/index.html` (all ten stay). Caution: this machine's interactive `grep` is a ugrep shell function that returned 0 for the same `\b` pattern on SillyTavern; the rule's verification must name GNU grep or `-w`/`-P` semantics.

### 2.4 UX-AI-05, steps as written

UX-AI-05 tests (1) to (3) are behavioural (fake clock, crisis phrase, known-minor flag) and need the product's own test harness and a running app. They were not run on any of the seven. This is a documented gap, not a pass. The runnable parts were run in each repo:

```
git grep -ilE "AI companion|companion chatbot" -- docs adr .agents         # test (6)
git grep -nE "10800000|3 ?\* ?60 ?\* ?60|three hours|3 hours" -- '*.ts' '*.tsx' '*.js' '*.svelte'    # static form of (1)
git grep -IlniE "\b988\b|suicid|self-harm|crisis" -- <source types, no tests, no locales>             # static form of (2)
git grep -ilE "(not|may not) be suitable for (some )?minors" -- ':!*locales*'                         # (4)
```

Raw results, 2026-11-27 (one `git grep` per repo from its root; the static (1) and (2) lists are filtered with `grep -viE "test|spec|locales|\.min\.|vendor"` for (1) and the pathspec `':!*test*' ':!*spec*' ':!*locales*' ':!*i18n*'` for (2), and cut to the first 12 and 8 lines):

```
[t6] git grep -ilE 'AI companion|companion chatbot' -- docs adr .agents   -> nothing in all seven (rc=1)
[t4] git grep -ilE '(not|may not) be suitable for (some )?minors' -- ':!*locales*'   -> nothing in all seven (rc=1)
[s1] three-hour pattern
SillyTavern, ai-chatbot, dify, jan: nothing
open-webui: src/lib/components/admin/Analytics/Dashboard.svelte:500:  <option value="3h">{$i18n.t('3 hours')}</option>
LibreChat:  client/src/utils/balance.ts:124:/** "in 5 minutes" / "in 3 hours" / "in 4 days"; null once the moment has passed. */
lobe-chat:  apps/server/src/routers/lambda/aiAgent/exec.ts:398:   * Defer an agent run to a future time ("send this in 3 hours").
            apps/server/src/services/aiAgent/pipeline/scheduleAgentRun.ts:21: * Defer an agent run to a future time ("send this in 3 hours").
            apps/server/src/services/aiAgent/pipeline/scheduledRunKinds.ts:102: * Fire a run the user deliberately deferred ("send this in 3 hours").
            packages/types/src/widget/layout.ts:20: * - `relative` — "3 hours ago"
            src/features/Conversation/store/slices/generation/action.ts:427:   * Cancel a user-deferred run ("send this in 3 hours") before it fires.
            src/routes/(main)/agent/features/Conversation/HeterogeneousChatInput/scheduleTime.ts:7: * A schedule is only ever approximate ("in ~3 hours"), ...
            src/store/chat/slices/agentRun/actions/transports/gateway/serverSteerQueue.ts:56:const UNCONFIRMED_SETTLE_MS = 23 * 60 * 60 * 1000;
[s2] crisis pattern, git grep -IlniE "\b988\b|suicid|self-harm|crisis"
SillyTavern: public/img/nanogpt.svg
open-webui:  src/lib/components/icons/GlobeAltSolid.svelte, static/assets/emojis/1f1e6-1f1e9.svg (and 6 more emoji .svg files)
LibreChat:   client/public/assets/huggingface.svg, client/public/assets/langfuse-icon-monochrome.svg, packages/chat/src/components/parts/langIconPaths.ts
lobe-chat:   public/not-compatible.html, src/features/MemoryEntities/kinds.ts
ai-chatbot:  nothing
dify:        packages/iconify-collections/assets/public/llm/{huggingface-text,zhipuai-text}.svg, .../speaker.svg (2), web/app/components/app/overview/assets/{iframe,scripts}-option.svg, web/public/images/new-rag/create-knowledge-illustration.svg, web/public/vs/base/worker/workerMain.js
jan:         docs/src/assets/icons/huggingface.svg, docs/src/components/Home/BuiltWithLove/index.tsx, web-app/public/images/model-provider/{cohere,huggingface}.svg
```

Reading of the raw lists:

- Test (6): printed nothing in all seven repos (no owner scope record). A whole-tree `git grep -inE "AI companion|companion chatbot"` in LobeChat hit only model descriptions in `locales/en-US/models.json:1426-1428` (video models), not a scope record.
- Static (1), three-hour reminder: no real reminder in any repo. The hits above are false hits an agent would have to read: an analytics time-window option (Open WebUI), a doc comment (LibreChat `balance.ts:124`), a scheduling feature "send this in 3 hours" (LobeChat), and `23 * 60 * 60 * 1000` matching the substring `3 * 60 * 60`.
- Static (2), crisis protocol: no real protocol in any repo. Hits are SVG path data (`988` inside coordinates: Open WebUI `GlobeAltSolid.svelte`, the emoji SVGs, Jan `BuiltWithLove/index.tsx`, LibreChat `langIconPaths.ts`), a vendored Monaco worker (Dify `web/public/vs/base/worker/workerMain.js`), `public/not-compatible.html` (LobeChat; not read for cause), and `src/features/MemoryEntities/kinds.ts:35` (`crisis: 'event'`, a memory category). The `-I` flag plus an extension filter is what keeps PNGs out; without it image files match `988`.

Reading of the result: if each product were in scope, every one fails every duty, and that is the true verdict, because none ships a not-human reminder, a protocol or a suitability line (SillyTavern's own interface calls one mode "Visual Novel Mode" with a sprite behind the chat, `public/index.html:5099-5101`, which is the companion shape; no legal conclusion is drawn here, scope is the owner's). The defect is upstream. UX-AI-05 triggers only "if the owner confirms in writing". With no record, no duty applies and test (6) lists nothing, so a product that is in scope can pass the whole rule by silence. UX-AI-24 does not have this hole: it requires the owner to record yes or no. This is the false-pass class for UX-AI-05, and it is a gap in the consolidation's own text, not a missing keyword.

### 2.5 Failure classes the consolidation does not list

1. **Retrieval or similarity score shown beside a citation** (UX-AI-15, new): Open WebUI, LibreChat, Dify, Jan. The consolidation's "Trust theatre" list names "Confidence: 87%" from the model's own output, not a retriever score. Same reader risk, different source. No study of it was fetched.
2. **Token-probability viewers and sampler documentation** (UX-AI-15, false fail): SillyTavern. These are developer controls over the sampling API. No class listed.
3. **Substring and format-string hits** (UX-AI-15, false fail): `uncertainty` contains `certainty`, `%s` is a placeholder, and vendored minified files carry long lines. No class listed.
4. **Vacuous pass by absent scope record** (UX-AI-05): see 2.4. The Agent failure modes list (item 4) names a misread of NY-only duties, not this.
5. **Static greps for protocol presence collide with SVG, vendored and unrelated "3 hours" text** (UX-AI-05): any agent that replaces the behavioural tests with a grep makes false claims either way. The rule gives no static form, so agents improvise one.

## Effect on the ruleset

**UX-AI-24: change.** Replace the sentence "Turn one on only for a user whom the operator has determined, by a method the owner approves as permissible under 1801(1)(b), is not a minor." with:

"Turn one on only for a user whom the operator has determined is not a minor, by a method that is permissible under GBL art. 45 and its regulations or, while none is in effect, meets 1804(1): it reasonably guards against circumvention, it treats self-declaration as reliable only for a user who declares minor status (an 'I am an adult' tick never turns a feature on), it offers more than one method including one that does not need government ID or keeps the user anonymous to the operator, and it deletes the collected data right after the attempt unless a New York or federal law requires keeping it (1804(2))."

Also change the exemption sentence to: "customer service or research, technical assistance or efficiency use, each only if the system is unable to respond outside that purpose, or a business's internal or employee-productivity system (1801(2)(a) to (c); the proviso does not apply to (c))". Add to the rationale: penalty includes disgorgement and destruction of "any algorithm trained in such data" (1802(1)), waivers void (1802(3)), affiliates jointly liable (1802(4)); scope follows the user's physical location (1805); art. 47 is unaffected (1804(3)).

Add to verification: "(5) Unit test: with only a self-declared 'adult' value, every flag stays false; the age-assurance module exposes at least two methods, at least one that does not require a government ID document; a test shows the stored age-assurance payload is deleted after the attempt, except where a recorded legal retention duty applies. Run `git grep -nE "selfDeclared|self_declared|isAdult" <age module>` and read each hit." The grep names are examples, so the reviewer reads the module. Severity: MUST (conditional), unchanged. Verdict 8, bullet "New York art. 48": the chaptered slip law is still unread. The consolidated-law pages and A10379-C were read and match. State "enacted text read in the Senate's consolidated law, summary level" instead of "the chaptered text is unread". Decay: refresh date 2026-12-31 unchanged, add 1804 and the art. 45 regulations.

**UX-AI-05: change.** Add as the first sentence: "The owner records in writing, for New York and for California separately, whether the product is an AI companion or a companion chatbot; a missing record is a failure of this rule, not a pass." Add verification step (0): `git grep -ilE "AI companion|companion chatbot" -- docs adr .agents` must list a record that says yes or no for each state; no file means fail. Replace the improvised static checks with a statement in the verification: "tests (1) to (3) need the product's own harness; if none exists, report 'not run' and do not substitute a grep, because `988` and 'in 3 hours' match SVG paths, vendored editors and scheduling text." Severity MUST (conditional), unchanged. Basis unchanged.

**UX-AI-15: change.** Step 1 becomes: "`grep -rnE '\b(confidence|certainty|probability)\b' <answer components> --include=... | grep -vE 'test|spec|locales|\.min\.' | grep -E '%|toFixed|percent|\* ?100|Math\.round'`. Answer components are the files that render a model answer or its citations. Token log-probabilities shown in a developer or debug view of a sampling API are out of scope; shown to an end user as a trust cue they are in scope." Step 2's first half must read `git grep -il "# Calibration record" -- docs adr .agents`, so that an unrelated use of the word "calibration" (LobeChat `.agents/skills/alint-ruleset/`) cannot pass. Severity SHOULD, unchanged.

**NEW rule UX-AI-25.** Rule: "Do not show a retriever's relevance, similarity or distance score to the end user as a percentage, a colour bin, a bar or a decimal beside an answer or a citation. Show rank order, or no number. A product that wants to show a score records, as UX-AI-15 requires for a model's own number, a user test showing that it improves decisions." Rationale: DESIGN, no study fetched on retrieval scores. Prevalence only: four of seven held-out AI products show one, and Open WebUI colours it green at 80% and up (`RelevanceBadge.svelte`). The cue is the same as a "Confidence: 87%" claim, and a vector distance is not a probability of correctness. Verification: the filename-scoped grep in 2.3; each hit is read, and a hit that shows a score beside a citation fails. A test with a fixed `score: 0.87` and an asserted absence of `87` in the rendered citation passes. Severity: CONSIDER. It is not SHOULD, because no source shows harm from these scores; promote if a study of retrieval-score display in cited answers is found.

**UX-AI-01, -03, -09 to -14, -16 to -23:** not touched by this commission. Confirm, not re-run.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| S9051-B signed as Chapter 368 on 2026-10-28; passed Senate 2026-06-04; Assembly print A10379-C substituted; passed Assembly 2026-06-05 | [Senate bill page, WebFetch](https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B) | read 2026-11-27 |
| GBL art. 48, sections 1800 to 1805, "NB Effective January 1, 2027" | [Senate consolidated law](https://www.nysenate.gov/legislation/laws/GBS/A48) and the six section pages | read 2026-11-27 |
| 1802(1) penalty up to $25,000 per violation | [GBS 1802](https://www.nysenate.gov/legislation/laws/GBS/1802) | read 2026-11-27 |
| 1804 interim age-assurance standard | [GBS 1804](https://www.nysenate.gov/legislation/laws/GBS/1804) and the S9051-B PDF | read 2026-11-27 |
| Held-out product commits as in the table in 2.1 | `git clone --depth 1` of [SillyTavern/SillyTavern](https://github.com/SillyTavern/SillyTavern), [open-webui/open-webui](https://github.com/open-webui/open-webui), [danny-avila/LibreChat](https://github.com/danny-avila/LibreChat), [lobehub/lobe-chat](https://github.com/lobehub/lobe-chat), [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot), [langgenius/dify](https://github.com/langgenius/dify), [janhq/jan](https://github.com/janhq/jan) (commit dates 2026-11-03 to 2026-11-27, see 2.1) | cloned 2026-11-27 |
| S9051-B and A10379-C differ only in bill number, footers and drafting code (2051 words each from "1800") | [S9051B PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), [A10379C PDF](https://legislation.nysenate.gov/pdf/bills/2025/A10379C), diff in 1.4 | 2026-11-27 |
| 1804(2) data deletion has an exception for compliance with state or federal law | [S9051-B PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B), lines 202-206 | read 2026-11-27 |
| Bill actions incl. "approval memo.6" on 2026-10-28 | [Senate bill page](https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B) | read 2026-11-27 |
| Secondary: Chapter 368 of the Laws of 2026, effective 2027-01-01 | [Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/11/new-york-enacts-ai-chatbot-safeguards-for-minors) (law firm, secondary) | 2026-11-05 |

## What could not be determined

- **The chaptered slip law of Chapter 368.** The Senate bill page lists no chapter-law link, and none of the two searches in 1.5 returned a state host for Laws of New York 2026. The comparison rests on the consolidated GBS pages (summary level, 125-character quotes through WebFetch; curl gets HTTP 403) and the as-passed PDFs. Searches run are in 1.5. The consolidated pages could be read only as WebFetch paraphrases, so the "consolidated agrees" statements are paraphrase-level. Missing: a byte-level copy of the chapter, and the content of "approval memo.6" (a chapter amendment is not ruled out). Reading `https://www.nysenate.gov/legislation/laws/GBS/A48` in a browser would settle it.
- **Attorney General rules under 1803 and the art. 45 age-assurance rules.** Not searched in this round. 1804 applies only while they are not in effect.
- **UX-AI-05 behavioural tests (1) to (3) on foreign code.** Not run on any of the seven. Missing: each product's running build or test harness. The seven products were never run or logged into.
- **Whether any of the seven is an "AI companion" or "covered AI companion".** That is a legal scope call for an owner, and no court or Attorney General guidance was fetched.
- **Whether a retrieval score shown beside a citation harms user decisions.** No study fetched. UX-AI-25 rests on prevalence only.
- **Real-user behaviour of the seven UIs.** The checks read source on `main` at the commits listed; feature flags, builds and locale files were not examined. The 2026-11-27 snapshot may differ from a release build.
