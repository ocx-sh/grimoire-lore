# Upload manifest, records and insert body

The manifest is the per-upload metadata file that `checks/yt_manifest_check.py`
lints before any upload. This file defines it, the channel record, the pilot
record, the upload log and the insert body.

Contents: [Dates and versions](#dates-and-versions) · [Layout](#layout) ·
[Manifest keys](#manifest-keys) · [Worked example](#worked-example-long-form) ·
[Short differences](#short-differences) · [Channel record](#channel-record) ·
[Pilot record](#pilot-record) · [Upload log](#upload-log) ·
[Insert body](#insert-body)

## Dates and versions

- **Pinned** house format, version 1, written 2026-11-27. An adopter overrides a key
  name once, in the linter's `REQUIRED` list and here, never per upload.
- The manifest and the pilot record are TOML, read with Python 3.11 `tomllib`.
  The channel record and the upload log are `key: value` lines.
- Every limit the keys refer to lives in `references/facts.md` as a `YT-F` row.
  This file names the row and never repeats the number.
- Re-check this file when a revision-history entry adds, renames or removes a
  `videos.insert` field, and when the Feature eligibility screen gains a feature.

## Layout

One directory per upload. The record files sit beside the upload directories.

```text
youtube/
  channel-record.yml     CH-YT-12, one per channel
  pilot.toml             CH-YT-21, only while a Shorts pilot exists
  pin-a-tool/
    manifest.toml        CH-YT-01
    desc.txt             the description, UTF-8, referenced by the manifest
    thumb.png            the thumbnail
    insert-body.json     the videos.insert body the human sends
    upload-log.txt       written by the human after the upload
```

## Manifest keys

All keys are required unless the Notes column says otherwise. Every value is
explicit: an omitted key is a finding, never a default.

| Key | Type | Rule | Notes |
|---|---|---|---|
| `format` | `"long"` or `"short"` | CH-YT-15, 20 | Added to the CH-YT-01 key list. The linter needs it to pick the Short checks |
| `title` | string | CH-YT-02, 16 | Within the title limit YT-F11. No angle brackets |
| `description` | path | CH-YT-02 to 05 | A UTF-8 file next to the manifest. Within the API byte limit YT-F13 |
| `tags` | list of strings | CH-YT-05 | Empty, or name variants and common misspellings, within YT-F14 |
| `chapters` | `"description"` or `"none"` | CH-YT-06, 07 | `"description"` exactly when the file holds timestamp lines |
| `default_language` | string | CH-YT-10 | Language of the title and description, such as `en` |
| `default_audio_language` | string | CH-YT-10 | Spoken language. A wrong value mistranslates automatic dubs |
| `made_for_kids` | boolean | CH-YT-10 | From the channel record or the human. Never guessed |
| `synthetic` | boolean | CH-YT-10, CH-CORE-06 | Sent as `containsSyntheticMedia` |
| `paid_placement` | boolean | CH-YT-10, CH-CORE-06 | Sent as `hasPaidProductPlacement` |
| `privacy` | `"private"` | CH-YT-09 | Always private. A human changes it after watching the upload |
| `thumbnail` | path | CH-YT-08 | JPG or PNG. Size and ratio per YT-F19, YT-F20 and the house floor |
| `audio` | list of tables | CH-YT-23 | At least one entry. See below |
| `duration_s` | integer | CH-YT-06, 20, 24 | From `ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4` |
| `cta_at_s` | integer | CH-YT-20, 24 | The second at which the video says its next step |
| `ai_use` | string | CH-CORE-07 | `"yes, case: YT-F05"`, `"no, case: YT-F07"`, `"no, case: no-ai"` or `"no, case: borderline"` with an `open_asks` entry naming `ai_use` |
| `package` | table | CH-CORE-01 | The ten publish-package header keys below |
| `related_video` | string | CH-YT-20 | Short only. The id of the published long-form video |
| `hook_covered_by_s` | integer | CH-YT-20 | Long-form video that a Short links to. Second at which it answers the Short's hook |
| `milestone_ref` | string | CH-YT-16 | A release tag. Needed when the title holds an announcement word |
| `publish_date` | `YYYY-MM-DD` | CH-YT-16 | Optional. Defaults to today in the linter |
| `topic` | string | CH-YT-19 | Optional. Needed for a talk or a replay |
| `series`, `episode`, `concept` | string, integer, string | CH-YT-22 | All three when the title carries a number marker such as `Ep 3` or `Shorts 02`. `concept` is one sentence whose verb and object differ from every earlier episode |
| `end_screen` | list of tables | CH-YT-24 | Optional. One `[[end_screen]]` table per planned element |
| `reasons` | table | all SHOULD | Optional. `"CH-YT-03" = "text"` records why a SHOULD finding stands. The linter then drops that finding |

`[package]` carries the ten keys of the publish package: `platform`, `account`,
`action`, `labels`, `ai_role`, `sponsored`, `spend`, `open_asks`, `approved_by`
and `approved_at`. For YouTube, `labels` lists the two label keys that the
manifest holds, `["synthetic", "paid_placement"]`. The agent leaves
`approved_by` and `approved_at` empty. A human fills them.

Each `[[audio]]` entry has `source` set to `own`, `audio-library` or `none`.
Add `name` for a named track. A Creative Commons Audio Library track adds
`license = "cc"` and `credit`, the exact attribution text from Studio, which must
appear in `desc.txt`. List every audio and footage source. A silent video holds
one entry with `source = "none"`.

## Worked example, long-form

`manifest.toml`:

```toml
format = "long"
title = "Pin a tool version with mytool"
description = "desc.txt"
tags = ["mytool", "my tool"]
chapters = "description"
default_language = "en"
default_audio_language = "en"
made_for_kids = false
synthetic = false
paid_placement = false
privacy = "private"
thumbnail = "thumb.png"
duration_s = 600
cta_at_s = 585
ai_use = "no, case: no-ai"
topic = "pinning"

[package]
platform = "youtube"
account = "example-channel"
action = "upload-private"
labels = ["synthetic", "paid_placement"]
ai_role = "script drafted with AI help, human voice"
sponsored = false
spend = 0
open_asks = []
approved_by = ""
approved_at = ""

[[audio]]
source = "own"

[[end_screen]]
kind = "video"
```

`desc.txt`:

```text
Install mytool and pin a tool version in one command: https://example.com/install

In this video you pin a tool version, run it, and check the lock file.

00:00 What pinning does
01:00 Pin a version
04:00 Check the lock file

#mytool #devtools
```

The destination link sits on line 1. The three timestamp lines start at `00:00`.
The hashtags close the file. The tested copy of this pair, with a release tag in
the title, is `checks/fixtures/youtube/pass-long`.

## Short differences

- `format = "short"`, `chapters = "none"`, a vertical thumbnail, and
  `related_video` set to a published long-form video id.
- `cta_at_s` falls in the last seconds, and the linked long-form manifest sets
  `hook_covered_by_s`. Pass that manifest with `--target`.
- A Short runs only inside an approved pilot (CH-YT-21) and only when the channel
  record's `related_video_on_short` line reads `Enabled`.
- The tested copy is `checks/fixtures/youtube/pass-short`.

## Channel record

`youtube/channel-record.yml`, one `key: value` per line. Re-verify it every 90 days
and set `checked` to the date. Every key needs a value.

| Key | Holds |
|---|---|
| `channel_id` | The `UC` id. Never a handle. Confirm the feed `<name>` matches the brand first |
| `checked` | ISO date of the last full re-verification |
| `description` | The channel description |
| `links` | The channel links, in order |
| `first_link` | The link chosen to show first |
| `audience` | The made-for-kids setting for the channel |
| `dubbing` | `Publish manually` or `off`, with the date the human set it |
| `default_language` | The channel default language |
| `contact_email` | The public contact address, a role address if the owner chooses one |
| `verification_tier` | Standard, Intermediate or Advanced, as the account shows it |
| `custom_thumbnails`, `clickable_links`, `chapters`, `test_and_compare`, `related_video_on_short` | The channel's own Feature eligibility line for each feature: `Enabled`, another status as the screen shows it, or `not listed` |

The screen of the channel is the authority, not the Help grouping of features
(YT-F38). Check it before using a feature.

## Pilot record

`youtube/pilot.toml`. The agent never fills `pass_median_engaged_views` or
`pass_actions`. The owner sets both before the first Short.

```toml
approved_by = "owner name"
approved_at = "2026-12-01"
pass_median_engaged_views = 50   # the owner's bar, never proposed by an agent
pass_actions = 5                 # subscribers or clicks on a tracked link
pass_set_at = "2026-12-01"
start = "2026-12-02"
end = "2027-03-01"
measured_median_engaged_views = 80
measured_actions = 7
verdict = "pass"                 # follows from the measured values and the bar

[[short]]
id = "abc123XYZ_-"
published = "2026-12-02"
# ... at least ten [[short]] tables inside 90 days of the first
```

The numbers above are layout examples. No source supplies a pass bar.
`yt_manifest_check.py --pilot youtube/pilot.toml` checks the structure.

## Upload log

`youtube/<slug>/upload-log.txt`, written by the human who ran the upload:

```text
uploaded_by: Name Surname 2026-12-02
read_back: 2026-12-02 matches manifest
claims_check: 2026-12-03 none
public_approved_by: Name Surname 2026-12-03
```

`claims_check` is the Studio Content "Claims" filter, read within 24 hours of the
upload. The result word is `none`, or the claim text. `public_approved_by` is
written only after the human watched the private upload.

## Insert body

The agent writes `insert-body.json` from the manifest and does not send it.

```json
{
  "snippet": {
    "title": "Pin a tool version with mytool",
    "description": "the full text of desc.txt",
    "tags": ["mytool", "my tool"],
    "defaultLanguage": "en",
    "defaultAudioLanguage": "en"
  },
  "status": {
    "privacyStatus": "private",
    "selfDeclaredMadeForKids": false,
    "containsSyntheticMedia": false
  },
  "paidProductPlacementDetails": { "hasPaidProductPlacement": false }
}
```

Lint it with `--insert-body insert-body.json`. After the human's upload, save the
`videos.list part=status,snippet,paidProductPlacementDetails` response as
`readback.json` and lint it with `--readback readback.json`.
