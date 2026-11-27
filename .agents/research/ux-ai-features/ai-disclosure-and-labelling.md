---
title: "AI disclosure and labelling in human-facing LLM interfaces"
program: product
sub_program: ux
topic: ux-ai-features
worker: ai-disclosure-and-labelling
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
scope: >
  Covers what a product that puts an LLM in front of a human must disclose (AI interaction), how it must mark
  generated output, how the label must be accessible, and which of these are EU law as of 2026-11-27.
  Legal rule rows rest only on Official Journal text read this session (Regulation (EU) 2024/1689 and the AI omnibus
  Regulation (EU) 2026/1744). Not covered: marketing posts and videos and generated release notes (marketing),
  generated docs (docs-quality DOC-PLAIN-22), non-EU law (US state laws, China), deepfake production workflows.
---

# AI disclosure and labelling in human-facing LLM interfaces

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Article 50 of Regulation (EU) 2024/1689 has applied since 2 August 2026 (Art. 113 as read in the OJ text; the omnibus did not move it). Today (2026-11-27) it is live law.
- Art. 50(1): a provider must design an AI system that interacts directly with people so the person is informed it is an AI system, unless that is obvious to a reasonably well-informed, observant and circumspect person.
- The Commission guidelines (C(2026) 7702 final, 5 Nov 2026) read the "obvious" exception restrictively and list "coding agents" as in scope of 50(1). They are a Commission interpretation, not binding law, and were not read in the OJ.
- Art. 50(2): a provider of a system generating synthetic audio, image, video or text must mark outputs in a machine-readable format and make them detectable. This is a provider duty, not a UI-label duty.
- Systems already on the market before 2 August 2026 have until 2 December 2026 for Art. 50(2) only (Art. 111(4) as inserted by the omnibus). That date is five days after this research.
- Art. 50(5): the information must be clear, distinguishable, given at the latest at first interaction or exposure, and conform to the applicable accessibility requirements. Art. 50 adds no accessibility rules of its own (guidelines para 144).
- Art. 50(4) deployer duties (deep fakes; AI text published to inform the public on matters of public interest) apply to content shown or published, with an editorial-review exemption for text.
- Per the guidelines, source code, short strings (single words, alt-text, UI labels) and machine-to-machine output are outside Art. 50(2) marking; chat prose is not.
- Fines for Art. 50 breaches reach EUR 15 000 000 or 3 % of worldwide annual turnover, whichever is higher (Art. 99(4)(g) in the OJ text); the omnibus adds a lower-of rule for small mid-caps (Art. 99(6a)).
- Carbon for AI (IBM, page dated 12 Aug 2026) is the only design-system source found that turns disclosure into components: one AI label per AI region, a popover for explainability, and a "revert to AI" control after human edit.
- Measured on this machine: Codex CLI ships a "Codex can make mistakes" string and a `Co-authored-by: Codex` trailer; Claude Code attributes commits by default and lets users switch it off; opencode showed neither string. Static HTML cannot show whether a docs-chat widget is accessible.
- A machine-readable text mark (watermark, metadata) is a provider-side engineering and legal decision; an agent building a product on top of a third-party model must ask, not invent one.

## Findings

### 1. What the law says (read in the Official Journal text)

Source: Regulation (EU) 2024/1689, fetched via the Cellar route `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32024R1689` on 2026-11-27 (HTTP 200, 1 262 391 bytes; [source](https://publications.europa.eu/resource/celex/32024R1689)). The Cellar copy is the original 13 June 2024 text, not a consolidated version, so every amendment below comes from the omnibus.

| Provision | What the OJ text says (condensed, quoted words in quotes) | Who |
|---|---|---|
| Art. 50(1) | Providers "shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system, unless this is obvious from the point of view of a natural person who is reasonably well-informed, observant and circumspect, taking into account the circumstances and the context of use." | Provider |
| Art. 50(2) | Providers of AI systems "generating synthetic audio, image, video or text content" "shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated." Solutions must be "effective, interoperable, robust and reliable as far as this is technically feasible." No duty where the system performs "an assistive function for standard editing" or does "not substantially alter the input data provided by the deployer or the semantics thereof." | Provider |
| Art. 50(3) | Deployers of emotion recognition or biometric categorisation systems must inform exposed persons. | Deployer |
| Art. 50(4) | Deployers of a system generating or manipulating image, audio or video constituting a deep fake "shall disclose that the content has been artificially generated or manipulated" (lighter duty for evidently artistic, creative, satirical or fictional work). Deployers of a system generating or manipulating text "published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated"; not where the text "has undergone a process of human review or editorial control" and a person "holds editorial responsibility." | Deployer |
| Art. 50(5) | Information "shall be provided ... in a clear and distinguishable manner at the latest at the time of the first interaction or exposure. The information shall conform to the applicable accessibility requirements." | Both |
| Art. 3(3), 3(4) | Provider: develops an AI system (or has it developed) and puts it into service "under its own name or trademark, whether for payment or free of charge." Deployer: uses an AI system "under its authority" except in "a personal non-professional activity." | Definitions |
| Art. 3(60) | Deep fake: AI-generated or manipulated image, audio or video that "resembles existing persons, objects, places, entities or events and would falsely appear to a person to be authentic or truthful." Text is not a deep fake. | Definition |
| Art. 113 | Regulation "shall apply from 2 August 2026" with carve-outs for Chapters I-II (2 Feb 2025), certain chapters (2 Aug 2025) and Art. 6(1) (2 Aug 2027). Art. 50 is in none of the carve-outs, so it applies 2 Aug 2026. | Dates |
| Art. 99(4)(g) | Non-compliance with Art. 50 transparency obligations: fines "up to EUR 15 000 000 or, if the offender is an undertaking, up to 3 % of its total worldwide annual turnover ... whichever is higher." | Penalty |

Key reading for a product team: a team that ships an assistant under its own name or trademark is a **provider** for Art. 50(1) and 50(2), even when the model is a third party's API. The guidelines say the same (a company providing a chatbot, image generator or AI agent under its own name is the provider; guidelines PDF, [source](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). Whether a given product is a provider is a legal call (see "must not decide alone").

### 2. The AI omnibus: what changed for Article 50

Source: Regulation (EU) 2026/1744 of 8 July 2026, OJ L, 24.7.2026, fetched via `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32026R1744` on 2026-11-27 (HTTP 200). The CELEX number was derived from the identifier `OJ:L_202601744` in the Commission news page ([source](https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force)); the OJ header confirms "REGULATION (EU) 2026/1744 ... of 8 July 2026 ... (Digital Omnibus on AI)". It enters into force "on the third day following that of its publication" (Art. 4), which is consistent with the Commission page's 27 July 2026.

Every change touching Article 50 or its dates (read in full in the OJ text):

| Change | Text | Effect |
|---|---|---|
| Art. 50(7) replaced (omnibus Art. 1 point 20) | The Commission "shall encourage and facilitate" codes of practice on "detection, marking and labelling"; it "shall assess whether adherence to those codes ... is adequate to ensure compliance with the obligations laid down in paragraphs 2 and 4" under Art. 56(6); if inadequate it "may adopt an implementing act specifying common rules." | Codes need an adequacy assessment, not an implementing act. Adherence is evidence of compliance, not a presumption of conformity (recital 41). |
| Art. 111(4) added (point 39(b)) | Providers of AI systems "generating synthetic audio, image, video or text content, that have been placed on the market before 2 August 2026 shall take the necessary steps in order to comply with Article 50(2) by 2 December 2026." Recital 38 calls this "a transitional period of four months." | Grace period for Art. 50(2) marking only, and only for systems already on the market before 2 Aug 2026. Art. 50(1), (3), (4), (5) have no grace. |
| Art. 99 (point 38) | New paragraph 6a: for small mid-caps each fine "shall be up to the percentages or amount referred therein, whichever is lower." | Fine cap rule for SMCs (applies to Art. 99(4), including 50). |
| Art. 113 (point 40) | Dates for Chapter III high-risk rules moved to 2 Dec 2027 (Annex III) and 2 Aug 2028 (Annex I); Art. 5 additions apply from 2 Dec 2026. | Does not change Art. 50 application. |

No other change to Art. 50(1)-(6) text was found in the 147 530-word omnibus text (search for "Article 50" returned six hits: recitals 38 and 41, point 20, point 39(b), and two unrelated amendments to Regulation (EU) 2018/1139 and its Art. 50).

### 3. Commission guidance (interpretation, not law)

- **Guidelines.** The PDF header reads "Brussels, 5.11.2026 C(2026) 7702 final, COMMUNICATION FROM THE COMMISSION, Guidelines on the implementation of the transparency obligations for certain AI systems under Article 50" (51 pages, fetched from [ec.europa.eu](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). The library page shows "Publication 20 July 2026, Last update 5 November 2026" ([page](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems)); a law-firm summary says the final guidelines were published on 20 July 2026 ([DLA Piper, 10 Aug 2026, secondary](https://www.dlapiper.com/en-ar/insights/publications/2026/08/the-eus-new-guidelines-on-ai-transparency)). The 5 Nov 2026 PDF is the text read. No OJ C citation was found.
- **Four cumulative elements for Art. 50(1)** (para 30): an AI system; intended to interact; directly; with natural persons. Backend machine-to-machine calls are excluded (para 30). In-scope examples include "coding agents and other AI agents capable of directly interacting with natural persons."
- **Obvious exception** (paras 42-45): "interpreted restrictively"; "general awareness of consumers ... that AI systems (including chatbots and agents) exist does not imply that they recognise them in interactions." A professional or specialised audience without exposure to vulnerable groups can raise the expected level of awareness; a general-public audience lowers it. Human-looking avatars, profile pictures and human-sounding voices reduce obviousness.
- **Format** (para 37): "multimodal and accessible disclosure approaches is recommended as a best practice"; plain-language labels or banners (example "You are interacting with an AI system"), first-turn greetings, optional persistent badges, placement "close to the interaction interface (e.g. near the input/output field)", simplified wording for low-literacy users and children; spoken statement at the start of voice interactions; audio cues alone are "not considered sufficient."
- **Timing** (para 40): "A single, prominent notification before the first interaction ... is likely to suffice in most instances"; periodic reminders and context-aware disclosures are "likely to be necessary" for vulnerable persons, sustained or emotionally sensitive interactions, and role changes.
- **Agents** (para 31): agents "must be designed and developed in such a way that they disclose both their artificial nature and the person on whose behalf they are acting."
- **Marking scope** (para 68): outside Art. 50(2) are short sequences ("single words, image captions, alt-text, UI labels"), source code ("content written in a programming, scripting, markup, query or configuration language", including "natural-language comments ... that form an integral part of the source code", SDKs, SQL, infrastructure-as-code, YAML, JSON, scripts), and machine-to-machine output.
- **Standard editing** (paras 90-92): "small edits to improve readability and grammar, quality and format" are exempt; changes that affect "meaning, style or intent" are not.
- **Accessibility** (para 144): Art. 50 "does not impose distinct or additional accessibility requirements"; providers must "assess whether their product, service or content needs to comply" with Directive 2016/2102 and Directive 2019/882 and ensure the Art. 50 information is accessible under those rules.
- **Code of practice.** Final version published 10 June 2026; two sections: providers (marking and detection of audio, image, video, text) and deployers (labelling deep fakes and AI text of public interest); Annex I offers "an optional EU icon in three variants"; voluntary; about 190 signatories by end of July 2026 (vendor-neutral Commission pages: [policy page](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content), [news](https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content), [FAQ](https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content)). The code's technical commitments (metadata, imperceptible watermark, short-text exception, detection tool) appeared only in a search-result summary; the Commission pages fetched do not state them. They are **UNVERIFIED** and sit only in the dated-facts table.

### 4. Design-system practice: Carbon for AI

[Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/) (IBM, "last updated Aug 12, 2026"; AI style, components and chat marked "Stable"; the AI label was formerly "AI Slug", rename pending in code and Figma) says: mark every AI instance with the AI label ("the primary indicator"); use the label as the entry to explainability, shown "only when needed or requested" via a popover; use the provided component so the label is accessible in light and dark themes; keep glow and gradient "limited and subtle to ensure accessible contrast"; do not use the AI styling as decoration; when a user edits AI-suggested content the component reverts to the default variant and offers a "revert to AI" button. This is vendor design guidance (IBM), not law; it is the closest thing to a checkable component contract.

### 5. Measurement: developer-product AI features (commands inline)

The commission asked for 10. Seven were measured and one disclosure statement was read; two (Cursor chat, VS Code Copilot chat) need a signed-in client and were not measured. All measurements are of static artefacts on this machine on 2026-11-27, not of live interaction.

| # | Feature | Where / when AI is disclosed | Label accessible? | Generated output marked? | Command |
|---|---|---|---|---|---|
| 1 | Claude Code CLI 2.1.332 | Product name is the product; no disclosure string measured (interactive session not driven) | Not measured | Commit and PR attribution on by default; `"commit": ""` disables it. Binary contains `Generated with [Claude Code](...)` | `claude --version`; `python3 -I` over `claude-code-settings.schema.json` printing `properties.attribution`; `grep -a -o 'Generated with \[\?Claude Code' $(readlink -f ~/.local/bin/claude)` |
| 2 | Claude Code VS Code extension 2.1.330 | Not measured | `grep -o 'aria-label...' webview/index.js` returned 0 for the chat UI; `aria-live` hits (6) are all bundled Monaco status and quick-input code. Inconclusive | Same attribution setting as #1 | `grep -c 'aria-live\|role="log"' webview/index.js` |
| 3 | Codex CLI 0.172.0 | Binary contains "Codex can make mistakes  Review the code it writes and commands it runs" (likely onboarding or banner text; position not driven) | Not measured | Binary contains `Co-authored-by: Codex <noreply@openai.com>` and `Generated with [Codex](https://ope...` | `grep -a -o -i 'co-authored-by: [^"\\]\{0,60\}' $(readlink -f ~/.local/bin/codex)` |
| 4 | opencode v2.3.2 | No match for "can make mistakes" in the binary | Not measured | No `Co-authored-by` or "Generated with opencode" match. Absence in a compiled binary by grep is weak evidence | same greps on `$(readlink -f $(which opencode))` |
| 5 | Stripe docs "Ask AI" | Visible text "Ask AI" on a `role="button" tabindex="0"` element; icon `aria-hidden="true"` (label has text, not icon-only) | Entry control yes; chat panel is JS-rendered, not measured | Not measured | `curl -sL -A "Mozilla/5.0" https://docs.stripe.com` then `grep -o -i '.\{120\}ask ai.\{160\}'` |
| 6 | Vercel docs "Ask AI" | Visible text "Ask AI" in a React-Aria button | Entry control yes; panel not measured | Not measured | same on `https://vercel.com/docs` |
| 7 | Docker docs chat | Only `aria-label="Close chat"` in static HTML; no AI term in the static page | Close control labelled; rest not measured | Not measured | same on `https://docs.docker.com`; `grep -o 'aria-label="[^"]*chat[^"]*"'` |
| 8 | GitHub Copilot Chat (docs statement only) | Page states "AI might still make mistakes. The outputs generated may be inaccurate, incomplete, biased, misaligned, or irrelevant" (vendor docs, not in-UI measurement) | n/a | n/a | `curl` of `https://docs.github.com/en/copilot/responsible-use/chat-in-your-ide`; `grep -o 'AI might still make mistakes'` |

Reading of the table: (a) the only measurable output-marking in developer tools is commit attribution (Claude Code, Codex), which is a visible trailer, not the machine-readable mark Art. 50(2) describes, and git commit text is source-adjacent content that the guidelines would treat as outside marking at most arguably (not stated; do not rely on it). (b) The docs-chat entry points use a plain text "Ask AI" label rather than an icon-only control, which is the accessible shape. (c) No measurement found a persistent AI badge or a "you are talking to an AI" first-turn message; for a developer-only audience that may satisfy the "obvious" exception, but the guidelines say to assess audience including foreseeable public access.

## Normative guidance candidates

Rows marked LEGAL rest on OJ text read this session. Rows marked DESIGN rest on Commission guidelines, Carbon, WCAG or measurement and are never to be described to a user as "required by law."

| # | Rule | Rationale | Severity | Verification |
|---|---|---|---|---|
| D1 (LEGAL, Art. 50(1), 50(5)) | A product that lets a person converse with an LLM under the team's own name MUST tell the person, at the latest at first interaction, that they are talking to an AI system, unless the team has recorded an audience assessment showing it is obvious to a reasonably well-informed, observant and circumspect member of every foreseeable audience. | Provider duty with fines to EUR 15 000 000 or 3 % turnover. | MUST | Open the product signed out, fresh profile. Pass: text "AI" (or equivalent) is visible in the viewport before the first message is sent. Fail: the first turn is a model response with no AI statement and no recorded obviousness assessment in the repo (`grep -ril "obvious" docs/ ADR/`). |
| D2 (LEGAL, Art. 50(5)) | The disclosure MUST be clear and distinguishable: text in the same viewport as the input or first response, not only in a tooltip, terms page or footer. | "Clear and distinguishable" is in the OJ text; hover-only text is not reachable by touch or keyboard. | MUST | Reading heuristic: pass = a sighted user without hover or scroll sees it; fail = it needs hover, a click, or a scroll to find. |
| D3 (LEGAL, Art. 50(5)) | The disclosure MUST be perceivable by assistive technology (see A1-A3). | Art. 50(5) requires conformity with applicable accessibility requirements. | MUST | See A1-A3. |
| D4 (DESIGN, guidelines para 37) | SHOULD place a persistent badge or label near the input/output field and repeat disclosure on role change, voice start, or sensitive contexts (health, finance, legal, companionship, minors). | The guidelines treat one notice as "likely" enough in most instances and periodic reminders as "likely" necessary in risk contexts. | SHOULD | Pass: `grep -rn "AI" src/components/Chat*` shows a persistent label component rendered in the chat layout, not only in an onboarding route. |
| D5 (DESIGN, guidelines para 31) | An agent that acts toward other people (emails, bookings, purchases) SHOULD state it is an AI and name the person it acts for in the first message. | Guidelines require both facts for agents. | SHOULD | Read the first outbound message template; pass contains both "AI" and the principal's name. |
| D6 (DESIGN) | A human-persona presentation (human name, face photo, human voice) MUST NOT be used for an AI assistant without D1 disclosure. | The guidelines list human-like cues as reducing obviousness. | MUST | `grep -rniE "avatar|profile.?photo|persona" src/` then confirm each human-like asset sits next to the D1 label. |
| M1 (LEGAL, Art. 50(2)) | If the team is the provider of a system that generates audio, image, video or text for people, it MUST ensure outputs are machine-readably marked and detectable, unless an Art. 50(2) exception applies, and Systems on the market before 2 Aug 2026 MUST comply by 2 Dec 2026. | OJ text and Art. 111(4). | MUST (provider) | The mark is a provider engineering decision; verification is a recorded decision plus a detection method. Agent action: do not invent one (see "must not decide alone"); flag the gap as a blocking question. |
| M2 (DESIGN, guidelines para 68) | When classifying generated content for M1, treat source code, config files, JSON/YAML/SQL, and short strings (single words, alt-text, UI labels, captions) as outside marking, and chat prose, summaries, and generated documents as inside. | Prevents over-marking code and under-marking prose. | SHOULD | Reading heuristic: pass = a classification table in the design doc lists each generated output type with in/out and the paragraph cited; fail = "all AI output" or "none" with no table. |
| M3 (DESIGN, Carbon) | Where AI-generated text is shown for a person to review or edit (suggested replies, drafts, form prefill), SHOULD mark each region with the AI label, switch to the default variant after a human edit, and offer "revert to AI." | Keeps provenance honest at region level. | SHOULD | Edit a prefilled field. Pass: the AI label disappears on edit and a revert control appears; fail: label stays or the original is lost. |
| M4 (LEGAL, Art. 50(4)) | A feature that publishes AI-generated text on a matter of public interest, or an AI deep fake image, audio or video of a real person, place or event, MUST show a disclosure at the content, unless text has human editorial review with a named responsible person. | Deployer duty. | MUST | Grep the publish path for the disclosure string; pass = rendered with the content, fail = only in the generating tool. |
| A1 (DESIGN, WCAG 2.2 SC 4.1.3 AA) | The AI label and any disclosure text MUST be real text exposed to the accessibility tree, not an image, CSS `content`, or colour or icon alone. | Screen-reader users must receive it; Art. 50(5). | MUST | `grep -rn 'aria-hidden' <label component>`; fail if the only AI-carrying node is `aria-hidden` or an `<svg>` without `<title>` or an adjacent text. axe-core rule `image-alt`/`svg-img-alt` on the page must pass. |
| A2 (DESIGN, WCAG 2.2 SC 4.1.3, MDN `aria-live`) | Streaming or newly added AI messages SHOULD arrive in a live region that exists empty at page load with `aria-live="polite"`; MUST NOT use `assertive` for routine tokens. | Content added after the accessibility tree is built "may not be noticed"; `assertive` "may disorient users." | SHOULD | `grep -rnE 'aria-live|role="log"' src/` finds the container in the initial markup; `grep -n 'assertive'` over chat code returns no streaming path. |
| A3 (DESIGN) | The AI label MUST NOT carry meaning by colour alone and its glow or gradient MUST NOT reduce text contrast below the project's WCAG 2.2 AA thresholds. | Carbon limits glow "to ensure accessible contrast"; use text alongside colour. | MUST | Run axe-core `color-contrast`; grep CSS for the AI-label class and confirm a text node exists. |
| A4 (DESIGN, guidelines para 37) | Voice or audio-only interfaces MUST begin with a spoken statement; a tone alone MUST NOT count as disclosure. | Guidelines: audio cues "not considered sufficient." | MUST | Read the first audio string of the voice flow. |
| E1 (DESIGN, Carbon) | Explanations of how the AI works SHOULD be on request (popover or link from the label), not inline in every message. | Avoids label fatigue; Carbon: "show explanations only when needed or requested." | CONSIDER | Pass: label opens a popover with model, data use and a feedback link; fail: a paragraph precedes every response. |
| E2 (DESIGN, measurement #1, #3) | An AI tool that writes to a user's repository or messages on their behalf SHOULD attribute the output by default and make opting out explicit and documented. | Both shipped CLIs default to attribution; hidden opt-out defaults remove provenance. | SHOULD | Read the commit-message generator; pass = trailer or footer present by default and a documented setting disables it. |

## Dated facts

| Fact | Source URL | Date the source states | Source type |
|---|---|---|---|
| Regulation (EU) 2024/1689 applies from 2 Aug 2026 except listed chapters; Art. 50 is within the general date | https://publications.europa.eu/resource/celex/32024R1689 (Art. 113) | Done at Brussels 13 June 2024 | Authority (OJ text) |
| Art. 50(1)-(5) text as in the section above | same | 13 June 2024 | Authority |
| Fine ceiling EUR 15 000 000 or 3 % turnover for Art. 50 breaches (Art. 99(4)(g)) | same | 13 June 2024 | Authority |
| Regulation (EU) 2026/1744 (Digital Omnibus on AI), signed 8 Jul 2026, OJ L 24.7.2026; in force third day after publication | https://publications.europa.eu/resource/celex/32026R1744 | 8 July 2026 / 24.7.2026 | Authority (OJ text) |
| Art. 111(4): providers of generative systems on the market before 2 Aug 2026 must comply with Art. 50(2) by 2 Dec 2026 | same | 8 July 2026 | Authority |
| Art. 50(7) replaced: codes of practice assessed under Art. 56(6); no approving implementing act | same | 8 July 2026 | Authority |
| Omnibus in force 27 Jul 2026 (Commission news; last updated 31 Jul 2026) | https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force | 27 July 2026 | Authority (Commission) |
| Final Code of Practice on transparency of AI-generated content published 10 Jun 2026; voluntary; about 190 signatories by end of July 2026; optional EU icon in three variants | https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content ; https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content | 10 June 2026 | Authority (Commission) |
| Code technical commitments: metadata where format supports it; imperceptible watermark except very short text; detection tool; non-removable marks. **UNVERIFIED**: only in a search-result summary; Commission pages fetched do not state them | search summary only (no fetched page) | n/a | Not read |
| Guidelines C(2026) 7702 final, Brussels 5.11.2026; Commission library page shows publication 20 Jul 2026, last update 5 Nov 2026 | https://ec.europa.eu/newsroom/dae/redirection/document/131215 ; https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems | 5 Nov 2026 / 20 Jul 2026 | Authority (non-binding interpretation) |
| Guidelines: coding agents in scope of Art. 50(1); source code and short strings outside Art. 50(2) | PDF above, paras 30, 68 | 5 Nov 2026 | Authority (interpretation) |
| Guidelines: Art. 50 imposes no additional accessibility rules; applicable rules include Directives (EU) 2016/2102 and (EU) 2019/882 | PDF above, para 144 | 5 Nov 2026 | Authority (interpretation) |
| Whether Directive (EU) 2019/882 (European Accessibility Act) applies to a given product and from which date | not fetched | n/a | **UNVERIFIED**; named in the guidelines only; the application date was not read this session |
| Carbon for AI: AI label, popover explainability, revert to AI, "Stable" status | https://carbondesignsystem.com/guidelines/carbon-for-ai/ | last updated 12 Aug 2026 | Vendor design guidance (IBM) |
| WCAG 2.2 SC 4.1.3 Status Messages, Level AA | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 2.2 (page undated) | Authority (W3C) |
| MDN: `aria-live` polite vs assertive; screen readers may miss content added after the accessibility tree is built | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live | undated | Independent reference |
| Law-firm summary of guidelines: coding assistants for professional developers "likely" qualify as obvious; companions and consumer helpdesks do not | https://www.dlapiper.com/en-ar/insights/publications/2026/08/the-eus-new-guidelines-on-ai-transparency | 10 Aug 2026 | Independent (law firm); not checked against the PDF paragraph, so **UNVERIFIED** as a Commission statement |
| GitHub docs: "AI might still make mistakes ..." | https://docs.github.com/en/copilot/responsible-use/chat-in-your-ide | undated | Vendor data |

Re-check dates: re-read Art. 50 and the omnibus text after any corrigendum or consolidated-text publication; re-check on **2026-12-03** (the day after the 2 Dec 2026 grace date) and again on **2027-02-01**, then each quarter. Re-check the code of practice commitments once the full text is fetched.

## What an agent must not decide alone

- Whether the team is a **provider** or **deployer** for a given feature (own name or trademark, third-party model, white-label). It decides which of Art. 50(1)/(2)/(4) apply.
- Whether the "obvious" exception applies. It needs a recorded audience assessment and a legal sign-off. The default is to disclose.
- The machine-readable marking technique for generated text, image, audio or video (metadata, watermark, provenance, logging, fingerprint), and whether to sign the code of practice.
- Whether a generated text is "published to inform the public on matters of public interest" and whether editorial review and a named responsible person exist.
- Whether output counts as a deep fake.
- Disclosure wording and brand voice for the label; legal text of terms; any claim to users that the product "complies with the EU AI Act."
- Whether non-EU law (other jurisdictions) applies. Not researched here.

## AI-agent angle

| Typical agent mistake | Cheap mechanical check |
|---|---|
| Treats a footer line ("AI may make mistakes") as disclosure | D2: grep the disclosure string; its container must be in the chat layout, not `<footer>` |
| Uses an icon-only sparkle button as the AI label | A1: grep the label component for a text node or `aria-label`; axe `button-name` |
| Puts `aria-live="assertive"` on a streaming message list, or injects the live region together with its first content | A2: `grep -n assertive`; confirm container in the initial HTML |
| Writes "Required by the EU AI Act" for a design rule from Carbon or the guidelines | Grep the generated copy and comments for "AI Act" and `Art\.\s*50`; each hit must map to an LEGAL row |
| Invents a text "watermark" (zero-width characters) to claim Art. 50(2) compliance | Grep for `\u200b`, `\u200c`, `\u2060` in generation code; zero-width marks need a human decision (M1) |
| Over-marks code: appends "AI-generated" comment headers to generated source | Guidelines para 68 puts source code outside marking; grep generated files for the header |
| Assumes disclosure only before launch, never for returning users or role changes | D4: check the label is a persistent component, not a one-time modal |
| Labels everything AI, including grammar fixes | M2: classification table; "standard editing" is exempt (guidelines paras 90-92) |
| Trusts training data on dates (Art. 50 "applies Aug 2026", no grace) | Check against Dated facts: the 2 Dec 2026 grace is for Art. 50(2) only |

## Contested / evolving

- **Does a developer-facing coding assistant fall under the "obvious" exception?** The guidelines list coding agents inside Art. 50(1) scope and say the exception is restrictive and audience-dependent ([guidelines paras 30, 45](https://ec.europa.eu/newsroom/dae/redirection/document/131215)). A law-firm summary says a code assistant for professional developers likely qualifies ([DLA Piper](https://www.dlapiper.com/en-ar/insights/publications/2026/08/the-eus-new-guidelines-on-ai-transparency)). Both sides agree it turns on the audience; the PDF paragraph naming that example was not found by the keyword search, so treat the claim as unverified. Trend: the Commission leans strict. The safe default is to disclose.
- **One-time notice versus persistent label.** The guidelines call a single prominent notice "likely" sufficient in most instances and periodic reminders "likely" necessary in risk contexts (para 40); Carbon treats the label as always present on AI components. Position here: persistent label (D4), because the cost is a few pixels.
- **Is the code of practice a safe harbour?** The omnibus recital 41 says codes "do not grant a presumption of conformity"; the guidelines say adherence is "a straightforward, predictable, and legally certain way" and may mitigate fines (paras 146-149). Both say it is evidence, not immunity.
- **Machine-readable marking of text.** The OJ text requires it "as far as this is technically feasible"; the code's short-text exception and watermark details were not verified. Trend: provider-side marking is moving into model APIs; application teams should ask their provider before building their own.
- **Accessibility source of truth.** Art. 50(5) points to "applicable accessibility requirements"; the guidelines point to two directives and add nothing. Whether those directives bind a given product is a legal question (UNVERIFIED here).

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://publications.europa.eu/resource/celex/32024R1689 | Regulation (EU) 2024/1689, OJ text (primary) | 13 Jun 2024 | Art. 3, 50, 99, 113 read verbatim |
| https://publications.europa.eu/resource/celex/32026R1744 | Regulation (EU) 2026/1744, AI omnibus, OJ text (primary) | 8 Jul 2026, OJ 24.7.2026 | Art. 50(7), 111(4), 99(6a), 113 amendments |
| https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force | Commission notice on omnibus (primary) | 27 Jul 2026, updated 31 Jul 2026 | In-force date; OJ identifier |
| https://ec.europa.eu/newsroom/dae/redirection/document/131215 | Guidelines C(2026) 7702 final (primary, non-binding) | 5 Nov 2026 | Scope, obvious exception, formats, source-code exclusion |
| https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems | Commission library page for the guidelines (primary) | 20 Jul 2026, updated 5 Nov 2026 | Dates and status |
| https://digital-strategy.ec.europa.eu/policies/guidelines-transparency-ai-generated-content | Commission policy page for the guidelines (primary) | updated 25 Nov 2026 | Scope summary and enforcement bodies |
| https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content | Code of practice page (primary) | 10 Jun 2026 | Timeline, structure, signatories |
| https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content | Commission news on the code (primary) | 10 Jun 2026 | Voluntary status |
| https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content | Code of practice FAQ (primary) | undated | EU icon, sections |
| https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act | Article 50 FAQ (primary) | 2026 (undated) | Provider and deployer, timing summary |
| https://digital-strategy.ec.europa.eu/en/news/supporting-implementation-ai-act-clear-guidelines | Commission news listing guidelines (primary) | 4 Dec 2025, updated 31 Jul 2026 | Index of guidelines |
| https://carbondesignsystem.com/guidelines/carbon-for-ai/ | Carbon for AI (vendor design system) | 12 Aug 2026 | AI label, explainability, revert to AI |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 2.2 SC 4.1.3 (primary standard) | WCAG 2.2 | Status messages for streamed content |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live | MDN aria-live reference | undated | Polite vs assertive, empty live region |
| https://www.dlapiper.com/en-ar/insights/publications/2026/08/the-eus-new-guidelines-on-ai-transparency | Law-firm summary (secondary) | 10 Aug 2026 | Developer-assistant reading, flagged contested |
| https://docs.github.com/en/copilot/responsible-use/chat-in-your-ide | GitHub Copilot responsible-use page (vendor) | undated | In-docs AI disclaimer |
| https://docs.stripe.com, https://vercel.com/docs, https://docs.docker.com | Docs sites with AI chat entry points (measured, static HTML) | fetched 2026-11-27 | Label shape measurement |
| Local binaries and `claude-code-settings.schema.json` of Claude Code 2.1.332/2.1.330, Codex CLI 0.172.0, opencode v2.3.2 | Measured artefacts | 2026-11-27 | Attribution defaults and disclaimer strings |

Scratch (not committed): `~/.cache/research-lang/exemplars/product/aia/` holds the fetched OJ XHTML, the guidelines PDF text and the docs-page HTML.
