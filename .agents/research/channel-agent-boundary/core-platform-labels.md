---
title: Platform-native labels and disclosure placement per channel
program: product
sub_program: channels
topic: channel-agent-boundary
worker: core-platform-labels
date_researched: 2026-11-27
model: sonnet
sources_fetched: 34
scope: |
  Covers the platform-native fields and toggles that mark content as AI-generated or altered, paid or branded, or automated-account, on YouTube, LinkedIn, TikTok, X, Bluesky, Mastodon and Instagram; C2PA and the EU AI Act Article 50 only as the platform-side marking mechanism; where a disclosure sits per format; and how a channel skill keeps dated platform facts fresh.
  Does not cover whether the law requires a label (marketing hand-off M-CO-4; not yet landed when this was written) or Article 50 scope. Threads, Pinterest, Reddit and Discord label fields were not researched.
---

# Platform-native labels and disclosure placement per channel

## Contents

1. Summary
2. Findings
   1. Label table per platform
   2. Measurement: the fleet's two Shorts
   3. Placement per format
   4. C2PA and Article 50 as the platform-side mechanism
   5. What an agent may do alone on a channel
   6. Keeping platform facts and the channel list fresh
   7. Scout figures re-checked
3. Normative guidance candidates
4. What an agent must not decide alone
5. AI-agent angle
6. Contested / evolving
7. Dated facts
8. Sources

## Summary

- YouTube exposes the altered-or-synthetic label through the API as `status.containsSyntheticMedia` (writable in `videos.insert` and `videos.update`, added 2024-10-30 per the [revision history](https://developers.google.com/youtube/v3/revision_history)). Studio calls the same choice "AI use" ([YouTube Help 14328491](https://support.google.com/youtube/answer/14328491)).
- YouTube's `paidProductPlacementDetails.hasPaidProductPlacement` stopped defaulting to false on 2026-11-16: an omitted value no longer declares "no paid placement" ([revision history](https://developers.google.com/youtube/v3/revision_history)). An agent that sends the field must send an explicit boolean.
- YouTube's paid-promotion label appears "at the beginning of your video" ([YouTube Help 154235](https://support.google.com/youtube/answer/154235)); it does not replace a spoken or on-screen disclosure.
- TikTok requires a label on realistic AI-generated or significantly edited content from 2026-09-24 ([TikTok guidelines](https://www.tiktok.com/community-guidelines/en/integrity-authenticity)); the Direct Post field is `is_aigc`, and branded content uses `brand_content_toggle` ([API reference, last updated 2026-11-25](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)). The scout's date reproduces.
- X exposes `paid_partnership` (changelog entry 2026-06-03) and `made_with_ai` on `POST /2/tweets` ([spec](https://docs.x.com/x-api/posts/create-or-edit-post), [changelog](https://docs.x.com/changelog)). `made_with_ai` has no dated changelog entry that I could find.
- LinkedIn has no AI-generated field. Its path is: C2PA Content Credentials in the uploaded file produce a C2PA icon ([LinkedIn Help a6282984](https://www.linkedin.com/help/linkedin/answer/a6282984)); a human-readable line in the post is the only author-set disclosure ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)).
- LinkedIn's Brand partnership label is a per-post composer toggle, public posts only, resets to Off every post, and applies to any exchange of value ([a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083)). No API field was found; the page does not say whether Company Pages can use it.
- Bluesky has a `bot` self-label and no AI-generated label ([lexicon](https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/com/atproto/label/defs.json), [docs](https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/moderation.md)). Mastodon's bot flag is "visual indication only" ([profile docs, updated 2026-04-15](https://docs.joinmastodon.org/user/profile/)) and the Account entity lists no AI field ([entity](https://docs.joinmastodon.org/entities/Account/)).
- X's automated-account label page returned HTTP 403 to every fetch route; its status ("in testing", invite-based) rests on a search result only and is unverified.
- Instagram reads IPTC `DigitalSourceType` but not C2PA manifests, while LinkedIn reads C2PA but not IPTC ([IPTC, 2026-03-18, citing an Indicator study](https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/)). An agent that wants a platform label from file metadata must write both.
- FTC: a disclosure is clearest "in the video itself", right before or at the start of the endorsement; a description alone is easy to miss; a disclosure behind "more" is not enough ([FTC Q&A](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)). That is the placement rule for video and for truncated posts.
- The YouTube Data API developer policy bars automated uploads or edits without "prior specific and express consent" and bars changing user-provided values ([policy](https://developers.google.com/youtube/terms/developer-policies)). So an agent prepares a publish package and a human triggers the write.
- EU AI Act: the Code of Practice on AI-generated content was finalised 2026-06-10 ([Commission](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)). Regulation (EU) 2026/1744 gives providers of generative systems already on the market before 2026-08-02 until 2026-12-02 for Article 50(2) machine-readable marking ([Cuatrecasas, 2026-07-24](https://www.cuatrecasas.com/en/spain/intellectual-property/art/digital-omnibus-ai-has-been-published)). That is five days from today; legal scope is the marketing sibling's.
- Five platform facts used here changed inside the last 12 months (YouTube API default 2026-11-16, TikTok 2026-09-24, X 2026-06-03, EU omnibus 2026-07-24, Mastodon docs 2026-04-15). A channel skill that carries them as prose goes stale; carry them as dated registry rows with a re-fetch command.
- The two fleet Shorts' label state is unobservable from this machine: `videos.list` needs an API key and returned 403 without one. Record it as unobservable; do not scrape.

## Findings

### 1. Label table per platform

"Set" means the agent writes the field in a publish package; the publish call itself stays with a human (section 5). "Verify" is something a reviewer can run or read. Items marked UNVERIFIED rest on a search result or scout row, not a fetched page.

| Platform | Label kind | Field or toggle | Set when | Default | Verify |
|---|---|---|---|---|---|
| YouTube | Altered or synthetic | API `status.containsSyntheticMedia` (boolean, writable in `videos.insert` and `videos.update`); Studio: Attributes, "AI use", Yes or No | The video shows a real person saying or doing something they did not, alters footage of a real event or place, generates a realistic scene that did not occur, or is music-focused ([14328491](https://support.google.com/youtube/answer/14328491)). Exempt: filters, blur, captions, upscaling or repair, idea generation, script or thumbnail help, cloning your own voice for voiceover, gameplay; the page says the list is not exhaustive | The Help page does not state one; the API page does not either. Treat as unset | `videos.list?part=status&id=<id>` with an API key or owner OAuth, read `status.containsSyntheticMedia`. Not measured here (section 2) |
| YouTube | Paid promotion | API `paidProductPlacementDetails.hasPaidProductPlacement`; Studio "Paid promotion" box. Label shows at video start | Branded content, sponsorships, endorsements or other commercial relationships ([154235](https://support.google.com/youtube/answer/154235)) | From 2026-11-16 the API field no longer defaults to false; omit means undeclared ([revision history](https://developers.google.com/youtube/v3/revision_history)) | `videos.list?part=paidProductPlacementDetails`; `search.list` takes `videoPaidProductPlacement` (added 2023-08-22) |
| YouTube | Auto-applied labels | None to set | YouTube may add a label from its own GenAI tools, from C2PA metadata (version 2.1 or higher) or from detection; labels from C2PA or manual review cannot be changed by the creator ([14328491](https://support.google.com/youtube/answer/14328491), [15447836](https://support.google.com/youtube/answer/15447836?hl=en)) | n/a | Studio notification only |
| LinkedIn | AI-generated | No field. C2PA icon when the uploaded image or video carries Content Credentials ([a6282984](https://www.linkedin.com/help/linkedin/answer/a6282984)); page states "not yet possible to identify and label all AI-generated and modified content" | Always sign generated images and video with C2PA where the generator does; add a text line when AI role is heavy and not obvious ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496)) | No label without C2PA | Read the file's manifest before upload: `c2patool <file>` (command not run here) |
| LinkedIn | Synthetic person | Policy text: do not share synthetic or manipulated media depicting a person saying something they did not say "without clearly disclosing the fake or altered nature" ([policies](https://www.linkedin.com/legal/professional-community-policies)) | A synthetic voice or face of a real person | n/a | Grep the draft for a disclosure sentence |
| LinkedIn | Paid or branded | Composer toggle "Brand partnership"; label reads "Brand Partnership" ([a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083)) | Content shared in exchange for payment, endorsements, free products or services or other benefit; the page says "must" | Off, and resets to Off for every post; only for public posts | Open the live post and read the label; no API field found |
| TikTok | AI-generated | Direct Post `is_aigc` (bool, optional); sets "Creator labeled as AI-generated" in the description ([API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)) | Realistic AI-generated or significantly edited scenes or people; from 2026-09-24 ([guidelines](https://www.tiktok.com/community-guidelines/en/integrity-authenticity)) | Not stated | Request body contains `"is_aigc": true` |
| TikTok | Paid or branded | `brand_content_toggle` (third-party paid partnership), `brand_organic_toggle` (own business). UI labels: "Promotional content" for Your brand, "Paid partnership" for Branded content ([sharing guidelines, 2026-08-04](https://developers.tiktok.com/doc/content-sharing-guidelines)) | A paid partner or your own product promotion | Toggle off in the UI. The reference page's "required" column for `brand_content_toggle` reads ambiguous in the fetch; confirm in the live page before coding | Branded content cannot be private. Unaudited API clients can only post privately ("All content posted by unaudited clients will be restricted to private viewing mode") |
| X | AI-generated | `made_with_ai` (boolean) on `POST /2/tweets`: "Disclose that the tweet contains AI-generated media" ([spec](https://docs.x.com/x-api/posts/create-or-edit-post)) | The post's media is AI-generated | Not stated; no dated changelog entry found | Request body |
| X | Paid | `paid_partnership` (boolean); changelog "Jun 3, 2026" ([changelog](https://docs.x.com/changelog)) | Paid promotion | Not stated | Read back with `tweet.fields=paid_partnership` |
| X | Automated account | Profile label "automated". Developer policy: "you must clearly indicate what the account is and who is responsible for it", bio statement suggested ([policy](https://docs.x.com/developer-terms/policy)). Label page: HTTP 403 | An agent-run account, or any account where agents post unattended | n/a | UNVERIFIED: label is "in testing" and invite-based (search result, not fetched). Verify the bio line with a profile read |
| Bluesky | Automated account | Self-label value `bot` on the profile record; other self-labels are `!no-unauthenticated`, `porn`, `sexual`, `nudity`, `graphic-media`. No AI-generated label | Any bot account; a bot should reply or interact only with users who tagged it ([bots doc](https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/starter-templates/bots.mdx)) | none | Read the profile record's `labels` |
| Mastodon | Automated account | Profile setting "Automated" (bot flag); Account entity `bot`, "visual indication only" ([profile docs](https://docs.joinmastodon.org/user/profile/), [entity](https://docs.joinmastodon.org/entities/Account/)). No AI field | Bot or unattended account | Off | `GET /api/v1/accounts/lookup?acct=...` and read `bot` |
| Instagram | AI-generated | "AI info" label: applied by creator or when Meta detects "industry standard AI image indicators" ([Meta, page updated 2025-02-19](https://transparency.meta.com/governance/tracking-impact/labeling-ai-content)). Reads IPTC `DigitalSourceType`, not C2PA ([IPTC](https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/)) | Generated images and video | Auto only if metadata detected | UNVERIFIED for the creator-side toggle path and any API field: no Meta primary page for it was fetched |
| Instagram | Account-level | Optional "AI creator" profile label, announced 2026-05-04, gradual rollout; post-level "AI info" wins when both apply ([Social Media Today](https://www.socialmediatoday.com/news/instagram-adds-ai-creator-labels/819267/), secondary) | Account that regularly posts AI-made content | Off | Secondary source only |
| Instagram | Paid | "Paid partnership" label (scout row SF#24, not fetched here) | A partner | Off | UNVERIFIED here |

Gaps stated plainly: no fetched primary page for Instagram's paid-partnership label, for Threads, or for X's automated-label setup.

### 2. Measurement: the fleet's two Shorts

The grounding audit lists a YouTube channel `@ocx-sh` (id `UCKuRD68HkNpla-vY6-YBTHg`) with two videos from 2026-11-17 ([distribution-posture.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md), YouTube row). Commands run on 2026-11-27:

```
curl -s 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg' | grep -oE "<yt:videoId>[^<]+|<title>[^<]+|<published>[^<]+"
```
Result: `5qbGkPhxNpQ` "OCX Shorts 01: Pin Node.js in the repo", published 2026-11-17T18:38:11+00:00; `DKmxkfSgN8E` "... - Dino Edition", published 2026-11-17T18:04:44+00:00. The feed carries no label fields.

```
curl -s "https://www.googleapis.com/youtube/v3/videos?part=status&id=5qbGkPhxNpQ"
```
Result: HTTP 403, `PERMISSION_DENIED`, "Permission denied on the service." No API key is set in this environment (`env | grep -iE "youtube|google_api"` printed nothing).

Conclusion: `status.containsSyntheticMedia` and `paidProductPlacementDetails` for both Shorts are unobservable without an API key or owner OAuth; I did not scrape watch pages. Whether the field is returned for public videos under a plain key is also unconfirmed: the [videos resource page](https://developers.google.com/youtube/v3/docs/videos) says only that some `status` fields depend on authorization. A follow-up needs one API key; the two commands above become `curl "https://www.googleapis.com/youtube/v3/videos?part=status,paidProductPlacementDetails&id=5qbGkPhxNpQ,DKmxkfSgN8E&key=$KEY"`. A "Dino Edition" suggests an animated or generated variant; whether it is "realistic" under 14328491 is a human call.

### 3. Placement per format

Decision: the platform field carries the machine-readable and platform-rendered label; the text or spoken disclosure carries the legal one. Do both when both apply. The legal standard is the marketing sibling's; placement below follows the FTC's own wording.

| Format | Placement rule | Basis |
|---|---|---|
| Long video | Disclose in the video itself, spoken and on screen if the endorsement is both, before or at the start of the sponsored mention; also set the platform field; the description is a third place, not a substitute | [FTC](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking): "best chance ... if it's included in the video itself"; "right before or at the beginning of the actual endorsement"; description alone is easily missed |
| Short, Reel, TikTok | In the first seconds of the video and as burned-in text; the platform label is added, not relied on. YouTube's AI-use page does not address Shorts | FTC above; [14328491](https://support.google.com/youtube/answer/14328491) silent on Shorts. Where the label shows for Shorts is unmeasured |
| Post (LinkedIn, X, Bluesky, Mastodon) | First line, before any "more" or "see more" cut; a plain word such as "Ad:" or "Paid partnership:" not a hashtag alone | FTC: disclosure "should be presented without having to click 'more'"; "nothing special about hashtags"; middle or end of a post "easier to miss". The exact LinkedIn and X fold lengths were not fetched, so a count against them is not possible here |
| Thread | In the first post and again in any later post that makes the promotional claim | Judgement from the FTC "easier to miss" wording; no platform page states a thread rule |
| Document or carousel (LinkedIn) | In the post text above the document and on the first slide | Judgement from the same wording; no fetched LinkedIn page covers documents |
| Image | Platform AI label comes from file metadata (C2PA for LinkedIn, IPTC for Instagram); write both plus a text line when the image is realistic | [IPTC 2026-03-18](https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/) |

Reading heuristic for "before the mention": pass is a disclosure whose timestamp or character offset is lower than the first product mention; fail is a sponsor line only in the description, or after a "more" cut. Example pass: "Sponsored by Acme. Here is how I use their tool." Fail: 40 seconds of review, then "(sponsored)" in the description.

### 4. C2PA and Article 50 as the platform-side mechanism

- YouTube: carries forward C2PA 2.1 or higher disclosures, may label automatically, and a C2PA-derived label cannot be changed by the creator ([15447836](https://support.google.com/youtube/answer/15447836?hl=en)). It also has a separate "Captured with a camera" label ([15446725](https://support.google.com/youtube/answer/15446725)), found through a search result, not fetched here.
- LinkedIn: shows a C2PA icon on feed images and video, on own posts, and on sponsored single image and video ads uploaded to Campaign Manager or sponsored from a Page; the page notes gradual rollout ([a6282984](https://www.linkedin.com/help/linkedin/answer/a6282984)).
- TikTok: says it has labelled over 3 billion videos as AIGC using Content Credentials, creator labels and invisible watermarking, and joined the C2PA steering committee ([TikTok newsroom, 2026-07-10](https://newsroom.tiktok.com/helping-people-spot-and-understand-ai-generated-content-on-tiktok?lang=en-GB), platform data).
- Instagram: reads IPTC, not C2PA manifests, in the Indicator study as relayed by [IPTC](https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/). The study is one measurement from March 2026; platforms change.
- C2PA specification 2.2 is dated May 2025; the spec site links 2.3 to 2.5 ([spec](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)). A soft binding may help recover a stripped manifest, but "shall not be used as a hard binding". YouTube asks for C2PA 2.1 or higher; for any platform, state which spec version the generator writes.
- Metadata is strippable: IPTC states this, so absence of a badge proves nothing and a label cannot be the only disclosure.
- EU: Article 50(2) obliges providers to mark outputs machine-readably; the Code of Practice was finalised 2026-06-10 with about 190 signatories by end of July 2026 ([Commission](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)). The Commission page does not mention the omnibus. Law-firm summaries ([Cuatrecasas, 2026-07-24](https://www.cuatrecasas.com/en/spain/intellectual-property/art/digital-omnibus-ai-has-been-published); [Goodwin, 2026-08-03](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force)) agree: Regulation (EU) 2026/1744, signed 2026-07-08, published 2026-07-24, in force 2026-07-27; a 50(2) grace to 2026-12-02 for generative systems already on the market before 2026-08-02. I did not read the Official Journal text. For an organisation that only publishes content (a deployer), the platform label is what an agent can set; whether the duty binds the organisation is for M-CO-4.

### 5. What an agent may do alone on a channel

| Action | Agent alone? | Basis |
|---|---|---|
| Draft copy, scripts, titles, thumbnails, alt text; fill label fields in a publish package | Yes | Drafting changes nothing public |
| Run read-only measurements (`videos.list`, feed, profile reads) | Yes | No write |
| Upload or edit a YouTube video, change visibility or metadata through the API | No: needs prior specific and express user consent for each action; must not change user-provided values or add to the description afterwards without consent | [YouTube developer policy](https://developers.google.com/youtube/terms/developer-policies), sections I.3, II.3, III.C.3 |
| Post through TikTok Direct Post | No: send content only after the user expressly consents; show creator info and preview first; unaudited clients are private-only | [TikTok sharing guidelines, 2026-08-04](https://developers.tiktok.com/doc/content-sharing-guidelines), [API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) |
| Drive LinkedIn's web UI, scrape it, run pods or comment automation | Never | Scout rows LO (User Agreement 8.2, effective 2025-11-03; [agreement](https://www.linkedin.com/legal/user-agreement), not re-fetched here) |
| Post to Hacker News or write the maker's HN comment | Never | Scout row LP#17 on [HN guidelines](https://news.ycombinator.com/newsguidelines.html), not re-fetched here |
| Post from a bot account on X, Bluesky or Mastodon | Only if the account is labelled and the bio states what it is and who runs it | [X policy](https://docs.x.com/developer-terms/policy); Bluesky and Mastodon rows above |

A channel skill therefore ends at a reviewable package: text, media, label fields set, placement line checked. Publishing is a human step.

### 6. Keeping platform facts and the channel list fresh

Evidence that prose goes stale: in this one dive, YouTube's paid-placement API default changed 2026-11-16 (11 days ago), TikTok's AI rule took effect 2026-09-24, the X field appeared 2026-06-03, the omnibus entered force 2026-07-27, and Mastodon's profile page was updated 2026-04-15. The scout's own EU row said the omnibus was "unresolved" and is now resolved by secondary sources. Several primary pages carry no date at all (YouTube 14328491, 154235, LinkedIn pages show "1 month ago" or "3 years ago"), so a source-stated date often does not exist and a fetched-on date must be recorded.

Design (my recommendation, not a platform fact):

1. Facts live in one registry file the skill reads, not in prose. One row per fact: `id`, `platform`, `fact`, `source_url`, `source_stated_date` (or `none`), `source_kind` (platform, independent, vendor), `fetched_on`, `reverify_by`, `check_command`.
2. A checkable `check_command` where one exists, for example the revision-history grep: `curl -s https://developers.google.com/youtube/v3/revision_history | grep -c hasPaidProductPlacement`.
3. A lint that fails when any row has `reverify_by` earlier than today, or when a skill or rule text states a platform number that is not a registry id.
4. The organisation's channel list is a separate file: `channel`, `handle`, `url`, `owner`, `automation` (none, drafts, bot), `labels_required`, `last_checked`. The audit found YouTube alive with two Shorts and zero inbound links from the 17 fleet clones, and no other channel, so the registry starts with one row; any absent channel is an explicit `none` row, not silence.
5. Re-verify interval: 90 days for fields and toggles, 30 days within two months of a stated effective date. These intervals are my judgement from the churn above, not a source figure.

### 7. Scout figures re-checked

| Scout item | Result |
|---|---|
| YS#11: API field `containsSyntheticMedia`, added 2024-10-30 | Reproduces ([revision history](https://developers.google.com/youtube/v3/revision_history)) |
| YS#12: paid-promotion API field | Reproduces; scout missed the 2026-11-16 default change |
| SF#19 exemption list | Reproduces; page adds gameplay and says the list is not exhaustive |
| SF#20: TikTok guidelines released 2026-08-25, effective 2026-09-24; `is_aigc` | Reproduces. API reference now dated 2026-11-25 |
| SF#24: TikTok sharing guidelines 2026-08-04, labels, `brand_content_toggle`, `brand_organic_toggle` | Reproduces. Scout's "Instagram collaborators up to 3" not re-checked |
| SF#21 / LO#15 LinkedIn policy text | Reproduces; LO#15 "no formal label" is partly outdated: LinkedIn shows a C2PA icon where C2PA is present |
| MB#3 X, Bluesky, Mastodon | Reproduces; Mastodon page date 2026-04-15 added. Bluesky `bot` label confirmed in the lexicon |
| MB#28 X `paid_partnership` 2026-06-03 | Reproduces. `made_with_ai` is in the spec but not in the changelog text I could read (the truncated tail may hold it) |
| VP#26 / LO#16: 190 signatories, 2026-06-10, 2026-08-02 | Reproduces on the Commission page; omnibus resolved only through law-firm sources |
| VP#27 FTC placement | Reproduces; the FTC page also states the hashtag and "more" points |
| OP#11 | Not re-fetched; out of the label scope (blog posts) |
| LO#39 | Out of scope for labels (reach data, vendor); not re-fetched |

## Normative guidance candidates

1. MUST: Treat any draft that says AI generated or altered its media as requiring the platform AI label for every channel that has one. Rationale: unlabelled realistic synthetic media risks removal, restriction or suspension on YouTube and TikTok. Verify: grep the draft or brief for the declared tool list; for YouTube the publish package contains `"containsSyntheticMedia": true`, for TikTok `"is_aigc": true`, for X `"made_with_ai": true`. Pass: field present when the brief lists a generated voice of a real person, avatar of a real person or realistic generated scene. Fail: brief says "AI avatar presenter" and no field set.
2. MUST: Decide the YouTube altered-or-synthetic answer from the four listed cases, and record Yes or No with the reason per video. Rationale: scripts, captions, your own voice clone and aesthetic edits are exempt, so Yes on everything is wrong too. Verify: the release plan has a line `ai_use: yes|no, reason: <case>`; reading heuristic "would a viewer believe this real event or person happened". Pass: a realistic generated demo of a real person's voice = Yes. Fail: "Yes" because a script was AI-drafted.
3. MUST: Send `paidProductPlacementDetails.hasPaidProductPlacement` as an explicit true or false on every `videos.insert` or `videos.update` that touches that part. Rationale: since 2026-11-16 omission no longer means false. Verify: grep request bodies for the key; the source is [revision history](https://developers.google.com/youtube/v3/revision_history).
4. MUST: When a brief marks sponsored, affiliate, gifted or partner content, set the platform paid field and state the relationship in the content itself before the mention. Rationale: platform label and content disclosure serve different checks. Verify: brief flag `sponsored: true` implies `hasPaidProductPlacement`, `brand_content_toggle`, `paid_partnership` or the LinkedIn toggle is in the package, plus a line within the first sentence or first 30 seconds (the 30 s figure is a scout heuristic, not an FTC number).
5. MUST: Put every disclosure before the fold: first line of a post, first seconds of a video, never only in a description or behind "more". Rationale: FTC. Verify: reading heuristic in section 3; script lint that the disclosure offset is below the first product-name offset.
6. MUST: For LinkedIn, include a text disclosure line when AI had a heavy role and it is not obvious, and a disclosure sentence when synthetic media depicts a real person. Rationale: no LinkedIn AI field exists. Verify: draft contains a sentence matching `AI|generated|synthetic`; the LinkedIn Brand partnership toggle is a manual per-post step, so list "toggle brand partnership: yes" in the package.
7. SHOULD: Generate images and video with a tool that writes C2PA, and keep IPTC `DigitalSourceType` too. Rationale: LinkedIn reads C2PA, Instagram reads IPTC, YouTube carries C2PA 2.1 or higher. Verify: `c2patool <file>` prints a manifest and `exiftool -DigitalSourceType <file>` prints a value (commands not run here). Do not rely on this alone since metadata is strippable.
8. MUST: Label every agent-run or unattended account on X, Bluesky and Mastodon, in the bio and with the native flag where it exists (Bluesky `bot` self-label, Mastodon bot flag; X label availability unverified). Rationale: X policy says never mislead about bot status. Verify: channel list row `automation: bot` implies bio text containing "bot" or "automated" plus the flag, read via profile API.
9. MUST: Never publish, upload or post through an API on a person's or organisation's account without that person's explicit consent for that action. Rationale: YouTube developer policy and TikTok guidelines; HN and LinkedIn bar automation outright. Verify: the skill's last step is "hand over package"; grep skill for `videos.insert`, `POST /2/tweets`, `publish` outside a "human runs" fenced block.
10. MUST NOT: Drive LinkedIn's web UI, scrape it, run engagement pods or auto-comment. Rationale: LinkedIn bars bots, crawlers, scrapers and extensions that automate activity or fake engagement, and restricts or shuts accounts that use them ([Help a1341387, "Prohibited software and extensions", "Last updated: 2 years ago", fetched 2026-11-27](https://www.linkedin.com/help/linkedin/answer/a1341387); User Agreement 8.2 per [agreement](https://www.linkedin.com/legal/user-agreement), scout row). Verify: grep generated scripts for `linkedin.com` plus `selenium|playwright|puppeteer`.
11. MUST: Keep platform facts in a dated registry (section 6) and fail review when a platform number, limit or field name appears in skill prose without a registry id. Rationale: five facts changed in under a year. Verify: lint against the registry; `reverify_by` earlier than today fails.
12. SHOULD: Keep a channel list file with owner, automation level and required labels, with explicit `none` rows for absent channels. Rationale: the audit found one live channel and no inbound links; an agent cannot tell "no channel" from "not listed". Verify: file exists; every skill that names a platform has a row.
13. SHOULD: Before TikTok API use, confirm the app's audit status; if unaudited, plan for private-only posts. Rationale: "Unaudited clients can only post to a private account"; branded content cannot be private. Verify: `privacy_level` from `privacy_level_options`, no default chosen by the agent.
14. SHOULD: Record unobservable label states as unobservable, never as "none". Rationale: this dive could not read the Shorts without a key. Verify: audit row says `unobservable: needs API key` with the command.
15. CONSIDER: Re-fetch the EU grace date after 2026-12-02 and drop the "grace period" caveat then. Rationale: the 2026-12-02 Article 50(2) grace rests on law-firm sources only, and a skill that keeps citing an expired grace misstates what platforms and providers must now do. Verify: registry row `reverify_by: 2026-12-03`.

## What an agent must not decide alone

- Whether the law requires a label in a given case, which jurisdiction applies, and the Article 50 scope: legal, marketing sibling M-CO-4.
- Whether a piece of media is "realistic" in the borderline case (stylised avatar, the "Dino Edition" Short): ask the owner; do not default to either answer silently.
- Whether to take a sponsorship, send a gifted product, or call a relationship "material": business and legal; ask.
- Whether to add an "AI creator" or similar account-level label to a brand account: brand decision.
- Whether to run an automated or bot account at all, and what its bio says about who runs it.
- Whether to apply for TikTok API audit or X automated-label testing: needs owner and company details.
- Anything that publishes, deletes, changes visibility or pays, on any platform.
- Overriding a platform's automatic label: the creator may often change it to "No", but that is a claim made to the platform.

## AI-agent angle

| Typical agent error | Smallest mechanical check |
|---|---|
| Treats the YouTube altered-content setting as "AI-written script", so sets Yes on everything or nothing | Require the four-case reason per video (rule 2) |
| Omits `hasPaidProductPlacement` assuming omit means false (true before 2026-11-16) | Grep request bodies for the key, require explicit boolean (rule 3) |
| Invents a LinkedIn "AI-generated" toggle or API field | Table in section 1 has no such row; lint fields against the registry |
| Invents a Bluesky or Mastodon AI label | Registry: Bluesky self-labels are the six listed; Mastodon has none |
| Puts the sponsor line only in the description or hashtags | Offset lint (rule 5) |
| Writes TikTok `is_aigc` as required or as the branded toggle | Check the live API page; `is_aigc` is optional per the fetch |
| Assumes C2PA works on every platform | Section 4: Instagram reads IPTC only in the March 2026 study |
| Writes platform limits from memory | Registry rule (11) |
| Posts for the owner "to save a step" | Rule 9 grep |
| Relies on the Brand partnership toggle staying On | Toggle resets to Off every post; list it as a per-post manual step |

## Contested / evolving

- LinkedIn and AI: LinkedIn's help says "if you've relied heavily on AI, we recommend that you let others know (if it isn't obvious from the context)" ([a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496), updated "1 month ago"), a recommendation. The brand-partnership page says "must" for paid content. The two pages use different strength; the skill follows the stronger wording where money is involved. Trend: C2PA icon rollout is gradual (page text).
- Is the label read from file metadata or set by the creator? Meta says it uses indicators and self-disclosure ([Meta, 2025-02-19](https://transparency.meta.com/governance/tracking-impact/labeling-ai-content)); IPTC's March 2026 study found per-platform differences. Evidence is one study relayed by IPTC.
- Article 50 timing: Cuatrecasas and Goodwin agree on 2026-08-02 plus a 2026-12-02 marking grace; an earlier search summary suggested Goodwin moved Article 50 to 2027, but the Goodwin page I fetched ties 2027-12-02 only to Annex III high-risk systems. I did not read the Official Journal, so treat the dates as secondary-source. The Commission's own page is silent on the omnibus.
- Does a platform label satisfy ad law? LinkedIn tells members to "check the disclosure laws that apply where you are" ([a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083)) and the YouTube page says creators are responsible for legal requirements; the FTC says placement must be clear and conspicuous. No source says a toggle alone suffices. The skill treats it as insufficient, which is the conservative reading.
- Instagram AI labelling is shifting: an account-level "AI creator" label (2026-05-04, secondary source) sits beside post-level "AI info"; the details are not in a primary page I could fetch.

## Dated facts

| Fact | Source | Date the source states | Kind |
|---|---|---|---|
| `status.containsSyntheticMedia` added; settable in insert and update | [revision history](https://developers.google.com/youtube/v3/revision_history) | 2024-10-30 | Platform |
| `hasPaidProductPlacement` no longer defaults false | same | 2026-11-16 | Platform |
| `search.list` gains `videoPaidProductPlacement` | same | 2023-08-22 | Platform |
| Altered/synthetic policy and AI use setting | [14328491](https://support.google.com/youtube/answer/14328491) | none stated (footer 2026) | Platform |
| Paid promotion label at start; EU political paid promotion unavailable from 2025-10-10 | [154235](https://support.google.com/youtube/answer/154235) | 2025-10-10 (event); page undated | Platform |
| YouTube developer policy consent rules; section L from 2026-06-01 | [policy](https://developers.google.com/youtube/terms/developer-policies) | 2026-06-01 (one clause); page undated | Platform |
| LinkedIn AI guidance, "Seems like AI slop" flag | [a1481496](https://www.linkedin.com/help/linkedin/answer/a1481496) | "1 month ago" | Platform |
| LinkedIn Content Credentials icon | [a6282984](https://www.linkedin.com/help/linkedin/answer/a6282984) | "1 month ago" | Platform |
| LinkedIn Brand partnership label | [a1627083](https://www.linkedin.com/help/linkedin/answer/a1627083) | "3 years ago"; launch reported 2023-08-22 ([Social Media Today](https://www.socialmediatoday.com/news/linkedin-rolls-out-brand-partnership-tags/691582/)) | Platform; trade press |
| LinkedIn synthetic media and endorsement policy | [policies](https://www.linkedin.com/legal/professional-community-policies) | none stated (2026 footer) | Platform |
| TikTok AIGC rule released 2026-08-25, effective 2026-09-24 | [guidelines](https://www.tiktok.com/community-guidelines/en/integrity-authenticity) | 2026-08-25 / 2026-09-24 | Platform |
| TikTok Direct Post reference | [API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) | 2026-11-25 | Platform |
| TikTok sharing guidelines | [guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) | 2026-08-04 | Platform |
| TikTok labelled over 3 billion videos as AIGC | [newsroom](https://newsroom.tiktok.com/helping-people-spot-and-understand-ai-generated-content-on-tiktok?lang=en-GB) | 2026-07-10 | Platform (self-reported) |
| X `paid_partnership` field | [changelog](https://docs.x.com/changelog) | 2026-06-03 | Platform |
| X `made_with_ai` field | [spec](https://docs.x.com/x-api/posts/create-or-edit-post) | none stated (spec 2.175) | Platform |
| X automated-account rule in developer policy | [policy](https://docs.x.com/developer-terms/policy) | none stated | Platform |
| Bluesky `bot` self-label; no AI label | [lexicon](https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/com/atproto/label/defs.json) | none (repo at fetch time) | Platform |
| Mastodon bot flag visual only | [profile](https://docs.joinmastodon.org/user/profile/) | 2026-04-15 | Platform |
| Meta AI Info labelling | [Meta](https://transparency.meta.com/governance/tracking-impact/labeling-ai-content) | 2025-02-19 | Platform |
| Instagram reads IPTC not C2PA; LinkedIn reads C2PA not IPTC | [IPTC](https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/) | 2026-03-18 | Independent study (Indicator, relayed) |
| Instagram "AI creator" label | [Social Media Today](https://www.socialmediatoday.com/news/instagram-adds-ai-creator-labels/819267/) | 2026-05-04 | Trade press |
| C2PA specification 2.2 | [spec](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html) | May 2025 | Authority |
| EU Code of Practice final; 190 signatories; Article 50 applicable | [Commission](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content) | 2026-06-10; end of July 2026; 2026-08-02 | Authority |
| Regulation 2026/1744 published and in force; 50(2) grace to 2026-12-02 | [Cuatrecasas](https://www.cuatrecasas.com/en/spain/intellectual-property/art/digital-omnibus-ai-has-been-published) | 2026-07-24 (published), 2026-07-27 (in force) | Law firm, secondary |
| FTC video disclosure placement | [FTC Q&A](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) | none shown on captured page | Authority |

Not fetched (HTTP 403 or no fetch): X Help automated account labels (403 on [help.x.com](https://help.x.com/en/using-x/automated-account-labels) and profile-labels page; developer.x.com 402), White & Case omnibus alert (403), Reddit family (scout). Bluesky `docs.bsky.app` redirects to `bsky.network` and returned empty; the GitHub raw docs were used instead.

## Sources

| URL | What | Date or era | Why worth reading |
|---|---|---|---|
| https://support.google.com/youtube/answer/14328491 | YouTube altered or synthetic content policy | undated, 2026 | Primary; defines Yes cases and exemptions |
| https://support.google.com/youtube/answer/154235 | YouTube paid promotion | undated; 2025-10-10 event | Primary; label at video start |
| https://developers.google.com/youtube/v3/revision_history | YouTube Data API changes | to 2026-11-16 | Primary; two field changes |
| https://developers.google.com/youtube/v3/docs/videos | videos resource | undated | Primary; field definitions |
| https://developers.google.com/youtube/terms/developer-policies | API developer policy | undated | Primary; consent rule |
| https://support.google.com/youtube/answer/15447836?hl=en | How this content was made | undated | Primary; C2PA carry-forward |
| https://www.linkedin.com/help/linkedin/answer/a1481496 | LinkedIn on AI content | "1 month ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a6282984 | LinkedIn Content Credentials | "1 month ago" | Primary |
| https://www.linkedin.com/help/linkedin/answer/a1627083 | LinkedIn Brand partnership | "3 years ago" | Primary |
| https://www.linkedin.com/legal/professional-community-policies | LinkedIn policies | 2026 footer | Primary |
| https://developers.tiktok.com/doc/content-posting-api-reference-direct-post | TikTok API fields | 2026-11-25 | Primary |
| https://developers.tiktok.com/doc/content-sharing-guidelines | TikTok UX requirements | 2026-08-04 | Primary |
| https://www.tiktok.com/community-guidelines/en/integrity-authenticity | TikTok AIGC rule | 2026-08-25 | Primary |
| https://newsroom.tiktok.com/helping-people-spot-and-understand-ai-generated-content-on-tiktok?lang=en-GB | TikTok C2PA statement | 2026-07-10 | Primary, self-reported figures |
| https://docs.x.com/x-api/posts/create-or-edit-post | X create post spec | version 2.175 | Primary |
| https://docs.x.com/changelog | X API changelog | 2026-06-03 entry | Primary |
| https://docs.x.com/developer-terms/policy | X developer policy | undated | Primary |
| https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/com/atproto/label/defs.json | Bluesky label values | repo head | Primary |
| https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/starter-templates/bots.mdx | Bluesky bots guide | repo head | Primary |
| https://docs.joinmastodon.org/user/profile/ | Mastodon profile | 2026-04-15 | Primary |
| https://docs.joinmastodon.org/entities/Account/ | Mastodon Account entity | undated | Primary |
| https://transparency.meta.com/governance/tracking-impact/labeling-ai-content | Meta AI labelling | 2025-02-19 | Primary |
| https://www.socialmediatoday.com/news/instagram-adds-ai-creator-labels/819267/ | Instagram AI creator label | 2026-05-04 | Trade press, secondary |
| https://www.socialmediatoday.com/news/linkedin-rolls-out-brand-partnership-tags/691582/ | Brand partnership launch | 2023-08-22 | Trade press; gives help URL |
| https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/ | Platform metadata reading study | 2026-03-18 | Independent |
| https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html | C2PA 2.2 | May 2025 | Authority |
| https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content | EU code of practice | 2026-06-10 | Authority |
| https://www.cuatrecasas.com/en/spain/intellectual-property/art/digital-omnibus-ai-has-been-published | Omnibus publication | 2026-07-24 | Law firm |
| https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force | Article 50 timeline | 2026-08-03 | Law firm |
| https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking | FTC placement guidance | undated capture | Authority |
| https://www.linkedin.com/help/linkedin/answer/a1341387 | LinkedIn prohibited software | "2 years ago" | Primary; automation ban |
| https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg | Fleet channel feed | 2026-11-27 run | Measurement |
