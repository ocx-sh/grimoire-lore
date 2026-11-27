# youtube-video

Upload standards for a software product's YouTube channel, with an upload
manifest and a linter. Every platform limit sits in a dated facts registry.

```sh
grim add ghcr.io/ocx-sh/lore/youtube-video
```

Reach for it when you prepare a YouTube upload or Short, write a video title,
description or chapters, or set up or audit a channel. Also use it to upload
through the YouTube Data API, or to report YouTube numbers.

## What it covers

The upload manifest and its linter. Title and description limits, the one
destination link, hashtags and chapter timestamps. Thumbnail format. Private-
first uploads.

The made-for-kids, language, altered-or-synthetic and paid-placement fields.
Automatic dubbing, the channel record, series numbering, audio licensing and end
screens. A pilot gate decides whether a channel publishes Shorts at all. Views
are reported by their definitions.

An agent never uploads. It ends at a manifest and a draft, and a named human
publishes.

## What agents get wrong here

Stale platform memory leads the list. Examples are expecting an omitted
`privacyStatus` to stay private, or quoting an old thumbnail cap. Then comes
template drift, such as copying the last description and changing one line.
Then assumed defaults, such as omitting made-for-kids or leaving the language
unset. Last are verdicts from tiny samples, such as declaring a winning
thumbnail from a 20-view gap.

28 rows hold the rationale and verification. 18 of them are MUST. One script,
`yt_manifest_check.py`, lints the manifest and carries `--self-test`.

## What it does not cover

Recording terminal footage belongs to `terminal-demo`. Thumbnail and hook craft
are out, because no check here can measure them.

## Siblings

It requires `channel-publishing`, which installs with it. `terminal-demo`
produces the footage. `linkedin-post` and `microblog-post` cover other
platforms. Bundled as `product-essentials`.
