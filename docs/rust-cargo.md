# rust-cargo

Lint declaration, toolchain pinning, dependency gates, CI job design and
release profiles for a Rust workspace that ships prebuilt binaries.

```sh
grim add ghcr.io/ocx-sh/lore/rust-cargo
```

Loads on `**/Cargo.toml`, `clippy.toml`, `rustfmt.toml`, `deny.toml` and
`rust-toolchain.toml`.

## Two layers, and they are adopted differently

**The mechanism** is general Rust practice: policy in `[workspace.lints]`
rather than `RUSTFLAGS`, one denial switch, self-expiring suppressions, a
ratcheted rollout, SHA-pinned actions, an explicit ship profile.

**The selections** — wholesale `pedantic`, the named restriction lints, no
`nursery`, no MSRV matrix, advisories off the PR gate — are *pinned
decisions* derived from an exactly pinned toolchain and a
binary-distribution model. Adopt or replace them wholesale; do not
re-litigate them lint by lint.

## Crates of record

The depth file `crates-of-record.md` carries `DEP-01…08` — the selection
rules — and a table of roughly fifty entries: the crate this family uses
for each job, the superseded crate a model reaches for instead, and **what
changed to make it wrong**.

That last column is the point. Every superseded entry was, at some point,
the correct answer. A model trained before the change still emits it with
no hedge, and the code compiles. The rules make the check mechanical:
liveness from the crates.io JSON API rather than the client-rendered page,
deprecation signals as hard stops, download counts explicitly rejected as
evidence, and every superseded crate denied in `deny.toml` so the check
does not depend on a reviewer noticing.

## It does not glob your workflows

Deliberately. A workflow filename says nothing about its language — a
repository's `.github/workflows/` holds the website deploy, the
notification job and the Rust gate side by side, and matching them all
would pay this file's whole context cost on every one of them.

Writing Rust CI is a subject you arrive at, not a path you land on: the
`rust-quality` index routes here, or read the CI section directly.

## What is in the CI section

Top-level `permissions: {}` with per-job grants; every `uses:` pinned to a
40-character SHA; `cargo deny` split so bans and licences block the PR
while advisories block only on a schedule (the advisory DB changes without
your code, and a PR-blocking advisories gate punishes an unrelated commit
and trains people to bypass it); native test runs on every release-target
OS or a written reason why a target is build-only; and release artifacts
carrying embedded dependency data, an SBOM and a signed provenance
attestation.

## See also

- **`rust-quality`** — the code-level rule set. Loads on `**/*.rs`.
- **`rust-essentials`** — the bundle that installs both.

Apache-2.0 · [source](https://github.com/ocx-sh/grimoire-lore)
