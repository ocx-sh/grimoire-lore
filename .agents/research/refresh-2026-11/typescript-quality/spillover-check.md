---
title: typescript-quality spillover check, 2026-11-27
target: typescript-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# Spillover check for typescript-quality

Both items came from the typescript-packaging pipeline (decision file `.agents/research/refresh-2026-11/typescript-packaging.md`, evidence `.agents/research/refresh-2026-11/typescript-packaging/lint-config-pointer-facts.md`).

## Item 1: Biome "rule name alone is a no-op" (TS-MOD-12)

Item: the claim that a Biome project-domain rule named under `linter.rules` without `linter.domains.project` does nothing may be too strong.

Verdict: confirmed by primary source (the claim is false for noImportCycles on Biome 2.6.9), established by a local fixture run. The documentation and changelog are consistent with that result but do not state the single-rule case.

Evidence:
- Fixture run on 2026-11-27 with `@biomejs/biome@2.6.9` (the latest release, 2026-11-24 per the packaging pair): two files `src/a.ts` and `src/b.ts` importing each other. Config A set only `linter.rules.suspicious.noImportCycles: "error"`; config B added `linter.domains.project: "recommended"`. Both runs reported `lint/suspicious/noImportCycles` on both files ("Found 2 errors"). The rule name alone is therefore not a no-op, at least for this rule.
- The changelog, 2.6.2 section of https://raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md (primary; the page states no per-entry date): "The rule is now part of the `project` domain, so enabling it makes Biome scan your project."
- https://biomejs.dev/linter/domains/ (primary): "When enabling rules that belong to this domain, Biome will scan the entire project."
- Not tested: the other three rules named in TS-MOD-12 (noUndeclaredDependencies, noUnresolvedImports, noPrivateImports).

Affected text, `skills/typescript-quality-reference/modules.md`:
- Line 161: `// biome.json — the rule name alone is a no-op without the domain`
- TS-MOD-12 rationale: "Biome builds the module graph only when the domain is on. The rule name under `linter.rules` alone ships a config that looks enforced and is very plausibly a no-op, with no error to say so."
- Anti-pattern 6, around line 227: "Enabling a Biome `project`-domain rule by name alone, shipping a config that looks enforced and is very plausibly a no-op."

Smallest change to make the target true: keep the rule (setting the domain explicitly is still sound advice) and replace the false mechanism. Comment line becomes `// biome.json — name the domain explicitly; enabling a project rule also triggers the scan`. Rationale sentences become "Enabling a project-domain rule makes Biome scan the project, so the rule fires without the domain on 2.6.9 (verified for noImportCycles). Setting `linter.domains.project` explicitly keeps the intent visible and controls which project rules run." Anti-pattern 6 should be reworded or dropped. Consider downgrading TS-MOD-12 from MUST, since omitting the domain is no longer a silent failure.

## Item 2: typescript-eslint 8.73.0 projectService.EXPERIMENTAL_backend 'tsgo'

Item: 8.73.0 adds opt-in `projectService.EXPERIMENTAL_backend: 'tsgo'` (TS 7.1 or later), which does not support `parserOptions.project`; the projectService grep stays valid.

Verdict: confirmed by primary source, and target already correct.

Evidence:
- https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0, dated 2026-11-16: "typescript-estree: add projectService.EXPERIMENTAL_backend for TypeScript 7.1 native parser support over IPC".
- https://typescript-eslint.io/packages/parser/#projectservice (primary): value `'tsgo'` opts in; needs a TypeScript 7.1 nightly aliased as `@typescript/native` (at least `7.1.0-dev.20261009.1`) beside classic TypeScript 6; "The tsgo backend does not support the legacy `parserOptions.project` and `parserOptions.programs` configuration options."

Affected text, `skills/typescript-quality-reference/types.md` line 50: "reaches 7.1 only through the experimental `projectService.EXPERIMENTAL_backend` (8.73.0 and later)". The TS-TYP-01 and TS-GATE verifications grep for `projectService`, which stays literal under the tsgo backend, so they remain valid.

Smallest change: none.
