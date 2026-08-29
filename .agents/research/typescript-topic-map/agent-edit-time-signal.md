---
title: "Agent Edit-Time Signal: What a TypeScript-Editing Agent Should Check Before It Claims 'Typechecks Clean'"
corpus: typescript-topic-map
agent: scout (subagent)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 17
scope: |
  Covers: the TypeScript language-service/LSP path (tsserver, tsgo --lsp) as an
  edit-time alternative to a cold `tsc`; whether TS 7's native language service is
  reachable from a repo pinned to typescript@^6.x for typescript-eslint; machine-
  readable diagnostic output shapes per tool (tsc, ESLint, oxlint, Biome, vue-tsc);
  the LSP-scope-vs-tsc-scope divergence and the rule that follows from it.
  Does not cover: rule catalogues (already swept), build/bundler tooling, CI
  workflow design, or non-TypeScript-specific LSP/MCP servers.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [TS 7.0 is out, native, and has a real LSP — but no programmatic API until 7.1](#1-ts-70-is-out-native-and-has-a-real-lsp--but-no-programmatic-api-until-71)
   2. [`tsgo`/TS7's `tsc --lsp --stdio` is directly reachable from a TS6-pinned repo, verified live](#2-tsgots7s-tsc---lsp---stdio-is-directly-reachable-from-a-ts6-pinned-repo-verified-live)
   3. [The one footgun: the official "run side-by-side" alias silently shadows `tsc`](#3-the-one-footgun-the-official-run-side-by-side-alias-silently-shadows-tsc)
   4. [Cold `tsc` is already sub-second on every repo in this fleet — measured](#4-cold-tsc-is-already-sub-second-on-every-repo-in-this-fleet--measured)
   5. [`--incremental`/`tsBuildInfoFile` roughly halves warm reruns; tsgo beats it by ~10x anyway](#5---incrementaltsbuildinfofile-roughly-halves-warm-reruns-tsgo-beats-it-by-10x-anyway)
   6. [Machine-readable diagnostics: `tsc` has none; every other tool does](#6-machine-readable-diagnostics-tsc-has-none-every-other-tool-does)
   7. [The scope divergence: LSP checks open files, `tsc` checks the whole program](#7-the-scope-divergence-lsp-checks-open-files-tsc-checks-the-whole-program)
   8. [Embedded-language servers (Volar/vue-tsc) are stuck on TS 6.0 until 7.1](#8-embedded-language-servers-volarvue-tsc-are-stuck-on-ts-60-until-71)
   9. [typescript-language-server: a stopgap the TS team expects tsgo to supersede](#9-typescript-language-server-a-stopgap-the-ts-team-expects-tsgo-to-supersede)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- TS 7.0 shipped 2026-07-08 as a native Go port; `typescript@latest` on npm is `7.0.2` (verified via registry query 2026-08-29). It is 8x–12x faster on full builds and ships a real LSP-based language server, live at release.
- TS 7.1 has **not** shipped as of 2026-08-29 — npm's `next` dist-tag for `typescript` is `7.1.0-dev.20260829.1` (dated today), confirming the programmatic API gap wave 1 identified is still open right now, not a stale fact.
- **Verified live** (this session, not from docs): `npx tsgo --lsp --stdio` and stable `typescript@7.0.2`'s own `tsc --lsp --stdio` both start a real LSP server over stdio and return a full `initialize` capability set (`diagnosticProvider`, `hoverProvider`, etc.) — pull-diagnostics are directly available today.
- **Verified live**: `@typescript/native-preview` (bin name `tsgo`) installs alongside `typescript@^6.0.3` with **zero bin collision** — `tsc`/`tsserver` stay pointed at TS6, `tsgo` is additive. This is the correct, safe install for the fleet.
- **Verified live**: the opposite approach — aliasing `typescript@^7.0.2` under any devDependency key (per Microsoft's own migration doc) — silently overwrites `node_modules/.bin/tsc` because the bin name comes from the aliased package's own `package.json`, not the alias key. Do not use this pattern in this fleet; it is for repos migrating *to* TS7, not repos adding TS7 diagnostics on the side.
- Same diagnostic (`TS2322`, same location, same message) on the same file from `tsgo@7.0.0-dev.20260707.2` and `tsc@6.0.3` in a direct A/B test — the two compilers agree on ordinary type errors.
- **Measured on this fleet** (not from a benchmark deck): cold `tsc --noEmit` is 0.65–0.70s on vscode-ocx (10 files), 1.7–2.0s on grimoire-indexer (80 files), 0.86–0.92s on a full install of ocx-catalog (193 files, real deps). Every repo in the fleet is already sub-2-second on a cold typecheck.
- **Measured**: `tsgo --noEmit` on the same 193-file ocx-catalog checkout: 0.09s — ~10x over cold `tsc`, in line with Microsoft's published 8x–12x range.
- **Measured**: `tsc --incremental --tsBuildInfoFile` on grimoire-indexer drops 1.6–2.0s cold to 0.76–0.84s on a no-op rerun *and* on a single-file-touch rerun — roughly 2x, real but modest next to tsgo's 10x.
- `tsc` has no JSON diagnostic mode, ever (not one flag exists for it) — an agent parsing `tsc` output must line-parse `file(line,col): error TSxxxx: message`, or switch tools.
- ESLint's `-f json` (confirmed on the current docs, ESLint v10.9.1) gives per-file `messages[]` with `ruleId`, `severity` (1|2), `line`/`column`, `endLine`/`endColumn`, and machine-applicable `suggestions[].fix.range`.
- oxlint's `--format` accepts `json`, `github`, `gitlab`, `sarif`, `junit`, `checkstyle`, `unix`, `stylish`, `agent`, `default` — the `agent` format specifically targets automated consumers.
- Biome's `--reporter=json`/`json-pretty` are explicitly marked **experimental, may change in patch releases** — do not lock CI or an agent parser to their exact shape without a version pin.
- The core divergence, in Microsoft's own words (TypeScript-wiki `Performance.md`): "In most editors, like VS Code, diagnostics are requested for all open files, not the entire project." An LSP session — including `tsgo --lsp` — never proves a file that was never opened is clean.
- typescript-language-server (the community LSP wrapping classic `tsserver`) explicitly expects TS7 to supersede it: "Microsoft is working on TypeScript 7 ... that will include the LSP implementation and will hopefully supersede this project." Its current install line still pins `typescript@6`.
- Vue/Volar, MDX, Astro, Svelte, Angular template checking cannot use TS7 at all yet — Microsoft's own 7.0 announcement states this is because those tools embed the programmatic API, which TS7 doesn't expose until 7.1. `creeptd-ng/web` (Vue) is affected; the other eight repos are not.

## Findings

### 1. TS 7.0 is out, native, and has a real LSP — but no programmatic API until 7.1

TypeScript 7.0 released **2026-07-08** ([announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)) as a from-scratch Go port, structurally faithful to the original compiler ("writing new code while maintaining the structure and logic of the original codebase to keep results consistent and compatible between the two compilers"). Published speedups: **8x–12x on full builds**, with named examples VSCode 11.9x, Sentry 8.9x, Bluesky 8.7x, and editor-specific numbers: VS Code project file-open-to-first-error dropped from **17.5s to under 1.3s — "over 13x faster."** Slack reported CI type-check time dropping from 7.5 minutes to 1.25 minutes and a 40% cut in merge-queue time; Canva reported first-editor-error latency dropping from 58s to 4.8s.

The package is installed exactly like any TypeScript release — `npm install -D typescript` gets `tsc`. Confirmed on the npm registry (queried 2026-08-29): `typescript`'s `latest` dist-tag is `7.0.2`, and its `next` dist-tag is `7.1.0-dev.20260829.1` — **7.1 has not shipped as of today**, so the "no stable programmatic API" constraint established in wave 1 is current, not stale.

The `microsoft/typescript-go` staging repo is now closed — "This was the staging repo for the TypeScript 7.0 release during the native port process, which is now completed!" — development lives in `microsoft/TypeScript`, and the staging repo is scheduled for permanent archival in September 2026 ([repo README](https://github.com/microsoft/typescript-go)).

### 2. `tsgo`/TS7's `tsc --lsp --stdio` is directly reachable from a TS6-pinned repo, verified live

This is not documented in any `--help` output — `--lsp` does not appear in `tsc --help` or `tsc --help --all` on either the preview or the stable binary. It was found and verified by direct execution in this session:

```
$ npm install -D @typescript/native-preview typescript@6.0.3
$ npx tsgo --version
Version 7.0.0-dev.20260707.2
$ npx tsgo --lsp
only stdio is supported
$ npx tsgo --lsp --stdio
```

The last invocation starts a resident process that speaks LSP-over-stdio with `Content-Length` framing. Sending a minimal `initialize` request returned a full capability set — `hoverProvider`, `definitionProvider`, `referencesProvider`, `renameProvider`, `codeActionProvider`, and, most relevant here, `"diagnosticProvider":{"identifier":"typescript","interFileDependencies":true,"workspaceDiagnostics":false}` — and `serverInfo: {"name":"typescript-go","version":"7.0.0-dev.20260707.2"}`. `workspaceDiagnostics: false` means this is a **pull-per-open-document** diagnostic model, not a full-project push — see Finding 7.

The same `--lsp --stdio` invocation was re-verified against the **stable, non-preview** `typescript@7.0.2` package's own `tsc` binary, with an identical `initialize` response (`serverInfo.name: "typescript-go"`). So the invocation is stable across the preview channel and the released package — same flag, same protocol, same server identity.

**Diagnostic-agreement check**: `const x: number = "hello";` produced the byte-identical error from `tsgo@7.0.0-dev.20260707.2`, stable `tsc@6.0.3`, and — with `node_modules/typescript` renamed away entirely — `tsgo` again: `bad.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.` This also confirms `tsgo` does not read or depend on the classic `typescript` npm package at runtime; it is a fully standalone native binary.

**Minimum version**: could not establish a documented minimum for `--lsp` specifically as of 2026-08-29 — it isn't listed in the CHANGES.md ([microsoft/typescript-go CHANGES.md](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md)) or the native-preview README. It works on the latest preview build available at time of testing (`7.0.0-dev.20260707.2`, published 2026-07-07 per npm registry) and on the stable `7.0.2` release; both are safe floors to cite.

### 3. The one footgun: the official "run side-by-side" alias silently shadows `tsc`

Microsoft's own migration guidance for the *opposite* scenario — a repo that has already moved its primary `typescript` field to 7.0 and needs 6.0 back for `typescript-eslint` — is to alias:

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

`@typescript/typescript6` is a real, published compatibility package (npm registry confirms versions `6.0.0`/`6.0.1`/latest `6.0.2`) whose README states plainly: *"This package provides a `tsc6` command that runs TypeScript 6's `tsc`. It also reexports the TypeScript 6 API."* Its bin is deliberately named `tsc6`, not `tsc` — that's what makes the pairing collision-free in Microsoft's own example.

**This fleet's scenario is the mirror image**: `typescript@^6.0.3` is already the primary field (satisfying typescript-eslint's peer range), and the goal is to *add* TS7 diagnostics on the side. Naively copying the alias pattern — `"@typescript/native": "npm:typescript@^7.0.2"` — does **not** rename the aliased package's bin. Verified directly:

```
$ npm install -D typescript@6.0.3
$ npm install -D "@typescript/native7@npm:typescript@7.0.2"
$ ls node_modules/.bin/
tsc -> ../@typescript/native7/bin/tsc        # last-installed wins — this is now 7.0.2
tsserver -> ../typescript/bin/tsserver       # still 6.0.3 — TS7 ships no tsserver binary
$ ./node_modules/.bin/tsc --version
Version 7.0.2
```

Both packages' `package.json` declare `"bin": {"tsc": "./bin/tsc"}` under the real name `"typescript"` — npm resolves the bin-name collision by last-write, silently. Any `npm run typecheck` script that shells to `tsc` (all seven npm-based repos in the fleet do this) would silently run against TS7's stricter diagnostics (see Finding 6's declaration-conflict note) instead of the pinned TS6 the rest of the toolchain assumes — with no error, no warning, no lockfile signal.

**The safe path for this fleet** is the one verified in Finding 2: install `@typescript/native-preview` (bin `tsgo`, a name the real `typescript` package never claims) as a plain additional devDependency. Verified: `tsc`/`tsserver` remain untouched, pointing at `typescript@^6.0.3`; `tsgo` is purely additive.

### 4. Cold `tsc` is already sub-second on every repo in this fleet — measured

Timed directly in this session (`/usr/bin/time`, 3 runs each, using each repo's own installed `typescript`):

| Repo | Files | `tsc --noEmit` (cold, median of 3) |
|---|---|---|
| vscode-ocx | 10 | 0.66s |
| grimoire-indexer | 80 | 1.79s |
| ocx-catalog | 193 (fresh `npm install`, real deps) | 0.88s |

ocx-catalog checking faster than grimoire-indexer despite 2.4x the files is real — grimoire-indexer pulls in Preact/JSX + Astro type surface, ocx-catalog's `src/` (excluding the VitePress theme, typechecked separately) is plainer CLI code. Either way: **every measured point in the 10–193 file range this fleet spans is comfortably under 2 seconds cold.** This is direct evidence for the brief's suspicion that "do nothing" may be the correct answer for the CI gate at this fleet's scale — see Finding 5 for what a persistent process buys on top of that.

`ocx-catalog` and `setup-ocx` had no `node_modules` installed at scan time (`npx` failed on both with an unrelated “use yarn” advisory); the ocx-catalog number above comes from a scratch `npm install` on a copy of the repo, not the tracked working tree.

### 5. `--incremental`/`tsBuildInfoFile` roughly halves warm reruns; tsgo beats it by ~10x anyway

`incremental` and `tsBuildInfoFile` are documented on the [TSConfig reference](https://www.typescriptlang.org/tsconfig/#incremental): incremental mode "saves information about the project graph from the last compilation" to skip re-checking unchanged files on the next run; `tsBuildInfoFile` controls where that state lands (default: next to emitted output, which is why it must be gitignored — none of the fleet's `.gitignore`s currently need an entry for it, because none of the nine repos set `incremental`/`composite`/`tsBuildInfoFile` today, confirmed by reading every `tsconfig*.json` in the fleet).

Measured on grimoire-indexer (80 files, the fleet's mid-size repo):

| Scenario | Time (median of 3) |
|---|---|
| `tsc --noEmit` cold, no incremental | 1.79s |
| `tsc --noEmit --incremental --tsBuildInfoFile <f>`, first run | 1.59s |
| same, rerun with **zero** file changes | 0.76s |
| same, rerun after `touch`ing one source file | 0.79s |

Incremental mode roughly **halves** the warm-rerun cost on this fleet's mid-size repo, and a single-file touch costs the same as a no-op rerun (confirming the graph-diffing is doing real work, not just skipping outright). That is a real, free, zero-runtime-dependency win — but `tsgo --noEmit` on the 193-file ocx-catalog measured **0.09s** (Finding 2), roughly 10x faster than even a warm incremental `tsc` run. For a fleet this small, incremental mode is worth turning on for the CI/build path (it's free and non-invasive), but it does not close the gap to what a native language service buys for interactive edit-time feedback.

### 6. Machine-readable diagnostics: `tsc` has none; every other tool does

`tsc` has **no JSON output flag at any version** — not `--json`, not `--format`, nothing. An agent parsing `tsc`/`vue-tsc` output (`vue-tsc` inherits `tsc`'s CLI verbatim) must line-parse `file(line,col): error TSxxxx: message` or switch to a tool that emits structured output. The CHANGES.md diff between TS6 and TS7 is a second reason not to depend on the exact wording of that line: it documents that TS7 makes lib-declaration-conflict errors **consistently surface at every contributing site**, where TS6 sometimes only flagged one — a real behavioral change an agent's line-parser or dedup logic could trip on if it ever runs against both compilers ([CHANGES.md](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md)).

Per-tool structured formats, each confirmed against current docs (2026-08-29):

- **ESLint** — `-f json` / `--format json` ([formatters docs](https://eslint.org/docs/latest/use/formatters/), current ESLint version referenced on the page: v10.9.1): array of `{filePath, messages:[{ruleId, severity: 1|2, message, line, column, endLine, endColumn, messageId, suggestions:[{fix:{range,text}}]}], errorCount, warningCount, fixableErrorCount, fixableWarningCount}`.
- **oxlint** — `--format` ([CLI docs](https://oxc.rs/docs/guide/usage/linter/cli.html)): `json | github | gitlab | sarif | junit | checkstyle | unix | stylish | agent | default`. The `agent` format exists specifically for automated/agentic consumers — worth using over generic `json` when the consumer is an LLM, not a human-readable report pipeline.
- **Biome** — `--reporter=` ([CLI reference](https://biomejs.dev/reference/cli/)): `default | concise | summary | json | json-pretty | github | gitlab | junit | checkstyle | rdjson | sarif`. `json`/`json-pretty` are explicitly flagged **experimental, may change in patch releases** on the current docs page — pin Biome's exact version if an agent parses this shape, or prefer `sarif`/`checkstyle` for stability.
- **vue-tsc** inherits `tsc`'s plain-text output format exactly (it is `tsc` with a Vue-aware program) — same "no JSON" limitation applies.

### 7. The scope divergence: LSP checks open files, `tsc` checks the whole program

This is the failure mode the brief asked to name precisely. Microsoft's own performance guide states it directly ([TypeScript-wiki `Performance.md`, "Performance of `ts-server`"](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance.md)):

> "In most editors, like VS Code, diagnostics are requested for all open files, not the entire project." … "diagnostics will appear faster compared to checking the entire project with `tsc`, but slower than viewing a type with hover, since viewing a type with hover *only* asks TypeScript to compute and check that specific type."

This applies to classic `tsserver` and, per the `initialize` response captured live in Finding 2 (`"workspaceDiagnostics": false`), applies identically to `tsgo --lsp`. Neither ever proves a file that was never opened in the session is clean — a fresh clone, a file touched only via a codemod that never opened it in the LSP session, or a file outside the editor's watched roots can carry an error the LSP never surfaced. `skipLibCheck` compounds this in the same direction: it is a compiler-wide flag, identical between `tsc` and any LSP session using the same `tsconfig.json`, so it doesn't itself widen the scope gap — but the wiki explicitly warns it "can hide misconfiguration and conflicts," meaning a clean LSP+`skipLibCheck` session is a weaker signal than a `tsc --noEmit` run without it, independent of the open-files issue.

### 8. Embedded-language servers (Volar/vue-tsc) are stuck on TS 6.0 until 7.1

Straight from the TS7 announcement's own "TypeScript and Embedded Languages" section: *"workflows that use Vue, MDX, Astro, Svelte, and others will likely not yet be able to leverage TypeScript 7 ... This is mainly because TypeScript 7 does not yet expose a stable programmatic API, and so tools (such as Volar) which embed TypeScript into their own compilers and language services can only currently rely on TypeScript 6.0."* The team's explicit interim guidance: *"Projects using Vue, MDX, Astro, Svelte, and others will need to continue using TypeScript 6.0 for now."*

`vuejs/language-tools` ([repo](https://github.com/vuejs/language-tools)) ships `@vue/language-server` and `vue-tsc`; could not establish a version/date for the repo from its front page, and it carries no TS7/tsgo-specific statement of its own yet as of 2026-08-29 — the constraint is stated by the TypeScript team, not (yet) contradicted or confirmed independently by the Vue tooling project. This directly affects `creeptd-ng/web` (Vue 3, `vue-tsc@^2.2.0`, `typescript@^5.7.0`): its edit-time signal stays on classic `tsserver`/`vue-tsc` regardless of what the rest of the fleet does with `tsgo`.

### 9. typescript-language-server: a stopgap the TS team expects tsgo to supersede

`typescript-language-server` ([repo](https://github.com/typescript-language-server/typescript-language-server)) is "an unofficial LSP implementation that wraps TypeScript's `tsserver`," built for editors that only speak generic LSP (i.e., not VS Code, which talks to `tsserver` directly through its own extension protocol). Its own README names its expected obsolescence: *"Currently Microsoft is working on TypeScript 7 written natively in the go language that will include the LSP implementation and will hopefully supersede this project."* Current install instructions still target classic TypeScript: `npm install -g typescript-language-server typescript@6`; run with `typescript-language-server --stdio`. None of the fleet's nine repos declare it as a dependency (checked: no `typescript-language-server` in any `package.json`). For a fleet already moving toward `tsgo --lsp`, adopting this project now would be adopting a bridge the vendor itself says is being replaced.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt / keep / drop / watch (this fleet) | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| `tsc` (TS 6.x classic) | Compiler + type-checker, plain-text diagnostics | `typescript@^6.0.3`/`^5.9.3`/`^5.7.x` per repo (fleet-installed) | mature, feature-frozen relative to 7.x | **keep** | Required by typescript-eslint's `>=4.8.4 <6.1.0` peer range; already sub-2s cold on every repo measured | — |
| `tsgo` (`@typescript/native-preview`) | Native Go compiler + LSP, diagnostics-only use here | `7.0.0-dev.20260707.2` (npm, published 2026-07-07); stable equiv. is `typescript@7.0.2` | preview channel still shipping; stable core released | **watch → pilot** | Verified installable with zero collision alongside `typescript@^6.0.3`; ~10x faster than cold `tsc` on the fleet's largest repo, measured | Nothing yet — additive diagnostics layer, not a build-tool replacement |
| `typescript` 7.0 (stable) | Same native compiler, released package | `7.0.2` (npm `latest`, confirmed 2026-08-29) | stable for CLI/build/LSP; **no programmatic API** | **watch** | Cannot replace the fleet's `typescript@^6.0.3` yet — would break typescript-eslint everywhere it's used; adopt once 7.1's API ships | Will eventually replace `typescript@^6.x` fleet-wide, not yet |
| `@typescript/typescript6` | Compatibility shim: `tsc6` binary + re-exported TS6 API | `6.0.2` (npm `latest`) | small, purpose-built, stable in intent | **not needed** (fleet is not migrating primary field to TS7) | Solves the opposite migration direction from this fleet's | — |
| ESLint `-f json` | Structured lint output | Docs current as of ESLint v10.9.1 (page reference) | stable, long-shipped format | **keep/adopt** for any agent parsing lint output | Stable, documented shape with fix ranges | Manual stdout scraping |
| oxlint `--format` | Structured/CI-shaped lint output | Docs current 2026 (no version pinned on page) | stable flag surface, multiple target formats | **watch** (fleet doesn't run oxlint yet per wave-1 sweep) | `agent` format is purpose-built for LLM consumers | ESLint's `-f json`, where oxlint is adopted |
| Biome `--reporter=json`/`json-pretty` | Structured check/lint output | Docs current 2026; JSON reporters marked experimental | JSON shape explicitly unstable | **watch, don't parse JSON without a pin** (kate-middlechild already runs Biome) | Vendor's own docs flag JSON as changeable between patches | — |
| `tsserver` (classic language service) | Editor diagnostics, completions, refactors | Bundled with `typescript@^6.x` | mature, default in most editors today | **keep** | Only usable option for Vue/embedded-language repos until TS 7.1 | — |
| `typescript-language-server` | LSP wrapper around classic `tsserver` for non-VS-Code editors | current install pins `typescript@6` (no version on repo front page) | mature but named by its own maintainers as a stopgap | **drop / do not add** | Vendor states TS7's own LSP is expected to supersede it; not in fleet today | — |
| `@vue/language-server` (Volar) / `vue-tsc` | Vue SFC type-checking, wraps TS's language service | `vue-tsc@^2.2.0` in `creeptd-ng/web`; TS7 support unconfirmed | mature for TS 6.x, blocked on TS7's API | **keep (TS6 path only)** | Explicitly can't use TS7 until it ships a programmatic API (7.1+) | — |

## Normative guidance candidates

1. **Never let an agent report "typechecks clean" from an LSP/editor diagnostic pull alone** — only a `tsc --noEmit` (or equivalent whole-program) run on every file, not just opened ones, satisfies the CI gate's claim. *Rationale*: verified live that `tsgo --lsp`'s `initialize` response advertises `"workspaceDiagnostics": false` — it's a pull-per-open-file protocol, and Microsoft's own wiki says the same of classic `tsserver`. *Verify*: grep the agent's final-answer template for "typechecks clean" / "no type errors" and require it cite either a `tsc --noEmit` exit code or an explicit "diagnostics checked in-editor for touched files only" caveat.
2. **If adding `tsgo` for a faster edit-time signal, install `@typescript/native-preview` as a plain devDependency — never alias the real `typescript@7.x` package under a different key while `typescript@^6.x` remains primary.** *Rationale*: verified live that aliasing collides on the `tsc` bin name (both packages declare `bin: {"tsc": ...}`), silently overwriting the pinned TS6 `tsc` with TS7 for every `npm run` script that shells to it. *Verify*: `ls -la node_modules/.bin/tsc` should resolve to `../typescript/...`, not `../@typescript/...`, after any TS7-related devDependency is added.
3. **Turn on `incremental` + a gitignored `tsBuildInfoFile` in every fleet tsconfig that doesn't have it.** *Rationale*: measured ~2x reduction on warm/single-file reruns at zero cost and zero new dependency; currently 0 of 9 fleet repos set it. *Verify*: `grep -L '"incremental"' */tsconfig*.json` across the fleet should return nothing once applied; confirm the emitted `.tsbuildinfo` path is in `.gitignore`.
4. **Don't parse Biome's `--reporter=json`/`json-pretty` output without pinning Biome's exact version in the parser.** *Rationale*: Biome's own CLI docs mark these reporters experimental and subject to change in patch releases. *Verify*: the agent's Biome-output parser records the `biome --version` it was written against, and a version bump to `kate-middlechild`'s Biome triggers a re-check of the parser against that shape.
5. **Treat a clean typecheck under `skipLibCheck` as a weaker signal than one without it — never phrase it as equivalent in an agent's summary.** *Rationale*: TypeScript's own wiki says `skipLibCheck` "can hide misconfiguration and conflicts"; all nine fleet repos currently set it. *Verify*: reviewer heuristic — any agent claim of "no type errors" against a `skipLibCheck: true` project should be phrased as "no *reported* type errors under `skipLibCheck`," not an unqualified "typechecks clean."
6. **For the one Vue repo (`creeptd-ng/web`), do not point an agent's edit-time signal at `tsgo`/TS7 at all** — keep it on `vue-tsc`/classic `tsserver`. *Rationale*: Microsoft's own 7.0 announcement states Vue tooling can't use TS7 until it exposes a programmatic API (7.1+), and this hasn't shipped as of 2026-08-29 (`typescript`'s npm `next` tag is `7.1.0-dev.20260829.1`, unreleased). *Verify*: `creeptd-ng/web/package.json` shows `typescript` in `dependencies`/`devDependencies` below `7.0.0` — flag any PR that bumps it past that without also confirming Volar's TS7 support has landed.

## AI-agent angle

- **Recommending the migration-direction alias verbatim.** Microsoft's own 7.0 announcement post shows the `"@typescript/native": "npm:typescript@^7.0.2"` alias pattern prominently, with no caveat about bin-name collision for repos where `typescript` is *not* also being repointed. An agent skimming that post is likely to propose exactly this for "let's try TS7 diagnostics" — and it will silently break every `npm run typecheck`/`build` script in the fleet by swapping the real `tsc` binary underneath them. **Smallest check**: after any devDependency change touching `typescript` or `@typescript/*`, run `ls -la node_modules/.bin/tsc` and confirm the symlink target's version matches the intended primary `typescript` field.
- **Citing `tsgo`'s speedup numbers as proof the CI gate itself should switch to `tsc7`.** The 8x–12x figures are real and Microsoft-published, but they say nothing about whether TS7 agrees with TS6 on every diagnostic in a specific codebase, and the fleet cannot run TS7 as its primary compiler yet (typescript-eslint's peer range excludes it). **Smallest check**: any PR proposing `typescript@^7` as the *primary* devDependency should fail review immediately if `typescript-eslint` is also a dependency — that pairing is a hard incompatibility today, not a judgment call (verified live: `typescript-eslint@8.68.0`, published 2026-08-24, peer range `">=4.8.4 <6.1.0"`).
- **Treating an LSP-clean file as CI-equivalent.** An agent that ran a codemod, watched the editor/LSP show no red squiggles on the touched file, and reports "typechecks clean" has checked exactly one file's diagnostics, pulled on demand, against `workspaceDiagnostics: false`. **Smallest check**: Rule 1 above — require a `tsc --noEmit` exit code (or documented equivalent) before the phrase "typechecks clean" appears in any agent output, full stop.
- **Assuming Biome's/oxlint's JSON output is as stable as ESLint's.** ESLint's `-f json` has been stable for years; Biome's own docs flag its JSON reporters experimental. An agent building a parser against one is likely to assume the other has the same guarantee. **Smallest check**: before wiring a JSON-diagnostic parser to any tool, grep that tool's own CLI docs page for the word "experimental" next to the flag being used.

## Contested / evolving

- **Whether TS7 should become the fleet's primary compiler.** Blocked hard today by typescript-eslint's peer range (`<6.1.0`, confirmed current as of the 2026-08-24 typescript-eslint release) and by Volar/vue-tsc's dependency on a programmatic API TS7 doesn't have. Trending toward "yes, once 7.1 ships" — Microsoft's own post commits to "implementing a new API for the broader ecosystem" as the team's next focus after 7.0, with "new featureful versions published every 3-4 months." As of 2026-08-29, 7.1 is in dev (`next` tag dated today) but not released — this is a live, moving target, re-check monthly rather than treating it as settled.
- **Whether Biome's JSON reporter is safe to build tooling against.** Vendor explicitly calls it experimental as of the current docs (2026); no fixed date found for when it might stabilize. Only relevant to `kate-middlechild` today.
- **Whether a persistent language server or `--incremental` is the right edit-time investment for a fleet this small.** The brief's own hypothesis — "the honest answer may be do nothing" — held up under measurement for the *cold-tsc* case (every repo sub-2s) but not fully: `tsgo`'s ~10x-over-cold-`tsc` number is real and measured, not just a vendor claim, so "do nothing" undersells what's cheaply available. The honest middle position, as of this research: turn on `incremental` everywhere (free), and treat `tsgo` as a pilot for one repo (ocx-catalog, the largest) before deciding fleet-wide.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Does TS 7.1's programmatic API, once it ships, let typescript-eslint drop its `<6.1.0` ceiling immediately, or is there another lag? | Determines when the fleet can move its primary `typescript` field to 7.x | [TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | high | high — 7.1 could land within the quoted 3–4 month cadence |
| Does Volar/`@vue/language-server` publish its own TS7 compatibility statement once 7.1 ships? | Directly gates `creeptd-ng/web`'s edit-time tooling choice | [vuejs/language-tools](https://github.com/vuejs/language-tools) | high (for that one repo) | high |
| What does `tsgo --lsp`'s pull-diagnostics endpoint (`textDocument/diagnostic`) return for a file with an *unresolved import* vs a *type error* — same severity handling as classic `tsserver`? | Affects whether an agent's LSP-based pre-check can substitute for any part of the CI gate | not yet tested live | med | med |
| Is there a documented, versioned minimum for `tsgo --lsp` (vs. just "it worked on the build tested here")? | Needed before pinning a specific `@typescript/native-preview` version in fleet tooling | [native-preview README](https://www.npmjs.com/package/@typescript/native-preview) (undocumented) | med | med |
| Does `oxlint`'s `agent`-format output differ meaningfully from its `json` format for an LLM consumer, and is it worth adopting even though the fleet doesn't run oxlint yet? | Directly answers "what should an agent parse" for a tool not yet in the fleet | [oxc.rs CLI docs](https://oxc.rs/docs/guide/usage/linter/cli.html) | low (fleet doesn't use it) | med |
| Does `tsc --build`/project-reference mode (used by `fma`) get the same incremental win measured here for single-config repos? | `fma` is the fleet's one repo using `tsc -b` / composite references | not yet tested live on `fma` specifically | med | low |
| What is Biome's actual roadmap/date for stabilizing `--reporter=json`? | Determines whether `kate-middlechild` can safely wire agent tooling to it | [Biome CLI reference](https://biomejs.dev/reference/cli/) (no date given) | med | med |
| Does VS Code's own bundled TypeScript support (promised "in the coming weeks" as of the 7.0 post) change the install story — i.e., will editors stop needing the separate TS7 extension? | Affects whether the fleet needs any explicit devDependency for editor-side TS7 at all | [TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | med | high — explicitly "coming weeks" as of an unspecified post date |
| Does `--checkers`/`--builders` tuning matter at this fleet's file-count scale, or is it only relevant to Sentry/VSCode-sized monorepos? | The 7.0 announcement's parallelism flags target large codebases; unclear payoff below ~200 files | [TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | low | low |
| Is there a real, measured divergence between `tsgo` and classic `tsc` beyond the documented lib-declaration-conflict change, on any of the fleet's actual (non-toy) source files? | This research only tested a single-line synthetic error; the fleet's real strict-mode configs (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.) are untested against `tsgo` | measured here (synthetic only) | high | med |
| Should `typescript-language-server` ever be added for a non-VS-Code editor in this fleet, given its own maintainers expect it superseded? | Directly answered here as "no, watch tsgo instead" — worth re-confirming once tsgo's LSP is feature-complete (CHANGES.md still lists it "in progress" for some features) | [typescript-language-server repo](https://github.com/typescript-language-server/typescript-language-server) | low | med |
| Does `tsgo --lsp` support multi-root / project-reference workspaces the way `fma`'s split `tsconfig.app.json`/`tsconfig.node.json` needs? | Untested; `fma` is the one repo with a references-only root `tsconfig.json` | not yet tested live | med | low |
| What's the actual measured project-load-time win from `tsgo`'s language service on a repo this fleet's size, as opposed to the `--noEmit` CLI number measured here? | This research measured CLI `--noEmit` speed, not editor project-load/first-diagnostic latency directly | not yet tested live | med | med |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | Official TS team blog, TS 7.0 GA announcement | 2026-07-08 release | Primary source for every headline number, the side-by-side alias pattern, and the embedded-languages/API-gap statement |
| [devblogs.microsoft.com/typescript/typescript-native-port](https://devblogs.microsoft.com/typescript/typescript-native-port/) | Official TS team blog, prior-year native-port deep dive | referenced from the 7.0 post | Background context for the port's origin and early LSP work |
| [devblogs.microsoft.com/typescript/announcing-typescript-native-previews](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/) | Official TS team blog, original preview announcement | 2025-05-22 | Establishes the `tsgo` name and preview package's origin |
| [github.com/microsoft/typescript-go](https://github.com/microsoft/typescript-go) | Staging repo README (now archived/closed) | closed post-7.0, archiving Sept 2026 | Confirms repo status, feature-parity table (LSP "in progress", API "not ready" as of staging) |
| [github.com/microsoft/typescript-go/blob/main/CHANGES.md](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md) | Official TS6→TS7 behavioral diff list | current as of repo closure | Source for the lib-declaration-conflict divergence and other diagnostic-shape changes |
| [github.com/microsoft/TypeScript-wiki/blob/main/Performance.md](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance.md) | Official TypeScript performance guide | ongoing wiki | Source of the exact open-files-vs-whole-project divergence quote |
| [typescriptlang.org/tsconfig/#incremental](https://www.typescriptlang.org/tsconfig/#incremental) | Official TSConfig reference | current | Defines `incremental`/`tsBuildInfoFile` semantics and default output location |
| [npm registry: `typescript`](https://registry.npmjs.org/typescript) | Package registry metadata (queried live) | queried 2026-08-29 | Ground truth for `latest`=7.0.2, `next`=7.1.0-dev.20260829.1 |
| [npm registry: `@typescript/native-preview`](https://registry.npmjs.org/@typescript%2Fnative-preview) | Package registry metadata + README (queried live) | latest dev build 2026-07-07 | Confirms bin name `tsgo`, package description, and preview channel is still shipping post-7.0 |
| [npm registry: `@typescript/typescript6`](https://registry.npmjs.org/@typescript%2Ftypescript6) | Package registry metadata + README (queried live) | latest `6.0.2` | Confirms the compatibility-shim package is real, published, and what it does |
| [npm registry: `typescript-eslint`](https://registry.npmjs.org/typescript-eslint) | Package registry metadata (queried live) | published 2026-08-24 | Confirms the `>=4.8.4 <6.1.0` peer range is current, 5 days old at research time |
| [eslint.org/docs/latest/use/formatters](https://eslint.org/docs/latest/use/formatters/) | Official ESLint docs | referencing ESLint v10.9.1 | Exact JSON output shape for `-f json` |
| [oxc.rs/docs/guide/usage/linter/cli](https://oxc.rs/docs/guide/usage/linter/cli.html) | Official oxlint CLI docs | current 2026 | Full `--format` value list including the agent-targeted `agent` format |
| [biomejs.dev/reference/cli](https://biomejs.dev/reference/cli/) | Official Biome CLI reference | current 2026 | `--reporter` values and the explicit "experimental" flag on JSON reporters |
| [github.com/typescript-language-server/typescript-language-server](https://github.com/typescript-language-server/typescript-language-server) | Official project repo/README | current | Source for the project's own "expects to be superseded by TS7" statement and its `typescript@6` pin |
| [github.com/vuejs/language-tools](https://github.com/vuejs/language-tools) | Official Vue language-tools repo | current | Confirms `vue-tsc`/`@vue/language-server` scope; no independent TS7 statement found yet |
| Direct execution in this session (`npm install`, `tsgo`/`tsc --lsp --stdio`, timed `tsc`/`tsgo` runs) | Primary — self-generated, reproducible | 2026-08-29 | Source for every "verified live"/"measured" claim above: the LSP handshake, the bin-collision footgun, the fleet timing table, and the tsgo/tsc diagnostic-agreement check |
