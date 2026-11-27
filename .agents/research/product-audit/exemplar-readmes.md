---
title: Exemplar READMEs as the first marketing surface - grounding audit
program: product (marketing sub-program)
worker: exemplar-readmes
date_researched: 2026-11-27
model: sonnet
sources_fetched: 59
---

# Exemplar READMEs as the first marketing surface

Scope: 40 widely adopted developer-tool repositories (the "upstream" sample) and
the 18 fleet repositories that have a README (the "fleet" sample). Everything
was fetched with the `gh` CLI from GitHub on 2026-11-27: 58 README bodies, 58
repository metadata records, 58 release lists, 58 social-image flags. No web
page outside GitHub was opened; no platform fact is asserted from memory.
The fleet READMEs fetched from GitHub are byte-identical to the local
checkouts (command in Method, step 6), so the `file:line` citations for the fleet
refer to `/home/mherwig/dev/<owner>/<repo>/README.md` and hold for both.

## Method (every number below is re-runnable)

Working directory for all steps:
`~/.cache/research-lang/exemplars/product/exemplar-readmes` (the scripts are
reproduced in full in the appendix).

1. Sample lists. `cat repos.txt` (40 upstream, the 36 named in the brief plus
   `cli/cli`, `eza-community/eza`, `dandavison/delta`, `ollama/ollama`) and
   `cat fleet.txt` (18 fleet repositories; `grimoire-rs/vscode` is the GitHub
   repo `grimoire-rs/grimoire-vscode`).
2. Fetch. `./fetch.sh` runs, per repository:
   `gh api repos/$r/readme -H 'Accept: application/vnd.github.raw'`,
   `gh api repos/$r --jq '{r:.full_name,desc:.description,topics:(.topics|length),stars:.stargazers_count,home:.homepage,pushed:.pushed_at}'`,
   `gh api "repos/$r/releases?per_page=10" --jq '{n:length,withbody:([.[]|select((.body//"")|length>0)]|length),avglen:...}'`,
   and the GraphQL field `usesCustomOpenGraphImage`
   (`gh api graphql -f query='{repository(owner:"o",name:"n"){usesCustomOpenGraphImage}}'`).
   Cross-check with the search API (run in the repair pass, results in
   `search_cli.txt`): `gh api -X GET search/repositories -f q='topic:cli stars:>20000 archived:false' -f sort=stars -f per_page=100 --jq '.items[]|"\(.full_name) \(.stargazers_count) \(.topics|length)"'`.
   It returned 81 repositories; 7 of them are in the named sample (fzf, lazygit,
   ripgrep, bat, cli, fd, zoxide). Topics: median 12, at or above 3 in 80 of 81,
   zero in none. The named sample is not drawn from this list, and it has 4
   repositories at 0 or 1 topics (below), so the search result says repositories
   that sit high in a topic search are tagged; it does not say the named sample is.
3. Measure README structure. `python3 -I analyze.py` writes `analysis.json`.
4. List first-screen images for manual classification. `python3 -I imgs.py`.
5. Render tables and the distributions. `python3 -I report_tables.py`
   (writes `table_up.md`, `table_fleet.md`; its stdout is the C/A/D tallies).
6. Identity check fleet fetched vs local:
   `while read r p; do f=$(echo $r|tr / _); diff -q <(cat readme/$f.md) $p/README.md; done < fleet.txt`
   returned "same" for 18 of 18.

### Definitions and known measurement error

- **First screen** = the first 40 non-blank source lines of the raw README,
  skipping lines that are only HTML wrapper tags (`<p>`, `<div>`, `<picture>`,
  `<br>`, and similar). This is a proxy for "first 40 rendered lines"; a
  renderer collapses badge rows, so the proxy over-counts lines for badge-heavy
  READMEs. Rendering was not done.
- **Badges** = images whose URL matches shields.io, badge, codecov,
  workflow-status and similar patterns, inline or reference-style. Error is
  about +/-1 (the astro README counts 16 in the first screen, 24 overall).
- **Logo and demo positions** were classified by hand from the output of
  `imgs.py` plus reading the first lines of the ambiguous READMEs (zoxide, uv,
  atuin, caddy, pixi, bun, ollama, turborepo, eza, lazygit, pnpm). A "demo" is a
  screenshot, GIF, video, terminal recording or benchmark chart. A suffix `c` in
  the table marks a benchmark chart (ruff, uv, esbuild); these are counted
  separately. Position is the index among the 40 first-screen lines.
- **Install command** = the first line, inside a code fence or inline code, that
  matches a package-manager or installer pattern (regex `INST` in `analyze.py`).
  A link to an install page does not count. "Non-blank position" counts all
  non-blank lines from the top of the file, including lines inside fences.
- **C / A / D** (description names category, audience, differentiator) is
  hand-labelled, one point each, from the GitHub description plus the first
  prose line of the README. Category = a noun that says what kind of thing it
  is (package manager, linter). Audience = a named user group or ecosystem
  (Python, Kubernetes, coding agents, "web projects"). Differentiator = a
  concrete claim a competitor could not copy verbatim (speed, "zero runtime
  dependencies", "no service to run"); "modern" and "simple" alone do not
  count. The labels are judgement calls; the three-of-three count is the
  headline, the single-letter counts are softer.
- Release "with body" counts releases with a non-empty body among the latest 10.
  It cannot tell hand-written notes from auto-generated "What's Changed" lists.
- Social-preview presence is `usesCustomOpenGraphImage`: `true` means a custom
  image was uploaded; `false` means GitHub's generated card is used.

## Headline distributions

### Upstream sample (n = 40)

Command: `python3 -I report_tables.py` for the C/A/D, logo and demo tallies;
`python3 -I -` blocks quoting `analysis.json` for the quartiles (appendix B).

| Measure | min | p25 | median | p75 | max |
|---|---|---|---|---|---|
| README lines (`split('\n')`) | 39 | 104 | 233 | 450 | 6062 |
| README words | 166 | 412 | 1131 | 2067 | 23165 |
| Headings (outside code fences) | 1 | 7 | 13 | 24 | 94 |
| Badges in first 40 lines | 0 | 2 | 4 | 6 | 16 |
| Install command, source line (27 of 40 have one) | 8 | 41 | 86 | 124 | 565 |
| Install command, non-blank position (same 27) | 5 | 32 | 60 | 102 | 443 |

| Presence in first screen or README | Count of 40 |
|---|---|
| README contains an install command at all | 27 (13 only link out to an install page: nix, caddy, cli, delta, eza, task, helix, pnpm, tauri, turborepo, vite, zed, esbuild; list = rows with `install_src_line` null in `analysis.json`) |
| Install command inside the first 40 non-blank lines | 12 |
| Code example that is not an install command inside the first 40 lines | 11 |
| Logo, wordmark or banner image in first 40 lines | 24 |
| Demo (screenshot, GIF, video, recording, chart) in first 40 lines | 16 (13 screenshot, GIF or video; 3 benchmark chart only) |
| Sponsor or self-promotion block inside first 40 lines | 7 (zoxide, eza, lazygit, task, mise, fzf, pnpm); 3 of them sit above the description (zoxide, eza, lazygit) |
| Link to docs or website in first 40 lines | 23 |
| Heading naming why, comparison, alternatives, benchmark or differences (regex `WHYSTRICT`, may include false positives such as a "vs" in a vocabulary heading) | 11 (19 with the looser "features/highlights/goals" match) |
| Description names category / audience / differentiator | 38 / 26 / 29 |
| Description names all three | 17 |

GitHub-side metadata, upstream: description present 40 of 40, median length 47.5
characters; topics median 8.5 (3 repositories have 0: bazelisk, just, mise);
homepage set 35 of 40; custom social image 17 of 40; Releases tab used 39 of 40
(nix has none) and in all 39 every one of the latest 10 releases has a non-empty
body, median average body length 3166 characters; only helix is under 300.

### Fleet sample (n = 18)

| Measure | min | p25 | median | p75 | max |
|---|---|---|---|---|---|
| README lines | 14 | 60 | 91 | 162 | 317 |
| README words | 110 | 359 | 493 | 1141 | 2385 |
| Headings | 1 | 5 | 6.5 | 8 | 12 |
| Badges in first 40 lines | 0 | 0 | 0 | 0 | 4 |
| Install command, source line (12 of 18 have one) | 13 | 21 | 30 | 40 | 50 |
| Install command, non-blank position (same 12) | 9 | 14 | 21 | 29 | 35 |

| Presence | Count of 18 |
|---|---|
| README contains an install command | 12 (after correcting the regex miss on `ocx-mirror` README.md:15). `rules_ocx` README.md:13 opens a Quick start with a Bazel snippet, not an installer. Six contain none: `e2e-index`, `index`, `website`, `arcana`, `devcontainer-features` (a `devcontainer.json` snippet at README.md:12), `rules_ocx` |
| Install command inside first 40 non-blank lines | 12 |
| Logo in first 40 lines | 6 (`grimoire`, `vscode`, `arcana`, `ocx`, `ocx-mirror`, `www-setup`) |
| Demo (screenshot, GIF, video, chart) | 0 |
| Sponsor block | 0 |
| Link to docs in first screen | 8 (6 by the heuristic, plus `ocx` README.md:11,35 and `grimoire` README.md:12,25, which use reference-style links the regex missed) |
| Heading naming why or comparison | 0 (the one regex hit, `catalog` README.md:12 "Index vs. catalog", disambiguates two terms; it compares nothing) |
| Description names category / audience / differentiator | 18 / 8 / 6 |
| Description names all three | 3 (`grimoire`, `ocx`, `rules_ocx`) |

GitHub-side metadata, fleet: description missing on 3 of 18
(`devcontainer-features`, `rules_ocx`, `www-setup`); topics median 0, with 15 of
18 at zero topics (only `grimoire` 20, `grimoire-vscode` 20 and `ocx` 13 have any);
homepage set 9 of 18; custom social image 0 of 18; Releases used by 9 of 18, and
all 9 have a non-empty body on every sampled release; median average body
length 595 characters (range 140 for `indexbot` to 5598 for `grimoire`).

Command for the metadata block: `python3 -I -` snippet "meta aggregation" in
appendix B, reading `meta/*.json`, `meta/*.rel.json`, `meta/*.og`.

## Where the fleet sits in the distributions

| Measure | Upstream median (p25-p75) | Fleet median (p25-p75) | Fleet position |
|---|---|---|---|
| README length, lines | 233 (104-450) | 91 (60-162) | below median; the shortest upstream repos (esbuild 40, nix 39, zed 49, dagger 50, turborepo 49) are as short |
| Headings | 13 (7-24) | 6.5 (5-8) | below p25 |
| Badges, first screen | 4 (2-6) | 0 (0-0) | 15 of 18 have none; `grimoire` and `ocx` have 4 |
| Install command, non-blank position | 60 (32-102) | 21 (14-29) | earlier than the upstream p25; `ocx` is at 14 (README.md:22) |
| Install command present in README | 27 of 40 (68 percent) | 12 of 18 (67 percent) | equal |
| Logo in first screen | 24 of 40 (60 percent) | 6 of 18 (33 percent) | lower; all six sit at positions 1-3 |
| Demo or screenshot in first screen | 16 of 40 (40 percent) | 0 of 18 | absent everywhere; including the two products with a UI (`grim-gui`, `grimoire-vscode`) |
| Description names category, audience and differentiator | 17 of 40 (43 percent) | 3 of 18 (17 percent) | lower; fleet states category 18 of 18 but audience 8 of 18 and differentiator 6 of 18 |
| Heading on why or comparison | 11 of 40 (upper bound) | 0 of 18 | lower |
| Topics | median 8.5 | median 0 | 15 of 18 at zero |
| Custom social image | 17 of 40 | 0 of 18 | lower |
| Release notes written (latest 10) | 39 of 39 repos with releases | 9 of 9 repos with releases | equal |

## Fleet evidence (file:line)

All paths are `/home/mherwig/dev/<owner>/<repo>/README.md`.

| Repo | Tagline / description lines | Logo | Install command | Notes |
|---|---|---|---|---|
| `ocx-sh/ocx` | tagline line 7 "The Simple Package Manager" (category only); description line 16 (audience: GitHub Actions, Bazel, CI/CD; differentiator: single command, instant version switch) | line 3 | line 22 (`curl -fsSL https://setup.ocx.sh/sh \| sh`) | 4 badges lines 9-12 (reference-style); Quick Start 18-33 doubles as usage example; docs link at line 35 is below the install |
| `grimoire-rs/grimoire` | bold tagline lines 7-8 (category, audience "every coding agent you use"); lines 17-21 differentiators (digest-pinned lockfile, "no Grimoire service to sign up for") | line 3 | line 36 | 4 badges lines 10-13; status banner lines 27-28; no usage example before install |
| `grimoire-rs/grim-gui` | lines 5-7 describe it as a Tauri 2 shell for `grim`; no differentiator | none | line 50 (non-blank 35) | lines 9-10 declare "Status: skeleton", the window shows only a version string; no screenshot |
| `grimoire-rs/grim-mirror` | lines 5-8 what it republishes | none | line 16 | line 10 "Source only, no releases" |
| `grimoire-rs/grimoire-vscode` | lines 7-9 | line 2 | line 21 | 249 lines, 8 headings; a marketplace UI with no screenshot in the first 40 lines (`imgs.py` shows only the logo) |
| `grimoire-rs/indexer` | lines 3-5 | none | line 13 | docs link line 7 above the install |
| `michael-herwig/arcana` | lines 8-9 "Personal grimoire" | line 2 | none | |
| `ocx-sh/catalog` | lines 3-7 "An Astro-based static site generator" | none | line 41 | GitHub description reads "VitePress-based site generator" (`gh api repos/ocx-sh/catalog --jq .description`): disagrees with README.md:3; line 12 "Index vs. catalog" is a vocabulary heading, not a comparison |
| `ocx-sh/conventions` | lines 3-5 | none | line 30 | |
| `ocx-sh/devcontainer-features` | lines 5-6 name the audience ("developers who work in dev containers or Codespaces") | none | `devcontainer.json` snippet line 12 | GitHub description is null |
| `ocx-sh/e2e-index` | line 3 "End-to-end test fixture" | none | none | correctly framed as non-product |
| `ocx-sh/grimoire-lore` | lines 3-5 | none | line 37 | |
| `ocx-sh/index` | lines 3-5, differentiator "no server, no database, no API" | none | none | |
| `ocx-sh/indexbot` | lines 3-9 | none | line 27 | |
| `ocx-sh/ocx-mirror` | lines 9-11 | line 3 | line 15 (inline `ocx --global add ocx.sh/ocx/mirror`) | the regex missed this; corrected by hand |
| `ocx-sh/rules_ocx` | lines 4-9 | none | none (Quick start line 13 is a Bazel snippet) | 317 lines, 12 headings; GitHub description is null |
| `ocx-sh/website` | lines 3-5 | none | none | 14 lines, 1 heading; internal-facing, points to HANDOVER.md and AGENTS.md |
| `ocx-sh/www-setup` | line 7 | line 3 | line 40 | GitHub description is null |

Commands behind this table:
`for r in grimoire-rs/grim-gui ...; do grep -n -v '^\s*$' $r/README.md | head -7; grep -n -i -m1 logo $r/README.md; done`
(run in `/home/mherwig/dev`), `cat -n ocx-sh/ocx/README.md | sed -n 1,40p`,
`cat -n grimoire-rs/grimoire/README.md | sed -n 1,40p`,
`grep -n -i -m4 'install\|^## ' <repo>/README.md`, and
`gh api repos/ocx-sh/catalog --jq .description` (in the stored `meta/ocx-sh_catalog.json`).

## Per-repository measurements

Columns: lines = README lines; badges = in first screen; logo and demo = position
in the first 40 lines (`-` none, `c` benchmark chart only); install = source line
/ non-blank position; C A D = the 0/1 labels; topics; custom social image;
releases with non-empty body among the latest 10 (`0/0` = no releases).

Command: `python3 -I report_tables.py` (table fragments `table_up.md`, `table_fleet.md`).

### Upstream

| repo | stars | lines | headings | badges (first 40) | logo pos | demo pos | install src line / non-blank pos | C A D | topics | custom social image | releases with body / sampled |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BurntSushi/ripgrep | 70405 | 542 | 15 | 3 | - | 26 | 246 / 193 | 101 | 10 | n | 10/10 |
| NixOS/nix | 18081 | 39 | 6 | 2 | - | - | - / - | 111 | 5 | y | 0/0 |
| ajeetdsouza/zoxide | 40793 | 554 | 7 | 3 | 26 | - | 109 / 86 | 111 | 20 | y | 10/10 |
| astral-sh/ruff | 51585 | 455 | 13 | 6 | - | 11c | 122 / 89 | 111 | 11 | n | 10/10 |
| astral-sh/uv | 92748 | 327 | 18 | 3 | - | 6c | 50 / 40 | 111 | 4 | n | 10/10 |
| atuinsh/atuin | 32674 | 172 | 7 | 11 | 1 | - | 49 / 39 | 010 | 6 | n | 10/10 |
| bazelbuild/bazelisk | 2753 | 316 | 22 | 0 | - | - | 13 / 8 | 110 | 0 | n | 10/10 |
| biomejs/biome | 26228 | 195 | 11 | 5 | 1 | - | 49 / 38 | 110 | 9 | y | 10/10 |
| caddyserver/caddy | 79606 | 226 | 14 | 7 | 1 | - | - / - | 101 | 15 | y | 10/10 |
| casey/just | 36871 | 6062 | 94 | 0 | - | 17 | 98 / 72 | 100 | 0 | n | 10/10 |
| cli/cli | 47249 | 123 | 13 | 0 | - | 5 | - / - | 111 | 4 | y | 10/10 |
| dagger/dagger | 16653 | 50 | 6 | 0 | - | - | 8 / 5 | 101 | 10 | n | 10/10 |
| dandavison/delta | 32872 | 363 | 24 | 3 | - | 1 | - / - | 111 | 9 | n | 10/10 |
| denoland/deno | 109041 | 117 | 6 | 5 | 5 | - | 28 / 20 | 110 | 4 | n | 10/10 |
| derailed/k9s | 35086 | 1542 | 52 | 6 | 1 | 24 | 86 / 60 | 110 | 8 | y | 10/10 |
| earthly/earthly | 12054 | 366 | 30 | 7 | 10 | - | 275 / 184 | 101 | 15 | y | 10/10 |
| evanw/esbuild | 40197 | 40 | 1 | 0 | 1 | 11c | - / - | 111 | 11 | n | 10/10 |
| eza-community/eza | 24076 | 223 | 12 | 6 | - | 18 | - / - | 100 | 10 | y | 10/10 |
| go-task/task | 16400 | 74 | 3 | 0 | 1 | - | - / - | 101 | 8 | n | 10/10 |
| gohugoio/hugo | 90581 | 161 | 11 | 1 | 27 | - | 107 / 78 | 111 | 7 | y | 10/10 |
| helix-editor/helix | 47053 | 65 | 6 | 6 | 2 | 11 | - / - | 101 | 4 | n | 10/10 |
| jdx/mise | 36565 | 301 | 13 | 10 | 2 | - | 124 / 102 | 111 | 0 | n | 10/10 |
| jesseduffield/lazygit | 84124 | 641 | 62 | 4 | - | - | 259 / 178 | 110 | 3 | n | 10/10 |
| jetify-com/devbox | 12485 | 204 | 17 | 4 | 1 | 28 | 47 / 34 | 111 | 11 | n | 10/10 |
| jqlang/jq | 36370 | 83 | 14 | 0 | - | - | 27 / 16 | 111 | 1 | n | 10/10 |
| junegunn/fzf | 84529 | 1161 | 41 | 8 | 1 | 16 | 116 / 100 | 100 | 10 | y | 10/10 |
| nushell/nushell | 41131 | 240 | 14 | 8 | - | 10 | 45 / 33 | 101 | 3 | n | 10/10 |
| ollama/ollama | 188286 | 359 | 34 | 0 | 1 | - | 16 / 11 | 011 | 14 | n | 10/10 |
| oven-sh/bun | 97009 | 450 | 9 | 3 | 1 | - | 41 / 32 | 111 | 12 | n | 10/10 |
| pnpm/pnpm | 37167 | 307 | 7 | 6 | 6 | - | - / - | 101 | 8 | y | 10/10 |
| prefix-dev/pixi | 8020 | 388 | 28 | 3 | 2 | 20 | 75 / 52 | 111 | 9 | y | 10/10 |
| sharkdp/bat | 61539 | 950 | 71 | 3 | 1 | 19 | 264 / 180 | 101 | 8 | y | 10/10 |
| sharkdp/fd | 45227 | 808 | 62 | 2 | - | 25 | 565 / 443 | 101 | 9 | n | 10/10 |
| starship/starship | 60957 | 403 | 11 | 6 | - | - | 130 / 109 | 111 | 12 | y | 10/10 |
| tauri-apps/tauri | 113252 | 97 | 9 | 7 | 1 | - | - / - | 111 | 9 | y | 10/10 |
| traefik/traefik | 65747 | 159 | 14 | 4 | 1 | - | 110 / 74 | 111 | 14 | y | 10/10 |
| vercel/turborepo | 31396 | 49 | 7 | 4 | 1 | - | - / - | 110 | 5 | y | 10/10 |
| vitejs/vite | 84138 | 67 | 5 | 7 | 1 | - | - / - | 110 | 5 | n | 10/10 |
| withastro/astro | 64251 | 104 | 7 | 16 | 1 | - | 30 / 21 | 111 | 11 | n | 10/10 |
| zed-industries/zed | 95822 | 49 | 6 | 2 | - | - | - / - | 101 | 4 | n | 10/10 |

### Fleet

| repo | stars | lines | headings | badges (first 40) | logo pos | demo pos | install src line / non-blank pos | C A D | topics | custom social image | releases with body / sampled |
|---|---|---|---|---|---|---|---|---|---|---|---|
| grimoire-rs/grim-gui | 0 | 81 | 6 | 0 | - | - | 50 / 35 | 100 | 0 | n | 0/0 |
| grimoire-rs/grim-mirror | 0 | 54 | 6 | 0 | - | - | 16 / 11 | 100 | 0 | n | 0/0 |
| grimoire-rs/grimoire-vscode | 1 | 249 | 8 | 0 | 2 | - | 21 / 18 | 110 | 20 | n | 10/10 |
| grimoire-rs/grimoire | 17 | 111 | 7 | 4 | 3 | - | 36 / 25 | 111 | 20 | n | 10/10 |
| grimoire-rs/indexer | 0 | 197 | 11 | 0 | - | - | 13 / 9 | 110 | 0 | n | 10/10 |
| michael-herwig/arcana | 0 | 87 | 5 | 0 | 2 | - | - / - | 100 | 0 | n | 0/0 |
| ocx-sh/catalog | 1 | 101 | 8 | 0 | - | - | 41 / 31 | 100 | 0 | n | 0/0 |
| ocx-sh/conventions | 0 | 76 | 8 | 0 | - | - | 30 / 20 | 110 | 0 | n | 0/0 |
| ocx-sh/devcontainer-features | 0 | 60 | 6 | 0 | - | - | - / - | 110 | 0 | n | 0/0 |
| ocx-sh/e2e-index | 0 | 56 | 6 | 0 | - | - | - / - | 100 | 0 | n | 0/0 |
| ocx-sh/grimoire-lore | 0 | 162 | 8 | 0 | - | - | 37 / 29 | 100 | 0 | n | 0/0 |
| ocx-sh/index | 0 | 55 | 5 | 0 | - | - | - / - | 101 | 0 | n | 0/0 |
| ocx-sh/indexbot | 0 | 79 | 5 | 0 | - | - | 27 / 21 | 110 | 0 | n | 10/10 |
| ocx-sh/ocx-mirror | 0 | 180 | 7 | 0 | 3 | - | 15 / 10 | 101 | 0 | n | 10/10 |
| ocx-sh/ocx | 20 | 95 | 7 | 4 | 3 | - | 22 / 14 | 111 | 13 | n | 10/10 |
| ocx-sh/rules_ocx | 0 | 317 | 12 | 0 | - | - | - / - | 111 | 0 | n | 9/9 |
| ocx-sh/website | 0 | 14 | 1 | 0 | - | - | - / - | 100 | 0 | n | 10/10 |
| ocx-sh/www-setup | 1 | 103 | 5 | 0 | 3 | - | 40 / 28 | 101 | 0 | n | 10/10 |


## Smells

Ranked by how much an agent following a rule would change a fleet README, and
how cheaply the fix can be checked.

1. **No product shot anywhere (0 of 18 fleet, 16 of 40 upstream).** Includes the
   two products with a screen: `grim-gui` (README.md:9-10 says the window shows
   a version string, "Status: skeleton") and `grimoire-vscode` (README.md:1-9,
   logo only, 249 lines). Check: first 40 lines contain an image or video that
   is not a logo or badge.
2. **Description gives the category but not the audience or the differentiator
   (fleet 18 / 8 / 6 of 18; upstream 38 / 26 / 29 of 40).** The `ocx` tagline
   (`ocx-sh/ocx` README.md:7, "The Simple Package Manager") is category plus an
   adjective; the real statement is one paragraph lower at README.md:16.
   `grimoire` (README.md:7-8, 17-21) is the fleet's one clean example. Check: one
   sentence that names the kind of thing, who it is for, and one claim.
3. **Repository metadata is blank.** 15 of 18 fleet repositories have zero topics
   (upstream median 8.5), 3 have a null description, 0 of 18 have a custom
   social-preview image (upstream 17 of 40), 9 of 18 have no homepage URL.
   Check: `gh api repos/<o>/<r> --jq '{d:.description,t:(.topics|length),h:.homepage}'`.
4. **Description drift between GitHub and README.** `ocx-sh/catalog`: GitHub
   description "VitePress-based site generator" vs README.md:3 "Astro-based".
   Check: compare the two strings.
5. **No why or comparison section, and no alternative is named.** Fleet 0 of 18;
   `grep -n -i -E 'asdf|mise|homebrew|brew|nix|alternative|compared|unlike| vs '`
   over the `ocx` and `grimoire` READMEs returns no match. Upstream has an upper
   bound of 11 of 40 with a matching heading, so this is a gap against a minority
   practice, not a norm broken. Lower priority than 1-3.
6. **Docs link position.** Not a gap by count (the fleet links docs in the first
   40 lines for 8 of 18; upstream 23 of 40) but `indexer` and `catalog` lead with a
   docs URL while `ocx` places its guide link after a 15-line Quick Start
   (README.md:35). Low priority.

## Patterns worth encoding

Each pattern is something an agent can verify with a command, and each is
measured above.

1. **Order the first screen: identity, one-sentence claim, then the way in.** In
   the upstream sample the description line sits at non-blank position 6 (median;
   heuristic, see the sponsor caveat) and the fleet at 3. Verification: the first
   non-heading prose line is within the first 10 non-blank lines.
2. **Put one installable command inside the first 40 non-blank lines.** Only 12 of
   40 upstream READMEs do (median position 60); 12 of 18 fleet READMEs do (median
   21). The fleet's habit is the better practice here and should be encoded as the
   target, not corrected toward upstream. Verification: a regex over fenced lines
   such as `INST` in `analyze.py`.
3. **Show the product once above the fold when it has a surface.** 13 of 40
   upstream READMEs carry a screenshot, GIF or video in the first 40 lines (bat 19,
   fd 25, k9s 24, delta 1, just 17, gh 5, nushell 10 among them). Verification: an image or video link that
   is not a badge or logo in the first 40 lines.
4. **Keep sponsor and self-promotion blocks out of the first screen.** 7 of 40
   upstream READMEs carry one in the first 40 lines, 3 of them above the
   description (zoxide, eza, lazygit); the fleet has none. Verification: the first
   prose line is the project description, not a "special thanks" block.
5. **Badges: a few, with a job.** Upstream median 4 in the first screen, but the
   spread is 0-16 (astro 16, atuin 11, mise 10 at the top). Verification: count of badge images
   in the first 40 lines; the fleet's 4 on `ocx` and `grimoire` (reference-style
   links, README.md:81-87 in `ocx`) sit within the observed band.
6. **Written release notes on every release.** 39 of 39 upstream repositories with
   releases and 9 of 9 fleet repositories carry non-empty release bodies on all of
   the latest 10 releases (median average 3166 characters upstream, 595 fleet).
   Verification: `gh api repos/<o>/<r>/releases?per_page=10 --jq '[.[]|select((.body//"")|length==0)]|length'` is 0.
   Caveat: body presence only; the check does not read quality.
7. **Fill the GitHub card.** Description present (upstream 40 of 40), topics at
   or above 3 (36 of 40; 40 minus bazelisk, just, mise at 0 and jq at 1), homepage set (35 of 40), custom social image (17 of 40,
   a weaker norm). Verification: the `gh api` command in smell 3. Count command: `python3 -I -c "import json;print(sum(json.load(open('meta/'+r.replace('/','_')+'.json'))['topics']>=3 for r in open('repos.txt').read().split()))"` run in the working directory prints 36 (re-run in the repair pass).
8. **Flag state honestly at the top.** `grimoire` README.md:27-28 ("stabilizing
   toward 1.0") and `grim-gui` README.md:9 ("Status: skeleton") put maturity in
   the first screen. Earthly (upstream README.md:1) leads with "no longer actively
   maintained", the clearest case in the sample (this is also why its
   description position reads 1). Verification: a status line in the first 40
   lines for any repository below 1.0 or unmaintained.

## What this contradicts in the frame

The frame (`product-frame.md`) is a hypothesis; four points need a correction.

1. **"READMEs and release notes ... every repository" as a surface** and the
   falsifier "the fleet has no marketing surface worth measuring beyond READMEs".
   Measured: only 9 of 18 fleet repositories have any release, so release notes
   are not a surface for half the fleet; the other half ship "Source only, no
   releases" (`grim-mirror` README.md:10) or have no releases tab. The README is
   the whole surface for those 9, which supports the falsifier; the exemplar
   corpus carries the grounding for release notes, not the fleet.
2. **The implied gap that the fleet is behind on every first-screen element.** On
   install position the fleet is ahead of the upstream median (non-blank 21 vs
   60) and shorter (91 vs 233 median lines). The gaps are narrower and different
   from the frame's: no demo media, thin description, empty GitHub metadata.
3. **The grim-gui surface.** The frame lists `grimoire-rs/grim-gui` (Vite) as a
   desktop or web GUI surface. Its README says it is a Tauri 2 application
   (README.md:5-6) in "skeleton" status (README.md:9). There is no marketing
   surface there yet, and no UI to screenshot.
4. **The frame lists `ocx-sh/catalog` as an Astro site, and so does the README
   (README.md:3), but the GitHub description says VitePress.** Authoritative in
   practice: README and code over the GitHub field. The mismatch is a defect
   in repository metadata that this audit would not have found from the frame.

Not contradicted: Astro and MkDocs sites exist across the fleet (not measured
here), and the frame's falsifier about channel decay is outside this axis.

## Limits of this audit

- The first-screen proxy is raw lines, not rendered lines (see Definitions).
- C/A/D labels and logo/demo classification are single-rater judgements. The
  counts quoted as headline (17 of 40; 16 of 40) should be read as plus or minus
  2.
- Release body presence does not distinguish generated change lists from written
  notes. Social-preview presence is a boolean, not a quality check.
- Stars and topics reflect the fetch date, 2026-11-27.
- No Google or web page outside GitHub was consulted; no platform limit or law is
  stated.


## Appendix A - scripts (verbatim)

### fetch.sh

```bash
#!/bin/bash
# usage: fetch.sh  (run in exemplar dir). Fetches README + metadata for every repo in repos.txt and fleet.txt
set -u
while read -r r; do
  f=$(echo $r | tr / __)
  gh api repos/$r/readme -H 'Accept: application/vnd.github.raw' > readme/$f.md 2>/dev/null
  gh api repos/$r --jq '{r:.full_name,desc:.description,topics:(.topics|length),stars:.stargazers_count,home:.homepage,pushed:.pushed_at}' > meta/$f.json 2>/dev/null
  gh api "repos/$r/releases?per_page=10" --jq '{n:length,withbody:([.[]|select((.body//"")|length>0)]|length),avglen:(if length>0 then ([.[]|(.body//"")|length]|add/length|floor) else 0 end)}' > meta/$f.rel.json 2>/dev/null
  o=${r%%/*}; n=${r##*/}
  gh api graphql -f query="{repository(owner:\"$o\",name:\"$n\"){usesCustomOpenGraphImage}}" --jq '.data.repository.usesCustomOpenGraphImage' > meta/$f.og 2>/dev/null
done < <(cat repos.txt; awk '{print $1}' fleet.txt)
```

### analyze.py

```python
import re,json,sys,os,glob
# Proxy for "first 40 rendered lines": first 40 NON-BLANK source lines of README, HTML wrapper-only lines (<p>,</p>,<div..>,</div>,<br>,<picture>,</picture>) skipped.
WRAP=re.compile(r'^\s*(</?(p|div|picture|center|br|a|details|summary|table|tr|td|th|tbody|thead)\b[^>]*>\s*)+$',re.I)
BADGE=re.compile(r'(shields\.io|badge|badgen|codecov|coveralls|/actions/workflows/.*\.(svg|yml)|img\.shields|github\.com/.*/workflows|repology|crates\.io/crates/.*\.svg|api\.securityscorecards|opencollective\.com/.*/badge|discord\.com/api/guilds|vercel\.com/button)',re.I)
IMG=re.compile(r'!\[[^\]]*\]\(([^)\s]+)|<img[^>]*src=["\']([^"\']+)|<source[^>]*srcset=["\']([^"\']+)',re.I)
INST=re.compile(r'(brew install|cargo install|cargo binstall|npm (i|install)|pnpm (add|i|install)|yarn add|pip3? install|pipx install|uv (tool )?(install|add)|uvx|curl[^|\n]*\|\s*(ba|z)?sh|irm [^|]*\| ?iex|powershell[^\n]*irm|go install|apt(-get)? install|winget install|scoop install|choco install|nix (profile )?install|nix-env|docker (run|pull)|dnf install|pacman -S|snap install|mise (use|install)|npx |bunx |deno install|gem install|sudo [a-z-]* install|ocx install|grim install|install\.(sh|ps1))',re.I)
DEMO=re.compile(r'(\.gif|\.mp4|\.webm|\.mov|asciinema|user-attachments/(assets|files)|youtube\.com|youtu\.be|vimeo|demo|screenshot|screencast|preview|\.png|\.jpe?g|\.webp|\.svg)',re.I)
LOGO=re.compile(r'logo|icon|banner|brand|wordmark',re.I)
DOCS=re.compile(r'(docs?\b|documentation|/docs|\.dev|\.sh|\.io|\.rs|\.org|\.com)',re.I)
WHY=re.compile(r'^#+\s*.*(why|compar|\bvs\b|versus|alternativ|motivation|benchmark|how .* differ|what makes|philosophy|goals|features|highlights)',re.I)
WHYSTRICT=re.compile(r'^#+\s*.*(why|compar|\bvs\b|versus|alternativ|motivation|benchmark|differ)',re.I)
def analyze(path):
    t=open(path,encoding='utf8',errors='replace').read()
    raw=t.split('\n'); n=len(raw)
    # heading count outside fences
    infence=False; heads=0; fence_lines=[]
    body=[]  # (lineno, text, infence)
    fence=''
    for i,l in enumerate(raw,1):
        s=l.strip()
        if re.match(r'^(```|~~~)',s):
            infence = not infence; body.append((i,l,True)); continue
        body.append((i,l,infence))
        if not infence and re.match(r'^#{1,6}\s',l): heads+=1
        if not infence and i>0 and i<n and re.match(r'^(=+|-{3,})\s*$',raw[i] if i<n else '') and s and not s.startswith(('-','|','<')) and re.match(r'^=+\s*$',raw[i]): heads+=1
        if not infence and re.match(r'^\s*<h[1-6]',l,re.I): heads+=1
    refs={m.group(1).lower():m.group(2) for m in re.finditer(r'^\[([^\]]+)\]:\s*(\S+)',t,re.M)}
    def refbadges(l):
        return len([m for m in re.finditer(r'!\[[^\]]*\]\[([^\]]*)\]',l) if BADGE.search(refs.get(m.group(1).lower(),'')) or 'badge' in (m.group(1) or m.group(0)).lower()])
    # first screen: 40 non-blank non-wrapper lines
    fs=[]; 
    for (i,l,f) in body:
        if not l.strip(): continue
        if not f and WRAP.match(l): continue
        fs.append((i,l,f))
        if len(fs)==40: break
    last_src=fs[-1][0] if fs else 0
    res=dict(lines=n,words=len(t.split()),headings=heads,fs_last_src=last_src)
    # badges
    res['badges_all']=sum(refbadges(l) for (_,l,f) in body if not f)+sum(len(BADGE.findall(l)) and len([m for m in IMG.finditer(l) if BADGE.search(''.join(g or '' for g in m.groups()))]) or 0 for (_,l,f) in body if not f)
    res['badges_fs']=sum(refbadges(l) for (_,l,f) in fs if not f)+sum(len([m for m in IMG.finditer(l) if BADGE.search(''.join(g or '' for g in m.groups()))]) for (_,l,f) in fs if not f)
    # logo, demo
    logo=None; demo=None
    for pos,(i,l,f) in enumerate(fs,1):
        if f: continue
        for m in IMG.finditer(l):
            u=''.join(g or '' for g in m.groups()); ctx=l
            if BADGE.search(u): continue
            if logo is None and (LOGO.search(u) or LOGO.search(m.group(0))): logo=pos
            elif demo is None and (DEMO.search(u) or re.search(r'<video',l,re.I)): demo=pos
            elif demo is None and logo is not None: demo=pos
            elif logo is None and demo is None: logo=pos if pos<=5 else None; demo=None if pos<=5 else pos
        if demo is None and re.search(r'<video|asciinema\.org|youtu',l,re.I): demo=pos
    res['logo_pos']=logo; res['demo_pos']=demo
    # description: first non-heading, non-image/badge, non-wrapper, non-link-only prose line >=3 words in fs
    desc=None;dpos=None
    for pos,(i,l,f) in enumerate(fs,1):
        if f: continue
        s=re.sub(r'<[^>]+>','',l); s=re.sub(r'!\[[^\]]*\]\([^)]*\)','',s); s=re.sub(r'\[!\[.*?\]\(.*?\)\]\(.*?\)','',s)
        s=s.strip().lstrip('>').strip()
        if re.match(r'^#',s) and False: continue
        if s.startswith('#'): 
            continue
        if re.match(r'^(\[[^\]]*\]\([^)]*\)\s*[|·•-]?\s*)+$',s): continue
        if len(s.split())>=4 and not s.startswith(('|','```','-','*')):
            desc=s;dpos=pos;break
    res['desc']=desc; res['desc_pos']=dpos
    # install: first install command line (in fence or inline code) ; position as non-blank count and src line
    inst_nb=None; inst_src=None; cnt=0
    for (i,l,f) in body:
        if l.strip(): cnt+=1
        if INST.search(l) and (f or '`' in l or l.startswith('    ')):
            inst_nb=cnt; inst_src=i; break
    res['install_src_line']=inst_src; res['install_nonblank']=inst_nb
    # install within first screen
    res['install_fs']=any(INST.search(l) and (f or '`' in l) for (_,l,f) in fs)
    # usage example: a code fence opening in first screen whose content is not install
    ex=False; k=0
    fsset={i for (i,_,_) in fs}
    for idx,(i,l,f) in enumerate(body):
        if i in fsset and re.match(r'^\s*(```|~~~)',l) and not f is None:
            # opening fence if previous not in fence
            if idx==0 or not body[idx-1][2]:
                blk=[]
                j=idx+1
                while j<len(body) and not re.match(r'^\s*(```|~~~)',body[j][1]): blk.append(body[j][1]); j+=1
                txt='\n'.join(blk)
                if blk and not INST.search(txt): ex=True
    res['usage_fs']=ex
    # why/compare section anywhere (outside fences) and strict
    res['why_any']=any(WHY.match(l) for (_,l,f) in body if not f)
    res['why_strict']=any(WHYSTRICT.match(l) for (_,l,f) in body if not f)
    # docs link in first screen: a link whose text or url mentions docs/documentation/website/guide/homepage
    res['docs_fs']=any(re.search(r'\[[^\]]*(doc|guide|website|manual|homepage|site|book|handbook)[^\]]*\]\([^)]+\)|\]\([^)]*(docs?\.|/docs?|/guide|/book)[^)]*\)',l,re.I) for (_,l,f) in fs if not f)
    res['docs_any']=bool(re.search(r'\]\([^)]*(docs?\.|/docs?\b|/guide|/book|documentation)[^)]*\)|\[[^\]]*(documentation|docs)[^\]]*\]\(',t,re.I))
    return res
out={}
for p in sorted(glob.glob('readme/*.md')):
    k=os.path.basename(p)[:-3]
    if os.path.getsize(p)==0: out[k]=None; continue
    out[k]=analyze(p)
json.dump(out,open('analysis.json','w'),indent=1)
```

### imgs.py

```python
import re,glob,os,sys
sys.path.insert(0,'.')
exec(open('analyze.py').read().split('out={}')[0])
for p in sorted(glob.glob('readme/*.md')):
    t=open(p,errors='replace').read(); raw=t.split('\n')
    fs=[];infence=False
    for i,l in enumerate(raw,1):
        if re.match(r'^\s*(```|~~~)',l): infence=not infence; 
        if not l.strip() or (not infence and WRAP.match(l)): continue
        fs.append((i,l,infence))
        if len(fs)==40: break
    out=[]
    for pos,(i,l,f) in enumerate(fs,1):
        for m in list(IMG.finditer(l))+[]:
            u=''.join(g or '' for g in m.groups())
            if BADGE.search(u): continue
            out.append(f"{pos}:{u[-60:]}")
        if re.search(r'<video|asciinema|youtu|vimeo',l,re.I): out.append(f"{pos}:VIDEO")
    print(os.path.basename(p)[:-3],'|',' ; '.join(out))
```

### report_tables.py

```python
import json,statistics as st
d=json.load(open('analysis.json'))
CAD={'BurntSushi_ripgrep':'101','NixOS_nix':'111','ajeetdsouza_zoxide':'111','astral-sh_ruff':'111','astral-sh_uv':'111','atuinsh_atuin':'010','bazelbuild_bazelisk':'110','biomejs_biome':'110','caddyserver_caddy':'101','casey_just':'100','cli_cli':'111','dagger_dagger':'101','dandavison_delta':'111','denoland_deno':'110','derailed_k9s':'110','earthly_earthly':'101','evanw_esbuild':'111','eza-community_eza':'100','go-task_task':'101','gohugoio_hugo':'111','helix-editor_helix':'101','jdx_mise':'111','jesseduffield_lazygit':'110','jetify-com_devbox':'111','jqlang_jq':'111','junegunn_fzf':'100','nushell_nushell':'101','ollama_ollama':'011','oven-sh_bun':'111','pnpm_pnpm':'101','prefix-dev_pixi':'111','sharkdp_bat':'101','sharkdp_fd':'101','starship_starship':'111','tauri-apps_tauri':'111','traefik_traefik':'111','vercel_turborepo':'110','vitejs_vite':'110','withastro_astro':'111','zed-industries_zed':'101',
'grimoire-rs_grim-gui':'100','grimoire-rs_grim-mirror':'100','grimoire-rs_grimoire-vscode':'110','grimoire-rs_grimoire':'111','grimoire-rs_indexer':'110','michael-herwig_arcana':'100','ocx-sh_catalog':'100','ocx-sh_conventions':'110','ocx-sh_devcontainer-features':'110','ocx-sh_e2e-index':'100','ocx-sh_grimoire-lore':'100','ocx-sh_index':'101','ocx-sh_indexbot':'110','ocx-sh_ocx-mirror':'101','ocx-sh_ocx':'111','ocx-sh_rules_ocx':'111','ocx-sh_website':'100','ocx-sh_www-setup':'101'}
LOGO={'ajeetdsouza_zoxide':26,'atuinsh_atuin':1,'biomejs_biome':1,'caddyserver_caddy':1,'denoland_deno':5,'derailed_k9s':1,'earthly_earthly':10,'evanw_esbuild':1,'go-task_task':1,'gohugoio_hugo':27,'helix-editor_helix':2,'jdx_mise':2,'jetify-com_devbox':1,'junegunn_fzf':1,'ollama_ollama':1,'oven-sh_bun':1,'pnpm_pnpm':6,'prefix-dev_pixi':2,'sharkdp_bat':1,'tauri-apps_tauri':1,'traefik_traefik':1,'vercel_turborepo':1,'vitejs_vite':1,'withastro_astro':1,
'grimoire-rs_grimoire':3,'grimoire-rs_grimoire-vscode':2,'michael-herwig_arcana':2,'ocx-sh_ocx':3,'ocx-sh_ocx-mirror':3,'ocx-sh_www-setup':3}
DEMO={'BurntSushi_ripgrep':26,'astral-sh_ruff':11,'astral-sh_uv':6,'dandavison_delta':1,'casey_just':17,'cli_cli':5,'derailed_k9s':24,'evanw_esbuild':11,'eza-community_eza':18,'helix-editor_helix':11,'jetify-com_devbox':28,'junegunn_fzf':16,'nushell_nushell':10,'sharkdp_bat':19,'sharkdp_fd':25,'prefix-dev_pixi':20}
CHART={'astral-sh_ruff','astral-sh_uv','evanw_esbuild'}
# fix fleet install: ocx-mirror README:15 inline `ocx --global add`
d['ocx-sh_ocx-mirror']['install_src_line']=15; d['ocx-sh_ocx-mirror']['install_nonblank']=9  # non-blank count up to line 15 checked below
up=[k for k in d if k.split('_')[0] not in('grimoire-rs','ocx-sh','michael-herwig')]; fl=[k for k in d if k not in up]
def tri(g,i): return sum(int(CAD[k][i]) for k in g)
for n,g in(('up',up),('fleet',fl)):
    print(n,len(g),'C',tri(g,0),'A',tri(g,1),'D',tri(g,2),'all3',sum(1 for k in g if CAD[k]=='111'),'logo',sum(1 for k in g if k in LOGO),'demo',sum(1 for k in g if k in DEMO),'chartonly',sum(1 for k in g if k in CHART))
import json as j
def row(k):
    v=d[k]; m=j.load(open(f'meta/{k}.json')); r=j.load(open(f'meta/{k}.rel.json')); og=open(f'meta/{k}.og').read().strip()=='true'
    name=m['r']
    demo=(str(DEMO[k])+('c' if k in CHART else '')) if k in DEMO else '-'
    ins=v['install_nonblank'] if v['install_src_line'] else '-'
    insl=v['install_src_line'] or '-'
    if k=='ocx-sh_ocx-mirror': ins=10
    return f"| {name} | {m['stars']} | {v['lines']} | {v['headings']} | {v['badges_fs']} | {LOGO.get(k,'-')} | {demo} | {insl} / {ins} | {CAD[k]} | {m['topics']} | {'y' if og else 'n'} | {r['withbody']}/{r['n']} |"
H="| repo | stars | lines | headings | badges (first 40) | logo pos | demo pos | install src line / non-blank pos | C A D | topics | custom social image | releases with body / sampled |\n|---|---|---|---|---|---|---|---|---|---|---|---|"
open('table_up.md','w').write(H+"\n"+"\n".join(row(k) for k in up)+"\n")
open('table_fleet.md','w').write(H+"\n"+"\n".join(row(k) for k in fl)+"\n")
```

## Appendix B - distribution and metadata snippets

Quartiles for the tables above (run in the exemplar directory after `analyze.py`):

```bash
python3 -I - <<'EOF'
import json,statistics as st
d=json.load(open('analysis.json'))
up={k:v for k,v in d.items() if k.split('_')[0] not in('grimoire-rs','ocx-sh','michael-herwig')}
fl={k:v for k,v in d.items() if k not in up}
def q(xs):
    xs=sorted(x for x in xs if x is not None); n=len(xs)
    return dict(n=n,min=xs[0],p25=xs[n//4],med=st.median(xs),p75=xs[(3*n)//4],max=xs[-1])
for name,g in(('up',up),('fleet',fl)):
    for f in('lines','words','headings','badges_fs','badges_all','install_src_line','install_nonblank','desc_pos'):
        print(name,f,q([v[f] for v in g.values()]))
    for f in('install_fs','usage_fs','why_any','why_strict','docs_fs','docs_any'):
        print(name,f,sum(1 for v in g.values() if v[f]),len(g))
    print(name,'noinstall',sum(1 for v in g.values() if v['install_src_line'] is None))
EOF
```

Metadata aggregation ("meta aggregation"):

```bash
python3 -I - <<'EOF'
import json,glob,os,statistics as st
rows=[]
for p in sorted(glob.glob('meta/*.json')):
    if p.endswith('.rel.json'): continue
    k=os.path.basename(p)[:-5]
    m=json.load(open(p)); r=json.load(open(f'meta/{k}.rel.json')); og=open(f'meta/{k}.og').read().strip()=='true'
    fleet=k.split('_')[0] in('grimoire-rs','ocx-sh','michael-herwig')
    rows.append((k,fleet,m['desc'],m['topics'],og,r['n'],r['withbody'],r['avglen'],m['stars'],m['home']))
for name,f in(('upstream',False),('fleet',True)):
    g=[x for x in rows if x[1]==f]
    print(name,len(g),'desc-missing',sum(1 for x in g if not x[2]),'topics med',st.median(x[3] for x in g),'topics0',sum(1 for x in g if x[3]==0),'og custom',sum(1 for x in g if x[4]),'repos w/releases',sum(1 for x in g if x[5]>0),'all-10-with-body',sum(1 for x in g if x[5]>0 and x[5]==x[6]),'avglen med',st.median(x[7] for x in g if x[5]>0),'homepage set',sum(1 for x in g if x[9]),'desc len med',st.median(len(x[2] or '') for x in g if x[2]))
EOF
```
