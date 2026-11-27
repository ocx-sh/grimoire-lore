---
title: AI crawler policy, robots.txt tokens and llms.txt for built sites
program: product
sub_program: marketing
topic: marketing-discoverability
worker: seo-ai-crawler-policy
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
scope: >
  Covers the AI and search crawler tokens of OpenAI, Anthropic, Perplexity and Google; Cloudflare's Content Signals
  and managed robots.txt; llms.txt; the live robots.txt of 25 landing exemplars plus grimoire.rs. Does not cover
  sitemaps, canonicals, structured data, rendering or snippet tuning (sibling workers), nor the legal merits of
  EU copyright reservations (named only as a human decision). Scout rows carried, not re-opened: SE Ranking
  300k-domain study, Common Crawl July 2026 llms.txt analysis, Mueller podcast quotes.
---

# AI crawler policy, robots.txt tokens and llms.txt for built sites

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

Source dates are the dates the source states; "no date on page" means the page states none (fetched 2026-11-27).

- Split every AI user-agent token into three classes: search (shows the site in AI answers, allow), user-fetch (a person asked the agent to read a page, allow, and do not rely on robots.txt), training (the owner's decision, record it). Sources: [OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity](https://docs.perplexity.ai/guides/bots) (all no date on page, Anthropic "updated over 3 weeks ago").
- Default for a developer-tool site: allow search and user-fetch tokens, allow training unless the owner records a decision to block. Blocking training costs no visibility; blocking search tokens does.
- The 25 exemplar sites name no AI crawler token in robots.txt: 0 of 20 served files (5 serve none). 5 of 25 carry a `Content-Signal` line and 4 of those 5 set `ai-train=yes` (own measurement, 2026-11-27, command in Findings 3).
- grimoire.rs is the counter-example. Cloudflare's managed robots.txt disallows 31 agents (distribution-posture audit, 2026-11-27) and names 32 distinct non-`*` tokens in all (re-measured 2026-11-27). The repository file says `Allow: /` and the edge returns 403 to a `PerplexityBot` user agent robots.txt never names. Live behaviour differs from both files.
- Google-Extended is a robots.txt token with no crawler of its own. [Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) (no date on page) says it does not affect Search inclusion or ranking. Use `nosnippet`, `data-nosnippet`, `max-snippet` or `noindex` to limit AI Overviews ([Google AI features](https://developers.google.com/search/docs/appearance/ai-features), no date on page).
- ChatGPT-User and Perplexity-User are fetches a person triggered, and [OpenAI](https://developers.openai.com/api/docs/bots) and [Perplexity](https://docs.perplexity.ai/guides/bots) say robots.txt may not apply. Anthropic's page does not say for Claude-User.
- `anthropic-ai` and `Claude-Web` are absent from [Anthropic's current crawler page](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) (fetched 2026-11-27). Rules naming only them are legacy.
- Content-Signal is a Cloudflare vocabulary ([Cloudflare blog](https://blog.cloudflare.com/content-signals-policy/), 2025-09-24, platform's own page): a preference, with no stated vendor commitment. [Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) says it intends to support the IETF AIPREF signal in early 2027, not Content-Signal.
- Google, [changelog entry 2026-06-15](https://developers.google.com/search/updates): llms.txt has no positive or negative effect on Search. [Ahrefs](https://ahrefs.com/blog/llmstxt-study/) (vendor data, 2026-06-15, May 2026 data): of 137,210 domains with traffic, about 38,000 (28%) publish llms.txt, 97% of those files got zero requests, and Claude-Code was the second most named AI fetcher.
- Frame llms.txt as agent onboarding for coding and docs agents, never as SEO. Ship it only with a stated agent purpose, and never let `/llms.txt` return a 5xx: [Lighthouse](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt) (no date on page) flags a server error and treats a 404 as not applicable.
- Policy is recorded in one repository file, `crawler-policy.toml` at the repository root (a convention proposed by this dive, format in Findings 8). The live robots.txt and live user-agent probes are gated against it, because a CDN can rewrite the file.
- Cloudflare claimed ([2025-08-04](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/), Cloudflare's own claim, no Perplexity response in the post) that Perplexity crawled stealthily after being blocked. Robots.txt is a request, not enforcement; enforcement needs WAF rules and is an owner-approved decision.

## Findings

### 1. Token inventory by class

Pages fetched 2026-11-27. Only Anthropic's page states a date signal ("As of October 30, 2026", "Updated over 3 weeks ago"); the OpenAI, Perplexity and Google common-crawler pages state no date.

| Vendor | Token | Class | What blocking does | Source |
|---|---|---|---|---|
| OpenAI | `OAI-SearchBot` | search | Keeps the site out of ChatGPT search answers (may still appear as a navigational link); OpenAI recommends allowing it | [OpenAI bots](https://developers.openai.com/api/docs/bots) |
| OpenAI | `GPTBot` | training | Signals content must not train OpenAI foundation models | same |
| OpenAI | `ChatGPT-User` | user-fetch | Page says robots.txt rules "may not apply" because a user initiated the visit | same |
| OpenAI | `OAI-AdsBot` | ads landing-page check | Only visits pages submitted as ads | same |
| Anthropic | `ClaudeBot` | training | Excludes future content from training sets; honours `Crawl-delay` | [Anthropic crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Anthropic | `Claude-SearchBot` | search | May reduce visibility in Claude search results | same |
| Anthropic | `Claude-User` | user-fetch | May block retrieval for user questions; page does not say how robots.txt applies | same |
| Perplexity | `PerplexityBot` | search | Perplexity says it surfaces sites in results and is not used for foundation-model training; allow it to appear | [Perplexity bots](https://docs.perplexity.ai/guides/bots) |
| Perplexity | `Perplexity-User` | user-fetch | "Generally ignores robots.txt" because a user requested it | same |
| Google | `Google-Extended` | training and grounding token | Controls use for Gemini Apps, Vertex AI Gemini training and grounding; "does not impact a site's inclusion in Google Search nor is it used as a ranking signal"; no separate user agent | [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |
| Google | `GoogleOther` | generic R&D crawler | No specific product effect | same |
| Google | `Google-CloudVertexBot` | site-owner-requested Vertex agent crawl | No effect on Search | same |
| Google | `Googlebot` | search, also feeds AI Overviews and AI Mode | AI features are part of Search; robots.txt is not a separate opt-out | [Google AI features](https://developers.google.com/search/docs/appearance/ai-features) |

Operational facts: Anthropic publishes IP prefixes at `https://claude.com/crawling/bots.json` (creation time 2026-10-20 in the live file) and warns that blocking by IP stops the bot from reading robots.txt. OpenAI publishes per-bot lists (`searchbot.json`, `gptbot.json`, `chatgpt-user.json`, `adsbot.json`). Perplexity lists `perplexitybot.json` and `perplexity-user.json`. Robots.txt changes take about 24 hours for OpenAI search and up to 24 hours for Perplexity; Google recrawl of preview controls takes "several days to several months".

Anthropic's page also states that "as of October 30, 2026" it honours a machine-readable "no AI training" preference signal, and that a rule naming ClaudeBot wins over the general signal. The page does not say which signal syntax; treat the syntax as unverified.

### 2. Robots.txt parsing rules that make a policy fail silently

From [Google's robots.txt spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (no date on page, fetched 2026-11-27):

- Limit is 500 KiB; content past it is ignored.
- Every 4xx except 429 is read as "no robots.txt", so a 401 or 403 on robots.txt means no restrictions, not "blocked".
- 5xx: Google stops crawling for 12 hours, then uses the cached copy for up to 30 days, then acts as if no file exists.
- Google follows at least five redirect hops, then treats the result as 404.
- Only `user-agent`, `allow`, `disallow`, `sitemap` are supported; `crawl-delay` is ignored by Google, though Anthropic says ClaudeBot honours it.
- A crawler uses the single most specific matching group; the longest path wins; allow wins ties. So a `User-agent: GPTBot` group replaces `User-agent: *` for GPTBot entirely: repeat shared `Disallow` lines in each group.

Incorrect (agent habit): allowing a token in its own group drops the `*` restrictions.

```
User-agent: *
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
# /api/ is now crawlable by OAI-SearchBot: its group replaced the * group
```

Correct:

```
User-agent: OAI-SearchBot
Disallow: /api/
```

### 3. Measurement: 25 exemplars, live robots.txt

Command (run 2026-11-27, raw files under `~/.cache/research-lang/exemplars/product/robots/`):

```
for u in posthog.com supabase.com astro.build ... neon.com grimoire.rs; do
  curl -sL -m 20 -A "Mozilla/5.0 research" -o $u.txt -w "$u %{http_code} %{content_type} %{size_download}\n" https://$u/robots.txt
done
# AI tokens named:
grep -iE '^user-agent:' $f | grep -iE 'gpt|oai|chatgpt|claude|anthropic|perplexity|google-extended|ccbot|bytespider|applebot|amazonbot|meta-external|cohere|diffbot|googleother|mistral'
# signals:
grep -i '^content-signal' $f
```

Results for the 25 exemplars of [exemplar-landing-pages.md](../product-audit/exemplar-landing-pages.md):

| Measure | Count of 25 | Hosts |
|---|---|---|
| robots.txt served (HTTP 200, text/plain) | 20 | all except below |
| No robots.txt (HTTP 404) | 5 | tailwindcss.com, docs.astral.sh, astral.sh, mise.jdx.dev, vite.dev |
| Names any AI or Google AI token (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot and the rest of the grep list) | 0 | none |
| Carries a `Content-Signal` line | 5 | cal.com `ai-train=no, search=yes, ai-input=yes`; supabase.com, neon.com, sentry.io, fly.io all `ai-train=yes, search=yes, ai-input=yes` |
| Carries an agent discovery line beyond sitemap | 2 | cal.com `Agentmap: .../.well-known/ai-catalog.json`; fly.io `schemamap: .../schemamap.xml` |
| Blocks a search token by name | 0 | none |
| Blanket `Disallow: /` for `*` | 0 | none |
| Names non-AI bots with rules | 3 | posthog.com (Googlebot, Bingbot, DuckDuckBot, Yeti: `Disallow: /*.md$`), stripe.com (ia_archiver, rogerbot), tailscale.com (`atlassian-bot` allowed on `/docs/`) |

Findings: the corpus norm is "say nothing about AI tokens" (20 of 20 served files). The one exemplar that blocks training by signal (cal.com, `ai-train=no`) allows search and input. The four that opt in to training are developer-tool or platform companies. Posthog's `Disallow: /*.md$` for search engines (not AI agents) shows a pattern worth knowing: serve Markdown mirrors to agents without letting search engines index them as duplicates. This is a counted observation, not a ranking claim.

Edge check, same day, user-agent string probes (`curl -A "Mozilla/5.0 (compatible; <token>/x)" https://<host>/` for 10 exemplars): all returned the same status for browser, OAI-SearchBot, ClaudeBot and PerplexityBot user agents, except grimoire.rs.

| Host and user agent | Status |
|---|---|
| grimoire.rs, index.grimoire.rs: browser, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, Perplexity-User, Googlebot | 200 |
| grimoire.rs, index.grimoire.rs: GPTBot, ClaudeBot | 403 (matches the robots.txt Disallow) |
| grimoire.rs, index.grimoire.rs: **PerplexityBot** | **403, and robots.txt does not name PerplexityBot** |

PerplexityBot is a search token. The CDN blocks it while robots.txt (live and repository) says it is allowed. Caveat: this is a user-agent string test from one IP; a verified bot from Perplexity's published ranges may be treated differently by Cloudflare. The test shows the live site's behaviour contradicts its declared policy for a search token under at least one condition. Probable cause is the Cloudflare AI-crawler managed block rule that Cloudflare says matches signatures for Perplexity's crawling after 2025-08-04 ([Cloudflare](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/)); that cause is an inference, not confirmed.

The grimoire.rs managed file lists 31 `Disallow: /` agents (distribution-posture audit) including `GoogleOther`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bytespider`, `Amazonbot`, `meta-externalagent`, `anthropic-ai` and `Claude-Web`; it does not list `OAI-SearchBot`, `Claude-SearchBot` or `PerplexityBot`. It also states `Content-Signal: search=yes,ai-train=no,use=reference`. Whether the project meant to block training for a developer-tool catalog is not recorded in any repository, which is the audit's smell 6.

### 4. Cloudflare's Content Signals and managed robots.txt

From the [Cloudflare blog, 2025-09-24](https://blog.cloudflare.com/content-signals-policy/) (platform's own page):

- Syntax: `Content-Signal: search=yes, ai-train=no`. Keys `search` (index plus links and short excerpts, not AI summaries), `ai-input` (retrieval, grounding, real-time use in AI answers), `ai-train`. A key left out neither grants nor restricts.
- The block is framed as an express reservation of rights under Article 4 of EU Directive 2019/790. Whether that has legal effect is a legal question; this dive makes no claim.
- Over 3.8 million domains had managed robots.txt on (Cloudflare figure at publication). Managed file serves `search=yes, ai-train=no` and no `ai-input`.
- Cloudflare calls it a preference, not a technical countermeasure; some companies may ignore it; pair with WAF or Bot Management for enforcement.

From [Cloudflare's managed robots.txt docs](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) (no date): managed directives are added when Bot Preference Sync is on and at least one of Search, Agent or Training policy is block; if the origin returns 200 for `/robots.txt`, Cloudflare prepends its managed content above the origin file and serves both; `use=reference` appears in Cloudflare's example output but is not defined on the blog's three-signal list (the live grimoire.rs file defines `use` itself). Enforcement requires AI Crawl Control; compliance is voluntary.

Consequence: a repository file and the live file differ by design on any Cloudflare-fronted host. A repository-only check is wrong for such hosts.

[Cloudflare on Perplexity](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/) (2025-08-04, Cloudflare's own claims, no Perplexity response in the post): with declared bots blocked, Cloudflare reports a Chrome-impersonating agent on unlisted IPs, about 3-6 million requests a day against 20-25 million for the declared crawler, across tens of thousands of domains, and that Perplexity answered questions about disallowed new test domains. Cloudflare de-listed Perplexity as a verified bot. Perplexity's current docs say Perplexity-User generally ignores robots.txt. Read together: do not treat robots.txt as access control for either user-fetch or contested crawlers.

### 5. Google's position and what Google-Extended is

- [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (changelog adds it 2026-05-15): "optimizing for generative AI search is optimizing for the search experience, and thus still SEO"; "Structured data isn't required for generative AI search"; no chunking requirement; no ideal page length; llms.txt is not used by Google Search and neither helps nor harms.
- [Google search changelog](https://developers.google.com/search/updates): 2026-05-15 guide added; 2026-06-15 "Clarifying guidance on llms.txt files" (files have no positive or negative effect, keep them for other services); Google-Extended description updated 2024-02-08 and 2025-04-25. Page read to character 100,000 of 200,186 only.
- Google-Extended: robots.txt token with no HTTP user agent; the common-crawlers page states no Search effect and does not mention AI Overviews. The AI features page names `nosnippet`, `data-nosnippet`, `max-snippet`, `noindex` as the controls that limit Search display, and says Google-Extended is not described as a control for AI Overviews or AI Mode.
- The common-crawlers page states Google "intends to support" the AIPREF training signal (`user-agent: __usage_ai-training`) "in early 2027". IETF [aipref working group](https://datatracker.ietf.org/wg/aipref/about/) lists vocabulary and attachment drafts with 2026-08-31 target for IESG submission; the page does not show whether they met it, so status is unverified.

### 6. llms.txt: what it is for

- [llmstxt.org](https://llmstxt.org/) (v2, by Jeremy Howard, first published 2024-09-03, modified 2026-08-10; the proposal's own page): a Markdown file at `/llms.txt` or any subpath; H1 required; blockquote summary; H2 link lists; an `Optional` H2; plus a convention of `page.md` mirrors with `rel="alternate" type="text/markdown"`. It states its focus is inference-time use, "most heavily for software documentation", where coding agents follow it to API references. It does not mention `llms-full.txt`.
- [Google](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): no effect on Search. So framing llms.txt as SEO is wrong by the platform's own statement.
- [Ahrefs study](https://ahrefs.com/blog/llmstxt-study/) (vendor data, published 2026-06-15, May 2026 data): 137,210 domains with Ahrefs Web Analytics traffic; 28% publish llms.txt (upper bound, technical skew); 97% of files got zero requests; 96% of requests were bots; 19.5% from named AI bots, with GPTBot first and Claude-Code second, ahead of every AI search or assistant bot; about 12% from GEO tools and checkers; Lighthouse made 22 requests, "roughly 1 in 1,000" (re-read 2026-11-27); zero AI-bot requests to paths that returned 404. The 28% is "more than one in four domains (38,000)", so 38,000 is the count of domains with a valid file and 137,210 the population, and the two figures agree. Ahrefs: "fetched" is not "read".
- [Chrome Lighthouse agentic-browsing audit](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt) (no date on page): flags a server error on fetching `/llms.txt`; a 404 is N/A because the file is optional; rationale is that agents otherwise crawl more.
- Exemplars (product-audit, same day): 17 of 25 serve `/llms.txt` as `text/plain`. 3 of 25 carry agent onboarding in the hero.

Reading: llms.txt is a low-cost pointer file for coding agents that already fetch it; the evidence for any citation or ranking benefit is absent (SE Ranking carried from scout: no citation link on 300,000 domains, not re-opened here). It earns its place when the product's users are people configuring agents, which is true of OCX and Grimoire. It is not worth maintaining by hand if it is a second index; generate it from the docs nav.

### 7. Existing catalog rules, reconciled

Command (run 2026-11-27 from the worktree root; the first attempt failed on a zsh glob, so this one passes no `--include`): `grep -rn "DOC-AGENT" rules .claude skills`. The rows live in `skills/docs-quality-reference/machine-readers.md` lines 19-25, linked from `rules/docs-quality.md` line 151.

| ID | What it says (paraphrase) | Severity | Relation to this dive |
|---|---|---|---|
| DOC-AGENT-04 | Publish `llms.txt` in spec shape as a recommended index, never as the required agent-readability mechanism; check is an awk shape test, run only when the file exists | SHOULD | Compatible. This dive adds the audience gate (rule 13), the no-5xx check (rule 14) and the ban on SEO framing (rule 16). It does not restate "optional". |
| DOC-AGENT-05 | Name the specific consumer when justifying an agent-facing mechanism; grep for `AI traffic`, `AI crawler`, `search visibility` | SHOULD | Rule 13's copy grep extends this pattern with `SEO` and `ranking`. Use one grep list, not two. |
| DOC-AGENT-08 | Require only static-file mechanisms unless the repository's host config proves the site can serve more (content negotiation, custom response headers need an edge layer) | MUST | Binds rule 17. A `Link:` or `X-Robots-Tag` header is an edge feature, so rule 17 uses the static `<link rel="alternate">` and a robots.txt path rule and gates headers on DOC-AGENT-08's evidence. |

Source discrepancy for the catalog owner. DOC-AGENT-04 cites "mecanik.dev" for 97% of files with zero requests, and DOC-AGENT-05 cites it for "1.1 percent" AI-crawler traffic. This dive could not find a mecanik.dev page with either figure (WebSearch 2026-11-27 returned none; the mecanik.dev post index, 8 of 277 articles visible, showed none). The 97% figure is in the primary [Ahrefs study](https://ahrefs.com/blog/llmstxt-study/) (2026-06-15, vendor data). The 1.1% matches Ahrefs' "AI retrieval bots 1.1%" share of requests to llms.txt files, a narrower quantity than "generic AI-crawler traffic". Re-source both rows to Ahrefs and reword DOC-AGENT-05's rationale before it ships.

### 8. Where the policy is recorded

Fleet evidence: ocx.sh generates robots.txt into built output (`ocx-sh/website/site/dist/robots.txt`); grimoire.rs keeps `grimoire-rs/grimoire/docs/public/robots.txt`, which is served verbatim and so cannot hold decision notes; no repository records the Cloudflare policy (distribution-posture audit, smell 6). The file therefore has to live outside the served tree. This dive's proposed convention, not drawn from any source: `crawler-policy.toml` at the repository root, one table per token, read by CI.

```toml
reviewed = "2026-11-27"          # date the vendor pages were re-read
sources  = ["https://developers.openai.com/api/docs/bots"]   # the five vendor URLs
[token."OAI-SearchBot"]
class = "search"                 # search | user-fetch | training
decision = "allow"               # allow | block
owner = "name"                   # required when decision = "block"
decided = "2026-11-27"
```

Check, tested 2026-11-27 against grimoire.rs with a one-token policy (it printed 32 undeclared live tokens):

```
curl -s https://$HOST/robots.txt | awk 'tolower($1)=="user-agent:"{print $2}' | grep -v '^\*$' | sort -u > live.txt
grep -oE '^\[token\."[^"]+"\]' crawler-policy.toml | sed -E 's/.*"(.*)".*/\1/' | sort -u > pol.txt
comm -23 live.txt pol.txt     # any output is a fail: a live token the policy never decided
```

## Normative guidance candidates

Each rule carries a separate Severity field. Source dates are the dates the page states; "no date on page" means none is shown (fetched 2026-11-27).

1. **Name AI crawler tokens by class in `crawler-policy.toml`.** Severity: MUST. Rationale: a CDN default or an agent's habit otherwise sets the policy; token classes come from [OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) and [Perplexity](https://docs.perplexity.ai/guides/bots) (no date on page). Verification: `grep -c '^\[token\.' crawler-policy.toml` counts at least the search tokens, and `grep -n -iE 'OAI-SearchBot|Claude-SearchBot|PerplexityBot' crawler-policy.toml` returns one line each with a `decision`; `GPTBot`, `ClaudeBot`, `Google-Extended` also appear.
2. **Default search tokens (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Googlebot`, `Bingbot`) to allow.** Severity: MUST. Rationale: [OpenAI](https://developers.openai.com/api/docs/bots) (no date on page) says blocking OAI-SearchBot keeps a site out of ChatGPT search answers, and [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) says Claude-SearchBot blocks may reduce visibility. Verification: `curl -s https://$HOST/robots.txt` has no `Disallow: /` under any of those tokens, and `curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0 (compatible; <token>/1.0)" https://$HOST/` equals the browser-UA status (pass: equal 2xx; fail: 403 or 429).
3. **Treat user-fetch tokens (`ChatGPT-User`, `Claude-User`, `Perplexity-User`) as allow and never claim robots.txt controls them.** Severity: MUST. Rationale: [OpenAI](https://developers.openai.com/api/docs/bots) and [Perplexity](https://docs.perplexity.ai/guides/bots) (both no date on page) say robots.txt may not apply or is generally ignored; Anthropic's page is silent. Verification: `grep -n -iE 'ChatGPT-User|Claude-User|Perplexity-User' crawler-policy.toml` shows `decision = "allow"`, and no line in the policy or docs says robots.txt blocks user-initiated fetches; a block wish is recorded as a WAF decision.
4. **Default training tokens (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`) to allow for an open-source developer tool, and record any block as an owner decision.** Severity: SHOULD. Rationale: of the 5 of 25 exemplars with a Content-Signal line, 1 sets `ai-train=no` (cal.com) and 4 set `ai-train=yes` (supabase.com, neon.com, sentry.io, fly.io); own robots.txt measurement, 2026-11-27, command in Findings 3; training in documentation can be a distribution channel but this is a business position. Verification: every `decision = "block"` table in `crawler-policy.toml` has non-empty `owner` and `decided`; `awk '/decision = "block"/{b=1} /^owner = ""/{exit 1}' crawler-policy.toml` exits 0.
5. **Never block `Google-Extended` expecting it to remove a page from AI Overviews or AI Mode.** Severity: MUST. Rationale: [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) (no date on page) says it "does not impact a site's inclusion in Google Search"; [Google AI features](https://developers.google.com/search/docs/appearance/ai-features) (no date on page) names `nosnippet`, `data-nosnippet`, `max-snippet`, `noindex` as the controls. Verification: `grep -n -B1 -A3 'Google-Extended' crawler-policy.toml`; the stated purpose says "Gemini training and grounding", not "AI Overviews" (pass) and a `note` that says "AI Overviews" fails.
6. **Repeat shared path rules inside every named-token group.** Severity: MUST. Rationale: [Google robots spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (no date on page) says a crawler uses only its most specific group, so a named-token group replaces `User-agent: *`. Verification: for each non-`*` group, `diff` its `Disallow` lines against the `*` group; a private path (`/api/`, `/admin`) missing is a fail.
7. **Serve `/robots.txt` as `200 text/plain`, under 500 KiB, never 4xx or 5xx, at most five redirects.** Severity: MUST. Rationale: [Google robots spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (no date on page) states the 500 KiB limit, that all 4xx except 429 are read as "no robots.txt", and that Google follows at least five redirect hops then treats the result as 404. Verification: `curl -sL -o /dev/null -w "%{http_code} %{content_type} %{num_redirects} %{size_download}\n" https://$HOST/robots.txt` (no `-I`: a HEAD request reports size 0; tested on grimoire.rs 2026-11-27, `200 text/plain; charset=utf-8 0 2741`) prints 200, `text/plain`, at most 5, under 512000.
8. **Gate the live robots.txt against `crawler-policy.toml`.** Severity: MUST. Rationale: [Cloudflare managed robots.txt docs](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) (no date on page) say Cloudflare prepends managed content above the origin file, and the grimoire.rs repository said `Allow: /` while the live file named 32 tokens (measured 2026-11-27). Verification: the `comm -23 live.txt pol.txt` job in Findings 8 prints nothing; compare tokens, not bytes.
9. **Probe live status by bot user agent after every CDN or WAF change.** Severity: MUST. Rationale: grimoire.rs returned 403 to a `PerplexityBot` UA that robots.txt does not name (own measurement, 2026-11-27, Findings 3); probable cause is a Cloudflare rule following the [2025-08-04 Cloudflare report](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/), an inference. Verification: the rule 2 curl loop over search and user-fetch tokens; pass only if each status equals the browser-UA status. Limit: a UA-string test from one IP, not an IP-verified test.
10. **Write robots.txt `Content-Signal` only when the policy file states intent for all three keys (`search`, `ai-input`, `ai-train`).** Severity: SHOULD. Rationale: the [Cloudflare blog](https://blog.cloudflare.com/content-signals-policy/) (2025-09-24) says an omitted key neither grants nor restricts, and its managed file omits `ai-input`. Verification: `grep -i '^content-signal' robots.txt` lists all three keys, or the policy file records why one is omitted.
11. **Never describe Content-Signal as enforcement.** Severity: MUST NOT (MUST). Rationale: the [Cloudflare blog](https://blog.cloudflare.com/content-signals-policy/) (2025-09-24) calls it a preference and points to WAF for enforcement. Verification: `grep -n -iE '(blocks?|prevents?|stops?).{0,40}content-signal|content-signal.{0,40}(blocks?|prevents?|stops?)' docs README.md crawler-policy.toml` returns nothing; pass wording "requests" or "reserves", fail wording "Content-Signal blocks training".
12. **Refer to `anthropic-ai` and `Claude-Web` only as legacy, never as the sole Anthropic rule.** Severity: MUST. Rationale: [Anthropic's current page](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) (updated over 3 weeks before 2026-11-27) lists ClaudeBot, Claude-User, Claude-SearchBot. Verification: `! grep -qiE 'anthropic-ai|claude-web' robots.txt || grep -qi 'ClaudeBot' robots.txt` exits 0.
13. **Ship `/llms.txt` only if the product's users configure or run coding agents, and write its purpose as agent onboarding.** Severity: SHOULD. Rationale: [Google](https://developers.google.com/search/updates) (changelog entry 2026-06-15) says no effect on Search; [Ahrefs](https://ahrefs.com/blog/llmstxt-study/) (vendor data, 2026-06-15) found 97% of files unrequested yet Claude-Code second among named AI fetchers. Verification: the file's H1 and blockquote say what an agent should do with the product; `grep -n -iE 'SEO|ranking|visibility|AI traffic|AI crawler' llms.txt README.md docs` near `llms.txt` is a fail unless a named consumer is in the same sentence (same list as DOC-AGENT-05).
14. **Keep `/llms.txt` free of server errors; a 404 is acceptable.** Severity: MUST. Rationale: [Lighthouse](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt) (no date on page) flags a server error and marks a 404 "Not Applicable". Verification: `curl -s -o /dev/null -w "%{http_code} %{content_type}" https://$HOST/llms.txt` prints `200 text/plain` or `404 ...`, never 5xx.
15. **Generate `llms.txt` from the docs navigation, not by hand, in the spec's shape.** Severity: SHOULD. Rationale: [llmstxt.org](https://llmstxt.org/) (created 2024-09-03, modified 2026-08-10, proposal author) defines H1, blockquote, H2 link lists; a hand-kept second index drifts. Verification: the DOC-AGENT-04 awk shape test passes, and a link checker over the file's URLs returns 0 non-2xx.
16. **Never add llms.txt, `llms-full.txt` or Markdown mirrors as a ranking tactic or promise AI citations from them.** Severity: MUST NOT (MUST). Rationale: [Google](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (added 2026-05-15 per its changelog) says GEO is SEO and llms.txt has no effect. Verification: the rule 13 grep over commit message, PR text and copy.
17. **Serve Markdown mirrors with `<link rel="alternate" type="text/markdown" href="...">` in the HTML head and keep search engines off them with a robots.txt path rule; add `Link:` or `X-Robots-Tag` headers only when DOC-AGENT-08's evidence (a `_headers` file or edge config) exists.** Severity: CONSIDER. Rationale: [llmstxt.org](https://llmstxt.org/) (2026-08-10) proposes the `.md` convention; posthog.com serves `Disallow: /*.md$` under four search-engine tokens (own measurement, 2026-11-27); response headers are an edge feature per catalog rule DOC-AGENT-08. Verification: `curl -s https://$HOST/page | grep -i 'rel="alternate".*text/markdown'` matches, and `grep -n 'Disallow: /\*\.md\$' robots.txt` sits under search-engine groups only; no source measured benefit.
18. **Never use `Crawl-delay` as the control for Googlebot.** Severity: MUST NOT (MUST). Rationale: [Google robots spec](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) (no date on page) supports only `user-agent`, `allow`, `disallow`, `sitemap`; [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) says ClaudeBot honours it. Verification: `awk 'tolower($1)=="user-agent:"{u=$2} tolower($1)=="crawl-delay:"{print u}' robots.txt` lists no Googlebot and no `*` group that stands in for it.
19. **Record the review date and the vendor URLs the policy relied on.** Severity: MUST. Rationale: token lists changed within 24 months (`anthropic-ai` is gone from Anthropic's page, fetched 2026-11-27). Verification: `crawler-policy.toml` has `reviewed = "YYYY-MM-DD"` and `sources` listing the five vendor URLs; fail if `reviewed` is over 180 days old (project choice, not a platform limit).

## Dated facts

| Fact | URL | Date the source states | Source type |
|---|---|---|---|
| OAI-SearchBot (search), GPTBot (training), ChatGPT-User (user visits, robots rules may not apply), OAI-AdsBot; about 24 hours for search-related robots changes | https://developers.openai.com/api/docs/bots | no date on page; fetched 2026-11-27 | platform |
| ClaudeBot (training), Claude-User, Claude-SearchBot; honours Crawl-delay; IP list `claude.com/crawling/bots.json`; "As of October 30, 2026" a machine-readable no-training signal is honoured | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler | "updated over 3 weeks ago" (before 2026-11-27), Oct 30 2026 clause | platform |
| Anthropic IP file creation time | https://claude.com/crawling/bots.json | 2026-10-20 | platform |
| PerplexityBot (search, not foundation-model training), Perplexity-User (generally ignores robots.txt); up to 24 hours for robots changes | https://docs.perplexity.ai/guides/bots | no date on page | platform |
| Google-Extended: token only, no Search effect; GoogleOther; Google-CloudVertexBot; AIPREF support intended early 2027 | https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers | no date on page | platform |
| Google robots.txt: 500 KiB, 4xx means no file, 5xx caching of 30 days, at least 5 redirect hops, only four fields supported | https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec | no date on page | platform |
| Google: AI features are Search; robots.txt not a separate opt-out; controls are nosnippet, data-nosnippet, max-snippet, noindex; recrawl takes days to months | https://developers.google.com/search/docs/appearance/ai-features | no date on page | platform |
| Google: AI optimization guide added; llms.txt clarification | https://developers.google.com/search/updates | 2026-05-15; 2026-06-15 | platform |
| Cloudflare Content Signals Policy; 3.8 million domains with managed robots.txt | https://blog.cloudflare.com/content-signals-policy/ | 2025-09-24 | platform (vendor-of-the-feature, own number) |
| Cloudflare managed robots.txt behaviour | https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ | no date on page | platform |
| Cloudflare reports Perplexity undeclared crawling: 3-6 million daily requests (stealth) versus 20-25 million (declared) | https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/ | 2025-08-04 | vendor claim (Cloudflare), no Perplexity response in post |
| llms.txt proposal v2; created 2024-09-03; modified 2026-08-10 | https://llmstxt.org/ | 2024-09-03 / 2026-08-10 | proposal author's page |
| llms.txt: 137,210 domains with traffic, 28% (about 38,000) publish, 97% zero requests, GPTBot first and Claude-Code second among named AI bots, Lighthouse made 22 requests (about 1 in 1,000) | https://ahrefs.com/blog/llmstxt-study/ | 2026-06-15 (May 2026 data) | **vendor data** (Ahrefs) |
| Lighthouse audit flags server error on `/llms.txt`; 404 is N/A | https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt | no date on page | platform |
| IETF aipref charter milestones: vocabulary and attachment drafts, 2026-08-31 to IESG; status not shown | https://datatracker.ietf.org/wg/aipref/about/ | milestone 2026-08-31 | standards body |
| 25 exemplar robots.txt: 0 name AI tokens, 5 Content-Signal, 5 absent | this dive, command in Findings 3 | measured 2026-11-27 | independent measurement |
| grimoire.rs: PerplexityBot UA returns 403, robots.txt does not name it | this dive, command in Findings 3 | measured 2026-11-27 | independent measurement, UA-string only |

## What an agent must not decide alone

- Whether to block or allow training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot` and the rest) for a project. This is a business and licensing position; an agent proposes the default and records the human's answer.
- Whether to assert an EU Article 4 rights reservation or any Content-Signal wording with legal intent. Legal.
- Any WAF, Bot Management or IP block to enforce a policy, and any allowlist change for a named vendor's IP ranges. Cost, availability and security consequences.
- Turning Cloudflare's managed robots.txt or Bot Preference Sync on or off. It rewrites the live file.
- Whether the product should publish `llms.txt` at all when the audience is not agent users, and what it exposes (private roadmap, internal URLs).
- Blocking AI Overviews display (`nosnippet`) site-wide; it also removes rich snippets.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Writes `User-agent: GPTBot` plus `Disallow: /` and calls it "blocking AI", leaving `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` unaddressed | Policy file lists each token with a class; grep each token name |
| Blocks `Google-Extended` to "opt out of AI Overviews" | Rule 5 grep: purpose text must say Gemini training and grounding |
| Adds `anthropic-ai` or `Claude-Web` as the Anthropic rule | Rule 12: `ClaudeBot` named alongside |
| Treats the repository `robots.txt` as what crawlers see, on a Cloudflare-fronted host | Rule 8: diff live against repository tokens |
| Allows a token in its own group and drops the `*` private-path rules | Rule 6 diff of Disallow sets |
| Adds `Crawl-delay` for Googlebot | Rule 18 grep |
| Writes llms.txt "to rank in ChatGPT" and cites a benefit | Rule 13 and 16 copy grep for `SEO|ranking` near `llms.txt` |
| Believes `Content-Signal: ai-train=no` blocks training | Rule 11 wording grep |
| Treats a 403 on `/robots.txt` as "blocked" | Rule 7 curl status check |
| Quotes training-data token lists from memory | Rule 19: reviewed-date header with URLs |
| Checks only robots.txt and misses edge 403s (grimoire.rs PerplexityBot) | Rule 9 UA-probe loop |

## Contested / evolving

- **Does llms.txt help?** Google: no effect on Search ([guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), 2026-06-15). Ahrefs (vendor): 97% of files unrequested, but Claude-Code ranked second among named AI fetchers ([study](https://ahrefs.com/blog/llmstxt-study/), 2026-06-15). Lighthouse added an audit ([Chrome](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt)). Position taken here: agent onboarding only, low cost, no search claim. Trend: toward tool-specific use (coding agents, browsers), not search.
- **Block training or allow it?** Cal.com blocks (`ai-train=no`); Supabase, Neon, Sentry, Fly.io explicitly allow. No source in this dive measures whether allowing training raises later citation or recommendation of a product; do not claim it does.
- **Does robots.txt bind AI fetchers?** OpenAI and Perplexity say user-fetch tokens may ignore it; Cloudflare alleges Perplexity ignored it even for declared bots ([Cloudflare](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/), 2025-08-04, no response in post). Unresolved in sources read.
- **Which preference signal wins: Content-Signal or IETF AIPREF?** Cloudflare's vocabulary is deployed on millions of domains (its figure); Google plans AIPREF support early 2027 and Anthropic reports honouring a "no AI training" signal from 2026-10-30 without naming the syntax. The aipref working group's deliverable status is unverified. Re-check each quarter.
- **Token lists churn.** `anthropic-ai` and `Claude-Web` are listed in Cloudflare's managed file and absent from Anthropic's current page; the sources do not say whether they still do anything.

## Sources

Opened and read (16 pages and files; the 25-site robots.txt set and user-agent probes are measurements, not counted):

| URL | What it is | Date/era | Why worth reading | Type |
|---|---|---|---|---|
| https://developers.openai.com/api/docs/bots | OpenAI crawler docs | none stated; fetched 2026-11-27 | tokens, classes, IP lists | primary |
| https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler | Anthropic crawler support page | updated within last weeks; Oct 30 2026 clause | ClaudeBot, Claude-User, Claude-SearchBot, signal | primary |
| https://claude.com/crawling/bots.json | Anthropic IP prefixes | 2026-10-20 | IP verification | primary |
| https://docs.perplexity.ai/guides/bots | Perplexity bot docs | none stated | search vs user-fetch | primary |
| https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers | Google common crawlers | none stated | Google-Extended, AIPREF plan | primary |
| https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec | Google robots.txt spec | none stated | status codes, limits, matching | primary |
| https://developers.google.com/search/docs/appearance/ai-features | Google AI features controls | none stated | AI Overviews controls | primary |
| https://developers.google.com/search/docs/fundamentals/ai-optimization-guide | Google AI optimization guide | 2026-05-15 per changelog | llms.txt, GEO is SEO | primary |
| https://developers.google.com/search/updates | Google Search changelog (half read) | 2026-05-15, 2026-06-15 | dated entries | primary |
| https://llmstxt.org/ | llms.txt proposal | 2024-09-03, modified 2026-08-10 | format and intent | primary (proposal author) |
| https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt | Lighthouse audit | none stated | pass/fail semantics | primary |
| https://datatracker.ietf.org/wg/aipref/about/ | IETF aipref group | milestones 2026-08-31 | standard track status | primary |
| https://blog.cloudflare.com/content-signals-policy/ | Cloudflare Content Signals | 2025-09-24 | signal definitions | platform (vendor of feature) |
| https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ | Cloudflare managed robots.txt | none stated | how live file is rewritten | platform |
| https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/ | Cloudflare Perplexity report | 2025-08-04 | enforcement limits; vendor claim | vendor claim |
| https://ahrefs.com/blog/llmstxt-study/ | Ahrefs llms.txt study | 2026-06-15 | request data; vendor data | vendor data |

Carried from scouts, not opened here: SE Ranking 300,000-domain study (SEJ, 2025-11-20), Common Crawl July 2026 llms.txt analysis (2026-08-31), Mueller podcast quotes. Read from the worktree in the repair pass: `skills/docs-quality-reference/machine-readers.md` (DOC-AGENT-04, -05, -08). mecanik.dev, cited by those rows, could not be found. `https://ocx.sh/` was not probed (the audit reports it unreachable from this machine).
