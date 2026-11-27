---
title: Person-led LinkedIn posts for developer tools - format, link placement, disclosure and reach evidence
program: product
sub_program: channels
topic: channel-linkedin
worker: li-format-and-reach-evidence
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
scope: |
  Covered - which post format and link placement serve which goal, person versus Page, reposts/tags/collaborative posts, what LinkedIn itself says about its 2026 feed and AI content, disclosure duties, release-notes-to-post.
  Not covered - character, file and video limits (li-limits-and-fold), message and positioning (marketing), posting cadence (deferred), ads. FTC/EU/UK marketing law beyond the one disclosure point is the marketing sub-program's.
---

# Person-led LinkedIn posts: format, link placement, disclosure and reach evidence

Access date for every URL: 2026-11-27. LinkedIn Help pages show only a relative age ("Last updated: N ago") measured on that date, never an absolute date; the age is given as stated. Provenance tags: **LI** = LinkedIn itself, **GOV** = regulator, **IND** = independent or vendor observational dataset (all datasets below are vendor data unless noted), **ANEC** = anecdote or single-account test.

Evidence grades used in the decision tables: **A** = LinkedIn states it; **B** = large observational dataset with a within-author comparison and published method; **C** = vendor data lacking a method element, or measuring engagement rather than clicks; **D** = no usable evidence (convention).

## Table of contents
1. Summary
2. Findings (1 feed per LinkedIn; 2 person vs Page; 3 format by goal; 4 link placement; 5 reposts, tags, collaboration; 6 AI content and disclosure; 7 release-notes-to-post; 8 dataset audit; 9 scout figures re-checked)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- LinkedIn's own account of its 2026 feed: one LLM-embedding retrieval system matches post text to member profiles and history, and can show posts to people who do not follow the author ([LI engineering, 12 Mar 2026](https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed)). The post text and the author's profile text are therefore the retrieval inputs; this is the only mechanism LinkedIn documents.
- LinkedIn publishes no format ranking, no link penalty and no first-hour rule. Every format-by-reach and link-by-reach claim in circulation is third-party observational data.
- The format-by-goal evidence is grade C for every cell: the only large format table (Socialinsider) measures company Pages and engagement rate per impression, not person posts and not clicks.
- No dataset found measures developer-tool posts or clicks to a repository. State this gap in any skill that cites a number.
- Link placement default: put the URL as plain text in the post body, do not rely on an auto-generated link-preview card as the only visual. Best-controlled study (865,980 posts, same-creator comparison): preview card as only visual -35% impressions; URL typed in text about -2% to -3%, not measurable; first-comment link vs in-post URL -2%, not measurable ([MagicPost, 29 Oct 2026](https://magicpost.in/blog/linkedin-external-links-reach)). Grade B-, vendor-published.
- Clicks on a link placed in a comment are not counted by LinkedIn analytics ([MagicPost](https://magicpost.in/blog/linkedin-external-links-reach); [Sprout, 26 Apr 2023](https://sproutsocial.com/insights/linkedin-link-in-comments/)), so a comment link cannot be measured for repo traffic without UTM tagging.
- Person beats Page for engagement rate and comments in the one fetched large study (Metricool, 673,658 posts), but impressions per post were similar; the widely quoted "561% more reach" (Ordinal) could not be traced to a primary document and is unusable.
- LinkedIn's creator page says CEO posts get 4x engagement and 7x impressions, from "LinkedIn internal data", undated, no method ([LI](https://members.linkedin.com/create-grow)). Label it LI-claimed, unverifiable.
- LinkedIn defines "AI slop" and says generic content "is less likely to be widely distributed", while AI-assisted content "is welcome when it reflects a real person's perspective, experience, or expertise" ([LI Help, 1 month ago](https://www.linkedin.com/help/linkedin/answer/a1481496)). An agent drafting posts is the failure case unless the human supplies the first-hand material.
- LinkedIn recommends disclosing when AI heavily shaped a post (same page); its policy requires a "clear and conspicuous notice" of personal benefit when you endorse something in exchange for it ([LI policies](https://www.linkedin.com/legal/professional-community-policies), no effective date shown).
- The FTC's guide says material connection includes employment, the disclosure goes with the message, a profile page is not enough, and it must not sit behind a "more" click ([FTC, Nov 2019](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)). A maintainer or employee posting about their own tool has that connection.
- New or unestablished accounts are shown narrowly; comments from non-connections sort under Most Recent; verification "can help" reach ([LI Help, 1 month ago](https://www.linkedin.com/help/linkedin/answer/a16425028)).
- Collaborative posts: up to 5 collaborators, must be public, early-access only ([LI Help, 3 months ago](https://www.linkedin.com/help/linkedin/answer/a14240120)); Page collaboration is rolling out gradually, super admin only ([LI Help, 4 weeks ago](https://www.linkedin.com/help/linkedin/answer/a10950023)). Neither can be assumed available.
- Page RSS import does not auto-publish; a super or content admin is notified and must publish ([LI Help, 1 year ago](https://www.linkedin.com/help/linkedin/answer/a6804862)). A release-notes-to-post step should produce a draft for a named human, never publish.

## Findings

### 1. What LinkedIn itself says about the 2026 feed

- Retrieval: "a unified retrieval system leveraging advances in LLMs to generate a high-quality representation of our members and content"; k-nearest-neighbour over embeddings, candidates from beyond the member's network; ranking by a generative recommender over a member's interaction history. Published 12 Mar 2026, author Hristo Danchev ([LI engineering](https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed)). [LI]
- Cold start: for members with "only a profile headline and job title" the embeddings infer interests. Implication for a small account: the headline, About text and post text are what the matcher reads. The article says nothing about links, formats, Pages or posting time. [LI]
- Distribution page: reach depends on "connection strength", notification settings and activity; "Avoid being overly promotional"; verification is "one of many signals". The page does not address links or AI content. ([LI Help, 1 month ago](https://www.linkedin.com/help/linkedin/answer/a516930)) [LI]
- New accounts: "we temporarily limit how broadly posts and comments from new or not yet established accounts are shown" ([LI Help, 1 month ago](https://www.linkedin.com/help/linkedin/answer/a16425028)). [LI]
- Creator page anatomy: hook, concise message, personal perspective/story/unique take, question; "Relatability is far more important than perfection"; 2-5 posts a week (unsourced, undated, cadence is out of scope); no statistics ([LI create-start](https://members.linkedin.com/create-start), footer 2026). [LI]
- Creator page video advice: 90 seconds or shorter, vertical, hook at start, captions on ([LI create-grow](https://members.linkedin.com/create-grow), undated; video growth stat is Brunswick 2022). [LI, quoting a third party]
- Analytics: only impressions ("number of times your post was displayed on screen") and members reached ("displayed to at least once") are defined ([LI Help, 2 years ago](https://www.linkedin.com/help/linkedin/answer/a1624090)); post analytics are private to the author; retention 180 days video, 2 years articles/newsletters, 1,000 days discovery and social engagement counts, 400 days members reached ([LI Help, 1 week ago](https://www.linkedin.com/help/linkedin/answer/a525196)). Click and engagement-rate definitions are not on either page. [LI]

### 2. Person or Page

| Claim | Provenance | Date | Method completeness | Use |
|---|---|---|---|---|
| CEO posts 4x engagement, 7x impressions | LI, "LinkedIn internal data" ([create-grow](https://members.linkedin.com/create-grow)) | undated | none stated | cite as LI claim only |
| Personal profile engagement rate 2.60% vs Page 1.60%; impressions per post similar; profiles post 3.05/week vs 2.34 | IND vendor, Metricool ([16 Apr 2026](https://metricool.com/linkedin-trends/)); 673,658 posts, 63,108 accounts | 2025-2026 | date range and account-size mix not given | grade C; engagement rate, off-goal for repo traffic |
| Links: Pages +51% impressions, profiles -27% impressions | same Metricool page | same | same, no same-author control stated | grade C; profile figure agrees in sign with MagicPost |
| Profile 561% more reach than Page; Pages shown to 2-5% of followers | attributed to Ordinal, found only in secondary write-ups | 2026 | primary not located | unusable |
| Seven employees: 2.75x impressions, 5x engagement vs Page | Refine Labs, only via search summary; primary URL returned 404 | n/a | seven profiles | unusable |

Verdict on the commission question: the evidence supports person-led posting for engagement and comments (grade C) and the creator guidance fits (personal perspective), but no source measures person-vs-Page click-through for a developer tool. A Page earns its place only for things a profile cannot do: a destination for the company name, Page collaboration invites (super admin, gradual rollout), Page RSS import (admin-published). None of these is a reach argument. The fleet audit found no Page; the decision whether to create one is a brand decision (section 4).

### 3. Format by goal

LinkedIn states no format ranking. The only large format table fetched is Socialinsider, 2026 benchmarks ([published 16 Mar 2026, modified 6 Nov 2026](https://www.socialinsider.io/social-media-benchmarks/linkedin)).

Measured method facts from that page: 2,450,610 organic posts from about 26,000 **business pages** (bucket counts sum to 26,114); follower buckets <5K to 100K-1M; stated date range "January 2025 - December 2026" on a page published in March 2026 (the page admits it "contains 2025 values, presented as 2026"); exclusion text says accounts under 1,000 or over 100,000 followers were left out yet the sample contains a "<5K" and a "100K-1M" bucket; metric = engagement rate by impressions, plus impressions and likes. Account-size mix: given by bucket. Person posts: none. Clicks: none.

Engagement rate by impressions, 2025 (same page): native document 7.00%, multi-image 6.45%, video 6.00%, image 5.30%, text 4.50%, poll 4.20%, link 3.25%; overall 5.20%. Impressions per post by format reverse the order in several buckets (for 10-50K pages: multi-image 1,850, video 1,420, native document 1,150, text 845, link 340). Whichever format "wins" depends on the metric, and none is clicks.

Other format evidence, all vendor: Buffer (published 19 Dec 2025): PDF carousels best, about 3x video/images and nearly 6x text-only engagement, over 1 million posts, no method, no engagement definition, correlational ([Buffer](https://buffer.com/resources/linkedin-algorithm/)). Metricool (above): multi-image 3.71% engagement rate vs video 1.80%, single image 1.81%; carousels 1,451 impressions per post vs video 606. Van der Blom's playbook page (2026 edition, "1.3M+" posts; November update "800K+" posts from 25,000+ profiles and 8,000+ pages, EUR 199) lists "formats that win reach" as a chapter but publishes no format numbers on the page; its method is only partly disclosed ([playbook page](https://richardvanderblom.com/insights-playbook/)).

Developer-tool specificity: a search for evidence on dev-tool launch posts returned vendor blogs and opinion (X preferred for launch reach, LinkedIn for professional conversion), no dataset. Treat as D.

Format-by-goal default (what to choose when the goal is declared; every cell inherits the data gap above):

| Goal | Default format | Why | Grade |
|---|---|---|---|
| Awareness (new audience) | Text post with one image (terminal output or diagram), personal first-person angle | text+image avoids the link-card penalty; native document and multi-image lead engagement-per-impression for Pages; LinkedIn's own guidance is hook + personal perspective | C (engagement), A for anatomy |
| Repository traffic | Text post with the URL in the body text, no preview card as only visual; UTM-tag the URL | link-card -35% vs same-author baseline; comment links cannot be click-counted | B- for placement, D for clicks |
| Install / try-it | Text post with the exact install command in a code-like block plus one URL; or a short captioned screen recording (90 s or less per LI) | specificity is the credibility signal; no click data exists for either | D |
| Credibility (expertise) | Native document (PDF carousel) walking through a decision or benchmark, with a one-line summary post | document leads engagement rate in the Page benchmark; credibility is not a click metric | C |

The default hierarchy is a recommendation under uncertainty, not a finding; the skill must say so and ask the human to record the one metric (impressions, members reached, or UTM clicks) before posting.

### 4. Link placement

| Study | Date | Sample and method | Result | Caveat |
|---|---|---|---|---|
| MagicPost, 865,980 posts ([MagicPost](https://magicpost.in/blog/linkedin-external-links-reach)) | 29 Oct 2026 | 15,719 creators, Jul 2024-Jul 2026; 124,893 link posts compared with same creator's no-link posts in same quarter; excludes Pages and accounts under 100 followers; metric impressions; AI-rated "salesy" level matched; account-size mix not reported | all formats -17% (-11% vs equally salesy posts); preview card as only visual -35%; URL in image post -5%; URL in text/carousel/video not distinguishable from zero (about -3% overall); first-comment link vs URL in post -2%, "no measurable difference" (1,824 creators) | vendor (MagicPost sells LinkedIn tools); comment links detected by phrases, some missed; no clicks |
| MagicPost, 1.2M-post study, as summarised by [Composeur, 16 Oct 2026](https://composeur.fr/en/blog/link-in-comments-linkedin) | updated 5 Jun 2026 | 566,957 posts with synced stats, own-posts comparison | since mid-May 2026: card -19%, URL in text -21%, "link in the comments" mention -16%; before: -39%, -12%, -8% | secondary; conflicts with the 865k study on URL-in-text |
| Kliver Analytics, via Composeur | 14 Aug 2026 | shared 566,957-post set; medians | card post 414 impressions vs 795 without a link; typed URL 858 vs 786 without | secondary; medians across authors, no same-author control stated |
| Sprout Social | 26 Apr 2023 | 8 posts, one account, one month | link-in-comments about 8,136 vs link-in-post about 3,309 average impressions | ANEC; 2023; no clicks; tiny sample |
| Metricool | 16 Apr 2026 | see section 2 | profiles with links -27% impressions | no same-author control stated |
| Buffer (Oct 2026, as quoted by a third party) | claimed 5 Oct 2026 | 58,000 accounts, same-account comparison | link in own comment +15% impressions vs no link | primary page not found by search; unusable until fetched |
| Van der Blom playbook | 2026 | pinned comment with a link "reaches 12% of the post's readers" (reproduced); baseline not stated | secondary claims of link conversion 3.4x (Forbes, 403, not fetched) and 5.2x (via a third party) better in-post disagree with each other | unusable for numbers; paywalled report |

LinkedIn's position: silent on links (distribution page); "Avoid being overly promotional". [LI]

Default and grade: URL in the post body as plain text, hook and value before it, no card as the sole visual; grade B- for "do not rely on the card", D for "body beats comment" (the best study found no measurable difference and nobody counts comment clicks). If the rule needs one placement, body is the only one whose clicks LinkedIn can report.

### 5. Reposts, tags, collaboration

- Repost vs repost with thoughts: plain repost carries the original attached; "with your thoughts" adds your commentary; the original author sees the repost count and the comments added; connections-only and group posts cannot be reposted; LinkedIn "may limit reposting from members you're not connected with" ([LI Help, 3 weeks ago](https://www.linkedin.com/help/linkedin/answer/a525047)). No source measures the reach effect of either. [LI; effect D]
- Mentions: the person gets email and app notices; non-connections can be mentioned; "we may limit your ability to mention members you're not connected with"; no cap stated ([LI Help, 2 years ago](https://www.linkedin.com/help/linkedin/answer/a525082)). Buffer: tagging is useful when relevant to the person, no data ([Buffer](https://buffer.com/resources/linkedin-algorithm/)). Effect on reach: D.
- Collaborative posts (members): up to 5 collaborators, "must be public", early-access program only; accepted collaborators show the post on their profiles ([LI Help, 3 months ago](https://www.linkedin.com/help/linkedin/answer/a14240120)). Page collaboration: super admin only, gradual rollout ([LI Help, 4 weeks ago](https://www.linkedin.com/help/linkedin/answer/a10950023)). Effect on reach: no source. [LI; effect D]
- Comments by non-connections go to Most Recent, not Most Relevant ([LI Help](https://www.linkedin.com/help/linkedin/answer/a16425028)).
- Prohibited engineering: the community policy says "Don't do things to artificially increase engagement" and "Don't agree with others ahead of time to like or re-share each other's content" ([LI policies](https://www.linkedin.com/legal/professional-community-policies)). A rule that asks teammates to like or comment on launch day sits close to this line (section 4).

### 6. AI-assisted content and disclosure

- LinkedIn's definition: "low-effort, likely AI-generated content that may sound polished on the surface but lacks a clear point of view"; "Content that feels generic, repetitive, or lacks a clear point of view is less likely to be widely distributed"; "AI-assisted content is welcome when it reflects a real person's perspective, experience, or expertise"; when AI heavily shaped content, "tell readers". Members can flag posts via "Seems like AI slop" ([LI Help, 1 month ago](https://www.linkedin.com/help/linkedin/answer/a1481496)). [LI]
- LinkedIn news post, published 4 Jun 2026 (originally 20 May 2026 by Laura Lorenzetti): detection "correctly identifying generic content 94% of the time" in initial testing; such content "less likely to be widely distributed beyond a person's immediate network"; action against comments posted "at scale using automation tools, with little or no human involvement" and replies that only restate the post ([LI news](https://news.linkedin.com/2026/keeping-conversations-real-on-linkedin)). The 94% is LinkedIn's own self-reported test figure. [LI]
- Material connection: [FTC, dated Nov 2019](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers): "A 'material connection' to the brand includes a personal, family, or employment relationship or a financial relationship"; "The disclosure should be placed with the endorsement message itself"; "Disclosures are likely to be missed if they appear only on an ABOUT ME or profile page"; do not assume a platform tool suffices; not "anywhere that requires a person to click MORE". [GOV, US]
- LinkedIn's own policy: do not "endorse someone or something in exchange for personal benefit" unless "you have included a clear and conspicuous notice of the personal benefit you receive" ([LI policies](https://www.linkedin.com/legal/professional-community-policies), no effective date). Whether salaried promotion of one's employer's tool meets "personal benefit" is a legal reading (section 4). [LI]
- Third-party report, unverified against LinkedIn: a "Brand Partnership" label exists for compensated posts; sources disagree on its status; not a substitute for text disclosure per the FTC point above. No LinkedIn Help page for it was fetched; do not cite it as a mechanism.
- Fold: LinkedIn pages fetched do not publish the "see more" cut-off (scout finding; limits belong to li-limits-and-fold). The FTC rule means the affiliation statement must not rely on it, so place it in the first sentence.

### 7. Release notes to post

- LinkedIn Page RSS import: super or content admin only; the admin must hold the rights to the source; a notification says a post is ready, nothing publishes automatically ([LI Help, 1 year ago](https://www.linkedin.com/help/linkedin/answer/a6804862)). [LI]
- Verbatim reuse conflicts with LinkedIn's stated distribution preference: generic or repetitive content "is less likely to be widely distributed" (a1481496) and the creator anatomy asks for a hook and a personal perspective. No source measures duplicate-of-docs posts. [LI; effect D]
- Decision: the step belongs in a skill as a drafting step ending in a human-owned post, with the rule that the post must differ from its source in opening, framing and first-person content.

### 8. Dataset audit (measure, do not cite)

| Dataset | Sample | Account-size mix | Date range | Outcome metric | Verdict |
|---|---|---|---|---|---|
| Socialinsider 2026 | 2,450,610 posts, ~26,000 Pages | by bucket (<5K to 1M); stated exclusion contradicts buckets | stated "January 2025 - December 2026", published 16 Mar 2026 | engagement rate by impressions; impressions; likes | usable with caveats for Page format ordering; off-goal for repo traffic; no person posts; date range impossible as stated |
| MagicPost 865,980 | 865,980 posts, 15,719 creators | not reported | Jul 2024-Jul 2026 | impressions | usable for link placement (same-author); no clicks |
| Metricool 2026 | 673,658 posts, 63,108 accounts | "small and mid-sized", no breakdown | not specified; YoY 2025 to 2026 | impressions, interactions, comments, clicks, engagement rate | unusable for ranking (no date range, no mix) except as vendor context |
| Buffer, 19 Dec 2025 | ">1 million" posts | not reported | not stated | engagement undefined | unusable; correlational by its own admission |
| Van der Blom playbook page | 1.3M+ / 800K+ posts, 25,000+ profiles, 8,000+ Pages | not reported | contradictory ("since 2020", "Since October 2026") | reach vs author's own median | unusable as a number source; method partly disclosed; the report itself is paid and was not read |
| Sprout 2023 | 8 posts, one account | one | one month, undated | impressions, engagements | ANEC, 2023, not current |
| Buffer Oct 2026 link study | 58,000 accounts (secondary) | not reported | one year | impressions, engagements | primary not found; unusable |

Any number lacking sample, account mix, date range and metric is marked unusable above. Engagement-rate metrics (Socialinsider, Metricool, Buffer) are off-goal for repository traffic.

### 9. Scout figures re-checked

- Reproduced: LinkedIn engineering post date 12 Mar 2026; van der Blom pinned-comment link "reaches 12%"; CEO 4x/7x (undated, still undated); collaborative post cap of 5 and public-only; Page RSS import rules; Socialinsider date-range anomaly; Socialinsider exclusion of pages under 1,000 followers.
- Did not reproduce: "Socialinsider quotes LinkedIn: employees have ~10x connections and ~2x CTR" was not located on the fetched page extract (not specifically searched; treat as unconfirmed). The scout's "Socialinsider ... (3P, 16 Mar 2026)" date is right but the page was modified 6 Nov 2026.
- Scout claim "LinkedIn staff quoted that links are not penalised" was not found in any fetched LinkedIn page; the distribution page is silent on links.
- Scout (company-people) states metric definitions are absent from Help pages; confirmed except impressions and members reached on a1624090.

## Dated facts

Every figure below is also in Findings; this table is the single dated index. Tag: PLAT = LinkedIn or authority itself, IND = independent or vendor data. Help pages carry relative ages only (as of 2026-11-27).

| Fact | Source URL | Source date | Tag |
|---|---|---|---|
| Feed uses LLM-embedding retrieval, candidates beyond the follower network | https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed | 12 Mar 2026 | PLAT |
| Analytics retention: video and demographics 180 days, articles/newsletters 2 years, other discovery and engagement counts 1,000 days, members reached 400 days | https://www.linkedin.com/help/linkedin/answer/a525196 | "1 week ago" (re-fetched 2026-11-27) | PLAT |
| Collaborative posts: up to 5 collaborators, public only, early access | https://www.linkedin.com/help/linkedin/answer/a14240120 | "3 months ago" | PLAT |
| Page RSS import never auto-publishes | https://www.linkedin.com/help/linkedin/answer/a6804862 | "1 year ago" | PLAT |
| AI slop defined; generic content less likely distributed; tell readers when AI heavily shaped content | https://www.linkedin.com/help/linkedin/answer/a1481496 | "1 month ago" | PLAT |
| LinkedIn test detection 94% on generic content (self-reported) | https://news.linkedin.com/2026/keeping-conversations-real-on-linkedin | 4 Jun 2026 | PLAT |
| Material connection must be disclosed with the message, not only on profile | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | Nov 2019 | PLAT (US regulator) |
| Link preview card as only visual -35% impressions; first-comment link vs in-post URL -2%, not measurable (865,980 posts) | https://magicpost.in/blog/linkedin-external-links-reach | 29 Oct 2026 | IND vendor |
| Page engagement rate by format: document 7.00%, link 3.25% (2,450,610 Page posts) | https://www.socialinsider.io/social-media-benchmarks/linkedin | 16 Mar 2026, modified 6 Nov 2026 | IND vendor |
| Profile engagement 2.60% vs Page 1.60% (673,658 posts) | https://metricool.com/linkedin-trends/ | 16 Apr 2026 | IND vendor |
| PDF carousels best on engagement, no method | https://buffer.com/resources/linkedin-algorithm/ | 19 Dec 2025 | IND vendor |
| Link-in-comments test, 8 posts, one account | https://sproutsocial.com/insights/linkedin-link-in-comments/ | 26 Apr 2023 | IND anecdote |

## Normative guidance candidates

1. Severity: MUST. **MUST** state the post's single goal (awareness, repo traffic, install, credibility) and the one metric that judges it before drafting. Rationale: format evidence is goal-dependent and every cell is weak. Verify: the draft or plan has a `goal:` and `metric:` line; reading heuristic - pass "goal: repo traffic, metric: UTM clicks", fail "goal: engagement".
2. Severity: MUST. **MUST NOT** state any LinkedIn reach, format or link-placement effect as fact without a provenance tag (LI / IND / ANEC), the source's date, and the sample size. Rationale: agents repeat vendor folklore. Verify: grep each reference file for `(%|x|times|more reach)` and require a tag within the same sentence; named heuristic, pass "-35% impressions for a preview card (IND, MagicPost, 865,980 posts, 29 Oct 2026)", fail "links kill reach".
3. Severity: MUST. **MUST** write the first sentence so it makes a specific claim and states the author's relationship to the tool when one exists ("I maintain X"). Rationale: FTC and LinkedIn policy require the notice in the message, and the fold is unpublished. Verify: first sentence of the draft contains the relationship phrase; pass "I maintain ocx; this week it learned to ..."; fail a first sentence of "Excited to announce".
4. Severity: MUST. **MUST** put a material-connection statement in the post body when the author is employed by, paid by, or owns the product, never only in the profile or after the fold. Rationale: [FTC](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers) dated Nov 2019. Verify: check the first sentence or first line for the relationship; reviewer fails any draft whose only disclosure is the profile headline.
5. Severity: MUST. **MUST** put the URL as plain text in the post body, once, after the hook, and attach an image or leave no link preview as the only visual. Rationale: preview card as sole visual is -35% in the best-controlled dataset. Verify: draft contains exactly one `https://` URL outside the first sentence; check the composer shows an image attached, not only a card; limit - confirm the card state manually in the composer.
6. Severity: SHOULD. **SHOULD NOT** move the link to the first comment for reach. Rationale: no measurable difference (-2%) and comment clicks are uncounted. Verify: draft body contains the URL; if a comment link is used anyway, the URL carries a UTM parameter: `grep -E 'utm_source=linkedin'`.
7. Severity: MUST. **MUST** tag every repo link with `utm_source=linkedin&utm_medium=social&utm_campaign=<slug>` when the goal is repo traffic. Rationale: LinkedIn's definitions page defines only impressions and members reached; clicks are otherwise unmeasurable. Verify: `grep -E 'utm_(source|medium|campaign)=' draft.md`; also a UTM-capable link target must exist (GitHub repos ignore UTM in the repo page itself; use a redirect page under owned control, so ask the owner, section 4).
8. Severity: MUST. **MUST** include a first-hand element only the author's team could produce: a number, a command and its real output, a failure, or a decision with a trade-off. Rationale: LinkedIn: generic content "is less likely to be widely distributed"; AI-assisted content is welcome when it "reflects a real person's perspective". Verify: reading heuristic - delete the tool's name; if the post still reads as true of a competitor, fail. Pass: "ocx install took 0.4 s on a 1.2 GB cache; cold start 3.1 s (command: `hyperfine ...`)". Fail: "Our tool makes workflows faster."
9. Severity: MUST. **MUST NOT** publish a post the agent generated without a named human who confirms the first-hand claims are true. Rationale: fabricated specifics break LinkedIn's misleading-content policy. Verify: the draft header names the author and carries `reviewed-by: <human>`.
10. Severity: SHOULD. **SHOULD** tell the audience when AI heavily shaped the text. Rationale: LinkedIn recommends it ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)). Verify: ask the human; if yes, a plain statement appears in the post (see section 4 for the owner's choice).
11. Severity: MUST. **MUST NOT** run comment or reaction automation, and MUST NOT ask or script teammates to like or comment in coordination. Rationale: policy: "Don't do things to artificially increase engagement"; LinkedIn acts on automated comments "at scale". Verify: no draft contains "everyone please like/comment", no task creates comment automation; `grep -iE 'please (like|comment|share)'`.
12. Severity: SHOULD. **SHOULD** use format by declared goal per the default table (text+image, text+URL, document for credibility, captioned video of 90 seconds or less) and mark it a convention, grade C. Rationale: LinkedIn publishes no format ranking, and the vendor data ranks formats differently by metric (section 3), so the goal, not a universal winner, must pick the format and the weak evidence must stay visible. Verify: draft's `format:` appears in the table row for its `goal:`.
13. Severity: SHOULD. **SHOULD** make the first-person employee post the default surface; create no Page or Page post as a reach tactic. Rationale: Page reach evidence is vendor data without click metrics; the Page earns its place only for collaborations and RSS import. Verify: the plan names a person as author for every post.
14. Severity: MUST. **MUST** end a release-notes-to-post step in a draft file addressed to a named human; it never calls a posting API or RSS auto-import. Rationale: Page RSS import is admin-published; LinkedIn acts on automation. Verify: no `linkedin.com/rest` or `/v2/ugcPosts` call in the step; the output file is a `.md` draft.
15. Severity: MUST. **MUST** differ from the source: opening sentence not copied from the release notes; at most 20% of the draft's 6-word sequences appear in the source (threshold proposed by this worker, not sourced). Verify: compute shared 6-gram share between draft and source:
```
python3 -I - <<'PY' draft.md notes.md
import sys,re
w=lambda p:re.findall(r"\w+",open(p).read().lower())
g=lambda t:{tuple(t[i:i+6]) for i in range(len(t)-5)}
d,s=g(w(sys.argv[1])),g(w(sys.argv[2]))
print(len(d&s)/max(len(d),1))
PY
```
Pass under 0.20; fail at or above.
16. Severity: SHOULD. **SHOULD** verify the profile (and complete headline and About) before a launch post from a new account. Rationale: new accounts are "temporarily limited"; the retrieval reads profile text. Verify: checklist item "profile verified: yes/no; headline names the topic of the post".
17. Severity: SHOULD. **SHOULD** limit tags to people who are named in the content and agreed to be named, with the post audience Public. Rationale: LinkedIn may limit mentions of non-connections; no cap published. Verify: count `@`-mentions in the draft against a `consented:` list.
18. Severity: SHOULD. **SHOULD** record the analytics export date: post analytics counts last 1,000 days and members reached 400 days, demographics 180 days. Rationale: LinkedIn deletes older analytics on those windows (a525196, re-fetched 2026-11-27, page 'Last updated: 1 week ago'; video and demographics 180 days, other counts 1,000 days, members reached 400 days), and analytics are the only way to judge the metric rule 1 requires. Verify: plan has an export reminder inside the shortest window needed.

## What an agent must not decide alone

- Whether to create a company Page, who is its admin, and the brand voice: brand and business decision. Recommendation from this evidence: not now as a reach lever, ask the owner.
- Whether a person posting about their employer's or their own open-source tool has a "material connection" in each jurisdiction, and the exact disclosure wording: legal call (FTC is US; the fleet's audience is global). Ask.
- Whether to disclose AI assistance in the post: LinkedIn recommends it only when AI heavily shaped the content; the owner sets policy.
- Whether teammates, contributors or customers are asked to engage, repost or be tagged: a request to coordinate engagement sits near LinkedIn's policy line; and tagging people needs their consent.
- Which person's name, face and profile carries the launch posts: personal decision.
- Posting to LinkedIn at all, from which account, and when: no agent holds credentials; publishing is a human act.
- Whether to put a tracking redirect under an owned domain: ask the owner (the audit lists the fleet's domains; GitHub repo pages do not preserve UTM analytics).

## AI-agent angle

| Typical agent mistake | Smallest mechanical check |
|---|---|
| States "links kill reach" or "put the link in the first comment" as established | provenance-tag grep from rule 2; reviewer reads the table in section 4 |
| Repeats "saves count 5x a like" or "first hour decides everything" as LinkedIn fact | no LinkedIn page fetched states either; grep for `5x\|first hour` without a tag |
| Pastes a bare GitHub URL and lets the preview card render as the only visual | composer check; draft must list an attached image |
| Rewrites release notes into a bullet-list post with "Excited to announce" | rule 15 n-gram check plus rule 8 delete-the-name test |
| Invents a benchmark number or a quote to give the post specificity | rule 9: named human; `hyperfine`/command output pasted from the actual run |
| Omits the affiliation because the profile already says it | rule 3/4 first-sentence check |
| Cites Socialinsider "native document wins" as a reach finding for dev tools | the dataset is Pages, engagement-rate; the table in 3 states grade C |
| Proposes pods, comment-for-reach prompts, or comment automation | rule 11 grep and policy citation |
| Treats a Help page "Last updated: 1 month ago" as an absolute date | record the page and the access date; refresh quarterly |

## Contested / evolving

- Link in body vs first comment. For: Sprout (26 Apr 2023, 8 posts, one account) found link-in-comments higher by about 2.5x in impressions; Buffer, as quoted by a third party, found +15% (unverified). Against: MagicPost 865,980 posts found -2% (not measurable); MagicPost 1.2M study (via Composeur) found -16% for a "link in the comments" mention since mid-May 2026; van der Blom says LinkedIn hides link comments from most readers (secondary) and a link in a comment converts worse (3.4x vs 5.2x by two different secondary reports; unusable). Trend: link-card penalty shrinking (-39% for Jul 2024-Jun 2025 to -27% for Jan-Jul 2026 per MagicPost), as of Oct 2026.
- Is there any link penalty at all? Kliver (via Composeur, 14 Aug 2026): typed URL posts had a higher median than no-link posts (858 vs 786) while cards were lower; MagicPost says an overall -11%; Metricool says Pages +51%, profiles -27%. Disagreement on direction by account type. Trend unsettled.
- Person vs Page: Metricool and Refine Labs-type data favour profiles on engagement; AuthoredUp (via a search summary, not fetched) found Pages slightly ahead on engagement rate (2.65% vs 2.45%) while profiles reached about twice the audience. Method not verified for either.
- Format ranking: Socialinsider puts native documents first by engagement rate, multi-image first by impressions; Metricool puts multi-image first; Buffer puts PDF carousels first; Socialinsider reports video views down 36% year over year (page statement). Evolving.
- AI content: LinkedIn announced the "Seems like AI slop" control and a 94% test accuracy (2026); the effect on posts that are AI-assisted but well-edited is unmeasured. Evolving through 2026.
- LinkedIn Help pages carry relative ages only; any number from a page aged "2 years ago" (mentions, analytics definitions) may be stale.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed | LI engineering, feed retrieval and ranking | 12 Mar 2026 | primary account of the 2026 feed |
| https://members.linkedin.com/create-grow | LI creator guidance, CEO stat, video tips | undated, footer 2026 | LI's own claims and their provenance |
| https://members.linkedin.com/create-start | LI creator post anatomy | undated, footer 2026 | LI's post anatomy list |
| https://www.linkedin.com/help/linkedin/answer/a516930 | LI Help, distribution of content | 1 month ago (relative) | what LI says about distribution |
| https://www.linkedin.com/help/linkedin/answer/a16425028 | LI Help, new accounts and verification | 1 month ago | cold-start and comment visibility |
| https://www.linkedin.com/help/linkedin/answer/a1481496 | LI Help, AI-assisted content and "AI slop" | 1 month ago | AI content distribution and disclosure advice |
| https://news.linkedin.com/2026/keeping-conversations-real-on-linkedin | LI news post | 4 Jun 2026 (orig. 20 May 2026) | detection claim and automation stance |
| https://www.linkedin.com/legal/professional-community-policies | LI Professional Community Policies | no date shown, footer 2026 | spam, endorsement notice, engagement manipulation |
| https://www.linkedin.com/help/linkedin/answer/a525047 | LI Help, repost vs repost with thoughts | 3 weeks ago | repost rules |
| https://www.linkedin.com/help/linkedin/answer/a525082 | LI Help, mentions | 2 years ago | tag rules |
| https://www.linkedin.com/help/linkedin/answer/a14240120 | LI Help, collaborative posts (members) | 3 months ago | cap, public only, early access |
| https://www.linkedin.com/help/linkedin/answer/a10950023 | LI Help, collaborative posts (Pages) | 4 weeks ago | super admin, gradual rollout |
| https://www.linkedin.com/help/linkedin/answer/a1624090 | LI Help, post impressions / members reached definitions | 2 years ago | the only defined metrics |
| https://www.linkedin.com/help/linkedin/answer/a525196 | LI Help, post analytics retention | 1 week ago | retention windows |
| https://www.linkedin.com/help/linkedin/answer/a6804862 | LI Help, Page RSS import | 1 year ago | no auto-publish |
| https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | FTC guide (GOV) | Nov 2019 | material connection and placement |
| https://www.socialinsider.io/social-media-benchmarks/linkedin | Socialinsider benchmarks (vendor) | 16 Mar 2026, modified 6 Nov 2026 | method and format table |
| https://magicpost.in/blog/linkedin-external-links-reach | MagicPost link study (vendor) | 29 Oct 2026 | best-controlled link placement data |
| https://composeur.fr/en/blog/link-in-comments-linkedin | Composeur roundup of link studies (secondary) | 16 Oct 2026 | other datasets with methods |
| https://eksis.io/blog/linkedin-link-in-post-or-first-comment | roundup of link studies (secondary) | 2026 | Buffer, LinkPost, van der Blom, Ordinal summaries; not primary |
| https://metricool.com/linkedin-trends/ | Metricool 2026 study (vendor) | 16 Apr 2026 | person vs Page, links |
| https://buffer.com/resources/linkedin-algorithm/ | Buffer LinkedIn data (vendor) | 19 Dec 2025 | format claims, no method |
| https://richardvanderblom.com/insights-playbook/ | van der Blom report sales page (vendor) | 2026 | sample claims; paywalled report not read |
| https://sproutsocial.com/insights/linkedin-link-in-comments/ | Sprout link-in-comments test (ANEC) | 26 Apr 2023 | small-sample counterexample |

Not fetched or failed: Forbes 26 Nov 2026 article on van der Blom data (HTTP 403, not used); Refine Labs personal-vs-Page page (HTTP 404, not used); Ordinal primary study (not located); Buffer Oct 2026 link study (not located); the paid van der Blom report. The central question was sourced; the evidence gaps above are the finding, not a block.
