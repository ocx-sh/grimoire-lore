---
title: llms.txt spec, adoption, vendor patterns and Markdown-twin generator support, delta 2026-09-05 to 2026-11-27
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 24
---

# llms.txt and Markdown twins: delta update

This is a delta over `.agents/research/docs-machine-readers-and-prior-art/agent-readable-surface.md` (baseline 2026-09-05). Anything not listed as "changed" below is unchanged. Everything fetched on 2026-11-27 unless a source says otherwise. Two sources could not be fetched: the npm package page for vitepress-plugin-llms (HTTP 403, replaced by the npm registry JSON and the GitHub README and releases) and lib.rs for the mdBook crate (HTTP 403, replaced by the crates.io API).

## Verdict (decisions asked for)

1. **DOC-AGENT-01 may return to MUST by its own pinned condition, with two verification amendments.** One working twin configuration now exists on each of the three generators. I built all three on 2026-11-27 and each emitted per-page `.md` files plus `llms.txt` and `llms-full.txt`. Configurations are in "Findings 1". The condition is met on the letter. The honest caveat is plugin maturity: all three are third-party, single-maintainer plugins, and the mdBook one is 3 weeks old.
2. **The DOC-AGENT-04 awk still matches the spec.** llms.txt v2 (modified 2026-08-10, already in the baseline) did not change the H1, blockquote or H2 link-list shape. All three generators' `llms.txt` output passes the awk.
3. **The convergence statement still holds for formats.** `AGENTS.md`, `SKILL.md` skills and MCP remain three separate formats. One new fact: AGENTS.md is now stewarded by a Linux Foundation project. The date of that move could not be determined.

## Claims at risk, one by one

| Claim | Status | Detail |
|---|---|---|
| DOC-AGENT-04 awk shape (H1 first, blockquote before first H2, H2 link sections) | unchanged | The [llmstxt.org](https://llmstxt.org/) page, v2, Modified 2026-08-10, lists: optional BOM, H1 ("the only required section"), blockquote summary, zero or more non-heading sections, H2-delimited file lists with `[name](url)` plus optional `: notes`, and an "Optional" H2 by convention. The [changes page](https://llmstxt.org/changes.html) lists v2 changes: discovery links, `.md` URL forms, subpath llms.txt scope, removal of `llms_txt2ctx`, "Optional" loses mechanical meaning. None touches the shape. The [repository commit list](https://github.com/AnswerDotAI/llms-txt/commits/main) shows the v2 commits on 2026-08-10 and only tooling commits after (2026-09-24 "release", "fixes #161"). The page is silent on any change to the blockquote requirement, so I could not read a v1-to-v2 delta for it. Note the awk is stricter than the spec: the spec requires only the H1. |
| "97 percent of published llms.txt files logged zero requests in May 2026 (mecanik.dev)" | unchanged, source refined | The figure originates with Ahrefs, published 2026-06-15: [ahrefs.com/blog/llmstxt-study](https://ahrefs.com/blog/llmstxt-study/) (137K domains, May 2026). The mecanik.dev post is dated 2026-08-20 and only repeats it. No newer measurement found. Prefer citing Ahrefs as primary. |
| "Generic AI-crawler traffic is 1.1 percent of requests" | unchanged, caveat | Ahrefs gives 1.1 percent as AI retrieval bot share, but its own article is inconsistent about the base (table: share of total requests; body: share of AI bot requests). The baseline wording "of requests" is the table reading. |
| A major consumer states it reads llms.txt | unchanged, none found | Ahrefs: "no major AI platform has ever committed to reading it." Google's [AI features page](https://developers.google.com/search/docs/appearance/ai-features) says "You don't need to create new machine readable files, AI text files, or markup to appear in these features" and never names llms.txt. No OpenAI, Anthropic or Perplexity statement found. A Perplexity "uses it" claim exists only in SEO blogs with no primary source. Ahrefs logs show OpenAI, Anthropic (Claude-Code) and Googlebot fetching the file, which is fetching, not confirmed use. |
| DOC-AGENT-06 "5 of 15 to 15 of 15 (passo.uno, n=15)" | unchanged, no replication | [passo.uno post](https://passo.uno/if-you-are-an-agent-read-this/), dated 2026-08-17, carries no update note. It links a public repository `theletterf/benchmark-agent-instruct` for replication, but I found no independent replication. The author notes later variations all hit 100 percent, a ceiling. |
| DOC-AGENT-07 "reading agents truncate long pages (Mintlify, context-for-agents)" | unchanged | [Mintlify post](https://www.mintlify.com/blog/context-for-agents), dated 2026-01-29, no update note. Quote verified: "coding agents like Claude Code and Cursor often truncate or summarize long pages to preserve their own context window." |
| "Vercel layers five files on top of per-page twins" | unchanged, now countable | [Vercel agent resources](https://vercel.com/docs/agent-resources), `last_updated: 2026-11-14`, lists exactly five site-wide discovery files: `llms.txt`, `docs/llms-full.txt`, `docs/sitemap.md`, `docs/taxonomy.json`, `docs/graph.json`. It also serves per-page `.graph.md` cross-link maps and `Accept: text/markdown` or `.md` access. The "not read or costed" Not-studied item is now read; costing is still not done. |
| Out of scope: three formats have not converged | unchanged for formats | See "Findings 4". |
| "The twin has no measured implementation anywhere" | changed | Old: no measured implementation. New: three working generator configurations exist (Findings 1), and Cloudflare, Vercel and Mintlify all serve per-page twins. Still no published measurement of the twin's effect on agent success, so "measured" in the sense of an outcome study is still true. Reword to "no outcome measurement", not "no implementation". Source: builds on 2026-11-27 plus [Cloudflare docs-for-agents](https://developers.cloudflare.com/docs-for-agents/) (`dateModified` 2026-09-29: `/index.md`, `Accept: text/markdown`, `x-markdown-tokens` and `x-original-tokens` response headers). |
| Not studied: twin generation mechanics | changed | Closed for the three named generators. See Findings 1. |

## Findings

### 1. Per-generator twin configuration (decisive)

All three builds ran in a scratch directory on 2026-11-27 with a two-page site (`index.md`, `guides/setup.md`).

**MkDocs Material.** Tested: `mkdocs 1.6.1`, `mkdocs-material 9.8.2`, [`mkdocs-llms-source 1.2.0`](https://pypi.org/project/mkdocs-llms-source/) (released 2026-07-18, third-party, author TimChild).

```yaml
site_url: https://docs.example.com/   # required
theme: {name: material}
plugins:
  - search
  - llms-source
```

Result: `site/index.md`, `site/guides/setup.md`, `site/llms.txt`, `site/llms-full.txt`. It copies the source file verbatim (the `<details>` block survived with its text), so the DOC-AGENT-01 diff passes unchanged and the DOC-AGENT-03 collapse risk does not arise. `llms.txt` passes the awk. Optional `source_revision: true` stamps each twin with a `<!-- rev: sha -->` first line, a partial answer to the "twin drift" item. Alternatives: [`mkdocs-llmstxt-md 0.3.0`](https://pypi.org/project/mkdocs-llmstxt-md/) (2026-07-21) serves `page/index.md` beside the page rather than the source path, so the diff would not pass; [`mkdocs-llmstxt 0.5.1`](https://github.com/pawamoy/mkdocs-llmstxt) (2026-10-06) regenerates Markdown from rendered HTML and its README now says "maintenance mode", with the author moving to Zensical. Do not recommend the last one. Build warned that MkDocs 2 is a breaking change and pointed at Zensical, so the whole MkDocs line is in flux.

**VitePress.** Tested: `vitepress 1.6.4`, [`vitepress-plugin-llms 1.15.0`](https://registry.npmjs.org/vitepress-plugin-llms) (npm modified 2026-11-10). The project needs `"type": "module"` in `package.json`.

```ts
// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'
export default defineConfig({ vite: { plugins: [llmstxt()] } })
```

Result: `dist/guides/setup.md`, `dist/llms.txt`, `dist/llms-full.txt`, and v2 discovery links `<link rel="alternate" type="text/markdown">` and `<link rel="describedby">` in each page head (release [v1.14.0](https://github.com/okineadev/vitepress-plugin-llms/releases), 2026-09-11, "Implement llms.txt v2 standard support"). Two defects observed: (a) the home page `index.md` produced no twin (the [makeplane PR](https://github.com/okineadev/vitepress-plugin-llms) of 2026-04-22 noted the same); (b) the twin is regenerated, adds a `url:` frontmatter block, and dropped the entire text inside a raw `<details>` block (my test had `hidden text` inside `<details>` without blank lines). That makes DOC-AGENT-03 a live, reproducible failure here, not a hypothetical. `llms.txt` links are root-relative, not absolute. The awk passes.

**mdBook.** Tested: `mdbook 0.5.4`, [`mdbook-llms 0.4.1`](https://crates.io/crates/mdbook-llms) (first release 2026-11-06, 0.4.1 on 2026-11-25; prebuilt binaries on the GitHub release). It needs mdBook 0.5.

```toml
[output.html]
site-url = "/"

[output.llms]
```

Result in `book/html/`: `intro.md`, `guides/setup.md`, `llms.txt`, `llms-full.txt`, plus v2 discovery links in each HTML page (`discovery-links` defaults true). It writes from the preprocessed book and kept the `<details>` block intact. The DOC-AGENT-01 diff fails only because `SUMMARY.md` is not emitted, which is correct behaviour. The older [`mdbook-llms-txt-tools 0.1.1`](https://crates.io/crates/mdbook-llms-txt-tools) (2025-02-23) emits only llms.txt and llms-full.txt, no per-page twins, and is stale.

**Maturity warning.** The mdBook plugin is 3 weeks old and 0.x. Pin versions.

### 2. Adoption and consumption

Only one dataset exists: Ahrefs, 137K domains, 28 percent publish a file, about 38,000 valid files, 97 percent zero requests in May 2026, 96 percent of requests from bots, AI retrieval bots about 1 percent. SE Ranking's 300K-domain study found no link between llms.txt and citation frequency (reported secondhand by the Ahrefs-coverage search result, not opened). No post-baseline measurement was found.

### 3. Vendor patterns

Cloudflare, Vercel and Mintlify all serve per-page Markdown and an index. [Mintlify llmstxt docs](https://www.mintlify.com/docs/ai/llmstxt) add: generated `llms.txt` split under `/_llms/` above 100,000 characters, `.well-known/` copies, `rel="alternate"; type="text/markdown"` on HTML responses (the same signal as llms.txt v2), and `for="agents"` content filtering. Vercel's own `llms.txt` was flagged by a third-party audit as 167,660 characters, above the 100,000 truncation threshold (single snapshot, undated, low confidence).

### 4. Convergence

[AGENTS.md](https://agents.md/) now says it is "stewarded by the Agentic AI Foundation under the Linux Foundation" (date not determinable from the page; it has no changelog). The [Agent Skills specification](https://agentskills.io/specification) defines `SKILL.md` frontmatter and progressive disclosure, a different format from both AGENTS.md and llms.txt. It publishes its own `llms.txt`. Mintlify's response headers advertise an agent card and an agent skills index, so discovery channels are overlapping while formats are not merged. The "have not converged" sentence holds. Do not add "governance has converged".

## Normative guidance candidates

1. **Return DOC-AGENT-01 to MUST**, scoped to sites on MkDocs Material, VitePress or mdBook, naming these configurations: `llms-source` (mkdocs-llms-source), `vitepress-plugin-llms` via `vite.plugins`, `[output.llms]` (mdbook-llms). Rationale: the pinned return condition is met and the prior SHOULD rested only on "nobody has built it". Verification: build the site, then run the DOC-AGENT-01 diff with the amendments below. Risk to weigh: plugin maturity (see Findings 1). Owner decision, not mine.
2. **Amend the DOC-AGENT-01 diff** to ignore `SUMMARY.md` (mdBook never emits it) and, for VitePress, to accept a missing root `index.md` until the plugin emits it. Rationale: otherwise the MUST fails on correct builds. Verification: `diff <(find docs -name '*.md' ! -name SUMMARY.md ! -path docs/index.md -printf '%P\n') <(find "$OUT" -name '*.md' -printf '%P\n')` passes on the three test builds.
3. **Strengthen DOC-AGENT-03** to a SHOULD for VitePress sites, since the plugin drops raw `<details>` text. Rationale: reproduced on 2026-11-27. Verification: the existing DOC-AGENT-03 grep, then `grep -c '<inner text>' "$OUT/<page>.md"` returns 1 or more.
4. **Add a v2 discovery check** (CONSIDER): each built HTML page head carries `rel="alternate" type="text/markdown"` and `rel="describedby"`. Rationale: llms.txt v2 defines this so agents find twins without guessing, and VitePress and mdBook plugins emit it by default. Verification: `grep -l -E 'rel="alternate"[^>]*text/markdown|type="text/markdown"[^>]*rel="alternate"' "$OUT"/index.html` (the VitePress output orders attributes `href, rel, type`, so match the `text/markdown` token and the `rel="alternate"` token independently). MkDocs `llms-source` does not emit it, so this stays CONSIDER.
5. **Reword the "no measured implementation" sentences** in rules/docs-quality.md and machine-readers.md to "no outcome measurement of the twin exists", and cite 2026-11-27 builds. Verification: `grep -n "no measured implementation" rules/docs-quality.md skills/docs-quality-reference/machine-readers.md` returns nothing.
6. **Cite Ahrefs (2026-06-15) as primary** for the 97 percent and 1.1 percent figures, mecanik.dev as secondary. Verification: `grep -n "mecanik" skills/docs-quality-reference/machine-readers.md` shows both source names on DOC-AGENT-04 and DOC-AGENT-05.
7. **Keep the DOC-AGENT-04 awk.** It matches the spec and all three generators' output. Note in the rule that the spec requires only the H1, so the awk is intentionally stricter.

## AI-agent angle

- An agent will assume `mkdocs-llmstxt` is the standard MkDocs plugin (it ranks first in search). It is in maintenance mode and generates Markdown from HTML. Check: `grep -n "llmstxt:" mkdocs.yml` flags it.
- An agent will assume the VitePress twin equals the source. It is regenerated and can lose `<details>` text. Check: compare a collapsed block's inner text against the built `.md`.
- An agent will build an mdBook twin with `mdbook-llms-txt-tools` (the older, higher-ranked crate), which emits no per-page files. Check: `grep -n "llms-txt" book.toml`.
- An agent will write `llms.txt` with an absolute `https://` link per page and omit `site_url`. MkDocs plugins need `site_url`; mdBook's `site-url` prefixes links. Check: built `llms.txt` links resolve with `curl -s -o /dev/null -w '%{http_code}'`.

## Contested / evolving

- llms.txt v2 (2026-08-10) is days-old in plugin terms; VitePress adopted it on 2026-09-11, mdbook-llms on release. MkDocs plugins have not.
- MkDocs line is in flux (MkDocs 2 warning, Zensical, `mkdocs-llmstxt` maintenance mode). A twin configuration on MkDocs Material may need replacement within a year.
- Whether any AI vendor consumes llms.txt: no primary statement; Google's guide says no new files are needed. Trend: files are fetched, not shown to be read.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://llmstxt.org/ | Spec, v2 | Modified 2026-08-10 | Shape for the awk |
| https://llmstxt.org/changes.html | v1 to v2 changes | 2026-08 | Confirms shape unchanged |
| https://github.com/AnswerDotAI/llms-txt/commits/main | Spec repo history | to 2026-09-24 | No post-v2 spec commits |
| https://ahrefs.com/blog/llmstxt-study/ | 137K-domain study | 2026-06-15 | Primary for 97 and 1.1 percent |
| https://mecanik.dev/en/posts/does-llms-txt-do-anything-yet/ | Follow-up repeating Ahrefs | 2026-08-20 | Secondary |
| https://developers.google.com/search/docs/appearance/ai-features | Google AI features guide | undated | No new files needed |
| https://developers.cloudflare.com/docs-for-agents/ | Cloudflare twins | dateModified 2026-09-29 | Vendor pattern |
| https://vercel.com/docs/agent-resources | Vercel five discovery files | last_updated 2026-11-14 | Five-file claim |
| https://www.mintlify.com/blog/context-for-agents | Truncation statement | 2026-01-29 | DOC-AGENT-07 |
| https://www.mintlify.com/docs/ai/llmstxt | Mintlify llms.txt and twins | undated | Vendor pattern |
| https://passo.uno/if-you-are-an-agent-read-this/ | 5 of 15 to 15 of 15 | 2026-08-17 | DOC-AGENT-06, no replication |
| https://pypi.org/project/mkdocs-llms-source/ | MkDocs twin plugin | 1.2.0, 2026-07-18 | Working config |
| https://pypi.org/project/mkdocs-llmstxt-md/ | MkDocs alt plugin | 0.3.0, 2026-07-21 | Path mismatch |
| https://github.com/pawamoy/mkdocs-llmstxt | MkDocs HTML-regeneration plugin | 0.5.1, 2026-10-06 | Maintenance mode |
| https://registry.npmjs.org/vitepress-plugin-llms | VitePress plugin registry | 1.15.0, 2026-11-10 | Working config |
| https://github.com/okineadev/vitepress-plugin-llms/releases | Plugin releases | v1.14.0 2026-09-11 | v2 support |
| https://crates.io/crates/mdbook-llms | mdBook renderer | 0.4.1, 2026-11-25 | Working config |
| https://crates.io/crates/mdbook-llms-txt-tools | Older mdBook tool | 0.1.1, 2025-02-23 | No per-page twins |
| https://agents.md/ | AGENTS.md | undated | Stewardship |
| https://agentskills.io/specification | Agent Skills spec | undated | Distinct format |
