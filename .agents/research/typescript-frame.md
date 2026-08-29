---
title: TypeScript research program — frame
phase: 0
model: opus
date: 2026-08-29
---

# Frame (phase 0)

## Language and era

TypeScript 5.7+ in the fleet (`^5.7.0` floors where pinned). Research
target is current practice as of 2026-08-29 — that includes TS 5.8/5.9
(`erasableSyntaxOnly`, `nodenext` module mode for CJS), the Go port
(`tsgo` / TypeScript 7) if it has shipped, Node's stable type stripping,
and the ESM-only migration wave.

Four **runtimes**, not one, and rules must say which they bind:

| Runtime | Where | Constraint |
|---|---|---|
| Node ≥20 / ≥22.14 / ≥24 | `ocx-catalog`, `grimoire-indexer`, VS Code hosts | Three different floors in one fleet; `engines` is declared but unverified |
| Bun | `setup-ocx` (`bun scripts/build.ts`, `bun test`) | Not Node. Its test runner, bundler and `Bun.*` APIs are a separate contract |
| VS Code extension host (Electron) | `grimoire-vscode`, `vscode-ocx` | Bundled by esbuild, activation events, disposal discipline, no top-level await |
| Browser | `fma` (React), `creeptd-ng/web` (Vue), `kate-middlechild` | Vite, no `node:` builtins, bundle weight is a user-visible cost |

## The adopting codebases — five shapes, not one

Measured 2026-08-29 under `/home/mherwig/dev`, excluding `node_modules`,
`dist`, `out`, `build`, `.git`, `.agents/`, `.worktrees/`, and `*.d.ts`.

| # | Shape | Size | Character |
|---|---|---|---|
| 1 | Published ESM library + CLI, `NodeNext` | `ocx-catalog` 155 files / 21k LOC; `grimoire-indexer` 80 / 17k | `exports` maps, `publint` + `@arethetypeswrong/cli`, commander CLIs, vitest, typescript-eslint |
| 2 | VS Code extension | `grimoire-vscode` 63 / 38.5k; `vscode-ocx` 10 / 2.3k | esbuild bundle, `@vscode/test-cli` + mocha, strictest tsconfig in the fleet |
| 3 | GitHub Action on Bun | `setup-ocx` 22 / 3.6k | `@actions/*`, `verbatimModuleSyntax`, esbuild+bun build, `bun test`, node>=24 |
| 4 | Browser SPA | `fma` 48 / 4.5k (React 19, zustand, dexie, zod, WebGL); `creeptd-ng/web` 47 (Vue 3, Connect-RPC/protobuf, Pinia, Playwright) | Vite, project references, `vue-tsc` |
| 5 | Biome monorepo | `kate-middlechild` 51 / 8.6k across `core`/`tokens`/`web` | The one repo not on ESLint — Biome + lefthook + playwright |

**Not adopting:** `ocx-vscode-icons` — all 270 `.ts` files are vendored
clones (`material-clone/`, `vscode-clone/`), reference material rather
than fleet code.

## Divergences already visible before phase 1

These are the hypotheses phase 1 must confirm with counts, not accept:

- `noUncheckedIndexedAccess` is on in `grimoire-indexer`, `grimoire-vscode`,
  `vscode-ocx`, `setup-ocx` — and **off** in `ocx-catalog`, the largest
  published library.
- Module resolution splits four ways: `NodeNext`, `Node16`, `Bundler`,
  `bundler` — across repos that share code shape.
- `creeptd-ng/web` declares `@testing-library/vue`, `@vue/test-utils` and
  `jsdom` in `dependencies`, not `devDependencies`.
- Two lint stacks (ESLint flat + typescript-eslint; Biome) and two
  formatters (prettier; Biome).
- Type-aware linting: unverified whether any repo enables
  `typescript-eslint`'s type-checked configs, which is where the rules
  that catch floating promises live.

## Artifact set (what this program must converge to)

Mirrors the Rust and Python sets — see `.agents/HANDOFF.md`.

| Artifact | Glob | Why this carrier |
|---|---|---|
| `rules/typescript-quality.md` + `rules/typescript-quality/` | `**/*.ts`, `**/*.tsx`, `**/*.mts`, `**/*.cts` | Index holds non-negotiables + a task-worded routing table; depth files hold the tables |
| `rules/typescript-packaging.md` | `**/package.json`, `**/tsconfig.json` | The two names the toolchain *guarantees* — npm requires the first, `tsc` the second. Safe narrow globs |
| `bundles/typescript-essentials.toml` | — | Members carry no tag |
| `docs/typescript-*.md` + `assets/lore-typescript.svg` | — | Per-package description companions; the logo already exists |

Rule IDs are `TS-<FAMILY>-nn`, following the Python `PY-` decision: a bare
prefix belongs to exactly one rule set forever.

**Not shipping:** a linter or a formatter. typescript-eslint and Biome
exist; both prior programs decided against owning non-domain code.

## Corpus namespace

`typescript-` prefix throughout: `typescript-topic-map.md`,
`typescript-topic-map/<scout>.md`, `typescript-audit/<axis>.md`,
`typescript-<topic>.md`, `typescript-<topic>/<worker>.md`.

## Phase-1 corrections to this frame

Measured by the grounding wave; the rows above are the pre-audit hypothesis
and these override them.

- **`grimoire-index` has zero `.ts` files** and no Astro dependency. Drop it
  from the adopting set — nine repos, not ten.
- **`creeptd-ng/web` has one flat `tsconfig.json`**, not project references.
  The `tsconfig.app.json`/`tsconfig.node.json` split is `fma` only.
- **The strictness outlier is inverted.** The NodeNext library+CLI shape
  (`ocx-catalog`, `grimoire-indexer`) is the *least* strict in the fleet, not
  the most: both miss `exactOptionalPropertyTypes` and `verbatimModuleSyntax`,
  and `ocx-catalog` also misses `noUncheckedIndexedAccess`. Every app,
  extension and monorepo config has all three. The published packages are the
  laxest — the opposite of the expected gradient.
- **Type-aware linting is on in exactly 1 of 9 repos** (`setup-ocx`,
  `strictTypeChecked` + `parserOptions.project`). Everything else runs
  `tseslint.configs.recommended`, which cannot see a floating promise. Two
  repos' own AI-config files *claim* type-aware rules that are not wired.
- **`creeptd-ng/web` has a `lint` script and no ESLint config anywhere** — a
  dead gate, the same silent-pass class the Rust and Python programs
  catalogued, in a new form.
- **Six `quality-typescript.md` files already exist across the fleet** with a
  near-verbatim ban list. Phase 7 is partly a consolidation of rules that are
  already written and already duplicated, not a greenfield authoring pass.
- Exit-code discipline, VS Code disposal, and the `setup-ocx` Action contract
  are already clean — the frame expected them to be the problem. The real
  contract gaps are zero `Error.cause` fleet-wide, an error taxonomy that
  exists in the two CLIs and nowhere else, and ajv wired only into tests while
  the runtime parse path is hand-rolled.

## Era, settled from the registry (2026-08-29)

The canonical and codified scouts disagreed about which TypeScript is
current. Resolved against the npm registry rather than either narrative —
`npm view typescript dist-tags`:

```
latest 7.0.2      next 7.1.0-dev.20260829.1      rc 7.0.1-rc      beta 6.0.0-beta
```

TypeScript **7.0 is the current stable release**; the canonical scout's
dating (6.0 on 2026-03-23, 7.0 on 2026-07-08) stands and the codified
scout's 5.x framing is stale. Its "`erasableSyntaxOnly` needs the floor
confirmed ≥5.8" caveat is moot — most of the fleet is already past 6.

The frame's "^5.7 floors" line was wrong. Declared ranges, measured:

| Repo | `typescript` | `engines.node` |
|---|---|---|
| `grimoire-indexer` | `^6.0.3` | `>=22.14.0` |
| `grimoire-vscode` | `^6.0.3` | `>=20` + vscode `^1.96.0` |
| `vscode-ocx` | `^6.0.3` | `>=20` + vscode `^1.96.0` |
| `setup-ocx` | `^6.0.3` | `>=24` |
| `ocx-catalog` | `^5.9.3` | `>=20.19` |
| `fma` | `^5.7.2` | — |
| `creeptd-ng/web` | `^5.7.0` | — |
| `kate-middlechild` | none | — |

Lockfiles resolve `6.0.3` in the four `^6` repos and `5.9.3` elsewhere;
`ocx-catalog`'s lock still carries a stray `5.6.1-rc`. Three separate eras
are live in one fleet, and the two SPAs are two majors behind.

**Consequence for the ruleset:** write against 7.0 as current, treat 6.0 as
the fleet's working floor, and mark every rule that depends on a 6.0-or-later
default flip — because two repos will not see it. Node ≥20 is an EOL floor as
of March 2026 (codified scout, official release schedule); `ocx-catalog` and
both extensions still declare it.

## Shape 1 is not a library

`ground-shape` measured it: `grimoire-indexer/src/index.ts` and
`src/integration.ts` are literally `export {};` stubs, and `ocx-catalog`
has no root export at all — only `./theme`, a two-property VitePress
object. Nothing from either repo's source files is importable by a
consumer. Both are **CLIs with a vestigial library facade**, not published
libraries.

That demotes the packaging topic from central to peripheral: `publint` and
`attw` still matter for the `bin` shape and for the `exports` map that
exists, but a rule set organised around "we publish typed libraries" would
be serving a shape this fleet does not have. Re-read shape 1 as
*"npm-distributed CLI, ESM, NodeNext"* throughout.

Two further corrections from the same audit: `any` is essentially absent
(4 occurrences fleet-wide, 0 in seven of eight repos) — the real escape
hatch is `as unknown as T`, 164 occurrences, 79 of them in one 6,899-line
test file faking `vscode.*` objects with no shared helper. And the file
counts in this frame excluded `.vue` files: `ocx-catalog` is 193 files /
28.5k LOC and `creeptd-ng/web` is 61 / 19.7k.
