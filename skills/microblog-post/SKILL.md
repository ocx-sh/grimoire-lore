---
name: microblog-post
description: Release and announcement posts for X, Bluesky, Mastodon and Threads - each platform's own length counter, URLs written in full, link cards and facets, alt text, one post versus a thread, duplicate text across accounts, Mastodon verification links and the fediverse creator tag, and dated platform facts. Use when someone asks for a tweet or X post, a Bluesky post, a toot or Mastodon post, a Threads post, a thread announcing a release, or a check of a post's length. Not for LinkedIn, which is linkedin-post, and not for bot or scheduled posting, which needs an owner-commissioned automation row in channel-publishing.
license: Apache-2.0
metadata:
  summary: Drafts and checks release posts for X, Bluesky, Mastodon and Threads with per-platform counters, link cards, alt text and dated platform facts
  keywords: x,twitter,tweet,bluesky,mastodon,toot,threads,microblog,release,announcement,thread,alt-text,link-card,facets,fediverse,rel-me,bridgy-fed
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# microblog-post

Draft a release post for X, Bluesky, Mastodon and Threads, count it on each platform's own counter, and hand it to a named human. This skill never posts.

Contents: [Boundary](#boundary) · [Variables](#variables) · [Draft file](#draft-file) · [Procedure](#procedure) · [Rules](#rules) · [Verification blocks](#verification-blocks) · [Dated facts](#dated-facts) · [Ask a human](#ask-a-human) · [Agent failure modes](#agent-failure-modes) · [Siblings](#siblings)

## Boundary

These rules come from `channel-publishing`, which this skill requires. Read its `SKILL.md` for the full set.

- CH-CORE-01: end every task at a draft file. Never call a write endpoint on X, Bluesky, Mastodon or Threads, and never drive their web UI. Leave `approved_by` and `approved_at` empty.
- CH-CORE-02: unattended posting exists only as an owner-commissioned automation with a `channels.yml` row. An agent never creates one.
- CH-CORE-05: before drafting for a Mastodon instance other than `mastodon.social` or `mastodon.online`, fetch that instance's rules in the same session. Start the draft with `rules_fetched:` and `rules_quote:` lines.
- CH-CORE-06: write every label field the platform has as an explicit `true` or `false` in `labels:`. Threads takes `is_made_with_ai` on the container call only [TH-F01]. X takes `made_with_ai` and `paid_partnership`. Bluesky and Mastodon have no AI label, so a disclosure goes in the text.
- CH-CORE-08: a sponsor or AI disclosure goes in the first line of post 1, before any "see more" cut.
- CH-CORE-11: take every platform limit, field and clause from a registry row and cite its id in square brackets in the same line. Where no row exists, state no number.

## Variables

| Name | Holds |
|---|---|
| `MB` | `.claude/skills/microblog-post/checks`, or `$CLAUDE_CONFIG_DIR/skills/microblog-post/checks` when installed globally |
| `MB_DEPS` | a directory whose `node_modules` holds `twitter-text` 3.1.0 and `@atproto/api` 0.32.7 |
| `DRAFT` | the draft file, by default `posts/<tag>-microblog.md` (pinned default, an adopter overrides it once) |
| `INSTANCE` | the Mastodon host the post goes to |

Install the counters once:

```sh
npm install --prefix "$MB_DEPS" --save-exact twitter-text@3.1.0 @atproto/api@0.32.7
```

## Draft file

One file per release. Front matter, then one section per platform variant, then one `### post N` block per post.

```text
---
platform: x, bluesky, mastodon, threads
account: @mytool
action: draft
labels:
  made_with_ai: false
  paid_partnership: false
  is_made_with_ai: false
ai_role: drafted
sponsored: false
spend: none
open_asks: none
approved_by:
approved_at:
product: mytool
release_tag: v0.14.0
summary: Lock v4 pins resolve offline.
items: 1
---
## x
### post 1
mytool 0.14.0 adds lock v4: pins resolve offline. Notes: https://example.com/changelog#v0-14-0
image: demo.png
alt: Terminal: mytool install node@22 prints "Installed node 22.11.0 in 1.2 s"
recorded: run.txt
## bluesky
### post 1
(same text)
card: https://example.com/changelog#v0-14-0
## threads
### post 1
(same text)
link_attachment: https://example.com/changelog#v0-14-0
```

- `summary` is the release's summary sentence (MKT-REL-14 in `release-notes`). A fix-only patch has none, so write one from a rewritten fix line. Never copy a raw commit subject.
- `items` is the number of distinct user-facing changes.
- Two X accounts get two sections, `## x:@one` and `## x:@two`, with different text (CH-MB-16).
- `recorded:` names a file whose first line is the command and whose next lines are its output, from the run that produced the screenshot.
- Mastodon `cw:` holds a content warning. It counts toward the limit (CH-MB-05).

## Procedure

Each step names its input, its command or check, and what done looks like.

1. **Collect inputs.** Input: the repository and the release. Run `git describe --tags --abbrev=0` for the tag as the tag writes it. Read the summary sentence and count the user-facing items from the release notes. Done: tag, product name, summary and item count are known, or each missing one is in `open_asks`.
2. **Pick the link target.** Input: the owned per-version page and the GitHub Release page. Run the CH-MB-10 block on the owned page. Done: the owned page passes the card gate, or the draft links the GitHub Release page and `open_asks` reports the owned page as a site defect. Never ship a card with no image.
3. **Check the accounts.** Input: `channels.yml` or the owner's answer. Done: each platform you draft for has an account the owner named. For Mastodon, run the CH-MB-17 and CH-MB-18 blocks against the home page. For Bluesky, run the CH-MB-19 block.
4. **Write the draft.** Input: steps 1 to 3. Write one self-contained post per platform (CH-MB-08, CH-MB-09). Put one full `https://` URL in post 1 (CH-MB-07, CH-MB-22). Reuse one alt text on every variant (CH-MB-13, CH-MB-23). Done: the file matches the draft format.
5. **Count.** Run the CH-MB-01 block. Add `--instance "$INSTANCE"` so Mastodon reads its live limit. Done: every row says `pass`. A `FAIL` row means shorten that variant only.
6. **Check the draft.** Run `python3 -I "$MB"/mb_check.py "$DRAFT"`. Done: it prints nothing and exits 0. Each line names a rule ID and a line.
7. **Cite the facts.** Every platform number or clause in the draft's notes carries its registry id from `references/facts.md`. Run `python3 -I "$MB"/../../channel-publishing/checks/facts_check.py "$MB"/../references/facts.md`. Done: exit 0. An overdue row means re-fetch it, never extend the date.
8. **Hand over.** Output: the draft file, the count output, and the `open_asks` list. Stop. A named human posts. Done: no post call was made.

For an owner-commissioned automation row, the post step follows CH-MB-20 and CH-MB-24 and the row's gates. The agent still drafts and never runs it.

## Rules

Severities are pinned in this release. A cell that says "see block" points at a labelled fenced block below. "Registry" means `references/facts.md`.

| ID | Rule | Verification | Severity |
|---|---|---|---|
| CH-MB-01 | Validate each platform variant with that platform's own counter. Never use `len()`, `.length` or one count for all variants. Test strings include `🇩🇪🇺🇸`, which counts 4 on X, 2 on Bluesky, 2 on Mastodon and 16 on the Threads model. | see block CH-MB-01 | MUST |
| CH-MB-02 | Pass the X variant only when `twitter-text` `parseTweet(text).valid` is true and `weightedLength` is at most the registry limit [X-F04]. Validate against that limit for every account. If the account has Premium, ask the owner before allowing a longer post. | see block CH-MB-01 | MUST |
| CH-MB-03 | Pass the Bluesky variant only when `new RichText({text}).graphemeLength` is at most the grapheme limit [BS-F05] and the UTF-8 byte length is at most the byte limit [BS-F06]. A URL costs its full length. | see block CH-MB-01 | MUST |
| CH-MB-04 | Build Bluesky facets with `RichText.detectFacets`. Never compute `byteStart` from a string index [BS-F09]. | see block CH-MB-04 | MUST |
| CH-MB-05 | Count the Mastodon variant in grapheme clusters. Each `http(s)://` URL costs the reserved length [MA-F04], each `@user@host` counts as `@user`, and content-warning text counts. Check against `configuration.statuses.max_characters` read live from the target instance [MA-F03]. | see block CH-MB-01 with `--instance` | MUST |
| CH-MB-06 | Keep the Threads variant within the post limit [TH-F03], counting every emoji grapheme as its UTF-8 byte length [TH-F04], with at most the link limit of unique URLs including `link_attachment` [TH-F05]. SHOULD until a call against a test account settles the count model. | see block CH-MB-01 | SHOULD |
| CH-MB-07 | Put exactly one release URL in post 1 of every variant: in the text, or in the card on Bluesky. Do not move it to a reply. The reach evidence for link placement is weak, so this is a SHOULD. | `mb_check.py "$DRAFT"` reports CH-MB-07 when post 1 has no URL or card, or a later post holds a URL | SHOULD |
| CH-MB-08 | Make post 1 stand alone. Before the URL, name the product, the release tag with its leading `v` removed, and one concrete change that shares a word of 4 or more letters with the summary line. Never lift it from a raw commit subject. | `mb_check.py "$DRAFT"` reports CH-MB-08 | SHOULD |
| CH-MB-09 | Default a release to one post. Use a thread only for at least two distinct user-facing items. A thread has at most 3 posts, keeps the claim and the link in post 1, and repeats no link. Both numbers are project defaults, not platform facts. | `mb_check.py "$DRAFT"` reports CH-MB-09 | SHOULD |
| CH-MB-10 | Link the owned per-version page only when it passes the card gate: an absolute `https` `og:image` that is PNG or JPEG and within the thumb limit [BS-F08], plus a non-empty, page-specific `og:title` and `og:description`. Otherwise link the GitHub Release page and report the owned page as a site defect. | see block CH-MB-10 | MUST |
| CH-MB-11 | Give every Bluesky post that carries a link an `app.bsky.embed.external` with `uri`, a non-empty `title` and `description` (fall back to `<meta name="description">`), and a `thumb` uploaded from `og:image` whenever the page has one [BS-F11]. | see block CH-MB-11 | MUST |
| CH-MB-12 | Publish the Threads release post as `media_type=TEXT`, with the URL in `text` and the same URL as `link_attachment`. Attach no image, video or carousel [TH-F06]. | `python3 -I "$MB"/mb_check.py --threads-payload "$PAYLOAD"` | MUST |
| CH-MB-13 | Give every image or video on every platform an alt text that is not empty, not a file name, not a stub such as "screenshot", within the alt limit [X-F07, TH-F07], and identical across the variants. | `mb_check.py "$DRAFT"` reports CH-MB-13. The weekly audit in CH-MB-20 covers published posts | MUST |
| CH-MB-14 | Read every limit a validator uses from the registry. Where a schema and its prose disagree, take the schema [BS-F07]. Pin `twitter-text` and `@atproto/api` to exact versions. | see block CH-MB-14 | MUST |
| CH-MB-15 | Never write that a platform penalises, suppresses, boosts or does not hurt links, threads or replies, and never write a link or thread reach figure, unless the same paragraph carries the source URL, its ISO date and `n=`. State the window, the accounts and whether the comparison was within-account. | `python3 -I "$MB"/mb_check.py "$DRAFT"` and `--prose` over any other text. Window and accounts are a reading check: `unverified: reading heuristic` | MUST |
| CH-MB-16 | Never publish identical or substantially similar text from two X accounts [X-F08]. Write two texts with different content. | `mb_check.py "$DRAFT"` reports CH-MB-16 (similarity above 0.8, a project default). Add `--compare "$OTHER"` across drafts | MUST |
| CH-MB-17 | Once a Mastodon account exists, every page the posts link carries `<meta name="fediverse:creator" content="@user@instance">` in the served head, and its domain is on the account's "Websites allowed to credit you" list [MA-F08]. | see block CH-MB-17 | MUST |
| CH-MB-18 | In the same change that opens a Mastodon account, put an `<a>` or `<link>` with `rel="me"` and the profile URL in the served HTML of the project home page, outside any iframe and without JavaScript rendering, and list the home page in the profile fields [MA-F09]. | see block CH-MB-18 | MUST |
| CH-MB-19 | Make the Bluesky handle the project domain or a subdomain of it, and never call that a "blue check" [BS-F13]. | see block CH-MB-19 | SHOULD |
| CH-MB-20 | Gate publishing on the checks at three triggers. On `release`, run CH-MB-01 to CH-MB-16, CH-MB-22 and CH-MB-23 as a step that exits non-zero on any failure, before the post step. In the site build, run CH-MB-10, CH-MB-17 and CH-MB-18 and exit non-zero on any failure. On a weekly `schedule`, audit alt text (count images inside `recordWithMedia.media` as well as top-level `images`, and count a whitespace-only `alt` as missing), Bluesky embeds, `verified_at`, `resolveHandle` and `missing_attribution` through public APIs, and exit non-zero on any finding. | Fixture tests of the owner's workflow: a draft over the limit stops the release step before the post step, and a page with no `og:image` fails the site build. Two audit fixtures, one with an empty `alt` in a top-level `images` embed and one inside `recordWithMedia.media`, each exit non-zero. This skill ships the checks the steps call, not the workflow | SHOULD |
| CH-MB-21 | When Bridgy Fed carries a Mastodon post to Bluesky, keep the bridged text within the bridge limit [BR-F01] and video within its video limit [BR-F02]. The bridge skips a post older than its age gate [BR-F03]. | see block CH-MB-21 | CONSIDER |
| CH-MB-22 | Write every URL in every variant in full, starting with `https://`. Never post a bare domain. Mastodon links only URLs that carry a scheme [MA-F05], and X and Bluesky link a bare domain. | `mb_check.py "$DRAFT"` reports CH-MB-22 (approximate). The exact check is the `urls-in-full` row of the CH-MB-01 block | MUST |
| CH-MB-23 | For a terminal screenshot, write the command and its decisive output lines verbatim as the alt text, within the alt limit. Put longer output on the linked page [WC-F01]. | With `recorded:` set, `mb_check.py "$DRAFT"` reports CH-MB-23. For a hand-made screenshot, matching the alt text to the pixels is `unverified: reading heuristic` | SHOULD |
| CH-MB-24 | If a release uses a thread, publish post 2 only after post 1's call returned its id. With the bridge flag set, also wait at least 60 s after post 1 (a project default, not a platform fact). If post 2 fails, keep post 1, report the failure and exit non-zero. Never delete or re-post post 1. On a retry, send an idempotency key where the platform has one [MA-F10]. | Fixture test of the post step. A failing reply call exits non-zero, the log records post 1's id, and the log shows exactly one create call for post 1. A Mastodon retry reuses the failed attempt's `Idempotency-Key` | SHOULD |

## Verification blocks

```sh
# CH-MB-01 to CH-MB-06: one verdict row per platform per post; any FAIL row exits 1
python3 -I "$MB"/mb_check.py --parse "$DRAFT" | node "$MB"/mb_count.mjs --instance "$INSTANCE" -
grep -nE -e '\.length' -e 'len\(' "$MB"/mb_count.mjs
```

The `grep` prints nothing. `node "$MB"/mb_count.mjs --self-test` runs the `🇩🇪🇺🇸` vector and the X, Bluesky, Mastodon and Threads count vectors.

```sh
# CH-MB-04: facets come from detectFacets, and the self-test expects byteStart 10 for "Docs 🚀 https://example.com/docs"
grep -nE 'byteStart.*(indexOf|\.index|search\()' "$MB"/mb_count.mjs
node "$MB"/mb_count.mjs --self-test
python3 -I "$MB"/mb_check.py --parse "$DRAFT" | node "$MB"/mb_count.mjs --facets -
```

```sh
# CH-MB-10: URL is the page, IMG is its og:image URL. All three tags print, and the image URL starts with https://
curl -sL "$URL" | grep -oE '<meta property="og:(image|title|description)"[^>]*>'
curl -sL "$IMG" -o "$TMP"/og.img
stat -c %s "$TMP"/og.img
file "$TMP"/og.img
```

The size is within the thumb limit [BS-F08], and `file` reports PNG or JPEG.

```sh
# CH-MB-11: after publishing, AT_URI is the post's at:// URI
curl -s "https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=$AT_URI" | jq '.posts[0].embed.external | {uri,title,description,thumb}'
```

`uri` is non-null, `title` and `description` are non-empty, and `thumb` is set when the page has `og:image`.

```sh
# CH-MB-14: any hit is a limit literal. Registry values and test files are excluded by path.
grep -nE '(^|[^A-Za-z0-9_.-])(280|300|3000|500|23|1000|1000000|2000000)([^A-Za-z0-9_.-]|$)' "$MB"/mb_count.mjs
grep -nE '"(twitter-text|@atproto/api)": *"[\^~]' "$MB_DEPS"/package.json
```

Neither command prints anything. Any other literal with one of those values, such as a timeout, moves into a named constant. Registry rows fail `facts_check.py` when `verified + refresh_days` is past.

```sh
# CH-MB-17: HOME_PAGE_URL is a page the posts link. At least 1
curl -sL "$HOME_PAGE_URL" | grep -ciE 'name=.fediverse:creator'
# After the first share: STATUS_ID is the status. Prints false
curl -s "https://$INSTANCE/api/v1/statuses/$STATUS_ID" | jq '.card.missing_attribution'
```

```sh
# CH-MB-18: prints the profile URL in the raw HTML
curl -sL "$HOME_PAGE_URL" | grep -oiE '<(a|link)[^>]*rel=.[^>]*me[^>]*>'
# verified_at is non-null on the website row
curl -s "https://$INSTANCE/api/v1/accounts/lookup?acct=$ACCT" | jq '.fields[] | {name,verified_at}'
```

```sh
# CH-MB-19: both DIDs match. The grep prints nothing unless the owner confirmed a granted badge
curl -s "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=$DOMAIN" | jq -r '.did'
curl -s "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=$HANDLE" | jq -r '.did'
grep -niE 'blue ?check' "$DRAFT"
```

```sh
# CH-MB-21: bridged video is within the bridge limit [BR-F02]. Prints the duration in seconds
ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO"
```

With the bridge flag set, run the CH-MB-03 counter on the Mastodon variant.

## Dated facts

Every platform limit, field, price and clause lives in [references/facts.md](references/facts.md), in one row each, with its source URL, source date and `refresh_days`. This file repeats none of them. Cite a row by id.

Every row carries `refresh_days`: 180 for hard limits, 90 for policy, API fields and label triggers, 30 for prices. `facts_check.py` fails on the first overdue row; re-fetch it, never extend the date. This skill's rows use 90, except X pricing at 30 and one authority row at 180, because microblog limits changed faster than a 180-day interval in 2026.

Run the registry check:

```sh
python3 -I "$MB"/../../channel-publishing/checks/facts_check.py "$MB"/../references/facts.md
```

## Ask a human

- Whether to open an account on a platform, which handle or domain to claim, and which Mastodon instance holds the canonical identity and the attribution domain. Until one account exists, the whole set is conditional.
- Whether to run a link-placement experiment that departs from CH-MB-07, and how much lower reach is acceptable.
- Whether to opt the project accounts into Bridgy Fed.
- Whether to pay for X Premium or verification, or to request a Bluesky blue check. With Premium, whether a post may exceed the X limit (CH-MB-02).
- Whether a release deserves a thread beyond the two-items test in CH-MB-09.
- Whether two organisations share one set of accounts or keep two. This decides how often CH-MB-16 applies.
- Any alt-text claim about product behaviour that the screenshot does not show.
- Whether to fix a site's `og:image` before the first post or accept the GitHub Release fallback (CH-MB-10).

## Agent failure modes

- Counts with `len()` or `.length`, or treats the X and Bluesky limits as one limit. CH-MB-01 catches it.
- Writes a bare `example.com/docs`, which links on X and Bluesky and is plain text on Mastodon. CH-MB-22 catches it.
- Moves the link to the first reply because older advice says so. CH-MB-07 catches it.
- Writes a numbered thread of 8 to 10 posts for a patch release. CH-MB-09 catches it.
- States how much a platform penalises links, quoting a figure from memory. CH-MB-15 catches it.
- Posts a text URL to Bluesky and expects a card, or builds facets from `indexOf`. CH-MB-11 and CH-MB-04 catch it.
- Attaches a screenshot and a link on Threads and expects a card. CH-MB-12 catches it.
- Leaves alt text empty, or writes a file name or "Screenshot of terminal". CH-MB-13 and CH-MB-23 catch it.
- Adds `fediverse:creator` without the attribution domain, or puts `rel="me"` in a JavaScript-rendered block. CH-MB-17 and CH-MB-18 catch it.
- Calls a domain handle a blue check. CH-MB-19 catches it.
- Sends one body to two X accounts. CH-MB-16 catches it.
- Sends post 2 before post 1 returned its id, or deletes and re-posts post 1 when the reply fails. CH-MB-24 catches it.

## Siblings

`linkedin-post` owns LinkedIn. `release-notes` owns the summary sentence and the GitHub Release body that post 1 lifts from (MKT-REL-14). `terminal-demo` owns recording the run behind a terminal screenshot. `launch-plan` names this skill for the release-day step and holds no platform numbers. `channel-publishing` owns the boundary, the registry format and `channels.yml`. Where `marketing-quality` is installed, claims in a post follow MKT-CLAIM. Otherwise each number in a post carries a `source:` line in the draft's notes.
