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

None yet.
