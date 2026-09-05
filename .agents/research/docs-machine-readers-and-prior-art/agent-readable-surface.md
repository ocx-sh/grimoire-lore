---
title: Agent-readable docs surface
topic: agent-readable-surface
group: docs-machine-readers-and-prior-art
agent: docs-research-agent-readable-surface
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 15
scope: >
  What a docs site owes an agent reader: llms.txt's real shape and consumption data,
  the per-page Markdown-twin/content-negotiation convention agents actually fetch,
  the progressive-disclosure-vs-byte-cost conflict, and whether agent-directed prose
  changes model behavior — resolved into required/recommended mechanisms with a check
  for each, gated by what a plain static host can and cannot do. Does not cover
  prior-art adoption of existing AI docs skills/lint packages, AGENTS.md as coding-
  agent config, or MCP server design in depth (owned by the sibling topic
  `prior-art-adoption-and-self-validation`); those formats are named here only to
  scope them out.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [llms.txt: the spec, and the adoption-vs-consumption gap](#f1)
   2. [The proven channel: per-page Markdown twins and content negotiation](#f2)
   3. [Twins verified live: Stripe and Laravel](#f3)
   4. [The progressive-disclosure conflict, resolved](#f4)
   5. [Agent-directed prose: what actually changes model behavior](#f5)
   6. [Static host vs platform: what each mechanism needs](#f6)
   7. [Where this fleet stands today](#f7)
   8. [Sibling formats, scoped out](#f8)
3. [Normative guidance candidates](#normative)
4. [AI-agent angle](#ai-angle)
5. [Contested / evolving](#contested)
6. [Sources](#sources)

## Summary

- A per-page Markdown twin (`<page>.md` or `Accept: text/markdown`) is the mechanism agents demonstrably fetch; llms.txt is the mechanism sites demonstrably publish and agents demonstrably ignore — a rule must require the twin, not the index file.
- llms.txt is real, versioned, and still moving: Jeremy Howard's spec was revised 2026-08-10, and it names an H1 title, a required blockquote summary, then H2-delimited markdown link lists — nothing more is required ([llmstxt.org](https://llmstxt.org/)).
- llms.txt publishing grew 8.8x in one year (4,088 → ~36,120 sites, June 2025 → May 2026) while 97% of published files logged zero requests in May 2026, and AI retrieval bots were only 1.1% of the requests that did land ([mecanik.dev](https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/)).
- Google stated publicly (July 2025) it has no plans to consume llms.txt for Search or AI Overviews and still publishes its own copy anyway — treat the file as a cheap courtesy, never as an SEO or discovery strategy.
- Cloudflare, Vercel, Mintlify, Stripe, and Laravel all independently converge on the same pattern: every documentation page also resolves as plain Markdown at a predictable URL or via an `Accept: text/markdown` request header — confirmed live at `docs.stripe.com/payments.md` and `laravel.com/docs/12.x/installation.md` on 2026-09-05.
- Because 9 of this fleet's 9 real docs sites already build from Markdown source (MkDocs, VitePress, mdBook), publishing the pre-render `.md` file alongside the rendered HTML page costs close to nothing — this fleet does not need Cloudflare's or Mintlify's HTML→Markdown conversion step at all.
- A live re-check of `developers.cloudflare.com/docs-for-agents/` on 2026-09-05 no longer carries the "31x bytes" / "chrome is a token tax" language the grounding audit quoted from it months earlier; the companion blog post at `blog.cloudflare.com/markdown-for-agents/` (2026-02-12) instead measures an 80% token reduction (≈5x) on its own page — the rhetorical framing moved faster than the underlying mechanism did.
- NN/g's progressive-disclosure ceiling ("beyond 2 levels, usability drops," from 46 tested applications) and Cloudflare's "hiding content behind clicks costs an agent bytes" argument are not actually in conflict — they are the same collapse mechanism scored against two different audiences, and the fix is audience-scoped delivery, not picking a winner.
- A controlled test (Claude Sonnet 4.6, 15 runs per condition) found an explicit stated preference moved compliance from 33.3% to 100%, while merely labeling an otherwise-identical block "For agents" changed nothing (34.5% vs. 34.5%) — a label without an instruction is decoration, not a lever ([passo.uno](https://passo.uno/if-you-are-an-agent-read-this/)).
- Mintlify moved its own llms.txt instructions from the bottom of the page to the top because "coding agents like Claude Code and Cursor often truncate or summarize long pages to preserve their own context window" — position, not just presence, decides whether an instruction is read at all ([mintlify.com/blog/context-for-agents](https://www.mintlify.com/blog/context-for-agents)).
- Not every agent-readable mechanism survives a plain static host: static file publishing (`.md` twins, `llms.txt`, `llms-full.txt`, `sitemap.md`) needs nothing beyond the build step, but `Accept`-header content negotiation at one URL and custom response headers (`X-Llms-Txt`, `Link: rel=alternate`) need an edge function or a headers config the host must support (Cloudflare Pages, Netlify, Vercel) — a bare GitHub Pages deploy cannot do either.
- This fleet has 0 of 9 sites with llms.txt, 0 with OpenGraph, and sitemap/canonical URLs only because the 7 MkDocs sites get them free from the generator once `site_url` is set — the two hand-rolled VitePress sites (`ocx`, `ocx-save`) have neither ([ux-observability-posture.md §4](../docs-audit/ux-observability-posture.md)).
- AGENTS.md, Mintlify's `skill.md`, and an MCP documentation server are real, distinct artifacts as of this era, but they answer a different question ("how does a coding agent work inside this repo," not "how does any agent read this docs site") — scope them out of a docs-site rule rather than merging three unconverged formats into one.
- A rule that permits agent-directed prose at all must require it to carry an actual instruction (a verb: use, prefer, run, install, follow) and sit before the second heading of the page — a bare "For agents:" label with no instruction is the one shape the evidence says does nothing.
- Any content a human page hides behind a `<details>`, tab, or accordion must still appear, unfolded, in that page's agent-facing twin — the collapse that helps a human reader is exactly the collapse that costs an agent reader the content entirely if the twin generator quietly drops it too.
- Do not justify any agent-facing mechanism by aggregate "AI traffic" or "AI crawlers" language — name the actual consumer (a coding agent a developer points at this specific repo or domain), because that is the only consumer the primary data shows reliably reading anything.

## Findings

### 1. llms.txt: the spec, and the adoption-vs-consumption gap {#f1}

llms.txt is Jeremy Howard's (Answer.AI) proposal, published 2024-09-03 and still evolving — the spec carries a v2 update dated 2026-08-10. Its required structure, fetched directly: an optional byte-order mark, then an H1 heading naming the project (the only strictly required section), a blockquote with a brief summary, zero or more free markdown paragraphs, and zero or more H2-delimited "file list" sections, each a markdown list of `[name](url): notes` links. The spec separately recommends publishing a "clean markdown version" of every page at the same URL with `.md` appended or substituted, discoverable via `rel="alternate" type="text/markdown"` ([llmstxt.org](https://llmstxt.org/), fetched 2026-09-05). As of the v2 update, "thousands of sites publish an llms.txt file," major doc platforms generate it automatically, Chrome's Lighthouse audits for it, and AI labs publish their own for their developer docs — the spec's own framing is adoption, not consumption.

Consumption data tells the opposite story. Ahrefs' server-log analysis across 137,000 domains found 97% of published llms.txt files logged zero requests in May 2026; of the requests that did arrive, AI retrieval bots were only 1.1% of total traffic (GPTBot 4.51%, ClaudeBot 0.80%, DeepseekBot 0.02% — shares of that small non-zero slice, not of all traffic). Publishing itself grew 8.8x in a year: ~4,088 sites in June 2025 to ~36,120 by May 2026. Google stated publicly in July 2025 it has no plans to consume the file for Search or AI Overviews — and publishes its own copy anyway, advising site owners not to rely on it for search visibility; OpenAI's crawler guidance points at `robots.txt` instead; Perplexity is the one named exception that does prioritize pages by it ([mecanik.dev/en/posts/does-llms-txt-do-anything-yet](https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/), fetched 2026-09-05). That non-consumption position still holds as of this fetch — nothing in the primary sources below contradicts it.

Net effect: publishing llms.txt is near-zero cost and worth doing, but it is not the mechanism that makes a site "agent-readable" — it is a courtesy index for the one consumer (a coding agent a developer deliberately points at a domain) who is shown to actually read it.

### 2. The proven channel: per-page Markdown twins and content negotiation {#f2}

Every vendor with real usage data converges on serving the actual page content as Markdown, not on the index file:

- **Cloudflare** ships "Copy as Markdown" on every page, an `/index.md` URL suffix, `Accept: text/markdown` negotiation, and response headers `x-markdown-tokens` / `x-original-tokens` reporting the size difference per request — plus per-product `llms.txt`/`llms-full.txt` and a full OpenAPI spec repo for code generation ([developers.cloudflare.com/docs-for-agents](https://developers.cloudflare.com/docs-for-agents/), last updated 2026-06-24, fetched 2026-09-05). Its companion blog post measures its own page at 16,180 tokens as HTML vs. 3,150 as Markdown — an 80% reduction — and gives a concrete micro-example: `## About Us` costs ~3 tokens in Markdown against 12-15 for the HTML-equivalent `<h2 class="section-title" id="about">About Us</h2>` ([blog.cloudflare.com/markdown-for-agents](https://blog.cloudflare.com/markdown-for-agents/), 2026-02-12).
- **Vercel** serves every docs page as Markdown via `Accept: text/markdown` or a `.md` extension, plus five site-wide discovery files: `llms.txt` (compact index), `llms-full.txt` (whole corpus), `sitemap.md` (summaries + prerequisites), `taxonomy.json` (canonical names/aliases), and `graph.json` (the full cross-link graph) — with a page-actions menu offering "View as Markdown" / "Copy page" to humans too ([vercel.com/docs/agent-resources](https://vercel.com/docs/agent-resources), page self-dated `last_updated: 2026-09-03`, fetched 2026-09-05).
- **Mintlify** reports "a 30x reduction in token usage" via the same `Accept: text/markdown` negotiation, adds `Link` and `X-Llms-Txt` response headers so an agent can discover the index without parsing the body, and — as of a 2026-01-29 post — moved its llms.txt instructions from the bottom of the file to the top specifically because long pages get truncated by the reading agent before it reaches the end ([mintlify.com/blog/context-for-agents](https://www.mintlify.com/blog/context-for-agents), fetched 2026-09-05).

The consistent shape across all three: the index file (llms.txt) is optional and thin; the per-page Markdown resolution is where the real byte/token savings and the real consumption happen.

### 3. Twins verified live: Stripe and Laravel {#f3}

Fetched directly on 2026-09-05, not assumed from a blog post:

- `docs.stripe.com/payments.md` returns a working Markdown page (in this fetch, localized to German — likely IP/locale-based content negotiation on Stripe's edge, a live example of the same negotiation mechanism producing an unexpected side effect for an automated fetcher). Every internal link on the page already resolves to its own `.md` sibling (`https://docs.stripe.com/checkout/quickstart.md`, `.../agents.md`, etc.) — the twin convention is applied site-wide, not to one landing page.
- `laravel.com/docs/12.x/installation.md` returns the page's raw Markdown source verbatim — anchors as `<a name="...">`, admonitions as `> [!NOTE]`, tabbed code fences as `` ```shell tab=macOS `` — confirming the `.md` twin is simply the pre-render source, not a separately generated agent view. The same page documents Laravel Boost, which indexes "over 17,000 pieces of vectorized Laravel ecosystem documentation" for agent tools directly — a second, independent agent-facing channel layered on top of the page twin.

Both confirm the brief's premise: the twin convention resolves in practice, at scale, on production sites, not only in vendor blog posts.

### 4. The progressive-disclosure conflict, resolved {#f4}

Named conflict: "progressive disclosure helps a human reader and costs an agent ~31x in bytes."

- **For a human reader**, NN/g's ceiling is explicit: "designs that go beyond 2 disclosure levels typically have low usability," based on testing across 46 web applications, with the two failure modes being burying frequently-needed options and making the escalation path itself invisible ([NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)).
- **For an agent reader**, the fleet's own grounding audit quotes Cloudflare's docs-for-agents guidance arguing that hiding detail behind clicks — the exact human-UX move NN/g recommends — actively hurts an agent, because "the same docs page costs 31x more bytes as HTML than as markdown" and "chrome is a token tax on every agent that reads you" ([recent-shifts-and-tooling.md §2](../docs-topic-map/recent-shifts-and-tooling.md), citing `developers.cloudflare.com/docs-for-agents/`).
- **Live re-check, 2026-09-05**: the same URL no longer carries that language in this fetch — the page has since been reorganized into a terser reference format (mechanism list, response headers, endpoint table), and the closest live figure is the companion blog's 80% (≈5x) token reduction on its own page, not 31x. See [Contested / evolving](#contested) for what this means.

These are not actually in tension once the audience is separated from the mechanism: NN/g's ceiling is about how many clicks a *human* should need before finding an answer; Cloudflare's argument is about how many *bytes* an agent should have to parse for the same answer. A page can collapse detail behind a `<details>` block for the human-rendered HTML while its Markdown twin (or `llms-full.txt`) ships the same content unfolded — the disclosure mechanism serves the human view, and its inverse (full expansion) serves the agent view, from the same source content. The conflict dissolves into a build-step requirement: **the twin generator must never silently drop what the human view collapsed.**

### 5. Agent-directed prose: what actually changes model behavior {#f5}

Fabrizio Ferri-Benedetti ran a controlled comparison rather than asserting an opinion, using Claude Sonnet 4.6 across 15 runs per condition:

- **Without** an explicit stated preference, the model selected the designated-preferred procedure in 5 of 15 runs (33.3%).
- **With** an explicit stated preference, it did so in all 15 runs (100%).
- Separately, labeling an otherwise-identical block "For agents" (versus a generic heading) when the page also carried conflicting information scored identically in both conditions: 34.5% vs. 34.5% — "it didn't matter whether the section was marked for agents or not: Claude Sonnet treated them the same way" ([passo.uno/if-you-are-an-agent-read-this](https://passo.uno/if-you-are-an-agent-read-this/), 2026, fetched 2026-09-05).

His recommendation: write one clear, unambiguous page for everyone, verify it with evals across models, and push code samples into a collapsible section or a separate LLM-friendly file rather than degrade the page a human reads. A companion piece frames the deeper split as one of *purpose*, not audience label — attributed to Drew Breunig: docs should be "the best possible fuel" for an agent's factual retrieval, while "humans don't require exhaustive documentation, they require mental models," and "the goal is to prepare your audience to prompt an agent effectively" ([passo.uno/tech-writing-role-split](https://passo.uno/tech-writing-role-split/), 2026-06-12, fetched 2026-09-05). The actionable read for a rule: a label is inert, an instruction is not, and the two audiences are better served by the same reference content plus separate explanatory material than by rewriting one page twice.

### 6. Static host vs platform: what each mechanism needs {#f6}

The brief asks which mechanisms survive on a plain static host and which need a platform. Sorting every mechanism named above by what it actually requires at request time:

| Mechanism | Requires | Survives on a plain static host (GitHub Pages, S3, a CDN with no edge functions)? |
|---|---|---|
| `llms.txt` / `llms-full.txt` at a fixed path | A file in the build output | Yes |
| Per-page `.md` twin at `<page>.md` | A file in the build output, one per page | Yes — and for this fleet's generators, it is literally the pre-render source |
| `sitemap.md` / `taxonomy.json` / `graph.json` | Files generated at build time | Yes |
| `Accept: text/markdown` content negotiation at the *same* URL | Server-side or edge logic to branch on a request header | **No** — needs an edge function or a platform that inspects headers (Cloudflare Workers/Pages, Vercel, Netlify Edge Functions) |
| Custom response headers (`X-Llms-Txt`, `Link: rel=alternate`, `x-markdown-tokens`) | A platform that lets you set response headers per route | **No** on bare GitHub Pages; **yes** with a Netlify/Cloudflare Pages `_headers` file or an edge function |
| An MCP documentation server | A running service | **No** — this is infrastructure, not a static asset, regardless of host |

Every static-file mechanism is available to any of this fleet's 9 sites regardless of host. Content negotiation and response-header mechanisms are not — and this fleet's own measured posture (0/9 with llms.txt, sitemap only where the generator emits it for free, `robots.txt` hand-authored on exactly one site) suggests none of the fleet is currently running the kind of edge layer that content negotiation needs ([ux-observability-posture.md §4](../docs-audit/ux-observability-posture.md)). A rule that requires `Accept`-header negotiation fleet-wide would be requiring infrastructure the fleet has not built; a rule that requires static-file twins would not.

### 7. Where this fleet stands today {#f7}

Measured directly: llms.txt / llms-full.txt 0/9, OpenGraph 0/9, RSS 0/9. Sitemap and canonical URLs track the generator, not a deliberate choice — every MkDocs site gets both for free the instant `site_url` is set in `mkdocs.yml` (7/7), the two hand-rolled VitePress sites have neither (0/2), and exactly one site (`grimoire`) has a hand-authored `robots.txt`, written specifically to point crawlers at its sitemap ([ux-observability-posture.md §4](../docs-audit/ux-observability-posture.md)). The load-bearing fact for this rule: because 9 of 9 real sites build from Markdown source files (`docs/**` or `website/src/**`), the per-page `.md` twin this section's evidence says actually matters is close to free to add — copy the source file to the build output alongside the rendered page, no HTML→Markdown conversion step (the kind Cloudflare and Mintlify had to build) required.

### 8. Sibling formats, scoped out {#f8}

Three further artifacts answer a related but distinct question and are named here only to keep them out of this rule's scope:

- **AGENTS.md** — a root-level, case-sensitive file carrying repo-specific instructions (code-example standards, style rules) for a coding agent working *inside* the repository, distinct from a docs site's llms.txt, which targets an agent reading the *published* docs ([mintlify/starter AGENTS.md](https://github.com/mintlify/starter/blob/main/AGENTS.md), referenced via [codified-practice.md §7](../docs-topic-map/codified-practice.md)).
- **`skill.md`** — Mintlify's auto-regenerated, per-doc-update artifact at `/.well-known/skills/default/skill.md`, installable into 20+ agents, consolidating decision tables and gotchas that "documentation usually scatters across dozens of pages, or skips entirely" ([mintlify.com/blog/skill-md](https://www.mintlify.com/blog/skill-md)). This program is itself shipping a skill artifact for a different purpose (authoring docs, not consuming them) — building a second skill.md-shaped thing here would duplicate that output.
- **An MCP documentation server** — real infrastructure (Cloudflare ships one covering 2,500+ API endpoints; this fleet already has `ocx-mcp`), but it is a running service, not a docs-site content contract, and is out of reach of a rule that must be satisfiable by a static build.

None of the three is rejected as bad practice — each is simply a different artifact class than "what must a docs page publish." A docs-site rule should point at them, not absorb them.

## Normative guidance candidates {#normative}

1. **Require a Markdown twin of every published page, at a predictable URL (`<page>.md` or the page's pre-render source copied into the build output).**
   Rationale: this is the mechanism every vendor with real usage data (Cloudflare, Vercel, Mintlify) and every live-fetched production site (Stripe, Laravel) confirms agents actually consume; llms.txt alone leaves the fleet publishing an index to content nothing serves in agent-readable form.
   Verify: a build-time script that lists every URL in the generated `sitemap.xml` (or nav) and asserts a `.md` sibling exists in the build output for each — fail the build on any gap.
   Evidence level: measured.

2. **For a generator that already builds from Markdown source (MkDocs, VitePress, mdBook — 9 of 9 of this fleet's real sites), implement rule 1 by copying the source file into the build output, not by adding an HTML-to-Markdown conversion step.**
   Rationale: Cloudflare's and Mintlify's conversion pipelines exist because their content isn't already Markdown; this fleet's is, so the naive shortcut is also the cheapest correct one.
   Verify: `find docs -name '*.md' | wc -l` equals the count of `.md` files under the build output directory.
   Evidence level: measured (this fleet's own build inputs).

3. **Any content collapsed behind a `<details>`, tab, or accordion in the human-rendered page must appear, unfolded, in that page's Markdown twin.**
   Rationale: the progressive-disclosure ceiling that helps a human reader (NN/g: usability drops past 2 levels) is the same mechanism that, applied uncritically to the agent-facing twin, deletes content an agent has no other way to reach.
   Verify: a build-time test that strips markup from each `<details>`/`:::details` block's inner text and asserts that text (or a normalized substring of it) is present in the page's `.md` twin.
   Evidence level: argued (mechanism is sound; no source measured this specific check in production).

4. **Publish `llms.txt` as recommended, not required — spec-shape correct: an H1 project name, a blockquote summary, then zero or more H2 file-list sections of `[name](url): notes` links.**
   Rationale: it is near-zero cost and is the one file the spec itself, Lighthouse, and every major doc platform now expect to exist, but 97% of published copies get zero requests — it earns "recommended," not "load-bearing."
   Verify: if present, assert line 1 matches `^# `, a line matching `^> ` appears before the first `^## `, and at least one `^## ` section contains a markdown link.
   Evidence level: normative (the spec) + measured (the consumption data bounding its priority).

5. **Never justify publishing an agent-facing mechanism by aggregate "AI traffic" or "AI crawler" language — name the specific consumer (e.g., "a coding agent a developer points at this repository").**
   Rationale: the primary data says generic AI-crawler consumption of llms.txt is 1.1% of requests and 97% zero-request; a rule justified by that traffic will be believed and will still be wrong.
   Verify: a human reading heuristic on the rule's own prose — reject any sentence citing "AI traffic," "AI crawlers," or "search visibility" as the reason for a mechanism, without naming who specifically reads it.
   Evidence level: measured.

6. **Ban a decorative agent-directed label ("For agents:", "Note for AI:") that carries no imperative instruction; permit agent-directed prose only when it states an actual directive.**
   Rationale: the controlled test found a bare label changes nothing (34.5% vs. 34.5%) while an explicit stated preference changes everything (33.3% → 100%) — the label is not the lever, the instruction is.
   Verify: grep every heading/callout matching `/\b(for |note (for|to) )?agents?\b/i` (case-insensitive); for each match, assert the following paragraph contains at least one verb from an allowlist (use, run, prefer, install, follow, call, fetch) — flag any match with none.
   Evidence level: measured.

7. **Any permitted agent-directed instruction must appear before the page's second `##` heading (or within the first ~40 lines), never only in a trailing "notes" section.**
   Rationale: Mintlify moved its own instructions from the bottom to the top of the file specifically because a truncating reading agent drops what it never reaches.
   Verify: for each match found by rule 6's grep, assert its line number falls before the second `^## ` heading in the source file.
   Evidence level: measured.

8. **Require only static-file mechanisms (`.md` twins, `llms.txt`, `llms-full.txt`) fleet-wide; require `Accept`-header content negotiation and custom response headers (`X-Llms-Txt`, `Link: rel=alternate`) only on hosts that can actually serve them.**
   Rationale: a rule demanding content negotiation on a bare static host is demanding infrastructure that host cannot provide — the two hand-rolled VitePress sites in this fleet have no evidence of an edge layer today.
   Verify: a `curl -s -o /dev/null -w '%{http_code}' <page>.md` check for the static requirement (works everywhere); a paired `curl -H 'Accept: text/markdown' <page>` vs. plain `curl <page>` diff check gated behind a per-site config flag that only fires where the site declares platform support.
   Evidence level: measured (this fleet's own hosting posture) + normative (what each mechanism technically requires).

9. **Do not fold AGENTS.md, `skill.md`, or an MCP documentation server into this docs-site rule's required-mechanism list — point to them as separate artifacts with a separate audience.**
   Rationale: each answers "how does a coding agent work inside this repo" or "how does an agent query this API directly," not "what must a published docs page serve" — merging them produces a rule no single check can validate end to end.
   Verify: a reading heuristic on the rule file — its "required mechanisms" section names only file-shaped, page-level artifacts (twin, llms.txt); anything requiring a running service or a repo-root config file is cross-referenced, not required.
   Evidence level: asserted (a scope decision, not a measured or codified fact).

## AI-agent angle {#ai-angle}

- **Treats llms.txt as the deliverable rather than the twin.** Asked to "make docs agent-readable," an LLM reaches for the visible, citable, single-file artifact (llms.txt) and stops there, because it is the mechanism named in the most training data as "the AI file." Smallest check: the build-time `.md`-sibling-per-page test (candidate rule 1) — llms.txt existing does not satisfy it.
- **Writes a decorative agent label instead of an instruction.** An LLM producing a "For AI agents:" callout typically restates what the page already says ("This section covers configuration options") rather than issuing a directive — exactly the shape the controlled test measured as inert. Smallest check: the instruction-verb grep (candidate rule 6).
- **Buries the one useful instruction at the end of the page**, under a "Notes" or "Additional context" heading, following the human convention of putting asides last — the opposite of what a truncating reading agent needs. Smallest check: the line-number-before-second-heading test (candidate rule 7).
- **Claims a mechanism the deploy target cannot run** — writes "this site serves Markdown via content negotiation" into a rule or README for a site that is a bare static export with no edge layer, because the negotiation pattern is what the vendor blog posts describe and the LLM does not distinguish "this platform's docs example" from "this specific site's actual hosting." Smallest check: cross-reference the rule's claimed mechanisms against the site's hosting config (does a `_headers` file, `functions/`, or edge-worker config exist?) before accepting a negotiation claim.
- **Silently drops collapsed content when generating a flat agent view**, because the generation step is templated from the rendered (collapsed) HTML rather than the pre-collapse source, and nothing forces the two to be checked against each other. Smallest check: the details-block substring-containment test (candidate rule 3).
- **Cites aggregate "AI traffic is growing" as the reason for a mechanism**, because that is the framing most secondary coverage of llms.txt uses, rather than the primary consumption data showing that traffic is 1.1% of requests and mostly zero. Smallest check: the "name the consumer" reading heuristic (candidate rule 5) — reject "AI traffic" as a justification with no named party.
- **Merges AGENTS.md, skill.md, llms.txt, and an MCP server into one "agent readiness" checklist item**, because all four are agent-related and an LLM given a broad prompt tends to enumerate every artifact it knows about in the category rather than the one this rule actually governs. Smallest check: candidate rule 9's scope-boundary heuristic — a docs-site rule's required-mechanisms list should contain no artifact that needs a running service or lives outside the docs build.

## Contested / evolving {#contested}

- **Named conflict: progressive disclosure helps a human reader vs. costs an agent ~31x in bytes.** Resolved above (§4): not a real contradiction once the audience is separated from the mechanism. The fix is audience-scoped delivery — collapse for the human HTML render, flatten for the agent-facing Markdown twin — enforced by candidate rule 3's containment check. As of this era the trend is toward more sites shipping both renders from one source (Vercel's five-file discovery set, Cloudflare's per-page negotiation) rather than toward abandoning progressive disclosure for humans.
- **Named conflict: llms.txt as the agent-readability answer vs. the markdown-twin convention, at 97% zero requests.** Resolved above (§1-§2): the twin convention is the required mechanism because it is what the primary consumption data says gets read; llms.txt is recommended, not "the answer," and must not be justified by general AI-crawler adoption numbers. The trend as of 2026-09 is toward richer discovery-file *sets* (Vercel's `sitemap.md`/`taxonomy.json`/`graph.json`) layered on top of, not replacing, per-page twins — the single llms.txt file is being treated as increasingly insufficient even by the vendors who popularized it.
- **How fast this area's own rhetoric moves, observed directly.** The grounding audit quoted `developers.cloudflare.com/docs-for-agents/` for the "31x bytes"/"chrome is a token tax" framing; a live re-fetch of the same URL on 2026-09-05 (page self-dated last-updated 2026-06-24) no longer carries that language, having been reorganized into a terser mechanism-and-endpoint reference. The underlying mechanisms (Copy-as-Markdown, `/index.md`, `Accept` negotiation, per-product llms.txt) are unchanged; only the persuasive framing was dropped, sometime between the audit's fetch and this one. This is itself evidence for treating any single vendor's rhetoric as a fast-decaying citation and anchoring a rule's *mechanism* requirements (candidate rules 1, 3, 4) rather than its *marketing language* — a rule that quoted "31x" verbatim would already be citing a claim its own source page no longer makes.
- **Format convergence.** llms.txt, `skill.md`, and AGENTS.md remain three unconverged formats as of September 2026, each maintained by a different vendor coalition, with no cross-spec document reconciling them. This program's own choice — scope llms.txt/twins into the docs rule and point at, rather than absorb, the other two — is a bet that a docs-site content rule and a coding-agent-instruction format are separable concerns; nothing in the primary sources argues they must be merged, but nothing rules a future merger out either.

## Sources {#sources}

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [llmstxt.org](https://llmstxt.org/) | The llms.txt spec itself | Published 2024-09-03, v2 update 2026-08-10 | Primary spec — the only source for the exact required file shape |
| [mecanik.dev/en/posts/does-llms-txt-do-anything-yet](https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/) | Independent analysis synthesizing Originality.ai and Ahrefs server-log data | 2026 | The only measured consumption-side data found — publishing growth vs. request counts |
| [developers.cloudflare.com/docs-for-agents](https://developers.cloudflare.com/docs-for-agents/) | Official Cloudflare docs-for-agents landing page | Last updated 2026-06-24 | Primary vendor implementation reference; also the source of a rhetoric-drift finding (§ Contested) |
| [developers.cloudflare.com/fundamentals/reference/markdown-for-agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) | Cloudflare's Markdown-for-agents mechanism reference | 2026 | Confirms header names (`x-markdown-tokens`) and mechanism detail not on the landing page |
| [blog.cloudflare.com/markdown-for-agents](https://blog.cloudflare.com/markdown-for-agents/) | Cloudflare's own announcement blog post | 2026-02-12 | Primary, dated, gives the concrete 80%-reduction / per-tag token cost numbers |
| [vercel.com/docs/agent-resources](https://vercel.com/docs/agent-resources) | Official Vercel agent-resources docs page | Self-dated `last_updated: 2026-09-03` | Primary vendor implementation; the richest discovery-file set found (5 files) |
| [mintlify.com/blog/context-for-agents](https://www.mintlify.com/blog/context-for-agents) | Mintlify's own blog post on agent context delivery | 2026-01-29 | Primary source for the truncation-driven "instructions at the top" finding |
| [docs.stripe.com/payments.md](https://docs.stripe.com/payments.md) | A live Stripe docs page fetched as its Markdown twin | Fetched 2026-09-05 | Direct, primary confirmation the twin convention works in production, not just in a blog post |
| [laravel.com/docs/12.x/installation.md](https://laravel.com/docs/12.x/installation.md) | A live Laravel docs page fetched as its Markdown twin | Fetched 2026-09-05 | Second independent, primary confirmation; shows the twin is the raw pre-render source |
| [passo.uno/if-you-are-an-agent-read-this](https://passo.uno/if-you-are-an-agent-read-this/) | Fabrizio Ferri-Benedetti's controlled experiment on agent-directed prose | 2026 | Primary — the only found controlled test of whether "for agents" labeling changes model behavior |
| [passo.uno/tech-writing-role-split](https://passo.uno/tech-writing-role-split/) | Companion piece, purpose-vs-audience framing (cites Drew Breunig) | 2026-06-12 | Frames the dual-audience question as purpose-split rather than a labeling problem |
| [docs.gitlab.com/development/documentation/workflow](https://docs.gitlab.com/development/documentation/workflow/) | GitLab's documentation workflow, incl. AI-generated docs gating | current as of research | Cross-checked via exemplar-sites.md; the fleet's nearest real-world "docs quality gate is mechanical" analogue |
| [ux-observability-posture.md §4](../docs-audit/ux-observability-posture.md) | This program's own fleet audit, machine-readability table | 2026-09-05 | The fleet's measured baseline (0/9 llms.txt) that every recommendation above is checked against |
| [recent-shifts-and-tooling.md §§1-2](../docs-topic-map/recent-shifts-and-tooling.md) | This program's own scout report on llms.txt and agent-written docs | 2026-09-05 | First citation of the Cloudflare "31x"/"token tax" language, now used as the rhetoric-drift comparison point |
| [design-systems.md §2](../docs-topic-map/design-systems.md) | This program's own scout report, NN/g progressive-disclosure ceiling | 2026-09-05 | Supplies the human-side half of the progressive-disclosure conflict resolved in §4 |
