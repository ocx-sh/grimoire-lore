---
title: Messaging inventory of the OCX and Grimoire fleet
program: product (sub-program marketing, grounding wave)
worker: messaging-inventory
date_researched: 2026-11-27
model: sonnet
sources_fetched: 21
---

# Messaging inventory

Scope: 17 repositories (12 under `/home/mherwig/dev/ocx-sh`, 5 under `/home/mherwig/dev/grimoire-rs`; the `vscode` directory resolves to the remote `grimoire-rs/grimoire-vscode`). `sources_fetched` = 17 `gh repo view` calls, 3 live pages (grimoire.rs, lore.ocx.sh, index.grimoire.rs), and ogp.me. Local file reads are not counted. Paths below are relative to `/home/mherwig/dev`.

## Method

Every number is next to its command. Commands run from `/home/mherwig/dev`.

- Remote metadata: `gh repo view <owner>/<repo> --json description,repositoryTopics,homepageUrl,visibility` for the 17 repos. All 17 resolve and are PUBLIC.
- Headline text corpus, `bash text.sh` (script held in the session scratchpad, reproduced here):
  `for r in ocx-sh/*/README.md grimoire-rs/*/README.md; do echo "### $r"; head -30 $r; done` followed by `cat` of 14 landing and index files: `ocx-sh/website/site/src/components/Landing.astro`, `.../landing-content.ts`, `ocx-sh/website/site/src/content/docs/index.mdx`, `grimoire-rs/grimoire/docs/src/pages/index.astro`, `.../data/landing.ts`, `.../content/docs/introduction.md`, `ocx-sh/ocx/website/src/content/docs/index.mdx`, `ocx-sh/www-setup/site/src/content/docs/index.mdx`, `ocx-sh/devcontainer-features/site/src/content/docs/index.md`, `ocx-sh/rules_ocx/docs/index.md`, `ocx-sh/catalog/docs/src/content/docs/index.mdx`, `ocx-sh/ocx-mirror/docs/index.md`, `ocx-sh/indexbot/docs/index.md`, `grimoire-rs/indexer/docs/index.md`. Result: `bash text.sh | wc -l` gives 1744 lines. "The corpus" below means this.
- Adjective count: `bash text.sh | grep -i -o -w -E "fast|faster|fastest|simple|simply|simplest|blazing|blazingly|powerful|seamless|seamlessly|effortless|effortlessly|robust|lightweight|modern|easy|easily|best|reliable|secure|scalable|instantly|instant|automation-first|cross-platform|zero|clean|reproducible|deterministic" | tr A-Z a-z | sort | uniq -c | sort -rn`. Hits are then read line by line with `awk` (file:line below), because a count without the line misleads.
- Description coverage: `find <docs dir> \( -name '*.md' -o -name '*.mdx' \) | wc -l` against `... | xargs grep -l -m1 -E '^description:' | wc -l`.
- Built heads: `grep -o -E '<title>...|<meta (name|property)="(description|og:*|twitter:*)" ...' <dist>/index.html`, and `curl -sL -A Mozilla/5.0 <url>` for live pages.
- Competitor mentions: `bash text.sh | grep -i -o -w -E "homebrew|brew|asdf|mise|nix|aqua|scoop|winget|chocolatey|apt|npm|pip|cargo|docker|conda|nvm|..."`, then read.

Limits of the measurement: the corpus reads the first 30 lines of each README, not whole READMEs. `ocx.sh` could not be fetched live (see Open Graph section), so the ocx.sh head comes from `ocx-sh/website/site/dist/index.html` (mtime 2026-11-16, `ls -la --time-style=long-iso`).

## 1. Repository metadata (GitHub)

Command: the `gh repo view` loop above.

| Repo | GitHub description | Homepage | Topics |
|---|---|---|---|
| ocx-sh/ocx | "A fast, cross-platform binary package manager built on OCI registries. Turn Docker Hub, GHCR, or any OCI-compliant registry into a binary distribution platform — zero extra infrastructure" (187 chars) | https://ocx.sh | 13 |
| grimoire-rs/grimoire | "Package manager for AI-agent config. grim installs, updates, and publishes skills, rules, agents, MCP servers, and bundles into Claude Code, Copilot, Cursor, Codex, Gemini, Zed, Amp, Kiro, Junie, and opencode — pinned by digest in a lockfile. Storage is any OCI registry; there is no service to run." (299 chars) | https://grimoire.rs | 20 |
| grimoire-rs/grimoire-vscode | "VS Code marketplace UI for grim — the OCI package manager for AI artifacts (skills, rules, agents, MCP servers, bundles)." | https://grimoire.rs | 20 |
| grimoire-rs/grim-gui | "Desktop application for Grimoire, built with Tauri 2. Runs as grim gui." | https://grimoire.rs | 0 |
| grimoire-rs/grim-mirror | "grim plugin that republishes AI-agent config from upstream git repositories as Grimoire packages. Runs as grim mirror." | https://grimoire.rs | 0 |
| grimoire-rs/indexer | "Run your own grim package index — renderer, contribution gate and scaffolder, published as @grimoire-rs/indexer" | none | 0 |
| ocx-sh/catalog | "OCX catalog renderer — VitePress-based site generator for OCI-backed package indices" | none | 0 |
| ocx-sh/conventions | "Shared project baseline for the OCX ecosystem: copier template, Renovate preset, setup action, drift checker and adopt skill" | none | 0 |
| ocx-sh/e2e-index | "End-to-end test fixture for the OCX index: publishers, ingest gate, catalog signing. Not the real index." | none | 0 |
| ocx-sh/grimoire-lore | "OCX lore — skills, rules and agents for AI coding agents, plus the grim package index that lists them. Served at lore.ocx.sh." | none | 0 |
| ocx-sh/index | "OCX public package index — sparse index + namespace governance for ocx.rs" | https://index.ocx.sh | 0 |
| ocx-sh/indexbot | "Write path for an OCX package index - announce, reconcile, validate, render" | https://ocx-sh.github.io/indexbot/ | 0 |
| ocx-sh/ocx-mirror | "Mirror upstream tool releases into OCI registries as OCX packages" | none | 0 |
| ocx-sh/website | "@ocx-sh/theme (Astro + Starlight theme), the ocx.sh root site and the shared Bunny deploy action" | https://ocx.sh | 0 |
| ocx-sh/rules_ocx | empty | https://ocx-sh.github.io/rules_ocx/ | 0 |
| ocx-sh/devcontainer-features | empty | none | 0 |
| ocx-sh/www-setup | empty | none | 0 |

Counts (from the table, same command): description empty in 3 of 17; topics set in 3 of 17 (ocx, grimoire, grimoire-vscode), none in 14; homepage empty in 8 of 17 (catalog, conventions, devcontainer-features, e2e-index, grimoire-lore, indexer, ocx-mirror, www-setup).

Contradictions inside this layer:
- `ocx-sh/catalog` GitHub description says "VitePress-based"; its own README (`ocx-sh/catalog/README.md:3`) says "Astro-based" and its package.json says "Static Astro catalog renderer" (`ocx-sh/catalog/package.json:4`). The GitHub description is the outlier and is wrong against the code.
- `ocx-sh/index` description says "for ocx.rs"; the same repo's README says the index is served at https://index.ocx.sh (`ocx-sh/index/README.md:3-4`) and the homepage field says index.ocx.sh. Two domains for one product.
- `grimoire-rs/grimoire` GitHub description lists 5 artifact types; `grimoire-rs/indexer/docs/index.md:4-6` and `grimoire-rs/indexer/src/config.ts:187-190` list 8 (adds hooks, settings, mods). The vscode GitHub description lists 5, the vscode package.json lists 8 (`grimoire-rs/vscode/package.json:4`).

## 2. Product: ocx

### Every one-line description found

| # | Surface | Verbatim | file:line |
|---|---|---|---|
| 1 | GitHub description | "A fast, cross-platform binary package manager built on OCI registries. Turn Docker Hub, GHCR, or any OCI-compliant registry into a binary distribution platform — zero extra infrastructure" | remote |
| 2 | Cargo description | "The simple package manager" | `ocx-sh/ocx/Cargo.toml:19` |
| 3 | README tagline | "The Simple Package Manager" | `ocx-sh/ocx/README.md:7` |
| 4 | README first paragraph | "Install pre-built binaries with a single command, switch versions instantly, and run with clean environments. Designed as a backend for GitHub Actions, Bazel rules, and CI/CD pipelines." | `ocx-sh/ocx/README.md:16` |
| 5 | ocx.sh HTML title | "ocx: The Simple Package Manager" | `ocx-sh/website/site/src/content/docs/index.mdx:2` |
| 6 | ocx.sh meta description, og:description | "Turn any OCI registry into a cross-platform binary distribution platform. Zero extra infrastructure." (100 chars) | `ocx-sh/website/site/src/content/docs/index.mdx:3` |
| 7 | ocx.sh hero h1 | "Same tools. Every machine." | `ocx-sh/website/site/src/components/Landing.astro:39-41` |
| 8 | ocx.sh hero subhead | "ocx.toml lists your tools; ocx.lock pins each to a digest. Laptops and CI on Linux, macOS and Windows run the same version, served from the registry you already run." | `Landing.astro:44-45` |
| 9 | ocx.sh closing CTA h2 | "Pin once. Run everywhere." | `Landing.astro:144-146` |
| 10 | docs-site config description | "the simple package manager" | `ocx-sh/ocx/website/astro.config.mjs:44` |
| 11 | docs landing title and description | "Get started with OCX" / "Install OCX, run one tool or declare a set of tools in ocx.toml, then find the guide for what you do next." | `ocx-sh/ocx/website/src/content/docs/index.mdx:2-3` |
| 12 | docs landing first sentence | "OCX fetches pre-built tools from any OCI registry and runs them in a clean, reproducible environment." | `ocx-sh/ocx/website/src/content/docs/index.mdx:8` |
| 13 | rules_ocx and index README | "the OCI-backed package manager" | `ocx-sh/rules_ocx/README.md:5`, `ocx-sh/index/README.md:5` |

Count: 13 rows; rows #2, #3 and #10 are the same wording up to capitalisation, so 11 distinct strings.

### Contradictions on category, audience, benefit

- Category, three incompatible labels: "package manager" (#2, #3, #5, #10, #13), "binary distribution platform" (#1, #6), toolchain pinning (#7, #8, #9, #11). The hero (#7-#9) never says "package manager". The title that frames the same page (#5) does.
- Benefit, four different lead claims: simple (#2, #3, #5, #10), fast (#1 only), zero infrastructure (#1, #6), reproducible identical versions (#7, #8, #12). The page title promises "Simple"; the hero promises sameness across machines. `ocx-sh/website/site/src/components/Landing.astro:157` then qualifies the product: "ocx is in early development. The CLI is functional but APIs may change."
- Audience: never named. #4 implies CI/CD systems ("a backend for GitHub Actions, Bazel rules, and CI/CD pipelines"), #8 implies people with laptops and CI, #6 and #1 imply registry operators who distribute binaries. The word "developer" does not occur in any of the 13 (`grep -c -i developer` on the strings is 0; the word appears only in GitHub topic `developer-tools`).
- Direction of flow: #1 and #6 describe publishing (turning a registry into a distribution platform). #7 and #8 describe consuming (same tools on every machine). One product, two buyers, one sentence each, never joined.

### Competitors and alternatives named

Command: `bash text.sh | grep -i -o -w -E "homebrew|brew|asdf|mise|..."` plus the file reads below.

- The ocx.sh landing names the incumbent routes as a proof section, "the drift": `apt-get install nodejs` on Ubuntu 24.04 gives "Node 18 · end of life since 2025", the same on Debian 13 gives Node 20, `brew install node` gives Node 26, `winget install OpenJS.NodeJS.LTS` gives Node 26, and `nvm install` is "per shell, from .nvmrc · no Windows" (`ocx-sh/website/site/src/components/landing-content.ts:14-18`). The file header dates every row 2026-11-08 and lists the source pages (`landing-content.ts:9-11`) and states that every command was run against ocx 0.6.5 on 2026-11-09 and "no timing or size is claimed" (`landing-content.ts:3`). This is the only dated, sourced comparison on any fleet surface.
- Docs pages name mise and direnv as design references, not as competitors (`grep -rn -i -w mise ocx-sh/ocx/website/src/content/docs` returns lines 31, 129 and 183 of one explanation page, which compares env-diff and config-hierarchy designs; the roadmap table lists "mise backend plugin | Planned").
- The headline surfaces (README first 30 lines, GitHub description, meta description) name no competitor: 0 hits for homebrew, asdf, mise, aqua, devbox in them.

### Unsupported superlatives and unquantified claims (ocx)

Hits from the adjective command, then read: "Simple" 2 in the corpus (`README.md:7`, `index.mdx:2`) plus 2 outside it (`Cargo.toml:19`, `astro.config.mjs:44`) = 4; "fast" 1 (GitHub description, outside the corpus; the corpus hit at `ocx-sh/ocx-mirror/README.md:30` is a task-runner comment, not a claim); "instantly" 1 (`README.md:16`); "zero extra infrastructure" 2 (GitHub description, `index.mdx:3`); "clean" as a benefit 3 (`README.md:16`, `Landing.astro:112`, `ocx/website/.../index.mdx:8`); "Automation-first" 1 (`Landing.astro:110`). Total: 12 unquantified claims.

Proof beside them: "fast" has 0 measurements anywhere. `grep -rli -E "benchmark|hyperfine|faster"` over the ocx docs and README matches one file, `guides/project-toolchain.mdx`, where `hyperfine` is an example tool being run (lines 365-384), not a measurement of ocx. "Simple" has no definition (no step count, no line count). The claims that do carry proof: "Laptops and CI ... run the same version" (`Landing.astro:44`) is backed by the dated drift table; "ocx never runs package code at install" (`Landing.astro:129`) is a testable behaviour; "Pin once. Run everywhere." is a mechanism claim. Of the 12 unquantified claims, 0 have a number or a proof beside them; the 3 proof-backed claims on the landing (same version everywhere, never runs package code at install, pin once) are mechanism claims, not adjectives.

## 3. Product: grimoire (grim)

### Every one-line description found

| # | Surface | Verbatim | file:line |
|---|---|---|---|
| 1 | Cargo description, README bold line, introduction, site meta description, og:description | "Package manager for AI-agent config — skills, rules, agents, and MCP servers, installed into every coding agent you use" (119 chars) | `grimoire-rs/grimoire/Cargo.toml:21`; `README.md:7-8`; `docs/src/pages/index.astro:37-38`; live `<meta name="description">` |
| 2 | GitHub description | long form, 299 chars, names 10 clients and "pinned by digest in a lockfile" | remote |
| 3 | README paragraph 1 | "Declare a skill once and `grim` writes it into Claude Code, Copilot, Cursor, Codex, Gemini, Zed, Amp, Kiro, Junie, and opencode — each in the format that client actually reads, pinned by digest in a lockfile. Storage is any OCI registry — GHCR, Docker Hub, or your own. There is no Grimoire service to sign up for." | `grimoire-rs/grimoire/README.md:17-21` |
| 4 | Site HTML title, og:title | "Grimoire — a lockfile for your AI-agent config" | `docs/src/pages/index.astro:45-46,57` |
| 5 | Site hero h1 | "A lockfile for your AI-agent config." | `index.astro:77` |
| 6 | Site hero subhead | "Skills, rules, agents and MCP servers — declared once, pinned by digest, written into each coding agent in the format it actually reads. Storage is any OCI registry. There is no Grimoire service." | `index.astro:78-81` |
| 7 | Introduction page meta description | "Grimoire is a package manager for AI-agent configuration, distributed through standard OCI registries." | `docs/src/content/docs/introduction.md:3` |
| 8 | VS Code extension | "Marketplace for AI artifacts — search, install, and manage grim skills, rules, agents, MCP servers, bundles, hooks, settings, and mods." | `grimoire-rs/vscode/package.json:4` |
| 9 | VS Code README | "A marketplace UI for grim — the OCI-backed package manager for AI artifacts" | `grimoire-rs/vscode/README.md:7-9` |
| 10 | Live index.grimoire.rs meta description | "Browse and search AI-config packages (skills, rules, agents, MCP servers and bundles), installable with the grim package manager." | live, `curl -sL https://index.grimoire.rs/` |
| 11 | Indexer default tagline | "Skills, rules, agents, MCP servers, bundles, hooks, settings, and mods for AI coding agents, hosted on OCI registries." | `grimoire-rs/indexer/src/config.ts:189-190` |

Distinct: 11 surfaces, 8 distinct strings for the one product (#1 repeats across 5 places).

### Contradictions

- Naming of the object: "AI-agent config" (#1, #3, #4, #5, #7), "AI artifacts" (#2 vscode, #8, #9), "AI-config packages" (#10), "AI coding agents" content (#11). Three nouns for the same thing on one product family; the vscode surface, which is the one nearest a stranger browsing a marketplace, uses the vaguest.
- Category: "package manager" (#1, #7, #9, #10) vs "a lockfile" (#4, #5). The title and h1 sell the lockfile mechanism; every other surface sells the package manager. The lockfile phrase appears on 3 of the 11 surfaces.
- Scope of the claim: "every coding agent you use" (`introduction.md:9`, `README.md:8`, `Cargo.toml:21`) is a universal claim; the same README says grim "says so and skips" a client with no honest surface (`README.md:23-24`), and names 10 clients. "Every" is therefore a claim the README itself limits.
- Artifact type list: 4 types in the headline (skills, rules, agents, MCP servers), 5 in the GitHub description (adds bundles), 8 in the indexer and vscode manifest (adds hooks, settings, mods). Capitalisation also drifts: "mcp servers" lowercase in `ocx-sh/grimoire-lore/README.md:3-5` and `grimoire-rs/indexer/README.md:4-5`.
- Audience: not named on any headline surface. "you" is a person who uses coding agents (#1), "your team" appears only in `docs/src/data/landing.ts:26` (tile blurb) and the router card "the catalog shows everything from every registry; my team should see only ours" (`landing.ts:52`). The landing router (`landing.ts:35-76`) states 8 pains in the reader's own words, which is the only audience-shaped copy in the fleet.
- Status contradiction: README says "stabilizing toward 1.0 — released surfaces are frozen contracts" (`README.md:27-28`); the vscode README and indexer say pre-1.0 / experimental (`indexer/docs/index.md:44`, `vscode/README.md:13`). Consistent, but only the grimoire landing hero does not carry the status at all (0 hits for "1.0" in `index.astro`).

### Competitors and alternatives named

0 named. `grep -rn -i -E "skills\.sh|npx skills|vercel|apm\b|chezmoi|stow" grimoire-rs/grimoire/docs/src/content/docs grimoire-rs/grimoire/README.md` returns nothing relevant. The pain router names the alternative implicitly ("the same skill ... has to live in .claude, .cursor and .agents and drifts", `landing.ts:37`; "a sync tool rewrote the file I edited", `landing.ts:57`) without a product name. The only sibling mention is `grimoire-rs/grimoire/docs/src/content/docs/installation.md:15`, which says ocx has "the same idea as Grimoire, applied to executables instead of agent config".

### Unsupported superlatives and unquantified claims (grimoire)

Adjective command: 0 hits for fast, simple, powerful, seamless, blazing, easy, best, reliable, secure, modern, robust anywhere in the grimoire headline surfaces. Claims present: "every coding agent you use" (3 places, universal quantifier), "the format that client actually reads" (4 places, an unmeasured contrast with other tools), "There is no Grimoire service to sign up for" / "there is no service to run" (a checkable absence; the privacy page backs it, `docs/public/privacy.html:55`: "no cookies, no analytics, no third-party resources"). Proof beside claims: 10 clients named by name (`README.md:17-19`); "real grim, real registry" label on the demo (`index.astro:93`) with a recorded `/demo.cast`; "pinned by digest" is a mechanism. Quantified claim count: 1 number-bearing claim (10 clients) in headline surfaces.

## 4. Other products

| Product | Distinct one-liners | Sources | Notes |
|---|---|---|---|
| grim-gui | 4 | GitHub "Desktop application for Grimoire, built with Tauri 2. Runs as grim gui."; `src-tauri/Cargo.toml:6` "Desktop front end of grim"; `README.md:5-7` "The desktop shell of Grimoire"; `index.html:7` `<title>grim-gui</title>` with no meta description (`grep -n "description" grimoire-rs/grim-gui/index.html` returns nothing) | Three nouns for one thing: application, front end, shell. README states "Status: skeleton" (`README.md:9`) while GitHub homepage points to grimoire.rs. |
| grim-mirror | 3 | GitHub "grim plugin that republishes AI-agent config from upstream git repositories..."; `crates/grim-mirror/Cargo.toml:6` "Mirror upstream git repositories and Claude plugin marketplaces as grim artifacts"; `README.md:5-8` "Republishes skills, rules, agents and bundles from git repositories and Claude plugin marketplaces into an OCI registry" | Names "Claude plugin marketplaces" as source in 2 of 3; the GitHub description omits it. README says "Unstable. Source only, no releases" (`README.md:10`). |
| indexer | 4 | `package.json:4` "CLI + Astro integration for running your own grim package index"; GitHub "Run your own grim package index — renderer, contribution gate and scaffolder"; `README.md:3-5`; `docs/index.md:3-6` | Titles differ: README `# grim-indexer`, docs `# Grimoire Indexer`, package `@grimoire-rs/indexer`. Only 1 of 23 doc pages has a `description:` (see section 6). |
| vscode | 3 | see grimoire table #8, #9, GitHub | "Grimoire Marketplace" is the displayName (`package.json:3`); repo name is grimoire-vscode; README H1 is "Grimoire for VS Code" (`README.md` line 5). Three names. |
| catalog | 4 | GitHub "VitePress-based site generator"; `package.json:4` "Static Astro catalog renderer for OCX package indices (OCI-backed)"; `README.md:3-7` "Astro-based static site generator"; `docs/astro.config.mjs:17` "Render one or more OCX package indices into a browsable static catalog site." | GitHub description contradicts the other three on the tool; docs-site title "OCX Catalog" vs README `# @ocx-sh/catalog`. |
| ocx-mirror | 3 | `Cargo.toml:3` and GitHub "Mirror upstream tool releases into OCI registries as OCX packages"; `README.md:9-12`; `docs/index.md:1-5` opens with a problem statement ("Upstream projects publish their releases as loose archives ... hoping nobody published a broken ..."). | Best problem-first opening in the fleet. |
| indexbot | 3 | `pyproject.toml:4` "Write path for an OCX package index — announce, reconcile, validate, render."; README and docs 'The write path for an OCX package index.'; GitHub same | Consistent. Jargon: "write path", "announce", "reconcile" undefined on the first line. |
| rules_ocx | 3 | `site/astro.config.mjs:15` "Bazel module extension that provisions development tools through OCX."; `README.md:4-7`; `docs/index.md:5` "provisions pinned CLI tools, such as jq or shellcheck, as runnable targets" | GitHub description empty. |
| www-setup | 2 | `README.md:7` "Canonical hosting for the OCX installer scripts."; `site/astro.config.mjs:31` "Install OCX with one command in bash, PowerShell, Nushell, fish or Elvish, and configure, pin and mirror the installers." | GitHub description empty; README titled `setup.ocx.sh`, docs titled "Install OCX". |
| devcontainer-features | 2 | `README.md:5` and `site/.../index.md:3-4` | The only repo that names an audience: "It is for developers who work in dev containers or Codespaces, and for platform teams that standardise those containers" (`README.md:6`). |
| website | 2 | GitHub and `README.md:5` "Shared theme library (`@ocx-sh/theme`), root site and deploy action"; `ocx-sh/website/packages/theme/package.json:4` | Internal-facing; not a product. |
| grimoire-lore | 4 | GitHub "OCX lore — skills, rules and agents for AI coding agents, plus the grim package index that lists them. Served at lore.ocx.sh."; `README.md:3-5`; `package.json:5` "OCX lore, a Grimoire package index."; live `<meta name="description">` identical to the package.json string | Live lore.ocx.sh title "OCX lore" and description "OCX lore, a Grimoire package index." tell a visitor nothing about contents. The repo is the catalog this research feeds, and its own head metadata is the weakest in the fleet. |
| index (ocx-sh) | 3 | GitHub, `README.md:3-5`, `catalog.config.json:10` "Package catalog and wire-format docs for the OCX public index (index.ocx.sh)." | See domain contradiction in section 1. |
| conventions, e2e-index | 1 each | README and GitHub | Internal. e2e-index states "Not the real index." (`README.md:3`), a good disambiguation. |

Total distinct one-line descriptions across the 17 repos (per product above: ocx 11, grimoire 8, grim-gui 4, grim-mirror 3, indexer 4, vscode 3, catalog 4, ocx-mirror 3, indexbot 3, rules_ocx 3, www-setup 2, devcontainer-features 2, website 2, lore 4, index 3, conventions 1, e2e-index 1 = 61 distinct strings for 17 repos (3.6 per repo; 1 to 11 per product).

## 5. Open Graph, Twitter card and HTML heads

Commands: `grep -o -E '<title>...|<meta ...' <dist>/index.html`; `curl -sL -A "Mozilla/5.0" <url>` for grimoire.rs, lore.ocx.sh, index.grimoire.rs; `grep -rln -E "og:title|twitter:|og:description|og:image" ocx-sh grimoire-rs --exclude-dir={node_modules,target,dist,.git,.astro}` (23 files, all in `grimoire-rs/grimoire/docs`, `grimoire-rs/indexer`, `ocx-sh/catalog`, plus plans and research notes).

| Page | title | og:title | og:type | og:image | twitter:card |
|---|---|---|---|---|---|
| grimoire.rs (live) | "Grimoire — a lockfile for your AI-agent config" | same | website | https://grimoire.rs/og-card.png | summary_large_image |
| grimoire.rs/start.html and privacy.html | "Run your own index — Grimoire", "Privacy — Grimoire" | same | article | og-card.png | summary_large_image (`docs/public/start.html:38-46`, `privacy.html:54-66`) |
| ocx.sh landing (built `dist`, 2026-11-16) | "ocx: The Simple Package Manager \| ocx" | "ocx: The Simple Package Manager" | article | none | summary_large_image |
| devcontainer-features site (built `dist`) | "Use ocx in a dev container \| ocx Dev Container Feature" | "Use ocx in a dev container" | article | none | summary_large_image |
| lore.ocx.sh (live) | "OCX lore" | "OCX lore" | none emitted | "/logo.svg" (relative) | summary |
| index.grimoire.rs (live) | "Grimoire" | "Grimoire" | none emitted | "/logo.svg" (relative) | summary |

Findings:
- The ocx.sh landing declares `twitter:card` = `summary_large_image` with no `og:image` and no `twitter:image` (0 image tags in the built head). A large-image card with no image is a configuration contradiction inside the page. `og:type` is `article` on the product landing; grimoire.rs overrides this to `website` and says why in a comment (`index.astro:52-56`), so the fleet has one site that fixed it and one that did not.
- `og:image` is set on 1 of 3 site families (grimoire.rs). For the other two (ocx.sh, devcontainer-features) the shared Starlight head emits none; the ocx sites' configs contain 0 matches for `og:image` (`grep -rn "og:image" ocx-sh/website ocx-sh/ocx/website`, no output).
- The Open Graph protocol examples use absolute image URLs and the page says nothing about relative ones (https://ogp.me/, fetched 2026-11-27). Two live index sites emit a relative `/logo.svg`. Whether a given crawler resolves it is not stated by the protocol.
- The live `ocx.sh` could not be inspected: `curl -sS -I https://ocx.sh/` fails with "SSL: no alternative certificate subject name matches target host name 'ocx.sh'" (curl exit 60); `getent hosts ocx.sh` resolves to 2a01:4f9:6a:5183::2. The website README says the "ocx.sh cutover" is in progress (`ocx-sh/website/README.md:7`). Treat the ocx.sh head as source-derived, not observed. `index.ocx.sh` redirected 301 to `https://ocx.sh/catalog/`, `setup.ocx.sh` 302 to `https://ocx.sh/install/` (`curl -sL -w "%{http_code} %{url_effective}"`);
- Page-level meta description is both the SERP text and the OG text everywhere: no site supplies a separate social description (0 sites where `og:description` differs from `description`).

### Description coverage per docs site

Commands in Method. Pages with `description:` / pages:

| Site | With description | Pages |
|---|---|---|
| `ocx-sh/website/site` | 5 | 5 |
| `ocx-sh/ocx/website` | 80 | 116 |
| `ocx-sh/catalog/docs` | 0 | 24 |
| `ocx-sh/www-setup/site` | 7 | 7 |
| `ocx-sh/devcontainer-features/site` | 22 | 22 |
| `ocx-sh/rules_ocx/docs` (ported to site by `scripts/port-docs.mjs`) | 0 | 12 |
| `grimoire-rs/grimoire/docs` | 45 | 45 |
| `ocx-sh/ocx-mirror/docs` | 0 | 10 |
| `ocx-sh/indexbot/docs` | 0 | 9 |
| `grimoire-rs/indexer/docs` | 1 | 23 |

Total 160 of 273 (59%). Sites with 100% coverage: 4 of 10; with 0%: 4 of 10. Caveat: pages without a frontmatter description may get one at build (Starlight or a port script); `ocx-sh/ocx/website` 116 pages includes generated reference files. The two MkDocs sites and catalog/rules_ocx sources were not built, so their live heads were not read.

## 6. Audience, claims with proof, summary counts

| Measurement | Count | Command |
|---|---|---|
| Repos that state who the product is for on a headline surface | 1 of 17 (devcontainer-features, `README.md:6`) | `grep -n -i -E "is for|for (developers|teams|engineers)" ocx-sh/*/README.md grimoire-rs/*/README.md` |
| Named competitors on headline surfaces, ocx | 0; on the landing proof table 4 (apt, brew, winget, nvm) | `landing-content.ts:14-18` |
| Named competitors on headline surfaces, grimoire | 0 | grep above |
| Unquantified benefit adjectives, ocx | 12 | section 2 |
| Unquantified benefit adjectives, grimoire | 0 (but 3 universal claims) | section 3 |
| Claims with a number or dated proof, ocx landing | 5 drift rows with dates and sources, plus "run against ocx 0.6.5" | `landing-content.ts:3,9-18` |
| Claims with a number, grimoire | 1 (10 clients) | `README.md:17-19` |
| Status caveat next to a "Simple" or "stable" headline | ocx: yes, in a footnote `<p>` (`Landing.astro:157`); grimoire: README yes (`README.md:27`), landing hero no | `grep -n -i "early development\|stabilizing" ...` |

## Smells

Ranked by how much an agent following the current text would be misled or would copy a defect.

1. ocx has 11 distinct one-line descriptions that disagree on category (package manager vs distribution platform vs toolchain pinner), benefit (simple vs fast vs zero infrastructure vs same everywhere) and direction (publish vs consume). No single sentence is the source for the rest. Evidence: section 2, table rows 1-13.
2. "Simple" and "fast" carry the ocx brand with no definition and no measurement: 4 "simple" strings (`Cargo.toml:19`, `README.md:7`, `index.mdx:2`, `astro.config.mjs:44`), 1 "fast" (GitHub), 0 benchmarks in docs. The landing hero abandoned both and sells sameness; the title and package metadata did not follow.
3. No headline surface names its audience in 16 of 17 repos. The one that does (`devcontainer-features/README.md:6`) shows the pattern costs one sentence.
4. The same Grimoire thing has three nouns (config, artifacts, config packages) and a 4/5/8-item type list depending on the surface (`Cargo.toml:21`, `package.json:4`, `config.ts:187-190`).
5. Social cards are inconsistent: ocx.sh and devcontainer-features pair `summary_large_image` with no image and `og:type=article` on a product landing; two live index sites emit a relative `/logo.svg`; 1 of 3 site families sets `og:image`.
6. Stale or wrong remote metadata: catalog says VitePress where the code is Astro; index says "ocx.rs" where the live domain is index.ocx.sh; 3 repos have an empty description; 14 of 17 have no topics; 8 of 17 have no homepage.
7. Status is hidden on the hero: grim-gui is "skeleton" (`README.md:9`), grim-mirror "Unstable. Source only", indexbot "Pre-release", ocx "early development" only in a closing footnote; grimoire hero silent on 1.0. A visitor or agent reading the tagline alone gets no maturity signal.
8. Live index sites' head metadata says nothing about contents: lore.ocx.sh "OCX lore, a Grimoire package index." (35 chars).
9. 4 of 10 docs sites have 0 page descriptions (catalog, rules_ocx source, ocx-mirror, indexbot) and indexer has 1 of 23.
10. No competitor or alternative named on any grimoire surface; ocx names them only inside the landing's proof table.

## Patterns worth encoding

Each is checkable by a command.

1. One canonical sentence per product, reused verbatim. Grimoire already does it for 5 places (`Cargo.toml:21`, `README.md:7-8`, `index.astro:37-38`, `introduction.md:9`, live meta). Check: `grep -rF "<canonical>"` across the manifest description, README tagline, meta description and GitHub description; count must equal the number of surfaces.
2. A dated, sourced proof table next to a comparison claim, with a header comment that lists source URLs, run date, tool version and "no timing or size is claimed" (`landing-content.ts:3-11`). Check: every comparison table row has a date and a source in an adjacent comment.
3. Problem-first opening (ocx-mirror `docs/index.md:1-5`) and a reader-phrased pain list (`landing.ts:35-76`). Check: the first paragraph of the README names the pain or the job before the mechanism.
4. Audience sentence in the first 10 lines of a README (`devcontainer-features/README.md:6`). Check: a regex for "for <role>" or "is for" within `head -10`.
5. Status line directly under the title (`grim-gui/README.md:9`, `grim-mirror/README.md:10`, `grimoire/README.md:27`). Check: `grep -n -i "status" README.md | head -1` within the first 15 lines.
6. A disambiguation line for lookalike repos ("Not the real index.", `e2e-index/README.md:3`).
7. Landing `og:type` override with the reason in a comment (`index.astro:52-56`) and an absolute `og:image` on the site root. Check: built head has `og:image` starting with `https://` and `og:type=website` on the landing.
8. Abstain from adjectives: grimoire headline surfaces have 0 of the 20-adjective list. Check: the adjective grep above returns nothing for marketing-copy edits.
9. A numeric or named-list claim beside every universal ("every agent"): 10 named clients (`README.md:17-19`).
10. Every page has a description: 100% on 4 sites; a build check is a `grep -L` over content files.

## What this contradicts in the frame

- The frame says the fleet "has no marketing surface worth measuring beyond READMEs" as a falsifier. It does: 2 landing pages with a hero, subhead, CTA and proof section (ocx.sh `Landing.astro`, grimoire.rs `index.astro`), 3 live sites with Open Graph tags, 61 distinct one-line descriptions, 160 page descriptions. The fleet is measurable as a messaging corpus; the falsifier does not fire.
- The frame lists `ocx-sh/website/site` and `ocx-sh/ocx/website` as separate Astro sites. They carry two different positionings of the same product (landing "Same tools. Every machine." vs docs landing "Get started with OCX" with "the simple package manager" in config). A single-product message hierarchy is the gap, not a missing site.
- The frame lists `grimoire-rs/indexer` as MkDocs only. It has `mkdocs.yml` for its docs and also an Astro renderer (`src/renderer/astro/layouts/Base.astro`) that emits the head tags of every index site built from it; the live index sites measured here come from that renderer.
- The frame names `grim-gui` a "Vite GUI". It is a Tauri 2 desktop app with a Vite front end (`grim-gui/README.md:5-7`, status "skeleton", no meta description). Marketing for it today is a placeholder.
- The frame treats the audience as "engineers" for every adopter. The fleet states an audience in 1 of 17 repos; the `marketing-copy` rule cannot check audience against an existing statement in 16 repos, so it must produce one.
- The frame describes channels (LinkedIn, YouTube) as a distribution target for the fleet. This audit found 0 references to LinkedIn, YouTube, Product Hunt or Hacker News in the 17 READMEs and 14 landing files (`bash text.sh | grep -i -c -E "linkedin|youtube|product hunt|hacker news"` is 0); the only social link in the headline corpus is Discord (`ocx-sh/ocx/README.md` badge, `[discord-badge]`). Platform channels are unadopted, not under-measured.
- ocx.sh was mid-cutover and unreachable over HTTPS from this machine at measurement time; its head is source-derived.
