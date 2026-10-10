export const meta = {
  name: 'swift-wave1-ground-and-scout',
  description: 'Swift research program wave 1: five grounding audits over the lore catalog and a 40-repo Swift exemplar corpus, and seven landscape scouts over the Swift corpora',
  phases: [
    { title: 'Ground', detail: 'numbers-first audits of sibling config and a 40-repo exemplar corpus, with real Swift 6.4 tool runs' },
    { title: 'Scout', detail: 'seven corpus surveys that discover candidate topics' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const RESEARCH = ROOT + '/.agents/research'
const FRAME = RESEARCH + '/swift-frame.md'
const EX = '/home/mherwig/.cache/research-lang/exemplars/swift'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const SCRATCH = '/home/mherwig/.cache/research-lang/swift-tools/build'
const FIX = '/home/mherwig/.cache/research-lang/swift-tools/fixtures'
const DATE = '2026-10-10'

const PREAMBLE = (rationale) => `Model rationale: sonnet — ${rationale}

PROJECT CONTEXT (context for you, not content to reproduce):
- This is the research program that makes an AI-agent fleet expert in Swift and its ecosystem as of late 2026: the language in Swift 6 language mode (current release Swift 6.4.0, 2026-09-14), strict concurrency and the 6.2 approachable-concurrency settings, SwiftPM manifests and the build, swift-format / SwiftLint / SwiftFormat, Swift Testing vs XCTest, DocC, cross-platform (Linux, static Linux SDK, Windows, Wasm, Android, Embedded), Apple-platform apps (SwiftUI, Observation, Xcode) as read-only depth, release and distribution, and Bazel rules_swift. Its output becomes AI-agent configuration (a glob-scoped swift-quality rule with a support directory, a SwiftPM/package rule, one to three skills, a bundle, and a Swift depth file offered to the published bazel-quality set) used without a human in the loop, published through the lore catalog at ${ROOT} (a git worktree; treat it as the repository root and never cd to /home/mherwig/dev/grimoire-lore itself).
- Read the frame first, in full: ${FRAME}. It names the era hypotheses, the future consumers, the orchestrator's hypotheses H1-H8, the owner-question defaults Q1-Q6, and the intended artifact set.
- THE FLEET HAS ZERO SWIFT CODE (measured). Grounding runs against an EXEMPLAR CORPUS of 40 upstream repositories cloned depth-1 (blob-less, binary assets sparse-excluded) under ${EX}/<owner>__<repo>. SHAs are in ${RESEARCH}/swift-audit/scratch/exemplar-shas.md. Always cite <repo>@<sha12>:<path>:<line>.
- A REAL SWIFT TOOLCHAIN is available through Docker: run anything as '${RUN} <command> [args]' from a cwd under /home/mherwig/.cache/research-lang or under ${ROOT} (those are the only mounted paths). It provides swift 6.4 (set SWIFT_VERSION=6.3 in the environment before the wrapper for the swift:6.3 image), 'swift format' (bundled swift-format), swiftlint 0.65.1 and swiftformat 0.63.1 on PATH. Linux only: there is NO macOS and NO Xcode, so anything Apple-only (SwiftUI runtime, Xcode build settings, iOS) is read-only — say so whenever a claim rests on reading alone. Build with 'swift build --scratch-path ${SCRATCH}/<repo-or-fixture-name>' so build products never land in an exemplar clone; resolution may write Package.resolved into a clone, which is acceptable, but never run 'swift package update', 'swift format --in-place', 'swiftformat' without --lint, or 'swiftlint --fix' inside an exemplar. Planted fixtures go under ${FIX}/<your-key>/. Bound each tool run with 'timeout 900'. Builds of large packages can take minutes; pick small and medium packages for runs.
- Sibling lore rule sets already exist under ${ROOT}/rules/ (rust-quality, rust-cargo, python-quality, python-packaging, typescript-quality, typescript-packaging, java-quality, kotlin-quality, gradle-build, maven-build, go-quality, go-modules, cmake-build, cpp-packaging, nix-quality, bazel-quality, docs-quality, code-docs, css-theming) and skills under ${ROOT}/skills/. A Swift topic that is really a generic docs, CI, or Bazel-core topic belongs to those sets — mark it covered-elsewhere.
- The orchestrator's hypotheses H1-H8 in the frame are HYPOTHESES to test, never premises. Contradicting one with evidence is the most valuable result you can produce.
- Do not read under any .agents/worktrees/ other than ${ROOT} itself, nor under .build/, .git/ objects. The only file you may create or modify is your own OUTPUT FILE (plus throwaway fixtures under ${FIX}/<your-key>/ and build output under ${SCRATCH}).
- Date everything you write as researched ${DATE}. Flag anything Swift-version-specific with the version it applies to.

ALREADY COVERED: nothing — this is the first wave of the Swift program. Adjacent coverage: the sibling lore sets named above.
`

const GROUND_CONTRACT = (subject, path) => `You are producing a numbers-first audit of ${subject} so a later authoring pass is grounded in what is actually there.

Write ${path} with YAML frontmatter (title, agent, model, scope, method, date_researched: ${DATE}). 'method' must describe the exact commands used so every number is re-runnable; inline each command next to its result. Record the exemplar SHAs you measured.

The orchestrator's hypotheses are HYPOTHESES, not premises. If the measurements contradict one, say so plainly and show the counts. That is the most valuable result this audit can produce.

Every claim needs a <repo>@<sha12>:<path>:<line> or file:line citation. Where docs and config disagree, say which one is authoritative in practice.

Counting discipline: exclude .build/, Benchmarks/ fixtures, generated sources (*.pb.swift, *.grpc.swift, files whose header says generated / DO NOT EDIT), vendored third-party code, and test fixture inputs unless the axis is about them, and say so. Report per-repo tables AND corpus totals; name the repos at both extremes. A grep count is a hypothesis — spot-read 3 hits per pattern to confirm the pattern measures what you claim, and report the false-positive rate you saw. Where a regex would be fragile, prefer parsing with a short script (python3 -I) and say so.

Structure: frontmatter, a table of contents, "## Headline numbers", one "## <axis>" section per numbered demand below (each with commands inline, tables over prose), "## Smells (ranked)", "## Patterns worth encoding", "## Contradictions of the frame", "## Gaps". Aim for 300-600 lines; density over prose.

Use read-only tools on every repository. Do not modify anything outside your output file (and your fixture/scratch dirs). Return the structured receipt.`

const SCOUT_CONTRACT = (corpusName, path) => `You are a LANDSCAPE SCOUT. Your job is NOT to answer questions — it is to DISCOVER which questions exist. Survey a corpus and come back with the topics an expert must be expert in, ranked by how much each changes real code quality.

YOUR CORPUS: ${corpusName}

OUTPUT FILE: ${path}

Structure, in this order:
1. YAML frontmatter: title, corpus, agent, model, date_researched: ${DATE}, sources_count, scope (2-3 lines on what is and is not covered).
2. A table of contents.
3. "## Summary" — 10-20 bullet lines, each a standalone claim about what this corpus says matters.
4. "## Survey" — numbered subsections, one per source or source cluster actually read: what it argues or lists, with an inline markdown link to the exact URL read. Quote exact API names, attribute names, compiler flags, upcoming-feature names, SE proposal numbers, lint rule identifiers, diagnostic group names, command lines, version numbers, numeric thresholds.
5. "## Candidate topics" — a table: topic (a QUESTION, not a subject area) | why it matters | source (URL) | already-covered? (yes/partial/no, against the sibling lore sets) | which surface it binds (lang / generics / concurrency / errors / memory-ownership / api-design / testing / lint-format / swiftpm / build-settings / release / platform-linux / platform-windows / platform-apple / swiftui / interop-c-cpp / macros / docc / bazel-swift / cli / server / security / perf / any) | priority for THIS project shape (P0-P3, one clause of justification). Aim for 30-50 candidates. Be exhaustive and specific. Include the topics that sound boring but bite: String and Unicode (grapheme vs scalar vs UTF-8 views, String.Index), Foundation-on-Linux divergence, FilePath vs URL vs String paths and Windows, Date/Duration/ContinuousClock vs SuspendingClock, Dictionary/Set iteration order and output determinism, Codable versioning and on-disk formats, deinit and resource cleanup, cancellation, reentrancy, atomic file writes, signal handling, exit codes, locale-sensitive formatting, availability annotations, deprecation timelines, ABI/library evolution.
6. "## Recent shifts seen in this corpus" — what changed in the last 18-24 months (Swift 6.0 to 6.4, Xcode 16 to 26/27, and the tools) and what older advice it invalidates, with the version and date.
7. "## Contested" — where sources disagree, and which way it is trending.
8. "## Sources" — table: URL | what it is | date/era | why worth reading. Minimum 15 distinct sources, at least 8 primary (swift.org docs and blog, The Swift Programming Language book, swift-evolution proposals, the Swift Forums threads by core-team members, the tool's own repository or docs, WWDC session pages, compiler diagnostic documentation in swiftlang/swift userdocs).

Hard requirements:
- Load the web tools first: call ToolSearch with query "select:WebSearch,WebFetch" before anything else. For GitHub-hosted markdown (README, Documentation/, CHANGELOG, rule indexes, proposal texts) prefer fetching the raw file verbatim with 'curl -sL https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path>' through Bash, because WebFetch returns a summary and a catalogue sweep needs the full list. Use 'gh api' for GitHub issue, PR, or directory listings where it helps (read-only). For swift-evolution, the proposal directory listing via 'gh api repos/swiftlang/swift-evolution/contents/proposals' gives every SE number.
- Actually FETCH the primary sources; never write from search snippets.
- Reflect current practice as of ${DATE} (Swift 6.4 era); flag historical-only guidance.
- A candidate is a question a rule could later answer with a verification command. "Concurrency" is a wave; "when may a library type conform to Sendable via @unchecked, what must guard its state (Mutex from Synchronization, a lock, an actor), and how does a reviewer spot an unguarded one" is a topic.
- Do not modify any file other than your output file. Return the structured receipt with the candidate list as structured data.`

const GROUND_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    headline_numbers: { type: 'array', items: { type: 'string' } },
    top_smells: { type: 'array', items: { type: 'string' } },
    patterns_worth_encoding: { type: 'array', items: { type: 'string' } },
    contradictions_of_frame: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'headline_numbers', 'top_smells', 'patterns_worth_encoding', 'contradictions_of_frame'],
}

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    sources_count: { type: 'number' },
    primary_sources_count: { type: 'number' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          why: { type: 'string' },
          source: { type: 'string' },
          covered: { type: 'string', enum: ['yes', 'partial', 'no'] },
          surface: { type: 'string' },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
        },
        required: ['slug', 'why', 'source', 'covered', 'surface', 'priority'],
      },
    },
    recent_shifts: { type: 'array', items: { type: 'string' } },
  },
  required: ['path', 'sources_count', 'primary_sources_count', 'candidates', 'recent_shifts'],
}

const ALL_NOTE = `The corpus is every directory under ${EX}. Loop with a shell for-loop over them and print a per-repo table for each axis. Group repos by shape when reporting: apple/swiftlang core libraries, swiftlang tools (format, syntax, testing, SwiftPM, sourcekit-lsp, swiftly, swift-build), server (nio-based, vapor, hummingbird, grpc, lambda, async-http-client, service-lifecycle), community libraries (pointfree, Alamofire, Nuke), tools (SwiftLint, SwiftFormat, tuist), apps (IceCubesApp, element-x-ios), platforms (rules_swift, JavaScriptKit, swift-embedded-examples), Apple OCI tooling (containerization, container, swift-container-plugin).`

// ---------------------------------------------------------------- Ground
const GROUNDERS = [
  {
    key: 'config-inventory',
    prompt: `${PREAMBLE('inventory and faithful digesting of existing catalog config and fleet prior art; no judgment that becomes a rule')}
${GROUND_CONTRACT("the lore catalog's house conventions and the fleet prior art a Swift set must fit", RESEARCH + '/swift-audit/config-inventory.md')}
Measurement axes:
1. House conventions. For each of ${ROOT}/rules/go-quality.md, go-modules.md, rust-quality.md, nix-quality.md, kotlin-quality.md: frontmatter (globs, description, any metadata), line count, the section skeleton (headings in order), how non-negotiables and rule IDs are laid out, how depth files are routed (the routing table), the gate block shape, and the depth-file count and sizes (wc -l of each). Then the same for two skills: ${ROOT}/skills/go-diagnose/ and ${ROOT}/skills/nix-flake-adopt/ (SKILL.md frontmatter, step layout, the duplicated MUST table shape, references/). And one bundle (${ROOT}/bundles/go-essentials.toml) plus the publish.toml entries for the Go set. Digest the conventions a Swift set must follow, verbatim where they are rules.
2. The artifact checker contract: read ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py and list every check it performs (budgets, glob liveness, verification-command lints, ID table parsing), with line numbers. Then the authoring guidance in ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md and validation.md: the hard budgets (lines, words), the always-on vs scoped rule split.
3. The Bazel set's Swift gap: ${ROOT}/rules/bazel-quality.md and rules/bazel-quality/go.md (the most recent per-language depth file): its structure, ID family, line count, what it defers to bazel-core depth files, and what a swift.md depth file would need to mirror.
4. The SDK template: /home/mherwig/dev/ocx-sdk-python — README.md, pyproject.toml, src/ layout, the public API surface (count), how it wraps the ocx CLI (subprocess calls, cite), error and exit-code mapping, test and coverage gates. This is what an OCX SDK for Swift would mirror.
5. The CLI and durable-state contracts a Swift CLI must mirror: ${ROOT}/rules/rust-quality/cli-contract.md and durable-state.md and platform-and-paths.md — digest every rule ID with its one-line imperative, and mark which ones translate to Swift directly, which need Swift-specific mechanisms (swift-argument-parser ExitCode, FileHandle, FilePath from swift-system, signal handling via Dispatch sources or swift-service-lifecycle), and which are Rust-only.
6. Swift-adjacent material already in the catalog: grep -rn -i -e swift -e xcode -e spm -e cocoapods ${ROOT}/rules ${ROOT}/skills ${ROOT}/docs (count hits per file, quote each meaningful one). Also what docs-quality / code-docs say about doc comments that DocC would inherit or contradict.
7. Gaps: which concerns from the frame's domain list have NO existing config anywhere in the catalog. One line each.`,
  },
  {
    key: 'exemplar-language-shape',
    prompt: `${PREAMBLE('counting and measuring source and manifest shape across 40 exemplar repositories; volume work with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (manifests, source shape, language-feature adoption)', RESEARCH + '/swift-audit/exemplar-language-shape.md')}
${ALL_NOTE} Measurement axes:
1. Manifest census (every Package.swift and Package@swift-*.swift, excluding test fixtures): swift-tools-version distribution (5.5 ... 6.4), version-specific manifests present, swiftLanguageModes / swiftLanguageVersions values, platforms: minimums, products (library / executable / plugin), target kinds (regular, executable, test, macro, plugin, binaryTarget, systemLibrary), dependency count per root manifest and the most common dependencies corpus-wide (top 25) with their version-requirement style (from:, exact:, .upToNextMinor, branch:, revision:, path:), swiftSettings census (enableUpcomingFeature / enableExperimentalFeature names and counts, unsafeFlags, define, strictMemorySafety, defaultIsolation, interoperabilityMode), traits declarations (6.1+), 'package' access usage. Also Xcode projects (.xcodeproj/.xcworkspace counts, xcconfig files, Tuist Project.swift, XcodeGen project.yml) for the apps.
2. Source shape: .swift file count and LOC per repo (production vs Tests/), largest 10 files corpus-wide with a one-line cohesion judgment, type declarations (struct / class / final class / enum / actor / protocol / extension) counts per repo and ratios (struct vs class, final class share of classes), protocols with a single conformer (sample 20), extension-file conventions (Type+Feature.swift).
3. Language-feature adoption (count per repo and per 10k LOC, non-test): typed throws (throws(...)), some vs any in parameter position, primary associated types (protocol P<T>), parameter packs (each / repeat), ~Copyable, ~Escapable, consuming / borrowing / consume, Span / RawSpan / MutableSpan / InlineArray, macros declared (@freestanding / @attached / #externalMacro) and macro uses (#Preview, @Observable, #expect, @Test, @CasePathable, @DependencyClient, custom), result builders (@resultBuilder), @frozen / @inlinable / @usableFromInline / @_spi / @_implementationOnly / internal import / public import (SE-0409 access-level imports), @available annotations and deprecations, @MainActor annotations, if/switch expressions, consume operators. Design greps and validate them.
4. Safety and failure posture (non-test): force unwrap (design a heuristic for postfix ! that excludes != and prefix !, report FP rate), try!, as!, fatalError / preconditionFailure / precondition / assert / assertionFailure, implicitly unwrapped optionals (declared with a trailing !), unowned vs weak, unsafe pointer APIs (UnsafeMutablePointer, withUnsafe..., unsafeBitCast, Unmanaged), @unsafe and 'unsafe' expressions under strict memory safety (SE-0458).
5. Errors: error type declarations (enum vs struct conforming to Error), LocalizedError / CustomStringConvertible conformance, error wrapping patterns (an underlying error stored), Result use, rethrows, typed throws adoption points, 'catch {' blocks that swallow (empty or only print/log).
6. Global and static mutable state: static var and global var declarations (non-let) per repo, nonisolated(unsafe) on them, singletons ('static let shared'), and how each repo guards mutable statics.
7. RUN the compiler: pick 6 small/medium Linux-buildable packages (suggest apple__swift-log, apple__swift-system, apple__swift-argument-parser, apple__swift-async-algorithms, swift-server__swift-service-lifecycle, apple__swift-container-plugin; substitute if a build fails) and build each with swift 6.4: 'cd <clone> && timeout 900 ${RUN} swift build --scratch-path ${SCRATCH}/<name> 2>&1 | tail -n 40'. Record build time, warning count by diagnostic group if shown, and failures. Then build the same 6 with SWIFT_VERSION=6.3 to see the delta. Report every warning class seen.
Headline numbers first. Every number with its command.`,
  },
  {
    key: 'exemplar-concurrency',
    prompt: `${PREAMBLE('measuring concurrency posture across 40 exemplar repositories and running the compiler in strict modes; counts and commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (concurrency posture: isolation, Sendable, tasks, legacy concurrency, escape hatches)', RESEARCH + '/swift-audit/exemplar-concurrency.md')}
${ALL_NOTE} For every axis count in NON-TEST, non-generated code unless stated, per repo and per 10k LOC. Measurement axes:
1. Escape hatches (hypothesis H2): '@unchecked Sendable', 'nonisolated(unsafe)', '@preconcurrency import', '@preconcurrency' on conformances, 'assumeIsolated', 'MainActor.assumeIsolated', '@Sendable' closures, 'unsafe' with Sendable; for a sample of 25 '@unchecked Sendable' types across repos, classify what guards the state (Mutex from Synchronization, NIOLock/NIOLockedValueBox, OSAllocatedUnfairLock, os_unfair_lock, NSLock, pthread_mutex, DispatchQueue, atomics from swift-atomics or Synchronization.Atomic, immutable-only, nothing) and whether it is avoidable.
2. Isolation: actor declarations, global actors (@globalActor), @MainActor (type vs member vs function), nonisolated, isolated parameters, #isolation / isolation: parameters, @concurrent, nonisolated(nonsending), defaultIsolation(MainActor.self) settings in manifests or Xcode SWIFT_DEFAULT_ACTOR_ISOLATION (hypothesis H8), sending parameters/results.
3. Tasks: 'Task {' and 'Task(' unstructured creations, 'Task.detached', withTaskGroup / withThrowingTaskGroup / withDiscardingTaskGroup, async let, Task.checkCancellation / Task.isCancelled / withTaskCancellationHandler counts (cancellation awareness ratio), stored Task handles that get cancelled vs fire-and-forget (sample 20), Task.sleep(for:) vs Task.sleep(nanoseconds:), Clock / ContinuousClock / SuspendingClock injection.
4. Legacy concurrency still present: DispatchQueue / DispatchGroup / DispatchSemaphore (semaphore waits inside async contexts are a smell — find any), OperationQueue, completion-handler APIs (parameters named completion / completionHandler of function type), Combine imports and usage, withCheckedContinuation / withCheckedThrowingContinuation / withUnsafe*Continuation (unsafe share), Thread / pthread, NotificationCenter in async code.
5. AsyncSequence: AsyncStream / AsyncThrowingStream construction (makeStream(of:) vs closure init, buffering policies), custom AsyncSequence/AsyncIteratorProtocol conformances, swift-async-algorithms usage, for try await loops, unbounded buffers.
6. Language-mode posture: per package, which targets are in Swift 6 mode vs 5 mode, StrictConcurrency=complete, upcoming features enabled (NonisolatedNonsendingByDefault, InferIsolatedConformances, GlobalActorIsolatedTypesUsability, InferSendableFromCaptures, RegionBasedIsolation, MemberImportVisibility, ExistentialAny, InternalImportsByDefault, StrictMemorySafety).
7. RUN the compiler in stricter modes: choose 4 small packages that are in Swift 5 mode or have escape hatches (determine from axis 6; candidates apple__swift-log, Alamofire__Alamofire, kean__Nuke, pointfreeco__swift-snapshot-testing, swift-server__async-http-client) — copy each clone to ${FIX}/exemplar-concurrency/<name> (cp -r, excluding .git) and build with 'timeout 900 ${RUN} swift build --scratch-path ${SCRATCH}/conc-<name> -Xswiftc -swift-version -Xswiftc 6' and separately with '-Xswiftc -enable-upcoming-feature -Xswiftc NonisolatedNonsendingByDefault'; count errors and warnings by kind and quote 5 representative diagnostics per package. (Build failures on Linux due to Apple-only frameworks are a finding; record and move on.)
End with a ranked smells list (smell | repos | count | citation) and a patterns-worth-encoding list (pattern | exemplar citation).`,
  },
  {
    key: 'exemplar-quality-gates',
    prompt: `${PREAMBLE('measuring format, lint, test and CI gate configuration across 40 exemplar repositories and running the formatters/linters; counts and commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (format, lint, test frameworks, coverage, CI gates)', RESEARCH + '/swift-audit/exemplar-quality-gates.md')}
${ALL_NOTE} Measurement axes:
1. Formatter and linter config per repo (hypothesis H4): .swift-format (JSON; quote lineLength, indentation, the rules block — which rules are turned off or on vs defaults), .swiftformat (SwiftFormat options and --disable/--enable lists, --swiftversion), .swiftlint.yml (disabled_rules, opt_in_rules, only_rules, analyzer_rules, custom_rules, thresholds such as line_length / file_length / type_body_length / function_body_length / cyclomatic_complexity), .editorconfig, and whether CI enforces them (which workflow step, which command).
2. Test framework census (hypothesis H3): files importing XCTest vs Testing; @Test and @Suite counts vs XCTestCase subclasses and func test... methods; #expect / #require vs XCTAssert*; parameterized tests (@Test(arguments:)), traits (.tags, .serialized, .timeLimit, .enabled(if:), .bug), confirmation(), withKnownIssue, exit tests (#expect(processExitsWith:)), attachments; repos mid-migration (both). Snapshot testing (swift-snapshot-testing assertSnapshot / assertInlineSnapshot), custom-dump, XCUITest, performance tests (measure {}), benchmark packages (ordo-one package-benchmark).
3. CI workflows (.github/workflows/*.yml and any other CI): Swift versions in matrices (5.10 / 6.0 / 6.1 / 6.2 / 6.3 / 6.4 / nightly-main / nightly-6.x), OS legs (ubuntu / amazonlinux / rhel / debian, macOS with Xcode versions, windows, android, wasm, static-sdk / musl, embedded), use of swiftlang/github-workflows reusable workflows (which ones: soundness.yml, swift_package_test.yml, and their inputs such as api_breakage_check_enabled, format_check_enabled, license_header_check_enabled, docs_check_enabled, unacceptable_language_check_enabled, linux_exclude_swift_versions, enable_windows_checks) and apple/swift-nio's reusable workflows, swift build / test flags (-Xswiftc -warnings-as-errors, --explicit-target-dependency-import-check, --sanitize=thread / address, --enable-code-coverage, --parallel, -c release, --configuration), API breakage checks (swift package diagnose-api-breaking-changes), DocC builds, benchmarks, cache steps, pinned action SHAs vs tags.
4. Coverage: who collects it (llvm-cov export, codecov), thresholds if any.
5. Warnings policy: -warnings-as-errors or treatWarningsAsErrors / unsafeFlags(['-warnings-as-errors']) / the SE-0443 warning-control settings (treatWarning / .treatAllWarnings) in manifests or CI; per repo.
6. RUN the formatters and linters: on 6 repos (suggest apple__swift-log, apple__swift-argument-parser, Alamofire__Alamofire, hummingbird-project__hummingbird, kean__Nuke, swiftlang__swiftly): 'cd <clone> && timeout 900 ${RUN} swift format lint --recursive Sources 2>&1 | tail -n 5' and count findings by rule; 'timeout 900 ${RUN} swiftlint lint --quiet --reporter json Sources | python3 -I -c <a short counter by rule_id>' with the repo's own config if present and with defaults otherwise (say which); 'timeout 900 ${RUN} swiftformat --lint Sources 2>&1 | tail -n 5'. Report findings per rule, which rules dominate on idiomatic code (noise), and which catch real defects (sample 3 per top rule). Also print the full SwiftLint rule roster with 'swiftlint rules' (count total, opt-in, analyzer, correctable) and the swift-format rule list with 'swift format dump-configuration'.
Headline numbers first. Every number with its command.`,
  },
  {
    key: 'exemplar-packaging-and-release',
    prompt: `${PREAMBLE('measuring dependency, resolution, release, platform and Bazel configuration across 40 exemplar repositories; counts with commands, no rule decisions')}
${GROUND_CONTRACT('the exemplar corpus (SwiftPM dependency posture, plugins and macros, release engineering, platforms, Bazel-for-Swift, runtime posture for CLIs and I/O)', RESEARCH + '/swift-audit/exemplar-packaging-and-release.md')}
${ALL_NOTE} Measurement axes:
1. Resolution (hypothesis H5): Package.resolved committed or gitignored per repo (git ls-files, .gitignore lines), its originHash / version field, by repo shape (library vs executable vs app). Xcode-managed Package.resolved under .xcworkspace/xcshareddata/swiftpm.
2. Plugins and macros: build-tool plugins and command plugins declared or consumed (swift-openapi-generator, SwiftProtobuf, SwiftLint build plugin, DocC plugin swift-docc-plugin, swift-format plugin), macro targets and the swift-syntax dependency version ranges declared by macro packages (the swift-syntax version-range problem), prebuilt swift-syntax settings.
3. Release engineering: how executables are released (GitHub release workflows, swift build -c release flags, --static-swift-stdlib, -Xswiftc -static-executable, the static Linux SDK via --swift-sdk x86_64-swift-linux-musl, universal macOS binaries via --arch arm64 --arch x86_64, artifact bundles .artifactbundle / binaryTarget, XCFrameworks), version stamping (a generated Version.swift, git describe, a build plugin), Homebrew formulae, Mint, mise / swiftly / swiftenv, Docker images (Dockerfiles: base image swift:<v>-noble / -slim / -jammy, multi-stage, static stdlib), signing and notarization steps, SBOM / provenance attestations, tag conventions (v-prefixed or not — important: SwiftPM requires plain semver tags).
4. Platforms (hypothesis H6): conditional compilation census — #if os(Linux) / os(Windows) / os(macOS) / canImport(Darwin) / canImport(Glibc) / canImport(Musl) / canImport(FoundationEssentials) / canImport(FoundationNetworking) / os(WASI) / hasFeature(...) / compiler(>=6.x) / swift(>=...); imports of Foundation vs FoundationEssentials vs FoundationNetworking; which repos claim Windows / Android / Wasm / Embedded support and how they test it.
5. CLI and I/O runtime posture (the fleet-shaped surface): swift-argument-parser usage (AsyncParsableCommand, ExitCode, validate(), CommandConfiguration version strings), exit() calls, FileHandle.standardError writes vs print to stdout for errors, signal handling (DispatchSource.makeSignalSource, signal(), swift-service-lifecycle ServiceGroup graceful shutdown), process spawning (Foundation.Process, swiftlang/swift-subprocess, posix_spawn), file I/O and atomic writes (Data.write(options: .atomic), FileManager replaceItemAt, rename, swift-system FileDescriptor, NIOFileSystem), FilePath (swift-system) vs URL vs String paths, swift-log usage and log-level discipline, swift-metrics / swift-distributed-tracing.
6. Bazel for Swift: which exemplars carry MODULE.bazel / WORKSPACE / BUILD files with rules_swift (count, swift_library / swift_binary / swift_test usage, swift_deps / rules_swift_package_manager, toolchain registration on Linux); rules_swift's own examples and docs/ layout (read ${EX}/bazelbuild__rules_swift: its MODULE.bazel, doc/ and examples/) — what Linux toolchain setup it requires.
7. RUN SwiftPM tooling on 4 small packages (suggest apple__swift-log, apple__swift-system, apple__swift-argument-parser, swiftlang__swiftly): 'timeout 900 ${RUN} swift package describe --type json' (summarise), 'swift package show-dependencies --format json' where it has dependencies, and on apple__swift-log 'swift package diagnose-api-breaking-changes <a previous tag>' if the clone has enough history (it is depth-1, so this likely needs 'git fetch --depth' — do NOT fetch into the exemplar; instead copy it to ${FIX}/exemplar-packaging-and-release/ first, or record the gap). Also 'timeout 900 ${RUN} swift sdk list' and whether the static Linux SDK is installed in the image (it is probably not; record how it is installed: 'swift sdk install <url> --checksum <sha>').
Headline numbers first. Every number with its command.`,
  },
]

// ---------------------------------------------------------------- Scout
const SCOUTS = [
  {
    key: 'canonical',
    corpus: `CANONICAL GUIDES — sweep tables of contents; every section, item and checklist entry is a candidate.
Survey (fetch each; enumerate its sections): The Swift Programming Language book (docs.swift.org/swift-book — the Language Guide and Language Reference chapters, especially Concurrency, Macros, Error Handling, Memory Safety, Access Control, Generics, Opaque and Boxed Protocol Types; github.com/swiftlang/swift-book source), the API Design Guidelines (swift.org/documentation/api-design-guidelines), the Swift 6 migration guide (swift.org/migration — every chapter: data-race safety, migration strategy, common problems, incremental adoption, library evolution), swift.org documentation index (swift.org/documentation — Swift Package Manager docs at docs.swift.org/swiftpm/documentation/packagemanagerdocs, Swift Testing docs, DocC docs, server guides at swift.org/documentation/server, the Embedded Swift user manual, the static Linux SDK and Wasm SDK getting-started articles, cross-compilation, C++ interoperability docs, the Swift on Windows guide), the swiftlang/swift userdocs/diagnostics directory (the educational notes for diagnostic groups — enumerate every group and its note), the Swift Standard Library documentation pages for Synchronization (Mutex, Atomic), Span, InlineArray, the Observation framework, the Swift Testing documentation including 'Migrating a test from XCTest', and the swift-evolution proposal index (enumerate every proposal implemented in Swift 5.9 through 6.4 with its number and status). For each document record which sections are current and which are superseded by a newer Swift release.`,
  },
  {
    key: 'codified',
    corpus: `CODIFIED PRACTICE — rules somebody thought worth ENFORCING. Enumerate the complete catalogues, fetched not recalled.
Survey: SwiftLint's complete rule index (realm.github.io/SwiftLint/rule-directory.html, and run '${RUN} swiftlint rules' for the installed 0.65.1 roster — every rule identifier with kind, default/opt-in, correctable, analyzer), swift-format's rule list (swiftlang/swift-format Documentation/RuleDocumentation.md and 'swift format dump-configuration' via ${RUN}), SwiftFormat's rule list (nicklockwood/SwiftFormat Rules.md, every rule with default on/off), the Google Swift Style Guide (google.github.io/swift), the Airbnb Swift Style Guide (github.com/airbnb/swift — every rule heading, and which are autocorrected by their SwiftFormat config), the Kodeco / raywenderlich Swift style guide, LinkedIn's swift style guide, the compiler's own diagnostics as rules (strict concurrency, StrictMemorySafety (SE-0458) and its 'unsafe' warnings, ExistentialAny, the warning groups listed in swiftlang/swift userdocs/diagnostics), Swift's upcoming-feature flag list (the Features.def list in swiftlang/swift include/swift/Basic/Features.def — fetch it and list every UPCOMING_FEATURE with its SE number and the language mode that enables it), OWASP MASVS / MASTG iOS test cases relevant to Swift code, Apple's secure-coding guidance where still current, and CodeQL's Swift query suite (github/codeql swift/ql/src/queries — the security query list). Deliverable is coverage: for each catalogue, which checks catch mistakes an LLM-written diff characteristically makes, which are noise on idiomatic modern Swift, and which overlap.`,
  },
  {
    key: 'practitioner',
    corpus: `PRACTITIONER WRITING — argued positions with the reasoning, and when the book rule is wrong.
Survey authors and outlets the community cites by name: Matt Massicotte (massicotte.org — concurrency, isolation, the 'problematic patterns' series, his concurrency-recipes repo on GitHub), Holly Borla and John McCall and Doug Gregor (Swift Forums posts, vision documents in swiftlang/swift-evolution visions/ — approachable concurrency, memory safety, macros), Donny Wals, Antoine van der Lee (avanderlee.com / SwiftLee), John Sundell (swiftbysundell.com), Point-Free (pointfree.co blog and episodes notes; their libraries' design docs), Paul Hudson (hackingwithswift.com — 'what is new in Swift 6.x' articles), Ole Begemann (oleb.net), Jesse Squires, Rob Napier, Cocoa with Love (Matt Gallagher), objc.io (Swift Talk, 'Thinking in SwiftUI'), Majid Jabrayilov (swiftwithmajid.com), Natalia Panferova (nilcoalescing.com), Swift by Sundell podcast notes, Vincent Pradeilles, Becca Royal-Gordon / Slava Pestov (generics and type checker performance), the Swift Server Workgroup blog posts and Franz Busch / Cory Benfield / George Barnett (structured concurrency in servers, NIO and async), Adam Fowler (Hummingbird), the Swift.org blog. Extract argued POSITIONS: when to use actors vs Mutex vs MainActor, whether to adopt default MainActor isolation, protocol-oriented programming and its overuse, existential vs generic, dependency injection styles, Combine vs async sequences, ObservableObject vs @Observable migration, value types and copy-on-write, error modelling and typed throws restraint, macro cost (swift-syntax build times), testing style (Swift Testing vs XCTest, snapshot tests), architecture (TCA vs MV vs MVVM), force unwrap policy.`,
  },
  {
    key: 'failure',
    corpus: `FAILURE CORPUS — antipatterns, recurring review objections, postmortems, crash classes. This corpus finds what no curriculum lists.
Survey: the Swift Forums 'Using Swift' and 'Concurrency' categories for the most-viewed problem threads of 2024-2026 (actor reentrancy, Sendable errors with no good fix, 'sending' risks data race, MainActor deadlocks, Task priority inversion, continuation misuse — 'SWIFT TASK CONTINUATION MISUSE: leaked its continuation', withCheckedContinuation resumed twice), the Swift 6 migration guide's 'Common Compiler Errors' chapter, swiftlang/swift GitHub issues labelled concurrency or regression with the most reactions, Apple Developer Forums threads on Swift 6 migration and SwiftUI performance, crash classes (EXC_BREAKPOINT from force unwrap and precondition, dispatch_assert_queue failures in Swift 6 mode when a closure crosses isolation at runtime — the 'Incorrect actor executor assumption' crash family, overflow traps, out-of-bounds, unowned dereference, retain cycles in closures and Task captures, Task capturing self strongly forever, async let leaks), performance antipatterns (existential overhead, accidental copies of large structs and arrays (COW triggers), String index misuse O(n), excessive generic specialization and compile time, type-checker 'unable to type-check this expression in reasonable time'), SwiftPM failure modes (dependency resolution conflicts, swift-syntax version pinning conflicts across macro packages, unsafeFlags blocking dependency use, Package.resolved churn, binaryTarget checksum issues), security issues and CVEs in Swift server ecosystem (swift-nio, vapor, async-http-client advisories on GitHub Security Advisories), and code-review objection patterns from large Swift repos (search merged PR review comments in apple/swift-nio and pointfreeco repos via gh api if useful). Mark each failure with the Swift version it applies to and whether newer Swift fixed it.`,
  },
  {
    key: 'shifts',
    corpus: `RECENT SHIFTS — what changed in the last 18-24 months and what old advice it invalidates. Produce a 'use X not Y as of <version>' table.
Survey the release announcements and notes of Swift 6.0, 6.1, 6.2, 6.3 and 6.4 (swift.org/blog — fetch each 'Swift 6.x Released' post; 6.4.0 shipped 2026-09-14, verify its contents fully because it is newer than any model training data), the swiftlang/swift CHANGELOG.md (raw fetch, every 6.x entry), the SwiftPM CHANGELOG / release notes, Swift Testing release notes, the swift-evolution accepted and implemented proposals for 2025-2026 (enumerate with gh api over proposals/ and their Status lines), Xcode 26.x and Xcode 27 release notes on developer.apple.com (Swift-relevant items: default actor isolation in new projects, approachable concurrency build settings, explicitly built modules, Swift Build), WWDC 2025 and WWDC 2026 Swift sessions ('What's new in Swift', concurrency sessions), the Swift Build open-sourcing and SwiftPM's adoption of it, the Android workgroup and the Android SDK announcement, the Wasm SDK, the static Linux SDK changes, swift-java and C++ interop updates, Embedded Swift changes, swift-foundation progress (FoundationEssentials on Linux, Foundation re-core), the Swift Server ecosystem changes (swift-nio 2.x async APIs, grpc-swift-2, swift-subprocess 1.0, swift-configuration, swift-http-api-proposal if any), swiftly 1.x as the official installer, and any deprecations (e.g. swift-corelibs Foundation behaviours, XCTest on Linux, Combine status). For every shift: version, date, the older advice it invalidates, and how an agent trained on 2023-2024 Swift would get it wrong.`,
  },
  {
    key: 'ecosystem-tooling',
    corpus: `ECOSYSTEM AND TOOLING — SwiftPM, the build, release, CI, platforms, Bazel, codegen, docs, observability.
Survey the primary docs: SwiftPM documentation (docs.swift.org/swiftpm — PackageDescription API: every Package, Target, Product, SwiftSetting / LinkerSetting / CSetting member, traits, plugins API, 'swift package' subcommands; run '${RUN} swift package --help' and each subcommand's --help, 'swift build --help', 'swift test --help', 'swift sdk --help' to enumerate flags for the installed 6.4 toolchain), Package.resolved format and the originHash, the Swift Package Registry spec (SE-0292 and the registry service spec), the swiftlang/github-workflows repository (every reusable workflow and every input), swiftly docs, the static Linux SDK and Wasm SDK and Android SDK installation docs, Swift on Windows (swift.org install docs, the Windows workgroup), Embedded Swift docs, swift-docc and swift-docc-plugin docs (hosting, symbol links, documentation catalog), sourcekit-lsp configuration (.sourcekit-lsp/config.json), swift-format configuration docs, Docker official images (hub.docker.com/_/swift tags: noble, jammy, rhel-ubi9, amazonlinux2, -slim variants), rules_swift docs (github.com/bazelbuild/rules_swift doc/ — rules, toolchains, Linux setup, rules_swift_package_manager from cgrindel), Tuist and XcodeGen docs for app projects, swift-openapi-generator and swift-protobuf / grpc-swift-2 codegen plugin docs, swift-log / swift-metrics / swift-distributed-tracing / swift-service-lifecycle docs and their 'library vs application' guidance, package-benchmark (ordo-one) docs, and the SSWG package incubation process with its minimal requirements and graduation criteria (a codified quality bar for server packages). Deliverable: the tooling inventory with an adopt / keep / avoid verdict candidate per tool, and every topic a rule would need.`,
  },
  {
    key: 'domain',
    corpus: `FLEET-SHAPED DOMAIN — the Swift the fleet would write: CLIs that talk to OCI registries and manage content-addressed stores, SDKs that wrap a CLI, and long-running services.
Survey: CLI construction and contract (apple/swift-argument-parser documentation — ParsableCommand vs AsyncParsableCommand, ExitCode, CleanExit, validation, completion scripts, man-page plugin; the Command Line Interface Guidelines at clig.dev; exit-code conventions), process spawning (swiftlang/swift-subprocess — its API, 1.0 status, platform support; Foundation.Process pitfalls on Linux), file system and paths (apple/swift-system FilePath, FileDescriptor, Errno; swift-foundation FileManager on Linux; NIOFileSystem; atomic-write recipes: Data.write(options: .atomic) semantics on Linux, rename(2), fsync), terminal output and TTY detection (isatty, ANSI handling, swift-argument-parser help formatting), signals and graceful shutdown (swift-service-lifecycle ServiceGroup, UnixSignal, cancellation propagation), HTTP clients for registries (async-http-client vs URLSession on Linux and its FoundationNetworking gaps), OCI prior art in Swift (apple/containerization — its ContainerizationOCI module, content store, image unpacking; apple/swift-container-plugin — its registry client and layer building; apple/container CLI), hashing and content addressing (swift-crypto SHA256, streaming digests), JSON and Codable for on-disk and wire formats (JSONEncoder output determinism: .sortedKeys, date strategies, key strategies; swift-foundation's new JSON implementation), configuration (apple/swift-configuration if it exists as of 2026), logging for CLIs vs servers (swift-log handlers, LogHandler bootstrapping once), SDK wrapping a CLI (subprocess output parsing, error mapping, AsyncSequence of output lines), and testing CLIs (end-to-end with swift-subprocess or Process, golden files, Swift Testing exit tests). Cite real code in the exemplar corpus at ${EX} where it helps (apple__containerization, apple__swift-container-plugin, apple__container, swiftlang__swiftly, swiftlang__swift-package-manager).`,
  },
]

phase('Ground')
const grounds = GROUNDERS.map(g => () => agent(g.prompt, { label: 'ground:' + g.key, phase: 'Ground', schema: GROUND_SCHEMA, model: 'sonnet' }))
phase('Scout')
const scouts = SCOUTS.map(s => () => agent(
  PREAMBLE('corpus survey and web reading; discovery, not decisions') + '\n' + SCOUT_CONTRACT(s.corpus, RESEARCH + '/swift-topic-map/' + s.key + '.md'),
  { label: 'scout:' + s.key, phase: 'Scout', schema: SCOUT_SCHEMA, model: 'sonnet' }))
const results = await parallel([...grounds, ...scouts])
const out = { ground: {}, scout: {} }
GROUNDERS.forEach((g, i) => { out.ground[g.key] = results[i] })
SCOUTS.forEach((s, i) => { out.scout[s.key] = results[GROUNDERS.length + i] })
log('wave 1: ' + results.filter(Boolean).length + '/' + results.length + ' workers returned')
return out
