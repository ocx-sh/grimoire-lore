export const meta = {
  name: 'cmake-fix-__BATCH__',
  description: 'CMake research program phase 8: one fixer per drafted artifact applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per artifact with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/java'
// FILES = [{ group, files, model, checker_target, findings: [{ file, line, severity, kind, finding, fix }] }]
const FILES = __FILES__

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['group', 'applied', 'refused', 'checker_clean', 'lines_after'],
  properties: {
    group: { type: 'string' },
    applied: { type: 'array', items: { type: 'string' }, description: 'file:line of each finding applied' },
    refused: { type: 'array', items: { type: 'string' }, description: 'line: reason, only when applying the fix would contradict the authoring notes or a consolidation' },
    checker_clean: { type: 'boolean' },
    lines_after: { type: 'array', items: { type: 'string' }, description: 'file: line count, per edited file' },
  },
}

function fix(item) {
  const isOpus = item.model === 'opus'
  return agent(`Model rationale: ${isOpus ? 'opus — at least one finding is a blocker on an enforced rule, so applying it is a judgement about what the rule says' : 'sonnet — mechanical edits from exact fix text a reviewer already decided'}.

PROJECT CONTEXT (context for you, not content to reproduce):
- You are a fixer in phase 8 (Validate) of the research-lang program for CMake and C++ package management, run from ${ROOT} (a git worktree; treat it as the repository root). A reviewer read YOUR FILES against the research consolidations and the binding authoring notes in ${ROOT}/.agents/research/cmake-topic-map.md (section "## Authoring notes (binding on the drafters)") and returned findings with exact fix text. Apply them.
- YOUR FILES (the only files you may edit): ${item.files.join(' ; ')}
- Rules: apply each finding's fix text as written, at the line it names (line numbers are from the reviewed version, so re-locate by content after your first edit). Keep every rule ID stable. Do not rewrite lines the findings do not name. Do not add rules. Where a fix would remove a row, remove the whole row. If a fix would contradict the authoring notes or the consolidation the file cites (read the section it points to before refusing), refuse that one finding with the reason and apply the rest. Prose in this repository avoids em dashes and semicolons outside code and tables; a style finding to that effect is applied by rewording, never by deleting content.
- Where a fix changes a verification command, re-run the command against the reviewer's planted fixtures under /home/mherwig/.cache/cmake-measure-scratch/review/ (or a two-line fixture of your own there) and confirm it goes red on the violation and green on the clean case; CMake binaries: 'ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake' from the repository root. Keep every command in the verification shape: explicit directory operand with -r, --include globs quoted, one -e per alternative, no \\| in a pattern, no unescaped | in a table cell, no <placeholder> in a pattern, no $(...) operands, xargs -r, and an explicit empty-output clause.
- After editing, run: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py ${item.checker_target}  and fix any finding it reports in YOUR FILES (a finding in another file is not yours; report it in refused with the path). Then report each edited file's line count.

FINDINGS TO APPLY (${item.findings.length}):
${item.findings.map((f, i) => `${i + 1}. ${f.file.replace(ROOT + '/', '')}:${f.line} [${f.severity}/${f.kind}] ${f.finding}\n   FIX: ${f.fix}`).join('\n')}`,
    { label: `fix:${item.group}`, phase: 'Fix', model: item.model, effort: isOpus ? 'high' : 'medium', schema: SCHEMA })
}

phase('Fix')
const results = await parallel(FILES.map(item => () => fix(item)))
const ok = results.filter(Boolean)
log(`Fix done: ${ok.length}/${FILES.length} files · applied ${ok.reduce((n, r) => n + r.applied.length, 0)} · refused ${ok.reduce((n, r) => n + r.refused.length, 0)} · unclean ${ok.filter(r => !r.checker_clean).length}`)
return { results: ok }
