---
title: On-Disk Format Evolution — Lockfiles, Caches, and Manifests
agent: rust-data-and-serialization
model: sonnet
date_researched: 2026-08
sources_count: 15
scope: >
  How a struct serialized to disk by one binary version stays correctly
  readable (or correctly refuses to be read) by an older or newer binary of
  the same tool. Covers schema-version discriminant shape, strict-vs-tolerant
  parsing as a per-type decision, required-field validation at the
  deserialization boundary, additive-only wire enums, round-trip fidelity on
  rewrite, and version-fixture testing. Grounded in grim's own
  `grimoire.lock`, `tags.json` cache, and `state.json` install-state formats,
  cross-checked against Cargo's lockfile-version history and serde's
  documented attribute semantics.
---

## Table of contents

1. [Findings](#findings)
   1. [The mandatory shape of a serialized-to-disk struct](#1-the-mandatory-shape-of-a-serialized-to-disk-struct)
   2. [Version field shape: integer, semver, serde_repr enum](#2-version-field-shape-integer-semver-serde_repr-enum)
   3. [The read path: `match version`, never `from_str`](#3-the-read-path-match-version-never-from_str)
   4. [The harder direction: older binary meets newer file](#4-the-harder-direction-older-binary-meets-newer-file)
   5. [Cargo.lock as the worked example](#5-cargolock-as-the-worked-example)
   6. [`deny_unknown_fields` vs tolerant parsing — a per-type decision](#6-deny_unknown_fields-vs-tolerant-parsing--a-per-type-decision)
   7. [`serde_ignored`: tolerant but reported](#7-serde_ignored-tolerant-but-reported)
   8. [`#[serde(default)]` on fields that are actually required](#8-serdedefault-on-fields-that-are-actually-required)
   9. [`#[non_exhaustive]` and additive-only wire enums](#9-non_exhaustive-and-additive-only-wire-enums)
   10. [Enum representations and their unknown-variant failure modes](#10-enum-representations-and-their-unknown-variant-failure-modes)
   11. [Round-trip fidelity: unknown fields and comments](#11-round-trip-fidelity-unknown-fields-and-comments)
   12. [Testing: fixtures, forward-compat tests, semver-checks](#12-testing-fixtures-forward-compat-tests-semver-checks)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

---

## Summary

1. Every on-disk struct's version field is the **first field**, present from the file's very first released shape — never added in a "v2" retrofit, because a file with no version field is indistinguishable from a corrupt one.
2. The read path is an explicit `match version { V1 => .., V2 => .., other => refuse }` — never a bare `serde_json::from_str::<Current>(..)` that lets an unknown shape fail with an opaque, unrelated field error.
3. `serde_repr`'s `Deserialize_repr` on a closed `#[repr(u8)] enum` rejects an unrecognized discriminant at the serde layer with no silent fallback — grim already uses this for `LockVersion`, `TagCacheVersion`, and `InstallStateVersion`.
4. A bare integer version can only ever match exactly; a semver-shaped version (`major.minor.patch`) can express "compatible enough to read" via `^`-style matching (same major, minor ≥) — but grim, Cargo, and most CLI on-disk formats deliberately use a bare integer because on-disk compatibility is binary (readable/not), not a range.
5. The harder direction is **older binary meets newer file**: it must not crash, must not silently discard fields, and must produce a message telling the user to upgrade — not "invalid data". grim's `install_state.rs` implements this with a two-stage probe: a typed `VersionProbe` first, then a raw-`u8` `RawVersionProbe` fallback that distinguishes "future version" from "genuinely corrupt" and names the version number in the error.
6. Cargo took 3+ years per lockfile-version bump (V2: 2019 → default 1.41; V3: 2020 → default 1.53; V4: 2024 → default 1.83) specifically to let older-but-still-maintained Cargo versions ship *read* support before any project's default lockfile could contain the new format.
7. An old-enough Cargo meeting a `version = 4` lockfile does not silently mis-parse it — it hits an explicit `bail!` with `"lock file version `{n}` was found, but this version of Cargo does not understand this lock file, perhaps Cargo needs to be updated?"`.
8. `#[serde(deny_unknown_fields)]` and tolerant (flatten-to-extras) parsing are not a global default — they are a **per-type decision**, and the two must never be mixed on the same struct (`deny_unknown_fields` is documented as incompatible with `#[serde(flatten)]`).
9. grim's own codebase argues both sides correctly: `grimoire.lock`, `tags.json`, and `state.json` are strict (`deny_unknown_fields`) because they are tool-authored and a stray key is a bug signal; `SKILL.md`/rule frontmatter and MCP tool-call arguments are tolerant (`#[serde(flatten)] extra: BTreeMap<..>`) because a newer sibling binary or an LLM caller may add fields this build doesn't know about yet.
10. `serde_ignored` gets you "tolerant but reported": wrap the deserializer, get a callback with the dotted path of every field the target struct silently dropped, and log/warn on it — the middle ground between hard-reject and silent-swallow, meant for **operator-authored** config where you still want forward compatibility but also want typo detection.
11. `#[serde(default)]` on a field that is semantically required (a name, a hash, a version) converts "field absent" into "field is empty string / zero" instead of "parse error" — the failure moves from a loud, immediate error to a silent wrong value discovered much later.
12. The fix is `#[serde(try_from = "RawT")]` with a hand-written `TryFrom<RawT> for T` that does the required-ness and mutual-exclusion validation once, in the type's only constructor — grim already does this for `LockedArtifact`, `LockedBundle`, and `InstallRecord`.
13. `#[non_exhaustive]` on a public enum forces every external `match` to carry a wildcard arm, so a new OCI media type or manifest variant added by a newer publisher does not fail to compile (or silently mis-match) in an older consumer — but it has **zero effect inside the defining crate**, so it does nothing for grim's own internal version enums (which grim deliberately keeps closed/total instead).
14. Of the four serde enum representations, only externally-tagged (the default) and adjacently-tagged degrade gracefully-ish on an unknown variant with a clear "unknown variant" error naming the bad tag; untagged degrades worst — an unrecognized shape produces a generic "data did not match any variant" with no indication of which field was wrong, because serde tries every variant blind before giving up.
15. Round-tripping through `serde` + the plain `toml`/`serde_json` crates always reserializes from the typed value, so any comment or formatting a human put in a hand-edited file is gone after the first machine write; `toml_edit`'s `DocumentMut` preserves comments, whitespace, and item order across an edit, at the cost of manual field-by-field mutation instead of `Deserialize`.
16. grim's lock/cache/state files intentionally do **not** use `toml_edit`-style comment preservation — they are fully machine-generated (never hand-edited), so plain `toml`/`serde_json` reserialization is correct there; `toml_edit` earns its keep only for files a human is expected to edit and grim rewrites (i.e. `grimoire.toml`, if/when grim ever mutates it).
17. Protobuf's schema-evolution rule ("adding a field is safe, reusing a field number is not, unknown fields are preserved and re-emitted by an older reader") and Avro's ("match fields by name, apply the reader's default for anything the writer didn't send, error only when the reader needs a field with no default") are both instances of the same rule grim already encodes structurally: additive change is free, anything that changes the meaning of an existing key is a version bump.
18. `cargo-semver-checks` diffs the public API between two versions using rustdoc JSON and can be run in CI (`cargo semver-checks`, or the `cargo-semver-checks-action`); per-lint level/required-update can be tuned in `Cargo.toml` metadata, which is the mechanical backstop for "this on-disk format type must never gain a field that breaks an old reader without a major bump."
19. grim has *no* golden/fixture-file tests today for its on-disk formats — every "future version" test constructs the bad JSON/TOML as an inline string literal (`tag_cache.rs::rejects_unknown_version`, `grimoire_lock.rs::reject_future_lock_version`) rather than reading a checked-in fixture file per format version; this is a real gap against the "synthetic from-the-future file" testing goal.
20. A checkable marker for "this type is an on-disk format, treat it with the full ceremony" already exists implicitly in grim as the doc-comment phrase *"Closed internal on-disk discriminant"* plus co-location of `#[serde(deny_unknown_fields)]` next to a `version: XVersion` field — but there is no `grep`-able attribute or lint enforcing it; adopting a literal marker (doc-comment tag or a marker trait) is the single highest-leverage recommendation in this report.

---

## Findings

### 1. The mandatory shape of a serialized-to-disk struct

Every type grim persists to disk as its own file format (not a sub-value nested inside one) follows the same envelope shape, visible identically in `LockMetadata`/`GrimoireLock`, `TagCacheFile`, and `InstallStateFile`:

```rust
// grim: src/oci/tag_cache.rs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize_repr, Deserialize_repr)]
#[repr(u8)]
pub enum TagCacheVersion { V1 = 1 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct TagCacheFile {
    version: TagCacheVersion,   // ← first field, always
    registry: String,
    repository: String,
    tags: BTreeMap<String, Digest>,
}
```

The version field is first both textually in the struct and, for line-based/streaming formats, in the emitted bytes — so a reader can peek it before committing to a full deserialize. This is also exactly what Cargo does: `version` was added as "a marker... at the top of the lock file which is a way for super-old Cargos... to give a formal error if they see a lock file from a super-future Cargo" ([Cargo `encode.rs` module docs](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/encode.rs)).

The shape decision this report treats as mandatory:

```rust
struct OnDiskFormat {
    version: FormatVersion,   // 1. always first, always present since v1
    // ... required fields, never `#[serde(default)]` unless truly optional
}
```

### 2. Version field shape: integer, semver, serde_repr enum

Three shapes are in live use across the ecosystem and grim:

- **Bare integer** (Cargo.lock's `version = 4`): simplest, matches by `match n { 4 => .., 3 => .., n => bail!(..) }`. No notion of "close enough" — every value not in the match arms is rejected outright. This is Cargo's actual choice: [`ResolveVersion`](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/resolve.rs) is a plain enum decoded from a plain integer, not a semver string.
- **`serde_repr` closed enum** (grim's `LockVersion`, `TagCacheVersion`, `InstallStateVersion`): serializes identically to a bare integer on the wire (`Serialize_repr`/`Deserialize_repr` — "encode enums as their integer representation on the wire" — [`docs.rs/serde_repr`](https://docs.rs/serde_repr/latest/serde_repr/)), but gives the *in-memory* representation a closed, exhaustively-matchable Rust type instead of a raw `u8` the reader must separately validate. grim's own doc comment states the payoff directly: *"an unknown discriminant fails deserialization at the serde layer (no silent fallback)"* ([`src/lock/lock_version.rs`](file:///home/mherwig/dev/grimoire/src/lock/lock_version.rs)). This is strictly better than a bare integer for the *known-version* arms (Rust's exhaustiveness check catches a forgotten `match` arm at compile time) and identical for the *unknown-version* arm (both just fail at parse).
- **Semver-shaped** (`major.minor.patch`, matched with `^`/range semantics via the [`semver`](https://docs.rs/semver/latest/semver/) crate's `VersionReq`): expresses *degrees* of compatibility — "any 1.x is fine, but not 2.x" — which is the right shape when the file format has an explicit compatibility contract (e.g. "we promise not to remove fields within a major"). No format surveyed here (grim's or Cargo's) uses this for its top-level envelope version, because none of them promise partial compatibility — every version is either fully understood or fully rejected. Semver-shaped versions belong on things with an actual compatibility *range* to express (a plugin API, a protocol), not a closed on-disk file this same binary wrote.

Decision for grim-family tools: **use the `serde_repr` closed-enum pattern for every new on-disk envelope**, matching the three existing formats. It gives compile-time exhaustiveness on the known arms and identical hard-reject behavior on unknown arms to a bare integer, with no extra runtime cost.

### 3. The read path: `match version`, never `from_str`

The one failure mode this report exists to rule out is a read path shaped like:

```rust
// WRONG — trusts the shape, not the version
let doc: CurrentFormat = toml::from_str(&s)?;
```

This works fine for the *current* version and fails with a confusing, unrelated-looking error ("missing field `foo`", "invalid type: expected string") the moment the file predates a field addition or postdates a field removal — the reader has no way to tell "this is old" from "this is corrupt" from "this is a bug in my parser."

grim's actual pattern, correct and worth reproducing verbatim, is a **probe-then-dispatch**:

```rust
// grim: src/install/install_state.rs — the read path
#[derive(Debug, Deserialize)]
struct VersionProbe { version: InstallStateVersion }   // tolerant of other fields

let probe: VersionProbe = match serde_json::from_slice(bytes) {
    Ok(probe) => probe,
    Err(e) => { /* see §4 — the harder direction */ }
};
let (records, lossy) = match probe.version {
    InstallStateVersion::V2 => { /* parse as V2, done */ }
    InstallStateVersion::V1 => { /* parse as V1, migrate in memory */ }
    // no `_` arm needed — the enum is closed and exhaustive
};
```

`VersionProbe` is deliberately *not* `deny_unknown_fields` — it only needs to read the `version` key and must succeed regardless of what else changed, so it can hand off to the version-specific, fully-strict struct. `grimoire_lock.rs`'s `GrimoireLock::from_toml_str` does the equivalent for TOML: it parses the full `RawLock` (whose `metadata.lock_version: LockVersion` is `serde_repr`, so an unrecognized discriminant fails right there), then does a *second*, explicit gate on `declaration_hash_version: u8` — a field that is a plain integer, not an enum, specifically because new hash-canonicalization versions are expected to arrive faster than lock-schema versions and a full closed enum would need a code change per bump:

```rust
if raw.metadata.declaration_hash_version != DECLARATION_HASH_VERSION {
    return Err(LockError::new(path, LockErrorKind::UnsupportedVersion {
        version: raw.metadata.declaration_hash_version,
    }));
}
```

This is the "explicit gate" middle ground the task calls out: not every version-shaped field needs the full `serde_repr` ceremony, but every version-shaped field needs an explicit equality/match check — never an implicit "whatever deserialized is fine."

### 4. The harder direction: older binary meets newer file

This is the direction that produces support tickets, because the newer-writes-older-reads case is silent by default: nothing crashes at write time, the user just later runs an older binary (a pinned CI image, a colleague who hasn't updated) against a file a newer teammate's binary wrote.

grim's `install_state.rs` handles this with a **second, untyped probe** used only when the typed one fails:

```rust
// grim: src/install/install_state.rs
#[derive(Debug, Deserialize)]
struct RawVersionProbe { version: u8 }   // no enum, so it never itself fails to parse

let probe: VersionProbe = match serde_json::from_slice(bytes) {
    Ok(probe) => probe,
    Err(e) => {
        // The serde_repr discriminant probe failed. Before surfacing an
        // opaque InvalidData, try a raw integer probe: a file written by a
        // newer grim carries a version this binary does not recognize.
        if let Ok(raw) = serde_json::from_slice::<RawVersionProbe>(bytes)
            && raw.version > InstallStateVersion::V2 as u8
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!(
                    "install state at {} was written by a newer version of grim \
                     (version {}); upgrade grim to read it",
                    path.display(), raw.version
                ),
            ));
        }
        return Err(Self::invalid_state_data(&e));   // genuinely corrupt
    }
};
```

The reason this needs two probes and not one: `VersionProbe { version: InstallStateVersion }` itself *fails to deserialize* on an unrecognized discriminant (that's the whole point of `serde_repr`'s strictness — see §2), so by the time you're in the error branch you no longer have a typed `version` to compare. `RawVersionProbe { version: u8 }` can never itself fail on a version number (any `u8` parses), so it is the only thing that can still answer "was this at least well-formed enough to have *a* version number, and is that number bigger than the last version I know?" This is the mechanical form of "refuse-and-explain" the task specification asks for, and it is the difference between a user reading *"install state ... was written by a newer version of grim ... upgrade grim to read it"* and a user reading a bare `serde_json::Error` that names some field deep in a struct they've never heard of.

The three arms an older binary meeting a version field must always have, in order of preference:

1. **Migrate**: the version is older than current and this binary still knows the mapping (V1 → V2 in `install_state.rs`).
2. **Reject with an actionable message**: the version is newer than current and unrecognized — name the version number and say "upgrade" (grim's `RawVersionProbe` arm; Cargo's `bail!`).
3. **Never**: silently coerce/truncate/ignore. This arm does not exist in any of the sampled code — it is the thing this whole report is written to prevent.

### 5. Cargo.lock as the worked example

Cargo's own account of its lockfile evolution ([`src/resolver/encode.rs` module docs](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/encode.rs)) states the migration protocol explicitly:

> *"Add support for the new format to Cargo... Do not update `ResolveVersion::default()`. The new lockfile format will not be used yet... Preserve the new format if found... Wait a 'long time'... Change the return value of `ResolveVersion::default()` to the new format."*

Concretely, from [`src/resolver/resolve.rs`](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/resolve.rs):

| Version | What changed | Introduced | Became default |
|---|---|---|---|
| V1 | No version marker at all (implicit) | Cargo 1.0 | — (baseline) |
| V2 | Compact `dependencies` arrays, inline checksums | 2019, Cargo 1.38 | Cargo 1.41–1.52 |
| V3 | Explicit `version` field at top of file; `branch = "master"` git deps re-encoded | 2020, Cargo 1.47 | Cargo 1.53–1.82 |
| V4 | `SourceId` URL serialization is URL-encoding aware | 2024, Cargo 1.78 | Cargo 1.83+ |
| V5 | Unstable, gated behind `-Znext-lockfile-bump` | — | not stable |

The **support-before-default gap** is 6–14 months in every case (V3: 1.47 support → 1.53 default; V4: 1.78 support → 1.83 default) — Cargo deliberately ships the ability to *read and preserve* a format for one to several releases before any command will *write* it by default, so that a project's CI matrix (which typically pins older-but-still-supported toolchains) has already rolled forward before the lockfile it checks in could contain the new format.

The read-path match itself, from `into_resolve` in `encode.rs`, is the textbook version of the arm structure from §4:

```rust
let mut version = match resolve.version {
    Some(n @ 5) if ws.gctx().nightly_features_allowed => { /* unstable gate */ }
    Some(4) => ResolveVersion::V4,
    Some(3) => ResolveVersion::V3,
    Some(n) => bail!(
        "lock file version `{}` was found, but this version of Cargo \
         does not understand this lock file, perhaps Cargo needs to be updated?", n,
    ),
    // Historically Cargo did not have a version indicator in lock files,
    // so this could either be the V1 or V2 encoding. We assume an older
    // format is being parsed until we see so otherwise.
    None => ResolveVersion::V1,
};
```

Two details worth lifting into grim's own practice: (a) the `None` arm exists only because Cargo shipped *before* it had a version field at all — every grim format was born with the field, so grim never needs this arm, which is exactly the payoff of "first field, from the first release" in §1; (b) the error message names the exact bad version number and gives the actionable instruction ("update Cargo") rather than a generic parse failure — matching grim's `install_state.rs` wording.

### 6. `deny_unknown_fields` vs tolerant parsing — a per-type decision

`#[serde(deny_unknown_fields)]` makes deserialization *"always error... when encountering unknown fields"* instead of silently ignoring them, and is documented as **incompatible with `#[serde(flatten)]`, on either the outer struct or the flattened field** ([serde container attributes](https://serde.rs/container-attrs.html)). That incompatibility is the technical reason strict and tolerant are mutually exclusive per type, not merely a style choice — you cannot have both "reject anything I don't recognize" and "capture anything I don't recognize into an extras map" on the same struct.

grim's codebase makes the decision both ways, correctly, and documents *why* each way was chosen:

**Strict** — every tool-authored on-disk envelope (`GrimoireLock`, `RawLock`, `LockMetadata`, `LockedArtifact`'s `RawLockedArtifact`, `LockedBundle`'s `RawLockedBundle`, `TagCacheFile`, `InstallStateFile`, `ClientOutput`) carries `#[serde(deny_unknown_fields)]`. The rationale, stated directly in `registry_catalog.rs`:

> *"the `deny_unknown_fields` on-disk shape means an older grim rejects a cache a newer grim wrote and rebuilds it — an accepted downgrade"* ([`src/catalog/registry_catalog.rs`](file:///home/mherwig/dev/grimoire/src/catalog/registry_catalog.rs))

i.e. strict is chosen *because* the consequence of a mismatch (silently rebuild a cache) is cheap and safe — this is the fleet-compat argument the task references, and it only holds because the file in question is a disposable, regeneratable cache, not a record of user intent.

**Tolerant** — `SkillFrontmatter`, `RuleFrontmatter` (both `#[serde(flatten)] extra: BTreeMap<String, serde_yaml::Value>`), and MCP `SearchToolArgs`/`StatusToolArgs` (no `deny_unknown_fields` at all) are all deliberately forward-compatible. The `SkillFrontmatter` module doc states the reason plainly:

> *"Skills must be **forward-compatible**: this model does NOT use `deny_unknown_fields`. Any unknown key is preserved via `#[serde(flatten)]`... so a newer skill never fails to parse on an older `grim`."* ([`src/skill/skill_frontmatter.rs`](file:///home/mherwig/dev/grimoire/src/skill/skill_frontmatter.rs))

and the MCP tool-args test documents the adversarial-input flavor of the same argument:

> *"No `deny_unknown_fields`: an inert extra key (e.g. a hallucinated `registry`) must not fail the call — it is ignored, never honored."* ([`src/mcp/tool_args.rs`](file:///home/mherwig/dev/grimoire/src/mcp/tool_args.rs))

The dividing line these examples make explicit: **strict for anything the tool itself wrote and is reading back or comparing against a hand-authored declaration (a typo there is an operator bug); tolerant for anything a different, possibly-newer producer (a sibling binary, a plugin author, an LLM) may have legitimately extended.** A grimoire.toml written by hand is a candidate for strict-with-`serde_ignored` (§7), never plain-tolerant — a typo in `regsitry = "..."` should fail loudly, not silently vanish into an `extra` map nobody reads.

### 7. `serde_ignored`: tolerant but reported

[`serde_ignored`](https://docs.rs/serde_ignored/latest/serde_ignored/) sits between the two poles in §6: it *"provides a wrapper that works with any existing Serde `Deserializer` and invokes a callback on every ignored field,"* giving a dotted [`Path`](https://docs.rs/serde_ignored/latest/serde_ignored/) (e.g. `dependencies.serde.typo1`) for every key the target struct silently dropped — without `deny_unknown_fields`'s hard failure. Its own docs position `deny_unknown_fields` as the stricter alternative for when hard failure is actually wanted.

This is the correct tool for **operator-authored config that must still tolerate a newer-schema neighbor** — e.g. a `grimoire.toml` a human edits by hand, where you want "typo in a key" to produce a warning (not a silent no-op) but you don't want a config written for a newer grim to hard-fail on an older one. grim does not currently use `serde_ignored` anywhere in the sampled code; every strict type hard-rejects and every tolerant type is silent about what it dropped. Adopting `serde_ignored` for `grimoire.toml`'s top-level config parse (currently strict via `deny_unknown_fields` per `command/schema.rs`) would let a project config stay forward-compatible with a newer grim's added keys while still surfacing a warning for a genuine typo — the "tolerant but reported" middle this report's task description calls for.

### 8. `#[serde(default)]` on fields that are actually required

`#[serde(default)]` on a struct field means *"When deserializing, any missing fields should be filled in from the struct's implementation of `Default`"* ([serde field attributes](https://serde.rs/field-attrs.html)). For an `Option<T>`, a `Vec<T>`, or a `bool`, that is almost always the right call — absence has an obvious, safe zero value. For a `String` that is semantically a name, a hash, or a URL, or a `u8` that is semantically a version, `#[serde(default)]` converts a missing-field *parse error* into a *silently wrong value* — the type still compiles, the deserialize still succeeds, and the bug surfaces however-many calls later when something tries to use an empty name or a zero hash.

grim's fix, applied consistently, is to never `#[serde(default)]` a field that must be non-empty/valid and instead route the whole struct through a validating `TryFrom`:

```rust
// grim: src/lock/locked_artifact.rs
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(try_from = "RawLockedArtifact")]
pub struct LockedArtifact { /* validated fields */ }

#[derive(Deserialize, schemars::JsonSchema)]
#[serde(deny_unknown_fields)]
struct RawLockedArtifact {
    name: String,
    #[serde(default)] pinned: Option<PinnedIdentifier>,
    #[serde(default)] path: Option<PathSource>,
    #[serde(default)] hash: Option<Digest>,
    // ...
}

impl TryFrom<RawLockedArtifact> for LockedArtifact {
    type Error = String;
    fn try_from(raw: RawLockedArtifact) -> Result<Self, Self::Error> {
        let source = match (raw.pinned, raw.path, raw.hash) {
            (Some(pinned), None, None) => LockedSource::Registry(pinned),
            (None, Some(path), Some(hash)) => LockedSource::Path { path, hash },
            _ => return Err("a lock entry must carry either `pinned` or `path`+`hash`, not both/neither".into()),
        };
        // ...
    }
}
```

`#[serde(try_from = "FromType")]` is documented as: *"Deserialize this type by deserializing into `FromType`, then converting fallibly. This type must implement `TryFrom<FromType>` with an error type that implements `Display`, and `FromType` must implement `Deserialize`"* ([serde container attributes](https://serde.rs/container-attrs.html)). The payoff over hand-rolling the same check inline in every call site: **every deserialization of `LockedArtifact` — TOML file load, test fixture, future JSON API — goes through the one `TryFrom` impl**, so the mutual-exclusion/required-ness check cannot be forgotten at a second call site the way an inline `if` in one loader function can. grim reuses this exact pattern for `LockedBundle` (`RawLockedBundle`) and `InstallRecord` (`RawInstallRecord`).

```rust
// WRONG — required-ness silently becomes "empty string is fine"
#[derive(Deserialize)]
struct LockedArtifact {
    #[serde(default)]
    name: String,   // absent name deserializes to "" and compiles clean
}
```
```rust
// RIGHT — absence is a parse error, checked exactly once
#[derive(Deserialize)]
#[serde(try_from = "RawLockedArtifact")]
struct LockedArtifact { name: String }
// RawLockedArtifact::name has no #[serde(default)] — plain serde already
// rejects a missing required field; TryFrom adds the cross-field checks
// serde's per-field validation cannot express.
```

### 9. `#[non_exhaustive]` and additive-only wire enums

`#[non_exhaustive]`, applicable to structs, enums, and individual enum variants, has a precise and narrow effect per the [Rust reference](https://doc.rust-lang.org/reference/attributes/type_system.html): **it changes nothing inside the defining crate** — you can still construct with a struct literal and match exhaustively without a wildcard. Outside the crate, a non-exhaustive struct cannot be built with a literal (only via a constructor function you provide), and any `match` on a non-exhaustive enum *must* include a `_` catch-all arm or it fails to compile, even if every current variant is listed.

This is squarely aimed at **cross-crate API evolution** — a library adding an enum variant without breaking every downstream `match`. It is close to irrelevant for grim's own internal version enums (`LockVersion`, `TagCacheVersion`, `InstallStateVersion`): those are read and matched *only* inside the grim crate itself, where `#[non_exhaustive]` has no effect at all, and grim's own doc comments say so explicitly: *"Closed internal on-disk discriminant — not `#[non_exhaustive]`, per the project convention that internal non-error enums stay total."* Making them `#[non_exhaustive]` would add ceremony (a forced wildcard arm) with zero actual forward-compat benefit, and worse, it would silently swallow a forgotten match arm into the wildcard instead of failing to compile — exactly the "reviewer can no longer trust the compiler to catch a missed case" failure this report is trying to prevent (see [API Guidelines future-proofing](https://rust-lang.github.io/api-guidelines/future-proofing.html) on `C-STRUCT-PRIVATE`/sealed-trait patterns for the general shape of this trade-off).

Where `#[non_exhaustive]` *does* matter for grim is any **public, cross-binary wire enum meant to be read by code this crate does not control** — the closest present candidate is an OCI/manifest media-type discriminant. grim currently sidesteps the whole question by keeping OCI media types as plain `String`/`Option<String>` fields on `OciManifest` rather than a closed Rust enum (`src/oci/manifest.rs`), which is itself a valid resolution: a plain string field can never fail to parse on an unrecognized value (there's nothing to "unrecognize" — every string is valid), at the cost of losing exhaustiveness checking on the *known* values. The moment grim introduces a real closed enum over media types (or artifact kinds meant to be read by a *different* binary — ocx, a registry-side validator, a third-party consumer), that enum is the correct place for `#[non_exhaustive]`, because at that point matches genuinely do live outside the defining crate.

### 10. Enum representations and their unknown-variant failure modes

Serde's four enum wire representations ([serde enum representations](https://serde.rs/enum-representations.html)) trade off parse-before-you-know-the-shape against unknown-variant error quality:

| Representation | Wire shape | Unknown-variant behavior |
|---|---|---|
| Externally tagged (default) | `{"Variant": {..}}` | Named error: serde knows the key is the tag before parsing content, so an unrecognized key produces "unknown variant `X`, expected one of `A`, `B`" |
| Internally tagged (`#[serde(tag = "type")]`) | `{"type": "Variant", ..fields}` | Same quality of error as external — the tag is a plain field read first, only rejects tuple variants at compile time |
| Adjacently tagged (`#[serde(tag = "t", content = "c")]`) | `{"t": "Variant", "c": {..}}` | Same — tag is read as an ordinary field before the content is touched |
| Untagged (`#[serde(untagged)]`) | `{..fields, no tag}` | Worst case: *"Serde will try to match the data against each variant in order and the first one that deserializes successfully is the one returned"* — on total failure the error is a generic "data did not match any variant of untagged enum X" with **no indication which field was the actual problem**, because every variant was tried and every one failed for a different reason that serde discards |

For a wire format meant to gain new variants over time and stay debuggable, externally-tagged (grim's default — every enum in the sampled code that isn't `serde_repr` uses the plain derive default) or adjacently-tagged are the only representations that preserve a legible "which variant, if any" error. Untagged is appropriate only when the variants are structurally distinguishable by field shape alone and error-message quality genuinely doesn't matter (e.g. a tiny two-arm enum where a human will eyeball the file directly, like `LockedArtifact`'s registry-vs-path source distinguished by which of `pinned`/`path`+`hash` is present — grim does exactly this via the `TryFrom` match in §8 rather than serde's `#[serde(untagged)]`, precisely to control the error message instead of accepting serde's generic one).

### 11. Round-trip fidelity: unknown fields and comments

Two independent axes:

- **Unknown *fields*, preserved vs dropped, on rewrite.** A strict (`deny_unknown_fields`) type cannot preserve what it never accepted — the file is rejected before there is anything to preserve. A tolerant type with `#[serde(flatten)] extra: BTreeMap<String, Value>` *does* round-trip unknown keys: they deserialize into `extra` and re-serialize from it unchanged. grim's `SkillFrontmatter`/`RuleFrontmatter` do exactly this, and it is *why* they are tolerant rather than strict — a skill's frontmatter is expected to be rewritten by grim (`install::render`) after being read, and a newer-schema key must survive that round-trip rather than being silently dropped by an older grim's write.
- **Comments and formatting, preserved vs dropped, on rewrite.** This is orthogonal to unknown-field handling and is a property of the *parsing library*, not the *type*. Plain `toml` + `serde::Deserialize`/`Serialize` always reconstructs output from the typed value — any comment, blank line, or key ordering a human put in the source file is gone the moment the tool round-trips it, even if every field was understood and preserved. [`toml_edit`](https://docs.rs/toml_edit/latest/toml_edit/) exists specifically to *"parse and modify toml documents, while preserving comments, spaces and relative order of items"* via its `DocumentMut` type, at the cost of losing `#[derive(Deserialize)]` convenience — mutations are `doc["key"] = value(..)` calls, not struct assignment.

grim's lock, tag-cache, and install-state files are **fully machine-generated and never hand-edited** — a human is never expected to add a comment to `grimoire.lock`, so plain `toml`/`serde_json` reserialization losing comments is a non-issue there (there are none to lose), and `GrimoireLock::to_toml_string`'s deterministic-sort-and-strip behavior is explicitly the *desired* normalization, not a defect. `toml_edit` earns its cost only for a file a human is expected to hand-author and grim also programmatically mutates — `grimoire.toml` is the candidate, if/when grim ever writes to it rather than only reading it (e.g. `grim add` inserting a dependency line). Using `toml_edit` for `grimoire.lock` would be over-engineering: there is no comment to preserve, and the type-driven strict/tolerant validation from §6–§8 is more valuable there than format preservation.

### 12. Testing: fixtures, forward-compat tests, semver-checks

Cross-language schema-evolution prior art states the same additive/non-additive line grim already draws structurally:

- **Protobuf**: *"Adding new fields is safe... Removing fields is safe [if the number is reserved]... Changing field numbers for any existing field is not safe"*; unknown fields from a newer writer are *"preserved and include[d]... in the serialized output"* by an older reader, not dropped; unknown enum values are either kept as a raw integer (open-enum languages) or mapped to a sentinel case (closed-enum languages) ([protobuf.dev — proto3 guide](https://protobuf.dev/programming-guides/proto3/)).
- **Avro**: schema resolution matches *"fields... by name"*, applies the *reader's* default for anything the writer omitted, ignores anything the writer sent that the reader doesn't want, and *"signal[s] an error"* only when the reader needs a field with no default and the writer didn't send it; an unrecognized enum symbol falls back to the reader's declared default *if one exists*, otherwise errors ([Avro 1.11.1 specification](https://avro.apache.org/docs/1.11.1/specification/)).

Both formats formalize exactly the shape grim already enforces by hand: additive change is free; anything that changes what an *existing* key means requires a version bump, never a silent reinterpretation.

What's *not* present in grim today, checked directly against the source: there are **no checked-in golden/fixture files per format version**. Every "reject a file from the future" test constructs the bad input as an inline literal:

```rust
// grim: src/oci/tag_cache.rs — representative of the pattern used everywhere
std::fs::write(&path, r#"{"version":99,"registry":"ghcr.io","repository":"acme/x","tags":{}}"#).unwrap();
let err = cache.get(&id).expect_err("unknown version must reject");
```

This *is* functionally a forward-compat test (a synthetic "from the future" file), just not sourced from a fixture file tracked in the repo per version — which means there's no artifact a reviewer can diff against when the format changes, and no single place enumerating "every version this binary must still read." A `tests/fixtures/lock/v1.lock`, `tests/fixtures/state/v1.json`, `tests/fixtures/state/v2.json` set, loaded by a table-driven test that asserts every fixture still parses (or, for a synthetic v99 fixture, still refuses with the expected error), would close this gap and give future contributors a concrete file to diff when adding a new version arm.

[`cargo-semver-checks`](https://github.com/obi1kenobi/cargo-semver-checks) is the mechanical backstop on the *Rust type* side of this, not the file-format side: it diffs the public API between two crate versions using rustdoc JSON, runnable in CI via `cargo semver-checks` or the `cargo-semver-checks-action`, with per-lint level/required-update-bump tunable in `Cargo.toml` metadata. It does not know anything about on-disk file compatibility — it enforces that a *public Rust type* doesn't change API-incompatibly — but for the pattern in this report's Normative Guidance §1 (marking every on-disk format type so it's `grep`-able), the same marker convention could gate a `cargo-semver-checks`-style CI job scoped to exactly those types, so any accidental breaking change to a `pub` field on a marked type fails CI even before a human review catches it.

---

## Normative guidance candidates

1. **Every struct that is the top-level shape of a file grim reads/writes carries a `version` field, typed as a closed `#[repr(u8)] enum` via `serde_repr`'s `Serialize_repr`/`Deserialize_repr`, as its literal first field, from the first commit that creates the format.**
   Rationale: a version field retrofitted later cannot distinguish "old file, no version" from "corrupt file"; `serde_repr` gives free compile-time exhaustiveness on every known arm and a hard, no-fallback rejection on any unknown one.
   VERIFICATION: `grep -n "struct.*File\b\|struct.*Lock\b\|struct.*State\b" -A2 src/**/*.rs | grep -B2 "version:"` — every hit's `version` field type should resolve to a `#[repr(u8)]` enum deriving `Deserialize_repr`; `cargo expand` on the struct shows `version` as the first `Deserialize` field read.

2. **The read path for any versioned format is an explicit `match version { KnownV1 => .., KnownVN => .., }` (exhaustive, no `_` arm on the closed internal enum) — never a direct `serde_json::from_slice::<CurrentShape>`/`toml::from_str::<CurrentShape>` on the raw bytes.**
   Rationale: a direct typed-parse on the current shape turns "this file predates a field" into an opaque, misleading field-level error instead of a clear version mismatch.
   VERIFICATION: `grep -rn "match .*version" src/**/*.rs` should show at least one arm per closed version enum variant and, for any that dispatch via `if`/probe rather than `match`, confirm every enum variant is covered by reading the surrounding function; `clippy::wildcard_enum_match_arm` (if enabled) flags an accidental `_` arm on what should be an exhaustive match.

3. **When a version probe using the closed `serde_repr` enum fails to parse, fall back to a second, untyped `{ version: u8 }` probe before surfacing a generic parse error — and if that raw version exceeds the highest known variant, return an error that names the version number and instructs the user to upgrade.**
   Rationale: this is the only way to distinguish "written by a newer binary" from "genuinely corrupt" once the strict enum probe has already failed, and it is the single highest-value message for the user experiencing the older-binary-meets-newer-file case.
   VERIFICATION: `grep -rn "RawVersionProbe\|raw.version >" src/**/*.rs` finds the pattern where it exists; for any new versioned format lacking it, a manual test writing `{"version": 255, ...}` (or the TOML equivalent) into the load path must produce an error string containing "newer" or "upgrade", not a bare `serde_json::Error`/`toml::de::Error` Display.

4. **`#[serde(deny_unknown_fields)]` is the default for any struct this binary itself wrote and is reading back, or that mirrors a hand-authored declaration where a typo must be caught. `#[serde(flatten)] extra: BTreeMap<String, Value>` (no `deny_unknown_fields`) is the default for anything a different or newer producer (a sibling binary, a plugin, an LLM caller) may extend. Every type must state which regime it's in and why, in a doc comment on the struct.**
   Rationale: mixing the two per-type without an explicit reason produces either silent operator typos (over-tolerant) or spurious cross-version failures (over-strict); `deny_unknown_fields` and `flatten` are also mutually exclusive at the serde level, forcing the choice to be made once, deliberately, per type.
   VERIFICATION: `grep -rn "serde(deny_unknown_fields)" src/**/*.rs` and separately `grep -rn "serde(flatten)" src/**/*.rs` — every struct in either list should have a preceding doc comment containing the word "forward-compat", "tolerant", or "strict" naming the reason; a struct with neither attribute and no `extra`/flatten field is the smell to flag in review (implicitly tolerant of unknown fields via serde's own default, with no documented reason).

5. **A field that is semantically required (a name, a hash, a digest, an identifier) never carries `#[serde(default)]`. If a struct needs cross-field validation beyond per-field presence (mutual exclusion, "either A or B+C, not both"), route it through `#[serde(try_from = "RawT")] ` with a hand-written `TryFrom<RawT> for T` doing that validation once.**
   Rationale: `#[serde(default)]` on a required field converts a load-time parse error into a silently-wrong empty/zero value discovered far from its cause; centralizing cross-field validation in one `TryFrom` means every deserialization call site gets it, instead of relying on every call site to remember an inline check.
   VERIFICATION: `grep -B3 "serde(default)" src/**/*.rs | grep -A3 "pub struct\|struct Raw"` — for each hit, confirm the field type is `Option<T>`, `Vec<T>`, `bool`, or another type with a genuinely safe zero value, not `String`/numeric-non-zero/an id type; `grep -rln "serde(try_from" src/**/*.rs` cross-checked against `grep -rln "impl TryFrom<Raw" src/**/*.rs` should be the same file set.

6. **Do not mark grim's own internal, single-crate version/kind enums `#[non_exhaustive]`. Reserve `#[non_exhaustive]` for enums whose values a genuinely different binary/crate (not this one) is expected to `match` on.**
   Rationale: `#[non_exhaustive]` has zero effect within the defining crate and only adds a forced wildcard arm outside it — applying it to a type matched only inside grim adds ceremony while removing the compiler's ability to flag a forgotten arm when a variant is added, exactly backwards from the goal.
   VERIFICATION: `grep -rn "non_exhaustive" src/**/*.rs` — for each hit, confirm (via `find_referencing_symbols`/grep for the type name) that at least one `match` on it lives outside the crate (an external SDK, a schema consumer, published docs an external tool parses); every closed internal version enum should instead carry the doc-comment marker from rule 8, not `#[non_exhaustive]`.

7. **Wire/manifest enums meant to gain variants over time use serde's externally-tagged (default) or adjacently-tagged representation, never `#[serde(untagged)]`, unless the variants are trivially field-shape-distinguishable and a generic "no variant matched" error is acceptable.**
   Rationale: untagged deserialization tries every variant and discards each failure's specific reason, so the one error message on total failure ("data did not match any variant") gives no actionable signal about which field was actually wrong or which variant was intended — the worst error-message quality of the four representations, right when the file is from an unfamiliar (older/newer) producer and diagnosability matters most.
   VERIFICATION: `grep -rn "serde(untagged)" src/**/*.rs` — for each hit, manually construct a slightly-wrong input for one intended variant and confirm the resulting error message names a specific field/reason, not a bare "did not match any variant"; if it doesn't, replace `untagged` with adjacent tagging or an explicit `TryFrom` match (as grim already does for `LockedArtifact`'s source, see rule 5).

8. **Mark every on-disk-format struct/enum with the literal doc-comment phrase `"On-disk format:"` as the first line of its doc comment (in addition to whatever else the comment says), so the full set is one grep away.**
   Rationale: the task's own diagnosis — "a checkable marker that lets a reviewer find every on-disk format type in one grep" — does not exist today; grim currently signals this only through informal, non-uniform phrases ("Closed internal on-disk discriminant", "on-disk shape", "versioned envelope persisted at...") that a grep for one misses the others.
   VERIFICATION: `grep -rn "^/// On-disk format:" src/**/*.rs` returns every marked type; a CI check (a small script, or a custom clippy-free lint via `grep` in CI) can assert every struct whose name matches `*File$|*Lock$|*State$|*Manifest$|*Cache$` — or, more robustly, every struct containing a field literally named `version` typed as a `*Version` enum — also carries the marker, catching an unmarked new format type at review time.

---

## AI-agent angle

An LLM writing or reviewing this code tends to get it wrong in a small number of specific, mechanically-checkable ways:

- **Adds a version field on the *second* format-changing PR, not the first.** The agent writes `struct LockFile { skills: Vec<..> }` with no version field because "there's only one shape so far," then bolts on `version` when a second shape appears — at which point old files written before that PR have no version key and cannot be told apart from corrupt/future ones. **Check**: any new `struct ...File`/`...Lock`/`...State`/`...Cache` PR must include a `version` field in the same commit that introduces the struct, before it's ever written to disk in a release; a repo-history grep (`git log -p --follow -- <file>`) showing the field added in a *later* commit than the struct is the smell.
- **Uses `serde_json::from_str::<CurrentShape>` directly instead of a version probe**, because it's the shortest code that makes the happy-path test pass. Every unit test the agent writes for its own PR uses freshly-generated fixtures, so this never surfaces until a real cross-version file is read. **Check**: does a test exist that loads a file with `version` equal to something the current code doesn't recognize, asserting the *specific* error kind (not just `is_err()`), and — separately — a file with the *lowest* still-supported version, asserting successful migration? If either is missing, the version-dispatch logic is unverified.
- **Reaches for `#[serde(default)]` to make a failing test pass**, rather than fixing the fixture or adding the field to the caller. This is the single most common LLM shortcut in this domain: a missing-field test failure is trivially silenced by `#[serde(default)]`, and the agent moves on without noticing it just converted a loud error into a silent wrong value. **Check**: for every field newly decorated with `#[serde(default)]` in a diff, does its type have a genuinely safe zero value (`Option`, `Vec`, `bool`, an enum with an explicit `#[default]` variant that is semantically "unset")? A `String`, a hash/digest type, or a numeric id type getting `#[serde(default)]` in a diff is close to always wrong.
- **Marks an internal, single-crate enum `#[non_exhaustive]` because the term "future-proofing" pattern-matches to it**, without checking whether anything outside the crate actually matches on it. This adds a forced wildcard arm that silently absorbs a forgotten case instead of failing to compile. **Check**: `grep -rn "non_exhaustive"` the diff, then grep the same type name for external usage (another crate in the workspace, a published SDK) — if every match site is inside the same crate, the attribute is doing nothing but adding a swallow-everything wildcard requirement.
- **Uses `#[serde(untagged)]` for a "one of several shapes" enum because it's the least code**, without writing a test for the on-total-failure error message. It compiles, the happy-path tests pass, and the failure-path quality (a useless generic error) is invisible until a real user hits it with a slightly-wrong file. **Check**: does a test feed the untagged enum a value that matches *none* of the variants and assert on the error message content (not just that it errors)? If the assertion is only `.is_err()`, the message quality was never actually reviewed.
- **Reserializes a hand-edited TOML file with plain `toml::to_string`/`toml_edit`-free `serde::Serialize` and calls it done**, silently dropping every comment the user wrote, because the happy-path round-trip test compares parsed *values*, not raw bytes with comments. **Check**: for any file the tool is documented to rewrite that a human is also expected to hand-edit, does a test load a fixture *containing a comment* and assert the comment string literally still appears in the output? If the only round-trip test compares deserialized structs, comment loss is invisible to it.

---

## Contested / evolving

- **Should internal lockfile-shaped formats ever use `#[non_exhaustive]`?** grim's stated convention is no (§9) — closed enums stay total for compile-time exhaustiveness. This is a defensible, deliberate minority position; the Rust API Guidelines' future-proofing chapter is written from the perspective of a *published crate's public API*, not a single binary's own private on-disk format, and does not directly adjudicate this case. Treat as settled *for internal formats* within this project, but revisit the moment any format is meant to be read by a genuinely separate binary/crate (ocx reading a grim-written cache, a third-party registry tool parsing a manifest).
- **`toml_edit` adoption for `grimoire.toml`.** grim's config file is currently read but (per the sampled code) not yet programmatically *rewritten* by grim itself in a way that would need comment preservation. The moment a command like `grim add` starts inserting a dependency line into an existing hand-edited `grimoire.toml`, the comment-preservation question in §11 stops being theoretical. No commitment either way was found in the sampled code; this is a genuinely open design question, not a settled one.
- **Cargo's own lockfile-version cadence is slowing, not accelerating.** V1→V2 was ~2 years design-to-default; V3→V4 was ~3 years support-to-default (1.47→1.53 is 6 versions/~1 year for V3's own gap, but V4's 1.78→1.83 support-to-default gap is roughly a year — narrower than V3's). The direction of travel across the Rust ecosystem broadly (see also the `resolver = "3"` field in `Cargo.toml` itself, a *different* versioning axis entirely) is toward *more* explicit, narrowly-scoped version fields (resolver version separate from lockfile version separate from edition) rather than one omnibus version number — worth watching if grim ever needs to version something with more than one independent axis of change (e.g. lock schema vs. declaration-hash canonicalization, which grim already keeps as two separate version fields for exactly this reason).
- **`serde_ignored` is unused in the sampled codebase despite being the documented "right tool" for tolerant-but-reported operator config (§7).** Whether to retrofit it onto `grimoire.toml` parsing (currently plain-strict via `deny_unknown_fields`) is an open recommendation from this research, not an existing project position.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Cargo `src/resolver/encode.rs` module docs](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/encode.rs) | Primary source: Cargo's own migration-protocol doc comment and the literal `match resolve.version` read path | 2026 (master branch) | The canonical, in-repo statement of "support first, default later" and the exact refuse-and-explain error text |
| [Cargo `src/resolver/resolve.rs` — `ResolveVersion` enum](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/resolve.rs) | Primary source: the version enum with per-variant doc comments naming introduction/default Rust versions | 2026 (master branch) | Ground truth for the V1–V5 timeline table in §5 |
| [serde container attributes](https://serde.rs/container-attrs.html) | Primary source: serde's own docs | current (2026) | Exact semantics of `deny_unknown_fields`, its incompatibility with `flatten`, and `try_from` |
| [serde field attributes](https://serde.rs/field-attrs.html) | Primary source: serde's own docs | current (2026) | Exact semantics of `#[serde(default)]`, `default = "path"`, `flatten` |
| [serde enum representations](https://serde.rs/enum-representations.html) | Primary source: serde's own docs | current (2026) | Wire shapes for external/internal/adjacent/untagged tagging, used for §10's comparison table |
| [`docs.rs/serde_repr`](https://docs.rs/serde_repr/latest/serde_repr/) | Primary source: crate docs | v0.1.21, July 2026 | Confirms `Serialize_repr`/`Deserialize_repr` semantics grim relies on for every version enum |
| [`docs.rs/serde_ignored`](https://docs.rs/serde_ignored/latest/serde_ignored/) | Primary source: crate docs | current | The "tolerant but reported" middle ground the task asked to note, currently unused in grim |
| [`docs.rs/toml_edit`](https://docs.rs/toml_edit/latest/toml_edit/) | Primary source: crate docs | current | Comment/formatting preservation semantics vs plain `toml` + `serde` |
| [Rust reference — `#[non_exhaustive]`](https://doc.rust-lang.org/reference/attributes/type_system.html) | Primary source: language reference | current | Exact in-crate-vs-out-of-crate effect, the basis for §9's "internal enums stay total" argument |
| [Rust API Guidelines — future-proofing](https://rust-lang.github.io/api-guidelines/future-proofing.html) | Primary source: community guidelines | current | Sealed traits, private-field guidance — the general future-proofing frame `#[non_exhaustive]` sits inside |
| [protobuf.dev — proto3 guide](https://protobuf.dev/programming-guides/proto3/) | Primary source: Protocol Buffers language guide | current | Cross-language schema-evolution prior art: additive-safe vs renumber-unsafe, unknown-field preservation, open/closed enum handling |
| [Apache Avro 1.11.1 specification — schema resolution](https://avro.apache.org/docs/1.11.1/specification/) | Primary source: Avro spec | 1.11.1 | Cross-language schema-evolution prior art: name-based field matching, reader-default fallback, enum-symbol fallback |
| [`docs.rs/semver`](https://docs.rs/semver/latest/semver/) | Primary source: crate docs | current | `VersionReq`/`^` range semantics, used to contrast semver-shaped vs bare-integer version fields in §2 |
| [`cargo-semver-checks` (GitHub)](https://github.com/obi1kenobi/cargo-semver-checks) | Primary source: project README | current | CI-gateable public-API diffing, the mechanical backstop referenced in the normative-guidance testing section |
| grim source: `src/lock/lock_version.rs`, `src/lock/grimoire_lock.rs`, `src/lock/lock_io.rs`, `src/lock/locked_artifact.rs`, `src/oci/tag_cache.rs`, `src/install/install_state.rs`, `src/catalog/registry_catalog.rs`, `src/skill/skill_frontmatter.rs`, `src/skill/rule_frontmatter.rs`, `src/mcp/tool_args.rs` | Primary source: the codebase under study | 2026, current `main` | Every worked example in this report (`LockVersion`, the two-stage `VersionProbe`/`RawVersionProbe`, the strict-vs-tolerant split, the `TryFrom` validation pattern) is drawn directly from these files, not reconstructed from memory |

