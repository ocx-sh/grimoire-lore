---
title: Documentation design — wave 1 completeness critique
program: docs
role: completeness critic
model: claude-opus-5[1m]
date: 2026-09-05
inputs:
  - docs-frame.md (with Corrections)
  - docs-topic-map.md (map, deferred list, conflicts)
  - docs-page-types.md, docs-use-case-discovery.md, docs-plain-english.md,
    docs-examples.md, docs-navigation-search.md, docs-observability.md,
    docs-machine-readers-and-prior-art.md
spot_checked:
  - docs-page-types/page-type-set-and-declaration.md
  - docs-use-case-discovery/tier-model-and-first-steps-contract.md
  - docs-use-case-discovery/use-case-discovery-procedure.md
  - docs-plain-english/ai-tell-set-and-honest-label.md
  - docs-examples/recording-layer-and-interactivity.md
  - docs-navigation-search/search-contract-and-zero-result-loop.md
  - docs-observability/minimum-instrumentation-set.md
  - docs-machine-readers-and-prior-art/agent-readable-surface.md (via consolidation)
---

# Wave 1 completeness critique

## Verdict

**needs-another-round.**

The sourcing is sound. I re-fetched 20 cited primary sources across all seven
groups and every checkable claim matched the artifact: the Good Docs Core Pack
list, GitLab's troubleshooting contract verbatim, `diataxis.fr/complex-hierarchies/`
still 404, Freeburg's six em-dash figures, vale-ai-tells' 6-error/11-suggestion
split and its own "rule floor rather than a detector" wording, MD054's per-style
booleans, NN/g's 51/32/18 and 2.0-word query, Atlassian's empty-state shape,
DORA's 1525/750/451/343 lift table, Ably's five TTHW bands, State of Docs' 39%,
asciicast v3's relative intervals, WCAG 2.3.3 at AAA, VHS's `.txt`/`.ascii`
golden-file mode, mdBook's boost keys, passo.uno's 5/15→15/15 and 34.5%→34.5%,
mecanik's 97%/1.1%, Stripe's live `.md` twin, and Cloudflare's 80% figure that
retired the 31x claim. Two groups corrected their own upstream sources at the
primary source (MD003 miscitation, uv's benchmark hero), which is the behaviour
this program wanted.

The ruleset is not shippable yet. 132 rules across seven families were authored
in parallel and never reconciled: two mutually exclusive page-declaration
mechanisms both ship at MUST, and one of them is proven to corrupt rendering on
the fleet's mdBook site. The emphasis the requester named first for page types —
use-case guides — has **no contract at all**: how-to and explanation are declared
type values with no required-section rule anywhere, while landing, reference and
troubleshooting each got one. One signal (zero-result capture) is required by
`docs-navigation-search` and explicitly deferred by `docs-observability`, both at
SHOULD. Five MUSTs rest on checks nobody has written, which is the exact shape
DOC-OBS-15 forbids. And one fleet-violation claim (DOC-NAV-13 against grimoire)
is wrong against mdBook's own primary source. These are integration defects, not
research defects, and a second round fixes them cheaply — but shipping now would
publish a rule set that fails its own DOC-PLAIN-17, DOC-AGENT-12 and DOC-AGENT-16.

## Requester emphases

| # | Emphasis | Served by | Rule IDs | Depth |
|---|---|---|---|---|
| a | Tiered use-case model, and how a project researches its own top use cases | `docs-use-case-discovery` | DOC-DISC-01..22 | **Authoring-depth**, one thin seam |
| b | Docs UX: navigation, search, examples, interactive elements | `docs-navigation-search`, `docs-examples` | DOC-NAV-01..16, DOC-EX-12..19 | Nav/search authoring-depth; **interactive elements thin** |
| c | Docs observability | `docs-observability` | DOC-OBS-01..15 | Drift authoring-depth; **reader-signal half thin** |
| d | Plain English with the AI-tell ban labelled honestly | `docs-plain-english` | DOC-PLAIN-01..21, esp. 01 and 09 | **Authoring-depth**, strongest family in the set |
| e | Tested examples, asciicast as the worked example, as a portable pattern | `docs-examples` | DOC-EX-01..19 | **Authoring-depth**, one language gap |
| f | Existing AI docs skills/rules incorporated by design | `docs-machine-readers-and-prior-art` | DOC-AGENT-10..18 | **Authoring-depth**, disposition deferred |
| g | Landing, use-case guides, reference — each with a contract | `docs-page-types` | DOC-TYPE-10..16 (landing), 17..21 (reference), **nothing** (use-case guides) | **Two of three; the middle one is missing** |

Detail on the three that are not clean.

**(g) is the headline failure.** The artifact-split plan in
`docs-topic-map.md:1122` promises `page-types.md` will carry "per-type contracts
for landing, first-steps, how-to, reference, explanation, troubleshooting". Four
shipped. How-to and explanation got none. Every DOC-TYPE rule scoped to `how-to`
(03, 07, 09) states what a how-to may **not** do; nothing requires a goal
statement, prerequisites, ordered steps, a verification step, or a next-step
link. The brief for `page-type-set-and-declaration` explicitly asked for
`kubernetes.io/docs/contribute/style/page-content-types/` "for the per-type
section skeleton"; the page was fetched, cited in the sources table, and its
how-to skeleton never became a rule. "Use-case guides" is the requester's own
name for the how-to tier, and it is the one page type an agent writes most often.
`docs-page-types.md` names `tutorial-contract` as an empty slot in its open
questions but does not notice that how-to and explanation are empty too.

**(b) interactive elements is thin.** One component class is contracted: the
terminal player (DOC-EX-12..19, accessibility resolved to the correct WCAG
levels, verified). Everything else an interactive docs page contains — code tabs,
live sandboxes, try-it consoles, tooltips, glossary popovers, copy buttons — is
either deferred (`code-tabs-vs-single-language`, `interactive-tooling-choice`,
`glossary-vs-tooltip`) or explicitly declined (`docs-examples.md` line 84: no
sandbox-vendor default). The only other interactive-element rule in the whole set
is DOC-DISC-17, a prohibition on tabs inside a tutorial. An adopting agent asked
to "make the docs interactive" gets one recording rule and one ban.

**(c) the reader-signal half is thin.** `minimum-instrumentation-set.md` NG5
requires a bias disclosure the moment a feedback widget ships; the consolidation
dropped the feedback rule entirely, keeping only DOC-OBS-08's disclosure
requirement for whatever number appears. So the shipped set has no rule about
per-page feedback, no rule about analytics, and defers zero-result capture — the
three reader-side signals — leaving DOC-OBS-07 (hand-measured TTHW, SHOULD) and
DOC-OBS-11 (issue template, SHOULD) as the entire instrumentation ask. That is a
defensible cost decision, but emphasis (c) as stated is served mostly by drift
gates, not by observing readers.

**(a)'s thin seam:** DOC-DISC-08 — "list every top-level subcommand as a
candidate task" — is the substitute for the vote that the whole method rests on,
and it ships at CONSIDER, the weakest severity in the family. The discovery
artifact's field schema exists (`use-case-discovery-procedure.md` §7) but never
reaches the consolidation, and DOC-DISC-07's "fixed enum" of ranking signals is
referenced without its four values being printed anywhere in the consolidation.

**(e)'s language gap:** the per-language mechanism table covers shell, Python and
Rust. TypeScript is named as genuinely open by the sub-artifact and is real in
the fleet. Go, Java, C# and shell-on-Windows were never considered. DOC-EX-04's
"smallest version" is a SHOULD reading heuristic, not a shipped starter harness,
so the portable pattern's floor is described rather than provided.

**(f)'s deferral:** the adopt/adapt/reject table for 14 prior-art artifacts lives
only in the sub-artifact, and the disposition of the two in-fleet `docs-style.md`
forks is handed to the owner with no rule stating what the shipped artifact does
about them.

## Surfaces never studied

1. **README as a documentation surface.** 6 of 23 fleet surfaces are README-only
   (`docs-shape.md` §0), the shipped glob includes `*.md` at repo root, and the
   Good Docs Core Pack ships README as its own template — yet "README" appears
   exactly once across all seven consolidations, as a path in ocx-sdk-python's
   Sybil glob. No type value, no contract, no check. The map deferred this as "a
   glob and scope decision, taken below", and the scope decision pulled READMEs
   *into* the glob without giving them a contract.
2. **Changelog, release notes, migration guides.** Deferred as settled prior art.
   But DOC-PLAIN-11 ships "applies to: all except changelog" against a `doc_type`
   enum with no `changelog` value, so the exemption is unimplementable as written.
   `changelog-migration-link` (map line 218, medium, partial) appears in neither
   wave 1 nor the deferred list — it was silently dropped.
3. **Error-message-to-docs links.** Map line 222, medium priority, uncovered,
   named by two scouts, described there as "a checkable rule that spans code and
   docs". In neither wave 1 nor the deferred list. Silently dropped.
4. **`ai-authoring-tooling-policy`** (map line 215) and **`site-component-portability`**
   (line 248). Same status: neither selected nor deferred. Four map rows total
   fell out of the accounting.
5. **How-to and explanation page contracts.** See emphasis (g) above.
6. **API reference generated from a spec.** Deferred on "no OpenAPI surface in
   the fleet", yet DOC-TYPE-18's verification names "an OpenAPI operation list"
   as one of three parity sources with no research behind that branch.
7. **Library versus CLI versus service docs.** No rule varies by product shape.
   The tier model's external-system count is the only proxy, and it was calibrated
   on CLIs and hosted-service quickstarts. Two of the nine sites are SDK/library
   docs (`ocx-sdk-python`, `ocx-mirror-sdk`, the latter 94% stubs) where "reach a
   working command" is not the first-steps shape at all.
8. **Versioned docs and i18n.** Deferred, defensibly. Untested interaction:
   DOC-AGENT-01 requires a `.md` twin for every URL in the sitemap, and
   DOC-NAV-07 requires stable cross-file anchors — neither was checked against a
   versioned URL tree or a locale directory.
9. **Sphinx/reStructuredText, and three generators the glob claims.** `find_ocx`
   is named as out of scope and `declaration-portability-beyond-markdown` is
   flagged unresearched. Separately, the shipped glob lists `docusaurus.config.*`,
   `astro.config.*` and `docs/conf.py` — the rules were designed and tested
   against MkDocs Material, VitePress and mdBook only, so the glob asserts
   coverage of generators no rule was ever run against.
10. **Accessibility outside the terminal player.** Alt text, contrast, keyboard
    navigation and table semantics are all deferred. The shipped a11y surface is
    DOC-EX-15/16/17, which govern one Vue component.
11. **This program's own `docs/` tree.** `grimoire-lore/docs/**` matches the
    shipped glob and has no generator config, so DOC-NAV-01 correctly exempts the
    nav rules — but DOC-TYPE-01 (MUST, declare `doc_type` on every page) and the
    whole DOC-PLAIN family still fire on the catalog's companion docs. Nobody
    checked what that does.
12. **Print, PDF and offline docs.** Never named in the frame, the map, or any
    consolidation.

## Claims unverified

**MUSTs whose verification cannot go red, or does not exist.**

- **DOC-EX-01** (MUST, back every runnable example with a test). Its verification
  is a one-off probe: break one command, confirm the gate reddens. That proves
  the harness exists; it cannot detect a *newly added* unbacked example. The rule
  that would detect that, DOC-EX-10, ships at SHOULD with an explicit ban on
  making it a merge gate (~55% false-positive rate on one real page). So the
  family's flagship MUST has no continuous detector.
- **DOC-TYPE-11** (MUST, landing page must reach an action before its first `##`).
  Verification: "With no structural slot, report 'cannot verify' and never pass
  silently." Only VitePress frontmatter has such a slot. On the 7 MkDocs sites
  and the mdBook site the check returns "cannot verify" — a MUST that is inert on
  8 of 9 sites.
- **DOC-TYPE-12** (SHOULD, CTA budget). Verification parses "the frontmatter
  hero-actions and features arrays" — a VitePress-only shape. The frame's own
  portability constraint forbids shipping generator-specific internals in the
  portable artifact.
- **DOC-TYPE-17** (MUST, reference entry sections). Verification is "a schema
  script run per top-level entry heading". No script, no command, no fixture.
- **DOC-TYPE-08** (MUST, troubleshooting shape). The grep counts must "equal the
  entry count" — the entry count is only derivable from the same headings the
  grep is counting, so the assertion is circular. Admitted never run against
  `ocx-catalog/docs/ops/troubleshooting.md`, the fleet's one real instance.
- **DOC-OBS-06** (MUST, runbook steps name something checkable). Verification is
  "a scheduled job" that the artifact's own open questions admit nobody has built
  ("Price it before the MUST ships, or downgrade it"). **DOC-OBS-15, in the same
  family, forbids shipping a check in exactly this state.**
- **DOC-AGENT-01** (MUST, publish a `.md` twin of every page). The artifact's own
  open questions state it is "a requirement with no known implementation on 3 of
  the fleet's 3 generators". A MUST no adopter can currently satisfy.

**Reading heuristics shipped above the cap the rule set sets for itself.**

DOC-PLAIN-17 (MUST) caps an unverifiable row at SHOULD. DOC-AGENT-16 (MUST)
requires the literal string `unverified: reading heuristic` on such a row. Both
are violated inside the same wave:

- **DOC-DISC-18** — MUST, verification "Reading heuristic."
- **DOC-AGENT-05** — MUST, verification "Reading heuristic."
- Neither carries the literal marker. Nor does DOC-TYPE-13, DOC-EX-04,
  DOC-AGENT-09, DOC-AGENT-13 or DOC-NAV-16 (all correctly at SHOULD or CONSIDER,
  but all missing the marker DOC-AGENT-16 mandates).

**MUST severity on argued/asserted evidence.**

`docs-page-types.md` states its own gate: "no rule resting only on `argued` or
`asserted` evidence ships above CONSIDER unless a normative or measured source
carries the obligation itself." DOC-TYPE-20 ships MUST on a 100-word floor the
artifact labels "argued floor". DOC-OBS-08 ships MUST on a grep whose false-positive
rate the artifact admits has never been measured against the fleet's 248 pages
(a percentage inside a benchmark table is a legitimate hit). DOC-AGENT-06 ships
MUST on one model and 15 runs per condition, which the artifact's own open
questions flag as possibly not earning MUST across models.

**Numbers with no named formula, tool or citation.**

DOC-AGENT-12 (MUST) requires a named formula, tool or citation on the same line
as every numeric threshold. The following ship a bare evidence level instead:
DOC-TYPE-07 (100 words, "asserted, which no source states"), DOC-TYPE-10 (30
words), DOC-TYPE-12 (2 CTAs / 9 task links / groups of 4), DOC-TYPE-16 (>2 list
items / >3 table rows), DOC-TYPE-19 (15 warn / 20 fail), DOC-TYPE-20 (100 words),
DOC-NAV-03 (8 pages), DOC-NAV-06 (4000 words), DOC-NAV-12 (150 words, exactly one
link), DOC-NAV-14 (30 days), DOC-NAV-15 (20 entries), DOC-DISC-09 (150 words),
DOC-DISC-15 (9 actions), DOC-DISC-16 (100 words), DOC-OBS-14 (3 paragraphs of 40+
words), DOC-PLAIN-06 (10-point drop), DOC-PLAIN-10 (density 3), DOC-AGENT-07
("before the second `##`"). Most are honestly labelled `argued`; the point is
that the shipped rule set would fail its own DOC-AGENT-12 audit on 18 rows.

**Checks with an obviously high, unmeasured false-positive rate.**

- **DOC-PLAIN-07** (SHOULD): `grep -nE '\b[a-z0-9]+[-_][a-z0-9_-]+\b'` over
  stripped prose to find bare identifiers. That pattern matches every ordinary
  hyphenated English word — "well-known", "up-to-date", "machine-translation",
  "first-steps". Never run against fleet prose. It will fire on essentially every
  page in the fleet, including this program's own artifacts.
- **DOC-DISC-03** (MUST): rejects a user need containing any docs heading token or
  CLI flag name. The artifact's own open questions admit "will fire on any
  legitimate need that happens to contain a product noun" and asks for a measured
  rate "before shipping as a MUST". It ships as a MUST anyway.
- **DOC-TYPE-05** (SHOULD, "we recommend" grep) — explicitly "not yet calibrated".

**One fleet-violation claim that is wrong at the primary source.**

**DOC-NAV-13** lists grimoire as violating because it "leaves mdBook's
`[output.html.search]` boosts entirely unconfigured". I fetched mdBook's renderer
reference: the defaults are `boost-title: 2`, `boost-hierarchy: 1`,
`boost-paragraph: 1`. The rule's own requirement — title ranked above body text —
is already satisfied by the defaults. The sub-artifact got this right
(DOC-SEARCH-07: "must not be left at a flattened 1:1:1"); the consolidation
rewrote it into "must set", turning an already-satisfied condition into a false
finding. This is the one factual error I found in the wave.

**Minor.** The Good Docs template count is stated as 25 (`docs-page-types.md`),
28 (`docs-use-case-discovery.md`) and 27 (my fetch today). Not load-bearing, but
two consolidations disagree with each other and with the live page.

**Consolidations whose Verdict resolves no conflict.** All seven resolve the
conflicts the map assigned them. 16 of the map's 17 conflict rows are resolved;
the seventeenth (DORA's AI-adoption two-directionality) is explicitly and
honestly sidestepped rather than resolved, with the reason stated. Two groups
(`docs-use-case-discovery`, and `search-contract-and-zero-result-loop` within
nav) were assigned no conflict row at all and say so. No group faked a resolution.

## Contradictions between consolidations

1. **The page-declaration mechanism. Two MUSTs, mutually exclusive.**
   DOC-TYPE-01/02 (MUST): declare with `<!-- doc_type: VALUE -->` on line 1,
   **never** frontmatter, proven because `grimoire/docs/book.toml` configures no
   frontmatter preprocessor and a `---` block renders as visible text.
   DOC-DISC-13 (MUST): `rg -L '^tier: (first-steps|everyday|integration)$'` —
   YAML frontmatter. DOC-DISC-17 greps `type: tutorial`. DOC-OBS-05 classifies
   with `type: runbook` frontmatter *or a path glob*, which DOC-TYPE-02 forbids
   outright. DOC-NAV-05/06/11 say "declares type `reference`" without naming a
   mechanism. Three of seven families ship a declaration scheme that the
   page-types family proves corrupts rendering on one of the fleet's three
   generators. This must be one key, resolved once, before anything else ships.

2. **The type enum. Three unregistered values.**
   DOC-TYPE-01's enum is `{tutorial, how-to, reference, explanation,
   troubleshooting, landing}`. DOC-OBS-05/06 introduce `runbook`. DOC-PLAIN-11
   exempts `changelog`. Neither exists in the enum, so both rules are
   unimplementable against the declaration DOC-TYPE-01 requires. Separately,
   DOC-DISC-13's stated rule covers "tier and type as two separate keys" but its
   verification only checks `tier`, so the type half of that MUST has no check.

3. **Zero-result capture: required by one group, deferred by another.**
   DOC-NAV-10 (SHOULD, applies to all): "Fire one named event when the site's own
   search returns zero results", and lists 0 of 9 sites as violating.
   `docs-observability.md`'s Verdict: "No fleet-wide zero-result search
   requirement: all nine sites run client-side search that cannot report a
   zero-result query, so the rule states the precondition and defers the signal
   rather than failing every repo." DOC-OBS-12 (SHOULD) codifies the deferral.
   Same signal, same fleet, opposite dispositions, same severity. Note that
   `search-contract-and-zero-result-loop.md` costed a DOM beacon at 20-30 lines
   per site, which `minimum-instrumentation-set.md` never saw — the nav group has
   the better evidence, but the disagreement must be adjudicated, not shipped.

4. **The link budget on short pages.**
   DOC-NAV-12 (SHOULD, applies to landing, how-to, reference, explanation,
   troubleshooting): any page under 150 prose words must carry **exactly one**
   link — "Zero links fails and two or more fails."
   DOC-TYPE-12 (SHOULD, landing): up to 2 CTAs **plus** 9 task links.
   DOC-TYPE-13 celebrates `ocx-catalog/docs/index.md:19-30` — a short,
   task-keyed card grid with "zero prose" — as the fleet's one page that states
   who it is for. That page fails DOC-NAV-12 and passes DOC-TYPE-12/13.
   DOC-DISC-10 (SHOULD) exempts a first-steps page that reaches a verified result
   from the stub test and names `ocx/website/src/docs/installation.md` (20 words)
   as the fleet's best page; DOC-NAV-12 has no such exemption and would fail it
   for having zero or two links.

5. **Rollout severity: two MUSTs in direct opposition.**
   DOC-PLAIN-18 (MUST): "A rule launched at error must show zero current
   violations", and new rules launch at warning scoped to the diff.
   DOC-TYPE-01 (MUST) hard-fails an untyped page, with 248 of 248 fleet pages in
   violation on day one. `page-type-set-and-declaration.md` R13 argues the hard
   fail explicitly ("a warning-severity rule is empirically a rule nobody fixes").
   Both positions are defensible; they cannot both ship as MUST in one rule set.

6. **Duplicate obligation, conflicting severity.**
   DOC-OBS-01 (MUST): run the link and anchor checker against built output.
   DOC-TYPE-21 (SHOULD): run link checking against built output, or exempt
   generated-anchor patterns. Same obligation, two families, two severities, two
   IDs. DOC-NAV-08 (MUST) is a third statement of the adjacent raw-tree rule.

7. **Evidence-column shape.**
   `docs-page-types`, `docs-navigation-search`, `docs-observability` and
   `docs-use-case-discovery` name the source in the evidence cell.
   `docs-examples` ships a bare level word (`measured`, `normative`, `codified`)
   with no source on 19 of 19 rows. DOC-AGENT-12 and the bob-rule shape both
   require the citation in the row. One family is authored to a different
   contract than the other six.

## Commissions for wave 2

| group | slug | label | brief | revises |
|---|---|---|---|---|
| docs-page-types | `how-to-and-explanation-contracts` | The two missing per-type contracts | The wave shipped contracts for landing, reference and troubleshooting and none for how-to or explanation, which is the requester's emphasis (g) middle term and the type an agent writes most often. Fetch `kubernetes.io/docs/contribute/style/page-content-types/` (already in the sources table, never turned into a rule), the Good Docs How-to and Concept templates, `diataxis.fr/how-to-guides/` and `diataxis.fr/explanation/`, and GitLab's Task and Concept topic types. Extract each as checkable obligations, not adjectives: does a how-to require a goal sentence in the imperative, a prerequisites block, ordered steps, a verification step naming an observable result, and a next-step link? Does explanation require a stated question it answers and a ban on step imperatives? Run every candidate check against ocx's 44 real pages and report a false-positive rate the way `page-type-set-and-declaration.md` §6 did for the mixing check. Decide whether the how-to verification step reuses DOC-DISC-18's success marker and DOC-EX-02's `# doc:` binding rather than inventing a third marker. Ship DOC-TYPE rules with severities set by the measured rate. Also close the `tutorial-contract` empty slot the page-types artifact already named, or state that the tutorial type ships uncontracted and why. | `docs-page-types.md` |
| cross-cutting | `declaration-key-unification` | One declaration key, three families | Three families ship incompatible declaration schemes at MUST. DOC-TYPE-01/02 mandate `<!-- doc_type: V -->` and forbid path inference, on measured evidence that YAML frontmatter renders as visible text on the fleet's mdBook site and that a path classifier files 78% of one repo as unclassifiable. DOC-DISC-13 and DOC-DISC-17 grep frontmatter `tier:`/`type:`. DOC-OBS-05 accepts `type: runbook` frontmatter or a `docs/runbooks/**` path glob. Decide one carrier for all three facts — content type, use-case tier, and operational class — that survives MkDocs Material, VitePress and mdBook unmodified. Verify the chosen syntax by rendering it on all three generators, not by reasoning. Settle whether `runbook` is a sixth type, a subtype of troubleshooting, or an orthogonal third key, and whether `changelog` needs a value so DOC-PLAIN-11's exemption becomes implementable. Then research `tier-from-nav-versus-tier-from-frontmatter`, already named as a deserves-another-round item: reading tier from `mkdocs.yml`, `SUMMARY.md` or a VitePress sidebar would remove the retrofit cost on seven of nine sites and collapse DOC-DISC-13 and DOC-DISC-21 into one check. Rewrite every affected rule row to the single decided key. | `docs-page-types.md`, `docs-use-case-discovery.md`, `docs-observability.md`, `docs-navigation-search.md` |
| docs-observability | `zero-result-ownership-and-sink` | Require it or defer it, and price the sink | DOC-NAV-10 requires a named zero-result event on every site; `docs-observability`'s Verdict explicitly refuses a fleet-wide zero-result requirement and DOC-OBS-12 codifies the deferral. Same signal, same fleet, same severity, opposite dispositions. The nav group holds evidence the observability group never saw: a DOM-level beacon costed at 20-30 lines of JS per site, working today on all three engines, with the stability caveat of watching the engine's own localised no-results string rather than a CSS class. Adjudicate. Then close the gap both groups leave: `search-sink-and-privacy` is named by nav as "the most load-bearing gap in the group" and `zero-result-unblock-cost` by observability as an unpriced assumption. Price a self-hosted endpoint, a static-host log line, and Pagefind-with-capture against nine public sites, including the privacy posture. Settle the one cheap open observation: perform a zero-result search on a live Material 9.7.7 site and confirm in GA4 DebugView whether Enhanced Measurement fires for an overlay search, which is currently the only claim in the nav group resting on mechanism reasoning alone. Ship one rule, one severity, one sink. | `docs-navigation-search.md`, `docs-observability.md` |
| cross-cutting | `severity-and-check-audit` | Make the rule set pass its own rules | The wave ships 132 rules that fail three of their own meta-rules. DOC-PLAIN-17 caps an unverifiable row at SHOULD, and DOC-DISC-18 and DOC-AGENT-05 ship MUST with "Reading heuristic" as the verification. DOC-AGENT-16 requires the literal marker `unverified: reading heuristic`, carried by zero rows in seven families. DOC-AGENT-12 requires a named formula, tool or citation beside every numeric threshold; 18 rows ship a bare `argued`. DOC-OBS-15 forbids shipping a check that is written but not wired, and DOC-OBS-06, DOC-TYPE-17, DOC-TYPE-08 and DOC-AGENT-01 are MUSTs whose checks do not exist. Also fix DOC-EX-01, whose probe proves the harness works but cannot detect a newly added unbacked example, while its detector (DOC-EX-10) is banned from the gate. Pass every row through the three meta-rules mechanically, demote what fails, add the markers, and normalise `docs-examples`' bare evidence cells to the sourced shape the other six families use. Resolve the DOC-PLAIN-18 versus DOC-TYPE-01 rollout conflict as part of this pass. This is a reconciliation commission, not new research, and it is the cheapest one on this list. | all seven consolidations |
| docs-page-types | `readme-and-changelog-contracts` | The two surfaces the glob picked up and no rule covers | 6 of 23 fleet surfaces are README-only, the shipped glob includes `*.md` at repo root, and "README" appears once across all seven consolidations, as a path in a Sybil glob. The Good Docs Core Pack ships README as a first-class template. Decide whether a README declares a `doc_type`, which one, and what it owes: the audience sentence, the install command, the link out to the site, the ban on duplicating the site's content. Do the same for CHANGELOG and CONTRIBUTING, which the glob also pulls in. Then close `changelog-migration-link` (map line 218, dropped from both wave 1 and the deferred list): does each breaking-change entry link to a migration guide, and is that link checked by the same resolver DOC-NAV-08 specifies? ocx already encodes Keep a Changelog uncredited in an agent file with no link-existence check, and there are 7 changelog pages fleet-wide. Ship the contract or ship an explicit exclusion from the glob — the current state is a glob that claims these files with no rule that governs them. | `docs-page-types.md` |
| docs-plain-english | `check-false-positive-calibration` | Measure the greps before they ship at MUST | Four shipped checks have no measured false-positive rate and three of them gate at MUST or SHOULD on prose the fleet already carries. DOC-PLAIN-07's bare-identifier grep matches every hyphenated English word and will fire on essentially every page including this program's own artifacts. DOC-DISC-03's solution-shaped-need check is admitted to fire on any need containing a product noun, and ships MUST anyway. DOC-OBS-08's fabricated-metric grep will hit legitimate percentages in benchmark tables and changelogs, and ships MUST. DOC-TYPE-05's opinion grep is stated as uncalibrated. `page-type-set-and-declaration.md` §6 set the standard for this wave by running both mixing-check signatures over 44 real pages and reporting 0 hits with the loose variant's two real false positives named by file and line. Repeat that method for these four over all 248 fleet pages plus the program's own research corpus, report per-check rates, and set severity from the number. Where a rate is unacceptable, tighten the pattern or downgrade. Also settle `marketing-tone-wordlist`, which the map selected and no sub-artifact delivered, leaving DOC-PLAIN-12 on an asserted list. | `docs-plain-english.md`, `docs-use-case-discovery.md`, `docs-observability.md`, `docs-page-types.md` |
| docs-navigation-search | `landing-and-short-page-link-budget` | Reconcile three link budgets that fire on the same page | DOC-NAV-12 fails any page under 150 prose words with zero links or two or more. DOC-TYPE-12 permits 2 CTAs plus 9 task links on a landing page. DOC-TYPE-13 names `ocx-catalog/docs/index.md` — a short, zero-prose, task-keyed card grid — as the fleet's only page that states who it is for, and it fails DOC-NAV-12. DOC-DISC-10 exempts a 20-word first-steps page that reaches a verified result and calls it the fleet's best page; DOC-NAV-12 has no matching exemption. Atlassian's own guidance, re-fetched, says one **or two** CTA buttons, so the "exactly one" cap is tighter than its cited source. Separate the three objects the one rule currently conflates: a rendered zero-result or empty state, a stub content page, and a short-by-design index or first-steps page. Give each its own budget and its own applies-to. Run the resulting check over all 248 pages and report what it flags besides the known stubs. | `docs-navigation-search.md`, `docs-page-types.md` |
| docs-examples | `tested-examples-beyond-shell-python-rust` | The languages the pattern does not yet cover | The portable pattern ships a mechanism table for shell, Python and Rust. TypeScript is named by the sub-artifact as genuinely open, is real in the fleet, and DOC-EX-03 is a MUST that tells an agent to reach for the language's own doctest runner first — which for TypeScript does not exist, so the MUST sends the agent to a dead end. Research what runs a TypeScript documentation example in September 2026 and either name a tool or specify the subprocess-per-example fallback bound by the same declared key. Then deliver DOC-EX-04's missing half: the smallest working harness as an actual shipped file in `checks/`, not a reading heuristic pointing at a 7,925-line worked example. Also close `fence-tier-rendering`, already named: do tier-suffixed fence languages such as `python-no-run` degrade to plain text under MkDocs Material, VitePress and mdBook? If highlighting breaks, DOC-EX-05 trades reader quality for machine checkability and an attribute-based marking is the better shape. Re-run `recording-cost-current` at 35 scripts so the opt-in default rests on a current number rather than a 22-script measurement. | `docs-examples.md` |
| docs-page-types | `landing-check-portability` | Landing checks that work off VitePress | DOC-TYPE-11 is a MUST whose verification returns "cannot verify" on 8 of 9 fleet sites because only VitePress frontmatter carries a structural CTA slot. DOC-TYPE-12 parses "the frontmatter hero-actions and features arrays", a VitePress-only shape, which the frame's portability constraint forbids in a shipped artifact. The measured failure cases the two rules exist to catch are real and generator-neutral: `ocx-mcp` and `ocx-sdk-python` open with a caveat and reach no action, `ocx/website/src/index.md` runs 7 CTAs with no hierarchy, `ocx-save` shipped Lorem Ipsum. Specify a markdown-level check that finds them: count links and fenced blocks before the first `##` in the source, regardless of generator, and count link-bearing list items or card blocks for the task-link budget. Test it against all nine landing pages and confirm it reproduces the four known failures and passes `ocx-catalog`. Then re-fetch the five exemplar landing pages to re-derive the 2-CTA and 9-task-link numbers, or state plainly that they stay argued and drop to CONSIDER. | `docs-page-types.md` |
| docs-process | `error-message-and-authoring-policy-rows` | Two map rows that fell out of the accounting | Four rows were selected into neither wave 1 nor the deferred list: `error-message-docs-link`, `changelog-migration-link` (covered by the README commission), `ai-authoring-tooling-policy`, and `site-component-portability`. `error-message-docs-link` is the interesting one: medium priority, uncovered, named independently by two scouts, and described in the map as "a checkable rule that spans code and docs" — the only candidate in the whole corpus that binds an emitted runtime string to a documentation anchor, which is the same class of gate as ocx's `# doc:` slug binding and grimoire's `client_target.rs` table parity, both of which this program already calls the fleet's strongest shape. Research what a checkable error-to-docs link looks like (Rust's `--explain`, Go vet's URLs, Python exception notes, GitLab's error-code pages), whether the link target can be asserted at build time by the same resolver DOC-NAV-08 specifies, and what it costs. `ai-authoring-tooling-policy` matters because this rule set is read by AI authors and GitLab gates AI-generated docs on Vale before human review — decide whether the shipped artifact states a policy or declines to. `site-component-portability` decides whether `:::info` admonitions, which DOC-TYPE-06 and DOC-DISC-16 both depend on, may appear in a portable rule at all. | new (feeds a new `docs-process` consolidation or folds into `docs-page-types.md` and `docs-observability.md`) |

## Method note

Sources re-fetched today and confirmed against the artifact that cites them:
`diataxis.fr/complex-hierarchies/` (404, as claimed), `thegooddocsproject.dev/template/`
(Core Pack exact), `docs.gitlab.com/.../topic_types/troubleshooting/` (verbatim),
`passo.uno/if-you-are-an-agent-read-this/` (5/15→15/15, 34.5%→34.5%, Pinecone
12/12), `slopdetector.org/blog/em-dash-ai-tell-data` (all six figures),
`github.com/krishnasunkam/vale-ai-tells` (17 rules, 6/11 split, "rule floor rather
than a detector"), `markdownlint doc/Rules.md` (MD054 per-style booleans, MD003
syntax not casing), `nngroup.com/articles/search-visible-and-simple/`
(51/32/18, 2.0 words, 91%), `atlassian.design/.../empty-state` (one to two
sentences, one or two words, one or two buttons), `rust-lang.github.io/mdBook/format/configuration/renderers.html`
(boost defaults 2/1/1), `dora.dev/capabilities/documentation-quality/`
(1525/750/451/343, eight metrics, three attributes), `nordicapis.com/why-time-to-first-call-is-a-vital-api-metric/`
(Ably's five bands, Twilio's 5 minutes), `stateofdocs.com/2025/...` (39%),
`docs.asciinema.org/manual/asciicast/v3/` (relative intervals, not backward
compatible), `w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html`
(AAA, prefers-reduced-motion), `github.com/charmbracelet/vhs` (`.txt`/`.ascii`
golden files, ttyd + ffmpeg), `diataxis.fr/tutorials/` (comprehensible result,
works every time, real-user testing), `docs.astral.sh/uv/` (benchmark chart,
"10-100x faster than pip", five sections with Getting started, Guides and
Reference separate), `mecanik.dev/en/posts/does-llms-txt-do-anything-yet/`
(4,088→36,120, 97% zero requests, 1.1%), `docs.stripe.com/payments.md` (live
markdown twin), `blog.cloudflare.com/markdown-for-agents/` (80%, not 31x).

Every one matched. The only discrepancies found anywhere were the Good Docs
template count (25 vs 28 vs 27 live) and the DOC-NAV-13 mdBook boost claim.
