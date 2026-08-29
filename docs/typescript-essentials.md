# typescript-essentials

The OCX TypeScript set in one install: `typescript-quality` and
`typescript-packaging`.

```sh
grim add ghcr.io/ocx-sh/lore/typescript-essentials
```

| Member | Loads on | Covers |
|---|---|---|
| `typescript-quality` | `**/*.ts`, `**/*.tsx`, `**/*.mts`, `**/*.cts` | The type-aware lint gate, sixteen non-negotiables, and twelve depth files: gate wiring, types, async and deadlines, errors and untrusted payloads, the CLI exit-code and stream contract, resources and child processes, modules and resolution, security, testing, observability, browser SPAs, extension hosts |
| `typescript-packaging` | `**/package.json`, `**/tsconfig*.json`, `**/eslint.config.*`, `**/biome.json*` | The tsconfig strictness floor per shape, `extends` topology, version-gated compiler flags, `engines`, `exports`, `bin`, dependency placement, lockfiles, and pack-install-execute publish verification |

## Why the two are separate

Their globs do not overlap, which is the only thing that justifies a second
rule file. Editing `package.json` is not writing TypeScript, and loading four
hundred lines of async and error rules while you adjust an `exports` map is
pure cost. Everything that loads on `**/*.ts` lives in one index plus an
on-demand depth directory, because sibling rules that all glob the same
extension just rebuild a monolith with extra steps — every one of them loads
together.

## The premise

Most TypeScript rule sets are unenforceable in the repository that installs
them, and nothing says so. Roughly fifty of the rules they depend on need
type information and are off by default; a config missing
`parserOptions.projectService` fires none of them and reports clean. So this
set opens by making the gate provable, and only then states what the gate
should catch.

## What it is derived from

Measurement of four dissimilar TypeScript targets — a Node CLI that ships a
`bin`, a published typed package, a browser SPA, and an editor extension host
— against a cited research corpus covering the compiler's own release
cycles, the typed-lint and Biome rule indexes, packaging and resolution
behaviour, practitioner argument, and a catalogue of failures that passed
every check that was running at the time.

Every rule carries a runnable verification that was watched go red against a
deliberately planted violation, and states whether empty output is the pass
or the finding — because half these checks are inverted, and a check that
cannot fail launders an unchecked change as a checked one. Findings that
turned out to be one line of tool configuration ship as configuration, not as
prose. Rules restating what a linter already denies were dropped. What
remains is what an agent gets wrong without being told.

The bundle names its members without a tag. It says these belong together;
your `grimoire.lock` is what freezes them.
