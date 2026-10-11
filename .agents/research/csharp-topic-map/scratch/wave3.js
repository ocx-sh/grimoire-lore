export const meta = {
  name: 'csharp-wave3-remap-dive',
  description: 'C# research-lang phase 6: opus remap of deferred backlog + wave-2 follow-ups, then dive/consolidate/revise pipeline',
  phases: [
    { title: 'Remap', detail: 'opus selects wave 3 (new groups + revisions)', model: 'opus' },
  ],
}

const R = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research'
const CONS = ['csharp-process', 'csharp-async', 'csharp-api', 'csharp-json', 'csharp-build', 'csharp-packaging', 'csharp-crossplatform']

const SEL_SCHEMA = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          label: { type: 'string' },
          revise: { type: 'boolean' },
          consolidation_brief: { type: 'string' },
          subtopics: { type: 'array', items: { type: 'object', properties: { slug: { type: 'string' }, label: { type: 'string' }, brief: { type: 'string' } }, required: ['slug', 'label', 'brief'] } },
        },
        required: ['group', 'label', 'revise', 'consolidation_brief', 'subtopics'],
      },
    },
    covered: { type: 'string' },
    dropped: { type: 'array', items: { type: 'string' } },
  },
  required: ['topics', 'covered'],
}

phase('Remap')
const sel = await agent(
  'Model rationale: opus - wave selection decides which research becomes enforced rules.\n\n' +
  'You are the MAPPER for research-lang phase 6 (iterate) of the C# / .NET program, dated ' + args.date + '. Context: the output becomes AI-agent rules and skills (csharp-quality rule with depth files, dotnet-build rule, skills dotnet-upgrade / dotnet-diagnose / dotnet-release, bundle dotnet-essentials). The adopting codebase is a new C# SDK wrapping the ocx CLI, but the rules also serve ANY C# code an agent writes, so the general C# quality surface (language, nullability, exceptions, disposal, performance, testing, security, observability, docs comments) must be covered, not only SDK concerns. Target C# 14 / .NET 10 LTS; .NET 11 RC1 flagged. Toolchain ~/.cache/research-lang/dotnet-tools/run.sh; exemplars ~/.cache/research-lang/exemplars/csharp; Windows host SDK 10.0.102 via cmd.exe. macOS and arm64 hardware are NOT available (do not commission work that needs them; that is a recorded gap for a CI run later).\n\n' +
  'Read IN FULL: ' + R + '/csharp-topic-map.md (especially Deferred and Intended artifact set) and the "Open questions" + "Verdict" sections of each wave-2 consolidation: ' + CONS.map(c => R + '/' + c + '.md').join(', ') + '. Skim the csharp-audit/ files as needed.\n\n' +
  'Select WAVE 3: 18-22 subtopics total, split into (a) NEW groups (revise=false) covering the general C# quality surface and the skills\' needs - at minimum csharp-language (nullable posture and ! policy, C# 14 features vs TFM and fencing C# 15, modern idioms: primary constructors, records, collection expressions, patterns, Span, generated-code mimicry), csharp-observability (logging dependency choice ILogger vs ActivitySource vs none, --log-level forwarding, Meter), csharp-security (deserialization, supply chain and dependency minimalism, binary signature/attestation beyond sha256), csharp-testing (framework choice xUnit v3 / MSTest / MTP for a library, coverage, snapshot tests), csharp-performance (allocation, string/culture, LINQ, CA18xx perf rules, BenchmarkDotNet - only what agents get wrong), and the skills\' corpora: dotnet-diagnose error catalogue (NU/MSB/NETSDK/CS/IL codes agents hit, with fixes, measured), dotnet-upgrade migration path (net8->net10, LangVersion, AnalysisLevel bumps, breaking changes), dotnet-release app publish modes (self-contained, single-file, Native AOT, container) - use your judgment on grouping and slugs (prefix csharp-); and (b) REVISION groups (revise=true, group = an existing wave-2 group slug, at most ONE entry per existing group) for the follow-ups those consolidations named that are answerable on this machine: e.g. csharp-async single-flight init + IProgress/IAsyncEnumerable streaming + client thread-safety; csharp-api result construction + behavioural-compat suite; csharp-json error-document/integer enums + generic union converter; csharp-process Windows ACL PATH check + running the engine against an ocx built from ~/dev/ocx main if cargo can build it (try) else 0.6.5. Skip follow-ups that need macOS/arm64 hardware, .NET 11 GA, or an owner decision - list them in dropped.\n' +
  'Each subtopic brief: 12-25 lines, a professional commission - what to investigate, which sources and exemplar dirs, which APIs/analyzer IDs/properties to name, which claims to verify red/green on a planted fixture with the toolchain, and what the deliverable must decide. For revision groups the subtopic writes a NEW file in the group dir. Each group gets a consolidation_brief (5-10 lines; for revisions, what the reviser must settle and which IDs it may touch).\n\n' +
  'Append to ' + R + '/csharp-topic-map.md a section "## Wave 3 selection (' + args.date + ')" listing groups, subtopics (slug + one-line), revisions, and what was dropped and why. Edit nothing else. Return the selection as structured data (briefs verbatim) plus covered: a 10-20 line plain-text list of what waves 1-2 already settled (group + rule-ID prefix + one-line scope), which is handed to the new workers as ALREADY COVERED.',
  { label: 'remap-wave3', phase: 'Remap', schema: SEL_SCHEMA, model: 'opus' })

log('wave 3: ' + sel.topics.length + ' groups, ' + sel.topics.reduce((n, t) => n + t.subtopics.length, 0) + ' subtopics; dropped ' + (sel.dropped || []).length)

const res = await workflow({ scriptPath: args.child }, { date: args.date, wave: 3, topics: sel.topics, covered: sel.covered })
return { selection: sel.topics.map(t => ({ group: t.group, revise: t.revise, subs: t.subtopics.map(s => s.slug) })), dropped: sel.dropped, results: res }
