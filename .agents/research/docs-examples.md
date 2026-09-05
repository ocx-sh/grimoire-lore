---
title: Tested examples and the recording layer — consolidated
topic: docs-examples
family: DOC-EX
model: claude-opus-5
consolidates:
  - .agents/research/docs-examples/tested-example-gate.md
  - .agents/research/docs-examples/recording-layer-and-interactivity.md
  - .agents/research/docs-examples/tested-examples-beyond-shell-python-rust.md
  - .agents/research/docs-examples/interactive-elements-contract.md
  - .agents/research/docs-topic-map/wave1-critique.md
  - .agents/research/docs-topic-map/wave2-declaration-key.md
  - .agents/research/docs-topic-map/wave2-severity-ledger.md
  - .agents/research/docs-topic-map/wave2-calibration-b.md
  - .agents/research/docs-audit/tested-examples-mechanism.md
  - .agents/research/docs-audit/docs-shape.md
  - .agents/research/docs-audit/config-inventory.md
  - .agents/research/docs-audit/ux-observability-posture.md
  - .agents/research/docs-frame.md
date: 2026-09-05
revised: 2026-09-05
wave: 2
---

# Tested examples and the recording layer

## Verdict

The gate is the test. The recording is a view on a passing test, and it is
optional. `docs-frame.md` hypothesis 6 ("tested examples embedded as real
asciicasts are best practice") bundles two separable things and this program
unbundles them: 31 of ocx's own 66 gated doc scripts ship with no recording at
all (`tested-examples-mechanism.md` §6), so the cast is demonstrably not
load-bearing for correctness.

The mechanism is chosen by what the example exercises, not by the project's
language. An example that only needs the project's own compiler or interpreter
belongs on that language's native doctest runner. Sybil for Python, `cargo test
--doc` for Rust, `mdbook test` for Rust inside an mdBook. Wave 2 closes the
TypeScript hole that made this a dead end: Twoslash type-checks a fenced sample
at build time, and `deno test --doc` executes one. An example that needs a real
registry, network or PTY still needs a custom acceptance harness, because no
mainstream doctest tool models that.

The flagship MUST now has a continuous detector. Wave 1 shipped DOC-EX-01 with a
one-off probe that proves a harness exists but cannot see an example added
tomorrow. The replacement is a set difference between fences tagged with a
runnable language and fences carrying a declared binding key. It has no false
positives by construction, because it only looks at fences the author marked
runnable.

Fence tier tags must be one hyphen-joined token. This was an open question and
it is now measured on real builds. A space-separated info string such as
`ts twoslash` is not merely unhighlighted under MkDocs Material 9.7.7. It is
unparsed, and the corruption swallows later page content. Seven of the fleet's
nine sites run that generator, so the tool-native space form is not portable.
The wave-1 guess that an attribute-based marking would be safer is wrong.

The commit question for recordings is not a preference. It is a branching rule
readable from the repo: commit the recording only when no build step
regenerates it. ocx (regenerating build, 35 casts gitignored) and grimoire (no
pipeline, one cast committed and re-recorded by script) are the same rule
applied to two different repo shapes, not two philosophies. This overrides the
frame's decision 3, which expected research to return a single pinned default.

The accessibility picture is narrower than the audit implied and the ruleset
reflects that: the WCAG Level A floor is already met by the shipped defaults,
and the one confirmed gap is the AAA-level `prefers-reduced-motion` check. The
severity ledger confirms DOC-EX-17 stays SHOULD, because AAA is AAA and the
honest level is the shipped level. That question is settled, not open.

The pattern's floor is far below its worked example, and the floor now exists as
a file. ocx spends 7,925 lines of test Python behind 66 scripts. Wave 2 ships
`run_doc_examples.py`, 55 lines with no dependency, tested against a passing and
a broken fixture. DOC-EX-04 stops being a reading heuristic.

Interactive elements beyond the terminal player are a per-generator support
contract, not a universal default. Copy buttons are opt-in on MkDocs Material
and shipped by default on VitePress and mdBook. Tabs are native on two
generators and absent on the third. Live sandboxes carry a browser reach ceiling
that makes a plain fenced fallback a requirement, not an enhancement.

**Documented gaps, established rather than answered.**

- The recording pipeline's wall-clock cost is still measured at 22 scripts. The
  script count was re-confirmed at exactly 35, so the 59 percent growth is
  current. The timing was not re-run, because it needs real registry pushes and
  a live six-container Sigstore stack in shared use.
- Redocly's exact Try-It paywall boundary is inherited from wave 1. The pricing
  page confirms no free tier for its Reference product and does not itemise
  features per tier.
- Stoplight Elements lists its own Try-It console as a roadmap item. A roadmap
  item is the fact most likely to have changed by the time this is read.
- No fleet project measures whether a tooltip is ever opened. A tooltip rule can
  state a shape and cannot cite an engagement threshold.

## The ruleset

Thirty-four rules, one of them retired in place. Ordered by concern: the gate,
the mechanism, the marking, the recording layer, then the interactive layer.

Every "Applies to" value names a `doc_type` value read from the page's
declaration comment, per the wave-2 declaration-key decision and DOC-TYPE-01.
No rule here reads a page type from a path or a directory name. The declaration
carrier is one key per comment line inside the first 12 lines, using the
opener of the file's markup family (`<!--` for markdown, `{/*` for MDX, `..`
for reStructuredText, `%` for MyST). DOC-EX-02's `# doc:` binding key lives in
the test file, not the page, and does not collide with `doc_type`.

| ID | Rule | Rationale | Verification | Severity | Evidence | Applies to |
|---|---|---|---|---|---|---|
| **DOC-EX-01** | Back every runnable documented example with one automated test in the same required gate as the unit tests. | Stops a documented command from drifting away from the tool it demonstrates. | Set-diff the fences whose info string is on the project's runnable tier list against the fences carrying a declared binding key. A non-empty difference fails. Reuses DOC-EX-05's tier list and DOC-EX-02's key. | MUST | measured, 66 bound scripts with zero orphans (`tested-examples-mechanism.md` §6) plus the tier list from markdownlint MD040 `allowed_languages` | tutorial, how-to, reference, troubleshooting |
| **DOC-EX-02** | Bind a page to an out-of-page test with a declared key in the test header, never with a mirrored file path. | A mirrored path makes every test-tree move break every page that cites it. | List the declared keys in the test tree and the keys cited by pages, then diff the two lists. Both sides must come back empty. | MUST | measured, 66 live `# doc:` bindings and 0 orphans (`tested-examples-mechanism.md` §6) | tutorial, how-to, reference |
| **DOC-EX-03** | Test an example with the language's own doctest runner unless it needs a real external system. | Prevents a bespoke harness being built for work an installed tool already does. | Before adding any doc-example test module, grep the dependency manifest, the generator config and CI for `sybil`, `cargo test --doc`, `mdbook test`, `twoslash`, `@shikijs/vitepress-twoslash` or a `deno` binary. A new harness with no external system in scope is the finding. | SHOULD | argued for the obligation, no normative source states it. Measured for the tools: Sybil in ocx-sdk-python `conftest.py:25-42`, Twoslash 0.3.9 and Deno 2.9.6 (`tested-examples-beyond-shell-python-rust.md` §1) | tutorial, how-to, reference |
| **DOC-EX-04** | Start a doc-example harness as one file that globs the example tree and runs each file as a subprocess. | Keeps a small project from copying the scale of a large worked example. | Run the shipped `checks/run_doc_examples.py` against its fixture pair, one passing and one deliberately broken. Exit codes must be 0 and 1. | SHOULD | measured, 55-line harness run in both directions (`tested-examples-beyond-shell-python-rust.md` §6) | all |
| **DOC-EX-05** | Tag every code fence you add or change with a language from the project's declared tier list. | An untagged fence is invisible to every drift check, so it neither passes nor fails. | markdownlint MD040 with `allowed_languages` set to the tier list, run on changed lines only. | SHOULD | measured, 151 of 1,281 fleet fences untagged, 11.8 percent (`wave2-calibration-b.md` §4). Codified by markdownlint MD040 | all |
| **DOC-EX-06** | Wrap a snippet that must not run in a paired marker that states why. | A bare skip flag reads later as an oversight rather than a decision. | Grep the open marker and require a `: <reason>` suffix, then require a matching close marker before the next open marker or end of file. | MUST | measured, 1 hit in 249 fleet pages, `ocx/website/src/docs/user-guide.md` (`wave2-calibration-b.md` §4). Codified by ocx's paired marker | how-to, reference, explanation, troubleshooting |
| **DOC-EX-07** | Make a failing example test name the doc page, not only the test file and line. | Without the page name every CI failure costs a manual reverse map back to the reader's view. | Force one example to fail and read the CI output for the declared binding key and the human title. | SHOULD | codified, ocx's DG1-DG3 failure contract (`design_spec_doc_command_scripts.md:249-263`). A one-off probe cannot carry a MUST | all |
| **DOC-EX-08** | Do not claim a shown example is identical to what ran when the harness substitutes any value. | The claim is falsified the first time a reader checks a parallel-safe test run. | Case-insensitive grep for `exactly`, `identical`, `verbatim` and `byte-for-byte` under the tested-example mechanism's own doc tree, named as a path glob. Never a bare page-type filter. Each hit needs a stated canonicalization step. | SHOULD | measured, 709 fleet-wide hits with 662 off-target, a 93.4 percent false-positive rate (`wave2-calibration-b.md` §4, candidate 12) | the mechanism's own doc tree |
| **DOC-EX-09** | Confirm a doc-collection glob reaches a page nested two levels deep before trusting it. | A tool whose docs promise `fnmatch` may use `pathlib.match`, whose `**` matches one level. | Add one fixture page two directories deep, run the collector, and confirm the page is collected. | SHOULD | measured, Sybil's `should_parse` calls `pathlib.Path.match` against its own docstring (`simplistix/sybil` `src/sybil/sybil.py`) | all |
| **DOC-EX-10** | Ship a scan for documented commands with no backing test as a lead list, never as a merge gate. | The scan flagged 20 mentions on one real page and 11 were legitimate annotated history. | Grep the CI config and confirm the scan is not in the required checks. Run it against the DOC-EX-06 markers first to strip known exemptions. | SHOULD | measured, roughly 55 percent false positives on one page, 11 of 20 mentions (`tested-examples-mechanism.md`, Counts caveat) | how-to, reference |
| **DOC-EX-11** | Keep the recorder out of the gate so the example suite passes or fails without it. | A recorder wired into the gate makes a rendering step able to fail a correctness check. | Disable the recording step and re-run the required gate. The result must not change. | MUST | measured, ocx's recordings run only in `website:build` (`website/recordings.taskfile.yml:34-49`) | all |
| **DOC-EX-12** | Produce every terminal recording by running a real command, never by typing a transcript. Delete an unused non-executing mockup mode rather than leave it available. | A fabricated transcript is the exact artifact the tested-example system exists to prevent. An unused way to fabricate one is a standing invitation. | Grep the component library for any mode that builds player input from static text and timestamp pairs. Any use on a page with no backing test fails. A mode with zero uses beside a live mode is deleted. | MUST | pinned, this program's central decision, with a measured instance: `Frame.vue` has 0 uses across 36 live embeds (`wave2-calibration-b.md` §4) | landing, tutorial, how-to |
| **DOC-EX-13** | Commit a recording only when no build step regenerates it. | Committing a regenerated file invites drift between the file and the test that made it. | `git ls-files <recordings dir>` against the build task graph. Tracked and regenerated at once is the contradiction to catch. | MUST | measured, ocx tracks 0 casts and grimoire tracks 1 (`wave2-calibration-b.md` §4). Codified by both repos' pipelines | landing, tutorial, how-to |
| **DOC-EX-14** | State the cast version you write and the player version you pin, and check the player parses it. | Asciicast is three formats, and v3 changed the header schema and the timestamp base. | `head -c 40 <a generated cast>` for `"version": N`, then grep the pinned player's parser for a `parseAsciicastVN` branch. | SHOULD | measured, both repos write `"version": 2` against player `^3.15.1` (`wave2-calibration-b.md` §4) | reference, explanation |
| **DOC-EX-15** | Default a recording-bound player to no autoplay. | Not creating auto-starting motion is the cheapest way to satisfy WCAG 2.2.2 Pause Stop Hide, Level A. | Grep the component's `autoPlay` default. It must evaluate false whenever a recording source is set. Then grep pages for explicit overrides. | MUST | codified by WCAG 2.2.2 Level A. Measured, `Terminal.vue:149` reads `props.autoPlay ?? !props.src` (`wave2-calibration-b.md` §4) | landing, tutorial, how-to |
| **DOC-EX-16** | Leave the embedded player's own accessible controls enabled. | A custom skin is far likelier to drop the pause button's label than the upstream library is. | Grep the player init for a `controls:` option. Absent, `"auto"` or `true` passes. `controls: false` or a CSS-hidden bar with no keyboard replacement fails. | MUST | codified by WCAG 2.2.2 Level A and asciinema-player's own labelled `ControlBar.js` | landing, tutorial, how-to |
| **DOC-EX-17** | Check `prefers-reduced-motion` before starting playback. | A viewer who asked the OS for less motion still gets a full replay without it. | Grep the player init path for `matchMedia('(prefers-reduced-motion`. Absence is the finding. | SHOULD | measured, 0 hits across ocx and grimoire (`wave2-calibration-b.md` §4). WCAG 2.3.3 places this at AAA, which caps the severity | landing, tutorial, how-to |
| **DOC-EX-18** | Add a declarative recorder such as VHS only when no page-bound acceptance-script tree exists. | Two script formats mean two discovery paths and two classes of sanitization. | Fail when the repo holds both a `.tape` file and a page-bound acceptance-script tree. | SHOULD | measured, `find -iname '*.tape'` returns 0 fleet-wide (`wave2-calibration-b.md` §4) | all |
| **DOC-EX-19** | RETIRED, merged into DOC-EX-12. | The unused-mockup ban is one obligation with the fabricated-transcript ban, not two. | See DOC-EX-12's second clause. | RETIRED | measured, 0 of 36 live embeds use `<Frame>` (`wave2-calibration-b.md` §4) | n/a |
| **DOC-EX-20** | Write a fence tier suffix as one whitespace-free token joined to the language by a hyphen. | A space in a fence info string is unparsed by `pymdownx.superfences`, and the damage spreads past that fence into later page content. | Build a two-fence fixture, one hyphen-tagged and one space-tagged, under `pymdownx.superfences` with default config. The space-tagged fence must break the page and the hyphen-tagged one must not. | MUST | measured on real builds of MkDocs Material 9.7.7, mdBook 0.5.3 and VitePress 2.0.0-alpha.16 (`tested-examples-beyond-shell-python-rust.md` §7) | all |
| **DOC-EX-21** | Use a tool-native space-separated fence attribute only on a site that will never render under MkDocs Material. | Banning `ts twoslash` and `ts ignore` outright would cost real functionality on the two generators that parse them correctly. | Grep the docs tree for a generator config named `mkdocs.yml`. If one exists, grep changed pages for a fence info string containing a space and fail on any hit. | SHOULD | measured, same three builds as DOC-EX-20. 7 of the fleet's 9 sites run MkDocs Material (`docs-shape.md`) | all |
| **DOC-EX-22** | Show a Go code sample by transcluding a tested `Example` function, never by authoring a fresh fence. | Go has no Markdown-fence runner, so an authored Go fence is untested by construction. | For a page with a `go` fence, grep the cited source for a matching `func Example...` with a trailing `// Output:` or `// Unordered output:` comment, and grep the build for an `embedmd` directive pointing at it. | SHOULD | normative, `pkg.go.dev/testing#hdr-Examples` and `campoy/embedmd`'s README. No fleet repo is Go, so this is pattern reference | how-to, reference |
| **DOC-EX-23** | Never let one tool both rewrite a page's fenced output and serve as that example's only correctness check. | A rewrite-in-place runner captures whatever a flaky or newly broken command printed as the new expected output. | For any fence carrying a rewrite-in-place directive, grep for a second independent check. Either a committed last-known-good output diffed in CI, or a bind-and-assert test on the same command. | CONSIDER | argued, no fleet instance combines the two. Shapes read from `markdown-code-runner`, `embedmd` and MDCR `--check` (`tested-examples-beyond-shell-python-rust.md` §5) | all |
| **DOC-EX-24** | Set `content.code.copy` and `content.code.annotate` in `theme.features` on a MkDocs Material site. | The copy button is off by default on that generator and costs one config line. | `grep -A5 'features:' mkdocs.yml \| grep 'content.code.copy'`. A site with a `mkdocs.yml` and no match fails. | SHOULD | measured, 7 of 7 fleet MkDocs Material sites already set it (`interactive-elements-contract.md` §1) | all |
| **DOC-EX-25** | Do not add a component or script to give VitePress or mdBook a copy button. | Both ship one already, so a hand-rolled button is dead code plus a second surface to keep accessible. | For mdBook, confirm `clipboard*.min.js` appears in a fresh `mdbook build` and that `book.toml` does not set `copyable = false`. For VitePress, confirm no custom copy component exists. | SHOULD | measured, `mdbook-core` `config.rs:617-618,632` defaults `copyable` to true and VitePress `preWrapper.ts:46` injects the button unconditionally | all |
| **DOC-EX-26** | Present parallel install or usage paths as tabs only when the reader's own context decides which path they need. | Tabbing a step that has one right answer manufactures a decision the reader does not have to make. | unverified: reading heuristic. For each tabbed block, name in one sentence what varies between tabs. An answer that names nothing about the reader is the finding. | SHOULD | measured for the contrast, Vite and Tailwind tab 4 to 5 package managers and Bun shows one command (`interactive-elements-contract.md` §3). Argued for the test itself | landing, how-to, reference, explanation, troubleshooting |
| **DOC-EX-27** | Never make a live sandbox the reader's only way to see a documented example. | Full WebContainers support needs SharedArrayBuffer under cross-origin isolation, which is Chromium-only at full strength. | For any page embedding a live sandbox, grep the page source for a fenced block carrying the same code. It must not sit only inside the sandbox's initial-file payload. | MUST | measured, webcontainers.io's own browser-support page lists Firefox alpha, Safari 16.4 preview only, and no mobile iOS support (`interactive-elements-contract.md` §5) | all |
| **DOC-EX-28** | Do not propose Sandpack for a new embedded playground, and flag an existing one for a maintenance review. | Eighteen months with no release on a library still accumulating issues is a measured abandonment signal. | Check the project's latest release date on its GitHub releases page. A result older than 12 months triggers the flag. | SHOULD | measured, latest release `v2.20.0` dated 2025-02-14 against a September 2026 era (`interactive-elements-contract.md` §6) | all |
| **DOC-EX-29** | State mdBook's `runnable` and `editable` playground keys explicitly whenever the book contains a Rust example. | An unstated default reads later as nobody deciding, and a book wanting no Run button silently keeps one. | `grep -A3 '\[output.html.playground\]' book.toml`. Its absence on a book with fenced Rust blocks is the finding. | SHOULD | measured, grimoire's `book.toml` sets neither key (`interactive-elements-contract.md` §7) | all |
| **DOC-EX-30** | Set `#![doc(html_playground_url = "https://play.rust-lang.org/")]` on a published crate whose doc comments carry runnable examples. | The rustdoc book states plainly that without the attribute there are no Run buttons. | `grep -rn html_playground_url` on the crate root. Its absence beside doctested public examples is the finding. | SHOULD | normative, the rustdoc book quoted verbatim. Measured, 0 of 3 fleet Rust crates set it (`interactive-elements-contract.md` §7) | reference |
| **DOC-EX-31** | Name the vendor before adopting an OpenAPI try-it console, and confirm that vendor's current status directly. | The three vendors differ. One is free and shipped, one is paid only, one is free with the console still on its roadmap. | unverified: reading heuristic. Re-read the named vendor's own pricing page or README for whether Try It is present and free, before writing any project guidance. | CONSIDER | measured for the three vendor states, Scalar MIT and shipped, Redocly with no free Reference tier, Stoplight with Try It on its roadmap (`interactive-elements-contract.md` §8) | reference |
| **DOC-EX-32** | Do not add Twoslash, a live sandbox or a try-it console to a project with no TypeScript reference and no OpenAPI surface. | Naming a mechanism for a surface that does not exist yet is speculative scaffolding. | Search for `openapi*.yaml` or `openapi*.json` and for `.d.ts`-backed reference pages. Zero hits on both means no action is required. | CONSIDER | measured, 0 of 23 fleet docs surfaces carry either (`interactive-elements-contract.md` §9) | all |
| **DOC-EX-33** | Reserve a tooltip or an abbreviation for a term that would otherwise force a definitional clause into the reader's sentence. Never use one for content the reader must read to follow the page. | A load-bearing definition hidden behind hover is invisible to a plain-text reader and to anyone without a mouse. | unverified: reading heuristic. Remove the tooltip's slot content and read the sentence aloud. A sentence that becomes false or unreadable without it was load-bearing prose wrongly hidden. | CONSIDER | argued, fleet house-style opinion with zero engagement data anywhere (`docs-topic-map.md:65`) | all |
| **DOC-EX-34** | Make a hover-triggered or focus-triggered tooltip keyboard reachable, pointer hoverable, and dismissible with Escape. | A trigger passed to a primitive as a bare span silently loses focus behaviour, which is a Level AA conformance failure. | Grep the tooltip component for `tabindex`, a keydown handler and `aria-describedby`. Then tab to the trigger with no mouse, move a pointer onto the popup, and press Escape. Any of the three failing is the finding. | MUST | normative, WCAG 2.1 SC 1.4.13 Level AA, primary source read directly (`interactive-elements-contract.md` §4) | all |

One wave-2 candidate is deliberately not a DOC-EX rule. The requirement that a
Markdown twin contain every tab's code and every tooltip definition extends
DOC-AGENT-03 and keeps that rule's ID and severity. The tooltip selection rule
and the WCAG 1.4.13 hover-and-focus rule stay in this family as DOC-EX-33 and
DOC-EX-34. They were proposed as DOC-TYPE-28 and DOC-TYPE-29, which collide with
the declaration-carrier rules that already hold those two numbers.

Rules deliberately not shipped: a re-measure-the-pipeline-cost threshold
(asserted, invented here, and it changes nothing an agent writes), and a
default choice of interactive sandbox vendor (0 of 23 fleet surfaces use one,
and the licence tiers differ enough that a default would be wrong somewhere).

## Applied to the fleet

**Satisfied.**

- DOC-EX-01, DOC-EX-02, DOC-EX-07: ocx runs 66 acceptance-tested `.sh` scripts
  collected into `task verify` independent of any website build
  (`tested-examples-mechanism.md` §3, root `taskfile.yml:117-127`). All 66 bind
  to exactly one page by a `# doc:` slug with zero orphans (§6), and the failure
  message names script path, title and slug (DG1-DG3,
  `design_spec_doc_command_scripts.md:249-263`).
- DOC-EX-03: ocx-sdk-python reaches for Sybil rather than building anything,
  running every fence in `docs/**/*.md` and `README.md` plus docstring doctests
  (`conftest.py:25-42`). ocx's own registry and Sigstore side effects are the
  case where the custom harness is correct.
- DOC-EX-06: 1 hit in 249 pages, ocx's paired
  `<!-- moved-command-ok: ... --> ... <!-- /moved-command-ok -->` marker at
  `ocx/website/src/docs/user-guide.md:1182,1205`. That is the shape the rule
  generalizes.
- DOC-EX-08: satisfied only after the 2026-05-18 EX10/DE6 addendum, which
  replaced an identity claim with `declared == canonical(provisioned)`
  (`ocx/test/src/doc_scripts.py:469-476,550-616`).
- DOC-EX-09: ocx-sdk-python documents the Sybil glob trap in its own conftest
  and works around it (`conftest.py:78-87`).
- DOC-EX-10: the audit's own unbacked-mention grep was reported as a lead list,
  not a finding, at 11 legitimate hits in 20 on one page, a roughly 55 percent
  false-positive rate.
- DOC-EX-11: the recordings pipeline runs only in `website:build`, never in
  `verify` (`website/recordings.taskfile.yml:34-49`).
- DOC-EX-12: `grep -c '<Frame'` over ocx's docs returns 0 across 36 live
  `<Terminal>` embeds, so the fabrication mode is present and unused.
- DOC-EX-13: both branches confirmed by `git ls-files`. ocx tracks 0 casts and
  carries 105 on disk under build output. grimoire tracks exactly 1,
  `docs/src/demo.cast`, because mdBook regenerates nothing.
- DOC-EX-15, DOC-EX-16: `Terminal.vue:149` reads
  `props.autoPlay ?? !props.src`, false for every cast-bound embed, and no page
  overrides it. Neither ocx nor grimoire passes `controls: false`.
- DOC-EX-18: `find -iname '*.tape'` returns 0 across every fleet repo, and ocx
  rejected VHS on exactly this one-tree ground.
- DOC-EX-24: 7 of 7 fleet MkDocs Material sites set `content.code.copy` and
  `pymdownx.tabbed`. This is the one interactive control the fleet gets
  uniformly right.
- DOC-EX-25: grimoire's built `docs/book/` carries `clipboard-1626706a.min.js`
  from mdBook's own default, and ocx adds no copy component to VitePress.
- DOC-EX-32: 0 of 23 surfaces carry an OpenAPI spec or a TypeScript reference,
  so the precondition for adopting any of the three is unmet.

**Violated.**

- DOC-EX-01, seven of nine sites. Only ocx and ocx-sdk-python have any tested
  doc mechanism at all. ocx-catalog runs 23 pages with none despite sharing
  ocx's VitePress lineage (`config-inventory.md`, headline numbers). grimoire's
  gap is shell-shaped, not a missing doctest wiring: its docs carry zero Rust
  fences, so `mdbook test` has no surface there
  (`tested-example-gate.md` §10).
- DOC-EX-05, fleet-wide. 151 of 1,281 paired fences carry no language tag, 11.8
  percent, with ocx carrying 71 of them (`wave2-calibration-b.md` §4). The
  wider non-deduplicated scan in `docs-shape.md` §6 reports 343 of 3,065 at the
  same rate. This is why the rule enforces on changed lines only.
- DOC-EX-08's own verification, run at the wrong scope. Fleet-wide the literal
  pattern returns 709 hits on 249 pages and only 47 sit anywhere near mechanism
  content. That is a 93.4 percent false-positive rate, and it is why the
  verification now names a path glob instead of a page type.
- DOC-EX-11 and DOC-EX-01 together, ocx-save. It runs a cast-only recordings
  taskfile with no `doc_scripts/` directory at all, so recordings exist with no
  gate behind them. It also carries cast output under `.vitepress/dist/`, which
  is build output in the tree, against DOC-EX-13.
- DOC-EX-14, both recording sites. Both write `"version": 2` against a pinned
  `asciinema-player` `^3.15.1`, and grimoire vendors 3.17.0. Both work,
  confirmed from the player's own parser dispatch, but neither project states
  the pair anywhere.
- DOC-EX-17, ocx and grimoire. `grep -rl 'prefers-reduced-motion'` returns 0
  hits across both repos.
- DOC-EX-20, unmeasured but live. No fleet page uses a space-separated fence
  attribute today. The rule exists because the corruption is invisible until the
  next fence on the same page vanishes.
- DOC-EX-29, grimoire. `book.toml` sets no `[output.html.playground]` section,
  so Run buttons are on by an unstated default.
- DOC-EX-30, all three fleet Rust crates. `grep -rn html_playground_url` returns
  no hits, so every fleet rustdoc page ships with no Run button.

**New commitments, nothing in the fleet does them.**

- DOC-EX-04's shipped file. The fleet's only worked example is 7,925 lines
  behind 66 scripts plus a six-container Sigstore stack. The 55-line harness
  exists now so that number is not read as the entry price.
- DOC-EX-12 as a stated rule. ocx enforces it by convention and by 0 usages of
  `<Frame>`, but `config-inventory.md` axis 4 records that no repo has any rule
  about when to record versus when to screenshot.
- DOC-EX-20 through DOC-EX-23. No fleet repo states a fence separator rule, ships
  a Go docs page, or runs a rewrite-in-place tool.
- DOC-EX-26 through DOC-EX-28, DOC-EX-31. No fleet repo embeds a sandbox or a
  try-it console, and no repo states a tabs-or-one-command test.
- The verification shape itself. Across roughly 92 docs-prose rules in the
  fleet exactly 2 cite a runnable check (`config-inventory.md` axis 5). The
  template being copied is bob's rustdoc rule set, 11 of 12 rules with an
  inline command in the same table row (`docs-and-tracing.md:29-40`).

## AI-agent failure modes

Ranked by how often it bites when an agent writes documentation unsupervised.

1. **Writes plausible command output or flag names it never ran.** The prose
   reads identically whether or not the command exists. Nothing short of
   execution catches it. → DOC-EX-01.
2. **Copies a tool's own space-separated fence attribute into a project's tier
   scheme.** ` ```ts twoslash ` is the syntax visible in Twoslash's and Deno's
   docs. Under MkDocs Material it silently eats the next fence. → DOC-EX-20,
   DOC-EX-21.
3. **Leaves a fence untagged, or tags everything runnable.** No tag is the path
   of least resistance and a blanket tag is the path of least thought. →
   DOC-EX-05.
4. **Builds a bespoke harness instead of using the installed doctest runner,
   then sizes it like the worked example it read.** For TypeScript it reaches
   for Jest or Vitest and writes a Markdown parser, not knowing Twoslash and
   `deno test --doc` exist. → DOC-EX-03, DOC-EX-04.
5. **Writes a hand-typed terminal mockup when asked for a lightweight demo.**
   The fabricated transcript needs zero infrastructure, which is exactly why it
   gets reached for. → DOC-EX-12.
6. **Builds a copy-to-clipboard component on VitePress or mdBook.** Both ship
   one, and the training-corpus habit is to write one anyway. → DOC-EX-25.
7. **Tabs every install variant reflexively.** Tabbed installs are the majority
   shape in training data, and Bun's deliberate one-command exception is rare
   there. → DOC-EX-26.
8. **Silently deletes a mention of a removed command, or leaves it bare.**
   Either erases migration context or trips the drift check. → DOC-EX-06.
9. **Copies an autoplaying, looping embed from a training-corpus example, then
   hand-rolls a pause button the library already ships.** The library's
   accessible default is invisible in a static code sample. → DOC-EX-15,
   DOC-EX-16, DOC-EX-17.
10. **Adds a live sandbox as the only way to see an example.** The embed reads
    as more polished than a fence, and the reach ceiling is invisible from the
    Chromium browser the agent tested in. → DOC-EX-27.
11. **Recommends a long-dead package such as `jsdoctest` or `markdown-doctest`
    because it is the first search hit.** All are four or more years stale. →
    DOC-EX-03.
12. **Overclaims fidelity, writing that the page shows exactly what executed.**
    Absolute language reads as rigor and costs nothing to type. → DOC-EX-08.
13. **Commits a generated recording to be safe, or deletes a committed one on
    principle, without checking whether a build regenerates it.** Both defaults
    are half right. → DOC-EX-13.
14. **Mirrors the test tree's directory layout into the doc tree for
    consistency.** Structurally the obvious choice, and the one the ADR scored
    2.15 against 4.45. → DOC-EX-02.
15. **Writes a fresh untested `go` fence instead of pointing at the real
    `Example` function `go test` already checks.** → DOC-EX-22.
16. **Wires a rewrite-in-place tool into CI and calls it tested.** The tool
    accepts a broken command's new output as the new expectation. → DOC-EX-23.
17. **Reaches for Sandpack because it is the most-mentioned playground library
    in training data.** → DOC-EX-28.
18. **Assumes rustdoc or mdBook adds a Run button on its own**, having seen one
    on `std`'s docs. Both are opt-in config. → DOC-EX-29, DOC-EX-30.
19. **Treats asciicast as one unversioned format and assumes any player plays
    any cast.** → DOC-EX-14.
20. **Wires the unbacked-command heuristic in as a hard gate on first write.** →
    DOC-EX-10.
21. **Adds a `.tape` beside an existing acceptance-script tree, because VHS is
    the tool that surfaces for "record a terminal demo".** → DOC-EX-18.
22. **Trusts a tool's documented glob semantics and silently loses coverage.** →
    DOC-EX-09.
23. **Ships a failure message naming only the test file, because that is what
    the framework prints for free.** → DOC-EX-07.

## Open questions

**Needs a human decision.**

1. The frame's decision 3 expected research to return a pinned default for
   committing casts. It returns a branching rule instead, because the answer is
   readable from the repo shape. Confirm that a rule with no single default is
   acceptable, or pick one and accept it will be wrong for one of the two fleet
   shapes. The severity ledger routes this to the owner as DOC-EX-13's one
   condition.
2. Whether DOC-EX-01 blocks a merge in an adopting repo. This is the same call
   as the frame's decision 4, which is already marked the owner's. The rollout
   shape is settled: enforce on changed files from day one, warn whole-tree
   until the backfill lands.

**Deserves another research round.**

- `recording-wall-clock-cost` — The opt-in policy rests on a pipeline timing
  measured at 22 scripts. The count is now confirmed at 35, so the 59 percent
  growth is current, but the timing was not re-run. A pass with dedicated
  registry and Sigstore infrastructure would settle whether the opt-in default
  should move.
- `openapi-console-vendor-status` — Stoplight Elements lists its Try-It console
  as a roadmap item and Redocly's per-tier feature boundary is inherited from
  wave 1. Both need a direct re-read at the moment a fleet project ships an
  OpenAPI surface.

## Revision log

Wave 2, 2026-09-05. Every wave-1 ID keeps its number and its meaning.

- DOC-EX-01: verification replaced. The one-off break-a-command probe becomes a
  set difference between runnable-tagged fences and fences carrying a binding
  key. Reason: the probe proves a harness exists and cannot see an example added
  tomorrow (`wave2-severity-ledger.md` §6). Severity stays MUST.
- DOC-EX-03: MUST demoted to SHOULD per the severity ledger. The ledger gave two
  reasons and wave 2 kills one of them. TypeScript is no longer a dead end,
  because Twoslash and `deno test --doc` both exist and are current. The
  surviving reason is that no normative source states the obligation itself.
  Rule text extended to name the TypeScript tools in the grep.
- DOC-EX-04: verification upgraded from a reading heuristic to a runnable
  command. `run_doc_examples.py` is shipped and tested in both directions. The
  literal marker `unverified: reading heuristic` is removed because the row now
  carries a command. Severity stays SHOULD.
- DOC-EX-05: severity unchanged at SHOULD, hit count added. The separator half
  of the wave-2 recommendation becomes DOC-EX-20 rather than raising this rule,
  because presence and separator are two obligations.
- DOC-EX-07: MUST demoted to SHOULD per the ledger. A one-off probe cannot carry
  a MUST and this is an ergonomics rule.
- DOC-EX-08: verification rescoped from a page-type filter to a path glob under
  the mechanism's own doc tree. Measured 709 fleet hits with a 93.4 percent
  false-positive rate. Severity stays SHOULD.
- DOC-EX-10: severity unchanged. The 55 percent rate now sits on the row, and
  the ledger's note that DOC-EX-01's new detector makes this optional is folded
  into the rationale.
- DOC-EX-12: evidence relabelled from normative to pinned per the ledger, and
  DOC-EX-19's clause absorbed as its second sentence.
- DOC-EX-19: RETIRED, merged into DOC-EX-12. Row kept in place. The number is
  never reused.
- DOC-EX-13, 14, 15, 16, 17, 18: severities unchanged, calibration hit counts
  added to each row.
- DOC-EX-17: the question of raising it to MUST is closed, not deferred. WCAG
  places it at AAA and the ledger confirms SHOULD. Removed from Open questions.
- All 19 wave-1 rows: bare evidence words replaced with sourced evidence cells,
  per the ledger's normative candidate 10. No severity moved because of this.
- New from `tested-examples-beyond-shell-python-rust.md`: DOC-EX-20 (MUST, fence
  separator), DOC-EX-21 (SHOULD, tool-native space form), DOC-EX-22 (SHOULD, Go
  transclusion), DOC-EX-23 (CONSIDER, rewrite-in-place is not a check).
- New from `interactive-elements-contract.md`: DOC-EX-24 and DOC-EX-25 (SHOULD,
  copy buttons), DOC-EX-26 (SHOULD, tabs test), DOC-EX-27 (MUST, sandbox
  fallback), DOC-EX-28 (SHOULD, Sandpack), DOC-EX-29 and DOC-EX-30 (SHOULD, Run
  buttons), DOC-EX-31 and DOC-EX-32 (CONSIDER, console vendors and the not-yet
  gate). The dive proposed DOC-EX-20 through 27 for these, and they are shifted
  to 24 through 32 because the other wave-2 dive's rules take 20 through 23.
- Declaration-key decision applied. A note above the table states that every
  "Applies to" value is a `doc_type` value read from a declaration comment in
  the first 12 lines, never from a path. DOC-EX-08's page-type scope is dropped
  entirely in favour of a path glob over the mechanism's own docs. DOC-EX-02's
  `# doc:` key is confirmed distinct from `doc_type` and unchanged.
- DOC-AGENT-12 applied. Every numeric threshold on every row now names its
  measurement, tool or citation on the same row.
- DOC-AGENT-16 applied. DOC-EX-26 and DOC-EX-31 carry the literal marker
  `unverified: reading heuristic` and are capped at SHOULD and CONSIDER. No
  other row lacks a command.
- Contradiction resolved in place. Wave 1's Open questions guessed that an
  attribute-based fence marking might be better if highlighting degraded. The
  measurement says the opposite, so that text is deleted from Open questions and
  the opposite conclusion is stated in the Verdict and in DOC-EX-20.
- Open questions closed: `ts-tested-examples` (two current TypeScript mechanisms
  exist), `fence-tier-rendering` (measured on all three generators). Open
  question 3 on DOC-EX-17 closed by the ledger. Open question 4 on ocx's
  `Frame.vue` closed by DOC-EX-19's retirement.
- Open questions moved into the Verdict as documented gaps: the recording
  pipeline's wall-clock cost, Redocly's paywall boundary, Stoplight's roadmap
  status, and the absence of tooltip engagement data.
- One wave-2 candidate deliberately declined as a DOC-EX rule. The Markdown-twin
  obligations extend DOC-AGENT-03.
- DOC-EX-33 NEW. The tooltip selection rule, proposed by
  `interactive-elements-contract.md` as DOC-TYPE-28, is renumbered into this
  family. DOC-TYPE-28 already carries the frontmatter ban, so the proposed number
  collided. Severity unchanged at CONSIDER.
- DOC-EX-34 NEW. The WCAG 1.4.13 hover-and-focus rule, proposed as DOC-TYPE-29,
  is renumbered into this family for the same collision. DOC-TYPE-29 already
  carries the declaration-above-frontmatter ban. Severity unchanged at MUST.

## Sub-artifacts

- [`docs-examples/tested-example-gate.md`](docs-examples/tested-example-gate.md)
  — what makes an example a test across shell, Python and Rust, the binding
  convention, the marking tiers, the equivalence claim, and failure ergonomics.
- [`docs-examples/recording-layer-and-interactivity.md`](docs-examples/recording-layer-and-interactivity.md)
  — cast format and player pairing, the commit branching rule, the three WCAG
  criteria resolved to their actual levels, opt-in cost, and the unused
  non-executing authoring mode.
- [`docs-examples/tested-examples-beyond-shell-python-rust.md`](docs-examples/tested-examples-beyond-shell-python-rust.md)
  — wave 2. TypeScript's two native mechanisms, Go's Example functions and
  transclusion, the generic subprocess-per-fence shape, the shipped 55-line
  harness, fence-tier rendering measured on all three generators, and the
  re-measured 35-script recording count.
- [`docs-examples/interactive-elements-contract.md`](docs-examples/interactive-elements-contract.md)
  — wave 2. A per-generator support table for copy buttons, code tabs, tooltips,
  glossaries, playgrounds and try-it consoles, plus the browser reach ceiling on
  live sandboxes and the Markdown-twin consequences of each.

## Key sources

| URL | Why it matters here |
|---|---|
| [Sybil documentation](https://sybil.readthedocs.io/en/latest/) | The Python doctest runner DOC-EX-03 names first, current 10.1.0 |
| [Sybil markdown parsers](https://sybil.readthedocs.io/en/latest/markdown.html) | Confirms the parser set behind the four fence tiers |
| [`simplistix/sybil` src/sybil/sybil.py](https://github.com/simplistix/sybil/blob/main/src/sybil/sybil.py) | `should_parse` calls `pathlib.Path.match`, contradicting its own docstring — grounds DOC-EX-09 |
| [Python `pathlib.PurePath.match`](https://docs.python.org/3/library/pathlib.html#pathlib.PurePath.match) | States that `**` acts as a non-recursive `*` in `match()` |
| [rustdoc documentation tests](https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html) | The Rust attribute set (`ignore`, `no_run`, `compile_fail`) that DOC-EX-05's tiering mirrors |
| [rustdoc `#[doc]` attribute](https://doc.rust-lang.org/rustdoc/write-documentation/the-doc-attribute.html) | States that without `html_playground_url` there are no Run buttons, behind DOC-EX-30 |
| [mdBook `test` command](https://rust-lang.github.io/mdBook/cli/test.html) | Rust-only by design, so it cannot be a polyglot repo's only mechanism |
| [mdBook configuration reference](https://rust-lang.github.io/mdBook/format/mdbook.html) | `[output.html.playground]` keys behind DOC-EX-29, and no tabs or abbreviation keys at all |
| [markdownlint MD040](https://github.com/DavidAnson/markdownlint/blob/main/doc/md040.md) | `allowed_languages` is the exact lint behind DOC-EX-05 |
| [Twoslash `validation.ts`](https://github.com/twoslashes/twoslash/blob/main/packages/twoslash/src/validation.ts) | Throws on an undeclared compiler error, which makes Twoslash a real build gate |
| [Deno documentation tests](https://docs.deno.com/runtime/test/doc_tests/) | The recognized fence tags and the `ignore` attribute behind DOC-EX-03 and DOC-EX-21 |
| [Node.js TypeScript support](https://nodejs.org/api/typescript.html) | Native `.ts` execution since 23.6, type-stripping only, the runner the shipped harness uses |
| [Go `testing` Examples](https://pkg.go.dev/testing#hdr-Examples) | Compiled always, executed only with an `Output:` comment, behind DOC-EX-22 |
| [`campoy/embedmd`](https://github.com/campoy/embedmd) | The transclusion directive DOC-EX-22 names |
| [`drupol/markdown-code-runner`](https://github.com/drupol/markdown-code-runner) | The `--check` bind-and-assert mode contrasted in DOC-EX-23 |
| [highlight.js `src/highlight.js`](https://github.com/highlightjs/highlight.js/blob/main/src/highlight.js) | The `languageDetectRe` logic that makes a hyphenated tier tag degrade safely on mdBook |
| [Runme](https://runme.dev) | The third paradigm, named and declined as a default for static-generated sites |
| [ExUnit.DocTest](https://ex-unit.hexdocs.pm/ExUnit.DocTest.html) | Pattern reference, and its no-output-capture and no-sandboxing warnings generalize |
| [asciicast v3 spec](https://docs.asciinema.org/manual/asciicast/v3/) | New header schema and relative event intervals, the basis for DOC-EX-14 |
| [asciicast v2 spec](https://docs.asciinema.org/manual/asciicast/v2/) | Absolute timestamps, the contrast v3 changed |
| [asciinema-player asciicast.js](https://github.com/asciinema/asciinema-player/blob/develop/src/parser/asciicast.js) | Verified 2026-09-05: one build dispatches on `header.version` to v1, v2 and v3 parsers |
| [asciinema-player ControlBar.js](https://github.com/asciinema/asciinema-player/blob/develop/src/components/ControlBar.js) | The labelled pause button DOC-EX-16 forbids removing |
| [WCAG 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html) | Level A, and DOC-EX-15 avoids its trigger rather than answering it |
| [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) | AAA, which is why DOC-EX-17 stays SHOULD |
| [charmbracelet/vhs](https://github.com/charmbracelet/vhs) | The `.tape` format and its diffable text output behind DOC-EX-18 |
| [MkDocs Material code blocks](https://squidfunk.github.io/mkdocs-material/reference/code-blocks/) | `content.code.copy` is an opt-in feature flag, behind DOC-EX-24 |
| [VitePress `preWrapper.ts`](https://github.com/vuejs/vitepress/blob/main/src/node/markdown/plugins/preWrapper.ts) | Injects a copy button unconditionally, behind DOC-EX-25 |
| [WebContainers browser support](https://webcontainers.io/guides/browser-support) | The Chromium-only reach ceiling behind DOC-EX-27 |
| [Sandpack releases](https://github.com/codesandbox/sandpack/releases) | Latest release 2025-02-14, the measured staleness behind DOC-EX-28 |
| [Scalar](https://github.com/scalar/scalar), [Redocly pricing](https://redocly.com/pricing), [Stoplight Elements](https://github.com/stoplightio/elements) | The three-way vendor split behind DOC-EX-31 |
