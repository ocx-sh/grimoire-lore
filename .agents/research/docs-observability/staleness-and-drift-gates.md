---
title: Staleness and drift gates
topic: staleness-and-drift-gates
group: docs-observability
agent: research-subagent
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
scope: >
  Covers what makes a stale doc fail loudly and when documentation debt blocks
  a merge: link-check configuration and its two measured false-positive traps,
  generalizing a source-to-doc trigger matrix into a portable template,
  resolving the blocking-vs-non-blocking doc-debt conflict, ARID vs Unique for
  single-source-of-truth, and whether a numeric freshness SLO ships at all.
  Does not cover tested-example execution mechanics, reference-page structural
  drift tests, or the existence-measurement of link checking in the fleet —
  those are covered elsewhere in this research program and cited by pointer
  only.
---

# Staleness and drift gates

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [What the "worst documentation" complaints actually indict](#1-what-the-worst-documentation-complaints-actually-indict)
  2. [Link-check configuration: two traps, one fix](#2-link-check-configuration-two-traps-one-fix)
  3. [Choosing a link-check tool: lychee vs mlc](#3-choosing-a-link-check-tool-lychee-vs-mlc)
  4. [The trigger matrix: generalizing ocx's mechanism into a portable template](#4-the-trigger-matrix-generalizing-ocxs-mechanism-into-a-portable-template)
  5. [Resolving the blocking policy](#5-resolving-the-blocking-policy)
  6. [Single-source-of-truth: ARID vs Unique](#6-single-source-of-truth-arid-vs-unique)
  7. [Freshness: why no SLO number ships](#7-freshness-why-no-slo-number-ships)
  8. [Runbook-class docs: the one domain with a validated staleness cost model](#8-runbook-class-docs-the-one-domain-with-a-validated-staleness-cost-model)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Weight drift gates over prose-quality gates: three canonical "worst documentation" HN threads show almost no complaint about tone; nearly all are about whether the documented thing is still true right now ([HN 25422756](https://news.ycombinator.com/item?id=25422756), [HN 13702628](https://news.ycombinator.com/item?id=13702628), [HN 39375456](https://news.ycombinator.com/item?id=39375456)).
- Checking raw markdown source for links needs two explicit, bespoke fixes (root-relative resolution, generated-anchor exclusion); checking the **built site output** gets both for free, because the generator has already resolved anchors and rewritten root-relative hrefs.
- Recommend running the external+anchor link check with `lychee` v0.24.2+ (`lycheeverse/lychee-action@v2`) against the build output directory (`site/`, `.vitepress/dist/`, `book/`), after the docs build step that already runs in CI on every measured fleet site.
- If a project also wants fast, pre-build feedback on raw markdown, a second pass needs `--root-dir <site-src>` and an explicit `--exclude-path` list for any page whose anchors are generated at build time (mkdocstrings and its kin) — lychee's own docs name no built-in way to except those.
- `mlc` (`becheran/mlc`) is a legitimate alternative for a fast, offline, internal-links-only pass; its own author's stated reason to check raw source is to get file-and-line location without waiting for a build — record this as an opposite, valid tradeoff, not a mistake.
- Ship a trigger-matrix as a **template** (source glob → doc file → section → condition), not filled in: ocx's `worker-doc-reviewer.md:15-28` is the fleet's most systematic doc-drift mechanism, but every row is an ocx file path.
- Resolve the doc-debt blocking conflict by the page's blast radius, not uniformly: operationally load-bearing pages (runbooks, incident/recovery procedures) block merge on drift; everyday user-facing pages use a non-blocking, tracked-follow-up model.
- GitLab's own policy is explicit and quoted: "Documentation reviews must not be blockers," with a `tw::finished` label and a required post-merge follow-up issue when a technical writer hasn't signed off yet.
- creeptd-ng's `doc-sync.md:33` makes the opposite call ("A doc-sync violation is a **Block** finding") — and its own docs surface is exactly two runbook-shaped pages, which is precisely the domain where that call is right, not a universal one.
- Do not treat "hand docs to a later writer pass" as safe when author and reviewer are both agents: without a tracked follow-up mechanism the deferred fix has nowhere to land — 0 of 9 fleet sites has a docs-specific issue template at all.
- Adopt ARID at the sentence/prose level: some repetition across pages is fine and often necessary — "Accept (some) Repetition In Documentation" is explicitly not the same claim as DRY.
- Enforce Unique at the fact/source level, not the sentence level: a fact should have one canonical source; Unique's actual scope is "eliminate content overlap between separate sources," which is a statement about storage, not about prose.
- The fleet already violates its own Unique principle: grimoire hand-forked ocx's `docs-style.md` and `skills/docs/SKILL.md` wholesale rather than installing them — the shipped artifact must supersede both forks, not add a third copy.
- Do not invent a numeric documentation-freshness SLO. No source surveyed (including a direct re-check of the one numeric staleness model found) validates a general "review every N days" figure.
- The one validated staleness-cost number that exists is runbook-specific: 3 stale steps in a 30-step runbook produce a ~10% error rate at 8–15 minutes per wrong step, enough to double or triple a 20-minute incident — it does not generalize past runbook-class docs.
- A "last updated" stamp is not evidence of a freshness practice on its own: in this fleet it appears on exactly 3 of 9 sites, entirely as a side effect of one richer `mkdocs.yml` template that also brings `mkdocstrings`, not as a chosen signal.
- Treat a freshness stamp as informational only; never gate a build on its age — the fleet's existing gates that actually work are drift mechanisms (link checks, trigger matrices, tested examples), which fail the moment a concrete claim breaks, not on a clock nobody validated.
- A `doc-sync.md` gate marked "tracked, not built yet" is worse than no rule: it reads as coverage that isn't there, exactly the "looks professional and lies" failure HN 13702628 names — no adopted rule should ship in that state.
- Classify pages mechanically (a `type: runbook` frontmatter key or a fixed `docs/runbooks/**` glob), so the block/non-block fork is a grep an agent can apply, not a judgment call it has to remake every time.

## Findings

### 1. What the "worst documentation" complaints actually indict

Three widely-cited "worst documentation" threads were fetched and re-read directly rather than taken from a prior summary, to confirm the throughline the frame's correction 5 and the audit both assert: complaints are almost never about tone.

- **[HN 25422756](https://news.ycombinator.com/item?id=25422756)**, on the Amazon Selling Partner API (2020): "We need a way to unit test documentation to see if the code snippets still compile and the things that are referenced still exist," and "Every change in API or behaviour should be automatically blocked by CI tooling in release builds if its documentation is missing or outdated." Both top comments propose *testing* documentation, not rewriting its prose.
- **[HN 13702628](https://news.ycombinator.com/item?id=13702628)**, "Bad documentation": "The worst documentation is the documentation that looks professional and complete… and lies through its teeth." The complaint is trust erosion from incorrect content presented well, not from poor writing.
- **[HN 39375456](https://news.ycombinator.com/item?id=39375456)**, "worst documentation tool, except all the others": "The owner had made and shared multiple slightly different copies" (single-source-of-truth failure) and "I need to make a jira ticket, a branch, do a live review… all to change a minor thing in a README" (update friction suppressing fixes).

None of the three threads' representative comments name em-dashes, sentence length, or marketing tone as a complaint. This is independent confirmation of `docs-frame.md` correction 6's re-labelling: the plain-English rules are a house-style choice, and the rules this group owns — link liveness, trigger matrices, single-source detection, blocking policy — are where the actual reader-facing failure lives. This is the argument for weighting drift gates over prose gates, and it should be carried into the shipped rule set's own priority ordering, not just this research note.

### 2. Link-check configuration: two traps, one fix

`docs-shape.md` §5 (this program's own measurement, cited by pointer per the already-covered list for the *existence* of internal/external link checking) found that a naive dead-link scan over ocx's raw markdown source reports **89% of internal links dead (2,087/2,337)**; after two fixes, **2.9% (68/2,337)**. The two fixes:

1. **Explicit heading ids.** `### Options {#script-options}` must be read as the anchor `#script-options`, not a slug of the visible text (`options`). A slugger that ignores `{#...}` manufactures a false dead link at `installation.md:233`.
2. **Root-relative resolution.** A link like `/docs/installation` (the VitePress/Docusaurus/Starlight convention) must resolve against the site's source root (`website/src`), not the linking file's own directory.

A third, distinct trap compounds this for generated reference pages: `ocx-sdk-python/docs/reference/api.md` is a 4-line `mkdocstrings` stub whose real anchors (`#ocx_sdk.<Class>.<method>`) are built from Python docstrings at `mkdocs build` time — invisible to any scan of the raw file. That single repo alone manufactures **65 false positives** in a fleet-wide dead-link count.

`lychee`'s own documentation was checked directly for a fix: `--include-fragments` enables anchor checking, but the docs name no mechanism to except anchors that exist only after another tool's build step ([lychee.cli.rs/recipes/anchors](https://lychee.cli.rs/recipes/anchors/)) — "JavaScript-generated anchors cannot be checked" is the closest stated limitation, and it does not extend to Python/docstring-generated ones either.

**The fix that resolves all three traps at once is structural, not per-repo:** run the link+anchor check against the site's **built output** (`site/` for MkDocs, `.vitepress/dist/` for VitePress, `book/` for mdBook), not the raw markdown tree. A generator that runs `mkdocs build --strict` or its equivalent has already: resolved every `{#...}` anchor and every autogenerated `mkdocstrings` anchor into real HTML ids, and rewritten every root-relative href into a real, resolvable path. Checking after the build is not a novel idea — [lychee.cli.rs/overview](https://lychee.cli.rs/overview/) documents `--root-dir` and `--base-url` for exactly the raw-source case, which exist *because* raw-source checking needs them; built-output checking does not.

```bash
# after `mkdocs build --strict` / `npm run docs:build` / `mdbook build`
lychee --include-fragments ./site           # MkDocs
lychee --include-fragments ./.vitepress/dist  # VitePress
lychee --include-fragments ./book           # mdBook
```

If a project also wants a fast, pre-build pass (editor integration, a pre-commit hook, or CI feedback before the full build finishes), the raw-source path needs both traps handled explicitly:

```bash
lychee --include-fragments --offline \
  --root-dir docs/src \
  --exclude-path 'docs/reference/api.md' \  # mkdocstrings stub: real anchors don't exist yet
  docs/
```

The nine fleet sites already run a strict internal build gate and lychee or a bare invocation of it externally on 6 of 7 MkDocs sites — see `ux-observability-posture.md` §3 for that coverage measurement (already covered; not re-derived here). What is new here is the **configuration** that makes such a check correct rather than merely present: none of the fleet's actual `lychee.toml` files were found to run against build output, so even the sites with a working check are exposed to the anchor and root-relative traps in principle.

### 3. Choosing a link-check tool: lychee vs mlc

Two tools were fetched directly, and they encode a real, opposite tradeoff rather than one being simply better:

- **`lychee`** ([github.com/lycheeverse/lychee](https://github.com/lycheeverse/lychee), current release **v0.24.2**, 2026-05-01, per [the releases page](https://github.com/lycheeverse/lychee/releases)) is async, checks external HTTP(S) URLs, internal file links, anchor fragments (`--include-fragments`), and email addresses. Its official CI integration is `lycheeverse/lychee-action@v2`.
- **`mlc`** (`becheran/mlc`, pinned at `@v0.16.1` in the example workflow) is the tool [lornajane.net's docs-as-code post](https://lornajane.net/posts/2024/checking-links-in-docs-as-code-projects) actually uses in production, deliberately in `--offline` mode.

That post gives the reasoning for the opposite choice explicitly: "I usually check the raw format… because it means the links can be checked without waiting for a build to run, and because the problems are reported in the file where fixes are needed," and "I prefer to check internal links only, so that other people's downtime doesn't make the builds on my own projects fail." Both are legitimate engineering tradeoffs, not oversights:

| | Checks external links | Speed | Location of true source-of-truth | Handles the two anchor/root-relative traps |
|---|---|---|---|---|
| `lychee` on built output | Yes | Slower (waits for build) | Rendered HTML | Free (traps don't exist post-build) |
| `mlc --offline` on raw source | No | Fast | Raw markdown, file+line | Must be handled explicitly, or accepted as noise |

Pick `lychee`-after-build when external-link rot and CI-native GitHub Action integration matter (the majority case for a published docs site with outbound references). Pick `mlc --offline` on raw source when the priority is a fast, in-editor or pre-commit internal-only check and the project is willing to add the root-relative/anchor-exclusion handling itself.

### 4. The trigger matrix: generalizing ocx's mechanism into a portable template

`ocx/.claude/agents/worker-doc-reviewer.md:15-28` is the fleet's most systematic doc-drift mechanism (`config-inventory.md` axis 2, already covered by pointer for its existence and portability rating). Read directly, its actual shape is a four-column table:

```
| Source change pattern | Documentation file | Section to check |
|---|---|---|
| `crates/ocx_cli/src/command/*.rs` (new file) | `reference/command-line.md` | New command section + summary |
| New `OCX_*` env var anywhere | `reference/environment.md` | New env var section |
| Breaking change | `changelog.md` | Breaking changes section |
```

Every row names an ocx path. The mechanism — "map a changed-file glob to the doc file and section it invalidates, and require an agent reviewer to check every match" — generalizes cleanly; the rows do not. The deliverable ships this as a **template with placeholder columns and 2-3 illustrative rows** (a source glob, a doc target, a section name, and a trigger condition), not a filled-in matrix — populating it with a project's actual paths is the *skill's* job (the discovery procedure), not the rule's, per this program's rule/skill split. An adopting project's onboarding pass must produce its own matrix before the trigger-matrix check has anything to check.

The matrix's ceiling must be stated honestly: it is agent-mediated, not a deterministic lint (`config-inventory.md` axis 2) — a row asserts that a code pattern *should* map to a doc section; it does not itself verify the target section's prose is still accurate. It is a discovery mechanism for *where to look*, not a proof that what's there is correct. Pair it with the structural or executable drift gates this program covers elsewhere (already covered: `test_doc_command_reference.py`, `client_target.rs`) wherever one exists for that section.

### 5. Resolving the blocking policy

The fleet holds three different answers to "does documentation debt block a merge," and the map names this as a conflict this topic owns.

- **creeptd-ng** (`doc-sync.md:33`, read directly): "A doc-sync violation is a **Block** finding in review (same severity as any rule violation)." The same file also names two gates as "**Future gate (tracked, not built yet)**" (`:38`, `:41`) — a `#![deny(missing_docs)]` CI check and a path-pairing script — neither exists yet.
- **ocx and grimoire**: documentation is handed to a dedicated `worker-doc-writer` agent as a separate pass after code lands (`config-inventory.md` axis 3).
- **GitLab**, fetched directly ([docs.gitlab.com/development/documentation/workflow](https://docs.gitlab.com/development/documentation/workflow/)): "Documentation reviews must not be blockers." When a feature merges before technical-writer sign-off, "the maintainer must create a post-merge follow-up issue" using the Doc Review template, and the review itself is tracked with `tw::doing` → `tw::finished` labels rather than a merge gate.

These are not equally applicable, and the resolution is not "pick one" but **condition the policy on the page's blast radius**:

- creeptd-ng's own docs surface, per `docs-frame.md`'s wave-1 correction, is exactly **2 pages**, both runbook-shaped (operational, read rarely, under incident pressure). A hard block is defensible there precisely because the surface is small and the cost of a wrong step is high (see §8).
- The rest of the fleet — 248 pages across 23 surfaces, 0 dedicated docs writers, 0 docs-issue templates anywhere — cannot sustain a uniform block-on-any-drift policy: there is no writer capacity to clear a block queue, and GitLab's own scale (a far larger org, with dedicated technical writers) still chose non-blocking. A uniform block policy at this fleet's actual capacity would either stall merges indefinitely or get bypassed procedurally, which is worse than not having the rule.
- But "hand docs to a later writer pass" is not safe as a substitute either, because in this fleet the author and reviewer of that later pass are both agents with no queue, no backlog visibility, and (per `ux-observability-posture.md` §3) no docs-bug issue template anywhere — "later" has nowhere to land and silently becomes "never."

**Resolution:** classify pages mechanically — a `type: runbook` frontmatter key, or a fixed directory glob such as `docs/runbooks/**` — and split the policy on that classification: runbook-class drift blocks merge (creeptd-ng's model, scoped to where it's evidenced as right); everyday-class drift follows GitLab's non-blocking-with-tracked-follow-up model, using an explicit issue (not a vague "later pass") so the deferred fix is visible and assignable. This resolves the conflict rather than averaging it: each named source is right for a different scope, and the classification key is what makes the fork checkable rather than a judgment call.

### 6. Single-source-of-truth: ARID vs Unique

Fetched directly from [writethedocs.org/guide/writing/docs-principles](https://www.writethedocs.org/guide/writing/docs-principles/), the two principles are more precisely scoped than the map's framing suggests, and once read exactly they do not actually conflict — they operate at different levels:

- **ARID** — "Accept (some) Repetition In Documentation." The principle explicitly states strict DRY is impractical for documentation: some restatement is "inevitable," and the goal is to "keep things as DRY as possible" while accepting the moisture, not to eliminate it. This is a claim about **prose**: a default value or a short explanation may appear on both a quickstart and a reference page for a reader's convenience.
- **Unique** — "Eliminate content overlap between separate sources." Read exactly, this is a claim about **storage systems**, not sentences: multiple sources are fine provided each has a "clearly defined and disjoint" scope; what it forbids is "parallel maintenance" of the same information across independently-edited locations, which creates silent-drift risk and eventual abandonment of one copy.

The map's framed conflict ("ARID's accept-some-repetition vs Unique's one-source-per-fact") is a scope confusion, not a genuine disagreement: apply ARID at the sentence/paragraph level (repetition for reader convenience is fine) and Unique at the file/source level (two independently-maintained documents that both claim to be canonical for the same subject is the failure). This fleet has a live, named instance of the Unique failure, not a hypothetical one: `config-inventory.md` describes grimoire's `docs-style.md` as "a strict subset-plus-one" of ocx's — i.e., a near-total fork rather than a disjoint, complementary source — because grimoire hand-forked the file rather than installing it. The shipped artifact is itself the fix: it must supersede both forks, not add a third parallel-maintained copy.

Detection at this scope must be structural, not sentence-level (a sentence-level repetition ban would violate ARID by construction): hash normalized paragraphs (lowercased, whitespace-collapsed) per doc file, and flag any file pair across the docs tree sharing a threshold number of identical normalized paragraphs of meaningful length as a probable fork requiring an explicit decision — merge, redirect one to the other, or document why the overlap is intentional and disjoint.

### 7. Freshness: why no SLO number ships

The brief requires an honest answer, not a manufactured one. `failure-and-observability.md` states explicitly that no source it surveyed gives a validated general documentation-freshness SLO number, and this session re-checked the one candidate numeric model directly rather than taking that absence on faith.

[ekline.io's runbook staleness post](https://ekline.io/blog/why-your-incident-runbook-lies-to-you-at-3-a-m-and-how-to-tell-before-the-page-fires), fetched directly, gives a concrete but narrow model: **3 stale steps in a 30-step runbook** produce "a ten percent error rate," at "eight to fifteen minutes of investigation" per wrong step — "three wrong steps add roughly twenty-four to forty-five minutes" — enough that in a 20-minute incident, the delay "doubled or tripled the time to recovery." This is a real, sourced number, but it is a **runbook-specific** cost model (small page count, read rarely, under incident pressure) — nothing in the source or elsewhere in this survey generalizes it to "review every reference page every N days." Inventing such a number for the general case would manufacture a rule that looks authoritative but isn't — the same "looks professional and complete… and lies through its teeth" failure mode HN 13702628 names for documentation itself.

The fleet's one existing freshness signal is a caution, not a template to copy as-is: `ux-observability-posture.md` §6 measured a "last updated" date stamp present on exactly **3 of 9 sites** (`ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-indexbot`), and in every case it "travels with a specific, richer `mkdocs.yml` template" (the same one that also brings `mkdocstrings` API reference) rather than being an independent, deliberate choice about freshness. Treating that stamp as evidence of a freshness *practice* would be over-reading a template side effect.

**Decision:** ship no invented SLO number. Show a "last verified" or "last updated" date where a generator supports it cheaply (`mkdocs-git-revision-date-localized-plugin` for MkDocs, `lastUpdated: true` for VitePress, a git-blame timestamp for mdBook) as informational metadata only, and explicitly forbid gating a build on its age. Gate instead on the drift mechanisms that fail the moment a concrete claim breaks — link checks (§2), the trigger matrix (§4), and tested examples (already covered elsewhere in this program) — because those have a validated failure signal; a calendar age does not.

### 8. Runbook-class docs: the one domain with a validated staleness cost model

Fetched directly, ekline.io's three countermeasures are concrete and executable by an agent, and they justify both the blocking-policy carve-out (§5) and the exclusion of runbooks from the "no SLO" decision (§7) being scoped rather than absolute:

1. **Tie every step to something live** — a real dashboard URL, an embedded query, a runnable command — so it "breaks visibly" the moment the referenced thing moves, instead of decaying silently.
2. **Run scheduled game-day exercises**: walk the runbook end-to-end outside a real incident; "every step that does not work as written becomes a documentation defect."
3. **Land runbook updates in the same PR as the system change that prompted them** — the same discipline `doc-sync.md` already states in principle for creeptd-ng, but scoped correctly here to the class of doc where the cost of drift is highest.

creeptd-ng's own docs surface (2 pages, per the frame's wave-1 correction) is the fleet's one clean instance of this domain, and it is the domain the blocking policy in §5 was built to fit — not a general instruction to block on every doc gap fleet-wide.

## Normative guidance candidates

1. **Run the anchor-and-external link checker against the built site output** (`site/`, `.vitepress/dist/`, `book/`), not the raw markdown tree.
   *Rationale:* prevents both measured false-positive traps (an 89%→2.9% dead-link swing from root-relative mis-resolution; 65 phantom dead links from build-time-generated anchors) without a bespoke exclusion list per repo.
   *Verify:* a CI step `lychee --include-fragments <build-output-dir>` runs after the build step and exits 0 on a known-good tree; deliberately break one anchor and confirm the step fails.
   *Evidence level:* measured (docs-shape.md §5) + codified (lychee's own docs, §2 above).

2. **If also checking raw markdown pre-build, pass `--root-dir <site-src>` and an `--exclude-path` entry for every page whose anchors are generated at build time** (mkdocstrings, autodoc, and similar).
   *Rationale:* without both, a raw-source pass reproduces the measured false-positive rates (up to 89% dead, or 65 phantom failures from one auto-generated stub) depending on which trap fires.
   *Verify:* `lychee --offline --include-fragments --root-dir <src> docs/` exits 0 against a known-good tree; the exclude list names only pages carrying an "Auto-generated from docstrings"-style header.
   *Evidence level:* measured.

3. **Ship a trigger-matrix as an empty template (source glob → doc file → section → condition) with 2-3 illustrative rows, populated per-project by the discovery skill, not by the rule.**
   *Rationale:* without an explicit mapping, code-to-doc drift is undetectable except by chance re-reading; ocx's version is the fleet's most systematic mechanism precisely because the mapping is explicit — but its rows are not portable as written.
   *Verify:* a presence/shape check that the project's trigger-matrix file exists at a known path and has at least one non-header, non-placeholder row before a first release ships.
   *Evidence level:* codified (existence of the file, config-inventory.md axis 2) for presence; argued for whether populated rows are correct — that half is agent-mediated, not lintable.

4. **Classify each doc page as `runbook` (operationally load-bearing: incident, on-call, or recovery procedure) or default. Runbook-class drift blocks merge; default-class drift opens a tracked follow-up issue and merges anyway.**
   *Rationale:* a uniform block-everything policy is unworkable at this fleet's writer capacity (0 dedicated docs writers, 0 docs-issue templates); a uniform never-block policy lets the one domain with a validated, high cost of staleness (runbooks) rot silently.
   *Verify:* grep a changed page's frontmatter for `type: runbook`, or its path against a fixed `docs/runbooks/**` glob; CI fails only when a changed runbook-tagged page's referenced command/dashboard/query no longer resolves.
   *Evidence level:* argued — this session's synthesis of three named sources (creeptd-ng, GitLab, ekline.io), none of which states this exact split on its own.

5. **Every runbook-class step must name something checkable — a live dashboard URL, a runnable command, or a query — never a static screenshot or a remembered value.**
   *Rationale:* the one validated staleness-cost model found (3/30 stale steps → ~10% error rate, 8–15 minutes per wrong step, doubling or tripling a 20-minute incident) depends on drift being invisible; tying a step to something checkable makes it visible.
   *Verify:* a script that extracts every fenced command/URL from a `runbook`-tagged page and confirms the command exits 0 or the URL resolves, run on a cadence separate from per-PR CI (a scheduled game-day job).
   *Evidence level:* measured (ekline.io), scoped explicitly to runbook-class docs — do not generalize the number past that domain.

6. **Do not ship an invented documentation-freshness SLO number** (e.g., "review every N days" for general reference/guide pages).
   *Rationale:* no source surveyed validates a general number; shipping one manufactures a rule that looks authoritative but isn't evidenced — the same failure mode the source corpus names as the worst kind of bad documentation.
   *Verify (reading heuristic):* a fresh reader greps the shipped rule file for a bare day/month count attached to "freshness," "stale," or "review"; any hit lacking an inline citation is flagged and must be removed or explicitly labelled `(invented, not evidenced)`.
   *Evidence level:* asserted — the absence itself is the finding, confirmed by re-checking the one candidate source directly.

7. **Show a "last verified"/"last updated" date where cheap, but never gate a build on its age.**
   *Rationale:* the fleet's own 3 instances of this stamp are an unintended side effect of one plugin template, not a chosen freshness signal; treating an unvalidated number as load-bearing risks a false sense of currency.
   *Verify:* grep the CI config for a threshold check against the stamp's date (e.g., `days_since_update > N`); its absence is the passing state.
   *Evidence level:* measured (ux-observability-posture.md §6).

8. **Enforce Unique with a whole-file/paragraph-level duplication detector, never a sentence-level repetition ban.**
   *Rationale:* a sentence-level ban violates ARID (some restatement across pages is legitimate and often needed for reader convenience); the real, evidenced failure is two independently-maintained files claiming to be canonical for the same subject.
   *Verify:* a script hashing normalized paragraphs per doc file, flagging any file pair sharing at least 3 identical normalized paragraphs of 40+ words as a probable fork requiring an explicit merge/redirect/disjoint-scope decision.
   *Evidence level:* argued (synthesis) + measured (the fleet's own ocx/grimoire fork is a named, real instance, `config-inventory.md`).

9. **A fact restated across page types for reader convenience (ARID) must carry an adjacent link back to its one canonical source.**
   *Rationale:* without an anchor back to the source, "some repetition is inevitable" degenerates into untracked, independently-drifting copies — the very failure Unique names.
   *Verify (reading heuristic):* a restated concrete fact (a default value, a flag behavior, a schema field) has a link to the page that owns it within the same paragraph or table row; absence is a flaggable smell at suggestion severity, not yet a hard fail.
   *Evidence level:* argued.

10. **No rule ships in a "tracked, not built yet" state.**
    *Rationale:* an inert but written check reads as coverage that isn't there — creeptd-ng's own `doc-sync.md:38,41` names two such gates, unbuilt at time of reading — which is the "looks complete and lies" failure mode applied to the rule set itself.
    *Verify:* grep any adopted rule file for the literal phrase "tracked, not built yet" (or an equivalent hedge like "future gate"); zero hits required before the rule ships as normative.
    *Evidence level:* asserted — a labelling discipline for this program's own output, not an external measurement.

## AI-agent angle

- **Invents a numeric freshness SLO because a number sounds more rigorous than an admission of absence.** An unprompted agent asked to write a staleness rule reaches for "review every 90 days" precisely because it pattern-matches "professional documentation policy." *Check:* grep the drafted rule for a bare day/month count near "freshness"/"stale"/"review" with no citation — any hit is invented and must be removed or explicitly labelled.
- **Copies the strictest fleet example (creeptd-ng's hard Block) wholesale onto every doc surface**, because it's the most fully-specified policy in the training material, without checking whether the target doc set is runbook-shaped or a 248-page general surface. *Check:* does the adopted rule name an explicit page classification key (frontmatter or path glob) before applying a block, or does it block uniformly regardless of page type?
- **Treats "the site build passes" as "link checking is done"** and never adds a separate external-link step, because the internal strict-build gate silently absorbs the whole concept of "link checking" in the agent's mental model. *Check:* does CI include a distinct external-link-checking step (lychee/mlc), separate from and in addition to the docs build step?
- **Fills the trigger-matrix template with the ocx-shaped example rows it just read** (`crates/ocx_cli/...`, `services/X/**`) instead of leaving it as a template for the adopting project to populate with its own paths. *Check:* grep the shipped rule file for any concrete, non-generic repo path; any hit means fleet-specific content leaked into a supposedly portable template.
- **Ships a link checker that silently checks nothing**, because it configured `lychee` against raw markdown without `--include-fragments` or without `--root-dir`, and the tool reports 0 issues — not because the docs are clean, but because it isn't actually checking anchors or resolving root-relative links at all. A false negative here is worse than a false positive because it reads as passing. *Check:* deliberately introduce one broken anchor and one broken root-relative link into a test fixture; the configured checker must fail on both before it is trusted.
- **Bans all repetition in the name of "DRY," because DRY is the more famous slogan than ARID**, and breaks reference-page usability by refusing to restate a default value that a reader needs at the point of lookup. *Check:* does the shipped rule cite ARID by name and its "accept some repetition" clause, or does it simply say "never repeat a fact" without qualification?
- **Implements a "last updated" stamp using the build's current timestamp** (`{{ now }}` in a template) rather than the file's actual last content-changing commit, making every page always read as "updated today" regardless of when it last meaningfully changed. *Check:* does the stamp implementation read from `git log -1 --format=%ai -- <file>` or an equivalent git-history-aware plugin, rather than the build's wall-clock time?

## Contested / evolving

- **Blocking vs non-blocking doc-debt policy — resolved, not contested, once scoped.** The apparent three-way disagreement (creeptd-ng's hard Block vs ocx/grimoire's later-pass vs GitLab's non-blocking-with-follow-up) is not a genuine industry split at the same scope: GitLab's own explicit choice, made at an organization with dedicated technical writers and far more scale than this fleet, is non-blocking. This fleet has zero dedicated writer capacity, which pushes the general case even further toward non-blocking. The one place a hard block survives is the narrow, evidenced carve-out — operationally load-bearing runbook pages — where creeptd-ng's own docs surface already sits. Trending direction, as of 2026: non-blocking-with-tracked-follow-up is the default as documentation surfaces and teams grow past what a small dedicated review pass can cover; hard blocking survives only for narrow, high-blast-radius content classes.
- **ARID vs Unique — resolved as a scope confusion, not a real disagreement.** Read exactly from the primary source, ARID governs prose-level repetition (accept some, for reader convenience) and Unique governs source/storage-level overlap (eliminate parallel-maintained duplicates). They were never in tension; the map's framing merged two different altitudes into one apparent conflict.
- **Freshness SLO number — genuinely unresolved, and stated as such rather than guessed.** No source surveyed, including a direct re-check of the one candidate numeric model (ekline.io, which is runbook-specific), gives a validated general figure. This cannot be resolved from the current evidence; the honest answer is to withhold the number rather than invent one. Watch item: freshness stamps are migrating from commercial knowledge-base/support tooling into engineering docs-as-code workflows faster than a validated general SLO is being published — if that changes, this decision should be revisited.
- **Raw-source vs built-output link checking — a live, reasonable disagreement in practice, trending toward built-output.** Lorna Jane's own production choice (fast, raw-source, offline, internal-only) is defensible and current as of her 2024 post. But as docs generators standardize on a mandatory `--strict`/equivalent build gate in CI (9 of 9 in this fleet already), the "faster raw-source" argument matters less, because the build step is already unavoidable overhead — checking after it is close to free by comparison, and eliminates two whole classes of false positive that raw-source checking must otherwise handle by hand.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [HN 25422756](https://news.ycombinator.com/item?id=25422756) | Hacker News thread, "This is the worst documentation I have ever seen in my life" (Amazon SP-API) | Thread from 2020, refetched 2026-09-05 | Richest primary source naming untested examples and CI-enforced doc-currency as the actual fix readers want |
| [HN 13702628](https://news.ycombinator.com/item?id=13702628) | Hacker News thread, "Bad documentation" | Refetched 2026-09-05 | The "looks professional and lies" trust-erosion framing, directly relevant to why an invented SLO number is a real hazard |
| [HN 39375456](https://news.ycombinator.com/item?id=39375456) | Hacker News thread, "worst documentation tool, except all the others" | Refetched 2026-09-05 | Single-source-of-truth and update-friction complaints, tooling-agnostic |
| [GitLab documentation workflow](https://docs.gitlab.com/development/documentation/workflow/) | GitLab's own published engineering workflow docs | Live page, read 2026-09-05 | Primary source for the exact non-blocking policy, `tw::doing`/`tw::finished` labels, and the post-merge follow-up issue mechanism, quoted verbatim |
| [Write the Docs — Documentation Principles](https://www.writethedocs.org/guide/writing/docs-principles/) | Community-maintained practitioner guide | Read 2026-09-05 | Primary, exact-wording source for ARID and Unique, resolving the map's stated conflict as a scope distinction |
| [lycheeverse/lychee](https://github.com/lycheeverse/lychee) | The tool's own GitHub repository | Read 2026-09-05 | Confirms what lychee checks (external, internal, anchors, email) and its configuration surface |
| [lychee.cli.rs/overview](https://lychee.cli.rs/overview/) | lychee's own documentation site | Read 2026-09-05 | `--root-dir`/`--base-url` options for raw-source root-relative resolution |
| [lychee.cli.rs/recipes/anchors](https://lychee.cli.rs/recipes/anchors/) | lychee's own anchor-checking recipe | Read 2026-09-05 | Confirms no built-in exclusion for build-time-generated anchors — the gap this program's config recommendation works around |
| [lycheeverse/lychee releases](https://github.com/lycheeverse/lychee/releases) | GitHub releases page | v0.24.2, 2026-05-01 | Pins the exact current version for the normative candidate |
| [lycheeverse/lychee-action](https://github.com/lycheeverse/lychee-action) | Official GitHub Action for lychee | Read 2026-09-05, `@v2` current | The exact CI wiring recipe |
| [Lorna Jane — Checking Links in Docs-As-Code Projects](https://lornajane.net/posts/2024/checking-links-in-docs-as-code-projects) | Independent practitioner blog | 2024, read 2026-09-05 | The opposite, equally legitimate raw-source/offline/internal-only tradeoff, with a working CI recipe using `mlc` |
| [ekline.io — Why Your Incident Runbook Lies to You at 3 a.m.](https://ekline.io/blog/why-your-incident-runbook-lies-to-you-at-3-a-m-and-how-to-tell-before-the-page-fires) | Independent SRE-focused blog | 2025/2026 era, read 2026-09-05 | The only numeric staleness-cost model found anywhere in this survey, with concrete countermeasures |
| `ocx/.claude/agents/worker-doc-reviewer.md` (local repo file) | Real fleet artifact | Read 2026-09-05 | The fleet's most systematic doc-drift mechanism, read directly for its exact trigger-matrix shape |
| `creeptd-ng/.claude/rules/doc-sync.md` (local repo file) | Real fleet artifact | Read 2026-09-05 | The fleet's hard-blocking policy, read directly including its two named-but-unbuilt future gates |
| `docs-audit/docs-shape.md` §5 | This program's own fleet measurement | 2026-09-05 | The exact before/after dead-link numbers (89% → 2.9%) that motivate the built-output recommendation |
| `docs-audit/config-inventory.md` axes 2-3 | This program's own fleet measurement | 2026-09-05 | The trigger-matrix source, the ocx/grimoire fork instance, and the blocking-vs-later-pass contradiction |
| `docs-audit/ux-observability-posture.md` §3, §6 | This program's own fleet measurement | 2026-09-05 | Link-check coverage table and the freshness-stamp-as-template-side-effect finding |
| `docs-topic-map/failure-and-observability.md` | This program's own literature synthesis | 2026-09-05 | The explicit "no freshness SLO source found" finding, and the HN thread pointers this note re-verified directly |
