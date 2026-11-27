---
title: KSP, kapt and Dokka delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 11
---

# KSP, kapt and Dokka delta

This is a delta against the baseline of 2026-09-12 (kotlin-toolchain-and-codegen.md). Only what changed is stated. Everything else is "unchanged".

## Current stable versions as of 2026-11-27

- KSP: **2.3.14**, published 2026-11-13. Source: https://github.com/google/ksp/releases (API: repos/google/ksp/releases). Release 2.3.13 (2026-10-30) carries a documented concurrent-execution regression (issue 3286), fixed in 2.3.14. Release 2.3.12 (2026-09-09) is inside the window only by days before the baseline and predates it.
- Dokka: **2.3.0**, published 2026-11-05 (2.3.0-Beta was 2026-09-15). Source: https://github.com/Kotlin/dokka/releases/tag/v2.3.0

Note: the ksp-overview page still names KSP 2.3.12 as latest, and the migration page example uses `2.3.12`. The docs lag the releases page by two patch releases. Cite the GitHub releases page for "current".

## Per-claim verdicts

### KT-COMP-08, "KSP2 default since 2.0.0"
Unchanged. No release in the window changes this. Releases 2.3.12 to 2.3.14 are API and bug-fix releases.

### KT-COMP-08, "one recorded upstream gap is auto-value and Auto Factory"
Changed, minor. Source: https://kotlinlang.org/docs/ksp-overview.html (fetched 2026-11-27).
- Old text: auto-value and Auto Factory are the gap.
- New fact: the supported-libraries table lists only **Auto Factory** as "Not yet supported" (link google/auto issue 982). `auto-value` is not listed in the table fetched. Treat the gap as Auto Factory; do not assert an auto-value row. Could not compare against the earlier table revision, so whether auto-value was removed in the window is "could not determine".
- New entry worth knowing: Koin Annotations is marked "KSP processor is deprecated in favor of the Koin Compiler Plugin". Room 3.x is "Officially supported, KSP required". Motif is "Alpha".
- Date of upstream change: not determinable from the page.

### KT-COMP-08 rationale, kapt as stub-generating extra compilation
Unchanged. Source: https://kotlinlang.org/docs/kapt.html. The page does not say kapt is deprecated, in maintenance mode, or scheduled for removal. No K2 or KSP recommendation text on the page; only a navigation link to the migration guide. The only deprecation is for annotation-processor discovery from the compile classpath (`kapt.include.compile.classpath=false`).

### KT-COMP-09, coexistence and whole-processor migration
Unchanged. Source: https://kotlinlang.org/docs/ksp-kapt-migration.html. Page still says KSP and kapt can run alongside each other for staged migration and replaces `kapt(...)` with `ksp(...)` per processor dependency. No deprecations noted. Only the example version moved (to 2.3.12).

### KT-COMP-10, "KSP1 support ends at 2.3.0, K2-only" and `ksp.useKSP2=false` hard failure
Unchanged in substance, with one addition.
- KSP 2.3.0 release notes (https://github.com/google/ksp/releases/tag/2.3.0): "KSP1 has been deprecated"; KSP version is no longer tied to the Kotlin compiler version (old `<kotlinversion>-<kspversion>` format abandoned); KSP is no longer a compiler plugin.
- Versioning: the 2.3.x line is independent of Kotlin. The overview page lists a KGP range of 2.3.20 to 2.4.x for KSP 2.3.12.
- `ksp.useKSP2` has **not** been removed. The current plugin source (gradle-plugin KspSubplugin.kt on main) still reads the property and fails with "KSP1 is no longer available. Please use KSP2 instead and do not explicitly set ksp.useKsp2 to false ... The ksp.useKSP2 property will be removed in the future." The message wording was added in 2.3.11 (2026-08-03, PR 3066), before the baseline. So the hard-failure claim holds. Optional addition to the rule text: the property is slated for removal, so an explicit `true` should also be deleted when convenient.
- New in window: 2.3.12 raised the minimum AGP to 8.12.0; the overview page states AGP 8.13.0 or later, Gradle 8.13 or later, JDK 17 or later. These are outside the claim but may matter to KT-COMP-10 reviewers.

### KT-COMP-11, Dokka floor, DGP v2 default, v1 task names
Changed, small.
- "pins at 2.2.0 or newer": still valid as a floor. Newer stable exists: **2.3.0** (2026-11-05), which also fixes security advisories in bundled FreeMarker, jsoup and Jackson, and supports Project Isolation in DGP v2. Candidate: raise the floor to 2.3.0 as a SHOULD, or keep 2.2.0 and mention 2.3.0 as preferred. Decision for the authoring pass.
- "DGP v2 default since 2.1.0": unchanged (https://kotlinlang.org/docs/dokka-migration.html). The v1 mode is documented as no longer supported (https://kotlinlang.org/docs/dokka-gradle.html). The migration page gives no removal version; do not claim "removed in X". `V2EnabledWithHelpers` still exists so old task names fail softly.
- "K2 analysis stable from 2.2.0": needs a re-date. Dokka 2.3.0 release notes say "Remove K1 analysis (#4532)" and that `org.jetbrains.dokka.experimental.tryK2` no longer has any effect. So from 2.3.0 K2 is the only analysis. 2.2.0 stability claim itself was not contradicted, and the docs pages fetched do not state it, so the source for it remains the earlier research.
- v1 task names `dokkaHtml` / `dokkaHtmlMultiModule`: unchanged; v2 replacements are `dokkaGenerate`, `dokkaGeneratePublicationHtml`.
- Wrong-move 5, "still the dominant shape in tutorials as of 2026-09-12": could not determine (no source measures tutorials). Keep the date as is, or drop the sentence.
- Other Dokka facts to keep: the migration and Gradle docs examples still show plugin `2.2.0`, so they do not signal 2.3.0 as the floor.

### KT-API-02, `failOnWarning` placement and "Dokka 2.x, K2-stable from 2.2.0"
Unchanged for placement. Source: https://kotlinlang.org/docs/dokka-gradle-configuration-options.html and the migration page. In DGP v2 it is set as `dokka { dokkaPublications.html { failOnWarning.set(true) } }`, default `false`. Re-date only the K2 phrase as in KT-COMP-11.

## Normative candidates

1. KT-COMP-11, raise or soften the Dokka floor to 2.3.0.
   - Rationale: 2.3.0 is the current stable, drops K1 analysis, and ships security updates for bundled dependencies.
   - Verification: `grep -rn 'org.jetbrains.dokka' --include=*.kts --include=*.toml .` and read the version against 2.3.0.
2. KT-COMP-10, add one clause that `ksp.useKSP2` is documented as to be removed, so any explicit value is cleanup.
   - Rationale: plugin error message states it.
   - Verification: `grep -rn 'ksp.useKSP2' gradle.properties **/gradle.properties`; empty output is the pass.
3. KT-COMP-08, reword the gap to "Auto Factory" and add that KSP processors can themselves be deprecated (Koin Annotations).
   - Verification: check each named kapt processor against the supported-libraries table.
4. Advisory: avoid pinning KSP 2.3.13 (documented regression, issue 3286). Verification: read the pinned `com.google.devtools.ksp` version.

## Sources fetched

1. https://github.com/google/ksp/releases and the GitHub API for releases 2.3.11, 2.3.12, 2.3.0
2. https://github.com/Kotlin/dokka/releases and API release v2.3.0
3. https://kotlinlang.org/docs/ksp-overview.html
4. https://kotlinlang.org/docs/ksp-kapt-migration.html
5. https://kotlinlang.org/docs/kapt.html
6. https://kotlinlang.org/docs/dokka-migration.html
7. https://kotlinlang.org/docs/dokka-gradle.html
8. https://kotlinlang.org/docs/dokka-gradle-configuration-options.html
9. google/ksp KspExtension.kt and KspSubplugin.kt on main (GitHub API)
10. google/ksp PR 3066
11. docs/ksp2.md on google/ksp (partial)
