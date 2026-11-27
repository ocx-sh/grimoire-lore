---
title: docs-instrument refresh, spillover round decision
target: docs-instrument
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/docs-instrument/spillover-check.md
---

## Verdict

Both confirmed spillover items change the target. Every change is a statement inside a reference file, plus one command in SKILL.md step 5 that repeats the lychee fallback. No rule or step ID is added, renumbered or redefined, because the docs-instrument skill carries no ID family of its own and the DOC-* IDs it cites belong to the docs-quality rule. The first round of this refresh left `skills/docs-instrument/` untouched (no working-tree change and no refresh commit), so nothing here contradicts earlier refresh text.

Six edits in all: two in `references/wiring-by-generator.md`, one in `SKILL.md`, three in `references/reader-signals.md`.

## Changed statements

1. **mdBook strict build (wiring-by-generator.md, link-checking table).** `mdbook-linkcheck` broke on mdBook 0.5, and mdBook itself now recommends the `mdbook-linkcheck2` fork, configured under `[output.linkcheck2]`. The row now names the fork and its table. It is marked "verify once", because nobody has built linkcheck2 against mdBook 0.5.x and the file's own convention marks unbuilt claims that way. Verification: add the backend to a `book.toml`, break one internal link, and confirm that `mdbook build` exits non-zero.
2. **VitePress strict build (same table).** "none shipped" was wrong. `vitepress build` fails on a dead internal link by default, because `ignoreDeadLinks` defaults to `false`. The lychee fallback stays in its column. Verification: break one internal link in a VitePress fixture and confirm that `vitepress build` exits non-zero. Confirm too that `ignoreDeadLinks` is absent or `false` in the config.
3. **lychee fallbacks (same table, five rows, and SKILL.md step 5).** lychee flags absolute links in local files as errors unless `--root-dir` is given, and the path must be absolute. Every fallback now passes `--root-dir "$PWD/<dir>"`. Verification: run the fallback on a clean build of a site that uses root-relative links and confirm a zero exit, then run the existing step 5 proof (one broken anchor, one broken root-relative link) and confirm a non-zero exit.
4. **Plausible events (reader-signals.md, vendor table).** Custom properties are a Business plan feature. The zero-result signal and the feedback vote need a property, so the cell now says that named events exist but properties need the Business plan, about 19 a month. Verification: confirm the plan at the vendor's custom-properties page before citing it.
5. **Umami free tier (same table).** The vendor's pricing page confirms a free Hobby tier with up to 100K events a month. The "unconfirmed" wording goes. Verification: the vendor's pricing page.
6. **Fathom events (same table and the paragraph after it).** A Fathom event takes a name and one optional numeric `_value`, with no properties. The cell now says so, and the paragraph after the table now rules Fathom out for the zero-result signal and the feedback vote. It also states the Plausible plan floor. Verification: the vendor's events page.
7. **Vendor table sourcing sentence (reader-signals.md).** "Two rows below were read from third-party trackers" no longer describes the table. It now says which cells were confirmed at vendor pages and that the remaining prices were not re-checked. The instruction to confirm pricing before citing a number stays.

## New rules

None.

## Declined

- Re-checking the Plausible "about 9 a month" entry price. The vendor's pricing page returned 404 on 2026-11-27, so the figure stays as it is, and the table text now says it was not re-checked.
- Re-checking the Fathom "about 45 a month" price and the GoatCounter row. The spillover check covered neither, so both stay unchanged.
- Changing the breadcrumb sentence ("VitePress and mdBook ship none, so that arm is a reading check"). It is about breadcrumbs, not link checks, and the spillover check found it correct.
- Claiming that the VitePress dead-link check also covers anchors or external links. No primary source was read for that, so the lychee fallback keeps its column.
- Adding a step that proves `--root-dir` works. A competent model runs the new command on a clean build without being told, and step 5 already requires a broken-link proof.

## Sources

- https://github.com/rust-lang/mdBook/pull/3132 (mdBook recommends the linkcheck2 fork after linkcheck broke on 0.5.0)
- https://github.com/marxin/mdbook-linkcheck2 (options go under `output.linkcheck2` in `book.toml`)
- https://vitepress.dev/reference/site-config (`ignoreDeadLinks` defaults to `false`, and a dead link fails the build)
- https://lychee.cli.rs/guides/cli/ (`--root-dir` is required for absolute links in local files and takes an absolute path)
- https://plausible.io/docs/custom-props/introduction (custom properties are a Business plan feature)
- https://plausible.io/docs/custom-event-goals (states no plan limit for named events)
- https://umami.is/pricing (Hobby tier, free, up to 100K events a month)
- https://usefathom.com/docs/features/events (an event has a name and an optional `_value`, and nothing else)

## Revision log

- 2026-11-27: spillover round decided from the docs-quality spillover check. Two items were confirmed and both were applied as six in-place statement edits. No ID changed.

### Edit list (spillover round)

1. File: `skills/docs-instrument/references/wiring-by-generator.md`

   Find:

   ````text
   | MkDocs Material | `mkdocs build --strict` | `lychee --include-fragments site/` |
   | mdBook | `mdbook-linkcheck` as a backend in `book.toml` | `lychee --include-fragments book/` |
   | VitePress | none shipped | `lychee --include-fragments .vitepress/dist/` |
   ````

   Replace with:

   ````text
   | MkDocs Material | `mkdocs build --strict` | `lychee --root-dir "$PWD/site" --include-fragments site/` |
   | mdBook | `mdbook-linkcheck2` as an `[output.linkcheck2]` backend in `book.toml` (the original `mdbook-linkcheck` breaks on mdBook 0.5), verify once | `lychee --root-dir "$PWD/book" --include-fragments book/` |
   | VitePress | `vitepress build` fails on a dead internal link by default (`ignoreDeadLinks` is `false`, so keep it off) | `lychee --root-dir "$PWD/.vitepress/dist" --include-fragments .vitepress/dist/` |
   ````

2. File: `skills/docs-instrument/references/wiring-by-generator.md`

   Find:

   ````text
   | Docusaurus | `onBrokenLinks: 'throw'` is the default, `onBrokenAnchors` defaults to warn, so raise it | `lychee --include-fragments build/` |
   | Starlight | verify once, then fall back | `lychee --include-fragments dist/` |
   ````

   Replace with:

   ````text
   | Docusaurus | `onBrokenLinks: 'throw'` is the default, `onBrokenAnchors` defaults to warn, so raise it | `lychee --root-dir "$PWD/build" --include-fragments build/` |
   | Starlight | verify once, then fall back | `lychee --root-dir "$PWD/dist" --include-fragments dist/` |

   Every fallback passes `--root-dir` with an absolute path. Without it lychee
   flags each root-relative link in the built output as an error.
   ````

3. File: `skills/docs-instrument/SKILL.md`

   Find:

   ````text
   `lychee --include-fragments <build-dir>` after the build, with `<build-dir>`
   ````

   Replace with:

   ````text
   `lychee --root-dir "$PWD/<build-dir>" --include-fragments <build-dir>` after
   the build, with `<build-dir>`
   ````

4. File: `skills/docs-instrument/references/reader-signals.md`

   Find:

   ````text
   vendor's own page before citing a number. Two rows below were read from
   third-party trackers rather than the vendor.
   ````

   Replace with:

   ````text
   vendor's own page before citing a number. The Umami tier and the Plausible and
   Fathom event cells were confirmed at the vendor's own pages on 2026-11-27. The
   other prices were not re-checked there.
   ````

5. File: `skills/docs-instrument/references/reader-signals.md`

   Find:

   ````text
   | Plausible | free, AGPL | about 9 a month at the smallest tier | yes, on every plan |
   | Umami | free, MIT | a free hobby tier is reported, unconfirmed at the vendor's own page | yes, including the free tier |
   ````

   Replace with:

   ````text
   | Plausible | free, AGPL | about 9 a month at the smallest tier | named events yes; properties need the Business plan (about 19 a month) |
   | Umami | free, MIT | free Hobby tier, 100K events a month | yes, including the free tier |
   ````

6. File: `skills/docs-instrument/references/reader-signals.md`

   Find:

   ````text
   | Fathom | not offered | about 45 a month | yes, on every plan |

   A vendor with no named custom event cannot carry the zero-result signal or the
   feedback vote. That rules out GoatCounter and the free tier of the large
   edge-network analytics product, both of which answer page views only.
   ````

   Replace with:

   ````text
   | Fathom | not offered | about 45 a month | name and numeric value only, no properties |

   A vendor with no named custom event, or with events that carry no properties,
   cannot carry the zero-result signal or the feedback vote. That rules out
   GoatCounter and the free tier of the large edge-network analytics product, both
   of which answer page views only. It also rules out Fathom, whose events carry no
   properties. Plausible carries both signals only on the Business plan.
   ````
