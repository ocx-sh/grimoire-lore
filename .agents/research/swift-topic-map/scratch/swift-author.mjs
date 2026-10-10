export const meta = {
  name: 'swift-author',
  description: 'Swift research program phase 7: sonnet drafters write the depth files of each rule from the consolidations, pipelined into one index drafter per rule; skills, shipped check scripts and the Bazel-Swift depth file draft alongside',
  phases: [
    { title: 'Depth', detail: 'one sonnet drafter per depth file' },
    { title: 'Index', detail: 'one sonnet drafter per rule index, after its depth files exist' },
    { title: 'Standalone', detail: 'check scripts, skills and the bazel-quality Swift depth file' },
  ],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/swift'
const RESEARCH = ROOT + '/.agents/research'
const DATE = '2026-10-10'
const RUN = '/home/mherwig/.cache/research-lang/swift-tools/run.sh'
const SLK = '/home/mherwig/.cache/research-lang/swift-tools/swiftlint-sk.sh'
const FIX = '/home/mherwig/.cache/research-lang/swift-tools/fixtures'
const MAP = RESEARCH + '/swift-topic-map.md'
const CHECKER = 'python3 -I ' + ROOT + '/.claude/skills/research-lang/scripts/check-artifacts.py'
const CHECK_TAIL = "--root /home/mherwig/.cache/research-lang/exemplars/swift/apple__containerization --allow-absent '**/.swiftformat' --allow-absent '**/.swiftlint.yml' --allow-absent '**/Package@swift-*.swift' --allow-absent '**/.swift-quality-depth-on-demand' --allow-absent '**/.swift-package-depth-on-demand' --forbid /home/ --forbid .cache/research-lang --forbid swiftlint-sk.sh"

const CONTEXT = `PROJECT CONTEXT (context for you, not content to reproduce):
- You are a drafter in phase 7 (Author) of the research-lang program for Swift (6.4 era), run from ${ROOT} (a git worktree — treat it as the repository root; never cd to /home/mherwig/dev/grimoire-lore). The artifacts you write are published through the lore catalog and loaded by coding agents without a human in the loop. Merging to main publishes; you write files, you never commit.
- BINDING INPUTS, read in this order before writing a line: (1) ${ROOT}/.claude/skills/research-lang/references/rule-distillation.md in full — selection, placement, index+support shape, rule anatomy, severity, writing for an agent reader, portability; (2) ${MAP} lines 2199 to the end ("## Authoring notes (binding on the drafters)", notes N-1 to N-14) in full, plus the two "(e) Cross-consolidation contradictions" lists at lines 1618-1687 and 1969-2198 — these are decisions already taken; you apply them, you do not re-take them; where a note and a consolidation disagree, the note wins; (3) the house exemplars: ${ROOT}/rules/go-quality.md (an index), ${ROOT}/rules/go-quality/concurrency.md (a depth file), ${ROOT}/rules/go-modules.md (a second index) — match their structure, register and density, not their content; (4) the consolidation(s) named in your brief, in full.
- The checker every file must pass: ${CHECKER} <your paths> ${CHECK_TAIL}. Run it on your own output before returning and fix every finding it reports for YOUR files (it may report findings in other drafters' files that do not exist yet — ignore those). Note N-10 lists the verification-cell shape rules it enforces; follow them exactly: explicit directory operand, one -e per alternative, quoted --include globs, no unquoted '**', no '$(...)', no angle-bracket placeholders inside a pattern, xargs -r, no unescaped pipe inside a table cell (put piped commands in a fenced block under the table and cite it by name), and say in every cell what empty output means. A table row whose first cell is a rule ID is a rule definition: define each ID in exactly one file; a skill that repeats a MUST uses | # | Finding | Rule | with the ID last.
- VERIFICATION HONESTY: a verification the consolidation records as watched red may be copied. A NEW or REWORDED command you write must be run: build a planted violation and a compliant twin under ${FIX}/author-<your-file-stem>/ and run it, with Swift commands through ${RUN} <cmd> (Docker swift:6.4; SWIFT_VERSION=6.3 for the prior line; cwd must be under /home/mherwig/.cache/research-lang or ${ROOT}; build with --scratch-path /home/mherwig/.cache/research-lang/swift-tools/build/author-<stem>; seccomp is unconfined so TSan works) and SourceKit SwiftLint through ${SLK} lint --no-cache (its image entrypoint is already swiftlint). The static swiftlint on run.sh's PATH silently skips custom_rules. A command you could not watch go red is written as a named reading heuristic instead, never as a command. Research-host specifics never appear in shipped text (N-6): no run.sh, no swiftlint-sk.sh, no /home or .cache paths, no fixture names, no run IDs; write "watched red (measured ${DATE})".
- Formatting constraints: this repo runs ruff format --check over markdown, so a fenced python block must be ruff-stable; Swift snippets are fenced swift and should be swift-format clean under the shipped 4-space/120-column config; YAML fenced yaml; JSON fenced json and valid; Starlark fenced starlark; shell fenced sh or bash. Every version-specific claim names the Swift or tool version and "(measured ${DATE})" or "(read ${DATE})" (N-9). No em dashes in prose; no semicolons in prose. Files over 100 lines carry a Contents line in the first 40 lines. Depth files never link to other depth files; they cite sibling families by ID only.
- Portability: the artifacts ship to strangers. No fleet paths, no OCX-internal hostnames, no .agents/research links, no repo@sha citations in shipped rule text unless the fact is load-bearing (then name the public project). OCX-specific commitments (the SDK wrapping the ocx CLI, Ocx names, OCX_SDK_EXE) are written as pinned defaults an adopter renames or overrides once (N-5).
- Budget: an index body under 200 lines; a depth file under 300 lines and usually 150 to 260; a SKILL.md body under 500 lines with references/ for depth. Rules that fail the four selection tests (agent gets it wrong unaided, checkable, changes a diff, no contradiction) are dropped, and the drop is recorded in your receipt with the ID, not silently.
- Use read-only tools everywhere except your own OUTPUT FILE(S) and your fixture directory. Do not edit a consolidation. Do not edit another drafter's file.
`

const DEPTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'lines', 'rule_ids_shipped', 'rule_ids_dropped', 'checker_clean', 'hoist_to_index', 'routing_row', 'commands_run'],
  properties: {
    path: { type: 'string' }, lines: { type: 'number' },
    rule_ids_shipped: { type: 'array', items: { type: 'string' } },
    rule_ids_dropped: { type: 'array', items: { type: 'string' }, description: 'ID: reason' },
    checker_clean: { type: 'boolean' },
    hoist_to_index: { type: 'array', items: { type: 'string' }, description: 'the 1-3 MUST rows from this file that belong in the index non-negotiables, as "ID: one-line rule"' },
    routing_row: { type: 'string', description: 'the task-worded "Doing..." phrase for the index routing table' },
    commands_run: { type: 'number', description: 'new or reworded verification commands watched red on a planted fixture' },
  },
}

const INDEX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['path', 'lines', 'non_negotiables', 'core_rule_ids', 'checker_clean', 'globs'],
  properties: {
    path: { type: 'string' }, lines: { type: 'number' },
    non_negotiables: { type: 'number' }, core_rule_ids: { type: 'array', items: { type: 'string' } },
    checker_clean: { type: 'boolean' }, globs: { type: 'array', items: { type: 'string' } },
  },
}

const STANDALONE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['paths', 'checker_clean', 'notes'],
  properties: { paths: { type: 'array', items: { type: 'string' } }, checker_clean: { type: 'boolean' }, notes: { type: 'array', items: { type: 'string' } } },
}

const D = (file, family, sources, task_hint, extra) => ({ file, family, sources, task_hint, extra })

const PLAN = {
  rules: [
    {
      rule: 'swift-quality',
      glob_list: ['**/*.swift'],
      core_family: 'SW-CORE',
      index_sources: ['swift-procedures.md', 'swift-gates.md', 'swift-frame.md'],
      extra: 'Apply N-1 (keywords line, says it ships beside swift-package in swift-essentials), N-3 in full (SW-CORE-01..06 and 09..21 as one-line rows, SW-CORE-07/08 retired line, the gate block commands citing SW-GATE-01 with steps 1, 1b never-gate.sh, 1c k07.sh, 2-5, the curated non-negotiables list of at most 25 lines including every ID N-3 names, the routing table with one row per family including SW-PKG/SW-GATE/SW-REL to swift-package and BZL-SWIFT to bazel-quality, Siblings with M-M-17 and M-M-18 named as sibling gaps, owner defaults Q1-Q8 one line each), N-7 (SW-CORE-16 gains the exit-0 Program crashed row, SW-CORE-18 carve-out). The check scripts live under rules/swift-quality/checks/ (written by a sibling drafter in parallel: k07.sh, never-gate.sh, swiftlint-gate.sh, tsan-check.sh, weaken-check.sh, canary.sh, generated-touch.sh, silence-check.sh, fold-check.sh, plus apple oracle files); name them by installed path in prose, never as Markdown links. The index must pass the 200-line body cap.',
      depth: [
        D('language.md', 'SW-LANG', ['swift-language.md'], 'writing any new Swift against the package tools version and language mode, choosing an idiom that changed between 6.0 and 6.4, using #if compiler/hasFeature/canImport guards, capturing self, or hitting type-checker time limits', 'Apply (e) 7, 8, 38, 39, 40 per N-2: SW-LANG-07 limit 200 is the gate, SW-LANG-02 canImport chain wins over literal first imports, SW-LANG-04 gains the hasAttribute(nonexhaustive) clause, weak let introduced in 6.2.3 but the declared floor stays 6.3 behind a guard.'),
        D('concurrency.md', 'SW-CONC', ['swift-concurrency.md'], 'adding Sendable conformances or escape hatches, choosing Mutex vs actor vs MainActor, creating Tasks, bridging callbacks with continuations, handling cancellation and timeouts, streaming with AsyncStream, or setting default isolation and upcoming concurrency features', 'Apply (e) 1, 2, 3, 5 and wave-2 (e) 2 per N-2/N-6: SW-CONC-04 drops "never a gate" and -require-explicit-sendable and cites SW-GATE-17; SW-CONC-27 drops "advisory only" and cites SW-GATE-27; SW-CONC-07 drops the --scratch-path claim; SW-CONC-12 points to SW-PKG-08; SW-CONC-03 drops its own CLI flag. Scripts S1-S9 as fenced blocks. Every exit-132 assertion states its backtracer setting (N-7).'),
        D('errors.md', 'SW-ERR', ['swift-errors.md'], 'declaring, throwing, wrapping, rendering or matching an error, choosing typed throws, force-unwrapping, using try!/as!/fatalError/precondition, or mapping errors to exit codes', 'Apply (e) 11 and 45 and wave-2 (e) 12-14, 16-17: drop the URLError branch of SW-ERR-18/20 (SW-NET-14 owns network errors); drop the "no production @nonexhaustive" clause (api K6).'),
        D('api-design.md', 'SW-API', ['swift-api.md'], 'designing or changing public API of a library or SDK: access levels, Sendable on public types, @frozen/@nonexhaustive, protocols vs generics, naming, deprecation, or shaping an SDK that wraps a CLI', 'Apply (e) 14 and 33: SW-API-13 owns the SDK fake-CLI test shape (Q-T8), the reference SDK package is NOT shipped (N-5), Ocx names are adopter-renamable examples.'),
        D('testing.md', 'SW-TEST', ['swift-testing.md'], 'writing or migrating tests: Swift Testing vs XCTest, waiting without sleep, process-global state, temp paths and ports, recorded fixtures and test seams, coverage gates, exit tests, TSan in tests', 'Apply (e) 14, 15, 34: SW-TEST-22 SDK scope as Q-T8 decides, drop SW-TEST-21 Bazel sentence, SW-TEST-17 cites SW-GATE-27 for the TSan job.'),
        D('cli-contract.md', 'SW-CLI', ['swift-cli.md'], 'writing a command-line executable: exit codes and the exit-status table, stdout/stderr discipline, SIGPIPE and closed streams, signals and shutdown, configuration and environment precedence, prompts, progress output', 'Apply (e) 6 and 13: SW-CLI-07 keeps only the one-file stdout/stderr rule; SW-CLI-25 applies SW-SEC-17 escaping at the root hook (not stripping). SW-CLI-27 appears as one retired line. SW-CLI-01 owns the exit-status table (N-4); D7/D10 exit 74; SW-CLI-29/30 SHOULD.'),
        D('io.md', 'SW-IO', ['swift-io.md'], 'spawning subprocesses, reading or writing files, atomic writes and durability, paths and FilePath, encoding JSON or other on-disk formats deterministically, or streaming large files', 'Apply (e) 25, 33 and wave-2 (e) 9, 19, 21, 22: SW-IO-26 keeps the one-spawn-module invariant, SW-IO-28 uses an AnyKey container; SW-REL-08 owns the FoundationEssentials size claim (it is a guard, not a size rule).'),
        D('network.md', 'SW-NET', ['swift-network.md'], 'making HTTP requests, choosing AsyncHTTPClient vs URLSession, handling redirects and credentials, timeouts, proxies, TLS trust, registry clients, or rendering network errors', 'Apply (e) 21. Timeouts 30 s connect and 120 s idle read, proxy variables upper case first (N-5). SW-NET-08 SSL_CERT_FILE note stays as written. SW-NET-18 cites SW-CLI-01 for exit statuses.'),
        D('security.md', 'SW-SEC', ['swift-security.md'], 'parsing untrusted input, extracting archives, handling secrets and credentials, writing to a terminal, using unsafe pointers or StrictMemorySafety, or checking dependency advisory floors', 'Apply (e) 10 and 13: SW-SEC-03 network branch uses the AHC body stream or collect(upTo:), never URLSession.bytes(for:); SW-SEC-17 escapes terminal text (MUST) and owns sanitizeForTerminal with its corpus; the SW-SEC-20 floor script ships as a fenced block.'),
        D('apple.md', 'SW-APPLE', ['swift-apple.md'], 'working in an Apple-platform app target: SwiftUI views and state, Observation, Xcode build settings and project files, availability, or main-actor UI code', 'Framed read-only (owner Q5): every macOS/Xcode behaviour is marked "unverified: read only". SW-APPLE-04 (iOS 18 floor) wins over the Mutex-everywhere default. The apple oracle files (swift-settings-oracle.txt, pbx-blocks.awk, body-len.awk) are written by the checks drafter under rules/swift-quality/checks/; name them by installed path.'),
      ],
    },
    {
      rule: 'swift-package',
      glob_list: ['**/Package.swift', '**/Package@swift-*.swift', '**/Package.resolved', '**/.swift-format', '**/.swiftformat', '**/.swiftlint.yml', '**/.swift-version', '**/.spi.yml'],
      core_family: 'SW-PKG',
      index_sources: ['swift-package.md', 'swift-gates.md', 'swift-release.md', 'swift-frame.md'],
      extra: 'Apply N-1 (exact 8 globs in order, keywords line, ships beside swift-quality in swift-essentials) and N-3: the index owns SW-PKG-01..38 outright as table rows, with the (e) 4, 43, 44 edits (SW-PKG-32 uses --target, never --targets; SW-PKG-21 gains "migrate edits the dead Package.swift"; SW-PKG-06 command wins over SW-CORE-04), the manifest skeleton including SW-API-09\'s two-target SDK shape ((e) 33), owner default Q1, and routes to gates.md (SW-GATE) and release.md (SW-REL). If 38 rows plus the skeleton cannot fit under 200 body lines, keep every MUST row in the index and move SHOULD/CONSIDER rows into a third depth file rules/swift-package/manifest.md (family stays SW-PKG, rows move whole, IDs unchanged) — say so in the receipt.',
      depth: [
        D('gates.md', 'SW-GATE', ['swift-gates.md'], 'setting up or changing format, lint, warnings-as-errors, warning groups, TSan, API-breakage, DocC or CI matrix gates, or editing .swift-format/.swiftlint.yml/.spi.yml', 'Apply (e) 16, 17, 20, 41 and N-8: SW-GATE-10 has no import canary (SW-CORE-03 owns the canary); SW-GATE-12 lists only its gate-specific extras (SW-CORE-01 owns the weaken list); the .swift-format (43 rules, 4/120) and .swiftlint.yml bodies live ONLY here as fenced blocks; the shipped scripts (k07.sh, never-gate.sh, swiftlint-gate.sh, tsan-check.sh) live under rules/swift-quality/checks/ and are named by installed path in prose; the exit-code contract table from N-10.'),
        D('release.md', 'SW-REL', ['swift-release.md'], 'building release binaries or images, choosing the static Linux SDK vs --static-swift-stdlib, checking the glibc floor, versioning and tagging, checksums, SBOM and provenance, or the API-breakage gate before a release', 'Apply (e) 9 and N-8: SW-REL-01 binds release jobs and shipped Dockerfiles only (CI matrix is SW-CORE-09) and drops the all-YAML operand; SW-REL-15 gains the CA-bundle SHOULD marked unverified: read only; SW-REL-08 says FoundationEssentials is a guard not a size rule; tags vX.Y.Z; stripped binaries with an unstripped CI artifact; CycloneDX only; images only when the owner asks.'),
      ],
    },
  ],
  standalone: [
    {
      kind: 'checks', path: ROOT + '/rules/swift-quality/checks/',
      sources: ['swift-gates.md', 'swift-procedures.md', 'swift-apple.md', 'swift-gates/lint-carriers-and-sanitizers.md', 'swift-procedures/upgrade-and-diagnose.md'],
      brief: 'Write the SHIPPED scripts and data files under rules/swift-quality/checks/ (house convention: rules/docs-quality/checks/). From [gates]: k07.sh in its SW-CORE-06 amended form (canary first, fail-closed with || exit 1, hatches need an adjacent reason comment, BASE-scoped in adopted repositories), never-gate.sh (mktemp overlay of the repo .swift-format, git diff --merge-base, exits 65/66), swiftlint-gate.sh (N-8: passes lint ... with no second swiftlint word because the image entrypoint is swiftlint; exits 70 on "Skipping enabled rule"), tsan-check.sh (fails only on "WARNING: ThreadSanitizer: data race", plus FATAL, failing tests, missing run line; exit 1 on a race, 70 on no passing run line; never on "Swift access race"; no suppressions). From [procedures]: weaken-check.sh, canary.sh, generated-touch.sh, silence-check.sh, fold-check.sh. From [apple]: swift-settings-oracle.txt, pbx-blocks.awk, body-len.awk, with the oracle regeneration command in a header comment. Every script: #!/usr/bin/env bash, set -euo pipefail where safe, a header comment naming the rule ID it enforces, its usage and its exit-code contract, POSIX-portable enough for Linux and macOS bash 3.2 (no mapfile, no ${var,,}), no research-host paths. Copy the consolidations\' watched-red versions; for every script, plant a violation and a twin under the fixture dir and run it (Swift-dependent steps through run.sh, SwiftLint through swiftlint-sk.sh while the shipped wrapper itself must call docker or swiftlint on PATH as the consolidation decided), and report each script\'s red and green exit codes in notes. Run shellcheck if available (it may not be; then bash -n each script). No .md file goes in checks/. The checker need not run on scripts.',
    },
    {
      kind: 'skill', path: ROOT + '/skills/swift-upgrade/SKILL.md',
      sources: ['swift-procedures.md', 'swift-procedures/upgrade-and-diagnose.md', 'swift-concurrency.md', 'swift-package.md', 'swift-language.md'],
      brief: 'Write the swift-upgrade skill (directory skills/swift-upgrade/, SKILL.md plus references/ if depth needs it). House shape: read ' + ROOT + '/skills/go-upgrade/SKILL.md and ' + ROOT + '/skills/nix-flake-adopt/SKILL.md first. N-11: procedures only, steps U0..U10 each citing the SW-CORE-04 and SW-CORE-09..15 IDs (and SW-PKG/SW-CONC IDs) it enforces; never restates rule text; any MUST it repeats is a | # | Finding | Rule | row with the ID last. Description under 1024 chars, third person, "Use when" clause naming Swift 6 language mode and Swift 6 concurrency migration, upcoming features, toolchain bumps, swift package migrate, the exact symptom phrases agents search for, and negative triggers (not for crash diagnosis: swift-diagnose; not for releases: swift-release). N-12: the dated re-checks table becomes numbered steps, each citing its source rule. Every run ends with the SW-CORE-21 receipt. SKILL.md body under 500 lines. Frontmatter fields as in the go skills (name, description, plus top-level summary/keywords/repository/license as the house uses).',
    },
    {
      kind: 'skill', path: ROOT + '/skills/swift-diagnose/SKILL.md',
      sources: ['swift-procedures.md', 'swift-procedures/upgrade-and-diagnose.md', 'swift-concurrency.md', 'swift-errors.md', 'swift-testing.md'],
      brief: 'Write the swift-diagnose skill (skills/swift-diagnose/SKILL.md plus references/ from the start: crash signatures including the N-7 exit-0 "Program crashed:" row, hang capture, backtrace settings, the type-check split). House shape: read ' + ROOT + '/skills/go-diagnose/SKILL.md and its references first. N-11: procedures only, citing SW-CORE-16..21 and the SW-CONC/SW-ERR/SW-TEST IDs it routes to; route by exit code plus first stderr line; any repeated MUST is a | # | Finding | Rule | row with the ID last. Description under 1024 chars, third person, "Use when", exact symptom phrases ("Illegal instruction", "exit code 132", "Fatal error: Unexpectedly found nil", "SWIFT TASK CONTINUATION MISUSE", "unable to type-check this expression in reasonable time", "ThreadSanitizer: data race", hangs and deadlocks), negative triggers (not for migrations: swift-upgrade). Every run ends with the SW-CORE-21 receipt. Body under 500 lines.',
    },
    {
      kind: 'skill', path: ROOT + '/skills/swift-release/SKILL.md',
      sources: ['swift-release.md', 'swift-gates.md', 'swift-package.md'],
      brief: 'Write the swift-release skill (skills/swift-release/SKILL.md plus references/ if needed). House shape: read ' + ROOT + '/skills/go-release/SKILL.md first. N-11: procedures only, steps citing SW-REL-01..22 and SW-GATE-20, plus the N-8 CA-bundle step whose own run is the check (marked unverified: read only); static Linux SDK build, glibc floor check, checksums, CycloneDX SBOM (--sbom-spec, 6.4), API-breakage gate, version stamping, vX.Y.Z tags, stripped binaries with unstripped CI artifact, images only when the owner asks. Any repeated MUST is a | # | Finding | Rule | row with the ID last. Description under 1024 chars, third person, "Use when", negative triggers. Every run ends with the SW-CORE-21 receipt. Body under 500 lines.',
    },
    {
      kind: 'bazel', path: ROOT + '/rules/bazel-quality/swift.md',
      sources: ['swift-bazel.md', ROOT + '/rules/bazel-quality.md', ROOT + '/rules/bazel-quality/go.md', ROOT + '/rules/bazel-quality/java.md'],
      brief: 'Apply N-13 exactly. Write rules/bazel-quality/swift.md (<= 200 lines, java.md/go.md shape: frontmatter = the comment line and never-matching paths glob "**/.bazel-quality-depth-on-demand" in the form of rules/code-docs/guards.md lines 1-7, then title and summary, "Owns BZL-SWIFT" paragraph naming what it does not own, sibling families cited never restated, Contents line, the measurement disclosure line, Gaps, What agents get wrong here; framed "if you adopt Bazel for Swift", BZL-SWIFT-01 the scope rule). In the same change and ONLY these edits outside your file: add one routing row to rules/bazel-quality.md, the keywords rules_swift, swift_library, swift_binary, swift_test, swift.toolchain, rules_swift_package_manager, add swift-quality and swift-package to its Siblings and *.swift to its "never loads on" line; bump publish.toml [rules.bazel-quality] version 0.3.0 -> 0.4.0 and fix its comment to fifteen depth files (eight by concern, seven by language: Rust, Python, TypeScript, C++, Go, Java/Kotlin, Swift) — verify the real count with ls rules/bazel-quality/ after your file exists; change "fourteen" to "fifteen" in docs/bazel-quality.md and update its body to mention Swift. Run the checker on rules/bazel-quality.md with its support directory (no --root/--allow-absent needed beyond the forbids). Report every edited path.',
    },
  ],
}

function depth(rule, d) {
  const out = ROOT + '/rules/' + rule.rule + '/' + d.file
  return agent(`Model rationale: sonnet at high effort — drafting rule text from consolidations whose decisions are already taken; the user's routing policy puts implementation and docs on sonnet.

${CONTEXT}

YOUR FILE: ${out}  (depth file of the ${rule.rule} rule; ID family ${d.family}; loads when the index routes here for: ${d.task_hint})
SOURCES (read in full): ${d.sources.map(s => RESEARCH + '/' + s).join(', ')}
${d.extra ? '\nADDITIONAL INSTRUCTIONS:\n' + d.extra + '\n' : ''}
Write the depth file: frontmatter exactly in the form of ${ROOT}/rules/code-docs/guards.md lines 1-7 — the comment line, then paths with the single never-matching glob "**/.${rule.rule}-depth-on-demand" (Claude Code autoloads every .md under .claude/rules/ that lacks a paths glob; this keeps the file on-demand), then title and summary naming the family and what it owns — one line naming the Swift and tool versions the rows bind to (N-9), a one-paragraph scope stating what the family owns and which sibling families own the neighbours (by family ID, never by file link), a Contents line, then sections grouped by the check that catches them — each section opens with the gate command(s) stated once and a rule table (| ID | Rule | Rationale | Verification | Severity |) whose rows keep their consolidation IDs verbatim, followed by at most one minimal wrong/right Swift snippet pair per section where the mistake is easier shown than told, then "## What Agents Get Wrong Here" ranked from the consolidation's failure modes. Apply the authoring notes: drop the IDs and clauses they name, keep the pinned defaults they set, cite the version floors. Then run the checker on your file, fix, and return the receipt (hoist_to_index names the 1-3 rows the index must carry as non-negotiables).`,
    { label: 'depth:' + rule.rule + '/' + d.file, phase: 'Depth', model: 'sonnet', effort: 'high', schema: DEPTH_SCHEMA })
}

function index(rule, depthReceipts) {
  const out = ROOT + '/rules/' + rule.rule + '.md'
  const ok = depthReceipts.filter(Boolean)
  return agent(`Model rationale: sonnet at xhigh effort — the index is the always-loaded surface; every line is paid for in every session, and it must agree with every depth file.

${CONTEXT}

YOUR FILE: ${out}  (the index of the ${rule.rule} rule)
GLOBS (decided by the authoring notes; copy exactly into frontmatter paths, double-quoted, in this order): ${JSON.stringify(rule.glob_list)}
DEPTH FILES already written by sibling drafters (read each in full): ${ok.map(r => r.path).join(', ')}
Their receipts (hoist candidates and routing phrases): ${JSON.stringify(ok.map(r => ({ path: r.path, hoist: r.hoist_to_index, routing: r.routing_row })))}
CONSOLIDATIONS for the index-owned ${rule.core_family} family and the gate: ${rule.index_sources.map(s => RESEARCH + '/' + s).join(', ')}
${rule.extra ? '\nADDITIONAL INSTRUCTIONS:\n' + rule.extra + '\n' : ''}
Write the index in the shape of ${ROOT}/rules/go-quality.md and ${ROOT}/rules/go-modules.md: frontmatter (paths = the globs above, summary, keywords, license Apache-2.0, repository https://github.com/ocx-sh/grimoire-lore — copy the exact field set the go indexes use), a two-line stance, Contents, the gate, Non-Negotiables, the rules this file owns, the routing table ("Where the Depth Is", one task-worded row per depth file and per sibling-set family the notes name), Severity, Siblings. Under 200 body lines. Every ID cited must be defined somewhere in the set (grep the depth files and the other index). Run the checker on the rule file with its support directory, fix, return the receipt.`,
    { label: 'index:' + rule.rule, phase: 'Index', model: 'sonnet', effort: 'xhigh', schema: INDEX_SCHEMA })
}

function standalone(item) {
  const why = item.kind === 'skill' ? 'a procedure agents run unattended; its steps and refusal conditions follow decisions already taken'
    : item.kind === 'checks' ? 'shell scripts with exit-code contracts, each watched red and green'
    : 'a depth file added to a published sibling set; it must match that set\'s contract exactly'
  return agent(`Model rationale: sonnet at high effort — ${why}.

${CONTEXT}

YOUR OUTPUT: ${item.path}
SOURCES (read in full): ${item.sources.map(s => s.startsWith('/') ? s : RESEARCH + '/' + s).join(', ')}

${item.brief}

Run the checker on your output where it applies, fix, return the receipt.`,
    { label: item.kind + ':' + item.path.split('/').filter(Boolean).slice(-2).join('/'), phase: 'Standalone', model: 'sonnet', effort: 'high', schema: STANDALONE_SCHEMA })
}

// ---------------------------------------------------------------- Run
const nDepth = PLAN.rules.reduce((n, r) => n + r.depth.length, 0)
log('Authoring: ' + PLAN.rules.length + ' rules, ' + nDepth + ' depth files, ' + PLAN.standalone.length + ' standalone')

const ruleResults = pipeline(
  PLAN.rules,
  rule => parallel(rule.depth.map(d => () => depth(rule, d))),
  (receipts, rule) => {
    const ok = receipts.filter(Boolean)
    if (ok.length < rule.depth.length) log(rule.rule + ': ' + (rule.depth.length - ok.length) + ' depth drafter(s) dropped; index proceeds with ' + ok.length)
    if (!ok.length) return { rule: rule.rule, depth: receipts, index: null }
    return index(rule, ok).then(ix => ({ rule: rule.rule, depth: receipts, index: ix }))
  },
)
const standaloneResults = parallel(PLAN.standalone.map(item => () => standalone(item)))
const [rules, standaloneOut] = await Promise.all([ruleResults, standaloneResults])

const dropped = rules.filter(Boolean).flatMap(r => (r.depth || []).filter(Boolean).flatMap(d => d.rule_ids_dropped || []))
const unclean = [
  ...rules.filter(Boolean).flatMap(r => (r.depth || []).filter(Boolean).filter(d => !d.checker_clean).map(d => d.path)),
  ...rules.filter(Boolean).filter(r => r.index && !r.index.checker_clean).map(r => r.index.path),
  ...standaloneOut.filter(Boolean).filter(s => !s.checker_clean).flatMap(s => s.paths),
]
log('Done: ' + rules.filter(r => r && r.index).length + '/' + PLAN.rules.length + ' indexes · ' + dropped.length + ' IDs dropped at authoring · ' + unclean.length + ' files still unclean')
return { rules, standalone: standaloneOut, dropped_ids: dropped, unclean }
