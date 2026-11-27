---
title: Small company YouTube channel, format portfolio and closing structure
program: product
sub_program: channels
topic: channel-youtube
worker: yt-format-portfolio
date_researched: 2026-11-27
model: sonnet
sources_fetched: 49
---

# Format portfolio for a small developer-tool company channel

Scope: what a small company channel publishes (Shorts, long-form tutorials, announcements, live and talks), length by intent, the closing and end-screen window, and whether short-form serves a developer tool. The Shorts success test and view definitions belong to yt-measurement-and-testing; this dive states its decision in those terms and defines none. Thumbnail craft, title wording and search metadata belong to sibling dives. `sources_fetched: 49` is 19 web pages read in full plus 30 channel feeds; 450 more HTTP probes classified Shorts (see Method). Repair pass 2026-11-27: feeds, probes and analysis re-run from scratch in `~/.cache/research-lang/exemplars/product/youtube3/` (the earlier working directory was gone).

## Table of contents

1. Summary
2. Method and what could not be measured
3. Findings
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested
8. Dated facts
9. Sources

## Summary

- The audit's gap reproduces: median of channel-median views is 72,857 for 10 educator channels and 2,506 for 14 company channels, 29.07x. It is a median over channels in a 15-video window, not a population estimate.
- All 30 channel names in the audit's id list verify against each feed's `<name>` element, so the 9-of-29 handle error does not recur when channel ids are used directly.
- The Shorts split reproduces exactly: 77 Shorts of 450 videos (17%); company channels 54 of 210 (26%).
- Company announcements are the one lift: median 4.94x the channel median, n=18 videos on 8 channels, driven by four product milestone videos. Reproduced.
- Company Shorts show no consistent lift: pooled median ratio 0.88 (n=54, 9 channels); 5 of 9 channels with both formats had higher Shorts median views than long-form, 4 lower.
- Zed publishes only long-form (0 Shorts in 15), about 15 videos in 297 days, and has a 7,163 median with a 315,941-view "Zed is 1.0". Smallness of output did not cap reach.
- Live, meeting, keynote and talk-titled company uploads have median ratio 0.50 (n=24, 10 channels), with one large outlier (Astro keynote 9.4). Treat as lower-yield than demos, not as zero.
- Duration per upload cannot be read without the Data API (no key; the feed has no duration field). A lower bound is measurable from the feed itself: the last chapter timestamp in the description. On 63 chaptered company long-form videos, median views by duration lower-bound band show no monotone effect (median ratios 0.88, 1.22, 1.42, 0.89, 2.47; every cell n under 25, so no finding). Finding 2b.
- YouTube's own current guidance (2026-07-14) on bridging Shorts to long-form: link a related video, say the call to action in the last 5 seconds, pay off the hook in the first 5 to 10 seconds of the long video.
- YouTube's claim that channels posting both formats grow faster dates from 2022-06-15 and came with no figures.
- End screens need a video of at least 25 seconds and go in the last 5 to 20 seconds; they are hidden on mobile web and viewers can hide them, so the closing must work without them.
- Default mix per 10 uploads: 7 task-answering tutorials, 2 milestone videos, 1 deep walkthrough, 0 Shorts, 0 raw live replays in the main list (70/20/10/0/0). Shorts only as a conditional pilot of at most 2 in 10, judged by the measurement dive's test. See "Default mix".
- Two claims in the earlier draft were wrong and are corrected: TechSmith's 2024 report says 10 to 19 minutes is the single most popular length (25%), not 3 to 6; and vidIQ's "Shorts history no longer feeds long-form" was reversed by the same publisher on 2022-08-22 and is contradicted by YouTube's current help page.

## Method and what could not be measured

Commands, run 2026-11-27 in `~/.cache/research-lang/exemplars/product/youtube2/`:

1. Channel list: the 30-row `ids.tsv` copied from the audit appendix ([audit](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-youtube-channels.md)). Feeds: `while IFS=$'\t' read n id g; do curl -s -m 20 "https://www.youtube.com/feeds/videos.xml?channel_id=$id" -o feeds/$n.xml; done < ids.tsv`.
2. Handle check: `grep -m1 -o '<name>[^<]*' feeds/$n.xml` for every row. All 30 names match the intended brand (for example `Zed Industries`, `Fly․io`, `HashiCorp, an IBM Company`). 15 `<entry>` per feed (`grep -c '<entry>'`). The audit's wrong-handle failure was in resolving handles to ids; using the audit's ids avoids it. Result: no id fails.
3. Shorts probe: `cat feeds/*.xml | grep -o "<yt:videoId>[^<]*" | sed "s/.*>//" | sort -u > vids.txt` (450), then `xargs -P 16 -I{} sh -c 'echo {} $(curl -s -o /dev/null -m 15 -w %{http_code} https://www.youtube.com/shorts/{})'`; `awk '{print $2}' shorts.txt | sort | uniq -c` gives 77 x 200 and 373 x 303, identical to the audit. The probe is an observed redirect, not a documented field.
4. Analysis: the audit's `yt_analyze.py` (extracted verbatim from its appendix) plus `extra.py` (company-only cells). `python3 -I ../scripts2/yt_analyze.py > out.txt`; `python3 -I ../scripts2/extra.py`.

Reproduction against the audit (flag: figures that moved): group medians educator 72,856.5 vs audit 72,825 and OSS 941 vs 958 (snapshot drift, feeds re-fetched the same day with newer views); announcement-word videos 44 vs 45 long-form (regex edge); every other audited figure used here (26% company Shorts, 4.94 company announcement, 0.64 pooled Shorts ratio, title-length bins, 77/450) reproduces exactly. The 29x holds: 72,856.5 / 2,506 = 29.07.

Duration, as far as it can be measured without a key: the commission asks for median views by duration band. Exact duration needs `videos.list` `contentDetails.duration` and an API key; none is set (`env | grep -i -E "youtube|google_api"` is empty) and the feed has no duration field (`grep -ci duration feeds/PostHog.xml` gives 0). Scraping watch pages is barred, so exact bands stay unmeasured. Two proxies were measured instead, from the feed and the Shorts probe: (1) Short vs long-form, where the platform defines a Short as square or vertical and up to three minutes ([YouTube Help, three-minute Shorts](https://support.google.com/youtube/answer/15424877), applies to uploads from 2024-10-15); (2) for chaptered long-form, the last chapter timestamp in the description, a lower bound on duration (`python3 -I scripts/bands.py`; first stamp 0, at least 3 stamps, ascending). Titles stating minutes are 0 of 210 on company channels (7 videos in the whole corpus, all educators), so that proxy is empty for companies. The chapter proxy covers only videos that carry chapters (63 of 156 company long-form), mostly talks, keynotes and conference sessions.

## Findings

### 1. Company channels draw a fraction of educator audiences, so educator practice is not evidence

Measured above: 2,506 vs 72,857 median views (29x). Fireship alone has a 1.95M median, so the educator side is lifted by a few channels. Company channels also upload more often (median gap 2.9 days vs 6.5) and use Shorts more (26% vs 14%). Educator advice (volume, hooks) must not be applied to a channel whose realistic median is four digits. Source: audit table plus the commands in Method.

### 2. Per-format cells, company channels only (n per cell)

Command: `python3 -I ../scripts2/extra.py`. Ratio is video views over that channel's own 15-video median.

| Cell | n videos | n channels | Median views | Median ratio |
|---|---|---|---|---|
| Company, all | 210 | 14 | 1,613.5 | 1.00 |
| Company, long-form | 156 | 14 | 1,799.5 | 1.00 |
| Company, Shorts | 54 | 9 | 1,492 | 0.88 |
| Company, long-form with announcement words | 18 | 8 | 8,841 | 4.94 |
| Company, long-form without announcement words | 138 | 14 | 1,398.5 | 1.00 |
| Company, long-form with how-to words | 7 | 6 | 1,075 | 1.54 (n under 25, not a finding) |
| Company, long-form titled live, meeting, keynote, talk, conference | 24 | 10 | 499 | 0.50 |

The last row's regex is loose (it includes "keynote", which pulls in Astro's 9.4x keynote). Shorts versus long-form per company channel that has both (median views, Short n / long n): Cloudflare Developers 153,380 (2) vs 4,227 (13); Deno 2,887 (5) vs 1,890 (10); GitHub 3,980 (5) vs 3,847 (10); JetBrains 3,995 (11) vs 2,335 (4); Prisma 459 (4) vs 336 (11); Fly.io 238 (12) vs 1,075 (3); PostHog 1,106 (8) vs 8,415 (7); Supabase 2,834 (6) vs 11,734 (9); Tailscale 241 (1) vs 14,048 (14). Five higher, four lower; the counts per cell are 1 to 12, so no direction is established.

### 2b. Duration proxy cells, company channels only

Command: `cd ~/.cache/research-lang/exemplars/product/youtube3 && python3 -I scripts/bands.py`. Band is the last chapter timestamp (a lower bound on length). Ratio is views over the channel's own 15-video median.

| Cell (company) | n videos | n channels | Median views | Median ratio |
|---|---|---|---|---|
| Chaptered long-form, last chapter under 5 min | 12 | 6 | 1,937 | 0.88 |
| 5 to 10 min | 7 | 5 | 5,177 | 1.22 |
| 10 to 20 min | 17 | 7 | 3,250 | 1.42 |
| 20 to 60 min | 22 | 7 | 952 | 0.89 |
| 60 min or more | 5 | 4 | 11,886 | 2.47 |
| Long-form without chapters (duration unknown) | 93 | 13 | 1,416 | 1.00 |
| Shorts (platform rule: up to 3 min) | 54 | 9 | 1,492 | 0.88 |

Reading: no cell reaches n=25 and the pattern is not monotone, so there is no measured best length for a company channel. The 60-minute-plus cell holds two Supabase Select conference streams (267 and 415 minutes) among five event videos, so its lift is event content, not length. The 10 to 20 minute cell (1.42) includes Tailscale demos at 3.0 to 18.3. Educators (same command, educator block): 16 videos at 10 to 20 minutes (ratio 1.03), 18 at 20 to 60 (1.08); also no pattern. Exact bands need the Data API; the commission's duration question stays open on first-party data, and rule 12 forbids a length conclusion from these cells.

### 3. Announcements and milestone videos are the one measured lift, and it is outlier-driven

Top company ratios: "Introducing Scouts in PostHog" 44.5x (100,733 views), "Zed is 1.0" 44.1x (315,941), "DeltaDB: A New System of Record for Agents" 21.1x (151,072), "Meet the New Grafana UI | Now in Public Preview" 17.7x. Not announcements but also high: Tailscale's conference keynote (18.3x) and a farewell video (18.0x). A small channel gets this lift only when it has a milestone to announce; there is no evidence that renaming an ordinary demo "Introducing..." produces it. Command: `python3 -I ../scripts2/yt_analyze.py | grep '^TOP'`.

### 4. Shorts: mixed evidence for company channels, and one clear exemplar on each side

PostHog runs Shorts at 8 of 15 uploads; its best Short ("Mamma mia, PostHog sources is here", 81,766 views) is a product feature, but its median Short is 1,106 against 8,415 for its long-form. JetBrains runs 11 of 15 as Shorts and the channel median is 2,761. Zed runs none and has a 7,163 median. Fly.io posted 12 Shorts with a 238 median. Whether a Short feeds long-form viewing for a developer tool is not measurable from public data (no retention or traffic-source fields). Platform facts: a Short is "up to 3 minutes long", max resolution 1080p, and since 2025-03-31 a view counts every start or replay with no minimum watch time; the earlier metric is now "Engaged views" and drives Partner Program eligibility ([YouTube Help, Shorts](https://support.google.com/youtube/answer/10059070), no page date, fetched 2026-11-27). View definitions, thresholds and the keep-or-drop test are owned by yt-measurement-and-testing.

### 5. YouTube's current bridge guidance from Shorts to long-form

[YouTube Official Blog, 2026-07-14](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/): attach a Related video to the Short in Studio (Content, select the Short, Related video); say the call to action in the final 5 seconds; "The first 5 to 10 seconds of your long video should directly address the topic, question, or hook promised in the Short" and skip channel intros and logos. This is the platform's own guidance and gives checkable steps. It reports no outcome numbers.

### 6. "Both formats grow faster" is an old, unquantified claim

[TechCrunch, 2022-06-15](https://techcrunch.com/2022/06/15/youtube-shorts-tops-1-5b-logged-in-users-monthly-users-touted-as-feeder-to-long-form-content) quotes YouTube's VP of the Americas: channels uploading both are "seeing better overall watch time". No figures were shared and support was two creator case studies. Do not encode it as a finding.

### 7. Length by intent comes from vendor data and platform docs, not from developer channels

- Wistia (vendor, hosting platform; page dated 2025-07-01 but citing its "2026 State of Video Report" of over 13 million videos, an internal date mismatch to treat with care) recommends under 1 minute for awareness, 1 to 5 minutes to educate or explain, 5 to 30 minutes to convert or nurture, 30+ minutes to retain or train; under-one-minute videos average a 52% engagement rate; engagement falls after 5 minutes, with an "11% drop" past 30 minutes ([Wistia](https://wistia.com/blog/optimal-video-length)). Wistia measures viewing on its own player, mostly marketing and training embeds, not YouTube discovery.
- Wistia 2024 (vendor data; [Top 5 Insights from Wistia's 2024 State of Video Report](https://wistia.com/blog/insights-state-of-video-report), published 2024-04-15, "millions of videos across thousands of companies", no exact n): engagement is "only minorly different between one minute and five minutes" and drops significantly past five minutes; "a 30-60 minute video has roughly half the engagement rate of a 1-3 minute video, but over 10 times the total watch time." Same vendor, same direction as the 2025-07-01 page above: short wins engagement rate, long wins total watch time.
- TechSmith 2024 (vendor data; [Video Viewer Study 2024 PDF](https://www.techsmith.com/learn/wp-content/uploads/2024/12/TechSmith-Video-Viewer-Study-2024-1-1.pdf), fielded by Qualtrics in May 2024, "nearly 1,000 participants", length section read in full): "10-19 minute long instructional or informational video are the most popular time frame" (25% each for informational and instructional); "Combined, 30% and 35% of viewers still preferred either 3-4 minute or 5-6 minute" informational or instructional videos; "Nearly two thirds of respondents said videos over 20 minutes are too long." This corrects the earlier draft's "30% prefer 3 to 6 minutes", which was the blog's compression ([TechSmith blog](https://www.techsmith.com/blog/video-length/)). Its post of 2025-12-17 says videos under six minutes perform well, 6 to 10 for quick training, 10 to 20 for in-depth modules, no sample stated ([TechSmith blog](https://www.techsmith.com/blog/video-statistics)). Respondents are general learners, not developers.
- YouTube's retention report gives no target length or retention benchmark; "Intro" is the share still watching after 30 seconds, and the report compares against similar-length videos and the channel's last 10 similar videos ([YouTube Help](https://support.google.com/youtube/answer/9314415), no page date).

So length by intent is a vendor-backed default, not a measured developer-channel result: answer-the-question tutorials 3 to 10 minutes; deep walkthroughs 10 to 20 (TechSmith's most popular band; over 20 is "too long" for two thirds of its respondents); launch videos as long as the announcement needs. Exemplar duration is only a lower-bound proxy (Finding 2b).

### 8. Live streams and talks sit at the bottom of company channels

Audit bottom of range: "GitHub Copilot Day live" 0.0, "Rust Foundation Live Stream" 0.0, Kubernetes SIG recording 0.17, Astro "Talking and Doc'ing" series 0.0 to 1.43. Company live-or-meeting-titled median 0.50 (Finding 2). Replays are the cheap case; live streams need channel verification, age 16 or over, and no live restriction in the last 90 days ([YouTube Help, live](https://support.google.com/youtube/answer/2474026), no page date). Title A/B tests do not support Shorts, scheduled lives or Premieres ([YouTube Help, Test and Compare](https://support.google.com/youtube/answer/16391400), no page date).

### 9. Series and playlists

No fetched source measures playlist effects for company channels. Observed practice only: JetBrains publishes "The Dev Floor" as an episodic set (Ep 1 plus three Shorts parts; one part 73,188 views); Supabase runs a weekly live changelog that sits low (ratios 0.31 to 0.47 for the Weekly Changelog titles). A series earns its slot only when each episode answers a standalone query.

### 10. Closing structure

- End screens: can be added to "the last 5 to 20 seconds"; video must be at least 25 seconds; up to four elements on 16:9; link elements need Partner Program membership; unavailable on made-for-kids, mobile web (iPad excepted) and the YouTube Music app; viewers can hide them; card teasers and watermarks are hidden while one shows ([YouTube Help](https://support.google.com/youtube/answer/6388789), no page date).
- Cards: up to 5 per video; link cards need Partner Program; computers only, with a mobile icon while controls show ([YouTube Help](https://support.google.com/youtube/answer/6140493), no page date).
- Chapters: first timestamp 00:00, at least three ascending, each at least 10 seconds ([YouTube Help](https://support.google.com/youtube/answer/9884579), no page date). Audit: chapters have 1.00 company lift (n=63); 28% of long-form uses them, so the case is findability.
- A destination link in the first three description lines: company videos with it 1.16 (n=61, 5 of 10 channels higher); 35% of company videos have one against 76% for educators.
- Because end screens can be hidden and do not show on mobile web, the spoken and on-screen call to action must stand alone; the last 5 seconds of a Short and the first 5 to 10 seconds of the linked long video are YouTube's own bridge points (Finding 5).

### 11. Industry context on viewing, labelled as non-YouTube-official

[Tubefilter, 2026-08-03](https://www.tubefilter.com/2026/08/03/youtube-shorts-long-form-study-metricool/) reporting Metricool's 2026 study (vendor; 799,718 videos, 71,177 accounts, US creators): long-form views up 76% year over year, watch time up 11%, long-form engagement down 45%, Shorts traffic more than doubled and 61% of measured views. [Tubefilter, 2025-02-06](https://www.tubefilter.com/2025/02/06/youtube-long-form-viewership-increase-shorts/) reporting a Digital i survey (sample size not stated): videos over 30 minutes are 73% of respondents' watch time. These are platform-wide and creator-wide, not developer-tool specific, and they point in opposite directions; neither decides a company channel's mix.

## Normative guidance candidates

| # | Rule | Severity | Rationale | Verification |
|---|---|---|---|---|
| 1 | Publish a long-form upload for every product milestone (1.0, public preview, named feature launch), title naming the product and milestone. | SHOULD | The only measured company lift (4.94x, n=18, 8 channels, outlier-driven). | Reading heuristic. Pass: "Zed is 1.0". Fail: "Some updates from our team". Script: title contains the product name and one of `1.0|introducing|public preview|now in|new`. |
| 2 | Do not title an ordinary upload as an announcement. | MUST | Clickbait and misleading metadata is a policy violation (strike path, 90-day expiry, three strikes in 90 days) ([spam policy](https://support.google.com/youtube/answer/2801973)). | Every promise in title and thumbnail appears in the video; grep the title for `introducing|launch|1\.0` and confirm a matching release tag or changelog entry. |
| 3 | Default the channel to long-form; add Shorts only as a pilot judged by the measurement dive's Shorts success test, not by this rule's numbers. | SHOULD | Company Shorts show no consistent lift (0.88 pooled, 5 of 9 channels higher); effect on long-form is unmeasurable from public data. | The pilot records the test name, view definition and date range from yt-measurement-and-testing before the first Short; absence fails. |
| 4 | A Short must be 180 seconds or less, square or vertical, and carry a Related video link to the matching long-form. | MUST (if Shorts are published) | Platform limit ([YouTube Help, Shorts definition, rule from 2024-10-15](https://support.google.com/youtube/answer/15424877)) and YouTube's bridge guidance ([YouTube Blog, 2026-07-14](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/)). | `ffprobe -v error -show_entries format=duration -of csv=p=0 file.mp4` prints at most 180; width is not greater than height; the Studio "Related video" field is set. |
| 5 | Put the call to action in the final 5 seconds of a Short; the linked long video answers the Short's hook in its first 5 to 10 seconds with no intro logo. | SHOULD | YouTube's own advice ([YouTube Blog, 2026-07-14](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/)). | Reading heuristic on the script: second 0 to 10 states the topic named in the linked Short; fail example: 15-second animated logo. |
| 6 | Keep a long-form cadence floor of one upload per 30 days; below that, stop posting Shorts and fold the channel to a launch-only schedule. | CONSIDER | Zed (about 15 in 297 days, median 7,163) shows a low cadence can hold a high median; floor is judgment, not measured. | `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=<id>"`; days between newest two `<published>` values stay under 30. |
| 7 | Do not publish raw live-stream replays or meeting recordings into the main uploads list; title them with topic and date, or keep them in a separate playlist. | SHOULD | Company live and meeting titles median 0.50 and several at 0.0 to 0.18. | Title does not match `Live Stream|Weekly|SIG|\.mp4` unless topic-bearing; for the check use the audit regex. |
| 8 | Every long video over 10 minutes carries chapters: first line `00:00`, at least three ascending timestamps, each section 10 seconds or longer. | SHOULD | Platform format requirement ([YouTube Help, chapters](https://support.google.com/youtube/answer/9884579); page undated, footer 2026, fetched 2026-11-27); findability, not a measured lift. | `grep -c -E '^[0-9]{1,2}:[0-9]{2}' desc.txt` is at least 3 and first match is `0:00` or `00:00`. |
| 9 | Put the single destination URL in the first three non-empty description lines. | SHOULD | Company 1.16 vs 1.0 (n=61, 5 of 10 channels), only 35% do it. | `grep -v '^[[:space:]]*$' desc.txt \| head -3 \| grep -c 'https\?://'` is at least 1. |
| 10 | Close with an end screen in the last 5 to 20 seconds, but never rely on it: say the next step aloud and show it on screen. | SHOULD | End screens need 25 seconds or more, hide on mobile web, and viewers can hide them ([YouTube Help, end screens](https://support.google.com/youtube/answer/6388789); page undated, footer 2026, fetched 2026-11-27). | Video length at least 25 s; script contains a spoken next-step line within the last 20 s; Studio end-screen element count at most 4. |
| 11 | Set the video length by intent: answer-a-question tutorial 3 to 10 minutes; deep walkthrough 10 to 20; milestone video as long as needed with chapters. | CONSIDER | Vendor surveys only ([TechSmith 2024](https://www.techsmith.com/learn/wp-content/uploads/2024/12/TechSmith-Video-Viewer-Study-2024-1-1.pdf), May 2024; [Wistia 2024-04-15](https://wistia.com/blog/insights-state-of-video-report)); no developer-channel duration measurement. | Reading heuristic: the title's question is answered in the first third; length over 20 minutes needs chapters. |
| 12a | Plan the upload mix per 10 uploads as 7 task tutorials, 2 milestone videos (only if two real milestones exist, else more tutorials), 1 deep walkthrough, 0 Shorts, 0 raw live replays in the main list. | CONSIDER | Company long-form is 74% of observed uploads (156 of 210); the only measured lift is milestone videos (4.94x); Shorts and live show none (0.88, 0.50). Shares are judgment from those cells, not a measured optimum. | Count titles of the last 10 uploads against the plan; Shorts at most 2 in 10, and only under rule 3's pilot. |
| 12 | Report any format comparison with n per cell and the channel's own baseline; refuse a conclusion from cells under n=25. | MUST | The audit's own caution; how-to (7), versus (0 to 2) cells are too small. | The report shows n and median ratio for each cell. |

## Default mix

Shares are per 10 uploads in a rolling window, with the cadence floor of rule 6. They are a judgment from Findings 2, 2b, 3, 4 and 8, not a measured optimum.

| Format | Default share | Pilot variant (only after the owner approves a Shorts pilot) | Evidence |
|---|---|---|---|
| Task-answering tutorial or demo, 3 to 10 min | 70% | 60% | Company long-form baseline ratio 1.00 (n=156) |
| Milestone or launch video | 20% (only when a real milestone exists; otherwise fold into tutorials) | 20% | 4.94x, n=18, 8 channels, outlier-driven |
| Deep walkthrough or talk edit, 10 to 20 min, chaptered | 10% | 10% | Finding 2b: no measured length effect; TechSmith 10 to 19 min most popular |
| Shorts | 0% | at most 20%, each linked to a long-form | 0.88 pooled ratio, 5 of 9 channels higher; YouTube bridge guidance |
| Raw live replays or meeting recordings in the main list | 0% (separate playlist) | 0% | 0.50 median ratio, n=24 |

## What an agent must not decide alone

- Whether the company opens a channel at all, who appears on camera, and the channel's brand and handle (ask the owner; verify the feed `<name>` matches before linking).
- Whether to run Shorts, and whether the fleet's existing Shorts series (if the owner has one; the audit found no YouTube link in any fleet README, site or config) continues. The decision follows the measurement dive's test; an agent may not extend or drop it on its own reading.
- Altered or synthetic content disclosure, made-for-kids setting, paid-promotion box, and live-stream enablement. These are owner or legal calls. YouTube requires disclosure of realistic AI-generated or altered content (a real person made to say or do something they did not, altered footage of a real event, a realistic scene that never happened) and exempts unrealistic content, minor aesthetic edits, captions and voice cloning of one's own voice for voice-overs or dubs ([YouTube Help, altered or synthetic content](https://support.google.com/youtube/answer/14328491), undated, footer 2026, fetched 2026-11-27); whether a video crosses that line is the owner's call.
- Any public write through the YouTube API (upload, metadata change, comment, like) without the owner's express, prior consent. The [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies) (undated page, fetched 2026-11-27; one clause dated 2026-06-01) require that the user "must expressly consent to those actions prior to their actual execution" (III.E.3), forbid automating uploads, comments or likes "without the user's prior specific and express consent" (III.I.2), and require that users have final control over published data (III.C.3).
- Claims about performance, customers or benchmarks spoken in a video.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Recommends educator tactics (daily uploads, hook formulas) as if a company channel had educator reach | Rule 12 and Finding 1: require the channel group and the 2,506 vs 72,857 baseline in any recommendation. |
| Treats "Introducing X" as a lever and applies it to every upload | Rule 2 check against release tag. |
| Cites "channels posting Shorts and long-form grow faster" as a fact | Source date 2022-06-15 with no figures; reject without a dated figure. |
| Quotes Shorts views using the pre-2025-03-31 definition | Require the view definition and date range (owned by the measurement dive). |
| Plans an end screen at second 5 of a 20-second video | End screens need 25 s or more and sit in the last 5 to 20 seconds. |
| Treats chapters as optional free-form text | Regex in rule 8; first stamp `00:00`. |
| Resolves a channel by handle search | Compare `<name>` in the feed to the brand; use ids. |

## Contested

| Position A | Position B | What decides it |
|---|---|---|
| Shorts feed long-form growth (YouTube VP, [2022-06-15](https://techcrunch.com/2022/06/15/youtube-shorts-tops-1-5b-logged-in-users-monthly-users-touted-as-feeder-to-long-form-content), no figures; [YouTube Blog 2026-07-14](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/) still publishes a bridge playbook; [YouTube Help](https://support.google.com/youtube/answer/16559651) says a viewer who often engages with long-form "might see your Shorts recommended" but also "this is not common behavior from viewers") | Shorts viewers differ from long-form viewers: [vidIQ, 2022-07-27](https://vidiq.com/blog/post/youtube-shorts-long-form-viewers-algorithm) reported separate watch histories (quoting YouTube's director of discovery), but the same publisher reported on [2022-08-22](https://vidiq.com/blog/post/youtube-recommends-long-form-videos-shorts-viewers) that recommendations again consider long-form from channels watched in Shorts; the audit shows company Shorts ratio 0.88 | Channel-level Studio traffic-source data; not measurable from public feeds. The measurement dive's test decides. Neither vidIQ post is current; do not cite either as present behaviour. |
| Long-form is where watch time lives ([Digital i via Tubefilter, 2025-02-06](https://www.tubefilter.com/2025/02/06/youtube-long-form-viewership-increase-shorts/), 73% of watch time in videos over 30 minutes; survey, sample size not stated) | Short-form dominates view counts ([Metricool via Tubefilter, 2026-08-03](https://www.tubefilter.com/2026/08/03/youtube-shorts-long-form-study-metricool/), 61% of views) | They measure different units (watch time vs views); neither is a developer-company sample. |
| Shorter is better ([Wistia](https://wistia.com/blog/optimal-video-length): under one minute averages 52% engagement; TechSmith 2024: 30% to 35% prefer 3 to 6 minutes) | Total watch time rises with length ([Wistia 2024-04-15](https://wistia.com/blog/insights-state-of-video-report): a 30 to 60 minute video has about half the engagement rate of a 1 to 3 minute video but over 10 times the total watch time) and [TechSmith 2024](https://www.techsmith.com/learn/wp-content/uploads/2024/12/TechSmith-Video-Viewer-Study-2024-1-1.pdf) finds 10 to 19 minutes the single most popular length (25%) | Intent: engagement rate favours short, watch time and conversion favour long. A tutorial is judged on whether it answers the query. |

## Dated facts

| Fact | Source | Date the source states | Type |
|---|---|---|---|
| Square or vertical video up to 3 minutes is a Short for uploads from 2024-10-15 (Official Artist Channels from 2025-12-08) | [YouTube Help](https://support.google.com/youtube/answer/15424877) | 2024-10-15 and 2025-12-08 as stated on the page | Platform |
| Shorts up to 3 minutes, 1080p max; views count every start or replay from 2025-03-31; old metric is "Engaged views", used for Partner Program | [YouTube Help](https://support.google.com/youtube/answer/10059070) | change date 2025-03-31, page undated | Platform |
| End screens last 5 to 20 s, video 25 s or more, 4 elements on 16:9, link elements need Partner Program, hidden on mobile web | [YouTube Help](https://support.google.com/youtube/answer/6388789) | undated, 2026 footer | Platform |
| Cards up to 5 per video, computers only, link cards need Partner Program | [YouTube Help](https://support.google.com/youtube/answer/6140493) | undated | Platform |
| Chapters: first 00:00, 3 or more, 10 s minimum each | [YouTube Help](https://support.google.com/youtube/answer/9884579) | undated | Platform |
| Retention "Intro" is the share after 30 s; no benchmark; key moments need 60 s and 100 views | [YouTube Help](https://support.google.com/youtube/answer/9314415) | undated | Platform |
| Test and Compare: up to 3 variants, finish within two weeks, watch time decides, excludes Shorts, scheduled lives, Premieres | [YouTube Help](https://support.google.com/youtube/answer/16391400) | undated | Platform |
| Live needs verified channel, age 16+, no live restriction in 90 days | [YouTube Help](https://support.google.com/youtube/answer/2474026) | undated | Platform |
| Malicious clickbait barred; strike path with 90-day expiry; three strikes in 90 days | [YouTube Help](https://support.google.com/youtube/answer/2801973) | undated | Platform |
| Bridge a Short to long-form with a Related video, CTA in last 5 s, payoff in first 5 to 10 s | [YouTube Official Blog](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/) | 2026-07-14 | Platform |
| Both-format channels see better watch time, no figures | [TechCrunch quoting YouTube](https://techcrunch.com/2022/06/15/youtube-shorts-tops-1-5b-logged-in-users-monthly-users-touted-as-feeder-to-long-form-content) | 2022-06-15 | Platform claim via press |
| Length by goal and 52% engagement under 1 minute; 11% drop past 30 minutes (13M videos on Wistia) | [Wistia](https://wistia.com/blog/optimal-video-length) | page 2025-07-01 (cites a 2026 report) | Vendor data |
| Videos under six minutes perform well; 6 to 10, 10 to 20 minute bands; sample size not stated | [TechSmith](https://www.techsmith.com/blog/video-statistics) | 2025-12-17 | Vendor data |
| Long-form views +76%, watch time +11%, engagement -45%; Shorts 61% of views; 799,718 videos | [Tubefilter on Metricool](https://www.tubefilter.com/2026/08/03/youtube-shorts-long-form-study-metricool/) | 2026-08-03 | Vendor study via press |
| Videos over 30 min are 73% of watch time among surveyed US adults | [Tubefilter on Digital i](https://www.tubefilter.com/2025/02/06/youtube-long-form-viewership-increase-shorts/) | 2025-02-06 | Vendor survey via press |
| YouTube: a viewer who often engages with long-form "might see your Shorts recommended"; "individual preferences vary" | [YouTube Help](https://support.google.com/youtube/answer/16559651) | undated, footer 2026 | Platform |
| Separate Shorts and long-form watch histories (reported); reversed 2022-08-18 | [vidIQ 2022-07-27](https://vidiq.com/blog/post/youtube-shorts-long-form-viewers-algorithm), [vidIQ 2022-08-22](https://vidiq.com/blog/post/youtube-recommends-long-form-videos-shorts-viewers) | 2022-07-27, 2022-08-22 | Vendor (secondary, quoting YouTube staff) |
| 10 to 19 min most popular (25%); 3-4 or 5-6 min 30% (informational) and 35% (instructional); two thirds say over 20 min too long; nearly 1,000 participants, May 2024 | [TechSmith PDF](https://www.techsmith.com/learn/wp-content/uploads/2024/12/TechSmith-Video-Viewer-Study-2024-1-1.pdf) | 2024 (fielded May 2024) | Vendor survey |
| Engagement drops past 5 min; 30-60 min video about half the engagement of 1-3 min, over 10x total watch time | [Wistia](https://wistia.com/blog/insights-state-of-video-report) | 2024-04-15 | Vendor data |
| API writes need express prior user consent | [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies) | undated (one clause from 2026-06-01) | Platform |
| Disclose realistic altered or synthetic content | [YouTube Help](https://support.google.com/youtube/answer/14328491) | undated, footer 2026 | Platform |
| Chaptered company long-form, median ratio by last-chapter band 0.88 / 1.22 / 1.42 / 0.89 / 2.47 (n 12, 7, 17, 22, 5) | Own measurement, `scripts/bands.py` | 2026-11-27 | Independent measurement, lower-bound proxy |
| 29x audience gap; 26% company Shorts; 4.94 announcement lift | Own measurement, 30 feeds, Method commands | 2026-11-27 | Independent measurement, small window |

Fetched but not usable: [Google business page on short and long form](https://business.google.com/us/think/search-and-video/short-and-long-form-videos/) redirected to a consent wall and was not read.

## Sources

| URL | What it is | Date | Why read |
|---|---|---|---|
| https://support.google.com/youtube/answer/10059070 | YouTube Help, Shorts | undated, 2026 | Shorts length and view definition |
| https://support.google.com/youtube/answer/6388789 | YouTube Help, end screens | undated | Closing window |
| https://support.google.com/youtube/answer/6140493 | YouTube Help, cards | undated | Card limits |
| https://support.google.com/youtube/answer/9884579 | YouTube Help, chapters | undated | Chapter format |
| https://support.google.com/youtube/answer/9314415 | YouTube Help, retention report | undated | No benchmark exists |
| https://support.google.com/youtube/answer/16391400 | YouTube Help, Test and Compare | undated | Format exclusions |
| https://support.google.com/youtube/answer/2474026 | YouTube Help, live streaming | undated | Live preconditions |
| https://support.google.com/youtube/answer/2801973 | YouTube Help, spam and deceptive practices | undated | Clickbait policy |
| https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/ | YouTube Official Blog | 2026-07-14 | Shorts to long-form bridge |
| https://techcrunch.com/2022/06/15/youtube-shorts-tops-1-5b-logged-in-users-monthly-users-touted-as-feeder-to-long-form-content | Press quoting YouTube | 2022-06-15 | The unquantified both-format claim |
| https://support.google.com/youtube/answer/15424877 | YouTube Help, three-minute Shorts | 2024-10-15 | Shorts definition |
| https://support.google.com/youtube/answer/16559651 | YouTube Help, recommendations | undated, 2026 | Cross-format recommendation |
| https://support.google.com/youtube/answer/14328491 | YouTube Help, synthetic content | undated, 2026 | Disclosure |
| https://developers.google.com/youtube/terms/developer-policies | YouTube API Services Developer Policies | undated | API write consent |
| https://vidiq.com/blog/post/youtube-shorts-long-form-viewers-algorithm | vidIQ (vendor) | 2022-07-27 | Contested claim |
| https://vidiq.com/blog/post/youtube-recommends-long-form-videos-shorts-viewers | vidIQ (vendor) | 2022-08-22 | Reversal |
| https://wistia.com/blog/insights-state-of-video-report | Wistia 2024 report summary (vendor) | 2024-04-15 | Length vs watch time |
| https://www.techsmith.com/learn/wp-content/uploads/2024/12/TechSmith-Video-Viewer-Study-2024-1-1.pdf | TechSmith 2024 study (vendor) | 2024 | Length preference |
| https://wistia.com/blog/optimal-video-length | Wistia (vendor) | 2025-07-01 | Length by goal |
| https://www.techsmith.com/blog/video-statistics | TechSmith (vendor) | 2025-12-17 | Length preference |
| https://www.tubefilter.com/2026/08/03/youtube-shorts-long-form-study-metricool/ | Press on Metricool (vendor) | 2026-08-03 | Platform-wide trend |
| https://www.tubefilter.com/2025/02/06/youtube-long-form-viewership-increase-shorts/ | Press on Digital i survey | 2025-02-06 | Opposing signal |
| https://www.youtube.com/feeds/videos.xml?channel_id=UCXYwRX_RB_qQ7sij1sgW-Cg | Zed channel feed (platform data, 15 newest) | 2026-11-27 | Exemplar, no Shorts |
| https://www.youtube.com/feeds/videos.xml?channel_id=UCn4mJ4kK5KVSvozJre645LA | PostHog channel feed | 2026-11-27 | Exemplar, 8 of 15 Shorts |
| the other 28 feeds in `ids.tsv` | channel feeds | 2026-11-27 | Corpus |

Cross-territory notes, left to siblings: title and thumbnail wording and truncation (packaging dive); the Shorts success test and view definitions (yt-measurement-and-testing); AI and synthetic-content disclosure and made-for-kids settings (policy dive).
