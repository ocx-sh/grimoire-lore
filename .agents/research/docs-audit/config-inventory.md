---
title: Fleet AI-config inventory for documentation
agent: docs-audit-worker
model: sonnet
scope: /home/mherwig/dev/*/ — .claude, .agents, .cursor, .github, .kiro, .roo AI config touching docs/README/changelog/prose, excluding node_modules, .git, target, dist, .vitepress/cache, .serena, .tmp*, pytest fixtures, worktree duplicates
method: find + grep -l over candidate config paths, git remote/log dedup of worktree clones, full reads of the four named ocx files, targeted grep -liE sweeps per gap-checklist term (commands inlined below each result)
date: 2026-09-05
---

# Fleet AI-config inventory for documentation

## Headline numbers

- **Canonical repos with a docs/website tree: 12, not 13.** `ocx-save` shares
  `git remote get-url origin` (`git@github.com:ocx-sh/ocx.git`) with `ocx`
  itself — its last commit is `2026-03-13` (`d83e9275`) vs `ocx`'s
  `2026-09-05` tip (`07bcd6b7`). It is a stale second clone of the same repo,
  not an independent adopter. `docs-frame.md:44` counts it as a 13th row.
- **Docs-authoring rule/skill/agent content exists in exactly 2 independent
  repos** (deduped by git remote): `ocx-sh/ocx` and `grimoire-rs/grimoire`.
  Everywhere else it is either a worktree copy of one of those two, a
  vendored `external/ocx` git submodule (`ocx-mcp`, `ocx-mirror`), or absent.
  `ocx-catalog` (560 md files), `grimoire-indexer` (55), `ocx-mirror-sdk`
  (45), `ocx-sdk-python` (35), `ocx-indexbot` (33), `grimoire-lore` itself
  (72) have **zero** docs-authoring config.
- **docs-frame.md:47 is wrong**: "Existing AI config that already governs
  documentation, all in `ocx`" is contradicted by `grimoire`'s own
  `.claude/rules/docs-style.md` (124 lines) and `.claude/skills/docs/SKILL.md`
  (46 lines) — hand-forked from ocx's, not shared via `grim install` despite
  `grimoire` being the OCI package manager this very research feeds.
- **Mechanical-verification ratio, docs-site prose family**: 0 of ~30
  distinct normative statements in `ocx/.claude/rules/docs-style.md` cite a
  runnable check (`grep -c '\`\`\`'` on the file found 4 fenced examples, 0 of
  them a shell command; `grep -nE 'rg |grep |task verify'` across all 5 ocx
  docs files found exactly one hit: `subsystem-website.md:230`, a whole-site
  build gate, not a per-rule lint).
- **Mechanical-verification ratio, code-doc family**: 11 of 12 rules in
  `bob/.claude/rules/rust-quality/docs-and-tracing.md` (propagated verbatim
  into the `ocx` family as `rust-quality/docs-and-tracing.md`) cite an exact
  `rg`/`grep`/CI-flag check inline in the rule table (`docs-and-tracing.md:29-40`).
  This is the single most rigorously-verified documentation rule in the
  fleet, and it governs rustdoc, never docs-site prose.
- **Zero hits, fleet-wide**, for: `llms.txt` on a devtools docs site (the one
  `llms.txt` hit is `ocx-marketing/.claude/skills/ai-seo/SKILL.md:3`, a
  marketing-SEO skill, not a docs-site concern), Vale/textlint/Flesch/reading-level,
  a docs feedback widget or search-analytics/zero-result mining, an automated
  link checker (lychee/markdown-link-check), WCAG/alt-text for docs images,
  or an information-architecture method (top-tasks, card-sorting, JTBD —
  those three terms appear only inside `ocx-marketing`'s customer-research
  skills, aimed at product positioning, not docs navigation).
- **Tested-example mechanism (asciicast) is unique to one repo family.** `grep
  -liE 'asciinema|asciicast'` over all 1202 candidate files hits only
  `ocx/.claude/rules/subsystem-website.md` (+ its 3 worktree copies), plus a
  stale mention in `ocx-save`'s old `documentation` skill. `ocx-catalog`,
  also VitePress with 560 pages, has no equivalent.

## Method (every number above and below is re-runnable)

```bash
cd /home/mherwig/dev
# candidate AI-config files across the fleet (axis 1 patterns)
find . -path '*/.claude/rules/*.md' -o -path '*/.claude/skills/*/SKILL.md' \
     -o -path '*/.claude/agents/*.md' -o -iname 'CLAUDE.md' -o -iname 'AGENTS.md' \
     -o -path '*/.cursor/rules/*' -o -path '*/.github/copilot-instructions.md' \
     -o -path '*/.github/instructions/*.md' -o -iname '.windsurfrules' \
     -o -path '*/.roo/*' -o -path '*/.kiro/steering/*' 2>/dev/null \
  | grep -vE '/node_modules/|/\.git/|/target/|/dist/|\.vitepress/cache|/\.serena/|/\.tmp/|/\.worktrees/|pytest-of-|material-clone|/\.probe-|/\.tmp-|/\.agents/worktrees/' \
  > candidates.txt   # 1202 files after exclusion (2223 before excluding worktree/pytest noise)

# doc-relevant filenames
grep -iE '(doc|readme|changelog|style|writing|prose)' candidates.txt

# per-term gap sweeps (each run as: grep -liE '<term>' $(cat candidates.txt))
# terms used: llms\.txt|llms-full ; readability|flesch|\bvale\b|textlint|reading.level|grade.level ;
# changelog ; alt text|screen reader|\bwcag\b ; link.?check|linkcheck|broken link|dead link|link rot ;
# zero.result|search analytics|algolia|docsearch ; quickstart|quick.start|getting.started ;
# versioned docs|docs? version|i18n|localization ; top.tasks|card.sort|tree.test|jobs.to.be.done|\bjtbd\b|information architecture ;
# asciinema|asciicast ; was this (page|helpful)|docs? feedback|page views|docs? analytics

# dedup worktrees/clones by remote
for d in ocx ocx-evelynn ocx-sion ocx-soraka ocx-save ocx-mirror ocx-mcp grimoire grimoire-duo \
         grimoire-wt-opencode-jsonc index index-claims index-fix67 bob creeptd-ng; do
  git -C "$d" remote get-url origin 2>/dev/null
done
git -C ocx worktree list   # shows ocx-evelynn/ocx-sion/ocx-soraka as registered worktrees of ocx
git -C ocx-save log -1 --format='%ci %H'   # 2026-03-13, vs ocx tip 2026-09-05
```

## Axis 1 — Fleet inventory, deduped by canonical repo

Worktree/clone dedup: `ocx`, `ocx-evelynn`, `ocx-sion`, `ocx-soraka` are one
`git worktree list` set on `ocx-sh/ocx`. `ocx-save` is a second, stale,
non-worktree clone of the same remote. `index`/`index-claims`/`index-fix67`
share `ocx-sh/index`. `grimoire`/`grimoire-duo`/`grimoire-wt-opencode-jsonc`
share `grimoire-rs/grimoire`. `ocx-mcp` and `ocx-mirror` vendor `ocx` as a git
submodule at `external/ocx` (`ocx-mcp/.gitmodules:2`) — that subtree is a
verbatim copy, not independent config. Rows below are one line per canonical
repo; "instances" notes how many on-disk copies exist.

| Repo (canonical) | File | Lines | Activation | Instances on disk |
|---|---|---|---|---|
| `ocx-sh/ocx` | `.claude/rules/docs-style.md` | 163 | glob `website/**` | 6 (4 worktrees + 2 submodule vendors in ocx-mcp/ocx-mirror) |
| `ocx-sh/ocx` | `.claude/skills/docs/SKILL.md` | 53 | on-demand (skill) | 6 |
| `ocx-sh/ocx` | `.claude/agents/worker-doc-writer.md` | 111 | on-demand (subagent) | 7 (+ own copy in `ocx-mcp`, `ocx-mirror` top level) |
| `ocx-sh/ocx` | `.claude/agents/worker-doc-reviewer.md` | 109 | on-demand (subagent) | 8 (also standalone in `index`/`index-claims`/`index-fix67`, not from ocx template — separately authored, see axis 3) |
| `ocx-sh/ocx` | `.claude/rules/subsystem-website.md` | 229 | glob `website/**` | 4 |
| `ocx-sh/ocx` | `.claude/rules/rust-quality/docs-and-tracing.md` | 168 | glob (rust-quality family) | 6, propagated from `bob` (no remote — standalone rule-authoring workspace) |
| `ocx-sh/ocx` | `.claude/artifacts/adr_tested_doc_command_mechanism.md` | 740 | reference doc (ADR) | 1 |
| `grimoire-rs/grimoire` | `.claude/rules/docs-style.md` | 124 | glob `docs/**` | 3 (fork of ocx's, adapted for mdBook) |
| `grimoire-rs/grimoire` | `.claude/skills/docs/SKILL.md` | 46 | on-demand | 3 |
| `ocx-sh/marketing` (`ocx-marketing`) | `.claude/skills/copywriting/SKILL.md` | 252 | on-demand | 1 |
| `ocx-sh/setup-ocx` + `ocx-sh/www-setup` | `.claude/rules/update-docs.md` | 22 / 39 | always-on (no `paths:`) | 2 independently-written files, not a fork pair (`diff` shows real content differences) |
| `creeptd-ng` (no remote) | `.claude/rules/doc-sync.md` | 45 | glob (`services/**`, `crates/**`, CI, subsystem rules) | 1 |
| `ocx-sh/index` | `.claude/agents/worker-doc-writer.md` + `worker-doc-reviewer.md` | — | on-demand | 3 (index/index-claims/index-fix67, one repo) |
| `bob` (no remote, standalone) | `.claude/rules/rust-quality/docs-and-tracing.md` | 168 | glob | 1 (source), 5 downstream copies in the ocx family |
| — (no repo) | any `docs-quality`/style rule in `ocx-catalog`, `grimoire-indexer`, `ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-indexbot`, `kate-middlechild`, `grimoire-lore` | 0 | — | **absent** — confirmed by listing each repo's full `.claude/` + `.agents/` tree and finding no docs/style/prose/readme/changelog-named file |

`kate-middlechild`'s `subsystem-content.md` and `i18n-translator.md`
(`kate-middlechild/.claude/agents/i18n-translator.md`) looked like docs hits
on the `docs|content` grep but are recipe-data-model and UI-translation rules
for a Filipino-cuisine site ("Lutong Pinoy") — false positives, excluded.

## Axis 2 — The four named ocx files, rule by rule

`docs-style.md` (163 lines, glob `website/**`) + `skills/docs/SKILL.md` (53
lines) + `agents/worker-doc-writer.md` (111 lines) + `rules/subsystem-website.md`
(229 lines, same glob).

| Rule | Verifiable how | Portable | Why |
|---|---|---|---|
| Narrative: idea → problem → solution, then depth (`docs-style.md:15-21`) | reading opinion | yes | domain-neutral structure; ocx-specific only in the worked example |
| No marketing-tone openers (`docs-style.md:23`, checklist `worker-doc-writer.md:` "No marketing language") | reading opinion (word-list grep possible: "powerful", "seamlessly", "revolutionary" are named) | yes, with parameterisation | the banned-word list is stated in the checklist but never wired to a grep |
| Short paragraphs, one idea each (`docs-style.md:27-31`) | reading opinion | yes | generic prose craft |
| Short, TOC-readable headers + `{#parent-subsection}` anchors (`docs-style.md:35-40`) | half-mechanical — anchor presence is a one-line grep (`^## .*\{#`), never stated as one | yes | anchor convention is VitePress-specific syntax but the practice (stable custom anchors) generalizes |
| Reference-style links only, defs at file bottom, grouped by comment (`docs-style.md:104-124`) | **mechanical, unimplemented** — `grep -n '\]\(https\?://' <file>` catches every inline-link violation in one line | yes | this is the rule most ready to gain a lint and doesn't have one |
| Every external tool hyperlinked, every occurrence (`docs-style.md:44-49`) | reading opinion (would need an entity list to grep against) | yes, with a maintained term-list | currently unverifiable even in principle without that list |
| Analogies in `:::info`, not inline (`docs-style.md:54-62`) | reading opinion | no as written — `:::info` is VitePress syntax; portable as "analogies go in a collapsible aside" | callout syntax is the site's, not the principle's |
| 4 pinned precision/nuance facts about OCX tags/cascade (`docs-style.md:66-73`) | reading opinion, and inherently repo-specific | **no** | these are correctness facts about *this* product, not a transferable rule |
| Tooltip good/bad candidates (`docs-style.md:77-84`) | reading opinion | yes, `<Tooltip>` is a common docs-site pattern | component name is ocx's, the UX rule is generic |
| Callout-type table (info/tip/warning/details) (`docs-style.md:88-96`) | reading opinion | yes | near-universal VitePress/Docusaurus/Starlight vocabulary |
| Internal links must point at real content, not empty stubs (`docs-style.md:100-102`) | **mechanical** — a link checker (lychee) catches this in one CI step | yes | textbook link-hygiene, currently enforced only by `task website:build` catching *dead* anchors, not *empty* ones |
| Vue component catalog (`subsystem-website.md:53-100`) | n/a (reference, not a rule) | no | literally this site's component API |
| Reference-page contract: purpose sentence + flags table + behavioral notes + error conditions (`worker-doc-writer.md:` "Reference Pages" section) | reading opinion, but checkable by a schema (every CLI flag has 4 named fields) | yes | this is close to a portable reference-page contract already |
| Changelog format `### [version] - YYYY-MM-DD` + `#### Added/Changed/Fixed/Removed` (`worker-doc-writer.md:` "Changelog" section) | **mechanical** — matches Keep a Changelog's own regex-checkable format | yes, this *is* the Keep a Changelog convention, uncredited | not ocx-specific at all despite living only here |
| Build-gate: `task website:build` catches broken links/schema drift (`subsystem-website.md:230`) | **mechanical**, whole-site, coarse | no (task name is repo-specific) but the pattern (docs build as a CI gate) is universal | only mechanical check in the whole 4-file set |
| `worker-doc-reviewer.md`'s trigger matrix (source-file pattern → doc file → section) (`worker-doc-reviewer.md:15-28`) | **agent-mediated**: a structured procedure an LLM subagent executes, not a deterministic lint, but far more systematic than the other files | yes as a pattern (a trigger-matrix mapping code surfaces to doc sections) | the matrix rows are ocx's own file paths; the mechanism generalizes cleanly |

## Axis 3 — Classification and contradictions

**Portable principles** (present in ≥2 independent repos, or independent of
any repo path): narrative idea→problem→solution structure, reference-style
links collected at file bottom, "no marketing tone", analogy call-outs kept
out of main prose, custom stable anchors, the Keep-a-Changelog-shaped
changelog format, "read source before documenting, never from memory."

**Repo-specific instances**: the OCX tag/cascade precision facts
(`ocx/.claude/rules/docs-style.md:66-73`), the Vue component catalog
(`subsystem-website.md`), the `client_target.rs` table-parity test
(`grimoire/.claude/rules/docs-style.md:82-91` — Grimoire-only, no ocx
equivalent), the asciicast/`<Terminal>` mechanism (ocx-only, not in
`ocx-catalog` despite same VitePress base).

**Contradicted across repos**: none of the docs-writing rules directly
conflict in content — `grimoire`'s version is a strict subset-plus-one of
`ocx`'s (same narrative/link/header rules, minus VitePress-only bits, plus
the client-matrix rule). The real contradiction is structural, not
content-level: `creeptd-ng/doc-sync.md` treats docs as **code-adjacent and
review-blocking** ("doc-sync violation is a Block finding", `doc-sync.md:33`)
while the `ocx`/`grimoire` family treats docs as a **separate writing pass**
handed off to a dedicated `worker-doc-writer` after code lands. Same fleet,
two incompatible models of *when* documentation debt becomes a blocking
defect.

## Axis 4 — Gaps against the checklist

No repo, anywhere in the fleet, has AI config for: landing-page anatomy,
use-case tiers (first-steps → everyday → integration → edge-reference),
a stated quickstart *contract* (vs. the word "quickstart" appearing only as
a filename in unrelated CLI/HTTP rules), a reference-page contract as a
named, reusable pattern (ocx has the shape inline in one agent file but
never names it as a contract), navigation-depth rules, docs search
(Algolia/DocSearch/zero-result mining — zero hits), plain-English
measurement (no Vale, textlint, Flesch, or grade-level tooling anywhere),
docs observability (no analytics, no feedback widget, no search-log
mining), accessibility of docs (no alt-text/WCAG rule outside unrelated
React-a11y rules in `kate-middlechild`), docs versioning, `llms.txt` for a
devtools site (the only `llms.txt` mention is marketing SEO, not docs),
link hygiene as an automated gate (only as a manual checklist item), or
image/screenshot-vs-recording guidance (the one recording mechanism, ocx's
asciicast pipeline, has no accompanying "prefer a recording over a static
screenshot" rule — it only covers *how* to record, not *when*).

## Axis 5 — Mechanical verification vs. reading instruction

Counted per distinct normative rule (a bulleted/tabled statement with its
own claim), across the two canonical docs-authoring rule families plus the
one canonical code-doc family, each counted once regardless of how many
worktree copies exist:

| Family | Rules counted | Cite a runnable check | Ratio |
|---|---|---|---|
| `ocx` docs-site prose (`docs-style.md` + `SKILL.md` + `worker-doc-writer.md` + `worker-doc-reviewer.md`, excluding `subsystem-website.md`'s reference tables) | ~34 | 1 (`task website:build`, cited 3×, catches link/schema drift only) | 1/34 |
| `grimoire` docs-site prose (fork of the above) | ~26 | 1 (`client_target.rs` table-parity test, `docs-style.md:82-91`) | 1/26 |
| `creeptd-ng` `doc-sync.md` | 6 | 0 now, 2 explicitly "tracked, not built yet" (`doc-sync.md:38,41`) | 0/6 |
| `setup-ocx`/`www-setup` `update-docs.md` | ~14 | 0 | 0/14 |
| `ocx-marketing` `copywriting/SKILL.md` | ~12 core principles | 0 | 0/12 |
| `bob` → `ocx` family `rust-quality/docs-and-tracing.md` (rustdoc, not docs-site) | 12 (DOC-01…DOC-12) | 11 (`docs-and-tracing.md:29-40`, each with an inline `rg`/`grep`/CI-flag command) | 11/12 |

**Fleet-wide ratio, docs-site-prose rules only** (the family this program's
output must extend): **2 mechanical checks out of ~92 individual rules**,
and both of those two are coarse (whole-build, or one specific table) rather
than per-rule lints. Every "no inline links", "hyperlink every external
tool", "no marketing language" rule — the ones most amenable to a grep — has
none. The fleet's one rigorously-verified documentation rule set
(`docs-and-tracing.md`, 11/12) exists for **code** documentation, and its
verification pattern (one `rg`/`grep` command per rule, inlined in the same
table row as the rule) is the template to copy, not anything in the
docs-site family.

## Corrections to the frame

- `docs-frame.md`'s 13-repo fleet table is 12 independent repos; `ocx-save`
  is a stale clone of `ocx` (`git remote get-url origin` matches, last
  commit 2026-03-13 vs `ocx`'s 2026-09-05 tip).
- `docs-frame.md:47`'s claim that docs-governing AI config is "all in `ocx`"
  is false: `grimoire-rs/grimoire` has its own hand-forked copy, and it adds
  a rule (`client_target.rs` table-parity) ocx doesn't have.
- The frame's hypothesis that "AI slop" tells and plain-English measurement
  matter (hypothesis #5) is **not contradicted but is entirely unaddressed**
  by anything on disk — zero tooling anywhere in the fleet checks for it;
  it is 100% greenfield for this program, not a refinement of existing
  practice.
- Hypothesis #6 (tested asciicast examples are best practice) holds up as
  *ocx's* practice but is unreplicated even by its sibling `ocx-catalog`
  (same VitePress base, 560 pages, no test-doc mechanism at all) — so it is
  best practice in exactly one repo, not fleet-established practice.
