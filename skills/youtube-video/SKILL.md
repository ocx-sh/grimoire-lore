---
name: youtube-video
description: YouTube upload standards for a software product's channel, covering the upload manifest and its linter, title and description limits, the one destination link, hashtags, chapter timestamps, thumbnail format, private-first uploads, made-for-kids, language, altered-or-synthetic and paid-placement fields, automatic dubbing, the channel record, Shorts pilots, series numbering, audio licensing, end screens, and reporting views by their definitions. Use when preparing a YouTube upload or Short, writing a video title, description or chapters, setting up or auditing a channel, uploading through the YouTube Data API, or reporting YouTube numbers. Not for recording terminal footage, which is terminal-demo, and not for thumbnail or hook craft, which no check here can measure.
license: Apache-2.0
metadata:
  summary: YouTube upload manifest and linter, metadata limits, private-first uploads, labels, Shorts pilot gate and view reporting, with a dated platform-facts registry
  keywords: youtube,video,upload,shorts,thumbnail,chapters,description,hashtags,made-for-kids,synthetic-media,paid-placement,dubbing,end-screen,audio-library,manifest,youtube-data-api,views,ctr
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# youtube-video

An agent prepares a YouTube upload. A named human uploads it, reads it back and
makes it public. This skill is the package the agent hands over: a manifest, a
description, a thumbnail, an insert body and a list of open questions.

Contents: [Boundary](#boundary) · [Facts](#facts-and-cadence) ·
[Procedure](#procedure) · [Pinned defaults](#pinned-defaults) ·
[Manifest and metadata](#manifest-and-metadata-ch-yt-01-to-08) ·
[Upload state and labels](#upload-state-and-labels-ch-yt-09-to-11) ·
[Channel record and read-only access](#channel-record-and-read-only-access-ch-yt-12-to-14) ·
[What to publish](#what-to-publish-and-the-shorts-pilot-ch-yt-15-to-24) ·
[Measurement](#measurement-and-reporting-ch-yt-25-to-28) ·
[Ask a human](#what-an-agent-must-ask-a-human) · [Failures](#what-agents-get-wrong-here)

## Stop condition

Stop when these files exist under `youtube/<slug>/`: a manifest that lints with
exit 0, `desc.txt`, the thumbnail, `insert-body.json` that lints, and a list of
open asks. An agent with no image tool writes `thumb-spec.md` (size, ratio, text,
subject) and hands over a placeholder or human-made image as `thumb.png`; the
linter checks only that image file for type, size and ratio, never the spec, so
list the real image under `open_asks`. Upload, schedule and publish nothing. A video is never public because an
agent said so.

## Boundary

Read the companion skill `channel-publishing` at `../channel-publishing/SKILL.md`
first. If that file is missing, run `grim add ghcr.io/ocx-sh/lore/channel-publishing:0`.
These five rules from it bind every step here:

- **CH-CORE-01.** Never call a write endpoint (`videos.insert`, `videos.update`,
  `thumbnails.set`, `captions.insert`) and never drive Studio. No YouTube
  automation exists to commission (CH-CORE-02). The package header keys are in the
  manifest's `[package]` table, and the agent leaves `approved_by` and
  `approved_at` empty.
- **CH-CORE-06.** Write `containsSyntheticMedia` and `hasPaidProductPlacement` as an
  explicit `true` or `false`. An omitted paid-placement field means undeclared [YT-F02].
- **CH-CORE-07.** Set `ai_use` from a registry row: a trigger row (YT-F03 to YT-F06)
  gives `yes`, an exemption row (YT-F07 to YT-F09) gives `no`, no AI gives `no-ai`.
  A borderline case goes to `open_asks`. A human confirms in the upload step.
- **CH-CORE-08.** Put a sponsor or AI disclosure in the first description line, and
  say it aloud and show it on screen before or at the first sponsored mention. A
  Short carries burned-in text in its first seconds. A toggle or a hashtag alone does
  not count.
- **CH-CORE-11.** Take every platform limit, field and clause from a `YT-F` row and
  cite it as `[YT-F11]`. No row, no number. This file never repeats a limit.

A title, description or on-screen text that states a number or a claim follows
`marketing-quality-reference` (MKT-CLAIM) when it is installed. Otherwise each number carries a
`source:` line in the draft package.

## Facts and cadence

`references/facts.md` holds every dated fact, with its URL, source date and fetch
date. Every row carries `refresh_days`: 180 for hard limits, 90 for policy, label
triggers and feature screens, and 30 for API behaviour, view definitions and
prices. The YouTube Data API changes often, so its rows run on 30 days. The check fails on the first overdue row. Re-fetch it,
and never extend the date.

The `YT` line must point at the real skill directory, which exists only after
`grim add`. Run `ls "$YT/checks"` after setting it.

```sh
YT=.claude/skills/youtube-video   # "$CLAUDE_CONFIG_DIR/skills/youtube-video" when installed globally
python3 -I "$YT/../channel-publishing/checks/facts_check.py" "$YT/references/facts.md"
```

## Procedure

Run the steps in order. Each names its input, its check and what done means.

1. **Check the facts.** Input: `references/facts.md`. Check: the command above.
   Done: it exits 0. An overdue row is re-fetched first, or listed in `open_asks`.
2. **Find the channel record.** Input: `youtube/channel-record.yml`. Check:
   `python3 -I "$YT/checks/yt_manifest_check.py" --channel-record youtube/channel-record.yml`.
   Done: exit 0 (CH-YT-12). With no record, ask the human the questions in
   [Ask a human](#what-an-agent-must-ask-a-human) and stop. Never fill one in. After asking, the agent may still draft title,
   description and chapters as unlinted text in the hand-over, marked "not linted,
   no channel record".
3. **Choose the format.** Input: the topic and the pilot record. Default: a
   long-form task tutorial (CH-YT-15, CH-YT-18). A Short needs an approved pilot
   record that passes `--pilot` (CH-YT-21). An announcement word in a title needs a
   release tag (CH-YT-16). Done: `format` is chosen and the reason is in the draft.
4. **Write the manifest and the description.** Input: `references/manifest.md`.
   Write every key, in the layout shown there. Put the destination link in the first
   three non-empty lines (CH-YT-03). Done: the file set exists.
5. **Fill the labels from rows.** Input: the channel record and `references/facts.md`.
   Set `made_for_kids` from the record, `synthetic` and `ai_use` from the YT-F03 to
   YT-F09 rows, and `paid_placement` from the human. Done: no label key is empty
   and every borderline case sits in `open_asks`.
6. **Lint.** Run the linter without the earlier list first. It always runs, so the
   first upload is linted too:

   ```sh
   UP=youtube/pin-a-tool   # this upload's directory
   python3 -I "$YT/checks/yt_manifest_check.py" "$UP/manifest.toml" \
     --channel-record youtube/channel-record.yml
   ```

   Then run the similarity pass against earlier descriptions. List them through git,
   so a missing file reads as a failure and not a pass. With no earlier description
   tracked, this pass has nothing to compare and the first command stands alone:

   ```sh
   git ls-files -z -- ':(glob)youtube/*/desc.txt' ":(exclude,glob)$UP/**" \
     | xargs -0 -r python3 -I "$YT/checks/yt_manifest_check.py" "$UP/manifest.toml" \
         --channel-record youtube/channel-record.yml --earlier
   ```

   Add `--earlier-manifest` with each earlier manifest of a numbered series, before
   `--earlier`, on either command. Add `--target` with the linked long-form manifest
   for a Short, and `--repo` with the repository that holds the release tag. Done:
   the first command exits 0, and the second exits 0 or has nothing to list. Fix each
   MUST finding. A SHOULD finding is fixed or recorded under `[reasons]` in the
   manifest. `--strict` fails on any warning.
7. **Write the insert body.** Input: the manifest. Write `insert-body.json` with
   `privacyStatus` set to `private` and all five explicit fields (shape in
   `references/manifest.md`). Check: this command. Done: exit 0.

   ```sh
   python3 -I "$YT/checks/yt_manifest_check.py" "$UP/manifest.toml" \
     --channel-record youtube/channel-record.yml --insert-body "$UP/insert-body.json"
   ```
8. **Hand over.** Output: the file paths and `open_asks`. Tell the human to: upload
   as private, set the thumbnail only after processing finishes, read the values back,
   check Studio Claims within 24 hours, watch the private upload, then make it
   public and log their name (CH-YT-09, 10, 23).
9. **Check the read-back.** Input: the human's `readback.json`. Check: this command. Done: exit 0. A difference goes back to the human as
   a finding.

   ```sh
   python3 -I "$YT/checks/yt_manifest_check.py" "$UP/manifest.toml" \
     --channel-record youtube/channel-record.yml --readback "$UP/readback.json"
   ```

## Pinned defaults

These are house decisions an adopter overrides once, in their own repository.

| Decision | Default |
|---|---|
| Manifest, channel record, pilot record and upload log formats | The layout in `references/manifest.md` |
| Description similarity limit between uploads | Below 0.6 SequenceMatcher ratio, after shared lines are removed |
| Thumbnail floor | 1280 by 720, target the largest size YT-F19 states |
| First chapter stamp written | `00:00` |
| Channel record age limit | 90 days |
| Sample floors | 1,000 impressions, 100 views, 25 per comparison cell |
| Shorts | Off. Only an owner-approved pilot, at least 10 Shorts within 90 days |
| Upload privacy | `private`. A human makes it public |

## Manifest and metadata (CH-YT-01 to 08)

`yt_manifest_check.py` checks every row of this block unless the cell names another
command. Severity is MUST unless shown. A SHOULD finding needs a fix or a recorded
reason.

| ID | Rule | Why | Verification | Severity |
|---|---|---|---|---|
| CH-YT-01 | Drive every upload from a manifest on disk that sets every key in `references/manifest.md` explicitly, including `duration_s` and `cta_at_s`. A Short adds `related_video`. A long-form video that a Short links to adds `hook_covered_by_s`. Lint it before any upload | Help documents upload defaults only for browser uploads and is silent on the API. Omitted API fields default silently [YT-F27, YT-F28, YT-F02] | The linter exits 0. It names each missing key | MUST |
| CH-YT-02 | Keep the title within [YT-F11] and the description within [YT-F13], counted in UTF-8 bytes. Put neither `<` nor `>` in either | Help counts characters [YT-F12] and the API counts bytes [YT-F13]. Bytes bind, and non-ASCII text makes the two differ. 234 of 450 audited descriptions held it (2026-11-27) | The linter. `wc -c < desc.txt` counts bytes (`wc -m` counts characters) | MUST |
| CH-YT-03 | Put the one destination URL in the first three non-empty description lines. It is the page where the viewer can do what the video shows | Viewers see only the first lines before "more". Company videos with the link scored 1.15 to 1.16 against their channel median (2026-11-27) | The linter. By hand: block CH-YT-03 | SHOULD |
| CH-YT-04 | Give every upload a description of its own: no sentence repeats inside it, and after the lines shared by the series are removed it scores below 0.6 against every earlier description. A re-render or "edition" of one video is not a new upload | YouTube judges minimal variation and templated content per channel [YT-F46], and mass production is spam [YT-F43]. The 0.6 limit is a house threshold from exemplars, not a platform number | The linter with `--earlier`. It fails the first repeat or ratio of 0.6 or more | MUST |
| CH-YT-05 | Use at most the hashtags that display [YT-F15], each naming the subject, on the last line. Never exceed [YT-F16]. Leave `tags` empty or limit it to name variants and common misspellings within [YT-F14] | Over-tagging and unrelated hashtags are prohibited, and tags play a minimal role. The API counts commas and quotes a tag that holds a space | The linter | SHOULD |
| CH-YT-06 | When the description holds any timestamp line, make it a valid chapter list per [YT-F17] and [YT-F18], measured against `duration_s`. SHOULD, as a house form: write the first stamp as `00:00` | An invalid list does not render and raises no error. 10 of 114 audited videos failed, 8 for a first stamp that was not zero. Whether `0:00` qualifies is not stated, so it warns and never blocks | The linter. It prints `invalid` for the MUST and a warning for `0:00` | MUST |
| CH-YT-07 | Add chapters to every long-form video of 600 seconds or more that has distinct sections. Add none to a Short | Search can use description timestamps for key moments. The case is findability only, with a measured lift of 1.00 for company videos (n=63) | The linter | SHOULD |
| CH-YT-08 | Upload the thumbnail as JPG or PNG within [YT-F20] and [YT-F30]. Long-form: 16:9, at least 1280 by 720, target per [YT-F19]. Short: 9:16, at least 720 by 1280. Poll `processingStatus` for `succeeded` before `thumbnails.set` on a Short [YT-F29] | A 16:9 image on a vertical video is replaced by an automatic one [YT-F21]. One variant under 1280 by 720 downgrades every Test and Compare variant [YT-F39]. The floor costs nothing | The linter checks type, size and ratio. `grep -n -e processingStatus -- "$UPLOAD"` finds the poll in the upload script | MUST |

Block CH-YT-03, the count printed must be at least 1; 0 is a missing link:

```sh
grep -v -e '^[[:space:]]*$' desc.txt | head -3 | grep -c -e 'https\?://'
```

The count must be at least 1.

## Upload state and labels (CH-YT-09 to 11)

| ID | Rule | Why | Verification | Severity |
|---|---|---|---|---|
| CH-YT-09 | Send `status.privacyStatus: "private"` on every `videos.insert`. Only a human changes a video to public or unlisted, after watching the private upload | An omitted value defaults to public, even from an unverified project [YT-F27]. The developer policies need prior express consent for each automated action [YT-F34] | The linter with `--insert-body`. `grep -E -e '^public_approved_by: .+' -- upload-log.txt` finds the named approver | MUST |
| CH-YT-10 | Send `selfDeclaredMadeForKids`, `defaultLanguage`, `defaultAudioLanguage`, `containsSyntheticMedia` and `hasPaidProductPlacement` on every upload, from the channel record or the human's decision. Read all five back after the upload | Made-for-kids must be set on every video and a wrong value ties to FTC exposure [YT-F37]. An omitted value is not overridden [YT-F28]. A wrong language mistranslates dubs [YT-F36] | The linter with `--insert-body` before and `--readback` after. A body missing any of the five paths exits 1 | MUST |
| CH-YT-11 | Before the first long-form upload set automatic dubbing to "Publish manually" or off, and review any dub before it goes live. Ship a caption track in `defaultAudioLanguage`: an uploaded reviewed file, or an automatic track someone has read. CH-VID owns caption quality | Dubbing is on by default for eligible creators [YT-F36]. Dubs can mistranslate proper nouns and jargon, which here means command names, flags and the product name. Automatic captions can be missing at upload time | The linter warns when the record's `dubbing` line does not start with `Publish manually` or `off`. The human lists captions with `captions.list part=snippet` and sees a track in `defaultAudioLanguage` | SHOULD |

## Channel record and read-only access (CH-YT-12 to 14)

| ID | Rule | Why | Verification | Severity |
|---|---|---|---|---|
| CH-YT-12 | Keep the dated channel record in `references/manifest.md` and re-verify it every 90 days. Copy the channel's own Feature eligibility line for custom thumbnails, clickable links, chapters, Test and Compare and "Related Video on a Short" as `Enabled`, another status, or `not listed`. Never write a description URL, a custom thumbnail or a Related video unless its line reads `Enabled`. Refuse chapters only when the line shows a status other than `Enabled` or `not listed` | A feature the channel lacks fails silently. A URL on a channel without the feature stays plain text. The Help grouping is not proof, because the channel's screen is the authority [YT-F38]. `channels.update` overwrites every property in the part it writes [YT-F51], so no agent edits links through the API | `yt_manifest_check.py --channel-record youtube/channel-record.yml` exits 0. A manifest run applies the three refusals | MUST |
| CH-YT-13 | Never fetch youtube.com watch, `/shorts/`, `/@handle` or channel pages by script. Read through the Data API (`videos.list`) or the channel feed `https://www.youtube.com/feeds/videos.xml?channel_id=` plus the `UC` id, which lists only the newest videos | The Terms bar automated access except for search engines [YT-F35] | Block CH-YT-13. A reviewer rejects a host assembled from fragments, which the grep cannot see | MUST |
| CH-YT-14 | Identify any channel by its `UC` id. Before citing or linking it, confirm the feed `<name>` matches the brand. Never identify a channel from a handle search | A handle resolver returned the wrong channel for 9 of 29 handles (2026-11-27), and squatters hold plausible handles. CH-CORE-18 owns where links appear | Block CH-YT-14 prints the expected brand. The linter checks the id shape | MUST |

Block CH-YT-13, any line printed is a finding:

```sh
git ls-files -z -- ':(glob)scripts/**' \
  | xargs -0 -r grep -n -E -e 'youtube\.com|youtu\.be|youtube-nocookie\.com|yt-dlp|youtube-dl' -- \
  | grep -v -E -e 'youtube\.com/feeds/videos\.xml' -e 'googleapis\.com/youtube/'
```

Block CH-YT-14, `$ID` is the channel id from the record:

```sh
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=$ID" | grep -m 1 -o -e '<name>[^<]*'
```

## What to publish and the Shorts pilot (CH-YT-15 to 24)

| ID | Rule | Why | Verification | Severity |
|---|---|---|---|---|
| CH-YT-15 | Make the channel long-form first. Publish a Short only inside an owner-approved pilot (CH-YT-21) | Company Shorts scored 0.88 pooled against the channel median (n=54, 9 channels, 5 higher and 4 lower, measured 2026-11-27). That null rests on 9 channels, so the rule rests on no measured lift, not on a loss | Block CH-YT-15 | SHOULD |
| CH-YT-16 | Use an announcement word in a title (`Introducing`, `launch` and its forms, `1.0`, `now in`, `public preview`) only when `milestone_ref` names a release tag made on or before the publish date | Misleading metadata falls under the spam policy [YT-F44] and a misleading thumbnail is barred [YT-F45]. Agents that optimise titles drift toward "Introducing" | The linter with `--repo`. Version strings such as `2.1.0` also hit, which only forces the tag check | MUST |
| CH-YT-17 | Publish one long-form video for every product milestone: a 1.0, a public preview or a named feature launch. Its title names the product and the milestone | Announcement titles read 4.94 times the channel median, on n=18 across 8 channels and four outliers, so there is no finding. The outliers show how such a title reads | `unverified: reading heuristic`. Each milestone in the release notes has an upload within 14 days whose title holds the product name and the milestone | CONSIDER |
| CH-YT-18 | Plan each 10 long-form uploads as 7 task tutorials of 3 to 10 minutes, up to 2 real milestone videos, and 1 chaptered deep walkthrough or edited talk of 10 to 20 minutes. Hold a floor of one long-form upload per 30 days. Below it, publish milestone videos only | 74 percent of company uploads are long-form (156 of 210). The length bands are vendor survey data (TechSmith, 2024-05, about 1,000 respondents; Wistia, 2024-04-15), and no band measured on company channels reached n=25 | Block CH-YT-18 | CONSIDER |
| CH-YT-19 | Keep raw live-stream replays and meeting recordings out of the main uploads list. Put them in a separate playlist with a title that names the topic and the date. Upload an edited talk as a deep walkthrough with a topic title | Live, meeting and talk titles scored a median of 0.50 (n=24, 10 channels), some 0.0 to 0.18. Under the n=25 floor it is advice | Block CH-YT-19 | CONSIDER |
| CH-YT-20 | A Short is within [YT-F22], square or vertical, and has `related_video` set to a published long-form video on the same topic. It needs the record line `related_video_on_short` to read `Enabled`. Its call to action falls in its last 5 seconds. The linked long video answers the hook within its first 10 seconds, with no logo intro | A claimed Short over one minute is blocked globally [YT-F23], so CH-YT-23 removes the claim risk at the source. The bridge steps are YouTube's own. Without the feature line, publish no Short and run no pilot | The linter with `--target`. Block CH-YT-20 checks the frame | MUST, when Shorts are published |
| CH-YT-21 | Run a Shorts pilot only after the owner approves it in writing and with a recorded verdict. Before the first Short the pilot record holds the owner's approval and the owner's bar, `pass_median_engaged_views` and `pass_actions`. The agent never fills those two. A pilot is at least 10 Shorts within 90 days of the first, each meeting CH-YT-20. At day 90 compare the median engaged views per Short and the actions attributable to the series against the bar, never public views. On a fail, stop and start no replacement on the same premise without new approval | Public views count from the first frame in every format [YT-F32], so they say nothing about interest. Fewer than 10 Shorts cannot separate signal from noise (CH-YT-26). No source supplies a bar for a small channel, so the number is the owner's | `yt_manifest_check.py --pilot youtube/pilot.toml` exits 0 | MUST |
| CH-YT-22 | Give every episode of a numbered series a number no other upload uses, and a one-sentence `concept` whose verb and object differ from every earlier episode, written before production. Never upload a re-skin of an episode as a separate video | An eligible series needs a distinct storyline, focus or concept per video [YT-F46]. A duplicate number indexes nothing | The linter with `--earlier-manifest`. For the live feed, block CH-YT-22 | MUST |
| CH-YT-23 | Use only your own voice, YouTube Audio Library tracks, or no music. Credit a Creative Commons track's artist in the description [YT-F48]. Show no third-party video, music, branded footage or notification sound. List every audio and footage source in the manifest. Within 24 hours of upload, read Studio Content with the "Claims" filter and log the result | Only Audio Library audio is known to be copyright-safe [YT-F47]. A claimed Short over one minute is blocked [YT-F23]. A copyright removal of a live stream brings a strike and a live restriction [YT-F49] | The linter checks each `source` and each credit string. `grep -E -e '^claims_check: 20[0-9]{2}-[0-9]{2}-[0-9]{2} none$' -- upload-log.txt` finds the dated result | MUST |
| CH-YT-24 | Plan an end screen only when the video meets [YT-F24] and is not made for kids, with the element count and placement of [YT-F25]. Never let it be the only call to action: record an in-video next step at `cta_at_s`, inside the last 20 seconds | End screens do not show on mobile web and viewers can hide them. The Link element needs Partner Program membership [YT-F26] | The linter | SHOULD |

Block CH-YT-15, each listed manifest must have a matching pilot record entry:

```sh
git ls-files -z -- ':(glob)youtube/*/manifest.toml' | xargs -0 -r grep -l -e '^format = "short"' --
```

Block CH-YT-18, count the `format` keys of the last 10 manifests against the plan,
and read the gap between the two newest feed entries (`$ID` is the channel id):

```sh
git ls-files -z -- ':(glob)youtube/*/manifest.toml' | xargs -0 -r grep -h -e '^format = ' --
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=$ID" | grep -o -e '<published>[^<]*' | head -2
```

Block CH-YT-19, any line printed is a replay or recording that needs a `topic` in its
manifest. `SIG` is matched as a case-sensitive whole word. Build `titles.txt` from
`<media:title>` values in the feed:

```sh
grep -i -w -E -e 'live ?stream|weekly|meeting' titles.txt
grep -w -e 'SIG' titles.txt
grep -E -e '\.mp4$' titles.txt
```

Block CH-YT-20, the frame checks the linter cannot see:

```sh
ffprobe -v error -show_entries format=duration -of csv=p=0 short.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 short.mp4
```

The first prints a duration within [YT-F22]. In the second, width is no greater than height.

Block CH-YT-22, any number printed twice is a reused episode number:

```sh
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=$ID" \
  | grep -o -E -e '(Shorts|Ep|Part|#) ?[0-9]+' | sort | uniq -d
```

The feed holds only the newest videos. A longer channel reads `playlistItems.list`
on the uploads playlist instead.

## Measurement and reporting (CH-YT-25 to 28)

| ID | Rule | Why | Verification | Severity |
|---|---|---|---|---|
| CH-YT-25 | Write the view definition and the date range beside every view number: Shorts views count every start or replay [YT-F33], views in every format count from the first frame [YT-F32], and public counts include TV co-views [YT-F31]. Mark any series that crosses one of these dates as a step. Base any claim about interest on engaged views | The three regimes are not comparable | Block CH-YT-25. A series spanning a date carries the word `step` | MUST |
| CH-YT-26 | Report "insufficient data" when CTR rests on fewer than 1,000 registered impressions, or retention rests on fewer than 100 views or was read less than 2 days after upload [YT-F42]. Rate a CTR or Intro value only against the channel's own 10 latest videos of similar length. Draw no conclusion from swapping a title or thumbnail on one video | Half of all channels see an impressions CTR in a wide band [YT-F41], and traffic sources confound before-and-after swaps. The 100-view floor and the 1,000-impression floor are house floors, not YouTube numbers. At 1,000 impressions per arm, a 4 percent CTR must reach 6.8 percent to be detected (alpha 0.05, power 0.80) | Block CH-YT-26. `unverified: reading heuristic` for n beside each metric and the 10-video comparison set | MUST |
| CH-YT-27 | Do not run Test and Compare below about 1,000 impressions per variant in a two-week window. Before a test, confirm the video is long-form or a Live Archive, not made for kids, mature or private, the Advanced tier is on, and every variant meets the thumbnail floor. Change packaging only on a "Winner" result | The test picks by watch time, not CTR, and shows the first upload when there is no clear winner [YT-F40] | The test plan records impressions per variant before the start. `unverified: reading heuristic` that `Performed Same` and `Inconclusive` change nothing | SHOULD |
| CH-YT-28 | Report every format or title comparison with the channel group, n per cell and the channel's own baseline. Refuse a conclusion from any cell under n=25. Never cite educator-channel practice as evidence for a company channel | The median company video drew 2,506 views against 72,825 for an educator video, about 29 times (30 feeds, 2026-11-27). Cells of 7 and 2 are noise | `unverified: reading heuristic`. Every comparison table has `n` and `baseline` columns, a cell under 25 reads "no finding", and an educator channel is named as an example only | MUST |

Block CH-YT-25, any line printed is a view number with no definition:

```sh
grep -n -E -e '[0-9] views' report.md | grep -v -e 'engaged' -e 'first frame' -e 'since 20'
```

Block CH-YT-26, any line printed is a before-and-after conclusion:

```sh
grep -n -i -E -e 'before/after' -e 'after swapping' report.md
```

## What an agent must ask a human

Put each in `open_asks`. Never infer an answer.

- The channel's made-for-kids value, once (expected "No"). It goes in the record.
- The AI-use and paid-promotion value for each video with a synthetic voice,
  generated footage, a likeness, a sponsor or a material connection.
- Each switch from private to public or unlisted. Any change of channel name or
  handle (YT-F50). A name change removes a verification badge.
- Whether automatic dubbing is off or manual, and whether product and command names
  may be dubbed.
- Phone or ID verification for the Intermediate and Advanced tiers. Only the account
  holder can do it.
- The channel description, the first link, the banner, and whether the contact email
  is personal or a role address.
- Whether to run a Shorts pilot at all, its pass bar for `pass_median_engaged_views`
  and `pass_actions`, and whether to stop a failed one. No source supplies a number,
  so the agent proposes none.
- Who appears on camera, and any use of a real person's voice or likeness.
- Any music outside the Audio Library, any dispute of a claim, warning or strike, and
  any Partner Program application.
- Whether to create a Data API project and OAuth client for uploads and read-back.
  Without one, CH-YT-09, 10 and 15 are verified by hand in Studio.

## What agents get wrong here

- **Stale platform memory.** Expecting an omitted `privacyStatus` to stay private,
  quoting an old thumbnail cap, believing a Short's thumbnail cannot be set through the
  API, or quoting an old view definition. Read the `YT-F` rows. Caught by CH-YT-08,
  09 and 25.
- **Template drift.** Copying the last description and changing one line, re-uploading
  a variant under the same number, or titling every video "Shorts NN". Caught by
  CH-YT-04 and 22.
- **Assumed defaults.** Relying on Studio defaults that Help documents only for
  browser uploads, omitting made-for-kids, leaving the language unset. Caught by
  CH-YT-01, 10 and 11.
- **Verdicts from tiny samples, or borrowed from educators.** Declaring a winning
  thumbnail from a 20-view gap, or recommending daily uploads because educators do.
  Caught by CH-YT-26 to 28.
- **Silent format failures.** A chapter list that starts at the first topic, a
  description counted in characters, a pasted URL on a channel without the feature,
  an end screen on a 20-second clip. Caught by CH-YT-02, 06, 12 and 24.
- **Access shortcuts.** Curling watch pages, or resolving a handle and landing on a
  squatter. Caught by CH-YT-13 and 14.

## Siblings

`channel-publishing` owns the boundary, the label rules and the facts registry
format. `terminal-demo` owns recording terminal footage and caption quality
(CH-VID). `marketing-quality` owns claims in titles and descriptions. SEO and
video markup on the product site belong to `marketing-quality-reference`.

| Read | When |
|---|---|
| [references/manifest.md](references/manifest.md) | Writing a manifest, the channel record, the pilot record, the upload log or the insert body |
| [references/facts.md](references/facts.md) | Citing a `YT-F` row, refreshing a row, or finding a measurement |
| `checks/yt_manifest_check.py` | Linting a manifest, a record or an insert body. `--help` lists the options and `--self-test` runs its fixtures |
