# Phase 8 failure classes (known)

1. check goes red on the pattern a sibling rule mandates (libc @preconcurrency chain vs k07 and weaken-check): catch by running every script over the shipped 'right' snippets of the other depth files
2. check coverage narrower than the rule text it enforces (raised timeout-minutes, .v5 in a list, quoted/spaced enable=no, Dockerfile.*): catch with one plant per enumerated item in the rule row
3. diff scoping errors (two-dot vs merge-base, untracked files, shallow CI clone, no origin in a new repo, nested Tests): catch with plants on a branch-behind, an untracked file, a depth-1 clone and a repo without origin
4. grep cell matches the installed rule set itself (targets-grep over .claude/): catch by running every named check on a fixture that has rules/ and skills/ copied into .claude/
5. count and exit-code drift against sibling artefacts (124 three vs four, gates.md tsan exit table, non-negotiable vs owning row, dropped scope): catch by grepping each cited ID and numeral in the sibling and comparing
6. awk state machine never resets (fold-check inloop): catch with a plant that places the violation after the construct's closing brace
7. noise on mature code (E08 simulated-work sleeps, comment-line hits, shared swiftSettings array): catch by classifying 20 hits per cell on 5 real trees
8. Check blind to the dominant violation form (S7 inferred-type AsyncStream, S4 @globalActor struct/enum, S5 package-wide masking): plant the idiomatic spelling of each violation, not only the one the drafter wrote; run on a real tree that is known to contain it (kean__Nuke ImageTask.swift:455)
9. Check prints on compliant code it prescribes (T03 guarded import Darwin, F-bands guarded forms, T10 @inline(__always) below a 6.3 floor, T07 non-redundant bindings, SW-CONC-26 NIO assumeIsolated, SW-CONC-15 awaited .wait()): run every cell on the twin written exactly as the sibling rule's right-hand example, and on 5 mature trees, and require the cell's stated pass signal
10. Cell contract wording does not match the script behaviour (S5 prints removal-build-exit but exits 0; 'Empty output = pass' beside 'every hit must sit inside a guard'): run the cell and read $? as the row says
11. Wrong-example does not reproduce (SW-LANG-07 wrong snippet compiles clean on 6.4): compile every 'wrong' block and require the stated diagnostic
12. Manifest-scanning grep with operand . and no --exclude-dir=.build (SW-CONC-11, -12, -35): plant .build/checkouts/dep/Package.swift and rerun
13. Version/era claim narrower than stated (SW-CONC-08 re-entry hangs only on 6.4, traps 132 on 6.3.3; SW-CONC-26 exit 132 under default backtracer only when main parks; @concurrent first-compiler row ignores 6.1.3 rename-to-@Sendable): run the claim on every leg the file binds to and on the floor-1 image
14. Sibling rules disagree (SW-CONC-12 @concurrent for CPU-bound async vs SW-CONC-23 not via @concurrent for CPU work over a few ms): grep both IDs and diff the scope sentences
15. Authoring-convention drift (N-9 upstream items unlinked, block names that label nothing, S1 git diff against a local main, S6 writes pkg.json, jargon): checker plus manual N-9/N-10 pass
16. False positive on the rule's own compliant shape: a scan flags the right-example the row prescribes (pubenum and N1 on the #if hasAttribute guard or own-line @available, jq on a .git URL, G7/G6/SW-API-04 on .build/checkouts). Catch: run every scan on the row's own 'right' snippet and on a tree after swift build.
17. False negative: a grep or scan that cannot go red on a variant of the violation (K1 on patterned catch, N1 on LocalizedError and extension conformance, SW-API-17 on digits and generics). Catch: plant one variant per syntactic form, not just the minimal one, and diff against the SwiftLint twin.
18. Contradicts a sibling ID: SW-API-12 against SW-IO-06 and SW-PKG-23 on traits, SW-ERR-17 'error:' against ArgumentParser's 'Error:', errors.md 'git diff --name-only' against SW-GATE-28. Catch: grep every cited ID's text and every quoted output string against a real run.
19. Vacuous changed-files list: a diff form that is empty in CI reads as a pass. Catch: run the list on a committed feature branch.
20. Operand `.` descends into .build dependency checkouts. Catch: run the cell after swift build in a package with dependencies, or require --exclude-dir=.build on every `.` operand.
21. False positive on mature code from a name-based pattern (K6 ErrorType generics 42/42 in swift-nio, N2 prose matches, pubenum namespace enums). Catch: sweep the five exemplar trees and classify hits.
22. Single-source restatement of K-07 patterns (SW-ERR-05 fallback, SW-API-10). Catch: grep checks/k07.sh patterns against every cell in the depth files.
23. Dependent-gate overlap: a compliant carve-out is printed by K-07 E09/E15. Catch: run checks/k07.sh on the shim twin.
24. check cannot go red on a MUST (grep evaded by a spelling the rule forbids, or silently empty when its base is absent): catch with a plant per forbidden spelling (multi-case line, trailing comment, sync try, dotted/array type, second call in the excluded dir, missing git base)
25. false positive on real tree: catch by running every cell over the five exemplar trees and classifying a random sample; anything above about 30 percent FP is narrowed or demoted
26. gate allowance stated in the rule but not implemented by the cell: catch by planting the allowed compliant form and requiring empty output
27. cell cannot be run as written (prose, placeholder, missing tool): catch by pasting each cell into a shell on a built fixture
28. stale or unverified floor/era claim: catch by compiling every API the rows recommend on the oldest leg (swift:6.2.0) and by checking each environment claim against the actual image
29. research-host label or rejected claim leaking into shipped text: catch by grepping for D-numbers, Q-T ids, and the N-6 list
30. fact owned twice (jq coverage filter, TSan pass criteria, exit table citation): catch by grepping each distinctive filter or sentence across rules/
31. noise-only cell: catch by counting hits on mature code, then demote to inventory/reading heuristic
32. check cannot go red (cached build prints no warning, GNU time absent so awk exits 0, split-line @Option layout, missing $BIN reads as 0) - caught by running every cell on a plant in the idiomatic layout, twice in a row, and with the tool absent
33. false positive or noise on mature code (unescaped dot, -F prefix match, NIO-named symbols, name collision with a repo's own HTTPClient, prose/comment hits) - caught by sweeping every grep over swift-log, swiftly, hummingbird, Nuke, swift-nio and classifying hits
34. contradicts a sibling ID (traits: [] vs default trait, 500 retried vs 69 non-retryable, tag list 1 MiB vs 4 MiB, 69 'unreachable' vs connect failure at 75) - caught by grepping every cited and overlapping ID in the other files and diffing the text
35. fact or rule restated in two files (AnyKey strict decode, 4 MiB capture default, registry body limits) - caught by grepping the distinctive phrase across rules/swift-quality
36. line-based grep silently misses wrapped code - caught by planting the swift-format wrapped layout
37. misleading or fixture-leaking verification text (sub-group-bad, 'default exit 1') - caught by re-running the cell as written and comparing with the rationale
38. scope or coverage sentence leaves rows unowned - caught by reading the scope list against the row list
39. unmeasured claim contradicting the row's own standard (JSONDecoder 512 cap on a 128 KiB stack) - caught by reproducing under the stated worst-case conditions
40. check cannot go red: path with a space, multi-line array syntax, unresolvable BASE, hard-coded placeholder path, generator YAML invisible (catch: plant in a dir named 'My App', plant the array form, run with a missing BASE, run the cell on a real app tree)
41. false positive on idiomatic or mature code: 10b zero-parameter onChange, 11 same-major minor, 09 @ObservableState substring, 03 repo-wide scope, 01b inherited value (catch: sweep real trees, classify hits, add a twin using the modern form)
42. census scope wider than rule scope: 10a whole tree vs 'new and touched' (catch: compare the cell operand set with the rule's stated scope)
43. contradiction with a sibling ID: SW-CONC-12 exemption vs SW-APPLE-05 (catch: grep each cited ID and diff the clauses)
44. unreproducible measured number: 387 Combine files (catch: re-run the stated measurement)
45. overclaim beyond the cited source or imprecise source wording: SW-APPLE-16, visionOS 'none listed' (catch: fetch the source and diff the wording)
46. Markdown structure defect the checker cannot see (closing fence glued to the last content line): caught by a fence-balance lint, or by extracting fenced blocks with a CommonMark parser and asserting each block holds no table row or heading
47. Shipped command is not runnable as written on a plain fixture tree (relative checks/ path, missing swift-docc-plugin dependency, origin/main absent, strace absent): caught by running the done-gate block end to end on a package built from the skeleton
48. Version-floor claim not run on the floor image (ExplicitSendable group is 6.3, StrictLanguageFeatures is 6.2): caught by building the skeleton on the swift:6.2.0 and swift:6.1 images with -Xswiftc -warnings-as-errors
49. Cell scope wider than the rule (nested Benchmarks, IntegrationTests and Tests manifests; description prose in workflows; the recipe's own unstripped twin): caught by the real-tree sweep, classify hits
50. Contradiction with a sibling ID (SW-GATE-08 vs SW-CORE-09; SW-PKG-32 vs SW-CORE-12 on non-migratable features): caught by grepping each cited ID and reading both texts
51. Research-host leakage (fixture symbol crashy, RELCLI_VERSION, 'during the research'): caught by grep for the N-6 forbidden fixture names
52. Preamble or arithmetic misstatement (empty output with exit 0 for grep; 5x for 138 MB vs 55.8 MB): caught by running one grep cell on a twin and reading the exit status, and recomputing every ratio
53. Locale-fragile pattern (Couldn.t against a 3-byte apostrophe in the C locale of the swift image): caught by running the cell inside the swift image without LANG
54. Rule an agent already follows (SemVer patch rule, never move a pushed tag): deletion test
55. Verification function blind to part of the tree (count and the done test ignore non-Sources dirs, Tests, and failed builds); caught by planting a test-only error, an Alamofire-style `path: "Source"` target and a broken manifest and requiring count to go non-zero
56. Restated command weaker than the owner rule's named block (hatch-delta, flag-grep); caught by diffing every skill snippet against the owner block and planting an untracked-file hatch and a manifest unsafeFlags
57. Procedure contradicts its own stop condition or pinned default on its own exemplar (S2 Mutex vs macOS 10.15 floor, S4 @concurrent public, U2 tools 6.2 vs CLI 6.4, tools 5.x flipping to mode 6); caught only by running the skill literally on the exemplar
58. Measured number not reproducible or internally inconsistent (-swift-version 6: 9 vs 1-4 vs 10/14; U4 equals 13 vs 17; 12 literals vs U9 target rule; five vs six flip warnings); caught by re-measuring each quoted figure on both images
59. Shell state assumed to persist between steps (count, S, BASE, FLOOR); caught by running each step in a fresh shell, as the Bash tool does
60. Undeclared external dependency (jq, docker, checks/ install path, sibling rule sets); caught by running the step in the bare swift image
61. Receipt or gate shape that cannot be filled honestly (17 re-checks each STILL/FLIPPED, no baseline gate record, done test red at baseline for a non-Sources reason); caught by filling the receipt on a real tree
62. Multi-manifest tree: the leg that is verified reads a different Package@swift-X.swift than the one edited; caught by dump-package on each leg image
63. Budget: reference over 300 lines (dated-rechecks.md 462)
64. Route key not surfaced by the prescribed capture command (head -n 3 cannot show line 4). Catch: replay the route command on a plant per row and assert the keyed substring is in the printed output.
65. Locator pinned to a position that varies (thread 0 holds the blocked frame only for a directly blocking main thread). Catch: plant the same defect in two call shapes (direct, via Task { @MainActor }) and replay the route.
66. Procedure order destroys the evidence a later step needs (timeout orphans the test runner, then SIGQUIT to the orphan loses the dump). Catch: run the steps in the order written, end to end, on one hung swift test.
67. Mechanism generalised from one plant (exit 0 needs a libc usleep/sleep main, Foundation Thread.sleep and dispatchMain give 132). Catch: vary the plant's main-thread wait and the trap site before stating a cause.
68. Route table dead end or gap (132 with empty stderr after the enable=no rerun, release Array index trap with neither Fatal error nor Swift runtime failure). Catch: a trap matrix in debug and release where every cell must land on a row.
69. Check cannot go red on its MUST class (backtrace-grep catches 1 of 8 carriers, weaken/silence scripts miss 4 of 8 table rows). Catch: one plant per row of the table the check claims to cover, plus a twin.
70. Contradiction with sibling ID (SW-CORE-16 says 124 covers three causes, the skill says four). Catch: grep every cited ID and diff counts and quoted strings.
71. Research-host wording and triplicated facts (from the concurrency research; route table, capture script and grep each in two or three files; Never-edit table already diverged from SW-CORE-17). Catch: grep for research, run-ID and consolidation words, and diff duplicate blocks.
72. check cannot go red: a pipeline swallows the producer's failure, so empty output reads as pass. Caught by running each check against a plant where the producer itself fails (missing binary, unknown product, missing second build) and requiring non-empty output or non-zero exit
73. scope wider than the rule it cites, false positive on a real tree (P2 flags test-matrix floor legs, step 2 lock lines fail on a zero-dependency CLI). Caught by running the scan on an unmodified real tree and diffing each hit against the rule's stated scope
74. command fails or silently does the wrong thing as written (arm64 strip, Dockerfile without --product, nonexistent swift:X-ubi9 tag, strace absent from the swift image, Swift Build expanding $(...) in plugin args). Caught only by running the skill literally end to end on a real executable
75. pattern narrower than the sibling rule's own check (P8 misses --swift-sdk=, workflow greps skip *.yaml, step 10 omits attestations: write, image checks omit the exec-form ENTRYPOINT). Caught by diffing each skill command against the verification cell of the rule ID it cites and by a plant using the unhandled spelling
76. internal or sibling contradiction (one SDK bundle for both toolchains vs exact match, library scope vs steps skipped, Step 7b does not exist). Caught by grepping every step and rule-ID reference in the skill against the files it points to
77. portability and era residue (research host, RELCLI_VERSION, essentials, undated glibc facts). Caught by a grep for research-host terms and a read for N-9 dating
78. budget headroom: SKILL.md body 496 of 500 lines, so every fix above must be paid for by a deletion. Caught by the checker plus an awk body count
79. check covers one half of a two-part rule (K4 platform-config, H2 cc exec, W4 per-package, 07 workspace-wide): plant each clause separately and require the cell to go red
80. rule broader than its evidence (BZL-SWIFT-04 'never', agents-get-wrong #3 'every dependency'): run the carve-out case (hermetic plus switch; a clean third-party package) and re-grep the real exemplar for the banned token
81. doc-versus-code claim never re-read from the shipped artifact (alwayslink table, debug_module_path): grep the downloaded rules_swift 4.2.1 source and generated docs for each claimed drift
82. cross-file contradiction left as a Gaps note (BZL-HERM-07 has no Swift carve-out): run the sibling rule's own cell on a Swift-only tree and apply it
83. grep cells matching comments, unlisted rc names or a hard-coded directory operand: add a commented-out plant, an imported rc plant and a layout without Tests
84. vacuous green build cell (feature absent, or warm cache replaying an unsandboxed build): pair every 'build exits 0' cell with a presence grep and require a clean output base
85. shipped-text portability and bookkeeping drift (fixture counts, check labels, N-13 glob, bazel-essentials counts, wrong ID owner): grep the file for host specifics and cross-check cited IDs and counts against the sibling files

# Residual classes (consistency pass)

- Command blocks duplicated between a rule and its skill (release stamp-check, repro-check and the glibc-floor awk in release.md and swift-release; the toolchain-pin grep inside swift-upgrade SKILL.md and toolchain-pin.md): identical now, but each is a drift point; a later round should keep one copy and cite it.
- Check scripts that stay blind by design and are only prose-documented: silence-check.sh does not see a raised .timeLimit, a cast other than as!, or a TSan suppression kept in a file not named *.supp (weaken-check pathspec is *.supp only). The skill sentence says so, but no gate fails.
- Shipped-text versus research-note drift: topic-map N-7, N-13 and the debug_module_path rejected-claim line disagree with the measured/shipped wording. A research-notes owner should reconcile before the next consolidation reuses them.
- Open owner decisions that no fixer may close: SW-LANG-13 scope, SW-NET-19 keep or drop, trigger-eval record for the skills, docs/bazel-essentials.md counts, on-demand glob on the 14 older bazel depth files, and the checker not flagging glued code fences.
- Rule-to-rule citation drift after parallel edits is only partly mechanical: the ID sweep proves every cited ID is defined once, but whether a cited row still says what the citing line claims was checked by reading for the 25 rows whose text changed and the skills' Finding tables; any rule edited after this pass needs the same citer check.
- Verification cells that depend on tools this host lacks (macOS, Windows, pty/script) remain labelled reading heuristics or unverified: read only; they cannot go red on this host.
