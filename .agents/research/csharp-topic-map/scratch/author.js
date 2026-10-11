export const meta = {
  name: 'csharp-author',
  description: 'C# research-lang phase 7: opus authoring notes + file plan, sonnet drafters per artifact file, opus cross-file consistency pass',
  phases: [
    { title: 'Plan', detail: 'opus binding authoring notes', model: 'opus' },
    { title: 'Draft', detail: 'one sonnet drafter per file' },
    { title: 'Integrate', detail: 'opus consistency + checker pass', model: 'opus' },
  ],
}

const WT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp'
const R = WT + '/.agents/research'
const GROUPS = ['csharp-process', 'csharp-async', 'csharp-api', 'csharp-json', 'csharp-build', 'csharp-packaging', 'csharp-crossplatform', 'csharp-language', 'csharp-observability', 'csharp-security', 'csharp-testing', 'csharp-performance', 'csharp-procedures']

const FILE_SCHEMA = {
  type: 'object',
  properties: {
    checker_command: { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          kind: { type: 'string', enum: ['rule-index', 'rule-depth', 'skill', 'skill-reference', 'check-script', 'adr', 'wiring'] },
          family: { type: 'string' },
          brief: { type: 'string' },
          wave: { type: 'number' },
        },
        required: ['path', 'kind', 'brief', 'wave'],
      },
    },
    owner_defaults: { type: 'array', items: { type: 'string' } },
  },
  required: ['checker_command', 'files', 'owner_defaults'],
}

phase('Plan')
const plan = await agent(
  'Model rationale: opus - authoring notes resolve cross-group conflicts and decide what ships as an enforced rule.\n\n' +
  'You are the AUTHOR-PLANNER for phase 7 of the research-lang C# / .NET program in the grimoire-lore repo, worktree ' + WT + ' (branch csharp). Date ' + args.date + '.\n\n' +
  'Read first: ' + WT + '/.claude/skills/research-lang/references/rule-distillation.md and validation.md (both in full), ' + WT + '/.claude/skills/research-lang/scripts/check-artifacts.py (its --help and header), the Swift precedent: the "## Authoring notes (binding on the drafters)" section of ' + WT + '/.agents/research/swift-topic-map.md (shape only), ' + WT + '/rules/swift-quality.md (index shape), one depth file head (rules/swift-quality/concurrency.md first 60 lines), skills/swift-release/SKILL.md first 80 lines, bundles/swift-essentials.toml, the swift entries of publish.toml, docs/swift-quality.md and docs/swift-essentials.md, the swift step in taskfile.yml. Then read IN FULL ' + R + '/csharp-frame.md, ' + R + '/csharp-topic-map.md, and every consolidation: ' + GROUPS.map(g => R + '/' + g + '.md').join(', ') + '.\n\n' +
  'DECISIONS YOU MUST MAKE AND RECORD:\n' +
  '1. PORTABILITY SPLIT. These artifacts publish to any repo writing C#. Rules tagged [ocx] or naming OcxClient/ocx paths are instances, not mechanisms. Keep the mechanism in the published rules (e.g. a depth file for wrapping an external CLI from .NET: resolver, argv, streams, encoding, cancellation/kill, exit-code mapping, env scrub, fake-CLI harness, binary acquisition and verification) with ocx as at most an example; move ocx-only design (exit table numbers, command layout, Ocx.Sdk naming, the behaviour-table path, OCX_* env names, contract handshake, delivery model) into an ADR draft at ' + R + '/csharp-ocx-sdk/adr_ocx_csharp_sdk.md (Status Proposed, for the ocx-sh/ocx maintainers; precedent: .agents/research/nix-generated-flakes/adr_nix_flake_generation.md).\n' +
  '2. ARTIFACT SET: rule names, exact globs (no brace globs; no glob narrower than a structural filename; check liveness against the exemplars under ~/.cache/research-lang/exemplars/csharp), index vs depth files with one rule-ID family per file forever, the dotnet-build rule (glob on *.csproj, Directory.Build.props/targets, Directory.Packages.props, global.json, nuget.config, .editorconfig? decide and justify), skills dotnet-upgrade / dotnet-diagnose / dotnet-release (with references/ dirs), check scripts under rules/<rule>/checks/ (BannedSymbols fragment, rg gates, etc.), bundle dotnet-essentials (untagged members, plus code-docs and code-docs-cleanup like the Swift bundle), publish.toml entries at 0.1.0, docs/ pages, assets/lore-dotnet.svg (or reuse a sensible existing pattern), taskfile CSHARP_CONSUMER step mirroring the swift step.\n' +
  '3. FUNNEL: ~360 consolidated rules -> ship the ones an agent gets wrong without being told, are checkable, change a diff, and do not contradict siblings. Keep the index under 200 lines with a non-negotiables list of at most 25 lines ending in rule IDs, a gate block, a routing table keyed by task words. Resolve every cross-group conflict explicitly (known: CS-LANG-05 sets CA1062 to warning, reversing CS-BUILD-12; the Encoding.Default banned message; any duplicate BannedSymbols entries across process/security/language/performance; analyzer choices like Meziantou adoption). Rule IDs keep their consolidation IDs (stable; never renumber); the index may own a new CS-CORE family for cross-cutting agent behaviour (never weaken a gate, watch it red, etc.) if the consolidations support it.\n' +
  '4. OWNER DEFAULTS: the owner has NOT answered: consumer reach (ns2.0?), net8 floor vs net10-only, ocx binary delivery, contract baseline, NuGet identity/signing, plus per-group owner questions. Apply the consolidations\' recommended default for each, state each as a default the adopter may override, and list them.\n' +
  '5. EVERY published file is free of /home/, .cache/research-lang, and .agents/research paths (the checker --forbid enforces it). Verification commands are real shell (directory operands, no <placeholder>, xargs -r, -e alternatives) and every check that can run must be watched red/green by the drafter on ~/.cache/research-lang/dotnet-tools/fixtures/author-<slug>/ with run.sh.\n\n' +
  'Write the notes as a new section "## Authoring notes (binding on the drafters)" appended to ' + R + '/csharp-topic-map.md (N-1..N-k, like Swift). Write nothing else.\n\n' +
  'Return: checker_command (the exact check-artifacts.py invocation over the whole set, with --root at a suitable exemplar and --allow-absent/--forbid flags), owner_defaults, and files: every file to author, each with path (repo-relative), kind, family (ID prefix it owns, if any), wave (1 = can be drafted independently now; 2 = needs wave-1 files to exist first, e.g. the rule index that routes to depth files, the skills that cite rule IDs, docs pages, bundle/publish/taskfile wiring - make wiring ONE file entry of kind wiring covering publish.toml, bundle, docs pages, svg, taskfile, README if it lists sets), and a 10-25 line brief telling the drafter exactly which consolidation sections and rule IDs to draw from, which N-notes bind it, size budget, and what to verify. Aim for 14-22 files.',
  { label: 'author-plan', phase: 'Plan', schema: FILE_SCHEMA, model: 'opus' })

log('plan: ' + plan.files.length + ' files; wave1 ' + plan.files.filter(f => f.wave === 1).length)

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    paths: { type: 'array', items: { type: 'string' } },
    rule_ids: { type: 'number' },
    checker_clean: { type: 'boolean' },
    red_green_watched: { type: 'number' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['paths', 'checker_clean', 'issues'],
}

const draft = (f) => agent(
  'Model rationale: sonnet - drafting an artifact from decided consolidations under binding notes.\n\n' +
  'You are a DRAFTER in phase 7 of the research-lang C# / .NET program. Repo worktree ' + WT + ' (branch csharp). Work ONLY in that worktree; do not commit. Date ' + args.date + '.\n\n' +
  'Read first: the "## Authoring notes (binding on the drafters)" section of ' + R + '/csharp-topic-map.md (binding: where a note and a consolidation disagree, the note wins), ' + WT + '/.claude/skills/research-lang/references/rule-distillation.md, and the consolidations your brief names (in full). Match house voice by reading the Swift sibling file of the same kind in ' + WT + '.\n\n' +
  'YOUR FILE: ' + f.path + ' (kind ' + f.kind + (f.family ? ', owns family ' + f.family : '') + ')\nBRIEF:\n' + f.brief + '\n\n' +
  'Hard requirements: every rule is a table row whose first cell is its ID, with a filled Verification column; IDs keep their consolidation numbers; no hedging; date version-specific claims; no /home/, .cache/research-lang or .agents/research paths in the published file; verification commands are real shell. Watch each runnable check go red on a planted fixture and green on its twin under ~/.cache/research-lang/dotnet-tools/fixtures/author-' + (f.family || f.kind) + '/ using ~/.cache/research-lang/dotnet-tools/run.sh. Then run the checker on your file(s): ' + plan.checker_command.replace(/\s+(rules|skills)\/\S+/g, '') + ' ' + f.path + ' and fix until clean (report anything you cannot fix). Write only your file(s) (a skill dir may include its references/; a check-script entry may include several scripts in its checks/ dir).\n' +
  'Return: paths written, rule-ID row count, checker_clean, red/green checks watched, issues for the integrator.',
  { label: 'draft:' + f.path.split('/').slice(-2).join('/'), phase: 'Draft', schema: DRAFT_SCHEMA, model: 'sonnet' })

phase('Draft')
const w1 = await parallel(plan.files.filter(f => f.wave === 1).map(f => () => draft(f)))
const w2 = await parallel(plan.files.filter(f => f.wave !== 1).map(f => () => draft(f)))
const drafts = [...w1, ...w2].filter(Boolean)
log('drafted ' + drafts.length + '/' + plan.files.length + '; checker-clean ' + drafts.filter(d => d.checker_clean).length)

phase('Integrate')
const integ = await agent(
  'Model rationale: opus - cross-file consistency decides contradictions between enforced rules.\n\n' +
  'You are the INTEGRATOR for phase 7 of the C# / .NET program. Worktree ' + WT + ' (branch csharp); do not commit. Read the "## Authoring notes (binding on the drafters)" in ' + R + '/csharp-topic-map.md, then every authored file: ' + drafts.flatMap(d => d.paths).join(', ') + '. Drafter issues to resolve:\n' + drafts.flatMap(d => d.issues).map(i => '- ' + i).join('\n') + '\n\n' +
  'Fix in place: (1) every cited rule ID is defined exactly once and routed by the index; (2) no two rules contradict (same subject, different instruction) - resolve per the notes; (3) bounded duplication only (index non-negotiable lines, gate block copy, skill tables); (4) the index is under 200 lines and its routing table covers every family; (5) skills cite rule IDs that exist; (6) wiring is complete: publish.toml entries, bundle members untagged, docs pages, taskfile step, svg. Then run the full checker: ' + plan.checker_command + ' and the repo gates the Swift program ran (look at taskfile.yml for the ci/artifacts tasks; run what does not need network writes, e.g. task artifacts with CSHARP_CONSUMER set to a suitable exemplar under ~/.cache/research-lang/exemplars/csharp, ruff format --check .). Fix until clean. Record what you changed as "## Integration log" appended to the authoring notes.\n' +
  'Return a receipt: checker result line, gates run with exit codes, contradictions resolved, remaining issues.',
  { label: 'integrate', phase: 'Integrate', model: 'opus' })

return { files: plan.files.map(f => ({ path: f.path, kind: f.kind, family: f.family, wave: f.wave })), owner_defaults: plan.owner_defaults, checker: plan.checker_command, drafts, integ }
