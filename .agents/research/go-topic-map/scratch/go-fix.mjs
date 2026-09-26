export const meta = {
  name: 'go-fix',
  description: 'Go research program phase 8: one fixer per drafted file applies the reviewers exact fix text (opus where a blocker is among them, sonnet otherwise), re-runs the checker, and reports what it applied and what it refused',
  phases: [{ title: 'Fix', detail: 'one fixer per file with findings' }],
}

const ROOT = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/go'
// FILES = [{ file, model, checker_target, findings: [{ line, severity, kind, finding, fix }] }]
const FILES = [
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/docs/bazel-quality.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/docs/bazel-quality.md",
  "findings": [
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "docs/bazel-quality.md",
    "line": 4,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "N-13 requires docs/bazel-quality.md to be updated in the same change. The file is untouched and now wrong: it says thirteen depth files, a 165-line index, 353 depth rules and five languages, and its Siblings omit go-modules and go-quality.",
    "fix": "Line 4: `thirteen depth files` -> `fourteen depth files`. Line 14: `165 lines` -> `168 lines`. Lines 51-55: `353 further rules live in thirteen` -> `368 further rules live in fourteen`, and `five by language\n(Rust, Python, TypeScript, C++, and Java with Kotlin)` -> `six by language\n(Rust, Python, TypeScript, C++, Java with Kotlin, and Go, if you adopt Bazel for Go)`. Siblings (lines 90-92): `rust-cargo`, `python-packaging` and `typescript-packaging` -> `rust-cargo`, `python-packaging`, `typescript-packaging` and `go-modules`, and `rust-quality`, `python-quality` and\n`typescript-quality` -> `rust-quality`, `python-quality`, `typescript-quality` and `go-quality`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/bazel-quality.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/bazel-quality.md",
  "findings": [
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality.md",
    "line": 41,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The index says every rule set here was measured on 8.7.0, 8.8.0 and 9.2.0 (2026-09-06), and that a rule naming no version held on both majors. go.md line 39 says no 8.x leg was run, and it was measured on 2026-09-26. Once go.md is added, the two files give different answers to 'which Bazel versions does this row hold on'.",
    "fix": "Replace `defaults on \u2014 and every rule set here was measured on 8.7.0, 8.8.0 and 9.2.0\n(2026-09-06).` with `defaults on \u2014 and every rule set here was measured on 8.7.0, 8.8.0 and 9.2.0\n(2026-09-06), except `java.md` and `go.md`, whose own measurement disclosure governs.`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/bazel-quality/go.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/bazel-quality.md",
  "findings": [
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality/go.md",
    "line": 130,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "BZL-GO-09's `-X` grep cannot go red on any BUILD file that passes this set's own buildifier gate. buildifier 6.1.1 rewrites `gc_linkopts = [\"-X\", \"main.version=v1.2.3\"]` onto several lines, which puts `\"-X\",` on a line of its own. After that, `grep ... -e 'gc_linkopts.*-X' -e 'ldflags.*-X' .` exits 1 with empty output, and the row reads that as a pass. The cell's claim that it was watched red on a gc_linkopts plant holds only for a single-line plant that buildifier has not formatted. Fixture: review-bazel-go/linkopts-bfy.",
    "fix": "In the BZL-GO-09 Verification cell, replace `grep -rn --include='BUILD*' --include='*.bzl' -e 'gc_linkopts.*-X' -e 'ldflags.*-X' .` with `grep -rn --include='BUILD*' --include='*.bzl' -e 'gc_linkopts.*-X' -e 'ldflags.*-X' -e '\"-X\"' -e '\"-X ' .`, and replace `and on a `gc_linkopts` plant.` with `and on a buildifier-formatted `gc_linkopts` plant, where `\"-X\"` sits on its own line.` (Tested: the new form goes red on the formatted plant and stays green on the x_defs twin.)"
   },
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality/go.md",
    "line": 113,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "BZL-GO-10's workflow grep misses the most common GitHub Actions form, an `env:` map (`GOOS: windows` / `GOARCH: arm64`) on a job whose step runs `bazel build`. On that plant the grep exits 1 with empty output, which is a false pass. It went red only on the inline `GOOS=... bazel build` form. Fixtures: g10-red-envmap, g10-red-inline, g10-green.",
    "fix": "Replace `grep -rn -e 'GOOS=' -e 'GOARCH=' .github/workflows` with `grep -rn -e 'GOOS=' -e 'GOARCH=' -e 'GOOS:' -e 'GOARCH:' .github/workflows`, and replace `**a hit on a step that runs `bazel` is the finding.**` with `**a hit on, or an `env:` map above, a step that runs `bazel` is the finding.**`"
   },
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality/go.md",
    "line": 96,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The BZL-GO-05 registration check stays silent when the registration line is commented out (`# go_sdk.nogo(nogo = \"//tools:my_nogo\")`), because the MODULE.bazel pattern is not anchored. An unregistered nogo therefore passes. Fixture: g05-commented. With the pattern anchored, that plant printed FINDING and the registered twin stayed empty.",
    "fix": "Replace `! grep -qs -e 'go_sdk.nogo(' MODULE.bazel` with `! grep -qs -e '^go_sdk.nogo(' MODULE.bazel` in the fenced registration check."
   },
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality/go.md",
    "line": 132,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "BZL-GO-15's config grep looks for `--strip=never` anywhere in any rc file. In a mixed repository, a `build:asan ... --strip=never` line (the shape BZL-CC-18 requires) satisfies it while the `release` config still strips. Fixture g15-mixed: the grep as written printed the asan line, which the cell reads as a pass. The tightened form exited 1 there and matched g15-green.",
    "fix": "Replace `grep -rn --include='*bazelrc*' -e '--strip=never' -e '--strip never' .` with `grep -rn --include='*bazelrc*' -e 'build:release.*--strip=never' -e 'build:release.*--strip never' .`"
   },
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality/go.md",
    "line": 43,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The line credits reading a ruleset's version from the BCR's `metadata.json` to BZL-FLAG-28. BZL-FLAG-28 actually says to list the GitHub releases and sort them by semver. The `metadata.json` check belongs to BZL-ARCH-11, verification (1), and the consolidation cites both IDs. Failure mode 2 at line 161 repeats the miscitation.",
    "fix": "Line 43: replace `metadata.json` (BZL-FLAG-28).` with `metadata.json` (BZL-ARCH-11, BZL-FLAG-28).`. Line 161: replace `(BZL-FLAG-28).` with `(BZL-ARCH-11, BZL-FLAG-28).`"
   },
   {
    "set": "bazel-quality/go.md + bazel-quality.md Go routing edits (BZL-GO)",
    "file": "rules/bazel-quality/go.md",
    "line": 79,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The nogo snippet is introduced as 'the registered shape, measured red and green', but it has no `load()` for `nogo` and `TOOLS_NOGO`. Copied as written, it fails at load time, and it breaks index non-negotiable 1 (load every symbol explicitly). The drafter's own fixture (author-go/reg/BUILD.bazel) carries the load line.",
    "fix": "After the line `# root BUILD.bazel` insert `load(\"@rules_go//go:def.bzl\", \"TOOLS_NOGO\", \"nogo\")` followed by one blank line."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-modules.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-modules.md",
  "findings": [
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules.md",
    "line": 146,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Routing ping-pong. This row sends 'a Makefile, workflow, Dockerfile or .go-version that runs Go' to go-quality, but rules/go-quality.md:138 sends 'a .go-version file ... or a Makefile or CI workflow that runs the gate' back to go-modules. N-1 makes go-quality the router for these residual misses, and every workflow rule (GO-MOD-16/17/18, GO-GATE-04/07/08, GO-REL-06/11/12) lives in this set. So an agent that follows this row away from go-modules while editing a workflow loses exactly the rules that govern it.",
    "fix": "Replace the row with: | Editing any `*.go` file, or the `ENV` lines of a `Dockerfile` that runs Go | `go-quality` (sibling set, below) |"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules.md",
    "line": 91,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Non-negotiable 9 says 'neither the SDK nor a library carries a tool directive' under a header that says every line blocks a merge. Its owner row GO-MOD-11 (line 117, and go-modules.md consolidation) is MUST only for the SDK and SHOULD for a library. So the two rows give a library `tool` line two different severities.",
    "fix": "| 9 | The SDK's runtime import graph is stdlib-only, and the SDK carries no `tool` directive (in a library it is SHOULD, GO-MOD-11). | GO-MOD-10, GO-MOD-11 |"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules.md",
    "line": 83,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "Non-negotiable 1 makes 'say whether empty output is the pass or the finding' merge-blocking and cites GO-CORE-03, but GO-CORE-03 is SHOULD in its owner table (rules/go-quality.md). The go-quality index's own hoist (its line 18) cites only GO-CORE-01/02.",
    "fix": "| 1 | Never reach green by weakening the check (a dropped gate step, a linter or setting removed from the copied golangci file, a bare `//nolint`, `-mod=mod`, `-buildvcs=false`), and never trust a verification nobody watched go red. | GO-CORE-01, GO-CORE-02 |"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules.md",
    "line": 103,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "'Run each verification from the module root' conflicts with the `.github` greps in GO-MOD-03, GO-MOD-16, GO-MOD-17 and GO-MOD-18. `.github` lives at the repository root. From a nested module root (the GO-REL-14 shape), grep exits 2, and GO-MOD-17 counts exit 2 as the finding, which is a false red.",
    "fix": "The GO-MOD family is defined here and nowhere else. Run each verification from the module root, except the `.github` greps in GO-MOD-03 and GO-MOD-16 to 18, which run from the repository root."
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules.md",
    "line": 58,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The index calls its block 'the manifest slice of GO-GATE-01's full ordered block', but it adds `golangci-lint config verify`, which is not a GO-GATE-01 step. It also orders steps as tidy, build, vet, lint, govulncheck, while GO-GATE-01 says to run them 'in order' as vet, lint, build, tidy, govulncheck.",
    "fix": "Replace the first sentence with: These are the manifest-facing checks. `go mod tidy -diff`, `go build`, `go vet`, `golangci-lint run` and `govulncheck` are GO-GATE-01 steps 7, 5, 2, 3 and 8, and CI runs them in GO-GATE-01's order. `config verify` is GO-GATE-09's config-change check, not a gate step."
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules.md",
    "line": 134,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "GO-MOD-16's behaviour claims (a patch-bearing `go-version-file` line installs that exact patch, and `check-latest` cannot move an exact patch) are setup-go-version-specific. The consolidation's floor is setup-go v6, and the row names no version.",
    "fix": "Append to the Rationale cell: (setup-go v6, read 2026-09-26)."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-modules/gates.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-modules.md",
  "findings": [
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/gates.md",
    "line": 113,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-GATE-10 grep false-reds on a compliant repository. `grep -rc --include='*golangci*'` also counts the golangci workflow that the go-modules glob loads on purpose. Watched: the shipped baseline plus `.github/workflows/golangci-lint.yml` printed `.golangci.yml:3` and `.github/workflows/golangci-lint.yml:0`, so the stated 'any count below 3' reads as a finding. The consolidation's check was behavioural, not this grep.",
    "fix": "Replace the Verification cell with: `grep -c -e '^[^#]*uniq-by-line: false' -e '^[^#]*max-issues-per-linter: 0' -e '^[^#]*max-same-issues: 0' .golangci.yml`, run from the module root, prints one count, and any count below 3 is the finding. (Watched: 3 on the shipped baseline, 0 on a planted default config.)"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/gates.md",
    "line": 75,
    "severity": "nit",
    "kind": "style",
    "finding": "The GO-GATE-04 Verification cell does not state what empty output means (N-10).",
    "fix": "Append: 'Empty output is the pass.'"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-modules/release.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-modules.md",
  "findings": [
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/release.md",
    "line": 152,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "The GO-REL-11 MUST prescribes `subject-checksums: dist/checksums.txt` and states that `subject-path: dist/<tool>-*` matches only the SBOMs '(measured 2026-09-26)'. The consolidation (go-release.md:94) prescribes `subject-path: dist/<tool>-*`, and no authoring note or (e) resolution ratifies the change. The departure comes from author-receipt.json:518, which says 'needs an orchestrator decision'. The claim looks true: the release-dist snapshot listing has only `mytool-*.spdx.sbom.json` at the dist root, and the binaries sit under `mytool_<os>_<arch>_v*/`. It is still unratified.",
    "fix": "No text change in release.md. Ratify the departure. Append to go-topic-map.md \u203a Authoring notes: 'N-15. GO-REL-11 uses `subject-checksums: dist/checksums.txt`. On goreleaser 2.17.1 with `formats: [binary]`, `subject-path: dist/<tool>-*` matches only the `.spdx.sbom.json` files (author-go-release snapshot and go-release-consolidation/release-dist listing, 2026-09-26).' Then amend go-release.md GO-REL-11 in place to match. If the orchestrator declines, revert the row to the consolidation text."
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/release.md",
    "line": 76,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "The GO-REL-01 rationale says '`{{.Date}}` resolves to the commit time under goreleaser 2.17.1 (measured 2026-09-26)'. The consolidation classes `{{.Date}}` as wall clock (go-release.md:156, the golangci-lint violation row), and no note ratifies the reversal. Its only source is author-receipt.json:519, flagged as a contradiction for the orchestrator. The rule text (ban every date stamp) still matches the consolidation, so only the rationale departs.",
    "fix": "Ratify with an authoring note: 'N-16. goreleaser 2.17.1 resolves {{ .Date }} to the commit time (author-go-release v-date fixture, 2026-09-26). GO-REL-01 keeps its ban because a date stamp duplicates vcs.time.' Then amend go-release.md's GO-REL-01 rationale and its violations row. Otherwise replace the sentence with: 'A date stamp only duplicates `vcs.time`, so the rule bans `{{.Date}}` too.'"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/release.md",
    "line": 138,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-REL-07 grep false-reds on any repo whose release workflow is named `goreleaser.yml`, because `--include='*goreleaser*.y*ml'` also matches `.github/workflows/goreleaser.yml`, which never starts with `version: 2`. Watched: a compliant `.goreleaser.yaml` plus that workflow listed the workflow.",
    "fix": "`grep -rL --include='*goreleaser*.y*ml' --exclude-dir=.github -e '^version: *2$' .` lists configs that lack the line. Any output is the finding, and empty output is the pass. (Watched: empty on the compliant twin, lists `.goreleaser.yaml` on the violation.)"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/release.md",
    "line": 80,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-REL-05 grep `-e '-s -w'` misses the common list form (`ldflags:` with `- -s` and `- -w` on separate lines) and the reversed `-w -s`. Watched: exit 1 on a config that strips, which the cell calls 'the rule is met'.",
    "fix": "`grep -rn --include='*goreleaser*.y*ml' --exclude-dir=.github -e '-s -w' -e '-w -s' -e '^[[:space:]]*- -s[[:space:]]*$' -e '^[[:space:]]*- -w[[:space:]]*$' .` locates stripping, and empty output means the rule is met. (Watched: hits both list lines on the violation, empty on the twin.)"
   },
   {
    "set": "go-modules (rules/go-modules.md, rules/go-modules/gates.md, rules/go-modules/release.md, rules/go-modules/golangci/{baseline,cli,lib-sdk}.golangci.yml)",
    "file": "rules/go-modules/release.md",
    "line": 30,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "N-9 requires each depth file to open with one line naming the versions it binds to (gates.md does, at line 8). In release.md that line is at line 30, after the ownership paragraph and the Contents line.",
    "fix": "Move 'Binds to Go 1.27.1, goreleaser 2.17.1, cosign 3.1.3, govulncheck v1.8.0 and syft (measured 2026-09-26).' to line 7, directly under the H1. Leave line 30 as: 'Every floor below is toolchain-gated: the Go that builds the binary decides it, not the `go` line.'"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality.md",
    "line": 84,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "Non-negotiable 8 says `t.Fatal`, `t.FailNow` and `require.*` \"run only on the test goroutine, including inside `wg.Go` and `errgroup.Go` closures\". Read literally, this permits them inside those closures, which is the opposite of GO-TEST-01, which confines them to the test goroutine.",
    "fix": "Replace \"run only on the test goroutine, including inside `wg.Go` and `errgroup.Go` closures, which no tool checks.\" with \"run only on the test goroutine, never inside a `go` statement or a `wg.Go` or `errgroup.Go` closure, and no tool checks the closure case.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/api-design.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/api-design.md",
    "line": 109,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-API-11 misspelled-prefix grep (`-i -e '^\\s*//\\s*deprecated'`) goes red on any doc comment for an identifier whose name starts with Deprecated, such as `// DeprecatedCount counts ...`, so \"empty output is the pass\" fails on compliant code. Planted in fixtures/review-quality-b/api11/fp.",
    "fix": "Replace line 109 with: `grep -rn -i --include='*.go' -e '^\\s*//\\s*deprecated\\b' . | grep -v -e '// Deprecated: '` (watched: still 3 hits on deprecated:, DEPRECATED: and Deprecated -, and empty on the twin and the DeprecatedCount probe)."
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/api-design.md",
    "line": 35,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "The Floors bullet says the `go` line gates `//go:fix inline`, and line 40-41 says a lower line loses GO-API-11's inliner. The consolidation gives only a go1.26 floor. Measured: under go1.27.1, `go fix -diff ./...` inlined an `Old()` call and exited 1 in a `go 1.22` module, the same as at `go 1.27`. The directive is toolchain-gated.",
    "fix": "Replace lines 35-41 with: \"- **Floors.** `any` (go 1.18), doc-comment syntax (go 1.19), `slices.Clone`, `maps.Clone` and `context.WithTimeoutCause` (go 1.21), and `errors.AsType` (go 1.26) are gated by the `go` line. `//go:fix inline` (go 1.26) and a `-coverpkg` profile listing untested packages (go 1.22) are gated by the toolchain. / - **Pinned default:** libraries and the SDK declare `go 1.26.0`, so every floor here is met. The adopter may override it, and a lower line loses the `errors.AsType` test form.\""
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/api-design.md",
    "line": 116,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Three pinned defaults lack N-5's \"the adopter may override\" clause: GO-API-10's v0 policy (line 116), GO-API-12's 100% (line 127) and GO-API-01's one-package layout (line 64). Line 42-45's blanket covers only the ocx names.",
    "fix": "Append \" (default, the adopter may override)\" to the end of each sentence beginning \"**Pinned default:**\" in the GO-API-01, GO-API-10 and GO-API-12 rows."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/cli-contract.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/cli-contract.md",
    "line": 60,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-CLI-20 deprecation grep matches the struct-literal `Deprecated: \"` and `Mark*Deprecated(`. It stays green (exit 1) on the assignment form `old.Deprecated = \"use new\"`, which is equally cobra's deprecation machinery. Planted in fixtures/review-quality-b/c20/assign.",
    "fix": "Replace the grep in the GO-CLI-20 Verification cell with: `grep -rn --include='*.go' -e 'Deprecated: *\"' -e '\\.Deprecated *= *\"' -e 'MarkDeprecated(' -e 'MarkShorthandDeprecated(' -e 'MarkPersistentFlagDeprecated(' .` (watched: hits the assignment, stays empty on the doc-comment twin)."
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/cli-contract.md",
    "line": 158,
    "severity": "fix",
    "kind": "portability",
    "finding": "The four carried-over Rust stream rules cite no IDs. They reference \"the pinned JSON envelope\", which nothing in the Go set defines, and a Go-only adopter does not have rust-quality installed. The consolidation said to point at the Rust IDs. The paragraph also hedges (\"about 100 ms\").",
    "fix": "Replace line 158 with: \"Four stream rules carry over unchanged from the Rust CLI contract (`rust-quality` CLI-04, CLI-08, CLI-12, CLI-16) and get no Go ID. Structured errors (CLI-04, MUST) print `{\\\"error\\\": {\\\"code\\\": slug, \\\"exit\\\": int, \\\"message\\\": text}}` on stdout, with slugs from GO-CLI-01's switch. Progress bars (CLI-08, MUST) draw to stderr and are suppressed when it is not a TTY, when `CI` is set, or under a machine-output flag. Help text (CLI-12) is ASCII, short, and free of internal references. A command doing network I/O prints a status line within 100 ms (CLI-16, CONSIDER).\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/concurrency.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/concurrency.md",
    "line": 159,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "GO-CONC-17 calls the pinned timeout sentinel \"an exported sentinel such as `ErrTimeout`, renamed per project\". GO-ERR-20 (errors.md:186) and GO-API-20 pin the default name `ErrOcxTimeout`. So the pinned default has two names across the set.",
    "fix": "Replace \"(its `Is` target is an exported sentinel such as `ErrTimeout`, renamed per project)\" with \"(its `Is` target is the exported sentinel, pinned default `ErrOcxTimeout`, which the adopter renames once)\"."
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/concurrency.md",
    "line": 60,
    "severity": "nit",
    "kind": "style",
    "finding": "A doubled blank line sits between the GO-CONC-05 table and `## The Vet Step`.",
    "fix": "Delete line 60 (the second empty line)."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/errors.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/errors.md",
    "line": 185,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "GO-ERR-19's rationale teaches `defer func() { _ = os.Remove(p) }() // best-effort temp cleanup` as the compliant form. This is an unconditional deferred temp removal, which GO-IO-12 forbids in any function that renames. The errcheck fact is true (re-measured: `defer os.Remove(p)` red, the `_ =` twin `0 issues.`), but no consolidation carries it, and an agent writing an atomic-write helper will copy it.",
    "fix": "Replace \"its compliant form is `defer func() { _ = os.Remove(p) }() // best-effort temp cleanup` (golangci-lint v2.14.0, measured 2026-09-26)\" with \"its compliant form is `defer func() { _ = os.Remove(p) }() // best-effort temp cleanup` (golangci-lint v2.14.0, measured 2026-09-26), never in a function that renames the file (GO-IO-12)\"."
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/errors.md",
    "line": 31,
    "severity": "fix",
    "kind": "era-unlabelled",
    "finding": "Dates and Floors labels `errors.Join` and `errors.AsType` \"toolchain-gated\". N-9 and concurrency.md:32 label stdlib API floors \"go-line gated\" (stdversion), and language.md:35 says \"never compiler-enforced\". So one set uses two opposite gate labels for the same class of floor.",
    "fix": "Replace lines 29-32 with:\n- **`%w`** is go1.13 and several `%w` in one call is go1.20, both toolchain-gated `fmt` behaviour.\n- **`errors.Join`** (go1.20) and **`errors.AsType`** (go1.26) are go-line gated but never compiler-enforced: a `go 1.25` module compiles `AsType` on 1.27, and only `go vet` `stdversion` sees the mismatch, not staticcheck."
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/errors.md",
    "line": 55,
    "severity": "fix",
    "kind": "unsupported-claim",
    "finding": "GO-ERR-02's rationale says the corpus has an `err == io.EOF` \"on a JSON decoder whose errors are wrapped\". go-errors.md records only \"`err == io.EOF` on a JSON decoder\" (trivy magefiles/vex.go:304). No consolidation supports the \"whose errors are wrapped\" clause.",
    "fix": "Replace \"including one on a JSON decoder whose errors are wrapped.\" with \"including one on a JSON decoder.\""
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/errors.md",
    "line": 39,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The line says \"every gate was watched red and green\". GO-ERR-05's SA4023 layer has no clean green: the consolidation says \"Watched green: none clean\". This overclaims watch status for a MUST row.",
    "fix": "Replace \"and every gate was watched red and green.\" with \"and every gate was watched red and green except GO-ERR-05's SA4023 layer, whose only green is its `_test.go` blind spot.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/io.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/io.md",
    "line": 85,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "GO-IO-06 (MUST) tells the reader that a `_unix.go` file name is enough to hold `Setpgid`, `Pgid` and `syscall.Kill(-pid, sig)`. Go does not treat `unix` as a filename suffix, so `spawn_unix.go` with no `//go:build unix` line compiles on every OS. Planted in review-quality-c/iounix/bad/spawn_unix.go, `GOOS=windows go vet ./iounix/bad/` exited 1 with `unknown field Setpgid in struct literal of type syscall.SysProcAttr`. The `//go:build unix` twin exited 0. The vet catches the mistake, but the rule text tells the agent to make it. The consolidation carries the same error (go-io.md:179).",
    "fix": "In the GO-IO-06 Rule cell, replace \"`Setpgid`, `Pgid` and `syscall.Kill(-pid, sig)` go in a `//go:build unix` file or a `_unix.go` or `_linux.go` file.\" with \"`Setpgid`, `Pgid` and `syscall.Kill(-pid, sig)` go in a file that carries `//go:build unix`, or in a `_linux.go` file. A `_unix.go` name alone constrains nothing, because `unix` is not a GOOS file-name suffix.\""
   },
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/io.md",
    "line": 107,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-IO-09 grep's `-e 'exec\\.Command.*\"-p\"'` alternative matches compliant `exec.CommandContext(ctx, \"mkdir\", \"-p\", dir)`. In review-quality-c/io09/good (a `mkdir -p` call plus a `--password-stdin` twin) the grep printed the `mkdir` line with exit 0, so \"empty output = pass\" is false on common compliant code. The violation (`docker login -p pw`) went red as intended.",
    "fix": "In the GO-IO-09 Verification cell, replace \"`: empty output = pass. It sees single-line calls only, so an argv slice built elsewhere is read by hand.\" with \"`: empty output = pass. A `-p` hit whose flag is not a password (`mkdir -p`, `ssh -p`) is read and cleared. It sees single-line calls only, so an argv slice built elsewhere is read by hand.\""
   },
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/io.md",
    "line": 111,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "GO-IO-13 says the reasoned G204 suppression is valid only with the `common-false-positives` preset off and cites GO-GATE-14. GO-GATE-14 owns the gosec excludes and thresholds. The preset ban is GO-GATE-09's text as amended by GO-SEC-01 (wave-3 (e) 1 and 2), which is also how security.md:15 attributes it.",
    "fix": "In the GO-IO-13 Rationale cell, replace \"with gosec's `common-false-positives` exclusion preset off (GO-GATE-14)\" with \"with golangci-lint's `common-false-positives` exclusion preset off (GO-SEC-01, GO-GATE-09)\"."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/language.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/language.md",
    "line": 156,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "GO-LANG-17's `godebug-parity` block (lines 158-165) runs `go list -f '{{.DefaultGODEBUG}}' .`, which prints an empty string for any non-main package. A library member, or a member whose `main` lives under `cmd/`, gives `ws=\"\"` and `off=\"\"` and passes silently even when go.work and the member disagree. Planted in review-quality-a/godebug/bad (member `godebug default=go1.21`, go.work with none, root package `m`): empty output, exit 0. It went red only when the member root was `package main` (godebug-main/bad). The cell's 'empty output is the pass' is false for the common library shape.",
    "fix": "Replace lines 160-164 of the block with:\n```\ngo list -m -f '{{.Dir}}' | while read -r d; do\n  ws=$(go -C \"$d\" list -test -f '{{if eq .Name \"main\"}}{{.ImportPath}} {{.DefaultGODEBUG}}{{end}}' ./...)\n  off=$(GOWORK=off go -C \"$d\" list -test -f '{{if eq .Name \"main\"}}{{.ImportPath}} {{.DefaultGODEBUG}}{{end}}' ./...)\n  [ \"$ws\" = \"$off\" ] || echo \"godebug differs: $d\"\ndone\n```\nIn the GO-LANG-17 verification cell, append: \"It compares every main and test-main package under each member, so a library member is covered through its tests (watched 2026-09-26 on Go 1.27.1: red on a library member with a test and on a main member, empty on the twin).\""
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/language.md",
    "line": 143,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "GO-LANG-24 (generic-interface constraints) and GO-LANG-25 (iterator naming), both SHOULD reading heuristics in the go-language.md ruleset, are dropped with no trace. N-2 says to draw from the Ruleset, and N-6 does not list them as drops. The IDs appear nowhere under rules/.",
    "fix": "Insert after the GO-LANG-21 row (line 143):\n| GO-LANG-24 | Constrain a generic interface's own type parameter with `any`. Put a stronger constraint (`comparable`, `cmp.Ordered`, a self-referential method constraint) on the concrete implementations, unless every implementation needs it. | An over-constrained interface forecloses implementations that do not need the extra power. The Go blog's generic-interfaces post says to leave stronger constraints to implementations. | For each generic interface, compare its constraint with what every in-module implementation uses. | SHOULD |\n| GO-LANG-25 | Name iterator-returning functions by the `iter` convention: `All` for the single natural full sequence, `Backward` for reverse order, `Keys` or `Values` for map-like projections, and a domain name (`Preorder`) when several sequences exist and none is the default. Put configuration on the arguments (`Scan(min, max)`), never on a family of name variants. | The stdlib (`slices.All`, `maps.Keys`, go 1.23) sets the reader's expectation, and an off-convention name hides which sequence is the default. | `go doc` review of each exported iterator-returning name against the convention. | SHOULD |\nOn line 135, replace \"except GO-LANG-14's and GO-LANG-26's, which are design judgments\" with \"except GO-LANG-14's, GO-LANG-24's, GO-LANG-25's and GO-LANG-26's, which are design judgments\"."
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/language.md",
    "line": 69,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The section says golangci-lint's pass is empty output. golangci-lint v2.14.0 prints `0 issues.` on a pass (observed in every review run). The empty-output clause is false, and it contradicts errors.md and concurrency.md, which both say `0 issues.` is the pass.",
    "fix": "Replace \"reports all four rows. Empty\\noutput is the pass.\" with \"reports all four rows. Exit 0 with `0 issues.` is the pass, and GO-LANG-05's grep passes on empty output.\""
   },
   {
    "set": "go-quality index + language.md, errors.md, concurrency.md (review-quality-a)",
    "file": "rules/go-quality/language.md",
    "line": 55,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "N-8 requires the GO-LANG-04 row to cite x/tools v0.50.0 `toonew.go:28-29`. The row cites `internal/typesinternal/toonew.go` with no line range. The mechanism is correct: golangci govet reported `0 issues.` on the planted json/v2 import, bare `go vet` exited 1, and a go1.26.0 `go build` failed with the quoted `build constraints exclude all Go files`.",
    "fix": "Replace \"(`internal/typesinternal/toonew.go`, read 2026-09-26)\" with \"(`internal/typesinternal/toonew.go:28-29`, read 2026-09-26)\"."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/network.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/network.md",
    "line": 166,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "N-10 requires every checker cell to say what empty output means. The GO-NET-14 cell runs the GO-NET-14 grep but never says so.",
    "fix": "At the end of the GO-NET-14 Verification cell, after \"is the finding.\", add \" Empty output is the pass.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/observability.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/observability.md",
    "line": 104,
    "severity": "blocker",
    "kind": "verification-dishonest",
    "finding": "The GO-OBS-07 (MUST) grep has no `--include` and no Markdown exclude. In any repo that installs this rule at project scope, the grep matches the installed rule files (observability.md, testing.md and io.md all contain `execwait=`), so it can never print empty output on compliant code. Planted in review-quality-c/obs/execwait-clean: a `.claude/rules/go-quality/observability.md` copy plus a CI-only setting gave 4 hits from the rule file. Adding `--exclude='*.md'` gave empty output, exit 1, and the baked Dockerfile still went red. The grep also scans `.git`.",
    "fix": "At line 96 and in the GO-OBS-07 Verification cell at line 104, replace `grep -rn --exclude-dir=.github --exclude='*_test.go' -e 'execwait=' .` with `grep -rn --exclude-dir=.git --exclude-dir=.github --exclude='*_test.go' --exclude='*.md' -e 'execwait=' .`. After \"Empty output is the pass.\" in the cell, add: \"Markdown is excluded because installed rule files and docs name the setting.\""
   },
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/observability.md",
    "line": 60,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "GO-OBS-02 (MUST) forbids `log.SetFlags` and `log.SetPrefix`, but the global-logging grep matches only `slog.SetDefault(` and `log.SetOutput(`. In review-quality-c/obs/logbad, a library `init` that calls `log.SetFlags(0); log.SetPrefix(...)` printed nothing, so the check cannot go red for half of the banned calls.",
    "fix": "Replace line 60 with `grep -rl -e 'slog\\.SetDefault(' -e 'log\\.SetOutput(' -e 'log\\.SetFlags(' -e 'log\\.SetPrefix(' --include='*.go' . | xargs -r grep -L -e '^package main$'`."
   },
   {
    "set": "go-quality depth files C: rules/go-quality/io.md, network.md, security.md, observability.md",
    "file": "rules/go-quality/observability.md",
    "line": 106,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The GO-OBS-09 cell says \"A CLI's `main` hit is read too\", but `xargs -r grep -L -e '^package main$'` drops every `package main` file, so a CLI hit is never printed. In review-quality-c/obs/gcmain, a CLI `main` that calls `debug.SetMemoryLimit(1 << 30)` produced empty output. That breaks the rule's \"CLIs never set them\" clause.",
    "fix": "Replace \"Empty output is the pass for libraries. A CLI's `main` hit is read too.\" with \"Empty output is the pass for libraries. The grep drops `package main` files, so check a CLI by reading its `main` for `debug.SetMemoryLimit(`, `debug.SetGCPercent(` or a `GOGC` or `GOMEMLIMIT` env default.\""
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality/testing.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/go-quality.md",
  "findings": [
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/testing.md",
    "line": 179,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "GO-TEST-18 tells the reader to call GO-CLI's `run(args, stdin, stdout, stderr) int`, but GO-CLI-02 (MUST) pins `run(os.Args[1:], os.Stdout, os.Stderr)` returning an `ExitCode` (three params, typed result), and cli-contract.md:52 tests `run(args, &out, &errb)`. Two rows answer the question of run's signature two ways, and no topic-map resolution covers it.",
    "fix": "In the GO-TEST-18 Rule cell replace \"call `GO-CLI`'s `run(args, stdin, stdout, stderr) int` with `bytes.Buffer`s and assert exit code, stdout and stderr for every flag and error path.\" with \"call `GO-CLI-02`'s `run(args, stdout, stderr)` with `bytes.Buffer`s and assert the returned `ExitCode`, stdout and stderr for every flag and error path.\""
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/testing.md",
    "line": 88,
    "severity": "blocker",
    "kind": "unsupported-claim",
    "finding": "The GO-TEST-06 (MUST) cell says \"`usetesting` is silent below `go 1.24`\". The consolidation says only the 1.24-gated checks are disabled, and a planted go 1.23 module under lib-sdk.golangci.yml still got `os.MkdirTemp` and `os.Setenv` findings (2 issues). Only the context check went silent.",
    "fix": "Replace \"`usetesting` is silent below `go 1.24`.\" with \"Below `go 1.24`, `usetesting` skips only its 1.24-gated checks (`context-background`, `context-todo`, `os-chdir`) and still reports `os.MkdirTemp` and `os.Setenv`.\""
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/testing.md",
    "line": 114,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "GO-TEST-12 reverses its execwait clause. The consolidation and wave-2 (e) 17 say GO-TEST-12 keeps \"leak-freedom checked under GODEBUG=execwait=2\". The draft says execwait=2 cannot prove it on 1.27.1, citing only the go-diagnose author receipt. The draft is correct: in fixtures/review-quality-b/execwait, CommandContext stayed silent and exec.Command panicked. observability.md, io.md and go-diagnose already follow it. The departure is simply not recorded in the binding notes.",
    "fix": "No change to testing.md. Add to go-topic-map.md, under Wave 4 (e), item \"19. **GO-TEST-12's execwait clause (supersedes wave-2 (e) 17).** On go1.27.1, `GODEBUG=execwait=2` never fires for an `exec.CommandContext` `Cmd` (its `Cancel` closure refers back to the `Cmd`), and fires only after a GC collects the `Cmd`. GO-TEST-12 reads leak-freedom (every `Start` reaches `Wait`, GO-IO-01), and GO-OBS-07 calls execwait a diagnosis aid with blind spots.\""
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/testing.md",
    "line": 117,
    "severity": "fix",
    "kind": "trigger",
    "finding": "GO-TEST-15 (MUST) governs workflow YAML (`-fuzz` without `-fuzztime`), and its pinned default tells the reader to create a scheduled fuzz workflow. The `**/*.go` glob never loads this file on a workflow edit, and go-quality.md:138 routes \"a CI workflow that runs the gate\" to go-modules, which does not carry GO-TEST-15.",
    "fix": "In rules/go-quality.md line 132, change the routing cell to: \"Writing or reviewing a test, a fuzz target, a benchmark, a golden file, a helper process that fakes a CLI, a coverage gate, or a CI workflow that runs `go test -fuzz`\"."
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/testing.md",
    "line": 180,
    "severity": "fix",
    "kind": "style",
    "finding": "The GO-TEST-19 verification cell has a grep with no statement of what empty output means (N-10).",
    "fix": "After \"every hit is rewritten by hand or not at all.\" insert \"Empty output means no benchmark needs a hand rewrite.\""
   },
   {
    "set": "go-quality depth files: api-design.md, testing.md, cli-contract.md (GO-API, GO-TEST, GO-CLI)",
    "file": "rules/go-quality/testing.md",
    "line": 114,
    "severity": "nit",
    "kind": "style",
    "finding": "GO-TEST-12 uses the placeholder `./yourpkg` without the \"rename\" instruction N-10 asks for.",
    "fix": "Replace \"`go test -c -o pkg.test ./yourpkg`\" with \"`go test -c -o pkg.test ./sdk` (rename `./sdk` to your package)\"."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-diagnose/SKILL.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-diagnose",
  "findings": [
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-diagnose/SKILL.md",
    "line": 453,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "Step D2 (line 261) enforces GO-GATE-02 (MUST: go vet runs as its own step, and a green test run is not a vet pass), but the MUST table has no row for it.",
    "fix": "Append the row `| 15 | A race diagnosis skips `go vet ./...` because `-race` or `go test` passed | GO-GATE-02 |`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-diagnose/SKILL.md",
    "line": 151,
    "severity": "nit",
    "kind": "style",
    "finding": "The measured output quotes `timed out after 3s`, but the command on line 149 uses `-timeout=30s`. Re-run as written, it prints `after 30s`.",
    "fix": "Replace `panic: test timed out after 3s` with `panic: test timed out after 30s`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-release/SKILL.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-release",
  "findings": [
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-release/SKILL.md",
    "line": 98,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "Step 2 tags the commit locally before step 3 runs. Step 3 is titled `run the API gate before the tag`, and line 78 says the bump size comes from step 3's report. A library therefore picks and tags its version before the report that decides the version.",
    "fix": "Replace lines 98-99 with `Then tag that commit **locally** and do not push it until step 9. A library or SDK runs step 3 first and tags only once its report agrees with the version. Steps 5 and 8 build from the local tag.`"
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-release/SKILL.md",
    "line": 167,
    "severity": "fix",
    "kind": "duplication",
    "finding": "The `versionString` snippet is a second copy of GO-REL-06's snippet in rules/go-modules/release.md, with different code. N-4 and N-11 say rule text appears once, so the two copies will drift.",
    "fix": "Replace the fenced go block on lines 167-188 with `Copy GO-REL-06's `versionString` snippet (go-modules `release.md`, Checked by Running the Binary).`"
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-release/SKILL.md",
    "line": 434,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "references/release-config.md (lines 131-133) enforces GO-GATE-04 (MUST): never move `CGO_ENABLED=0` to workflow level, where it reaches the race job. The MUST table has no row for it.",
    "fix": "Append the row `| 15 | `CGO_ENABLED=0` is set at workflow level, where it reaches the `-race` job | GO-GATE-04 |`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-release/SKILL.md",
    "line": 342,
    "severity": "fix",
    "kind": "style",
    "finding": "The `Tags fetched` check cell does not say what empty output means (N-10). The `--include='release*.yml'` filter prints nothing for a workflow named release.yaml or cd.yml.",
    "fix": "Replace the Pass cell with `the block shows `fetch-depth: 0`. Empty output means no workflow named release*.yml exists: point the grep at the real release workflow. A reading heuristic`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-release/references/release-config.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-release",
  "findings": [
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-release/references/release-config.md",
    "line": 95,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "The pinned release workflow breaks GO-MOD-16, a MUST it cites on line 124. GO-MOD-16 requires `GOTOOLCHAIN=local` on build jobs, and the job env sets only GORELEASER_CURRENT_TAG. An adopter who copies the template ships a release job that fails the rule the skill's MUST table (row 3) enforces.",
    "fix": "After line 95 (`      GORELEASER_CURRENT_TAG: ${{ github.ref_name }}`), insert the line `      GOTOOLCHAIN: local`. In the table under the workflow, after the `go-version-file: go.mod` row, add the row `| `GOTOOLCHAIN: local` | the build uses the toolchain setup-go installed and never downloads another one | GO-MOD-16 |`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-release/references/release-config.md",
    "line": 102,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "`go-version-file: go.mod` and a goreleaser run from the repository root are wrong for the GO-REL-14 nested CLI that step 5 supports. There the root `go.mod` is the parent module, usually with a bare `go 1.N.0` line and no `toolchain` line, which is exactly the shape GO-MOD-16 forbids pointing `go-version-file` at.",
    "fix": "After the workflow table (after line 129), add the paragraph: `For a nested CLI (GO-REL-14), set `go-version-file: tools/mytool/go.mod` and add `workdir: tools/mytool` to the goreleaser-action `with:` block, and keep `.goreleaser.yaml` in `tools/mytool`. Rename the path.`"
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-upgrade/SKILL.md",
  "model": "opus",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-upgrade",
  "findings": [
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 92,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "The A1 table says `stdversion` is the only check for a stdlib symbol newer than the `go` line. Step A5 (line 198), GO-LANG-04 and wave-4 (e) 13 / N-8 all name the `oldstable` leg's `go build ./...` as the durable check, and they say golangci's govet and nogo are blind. Two statements in one file give different answers to the same question.",
    "fix": "Replace the cell `Step A5's `stdversion` is the only check` with `Step A5's `stdversion`, plus the `oldstable` leg's `go build ./...`, which is the durable check (GO-LANG-04)`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 321,
    "severity": "blocker",
    "kind": "contradiction",
    "finding": "The text says `go.uber.org/automaxprocs goes only from a main module at go 1.25 or above`, and line 89 also says `from a main module`. That wording implies a library at go 1.26 keeps the import. GO-OBS-06 (MUST) forbids the import in every module at go 1.25 or later, GO-MOD-09 says never import it in a library, and go-diagnose MUST row 4 reports it as a finding.",
    "fix": "Line 321: replace the bullet with `- `go.uber.org/automaxprocs` is removed from every module whose `go` line is 1.25 or above, and a library never imports it at any line (GO-MOD-09, GO-OBS-06).` Line 89: replace `Remove `go.uber.org/automaxprocs` from a main module (GO-MOD-09)` with `Remove `go.uber.org/automaxprocs` (GO-MOD-09, GO-OBS-06)`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 207,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "The toonew re-check reads empty output as a pass. If a future toolchain moves or renames `toonew.go`, grep writes `No such file or directory` to stderr, stdout stays empty and xargs exits 123, which is the same exit code as a real pass. Watched: with a planted GOROOT that lacks the file, stdout was empty with exit 123, the same result as the genuine pass on go1.27.1.",
    "fix": "Replace comment line 206 with `# A hit means bare go vet is blind too, and only the oldstable build leg remains. A `No such file or directory` error means the file moved: find toonew.go under GOROOT's src/cmd/vendor and re-run. It is never a pass.`"
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 143,
    "severity": "fix",
    "kind": "verification-dishonest",
    "finding": "MUST row 1 (line 347) calls a patch-level floor a finding, but the floor check goes green on a patch floor below 1.26.0. Watched: `go 1.25.3` exits 0.",
    "fix": "After line 143, insert `# Patch-level floor (GO-MOD-01). Any output is the finding. Empty output passes.` followed by `go list -m -f '{{.GoVersion}}' | grep -v -E -e '^1\\.[0-9]+(\\.0)?$'` (watched: prints `1.25.3` and `1.26.2`, and is silent on `1.26.0`)."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 64,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The module-root finder leaves out the `testdata` exclusion that GO-MOD-06's `roots` block in rules/go-modules.md carries. As written, every gate step also runs inside a testdata module, and those are often deliberately broken, so the gate goes falsely red.",
    "fix": "Replace `find . -name go.mod -not -path '*/vendor/*'` with `find . -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*'`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 85,
    "severity": "fix",
    "kind": "duplication",
    "finding": "The A1 silent-change table restates GO-LANG-15's silent-change table in rules/go-quality/language.md, which is depth text (N-4, N-11). The copy has already drifted: it drops the `slices.Insert` and core-type rows and rewords the stdversion row.",
    "fix": "Replace the table on lines 85-92 with one sentence: `Check each against the silent-change table under GO-LANG-15 (go-quality `language.md`, Moving to a New Go Release). Every row there arrives with no compile error.`"
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 266,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "N-12 requires a re-check step for the nogo `stdversion` probe. A8 names the BZL-GO-06 gap audit and the BZL-GO-07 external vet, but not whether `stdversion` under nogo is still inert.",
    "fix": "After `BZL-GO-07's external `vet` on every rules_go or Go bump.`, insert `Also re-probe whether nogo's `stdversion` still reports the SDK's Go version for every package (BZL-GO-06 Gaps). Keep `passes/stdversion` out until it does not.`"
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/SKILL.md",
    "line": 368,
    "severity": "fix",
    "kind": "notes-violation",
    "finding": "The MUST table leaves out MUST rows the procedure enforces: GO-GATE-12 (A6.4 nolint form), GO-LANG-10 (A4, a declined omitzero fix), GO-MOD-10 (B3, SDK stdlib-only) and BZL-GO-07 (A8, a green bazel build is not the vet pass).",
    "fix": "Append the rows `| 23 | A new finding is silenced with a bare or unexplained `//nolint` | GO-GATE-12 |`, `| 24 | An `omitempty` to `omitzero` swap on contract output lands without a byte golden over nil and empty | GO-LANG-10 |`, `| 25 | The SDK's runtime import graph gains a non-stdlib module | GO-MOD-10 |` and `| 26 | A green `bazel build //...` is read as the vet pass | BZL-GO-07 |`."
   }
  ]
 },
 {
  "file": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-upgrade/references/probes.md",
  "model": "sonnet",
  "checker_target": "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/skills/go-upgrade",
  "findings": [
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/references/probes.md",
    "line": 231,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "P6 names the baseline `.golangci.yml`, on this line and on line 240. GO-GATE-22 and gates.md ship it as `baseline.golangci.yml`, and `.golangci.yml` is each module's copy of one of the three files. Run in a module whose copy is the lib-sdk file, the superset check compares the wrong pair.",
    "fix": "Line 231: `for f in baseline.golangci.yml cli.golangci.yml lib-sdk.golangci.yml; do`. Line 240: `comm -23 <(en baseline.golangci.yml) <(en \"$overlay\") | sed \"s|^|$overlay missing |\"`. Line 225: after `on the three golangci-lint files`, insert ` (`baseline.golangci.yml`, `cli.golangci.yml`, `lib-sdk.golangci.yml`)`."
   },
   {
    "set": "go-release, go-upgrade, go-diagnose skills (phase 8 content review)",
    "file": "skills/go-upgrade/references/probes.md",
    "line": 246,
    "severity": "fix",
    "kind": "contradiction",
    "finding": "The measured line says a five-linter fragment lists 26 missing baseline linters. GO-GATE-22 says a five-linter fragment drops 28. The count depends on the fragment (a fresh one printed 25), so a re-prober who compares against 26 reports a spurious difference.",
    "fix": "Replace `and the superset check lists 26 missing baseline linters for it` with `and the superset check prints one line for each baseline linter the fragment omits (the count depends on the fragment)`."
   }
  ]
 }
]

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
- You are a fixer in phase 8 (Validate) of the research-lang program for Go, run from ${ROOT} (a git worktree; treat it as the repository root). A reviewer read YOUR FILE against the research consolidations and the binding authoring notes in ${ROOT}/.agents/research/go-topic-map.md (section "## Authoring notes (binding on the drafters)") and returned findings with exact fix text. Apply them.
- YOUR FILE (the only file you may edit): ${item.file}
- Rules: apply each finding's fix text as written, at the line it names (line numbers are from the reviewed version, so re-locate by content after your first edit). Keep every rule ID stable. Do not rewrite lines the findings do not name. Do not add rules. Where a fix would remove a row, remove the whole row. If a fix would contradict the authoring notes or the consolidation the file cites (read the section it points to before refusing), refuse that one finding with the reason and apply the rest. Prose in this repository avoids em dashes and semicolons outside code and tables; a style finding to that effect is applied by rewording, never by deleting content.
- After editing, run: python3 ${ROOT}/.claude/skills/research-lang/scripts/check-artifacts.py ${item.checker_target}  and fix any finding it reports in YOUR FILE (a finding in another file is not yours; report it in refused with the path). Then report the file's line count.

FINDINGS TO APPLY (${item.findings.length}):
${item.findings.map((f, i) => `${i + 1}. line ${f.line} [${f.severity}/${f.kind}] ${f.finding}\n   FIX: ${f.fix}`).join('\n')}`,
    { label: `fix:${item.file.split('/').slice(-2).join('/')}`, phase: 'Fix', model: item.model, effort: isOpus ? 'high' : 'medium', schema: SCHEMA })
}

phase('Fix')
const results = await parallel(FILES.map(item => () => fix(item)))
const ok = results.filter(Boolean)
log(`Fix done: ${ok.length}/${FILES.length} files · applied ${ok.reduce((n, r) => n + r.applied.length, 0)} · refused ${ok.reduce((n, r) => n + r.refused.length, 0)} · unclean ${ok.filter(r => !r.checker_clean).length}`)
return { results: ok }
