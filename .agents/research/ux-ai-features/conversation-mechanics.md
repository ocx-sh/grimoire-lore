---
title: "Conversation mechanics for chat and agent UIs: tool states, stop/regenerate, streamed announcements, failure hand-back, memory, empty-chat hints"
program: product
sub_program: ux
topic: ux-ai-features
worker: conversation-mechanics
agent: conversation-mechanics
model: sonnet
date_researched: 2026-11-27
sources_fetched: 22
sources_count: 23
scope: |
  Covers the interaction mechanics of human-facing chat and agent UIs: tool-call render states, stop and regenerate, how streamed text reaches assistive technology (measured), failure and hand-back, memory controls, capability hints in empty chats, and the AI-disclosure duties that are law as of 2026-11-27.
  Does not cover discrete status announcements (UX-A11Y announcements-and-motion), prompt engineering, or model safety policy. Marketing and channel questions are out of scope.
---

# Conversation mechanics

Scout rows AI2, AI11, AI27-29, AI31, AI32, PR47 and M167-M173 were named by the commission. No row text was located by grep in `ux-topic-map/` (the IDs are not literal strings there), so this artifact starts from the commission's primary-source list and does not claim to reproduce those rows.

## Table of contents

1. Summary
2. Findings (F1 tool render states, F2 stop and regenerate, F3 streamed announcements: measurement, F4 failure and hand-back, F5 memory, F6 capability hints, F7 what is law)
3. Normative guidance candidates
4. What an agent must not decide alone
5. Dated facts
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- A tool part has seven states; a renderer that handles only `input-available` and `output-available` silently drops approval, denial and error. Handle all seven.
- Enable Stop only while status is `submitted` or `streaming`; enable Regenerate only while `ready` or `error`.
- Per-token live-region updates produced 500 announcements per 500 streamed words in a virtual screen reader; per-sentence produced 50; on-completion produced 1.
- Announcing only on completion leaves the whole response unannounced unless the user navigates to it. A status line is not the content.
- Streamed text belongs in a non-live container; announce by sentence into a `role="log"` region, or announce completion and let the user read the message. Pick one, do not do both.
- Never render raw server error text from a failed tool or stream to the user by default; the AI SDK masks it as "An error occurred." and says to replace it with a safe message.
- A failure state must say what could not be done, why in one clause, and offer a next path (retry, manual control, alternative).
- Memory UI needs five controls: view, edit/delete, reset in one step, scope, and a temporary (no-memory) mode, plus a visible "saved" notice.
- Empty chats show three to six contextual, editable suggestions; never suggestions that trigger consequential actions without a preview.
- Chatbot disclosure is law in the EU from 2026-08-02 (Article 50(1)) unless obvious; New York (Part U of S-3008C, in force since about 2025-11-05) requires a not-human notice at the start of an AI companion interaction and at least every three hours; California SB 243 adds duties for companion chatbots (secondary source only).
- Machine-readable marking of AI-generated output (Article 50(2)) has a later date, 2026-12-02, only for systems placed on the market before 2026-08-02 (Commission Art. 111 text, read).
- Primary statute text was read for EU Art. 113 and 111 (Service Desk), Utah SB 226 and SB 332 (enrolled PDFs) and New York S-3008C; Maine is read from the statute page. California SB 243 text returned 403 and stays secondary (FPF).

## Findings

### F1. Tool-call render states

The AI SDK documents seven `state` values on typed tool parts ([AI SDK tool usage, undated page](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage), platform docs; streaming "enabled by default in AI SDK 5.0"):

| State | Render |
|---|---|
| `input-streaming` | Loading text, or partial input |
| `input-available` | Pending message; for user-interaction tools show input plus action buttons |
| `approval-requested` | Approve and Deny buttons, with `approval.requestReason`; automatic decisions (`part.approval.isAutomatic`) show status only |
| `approval-responded` | Show approved or denied, and `reason` |
| `output-available` | Show `part.output` |
| `output-error` | Show `part.errorText` (or a redacted message) |
| `output-denied` | Show a denial message |

The page says to handle the approval states and `output-denied` even for tools that do not use approval. Approval is configured with `toolApproval` on `streamText` (`needsApproval` is deprecated); sensitive tools should set `experimental_toolApprovalSecret`. Detect failures with `isToolOutputErrorUIPart`. `redactToolErrors: true` swaps error text for "An error occurred." and can cause rejected requests with some models.

Incorrect (drops four states):

```tsx
if (part.state === 'output-available') return <Result data={part.output} />;
return <Spinner />; // approval-requested and output-error render as an endless spinner
```

Correct:

```tsx
switch (part.state) {
  case 'input-streaming': case 'input-available': return <Pending part={part} />;
  case 'approval-requested': return <Approve part={part} />;   // Approve + Deny
  case 'approval-responded': return <Decided part={part} />;
  case 'output-available': return <Result data={part.output} />;
  case 'output-error': return <ToolFailed message="This step failed." />; // not raw errorText
  case 'output-denied': return <Denied part={part} />;
}
```

OpenAI's Apps SDK guidelines add display-mode limits for tool UIs inside a host: inline cards max two actions and no internal scrolling; carousels 3-8 items ([OpenAI Apps SDK UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines), platform docs, undated). This is host-specific; apply it only when building a ChatGPT app.

### F2. Stop and regenerate

`useChat` exposes `status`: `submitted`, `streaming`, `ready`, `error`. Docs: enable Stop only in `submitted` or `streaming`; `stop()` aborts the fetch; enable `regenerate()` in `ready` or `error`, and use it as the retry action on error ([AI SDK chatbot docs, undated](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)). Shape of AI describes Regenerate as reproducing the response to the same prompt without new input, and "Controls" as pausing mid-stream to adjust the prompt ([Shape of AI](https://www.shapeof.ai/), pattern catalogue, © 2025, independent). Microsoft guidelines 7 to 9 ("efficient invocation, dismissal, correction") are the underlying principle ([Microsoft Research, published 2019-03-05](https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/), authority).

Gap: none of these sources says what happens to the partial text after Stop. The rule below (keep it, mark it stopped) is a design decision, not sourced.

### F3. Streamed output and assistive technology: measurement

Authority text: WCAG 2.2 SC 4.1.3 (AA) requires status messages to be programmatically determinable without focus; the Understanding page (updated 2026-10-04 per the fetched page) warns that live regions can make an app "too chatty" and recommends user testing; it names role=status (ARIA22), role=log (ARIA23, sequential updates, progress), role=alert (ARIA19, errors), and fails assertive use for unimportant content ([WCAG 2.2 Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), W3C). WAI-ARIA 1.2 defines `log` as a live region with implicit `aria-live=polite` where new items are added only at the end; `status` has implicit polite and `aria-atomic=true` ([WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/), W3C; fetched by curl and parsed with a Python regex). Neither says anything about streaming rates. That gap is why this was measured.

**Method.** Directory `~/.cache/research-lang/exemplars/product/ux-ai-livereg/` (scratch, not committed). Tools: `@guidepup/virtual-screen-reader` 0.33.0, `jsdom` 31.0.1, Node v26.13.1 (`npm ls`). Script `measure.cjs` builds a page with a message bubble (`<p>`, not live) and a `<div role="log" aria-live="polite" aria-atomic="false">`. It streams 500 word-sized tokens (50 sentences of 10 tokens), yielding one macrotask per token, and calls `virtual.spokenPhraseLog()`. DOM mutations are counted with `MutationObserver` on `document.body`. The README does not mention live regions ([guidepup README](https://github.com/guidepup/virtual-screen-reader)), but the shipped library source handles `aria-live`, `aria-atomic`, `aria-relevant` (`grep -rhoiE ".{60}aria-live.{60}" node_modules/@guidepup/virtual-screen-reader/lib/cjs`), and the log recorded `polite:` entries, so spoken-output rows below are tool-logged, not inferred. The tool is a simulation: no speech timing, no queue interruption, no per-AT debounce. Whether NVDA, JAWS or VoiceOver coalesce or drop rapid updates is UNVERIFIED.

**Result** (`node measure.cjs`, 500 tokens):

| Strategy | Live-region announcements | DOM mutations | Visible bubble content announced? |
|---|---|---|---|
| per token (append a span per token) | 500 (log length 501 incl. initial "document") | 1000 | only via the region |
| per sentence (append a `<p>` per sentence) | 50 (log length 51) | 550 | only via the region |
| on completion (one status sentence) | 1 ("Response complete. 2540 characters.") | 501 | never; the 500-token body is not announced at all |

Findings from the table:

- Announcement count scales 500 : 50 : 1. Per-token output is 500 separate polite phrases for a 2.5 KB answer.
- On-completion announces no response content. A screen reader user hears only that something finished and must navigate to read it.
- In every strategy the visible bubble is a non-live node; it is never announced unless a live region duplicates it. Duplicating content (bubble plus region) doubles the DOM text a user may encounter when they browse.
- The mutation count is not a proxy for announcements: the bubble alone causes 500 mutations in the "completion" run with 1 announcement.

### F4. Failure and hand-back

PAIR's errors chapter (undated page; CC BY-NC-SA; [PAIR errors + graceful failure](https://pair.withgoogle.com/chapter/errors-failing/), authority-adjacent vendor guidance by Google) classes failstates (system limitation), low confidence, unexpected input and others, and says: explain why a result could not be given and provide alternative paths; return control to the user, but only revert to manual where safe; make the handoff seamless (user knows the situation, what to do, how); offer alternatives with a safety check in higher-stakes cases; let users report errors; "make failure safe, boring, and a natural part of the product"; avoid over-explaining exploitable vulnerabilities. Microsoft guideline 10 is "Scope services when in doubt" and 11 "Make clear why the system did what it did". AI SDK says show a generic message such as "Something went wrong" so server details do not leak, with `regenerate()` as retry ([AI SDK chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)).

### F5. Memory controls

Shape of AI's memory pattern (© 2025, independent catalogue; product examples undated and possibly stale): show what was remembered and how it affects output; scope memory to project, workspace or conversation; let users view, edit, add, delete; one-step reset instead of account deletion; notify when something is saved with a way to review; separate preferences from facts; offer temporary/incognito mode with a reminder that the session is not persistent ([Shape of AI, memory](https://www.shapeof.ai/patterns/memory)). Microsoft guidelines 12 ("Remember recent interactions"), 17 ("Provide global controls"), 18 ("Notify users about changes").

### F6. Capability hints for empty chats

Microsoft guidelines 1 and 2: make clear what the system can do and how well. Shape of AI suggestions: three to six ranked, actionable, contextual prompts; click fills editable text; show at moments of need; hide during focus work; preview or confirm anything that triggers data access, publishing or heavy compute; negative example: suggestions shown before any context are irrelevant ([Shape of AI, suggestions](https://www.shapeof.ai/patterns/suggestions)). No source gives a measured effect size.

### F7. What is law

| Duty | Jurisdiction | Source status |
|---|---|---|
| Tell people they are interacting with an AI unless obvious to a reasonably well-informed person; information clear and distinguishable no later than first interaction | EU AI Act Art. 50(1), 50(5); applies from 2026-08-02 | Duty text: [Art. 50, Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50) (Commission). Date: [Art. 113, Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113) states "It shall apply from 2 August 2026"; its Art. 113 amendment markers cite OJ:L_202601744 and change only the high-risk and Art. 5 dates. [Goodwin, 2026-08](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force) (law firm) says Art. 50 became "generally applicable and enforceable" that day |
| Machine-readable marking of generated audio, image, video, text | Art. 50(2); providers of systems placed on the market before 2026-08-02 must comply by 2026-12-02 | New Art. 111 paragraph, quoted: "Article 50(2) by 2 December 2026" ([Art. 111, Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111), Commission). Regulation (EU) 2026/1744 published in the Official Journal 2026-07-24, in force 2026-07-27 ([Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/), law firm; Goodwin agrees on 2026/1744 and 2026-07-27). Earlier forecast: [Sidley, 2026-06-24](https://datamatters.sidley.com/2026/06/24/eu-ai-act-transparency-obligations-preparing-for-compliance-by-2-august-2026/) |
| Deepfake and public-interest text disclosure by deployers | Art. 50(4) | Service Desk text |
| "Clear and conspicuous" AI notice when a reasonable person could be misled; "not suitable for some minors" disclaimer; suicide and self-harm protocol, published; known minors: AI notice and break reminder every three hours | California SB 243, most duties effective 2026-01-01 | [FPF, 2025-11-04](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) (advocacy summary); statute text not read |
| Not-human notice, clear and conspicuous, at the beginning of any AI companion interaction (need not exceed once per day) and at least every three hours in continuing interactions; protocol for suicidal ideation that refers users to crisis services such as 988 (GBL art. 47, sections 1701-1702); Attorney General civil penalty up to $15,000 per day | New York S-3008C Part U; signed as chapter 58 on 2025-05-09 per the action table on [nysenate.gov](https://www.nysenate.gov/legislation/bills/2025/S3008/amendment/C); Part U takes effect on the 180th day after it became law, about 2025-11-05 (date computed here) | Bill text: [S-3008C PDF](https://legislation.nysenate.gov/pdf/bills/2025/S3008C) (state legislature, read; decompressed locally with `python3 -I` and zlib, then searched for "every three hours") |
| A supplier using generative AI in a consumer transaction must disclose it is AI if the individual makes a clear and unambiguous request (13-75-103(1)); licensed-occupation providers must prominently disclose high-risk AI interactions, verbally at the start of a verbal interaction and in writing before a written one (103(2)-(3)); safe harbor if the AI clearly and conspicuously discloses at the outset and throughout that it is AI (104); fine up to $2,500 per violation (105) | Utah SB 226, effective 2025-05-07 | Enrolled text: [SB 226](https://le.utah.gov/Session/2025/bills/enrolled/SB0226.pdf) (state legislature, read). SB 226 also moves the Artificial Intelligence Policy Act (Title 13, ch. 72) repeal date to 2027-07-01; [SB 332](https://le.utah.gov/Session/2025/bills/enrolled/SB0332.pdf) enrolled text does the same. The new chapter 13-75 has no repeal date in the SB 226 text |
| Do not use an AI chatbot in trade and commerce in a way that may mislead a consumer into thinking they are dealing with a human, unless the consumer is notified in a clear and conspicuous manner that they are not; violation is an Unfair Trade Practices Act violation | Maine 10 MRS 1500-DD, from PL 2025 c. 294 (LD 1727) | [Maine statute page](https://legislature.maine.gov/statutes/10/title10sec1500-DD-1.html) (state legislature, read); the page gives no effective date. Signed 2025-06-12 per BillTrack50 (search result, not fetched) |

Exceptions, ranges and forms differ by jurisdiction; this table is a pointer, not legal advice.

## Normative guidance candidates

Severity: MUST / SHOULD / CONSIDER. "Source" shows whether the rule is sourced or a design decision.

1. **MUST: Render every tool-part state.** A UI over `useChat` tool parts handles `input-streaming`, `input-available`, `approval-requested`, `approval-responded`, `output-available`, `output-error`, `output-denied`. Rationale: unhandled states show endless spinners or hide a denial. Verify: `grep -rE "output-denied|approval-requested|output-error" src/` finds each name in one render switch; fail example is a renderer that only tests `output-available`. Source: [AI SDK tool usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage).
2. **MUST: Show Approve and Deny for `approval-requested` on any tool that writes, sends, deletes or spends, and show the request reason.** Rationale: the human gate is the control. Verify: tools with side effects appear in `toolApproval` config; the part renders two buttons. Source: same.
3. **MUST: Do not show raw tool or stream error text to users by default.** Rationale: leaks server detail; the SDK masks it by default. Verify: grep `errorText` in render code; each use passes through a redactor or fixed message; `redactToolErrors` or an `onError` is set. Source: AI SDK docs.
4. **MUST: Enable Stop only when status is `submitted` or `streaming`.** Rationale: a Stop control that is live when nothing is running does nothing or aborts the wrong request, and users lose trust in it. Verify: `grep -n "stop" ` shows `disabled`/render guarded by status. Source: [AI SDK chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot).
5. **SHOULD: Enable Regenerate only when `ready` or `error`, and use it as the error retry.** Rationale: regenerating during a stream races two responses into one thread. Verify: same grep for `regenerate`. Source: same.
6. **SHOULD: After Stop, keep the partial text and mark it as stopped; do not silently discard or leave it looking complete.** Rationale: a truncated answer that reads as finished misleads. Verify: heuristic: pass is a visible "Stopped" marker next to the partial message; fail is a message with no marker. Source: design decision, unsourced.
7. **MUST: Never put the streaming message body itself in an assertive live region.** Rationale: WCAG treats assertive on non-urgent content as a failure. Verify: `grep -rn 'aria-live="assertive"\|role="alert"' src/` on chat components returns only error elements. Source: [WCAG Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
8. **MUST NOT: announce per token.** Measured 500 announcements for 500 tokens. Verify: run the harness in `ux-ai-livereg/measure.cjs` pattern against the page and count `polite:`/`assertive:` entries in `spokenPhraseLog()`; fail if count exceeds sentence count plus 5 for a response, pass is at or below it. Source: this measurement (virtual reader only).
9. **MUST: If the streamed body is announced, announce by sentence (or paragraph) into one `role="log"` region, appending only complete units; if only completion is announced, the message body must still be reachable and the status text must say how to reach it.** Rationale: completion-only announces zero content (measured). Verify: same harness; with on-completion, the log must contain a phrase naming where the answer is, and the message must be a focusable or navigable landmark (for example `role="article"` with a heading). Source: this measurement; ARIA `log` definition.
10. **SHOULD: Prefer on-completion announcement plus sentence-level announcement only on user opt-in, when no real-AT test is available.** Rationale: least chatty default; real screen reader coalescing is UNVERIFIED. Verify: a setting or `prefers-reduced-motion`-adjacent control exists. Source: decision under uncertainty.
11. **MUST: Do not duplicate content into a live region and also leave it fully readable in the DOM without telling users which is which.** Rationale: users browsing the DOM meet it twice. Verify: live region has `aria-hidden` ordering or is visually-hidden and labelled; heuristic review. Source: measurement observation (bubble plus region).
12. **MUST: Failure states name what failed, give one clause of cause, and offer a next path (retry, edit input, take over manually, alternative).** Rationale: a failure with no path leaves the user stuck, and PAIR says failure should be safe, boring and recoverable. Verify: heuristic; pass "Could not read the file (too large). Try a file under 10 MB or paste the text."; fail "Something went wrong." with no path. Source: [PAIR](https://pair.withgoogle.com/chapter/errors-failing/).
13. **SHOULD: Hand control back only where manual control is safe; where it is not, say so and offer a safe alternative.** Rationale: handing a user an unsafe manual path (for example a half-applied change) turns an AI failure into user harm. Verify: review each agent action class for a documented hand-back path. Source: PAIR.
14. **SHOULD: Provide a way to report a bad answer next to AI output.** Rationale: reports are the only feedback channel for errors users can see and the team cannot, and Microsoft guideline 15 asks for it. Verify: control present in message actions. Source: PAIR; Microsoft 15.
15. **MUST (if memory exists): provide view, edit/delete, one-step reset, scope, and a no-memory mode, and notify on save.** Rationale: hidden memory changes output with no way for the user to see or undo why. Verify: checklist against the UI; each of five controls reachable in at most two clicks from settings. Source: [Shape of AI memory](https://www.shapeof.ai/patterns/memory); Microsoft 17.
16. **SHOULD: Empty chat shows three to six contextual suggestions that fill the input as editable text; none triggers an irreversible action without confirmation.** Rationale: a one-click send of an unreviewed prompt can run data access or publishing the user did not choose. Verify: count suggestions in the empty state; click inserts text, does not send. Source: [Shape of AI suggestions](https://www.shapeof.ai/patterns/suggestions).
17. **SHOULD: Empty chat states in one line what the assistant can and cannot do.** Rationale: users who overestimate capability trust wrong answers, and Microsoft guidelines 1 and 2 make this the first duty. Verify: heuristic; pass "Answers from your docs; cannot edit files."; fail only "Ask me anything." Source: Microsoft guidelines 1, 2.
18. **MUST (EU users): disclose AI status at or before first interaction unless obvious.** Rationale: it is law from 2026-08-02 (Art. 113, Commission text), and the duty is on providers of systems that interact directly with people. Verify: first screen or first message contains the disclosure; grep for disclosure string in the empty-state component. Source: Art. 50(1), (5) ([Art. 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50)); date from [Art. 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113). Whether it is "obvious" is a legal call; see below.
19. **MUST (companion chatbots to California or New York users): not-human notice at the start of an interaction and at least every three hours in a continuing one (NY, all users; CA, known minors), plus a self-harm protocol that refers users to crisis services.** Rationale: both are statutory duties with enforcement (NY civil penalty up to $15,000 per day; CA private right of action per FPF). Verify: a timer fires the notice at or under 3 hours in a continuing session and copy is present at session start; a crisis-referral message exists and a documented trigger path reaches it. Source: NY text read ([S-3008C](https://legislation.nysenate.gov/pdf/bills/2025/S3008C), Part U sections 1701-1703); CA from [FPF](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) (secondary, text not read).
20. **SHOULD: Do not copy host-specific limits (cards: two actions, carousels: 3-8 items) outside ChatGPT apps.** Rationale: they are a host's display contract, not a general usability finding, and other hosts have different limits. Verify: only applied in apps targeting that host. Source: [OpenAI Apps SDK guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines).

## What an agent must not decide alone

- Whether a product is a "companion chatbot", operates in the EU or California, or whether AI status is "obvious": legal and product decisions. Ask.
- Which tools need human approval, and what an approval costs in user friction: a business and risk decision.
- What memory retains, retention period, and what is sent to the model: privacy and legal. Ask.
- Whether to ship AI-generated output markers or visible labels (Art. 50(2), 50(4)), and the label design: legal and brand.
- The copy of a disclosure or a crisis-protocol message, and any suicide or self-harm handling: legal and clinical review. Ask.
- Which suggestions to show as starters when they imply product claims about capability: brand and accuracy claim.

## Dated facts

| Fact | Source | Date stated | Type |
|---|---|---|---|
| Tool part states and approval API | [AI SDK tool usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) | undated; "AI SDK 5.0" for default streaming | platform docs |
| `status` values; Stop and Regenerate enable rules; `throttle` option name | [AI SDK chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) | undated | platform docs |
| 18 guidelines | [Microsoft Research](https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/) | 2019-03-05 | authority; dated, still the standard reference |
| Errors and failing chapter | [PAIR](https://pair.withgoogle.com/chapter/errors-failing/) | undated | vendor (Google) guidance |
| Apps SDK display-mode limits | [OpenAI](https://developers.openai.com/apps-sdk/concepts/ui-guidelines) | undated | vendor docs |
| SC 4.1.3 Understanding | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | updated 2026-10-04 | authority |
| `log` implicit polite; `status` polite and atomic | [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) | Recommendation (date not read) | authority |
| Virtual screen reader tool; WPT table 333 passing suites, 99 failing tests, 347 skipped; README: "should not replace but augment your screen reader testing" | [guidepup README](https://github.com/guidepup/virtual-screen-reader) | undated; version installed 0.33.0 | tool vendor |
| Art. 50 text | [EU AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50) | undated | authority |
| Regulation applies from 2026-08-02 | [Art. 113, Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113) | undated; text as amended by the Omnibus | authority (Commission) |
| Art. 50(2) for systems on the market before 2026-08-02 by 2026-12-02 | [Art. 111, Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111) | undated; text as amended | authority (Commission) |
| Omnibus is Regulation (EU) 2026/1744, published OJ 2026-07-24, in force 2026-07-27 | [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/); [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force) | 2026 (Goodwin 2026-08) | law-firm analysis; EUR-Lex page was empty to fetch |
| High-risk Annex III obligations moved to 2027-12-02 (not Art. 50) | Art. 113, Service Desk, above | undated | authority |
| Pre-adoption forecast of Art. 50 dates | [Sidley](https://datamatters.sidley.com/2026/06/24/eu-ai-act-transparency-obligations-preparing-for-compliance-by-2-august-2026/) | 2026-06-24 | law-firm analysis, superseded by the adopted text |
| SB 243 duties (CA); NY, Utah SB 452 and Maine LD 1727 mentioned | [FPF](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) | 2025-11-04 | advocacy summary |
| SB 243 private right of action: at least $1,000 per violation | FPF, same | 2025-11-04 | advocacy summary |
| Utah SB 226 effective 2025-05-07; SB 226 and SB 332 both set the AI Policy Act repeal to 2027-07-01 | [SB 226](https://le.utah.gov/Session/2025/bills/enrolled/SB0226.pdf), [SB 332](https://le.utah.gov/Session/2025/bills/enrolled/SB0332.pdf) | Enrolled copies, 2025 General Session | authority (legislature) |
| NY S-3008C Part U: notice every three hours; signed chapter 58 on 2025-05-09; effective 180 days after | [S-3008C PDF](https://legislation.nysenate.gov/pdf/bills/2025/S3008C); [bill page](https://www.nysenate.gov/legislation/bills/2025/S3008/amendment/C) | 2025-05-09 | authority (legislature) |
| Maine 10 MRS 1500-DD, PL 2025 c. 294 | [Maine statute](https://legislature.maine.gov/statutes/10/title10sec1500-DD-1.html) | 2025 | authority (legislature); effective date not on page |

## AI-agent angle

| Typical mistake | Smallest check |
|---|---|
| Generates a tool renderer for only `input-available`/`output-available` (older AI SDK 4 `toolInvocation` with `call`/`result` states). | Grep for the seven state names; flag `toolInvocations` or `state === 'result'` as old-API. |
| Wires `aria-live="assertive"` or `role="alert"` on the message list because "chat needs announcements". | Grep rule 7. |
| Sets `aria-live="polite"` on the message container that receives tokens, causing per-token announcements (this is the default naive build; measured 500). | Harness count of announcements. |
| Renders `errorText` or `error.message` directly. | Grep `errorText\|error.message` in JSX. |
| Leaves Stop always visible, or Regenerate during streaming. | Grep for status-guarded rendering. |
| Adds suggestion chips that auto-send on click. | Click test: input filled, nothing sent. |
| States legal facts from memory (dates, limits). | Require URL and date next to every legal claim. |
| Writes "AI-generated" labels only as a tiny footer; disclosure after the first reply. | Rule 18 grep and first-screen check. |

## Contested / evolving

- **Streaming announcement strategy.** WCAG gives no streaming guidance, and the Understanding page recommends user testing for chattiness. This artifact's evidence is a virtual reader; real NVDA, JAWS and VoiceOver behaviour (coalescing, interruption) is UNVERIFIED. Trend: no authority has published a streaming rule as of 2026-11-27 to the extent this research found; I did not search for community reports.
- **EU Art. 50 dates.** An earlier draft of this artifact reported a Goodwin item pushing a deadline to 2 December 2027. Fetching the Goodwin alert ([Goodwin, 2026-08](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force)) shows that was wrong: it says Art. 50 became generally applicable on 2026-08-02, legacy marking systems have until 2026-12-02, and 2027-12-02 is the Annex III high-risk date. The Commission texts of [Art. 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113) and [Art. 111](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111) agree. Sidley's 2026-06-24 note predates adoption. Residual: the Regulation (EU) 2026/1744 number and OJ date (2026-07-24) rest on Cooley and Goodwin; the EUR-Lex page returned no text, and Ropes Gray returned 403 again, so it is not used. Where Art. 50 applies to a given product remains a legal call.
- **Memory.** Shape of AI favours visibility and editability; PAIR and Microsoft guideline 14 ("Update and adapt cautiously") argue for caution about silent adaptation. They are compatible, but no source sets a retention default.
- **Showing reasoning and sources.** AI SDK exposes `reasoning` and `source-url` parts. Whether to render reasoning is a product decision, not settled by these sources.

## Sources

| URL | What it is | Date/era | Why |
|---|---|---|---|
| https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage | AI SDK tool part states, approvals, error redaction (primary, platform) | AI SDK 5+, undated | Exact state list |
| https://ai-sdk.dev/docs/ai-sdk-ui/chatbot | AI SDK chatbot status, stop, regenerate, throttle (primary) | undated | Enable rules |
| https://www.microsoft.com/en-us/research/articles/guidelines-for-human-ai-interaction-eighteen-best-practices-for-human-centered-ai-design/ | 18 HAI guidelines (primary) | 2019-03-05 | Canonical principles |
| https://pair.withgoogle.com/chapter/errors-failing/ | PAIR errors chapter (primary, vendor) | undated | Failstates and hand-back |
| https://developers.openai.com/apps-sdk/concepts/ui-guidelines | OpenAI Apps SDK UI rules (primary, vendor) | undated | Host-specific limits |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 2.2 Understanding 4.1.3 (primary) | updated 2026-10-04 | Status message techniques |
| https://www.w3.org/TR/wai-aria-1.2/ | WAI-ARIA 1.2 (primary) | Recommendation | log and status semantics |
| https://github.com/guidepup/virtual-screen-reader | Virtual screen reader README (tool) | v0.33.0 installed | Measurement tool and limits |
| https://www.shapeof.ai/ | Pattern catalogue (independent) | © 2025 | Regenerate, memory, suggestions |
| https://www.shapeof.ai/patterns/memory | Memory pattern (independent) | © 2025 | Memory controls |
| https://www.shapeof.ai/patterns/suggestions | Suggestions pattern (independent) | © 2025 | Empty-chat hints |
| https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50 | EU AI Act Art. 50 text (primary, Commission) | undated | Disclosure duty |
| https://datamatters.sidley.com/2026/06/24/eu-ai-act-transparency-obligations-preparing-for-compliance-by-2-august-2026/ | Sidley analysis | 2026-06-24 | Application dates |
| https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/ | FPF chatbot law summary | 2025-11-04 | SB 243, NY, Utah, Maine |
| https://www.ropesgray.com/en/insights/viewpoints/2026/08/102nfqm/you-talkin-to-me-operationalising-the-eu-ai-acts-transparency-obligations | Ropes Gray (403 on fetch twice; not relied on) | 2026-08 | Not verified |
| https://le.utah.gov/Session/2025/bills/enrolled/SB0226.pdf | Utah SB 226 enrolled (fetched with curl, text decompressed and read) | 2025 | Primary |
| https://le.utah.gov/Session/2025/bills/enrolled/SB0332.pdf | Utah SB 332 enrolled (read) | 2025 | AI Policy Act repeal date |
| https://legislation.nysenate.gov/pdf/bills/2025/S3008C | NY S-3008C bill text (read) | 2025 | Part U AI companion duties |
| https://www.nysenate.gov/legislation/bills/2025/S3008/amendment/C | NY bill page with action table | 2025-05-09 signed | Enactment date |
| https://legislature.maine.gov/statutes/10/title10sec1500-DD-1.html | Maine 10 MRS 1500-DD (read) | 2025 | Chatbot disclosure |
| https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113 | EU AI Act Art. 113 as amended (Commission) | undated | Application date |
| https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111 | EU AI Act Art. 111 as amended (Commission) | undated | Art. 50(2) legacy date |
| https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force | Goodwin alert | 2026-08 | Corrects Contested item; 2026/1744 |
| https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/ | Cooley note | 2026 | Regulation number, OJ date |

Fetch failures: leginfo.legislature.ca.gov and legiscan (403), Ropes Gray (403, twice), eur-lex.europa.eu (empty), guidepup.dev docs page (empty). California SB 243 therefore stays secondary. The central question was sourced, so blocked is false.
