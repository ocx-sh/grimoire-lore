# code-docs-essentials

The code-comments set in one install: the `code-docs` rule and the
`code-docs-cleanup` skill, for any language.

```sh
grim add ghcr.io/ocx-sh/lore/code-docs-essentials
```

## Members

| Package | Loads on | Carries |
|---|---|---|
| [`code-docs`](https://github.com/ocx-sh/grimoire-lore/blob/main/docs/code-docs.md) | Every source extension its census reads | Fifteen non-negotiables and 22 MUST rows across five depth files: the guard floor, where each clause of a comment goes, record pointers and process IDs, doc text that renders into help and schemas, and the length caps with their per-file ratchet. Five stdlib checks back the gate |
| [`code-docs-cleanup`](https://github.com/ocx-sh/grimoire-lore/blob/main/docs/code-docs-cleanup.md) | On request (skill) | A ten-step, guard-first procedure for shortening existing comments, gated by a structural diff check and a cold reason re-check per shortened guard |

## When to install this one

The Rust, Python, TypeScript, Go and JVM essentials bundles already include
both members. Install this bundle when you want the comment standards without
a language set, or for source no language set's rules load on yet: Swift, C#, Scala,
C and C++ are globbed by `code-docs` too (`cmake-essentials` covers C and C++ builds, not their comments).

The two ship together because the skill runs the rule's own checks. Installing
`code-docs-cleanup` alone leaves it without its gate.

## Members carry no tag

Not a digest, not an exact version, not a floating major, and not `latest`
— `latest` is a tag like any other, and naming it is still a pin.

A bundle is a *set*, not a snapshot. Its job is to say "these belong
together"; your own `grimoire.lock` is what freezes them.

Apache-2.0 · [source](https://github.com/ocx-sh/grimoire-lore)
