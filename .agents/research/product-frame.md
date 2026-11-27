---
title: UX design and marketing for software products and services — phase 0 frame
program: product (two sub-programs: ux, marketing)
date: 2026-11-27
method: research-lang, ported from a programming language to two practice domains (the design of software interfaces, and the marketing of software products and services across owned, earned and platform channels)
status: active
branch: product worktree (.agents/worktrees/product) — research lands on branch `product-ux-marketing`, not `main`
---

# Product — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The domain and its era

Two sub-programs share this frame because they meet on the same surfaces (a
landing page is both an interface and a piece of marketing) and are adopted by
the same repositories.

- **ux** — the design of software interfaces: web applications and sites,
  desktop GUIs, command-line and terminal tools, documentation as an
  interface, and features built on language models. Prefix `ux-`.
- **marketing** — positioning, messaging and distribution for software
  products and for software services: owned surfaces (site, README, docs,
  blog, email), platform channels (LinkedIn, YouTube, microblogs, Reddit,
  Hacker News, Product Hunt, GitHub as a channel, podcasts, events) and the
  measurement and legal constraints around them. Prefix `marketing-`.

Era: late 2026. Platform algorithms, format limits, advertising products,
accessibility law and AI-disclosure rules all moved in the last 24 months, and
every worker's training data predates part of that. Platform facts (character
limits, format specifications, policy text) are fetched from the platform's
own documentation and dated; none is written from memory.

## The adopting codebases

The fleet under `/home/mherwig/dev`: the OCX family (`ocx-sh/*`) and the
Grimoire family (`grimoire-rs/*`). Developer tools, open source, sold to
engineers.

| Surface | Where |
|---|---|
| Astro sites | `ocx-sh/website/site`, `ocx-sh/ocx/website`, `ocx-sh/catalog/docs`, `ocx-sh/www-setup/site`, `ocx-sh/devcontainer-features/site`, `ocx-sh/rules_ocx/site`, `grimoire-rs/grimoire/docs` |
| MkDocs sites | `ocx-sh/ocx-mirror`, `ocx-sh/indexbot`, `grimoire-rs/indexer` |
| Desktop or web GUI | `grimoire-rs/grim-gui` (Vite) |
| Command-line tools | `ocx`, `grim` and their installers |
| READMEs and release notes | every repository |

The fleet is the grounding target, not the only audience: the published
artifacts must serve any team building or selling software, so an exemplar
corpus of public sites, READMEs and channels is measured alongside it.
Exemplars are cloned to `~/.cache/research-lang/exemplars/product`.

## Already covered by this catalog

`css-theming` (tokens, dark mode, theming mechanics), `docs-quality` and the
docs skills (page types, plain English, navigation, examples, observability),
`code-docs`, the command-line stream and exit-code contracts in the language
sets, and `installer-script` / `shell-integration`. The new sets route to
these and do not restate them.

## The intended artifact set (a hypothesis for the map to revise)

| Kind | Candidate | Loads when |
|---|---|---|
| Rule + reference skill | `ux-quality` | editing interface code: components, pages, templates, styles |
| Rule + reference skill | `marketing-copy` | editing landing pages, READMEs, release notes, site content |
| Skill | `ux-review` | reviewing an interface or a flow against the ruleset |
| Skill | `positioning-brief` | deciding audience, category, alternatives and message hierarchy |
| Skill | `landing-page` | writing or reviewing a product page |
| Skill | `linkedin-post` | writing a post, a document post or a company-page update |
| Skill | `youtube-video` | planning a video: title, thumbnail, hook, structure, description |
| Skill | `launch-plan` | sequencing a release across channels |
| Bundle | `product-essentials` | the set |

Every rule carries a verification. Where no command exists, the verification
is a named reading heuristic or a platform limit with its source and date.

## What would falsify this frame

- The fleet has no marketing surface worth measuring beyond READMEs, in which
  case the exemplar corpus carries the grounding.
- UX guidance for command-line tools and for graphical interfaces shares too
  little to live in one rule, in which case `ux-quality` splits.
- Channel guidance decays faster than a published skill can be refreshed, in
  which case the skills pin dated facts in one reference file each and the
  refresh cadence is stated in the skill.

## Corrections

### 2026-11-27 — grounding audits, the three selections, and the authoring plan

Sources: `product-resume/selection-ux.json`, `selection-marketing.json`,
`selection-channels.json` (their `frameCorrections`), the grounding audits
under `product-audit/`, and `product-authoring-plan.md`.

**The fleet.**

- Only 2 of the 10 fleet sites have a true landing page. The other 8 open on
  documentation, so "landing" was ambiguous; the marketing set scopes its
  first-screen rules by a `doc_surface: pitch` declaration instead.
- The larger GUI is the VS Code extension (42 files, about 25,000 lines, 183
  host-to-webview message calls), not `grimoire-rs/grim-gui`, which is a
  skeleton. The extension's UI is reached through a `typescript-quality`
  routing row and the `editor-extensions.md` depth file.
- Existing UI guidance lives in six `ocx-theme-*` skills (about 158 KB) outside
  this catalog. Their portable rows are absorbed into `ux-quality-reference`.
- An accessibility gate already exists on the main site (Lighthouse at 100,
  axe in 47 specs), so the UX set extends a practice rather than starting one.
- The fleet has no social channel and no voice guidance. There is no LinkedIn
  Page, only personal profiles. A YouTube channel holds 2 Shorts of inferred
  ownership and is linked from nowhere. Discord has 5 members.
- Release notes come from git-cliff and cargo-dist, and only 9 of 18
  repositories publish GitHub Releases.
- No site runs analytics (0 of 413 pages), and the selection treats that as a
  decision to record, not a gap to fill.
- `og:image` appears on 0 of 298 built pages. The repositories carry 61
  distinct one-line descriptions for 17 products, and six variants of
  `product-context.md`.
- Terminal casts (asciinema) are the fleet's demo practice; no video pipeline
  exists.
- The MkDocs sites run vendor UI, so `ux-quality` reaches them only through
  `overrides/` and built HTML.

**The world.**

- Hacker News and Stack Overflow ban generated text, so their skills produce
  fact sheets for a human, never paste-ready posts.
- The EU AI Act Article 50 transparency duties apply from 2026-12-02, inside
  the first refresh window of every artifact that cites them.

**The falsifiers.**

- "CLI and GUI share too little for one rule" fired. `ux-quality` stays the
  rule for markup, and the CLI and agent surfaces became the skills `ux-cli`
  and `ux-agent-interfaces`, because no rule glob reaches CLI source.
- "Channel guidance decays faster than a skill can be refreshed" fired. Every
  platform skill ships one dated `references/facts.md` in a shared registry
  format with a per-row `refresh_days`, and catalog CI fails on an overdue row.
- "No marketing surface beyond READMEs" did not fire: READMEs, manifests, site
  heads, release bodies and the two landings are all measured surfaces.

**The prefixes.** A third prefix, `channel-`, was added for the platform
topics (agent boundary, GitHub, LinkedIn, YouTube, microblogs, communities,
terminal video, launch). Published channel skills are named by platform, not
by prefix.

**The artifact set, hypothesis against final.**

| Frame hypothesis | Final |
|---|---|
| Rule + reference `ux-quality` | Kept: `ux-quality` + `ux-quality-reference`, globs `.astro .tsx .jsx .vue .svelte .html .css .scss` |
| (none) | Added: `ux-cli`, `ux-agent-interfaces` skills |
| `ux-review` | Kept |
| Rule + reference `marketing-copy` | Renamed `marketing-quality` + `marketing-quality-reference`, and absorbs the proposed `site-discoverability` rule |
| `positioning-brief` | Kept |
| `landing-page` | Dropped. Its checklist lives in `marketing-review`, and first-screen rules in `first-screen.md` |
| (none) | Added: `release-notes`, `marketing-review`, `marketing-measurement` |
| `linkedin-post`, `youtube-video`, `launch-plan` | Kept |
| (none) | Added: `channel-publishing` (the shared boundary, a required skill rather than the proposed rule), `github-presence`, `microblog-post`, `terminal-demo`, `community-post` |
| Bundle `product-essentials` (the whole set) | Split: `ux-essentials` and `product-essentials`, because grim refuses nested bundles |

Net: 21 artifacts (2 rules, 2 reference skills, 15 skills, 2 bundles) against
the frame's 9.
