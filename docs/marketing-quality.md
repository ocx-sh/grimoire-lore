# marketing-quality

The marketing-surface index: the gate, 21 merge-blocking non-negotiables, and
six depth files routed to by task. It keeps every pitch surface true and equal
to one positioning record.

```sh
grim add ghcr.io/ocx-sh/lore/marketing-quality
```

Loads on the files a pitch lives in. Those are `README.md`, `CHANGELOG.md`,
`Cargo.toml`, `package.json`, `pyproject.toml`, the positioning, voice, claims and
crawler-policy records, site generator configs, `robots.txt`, `_headers`, a
home page, `cliff.toml` and `.github/release.yml`. The index is 129 lines and
always present. A depth file is read only when the work calls for it. The depth
files and checks scripts ship in the `marketing-quality-reference` skill, which
the rule requires and grim installs with it (grim 0.16.0 or later).

## It loads on every manifest edit on purpose

The measured top failure is a fresh tagline per file. One survey found 61
one-liners across 17 repositories. So the rule loads on a manifest edit.
An edit that touches neither `description` nor `keywords` needs only the
licence row. Every other edit to a governed surface needs the rest.

## What agents get wrong by default

An agent writing a pitch invents what it cannot see. It writes a number from
memory, a quote nobody gave, an audience nobody named, or a competitor
limitation it half remembers. It writes "open source" for a licence that is
not, or "AI-powered" for a product that never calls a model.

The rule answers each with a record. A positioning record holds the one
product sentence. A claims record holds the evidence for each claim. A
sentence with no live record is rewritten as a mechanism a reader can check.

## The gate

Four steps run in order. A claims lint reads `claims.toml`. A drift check
compares every surface with `.agents/positioning.toml`.

A head check reads the built site. A live-site check reads robots and crawler
policy on the deployed host. Exit status is the verdict, never the printed text.
A step that cannot run is reported as not run.

## What is in it

21 non-negotiables in the index, and 108 rows across six depth files. 67 of
those rows are MUST. The files cover claims, trust claims, positioning, the
first screen, voice and AI authorship, and discoverability.

Every row carries an ID, a rationale, a runnable verification and a severity.
A row whose severity waits on an owner decision says so.

## Pinned decisions

The record locations and schemas are pinned: `.agents/positioning.toml` at
most 80 lines, `.agents/voice.toml`, `claims.toml` and `crawler-policy.toml`.
So are the `doc_surface` values, the `claim:<id>` marker and the `ASK-OWNER`
token. An adopter overrides each once, in the record or the script's options,
and records the reason.

## What it does not cover

Pricing pages and paid tiers, the layout of service-offer pages, and
pre-registered A/B results of any copy pattern. Docs pages stay with
`docs-quality`. Where a page is read by both sets, `docs-quality` governs it.

## Siblings

`positioning-brief`, `release-notes`, `marketing-review`,
`marketing-measurement`, `github-presence` and `channel-publishing` are
procedures that cite these IDs by number. `ux-quality` owns the rendered page.
The packaging rules own what a manifest declares. This rule owns what its
`description` and `keywords` say. Bundled as `product-essentials`.
