# rust-essentials

The OCX Rust set in one install: the code-level quality rules, the
manifest-level lint, toolchain and supply-chain policy, and the comment rule
shared by every language set.

```sh
grim add ghcr.io/ocx-sh/lore/rust-essentials
```

## Members

| Package | Loads on | Carries |
|---|---|---|
| [`rust-quality`](https://github.com/ocx-sh/grimoire-lore/blob/main/docs/rust-quality.md) | `**/*.rs` | An ~110-line index plus 18 depth files: architecture, errors, async, security, testing, the pinned exit-code contract, diff review, restructuring |
| [`rust-cargo`](https://github.com/ocx-sh/grimoire-lore/blob/main/docs/rust-cargo.md) | `Cargo.toml` and the tool configs beside it | Lint policy, toolchain pinning, CI job design, release profiles, and the crates-of-record table |
| [`code-docs`](https://github.com/ocx-sh/grimoire-lore/blob/main/docs/code-docs.md) | Every source extension, `**/*.rs` included | Fifteen non-negotiables and 20 MUST rows across five depth files: the guard floor, where each clause of a comment goes, record pointers and process IDs, doc text that renders into help and schemas, and the length caps with their per-file ratchet. Shared by every language set |
| [`code-docs-cleanup`](https://github.com/ocx-sh/grimoire-lore/blob/main/docs/code-docs-cleanup.md) | On request (skill) | A ten-step, guard-first procedure for shortening existing comments, gated by a structural diff check and a cold reason re-check per shortened guard |

## Members carry no tag

Not a digest, not an exact version, not a floating major, and not `latest`
— `latest` is a tag like any other, and naming it is still a pin.

A bundle is a *set*, not a snapshot. Its job is to say "these belong
together"; your own `grimoire.lock` is what freezes them. Pinning inside
the bundle duplicates that lock one layer up, where you cannot see it, and
turns every fix to a member into a bundle re-release.

## What you get

Rules load by path, so nothing has to be invoked: editing a `.rs` file
brings the quality index into context, editing `Cargo.toml` brings the
lint and dependency policy. Depth files load only when the work reaches
them.

Every rule carries a verification — a command, a lint name, or a named
reading heuristic — and cites the research it came from. Anything
`cargo clippy -- -D warnings` already catches is deliberately absent.

Written for CLI tools and package managers that ship prebuilt binaries.
Most of it is general Rust; the opinionated parts say so.

Apache-2.0 · [source](https://github.com/ocx-sh/grimoire-lore)
