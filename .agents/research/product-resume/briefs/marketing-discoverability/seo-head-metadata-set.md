# Commission: marketing-discoverability / seo-head-metadata-set

Topic question: Which crawl, index, share and answer-engine signals must every built site emit, and which AI-era search tactics are banned as retired or spam?

Question: Which head tags, page descriptions, sitemap and robots facts must every built page emit, and how is the live site checked against the repository?
Starts from: seo-geo.md #1-3 and #17; distribution-posture.md smells 1 and 5 (og:image on 0 of 298 ocx.sh pages while 128 declare summary_large_image; robots.txt reaches 4 of 298 URLs; index.grimoire.rs has no canonical on 25 of 25 pages and a relative SVG og:image) and patterns 1-3; messaging-inventory.md §5 and smell 9 (4 of 10 docs sites have 0 page descriptions; indexer 1 of 23; og:type=article on the ocx.sh home).
Investigate:
1. Google Search Central: canonicalization, sitemaps, the robots spec, title links, snippets and site names. URLs are in seo-geo.md.
2. ogp.me, for required properties and URL form.
3. Astro `site:`, @astrojs/sitemap and Starlight head config, via Context7; the MkDocs `site_url` and `site_description` settings.
Platform share-image dimensions belong to channels. Require only that og:image is absolute https, returns 200 and is PNG or JPEG.
Measure, not cite:
- `curl -s` each fleet site's robots.txt, sitemap index and home head; diff robots.txt against the repository's public/robots.txt.
- Walk each built sitemap. Count pages missing canonical, description, og:image, or with a relative og:image. Reuse distribution-posture.md A8 crawl.py and record the command.
- Count source pages with no description per docs site, re-running the messaging-inventory.md §5 command.
The home page's description text belongs to positioning-canonical-sentence. This dive owns presence and form.
The deliverable must decide: the required head set per page; the absolute-URL rule; the description-presence rule and its source check (frontmatter or config); the sitemap-in-robots rule; and a post-deploy check that compares the live site with the repository (the CDN case).
