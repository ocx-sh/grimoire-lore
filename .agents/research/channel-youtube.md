---
title: Small company YouTube channel
topic: channel-youtube
program: product
sub_program: channels
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: CH-YT
consolidates:
  - channel-youtube/yt-upload-metadata-contract.md
  - channel-youtube/yt-format-portfolio.md
  - channel-youtube/yt-content-policy-and-series-risk.md
  - channel-youtube/yt-measurement-and-testing.md
grounding:
  - product-audit/exemplar-youtube-channels.md
  - product-audit/distribution-posture.md
  - product-audit/config-inventory.md
---

# Small company YouTube channel

Question: What should a small developer-tool company channel publish, and how must each upload be packaged and configured, given that company channels draw about a twenty-ninth of educator-channel audiences?

Scope: one YouTube channel run by a small developer-tool company, with agents drafting uploads and a human publishing them. Sibling families own the neighbours, and this file cites them in one line each: CH-CORE (what an agent may do on a platform, AI and paid-promotion labels, the channel inventory and inbound links, how facts decay), CH-VID (frame legibility, captions and audio description, the production pipeline). Marketing owns SEO, Google video markup and analytics links.

Severity key. **MUST** blocks the upload or the report. **SHOULD** warns, and passing the warning needs a recorded reason. **CONSIDER** is advice. "The manifest" is the per-upload metadata file defined in CH-YT-01. "The channel record" is the one-time checklist defined in CH-YT-12.

## Verdict

1. **Educator practice is not evidence for this channel.** The median company video draws 2,506 views against 72,825 for an educator video, about 29x. The figure is a median of channel medians over 15-video windows, measured twice on 2026-11-27 (29.06 and 29.07) ([audit](product-audit/exemplar-youtube-channels.md), [format dive](channel-youtube/yt-format-portfolio.md)). Volume, hook formulas and thumbnail A/B testing are tactics for six-figure audiences. A rule here may cite an educator channel as an example of a format, never as evidence that the format works.
2. **Publish long-form first.** The default stream is task-answering tutorials, plus one video per real product milestone. No format cell on company channels clears this file's own n=25 bar (CH-YT-28) with a lift. The milestone cell reads 4.94x the channel median, but on n=18 across 8 channels, driven by four outliers, so it is "no finding" and the milestone video stays a CONSIDER (CH-YT-17). The four outliers are examples of launch packaging, not evidence that it works.
3. **Shorts are off by default.** Company Shorts show no consistent lift: pooled ratio 0.88, n=54, 9 channels, 5 higher and 4 lower. The cell clears the n=25 bar and its finding is a null: no direction. Nine channels is a thin base, so the default rests on the absence of a lift, not on a measured loss. Public data cannot show whether a Short feeds long-form viewing. Shorts run only as an owner-approved, time-boxed pilot. The pilot is judged on engaged views and on an action a viewer took, never on public views.
4. **The fleet's live Shorts series stops in its current shape.** The two "OCX Shorts 01" uploads share one number and an identical description (similarity 1.00). The second upload is a visual variant of the first ("Dino Edition"). No long-form video exists for a Short to point to. A third upload in that shape breaks CH-YT-04, CH-YT-20 and CH-YT-22. Whether the series continues as a pilot is the owner's decision.
5. **Every upload goes through a manifest and a linter, and the API is never trusted to fill gaps.** Since 2026-11-02 an API upload with no `privacyStatus` goes public, even from an unverified project ([revision history](https://developers.google.com/youtube/v3/revision_history)). Whether Studio upload defaults apply to API uploads is unknown: Help says they "only affect videos uploaded through your browser on youtube.com/upload" and is silent on the API ([Help 2660027](https://support.google.com/youtube/answer/2660027), undated, fetched 2026-11-27). Since 2026-10-15 an omitted `selfDeclaredMadeForKids` is left as it was, not overwritten. The agent therefore sends every field explicitly, uploads as private, reads the values back, and leaves the switch to public to a human.
6. **The silent failures are the dangerous ones, so the linter checks them all.** These metadata problems never raise an error:
   - a description over 5,000 bytes that is under 5,000 characters;
   - a chapter list whose first stamp is not at zero, or that has only two stamps;
   - a link that stays plain text on a channel that does not meet "platform requirements, such as verification or Advanced Features" ([videos resource](https://developers.google.com/youtube/v3/docs/videos));
   - an end screen planned for a video shorter than 25 seconds.

   The linter reads the manifest before upload.
7. **Templated content is a channel-level risk, so the check measures descriptions, not titles.** Exemplar series in good standing score 0.5 to 0.95 on title similarity, which makes titles useless as a gate. Their descriptions separate cleanly: HashiCorp has a median of 0.37 and JetBrains 0.12, against 0.94 for meeting boilerplate and 1.00 for the fleet pair.
8. **At this channel's size, measurement means saying "insufficient data".** The fleet's two Shorts have 7 and 12 views. Even at 1,000 impressions per arm, a 4% CTR must rise to 6.8% before a test can detect it. Test and Compare is therefore not run. Every reported view number names its definition, because a view was redefined on 2025-03-31, again on 2026-08-24, and co-views were added on 2026-11-16.
9. **Scripts never read youtube.com pages.** Agents read through the Data API or the channel RSS feed. The research program broke this rule itself: 450 `/shorts/` probes, and a consent-bypass handle fetch. Those numbers stand as recorded, but nobody repeats the method.

### Conflicts resolved

| Conflict | Positions | Decision and reason |
|---|---|---|
| What the fleet Shorts' description says | Posture audit and policy dive: one 53-character sentence with no link ([distribution-posture.md:228](product-audit/distribution-posture.md), [policy dive](channel-youtube/yt-content-policy-and-series-risk.md) section 5). Metadata dive: 683 characters with the install link on line 2 | **The metadata dive is right.** The feed was re-fetched for this consolidation (`curl -s 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg'`, 2026-11-27): both descriptions are 683 characters (691 bytes), the line-2 link is `https://ocx.sh/docs/getting-started/install-ocx/`, and they carry 3 hashtags. The audit quoted only the first line. The policy dive's "no link, distribution gap" is withdrawn. Its similarity finding (1.00) stands: the two full texts are byte-identical. Views today are 7 for "Pin Node.js in the repo" and 12 for "Dino Edition". The audit had them the other way round. The total of 19 is unchanged |
| Size and length of a Shorts pilot | Format dive: at most 2 Shorts per 10 uploads. Measurement dive: a series of at least 10 Shorts judged at 90 days | **The measurement dive's shape wins, and Shorts leave the long-form mix.** With a floor of one long-form upload per 30 days, "2 in 10" yields about 2 Shorts in 90 days. No test can judge that. A pilot is a separate stream: at least 10 Shorts within 90 days, each linked to a long-form video, or no pilot at all (CH-YT-21) |
| First chapter stamp | Metadata dive: `00:00` only. Format dive: `0:00` or `00:00` | **MUST start at zero; writing it `00:00` is a SHOULD house form.** Every platform source writes `00:00` ([Help 9884579](https://support.google.com/youtube/answer/9884579), undated, fetched 2026-11-27), but whether `0:00` works is not stated ([metadata dive](channel-youtube/yt-upload-metadata-contract.md) line 73). An unproven syntax cannot block an upload, so `chap.py` fails a first stamp that is not at zero and only warns on `0:00` (CH-YT-06) |
| Hashtag cap | Metadata dive: SHOULD at most 3, MUST at most 60. Policy dive: MUST at most 3, "a convention, not a policy limit" | **SHOULD at most 3, each naming the subject. No separate 60 rule.** Only 3 hashtags display ([Help 6390658](https://support.google.com/youtube/answer/6390658)). 45 of 450 audited videos carry more than 3 with no visible penalty. No audited video comes near 61. The part that is policy, irrelevant hashtags, sits in the same rule (CH-YT-05) |
| Long-form thumbnail minimum | Help 72431: minimum width 640. Metadata dive: 1280 as a SHOULD. Measurement dive: in Test and Compare, any variant under 1280x720 drops every variant to 854x480 | **MUST 1280x720 as the house floor, 3840x2160 as the target.** The floor costs nothing to meet, and it keeps a future test from degrading every variant ([Help 16391400](https://support.google.com/youtube/answer/16391400), undated, fetched 2026-11-27) (CH-YT-08) |
| Short length under claim risk | Format dive: up to 180 s, the platform limit. Policy dive: up to 60 s when a claim is possible, because a claimed Short over one minute is blocked globally | **Up to 180 s, and claim risk is removed at the source.** CH-YT-23 allows only own audio or Audio Library audio, and Audio Library tracks "won't be claimed" ([Help 3376882](https://support.google.com/youtube/answer/3376882)). That makes the 60-second rule redundant, and it would cut the format for no gain. A reported change from 2026-09-24 that lifts the block appeared only in a search snippet, so it is not relied on |
| How a description proves it is unique | Metadata dive: the first 200 characters differ from every earlier description. Policy dive: strip the lines all descriptions share, then a SequenceMatcher ratio under 0.6 | **The policy dive's measured lint.** It is calibrated on six exemplar series and fails the fleet pair. A 200-character prefix test passes a description that changes one opening word (CH-YT-04) |
| Bottom of the range for live streams and talks | Audit: ratios 0.0 to 0.18. Format dive: median 0.50, n=24 | **Both are true, and neither is a finding.** The audit quoted minimums and the dive measured the median, with Astro's 9.4x keynote inside the cell. n=24 is under the CH-YT-28 bar, so CH-YT-19 is advice (CONSIDER): raw replays stay out of the main uploads list, and an edited talk with a topic title is a deep walkthrough |
| Refresh interval for YouTube API facts | CH-CORE fact-decay default: 90 days for API fields ([core-facts dive](channel-agent-boundary/core-facts-and-channel-inventory.md)) | **30 days for the YouTube Data API.** Its revision history logged six changes that affect these rules between 2026-08-27 and 2026-11-16, about one every 14 days. Help-page limits keep the 180-day class (see Decay) |
| Chapters behind the Advanced tier | [Help 9890437](https://support.google.com/youtube/answer/9890437) puts "Add chapters" in the Advanced group, though the extractor lost the column positions. [Help 9884579](https://support.google.com/youtube/answer/9884579) states no gate. The metadata dive calls "chapters need Advanced" not proven (line 220) | **Not treated as gated. Check the screen.** CH-YT-12 records the channel's own Feature eligibility screen line for each listed feature, so the question settles per channel at zero cost. The same check covers "Related Video on a Short", which the same page lists in the Advanced group (metadata dive line 111) |
| Generic halves of CH-YT-16 and CH-YT-24 | Skeptic: one finding says split CH-YT-16 into a gate and a judged SHOULD; another says cut the generic half of CH-YT-16 and CH-YT-24 | **Cut.** "Show every promise" and "say the next step aloud" are habits a competent model already follows, and neither had a machine check. What stays is the announcement-word gate (CH-YT-16) and the end-screen mechanics with a recorded in-video next step (CH-YT-24). The finding labelled CH-YT-02 describes CH-YT-24; CH-YT-02 has no generic half and is unchanged |

## The ruleset

### Upload record and linter

**CH-YT-01 (MUST).** Drive every upload from a manifest on disk that sets all of these explicitly: title, description, tags, chapters, `defaultLanguage`, `defaultAudioLanguage`, `selfDeclaredMadeForKids`, `containsSyntheticMedia`, paid-placement flag, `privacyStatus`, thumbnail path, audio sources, `duration_s` and `cta_at_s` (the second at which the video states its next step). A Short adds `related_video`; a long-form video that a Short links to adds `hook_covered_by_s`. Run the linter (CH-YT-02 to CH-YT-08, CH-YT-16, CH-YT-20, CH-YT-22 to CH-YT-24) on the manifest before any upload.
- Rationale: Help documents upload defaults only for "videos uploaded through your browser on youtube.com/upload" and is silent on API uploads ([Help 2660027](https://support.google.com/youtube/answer/2660027), undated, fetched 2026-11-27; Open question 3). Omitted API fields default silently (CH-YT-09, CH-YT-10).
- Verify: the manifest exists next to the video file, and every key above is present (`python3 -I -c "import tomllib,sys;m=tomllib.load(open(sys.argv[1],'rb'));miss=[k for k in sys.argv[2:] if k not in m];assert not miss,miss" manifest.toml title description tags chapters default_language default_audio_language made_for_kids synthetic paid_placement privacy thumbnail audio duration_s cta_at_s`; add `related_video` for a Short). The linter exits 0.

**CH-YT-02 (MUST).** Keep the title at 100 characters or fewer and the description at 5,000 UTF-8 bytes or fewer. Neither may contain `<` or `>`.
- Rationale: Help states 5,000 characters, but the API states 5,000 bytes. Bytes is the binding unit for API uploads. 234 of 450 audited descriptions contain non-ASCII text, so the two counts often differ ([Help 57407](https://support.google.com/youtube/answer/57407), undated; [videos resource](https://developers.google.com/youtube/v3/docs/videos), undated; both fetched 2026-11-27).
- Verify: `python3 -I -c "import sys;t=sys.argv[1];assert len(t)<=100 and not set(t)&set('<>')" "$TITLE"`; `wc -c < desc.txt` prints at most 5000 (`wc -c` counts bytes, `wc -m` counts characters); `grep -c '[<>]' desc.txt` prints 0.
- Platform fact: re-check both pages every 180 days.

**CH-YT-03 (SHOULD).** Put the one destination URL in the first three non-empty description lines. It is the page that lets the viewer do what the video shows.
- Rationale: viewers see only the first few lines before "more" ([Help 12948449](https://support.google.com/youtube/answer/12948449), undated, fetched 2026-11-27, which states no fold length). Educator videos do this 76% of the time and company videos 35%. Company videos with the link score 1.15 to 1.16 against their channel median ([audit](product-audit/exemplar-youtube-channels.md), line 101).
- Verify: `grep -v '^[[:space:]]*$' desc.txt | head -3 | grep -c 'https\?://'` prints at least 1.

**CH-YT-04 (MUST).** Give every upload a description of its own:
- no sentence repeats inside it;
- after the lines shared by every description in the series are removed, it scores below 0.6 SequenceMatcher similarity against every earlier upload's description.

A one-video variant (a re-render, an "edition") is not a new upload. Rationale: YouTube judges "minimal variation between videos" and "templated" content per channel ([Help 1311392](https://support.google.com/youtube/answer/1311392), update note 2025-07-15). The spam policy's "automated mass production" example applies without the Partner Program ([Help 2801973](https://support.google.com/youtube/answer/2801973), undated, fetched 2026-11-27). The threshold comes from exemplars and is not a platform number. Verify: `sim.py new.txt old1.txt [old2.txt ...]` (appendix) exits 0. Then split the text on `. ` and pipe through `sort | uniq -d`; it must print nothing.

**CH-YT-05 (SHOULD).** Use at most 3 hashtags, each naming the video's subject, on the description's last line. Leave `tags` empty, or limit it to name variants and common misspellings (`ocx`, `o c x`), at most 500 characters as the API counts them.
- Rationale: only 3 hashtags display, more than 60 voids them all, and unrelated hashtags or "repetitive sentences" are prohibited ([Help 6390658](https://support.google.com/youtube/answer/6390658)). Tags "play a minimal role" ([Help 146402](https://support.google.com/youtube/answer/146402)). Both pages are undated, fetched 2026-11-27. The API counts commas, and counts a tag containing a space as if it were wrapped in quotes ([videos resource](https://developers.google.com/youtube/v3/docs/videos)).
- Verify: `grep -oE '(^|[^[:alnum:]&#])#[[:alpha:]][[:alnum:]_]*' desc.txt | wc -l` prints at most 3. For tags: `python3 -I -c "import json,sys;t=json.loads(sys.argv[1]);assert sum(len(x)+2*(' ' in x) for x in t)+max(len(t)-1,0)<=500" "$TAGS_JSON"`.

**CH-YT-06 (MUST, with a SHOULD house form).** When the description has any timestamp line, it must be a valid chapter list:
- the first stamp is at time zero;
- at least three stamps, strictly ascending;
- every chapter at least 10 seconds long, including the last chapter against the video's duration.

SHOULD (house convention, not a platform rule): write the first stamp as `00:00`. Rationale: an invalid list does not render and raises no error ([Help 9884579](https://support.google.com/youtube/answer/9884579), undated, fetched 2026-11-27). Help asks that the first timestamp "starts with 00:00", and every source writes that form, but whether `0:00` qualifies is not stated ([metadata dive](channel-youtube/yt-upload-metadata-contract.md) line 73), so the written form cannot block. 10 of 114 audited videos that use timestamps fail, 8 of them because the list does not start at zero. Verify: `chap.py desc.txt <duration_s>` (appendix) prints a line starting `valid`, or `none`, and exits 0. `valid warn:first stamp not written 00:00` passes the MUST and fails the SHOULD. The duration comes from `ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4`.

**CH-YT-07 (SHOULD).** Add chapters to every long-form video of 600 seconds or more that has distinct sections. Add none to a Short.
- Rationale: Google Search uses description timestamps for key moments ([Search video docs](https://developers.google.com/search/docs/appearance/video), undated, fetched 2026-11-27). The case is findability only: the measured lift is 1.00 for company videos (n=63).
- Verify: for `duration >= 600`, `chap.py` prints a line starting `valid`. For a Short, it prints `none`.

**CH-YT-08 (MUST).** Upload the thumbnail as JPG or PNG, at most 50 MB:
- long-form: 16:9, at least 1280x720, target 3840x2160;
- Short: 9:16, at least 720x1280, target 2160x3840. Set a Short's thumbnail through the API only after `processingDetails.processingStatus` is `succeeded`.

Rationale: [Help 72431](https://support.google.com/youtube/answer/72431) (undated) gives the formats, ratios and 50 MB cap. A 16:9 image on a vertical video is replaced by an automatic 4:5 one. The API cap rose from 2 MB to 50 MB on 2026-09-14. Shorts thumbnails became settable through the API on 2026-11-03 ([revision history](https://developers.google.com/youtube/v3/revision_history)). 1280x720 is the house floor (see Conflicts). Verify: `file -b --mime-type thumb.png` prints `image/png` or `image/jpeg`; `stat -c %s thumb.png` prints at most 52428800; `python3 -I -c "from PIL import Image;import sys;w,h=Image.open(sys.argv[1]).size;assert (abs(w/h-16/9)<.01 and w>=1280) or (abs(h/w-16/9)<.01 and h>=1280)" thumb.png`; the upload script polls `processingStatus` before it calls `thumbnails.set` (`grep -n processingStatus`). Platform facts, two refresh intervals: the API facts (50 MB cap, Shorts thumbnails through the API) re-check against the revision history every 30 days; the Help 72431 specification (formats, ratios) every 180 days.

### Upload state and channel record

**CH-YT-09 (MUST).** Send `status.privacyStatus: "private"` on every `videos.insert`. Only a human changes a video to public or unlisted, after watching the private upload.
- Rationale: an omitted value defaults to `public`, including from unverified API projects since 2026-11-02 ([revision history](https://developers.google.com/youtube/v3/revision_history)). The API developer policies require the user's "prior specific and express consent" before an automated upload and final control over published data ([developer policies](https://developers.google.com/youtube/terms/developer-policies), undated, III.E.3, III.I.2, III.C.3). CH-CORE owns the general boundary.
- Verify: `jq -e '.status.privacyStatus=="private"' insert-body.json`. The public switch has a named human approver in the upload log.

**CH-YT-10 (MUST).** On every upload, send `selfDeclaredMadeForKids`, `defaultLanguage`, `defaultAudioLanguage`, `containsSyntheticMedia` and `paidProductPlacementDetails.hasPaidProductPlacement`, using values from the channel record or the per-video human decision. Read them back with `videos.list part=status,snippet,paidProductPlacementDetails` after the upload.
- Rationale: on made-for-kids, YouTube requires every video to be set and ties a wrong value to FTC exposure ([Help 9527654](https://support.google.com/youtube/answer/9527654), undated, fetched 2026-11-27). An omitted value is "not overridden" (2026-10-15). An omitted paid-placement flag "no longer defaults to false" (2026-11-16) ([revision history](https://developers.google.com/youtube/v3/revision_history)). A wrong language mistranslates auto-dubs ([Help 15569972](https://support.google.com/youtube/answer/15569972)). Which value is right for the AI and paid labels is decided under CH-CORE; this rule only requires that the values are sent and verified.
- Verify: `jq -e '(.snippet|has("defaultLanguage") and has("defaultAudioLanguage")) and (.status|has("selfDeclaredMadeForKids") and has("containsSyntheticMedia")) and (.paidProductPlacementDetails|has("hasPaidProductPlacement"))' insert-body.json` prints `true` and exits 0; a body missing any of the five paths prints `false` and exits 1 (paths confirmed on the [videos resource](https://developers.google.com/youtube/v3/docs/videos), fetched 2026-11-27). The read-back values equal the manifest (1 quota unit, `videos.list`).
- Platform fact: re-check the revision history every 30 days.

**CH-YT-11 (SHOULD).** Before the first long-form upload, set automatic dubbing to "Publish manually" or off, and review any dub before it goes live. Ship a caption track in `defaultAudioLanguage`, either an uploaded reviewed file or an automatic track someone has read. CH-VID owns caption quality.
- Rationale: auto-dubbing is "enabled by default for eligible creators", and dubs "cannot be edited". YouTube names proper nouns and jargon as weak spots, which in our case means command names, flags and the product name ([Help 15569972](https://support.google.com/youtube/answer/15569972)). Automatic captions can be missing at upload time, or never generated ([Help 6373554](https://support.google.com/youtube/answer/6373554)). Both pages are undated, fetched 2026-11-27.
- Verify: the channel record's dubbing line reads "Publish manually" or "off", with a date. `captions.list part=snippet` (50 units) returns a track whose `language` equals `defaultAudioLanguage`.

**CH-YT-12 (MUST).** Keep a dated channel record and re-verify it every 90 days. It holds:
- the channel id;
- channel description;
- links, with the first one chosen;
- audience setting;
- dubbing setting;
- default language;
- contact email;
- verification tier;
- the Feature eligibility screen.

Check the screen before using any of these features, and copy its line for each into the record as `Enabled`, another status, or `not listed`: custom thumbnails, clickable description links, chapters ("Add chapters"), Test and Compare, and "Related Video on a Short". Help groups custom thumbnails under Intermediate and the other four under Advanced, but the extractor lost the table's column positions, and the chapters gate is not proven ([metadata dive](channel-youtube/yt-upload-metadata-contract.md) lines 111 and 220). The channel's own screen is the authority, not the Help grouping. Rationale: a feature the channel lacks fails silently. A description URL on a channel that does not meet "platform requirements, such as verification or Advanced Features" is plain text ([videos resource](https://developers.google.com/youtube/v3/docs/videos); [Help 9890437](https://support.google.com/youtube/answer/9890437), undated, fetched 2026-11-27). The channel API cannot set links: `channels.update` clears any property it omits, and it updates one part per call ([channels.update](https://developers.google.com/youtube/v3/docs/channels/update)). Verify: the record file has a `checked:` date no older than 90 days and a non-empty value for every item, including each of the five feature lines. The upload script refuses to write a description URL, a custom thumbnail or a Related video unless the matching line reads `Enabled`, and refuses chapters only when the line reads a status other than `Enabled` or `not listed`.

**CH-YT-13 (MUST).** Never fetch youtube.com watch, `/shorts/`, `/@handle` or channel pages by script. Read through the Data API (`videos.list` costs 1 unit) or the channel feed (`https://www.youtube.com/feeds/videos.xml?channel_id=<id>`, 15 newest videos).
- Rationale: the Terms bar access "using any automated means (such as robots, botnets or scrapers)" except for search engines following robots.txt or with written permission ([Terms](https://www.youtube.com/static?template=terms&gl=US&hl=en), dated 2023-12-15).
- Verify: scan for the host anywhere in scripts, not only in literal fetch calls, with an allowlist for the feed and the API: `grep -rnE 'youtube\.com|youtu\.be|youtube-nocookie\.com|yt-dlp|youtube-dl' scripts/ | grep -vE 'youtube\.com/feeds/videos\.xml|googleapis\.com/youtube/'` prints nothing. Fail examples (tested 2026-11-27 on a fixture): `HOST=www.youtube.com` followed by `curl -sL "https://$HOST/@x"` is caught on the assignment line; `yt-dlp URL` is caught. A host assembled from fragments (`"you"+"tube.com"`) is not caught, so a reviewer rejects string-built hosts.

**CH-YT-14 (MUST).** Identify any channel by its `UC...` id, and before citing or linking it, confirm that the feed's `<name>` matches the brand. Never identify a channel from a handle search.
- Rationale: the first naive resolution returned the wrong channel for 9 of 29 handles. Squatters hold plausible handles such as `@ZedIndustries` (a thermoforming channel) and `@flyio` ([audit](product-audit/exemplar-youtube-channels.md), lines 16 and 133).
- Verify: `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=$ID" | grep -m1 -o '<name>[^<]*'` prints the expected brand. CH-CORE's inventory owns where links appear.

### What to publish

**CH-YT-15 (SHOULD).** Make the channel long-form first. Publish a Short only inside an owner-approved pilot (CH-YT-21).
- Rationale: company Shorts score 0.88 pooled (n=54, 9 channels, 5 higher and 4 lower). The cell clears the CH-YT-28 bar of n=25, and what it shows is a null: no consistent direction, on only 9 channels. The rule therefore rests on the absence of a measured lift for a format that costs a separate production stream, not on a measured loss, and stays a SHOULD. Zed publishes no Shorts and reaches a 7,163 median ([format dive](channel-youtube/yt-format-portfolio.md), findings 2 and 4). YouTube's "both formats grow faster" claim dates from 2022-06-15 and came without figures ([TechCrunch](https://techcrunch.com/2022/06/15/youtube-shorts-tops-1-5b-logged-in-users-monthly-users-touted-as-feeder-to-long-form-content)).
- Verify: among the last 10 uploads in the feed, no Short is published outside a pilot record. Detect a Short by `contentDetails.duration` of 180 s or less plus a vertical frame (API), or by the manifest's `format` key. Never use the `/shorts/` probe (CH-YT-13).

**CH-YT-16 (MUST).** A title may use an announcement word (`Introducing`, `launch` and its forms, `1.0`, `now in`, `public preview`) only when the manifest's `milestone_ref` names a release tag made on or before the publish date.
- Rationale: "maliciously misleading titles, thumbnails, descriptions" fall under the spam policy, on a strike path of three strikes in 90 days ([Help 2801973](https://support.google.com/youtube/answer/2801973)). Misleading thumbnails are prohibited ([Help 9229980](https://support.google.com/youtube/answer/9229980)). Both pages are undated, fetched 2026-11-27. Agents optimising titles drift toward "Introducing" because the four top company outliers use it (CH-YT-17). The general "do not overpromise" habit is not restated here; only this gate is new.
- Verify: `grep -inwE 'introducing|launch(e[sd]|ing)?|v?1\.0|now in|public preview' title.txt` (`-w` anchors each match to whole words). On a hit, `git rev-parse -q --verify "refs/tags/$MILESTONE_REF"` succeeds and `git log -1 --format=%cs "$MILESTONE_REF"` is on or before the publish date. Tested 2026-11-27 on a fixture: `Introducing ocx`, `ocx v1.0 is out`, `We launched it` and `Now in public preview` hit; `launchd tricks` and `I know in my heart` do not. `ocx 2.1.0` also hits, which only forces the tag check. Fail example: "Introducing pinned tools" with no `milestone_ref`.

**CH-YT-17 (CONSIDER).** Publish one long-form video for every product milestone: a 1.0, a public preview, or a named feature launch. Its title names the product and the milestone.
- Rationale: the company announcement cell reads 4.94x the channel median, but on n=18 across 8 channels (5 of 8 higher), driven by four outliers ("Introducing Scouts in PostHog" 44.5x, "Zed is 1.0" 44.1x) ([audit](product-audit/exemplar-youtube-channels.md), lines 101 to 103). Under CH-YT-28 a cell under n=25 is "no finding", and no exception is claimed. The rule is advice: a milestone is real news that costs no invented topic, and the outliers are examples of how such a title reads, not evidence of a lift.
- Verify: every release tagged as a milestone in the release notes has an upload within 14 days whose title contains the product name and the milestone string.

**CH-YT-18 (CONSIDER).** Plan each 10 long-form uploads as 7 task tutorials (3 to 10 minutes), up to 2 milestone videos (only real ones; otherwise more tutorials), and 1 chaptered deep walkthrough or edited talk (10 to 20 minutes). Hold a floor of one long-form upload per 30 days. Below that floor, publish milestone videos only.
- Rationale: 74% of company uploads are long-form (156 of 210). The length bands are vendor survey data, not developer-channel measurements:
  - TechSmith, fielded May 2024, about 1,000 respondents: 10 to 19 minutes is the most popular band at 25%, and two thirds of respondents call over 20 minutes too long ([TechSmith 2024](https://www.techsmith.com/learn/wp-content/uploads/2024/12/TechSmith-Video-Viewer-Study-2024-1-1.pdf));
  - Wistia, 2024-04-15: short videos win on engagement rate and long ones on total watch time ([Wistia](https://wistia.com/blog/insights-state-of-video-report)).

  No duration band measured on company channels reached n=25. Zed holds a 7,163 median at about 15 uploads in 297 days.
- Verify: count the format keys of the last 10 manifests against the plan. The days between the two newest `<published>` values in the feed stay under 30.

**CH-YT-19 (CONSIDER).** Keep raw live-stream replays and meeting recordings out of the main uploads list. Put them in a separate playlist with a title that names the topic and the date. Upload an edited talk as a deep walkthrough with a topic title.
- Rationale: live, meeting and talk titles on company channels score a median of 0.50 (n=24, 10 channels), and several score 0.0 to 0.18 ([format dive](channel-youtube/yt-format-portfolio.md), finding 8). n=24 is under the CH-YT-28 bar, so this is "no finding" and the rule is advice.
- Verify: `{ grep -inwE 'live ?stream|weekly|meeting' titles.txt; grep -nwE 'SIG' titles.txt; grep -nE '\.mp4$' titles.txt; }` prints nothing, or each hit's manifest has a non-empty `topic`. `SIG` is matched case-sensitively as a whole word. Tested 2026-11-27 on a fixture: `Kubernetes SIG Autoscaling`, `Rust Foundation Live Stream`, `Livestream Q&A`, `weekly sync` and `clip.mp4` hit; `Design systems`, `signal processing` and `significant` do not. Build `titles.txt` from the feed with `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=$ID" | grep -o '<media:title>[^<]*' | sed 's/<media:title>//'`.

**CH-YT-20 (MUST, when Shorts are published).** Precondition: the channel record's "Related Video on a Short" line reads `Enabled` (CH-YT-12). Help lists that feature in the Advanced group ([metadata dive](channel-youtube/yt-upload-metadata-contract.md) line 111), so a channel without it cannot meet this rule, and it publishes no Short and runs no pilot (CH-YT-21). With the precondition met, a Short must be 180 seconds or shorter, square or vertical, and have its Related video set to a published long-form video on the same topic. Its call to action falls in its last 5 seconds. The linked long video addresses the Short's hook within its first 10 seconds, with no logo intro.
- Rationale: the platform defines a Short as square or vertical and up to 3 minutes, for uploads from 2024-10-15 ([Help 15424877](https://support.google.com/youtube/answer/15424877)). The bridge steps are YouTube's own ([YouTube Blog, 2026-07-14](https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/)).
- Verify: `grep -q '^related_video_on_short: Enabled' channel-record.yml`; `ffprobe -v error -show_entries format=duration -of csv=p=0 short.mp4` prints at most 180; `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 short.mp4` gives width no greater than height; the manifest's `related_video` is a long-form id that `videos.list` returns. Timing, from the two manifests: `python3 -I -c "import tomllib,sys;s=tomllib.load(open(sys.argv[1],'rb'));t=tomllib.load(open(sys.argv[2],'rb'));assert s['cta_at_s']>=s['duration_s']-5,'cta';assert t['hook_covered_by_s']<=10,'hook'" short.toml target.toml` exits 0. Fail example: a 40 s Short with `cta_at_s = 20`, or a target with `hook_covered_by_s = 45` after a logo intro.

**CH-YT-21 (MUST).** Run a Shorts pilot only after the owner approves it in writing, and only with a recorded verdict at its end. Before the first Short, the pilot record holds the owner's approval and the owner's pass bar, as the fields `pass_median_engaged_views` and `pass_actions`. The agent never fills those two fields. A pilot is at least 10 Shorts within 90 days of the first one, each meeting CH-YT-20. At day 90, compare the median engaged views per Short and the actions attributable to the series (subscribers, clicks on a tracked link) against the owner's bar. Never judge it on public views. On a fail, stop the series. Start no replacement series on the same premise without new approval.
- Rationale: public views count from the first frame in every format since 2026-08-24 ([YouTube Blog, 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/)), so they say nothing about interest. Fewer than 10 Shorts cannot separate signal from noise (CH-YT-26). No source gives a pass bar for a small developer-tool channel, so the number is the owner's.
- Verify: the pilot record holds the approval date and approver, non-empty `pass_median_engaged_views` and `pass_actions` dated on or before the first Short's publish date, the start and end dates, the Short ids (at least 10), the measured median engaged views from Studio or the Analytics API, the attributable actions, and a verdict of `pass` or `fail` that follows from comparing the measured values with the two bar fields.

**CH-YT-22 (MUST).** Give every episode of a numbered series a number that no other upload on the channel uses. Give it a one-sentence concept whose verb-object pair differs from every earlier episode, written in the manifest before production. Never upload a re-skin of an episode (another colour treatment, mascot or "edition") as a separate video.
- Rationale: an eligible series needs each video to have "its own storyline, focus, or concept" ([Help 1311392](https://support.google.com/youtube/answer/1311392)). A duplicate number is a series index that indexes nothing.
- Verify: `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=$ID" | grep -o '<title>[^<]*' | python3 -I -c "import re,sys,collections;c=collections.Counter(m for l in sys.stdin for m in re.findall(r'\b(?:Shorts|Ep\.?|Part|#) ?(\d+)',l));d=[k for k,v in c.items() if v>1];assert not d,d"`. The feed holds only the 15 newest videos, so a longer channel uses `playlistItems.list` on the uploads playlist instead. Also compare the manifest's concept line against earlier manifests.

**CH-YT-23 (MUST).** Allowed audio:
- the creator's own voice;
- YouTube Audio Library tracks, crediting the artist in the description with Studio's licence text when the track is Creative Commons;
- no music at all.

The frame shows no third-party video, music, branded footage or notification audio. List every audio and footage source in the manifest. Within 24 hours of upload, check Studio Content with the "Claims" filter. Rationale: "Only music and sound effects from the Audio Library are known to YouTube to be copyright-safe" ([Help 3376882](https://support.google.com/youtube/answer/3376882)). A claimed Short over one minute is blocked globally ([Help 15424877](https://support.google.com/youtube/answer/15424877)). A copyright removal of a live stream brings a strike and a 7-day live restriction ([Help 2814000](https://support.google.com/youtube/answer/2814000)). All three pages are undated, fetched 2026-11-27. Verify: every `audio` entry in the manifest has `source` set to `own`, `audio-library` or `none`; each CC entry's credit string appears in `desc.txt` (`grep -F`); the post-upload claims check is dated in the upload log with the result "none".

**CH-YT-24 (SHOULD).** Plan an end screen only when the video is at least 25 s long and not made-for-kids, with at most 4 elements placed in the last 5 to 20 s. Never let it be the only call to action: the manifest records an in-video next step at `cta_at_s`, inside the last 20 seconds.
- Rationale: end screens do not show on mobile web, and viewers can hide them. Link elements and link cards require Partner Program membership ([Help 6388789](https://support.google.com/youtube/answer/6388789), [Help 6140493](https://support.google.com/youtube/answer/6140493), both undated, fetched 2026-11-27).
- Verify: `python3 -I -c "import tomllib,sys;m=tomllib.load(open(sys.argv[1],'rb'));d=m['duration_s'];e=m.get('end_screen',[]);assert m['cta_at_s']>=d-20,'cta';assert not e or (d>=25 and len(e)<=4 and not m['made_for_kids']),'end screen'" manifest.toml` exits 0. Fail example: a 20 s clip with one end-screen element, or a 600 s video with `cta_at_s = 300` and an end screen as its only next step.

### Measurement and reporting

**CH-YT-25 (MUST).** Write the view definition and the date range beside every view number:
- Shorts views count every start or replay since 2025-03-31;
- views in every format count from the first frame since 2026-08-24;
- public counts include TV co-views since 2026-11-16.

Mark any series that crosses one of these dates as a step. Base any claim about interest on engaged views. Rationale: the three regimes are not comparable ([Help 10059070](https://support.google.com/youtube/answer/10059070); [YouTube Blog, 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/); [revision history](https://developers.google.com/youtube/v3/revision_history), 2026-11-16 entry). Verify: in the report, every sentence with a number next to `views` also names `engaged`, `first frame` or a `since 20..` date. A series spanning 2025-03-31, 2026-08-24 or 2026-11-16 carries the word `step`. Platform fact: re-check the definitions every 30 days.

**CH-YT-26 (MUST).** Report "insufficient data" when:
- CTR rests on fewer than 1,000 registered impressions;
- retention rests on fewer than 100 views, or was read under 2 days after upload.

Rate a CTR or Intro value only against the channel's own 10 latest videos of similar length. Draw no conclusion from swapping a title or thumbnail on one video. Rationale:
- Half of all channels have CTR between 2% and 10%, and YouTube warns that traffic sources confound before-and-after swaps ([Help 7628154](https://support.google.com/youtube/answer/7628154)).
- Retention data takes 1 to 2 days ([Help 9314415](https://support.google.com/youtube/answer/9314415)). Both pages are undated, fetched 2026-11-27.
- The 100-view retention floor is a house floor, like the CTR floor. It borrows the number from the key-moments precondition on the same page (a video of at least 60 seconds with at least 100 views), which gates a feature and says nothing about how reliable retention is. Help 7628154's note that videos under 100 views "can show a wider range" of CTR points the same way but sets no floor either ([measurement dive](channel-youtube/yt-measurement-and-testing.md) lines 49, 54 and 134).
- The 1,000 floor is derived, not a YouTube number: at 1,000 impressions per arm, a 4% CTR must reach 6.8% to be detected (alpha 0.05, power 0.80; command in the [measurement dive](channel-youtube/yt-measurement-and-testing.md), F5).

Verify: the report shows n beside each metric; values below a floor are replaced by "insufficient data"; the comparison set lists 10 video ids; export date minus publish date is at least 2 days; `grep -iE 'before/after|after swapping'` finds no conclusion sentence.

**CH-YT-27 (SHOULD).** Do not run Test and Compare below about 1,000 impressions per variant in a two-week window. When a test does run, first confirm the preconditions:
- the video is long-form or a Live Archive;
- it is not made-for-kids, mature or private;
- the Advanced tier is on;
- every variant is at least 1280x720.

Change packaging only on a "Winner" result. Rationale: the test picks by watch time, not CTR. With no clear winner it shows the first uploaded option, and too few impressions can prevent a winner ([Help 16391400](https://support.google.com/youtube/answer/16391400), [Help 13861714](https://support.google.com/youtube/answer/13861714), undated, fetched 2026-11-27). Verify: the test plan records Studio impressions per variant before the start; the result mapping changes packaging only for `Winner`, and `Performed Same` or `Inconclusive` changes nothing.

**CH-YT-28 (MUST).** Report every format or title comparison with the channel group, n per cell and the channel's own baseline. Refuse a conclusion from any cell under n=25. Never cite educator-channel practice as evidence for a company channel.
- Rationale: 15-video windows and the 29x gap make small cells and cross-group borrowing the commonest overclaim. How-to (n=7) and versus (n=2) cells are noise ([audit](product-audit/exemplar-youtube-channels.md), line 105).
- Verify: every comparison table has `n` and `baseline` columns. A cell under 25 carries "no finding". A recommendation citing an educator channel names it as an example, not as evidence.

## Applied to the fleet

Evidence comes from the grounding audits and from the feed re-fetched for this consolidation (`curl -s 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg'`, 2026-11-27). Shorthand: `posture` is [distribution-posture.md](product-audit/distribution-posture.md), `yt-audit` is [exemplar-youtube-channels.md](product-audit/exemplar-youtube-channels.md), `config` is [config-inventory.md](product-audit/config-inventory.md).

| Rule | Status | Evidence |
|---|---|---|
| CH-YT-02 limits | **Satisfied** | Both titles are listed at posture:228; the longest is 53 characters. Both descriptions are 683 characters and 691 bytes, with no `<` or `>` in title or description; posture:228 quoted only line 1. Command, 2026-11-27: `curl -s 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg' \| python3 -I -c "import sys,re,html;x=sys.stdin.read();[print(len(html.unescape(t)),len(html.unescape(d)),len(html.unescape(d).encode()),bool(set(t+d)&set('<>'))) for t,d in zip(re.findall(r'<media:title>([^<]*)',x),re.findall(r'<media:description>([^<]*)',x))]"` prints `38 683 691 False` and `53 683 691 False` |
| CH-YT-03 link in first three lines | **Satisfied** | Line 2 of both descriptions is `Try it: https://ocx.sh/docs/getting-started/install-ocx/`. The description also links a read-along page, `https://ocx.sh/learn/videos/01-node/`, served from the private `ocx-sh/marketing` repository (`ocx-sh/website/packages/theme/src/nav.json:65`, `:206-219`) |
| CH-YT-05 hashtags | **Satisfied** | `#nodejs #devtools #ci`, 3 tokens (`grep -oE` command in CH-YT-05 prints 3) |
| CH-YT-04 unique description | **Violated** | The two descriptions are byte-identical: `sim.py d0.txt d1.txt` prints `max ratio 1.00` ([policy dive](channel-youtube/yt-content-policy-and-series-risk.md) line 89 measured the same) |
| CH-YT-22 series number and concept | **Violated** | Both titles carry "OCX Shorts 01", and the CH-YT-22 counter prints `{'01': 2}`. The second upload is a re-skin ("Dino Edition") with the same concept ([policy dive](channel-youtube/yt-content-policy-and-series-risk.md) lines 95 to 103) |
| CH-YT-15 long-form first | **Violated** | The channel is 2 Shorts and 0 long-form videos (posture:228, posture:31) |
| CH-YT-20 Related video to long-form | **Violated by construction** | No long-form upload exists to link, so neither Short can bridge to one (posture:228 lists 2 Shorts and nothing else). Whether the Studio field is set, and whether the channel's "Related Video on a Short" line reads `Enabled`, cannot be seen in the feed |
| CH-YT-21 pilot record | **Violated** | A numbered Shorts series is live with no pilot record, approval or end date. The `ocx-sh/marketing` repository is private, and `git grep` over the 17 public clones finds no YouTube planning file (posture:228, `git grep -nIiE 'youtube\.com\|youtu\.be\|5qbGkPhxNpQ'` returns 0) |
| CH-YT-12 channel record | **Violated** | Channel description empty (posture:228); linked from 0 of 17 repositories (posture:270); no record of tier, audience or dubbing exists. The only public email is the personal `contact@michael-herwig.de` on the org profile (posture:219) |
| CH-YT-13 no scripted page reads | **Violated by this research program** | The grounding audit probed `https://www.youtube.com/shorts/<id>` 450 times (yt-audit:18), the format dive repeated it ([format dive](channel-youtube/yt-format-portfolio.md) line 50), and the posture audit fetched the handle page through a consent bypass (posture:228). The results stay on record. Future rounds use an API key or the feed only |
| CH-YT-14 id-based identity | **Satisfied by the corpus, after a fix** | The first resolution was wrong for 9 of 29 handles (yt-audit:16, yt-audit:133). All 30 feed `<name>` values now match ([format dive](channel-youtube/yt-format-portfolio.md) line 49). No Grimoire channel exists, since `@grimoire-rs` and `@grimoirers` return 404 (posture:228), so nothing may link one |
| CH-YT-09, CH-YT-10 upload state | **Unknown, new commitment** | `videos.list part=status` returned HTTP 403 without a key ([core-platform-labels dive](channel-agent-boundary/core-platform-labels.md) lines 90 to 94). Made-for-kids, language, synthetic and paid flags on the two Shorts are unobservable until the owner provides OAuth or a key |
| CH-YT-01 manifest and linter | **Unknown for the two Shorts; absent from the public fleet** | config:467 counts 0 fleet configuration files mentioning YouTube (sweep command at config:462), and config:582 restates it, so no manifest, linter or upload script exists in the public fleet. Whether the private `ocx-sh/marketing` repository holds one is unobservable (posture:228). The frame proposes a `youtube-video` skill (`product-frame.md:74`); the linter is the first thing that skill must ship |
| CH-YT-25, CH-YT-26 reporting | **Applies now** | No report exists yet (config:467: no YouTube file in the fleet). Any statement about the two Shorts (7 and 12 views, posture:228) must read "insufficient data" under CH-YT-26 |
| CH-YT-17 milestone video | **Not applicable yet** | CONSIDER only. 9 of 9 released repositories announce only through GitHub Releases, and the channel carries no release video (posture:134) |
| CH-YT-06, 07, 08, 11, 16, 18, 19, 23, 24, 27, 28 | **Not applicable yet** | Each applies from the first long-form upload, report or test. None exists: the channel holds 2 Shorts and nothing else (posture:228), and no fleet configuration file mentions YouTube, so there is no manifest, thumbnail spec, audio list or test plan to read (config:467) |

Cross-territory, one line each: the inbound link to `@ocx-sh` from READMEs and sites is CH-CORE's inventory check (posture:289). The contact-email role address is a marketing or brand decision.

## AI-agent failure modes

Ranked by how often each would bite an agent preparing uploads for this channel, grouped by mechanism.

1. **Stale platform memory** (bites on almost every upload; the facts moved inside the last 3 months). The agent:
   - expects an omitted `privacyStatus` to stay private, when it has been public since 2026-11-02;
   - believes Shorts thumbnails cannot be set through the API (they can since 2026-11-03), or quotes the 2 MB cap (50 MB since 2026-09-14);
   - quotes "a view needs 30 seconds", or misses the 2026-08-24 first-frame change;
   - quotes the old 1,600-unit upload cost.

   Caught by CH-YT-08, 09 and 25, plus the 30-day refresh in Decay.
2. **Template drift across a series** (bites on every episode after the first). The agent copies the last description and changes one line, re-uploads a variant under the same number, or titles every video "OCX Shorts NN". The fleet already shows all three. Caught by CH-YT-04 and 22.
3. **Assumed defaults** (bites on every API upload). The agent relies on Studio upload defaults, which Help documents only for browser uploads, omits made-for-kids and assumes `false`, leaves the language unset so auto-dubs mistranslate, or forgets that dubbing is on by default. Caught by CH-YT-01, 10 and 11.
4. **Verdicts from tiny samples, or borrowed from educators** (bites on every performance question). The agent declares a winning thumbnail from a 20-view difference, calls a 3% CTR bad, recommends daily uploads and hook formulas because educators use them, or treats a before-and-after swap as a test. Caught by CH-YT-26, 27 and 28.
5. **Search-engine habits and announcement drift** (bites when an agent "optimises"). The agent pads tags and hashtags, or writes "Introducing" on an ordinary demo with no release behind it. Caught by CH-YT-05 and 16.
6. **Format failures that raise no error** (bites on long-form). Chapter lists start at the first topic instead of zero, or have two stamps. Descriptions are counted in characters and exceed 5,000 bytes. A URL is pasted, or a Short's Related video is set, without checking the channel's Feature eligibility screen. An end screen is planned for a 20-second clip. Caught by CH-YT-02, 06, 12, 20 and 24.
7. **Access and identity shortcuts** (bites whenever an agent researches other channels). The agent curls watch pages, or resolves a handle and lands on a squatter. The research program did both. Caught by CH-YT-13 and 14.
8. **Rights** (rare, high cost). The agent adds a "royalty-free" track from another site, or records a screen with a browser tab playing media. Caught by CH-YT-23.

## What an agent must ask a human

- The channel's made-for-kids value, once (expected "No"). It goes into the channel record.
- The AI-use disclosure and the paid-promotion value for each video with synthetic voice, generated footage, a likeness, a sponsor or a material connection. CH-CORE owns the test. The agent never infers the answer.
- Each switch from private to public or unlisted. Any change of channel name or handle: each allows at most two changes per 14 days, and a name change removes a verification badge ([Help 2657964](https://support.google.com/youtube/answer/2657964)).
- Whether auto-dubbing is off or set to manual, and whether the product and command names may be dubbed.
- Phone or ID verification to reach the Intermediate and Advanced tiers. Only the account holder can do it.
- The channel description, the first link, the banner, and whether the contact email stays the personal address or becomes a role address.
- Whether to run a Shorts pilot at all, and its pass bar, written into the pilot record's `pass_median_engaged_views` and `pass_actions` fields before the first Short. No source supplies a number, so the agent proposes none. Also whether to stop a series that fails.
- Whether to keep, set to private, or delete the "Dino Edition" duplicate Short, and whether to rename the "OCX Shorts NN" series.
- Who appears on camera, and any use of a real person's voice or likeness.
- Any music not from the Audio Library, any dispute or appeal against a claim, warning or strike, and any Partner Program application.
- Whether to create a YouTube Data API project and OAuth client for uploads and read-back. Without one, CH-YT-09, 10 and 15 are verified by hand in Studio.

## Decay

| Rules | Moving fact | Source and date | Refresh |
|---|---|---|---|
| 08 (API part), 09, 10, 25 | API behaviour: privacy default (2026-11-02), Shorts thumbnails through the API (2026-11-03), 50 MB cap (2026-09-14), made-for-kids omission (2026-10-15), paid placement and co-views (2026-11-16) | [API revision history](https://developers.google.com/youtube/v3/revision_history) | **30 days**. Read the newest entries since the last check. Six relevant entries landed between 2026-08-27 and 2026-11-16 |
| 25, 21 | View, engaged-view and co-view definitions | [YouTube Blog, 2026-08-19](https://blog.youtube/inside-youtube/engaged-views-youtube-explained/); [Help 2991785](https://support.google.com/youtube/answer/2991785) ("Beginning November 2026") | 30 days |
| 02, 05, 06, 08 (Help part), 20, 24 | Help-page limits: title, description, hashtags, chapters, thumbnail formats and ratios, Shorts length, end screens and cards | Help 57407, 6390658, 9884579, 72431, 15424877, 6388789, 6140493, all undated (footer 2026), fetched 2026-11-27 | 180 days, the CH-CORE hard-limit class. Undated pages are compared by content, not by date. CH-YT-08's two facts refresh on two cycles: its API facts in the 30-day row, its Help 72431 spec here |
| 04, 16, 22, 23 | Spam, thumbnail, inauthentic-content and Content ID policy, including the unverified 2026-09-24 change for claimed 1 to 3 minute Shorts | Help 2801973, 9229980, 1311392 (note 2025-07-15), 15424877, 3376882 | 90 days, the CH-CORE policy class |
| 11, 12, 20, 27 | Auto-dubbing default, the Feature eligibility list (including "Related Video on a Short"), Test and Compare scope | Help 15569972, 9890437, 16391400, undated | 90 days. The channel record re-reads the live Feature eligibility screen on the same cycle |
| 13 | Terms automated-access clause | [Terms](https://www.youtube.com/static?template=terms&gl=US&hl=en), 2023-12-15 | 180 days |
| 15, 17, 18, 19, 28 | Exemplar medians and ratios (29x, 4.94x, 0.88, 0.50) | 30 feeds, 2026-11-27 snapshot | 180 days. Re-run the audit commands on the same 30 ids. These numbers never become platform facts. If a re-run lifts the milestone or live cell to n of 25 or more, CH-YT-17 or CH-YT-19 may be reconsidered for SHOULD |
| 18 | Vendor length surveys | TechSmith May 2024; Wistia 2024-04-15 | 365 days. They stay CONSIDER |

## Open questions

Another round, as questions:

1. **Does video length predict views on company developer-tool channels?** Answering it needs a Data API key and `videos.list contentDetails.duration` for the 210 company videos. The chapter-timestamp proxy reached no cell with n of 25 or more, so CH-YT-18 stays at CONSIDER.
2. **Does a Short with a Related video send measurable viewers to its long-form target on a small developer-tool channel?** Only Studio traffic-source data from a running pilot can answer it. This is the evidence CH-YT-15 lacks, and it decides whether the Shorts default should ever change.
3. **Does the 5,000-character Help limit or the 5,000-byte API limit bind a Studio upload, and do Studio upload defaults apply to API uploads?** One private test upload answers both (1 insert unit).
4. **Are "Add chapters" and "Related Video on a Short" gated behind the Advanced tier, and did YouTube lift the global block on claimed 1 to 3 minute Shorts from 2026-09-24?** Re-read the live Feature eligibility screen and the English Help 15424877 page. This is a short fetch, not a full dive.
5. **Can thumbnail and title packaging get any check beyond CH-YT-16?** The map deferred it (M-YT-4) as not checkable. Reopen it only if a measurable proxy appears, such as legibility at small sizes, which CH-VID may already own.

Owner decisions are listed under "What an agent must ask a human". The two load-bearing ones are the Shorts pilot (approval and pass bar) and the fate of the duplicate "Dino Edition" upload.

## Revision log

Revision of 2026-11-27, after an adversarial check. No rule was retired or renumbered.

- CH-YT-20: added the precondition that the channel record's "Related Video on a Short" line reads `Enabled`, since Help 9890437 lists it in the Advanced group (metadata dive line 111); without it the MUST could fail silently.
- CH-YT-12: reworded from "gated features" to "check the screen"; added "Related Video on a Short" to the recorded lines; chapters are no longer treated as gated, because the gate is not proven (metadata dive line 220). Conflicts row on chapters updated to match.
- CH-YT-06: split into a MUST (first stamp at zero, three ascending stamps, 10 s minimum) and a SHOULD house form (write `00:00`), because whether `0:00` qualifies is not stated (metadata dive line 73). `chap.py` now fails only a non-zero first stamp and warns on `0:00`; re-tested on fixtures. CH-YT-07 verify, Verdict 6, failure mode 6 and the first-stamp Conflicts row updated to match.
- Verdict 5, CH-YT-01, failure mode 3: "Studio defaults apply only to browser uploads" restated as Help's actual scope, with API behaviour unknown (Open question 3).
- CH-YT-17: demoted SHOULD to CONSIDER; its n=18 cell is "no finding" under CH-YT-28, and no exception is claimed. Verdict 2 rewritten to match.
- CH-YT-19: demoted SHOULD to CONSIDER for the same reason (n=24 under the CH-YT-28 bar). Not raised by the check; applied for consistency. Conflicts row on live streams updated.
- CH-YT-15: kept SHOULD, with the justification stated: n=54 clears the CH-YT-28 bar, its finding is a null on 9 channels, and the rule rests on the absence of a lift. Verdict 3 updated.
- CH-YT-21: removed the invented pass bar (1,000 median engaged views, 1 action); the MUST now covers written approval, owner-set bar fields `pass_median_engaged_views` and `pass_actions` recorded before the first Short, and a recorded verdict against them. "What an agent must ask" updated.
- CH-YT-26: labelled the 100-view retention floor a house floor; Help 9314415's 100 views is a key-moments precondition, not a retention-reliability floor.
- CH-YT-10: verify `jq` extended from 2 to all 5 paths (`snippet.defaultLanguage`, `snippet.defaultAudioLanguage`, `status.selfDeclaredMadeForKids`, `status.containsSyntheticMedia`, `paidProductPlacementDetails.hasPaidProductPlacement`); paths confirmed on the videos resource, fetched 2026-11-27; tested on a pass and a fail fixture.
- CH-YT-16: cut the generic "every promise is shown" half (no machine check, common practice); the rule is now only the announcement-word gate, with a whole-word `grep -inwE` (tested: `launchd` and `know in` no longer hit) and a `milestone_ref` tag check.
- CH-YT-19: verify regex replaced with a runnable command; `SIG` is matched case-sensitively as a whole word (tested: `design`, `signal`, `significant` no longer hit).
- CH-YT-13: verify now scans for the host anywhere in scripts, including variable assignments and `yt-dlp`, with an allowlist for `feeds/videos.xml` and `googleapis.com/youtube/`; tested on a fixture; the string-assembled-host gap is stated.
- CH-YT-20, CH-YT-24: verify heuristics replaced with assertions on manifest fields `cta_at_s`, `duration_s` and `hook_covered_by_s`, with fail examples; tested on fixtures. CH-YT-01's key list gained `duration_s`, `cta_at_s`, `related_video` and `hook_covered_by_s`, and its linter list gained CH-YT-16 and CH-YT-24.
- CH-YT-24: cut the generic "say the next step aloud" exhortation; the rule is now the end-screen mechanics plus a recorded in-video next step. Conflicts row added for the split-versus-cut instruction.
- CH-YT-08: the two refresh intervals are named in the rule and split in the Decay table (API facts 30 days, Help 72431 spec 180 days). CH-YT-20 added to the 90-day feature-list row.
- Applied to the fleet: CH-YT-02 row now cites posture:228 and a runnable feed command with its output; CH-YT-01, 17 and the bulk row now cite config:467 and posture:228; rules with nothing to check yet are marked "Not applicable yet" instead of "New commitment"; CH-YT-25 and 26 marked "Applies now".

## Sub-artifacts

- [yt-upload-metadata-contract.md](channel-youtube/yt-upload-metadata-contract.md): every upload field, limit and gate. It measures chapter validity on 450 videos and drafts the ocx channel-defaults checklist.
- [yt-format-portfolio.md](channel-youtube/yt-format-portfolio.md): per-format cells on company channels, the duration proxy, the Shorts bridge guidance and the default mix.
- [yt-content-policy-and-series-risk.md](channel-youtube/yt-content-policy-and-series-risk.md): clickbait, thumbnail, inauthentic-content and Content ID policy, with the series-similarity measurement.
- [yt-measurement-and-testing.md](channel-youtube/yt-measurement-and-testing.md): view-definition regimes, CTR and retention meaning, Test and Compare, detectable-effect computation and the Shorts test.

## Key sources

- https://developers.google.com/youtube/v3/revision_history: dated API changes behind CH-YT-08, 09, 10 and 25.
- https://developers.google.com/youtube/v3/docs/videos: byte limit, tags counting, language, made-for-kids and synthetic fields.
- https://developers.google.com/youtube/terms/developer-policies: express prior consent for automated writes.
- https://support.google.com/youtube/answer/9884579: chapter rules.
- https://support.google.com/youtube/answer/72431: thumbnail specification.
- https://support.google.com/youtube/answer/9890437: feature tiers.
- https://support.google.com/youtube/answer/15569972: automatic dubbing defaults.
- https://support.google.com/youtube/answer/1311392: inauthentic and templated content (note 2025-07-15).
- https://support.google.com/youtube/answer/2801973: spam, misleading metadata, mass production.
- https://support.google.com/youtube/answer/3376882: Audio Library and Content ID.
- https://support.google.com/youtube/answer/16391400: Test and Compare.
- https://support.google.com/youtube/answer/7628154: impressions CTR range and caveats.
- https://blog.youtube/inside-youtube/engaged-views-youtube-explained/: first-frame views from 2026-08-24 (post 2026-08-19).
- https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/: Shorts-to-long-form bridge (2026-07-14).
- https://www.youtube.com/static?template=terms&gl=US&hl=en: automated-access clause (2023-12-15).

## Appendix: verification snippets

Tested 2026-11-27 on fixtures and on the two fleet descriptions. `chap.py` was revised the same day (see Revision log) and re-tested: `00:00/0:45/2:10` gives `valid`; `0:00/0:45/2:10` gives `valid warn:first stamp not written 00:00 (house form)` and exit 0; `0:05/...` gives `invalid:first stamp not at zero`; a 5-second gap gives `invalid:gap...`; a 135 s duration with the last stamp at 130 s gives `invalid:last chapter under 10 s`; a description with no stamps gives `none`. The fleet pair gives `max ratio 1.00` and exit 1 from `sim.py`.

`chap.py` (CH-YT-06, CH-YT-07):

```python
import re,sys
# usage: chap.py desc.txt [duration_s]; prints valid | valid warn:<reason> | invalid:<reason> | none
st=[]
for l in open(sys.argv[1],encoding='utf-8'):
    m=re.match(r'\s*[\(\[]?((\d{1,2}):)?(\d{1,2}):(\d{2})\b',l)
    if m: st.append((l.strip(), int(m.group(2) or 0)*3600+int(m.group(3))*60+int(m.group(4))))
if not st: print('none'); sys.exit(0)
d=int(sys.argv[2]) if len(sys.argv)>2 else None
r=('first stamp not at zero' if st[0][1]!=0 else
   'fewer than 3' if len(st)<3 else
   'gap under 10 s or not ascending' if any(b[1]-a[1]<10 for a,b in zip(st,st[1:])) else
   'last chapter under 10 s' if d is not None and d-st[-1][1]<10 else '')
# the 00:00 written form is a house SHOULD: Help never says whether 0:00 qualifies
w='' if re.match(r'[\(\[]?00:00\b',st[0][0]) else ' warn:first stamp not written 00:00 (house form)'
print('invalid:'+r if r else 'valid'+w); sys.exit(1 if r else 0)
```

`sim.py` (CH-YT-04). Shared lines are stripped only when there are at least two earlier descriptions, because with one earlier description every shared line would be stripped:

```python
import sys,difflib
# usage: sim.py new.txt old1.txt [old2.txt ...]; strips lines shared by ALL files, fails if any ratio >= 0.6
T=[open(p,encoding='utf-8').read().splitlines() for p in sys.argv[1:]]
shared=set(T[0]).intersection(*T[1:]) if len(T)>2 else set()
K=['\n'.join(l for l in t if l.strip() and l not in shared) for t in T]
w=max(difflib.SequenceMatcher(None,K[0],k).ratio() for k in K[1:])
print(f'max ratio {w:.2f}'); sys.exit(1 if w>=0.6 else 0)
```
