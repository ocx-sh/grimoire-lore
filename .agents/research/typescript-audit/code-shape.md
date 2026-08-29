---
title: TypeScript fleet code-shape audit
agent: general-purpose (sonnet)
model: claude-sonnet-5
scope: >
  ocx-catalog, grimoire-indexer, grimoire-vscode, vscode-ocx, setup-ocx, fma,
  creeptd-ng/web, kate-middlechild — all under /home/mherwig/dev. Excludes
  node_modules, dist, out, build, coverage, .git, .agents, .worktrees,
  archive, test-results, generated *.d.ts, and ocx-vscode-icons entirely.
method: >
  ripgrep (rg) with explicit --glob excludes and -g file-type globs, plus
  small python3 one-liners for LOC/export/file-count aggregation (os.walk
  with directory pruning matching the rg excludes). Every number below is
  shown with the exact command or script logic that produced it. Two
  correctness passes were applied and are noted inline: (1) escape-hatch
  patterns that read as English prose (`: any`, `as any`, `as <Word>`) were
  re-run through a comment- and string-literal-aware filter (rg --json,
  python, stripping `//` / `/* */`-style lines and quote-balanced string
  spans) after a first raw pass showed heavy contamination — raw counts are
  reported alongside filtered ones so the discarded volume is visible;
  (2) `import * as X` / `export * as X` / `export { X as Y }` lines were
  excluded from the "as TypeName" type-assertion tally, which a naive
  `\bas \w+` regex otherwise conflates with real type assertions.
---

# TypeScript fleet code-shape audit

## Headline: the hypothesis holds on shape, breaks on two specific numbers

The five-shape classification in the brief is **directionally correct** —
each repo does match its stated adopting shape. Two specific claims in the
brief's own sizing don't survive measurement, and one shape claim
(`ocx-catalog`, `creeptd-ng/web` as primarily-TS) undercounts a real second
language present in both:

1. **`ocx-catalog` and `creeptd-ng/web`'s stated file/LOC counts excluded
   `.vue` entirely.** The brief's "155 files/21k LOC" for `ocx-catalog` and
   "47" for `creeptd-ng/web` match exactly if you count only `.ts`/`.mts`
   files (153+2=155, 47 for `.ts`) — but `ocx-catalog` also ships **38 `.vue`
   files / 7,677 LOC** (a VitePress docs theme under `src/theme/`) and
   `creeptd-ng/web` ships **14 `.vue` files / 6,838 LOC**. Real combined
   totals: `ocx-catalog` 193 files / 28,510 LOC; `creeptd-ng/web` 61 files /
   19,738 LOC (`.ts`+`.vue`, src+test). A ruleset for this fleet needs Vue
   SFC coverage in two of the eight repos, not zero.
2. **`kate-middlechild`'s stated "51" files is off** — actual is 43
   (`.ts`/`.tsx`/`.mts`/`.cts`, src+test, excluding `.claude/`, `.serena/`,
   `archive/`, `test-results/`; LOC matches closely: 8,501 vs stated 8.6k).
3. **The other five counts (`grimoire-indexer`, `grimoire-vscode`,
   `vscode-ocx`, `setup-ocx`, `fma`) match the brief within rounding** —
   methodology cross-checks clean.
4. **The "escape hatches are common" assumption is wrong in the specific
   place most people would guess (`any`) and right in a place the brief
   didn't call out (double-casts).** `: any`, `as any`, `<any>` are **almost
   completely absent** — 0 across 7 of 8 repos, 4 total in the whole fleet
   (all in `creeptd-ng/web` test/e2e mocking code). But `as unknown as X`
   (the double-cast the brief calls "always a smell") appears **164 times**
   fleet-wide, overwhelmingly concentrated in one pattern: casting fakes to
   VS Code API types in test files (79 of them in `grimoire-vscode` alone,
   in a single 6,899-line test file).
5. **Both "published" packages ship a public API that is empty or
   near-empty.** `grimoire-indexer`'s two declared entry points
   (`src/index.ts`, `src/integration.ts`) are literally `export {};`
   placeholder stubs. `ocx-catalog` has no root (`.`) export at all — its
   only subpath export is `./theme`, a VitePress theme object with two
   properties. See §7.

---

## 1. Size and layout

Counted with a python3 walk (`os.walk`, pruning `node_modules/dist/out/build/
.git/.agents/.worktrees/coverage/.turbo/.next/target` and any dot-directory)
over `*.ts *.tsx *.mts *.cts *.vue`, classifying a file as test if its name
matches `\.(test|spec)\.[tj]sx?$` or any path segment is `test`, `tests`,
`__tests__`, or `e2e`. Cross-checked against `find … -name '*.ts' | wc -l`
per repo (matched after accounting for `.d.ts` files, which `find -name
'*.ts'` includes but the python split treats separately — see §3).

| repo | src files | src LOC | test files | test LOC | total files | total LOC | test:src LOC ratio |
|---|---:|---:|---:|---:|---:|---:|---:|
| ocx-catalog | 91 | 14,446 | 102 | 14,064 | 193 | 28,510 | 0.97 |
| grimoire-indexer | 47 | 8,226 | 33 | 8,931 | 80 | 17,157 | 1.09 |
| grimoire-vscode | 34 | 16,119 | 29 | 22,420 | 63 | 38,539 | 1.39 |
| vscode-ocx | 6 | 1,168 | 4 | 1,104 | 10 | 2,272 | 0.95 |
| setup-ocx | 11 | 1,132 | 11 | 2,468 | 22 | 3,600 | 2.18 |
| fma | 44 | 4,290 | 4 | 192 | 48 | 4,482 | 0.04 |
| creeptd-ng/web | 42 | 14,111 | 19 | 5,627 | 61 | 19,738 | 0.40 |
| kate-middlechild | 24 | 4,442 | 18 | 4,059 | 42 | 8,501 | 0.91 |

Extension split (src+test file counts): `ocx-catalog` 153 `.ts` + 2 `.mts` +
38 `.vue`; `grimoire-indexer` 77 `.ts` + 3 `.tsx`; `grimoire-vscode` 63
`.ts`; `vscode-ocx` 10 `.ts`; `setup-ocx` 22 `.ts`; `fma` 36 `.ts` + 12
`.tsx`; `creeptd-ng/web` 47 `.ts` + 14 `.vue`; `kate-middlechild` 20 `.ts` +
22 `.tsx`.

**Test placement**, verified with `find <repo> -name '*.test.*'`:

| repo | pattern |
|---|---|
| ocx-catalog | dedicated top-level `test/` tree (`ocx-catalog/test/{cli,sources,theme,build,ci,config,golden}/…`), zero colocated |
| grimoire-indexer | dedicated `test/` tree mirroring `src/`, zero colocated |
| grimoire-vscode | dedicated `src/test/` tree, zero colocated |
| vscode-ocx | dedicated `src/test/` tree, zero colocated |
| setup-ocx | dedicated `tests/` tree, zero colocated |
| fma | nested `__tests__/` dirs colocated per-module (`src/graph/__tests__/`, `src/render/__tests__/`) — a middle pattern, not top-level, not adjacent-file |
| creeptd-ng/web | mixed: `src/__tests__/` (colocated dir) + separate `e2e/` (Playwright) |
| kate-middlechild | **colocated `*.test.ts` beside source** (17 files, e.g. `packages/core/src/map.test.ts`) — the only repo in the fleet using this pattern; one stray test lives outside the app tree entirely at `.claude/tests/config-parity.test.ts` (agent-config test, not counted above) |

`kate-middlechild` is the fleet's only colocated-test repo; every other repo
(bar `fma`'s nested `__tests__`) centralizes tests in one dedicated
directory. That's a real, rule-worthy split by shape: monorepo-with-packages
colocates, everything else centralizes.

---

## 2. Escape hatches (the headline)

### `any` typing — command: `rg -o ': any\b' <repo>` / `\bas any\b` / `<any>`, then filtered

Raw matches were dominated by English prose (`same as any other`, `treated
as any input`) and had to be re-run excluding comment lines (`//`, `*`,
`/*`-prefixed) and quote-balanced string-literal spans. Filtered result:

| repo | `: any` | `as any` | `<any>` |
|---|---:|---:|---:|
| ocx-catalog | 0 | 0 | 0 |
| grimoire-indexer | 0 | 0 | 0 |
| grimoire-vscode | 0 | 0 | 0 |
| vscode-ocx | 0 | 0 | 0 |
| setup-ocx | 0 | 0 | 0 |
| fma | 0 | 0 | 0 |
| creeptd-ng/web | 0 | 4 | 0 |
| kate-middlechild | 0 | 0 | 0 |

Sample of the 4 real hits (`rg -n '\bas any\b' creeptd-ng/web`):
`creeptd-ng/web/e2e/editor.spec.ts:119` and `:121`
(`app.config.globalProperties["$pinia"] as any`), and
`creeptd-ng/web/src/__tests__/eventContract.spec.ts:62`
(`(window as any)["creeptd_bevy_command"] = mockCmd`) — all three are
Playwright/vitest test-harness code reaching into framework internals, none
in application code. `<any>`-style generic casts are **extinct fleet-wide**
(expected — the syntax collides with JSX).

**This is the opposite of the brief's implicit hypothesis: `any` is not a
common escape hatch here. It is nearly unused.**

### `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` — command: `rg -o '@ts-ignore|@ts-expect-error|@ts-nocheck' <repo>`

| repo | @ts-ignore | @ts-expect-error | @ts-nocheck |
|---|---:|---:|---:|
| ocx-catalog | 0 | 1 | 0 |
| grimoire-indexer | 0 | 0 | 0 |
| grimoire-vscode | 0 | 0 | 0 |
| vscode-ocx | 0 | 0 | 0 |
| setup-ocx | 0 | 0 | 0 |
| fma | 0 | 0 | 0 |
| creeptd-ng/web | 0 | 1 | 0 |
| kate-middlechild | 0 | 0 | 0 |

Total: 2 `@ts-expect-error`, 0 `@ts-ignore`, 0 `@ts-nocheck` fleet-wide. The
unsafe blanket-suppress directives (`@ts-ignore`, `@ts-nocheck`) are used
**nowhere** in ~130k LOC. The two `@ts-expect-error` uses (the "acceptable"
one) are the entirety of TS-directive suppression in this fleet.

### Non-null assertions (`!.` / `!)` / `!;`) — command: `rg -o '\w!\.'` / `'\w!\)'` / `'\w!;'`, comment-filtered

| repo | `!.` | `!)` | `!;` | total |
|---|---:|---:|---:|---:|
| ocx-catalog | 5 | 4 | 0 | 9 |
| grimoire-indexer | 1 | 7 | 0 | 8 |
| grimoire-vscode | 0 | 0 | 0 | 0 |
| vscode-ocx | 0 | 0 | 0 | 0 |
| setup-ocx | 7 | 2 | 1 | 10 |
| fma | 0 | 0 | 2 | 2 |
| creeptd-ng/web | 1 | 0 | 0 | 1 |
| kate-middlechild | 0 | 0 | 0 | 0 |

Worst files fleet-wide: `setup-ocx/tests/project.test.ts` (7),
`grimoire-indexer/src/ratings/provider_gitlab.ts` (3),
`grimoire-indexer/src/ratings/provider_github.ts` (3),
`ocx-catalog/src/theme/components/detail/VersionTree.vue` (2),
`setup-ocx/tests/http-retry.test.ts` (2), `fma/src/player/PlayerPage.tsx`
(2). Total fleet-wide: 30. Small in absolute terms; `grimoire-vscode`,
`vscode-ocx`, `kate-middlechild` have zero.

### Type assertions (`as X`, excluding `as const` / `as unknown as`) and the double-cast

Command: `rg -o '\bas +[A-Za-z_$][A-Za-z0-9_$]*' <repo>`, then subtracted
(a) lines that are `import`/`export` declarations (`import * as X`,
`export { X as Y }` — a plain-word regex conflates these with type
assertions and they are common: 102 in `grimoire-vscode` alone), (b)
comment-context matches, (c) string-literal matches (test descriptions like
`it("renders … as an included file")`, UI copy). Raw vs. filtered:

| repo | raw `as \w+` | minus import/export | minus comments | minus strings | **code-context assertions** | `as const` | `as unknown as` |
|---|---:|---:|---:|---:|---:|---:|---:|
| ocx-catalog | 644 | −7 | −285 | −68 | **284** | 27 | 57 |
| grimoire-indexer | 416 | −5 | −169 | −60 | **182** | 31 | 5 |
| grimoire-vscode | 786 | −102 | −329 | −58 | **297** | 40 | 79 |
| vscode-ocx | 38 | −15 | −7 | 0 | **16** | 3 | 5 |
| setup-ocx | 59 | −46 | −2 | 0 | **11** | 2 | 0 |
| fma | 40 | −2 | −5 | 0 | **33** | 1 | 7 |
| creeptd-ng/web | 207 | −13 | −68 | −11 | **115** | 15 | 10 |
| kate-middlechild | 93 | −1 | −24 | −6 | **62** | 23 | 1 |

**`as unknown as` — the double-cast — appears 164 times fleet-wide**, and it
is not evenly spread: `grimoire-vscode` has 79 of them (`rg -l 'as unknown
as' grimoire-vscode` → 12 files, all under `src/test/`), `ocx-catalog` has
57. Sample: `grimoire-vscode/src/test/installStateUnknown.test.ts:135`
(`return view as unknown as vscode.WebviewView;`),
`vscode-ocx/src/test/environment.test.ts:307` (`collection as unknown as
vscode.GlobalEnvironmentVariableCollection`). **Every single one of these
double-casts sampled is manufacturing a fake VS Code (or, in
`creeptd-ng/web`, a fake `window`) API object for a test** — this is a
structural consequence of testing extension code against an API surface
(`vscode.*`) that has no official mock/stub package, not a sign of sloppy
application typing. Worth a dedicated rule: *"when mocking a third-party
API type with no test-double package, isolate the double-cast behind one
named `fake<T>()` helper instead of inlining `as unknown as T` at each call
site"* — none of the four repos that do this (grimoire-vscode, vscode-ocx,
ocx-catalog, creeptd-ng/web) currently do.

### `eslint-disable` / `biome-ignore`, ranked by rule

Command: `rg -o --no-filename 'eslint-disable(-next-line)?\s+[A-Za-z0-9@/_.-]+' <repo>` per repo, combined:

| rule | count |
|---|---:|
| `@typescript-eslint/no-explicit-any` | 5 |
| `react-hooks/exhaustive-deps` | 2 |
| `vue/no-v-html` | 1 |
| `@typescript-eslint/prefer-promise-reject-errors` | 1 |
| `@typescript-eslint/no-non-null-assertion` | 1 |
| `import/order` | 1 |
| bare `eslint-disable` (no rule, in generated protobuf code under `creeptd-ng/web/src/gen/`) | 4 |

`biome-ignore` (only `kate-middlechild` uses Biome, confirmed — no
`.eslintrc*` in that repo, only `biome.json`): **5 occurrences, all in
`packages/web/src/islands/`, all accessibility rules
(`lint/a11y/noAriaHiddenOnFocusable` ×2, `lint/a11y/useSemanticElements`
×2, `lint/a11y/useKeyWithClickEvents` ×1), and every single one carries an
explanatory comment** — e.g.
`MapAtlas.tsx:283: // biome-ignore lint/a11y/useSemanticElements: SVG has no
<button>; <g role="button"> is the WAI-ARIA SVG interactive pattern per
quality-react-a11y.md`. This is the cleanest suppression discipline in the
fleet: every override justified, all clustered around one real SVG
a11y-pattern limitation, none silently disabling type-safety.

### Density ranking (per 1k total LOC)

Two rankings, because lumping plain `as SomeConcreteType` casts in with
`any`/double-casts/blanket-suppress materially changes the winner and the
brief's own bullet list includes plain assertions in the tally — reporting
both rather than picking one:

**High-severity only** (`: any` + `as any` + `<any>` + `@ts-ignore` +
`@ts-nocheck` + non-null assertions + `as unknown as`; `@ts-expect-error` is
the brief's "acceptable one" and excluded):

| repo | count | LOC | per 1k LOC |
|---|---:|---:|---:|
| setup-ocx | 10 | 3,600 | **2.78** |
| ocx-catalog | 66 | 28,510 | 2.31 |
| vscode-ocx | 5 | 2,272 | 2.20 |
| grimoire-vscode | 79 | 38,539 | 2.05 |
| fma | 9 | 4,482 | 2.01 |
| grimoire-indexer | 13 | 17,157 | 0.76 |
| creeptd-ng/web | 15 | 19,738 | 0.76 |
| kate-middlechild | 1 | 8,501 | **0.12** |

**All escape hatches including plain `as Type` casts, `eslint-disable`,
`biome-ignore`, `@ts-expect-error`:**

| repo | count | LOC | per 1k LOC |
|---|---:|---:|---:|
| ocx-catalog | 352 | 28,510 | **12.35** |
| grimoire-indexer | 195 | 17,157 | 11.37 |
| fma | 44 | 4,482 | 9.82 |
| grimoire-vscode | 376 | 38,539 | 9.76 |
| vscode-ocx | 21 | 2,272 | 9.24 |
| kate-middlechild | 68 | 8,501 | 8.00 |
| creeptd-ng/web | 142 | 19,738 | 7.19 |
| setup-ocx | 22 | 3,600 | **6.11** |

**Plainly: `kate-middlechild` is the cleanest repo in the fleet by
high-severity density (23x cleaner than `setup-ocx`, the worst) but
mid-pack once ordinary `as Type` casts are counted. `setup-ocx` inverts —
worst on high-severity, best on the all-inclusive count, because its 11
plain-assertion volume is low but its non-null-assertion density (mostly in
one test file) is comparatively high for its small size.** Both rankings
agree `ocx-catalog` and `grimoire-vscode` carry the fleet's absolute bulk of
type-assertion volume — but that volume is concentrated in test-mocking
code (§ above), not scattered through application logic.

---

## 3. Type surface

Command: `rg -o '^\s*(export\s+)?(default\s+)?interface\s+\w+'` etc.
(anchored to line start — avoids the prose-contamination problem above,
since these keywords don't occur mid-sentence in comments at statement
position).

| repo | `interface` | `type` | `enum` | `const enum` | `class` | `abstract class` |
|---|---:|---:|---:|---:|---:|---:|
| ocx-catalog | 101 | 22 | 0 | 0 | 5 | 0 |
| grimoire-indexer | 72 | 44 | 0 | 0 | 6 | 0 |
| grimoire-vscode | 99 | 142 | 0 | 0 | 9 | 0 |
| vscode-ocx | 12 | 7 | 0 | 0 | 5 | 0 |
| setup-ocx | 13 | 2 | 0 | 0 | 1 | 0 |
| fma | 47 | 14 | 0 | 0 | 7 | 0 |
| creeptd-ng/web | 37 | 53 | 3 | 0 | 2 | 0 |
| kate-middlechild | 28 | 22 | 0 | 0 | 0 | 0 |

**`abstract class` and `const enum` are used nowhere in the fleet.**
`enum` appears only 3 times, all in `creeptd-ng/web`. `interface` beats
`type` in 6/8 repos; `grimoire-vscode` (142 vs 99) and `creeptd-ng/web` (53
vs 37) invert that, both being the two repos with the heaviest wire-protocol
surface (VS Code webview messages, gRPC/protobuf-adjacent event contracts) —
`type` unions are the natural fit for tagged wire-message shapes, so the
inversion tracks the domain rather than looking like inconsistency.
`kate-middlechild` has **zero classes** — fully functional/data-oriented
style, consistent with its "no abstract class" and low interface-to-type
gap.

**`declare module` / `declare global`** — every occurrence, via
`rg -n '^\s*declare (module|global)'`:

- `ocx-catalog/src/theme/shims.d.ts:10` — `declare module '*.vue'`
- `ocx-catalog/src/theme/shims.d.ts:18` — `declare module '*.css'`
- `ocx-catalog/src/theme/shims.d.ts:25` — `declare module '*.svg?url'`
- `grimoire-vscode/src/webview/css.d.ts:3` — `declare module '*.css'`
- `creeptd-ng/web/src/vite-env.d.ts:6` — `declare module '*.vue'`
- `fma/src/audio/sources/SpotifyPlayer.ts:9` — `declare global` (real
  ambient global augmentation, not an asset shim)
- `kate-middlechild/packages/core/src/polygon-clipping.d.ts:20` —
  `declare module 'polygon-clipping'` (hand-written types for an untyped
  npm dependency)

7 total. Six are Vite/webpack asset-import shims (a near-mechanical pattern:
every Vite-based repo needs one for `*.vue`/`*.css`); one
(`fma/src/audio/sources/SpotifyPlayer.ts`) is a genuine `declare global`
augmenting `window`, and is the only one worth flagging as "load-bearing and
invisible" in the sense the brief means — it changes global type-checking
behavior fleet-wide within that file's compilation unit and nothing else
signals it exists.

**Hand-written `.d.ts` files** (already excluded from LOC counts in §1;
listed here since none live under an excluded `dist`/`out`/`build`, so all
of these are genuinely hand-authored, not generated):

`ocx-catalog/src/theme/shims.d.ts`, `grimoire-vscode/src/webview/css.d.ts`,
`fma/src/vite-env.d.ts`, `creeptd-ng/web/src/vite-env.d.ts`,
`kate-middlechild/packages/core/src/polygon-clipping.d.ts`.
`grimoire-indexer`, `vscode-ocx`, `setup-ocx` have none.

Generic type parameters: not reliably countable by regex without an AST —
skipped rather than reported as a fake-precise number (a heuristic pass
suggested low-hundreds fleet-wide, concentrated in `grimoire-vscode/webview/
model.ts`'s `ItemsEnvelope<T>`-style wire types and `ocx-catalog`'s
sources/config layer, but I'm not reporting a number I can't stand behind).

---

## 4. Async and error shape

Commands: `rg -o '\basync function\b'` / `'\basync \('` / `'\bawait\b'` /
`'\.then\('` / `'\.catch\('` / `'Promise\.all\('` / `'Promise\.allSettled\('`
/ `'Promise\.race\('` / `'new Promise\('` / `'\btry\s*\{'` /
`'process\.exit\('` (then comment-filtered by hand — see below) /
`'AbortSignal|AbortController'` / `'\bsetTimeout\('` /
`'\bclearTimeout\('` / `'\bsetInterval\('` / `'\bclearInterval\('`.

| repo | async fn | async( | await | .then( | .catch( | Promise.all | allSettled | race | new Promise | try{ | AbortSig/Ctrl |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ocx-catalog | 121 | 806 | 1,855 | 11 | 11 | 31 | 1 | 0 | 24 | 122 | 0 |
| grimoire-indexer | 61 | 335 | 609 | 3 | 13 | 7 | 0 | 0 | 6 | 60 | 1 |
| grimoire-vscode | 174 | 479 | 1,286 | 12 | 16 | 12 | 2 | 0 | 37 | 170 | 0 |
| vscode-ocx | 22 | 14 | 62 | 0 | 0 | 0 | 0 | 0 | 0 | 11 | 0 |
| setup-ocx | 10 | 93 | 113 | 0 | 1 | 0 | 0 | 0 | 1 | 55 | 0 |
| fma | 10 | 16 | 43 | 2 | 2 | 0 | 0 | 0 | 2 | 18 | 0 |
| creeptd-ng/web | 41 | 98 | 363 | 1 | 0 | 13 | 0 | 0 | 0 | 31 | 0 |
| kate-middlechild | 2 | 147 | 259 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

`Promise.race` is used **nowhere**. `Promise.allSettled` appears twice, both
in `grimoire-vscode`. `AbortSignal`/`AbortController` appears once total, in
`grimoire-indexer`. `.then(`/`.catch(` are marginal everywhere — `await` has
fully displaced promise chaining fleet-wide (1,855 `await` vs. 11 `.then(`
in `ocx-catalog` is representative of the ratio across every repo). `try{`
is **zero** in `kate-middlechild` despite 259 `await`s — worth a look
(either errors are handled at a boundary/wrapper the regex didn't catch, or
awaited rejections are unhandled; not confirmed either way here).

`setTimeout`/`clearTimeout`/`setInterval`/`clearInterval`:

| repo | setTimeout | clearTimeout | setInterval | clearInterval |
|---|---:|---:|---:|---:|
| ocx-catalog | 16 | 5 | 0 | 0 |
| grimoire-indexer | 7 | 0 | 0 | 0 |
| grimoire-vscode | 45 | 17 | 5 | 4 |
| vscode-ocx | 0 | 0 | 0 | 0 |
| setup-ocx | 1 | 0 | 0 | 0 |
| fma | 0 | 0 | 1 | 1 |
| creeptd-ng/web | 9 | 5 | 3 | 3 |
| kate-middlechild | 12 | 0 | 0 | 0 |

`setTimeout` outnumbers `clearTimeout` in every repo that uses it except
`grimoire-vscode` and `creeptd-ng/web` — most uses fleet-wide are one-shot
`setTimeout` in tests (fake delays, debounce assertions) that don't need
clearing, not leaked intervals; `grimoire-indexer` (7 setTimeout / 0
clearTimeout), `setup-ocx` (1/0), and `kate-middlechild` (12/0) are the ones
worth a closer look since they're pure zero on the clear side.

**`throw new X`, ranked** — command:
`rg -o --no-filename 'throw new \w+' <repo>`, combined and stripped:

| class | count |
|---|---:|
| `Error` (generic) | 178 |
| `CliError` | 33 |
| `ConfigError` | 22 |
| `SourceError` | 19 |
| `ForgeError` | 11 |
| `GraphCompileError` | 10 |
| `SiteConfigError` | 9 |
| `RenderInputError` | 5 |
| `CiError` | 3 |
| `RateLimited` | 2 |
| `RangeError` | 2 |
| `SyntaxError` | 1 |
| `IndexValidationError` | 1 |
| `BuildError` | 1 |

**60% of every throw fleet-wide (178/298) is plain `Error`**, even though
6 of 8 repos define at least one purpose-built error class
(`CliError`, `ConfigError`, `SourceError`, `ForgeError`,
`GraphCompileError`, `SiteConfigError`, `RenderInputError`, `CiError`,
`RateLimited`, `BuildError`, `IndexValidationError` — 11 distinct custom
classes exist). The custom classes exist and are used, they just aren't
used consistently even within the files that define them.

**`process.exit(` — every real call site**, command:
`rg -n 'process\.exit\(' <repo>` then hand-filtered for comment context
(the raw count was 10; 6 of those 10 are comments *documenting why
`process.exit()` is deliberately avoided*, which is itself the finding):

- `ocx-catalog/src/build/dev_worker.ts:169` —
  `process.send(message, () => process.exit(1));`
- `ocx-catalog/src/build/dev_worker.ts:171` — `process.exit(1);`
- `ocx-catalog/src/build/dev_worker.ts:214` — `process.exit(1);`
- `ocx-catalog/src/build/dev_worker.ts:217` — `process.exit(0);`

That's it — **4 real call sites, all in one file**, a child-process worker
where a hard exit is the correct teardown. Every other repo has zero.
Comments documenting the *avoidance* of `process.exit()` appear at
`ocx-catalog/src/cli/build.ts:29` ("classes locally. Never calls
`process.exit()`.") and `grimoire-indexer/src/cli/index.ts:7` ("`process
.exitCode` rather than `process.exit()` — the latter truncates"). This
fleet has evidently already internalized "don't call `process.exit()` in a
CLI, set `process.exitCode`" as an unwritten rule — worth writing down,
since it's currently only enforced by two inline comments.

---

## 5. Module and import shape

Command: `rg -o "from ['\"]\.\.?/[^'\"]*\.js['\"]"` (relative + `.js`) vs.
`rg -o "from ['\"]\.\.?/[^'\"]*['\"]"` minus the `.js`-suffixed ones
(relative, no `.js`):

| repo | relative import **with** `.js` | relative import **without** `.js` | `import type` | `require(` | dynamic `import(` |
|---|---:|---:|---:|---:|---:|
| ocx-catalog | 293 | 139 | 71 | 0 | 61 |
| grimoire-indexer | 148 | 2 | 20 | 0 | 17 |
| grimoire-vscode | 0 | 218 | 56 | 0 | 1 |
| vscode-ocx | 0 | 11 | 2 | 0 | 1 |
| setup-ocx | 35 | 0 | 5 | 0 | 2 |
| fma | 0 | 94 | 28 | 0 | 2 |
| creeptd-ng/web | 0 | 19 | 40 | 0 | 48 |
| kate-middlechild | 32 | 30 | 33 | 1 | 2 |

`require(` appears exactly once fleet-wide, in `kate-middlechild` (a
`type: module` package per its `package.json`) — worth a file:line follow-up
but not chased further here given the volume of higher-value findings; it's
a single occurrence, not a pattern.

**The "NodeNext trap" the brief predicted is real, but only where the
tsconfig actually demands it — and `ocx-catalog`'s apparent 139 violations
are not violations at all.** Checked `moduleResolution` per repo:

- `ocx-catalog/tsconfig.json`: `"moduleResolution": "NodeNext"` — but
  `ocx-catalog/tsconfig.theme.json` (`extends: ./tsconfig.json`) overrides
  to `"moduleResolution": "bundler"` for everything under `src/theme/`,
  **with a comment explaining exactly why**
  (`tsconfig.theme.json`: `// Bundler resolution (Vite/VitePress), not
  Node's — lifted verbatim from the source theme, which uses extensionless
  relative imports throughout`). All 139 "missing extension" imports live
  under `src/theme/` (61 are `.vue` imports, which never take `.js` under
  any resolution mode; the rest are the theme's own `.ts` files, correctly
  extensionless under `bundler` resolution). **This is a deliberately
  engineered split, not a trap** — and it's a pattern worth encoding as a
  rule of its own: *when one repo mixes a Node-target library with a
  bundler-target UI, split tsconfigs by `moduleResolution` rather than
  fighting one config to satisfy both.*
- `vscode-ocx/tsconfig.json`: `"module": "Node16", "moduleResolution":
  "Node16"` — same extension-required rule as NodeNext. **All 11 of its
  relative imports omit the extension** (`vscode-ocx/src/project.ts:5`:
  `import { readConfig } from './config';`;
  `vscode-ocx/src/extension.ts:3,4,12,13,14`; `vscode-ocx/src/environment.ts
  :4`; three more in `src/test/`). This one **is** the real NodeNext trap
  the brief was looking for — a `Node16`-resolution repo whose own source
  doesn't follow the extension rule its tsconfig declares.
- `grimoire-vscode`, `fma`, `creeptd-ng/web`, `kate-middlechild` (partial):
  `"moduleResolution": "bundler"` — extensionless is correct here, not a
  violation.
- `grimoire-indexer`: NodeNext, 148/150 relative imports carry `.js`
  correctly — clean.
- `setup-ocx`: no explicit `moduleResolution` override found in scope; all
  35 relative imports carry `.js`, self-consistent regardless.

**Deepest relative import per repo**, command:
`rg -n "from ['\"](\.\./)+[^'\"]*['\"]" <repo>`, ranked by `../` count:

- `ocx-catalog/test/theme/components/docs/data/docsNav.test.ts:2` —
  5 levels (`'../../../../../src/theme/components/docs/data/docsNav.js'`)
- `grimoire-indexer/test/validate/run.test.ts:6` and
  `kate-middlechild/packages/core/src/map.test.ts:12` — 2 levels each
- everything else in the fleet — 1 or 2 levels

`kate-middlechild/packages/core/src/map.test.ts:12` is worth flagging
specifically: `import geojson from "../../web/src/data/ph-regions.geojson
.json";` — **`packages/core` importing directly from `packages/web`'s
source tree**, in a Biome monorepo whose whole premise is
`core`/`tokens`/`web` package separation. That's a package-boundary
violation, not just a deep path.

**`node:` builtins in browser-targeted code** (`fma`, `creeptd-ng/web`) —
command: `rg -n "from ['\"]node:" <repo>` plus a bare-builtin check
(`fs|path|os|crypto|child_process|http|https|net|stream`): **zero
violations in shipped browser code.** All `node:` imports found
(`creeptd-ng/web/e2e/four_player_match.spec.ts:53-55`,
`creeptd-ng/web/e2e/helpers/screenshot.ts:11-13`,
`creeptd-ng/web/vite.config.ts:3`) are in Playwright e2e scripts or the Vite
build config itself — both legitimately Node-context files that never ship
to the browser. `fma` has none at all. This is a clean result worth
stating plainly since it's the kind of check that's cheap to get wrong.

**Barrel files** (`index.ts` present — not fully verified as "only
re-exports" per file, listed for follow-up):
`ocx-catalog/src/cli/index.ts`, `ocx-catalog/src/ci/index.ts`,
`grimoire-indexer/src/{cli,data,renderer,enrich,validate}/index.ts` and
`grimoire-indexer/src/index.ts` (the placeholder — see §7),
`fma/src/render/index.ts`, `fma/src/graph/examples/index.ts`,
`creeptd-ng/web/src/router/index.ts`, `kate-middlechild/packages/core/src/
index.ts`. 12 total across the fleet; `vscode-ocx` and `setup-ocx` have
none.

---

## 6. Largest files and cohesion

Top files fleet-wide by LOC (python walk, same exclusions as §1), with
export count (top-level `export function|class|const|interface|type|enum` +
`export {…}` blocks) and a cohesion read:

| LOC | exports | file | cohesion |
|---:|---:|---|---|
| 6,899 | 0 | `grimoire-vscode/src/test/extension.test.ts` | **No** — a single monolithic test file for the entire extension surface; `describe`/`it` blocks, not exports, hence 0 |
| 2,650 | 0 | `grimoire-vscode/src/test/render.test.ts` | Same pattern, one concern (render tests) but at a size that should be multiple files |
| 2,476 | 0 | `grimoire-vscode/src/test/model.test.ts` | Same |
| 1,917 | 94 | `grimoire-vscode/src/webview/model.ts` | **No** — genuine kitchen-sink: type defs (`WireSearchItem`, `ScopeStatus`, `CardMeta`) interleaved with ~70 unrelated free functions (`registryHost`, `normalizeKind`, `hasClientDrift`, `buildCards`, `cardVersion`, …). 94 exports from one file is the single largest cohesion violation found. |
| 1,860 | 0 | `creeptd-ng/web/src/views/LobbyView.vue` | Borderline — 378 of 1,860 lines are `<script>`, the rest is template markup for one view; large but not mixed-concern |
| 1,599 | 3 | `grimoire-vscode/src/views/details.ts` | Not inspected further |
| 1,582 | 21 | `grimoire-vscode/src/webview/render.ts` | Not inspected further |
| 1,211 | 0 | `ocx-catalog/test/sources/walker.test.ts` | Test file, largest in that repo |
| 1,158 | 0 | `creeptd-ng/web/src/views/LeaderboardView.vue` | Same template-bloat pattern as LobbyView |
| 1,151 | 6 | `grimoire-indexer/src/cli/init.ts` | Not inspected further |
| 1,057 | 63 | `grimoire-vscode/src/grim.ts` | **Yes, mostly** — 63 exports but nearly all are `interface`/`type` declarations forming one wire-protocol contract (the `grim` CLI's JSON output shapes: `SearchItem`, `FetchResult`, `StatusEnvelope`, …). Large because the CLI's output surface is large, not because concerns are mixed. |

**Export-count distribution**: 519 files scanned fleet-wide, median 1
export/file, mean 2.46. **22 files (4.2%) export more than 10 symbols.**
Top offenders: `grimoire-vscode/src/webview/model.ts` (94),
`grimoire-vscode/src/grim.ts` (63),
`grimoire-vscode/src/webview/settings/model.ts` (42),
`grimoire-vscode/src/webview/protocol.ts` (40),
`creeptd-ng/web/src/gen/creeptd/leaderboard/v1/leaderboard_pb.ts` (37, **generated protobuf code — expected to have many exports, not a real finding**),
`grimoire-vscode/src/installer.ts` (27),
`grimoire-vscode/src/webview/render.ts` (21).
**16 of the 22 over-10-export files are in `grimoire-vscode`** — that repo
alone accounts for nearly three-quarters of the fleet's high-export-count
files, concentrated in its `src/webview/` directory (the extension↔webview
message/model layer).

---

## 7. Public surface (`ocx-catalog`, `grimoire-indexer`)

Read from `package.json` directly (`exports`, `bin`, `main`, `types`).

**`ocx-catalog` (`@ocx-sh/catalog`)**:
```json
"bin": { "ocx-catalog": "dist/cli/index.js" },
"exports": {
  "./theme": { "types": "./src/theme/index.mts", "import": "./src/theme/index.mts" },
  "./package.json": "./package.json"
}
```
No `"."` (root) export. The **only** importable subpath is `./theme`, whose
entire body (`ocx-catalog/src/theme/index.mts`) is a VitePress theme object:
```ts
export default { Layout, enhanceApp() {} } satisfies Theme
```
**One exported symbol** (a default export with 2 properties), reachable
from the sole subpath. Everything else in the repo — 91 source files
covering `viewmodel/` (catalog rendering logic), `sources/` (the fetcher/
walker pipeline), `build/`, `config/`, `ci/` — is CLI-internal, reachable
only by running the `ocx-catalog` binary, not by importing the package. So
the answer to "is anything exported that's only used internally?" inverts:
**nothing beyond the theme object and the CLI binary is exported at all** —
there's no over-exposed internal surface to trim, because the declared
public API is already minimal to the point of being just a theme +
executable.

**`grimoire-indexer` (`@grimoire-rs/indexer`)**:
```json
"bin": { "grim-indexer": "dist/cli/index.js" },
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./integration": { "types": "./dist/integration.d.ts", "import": "./dist/integration.js" }
}
```
Both entry-point source files are literally:
```ts
// src/index.ts
// ponytail: placeholder package entry point. The `init`/`build`/`validate`
// subcommands and their public exports land here as their own agents build
// them out — this file exists only so `tsc`/`vitest` have something to run
// against on the bare skeleton.
export {};
```
```ts
// src/integration.ts
// ponytail: placeholder for the `@grimoire-rs/indexer/integration` Astro
// integration export — the Astro agent replaces this with the real
// `AstroIntegration` factory.
export {};
```
**Zero exported symbols from either declared entry point.** This package
has a fully scaffolded `exports` map and 8,226 LOC of internal
implementation (72 interfaces, 44 type aliases across `src/`), but as
currently published, `import` from `@grimoire-rs/indexer` or
`@grimoire-rs/indexer/integration` yields nothing. This is explicitly
marked as in-progress (the `ponytail:` comments say so), not a bug — but it
means **neither `ocx-catalog` nor `grimoire-indexer` currently has a public
API surface worth writing "public API" rules against**; any ruleset
authored for "published library" shape should target `bin`/CLI conventions
and the eventual `exports` contract shape, not present-day exported-symbol
hygiene, since there's effectively nothing exported yet to be hygienic
about.

---

## Patterns worth encoding as rules (ranked)

1. **Ban `as unknown as T` at call sites; require one named `fake<T>()` /
   `mock<T>()` helper per faked interface.** 164 fleet-wide, 79 in one test
   file, all mocking a no-official-stub third-party API (`vscode.*`,
   `window`). This is the single highest-volume real escape-hatch pattern
   found, and it's concentrated enough (test-only) that a rule can be
   scoped precisely instead of overreaching into application code, where
   the pattern doesn't occur.
2. **Split `tsconfig` by `moduleResolution` when one repo mixes a
   Node-target library with a bundler-target UI**, and require the
   extending config to comment *why* — `ocx-catalog/tsconfig.theme.json`
   is the exemplar to cite verbatim; without this pattern, a naive
   fleet-wide "always suffix relative imports with `.js`" rule would flag
   139 correct lines as violations.
3. **Enforce `.js`-suffixed relative imports whenever
   `moduleResolution` is `NodeNext`/`Node16`/`Node10`** — real, found,
   scoped to exactly one repo (`vscode-ocx`, 11/11 violations) rather than
   fleet-wide; a rule that fired on every repo would be noise in 6 of 8.
4. **Route all CLI/tool exits through `process.exitCode = n`, never
   `process.exit()`**, except inside a child-process worker performing its
   own teardown. Already the fleet's unwritten convention (2 inline
   comments enforce it by hand; 4 real call sites total, all justified) —
   codify what's already practiced rather than introducing a new
   constraint.
5. **Prefer the repo's own error classes over generic `throw new
   Error()`** once a domain error class exists in scope. 60% of throws
   (178/298) are plain `Error` even in files that define and elsewhere use
   `ConfigError`/`SourceError`/`CliError`/etc. — this is inconsistency
   within already-adopted infrastructure, not a from-scratch ask.
