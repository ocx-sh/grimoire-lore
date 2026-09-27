export const meta = {
  name: 'code-docs-eval-rules-fixture',
  description: 'Apply the frozen cleanup procedure v0 to the 25 pooled eval comment spans, blind to ground truth, producing the rules-arm fixture',
  phases: [{ title: 'Rewrite', detail: 'three opus agents, one per batch of sites' }],
}

const H = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/.agents/research/code-docs-eval/harness'
const BATCHES = [
  { key: 'ocx', ids: 'OCX-02, OCX-06, OCX-07, OCX-09, OCX-13, OCX-14, OCX-17, OCX-19, OCX-20, OCX-21, OCX-23' },
  { key: 'grm-ts', ids: 'GRM-01, GRM-03, GRM-04, GRM-05, GRM-06, TS-03, TS-04, TS-05, TS-06, TS-07' },
  { key: 'py', ids: 'PY-01, PY-05, PY-06, PY-07' },
]

const PROMPT = (b) => `Model rationale: opus — rewriting load-bearing comments under a procedure is non-mechanical judgment; this output is frozen as an eval arm.

You are a coding agent asked to clean up comments. Apply the procedure in ${H}/fixtures/procedure-v0.md EXACTLY — read it first, in full. It is the only rule text you follow.

Your blocks: the entries with ids ${b.ids} in ${H}/fixtures/rewrite-input.json. Each entry gives repo, file, lang, package_kind, the 1-based comment_start and comment_end of ONE comment block, the block's lines (span) and 40 lines of context on each side. You may read the full source file at /home/mherwig/dev/<repo>/<file> and other files in that repository (read-only) to understand the code, as a real cleanup agent would.

FORBIDDEN: do not open anything under /home/mherwig/dev/grimoire-lore/ other than the two files named above (the research directory holds material that would bias you), and do not modify any repository.

For each block, produce the replacement lines: exactly as they will sit in the file, same indentation, valid comment syntax for the language (a Python docstring must stay a valid string statement or become # comments; a Rust doc block may become // comments when the procedure says so). The replacement must not change, add or remove any code line. Return an empty list only when the procedure drops every clause.

Write ${H}/fixtures/rules-${b.key}.json as a JSON object: { "<id>": { "rules": [ "<line>", ... ], "tags": "<one line: which clauses you kept as guard/contract/why/pointer and what you dropped>" } }. Validate it parses (python3 -c "import json; json.load(open(PATH))"). Return the path and, per id, the original and new line counts.`

const SCHEMA = { type: 'object', properties: { path: { type: 'string' }, counts: { type: 'array', items: { type: 'string' } } }, required: ['path', 'counts'] }

phase('Rewrite')
const res = await parallel(BATCHES.map((b) => () => agent(PROMPT(b), { label: 'rewrite:' + b.key, phase: 'Rewrite', schema: SCHEMA, model: 'opus' })))
return res
