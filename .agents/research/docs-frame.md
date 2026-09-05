---
title: Documentation design — phase 0 frame
program: docs
date: 2026-09-05
method: research-lang (adapted for a non-language domain)
status: active
---

# Documentation design — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The domain and its era

Documentation design for software projects: landing pages, use-case-centric
guides, and reference documentation, plus the UX around them (navigation,
search, examples, interactive elements) and the observability that tells a
maintainer whether the docs work. Era: September 2026. Relevant shifts to
check rather than assume: AI-assisted search and chat in docs sites, `llms.txt`
and agent-readable docs, VitePress 2, Docusaurus 3, Starlight, Mintlify,
asciinema v3 and asciicast v3, tested-docs tooling.

## The codebases that will adopt the output

The fleet under `/home/mherwig/dev`. Measured 2026-09-05 with `find -name
'*.md'` excluding `node_modules`, `.git`, `target`, `.claude`, `.agents`,
`.serena`:

| Repo | Docs surface | Markdown files |
|---|---|---|
| `ocx` | `website/` — VitePress, `<Terminal>` asciicast component, tested doc scripts | 92 |
| `ocx-catalog` | `docs/` — VitePress | 560 |
| `creeptd-ng` | `docs/` | 322 |
| `ocx-mirror` | `docs/` | 93 |
| `grimoire` | `docs/` | 84 |
| `ocx-mcp` | `docs/` | 60 |
| `grimoire-indexer` | `docs/` — Astro | 55 |
| `ocx-mirror-sdk` | `docs/` | 45 |
| `ocx-sdk-python` | `docs/` | 35 |
| `ocx-indexbot` | `docs/` | 33 |
| `kate-middlechild` | `docs/` — Tailwind v4 site | 29 |
| `ocx-save` | `website/` | 22 |
| `grimoire-lore` | `docs/` companions + README, rendered by `@grimoire-rs/indexer` | 72 |

Existing AI config that already governs documentation, all in `ocx`:
`.claude/rules/docs-style.md` (163 lines, globs `website/**`),
`.claude/skills/docs/SKILL.md` (53 lines), `.claude/agents/worker-doc-writer.md`,
`.claude/rules/subsystem-website.md`. Plus the accepted ADR
`.claude/artifacts/adr_tested_doc_command_mechanism.md` (2026-05-17): every
documented command is an acceptance-tested `.sh` script under `test/`, cast
generation is opt-in per script via `# cast: true`, and the `<Terminal>` Vue
component renders the `.cast` file. That mechanism is the owner's stated best
practice and must be reflected in the shipped artifact.

## The requester's hypothesis (to test, not to accept)

1. Big-company style guides and design systems (Google, Microsoft, Apple,
   Meta) hold most of what matters about docs design.
2. Documentation has three kinds worth separating: landing page, use-case
   centric guides, reference. Each needs its own rules.
3. The missing piece in most docs is a use-case tier model: first steps,
   then everyday tasks, then elaborate integration, then edge reference. A
   project should research its own most-prominent use cases in that order.
4. UX and observability of the docs are under-served by existing guidance.
5. Plain English matters, and "AI slop" tells (em-dash, semicolon, stacked
   clauses, hedging) make docs hard to read.
6. Tested examples embedded as real asciicasts are best practice.
7. Existing AI skills and rules for docs writing exist online and their
   design should be incorporated rather than reinvented.

The scouts must find what this list does not name. Candidates the frame
suspects but did not verify: information architecture methods (top tasks,
card sorting, tree testing, JTBD), reading-level measurement, docs as code
and CI gates for docs, versioned docs, i18n, accessibility of docs sites,
API reference generation, changelog and migration guides, error-message
docs, docs for AI agents as readers, search zero-result mining, link rot.

## The artifact set (hypothesis)

Per `research-lang/references/rule-distillation.md`: rules carry standards,
skills carry procedures.

| Artifact | Kind | Carries |
|---|---|---|
| `docs-quality` (working name) | Glob-scoped rule + support directory | The standards: page-type contracts, plain English, examples, navigation, search, tested examples and casts, observability hooks |
| `docs-plan` (working name) | Skill | The procedure: discover the project's use-case tiers, research what matters, map tiers to page types, instrument the docs, close the loop |
| `docs-essentials` | Bundle | The two above, members untagged |

Open glob question for the map: `**/*.md` loads on every markdown file in
every repo, including AI config and research notes. A narrower glob
(`docs/**`, `website/**`, `**/*.mdx`, site configs) can miss. The
`globs-must-not-miss` decision says wide plus a tight index beats narrow.
The grounding wave measures where docs actually live before this is decided.

## Constraints the shipped artifacts must meet

- Written in the plain English they prescribe. No em-dash, no semicolon in
  prose, short sentences, one idea per sentence. This diverges from the
  house style of the other rule sets in this repo, on purpose.
- Every rule carries a verification. For prose rules that means a lint
  (Vale, textlint, a grep, a readability script), not a reading opinion.
- Rule IDs `DOC-<FAMILY>-nn`. `DOC-` is reserved for this set.
- Index under 200 lines. Skill body under 500 lines.
- Portable: no fleet paths, no ocx-internal component names in the shipped
  files. The ocx mechanism is presented as the worked example of a pattern.

## Corrections

Appended by later waves. Where a correction disagrees with the body above,
the correction wins.

### Wave 1 grounding (2026-09-05)

Sources: `docs-audit/config-inventory.md`, `docs-audit/docs-shape.md`,
`docs-audit/tested-examples-mechanism.md`, `docs-audit/ux-observability-posture.md`.

1. **The fleet table above is wrong in method and in facts.** It counted
   whole-repo markdown, not the docs surface. Re-run with build artifacts,
   stale worktrees and vendored submodules excluded: ocx-catalog has 23 docs
   pages, not 560 (the rest is `.lhci-bulk/` Lighthouse reports and index
   dumps); creeptd-ng has 2, not 322 (the rest sat in `.worktrees/`). The
   fleet is 12 independent repos, not 13: `ocx-save` shares ocx's git remote
   and is a stale clone frozen 2026-03-13. Deduplicated by remote and branch
   there are 23 distinct docs surfaces, 248 pages, ~349k prose words.
2. **Generators.** ocx-catalog and grimoire-indexer run MkDocs Material
   9.7.7, not VitePress and Astro. Real docs sites: 9. Seven MkDocs Material,
   one VitePress (ocx), one mdBook (grimoire). find_ocx is Sphinx/rst and
   invisible to markdown-only tooling. creeptd-ng, kate-middlechild and
   grimoire-lore have a `docs/` directory with no site, nav or search.
3. **Existing config is not "all in ocx".** grimoire-rs/grimoire carries its
   own fork of `docs-style.md` and the docs skill, and adds a rule ocx lacks:
   a build-time table-parity test (`client_target.rs`) that fails when a docs
   table drifts from code. Across ~92 prose rules in the fleet, 2 cite a
   runnable check. The strongest verified documentation rule in the fleet is
   bob's rustdoc rule (11 of 12 rules carry an inline grep), which is a shape
   to copy.
4. **Tested examples: two mechanisms, and the cast is the minority layer.**
   ocx has 66 acceptance-tested doc scripts bound to pages by header metadata;
   35 opt into a cast, 31 are transcluded as plain code. The drift gate is the
   acceptance test, not the recording. ocx-sdk-python independently tests
   every doc example with Sybil and doctest and records nothing. ocx's
   generated `.cast` files are asciicast v2 while its player is v3-capable
   (v3 spec 2025-09-10). ocx's `<Terminal>` has no documented pause control
   or reduced-motion fallback. The pattern to ship is "every documented
   command is a test"; the cast is an optional view on a passing test.
5. **Hypothesis 2 (three kinds) is overturned.** Every canonical source that
   names types uses at least four (tutorial, how-to, reference, explanation).
   GitLab adds troubleshooting as a fifth. A landing page is a navigation
   layer above them, not a peer type. And the use-case TIER (first steps,
   everyday, integration, edge) is an axis independent of the content TYPE:
   uv and Astro run both at once. The rule must not map tiers onto types.
6. **Hypothesis 5 (em-dash as AI tell) needs relabelling.** The fleet
   measures 18.3 em-dashes and 5.8 semicolons per 1000 words, median Flesch
   51.6. But a 2026 study puts GPT-4.1 at 10.6/1000 against a 3.2 human
   baseline with human outliers inside the AI range, so an em-dash ban is a
   house-style choice, not a detector. GitLab bans em-dash, semicolon and
   curly quotes for translation and terminal-rendering reasons and lands on
   the same list. The checkable plain-English proxies are GOV.UK's numbers
   (split sentences over 25 words, at most 5 sentences per paragraph) and a
   readability grade, with a carve-out for reference pages full of
   identifiers. Vale's only shipped readability threshold fires at
   suggestion severity, never error.
7. **Hypothesis 1 is half right.** Big-company style guides own word and
   sentence level. Page-type architecture comes from Diataxis. Docs-site UX
   evidence comes from Nielsen Norman Group and GOV.UK. Observability comes
   from practitioner books and the DX literature, and from no style guide.
8. **Observability is absent, not weak.** 0 of 9 sites log zero-result
   searches, run analytics, or carry a feedback widget. The only measured
   gate is Lighthouse CI on two generator fixture sites. 0 of 248 pages
   classify as a tutorial.
9. **llms.txt is conditional.** Publisher adoption grew 8.8x in a year while
   97% of published files receive zero requests. What agents actually fetch
   is a markdown twin of the page (Cloudflare, Vercel, Stripe, Mintlify). An
   "if you are an agent" label changed nothing in a controlled test; an
   unambiguous instruction moved compliance from 33% to 100%.
10. **Existing AI docs skills.** Anthropic's doc-coauthoring skill carries no
    lint. Humanizer skills and Vale's AiTells package check a taxonomy of 20+
    tells far wider than the frame's four. No found skill encodes staleness
    detection, single-source checks, or zero-result mining. Wikipedia's
    "Signs of AI writing" is the richest codified tell list.

### Decisions taken by the orchestrator after the map (2026-09-05)

`docs-topic-map.md` lists seven questions for a human. The owner delegates
detail and oversees direction, so these are decided here with the assumption
stated. Each is reversible by editing one artifact. The two that remain the
owner's are marked.

| # | Question | Decision | Assumption |
|---|---|---|---|
| 1 | Em-dash and semicolon ban | The request asked for it. Ship it as a SHOULD house-style rule, labelled as style with a translation and terminal rationale, never as an AI detector. Retrofitting existing repos is out of scope. | The requester's wording ("non-ai slob, ie. using em-dash, semicolon") is a decision, not a hypothesis. |
| 2 | Supersede ocx's `docs-style.md` and grimoire's fork | **Owner.** The shipped artifact is portable and can be adopted per repo. This program does not edit either fork. | Migration is a separate task. |
| 3 | Commit `.cast` files | Research decides the default (`docs-examples`), shipped as a pinned default the adopter may override once. | Both fleet answers exist, so a default with an override beats a mandate. |
| 4 | Documentation debt blocks a merge | Ship both postures as a pinned choice the adopter names once in the rule's config block, with the fleet evidence for each. | **Owner** picks the fleet default. |
| 5 | Site-UX rules on a `docs/` tree with no site | Gate on a generator config file, as the map recommends. The depth file states its precondition. | A rule firing on content that cannot carry a nav or a search box produces false findings. |
| 6 | Vale as a dependency | Tiered gate. Tier 0 is grep and markdownlint, always. Tier 1 is Vale, when present, with a shipped config. No rule may depend on tier 1 alone for its only verification. | Twelve repos adding a Go binary is the owner's cost to accept; the rule must work without it. |
| 7 | May a prose gate fail red | Structural and drift checks fail red. Readability and tell counts report as warnings with a ratchet, the way the fleet's Lighthouse thresholds already work. | Vale's own readability threshold ships at suggestion severity. A red prose gate gets switched off. |

Artifact set after the map: one rule `docs-quality` with the six depth files
and a `checks/` directory the map names, two skills `docs-plan` and
`docs-instrument`, and a bundle `docs-essentials`. Glob: the two-tier,
config-anchored list in the map, not `**/*.md`.
