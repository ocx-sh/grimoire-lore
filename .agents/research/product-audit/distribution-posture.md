---
title: Distribution posture of the OCX and Grimoire fleet (discoverability, release communication, channels)
program: product (sub-programs ux and marketing), grounding wave
worker: distribution-posture (grounding worker)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 520
---

# Distribution posture of the fleet

Measured 2026-11-27 from the local clones under `/home/mherwig/dev` and from the live sites. `sources_fetched` is approximate: 413 sitemap URLs fetched by `crawl.py`, 90 release bodies fetched by `rel.sh`, and about 17 single probes and platform documents. This is a repair pass: the earlier version was re-measured end to end, and three of its figures were wrong and are corrected (listed in "What changed in this repair").

**Reproducibility.** Every measurement names a script. The full text of each script is in "Appendix: scripts" at the end of this file (the fleet is read-only and this is the only file written, so the scripts live here). To re-run, save each appendix block under its heading name, for example `rel.sh`, in an empty directory, then run the invocation shown next to the number. Scripts need `gh` (authenticated), `git`, `curl`, `dig`, `python3`. `repos.txt` is the 17-line list printed in the appendix.

**The base, reconciled.** The earlier version used three bases (14, 12, 17). One base is used now.

| Base | Count | How measured |
|---|---|---|
| Public repositories in the two GitHub orgs | 35 (6 are forks, 29 are original work) | `bash org.sh` (appendix A6): 25 public in `ocx-sh` plus 10 in `grimoire-rs`; `ocx-sh/marketing` is private and excluded |
| **Local fleet: cloned under `/home/mherwig/dev`, all public** | **17** (12 `ocx-sh`, 5 `grimoire-rs`) | `repos.txt`; every row of `bash repoinfo.sh repos.txt` prints `PUBLIC` |
| Original-work public repos not cloned locally | 12 (7 `ocx-sh`, 5 `grimoire-rs`) | `bash org.sh` minus `repos.txt`; their release counts are in section 1 |

Unless a row says otherwise, "of N" below means N of the 17 local clones. The local checkout `grimoire-rs/vscode` has the remote `grimoire-rs/grimoire-vscode` (`git -C /home/mherwig/dev/grimoire-rs/vscode remote get-url origin`); the release scripts use the remote name.

## What changed in this repair

| Earlier claim | Now measured | Command |
|---|---|---|
| ocx.sh sets `twitter:card=summary_large_image` on 298 of 298 sitemap pages | 128 of 298. The 170 `/catalog/` pages declare `twitter:card=summary` instead. `og:image` is on 0 of 298 either way | `python3 -I crawl.py https://ocx.sh/<section>/sitemap-index.xml`, column `tw-large` (A8) |
| YouTube: no channel exists | A channel named "ocx" exists at `https://www.youtube.com/@ocx-sh` with 2 videos, both published 2026-11-17, not linked from any repository | see section 4 |
| `ocx-sh` org profile has no email | Public email `contact@michael-herwig.de` | `gh api users/ocx-sh -q '[.followers,.blog,.description,.email]'` |
| 7 indexbot bodies contain only a compare link, "8 of 10 www-setup bodies carry bare hashes", "0 of 20 flagship bodies has a migration note" | indexbot 7 of 10 confirmed; www-setup 9 of 10 with 2 to 26 hash-shaped words; migration is per BREAKING entry (below) | `relstats.py`, `bullets.sh` |
| Median gaps www-setup 14.0, rules_ocx 17.5, vscode 3.1, website 2.5 | 12.0, 13.6, 2.7, 2.1 (fractional days; the earlier run rounded to whole days) | `python3 -I relstats.py rel` |
| Local resolver gave 65.108.2.88 with a 401 | The local resolver now returns the stale A 65.108.2.88 and AAAA 2a01:4f9:6a:5183::2 and the TLS handshake fails (curl error 60); authoritative answer unchanged | section 5 |

## Headline

1. The fleet has almost no channel presence outside GitHub and its own docs. Channels that exist (section 4): two GitHub orgs, a Discord server with 5 members and 0 online, a YouTube channel "ocx" with 2 videos (12 and 7 views), two personal LinkedIn profiles (no company page found), and the npm, PyPI and OCX/Grimoire registries. No newsletter, blog, RSS or Atom feed, X, Mastodon, Bluesky or Reddit presence was found, and no repository or site links the YouTube channel.
2. No web analytics and no consent mechanism on any site (0 of 413 crawled pages load a third-party script). This is deliberate and documented for grimoire.rs. There is no signal about how many people read any page.
3. Release notes are generated from conventional commits by git-cliff or cargo-dist: grouped one-line commit subjects, no images, no "why upgrade" sentence. Mean ocx release body is 4.7 KB (47,037 characters over the last 10 releases); website bodies average 0.5 KB.
4. Social metadata is uneven: grimoire.rs is complete (48 of 48 pages with an `og:image`); ocx.sh has `og:image` on 0 of 298 pages while 128 of them declare a large-image card.
5. At measurement time the local resolver still returned the pre-cutover ocx.sh address while the authoritative DNS served the site correctly. See "Measurement caveats"; do not treat it as an outage.

## 1. Repositories, releases and cadence

Commands: `bash rel.sh rel` (A2, fetches release lists, tag counts and the last 10 bodies per repository into `rel/`), then `python3 -I relstats.py rel` (A3). Release counts use `gh release list --limit 300`. "Last 90 days" counts releases published 2026-08-29 or later.

| Repository | Releases | First | Last | Median gap (days) | Last 90 days |
|---|---|---|---|---|---|
| ocx-sh/ocx | 38 | 2026-03-13 | 2026-11-15 | 2.6 | 9 |
| grimoire-rs/grimoire | 34 | 2026-06-01 | 2026-11-24 | 2.9 | 9 |
| grimoire-rs/grimoire-vscode (local `vscode`) | 21 | 2026-07-16 | 2026-11-24 | 2.7 | 11 |
| ocx-sh/indexbot | 15 | 2026-08-24 | 2026-09-30 | 0.0 | 3 |
| ocx-sh/ocx-mirror | 14 | 2026-06-12 | 2026-11-16 | 6.4 | 6 |
| grimoire-rs/indexer | 12 | 2026-09-28 | 2026-11-24 | 0.0 | 12 |
| ocx-sh/website | 11 | 2026-10-04 | 2026-11-17 | 2.1 | 11 |
| ocx-sh/www-setup | 11 (1 pre-release) | 2026-06-29 | 2026-11-25 | 12.0 | 6 |
| ocx-sh/rules_ocx | 9 | 2026-07-02 | 2026-11-15 | 13.6 | 3 |
| ocx-sh/catalog, conventions, devcontainer-features, index, e2e-index, grimoire-lore, grimoire-rs/grim-gui, grim-mirror | 0 each | | | | |

Tags without a GitHub Release (`bash tagdiff.sh`, A7): catalog 16, conventions 16, indexer 29 (older tags), devcontainer-features 2, ocx-mirror 1, www-setup 1, website 1; ocx, grimoire, indexbot, rules_ocx and vscode 0. `grim-gui` and `grim-mirror` have 0 releases and 0 tags (`gh api repos/grimoire-rs/grim-gui/tags -q length` prints 0). `grim-gui` was pushed 2026-11-26 (`bash repoinfo.sh repos.txt`, last column) and has no release, tag or download path.

Not in the local fleet (A6 plus `gh release list -R <repo> --limit 300 | wc -l`): vscode-ocx 6 releases, find_ocx 4, setup-ocx 8, e2e-package 3, ocx-sdk-python 2, ocx-mirror-sdk 8, ocx-mcp 0, setup-grimoire 2, grimoire-rs/e2e-marketplace, index, marketplace and index-template 0.

Reading: cadence is high (a release every 3 days for the three flagship surfaces). Eight clones in the fleet ship nothing to the Releases tab.

### Release body structure, last 10 releases per repository

Command: `python3 -I relstats.py rel` (A3), columns `body_chars`, `lines`, `bullets` (min/max over 10 bodies, `^[-*] ` bullets). 90 bodies measured, 9 repositories.

| Repository | Body characters (min / max) | Lines | Bullets | Author | Shape (read from `rel/<repo>/*.md`) |
|---|---|---|---|---|---|
| ocx-sh/ocx | 211 / 7821 | 11 / 88 | 0 / 62 | github-actions[bot] | `## Release Notes`, `### Added/Changed/Fixed/Documentation`, then a `## Download ocx X` table of platform archives with checksums |
| grimoire-rs/grimoire | 3435 / 9730 | 40 / 147 | 6 / 95 | github-actions[bot] | `## Release Notes` plus sections, then `## Install grimoire X` with shell and PowerShell one-liners and an attestation-verification block |
| ocx-sh/ocx-mirror | 167 / 2451 | 11 / 55 | 2 / 37 | github-actions[bot] | `## [x.y.z] - date` then sections |
| ocx-sh/www-setup | 80 / 2729 | 1 / 24 | 0 / 14 | github-actions[bot] | sections; 9 of 10 bodies contain hash-shaped words, 2 to 26 each |
| grimoire-rs/indexer | 125 / 1591 | 5 / 35 | 1 / 22 | 5 github-actions[bot], 5 michael-herwig | sections |
| ocx-sh/rules_ocx | 148 / 1262 | 7 / 33 | 1 / 18 | github-actions[bot] | sections |
| ocx-sh/website | 203 / 1537 | 3 / 16 | 0 / 10 | github-actions[bot] | npm and grim-skills package line, then `## What's Changed` PR list and a compare link |
| grimoire-rs/grimoire-vscode | 81 / 625 | 6 / 21 | 1 / 10 | github-actions[bot] | `## [x.y.z] - date`, `### Added` with 1 to 10 bullets |
| ocx-sh/indexbot | 78 / 351 | 1 / 6 | 0 / 2 | github-actions[bot] | 7 of 10 bodies are one identical 78-character line `**Full Changelog**: .../compare/vA...vB` |

Hash count command for www-setup: `for f in rel/ocx-sh__www-setup/*.md; do tail -n +2 $f | grep -oE '\b[0-9a-f]{7,40}\b' | grep -E '[0-9]' | grep -E '[a-f]' | wc -l; done` prints `18 8 8 6 6 22 26 0 2 8`. The indexbot line count: `for f in rel/ocx-sh__indexbot/*.md; do tail -n +2 $f | wc -c; done | sort | uniq -c` prints `7 79` and `1 352` (counts include the trailing newline; 78 characters).

Flagship bullet quality (all 10 bodies per repository; command `bash bullets.sh rel ocx-sh__ocx` and `bash bullets.sh rel grimoire-rs__grimoire`, A4):

| Measure | ocx-sh/ocx | grimoire-rs/grimoire |
|---|---|---|
| Bullets (`^- `) | 337 | 365 |
| Bullets carrying a `*(scope)*` | 321 | 308 |
| Bullets with an internal scope (test, ci, deps, release, build, chore, lint, taskfile, claude, agents) | 26 | 15 |
| Bullets marked `BREAKING` | 45 (in 7 of 10 bodies) | 5 (in 3 of 10 bodies) |
| `**Migration:**` lines (`grep -c '\*\*Migration:\*\*'` on the bodies) | 0 | 5 |
| BREAKING bullets with a migration line | 0 of 45 | 5 of 5 |
| Images or screenshots (`!\[`) | 0 | 0 |
| Bullets with a `(#NNN)` pull-request reference | 0 | 4 |
| Links to a docs page (`grep -cE 'https://(grimoire\.rs\|ocx\.sh)\|upgrading\.md\|\.md#'`) | 0 | 1 (the `upgrading.md#rule-support-dir` pointer in a Migration line) |

Both columns are counts of items, not mixed units: the grimoire migration figure is 5 migration lines for 5 BREAKING bullets, and the ocx figure is 0 for 45.

Evidence for the mechanism: `ocx-sh/ocx/cliff.toml:56` (`conventional_commits = true`), `:64-68` (`chore|ci|style|test|build` skipped), `grimoire-rs/grimoire/.github/workflows/release.yml:305` (cargo-dist `announcement_github_body`). The commit subject is the release note, so authoring quality equals commit-subject quality.

Reading: for the user-facing majority the bullets are readable sentences ("Snapshot a whole registry into a servable local index (index)" is the first bullet of the newest ocx body). Counter-evidence of raw-commit leakage: 26 ocx bullets with internal scopes, 7 indexbot bodies with nothing but a compare link, and the `(claude)` scope line "Add the e2e-test skill (tiered e2e strategy)" in an ocx-mirror body. No body has a summary sentence ahead of its first heading (`sed -n 2,3p` on each body, first line is a heading or bullet in every repository except website, whose first line is a package line).

### Changelog files

Command: `bash local.sh repos.txt` (A5), column `changelog=<lines>l/<sections>sec`, where sections are `^## ` lines.

| Repository | CHANGELOG.md lines / `^## ` sections | Notes |
|---|---|---|
| ocx-sh/ocx | 1446 / 38 | Keep a Changelog header, git-cliff body |
| grimoire-rs/grimoire | 1216 / 34 | same |
| grimoire-rs/indexer | 509 / 39 | sections exceed the 12 releases (41 tags) |
| ocx-sh/ocx-mirror | 485 / 15 | |
| grimoire-rs/vscode | 340 / 21 | |
| ocx-sh/website | 228 / 11 | |
| ocx-sh/indexbot | 190 / 15 | |
| ocx-sh/catalog | 176 / 16 | 16 tags, 0 releases |
| ocx-sh/rules_ocx | 139 / 9 | |
| ocx-sh/www-setup | 129 / 9 | no Keep a Changelog header (`CHANGELOG.md:1-5`) |
| ocx-sh/conventions | 86 / 5 | 16 tags, 0 releases |
| ocx-sh/devcontainer-features | 11 / 2 | 2 tags, 0 releases |
| index, e2e-index, grimoire-lore, grim-gui, grim-mirror | none | grim-gui and grim-mirror carry `cog.toml` only (`ls grimoire-rs/grim-gui/cog.toml`) |

The changelog is also a published docs page: `https://ocx.sh/docs/changelog/` (`curl -s -o /dev/null -w '%{http_code}'` returns 200 with `--resolve ocx.sh:443:37.27.135.61`; source `ocx-sh/ocx/website/src/content/docs/changelog.md:1-10`), and `https://grimoire.rs/changelog.html` (200; in the sitemap). A roadmap page exists for ocx at `ocx-sh/ocx/website/src/content/docs/roadmap.md:1-6`.

### Where a release is announced

Command: `grep -rliE "discord|slack|linkedin|mastodon|bsky|twitter|webhook" /home/mherwig/dev/ocx-sh/*/.github /home/mherwig/dev/grimoire-rs/*/.github`, then reading the hit.

- The only outbound announcement is a Discord webhook: `ocx-sh/ocx/.github/workflows/notify-discord.yml:6-14` fires on pull-request events, `release` and `workflow_run`, and `:50` posts failed or timed-out workflow runs. It is a developer activity feed. The server has 5 members (section 4).
- Blog posts: 0. `find /home/mherwig/dev/ocx-sh /home/mherwig/dev/grimoire-rs -type d \( -iname blog -o -iname news -o -iname posts -o -iname announcements \) -not -path '*/node_modules/*' -not -path '*/.git/*'` returns nothing; `https://ocx.sh/blog/` returns 404 (curl with `--resolve`).
- A GitHub Release is the only release announcement for 9 of 9 released fleet repositories. The YouTube channel (section 4) carries no release video.

## 2. Discoverability of owned sites

| Site | Stack | Source config |
|---|---|---|
| `https://ocx.sh/` (root), `/docs/`, `/install/`, `/catalog/`, `/apps/`, `/integrations/*` | Astro/Starlight, 5 separately built sections on one host | `ocx-sh/website/site/astro.config.mjs:11-12`, `ocx-sh/ocx/website/astro.config.mjs:33-34`, `ocx-sh/www-setup/site/astro.config.mjs:22`, `ocx-sh/rules_ocx/site/astro.config.mjs:8`, `ocx-sh/devcontainer-features/site/astro.config.mjs:24` |
| `https://grimoire.rs/` | Astro/Starlight, `build.format: 'file'` (URLs end in `.html`) | `grimoire-rs/grimoire/docs/astro.config.mjs:64-66` |
| `https://index.grimoire.rs/` | separate repository, rendered by `@grimoire-rs/indexer` | `grimoire-rs/grimoire/docs/public/privacy.html:11-13` |
| `https://index.ocx.sh/` | 301 to `https://ocx.sh/catalog/` | `curl -sI https://index.ocx.sh` |
| `https://ocx-sh.github.io/{indexbot,ocx-mirror}/`, `https://grimoire-rs.github.io/indexer/` | MkDocs Material on GitHub Pages | `ocx-sh/indexbot/mkdocs.yml:5`, `ocx-sh/ocx-mirror/mkdocs.yml:5`, `grimoire-rs/indexer/mkdocs.yml:14` |
| `https://ocx-sh.github.io/rules_ocx/` | Jekyll (just-the-docs), a legacy site next to the Astro `/integrations/bazel/` | `ocx-sh/rules_ocx/docs/_config.yml`; live HTML contains `Jekyll SEO tag v2.8.0` |
| `https://lore.ocx.sh/` | "OCX lore" skill catalog, linked from the footer of every ocx.sh page | `curl -s https://lore.ocx.sh/ \| grep -oE '<title>[^<]*'` |

### Crawl results

Command per row: `python3 -I crawl.py <sitemap-url>` (A8). The script fetches every `<loc>` URL in the sitemap and tests the HTML with regexes. Re-run 2026-11-27; the 413 pages are the sum of the rows.

| Sitemap URL passed to `crawl.py` | URLs | og:image | JSON-LD | canonical | description | title | third-party script | twitter large card |
|---|---|---|---|---|---|---|---|---|
| `https://ocx.sh/sitemap-index.xml` | 4 | 0 | 0 | 4 | 4 | 4 | 0 | 4 |
| `https://ocx.sh/docs/sitemap-index.xml` | 117 | 0 | 0 | 117 | 117 | 117 | 0 | 117 |
| `https://ocx.sh/catalog/sitemap-index.xml` | 170 | 0 | 0 | 170 | 170 | 170 | 0 | 0 (declares `summary`) |
| `https://ocx.sh/install/sitemap-index.xml` | 7 | 0 | 0 | 7 | 7 | 7 | 0 | 7 |
| `https://grimoire.rs/sitemap-index.xml` | 48 | 48 | 0 | 48 | 48 | 48 | 0 | 48 |
| `https://index.grimoire.rs/sitemap.xml` | 25 | 25 | 0 | 0 | 25 | 25 | 0 | not run |
| `https://grimoire-rs.github.io/indexer/sitemap.xml` | 23 | 2 | 0 | 23 | 23 | 23 | 0 | not run |
| `https://ocx-sh.github.io/ocx-mirror/sitemap.xml` | 10 | 0 | 0 | 10 | 10 | 10 | 0 | not run |
| `https://ocx-sh.github.io/indexbot/sitemap.xml` | 9 | 0 | 0 | 9 | 9 | 9 | 0 | not run |
| `https://ocx-sh.github.io/rules_ocx/` | no sitemap (404) | | | | | | | |

ocx.sh totals: 298 URLs (4 + 117 + 170 + 7), `og:image` 0, large-image card 128, small `summary` card 170. The `/integrations/*` and `/apps/*` sections have their own sitemap indexes (200) and were not crawled. The `twitter large card` column was added in this repair; the earlier statement that 298 of 298 declared it was wrong.

JSON-LD: 0 across 413 crawled pages. The only JSON-LD found anywhere is the `WebSite` object Jekyll SEO injects on the legacy rules_ocx page (`curl -s https://ocx-sh.github.io/rules_ocx/ | grep -A2 'ld+json'`). No `SoftwareApplication`, `Organization`, `BreadcrumbList` or `TechArticle` type is present.

Open Graph images:

- grimoire.rs: all 48 pages declare `og:image` = `https://grimoire.rs/og-card.png` (`curl -s https://grimoire.rs/ | grep -oE '<meta (property|name)="(og:image|twitter:[a-z:]+)"[^>]*>'` prints `og:image` and `twitter:card=summary_large_image`; config `grimoire-rs/grimoire/docs/astro.config.mjs:116-123`). The file measures 1280 x 640 px, 105,570 bytes: `curl -s https://grimoire.rs/og-card.png -o og.png; python3 -I -c "import struct;d=open('og.png','rb').read(32);print(struct.unpack('>II',d[16:24]),len(open('og.png','rb').read()))"` prints `(1280, 640) 105570`. That is a 2:1 ratio.
- Platform requirements for that ratio, fetched 2026-11-27. LinkedIn's help page lists a minimum of "1200 (w) x 627 (h) pixels" for the sharing image with a "Recommended ratio: 1.91:1" and "Max file size: 5 MB" ([LinkedIn Help, post link-preview images](https://www.linkedin.com/help/linkedin/answer/a521928)). Meta's sharing documentation recommends "at least 1200 x 630 pixels", a 1.91:1 ratio so the image shows "without cropping", a 600 x 315 minimum for large-image link posts, and an 8 MB limit ([Meta for Developers, sharing images](https://developers.facebook.com/docs/sharing/webmasters/images/)). X's legacy card documentation states a 2:1 ratio for `summary_large_image`, with minimum 300 x 157 and maximum 4096 x 4096; I saw this only as a search-result summary of `https://dev.twitter.com/cards/types/summary-large-image`, because the X developer pages returned a redirect, a 402 or an empty shell when opened, so the X figure is unverified. Consequence: the 1280 x 640 grimoire card matches X's 2:1 and is 1.91:1-compatible only after a small crop on LinkedIn and Meta, the 1200 x 627 and 1200 x 630 sizes are the intersection that needs no crop on the two platforms whose pages could be opened.
- index.grimoire.rs: `og:image` content is `/logo.svg`, a relative SVG path, on 25 of 25 pages (`curl -s https://index.grimoire.rs/ | grep -oE 'og:image" content="[^"]*"'`). No `canonical` tag on 25 of 25 pages (`crawl.py`, canonical column 0).
- ocx.sh: 0 of 298 pages declare `og:image`. Command: `curl -s --resolve ocx.sh:443:37.27.135.61 https://ocx.sh/docs/ | grep -oE '<meta (property|name)="(og|twitter):[^>]*>'` prints og:title, og:type, og:url, og:locale, og:description, og:site_name and `twitter:card`, and no image tag. A card with no image tag has nothing for LinkedIn or Meta to crop or show; that is the finding, and the platform ratios above are what a fix must meet.
- MkDocs sites: `og:image` on 0 of 19 (ocx-mirror 0 of 10, indexbot 0 of 9) and 2 of 23 on indexer; rules_ocx has none.

### robots.txt, sitemaps, machine-reader files

Command: `code(){ ...curl -s -o /dev/null -w '%{http_code}' https://$h/$p; }` over the paths below (the full loop is in A9; ocx.sh probes use `--resolve ocx.sh:443:37.27.135.61`).

| Host | robots.txt | sitemap | llms.txt, llms-full.txt, docs/llms.txt | rss.xml, feed.xml, atom.xml, index.xml | security.txt |
|---|---|---|---|---|---|
| ocx.sh | 200, 66 bytes, `Allow: /` and one `Sitemap:` line to `https://ocx.sh/sitemap-index.xml` | `sitemap-index.xml` 200 and lists only `https://ocx.sh/sitemap-0.xml` (4 URLs). Per-section indexes `docs`, `install`, `catalog`, `integrations/bazel`, `integrations/devcontainer`, `apps/catalog` `/sitemap-index.xml` all 200 but none is named in robots.txt | 404 x 3 | 404 x 4 | 404 |
| grimoire.rs | 200 (Cloudflare managed, below) | `sitemap.xml` and `sitemap-index.xml` 200; 48 URLs, all return 200 | 404 x 3 | 404 x 4 | 404 |
| index.grimoire.rs | 200, same block, `Sitemap:` present | `sitemap.xml` 200, 25 URLs; `sitemap-index.xml` 404 | 404 x 3 | 404 x 4 | 404 |
| ocx-sh.github.io, grimoire-rs.github.io | 404 at the host root (project sites cannot own it) | per project: indexbot 200, ocx-mirror 200, indexer 200, rules_ocx 404 | not probed per project | not probed | not probed |

Repository evidence for the ocx.sh robots file: `ocx-sh/website/site/dist/robots.txt:1-4` (built output; the file is generated). The sitemap gap: `https://ocx.sh/robots.txt` names only `https://ocx.sh/sitemap-index.xml`, which lists one child holding 4 URLs, so the 294 URLs in the docs, catalog and install sitemaps (plus the integrations and apps sections) are not reachable from robots.txt.

**grimoire.rs robots differs between repository and live.** Repository: `grimoire-rs/grimoire/docs/public/robots.txt:1-4` is `User-agent: *`, `Allow: /`, the sitemap line. Live: a Cloudflare Managed block (`curl -s https://grimoire.rs/robots.txt`) with `User-agent: *` / `Content-Signal: search=yes,ai-train=no,use=reference` at live lines 30-31, then `Disallow: /` for 31 named user agents (`curl -s https://grimoire.rs/robots.txt | awk '/^User-agent:/{u=$2} /^Disallow: \/$/{printf "%s ",u}'`): Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Diffbot, Google-Extended, GPTBot, omgili, anthropic-ai, Claude-Web, cohere-ai, MistralAI-Training, meta-externalagent, GoogleOther, Baiduspider, PetalBot, AwarioRssBot, Google-CloudVertexBot, QualifiedBot, Cotoyogi, ICC-Crawler, atlassian-bot, FishBot, BorderxBot, NavuBot, SemrushBot-SWA, WARDBot, magpie-crawler, KimiBot, CitibotSiteCrawler. index.grimoire.rs serves the same 31 (`curl -s https://index.grimoire.rs/robots.txt | awk '/^User-agent:/{u=$2} /^Disallow: \/$/{n++} END{print n}'` prints 31).

What the Content-Signal line means, from Cloudflare's own pages fetched 2026-11-27: the syntax is comma-delimited `yes` or `no` values for the keys `search`, `ai-input` and `ai-train`, and a key left out "neither grants nor restricts permission"; Cloudflare's managed file for customers who enabled it serves `search=yes, ai-train=no` and omits `ai-input` ([Cloudflare blog, Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/); [Cloudflare docs, managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)). The `use=reference` key is not in either page; the live file defines it itself at its line 20 ("use: how AI systems may consume the content (immediate, reference, or full)"), so treat `use` as a Cloudflare extension whose consumers are unverified. Read together: `ai-train=no` and the 31 `Disallow` entries restrict training and several vendor crawlers; `ai-input` (retrieval and grounding for AI answers) is unrestricted by signal but the named agents are disallowed. The live file is authoritative; no repository file records this policy.

Also measured: grimoire.rs `privacy.html` reports a `Cloudflare email-decode.min.js` script, the only external-origin script found, injected by the CDN (`curl -s https://grimoire.rs/privacy.html | grep -oE '<script[^>]*src='`).

### Fonts and third-party requests

MkDocs Material sites request Google Fonts at runtime: `curl -s https://ocx-sh.github.io/ocx-mirror/ | grep -c fonts.googleapis` returns 1; indexbot and indexer also reference `fonts.googleapis.com` and `fonts.gstatic.com` (`for s in ocx-sh.github.io/indexbot grimoire-rs.github.io/indexer ocx-sh.github.io/ocx-mirror; do curl -s https://$s/ | grep -oE 'fonts\.(googleapis|gstatic)\.com' | sort -u; done` prints both hosts for all three). The Astro sites load no third-party hosts as subresources; the only external hosts on their pages are hyperlinks to discord.gg, github.com, lore.ocx.sh, nodejs.org, keepachangelog.com, semver.org, containers.dev, gitlab.com and linkedin.com. `rules_ocx` (Jekyll) loads `cdnjs.cloudflare.com` (`curl -s https://ocx-sh.github.io/rules_ocx/ | grep -oE 'cdnjs\.cloudflare\.com' | sort -u`). Note: `crawl.py` flags only scripts, so the Google Fonts stylesheets on MkDocs sites do not appear in its "third-party script" column, which is 0 for them.

## 3. Analytics and consent

| Measure | Result | Command |
|---|---|---|
| Analytics script (Plausible, Umami, GA, GTM, Matomo, Fathom, GoatCounter, Cloudflare insights, PostHog) in a deployed page | 0 of 413 crawled pages load any script from another host | `crawl.py`, column "third-party script" (regex `<script[^>]*src="https?://(?!ocx.sh)`); and `grep -rniE 'plausible\|umami\|posthog\|googletagmanager\|gtag\(' /home/mherwig/dev/ocx-sh /home/mherwig/dev/grimoire-rs --include=*.html --include=*.astro --include=*.mjs --include=*.yml --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.opencode --exclude-dir=.claude --exclude-dir=.agents` finds no integration |
| Consent banner or cookie script | none | `grimoire-rs/grimoire/docs/public/privacy.html:37` states `document.cookie` appears in neither build, `:41` gives the re-check grep |
| Rationale written down | grimoire.rs: "No third-party subresources, on either site" and "No cookies anywhere" | `privacy.html:23`, `:37`; the page states there is deliberately no Impressum (`:47`) |
| Dormant guidance | A skill named `docs-instrument` ships in the ocx repo and lists Plausible, Umami, GoatCounter and Fathom with prices; it is applied nowhere | `ocx-sh/ocx/.opencode/skills/docs-instrument/references/reader-signals.md:77-80` |
| Product telemetry | grim: opt-in, off by default, "There is no default endpoint and no maintainer-run collector" | `grimoire-rs/grimoire/docs/src/content/docs/telemetry.md:6-12` |
| Legacy stub | rules_ocx Jekyll page keeps an empty `<!-- Setup Google Analytics -->` block, no tracking id | `curl -s https://ocx-sh.github.io/rules_ocx/ \| grep -n 'Google Anal'` |

Registry download counts are the only usage numbers available: npm `@ocx-sh/theme` 5,353 downloads and `@grimoire-rs/indexer` 1,127 in the 30 days to 2026-11-26 (`curl -s https://api.npmjs.org/downloads/point/last-month/@ocx-sh/theme`, `.../@grimoire-rs/indexer`; endpoint documented at [npm/registry download-counts API](https://github.com/npm/registry/blob/main/docs/download-counts.md)).

## 4. Channels the fleet actually has

Commands: repository facts `bash repoinfo.sh repos.txt` (A1: visibility, stars, discussions, topics count, has-description, last push); org facts `gh api users/ocx-sh -q '[.followers,.blog,.description,.email]'` (same for `grimoire-rs`); local facts `bash local.sh repos.txt` (A5).

| Channel | Exists? | Evidence | Last activity |
|---|---|---|---|
| GitHub org `ocx-sh` | yes | 6 followers, blog `https://ocx.sh`, no description, public email `contact@michael-herwig.de`; 25 public repos (6 forks) | `ocx-sh/rules_ocx` pushed 2026-11-27T10:33Z, `ocx-sh/ocx` 2026-11-27T09:22Z |
| GitHub org `grimoire-rs` | yes | 0 followers, no description, no blog, no email; 10 public repos | `grim-gui` pushed 2026-11-26T10:08Z |
| Org profile README (`.github/profile/README.md`) | no, both orgs | `gh api repos/<org>/.github/contents/profile/README.md` fails with 404 for both | |
| GitHub stars (17 clones) | ocx 20, grimoire 17, vscode 1, www-setup 1, catalog 1, the other 12 clones 0 | `bash repoinfo.sh repos.txt` | |
| GitHub topics | 3 of 17 clones have topics (ocx 13, grimoire 20, vscode 20); 14 of 17 have 0. Across the 29 original-work public repos: 7 have topics, 22 have none | `repoinfo.sh`, `org.sh` plus `gh repo view -R <repo> --json repositoryTopics` | |
| Repository description | 3 of 17 clones have none: rules_ocx, www-setup, devcontainer-features | `repoinfo.sh` column 6 `false` | |
| GitHub Discussions | enabled on 1 of 17 (grimoire) | `repoinfo.sh` column 4 | |
| Issue templates | ocx 5, grimoire 3, grim-gui 3, grim-mirror 3, ocx-mirror 2, rules_ocx 2, devcontainer-features 2, conventions 2; the other 9 clones 0 | `local.sh`, `issue_templates=` | |
| Discord | yes, one server named "ocx" | invite `https://discord.gg/mT2UCF8CVe` (`ocx-sh/ocx/README.md:12,71,86`, `ocx-sh/website/site/src/content/docs/team/index.mdx:40`, `ocx-sh/ocx/website/astro.config.mjs:47`). `curl -s 'https://discord.com/api/v9/invites/mT2UCF8CVe?with_counts=true'` returns name `ocx`, `approximate_member_count` 5, `approximate_presence_count` 0, `expires_at` null | not visible without login. The invite is linked from no Grimoire repository or site |
| YouTube | **yes**, channel "ocx", handle `@ocx-sh`, channel id `UCKuRD68HkNpla-vY6-YBTHg`, channel description empty | `curl -sL -A 'Mozilla/5.0' 'https://www.youtube.com/@ocx-sh?cbrd=1&ucbcb=1'` returns 200 with `<title>ocx - YouTube`; `@grimoire-rs` and `@grimoirers` return 404 and so does a made-up handle, so the 200 is specific. Feed `curl -s 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg'` lists 2 videos, both 2026-11-17: "OCX Shorts 01: Pin Node.js in the repo" (12 views, description "The same Node.js on the laptop and in CI, picked once.") and "OCX Shorts 01: Pin Node.js in the repo - Dino Edition" (7 views); `media:statistics views` from the feed. Ownership is inferred, not proven: the handle equals the org name, the upload date equals the website release date (2026-11-17), and the org has a private `marketing` repo (`gh repo list ocx-sh --visibility all`). The first Short's own `oembed` title is "OCX Shorts 01: Pin Node.js in the repo" | 2026-11-17. `git grep -nIiE 'youtube\.com\|youtu\.be\|5qbGkPhxNpQ'` over the 17 clones finds 0 links to it |
| LinkedIn | two personal profiles only, no company page found | `ocx-sh/website/site/src/content/docs/team/index.mdx:27,33`. `curl -s -A 'Mozilla/5.0' -o /dev/null -w '%{http_code}' https://www.linkedin.com/company/ocx-sh` returns 403, which does not show absence: LinkedIn's help page states it does not permit third-party "crawlers" or bots ([LinkedIn Help, prohibited software](https://www.linkedin.com/help/linkedin/answer/a1341387)) and unauthenticated automated requests to it are commonly refused, with a non-standard 999 status documented in the same case ([http.dev, 999](https://http.dev/999)); no source found for a 403 specifically, so the row stays "no page found, not provable" | not visible |
| Team and roles | one named maintainer and one "Marketing and community lead" | `ocx-sh/website/site/src/content/docs/team/index.mdx:32` | |
| npm | `@ocx-sh/theme` 0.7.0, `@grimoire-rs/indexer` 0.8.0 | `curl -s https://registry.npmjs.org/@grimoire-rs%2findexer \| python3 -I -c "import json,sys;d=json.load(sys.stdin);print(d['dist-tags'],d['time']['modified'])"` prints latest `0.8.0`, modified 2026-11-24T18:53Z | 2026-11-24 |
| PyPI | `ocx-indexbot` 0.6.3 | `curl -s https://pypi.org/pypi/ocx-indexbot/json \| python3 -I -c "import json,sys;print(json.load(sys.stdin)['info']['version'])"` | |
| crates.io | no crate named `ocx`, `ocx_lib`, `ocx-mirror` or `grimoire-rs` (each `curl -s -A research-script -o /dev/null -w '%{http_code}' https://crates.io/api/v1/crates/<name>` returns 404). `grim` (136 downloads, repository `Vaishnav-Sabari-Girish/grimoire`, updated 2026-07-02) and `grimoire` (5,225 downloads, repository `jshrake/grimoire`, a GLSL live-coding tool, updated 2019-03-22) belong to other projects | `curl -s -A research-script https://crates.io/api/v1/crates/grim` and `.../grimoire`, fields `repository`, `description`, `updated_at`. crates.io applies first-come, first-served naming and in 2023 adopted a squatting policy ([Rust blog, crates.io usage policy RFC](https://blog.rust-lang.org/2023/09/22/crates-io-usage-policy-rfc/)) | |
| VS Code Marketplace | extension `grimoire-rs.grimoire-vscode` declared (`grimoire-rs/vscode/package.json:6`); one probe URL returned 404, not conclusive | `grep -n '"publisher"\|"name"' grimoire-rs/vscode/package.json` | |
| Hacker News | 0 submissions of `ocx.sh`, `grimoire.rs`, `github.com/ocx-sh`, `github.com/grimoire-rs` | `curl -s 'https://hn.algolia.com/api/v1/search?query=ocx.sh&restrictSearchableAttributes=url'`, field `nbHits` is 0 for all four queries | |
| Bluesky | no profile | `curl -s 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=<h>'` for `ocx.sh`, `grimoire.rs`, `ocx-sh.bsky.social`, `grimoire-rs.bsky.social` all return `Profile not found` | |
| Mastodon | no account on mastodon.social matching `ocx.sh` | `curl -s 'https://mastodon.social/api/v2/search?q=ocx.sh&type=accounts'` returns `"accounts":[]`. One instance only, so not proof for the fediverse | |
| X, Reddit, Product Hunt, newsletter, blog, RSS | no link anywhere in the fleet; account existence not provable without login (X and Reddit return 404 and 403 to unauthenticated clients) | `bash local.sh repos.txt`, column `channel_grep_hits`: 0 in 16 clones; 2 in `ocx-sh/website`, both the personal LinkedIn links at `team/index.mdx:27,33` | |

README as a channel (command: `bash local.sh repos.txt`, columns README lines, badge rows `^\[!\[`, images excluding logos and badge rows, Discord mentions, CONTRIBUTING/CODE_OF_CONDUCT/SECURITY files):

| Repository | README lines | Badge rows | Screenshots or diagrams | Discord mentions | Community files (of 3) |
|---|---|---|---|---|---|
| ocx-sh/ocx | 94 | 4 | 0 | 4 | 3 |
| grimoire-rs/grimoire | 110 | 4 | 0 | 0 | 3 |
| grimoire-rs/vscode | 248 | 0 | 0 | 0 | 1 |
| ocx-sh/rules_ocx | 316 | 0 | 0 | 0 | 3 |
| ocx-sh/ocx-mirror | 179 | 0 | 0 | 0 | 0 |
| ocx-sh/www-setup | 102 | 0 | 0 | 0 | 3 |
| the other 11 clones | 13 to 196 | 0 | 0 | 0 | 0 to 3 |

Of the 17 READMEs, 5 carry a logo image (`grep -E '!\[|<img' README.md` matches `logo` in ocx, ocx-mirror, www-setup, grimoire, vscode), 2 carry badge rows, and 0 carry a screenshot, diagram or terminal recording, including the `grim-gui` desktop app README. `ocx-sh/website/README.md` is 13 lines.

Contact capture: the only email address in the fleet's public surface is `contact@michael-herwig.de` on the `ocx-sh` org profile. Newsletter or email capture forms: 0 (`git grep -nIiE 'newsletter|mailchimp|substack|buttondown'` finds nothing in the 17 clones).

## 5. Measurement caveats

- The local resolver returns a stale record for `ocx.sh`: `dig +short ocx.sh A` returns 65.108.2.88 and `AAAA` 2a01:4f9:6a:5183::2, and `curl -sS https://ocx.sh/` fails with `curl: (60) SSL: no alternative certificate subject name matches target host name 'ocx.sh'` (the earlier run saw a 401 from the same host). `dig +trace ocx.sh A` ends at 37.27.135.61, and `dig +short @1.1.1.1 ocx.sh A` and `@9.9.9.9` return 37.27.135.61 with AAAA 2a01:4f9:3070:3934::2 (`@8.8.8.8` returned 121.127.46.11, a different edge). `curl -sI --resolve ocx.sh:443:37.27.135.61 https://ocx.sh/` returns `HTTP/2 200`, `server: BunnyCDN-FI1-1208`, `cdn-cache: STALE`, `cdn-cachedat: 11/17/2026`. All ocx.sh numbers use that address. Anyone whose resolver still holds the old record cannot reach the apex. The cutover runbook documents the migration (`ocx-sh/website/infra/cutover/README.md:3`).
- LinkedIn, X and Reddit cannot be checked unauthenticated; those rows say "not provable" rather than "absent". The YouTube result came from a consent-bypass URL (`cbrd=1&ucbcb=1`); the plain handle URL returned a redirect in the earlier run.
- `crawl.py` tests text patterns; it does not check that a canonical URL equals the sitemap URL, or that an `og:image` URL returns 200.
- The frame calls the OCX surfaces "Astro sites"; the crawl confirms 5 section builds on ocx.sh and grimoire.rs on Astro, and also 3 MkDocs sites and 1 Jekyll site that rank separately.

## Smells

Ranked by how much a published rule could change an agent's behavior.

1. Social card without an image on ocx.sh: `og:image` on 0 of 298 sitemap pages; 128 declare `summary_large_image` and 170 declare `summary`. A shared link has no image for LinkedIn or Meta to show. Fix is checkable: crawl the sitemap, assert an absolute `https` `og:image` of at least 1200 x 630 and ratio 1.91:1 (the LinkedIn and Meta sizes above).
2. Release notes are commit subjects, not announcements. ocx has 45 BREAKING bullets and 0 `**Migration:**` lines; grimoire has 5 and 5. 7 of 10 indexbot bodies are a single compare link. 26 of 337 ocx bullets name an internal scope (test, ci, deps, release). No body has a summary sentence, and 0 of 10 ocx bodies link a docs page.
3. No analytics anywhere (0 of 413 pages), so no feedback loop shows which page or channel produces a reader, and the shipped `docs-instrument` guidance is unapplied. The privacy stance is explicit, so any agent rule must offer a cookieless option and the consent decision, not assume a vendor.
4. A YouTube channel exists with 2 videos (12 and 7 views) and is linked from nowhere: 0 of 17 repositories, no site. The other channels are thin: no feed, newsletter or blog, 0 Hacker News submissions, a Discord with 5 members linked from ocx only. The Discord workflow notifies about CI failures, which are not user news.
5. Sitemap and robots gaps: ocx.sh robots.txt reaches 4 of 298 URLs; index.grimoire.rs has no canonical tag on 25 of 25 pages and an SVG relative `og:image`; the grimoire.rs `og:image` is 1280 x 640 (2:1) and not 1200 x 630; the repository robots.txt disagrees with the live file.
6. AI-crawler policy is an accident of a CDN default: 31 user agents disallowed on grimoire.rs and index.grimoire.rs, none recorded in a repository, no `llms.txt` on any of 3 hosts probed, while the audience feeds documentation to AI agents.
7. Structured data absent: 0 JSON-LD across 413 pages; no `SoftwareApplication`, `Organization` or `BreadcrumbList`.
8. Tags without Releases: catalog 16, conventions 16, indexer 29, devcontainer-features 2; `grim-gui` and `grim-mirror` publish nothing; 9 of 10 www-setup bodies embed hash-shaped words.
9. GitHub hygiene: 14 of 17 clones have 0 topics, 3 of 17 have no description (rules_ocx, www-setup, devcontainer-features), both org profiles have no README and no description, and two crates.io names (`grim`, `grimoire`) are held by other projects.
10. Fragmented property: five Astro builds under one host, three MkDocs sites and one Jekyll site on github.io, each with its own theme and (absent) OG image.

## Patterns worth encoding

Each is checkable with a command and changes what an agent does.

1. **Share-card gate.** Any page that sets a large-image `twitter:card` must also set an absolute `og:image` URL, PNG or JPEG, of at least 1200 x 630 at 1.91:1 (LinkedIn and Meta sources above). Check: crawl the sitemap, assert the tag, fetch the image for status 200 and dimensions. (ocx.sh 0 of 128 large-card pages pass; grimoire.rs passes on tag but its image is 2:1.)
2. **Self-contained metadata set per page.** canonical, description, title, `og:title`, `og:description`, `og:url`, `og:image` all present, canonical absolute and equal to the sitemap URL. index.grimoire.rs shows the failure when the generator omits canonical.
3. **robots.txt names every sitemap index**, and the live file is compared to the repository file in CI because a CDN may rewrite it. (grimoire.rs diverges; ocx.sh omits 6 section indexes.)
4. **Release-note shape for users.** First line says what changed for the reader, then Added/Changed/Fixed, then a `**Migration:**` line under every BREAKING entry (grimoire 5 of 5; ocx 0 of 45), then a link to the docs page. Skip bullets whose scope is internal; the cliff config skips types, not scopes. Check: lint the body for BREAKING without a following Migration line, and for scopes in an internal list.
5. **Never ship a release that has only a compare link.** A body under a length threshold with no heading is a failure (indexbot 7 of 10).
6. **Every tag has a GitHub Release.** Check: `comm -13 <(gh release list ...) <(gh api repos/<r>/tags ...)` is empty (A7).
7. **Privacy statement and script inventory match.** The grimoire.rs notice lists each stored key and states no third-party subresources, and a check re-runs `grep` over the build output (`privacy.html:41`). If analytics are added, add the consent mechanism in the same change.
8. **Channel inventory file.** One file per organization listing every account (Discord invite, YouTube, LinkedIn, registries) with a last-checked date, so an agent writing a README or release note links channels that exist and never invents a handle. Today a Discord invite appears in 4 places for OCX and 0 for Grimoire, and the YouTube channel in 0.
9. **Machine-reader policy is written, not inherited.** State the AI-crawler policy and whether an `llms.txt` exists in the repository, and gate the live file against it.
10. **First-screen rule for README and docs**: install command, one image or recording, one community link. Measured today: 0 of 17 READMEs carry a screenshot or recording.

## What this contradicts in the frame

1. **The frame's falsifier, "no marketing surface worth measuring beyond READMEs", is half true.** There are owned sites with sitemaps, a team page naming a "Marketing and community lead" (`ocx-sh/website/site/src/content/docs/team/index.mdx:32`), a Discord and one YouTube channel, but no LinkedIn company page was found and no other platform channel. The exemplar corpus must carry LinkedIn and microblog grounding; the fleet cannot.
2. **The frame lists LinkedIn, YouTube, microblogs, Reddit, Hacker News and Product Hunt as adopter surfaces.** Measured: YouTube exists (2 videos, 19 views in total, unlinked); LinkedIn has two personal profiles; the rest have no account or link and Hacker News has 0 submissions. Only YouTube has any fleet practice to compare against.
3. **Frame says "Astro sites" and "MkDocs sites" as two classes; measurement adds a third (Jekyll) and shows the Astro class is not uniform**: grimoire.rs has `og:image` on 48 of 48, ocx.sh has canonical and description on 298 of 298 but `og:image` on 0, and index.grimoire.rs lacks canonical.
4. **The frame treats analytics and consent as constraints to design around.** The fleet has none by decision (`privacy.html:23,37`) and CLI telemetry is opt-in with no collector. A marketing rule must start from "measure without cookies, or do not measure".
5. **"Release notes" are assumed to need authoring guidance; measurement shows they are generated** from conventional commits at 9 of 9 released repositories (`ocx-sh/ocx/cliff.toml:56-68`, `release.yml:305`). The lever is commit subject and scope quality and the template, not a prose skill.
6. **GitHub is the only channel with real activity and is under-used**: 20 and 17 stars, topics on 3 of 17 clones, Discussions on 1 of 17, no org profile README.
7. **Corrected, not contradicted**: the repository `grimoire.rs` robots file (allow-all) is not what crawlers see; a CDN rewrites it (31 agents disallowed). A repository-only audit of discoverability would mislead; the live check is mandatory.

## Appendix: scripts

Each block is verbatim what produced the numbers above. A1 to A7 are shell or Python files named in their first comment line; `repos.txt` is the base list.

### repos.txt

```
ocx-sh/ocx
ocx-sh/ocx-mirror
ocx-sh/indexbot
ocx-sh/rules_ocx
ocx-sh/www-setup
ocx-sh/catalog
ocx-sh/devcontainer-features
ocx-sh/index
ocx-sh/e2e-index
ocx-sh/conventions
ocx-sh/grimoire-lore
ocx-sh/website
grimoire-rs/grimoire
grimoire-rs/grim-gui
grimoire-rs/grim-mirror
grimoire-rs/indexer
grimoire-rs/vscode
```

### A1 repoinfo.sh

```bash
# A1: per-repo facts. usage: repoinfo.sh repos.txt  (run from /home/mherwig/dev)
while read p; do
  slug=$(git -C /home/mherwig/dev/$p remote get-url origin | sed -E 's#.*github.com[:/]##; s#\.git$##')
  gh repo view $slug --json visibility,stargazerCount,hasDiscussionsEnabled,repositoryTopics,description,pushedAt -q '[.visibility,.stargazerCount,.hasDiscussionsEnabled,(.repositoryTopics|length),((.description//"")|length>0),.pushedAt]|@tsv' | sed "s#^#$p\t#"
done < "$1"
```

### A2 rel.sh

```bash
# A2: release cadence + last-10 body dump. usage: rel.sh <outdir>  (needs gh auth)
out=$1; mkdir -p $out
for p in ocx-sh/ocx ocx-sh/ocx-mirror ocx-sh/indexbot ocx-sh/rules_ocx ocx-sh/www-setup ocx-sh/catalog ocx-sh/devcontainer-features ocx-sh/index ocx-sh/e2e-index ocx-sh/conventions ocx-sh/grimoire-lore ocx-sh/website grimoire-rs/grimoire grimoire-rs/grim-gui grimoire-rs/grim-mirror grimoire-rs/indexer grimoire-rs/grimoire-vscode; do
  d=$out/${p//\//__}; mkdir -p $d
  gh release list -R $p --limit 300 --json tagName,publishedAt,isPrerelease > $d/list.json
  gh api repos/$p/tags --paginate -q 'length' | paste -sd+ | bc > $d/tags.txt
  for t in $(python3 -I -c "import json,sys;[print(r['tagName']) for r in sorted(json.load(open('$d/list.json')),key=lambda r:r['publishedAt'],reverse=True)[:10]]"); do
    gh release view $t -R $p --json body,author -q '.author.login+"\n"+.body' > $d/$t.md
  done
done
```

### A3 relstats.py

```python
# A3: cadence table + body stats. usage: python3 -I relstats.py <reldir>
import json,glob,os,re,sys,statistics as st
from datetime import datetime,timezone
root=sys.argv[1]; now=datetime(2026,11,27,tzinfo=timezone.utc)
for d in sorted(glob.glob(root+'/*')):
    n=os.path.basename(d).replace('__','/')
    L=json.load(open(d+'/list.json')); tags=open(d+'/tags.txt').read().strip()
    ts=sorted(datetime.fromisoformat(r['publishedAt'].replace('Z','+00:00')) for r in L)
    if not ts: print(f"{n}\treleases=0\ttags={tags}"); continue
    gaps=[(b-a).days+(b-a).seconds/86400 for a,b in zip(ts,ts[1:])]
    l90=sum((now-t).days<=90 for t in ts)
    pre=sum(r['isPrerelease'] for r in L)
    bl=[];ln=[];bu=[];au=[]
    for f in glob.glob(d+'/*.md'):
        s=open(f).read().split('\n',1); au.append(s[0]); b=(s[1] if len(s)>1 else '').rstrip('\n')
        bl.append(len(b)); ln.append(len(b.splitlines())); bu.append(len(re.findall(r'(?m)^[-*] ',b)))
    print(f"{n}\treleases={len(L)} pre={pre} first={ts[0].date()} last={ts[-1].date()} medgap={st.median(gaps) if gaps else 0:.1f} l90={l90} tags={tags}\tbody_chars={min(bl)}/{max(bl)} sum={sum(bl)} lines={min(ln)}/{max(ln)} bullets={min(bu)}/{max(bu)} authors={sorted(set(au))}")
```

### A4 bullets.sh

```bash
# A4: flagship bullet quality. usage: bullets.sh <reldir> <owner__repo>
d=$1/$2; cat $d/*.md | tail -n +1 > /dev/null
all=$(for f in $d/*.md; do tail -n +2 $f; done)
c(){ printf "%s\n" "$all" | grep -cE ${2:+-i} -e "$1"; }
echo "bodies=$(ls $d/*.md|wc -l) chars=$(printf '%s' "$all" | wc -c)"
echo "bullets      $(c '^- ')"
echo "scoped       $(c '^- .*\*\([a-z0-9_/-]+\)\*')"
echo "internal     $(c '^- .*\*\((test|ci|deps|release|build|chore|lint|taskfile|claude|agents)\)\*')"
echo "BREAKING     $(c 'BREAKING')"
echo "Migration    $(c migration i)"
echo "bodies_with_migration $(grep -liE 'migration' $d/*.md | wc -l)"
echo "bodies_with_BREAKING  $(grep -l 'BREAKING' $d/*.md | wc -l)"
echo "images       $(c '!\[')"
echo "PRref        $(c '^- .*\(#[0-9]+\)')"
```

### A5 local.sh

```bash
# A5: per-clone README, changelog, issue templates, community files, channel grep. Run from /home/mherwig/dev with repos.txt path as $1
while read p; do
  r=/home/mherwig/dev/$p
  rl=$(wc -l < $r/README.md)
  bd=$(grep -cE '^\[!\[' $r/README.md)
  im=$(grep -E '!\[|<img' $r/README.md | grep -vE 'logo|^\[!\[' | wc -l)
  dc=$(grep -ci discord $r/README.md)
  cm=0; [ -f $r/CONTRIBUTING.md ] && cm=$((cm+1)); [ -f $r/CODE_OF_CONDUCT.md ] && cm=$((cm+1)); [ -f $r/SECURITY.md ] && cm=$((cm+1))
  cl=-; [ -f $r/CHANGELOG.md ] && cl="$(wc -l < $r/CHANGELOG.md)l/$(grep -c '^## ' $r/CHANGELOG.md)sec"
  it=$(ls $r/.github/ISSUE_TEMPLATE 2>/dev/null | wc -l)
  ch=$(git -C $r grep -nIiE 'youtube\.com|youtu\.be|twitter\.com|https?://x\.com|mastodon|bsky\.app|reddit\.com|producthunt|news\.ycombinator|newsletter|mailchimp|substack|buttondown|linkedin\.com' -- . ':!*lock*' ':!CHANGELOG.md' ':!.opencode' ':!.claude' ':!.agents' | wc -l)
  echo -e "$p\tREADME=${rl}l badges=$bd images=$im discord=$dc community_files=$cm changelog=$cl issue_templates=$it channel_grep_hits=$ch"
done < "$1"
```

### A6 org.sh

```bash
# A6: org-wide public repos, not in the local fleet
for o in ocx-sh grimoire-rs; do gh repo list $o --visibility public --limit 200 --json name,isFork,stargazerCount,pushedAt -q '.[]|[("'$o'/"+.name),.isFork,.stargazerCount,.pushedAt[:10]]|@tsv'; done
```

### A7 tagdiff.sh

```bash
# A7: tags with no GitHub Release
for r in ocx-sh/ocx ocx-sh/ocx-mirror ocx-sh/indexbot ocx-sh/rules_ocx ocx-sh/www-setup ocx-sh/catalog ocx-sh/conventions ocx-sh/devcontainer-features ocx-sh/website grimoire-rs/grimoire grimoire-rs/indexer grimoire-rs/grimoire-vscode; do
  n=$(comm -13 <(gh release list -R $r --limit 300 --json tagName -q '.[].tagName' | sort) <(gh api repos/$r/tags --paginate -q '.[].name' | sort) | wc -l); echo "$r tags_without_release=$n"; done
```

### A8 crawl.py

```python
import sys,re,subprocess,concurrent.futures as cf
ip='37.27.135.61'
def get(url):
    cmd=['curl','-s','-m','25','-L']
    if '//ocx.sh' in url: cmd+=['--resolve','ocx.sh:443:'+ip]
    return subprocess.run(cmd+[url],capture_output=True,text=True).stdout
def locs(sm):
    x=get(sm); return re.findall(r'<loc>([^<]*)',x)
root=sys.argv[1]
idx=locs(root); urls=[]
for s in idx:
    urls+=locs(s) if s.endswith('.xml') else [s]
def chk(u):
    h=get(u)
    return (u, bool(re.search(r'og:image',h)), 'ld+json' in h, bool(re.search(r'rel="canonical"',h)), bool(re.search(r'name="description"',h)), bool(re.search(r'<title>[^<]+',h)), bool(re.search(r'<script[^>]*src="https?://(?!ocx.sh)',h)), 'twitter:card" content="summary_large_image"' in h)
with cf.ThreadPoolExecutor(16) as ex: r=list(ex.map(chk,urls))
n=len(r); print(root,'urls',n,'og:image',sum(x[1] for x in r),'ld',sum(x[2] for x in r),'canonical',sum(x[3] for x in r),'description',sum(x[4] for x in r),'title',sum(x[5] for x in r),'3p-script',sum(x[6] for x in r),'tw-large',sum(x[7] for x in r))
```

### A9 probe.sh

```bash
# A9: machine-reader and sitemap probes (ocx.sh resolved to the authoritative address)
code(){ h=$1;p=$2; if [ $h = ocx.sh ]; then curl -s --resolve ocx.sh:443:37.27.135.61 -o /dev/null -w '%{http_code}' https://$h/$p; else curl -s -o /dev/null -w '%{http_code}' https://$h/$p; fi; }
for h in ocx.sh grimoire.rs index.grimoire.rs; do printf "%s: " $h; for p in robots.txt sitemap-index.xml sitemap.xml llms.txt llms-full.txt docs/llms.txt rss.xml feed.xml atom.xml index.xml .well-known/security.txt; do printf "%s=%s " $p $(code $h $p); done; echo; done
for p in docs install catalog integrations/bazel integrations/devcontainer apps/catalog; do echo "$p $(code ocx.sh $p/sitemap-index.xml)"; done
```
