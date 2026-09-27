export const meta = {
  name: 'nix-review-and-sweep',
  description: 'Nix research program phase 8: opus content reviewers (notes compliance, contradictions, verification honesty on planted fixtures, era, portability, trigger evals) plus opus real-tree sweepers that run every verification cell verbatim over the 38-repo corpus and 8 held-out flakes; findings only, no edits',
  phases: [
    { title: 'Review', detail: 'one opus reviewer per artifact set', model: 'opus' },
    { title: 'Sweep', detail: 'every verification cell run over real trees, breaks grouped by failure class', model: 'opus' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
const RESEARCH = ROOT + '/.agents/research'
const RUN = '/home/mherwig/.cache/research-lang/nix-tools/run.sh'
const FIX = '/home/mherwig/.cache/research-lang/nix-tools/fixtures'
const EX = '/home/mherwig/.cache/research-lang/exemplars/nix'
const HELD = '/home/mherwig/.cache/research-lang/exemplars/nix-heldout'
const R = ROOT + '/rules/nix-quality'

const SETS = [
  { label: 'index-flakes-inputs', kind: 'rule',
    files: [ROOT + '/rules/nix-quality.md', R + '/flakes.md', R + '/inputs.md'],
    sources: ['nix-flakes.md', 'nix-inputs.md', 'nix-gates.md'] },
  { label: 'packaging-release', kind: 'rule',
    files: [R + '/packaging.md', R + '/release.md'],
    sources: ['nix-packaging.md', 'nix-release.md'] },
  { label: 'gates-language-security', kind: 'rule',
    files: [R + '/gates.md', R + '/language.md', R + '/security.md'],
    sources: ['nix-gates.md', 'nix-language.md', 'nix-security.md'] },
  { label: 'generated-modules-adr', kind: 'rule',
    files: [R + '/generated-flakes.md', R + '/modules.md', RESEARCH + '/nix-generated-flakes/adr_nix_flake_generation.md (an ADR draft for ocx-sh/ocx, not a lore artifact: review it for decisions that contradict the NIX-GEN rules or the evidence)'],
    sources: ['nix-generated-flakes.md', 'nix-modules.md', 'nix-audit/ocx-index-and-fleet.md'] },
  { label: 'skills', kind: 'skill',
    files: [ROOT + '/skills/nix-flake-adopt/ (SKILL.md and references/)', ROOT + '/skills/nix-flake-release/ (SKILL.md and references/)', ROOT + '/skills/nix-diagnose/ (SKILL.md and references/)'],
    sources: ['nix-flakes.md', 'nix-packaging.md', 'nix-release.md', 'nix-gates.md', 'nix-language.md', 'nix-language/evaluation-failures.md'] },
]

const SWEEPS = [
  { label: 'flakes-inputs-gates-security', families: 'NIX-CORE (index gate block), NIX-FLK, NIX-INP, NIX-GATE, NIX-SEC',
    files: [ROOT + '/rules/nix-quality.md', R + '/flakes.md', R + '/inputs.md', R + '/gates.md', R + '/security.md'] },
  { label: 'packaging-release-language-modules', families: 'NIX-PKG, NIX-REL, NIX-LANG, NIX-MOD',
    files: [R + '/packaging.md', R + '/release.md', R + '/language.md', R + '/modules.md'] },
  { label: 'generated-and-skills', families: 'NIX-GEN, plus every runnable command in the three skills (nix-flake-adopt templates applied to a real repo, nix-flake-release steps, nix-diagnose first commands)',
    files: [R + '/generated-flakes.md', ROOT + '/skills/nix-flake-adopt/', ROOT + '/skills/nix-flake-release/', ROOT + '/skills/nix-diagnose/', RESEARCH + '/nix-generated-flakes/prototype/'] },
]

const COMMON = `PROJECT CONTEXT (context for you, not content to reproduce):
- You are in phase 8 (Validate) of the research-lang program for Nix, run from ${ROOT} (a git worktree; treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The drafted artifacts ship through the lore catalog to coding agents that load them without a human in the loop. You find defects; you do not fix them, and you never edit a file under ${ROOT}. Your only writes are planted fixtures under your fixture dir (named below; create it) and scratch copies of real repositories under it.
- A REAL TOOLCHAIN: '${RUN} <cmd>' (pipelines: '${RUN} bash -c "..."') runs CppNix 2.35.2 with nixfmt 1.5.0, nixfmt-tree, deadnix 1.3.2, statix, nixf-diagnose, flake-checker 0.2.15, nix-update, nurl, jq, git, curl; CppNix 2.31.5 via 'nix shell nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439#nixVersions.nix_2_31 --command ...'; Lix 2.95.2 via the same with '#lix'. Use ONLY run.sh for Nix (never nix-portable directly, never a second store, never gc); it uses a shared store with SQLite WAL and parallel use is fine. Fixture flakes need 'git init -q && git add -A' before eval. Never pass --impure or --accept-flake-config to third-party code; never build large packages; bound runs with 'timeout 600'.
- Corpora: the 38-repo exemplar corpus at ${EX}/<owner>__<repo> (blob-less sparse clones: *.nix, flake.lock, .github/, nix/ and root files; SHAs in ${EX}/../nix-fetch.log) and the HELD-OUT corpus of 8 fresh flakes at ${HELD}/<owner>__<repo> (agenix, impermanence, nixos-hardware, stylix, nh, devshell, nix-direnv, microvm.nix; SHAs in ${EX}/../nix-heldout.log). Evaluate a third-party flake by remote ref 'github:owner/repo/<full-sha>' with --no-write-lock-file, never the sparse path.
- KNOWN INPUTS FROM THE ORCHESTRATOR (measured 2026-09-27; confirm, then turn into findings with exact fix text where they touch your files): (K1) NIX-FLK-02 is overstrict: on CppNix 2.35.2 'nix flake check' accepts overlays.default = _final: prev: ... and _final: _prev: ... (exit 0) and rejects only self: super:, prev: final: and formals { final, prev }: (exit 1). The rule text 'first argument is literally final' must become 'first argument named final, or _final when unused; second named prev, or _prev when unused; no formals, no self/super, no swapped order' after the index-flakes reviewer re-runs the six forms on CppNix 2.31.5 and Lix 2.95.2. NIX-PKG-21's _final: prev: example is therefore compliant, and the nix-flake-adopt skill's claim that _final breaks NIX-FLK-02 is wrong. (K2) The nix-flake-release skill runs the floor and Lix legs as 'nix shell --inputs-from . nixpkgs#...' (locked nixpkgs) while gates.md and the index gate block may write 'nix shell nixpkgs#...' (global registry); the locked form is the correct one, one spelling must win everywhere. (K3) The nix-flake-adopt drafter found three gate-block hazards when wiring the security greps into a CI run: step: a negated command (! grep ...) never fails a bash -e step; the SEC-02/03/08 patterns match the workflow file's own line unless bracketed (accept-flake-[c]onfig); a literal dollar-double-brace secrets expression inside run: is expanded by GitHub. Check the index gate block and gates.md for each. (K4) The nix-diagnose drafter measured that Lix 2.95.2 prints 'relative path ... points outside of its parent's store path' for a path:../sibling input, contradicting the consolidation's claim that Lix matches CppNix's 'access to absolute path ... forbidden'; any depth-file row quoting that error must carry the split. (K5) The ADR notes the prototype silently drops unmapped SPDX ids (GEN-14 deviation) and hardcodes the ocx-contrib registry repo.
- READ FIRST, in full: ${ROOT}/.claude/skills/research-lang/references/validation.md; ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md; ${RESEARCH}/nix-topic-map.md sections "## Authoring notes (binding on the drafters)" and the "Cross-consolidation contradictions" lists inside every "Wave N landed" section (the latest wave wins), and the failure-class list C1-C25 in the latest "Wave N landed" section. A drafted file that departs from the notes is a notes-violation; one that follows them is not a finding even if you would have decided otherwise.
`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['set', 'files_read', 'findings', 'verifications_exercised', 'unresolved_ids', 'trigger_evals', 'new_failure_classes', 'verdict'],
  properties: {
    set: { type: 'string' },
    files_read: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['file', 'line', 'severity', 'kind', 'finding', 'fix'],
        properties: {
          file: { type: 'string' }, line: { type: 'number' },
          severity: { type: 'string', enum: ['blocker', 'fix', 'nit'] },
          kind: { type: 'string', enum: ['contradiction', 'verification-dishonest', 'false-positive-on-real-tree', 'false-negative-on-real-tree', 'unsupported-claim', 'era-unlabelled', 'notes-violation', 'portability', 'duplication', 'budget', 'style', 'deletion-candidate', 'trigger', 'template-broken'] },
          finding: { type: 'string' }, fix: { type: 'string', description: 'the exact replacement text or the exact edit, so a mechanical fixer can apply it without re-deciding' },
        },
      },
    },
    verifications_exercised: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'went_red', 'went_green', 'note'], properties: { id: { type: 'string' }, went_red: { type: 'boolean' }, went_green: { type: 'boolean' }, note: { type: 'string', description: 'for a sweep: repos run, hits, true/false positives and false negatives with repo@sha12:path:line' } } } },
    unresolved_ids: { type: 'array', items: { type: 'string' }, description: 'rule IDs cited in the set that no table in the repository defines' },
    trigger_evals: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['skill', 'should_trigger', 'should_not_trigger', 'weakness'], properties: { skill: { type: 'string' }, should_trigger: { type: 'array', items: { type: 'string' } }, should_not_trigger: { type: 'string' }, weakness: { type: 'string' } } }, description: 'empty unless the set is the skills set' },
    new_failure_classes: { type: 'array', items: { type: 'string' }, description: 'breaks that fit none of C1-C25, each with mechanism, evidence and the check that would catch it; empty if none' },
    verdict: { type: 'string', enum: ['ship', 'fix-then-ship', 'redraft-file'] },
  },
}

function review(set) {
  return agent(`Model rationale: opus — content review of text that becomes an enforced rule; a wrong MUST or a verification that cannot go red propagates into every future diff.

${COMMON}
- Your fixture dir: ${FIX}/review-${set.label}/
- THE SET UNDER REVIEW (read every file in full): ${set.files.join(' ; ')}
- THE CONSOLIDATIONS the set was drafted from (read in full; they are the admissible evidence for a fact check; do not use your memory of versions): ${set.sources.map(s => RESEARCH + '/' + s).join(', ')}
- House shape: ${ROOT}/rules/go-quality.md and ${ROOT}/rules/go-quality/errors.md${set.kind === 'skill' ? ', and ' + ROOT + '/skills/go-release/SKILL.md for a skill' : ''}.

DO SIX THINGS AND RETURN STRUCTURED FINDINGS.
1. Notes compliance: globs, pinned defaults Q1-Q8, version pins and the Era line, dropped or retired IDs (LANG-09, PKG-20), bounded duplication, the index-owned NIX-CORE family, the scope edits E28-E44 of the latest contradiction list, the shape binding in Severity cells. Every rule ID row matches the consolidation's ID and meaning; an ID the consolidation does not have is an unsupported-claim.
2. Contradiction sweep within the set and against the resolutions. Two rows answering one question differently is a blocker.
3. Verification honesty: pick at least six rule rows across different files whose verification is runnable (a nix command or eval expression, nixfmt/deadnix/statix/flake-checker, jq over flake.lock, a grep), plant a minimal violating fixture flake and a compliant twin, run the command EXACTLY as written against each, and record red/green and whether the cell's statement of what empty output and each exit code mean is true. A verification that cannot go red is a blocker. Read every other verification cell for shape: explicit directory operand, one -e per alternative, quoted --include globs, no unquoted **, no $(...) or process substitution, no angle-bracket placeholder, xargs -r, no unescaped pipe inside a table cell, POSIX classes in grep -E, an explicit empty-output clause. Shape defects are fix.
4. Fact and era check: sample at least eight version-specific claims (a Nix or nixpkgs version floor, an attribute or builtin name, a lint code, a flag, an error string, a date) and confirm each against the consolidation text; an unsupported or misquoted one is a blocker in a MUST row and a fix otherwise. Extract two or three Nix snippets to files and run nixfmt --check on them, and nix-instantiate --parse (or nix eval) where they claim to evaluate.
5. Portability and style: fleet paths (/home/...), .agents/research links, repo@sha citations in shipped text, owner defaults not marked pinned; em dashes or semicolons in prose (code and tables excepted); missing Contents line over 100 lines; index over 200 lines or a depth file over 300; a depth file linking to another depth file; a hoisted non-negotiable whose ID no depth table defines. Apply the deletion test to the index if it is in your set: name up to five lines whose removal would cause no mistake.
6. ${set.kind === 'skill' ? 'Trigger evals per validation.md: for each skill three should-trigger utterances a real user would type (not the description read back) and one should-not-trigger neighbour; judge the description; name the weakness. Check each skill duplicates the MUST rows it enforces only in a | # | Finding | Rule | table with the ID last. List every cited rule ID no table under ' + ROOT + '/rules defines. Run python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py on each skill directory and report its findings.' : 'Trigger evals do not apply; return an empty list. Confirm the index frontmatter globs against Authoring notes item 1. List every cited rule ID no table under ' + ROOT + '/rules defines. Run python3 ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py --root ' + EX + '/nix-community__disko on the rule file you review (the index checks its whole support dir) and report its findings.'}

Every finding names file and line, a severity (blocker: wrong or unenforceable rule; fix: a defect a mechanical fixer can apply from your fix text; nit: style), a kind, and the exact fix text. A clean file with zero findings is a valid result. Return new_failure_classes empty unless a break genuinely fits none of C1-C25. Verdict: ship, fix-then-ship, or redraft-file.`,
    { label: 'review:' + set.label, phase: 'Review', model: 'opus', effort: 'high', schema: SCHEMA })
}

function sweep(s) {
  return agent(`Model rationale: opus — an adversarial verification pass over real trees; deciding whether a hit is a true or false positive and which failure class a break belongs to is judgment with a blast radius over every shipped check.

${COMMON}
- Your fixture dir (scratch copies, logs): ${FIX}/sweep-${s.label}/
- FAMILIES YOU OWN: ${s.families}
- FILES (read every file in full, and every Verification cell in them): ${s.files.join(' ; ')}

THE HELD-OUT ROUND (Authoring notes item 14 is binding). For EVERY verification cell in your files that is a runnable command:
1. Run it VERBATIM (from the root of each repository, as the cell instructs) over all 38 exemplar repos and all 8 held-out repos; for commands that need evaluation, run them by remote ref at the recorded SHA on a sample of at least 6 repos spanning the shapes (app, library, module, generated, template) plus 2 held-out repos. Where a cell is a grep, run it over every repo. Save raw output under your fixture dir.
2. Classify each hit: true positive, false positive (spot-read the cited line), and look for false negatives (a violation the rule describes that the check missed: grep the repos for the pattern the rule forbids by a second method). A check that fires on idiomatic, correct code is a false-positive-on-real-tree finding (fix text: the narrowed command, watched red on a real violation and green on the false-positive site); a check that misses a real violation is a false-negative-on-real-tree finding.
3. Group every break by failure class C1-C25 from the map. A new instance of a known class becomes a finding with an Applied-row fix text ('add to Applied: <repo> violates <ID> at <path>:<line>'). A break that fits no class goes in new_failure_classes with mechanism, evidence and the catching check.
4. Also run the ocx prototype (${RESEARCH}/nix-generated-flakes/prototype/, copy it into your fixture dir and git init it) against every NIX-GEN cell if you own NIX-GEN, and apply each skill's templates or steps literally to one real repository copy if you own the skills (for nix-flake-adopt: a real small Rust CLI checkout you clone into your fixture dir, e.g. https://github.com/BurntSushi/ripgrep is too large, pick a small one such as https://github.com/sharkdp/hexyl at a pinned SHA; record whether nix build and nix flake check pass).
Record per cell in verifications_exercised: id, went_red (a real or planted violation made it fire), went_green (clean trees stay silent), and a note with repos run, hit counts, TP/FP/FN with repo@sha12:path:line. Return trigger_evals empty. Verdict: ship, fix-then-ship, or redraft-file for the files you own.`,
    { label: 'sweep:' + s.label, phase: 'Sweep', model: 'opus', effort: 'high', schema: SCHEMA })
}

const results = await parallel([
  ...SETS.map(s => () => review(s)),
  ...SWEEPS.map(s => () => sweep(s)),
])
const all = results.filter(Boolean)
const findings = all.flatMap(r => r.findings.map(f => ({ set: r.set, ...f })))
const bySev = sev => findings.filter(f => f.severity === sev).length
const classes = all.flatMap(r => (r.new_failure_classes || []).map(c => r.set + ': ' + c))
log('Review+sweep: ' + all.length + '/' + (SETS.length + SWEEPS.length) + ' · blockers ' + bySev('blocker') + ' · fixes ' + bySev('fix') + ' · nits ' + bySev('nit') + ' · new classes ' + classes.length + ' · verdicts ' + all.map(r => r.set + '=' + r.verdict).join(','))
return { results: all, findings, new_failure_classes: classes }
