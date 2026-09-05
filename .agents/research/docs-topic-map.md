---
title: Documentation design — phase 3 topic map
program: docs
model: claude-opus-5[1m]
date: 2026-09-05
inputs:
  - .agents/research/docs-frame.md
  - .agents/research/docs-audit/config-inventory.md
  - .agents/research/docs-audit/docs-shape.md
  - .agents/research/docs-audit/tested-examples-mechanism.md
  - .agents/research/docs-audit/ux-observability-posture.md
  - .agents/research/docs-topic-map/canonical-guides.md
  - .agents/research/docs-topic-map/design-systems.md
  - .agents/research/docs-topic-map/exemplar-sites.md
  - .agents/research/docs-topic-map/codified-practice.md
  - .agents/research/docs-topic-map/failure-and-observability.md
  - .agents/research/docs-topic-map/recent-shifts-and-tooling.md
  - /home/mherwig/dev/ocx/.claude/rules/docs-style.md
---

# Documentation design — the topic map

## Method

The six scouts returned 203 candidate rows. Rows were merged when two scouts asked the
same question of the same object, keeping the more specific formulation and both sources
(five scouts proposed zero-result search mining, five proposed top-tasks discovery, four
proposed link-rot CI, four proposed llms.txt, five proposed a readability threshold — one
row each). Rows the four grounding audits produced but no scout named were added, marked
by their audit pointer. Coverage is checked against what the fleet's ~92 docs-prose rules
actually enforce, not what they say: `covered` means a rule exists **and** cites a runnable
check, `partial` means the rule exists without one or the check exists in one repo only.
Priority ranks leverage for this fleet — 9 real sites, 7 MkDocs Material, 1 VitePress,
1 mdBook, 0 observability, 0 tutorials, 2 verified rules out of ~92 — never leverage for
documentation in general. 174 rows survive: the deduplicated scout set plus the rows
the grounding audits produced that no scout named, each of which cites its audit.

## The map

### Group: docs-page-types

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| page-type-set | How many content types does the contract name, and is a landing page one of them? | uncovered | high | No fleet rule names a type set; `docs-frame.md` correction 5 already overturns the three-way split, and `docs-shape.md` §2 files 31.9% of 248 pages as "other" for want of one | docs-page-types |
| doc-type-declaration | Does every page declare its type in a way a lint can read? | uncovered | high | `config-inventory.md` axis 2: ocx's `worker-doc-writer.md` tells the writer to "identify Diátaxis type" and the enforced rule never checks it | docs-page-types |
| type-mixing-detection | What mechanical signature catches one page doing two types? | uncovered | high | `exemplar-sites.md` names mixing as the #1 documented mistake; ocx's `user-guide.md` is 13,789 words doing all of them (`docs-shape.md` §4) | docs-page-types |
| tutorial-how-to-conflation | Where does the tutorial/how-to line fall, and does the fleet have any tutorials to draw it on? | uncovered | high | `docs-shape.md` §2: 0 of 248 pages classify as tutorial; 17 "getting-started" pages are the entire first-steps tier | docs-page-types |
| tutorial-page-contract | What must a tutorial do per step — eliminate options, produce a visible result, end with a self-check? | uncovered | medium | `canonical-guides.md` states all three as hard requirements; nothing in the fleet exercises them yet | docs-page-types |
| eppo-vs-tutorial-linearity | Does "make every page self-contained" break the linear hand-holding a tutorial requires? | uncovered | medium | `canonical-guides.md` flags this as a cross-book conflict a naive merge would miss; bites the moment the fleet writes its first tutorial | docs-page-types |
| landing-page-contract | What must a docs landing page contain, in what order, and who is it explicitly for? | partial | high | `ux-observability-posture.md` §7: 9 landing pages, 0 with social proof, 1 stating "who is this for", ocx running 7 CTAs and two overlapping tile sets | docs-page-types |
| landing-page-no-hero | Does the landing page open with a command and task links instead of marketing prose? | partial | high | `exemplar-sites.md`: Stripe and uv cut the hero, Laravel keeps it; ocx keeps one and `ocx-save` shipped three literal Lorem Ipsum tiles | docs-page-types |
| landing-above-the-fold-budget | How many top-task links belong above the fold, at a mobile viewport? | uncovered | medium | `design-systems.md`: GOV.UK ties the constraint to a mobile traffic share; ocx's 7 CTAs have no hierarchy | docs-page-types |
| reference-page-contract | What fixed sections must a reference page carry? | partial | high | `config-inventory.md`: ocx has the shape inline in one agent file and never names it a contract; reference is 21.4% of the fleet's pages | docs-page-types |
| reference-mirrors-code | Does reference structure mirror the code/API structure, and how is drift detected? | partial | high | `docs-shape.md` §4: `command-line.md` is 34,298 words in one file; `tested-examples-mechanism.md` §3 shows it carries its own structural test | docs-page-types |
| reference-neutral-tone | Does reference prose stay descriptive — no opinion, instruction, or narrative frame? | uncovered | medium | `codified-practice.md` gives the check (pronouns and hedging verbs on a type-tagged page); cheap once types are declared | docs-page-types |
| autogen-reference-review-pass | Is generated API reference reviewed to strip internal detail before publishing? | uncovered | medium | 3 fleet sites use mkdocstrings; `docs-shape.md` §5 found `api.md` is a 4-line stub whose anchors exist only after a build | docs-page-types |
| single-vs-per-endpoint-reference | One long page per resource, or one page per item? | uncovered | medium | `exemplar-sites.md` shows both are deliberate; ocx picked single-page and produced a 34k-word file longer than 12 repos' whole docs surfaces | docs-page-types |
| troubleshooting-doc-type | Is there a troubleshooting type with a fixed error→cause→fix contract? | uncovered | high | `canonical-guides.md`: GitLab's fifth type; the fleet has one troubleshooting page and no contract for it | docs-page-types |
| explanation-type-absence | Does the doc set have an explanation type at all, or only steps and lookups? | uncovered | high | `recent-shifts-and-tooling.md` §14: the frame's three-way split has no slot for it; the fleet classifies 20 pages (8.1%) as concept by path alone | docs-page-types |
| page-opening-contract | Does a page open by stating scope, non-scope, and assumed prior knowledge? | partial | medium | `design-systems.md`: Google TW1's scope-and-prerequisite move; ocx's narrative rule has an idea/problem/solution shape but no non-scope statement | docs-page-types |
| tone-varies-by-page-type | Does tone shift by type (terse reference, warm tutorial) under one voice? | partial | medium | `design-systems.md`: Carbon and Mailchimp split voice from tone; ocx has precision rules and no tone policy | docs-page-types |
| docs-single-audience-per-page | When a page must serve two audiences, does it pick one? | uncovered | medium | `exemplar-sites.md` names this a top mistake; ocx's `user-guide.md` serves everyone at 13,789 words | docs-page-types |
| stub-page-policy | When is a stub page worse than no page? | uncovered | high | `docs-shape.md` §4: 24.6% of the fleet's 248 pages are stubs under 150 words; `ocx-mirror-sdk` is 33 of 35 | docs-page-types |
| changelog-vs-release-notes | Are a terse changelog and narrative release notes separate contracts? | partial | medium | `config-inventory.md`: ocx encodes Keep a Changelog's format uncredited in one agent file; 7 changelog pages fleet-wide | docs-page-types |
| glossary-vs-tooltip | Inline definition, hover tooltip, or glossary page — and when does tooltip-per-term stop scaling? | partial | medium | ocx mandates `<Tooltip>`; no fleet repo has a glossary and nobody measures whether a tooltip is ever opened | docs-page-types |
| paradigm-currency-check | Does the doc teach only the current approach, or route readers through a dead one? | uncovered | medium | `design-systems.md`: react.dev's real failure; ocx already invented the marker (`<!-- moved-command-ok -->`, `tested-examples-mechanism.md`) without a rule behind it | docs-page-types |
| modular-microconventions | Single-step procedures as bullets, one command per block, a 50–300 char short description? | uncovered | low | `canonical-guides.md` (Red Hat); small, specific, and commonly gotten wrong by a template-follower | docs-page-types |

### Group: docs-use-case-discovery

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| top-tasks-discovery | How does a project find its own top tasks instead of guessing them? | uncovered | high | `config-inventory.md` axis 4: top-tasks, card-sorting and JTBD appear nowhere in the fleet except ocx-marketing's product-positioning skills | docs-use-case-discovery |
| top-tasks-sizing-small-project | Does the method survive at 0 users and 0 analytics? | uncovered | high | `failure-and-observability.md`: the pipeline assumes 100–400 voters; the fleet has none, and the 30-vote stabilization finding is the only lever that transfers | docs-use-case-discovery |
| friction-log-practice | Does anyone attempt the real task in persona and log the friction before a release? | uncovered | high | `failure-and-observability.md`: Stripe's toolkit is the one discovery method an agent can execute unaided | docs-use-case-discovery |
| user-need-template | Is each page backed by an `As a…/I need to…/so that…` need that names no solution? | uncovered | high | `design-systems.md` + `failure-and-observability.md`: the only falsifiable "why does this page exist" test found; nothing in the fleet states one | docs-use-case-discovery |
| tier-vs-content-type-axis | Are use-case tier and content type independent axes, or does a tier map to a type? | uncovered | high | `exemplar-sites.md` §3: uv and Astro run both at once; `docs-frame.md` correction 5 forbids the mapping the frame originally assumed | docs-use-case-discovery |
| tier-to-page-mapping-procedure | How does a discovered tier become a concrete set of pages and nav entries? | uncovered | high | This is the shipped skill's core output; no prior art found in any scout produces it end to end | docs-use-case-discovery |
| quickstart-step-budget | How many steps before a quickstart stops being one? | uncovered | high | `exemplar-sites.md`: every measured quickstart lands at 5–9 steps; `ux-observability-posture.md` §8 shows ocx reaches a result in 1 command after 185 words | docs-use-case-discovery |
| getting-started-tier-naming | Are getting-started, quickstart and tutorial three tiers or one page? | uncovered | high | `docs-shape.md` §2: the fleet has 17 getting-started pages and 0 tutorials — the naming *is* the tier model here | docs-use-case-discovery |
| organize-by-task-not-audience | Is nav organized by task rather than by persona or role? | uncovered | medium | `design-systems.md` (GOV.UK); `ux-observability-posture.md` §7 finds ocx-catalog is the fleet's only task-keyed landing | docs-use-case-discovery |
| issue-and-support-mining | Are issues mined on a cadence for repeated doc gaps? | uncovered | medium | `ux-observability-posture.md` §3: 0 of 9 sites has a docs-bug issue template; only ocx and grimoire have any templates at all | docs-use-case-discovery |
| content-deletion-from-tier-data | Does tier evidence license deleting pages, not only adding them? | uncovered | medium | `failure-and-observability.md`: Liverpool deleted 80% of 4,000 pages; the fleet's own version is a 24.6% stub rate nobody prunes | docs-use-case-discovery |
| jtbd-vs-top-tasks | Which method applies to a library with no measurable customer? | uncovered | low | `failure-and-observability.md` found no docs-specific JTBD source with a repeatable method — the absence is the finding | docs-use-case-discovery |
| exposure-hours | Does anyone watch a real person use the docs? | uncovered | low | Not executable by an agent fleet with no users; `failure-and-observability.md` sources it secondhand | docs-use-case-discovery |

### Group: docs-plain-english

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| readability-threshold | What numeric grade gates a page, and at what severity? | uncovered | high | `codified-practice.md`: the only shipped threshold anywhere is Vale's FK>8 at *suggestion*; `docs-shape.md` §3 puts the fleet median at Flesch 51.6 with no repo above 60 | docs-plain-english |
| readability-formula-choice | Which formula survives prose full of identifiers? | uncovered | high | `codified-practice.md`: every formula counts syllables, and `sha256`/`--flag-name`/`OCIImageIndex` break all of them; `docs-shape.md` §3 had to strip code and tables to get a number at all | docs-plain-english |
| readability-carve-out-for-reference | Does a reading-level target apply to reference pages? | uncovered | high | Reference is 21.4% of fleet pages; a blanket cap fails `command-line.md` by construction | docs-plain-english |
| sentence-length-cap | What is the maximum words per sentence? | partial | high | ocx says "short sentences" with no number; `docs-shape.md` §3 measures mean 19.5 and a 0.3–0.4 long-sentence share in the big repos; GOV.UK says 25 | docs-plain-english |
| paragraph-sentence-cap | What is the maximum sentences per paragraph? | partial | high | `docs-style.md:28` says "short paragraphs"; GOV.UK says 5 sentences, Microsoft says 3–7 lines | docs-plain-english |
| em-dash-ban-labelling | Is the em-dash and semicolon ban a detector or a house rule, and is it labelled honestly? | partial | high | `docs-shape.md` §3 measures 18.3 em-dash and 5.8 semicolons per 1,000 words; `recent-shifts-and-tooling.md` §5 puts GPT-4.1 at 10.6 against a 3.2 human baseline with Twain at 10.1 | docs-plain-english |
| ai-tell-taxonomy-coverage | Which of the 20+ documented tells does the shipped rule check, and which are aggregate-only? | partial | high | `codified-practice.md`: Wikipedia's essay and Vale's AiTells (17 rules, 6 at error) are five times the frame's four named tells | docs-plain-english |
| hedging-filler-check | Is hedging and filler grepped separately from punctuation tells? | uncovered | high | Distinct failure mode from the em-dash; no fleet rule checks it (`config-inventory.md` axis 4) | docs-plain-english |
| heading-structural-tells | Are heading-only sections, skipped levels, title case and bold mini-headings checked? | partial | high | `codified-practice.md`: markdownlint MD001/MD003/MD025/MD036 are off the shelf and no fleet repo runs markdownlint | docs-plain-english |
| passive-voice-budget | What passive rate is acceptable, measured rather than eyeballed? | uncovered | medium | `docs-shape.md` §3 measures 11.6/1,000 words by a documented-as-crude regex; Vale ships `Passive.yml` with no budget | docs-plain-english |
| modal-verb-precision | Are must/can/might used precisely instead of "should"? | uncovered | medium | `canonical-guides.md` (Google); a one-line grep with a clear reclassification action | docs-plain-english |
| timeless-language-grep | Are stale-prone words (now, currently, latest, soon) grepped? | uncovered | high | `canonical-guides.md`: Google publishes the literal blocklist, so the verification is free | docs-plain-english |
| self-referential-ban | Does the prose avoid writing about itself ("this page shows…")? | uncovered | low | `canonical-guides.md` (GitLab); trivial grep, low blast radius | docs-plain-english |
| marketing-tone-wordlist | Is the banned-word list wired to a grep, or only stated? | partial | high | `config-inventory.md` axis 2: the list is named in ocx's checklist and never wired — the rule most ready to gain a lint | docs-plain-english |
| inclusive-language-gate | Is alex/BiasFree-style checking wired into CI? | uncovered | medium | `codified-practice.md`: a three-decade corpus absent fleet-wide; subsumes the generic he/she grep | docs-plain-english |
| negative-contraction-avoidance | Are negative contractions avoided? | uncovered | low | `design-systems.md` (GOV.UK); weakly evidenced for a developer audience | docs-plain-english |
| prose-lint-tool-choice | Vale, textlint, markdownlint, Harper, or plain grep? | uncovered | high | `config-inventory.md`: zero prose tooling anywhere in the fleet; adding a Go binary to 12 repos is a real adoption cost | docs-plain-english |
| lint-rollout-thresholds | Warning-then-error, and touched lines only? | uncovered | high | `recent-shifts-and-tooling.md` §13: without `filter_mode: added` a lint over 348,917 existing prose words blocks every PR on day one | docs-plain-english |
| markdownlint-vale-boundary | Which linter owns which rule where both touch headings? | uncovered | medium | `codified-practice.md`: an unowned overlap risks two tools demanding opposite fixes | docs-plain-english |
| rule-without-a-lint-labelling | How is a rule that genuinely cannot be linted labelled? | uncovered | high | `docs-frame.md` requires a verification per rule; `config-inventory.md` axis 5 shows 2 of ~92 fleet rules have one | docs-plain-english |
| verified-rule-row-shape | What shape does a verified rule row take? | partial | high | `config-inventory.md` axis 5: bob's `docs-and-tracing.md` is 11 of 12 with an inline `rg` in the same table row — the shape to copy | docs-plain-english |
| explain-vs-link-on-first-use | Explain a term once, or hyperlink every occurrence? | partial | high | `docs-style.md:44-50` mandates a link on every occurrence; GOV.UK explains on first use; ocx carries 2,337 internal and 611 external links across 44 pages | docs-plain-english |
| links-per-page-cap | Is there a cap on link density per page? | uncovered | medium | `canonical-guides.md`: GitLab caps at ~15/page, which collides head-on with ocx's every-occurrence rule | docs-plain-english |
| link-style-lint | Is reference-style-only linking enforced by a lint? | partial | high | `config-inventory.md` axis 2 calls this the most mechanical unimplemented rule; `docs-shape.md` §5 counts 555 inline-style links in ocx against its own rule | docs-plain-english |
| line-length-wrap | Is doc source wrapped at a fixed column for diffability? | partial | low | Three guides give 80/80/100 (`canonical-guides.md`); affects diffs only, not readers | docs-plain-english |
| culture-bound-analogies | Are analogies to other tools an asset or a translation hazard, and who re-verifies them? | partial | high | `docs-style.md:54-64` mandates Nix/APT/SDKMAN analogies; `canonical-guides.md` records Google and Kubernetes forbidding exactly that, and ocx has no re-verification cadence | docs-plain-english |
| house-voice-sameness-cost | Does one shipped voice make every adopting project sound identical? | uncovered | medium | `codified-practice.md`: GitBook names the cost; this program ships one style across 12 repos | docs-plain-english |
| i18n-readability-portability | Does an English readability rule survive translation? | uncovered | low | `ux-observability-posture.md` §6: 0 of 9 sites has a locale directory — no adopter to break yet | docs-plain-english |

### Group: docs-examples

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| tested-example-gate | What makes a documented command a test, and what exactly fails CI when it goes stale? | partial | high | `tested-examples-mechanism.md`: ocx runs 66 acceptance-tested scripts on `task verify`, ocx-sdk-python runs Sybil, and neither is stated as a portable pattern anywhere | docs-examples |
| non-shell-tested-examples | How are Python, Rust and TypeScript snippets tested, not just shell commands? | partial | high | `recent-shifts-and-tooling.md` §8: ocx's mechanism reaches only `.sh`; the fleet is Rust plus Python plus TS, and only ocx-sdk-python has language-native coverage | docs-examples |
| untested-snippet-marking | How is an illustrative, deliberately non-runnable snippet marked? | partial | high | `docs-shape.md` §6 counts 343 untagged fenced blocks; `tested-examples-mechanism.md` shows ocx invented `<!-- moved-command-ok -->` for exactly this and never generalized it | docs-examples |
| example-page-binding | How does a page bind to the test that proves it, without coupling the two trees? | partial | high | `tested-examples-mechanism.md` §4/§6: the `# doc:` slug is the portable half of ocx's ADR — all 66 scripts bind to exactly one page with no orphans | docs-examples |
| tested-vs-displayed-equivalence | Is the command the page shows provably the command that ran? | partial | medium | `tested-examples-mechanism.md` §3 (EX10/DE6): ocx proves equivalence only modulo a parallel-isolation prefix — a rule claiming byte-identity would be wrong | docs-examples |
| drift-failure-ergonomics | Does a failing example name the doc page, not just the test file? | partial | medium | `tested-examples-mechanism.md` §3 (DG1-DG3): cheap, portable, and the reason the mechanism is usable at 66 scripts | docs-examples |
| structural-reference-drift-gate | Can a non-executing structural test cover an enumerative reference page? | partial | high | Two independent fleet implementations — ocx's `test_doc_command_reference.py` and grimoire's `client_target.rs` — and they are 2 of the fleet's 2 verified docs rules | docs-examples |
| cast-opt-in-policy | Is a recording default-on or opt-in per example? | partial | medium | `tested-examples-mechanism.md`: ocx opted in on 35 of 66; registry throughput caps useful parallelism at 4–8 workers, which is the real reason | docs-examples |
| cast-format-version | Which asciicast version does the recorder emit, and does the player read it? | uncovered | high | `canonical-guides.md` and `recent-shifts-and-tooling.md` §9 both checked: ocx emits v2 into a v3-capable player, and v3 is not backward compatible | docs-examples |
| cast-vs-tape-in-vcs | Is the recording committed, or the script that produces it? | uncovered | high | ocx gitignores all 35 casts (`tested-examples-mechanism.md` counts); grimoire commits one hand-recorded `demo.cast` and tells reviewers to read the diff | docs-examples |
| vhs-vs-asciinema | Script a reproducible demo, or record a real session? | uncovered | medium | `tested-examples-mechanism.md` records ocx rejecting VHS outright for one-tree reasons; `recent-shifts-and-tooling.md` §9 shows VHS text output is diffable in CI | docs-examples |
| terminal-demo-a11y | Does the embedded player have a pause control, a flash limit and a reduced-motion fallback? | uncovered | high | `ux-observability-posture.md` §5: ocx's `Terminal.vue` is 305 lines with no `prefers-reduced-motion`, no `tabindex`, no `aria-*` — the fleet's only animated component | docs-examples |
| recording-cost-budget | What does a recording pipeline cost per build, at the current script count? | partial | medium | `tested-examples-mechanism.md` §5 flags its own estimate as measured at 22 scripts and never re-run at 35 | docs-examples |
| code-sample-no-secrets | Are samples scanned for credentials and real identifiers before merge? | uncovered | medium | `canonical-guides.md` (Microsoft, GitLab both name it); nothing in the fleet checks | docs-examples |
| code-fence-language-required | Is every fence language-tagged? | partial | medium | `docs-shape.md` §6: 343 untagged blocks, per-repo tagged share 0.65–1.00; markdownlint MD040 is zero-config | docs-examples |
| omitted-code-marker | Are omissions marked with a real comment, never an ellipsis? | uncovered | low | `canonical-guides.md` (Google); a common LLM tic and a one-line grep | docs-examples |
| shell-prompt-convention | Do shell blocks carry a prompt character, or none? | uncovered | low | `docs-shape.md` §6: 61 of 1,470 shell blocks (4.2%) use one — the fleet already has a de-facto convention nobody wrote down | docs-examples |
| code-tabs-vs-single-language | Tabs for every package manager, or one canonical command at first contact? | partial | medium | `exemplar-sites.md`: Vite and Tailwind show 4–5 tabs, Bun deliberately shows one; ocx has `::: code-group` and no policy | docs-examples |
| interactive-example-roi | When does an embedded playground earn its build cost? | uncovered | medium | `tested-examples-mechanism.md` §6: ocx already ships an inline `<Frame>` mode used by 0 of 36 embeds — a built, unused interactive capability | docs-examples |
| interactive-tooling-choice | Which sandbox or type-check layer — WebContainers, Sandpack, Twoslash, a try-it console? | uncovered | low | `recent-shifts-and-tooling.md` §11: Sandpack unmaintained, Redocly's console paywalled; the fleet has no OpenAPI surface and little TS docs | docs-examples |
| runme-polyglot-notebooks | Should the doc file itself execute, instead of a separate script tree? | uncovered | medium | `recent-shifts-and-tooling.md` §8: a genuinely different trade-off than ocx's 7,925 lines of harness behind 66 scripts | docs-examples |

### Group: docs-navigation-search

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| nav-depth-ceiling | How deep may a sidebar nest before findability drops? | uncovered | high | `design-systems.md`: NN/g says 2, Docusaurus demos 4; `ux-observability-posture.md` §1 measures the fleet at max 3 | docs-navigation-search |
| flat-nav-failure | When does a flat sidebar stop working? | uncovered | high | `ux-observability-posture.md` §1: grimoire's 20-item flat `SUMMARY.md` is the fleet's only zero-hierarchy nav, and `docs-shape.md` §2 files 18 of its 23 pages as "other" | docs-navigation-search |
| directory-ia-as-type-signal | Does directory layout carry the page type, and is that enough? | partial | high | `docs-shape.md` §2 measured it directly: Diataxis-shaped MkDocs trees classify at 0–3 "other", grimoire's flat tree at 18 of 23 | docs-navigation-search |
| page-length-ceiling | When must one page become several? | uncovered | high | `docs-shape.md` §4: `command-line.md` is 34,298 prose words in one file, longer than 12 of 23 repos' entire docs surfaces | docs-navigation-search |
| heading-depth-cap | Is heading depth capped so the on-page outline stays usable? | uncovered | medium | `canonical-guides.md`: GitLab caps at H5 and says move the topic to a new page instead; ocx already reaches 5 | docs-navigation-search |
| custom-anchor-stability | Are stable custom anchors required, and what breaks without them? | partial | medium | `docs-shape.md` §5 measured it: ignoring explicit `{#id}` anchors turns 68 dead links into 2,087 false positives — ocx's convention is load-bearing | docs-navigation-search |
| breadcrumbs-on-deep-pages | Are breadcrumbs present past 1–2 levels? | uncovered | medium | `ux-observability-posture.md` §1: 2 of 9 sites, both copies of one richer template rather than a decision | docs-navigation-search |
| information-scent-in-nav-labels | Do nav labels use the reader's words rather than internal jargon? | partial | medium | `design-systems.md`: not checkable without a term list — a rule here has to be honest about that | docs-navigation-search |
| search-provider-choice | Client-side local search, hosted, or an AI answer layer? | uncovered | medium | `ux-observability-posture.md` §2: 9 of 9 are client-side, which is precisely what makes zero-result logging impossible today | docs-navigation-search |
| zero-result-logging-feasibility | Can a client-side-search site log a zero-result query at all? | uncovered | high | The fleet's actual blocker: 9 of 9 run minisearch/lunr/mkdocs-search, none of which report anything server-side (`ux-observability-posture.md` §2) | docs-navigation-search |
| zero-result-empty-state | What does the search UI show when nothing matches? | uncovered | medium | `design-systems.md`: Atlassian's 3-part template is directly portable; 0 of 9 fleet sites authored one, and 0 of 9 authored a 404 | docs-navigation-search |
| search-index-staleness | Does the index re-crawl at content cadence? | uncovered | low | `design-systems.md`: a hosted-search problem; the fleet's client-side indexes rebuild with the site | docs-navigation-search |
| scoped-and-advanced-search | Does scoped search default to everything, and is boolean syntax kept off the front page? | uncovered | low | `design-systems.md`: no fleet site scopes search, so this is pre-emptive | docs-navigation-search |
| framework-default-affordances | Which nav affordances come free from the generator and need no rule? | covered | low | `ux-observability-posture.md` §1/§2/§5: search box 9/9, prev-next 7/9, on-page outline 9/9, skip link and theme toggle 9/9, all by default | docs-navigation-search |
| progressive-disclosure-limits | How much may a page hide behind a toggle? | uncovered | medium | ocx's `:::details` convention against `recent-shifts-and-tooling.md` §2, where hiding costs an agent reader a 31x byte tax | docs-navigation-search |
| nav-diagnostics-not-checkable | Which nav findings (F-pattern, response-time budget, mobile fold) are diagnostics rather than rules? | uncovered | low | `design-systems.md` says so itself for the F-pattern; none of the three is measurable from a repo checkout | docs-navigation-search |

### Group: docs-observability

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| minimum-metric-set | What must a docs site measure first, given it measures nothing today? | uncovered | high | `ux-observability-posture.md` §3: 0 of 9 sites has analytics, a feedback widget or a docs issue template | docs-observability |
| zero-result-search-mining | Is the zero-result query log reviewed, and on what cadence? | uncovered | high | Named by five scouts as the cheapest lever; `ux-observability-posture.md` §2 confirms 0 of 9 and explains why the current search stack blocks it | docs-observability |
| feedback-widget-and-bias | Is there per-page feedback capture, and is its survivorship bias disclosed when the data is read? | uncovered | high | `recent-shifts-and-tooling.md` §12 shows the productized mechanism; `failure-and-observability.md` shows why absence of complaints is not evidence of success | docs-observability |
| time-to-hello-world | Is time to a first working result known and targeted? | uncovered | high | `ux-observability-posture.md` §8 measured it by hand for ocx (1 command, 20 words) — the fleet's best number exists and is recorded nowhere | docs-observability |
| task-completion-measurement | Is there any signal a reader finished the task? | uncovered | medium | `canonical-guides.md`: only a practitioner book covers it, and it needs readers the fleet does not have | docs-observability |
| docs-issue-label-triage | Is there a `docs` label, triaged on a cadence? | uncovered | medium | `ux-observability-posture.md` §3: 0 of 9 sites has a docs-specific issue template | docs-observability |
| onboarding-effectiveness | Is the quickstart's effect measured separately from page traffic? | uncovered | medium | `failure-and-observability.md`: over a third of surveyed teams never do, even when they track other things | docs-observability |
| ai-traffic-share | What share of docs traffic is agents, and does it change what good looks like? | uncovered | medium | `recent-shifts-and-tooling.md` §12; requires server logs the fleet's static hosting may not expose | docs-observability |
| lighthouse-ci-as-docs-gate | Does a ratcheted Lighthouse gate belong on docs content? | partial | medium | `ux-observability-posture.md` §3: the fleet's one working measured gate, on 2 of 9 sites, aimed at generator fixture output rather than documentation | docs-observability |
| freshness-stamp-and-slo | Is a "last verified" date shown and aged, and is there a freshness SLO? | partial | medium | `ux-observability-posture.md` §6: 3 of 9 sites have a date stamp as a side effect of one plugin template; `failure-and-observability.md` warns no source gives a validated SLO number | docs-observability |
| ai-authored-volume-vs-quality | Does the rule distinguish more docs from better docs? | uncovered | high | `failure-and-observability.md`: DORA's own two-directional finding, and this program ships docs guidance to AI authors | docs-observability |
| docs-quality-as-dora-capability | Should docs quality be scored on DORA's 8-item instrument? | uncovered | low | `failure-and-observability.md`: needs a survey population the fleet does not have | docs-observability |
| runbook-freshness-tie | Do runbook steps reference something live so staleness breaks visibly? | uncovered | medium | `failure-and-observability.md` gives the only numeric rot model found; `ux-observability-posture.md` §0 shows creeptd-ng's 2 docs pages are exactly this kind of runbook | docs-observability |

### Group: docs-machine-readers

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| llms-txt-cost-benefit | Should a site publish `llms.txt`, justified by which named consumer? | uncovered | high | `ux-observability-posture.md` §4: 0 of 9 fleet sites; `failure-and-observability.md` and `recent-shifts-and-tooling.md` both cite 97% zero-request against 8.8x publishing growth | docs-machine-readers |
| md-content-negotiation | Should every page be fetchable as raw Markdown at a predictable URL? | uncovered | high | `recent-shifts-and-tooling.md` §2: this, not the index file, is what agents fetch, and the HTML byte tax is measured at ~31x | docs-machine-readers |
| agent-doc-format-choice | `llms.txt`, `skill.md`, `AGENTS.md`, or an MCP server — which does a project owe? | uncovered | high | `codified-practice.md`: three unconverged formats; this program itself ships a skill, and `ocx-mcp` already exists | docs-machine-readers |
| agent-directed-instruction-efficacy | Does an "if you are an agent" block change model behaviour? | uncovered | high | `exemplar-sites.md` §9: a controlled test moved compliance 33.3%→100% on an explicit preference and 34.5%→34.5% on an audience label | docs-machine-readers |
| dual-audience-pages | Can one page serve a human skimmer and an agent paraphraser? | uncovered | medium | `codified-practice.md`; the shipped rule set's own primary reader is an agent | docs-machine-readers |
| mcp-server-as-docs-surface | Should a project's MCP server answer documentation lookups? | uncovered | medium | Cloudflare ships it (`recent-shifts-and-tooling.md`); `ocx-mcp` exists and its own landing page says "not implemented yet" | docs-machine-readers |
| agent-discovery-headers | Should a docs host expose `X-Llms-Txt` or token-count headers? | uncovered | low | `recent-shifts-and-tooling.md` §2; static hosting cannot set headers everywhere the fleet publishes | docs-machine-readers |
| skills-sh-directory | Should a project publish its own agent skill to a public directory? | uncovered | low | grimoire-lore already publishes to ghcr.io — a different channel, same question | docs-machine-readers |

### Group: docs-process

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| docs-in-same-pr | Must documentation land in the same change as the code it describes? | uncovered | high | `config-inventory.md` axis 3: the fleet holds two incompatible models — creeptd-ng calls a doc-sync violation a Block finding, ocx and grimoire hand docs to a later writer pass | docs-process |
| docs-review-blocking | May a merge proceed before doc review, with a tracked follow-up? | uncovered | medium | `exemplar-sites.md` §13: GitLab's explicit default is non-blocking; the fleet has never decided | docs-process |
| doc-trigger-matrix | Does a code change map to the doc sections it invalidates? | partial | high | `config-inventory.md` axis 2: ocx's `worker-doc-reviewer.md:15-28` is the fleet's most systematic docs mechanism, and its rows are ocx file paths | docs-process |
| doc-review-by-non-author | Does someone other than the author review the page? | uncovered | medium | `failure-and-observability.md` names this the missing step behind professional-looking wrong docs; in this fleet author and reviewer are both agents | docs-process |
| doc-update-friction | Does a one-line doc fix need the full change process? | uncovered | medium | `ux-observability-posture.md` §3: edit-this-page is configured on 8 of 9 sites and silently dead on 2 of those 8 | docs-process |
| dev-authored-first-draft | Who writes the first draft, and who reviews? | uncovered | medium | `exemplar-sites.md` §13; the fleet has no writers, so the rule has to name an agent role instead | docs-process |
| minor-vs-major-change-workflow | Is there a lightweight path for typos distinct from authoring a page? | uncovered | low | `design-systems.md` (MS Learn); low leverage where every change goes through the same agent | docs-process |
| doc-single-source-of-truth | Does more than one page own the same fact, and how is that detected? | uncovered | high | `failure-and-observability.md` names duplication a top complaint; `config-inventory.md` shows grimoire hand-forked ocx's rule rather than installing it — the fleet is its own example | docs-process |
| arid-vs-unique | How much repetition is allowed on a page versus how many sources may own a fact? | uncovered | medium | `canonical-guides.md`: Write the Docs holds both positions deliberately and they are easy to over-apply as "never repeat anything" | docs-process |
| always-complete-cadence | Are docs shipped in small increments on a cadence, or held for a big-bang rewrite? | uncovered | medium | `exemplar-sites.md` §14: Canonical operationalizes this as quarterly objectives; relevant to a fleet driven by one owner and parallel agents | docs-process |
| skill-verification-method | Is the shipped rule set tested against a fresh agent's actual behaviour? | uncovered | high | `codified-practice.md`: obra/superpowers' RED-GREEN loop; this program's own verification story, and nothing else in the corpus offers one | docs-process |
| prior-art-adoption | Which existing AI docs skills, rules and lint packages are adopted, and which re-authored? | uncovered | high | `codified-practice.md`: Anthropic's doc-coauthoring carries no lint, VoltAgent's agents state unfalsifiable thresholds, four humanizer skills all cite one Wikipedia essay | docs-process |
| ocx-rule-supersession | Does the published rule replace ocx's and grimoire's hand-forked copies? | uncovered | high | `config-inventory.md`: two independently maintained forks exist inside the repo family that owns the package manager this research feeds | docs-process |
| ai-authoring-tooling-policy | Does the project state a policy on LLM-drafted documentation? | uncovered | medium | `design-systems.md` flags Google TW2's unit on it as unfetched; GitLab gates AI-generated docs on Vale before human review | docs-process |
| versioning-necessity | Does this docs site need versioned docs at all, and how many versions stay live? | uncovered | medium | `ux-observability-posture.md` §6: 0 of 9 sites version; Docusaurus's own guidance is to default to none | docs-process |
| versioning-scheme-and-drift | If versioned, does the switcher change a release, a whole site, or a content fork — and does old content freeze? | uncovered | low | `exemplar-sites.md` §7 shows three unrelated meanings of "version switcher"; no fleet instance to ground it | docs-process |
| changelog-migration-link | Does each breaking change link to a migration guide, and is that link checked? | partial | medium | `config-inventory.md`: ocx has a changelog format convention with no link-existence check | docs-process |
| versionadded-sunset-rule | Do version annotations carry an explicit removal point? | uncovered | medium | `canonical-guides.md`: Django solves the timeless-docs problem structurally rather than by banning temporal words | docs-process |
| i18n-family | Which docs get translated, what happens when a translation goes stale, and does routing support it? | uncovered | low | `ux-observability-posture.md` §6: 0 of 9 sites has a locale directory; entirely pre-emptive | docs-process |
| github-as-docs-surface | Are READMEs first-class documentation, or an afterthought before the site? | uncovered | medium | `docs-shape.md` §0: 6 of 23 fleet surfaces are README-only with no site at all | docs-process |
| error-message-docs-link | Does each error the tool emits link to a docs page, and is that link checked? | uncovered | medium | Named by two scouts with zero fleet coverage; a checkable rule that spans code and docs | docs-process |
| openapi-single-source | Is reference generated from one machine-readable spec, on the same commit as the code? | uncovered | medium | `codified-practice.md`: mkdocstrings on 3 sites is the fleet's only generated reference; ocx's CLI reference is hand-maintained behind a structural test | docs-process |
| link-rot-ci-check | Is a link checker running in CI, internal and external? | partial | high | `ux-observability-posture.md` §3: internal strict-build 9/9, external lychee on 6 of 7 MkDocs sites, and neither on ocx or grimoire — the two sites with the most links | docs-process |
| build-time-anchor-generators | Does the link check special-case anchors that exist only after a build? | uncovered | high | `docs-shape.md` §5 measured it: mkdocstrings anchors manufacture 65 false positives from one repo alone | docs-process |
| root-relative-link-resolution | Does the checker resolve root-relative links against the site's source root? | uncovered | high | `docs-shape.md` §5: unfixed, the same check reports 89% of ocx's links dead instead of 2.9% | docs-process |
| glob-excludes-build-output | Does the docs glob exclude build output, report dumps and stale worktrees? | uncovered | high | `docs-shape.md` §0: 420 Lighthouse reports, 98 index dumps and 257 worktree files masquerade as documentation under a naive find | docs-process |

### Group: docs-accessibility

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| alt-text-presence-and-quality | Is alt text present, under a length cap, and not a placeholder string? | uncovered | medium | `ux-observability-posture.md` §5: 12 images fleet-wide and every one has alt — clean because there is nothing to get wrong, not because a rule enforces it | docs-accessibility |
| heading-order-check | Are heading levels never skipped? | uncovered | medium | `exemplar-sites.md` notes automated scanners miss the skip; markdownlint MD001 does not | docs-accessibility |
| color-contrast-and-dark-mode | Is 4.5:1 met in both themes, code highlighting included? | partial | medium | `ux-observability-posture.md` §3: Lighthouse asserts a ratcheted a11y floor on 2 sites, against fixture output rather than docs content | docs-accessibility |
| keyboard-and-custom-components | Do custom docs components carry focus handling and ARIA? | partial | medium | `ux-observability-posture.md` §5: everything is inherited from theme defaults except ocx's `Terminal.vue`, which adds none of its own | docs-accessibility |
| table-header-semantics | Do tables use real header cells and no merged cells? | covered | low | Markdown tables produce this for free in all three fleet generators | docs-accessibility |

### Group: docs-tooling

| slug | question | coverage | priority | why for this fleet | group |
|---|---|---|---|---|---|
| generator-currency | Is the site's generator current, supported, and pinned? | uncovered | medium | `docs-shape.md` §1 and `recent-shifts-and-tooling.md` §6: ocx pins VitePress `2.0.0-alpha.16` while stable is 1.6.x, and 7 fleet sites run Material for MkDocs, which entered maintenance mode in late 2025 | docs-tooling |
| unpinned-generator-versions | Are docs build tools pinned at all? | uncovered | medium | `docs-shape.md` §1: ocx-mirror and ocx-mcp build with `uv run --with mkdocs-material`, unpinned | docs-tooling |
| mkdocs-material-exit-path | Is Zensical the exit path for the 7 MkDocs sites? | uncovered | medium | Corrects `recent-shifts-and-tooling.md`'s "no fleet repo uses MkDocs" against `docs-shape.md` §1, which found 7 that do | docs-tooling |
| search-and-chat-vendor-choice | Pagefind, Algolia DocSearch v4, or an AI answer widget — and who pays for the calls? | uncovered | low | `recent-shifts-and-tooling.md` §4/§7: DocSearch v4's Ask AI is already marked legacy by Algolia; no fleet site uses hosted search | docs-tooling |
| ai-chat-widget-deflection | Does an AI answer widget pay for itself, and at what accuracy floor? | uncovered | low | `exemplar-sites.md` §15: every number is vendor-reported and no source measured the failure case | docs-tooling |
| site-component-portability | Do site-specific components belong in a portable rule at all? | partial | medium | `config-inventory.md` axis 2 marks `:::info`, `<Tooltip>` and the Vue catalog as not portable as written — the principle survives the syntax | docs-tooling |
| constrained-templating | When docs need templating, is a constrained layer better than raw components? | uncovered | low | `exemplar-sites.md`: Stripe's Markdoc argument; ocx uses unconstrained Vue components today | docs-tooling |
| site-metadata-freebies | Are sitemap, robots, canonical URLs, OpenGraph and changelog RSS present? | partial | low | `ux-observability-posture.md` §4: sitemap and canonical come free on 7 of 7 MkDocs sites and are absent on both hand-rolled ones; OpenGraph and RSS are 0 of 9 | docs-tooling |
| docs-build-as-ci-gate | Is the docs build itself a required CI gate? | covered | low | `ux-observability-posture.md` §3: 9 of 9 already, via `mkdocs build --strict`, mdBook's own check, or `task website:build` | docs-tooling |
| joblint-inapplicability | Does Joblint's job-posting corpus apply to software documentation? | n/a | low | `codified-practice.md` answers it outright: no. Recorded so the question stays closed, not researched again | docs-tooling |

## Selected for wave 1

Sixteen topics in seven groups. Selection ran in the stated order: uncovered before
partial, then leverage against the measured fleet, then areas where an agent writing
docs unprompted demonstrably gets it wrong, then whether a rule could actually check
the answer. Every requester emphasis has at least one owner: (a) `docs-use-case-discovery`,
(b) `docs-navigation-search` plus `recording-layer-and-interactivity`, (c) `docs-observability`,
(d) `docs-plain-english`, (e) `docs-examples`, (f) `prior-art-and-self-validation`,
(g) `docs-page-types` plus `tier-model-and-first-steps-contract`.

### docs-page-types

Why this wave: the frame's three-way split is already overturned by its own correction 5,
and every downstream rule — readability carve-outs, tone, mixing checks, nav grouping —
needs the type set settled first. The fleet has no page-type rule at all and 31.9% of its
248 pages are unclassifiable by path.

#### page-type-set-and-declaration

```
Question: how many content types does the shipped contract name, how does a page
declare which one it is, and what check catches a page doing two at once?

Investigate:
1. Fetch diataxis.fr/map, /compass, /tutorials-how-to, /reference, /explanation and
   /complex-hierarchies. Extract each type's contract as checkable obligations, not
   adjectives. Note that /complex-hierarchies 404'd twice for the scout and was read
   from cache — fetch it directly and say whether it resolves.
2. Fetch docs.gitlab.com/development/documentation/topic_types/ and its
   troubleshooting/ child for CTRT and the fifth type's error→cause→fix shape, and
   kubernetes.io/docs/contribute/style/page-content-types/ for the per-type section
   skeleton. Fetch thegooddocsproject.dev/template/ and state why 25 templates is a
   parts catalogue, not a rival type system.
3. Read idratherbewriting.com/blog/what-is-diataxis-documentation-framework and
   ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation: Diataxis has
   no controlled-study basis and its flagship adopter says it surfaces problems rather
   than fixing them. Decide whether the rule ships it as a contract or a diagnostic.
4. Decide the declaration mechanism. docs-shape.md §2 measured that a path heuristic
   files 31.9% of 248 pages as "other", concentrated entirely in grimoire's flat mdBook
   tree, while Diataxis-shaped MkDocs directories classify at 0-3 "other". Say whether
   directory position is sufficient evidence of type or a frontmatter key is required,
   and give the key name and allowed values.
5. Specify one mixing check and test it against real fleet pages before shipping it.
   Two candidate signatures are already written down: a "we'll build X" opening plus a
   later conditional imperative in the same file (canonical-guides.md), and a page
   tagged reference whose first paragraph carries a problem framing (codified-practice.md).
   Run both over ocx/website/src/docs/user-guide.md and report the false-positive rate.
6. Resolve where analogies may live. ocx/.claude/rules/docs-style.md:54-64 mandates
   culture-bound analogies (Nix store, APT, SDKMAN, Homebrew Cellar) in callouts;
   Google's tone page and the Kubernetes style guide both forbid idiom and
   culture-specific reference for a global audience; Diataxis allows comparison only in
   explanation. Land this as a per-type rule with a citation requirement, not as taste.

Conflict to resolve, named: Diataxis's four types vs the frame's three vs GitLab's five
vs The Good Docs Project's 25. Also named: culture-bound analogies as an asset
(ocx) vs a global-audience hazard (Google, Kubernetes).

The deliverable must decide: the exact type set, the declaration key and its values,
one mixing check with a command that runs and a measured false-positive rate, what a
landing page is if it is not a type, and whether an untyped page warns or fails.
```

#### landing-page-contract

```
Question: what must a docs landing page contain, in what order, and what does a check
reject?

Investigate:
1. Fetch docs.stripe.com, docs.astral.sh/uv, laravel.com/docs/12.x,
   developers.cloudflare.com/workers and docs.gitlab.com. Record, per site, what the
   first screen contains: a command, a task-link grid, a hero claim, or nothing but a
   title. exemplar-sites.md finds Stripe and uv cut the hero and Laravel keeps it —
   the corpus does not agree, so decide rather than average.
2. Fetch the GOV.UK planning-content and identify-user-needs pages
   (guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/plan-manage-content/).
   Extract the top-task-links-used-sparingly constraint and the mobile-fold reasoning,
   and say whether either survives as a checkable rule or is a design note.
3. Reconcile against the fleet's measured landing pages in ux-observability-posture.md
   §7: ocx runs 7 CTAs with no hierarchy and two overlapping feature-tile treatments;
   two sites open with a stability warning instead of any opening move at all; exactly
   one site (ocx-catalog) states who it is for, via use-case cards; 0 of 9 carry social
   proof; ocx-save shipped three literal Lorem Ipsum tiles into a published site. The
   audit says the "definition vs value claim vs command" trichotomy does not hold here —
   name the fourth move (title then caveat) or reject it.
4. Decide the CTA budget and the ordering rule, and whether "who is this for" is
   required, optional, or satisfied structurally by task-keyed cards.
5. Specify what a check can actually see from a repo checkout: CTA/link count in the
   frontmatter or first N lines, presence of a fenced command, presence of a
   placeholder string (the Lorem Ipsum case is a real, cheap grep). Say plainly which
   parts of this contract cannot be checked and must ship labelled as unverified.

The deliverable must decide: the ordered element list for a landing page, a maximum
primary-CTA count with its rationale, whether the hero is banned or bounded, the
"who is this for" requirement, and the exact grep or script for each checkable element.
```

#### reference-page-contract

```
Question: what fixed sections must a reference page carry, how is neutrality enforced,
and when must one reference page become several?

Investigate:
1. Fetch learn.microsoft.com/en-us/style-guide/developer-content/reference-documentation
   for the fixed section table and the autogeneration review-pass warning, and
   diataxis.fr/reference for the mirror-the-product rule and the austere-tone contract.
   Fetch idratherbewriting.com/learnapidoc for the named reference-component list.
2. Compare docs.stripe.com/api (one long page per resource, personalized per account)
   against doc.rust-lang.org/std (one page per item, machine-generated). exemplar-sites.md
   §5 gives the trade-off; decide which the rule defaults to and on what evidence
   (generation pipeline, diff size, permalink stability, in-page search).
3. Ground it in the fleet. docs-shape.md §4: ocx/website/src/docs/reference/command-line.md
   is 34,298 prose words in one file, longer than the entire docs surface of 12 of 23
   repos. tested-examples-mechanism.md §3: that page is explicitly out of scope for the
   execution drift gate and instead carries test_doc_command_reference.py, a 479-line
   structural test asserting anchors plus Usage/Options blocks per command.
   grimoire's client_target.rs does the same for a docs table. These two are the fleet's
   only verified docs rules — generalize their shape, do not re-derive it.
4. Handle generated reference: docs-shape.md §5 found ocx-sdk-python's api.md is a
   4-line mkdocstrings stub whose anchors exist only after a build, which is why a naive
   link check manufactures 65 false positives from that repo alone.
5. Decide the page-splitting threshold and say what it is measured in (prose words,
   headings, top-level items), and whether the rule states a number or a trigger.

The deliverable must decide: the required section list for a hand-authored reference
page, the neutrality check (which grep, on which type-tagged pages, at what severity),
the single-page-vs-per-item default with its condition, a page-length trigger, and the
portable form of the structural drift gate the fleet already runs twice.
```

### docs-use-case-discovery

Why this wave: this is emphasis (a) and the core of the shipped skill. Nothing in the
fleet does it — config-inventory.md found top-tasks, card-sorting and JTBD appear only
inside ocx-marketing's product-positioning skills, aimed at positioning rather than docs.
Every method in the corpus assumes users to survey, and this fleet has none.

#### use-case-discovery-procedure

```
Question: how does a project with no users and no analytics discover its own top tasks,
and what exactly does the skill make an agent produce?

Investigate:
1. Fetch smashingmagazine.com/2022/05/top-tasks-focus-what-matters-must-defocus-what-doesnt/
   and measuringu.com/top-tasks/ for the full pipeline with its real numbers (200-400
   candidate tasks, shortlist 50-80, 100+ voters, the Task Performance Indicator).
   gerrymcgovern.com returned 403 for one scout — try again and say whether it resolves.
2. Resolve the sizing problem, which is the whole difficulty for this fleet. The
   European Commission study found the top three tasks identical after 30 votes out of
   107,000. Decide what the minimum viable version is when the voter pool is one owner
   plus a set of agents, and whether a substitute source (issue titles, README section
   headings, CLI subcommand invocation frequency, search-log absence) can stand in.
3. Fetch github.com/mikeb-stripe/friction-logging-toolkit/blob/main/how-we-use-friction-logs-at-stripe.md
   and extract the exact three-section log shape. This is the one discovery method an
   agent can execute unaided, so specify it as a runnable procedure with its outputs.
4. Fetch the GOV.UK identify-user-needs page and extract the good/bad user-need examples
   verbatim. The falsifiable test is that a bad need "suggests a specific solution" or
   "justifies existing content". failure-and-observability.md notes an LLM asked for a
   persona line will describe the page's own content back at the reader — build the
   check against exactly that failure.
5. Decide what the procedure produces as an artifact: a ranked task list, a per-task
   user-need sentence, a coverage table against existing pages, and a delete list.
   Liverpool deleted 80% of 4,000 pages off this evidence; the fleet's equivalent is
   the 24.6% stub rate docs-shape.md §4 measured across 248 pages.
6. Decide the cadence and who re-runs it.

The deliverable must decide: the step-by-step procedure at fleet scale, its minimum
inputs, the exact artifact schema it writes, the check that rejects a solution-shaped
user need, and whether the output licenses deletion as well as authoring.
```

#### tier-model-and-first-steps-contract

```
Question: what are the use-case tiers, how do they relate to content types, and what
does the first-steps tier owe a reader?

Investigate:
1. Establish the axes. exemplar-sites.md §3 shows uv staging its Guides section
   internally (installation → scripts → tools → projects → publishing → integrations)
   while running Concepts and Reference as separate top-level sections, and Astro
   running a 6-unit tutorial, a one-command quickstart and topic guides at once. Fetch
   docs.astral.sh/uv and docs.astro.build/en/getting-started to confirm both directly.
   docs-frame.md correction 5 forbids mapping tiers onto types — state the relationship
   as a matrix, not a mapping.
2. Fetch twilio.com/docs/messaging/quickstart and
   supabase.com/docs/guides/getting-started/quickstarts/reactjs and count discrete
   numbered actions to a verified working result. Both land at 5-9. Decide whether the
   rule states a step budget, a time budget, or a "one verifiable result" rule.
3. Resolve the tutorial question with the fleet's own numbers. docs-shape.md §2: 0 of
   248 pages classify as a tutorial and 17 classify as getting-started — the honest
   claim is that no repo labels anything a tutorial, and getting-started is the whole
   first-steps tier. Fetch diataxis.fr/tutorials-how-to and decide whether the fleet
   needs a tutorial tier at all or whether a bounded quickstart is the correct terminal
   form for a CLI tool's docs.
4. Read the tutorial contract's hard requirements (eliminate options, every step yields
   a comprehensible result, aspire to perfect reliability) against Every Page is Page
   One's self-contained-topic principle, which breaks tutorial linearity. Resolve.
5. Measure the fleet's current first-steps performance against the contract:
   ux-observability-posture.md §8 has ocx reaching a runnable successful command in one
   command after 20 words on installation.md and 185 words on getting-started.md.
6. Decide how a tier becomes pages: what nav position, what naming, what handoff link
   to the next tier, and what stops tier 1 growing into tier 3.

The deliverable must decide: the tier names and their entry/exit conditions, the
tier-by-type matrix, a first-steps step or result budget with its source, whether
"tutorial" is a tier the rule requires, and the mechanical check for a bounded quickstart.
```

### docs-plain-english

Why this wave: emphasis (d), and the fleet is measurably at the bad end of it — median
Flesch 51.6, no repo above 60, 18.3 em-dashes and 5.8 semicolons per 1,000 words
(docs-shape.md §3) — with zero prose tooling anywhere (config-inventory.md). It is also
the family where the frame's own hypothesis is provably mislabelled, so shipping it
wrong would put a false claim in front of every adopting agent.

#### readability-gate-per-page-type

```
Question: what per-type readability threshold does a plain-English gate enforce, with
which formula, and what does it do on a reference page full of identifiers?

Investigate:
1. Fetch raw.githubusercontent.com/errata-ai/Readability/master/Readability/FleschKincaid.yml
   and the other six rule files in that package. codified-practice.md confirmed only
   the FK one: grade > 8, firing at suggestion severity, never error. Confirm the other
   six thresholds and severities directly rather than assuming them.
2. Fetch vale.sh/hub/ for the Readability package's rule list, and
   en.wikipedia.org/wiki/Flesch–Kincaid_readability_tests for the exact formula.
3. Resolve the target number. canonical-guides.md found no developer-docs style guide
   states a grade target at all; the "grade 8" figure comes from US federal
   plain-language compliance for citizen-facing content; GOV.UK's own number is a
   reading age of 9, also citizen-facing; exemplar-sites.md reports practitioner
   guidance of 9-11 for professional and 9-13 for technical readers, from secondary
   sources. Decide whether the rule states a number, a per-type number, or a
   draft-to-draft delta, and say which sources you rejected.
4. Solve the identifier problem, which is the reason this topic exists. Every formula
   counts syllables, and `sha256`, `--flag-name` and `OCIImageIndex` break all of them.
   docs-shape.md §3 had to strip code fences, frontmatter, headings, tables and inline
   code before the numbers meant anything — reuse that preprocessing, do not reinvent
   it, and state whether the score is computed on stripped or raw text.
5. Fetch guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/
   for the two hard numbers (split sentences over 25 words, at most 5 sentences per
   paragraph) and check them against the fleet's measured mean of 19.5 words per
   sentence with a 0.3-0.4 long-sentence share in the largest repos.
6. Decide the reference-page carve-out explicitly, with the mechanism: exemption by
   declared page type, by identifier density, or by path.

The deliverable must decide: one formula, its preprocessing, a threshold per page type
(or an explicit refusal to state one, with the reason), the severity at each threshold,
the reference carve-out mechanism, and a runnable script that produces the number.
```

#### ai-tell-set-and-honest-label

```
Question: which AI-writing tells does the rule check, and how is the em-dash ban
labelled so it does not claim to be a detector?

Investigate:
1. Fetch slopdetector.org/blog/em-dash-ai-tell-data and the underlying Freeburg 2026
   figures: GPT-4.1 at 10.62 em-dashes per 1,000 words against a 3.23 human baseline,
   Gemini 2.5 Pro at 3.53 inside the human range, Llama 3.1 8B at 0.00, and a five-novel
   classic sample at 6.43 with Twain's Huckleberry Finn at 10.13. Confirm the numbers
   at the source and record what the study itself concludes.
2. Fetch en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing in full and extract the
   whole taxonomy across its five layers, not the four tells the frame names. Note the
   essay's own statement that single-instance human judgment performs near chance.
3. Fetch vale.sh/hub/ for the AiTells package (17 rules, 6 gating as errors) and read
   which six gate hard and why. Fetch the four humanizer skills codified-practice.md
   names (blader/humanizer's 35 patterns being the most documented) and record what
   they check that Vale does not, and which of them carries any measurement at all.
4. Fetch docs.gitlab.com/development/documentation/styleguide/ and record its independent
   reason for banning em-dash, semicolon and curly quotes — translation and terminal
   rendering, not AI detection. This is the honest justification available for the same
   ban, and it should be the one the rule cites.
5. Ground the ban in the fleet: docs-shape.md §3 measures 18.3 em-dash and 5.8 semicolon
   per 1,000 words fleet-wide, heaviest at 2,988 em-dashes across ocx's 44 pages and 484
   semicolons across kate-middlechild's 25. State what a ban would cost to retrofit.
6. Split the taxonomy into three buckets and justify each placement: hard error,
   warning, and aggregate-only-not-a-per-instance-signal (the rule-of-three case).
   Include the structural tells — heading-only sections, skipped levels, title case,
   bold mini-headings inside lists — and map each to a markdownlint rule ID where one
   exists (MD001, MD003, MD025, MD036).

Conflict to resolve, named: em-dash as an AI detector (docs-frame.md hypothesis 5) vs
em-dash as a house-style choice with a translation rationale (Freeburg 2026, GitLab).

The deliverable must decide: the checked tell list with a severity and a check per tell,
the exact wording the shipped rule uses to label the punctuation ban (it must not claim
detection), and which tells are documented as human-review-only.
```

#### lint-mechanism-and-rule-verification-shape

```
Question: which tool enforces which prose rule, how is it rolled out over 348,917 words
of existing prose, and what shape does a rule row take when no lint can check it?

Investigate:
1. Fetch vale.sh, docs.vale.sh/topics/styles/ and grafana.com/docs/writers-toolkit/review/lint-prose/
   for the rule types (existence, substitution, occurrence, repetition, consistency,
   conditional, capitalization, metric, spelling, sequence, script) and a real adopter's
   named rule IDs. Fetch github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md for
   the MD001-MD060 catalogue, and github.com/Automattic/harper COMPARISON.md for where
   Harper sits against Vale.
2. Decide the tool. This is an adoption cost, not a preference: config-inventory.md found
   zero prose tooling in any of the 12 repos, so the rule either introduces a Go binary
   plus a styles directory into every adopter, or restricts itself to greps and a
   markdownlint config. Price both and recommend one.
3. Fetch buildwithfern.com/post/docs-linting-guide for the rollout pattern
   (MinAlertLevel = warning, filter_mode: added, then tighten to error) and state why it
   is load-bearing here: a lint that fires on all existing prose blocks every PR in a
   fleet whose median page already fails.
4. Draw the markdownlint/Vale boundary explicitly. Both touch headings; an unowned
   overlap produces two tools demanding opposite fixes.
5. Settle the link rules, which are the fleet's most lint-ready and most contradictory.
   ocx/.claude/rules/docs-style.md:104-124 requires reference-style links only and
   docs-shape.md §5 counts 555 inline-style links in that same repo. docs-style.md:44-50
   requires a hyperlink on every occurrence of every external tool; GOV.UK explains a
   term on first use only; GitLab caps a page at ~15 links. ocx carries 2,337 internal
   plus 611 external links across 44 pages. Resolve into one rule with one check.
6. Define the rule-row shape. config-inventory.md axis 5 found the fleet's one rigorous
   example: bob/.claude/rules/rust-quality/docs-and-tracing.md:29-40, 11 of 12 rules
   carrying an inline rg or grep in the same table row. Copy that shape and specify what
   a row looks like when the rule genuinely cannot be checked, so an unverifiable rule is
   visibly marked rather than quietly indistinguishable from a verified one.

Conflict to resolve, named: explain-once (GOV.UK) vs hyperlink-every-occurrence (ocx),
and the links-per-page cap that collides with the latter.

The deliverable must decide: the tool set and its cost, the config that ships, the
rollout thresholds, the tool-ownership boundary, the resolved link rule with its grep,
and the literal template for a verified rule row and an unverifiable one.
```

### docs-examples

Why this wave: emphasis (e), and the only area where the fleet has something genuinely
worth publishing — 66 acceptance-tested doc scripts with a slug-based page binding, plus
a second, independent Sybil-based mechanism in another repo. The audit also shows the
frame's version of this is wrong in two ways: the cast is a minority layer, not the
mechanism, and the recording that exists is inaccessible and on a stale format.

#### tested-example-gate

```
Question: what makes a documented example a test, across shell, Python and Rust, and
what exactly fails when it goes stale?

Investigate:
1. Read tested-examples-mechanism.md in full before fetching anything — it is a
   file:line audit of a working implementation and the portable/instance table at its
   end is the starting point, not something to re-derive. Extract the pattern half of
   every row: a slug in the script header as the only contract between test tree and doc
   tree, a failure message that names the doc page, one script tree with no second
   discovery path, and an annotated marker for prose that deliberately shows a removed
   command.
2. Read ocx-sdk-python/conftest.py:25-42 and its four fence-language tiers
   (python, python-contract, python-acceptance, python-no-run). This is the second,
   independent mechanism and the one most fleets could adopt without building anything.
   Fetch the Sybil docs to confirm the parser set.
3. Fetch rust-lang.github.io/mdBook/cli/test.html for the Rust-only scope and the -L
   dependency-path requirement, and confirm cargo test --doc's behaviour. Fetch
   ex-unit.hexdocs.pm/ExUnit.DocTest.html only to record the pattern, since no fleet repo
   is Elixir. Fetch runme.dev and decide whether "the doc file itself executes" is a
   third option worth naming or a distraction.
4. Decide the tiering rule that makes this shippable: which examples must execute, which
   may compile-check only, and how a deliberately non-runnable snippet is marked.
   docs-shape.md §6 counts 343 untagged fenced blocks and 1,470 shell blocks of which
   only 61 carry a prompt character — the marking convention has to survive that corpus.
5. Decide the equivalence claim carefully. tested-examples-mechanism.md §3 (EX10/DE6)
   shows ocx runs the raw script under parallel-isolation-prefixed variables and proves
   canonical equivalence to what the page displays, not byte identity. A rule that
   promises "the page shows exactly what was tested" would be false as written.
6. Cost it honestly: 7,925 lines of test and support Python behind 66 scripts. State the
   smallest version of the pattern a small project can adopt.

Conflict to resolve, named: shell-script-plus-cast (ocx's ADR, and the frame's
hypothesis 6) vs a mainstream language-native doctest runner (ocx-sdk-python's Sybil),
which achieves tested examples with no recorder, no sanitizer and no registry stack.

The deliverable must decide: the portable statement of the gate, the per-language
mechanism table, the binding convention between page and test, the marking convention
for untested snippets, the failure-message requirement, and a check that finds a fenced
command with no backing test.
```

#### recording-layer-and-interactivity

```
Question: when is a recording worth making, what format and player does it use, and
what does it owe a reader who cannot watch it?

Investigate:
1. Fetch docs.asciinema.org/manual/asciicast/v3/ for the v3 header schema and the
   absolute-to-relative timestamp change, and confirm the v2 incompatibility. Two scouts
   independently found ocx generating "version": 2 casts while pinning an asciicast
   player at ^3.15.1 — verify that against the repo and state whether it currently plays.
2. Fetch github.com/charmbracelet/vhs for the .tape format and its ASCII/text output
   mode. tested-examples-mechanism.md records ocx rejecting VHS outright, unscored, on
   one-tree grounds (a second script format, a second discovery path, a second
   sanitization class). Decide whether that reasoning generalizes or is ocx-specific.
3. Settle the version-control question. ocx gitignores all 35 generated casts
   (website/.gitignore:12); grimoire commits a single hand-recorded demo.cast for its
   landing page and tells reviewers to read the diff. Decide what gets committed: the
   recording, the script, or neither, and what that implies for review.
4. Resolve accessibility, which is a real gap in the fleet's only implementation.
   ux-observability-posture.md §5 and recent-shifts-and-tooling.md §10: Terminal.vue is
   305 lines with no prefers-reduced-motion handling, no tabindex, no aria-*, and no
   documented pause control. Fetch the WCAG success criteria behind the three rules
   (no flash above 3 per second, a pause/stop control for anything over 5 seconds, a
   reduced-motion fallback) and state each as a requirement with a check.
5. Decide the opt-in policy and price it. ocx records 35 of 66 scripts; the cost is
   setup and PTY execution, not the write, and registry throughput caps useful
   parallelism at 4-8 workers. tested-examples-mechanism.md §5 flags its own estimate as
   measured at 22 scripts and never re-run at 35 — say whether the number is stale.
6. Decide whether an interactive element is ever preferable to a recording, using the
   fleet's own evidence that a shipped interactive mode goes unused: 0 of 36 Terminal
   embeds use the inline no-execution Frame mode that has been available all along.

The deliverable must decide: when a recording is warranted, the format and player
version pair, the commit policy, the three accessibility requirements with their checks,
the opt-in mechanism, and the rule against a hand-authored terminal mockup that never ran.
```

### docs-navigation-search

Why this wave: emphasis (b). The measured fleet already contains both failure modes the
research predicts — one site with a 20-item flat sidebar whose pages are unclassifiable,
and one 34,298-word page — and 9 of 9 sites run a search stack that structurally cannot
report what readers failed to find, which is the precondition for the observability group.

#### nav-depth-and-information-architecture

```
Question: how deep may a docs sidebar nest, and what does a rule check from a repo
checkout rather than from a rendered site?

Investigate:
1. Fetch nngroup.com/articles/progressive-disclosure/ for the two-level ceiling and the
   46-application basis, nngroup.com/articles/breadcrumbs/ for the deeper-than-1-2-levels
   recommendation and placement rules, and nngroup.com/articles/information-scent/ for
   why labels using internal jargon break prediction.
2. Fetch docusaurus.io/docs/sidebar, which permits and demonstrates four-plus levels with
   auto-collapse and hideable affordances. This is the conflict: the tooling treats depth
   as manageable and the usability research caps it at two. Resolve it with the fleet's
   own numbers rather than by splitting the difference.
3. Measure against ux-observability-posture.md §1: the fleet's deepest nav is 3 levels
   (ocx, ocx-sdk-python), most sites sit at 2, and grimoire is flat at 20 items with no
   grouping at all. Then read docs-shape.md §2's finding that grimoire's flat tree also
   produces 18 of 23 pages classified as "other" while Diataxis-shaped directories
   classify at 0-3 — flat nav and unclassifiable pages are the same defect seen twice.
4. Decide the page-splitting trigger alongside the depth cap; they trade against each
   other. ocx's command-line.md at 34,298 words is what a hard depth cap buys you.
5. Settle custom anchors. ocx mandates {#anchor} on every heading, and docs-shape.md §5
   proved the convention is load-bearing: a checker that ignores explicit ids reports
   2,087 dead links where 68 exist. Decide whether the rule requires stable anchors and
   what the check is.
6. Decide what is checkable from a checkout: nav depth from mkdocs.yml nav, VitePress
   sidebar config or SUMMARY.md; heading depth per file; page length; anchor presence.
   Everything else — scent, breadcrumb rendering, the mobile fold — needs a rendered
   site, so say so and mark those as unverified guidance rather than rules.

Conflict to resolve, named: NN/g's 2-level disclosure ceiling vs the 4-plus levels the
generators demonstrate for large sites, with the fleet's largest real docs surface at
44 pages and its largest single page at 34k words.

The deliverable must decide: a nav depth cap with its rationale, a heading depth cap, a
page-length trigger, the anchor-stability rule, and one script that reads the three
generator config shapes in this fleet and reports depth.
```

#### search-contract-and-zero-result-loop

```
Question: what does a docs site owe a reader whose search finds nothing, and can this
fleet's search stack report that it happened?

Investigate:
1. Start from the blocker, because it changes the answer. ux-observability-posture.md §2:
   all 9 sites run client-side search (VitePress minisearch, MkDocs built-in, mdBook
   lunr) and 0 have any zero-result or search-analytics instrumentation. Client-side
   search leaves no server-side record. Establish concretely whether a zero-result event
   can be captured at all without changing the search stack — a small client-side beacon,
   a Pagefind hook, or a switch to hosted search — and what each costs.
2. Fetch algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results
   for the remediation levers (synonyms, removeWordsIfNoResults, optionalWords) and
   nngroup.com/articles/search-visible-and-simple/ for the measured numbers (a visible box
   raising search use 91%, first-query success at 51% falling to 32%, ~2-word queries).
3. Fetch baymard.com/blog/ecommerce-search-query-types and map the query taxonomy onto
   docs: the "non-product" class that fails 66% of the time is the docs equivalent of a
   conceptual how-do-I query a keyword index cannot resolve. Decide whether the rule says
   anything about synonym maps.
4. Fetch pagefind.app and confirm the chunked-index claim and payload figures, since it
   is the plausible upgrade path for the two hand-rolled sites and possibly a way to get
   an instrumentable hook.
5. Fetch atlassian.design/foundations/content/designing-messages/empty-state for the
   three-part empty-state template and apply it to a docs zero-result state and an empty
   section. 0 of 9 fleet sites authored either, or a 404 page.
6. Decide the review loop: who reads the zero-result log, on what cadence, and what
   turns a repeated query into a page. failure-and-observability.md's overlap test
   (missing page vs vocabulary mismatch) is the classifier — specify it.

The deliverable must decide: whether the rule requires a search stack that can report
zero results and what the cheapest such stack is for a static site, the zero-result and
empty-state copy contract, the review cadence, and the check that a site has any
zero-result capture at all.
```

### docs-observability

Why this wave: emphasis (c), and the largest single hole in the fleet — 0 of 9 sites has
analytics, a feedback widget, a docs issue template or search instrumentation
(ux-observability-posture.md §3). The one measured gate that exists (Lighthouse CI on 2
sites) runs against generator fixture output, not documentation. This group also owns
staleness, which the failure literature says is what readers actually complain about.

#### minimum-instrumentation-set

```
Question: what must a docs site measure first when it measures nothing, and what can a
rule check exists?

Investigate:
1. Fetch dora.dev/capabilities/documentation-quality/ and
   cloud.google.com/blog/products/devops-sre/deep-dive-into-2022-state-of-devops-report-on-documentation/
   for the eight-item instrument and the amplification numbers. Note the axis DORA
   measures is findability and trust, not sentence quality — a rule that grades prose is
   grading the wrong thing, and the deliverable has to say what it grades instead.
2. Fetch stateofdocs.com/2025/documentation-metrics-and-measurement for the 39%-track-nothing
   figure and the onboarding-measurement gap, and nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/
   for the TTHW benchmark bands (under 30 minutes 5/5, over 4 hours 1/5) and Twilio's
   5-minute target.
3. Fetch mintlify.com/docs/optimize/feedback and mintlify.com/blog/agent-analytics for
   the productized shape: per-page thumbs plus free text, and a human-vs-agent traffic
   split. Then read failure-and-observability.md on survivorship bias in exactly that
   channel and decide how the rule requires the bias to be disclosed when the number is
   reported.
4. Rank the candidate signals by cost for a static-hosted site with no analytics:
   zero-result capture, per-page feedback, a docs issue label with a triage cadence,
   a time-to-first-result measurement taken by hand, and agent-vs-human traffic share.
   Recommend the first two to add and say why the others wait.
5. Decide what a rule can check from a repo: the presence of a feedback component or
   endpoint, a docs issue template, an analytics snippet, and a recorded TTHW number in
   a known location. Distinguish "instrumented" from "reviewed" and require both.
6. Address the AI-volume problem directly, since this rule set is read by AI authors:
   DORA's 2024 wave pairs a documentation-quality score rise with a stability drop as
   AI-authored volume outruns review capacity. failure-and-observability.md proposes a
   concrete check — a docs change must state what was removed, not only what was added.

The deliverable must decide: the ordered list of what to instrument first, the exact
artifact each signal writes and where, the disclosure requirement for biased channels,
the review cadence, and the repo-level checks for each.
```

#### staleness-and-drift-gates

```
Question: what makes a stale doc fail loudly, and when does documentation debt block a
merge?

Investigate:
1. Fetch the three HN threads failure-and-observability.md cites (items 25422756,
   13702628, 39375456) and confirm the throughline: almost no complaint is about tone,
   nearly all are about whether the documented thing is true right now. This is the
   argument for weighting drift gates over prose gates, and the deliverable should carry
   it explicitly.
2. Specify the link check properly, using the two measured traps. docs-shape.md §5:
   root-relative links must resolve against the site source root or the checker reports
   89% of ocx's links dead instead of 2.9%; build-time anchor generators (mkdocstrings)
   must be excluded or they manufacture 65 false positives from one repo. Fetch
   lycheeverse/lychee and lornajane.net/posts/2024/checking-links-in-docs-as-code-projects
   for the CI recipe. Ground coverage in ux-observability-posture.md §3: internal strict
   builds on 9 of 9, external lychee on 6 of 7 MkDocs sites, neither on ocx or grimoire.
3. Generalize the trigger matrix. config-inventory.md axis 2 names
   ocx/.claude/agents/worker-doc-reviewer.md:15-28 as the fleet's most systematic
   mechanism: source-file pattern to doc file to section. The rows are ocx paths; the
   mechanism is portable. Decide whether the shipped artifact carries a matrix template
   and how a project fills it in.
4. Resolve the blocking question, which the fleet contradicts itself on.
   creeptd-ng/.claude/rules/doc-sync.md:33 makes a doc-sync violation a Block finding;
   ocx and grimoire hand documentation to a later writer pass; GitLab's published
   workflow refuses to let writer review block a merge and requires a tracked follow-up
   instead. Fetch docs.gitlab.com/development/documentation/workflow/ and decide, for a
   fleet where the author and the reviewer are both agents.
5. Handle single-source-of-truth. Fetch writethedocs.org/guide/writing/docs-principles/
   for ARID and Unique and state the distinction precisely: a page may repeat, a fact may
   have one home. The fleet's own instance is that grimoire hand-forked ocx's rule file
   rather than installing it.
6. Decide the freshness question honestly. failure-and-observability.md found no source
   with a validated freshness SLO number; three fleet sites carry a last-updated stamp
   only as a side effect of one plugin template. Say whether the rule states a number,
   and if it invents one, mark it as invented.

Conflicts to resolve, named: doc debt as a blocking defect (creeptd-ng) vs a post-merge
writing pass (ocx, grimoire) vs non-blocking-with-follow-up (GitLab); and ARID's
"accept some repetition" vs Unique's "one source per fact".

The deliverable must decide: the link-check configuration with both traps handled, the
trigger-matrix template, the blocking policy, the single-source rule with its detection
method, and whether a freshness SLO ships at all.
```

### docs-machine-readers-and-prior-art

Why this wave: emphasis (f), plus the one audience question this program cannot dodge —
the artifacts it ships are read by agents, and so are the docs they govern. Both topics
here also protect the program from its own failure mode: publishing an unverified claim
(llms.txt as a traffic strategy) or re-inventing a rule set that already exists in four
places with no verification attached.

#### agent-readable-surface

```
Question: what does a docs site owe an agent reader, and which of the competing formats
does the rule actually require?

Investigate:
1. Fetch llmstxt.org, including the v2 spec update dated 2026-08-10, for the exact file
   shape. Then fetch mecanik.dev/en/posts/does-llms-txt-do-anything-yet/ for the
   consumption data: 8.8x publishing growth (4,088 to ~36,120 sites) against 97% of
   published files logging zero requests, with AI retrieval bots at 1.1% of the requests
   that did land. Establish whether Google's stated non-consumption still holds.
2. Fetch developers.cloudflare.com/docs-for-agents/ for the ~31x HTML-vs-Markdown byte
   claim and the argument that progressive disclosure actively hurts agents, and
   vercel.com/docs/agent-resources plus mintlify.com/blog/context-for-agents for the
   concrete implementations: Accept: text/markdown, .md twins, llms-full.txt, discovery
   headers, and Mintlify's finding that instructions must go at the top because coding
   agents truncate long pages.
3. Fetch docs.stripe.com/payments.md and a laravel.com docs page's .md sibling to confirm
   the twin convention resolves in practice, not just in a blog post.
4. Fetch passo.uno/if-you-are-an-agent-read-this/ and record the controlled result
   exactly: an explicit stated preference moved compliance from 33.3% to 100%, while an
   "for agents" section label moved nothing (34.5% vs 34.5%). This is the evidence that
   decides whether the rule permits agent-directed callouts at all.
5. Decide what the fleet can actually ship. ux-observability-posture.md §4: 0 of 9 sites
   has llms.txt, 0 has OpenGraph, and the 7 MkDocs sites get sitemap and canonical URLs
   free while the two hand-rolled sites get neither. Static hosting may not permit
   response headers or content negotiation — say which of these mechanisms survive on a
   plain static host and which need a platform.
6. Decide the format question: llms.txt, a .md twin convention, a SKILL.md, an AGENTS.md,
   an MCP server, or some subset. codified-practice.md and recent-shifts-and-tooling.md
   both report these are unconverged as of this era.

Conflict to resolve, named: llms.txt as the agent-readability answer (adoption growth,
"gold standard" framing) vs the markdown-twin convention (what agents measurably fetch),
against 97% of published llms.txt files receiving zero requests.

The deliverable must decide: which mechanisms the rule requires, which it recommends
with a named consumer, the rule on agent-directed prose, and a check (a curl, or a
build-output assertion) for each required mechanism.
```

#### prior-art-adoption-and-self-validation

```
Question: what do the existing AI docs-writing skills, rules and lint packages already
encode, which of them do we adopt wholesale, and how do we prove our own rule set works?

Investigate:
1. Read in full: github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md
   (375 lines, zero lints, its whole verification story being a fresh-Claude reader
   simulation), github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md
   (679 lines, RED-GREEN-REFACTOR against a subagent's verbatim rationalization), and
   the two VoltAgent subagents codified-practice.md names, which gate on "readability
   score > 60" and "page load time < 2s" without naming a formula or a tool. Classify
   each as adopt, adapt, or reject, with the reason.
2. Fetch mintlify.com/blog/skill-md and github.com/mintlify/starter/blob/main/AGENTS.md.
   Mintlify's auto-regenerated skill.md is a sibling artifact class to what this program
   ships — decide what it does better and whether any of its shape transfers.
3. Fetch the four humanizer skills (blader/humanizer with 35 patterns first) and
   vale.sh/hub/ package list. Decide which of these is imported as a dependency rather
   than re-authored, since all four derive from one Wikipedia essay.
4. Design this program's own verification loop from obra/superpowers' method: run a
   pressure scenario against a fresh agent without the rule, capture the verbatim
   rationalization, write the smallest rule line that defeats it, retest across several
   samples. Specify it concretely enough that phase 5 can execute it, and pick the two
   or three rules most worth testing this way.
5. Settle the fleet's own duplication. config-inventory.md: grimoire hand-forked ocx's
   docs-style.md and skills/docs/SKILL.md rather than installing them, and added a rule
   ocx lacks. Decide what the published artifact does about those two forks and what
   parts of docs-style.md are portable at all — the audit's axis 2 table already marks
   the VitePress-specific and product-specific rows as unportable.
6. Address the cost GitBook names: one shipped voice across many projects makes their
   docs sound identical. Decide whether the rule scopes its voice section as optional.

The deliverable must decide: the adopt/adapt/reject table for each prior-art artifact,
which external packages become dependencies, the concrete self-validation procedure with
its scenarios, the disposition of the two existing fleet forks, and which parts of the
shipped rule are marked house-style-and-optional rather than normative.
```

## Deferred

51 rows. "Ready to author" means a scout already researched it to authoring depth and a
wave-2 dive would add nothing — write the rule from the cited scout and move on.

### docs-page-types

- `eppo-vs-tutorial-linearity` — bites only once the fleet has a tutorial; today it has none.
- `stub-page-policy` — 24.6% of pages are stubs, but the fix is a deletion decision the owner makes, not a research question.
- `changelog-vs-release-notes` — the format half is already settled prior art (Keep a Changelog); only the two-artifact split is open.
- `glossary-vs-tooltip` — needs an engagement measurement the fleet cannot take yet.
- `paradigm-currency-check` — ocx already invented the marker; wave 2 generalizes it once the type contract exists.
- `modular-microconventions` — **ready to author** from `canonical-guides.md`'s Red Hat numbers (single step as a bullet, one command per block, 50-300 char description).

### docs-use-case-discovery

- `jtbd-vs-top-tasks` — no docs-specific JTBD source with a repeatable method exists; the absence is the answer.
- `exposure-hours` — requires watching a real person; not executable by this fleet.

### docs-plain-english

- `inclusive-language-gate` — **ready to author**: `alex`, Vale `BiasFree.yml`/`Gender.yml` and the Conscious Style Guide are named and off the shelf.
- `negative-contraction-avoidance` — **ready to author** from GOV.UK, but weakly evidenced for a developer audience; low value.
- `line-length-wrap` — **ready to author**; three guides give 80/80/100 and it affects diffs only.
- `i18n-readability-portability` — 0 of 9 sites has a locale directory; nothing to break yet.

### docs-examples

- `omitted-code-marker` — **ready to author** from Google's rule verbatim; a one-line grep.
- `shell-prompt-convention` — **ready to author**: `docs-shape.md` §6 measured the fleet's de-facto convention at 4.2% prompts, and Kubernetes bans the prompt outright.
- `code-tabs-vs-single-language` — a real disagreement (Vite/Tailwind vs Bun) but low blast radius; ocx already has the component.
- `interactive-tooling-choice` — no OpenAPI surface and little TS docs in the fleet; revisit if one appears.

### docs-navigation-search

- `search-index-staleness` — a hosted-search problem; client-side indexes rebuild with the site.
- `scoped-and-advanced-search` — no fleet site scopes search; entirely pre-emptive.
- `framework-default-affordances` — **ready to author** as a "do not re-author what the theme gives you" note; measured 9/9 in `ux-observability-posture.md`.
- `nav-diagnostics-not-checkable` — **ready to author** as an explicit non-rule list; NN/g says so about the F-pattern itself.

### docs-observability

- `task-completion-measurement` — needs readers the fleet does not have; the closest proxy is in the wave-1 instrumentation topic.
- `lighthouse-ci-as-docs-gate` — the fleet's one working gate, pointed at fixture output; re-aiming it is a repo change, not research.
- `docs-quality-as-dora-capability` — needs a survey population.

### docs-machine-readers

- `mcp-server-as-docs-surface` — depends on `ocx-mcp` existing beyond its own "not implemented yet" landing page.
- `agent-discovery-headers` — static hosting cannot set headers everywhere the fleet publishes.
- `skills-sh-directory` — a distribution question for grimoire-lore, not a documentation-design one.

### docs-process

- `doc-review-by-non-author` — in this fleet both roles are agents; folds into the review-loop design once the rule set exists.
- `doc-update-friction` — the concrete fix is repairing the two dead edit-this-page configs, not research.
- `dev-authored-first-draft` — same reason.
- `minor-vs-major-change-workflow` — low leverage where every change routes through one agent.
- `always-complete-cadence` — a cadence the owner sets; the research is done.
- `versioning-necessity` — **ready to author** from Docusaurus's own guidance (default to none, cap at 10); 0 of 9 sites version.
- `versioning-scheme-and-drift` — three unrelated meanings of "version switcher" with no fleet instance to ground a choice.
- `versionadded-sunset-rule` — **ready to author**: Django's mechanism is fully described in `canonical-guides.md`.
- `i18n-family` — 0 of 9 sites has a locale; whole family is pre-emptive.
- `github-as-docs-surface` — real (6 of 23 surfaces are README-only) but it is a glob and scope decision, taken below.
- `openapi-single-source` — no OpenAPI surface in the fleet; mkdocstrings is the only generated reference.
- `glob-excludes-build-output` — **ready to author**: `docs-shape.md` §0 already measured the exact exclusions needed.

### docs-accessibility

- `alt-text-presence-and-quality` — **ready to author** (markdownlint MD045 plus a placeholder stoplist); 12 images fleet-wide make it low-yield today.
- `color-contrast-and-dark-mode` — needs a rendered site; the two Lighthouse sites already prove the mechanism.
- `keyboard-and-custom-components` — collapses to one component (`Terminal.vue`), already owned by the wave-1 recording topic.
- `table-header-semantics` — **ready to author** as a non-issue note; Markdown tables produce real headers in all three fleet generators.

### docs-tooling

- `generator-currency` — a per-repo upgrade decision (VitePress 2 alpha, MkDocs Material maintenance mode), not a portable rule.
- `unpinned-generator-versions` — **ready to author**: two repos build unpinned; the rule is one line.
- `mkdocs-material-exit-path` — watch item; Zensical is not at parity.
- `search-and-chat-vendor-choice` — no fleet site uses hosted search; DocSearch v4's AI layer is already marked legacy by its vendor.
- `ai-chat-widget-deflection` — every number is vendor-reported and no source measured the failure case.
- `constrained-templating` — Stripe's Markdoc argument is interesting and unactionable here.
- `site-metadata-freebies` — **ready to author**: free on 7 of 7 MkDocs sites, absent on both hand-rolled ones; the rule is "set `site_url`, or hand-roll these five".
- `docs-build-as-ci-gate` — **ready to author** as already-universal (9 of 9); state it so nobody re-derives it.
- `joblint-inapplicability` — **ready to author** as closed: `codified-practice.md` answered it outright, no.

## Conflicts to resolve

| conflict | sources | owner topic |
|---|---|---|
| Four content types vs the frame's three vs GitLab's five vs 25 templates | `canonical-guides.md`, `recent-shifts-and-tooling.md` §14, `docs-frame.md` correction 5 | `page-type-set-and-declaration` |
| Diataxis as a proven contract vs a diagnostic with no controlled-study basis | `exemplar-sites.md` §2 (Tom Johnson, Canonical) | `page-type-set-and-declaration` |
| Culture-bound analogies mandated vs banned for a global audience | `ocx docs-style.md:54-64` vs `canonical-guides.md` (Google, Kubernetes) | `page-type-set-and-declaration` |
| Landing page opens with a hero vs opens with a command and task links vs opens with a caveat | `exemplar-sites.md` §1 vs `ux-observability-posture.md` §7 | `landing-page-contract` |
| Reference as one long page per resource vs one page per item | `exemplar-sites.md` §5 | `reference-page-contract` |
| Em-dash as an AI detector vs a house-style choice with a translation rationale | `docs-frame.md` hypothesis 5 vs `recent-shifts-and-tooling.md` §5 and `canonical-guides.md` (GitLab) | `ai-tell-set-and-honest-label` |
| A readability grade target at all: none in dev-doc guides, GOV.UK's 9 for citizens, 9-13 for technical readers, Vale's 8 at suggestion | `canonical-guides.md`, `codified-practice.md`, `exemplar-sites.md` §12 | `readability-gate-per-page-type` |
| Explain a term once vs hyperlink every occurrence, against a ~15-links-per-page cap | `design-systems.md` (GOV.UK) vs `ocx docs-style.md:44-50` vs `canonical-guides.md` (GitLab) | `lint-mechanism-and-rule-verification-shape` |
| Tested docs as shell script plus asciicast vs a mainstream language-native doctest runner | `docs-frame.md` hypothesis 6 and ocx's ADR vs `tested-examples-mechanism.md`'s ocx-sdk-python finding | `tested-example-gate` |
| Commit the recording vs commit the script vs commit neither; asciinema vs VHS | ocx gitignores 35 casts and rejected VHS; grimoire commits one | `recording-layer-and-interactivity` |
| NN/g's 2-level disclosure ceiling vs the 4+ levels generators demonstrate for large sites | `design-systems.md` §2/§4 vs `docusaurus.io/docs/sidebar` | `nav-depth-and-information-architecture` |
| Progressive disclosure helps a human reader and costs an agent ~31x in bytes | `recent-shifts-and-tooling.md` §2 vs `design-systems.md` §2 | `agent-readable-surface` |
| llms.txt as the agent-readability answer vs the markdown-twin convention, at 97% zero requests | `failure-and-observability.md` §11, `recent-shifts-and-tooling.md` §1/§2 | `agent-readable-surface` |
| Doc debt as a blocking defect vs a post-merge writing pass vs non-blocking-with-follow-up | `config-inventory.md` axis 3 (creeptd-ng vs ocx/grimoire) vs `exemplar-sites.md` §13 (GitLab) | `staleness-and-drift-gates` |
| ARID's "accept some repetition" vs Unique's "one source per fact" | `canonical-guides.md` (Write the Docs) | `staleness-and-drift-gates` |
| AI adoption raises the documentation-quality score and lowers delivery stability in the same report | `failure-and-observability.md` §1 (DORA 2024) | `minimum-instrumentation-set` |
| One shipped house voice as pure upside vs as a cost that makes every project sound alike | `codified-practice.md` (GitBook) | `prior-art-adoption-and-self-validation` |

## Artifact split and glob

### Where documentation actually lives

`docs-shape.md` §0-§1 and `ux-observability-posture.md` §0 measured it. Across 23 distinct
surfaces: 9 real docs sites (7 Material for MkDocs, 1 VitePress, 1 mdBook), 3 repos with a
`docs/` tree and no site at all, 6 README-only repos, and one Sphinx/reStructuredText tree
(`find_ocx`) invisible to any markdown-only tooling. Sources live under `docs/**` in every
repo except ocx, which uses `website/src/**`. Every real site is identified by exactly one
config file: `mkdocs.yml`, `.vitepress/config.*`, or `book.toml`.

### The `**/*.md` trade-off

`**/*.md` cannot miss a docs page, and that is its only advantage. Against it, measured in
this fleet: 420 Lighthouse CI reports under `ocx-catalog/.lhci-bulk/` plus 98 search-index
dumps under `.dev-indexes/`, 257 markdown files inside three stale `creeptd-ng/.worktrees/`
checkouts, and every `.claude/`, `.agents/` and research file in every repo — including this
map. `docs-shape.md` §0 states it directly: a rule globbing the fleet's markdown from a naive
find loads itself onto CI report output and stale worktrees. A docs-prose rule firing on an
AI-config file is not merely wasteful, it invites an agent to rewrite a rule file to satisfy
a prose standard.

The mirror risk is real too: a narrow glob silently misses. `globs-must-not-miss` says wide
plus a tight index beats narrow-and-silent.

### Recommendation

Two-tier, config-anchored:

```
paths:
  - docs/**
  - website/**
  - site/**
  - "*.md"                    # root README, CHANGELOG, CONTRIBUTING
  - mkdocs.yml
  - book.toml
  - .vitepress/config.*
  - docusaurus.config.*
  - astro.config.*
  - docs/conf.py
```

Reasons: it covers 23 of 23 measured surfaces; it excludes every measured false positive
without needing a negative-pattern list; and the generator-config entries are the reliable
positive signal that a docs *site* exists — 9 of 9 real sites have exactly one, and the 3
`docs/`-without-a-site repos have none. That distinction matters because
`ux-observability-posture.md` §1 warns that nav, search, hero and CTA standards fired on a
`docs/` tree with no site apply site-UX rules to content that structurally cannot carry
them, `grimoire-lore`'s own `docs/` included. The site-UX depth file states its own
precondition: a generator config in the repo.

The miss case is a project whose docs live somewhere unlisted. That is handled by the index
pointing at the discovery step in the planning skill, not by widening the glob to `**/*.md`.
`find_ocx`'s `.rst` tree stays out of scope and is named as out of scope, rather than
covered badly.

### Rule and depth files

One glob-scoped rule, `docs-quality`, index under 200 lines, with support files named by the
task the agent is doing rather than by subject:

| File | Loaded when the agent is | Carries |
|---|---|---|
| `page-types.md` | writing or reviewing a page | the type set, the declaration key, per-type contracts for landing, first-steps, how-to, reference, explanation, troubleshooting, and the mixing check |
| `plain-english.md` | writing prose | the thresholds, the tell list with severities, the honestly-labelled punctuation rule, and the per-type carve-outs |
| `examples.md` | adding or changing a code example | the tested-example gate, the per-language mechanism table, the binding convention, the untested-snippet marking, and the recording contract with its accessibility requirements |
| `navigation.md` | changing structure, nav or a config file | depth caps, page-length triggers, anchor stability, search and empty-state contracts. Precondition: a generator config exists |
| `observability.md` | setting up or reviewing instrumentation | the minimum signal set, what each writes and where, the disclosure requirement, and the review cadence |
| `machine-readers.md` | changing what a site publishes | the markdown-twin and index-file requirements, the agent-directed-prose rule, and the check per mechanism |
| `checks/` | running verification | the actual artifacts: a lint config, the grep list, the readability script with its preprocessing, and the link-check configuration with both measured traps handled |

`checks/` is a directory of runnable files, not prose. It is the difference between this rule
set and the fleet's existing 92 rules, of which 2 cite a check.

### One skill or two

Two. `docs-plan` discovers the use-case tiers, writes the user-need statements, inventories
and types the existing pages, and produces the IA plan. `docs-instrument` stands up the
verification: the lint config and its rollout thresholds, the link checker, the
tested-example harness for the repo's actual languages, and whatever zero-result and
feedback capture the search stack allows.

They separate because they have different triggers, different tools and different outputs,
and because a single skill would run past the 500-line body budget while loading the whole
discovery procedure onto an agent that only needs to add a lint. Writing an individual page
is neither skill's job — that is the rule's standards, loaded by glob.

## Needs a human decision

1. **Is the em-dash and semicolon ban a fleet house rule?** The evidence says it is a style
   choice, not a detector (`recent-shifts-and-tooling.md` §5). Retrofitting it costs 2,988
   em-dash edits in ocx alone. Decide: ban, warn, or drop — and whether this rule set's own
   prose keeps diverging from the rest of the repo on purpose.
2. **Does the published rule supersede `ocx/.claude/rules/docs-style.md` and grimoire's
   fork?** Two independently maintained forks exist, and grimoire's carries a rule ocx
   lacks (`config-inventory.md`). Superseding means a migration; not superseding means
   three docs rules in one fleet.
3. **Are `.cast` files committed?** ocx gitignores all 35; grimoire commits one. This
   decides whether the recording is reviewable and whether a docs build is reproducible
   offline.
4. **Does documentation debt block a merge?** The fleet already holds both answers
   (creeptd-ng's Block finding vs ocx's post-merge writer pass). Only the owner can pick.
5. **Do the site-UX rules fire on the three repos with a `docs/` tree and no site**, or are
   they gated on a generator config? The recommendation above gates them; confirm.
6. **Is Vale acceptable as a new dependency in every adopting repo?** A Go binary plus a
   styles directory in 12 repos, versus restricting every prose rule to grep and
   markdownlint. This decides how much of the plain-English family can be enforced at all.
7. **May a readability or prose gate fail CI red**, or is prose advisory forever? Vale's own
   shipped threshold fires at suggestion severity and never errors.
