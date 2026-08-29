# typescript-packaging

The TypeScript declared contract: the tsconfig strictness floor per project
shape, `extends` topology, the manifest, and proving a package that ships a
`bin` actually works.

```sh
grim add ghcr.io/ocx-sh/lore/typescript-packaging
```

Loads on `**/package.json`, `**/tsconfig*.json`, `**/eslint.config.*`,
`**/biome.json` and `**/biome.jsonc` — the files no compiler checks, and
globs the `typescript-quality` sibling deliberately avoids, so the two never
load together.

## The theme: claims nothing executes

A `tsconfig.json` and a `package.json` are mostly assertions, and almost
nothing verifies them. Every rule here exists because an assertion was found
false in a real repository:

- Documentation asserting a compiler-enforced guarantee the resolved config
  did not set — found in identical wording across two repositories, copied
  once and checked by neither. An agent that trusts that claim is worse off
  than one given no claim at all.
- A member config extending a third-party preset instead of the repo base,
  silently dropping every flag the base set. Invisible from either file
  alone; only `tsc --showConfig` shows it.
- `allowUnreachableCode` and `allowUnusedLabels` left unset, which is neither
  on nor off: the compiler emits an editor-only suggestion CI never sees, so
  the code reads as checked and is not.
- A package shipped without its `bin`, past a check that stopped at the
  declaration.

## The glob is `tsconfig*.json`, and that is measured

The narrow `tsconfig.json` form was measured to miss 40% of real tsconfigs —
and the ones it missed carried the most load-bearing decisions: the
mixed-resolution split file, and the monorepo base that was the only place a
strictness posture was stated at all. The rule set says out loud not to
narrow it back.

## `strict` is the floor, not the target

`strict: true` is assumed rather than ruled on — it is the `tsc --init`
default. What it does not imply is most of what matters. This set states the
universal set outside `strict` (`noUncheckedIndexedAccess`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`,
`isolatedModules`, `skipLibCheck`, and the two explicit `false`s), then adds
per shape: `exactOptionalPropertyTypes` and `declaration` for a Node-loaded
package, `noEmit` for a bundled app, `erasableSyntaxOnly` for a
type-stripping runtime like Bun or `node --experimental-strip-types`, where
enums and parameter properties type-check clean and misbehave only when
executed.

Judgement is always on the **resolved** config, never on a file's own text.

## Version-gated, and current

Compiler flags carry the release that introduced them and what an older
compiler does with them. It also names what has been removed:
`importsNotUsedAsValues` and `preserveValueImports` are hard errors from 6.0,
and `"moduleResolution": "node"` is gone in 7.0.2 with no `ignoreDeprecations`
escape. Currency is a rule in itself — an `engines.node` floor on a
end-of-life Node line is a MUST, because the manifest linters check only that
the field is present, never that the number is true.

## Publish verification proves the artifact, not the declaration

`publint` and `@arethetypeswrong/cli` verify that a manifest *declares*
correctly. Only packing the tarball, installing it into a scripts-disabled
sandbox outside the repo, and executing the installed binary proves the
thing works — on every pull request, not only at tag time, because a
release-only gate finds the defect after it is already on the default
branch. The set also covers `exports` key order as match priority, the
shebang npm cannot insert for you, the one `attw` rule an ESM-only package
should ignore and the ones it must not, and reading the published file list
before it is unpublishable-back.

## What it does not cover

It does not require npm as a registry, and it does not pick a package
manager — only that exactly one lockfile kind exists and that it matches the
manager CI installs with. It does not choose your bundler or your linter:
ESLint and Biome are both first-class, and the parity traps between them are
stated rather than resolved by fiat. And it does not restate the code rules
that live in the lint config's own files — for those it carries pointers, not
a second copy.

## Sibling

`typescript-quality` covers the TypeScript itself and loads on `**/*.ts`,
`**/*.tsx`, `**/*.mts` and `**/*.cts`. Its `gate.md` depth file is where lint
adoption lives — how to make a check able to go red at all. Bundled as
`typescript-essentials`.
