export const meta = {
  name: 'code-docs-wave3-followups-and-revise',
  description: 'code-docs program wave 3: seven follow-up dives the wave-2 consolidations commissioned, then one opus reviser per affected topic group',
  phases: [
    { title: 'Dive', detail: 'seven sonnet follow-ups, most of them measurement on scratch copies' },
    { title: 'Revise', detail: 'one opus reviser per affected group, ID-stable' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs'
const R = ROOT + '/.agents/research'
const H = R + '/code-docs-eval/harness'
const SCRATCH = '/home/mherwig/.cache/research-lang/code-docs-scratch'
const DATE = '2026-09-27'

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- Research program 'code-docs' in the lore catalog worktree ${ROOT} (treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). Goal: shorter, better code comments for codebases AI agents mostly write and read, without a cold agent losing why a non-obvious line looks the way it does or whether it may change it. Output: a rule globbed on every source extension, checks under rules/code-docs/checks/, a cleanup skill, amendments to overlapping lore rules, and a reason-recovery eval.
- Read first: ${R}/code-docs-frame.md, ${R}/code-docs-topic-map.md ("What the grounding changed"), and the wave-2 consolidation your commission names (${R}/code-docs-<group>.md). The consolidations hold the current rule IDs (GRD, LNK, RTE, SRF, LEN, CLN, EVL).
- Fleet under /home/mherwig/dev: ocx, grimoire, grimoire-vscode, grimoire-indexer, ocx-indexbot, ocx-mirror, ocx-sdk-python, ocx-catalog, arcana, creeptd-ng and smaller repos. Never read ocx-save, ocx-sion, ocx-soraka, ocx-evelynn, grimoire-duo, grimoire-wt-*, index-claims, index-fix67, mirror-*, uv, or any .worktrees/, .agents/worktrees/, .tmp-*, .tmp/ directory. Reference clones (read-only; never check out) are at /home/mherwig/.cache/research-lang/exemplars/code-docs/.
- NEVER modify a fleet repository. Anything you build, mutate, compile or test runs in a scratch copy under ${SCRATCH}/<your-slug>/ made with 'git -C /home/mherwig/dev/REPO archive HEAD | tar -x -C DEST' (or git worktree add --detach into that scratch path, removed when you finish). Cargo: set CARGO_TARGET_DIR under ${SCRATCH}/<your-slug>/target. Bound every build or test run with timeout 1800. Never write under /tmp.
- git in this environment passes through an output-filtering hook: for any count or leak check over history use /usr/bin/git directly.
- The owner's premises and every consolidation's claims are hypotheses. Contradicting one with evidence is the most valuable result you can produce.
- VERIFICATION COMMAND SHAPE (a checker rejects the rest): directory operand with -r or rg, never a bare shell glob; one -e per alternative instead of \\| inside a pattern; no angle-bracket placeholders inside a quoted pattern (write NAME=example; grep -e "$NAME"); pipe file lists through xargs -r; quote globs after --include= and --glob; never an unescaped | inside a markdown table cell (write \\|).
- Date everything researched ${DATE}. The only files you may create or modify are your OUTPUT FILE(s) and your own scratch directory.`

const DIVE_CONTRACT = (path) => `OUTPUT FILE: ${path}

Structure: YAML frontmatter (title, topic, agent, model, date_researched: ${DATE}, sources_count, scope); a table of contents; "## Summary" (10-20 standalone bullets); "## Findings" (numbered; every claim cites repo:path:line, a command with its output, or a fetched URL); "## Normative guidance candidates" (rule, rationale naming the failure, verification following the command shape, proposed severity; say which existing rule ID each confirms, changes or retires); "## Decisions this dive proposes" (answer each item the commission asks to decide); "## Sources". Measurement first: every number with the command that produced it, run on a real tree, and every check you propose watched go red on a planted violation and green on its twin. Fetch external sources where they settle a question; at least 3. Return the structured receipt.`

const DIVE_SCHEMA = {
  type: 'object',
  properties: { path: { type: 'string' }, headline: { type: 'array', items: { type: 'string' } }, rule_changes: { type: 'array', items: { type: 'string' } } },
  required: ['path', 'headline', 'rule_changes'],
}

const DIVES = {
  sites: { dir: 'code-docs-eval', slug: 'eval-sites-harvest', label: 'eval site set in the EVL-02 schema', brief: `Commission (eval group, EVL-02, EVL-09, EVL-10). Read ${R}/code-docs-eval.md in full, ${R}/code-docs-audit/eval-sites.md, ${R}/code-docs-eval/eval-arms-and-sites.md, and ${R}/code-docs-audit/sample.md section 5.
Produce the eval's site list as a JSON array at ${H}/sites.json (a second output file you may write) and document it in your OUTPUT FILE.
1. Every existing mechanism site (the 40 in eval-sites.md, JSON block at its end) gets these fields, re-read from the live file at /home/mherwig/dev/REPO HEAD: id, repo, file, function, stratum (A = obviousness 3 and no test; B = has a test; X = reason stays in code whatever the arm, like PY-02), comment_start, comment_end (1-based inclusive line span of the comment block that carries the reason — ONLY comment lines, never the function span; if the reason spans two separate blocks, pick the one nearest the guarded line and list the other in extra_comment_spans), anchor (one or two CODE lines copied verbatim from the guarded code — never comment text), ground_truth, consequence (what breaks, concretely), breaking_edit (a concrete code change a simplifier would make), test (test function name and file, or none, or structural), comment_lines (comment_end - comment_start + 1), register (doc or plain), lang, reason_in_code (true only when no comment edit can remove the reason).
2. Harvest 6 NEW over-10-line guard sites from non-Rust fleet code, starting from these candidates named by the eval consolidation: ocx-sdk-python src/ocx_sdk/_bootstrap.py:431, src/ocx_sdk/_dist.py:614, src/ocx_sdk/_process.py:165, ocx-catalog src/sources/types.ts:231, src/viewmodel/catalog.ts:171, src/theme/composables/usePackageRoot.ts:74. Verify each is a real guard (a plausible edit breaks something), fill every field; replace any candidate that fails with another over-10-line guard from sample.md section 5 or scratch samples.
3. Harvest 8 CONTROL sites (stratum C): narration or tautology comment blocks inside real fleet functions that also contain other statements, preferably near real guards (for example ocx-catalog src/theme/utils/version.ts:171 and grimoire src/resolve/resolver.rs:193). Each gets safe_edit: a behaviour-preserving CODE change (never 'delete the comment'), and you must PROVE it safe: apply it in a scratch copy and run the repo's relevant tests (name the command and paste the pass line). Controls need breaking_edit set to the safe_edit text too (the probe asks about it) and consequence 'none'.
4. Validate: every anchor classifies as code with ${ROOT}/rules/code-docs/checks/comment_census.py (import it and call classify), comment_start <= comment_end, every comment span line classifies as doc or line, and at least a quarter of the A+B sites (reason_in_code false) have comment_lines over 10. Print the validation command and output in your file.
Decide: the final list; which sites drop and why.` },
  tests: { dir: 'code-docs-routing', slug: 'tests-as-guards-proof', label: 'does the named test fail on the breaking edit', brief: `Commission (routing RTE-03/RTE-06, guards GRD-07, cleanup CLN-07). Read ${R}/code-docs-routing.md, ${R}/code-docs-routing/tests-as-guards.md, ${R}/code-docs-guards.md, ${R}/code-docs-cleanup.md and ${R}/code-docs-audit/eval-sites.md.
The claim to test: a test named for a constraint owns the guard, so the comment may shrink. Owning means the test FAILS when the breaking edit is applied.
1. For every eval site whose test field names a test (the Tier-B sites: OCX-01, -04, -10, -11, -12, -15, -16, -18, -19, -20, -22, -24, GRM-01, -02, -05, -07, -08, PY-02, PY-03, PY-04, TS-01, TS-02, TS-04, and any other with a named test), read the test body and say whether it builds the guard's own scenario.
2. Then, in scratch copies, apply the site's breaking_edit (as literally as the code allows) and run ONLY the named test (cargo test -p CRATE TESTNAME with CARGO_TARGET_DIR in scratch; pytest -k; the TS repo's runner with a name filter). Record red or green, the command and the output line. cfg(windows) tests that cannot run here: say so. Budget your time: build each Rust workspace once, then iterate.
3. Where a mutation tool is cheap (mutmut or cosmic-ray via uvx for the Python sites, Stryker via npx for the TS sites; cargo-mutants via cargo install into ${SCRATCH} only if a build is already warm), run it on the guarded span only and report killed/survived per mutant.
4. Measure the noun-only rate: how often a test name shares the guard's noun but does not exercise the breaking edit.
Decide: which of the candidate rules (RTE-03 keep one line naming the test; GRD-07/CLN-07 owner must be shown to fail on the edit; RTE-06 mutation before shrinking security or durability guards) hold, which change, and what share of Tier-B tests truly own their guard.` },
  planids: { dir: 'code-docs-linkage', slug: 'plan-ids-fleet', label: 'plan-ID families and false positives fleet-wide', brief: `Commission (linkage LNK-01, LNK-11). Read ${R}/code-docs-linkage.md and ${R}/code-docs-linkage/plan-ids.md first.
The ID family regex set and its exclusion list were built on ocx only and missed ADR-N (190 hits in ocx-indexbot). Before the check ships fleet-wide:
1. Run the proposed regex set over comment text only (use comment_census.py's classifier, not a raw grep, so code identifiers and strings do not count) in ocx, grimoire, arcana, ocx-indexbot, ocx-sdk-python, ocx-mirror, grimoire-vscode, ocx-catalog, creeptd-ng, prod and test scope separately.
2. Per repo and family: hits, then read 20 hits per family and report the false-positive rate (heading levels H1-H6, version tags V1/V2, UTF-8, SHA-256, CWE-400, RFC numbers, issue refs like #42, semver, CSS/colour tokens, hardware names).
3. Run the same regexes over the reference corpus clones (human code) to measure the false-positive floor: every hit there is by construction not a plan ID.
4. Write the final pattern set and exclusion list as a small Python module sketch (pattern list, exclusions, a test fixture of 20 true and 20 false positives) inside your OUTPUT FILE, and prove it: precision and recall on the fixture and on 50 fresh fleet hits.
5. Test names: count test functions whose NAME carries a plan-ID prefix (c050_s022_...) per repo.
Decide: the shipped family set, the exclusion list, whether test names are in scope for the ban (LNK-11), and the ratchet unit (lines per file).` },
  doccap: { dir: 'code-docs-ratchet', slug: 'doc-cap-calibration', label: 'doc-comment caps: visibility, structured sections, human doc guards', brief: `Commission (ratchet LEN-01, LEN-02). Read ${R}/code-docs-ratchet.md and ${R}/code-docs-ratchet/length-and-ratchet.md first, then ${R}/code-docs-audit/reference-corpus.md.
The proposed caps are plain blocks at most 5 lines everywhere, doc blocks at most 10 lines in apps and 15 in libraries. Test them.
1. On the reference clones (read-only; they are checked out at their pre-2022 snapshot; do not change that), measure doc-block length distributions split by: public vs private item (Rust pub vs non-pub, Python leading underscore, TS export vs not, Go exported vs not, Java/Kotlin public vs not), and with structured sections removed (Rust # Errors/# Panics/# Safety/# Examples and fenced examples, Python Args:/Returns:/Raises: and reST fields, JSDoc @param/@returns, Javadoc @param/@return/@throws). Report p50/p90/p95/p99 per split for apps and libraries. Write the measurement script into your scratch dir and inline it in the file.
2. Sample about 50 more HUMAN doc-register guards across the 32 repos (seeded random over doc blocks, then keep the ones that are guards) and report their length distribution; wave 1 had only 7.
3. Apply each candidate cap design to the fleet (ocx, grimoire, ocx-sdk-python, ocx-catalog): how many comment lines sit in over-cap blocks under each design, and how many of those are contract text a caller needs.
4. Interface blocks (clap/schemars/pydantic): measure their lengths in ocx and decide whether they count toward the doc cap.
Decide: cap values per register and kind (or per visibility), whether structured sections are exempt, and the numbers with the percentile of human code each cap sits at.` },
  owned: { dir: 'code-docs-guards', slug: 'owned-guards', label: 'guards a lint or a type can own', brief: `Commission (guards GRD-09, GRD-10 and the type-owned question no dive covered). Read ${R}/code-docs-guards.md and ${R}/code-docs-guards/lint-owned-guards.md, ${R}/code-docs-audit/eval-sites.md.
1. Lint blast radius: in scratch copies of ocx, grimoire and ocx-mirror, run cargo clippy with -W clippy::let_underscore_must_use -W let_underscore_drop -W clippy::let_underscore_untyped and, per crate, a scoped -W clippy::wildcard_enum_match_arm. Count hits per lint and read 30: how many are ERR-19-style deliberate discards, how many are real guards, how many noise. Note the toolchain version.
2. Planted proof: for OCX-09 and GRM-08 (the named-binding RAII guards) show which lint fires when the binding is renamed to an underscore, and whether #[must_use] on the guard type changes that.
3. Type-owned guards: for each of the 40 mechanism sites and the exhaustiveness claims, say whether a type could own the constraint instead of a comment (an enum instead of Option<bool> for OCX-20, a resolved-path newtype for PY-04 and TS-04, a no-Default parameter, a sealed trait, a builder that cannot skip a step) and sketch the type in the site's language. Estimate how many fleet guards (from sample.md section 5) are type-ownable.
4. Fetch the primary docs for each lint (rust-lang.github.io/rust-clippy, doc.rust-lang.org/rustc/lints) and for Python/TS equivalents (typing.assert_never, TS never exhaustiveness, typescript-eslint switch-exhaustiveness-check).
Decide: which lints ship as recommended config, which guard shapes the rule should route to a type instead of a comment, and the phrasing of that routing row.` },
  replays: { dir: 'code-docs-ratchet', slug: 'gate-replays', label: 'replay LNK-06 and LEN-06 over real history', brief: `Commission (linkage LNK-06, ratchet LEN-06, guards GRD-06). Read ${R}/code-docs-linkage.md, ${R}/code-docs-ratchet.md, ${R}/code-docs-guards.md (the seven-rule lexical guard recogniser) and ${R}/code-docs-guards/guard-shape.md.
Two gates were proposed as MUST or SHOULD without a replay. Measure their precision on real history, in a scratch clone of ocx (git clone --no-local /home/mherwig/dev/ocx into scratch; use /usr/bin/git).
1. LNK-06 (a branch that deletes or renames a path a record or path-scoped rule cites must update that record): replay the crate-split commit b79abbe8d3 citation by citation. Of its hits, which are live pointers that went stale and which are the record's historical subject (adr_crate_split_workspace.md describes the old layout)? Then replay over the last 300 commits: how many commits would the gate have blocked, and how many of those blocks were right.
2. LEN-06 (fail a diff that removes or shrinks a block the guard recogniser fired on, unless it adds a file-qualified pointer, a covering test or a lint-owned form): implement the recogniser as a small Python script in your scratch dir (inline it in your file), replay it over the last 200 ocx commits, and hand-read every block it would have protected: true guard deletions vs legitimate essay splits vs noise.
3. Measure the recogniser's recall on the 100 guard blocks listed in ${R}/code-docs-audit/sample.md section 5 and on the eval sites' comment spans, and its precision on 100 random non-guard blocks.
Decide: MUST, SHOULD or advisory for each gate, with the numbers.` },
  surfaces: { dir: 'code-docs-surfaces', slug: 'interface-check', label: 'one interface-leak check across generators', brief: `Commission (surfaces SRF-01, SRF-03). Read ${R}/code-docs-surfaces.md and ${R}/code-docs-surfaces/interface-leak.md first.
1. For each generator the fleet uses (ocx clap tree and golden JSON schemas; grimoire clap tree and any schemas; any rmcp/MCP tool list in ocx or grimoire; ocx-sdk-python docstrings rendered by its doc build or pydantic schemas; grimoire-vscode and ocx-catalog package.json contributes descriptions and commander/zod help if any), capture the rendered text in a scratch copy (build binaries with CARGO_TARGET_DIR in scratch, run --help recursively, dump schemas with the repo's own command or test).
2. Apply the SRF-01 token set to each rendered surface: count true leaks and false positives; tune the token set until false positives are at most 2 percent, and show the final set.
3. Design the output-side test per generator (what it walks, what it asserts), and prove one per language on a planted leak: red with the leak, green without.
4. Decide whether schema description text counts as ocx's versioned contract, from the repo's own docs and changelog practice (evidence only; the decision itself is the owner's).
Decide: the token set, the per-generator test shapes, and whether SRF-03 stays MUST.` },
}

const REVISE = (group, reads, extra) => `You are REVISING an existing consolidated artifact to fold in follow-up rounds it commissioned.

Read ${R}/code-docs-${group}.md IN FULL, then every file in ${R}/code-docs-${group}/ in full, then these new follow-up artifacts in full: ${reads.join(', ')}.${extra}

Rewrite ${R}/code-docs-${group}.md in place, preserving its structure:
- ID STABILITY IS A HARD CONTRACT. Every existing rule ID keeps its number and its meaning. Do not renumber, reorder into different IDs, or reuse a retired number. New rules get NEW IDs continuing the sequence. A rule the evidence kills is marked RETIRED with the reason, never deleted.
- If a follow-up CONTRADICTS an existing rule, change that rule's text in place and record the change — never leave both standing. A rule that overclaims a guarantee the new research shows does not exist is the most dangerous kind; fix it explicitly. Re-grade severities from the new numbers.
- Update the Verdict for whatever the follow-ups settled, and REMOVE from Open questions whatever they answered. A GAP the research established moves into the Verdict as a documented gap.
- Add or extend a "## Revision log": one line per change — what, which IDs, why, which follow-up.
- Update the frontmatter's consolidates list and add revised: ${DATE}.
Do not modify any other file. Return the structured receipt.`

const REV_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    changed: { type: 'array', items: { type: 'string' } },
    rules: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, rule: { type: 'string' }, severity: { type: 'string' } }, required: ['id', 'rule', 'severity'] } },
    still_open: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'changed', 'rules', 'still_open'],
}

const dive = (k) => {
  const d = DIVES[k]
  const extraOut = k === 'sites' ? ' Second output file: ' + H + '/sites.json.' : ''
  return agent('Model rationale: sonnet — measurement and follow-up research on scratch copies; the rule decisions are revised by opus.\n\n' + CONTEXT + '\n\nYOUR COMMISSION (' + d.label + '):\n' + d.brief + '\n\n' + DIVE_CONTRACT(R + '/' + d.dir + '/' + d.slug + '.md') + extraOut,
    { label: 'dive:' + d.slug, phase: 'Dive', schema: DIVE_SCHEMA, model: 'sonnet' })
}
const p = {}
for (const k of Object.keys(DIVES)) p[k] = dive(k)
const path = (k) => R + '/' + DIVES[k].dir + '/' + DIVES[k].slug + '.md'
const revise = (group, keys, extra) => Promise.all(keys.map((k) => p[k])).then(() => agent(
  'Model rationale: opus — revising an enforced ruleset from new measurements; severities and contradictions have a blast radius.\n\n' + CONTEXT + '\n\n' + REVISE(group, keys.map(path), extra || ''),
  { label: 'revise:' + group, phase: 'Revise', schema: REV_SCHEMA, model: 'opus' }))

const revs = await parallel([
  () => revise('guards', ['owned', 'tests', 'replays']),
  () => revise('linkage', ['planids', 'replays']),
  () => revise('routing', ['tests']),
  () => revise('ratchet', ['doccap', 'replays']),
  () => revise('surfaces', ['surfaces']),
  () => revise('cleanup', ['tests', 'replays']),
])
const dives = {}
for (const k of Object.keys(DIVES)) dives[k] = await p[k]
log('wave 3: ' + Object.values(dives).filter(Boolean).length + '/7 dives, ' + revs.filter(Boolean).length + '/6 revisions')
return { dives, revisions: { guards: revs[0], linkage: revs[1], routing: revs[2], ratchet: revs[3], surfaces: revs[4], cleanup: revs[5] } }
