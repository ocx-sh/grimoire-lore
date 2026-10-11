export const meta = {
  name: 'csharp-wave1-ground-scout-map',
  description: 'C# research-lang: 5 grounding audits + 6 corpus scouts, then an opus topic map selecting wave-1 dives',
  phases: [
    { title: 'Ground', detail: '5 sonnet audits: ocx CLI contract, Python SDK digest, 3 exemplar measurements' },
    { title: 'Scout', detail: '6 sonnet corpus scouts' },
    { title: 'Map', detail: 'opus topic map + wave-1 selection', model: 'opus' },
  ],
}

const R = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/csharp/.agents/research'
const EX = '/home/mherwig/.cache/research-lang/exemplars/csharp'
const TOOLS = '/home/mherwig/.cache/research-lang/dotnet-tools'
const DATE = args.date

const CONTEXT = [
  'PROJECT CONTEXT (context for you, not content to reproduce):',
  '- Program: research-lang for C# / .NET, dated ' + DATE + '. Output becomes AI-agent configuration (rules + skills) that coding agents load with no human in the loop, published from the grimoire-lore repo.',
  '- Era: C# 14 on .NET 10 LTS (SDK 10.0.401) is the target; .NET 8 LTS (8.0.425) is the floor; .NET 11 / C# 15 is at RC1 (GA Nov 2026) and anything specific to it must be flagged.',
  '- Adopting codebase: a NEW C# SDK that wraps the ocx CLI (an OCI-registry-backed binary package manager written in Rust, repo ~/dev/ocx). The reference design is the Python SDK at ~/dev/ocx-sdk-python (typed handles over ocx, methods mirror CLI commands one for one, wrap the CLI rather than reimplement it, bootstrap ocx anywhere). No first-party C# exists in the fleet today.',
  '- Owner requirement: modern .NET (Core), all platforms - Windows, Linux, macOS, x64 and arm64. Whether to also target netstandard2.0 (.NET Framework, Unity) is an OPEN question to research, not a premise.',
  '- Library authoring therefore sits at the centre: public API design and evolution, NuGet packaging/signing/SourceLink, subprocess control (spawning, stdout/stderr pumping, argument quoting, cancellation, kill-tree, exit codes, encodings), JSON binding (System.Text.Json, source generation, AOT/trimming), async and cancellation, errors, testing, cross-platform behaviour, and the general C# quality surface any C# code needs.',
  '- Toolchain available: ' + TOOLS + '/run.sh <cmd> (e.g. run.sh dotnet build) with SDKs 8.0.425, 10.0.401, 11.0 RC1. Put any fixture under ' + TOOLS + '/fixtures/<your-slug>/ (that dir has a global.json pinning 10.0.401). Measured already: with no global.json, dotnet picks the newest installed SDK INCLUDING a prerelease.',
  '- Exemplar corpus (35 blob-less depth-1 clones, one dir per repo named owner__repo) under ' + EX + ': CliWrap, simple-exec, MedallionShell, pulumi-dotnet (Automation API wraps the pulumi CLI), testcontainers-dotnet, nuke, cake, command-line-api, spectre.console, octokit.net, stripe-dotnet, openai-dotnet, anthropic-sdk-csharp, Polly, npgsql, nodatime, serilog, xunit, Humanizer, FluentValidation, Dapper, StackExchange.Redis, MessagePack-CSharp, BenchmarkDotNet, Meziantou.Analyzer, StyleCopAnalyzers, roslynator, vs-threading, testfx, sourcelink, coverlet, GitVersion, plus sparse slices of azure-sdk-for-net (sdk/core/Azure.Core + eng props), aspire (src/Aspire.Hosting/Dcp) and PowerShell (NativeCommandProcessor.cs). Cite exemplar evidence as owner__repo@<12-char sha>:path:line (sha via git -C <dir> rev-parse --short=12 HEAD).',
  '',
  'ALREADY COVERED: no C# or .NET guidance exists in the set. Language-neutral sets already exist for documentation (docs-quality, code-docs) and Bazel; C# doc-comment specifics are NOT covered.',
].join('\n')

const RULES = [
  'Hard rules: write ONLY your output file (plus fixtures under your own fixtures/<slug>/ dir). Never write into the exemplar clones. Use read-only git (git -C <dir> show/ls-files/grep). Numbers come with the exact command inline. Every non-obvious claim carries a citation (file:line or URL).',
].join('\n')

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    headline: { type: 'array', items: { type: 'string' } },
    smells: { type: 'array', items: { type: 'string' } },
    patterns: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'headline', 'patterns'],
}

const groundPreamble = 'Model rationale: sonnet - measurement and enumeration work with file:line evidence; no ruleset decisions.\n\n' + CONTEXT + '\n\n' +
  'You are producing a numbers-first audit so a later authoring pass is grounded in what is actually there. Write your file with YAML frontmatter (title, agent, model, scope, method); method must describe the exact commands used so every number is re-runnable, and inline each command next to its result. The requester\'s framing is a HYPOTHESIS, not a premise: if measurements contradict it, say so plainly with counts - that is the most valuable result. Where docs and code disagree, say which wins in practice.\n' + RULES + '\n\n'

const GROUND = [
  {
    slug: 'ocx-cli-contract',
    body: 'AXIS: the ocx CLI contract a C# SDK binds to. Repo ~/dev/ocx (Rust; crates/ocx_cli, ocx_exit, ocx_exit_derive, ocx_schema, ocx_env, ocx_config, ocx_console, ocx_project, plus website/ docs if present; ignore .tmp/ and worktrees). Produce: (1) the complete exit-code table - code, name, meaning, where defined, where produced, where asserted in tests; (2) the machine-readable output surface - which commands emit JSON (flag name, e.g. --format json or similar), the schema source (ocx_schema), stdout vs stderr discipline, progress/log output and how to silence it, colour/TTY detection; (3) environment variables the CLI reads (OCX_* etc), config files and precedence, home/cache dirs per OS; (4) the command tree with arguments an SDK must model, and which are interactive; (5) version reporting and any compatibility/version-negotiation mechanism an SDK can use; (6) Windows specifics (exe name, path handling, shims, symlink fallbacks). Note: crates/ocx_sdkgen exists only as an SBOM file - find out (git log) whether an SDK generator existed or is planned and what it emitted. Diff docs against code. Return the headline numbers and the contract points an SDK MUST honour.',
  },
  {
    slug: 'python-sdk-digest',
    body: 'AXIS: portability digest of the reference SDK ~/dev/ocx-sdk-python (src/ocx_sdk/*, tests/, docs/, CLAUDE.md, pyproject.toml, taskfile.yml, .github/workflows). Produce: (1) architecture map with LOC per module (wc -l) and the public surface (__init__ exports, count of public methods on the client, how methods map to CLI commands); (2) the process layer (_process.py): how it spawns ocx, captures output, handles timeouts/cancellation, env isolation, encoding, Windows handling - with file:line; (3) the error taxonomy (_errors.py): exception classes, how exit codes map to them, what context they carry; (4) results/parsing (_results.py, _types.py): how JSON output is bound to typed results, unknown-field tolerance, version skew handling; (5) bootstrap/dist (_bootstrap.py, _dist.py): how ocx is located/downloaded/verified per platform, checksum/signature checks, caching; (6) retry policy (_retry.py); (7) the test strategy: unit vs integration split, fake ocx binaries, recorded fixtures, coverage gates, CI OS matrix; (8) the repo\'s own CLAUDE.md and rules - every normative statement verbatim. Then a PORTABILITY TABLE: each design decision -> keep as-is in C# / translate (to what .NET idiom) / drop (Python-specific), with one line why. Flag anything that looks like a mistake or a known gap.',
  },
  {
    slug: 'exemplar-cli-wrappers-and-sdks',
    body: 'AXIS: how real .NET libraries wrap external processes and shape SDK public APIs. Primary repos: Tyrrrz__CliWrap, adamralph__simple-exec, madelson__MedallionShell, pulumi__pulumi-dotnet (Automation API: find LocalWorkspace / CommandRunner / how it invokes the pulumi CLI), testcontainers__testcontainers-dotnet, nuke-build__nuke (ToolTasks / ProcessTasks), cake-build__cake (Tool<T>, ProcessRunner), dotnet__aspire (Dcp), PowerShell__PowerShell (NativeCommandProcessor.cs). SDK-shape repos: octokit__octokit.net, stripe__stripe-dotnet, openai__openai-dotnet, anthropics__anthropic-sdk-csharp, Azure__azure-sdk-for-net (Azure.Core). Measure and cite: (1) process spawning - ProcessStartInfo.ArgumentList vs Arguments string, UseShellExecute, CreateNoWindow, how stdout AND stderr are drained concurrently (deadlock avoidance), BeginOutputReadLine vs ReadToEndAsync vs pipes, StandardOutputEncoding, WaitForExitAsync usage, Kill(entireProcessTree: true), cancellation semantics (graceful vs forced), exit-code to exception mapping, environment handling, executable resolution on PATH / Windows PATHEXT; (2) count which repos do each (table); (3) SDK public-API shape - client class vs static, options objects, async-only vs sync+async pairs, CancellationToken placement, return types (records? response wrappers?), pagination, IDisposable on client, logging (ILogger / EventSource / DiagnosticSource / ActivitySource), exceptions hierarchy; (4) JSON - System.Text.Json vs Newtonsoft counts, JsonSerializerContext source generation, unknown-property handling, enum converters, naming policy; (5) testability seams (interfaces, fake process runners). Rank the designs and name the one a new ocx SDK should copy, with evidence.',
  },
  {
    slug: 'exemplar-build-and-gates',
    body: 'AXIS: build, packaging and quality-gate configuration across ALL 35 exemplars. Count per repo (table: one row per repo, one column per item) then totals: (1) TargetFramework(s) - how many multi-target netstandard2.0 alongside net8+/net9/net10, how many net462/net472, how many are net8.0+-only; which polyfill packages they use (PolySharp, Microsoft.Bcl.*, System.Memory, IndexRange, etc); (2) Directory.Build.props/targets layering, Directory.Packages.props (Central Package Management) adoption, global.json presence and rollForward values, .slnx vs .sln; (3) LangVersion, Nullable, ImplicitUsings, TreatWarningsAsErrors, WarningsAsErrors, NoWarn lists (collect the most common suppressed IDs), AnalysisLevel / AnalysisMode, EnforceCodeStyleInBuild, GenerateDocumentationFile, .editorconfig size and dotnet_diagnostic severity overrides (top IDs); (4) analyzer packages referenced (Meziantou, StyleCop, Roslynator, SonarAnalyzer, Microsoft.VisualStudio.Threading.Analyzers, PublicApiAnalyzers, BannedApiAnalyzers); (5) IsTrimmable / IsAotCompatible / EnableTrimAnalyzer / EnableAotAnalyzer; (6) packaging: PackageValidation (EnablePackageValidation, PackageValidationBaselineVersion), SourceLink, Deterministic / ContinuousIntegrationBuild, EmbedUntrackedSources, symbol packages (snupkg), signing (strong-name, NuGet signing), MinVer/GitVersion/Nerdbank versioning, packages.lock.json / RestorePackagesWithLockFile / RestoreLockedMode, NuGetAudit settings, packageSourceMapping in nuget.config; (7) CI: .github/workflows OS matrix (windows/ubuntu/macos, arm64), dotnet test runner (VSTest vs Microsoft.Testing.Platform), test frameworks (xunit v2 vs v3, NUnit, MSTest), coverage tool, dotnet format checks. Use the toolchain if useful (e.g. run.sh dotnet --list-sdks) but do NOT build the exemplars. Return the totals and the strongest gate configuration seen.',
  },
  {
    slug: 'exemplar-language-shape',
    body: 'AXIS: measured C# code shape across the exemplars (exclude generated code: *.g.cs, *.Designer.cs, obj/, and huge generated SDK trees in stripe/openai/anthropic - report them separately). Counts per repo and totals, with the grep/command: (1) nullable: #nullable directives, null-forgiving operator ! density per KLOC, ArgumentNullException.ThrowIfNull vs manual checks; (2) async: async methods, ConfigureAwait(false) density in library code, ValueTask vs Task, IAsyncEnumerable, async void outside event handlers, .Result / .Wait() / GetAwaiter().GetResult() occurrences (sync-over-async), CancellationToken parameters and whether named cancellationToken and last, [EnumeratorCancellation]; (3) disposal: IAsyncDisposable, await using, Dispose pattern with finalizers; (4) types: records vs classes, sealed by default ratio for public classes, primary constructors, required/init, collection expressions, file-scoped namespaces, readonly struct, Span/Memory usage; (5) exceptions: custom exception classes and base types, catch (Exception) counts, throw; vs throw ex;, exception filters; (6) logging and diagnostics: ILogger, LoggerMessage source-gen, EventSource, ActivitySource; (7) public API: count of public types, internal + InternalsVisibleTo, PublicAPI.Shipped.txt files; (8) tests: placement, naming, framework assertion styles. Identify the 5 strictest repos and what makes them strict. Name patterns an agent would get wrong.',
  },
]

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          question: { type: 'string' },
          why: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['slug', 'question', 'why', 'priority'],
      },
    },
  },
  required: ['path', 'candidates'],
}

const SCOUT_CONTRACT = 'Write your file with YAML frontmatter (title, scout, model, date_researched, sources_count), a table of contents, "## Summary" (10-20 bullets), "## Findings" (what the corpus covers, organised by theme, every non-obvious claim with an inline link to the exact URL you FETCHED - never write from search snippets), "## Candidate topics" - a table: topic | why it matters | source | already-covered? (yes/partial/no) | priority for an ocx C# SDK plus general C# quality. Aim for 25-40 candidates. A candidate is a QUESTION, not a subject area. Include the topics that sound boring but bite - encodings, path handling, time, ordering determinism, resource cleanup, cancellation, idempotency, on-disk/JSON format versioning, culture/invariant globalization, extensibility seams, binary compatibility. Then "## Sources" table (URL | what | date/era | why), minimum 15 sources, at least 8 primary. Load the web tools first (ToolSearch for WebFetch and WebSearch; context7 for library docs). Flag era-specific guidance with its version.\n' + RULES

const SCOUTS = [
  { slug: 'canonical', body: 'YOUR CORPUS: canonical guides. Microsoft Learn C# language reference and "what\'s new in C# 12/13/14 (and 15 preview)", .NET Framework Design Guidelines (learn.microsoft.com/dotnet/standard/design-guidelines, and the Cwalina/Barton/Abrams book 3rd ed TOC), .NET library guidance (learn.microsoft.com/dotnet/standard/library-guidance: cross-platform targeting, strong naming, NuGet, dependencies, SourceLink, versioning, breaking changes), Azure SDK design guidelines for .NET (azure.github.io/azure-sdk/dotnet_introduction.html - client, options, pagination, LRO, exceptions, diagnostics), C# coding conventions, async guidance (Task-based Asynchronous Pattern docs), the Native AOT and trimming docs, the .NET breaking-changes index for 8/9/10, System.Diagnostics.Process docs, System.Text.Json docs. Extract the TABLES OF CONTENTS - every chapter, guideline ID and checklist item is a candidate topic.' },
  { slug: 'practitioner', body: 'YOUR CORPUS: practitioner writing. Stephen Toub (devblogs "Performance Improvements in .NET 8/9/10", ConfigureAwait FAQ, "How async/await really works"), Stephen Cleary (async best practices, "Don\'t block on async code", Concurrency in C# Cookbook), David Fowler AsyncGuidance.md (github.com/davidfowl/AspNetCoreDiagnosticScenarios), Andrew Lock (andrewlock.net: source generators, .NET 10 features, file-based apps, testing), Jon Skeet, Nick Craver, Gerald Versluis is not needed - prefer Marc Gravell (Stack Overflow / StackExchange.Redis lessons, AOT, pipelines), Meziantou blog (meziantou.net - Process pitfalls, analyzers, nullable), Tyrrrz (Oleksii Holub: CliWrap design, "Process in .NET is broken" style posts), Immo Landwerth / Richard Lander on versioning and support, NuGet team blog. Read the posts; extract the ARGUED positions, especially where they disagree.' },
  { slug: 'codified', body: 'YOUR CORPUS: codified practice - rules somebody already thought worth enforcing. The .NET code-analysis rule catalog (CA1xxx-CA5xxx, IDE0xxx; learn.microsoft.com/dotnet/fundamentals/code-analysis), AnalysisMode levels and which rules turn on at each, Meziantou.Analyzer rule list (MA0xxx), Roslynator, StyleCop SA rules, Microsoft.VisualStudio.Threading.Analyzers (VSTHRD rules), SonarAnalyzer C# rules (S-numbers, security hotspots), PublicApiAnalyzers (RS0016/RS0017...), BannedApiAnalyzers, IL trimming/AOT warnings (IL2xxx, IL3xxx), nullable warnings (CS86xx), NuGet warnings (NU1xxx incl. NU1901-1904 audit), the dotnet/runtime coding-style.md, Azure SDK analyzers (AZC rules), OWASP .NET security cheat sheet, Microsoft SDL guidance for .NET (process injection, deserialization BinaryFormatter removal). For each catalog: which rules are off by default but matter for a library that spawns processes and parses JSON.' },
  { slug: 'failure', body: 'YOUR CORPUS: failure corpus - what goes wrong in real C# code. dotnet/runtime GitHub issues on System.Diagnostics.Process (stdout/stderr deadlocks, WaitForExit hanging when grandchildren hold pipes, Kill not killing tree, ArgumentList quoting on Windows, encoding/UTF-8 console, macOS/Linux SIGCHLD handling, zombie processes), CliWrap / MedallionShell issue trackers, async deadlocks (SynchronizationContext, sync-over-async, thread-pool starvation postmortems), HttpClient misuse, DateTime vs DateTimeOffset bugs, culture-sensitive parsing/formatting (CultureInfo, Turkish-I), path handling across OSes (Path.Combine with rooted paths, case sensitivity, long paths on Windows, \\\\?\\ prefixes, symlinks), System.Text.Json pitfalls (case sensitivity, number handling, polymorphism, missing members, AOT reflection fallback), NuGet dependency hell (diamond dependencies, binding redirects on .NET Framework, version ranges, transitive pinning), breaking-change postmortems for libraries (binary vs source breaking, default interface members, optional parameters), recurring code-review objections in dotnet/runtime and azure-sdk-for-net PRs. Also check the exemplar repos\' issue themes via their CHANGELOG / release notes on disk. This corpus finds topics no curriculum lists.' },
  { slug: 'shifts', body: 'YOUR CORPUS: recent shifts, last ~24 months (Oct 2024 - Oct 2026) and what old advice they invalidate. C# 13/14/15 features (params collections, field keyword, extension members, null-conditional assignment, first-class Span conversions, unions if they shipped/are previewed), .NET 9/10/11 runtime and SDK changes (file-based apps dotnet run app.cs, .slnx default, dotnet tool exec / dnx, Microsoft.Testing.Platform and dotnet test changes in .NET 10, xUnit v3, MSTest 3/4, NuGet audit transitive by default, package pruning, Central Package Management defaults, SDK workload changes, terminal logger), BinaryFormatter removal, System.Text.Json changes (strict options, JsonSerializerOptions.Strict, required properties, out-of-order metadata), Native AOT reach, Process API additions in .NET 9/10/11 if any (e.g. new ProcessStartInfo or Process.Run style APIs proposals - check dotnet/runtime API proposals), the arm64 Windows/macOS story, OpenTelemetry convergence, nullable defaults, analyzers enabled by default in recent SDKs, NuGet trusted publishing (OIDC) and package signing changes, .NET support policy changes (STS extended to 24 months). For each shift: date, version, which commonly-trained advice it obsoletes.' },
  { slug: 'domain', body: 'YOUR CORPUS: the domain - SDKs that wrap a CLI, and cross-platform process-driving libraries. Study how these ship and evolve: Pulumi Automation API for .NET (wraps pulumi CLI: version checks, installing the CLI, event streaming), Testcontainers (docker discovery), Nuke and Cake tool wrappers (tool resolution, argument builders), CliWrap design rationale, GitHub Actions toolkit equivalents in .NET, Microsoft.Build.Utilities ToolTask, dotnet-install scripts, Docker.DotNet vs CLI, git wrappers (LibGit2Sharp vs shelling to git, e.g. GitVersion\'s choices), Terraform CDK / tfexec (Go) as cross-language prior art, the ocx Python SDK on disk (~/dev/ocx-sdk-python) and the ocx CLI on disk (~/dev/ocx). Questions to surface: CLI version skew and compatibility ranges, bootstrap/download-and-verify of the binary inside a NuGet package vs at runtime (runtime-specific native assets in NuGet: runtimes/<rid>/native, RID graph), streaming JSON events from a child process, typed results vs raw output, testing against a fake CLI, how errors carry stderr, Windows Job Objects for child cleanup, signals on Unix, environment isolation, concurrency (many CLI invocations in parallel, file locks), telemetry. Also: what a .NET developer expects from an SDK (DI registration via IServiceCollection extensions? IOptions? ILogger?), and when that is over-engineering.' },
]

phase('Ground')
const grounding = parallel(GROUND.map(g => () => agent(
  groundPreamble + g.body + '\n\nOUTPUT FILE: ' + R + '/csharp-audit/' + g.slug + '.md\nReturn (max 35 lines of content): path, headline numbers, top smells, top patterns worth encoding.',
  { label: 'ground:' + g.slug, phase: 'Ground', schema: GROUND_SCHEMA, model: 'sonnet' })))

phase('Scout')
const scouting = parallel(SCOUTS.map(s => () => agent(
  'Model rationale: sonnet - web reading and enumeration; topics are discovered here, decided later by opus.\n\n' + CONTEXT + '\n\n' +
  'You are a LANDSCAPE SCOUT. Your job is NOT to answer questions - it is to DISCOVER which questions exist. Survey a corpus and come back with the topics an expert must be expert in, ranked by how much each changes real code quality.\n\n' + s.body + '\n\n' + SCOUT_CONTRACT +
  '\n\nOUTPUT FILE: ' + R + '/csharp-topic-map/' + s.slug + '.md\nReturn: path and the candidate list as structured data.',
  { label: 'scout:' + s.slug, phase: 'Scout', schema: SCOUT_SCHEMA, model: 'sonnet' })))

const [g, s] = await Promise.all([grounding, scouting])
const gOk = g.filter(Boolean), sOk = s.filter(Boolean)
log('grounding ' + gOk.length + '/5, scouts ' + sOk.length + '/6, candidates ' + sOk.reduce((n, x) => n + x.candidates.length, 0))

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          label: { type: 'string' },
          consolidation_brief: { type: 'string' },
          subtopics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { slug: { type: 'string' }, label: { type: 'string' }, brief: { type: 'string' } },
              required: ['slug', 'label', 'brief'],
            },
          },
        },
        required: ['group', 'label', 'consolidation_brief', 'subtopics'],
      },
    },
    frame_corrections: { type: 'array', items: { type: 'string' } },
    owner_decisions: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'topics', 'frame_corrections'],
}

phase('Map')
const map = await agent(
  'Model rationale: opus - topic prioritisation and wave selection decide what becomes enforced rules.\n\n' + CONTEXT + '\n\n' +
  'You are the MAPPER for phase 3. Read IN FULL: ' + R + '/csharp-frame.md, every file in ' + R + '/csharp-audit/ (' + gOk.map(x => x.path).join(', ') + ') and every scout file in ' + R + '/csharp-topic-map/ (' + sOk.map(x => x.path).join(', ') + '). For precedent on map shape (not content), skim the first 120 lines of /home/mherwig/dev/grimoire-lore/.agents/research/swift-topic-map.md.\n\n' +
  'Write ' + R + '/csharp-topic-map.md:\n' +
  '1. Frontmatter (title, model, date ' + DATE + ', inputs list).\n' +
  '2. "## Frame corrections" - every place the audits or scouts contradict the frame (artifact set, era, the netstandard2.0 question, the SDK design), with evidence.\n' +
  '3. "## The map" - every deduplicated candidate across all scouts: topic (as a question) | coverage (covered/partial/uncovered) | priority justified in one line against THIS program (an ocx C# SDK + general C# quality for agents) | source scouts.\n' +
  '4. "## Selected for wave 1" - 6 to 7 topic GROUPS (group slug prefixed csharp- , e.g. csharp-process, csharp-async, csharp-api, csharp-build, csharp-packaging, csharp-language, csharp-testing - your choice, justified), each with 2-3 subtopics, total 15-18 subtopics. Choose by: uncovered first, leverage for the ocx SDK, areas where agents demonstrably get it wrong, and whether a rule could check it. The netstandard2.0-vs-net8+ reach decision MUST be one subtopic. Each subtopic gets a RESEARCH BRIEF of 12-25 lines written as a professional commission: exactly what to investigate, which sources and exemplar repos (by dir name) to read, which APIs/analyzer IDs/MSBuild properties to name, which claims to verify with the toolchain on a planted fixture (red on a bad fixture, green on its twin), and what the deliverable must decide. Each group also gets a consolidation_brief (5-10 lines: what the consolidator must decide).\n' +
  '5. "## Deferred" - everything else, grouped, so wave 2 starts from a backlog.\n' +
  '6. "## Intended artifact set" - revise the frame\'s set if the evidence says so (rule names, skill names, bundle), with one line why per change.\n' +
  '7. "## Owner decisions" - only questions genuinely the owner\'s to decide.\n' +
  'Write ONLY that file. Return the selection as structured data (briefs verbatim, they are handed to workers as-is).',
  { label: 'map', phase: 'Map', schema: MAP_SCHEMA, model: 'opus' })

return { grounding: gOk, scouts: sOk.map(x => ({ path: x.path, n: x.candidates.length })), map }
