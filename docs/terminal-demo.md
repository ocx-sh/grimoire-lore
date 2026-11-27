# terminal-demo

Procedure and gate for terminal demos. They include asciinema casts, VHS tapes,
GIFs, SVG or PNG stills and platform video. Each is rendered from a committed
scenario that runs the real product.

```sh
grim add ghcr.io/ocx-sh/lore/terminal-demo
```

Reach for it when you record, re-record, embed or review a terminal demo. It
also fits a `.cast` or `.tape` file, a README GIF or CLI screenshot, or a video
built from terminal footage.

## A recording a stranger can read, pause, search and trust

The gate runs the recording rules as one report. Column geometry works on a
phone and in a docs column. Idle gaps are capped at 2 seconds and the palette keeps its
contrast.

A pause control, captions and a transcript are present, and the flashing limits
hold. Secrets and identity are scrubbed from the recording. Text-normalised
drift checks catch a demo that no longer matches the product.

Every rule that applies gets a line in the gate report: pass, not applicable
with the reason, or manual with what a human must read.

## Re-record, never edit

A finished recording is never edited. A finding is fixed in the scenario or the
environment, and the demo is recorded again. The recording environment holds no
publishing credential and no real `HOME`.

An agent never uploads. A named human does.

## What agents get wrong

The skill ranks them. Treating one tool's surface check as the gate comes
first, such as scanning the raw `.cast` and calling it clean. Then recording in
the live shell and patching the cast with `sed`. Then sizing by font instead of
columns, and writing platform limits from memory.

26 rows hold the rationale and verification. 20 of them are MUST. Two scripts,
`cast_check.py` and `cast_contrast.py`, run over fixtures and carry
`--self-test`. Dated platform facts sit in `references/facts.md`.

## What it does not cover

The docs-page player and tooltip belong to `docs-quality`. Uploading or posting
a recording belongs to a named human.

## Siblings

It requires `channel-publishing`, which installs with it. `youtube-video` and
`linkedin-post` cover where a recording is published. Bundled as
`product-essentials`.
