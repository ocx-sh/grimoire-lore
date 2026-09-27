export const meta = {
  name: 'code-docs-checks-implement',
  description: 'Implement the code-docs shipped checks: census caps and ratchet, linkage check, cleanup diff check, interface-leak scanner',
  phases: [{ title: 'Implement', detail: 'four opus implementers, disjoint files' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs'
const R = ROOT + '/.agents/research'
const C = ROOT + '/rules/code-docs/checks'
const SCRATCH = '/home/mherwig/.cache/research-lang/code-docs-scratch'

const COMMON = `Model rationale: opus — multi-file check implementation with exit-code and diff semantics that become merge gates; correctness-critical.

CONTEXT (context for you, not content to reproduce):
- Lore catalog worktree ${ROOT} (treat as repo root; never cd to /home/mherwig/dev/grimoire-lore). You implement one runnable check for the new 'code-docs' rule set: shorter, better code comments for agent-written code without losing guards. The rules are decided in the consolidations under ${R}/ (code-docs-ratchet.md LEN-*, code-docs-linkage.md LNK-*, code-docs-cleanup.md CLN-*, code-docs-guards.md GRD-*, code-docs-surfaces.md SRF-*). Read the ones your brief names IN FULL before writing code; they hold the exact rule text, thresholds, token sets and verification expectations, and the dive files beside them hold prototype code worth reusing.
- The shared classifier is ${C}/comment_census.py (classify, blocks_of, EXT_LANG, list_files, scope_of, Line kinds code/doc/line/interface/license/directive/blank, Line.test). Import it with sys.path.insert(0, str(Path(__file__).resolve().parent)). Only the census implementer may edit it; everyone else treats its public API as fixed.
- House conventions for checks (copy the shape of ${ROOT}/rules/docs-quality/checks/doc_declaration.py): stdlib only, Python >= 3.11 (no 3.12+ syntax), module docstring listing the rule IDs covered, usage and exit codes (0 clean, 1 findings, 2 usage or missing input), --root, --format text|json, and a --self-test mode that runs planted fixtures (red) and compliant twins (green) from ${C}/fixtures/<script-stem>/ and prints 'self-test: ok'. Findings print as path:line: RULE-ID message. Portable: no fleet paths, no user home paths inside the script.
- Gate before you finish: ocx exec ruff -- ruff check FILE and ocx exec ruff -- ruff format --check FILE (the repo's ruff.toml applies; fix every finding), python3 FILE --self-test, and a run on at least two real fleet repos (/home/mherwig/dev/ocx and /home/mherwig/dev/grimoire, plus one Python or TS repo where relevant) with the numbers reported in your receipt. Never modify a fleet repo; for anything that needs a git history or a diff, work in a clone under ${SCRATCH}/<your-slug>/ (git clone --no-local), and use /usr/bin/git because the default git is wrapped by an output filter.
- Write only your own files (listed in the brief). Return the structured receipt.`

const JOBS = [
  { key: 'census', brief: `YOUR FILES: ${C}/comment_census.py (extend it) and ${C}/fixtures/comment_census/ (new).
Read ${R}/code-docs-ratchet.md and ${R}/code-docs-ratchet/length-and-ratchet.md and ${R}/code-docs-ratchet/doc-cap-calibration.md in full.
Keep the existing CLI and public functions working (classify, blocks_of, EXT_LANG, list_files, scope_of, census, the --sample and --list-blocks modes); other scripts import them and an eval harness depends on classify.
Add:
1. Block definition per the ratchet verdict: a block is consecutive comment lines of one kind with only blank lines between them (a new function or a flag on blocks_of; keep the old behaviour available for the eval harness). Interface lines form blocks too (LEN-08).
2. Caps (LEN-01, LEN-02 as revised, LEN-07, LEN-08): plain block at most 5 lines; doc block at most 10, or 15 for a PUBLIC item in a LIBRARY-kind package (public: Rust pub but not pub(crate)/pub(super); Python name without a leading underscore; TS/JS export; Go capitalised identifier; Java/Kotlin public), measured after removing the structured sections LEN-07 names (only the ones it keeps out of the count), interface blocks counted against the doc cap. Library-kind packages are declared in a config (a small TOML or JSON the adopter commits, for example .code-docs.json with library package paths and cap overrides); undeclared means app.
3. Ratchet (LEN-03): --check BASELINE fails (exit 1) when any file's count of prod comment lines in over-cap blocks rises above its baseline entry (absent key counts as 0) and prints each offending block; --update BASELINE writes the current counts (per file, rolled up per package in the report). Deterministic, sorted JSON.
4. A --report mode that prints per package: ratio, char ratio, lines in over-cap blocks, and the human reference bands from ${R}/code-docs-audit/reference-corpus.md as context (apps 0.12 median, libraries 0.27; state that no ratio is a target, LEN-04).
5. Self-test fixtures per language (Rust, Python, TS, Go) for the new block definition, each cap, public vs private, structured-section exclusion, interface blocks and the ratchet rise/no-rise cases.
Report: baseline totals for ocx, grimoire and ocx-sdk-python (lines in over-cap blocks, per package top 5).` },
  { key: 'linkage', brief: `YOUR FILES: ${C}/linkage_check.py and ${C}/fixtures/linkage_check/.
Read ${R}/code-docs-linkage.md (revised) in full, then ${R}/code-docs-linkage/plan-ids-fleet.md (it holds a verified classify_hit() module and fixture to reuse), plan-ids.md, pointer-form-and-check.md and record-to-code-rot.md, and ${R}/code-docs-ratchet/gate-replays.md (the LNK-06 per-citation fix).
Implement subcommands:
1. ids (LNK-01, LNK-13, LNK-14): scan comment text only (via the census classifier) for the ten prefixed process-ID families with the revised exclusions; short labels reported separately as advisory; --discover lists un-catalogued local prefixes over a threshold for a human verdict; --check BASELINE / --update BASELINE per-file ratchet keyed FILE::bare-id-prod and FILE::bare-id-test (and FILE::short-label).
2. pointers (LNK-02, LNK-03, LNK-07): find record pointers in comments ([repo:]path.md[#anchor] and the forms the consolidation names), and fail when the file is not tracked (git ls-files) or the anchor is not a unique hyphen-boundary prefix of one heading; strip rustdoc intra-doc links and identifiers first (the 43 percent false-positive trap).
3. records (LNK-06 as revised): for a diff --base REF, every deleted or renamed path cited by a decision record or a path-scoped rule (paths configurable, defaulting to common record dirs and .claude/rules) must have each citation line updated (drop the old path or also name the new one) in the same diff. Per-citation, not whole-file.
Report: counts on ocx, grimoire, arcana and ocx-indexbot for ids and pointers, and the LNK-06 result replayed on the ocx crate-split commit b79abbe8d3 in a scratch clone.` },
  { key: 'cleanup', brief: `YOUR FILES: ${C}/cleanup_check.py, ${C}/guard_recogniser.py and ${C}/fixtures/cleanup_check/.
Read ${R}/code-docs-cleanup.md (revised) in full, then ${R}/code-docs-guards.md (the seven-rule lexical recogniser table and GRD-06's limits), ${R}/code-docs-guards/guard-shape.md, ${R}/code-docs-ratchet/gate-replays.md (the reconstructed recogniser and the whole-diff SequenceMatcher pairing fix) and ${R}/code-docs-cleanup/cleanup-procedure.md.
Implement:
1. guard_recogniser.py: the seven-rule lexical recogniser as a small importable module with its own --self-test pinned to its measured numbers on a committed fixture (GRD-06: it is a carve-out, never a gate).
2. cleanup_check.py --base REF [--relocation PATH ...]: the diff-time safety check for a comment-cleanup change. Blocking sub-checks: CLN-03 (every non-prose line byte-identical as an ordered sequence per file: code, interface, directive, licence, fenced code inside doc comments), CLN-04 (removed non-guard text does not survive at 80 percent or more token overlap elsewhere in the file's comments; a claimed relocation target contains it; derived from the diff, never from a manifest), CLN-05 (no test file, in-file test region, lock or manifest file, generated or golden file, or non-source path other than a declared append-only relocation record), CLN-01 carve-out (a whole removed block whose pre-image fires the recogniser needs a replacement in the same diff: a surviving clause, a pointer, a named test or a lint form; pair removed and added blocks across the whole diff with SequenceMatcher). Advisory (review list, exit 0): CLN-02 re-fire loss on shortened blocks.
3. Fixtures reproducing the three edits the consolidation says an earlier prototype let through (a clap help edit, a deleted ts-expect-error directive, a deleted doctest) plus a Guard-and-Go pointer-beside-essay case, each red, with green twins.
Report: run it on 3 real cleanup-shaped diffs you make in a scratch clone of ocx (shorten an essay correctly; delete a guard; edit a code line inside a comment-only commit) and show red/green.` },
  { key: 'surfaces', brief: `YOUR FILES: ${C}/interface_leak.py and ${C}/fixtures/interface_leak/.
Read ${R}/code-docs-surfaces.md (revised) in full, then ${R}/code-docs-surfaces/interface-check.md and interface-leak.md.
Implement one scanner with two modes:
1. output mode (SRF-03, the gate): read rendered interface text (files or stdin: --help output, JSON Schema files where it walks every description/title string with its JSON pointer, MCP tool list JSON, generated API docs text) and report every SRF-01 token hit with its location; exit 1 on any hit; an allow-list file for reviewed exceptions. The token set is the revised SRF-01 set (17 families in 18 patterns, the Windows SID exclusion, no short2char, the guarded .rs patterns), kept in one constant that other tools can import.
2. source mode (the cheaper complement): scan the census interface lines plus the attribute and string-literal surfaces the consolidation names (clap about/long_about/help attributes, schemars description attributes, rmcp tool descriptions, commander .description() calls, argparse help=, click/typer help=) in a source tree, advisory by default.
3. Document in the module docstring the per-generator test shapes the consolidation specifies (what each walks, what it asserts), with one tiny copy-paste example per language (Rust, Python, TS) that calls this scanner.
Report: output-mode hits on ocx's committed golden schemas (crates/ocx_schema/tests/golden, read-only) and on captured --help text if the ocx and grim binaries are on PATH (bound each run with timeout 10), plus source-mode hits on ocx, grimoire, ocx-catalog and ocx-sdk-python.` },
]

const SCHEMA = {
  type: 'object',
  properties: { files: { type: 'array', items: { type: 'string' } }, gates: { type: 'array', items: { type: 'string' } }, numbers: { type: 'array', items: { type: 'string' } }, gaps: { type: 'array', items: { type: 'string' } } },
  required: ['files', 'gates', 'numbers', 'gaps'],
}

phase('Implement')
const res = await parallel(JOBS.map((j) => () => agent(COMMON + '\n\nYOUR BRIEF (' + j.key + '):\n' + j.brief, { label: 'impl:' + j.key, phase: 'Implement', schema: SCHEMA, model: 'opus' })))
const out = {}
JOBS.forEach((j, i) => { out[j.key] = res[i] })
return out
