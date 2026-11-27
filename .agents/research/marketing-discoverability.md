---
title: "Discoverability of built sites (consolidated)"
topic: marketing-discoverability
program: product
sub_program: marketing
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: MKT-SEO
consolidates:
  - marketing-discoverability/seo-head-metadata-set.md
  - marketing-discoverability/seo-ai-crawler-policy.md
  - marketing-discoverability/seo-retired-tactics-scaled-pages.md
  - marketing-discoverability/followup-q0.md
  - marketing-discoverability/followup-q1.md
  - marketing-discoverability/followup-q3.md
---

# Discoverability of built sites

Question: which crawl, index, share and answer-engine signals must every built site emit, and which AI-era search tactics are banned as retired or spam?

Conventions. `$B` is the build output directory (`dist/` for Astro, `site/` for MkDocs). `$H` is the public host name. `$SM` is a sitemap URL. Fleet paths are relative to `/home/mherwig/dev`. Audit paths are relative to this file's directory. Every platform fact below was fetched by a dive on 2026-11-27, or by the reviser or a wave-2 follow-up on the same date where a line says "reviser" or names `followup-qN`. Re-measurements marked "consolidator" or "reviser" were run on 2026-11-27 from this machine; their commands are given inline. Scratch scripts for the reviser's measurements are under `~/.cache/research-lang/exemplars/product/rev-seo/`.

## Verdict

1. **Check the built output and the live site, never the config alone.** Four of seven fleet Astro sites have no `site:` line, yet all of them build absolute canonicals: `@ocx-sh/theme` requires the site URL (`ocx-sh/website/packages/theme/test/plugin.test.ts:287-294`). The consolidator found `https://ocx.sh/integrations/devcontainer/` as the built canonical in `ocx-sh/devcontainer-features/site/dist/index.html`. A config grep would report a false violation. The reverse case is also real: a MkDocs page with a `description:` frontmatter still built with the site-wide value ([head dive §8](marketing-discoverability/seo-head-metadata-set.md#8-fleet-measurements-2026-11-27)). So every head rule (MKT-SEO-01 to 10) is verified on `$B`. Every robots and crawler rule (11 to 17) is also verified on the public name.
2. **Every indexable page emits one fixed head set:** one absolute canonical equal to its sitemap `<loc>` and its `og:url`, a unique title, a unique description, and the four ogp.me properties. The `og:image` is an absolute https URL that returns 200 with an image type that is not SVG; PNG or JPEG is preferred. A large-image card is declared only when an image exists (a house rule, SHOULD). The fleet's top violations are all in this set, and each is fixed once in a shared generator: `@ocx-sh/theme` for ocx.sh, and `grimoire-rs/indexer` for index.grimoire.rs and lore.ocx.sh.
3. **Ownership of share images is split.** This topic owns only an image's presence and form. Its dimensions belong to the channels sub-program. The audit's share-card gate asks for at least 1200 x 630 and flags grimoire.rs at 1280 x 640 ([distribution-posture.md](product-audit/distribution-posture.md) lines 271, 282). That is a channels question, not an MKT-SEO violation.
4. **The crawler policy lives in a file in the repository.** Neither a CDN default nor an agent's habit sets it. The file is `crawler-policy.toml` at the repository root, a catalog convention and not a standard. It records each vendor token by class: search, user-fetch or training. A CI job gates the live robots.txt and live bot responses against it.
5. **An agent records the crawler policy as it finds it and never flips a decision in either direction.** Two dives disagreed. The crawler dive said to allow training tokens by default. The head dive said the agent must not decide and must report, not reverse. Both hold, at different times. The allow default applies only where nothing blocks a token today, so writing "allow" records what already happens. An existing block is recorded as found, with `owner = "unreviewed"`, and is put to the owner. This covers the Cloudflare block on the grimoire hosts.
6. **Search tokens and user-fetch tokens default to allow.** A block on any of them needs a named owner and a date. Two claims are false and must never appear: that robots.txt controls user-initiated fetches, and that Content-Signal enforces anything.
7. **`llms.txt` is for onboarding coding agents and is not a search tactic.** The dives seemed to conflict here. The retired-tactics dive banned "special AI files". The crawler dive said to ship `llms.txt` to agent users. Google's statement that such files are not needed is about Google Search, and it does not address coding agents that fetch the file. So the file is recommended when a named agent consumer exists, it is optional otherwise, and it is banned when its justification is search or AI visibility. Both OCX and Grimoire have that consumer. Its shape is DOC-AGENT-04's; MKT-SEO-19 adds only the trigger, the no-5xx rule and generation.
8. **Only `WebSite` structured data has a purpose here (SHOULD), and only on each host root.** The head dive rated it CONSIDER and the retired-tactics dive rated it MUST. It is SHOULD because Google states that structured data is not required for its AI features, and a site name only changes how the result looks. `SoftwareApplication` is ineligible for a rich result without a rating or review, so its absence is correct, which overturns part of the audit's smell 7. `FAQPage` and `HowTo` markup has had no rich-result effect since 2026-05-07 and 2023-09-14. Dishonest markup (invented or invisible reviews) is a MUST ban (MKT-SEO-21); dead markup is a SHOULD (MKT-SEO-25).
9. **Generated page sets get a uniqueness floor that measures template share only, not word count, and the floor is a SHOULD.** The dive proposed two tests: at least 150 unique words, and a template share below 0.5. The consolidator re-ran the dive's script: the word test alone fails 17 of 21 pages, because the median page has 121 distinct words. That test also conflicts with Google's statement that it has no preferred length. The template-share test is kept as an unvalidated heuristic: its 0.5 value was set on the index.grimoire.rs `/p/` set (10 of 21 pages at or above it) and has one control, grimoire.rs (48 hand-written pages, 0 at or above it; reviser). It applies only to sets of at least 10 pages, because its shared-shingle definition degenerates on 2 or 3 pages. For the existing index.grimoire.rs set, the owner decides between `noindex` and enriching the pages.
10. **Every AI-era tactic that no platform documents is banned as a justification:** GEO statistics, chunking pages for AI, pages for each fan-out query, and Markdown mirrors used as ranking devices. The only GEO claim with support (add true quotations, statistics and cited sources) is ordinary good writing. It is allowed only as that, and never as a promise of ranking.
11. **ocx.sh fails its most basic discoverability check.** The public name fails TLS: `curl https://ocx.sh/robots.txt` exits with code 60, and DNS returns `65.108.2.88` and `2a01:4f9:6a:5183::2` (consolidator). Earlier reads with `--resolve` proved that the origin is correct. They do not show what a crawler sees. This is an infrastructure decision for the owner, and it blocks every live check on that host.
12. **Gates are deny-lists, not "grep and review".** Where a rule bans wording (MKT-SEO-05, 18, 20), its check is a deny-list grep that must print nothing, with a documented allow (a negated line, or a line that links a platform source). Where a check cannot be made mechanical, the item is labelled a review item and is not part of the MUST gate.
13. **Documented gap: no live X or LinkedIn page states how a share card treats a missing or unusual image, and reading cannot close it** ([followup-q0](marketing-discoverability/followup-q0.md), [followup-q1](marketing-discoverability/followup-q1.md), both 2026-11-27).
    - X: docs.x.com has no cards reference. Its sitemap lists 943 URLs and none contains "cards"; its `llms-full.txt` (5,360,965 bytes) has 0 mentions of `twitter:card`, `twitter:image`, `og:image` or `summary_large_image`. The format list and "SVG is not supported" survive only in archive snapshots of 2026-01-16 and 2026-02-04. The archived large-image page lists `twitter:image` as "Required: No" and says nothing about what renders without one.
    - LinkedIn: the sharing-module block of [a521928](https://www.linkedin.com/help/linkedin/answer/a521928) ("Last updated: 3 years ago", relative only) names no file type. Its "JPG, PNG, or GIF" list belongs to single-image ads. The member-upload page [a564109](https://www.linkedin.com/help/linkedin/answer/a564109) lists WebP, but for uploads, not link previews. No LinkedIn page lists SVG.
    - Consequence: MKT-SEO-07 stays SHOULD. MKT-SEO-06's no-SVG MUST rests on X's archived text alone and must not cite LinkedIn. PNG or JPEG stays a SHOULD house heuristic.
    - What closes it: a logged-in X account that posts links to three throwaway test pages, and a logged-in LinkedIn Post Inspector run over one page per image type. Both are owner steps; an agent never posts. X's own notice says previews are shown in the post composer, not the Card Validator ([X Developers community](https://devcommunity.x.com/t/card-validator-preview-removal/175006), 2022-08-02, vendor).
14. **A preview host's `noindex` header is fleet configuration, not a CDN default** ([followup-q3](marketing-discoverability/followup-q3.md), 2026-11-27). Bunny's pull-zone reference lists no robots or noindex property, and three third-party `*.b-cdn.net` zones answer 200 with no `x-robots-tag`. The fleet sets the header with an edge rule matched per host URL (`ocx-sh/website/infra/bunny/rules.mjs:402-408`). A new or renamed preview host therefore answers without it unless it joins the rule's host list. MKT-SEO-14 stays retired; the new MKT-SEO-26 (SHOULD) checks each non-public host live.

## The ruleset

Severity counts: 17 MUST, 8 SHOULD, 1 retired (MKT-SEO-14). A rule that rests on a platform fact names its source, the date the source states, and how to re-check it. Thresholds marked "heuristic" or "house rule" are this catalog's values, not platform values.

### Head set (verified on the build output)

**MKT-SEO-01. Configure the production origin so that every canonical, `og:url` and sitemap `<loc>` is an absolute https URL on the deploy host.** Severity: MUST.
- Rationale: with no origin set, canonicals and sitemap entries disappear or turn relative. A theme can inject the origin, so the config is not the evidence.
- Verification: `grep -rhoE '(rel="canonical" href|property="og:url" content)="[^"]*"' "$B" | grep -vE "=\"https://$H[/\"]"` prints nothing. `grep -hoE '<loc>[^<]*' "$B"/sitemap*.xml | grep -v "<loc>https://$H/"` prints nothing. A config grep (`site:` in `astro.config.*`, `site_url:` in `mkdocs.yml`) is a hint only.
- Fact: [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) requires `site` (no date on page). [MkDocs](https://www.mkdocs.org/user-guide/configuration/) `site_url` adds the canonical (no date on page). Re-check both on each framework major release.

**MKT-SEO-02. Emit exactly one `<link rel="canonical">` in `<head>` of every indexable page, with no fragment. Its value equals the page's sitemap `<loc>` and its `og:url`, and no HTTP `Link:` header names a different URL.** Severity: MUST.
- Rationale: the canonical is a strong signal and a sitemap entry is a weak one. Signals that disagree let Google pick either URL.
- Verification:
  - One per page: `for f in $(grep -rL 'content="noindex' --include='*.html' "$B"); do [ "$(grep -o 'rel="canonical"' "$f" | wc -l)" = 1 ] || echo "$f"; done` prints nothing.
  - Equal to the sitemap: `comm -3 <(grep -rhoE 'rel="canonical" href="[^"]*"' --include='*.html' "$B" | sed 's/.*href="//;s/"$//' | sort -u) <(grep -hoE '<loc>[^<]*' "$B"/sitemap*.xml | sed 's/<loc>//' | grep -v '\.xml$' | sort -u)` prints nothing. This needs a build with a deliberate `noindex` set excluded.
  - Per page, `og:url` equals the canonical.
  - The header check, `curl -sI https://$H/<path> | grep -i '^link:.*canonical'`, is empty or equal to the HTML value.
- Fact: [Google, consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) (last updated 2026-07-10). [ogp.me](https://ogp.me/) says `og:url` is the canonical (no date on page). Re-check: read the "Last updated" footer with `curl -sL <url> | grep -oE 'Last updated [0-9-]+'`.

**MKT-SEO-03. Give every page a unique, non-empty `<title>` that names the page. Put the site name at most once, at one end, after a delimiter.** Severity: MUST.
- Rationale: Google rewrites titles that are half empty, repeated across pages, or that duplicate the site name.
- Verification: `find "$B" -name '*.html' -exec grep -ho '<title>[^<]*' {} + | sort | uniq -d` prints nothing. No title is empty or equal to the site name alone. Fail example: `ocx: The Simple Package Manager | ocx`.
- Fact: [Google, title links](https://developers.google.com/search/docs/appearance/title-link) (last updated 2025-12-10). Re-check the list of rewrite triggers on that page.

**MKT-SEO-04. Give every page its own meta description, taken from that page's source. A site-level value may appear only on the home page and on aggregation pages.** Severity: MUST.
- Rationale: a description set in the config and copied onto every page counts as present but is a duplicate. The fleet's MkDocs sites score 100% present and 0% unique.
- Verification:
  - On the build (decisive): `find "$B" -name '*.html' -exec grep -ho '<meta name="description" content="[^"]*"' {} + | sort | uniq -c | awk '$1>1'` prints at most the home or aggregation value. `grep -rL 'name="description"' --include='*.html' "$B"` prints nothing.
  - In the source: `find <docs> \( -name '*.md' -o -name '*.mdx' \) | xargs grep -L -m1 -E '^description:'` prints only pages on a named exempt list.
  - Review item (not gated): a description that is one noun or a comma-separated keyword list counts as missing.
- Fact: [Google, snippets](https://developers.google.com/search/docs/appearance/snippet) (last updated 2026-04-20). The wording of the home description belongs to MKT-POS.

**MKT-SEO-05. Never enforce a title or description character limit as if Google set one.** Severity: MUST.
- Rationale: Google states no limit and truncates to the device width. The 60-character and 155-160-character figures are third-party habits that agents turn into failing lints.
- Verification (deny-list, must print nothing): `grep -rniE '(google|serp)[^.]{0,60}\b[0-9]{2,3}[ -]?char|\b[0-9]{2,3}[ -]?char[a-z]*\b[^.]{0,60}(google|serp)' . --include='*.md' --include='*.mdx' --include='*.astro' --include='*.ts' --include='*.js' --include='*.mjs' --include='*.json' --include='*.yml' --include='*.yaml' --include='*.toml' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=target --exclude-dir=.git | grep -viE "\b(no|not|never|none|isn't|doesn't|does not)\b"`.
  - The regex matches a character count only when Google or "SERP" is on the same sentence, so an unrelated "60 characters" (a commit subject) does not match.
  - Allow: a line that negates the limit is removed by the second grep. Pass: "Google states no length limit." Fail: "Google truncates titles at 60 characters."
  - Tested by the reviser on five sample lines: it flagged the three lines that attribute a limit to Google or the SERP, and passed "Keep the subject under 60 characters" and "Google sets no 60-character limit".
  - Review item (not gated): a length lint that exists is warn-level and names its third-party source.
- Fact: Google [title links](https://developers.google.com/search/docs/appearance/title-link) (2025-12-10) and [snippets](https://developers.google.com/search/docs/appearance/snippet) (2026-04-20) both state there is no limit. Re-check: search each page for "limit".

**MKT-SEO-06. Emit `og:title`, `og:type`, `og:image` and `og:url` on every page. Make `og:image` an absolute https URL that returns 200 with an image `Content-Type` that is not SVG. Prefer PNG or JPEG under 5 MB, and put `og:image:alt` beside it.** Severity: MUST (PNG or JPEG, the 5 MB ceiling and `og:image:alt`: SHOULD).
- Rationale:
  - ogp.me lists these four properties as required, and the protocol does not define a relative image URL.
  - No SVG: X's card markup reference states, for `twitter:image`, "SVG is not supported", and it names `og:image` as that tag's fallback, so an SVG `og:image` is the image X rejects.
  - PNG or JPEG is a house heuristic, not a platform rule. X's archived markup reference says for `twitter:image`: "JPG, PNG, WEBP and GIF formats are supported ... SVG is not supported." LinkedIn states no file type for the `og:image` of a shared link: its sharing-module requirements are a 5 MB maximum, a 1200 x 627 pixel minimum and a 1.91:1 ratio, and its only "JPG, PNG, or GIF" list is for single-image ads. Its upload page lists WebP for member uploads, and no LinkedIn page lists SVG. No page says whether WebP works in a LinkedIn link preview, so PNG and JPEG stay the safe common subset ([followup-q1](marketing-discoverability/followup-q1.md), 2026-11-27).
  - The no-SVG MUST rests on X's archived text only. LinkedIn says nothing about SVG and is not cited for it.
  - Byte size: X ("less than 5MB") and LinkedIn's sharing module ("Max file size: 5 MB") give the same ceiling. Byte size is a property of the response, so it is form and belongs here. Pixel dimensions stay with channels.
  - `og:image:alt`: ogp.me says "If the page specifies an og:image it should specify og:image:alt".
- Verification:
  - Presence: `for p in title type image url; do echo "$p $(grep -rL "property=\"og:$p\"" --include='*.html' "$B" | wc -l)"; done` prints 0 for each.
  - Image form (MUST), per distinct image URL `$u`: `case $u in https://*) ;; *) echo FAIL;; esac; curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$u" | awk '$1!=200 || $2!~/^image\// || $2~/svg/{exit 1}'` exits 0. Reviser, 2026-11-27: exit 0 for `https://grimoire.rs/og-card.png` (`200 image/png`), exit 1 for `https://index.grimoire.rs/logo.svg` (`200 image/svg+xml`).
  - Image type (SHOULD): the same `curl` prints `200 image/png` or `200 image/jpeg`.
  - Image size (SHOULD): `curl -s -o /dev/null -w '%{size_download}\n' "$u" | awk '$1>5000000{exit 1}'` exits 0. 5,000,000 bytes is used because neither page says which megabyte it means; it is the smaller reading. Follow-up q1, 2026-11-27: exit 0 for `https://grimoire.rs/og-card.png` (105,570 bytes). No fleet image fails, so the fail branch is untested on a real asset.
  - Alt (SHOULD): `grep -rl 'property="og:image"' --include='*.html' "$B" | xargs -r grep -L 'property="og:image:alt"'` prints nothing.
  - Dimensions are not checked here; they belong to channels.
- Fact: [ogp.me](https://ogp.me/) (no date; Open Web Foundation Agreement 0.9 is the only version marker; quotes read by the reviser with `curl -sL https://ogp.me/`). X Cards markup reference: the live URL `https://developer.x.com/en/docs/x-for-websites/cards/overview/markup` now redirects to `https://docs.x.com/overview` (reviser, `curl -sL -o /dev/null -w '%{url_effective}'`), so the text was read from the [Wayback snapshot of 2026-01-16](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup). As of 2026-11-27 docs.x.com holds no cards reference: `curl -s https://docs.x.com/sitemap.xml | grep -c cards` prints 0 ([followup-q0](marketing-discoverability/followup-q0.md)). The format list and "SVG is not supported" exist only in that snapshot and in the [large-image card snapshot of 2026-02-04](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image). [LinkedIn Help a521928](https://www.linkedin.com/help/linkedin/answer/a521928) ("Last updated: 3 years ago", relative; checked 2026-11-27) and [LinkedIn Help a564109](https://www.linkedin.com/help/linkedin/answer/a564109) ("Last updated: 2 months ago", relative), vendor documentation. Re-check:
  - ogp.me "Basic Metadata" once a year.
  - The X sitemap command above. A count above 0 means a cards page is back; read it for the format list.
  - LinkedIn: in a521928 reduced to text, `sed -n '/image requirements specific to the LinkedIn sharing module/,/image specifications for single image ads/p' | grep -ciE 'file type|jpg|png|gif|webp|svg'` prints 0, and `grep -c 'Max file size: 5 MB'` prints 1 or more (both true on 2026-11-27). When LinkedIn lists a type for the sharing module, replace the heuristic with that list.

**MKT-SEO-07. Declare `twitter:card=summary_large_image` only on a page that emits an `og:image` or a `twitter:image`. Otherwise declare `summary`, or omit the tag.** Severity: SHOULD (house rule).
- Rationale: this is a house rule. The platform part is narrow. X's markup reference says it "explains the OpenGraph fallback behavior for each Twitter tag", and its `twitter:image` row falls back to `og:image`. A page with neither tag gives the large card no image source. The reference does not say what X then renders, and the live page is gone, so the rule is not a MUST. The archived large-image card page lists `twitter:image` as "Required: No": X never promised that an image-less large card works, and never forbade it. No X page answers the question today, so reading cannot promote this rule (Verdict 13). The same reference says a summary card "may be rendered" from `og:type`, `og:title` and `og:description` when `twitter:card` is absent. The defect is still the fleet's most common head defect: 128 pages on ocx.sh.
- Verification: `grep -rl 'summary_large_image' --include='*.html' "$B" | xargs -r grep -LE 'property="og:image"|name="twitter:image"'` prints nothing.
- Fact: X Cards markup reference, [Wayback snapshot of 2026-01-16](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup); the live URL redirects to `https://docs.x.com/overview` (reviser, 2026-11-27). [Large-image card, Wayback snapshot of 2026-02-04](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image): `twitter:image` "Required: No". docs.x.com has no cards page (sitemap 943 URLs, 0 matches; `llms-full.txt`, 0 matches; [followup-q0](marketing-discoverability/followup-q0.md), 2026-11-27). Re-check: `curl -s https://docs.x.com/sitemap.xml | grep -c cards`. If a cards page is back, read what it renders for a large card with no image, then promote this rule to MUST or retire it. A measured result from an owner's logged-in test post (Verdict 13) also settles it.

**MKT-SEO-08. Set `og:type` to `website` on the home page, docs pages and landing pages. Use `article` only on dated posts that also carry `article:published_time`.** Severity: SHOULD.
- Rationale: the fleet's built Starlight heads show `article` as the emitted default on product landings. That default describes the page wrongly.
- Verification: `grep -o 'og:type" content="[^"]*"' "$B/index.html"` shows `website`. `grep -rl 'og:type" content="article"' --include='*.html' "$B" | xargs -r grep -L 'article:published_time'` prints nothing.
- Fact: [ogp.me](https://ogp.me/), under Object Types, `website`: "Any non-marked up webpage should be treated as og:type website." (no date on page; quote read by the reviser with `curl -sL https://ogp.me/`, 2026-11-27). Re-check yearly.

### Sitemaps and robots.txt

**MKT-SEO-09. Leave `<priority>` and `<changefreq>` out of sitemaps.** Severity: SHOULD.
- Rationale: Google and Bing ignore both tags. Agents copy them from old tutorials, and they suggest an effect that does not exist. The absolute-https `<loc>` clause this rule used to carry is removed: MKT-SEO-01 already gates every `<loc>` on the deploy host, and an absolute `<loc>` is common knowledge.
- Verification: `grep -hE '<(priority|changefreq)>' "$B"/sitemap*.xml` prints nothing. `xmllint --noout "$B"/sitemap*.xml` exits 0.
- Fact: [Google, build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) (last updated 2026-07-08). [Bing](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search) (2025-07-31). Re-check both yearly.

**MKT-SEO-10. Omit `<lastmod>`, or set it to the real time the content last changed. Never set it to the build or generation time.** Severity: MUST.
- Rationale: Google uses `lastmod` only when it is consistently accurate, and Bing says never to use the generation time. Astro's integration cannot read per-page dates without `serialize()`.
- Verification: build twice with no content change and `diff` the two sitemaps; any `lastmod` difference fails. `grep -ho '<lastmod>[^<]*' "$B"/sitemap*.xml | sort | uniq -c` showing one value across every URL fails.
- Fact: as for MKT-SEO-09.

**MKT-SEO-11. Serve `/robots.txt` at the root of every host that serves pages: status 200, `text/plain`, UTF-8, no more than 5 redirects (a conservative bound) and under 500 KiB. Use only `user-agent`, `allow`, `disallow` and `sitemap` in any group that applies to Googlebot.** Severity: MUST.
- Rationale:
  - Google reads any 4xx except 429 as "no robots.txt". A 401 or 403 therefore means no restrictions, not "blocked". A 5xx stops crawling for 12 hours. `crawl-delay` and `noindex:` are ignored.
  - `text/plain`: RFC 9309 says "The file MUST be UTF-8 encoded ... and Internet Media Type "text/plain"". Google's spec says "a UTF-8 encoded plain text file" and names no media type.
  - Redirects: Google "follows at least five redirect hops". RFC 9309 says crawlers "SHOULD follow at least five consecutive redirects" and, past five, "MAY assume the robots.txt file is unavailable". Five is therefore the largest count every compliant crawler must follow, not a Google cap.
  - A project path on github.io is not a host root and cannot hold a robots.txt.
- Verification:
  - Response: `curl -sL -o /dev/null -w '%{http_code} %{num_redirects} %{size_download} %{content_type}\n' https://$H/robots.txt | awk '$1!=200 || $2>5 || $3>=512000 || $4!~/^text\/plain/{exit 1}'` exits 0. The content type goes last because it can contain a space. Reviser: exit 0 on `https://grimoire.rs/robots.txt`, exit 1 on `https://ocx-sh.github.io/indexbot/robots.txt`.
  - Fields: `awk 'tolower($1)=="user-agent:"{if(!ua)g="";g=g" "tolower($2);ua=1;next} {ua=0} tolower($1)~/^(crawl-delay|noindex):$/ && g~/ (\*|googlebot)( |$)/{print g": "$0; bad=1} END{exit bad}' robots.txt` exits 0. It reads a run of `User-agent` lines as one group. A `Crawl-delay` line under a `ClaudeBot` group passes, because Anthropic says ClaudeBot honours it. Reviser: exit 0 on the live grimoire.rs file, exit 1 on a sample with `User-agent: Bingbot` / `User-agent: *` / `Crawl-delay: 2`.
- Fact: [Google robots.txt spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (last updated 2026-10-23). [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) (September 2022), sections 2.3 and 2.3.1.2. Re-check the Google status-code and field sections yearly.

**MKT-SEO-12. List every sitemap index the host publishes in robots.txt, each with a fully qualified `Sitemap:` line.** Severity: MUST.
- Rationale: a sitemap in a subdirectory covers only that directory unless someone submits it. Today ocx.sh names one index, which reaches 4 of 298 URLs.
- Verification: `curl -s https://$H/robots.txt | grep -ciE '^sitemap: https://'` equals the number of sitemap indexes the deploy publishes. On ocx.sh that is the root, `docs`, `install`, `catalog`, `integrations/bazel`, `integrations/devcontainer` and `apps/catalog`, found with `curl -s -o /dev/null -w '%{http_code}' https://$H/<section>/sitemap-index.xml`. Every live page URL falls under a listed index.
- Fact: [Google, build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) (2026-07-08). Re-check yearly.

**MKT-SEO-13. Repeat every shared `Disallow` line inside each named user-agent group.** Severity: MUST.
- Rationale: a crawler obeys only its most specific matching group. A group for `OAI-SearchBot` therefore replaces `User-agent: *` completely, along with its private-path rules.
- Verification: `awk 'tolower($1)=="user-agent:"{g=$2} tolower($1)=="disallow:"{print g"\t"$2}' robots.txt`. Every `Disallow` path listed under `*` also appears under each named group that does not disallow `/`.
- Fact: [Google robots.txt spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (2026-10-23), section on group matching.

**MKT-SEO-14. Retired 2026-11-27.** Was: never combine `noindex` with a robots.txt `Disallow` for the same URL, and mark preview deploys `noindex` while leaving them crawlable. Retired as common knowledge: a competent model already follows it, and the fleet shows no violation. The measurements are in the fleet table, row 14. The number is not reused.

### AI crawler policy

**MKT-SEO-15. Record the crawler policy in `crawler-policy.toml` at the repository root.** Severity: MUST (house convention: the file name, location and fields are this catalog's, not a platform's; the duty to record a decision is the rule).
- What the file holds:
  - One `[token."<name>"]` table for each token on the vendors' current crawler pages, each with `class` (`search`, `user-fetch` or `training`) and `decision`.
  - On every `block`: `owner` and `decided`, or `owner = "unreviewed"` alone for a block an agent found and did not decide.
  - A top-level `reviewed` date and `sources` (the vendor URLs).
  - A `cdn` list naming any CDN feature that rewrites the live file.
- How an agent fills it:
  - It records the status quo and never changes a recorded decision.
  - A block it finds with no owner (a CDN default) is recorded as `decision = "block"` and `owner = "unreviewed"`, and it raises the question with the owner.
  - Where nothing blocks a token today, it records `allow`.
- Rationale: without the file, a CDN default sets the policy without anyone deciding it, as on both grimoire hosts. Token lists change too: `anthropic-ai` and `Claude-Web` are gone from Anthropic's page.
- Verification:
  - `grep -cE '^\[token\."(OAI-SearchBot|Claude-SearchBot|PerplexityBot|ChatGPT-User|Claude-User|Perplexity-User|GPTBot|ClaudeBot|Google-Extended)"\]' crawler-policy.toml` prints 9.
  - `python3 -I -c 'import tomllib,sys,datetime as d;p=tomllib.load(open("crawler-policy.toml","rb"));b=[k for k,v in p["token"].items() if v["decision"]=="block" and not (v.get("owner")=="unreviewed" or (v.get("owner") and v.get("decided")))];u=[k for k,v in p["token"].items() if v.get("owner")=="unreviewed"];old=(d.date.today()-d.date.fromisoformat(p["reviewed"])).days>180;print("fail:",b,"stale:",old,"open items:",u);sys.exit(bool(b) or old)'` exits 0. A block with `owner = "unreviewed"` and no `decided` passes and is printed as an open item for the owner; a block with a named owner and no `decided` fails. Reviser, 2026-11-27, on a three-token sample file: exit 0 with `GPTBot` unreviewed, exit 1 after `decided` was removed from a named-owner `ClaudeBot` block.
  - `anthropic-ai` or `Claude-Web` appears only together with `ClaudeBot`.
- Fact: [OpenAI bots](https://developers.openai.com/api/docs/bots) (no date on page), [Anthropic crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) (updated in November 2026; "as of October 30, 2026" clause), [Perplexity bots](https://docs.perplexity.ai/guides/bots) (no date on page), [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) (no date on page). Re-check: re-read all four pages and diff their token lists against the file.

**MKT-SEO-16. After every deploy and every CDN or WAF change, gate the live robots.txt and the live responses to bot user agents against `crawler-policy.toml`.** Severity: MUST.
- Rationale: Cloudflare's managed robots.txt prepends its own block to the origin file. The grimoire.rs repository says `Allow: /`, while the live file names 32 tokens and the edge answers a search token with 403.
- Verification:
  - Tokens: `comm -23 <(curl -s https://$H/robots.txt | awk 'tolower($1)=="user-agent:"{print $2}' | grep -v '^\*$' | sort -u) <(grep -oE '^\[token\."[^"]+"\]' crawler-policy.toml | sed -E 's/.*"(.*)".*/\1/' | sort -u)` prints nothing. Compare tokens, not bytes, on any host listed in `cdn`.
  - Bytes, on other hosts: `diff <(curl -s https://$H/robots.txt | grep -v '^#' | grep -v '^$') <(grep -v '^#' "$B"/robots.txt | grep -v '^$')` prints nothing.
  - Status: for every search and user-fetch token, `curl -s -o /dev/null -w '%{http_code}' -A "Mozilla/5.0 (compatible; <token>/1.0)" https://$H/` equals the status for a browser user agent.
  - Limit: this is a user-agent string test from one IP address, not an IP-verified bot test.
- Fact: [Cloudflare managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) (dateModified 2026-11-02, platform documentation). Re-check every 90 days.

**MKT-SEO-17. After every deploy, check the live site under its public name, with no `--resolve` and no `-k`. Treat a TLS error as a failure.** Severity: MUST.
- What the check covers:
  - The live sitemap `<loc>` set, reached from every `Sitemap:` line in the live robots.txt, equals the build's.
  - For a fixed sample, the canonical, title, description and `og:image` match the build file for the same path. The sample is the home page plus the first 5 and the last 5 URLs of the sorted live `<loc>` set, so two runs on the same deploy check the same pages.
- Rationale: a read with `--resolve` proves only the origin. A crawler sees the public name. Today the public name ocx.sh fails TLS.
- Verification: `bash live17.sh "$H" "$B"` (the script is in the appendix) prints nothing and exits 0. It exits 1 on a TLS error, a sitemap difference, a missing build file or a head difference. Reviser, 2026-11-27: exit 0 for `grimoire.rs` against `grimoire-rs/grimoire/docs/dist`; exit 1 for `ocx.sh` against `ocx-sh/website/site/dist`, with curl error 60.

**MKT-SEO-18. Never describe a crawler control as more than it is.** Severity: MUST.
- What not to claim:
  - Blocking `Google-Extended` does not remove a site from AI Overviews or AI Mode. The controls for those are `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex`, and applying them site-wide is an owner decision.
  - `Content-Signal` and robots.txt are preferences, not enforcement.
  - robots.txt does not govern `ChatGPT-User` or `Perplexity-User`.
- Rationale: these are the three false beliefs that make a policy fail silently.
- Verification (deny-list, must print nothing): `grep -rniE 'google-extended.{0,80}(overview|ai mode)|content-signal.{0,40}(block|prevent|stop|enforce)|robots\.txt.{0,60}(chatgpt-user|perplexity-user|claude-user)' docs README.md crawler-policy.toml | grep -viE "\b(no|not|never|none|isn't|doesn't|does not)\b"`.
  - Allow: a negated line, such as the correct statement "Blocking Google-Extended does not remove a site from AI Overviews", is removed by the second grep.
  - Pass wording: "requests" or "reserves". Fail wording: "Content-Signal blocks training".
  - Reviser test on five sample lines: it flagged the three false claims and passed the negated line and "Content-Signal requests no training".
  - Limit: a false claim written with a negation ("does not need anything beyond Google-Extended to leave AI Overviews") slips through. That case is a review item.
- Fact: [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) and [Google AI features](https://developers.google.com/search/docs/appearance/ai-features) (no date on page). [Cloudflare Content Signals](https://blog.cloudflare.com/content-signals-policy/) (2025-09-24). [OpenAI](https://developers.openai.com/api/docs/bots) and [Perplexity](https://docs.perplexity.ai/guides/bots) on user-initiated fetches. Re-check every 90 days.

**MKT-SEO-19. Publish `/llms.txt` when the docs name a coding-agent consumer. Write it as agent onboarding, generate it at build time where the stack allows it, and never let it return a 5xx.** Severity: SHOULD.
- How:
  - Write its H1 and blockquote as agent onboarding.
  - Its shape is DOC-AGENT-04's, and DOC-AGENT-04's awk shape test applies. This rule adds only the trigger, the no-5xx rule and generation. It does not forbid the file on a site with no named consumer; there the file is optional.
  - Generate it from the docs navigation on the fleet's stacks, which both have a build hook: an Astro endpoint under `src/pages/` (the pattern `ocx-sh/website/site/src/pages/robots.txt.ts` already uses), or a MkDocs `hooks:` script ([MkDocs configuration](https://www.mkdocs.org/user-guide/configuration/), "New in version 1.4").
  - On a stack with no build hook, a hand-kept file in the static passthrough directory is accepted. For VitePress, `public/` is where it belongs ([machine-readers.md](../../skills/docs-quality-reference/machine-readers.md) line 69). The link check below is then the drift guard.
- Rationale: Google says the file has no effect on Search. The Chrome Lighthouse audit flags a server error on `/llms.txt`. Claude-Code was the second most common named AI fetcher of llms.txt in vendor data. A hand-kept second index drifts from the navigation.
- Verification:
  - `curl -s -o /dev/null -w '%{http_code}' https://$H/llms.txt` prints 200 or 404.
  - Astro and MkDocs only: `test ! -f public/llms.txt && test ! -f docs/llms.txt` passes, meaning the file is not kept by hand.
  - Link check: `grep -oE 'https://[^) ]+' llms.txt | sort -u | while read -r u; do c=$(curl -s -o /dev/null -w '%{http_code}' "$u"); case $c in 2*) ;; *) echo "$c $u";; esac; done` prints nothing.
- Fact: [Google Search changelog](https://developers.google.com/search/updates) (entry 2026-06-15), [Lighthouse audit](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt) (no date on page), [Ahrefs](https://ahrefs.com/blog/llmstxt-study/) (vendor data, 2026-06-15, May 2026 data), [llmstxt.org](https://llmstxt.org/) (modified 2026-08-10). Re-check every 180 days.

### Banned tactics and structured data

**MKT-SEO-20. Never justify a discoverability change by an AI-visibility or ranking effect that no platform documents, and never report one.** Severity: MUST.
- This covers `llms.txt` or Markdown mirrors used as SEO, pages split into chunks for AI, AI-specific markup, one page per paraphrased or fan-out query, and the GEO "up to 40%" figure quoted as a general effect.
- Rationale: Google says optimizing for its generative AI search is still SEO and needs no new files, markup or chunking. Pages made for each fan-out query to manipulate AI answers violate its scaled-content policy. The 40% figure comes from one engine (GPT-3.5) with a fixed context, and a 2026 survey says it does not carry over to organic search.
- Verification (deny-list, must print nothing): `{ git log -1 --format=%B; gh pr view --json body -q .body 2>/dev/null; git diff -U0 origin/main...HEAD -- '*.md' '*.mdx' '*.astro' '*.html' | grep '^+'; } | grep -nE '\b(GEO|AEO|LLMO)\b|AI visibility|[Rr]ank(s|ing)? in (ChatGPT|Perplexity|Claude|Gemini)|[Aa]nswer engine optimi|up to 40 ?%' | grep -vE 'https://(developers\.google\.com|www\.bing\.com/webmasters|blogs\.bing\.com)/'`.
  - Allow: a hit line that links a Google or Bing documentation page is removed by the last grep, because the effect it names is then documented.
  - Reviser test on four sample lines: it flagged "Add llms.txt to boost AI visibility." and "GEO: up to 40% more citations", passed a line linking the Google AI optimization guide, and passed "geolocation support".
  - Review item (not gated): a change that adds sitemap URLs is checked for titles that differ only in wording; compare `grep -c '<loc>'` before and after the change.
- Fact: [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (added 2026-05-15 per the changelog, last updated 2026-07-10). [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (last updated 2026-11-23). [GEO paper v3](https://arxiv.org/abs/2311.09735) (2024-06-28, results reported by its authors). [Martinez survey](https://www.alphaxiv.org/abs/2607.14035.md) (2026-07-15, preprint). Re-check the guide and the changelog every 90 days.

**MKT-SEO-21. Never emit structured data that misleads: no invented, hidden or self-serving reviews or ratings, and no markup for content readers cannot see.** Severity: MUST.
- What it bans:
  - `review` or `aggregateRating` unless the reviews and the rating are visible on the page and are genuine.
  - On `LocalBusiness` or any `Organization` type, a review of the site's own entity.
  - Markup that describes content not visible to readers of the page.
- Rationale: Google's structured-data policies say "Don't mark up content that is not visible to readers of the page" and "Don't mark up irrelevant or misleading content, such as fake reviews". The review-snippet guidelines say users "should be able to see the text of the review and associated rating". They also make a review about entity A on entity A's site ineligible for `LocalBusiness` and `Organization` markup. Misleading markup can bring a manual action. This rule used to say reviews must "come from third parties" and must "not be about the site's own product". That overclaimed: Google's self-serving restriction covers `LocalBusiness` and `Organization` only.
- Verification:
  - Gate (deny-list): `grep -rlE 'aggregateRating|"@type" *: *"(Review|AggregateRating)"' "$B" | grep -vxFf structured-data-reviews.txt` prints nothing. `structured-data-reviews.txt` is the allow-list: one built path per line, for a page whose visible reviews a human has checked. With no such file, every hit fails. The fleet emits no JSON-LD, so the list is empty.
  - Review item (not gated): each JSON-LD object describes the page's visible main content.
- Fact: [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) (last updated 2026-07-10) and [review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) (last updated 2026-09-08). The reviser read both quotes with `curl -sL <url>` on 2026-11-27. Re-check the [gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) every 90 days.

**MKT-SEO-22. Emit one `WebSite` JSON-LD object on the root URL of each host, with `name` and with `url` equal to the root canonical.** Severity: SHOULD.
- Rationale: this is Google's only strong lever for the site name. A subdirectory cannot have its own site name, so all ocx.sh sections share the root's.
- Verification: `curl -s https://$H/ | grep -A5 'application/ld+json'` shows `"@type":"WebSite"` and a `url` equal to the canonical. Check the syntax with the Schema Markup Validator, because the Rich Results Test does not support site names.
- Fact: [Google, site names](https://developers.google.com/search/docs/appearance/site-names) (last updated 2025-12-10). Re-check yearly.

**MKT-SEO-23. Never change a visible date, `dateModified` or `lastmod` without a change to the content, and never intercept the back button. Both rules include code from third-party scripts.** Severity: MUST.
- Rationale: Google lists date bumps without real change as a warning sign. Back-button hijacking has been a spam policy since its announcement on 2026-04-13, enforced from 2026-06-15, and code from included libraries and ad scripts counts.
- Verification:
  - Dates: compare `dateModified` with `git log -1 --format=%cI -- <source file>`.
  - Back button (gate): `grep -rlE 'popstate' "$B" --include='*.js' --include='*.html' | grep -vxFf back-button-allow.txt` prints nothing. `back-button-allow.txt` lists the built files of a client-side router a human has checked; with no file, every `popstate` handler fails. `history.pushState` and `replaceState` alone do not fail: a table-of-contents hash link and a query-string sync use them, and neither intercepts Back.
- Fact: [Back-button hijacking](https://developers.google.com/search/blog/2026/04/back-button-hijacking) (2026-04-13). [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) (last updated 2026-10-05). Re-check every 180 days.

**MKT-SEO-24. Measure template share (method in the appendix) on every change to a generator of a page set of 10 or more pages, such as catalog, package or version pages.** Severity: SHOULD.
- What follows from the result:
  - In a new set, or in an existing set that grows, a page with a template share of 0.5 or more ships with `noindex` and stays out of the sitemap. The exception is a page the owner has recorded as "index", with a plan to enrich it with data the source README lacks: versions with dates, the install command, the digest, compatibility.
  - In an existing set, an agent reports the result and does not flip any page.
  - There is no word-count floor.
- The number is unvalidated. 0.5 is this catalog's heuristic. It was set on the index.grimoire.rs `/p/` set, the same set it then flagged (10 of 21 pages at or above it). It has one control: grimoire.rs, 48 hand-written docs pages, gives median 0.00 and 0 pages at or above 0.5 (reviser, `python3 -I shingle.py https://grimoire.rs/sitemap.xml`). No platform publishes a threshold.
- Minimum set size: 10 pages. A shingle counts as template when it appears on at least `max(2, 0.5*n)` pages. On 2 pages that means every shingle the two share, and on 3 pages, any shingle shared by two of them, so small sets read as templated by construction. Below 10 pages the script's result is not used.
- Rationale: Google judges scaled content by its purpose and added value and publishes no threshold. It says it has no preferred length and lists "writing to a word count" as a warning sign. Near-duplicate templated pages are what the scaled-content policy describes.
- Verification: `python3 -I shingle.py "$SM" '<path filter>'` (appendix) prints `pages <n>` with n of 10 or more, and `pages>=0.5: 0`, or every listed page has `noindex` and no sitemap `<loc>`.
- Fact: [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (2026-11-23). [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) (2026-10-05). Re-check every 90 days.

**MKT-SEO-25. Do not add structured data that cannot produce a rich result: `FAQPage` or `HowTo` emitted for a rich result, and `SoftwareApplication` with no rating or review.** Severity: SHOULD.
- Rationale: FAQ rich results ended on 2026-05-07 and HowTo on 2023-09-14. `SoftwareApplication` needs a rating or a review to be eligible. Such markup is dead, not dishonest, so it is split out of MKT-SEO-21 and is not a MUST.
- Verification: `grep -rlE '"@type" *: *"(FAQPage|HowTo)"' "$B"` prints nothing. `grep -rlE '"@type" *: *"SoftwareApplication"' "$B" | xargs -r grep -LE 'aggregateRating|"review"'` prints nothing. A hit is reported and does not block a build.
- Fact: [Search updates log](https://developers.google.com/search/updates) (FAQ end 2026-05-07, documentation removed 2026-06-15, review guideline 2026-07-24). [HowTo change](https://developers.google.com/search/blog/2023/08/howto-faq-changes) (2023-09-14). [Software app](https://developers.google.com/search/docs/appearance/structured-data/software-app) (2026-09-08). Re-check the [gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) every 90 days.

### Preview hosts

**MKT-SEO-26. After every deploy, and before traffic reaches a new or renamed host, check that every host that is not the public host answers `X-Robots-Tag: noindex`. Take the list of hosts from the deploy or CDN plan, not from memory.** Severity: SHOULD.
- Scope: preview, rehearsal and CDN-default hosts (such as `*.b-cdn.net`) of a site that has them. It does not restate the retired MKT-SEO-14: whether to `noindex` a preview is common knowledge. This rule checks that the header survives a host change.
- Rationale: on Bunny the header is not a zone property or a `b-cdn.net` default. The pull-zone reference lists no robots or noindex property, and three third-party `*.b-cdn.net` zones answer 200 with no `x-robots-tag`. The fleet sets it with a `Set Response Header` edge rule whose triggers are per-host URL patterns, built over every planned host except `ocx.sh` (`ocx-sh/website/infra/bunny/rules.mjs:402-408`; `infra/bunny/__snapshots__/plan-preview-ocx.json`). A host left out of that list answers without the header ([followup-q3](marketing-discoverability/followup-q3.md), 2026-11-27).
- Why SHOULD and not MUST: no fleet host fails today, and the harm is reduced by a second layer. Both live preview homes also carry a robots `noindex` meta in their HTML (reviser, 2026-11-27), so a lost header exposes mainly non-HTML responses. The fleet already has a verifier for the same condition: `infra/bunny/verify.mjs` reports `X-Robots-Tag has no noindex` on any non-public host it probes. Whether CI runs it against a future custom preview host is not measured, because no such host exists yet (`scripts/previews/sites.mjs:85`).
- Verification:
  - Live, per non-public host `$P`: `curl -sI https://$P/ | grep -i '^x-robots-tag:.*noindex'` prints a line. Follow-up q3, 2026-11-27: a line for `sh-ocx-preview-ocx.b-cdn.net`, `sh-ocx-dev.b-cdn.net` and `sh-ocx.b-cdn.net`; no line for the third-party zones `test.b-cdn.net`, `example.b-cdn.net` and `bunnynet-avatars.b-cdn.net`.
  - Plan, in `ocx-sh/website`: `grep -c '"Description": "ocx:noindex"' infra/bunny/__snapshots__/plan-preview-*.json` prints 1 or more for each preview plan (reviser, 2026-11-27: 1 for `plan-preview-ocx.json`), and the rule's trigger patterns contain the new host.
  - Limit: the plan paths are specific to the ocx.sh website repository. The `curl` check is general.
- Fact: [Bunny API, list pull zones](https://bunny.net/docs/reference/pullzonepublic_index) and [custom hostname](https://bunny.net/docs/cdn/custom-hostname) (vendor documentation; no content date, the `last-modified` header equals the fetch time). Re-check on every change to `infra/bunny/rules.mjs` or to a zone's host list, and re-read the pull-zone reference every 365 days for a robots property.

### Dropped or handed off

- **Dropped as common knowledge.**
  - No keyword stuffing and no hidden text.
  - Sitemap files under 50,000 URLs and 50 MB: the generators already handle this.
  - A UTF-8 sitemap.
  - Absolute `<loc>` values (formerly part of MKT-SEO-09; MKT-SEO-01 still gates the host).
  - `noindex` never combined with a `Disallow`, and preview deploys marked `noindex` and left crawlable (formerly MKT-SEO-14, retired; fleet measurement in row 14).
- **Dropped as bureaucracy.** A per-generator page cap with a README value statement (retired-tactics rule 11). MKT-SEO-24's measurement does the same job with a check.
- **Dropped for lack of evidence.**
  - `<link rel="sitemap">` in the head: it is documented by Astro, but nothing shows an effect.
  - Markdown mirrors kept away from search by a robots rule: this is a CONSIDER with no measured benefit, and DOC-AGENT-01 already covers twins.
- **Handed off, one line each:**
  - Labelling vendor data in copy goes to marketing-claims-evidence (MKT-CLAIM).
  - Human review of titles, descriptions and alt text written by AI goes to marketing-voice-ai-authorship (MKT-VOICE).
  - The ban on reporting an "AI-answer rank" goes to marketing-measurement (MKT-MEAS). SparkToro found identical brand lists in under 1 in 100 runs ([SparkToro](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/), 2026-01-28, not peer reviewed).
  - Share-image dimensions go to channels. The follow-ups found two dated platform figures for them: X's large-image card, 2:1 ratio, minimum 300 x 157, maximum 4096 x 4096 ([Wayback snapshot of 2026-02-04](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image)), and LinkedIn's sharing module, minimum 1200 x 627, ratio 1.91:1 ([a521928](https://www.linkedin.com/help/linkedin/answer/a521928), "Last updated: 3 years ago").
  - `LinkedInBot` is not added to `crawler-policy.toml`. LinkedIn's help page says a missing preview image may mean "your website may be blocking us", but it names no user-agent token, and none is taken from memory ([followup-q1](marketing-discoverability/followup-q1.md)).
  - DOC-AGENT-04 and DOC-AGENT-05 cite mecanik.dev for figures that are found only in the [Ahrefs study](https://ahrefs.com/blog/llmstxt-study/). The docs-quality owner should re-source those two rows ([crawler dive §7](marketing-discoverability/seo-ai-crawler-policy.md#7-existing-catalog-rules-reconciled)).
  - DOC-AGENT-04 reads "Publish `llms.txt`" with no consumer condition. MKT-SEO-19 recommends it only where a coding-agent consumer is named and leaves it optional elsewhere. The docs-quality owner may align DOC-AGENT-04's wording. The two rules do not conflict on shape or location.

## Applied to the fleet

Reviser measurements over the 16 fleet repositories (all of `grimoire-rs/*` and `ocx-sh/*` except `grimoire-lore`, the catalog itself) use the file list from `~/.cache/research-lang/exemplars/product/rev-seo/scripts/fleetgrep.sh` (run as `cd /home/mherwig/dev && bash fleetgrep.sh <list-file>`). It collects `*.md`, `*.mdx`, `*.astro`, `robots.txt` and `mkdocs.yml`, skipping `node_modules`, `.git`, `target`, `dist`, `.agents` and `.claude`: 2,792 files.

| Rule | Status | Evidence |
|---|---|---|
| 01 | satisfied | All 7 Astro sites build absolute canonicals. 4 have no `site:` line but inherit it from `@ocx-sh/theme` (`ocx-sh/website/packages/theme/test/plugin.test.ts:287-294`; consolidator read the built canonical in `ocx-sh/devcontainer-features/site/dist/index.html`). MkDocs: `site_url` set in 3 of 3 ([head dive](marketing-discoverability/seo-head-metadata-set.md) line 129). This corrects the "3 of 7" figure that seo-geo.md and the topic map carry. |
| 02 | violated | index.grimoire.rs: canonical on 0 of 25 pages ([distribution-posture.md](product-audit/distribution-posture.md) lines 159, 173). Source: `grimoire-rs/indexer/src/renderer/astro/layouts/Base.astro:39-43` emits title, `og:title`, `og:description`, `og:image` and `twitter:card`, but no canonical, no `og:url` and no `og:type` (consolidator, `grep -n -E 'canonical\|og:\|twitter' Base.astro`). The same renderer serves lore.ocx.sh ([messaging-inventory.md](product-audit/messaging-inventory.md) line 170). Fix it once in the indexer. ocx.sh (298 of 298) and grimoire.rs (48 of 48) satisfy presence (distribution-posture.md lines 154-158). Equality to the sitemap has never been tested, because `crawl.py` checks presence only (distribution-posture.md line 260). |
| 03 | violated | `ocx-sh/website/site/dist/index.html` has `<title>ocx: The Simple Package Manager \| ocx`, which repeats the site name (reviser, `grep -oE '<title>[^<]*' ocx-sh/website/site/dist/index.html`). |
| 04 | violated | The three MkDocs sites set one site-wide value: `ocx-sh/indexbot/mkdocs.yml:4`, `ocx-sh/ocx-mirror/mkdocs.yml:4` and `grimoire-rs/indexer/mkdocs.yml:13` (reviser, `grep -n '^site_description' mkdocs.yml`). Every built page carries it: one value on 23 of 23 indexer pages, 10 of 10 ocx-mirror pages and 9 of 9 indexbot pages (command over each live sitemap: `curl -s <sitemap> \| grep -oE '<loc>[^<]*' \| sed 's/<loc>//' \| while read u; do curl -s "$u" \| grep -oE '<meta name="description" content="[^"]*"'; done \| sort \| uniq -c`). Source coverage is 0 of 24 for `ocx-sh/catalog/docs` and 0 of 12 for `ocx-sh/rules_ocx/docs` (reviser, `find <dir> -path '*/node_modules' -prune -o \( -name '*.md' -o -name '*.mdx' \) -print \| xargs grep -l -m1 -E '^description:' \| wc -l`). Satisfied on the ocx.sh marketing build: 13 HTML files in `ocx-sh/website/site/dist`, 0 description values with a count above 1 (reviser, the rule's `uniq -c \| awk '$1>1'` command). Satisfied on `grimoire-rs/grimoire/docs`: 45 of 45 content pages; the 46th file is `docs/README.md`, not a page. |
| 05 | satisfied | The rule's deny-list over the 16 repositories (`*.md`, `*.mdx`, `*.astro`, `*.ts`, `*.js`, `*.mjs`, `*.json`, `*.yml`, `*.yaml`, `*.toml`, skipping `node_modules`, `dist`, `target`, `.git`, `.agents`, `.claude`) printed nothing (reviser). No length lint exists ([config-inventory.md](product-audit/config-inventory.md) line 473: SEO content guidance 0). |
| 06 | violated | ocx.sh: `og:image` on 0 of 298 pages (distribution-posture.md lines 154-157, 174), and no ocx site config sets one (messaging-inventory.md line 175). MkDocs sites: 0 of 19, and indexer 2 of 23 (distribution-posture.md line 175). index.grimoire.rs and lore.ocx.sh emit a relative SVG `/logo.svg` (distribution-posture.md line 173; source `Base.astro:42` `withBase(image)`); the rule's image-form gate exits 1 on `https://index.grimoire.rs/logo.svg` (`200 image/svg+xml`, reviser). Satisfied on grimoire.rs: `https://grimoire.rs/og-card.png` returns `200 image/png` on 48 of 48 pages (distribution-posture.md line 171), and the gate exits 0 (reviser). Its size is 105,570 bytes, so the 5 MB SHOULD passes (followup-q1). |
| 07 | violated (SHOULD) | ocx.sh: 128 pages declare `summary_large_image` with no image (distribution-posture.md line 30). `ocx-sh/website/site/dist/index.html` declares `summary_large_image` and has no `property="og:image"` (reviser, `grep -oE 'summary_large_image\|property="og:image"' ocx-sh/website/site/dist/index.html`). The devcontainer-features build does the same (messaging-inventory.md line 169). |
| 08 | violated | `og:type=article` in `ocx-sh/website/site/dist/index.html` (reviser, `grep -o 'og:type" content="[^"]*"'`) and on devcontainer-features (messaging-inventory.md lines 168-169), and on grimoire.rs `start.html` and `privacy.html` (messaging-inventory.md line 167; `grimoire-rs/grimoire/docs/public/start.html:38-46`). Satisfied on the grimoire.rs landing, which overrides the type to `website` and says why in a comment (`index.astro:52-56`, messaging-inventory.md line 174). |
| 09, 10 | satisfied | 0 `priority`, `changefreq` or `lastmod` tags in `ocx-sh/website/site/dist/sitemap-0.xml` and `grimoire-rs/grimoire/docs/dist/sitemap-0.xml` (consolidator, `grep -cE '<(priority\|changefreq\|lastmod)>'`). |
| 11 | violated | The GitHub project sites cannot own a robots.txt. Reviser, `curl -s -o /dev/null -w '%{http_code} %{content_type}' <url>/robots.txt`: `404 text/html; charset=utf-8` for `https://grimoire-rs.github.io/indexer`, `https://ocx-sh.github.io/ocx-mirror`, `https://ocx-sh.github.io/indexbot` and the bare hosts `https://grimoire-rs.github.io` and `https://ocx-sh.github.io`. The rule's response gate exits 1 on `https://ocx-sh.github.io/indexbot/robots.txt`. This is a domain decision for the owner. grimoire.rs passes (exit 0). ocx.sh's origin serves 200 and 66 bytes (distribution-posture.md line 183); its public name is blocked by rule 17. |
| 12 | violated | ocx.sh robots.txt names 1 of 7 sitemap indexes, which reaches 4 of 298 URLs (distribution-posture.md lines 183, 188). The robots route is generated by the theme (`ocx-theme-setup/SKILL.md:245-248` per config-inventory.md line 473), so the fix lands there. |
| 13 | satisfied (vacuous) | No `*` group anywhere carries a `Disallow`, so a named group drops nothing. Every repository robots file has exactly one group, `User-agent: *`: `ocx-sh/website/site/dist/robots.txt`, `grimoire-rs/grimoire/docs/public/robots.txt`, `grimoire-rs/grimoire/docs/dist/robots.txt`, `ocx-sh/index/dist/robots.txt`, plus three test fixtures and one copy in a cargo cache under `grimoire-rs/grim-gui/target/` (reviser, `find grimoire-rs ocx-sh -name robots.txt` without `node_modules`, `.git` and `grimoire-lore`, then `grep -ciE '^user-agent:'`). The live grimoire.rs and index.grimoire.rs files have 0 `Disallow` lines under `*` (reviser, `curl -s https://$h/robots.txt \| awk 'tolower($1)=="user-agent:"{g=$2} tolower($1)=="disallow:" && g=="*"{n++} END{print n+0}'`). |
| 14 | retired; satisfied when retired | A preview deploy exists: `ocx-sh/website/.github/workflows/previews.yml` deploys to Bunny zones at `https://sh-ocx-preview-<site>.b-cdn.net/` (`ocx-sh/website/scripts/previews/sites.mjs:88`). Reviser, for `ocx` and `rules-ocx`: `curl -sI <url>` shows `x-robots-tag: noindex, nofollow`, set by the fleet's edge rule `ocx:noindex` (`ocx-sh/website/infra/bunny/rules.mjs:402-408`), not a Bunny default (followup-q3; now checked by MKT-SEO-26). The home page carries a `name="robots" content="noindex"` meta, and `/robots.txt` returns 404, so the preview is crawlable. The 8 built `noindex` pages (`/frag/` fragments in `ocx-sh/website/site/dist` and `ocx-sh/devcontainer-features/site/dist`, from `ocx-sh/website/packages/theme/src/layouts/Fragment.astro:20`) sit on hosts whose robots.txt has no `Disallow`. |
| 15 | violated | No repository records any crawler decision: `find /home/mherwig/dev -name crawler-policy.toml -not -path '*/node_modules/*'` prints nothing (reviser). Cloudflare disallows 31 groups on grimoire.rs and index.grimoire.rs (distribution-posture.md lines 190, 272). On the 31 versus 32 difference: the live file names 32 distinct non-`*` tokens in 31 `Disallow: /` groups. `AwarioSmartBot` and `AwarioRssBot` share one group (live grimoire.rs lines 86-88). The audit's awk keeps only the last `User-agent` of each group, so it counts 31; rule 16's token comparison counts 32 (reviser, `awk 'tolower($1)=="user-agent:"{print $2}' \| grep -v '^\*$' \| sort -u \| wc -l` gives 32 on both hosts). |
| 16 | violated | Live grimoire.rs robots.txt differs from `grimoire-rs/grimoire/docs/public/robots.txt:1-4` (distribution-posture.md line 190). `PerplexityBot` gets 403 while a browser gets 200, and robots.txt never names that bot ([crawler dive](marketing-discoverability/seo-ai-crawler-policy.md) line 138). Re-run by the consolidator with `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (compatible; PerplexityBot/1.0)' https://grimoire.rs/`: 403, against 200 for `-A 'Mozilla/5.0'`. |
| 17 | violated | `bash live17.sh ocx.sh ocx-sh/website/site/dist` exits 1 with curl error 60, "no alternative certificate subject name matches target host name 'ocx.sh'" (reviser). DNS returns `65.108.2.88` and `2a01:4f9:6a:5183::2` (consolidator; messaging-inventory.md line 177; [retired-tactics dive](marketing-discoverability/seo-retired-tactics-scaled-pages.md) line 121, which saw a certificate for `bazel-cache.ocx.sh`). Satisfied on grimoire.rs: `bash live17.sh grimoire.rs grimoire-rs/grimoire/docs/dist` exits 0 (reviser). |
| 18 | satisfied | The rule's first grep over the 2,792 fleet files printed nothing (reviser, `fleetgrep.sh`, section R18). No `crawler-policy.toml` exists to search (row 15). |
| 19 | open (SHOULD) | No `llms.txt` or `llms-full.txt` in any fleet repository (reviser, `find grimoire-rs ocx-sh -name 'llms.txt' -o -name 'llms-full.txt'`, skipping `node_modules`, `.git`, `target` and `grimoire-lore`: 0 files). `https://grimoire.rs/llms.txt` and `https://index.grimoire.rs/llms.txt` return `404 text/html`, which passes the no-5xx check; `https://ocx.sh/llms.txt` fails TLS (exit 60) and returns 404 through `--resolve ocx.sh:443:37.27.135.61` (reviser). Both products' users configure coding agents, so the named consumer exists and the SHOULD applies. |
| 20 | satisfied (proxy) | The rule's deny-list regex over the 2,792 fleet files printed nothing (reviser, `fleetgrep.sh`, section R20). The rule gates PR bodies, commit messages and changed copy; the fleet's docs and READMEs are the proxy measured here. |
| 21 | satisfied | 0 JSON-LD across 413 pages, so no review or rating markup (distribution-posture.md line 167). |
| 22 | violated | No host root emits `WebSite` JSON-LD (distribution-posture.md line 167). The only one is injected by Jekyll SEO on the legacy rules_ocx site. |
| 23 | satisfied (back button, `lastmod`, `dateModified`); visible dates not measured | Third-party: 0 of 413 crawled pages load a third-party script (distribution-posture.md line 40). First-party: `grep -rlE 'popstate' <build> --include='*.js' --include='*.html'` finds 0 files in `ocx-sh/website/site/dist`, `grimoire-rs/grimoire/docs/dist`, `ocx-sh/index/dist` and `ocx-sh/devcontainer-features/site/dist` (reviser). The two `history.*State` hits, both in `ocx-sh/index/dist/_astro/`, are a `replaceState` query sync (`grid_session.VZODRw5u.js`) and a hash `pushState` table of contents (`toc.zag.-SnOo896.js`); neither intercepts Back. 0 `lastmod` (row 10) and 0 JSON-LD (row 21), so no `dateModified`. |
| 24 | violated (SHOULD) | 10 of 21 index.grimoire.rs `/p/` pages have a template share of 0.5 or more. The `hex-*` pages reach 0.80. Pairwise Jaccard is 0.5 or more in 49 of 210 pairs (retired-tactics dive line 119; consolidator and reviser re-ran the script with the same result). Control: grimoire.rs, 48 pages, 0 pages at or above 0.5 (reviser). The 170 ocx.sh `/catalog/` pages are unmeasured because of rule 17. |
| 25 | satisfied | 0 JSON-LD across 413 pages, so no FAQ, HowTo or SoftwareApplication markup (distribution-posture.md line 167). The audit's smell 7 ("no SoftwareApplication") is withdrawn for that type. |
| 26 | satisfied (SHOULD) | The three fleet `*.b-cdn.net` zones answer `x-robots-tag: noindex, nofollow`: `sh-ocx-preview-ocx` (pull zone 6775825), `sh-ocx-dev` (6740411) and `sh-ocx` (6740409) (followup-q3, `curl -sI -m 15 <url> \| grep -iE '^(HTTP\|x-robots)'`). `sh-ocx-preview-rules-ocx.b-cdn.net` answers the same, and both preview homes carry a robots `noindex` meta (reviser, 2026-11-27). `plan-preview-ocx.json` has 1 `ocx:noindex` rule (reviser, the rule's `grep -c`). No custom preview host exists yet, so the host-change case is unmeasured. |

The legacy Jekyll site `ocx-sh.github.io/rules_ocx/` duplicates `/integrations/bazel/` and has no sitemap (distribution-posture.md lines 145, 163). Whether to retire it, redirect it or mark it `noindex` is an owner decision, listed below. The catalog already has a `test/acceptance/seo.test.ts` (config-inventory.md line 473). The `site-discoverability` rule's checks should extend that test, not replace it.

## AI-agent failure modes

Ranked by how often each bites, grouped by mechanism. The counts are fleet measurements.

1. **A config default taken as per-page coverage.** `site_description` stands in for 42 page descriptions. The Starlight default `og:type=article` ships on product landings. A theme declares `summary_large_image` with no image (128 ocx.sh pages). Checks: MKT-SEO-04, 07, 08 on the build.
2. **"It works in the dev server."** A root-relative `og:image` (`/logo.svg`), a relative canonical or `Sitemap: /sitemap.xml`, or no origin set. Checks: MKT-SEO-01, 06, 11.
3. **Habits from tutorials in the training data.** `priority` and `changefreq` on every entry, `lastmod` set to `new Date()`, `Crawl-delay` for Googlebot, 60 and 160 character limits presented as Google's, `FAQPage` or `HowTo` added "for rich results", `anthropic-ai` used as the Anthropic token. Checks: MKT-SEO-05, 09, 10, 11, 15, 25.
4. **GEO hype as a justification.** `llms.txt` "to rank in ChatGPT", docs split into chunks, one page per query variant, the "40%" figure. Checks: MKT-SEO-19, 20.
5. **robots.txt semantics misread.** A named group that silently drops the `*` rules. `Google-Extended` taken as an AI Overviews opt-out. Content-Signal taken as enforcement. A 403 on robots.txt taken as "blocked". Checks: MKT-SEO-11, 13, 18. (`noindex` together with `Disallow` is common knowledge; formerly MKT-SEO-14.)
6. **Treating the repository as the truth.** A CDN rewrites robots.txt. The edge returns 403 to a search bot. The public name fails TLS while the origin is fine. A `noindex` header bound to a host list is assumed to follow a new preview host name. Checks: MKT-SEO-16, 17, 26.
7. **Generating pages at scale without measuring.** A templated page for each item with no uniqueness check. An invented `aggregateRating` on a SoftwareApplication. Checks: MKT-SEO-21, 24.
8. **Changing policy alone.** An agent "fixes" a block it found in either direction: it removes Cloudflare's training block, or it adds a blanket `GPTBot` block "for privacy". This happens rarely but costs a lot. Check: MKT-SEO-15 records the status quo.

## What an agent must ask a human

- Training tokens on grimoire.rs and index.grimoire.rs: keep the Cloudflare block (`ai-train=no`, 32 tokens in 31 groups) or allow? Until the owner answers, the file records `owner = "unreviewed"`.
- Is the edge 403 to `PerplexityBot` (a search token) on the grimoire hosts intended? Changing it is a WAF or AI Crawl Control decision.
- Do Cloudflare Managed robots.txt and Bot Preference Sync stay on?
- The ocx.sh TLS and DNS cutover (`ocx-sh/website/README.md:7`). This is infrastructure work that only the owner can do.
- Canonical hosts: do the github.io project sites (indexer, ocx-mirror, indexbot) move to a custom domain so they can own a robots.txt? Is the legacy rules_ocx Jekyll site retired, redirected or marked `noindex`?
- The index.grimoire.rs `/p/` pages below the floor: enrich them or mark them `noindex`?
- Which approved image becomes the ocx.sh `og:image`? An agent may wire up an existing asset but must not generate a brand image.
- Publish `llms.txt` on ocx.sh and grimoire.rs? The default says yes; the owner confirms what it exposes.
- Any site-wide `nosnippet` or `max-snippet` to limit AI Overviews. The default is none, because it also removes ordinary snippets.
- Optional, to settle Verdict 13: post links to three throwaway test pages from a logged-in X account (card tag only; card plus `og:image`; card plus an SVG `og:image`), and run LinkedIn Post Inspector, signed in, over one page per image type (PNG, JPEG, WebP, SVG, GIF). Record which render an image. An agent never posts or signs in.

## Decay

| Rules | Fact that moves | Refresh interval | How to re-check |
|---|---|---|---|
| 15, 16, 18 | Vendor token lists and classes (OpenAI, Anthropic, Perplexity, Google). Anthropic changed its list and its signal clause in October 2026. | 90 days | Re-read the four vendor pages and diff the token tables. |
| 16 | Cloudflare managed robots.txt behaviour and its default block | 90 days | Re-read the docs page's `dateModified`, then `curl -s https://grimoire.rs/robots.txt`. |
| 18, 15 | AI preference syntax: Content-Signal against IETF AIPREF. Google says it intends to support AIPREF "in early 2027". | Date-triggered: 2027-03-31 | [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) and the [aipref WG](https://datatracker.ietf.org/wg/aipref/about/) milestones. |
| 20, 21, 23, 24, 25 | Google spam policies, structured-data gallery and AI optimization guide (6 dated changes between 2026-05 and 2026-11) | 90 days | Read the [Search updates log](https://developers.google.com/search/updates) for entries newer than this file. |
| 19 | Lighthouse `llms.txt` audit; llms.txt adoption data | 180 days | Re-read the Lighthouse page; vendor studies are context only. |
| 23 | Back-button policy FAQ (added 2026-11-23) | 180 days | Re-read the blog post and its FAQ. |
| 06, 07 | X cards reference: the live pages redirect to `docs.x.com/overview`, and docs.x.com had no cards page on 2026-11-27 (sitemap 943 URLs, 0 matches). The rule text rests on archive snapshots of 2026-01-16 and 2026-02-04. | 90 days | `curl -s https://docs.x.com/sitemap.xml \| grep -c cards` prints 0; above 0, re-read the image formats, the fallback rows and the missing-image behaviour. |
| 06 | LinkedIn sharing-module image requirements (5 MB, no file type); the page shows only a relative date ("Last updated: 3 years ago" on 2026-11-27) | 180 days | The two `grep` checks in MKT-SEO-06's Fact line: 0 type words in the sharing-module block, and the 5 MB line still present. |
| 26 | Bunny pull-zone properties (no robots property on 2026-11-27) and the fleet's `ocx:noindex` edge rule | On every change to `infra/bunny/rules.mjs` or a zone's host list; the vendor page every 365 days | `curl -sI https://<host>/ \| grep -i '^x-robots-tag:.*noindex'` per non-public host; scan the pull-zone reference for a robots or noindex property. |
| 02, 03, 04, 05, 09-13, 22 | Google canonical, title, snippet, sitemap, robots and site-name documentation | 365 days | Compare each page's "Last updated" footer with the date cited here. |
| 11 | RFC 9309 (September 2022) | On a new RFC that updates 9309 | Check the RFC Editor page for an "Updated by" line. |
| 06, 07, 08 | ogp.me | 365 days | Re-read "Basic Metadata" and "Object Types". |
| 01, 10, 19 | Astro, Starlight and MkDocs mechanics | On each framework major release | Re-read the sitemap, config and hooks reference pages. |

## Open questions

Another research round, as questions:

1. Does Cloudflare block a `PerplexityBot` coming from Perplexity's published IP ranges on the grimoire hosts, or only a request that claims the user agent? This needs AI Crawl Control logs, so the owner's dashboard access is a precondition.
2. Which syntax is Anthropic's "no AI training" signal (honoured "as of October 30, 2026")? Did the IETF aipref drafts reach the IESG? The answer decides whether MKT-SEO-15 gains a signal field.
3. Why did indexer's one page with a `description:` frontmatter build with the site value? Does MkDocs Material read a per-page `description` without a template override? MKT-SEO-04's fix for MkDocs depends on the answer.
4. Once TLS works, do the 170 ocx.sh `/catalog/` pages pass the template-share floor? That set is also the second data point MKT-SEO-24's 0.5 needs before it can return to MUST.
5. Does any fleet page need JavaScript to render its primary content (catalog search, the install picker)? This is the topic map's uncovered P2 `initial-html-content` row. The risk is low on static Astro, but no one has measured it.

(Former question 6, on X's image-less large card and format list, was researched in [followup-q0](marketing-discoverability/followup-q0.md). No page answers it, so it is now a documented gap in Verdict 13, not an open question.)

Owner decisions are listed in "What an agent must ask a human". Two decisions belong to the catalog author when writing the `site-discoverability` rule:

- Keep the `crawler-policy.toml` name and location, or fold the record into the positioning record.
- Ship `shingle.py` and `live17.sh` under `skills/<set>-reference/checks/`, and fix the names of the two allow-list files (`structured-data-reviews.txt`, `back-button-allow.txt`).

## Sub-artifacts

- [seo-head-metadata-set.md](marketing-discoverability/seo-head-metadata-set.md): the required head set, description uniqueness, sitemap and robots form, and the live-versus-repository check. Fleet head and sitemap measurements.
- [seo-ai-crawler-policy.md](marketing-discoverability/seo-ai-crawler-policy.md): AI tokens by class, Content-Signal, llms.txt purpose, the robots.txt of 25 exemplars, the grimoire.rs edge probe, and the proposal for `crawler-policy.toml`.
- [seo-retired-tactics-scaled-pages.md](marketing-discoverability/seo-retired-tactics-scaled-pages.md): retired structured data, spam policies, the state of the GEO evidence, AI-click studies, and the shingle measurement of generated pages.

## Key sources

1. https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls: canonical strength and the absolute-URL rule (last updated 2026-07-10).
2. https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap: sitemap limits, ignored tags, `lastmod` (2026-07-08).
3. https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec: status codes, fields, group matching, "at least five redirect hops" (2026-10-23).
4. https://www.rfc-editor.org/rfc/rfc9309: robots.txt media type `text/plain` and the five-redirect bound (September 2022).
5. https://developers.google.com/search/docs/appearance/snippet: descriptions are unique and have no length limit (2026-04-20).
6. https://ogp.me/: the four required Open Graph properties, `og:image:alt`, the `website` default (no date on page).
7. https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup: X card tags, `og:image` fallback, "SVG is not supported" (snapshot 2026-01-16; live page redirected on 2026-11-27).
8. https://developers.google.com/search/docs/fundamentals/ai-optimization-guide: optimizing for generative AI search is still SEO; no special files, markup or chunking (2026-07-10).
9. https://developers.google.com/search/docs/essentials/spam-policies: scaled content abuse, back-button hijacking (2026-11-23).
10. https://developers.google.com/search/updates: dated changes, including the FAQ end and the llms.txt note.
11. https://developers.google.com/search/docs/appearance/structured-data/sd-policies: no markup of invisible content, no fake reviews (2026-07-10).
12. https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers: what Google-Extended controls; AIPREF plan (no date on page).
13. https://developers.openai.com/api/docs/bots: OpenAI search, training and user-fetch tokens (no date on page).
14. https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler: Anthropic tokens (updated November 2026).
15. https://docs.perplexity.ai/guides/bots: Perplexity search and user-fetch tokens (no date on page).
16. https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/: the CDN rewrite (dateModified 2026-11-02).
17. https://developers.google.com/search/docs/appearance/structured-data/software-app: SoftwareApplication eligibility (2026-09-08).
18. https://ahrefs.com/blog/llmstxt-study/: llms.txt request data (vendor data, 2026-06-15).
19. https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image: large-image card, `twitter:image` "Required: No", dimensions (snapshot 2026-02-04).
20. https://www.linkedin.com/help/linkedin/answer/a521928: LinkedIn sharing-module image requirements, no file type ("Last updated: 3 years ago", checked 2026-11-27).
21. https://bunny.net/docs/reference/pullzonepublic_index: Bunny pull-zone properties, no robots property (vendor documentation, fetched 2026-11-27).

## Appendix: shingle.py (the MKT-SEO-24 measurement)

This is the retired-tactics dive's script, which existed only in a session scratch directory. It is stored here so the check survives. It fetches every `<loc>` of a sitemap (recursing into indexes) and takes the visible text of `<main>`, or of the body without nav, header, footer, script and style. It builds 5-word shingles and reports each page's template share: the fraction of its shingles that appear on at least half the pages (and on at least 2). Run it as `python3 -I shingle.py <sitemap-url> [path-regex]`.

- Consolidator re-run on 2026-11-27 over `https://index.grimoire.rs/sitemap.xml '/p/'`: 21 pages; words min, median and max 122, 224 and 425; distinct-word median 121; `pages>=0.5: 10`; pairs at 0.5 or more: 49 of 210. Distinct words under 150: 17 of 21, which is why the word arm was dropped. The reviser's re-run printed the same figures.
- Reviser control on 2026-11-27 over `https://grimoire.rs/sitemap.xml`: 48 pages; words min, median and max 232, 1873.5 and 44680; template share median 0.00; `pages>=0.5: 0`; pairwise Jaccard max 0.089, 0 of 1128 pairs at 0.5 or more.

```python
import sys,re,urllib.request,itertools,statistics
from html.parser import HTMLParser
from collections import Counter
def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':'research-measure/1'})
    return urllib.request.urlopen(r,timeout=30).read().decode('utf8','replace')
def locs(u):
    out=[]
    for l in re.findall(r'<loc>([^<]+)</loc>',get(u)):
        out+= locs(l) if l.endswith('.xml') else [l]
    return out
class P(HTMLParser):
    SKIP=('script','style','nav','header','footer','noscript','svg')
    def __init__(s):
        super().__init__();s.skip=0;s.t=[];s.inmain=0;s.main=[]
    def handle_starttag(s,t,a):
        if t in s.SKIP:s.skip+=1
        if t=='main':s.inmain+=1
    def handle_endtag(s,t):
        if t in s.SKIP and s.skip:s.skip-=1
        if t=='main' and s.inmain:s.inmain-=1
    def handle_data(s,d):
        if s.skip:return
        s.t.append(d)
        if s.inmain:s.main.append(d)
def words(h):
    p=P();p.feed(h)
    return re.findall(r"[\w'’-]+",' '.join(p.main or p.t).lower())
def sh(w,k=5): return {' '.join(w[i:i+k]) for i in range(max(0,len(w)-k+1))}
def run(sm,filt=None):
    pg={}
    for u in [u for u in locs(sm) if not filt or re.search(filt,u)]:
        try: pg[u]=words(get(u))
        except Exception as e: print('ERR',u,e)
    S={u:sh(w) for u,w in pg.items()}
    df=Counter(s for v in S.values() for s in v); n=len(pg)
    rows=[(u,len(w),len(set(w)),sum(1 for s in S[u] if df[s]>=max(2,0.5*n))/max(1,len(S[u]))) for u,w in pg.items()]
    js=[len(S[a]&S[b])/max(1,len(S[a]|S[b])) for a,b in itertools.combinations(S,2)]
    ws=[r[1] for r in rows]
    print('pages',n,'words min/median/max',min(ws),statistics.median(ws),max(ws),'distinct median',statistics.median(r[2] for r in rows))
    print('template share median %.2f mean %.2f  pages>=0.5: %d'%(statistics.median(r[3] for r in rows),statistics.mean(r[3] for r in rows),sum(r[3]>=.5 for r in rows)))
    if js: print('pairwise Jaccard median %.3f max %.3f; pairs>=0.5: %d of %d'%(statistics.median(js),max(js),sum(j>=.5 for j in js),len(js)))
    for r in sorted(rows,key=lambda r:-r[3]):
        if r[3]>=.5: print('  FLOOR',r[0],'%.2f'%r[3])
run(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else None)
```

## Appendix: live17.sh (the MKT-SEO-17 check)

Written and run by the reviser on 2026-11-27. Usage: `bash live17.sh <host> <build-dir>`. It prints nothing and exits 0 on a pass. The sample is fixed: the home page plus the first 5 and the last 5 URLs of the sorted live `<loc>` set.

```bash
#!/usr/bin/env bash
set -u
H=$1 B=$2 rc=0
curl -sS -o /dev/null "https://$H/" || exit 1
live_locs() { curl -sS "$1" | grep -oE '<loc>[^<]*' | sed 's/<loc>//' | while read -r u; do case $u in *.xml) live_locs "$u" ;; *) echo "$u" ;; esac; done; }
live=$(curl -sS "https://$H/robots.txt" | awk 'tolower($1)=="sitemap:"{print $2}' | tr -d '\r' | while read -r s; do live_locs "$s"; done | sort -u)
built=$(find "$B" -name 'sitemap*.xml' -exec grep -hoE '<loc>[^<]*' {} + | sed 's/<loc>//' | grep -v '\.xml$' | sort -u)
d=$(comm -3 <(echo "$live") <(echo "$built")); [ -z "$d" ] || { echo "SITEMAP DIFF"; echo "$d"; rc=1; }
fields() { grep -oE '<title>[^<]*|rel="canonical" href="[^"]*"|<meta name="description" content="[^"]*"|property="og:image" content="[^"]*"'; }
sample=$( { echo "https://$H/"; echo "$live" | head -5; echo "$live" | tail -5; } | sort -u)
for u in $sample; do
  p=${u#https://$H}; f=$B$p; case $f in */) f=${f}index.html ;; esac
  [ -f "$f" ] || { echo "NO BUILD FILE $u"; rc=1; continue; }
  diff <(curl -sS "$u" | fields) <(fields < "$f") > /dev/null || { echo "HEAD DIFF $u"; rc=1; }
done
exit $rc
```

## Revision log

2026-11-27, reviser (opus), after an adversarial check. IDs are stable; one ID retired, one ID added.

- MKT-SEO-05: replaced "grep, then review the hits" with a deny-list that must print nothing. The regex now needs "Google" or "SERP" in the same sentence, so an unrelated "60 characters" no longer matches. A negated line is the documented allow. Tested on sample lines.
- MKT-SEO-06: the PNG/JPEG MUST rested on an unsourced line. MUST is now "image type, not SVG", sourced to X's card markup ("SVG is not supported", via the 2026-01-16 archive snapshot). PNG or JPEG is now a SHOULD labelled house heuristic, sourced to the X and LinkedIn format lists. `og:image:alt` is sourced to ogp.me. The image gate now exits non-zero.
- MKT-SEO-07: MUST demoted to SHOULD, labelled house rule. X's fallback row (`twitter:image` falls back to `og:image`) is cited from the archive, but the live reference is gone and does not say what renders with no image. The check now also accepts `twitter:image`.
- MKT-SEO-08: Fact line now quotes ogp.me: "Any non-marked up webpage should be treated as og:type website."
- MKT-SEO-09: dropped the absolute-https `<loc>` clause as common knowledge, already gated by MKT-SEO-01. Severity MUST to SHOULD (only `priority` and `changefreq` remain).
- MKT-SEO-11: "at most 5 redirects" restated as "no more than 5 (conservative)". Google says it follows "at least five", and RFC 9309 says crawlers MAY stop past five. `text/plain` is now cited to RFC 9309 §2.3. Both awk checks now exit non-zero on failure; the field check reads multi-line groups.
- MKT-SEO-14: retired as common knowledge, with no fleet violation. The preview hosts send `x-robots-tag: noindex`, and no `noindex` page sits under a `Disallow`. Moved to the dropped list; the number is not reused.
- MKT-SEO-15: the Python gate now accepts `owner = "unreviewed"` without `decided`, matching the text, and prints unreviewed tokens as open items. Tested pass and fail. MUST labelled house convention.
- MKT-SEO-17: the non-runnable `comm ... '...'` command and the random 10-URL sample are replaced by `live17.sh` (appendix), with a fixed sample: the home page plus the first and last 5 sorted URLs. Run on grimoire.rs (pass) and ocx.sh (fail, TLS).
- MKT-SEO-18: "hits are reviewed" replaced by a deny-list that must print nothing, with negated lines as the allow. Its limit is stated.
- MKT-SEO-19: aligned with `skills/docs-quality-reference/machine-readers.md:69` and DOC-AGENT-04. The "only" is removed: the file is recommended with a named consumer and optional otherwise. `test ! -f public/llms.txt` is scoped to Astro and MkDocs, which both have a build hook; a hand-kept passthrough file is accepted elsewhere. A runnable link check was added. The DOC-AGENT-04 wording gap is handed to the docs-quality owner.
- MKT-SEO-20: replaced "every hit names a benefit" with a deny-list over commit, PR and changed copy. A line linking a Google or Bing doc is the allow. The pages arm is now a review item, not gated.
- MKT-SEO-21: removed the unsourced "JSON-LD `name` equals H1 or site title" check. The rule is now cited to the sd-policies and review-snippet lines read by the reviser. The non-blocking FAQPage/HowTo check is split out to MKT-SEO-25. Also corrected an overclaim: Google's self-serving-review restriction covers `LocalBusiness` and `Organization`, not every product. The review gate is now a deny-list with an allow-list file.
- MKT-SEO-23: the back-button check is now a gate: no `popstate` handler outside an allow-list file. `pushState` and `replaceState` alone are not failures.
- MKT-SEO-24: MUST demoted to SHOULD. The 0.5 threshold is labelled unvalidated, a minimum set size of 10 pages is added, and a control set is recorded (grimoire.rs: 48 pages, 0 at or above 0.5).
- MKT-SEO-25 (new): SHOULD against dead structured data (FAQPage, HowTo, SoftwareApplication with no rating), split from MKT-SEO-21.
- Fleet table:
  - Rows 04, 11: research-artifact line citations replaced by fleet file:line and commands.
  - Row 03: now cites the build file.
  - Rows 05, 18, 20: rule greps run over 2,792 files in 16 repositories, 0 hits.
  - Row 13: measured, satisfied (vacuous).
  - Row 14: measured on the preview hosts before retirement.
  - Row 15: `find` for `crawler-policy.toml` gives 0. The 31 groups versus 32 tokens difference is reconciled: two Awario tokens share one group.
  - Row 19: measured, 0 files and hosts 404.
  - Row 23: the first-party `popstate` grep was run, 0 files.
  - Rows 24, 25: updated for the severity and split changes.

2026-11-27, reviser (opus), wave 2 follow-ups. IDs are stable; one ID added (MKT-SEO-26); no ID promoted, demoted or retired.

- MKT-SEO-06 (followup-q1): rationale restated with the checked LinkedIn evidence. The sharing module names no file type, the "JPG, PNG, or GIF" list is for ads, the upload page lists WebP for uploads, and no page lists SVG. The no-SVG MUST is stated to rest on X's archive alone. Added a SHOULD 5 MB size check (5,000,000 bytes), measured pass on grimoire.rs. Fact line gained a564109, the docs.x.com sitemap re-check and the LinkedIn re-check greps. The MUST text is unchanged.
- MKT-SEO-07 (followup-q0, answered partly): stays SHOULD. Rationale and Fact line now cite the 2026-02-04 large-image snapshot (`twitter:image` "Required: No") and the absence of any cards page on docs.x.com. The render question became a documented gap (Verdict 13).
- MKT-SEO-14 (followup-q3): stays retired, number not reused. Fleet row 14 now says the preview `noindex` header is the fleet's `ocx:noindex` edge rule, not a Bunny default.
- MKT-SEO-26 (new, followup-q3): SHOULD that every non-public host answers `X-Robots-Tag: noindex`, checked live after each deploy and before a new or renamed host takes traffic. SHOULD, not the proposed MUST: no fleet host fails, and both preview homes also carry a robots `noindex` meta. Fleet row 26 added, satisfied.
- Verdict: added item 13 (documented gap: X and LinkedIn share-card image behaviour, from followup-q0 and followup-q1) and item 14 (preview `noindex` is fleet configuration, from followup-q3).
- Open questions: removed question 6 (followup-q0); its gap moved to Verdict 13. Questions 1 to 5 are unchanged.
- Handed off: X and LinkedIn image dimensions to channels; `LinkedInBot` not added to MKT-SEO-15 because no LinkedIn page names a token (followup-q1).
- Decay: the 06/07 X row now uses the docs.x.com sitemap check; rows added for LinkedIn a521928 and for MKT-SEO-26. Failure mode 6, the owner list, the severity counts (8 SHOULD) and Key sources 19 to 21 were updated.
- Verdict 2, 7, 8 and 9 were updated, and item 12 (gates are deny-lists) was added. Severity counts, failure modes, decay and open questions were updated (new question 6: the X large card with no image). Key sources gained RFC 9309, the X archive and sd-policies.
