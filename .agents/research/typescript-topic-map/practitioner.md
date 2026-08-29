---
title: TypeScript practitioner-writing topic scout
corpus: influential TypeScript practitioner blogs, design notes, and RFCs (Pocock, Vanderkam, Branch, Goldberg, TS team, Sorhus, Harris, Effect/neverthrow advocacy, AI-agent-code research)
agent: scout-practitioner
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 22
scope: "Fleet: published ESM library + commander CLI (NodeNext, Node >=20/22); VS Code extension (esbuild, Electron); GitHub Action on Bun; browser SPAs (React+Vite, Vue+Vite, Connect-RPC/protobuf); Biome monorepo. TypeScript ^5.7 floor."
---

## Table of contents

- [Summary](#summary)
- [Argued positions](#argued-positions)
  1. [Bivariant method syntax is a live footgun, and TypeScript's own team defends it on purpose](#1-bivariant-method-syntax-is-a-live-footgun-and-typescripts-own-team-defends-it-on-purpose)
  2. [`erasableSyntaxOnly` reclassifies enums/namespaces/parameter-properties as a portability defect, not a style choice](#2-erasablesyntaxonly-reclassifies-enumsnamespacesparameter-properties-as-a-portability-defect-not-a-style-choice)
  3. [`nodenext` is the correct moduleResolution for library authors even when consumers use a bundler](#3-nodenext-is-the-correct-moduleresolution-for-library-authors-even-when-consumers-use-a-bundler)
  4. [TypeScript for apps, JSDoc for libraries — Rich Harris's library/app split inverts the default advice](#4-typescript-for-apps-jsdoc-for-libraries--rich-harriss-libraryapp-split-inverts-the-default-advice)
  5. [Typed linting is worth its performance cost — and no Rust-based linter can currently replace it](#5-typed-linting-is-worth-its-performance-cost--and-no-rust-based-linter-can-currently-replace-it)
  6. [Typed-error libraries (Result types, Effect) are contested: explicit unions vs. ecosystem risk and unfamiliarity](#6-typed-error-libraries-result-types-effect-are-contested-explicit-unions-vs-ecosystem-risk-and-unfamiliarity)
  7. [Pure ESM is the recommended terminus; dual CJS/ESM publishing is a transitional tax, not a stable target](#7-pure-esm-is-the-recommended-terminus-dual-cjsesm-publishing-is-a-transitional-tax-not-a-stable-target)
  8. [`any` should be banned by lint rule, then re-admitted only at two narrow, deliberate sites](#8-any-should-be-banned-by-lint-rule-then-re-admitted-only-at-two-narrow-deliberate-sites)
  9. [Runtime TypeScript support across Node/Bun/Deno has diverged into three different contracts, not one](#9-runtime-typescript-support-across-nodebundeno-has-diverged-into-three-different-contracts-not-one)
  10. [AI-generated code makes the type checker a correctness gate, not a style gate](#10-ai-generated-code-makes-the-type-checker-a-correctness-gate-not-a-style-gate)
- [Candidate topics](#candidate-topics)
- [Sources](#sources)

## Summary

- Method-shorthand object properties (`{ f() {} }`) are secretly bivariant in their parameters; arrow-function properties (`{ f: () => {} }`) are correctly contravariant under `strictFunctionTypes` — this is a real, silent unsoundness hole most teams don't lint for. [Pocock](https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful)
- TypeScript's team defends bivariance, loose excess-property checks, and parameter-arity slack as *deliberate* usability trades, not oversights — each has a named idiomatic JS pattern it protects. [TS FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ)
- TS 5.8's `--erasableSyntaxOnly` turns enums, runtime namespaces, and constructor parameter-properties into compile errors, foreshadowing a TC39 "types as comments" future and matching Node's native type-stripping constraints exactly. [Pocock](https://www.totaltypescript.com/erasable-syntax-only) / [Node docs](https://nodejs.org/api/typescript.html)
- For a fleet with a runtime GitHub Action on Bun: Node strips types with zero type-checking and rejects enums/namespaces/decorators outright; Bun strips types (also zero type-checking) but *does* accept enums/namespaces; Deno is the only one of the three that runs a real type-check by default. Treat "runs under Bun" and "is standards-portable TS" as two different claims. [Node docs](https://nodejs.org/api/typescript.html) / [jsmanifest](https://jsmanifest.com/typescript-type-stripping-node-bun-deno)
- Andrew Branch's position: `nodenext` is the right `moduleResolution` for library authors, even bundler-only ones — it's the only setting that stops you emitting ESM specifiers that work in bundlers but crash under real Node resolution. [Branch](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/)
- Rich Harris's counter-current position: for *library* code specifically, skip TypeScript source files and author in JSDoc-annotated `.js` — full type-checking and consumer `.d.ts` output, zero build-tool dependency. He explicitly does not extend this to application code. This directly inverts "always author in `.ts`" and is exactly the kind of app/library split this fleet's shapes force a decision on. [devclass](https://www.devclass.com/development/2023/05/11/typescript-is-not-worth-it-for-developing-libraries-says-svelte-author-as-team-switches-to-javascript-and-jsdoc/1630004)
- Sindre Sorhus's stance, now the ecosystem default: ship pure ESM, not dual CJS/ESM — ESM can `import` CJS, but CJS cannot synchronously `import` ESM, so dual publishing buys temporary compatibility at permanent maintenance cost. `type-fest` v5+ now hard-requires ESM + TS ≥5.9 + `strict: true`. [Sorhus gist](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) / [type-fest](https://github.com/sindresorhus/type-fest)
- Typed (type-aware) ESLint rules — `no-floating-promises`, `no-unsafe-member-access`, `unbound-method` — catch a bug class syntax linters structurally cannot see, at a cost typescript-eslint states outright: "typed linting will slow your linting down to roughly the speed of type checking your project." No Rust-based linter (oxlint, Biome) has closed this gap as of 2026; the stated workaround is running both in tandem. [typescript-eslint](https://typescript-eslint.io/blog/typed-linting/) / [Goldberg](https://www.joshuakgoldberg.com/blog/rust-based-javascript-linters-fast-but-no-typed-linting-right-now/)
- Typed-error libraries are a genuinely unresolved argument, not a settled best practice: pro-Result-type writers call `throw` a "rage quit" that loses type guarantees; a more skeptical Effect user concludes Result libraries "aren't part of the language," don't have enough ROI to mandate org-wide, and invokes CoffeeScript/Flow as cautionary tales for betting on TypeScript's ecosystem centrality over library-specific paradigms. [Sólberg](https://www.solberg.is/neverthrow) vs [davidmyno.rs](https://davidmyno.rs/blog/typed-errors-and-effect/)
- Dan Vanderkam's 2025 read: the compiler's Go rewrite (~10x speedup) and Node's native TS execution are the two events that mattered; language-feature output was deliberately quiet. He still warns Node's native execution "doesn't do type checking" — it only strips — so a separate `tsc`/CI gate remains mandatory even on Node ≥22.18. [Vanderkam](https://effectivetypescript.com/2025/12/19/ts-2025/)
- TypeScript 5.9 stabilizes `--module node20` (frozen behavior, unlike the still-evolving `nodenext`) and ships a `strictInference` flag plus a redesigned `tsc --init`; it also introduces a breaking change where `ArrayBuffer` is no longer a supertype of typed-array views. Anything written against TS 5.7/5.8 defaults should be checked against this. [devblogs 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
- A cited 2025 academic result: 94% of LLM-generated compilation errors were type-check failures — the argued implication is that a type system is now catching a specific, LLM-shaped bug class (mismatched inputs/outputs, ambiguous logic) at a much higher rate than it catches human-authored bugs. Treat this as one study's number, not an industry consensus. [GitHub Blog](https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/)
- Generics vs. overloads (Pocock): overloads are for a fixed, enumerable set of input/output shapes; generics are for "pass in literally anything, get it back" — reach for overloads only when the overload count is bounded and small, otherwise the maintenance burden of "an overload for everything you can possibly imagine" wins over a single generic. [Pocock](https://www.totaltypescript.com/tips/compare-function-overloads-and-generics)
- `arethetypeswrong` (Andrew Branch et al.) exists specifically to catch dual-publish packaging mistakes (masquerading-as-CJS, false ESM, missing `exports` conditions) that `tsc` itself will not flag — this is the concrete tool this fleet's published ESM library should run in CI, not just document a `moduleResolution` choice. [attw](https://arethetypeswrong.github.io/)

## Argued positions

### 1. Bivariant method syntax is a live footgun, and TypeScript's own team defends it on purpose

**Position:** Object-literal/interface method shorthand (`{ f(x: T) {} }`) type-checks parameters *bivariantly* — TypeScript accepts assignments where the parameter type is either narrower or wider than declared. The equivalent arrow-function property (`{ f: (x: T) => void }`) is checked *contravariantly* under `strictFunctionTypes`, correctly rejecting narrower-parameter assignments. The shorthand form can produce a runtime crash that the type checker waves through.

**Who argues it:** Matt Pocock, prescriptively — recommends banning method shorthand via `@typescript-eslint/method-signature-style: property`. [totaltypescript.com](https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful)

**Reasoning:** Pocock demonstrates a concrete narrowing-then-crash scenario and states plainly that method shorthand "can result in runtime errors" that the property-syntax form would have caught.

**Strongest counter-position:** The TypeScript team itself, in its own FAQ, defends bivariant method checking as necessary to keep common idiomatic JS patterns (arrays of subtypes, callback-based APIs with narrower-than-declared handlers) from erroring out en masse — "a large number of common patterns today depend on using method bivariance." Removing it was evaluated and rejected as impractical because a trial run surfaced "hundreds of errors in longstanding code" with no correlated real-world unsoundness complaints. [TS FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ)

**Where it stands:** Not resolved as a language default — it's resolved as a *lint policy* question. Pocock's own position notes he doesn't know the design rationale; the TS FAQ supplies it independently. The practical synthesis: the tradeoff TypeScript's team accepts at the language level is exactly the tradeoff a strict team should override locally via lint rule, because a library/app codebase doesn't need the escape hatch that justified the design compromise for the whole ecosystem.

### 2. `erasableSyntaxOnly` reclassifies enums/namespaces/parameter-properties as a portability defect, not a style choice

**Position:** TypeScript 5.8's `--erasableSyntaxOnly` makes it a compile error to use any TS syntax that cannot be deleted without changing runtime behavior — concretely: `enum`, non-type-only `namespace`, and constructor parameter-properties. Node's native type-stripping enforces the identical constraint independently.

**Who argues it:** Matt Pocock, framing this as forward alignment with a TC39 "types as comments" proposal and Node's execution model. [totaltypescript.com](https://www.totaltypescript.com/erasable-syntax-only) Independently corroborated by Node's own docs, which reject the same constructs for the same reason. [nodejs.org](https://nodejs.org/api/typescript.html) Dan Vanderkam separately confirms he has "long advised against" enums/decorators/parameter-properties for this exact non-erasability reason, predating the flag. [effectivetypescript.com](https://effectivetypescript.com/2025/12/19/ts-2025/)

**Reasoning:** Non-erasable syntax requires the compiler (or Node, or a bundler) to *generate* code, not just delete annotations — this complicates every downstream tool that wants to treat "TypeScript" as "JavaScript plus comments," including a future JS runtime that strips types natively.

**Strongest counter-position:** No practitioner argues enums are fine on the merits in this corpus — the pushback that exists is pragmatic/migration-cost, not philosophical: teams with large enum surfaces face a forced choice between flipping the flag off (opt out of the safety net) or a rewrite to union types/const objects. This is a cost argument, not a correctness argument, so it's not a real counter-position, just friction.

**Where it stands:** Converging fast — three independent sources (a prescriptive blogger, an ecosystem year-in-review, and the Node runtime itself) land on the same rule for the same reason. For any fleet member that might run on bare Node ≥22.18 or wants forward compatibility, enums/namespaces/parameter-properties should be flagged now, not deferred.

### 3. `nodenext` is the correct moduleResolution for library authors even when consumers use a bundler

**Position:** Andrew Branch argues published libraries should compile against `moduleResolution: "nodenext"`, not `"bundler"`, even though most consumers run bundlers — because `nodenext` is the only setting that prevents a library author from emitting ESM specifiers that work under a bundler's laxer resolution but throw at runtime under real Node resolution.

**Who argues it:** Andrew Branch (TypeScript team, module resolution owner). [blog.andrewbran.ch](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/)

**Reasoning:** Bundler resolution is deliberately permissive (no forced file extensions, laxer `exports` matching) because bundlers can paper over ambiguity; Node cannot. A library compiled clean under `bundler` resolution is not proof it will run under Node; a library compiled clean under `nodenext` is closer to a guarantee, because `nodenext` is strictly the pickier of the two.

**Strongest counter-position:** Branch names Tim Pillard's counterpoint directly: real incompatibilities between `nodenext`-clean code and some bundler/dependency combinations do occur, so `nodenext` is not a portability *guarantee* either — it's a stricter but still incomplete check. Branch's rebuttal is that those failures require a dependency doing "something extra terrible with `exports`," i.e. a second-order failure, not typical.

**Where it stands:** Branch's position holds as the working default for library authors; his own fallback for teams that want more confidence than a single `tsconfig` setting can provide is to run `tsc --noEmit` under multiple `module`/`moduleResolution` combinations as a cross-check, and separately, to run `arethetypeswrong` against the packed tarball. Neither is optional if the goal is actually validated portability rather than a plausible one.

### 4. TypeScript for apps, JSDoc for libraries — Rich Harris's library/app split inverts the default advice

**Position:** Rich Harris (Svelte) holds that TypeScript source files are worth the tooling cost for *applications*, which already pay for a build/bundle/minify pipeline regardless — but not for *libraries*, which can ship directly as JavaScript. His alternative for libraries is JSDoc-annotated `.js`: full type-checking, full `.d.ts` generation for consumers, zero non-standard-language tooling dependency, code you can run without a build step.

**Who argues it:** Rich Harris, explaining Svelte 4's internal move off `.ts` for its own codebase. [devclass.com](https://www.devclass.com/development/2023/05/11/typescript-is-not-worth-it-for-developing-libraries-says-svelte-author-as-team-switches-to-javascript-and-jsdoc/1630004)

**Reasoning:** The cost of TypeScript is the build pipeline and tooling surface it drags in — a cost applications already absorb for other reasons (minification, bundling), so it's marginal for apps but pure overhead for a library that could otherwise run directly. Critically, Harris is explicit that Svelte's consumer-facing type experience — checking, intellisense, inline docs on exported functions — is unaffected either way.

**Strongest counter-position:** This corpus's other library-authoring voice (Branch, Sorhus) never raises JSDoc as an alternative — their concern is exclusively about `.d.ts`/module-resolution correctness once you're already authoring in `.ts`, implicitly assuming `.ts` source. No one in this corpus directly rebuts Harris; the closest tension is practical rather than argued: JSDoc-as-TypeScript loses refactor-time IDE ergonomics (rename-symbol across JSDoc comment blocks is markedly weaker than across `.ts`) and most teams' authoring habits, testing setups, and editor tooling are already `.ts`-first, making the switch cost real even if the runtime cost isn't.

**Where it stands:** A live disagreement with no winner — it's a genuine architectural choice, not a solved problem. Directly relevant to this fleet's published ESM library shape: the question "author the library in `.ts` or JSDoc-annotated `.js`" is exactly the fork Harris is describing, and this fleet's rule set should take a position rather than assume `.ts`-for-everything by default.

### 5. Typed linting is worth its performance cost — and no Rust-based linter can currently replace it

**Position:** Type-aware ESLint rules (`no-floating-promises`, `no-unsafe-member-access`, `unbound-method`, `await-thenable`) catch a bug class that is invisible to any linter without a real type checker, because they require knowing the type of a value imported from another module, not just its local AST shape. This power costs real time: typescript-eslint's own docs state typed linting runs at "roughly the speed of type checking your project."

**Who argues it:** Josh Goldberg (typescript-eslint maintainer) and the official typescript-eslint blog jointly. [Goldberg — why typed linting needs TS](https://www.joshuakgoldberg.com/blog/why-typed-linting-needs-typescript-today/) / [Goldberg — Rust linters](https://www.joshuakgoldberg.com/blog/rust-based-javascript-linters-fast-but-no-typed-linting-right-now/) / [typescript-eslint blog](https://typescript-eslint.io/blog/typed-linting/)

**Reasoning:** A real type checker is required because sophisticated TypeScript types (conditional, mapped) defeat AST-only heuristics, and cross-module type retrieval requires the compiler's program graph, not a single file's AST. Reimplementing this at native speed means either reimplementing TypeScript's type-relation APIs (a massive, continually-moving target given TypeScript's own release cadence) or paying the JS-speed cost anyway by calling into `tsc`.

**Strongest counter-position:** Rust-based linters (oxlint, Biome) are dramatically faster for everything that *doesn't* need type information, and their maintainers — per Goldberg — agree with a "run both" strategy rather than disputing the tradeoff. Oxlint's own 2025/2026 posts (oxc.rs) describe an in-progress "type-aware preview," i.e. the counter-position is actively being built out, not a settled objection.

**Where it stands:** Not a real dispute about whether typed linting is valuable — it clearly is — but an open, moving question about whether it stays TypeScript-only. As of 2026 the practical guidance is unchanged: layer a fast syntax-only linter (Biome/oxlint) with typescript-eslint's typed rules restricted to files where they earn their cost (this fleet's Biome-monorepo member should treat this as a direct design decision, not default to Biome-only).

### 6. Typed-error libraries (Result types, Effect) are contested: explicit unions vs. ecosystem risk and unfamiliarity

**Position (pro):** Returning `Result<T, E>` (neverthrow) makes every failure mode an explicit, composable part of a function's type signature; `throw` loses all type guarantees the instant it's caught, because JavaScript permits throwing any value. Throwing should be reserved for genuinely exceptional, unrecoverable cases ("a rage quit"), not routine, expected failure.

**Who argues it:** Jökull Sólberg, pro-neverthrow. [solberg.is](https://www.solberg.is/neverthrow)

**Reasoning:** Type-level guarantees on error shape let call sites exhaustively handle every documented failure and let chained operations accumulate precise error unions (e.g. `FetchError | ZodError`) instead of an opaque `catch (e: unknown)`.

**Strongest counter-position:** A more skeptical Effect user, after direct hands-on use of both neverthrow and Effect, concludes Result libraries "aren't part of the language," impose real unfamiliarity/clunkiness on a team, and don't clear the bar for mandating org-wide adoption without linter enforcement and doc investment to back it. Effect solves more (DI, observability, structured concurrency) but has a learning curve "similar to learning TypeScript" with none of TypeScript's ecosystem-centrality — the same author explicitly invokes CoffeeScript and Flow as warnings against betting a codebase on a smaller, alternative-paradigm ecosystem. [davidmyno.rs](https://davidmyno.rs/blog/typed-errors-and-effect/)

**Where it stands:** Genuinely unresolved, and both sides agree on the diagnosis (thrown errors lose type information) while disagreeing on the remedy's cost-benefit. This is exactly the kind of "when is the generic advice wrong" finding the brief is looking for: a rule set that mandates typed-error libraries fleet-wide would be taking a side in an active, credible disagreement, not codifying consensus.

### 7. Pure ESM is the recommended terminus; dual CJS/ESM publishing is a transitional tax, not a stable target

**Position:** Package authors should ship pure ESM (`"type": "module"`, no CJS build), not dual-format packages. The asymmetry — ESM can `import` CJS, CJS cannot synchronously `import` ESM — means CJS-only consumers are never fully locked out (they can `await import()`), while dual publishing forces an author to permanently maintain two build outputs and two sets of edge-case bugs for a compatibility need that keeps shrinking.

**Who argues it:** Sindre Sorhus, in the widely cited "Pure ESM package" guidance that drove much of the ecosystem's CJS→ESM migration (chalk, execa, got, and dozens of other packages). [gist](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) His own `type-fest` now hard-requires ESM, TS ≥5.9, and `strict: true` as of v5. [type-fest](https://github.com/sindresorhus/type-fest)

**Reasoning:** Maintaining a dual-format build is where most of the actual `.d.ts`/`exports`-field bugs live; going pure ESM eliminates the surface area rather than trying to get the dual build perfectly right.

**Strongest counter-position:** Not present as an argued rebuttal in this corpus — the closest tension is Andrew Branch's `nodenext`-for-libraries position, which is about correctly *resolving* module formats rather than disputing whether to ship dual formats at all. The practical counter that does exist industry-wide (not sourced to a named practitioner here) is that a published library targeting older enterprise/CJS-only consumers still has real short-term reasons to dual-publish; Sorhus's position is that this reason is temporary and shrinking, not permanent.

**Where it stands:** This is closer to settled ecosystem consensus than a live fight — Sorhus's stance is now the default recommendation most new libraries follow, with `arethetypeswrong` as the CI-enforceable check for whichever path a library picks. [attw](https://arethetypeswrong.github.io/) Directly relevant: this fleet's published ESM library target already implies picking a side here explicitly.

### 8. `any` should be banned by lint rule, then re-admitted only at two narrow, deliberate sites

**Position:** `any` disables type checking, autocomplete, and safety wholesale and should be banned via `no-explicit-any` — but Matt Pocock carves out two specific, deliberate exceptions: (1) generic constraint positions like `(...args: any[]) => any` where the wideness is the intent, not an accident, and (2) `as any` inside a generic function body where TypeScript's narrowing genuinely can't follow the logic, paired with a unit test to cover what the type system can't.

**Who argues it:** Matt Pocock. [totaltypescript.com](https://www.totaltypescript.com/any-considered-harmful)

**Reasoning:** The harm of `any` is that it's usually an *accidental* hole; both exceptions Pocock allows are cases where the looseness is declared and load-bearing, not leaked. He recommends `eslint-disable` comments at each accepted site as the enforcement mechanism, which doubles as an auditable list of every deliberate escape hatch in a codebase.

**Strongest counter-position:** Not directly rebutted in this corpus — this is closer to consensus practice (the position matches typescript-eslint's own `no-explicit-any` design, which is opt-in-per-line via disable comments by design). The disagreement space is really about where the line for "deliberate" sits, which Pocock's two examples answer more precisely than most style guides.

**Where it stands:** Settled as prescriptive guidance; the useful artifact for this fleet is the two named exception categories, since a blanket ban invites exactly the workaround Pocock is trying to avoid (undocumented `@ts-ignore` instead of an auditable `eslint-disable`).

### 9. Runtime TypeScript support across Node/Bun/Deno has diverged into three different contracts, not one

**Position:** "Runs TypeScript" now means three different things depending on runtime. Node (stable as of v25.2.0/v24.12.0) strips types with zero type-checking and hard-rejects enums, namespaces-with-runtime-code, parameter-properties, and decorators. Bun also strips types with zero type-checking, but *does* accept enums, namespaces, and decorators. Deno is the outlier: it type-checks by default (with an opt-out via `--no-check`), making it the only one of the three where "it ran" implies "it type-checked."

**Who argues it:** Synthesized from Node's own documentation plus a 2026 cross-runtime comparison (jsmanifest); not one advocacy voice but a factual divergence multiple practitioners independently document. [Node docs](https://nodejs.org/api/typescript.html) / [jsmanifest](https://jsmanifest.com/typescript-type-stripping-node-bun-deno)

**Reasoning:** Each runtime made an independent tradeoff between "run fast, strip and go" and "run correct, actually check" — Node and Bun chose speed/simplicity for execution and left type-checking to a separate `tsc`/CI step; Deno bundled the check in because it also owns the toolchain end to end.

**Strongest counter-position:** None of the three positions is "wrong" — they're different design points, and the disagreement, such as it is, is about which runtime's model belongs in a given pipeline stage (dev-loop execution vs. CI gate).

**Where it stands:** This is squarely a fleet-relevant fact, not a contested opinion: the GitHub Action member of this fleet runs on Bun, which means "the Action ran without error" carries **zero** type-safety guarantee on its own — CI must run `tsc --noEmit` (or equivalent) as a separate, explicit gate regardless of what runtime executes the Action. Enums are usable under Bun but would silently break the same code if it were later ported to run directly under Node without a build step — worth flagging explicitly given `erasableSyntaxOnly` (position 2) already argues against enums fleet-wide.

### 10. AI-generated code makes the type checker a correctness gate, not a style gate

**Position:** As more code is LLM-authored, static type systems catch a specific and disproportionately large share of the resulting bugs — a cited 2025 academic study found 94% of LLM-generated compilation errors were type-check failures specifically, and TypeScript's growth (surpassing Python/JavaScript as GitHub's most-used language by August 2025, +66% YoY contributor growth) is framed as partly driven by this AI-assisted-development dynamic.

**Who argues it:** GitHub's own engineering blog, citing external academic research and Octoverse 2025 data; quoting Cassidy Williams. [github.blog](https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/)

**Reasoning:** LLM-generated code lacks the implicit contract-awareness a human author has when writing a function — mismatched inputs/outputs and ambiguous logic are exactly the errors a type checker is built to surface, so it becomes a higher-leverage safety net specifically for AI-authored code than it was for human-authored code.

**Strongest counter-position:** Not present as a named rebuttal in this corpus, and worth flagging as a gap: this is a single vendor blog post citing a single academic study (94% figure), not a cross-validated consensus, and it comes from GitHub, which has a commercial interest in the "type systems + AI" narrative. Treat the 94% figure as one data point, not an industry-wide finding, until corroborated elsewhere. **This is the weakest-sourced position in this report and is flagged as under-researched — a second independent source for the 94% claim was not located in this pass.**

**Where it stands:** Directionally credible (matches this fleet's own premise — AI agents editing code without a human in the loop) but the specific statistic should not be repeated as settled fact without a second source.

## Candidate topics

| topic | why it matters | source | already-covered? | priority | contested? |
|---|---|---|---|---|---|
| Method-shorthand bivariance in object/interface types | Silent unsoundness hole distinct from function-type contravariance; directly lintable | [Pocock](https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful), [TS FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ) | no | high | yes |
| `erasableSyntaxOnly` / enum-namespace-parameter-property ban | Forward-compat with Node native execution and TC39 proposal; concrete lint-time enforceable rule | [Pocock](https://www.totaltypescript.com/erasable-syntax-only), [Node docs](https://nodejs.org/api/typescript.html) | partial (language evolution covered generically) | high | no |
| `moduleResolution: nodenext` vs `bundler` for library authors | Directly decides correctness of this fleet's published ESM library | [Branch](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) | no | high | yes (Pillard counterpoint) |
| `.ts` source vs JSDoc-annotated `.js` for library authoring | Inverts default TS-first assumption; live architectural fork for this fleet's library shape | [Harris/devclass](https://www.devclass.com/development/2023/05/11/typescript-is-not-worth-it-for-developing-libraries-says-svelte-author-as-team-switches-to-javascript-and-jsdoc/1630004) | no | med | yes |
| Typed vs syntax-only ESLint rule selection (perf/coverage tradeoff) | Direct decision for the Biome-monorepo fleet member | [typescript-eslint](https://typescript-eslint.io/blog/typed-linting/), [Goldberg](https://www.joshuakgoldberg.com/blog/rust-based-javascript-linters-fast-but-no-typed-linting-right-now/) | partial (tooling/CI gates covered generically) | high | no |
| `no-floating-promises` as a mandated rule vs `no-misused-promises` scope gap | Concrete async-correctness rule with documented blind spot | [typescript-eslint docs](https://typescript-eslint.io/rules/no-floating-promises/) | partial (async fundamentals covered generically) | high | no |
| Typed-error libraries (neverthrow/Effect) vs thrown exceptions | Actively contested; fleet-wide mandate would be taking an unsettled side | [Sólberg](https://www.solberg.is/neverthrow), [davidmyno.rs](https://davidmyno.rs/blog/typed-errors-and-effect/) | partial (error taxonomies covered generically) | high | yes |
| Pure ESM vs dual CJS/ESM publishing | Directly decides packaging of this fleet's library target | [Sorhus](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) | no | high | no (near-consensus) |
| `arethetypeswrong` as a CI gate for dual-format correctness | Concrete, automatable check most rule sets skip | [attw](https://arethetypeswrong.github.io/) | no | high | no |
| `any` ban with two named, auditable exceptions | Precise enough to encode as a lint policy | [Pocock](https://www.totaltypescript.com/any-considered-harmful) | partial (already covered generically as type architecture) | med | no |
| Function overloads vs generics decision rule | Bounded-vs-open-ended input/output shape as the deciding factor | [Pocock](https://www.totaltypescript.com/tips/compare-function-overloads-and-generics) | no | med | no |
| Runtime type-stripping divergence: Node vs Bun vs Deno | Directly affects fleet's Bun-hosted GitHub Action; enums usable on Bun, not portable to Node | [Node docs](https://nodejs.org/api/typescript.html), [jsmanifest](https://jsmanifest.com/typescript-type-stripping-node-bun-deno) | no | high | no |
| Node's native execution never type-checks — separate `tsc`/CI gate still mandatory | Easy to assume "runs clean" means "type-checks clean" on Node ≥22.18 | [Vanderkam](https://effectivetypescript.com/2025/12/19/ts-2025/), [Node docs](https://nodejs.org/api/typescript.html) | no | high | no |
| `--module node20` (frozen) vs `nodenext` (still evolving) for the module setting | New in 5.9; a stability-vs-currency tradeoff not yet in most guidance | [devblogs 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) | no | med | no |
| `ArrayBuffer`/TypedArray supertype breaking change (TS 5.9) | Silent new type errors on upgrade past the fleet's 5.7 floor | [devblogs 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) | no | med | no |
| `strictInference` flag (TS 5.9) | New strictness lever not yet covered by most tsconfig guidance | [devblogs 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) | no | med | no |
| `import defer` (TS 5.9 / TC39 stage) | Changes module side-effect/init-timing semantics; relevant to SPA code-splitting | [devblogs 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) | no | low | no |
| TypeScript compiler Go rewrite — downstream tooling implications | Ecosystem-wide performance shift; plugin/API compatibility risk for custom tooling | [Vanderkam](https://effectivetypescript.com/2025/12/19/ts-2025/) | no | med | no |
| `tsconfig` base for libraries vs apps (`module: NodeNext`+`declaration` vs `module: preserve`+`noEmit`) | Concrete, opinionated split this fleet needs (library + SPA members both exist) | [Pocock](https://www.totaltypescript.com/tsconfig-cheat-sheet) | partial (tooling/CI gates covered generically) | high | no |
| `noUncheckedIndexedAccess` / `noImplicitOverride` as low-cost strictness adds | Specific, low-friction flags beyond baseline `strict: true` | [Pocock](https://www.totaltypescript.com/tsconfig-cheat-sheet) | partial | med | no |
| `verbatimModuleSyntax` and forced `import type`/`export type` | Directly affects ESM/CJS interop correctness and bundler behavior | [Pocock](https://www.totaltypescript.com/tsconfig-cheat-sheet) | no | high | no |
| Excess property checks only apply to object literals, not variables | Common source of "why didn't TS catch this" confusion; TS-specific inversion of "the type system always checks structurally" | [TS FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ) | no | med | no |
| Parameter-arity variance (fewer-param functions assignable to more-param signatures) | Common source of accidental callback-signature bugs (e.g. `Array.prototype.map`) | [TS FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ) | no | med | no |
| Declaration merging as an extensibility seam vs a footgun | Named directly in the brief as boring-but-biting; not directly sourced this pass | — | no | med | unresolved (needs a source pass) |
| Module resolution `exports` conditions ordering and mis-authoring | Root cause behind most `arethetypeswrong` failures | [attw](https://arethetypeswrong.github.io/), [Branch](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) | no | high | no |
| Bundler-vs-runtime module resolution divergence (Vite/esbuild vs Node/Bun) | Directly spans this fleet's SPA and CLI/library shapes | [Branch](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/), [TS moduleResolution docs](https://www.typescriptlang.org/tsconfig/moduleResolution.html) | partial | high | no |
| Connect-RPC/protobuf-generated TypeScript — generated-code type-safety conventions | Named fleet shape (Connect-RPC/protobuf SPA); no practitioner source found this pass | — | no | med | unresolved (needs a source pass) |
| VS Code extension / Electron-host TypeScript packaging quirks (esbuild bundling, `vscode` module externals) | Named fleet shape; no dedicated practitioner argued-position source found this pass | — | no | med | unresolved (needs a source pass) |
| Type-fest-style utility-type gap-filling as policy (adopt vs hand-roll) | Concrete dependency-vs-hand-roll decision for a shared utility layer | [type-fest](https://github.com/sindresorhus/type-fest) | no | low | no |
| AI-agent-authored TS: 94%-type-errors claim (single-source, unverified) | Directly motivates this whole research program but is weakly sourced | [GitHub Blog](https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/) | no | med | yes (source itself flags as under-corroborated) |
| Date/timezone handling in TypeScript specifically (`Temporal` adoption status) | Named boring-but-biting candidate in the brief; not directly sourced this pass | — | no | med | unresolved (needs a source pass) |
| String encoding / Unicode handling TS-specific pitfalls (`.length` vs grapheme count) | Named boring-but-biting candidate; not directly sourced this pass | — | no | low | unresolved (needs a source pass) |
| Ordering determinism (`Object.keys`, `Map`/`Set` iteration order guarantees in the type system) | Named boring-but-biting candidate; not directly sourced this pass | — | no | low | unresolved (needs a source pass) |
| Resource cleanup / `using`/`Symbol.dispose` (TS 5.2+ explicit resource management) | Directly TS/JS-specific new syntax with adoption-maturity questions; not directly sourced this pass | — | no | med | unresolved (needs a source pass) |
| Cancellation patterns (`AbortSignal`-typed APIs) | Named boring-but-biting candidate; Archibald's writing was sought but not conclusively located this pass | — | no | med | unresolved (needs a source pass) |
| Idempotency and on-disk/wire format versioning in typed serialization boundaries (Zod/protobuf) | Named boring-but-biting candidate, directly relevant to the Connect-RPC SPA shape; not directly sourced this pass | — | no | med | unresolved (needs a source pass) |
| ESLint flat-config migration cost for `typescript-eslint` specifically | Josh Goldberg has spoken on this (podcast) but no dedicated blog post was located this pass | [Changelog JS Party #332](https://changelog.com/jsparty/332) | partial (tooling/CI gates covered generically) | low | no |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [totaltypescript.com/tsconfig-cheat-sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet) | Matt Pocock, prescriptive tsconfig guide | current (references TS 5.x preserve/NodeNext) | Concrete, opinionated library-vs-app tsconfig split |
| [totaltypescript.com/any-considered-harmful](https://www.totaltypescript.com/any-considered-harmful) | Matt Pocock, position essay | current | Precise, auditable exception list for `any` |
| [totaltypescript.com/method-shorthand-syntax-considered-harmful](https://www.totaltypescript.com/method-shorthand-syntax-considered-harmful) | Matt Pocock, position essay | current | Names a real, underused lint rule for a real unsoundness hole |
| [totaltypescript.com/erasable-syntax-only](https://www.totaltypescript.com/erasable-syntax-only) | Matt Pocock, feature explainer | TS 5.8 | Directly ties a compiler flag to a forward-compat argument |
| [totaltypescript.com/tips/compare-function-overloads-and-generics](https://www.totaltypescript.com/tips/compare-function-overloads-and-generics) | Matt Pocock, tip | current | Crisp decision rule (bounded vs open-ended) |
| [effectivetypescript.com/all-posts/](https://effectivetypescript.com/all-posts/) | Dan Vanderkam, blog index | 2020–2025 | Index used to select the year-in-review post |
| [effectivetypescript.com/2025/12/19/ts-2025/](https://effectivetypescript.com/2025/12/19/ts-2025/) | Dan Vanderkam, year-in-review | 2025-12-19 | Most current practitioner synthesis of what changed in 2025 |
| [blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) | Andrew Branch (TS team), position post | current | Primary source on the exact `moduleResolution` decision this fleet's library needs |
| [joshuakgoldberg.com/blog/why-typed-linting-needs-typescript-today/](https://www.joshuakgoldberg.com/blog/why-typed-linting-needs-typescript-today/) | Josh Goldberg, position post | current (notes 2025 Go rewrite) | Explains the structural reason no fast linter has typed rules yet |
| [joshuakgoldberg.com/blog/rust-based-javascript-linters-fast-but-no-typed-linting-right-now/](https://www.joshuakgoldberg.com/blog/rust-based-javascript-linters-fast-but-no-typed-linting-right-now/) | Josh Goldberg, position post | current | Names the specific rules only type-aware linting can provide |
| [typescript-eslint.io/rules/no-floating-promises/](https://typescript-eslint.io/rules/no-floating-promises/) | Official rule docs | current | States the performance tradeoff and scope limits verbatim |
| [typescript-eslint.io/blog/typed-linting/](https://typescript-eslint.io/blog/typed-linting/) | Official typescript-eslint blog | current | Official framing of the typed-linting cost/benefit case |
| [github.com/Microsoft/TypeScript/wiki/FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ) | TypeScript team, official FAQ | maintained, long-running | Authoritative "why does TS allow this unsound thing" source |
| [gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) | Sindre Sorhus, canonical ESM-migration gist | maintained since ~2021 | The single most-cited driver of ecosystem ESM migration |
| [github.com/sindresorhus/type-fest](https://github.com/sindresorhus/type-fest) | Sindre Sorhus, utility-type library README | current (v5, TS ≥5.9) | Shows current stated version/strictness requirements in the wild |
| [solberg.is/neverthrow](https://www.solberg.is/neverthrow) | Jökull Sólberg, position post | current | Clear pro-Result-type argument with concrete code examples |
| [davidmyno.rs/blog/typed-errors-and-effect/](https://davidmyno.rs/blog/typed-errors-and-effect/) | Independent practitioner, position post | current | Supplies the missing skeptical counter-position on typed errors |
| [github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/](https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/) | GitHub engineering blog | 2026 | Only located source connecting AI-generated code specifically to TS adoption, with a cited stat |
| [devclass.com — Rich Harris/Svelte JSDoc piece](https://www.devclass.com/development/2023/05/11/typescript-is-not-worth-it-for-developing-libraries-says-svelte-author-as-team-switches-to-javascript-and-jsdoc/1630004) | Trade-press writeup quoting Rich Harris directly | 2023, still-current position | Best available primary-adjacent source for Harris's library/app TS split |
| [arethetypeswrong.github.io](https://arethetypeswrong.github.io/) | Tool site (Andrew Branch et al.) | current | The concrete CI-gate tool this fleet's library packaging rules should reference |
| [devblogs.microsoft.com/typescript/announcing-typescript-5-9/](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) | Official TypeScript team release notes | 2026 (TS 5.9) | Version-specific features/breaking changes above this fleet's 5.7 floor |
| [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html) | Official Node.js docs | current, versioned stability table | Authoritative source on exactly what Node's native TS support does/doesn't do |
| [jsmanifest.com/typescript-type-stripping-node-bun-deno](https://jsmanifest.com/typescript-type-stripping-node-bun-deno) | Independent practitioner comparison | 2026 | Only located source directly contrasting all three runtimes' TS contracts |

**Corpus gaps (honest accounting):** targeted searches for Jake Archibald, Lea Verou, and Kent C. Dodds / Testing Library authors did not surface writing with an argued position specific to *typed* TypeScript code (as opposed to general JS/testing/platform advice already covered by the prior research programs) strong enough to cite here. The brief's "declaration merging," Temporal/date-time, string-encoding, ordering-determinism, `using`/resource-cleanup, cancellation, and Connect-RPC-generated-code candidates are listed above as topics worth an expert's attention but are marked unresolved — a follow-up research pass should target them directly rather than stretching this pass's sources to cover them.
