export const meta = {
  name: 'nix-fix',
  description: 'Nix research program phase 8: one fixer per drafted file applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per file with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix'
// FILES = [{ file, model, checker_target, findings: [{ line, severity, kind, finding, fix }] }]
const FILES = __FILES__

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'applied', 'refused', 'checker_clean', 'lines_after'],
  properties: {
    file: { type: 'string' },
    applied: { type: 'array', items: { type: 'number' }, description: 'finding line numbers applied' },
    refused: { type: 'array', items: { type: 'string' }, description: 'line: reason, only when applying the fix would contradict the authoring notes or a consolidation' },
    checker_clean: { type: 'boolean' },
    lines_after: { type: 'number' },
  },
}

function fix(item) {
  const isOpus = item.model === 'opus'
  return agent(`Model rationale: ${isOpus ? 'opus — at least one finding is a blocker on an enforced rule, so applying it is a judgement about what the rule says' : 'sonnet — mechanical edits from exact fix text a reviewer already decided'}.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a fixer in phase 8 (Validate) of the research-lang program for Nix, run from ${ROOT} (a git worktree; treat it as the repository root). A reviewer read YOUR FILE against the research consolidations and the binding authoring notes in ${ROOT}/.agents/research/nix-topic-map.md (section "## Authoring notes (binding on the drafters)" and the latest contradiction list) and returned findings with exact fix text. Apply them.
- YOUR FILE (the only file you may edit): ${item.file}
- Rules: apply each finding's fix text as written, at the line it names (line numbers are from the reviewed version, so re-locate by content after your first edit). Keep every rule ID stable. Do not rewrite lines the findings do not name. Do not add rules. Where a fix would remove a row, remove the whole row. If a fix would contradict the authoring notes or the consolidation the file cites (read the section it points to before refusing), refuse that one finding with the reason and apply the rest. Prose in this repository avoids em dashes and semicolons outside code and tables; a style finding to that effect is applied by rewording, never by deleting content. When a fix rewrites a verification command, re-run it red and green on a planted fixture under /home/mherwig/.cache/research-lang/nix-tools/fixtures/fix-<your-file-stem>/ (git init -q and git add -A) through /home/mherwig/.cache/research-lang/nix-tools/run.sh (the only way to run Nix; never nix-portable directly, never gc) before keeping it; if it does not go red, refuse the finding with the observed output. Every Nix fence you touch must stay nixfmt-clean (extract to a scratch file and run run.sh nixfmt --check). An 'add to Applied' finding adds one evidence row to the file's Applied section in the shape that section already uses; shipped text carries no repo@sha, so name the public project and the pattern, not the SHA.
- ${item.checker_target ? '' : 'YOUR FILE is a research artifact (an ADR draft), not a lore artifact: skip the checker below and report checker_clean true. '}After editing, run: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py --forbid /home/mherwig --forbid .agents/research ${item.checker_target}  and fix any finding it reports in YOUR FILE (a finding in another file is not yours; report it in refused with the path). Then report the file's line count.

FINDINGS TO APPLY (${item.findings.length}):
${item.findings.map((f, i) => `${i + 1}. line ${f.line} [${f.severity}/${f.kind}] ${f.finding}\n   FIX: ${f.fix}`).join('\n')}`,
    { label: `fix:${item.file.split('/').slice(-2).join('/')}`, phase: 'Fix', model: item.model, effort: isOpus ? 'high' : 'medium', schema: SCHEMA })
}

phase('Fix')
const results = await parallel(FILES.map(item => () => fix(item)))
const ok = results.filter(Boolean)
log(`Fix done: ${ok.length}/${FILES.length} files · applied ${ok.reduce((n, r) => n + r.applied.length, 0)} · refused ${ok.reduce((n, r) => n + r.refused.length, 0)} · unclean ${ok.filter(r => !r.checker_clean).length}`)
return { results: ok }
