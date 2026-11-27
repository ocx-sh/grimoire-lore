---
title: Channels topic map (product program, channels sub-program)
program: product
sub_program: channels
date: 2026-11-27
model: opus
revision: 2 (answers the completeness critic; see "Critic responses")
---

# Channels topic map

This map turns 13 channel scouts and 10 product audits into one wave of deep dives. The scouts are under `.agents/research/marketing-topic-map/` and the audits under `.agents/research/product-audit/`. The map makes four decisions:

- which channel questions the fleet researches now;
- which questions wait;
- which questions belong to a sibling sub-program;
- which rules and skills the answers must ship as.

This is revision 2. A completeness critic reviewed revision 1. Every criticism is either applied in place or answered under "Critic responses".

## How to read this

**Inputs.** The map reads every candidate row in the 13 channel scouts and the ten audits, weighting the five that bear on distribution:

- `distribution-posture.md`
- `exemplar-youtube-channels.md`
- `exemplar-readmes.md`
- `messaging-inventory.md`
- `config-inventory.md`

Where an audit contradicts the frame (`.agents/research/product-frame.md`), the audit wins. Where two audits contradict each other, the map names the conflict and says which observation it follows (see frame correction 1). Every contradiction is listed under "Frame corrections".

**Scout row references.** A reference reads `<abbreviation>#<candidate number>`. The number is the row number in that scout's candidate table.

The YouTube packaging scout's candidate table has no numbers. Its rows are numbered here in table order, from 1 ("Title hard limit is 100 characters") to 38 ("API thumbnail upload constraints").

| Abbreviation | Scout file |
|---|---|
| LO | `marketing-topic-map/channel-linkedin-organic.md` |
| LC | `marketing-topic-map/channel-linkedin-company-people.md` |
| LA | `marketing-topic-map/channel-linkedin-ads.md` |
| YP | `marketing-topic-map/channel-youtube-packaging-retention.md` |
| YS | `marketing-topic-map/channel-youtube-search-shorts-policy.md` |
| VP | `marketing-topic-map/channel-video-production-software.md` |
| SF | `marketing-topic-map/channel-short-form-video.md` |
| MB | `marketing-topic-map/channel-microblog.md` |
| CM | `marketing-topic-map/channel-communities.md` |
| LP | `marketing-topic-map/channel-launch-platforms.md` |
| GH | `marketing-topic-map/channel-github-as-channel.md` |
| AE | `marketing-topic-map/channel-audio-events.md` |
| OP | `marketing-topic-map/channel-owned-publishing.md` |

Audit findings that no scout row carries are cited by file and smell or pattern number, for example "distribution-posture smell 8".

**Coverage** says how far the published catalog already answers a candidate:

- **covered**: an existing rule or skill answers it.
- **partial**: something in the catalog touches it, but no rule or skill decides it.
- **uncovered**: nothing in the catalog addresses it.

The catalog has 25 rules, 50 skills and 13 bundles (`product-audit/config-inventory.md`). Of those, the only ones that touch channels are:

- the docs skills (DOC-TYPE-10..15 landing counts);
- DOC-PLAIN-22, which covers AI disclosure in PR bodies only;
- `css-theming` (contrast thresholds for pages);
- installer-script;
- shell-integration.

`rules/docs-quality.md` has no rule on registry READMEs: `grep -n -i "registr\|crates.io\|relative link\|pypi" rules/docs-quality.md` returns nothing. Not one fleet configuration file mentions LinkedIn, YouTube, Hacker News, Product Hunt, Reddit, Mastodon, Bluesky or X (`product-audit/config-inventory.md`).

**Priority** is judged on two things:

- what this fleet runs today (GitHub, one YouTube channel, personal LinkedIn profiles and a 5-member Discord, per `product-audit/distribution-posture.md` section 4);
- what any small software team would hit.

The abstract importance of the discipline does not count. The levels are:

- **High**: an adopter acts on it this quarter, agents demonstrably get it wrong, and a rule or skill step can check it.
- **Medium**: two of those three.
- **Low**: one or none.

**Disposition** has five values:

- **Selected** names the dive that owns the candidate.
- **Split** names the dives or sibling that own each part.
- **Deferred** points to the "Deferred" section.
- **Hand-off** names the sibling sub-program that owns it.
- **Folded** names the selected candidate it was merged into.

**Scout figures are claims.** Every figure a brief quotes from a scout is a claim for the dive to re-fetch, not a given. Each brief says so in its own words, because the brief is handed to its worker verbatim.

**Sanctioned access only.** Measurements on LinkedIn, YouTube, X, Reddit and other platforms go through documented public APIs, official feeds or public help and legal pages. A dive does not render or scrape member content unless the platform's terms permit it, and it reads those terms first. This follows the LinkedIn prohibited-software page cited in `product-audit/distribution-posture.md` section 4 (https://www.linkedin.com/help/linkedin/answer/a1341387).

## The map

### Group 1: cross-platform publishing boundary

Rule file `channel-publishing`. ID family `CH-CORE`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-CO-1 | What may an agent do on each platform: draft, schedule, post, reply, submit or pay? | LO#13, LO#14, LC#17, LC#18, MB#1, MB#2, MB#27, YS#16, YS#17, LP#17, LP#40, CM#3 | uncovered | High. Agents would default to posting through APIs. Several terms forbid it (LinkedIn User Agreement section 8.2, https://www.linkedin.com/legal/user-agreement; YouTube developer policies, https://developers.google.com/youtube/terms/developer-policies). One rule checks it on every channel task. | Selected: channel-agent-boundary / core-agent-action-boundary |
| M-CO-2 | Which platform-native labels must be set (AI use, paid promotion, bot account, branded content), and where a disclosure sits inside each format (in-video before the mention, before a post's fold) | LO#15, YS#11, YS#12, SF#19, SF#20, SF#21, SF#24, VP#25, VP#26 (machine-readable marking), VP#27 (placement), MB#3, MB#28, OP#11 | uncovered | High. The labels are toggles and fields an upload checklist can verify, and an agent filling metadata skips them. Placement in a video script is lintable (VP#27). | Selected: channel-agent-boundary / core-platform-labels |
| M-CO-3 | How fast do channel facts decay, how are undated help pages cited, and what refresh cadence does a skill carry? | LO#6, LC#34, LA#35, YS#31, YP#35, VP#37, SF#32, MB#9, MB#34, CM#32, CM#33, LP#33, GH#34, GH#40, AE#38 | uncovered | High. Every scout flags decay. Help pages carry only relative dates. The frame's third falsifier depends on it. | Selected: channel-agent-boundary / core-facts-and-channel-inventory |
| M-CO-4 | Which legal standard governs disclosure of a material connection, sponsorship or AI content: FTC 16 CFR 255, EU UCPD, Directive 2024/825, AI Act Article 50, ASA? | LO#16, LO#17, LO#36, LC#11 to LC#15, AE#30 to AE#32, OP#12, OP#13, SF#22, SF#23, SF#25, MB#29, CM#10, CM#31, VP#26 (AI Act Art. 50 scope), VP#27 (FTC placement standard) | uncovered | The law is marketing territory. Channels consume its verdict and only place the label (M-CO-2). | Hand-off: marketing (marketing law) |
| M-CO-5 | Who owns publishing credentials, and what may be stored in the repository? | MB#38, LC#10 | uncovered | High. A token committed for a scheduler is a security failure, and a secret scan checks for it. | Folded into M-CO-1 |
| M-CO-6 | Channel inventory and inbound links: which accounts the organisation runs, when each was last checked, and whether every owned surface links them | none; distribution-posture smell 4 and pattern 8; exemplar-youtube-channels "Fleet evidence" | uncovered | High. The YouTube channel is linked from 0 of 17 repositories and no site; the Discord invite appears in 4 OCX places and 0 Grimoire places (`product-audit/distribution-posture.md`). An agent writing a README or release note otherwise invents or omits a handle. A grep checks it. | Selected: channel-agent-boundary / core-facts-and-channel-inventory |

### Group 2: LinkedIn organic posting

Skill `linkedin-post`. ID family `CH-LI`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-LI-1 | Hard limits per post format (text, link, image, document, poll, video file), the "see more" fold on desktop and mobile, and what lines 1 to 3 carry | LO#1, LO#2, LO#21, LO#23, LO#30, LO#31, LC#7, LC#27, LC#28; the limits half of LO#3 and LC#5 | uncovered | High. The 3,000-character limit is published (https://www.linkedin.com/help/linkedin/answer/a528176) but the fold is not, and it cannot be measured by an agent without automated access LinkedIn prohibits. Length and dimension checks are mechanical. | Selected: channel-linkedin / li-limits-and-fold |
| M-LI-2 | Which format serves which goal (text, document, image, video, poll) for a developer-tool post | LO#20; the format-choice half of LO#3 and LC#5 | uncovered | High. Vendor data conflicts and agents pick a format by habit. | Selected: channel-linkedin / li-format-and-reach-evidence |
| M-LI-3 | Link in the body, in the first comment or nowhere | LO#4, LC#8 | uncovered | High. This is the most contested LinkedIn claim, and agents repeat the "link in comments" folklore. Link-preview card rules (LO#30) sit in M-LI-1. | Selected: channel-linkedin / li-format-and-reach-evidence |
| M-LI-4 | Which algorithm claims are LinkedIn's own, and what the 2026 feed architecture implies | LO#5, LO#7, LO#8, LO#27, LO#28 | uncovered | Medium. The answer gives the skill its provenance labels. No rule can check reach directly. | Folded into M-LI-2 |
| M-LI-5 | Posting cadence | LO#9, LO#10, LC#9 | uncovered | Low. The vendor data is confounded and a repository cannot check cadence. | Deferred |
| M-LI-6 | Post anatomy for an engineer audience: template hooks versus technical specificity | LO#11, LC#36, LC#37 | uncovered | High. Agents write the template hook-list-CTA shape. The scout reports vendor data of generic posts down 28% and detailed posts up 14% (LO#39, vendor). | Selected: channel-linkedin / li-format-and-reach-evidence |
| M-LI-7 | Engagement bait, pods, coordinated cross-account boosting | LO#12, LO#13, LO#35, LC#19 | uncovered | High. Agents propose "comment KEYWORD" calls and team-wide reposting rings. Both can be detected in a draft. | Selected: channel-linkedin / li-policy-and-ai-content |
| M-LI-8 | LinkedIn's guidance on AI-generated posts, the "generic content" penalty, and the negative-feedback reach reduction on low-quality posts and video, including whether it reverses | LO#15, LO#39, LO#40, LC#20 | uncovered | High. Every draft this skill makes is AI-assisted. LinkedIn's AI content page (https://www.linkedin.com/help/linkedin/answer/a1481496) judges value, not origin. LO#40 cites Help a10728043: reduced reach to non-followers, "temporary, not permanent" (scout claim, page dated only "7 months ago"). | Selected: channel-linkedin / li-policy-and-ai-content |
| M-LI-9 | Where an employee or maintainer connection line sits inside the post and fold | LO#17, LC#11, LC#12 | uncovered | High. The placement is a channel question. The legal standard is the marketing sibling's (M-CO-4). | Selected: channel-linkedin / li-policy-and-ai-content |
| M-LI-10 | Page versus founder split, reposts, tags, collaboration posts, founder-led evidence | LO#19, LO#25, LO#38, LC#1 to LC#4, LC#35 | uncovered | High. The fleet has no company page (`product-audit/distribution-posture.md`), so this decides whether to create one. | Selected: channel-linkedin / li-format-and-reach-evidence |
| M-LI-11 | Accessibility of the posted artifact: image alt text, document PDFs, video captions | LO#22, LC#6 | uncovered | High. It can be checked before posting, and agents omit alt text (`channel-microblog.md` measured the same gap on Bluesky). | Split: image alt text and document PDFs in li-limits-and-fold; video captions on every platform in vid-accessibility |
| M-LI-12 | Hashtag count and kind | LO#24 | uncovered | Low. No primary evidence of effect, and the rule would be cosmetic. | Deferred |
| M-LI-13 | Comment strategy, pinned comments, comment controls and visibility on launch posts | LO#26, LO#41, LC#33 | uncovered | Medium. Moderation of a launch post matters, but no artifact can check it beyond one visibility item. | Deferred |
| M-LI-14 | Repurposing a README or release notes into a post; Page RSS import | LO#37 | uncovered | Medium. The fleet's release notes are generated, so this is the cheapest source of a post. | Folded into M-LI-6 |
| M-LI-15 | Measurement validity: what Page and post analytics mean, vendor benchmark methods | LO#32, LO#33, LC#29, LC#30, LC#39 | uncovered | Medium. A skill that reports results needs it. Small-account noise dominates. | Folded into M-LI-2 |
| M-LI-16 | Newsletter, article, Live and events | LO#29, LC#25, LC#26 | uncovered | Low. The scout reports a 150-follower gate (`channel-linkedin-company-people.md`), which the fleet does not meet. | Deferred |
| M-LI-17 | Personal profile surfaces: headline, About, Featured, website link, verification | LC#21 to LC#24 | uncovered | Low. These are personal settings outside any repository, and the limits are unpublished and conflicting. | Deferred |
| M-LI-18 | Page administration: admin roles and bus factor, page types, tagline, CTA, name, employee list, Life tab | LC#10, LC#30 to LC#32, LC#38, LC#41, LC#42 | uncovered | Low now. It becomes relevant only if M-LI-10 decides to create a page. | Deferred |
| M-LI-19 | Suggested Feeds and topical positioning | LC#40 | uncovered | Low. Evidence is unclear and the claim is not checkable. | Deferred |
| M-LI-20 | Fabricated testimonial or benchmark in a post | LO#18 | uncovered | Claim policy is marketing territory. | Hand-off: marketing (messaging, claims) |
| M-LI-21 | Advocate posts feeding LinkedIn AI search | LO#34 | uncovered | Answer-engine visibility is marketing territory. | Hand-off: marketing (SEO and answer engines) |
| M-LI-22 | Native scheduling, third-party schedulers, invitations, cold outreach | LO#14, LC#16, LC#17 | uncovered | High as a boundary. The tactics themselves are out of scope. | Folded into M-CO-1 |

### Group 3: LinkedIn paid

Skill: none this wave. ID family reserved: `CH-LIADS`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-LA-1 | Ad copy truncation points and emoji limit | LA#1, LA#2, LA#4 | uncovered | Low. The fleet has no paid budget (`product-audit/distribution-posture.md`). | Deferred |
| M-LA-2 | Ad image and video specs; document ads | LA#3, LA#5 | uncovered | Low. Same reason as M-LA-1. | Deferred |
| M-LA-3 | Thought Leader Ads eligibility and performance | LA#6, LA#7 | uncovered | Low. Same reason as M-LA-1. | Deferred |
| M-LA-4 | Targeting defaults: audience expansion, Audience Network, minimum audience, account lists, lookalike replacement, Auto-Targeting | LA#8 to LA#13 | uncovered | Low. The UI and API defaults disagree, which is worth a rule when paid spend starts. | Deferred |
| M-LA-5 | Lead Gen Form fields, validation, consent, CRM hand-off | LA#14 to LA#17 | uncovered | Low. Consent law is marketing territory. | Deferred |
| M-LA-6 | Attribution window, Insight Tag versus Conversions API, match quality | LA#18 to LA#21 | uncovered | Low. Analytics is marketing territory. | Deferred |
| M-LA-7 | Bidding, creatives per ad set, removed features, end-2026 API changes | LA#22 to LA#24, LA#30 | uncovered | Low. These changes are time-boxed. | Deferred |
| M-LA-8 | Ad claim policy, AI disclosure, macros, creative accessibility, tracking parameters | LA#25 to LA#29 | uncovered | Low. Same reason as M-LA-1. | Deferred |
| M-LA-9 | Cost per click, lag to revenue, brand versus activation, connected TV, event and newsletter promotion | LA#31 to LA#34 | uncovered | Low. Vendor data, and a budget question. | Deferred |

### Group 4: YouTube

Skill `youtube-video`. ID family `CH-YT`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-YT-1 | Title, description, tag and hashtag limits; what the first description lines carry | YS#1, YS#2, YS#3, YS#35, YP#1, YP#2, YP#21 | uncovered | High. The ocx channel has an empty description (`product-audit/distribution-posture.md`). Educator channels put a link in the first three lines 76% of the time, company channels 35% (`product-audit/exemplar-youtube-channels.md`). A linter can check it. | Selected: channel-youtube / yt-upload-metadata-contract |
| M-YT-2 | Chapter format and value | YS#4, YS#5, YP#20, VP#10, AE#18 | uncovered | High. Only 28% of long-form videos in the audit have chapters. The rules are parseable (https://support.google.com/youtube/answer/9884579). | Selected: channel-youtube / yt-upload-metadata-contract |
| M-YT-3 | Thumbnail file spec, the vertical-video 4:5 replacement, thumbnail accessibility | YS#9, YS#10, YS#33, YP#3, YP#4, YP#32, VP#39 | uncovered | Medium. The file spec is checkable. Design quality is not measurable without Studio. | Selected: channel-youtube / yt-upload-metadata-contract |
| M-YT-4 | Title-thumbnail pairing, curiosity versus clarity, the promise kept in the first 30 seconds | YP#5, YP#6, YP#7 | uncovered | Low. The audit found no title feature lifting the median by more than about 14%, apart from company announcement titles. Not checkable. | Deferred |
| M-YT-5 | Misleading metadata, malicious clickbait, thumbnail strikes | YS#14, YP#8, YP#9 | uncovered | High. Agents optimising titles drift toward clickbait. The scout reports strikes on a 90-day window (https://support.google.com/youtube/answer/9229980). | Selected: channel-youtube / yt-content-policy-and-series-risk |
| M-YT-6 | Inauthentic (templated, mass-produced) content | YS#15, YP#29 | uncovered | High. The live "OCX Shorts NN" series is templated by design (`product-audit/distribution-posture.md`). The scout reports a policy rename on 2025-07-15 (https://support.google.com/youtube/answer/1311392). | Selected: channel-youtube / yt-content-policy-and-series-risk |
| M-YT-7 | Test and Compare, impressions CTR baseline, retention reading | YS#20, YS#21, YS#22, YP#10 to YP#14, YP#16, YP#35 | uncovered | Medium. YouTube's own test optimises watch-time share, not CTR (https://support.google.com/youtube/answer/16391400). Agents repeat CTR folklore. | Selected: channel-youtube / yt-measurement-and-testing |
| M-YT-8 | Hook, intro, length by intent, closing, end screens and cards | YP#17 to YP#19, YP#22, YP#23, VP#7, VP#8, VP#35 | uncovered | Medium. End-screen and card limits are checkable. Hook timing has no primary source (SF#13). | Split: end-screen and card limits in yt-upload-metadata-contract; length and closing in yt-format-portfolio |
| M-YT-9 | Shorts spec and what counts as a view; the success test a Shorts series must pass | YS#6, YS#7, YS#8, YS#30, SF#2, SF#11, AE#24 | uncovered | High. The fleet already ships Shorts, and reports that cite views without the definition mislead. | Selected: channel-youtube / yt-measurement-and-testing |
| M-YT-10 | Format portfolio: Shorts, long-form, announcements, live, series; company versus educator channel | YP#24, YP#25, YP#26, YP#27, YS#27, SF#1, SF#12, SF#31, SF#34 | uncovered | High. Company channels draw a median of 2,506 views against 72,825 for educators. Live streams and talks sit at a 0.0 to 0.18 ratio (`product-audit/exemplar-youtube-channels.md`). | Selected: channel-youtube / yt-format-portfolio |
| M-YT-11 | AI-use attribute, paid promotion, made-for-kids per video | YS#11, YS#12, YS#13, YP#28, VP#25, SF#19 | uncovered | High. These are upload fields. The cross-platform label mechanics are owned by M-CO-2. Made-for-kids is YouTube-only. | Split: made-for-kids in yt-upload-metadata-contract; labels in core-platform-labels |
| M-YT-12 | API consent and quota for agent uploads | YS#16, YS#17, YP#38 | uncovered | High. Covered by the cross-platform boundary. | Folded into M-CO-1 |
| M-YT-13 | Captions, auto-dubbing default, localisation | YS#18, YS#19, YP#30, YP#31 | uncovered | High. The scout reports auto-dubbing on by default and mistranslating CLI output (`channel-youtube-search-shorts-policy.md`). | Split: channel defaults in yt-upload-metadata-contract; caption quality and delivery in vid-accessibility |
| M-YT-14 | Channel-level defaults and verification feature gates | YS#32, YS#34 | uncovered | High. These are set once and checked once, and the ocx channel has none (`product-audit/distribution-posture.md`). | Selected: channel-youtube / yt-upload-metadata-contract |
| M-YT-15 | Content ID risk in screen recordings and live coding | YS#28, VP#28, AE#34, AE#35 | uncovered | Medium. Background music in a demo is the realistic trigger. | Selected: channel-youtube / yt-content-policy-and-series-risk |
| M-YT-16 | Re-titling uploaded conference talks; search versus browse intent; vendor data reliability | YP#33, YP#34, YP#37 | uncovered | Low. Talks underperform in the audit, and vendor tools are not primary sources. | Folded into M-YT-10 |
| M-YT-17 | Google video results, VideoObject, Clip markup, embed page | YS#23, YS#24, YS#25, YS#29, VP#21 | partial (site and SEO) | SEO is marketing territory. | Hand-off: marketing (SEO and answer engines) |
| M-YT-18 | Podcast playlists and RSS ingestion on YouTube | YS#26, AE#22 | uncovered | Low. The fleet has no audio show. | Deferred |

M-YT-8 is a split row from revision 1, where it counted as one owned row; the count below reflects the split.

### Group 5: product and terminal demo video

Skill `terminal-demo`. ID family `CH-VID`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-VID-1 | Pipeline per surface: asciicast player, VHS GIF or MP4, screen video, Remotion; embedding on owned pages and in a README | VP#1, VP#2, VP#20, VP#36 | partial (shell-integration covers PTY hooks, not demos) | High. The scout measured the fleet's demo practice as 11 asciicast v2 files plus 8 v3 casts and a PTY recorder, with 0 VHS tapes and 0 video files (`channel-video-production-software.md`). None of the 18 fleet READMEs has a demo, against 16 of 40 upstream (`product-audit/exemplar-readmes.md`). | Selected: channel-terminal-video / vid-pipeline-choice |
| M-VID-2 | Cast and VHS settings: font size, columns, rows, idle time limit, speed | VP#3, VP#5 | uncovered | High. The scout reports fleet casts with `idle_time_limit` from 16 to 66 s at width 180, wide for embeds (`channel-video-production-software.md`). | Selected: channel-terminal-video / vid-legibility-thresholds |
| M-VID-3 | Minimum on-screen code size at 1080p, embed width and 360 px phone width | VP#4, SF#30 | uncovered | High. No published minimum exists, and that absence is itself a scout finding. A rendered measurement can set a derived one. | Selected: channel-terminal-video / vid-legibility-thresholds |
| M-VID-4 | Secrets, hostnames and home paths in recordings | VP#6 | uncovered | High. A cast is a plain-text file that secret scanners can check, and agents record in their own shell. | Selected: channel-terminal-video / vid-scrub-and-reproducibility |
| M-VID-5 | Script shape, length by video type, visual signalling | VP#7, VP#8, VP#9 | uncovered | Medium. Length guidance is vendor-only (Wistia, TechSmith). | Folded into M-YT-8 |
| M-VID-6 | Captions, caption files, transcripts; caption delivery per platform including the LinkedIn single English SRT | VP#11, VP#12, VP#17, SF#14, AE#19, LC#28 (caption half) | uncovered | High. WCAG 1.2.2 (https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html) applies to any narrated video on the docs sites, and a file-existence check is trivial. | Selected: channel-terminal-video / vid-accessibility |
| M-VID-7 | Audio description or a text alternative for silent screencasts (WCAG 1.2.3 versus 1.2.5) | VP#16, SF#15 | uncovered | High. Silent terminal demos are the common case, and the verdict on whether a cast is its own text alternative is unsettled. | Selected: channel-terminal-video / vid-accessibility |
| M-VID-8 | Flashing, motion, auto-zoom, autoplay and audio control | VP#18, VP#19, VP#31, SF#16 | uncovered | Medium. Fast scrolling terminal output and auto-zoom can trip WCAG 2.3.1 and 2.2.2. | Selected: channel-terminal-video / vid-accessibility |
| M-VID-9 | Encode targets, aspect and padding, loudness, background audio, in-frame contrast | VP#13, VP#14, VP#22, VP#23, VP#24 | partial (css-theming owns contrast ratios) | Medium. Contrast reuses the css-theming thresholds and needs no new research. Encode and loudness are checkable with ffprobe and ebur128, but narrated video is rare in the fleet today. | Selected: vid-legibility-thresholds applies the css-theming contrast check to the recording theme; encode and loudness deferred |
| M-VID-10 | One vertical master: safe rectangle across Shorts, Reels and TikTok; LinkedIn 4:5 or 9:16 | SF#5 to SF#9, SF#26 | uncovered | Medium. The fleet's Shorts need it. The scout derived the rectangle itself, because no platform publishes one. | Selected: channel-terminal-video / vid-legibility-thresholds |
| M-VID-11 | Tool licences (Remotion, Screen Studio) and repeatable Remotion renders | VP#29, VP#30 | uncovered | Low. No fleet repo uses either tool. | Deferred |
| M-VID-12 | AI editing, filler removal, synthetic voices | VP#32 | uncovered | Low. The disclosure part is owned by M-CO-2. | Deferred |
| M-VID-13 | Launch video exemplars (Linear, Arc, Raycast, Vercel); Supabase launch-week format | VP#33, VP#40 | uncovered | Medium. VP#40 found no published shot list, only written posts and changelogs as the canonical record. | Folded into M-LN-6 |
| M-VID-14 | Video measurement validity | VP#38 | uncovered | Low. | Folded into M-YT-7 |

### Group 6: short-form vertical video

Skill: none of its own; the spec lands in `youtube-video` and `terminal-demo`. ID family reserved: `CH-SFV`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-SF-1 | Should a developer-tool team run short-form at all? | SF#1, SF#12, SF#31, SF#34 | uncovered | Medium. No conversion evidence exists (`channel-short-form-video.md`). Answered inside the YouTube portfolio dive, because the fleet's only short-form is on YouTube. | Folded into M-YT-10 |
| M-SF-2 | TikTok and Instagram Reels file specs and covers | SF#3, SF#4, SF#10 | uncovered | Low. The fleet has no presence on either platform. | Deferred |
| M-SF-3 | "Hook in the first N seconds" evidence | SF#13 | uncovered | Low. The claim is unsourced, so the skill should encode structure, not seconds. | Deferred |
| M-SF-4 | Music libraries on TikTok and Shorts | SF#17, SF#18 | uncovered | Low. Covered by Content ID risk in M-YT-15. | Deferred |
| M-SF-5 | Reuse and originality penalties, repurposing tools, link survival in clips | SF#27, SF#28, SF#29 | uncovered | Low. This becomes relevant only once the fleet posts to more than one vertical platform. | Deferred |
| M-SF-6 | TikTok availability; Instagram content protection | SF#33, SF#35 | uncovered | Low. | Deferred |

### Group 7: GitHub and package registries as channels

Skill `github-presence`. ID family `CH-GH`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-GH-1 | Repository description and topics | GH#1, GH#2 | uncovered | High. Topics are set on 3 of 17 fleet repos, and the fleet median is 0 topics against 8.5 upstream (`product-audit/distribution-posture.md`, `product-audit/exemplar-readmes.md`). Topic limits are published (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics). A `gh api` check is one line. | Selected: channel-github / gh-repo-card |
| M-GH-2 | Social preview image | GH#3 | uncovered | High. 0 of 18 fleet repos have one, against 17 of 40 upstream (`product-audit/exemplar-readmes.md`). Spec: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview | Selected: channel-github / gh-repo-card |
| M-GH-3 | README above the fold, size truncation, file precedence, relative paths, rendering on every registry, copy-paste install | GH#4 to GH#7, GH#36, GH#37 | partial (docs skills, DOC-TYPE-10..15) | Medium. The README copy belongs to marketing and the docs skills. Registry rendering is not in docs-quality (grep above) and belongs here. | Split: rendering in gh-registry-listings; copy hand-off to marketing |
| M-GH-4 | Registry copy staleness and manifest discovery fields (crates.io, PyPI, npm, VS Code Marketplace) | GH#8, GH#9, GH#31, GH#32, GH#33 | uncovered | High. Every fleet package has these fields, an agent leaves them blank, and the manifests can be linted. | Selected: channel-github / gh-registry-listings |
| M-GH-5 | Homebrew `desc` guidelines and homebrew-core thresholds | GH#10, GH#11 | uncovered | Medium. It matters for the fleet's CLIs. The thresholds decide tap versus core. | Selected: channel-github / gh-registry-listings |
| M-GH-6 | Release-note categories, structure, migration section, announcement contract | GH#12, GH#13, LP#29, LP#30, OP#39 | partial (DOC-PLAIN-22 covers PR bodies only) | High. ocx has 45 BREAKING entries with 0 Migration lines, and 7 of 10 indexbot bodies are a compare link only (`product-audit/distribution-posture.md`). Release-note models contradict across repos (`product-audit/config-inventory.md`). | Selected: channel-github / gh-release-announcement |
| M-GH-7 | "Latest" flag, pre-releases, immutable releases, asset limits, stable download URLs | GH#14, GH#15, GH#16 | partial (installer-script uses download URLs) | Medium. Installer-script depends on stable `/releases/latest/download` URLs. | Selected: channel-github / gh-release-announcement |
| M-GH-8 | Who a release notifies; Discussions announcements per release | GH#17, GH#18, LP#31 | uncovered | Medium. Discussions is enabled on 1 of 17 repos (`product-audit/distribution-posture.md`). | Selected: channel-github / gh-release-announcement (sole owner of GH#18) |
| M-GH-9 | Community-health file precedence, SUPPORT routing, CITATION, SECURITY, ACCESSIBILITY | GH#19, GH#38, CM#25 | partial (docs skills) | Medium. | Folded into M-CM-10 |
| M-GH-10 | Organisation and personal profile READMEs | GH#20, GH#21 | uncovered | Medium. Neither fleet organisation has one (`product-audit/distribution-posture.md`), and it is a single file. | Selected: channel-github / gh-repo-card |
| M-GH-11 | Validity of traffic and stars as signals; fake stars; star calls to action; the traffic archive job | GH#22 to GH#25, GH#35 | uncovered | High. Agents cite stars as success. The scout reports a 14-day traffic window, which forces an archive job, and an OSS Insight shutdown on 2026-12-04 (`channel-github-as-channel.md`). | Selected: channel-github / gh-signal-validity (sole owner of the traffic API and the archive decision) |
| M-GH-12 | Awesome-list entry requirements; badge rows | GH#26, GH#27 | uncovered | Medium. Awesome lists are a launch venue. | Folded into M-LN-5 |
| M-GH-13 | FUNDING.yml Sponsor button | GH#28 | uncovered | Low. Money is marketing and pricing territory. | Deferred |
| M-GH-14 | GitHub Pages commercial-use limits; custom domain verification | GH#29, GH#30 | uncovered | Low. This is site infrastructure, not a channel. | Deferred |
| M-GH-15 | What maintainers did to reach their first thousand users | GH#39 | uncovered | Low. The scout found no primary sources, and the answer is unlikely to yield a checkable rule. | Deferred |
| M-GH-16 | Every published tag has a Release; repositories that publish nothing | none; distribution-posture smell 8 and pattern 6 | uncovered | High. Tags without Releases: catalog 16, conventions 16, indexer 29, devcontainer-features 2; `grim-gui` and `grim-mirror` publish nothing (`product-audit/distribution-posture.md`). A watcher sees no announcement. A `comm` over tags and releases checks it. | Selected: channel-github / gh-release-announcement |

### Group 8: developer communities

Skill `community-post`. ID family `CH-COM`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-CM-1 | Show HN eligibility, title rules, URL type, text-post links | CM#1, CM#2, CM#36, LP#11, LP#12, LP#16 | uncovered | High. The fleet has 0 HN submissions (`product-audit/distribution-posture.md`). The rules are short and checkable (https://news.ycombinator.com/showhn.html). | Selected: channel-communities / com-hn-contract |
| M-CM-2 | Which artifacts an agent must never draft, because the venue bans generated or AI-edited text | CM#3, LP#17, LP#37 | uncovered | High. This is the clearest case where agents get it wrong (https://news.ycombinator.com/newsguidelines.html, https://stackoverflow.com/help/gen-ai-policy). It is a boundary clause, so it lives in the rule. | Selected: channel-agent-boundary / core-agent-action-boundary (sole owner; com-hn-contract and com-venue-rules cite it) |
| M-CM-3 | Where vote solicitations hide: team chat, newsletter CTAs, release notes, README badges | CM#4, LP#14 | uncovered | High. A grep can find them. | Selected: channel-communities / com-hn-contract |
| M-CM-4 | Retry versus the second-chance pool, ranking, posting time | CM#5, CM#6, CM#7, LP#13, LP#15 | uncovered | Medium. The scout measured 75,943 Show HN posts with a weekday spread of only 1.8 to 2.3% (`channel-communities.md`), so a timing rule is not yet justified. | Selected: channel-communities / com-hn-contract |
| M-CM-5 | Maker presence in the thread, hostile comments, an absent maker | CM#8, CM#9, CM#34 | uncovered | Medium. A launch plan can schedule it. Thread quality cannot be checked. | Folded into M-LN-2 |
| M-CM-6 | Self-promotion share, new-account gates, astroturfing, own-product disclosure in threads | CM#10 to CM#13 | uncovered | High. The Lobsters self-promotion share and new-account gate (https://lobste.rs/about) block brand-new accounts, which agents do not anticipate. | Selected: channel-communities / com-venue-rules |
| M-CM-7 | Reddit sitewide and subreddit rules for tool announcements | CM#14, CM#15 | uncovered | High. Subreddit rules were blocked (HTTP 403) for the scout, so a dive must find an authorised route. Sitewide rules: https://www.redditinc.com/policies/reddit-rules | Selected: channel-communities / com-venue-rules |
| M-CM-8 | Stack Overflow linking rules and official-support use | CM#16, CM#17 | uncovered | High. Linking your own tool needs disclosure. The GenAI ban (CM#18) is a boundary clause owned by M-CM-2. | Selected: channel-communities / com-venue-rules |
| M-CM-9 | dev.to and Hashnode: full-text cross-posts, AI approval | CM#19, CM#20 | uncovered | Medium. Canonical-URL handling is marketing SEO; venue rules are here. | Selected: channel-communities / com-venue-rules |
| M-CM-10 | Discord, Discourse or GitHub Discussions as the project's home; history loss; chat-to-docs | CM#21 to CM#24 | uncovered | High. The fleet runs a 5-member Discord whose webhook posts CI failures, not user news. Discussions is on in 1 of 17 repos (`product-audit/distribution-posture.md`). | Selected: channel-communities / com-own-community-home |
| M-CM-11 | Code of conduct enforcement, moderation before launch traffic | CM#26, CM#27 | partial (community-health files) | Medium. | Selected: channel-communities / com-own-community-home |
| M-CM-12 | Inflated member counts, the Orbit model, community metrics | CM#28, CM#29, CM#30 | uncovered | Low. | Deferred |
| M-CM-13 | Launch artifact robustness: no signup wall, working install | CM#35 | partial (installer-script, cli-first-run audit) | High. | Folded into M-LN-8 |

### Group 9: launch platforms and sequencing

Skill `launch-plan`. ID family `CH-LAUNCH`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-LN-1 | Product Hunt eligibility, launching account, go-live instant, weekday choice | LP#1 to LP#4 | uncovered | High. Product Hunt states its rules (https://help.producthunt.com/en/articles/17734341-2-what-kind-of-products-get-featured), and an agent plans the wrong account or time zone. | Selected: channel-launch / launch-venue-gates |
| M-LN-2 | Product Hunt support wording, link posting, upvote weighting, relaunch, comment duty | LP#6 to LP#10 | uncovered | High. "Never ask for upvotes" (http://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid) is something a draft check can enforce. | Selected: channel-launch / launch-venue-gates |
| M-LN-3 | Launch HN eligibility (YC only) | LP#18 | uncovered | Low. It is one fact for the facts file. | Folded into M-CM-1 |
| M-LN-4 | Directories (BetaList, Uneed, DevHunt): worth, requirements, vote mechanics, field limits, agent submission | LP#19, LP#20, LP#39, LP#40 | uncovered | Medium. The field limits are checkable. The worth is unproven. | Selected: channel-launch / launch-venue-gates |
| M-LN-5 | Self-hosted and open-source directories; awesome-list requirements; badges | LP#21, LP#22, GH#26, GH#27 | uncovered | Medium. These are free and fit an OSS fleet. | Selected: channel-launch / launch-venue-gates |
| M-LN-6 | Launch week versus launch day versus rolling releases; cross-venue order; launch video exemplars | LP#28, VP#33, VP#40 | uncovered | High. Every launch decides this. The scout measured only Linear's changelog gap (mean 11.67 days, `channel-launch-platforms.md`). Limited this wave to what changelog and launch-week records can measure. | Selected: channel-launch / launch-shape-evidence |
| M-LN-7 | One launch goal and its measurement without site analytics; Product Hunt conversion; talk measurement | LP#5, LP#34, LP#36, AE#25 | uncovered | High. The fleet has no analytics by decision (`product-audit/distribution-posture.md`), so channel-native and registry counters are all there is. | Split: counters and the launch-goal field in gh-signal-validity; UTM and attribution hand-off to marketing (analytics) |
| M-LN-8 | Readiness of the landing path and try-it path; launch artifact accessibility | LP#32, LP#35, LP#38, CM#35 | partial (cli-first-run audit, installer-script) | High. | Split: each venue's link-target requirement (runnable, no signup) in launch-venue-gates; the install path is covered by installer-script and the ux sibling's first-run work |
| M-LN-9 | Lifetime deals | LP#23 | uncovered | Pricing is marketing territory. | Hand-off: marketing (pricing) |
| M-LN-10 | Newsletter sponsorship cost, ad labelling, audience fit | LP#24, LP#25, LP#26 | uncovered | Paid placement and email are marketing territory. | Hand-off: marketing (email, marketing law) |
| M-LN-11 | Press kit and embargo | LP#27 | uncovered | Low. Brand assets are marketing territory. | Hand-off: marketing (brand assets) |

### Group 10: microblogs

Skill: variants inside `launch-plan`, or a `microblog-post` skill if the dives justify one. ID family `CH-MB`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-MB-1 | X API cost per post with a URL, summoned-reply rule, bot disclosure, Premium | MB#1, MB#2, MB#3, MB#10 | uncovered | High as a boundary. The automation part is in M-CO-1; the rest is a facts-file entry. | Folded into M-CO-1 |
| M-MB-2 | Per-platform variants and counting rules (X weighted, Bluesky graphemes, Mastodon link counting, Threads); bridges; documentation-versus-schema conflicts | MB#4, MB#5, MB#32, MB#34 | uncovered | High. Agents count characters, not graphemes or weighted units, and a validator fixes it. | Selected: channel-microblog / mb-variant-validator |
| M-MB-3 | Link reach penalties, first-reply links, Threads link limits and click measurement, Bluesky links | MB#6, MB#7, MB#13, MB#14, MB#22 | uncovered | Medium. Contested and vendor-heavy, but the link-placement default is a checkable draft property. | Selected: channel-microblog / mb-link-and-thread-defaults |
| M-MB-4 | What X's open ranking code says, and how fast its weights change | MB#8, MB#9 | uncovered | Medium. The scout reports ranking weights changing within two weeks (`channel-microblog.md`), which is decay evidence for M-CO-3. | Folded into M-CO-3 |
| M-MB-5 | Replies, mentions, tags, quote posts, handling criticism | MB#11, MB#12, MB#31, MB#36 | uncovered | Medium. Not checkable beyond tag count. | Deferred |
| M-MB-6 | Alt text: requirement, length, terminal screenshots, Mastodon norms | MB#15, MB#16, MB#25 | uncovered | High. The scout measured 57% of 541 images without alt text on Bluesky (`python3 -I bsky_measure.py`, `channel-microblog.md`). It is checkable. | Selected: channel-microblog / mb-variant-validator |
| M-MB-7 | Link cards, client-built Bluesky cards, `fediverse:creator`, oEmbed survival | MB#17, MB#18, MB#37 | uncovered | High. Bluesky cards must be built by the client, so an agent pipeline that skips this posts bare links. The `og:image` tags themselves are a marketing and site concern. | Selected: channel-microblog / mb-variant-validator |
| M-MB-8 | Proving the account is real (domain handles, `rel=me`, verification); profile link area | MB#19, MB#20 | uncovered | Medium. It can be checked from the site's HTML. | Selected: channel-microblog / mb-variant-validator |
| M-MB-9 | Which platform is worth the time in late 2026; how to be found on Bluesky | MB#21, MB#33 | uncovered | Low for this wave. It is an audience judgement no rule can check, and the fleet is absent from every microblog. | Deferred |
| M-MB-10 | Thread versus single post; launch thread contents | MB#23, MB#24 | uncovered | Medium. Thread length and link position are draft properties. | Selected: channel-microblog / mb-link-and-thread-defaults |
| M-MB-11 | Hashtags; scheduling tools | MB#26, MB#27 | uncovered | Low. Scheduling automation is covered in M-CO-1. | Deferred |
| M-MB-12 | Account voice | MB#30 | uncovered | Messaging is marketing territory. | Hand-off: marketing (messaging) |
| M-MB-13 | What a small account can conclude from its own post metrics | MB#35 | uncovered | Low. | Deferred |

### Group 11: talks, podcasts, webinars, events

No skill this wave. ID family reserved: `CH-EVT`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-EV-1 | CFP abstract content, vendor-pitch avoidance, AI-drafted abstract policies, proposal caps, outline, anonymity, length, criteria, panels, prior recording, deadlines | AE#1 to AE#11 | uncovered | Medium. The rules are checkable (the scout reports PyCon rejecting LLM-written proposals and KubeCon capping proposals at 3, `channel-audio-events.md`), but the fleet has no talk pipeline. First in line for the next wave. | Deferred |
| M-EV-2 | Live captions and the accessibility law for hosted events | AE#12, AE#13 | uncovered | Low. The WCAG part for recordings is covered in vid-accessibility. | Deferred |
| M-EV-3 | Slide deck accessibility and slide legibility numbers; delivery checklist | AE#15, AE#16, AE#17 | uncovered | Low. Deck design leans toward the ux sibling. | Deferred |
| M-EV-4 | Podcast feeds, transcripts, chapters, Apple requirements | AE#14, AE#20, AE#21 | uncovered | Low. The fleet has no show. | Deferred |
| M-EV-5 | Is video required in 2026? | AE#23 | uncovered | Low. Answered by M-YT-10. | Folded into M-YT-10 |
| M-EV-6 | Webinar benchmarks, length, replay expectations | AE#26, AE#27, AE#28, VP#34 | uncovered | Low. Vendor benchmarks conflict (49% versus 58%). | Deferred |
| M-EV-7 | Turning a talk into derived content with a fidelity check | AE#29 | uncovered | Medium. A checkable agent step, but there is no talk source yet. | Deferred |
| M-EV-8 | Podcast-guest pitches | AE#33 | uncovered | Low. | Deferred |
| M-EV-9 | Booth or sponsorship versus a CFP slot; event code of conduct for slides and booths | AE#36, AE#37 | uncovered | Low. | Deferred |

### Group 12: owned publishing and syndication

Mostly marketing territory. ID family reserved: `CH-OWN`.

| ID | Candidate | Scout rows | Coverage | Priority and reason | Disposition |
|---|---|---|---|---|---|
| M-OP-1 | Canonical URLs and syndication to dev.to, Hashnode, Medium, LinkedIn articles | OP#1 to OP#6 | uncovered | Canonical handling is marketing SEO. Venue rules for dev.to sit in M-CM-9. | Hand-off: marketing (SEO) |
| M-OP-2 | Dates, Article JSON-LD, bylines, titles, meta descriptions, Open Graph, preview debuggers | OP#7 to OP#10, OP#17 to OP#21 | partial (docs skills) | SEO and brand assets are marketing territory. The fleet gap (`og:image` on 0 of 298 ocx.sh pages, per `product-audit/distribution-posture.md`) is a prerequisite for every channel and is named here only. | Hand-off: marketing (SEO, brand assets) |
| M-OP-3 | AI-assisted post disclosure, scaled content abuse, fact-checking AI metadata | OP#11, OP#15, OP#16 | partial (DOC-PLAIN-22) | Scaled content abuse is marketing SEO. Platform labels are in M-CO-2. | Hand-off: marketing (SEO); labels folded into M-CO-2 |
| M-OP-4 | Sponsored guest posts and link attributes | OP#14 | uncovered | Marketing territory. | Hand-off: marketing (SEO, marketing law) |
| M-OP-5 | RSS and Atom feed hygiene, discovery, Astro `site` and MkDocs `site_url` | OP#22 to OP#27 | uncovered | Low. The fleet has no blog or feed (`product-audit/distribution-posture.md`). | Deferred |
| M-OP-6 | Content decay and refresh; post length; original-data pages | OP#28 to OP#31 | uncovered | Marketing territory. | Hand-off: marketing (SEO) |
| M-OP-7 | Code samples in posts executed in CI | OP#32 | partial (docs skills test code samples) | Low. | Deferred |
| M-OP-8 | Newsletter full text versus link, clipping limits | OP#33 | uncovered | Email is marketing territory. | Hand-off: marketing (email) |
| M-OP-9 | Post image alt text and filenames | OP#34 | partial (docs skills) | Low. | Deferred |
| M-OP-10 | AI search exposure; judging posts by conversions | OP#35, OP#36 | uncovered | Marketing territory. | Hand-off: marketing (answer engines, analytics) |
| M-OP-11 | Content brief and editorial calendar; blog host migration | OP#37, OP#38 | uncovered | Low. There is no blog. | Deferred |

**Count.** The map holds 148 deduplicated candidates (146 from revision 1, plus M-CO-6 and M-GH-16 from audit findings no scout carried):

- 88 selected: 62 owned by one dive, 7 split across dives or with a sibling (M-LI-11, M-YT-8, M-YT-11, M-YT-13, M-GH-3, M-LN-7, M-LN-8), 19 folded into a selected candidate;
- 45 deferred;
- 15 handed off.

A split row counts once, as selected. M-VID-9 counts as selected because its contrast part is applied in a dive; its encode and loudness part waits with it.

## Selected for this wave

### Ranking

The wave has eight topics and 25 dives. The ranking applies the task's order:

1. uncovered first;
2. then leverage for adopters;
3. then where agents demonstrably fail;
4. then whether a rule or skill step can check the answer.

LinkedIn and YouTube are the owner's named priorities and are selected unconditionally.

- **channel-github ranks first.** GitHub is the only channel the fleet actively uses, and the audits found the largest checkable gaps there.
- **channel-agent-boundary ranks ahead of the per-platform topics.** Its answer is the rule every channel skill depends on.
- **Short-form video is not its own topic.** Its decision lives in channel-youtube, because the fleet's only vertical video is on YouTube. Its frame spec lives in channel-terminal-video.

**Single owners.** Revision 1 let two dives fetch the same source in six places. Each shared item now has one owner, and the other dive cites it:

| Shared item | Owner | Cites it |
|---|---|---|
| GitHub traffic API, 14-day window, archive job | gh-signal-validity | launch-plan skill (no launch dive fetches it) |
| HN and Stack Overflow bans on generated text | core-agent-action-boundary | com-hn-contract, com-venue-rules |
| Video caption delivery on every platform, including LinkedIn | vid-accessibility | li-limits-and-fold |
| Discussions announcement per release (GH#18) | gh-release-announcement | com-own-community-home |
| View definitions, thresholds and the Shorts success test | yt-measurement-and-testing | yt-format-portfolio |
| LinkedIn format limits | li-limits-and-fold | li-format-and-reach-evidence |

Topic order below is the selection order. Each brief is handed to its worker verbatim.

### 1. channel-github (CH-GH)

**Question.** Which repository, release and registry surfaces must every fleet repository set, to which published limits, and which GitHub and registry numbers may a team report, so GitHub works as the distribution channel it already is?

#### Dive gh-repo-card

```
Investigate the repository card a visitor and a search engine see: About description, topics, homepage URL, social preview image, and the organisation profile README.
Start from GH#1, GH#2, GH#3, GH#20, GH#21 in marketing-topic-map/channel-github-as-channel.md. Read product-audit/distribution-posture.md section 4 (topics on 3 of 17 clones; no description on rules_ocx, www-setup, devcontainer-features; no org profile README in either org) and product-audit/exemplar-readmes.md (custom social image 0 of 18 fleet versus 17 of 40 upstream; topics median 0 versus 8.5).
Fetch and cite with dates: GitHub Docs "Classifying your repository with topics", "Customizing your repository's social media preview", "Managing your profile README", "Customizing your organization's profile"; the REST reference for GET and PUT /repos/{owner}/{repo}/topics and PATCH /repos/{owner}/{repo}; the GraphQL Repository fields openGraphImageUrl and usesCustomOpenGraphImage.
Re-fetch every limit and dated figure in this brief and in the scout rows. Report any scout or audit figure that fails to reproduce; do not carry it forward.
Measure, do not cite:
- for all 17 fleet repos: description length, topic count, topic validity against the published pattern, homepage set, custom social preview set (gh api repos/<o>/<r>, gh api repos/<o>/<r>/topics, gh api graphql);
- for the 40 upstream repos in exemplar-readmes: download each custom social image, record pixel size and bytes;
- record every command next to its result.
Out of scope: README prose and positioning (marketing); og tags on product sites (marketing); which channels exist (core-facts-and-channel-inventory owns the channel list; this dive only says where the org README places it).
Decide:
- the required repository-card fields and their limits, as a checkable list with source dates;
- whether a missing social preview is MUST or SHOULD, and its pixel spec;
- the exact gh api assertions a skill step runs, with pass conditions;
- the minimum content of an organisation profile README.
```

#### Dive gh-release-announcement

```
Investigate the GitHub Release as the fleet's only release announcement: .github/release.yml categories versus git-cliff and cargo-dist templates; a summary sentence first; a Migration line under every breaking entry; filtering internal scopes; the Latest flag, pre-releases, immutable releases and stable /releases/latest/download URLs; whether every published tag has a Release; who a release notifies, and whether a Discussions announcement per release is worth it (this dive is the sole owner of GH#18).
Start from GH#12 to GH#18, LP#29, LP#30, LP#31, OP#39. Read product-audit/distribution-posture.md section 1, smells 2 and 8 and pattern 6 (ocx 45 BREAKING with 0 Migration lines; 7 of 10 indexbot bodies are a compare link only; tags without Releases: catalog 16, conventions 16, indexer 29, devcontainer-features 2; grim-gui and grim-mirror publish nothing), and product-audit/config-inventory.md (release-note models contradict across ocx, grimoire and vscode).
Fetch and cite with dates: GitHub Docs "Automatically generated release notes", "About releases", "Immutable releases", "Linking to releases", and the notifications page on watching releases; git-cliff docs (templates, commit_parsers, footers); the cargo-dist announcement configuration; Keep a Changelog 1.1.0; SemVer 2.0.0.
Exemplars: release pages of at least 8 upstream CLIs from exemplar-readmes.
Re-fetch every figure in this brief. Report any audit or scout figure that fails to reproduce.
Measure, do not cite:
- per fleet repo, the last 10 releases: body length, summary line present, breaking section, Migration lines per breaking entry, internal scopes, isLatest correctness (gh release list; gh release view --json body,isLatest,isPrerelease);
- per fleet repo, tags without a Release (gh api repos/<o>/<r>/tags --paginate against gh release list, as in pattern 6), and whether each tag-only repo ships to a registry or is internal, because an internal tag-only repo may be correct;
- record every command.
Out of scope: commit-message style already in the catalog (name the rule IDs this depends on; propose no new commit rule); release-note wording and tone (marketing-copy).
Decide:
- the release-body contract (sections, order, Migration-line requirement);
- whether the lever is the generator template or the commit subjects;
- the tag-without-release check, its exemption for internal repos, and MUST or SHOULD;
- the Latest and pre-release rules;
- whether a Discussions announcement per release is required, optional or not recommended;
- the check a release skill step runs before publishing.
```

#### Dive gh-registry-listings

```
Investigate every package-registry listing that reuses repository metadata or the README: crates.io (description, keywords, categories), PyPI (summary, Description-Content-Type, project URLs), npm (description, keywords, repository, homepage), the VS Code Marketplace manifest (icon, categories, galleryBanner, repository), Homebrew desc guidelines and homebrew-core acceptance thresholds, and the Docker Hub description.
Also cover whether registry README copy goes stale after a README-only edit, and how each registry renders a README (relative links, images, size truncation). rules/docs-quality.md has no registry rule, so the rendering rule lands here.
Start from GH#4 to GH#11, GH#31, GH#32, GH#33, GH#36, GH#37 in marketing-topic-map/channel-github-as-channel.md, and product-audit/distribution-posture.md section 4 (npm, PyPI and VS Code packages; crates.io names grim and grimoire held by other projects).
Fetch and cite with dates: the Cargo reference "The manifest format" and the crates.io category slugs list; the Python Packaging User Guide core metadata specification; npm package.json docs; VS Code "Extension Manifest" and "Publishing Extensions"; Homebrew "Formula Cookbook" and "Acceptable Formulae"; GitHub Docs "About READMEs".
Exemplars: five well-listed upstream packages per registry.
Re-fetch every limit in this brief and the scout rows; report any scout figure that fails to reproduce.
Measure, do not cite:
- for each fleet package manifest (read only): filled versus empty discovery fields, lengths against limits (cargo metadata --no-deps --format-version 1; jq over package.json; tomllib over pyproject.toml);
- render one fleet README on each registry's live page and list broken links and images;
- record every command.
Out of scope: README copy and keyword strategy for SEO (marketing).
Decide:
- the per-registry required-field table with limits and source dates;
- whether READMEs reused by a registry must use absolute URLs, as MUST or SHOULD;
- the manifest lint a skill step runs.
```

#### Dive gh-signal-validity

```
Investigate which GitHub and package-registry numbers a team may report as distribution or launch results, and how to keep them honest. This dive is the sole owner of the GitHub traffic API and the archive-job decision.
GitHub: stars (no unstar events in the API), the traffic window and the archive job it forces, referrers, fake-star exposure, permitted versus banned star calls to action, Trending decay, and the OSS Insight shutdown the scout dates 2026-12-04.
Registries: crates.io, PyPI (pypistats and the BigQuery dataset), npm downloads API, Homebrew analytics, VS Code Marketplace installs; what each counts, including CI and mirror traffic. Product Hunt and HN native counters as read-only results.
Start from GH#22 to GH#25, GH#34, GH#35, GH#40, LP#5, LP#34, LP#36, AE#25. Read product-audit/distribution-posture.md section 3 (no site analytics by decision; npm 5,353 and 1,127 downloads in 30 days).
Fetch and cite with dates: GitHub Docs "Viewing traffic to a repository" and the REST traffic endpoints; GitHub Acceptable Use Policies (inauthentic activity); the fake-stars study the scout cites (open the paper itself, not coverage); the OSS Insight notice; npm registry download-counts doc; pypistats API docs and the PyPI BigQuery docs; the crates.io API downloads endpoint; Homebrew analytics docs; Product Hunt maker dashboard help.
Re-fetch every dated figure in this brief; report any scout figure that fails to reproduce.
Measure, do not cite:
- stargazer timestamps for ocx and grimoire (gh api -H 'Accept: application/vnd.github.star+json' repos/<o>/<r>/stargazers --paginate) against release dates;
- the traffic API once per repo, recording the window it actually returns;
- 90 days of downloads per fleet package from each registry API;
- record every command.
Out of scope: site analytics, UTM parameters, attribution models (marketing analytics).
Decide:
- which signals a channel skill may report, each with its required caveat;
- whether a traffic-archive workflow is MUST or SHOULD, and its schedule;
- the wording rule for a star call to action;
- the launch-goal field launch-plan carries: one goal, one counter from this list, a baseline window.
```

### 2. channel-agent-boundary (CH-CORE)

**Question.** On every public channel, what may an agent do by itself, which platform-native labels must it set and where, and how does a channel skill keep its platform facts and the organisation's channel list from going stale?

#### Dive core-agent-action-boundary

```
Investigate one matrix: one row per platform, one column per action. Actions: draft, schedule, post, reply, submit a listing, upload through an API, pay.
Platforms: LinkedIn, YouTube, X, Bluesky, Mastodon (instance terms), Threads, Hacker News, Reddit, Lobsters, Stack Overflow, dev.to, Product Hunt, BetaList, Discord.
Each cell: allowed, forbidden or conditional, with the clause quoted verbatim and its date. Add credential custody: where publishing tokens may live.
This dive is the sole owner of the venue bans on generated or AI-edited text (HN, Stack Overflow, and any other venue found). com-hn-contract and com-venue-rules cite this dive.
Start from LO#13, LO#14, LC#16, LC#17, LC#18, MB#1, MB#2, MB#3, MB#27, MB#38, YS#16, YS#17, LP#17, LP#37, LP#40, CM#3, CM#15, CM#18.
Fetch and cite with dates: LinkedIn User Agreement section 8.2 and Help a1341387; YouTube API Services Developer Policies and Terms of Service (automated access clause); X Developer Policy and automation rules; Bluesky community guidelines and the atproto automation docs; the server rules of the two largest Mastodon instances; the Threads API terms; HN guidelines and FAQ; Reddit Rules and the Responsible Builder Policy; Stack Overflow "gen-ai-policy"; the Product Hunt terms and Discord developer terms.
Re-fetch every clause; the scout rows are leads, not quotations. Report any scout claim that fails to reproduce.
Measure, do not cite: record each page's fetch date and its own last-modified or "Last updated" statement, verbatim; run gitleaks detect --no-git over a copy of the 17 fleet clones under ~/.cache/research-lang/exemplars/product/ for publishing-token patterns (LinkedIn, X, YouTube OAuth, Discord webhook) and report counts, not values; record every command.
Out of scope: legal disclosure standards (marketing).
Decide:
- the exact MUST list for the channel-publishing rule (expected shape: the agent drafts and a human posts; name each platform exception);
- the list of venues where the agent produces a fact sheet only, never paste-ready text;
- the secret-scan check that a repository holds no publishing credentials, including Discord webhook URLs.
```

#### Dive core-platform-labels

```
Investigate every platform-native field or toggle that labels content as AI-generated or altered, paid or sponsored, branded partnership, or automated account, and where a disclosure must sit inside each format.
Fields to cover: YouTube altered-or-synthetic content setting and paid promotion; LinkedIn brand partnership and its AI guidance; the TikTok Content Posting API AI-generated field (the scout dates it effective 2026-09-24; verify); the X automated-account label; Bluesky self-labels; the Mastodon bot flag; Instagram AI info; C2PA content credentials that platforms read on upload, and the EU AI Act Article 50 machine-readable marking duty only as the platform-side mechanism (VP#26).
Placement: in a video, the sponsor or material-connection disclosure sits in the video itself before the mention (VP#27); in a post, before the fold. This dive decides placement per format; the legal standard is the marketing sibling's.
Start from LO#15, LO#39, YS#11, YS#12, SF#19, SF#20, SF#21, SF#24, VP#25, VP#26, VP#27, MB#3, MB#28, OP#11.
Fetch and cite with dates: YouTube Help 14328491 and the paid-promotion help page; the YouTube Data API videos resource and revision history (whether an altered-content field is exposed); LinkedIn Help a1481496 and the brand partnership help; the TikTok Content Posting API reference; X Help on automated account labels; Bluesky moderation and labelling docs; Mastodon profile docs (bot flag); the C2PA specification and each platform's C2PA statement; the European Commission AI Act Article 50 and code-of-practice page.
Re-fetch every dated figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite: for the fleet's two Shorts, read the label state through the YouTube Data API videos.list if the field exists, else record it as unobservable without Studio; do not scrape watch pages. Record every command.
Out of scope: whether the law requires a label, and Article 50 scope (marketing hand-off M-CO-4; cite its verdict when it lands).
Decide:
- the per-platform label table: field, when to set it, default, how to verify;
- the disclosure placement rule per format (video, post, thread, document);
- which labels the rule makes MUST when a draft says AI generated or altered its media.
```

#### Dive core-facts-and-channel-inventory

```
Investigate two dated registries every channel skill depends on.
(a) Platform facts: how fast channel facts change, so each skill's facts file gets a refresh cadence grounded in data rather than a guess.
(b) The channel inventory: one file per organisation listing every account (platform, handle, URL, owner role, last checked), and the inbound-link check that every listed channel is linked from at least one owned surface and that no surface links a handle missing from the file.
Start from the dated-fact tables in all 13 channel scouts and LO#6, LC#34, LA#35, YS#31, YP#35, VP#37, SF#32, MB#9, MB#34, CM#32, CM#33, LP#33, GH#40, AE#38. For (b) read product-audit/distribution-posture.md smell 4 and pattern 8 (YouTube channel linked from 0 of 17 repos and no site; Discord invite in 4 OCX places, 0 Grimoire) and the "Fleet evidence" grep in product-audit/exemplar-youtube-channels.md.
Primary sources: the Wayback CDX server API documentation (internetarchive/wayback, wayback-cdx-server); the github/docs repository history, which gives exact edits for GitHub Docs pages; two volatile-fact datasets with public edit history as exemplars of fact versioning: endoflife-date/endoflife.date and mdn/browser-compat-data; this catalog's own convention ("measured <date>" in rules/swift-quality.md, "unverified:" markers in rules/docs-quality.md, and the refresh commits on branch refresh/2026-11, read with git log only).
Re-fetch every dated figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- sample at least 40 facts across platforms; for GitHub Docs facts count edits from gh api 'repos/github/docs/commits?path=<file>'; for the rest query https://web.archive.org/cdx/search/cdx?url=<page>&output=json&from=2024&collapse=digest and diff the fact across captures;
- state the limit: CDX records captures, not edits, so several edits between captures count once and a reverted edit is invisible; report CDX counts as lower bounds with the median capture interval per page;
- count sampled help pages with an absolute date versus only a relative age;
- re-run the posture audit's link grep for every known account across the 17 clones and the built site HTML;
- record every command and the sample list.
Out of scope: decay of the team's own posts (marketing SEO).
Decide:
- the facts-file schema (fact, value, URL, verified date, refresh days, provenance label) and whether facts live per skill or in one shared reference;
- the refresh cadence per platform and the staleness check that fails CI;
- the channel inventory schema and location, and the inbound-link check with its pass condition.
```

### 3. channel-linkedin (CH-LI)

**Question.** What must a person-led LinkedIn post about a developer tool contain, in which format and with which link placement and disclosure, so that LinkedIn distributes it and it breaks none of LinkedIn's rules?

#### Dive li-limits-and-fold

```
Investigate the hard limits per LinkedIn post format (text, link post and its preview card, image, document, poll, video file) and the "see more" fold on desktop and mobile; plus image alt text and document-PDF accessibility. Video caption delivery belongs to vid-accessibility; format choice by goal belongs to li-format-and-reach-evidence.
Start from LO#1, LO#2, LO#21, LO#22, LO#23, LO#30, LO#31, LC#6, LC#7, LC#27, LC#28, and the limits half only of LO#3 and LC#5.
Fetch and cite with dates: LinkedIn Help a528176, a518909, a527229, a564109, a527270, a7174587, a519856, a521928 (verify each ID resolves to the claimed topic); Post Inspector documentation; the Images API (alt text field) and Documents API references.
Standards: WCAG 2.2 Understanding pages for SC 1.1.1 and 1.4.5; the PDF Association's PDF/UA (ISO 14289) overview.
Re-fetch every limit in this brief and the scout rows; flag any scout figure that fails to reproduce.
Terms first. Before any measurement, read the User Agreement section 8.2 and Help a1341387; quote the clauses on automated access and scraping with their effective date. Reading LinkedIn Help and Legal pages is in scope. Automated rendering or fetching of member content (posts, embeds, profiles) is out of scope unless those texts explicitly permit it; record the verdict.
The fold, without scraping:
- collect every dated fold measurement third parties have published (at least three independent ones, each with URL, date and method) and any LinkedIn statement;
- derive a conservative fold budget as their minimum, labelled "derived, third-party";
- write a 10-post manual measurement protocol a human can run in a logged-in browser at 1280 px and 360 px, marked pending human run.
Measure, do not cite: build 20 fixture drafts, run a length, fold-budget and attachment-dimension check (python3 -I) over them, and report code-unit versus grapheme differences on emoji-heavy hooks; record every command.
Decide:
- the dated limits table for the skill's facts file;
- the fold budget, its evidence grade, and what lines 1 to 3 must carry;
- the MUST checks per attachment type (alt text present, document title set, PDF tagged or the text repeated in the post).
```

#### Dive li-format-and-reach-evidence

```
Investigate which post format and link placement serve which goal (awareness, repository traffic, install, credibility) for a developer tool; whether a person or a Page should post; how reposts, tags and collaboration posts move reach; what LinkedIn itself says about its 2026 feed. Label every claim's provenance: LinkedIn, third-party study, or vendor.
Format limits come from li-limits-and-fold; do not fetch the limit pages.
Start from LO#4, LO#5, LO#7, LO#8, LO#11, LO#19, LO#20, LO#25, LO#27, LO#28, LO#32, LO#33, LO#37, LO#38, LC#1 to LC#4, LC#8, LC#29, LC#35, LC#36, LC#37, and the format-choice half only of LO#3 and LC#5.
Fetch and cite with dates: the LinkedIn Engineering blog post the scout dates 12 Mar 2026 on feed retrieval; LinkedIn creator and Page best-practice pages (members.linkedin.com/create-grow); LinkedIn Help on Page analytics definitions and on collaborative posts.
Studies and vendor data, each labelled vendor: the van der Blom algorithm report (the report, not the sales page); Socialinsider LinkedIn benchmarks (methods section); Buffer's LinkedIn data; any link-placement test with a published method.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- for each vendor dataset, record sample size, account-size mix, date range and outcome metric from its methods page;
- mark any number lacking these as unusable, and any that measures engagement rather than clicks as off-goal for repository traffic;
- record every URL and access date.
Out of scope: positioning and message choice (marketing); posting cadence (deferred).
Decide:
- the format-by-goal default, with an evidence grade per cell;
- the link-placement default, with its evidence grade;
- whether the fleet should create a company Page now (the audit found none);
- whether a release-notes-to-post step belongs in the skill, and the rule that the post must differ from the source.
```

#### Dive li-policy-and-ai-content

```
Investigate the content rules a LinkedIn draft must pass:
- engagement bait ("comment KEYWORD", reaction polls);
- pods and reciprocal-engagement agreements;
- coordinated cross-account reposting of one launch;
- LinkedIn's AI-generated content guidance and generic-content demotion;
- the negative-feedback reach reduction on low-quality posts and video, and whether it reverses (LO#40, Help a10728043, "temporary, not permanent" per the scout);
- where an employee or maintainer connection line must sit so it is visible before the fold.
Start from LO#12, LO#13, LO#15, LO#17, LO#35, LO#39, LO#40, LC#11, LC#12, LC#19, LC#20.
Fetch and cite with dates: LinkedIn Professional Community Policies; Help a1481496 (AI content), a10728043, and the help page on engagement bait; the User Agreement clauses on pods and automation (with effective date); the brand partnership tool documentation.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
The legal disclosure standard comes from marketing; this dive only places the line within LinkedIn's layout, using the fold budget from li-limits-and-fold.
Measure, do not cite: build a 20-draft fixture set of agent-written launch posts, run a regex list for bait and pod patterns, and report precision and recall against a hand-labelled sample; record the command.
Decide:
- the bait and pod patterns a draft check rejects;
- the AI-content behaviour the skill requires (a concrete specific such as a version, command or measured result; first-person detail; disclosure when AI involvement is heavy);
- whether a video quality checklist gates LinkedIn video, given the reach penalty is temporary;
- the connection-line placement rule.
```

### 4. channel-youtube (CH-YT)

**Question.** What should a small developer-tool company channel publish, and how must each upload be packaged and configured, given that company channels draw about a twenty-ninth of educator-channel audiences?

#### Dive yt-upload-metadata-contract

```
Investigate every field and channel default an upload sets: title and description limits (the scout claims 100 characters and 5,000 characters or bytes in the API); tags and hashtags (the scout claims more than 60 hashtags makes YouTube ignore all); chapters (start at 00:00, minimum count and length); thumbnail file spec, including the scout's claim that Shorts custom thumbnails reach the API from 2026-11-03; made-for-kids, default language, caption language, auto-dubbing defaults; end-screen and card limits; channel-level defaults (description, links) and feature-verification gates.
Start from YS#1 to YS#5, YS#8 to YS#10, YS#13, YS#18, YS#19, YS#32, YS#34, YS#35, YP#1 to YP#4, YP#20, YP#21, YP#22, YP#23, VP#10, AE#18. Read product-audit/distribution-posture.md section 4 (ocx channel, empty description, linked from nowhere).
Fetch and cite with dates: YouTube Help 57407, 12948449, 72431, 9884579, 6388789, 6140493, the auto-dubbing page and the made-for-kids page; the YouTube Data API reference for videos.insert, videos.update, thumbnails.set, channels.update and the API revision history; the YouTube Terms of Service automated-access clause.
Re-fetch every figure in this brief; each is a scout claim until reproduced. Flag any that fails.
Measure, do not cite:
- parse the descriptions already collected for the 450 audited videos (~/.cache/research-lang/exemplars/product/scripts/yt_analyze.py, extended) and count valid versus invalid chapter lists against the published rules;
- new data comes only through the Data API (videos.list, with the quota cost recorded) or the public channel RSS feed; never render or scrape watch pages;
- record every command.
Decide:
- the upload-metadata linter: each field, its limit, and MUST or SHOULD;
- the one-time channel-defaults checklist the ocx channel needs, with the links taken from the channel inventory (core-facts-and-channel-inventory).
```

#### Dive yt-format-portfolio

```
Investigate what a company developer-tool channel should publish: Shorts; long-form tutorials; announcement videos (the audit's only title class with lift, 4.94 on n=18); live streams and talks (ratio 0.0 to 0.18 in the audit); series and playlists. Also cover length by intent, the closing and end-screen window, and whether short-form serves a developer tool at all.
The Shorts success test, view definitions and reporting thresholds come from yt-measurement-and-testing; this dive states its keep-or-drop decision in those terms and does not define its own.
Start from YP#17, YP#18, YP#19, YP#24 to YP#27, YP#33, YP#34, YP#37, YS#27, SF#1, SF#12, SF#31, SF#34, VP#7, VP#8, VP#35. Read product-audit/exemplar-youtube-channels.md in full.
Fetch and cite with dates: YouTube Help and Creator pages on Shorts and long-form; the YouTube Official Blog on Shorts-to-long-form relationships; the Wistia and TechSmith video length reports (vendor; label them).
Exemplars: the channels of the audit's top company exemplars (for example Zed and PostHog).
Re-fetch every figure in this brief, including the audit figures; flag any that fails to reproduce.
Measure, do not cite:
- extend the audit corpus with duration and publish date per video through the Data API (videos.list contentDetails.duration) or the channel RSS feed, never by scraping;
- compute median views by duration band and format for company channels only, with n per cell;
- re-run the audit's handle resolution check, which was wrong for 9 of 29 channels the first time;
- record every command.
Decide:
- the default publishing mix for a small company channel, as format shares and a cadence floor;
- whether the fleet's Shorts series continues, conditional on the measurement dive's success test;
- the closing-structure checks the skill keeps.
```

#### Dive yt-content-policy-and-series-risk

```
Investigate the YouTube policies an agent-assisted channel can break:
- malicious clickbait and misleading metadata;
- thumbnail policy strikes and their window (the scout claims 90 days);
- inauthentic (templated or mass-produced) content, which the live "OCX Shorts NN" series design may approach (the scout dates a policy rename to 2025-07-15);
- Content ID claims from background music or third-party footage in screen recordings and live coding.
Start from YS#14, YS#15, YS#28, YP#8, YP#9, YP#29, VP#28, AE#34, AE#35. Read product-audit/distribution-posture.md section 4 for the two live Shorts titles and descriptions.
Fetch and cite with dates: YouTube Help 2801973 (spam and deceptive practices), 9229980 (thumbnail policy), 1311392 (YPP policies and inauthentic content), 3376882 (Audio Library) and the Content ID help pages; the YouTube Audio Library terms.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: three templated developer series in the audit corpus that remain in good standing.
Measure, do not cite:
- compare the fleet's two Shorts titles and descriptions against the policy examples;
- measure text similarity across a templated series in the audit corpus (python3 -I with difflib SequenceMatcher ratio) to show what "templated" looks like;
- record every command.
Decide:
- the policy checks a draft title, thumbnail and description must pass;
- the minimum per-episode variation rule for a numbered series;
- the music-source rule for demos.
```

#### Dive yt-measurement-and-testing

```
Investigate which YouTube numbers a small channel may act on, and own the definitions every other YouTube dive cites:
- what counts as a view (the scout claims every Shorts start counts since 2025-03-31, long-form co-view counts from 2026-11-16, and a podcast view change of 24 Aug 2026);
- impressions CTR and its typical range (the scout claims a 2 to 10% middle half);
- the retention report's intro window;
- Test and Compare (the scout claims 3 variants, decided by watch-time share, desktop and long-form only, about two weeks);
- the sample size below which nothing may be concluded;
- the Shorts success test a series must pass after 90 days (yt-format-portfolio consumes it).
Start from YS#6, YS#7, YS#20, YS#21, YS#22, YP#10 to YP#16, YP#35, YP#36, SF#11, AE#24, VP#38.
Fetch and cite with dates: YouTube Help 16391400, 7628154, 9314415 and the Shorts view-count change notice; the co-view announcement; the YouTube Analytics API metric definitions.
Re-fetch every dated figure in this brief; each is a scout claim. Flag any that fails to reproduce.
Measure, do not cite:
- compute the smallest detectable difference in view-through or CTR at the ocx channel's current volumes (12 and 7 views) and at 1,000 and 10,000 impressions, with a two-proportion power calculation in python3 -I;
- record the command and the assumptions (alpha, power).
Decide:
- the metrics a skill may report, each with its definition and date;
- the volume threshold below which the skill reports "insufficient data";
- the 90-day Shorts success test: metric, threshold, and what happens on failure;
- whether Test and Compare is worth running for a channel this size.
```

### 5. channel-terminal-video (CH-VID)

**Question.** Which recording pipeline should a software team use for product demos on each surface (docs site, README, YouTube, LinkedIn, Shorts), and which legibility, accessibility and secret-scrub gates must every recording pass?

#### Dive vid-pipeline-choice

```
Investigate, for each surface (Astro docs site, MkDocs site, GitHub README, YouTube, LinkedIn), which demo form fits: an asciicast v2 or v3 file with the asciinema player; a VHS tape rendered to GIF, MP4 or WebM; an agg-rendered GIF; a screen-recorded MP4; a Remotion composition.
For each form, cover the embedding method, file size, the GitHub attachment limits (the scout claims 10 MB free and 100 MB paid), reproducibility from source, and whether a test can regenerate it.
Start from VP#1, VP#2, VP#20, VP#36. Read the measurements in marketing-topic-map/channel-video-production-software.md (11 v2 casts, 8 v3 casts, cast_recorder.py, 0 VHS tapes) and product-audit/exemplar-readmes.md (demos in 0 of 18 fleet READMEs versus 16 of 40 upstream).
Fetch and cite with dates: the asciinema docs (CLI, player, asciicast v2 and v3 formats, agg); the charmbracelet/vhs README and tape command reference; GitHub Docs "Attaching files"; web.dev "Replace animated GIFs with video".
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: the 16 upstream READMEs with demos; record each one's form and size.
Measure, do not cite:
- render one fleet cast (copied to ~/.cache/research-lang/exemplars/product/) through agg to GIF, and a VHS tape of the same session to GIF and MP4; record bytes and wall time;
- run each regeneration twice and diff the outputs for determinism;
- record every command.
Decide:
- the default demo form per surface;
- whether demos must be generated from a committed tape or script;
- the regeneration check a skill step runs.
```

#### Dive vid-legibility-thresholds

```
Investigate the minimum rendered text size that keeps terminal and editor text readable at docs embed width, README width, 1080p video and a 360 px phone. Also cover terminal columns and rows, playback idle limits and speed, and the single vertical safe rectangle for Shorts, Reels and TikTok.
No published minimum for code or terminal text in video exists (scout finding VP#4). The floor this dive sets is therefore derived from its own measurement and must be labelled "derived" in the deliverable. Do not cite interface type-scale guidelines as a source for it.
The scout derived a safe rectangle of top 288, bottom 672, left 120, right 192 px at 1080x1920. Treat it as a claim: re-derive it from current platform creative-spec pages and label the result derived if no platform publishes one.
In-frame contrast reuses the css-theming contrast thresholds; apply them to the recording theme, do not research them.
Start from VP#3, VP#4, VP#5, VP#24, SF#5 to SF#9, SF#26, SF#30. Read rules/css-theming.md for the contrast check.
Fetch and cite with dates: WCAG 2.2 Understanding pages for SC 1.4.4 and 1.4.10 (for reflow and resize context only); the YouTube Shorts, TikTok and Instagram creative-spec pages; the VHS settings reference (FontSize, Width, Height, Padding, PlaybackSpeed).
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- render a fixed session at 80, 100, 120 and 180 columns with VHS at several font sizes;
- scale each render to each target width and compute the rendered x-height and cap height in CSS pixels;
- compute the theme's foreground-background contrast with a script and compare to the css-theming threshold;
- record every command.
Decide:
- the derived legibility floor: column cap and minimum rendered x-height per surface;
- the idle-limit and speed defaults;
- the vertical safe rectangle the skill enforces, with its derivation.
```

#### Dive vid-accessibility

```
Investigate the accessibility gate for every published recording. This dive is the sole owner of caption delivery on every platform, LinkedIn included.
- captions for narrated video (WCAG 1.2.2);
- audio description versus a media alternative for silent screencasts (1.2.3 and 1.2.5), including whether a text asciicast with a transcript satisfies it;
- descriptive transcripts;
- flashing (2.3.1) from fast-scrolling output and auto-zoom;
- pause, stop and hide for auto-playing demos (2.2.2);
- audio control (1.4.2);
- caption delivery per platform: YouTube caption upload, the LinkedIn caption file the scout describes as a single English SRT, burned-in versus file.
Start from VP#11, VP#12, VP#15 to VP#19, VP#31, SF#14, SF#15, SF#16, AE#19, YS#18, YP#30, LC#28 (caption half), LO#22 (video half).
Fetch and cite with dates: the W3C WCAG 2.2 Understanding pages for 1.2.2, 1.2.3, 1.2.5, 2.2.2, 2.3.1 and 1.4.2, using each page's own update date; W3C WAI "Making Audio and Video Media Accessible"; the LinkedIn Videos API caption fields and the LinkedIn video help page; YouTube caption upload help; the asciinema player accessibility notes.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Legal deadlines (for example ADA Title II and the EAA) are marketing law: name them in one line, do not research them.
Measure, do not cite:
- run the fleet's existing cast player pages through axe-core (npx @axe-core/cli <url>);
- detect flashes in one rendered demo with a frame-difference script against the 2.3.1 three-flashes threshold;
- record every command.
Decide:
- the MUST and SHOULD artifacts per recording type: caption file, transcript, pause control, no autoplay with sound;
- the caption-delivery table per platform;
- the checks a skill step runs.
```

#### Dive vid-scrub-and-reproducibility

```
Investigate how a recording leaks secrets, and how to stop it. Leak paths: tokens, hostnames, home paths and usernames in the cast JSON; environment output and shell prompts; registry credentials.
Also cover how a recording stays reproducible: a pinned environment, a scripted session, a fixed prompt, fixed time and seeds.
Start from VP#2, VP#5, VP#6, VP#30. Read the fleet's cast_recorder.py and cast files as described in marketing-topic-map/channel-video-production-software.md (read only).
Fetch and cite with dates: the asciinema CLI docs (environment capture, idle limits); the VHS docs (Env, Hide and Show commands); the gitleaks and trufflehog docs on custom rules and file types; the GitHub secret-scanning docs (supported file types and push protection).
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: two upstream projects that generate demos in CI, found among the 16 READMEs with demos.
Measure, do not cite:
- copy the fleet cast directories to ~/.cache/research-lang/exemplars/product/ and run gitleaks detect --no-git --source <copy>;
- grep the copy for /home/, /Users/, hostnames and email patterns;
- report counts, never the values;
- record every command.
Decide:
- the scrub gate a recording must pass before commit or upload;
- the reproducibility requirements (scripted source committed, environment pinned);
- whether the gate belongs in the channel-publishing rule or the terminal-demo skill.
```

### 6. channel-communities (CH-COM)

**Question.** On which developer communities may a software team announce its tool, and what does each venue's contract require of the post, the account and the maker?

#### Dive com-hn-contract

```
Investigate the Hacker News contract for a tool announcement:
- Show HN eligibility (runnable, no signup, maker present) and title rules;
- URL versus text posts;
- vote-solicitation channels (team chat, newsletter CTAs, release notes, README badges);
- repost and second-chance pool rules;
- the published ranking description;
- posting-time evidence;
- the Launch HN YC-only fact.
The HN ban on generated or AI-edited text is owned by core-agent-action-boundary; cite that dive's clause, do not re-derive it.
Start from CM#1, CM#2, CM#4 to CM#7, CM#36, LP#11 to LP#16, LP#18.
Fetch and cite with dates: https://news.ycombinator.com/newsguidelines.html; https://news.ycombinator.com/showhn.html; https://news.ycombinator.com/newsfaq.html; public moderator comments on Show HN and reposts (cite each by item URL and date); the HN Algolia API docs.
Re-fetch every figure in this brief; the scout's 75,943-post measurement is a claim until re-run. Flag any figure that fails to reproduce.
Measure, do not cite:
- re-run and extend the scout's Show HN measurement through the Algolia API (https://hn.algolia.com/api/v1/search_by_date?tags=show_hn, paginated by created_at_i);
- measure the outcome split by URL type (GitHub repo, product site, text post), by presence of a maker first comment, and by title pattern, with n and medians;
- record every command.
Decide:
- the Show HN checklist a draft fact sheet must pass;
- the vote-solicitation grep list and where it runs (README, release notes, chat templates);
- whether any timing advice survives the measurement;
- the repost rule.
```

#### Dive com-venue-rules

```
Investigate per-venue rules for announcing a tool:
- Reddit, sitewide plus r/programming, r/rust, r/selfhosted, r/opensource and r/commandline;
- Lobsters (the scout claims a self-promotion share under 25%, a new-account gate of about 70 days, and a vibecoding tag);
- Stack Overflow (linking your own tool with disclosure, official-support tags);
- dev.to and Hashnode AI-content approval and cross-post rules.
For each venue, cover the account prerequisites a new account cannot meet on launch day. The generated-text bans (Stack Overflow and others) are owned by core-agent-action-boundary; cite them.
Start from CM#10 to CM#17, CM#19, CM#20.
Fetch and cite with dates: Reddit Rules and the Reddit Help self-promotion page; each subreddit's rules through an authorised route (the scout got HTTP 403; try https://www.reddit.com/r/<sub>/about/rules.json with a generic user agent once per subreddit, and record any block rather than bypassing it); https://lobste.rs/about; the Stack Overflow help pages on promotion; the dev.to content policy; Hashnode community guidelines.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- per subreddit: the fetch status code, rule count, and the rules that name self-promotion, verbatim;
- record every command.
Out of scope: canonical URL handling for syndication (marketing SEO).
Decide:
- the venue table: allowed post type, account prerequisite, disclosure, AI rule (cited), source date;
- which venues the skill recommends for a CLI tool;
- which it marks human-only.
```

#### Dive com-own-community-home

```
Investigate where a small project should host its own community: Discord, Discourse or GitHub Discussions; search visibility of messages; history loss on free chat plans; the process that moves answered chat questions into docs; SUPPORT routing and community-health files; code-of-conduct enforcement and moderation before launch traffic.
Per-release Discussions announcements belong to gh-release-announcement; this dive decides only whether Discussions is the community home.
Start from CM#21 to CM#27, GH#19, GH#38. Read product-audit/distribution-posture.md (Discord with 5 members whose webhook posts CI failures; Discussions on 1 of 17 repos; Discord linked from no Grimoire repo).
Fetch and cite with dates: Discord Community Guidelines and the server discovery requirements; the Discourse hosting docs; GitHub Docs on Discussions and categories; GitHub Docs "Creating a default community health file" and "Adding support resources to your project"; the Contributor Covenant 2.1 enforcement guidelines; the Slack free-plan history limits.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: five OSS CLI projects of similar size; record each one's community home and SUPPORT routing.
Measure, do not cite:
- for all 17 fleet repos: Discussions on or off, SUPPORT file, CODE_OF_CONDUCT with a reporting contact, and issue-template contact links (gh api repos/<o>/<r>/community/profile; gh api repos/<o>/<r> -q .has_discussions);
- record every command.
Decide:
- the default community home for a small fleet;
- the minimum setup before any launch;
- whether the Discord webhook should carry user-facing release news, and what it should stop posting.
```

### 7. channel-launch (CH-LAUNCH)

**Question.** Which eligibility and link-target gates must each launch venue's entry pass, and which launch shape and venue order does the measurable record support for a small developer-tool team?

#### Dive launch-venue-gates

```
Investigate per-venue launch gates.
Product Hunt: eligibility (product, not content; usable now), personal-account launching and co-makers, the go-live instant and scheduling window, weekday versus weekend, permitted support wording ("never ask for upvotes"), where links may be posted, relaunch after a major change, comment duty.
Directories: BetaList, Uneed and DevHunt requirements, field limits and vote mechanics; selfh.st and other self-hosted or OSS directories; awesome-list entry requirements (age, description style, badge rules).
Link targets: for every venue, what the linked page must offer (runnable without signup, install command visible). Show HN's own rules come from com-hn-contract; cite them. The install path itself is covered by installer-script and is out of scope.
Start from LP#1 to LP#10, LP#19 to LP#22, LP#32, LP#35, LP#38, LP#39, LP#40, GH#26, GH#27, CM#8, CM#9, CM#34, CM#35.
Fetch and cite with dates: Product Hunt help articles 17734306, 17734341, 17734355, 17734384, 17734397, 17734411 and 17734646; the BetaList submission page and FAQ; the Uneed and DevHunt submission rules; the selfh.st submission guide; the sindresorhus/awesome contributing guidelines and the awesome-lint rules.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- per directory, the field limits from the live public form markup (curl -s <form url> and a maxlength grep), where the form is public;
- for the fleet's two landing pages, run the link-target check (HTTP status, signup or form wall present, install command present) with curl and grep;
- record every command.
Decide:
- the per-venue gate checklist;
- the link-target check and its pass condition;
- which venues fit a free OSS CLI;
- which actions stay human-only (submit, pay, post), cited from core-agent-action-boundary.
```

#### Dive launch-shape-evidence

```
Investigate what the public record shows about launch shape for developer tools: launch week, launch day, or a rolling release cadence; and the order of venues across a launch. Limit the answer to what changelogs and launch-week pages can measure. First-user acquisition tactics are deferred; do not research them.
Start from LP#28, VP#33, VP#40. Read marketing-topic-map/channel-launch-platforms.md (the scout's Linear changelog gap, mean 11.67 days, a claim to re-run) and VP#40 (no launch publishes a shot list; the written post and changelog are the canonical record).
Primary sources, each cited by URL and access date: supabase.com/launch-week and the Supabase launch-week blog posts; the public changelogs of Linear, Raycast, Vercel, Zed and Supabase, plus at least one more developer-tool changelog with dated entries; the launch posts each launch week links.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Measure, do not cite:
- for at least six developer-tool changelogs, extract entry dates over 24 months (curl and python3 -I), compute the gap distribution, and test whether entries cluster around announced launch weeks;
- for three launch weeks, record each day's headline, venue order and whether each headline has a written post, a demo asset and a changelog entry;
- record every command.
Decide:
- the default launch shape for a small fleet, stated only as far as the measured cadence supports it;
- the venue-sequence template the launch-plan skill emits;
- the canonical-record check: every launch headline has a written post and a changelog entry, video optional.
```

### 8. channel-microblog (CH-MB)

**Question.** Which counting, link, alt-text, card and account-proof rules must each microblog variant pass, and where should a release post put its link?

#### Dive mb-variant-validator

```
Investigate the exact counting rule per platform. The scout claims: X weighted characters (280, URLs counted as 23), Bluesky 300 graphemes, Mastodon 500 characters with links counted as 23, Threads 500 characters and 5 links; and documentation-versus-schema conflicts.
Also cover alt-text length limits and terminal-screenshot alt text; Bluesky link cards that the client must build; the fediverse:creator meta tag; oEmbed survival; account proof (Bluesky domain handle, Mastodon rel=me verification).
Start from MB#4, MB#5, MB#15 to MB#20, MB#25, MB#32, MB#34, MB#37 in marketing-topic-map/channel-microblog.md.
Fetch and cite with dates: the twitter-text library and the X counting docs; the atproto RichText docs and the Bluesky lexicons for app.bsky.feed.post and app.bsky.embed.external; Mastodon docs (statuses, profile verification, the fediverse:creator announcement); the Threads API publishing reference.
Re-fetch every limit in this brief; each is a scout claim. Flag any that fails to reproduce.
Measure, do not cite:
- write 30 test strings covering emoji, ZWJ sequences, combining marks, CJK and URLs;
- count each with the official libraries (twitter-text via npx, @atproto/api RichText) and with a naive length; report the disagreements;
- fetch one fleet site page and test for fediverse:creator and rel=me (curl -s and grep);
- record every command.
Out of scope: og:image and site metadata (marketing); account voice (marketing).
Decide:
- the validator spec per platform (counting, links, alt text, card building);
- the account-proof checks and where they run.
```

#### Dive mb-link-and-thread-defaults

```
Investigate two draft properties a rule can check: where a release post puts its link on X, Bluesky, Mastodon and Threads (body, first reply, or none), and whether a release is a single post or a thread (and if a thread, how many posts and where the link sits).
Which platform a team should be on is deferred as an audience judgement; do not answer it.
Start from MB#6, MB#7, MB#13, MB#14, MB#22, MB#23, MB#24 in marketing-topic-map/channel-microblog.md.
Primary sources, each cited by URL and date: the X ranking code repository README and any open-sourced link-related signal; Bluesky docs on feeds and link embeds; Mastodon docs (no algorithmic ranking on the home timeline); Meta's Threads help on links; any platform statement on link reach.
Vendor data (label it vendor): Buffer or other link-reach studies with a methods section; record sample size and dates or mark unusable.
Re-fetch every figure in this brief; flag any scout figure that fails to reproduce.
Exemplars: ten developer-tool accounts present on Bluesky or Mastodon.
Measure, do not cite:
- through the public Bluesky AppView API (app.bsky.feed.getAuthorFeed) and the Mastodon public API (accounts/:id/statuses), pull the last 50 posts of each exemplar account;
- compare reposts and replies for posts with and without an external link, and single posts versus threads, reporting medians with n;
- X is not measurable without a paid API tier; record that and do not scrape;
- record every command.
Out of scope: automation (core-agent-action-boundary); account voice (marketing).
Decide:
- the link-placement default per platform with its evidence grade;
- the single-post-versus-thread default for a release;
- whether microblog variants warrant their own skill or a section of launch-plan.
```

## Deferred

The 45 deferred candidates are listed by group in the map. They cluster as follows.

- **LinkedIn paid (9).** M-LA-1 to M-LA-9. The fleet has no paid budget. Revisit when one exists. The audience-expansion default conflict between UI and API is the first rule to write then.
- **LinkedIn organic extras (7).** M-LI-5 cadence, M-LI-12 hashtags, M-LI-13 comment strategy, M-LI-16 newsletter and Live, M-LI-17 profile surfaces, M-LI-18 Page administration, M-LI-19 Suggested Feeds. M-LI-18 returns if li-format-and-reach-evidence decides to create a Page.
- **YouTube extras (2).** M-YT-4 title-thumbnail craft, M-YT-18 podcast playlists. Thumbnail craft cannot be measured without Studio access.
- **Video production extras (2).** M-VID-11 tool licences, M-VID-12 AI editing. The encode and loudness part of M-VID-9 also waits; narrated video is rare in the fleet today.
- **Short-form beyond YouTube (5).** M-SF-2 to M-SF-6. TikTok and Instagram are unused by the fleet. Reuse penalties matter only once the fleet posts to several vertical platforms.
- **GitHub extras (3).** M-GH-13 FUNDING.yml, M-GH-14 Pages and custom domains, M-GH-15 first-thousand-users tactics. M-GH-15 waits until primary maintainer accounts are found; it is unlikely to yield a checkable rule.
- **Communities extras (1).** M-CM-12 member counts and community metrics.
- **Microblog extras (4).** M-MB-5 replies and mentions, M-MB-9 platform choice, M-MB-11 hashtags and scheduling, M-MB-13 small-account metrics. M-MB-9 returns once an adopter has a microblog account or a developer survey publishes per-platform shares with a method.
- **Talks, podcasts, webinars, events (8).** M-EV-1 to M-EV-4 and M-EV-6 to M-EV-9 (M-EV-5 is folded). The CFP rules in M-EV-1 are the strongest next-wave candidate: the rules are checkable, and the PyCon and KubeCon policies on AI-written proposals are specific.
- **Owned publishing not handed off (4).** M-OP-5 feeds, M-OP-7 executed code samples, M-OP-9 post image alt text, M-OP-11 briefs and blog migration. These return when a fleet blog exists.

**Hand-offs (15), one line each.**

- Marketing owns:
  - the legal disclosure standard, including EU AI Act Article 50 scope (VP#26) and the FTC placement standard for in-video sponsorship (VP#27) (M-CO-4);
  - claim policy (M-LI-20);
  - answer-engine visibility (M-LI-21, part of M-OP-10);
  - video SEO (M-YT-17);
  - README copy (from M-GH-3);
  - lifetime deals (M-LN-9);
  - newsletter sponsorship and email (M-LN-10, M-OP-8);
  - press kit (M-LN-11);
  - account voice (M-MB-12);
  - canonical and syndication SEO (M-OP-1);
  - SEO metadata and `og:image` (M-OP-2);
  - scaled content abuse (M-OP-3);
  - sponsored links (M-OP-4);
  - content decay (M-OP-6);
  - AI search exposure and post analytics (M-OP-10).
- Split halves, not counted separately: README copy (M-GH-3) and UTM and attribution (M-LN-7) to marketing; the clean-machine install path (M-LN-8) to installer-script and the ux sibling's first-run work.
- The ux sibling owns deck and thumbnail visual design where they become interface design.

## Artifact set

The frame proposed `linkedin-post`, `youtube-video` and `launch-plan` as channel skills inside `product-essentials`. The audits and scouts revise that.

| Artifact | Kind | What loads it | Revision against the frame |
|---|---|---|---|
| `channel-publishing` | rule | See below. | New. Every scout found the same agent-safety constants: agents draft and humans post; HN and Stack Overflow ban generated text; LinkedIn bans automation; YouTube requires consent for API uploads. It also carries the channel-inventory rule: link only accounts the inventory lists. These belong in one always-checked rule, not repeated per skill. |
| `github-presence` | skill | See below. | New. The frame names GitHub as a channel but proposes no skill for it (`product-frame.md:28`, `:73-75`). GitHub is the only active channel (`product-audit/distribution-posture.md`, `product-audit/exemplar-readmes.md`). The skill also runs the inbound-link check against the channel inventory and the tag-without-release check. |
| `linkedin-post` | skill | Description trigger on drafting or reviewing a LinkedIn post or document post. Also loaded by `launch-plan`. | Kept, but person-led by default, because no company Page exists. Ships a dated facts reference and a draft checker for length, fold budget, bait patterns and alt text. The fold budget is derived and labelled so, because the fold cannot be measured without breaching LinkedIn's terms. |
| `youtube-video` | skill | Description trigger on preparing a YouTube upload, Short or channel setup. Path trigger on `**/youtube/**` metadata files. | Narrowed. It covers metadata, chapters, channel defaults, labels, the Shorts spec and the reporting thresholds. It drops thumbnail and hook craft, which cannot be measured without Studio (`product-audit/exemplar-youtube-channels.md`). |
| `terminal-demo` | skill | Path trigger on `**/*.cast` and `**/*.tape`. Description trigger on recording a demo, screencast or GIF. | New. Terminal casts are the fleet's live demo practice; studio video is not. |
| `community-post` | skill | Description trigger on preparing an HN, Lobsters, Reddit, Stack Overflow or dev.to post. Also loaded by `launch-plan`. | New. It produces fact sheets and checklists, never paste-ready HN or Stack Overflow text. |
| `launch-plan` | skill | Description trigger on planning a launch or major release announcement. | Kept. It orchestrates the venue gates, the launch shape and the launch-goal field (from gh-signal-validity), and calls the other channel skills. Microblog variants live here as a section unless mb-link-and-thread-defaults justifies a `microblog-post` skill. |
| `product-essentials` (bundle) | bundle | Installed by adopters. | It carries the rule and all six channel skills. The consolidator may split a `channels` bundle out if the marketing and ux artifacts make the bundle exceed the context budget. |

**What loads `channel-publishing`.** Two triggers:

- Path scope on `marketing/**`, `**/*.post.md`, `**/announcements/**`, `.github/release.yml`, `cliff.toml`, `**/*.cast`, `**/*.tape` and the channel inventory file (its path is decided by core-facts-and-channel-inventory).
- A description trigger on drafting any public post, upload or listing.

**What loads `github-presence`.** Two triggers:

- A description trigger on release preparation, repository metadata, topics, social preview or registry listings.
- A path trigger on `.github/release.yml`, `cliff.toml`, `Cargo.toml`, `pyproject.toml`, `package.json`, `**/Formula/*.rb` and `.github/profile/README.md`.

**Facts files and the channel inventory.** Each skill keeps its dated platform facts in a reference file with a URL per fact, a verified date, a refresh interval and a provenance label. This follows the frame's third falsifier, which fired (correction 7). The adopter keeps one channel inventory file per organisation. core-facts-and-channel-inventory decides whether facts files are per skill or shared, where the inventory lives, and which staleness and inbound-link checks fail CI.

## Frame corrections

1. **The YouTube channel already exists, and two audits disagree on it.** The frame treats YouTube as a channel to open (`product-frame.md:27`). `product-audit/exemplar-youtube-channels.md` ("Fleet evidence") concludes the fleet has no YouTube presence, but it searched only fleet files for links. `product-audit/distribution-posture.md` section 4 fetched the handle directly and found "ocx" (@ocx-sh) with two Shorts published 2026-11-17 (12 and 7 views) and an empty description. Both audits agree that 0 of 17 repositories link a YouTube channel. The map follows the posture audit on existence, because a direct observation outweighs an absence of links. Ownership is inferred, not proven: the handle matches the org, the upload date matches the site release, and the org has a private `marketing` repo. The first task is fixing an existing, unlinked channel. core-facts-and-channel-inventory owns the inbound-link fix and records ownership once confirmed.
2. **There is no LinkedIn company Page.** Two personal profiles are the only presence (`product-audit/distribution-posture.md`). The frame's `linkedin-post` covers "a company-page update" (`product-frame.md:73`). The default is therefore person-led posting, with Page creation as a decision (`marketing-topic-map/channel-linkedin-company-people.md`).
3. **Release notes are generated, not written.** git-cliff and cargo-dist generate them. ocx has 45 BREAKING entries with 0 Migration lines (`product-audit/distribution-posture.md`), and release-note models contradict across repositories (`product-audit/config-inventory.md`). The lever is the generator template and commit subjects, not a prose-writing skill.
4. **`youtube-video` cannot check thumbnail, hook or retention.** The frame scopes it to "title, thumbnail, hook, structure, description" (`product-frame.md:74`). None of thumbnail, hook or retention is measurable without Studio access. No title feature lifts the median by more than about 14%, apart from company announcement titles (`product-audit/exemplar-youtube-channels.md`).
5. **Company channels are not educator channels.** The median of per-channel median views is 2,506 for company channels against 72,825 for educators (`product-audit/exemplar-youtube-channels.md`). Educator-channel advice must not be transplanted.
6. **GitHub is named but has no skill in the frame.** The frame lists "GitHub as a channel" (`product-frame.md:28`) but its artifact table has no GitHub artifact (`:73-75`). It is the only active channel, and it has the largest checkable gaps: topics on 3 of 17 repos, 0 of 18 social images, no org profile READMEs, and tags without Releases in four repos (`product-audit/distribution-posture.md` smells 8 and 9, `product-audit/exemplar-readmes.md`, `marketing-topic-map/channel-github-as-channel.md`). It gets its own skill.
7. **The third falsifier fired.** Channel facts decay faster than a published skill. The scout reports X ranking weights changing within two weeks, and LinkedIn Help pages carry only relative dates (`marketing-topic-map/channel-microblog.md`, `marketing-topic-map/channel-linkedin-organic.md`). Every channel skill pins its facts in a dated reference file with a staleness check.
8. **Agents must not author paste-ready text for some venues.** Hacker News bans generated or AI-edited text, and Stack Overflow bans generative-AI content (`marketing-topic-map/channel-communities.md`). The community skill outputs fact sheets for a human to write from.
9. **The live demo practice is terminal casts, not studio video.** The fleet has 19 asciicast files and a PTY recorder, and 0 video or caption files (`marketing-topic-map/channel-video-production-software.md`). The frame's video framing is replaced by `terminal-demo`.
10. **Zero channel guidance exists in fleet configuration.** So collision risk with new artifacts is low. However, the existing claim policy (`design_brief_landing_page.md:101-118`) loads in no session, and `product-context.md` is path-scoped away from READMEs (`product-audit/config-inventory.md`). Channel skills must reference the marketing claim policy explicitly once marketing publishes it.
11. **Missing social cards are a prerequisite, not a channel topic.** `og:image` is set on 0 of 298 ocx.sh pages (`product-audit/distribution-posture.md`). Every link post on LinkedIn, X, Bluesky and Mastodon depends on these cards. They are owned by marketing (brand assets) and the site rule, and channel skills only check the card spec per platform.
12. **Channel measurement cannot assume site analytics.** The fleet runs none, by decision (`product-audit/distribution-posture.md` section 3). Launch and channel skills rely on platform-native counters, registry downloads and the GitHub traffic window.
13. **Microblogs are a lower priority than the frame's channel list implies.** The fleet has no X, Bluesky or Mastodon presence, and no audience evidence was found (`product-audit/distribution-posture.md`, `marketing-topic-map/channel-microblog.md`). Microblogs are the last selected topic, platform choice is deferred, and their skill is conditional.
14. **Short-form video is not a separate channel decision for this fleet.** No conversion evidence exists for developer tools (`marketing-topic-map/channel-short-form-video.md`), and the fleet's only vertical video is on YouTube (`product-audit/distribution-posture.md`). The question is answered inside the YouTube portfolio and measurement dives.
15. **Platform measurement goes through sanctioned access only.** The frame asks for platform facts to be fetched (`product-frame.md:31-35`) but says nothing about how. LinkedIn's prohibited-software page bars crawlers and bots, and unauthenticated LinkedIn, X and Reddit requests are refused (`product-audit/distribution-posture.md` section 4 and section 5). Dives therefore read help and legal pages, use documented public APIs and feeds, and fall back to derived values or a human-run protocol where those do not reach. The LinkedIn fold is the first case (`marketing-topic-map/channel-linkedin-organic.md` LO#1, LO#2).

## Critic responses

Each criticism of revision 1, and what this revision did about it.

**Missing items.**

1. *distribution-posture smell 8 (tags without Releases) had no brief or deferral.* Accepted. New candidate M-GH-16; gh-release-announcement now measures tags against Releases, exempts internal repos only on evidence, and decides the check.
2. *VP#26 (AI Act Art. 50) and VP#27 (sponsored mention placement in video) were unmapped.* Accepted. Both join M-CO-4 for the legal standard (hand-off) and M-CO-2 for the mechanism and placement. core-platform-labels now decides the in-format placement rule and the machine-readable marking mechanism.
3. *LO#40 (cost of low-quality video, reversibility) was cited by no row.* Accepted. It joins M-LI-8, and li-policy-and-ai-content decides whether a video quality checklist gates LinkedIn video.
4. *The two audits conflict on YouTube presence, and correction 1 took a side silently.* Accepted. Correction 1 now names the conflict, explains why the direct fetch wins, and states that ownership is inferred.
5. *No brief owned the inbound-link fix ("unlinked from 0 of 17").* Accepted. New candidate M-CO-6. core-fact-decay became core-facts-and-channel-inventory and owns the inventory schema and the inbound-link check. yt-upload-metadata-contract and gh-repo-card take their links from it.

**Weak briefs.**

6. *li-limits-and-fold rendered LinkedIn embeds headlessly without a terms check.* Accepted. The brief now reads User Agreement section 8.2 and Help a1341387 first, bans automated access to member content unless those texts permit it, and falls back to third-party measurements, a labelled derived budget and a human-run protocol. The same sanctioned-access rule now applies to YouTube (Data API or RSS feed, never watch-page scraping) and to X (not measured without a paid tier). See frame correction 15.
7. *Briefs stated scout figures as givens.* Accepted. Every brief now carries a re-fetch line and words each scout figure as a claim.
8. *core-fact-decay named no source for fact versioning, and CDX undercounts.* Accepted. The brief names endoflife.date, mdn/browser-compat-data, the github/docs history (exact edits) and this catalog's own dating convention. It states the CDX limit and reports CDX counts as lower bounds.
9. *launch-shape-evidence named no primary source for first-user write-ups, and the question cannot yield a rule.* Accepted. First-users tactics (M-GH-15) are deferred. The dive is limited to changelog cadence and launch-week records, with named primary sources and a checkable canonical-record decision.
10. *mb-platform-choice's "which platform is worth it" cannot yield a checkable rule.* Accepted. M-MB-9 is deferred. The dive became mb-link-and-thread-defaults and decides only checkable draft properties.
11. *vid-legibility-thresholds cited Apple HIG and Material as a source for terminal x-height.* Accepted. That source is removed, and the floor is labelled derived from the dive's own measurement. The safe rectangle is also labelled a derivation.

**Overlaps.** Each is resolved by a single owner; see the "Single owners" table under "Selected for this wave".

12. *gh-signal-validity and launch-readiness-and-measurement both fetched the traffic API.* Accepted. launch-readiness-and-measurement is dissolved. gh-signal-validity owns the traffic API, the archive decision, the registry counters and the launch-goal field. The link-target readiness check moved to launch-venue-gates.
13. *core-agent-action-boundary and com-hn-contract both owned the generated-text bans.* Accepted. The boundary dive is the sole owner; com-hn-contract and com-venue-rules cite it.
14. *li-limits-and-fold and vid-accessibility both covered LinkedIn video captions.* Accepted. vid-accessibility owns caption delivery on every platform. li-limits-and-fold keeps image alt text and document PDFs (M-LI-11 is now a split row).
15. *gh-release-announcement and com-own-community-home both covered GH#18.* Accepted. gh-release-announcement is the sole owner; com-own-community-home dropped GH#18.
16. *The Shorts success test and the view definitions sat in different dives.* Accepted. yt-measurement-and-testing owns both; yt-format-portfolio states its decision in those terms.
17. *li-format-and-reach-evidence and li-limits-and-fold started from the same rows.* Accepted. Limit rows (LO#21, LO#23, LO#31, LC#27, LC#28) moved to M-LI-1. LO#3 and LC#5 are split by half, and the format dive may not fetch limit pages.

**Sibling territory.**

18. *vid-legibility-thresholds in-frame contrast and type size are ux.* Partly accepted. Contrast now reuses the css-theming thresholds with no new research. Rendered text size is kept: it depends on each platform's playback width, phone width and scaling, which are channel facts. It is not interface design, and no ux dive measures recordings.
19. *launch-readiness UTM and install-path checks are marketing analytics and cli-first-run.* Accepted. UTM is handed to marketing analytics. The clean-machine install test is dropped as covered by installer-script and the ux first-run work. Only the per-venue link-target check stays, in launch-venue-gates.
20. *The gh-registry-listings README-rendering rule is docs-quality's.* Answered, not accepted. `rules/docs-quality.md` has no registry rule: `grep -n -i "registr\|crates.io\|relative link\|pypi"` returns nothing. How crates.io, PyPI, npm and the Marketplace render a reused README is a registry-channel fact. If docs-quality later adds a README-link rule, the consolidator merges.
21. *gh-release-announcement overlaps the commit-message rules.* Answered. The brief already names the overlap and forbids a new commit rule. It now also leaves release-note wording to the frame's `marketing-copy` rule (`product-frame.md:69`). It owns only the GitHub Release mechanics: template, sections, Latest flag, tags and notifications.
