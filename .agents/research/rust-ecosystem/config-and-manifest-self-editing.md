---
title: "Rewriting the User's Own Config Files Without Destroying Them"
topic: config-and-manifest-self-editing
agent: rust-ecosystem-researcher
model: sonnet
date_researched: "2026-08"
sources_count: 14
scope: >
  Which serializer (toml_edit vs toml/serde) every write path in ocx and
  grimoire uses to rewrite grimoire.toml, ocx.toml, and their lockfiles;
  toml_edit's format-preservation guarantees and gaps; lockfile
  byte-determinism discipline; schemars 1.x schema-shape semver exposure;
  and why figment/config are out of scope. Schema *versioning* and
  migrate-or-reject policy belong to the sibling topic
  `on-disk-format-evolution`, not this one.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. **The two-line rule already holds in the codebase, unevenly**: `ocx.toml` goes through a real format-preserving `toml_edit` document editor with a fail-closed reparse-verify guard; `grimoire.toml` does not — it goes through a hand-rolled string-templating re-emitter that drops every comment except one specific directive.
2. `ocx add`/`ocx remove` write `ocx.toml` via [`ocx_lib/src/project/document.rs`](#f1), a `toml_edit::DocumentMut` editor that touches only the keys that changed and leaves everything else — comments, key order, spacing, inline-table style — byte-untouched.
3. `grim add`/`grim config` write `grimoire.toml` via [`command/add.rs::write_config`](#f2), which builds the entire file from scratch with `writeln!` and `toml::Value::…to_string()` for value formatting. Its own doc comment calls this "the lossy re-serialize" and preserves only a leading `#:schema` directive by string-matching it before the rewrite — every other user comment or blank line is gone on the next `grim add`.
4. Both repos' lockfiles (`ocx.lock`, `grimoire.lock`) are written with plain `toml::to_string_pretty` over a **borrowed, pre-sorted serialize view** (`SerializableView`) built specifically to guarantee byte-stable output — not raw serde-derive output on the domain struct. That is deliberate determinism discipline, and it is the right choice for a machine-owned file: reserializing from a typed struct is *correct* there because there is no user formatting to lose.
5. Neither repo's lockfile serializer relies on `toml`'s own map-ordering guarantee. `toml::map::Map` is `BTreeMap`-backed by default (alphabetical) and only becomes `IndexMap`-backed under the opt-in `preserve_order` feature — [confirmed from the crate source](#f7). Both repos instead do an **explicit `.sort_by()` on `(group, name)`** before serializing, because alphabetical-only order is not the order they want; this is the TOML-side equivalent of the `indexmap`/`serde_json_canonicalizer` discipline the OCI/JSON side already has.
6. No `HashMap` reaches a lockfile serializer in either repo. `HashMap` does appear in in-memory-only structures (auth caches, transport stubs, an ambient `Config`'s `registries`/`mirrors` maps) that are never the type handed to `toml::to_string`.
7. `toml_edit` (0.25.x, both repos) explicitly documents that it preserves "comments, spaces and relative order of items," with one documented exception: order of *dotted keys* is not preserved ([toml-rs/toml#163](https://github.com/toml-rs/toml/issues/163)).
8. `toml_edit` does **not** guarantee CRLF line endings or a leading UTF-8 BOM survive a round-trip — it normalizes CRLF to LF and drops a BOM on any document it touches, even one it did not itself write. ocx's own test suite pins this exact behavior (`indentation_survives_and_crlf_normalises`, `a_byte_order_mark_is_dropped`) as "the day it stops is visible," not as a promise it will never change.
9. `toml_edit` on key removal does not orphan a *following* key's attached comment: ocx's `remove_drops_one_key_and_keeps_the_rest_verbatim` test shows removing one binding leaves a sibling binding's trailing `# keep this` comment intact — but this is verified by ocx's own test, not documented as a toml_edit crate-level guarantee, so it should be treated as "true for this crate version, re-verified on every `toml_edit` bump," not as an API contract.
10. ocx's editor is **fail-closed**: after every edit it reparses the rendered text and asserts the reparsed struct equals the intended mutation (`ProjectErrorKind::ManifestEditDiverged`); a mutation the editor cannot express aborts the write rather than silently dropping the change or falling back to a lossy whole-file rewrite. `grimoire.toml`'s writer has no equivalent verify-before-write step because it never claims to be format-preserving in the first place.
11. grimoire *does* have a real `toml_edit` splice editor — [`src/install/toml_splice.rs`](#f3) — but it edits a *third-party* file (Codex's `config.toml`, for MCP server registration), not grimoire's own `grimoire.toml`. The mechanism ocx applies to its own primary config, grimoire applies only to someone else's config.
12. `schemars` 1.x's own docs state verbatim: "The exact structure of generated schemas … may change between versions of schemars - this is not considered a breaking change" ([docs.rs/schemars](#f9)). Neither repo pins that shape: both `docs/src/schemas/*.schema.json` (grimoire) and the `ocx_schema` generator output are regenerated fresh from the live `schemars::schema_for!` call on every docs build and are **gitignored, not committed** — there is no golden/snapshot test comparing generated output to a fixed file in either repo.
13. That means a `schemars` minor bump cannot break CI in either repo today (nothing asserts on schema shape) but *can* silently change the publicly hosted schema (`https://grimoire.rs/schemas/*.json`, `https://ocx.sh/schemas/*.json`) the next time docs are rebuilt, with zero signal to anyone — no red CI, no diff review, no changelog entry.
14. `figment` and `config` (config-rs) are both read/merge libraries with no format-preserving write-back at all; `config` depends on plain `toml` (serde) for its TOML source, the same lossy mechanism this topic is steering away from. Neither offers anything the write-path problem needs.
15. Both repos already have working hand-rolled precedence merging (ocx's `ConfigLoader` tiered discovery in `config/loader.rs`; grimoire's layered `project_config.rs`/`global_config.rs`) with zero references to `figment` or `config` anywhere in either tree — adding either crate would replace code that already works and would still leave the write-path gap (item 3) completely unaddressed, since neither crate writes anything back.
16. `toml_edit` released a new parser/writer in 0.23.0 (2025-07-08) and a breaking 0.24.0 (2025-12-18, `Table::set_position` signature change, TOML 1.1 support); both repos already pin `toml_edit = "0.25"`, current as of this research (2026-08).
17. ocx's lockfile schema carries a machine-generated warning (`$comment: "machine-generated; format may evolve across OCX versions — do not hand-edit"`) baked into the generated JSON Schema itself — a documentation-level signal, not an enforcement mechanism, but worth noting as a pattern other machine-owned files could copy.
18. The one place either repo does a `toml::Value` serde round-trip on TOML *text* that a human could plausibly have influenced is [`managed_config/persistence.rs`](#f6): stripping a stray `[managed]` key from a fetched fleet-config payload before persisting it locally. That payload is admin-authored and remote-fetched, not the local user's own file, so it is a defensible exception, not a violation of the rule — but it is worth a code comment saying so explicitly, since nothing currently marks the distinction at that call site.

## Findings

### 1. `ocx.toml`: format-preserving edit with a fail-closed verify gate {#f1}

`crates/ocx_lib/src/project/document.rs` is the sole write path for `ocx add`/`ocx remove`. Its module doc states the problem directly:

> "`ocx add` / `ocx remove` mutate a typed config, but the file on disk is a document a person wrote: comments … declaration order, spacing. Serializing the struct reproduces none of that … so a mutation used to hand the user back a normalised file with their content stripped (issue #256)."

The fix: parse `original` into a `toml_edit::DocumentMut`, apply only the deltas `apply()` can express against the typed `ProjectConfig`, render, then **reparse the rendered text and assert it equals `candidate`** before returning it as the write payload. A mutation `apply()` cannot express — an unsynced surface, an unexpected document shape — returns `None` and the whole write aborts with `ProjectErrorKind::ManifestEditDiverged` rather than silently losing data or falling back to a lossy rewrite. This is the strongest evidence in either tree of "format-preserving write with a verification gate," and it is worth citing verbatim as the target shape for the equivalent `grimoire.toml` fix.

The module's own doc also names two things `toml_edit` explicitly does **not** preserve on this document: CRLF line endings normalize to LF, and a leading BOM (which PowerShell 5.1 writes) is dropped — "That is what the whole-file serializer did too, so both are the status quo rather than a regression." Both are pinned by dedicated tests (`indentation_survives_and_crlf_normalises`, `a_byte_order_mark_is_dropped`).

### 2. `grimoire.toml`: a hand-rolled re-emitter, not `toml_edit`, not full serde {#f2}

`src/command/add.rs::write_config` is grimoire's equivalent write path. It is neither of the two textbook options:

- It does **not** derive `Serialize` on the config struct and call `toml::to_string` — `RawConfig`/`ProjectConfig` in `src/config/project_config.rs` derive only `Deserialize`, confirmed by grep; there is no `Serialize` impl to reserialize from.
- It does **not** use `toml_edit::DocumentMut` either, despite `toml_edit` being a direct dependency of this same crate specifically because "the plain `toml` crate's only mode … would reorder keys and drop comments" (Cargo.toml's own dependency comment, quoted in Finding 4).

Instead it manually walks the typed `ConfigOptions`/`RegistryConfig`/`DesiredSet` and emits TOML text section-by-section with `writeln!` and `toml::Value::…to_string()` used only for per-value escaping. Its own doc comment: *"A `#:schema` directive in the existing file's leading comment block is preserved at the top of the rewritten file"* — implying, correctly, that nothing else survives. A companion helper `preserved_schema_directive()` explicitly documents this as a "preserve-only seam for `write_config`: the lossy re-serialize drops comments, but the schema directive is machine-meaningful … so it survives a rewrite." This is grimoire's own code calling its own mechanism lossy. Every hand-written comment or blank line a user adds to `grimoire.toml` outside the schema directive is destroyed on the next `grim add`/`grim config` write — exactly the defect class this research topic exists to catch.

Because the emitter is hand-templated rather than a naive serde dump, it does get some things right that a raw derive-reserialize would not (section ordering matches TOML's own dotted-table-must-precede-subtable rule, an all-default sub-table is omitted so a config predating that field stays byte-identical) — but "comments and blank lines a person wrote" is not one of the things it gets right, and the gap is real and shipping today.

### 3. grimoire *does* have a real `toml_edit` splice mechanism — for someone else's file {#f3}

`src/install/toml_splice.rs` is a genuine span-preserving `toml_edit` splice editor, the TOML sibling of `json_splice.rs`. Its header states the exact rationale that should also apply to `grimoire.toml`:

> "Codex's `config.toml` is a user-owned file that may carry arbitrary hand-authored settings and comments outside the managed `mcp_servers.<name>` table, so a parse-and-reserialize rewrite (the plain `toml` crate's only mode) would reorder keys and drop comments. This module edits through `toml_edit` instead."

This is used only to register grimoire's own MCP server entry inside a *third-party tool's* config file (Codex). The mechanism grimoire correctly applies to someone else's user-authored TOML is not applied to its own. `upsert_member`/`remove_member` compare values *semantically* (parsed, not byte-wise) so a member already equal to the target value — up to formatting — reports `Splice::Unchanged`, and that unchanged-detection is unit-tested (`upsert_identical_value_is_unchanged_despite_formatting`).

### 4. Dependency provenance already states the rule, just not where `grimoire.toml` is written {#f4}

Both repos' root `Cargo.toml` carry an in-line comment on `toml_edit` explaining exactly why it exists, side by side with plain `toml`:

- ocx: `toml_edit = "0.25"` — *"Format-preserving TOML editing (`ocx.toml` mutations keep comments + order)."*
- grimoire: `toml_edit = "0.25"` — *"Span-preserving TOML edits for Codex's `config.toml` MCP registration — the `toml` crate above only round-trips through a full parse/reserialize, which would reorder keys and drop comments."*

ocx's comment names its own primary config as the target. grimoire's names only the third-party file. Neither comment is wrong about what `toml_edit` is for — grimoire's comment is simply incomplete about where else the same argument applies.

### 5. Lockfiles: `toml::to_string_pretty` over an explicitly sorted, borrowed view — the right call, and the right discipline {#f5}

`ocx.lock` (`crates/ocx_lib/src/project/lock.rs::ProjectLock::to_toml_string`) and `grimoire.lock` (`src/lock/grimoire_lock.rs`) both:

1. Never call `toml::to_string_pretty` on the live domain struct directly.
2. Build a small `SerializableView` struct holding **borrowed references** into pre-sorted data (ocx: `sorted_refs.sort_by(|a, b| (a.group.as_str(), a.name.as_str()).cmp(...))`; grimoire: a sorted `[[skill]]`/`[[rule]]`/`[[agent]]`/`[[bundle]]` emission via `serialize_artifact_views`).
3. Serialize *that* view with `toml::to_string_pretty`.

ocx's own comment names the intent directly: *"Sort by (group, name) for byte-stable output."* This is the correct pattern for a machine-owned file — deterministic across runs and platforms, diffable, and it does not depend on `toml::map::Map`'s incidental default ordering (`BTreeMap`, alphabetical — see Finding 7) because an alphabetical-only order is not what either lockfile actually wants (grouping matters more than alphabetization). It is the direct TOML analogue of what `indexmap` (ocx, JSON/OCI-side) and `serde_json_canonicalizer` (ocx, JSON canonicalization) do for the JSON/OCI-manifest side of the same repos — explicit, hand-verified ordering discipline rather than relying on a library default.

### 6. `HashMap` does not reach a lockfile serializer, and `toml::map::Map`'s own default already would not have been the risk {#f6}

Grep across both `project/lock.rs`/`project/config.rs` (ocx) and `lock/*.rs`/`config/*.rs` (grimoire) turns up no `HashMap` in any struct that is ever handed to `toml::to_string*`. The `HashMap`s that do exist in these trees are in-memory-only: auth caches, transport test stubs, and — the one case worth a closer look — `ocx_lib/src/config.rs`'s ambient `Config { registries: Option<HashMap<String, RegistryConfig>>, mirrors: Option<HashMap<String, MirrorConfig>>, .. }`. That struct is read (`toml::from_str`) at multiple call sites but is never the argument to a `toml::to_string` write path in this grep — `Config` is consumed, not re-persisted. If a future change ever serializes `Config` back to disk, the `HashMap` fields would need to become `BTreeMap` or get an explicit sort first; today they are latent risk, not live risk.

Independently: `toml::map::Map<K, V>` — the backing type `toml::Value::Table` and any bare `#[derive(Serialize)] struct` field of type `toml::Table` uses — is `BTreeMap`-backed by default and only becomes `IndexMap`-backed under the opt-in `preserve_order` Cargo feature, [confirmed directly from the `toml` crate source](#f7). So even a naive `toml::to_string(&some_hashmap_derived_toml_table)` would not have been *nondeterministic* in the way raw `std::collections::HashMap` iteration is (`HashMap`'s randomized `SipHash` seed changes order per-process) — it would have been merely alphabetical, which is deterministic but not the order either lockfile wants. The real reason both repos hand-sort is presentation/diffability, not determinism-safety; determinism-safety was never actually at risk given `toml`'s own default.

### 7. `toml_edit`'s documented guarantees and documented gap {#f7}

`toml_edit`'s own docs (crate root) state it lets you "parse and modify toml documents, while preserving comments, spaces _and relative order_ of items." The one documented exception in the crate's own docs: **order of dotted keys is not preserved** ([toml-rs/toml#163](https://github.com/toml-rs/toml/issues/163)). CRLF normalization and BOM-dropping on any document it touches (not just documents it wrote) are *not* stated as guarantees anywhere in the crate docs — they are simply the parser's/writer's behavior, and ocx's test suite is what actually pins them for this codebase, with comments acknowledging they are "status quo," i.e., could change on a future `toml_edit` upgrade and would need re-verifying, not an API contract to lean on blindly.

`toml_edit` had a new parser/writer in **0.23.0 (2025-07-08)** and a breaking **0.24.0 (2025-12-18)** (`Table::set_position` changed from `isize` to `Option<isize>`, TOML 1.1 support added) before settling at the `0.25.x` line both repos pin today (patches through 0.25.13, 2026-07-14). A workspace bump across the 0.24 boundary is a real breaking-change risk worth flagging in dependency-update review, separate from the ordinary patch-bump case.

### 8. Byte-identical round-trip: the test shape already exists in ocx {#f_roundtrip}

`crates/ocx_lib/src/project/document.rs`'s test module contains the exact shape this topic was asked to specify, already written and passing:

```rust
#[test]
fn add_leaves_untouched_binding_byte_identical() {
    let original = "[tools]\ncmake    =    \"example.com/cmake:3.28\"\n";
    let rendered = render_after_add(original, "shellcheck", "0.11", None);
    assert!(
        rendered.contains("cmake    =    \"example.com/cmake:3.28\""),
        "an unchanged binding keeps its own spacing: {rendered}"
    );
}

#[test]
fn add_then_remove_round_trips_byte_identical() {
    let original = format!("{SCHEMA}\n# fixture\n\n[tools]\ncmake = \"example.com/cmake:3.28\"\n");
    let after_add = render_after_add(&original, "shellcheck", "0.11", None);
    let after_remove = render_after_remove(&after_add, "shellcheck");
    assert_eq!(after_remove, original, "add then remove must restore the original bytes");
}
```

The general shape to generalize into a rule: **(a)** parse a fixture with idiosyncratic formatting (irregular spacing, a trailing inline comment, a quoted key, mixed indentation) into the editor; **(b)** apply a mutation that does *not* touch a given key; **(c)** assert the untouched key's exact substring — value, spacing, and comment — is present verbatim in the output; **(d)** separately, apply a mutation and its exact inverse and assert the round-trip output equals the original input byte-for-byte (`assert_eq!`, not `contains`). Neither `grimoire.toml`'s writer nor `ocx.toml`'s config struct-level serde derive can pass (c) or (d) today except through the `toml_edit` document path — which is precisely why the test only exists for `ocx.toml`.

### 9. `schemars` 1.x: no shape stability guarantee, and neither repo pins the shape {#f9}

`schemars`'s own docs state, verbatim: *"The exact structure of generated schemas (both for built-in implementations on standard library types, and for `#[derive(JsonSchema)]` implementations) may change between versions of schemars - this is not considered a breaking change."* Confirmed independently from both the [GitHub README](#s-schemars-readme) and [docs.rs crate root](#s-schemars-docsrs). Both repos are on `schemars = "1"`/`"1.2.1"`, i.e., inside the exact major version this policy governs — any `1.x → 1.y` bump is licensed by upstream to change output shape without notice.

Neither repo has a test that would catch it:

- grimoire's `taskfiles/schema.taskfile.yml` runs the compiled `grim schema --kind {config,publish,lock}` and writes straight into `docs/src/schemas/*.schema.json`; the task's own description states *"The schemas are generated artifacts, NOT committed: they are gitignored and the docs build … regenerates them on every run, so the published site can never drift from the parser."* That sentence is true about drift from the *parser* and silent about drift in *schemars' own rendering choices* between versions — a schemars bump changing (for example) how an `Option<T>` or an enum renders would flow straight through to the next docs deploy with zero required review.
- ocx's `crates/ocx_schema` binary/library generates schemas the same way (`schema_for(kind)` → `generator.into_root_schema_for::<T>()`) with no committed fixture anywhere in the tree (`find … -iname "*.schema.json"` returns nothing outside `.cache`/vendored paths).

Grep for `insta`, `assert_snapshot`, or any golden-file comparison touching schema output in either repo returns nothing. This means: a `schemars` minor bump **cannot break CI today** in either repo (there is nothing to fail), but it **can silently republish a changed schema** at `https://grimoire.rs/schemas/*.json` or `https://ocx.sh/schemas/*.json` the next time docs are built — no diff, no changelog line, no review gate. That is the actual exposure, and it is a CI-signal gap, not (yet) a correctness bug.

### 10. `figment` / `config` ruled out: no write-back, and nothing broken to replace {#f10}

[`figment`](#s-figment-docsrs) is a layered-source merge library (`env`, `toml`, `json`, `yaml` providers, profiles, provenance tracking on read) with no write-back or format-preserving edit capability documented anywhere in its API surface — it is a read/merge library end to end. [`config`/config-rs](#s-config-docsrs) is the same shape and, notably, depends on plain `toml` (`toml ^1.0.6`) for its TOML source — the exact serde-reserialize mechanism this topic is steering codebases *away from* for user-authored files. Adding either crate would touch only the read/merge side of config handling, which both repos already do by hand (ocx's `ConfigLoader` tiered discovery in `config/loader.rs`; grimoire's layered `project_config.rs` + `global_config.rs` merge), and neither crate does anything for the actual defect (Finding 2). There is nothing in either dependency graph today referencing `figment` or `config` — this is a clean, evidence-backed rule-out, not a hypothetical one.

## Normative guidance candidates

1. **User-authored files (`ocx.toml`, `grimoire.toml`, and any file a person hand-edits) MUST be rewritten through a `toml_edit::DocumentMut` splice/document editor, never through `toml::to_string`/`toml::to_string_pretty` on a domain struct and never through hand-built `writeln!` templating.**
   Rationale: a serde reserialize has no concept of a comment, and a hand-templated emitter (grimoire's current `write_config`) reproduces the same defect by construction — it can only emit what the typed model knows about, so anything the model doesn't carry (a comment, a blank line, an inline-table style choice) is gone.
   VERIFICATION: grep for `toml::to_string` / `toml::to_string_pretty` / hand-rolled `writeln!("... = {}")` loops anywhere the target path is a file with `.toml` under a project or user home directory that is not a `*.lock` file; every hit that is not inside a `toml_edit` splice module is a finding.

2. **Every format-preserving write MUST reparse its own output and assert semantic equality with the intended mutation before returning it as the write payload; a mutation the editor cannot express MUST fail closed, never fall back to a lossy whole-file rewrite.**
   Rationale: this is what makes `ocx.toml`'s editor trustworthy — `ProjectErrorKind::ManifestEditDiverged` catches every future editor bug the moment it would silently drop data, rather than shipping a corrupted config.
   VERIFICATION: for each format-preserving writer, confirm a test exists analogous to ocx's `a_candidate_the_sync_cannot_express_fails_closed` — a mutation to a field the editor does not sync must return an error, not silently succeed.

3. **`grimoire.toml`'s write path MUST move to the same `toml_edit::DocumentMut` mechanism grimoire already uses for `toml_splice.rs`, replacing `command/add.rs::write_config`'s hand-rolled emitter.**
   Rationale: the crate already has the dependency, the pattern, and the exact rationale written down (Finding 3) for a different file; this closes the one gap the whole topic exists to catch, on the file it matters most for.
   VERIFICATION: after the change, a `grimoire.toml` fixture with a hand-written comment anywhere outside the managed sections must retain that comment, byte-for-byte, after `grim add`/`grim config` — add the ocx-style `add_preserves_every_comment` test.

4. **Machine-owned files (lockfiles, generated snapshots) MUST be serialized via `toml::to_string_pretty` over an explicitly, deterministically ordered — never raw `HashMap`-iteration-ordered — view, not through `toml_edit`.**
   Rationale: `toml_edit` is solving the wrong problem for a file no human hand-edits; a struct reserialize is correct there, and both repos already do this well (`SerializableView` + explicit `.sort_by`) — codify it so it doesn't regress.
   VERIFICATION: `cargo test` a round-trip that serializes the same logical lock content built from two different insertion orders and asserts identical output bytes (`assert_eq!`, not `assert_eq!` up to key reordering).

5. **Ship the byte-identical round-trip test shape (Finding 8) for every `toml_edit`-backed writer, not only `ocx.toml`'s.**
   Rationale: it is the cheapest possible regression guard against a future `toml_edit` upgrade or a refactor silently reintroducing whole-file reserialization, and the shape is already proven out.
   VERIFICATION: one test per writer: apply a mutation and its exact inverse, `assert_eq!(after, original)`.

6. **Do not add `figment` or `config` (config-rs) to either workspace.**
   Rationale: both are read/merge-only with no format-preserving write-back, `config`'s TOML support is backed by plain `toml` (the mechanism this topic argues against), and both repos already have working hand-rolled precedence layering that neither crate would meaningfully simplify.
   VERIFICATION: a dependency-addition PR touching either crate should be rejected in review unless it demonstrably deletes more precedence-merging code than it adds — cite this finding.

7. **Pin `schemars`-generated schema shape with a committed golden/snapshot test per published schema kind, gated in CI — separately from (not instead of) the docs-build regeneration both repos already do.**
   Rationale: schemars 1.x explicitly disclaims shape stability across minor versions (Finding 9); without a pinned fixture, a `schemars` bump silently republishes a changed public schema with zero review signal.
   VERIFICATION: `cargo insta test` (or an `assert_eq!` against a committed `.schema.json` fixture) for each of `Config`, `ProjectConfig`, `ProjectLock`, `PatchDescriptor` (ocx) and `RawConfig`, `PublishManifest`, `RawLock`, `McpDescriptor` (grimoire); a `schemars` version bump that changes any fixture must fail CI until the fixture is reviewed and updated.

8. **At the one legitimate `toml::Value` round-trip on non-lockfile TOML text — `managed_config/persistence.rs`'s `[managed]`-section strip on a fetched fleet payload — leave a comment stating explicitly that this file is remote/admin-authored, not the local user's file, so it does not read as a rule violation on the next audit.**
   Rationale: the exception is correct today but undocumented at the call site; a future reviewer applying rule 1 mechanically would flag it as a bug.
   VERIFICATION: the comment exists and names the reason (admin-authored payload, not user-edited).

## AI-agent angle

- **The mistake an agent makes without this rule**: told to "add a field to `grimoire.toml`'s writer" or "add a new key to the config," an agent's shortest path is `#[derive(Serialize)]` plus `toml::to_string(&config)`, or extending the existing `write_config` template function — both look like local, in-pattern changes and both are wrong for a user-authored file. Nothing in a compiler error or a passing `cargo test` run flags this: the file writes, parses back fine, and the regression (a user's hand-written comment vanishing) only shows up in a human's next `git diff` of their own config, which an autonomous agent never sees.
- **Smallest mechanical check**: grep the diff for any new or changed call to `toml::to_string`/`toml::to_string_pretty` and check whether its target path can end in a file the user hand-edits (not a `*.lock` file, not a path under a `snapshot`/`generated`/`cache` directory). Any hit is a stop-and-ask, unless it is inside a `toml_edit`-based splice/document module.
- **Second check, cheap and durable**: for any change inside `command/add.rs::write_config` (or its future `toml_edit` replacement), require the PR/commit to include a round-trip test in the byte-identical shape (Finding 8) exercising a fixture with a hand-written comment outside the touched section. Absence of that test on a change to this function is itself the signal something regressed, without needing to read the diff's logic at all.
- **Schema check**: any diff that bumps `schemars` in `Cargo.lock` should be paired with a diff to the committed schema fixtures (rule 7) or an explicit note that none changed — a `schemars` bump with zero fixture diff and zero fixture-test run is the exact silent-shape-drift scenario Finding 9 describes.

## Contested / evolving

- **`toml_edit`'s CRLF/BOM normalization is documented in-repo as "status quo," not as a permanent guarantee.** ocx's own tests explicitly frame this as "pinned so the day it stops is visible" rather than relying on it as an API contract — meaning the current behavior could change in a future `toml_edit` release, and the correct response is "the test fails, go read the new changelog," not "assume it still holds." Direction: stable in practice across the 0.23–0.25 line observed (2025-07 through 2026-07), but explicitly not promised.
- **`toml_edit` had two breaking-surface releases in the last year** (0.23.0 new parser/writer, 2025-07-08; 0.24.0 signature changes + TOML 1.1 support, 2025-12-18) before the current 0.25.x line. A workspace bump crossing either boundary is a real audit point, not a routine patch bump — worth a standing note in dependency-update review rather than a one-time fix.
- **schemars' no-shape-guarantee policy is a stated, current position (1.x line, checked 2026-08), not a historical artifact** — it is not expected to change with a future 2.0, since the stated rationale (schema generation is inherently tied to evolving best practices for representing Rust types as JSON Schema) is structural to the library's design goal, not a temporary caveat.
- **`grimoire.toml`'s writer gap (Finding 2) is a live, unresolved defect as of this research**, not a design decision defended anywhere in the codebase — the code's own comments already call it "lossy." This is squarely actionable, not merely observed.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `/home/mherwig/dev/ocx/crates/ocx_lib/src/project/document.rs` <a id="f1"></a> | ocx source: the actual `toml_edit`-based `ocx.toml` writer + its test suite | repo HEAD, 2026-08 | Primary evidence for the working format-preserving pattern, the fail-closed guard, and the byte-identical round-trip test shape |
| `/home/mherwig/dev/grimoire/src/command/add.rs` <a id="f2"></a> | grimoire source: `write_config`, the hand-rolled `grimoire.toml` re-emitter | repo HEAD, 2026-08 | Primary evidence for the finding — its own doc comments call the mechanism lossy |
| `/home/mherwig/dev/grimoire/src/install/toml_splice.rs` <a id="f3"></a> | grimoire source: real `toml_edit` splice editor, used only on Codex's `config.toml` | repo HEAD, 2026-08 | Shows grimoire already has the right pattern and rationale, just not applied to its own primary config |
| `/home/mherwig/dev/ocx/Cargo.toml`, `/home/mherwig/dev/grimoire/Cargo.toml` <a id="f4"></a> | Root dependency manifests with inline rationale comments on `toml`/`toml_edit` | repo HEAD, 2026-08 | The repos' own stated reasons for holding both crates side by side |
| `/home/mherwig/dev/ocx/crates/ocx_lib/src/project/lock.rs`, `/home/mherwig/dev/grimoire/src/lock/grimoire_lock.rs` <a id="f5"></a> | Lockfile serializers: sorted borrowed `SerializableView` + `toml::to_string_pretty` | repo HEAD, 2026-08 | Evidence for the machine-owned-file determinism discipline |
| `/home/mherwig/dev/ocx/crates/ocx_lib/src/managed_config/persistence.rs` <a id="f6"></a> | The one non-lockfile `toml::Value` round-trip, on a remote fleet-config payload | repo HEAD, 2026-08 | The single edge case worth flagging rather than a rule violation |
| [github.com/toml-rs/toml — `crates/toml/src/map.rs`](https://raw.githubusercontent.com/toml-rs/toml/main/crates/toml/src/map.rs) <a id="f7"></a> | `toml` crate source, the `Map`/`MapImpl` type definition | fetched 2026-08 | Primary source confirming `BTreeMap` default, `IndexMap` only under `preserve_order` |
| [docs.rs/toml_edit](https://docs.rs/toml_edit/latest/toml_edit/) | `toml_edit` crate-root docs | fetched 2026-08 | Primary source for the "comments, spaces and relative order" guarantee and the dotted-key-order exception |
| [github.com/toml-rs/toml — `toml_edit` CHANGELOG.md](https://github.com/toml-rs/toml/blob/main/crates/toml_edit/CHANGELOG.md) | `toml_edit` changelog | fetched 2026-08, entries through 0.25.13 (2026-07-14) | Primary source for the 0.23/0.24 breaking-release timeline both repos have already crossed |
| [docs.rs/schemars](https://docs.rs/schemars/latest/schemars/) <a id="s-schemars-docsrs"></a> | `schemars` crate-root docs | fetched 2026-08 | Primary source, independently confirming the no-shape-guarantee policy |
| [github.com/GREsau/schemars README](https://github.com/GREsau/schemars) <a id="s-schemars-readme"></a> | `schemars` project README | fetched 2026-08 | Second primary confirmation of the exact same policy wording |
| `/home/mherwig/dev/grimoire/taskfiles/schema.taskfile.yml`, `/home/mherwig/dev/grimoire/src/command/schema.rs` | grimoire's schema-generation task + `grim schema` command | repo HEAD, 2026-08 | Confirms schemas are gitignored/regenerated, not committed/pinned |
| `/home/mherwig/dev/ocx/crates/ocx_schema/src/lib.rs` | ocx's schema-generation library | repo HEAD, 2026-08 | Confirms same no-fixture pattern in the sibling repo, plus the `$comment` machine-generated warning on the lock schema |
| [docs.rs/figment](https://docs.rs/figment/latest/figment/) <a id="s-figment-docsrs"></a> | `figment` crate-root docs | fetched 2026-08 | Primary source: read/merge-only, no write-back, used for the rule-out |
| [docs.rs/config](https://docs.rs/config/latest/config/) <a id="s-config-docsrs"></a> | `config` (config-rs) crate-root docs | fetched 2026-08 | Primary source: read/merge-only, backed by plain `toml` internally, used for the rule-out |
