---
title: SwiftLint, SwiftFormat and swift-format delta, 2026-10-10 to 2026-11-27
pair: swift-package
date_researched: 2026-11-27
window_start: 2026-10-10
model: sonnet
sources_fetched: 12
---

# Delta result

This is a delta against the 2026-10-10 baseline. SwiftLint did not release in the window, so every SwiftLint pin and trap stays as written. SwiftFormat did release (0.64.0 to 0.64.7), so the "incumbent only" pin text is stale. swift-format 6.4.1 to 6.4.3 shipped in the window with no change to the rule count, the defaults or `Configuration.swift`, but two gate rows are now wrong: `swift format --version` no longer prints `main`, and `.swift-format-ignore` is documented. All facts were read on 2026-11-27 from the sources listed at the end.

# Newest versions

| Tool | Newest | Date | Inside window? |
|---|---|---|---|
| SwiftLint | 0.65.1 | 2026-08-21 | No (`gh release list -R realm/SwiftLint`: 0.65.1 is "Latest"; the tag list has no later tag) |
| `ghcr.io/realm/swiftlint` | 0.65.1 | n/a | No later numeric tag (registry tag list read through the ghcr.io v2 API: newest numeric tags are 0.65.0 and 0.65.1, plus `latest`) |
| SwiftFormat (nicklockwood) | 0.64.7 | 2026-11-14 | Yes: 0.64.0 (2026-10-16), 0.64.1 to 0.64.7 |
| swift-format, toolchain-bundled | 6.4.3 (tag `swift-6.4.3-RELEASE`) | after 6.4.2, inside window | Yes: 6.4.1 and 6.4.2 are also new |
| swift-format standalone | 604.0.0 | 2026-09-16 | No |

Source for the dates: `gh release list` for realm/SwiftLint, nicklockwood/SwiftFormat and swiftlang/swift-format, and `git ls-remote --tags https://github.com/swiftlang/swift-format` (RELEASE tags up to `swift-6.4.3-RELEASE`). I did not obtain a calendar date for swift-6.4.3-RELEASE itself; the sibling swift-quality pair artifact records the toolchain point releases as 6.4.1 on 2026-10-15, 6.4.2 on 2026-10-30 and 6.4.3 on 2026-11-20.

# Claim by claim

## SwiftLint 0.65.1 pin and image (rules/swift-package.md line 33, gates.md line 8, SW-GATE-11, SW-GATE-26)

Unchanged. No release and no new image tag after 0.65.1. The CHANGELOG `## Main` section (unreleased) at https://raw.githubusercontent.com/realm/SwiftLint/main/CHANGELOG.md holds one enhancement (autocorrection for `multiline_call_arguments`) and four bug fixes (`control_statement`, `legacy_swiftui_aspect_ratio`, `unused_parameter`, `orphaned_doc_comment`). None touches `custom_rules`, SourceKit, execution mode, the static binary or the `swiftlint_version` handling.

Decision: the pinned tag should not move. There is nothing newer to pin to. Because it does not move, no SW-GATE-26 or SW-GATE-11 trap row needs re-watching. When a release after 0.65.1 appears, re-watch every row in the next section before touching the pin text.

## SW-GATE-26 and SW-GATE-11 traps ("observed, not documented: re-run after each image bump")

All rows unchanged, because no new image exists and the sources behind them did not move.

| Trap | Verdict | Evidence |
|---|---|---|
| Static binary prints `Skipping enabled rule 'custom_rules' because it requires SourceKit`, exits 0 | unchanged | CHANGELOG still says "A fully statically linked binary named `swiftlint-static` ... Rules requiring SourceKit will be disabled" and "a warning will be printed once per rule" (CHANGELOG.md lines 751 and 770-771). No newer entry. |
| Aborts 134 under `default_execution_mode: swiftsyntax` | unchanged (not re-measured: needs the image, which did not change) | No CHANGELOG entry about it. |
| Custom-rule default mode is SourceKit (`defaultExecutionMode ?? .sourcekit`) | unchanged | `Source/SwiftLintFramework/Rules/CustomRules.swift` on `main`, line 84: `? (configuration.defaultExecutionMode ?? .sourcekit)`; line 74 still says "Use `execution_mode: sourcekit` or `default_execution_mode: sourcekit` for SourceKit mode." Read at https://raw.githubusercontent.com/realm/SwiftLint/main/Source/SwiftLintFramework/Rules/CustomRules.swift |
| `match_kinds: [attribute.builtin]` never matched | unchanged (behavioural, not re-measured) | No CHANGELOG entry. |
| `swiftlint_version` mismatch warning text and exit 2 | unchanged | `Configuration+Parsing.swift` on `main` still reads the key `swiftlint_version` (lines 13 and 109). No changelog entry in `## Main`. |
| Same-line `disable:this` hole | unchanged | No `## Main` entry mentions it. |

Caveat: the behavioural rows (exit 134, `attribute.builtin`, exit 2 text, `disable:this`) were not re-run. They are tied to the 0.65.1 binary, which is byte-for-byte the same image; the only "main" difference is unreleased source.

## SwiftFormat 0.63.1 (incumbent only)

Changed. Old text: "SwiftFormat 0.63.1 (incumbent only)" (gates.md line 8). New fact: the newest release is 0.64.7, dated 2026-11-14; 0.63.1 is dated 2026-09-30. The pin text is stale but the tool is documented as incumbent-only, so the project need not adopt it. Source: https://raw.githubusercontent.com/nicklockwood/SwiftFormat/main/CHANGELOG.md

Entries in 0.64.x that touch an incumbent gate (quoted):

- 0.64.0 (2026-10-16): "Added `--unknown-options error|warn|ignore` for handling unknown rules, options, and unsupported option values"; "Renamed `privateStateVariables` to `privateSwiftUIDynamicProperties`"; "`contentBuilder` rule, replacing `redundantViewBuilder`"; many new rules (`nestedIf`, `repeatedGuard`, `commonTypos`, `forWhere`, and others); "SwiftFormat now excludes `.build`, `Build`, and `DerivedData` directories from formatting/linting by default". A `.swiftformat` that names a renamed rule is the case to watch.
- 0.64.5 (2026-10-31): "Fixed filtered config sections applying to files that do not match, and made matching sections apply in order".
- 0.64.4 (2026-10-27): "Fixed command-line handling of paths after the `--` end-of-options separator".
- 0.64.0 also "Removed CocoaPods distribution and the prebuilt binary from the repository".

Decision: move the incumbent text to "0.64.7" only if the gate is re-measured; otherwise reword to "0.63.1 as last measured, newest 0.64.7". I did not run SwiftFormat, so no behavioural claim is made about 0.64.x on the gates.

## SW-GATE-04 and SW-GATE-06: 43 rules, shipped JSON, `rules` block replaces defaults

Unchanged. Evidence, all from tag `swift-6.4.3-RELEASE`:

- `Documentation/RuleDocumentation.md` lists 43 rules (`grep -c '^- \['` gives 43). Its md5 is identical on `swift-6.4.0-RELEASE` and `swift-6.4.3-RELEASE`, so no rule was added, removed or renamed from 6.4.0 to 6.4.3.
- `Sources/SwiftFormat/API/Configuration.swift` has an identical md5 on 6.4.0, 6.4.1, 6.4.2 and 6.4.3 (`b0d0002a2b7dd148d2bb927eb17c6d55`). Defaults are therefore unchanged and the shipped 6.4.0 JSON dump is still valid.
- The `rules` decode behaviour moved by line number only, because the claimed lines were measured on a different tag state or a different offset. In 6.4.3 it is lines 459-465: "If the `rules` key is not present at all, default it to the built-in set ... To get an empty rules dictionary, one can explicitly set the `rules` key to `{}`" and `try container.decodeIfPresent([String: Bool].self, forKey: .rules) ?? defaults.rules`. The semantics are the same as the gate claims: a present `rules` block replaces the defaults. The "lines 461-464" citation in gates.md should read "lines 459-465 on swift-6.4.3-RELEASE" if the citation is kept. This is a citation fix, not a behaviour change, and I could not confirm whether 461-464 was ever exact on 6.4.0 because the 6.4.0 file is byte-identical to 6.4.3 per the md5 and so has the same line numbers. Either the baseline line cite was approximate or it counted from another file offset; treat it as "could not determine" for the original number and verified for 459-465.

Decision: a 6.4.x swift-format did not change the rule count or the defaults, so the shipped JSON is not invalidated. Raw source: https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Sources/SwiftFormat/API/Configuration.swift

## SW-GATE-07: `.swift-format-ignore` "documented nowhere"

Changed, and the baseline was already wrong for 6.4.0. Old text: "`.swift-format-ignore` is honoured by 6.4.0, ignored by 6.3.3 and documented nowhere". New fact: `Documentation/IgnoringSource.md` has a section "File-Based Ignoring with `.swift-format-ignore`" (line 117 on 6.4.3) with a `.gitignore`-style pattern syntax, nearest-file-wins lookup walking up the tree, and the statement that "Files matched by `.swift-format-ignore` patterns are completely excluded from processing" (line 204). The same section exists on `swift-6.4.0-RELEASE` (10 matches) and has 0 matches on `swift-6.3.3-RELEASE`. So the ignore file is documented from 6.4.0, not from a change in the window. I could not date the commit that added the section without a clone. Source: https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Documentation/IgnoringSource.md

Decision: the "documented nowhere" clause must be deleted; keep "ignored by 6.3.3". The SW-GATE-07 recommendation (edit the file list rather than ship an ignore file) is a design choice and is not invalidated, because a matrix that includes 6.3.3 still ignores the file.

## SW-GATE-08: `swift format --version` prints `main` on 6.4.0

Changed. Old text: "prints `main` on 6.4.0, so it identifies nothing". New fact: `Sources/swift-format/PrintVersion.swift` prints `main` on `swift-6.4.0-RELEASE` but `6.4.1` on `swift-6.4.1-RELEASE`, `6.4.2` on `swift-6.4.2-RELEASE` and `6.4.3` on `swift-6.4.3-RELEASE` (the source carries the comment "TODO: Automate updates to this somehow", so it is hand-edited per release). 6.3.3 prints `6.3.3`. Upstream change landed with the 6.4.1 release (toolchain dated 2026-10-15 per the sibling artifact). Source: https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Sources/swift-format/PrintVersion.swift

Decision: the clause should read "prints `main` on 6.4.0 only; 6.4.1 and later print the patch version". The row's conclusion (record `swift --version` as well) still holds, because the printed value is hand-maintained.

# Normative guidance candidates

1. Rule: stamp the SwiftLint pin as unchanged at 0.65.1 and do not re-run the trap rows until a release newer than 0.65.1 exists. Rationale: no release, no new image tag, no CHANGELOG entry on the trap topics. Verification: `gh release list -R realm/SwiftLint -L 1` shows 0.65.1; or list the ghcr tag set and check for a numeric tag above 0.65.1.
2. Rule: drop "documented nowhere" from SW-GATE-07 and cite `Documentation/IgnoringSource.md` section "File-Based Ignoring with `.swift-format-ignore`". Rationale: the section exists on swift-6.4.0-RELEASE. Verification: `curl -s https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Documentation/IgnoringSource.md | grep -n "swift-format-ignore"`.
3. Rule: change SW-GATE-08 to say `swift format --version` prints `main` on 6.4.0 only and the patch version from 6.4.1. Rationale: PrintVersion.swift differs per tag. Verification: `swift format --version` on a 6.4.3 image prints `6.4.3`.
4. Rule: widen the toolchain stamp "6.4.0" in SW-GATE-04 and SW-GATE-06 to "6.4.0 to 6.4.3 (Configuration.swift and RuleDocumentation.md byte-identical)". Rationale: the shipped JSON is valid for all four patches. Verification: `swift format dump-configuration | diff - .swift-format` on a 6.4.3 image prints nothing (not run here; the source-identity check was).
5. Rule: update the incumbent SwiftFormat stamp to name 0.64.7 as newest. Rationale: 0.64.0 renamed rules and added `--unknown-options`. Verification: `swiftformat --version`, then `swiftformat --lint --strict` against the incumbent config on the pinned version.

# AI-agent angle

- An agent will assume `swift format --version` identifies the toolchain and so skip recording `swift --version`. Mechanical check: grep CI logs for `swift --version`.
- An agent will tell people `.swift-format-ignore` is unsupported, from the stale text. Check: test with a 6.4.3 image and a `.swift-format-ignore` file naming a vendored directory; the format step should skip it.
- An agent will bump SwiftLint to `latest` expecting a fix to `custom_rules`; `latest` is still 0.65.1. Check: `docker run --rm ghcr.io/realm/swiftlint:latest swiftlint version`.

# Contested / evolving

- The static SwiftLint binary still cannot run SourceKit-dependent rules (`custom_rules`), and no announced fix exists as of 2026-11-27. Trend: stable by design.
- SwiftFormat is on a fast cadence (eight releases in six weeks around 0.64.0). The incumbent pin ages quickly. Trend: more rules per release; treat unknown-rule handling (`--unknown-options`) as a change to watch.
- swift-format 6.4.x point releases carry no config changes. Standalone 604.0.0 (2026-09-16) predates the window and was not compared against 6.4.3.

# Could not determine

- The calendar date of `swift-6.4.3-RELEASE` from a primary source (the tag exists; the date comes from the sibling artifact).
- The commit date that added the `.swift-format-ignore` documentation section.
- Behavioural re-runs of the SwiftLint trap rows; no new image exists, so none were needed.
- What the original "lines 461-464" citation was measured against.
- GitHub REST calls were rate-limited partway through; raw.githubusercontent.com, `git ls-remote` and the ghcr.io registry API were used instead.

# Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/realm/SwiftLint/main/CHANGELOG.md | SwiftLint CHANGELOG including unreleased `## Main` | read 2026-11-27 | no entry on custom rules or static binary |
| https://github.com/realm/SwiftLint/releases | SwiftLint releases (read through `gh release list`) | 0.65.1 on 2026-08-21 | newest release |
| https://raw.githubusercontent.com/realm/SwiftLint/main/Source/SwiftLintFramework/Rules/CustomRules.swift | custom rules source | main, 2026-11-27 | `defaultExecutionMode ?? .sourcekit` |
| https://raw.githubusercontent.com/realm/SwiftLint/main/Source/SwiftLintFramework/Configuration/Configuration+Parsing.swift | config parsing | main | `swiftlint_version` key |
| https://ghcr.io/v2/realm/swiftlint/tags/list | image tag list | 2026-11-27 | newest numeric tag 0.65.1 |
| https://github.com/realm/SwiftLint/tags (via `git ls-remote --tags`) | tag list | 2026-11-27 | no tag above 0.65.1 |
| https://raw.githubusercontent.com/nicklockwood/SwiftFormat/main/CHANGELOG.md | SwiftFormat changelog | 0.64.7 on 2026-11-14 | window entries |
| https://github.com/nicklockwood/SwiftFormat/releases | SwiftFormat releases (`gh release list`) | 0.64.7 Latest | dates |
| https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Documentation/RuleDocumentation.md | rule list | 6.4.3 | 43 rules, identical to 6.4.0 |
| https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Sources/SwiftFormat/API/Configuration.swift | default configuration | 6.4.3 | defaults, `rules` decode lines 459-465 |
| https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Documentation/IgnoringSource.md | ignore docs | 6.4.3 (also 6.4.0) | `.swift-format-ignore` section |
| https://raw.githubusercontent.com/swiftlang/swift-format/swift-6.4.3-RELEASE/Sources/swift-format/PrintVersion.swift | version string | 6.4.0 to 6.4.3 | `main` versus patch |
| https://github.com/swiftlang/swift-format/tags (via `git ls-remote --tags`) | RELEASE tags | through swift-6.4.3-RELEASE | confirms 6.4.1 to 6.4.3 exist |
