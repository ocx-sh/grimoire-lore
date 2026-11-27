---
title: "Required head, description, sitemap and robots set for every built page, and the post-deploy live-vs-repo check"
program: product
sub_program: marketing
topic: marketing-discoverability
worker: seo-head-metadata-set
date_researched: 2026-11-27
model: sonnet
sources_fetched: 15
---

# Required head, description, sitemap and robots set

Scope: presence and form of head tags, descriptions, sitemap and robots.txt on built static sites (Astro/Starlight, MkDocs), and the check that compares the live site with the repository. Not covered: description wording (positioning-canonical-sentence), share-image dimensions (channels), JSON-LD types, AI-bot policy (other dives). Local measurements were run 2026-11-27 from `/home/mherwig/dev`. ocx.sh answers with a certificate mismatch from this machine, so its live reads use `--resolve ocx.sh:443:37.27.135.61` (the authoritative address recorded in distribution-posture.md A9).

## Table of contents

1. Summary
2. Findings (1 canonical, 2 title, 3 description, 4 Open Graph, 5 sitemap, 6 robots, 7 framework mechanics, 8 fleet measurements, 9 live-vs-repo)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Every indexable page needs exactly one absolute https `rel="canonical"` in `<head>` equal to its own sitemap `<loc>`; Google calls relative values supported but not recommended.
- The root cause of missing or relative URLs in static generators is an unset `site:` (Astro) or `site_url` (MkDocs). Set it first; everything else derives from it.
- Google states no length limit for titles or descriptions; both are cut "to fit the device width". Any character number is third-party and must not be enforced as a Google fact.
- Descriptions must be unique per page. A config-level `site_description` copied onto every page is a duplicate, not coverage: the three MkDocs fleet sites emit one identical description on 42 of 42 built pages (23 + 10 + 9) while their sources hold 1 of 42 frontmatter descriptions.
- ogp.me lists four required properties: `og:title`, `og:type`, `og:image`, `og:url`. The fleet's ocx.sh emits 0 of 298 `og:image` while 128 declare `summary_large_image`.
- `og:image` must be an absolute https URL that returns 200 with an image content type of PNG or JPEG. The protocol page does not say what a relative URL does; do not rely on it. SVG is not safe for link previews (this brief's rule; platform sizes belong to channels).
- `og:type` is `website` for home, docs and landing pages; `article` only for dated posts. ocx.sh home emits `article`.
- A sitemap is a weak canonical signal, at most 50 MB uncompressed or 50,000 URLs, UTF-8, absolute URLs. `priority` and `changefreq` are ignored by Google and Bing: do not emit them.
- `lastmod` helps only when it is the true content change time; Bing says never use generation time. Astro's sitemap integration cannot compute it per page.
- robots.txt must be at the host root, UTF-8, under 500 KiB, 2xx, with a `Sitemap:` line holding a fully qualified URL. It applies to one host, protocol and port.
- A sitemap in a subdirectory only covers that directory unless submitted otherwise. ocx.sh robots.txt lists only the root index (4 URLs of 298); the docs, catalog and install sitemap indexes (294 URLs) are unreferenced.
- A CDN can rewrite robots.txt. Cloudflare Managed robots.txt prepends its block to the origin file; live grimoire.rs and index.grimoire.rs serve about 40 Disallow groups the repository does not contain.
- `noindex` plus a robots.txt Disallow on the same URL defeats the noindex.
- Post-deploy: fetch the live robots.txt, sitemap and home head and diff them against the build output; any diff not explained by a named CDN feature is a finding.

## Findings

### 1. Canonical

- Strength order: redirects strong, `rel="canonical"` strong, sitemap inclusion weak. Combining raises the chance the preferred URL is shown ([Google, consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls); page carries no date).
- "Use absolute URLs"; relative paths are supported but "can cause problems over time, such as when a testing site gets crawled" (same page).
- No fragment as canonical. No two different canonicals across methods; pick HTML link element or HTTP header, not both. The element is accepted only in a valid `<head>` (same page).
- Fleet: index.grimoire.rs has no canonical on 25 of 25 pages (distribution-posture.md, `crawl.py` canonical column 0). All other crawled sites carry one on every page: ocx.sh 298/298, grimoire.rs 48/48, MkDocs and indexer 23/23, 10/10, 9/9.
- Gap the audit names: `crawl.py` tests presence only, not that canonical equals the sitemap `<loc>`.

### 2. Title

- Every page needs a `<title>`; no length limit exists, truncation is "typically to fit the device width" ([Google, title links](https://developers.google.com/search/docs/appearance/title-link); undated).
- Rewrite triggers Google lists: half-empty (only a site name), obsolete, inaccurate, micro-boilerplate (several pages share an identical title), no clear main title (several equal headings), language mismatch, site-name duplication (same page).
- Site name goes at the start or end with a delimiter on non-home pages (same page). Starlight's `titleDelimiter` defaults to `'|'` giving "Page Title | Site Title" ([Starlight config](https://starlight.astro.build/reference/configuration/)).
- Fleet observation: ocx.sh home title is `ocx: The Simple Package Manager | ocx`, site name twice (`curl -s --resolve ocx.sh:443:37.27.135.61 https://ocx.sh/ | grep -oE '<title>[^<]*'` against the build `ocx-sh/website/site/dist/index.html`). The duplicated name is the "site name duplication" trigger.

### 3. Description

- Google: unique per page; site-level description on home and aggregation pages, page-level elsewhere; if time is short, prioritise key URLs. No keyword lists. Single-noun descriptions are weak. "There's no limit on how long a meta description can be" but results truncate it ([Google, snippets](https://developers.google.com/search/docs/appearance/snippet); undated). Google may use page content instead of the tag.
- Starlight: frontmatter `description` overrides the site `description`; the frontmatter page says it is picked up "by search engines and in social media previews" ([Starlight frontmatter](https://starlight.astro.build/reference/frontmatter/)); the config page says the site `description` feeds `<meta name="description">`. Whether it also feeds `og:description` is not stated there; the fleet's built heads show og:description equal to description on every site (messaging-inventory.md §5).
- MkDocs: `site_description` "adds a meta tag to the generated HTML header", default null; per-page description behaviour is not documented on that page ([MkDocs configuration](https://www.mkdocs.org/user-guide/configuration/)).
- Consequence measured below: MkDocs pages without a page description inherit the site one, so presence counts as 100% while uniqueness is 0.

### 4. Open Graph

- ogp.me: required `og:title`, `og:type`, `og:image`, `og:url` ([ogp.me](https://ogp.me/); no version or date on page). `og:url` is "the canonical URL, used as the permanent ID" (so it must equal the canonical). Optional: `og:image:secure_url`, `:type`, `:width`, `:height`, `:alt` ("a description of what is in the image (not a caption)"); first tag wins on conflict.
- Unmarked pages are treated as `og:type` website. `article` adds `article:published_time`, `modified_time`, `author`, `section`, `tag`.
- ogp.me's examples use absolute URLs; it is silent on relative ones. A relative `og:image` is therefore undefined behaviour at consumers, not a spec-valid choice. index.grimoire.rs emits `og:image` = `/logo.svg` on 25 of 25 pages (relative and SVG): `curl -s https://index.grimoire.rs/ | grep -oE 'og:image" content="[^"]*"'`.
- grimoire.rs is the in-fleet good case: absolute `https://grimoire.rs/og-card.png`, `Content-Type: image/png`, 200 (`curl -s -o /dev/null -w '%{http_code} %{content_type}' https://grimoire.rs/og-card.png`), `og:type` website.
- Platform dimension and ratio requirements are not set here (channels owns them).

### 5. Sitemap

- Google ([build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), undated; sample uses 2022-06-04): 50 MB uncompressed or 50,000 URLs per file; UTF-8; fully qualified URLs; root placement recommended because "unless submitted through Search Console, a sitemap affects only its parent directory and its descendants"; sitemap index allowed; `priority` and `changefreq` ignored; `lastmod` used only if consistently and verifiably accurate, and a copyright-date change does not count; submission is a hint.
- Bing ([blog, 2025-07-31](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search)): ISO 8601 `lastmod` with time, never the generation time; `changefreq` and `priority` ignored; reference the sitemap in robots.txt.
- Astro ([@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)): `site` must be set and begin with http(s)://; output is `sitemap-index.xml` plus `sitemap-0.xml`; the integration "can't analyze a given page's source code", so per-page `lastmod` needs `serialize()`; robots.txt is not generated, add the `Sitemap:` line by hand or via `src/pages/robots.txt.ts`; `<link rel="sitemap" href="/sitemap-index.xml" />` in head is the documented discovery link. Starlight: sitemap is on once `site` is set ([Starlight customization](https://starlight.astro.build/guides/customization/)).
- MkDocs: `site_url` adds a canonical link to every page, default null, not required; the configuration page does not mention a sitemap. The three fleet MkDocs sites do publish `sitemap.xml` (crawled 10, 9, 23 URLs).
- Fleet: ocx.sh `sitemap-index.xml` lists only `sitemap-0.xml` (4 URLs); docs, catalog, install, integrations, apps sections publish their own indexes at `/docs/`, `/catalog/` etc. (distribution-posture.md A9) that robots.txt does not name.

### 6. robots.txt

- Spec ([Google robots.txt spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec), no calendar dates): top-level of the site; applies to the exact host, protocol and port; 500 KiB limit, content beyond ignored; UTF-8, a leading BOM line is ignored; 2xx processed; 3xx followed at least five hops then treated as 404; 4xx except 429 means no restrictions; 5xx stops crawling for 12 hours, then last cached copy for 30 days, then behaves as no robots.txt if site is otherwise available; supported fields `user-agent`, `allow`, `disallow`, `sitemap` only; `crawl-delay` unsupported; `Sitemap:` takes a fully qualified URL, may be on another host, not tied to a user agent, value case-sensitive.
- `noindex` cannot be placed in robots.txt; a robots.txt-blocked page "must not be blocked" for noindex to be seen ([Google, block indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing), undated).
- Cloudflare ([Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/), dateModified 2026-11-02, platform documentation): with Bot Preference Sync on and any policy at Block, Cloudflare prepends managed directives before the origin file and serves one response; the example block disallows Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot, Google-Extended, GPTBot, meta-externalagent and sets `Content-Signal: search=yes, ai-train=no, use=reference`. Search Console may report "Syntax not understood" for content signals; the page says this has not affected crawling.

### 7. Framework mechanics (what an agent must configure)

| Framework | Setting | Effect | Source |
|---|---|---|---|
| Astro | `site: 'https://host'` in `astro.config.*` | absolute canonical and sitemap; required by sitemap integration | [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) |
| Starlight | frontmatter `title` (required), `description` (optional) | `<title>`, meta description | [Starlight frontmatter](https://starlight.astro.build/reference/frontmatter/) |
| Starlight | `head: [{tag, attrs}]` config; per-page `head` frontmatter | extra global or page tags (e.g. `og:image`); entries are not processed by Astro, so the value must be a literal absolute URL or a Head override is needed | [Starlight config](https://starlight.astro.build/reference/configuration/) |
| MkDocs | `site_url`, `site_description` | canonical link on every page; one site-wide description | [MkDocs configuration](https://www.mkdocs.org/user-guide/configuration/) |

Not verified from docs: whether Starlight emits canonical, `og:title` or `og:image` by default. The built `ocx.sh` and grimoire.rs heads show canonical, og:title, og:url, og:description and twitter:card present, `og:image` only where the site config adds it (grimoire-rs/grimoire/docs/astro.config.mjs:116-123 per distribution-posture.md). Context7 was not available in this run; the framework pages above were read directly.

### 8. Fleet measurements (2026-11-27)

Head and sitemap crawl, reused from distribution-posture.md A8 (`python3 -I crawl.py <sitemap-url>`, the script is held in that file; it tests text patterns only):

| Site (sitemap) | URLs | og:image | canonical | description |
|---|---|---|---|---|
| ocx.sh (4 indexes crawled) | 298 | 0 | 298 | 298 |
| grimoire.rs | 48 | 48 | 48 | 48 |
| index.grimoire.rs | 25 | 25 (all relative `/logo.svg`) | 0 | 25 |
| indexer (github.io) | 23 | 2 | 23 | 23 |
| ocx-mirror | 10 | 0 | 10 | 10 |
| indexbot | 9 | 0 | 9 | 9 |

Re-measured this run: source description coverage, command `find <docs dir> \( -name '*.md' -o -name '*.mdx' \) | wc -l` against `... | xargs grep -l -m1 -E '^description:' | wc -l`:

| Docs site | with description / pages |
|---|---|
| ocx-sh/website/site | 5/5 |
| ocx-sh/ocx/website | 80/116 |
| ocx-sh/catalog/docs | 0/24 |
| ocx-sh/www-setup/site | 7/7 |
| ocx-sh/devcontainer-features/site | 22/22 |
| ocx-sh/rules_ocx/docs | 0/12 |
| grimoire-rs/grimoire/docs | 45/45 |
| ocx-sh/ocx-mirror/docs | 0/10 |
| ocx-sh/indexbot/docs | 0/9 |
| grimoire-rs/indexer/docs | 1/23 |

Total 160/273 (59%), matching messaging-inventory.md §5. New finding: distinct description values on the built MkDocs pages. Command: `curl -s <sitemap> | grep -oE '<loc>[^<]*' | sed 's/<loc>//' | head -12 | while read u; do curl -s "$u" | grep -oE '<meta name="description" content="[^"]*"'; done | sort | uniq -c`. Result, run 2026-11-27 over every sitemap URL (no `head -12` cut): indexer 23 pages, one value (count 23); ocx-mirror 10 pages, one value (count 10); indexbot 9 pages, one value (count 9). Sitemaps: `https://grimoire-rs.github.io/indexer/sitemap.xml`, `https://ocx-sh.github.io/ocx-mirror/sitemap.xml`, `https://ocx-sh.github.io/indexbot/sitemap.xml`. All three set `site_description` in `mkdocs.yml` (`grep -n '^site_description' mkdocs.yml`); indexer's one source page with a `description:` frontmatter still built with the site value, so source presence does not prove built uniqueness. So "description present 10 of 10" in the crawl hides 0 unique descriptions. The three MkDocs files set `site_url` (3 of 3).
Distinct-description check on the ocx.sh build (`find dist -name '*.html' | xargs grep -ho '<meta name="description" content="[^"]*"' | sort | uniq -c | sort -rn | head`) over `ocx-sh/website/site/dist` showed count 1 for each of the top values: unique. Only the 5-page marketing site was checked; the 116-page docs site was not built in this run.

og:type: ocx.sh home build emits `og:type` article (`grep -o 'og:type" content="[^"]*"' ocx-sh/website/site/dist/index.html`).
Site config: Astro `site:` is set in ocx-sh/website/site, ocx-sh/ocx/website and grimoire-rs/grimoire/docs (3 of 7 Astro sites, per seo-geo.md; four other Astro sites lack it, unconfirmed whether they build absolute canonicals).

### 9. Live vs repository (the CDN case)

| Host | Repo file | Live robots.txt | Diff |
|---|---|---|---|
| ocx.sh | `ocx-sh/website/site/dist/robots.txt`: `User-agent: *`, `Allow: /`, `Sitemap: https://ocx.sh/sitemap-index.xml` | same (`diff <(curl -s --resolve ocx.sh:443:37.27.135.61 https://ocx.sh/robots.txt) ocx-sh/website/site/dist/robots.txt` prints no diff) | none |
| grimoire.rs | `grimoire-rs/grimoire/docs/public/robots.txt`: `User-agent: *`, `Allow: /`, `Sitemap: https://grimoire.rs/sitemap.xml` | the same three lines at the end, preceded by `Content-Signal: search=yes,ai-train=no,use=reference` and roughly 40 Disallow groups (ClaudeBot, GPTBot, Google-Extended, CCBot, Claude-Web, anthropic-ai and others) | prepended block not in repo |
| index.grimoire.rs | `ocx-sh/index/dist/robots.txt` names `https://ocx.sh/catalog/sitemap-index.xml` (a different site's file; its own build output) | Cloudflare-style block plus `Sitemap: https://index.grimoire.rs/sitemap.xml` | whole file differs; repository copy not located for this host |

Command for the diff: `diff <(curl -s https://grimoire.rs/robots.txt | grep -v '^#' | grep -v '^$') <(cat grimoire-rs/grimoire/docs/public/robots.txt)`. The prepended block is the documented Cloudflare Managed robots.txt behaviour, so it is explained, not a defect; whether the fleet wants ClaudeBot, GPTBot and Google-Extended blocked is a business decision (see below). Sitemaps: grimoire.rs serves both `/sitemap.xml` (a urlset, 200) and `/sitemap-index.xml` (200); the index lists only `sitemap-0.xml`; robots names `sitemap.xml`.

Limit: the live ocx.sh host failed TLS from this machine (cert mismatch, the README says a cutover is in progress), so ocx.sh live reads use `--resolve`; that proves the origin, not what a public client sees.

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER. "Build dir" means the static output (`dist/` for Astro, `site/` for MkDocs).

1. **MUST set the site URL in config.** Astro `site:` in `astro.config.*` or MkDocs `site_url` in `mkdocs.yml`, an https origin including any sub-path. Rationale: canonical, sitemap and OG URLs are absolute only with it; the fleet had 3 of 7 Astro sites with it. Verify: `grep -E '^\s*site:' astro.config.*` or `grep -E '^site_url:' mkdocs.yml` is non-empty and starts with `https://`.
2. **MUST emit exactly one `<link rel="canonical">` per indexable page, in `<head>`, absolute https, no fragment, equal to the page's sitemap `<loc>` and to `og:url`.** Rationale: strong signal; relative values break when a test site is crawled. Verify on the build dir: for each HTML file, `grep -c 'rel="canonical"'` equals 1; value matches `^https://`; set of canonicals equals set of sitemap `<loc>` (excluding noindex pages). Pass: `<link rel="canonical" href="https://ocx.sh/docs/">`. Fail: no tag (index.grimoire.rs) or `href="/docs/"`.
3. **MUST NOT send canonical in both the HTML element and an HTTP header with differing URLs.** Rationale: Google says different canonicalization methods must not point at different URLs; conflicting signals let Google pick either. Verify: `curl -sI <url> | grep -i '^link:.*canonical'` and compare with the HTML.
4. **MUST give every page a unique non-empty `<title>` that names the page, not only the site.** Rationale: Google rewrites half-empty and micro-boilerplate titles. Verify: collect `<title>` from the build dir; none empty, none equal to the site name alone, `sort | uniq -d` over titles is empty; site name appears once, at one end, after a delimiter (ocx.sh's `ocx: ... | ocx` fails). Do not enforce a character count; Google states none.
5. **MUST give every page a unique meta description; frontmatter is the source.** Rationale: Google asks for unique per-page descriptions; a site-wide fallback is a duplicate. Verify, two steps. (a) Source: `find <docs> \( -name '*.md' -o -name '*.mdx' \) | xargs grep -L -m1 -E '^description:'` prints no content page (exempt: generated reference pages that set a description at build, named in a list). (b) Build: `find <build> -name '*.html' | xargs grep -ho '<meta name="description" content="[^"]*"' | sort | uniq -c | sort -rn | head` shows no value with count above 1 except on the home page and aggregation pages. Fail: indexer, ocx-mirror and indexbot, 23 of 23, 10 of 10 and 9 of 9 identical.
6. **SHOULD treat a descriptions of one noun or a keyword list as missing.** Rationale: Google asks for specific descriptions and warns against keyword lists, so a one-noun or comma-list description carries no usable snippet. Verify: description word count of at least 6 and not a comma list (reading heuristic; pass: "Mirror upstream tool releases into OCI registries as OCX packages", fail: "OCX, mirror, registry"). Google gives no length floor; the number 6 is this catalogue's choice.
7. **MUST NOT enforce a character length for title or description as if Google set it.** Rationale: Google says no limit, truncation by device width. Verify: any lint rule with a number cites a third-party source and is SHOULD at most.
8. **MUST emit the four ogp.me properties on every page: `og:title`, `og:type`, `og:image`, `og:url`.** Rationale: ogp.me lists these four as required; a page missing one is not a valid Open Graph object and previews degrade. Verify: for each built page, grep the four `property=` values; counts 0 fail. Fleet: ocx.sh 298 pages fail on `og:image`.
9. **MUST make `og:image` an absolute https URL that returns 200 with `Content-Type` image/png or image/jpeg.** Rationale: the protocol shows absolute only; consumers are undefined for relative; SVG is not a reliable preview. Verify: `u=$(grep -oE 'og:image" content="[^"]*"' <file> | sed 's/.*content="//;s/"$//'); case $u in https://*) ;; *) echo FAIL;; esac; curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$u"` prints `200 image/png` or `200 image/jpeg`. Fail: `/logo.svg` (index.grimoire.rs).
10. **SHOULD add `og:image:alt` whenever `og:image` is present.** Rationale: ogp.me asks for it. Verify: grep for `og:image:alt` beside `og:image`.
11. **MUST set `twitter:card=summary_large_image` only on pages that emit an `og:image`.** Rationale: a large-card declaration with no image gives the card nothing to show. Verify: pages with `summary_large_image` and no `og:image` is empty. Fleet: 128 of 298 ocx.sh pages fail. (The platform's own image rules sit in channels.)
12. **SHOULD set `og:type` to `website` for home, docs and landing pages, and `article` only for dated posts that also carry `article:published_time`.** Rationale: ogp.me treats unmarked pages as `website` and reserves `article` for content with article properties; a wrong type misdescribes the page. Verify: `grep -o 'og:type" content="[^"]*"'` per page; `article` without `article:published_time` fails (ocx.sh home fails).
13. **MUST emit sitemap files that are UTF-8, contain only absolute https `<loc>` values, stay under 50,000 URLs and 50 MB uncompressed.** Rationale: Google's stated sitemap limits are 50 MB uncompressed or 50,000 URLs per file, UTF-8, fully qualified URLs; a file beyond them is partly ignored. Verify: `xmllint --noout sitemap-0.xml`; `grep -c '<loc>'`; `grep '<loc>' | grep -v '<loc>https://'` prints nothing; `stat -c %s`.
14. **MUST NOT emit `<priority>` or `<changefreq>`.** Rationale: Google and Bing ignore both; dead config suggests an effect that does not exist. Verify: `grep -E '<(priority|changefreq)>' sitemap*.xml` prints nothing (SHOULD severity for existing sites).
15. **MUST either omit `<lastmod>` or set it to the real content change time; MUST NOT use build or generation time.** Rationale: Google uses lastmod only when consistently accurate; Bing says never the generation time. Verify: build twice with no content change and `diff` the two sitemaps; any lastmod difference fails; a lastmod identical on every URL fails. Astro: use `serialize()` with a source-derived date; the integration cannot read pages.
16. **MUST list every sitemap index the site publishes in robots.txt with a fully qualified `Sitemap:` line.** Rationale: a sitemap under `/docs/` covers only `/docs/` descendants unless otherwise submitted, and robots.txt lists are the discovery path; ocx.sh names 1 index (4 URLs of 298). Verify: `curl -s https://<host>/robots.txt | grep -i '^sitemap:'` yields one line per index; every `<loc>` in the build sitemaps falls under a listed index; each line matches `^[Ss]itemap: https://`.
17. **MUST serve robots.txt at the host root with status 200, UTF-8, under 500 KiB, using only `user-agent`, `allow`, `disallow`, `sitemap`.** Rationale: per spec; `crawl-delay` is ignored by Google. Verify: `curl -s -o /dev/null -w '%{http_code} %{size_download}\n' https://<host>/robots.txt` gives `200` and below 512000; `grep -iE '^(crawl-delay|noindex):'` prints nothing for Google-targeted groups.
18. **MUST ship a robots.txt per host and not assume one covers a subdomain.** Rationale: Google applies robots.txt only to the exact host, protocol and port, and it must sit at the host root; a project path under github.io is not a root. Verify: probe `https://<each host>/robots.txt`; measured 2026-11-27: `curl -s -o /dev/null -w '%{http_code} %{content_type}' <origin>/robots.txt` returns `404 text/html; charset=utf-8` (GitHub's HTML 404 page) for `https://grimoire-rs.github.io/indexer`, `https://ocx-sh.github.io/ocx-mirror`, `https://ocx-sh.github.io/indexbot` and for the bare hosts `https://grimoire-rs.github.io` and `https://ocx-sh.github.io`. A project path is not a host root, so a project-page site cannot own one; a custom domain is needed.
19. **MUST NOT combine `noindex` with a robots.txt Disallow for the same URL.** Rationale: the crawler never sees the noindex. Verify: for each URL with `noindex`, assert no Disallow rule matches it.
20. **MUST run a post-deploy live-versus-repository check after every deploy or CDN-setting change.** Rationale: a CDN can rewrite robots.txt (Cloudflare prepends) and the live head can differ from the build. Verify: (a) robots: `diff <(curl -s https://<host>/robots.txt | grep -v '^#' | grep -v '^$') <(grep -v '^#' <build>/robots.txt | grep -v '^$')`; the only allowed diff is a block the repo documents as a named CDN feature; (b) sitemap: the live `sitemap*.xml` `<loc>` set equals the build's; (c) head: for N sampled live pages (home plus 10 random sitemap URLs) compare canonical, title, description, `og:image` to the build file for the same path; (d) `og:image` per rule 9 on the live URL. Run against the origin and the public name; a certificate error is a finding.
21. **MUST keep a repository `public/robots.txt` (Astro) or a generating route, and never rely on the CDN to create it.** Rationale: Astro does not generate robots.txt; MkDocs sites on github.io cannot. Verify: file exists in `public/` or `src/pages/robots.txt.*`.
22. **SHOULD add `<link rel="sitemap" href="/sitemap-index.xml">` in head for Astro sites.** Rationale: documented discovery link; ocx.sh does so. Verify: `grep -c 'rel="sitemap"' index.html` is 1. (CONSIDER for MkDocs.)
23. **MUST mark preview, staging and non-production deploys `noindex` (via `X-Robots-Tag` or meta) and leave them crawlable.** Rationale: otherwise they compete as duplicates; blocking in robots.txt hides the noindex. Verify: `curl -sI <preview-url> | grep -i x-robots-tag`.
24. **MUST NOT emit a canonical or sitemap URL from a hard-coded host that differs from the deploy host.** Rationale: a canonical or `<loc>` on another host tells Google the preferred URL lives elsewhere and splits or hands away ranking signals. Verify: all `<loc>` and canonical hosts equal the `site`/`site_url` host.
25. **CONSIDER one `WebSite` JSON-LD on the root of each host for the site name.** Rationale: Google says it is the strongest signal; subdirectory sites cannot have their own name. Verify: JSON-LD on `/` has `name` and `url`; JSON-LD is out of this dive's scope beyond this pointer.

## AI-agent angle

| Typical agent error | Smallest mechanical check |
|---|---|
| Writes a root-relative `og:image` (`/og.png`, `/logo.svg`) because it works in a dev server | rule 9 grep for `https://` and `curl` status |
| Sets `twitter:card=summary_large_image` and forgets `og:image` | rule 11, a one-line grep join |
| Adds `priority` and `changefreq` to every sitemap entry from older tutorials | rule 14 grep |
| Stamps `lastmod` with `new Date()` at build | rule 15 double-build diff |
| Sets `site_description` and calls descriptions done on MkDocs | rule 5(b) `uniq -c` on built descriptions |
| Skips `site:` in Astro, then canonicals and sitemap vanish or are relative | rule 1 grep |
| Writes `robots.txt` with `Crawl-delay`, `Noindex:` or a relative `Sitemap: /sitemap.xml` | rule 17 grep |
| Adds a `Sitemap:` line for one index and misses per-section indexes | rule 16 coverage check |
| Disallows a path in robots.txt and also puts `noindex` on it | rule 19 cross-check |
| Believes the repo robots.txt is what crawlers see when a CDN rewrites it | rule 20 live diff |
| Enforces 60 and 160 character limits as Google rules | rule 7; no Google source exists for those numbers |
| Sets `og:type=article` on every Starlight page | rule 12 |

## Dated facts

| Fact | URL | Date stated by source (fetched 2026-11-27) | Source kind |
|---|---|---|---|
| Sitemap max 50 MB uncompressed or 50,000 URLs; UTF-8; absolute URLs; priority and changefreq ignored; lastmod used only if accurate | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap | 2026-07-08 (page footer) | Platform (Google) |
| robots.txt 500 KiB; 5xx: 12 h stop, 30 days cache; at least 5 redirect hops; crawl-delay unsupported; Sitemap line absolute | https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec | 2026-10-23 (page footer) | Platform (Google) |
| Canonical strengths: redirect and rel=canonical strong, sitemap weak; absolute recommended | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | 2026-07-10 (page footer) | Platform (Google) |
| No title length limit; truncated to device width; rewrite triggers | https://developers.google.com/search/docs/appearance/title-link | 2025-12-10 (page footer) | Platform (Google) |
| No description length limit; unique per page | https://developers.google.com/search/docs/appearance/snippet | 2026-04-20 (page footer) | Platform (Google) |
| noindex needs a crawlable page | https://developers.google.com/search/docs/crawling-indexing/block-indexing | 2025-12-10 (page footer) | Platform (Google) |
| Site name: WebSite markup on root with name and url; no subdirectory support | https://developers.google.com/search/docs/appearance/site-names | 2025-12-10 (page footer) | Platform (Google) |
| Required OG properties: title, type, image, url; unmarked pages are website | https://ogp.me/ | no date on page; Open Web Foundation Agreement 0.9 is the only version marker | Specification authority |
| Bing: lastmod ISO 8601, not generation time; changefreq and priority ignored | https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search | 2025-07-31 | Platform (Bing) |
| Cloudflare Managed robots.txt prepends to origin file; content signals default | https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ | dateModified 2026-11-02 | Platform (Cloudflare docs) |
| Astro sitemap needs `site`, emits sitemap-index.xml and sitemap-0.xml, no per-page lastmod without serialize(), no robots.txt generation | https://docs.astro.build/en/guides/integrations-guide/sitemap/ | none on page (fetched 2026-11-27) | Framework docs |
| Starlight frontmatter description overrides site description; title required | https://starlight.astro.build/reference/frontmatter/ , https://starlight.astro.build/reference/configuration/ | none on page (fetched 2026-11-27) | Framework docs |
| MkDocs `site_url` adds canonical on every page; default null | https://www.mkdocs.org/user-guide/configuration/ | none on page (fetched 2026-11-27) | Framework docs |
| Starlight sitemap on once `site` is set | https://starlight.astro.build/guides/customization/ | none on page (fetched 2026-11-27) | Framework docs |

Note: the Google dates are the 'Last updated' footer lines in the page HTML (`curl -sL <url> | grep -oE 'Last updated [0-9-]+ UTC'`, 2026-11-27); the rendered-text fetch tool does not show them. ogp.me and the framework docs state no date.

## What an agent must not decide alone

- Which AI crawlers to allow or block (ClaudeBot, GPTBot, Google-Extended and others): a business and licence decision. The live grimoire hosts block them through Cloudflare today; an agent must report this, not reverse it. Ask the owner.
- Whether a CDN feature (Cloudflare Bot Preference Sync, Managed robots.txt) stays on; ask.
- Which domain is canonical when two hosts serve the same content (ocx.sh cutover, github.io versus custom domain); ask.
- Which pages are deliberately excluded from search (preview, legacy rules_ocx, 404); ask for the list.
- The image used for `og:image` and its wording (brand and licence); an agent may wire an existing approved asset but must not generate a new brand image unprompted.
- Whether to ship the unbuilt `rules_ocx` Jekyll site's SEO plugin or retire it; ask.

## Contested / evolving

- Relative `og:image`: ogp.me examples show absolute URLs and are silent on relative ones; some consumers may resolve a relative value against the page URL. This brief bans it because no source guarantees resolution (as of 2026-11-27, undecided by the spec).
- `lastmod`: Google ("consistently and verifiably accurate") and Bing ("true last modification time", ISO 8601 with time) agree in direction. The practical dispute is whether a build-time stamp helps a docs site that rebuilds often; both platforms say no, no source says it helps. Astro's own integration offers a single site-wide date as the easy path, which the platforms discourage.
- Google Search Console reports "Syntax not understood" for Cloudflare's `Content-Signal` lines (Cloudflare says harmless: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/; Google has not documented the field in the robots spec, which lists four fields only). Both are platform statements; treat Content-Signal as optional.
- Length targets (about 60 characters title, about 155 to 160 description) circulate widely; Google's pages state none. Treat as third-party heuristics.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | Google canonicalization | undated, fetched 2026-11-27 | strength order, absolute rule |
| https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap | Google sitemap guide | undated | limits, lastmod, ignored tags |
| https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec | Google robots.txt spec | undated | status handling, size, fields |
| https://developers.google.com/search/docs/appearance/title-link | Google title links | undated | rewrite triggers, no length limit |
| https://developers.google.com/search/docs/appearance/snippet | Google snippets and meta description | undated | uniqueness, no length limit |
| https://developers.google.com/search/docs/crawling-indexing/block-indexing | Google noindex | undated | noindex versus Disallow |
| https://developers.google.com/search/docs/appearance/site-names | Google site names | undated | WebSite markup on root only |
| https://ogp.me/ | Open Graph protocol | undated | required properties, og:type |
| https://docs.astro.build/en/guides/integrations-guide/sitemap/ | Astro sitemap integration | undated | `site` requirement, lastmod limit |
| https://starlight.astro.build/reference/configuration/ | Starlight config reference | undated | head, description, titleDelimiter |
| https://starlight.astro.build/reference/frontmatter/ | Starlight frontmatter reference | undated | page description and title |
| https://starlight.astro.build/guides/customization/ | Starlight customization guide | undated | sitemap needs `site` |
| https://www.mkdocs.org/user-guide/configuration/ | MkDocs configuration | undated | site_url canonical, site_description |
| https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ | Cloudflare Managed robots.txt | dateModified 2026-11-02 | the CDN rewrite case |
| https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search | Bing sitemap blog | 2025-07-31 | lastmod and ignored tags, platform view |

Local measurements: files under `/home/mherwig/dev` (robots.txt, `astro.config.mjs`, `mkdocs.yml`, build outputs) and `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md` (A8 `crawl.py`, A9 `probe.sh`) and `messaging-inventory.md` §5.
