---
title: Implemented Contracts Audit — TypeScript Fleet
agent: implemented-contracts-audit
model: claude-sonnet-5
scope:
  - ocx-catalog
  - grimoire-indexer
  - grimoire-vscode
  - vscode-ocx
  - setup-ocx
  - fma
  - creeptd-ng/web
  - kate-middlechild
  - grimoire-index
method: >
  Read-only static audit. No writes outside this file. Commands run from
  /home/mherwig/dev/<repo> unless noted. Every finding below is re-runnable
  with the exact command shown at its citation. General patterns used
  throughout:
  `grep -rn "process\.exit\|exitCode" <repo>/src --include="*.ts"`,
  `grep -rn "class .*extends Error" <repo>/src --include="*.ts"`,
  `grep -rn "throw new Error(" <repo>/src --include="*.ts" | wc -l` (bare-Error
  count) vs `grep -rEn "throw new (ClassA|ClassB|...)\(" <repo>/src | wc -l`
  (typed-throw count), `grep -rn "{ cause:" <repo>/src` (Error.cause usage),
  `grep -rn "process\.stdout\.write\|process\.stderr\.write\|console\.(log|error|warn)" <repo>/src`,
  `python3 -c "import json; print(json.load(open('<repo>/package.json'))['exports'])"`,
  `grep -rn "ajv\|Ajv" <repo>/src <repo>/package.json`,
  `python3 -c "..."` against `<repo>/package.json` for VS Code
  `activationEvents`/`contributes.commands`, `grep -rn "registerCommand(" <repo>/src/extension.ts`,
  `grep -n "subscriptions.push" <repo>/src/extension.ts`,
  `cat setup-ocx/action.yml`, `grep -rn "getInput(\|getBooleanInput(\|setOutput(" setup-ocx/src`,
  `git ls-files dist/` + `grep -n "dist:check" -A4 setup-ocx/taskfile.yml`.
  `node_modules` was absent in `ocx-catalog` (no `npm ci` run — read-only
  audit, not installed) so `publint`/`attw` could not be executed there;
  `grimoire-indexer` has `node_modules` but neither tool is a dependency, so
  neither was run there either (see §4).
---

# Implemented Contracts Audit — TypeScript Fleet

This audits contracts the codebases actually *honour* (definition site,
production emission site, test site), not what they document. Where any leg
is missing it is called out explicitly — **UNTESTED** (no test asserts the
contract) or **UNDEFINED** (no named/central definition, only inline
literals or ad hoc behavior) — because that absence is itself the finding.

---

## 1. CLI exit codes

### `ocx-catalog`

**Definition**: named `const` enum, not inline literals —
[`src/cli/exit.ts:5-11`](../../../src/cli/exit.ts) (relative to that repo):
`OK=0`, `FAIL=1`, `USAGE=64`, `DATA=65`, `UNAVAILABLE=69`. Explicit comment:
"BSD sysexits.h-derived … subset actually used by this program."

**Production sites** (`/home/mherwig/dev/ocx-catalog/`):
- `src/cli/index.ts:9` — bin shim: any error that escapes `main()` (including
  a thrown value that isn't `CommanderError`, i.e. the "unhandled" path) →
  `console.error(err)` + `process.exitCode = FAIL` (1). **An unhandled
  rejection inside `main()`'s own body is NOT distinguished from an explicit
  failure — both land on the same code, 1**, via this one catch-all.
- `src/cli/main.ts:72` — a `CommanderError` (bad flag, `--help`, `--version`)
  is remapped: `exitCode = err.exitCode === 0 ? OK : USAGE`.
- `src/cli/main.ts:44/48` — the `ci` subcommand: success → `OK`;
  `ConfigError`/`CiError` → `DATA` (65) unconditionally (never `UNAVAILABLE`
  — `ci` has no path to it, confirmed by `docs/reference/cli.md:115`).
- `src/cli/build.ts:39/44` — `build`: `ConfigError` → `DATA`; `BuildError` →
  `UNAVAILABLE` if `err.code === "UNAVAILABLE"` else `DATA`.
- `src/cli/dev.ts:57/66` — `dev`: `--source`+`--config` together, or a bad
  `--port`, → `USAGE` (64) via explicit checks, not commander.
- `src/cli/dev.ts:99/104` — same `ConfigError`/`BuildError` mapping as
  `build`.
- `0` is never returned on a caught failure path — every catch branch sets a
  non-zero code before `return`; the only way to get `0` is an untouched
  `process.exitCode` (implicit Node success) or the explicit `ci` success
  assignment.

**Docs vs code**: `docs/reference/cli.md:93-115` transcribes this exact
table, including a per-command 0/1/64/65/69 reachability matrix (e.g. `ci`
explicitly documented as *not* reaching 69). Cross-checked line by line
against the code above — **docs and code agree**; this is the one place in
the fleet where the exit-code contract is independently documented AND
matches. `docs/ops/troubleshooting.md:61-70` repeats the same table for
operators.

**Tests**: `test/cli.test.ts:52-129` — asserts all five named constants'
numeric values directly (`OK===0`, `FAIL===1`, `USAGE===64`, `DATA===65`,
`UNAVAILABLE===69`) plus `--version`/`--help`/bad-flag/unknown-subcommand end
to end. `test/cli_build_error_mapping.test.ts:33-56` and
`test/cli_dev_error_mapping.test.ts:22-34` unit-test the `ConfigError`/
`BuildError` → exit code mapping in isolation. **Fully tested.**

### `grimoire-indexer`

**Definition**: named `const` object + branded type —
`src/cli/exit.ts:13-26` (`EXIT.ok=0, failure=1, usage=64, data=65,
unavailable=69`), plus `CliError` (`src/cli/exit.ts:29-37`) carrying its own
`code: ExitCode`. Richest exit-code contract in the fleet: `validate`
additionally treats `0` as an **authorization** ("eligible for auto-merge"),
documented and enforced by the `gate` mechanism.

**Production site — single choke point**: `src/cli/main.ts:66-94`,
`classify(err, gate)`. Every subcommand's `action()` calls its own module
(`init`/`ci`/`build`/`dev`/`enrich`/`ratings`/`validate`) and assigns the
returned code to a shared `code` variable (e.g. `main.ts:170-234`); anything
those modules *throw* instead of returning is caught once at
`main.ts:236-240` and passed through `classify`. `src/cli/index.ts:9` sets
`process.exitCode = await run(process.argv)` — **`process.exit()` is never
called anywhere in this CLI's own code** (comment at `index.ts:7-8` states
why: it "truncates buffered stdout when output is piped"). There is **no**
`process.on("unhandledRejection"/"uncaughtException")` handler anywhere in
`src/` — a rejection that truly escapes `run()`'s try/catch (none currently
does, since `parseAsync` awaits every action) would fall through to Node's
own default (uncaught exception → process exit 1), which is unreachable in
practice but also untested.

`classify()`'s branches: `CommanderError` with `exitCode===0` → `EXIT.ok`
UNLESS `gate` is set, in which case → `EXIT.usage` (`main.ts:69`) — this is
the fix for a documented real exploit (`main.ts:58-64`): CI used to append
attacker-controlled filenames to argv, so a PR that added a file named `-h`
made `validate` print help and exit 0, which the gate contract reads as
"auto-merge". `CliError` → its own `code`, but forced to `EXIT.usage` if
`gate && code === EXIT.ok` (`main.ts:74`) — **the gate can never accidentally
exit 0 through a generic `CliError`, only through the one explicit
`validate.ts:210` success line**. `ERR_MODULE_NOT_FOUND` → `EXIT.unavailable`
with a "run `npm run build`" hint (`main.ts:76-81`). Named-error-class match
(`IndexValidationError`/`SiteConfigError`/`RenderInputError`, matched **by
`.name` string**, not `instanceof`, because those modules are dynamically
imported — `main.ts:82-91`) → `EXIT.data`. Everything else → `EXIT.failure`
(1).

**Docs vs code**: `README.md:26` documents exactly one fragment ("`ci --check`
… exits 65 on drift"); no full exit-code table exists in
`README.md`/`CLAUDE.md`/`.claude/rules.md`. **The code (`exit.ts` +
`classify()`) is the only source of truth — docs do not compete because they
barely exist.** This is weaker documentation than `ocx-catalog`'s, despite
having the more complex (gated) contract.

**Tests**: `test/cli/exit-codes.test.ts` (400 lines) is a dedicated,
scenario-driven exit-code test — `describe("usage errors exit 64", …)`,
`describe("bad input data exits 65", …)`, `describe("the gate never exits 0
without judging the contribution", …)` (lines 196-287: reproduces the exact
`-h`/`--help`/`--version`/`-V` exploit above and asserts all four now exit
64 under `gate`, `test/cli/exit-codes.test.ts:230-235`), `describe("a
registry it cannot reach exits 69", …)` (358-391), `describe("success exits
0", …)` (392-400). **This is the single best-tested contract found in the
whole fleet** — a regression test exists for the specific historical
security bug, not just the happy path.

### Fleet-wide exit-code table (both CLIs, actual behavior — not aspirational)

| Code | `ocx-catalog` | `grimoire-indexer` |
|---|---|---|
| 0 | success; `ci` success only via explicit set | success; for `validate` = **auto-merge authorization**, fail-closed |
| 1 | any uncaught throw (bin shim catch-all) | `classify()` default branch |
| 64 | commander parse error, or explicit usage check (`dev`) | commander parse error; **or gate-forced when a would-be-0 help/version short-circuit happens during `validate`** |
| 65 | `ConfigError`, `CiError`, `BuildError{code:"DATA"}` | `CliError{code:data}`, malformed `metadata.json`/`index-policy.json`, named validation-error classes |
| 69 | `BuildError{code:"UNAVAILABLE"}` (unreachable `url` source, bound port) | `CliError{code:unavailable}`, `ERR_MODULE_NOT_FOUND`, unreachable forge |

Other repos (`grimoire-vscode`, `vscode-ocx`, `fma`, `creeptd-ng/web`,
`kate-middlechild`, `grimoire-index`) have **no CLI entry point** and thus
**no exit-code contract** — `grimoire-index` in particular has zero custom
TypeScript source of its own; it is a pure data instance consumed by
`grimoire-indexer` (`package.json` scripts just shell out to `grim-indexer`).

---

## 2. Error taxonomy

**Custom `Error` subclasses, fleet-wide** (`grep -rn "class .*extends Error"
<repo>/src`):

| Class | File:line | Carries beyond `message` | `Error.cause`? |
|---|---|---|---|
| `CiError` | `ocx-catalog/src/ci/errors.ts:18` | `code: CiErrorCode` (union of 3 literals) | no |
| `SourceError` | `ocx-catalog/src/sources/types.ts:152` | `code: SourceErrorCode` | no |
| `BuildError` | `ocx-catalog/src/build/errors.ts:28` | `code: "DATA"\|"UNAVAILABLE"` | no |
| `ConfigError` | `ocx-catalog/src/config/errors.ts:34` | `code: ConfigErrorCode` (12-way union) | no |
| `SiteConfigError` | `grimoire-indexer/src/config.ts:153` | nothing beyond `message`/`name` | no |
| `IndexValidationError` | `grimoire-indexer/src/data/index.ts:55` | nothing beyond `message`/`name` | no |
| `RenderInputError` | `grimoire-indexer/src/renderer/index.ts:50` | nothing beyond `message`/`name` | no |
| `CliError` | `grimoire-indexer/src/cli/exit.ts:29` | `code: ExitCode` | no |
| `ForgeError extends CliError` | `grimoire-indexer/src/ratings/provider.ts:75` | inherits `code` (defaults `EXIT.unavailable`) | no |
| `RateLimited extends ForgeError` | `grimoire-indexer/src/ratings/provider.ts:87` | `retryAfterMs: number`, `observed: RatingThread[]` | no |
| `GraphCompileError` | `fma/src/graph/compile.ts:20` | `reason: string`, `nodeId?: string` (both public ctor params) | no |

**`grimoire-vscode`, `vscode-ocx`, `setup-ocx`, `kate-middlechild`,
`grimoire-index` define zero custom `Error` subclasses** — **UNDEFINED**
taxonomy in 5 of 9 scoped codebases. `creeptd-ng/web` also defines none.

`Error.cause` is used **nowhere in the fleet** — `grep -rn "{ cause:"
<repo>/src` returns 0 hits in every one of the 9 repos checked. No error
anywhere carries a wrapped original cause; a rethrow always loses the
original stack/context or re-derives the message as a string.

**Bare vs. typed throw ratio** (`throw new Error(` vs `throw new
<TypedClass>(`, per repo, `src/` only):

| Repo | bare `throw new Error(` | typed throws |
|---|---|---|
| `ocx-catalog` | 35 | 44 |
| `grimoire-indexer` | 1 | 61 |
| `fma` | 18 | 10 |
| `grimoire-vscode` | 18 | 0 |
| `vscode-ocx` | 11 | 0 |
| `setup-ocx` | 12 | 0 |
| `kate-middlechild` | 0 | 0 |
| `grimoire-index` | 0 | 0 |
| `creeptd-ng/web` | 16 | 0 |
| **Fleet total** | **111** | **115** |

The 115 typed throws are concentrated almost entirely in the two published
packages (`ocx-catalog` + `grimoire-indexer` = 105 of 115); the other 7 repos
contribute 0 typed throws between them and 75 bare `new Error(string)` sites.
**Read as two populations, not one ratio**: the CLI packages have near-parity
discipline (a typed class for anything the CLI must branch on); everything
else is 100% bare, string-message errors with no programmatic
classification.

**Central classifier**: only `grimoire-indexer` has one — `classify()`
(`src/cli/main.ts:66-94`, described in §1). `ocx-catalog` maps errors to
exit codes **per-command** (`cli/build.ts:36-47`, `cli/dev.ts:96-107`,
`cli/main.ts:45-52` each repeat the same `instanceof ConfigError` /
`instanceof BuildError` dispatch) rather than through one shared function —
**duplicated, not centralized**, though the three copies are currently
identical. No other repo has any classifier at all — an uncaught error in
`grimoire-vscode`/`vscode-ocx` surfaces however VS Code's own extension-host
error handling renders it; no code in either repo maps an `Error` to a
user-facing message.

**Test coverage of the classes**: `ocx-catalog`'s four classes are exercised
across `test/build/*.test.ts`, `test/config/*.test.ts`, `test/ci/*.test.ts`,
`test/sources/*.test.ts` (each class has direct construction/message tests,
confirmed via `grep -rln "CiError\|SourceError\|BuildError\|ConfigError"
ocx-catalog/test`, 18 files). `grimoire-indexer`'s five classes are all
referenced from `test/ratings/*.test.ts`, `test/cli/ci.test.ts`,
`test/data/index.test.ts`, `test/renderer/*.test.ts`. `GraphCompileError` is
tested at `fma/src/graph/__tests__/compile.test.ts`. **UNTESTED**: none of
the classes found are untested — but the 75 bare-`Error` sites in the other
6 repos are, by construction, untestable-as-a-contract: there is nothing
named to assert against, only a string message.

---

## 3. Output streams

**`ocx-catalog`**: disciplined split. Every diagnostic/error write in
`src/cli/*.ts`, `src/build/*.ts`, `src/sources/mirror.ts`,
`src/ci/render.ts` uses `process.stderr.write(...)` directly (11 call
sites); the **one** stdout write in the interactive path is
`src/cli/dev.ts:89` ("serving http://localhost:… — Ctrl-C to stop"), and
that line's own comment explains it exists *because* `vitepress`'s
`createServer()` prints nothing of its own — without it, a healthy server
was indistinguishable from a hang. `src/cli/index.ts:8` is the one
`console.error` in the whole package (top-level bin-shim catch for an error
`main()` didn't map to a specific stream). No `--json` output exists
anywhere, so there is nothing for a JSON stream to collide with — **the
"mixed stdout" question is moot: this CLI emits no machine-readable payload
at all**, on either stream. No `--quiet`/`--json` flag exists
(`grep '"--json"\|"--quiet"' src/cli` → 0 hits).

**`grimoire-indexer`**: **not** disciplined — every subcommand
(`cli/init.ts`, `cli/ci.ts`, `cli/build.ts`, `cli/dev.ts`, `cli/enrich.ts`,
`cli/ratings.ts`, `cli/validate.ts`, `enrich/checkpoint.ts`) uses
`console.log`/`console.error`/`console.warn` directly (32 call sites total),
mixing progress lines ("`  ${label.padEnd(12)}${value}`",
`cli/init.ts:311`), warnings (`console.warn`, `enrich/checkpoint.ts:154-211`
— six separate "enriching everything" fallback warnings), and the gate's own
verdict text (`validate.ts:210` `"eligible for auto-merge"` on stdout,
`validate.ts:214-216` `"manual review required:"` + reasons on stderr) all
through the same unfiltered `console.*` calls (`console.log`→stdout,
`console.error`/`console.warn`→stderr — that split is real, but it is
Node's default `console` routing, not an intentional stream contract in this
code). **No `--json`/`--quiet` flag exists** here either (same grep, 0
hits) — so again there is no machine-readable payload to collide with
human-readable text; the finding is the *absence* of a structured-output
mode in a CLI whose one gate command (`validate`) exists specifically to be
consumed by CI. `main.ts:73/77-79/89/92` funnel every mapped error through
`console.error` (not `process.stderr.write`), which is inconsistent with
`ocx-catalog`'s convention of writing errors directly to the stream object.

**UNDEFINED** in both: no `--json` mode, no `--quiet` mode, no documented
stdout/stderr contract beyond "errors go to stderr, everything else is
whatever `console.log`/`process.stdout.write` happened to be called."
Neither CLI's tests assert *which stream* a given line lands on except
incidentally (`ocx-catalog/test/cli.test.ts:53-55` checks `stdout`/`stderr`
content for `--version`/`--help`; `grimoire-indexer`'s
`exit-codes.test.ts:26-27` stubs both streams to silence them, asserting
nothing about which stream is used).

---

## 4. Public API of the published packages

**`ocx-catalog/package.json` `exports` (verbatim)**:
```json
{
  "./theme": { "types": "./src/theme/index.mts", "import": "./src/theme/index.mts" },
  "./package.json": "./package.json"
}
```
No `"."` entry — the package's primary consumption path is its `bin`
(`ocx-catalog: dist/cli/index.js`), not a library import; the only importable
subpath is the Vue theme (`./theme`), and it resolves straight to **source**
`.mts`, not `dist/` — this package ships TypeScript source as its type/import
target for that one subpath (no build step between publish and consumption
for `./theme`). No `require` condition anywhere → **ESM-only**, consistent
with `"type": "module"` (not separately verified in this pass, but no `main`/
`types` legacy fields exist either).

**`grimoire-indexer/package.json` `exports` (verbatim)**:
```json
{
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./integration": { "types": "./dist/integration.d.ts", "import": "./dist/integration.js" }
}
```
Both entries point at `dist/`, both `types`-then-`import` only — **ESM-only,
no `require` condition**, so a CJS consumer using `require()` gets no
resolution for either entry point (untested — no test in this repo exercises
`require()` against the built package).

**`publint`/`@arethetypeswrong/cli`**:
- `ocx-catalog` declares both as devDependencies
  (`package.json:77,89` — `@arethetypeswrong/cli@^0.18.2`,
  `publint@^0.3.14`) and wires them into CI:
  `.github/workflows/ci.yml:89` runs `task pack-smoke` in a `pack-verify`
  job, and `scripts/pack-smoke.mjs`'s docblock (referenced by
  `taskfile.yml:45-48`) describes the pipeline as "npm pack → publint → attw
  → install the tarball into a sandbox → run the installed bin → resolve the
  theme subpath export → dependency-completeness." **Could not run it in this
  audit**: `ocx-catalog/node_modules` is not installed (read-only audit, no
  `npm ci` performed), so there is no local `publint`/`attw` binary to
  invoke, and `npx --no-install publint` confirmed nothing is cached
  globally either. The CI wiring itself is verified to exist; whether it
  currently *passes* was not independently re-run.
- `grimoire-indexer` declares **neither** tool as a dependency
  (`python3 -c "... 'publint' in devDependencies"` → `False`, same for
  `@arethetypeswrong/cli`), and neither name appears in
  `.github/workflows/ci.yml`/`release.yml`. **UNDEFINED/UNTESTED**: this
  package's dual entry points (`.` and `./integration`) have no automated
  check that their `types`/`import` conditions actually resolve, and no
  publish-shape verification of any kind, despite being the more complex
  export surface of the two packages (two entry points vs. one subpath).

---

## 5. On-disk / wire formats

**`grimoire-indexer`'s compiled index** (`dist/all.json`, one record per
package): shape is `IndexRecord`, `grimoire-indexer/src/data/index.ts:31-39`
— `schema: 1` (literal-typed, i.e. a version field, **required**),
`name`/`kind`/`ref`/`description`/`owner`/`namespace` are closed fields, but
the interface also declares `[key: string]: unknown` (`data/index.ts:32`) —
**deliberately open** to any additional enrichment field (comment:
"grim's read side never relies on a closed field set here (additive schema
evolution)"). Parse/validate site: `validate()`,
`grimoire-indexer/src/data/index.ts:71-93` — missing any of the 5 `REQUIRED`
keys → `IndexValidationError` (`data/index.ts:57-59`); `schema !== 1` →
rejected by name, not just type (`data/index.ts:76-78`, so `schema: 2` is
rejected today, not silently upgraded); `kind` not in the closed 5-value set
→ rejected (`data/index.ts:79-81`); `name` must equal the containing
directory name (`data/index.ts:82-85`); `owner` must be an object carrying
`id` plus `github` or `login` (`data/index.ts:86-94`). **On a missing
required field: rejected (`IndexValidationError`, exit 65 per §1). On an
unknown extra field: silently accepted** (open index signature) — this is an
intentional, documented asymmetry, not an oversight.

**`ocx-catalog`'s `catalog.config.json`**: hand-rolled validator, explicitly
**not** ajv-driven — `src/config/load.ts:355` states this directly, and the
JSON Schema file that documents the shape
(`src/config/schema/catalog.config.schema.json:5`) says so too ("validation
itself is hand-rolled, not ajv-driven" — the schema file exists for IDE
autocomplete/docs, not as the runtime gate). Parse/validate site:
`src/config/load.ts` (assertion helpers at lines 41/48/55/62/70/84,
136/139). On a missing/wrong-typed field → `ConfigError{code:"INVALID_TYPE"}`
(`load.ts:41` etc.). **On an unknown top-level key → rejected**,
`ConfigError{code:"UNKNOWN_KEY"}` (`load.ts:84`) — fail-loud, the opposite
policy from `grimoire-indexer`'s index records. `configVersion` absent →
defaults to version 1; present but unsupported →
`ConfigError{code:"UNSUPPORTED_VERSION"}` (documented at `load.ts:368-374`).
A dedicated test, `test/config/schema-agreement.test.ts`, uses **ajv only to
assert the checked-in JSON Schema still agrees with this hand-rolled
validator** — ajv here is a meta-test on the docs artifact, never a runtime
validator of real user input.

**`ajv` as a fleet dependency**: present in `ocx-catalog` (`^8.18.0`) and
`vscode-ocx` (`^8.17.1`), **used in neither at runtime** — both uses are
test-only. `vscode-ocx/src/test/schema.test.ts:7,19-21` compiles the
vendored `schemas/ocx.toml.schema.json` (draft 2020-12, needs
`ajv/dist/2020`) and asserts sample `ocx.toml` fixtures validate — this
tests that the schema-doc artifact accepts known-good TOML, but the
extension's own runtime code path for reading a workspace's `ocx.toml` was
not found to call ajv at all (0 hits for `ajv|Ajv` outside `src/test/` in
that repo). **UNDEFINED at runtime**: neither package that depends on `ajv`
actually validates live input with it; both real-input validators
(`grimoire-indexer`'s `validate()`, `ocx-catalog`'s `load.ts`) are hand-rolled
and ajv-free. `grimoire-indexer`, `grimoire-vscode`, `setup-ocx`, `fma`,
`kate-middlechild`, `grimoire-index` reference `ajv`/`Ajv` **nowhere** (0
hits each).

**`grimoire.lock`/`ocx.lock`**: these are artifacts of the separate `grim`/
`ocx` CLIs (Rust binaries, out of TypeScript-fleet scope) that many repos in
`/home/mherwig/dev` happen to carry as data files. Neither `ocx-catalog` nor
`grimoire-indexer`'s **TypeScript source** reads or writes them —
`grep -n "ocx\.lock\|grimoire\.lock" grimoire-indexer/src/cli/init.ts` → 0
hits, confirmed no reference anywhere in either package's `src/`. **Not a
TypeScript-fleet contract** despite the name overlap with "grim-lock" in the
brief; flagging so this isn't mistaken for an oversight.

**`creeptd-ng/web`'s protobuf wire format**: `.proto` sources under
`proto/creeptd/**/v1/*.proto` (versioned by directory, e.g.
`leaderboard/v1/`), code-generated to
`web/src/gen/creeptd/**/v1/*_pb.ts`. The one production decode site found,
`web/src/composables/useLobbyWsClient.ts`, is **currently a JSON fallback,
not protobuf** — `decodeLobbyMsg()` (`useLobbyWsClient.ts:206-224`) parses
`JSON.parse` and checks `"kind" in parsed` plus each known kind's required
fields, returning `null` (not throwing) on anything malformed; a `TODO(bd
open-todo)` comment at `useLobbyWsClient.ts:211-213` states the real
`fromBinary(LobbyServerMsgSchema, …)` call is pending until server-side proto
types for `creeptd/lobby/v1` are generated. **UNDEFINED in production
today**: the protobuf contract exists as generated types and `.proto`
sources but the one client decode path that should use it does not yet —
this is an explicitly tracked gap, not a silent one, but it means "what
happens on an unknown/missing protobuf field" is presently answered by
hand-rolled JSON key-checking, not by protobuf's own unknown-field-preserving
wire semantics.

**`kate-middlechild`**: design-tokens package (`packages/tokens`) — no JSON
data contract consumed at runtime by another service was found; its output
is build-time CSS/TS token artifacts, not a parsed wire format. **N/A** for
this section, not a gap.

---

## 6. VS Code extension contract

### `grimoire-vscode`

`activationEvents` (`package.json`, verbatim): `["onStartupFinished",
"onWebviewPanel:grimoire.details", "onUri"]`.

`contributes` top-level keys: `viewsContainers`, `views`, `commands`,
`submenus`, `menus`, `configuration`.

**Command parity — checked both directions, 20 commands each side, exact
match**: every id in `contributes.commands` (`focusSearch`, `refresh`,
`checkArtifactUpdates`, `updateAll`, `initProject`, `installGrim`,
`openSettings`, `showOutput`, `showGrimInfo`, `openDetails`, `reportBug`,
`requestFeature`, `showCompactRows`, `showComfortableCards`, `showTreeView`,
`showFlatList`, `groupArtifacts`, `ungroupArtifacts`, `expandAll`,
`collapseAll`) has a matching `vscode.commands.registerCommand(...)` call in
`src/extension.ts` (lines 679-862, one call site each). **No mismatch in
either direction** — nothing declared-but-unregistered, nothing
registered-but-undeclared.

**Disposables vs. `context.subscriptions`**: `activate()` spans
`src/extension.ts:121-883`. 8 `context.subscriptions.push(...)` call sites
(lines 123, 338, 369, 470, 479, 554, 653, 655, 678 — some pushing arrays of
multiple disposables in one call) were matched against every
Disposable-producing API call found (`createOutputChannel`, the `Prefetcher`
instance, an `onBusyChange` listener, `registerWebviewViewProvider` ×1,
`registerWebviewPanelSerializer` ×1, `registerUriHandler` ×1, `Watchers`
instance, a `setInterval` wrapped in an ad hoc `{ dispose: () =>
clearInterval(...) }` object at line 653, 3 `vscode.workspace.onDid*`
listeners, and all 20 `registerCommand` calls). **Every one traced is
pushed — no leak found** in `extension.ts` itself (internal disposal inside
`Prefetcher`/`Watchers`/`CatalogService` was not separately audited; those
classes are themselves pushed as single `Disposable`s, so their internal
cleanup is their own concern once `dispose()` is called). No work happens at
module top level — `activate()` (line 121) is the first executable
statement below a single top-level `const` (line 105); `deactivate()` at
line 883 is a no-op stub.

### `vscode-ocx`

`activationEvents`: `["workspaceContains:**/ocx.toml"]`.

`contributes` top-level keys: `commands`, `configuration`, `tomlValidation`.

**Command parity — 9/9, exact match**: `reload`, `reset`,
`restartExtensions`, `showOutput`, `init`, `lock`, `pull`, `upgrade`, `clean`
— all declared in `package.json` and all registered in `src/extension.ts:
143-156`.

**Disposables**: `activate()` spans `src/extension.ts:35-185` (313-line
file). `context.subscriptions.push` at lines 41 (`output`, `status`,
`locator`, and an ad hoc `{ dispose: () => envManager.restore() }`), 142
(all 9 `registerCommand` results), and 164 (`locator.onDidChange`,
`vscode.workspace.onDidChangeConfiguration`,
`vscode.workspace.onDidGrantWorkspaceTrust`). Every Disposable-producing
call in the file is accounted for — **no leak found**. `activate()`'s own
docblock (`extension.ts:29-32`) states the intended contract explicitly:
"Keep this thin … build services, register commands + listeners, push every
disposable. The actual work happens lazily in `reload`" — code matches the
stated intent. No top-level module work; only imports and a `const`-free
interface declaration precede `activate()`.

**Both extensions**: clean bill of health on command parity and disposal
discipline — no UNTESTED/UNDEFINED findings here, a rare fully-honoured
contract with no gap to report.

---

## 7. GitHub Action contract — `setup-ocx`

`action.yml` (verbatim, `/home/mherwig/dev/setup-ocx/action.yml`):

**Inputs** (10): `version` (default `latest`), `github-token` (default
`${{ github.token }}`), `libc` (default `""`), `project` (default
`ocx.toml`), `working-directory` (default `${{ github.workspace }}`),
`groups` (default `""`), `cache` (default `true`), `cache-suffix` (default
`""`), `ocx-home` (default `""`), `managed-config` (default `""`).

**Outputs** (6): `version`, `ocx-path`, `cache-hit`, `project-loaded`,
`project-cache-hit`, `managed-config-adopted`.

**Every input read, with validation** (all 10 accounted for, none
declared-but-unused):
- `working-directory` → `src/project.ts:36`
- `ocx-home` → `src/project.ts:44`
- `project` → `src/project.ts:55`
- `groups` → `src/project.ts:80` (split on `,`, trimmed, empty entries
  filtered — malformed input degrades gracefully to an empty list rather
  than being rejected)
- `cache` → `src/project.ts:85` (`getBooleanInput`, so a malformed value
  throws inside `@actions/core` itself, not this code) and again at
  `src/setup.ts:21`
- `cache-suffix` → `src/project.ts:86`
- `managed-config` → `src/managed-config.ts:33`
- `version` → `src/setup.ts:18`, **validated**: must be `"latest"` or match
  `/^v?\d+\.\d+\.\d+/`, else `throw new Error(...)` (`setup.ts:31-34`)
- `github-token` → `src/setup.ts:19` (passed through untrusted, no format
  check — reasonable, it's opaque to this code)
- `libc` → `src/setup.ts:20`, **validated**: must be `""`, `"gnu"`, or
  `"musl"`, else `throw new Error(...)` (`setup.ts:24-26`)

**Every output set** (all 6 accounted for): `version`/`ocx-path`/`cache-hit`
→ `src/setup.ts:52-54`; `managed-config-adopted` → `src/setup.ts:63`;
`project-loaded`/`project-cache-hit` → `src/setup.ts:87-88`. **No orphans in
either direction** — no declared-but-unread input, no declared-but-unset
output.

**`dist/` drift**: `dist/` **is** committed (`git ls-files dist/` → 6
tracked files: `save-cache/index.js`, `save-cache/licenses.txt`,
`save-cache/package.json`, `setup/index.js`, `setup/licenses.txt`, + 1 more)
and **is** verified against source in CI — the classic Action-drift bug is
guarded here, not present: `taskfile.yml:53-61` defines `check:` as
`fmt:check → lint → test:coverage → build → dist:check`, where `dist:check`
(`taskfile.yml:63-65`) is literally `git diff --exit-code dist/` run
immediately after a fresh `build`; `.github/workflows/verify-basic.yml:27`
runs `task check` in CI. **Docs match code**: `README.md:32-52` documents
all 10 inputs and all 6 outputs with descriptions matching `action.yml`
verbatim; `CLAUDE.md:24` even names the `task dist:check` gate for anyone
reading repo docs rather than the taskfile. **This is the cleanest contract
in the entire audit** — fully declared, fully read/validated, fully
committed-and-verified, fully documented, nothing UNTESTED or UNDEFINED.

---

## Cross-cutting observations

- **Two populations, not one fleet.** `ocx-catalog` and `grimoire-indexer`
  (the two published packages) and `setup-ocx` (the Action) have real,
  tested, named contracts for exit codes, error taxonomy, and I/O
  validation. `grimoire-vscode`/`vscode-ocx` have a real, tested contract
  for their *VS Code-specific* surface (commands, disposables) but zero
  error taxonomy. `fma`, `creeptd-ng/web`, `kate-middlechild`,
  `grimoire-index` have essentially no named contracts at all — errors are
  bare strings, no schema validation, no exit codes (not CLIs).
- **`Error.cause` is unused fleet-wide.** Every rethrow site that wraps a
  lower-level error loses the original error object; this was checked
  explicitly (0 hits for `{ cause:` in all 9 repos) and is worth a rule on
  its own — the language feature exists precisely for this and nothing in
  the fleet uses it.
- **ajv is present-but-decorative.** Both repos that depend on it use it
  only in tests, against hand-rolled runtime validators that duplicate the
  schema's logic by hand. If the schema and the hand-rolled validator drift,
  only `ocx-catalog`'s `schema-agreement.test.ts` would catch it — no
  equivalent test protects `vscode-ocx`'s `ocx.toml.schema.json` against its
  own runtime consumers (search found no non-test consumer of that schema
  at all).
- **Docs-vs-code is bimodal, not partial.** `ocx-catalog` and `setup-ocx`
  each have a documentation page that transcribes their contract exactly and
  was cross-checked line-by-line against source with no discrepancy found.
  `grimoire-indexer` has almost no equivalent page despite having the
  fleet's most sophisticated contract (the fail-closed `validate` gate) —
  the contract is real and well-tested, but undocumented outside code
  comments and tests. Nowhere in the fleet did documentation contradict code
  — the gap is omission, not drift.
- **Central classification is inconsistent even within one repo.**
  `ocx-catalog` repeats the same `instanceof ConfigError`/`BuildError`
  dispatch three times (`main.ts`, `build.ts`, `dev.ts`) rather than
  factoring it once, unlike `grimoire-indexer`'s single `classify()`.

## Top 5 patterns worth encoding as rules

1. **Named exit-code constants + a single classifier function**, modeled on
   `grimoire-indexer/src/cli/exit.ts` + `main.ts:66-94`: one object of named
   codes, one function that maps `unknown` (a caught error) to a code, called
   from exactly one place. Forbid inline numeric-literal exit codes and
   forbid `process.exit()` in favor of `process.exitCode` (buffered-stdout
   truncation risk, documented at `grimoire-indexer/src/cli/index.ts:7-8`).
2. **A typed error class carries a `code`; a central classifier maps `code`
   → exit code — never scatter `instanceof` dispatch across call sites.**
   Encode `ocx-catalog`'s pattern (`class FooError extends Error { readonly
   code: FooErrorCode }`) but flag `ocx-catalog`'s own three-times-repeated
   dispatch as the anti-pattern to avoid, in favor of `grimoire-indexer`'s
   one `classify()`.
3. **A gate/authorization exit code (0 = "proceed") needs an explicit
   fail-closed test for every code path that can short-circuit before your
   own logic runs** — commander's own `--help`/`--version`/parse-error exits
   are the concrete example (`grimoire-indexer/src/cli/main.ts:52-65`, tested
   at `test/cli/exit-codes.test.ts:196-287`). Any CLI whose exit code is read
   as an authorization (CI auto-merge gates, deploy gates) needs this same
   treatment.
4. **Adopt `Error.cause` on every rethrow that wraps a lower-level failure.**
   Zero uses fleet-wide is a real gap, not a style nit — debugging a
   `ConfigError`/`BuildError`/`CliError` currently means losing whatever
   underlying `fs`/`fetch`/JSON-parse error triggered it.
5. **A schema-validation library (ajv or otherwise) that isn't wired into
   the runtime parse path is not a contract — it's decoration.** Either wire
   ajv into the actual `loadConfig`/`validate()` call, or delete it as a
   dependency and keep the schema JSON as documentation-only (with a
   `schema-agreement.test.ts`-style test, which `ocx-catalog` already has and
   is worth requiring anywhere a hand-rolled validator and a JSON Schema
   file both claim to describe the same shape).
