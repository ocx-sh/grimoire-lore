---
title: LinkedIn content rules for a person-led developer-tool post (policy, bait, pods, AI content, video, connection line)
program: product
sub_program: channels
topic: channel-linkedin
worker: li-policy-and-ai-content
date_researched: 2026-11-27
model: sonnet
sources_fetched: 13
scope: Covers LinkedIn's rules on engagement bait, pods, automation, coordinated reposting, AI-generated content, video-quality reach reduction, brand-partnership labelling, and where the connection line sits. Does not cover the fold character budget (li-limits-and-fold owns it) or the legal disclosure standard (marketing owns it).
---

# LinkedIn content rules for a person-led developer-tool post

## Contents
1. Summary
2. Findings
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources
9. Appendix: fixture and script

## Summary

- LinkedIn states, on its own newsroom, that engagement pods and automated comments "aren't allowed"; the scout row LO#13 said pods are "not named" in the rules, and that is now out of date ([news.linkedin.com, 13 Mar 2026](https://news.linkedin.com/2026/authentic-content-and-conversations)).
- The Professional Community Policies still say "Don't do things to artificially increase engagement" and forbid agreeing in advance to like or re-share ([policies, no effective date shown](https://www.linkedin.com/legal/professional-community-policies)).
- The policies and help pages never define "engagement bait" or say "comment KEYWORD" is banned. The only reach figure for it is third-party data ([van der Blom](https://richardvanderblom.com/insights-playbook/)): -45% against the author's average. Treat it as a reach rule, not a policy violation.
- Scout row LO#12 cited help a524166 for bait. That page covers comments and automation only and does not mention engagement bait (fetched 2026-11-27). Flag: citation does not reproduce.
- A draft check can reject bait, pod and coordination phrases with a short regex list. On a 20-draft synthetic fixture the combined list scored precision 1.00 and recall 0.93 (13 of 14). The fixture is small and self-labelled.
- LinkedIn judges AI content on value, not origin: it names "AI slop" (polished, no point of view), asks members to review what AI produced, and encourages disclosure of heavy reliance ([a1481496, "Last updated: 1 month ago"](https://www.linkedin.com/help/linkedin/answer/a1481496)). There is no formal AI label.
- Third-party data ties generic posts to lower reach (-11% to -28% of author average) and posts with detail plus lived experience to higher reach (+6% to +14%) ([van der Blom, vendor/independent analysis of 800,000+ posts](https://richardvanderblom.com/insights-playbook/)).
- Negative video feedback reduces reach to non-followers, and LinkedIn calls the process "temporary"; improving quality and relevance can restore reach ([a10728043, "Last updated: 7 months ago"](https://www.linkedin.com/help/linkedin/answer/a10728043)). Scout claim reproduces, with one correction: the page says "temporary", and the exact phrase "temporary, not permanent" was not seen in the extraction.
- A video quality checklist is cheap and worth including, but it should be a SHOULD, not a gate on publishing. The penalty is conditional and reversible, and no outcome check is available to an agent.
- Employee, founder or maintainer connection: FTC says employment is a "material connection", and the disclosure must sit with the endorsement and not behind a "MORE" tap ([FTC, Nov 2019](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)). Rule: put one plain sentence in the first line or two.
- A paid or in-kind post must use LinkedIn's Brand partnership toggle, which works only on Public posts and resets to Off for every post ([a1627083, "Last updated: 3 years ago"](https://www.linkedin.com/help/linkedin/answer/a1627083)).

## Findings

### 1. What LinkedIn's own rules say

| Topic | What the platform says | Source and date |
|---|---|---|
| Artificial engagement | "Don't do things to artificially increase engagement with your content." Respond authentically, and do not "agree with others ahead of time to like or re-share" | [Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies), fetched 2026-11-27, page shows no date |
| Pods | "This form of inauthentic activity erodes trust and is not allowed on LinkedIn." LinkedIn is removing groups showing pod behaviour and warned members of restrictions and removal from programs such as Top Voices | [LinkedIn newsroom, 13 Mar 2026](https://news.linkedin.com/2026/authentic-content-and-conversations) |
| Automated comments | Comments posted through a browser extension, script or third-party tool "aren't allowed". LinkedIn may hide them from "Most Relevant", sometimes outside the commenter's network, and may restrict the member | same newsroom page, 13 Mar 2026; [Social Media Today, 16 Feb 2026](https://www.socialmediatoday.com/news/linkedin-outlines-more-measures-to-combat-engagement-pods/812290/) (reporting on a LinkedIn executive) |
| Comment automation, help page | "If we detect excessive comment creation or use of an automation tool, we may limit the visibility of those comments." Comment caps may apply. | [a524166](https://www.linkedin.com/help/linkedin/answer/a524166), "Last updated: 3 weeks ago" |
| Bots and fake engagement | User Agreement 8.2 bars "bots or other unauthorized automated methods", including automating posts or driving inauthentic engagement, and manipulating algorithms | [User Agreement, effective 3 Nov 2025](https://www.linkedin.com/legal/user-agreement) |
| Prohibited software | Third-party software that scrapes, alters or automates the site is not permitted; accounts "risk having their accounts restricted or shut down" | [a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387), "Last updated: 2 years ago" |
| Reposting | Reposts can carry your commentary; LinkedIn "may limit your ability to repost posts from members you're not connected with" | [a525047](https://www.linkedin.com/help/linkedin/answer/a525047), "Last updated: 3 weeks ago" |
| False or misleading content | "Do not share content that is false, misleading, or intended to deceive." Also: "Do not share content or endorse someone or something in exchange for personal benefit" unless "you have included a clear and conspicuous notice of the personal benefit you receive" | [Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies), fetched 2026-11-27, no date shown |
| Brand partnership label | "If you share content in an exchange for value, you must label the post as a brand partnership." The label is "only available for Public posts"; the setting "will reset to its default Off for your next post" | [a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083), "Last updated: 3 years ago" |
| Synthetic media | "Do not share synthetic or manipulated media that depicts a person saying something they did not say ... without clearly disclosing" | [Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies) |
| AI-assisted text | "LinkedIn's focus is not on how content is created, but whether it adds value"; "AI slop" is "low-effort, likely AI-generated content that may sound polished on the surface"; "Content that feels generic, repetitive, or lacks a clear point of view is less likely to be widely distributed"; "content should still reflect the member's own voice, perspective, and experience"; advises telling others "if you've relied heavily on AI"; "review, edit, and approve";  review what AI produced; disclose heavy reliance; "Seems like AI slop" flag; enough flags show a tip in Post analytics that is "not a takedown or policy decision" | [a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496), "Last updated: 1 month ago" |

Note on dates: LinkedIn help pages show only relative dates ("3 weeks ago"). Absolute dates are those stated on the newsroom page and the User Agreement.

### 2. Bait, pods and coordinated reposting: where the line is

- Engagement bait ("comment KEYWORD", "react with X for A") is not defined in any LinkedIn page fetched. The reach cost is third-party: van der Blom reports that "Comment KEYWORD" posts moved from +18% to -45% against author average reach, from a sample of 800,000+ posts in the November update; the baseline and collection dates are not stated on the page ([source](https://richardvanderblom.com/insights-playbook/)). Treat as independent analysis, not platform data.
- A "comment KEYWORD for the link" pattern also invites the automation path: a tool replies by DM. LinkedIn bars automated posts and messages (User Agreement 8.2), so the pattern has a policy risk beyond reach.
- Pods and reciprocal engagement: the policy bars agreeing in advance to like or re-share; the newsroom now says pods "are not allowed". An internal request such as "like and comment within the first hour" is an advance agreement to engage and sits on the line.
- Coordinated cross-account reposting of one launch: no LinkedIn page fetched says that employees reposting a launch from their own accounts is banned. An ordinary request to share is not the same as a pre-agreed, scheduled, scripted push. The unresolved case is a scripted schedule ("repost at 9am sharp"). Treat that as high risk and route it to a human (see section 5).

### 3. Measurement: pattern check on a 20-draft fixture

I wrote 20 agent-style launch drafts and labelled each one (bait, pod, coordination, or clean) by hand before writing the patterns. The drafts and labels are synthetic and authored by the same agent, so recall is optimistic.

Fixture and script: committed inline in the [appendix](#appendix-fixture-and-script) of this file (re-run 2026-11-27 from that text; the earlier scratchpad copy is not needed). Command: save the appendix's `fixture.py` and `run.py` side by side, then `PYTHONPATH=. python3 -s run.py`. Output reproduced verbatim in the appendix.

Result:

| Class | Gold | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|---|
| bait | 9 | 8 | 2 | 1 | 0.80 | 0.89 |
| pod | 3 | 2 | 0 | 1 | 1.00 | 0.67 |
| coordination | 3 | 3 | 0 | 0 | 1.00 | 1.00 |
| any flag (union) | 14 | 13 | 0 | 1 | 1.00 | 0.93 |

The 2 bait false positives were the pod and coordination drafts, so the union scores are the meaningful ones. The pod-class miss (draft 6, "like and comment within the first hour") is caught by the coordination pattern, so the union misses only draft 3, "Drop a 🔥 if you agree": the pattern's word boundary does not fit an emoji. Clean drafts, including two with a first-line disclosure and one with a "what would you want measured next?" question, were not flagged. Limits: n=20, no confidence interval is meaningful, and real agent output will contain phrasings the fixture does not.

### 4. AI-generated content

- Platform position (a1481496): AI may help refine language, proofread and tighten. The content "should still reflect the member's own voice and experience". The member reviews and approves it. LinkedIn encourages disclosure of heavy reliance. Content is judged on value.
- Reach effect is third-party only: no-detail posts -11% to -28% of author average and detail plus lived experience +6% to +14% (van der Blom, same page as above). Baseline unstated.
- The only platform-stated consequence of an "AI slop" flag is an analytics tip, which LinkedIn says is not a takedown or policy decision. The reach claim from other vendors (for example Metricool, cited in the scout) was not fetched here and is not relied on.
- The behaviour a skill can check: a concrete specific (version, command, measured result with its method), a first-person detail, no fabricated quotes or people, and a disclosure line when an agent wrote most of the text.
- Correct and incorrect:
  - Fail: "We're thrilled to unveil a game-changing platform that unlocks the future of dev workflows." No version, no number, no first person.
  - Pass: "I shipped ocx 0.9.2 today. Cold install of 40 packages went from 38s to 9s on my laptop (hyperfine, 10 runs). The cache key ignored the registry; that was my bug."

### 5. Video quality and the temporary reach reduction

a10728043 says repeated strong negative feedback means videos "may be shown less often to members who don't already follow them". The process is automated and "temporary", and quality "generally means videos that are clear, professional, relevant to their audience, and helpful or actionable". Improving quality and relevance "can restore broader visibility".
Decision input: the penalty hits non-followers, which is where a developer-tool launch needs reach. It is conditional on feedback, and the agent cannot observe it. So a checklist is a SHOULD and does not block a post.

### 6. Connection line placement

- FTC (Disclosures 101, Nov 2019): disclose "with the endorsement message itself"; do not require a tap on "MORE"; do not bury it among hashtags; a profile page is not enough. Employment is a material connection.
- LinkedIn publishes no fold figure. The budget is owned by [li-limits-and-fold](li-limits-and-fold.md) (2026-11-27, derived from eight vendor pages, grade C minus): claim in the first 90 graphemes and 2 lines, lines 1 to 3 at most 140 graphemes, no blank line in lines 1 to 3. This file applies it: the connection sentence goes in lines 1 to 3, which sit inside the smallest figure any source gave (about 90 to 140 characters, 2 to 3 lines). The figure is third-party and must be re-measured in the live client; the placement rule is stated in lines so it survives a changed figure.
- Rule: the connection sentence is a plain sentence in the post's first one or two lines, before the first bulleted section, and inside the budget above. Example pass: "I maintain grim, the tool I'm writing about." Fail: a trailing "#ad #colleague" hashtag block, or only a profile headline.
- If value is exchanged (payment, free product, other benefit), also set the Brand partnership toggle (a1627083). It is public-post only and must be set per post.

## Normative guidance candidates

Shared links used below: PCP = [Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies) (no effective date shown, fetched 2026-11-27); AI = [a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496) ("Last updated: 1 month ago"); VdB = [van der Blom](https://richardvanderblom.com/insights-playbook/) (independent commercial analysis, "November Update"); FOLD = [li-limits-and-fold](li-limits-and-fold.md) (derived, third-party, grade C minus, 2026-11-27: claim in the first 90 graphemes and 2 lines; lines 1 to 3 at most 140 graphemes; no blank line in lines 1 to 3).

1. MUST NOT ask readers to comment a keyword, type YES, or react with a given emoji to get a link or asset. Rationale: no LinkedIn page fetched defines it as banned, but [van der Blom](https://richardvanderblom.com/insights-playbook/) (independent data) reports -45% reach against author average and the pattern invites DM automation barred by [User Agreement 8.2](https://www.linkedin.com/legal/user-agreement) (effective 3 Nov 2025). VERIFY: run the fixture script in the appendix on the draft; the bait patterns (`comment 'X'`, `type|drop|reply ... yes|below|🔥`, `react with`) return no match. Pass: "Link in the first comment." Fail: "Comment 'OCX' for the link."
2. MUST NOT gate the link behind a comment, a reaction or a DM request. Rationale: a gate is the bait pattern in rule 1 and the automation path in [User Agreement 8.2](https://www.linkedin.com/legal/user-agreement). Where the link goes (body or first comment) is decided by [li-format-and-reach-evidence](li-format-and-reach-evidence.md); if it goes in the body it stays out of lines 1 to 3 (FOLD). VERIFY: draft has no `comment ... (and|&) I'?ll (send|DM)` phrasing and no URL in lines 1 to 3 (`head -n 3 draft.txt | grep -E 'https?://'` returns nothing).
3. MUST NOT write, recommend or template a request to like, comment or re-share in advance, or "within the first hour". Rationale: PCP ([policies](https://www.linkedin.com/legal/professional-community-policies)): "don't agree with others ahead of time to like or re-share each other's content." VERIFY: the pod and coordination patterns in the appendix script return no match.
4. MUST NOT propose or script automated commenting, auto-reposting, scheduled-reply bots, or browser-extension engagement. Rationale: automated comments "aren't allowed" ([newsroom, 13 Mar 2026](https://news.linkedin.com/2026/authentic-content-and-conversations)); [a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387) ("Last updated: 2 years ago") warns of restricted or shut-down accounts. VERIFY: `grep -rEi "linkedin" <repo workflows and scripts> | grep -Ei "comment|playwright|puppeteer|selenium|auto"` finds no tool that posts on LinkedIn.
5. MUST NOT draft a coordinated launch schedule across personal, company and employee accounts (fixed times, repost lists); SHOULD draft one honest post per person in that person's own words. Rationale: LinkedIn does not define the line, PCP bars advance agreements to engage ([policies](https://www.linkedin.com/legal/professional-community-policies)), and [a525047](https://www.linkedin.com/help/linkedin/answer/a525047) says LinkedIn may limit reposting. VERIFY: the coordination patterns in the appendix script return no match; any request to employees goes to the owner (section 5).
6. MUST include at least one concrete specific in the first half of the post: a version number, a command in code form, or a measured result with its method. Rationale: LinkedIn: "Content that feels generic, repetitive, or lacks a clear point of view is less likely to be widely distributed" ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)); third-party data agrees (VdB: no-detail -11% to -28%). VERIFY: regex `\bv?\d+\.\d+(\.\d+)?\b`, a backtick span, or `\d+(\.\d+)?\s?(s|ms|%|x|×)\b` matches; and the delete-the-name heuristic: remove the product name and the post must still say something only this author could.
7. MUST include first-person detail (what the author did, saw or got wrong). Rationale: "content should still reflect the member's own voice, perspective, and experience" ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)). VERIFY: `grep -Ei "\b(I|my|I've|we shipped)\b"` matches; pass "The cache key ignored the registry; my bug."; fail all-passive or "We are thrilled to announce" prose.
8. MUST NOT invent quotes, customers, testimonials, benchmark numbers or named people. Rationale: PCP, section "Do not share false or misleading content": "Do not share content that is false, misleading, or intended to deceive" ([policies, fetched 2026-11-27](https://www.linkedin.com/legal/professional-community-policies)). VERIFY: every number in the draft traces to a command output, release note or file the agent cites in the brief; every quote has a source URL.
9. SHOULD add a plain line when an agent wrote most of the text and the author has not rewritten it ("Drafted with an AI assistant, reviewed by me."). Rationale: LinkedIn advises telling others "if you've relied heavily on AI to help create or modify the content"; it is advice, not a rule ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)). VERIFY: the draft's header metadata records `ai_role: heavy` and the line is present. Whether to disclose in a founder's name is the owner's call (section 5).
10. MUST place the author's connection to the tool (maintainer, employee, founder, contractor) as a plain sentence inside lines 1 to 3, ahead of the "see more" cut. Rationale: employment is a material connection and the disclosure must not need a "MORE" tap ([FTC, Nov 2019](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)); PCP asks for a "clear and conspicuous notice" of personal benefit. The fold figure is stated in [li-limits-and-fold](li-limits-and-fold.md): derived, third-party, grade C minus, dated 2026-11-27; LinkedIn publishes no fold, so line 3 is the safe position. VERIFY: regex `\b(I|we)\s+(work|maintain|build|built|founded|lead)\b` matches within the first 3 lines (`head -n 3 draft.txt | grep -Ei ...`), and `first3_gr <= 140` from the check script in that file.
11. MUST NOT carry the connection only in a hashtag block, a trailing line or the profile headline. Rationale: the FTC says a disclosure must not be buried among hashtags or sit only on a profile ([FTC, Nov 2019](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)), and a disclosure after the fold is invisible without a tap. VERIFY: `#(ad|sponsored|partner|colleague)\b` is not the sole disclosure; the rule 10 sentence is present in lines 1 to 3.
12. MUST ask the owner to turn on the Brand partnership toggle when the author received payment, a free product or another benefit for the post; the agent cannot set it. Rationale: [a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083) ("Last updated: 3 years ago") says "If you share content in an exchange for value" you "must label the post as a brand partnership", the label is "only available for Public posts", and the setting "will reset to its default Off for your next post". VERIFY: draft metadata `value_exchanged: true` produces the instruction "set Brand partnership toggle, post must be Public".
13. SHOULD run a video checklist before publishing: captions present, a hook within the first seconds, content tied to a developer task, no filler intro. Rationale: low-quality video may be shown less to non-followers, and the reduction is automated and temporary ([a10728043](https://www.linkedin.com/help/linkedin/answer/a10728043), "Last updated: 7 months ago"). VERIFY: checklist file with four yes/no items attached to the draft. Not a publishing gate.
14. SHOULD NOT treat reduced video reach as permanent; MUST NOT delete and repost a video to reset reach. Rationale: [a10728043](https://www.linkedin.com/help/linkedin/answer/a10728043) says quality and relevance improvements can restore visibility and offers no reset by reposting; a repost also risks duplicate-content spam under PCP ("Do not spam members or the platform"). VERIFY: reading heuristic: the plan contains no "delete and repost" step.
15. CONSIDER ending with a real question the author wants answered, not a reaction poll. Rationale: PCP asks for authentic response and bars artificially increasing engagement ([policies](https://www.linkedin.com/legal/professional-community-policies)); a specific question stays clear of the bait patterns in rule 1. VERIFY: the question names a specific thing (pass: "What would you want measured next?"; fail: "Agree? Drop a 🔥").

## Dated facts

| Fact | Source | Date the source states | Source type |
|---|---|---|---|
| Pods "not allowed"; groups removed; members warned of restrictions and removal from Top Voices | [news.linkedin.com](https://news.linkedin.com/2026/authentic-content-and-conversations) | 13 Mar 2026 | Platform |
| Automated comments "aren't allowed"; hidden from Most Relevant | same | 13 Mar 2026 | Platform |
| Automated comments: executive's statement of action | [Social Media Today](https://www.socialmediatoday.com/news/linkedin-outlines-more-measures-to-combat-engagement-pods/812290/) | 16 Feb 2026 | Trade press reporting the platform |
| "Don't do things to artificially increase engagement" | [Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies) | none shown | Platform |
| UA 8.2: no bots, no scraping, no automated posting or fake engagement | [User Agreement](https://www.linkedin.com/legal/user-agreement) | effective 3 Nov 2025 | Platform |
| Comment automation may reduce comment visibility; comment caps | [a524166](https://www.linkedin.com/help/linkedin/answer/a524166) | "Last updated: 3 weeks ago" | Platform |
| AI content judged on value; disclose heavy reliance; "Seems like AI slop" flag | [a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496) | "Last updated: 1 month ago" | Platform |
| Negative video feedback reduces reach to non-followers, temporary | [a10728043](https://www.linkedin.com/help/linkedin/answer/a10728043) | "Last updated: 7 months ago" | Platform |
| Brand partnership label: required for paid/in-kind, Public posts only, resets per post | [a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083) | "Last updated: 3 years ago" | Platform |
| Brand partnership tag rollout announced | [Social Media Today](https://www.socialmediatoday.com/news/linkedin-rolls-out-brand-partnership-tags/691582/) | 22 Aug 2023 | Trade press |
| Repost limits for non-connections | [a525047](https://www.linkedin.com/help/linkedin/answer/a525047) | "Last updated: 3 weeks ago" | Platform |
| Employment is a material connection; no "MORE"; no hashtag burial | [FTC Disclosures 101](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers) | November 2019 | Authority (FTC) |
| "Comment KEYWORD" +18% to -45%; no-detail -11% to -28%; detail plus lived experience +6% to +14%; 800,000+ posts | [van der Blom](https://richardvanderblom.com/insights-playbook/) | "November Update"; no absolute date | Independent analyst (commercial), not platform data |

Scout figures that did or did not reproduce: LO#15 and LO#40 reproduce (a1481496 "1 month ago", a10728043 "7 months ago"). LO#12 citation a524166 does not support "engagement bait" (page does not mention it). LO#13 "pods are not named" is outdated after the 13 Mar 2026 newsroom post. LO#39 figures reproduce on the van der Blom page. LO#35 (policy wording on advance agreement) reproduces; "repost rules limit reposting to public posts" reproduces only as "comments can only be reposted when the original post is public and shareable". LC#19 and LC#20 reproduce (policy text; the claim that LinkedIn retired its AI post tool was not checked here).

## What an agent must not decide alone

- Whether employees may be asked to share a launch, and any schedule or list for it. Ask the owner; it touches policy and HR.
- Whether a post counts as "paid" or "in kind" (free licence, sponsored conference, partnership): ask; turn on the Brand partnership toggle only on the owner's decision.
- The legal disclosure wording for the market the post reaches (FTC, UK ASA, EU): marketing owns the standard; ask.
- Whether to disclose heavy AI involvement in a founder's name: it is a voice and brand decision. Ask.
- Whether to use any posting, scheduling or comment tool: ask first; scheduling inside LinkedIn's own composer is the safe default and third-party automation is not.
- Claims about customers, benchmarks against named competitors, and quotes from named people: ask for the source.

## AI-agent angle

| Typical agent mistake | Smallest mechanical check |
|---|---|
| Ends the draft with "Comment 'X' and I'll send it" | Regexes in rules 1 and 2 |
| Offers a "comment within the first hour" tip in a launch plan | Regex in rule 3 |
| Writes "We're thrilled to announce ..." with no number | Rule 6 regex plus the delete-the-name heuristic |
| Invents a benchmark or a customer quote | Rule 8 traceability check |
| Puts "#ad" or "#colleague" at the bottom as the only disclosure | Rule 11 |
| Suggests an automation tool or a posting extension | Rule 4 grep |
| Plans a coordinated repost schedule for staff | Rule 5 regex |
| States "AI posts are suppressed by LinkedIn" as a fact | LinkedIn says it judges value, not origin (a1481496); require the claim to cite the page |

## Contested / evolving

- Is AI-generated content suppressed? LinkedIn: value judged, not creation method, but generic content is "less likely to be widely distributed" ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)). Vendors assert suppression of AI text itself ([Metricool, cited by scout, not fetched here](https://metricool.com/linkedin-algorithm/)). Trend: the platform's stated signal is quality, and the "slop" flag is a tip, not a penalty.
- Is "comment KEYWORD" banned? No fetched LinkedIn page says so; the evidence is third-party reach data. The reach data and LinkedIn's automation statements point the same way: avoid it.
- Are pods banned? The scout read the User Agreement and found them unnamed; the newsroom of 13 Mar 2026 says pods are not allowed. Secondary sources (for example Salesdorado) claim a ban from March 2026 on any coordinated likes and comments. Only the newsroom statement is primary. The boundary between a pod and ordinary team enthusiasm is not defined by LinkedIn.
- Is the video reach reduction really temporary? The platform says yes. No independent measurement was found; the claim is unverifiable by an agent.
- Fold budget for the connection line: owned by li-limits-and-fold and not re-fetched here; if that dive's figure changes, rule 10 stays valid because it is in lines.

## Sources

| URL | What it is | Date/era | Type |
|---|---|---|---|
| https://www.linkedin.com/legal/professional-community-policies | Professional Community Policies | none shown, fetched 2026-11-27 | Primary |
| https://www.linkedin.com/legal/user-agreement | User Agreement 8.2 | effective 3 Nov 2025 | Primary |
| https://news.linkedin.com/2026/authentic-content-and-conversations | Newsroom on pods and automated comments | 13 Mar 2026 | Primary |
| https://www.linkedin.com/help/linkedin/answer/a1481496 | AI-assisted content help | "1 month ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a10728043 | Video visibility and quality | "7 months ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a524166 | Comments help, automation | "3 weeks ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a1341387 | Prohibited software | "2 years ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a525047 | Reposting help | "3 weeks ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a1627083 | Label post as brand partnership | "3 years ago" | Primary |
| https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | FTC disclosure guide | Nov 2019 | Primary (authority) |
| https://www.socialmediatoday.com/news/linkedin-outlines-more-measures-to-combat-engagement-pods/812290/ | Trade press on automated-comment action | 16 Feb 2026 | Secondary |
| https://www.socialmediatoday.com/news/linkedin-rolls-out-brand-partnership-tags/691582/ | Trade press on brand partnership tags | 22 Aug 2023 | Secondary |
| https://richardvanderblom.com/insights-playbook/ | Reach analysis of 800,000+ posts | "November Update" | Independent/commercial |

## Appendix: fixture and script

Run from an empty directory: write the two files below, then `PYTHONPATH=. python3 -s run.py`. Labels were assigned by hand before the patterns were written; both are authored by the same agent, so recall is optimistic.

`fixture.py`

```python
D=[
("Shipped ocx 0.9.2 today. Cold install of 40 packages went from 38s to 9s on my laptop. Comment 'OCX' and I'll DM you the link.",{"bait"}),
("I work at OCX. We released v0.9.2: lockfile v4, 4x faster installs. Details in the first comment.",set()),
("Drop a 🔥 if you agree that package managers are broken. Link in comments.",{"bait"}),
("Tag a friend who still pins versions by hand!",{"bait"}),
("Which do you prefer? React with 👍 for npm, ❤️ for pnpm, 😮 for ocx.",{"bait"}),
("Team: please like and comment on the launch post within the first hour so the algorithm picks it up.",{"pod","coord"}),
("Everyone at the company, repost the launch post from the company page today.",{"coord"}),
("Join our engagement group to support each other's posts, we all like and share each other's launches.",{"pod"}),
("I rewrote our resolver last month. Lockfile diff for 120 packages dropped from 4,100 lines to 310. What would you want measured next?",set()),
("Type YES if you want the cheat sheet.",{"bait"}),
("Comment below with your favourite CLI tool and I'll reply to each one.",{"bait"}),
("Disclosure: I'm the maintainer of grim. v0.16.0 adds grim lock. Here is what broke along the way: the cache key ignored the registry.",set()),
("Like, comment and share if this helped!",{"bait"}),
("Please share this with 3 people who need it. Reshare to help us reach 1,000.",{"bait"}),
("Let's all comment on each other's posts this week to boost reach, pod thread in DMs.",{"pod"}),
("We are announcing a revolutionary, game-changing platform that unlocks the future of dev workflows.",set()),
("Heads-up: I wrote this with an assistant and edited it; the benchmark numbers are mine: 9.1s vs 38.4s, hyperfine, 10 runs.",set()),
("If you want the repo, comment 'link' below and I'll send it over.",{"bait"}),
("Our staff will each repost this from their own accounts at 9am sharp, schedule is in the sheet.",{"coord"}),
("Anyone else hit this error? `exit 65` on build. Here is the fix I found and why it happens.",set()),
]
```

`run.py`

```python
import re
from fixture import D
P={
"bait":[r"\b(comment|type|reply|drop|react)\b[^.\n]{0,40}\b(below|yes|'[^']+'|\"[^\"]+\"|🔥|👍|❤️|with)\b",
        r"\btag (a|your) (friend|colleague)", r"\b(like|react)[^.\n]{0,30}\b(comment|share)\b",
        r"\b(reshare|please share|share this with)\b", r"\bcomment\s+['\"“][^'\"”]+['\"”]", r"\breact with\b"],
"pod":[r"\bengagement (group|pod)\b", r"\b(each other's|each others')\b[^.\n]{0,30}\b(posts?|launch)",r"\bpod thread\b"],
"coord":[r"within the first (hour|\d+ ?min)", r"\b(everyone|team|staff)\b[^.\n]{0,60}\b(repost|reshare)", r"\bwill each repost\b"],
}
for cls in P:
    rx=re.compile("|".join(P[cls]),re.I)
    tp=fp=fn=0; miss=[];fa=[]
    for i,(t,l) in enumerate(D,1):
        hit=bool(rx.search(t)); gold=cls in l
        tp+=hit and gold; fp+=hit and not gold; fn+=gold and not hit
        if gold and not hit: miss.append(i)
        if hit and not gold: fa.append(i)
    print(cls,"gold",sum(cls in l for _,l in D),"tp",tp,"fp",fp,"fn",fn,"P=%.2f R=%.2f"%(tp/max(tp+fp,1),tp/max(tp+fn,1)),"missed",miss,"false",fa)
allrx=re.compile("|".join(sum(P.values(),[])),re.I)
tp=fp=fn=0
for t,l in D:
    hit=bool(allrx.search(t)); gold=bool(l)
    tp+=hit and gold; fp+=hit and not gold; fn+=gold and not hit
print("any-flag tp",tp,"fp",fp,"fn",fn,"P=%.2f R=%.2f"%(tp/(tp+fp),tp/(tp+fn)))
```

Output (2026-11-27):

```
bait gold 9 tp 8 fp 2 fn 1 P=0.80 R=0.89 missed [3] false [6, 8]
pod gold 3 tp 2 fp 0 fn 1 P=1.00 R=0.67 missed [6] false []
coord gold 3 tp 3 fp 0 fn 0 P=1.00 R=1.00 missed [] false []
any-flag tp 13 fp 0 fn 1 P=1.00 R=0.93
```
