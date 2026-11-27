---
title: "Follow-up q2: NY GBL art. 47 effective date and the chaptered California SB 243"
program: product
topic: ux-ai-features
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
---

# Follow-up q2: NY GBL art. 47 effective date and the chaptered California SB 243

Question: what is the official effective date of NY GBL art. 47 Part U, and what does the chaptered California SB 243 text say?

## Answer

Read date for every fetch below: 2026-11-27. Scratch files: `~/.cache/research-lang/exemplars/product/wave2/q2/`.

1. **NY art. 47 took effect on 2025-11-05.**
   - Enacting clause. S-3008C Part U, section 3 reads: "This act shall take effect on the one hundred eightieth day after it shall have become a law." Source: [S-3008C bill PDF](https://legislation.nysenate.gov/pdf/bills/2025/S3008C), page 60, line 38 (the earlier draft said page 61; the extracted text puts section 3 after the page-60 header). Text extracted with `uv run --no-project --with pypdf python -I` into `s3008c.txt`; `grep -n "one hundred eightieth" s3008c.txt` hit line 3332 for Part U.
   - Signing. The [nysenate.gov bill page for S3008 amendment C](https://www.nysenate.gov/legislation/bills/2025/S3008/amendment/C) (read 2026-11-27) shows "Signed by Governor, May 09, 2025, Chapter 58 of 2025".
   - Count. `date -d "2025-05-09 + 180 days" +%F` printed `2025-11-05`; `date -d "2025-05-09 + 179 days" +%F` printed `2025-11-04`.
   - Confirmation, secondary. [Morrison Foerster, 2025-11-20](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai): the law "took effect on November 5, 2025." (fetched 2026-11-27).
   - The Governor's release returned HTTP 403 to WebFetch and curl, so it is not a source. The date rests on the primary enacting clause and the primary signing action.
2. **UX-AI-05's NY notice duty was over-stated.** [GBL 1702 in the S-3008C PDF](https://legislation.nysenate.gov/pdf/bills/2025/S3008C) (enacted 2025-05-09; line 3278 of `s3008c.txt`): "An operator shall provide a clear and conspicuous notification to a user at the beginning of any AI companion interaction which need not exceed once per day and at least every three hours for continuing AI companion interactions which states either verbally or in writing that the user is not communicating with a human." The start notice need not exceed once per day. The three-hour repeat applies to continuing interactions. The consolidated text on [nysenate.gov GBS 1702](https://www.nysenate.gov/legislation/laws/GBS/1702) (revision 2025-11-07) carries the same sentence.
3. **NY scope is narrow, and NY penalties are Attorney-General only.** [S-3008C PDF](https://legislation.nysenate.gov/pdf/bills/2025/S3008C) (enacted 2025-05-09), section 1700(4)(a): "AI companion" means a system "designed to simulate a sustained human or human-like relationship with a user by" all three of (i) "retaining information on prior interactions or user sessions", (ii) "asking unprompted or unsolicited emotion-based questions", and (iii) "sustaining an ongoing dialogue concerning matters personal to the user". Section 1700(4)(c) excludes (i) a system "used by a business entity solely for customer service", (ii) a system "primarily designed and marketed for providing efficiency improvements or, research or technical assistance", and (iii) a system "used by a business entity solely for internal purposes or employee productivity". Section 1703(1): the Attorney General "may seek civil penalties of up to fifteen thousand dollars per day for a violation". The text names no private right of action. A docs "Ask AI" or a coding assistant is outside it unless all three traits hold.
4. **California SB 243 is Chapter 677, Statutes of 2025, approved 2025-10-13.** Source: the Legislative Counsel chaptered PDF as hosted on the [Sidley AI-monitor page](https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-sb243-companion-chatbots.pdf?la=en), fetched earlier in this task and kept as `sb243.pdf`; a re-download with curl today was refused, so the stored copy is the read copy. Header: "Senate Bill No. 243 / CHAPTER 677 ... [Approved by Governor October 13, 2025. Filed with Secretary of State October 13, 2025.]". It adds Business and Professions Code ch. 22.6, sections 22601-22606. Operative text, all from that PDF (2025-10-13):
   - 22601(b)(1) "Companion chatbot": "an artificial intelligence system with a natural language interface that provides adaptive, human-like responses to user inputs and is capable of meeting a user's social needs, including by exhibiting anthropomorphic features and being able to sustain a relationship across multiple interactions."
   - 22601(b)(2) exclusions: "A bot that is used only for customer service, a business' operational purposes, productivity and analysis related to source information, internal research, or technical assistance"; a game-limited video game bot; a stand-alone voice speaker that does not sustain a relationship.
   - 22602(a): "If a reasonable person interacting with a companion chatbot would be misled to believe that the person is interacting with a human, an operator shall issue a clear and conspicuous notification indicating that the companion chatbot is artificially generated and not human." No time interval for adults.
   - 22602(b): an operator "shall prevent a companion chatbot ... from engaging with users unless the operator maintains a protocol for preventing the production of suicidal ideation, suicide, or self-harm content", including a notification "that refers the user to crisis service providers, including a suicide hotline or crisis text line", and "shall publish details on the protocol ... on the operator's internet website".
   - 22602(c): only "for a user that the operator knows is a minor": disclose that the user is interacting with AI; "provide by default a clear and conspicuous notification to the user at least every three hours for continuing companion chatbot interactions that reminds the user to take a break and that the companion chatbot is artificially generated and not human"; and reasonable measures against sexually explicit visual material.
   - 22603(a): "Beginning July 1, 2027, an operator shall annually report to the office" (Office of Suicide Prevention): the number of crisis referral notifications and the detection and response protocols, with no user identifiers.
   - 22604: disclose "on the application, the browser, or any other format" that "companion chatbots may not be suitable for some minors". Every operator, no knowledge condition.
   - 22605: a person with "injury in fact" may sue for injunctive relief, "the greater of actual damages or one thousand dollars ($1,000) per violation", and attorney's fees. 22606: duties are cumulative with other law.
   - The earlier "403 gap" measurement, now rerunnable as written: `curl -sL -A "Mozilla/5.0" -o /dev/null -w "%{http_code} %{size_download}\n" "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB243"` printed `403 5610`. leginfo refuses non-browser clients.
5. **The SB 243 operative date is 2026-01-01; the chaptered text does not state it, so the date comes from four routes, none the chaptered text.** `grep -n -i "effective\|urgency" sb243.txt` printed nothing: no urgency clause. The only date in the text is 22603(a), 2027-07-01.
   - Statute rule. [Gov. Code 9600(a) on california.public.law](https://california.public.law/codes/government_code_section_9600) (read 2026-11-27): "a statute enacted at a regular session shall go into effect on January 1 next following a 90-day period from the date of enactment of the statute". The Constitution's own rule is Art. IV s.8(c); [FindLaw's copy of Art. IV s.8](https://codes.findlaw.com/ca/constitution-of-the-state-of-california-1879/ca-const-art-iv-sect-8/) (read 2026-11-27) gives (c)(1) as "a statute enacted at a regular session shall go into effect on January 1 next following a 90-day period" and (c)(3) as "urgency statutes shall go into effect immediately upon their enactment". The fetch tool returned (c)(2) only as a paraphrase: a statute passed by the start of the joint recess before the second year of the biennium, still with the Governor after that date, "shall go into effect on January 1 next following the enactment date of the statute".
   - A literal reading of (c)(1) alone does not give 2026-01-01. `date -d "2025-10-13 + 90 days" +%F` printed `2026-01-11`, so "January 1 next following" that period would be 2027-01-01. The 2026-01-01 date therefore depends on (c)(2): the bill passed before the recess and was with the Governor after it. I did not read a primary source for the passage date; a search summary of LegiScan says the Senate concurred on 2025-09-11 (secondary, not opened: legiscan.com returned 403). Treat the (c)(2) route as likely, not verified.
   - Author's office, official, a party to the bill. [Senator Padilla's press release, 2025-10-13](https://sd18.senate.ca.gov/news/first-nation-ai-chatbot-safeguards-signed-law): "The bill becomes law on January 1st, 2026."
   - Secondary. [Morrison Foerster, 2025-11-20](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai): "Core requirements become effective January 1, 2026." The codified [california.public.law s.22602](https://california.public.law/codes/business_and_professions_code_section_22602) shows the section "updated January 1, 2026" (verified 2026-11-23).
   - Verdict: label 2026-01-01 CORROBORATED (author's office plus two secondary sources plus the (c)(2) route), not primary-verified. Justia, counselstack, casemine and leginfo returned 403: `curl -sL -A "Mozilla/5.0" -o /dev/null -w "%{http_code} %{size_download}\n" "https://law.justia.com/constitution/california/article-iv/section-8/"` printed `403 5550`.
6. **New fact since wave 1: NY Article 48 (S9051-B) was signed 2026-10-28 as Chapter 368 and takes effect 2027-01-01.**
   - Primary. The [nysenate.gov S9051 amendment B page](https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B) (read 2026-11-27) lists "signed chap.368" on Oct 28, 2026. This replaces the earlier secondary-only signing date. The [Holland & Knight alert, 2026-11-05](https://www.hklaw.com/en/insights/publications/2026/11/new-york-enacts-ai-chatbot-safeguards-for-minors) (secondary) agrees.
   - Effective date. The [S9051-B bill PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B) (printed "S. 9051--B", introduced 2026-01-27), section 3: "This act shall take effect January 1, 2027."
   - Text caveat. That PDF is the bill as passed; I did not read a chaptered copy, so the penalty and definitions below are the passed text. Text extracted with `uv run --no-project --with pypdf python -I` into `s9051b.txt`.
   - Section 1800(5): "Covered AI companion" means "a generative artificial intelligence system with a natural language interface, including via writing or sound, that provides ongoing, adaptive responses to user inputs", and "includes but is not limited to an AI companion". Wider than art. 47.
   - Section 1800(8): "Unsafe AI companion features" are design features that "generate outputs suggesting that the covered AI companion is a real or fictional individual or character that is human, alive, or experiences human emotions" (a); "engage in flattery or sycophancy with the user" (d); "unprompted or unsolicited emotion-based questions" (e); "use information concerning the user's mental or physical health or well-being ... acquired from the user more than twelve hours previously or in any previous user session" (f); and (j) "encouragement to maintain secrecy about interactions". Twelve items, (a) to (l).
   - Section 1800(9): "Covered minor" means a covered user "when the operator has actual knowledge that the covered user is a minor."
   - Section 1801(1): "it shall be unlawful for an operator to provide unsafe AI companion features to a covered user unless" the user is not a covered minor and the operator used permitted methods to determine that.
   - Section 1801(2): the prohibition does not apply where the system is offered "solely for the purpose of" customer service, or "providing efficiency improvements or research or technical assistance", in both cases "provided that the covered AI companion is unable to respond on topics outside of the specified purpose", or internal or employee-productivity use. A general-purpose chat can therefore fall in scope.
   - Section 1802(1): the Attorney General may seek "civil penalties of up to twenty-five thousand dollars per violation".

## Effect on the ruleset

**UX-AI-05: change.** New text:

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AI-05 | If the owner confirms that the product is an "AI companion" (NY GBL 1700(4)) or "companion chatbot" (CA B&P 22601(b)) reachable by users in New York or California, ship these, each behind its own flag so the owner can switch off a duty that does not apply. (a) A clear and conspicuous not-human notice at the start of each interaction, repeated at least every three hours in a continuing one (NY 1702; the start notice need not exceed once per day). (b) A documented self-harm protocol that refers users to crisis services, with the protocol's details published on the operator's website (NY 1701; CA 22602(b)). (c) For a user the operator knows is a minor: an AI disclosure, and a break-reminder notice that says the bot is artificially generated, at least every three hours (CA 22602(c)). (d) On the app, browser or other access format: "companion chatbots may not be suitable for some minors" (CA 22604). (e) From 2027-07-01, an annual report to the California Office of Suicide Prevention (CA 22603). A customer-service, productivity, research, technical-assistance or internal bot is excluded in both states, so a docs "Ask AI" is not in scope by default. Scope is the owner's call, in writing. | LEGAL: NY S-3008C Part U (GBL 47, effective 2025-11-05; text read in the legislature PDF; 180th day after the 2025-05-09 signing). CA SB 243, Chapter 677, Statutes of 2025, approved 2025-10-13, operative 2026-01-01 (not stated in the chaptered text; stated by the bill author's office on 2025-10-13 and by two secondary sources, Answer point 5), chaptered text read. Penalties: NY Attorney General up to $15,000 per day. CA private right of action, greater of actual damages or $1,000 per violation, plus fees (22605). | Fake-clock unit tests: (1) the notice renders at session start; it renders again at or before 3:00:00 of continuous use; a second session on the same day may skip the start notice only if the owner's record says so. (2) A crisis trigger phrase renders a referral that names 988 or a crisis text line. (3) With the known-minor flag set, the AI disclosure and the break reminder render, and the minors-suitability line is visible on the web and app entry. (4) `curl -s <site>/<protocol-page> \| grep -iE "suicid\|self-harm"` returns a page that describes the protocol. (5) `git grep -il "companion" -- docs adr .agents` finds the owner's scope record. Re-check both statutes yearly. | MUST (conditional) |

Reason for the change: the old text over-required the NY start notice, left out CA entirely, and called the NY date unverified. The old rule's note that "California SB 243 reportedly adds similar duties" is replaced by the read text. Three CA duties (22602(c)(1)-(2), 22604, 22603) have no NY equivalent, so the old claim that NY duties are "a superset" of the CA duties was wrong: the NY text has no known-minor duties and no publishing duty. Retire the C4 conflict row ("SB 243 is no rule input"). The UX-AI-05 line in Decay changes to "CA SB 243 Chapter 677 (2025-10-13) and NY S-3008C Part U (effective 2025-11-05), both read 2026-11-27".

**UX-AI-01: confirm; change only the Verdict clause in `ux-ai-features.md` point 2; rule text unchanged.** Verdict point 2's sentence "New York Part U requires a notice at the start and at least every three hours" becomes "New York Part U requires a notice at the start (once per day suffices) and at least every three hours in a continuing interaction". California 22602(a) adds a reasonable-person-misled test on top of the EU base, the same shape as Maine's. A first-turn AI statement in a `data-ai-disclosure` element satisfies it. Verification, two checks an agent can run:
1. Clause check: `grep -c "once per day suffices" .agents/research/ux-ai-features.md` must print `1` after the edit (it printed `0` on 2026-11-27 before it: `grep -n "once per day suffices" ux-ai-features.md` returned no line).
2. CA 22602(a) check, run today with `node t.mjs` (scratch `v/t.mjs`, the UX-AI-01 regex plus a persona rule: a surface with a human name or avatar must match the regex in its first turn). Output:
```
"You are chatting with an AI assistant." true ok
"Answers are generated by AI and can be wrong." true ok
"AI-powered search" false ok
"Try our AI features" false ok
"Hi, I'm Sam, your support teammate" false ok
persona=true "Hi, I'm Sam. You are chatting with an AI assistant." PASS
persona=true "Hi, I'm Sam." FAIL
persona=false "How can I help?" PASS
```
In the Playwright test for UX-AI-01, add the same assertion: if the page has a human name or photo near the chat (`img[alt], [data-persona]`), the first assistant message, read before the first reply is sent, must match the regex. The existing "human name voids the exception" clause already covers the rule text; this makes the 22602(a) reasonable-person case a failing test.

**UX-AI-24 (NEW).**

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AI-24 | If the owner confirms that a product gives a generative natural-language chat feature to users in New York, and the feature is not limited to customer service, research, technical assistance or internal use, then decide in writing whether it is a "covered AI companion" under NY GBL art. 48, effective 2027-01-01. If it is, and the operator can learn that a user is a minor, route the minor to a mode that has none of the twelve "unsafe AI companion features" in 1800(8) (human-claims, flattery or sycophancy, unprompted emotion questions, personal-health memory older than twelve hours) and put an age-assurance step in front. Agents do not write the age-assurance method. | LEGAL: S9051-B section 1 (GBL 1800-1805), section 3 "take effect January 1, 2027"; signed 2026-10-28 as Chapter 368 (nysenate.gov bill page, read 2026-11-27); penalty up to $25,000 per violation (1802(1)), read in the passed text, not a chaptered copy. | `git grep -il "article 48\|covered AI companion" -- docs adr .agents` finds the owner's scope record. Test: a session carrying the minor flag never receives an output matching the owner's list of unsafe-feature patterns, and the flag path exists in code (`git grep -nE "isMinor\|minor" <chat session module>` has hits). Re-check from 2026-12-31. | MUST (conditional) |

Fleet effect: dormant. Measurement run 2026-11-27: `cd /home/mherwig/dev && grep -rlE 'vscode\.lm\b|chatParticipants|languageModelTools|registerChatParticipant|@ai-sdk|useChat|kapa|inkeep|Ask AI' --include='*.ts' --include='*.tsx' --include='*.astro' --include='*.mjs' --include='package.json' grimoire-rs/vscode/src grimoire-rs/vscode/package.json ocx-sh/website/packages/theme/src ocx-sh/website/site/src grimoire-rs/grimoire/docs/src grimoire-rs/indexer/src ocx-sh/catalog/src grimoire-rs/grim-gui/src 2>&1 | wc -l` printed `0` (every path exists: a missing path would add an error line to the count). The fleet has no human-facing LLM surface. Add UX-AI-24 to the dormant list, and to "What an agent must ask a human": "Is the feature a covered AI companion under NY art. 48, and can the operator know a user is a minor?"

**UX-AI-06: confirm** (not touched). **Decay table:** add a row for UX-AI-24 (S9051-B, effective 2027-01-01, refresh 2026-12-31 and on the Attorney General's rulemaking under 1803).

## Dated facts

| Fact | Source | Date |
|---|---|---|
| NY S-3008C Part U s.3 (page 60, line 38): effective on the 180th day after becoming law | [legislation.nysenate.gov PDF](https://legislation.nysenate.gov/pdf/bills/2025/S3008C) | enacted 2025-05-09 |
| S-3008C signed 2025-05-09, "Chapter 58 of 2025", delivered 2025-05-08 | [nysenate.gov](https://www.nysenate.gov/legislation/bills/2025/S3008/amendment/C) | read 2026-11-27 |
| 180th day after 2025-05-09 | `date -d "2025-05-09 + 180 days" +%F` printed `2025-11-05` | computed 2026-11-27 |
| NY GBL art. 47 "took effect on November 5, 2025" | [Morrison Foerster](https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai), secondary | 2025-11-20 |
| NY GBL 1700-1704 text, revisions 2025-05-16 and 2025-11-07 | [nysenate.gov GBS 1702](https://www.nysenate.gov/legislation/laws/GBS/1702) (no effective-date note on the page) | read 2026-11-27 |
| CA SB 243 Chapter 677, approved and filed 2025-10-13 | [Sidley copy of the Legislative Counsel PDF](https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-sb243-companion-chatbots.pdf?la=en) | 2025-10-13 |
| CA reporting duty begins 2027-07-01 | same PDF, 22603(a) | 2025-10-13 |
| CA core duties effective 2026-01-01 | Morrison Foerster (secondary) and california.public.law (codified, "updated January 1, 2026") | 2025-11-20, verified 2026-11-23 |
| NY art. 48 (S9051-B) signed 2026-10-28, Chapter 368 | [nysenate.gov S9051 amendment B](https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B) (primary); [Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/11/new-york-enacts-ai-chatbot-safeguards-for-minors) (secondary, 2026-11-05) | read 2026-11-27 |
| NY art. 48 effective 2027-01-01; penalty up to $25,000 per violation (passed text) | [S9051-B PDF](https://legislation.nysenate.gov/pdf/bills/2025/S9051B) s.3 and 1802(1) | introduced 2026-01-27 |
| CA SB 243 "becomes law on January 1st, 2026" | [Sen. Padilla press release](https://sd18.senate.ca.gov/news/first-nation-ai-chatbot-safeguards-signed-law) | 2025-10-13 |
| CA regular-session statutes: "January 1 next following a 90-day period from the date of enactment" | [Gov. Code 9600(a)](https://california.public.law/codes/government_code_section_9600) and [FindLaw Art. IV s.8(c)](https://codes.findlaw.com/ca/constitution-of-the-state-of-california-1879/ca-const-art-iv-sect-8/) | read 2026-11-27 |
| 2025-10-13 + 90 days | `date -d "2025-10-13 + 90 days" +%F` printed `2026-01-11` | computed 2026-11-27 |

## What could not be determined

- **The Governor's own statement of the NY effective date.** The press release and letter sit behind a Cloudflare challenge (HTTP 403 by WebFetch and curl). Missing: a logged-in or browser-rendered fetch of `governor.ny.gov/news/governor-hochul-pens-letter-ai-companion-companies-notifying-them-safeguard-requirements-are`. The date does not depend on it, because the enacting clause and the signing date are primary.
- **The California operative date from a primary legal source that states the result.** The bill author's office and two law-firm or codification sources say 2026-01-01. The constitutional route is (c)(2) (passed before the joint recess, with the Governor after it), but a literal (c)(1) count gives 2027-01-01 (`date -d "2025-10-13 + 90 days" +%F` printed `2026-01-11`). Missing: the bill's passage and enrollment dates from leginfo (403 to curl and WebFetch) and the full text of Art. IV s.8(c)(2) (the fetch tool returned a paraphrase only). Until then the date is CORROBORATED.
- **A chaptered copy of S9051-B.** The signing date and Chapter 368 are now primary (nysenate.gov bill page), but the penalty and definitions were read in the as-passed PDF. Missing: the chaptered text (Laws of New York 2026, ch. 368).
- **Whether other 2026 states enacted chatbot disclosure laws.** Not searched in this round (wave 1's open question 3, second half).
- **Whether a typical docs or developer-tool feature falls outside "AI companion".** The exclusions read as above, but no court or Attorney General guidance was fetched. Scope stays the owner's decision.

## Sources

| URL | What | Date |
|---|---|---|
| https://legislation.nysenate.gov/pdf/bills/2025/S3008C | NY S-3008C Part U, art. 47 text and s.3 | 2025-05-09 |
| https://www.nysenate.gov/legislation/bills/2025/S3008/amendment/C | Bill actions: signed, Chapter 58 of 2025 | read 2026-11-27 |
| https://www.nysenate.gov/legislation/laws/GBS/1702 | GBL 1702 consolidated text | revision 2025-11-07 |
| https://www.nysenate.gov/legislation/laws/GBS/A47 | Article 47 page, no effective-date note | read 2026-11-27 |
| https://legislation.nysenate.gov/pdf/bills/2025/S9051B | NY S9051-B, art. 48 | introduced 2026-01-27 |
| https://www.nysenate.gov/legislation/bills/2025/S9051/amendment/B | S9051-B actions: signed chap.368, 2026-10-28 | read 2026-11-27 |
| https://sd18.senate.ca.gov/news/first-nation-ai-chatbot-safeguards-signed-law | Author's press release: effective January 1st, 2026 | 2025-10-13 |
| https://california.public.law/codes/government_code_section_9600 | Gov. Code 9600 | read 2026-11-27 |
| https://codes.findlaw.com/ca/constitution-of-the-state-of-california-1879/ca-const-art-iv-sect-8/ | CA Const. Art. IV s.8(c) (paraphrase for (c)(2)) | read 2026-11-27 |
| https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-sb243-companion-chatbots.pdf?la=en | Chaptered CA SB 243, Chapter 677 | 2025-10-13 |
| https://california.public.law/codes/business_and_professions_code_section_22602 | Codified B&P 22602 (also 22601, 22603, 22604, 22605 read) | updated 2026-01-01 |
| https://www.mofo.com/resources/insights/251120-new-york-and-california-enact-landmark-ai | Law-firm note on both laws (secondary) | 2025-11-20 |
| https://www.hklaw.com/en/insights/publications/2026/11/new-york-enacts-ai-chatbot-safeguards-for-minors | Law-firm note on art. 48 (secondary) | 2026-11-05 |

Scratch files: `~/.cache/research-lang/exemplars/product/wave2/q2/` (`s3008c.pdf`, `s3008c.txt`, `s9051b.pdf`, `s9051b.txt`, `sb243.pdf`, `sb243.txt`, `v/t.mjs`). Text extraction command: `uv run --no-project --with pypdf python -c "import pypdf; ..."`.
