---
title: YouTube content policy and series risk for a small developer-tool channel
program: product
sub_program: channels
topic: channel-youtube
worker: yt-content-policy-and-series-risk
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
---

# YouTube content policy and series risk

Scope: the YouTube policies an agent-assisted company channel can break (misleading metadata, thumbnails, inauthentic or templated content, Content ID, strikes, AI disclosure), measured against the fleet's two live Shorts. Not covered: packaging craft, retention, search ranking, Shorts feed mechanics (sibling workers). Sources fetched 2026-11-27: 16 web pages (YouTube Help, two trade articles, one search) and 8 channel feeds; all `support.google.com` pages show only "©2026 Google" and no article date, so "date the source states" is "none stated" unless noted.

## Contents

1. Summary
2. Findings
3. Normative guidance candidates
4. What an agent must not decide alone
5. AI-agent angle
6. Contested / evolving
7. Dated facts
8. Sources

## Summary

- The 90-day window is real but is about warning expiry and strike counting, not a thumbnail-specific strike clock. A first thumbnail violation "likely" gets a warning with no penalty; a repeat within 90 days may become a strike; 3 strikes in 90 days may end the channel.
- Borderline thumbnails are age-restricted or removed with no strike; a thumbnail that misleads about content falls under the spam policy's "malicious clickbait", which can bring removal, warning, strike or monetisation suspension.
- "Inauthentic content" (renamed from "repetitious content", page note dated July 15, 2025) is judged per channel, not per video: a series is fine when each episode has its own focus; "minimal variation between videos" is the failure.
- YouTube states no similarity threshold. Any numeric gate (below) is a lint derived from exemplars, not policy.
- The fleet's two Shorts have an identical description (similarity 1.00) and near-identical titles (0.84), and both carry number "01". That is a duplicate, not yet a "series", but it is the exact shape the policy describes if the "OCX Shorts NN" design repeats.
- A Content ID claim is not a strike. On a Short over one minute an active claim blocks the Short globally (YouTube Help, undated page); a search snippet claims this changes on 24 September 2026, which the fetched page does not state.
- Audio Library tracks "won't be claimed" via Content ID; Creative Commons-licensed tracks still require a description credit. Only Audio Library music is "known to YouTube to be copyright-safe".
- Live streams: a copyright-removed live stream gives a strike plus a 7-day (then 14-day) live restriction.
- AI-made scripts, titles and thumbnails need no AI disclosure; realistic synthetic footage or voice of a real person does.
- Three scout figures: "90 days" reproduces with a different meaning; "applies to unlisted content too" does not reproduce on the fetched page; "claimed Shorts blocked outright" reproduces for Shorts over one minute only.

## Findings

### 1. Misleading metadata and malicious clickbait

[Spam, deceptive practices and scams policy](https://support.google.com/youtube/answer/2801973) (platform, no date stated) bans "maliciously misleading titles, thumbnails, descriptions, or imagery". Its nine examples include: automated mass production ("channels reusing the same background music and AI imagery"), comment spam (identical messages across many videos), and malicious clickbait (a title promising a full sports match that shows only a clip). The test in the examples is a promise in the metadata that the video does not keep.

Enforcement text: "we may suspend your monetization or terminate your channel or account"; for some violations "remove the content and issue a warning or a strike". The word "repetitive" appears in four examples (engagement manipulation, fake engagement, comment spam, mass production). The page has no hashtag rule.

Not reproduced: the scout's claim that the clickbait rule "applies to unlisted content too". The fetched page does not say so (fetch summary, 2026-11-27; the fetch tool summarises, so verify against the live page before encoding).

### 2. Thumbnail policy and the 90-day window

[Thumbnails policy](https://support.google.com/youtube/answer/9229980) (platform, no date stated):

| Situation | Outcome (page text) |
|---|---|
| Borderline thumbnail | May be age-restricted or removed; "we don't issue a strike" |
| First violation | "likely get a warning with no penalty"; a policy training makes the warning expire after 90 days |
| Same policy violated again inside 90 days | Warning may not expire; channel may get a strike |
| 3 strikes within 90 days, or a channel dedicated to violative content | May be terminated |
| Pornography in a thumbnail | May lead to immediate termination |

Prohibited list includes "Thumbnails that mislead viewers about the video's content" and the page says the list "isn't complete". So the scout's "thumbnail strikes ... 90 days" holds only as: the 90 days is the warning-expiry and strike-counting window, shared with the spam policy ([2801973](https://support.google.com/youtube/answer/2801973) repeats the 3-in-90-days rule). The page states a thumbnail that is only borderline gets no strike; a misleading one is handled under spam and clickbait.

### 3. Inauthentic content, templated series

[YPP policies](https://support.google.com/youtube/answer/1311392) (platform, no date stated; the update note is dated July 15, 2025). Quoted facts:

- Renamed "repetitious content" to "inauthentic content" on July 15, 2025, as a clarification: the rule "has always applied"; reused content policy unchanged. Independent confirmation: [Engadget, published July 14, 2025](https://www.engadget.com/entertainment/youtube/never-fear-reaction-videos-are-still-allowed-under-youtubes-new-inauthentic-content-policy-222401009.html) says YouTube renamed it and that such content "has always been ineligible for monetization". So 2025-07-15 reproduces as the page-note date; the announcement coverage is a day earlier.
- The matching section on the page is titled "Generic or Repetitive Content": "Content that appears template-made, or that feels repetitive after several videos in a row from the same channel."
- Eligible: the same intro and outro "if most of each video's content differs"; series with a repeated format "when each video has its own storyline, focus, or concept".
- Not eligible: "minimal variation between videos", "templated storylines", slideshows or scrolling text "with little narrative, commentary, or educational value", and "AI-generated content made with generic or unoriginal templates" that gives an impression of mass production.
- Scope: the whole channel; monetisation can be removed from all of it. Consequence is loss of Partner Program access, earnings withheld or adjusted, possible suspension or termination.
- Independent report of a July 2026 re-organisation into three categories (generic or repetitive; unsatisfying or off-putting; AI personas on sensitive topics) with "the rules themselves haven't changed": [Tubefilter, 2026-07-13](https://www.tubefilter.com/2026-07-13/youtube-inauthentic-content-monetization-policy-update/) (trade press, secondary). The fetched YPP page shows only the "Generic or Repetitive" heading; the three-way split was not confirmed on the primary page.

Scope caveat: this is a monetisation policy (YPP). A small developer-tool company channel rarely has YPP. The spam policy ([2801973](https://support.google.com/youtube/answer/2801973)) "automated mass-production" example is the part that can still remove content or terminate a channel without YPP. Agents must treat the YPP page as the clearest published description of "templated", not as a gate that only bites monetised channels.

### 4. Measured: what "templated" looks like

Command (python3 -I, difflib SequenceMatcher ratio over all pairs; feeds from `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=<id>"` fetched earlier by the grounding worker in `~/.cache/research-lang/exemplars/product/youtube2/feeds/`, the fleet feed re-fetched 2026-11-27; script kept at `/tmp/claude-1000/-home-mherwig-dev-ocx-sh-grimoire-lore/0b5051b9-6006-4d7c-8031-3fe9fe713ce4/scratchpad/sim-keep.py`, run `python3 -I sim-keep.py`). Title ratio is over the 15 newest feed entries matching the series regex; description ratio only over non-empty descriptions.

| Series (channel) | n | Title ratio median (min-max) | Description ratio median (min-max) |
|---|---|---|---|
| "Getting into Terraform, Part N" (HashiCorp, numbered tutorial) | 10 | 0.63 (0.57-0.82) | 0.37 (0.16-0.93) |
| "This Week in Svelte, Ep. N" (Svelte Society, weekly) | 10 | 0.75 (0.63-0.97) | no measure: 0 of 10 have a description |
| Kubernetes SIG meeting recordings (Kubernetes) | 15 | 0.52 (0.37-1.00) | 0.52 (0.37-1.00) (description equals title) |
| "The Dev Floor Ep 1" parts (JetBrains) | 4 | 0.95 (0.92-0.98) | 0.12 (0.02-0.25) |
| "Talking and Doc'ing, <date>" (Astro, live stream) | 7 | 0.89 (0.84-1.00) | 0.34 (0.14-1.00) |
| OpenSSF WG-BEAR meetings (OpenSSF) | 5 | 0.91 (0.88-0.94) | 0.94 (0.92-0.96) |
| Fleet: "OCX Shorts 01" and "... - Dino Edition" (ocx) | 2 | 0.84 | 1.00 (identical) |

Reading: titles in a numbered series routinely score 0.5-0.95, so title similarity is not a useful gate. Description similarity separates series that give each episode its own text (HashiCorp 0.37 median, JetBrains 0.12) from boilerplate (OpenSSF 0.94, fleet 1.00). Limits: no feed field shows monetisation or policy standing. "Remain in good standing" is evidenced only by channels still posting recent series episodes and being publicly live on 2026-11-27 (newest upload days: Svelte Society 0, Kubernetes 1, HashiCorp 121 per the grounding table), not by a YouTube statement. OpenSSF and Kubernetes are foundations without viewer-facing templates to monetise; they show that high description similarity coexists with a live channel, which is why the gate below is a lint, not a policy proxy. The HashiCorp episodes share a one-sentence intro and a "To learn more" link block; the unique part is the episode summary and per-episode links.

### 5. Fleet Shorts against the policy

Evidence (`curl -s 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg'`, 2026-11-27, also in [distribution-posture section 4](../product-audit/distribution-posture.md)): two videos published 2026-11-17: "OCX Shorts 01: Pin Node.js in the repo" (18:38 UTC) and "OCX Shorts 01: Pin Node.js in the repo - Dino Edition" (18:04 UTC). Both have the description "The same Node.js on the laptop and in CI, picked once." (53 characters, no link, no hashtag, no chapters). Channel description empty.

| Check | Result |
|---|---|
| Malicious clickbait (promise not kept) | Title and description describe one action; the video content was not viewed in this pass, so unmeasured. No superlative, no hook claim |
| Repetitive description sentences ([6390658](https://support.google.com/youtube/answer/6390658)) | Each description is one sentence; not a repetitive-sentence violation. Across the two uploads it is identical (1.00) |
| Hashtags | 0; limit before all are ignored is 60; three show above the title |
| Series number | Both claim "01"; a duplicate number, so a series index that does not index |
| Inauthentic content | Two uploads cannot be "mass production"; but the same episode in two variants with one description is "minimal variation between videos" in miniature, and `NN` in the title signals a numbered, template-driven series |
| Links, call to action | None; a policy non-issue and a distribution gap (sibling topic) |

### 6. Content ID, strikes, audio

- Claims are not strikes. [Content ID claims page](https://support.google.com/youtube/answer/6013276) (no date stated): "Claims are not removal requests or strikes"; a strike "results only from a valid copyright removal request". Outcomes block, monetise or track, varying by country.
- Shorts: that page says "Shorts 1-3 minutes: claimed Shorts are blocked when an active claim applies ... Claims on these Shorts don't cause a strike". [Understand three-minute Shorts](https://support.google.com/youtube/answer/15424877) says "Any Short that is over one minute ... with an active copyright claim of any type ... will be blocked globally"; "There are no changes in limitations for Shorts that are less than one minute". A search snippet reported a change from 24 September 2026 (claimed 1-3 minute Shorts no longer auto-blocked); the fetched page does not contain that date, so it is unverified (see Contested).
- Scout item "any claimant can block ... Claimed Shorts blocked outright" reproduces only for Shorts over one minute; Shorts at or under one minute keep their prior behaviour.
- Studio check: Content, then the Shorts tab for Shorts, filter bar "Claims", hover Claims in the Restrictions column, "See details".
- [Copyright strikes](https://support.google.com/youtube/answer/2814000) (no date stated): a strike expires after 90 days only if Copyright School (4 questions) is completed and fewer than 3 strikes; 3 strikes can end the account and all linked channels; a live stream removed for copyright gives a strike and a 7-day live restriction, 14 days on the next.
- [Audio Library](https://support.google.com/youtube/answer/3376882) (no date stated): library audio "won't be claimed by a rights holder through the Content ID system"; Creative Commons tracks require crediting the artist in the description; "Only music and sound effects from the Audio Library are known to YouTube to be copyright-safe"; YouTube is "not responsible" for royalty-free music from other libraries. The licence text itself (`youtube.com/audiolibrary/license`) returned HTTP 404 and an unrendered shell; not read, so the exact licence terms are unsourced beyond the Help page.
- [Music eligibility for Shorts](https://support.google.com/youtube/answer/13486873): Shorts Audio Library music, "up to 90 seconds" in a 3-minute Short; Audio Library tracks "won't receive a Content ID claim". Per the search result (not fetched in full), songs added through the Shorts library create a special undisputable claim; unverified here.
- Third-party footage: [reused content rules](https://support.google.com/youtube/answer/1311392) apply "even if you have permission from the original creator" and are separate from copyright enforcement. A screen recording that shows another party's video, music or branded footage can be claimed and also judged as reused content.

### 7. AI disclosure

[Altered or synthetic content](https://support.google.com/youtube/answer/14328491) (no date stated): disclosure required for realistic content that makes a real person appear to do or say something, alters real events, or generates realistic scenes that did not occur, or AI music as main focus. Not required: scripts, outlines, titles, thumbnails, captions, voice repair, cloning "your own voice for voiceovers or dubs", unrealistic animation. Habitual non-disclosure risks labels or YPP suspension. Studio path: Attributes, "AI use" survey. For a developer-tool channel: an AI voice-over of a real maintainer's likeness or a fabricated realistic terminal session passed off as real are the edge cases; own-voice cloning is exempt.

## Normative guidance candidates

1. **MUST: every claim in a title, thumbnail or description is shown in the video.** Rationale: malicious clickbait is the example "a title promising a full ... match but showing only a clip" ([2801973](https://support.google.com/youtube/answer/2801973)). Verify by reading heuristic: list each claim (verb, number, "full", "all", "free"), find the timestamp where the video shows it. Pass: title "Pin Node.js in the repo" and the video shows the pin file and the version check. Fail: "Pin every tool in 30 seconds" and the video pins one tool.
2. **MUST: a thumbnail contains no text or image promising an outcome the video does not show, and none of the prohibited classes.** Rationale: [9229980](https://support.google.com/youtube/answer/9229980). Verify: same claim-to-timestamp heuristic on thumbnail text; a thumbnail for a developer video needs no check beyond that.
3. **MUST: a series number is unique across the channel and never reused for a variant.** Rationale: duplicate numbers are a series index that does not index and read as duplication; fleet case "OCX Shorts 01" twice. Verify: `python3 -I` check that `re.findall(r'\bShorts (\d+)', title)` has no duplicate values across the channel feed.
4. **MUST: each upload's description differs materially from every earlier upload in the same series.** Rationale: "minimal variation between videos" is the stated failure ([1311392](https://support.google.com/youtube/answer/1311392)). Verify (lint, not policy): after removing lines that are identical across all series descriptions (shared boilerplate), `SequenceMatcher(None, a, b).ratio()` of the remaining text is below 0.6 for every pair. Exemplar basis: HashiCorp 0.37 median, JetBrains 0.12; fleet pair 1.00 fails.
5. **MUST: each episode in a numbered series has its own concept stated in one sentence in the brief before production, and the video demonstrates a different command or flow from every earlier episode.** Rationale: eligible series have "its own storyline, focus, or concept" ([1311392](https://support.google.com/youtube/answer/1311392)). Verify: the one-sentence concept differs from all earlier concepts in its verb-object pair; reading heuristic. Pass: "Pin Node.js" then "Pin Python with a lockfile". Fail: the same demo on a different light or colour treatment ("Dino Edition").
6. **SHOULD: the title ratio is not used as the variation gate.** Rationale: exemplar series sit at 0.5-0.95 on titles with no known standing problem (section 4). Verify: the lint config excludes titles.
7. **MUST: use only own audio, YouTube Audio Library tracks (not Shorts-only library tracks in a long video unless the track is licensed for it) or no music; never music from another library, a streaming service or a screen recording playing audio.** Rationale: only Audio Library music is "known to YouTube to be copyright-safe" ([3376882](https://support.google.com/youtube/answer/3376882)). Verify: a production manifest lists every audio asset with source; `ffmpeg -i video.mp4` shows the audio stream is the voice-over plus the listed track; post-upload, Studio Content, filter "Claims", expect none.
8. **MUST: when an Audio Library track is Creative Commons, the description credits the artist, with the text from Studio's licence-type copy button.** Rationale: required by [3376882](https://support.google.com/youtube/answer/3376882). Verify: description contains the credit string for each CC track in the manifest.
9. **MUST: a screen recording shows no third-party video, music, or branded footage unless licensed.** Rationale: Content ID matches visuals and audio ([2797370](https://support.google.com/youtube/answer/2797370)); reused content is judged separately even with permission ([1311392](https://support.google.com/youtube/answer/1311392)). Verify: frame review at each scene cut for windows other than the tool under demo; OS notification sounds and browser media playing muted or closed.
10. **SHOULD: keep demos at or under 60 seconds when a claim risk exists.** Rationale: Shorts over one minute with an active claim are blocked globally ([15424877](https://support.google.com/youtube/answer/15424877)); at or under 60 seconds the page states no change. Verify: `ffprobe -v error -show_entries format=duration -of csv=p=0 file.mp4` at or under 60.
11. **MUST: do not stream live coding with unlicensed music or third-party footage.** Rationale: a copyright-removed live stream gives a strike and a 7-day live restriction ([2814000](https://support.google.com/youtube/answer/2814000)). Verify: stream checklist item "no music source open".
12. **MUST: description text contains no repeated sentences and at most 3 hashtags, all relevant.** Rationale: "repetitive sentences in the description" are prohibited; 60+ hashtags are all ignored; hashtags unrelated to the video are prohibited ([6390658](https://support.google.com/youtube/answer/6390658)). Verify: split description on sentence ends and `sort | uniq -d` is empty; `grep -o '#[[:alnum:]_]*' | wc -l` is at most 3 (the 3 cap is the number YouTube displays above the title; it is a convention, not a policy limit).
13. **MUST: no description or comment text is copied across multiple videos or channels as a promotional message.** Rationale: comment spam example in [2801973](https://support.google.com/youtube/answer/2801973). Verify: no identical comment string posted twice from the channel account.
14. **SHOULD: complete the optional policy training after any warning, and log any warning date.** Rationale: the warning expires after 90 days only with training ([9229980](https://support.google.com/youtube/answer/9229980)). Verify: a dated entry in the channel log, and a human action (see below).
15. **MUST: set the AI-use disclosure when a video contains realistic synthetic footage or a synthetic voice of a real person; do not disclose for scripts, titles or thumbnails.** Rationale: [14328491](https://support.google.com/youtube/answer/14328491). Verify: manifest field `synthetic_realistic: true|false`; when true the Studio "AI use" answer is Yes.
16. **MUST: a post-upload check that Studio's Content list shows no Restriction for the video within 24 hours of upload.** Rationale: Content ID claims appear in Restrictions ([6013276](https://support.google.com/youtube/answer/6013276)); the 24-hour interval is a convention, not a platform figure. Verify: Studio, Content, filter "Claims".

## What an agent must not decide alone

- Whether to take policy training or file a dispute against a warning, strike or claim (channel standing; owner decision).
- Whether to keep, delete or make private the fleet's duplicate "Dino Edition" Short (brand decision; see distribution-posture).
- Whether to monetise (YPP application) or accept a Content ID monetise claim.
- Licensed-music purchase, or the use of any music not on the Audio Library.
- Naming and branding of a series (a rename to drop the "NN" index is a brand decision).
- Use of a real person's likeness, voice, or a realistic synthetic demo of a real customer.
- Any appeal wording to YouTube.

## AI-agent angle

| Typical agent error | Mechanical check |
|---|---|
| Reuses one description with a changed first line for every episode | Rule 4 ratio over the non-boilerplate lines; fleet pair is 1.00 |
| Re-uploads a variant under the same number | Rule 3 duplicate-number check |
| Adds trending music or a "royalty-free" track from another site | Rule 7 manifest; Studio Claims filter |
| Writes a "bait" title ("You won't believe ...") that the video does not deliver | Rule 1 claim-to-timestamp list |
| Pads a description with 10+ hashtags or repeated keyword sentences | Rule 12 count and `uniq -d` |
| States "the strike window is 90 days for thumbnails" | Findings section 2: the window is warning expiry and 3-in-90 for strikes |
| Treats a Content ID claim as a strike | Findings section 6: claims are not strikes |
| Assumes the "inauthentic" rule only bites monetised channels | Findings section 3: spam policy mass-production example applies to removal and termination too |
| Marks AI-written titles and scripts as "AI disclosure: Yes" | Rule 15: those are exempt |

## Contested / evolving

- **Does a claimed 1-3 minute Short stay blocked?** The fetched [6013276](https://support.google.com/youtube/answer/6013276), [15424877](https://support.google.com/youtube/answer/15424877) and [13486873](https://support.google.com/youtube/answer/13486873) pages say blocked globally. A search-result summary (2026-11-27) states a "newer version" lifts the automatic block for Content ID claims from 24 September 2026, and the same snippet attributes the date to a Tagalog page. None of the fetched English pages contain the date. Treat the block as current until a fetch of the live page shows otherwise; recheck before encoding.
- **Is "inauthentic content" a new rule or a rename?** YouTube says it "has always applied" and the rules are unchanged ([1311392](https://support.google.com/youtube/answer/1311392), [Tubefilter 2026-07-13](https://www.tubefilter.com/2026-07-13/youtube-inauthentic-content-monetization-policy-update/)); trade coverage (e.g. [Search Engine Journal, per the search result](https://www.searchenginejournal.com/youtube-clarifies-monetization-update-targeting-spam-not-reaction-channels/550123/)) says enforcement may reach reaction channels depending on how they are made. Not fetched in full.
- **High-similarity series that stay live.** OpenSSF (description median 0.94) and Astro (title 0.89) are live and recent; policy is undefined at that boundary. No source gives a number, so rule 4 is a conservative lint, not a statement about what YouTube enforces.
- **Disclosure scope for AI voice.** Own-voice cloning is exempt; a cloned colleague's voice is not stated either way on the page.

## Dated facts

| Fact | Source | Date the source states | Source type |
|---|---|---|---|
| Warning expires after 90 days with training; 3 strikes within 90 days can terminate | [9229980](https://support.google.com/youtube/answer/9229980), [2801973](https://support.google.com/youtube/answer/2801973) | none stated (footer 2026) | platform |
| Copyright strike expires after 90 days only with Copyright School; live restriction 7 then 14 days | [2814000](https://support.google.com/youtube/answer/2814000) | none stated | platform |
| "Repetitious content" renamed "inauthentic content", July 15, 2025; reused content unchanged | [1311392](https://support.google.com/youtube/answer/1311392) | update note July 15, 2025 | platform |
| Announcement coverage of the rename | [Engadget](https://www.engadget.com/entertainment/youtube/never-fear-reaction-videos-are-still-allowed-under-youtubes-new-inauthentic-content-policy-222401009.html) | published July 14, 2025 | independent press |
| Three-category re-organisation of the guidance | [Tubefilter](https://www.tubefilter.com/2026-07-13/youtube-inauthentic-content-monetization-policy-update/) | July 13, 2026 | independent press |
| Claimed Shorts over one minute are blocked; at or under 60 seconds unchanged | [15424877](https://support.google.com/youtube/answer/15424877) | none stated | platform |
| 1-3 minute vertical videos categorised Shorts from 15 Oct 2024 (standard channels) | [15424877](https://support.google.com/youtube/answer/15424877) | 2024-10-15 as stated | platform |
| Shorts up to 3 minutes, 1080p max | [10059070](https://support.google.com/youtube/answer/10059070) | none stated | platform |
| Hashtags: more than 60 are all ignored; 3 shown above the title | [6390658](https://support.google.com/youtube/answer/6390658) | none stated | platform |
| Audio Library music "won't be claimed" via Content ID; CC tracks need credit; new tracks twice a month | [3376882](https://support.google.com/youtube/answer/3376882) | none stated | platform |
| Shorts Audio Library: up to 90 seconds of music in a 3-minute Short | [13486873](https://support.google.com/youtube/answer/13486873) | none stated | platform |
| AI-use disclosure required for realistic synthetic content; scripts, titles, thumbnails exempt | [14328491](https://support.google.com/youtube/answer/14328491) | none stated | platform |
| Fleet: 2 Shorts, both 2026-11-17, identical description | feed `UCKuRD68HkNpla-vY6-YBTHg` | 2026-11-17 (published) | channel feed |

## Failed or unfetchable

- `https://support.google.com/youtube/answer/6396300`: HTTP 404.
- `https://www.youtube.com/audiolibrary/license` (Audio Library licence): redirected through a consent page, then HTTP 404; terms not read.
- `https://www.youtube.com/howyoutubeworks/policies/community-guidelines/`: returned only a Finnish YPP blurb, no policy text.
- [2605065](https://support.google.com/youtube/answer/2605065): fetched, contains no dispute procedure (it covers Content ID eligibility); dispute steps unsourced.
- Fetch summaries are produced by a summariser model; quotes marked as such were returned by it, not read from raw HTML. Re-verify any rule that becomes a hard gate.
- Not reproduced: scout "applies to unlisted content too" (YS#14).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://support.google.com/youtube/answer/2801973 | YouTube spam, deceptive practices and scams policy (platform) | no date; footer 2026 | Nine examples including clickbait and mass production; 90-day strike rule |
| https://support.google.com/youtube/answer/9229980 | Thumbnails policy (platform) | no date; footer 2026 | Enforcement ladder for thumbnails |
| https://support.google.com/youtube/answer/1311392 | YPP policies, inauthentic content (platform) | update note July 15, 2025 | Template, series and reused-content tests |
| https://support.google.com/youtube/answer/3376882 | Audio Library help (platform) | no date | Attribution and Content ID statements |
| https://support.google.com/youtube/answer/2797370 | Content ID how it works (platform) | no date | Block, monetise, track outcomes |
| https://support.google.com/youtube/answer/6013276 | Content ID claims, Studio steps (platform) | no date | Shorts blocking and where to see claims |
| https://support.google.com/youtube/answer/15424877 | Understand three-minute Shorts (platform) | no date; refers to 2024-10-15, 2025-12-08 | Claim blocking over one minute |
| https://support.google.com/youtube/answer/13486873 | Music eligibility for Shorts (platform) | no date | Shorts audio library, 90 seconds |
| https://support.google.com/youtube/answer/2814000 | Copyright strikes (platform) | no date | Strike expiry, live restrictions |
| https://support.google.com/youtube/answer/6390658 | Hashtags help (platform) | no date | 60-hashtag cap, repetitive-sentence ban |
| https://support.google.com/youtube/answer/14328491 | Altered or synthetic content disclosure (platform) | no date | What needs the AI label |
| https://support.google.com/youtube/answer/10059070 | Shorts overview (platform) | no date | Length and resolution |
| https://www.tubefilter.com/2026-07-13/youtube-inauthentic-content-monetization-policy-update/ | Trade article (independent) | 2026-07-13 | Three-category re-organisation |
| https://www.engadget.com/entertainment/youtube/never-fear-reaction-videos-are-still-allowed-under-youtubes-new-inauthentic-content-policy-222401009.html | Trade article (independent) | 2025-07-14 | Rename announcement |
| https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg | Fleet channel feed | 2026-11-27 fetch | The two Shorts measured |
| `~/.cache/research-lang/exemplars/product/youtube2/feeds/*.xml` (HashiCorp, SvelteSociety, Kubernetes, JetBrains, Astro, OpenSSF) | Public channel feeds, collected earlier by the grounding worker | 2026-11-27 | Similarity measurement inputs |
