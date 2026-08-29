---
title: "TypeScript topic map — wave 1 deduplicated, adjudicated, wave 2 commissioned"
phase: 3
model: opus
date: 2026-08-29
wave: "1 consolidated → 2 commissioned"
sources_surveyed: 12
candidates_deduplicated: 212
---

# TypeScript topic map (phase 3)

## How to read this

1. Every row is a **question**, not a subject area — a question a rule can
   later answer with a verification command. 2. **Coverage** is measured
   against the shipped Rust and Python rule sets *and* against the six
   `quality-typescript.md` files already scattered in the fleet; `covered`
   means a rule exists and is right, not that someone wrote prose about it.
   3. **Priority is against THIS fleet.** A topic that is P0 in
   TypeScript-in-general and already clean in all nine repos is P3 here; the
   reverse also happens (see `fetch-timeouts`). 4. **Shapes**: 1 =
   npm-distributed CLI on NodeNext (`ocx-catalog`, `grimoire-indexer`) · 2 =
   VS Code extension (`grimoire-vscode`, `vscode-ocx`) · 3 = GitHub Action
   on Bun (`setup-ocx`) · 4 = browser SPA (`fma`, `creeptd-ng/web`) · 5 =
   Biome monorepo (`kate-middlechild`) · `all` = binds every shape. 5.
   Source keys are links: [frame](typescript-frame.md) ·
   [cfg](typescript-audit/config-inventory.md) ·
   [shape](typescript-audit/code-shape.md) ·
   [contract](typescript-audit/implemented-contracts.md) ·
   [runtime](typescript-audit/runtime-posture.md) ·
   [canon](typescript-topic-map/canonical.md) ·
   [prac](typescript-topic-map/practitioner.md) ·
   [cod](typescript-topic-map/codified.md) ·
   [lint](typescript-topic-map/lint-catalogue-sweep.md) ·
   [def](typescript-topic-map/defects.md) ·
   [hard](typescript-topic-map/hardening.md) ·
   [shift](typescript-topic-map/recent-shifts.md).

## Conflicts resolved

Nine places where two wave-1 artifacts disagreed, or where an artifact
disagreed with the frame. Each resolution names the evidence that decided
it.

**1. Which TypeScript is current.** `canon` and `shift` date 6.0 to
2026-03-23 and 7.0 stable to 2026-07-08; `cod` frames its entire flag
catalogue around a 5.x world and warns "confirm the fleet's floor is
actually 5.8+ before adopting `erasableSyntaxOnly`". **Resolved for
`canon`/`shift`** by the registry, not by either narrative: `npm view
typescript dist-tags` returns `latest 7.0.2`, `rc 7.0.1-rc`, `beta
6.0.0-beta`. `cod`'s flag *table* survives; its era framing is stale and
every "verify against 5.7" caveat in it must be re-read as "verify against
6.0".

**2. The fleet's declared floor is not `^5.7`, and there are four eras, not
three.** The frame asserts "`^5.7.0` floors where pinned". `cfg` §5
measured: `^6.0.3` in four repos, `^5.9.3` in `ocx-catalog`,
`^5.7.2`/`^5.7.0` in the two SPAs — and, in prose the frame's own correction
table dropped, **`^5.8.0` in `kate-middlechild` via its Bun `catalog:`
field** (`kate-middlechild/package.json:6-11`). The frame's correction says
"none" for that repo and "three separate eras are live"; `cfg` is the direct
read and wins. **Four eras: 6.0.3, 5.9.3, 5.8.0, 5.7.x.** This matters
because 5.8 is exactly the `erasableSyntaxOnly` boundary and
`kate-middlechild` is one of the two Bun-executing repos.

**3. The strictness gradient runs backwards.** The frame predicted the VS
Code shape had "the strictest tsconfig in the fleet" and the published
packages would be the exemplar. `cfg` §1 measured the inverse: `ocx-catalog`
and `grimoire-indexer` are the only two tsconfigs setting **none** of
`exactOptionalPropertyTypes`/`verbatimModuleSyntax`, and `ocx-catalog` also
lacks `noUncheckedIndexedAccess`. Every app, extension, Action and monorepo
config has all three. **Resolved for `cfg`** — and `ocx-catalog`'s own rule
file admits the gap at `.claude/rules/quality-typescript.md:40-45`, so this
is acknowledged, not accidental.

**4. `any` is not the escape hatch; the double-cast is.** `def` opens its
catalogue with `any` propagation and rates "forbid bare `any` params" high;
`prac` gives it a named two-exception policy. `shape` §2 measured **4 `any`
fleet-wide, 0 in seven of eight repos**, versus **164 `as unknown as T`**,
79 of them in one 6,899-line file. **Resolved for `shape`**: the `any` ban
is preservation (P3 here), and `fake-vscode-helper` is promoted to P0. The
catalogues are not wrong about TypeScript; they are wrong about this fleet's
ordering.

**5. Shape 1 is not a library, so the packaging vein is half as deep as
three scouts assumed.** `canon`, `prac` and `cod` all build packaging topics
on "published typed library" — `isolatedDeclarations`, `.d.ts` authoring
discipline, dual-publish/`FalseCJS`, `exports` types-first ordering, Rich
Harris's JSDoc-for-libraries fork. `shape` §7 and `contract` §4 measured
both declared entry points as literal `export {};` stubs, and `ocx-catalog`
as having no `"."` export at all. **Resolved for `shape`/`contract`**:
`publint`/`attw` survive (there is still a `bin`, and one real `./theme`
subpath resolving to `.mts` **source**), `isolatedDeclarations` drops to P3,
and the JSDoc-vs-`.ts` fork is moot — deferred, not selected.

**6. Two rule files claim a capability their config does not have.** `cfg`
§6 records `grimoire-vscode` and `vscode-ocx`'s `quality-typescript.md`
tooling tables describing ESLint as delivering "type-aware rules"; `cfg` §2
shows neither `eslint.config.mjs` wires `parserOptions.project`, and
`runtime` §1 independently confirms 0 hits for
`no-floating-promises`/`no-misused-promises` in any config fleet-wide.
**Resolved: the documents are aspirational.** Consequence for phase 7 — the
six existing `quality-typescript.md` files are evidence of *intent*, never
of practice, and the consolidation must re-verify every claim against
config.

**7. `cod` and `shift` disagree about `noUncheckedSideEffectImports`'
default.** `cod` records default `true` "per fetched catalogue" and flags it
for verification against 5.7; `shift` records it as one of the **nine
defaults TS 6.0 flipped**. Both are right about different compilers. `cfg`
measured it explicitly set in exactly one repo (`fma`). **Resolved: it is a
6.0 default flip.** So the two SPAs pinned at `^5.7.x` do not get it — `fma`
sets it by hand and is correct, `creeptd-ng/web` has it off and does not
know. This generalises into a rule-authoring constraint: **every rule
resting on a 6.0-or-later default must be marked, because two repos will
never see it.**

**8. `exit.ts` is a `const` object, not a `const enum`.** `contract` §1
describes `ocx-catalog`'s exit codes as a "named `const` enum". `shape` §3
measured `enum` = 0 and `const enum` = 0 in `ocx-catalog` (and `const enum`
= 0 fleet-wide; the only 3 `enum`s live in `creeptd-ng/web`). **Resolved for
`shape`** — `contract`'s phrase is prose slippage. It matters: a rule
asserting "this fleet already models exit codes as enums" would be false,
and would contradict the `erasableSyntaxOnly`/`isolatedModules` ban the same
rule set is about to impose.

**9. Priority inversion on cancellation.** `canon` rates
`AbortSignal.any()`/`.timeout()` **med** and treats it as a modernisation
topic; `runtime` §3 measured **13 of 14 first-party `fetch()` call sites
with no timeout and no signal**, with the single compliant site
(`grimoire-indexer/src/validate/adapters/http.ts:96`) showing the fix is one
line that was never propagated. **Resolved for `runtime`: P0.** Same shape
as conflict 4 — a general-practice "med" is a fleet-specific "now".

Two smaller ones, recorded without ceremony: `lint` verdicts
`n/no-process-exit` as rule-text because `process.exit()` is "legitimate in
CLI entrypoints", while `shape` §4 measured this fleet's convention as the
*stricter* opposite (4 call sites, all inside one child-process worker, plus
two inline comments forbidding it in the CLI entry) — the fleet's convention
wins. And `cod` recommends delegating unused-binding detection to ESLint
rather than the compiler, while `cfg` found three repos enabling both, with
the compiler flag having no `^_` escape hatch the ESLint config relies on —
a live double-enforcement conflict, filed as `unused-bindings-owner`.

## The map

212 rows after dedup, from ~270 raw candidates across twelve artifacts.
Merged rows say so. Coverage is against the Rust and Python rule sets
**and** the six in-fleet `quality-typescript.md` files.

### A. Era, floors and version currency — 11 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| era-current-vs-floor | Which TypeScript is current for a rule written today, and which is this fleet's working floor? | [frame](typescript-frame.md), [canon](typescript-topic-map/canonical.md), [cod](typescript-topic-map/codified.md), [shift](typescript-topic-map/recent-shifts.md) | uncovered | P0 | all | `npm view typescript dist-tags` vs `jq .devDependencies.typescript` per repo |
| ts7-blocks-tooling | Can this fleet adopt TS 7.0 at all while typescript-eslint and ts-morph have no programmatic API until 7.1? | [canon](typescript-topic-map/canonical.md), [shift](typescript-topic-map/recent-shifts.md) | uncovered | P0 | 1·2·3·5 | dependency graph: any dep importing `typescript` as a library |
| six-oh-default-flips | Which rules rest on a TS 6.0 default flip and therefore do not hold in the two `^5.7` SPAs? | [cod](typescript-topic-map/codified.md), [shift](typescript-topic-map/recent-shifts.md), [cfg](typescript-audit/config-inventory.md) | uncovered | P0 | 4 | `tsc --showConfig` per repo, diffed against the 6.0 default list |
| upgrade-is-wrong-advice | What does the rule set say when "upgrade to latest" is the actively wrong answer? | [frame](typescript-frame.md), [canon](typescript-topic-map/canonical.md) | uncovered | P0 | all | rule text; no tool catches bad advice |
| node20-eol-floor | Is a declared `engines.node` floor a supported runtime, given Node 20 went EOL in March 2026? | [cod](typescript-topic-map/codified.md), [shift](typescript-topic-map/recent-shifts.md), [cfg](typescript-audit/config-inventory.md) | uncovered | P0 | 1·2 | `jq .engines.node` vs nodejs.org/en/about/eol |
| ci-runs-the-floor | Does CI actually install and run the declared floor, or only a convenient version? | [cfg](typescript-audit/config-inventory.md) | partial | P1 | all | workflow `node-version` vs `engines.node` |
| four-compiler-eras | Is four live TypeScript eras in one fleet deliberate, or drift nobody owns? | [cfg](typescript-audit/config-inventory.md) | uncovered | P1 | all | lockfile-resolved version sweep across 9 repos |
| stale-prerelease-lock | Does a lockfile still carry a prerelease compiler (`ocx-catalog`'s stray `5.6.1-rc`)? | [cfg](typescript-audit/config-inventory.md) | uncovered | P2 | 1 | grep the lockfile for `-rc`/`-beta`/`-dev` on `typescript` |
| major-bump-gate | Should `--ts6-migration` and `--stableTypeOrdering` gate a compiler major bump? | [shift](typescript-topic-map/recent-shifts.md) | uncovered | P2 | 1·2·3 | CI step presence on a version-bump PR |
| corepack-cliff | Is Corepack assumed present on any CI leg at Node ≥25, where it is no longer bundled? | [cod](typescript-topic-map/codified.md), [shift](typescript-topic-map/recent-shifts.md), [hard](typescript-topic-map/hardening.md) | uncovered | P2 | all | `grep -rn "corepack enable" .github/` vs the matrix |
| removed-six-oh-options | Does any tsconfig still use options 6.0 removed or deprecated (`outFile`, `moduleResolution: node`, `target: es5`, `downlevelIteration`, `assert {}` imports)? | [shift](typescript-topic-map/recent-shifts.md), [cfg](typescript-audit/config-inventory.md) | covered | P3 | all | `jq` sweep over all 15 tsconfigs — measured clean, encode to keep it |

### B. tsconfig: the strictness floor and per-shape profiles — 15 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| rulefile-vs-tsconfig-drift | Do the six in-fleet `quality-typescript.md` files' tsconfig claims match the repo's actual tsconfig? | [cfg](typescript-audit/config-inventory.md) | uncovered | P0 | all | diff each rule file's flag list against `tsc --showConfig` |
| unchecked-indexed-access | Should `noUncheckedIndexedAccess` be fleet-wide when the largest package is the only repo missing it? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md), [def](typescript-topic-map/defects.md) | partial | P1 | all | `jq '.compilerOptions.noUncheckedIndexedAccess'` per tsconfig |
| exact-optional-props | Which shapes genuinely need "absent" and "present but undefined" to differ? | [cod](typescript-topic-map/codified.md), [canon](typescript-topic-map/canonical.md), [cfg](typescript-audit/config-inventory.md) | partial | P1 | 1·4 | `jq` + a spread-with-`?? undefined` grep for migration cost |
| verbatim-plus-isolated | Why are `verbatimModuleSyntax` and `isolatedModules` one unit rather than two flags? | [cod](typescript-topic-map/codified.md), [def](typescript-topic-map/defects.md), [prac](typescript-topic-map/practitioner.md) | partial | P1 | all | `jq` both keys; either alone is the violation |
| erasable-syntax-only | Where does `erasableSyntaxOnly` bind, and is the compiler floor there in those repos? | [cod](typescript-topic-map/codified.md), [prac](typescript-topic-map/practitioner.md), [canon](typescript-topic-map/canonical.md), [shift](typescript-topic-map/recent-shifts.md) | uncovered | P1 | 3·5·1 | `jq` the flag; cross-check the repo's TS version is ≥5.8 |
| unused-bindings-owner | Compiler `noUnusedLocals` or ESLint `no-unused-vars` with `^_` — which owns unused bindings, given the compiler has no ignore pattern? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md) | uncovered | P1 | all | both configs read together; both enabled is the violation |
| profile-per-shape | One tsconfig profile per shape, or one base with per-shape deltas? | [cod](typescript-topic-map/codified.md), [cfg](typescript-audit/config-inventory.md) | uncovered | P1 | all | read every `extends` chain; 15 tsconfigs, 2 base files |
| split-by-resolution | When one repo mixes a Node-target library and a bundler-target UI, split tsconfigs by `moduleResolution` rather than fight one config? | [shape](typescript-audit/code-shape.md) | uncovered | P1 | 1 | read `ocx-catalog/tsconfig.theme.json` — the exemplar, comment included |
| strict-is-universal | Is `strict: true` universal, and is it ever routed around per-file? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md) | covered | P3 | all | `jq` 13/13 real tsconfigs; `rg '@ts-nocheck'` = 0 |
| no-implicit-returns | `noImplicitReturns` is set in zero of fifteen tsconfigs — decision or omission? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md) | uncovered | P2 | all | `jq`; the flag's absence is uniform, so it was never considered |
| strictness-block | `noImplicitOverride`/`noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` travel together in exactly three repos — promote the block? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md) | partial | P2 | all | `jq` all four keys; partial adoption is the finding |
| consistent-casing | Is `forceConsistentCasingInFileNames` set on a fleet whose extension work spans WSL, Windows and macOS? | [cod](typescript-topic-map/codified.md) | uncovered | P2 | 2 | `jq`; 0 of 15 set it |
| oneoff-flags | `noPropertyAccessFromIndexSignature` and `noUncheckedSideEffectImports` appear in one repo each — adopt fleet-wide or drop? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md) | uncovered | P3 | all | `jq`; neither is shape-correlated |
| skip-lib-check | Is universal `skipLibCheck: true` a considered trade or a copied default? | [cfg](typescript-audit/config-inventory.md), [cod](typescript-topic-map/codified.md) | covered | P3 | all | `jq` 12/12; every codified base agrees, so it stays |
| isolated-declarations | Does `isolatedDeclarations` earn its migration cost when neither package exports anything? | [canon](typescript-topic-map/canonical.md), [cod](typescript-topic-map/codified.md), [shape](typescript-audit/code-shape.md) | uncovered | P3 | 1·5 | `jq`; cross-check against the `export {}` entry points |

### C. The gate: lint, typecheck, CI — 20 rows

Source keys below use the short form from the legend above.

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| type-aware-wiring | Is type-aware linting wired anywhere but one repo, and what is structurally invisible without it? | cfg, runtime, cod, lint | uncovered | P0 | all | `rg 'projectService\|parserOptions' **/eslint.config.*` — 1 of 9 |
| rulefile-claims-typed | Do two repos' rule files claim type-aware rules their config does not wire? | cfg | uncovered | P0 | 2 | diff the rule file's tooling table against `eslint.config.mjs` |
| no-preset-type-aware | Which twelve type-aware typescript-eslint rules ship in no preset at all, and which matter here? | lint | uncovered | P0 | all | rule list vs enabled set; `strict-type-checked` does not include them |
| biome-floating-promises | Does the one Biome repo get floating-promise detection at all, given `noFloatingPromises` is nursery? | lint, runtime | uncovered | P0 | 5 | `jq '.linter.rules.nursery' biome.json` — absent |
| dead-lint-script | Does `creeptd-ng/web`'s `lint` script have a config anywhere to run against? | cfg, runtime | uncovered | P0 | 4 | `find creeptd-ng/web -iname 'eslint.config.*'` — 0 hits outside a worktree |
| action-never-typechecks | Does `setup-ocx` type-check at all, when lint is its only type gate and no `tsc --noEmit` exists? | cfg | uncovered | P0 | 3 | `rg 'tsc' setup-ocx/package.json setup-ocx/taskfile.yml` — 0 |
| rule-text-residue-home | Where do the ~54 `adopt-as-rule-text` practices live if not in a lint config? | lint | uncovered | P0 | all | rule-file coverage of the 54-item list |
| exhaustive-and-boolean | `switch-exhaustiveness-check` and `strict-boolean-expressions` have no preset and no substitute in any catalogue — adopt? | lint | uncovered | P1 | all | rule presence in each config |
| eslint-biome-severity-map | Is the ESLint↔Biome rule mapping 1:1 in severity, or does the same name mean different tiers? | lint | uncovered | P1 | 5 | build the mapping table; `only-throw-error` vs `useThrowOnlyError` is the exemplar |
| extension-rule-double-enable | Does any config enable a typescript-eslint extension rule without turning its core twin off? | lint | uncovered | P1 | all | audit all 7 flat configs against the 25-rule extension list |
| one-command-gate | Is there one command chaining lint → typecheck → test, and does CI run that same command? | cfg | partial | P1 | all | taskfile/scripts vs workflow steps; 6 of 9 have a wrapper |
| gate-with-no-ci | Two repos have a full local gate and zero CI — is a gate nothing runs a gate? | cfg | uncovered | P1 | 4·5 | `ls .github/workflows` — absent in `fma` and `kate-middlechild` |
| runtime-api-availability | Should `n/no-unsupported-features/node-builtins` be wired, when nothing else in any catalogue checks API availability per engine? | lint | uncovered | P1 | 1·3 | plugin presence; the only rule family that reads `engines` |
| import-x-adoption | Should `eslint-plugin-import-x` be adopted, and for which rules (`no-cycle`, `no-extraneous-dependencies`, `no-unresolved`)? | lint | uncovered | P1 | all | plugin presence; note the unmaintained `eslint-plugin-import` trap |
| vue-sfc-in-gate | Are the fleet's 52 `.vue` SFCs inside the type and lint gate at all? | shape, cfg | uncovered | P1 | 1·4 | script globs and `vue-tsc` invocation vs the `.vue` file list |
| sibling-severity-drift | Two sibling extensions ship an identical rule set at `error` and at `warn` — deliberate? | cfg | uncovered | P2 | 2 | diff `eslint.config.mjs` between the two repos |
| lint-glob-narrowing | Do lint globs cover the tree (`eslint .`) or a subdirectory (`eslint src`)? | cfg | uncovered | P2 | 2 | read the `lint` script in each package.json |
| max-warnings-zero | Is `--max-warnings 0` set wherever severities are `warn`? | cfg | uncovered | P2 | 2 | read the `lint` script; one repo has it, its sibling does not |
| oxlint-second-pass | Is oxlint's now-stable type-aware linting a real second pass, or a replacement, for the Biome repo? | lint, shift | uncovered | P2 | 5 | benchmark against the existing gate |
| eslint-major-split | ESLint 9 and 10 are both live in the fleet — does one config shape survive both? | cfg | uncovered | P2 | all | `jq .devDependencies.eslint` per repo |

### D. Type-system idiom and escape hatches — 17 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| real-escape-hatch | Is `any` the escape hatch in this fleet, or is it `as unknown as T`? | shape, def | uncovered | P0 | all | `rg -c 'as unknown as'` vs `rg -c ': any\b'` — 164 vs 4 |
| fake-helper-not-double-cast | Should a faked third-party API type go behind one named `fake<T>()` helper instead of 164 inline double-casts? | shape | uncovered | P0 | 2·1·4 | `rg -c 'as unknown as' --stats` per file; 79 in one file |
| satisfies-vs-as-const | `satisfies`, `as const`, and a plain annotation are three inference outcomes — when is each right? | canon, def | partial | P1 | all | review heuristic; `no-unnecessary-type-assertion` catches a strict subset |
| exhaustiveness-mechanism | How is exhaustiveness actually enforced — a `never` default branch, the lint rule, or both? | canon, cod, cfg | partial | P1 | all | `rg 'never'` in switch defaults + `switch-exhaustiveness-check` presence |
| assertion-to-silence | Is `as X` ever a legitimate way to silence a type error, and what replaces it? | def, prac, cfg | covered | P2 | all | `no-unnecessary-type-assertion`, `no-unsafe-type-assertion` |
| non-null-policy | 30 non-null `!` fleet-wide — ban, or require a justification comment? | shape, lint | partial | P2 | all | `rg '\w!\.'` plus `no-non-null-assertion` posture |
| bivariant-methods | Is `method-signature-style` worth the churn to close the method-shorthand bivariance hole? | prac, def | uncovered | P2 | all | lint rule; the hole is real and TS's own team defends it |
| freshness-bypass | Does routing an object literal through a variable silently disable excess-property checking? | def, prac | uncovered | P2 | all | review heuristic; no lint flags the bypass |
| enum-ban-basis | Three `enum`s exist, all in one repo — ban by lint, by `erasableSyntaxOnly`, or by prose? | def, cod, shape | partial | P2 | 4 | `rg 'enum '` + the flag; note `const enum` is already 0 |
| unbound-method | Is a class method ever passed as a bare callback, losing `this`? | def, lint | uncovered | P2 | 2·4 | `@typescript-eslint/unbound-method` (type-aware, so currently blind) |
| file-cohesion | One file exports 94 symbols and mixes types with 70 free functions — is cohesion a checkable rule? | shape | uncovered | P2 | 2 | export-count script; 22 files over 10 exports, 16 in one repo |
| ambient-declarations | Are the hand-written `.d.ts` shims and the one `declare global` load-bearing and invisible? | shape, canon | uncovered | P2 | 1·2·4 | `rg '^\s*declare (module\|global)'` — 7 sites, 1 real |
| ts-expect-error-only | `@ts-expect-error` over `@ts-ignore` is already 0/2 — preserve the rule or drop it? | shape, cfg | covered | P3 | all | `rg '@ts-ignore\|@ts-nocheck'` — 0 fleet-wide |
| object-keys-widening | Is `Object.keys()`'s result ever hand-widened with `as (keyof T)[]`, reintroducing designed-away unsoundness? | def | uncovered | P3 | all | `rg 'as \(keyof'` near `Object.keys(` |
| readonly-erasure | Does any rule pretend `readonly` survives a boundary it does not? | def | uncovered | P3 | all | review heuristic; `Object.freeze` is the runtime complement |
| interface-vs-type | Six of eight repos prefer `interface`; two invert for wire shapes — rule, or a fact about the domain? | shape, cod | partial | P3 | all | `consistent-type-definitions`; the inversion tracks protocol surface |
| inferred-predicates | Are trivial hand-written `is` guards still being written after 5.5's inferred type predicates? | shift | uncovered | P3 | all | `rg 'function is[A-Z]\w*\(.*\): \w+ is '` and read the bodies |

### E. Async, promises, cancellation — 14 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| floating-promise-blindness | Can any repo but one see a floating promise, and what has therefore never been checked? | runtime, cfg, lint | uncovered | P0 | all | `no-floating-promises` presence — 1 of 9 |
| void-is-not-a-handler | Does `void x()` handle a rejection, or only silence the linter that is not running? | runtime | uncovered | P0 | 2·4 | `rg '^\s*void [a-zA-Z]'` — 98 sites — then read each callee for self-catch |
| fetch-timeouts | Thirteen of fourteen first-party `fetch()` sites carry no timeout and no signal — what is the rule? | runtime, canon | uncovered | P0 | all | `rg -c 'AbortSignal'` vs `rg -c 'fetch('` |
| misused-promise-callbacks | `forEach(async …)` and `.map(async …)` are named agent mistakes that pass `tsc` clean — caught by what? | def, lint | uncovered | P1 | all | `no-misused-promises` with `checksVoidReturn` |
| async-void-handlers | An async handler passed where a void-returning callback is expected (onClick, addEventListener) — how many, and what breaks? | runtime | uncovered | P1 | 4·1 | `rg 'on[A-Z]\w*=\{async'` and `rg 'addEventListener\([^)]*async'` |
| abortsignal-composition | How does a caller's signal compose with a library-imposed timeout (`AbortSignal.any`/`.timeout`)? | canon, lint | uncovered | P1 | 1·2·4 | `rg 'AbortSignal\.'` — 1 site fleet-wide |
| rpc-default-timeout | Do the Connect-RPC transports set `defaultTimeoutMs`, or inherit whatever the browser does? | runtime | uncovered | P1 | 4 | read `createConnectTransport({...})` in both client factories |
| no-process-level-guard | Zero process-level `unhandledRejection`/`uncaughtException` handlers exist — correct per shape, or a gap? | runtime | uncovered | P1 | all | `rg 'unhandledRejection\|uncaughtException'` — 2 hits, both in a test |
| actions-exec-unbounded | `@actions/exec` exposes no per-call timeout — what bounds the Action's subprocesses? | runtime | uncovered | P2 | 3 | read the three call sites plus the workflow's `timeout-minutes` |
| allsettled-vs-all | `Promise.all` is fail-fast and leaves sibling rejections unobserved — when is `allSettled` required? | def | uncovered | P2 | all | review heuristic; `Promise.race` = 0, `allSettled` = 2 fleet-wide |
| unbounded-concurrency | Does any `Promise.all(arr.map(...))` run over wire-sized input with no concurrency cap? | def | uncovered | P2 | 1 | review every `Promise.all` whose array length is not a code-controlled constant |
| rejection-semantics-per-runtime | Do Node, Bun, the browser and `bun test` agree on what an unhandled rejection does? | runtime, def | uncovered | P2 | 3 | run the same rejecting module under `bun test`, `bun run`, `node` |
| async-lint-set | Which of `require-await`, `promise-function-async`, `return-await`, `await-thenable` are off here, and why? | lint | uncovered | P2 | all | config audit; all four are type-aware, so all four are off in 8 of 9 |
| promise-chaining-absent | `await` has fully displaced `.then()` — is that discipline worth encoding, or an artifact? | shape | uncovered | P3 | all | `rg -c '\.then('` vs `rg -c '\bawait\b'` — 1855 vs 11 in one repo |

### F. Resource lifecycle and cleanup — 10 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| using-belongs-here | Does `using`/`await using` belong in this fleet, and where does it collide with `vscode.Disposable`? | canon, prac, cod, shift | uncovered | P0 | 1·2·3 | `rg '\busing '` = 0; cross-check TS ≥5.2 and the runtime's `Symbol.dispose` |
| disposable-shaped-inventory | Which resources here are already `Symbol.dispose`-shaped (FileHandle, child process, watcher, OutputChannel)? | canon | uncovered | P1 | all | inventory the cleanup sites; each is a candidate |
| child-process-discipline | Is every child process argv-array, with a timeout, an exit-code check and captured stderr? | runtime | partial | P1 | 1·2·3 | `rg 'execFile\(\|spawn\('` then read each; one of six sites has no timeout |
| trycatch-where-using-fits | Is `try/finally` hand-rolled where `using` now applies? | shift | uncovered | P2 | all | `rg -A3 'try \{' | rg 'finally'` then read for `.close()`/`.dispose()` |
| timer-cleanup | Is every `setInterval` cleared, or does a documented lifetime justify leaving it? | runtime, shape | partial | P2 | 2·4 | `rg -c 'setInterval\('` vs `clearInterval` per repo; three repos are 12/0, 7/0, 1/0 |
| timeout-pattern-not-copied | `extract()` has no timeout while its sibling `runJson()` in the same repo does — pattern, or copy? | runtime | uncovered | P2 | 2 | `rg -n 'timeout' grimoire-vscode/src/installer.ts grimoire-vscode/src/grim.ts` |
| file-io-encoding | Does `fs/promises` I/O ever need an explicit close, and is an encoding always passed to `readFile`? | canon, hard | uncovered | P2 | all | `rg 'readFile\('` and check for a nearby `encoding`/`'utf8'` |
| structured-clone | Is `JSON.parse(JSON.stringify(x))` used as a deep clone anywhere `structuredClone` belongs? | def, hard, lint | uncovered | P2 | all | `rg 'JSON.parse\(JSON.stringify\('` |
| timer-as-disposable | Is a raw timer ever folded into VS Code's disposable lifecycle, and is that the pattern to encode? | runtime | covered | P3 | 2 | read `extension.ts:653` — the exemplar |
| weakref-nondeterminism | `WeakRef`/`FinalizationRegistry` are typed and callable with no warning — forbid for correctness-bearing cleanup? | canon | uncovered | P3 | all | `rg 'WeakRef\|FinalizationRegistry'` — 0 today; preventive |

### G. Errors and trust boundaries — 14 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| error-cause-zero | Zero `Error.cause` fleet-wide — is every rethrow discarding the failure that caused it? | contract, frame | uncovered | P0 | all | `rg '\{ cause:'` — 0 hits in all 9 repos |
| taxonomy-two-populations | Seven of nine repos define no error class and throw 75 bare `Error(string)` — what does the rule say per shape? | contract | uncovered | P0 | all | `rg 'class \w+ extends Error'` per repo |
| cast-after-parse | Is a `JSON.parse` or `fetch().json()` result ever asserted with `as T` instead of validated? | hard, def | uncovered | P0 | all | `rg -A2 'JSON.parse\(' | rg ' as '` |
| spa-no-error-boundary | Neither SPA has an error boundary or a global handler — what does a user see when render throws? | runtime | uncovered | P0 | 4 | `rg 'ErrorBoundary\|componentDidCatch'` and `rg 'errorHandler'` — 0 and 0 |
| bare-error-in-typed-repo | Sixty percent of throws are plain `Error` even in files that define and elsewhere use a domain class — inconsistency or intent? | shape, contract | uncovered | P1 | 1 | `rg -c 'throw new Error\('` vs `rg -c 'throw new [A-Z]\w*Error\('` |
| one-classifier | One classifier function, or `instanceof` dispatch repeated at three call sites — which shape does the rule name? | contract | uncovered | P1 | 1 | read `main.ts:66-94` against `build.ts`/`dev.ts`/`main.ts` in the sibling repo |
| stack-discarded | The unexpected-error branch logs `err.message` and throws the only stack that mattered away — rule? | runtime | uncovered | P1 | 1 | `rg 'console.error\(.*\.message\)'` and `rg 'String\(err' ` |
| ajv-decorative | `ajv` is a dependency in two repos and validates nothing at runtime — wire it or delete it? | contract | uncovered | P1 | 1·2 | `rg -l 'ajv\|Ajv' <repo>/src` excluding tests — 0 hits in both |
| schema-agreement | A hand-rolled validator and a checked-in JSON Schema both claim to describe one shape — what keeps them in agreement? | contract | partial | P1 | 1·2 | presence of a `schema-agreement.test.ts` equivalent; 1 of 2 has one |
| only-throw-error | Can a non-Error be thrown, and is `only-throw-error` running anywhere? | lint, cfg | uncovered | P2 | all | rule presence; type-aware, so off in 8 of 9 |
| catch-unknown | `catch (e)` defaults to `unknown`, but does the `.catch()` callback form get the same treatment? | lint | uncovered | P2 | all | `use-unknown-in-catch-callback-variable` — `strict-type-checked` only |
| name-vs-instanceof | Should a named error class be matched by `.name` or `instanceof` when the module is dynamically imported? | contract | uncovered | P2 | 1 | read `main.ts:82-91` — matched by name, deliberately |
| open-vs-closed-record | One parser rejects unknown keys, another accepts them silently — is the asymmetry deliberate and written down? | contract | uncovered | P2 | 1 | read both validators; both policies are correct for their format |
| standard-schema-target | Should shared validation helpers type against `StandardSchemaV1` rather than one validator's own type? | hard | uncovered | P3 | 5 | read any shared helper's parameter type |

### H. Modules, resolution, interop — 14 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| resolution-four-ways | Four `moduleResolution` values across nine repos — which axis decides, and does the answer differ by shape or by consumer? | cfg, canon, prac | uncovered | P0 | all | `jq '.compilerOptions.moduleResolution'` over 15 tsconfigs |
| js-extension-required | Do the `Node16`/`NodeNext` repos actually suffix relative imports with `.js`? | shape, def | uncovered | P0 | 2·1 | `tsc --noEmit` under the declared resolution; 11 of 11 violations in one repo |
| attw-unchecked | Are the eleven `attw` problem codes ever checked for the repo that publishes two entry points? | def, cod, contract | uncovered | P0 | 1 | `attw --pack .` in CI — present in 1 of 2 published repos |
| publint-unchecked | Is `publint` run for both published packages, or only for one? | contract, cfg | uncovered | P0 | 1 | devDependencies + CI job; `grimoire-indexer` has neither |
| sibling-module-mode-drift | Two sibling extensions of the same lineage disagree on module mode (`Node16` vs `ESNext`+`Bundler`) — is there a reason? | cfg | uncovered | P1 | 2 | `jq` both tsconfigs and diff |
| import-type-explicit | Is type-only import explicitness enforced by the flag, the lint rule, or neither? | cod, lint | partial | P1 | all | `jq verbatimModuleSyntax` + `consistent-type-imports` presence |
| import-cycles | Circular imports are checked by nothing in any catalogue by default — are there any? | lint, shape | uncovered | P1 | all | one `import-x/no-cycle` CI pass over each repo |
| cross-package-source-import | Does one workspace package import another's source tree directly, past the boundary the monorepo exists to draw? | shape | uncovered | P1 | 5 | `rg "from ['\"](\.\./)+" packages/core` — one confirmed hit |
| nodenext-for-bundler-consumers | Is `nodenext` right for a package whose consumers all use a bundler? | prac | uncovered | P2 | 1 | argued position; cross-check by compiling under both modes |
| frozen-module-mode | `--module node20`/`node18` (frozen) or `nodenext` (a moving target) for a shipped CLI? | canon, prac | uncovered | P2 | 1·3 | `jq .compilerOptions.module` |
| import-attributes | Are JSON import attributes present in the `with` form, and is the deprecated `assert` form gone? | canon, shift | uncovered | P2 | 1 | `rg "import .* assert \{"` and `rg 'with \{ type:'` |
| barrel-files | Twelve barrel files exist, one of them the `export {}` stub — what do they cost on a Vite dev server and on tree-shaking? | shape, lint | uncovered | P2 | 4·1 | `rg -l '^export \* from' **/index.ts` |
| dual-package-hazard | Does anything here dual-publish, and is any module-level singleton exposed to forking? | def | uncovered | P3 | 1 | read both `exports` maps — ESM-only today, so this is preventive |
| node-builtins-in-browser | Do browser-targeted repos import `node:` builtins in anything that ships? | runtime, shape | covered | P3 | 4 | `rg "from ['\"]node:"` — 0 in shipped code, encode to keep it |

### I. Package manifests, publishing, supply chain — 15 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| package-json-carries-everything | What does `**/package.json` actually carry per shape, and is it one glob or five concerns? | frame, cfg, contract | uncovered | P0 | all | enumerate the fields read per shape: `engines`, `type`, `exports`, `bin`, `scripts`, `contributes`, `activationEvents` |
| test-deps-in-dependencies | Are test-only packages ever declared in `dependencies` rather than `devDependencies`? | cfg, frame | uncovered | P1 | 4 | `jq .dependencies` per repo — three confirmed in one |
| two-lockfile-kinds | Two lockfile kinds are committed for one workspace member — which one is authoritative? | cfg | uncovered | P1 | 4 | `ls` for `pnpm-lock.yaml` and `package-lock.json` in the same tree |
| lockfile-policy-by-artifact | Does each repo's install command match its artifact type (library, CLI, app)? | hard | uncovered | P1 | all | install command + lockfile-commit status vs what the repo publishes |
| action-sha-pinning | Are third-party Actions pinned to a full SHA, and why do two sibling repos disagree by a major version? | cfg, hard | uncovered | P1 | all | `rg 'uses:\s*\S+@(v[0-9]\|main\|master)' .github/workflows/` |
| workflow-permissions | Does every workflow declare a top-level `permissions:` block? | hard | uncovered | P1 | all | `rg -L 'permissions:' .github/workflows/*.yml` |
| run-block-interpolation | Is any `${{ }}` expression interpolated directly into a `run:` block? | hard | uncovered | P1 | all | `rg 'run:.*\$\{\{' .github/workflows/` |
| action-set-secret | Does the Action call `core.setSecret()` on its overridable token input before threading it into an Authorization header? | runtime, hard | uncovered | P1 | 3 | `rg 'setSecret' setup-ocx/src` — 0 hits |
| npm-ci-everywhere | Is `npm ci` (never bare `npm install`) used in every CI install path? | hard, cod | partial | P2 | all | `rg 'npm install' .github/workflows/` |
| ignore-scripts-gap | Is `ignore-scripts` set, and does the rule state the documented gap that `npm test`/`start` still run? | hard, cod | uncovered | P2 | all | `.npmrc` presence and content |
| release-age-cooldown | Is a `min-release-age`/`minimumReleaseAge` cooldown configured in any of the four package managers in use? | hard, shift | uncovered | P2 | all | `.npmrc`, `bunfig.toml`, pnpm config, Renovate config |
| npm12-install-defaults | Does any install path rely on npm 11 defaults that npm 12 flipped (`allowScripts`, `--allow-git`, `--allow-remote`)? | shift | uncovered | P2 | all | read the CI install steps against the npm version pinned |
| provenance-vs-signatures | Provenance and `npm audit signatures` are two different guarantees — which does the publish workflow have? | hard, cod | uncovered | P2 | 1 | read `release.yml` for trusted publishing / `--provenance`; `npm audit signatures` in CI |
| publish-file-set | Is a `files` allowlist set so nothing unintended is published? | hard, cod | uncovered | P2 | 1 | `jq .files` + `publint`'s `USE_FILES` |
| dist-drift-check | Is the Action's committed `dist/` rebuilt and diffed in CI? | contract, hard | covered | P3 | 3 | read `taskfile.yml:63-65` — `git diff --exit-code dist/`, already correct |

### J. Runtime binding: Node, Bun, browser, extension host — 12 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| bun-ran-means-nothing | Does "the Action ran under Bun" carry any type-safety guarantee at all? | prac, cod, canon | uncovered | P0 | 3 | presence of a separate `tsc --noEmit` step — absent |
| erasable-only-runtimes | Node's type stripping erases only; which constructs hard-fail, and where in this fleet would they land? | canon, prac, shift | uncovered | P1 | 1·3·5 | `erasableSyntaxOnly` as the compile-time proxy for the runtime constraint |
| engine-api-availability | Which Node or Web APIs used here do not exist on the engine the file actually ships to? | lint | uncovered | P1 | 1·3 | `n/no-unsupported-features/node-builtins` against each repo's `engines` |
| extension-host-dom-types | Does the extension host hand DOM types to code that has no DOM, and what breaks because of it? | canon, cfg | uncovered | P1 | 2 | `jq .compilerOptions.lib` — one extension includes `DOM`, its sibling does not |
| three-test-runners | Three test runners plus Playwright in one fleet — what is not portable between them? | canon | uncovered | P1 | all | inventory: vitest, `bun test`, `@vscode/test-cli`+mocha |
| node-version-unpinned-ci | Does every CI job pin a Node version, or does one run on whatever the image ships? | cfg | uncovered | P1 | 4 | read each job for `actions/setup-node` — one job has none |
| bun-node-syntax-divergence | Bun accepts enums and namespaces where Node rejects them — is "runs on Bun" a portability claim? | prac | uncovered | P2 | 3 | run the same file under both runtimes |
| export-condition-order | Bun checks a `bun` condition first, Node does not, bundlers differ again — does one `exports` map resolve the same three ways? | canon | uncovered | P2 | 3·1 | resolve the package under each runtime and compare |
| bun-native-addons | Is there any native addon in the Action's dependency tree, given Bun uses JavaScriptCore? | shift | uncovered | P2 | 3 | scan the resolved tree for `.node` binaries |
| vite8-rolldown | Vite 8 replaced esbuild and Rollup with Rolldown — do the SPAs' plugin assumptions survive? | shift | uncovered | P2 | 4 | `jq .devDependencies.vite` + the plugin list |
| path-posix-win32 | Extension hosts commonly run on Windows — is path-versus-URL-specifier handling checked there? | canon | uncovered | P2 | 2 | CI matrix includes windows; `rg 'path.join\|path.sep'` in extension code |
| node-permission-model | The permission model is stable, is not a sandbox, and `--env-file` bypasses it — does it apply to any shape here? | canon, hard, shift | uncovered | P3 | 1·3 | launch-argument review; nothing uses it today |

### K. VS Code and Electron extension host — 12 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| host-crash-blast-radius | Does an unhandled rejection in the extension host kill every extension in the window, and what does the fleet do about it? | runtime, def | uncovered | P0 | 2 | read `activate()`; no process-level guard exists in either extension |
| workspace-trust-cross-check | Does the manifest's `untrustedWorkspaces` capability match what activation actually does before checking `isTrusted`? | hard | uncovered | P0 | 2 | `jq .capabilities` against the activation path — a cross-check, not a grep |
| fake-vscode-api | `vscode.*` has no official test-double package — what is the sanctioned faking pattern for 164 double-casts? | shape | uncovered | P0 | 2 | `rg -c 'as unknown as vscode\.'` per file |
| activation-blocking-work | Does any activation-path work block the shared extension host? | def | uncovered | P1 | 2 | `Developer: Show Running Extensions` activation time, per extension |
| activation-void-inconsistency | One activation-time `void f()` lacks the try/catch its two siblings have — pattern, or copy-paste? | runtime | uncovered | P1 | 2 | read `extension.ts:481-507` beside `571-641` |
| webview-raw-dom-sinks | Raw DOM sinks in a webview or preload script are covered by no React or Vue rule — what guards them? | lint, hard | uncovered | P1 | 2 | `no-unsanitized/method` and `/property`; neither plugin is installed |
| webview-protocol-typing | Is the extension↔webview message protocol typed on both sides and validated on receipt, or typed on one side and trusted on the other? | shape, canon | uncovered | P1 | 2 | read `webview/protocol.ts` (40 exports) and the receiving side |
| esbuild-cjs-from-esm | esbuild emits CJS for the extension from ESM-style source — what does that constrain in the source? | cfg | uncovered | P1 | 2 | read the build script's `format`; one repo's own rule file documents the caveat |
| extension-model-cohesion | One `webview/model.ts` exports 94 symbols mixing wire types with 70 free functions — is there a splitting rule? | shape | uncovered | P2 | 2 | export count per file; 16 of the fleet's 22 high-export files are in this repo |
| activation-events-minimal | Are activation events minimal, with `*` absent? | def, contract | covered | P3 | 2 | `jq .activationEvents` — already minimal in both |
| disposable-subscriptions | Is every `Disposable` pushed to `context.subscriptions`? | contract, runtime, def | covered | P3 | 2 | read `activate()` — 0 leaks found in both; encode to keep it |
| command-declare-register-parity | Does `contributes.commands` match `registerCommand` in both directions? | contract | covered | P3 | 2 | script both lists and diff — 20/20 and 9/9 today |

### L. Browser SPA: React, Vue, Vite — 12 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| spa-error-surface | What is the minimum error surface for an SPA — boundary, global handler, or both? | runtime | uncovered | P0 | 4 | `rg 'ErrorBoundary\|componentDidCatch'`, `rg 'app.config.errorHandler'` |
| spa-zero-logging | One SPA has zero logging anywhere and swallows the stack via `String(e)` — is a bug report debuggable? | runtime | uncovered | P1 | 4 | `rg 'console\.' fma/src` — 0 hits |
| spa-no-gate-at-all | One SPA has no CI, no AI config, and 4 test files for 44 source files — what is the floor for the shape? | cfg, shape | uncovered | P1 | 4 | `ls .github/workflows`, `ls .claude`, test:src ratio 0.04 |
| vue-sfc-type-checking | `vue-tsc` is a separate checker with its own generic-component quirks — what differs from `tsc`? | canon | uncovered | P1 | 4 | run both against the same tree and diff diagnostics |
| generated-rpc-boundary | Generated Connect-RPC/protobuf `.ts` is a versioned boundary — regenerate or hand-edit, and where is the line? | canon, contract | uncovered | P2 | 4 | read `src/gen/**` headers and the `.proto` directory versioning |
| protobuf-path-not-wired | A production decode path is a hand-rolled JSON fallback where protobuf was intended — tracked, or silent? | contract | uncovered | P2 | 4 | read `useLobbyWsClient.ts:206-224` and its `TODO` |
| react19-stale-patterns | React 19 made `ref` an ordinary prop and implicit ref-callback returns a type error — are stale patterns present? | shift | uncovered | P2 | 4 | `rg 'forwardRef\('` against a `react` ≥19 dependency |
| innerhtml-asymmetry | React has no default lint for `dangerouslySetInnerHTML` while Vue has one for `v-html` — how does one rule text cover both? | hard, lint | partial | P2 | 4 | `eslint-plugin-react/no-danger` (opt-in) vs `vue/no-v-html` (default on) |
| sanitizer-chokepoint | A single lazily-built DOMPurify instance guards the fleet's one `v-html` — is that the pattern to encode? | runtime, hard | covered | P2 | 1 | read `theme/utils/sanitize.ts` and `ReadmePane.vue:155` |
| spa-bundle-weight | Is bundle weight a user-visible cost anybody measures in either SPA? | frame | uncovered | P3 | 4 | build output size; one repo runs Lighthouse CI, the SPAs run nothing |
| url-and-style-binding | `:href` and `:style` injection are distinct from HTML injection and need their own control — checked? | hard | uncovered | P3 | 4 | review any binding of user-controlled data to `href`/`style` |
| csp-meta-tag-gap | A static Vite build can deliver CSP only by meta tag, which cannot carry `report-uri` or `frame-ancestors` — what does the rule say? | hard | uncovered | P3 | 4 | read `index.html` for a CSP meta tag |

### M. Testing — 9 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| test-file-size | One 6,899-line test file covers a whole extension surface — is file size a checkable rule or a review nag? | shape | uncovered | P1 | 2 | `wc -l` over test files; three files over 2,400 lines in one repo |
| fail-closed-gate-test | A `-h` filename made a gate exit 0 as "auto-merge" — is that fail-closed test pattern generalisable? | contract | uncovered | P1 | 1 | read `test/cli/exit-codes.test.ts:196-287` |
| fakes-never-verified | Are the double-cast fakes ever checked against the real API shape they claim to stand in for? | shape | uncovered | P1 | 2 | read any `as unknown as vscode.X` site for a compile-time conformance check |
| coverage-gate | Is a coverage gate configured anywhere besides one repo's 100% threshold? | cfg | uncovered | P2 | all | read each vitest/bun/mocha config for thresholds |
| stream-assertions | Does any test assert which stream a line lands on, rather than only what it says? | contract | uncovered | P2 | 1 | read the CLI tests; one checks content, none check routing deliberately |
| test-scoped-relaxations | Are lint relaxations for tests scoped to test globs, and are they the same six everywhere? | cfg | partial | P2 | 3 | read the `files: ["tests/**"]` block in each config |
| buntest-swallows-rejections | Does `bun test` swallow rejections that `bun run` would surface? | def | uncovered | P2 | 3 | run one rejecting module both ways |
| vitest-configless | One repo runs vitest with no config file at all — does the default matter? | cfg | uncovered | P2 | 4 | `find -name 'vitest.config.*'` — absent in one repo that runs vitest |
| test-layout | Dedicated tree, colocated, or nested `__tests__` — does the split by shape matter, or is it taste? | shape | uncovered | P3 | all | test-file placement per repo; one repo colocates, the rest centralise |

### N. Security and untrusted input — 14 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| path-containment | Node documents no safe traversal pattern and disclaims `path.isAbsolute()` — is resolve-then-contain applied at every site that needs it? | hard, runtime | partial | P1 | 1·2·3 | read every `path.join`/`path.resolve` fed wire or archive data; 592 sites, two verified |
| trojan-source | Nothing in the fleet lints for bidi-override characters — in an agent-authored codebase, does that matter? | lint | uncovered | P1 | all | `eslint-plugin-security/detect-bidi-characters` — the only rule in any catalogue that catches it |
| noisy-security-lint | `eslint-plugin-security`'s own README says it needs human triage — what does that mean for a fleet with no human in the loop? | lint | uncovered | P1 | all | rule text; decides `adopt` vs `adopt-as-rule-text` for 12 rules |
| secret-masking | An overridable token input reaches an Authorization header with no `core.setSecret()` — one line, not written | runtime, hard | uncovered | P1 | 3 | `rg 'setSecret' setup-ocx/src` — 0 |
| archive-extraction | Extraction runs with no `--strip-components` and no zip-slip guard behind a checksum — is the checksum enough? | runtime, hard | uncovered | P2 | 2 | read `installer.ts:242` and the checksum verification above it |
| redirect-host-recheck | A download follows redirects with no host re-check, mitigated after the fact by a checksum — belt and braces, or a gap? | runtime | uncovered | P2 | 2 | read `installer.ts:228` |
| redos-two-plugins | Two regex plugins cover source-of-pattern and structure-of-pattern and neither subsumes the other — adopt which? | hard, lint | uncovered | P2 | all | both plugins' presence in a config |
| prototype-pollution | Two independent prototype-pollution defenses already exist as exemplars — are they the rule, or one-offs? | runtime, hard | covered | P2 | 1 | read `sources/types.ts:374-383` and `validate/core/metadata.ts:44` |
| ssrf-redirect-tests | Two repos test a redirect to the cloud metadata IP — is that the rule for any followed redirect? | runtime | covered | P2 | 1 | read `walker.test.ts:470` and `registry.test.ts:43` |
| shell-injection-zero | Zero shell-interpolated `exec` fleet-wide — how is that preserved rather than rediscovered? | runtime | covered | P2 | all | `rg 'shell:\s*true'` and `rg '\.exec\(`'` — both 0 |
| http-package-sources | One repo warns users about `http://` package sources — fleet rule, or repo policy? | runtime | partial | P3 | 1·2 | `rg "http://"` excluding localhost and tests |
| timing-safe-compare | Is any secret, token or signature compared with `===`? | hard | uncovered | P3 | 3 | review comparisons involving `token`/`secret`/`signature`/`hmac` |
| crypto-random | `Math.random()` for identifiers versus `crypto.randomUUID()` — where does the distinction bind here? | runtime, hard | uncovered | P3 | 4 | `rg 'Math.random\(\)'` then classify each site |
| dependency-intake | Is a dependency-intake checklist worth encoding, or is it a review ritual no tool can gate? | hard | uncovered | P3 | all | review heuristic; OpenSSF's 36-item list is the source |

### O. Observability, time, locale, text — 13 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| locale-contract-violation | A `compareVersions()` documented as mirroring a Rust `Ord` uses bare `localeCompare` — a silent wrong-latest-version bug? | runtime | uncovered | P0 | 1 | `rg -n 'localeCompare' ocx-catalog/src/theme/utils/version.ts` |
| log-channel-per-runtime | Logging is correct per runtime and written down nowhere — what binds where? | runtime | uncovered | P1 | all | `rg -c 'console\.'` per repo against the expected channel for its shape |
| stack-preserving-catch | Which catch sites must keep the stack, and which are correct to log only the message? | runtime | uncovered | P1 | 1 | read `main.ts:89` against `main.ts:73` and `82-85` |
| sort-without-comparator | Is a bare `.sort()` ever called on a non-string array? | def, lint | uncovered | P2 | all | `require-array-sort-compare` (type-aware, currently off) |
| date-string-parsing | Does `new Date('YYYY-MM-DD')` appear where the caller meant local midnight? | def | uncovered | P2 | all | `rg 'new Date\('` and read each string literal argument |
| tolocale-no-locale | Is `toLocaleString()`/`localeCompare()` called with no explicit locale anywhere output must be deterministic? | runtime, def | uncovered | P2 | 4·1 | `rg '\.toLocale\w*\(\)'` and `rg '\.localeCompare\([a-z]\)'` |
| json-roundtrip-loss | Is `JSON.stringify` used where `Map`/`Set`/`undefined`/`BigInt` would silently vanish? | def | uncovered | P2 | all | `rg 'JSON.stringify\('` at serialization boundaries |
| structured-logger | No structured logger anywhere — right for these shapes, or an unexamined default? | runtime | uncovered | P3 | all | `rg 'pino\|winston\|bunyan'` — 0 |
| clock-choice | `performance.now()` for durations, `Date.now()` for calendar deltas — correct everywhere checked; preserve? | runtime | covered | P3 | all | `rg 'performance.now\|Date.now'` then classify each |
| temporal-not-baseline | TS 6.0 ships Temporal types ahead of runtime Baseline and Safari has not shipped it — recommend, or not yet? | canon, shift | uncovered | P3 | 4 | runtime floor per shape vs the Baseline status |
| iterator-helpers | Iterator helpers are Baseline — worth a rule against collecting into an intermediate array? | canon, lint | uncovered | P3 | all | `prefer-iterator-helpers`; needs a `lib` check across all shapes first |
| encoding-explicit | Is encoding explicit at every Buffer/string boundary? | runtime, hard | partial | P3 | 1 | `rg 'Buffer.from\('` and `rg 'readFile\('` for a missing second argument |
| grapheme-vs-codeunit | Does any slicing path care that `.length` counts UTF-16 code units? | def | uncovered | P3 | 4 | review string slicing on user-visible text |

### P. Agent legibility and rule-set self-state — 10 rows

| slug | question | source | coverage | pri | shapes | checkable by |
|---|---|---|---|---|---|---|
| six-duplicate-rule-files | Six near-duplicate `quality-typescript.md` files already exist — is phase 7 consolidation or authoring? | cfg, frame | uncovered | P0 | all | diff the six; four are repo-grounded, two are the same generic template |
| rule-files-overclaim | Two of the six describe capability the repo does not have — what does that do to every other claim in them? | cfg | uncovered | P0 | 2 | diff the tooling table against the config |
| compiler-in-the-loop | Is "run `tsc --noEmit` before calling a task done" the single highest-leverage agent rule here? | def | uncovered | P0 | all | gate wiring; the measured dominant LLM failure mode is compiler-catchable |
| passes-tsc-still-wrong | Which agent mistakes pass `tsc` clean and need a type-aware lint instead? | def | uncovered | P0 | all | rule text listing the specific rules that catch each |
| library-with-no-rule-file | One TS library-and-CLI repo has no `quality-typescript.md` at all, while its twin does | cfg | uncovered | P1 | 1 | `ls .claude/rules/` in `grimoire-indexer` |
| llm-error-statistic | The "94% of LLM errors are type errors" claim is single-sourced and unverified — cite it, or drop it from the rationale? | prac, def, shift | uncovered | P1 | all | source audit; three artifacts flag it as under-corroborated |
| domain-hazard-lint | A `no-restricted-imports` pair encodes a real domain hazard (two version-ordering grammars) — does it survive a naive dedupe refactor? | cfg | uncovered | P1 | 1 | read `ocx-catalog/eslint.config.js:35-48` and its comment |
| stale-lint-facts | What does the rule set say about stale-but-plausible lint facts (`ban-types`, `eslint-plugin-import`, "oxlint cannot type-check")? | lint | uncovered | P1 | all | rule text; each is a name an agent will confidently emit |
| placeholder-vs-api | Are `ponytail:` placeholder stubs distinguishable from finished public API by anything but a comment? | shape | uncovered | P2 | 1 | `rg 'ponytail:' src/` beside the `exports` map |
| no-ai-config-at-all | One repo has no AI configuration of any kind — is that a gap the rule set should name? | cfg | uncovered | P2 | 4 | `ls fma/.claude fma/CLAUDE.md AGENTS.md` — nothing |

## Selected for wave 2

Six topics, **15 dives — the hard cap, spent exactly**. Budget: 3 + 3 + 2 +
2 + 3 + 2. The three-dive topics are the ones where wave 1 found a
structural gap no catalogue covers (`ts-gate`), a shape-splitting decision
the rest of the rule set rests on (`ts-modules`), or a convergent blind spot
across three independent scouts (`ts-extension-host`).

Not selected, deliberately: the tsconfig strictness floor and the era
question. Both are **already researched to authoring depth** — `cfg`
measured every flag in all fifteen tsconfigs, `cod` enumerated every flag
with an adopt verdict and a migration cost, and the era was settled against
the registry. A dive there would re-derive an existing table. They move to
Deferred as *ready to author*, not as *unresearched*.

### 1. `ts-gate` — The gate that cannot see

Eight of nine repos run a linter architecturally incapable of seeing the bug
class the fleet actually has. Floating promises, `any` leakage,
exhaustiveness, unbound methods are all unenforceable until this is fixed —
and the ~54 practices the sweep marked unlintable need somewhere to live.

#### `type-aware-rollout` — Wiring type-aware linting across eight configs, and what it costs

Establish what moving this fleet off `tseslint.configs.recommended` takes,
per shape, and what it gains in the order it gains it.

Sources: typescript-eslint's `getting-started/typed-linting` and
`typed-linting/performance` pages; `projectService: true` versus legacy
`parserOptions.project`, and which is right for a repo with several
tsconfigs (`ocx-catalog` has `tsconfig.json` + `tsconfig.theme.json`; `fma`
a solution file plus two projects; `creeptd-ng/web` a root config plus
`e2e/tsconfig.e2e.json`); `allowDefaultProject` for files in no project
(`eslint.config.js`, `scripts/build.ts` — `setup-ocx` currently *ignores*
both).

Read `setup-ocx/eslint.config.js` in full. It is the fleet's only working
reference implementation and it turns five `no-unsafe-*` rules **off**;
establish whether that was cost-driven or noise-driven, because copying it
wholesale propagates the disablement that defeats the point.

Rank what the change unlocks against measured fleet evidence, not the preset
list: `no-floating-promises` and `no-misused-promises` (98 `void` markers,
two real gaps), the five `no-unsafe-*`, `unbound-method`, `require-await`,
`await-thenable`, `only-throw-error`, `no-unnecessary-condition`,
`restrict-template-expressions`.

The deliverable must decide: `projectService` or `project`, with the reason;
fleet-wide or shape-scoped, and which shapes are exempt; which rules are
non-negotiable versus per-repo; the measured or estimated wall-clock cost on
the two largest repos (`grimoire-vscode` 38.5k LOC, `ocx-catalog` 28.5k),
since typed linting runs "at roughly the speed of type checking your
project" and six repos already run `tsc --noEmit` separately — say whether
that is now duplicated or replaced; and which of the twelve type-aware rules
that ship in **no** preset this fleet must add by hand.

#### `biome-eslint-parity` — One Biome repo, seven ESLint repos, one prose rule set

Establish whether one prose rule set can bind both toolchains, and where the
mapping breaks.

Investigate Biome's JS/TS rule index (441 rules, 8 groups, 224 recommended)
against typescript-eslint's 134; the camelCase-versus-kebab translation cost
for a shared rule file; and how far Biome v2's type-aware inference actually
reaches without spawning `tsc` — verify against the rules index, not the
v2.5 blog post's "500 rules".

The decisive case is `noFloatingPromises`, `noMisusedPromises` and
`noUnsafeTypeAssertion`, all in Biome's `nursery` group and therefore **off
by default**, while their typescript-eslint twins sit in
`recommended-type-checked`. `kate-middlechild` has zero coverage of the
fleet's most-cited bug class.

Chase the severity mismatches: `only-throw-error` is
`recommended-type-checked` in typescript-eslint while `useThrowOnlyError` is
Biome `style`, not recommended; `prefer-readonly` is an adopt while
`useReadonlyClassProperties` is `style`. Build the full mapping table for
every rule the fleet intends to require and mark each pair equivalent,
weaker, stronger, or absent.

Also settle the Biome-only rules with no ESLint equivalent anywhere in the
sweep — `noConstantMathMinMaxClamp`, `noGlobalDirnameFilename`,
`noStringCaseMismatch`, `noSvgWithoutTitle`, `useSemanticElements`,
`useValidLang` — and say whether any is worth prose so the seven ESLint
repos get the practice without the rule.

The deliverable must decide: whether the fleet keeps two linters; the exact
`biome.json` `nursery` opt-in list that closes the parity gap; and whether
any intended non-negotiable is unavailable on one side, which would force it
into prose for everyone.

#### `rule-text-residue` — The 54 practices that cannot be a lint rule

The sweep marked roughly 54 rules `adopt-as-rule-text`: right practice, lint
too noisy, too config-heavy, or unavailable in one toolchain. They are
pre-qualified rule candidates and they need a home or they are lost.

Work from the sweep's own list — 34 from typescript-eslint's none-preset and
noisy set (`explicit-module-boundary-types`, `naming-convention`,
`no-non-null-assertion`, `prefer-readonly-parameter-types`, `max-params`,
`no-magic-numbers`, `no-shadow`, `class-methods-use-this`, `no-loop-func`,
`no-use-before-define`, `prefer-destructuring`, `no-restricted-types`,
`explicit-function-return-type`, `explicit-member-accessibility`); 12 from
`eslint-plugin-security` (`detect-object-injection`,
`detect-non-literal-fs-filename`, `detect-unsafe-regex`,
`detect-non-literal-regexp`, `detect-non-literal-require`,
`detect-child-process`, `detect-possible-timing-attacks`); 2 from
`no-unsanitized`; and the Biome `nursery`/`performance` picks
(`noBarrelFile`, `noAwaitInLoops`, `noExcessiveCognitiveComplexity`,
`noExcessiveLinesPerFunction`, `noSecrets`).

For each, choose exactly one outcome and say which: **promote to a lint
rule**, where the noise argument does not survive this fleet's measured code
— `detect-object-injection`'s false-positive rate depends on how much
bracket-notation access actually exists here, so measure it; **write as
prose with a non-linter verification** (a grep, a script, a `wc -l`); or
**drop**, because the model does it reliably and a rule would be noise.

The deliverable is a triaged table — slug, source rule, outcome, and for the
promoted-to-prose ones a draft one-line rule with its verification. Do not
restate the lint rule's documentation; state what an agent editing this
fleet must do. Prefer dropping to keeping: a rule set that restates 54 lint
rules is one nobody reads.

### 2. `ts-modules` — Resolution and the shipped shape

Four `moduleResolution` values across nine repos, one repo whose source
violates the resolution its own tsconfig declares, and two "published
packages" that turned out not to be libraries. The rule set's largest
structural decision — one profile per shape or one base with deltas — is
unanswerable without this.

#### `resolution-per-shape` — Which axis decides `moduleResolution`, and what the choice then requires

Settle the four-way split: `NodeNext` (`ocx-catalog`, `grimoire-indexer`,
`setup-ocx`), `Node16` (`vscode-ocx` alone), `Bundler` (`grimoire-vscode`,
both `fma` projects, both `creeptd-ng/web` projects, `kate-middlechild`),
and preset-inherited (`kate-middlechild/packages/web` via
`astro/tsconfigs/strict`).

Establish which axis decides — target runtime or consumer toolchain — and
read Andrew Branch's "Is `nodenext` right for libraries that don't target
Node.js?" for the strongest argument that it is not the obvious one. Then
chase the consequences that bite: the `.js`-extension requirement under
`NodeNext`/`Node16`, where `vscode-ocx` has 11 of 11 relative imports
missing it while declaring `Node16` — establish whether that is broken at
runtime or masked by esbuild bundling, which is the whole question;
`--module node18`/`node20` as frozen reference points versus `nodenext` as
an explicitly moving target; `rewriteRelativeImportExtensions` (5.7) and
`allowImportingTsExtensions` as alternatives; and Bun's own condition order
(`bun, node-addons, node, require, import, default`) as a third answer for
the Action.

Read `ocx-catalog/tsconfig.theme.json` and its inline comment as the
exemplar for the mixed case: one repo, a Node-target CLI and a
bundler-target VitePress theme, split by `moduleResolution` with the reason
written down. That split is why a naive fleet-wide "always suffix `.js`"
rule would flag 139 correct lines.

The deliverable must decide: the decision rule for picking a resolution
mode, stated as a question an agent can answer about the file it is editing;
whether `vscode-ocx` is a live defect or benign, with evidence; and whether
the two sibling extensions' disagreement (`Node16` versus
`ESNext`+`Bundler`) has a reason or is drift to close.

#### `publish-verification` — Verifying an npm-distributed CLI that is not a library

Re-scope publish verification for a shape that ships a `bin`, not an API.
Both declared entry points are `export {};` stubs; `ocx-catalog` has no
`"."` export, only `./theme` resolving to unbuilt `.mts` source.

Separate `publint`'s rules (27 errors, 14 warnings, 7 suggestions) and
`attw`'s 11 problem codes into what still binds this shape and what only
matters for a library. Still binding: `EXPORTS_TYPES_SHOULD_BE_FIRST`,
`EXPORTS_DEFAULT_SHOULD_BE_LAST`, `FILE_DOES_NOT_EXIST`,
`FILE_NOT_PUBLISHED`, `USE_FILES`, `USE_TYPE`, `USE_ENGINES_NODE`, and
`attw`'s `NoResolution`/`UntypedResolution`/`InternalResolutionError`.
Preventive only while the fleet stays ESM-only: `FalseCJS`, `FalseESM`,
`CJSOnlyExportsDefault`, `MissingExportEquals`.

Chase the specific gap: `ocx-catalog` runs both tools through
`scripts/pack-smoke.mjs` in a network-enabled CI job; `grimoire-indexer`
ships the same dual `bin`+`exports` shape with **neither tool declared and
neither name in any workflow**. Establish what a pack-smoke must actually do
for a CLI — pack, install the tarball into a sandbox, run the installed
binary, resolve any declared subpath — and whether shipping `.mts` source
through an `exports` map is defensible or a latent break.

Also settle ESM-only versus dual publishing given Node 22+'s stable
`require(esm)`; whether `engines.node` is a checkable claim or decoration;
and whether `npm-shrinkwrap.json` is ever right for a CLI that is also
importable.

The deliverable must decide the exact CI verification set for shape 1, as
commands, and name which of the two repos is out of compliance today and in
what specific way.

#### `import-graph` — Cycles, barrels, and boundaries that nothing checks

Every catalogue leaves import-graph hygiene opt-in: `import-x/no-cycle`,
`no-extraneous-dependencies` and `no-unresolved` are off by default, and
Biome's `noUndeclaredDependencies`, `noUnresolvedImports` and
`noImportCycles` are not recommended either. This fleet has zero default
coverage of a real runtime bug class.

Run the checks rather than reasoning about them. Establish per repo: how
many import cycles exist and whether any produces a temporal-dead-zone or
`undefined`-at-import-time hazard; whether any import resolves to a package
absent from `package.json`; and what the twelve barrel files cost, given one
(`grimoire-indexer/src/index.ts`) is the `export {}` placeholder and the two
Vite SPAs pay barrel cost in dev-server graph size and HMR.

Chase the confirmed boundary violation:
`kate-middlechild/packages/core/src/map.test.ts:12` imports
`../../web/src/data/…json` — `core` reaching into `web`'s source tree in a
monorepo whose premise is package separation. Establish whether
`import-x/no-relative-packages` or Biome's `noPrivateImports` is the right
guard, and whether the same violation exists outside tests.

Name the catalogue-rot trap in the deliverable: `eslint-plugin-import` is
effectively unmaintained for flat config, `eslint-plugin-import-x` is the
fork that works for seven of this fleet's eight ESLint repos, and an agent
following older guidance installs the wrong one.

The deliverable must decide: which import-graph rules justify a CI-only pass
versus an every-edit rule, since cycle detection is expensive on a large
graph; the measured cycle and extraneous-dependency counts per repo; and
whether barrel files get a rule or a note.

### 3. `ts-async` — What happens to a promise nobody is watching

Two scouts came back thin on cancellation and the fleet's measurements are
stark: 13 of 14 `fetch()` sites unbounded, 98 `void` markers that mark
rather than handle, and a linter that cannot see any of it in eight of nine
repos.

#### `promise-observability` — Floating, misused, marked, and what each runtime does with a rejection

Establish what happens to an unobserved rejection in each of the fleet's
four runtimes, and what the rule must therefore say per shape.

Investigate Node's `unhandledRejection` as an `EventEmitter` event on
`process` with a terminating default action (Node >=15) versus the browser's
WHATWG `unhandledrejection` `Event` on `globalThis`; Bun's behaviour under
`bun run` versus `bun test`, which is documented to swallow rejections
during test runs — verify by experiment, not citation; and the VS Code
extension host, where an uncaught rejection terminates the shared host and
kills every extension's state in that window until restart.

Chase the fleet's own evidence. `runtime` found 98 `void x()` markers
concentrated in the two extensions and established that `void` marks a
promise as deliberately unawaited while attaching **no** rejection handler.
Two sites are real gaps (`fma/src/audio/sources/SpotifyPlayer.ts:80`,
`grimoire-vscode/src/extension.ts:507`), and the file containing the second
applies a full try/catch to its two sibling activation-time calls. Read
`grimoire-vscode/src/extension.ts:185-210` (`refreshAll`) as the exemplar —
a coalescing drain loop with a per-round try/catch and a comment explaining
why an earlier design let one bad round poison every queued caller. Settle
the agent-specific forms in the same pass: `forEach(async …)` and
`.map(async …)` both pass `tsc --noEmit` cleanly and are caught only by
`no-misused-promises` with `checksVoidReturn`.

The deliverable must decide: whether `void` is permitted at all and under
exactly what condition — a self-catching callee, a documented lifetime, or
an attached `.catch()`; the per-shape rule for a top-level guard
(`process.on('unhandledRejection')` in a CLI, `core.setFailed` in an Action,
an error boundary in an SPA, a self-catching activation path in an
extension); and whether `Promise.all` versus `allSettled` versus a bounded
map is a rule or a judgment call, given `Promise.race` is used nowhere and
`allSettled` twice fleet-wide.

#### `cancellation-and-timeouts` — Deadlines, signals, and the one line never propagated

Thirteen of fourteen first-party `fetch()` sites carry no `AbortSignal` and
no timeout. The one compliant site is a single line: `signal:
AbortSignal.timeout(TIMEOUT_MS)` at
`grimoire-indexer/src/validate/adapters/http.ts:96`.

Investigate the composition problem, which a one-line fix does not answer:
`AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])` for combining a
caller's cancellation with a library-imposed deadline; typing
`signal.reason`; whether a `signal` parameter should be required, optional
or absent on an internal helper; and how a timeout interacts with retry and
backoff, since `ocx-catalog/src/sources/walker.ts:170` already jitters
retries.

Chase the non-`fetch` surfaces, each of which has a different answer.
Connect-RPC's `createConnectTransport({ defaultTimeoutMs })` is omitted in
both of `creeptd-ng/web`'s client factories, so every RPC call relies on a
browser default. `@actions/exec`'s `ExecOptions` exposes **no** per-call
timeout — unlike Node's own `execFile` — so `setup-ocx`'s three subprocess
sites can only be bounded by the workflow's `timeout-minutes`. VS Code's
`CancellationToken` is unused because the extensions model long-lived work
as `Disposable`s under `context.subscriptions`; establish whether that is
right for the shape or an avoidance.

The deliverable must decide: whether a timeout is mandatory on every
outbound call and what the default is per shape; how a helper composes a
caller's signal with its own deadline, as a code shape not a paragraph;
whether `@actions/exec` should be replaced by `execFile` so a timeout
becomes expressible; and whether the `Disposable`-instead-of-token choice
needs a rule or a note.

### 4. `ts-resources` — Explicit resource management, four years after it shipped

Two independent scouts came back thin here, `cod` recorded "no TS-specific
codified source found beyond generic `using`", and the fleet uses the
feature zero times despite TS 5.2 support, Node 22 support and ES2026
ratification. Meanwhile the extension host has an older disposal protocol
that `using` knows nothing about.

#### `explicit-resource-management` — `using`, `await using`, and the protocol that predates them

Establish whether `using`/`await using` belongs in this fleet, where, and
what it collides with.

Investigate the mechanics properly: `Symbol.dispose` and
`Symbol.asyncDispose`; `DisposableStack`/`AsyncDisposableStack` for the
aggregate case; what TypeScript emits when the target lacks the symbols, and
whether esbuild, Vite 8/Rolldown and Bun each transpile it correctly — the
extensions are esbuild-bundled, the Action runs untranspiled on Bun, the
SPAs go through Rolldown, three different answers; and the `lib` requirement
(`esnext.disposable`), which matters because `ocx-catalog` sets `lib:
[ES2022]` and would need a change.

Chase the collision the canonical scout named and nobody resolved.
`vscode.Disposable` is a `{ dispose(): void }` protocol with an ownership
model (`context.subscriptions`) that VS Code drains on deactivation;
`Symbol.dispose` is scope-bound. They are not the same lifetime and a value
can implement both. Establish whether a VS Code `Disposable` should be
adapted to `Symbol.dispose`, and whether `Disposable.from` or a small
adapter is the right shape — or whether the two idioms stay separated by
rule, with a stated boundary. Inventory the fleet's real candidates first:
`fs/promises` `FileHandle` (GC-based auto-close is documented unreliable),
child processes, `vscode.OutputChannel`, file watchers, the interval folded
into a disposable at `grimoire-vscode/src/extension.ts:653`, and any
`try/finally` whose `finally` only calls `.close()`/`.dispose()`.

The deliverable must decide: adopt, adopt-with-scope, or defer — with the
compiler and runtime floor per shape stated explicitly, since `ocx-catalog`
is on `^5.9.3` and the SPAs on `^5.7.x`; and if adopted, whether the rule is
"prefer `using` for disposable-shaped resources" or the narrower "never
hand-roll `try/finally` where the resource already implements a disposal
protocol".

#### `process-and-timer-lifecycle` — The exemplar, and the sites that diverge from it

The fleet has one genuinely excellent child-process wrapper and several
sites that do not match it. Turn the exemplar into a rule and name the
divergences.

Read `grimoire-vscode/src/grim.ts:597-628` (`runJson`) in full: `execFile`
with an argv array and no shell, `timeout: options.timeoutMs ?? 120_000`, a
capped `maxBuffer`, ENOENT distinguished from a real failure, and a
`child.stdin.on('error', () => {})` guard citing nodejs/node#40085 for the
EPIPE race. That is the shape every wrapper should be judged against.

Then decide, for each divergence, defect or justified difference:
`grimoire-vscode/src/installer.ts:242-251` (`extract()` via system `tar`, no
timeout, sibling in the same repo sets one);
`vscode-ocx/src/ocx.ts:105,141,207` (`execFileAsync`, no timeout observed);
`setup-ocx`'s three `@actions/exec` calls, where no timeout is available in
the API; and `ocx-catalog/src/sources/git.ts:29`, a deliberately
non-promisified callback wrapper whose comment gives a mockability reason —
establish whether that reason still holds.

Cover timers with the same discipline. Three repos use `setTimeout` with
zero `clearTimeout` (`grimoire-indexer` 7/0, `setup-ocx` 1/0,
`kate-middlechild` 12/0), and one `setInterval` is deliberately never
cleared with the reason written at
`grimoire-vscode/src/webview/sidebar/main.ts:899`. Establish the rule that
separates "one-shot, nothing to clear" from "leak".

The deliverable must decide: the mandatory fields of a child-process
invocation here — argv array, timeout, maxBuffer, exit-code check, stderr
capture, ENOENT handling — as a checkable list; whether `@actions/exec`
should be abandoned for `execFile` on that basis; and a timer rule phrased
so the deliberately-uncleared interval passes it.

### 5. `ts-extension-host` — The shape three scouts could not find sources for

`canon`, `prac` and `cod` all returned this as an explicit gap: no argued
practitioner position, no codified source, nothing beyond VS Code's own API
docs. Two of nine repos and 40.8k LOC are this shape — the fleet's largest
codebase, carrying its largest concentration of every measured smell: 79
double-casts in one file, 16 of the fleet's 22 high-export files, the
6,899-line test file. A convergent gap across independent scouts is the
strongest signal wave 1 produced.

#### `host-failure-modes` — What one extension's mistake does to every other extension

Establish the failure model of the shared extension host, and what an agent
editing this code must never do.

Investigate VS Code's own extension-host guide and extension guidelines: the
shared-process model ("misbehaving extensions should not impact the user
experience"); what actually happens on an uncaught rejection in the host on
modern Node — the host terminates, VS Code reports "the extension host
terminated unexpectedly" and restarts it, killing every extension's state in
that window; activation-event granularity and why `onStartupFinished`
exists; and `Developer: Show Running Extensions` as the mechanical profiling
step standing in for a lint nobody has.

Chase workspace trust as the second failure mode, because it is a
cross-check no grep catches. `capabilities.untrustedWorkspaces.supported` is
`true`/`false`/`'limited'`, with `restrictedConfigurations` for the limited
case; `vscode.workspace.isTrusted` plus `onDidGrantWorkspaceTrust` at
runtime; the `isWorkspaceTrusted` context key for `when` clauses. The
finding is a mismatch between the declared capability and what the
activation path does before any trust check — reading workspace config,
spawning a process from a workspace-provided path, or resolving a module
from the open workspace. Read both manifests against their `activate()`
functions and say whether either misrepresents itself. Do not re-measure
what wave 1 already found clean (activation events, disposal, command
parity, `OutputChannel` logging); spend the dive on what an agent breaks.

The deliverable must decide: the per-shape rule for a top-level guard, given
`activate()` is synchronous and async work is fire-and-forget; whether `void
f()` in an activation path requires a self-catching callee as a hard rule;
and the workspace-trust cross-check stated as a reviewable procedure, since
it is explicitly not a single grep.

#### `webview-boundary` — The extension-to-webview seam, typed on one side

The webview is a second execution context with a different threat model, a
different DOM, and a message protocol TypeScript types but nothing
validates.

Investigate VS Code's webview guidance — CSP in a webview,
`webview.cspSource`, `localResourceRoots`, `asWebviewUri`, and why a
webview's default posture is stricter than a browser page's; the
`postMessage` boundary, where both sides share a `.ts` type declaration but
the receiver gets an untyped value at runtime; and the raw-DOM-sink problem
no React or Vue rule reaches. `eslint-plugin-no-unsanitized`'s two rules are
the only framework-agnostic guard in the entire sweep for `.innerHTML`,
`insertAdjacentHTML()`, `document.write()`, `DOMParser#parseFromString()`
and iframe `srcdoc` — and neither is installed anywhere here. Note the
plugin's own caveat: without a recognised escaping pattern or the Sanitizer
API it flags everything, which is why the sweep marked it rule-text.

Chase the cohesion problem in the same seam, because it is the same code.
`grimoire-vscode/src/webview/model.ts` exports 94 symbols mixing wire types
with roughly 70 unrelated free functions; `protocol.ts` exports 40;
`settings/model.ts` exports 42. Establish whether the wire surface is
genuinely that large — as `grim.ts`'s 63 exports arguably are, being one
CLI's JSON output contract — or whether this is a kitchen sink, and what
rule separates the two cases.

The deliverable must decide: whether a message crossing the webview boundary
must be validated on receipt or may be trusted on its declared type, with
the reason; the concrete DOM-sink rule for webview and preload code given no
lint will be installed; and whether an export-count or mixed-concern rule is
checkable enough to state.

#### `faking-vscode` — 164 double-casts and no test-double package

The fleet's highest-volume escape hatch, and not a typing failure — a
structural consequence of testing against an API with no official mock.
Every sampled `as unknown as` manufactures a fake `vscode.*` object.

Establish what already exists: `@vscode/test-cli` and
`@vscode/test-electron` run tests in a real extension host with a real
`vscode` module. Separate the casts that exist because the test runs
*outside* that host from those that exist because the real object is
impractical to construct even inside it. `vscode.EventEmitter`,
`vscode.Uri`, `vscode.Disposable` and the memento/`ExtensionContext` shapes
are cases where a real instance is available and a fake is unnecessary;
`WebviewView`, `GlobalEnvironmentVariableCollection` and the tree-view
surfaces are cases where a fake is genuinely required.

Evaluate candidate patterns rather than assuming one: a named
`fake<T>(partial: Partial<T>): T` helper per faked interface, colocated with
its tests; a `satisfies`-checked partial that fails to compile when the real
interface gains a required member; a builder returning the real type with no
assertion. The property that matters is whether the fake breaks the build
when the API it imitates changes — today nothing does, so a `vscode` engine
bump can silently invalidate 79 fakes in one file.

Settle the pattern's two other homes so the rule is not VS-Code-only:
`ocx-catalog` has 57 double-casts, and `creeptd-ng/web` fakes `window` and
Pinia internals with the fleet's only four `as any`.

The deliverable must decide: the one sanctioned faking shape, written as
code; whether the rule bans inline `as unknown as T` at call sites outright
or only outside a named helper; and whether a conformance check — the fake
must still satisfy the real type — is achievable without a runtime
dependency.

### 6. `ts-errors-boundaries` — Zero causes, seventy-five bare throws, two SPAs with no floor

`Error.cause` has zero uses in nine repos. Seven of nine have no error
taxonomy at all. `ajv` is a dependency in two repos and validates nothing at
runtime. Neither SPA has an error boundary. This is the fleet's most
uniformly uncovered vein, and one of the three named agent failure patterns
is "wrap it in a try/catch that logs and continues".

#### `error-taxonomy-and-cause` — What a rethrow must carry, and what a shape without a CLI needs

Establish the error contract per shape, given the fleet is two populations:
the two CLIs and the Action have real, tested, named contracts; everything
else throws bare strings.

Investigate `Error.cause` as mechanism, not style: `new Error(msg, { cause
})` semantics; what `util.inspect`/`console.error` do with a chain; what
survives structured cloning across a worker or webview boundary; what
survives serialisation to a log line; and whether `AggregateError` covers
the `Promise.all` case. Establish when a rethrow must carry a cause and when
re-deriving a message is correct.

Chase the fleet's split. Read `grimoire-indexer/src/cli/exit.ts` plus
`main.ts:66-94` (`classify()`) as the exemplar: one `const` object of named
codes, a branded `ExitCode` type, one function mapping `unknown` to a code,
called from exactly one place, with a fail-closed gate branch that exists
because of a real historical exploit. Read `ocx-catalog`'s
three-times-repeated `instanceof ConfigError`/`BuildError` dispatch as the
anti-pattern in the same fleet. Then establish what the *other seven repos*
need: an extension and an SPA have no exit code to classify to, so "typed
class carrying a code" may be the wrong shape — say what the right one is,
or that bare `Error` with a cause suffices and why.

Settle two mechanics: matching a named error class by `.name` rather than
`instanceof` when the defining module is dynamically imported
(`main.ts:82-91` does this deliberately); and which catch sites must
preserve a stack, given `main.ts:89` — the branch for genuinely unexpected
errors — logs `err.message` and discards the only trace a bug report would
have had.

The deliverable must decide: the `Error.cause` rule with its exceptions; the
per-shape taxonomy rule; and whether one central classifier is mandatory
wherever an error maps to an outward-facing value.

#### `untrusted-to-typed` — The boundary, and the two repos that do not have one

Establish the single crossing point where `unknown` becomes typed, and what
is forbidden on either side.

Investigate the validators as a decision, not a menu: Zod's
`.parse()`/`.safeParse()` throw-versus-Result split; Ajv's compiled
validators as TypeScript type guards with `JSONSchemaType<T>`; and
`StandardSchemaV1`, a ~60-line interface Zod, Valibot and ArkType already
implement, as the type a *shared* helper should accept so it is not coupled
to one library. The fleet already has the problem: `kate-middlechild`'s own
rule file mandates Zod at every external boundary, `creeptd-ng/web` has Zod,
and `ocx-catalog` and `vscode-ocx` have `ajv` and use it only in tests.

Chase the actual boundaries and say what guards each: `JSON.parse` (119
sites), `fetch(...).json()`, `process.env`, CLI arguments, `ocx.toml` and
`catalog.config.json` on disk, protobuf/Connect-RPC payloads, and webview
`postMessage`. The decisive anti-pattern to name is the cast-after-parse — a
`JSON.parse` result asserted with `as T`, which the type system cannot
distinguish from validation. Establish whether it occurs here.

Settle ajv with a verdict, not a description. `ocx-catalog`'s hand-rolled
`load.ts` validator is deliberate and documented, its JSON Schema exists for
editor autocomplete, and `test/config/schema-agreement.test.ts` keeps the
two in agreement. `vscode-ocx` has the same dependency, the same schema
file, no runtime consumer of either, and no agreement test. Then take the
SPA floor, the same problem one layer out: neither SPA has a React error
boundary, a `componentDidCatch`, or a Vue `app.config.errorHandler`, so an
uncaught render error is a white screen with no recovery path and — in one
repo, with zero `console.*` calls anywhere — no trace at all.

The deliverable must decide: the one-sentence boundary rule and its
verification; whether the fleet standardises on one validator or on
`StandardSchemaV1` for shared code; the per-repo ajv verdict; and the
minimum error surface an SPA must ship.

```json
[
  {
    "group": "ts-gate",
    "slug": "type-aware-rollout",
    "label": "Wiring type-aware linting across eight configs, and what it costs",
    "brief": "Establish what moving this fleet off `tseslint.configs.recommended` takes,\nper shape, and what it gains in the order it gains it.\n\nSources: typescript-eslint's `getting-started/typed-linting` and\n`typed-linting/performance` pages; `projectService: true` versus legacy\n`parserOptions.project`, and which is right for a repo with several\ntsconfigs (`ocx-catalog` has `tsconfig.json` + `tsconfig.theme.json`; `fma`\na solution file plus two projects; `creeptd-ng/web` a root config plus\n`e2e/tsconfig.e2e.json`); `allowDefaultProject` for files in no project\n(`eslint.config.js`, `scripts/build.ts` — `setup-ocx` currently *ignores*\nboth).\n\nRead `setup-ocx/eslint.config.js` in full. It is the fleet's only working\nreference implementation and it turns five `no-unsafe-*` rules **off**;\nestablish whether that was cost-driven or noise-driven, because copying it\nwholesale propagates the disablement that defeats the point.\n\nRank what the change unlocks against measured fleet evidence, not the preset\nlist: `no-floating-promises` and `no-misused-promises` (98 `void` markers,\ntwo real gaps), the five `no-unsafe-*`, `unbound-method`, `require-await`,\n`await-thenable`, `only-throw-error`, `no-unnecessary-condition`,\n`restrict-template-expressions`.\n\nThe deliverable must decide: `projectService` or `project`, with the reason;\nfleet-wide or shape-scoped, and which shapes are exempt; which rules are\nnon-negotiable versus per-repo; the measured or estimated wall-clock cost on\nthe two largest repos (`grimoire-vscode` 38.5k LOC, `ocx-catalog` 28.5k),\nsince typed linting runs \"at roughly the speed of type checking your\nproject\" and six repos already run `tsc --noEmit` separately — say whether\nthat is now duplicated or replaced; and which of the twelve type-aware rules\nthat ship in **no** preset this fleet must add by hand."
  },
  {
    "group": "ts-gate",
    "slug": "biome-eslint-parity",
    "label": "One Biome repo, seven ESLint repos, one prose rule set",
    "brief": "Establish whether one prose rule set can bind both toolchains, and where the\nmapping breaks.\n\nInvestigate Biome's JS/TS rule index (441 rules, 8 groups, 224 recommended)\nagainst typescript-eslint's 134; the camelCase-versus-kebab translation cost\nfor a shared rule file; and how far Biome v2's type-aware inference actually\nreaches without spawning `tsc` — verify against the rules index, not the\nv2.5 blog post's \"500 rules\".\n\nThe decisive case is `noFloatingPromises`, `noMisusedPromises` and\n`noUnsafeTypeAssertion`, all in Biome's `nursery` group and therefore **off\nby default**, while their typescript-eslint twins sit in\n`recommended-type-checked`. `kate-middlechild` has zero coverage of the\nfleet's most-cited bug class.\n\nChase the severity mismatches: `only-throw-error` is\n`recommended-type-checked` in typescript-eslint while `useThrowOnlyError` is\nBiome `style`, not recommended; `prefer-readonly` is an adopt while\n`useReadonlyClassProperties` is `style`. Build the full mapping table for\nevery rule the fleet intends to require and mark each pair equivalent,\nweaker, stronger, or absent.\n\nAlso settle the Biome-only rules with no ESLint equivalent anywhere in the\nsweep — `noConstantMathMinMaxClamp`, `noGlobalDirnameFilename`,\n`noStringCaseMismatch`, `noSvgWithoutTitle`, `useSemanticElements`,\n`useValidLang` — and say whether any is worth prose so the seven ESLint\nrepos get the practice without the rule.\n\nThe deliverable must decide: whether the fleet keeps two linters; the exact\n`biome.json` `nursery` opt-in list that closes the parity gap; and whether\nany intended non-negotiable is unavailable on one side, which would force it\ninto prose for everyone."
  },
  {
    "group": "ts-gate",
    "slug": "rule-text-residue",
    "label": "The 54 practices that cannot be a lint rule",
    "brief": "The sweep marked roughly 54 rules `adopt-as-rule-text`: right practice, lint\ntoo noisy, too config-heavy, or unavailable in one toolchain. They are\npre-qualified rule candidates and they need a home or they are lost.\n\nWork from the sweep's own list — 34 from typescript-eslint's none-preset and\nnoisy set (`explicit-module-boundary-types`, `naming-convention`,\n`no-non-null-assertion`, `prefer-readonly-parameter-types`, `max-params`,\n`no-magic-numbers`, `no-shadow`, `class-methods-use-this`, `no-loop-func`,\n`no-use-before-define`, `prefer-destructuring`, `no-restricted-types`,\n`explicit-function-return-type`, `explicit-member-accessibility`); 12 from\n`eslint-plugin-security` (`detect-object-injection`,\n`detect-non-literal-fs-filename`, `detect-unsafe-regex`,\n`detect-non-literal-regexp`, `detect-non-literal-require`,\n`detect-child-process`, `detect-possible-timing-attacks`); 2 from\n`no-unsanitized`; and the Biome `nursery`/`performance` picks\n(`noBarrelFile`, `noAwaitInLoops`, `noExcessiveCognitiveComplexity`,\n`noExcessiveLinesPerFunction`, `noSecrets`).\n\nFor each, choose exactly one outcome and say which: **promote to a lint\nrule**, where the noise argument does not survive this fleet's measured code\n— `detect-object-injection`'s false-positive rate depends on how much\nbracket-notation access actually exists here, so measure it; **write as\nprose with a non-linter verification** (a grep, a script, a `wc -l`); or\n**drop**, because the model does it reliably and a rule would be noise.\n\nThe deliverable is a triaged table — slug, source rule, outcome, and for the\npromoted-to-prose ones a draft one-line rule with its verification. Do not\nrestate the lint rule's documentation; state what an agent editing this\nfleet must do. Prefer dropping to keeping: a rule set that restates 54 lint\nrules is one nobody reads."
  },
  {
    "group": "ts-modules",
    "slug": "resolution-per-shape",
    "label": "Which axis decides `moduleResolution`, and what the choice then requires",
    "brief": "Settle the four-way split: `NodeNext` (`ocx-catalog`, `grimoire-indexer`,\n`setup-ocx`), `Node16` (`vscode-ocx` alone), `Bundler` (`grimoire-vscode`,\nboth `fma` projects, both `creeptd-ng/web` projects, `kate-middlechild`),\nand preset-inherited (`kate-middlechild/packages/web` via\n`astro/tsconfigs/strict`).\n\nEstablish which axis decides — target runtime or consumer toolchain — and\nread Andrew Branch's \"Is `nodenext` right for libraries that don't target\nNode.js?\" for the strongest argument that it is not the obvious one. Then\nchase the consequences that bite: the `.js`-extension requirement under\n`NodeNext`/`Node16`, where `vscode-ocx` has 11 of 11 relative imports\nmissing it while declaring `Node16` — establish whether that is broken at\nruntime or masked by esbuild bundling, which is the whole question;\n`--module node18`/`node20` as frozen reference points versus `nodenext` as\nan explicitly moving target; `rewriteRelativeImportExtensions` (5.7) and\n`allowImportingTsExtensions` as alternatives; and Bun's own condition order\n(`bun, node-addons, node, require, import, default`) as a third answer for\nthe Action.\n\nRead `ocx-catalog/tsconfig.theme.json` and its inline comment as the\nexemplar for the mixed case: one repo, a Node-target CLI and a\nbundler-target VitePress theme, split by `moduleResolution` with the reason\nwritten down. That split is why a naive fleet-wide \"always suffix `.js`\"\nrule would flag 139 correct lines.\n\nThe deliverable must decide: the decision rule for picking a resolution\nmode, stated as a question an agent can answer about the file it is editing;\nwhether `vscode-ocx` is a live defect or benign, with evidence; and whether\nthe two sibling extensions' disagreement (`Node16` versus\n`ESNext`+`Bundler`) has a reason or is drift to close."
  },
  {
    "group": "ts-modules",
    "slug": "publish-verification",
    "label": "Verifying an npm-distributed CLI that is not a library",
    "brief": "Re-scope publish verification for a shape that ships a `bin`, not an API.\nBoth declared entry points are `export {};` stubs; `ocx-catalog` has no\n`\".\"` export, only `./theme` resolving to unbuilt `.mts` source.\n\nSeparate `publint`'s rules (27 errors, 14 warnings, 7 suggestions) and\n`attw`'s 11 problem codes into what still binds this shape and what only\nmatters for a library. Still binding: `EXPORTS_TYPES_SHOULD_BE_FIRST`,\n`EXPORTS_DEFAULT_SHOULD_BE_LAST`, `FILE_DOES_NOT_EXIST`,\n`FILE_NOT_PUBLISHED`, `USE_FILES`, `USE_TYPE`, `USE_ENGINES_NODE`, and\n`attw`'s `NoResolution`/`UntypedResolution`/`InternalResolutionError`.\nPreventive only while the fleet stays ESM-only: `FalseCJS`, `FalseESM`,\n`CJSOnlyExportsDefault`, `MissingExportEquals`.\n\nChase the specific gap: `ocx-catalog` runs both tools through\n`scripts/pack-smoke.mjs` in a network-enabled CI job; `grimoire-indexer`\nships the same dual `bin`+`exports` shape with **neither tool declared and\nneither name in any workflow**. Establish what a pack-smoke must actually do\nfor a CLI — pack, install the tarball into a sandbox, run the installed\nbinary, resolve any declared subpath — and whether shipping `.mts` source\nthrough an `exports` map is defensible or a latent break.\n\nAlso settle ESM-only versus dual publishing given Node 22+'s stable\n`require(esm)`; whether `engines.node` is a checkable claim or decoration;\nand whether `npm-shrinkwrap.json` is ever right for a CLI that is also\nimportable.\n\nThe deliverable must decide the exact CI verification set for shape 1, as\ncommands, and name which of the two repos is out of compliance today and in\nwhat specific way."
  },
  {
    "group": "ts-modules",
    "slug": "import-graph",
    "label": "Cycles, barrels, and boundaries that nothing checks",
    "brief": "Every catalogue leaves import-graph hygiene opt-in: `import-x/no-cycle`,\n`no-extraneous-dependencies` and `no-unresolved` are off by default, and\nBiome's `noUndeclaredDependencies`, `noUnresolvedImports` and\n`noImportCycles` are not recommended either. This fleet has zero default\ncoverage of a real runtime bug class.\n\nRun the checks rather than reasoning about them. Establish per repo: how\nmany import cycles exist and whether any produces a temporal-dead-zone or\n`undefined`-at-import-time hazard; whether any import resolves to a package\nabsent from `package.json`; and what the twelve barrel files cost, given one\n(`grimoire-indexer/src/index.ts`) is the `export {}` placeholder and the two\nVite SPAs pay barrel cost in dev-server graph size and HMR.\n\nChase the confirmed boundary violation:\n`kate-middlechild/packages/core/src/map.test.ts:12` imports\n`../../web/src/data/…json` — `core` reaching into `web`'s source tree in a\nmonorepo whose premise is package separation. Establish whether\n`import-x/no-relative-packages` or Biome's `noPrivateImports` is the right\nguard, and whether the same violation exists outside tests.\n\nName the catalogue-rot trap in the deliverable: `eslint-plugin-import` is\neffectively unmaintained for flat config, `eslint-plugin-import-x` is the\nfork that works for seven of this fleet's eight ESLint repos, and an agent\nfollowing older guidance installs the wrong one.\n\nThe deliverable must decide: which import-graph rules justify a CI-only pass\nversus an every-edit rule, since cycle detection is expensive on a large\ngraph; the measured cycle and extraneous-dependency counts per repo; and\nwhether barrel files get a rule or a note."
  },
  {
    "group": "ts-async",
    "slug": "promise-observability",
    "label": "Floating, misused, marked, and what each runtime does with a rejection",
    "brief": "Establish what happens to an unobserved rejection in each of the fleet's\nfour runtimes, and what the rule must therefore say per shape.\n\nInvestigate Node's `unhandledRejection` as an `EventEmitter` event on\n`process` with a terminating default action (Node >=15) versus the browser's\nWHATWG `unhandledrejection` `Event` on `globalThis`; Bun's behaviour under\n`bun run` versus `bun test`, which is documented to swallow rejections\nduring test runs — verify by experiment, not citation; and the VS Code\nextension host, where an uncaught rejection terminates the shared host and\nkills every extension's state in that window until restart.\n\nChase the fleet's own evidence. `runtime` found 98 `void x()` markers\nconcentrated in the two extensions and established that `void` marks a\npromise as deliberately unawaited while attaching **no** rejection handler.\nTwo sites are real gaps (`fma/src/audio/sources/SpotifyPlayer.ts:80`,\n`grimoire-vscode/src/extension.ts:507`), and the file containing the second\napplies a full try/catch to its two sibling activation-time calls. Read\n`grimoire-vscode/src/extension.ts:185-210` (`refreshAll`) as the exemplar —\na coalescing drain loop with a per-round try/catch and a comment explaining\nwhy an earlier design let one bad round poison every queued caller. Settle\nthe agent-specific forms in the same pass: `forEach(async …)` and\n`.map(async …)` both pass `tsc --noEmit` cleanly and are caught only by\n`no-misused-promises` with `checksVoidReturn`.\n\nThe deliverable must decide: whether `void` is permitted at all and under\nexactly what condition — a self-catching callee, a documented lifetime, or\nan attached `.catch()`; the per-shape rule for a top-level guard\n(`process.on('unhandledRejection')` in a CLI, `core.setFailed` in an Action,\nan error boundary in an SPA, a self-catching activation path in an\nextension); and whether `Promise.all` versus `allSettled` versus a bounded\nmap is a rule or a judgment call, given `Promise.race` is used nowhere and\n`allSettled` twice fleet-wide."
  },
  {
    "group": "ts-async",
    "slug": "cancellation-and-timeouts",
    "label": "Deadlines, signals, and the one line never propagated",
    "brief": "Thirteen of fourteen first-party `fetch()` sites carry no `AbortSignal` and\nno timeout. The one compliant site is a single line: `signal:\nAbortSignal.timeout(TIMEOUT_MS)` at\n`grimoire-indexer/src/validate/adapters/http.ts:96`.\n\nInvestigate the composition problem, which a one-line fix does not answer:\n`AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])` for combining a\ncaller's cancellation with a library-imposed deadline; typing\n`signal.reason`; whether a `signal` parameter should be required, optional\nor absent on an internal helper; and how a timeout interacts with retry and\nbackoff, since `ocx-catalog/src/sources/walker.ts:170` already jitters\nretries.\n\nChase the non-`fetch` surfaces, each of which has a different answer.\nConnect-RPC's `createConnectTransport({ defaultTimeoutMs })` is omitted in\nboth of `creeptd-ng/web`'s client factories, so every RPC call relies on a\nbrowser default. `@actions/exec`'s `ExecOptions` exposes **no** per-call\ntimeout — unlike Node's own `execFile` — so `setup-ocx`'s three subprocess\nsites can only be bounded by the workflow's `timeout-minutes`. VS Code's\n`CancellationToken` is unused because the extensions model long-lived work\nas `Disposable`s under `context.subscriptions`; establish whether that is\nright for the shape or an avoidance.\n\nThe deliverable must decide: whether a timeout is mandatory on every\noutbound call and what the default is per shape; how a helper composes a\ncaller's signal with its own deadline, as a code shape not a paragraph;\nwhether `@actions/exec` should be replaced by `execFile` so a timeout\nbecomes expressible; and whether the `Disposable`-instead-of-token choice\nneeds a rule or a note."
  },
  {
    "group": "ts-resources",
    "slug": "explicit-resource-management",
    "label": "`using`, `await using`, and the protocol that predates them",
    "brief": "Establish whether `using`/`await using` belongs in this fleet, where, and\nwhat it collides with.\n\nInvestigate the mechanics properly: `Symbol.dispose` and\n`Symbol.asyncDispose`; `DisposableStack`/`AsyncDisposableStack` for the\naggregate case; what TypeScript emits when the target lacks the symbols, and\nwhether esbuild, Vite 8/Rolldown and Bun each transpile it correctly — the\nextensions are esbuild-bundled, the Action runs untranspiled on Bun, the\nSPAs go through Rolldown, three different answers; and the `lib` requirement\n(`esnext.disposable`), which matters because `ocx-catalog` sets `lib:\n[ES2022]` and would need a change.\n\nChase the collision the canonical scout named and nobody resolved.\n`vscode.Disposable` is a `{ dispose(): void }` protocol with an ownership\nmodel (`context.subscriptions`) that VS Code drains on deactivation;\n`Symbol.dispose` is scope-bound. They are not the same lifetime and a value\ncan implement both. Establish whether a VS Code `Disposable` should be\nadapted to `Symbol.dispose`, and whether `Disposable.from` or a small\nadapter is the right shape — or whether the two idioms stay separated by\nrule, with a stated boundary. Inventory the fleet's real candidates first:\n`fs/promises` `FileHandle` (GC-based auto-close is documented unreliable),\nchild processes, `vscode.OutputChannel`, file watchers, the interval folded\ninto a disposable at `grimoire-vscode/src/extension.ts:653`, and any\n`try/finally` whose `finally` only calls `.close()`/`.dispose()`.\n\nThe deliverable must decide: adopt, adopt-with-scope, or defer — with the\ncompiler and runtime floor per shape stated explicitly, since `ocx-catalog`\nis on `^5.9.3` and the SPAs on `^5.7.x`; and if adopted, whether the rule is\n\"prefer `using` for disposable-shaped resources\" or the narrower \"never\nhand-roll `try/finally` where the resource already implements a disposal\nprotocol\"."
  },
  {
    "group": "ts-resources",
    "slug": "process-and-timer-lifecycle",
    "label": "The exemplar, and the sites that diverge from it",
    "brief": "The fleet has one genuinely excellent child-process wrapper and several\nsites that do not match it. Turn the exemplar into a rule and name the\ndivergences.\n\nRead `grimoire-vscode/src/grim.ts:597-628` (`runJson`) in full: `execFile`\nwith an argv array and no shell, `timeout: options.timeoutMs ?? 120_000`, a\ncapped `maxBuffer`, ENOENT distinguished from a real failure, and a\n`child.stdin.on('error', () => {})` guard citing nodejs/node#40085 for the\nEPIPE race. That is the shape every wrapper should be judged against.\n\nThen decide, for each divergence, defect or justified difference:\n`grimoire-vscode/src/installer.ts:242-251` (`extract()` via system `tar`, no\ntimeout, sibling in the same repo sets one);\n`vscode-ocx/src/ocx.ts:105,141,207` (`execFileAsync`, no timeout observed);\n`setup-ocx`'s three `@actions/exec` calls, where no timeout is available in\nthe API; and `ocx-catalog/src/sources/git.ts:29`, a deliberately\nnon-promisified callback wrapper whose comment gives a mockability reason —\nestablish whether that reason still holds.\n\nCover timers with the same discipline. Three repos use `setTimeout` with\nzero `clearTimeout` (`grimoire-indexer` 7/0, `setup-ocx` 1/0,\n`kate-middlechild` 12/0), and one `setInterval` is deliberately never\ncleared with the reason written at\n`grimoire-vscode/src/webview/sidebar/main.ts:899`. Establish the rule that\nseparates \"one-shot, nothing to clear\" from \"leak\".\n\nThe deliverable must decide: the mandatory fields of a child-process\ninvocation here — argv array, timeout, maxBuffer, exit-code check, stderr\ncapture, ENOENT handling — as a checkable list; whether `@actions/exec`\nshould be abandoned for `execFile` on that basis; and a timer rule phrased\nso the deliberately-uncleared interval passes it."
  },
  {
    "group": "ts-extension-host",
    "slug": "host-failure-modes",
    "label": "What one extension's mistake does to every other extension",
    "brief": "Establish the failure model of the shared extension host, and what an agent\nediting this code must never do.\n\nInvestigate VS Code's own extension-host guide and extension guidelines: the\nshared-process model (\"misbehaving extensions should not impact the user\nexperience\"); what actually happens on an uncaught rejection in the host on\nmodern Node — the host terminates, VS Code reports \"the extension host\nterminated unexpectedly\" and restarts it, killing every extension's state in\nthat window; activation-event granularity and why `onStartupFinished`\nexists; and `Developer: Show Running Extensions` as the mechanical profiling\nstep standing in for a lint nobody has.\n\nChase workspace trust as the second failure mode, because it is a\ncross-check no grep catches. `capabilities.untrustedWorkspaces.supported` is\n`true`/`false`/`'limited'`, with `restrictedConfigurations` for the limited\ncase; `vscode.workspace.isTrusted` plus `onDidGrantWorkspaceTrust` at\nruntime; the `isWorkspaceTrusted` context key for `when` clauses. The\nfinding is a mismatch between the declared capability and what the\nactivation path does before any trust check — reading workspace config,\nspawning a process from a workspace-provided path, or resolving a module\nfrom the open workspace. Read both manifests against their `activate()`\nfunctions and say whether either misrepresents itself. Do not re-measure\nwhat wave 1 already found clean (activation events, disposal, command\nparity, `OutputChannel` logging); spend the dive on what an agent breaks.\n\nThe deliverable must decide: the per-shape rule for a top-level guard, given\n`activate()` is synchronous and async work is fire-and-forget; whether `void\nf()` in an activation path requires a self-catching callee as a hard rule;\nand the workspace-trust cross-check stated as a reviewable procedure, since\nit is explicitly not a single grep."
  },
  {
    "group": "ts-extension-host",
    "slug": "webview-boundary",
    "label": "The extension-to-webview seam, typed on one side",
    "brief": "The webview is a second execution context with a different threat model, a\ndifferent DOM, and a message protocol TypeScript types but nothing\nvalidates.\n\nInvestigate VS Code's webview guidance — CSP in a webview,\n`webview.cspSource`, `localResourceRoots`, `asWebviewUri`, and why a\nwebview's default posture is stricter than a browser page's; the\n`postMessage` boundary, where both sides share a `.ts` type declaration but\nthe receiver gets an untyped value at runtime; and the raw-DOM-sink problem\nno React or Vue rule reaches. `eslint-plugin-no-unsanitized`'s two rules are\nthe only framework-agnostic guard in the entire sweep for `.innerHTML`,\n`insertAdjacentHTML()`, `document.write()`, `DOMParser#parseFromString()`\nand iframe `srcdoc` — and neither is installed anywhere here. Note the\nplugin's own caveat: without a recognised escaping pattern or the Sanitizer\nAPI it flags everything, which is why the sweep marked it rule-text.\n\nChase the cohesion problem in the same seam, because it is the same code.\n`grimoire-vscode/src/webview/model.ts` exports 94 symbols mixing wire types\nwith roughly 70 unrelated free functions; `protocol.ts` exports 40;\n`settings/model.ts` exports 42. Establish whether the wire surface is\ngenuinely that large — as `grim.ts`'s 63 exports arguably are, being one\nCLI's JSON output contract — or whether this is a kitchen sink, and what\nrule separates the two cases.\n\nThe deliverable must decide: whether a message crossing the webview boundary\nmust be validated on receipt or may be trusted on its declared type, with\nthe reason; the concrete DOM-sink rule for webview and preload code given no\nlint will be installed; and whether an export-count or mixed-concern rule is\ncheckable enough to state."
  },
  {
    "group": "ts-extension-host",
    "slug": "faking-vscode",
    "label": "164 double-casts and no test-double package",
    "brief": "The fleet's highest-volume escape hatch, and not a typing failure — a\nstructural consequence of testing against an API with no official mock.\nEvery sampled `as unknown as` manufactures a fake `vscode.*` object.\n\nEstablish what already exists: `@vscode/test-cli` and\n`@vscode/test-electron` run tests in a real extension host with a real\n`vscode` module. Separate the casts that exist because the test runs\n*outside* that host from those that exist because the real object is\nimpractical to construct even inside it. `vscode.EventEmitter`,\n`vscode.Uri`, `vscode.Disposable` and the memento/`ExtensionContext` shapes\nare cases where a real instance is available and a fake is unnecessary;\n`WebviewView`, `GlobalEnvironmentVariableCollection` and the tree-view\nsurfaces are cases where a fake is genuinely required.\n\nEvaluate candidate patterns rather than assuming one: a named\n`fake<T>(partial: Partial<T>): T` helper per faked interface, colocated with\nits tests; a `satisfies`-checked partial that fails to compile when the real\ninterface gains a required member; a builder returning the real type with no\nassertion. The property that matters is whether the fake breaks the build\nwhen the API it imitates changes — today nothing does, so a `vscode` engine\nbump can silently invalidate 79 fakes in one file.\n\nSettle the pattern's two other homes so the rule is not VS-Code-only:\n`ocx-catalog` has 57 double-casts, and `creeptd-ng/web` fakes `window` and\nPinia internals with the fleet's only four `as any`.\n\nThe deliverable must decide: the one sanctioned faking shape, written as\ncode; whether the rule bans inline `as unknown as T` at call sites outright\nor only outside a named helper; and whether a conformance check — the fake\nmust still satisfy the real type — is achievable without a runtime\ndependency."
  },
  {
    "group": "ts-errors-boundaries",
    "slug": "error-taxonomy-and-cause",
    "label": "What a rethrow must carry, and what a shape without a CLI needs",
    "brief": "Establish the error contract per shape, given the fleet is two populations:\nthe two CLIs and the Action have real, tested, named contracts; everything\nelse throws bare strings.\n\nInvestigate `Error.cause` as mechanism, not style: `new Error(msg, { cause\n})` semantics; what `util.inspect`/`console.error` do with a chain; what\nsurvives structured cloning across a worker or webview boundary; what\nsurvives serialisation to a log line; and whether `AggregateError` covers\nthe `Promise.all` case. Establish when a rethrow must carry a cause and when\nre-deriving a message is correct.\n\nChase the fleet's split. Read `grimoire-indexer/src/cli/exit.ts` plus\n`main.ts:66-94` (`classify()`) as the exemplar: one `const` object of named\ncodes, a branded `ExitCode` type, one function mapping `unknown` to a code,\ncalled from exactly one place, with a fail-closed gate branch that exists\nbecause of a real historical exploit. Read `ocx-catalog`'s\nthree-times-repeated `instanceof ConfigError`/`BuildError` dispatch as the\nanti-pattern in the same fleet. Then establish what the *other seven repos*\nneed: an extension and an SPA have no exit code to classify to, so \"typed\nclass carrying a code\" may be the wrong shape — say what the right one is,\nor that bare `Error` with a cause suffices and why.\n\nSettle two mechanics: matching a named error class by `.name` rather than\n`instanceof` when the defining module is dynamically imported\n(`main.ts:82-91` does this deliberately); and which catch sites must\npreserve a stack, given `main.ts:89` — the branch for genuinely unexpected\nerrors — logs `err.message` and discards the only trace a bug report would\nhave had.\n\nThe deliverable must decide: the `Error.cause` rule with its exceptions; the\nper-shape taxonomy rule; and whether one central classifier is mandatory\nwherever an error maps to an outward-facing value."
  },
  {
    "group": "ts-errors-boundaries",
    "slug": "untrusted-to-typed",
    "label": "The boundary, and the two repos that do not have one",
    "brief": "Establish the single crossing point where `unknown` becomes typed, and what\nis forbidden on either side.\n\nInvestigate the validators as a decision, not a menu: Zod's\n`.parse()`/`.safeParse()` throw-versus-Result split; Ajv's compiled\nvalidators as TypeScript type guards with `JSONSchemaType<T>`; and\n`StandardSchemaV1`, a ~60-line interface Zod, Valibot and ArkType already\nimplement, as the type a *shared* helper should accept so it is not coupled\nto one library. The fleet already has the problem: `kate-middlechild`'s own\nrule file mandates Zod at every external boundary, `creeptd-ng/web` has Zod,\nand `ocx-catalog` and `vscode-ocx` have `ajv` and use it only in tests.\n\nChase the actual boundaries and say what guards each: `JSON.parse` (119\nsites), `fetch(...).json()`, `process.env`, CLI arguments, `ocx.toml` and\n`catalog.config.json` on disk, protobuf/Connect-RPC payloads, and webview\n`postMessage`. The decisive anti-pattern to name is the cast-after-parse — a\n`JSON.parse` result asserted with `as T`, which the type system cannot\ndistinguish from validation. Establish whether it occurs here.\n\nSettle ajv with a verdict, not a description. `ocx-catalog`'s hand-rolled\n`load.ts` validator is deliberate and documented, its JSON Schema exists for\neditor autocomplete, and `test/config/schema-agreement.test.ts` keeps the\ntwo in agreement. `vscode-ocx` has the same dependency, the same schema\nfile, no runtime consumer of either, and no agreement test. Then take the\nSPA floor, the same problem one layer out: neither SPA has a React error\nboundary, a `componentDidCatch`, or a Vue `app.config.errorHandler`, so an\nuncaught render error is a white screen with no recovery path and — in one\nrepo, with zero `console.*` calls anywhere — no trace at all.\n\nThe deliverable must decide: the one-sentence boundary rule and its\nverification; whether the fleet standardises on one validator or on\n`StandardSchemaV1` for shared code; the per-repo ajv verdict; and the\nminimum error surface an SPA must ship."
  }
]
```



## Deferred

The backlog wave 3 starts from. Grouped; each line says why it waits and
what promotes it.

### Ready to author without a dive

These are not unresearched — wave 1 measured them to authoring depth. They
wait for a writer, not a researcher, and a dive spent here would re-derive
an existing table.

| group | why it waits | what promotes it |
|---|---|---|
| **tsconfig strictness floor and per-shape profiles** (group B, 15 rows) | `cfg` measured every flag across all 15 tsconfigs; `cod` enumerated every flag with an adopt verdict and a migration cost. The only open question is which profile each shape gets, and that falls out of `ts-modules`' resolution decision. | `ts-modules/resolution-per-shape` landing — then author `TS-CFG` directly. |
| **Era, floors and version currency** (group A, 11 rows) | Settled against the npm registry, the Node EOL schedule and the measured declared ranges. The rule text is short and the facts are dated. | Nothing. Author it, and date every version claim in the rule text so its staleness is visible. |
| **Exit-code contract, streams, CLI argv** (group G partial, `TS-CLI`) | `contract` found this fully honoured and fully tested in both CLIs — named constants, one classifier, a fail-closed regression test for a real historical exploit. The rule is preservation. | Author from `contract` §1 and §3 directly. The one open item (`--json`/`--quiet` absent in a CLI whose gate command exists to be consumed by CI) is a design question for the owner, not research. |

### Waits on a wave-2 result

| group | why it waits | what promotes it |
|---|---|---|
| **Testing across three runners** (group M, 9 rows) | The interesting half is `faking-vscode`, which is already commissioned. The rest — coverage gates, file size, layout — is thin until the fake pattern settles what a test in this fleet looks like. | `ts-extension-host/faking-vscode` landing. |
| **Observability per runtime** (group O, partial) | Logging is correct per shape and undocumented; the rule is short. But which catch sites must keep a stack is decided inside `error-taxonomy-and-cause`. | That dive landing; then `TS-OBS` is one page. |
| **Import-attribute and module-syntax mechanics** (H rows on `with { type: 'json' }`, frozen module modes) | Sub-questions of `resolution-per-shape`; splitting them out would duplicate the dive. | Nothing — they land inside that dive or they are dropped. |

### Real topics, not selected this wave

| group | why it waits | what promotes it |
|---|---|---|
| **Security and untrusted input** (group N, 14 rows) | `hard` returned the most complete catalogue of any scout, and `runtime` measured the fleet clean on the things that usually go wrong — 0 shell interpolation, 0 `rejectUnauthorized: false`, 0 `innerHTML`, one `v-html` behind a real DOMPurify chokepoint, two independent prototype-pollution defences. The uncovered residue (bidi/trojan-source, `setSecret`, ReDoS plugin choice, path containment) is real but small, and half of it lands inside `rule-text-residue`. | A measured finding: run `detect-bidi-characters` and a path-containment review across the fleet. If either returns a hit, promote to a full dive. |
| **Browser SPA: React 19, Vue 3, Vite 8** (group L, 12 rows) | The single P0 in the group (no error boundary in either SPA) is commissioned inside `untrusted-to-typed`. The rest is framework idiom, which the lint sweep explicitly scoped out as a separate future pass, and both SPAs are the fleet's least-invested repos — one has no CI and no AI config at all. | The owner deciding the SPAs are in scope for the ruleset. Until then a `TS-WEB` family with three rules is honest and a twelve-rule one is aspirational. |
| **Type-level programming: conditional-type distribution, recursion depth, template-literal DSLs** | `canon` derived this from type-challenges' difficulty curve, not from fleet evidence. `shape` could not count generic parameters without an AST and declined to fake a number. Nothing here binds a measured defect. | Evidence that a generated type surface (Connect-RPC, a Zod schema tree) is hitting a real recursion or performance cliff in this fleet. |
| **Declaration merging and ambient scope in a monorepo** | Named by two scouts as boring-but-biting. `shape` found seven `declare module`/`declare global` sites, six of them mechanical Vite asset shims and one real (`fma`'s `window` augmentation). One real instance is a note, not a topic. | A second real instance, or a monorepo package leaking a global into a sibling. |
| **Supply chain: cooldowns, provenance, npm 12 defaults, Corepack** (group I, partial) | Genuinely important and genuinely fast-moving — four package managers shipped a cooldown within twelve months, npm 12 flipped install defaults in July 2026, and Corepack left Node 25. Encoding it now guarantees a stale rule within two quarters. | Author it as a dated, thin `TS-PKG` section that names the mechanism and defers the values, or wait until the dust settles. Do not write version numbers into a rule without a date next to them. |
| **Accessibility** | Biome's 36 a11y rules and the jsx-a11y equivalents are a large, well-covered surface, and the one repo using Biome has the cleanest suppression discipline in the fleet — five `biome-ignore`s, every one carrying a justification comment pointing at a named rule file. | The SPAs entering scope; a11y is a `TS-WEB` concern and follows that decision. |
| **Performance: iterator helpers, barrel-file cost, bundle weight** | Baseline-safe and real, but no measured cost exists for this fleet. Barrel-file cost is commissioned inside `import-graph`; the rest is speculative. | A measured build-time or bundle-size number worth acting on. |
| **`.ts` source versus JSDoc-annotated `.js` for library authoring** | A live architectural fork in the wider ecosystem, and moot here: shape 1 turned out not to be a library, so the cost side of Harris's argument (the build pipeline a library would rather not have) does not apply to a package whose entire product is a `bin`. | The fleet publishing an actual importable API. |
| **`isolatedDeclarations`** | High migration cost, and the payoff is fast parallel `.d.ts` emit for packages that currently emit declarations for two `export {}` stubs. | Same trigger as above. |
| **Temporal, `Intl.Segmenter`, grapheme handling, `structuredClone` in workers** | Correct, uncontested, and unattached to any measured defect here. Temporal specifically is a trap in the other direction — TS 6.0 ships its types while Safari has not shipped the runtime. | A date-arithmetic or user-visible-text defect in the fleet. |
| **Node permission model, `--frozen-intrinsics`, `--secure-heap`** | Stable, real, and not a sandbox — and nothing in this fleet runs untrusted code in-process. | The fleet processing genuinely untrusted input in a shape that could be confined. |
| **oxlint as an ESLint replacement** | Its type-aware linting stabilised six weeks before the sweep and its JS-plugin support is alpha. Both numbers the sweep found for its rule count disagree with each other. | Twelve months of stability, or a measured lint-time problem the current gate cannot solve. |
| **Framework-idiom lint sweep** (the 209 oxlint React/Vue/Next/Jest/Vitest/Playwright rules the sweep counted but did not enumerate) | Explicitly out of scope for a *language* quality rule set. | A decision that the ruleset covers framework idiom, which would be a different artifact. |

## Proposed rule-ID families

`TS-<FAMILY>-nn`, following the Python `PY-` decision: a bare prefix belongs
to exactly one rule set forever. Fifteen families.

| family | what belongs in it |
|---|---|
| `TS-CORE` | The index's own non-negotiables — the handful of MUST rules that block a merge and are worth stating before any routing happens. |
| `TS-CFG` | `tsconfig` compiler options: the strictness floor beyond `strict`, the per-shape profile, `extends` topology, and every rule that depends on a 6.0 default flip. |
| `TS-GATE` | The lint/typecheck/test chain and its wiring: type-aware linting, preset selection, the extension-rule trap, Biome/ESLint parity, one command locally and the same command in CI. |
| `TS-MOD` | Module system: `moduleResolution` per shape, relative-import extensions, `import type` discipline, ESM/CJS interop, cycles, barrels, package boundaries. |
| `TS-PKG` | `package.json` and distribution: `engines`, `type`, `exports`, `bin`, dependency placement, lockfile policy by artifact type, `publint`/`attw`, publish credentials and provenance. |
| `TS-TYP` | Type-system idiom: `unknown` over `any`, the double-cast, `satisfies` versus `as const` versus annotation, assertions, non-null, exhaustiveness, `enum` alternatives, cohesion of a type surface. |
| `TS-ASYNC` | Promises: floating and misused, `void` as a marker rather than a handler, concurrency bounds, cancellation, timeouts, per-runtime rejection semantics. |
| `TS-RES` | Resource lifecycle: `using`/`await using`, disposal protocols, child processes, timers, file handles, and the boundary with `vscode.Disposable`. |
| `TS-ERR` | Error taxonomy: `Error.cause`, typed classes carrying a code, one classifier, catch discipline, what a rethrow must preserve. |
| `TS-CLI` | The CLI contract: named exit codes, the classifier's single call site, stdout as payload and stderr as diagnostics, machine-output modes. Largely preservation. |
| `TS-HOST` | VS Code and Electron extension host: activation, disposal, the webview boundary, workspace trust, host-shared failure modes, esbuild bundling constraints. |
| `TS-WEB` | Browser SPA: error boundaries and global handlers, framework-specific DOM sinks, generated RPC code as a boundary, CSP delivery, bundle cost. |
| `TS-SEC` | Untrusted input and injection: argv arrays, path containment, prototype pollution, ReDoS, DOM sinks outside a framework, secret masking, trojan-source characters. |
| `TS-TEST` | Testing: the three-runner reality, faking an API with no test-double package, fail-closed gate tests, determinism, coverage. |
| `TS-OBS` | Observability: the logging channel each runtime demands, stack preservation at the catch sites that matter, locale and clock determinism in anything a machine reads. |

The Action shape does not get its own family. Its measured contract is clean
and its remaining rules (committed `dist/` drift, `core.setSecret`, workflow
permissions, `run:` interpolation) split cleanly between `TS-PKG` and
`TS-SEC` — a family with four rules and one adopting repo is a prefix spent
for nothing.

## Artifact-set implications

### Does `typescript-packaging` still earn a separate rule file?

**Yes — but its remit changes, and its globs are wrong as proposed.**

The frame justified a second rule file on library packaging: `exports` maps,
`publint`, `attw`, dual-publish correctness, `.d.ts` authoring. `shape` §7
and `contract` §4 removed most of that. `grimoire-indexer`'s two declared
entry points are literal `export {};` stubs; `ocx-catalog` has no `"."`
export at all and its single `./theme` subpath resolves to a two-property
VitePress object in unbuilt `.mts` source. Neither package has a public API
surface worth writing public-API rules against. If library packaging were
the file's only content, it should fold.

It is not the only content, and the decisive argument is mechanical rather
than thematic: **a rule file only loads when its glob matches.**
`rules/typescript-quality.md` globs `**/*.ts`, `**/*.tsx`, `**/*.mts`,
`**/*.cts`. It will never load while an agent is editing `package.json` or a
tsconfig — which is exactly the moment the fleet's highest-priority findings
apply. Folding packaging into the quality index's support directory makes
those rules unreachable at the only moment they matter. That is the failure
mode the fleet has already catalogued twice.

And the manifest is not a library concern here. `**/package.json` matches
all nine repos and carries, per shape: `engines.node` (three repos declaring
an EOL floor), `type: module`, `exports` and `bin` (shape 1),
`activationEvents` and `contributes.commands` (shape 2 — command parity is a
`package.json` contract, not a `.ts` one), `scripts` (the gate, in every
repo), `packageManager`, the Bun `catalog:` field that pins one repo's
compiler, and dependency placement (three test-only packages in
`dependencies` in one repo). Five of those seven concerns have nothing to do
with publishing a library.

**Glob evidence, measured 2026-08-29 under `/home/mherwig/dev`:**

```
$ find <8 repos> -iname "tsconfig*.json" -not -path "*/node_modules/*" ... | wc -l
15
```

Of those fifteen, **nine are named `tsconfig.json` and six are not**:
`ocx-catalog/tsconfig.theme.json`, `setup-ocx/tsconfig.eslint.json`,
`fma/tsconfig.app.json`, `fma/tsconfig.node.json`,
`creeptd-ng/web/e2e/tsconfig.e2e.json`,
`kate-middlechild/tsconfig.base.json`. The frame's proposed
`**/tsconfig.json` therefore **misses 40% of the fleet's tsconfigs,
including the two that carry the most load-bearing decisions** —
`tsconfig.theme.json` is the mixed-resolution exemplar the whole
`split-by-resolution` rule is built on, and `tsconfig.base.json` is the only
place the Biome monorepo states a strictness posture at all. The glob must
be `**/tsconfig*.json`.

**Proposed globs for `rules/typescript-packaging.md`:**

```yaml
paths:
  - "**/package.json"
  - "**/tsconfig*.json"
  - "**/eslint.config.*"
  - "**/biome.json"
  - "**/biome.jsonc"
```

The first two are names the toolchain guarantees — npm requires
`package.json`, `tsc` resolves `tsconfig*.json` — which is the same standard
that admitted `pyproject.toml` and `uv.lock` and rejected `ruff.toml`. The
last three are a deliberate extension of that standard, and the argument for
them is the fleet's own largest finding: type-aware linting is wired in one
repo of nine, two repos' documentation claims it where the config does not
have it, and one repo runs a `lint` script against a config that does not
exist. Those are all *config-file* defects. A rule that only loads while
editing `.ts` will never be read by the agent editing the file that causes
them. ESLint's flat-config filename set (`eslint.config.js|mjs|cjs|ts`) and
Biome's (`biome.json`/`biome.jsonc`) are both defined by their tools and
stable, and six ESLint configs plus one Biome config cover seven of the nine
repos. The Python program's rejection of `ruff.toml` turned on those files
being *dead* against its subject; here they are the live definition site of
the finding.

The file keeps its name for symmetry with `python-packaging` and `rust-*`,
but its subject is **manifests and the declared contract**: what a repo
claims about itself in a file no compiler checks. Library-publish
verification (`publint`, `attw`, `exports` ordering) survives as one section
of it, sized to a fleet that ships two `bin`s and one subpath, not two
libraries.

### Depth-file list for `rules/typescript-quality/`

Twelve depth files, matching the Python set's proportions. The index holds
the gate, the non-negotiables, and a task-worded routing table; each depth
file owns one family's definitions with rationale and verification.

| file | families | why it is its own file |
|---|---|---|
| `gate.md` | `TS-GATE` | Type-aware wiring, preset choice, the extension-rule trap, Biome/ESLint parity, one command locally and in CI. The fleet's largest structural gap deserves the first depth file. |
| `modules.md` | `TS-MOD` | Resolution per shape, extension discipline, `import type`, interop, cycles, barrels, package boundaries. |
| `types.md` | `TS-TYP` | Escape hatches, `satisfies`/`as const`/annotation, exhaustiveness, `enum` alternatives, ambient declarations, type-surface cohesion. |
| `async.md` | `TS-ASYNC` | Floating and misused promises, `void` as a marker, concurrency bounds, cancellation, timeouts, per-runtime rejection semantics. |
| `resources.md` | `TS-RES` | `using`/`await using`, disposal protocols, child processes, timers, file handles. |
| `errors.md` | `TS-ERR` | `Error.cause`, typed classes with a code, one classifier, catch discipline, boundary validation. |
| `cli-contract.md` | `TS-CLI` | Exit codes, stream discipline, machine-output modes. Mostly preservation, and pinned like the Python one. |
| `extension-host.md` | `TS-HOST` | VS Code and Electron: activation, disposal, webview boundary, workspace trust, esbuild constraints. 40.8k LOC and the fleet's largest smell concentration. |
| `browser.md` | `TS-WEB` | React/Vue/Vite: error surface, DOM sinks, generated RPC boundary, CSP delivery. Sized honestly — three rules now, more if the SPAs enter scope. |
| `security.md` | `TS-SEC` | Untrusted input, injection, path containment, prototype pollution, ReDoS, secrets, trojan-source. |
| `testing.md` | `TS-TEST` | Three runners, faking an API with no test-double package, fail-closed gate tests, determinism. |
| `observability.md` | `TS-OBS` | Logging channel per runtime, stack preservation, locale and clock determinism. |

`TS-CORE` lives in the index. `TS-CFG` and `TS-PKG` live in
`rules/typescript-packaging.md`, not here — they are the manifest-and-config
file's content, and splitting `TS-CFG` across both files would put the
strictness floor somewhere it never loads.

Unchanged from the frame: `bundles/typescript-essentials.toml` with members
carrying no tag, `docs/typescript-{quality,packaging,essentials}.md` as
per-package description companions, and `assets/lore-typescript.svg`, which
already exists.
