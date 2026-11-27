export const meta = {
  name: 'product-author-validate',
  description: 'research-lang phase 7 for the UX and marketing program: author each unit of the authoring plan, review it against its consolidations, repair once, then integrate',
  phases: [
    { title: 'Author', detail: 'sonnet (high effort): one worker per authoring unit', model: 'sonnet' },
    { title: 'Review', detail: 'sonnet: read-only check against the consolidations and the validator, then one repair', model: 'sonnet' },
    { title: 'Integrate', detail: 'sonnet: publish.toml, bundles, docs companions, taskfile, cross-edits', model: 'sonnet' },
  ],
}

// args: { today, units: <product-resume/authoring-units.json> }
const W = '/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product'
const R = `${W}/.agents/research`
const C = `${W}/.claude/skills/research-lang`
const PLAN = `${R}/product-authoring-plan.md`
const TODAY = args.today

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- ${W} is a catalog of published AI-agent configuration: rules/<name>.md, skills/<name>/SKILL.md with depth files, bundles/*.toml, publish.toml, docs/<name>.md. Other teams install these artifacts; an agent then follows them without a human in the loop.
- A research program produced 23 consolidated rulesets under ${R}/ (ux-*.md, marketing-*.md, channel-*.md). The authoring plan ${PLAN} decided which artifacts ship and what each contains. The plan is decided: implement it, do not redesign it. If the plan is wrong on a point, implement the nearest correct thing and say so in your receipt.
- Today is ${TODAY}.

HARD LIMITS:
- Write only the files your unit owns (listed below), inside ${W}. Everything else is read-only.
- No git command that changes state.
- Published files (anything under rules/, skills/, bundles/, docs/) must be self-contained: they never mention /home/mherwig, .agents/research, this fleet's repository names, the research program, waves or workers. A reader of the published file has none of that.
- Never invent or "improve" a fact. Every platform limit, law, policy, statistic and date comes from the consolidation, with the source URL and date it carries there. If the consolidation marks a fact unverified, it ships marked unverified or not at all.
- RULE IDS ARE A CONTRACT: a rule keeps the ID, the severity and the verification it has in its consolidation. Do not renumber, merge or silently drop a MUST rule the plan assigns to your unit.
- Published prose is plain, complete English: short sentences, active voice, imperative for instructions. No filler, no marketing tone.
- For file searches inside checks you run, call /usr/bin/grep directly (a shell hook rewrites bare grep and can hide matches).`

const unitBlock = u => `YOUR UNIT: ${u.id}
Artifacts: ${u.artifacts.join(', ')}
Files you may write (paths relative to ${W}; a trailing slash means the directory): ${u.files.join(', ')}
Plan section that specifies it: "${u.spec}" in ${PLAN}
Source consolidations (read each in full): ${(u.sources || []).map(s => `${R}/${s}.md`).join(', ') || 'none; see the plan section'}
Rule families: ${(u.idFamilies || []).join(', ') || 'none'}`

const AUTHOR_SCHEMA = {
  type: 'object',
  properties: {
    written: { type: 'array', items: { type: 'string' } },
    rulesShipped: { type: 'integer' },
    mustShipped: { type: 'integer' },
    droppedMust: { type: 'array', items: { type: 'string' }, description: 'MUST rule IDs the plan assigned to this unit that did not ship, each with the reason' },
    planDeviations: { type: 'array', items: { type: 'string' } },
    validator: { type: 'string', description: 'the validator command run and its exit code' },
  },
  required: ['written', 'rulesShipped', 'mustShipped', 'droppedMust', 'planDeviations', 'validator'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    blocking: { type: 'array', items: { type: 'string' }, description: 'one line each: file:line, what is wrong, what correct looks like' },
    nits: { type: 'array', items: { type: 'string' } },
  },
  required: ['ok', 'blocking', 'nits'],
}

const authorPrompt = u => `Model rationale: sonnet, implementation of a decided authoring spec from a decided ruleset.

${CONTEXT}

${unitBlock(u)}

You are AUTHORING this unit. Before writing, read in full:
1. The plan: "Decisions", "Where every ID family goes", "Known duplicate rows", "Authoring contract for every unit" (binding on you), the collision table, your unit's section, and every artifact spec that section names (for a platform skill also "Platform skills: shared shape").
2. ${C}/references/rule-distillation.md and ${C}/references/validation.md.
3. The ai-config-authoring and grim-authoring skills (under ${W}/.claude/skills/ or ${W}/skills/).
4. The pattern set, and copy its shape exactly (frontmatter keys, heading order, table columns, how a rule row carries its ID, severity and verification, how the rule links to its reference skill, how a SKILL.md routes to its depth files): ${W}/rules/go-quality.md, ${W}/skills/go-quality-reference/, and one procedural skill the plan names as the pattern (or ${W}/skills/docs-review/ if present).
5. Every source consolidation, in full.

Then write the unit's files.
- Budgets are hard: a rule body under 200 lines; a SKILL.md body under 500 lines; a table of contents in any file over 100 lines. Depth goes into the reference files the plan names, one level deep.
- Keep only guidance an agent gets wrong without being told. A rule's row is: ID, the imperative, the verification. Rationale and examples go to the depth file.
- A skill is a procedure an agent can run literally: numbered steps, each with its input, its command or check, and what "done" looks like. A platform skill keeps every dated fact in the one dated-facts file the plan names, with source URL, source date and the refresh cadence; SKILL.md refers to it and never repeats a limit.
- A shipped script, if the plan assigns one, is small, has no dependency beyond the standard library, has a --help, exits non-zero on a finding, and carries a self-test or assert-based check.
- The consolidations were revised after the plan was written. A rule ID that is in a source consolidation but not in the plan is yours to place when its family belongs to your unit: put it where the plan puts that family's neighbouring rows of the same severity, and name it in planDeviations. A MUST rule never goes unplaced.
- Cross-references to other new artifacts use the names in the plan, even though other workers are writing those files right now.
When done, run the catalog validator on what you wrote, as ${C}/references/validation.md specifies (python3 ${C}/scripts/check-artifacts.py --forbid '/home/mherwig' --forbid '.agents/research' <your rule and skill paths>), count body lines, and fix every finding in your own files. Return the receipt.`

const reviewPrompt = (u, a) => `Model rationale: sonnet, read-only review of authored configuration against its source ruleset.

${CONTEXT}

${unitBlock(u)}

You are REVIEWING this unit. You change nothing. The author reported: wrote ${a.written.join(', ')}; dropped MUST rules: ${a.droppedMust.join(' | ') || 'none'}; plan deviations: ${a.planDeviations.join(' | ') || 'none'}.
Read the unit's plan section, every file the author wrote, and the source consolidations. Report as BLOCKING, one line each with file:line:
- a MUST rule the plan assigns to this unit that is absent, renumbered, weakened in severity, or shipped without its verification (compare ID by ID; list every miss);
- a rule or fact whose published text contradicts its consolidation, or a platform limit, law, statistic or date with no source URL and date, or one not present in the consolidation at all (check every dated fact in a dated-facts file; sample at least 20 rule rows otherwise);
- a budget overrun (count body lines yourself: rule body under 200, SKILL.md body under 500, table of contents in a file over 100 lines);
- any mention of /home/mherwig, .agents/research, the research program, waves, workers, or this fleet's repository names in a published file (run /usr/bin/grep -rn);
- frontmatter that differs in shape from ${W}/rules/go-quality.md or ${W}/skills/go-quality-reference/SKILL.md; a skill description that does not say when to use it; a paths glob that differs from the plan;
- a relative link that resolves to no file among this unit's files or the plan's artifact list;
- a skill step an agent could not execute literally (no command, no check, no stated done condition), or a shipped script that fails its own self-test or --help (run it);
- a non-zero exit of: python3 ${C}/scripts/check-artifacts.py --forbid '/home/mherwig' --forbid '.agents/research' <the unit's rule and skill paths> (run it; quote the findings that concern this unit's files).
- any breach of the plan's "Authoring contract for every unit".
A file or check script that another unit owns and that is not on disk yet is NOT a finding: other units are still writing. Everything else is a nit. ok=true only with zero blocking lines.`

const repairPrompt = (u, rv) => `${authorPrompt(u)}

THIS IS A REPAIR PASS. The files exist. Keep what is sound and fix exactly these blocking findings, by doing the work (re-reading the consolidation, restoring the rule, moving depth out of an over-budget file), not by rewording around the check:
- ${rv.blocking.join('\n- ')}`

const units = args.units.filter(u => u.order !== 2)
const integration = args.units.filter(u => u.order === 2)

const authored = await pipeline(
  units,
  u => agent(authorPrompt(u), { label: `author:${u.id}`, phase: 'Author', model: 'sonnet', effort: 'high', schema: AUTHOR_SCHEMA }),
  async (a, u) => {
    if (!a) throw new Error(`${u.id}: author died`)
    let rv = await agent(reviewPrompt(u, a), { label: `review:${u.id}`, phase: 'Review', model: 'sonnet', schema: REVIEW_SCHEMA })
    let repaired = false
    if (rv && !rv.ok) {
      const again = await agent(repairPrompt(u, rv), { label: `repair:${u.id}`, phase: 'Review', model: 'sonnet', effort: 'high', schema: AUTHOR_SCHEMA })
      if (again) {
        a = again
        repaired = true
        rv = await agent(reviewPrompt(u, a), { label: `re-review:${u.id}`, phase: 'Review', model: 'sonnet', schema: REVIEW_SCHEMA })
      }
    }
    return { id: u.id, ...a, repaired, ok: !!(rv && rv.ok), blocking: rv ? rv.blocking : ['review died'], nits: rv ? rv.nits : [] }
  },
)

const done = authored.filter(Boolean)
const failed = units.filter((u, i) => !authored[i]).map(u => u.id)
if (failed.length) log(`units that did not finish: ${failed.join(', ')}`)

const integrated = []
for (const u of integration) {
  const a = await agent(`Model rationale: sonnet, mechanical integration of authored artifacts into the catalog's shared files.

${CONTEXT}

${unitBlock(u)}

You are the INTEGRATION worker. Every order-1 unit in ${R}/product-resume/authoring-units.json has been written, some in an earlier run; confirm each artifact on disk before you list it anywhere.${failed.length ? ` These units did NOT finish and their artifacts must be left out of every shared file: ${failed.join(', ')}.` : ''}
Read the plan's sections on bundles, publish.toml, docs companions, the taskfile step and the collision table, then the existing shapes: ${W}/publish.toml, ${W}/bundles/go-essentials.toml, ${W}/docs/go-quality.md, the artifacts task in ${W}/taskfile.yml.
Do exactly what the plan specifies for the shared files, copying the existing shape entry for entry: publish.toml entries for every new artifact that exists on disk, the bundle files, one docs/<name>.md companion per new artifact (description claims must match what the artifact actually contains: open it), the taskfile step, and each cross-edit to an existing rule or skill that the collision table lists (smallest edit that states the routing; bump that artifact's version in publish.toml the way the catalog does for a changed artifact).
ONE OVERRIDE of the plan's taskfile section: the facts staleness step (facts_check.py over skills/*/references/facts.md) does NOT go into the `artifacts` task, because `task ci` runs `artifacts` and a date must never turn the catalog's CI red for an unrelated change. Put it in its own task `facts:stale` with a one-line desc, outside `ci` and `verify`. The structural half of that check, if facts_check.py offers one that does not depend on today's date, may stay in `artifacts`.
A reviewer note to act on: fixture trees under skills/*/checks/fixtures/ contain files named Cargo.toml, package.json, pyproject.toml and workflow YAML; make sure no step you add globs them as real project files.
Then, from ${W}, run: python3 ${C}/scripts/check-artifacts.py --forbid '/home/mherwig' --forbid '.agents/research' over every new rule and skill, and report each finding. Do not run anything that publishes.
Return the receipt; "rulesShipped" and "mustShipped" are 0 for this unit.`, { label: `integrate:${u.id}`, phase: 'Integrate', model: 'sonnet', effort: 'high', schema: AUTHOR_SCHEMA })
  if (a) integrated.push({ id: u.id, ...a })
  else log(`integration unit ${u.id} died`)
}

return { units: done, failed, integrated }
