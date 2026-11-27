---
title: Exemplar YouTube channels, measured from public feeds
program: product (marketing sub-program, YouTube channel)
worker: exemplar-youtube-channels (grounding)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 482
---

# Exemplar YouTube channels

482 fetches: 30 public channel feeds (`wc -l ids.tsv` gives 30) plus 450 Shorts probes (one HTTP request per unique video id, re-run in this repair pass) plus 2 documentation pages ([Shorts help](https://support.google.com/youtube/answer/10059070), [Data API video resource](https://developers.google.com/youtube/v3/docs/videos)). Count check: 30 x 15 = 450 videos; `cat feeds/*.xml | grep -o "<yt:videoId>[^<]*" | sort -u | wc -l` gives 450. No API key. All raw files sit in `~/.cache/research-lang/exemplars/product/youtube/` (feeds, `ids.tsv`, `shorts.txt`, `rows.json`, `out.txt`); the analysis script is `~/.cache/research-lang/exemplars/product/scripts/yt_analyze.py` and is reproduced in the appendix.

## Method

1. Channel ids resolved from handle pages: `curl -sL -b 'SOCS=CAI' "https://www.youtube.com/@<handle>" | grep -o '<link rel="canonical" href="https://www.youtube.com/channel/UC[A-Za-z0-9_-]*'`. The first match on the page body (`grep -o 'channel_id=UC...'`) is wrong: it returned a different channel for 9 of the first 29 handles resolved before Grafana was added as the 30th (for example "Jon Meyers" for Supabase, "ordyne" for Svelte). Every channel name was verified against the feed's `<name>` element (table below). Feed source per [YouTube RSS feed](https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA) (Fireship, sample).
2. Feed: `curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=<id>" -o feeds/<name>.xml`. Returns the newest 15 videos with title, `published`, description and `media:statistics views`. Run date 2026-11-27, so view counts are a same-day snapshot.
3. Shorts: `curl -s -o /dev/null -w %{http_code} https://www.youtube.com/shorts/<videoId>`. HTTP 200 means Short; 303 (redirect to /watch) means long-form. Documentation: Shorts are "up to 3 minutes long" per [YouTube Help](https://support.google.com/youtube/answer/10059070) (fetched 2026-11-27), which says nothing about the /shorts/ redirect; the [Data API video resource](https://developers.google.com/youtube/v3/docs/videos) lists no Shorts flag. So the probe stays an observed behaviour, not a documented one. Result: `awk '{print $2}' shorts.txt | sort | uniq -c` gave 66 x 200 and 318 x 303 on the first pass (384 probes, before the corpus was corrected). The repair pass re-probed every one of the 450 unique video ids: `cat feeds/*.xml | grep -o "<yt:videoId>[^<]*" | sed "s/.*>//" | sort -u | xargs -P 24 -I{} sh -c 'echo {} $(curl -s -o /dev/null -w "%{http_code}" https://www.youtube.com/shorts/{})' > shorts_450.txt`, then `awk '{print $2}' shorts_450.txt | sort | uniq -c` gave 77 x 200 and 373 x 303 (77 of 450, 17%), identical per video to the prior `shorts.txt` (474 lines incl. 24 stale ids from the superseded corpus, `diff` of the two sorted, filtered lists is empty). The feed does not flag Shorts; this probe is an inference from the redirect, not a documented field.
4. Analysis: `cd ~/.cache/research-lang/exemplars/product/youtube && python3 -I ../scripts/yt_analyze.py > out.txt`. All tables below are copied from `out.txt`.

Corpus: 30 channels, 450 videos, groups company 14, educator 10, open-source/foundation 6 (in `ids.tsv`, `cut -f3 ids.tsv | sort | uniq -c`). `grep -c '<entry>' feeds/*.xml` gives 15 for every channel.

Definitions (regexes live in the script): title length is characters of the feed title. Chapters = at least 3 description lines starting with a timestamp and the first being 0:00. Link-in-first-3 = `http` in the first three non-empty description lines. Question = `?` in title. Number = any digit in title. How-to = `how to|how i|tutorial|guide|learn|beginner`. Versus = `vs|versus`. Announcement = `introducing|announc|launch|release|vX.Y|now available|is here|what's new|changelog|new` (the word `new` makes this loose; the OSS value of 24% is inflated by it). Ratio = video views divided by that channel's median over its 15 videos.

## Corpus and per-channel measurements

Command: `python3 -I ../scripts/yt_analyze.py | sed -n '/^CHANNELS/,/^GROUPS/p'`. Columns: n videos; gap = median days between consecutive uploads in the 15-video window; newest = days since latest upload; title chars p25/median/p75; desc = median description chars; chap, link3, shorts, Q, num, how, vs, ann = counts out of 15; med views; max ratio = best video / channel median.

| Channel | Group | gap d | newest d | title p25/med/p75 | desc | chap | link3 | shorts | Q | num | how | ann | med views | max ratio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PostHog | company | 2.9 | 0 | 37/42/50 | 108 | 3 | 7 | 8 | 0 | 6 | 0 | 7 | 2264 | 44.5 |
| Tailscale | company | 5.7 | 0 | 37/45/56 | 1250 | 12 | 2 | 1 | 0 | 3 | 0 | 0 | 12565 | 18.3 |
| Fly.io | company | 0.0 | 72 | 33/36/41 | 0 | 3 | 3 | 12 | 4 | 0 | 1 | 2 | 287 | 5.4 |
| GitHub | company | 0.5 | 0 | 51/58/69 | 1718 | 8 | 5 | 5 | 3 | 3 | 1 | 2 | 3848 | 5.0 |
| Cloudflare Developers | company | 0.3 | 6 | 43/63/86 | 926 | 4 | 13 | 2 | 0 | 10 | 1 | 0 | 4227 | 71.6 |
| Astro | company | 6.5 | 356 | 32/33/37 | 576 | 1 | 8 | 0 | 0 | 11 | 1 | 0 | 399 | 9.4 |
| Deno | company | 4.4 | 248 | 28/50/65 | 384 | 1 | 11 | 5 | 0 | 3 | 0 | 3 | 2748 | 6.7 |
| Zed Industries | company | 7.8 | 2 | 20/32/48 | 206 | 1 | 10 | 0 | 0 | 1 | 1 | 4 | 7163 | 44.1 |
| Supabase | company | 3.5 | 1 | 29/34/48 | 929 | 5 | 9 | 6 | 2 | 7 | 0 | 2 | 4352 | 7.2 |
| JetBrains | company | 0.2 | 0 | 35/58/74 | 263 | 1 | 0 | 11 | 4 | 5 | 0 | 4 | 2761 | 26.3 |
| HashiCorp | company | 6.7 | 121 | 51/57/67 | 949 | 3 | 3 | 0 | 0 | 12 | 0 | 0 | 759 | 2.0 |
| Prisma | company | 0.2 | 13 | 56/64/78 | 2720 | 9 | 2 | 4 | 3 | 8 | 2 | 0 | 339 | 3.1 |
| Vercel | company | 0.0 | 3 | 54/59/66 | 10 | 2 | 0 | 0 | 3 | 2 | 0 | 0 | 1416 | 5.8 |
| Grafana | company | 0.1 | 0 | 65/80/92 | 2058 | 10 | 1 | 0 | 0 | 5 | 0 | 1 | 249 | 17.6 |
| Fireship | educator | 2.5 | 1 | 44/49/63 | 369 | 0 | 15 | 0 | 3 | 5 | 0 | 2 | 1951376 | 1.4 |
| ThePrimeagen | educator | 19.1 | 112 | 15/22/32 | 212 | 2 | 13 | 7 | 3 | 0 | 1 | 0 | 191612 | 10.0 |
| Theo - t3.gg | educator | 1.4 | 2 | 24/33/35 | 424 | 0 | 15 | 2 | 2 | 3 | 0 | 3 | 234130 | 2.3 |
| Traversy Media | educator | 4.5 | 1 | 35/40/51 | 709 | 10 | 11 | 3 | 3 | 5 | 0 | 0 | 51552 | 2.8 |
| DevOps & AI Toolkit | educator | 7.0 | 3 | 52/62/68 | 2507 | 15 | 0 | 0 | 1 | 6 | 3 | 0 | 6595 | 2.9 |
| TechWorld with Nana | educator | 6.0 | 2 | 45/57/72 | 1467 | 6 | 7 | 7 | 1 | 5 | 2 | 2 | 31838 | 20.3 |
| Dreams of Code | educator | 19.0 | 23 | 40/48/60 | 1366 | 6 | 14 | 0 | 0 | 4 | 1 | 0 | 88198 | 4.5 |
| No Boilerplate | educator | 47.4 | 19 | 20/33/40 | 1676 | 0 | 12 | 0 | 0 | 4 | 3 | 1 | 98127 | 1.9 |
| Let's Get Rusty | educator | 1.0 | 0 | 34/43/50 | 465 | 1 | 15 | 0 | 0 | 2 | 4 | 1 | 38334 | 2.9 |
| ByteByteGo | educator | 21.0 | 35 | 25/36/49 | 183 | 1 | 12 | 2 | 4 | 2 | 2 | 0 | 57452 | 3.0 |
| CNCF | oss | 0.0 | 1 | 60/82/90 | 968 | 0 | 13 | 2 | 0 | 3 | 0 | 3 | 777 | 3.5 |
| Svelte Society | oss | 7.0 | 0 | 40/56/71 | 0 | 0 | 0 | 0 | 0 | 15 | 0 | 11 | 1138 | 10.6 |
| NuxtLabs | oss | 99.6 | 741 | 25/29/39 | 246 | 0 | 13 | 0 | 0 | 3 | 0 | 3 | 2999 | 9.5 |
| OpenSSF | oss | 4.0 | 7 | 34/35/47 | 328 | 1 | 5 | 0 | 0 | 13 | 0 | 0 | 44 | 3.5 |
| Kubernetes | oss | 0.1 | 1 | 36/40/51 | 40 | 0 | 0 | 0 | 0 | 15 | 0 | 4 | 46 | 2.8 |
| Rust Foundation | oss | 0.0 | 3 | 63/81/96 | 151 | 0 | 10 | 0 | 1 | 10 | 0 | 1 | 1682 | 4.9 |

Corrections to the table's own limits: the "gap" figure is 0.0 for Fly.io, Vercel, CNCF and Rust Foundation because the feed holds batches posted within the same day (Fly.io: 12 of 15 are Shorts); read it with the `newest` column. `newest` is negative for JetBrains and Grafana only through UTC date rounding. Kubernetes and OpenSSF titles carry meeting dates (`2026-11-19T16:01:03Z.mp4`), which is why `num` is 15/15 and 13/15; the number-in-title pattern is meaningless there. Svelte Society's feed carries empty descriptions (median 0 chars). Channel group is a judgment call: Svelte Society, CNCF and the Rust Foundation are community or foundation channels, not project-owned; Zed, Astro, Deno, Prisma, Supabase are company-run developer-tool channels.

Mismatch notes (what was tried and rejected): the handle `@Fireship` page first returned "Beyond Fireship", `@DevOpsToolkit` returned "DevOps Paradox", `@zeddotdev` is the editor (`@ZedIndustries` is a thermoforming channel: "Heavy Gauge Thermoforming"), `@flyio` is a stale unrelated channel (last upload 689 days earlier; DayZ gaming videos), `@flydotio` is the company. Searches for Svelte (official), Bun, Nuxt (official) and Home Assistant returned a wrong, empty or inconsistent channel; they were replaced, not guessed. Anyone re-running the corpus must repeat the `<name>` check.

## Group comparison

Command: `python3 -I ../scripts/yt_analyze.py | sed -n '/^GROUPS/,/^FEATURE/p'`.

| Measure | Company (14 ch, 210 videos) | Educator (10 ch, 150) | OSS/foundation (6 ch, 90) |
|---|---|---|---|
| Median of channels' median gap between uploads (days) | 2.9 | 6.5 | 4.0 |
| Median title length (characters) | 51 | 42.5 | 49.5 |
| Median description length (characters) | 754 | 631 | 151 |
| Has numeral in title | 36% | 24% | 66% (dates, see above) |
| Question title | 9% | 11% | 1% |
| How-to / tutorial / guide word | 3% | 11% | 1% |
| Versus in title | 0% | 2% | 0% |
| Announcement words | 12% | 6% | 24% (loose regex) |
| Description has chapters | 30% | 27% | 1% |
| Link in first three description lines | 35% | 76% | 46% |
| Short (HTTP 200 probe) | 26% | 14% | 2% |
| Median of channel-median views | 2,506 | 72,825 | 958 |

Reading it: company channels upload more often, write longer titles, use Shorts nearly twice as often as educators, put a link in the first three lines about half as often (35% vs 76%), and draw a median 2,506 views per video against 72,825 for educators (29x, 72,825 / 2,506). Companies almost never use how-to wording in titles (3%, 7 of 210). Description length does not separate company from educator (754 vs 631 characters); chapters do not either (30% vs 27%). Source of the 29x: the group row is the median of per-channel median views, a median over 14 and 10 channels, so a handful of mega-channels (Fireship 1.95M) lifts the educator side; the ratio is descriptive of this corpus, not a population estimate.

## What correlates with beating the channel's own median

Command: `python3 -I ../scripts/yt_analyze.py | sed -n '/^FEATURE/,/^TOP/p'`. Long-form only (Shorts removed, n = 373). "Ratio" is video views over that channel's median; 1.00 is the channel's typical video. "ch has>not" counts channels where the feature-carrying videos had a higher median ratio than those without it, over channels having both.

| Feature (all groups) | median ratio with | median ratio without | n with | channels has>not |
|---|---|---|---|---|
| Question title | 0.99 | 1.00 | 23 | 6/11 |
| Number in title | 1.00 | 1.00 | 153 | 11/26 |
| How-to words | 1.14 | 1.00 | 24 | 10/14 |
| Versus | 0.87 | 1.00 | 2 | 0/1 |
| Announcement words | 1.07 | 1.00 | 45 | 9/18 |
| Chapters | 1.04 | 1.00 | 105 | 11/20 |
| Link in first three lines | 1.04 | 1.00 | 203 | 12/20 |

Company channels alone: how-to 1.54 (n = 7, 5 of 6 channels), announcement 4.94 (n = 18, 5 of 8 channels), link in first 3 lines 1.15, chapters 1.00. Educator channels alone: how-to 1.04, chapters 1.08, number 1.00, question 0.97. Other splits: title length buckets (`titlelen` lines in the output) by median ratio: under 30 chars 1.12 (n = 55), 30-49 1.06 (n = 146), 50-69 0.99 (n = 104), 70+ 1.00 (n = 68). Shorts: median ratio 0.64 (n = 77) against 1.00 for long-form (n = 373). Newest 14 days: 1.00 (n = 107) against 1.04 for older (n = 266), so age is not driving the ratios in this snapshot, but ages in the 15-video window are mostly short.

The strong, plain result is that no title feature moves the median by more than about 14% except announcements for companies, and that one is driven by outliers: the top four company videos are "Introducing Scouts in PostHog" (44.5x), "Zed is 1.0" (44.1x), "DeltaDB: A New System of Record for Agents" (21.1x) and "Meet the New Grafana UI | Now in Public Preview" (17.6x). Evidence of the mechanism: those are launch events with named product milestones (1.0, public preview, "Introducing"). Command for the list: `python3 -I ../scripts/yt_analyze.py | grep '^TOP\|^BOT'`. Outperformers outside the announcement type: Tailscale's conference keynote (18.3x) and a farewell piece (18.0x), Nana's "MCP Explained Simply — What It Is and Why It Exists" (20.3x; a concept explainer, 85 days old), Nuxt "Nuxt Content in 3 minutes" and "Nuxt 3 with Supabase in 5 min" (9.5x, 9.2x, durations in the title, over 1,600 days old, so they are search-driven evergreens). Bottom of the range (ratio under 0.2): live streams, SIG meeting recordings, conference talks, a "Live Stream" title (GitHub Copilot Day 0.0, Rust Foundation Live Stream 0.0, Kubernetes SIG Autoscaling 0.17). Live and recorded meetings underperform the channel's median.

Statistical caution: 15 videos per channel, 30 channels, no control for thumbnail, topic, promotion or recency. A feature with n under 25 (how-to 24, question 23, versus 2) cannot be called a finding. Number-in-title shows no lift (1.00 vs 1.00) in a corpus where 41% of titles contain a digit; for the OSS group digits are dates, not hooks.

## Observed practice (descriptive, not evaluated)

- Educators with big audiences hold a link in the first three lines: Fireship 15/15, Theo 15/15, Let's Get Rusty 15/15, Dreams of Code 14/15, ThePrimeagen 13/15. Those first lines are mostly a sponsor link (Fireship's newest video: `Start a free 14-day CodeRabbit Explain trial ...: https://coderabbit.link/fireship-012`) or the channel's own product (`https://fireship.dev`). Company channels place a link there in 0-13 of 15; the median is about a third.
- Chapters are a minority practice: 105 of 373 long-form videos (28%); two channels use them near-universally (DevOps & AI Toolkit 15/15, Traversy 10/15); Fireship, Theo, No Boilerplate use none.
- Title length median is 22-82 characters across channels (ThePrimeagen 22, CNCF and Rust Foundation 81-82, Grafana 80). Educators known for short titles (ThePrimeagen 22, No Boilerplate 33, Theo 33) win on volume; the three longest medians are foundation and enterprise channels with the lowest median views (CNCF 777, Grafana 249, Rust Foundation 1,682). That co-occurrence does not show length causes it.
- Shorts: 77 of 450 (17%). Heavy use at PostHog (8/15), Fly.io (12/15) and JetBrains (11/15). No educator exceeds 7/15. Shorts do not outperform the channel median (0.64).
- Cadence: PostHog, Cloudflare Developers, GitHub, JetBrains and Prisma publish within days (median gap 0.2-2.9); educators vary from Let's Get Rusty (1.0 d) to No Boilerplate (47.4 d), and No Boilerplate still reaches 98,127 median views. Volume does not track views here.
- Content type of the company channels' top videos: product launches and keynotes. Content type of the best educator videos: explainers for a concept.

## What could not be measured without the API or a browser

- Thumbnail content, text, faces, color (only the file URL is in the feed; viewing 450 images is outside this audit's claims).
- Retention, average view duration, click-through rate, impressions, traffic source, subscriber conversion (Studio-only metrics).
- Per-video duration (not in the feed; Shorts are only inferred via the redirect probe) and exact publish time effect.
- Live status and premiere state (the live-stream signal above comes from title text only).
- Likes and comments counts beyond the star-rating element; subscriber counts per channel; video age beyond what the feed's 15 items cover; any history deeper than the latest 15 uploads. A channel with many Shorts has fewer long-form videos in its window (Fly.io: 3 long-form).
- Whether view counts include paid promotion.

## Fleet evidence

The frame (`/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-frame.md:27`) names YouTube a target channel, and proposes a `youtube-video` skill at line 74. Presence of the fleet on YouTube was checked with: `cd /home/mherwig/dev && grep -rniE 'youtube\.com|youtu\.be' --include='*.md' --include='*.mdx' --include='*.astro' --include='*.toml' --include='*.yml' --include='*.json' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=.agents .`. Result: one hit, `ocx-sh/ocx/.claude/artifacts/research_test_tier_tooling.md:24`, a link to someone else's BazelCon talk. No site, README or config in the fleet links a YouTube channel. `cd /home/mherwig/dev && ls -d ocx-sh/*/README.md grimoire-rs/*/README.md | wc -l` gives 17 and `grep -il youtube ocx-sh/*/README.md grimoire-rs/*/README.md | wc -l` gives 0 of those 17 (scope: top-level README of each repo directly under ocx-sh/ and grimoire-rs/). The grep above excludes only `.agents`, `.git`, `node_modules`, `target`, so `.claude/artifacts` is in scope; `grep -rli youtube --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=.agents .` lists exactly two files: that artifact and the generated schema JSON. `grep -rniE '<iframe|<video|youtube' --include='*.astro' --include='*.mdx' --include='*.md' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=.agents -l .` from `/home/mherwig/dev` returns 3 files: the BazelCon artifact, `grimoire-rs/indexer/docs/ops/upgrade-notes.md` and `ocx-sh/website/examples/starlight/src/components/showcase/Stories.astro` (Stories.astro:71,76,88 are component-preview iframes pointing at local routes; upgrade-notes.md:288 is a sanitizer error message naming `<iframe>`; neither embeds or links YouTube). The only other string match is `grimoire-rs/grimoire/docs/.astro/collections/docs.schema.json:248` ("youtube" as a Starlight social-icon enum value, generated). The fleet has no measured YouTube presence; for this program the fleet is a greenfield, and adopters are advised by the exemplars, not by existing channel practice.

## Smells

Ranked by how likely they are to mislead an agent that encodes them.

1. Handle-to-channel resolution is a trap. A naive scrape returned the wrong channel for 9 of the first 29 handles and every plausible handle for an official project can be a squatter (a stale `@flyio`, a thermoforming `@ZedIndustries`). Any skill that tells an agent to "look at the competitor's channel" needs a verify-the-name step.
2. Per-channel medians hide the audience gap: companies' median video is 2,506 views, educators' 72,825. Advice drawn from educator practice (hooks, thumbnails, volume) is not evidence for a developer-tool company channel with a 1k-view median.
3. Title-feature "lift" is near 1.00 for every feature but announcements (company) and how-to (n = 24); anything sharper would be overfitting 15-video windows.
4. Live streams, SIG meetings and recorded conference talks sit at the bottom (ratios 0.0-0.18); they depress company medians and make "views per video" a poor performance metric for them.
5. Companies run Shorts at 26% of uploads with a 0.64 median ratio against the channel; PostHog and Fly.io run 53% and 80%. Shorts volume is large and its effect on the channel's own long-form median is not measurable here.
6. 15-item feed windows mean "cadence" is observed over 6 days (JetBrains, CNCF) to 3,623 days (NuxtLabs); the full span list follows. Command: `python3 -I yt_span.py` over `rows.json` (`now - min(published)` per channel, in days; sorted: JetBrains 6, CNCF 6, Kubernetes 7, GitHub 8, Grafana 8, Theo 23, LetsGetRusty 27, CloudflareDevelopers 33, Vercel 35, Fireship 37, Prisma 41, PostHog 56, RustFoundation 56, Supabase 64, TraversyMedia 72, OpenSSF 72, SvelteSociety 82, Tailscale 90, Fly.io 93, TechWorldwithNana 94, DevOpsToolkit 97, HashiCorp 248, Zed 297, Deno 325, DreamsOfCode 331, ByteByteGo 385, NoBoilerplate 624, ThePrimeagen 882, Astro 895, NuxtLabs 3623); cadence numbers across channels are not comparable without that column.
7. Descriptions are inconsistent: 0 chars (Svelte Society), 10 chars (Vercel) up to 2,720 (Prisma); chapters appear in 28% of long-form videos.

## Patterns worth encoding

Each with a check an agent can run on a draft; none is a finding about reach, only about what exemplars do.

- Put the destination link (the one URL the video exists to send people to) in the first three non-empty description lines. Check: `printf '%s' "$desc" | grep -v '^[[:space:]]*$' | head -3 | grep -c 'https\?://'` is at least 1. Exemplar data: 76% of educator videos do, 35% of company videos do, link3 videos 1.04 vs 1.00 in median ratio, 12 of 20 channels higher.
- Add chapters (a first line `0:00`, at least three timestamp lines) to any video over roughly ten minutes. Check: the description has a line matching `^0?0:00` and at least two more `^\d{1,2}:\d{2}` lines. Exemplar data: 28% of long-form uses them; lift 1.04, 11 of 20 channels, so low-stakes; the case is findability, not a measured gain.
- Title for launches: name the product and the milestone (`Zed is 1.0`, `Introducing Scouts in PostHog`, `Meet the New Grafana UI | Now in Public Preview`). Check: a title contains the product name and one of a short list of milestone words (`1.0`, `introducing`, `now in`, `new`). Exemplar data: company announcement videos median ratio 4.94 (n = 18, 5 of 8 channels higher).
- Titles under 50 characters. Check: `len(title) < 50`. Exemplar data: under-30 median ratio 1.12, 30-49 1.06, 50-69 0.99; weak, small effect, offered because it is cheap to verify.
- Keep recorded meetings and live-stream replays out of the primary upload feed or give them a descriptive title and date; their ratio 0.0-0.18 drags the channel median. Check: title does not match `Live Stream|Weekly|SIG|\.mp4`.
- Dated or duration-stamped evergreen titles (`in 3 minutes`, `in 5 min`) outlive their date: two Nuxt videos at 9.5x and 9.2x are over 1,600 days old.
- Verify that the handle resolves to the right channel before measuring a competitor: compare `<name>` in the feed to the intended brand.

## What this contradicts in the frame

- The frame lists a `youtube-video` skill (line 74) built around title, thumbnail, hook, structure, description. Only title and description are measurable from public no-key data; thumbnail and hook are not, so the checkable part of that skill is narrower than the frame implies. Retention and click-through cannot be verified at all outside Studio.
- The frame treats YouTube as a channel the fleet is on (line 27 lists it as a platform channel). Measured: the fleet has no YouTube presence in any README, site or config (0 of 17 READMEs, command above; 1 incidental link to a third-party talk). It is a net-new channel, not an existing one.
- The frame's implied benchmark of "channels run by software companies" does not behave like educator channels. Company median video is 2,506 views, educator 72,825, OSS 958; companies post more often and use Shorts more. An OCX or Grimoire channel should expect a company-sized audience, not an educator-sized one.
- A common assumption that titles with numbers, questions or "vs" outperform is not supported: number 1.00 vs 1.00, question 0.99 vs 1.00, versus appears in 2 of 450 titles. Do not encode these as rules; the only measured outperformers are launch-milestone titles and concept explainers.
- Descriptions are not a differentiator by length (company 754 vs educator 631 characters); the measured difference is where the first link sits.

## Appendix: commands

```
# fetch (per row of ids.tsv)
while IFS=$'\t' read n id g; do curl -s -m 20 "https://www.youtube.com/feeds/videos.xml?channel_id=$id" -o feeds/$n.xml; done < ids.tsv
# shorts probe
grep -ho '<yt:videoId>[^<]*' feeds/*.xml | sed 's/.*>//' | sort -u > vids.txt
cat vids.txt | xargs -P 16 -I{} sh -c 'echo "{} $(curl -s -o /dev/null -m 15 -w %{http_code} https://www.youtube.com/shorts/{})"' > shorts.txt
# analysis
python3 -I ../scripts/yt_analyze.py > out.txt
```

ids.tsv (name, channel id, group):

```
PostHog	UCn4mJ4kK5KVSvozJre645LA	company
Tailscale	UCcdv38QxPjSMqbt5ffLhJLA	company
Fly.io	UCTDUhAaDUTy83xQoUMvKd8w	company
GitHub	UC7c3Kb6jYCRj4JOHHZTxKsQ	company
CloudflareDevelopers	UC3QIolTSR29ba4_u15vtEUQ	company
Astro	UCeFjmvZEK-MoefuYXptnX6A	company
Deno	UCqC2G2M-rg4fzg1esKFLFIw	company
Zed	UCXYwRX_RB_qQ7sij1sgW-Cg	company
Supabase	UCNTVzV1InxHV-YR0fSajqPQ	company
JetBrains	UCGp4UBwpTNegd_4nCpuBcow	company
HashiCorp	UC-AdvAxaagE9W2f0webyNUQ	company
Prisma	UCptAHlN1gdwD89tFM3ENb6w	company
Vercel	UCLq8gNoee7oXM7MvTdjyQvA	company
Fireship	UCsBjURrPoezykLs9EqgamOA	educator
ThePrimeagen	UC8ENHE5xdFSwx71u3fDH5Xw	educator
Theo	UCbRP3c757lWg9M-U7TyEkXA	educator
TraversyMedia	UC29ju8bIPH5as8OGnQzwJyA	educator
DevOpsToolkit	UCfz8x0lVzJpb_dgWm9kPVrw	educator
TechWorldwithNana	UCdngmbVKX1Tgre699-XLlUA	educator
DreamsOfCode	UCWQaM7SpSECp9FELz-cHzuQ	educator
NoBoilerplate	UCUMwY9iS8oMyWDYIe6_RmoA	educator
LetsGetRusty	UCSp-OaMpsO8K0KkOqyBl7_w	educator
ByteByteGo	UCZgt6AzoyjslHTC9dz0UoTw	educator
CNCF	UCvqbFHwN-nwalWPjPUKpvTA	oss
SvelteSociety	UCZSr5B0l07JXK2FIeWA0-jw	oss
NuxtLabs	UCJ9jj5YMzo-HsyM6WG9Q_Lg	oss
OpenSSF	UCUdhiXNEBEayowJXY_v7AXQ	oss
Kubernetes	UCZ2bu0qutTOM0tHYa_jkIwg	oss
RustFoundation	UC0jzvznwtnsdXYIp415oC9g	oss
Grafana	UCYCwgQAMm9sTJv0rgwQLCxw	company
```

analysis script `yt_analyze.py`:

```python
import sys, re, json, statistics as st, xml.etree.ElementTree as ET, datetime as dt, html
ns={'a':'http://www.w3.org/2005/Atom','m':'http://search.yahoo.com/mrss/','y':'http://www.youtube.com/xml/schemas/2015'}
shorts={l.split()[0]:l.split()[1]=='200' for l in open('shorts.txt')}
rows=[];chan=[]
for l in open('ids.tsv'):
    n,i,g=l.rstrip('\n').split('\t')
    r=ET.parse(f'feeds/{n}.xml').getroot()
    vs=[]
    for e in r.findall('a:entry',ns):
        vid=e.find('y:videoId',ns).text; t=e.find('a:title',ns).text or ''
        p=dt.datetime.fromisoformat(e.find('a:published',ns).text)
        mg=e.find('m:group',ns); d=mg.find('m:description',ns).text or ''
        v=int(mg.find('m:community/m:statistics',ns).get('views'))
        vs.append(dict(ch=n,g=g,vid=vid,t=t,p=p,d=d,v=v,short=shorts.get(vid,False)))
    med=st.median(x['v'] for x in vs)
    now=dt.datetime(2026,11,27,tzinfo=dt.timezone.utc)
    for x in vs:
        x['ratio']=x['v']/med if med else 0
        x['age']=(now-x['p']).days
        L=[s for s in x['d'].splitlines() if s.strip()][:3]
        x['link3']=any('http' in s for s in L)
        ts=[s for s in x['d'].splitlines() if re.match(r'^\s*[\(\[]?\d{1,2}:\d{2}',s)]
        x['chap']=len(ts)>=3 and bool(re.match(r'^\s*[\(\[]?0{1,2}:00',ts[0]))
        t=x['t']
        x['q']='?' in t; x['num']=bool(re.search(r'\d',t))
        x['how']=bool(re.search(r'\bhow (to|i|do|does|we)\b|tutorial|guide|learn|beginner',t,re.I))
        x['vs']=bool(re.search(r'\bvs\.?\b|versus',t,re.I))
        x['ann']=bool(re.search(r'introducing|announc|launch|release|\bv?\d+\.\d+|now available|is here|what.s new|changelog|\bnew\b',t,re.I))
        x['tl']=len(t); x['dl']=len(x['d'])
    rows+=vs
    ps=sorted(x['p'] for x in vs)
    gaps=[(b-a).total_seconds()/86400 for a,b in zip(ps,ps[1:])]
    chan.append(dict(ch=n,g=g,n=len(vs),span=(now-ps[0]).days,gapmed=st.median(gaps) if gaps else None,
      per30=len(vs)/max((now-ps[0]).days,1)*30,newest=(now-ps[-1]).days,
      tl=st.median(x['tl'] for x in vs),tl25=sorted(x['tl'] for x in vs)[len(vs)//4],tl75=sorted(x['tl'] for x in vs)[3*len(vs)//4],
      dl=st.median(x['dl'] for x in vs),chap=sum(x['chap'] for x in vs),link3=sum(x['link3'] for x in vs),
      sh=sum(x['short'] for x in vs),med=med,maxr=max(x['ratio'] for x in vs),
      q=sum(x['q'] for x in vs),num=sum(x['num'] for x in vs),how=sum(x['how'] for x in vs),vsn=sum(x['vs'] for x in vs),ann=sum(x['ann'] for x in vs)))
json.dump([{k:(str(v) if k=='p' else v) for k,v in x.items()} for x in rows],open('rows.json','w'))
print('CHANNELS');
print('ch|g|n|days_since_oldest|median_gap_d|newest_age_d|tl_p25/med/p75|desc_med|chap|link3|shorts|Q|num|how|vs|ann|med_views|max_ratio')
for c in chan: print('|'.join(str(round(v,1) if isinstance(v,float) else v) for v in [c['ch'],c['g'],c['n'],c['span'],c['gapmed'],c['newest'],f"{c['tl25']}/{c['tl']}/{c['tl75']}",c['dl'],c['chap'],c['link3'],c['sh'],c['q'],c['num'],c['how'],c['vsn'],c['ann'],c['med'],c['maxr']]))
print('GROUPS')
for g in ['company','educator','oss']:
    R=[x for x in rows if x['g']==g]; C=[c for c in chan if c['g']==g]
    print(g,'channels',len(C),'videos',len(R),'median_gap_of_medians',round(st.median(c['gapmed'] for c in C if c['gapmed']),1),
      'title_len_med',st.median(x['tl'] for x in R),'desc_len_med',st.median(x['dl'] for x in R),
      *[f"{k}%={round(100*sum(x[k] for x in R)/len(R))}" for k in ['q','num','how','vs','ann','chap','link3','short']],
      'median_of_channel_median_views',st.median(c['med'] for c in C))
print('FEATURE LIFT (pooled ratio-to-channel-median, long-form only, has vs not; and #channels where has>not)')
L=[x for x in rows if not x['short']]
for grp in [None,'company','educator','oss']:
  S=[x for x in L if grp is None or x['g']==grp]
  for k in ['q','num','how','vs','ann','chap','link3']:
    a=[x['ratio'] for x in S if x[k]]; b=[x['ratio'] for x in S if not x[k]]
    pos=tot=0
    for c in {x['ch'] for x in S}:
        aa=[x['ratio'] for x in S if x['ch']==c and x[k]]; bb=[x['ratio'] for x in S if x['ch']==c and not x[k]]
        if aa and bb: tot+=1; pos+= st.median(aa)>st.median(bb)
    print(grp or 'all',k,'n_has',len(a),'med_has',round(st.median(a),2) if a else None,'n_not',len(b),'med_not',round(st.median(b),2) if b else None,'channels_has>not',f'{pos}/{tot}')
# shorts
a=[x['ratio'] for x in rows if x['short']]; b=[x['ratio'] for x in rows if not x['short']]
print('shorts n',len(a),'med ratio',round(st.median(a),2) if a else None,'long n',len(b),'med',round(st.median(b),2))
# title length bins
for lo,hi in [(0,30),(30,50),(50,70),(70,200)]:
    a=[x['ratio'] for x in L if lo<=x['tl']<hi]; print('titlelen',lo,hi,len(a),round(st.median(a),2) if a else None)
# age
newer=[x['ratio'] for x in L if x['age']<=14]; older=[x['ratio'] for x in L if x['age']>14]
print('age<=14d n',len(newer),'med ratio',round(st.median(newer),2),'older n',len(older),'med',round(st.median(older),2))
# top ratio videos
for x in sorted(L,key=lambda x:-x['ratio'])[:12]: print('TOP',x['ch'],round(x['ratio'],1),x['age'],x['t'][:90])
for x in sorted(L,key=lambda x:x['ratio'])[:6]: print('BOT',x['ch'],round(x['ratio'],2),x['age'],x['t'][:90])
```
