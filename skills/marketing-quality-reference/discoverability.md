---
title: Discoverability of built sites
summary: The head set every indexable page emits, sitemap and robots.txt form, the crawler policy record, banned AI-visibility tactics, honest structured data, the template-share floor for generated page sets, and preview hosts; with the checks that run on the build and on the live site
---

# Discoverability of built sites

Binds to the MKT-SEO family. It decides which crawl, index, share and answer-engine
signals a built site emits, and which AI-era tactics are banned. Check the built
output and the live site, never the config alone. A theme can inject the origin,
so a config grep reports a false violation. A config default can stand in for a
per-page value, so a config grep also reports a false pass. Every head rule
(MKT-SEO-01 to 10) runs on the build output. Every robots and crawler rule
(MKT-SEO-11 to 17) also runs on the public name.

Variables used below. `$B` is the build output directory (`dist/` for Astro,
`site/` for MkDocs). `$H` is the public host name, with no scheme. `$SM` is a
sitemap URL. `$NAME` is the site name. `$INDEX` is one sitemap index URL. `$CHECKS` is `.claude/skills/marketing-quality-reference/checks`
(`$CLAUDE_CONFIG_DIR/skills/marketing-quality-reference/checks` when installed
globally). Every script runs as `python3 -I`, has `--help` and `--self-test`,
and exits 0 clean, 1 on a finding, 2 on a usage error.

Contents: [Dates and versions](#dates-and-versions) · [Run order](#run-order) ·
[Head set](#head-set-verified-on-the-build-output) ·
[Sitemaps and robots.txt](#sitemaps-and-robotstxt) · [AI crawler policy](#ai-crawler-policy) ·
[Banned tactics and structured data](#banned-tactics-and-structured-data) ·
[Preview hosts](#preview-hosts) · [Notes by rule](#notes-by-rule) ·
[Retired, omitted and handed off](#retired-omitted-and-handed-off) ·
[Where agents go wrong](#where-agents-go-wrong) · [Ask the owner](#ask-the-owner) ·
[Pinned decisions](#pinned-decisions)

## Dates and versions

Every platform fact below was read on 2026-11-27. "Source date" is the date the
source page states about itself. "no date" means the page states none. A rule
that rests on a fact names it here, with the cadence at which to re-read it. A
threshold marked heuristic or house rule is this catalog's value, not a
platform's.

| Fact | Source and source date | Rules | Refresh |
|---|---|---|---|
| Astro's sitemap integration requires `site`; MkDocs `site_url` adds the canonical | [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) (no date); [MkDocs configuration](https://www.mkdocs.org/user-guide/configuration/) (no date) | 01 | Each framework major release |
| Canonical strength, absolute URLs, signals that disagree | [Google, consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) (2026-07-10); [ogp.me](https://ogp.me/) says `og:url` is the canonical (no date) | 02 | 365 days |
| Title rewrite triggers; no title length limit | [Google, title links](https://developers.google.com/search/docs/appearance/title-link) (2025-12-10) | 03, 05 | 365 days |
| Descriptions are unique; no description length limit | [Google, snippets](https://developers.google.com/search/docs/appearance/snippet) (2026-04-20) | 04, 05 | 365 days |
| The four required Open Graph properties, `og:image:alt`, the `website` default | [ogp.me](https://ogp.me/) (no date; the Open Web Foundation Agreement 0.9 is the only version marker) | 06, 08 | 365 days |
| X: "SVG is not supported", the `og:image` fallback, `twitter:image` "Required: No", under 5 MB. The live pages redirect and docs.x.com has no cards page, so the text rests on archive snapshots | [X markup reference, Wayback snapshot](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) (2026-01-16); [large-image card, Wayback snapshot](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) (2026-02-04). On 2026-11-27 the docs.x.com sitemap held 943 URLs with none containing "cards", and its `llms-full.txt` (5,360,965 bytes) had 0 mentions of `twitter:card`, `twitter:image`, `og:image` or `summary_large_image` | 06, 07 | 90 days |
| LinkedIn: sharing-module image 5 MB maximum, 1200 x 627 minimum, 1.91:1; no file type named; its "JPG, PNG, or GIF" list is for single-image ads; no page lists SVG | [LinkedIn Help a521928](https://www.linkedin.com/help/linkedin/answer/a521928) ("Last updated: 3 years ago", relative); [a564109](https://www.linkedin.com/help/linkedin/answer/a564109) lists WebP for member uploads only ("Last updated: 2 months ago", relative) | 06 | 180 days |
| X announced that previews show in the post composer, not the Card Validator | [X Developers community](https://devcommunity.x.com/t/card-validator-preview-removal/175006) (2022-08-02, vendor) | 06, 07 | 365 days |
| Google and Bing ignore `priority` and `changefreq`; `lastmod` counts only when consistently accurate | [Google, build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) (2026-07-08); [Bing](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search) (2025-07-31) | 09, 10, 12 | 365 days |
| robots.txt status codes, fields, group matching, "at least five redirect hops", 500 KiB | [Google robots.txt spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (2026-10-23); [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) (September 2022), sections 2.3 and 2.3.1.2 | 11, 13 | 365 days; on a new RFC that updates 9309 |
| Crawler tokens and their classes. `anthropic-ai` and `Claude-Web` are gone from the Anthropic page. Anthropic changed its list and its signal clause in October 2026 | [OpenAI bots](https://developers.openai.com/api/docs/bots) (no date); [Anthropic crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) (updated November 2026; "as of October 30, 2026" clause); [Perplexity bots](https://docs.perplexity.ai/guides/bots) (no date); [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) (no date) | 15, 18 | 90 days |
| Google intends to support the IETF AIPREF syntax "in early 2027" | [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) (no date); [aipref working group](https://datatracker.ietf.org/wg/aipref/about/) | 15, 18 | 2027-03-31 |
| A CDN's managed robots.txt prepends its own block to the origin file | [Cloudflare managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) (dateModified 2026-11-02, platform documentation) | 16 | 90 days |
| What `Google-Extended` does not control; AI features follow ordinary Search controls; Content-Signal is a preference | [Google AI features](https://developers.google.com/search/docs/appearance/ai-features) (no date); [Cloudflare Content Signals](https://blog.cloudflare.com/content-signals-policy/) (2025-09-24); OpenAI and Perplexity pages above on user-initiated fetches | 18 | 90 days |
| Optimizing for generative AI search is still SEO; scaled-content and back-button spam policies | [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (added 2026-05-15 per the changelog, updated 2026-07-10); [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (2026-11-23) | 20, 23, 24 | 90 days |
| The GEO "up to 40%" figure comes from one engine (GPT-3.5) with a fixed context; a 2026 survey says it does not carry over to organic search | [GEO paper v3](https://arxiv.org/abs/2311.09735) (2024-06-28, results reported by its authors); [survey](https://www.alphaxiv.org/abs/2607.14035.md) (2026-07-15, preprint) | 20 | 90 days |
| No markup of invisible content, no fake reviews; review text and rating must be visible; self-serving reviews ineligible for `LocalBusiness` and `Organization` | [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) (2026-07-10); [review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) (2026-09-08) | 21 | 90 days (re-read the [gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)) |
| `WebSite` structured data sets the site name; a subdirectory cannot have its own | [Google, site names](https://developers.google.com/search/docs/appearance/site-names) (2025-12-10) | 22 | 365 days |
| Back-button hijacking is a spam policy, announced 2026-04-13, enforced from 2026-06-15; included library and ad-script code counts; date bumps without change are a warning sign | [Back-button hijacking](https://developers.google.com/search/blog/2026/04/back-button-hijacking) (2026-04-13; FAQ added 2026-11-23); [creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) (2026-10-05) | 23, 24 | 180 days |
| FAQ rich results ended 2026-05-07 (documentation removed 2026-06-15); HowTo ended 2023-09-14; `SoftwareApplication` needs a rating or a review | [Search updates log](https://developers.google.com/search/updates) (review guideline 2026-07-24); [HowTo change](https://developers.google.com/search/blog/2023/08/howto-faq-changes) (2023-09-14); [software app](https://developers.google.com/search/docs/appearance/structured-data/software-app) (2026-09-08) | 25 | 90 days |
| The preview-host `noindex` header is edge configuration, not a CDN default. The Bunny pull-zone reference lists no robots or noindex property; three third-party `*.b-cdn.net` zones answered 200 with no `x-robots-tag` | [Bunny, list pull zones](https://bunny.net/docs/reference/pullzonepublic_index) and [custom hostname](https://bunny.net/docs/cdn/custom-hostname) (vendor documentation, no content date; the `last-modified` header equals the fetch time) | 26 | On every change to the edge rule or a zone's host list; the vendor page every 365 days |

Re-checks, as commands. Run each from the repository, not from this file.

```sh
# Any Google page: read its "Last updated" footer and compare with the date above ($URL is the page).
curl -sL "$URL" | grep -o -E 'Last updated [0-9-]+'
# MKT-SEO-06 and 07, every 90 days: a count above 0 means an X cards page is back. Read it for the format list and the missing-image case.
curl -s https://docs.x.com/sitemap.xml | grep -c cards
# MKT-SEO-06, every 180 days. $TEXT is the LinkedIn a521928 page reduced to text.
# The first prints 0 and the second prints 1 or more on 2026-11-27. A listed file type replaces the PNG or JPEG heuristic.
sed -n '/image requirements specific to the LinkedIn sharing module/,/image specifications for single image ads/p' "$TEXT" | grep -c -i -E -e 'file type' -e 'jpg' -e 'png' -e 'gif' -e 'webp' -e 'svg'
grep -c 'Max file size: 5 MB' "$TEXT"
```

## Run order

1. Build the site. Run `python3 -I "$CHECKS"/head_check.py "$B" --host "$H"` and fix every MUST finding. It prints each finding as `MKT-SEO-nn SEVERITY page: message`. Add `--must-only` for the blocking gate, `--only 03,04` to run named rules.
2. Run the deny-list greps for MKT-SEO-05, 18 and 20. Each must print nothing.
3. Run `python3 -I "$CHECKS"/live_site_check.py policy-file crawler-policy.toml`. Done means exit 0. Each owner-unreviewed block prints as an open item for the owner.
4. After deploy, and after every CDN or WAF change, run the `live_site_check.py` subcommands named in MKT-SEO-11 to 17. Done means every one exits 0 on the public name.
5. When a change adds or edits a generator for a page set of 10 or more pages, run `shingle.py` (MKT-SEO-24).

Where a rule bans wording (MKT-SEO-05, 18, 20), its check is a deny-list that must print nothing, with a documented allow. Where a check cannot be mechanical, the item is a review item, labelled `unverified: reading heuristic`, and it is not part of the MUST gate.

## Head set (verified on the build output)

A page with a robots `noindex` meta is skipped by every per-page check. Each row's
verification is one `head_check.py` rule, run as
`python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only NN`, and exit 0 is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-SEO-01 | Configure the production origin so that every canonical, `og:url` and sitemap `<loc>` is an absolute https URL on the deploy host. | With no origin set, canonicals and sitemap entries disappear or turn relative, and a theme can inject the origin, so the config is not the evidence. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 01`. A config grep (`site:` in `astro.config.*`, `site_url:` in `mkdocs.yml`) is a hint only. | MUST |
| MKT-SEO-02 | Emit exactly one `<link rel="canonical">` in `<head>` of every indexable page, with no fragment. Its value equals the page's sitemap `<loc>` and its `og:url`, and no HTTP `Link:` header names a different URL. | The canonical is a strong signal and a sitemap entry a weak one. Signals that disagree let Google pick either URL. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 02` for the HTML and sitemap arms. `python3 -I "$CHECKS"/live_site_check.py parity "$H" "$B"` compares the live `Link` header with the HTML value on the sampled pages. Build with a deliberate `noindex` set excluded. | MUST |
| MKT-SEO-03 | Give every page a unique, non-empty `<title>` that names the page. Put the site name at most once, at one end, after a delimiter. | Google rewrites titles that are half empty, repeated across pages, or that duplicate the site name. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --site-name "$NAME" --only 03`. No title is empty, repeated, or equal to the site name alone. | MUST |
| MKT-SEO-04 | Give every page its own meta description, taken from that page's source. Allow a site-level value only on the home page and on aggregation pages. | A description set in the config and copied onto every page counts as present but is a duplicate. Three measured MkDocs sites scored 100% present and 0% unique. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 04`, with `--exempt-description FILE` listing built paths of aggregation pages. The home page is exempt. Source arm: see block MKT-SEO-04. Review item: a description that is one noun or a keyword list counts as missing (unverified: reading heuristic). | MUST |
| MKT-SEO-05 | Never enforce a title or description character limit as if Google set one. | Google states no limit and truncates to the device width. The 60 and 155-160 character figures are third-party habits that agents turn into failing lints. | Deny-list, see block MKT-SEO-05: it must print nothing. A length lint that exists is warn-level and names its third-party source (unverified: reading heuristic). | MUST |
| MKT-SEO-06 | Emit `og:title`, `og:type`, `og:image` and `og:url` on every page. Make `og:image` an absolute https URL that returns 200 with an image `Content-Type` that is not SVG. Prefer PNG or JPEG under 5 MB, and put `og:image:alt` beside it. | ogp.me lists the four properties as required and defines no relative image URL. X rejects an SVG image. Dimensions belong to the channel skills. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 06 --fetch-images`. Without `--fetch-images` the 200, type and size arms do not run. | MUST (PNG or JPEG, the 5 MB ceiling and `og:image:alt`: SHOULD) |
| MKT-SEO-07 | Declare `twitter:card` as `summary_large_image` only on a page that emits an `og:image` or a `twitter:image`. Otherwise declare `summary`, or omit the tag. | A large card with no image source is the most common head defect measured: 128 pages on one site. Whether X renders it is undocumented. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 07`. | SHOULD (house rule) |
| MKT-SEO-08 | Set `og:type` to `website` on the home page, docs pages and landing pages. Use `article` only on dated posts that also carry `article:published_time`. | A built Starlight head emits `article` by default on product landings, which describes the page wrongly. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 08`. | SHOULD |

Block MKT-SEO-04, the source arm. Replace `docs` with the docs source directory. Only pages on a named exempt list may print.

```sh
# MKT-SEO-04: pages whose source has no description frontmatter
git ls-files -z --cached --others --exclude-standard -- ':(glob)docs/**/*.md' ':(glob)docs/**/*.mdx' \
  | xargs -0 -r grep -L -E -e '^description:' --
```

Block MKT-SEO-05. The second grep removes lines that negate a limit. Any line still printed is the finding.

```sh
# MKT-SEO-05: a character count attributed to Google or the SERP
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.md' ':(glob)**/*.mdx' ':(glob)**/*.astro' ':(glob)**/*.ts' ':(glob)**/*.js' ':(glob)**/*.mjs' ':(glob)**/*.json' ':(glob)**/*.yml' ':(glob)**/*.yaml' ':(glob)**/*.toml' ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/dist/**' ':(exclude,glob)**/target/**' \
  | xargs -0 -r grep -H -n -i -E -e '(google|serp)[^.]{0,60}(^|[^0-9])[0-9]{2,3}[ -]?char' -e '(^|[^0-9])[0-9]{2,3}[ -]?char[a-z]*[^.]{0,60}(google|serp)' -- \
  | grep -v -i -w -F -e no -e not -e never -e none -e "isn't" -e "doesn't" -e 'does not'
```

Fail: "Google truncates titles at 60 characters." Pass: "Google states no length limit." and "Keep the commit subject under 60 characters."

## Sitemaps and robots.txt

Run the robots rows as `python3 -I "$CHECKS"/live_site_check.py robots "$H" --index "$INDEX"`, once with an `--index` for every sitemap index the deploy publishes. Take the list of indexes from the deploy plan. The check reads the live file over https with certificate verification, so a TLS error is a finding.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-SEO-09 | Leave `<priority>` and `<changefreq>` out of sitemaps. | Google and Bing ignore both tags. Agents copy them from old tutorials, and they suggest an effect that does not exist. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 09`. It also fails a sitemap that is not well-formed XML. | SHOULD |
| MKT-SEO-10 | Omit `<lastmod>`, or set it to the real time the content last changed. Never set it to the build or generation time. | Google uses `lastmod` only when it is consistently accurate, and Bing says never to use the generation time. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 10 --previous-build "$B_PREV"` with `$B_PREV` a second build of unchanged content. Any `lastmod` difference fails, and so does one value on every URL. | MUST |
| MKT-SEO-11 | Serve `/robots.txt` at the root of every host that serves pages: status 200, `text/plain`, UTF-8, no more than 5 redirects and under 500 KiB. Use only `user-agent`, `allow`, `disallow` and `sitemap` in any group that applies to Googlebot. | Google reads any 4xx except 429 as no robots.txt and ignores `crawl-delay` and `noindex:`. A project path on a shared host is not a host root and cannot hold the file. | `python3 -I "$CHECKS"/live_site_check.py robots "$H" --index "$INDEX"`: the response arm and the `crawl-delay` and `noindex` field arm. A `Crawl-delay` under a ClaudeBot group passes, because Anthropic says ClaudeBot honours it. | MUST |
| MKT-SEO-12 | List every sitemap index the host publishes in robots.txt, each with a fully qualified `Sitemap:` line. | A sitemap in a subdirectory covers only that directory unless someone submits it. One measured site named one index that reached 4 of 298 URLs. | The same command with one `--index URL` per published index. Every live page URL falls under a listed index. | MUST |
| MKT-SEO-13 | Repeat every shared `Disallow` line inside each named user-agent group. | A crawler obeys only its most specific matching group, so a group for `OAI-SearchBot` replaces `User-agent: *` completely, private-path rules included. | The same command, or `python3 -I "$CHECKS"/live_site_check.py robots --file robots.txt` on a local file. Every `Disallow` under `*` also appears under each named group that does not disallow `/`. | MUST |

## AI crawler policy

The policy lives in a file in the repository, not in a CDN default and not in an agent's habit. See Pinned decisions for the file's shape.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-SEO-15 | Record the crawler policy in `crawler-policy.toml` at the repository root. Record the status quo and never change a recorded decision. | Without the file a CDN default sets the policy without anyone deciding it. Token lists change too: `anthropic-ai` and `Claude-Web` are gone from Anthropic's page. | `python3 -I "$CHECKS"/live_site_check.py policy-file crawler-policy.toml`. It checks the nine tokens, class and decision values, owner and `decided` on each block, the `reviewed` date (stale after 180 days), `sources`, and that `anthropic-ai` or `Claude-Web` appears only beside ClaudeBot. Exit 0 is the pass. | MUST (house convention: the file's name, location and fields are this catalog's, the duty to record is the rule) |
| MKT-SEO-16 | After every deploy and every CDN or WAF change, gate the live robots.txt and the live responses to bot user agents against `crawler-policy.toml`. | A CDN's managed robots.txt prepends its own block to the origin file. One measured host said `Allow: /` in the repository, named 32 tokens live, and answered a search token with 403. | `python3 -I "$CHECKS"/live_site_check.py policy "$H" --policy crawler-policy.toml --build-robots "$B"/robots.txt`. Tokens, bytes (only when `cdn` is empty) and status per search and user-fetch token. A user-agent string test from one address, not an IP-verified bot test. | MUST |
| MKT-SEO-17 | After every deploy, check the live site under its public name, with no `--resolve` and no `-k`. Treat a TLS error as a failure. | A read that bypasses DNS proves only the origin, and a crawler sees the public name. One measured host failed TLS on its public name while its origin was correct. | `python3 -I "$CHECKS"/live_site_check.py parity "$H" "$B"`. It compares the live sitemap `<loc>` set, reached from every `Sitemap:` line, with the build's. For the home page plus the first 5 and last 5 sorted live URLs it compares canonical, title, description and `og:image` with the build file. | MUST |
| MKT-SEO-18 | Never describe a crawler control as more than it is. | Three false beliefs make a policy fail silently: `Google-Extended` removes a site from AI Overviews; Content-Signal enforces; robots.txt governs user-initiated fetches. | Deny-list, see block MKT-SEO-18: it must print nothing. A false claim written with a negation slips through and is a review item (unverified: reading heuristic). | MUST |

Block MKT-SEO-15, the token spelling check. A block with `owner = "unreviewed"` and no `decided` passes and is an open item for the owner. A block with a named owner and no `decided` fails.

```sh
# MKT-SEO-15: prints 9 when all nine required token tables exist
grep -c -E -e '^\[token\."(OAI-SearchBot|Claude-SearchBot|PerplexityBot|ChatGPT-User|Claude-User|Perplexity-User|GPTBot|ClaudeBot|Google-Extended)"\]' crawler-policy.toml
```

Block MKT-SEO-18. Replace `docs` and the file list with where the site's prose lives. The second grep removes negated lines: the correct sentence "Blocking Google-Extended does not remove a site from AI Overviews" passes.

```sh
# MKT-SEO-18: any line printed is the finding
git ls-files -z --cached --others --exclude-standard -- ':(glob)docs/**/*.md' ':(glob)docs/**/*.mdx' 'README.md' 'crawler-policy.toml' \
  | xargs -0 -r grep -H -n -i -E -e 'google-extended.{0,80}(overview|ai mode)' -e 'content-signal.{0,40}(block|prevent|stop|enforce)' -e 'robots\.txt.{0,60}(chatgpt-user|perplexity-user|claude-user)' -- \
  | grep -v -i -w -F -e no -e not -e never -e none -e "isn't" -e "doesn't" -e 'does not'
```

Pass wording: "requests" or "reserves". Fail wording: "Content-Signal blocks training".

## Banned tactics and structured data

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-SEO-20 | Never justify a discoverability change by an AI-visibility or ranking effect that no platform documents, and never report one. This covers `llms.txt` or Markdown mirrors used as SEO, pages split into chunks for AI, AI-specific markup, one page per paraphrased or fan-out query, and the GEO "up to 40%" figure quoted as a general effect. | Google says optimizing for its generative AI search is still SEO and needs no new files, markup or chunking, and pages made per fan-out query violate its scaled-content policy. | Deny-list over the commit message, the PR body and the added copy lines, see block MKT-SEO-20: it must print nothing. A change that adds sitemap URLs also gets a title check: compare the `<loc>` count before and after, and read the new titles for wording-only differences (unverified: reading heuristic). | MUST |
| MKT-SEO-21 | Never emit structured data that misleads: no invented, hidden or self-serving reviews or ratings, and no markup for content readers cannot see. | Google's policies ban markup of invisible content and fake reviews, and misleading markup can bring a manual action. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 21`. Every `review` or `aggregateRating` hit fails unless the built path is listed in `structured-data-reviews.txt`. Review item: each JSON-LD object describes the page's visible main content (unverified: reading heuristic). | MUST |
| MKT-SEO-22 | Emit one `WebSite` JSON-LD object on the root URL of each host, with `name` and with `url` equal to the root canonical. | It is Google's only strong lever for the site name, and a subdirectory cannot have its own. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 22`. Validate the syntax with the Schema Markup Validator, because the Rich Results Test does not support site names. | SHOULD |
| MKT-SEO-23 | Never change a visible date, `dateModified` or `lastmod` without a change to the content, and never intercept the back button. Both rules include code from third-party scripts. | Google lists date bumps without real change as a warning sign. Back-button hijacking is a spam policy and included library code counts. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 23` fails every built file with a `popstate` handler that is not in `back-button-allow.txt`. `history.pushState` and `replaceState` alone do not fail. Dates: compare each `dateModified` with `git log -1 --format=%cI -- "$SRC"` (`$SRC` is the page's source file) (unverified: reading heuristic). | MUST |
| MKT-SEO-24 | Measure template share on every change to a generator of a page set of 10 or more pages, such as catalog, package or version pages. | Google judges scaled content by purpose and added value, and near-duplicate templated pages are what the policy describes. | `python3 -I "$CHECKS"/shingle.py "$SM" '/p/'`, with the path regex for the generated set. Pass: `pages` is 10 or more and `pages>=0.5: 0`, or every listed page has `noindex` and no sitemap `<loc>`. Add `--root "$B"` to measure the build before deploy. | SHOULD |
| MKT-SEO-25 | Do not add structured data that cannot produce a rich result: `FAQPage` or `HowTo` emitted for a rich result, and `SoftwareApplication` with no rating or review. | FAQ rich results ended on 2026-05-07 and HowTo on 2023-09-14. Such markup is dead, not dishonest, so it is not a MUST. | `python3 -I "$CHECKS"/head_check.py "$B" --host "$H" --only 25`. A hit is reported and does not block a build. | SHOULD |

Block MKT-SEO-20. `$BASE` is the default branch (`origin/main`). The last grep removes a hit line that links a Google or Bing documentation page, because the effect it names is then documented. "geolocation support" does not match.

```sh
# MKT-SEO-20: any line printed is the finding
{ git log -1 --format=%B; gh pr view --json body -q .body 2>/dev/null; git diff -U0 "$BASE"...HEAD -- '*.md' '*.mdx' '*.astro' '*.html' | grep '^+'; } \
  | grep -n -E -e '(^|[^A-Za-z0-9_])(GEO|AEO|LLMO)($|[^A-Za-z0-9_])' -e 'AI visibility' -e '[Rr]ank(s|ing)? in (ChatGPT|Perplexity|Claude|Gemini)' -e '[Aa]nswer engine optimi' -e 'up to 40 ?%' \
  | grep -v -E -e 'https://(developers\.google\.com|www\.bing\.com/webmasters|blogs\.bing\.com)/'
```

## Preview hosts

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-SEO-26 | After every deploy, and before traffic reaches a new or renamed host, check that every host that is not the public host answers `X-Robots-Tag: noindex`. Take the list of hosts from the deploy or CDN plan, not from memory. | On a CDN the header is an edge rule matched per host URL, not a zone property or a default, so a host left out of the rule answers without it. | `python3 -I "$CHECKS"/live_site_check.py preview "$PREVIEW_HOST_1" "$PREVIEW_HOST_2"`, listing every non-public host. Exit 0 is the pass. | SHOULD |

## Notes by rule

Read the note for a rule before you change its check or argue about its severity.

- **MKT-SEO-02.** Send no `Link:` canonical header that differs from the HTML value. The HTML arm needs a build with the `noindex` pages excluded from the sitemap. Fail example for MKT-SEO-03: `Example: The Simple Package Manager | Example`.
- **MKT-SEO-05.** The regex matches a character count only when Google or "SERP" is in the same sentence, so an unrelated "60 characters" does not match. Tested on five sample lines: it flagged the three lines that attribute a limit to Google or the SERP, and passed the commit-subject line and the negated line.
- **MKT-SEO-06 evidence.**
  - X's markup reference says for `twitter:image`: "JPG, PNG, WEBP and GIF formats are supported ... SVG is not supported." It names `og:image` as that tag's fallback, so an SVG `og:image` is the image X rejects.
  - The no-SVG MUST rests on X's archived text alone. Do not cite LinkedIn for it: LinkedIn names no file type for a shared link and lists no SVG.
  - PNG or JPEG is a house heuristic, the safe common subset. No page says whether WebP works in a LinkedIn link preview.
  - Byte size: X ("less than 5MB") and LinkedIn ("Max file size: 5 MB") give one ceiling. The script uses 5,000,000 bytes, the smaller reading, because neither page says which megabyte.
  - `og:image:alt`: ogp.me says "If the page specifies an og:image it should specify og:image:alt".
  - Pixel dimensions are not checked here. Two dated figures exist for the channel skills: X's large-image card, 2:1 ratio, minimum 300 x 157, maximum 4096 x 4096 (snapshot 2026-02-04), and LinkedIn's sharing module, minimum 1200 x 627, ratio 1.91:1.
  - Documented gap: no live X or LinkedIn page states how a share card treats a missing or unusual image, and reading cannot close it. A logged-in X account that posts links to three throwaway test pages, and a logged-in LinkedIn Post Inspector run over one page per image type, would close it. Both are owner steps. An agent never posts.
- **MKT-SEO-07.** X's markup reference says it "explains the OpenGraph fallback behavior for each Twitter tag", and its `twitter:image` row falls back to `og:image`. It does not say what X renders for a large card with no image, and the live page is gone, so the rule stays SHOULD. If a cards page returns, read what it renders for that case, then promote the rule to MUST or retire it. A measured result from an owner's test post also settles it.
- **MKT-SEO-11.** Redirects: Google "follows at least five redirect hops". RFC 9309 says crawlers "SHOULD follow at least five consecutive redirects" and may treat the file as unavailable past five. Five is the largest count every compliant crawler must follow. `text/plain`: RFC 9309 says the file "MUST be UTF-8 encoded ... and Internet Media Type "text/plain"". A 401 or 403 means no restrictions, not "blocked". A 5xx stops crawling for 12 hours. The script flags `crawl-delay` and `noindex:`, the two fields agents add to a Googlebot or `*` group.
- **MKT-SEO-15.**
  - How an agent fills the file: where nothing blocks a token today, record `allow`. A block it finds with no owner, such as a CDN default, is recorded as `decision = "block"` with `owner = "unreviewed"`, and the agent raises it with the owner. It never flips a decision in either direction: not removing a CDN's training block, not adding a blanket `GPTBot` block "for privacy".
  - Search tokens and user-fetch tokens default to allow. A block on any of them needs a named owner and a date.
  - The nine required tokens are the ones the check counts. Add a table for every other token on the vendors' current pages.
  - `LinkedInBot` is not recorded. LinkedIn's help page says a missing preview image may mean "your website may be blocking us", but it names no user-agent token, and none is taken from memory.
- **MKT-SEO-16.** Compare tokens, not bytes, when `cdn` is non-empty: the CDN rewrites the file. The status arm sends a `Mozilla/5.0 (compatible; TOKEN/1.0)` user agent and compares the status with the one a browser user agent gets.
- **MKT-SEO-17.** The sample is fixed, so two runs on one deploy check the same pages. An origin read with `--resolve` is not a substitute.
- **MKT-SEO-18.** Blocking `Google-Extended` does not remove a site from AI Overviews or AI Mode. The controls for those are `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex`, and applying them site-wide is an owner decision. `Content-Signal` and robots.txt are preferences, not enforcement. robots.txt does not govern `ChatGPT-User`, `Claude-User` or `Perplexity-User`.
- **MKT-SEO-20.** The only GEO claim with support is to add true quotations, statistics and cited sources, which is ordinary good writing. Write it as that, never as a promise of ranking. A SparkToro study ([2026-01-28](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/), not peer reviewed) found identical brand lists in under 1 in 100 runs, which is why an "AI-answer rank" is never reported.
- **MKT-SEO-21.** Google's self-serving restriction covers `LocalBusiness` and `Organization` only. A review about entity A on entity A's own site is ineligible for those types. The allow-list `structured-data-reviews.txt` has one built path per line for a page whose visible reviews a human has checked. With no file, every hit fails.
- **MKT-SEO-22.** Only `WebSite` structured data has a purpose here, and it is SHOULD: Google states structured data is not required for its AI features, and a site name only changes how the result looks. `SoftwareApplication` is ineligible for a rich result without a rating or review, so its absence is correct.
- **MKT-SEO-23.** `back-button-allow.txt` lists the built files of a client-side router a human has checked. With no file, every `popstate` handler fails. A table-of-contents hash link and a query-string sync use `pushState` or `replaceState`, and neither intercepts Back.
- **MKT-SEO-24.**
  - What follows from the result. In a new set, or an existing set that grows, a page with a template share of 0.5 or more ships with `noindex` and stays out of the sitemap. The exception is a page the owner has recorded as "index", with a plan to enrich it with data its source lacks: versions with dates, the install command, the digest, compatibility. In an existing set, report the result and do not flip any page.
  - There is no word-count floor. Google says it has no preferred length and lists "writing to a word count" as a warning sign. A word-count test failed 17 of 21 pages in the measured set.
  - The 0.5 is unvalidated. It was set on one generated set (10 of 21 pages at or above it) and has one control: 48 hand-written docs pages gave median 0.00 and 0 pages at or above 0.5. No platform publishes a threshold.
  - A shingle is template when it appears on at least `max(2, 0.5*n)` pages. On 2 or 3 pages that makes small sets read as templated by construction, so below 10 pages the script prints the result with a note and exits 0.
- **MKT-SEO-25.** Re-read the structured-data gallery every 90 days. A type may regain or lose a rich result.
- **MKT-SEO-26.** Why SHOULD and not MUST: no measured host failed, and a second layer reduces the harm, because preview homes also carry a robots `noindex` meta, so a lost header mainly exposes non-HTML responses. Whether CI probes a future custom preview host is not measured.

## Retired, omitted and handed off

MKT-SEO-14 is retired and not reused. It said never to combine `noindex` with a robots.txt `Disallow` for one URL, and to mark preview deploys `noindex` while leaving them crawlable. A competent model already follows it. MKT-SEO-26 now checks only that the preview header survives a host change.

MKT-SEO-19 is retired in this catalog: `docs-quality` DOC-AGENT-04 owns `llms.txt`. The number is not reused. Apply MKT-SEO-20 to any justification of the file: `llms.txt` is for onboarding a named coding-agent consumer, never a search or AI-visibility tactic.

Dropped as common knowledge: keyword stuffing and hidden text; sitemap files over 50,000 URLs or 50 MB (generators handle it); a UTF-8 sitemap; absolute `<loc>` values as a separate rule (MKT-SEO-01 gates the host). Dropped for lack of evidence: `<link rel="sitemap">` in the head, and Markdown mirrors kept from search by a robots rule.

Handed off:

- Labelling vendor data in copy goes to MKT-CLAIM.
- Human review of titles, descriptions and alt text written by AI goes to MKT-VOICE.
- The wording of the home page description belongs to MKT-POS (MKT-POS-08).
- The ban on reporting an AI-answer rank goes to MKT-MEAS, routed to `marketing-measurement`.
- Share-image dimensions go to the channel skills.

## Where agents go wrong

| Mistake | Checks |
|---|---|
| A config default taken as per-page coverage: one site description for every page, `og:type=article` on landings, `summary_large_image` with no image | MKT-SEO-04, 07, 08 on the build |
| "It works in the dev server": a root-relative `og:image`, a relative canonical or `Sitemap: /sitemap.xml`, no origin set | MKT-SEO-01, 06, 11 |
| Habits from old tutorials: `priority` and `changefreq` on every entry, `lastmod` set to the current time, `Crawl-delay` for Googlebot, 60 and 160 character limits presented as Google's, `FAQPage` or `HowTo` for rich results, `anthropic-ai` as the Anthropic token | MKT-SEO-05, 09, 10, 11, 15, 25 |
| GEO hype as a justification: `llms.txt` "to rank in ChatGPT", docs split into chunks, one page per query variant, the "40%" figure | MKT-SEO-20 |
| robots.txt semantics misread: a named group that drops the `*` rules, `Google-Extended` as an AI Overviews opt-out, Content-Signal as enforcement, a 403 on robots.txt as "blocked" | MKT-SEO-11, 13, 18 |
| Treating the repository as the truth: a CDN rewrites robots.txt, the edge returns 403 to a search bot, the public name fails TLS while the origin is fine, a `noindex` header bound to a host list misses a new host | MKT-SEO-16, 17, 26 |
| Generating pages at scale without measuring, or inventing an `aggregateRating` | MKT-SEO-21, 24 |
| Changing policy alone: removing a CDN's training block, or adding a blanket `GPTBot` block | MKT-SEO-15 records the status quo |

## Ask the owner

An agent never decides these. It records what it found and asks.

- Training tokens blocked at the CDN: keep the block or allow? Until the owner answers, the file records `owner = "unreviewed"`.
- A search token answered with 403 by the edge: is it intended? Changing it is a WAF or crawl-control decision.
- Do the CDN's managed robots.txt and bot-preference sync stay on?
- A public name that fails TLS or DNS is an infrastructure cutover that only the owner can do. It blocks every live check on that host.
- Canonical hosts: a project site on a shared host cannot own a robots.txt. Does it move to a custom domain? Is a legacy duplicate site retired, redirected or marked `noindex`?
- Generated pages below the template-share floor: enrich them or mark them `noindex`?
- Which approved image becomes the `og:image`? An agent may wire an existing asset and never generates a brand image.
- Any site-wide `nosnippet` or `max-snippet` to limit AI Overviews. The default is none, because it also removes ordinary snippets.
- Optional, to settle the share-card gap: the test posts and the Post Inspector run named in the MKT-SEO-06 note.

## Pinned decisions

Defaults an adopter overrides once. None is a platform standard.

- **`crawler-policy.toml`**, at the repository root. Top-level `reviewed` (a date, stale after 180 days), `sources` (the vendor URLs), `cdn` (a list naming any CDN feature that rewrites the live robots.txt; non-empty means tokens are compared, not bytes). One `[token."<name>"]` table per token, with `class` (`search`, `user-fetch` or `training`), `decision` (`allow` or `block`) and, on every block, `owner` and `decided`, or `owner = "unreviewed"` alone.
- **`structured-data-reviews.txt`** and **`back-button-allow.txt`**: one built path per line, with `#` comments allowed.
- **Template share 0.5, minimum set 10 pages.** Heuristics, not platform values.
- **The 5 MB image ceiling is 5,000,000 bytes.** The smaller reading.
- **`twitter:card` and PNG or JPEG rules** are house rules. Their severity changes only on the evidence named in the MKT-SEO-06 and 07 notes.
- A fact marked "no date" in Dates and versions stays unverified for its date until the source states one.
