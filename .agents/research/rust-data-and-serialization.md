---
title: Rust Data and Serialization — Determinism, Digests, and On-Disk Format Evolution
topic: rust-data-and-serialization
model: opus
consolidates:
  - rust-data-and-serialization/deterministic-and-canonical-serialized-output.md
  - rust-data-and-serialization/on-disk-format-evolution.md
grounded_by:
  - ocx-codebase-audit/rules-inventory.md
  - ocx-codebase-audit/errors-async-security.md
  - ocx-codebase-audit/crate-architecture.md
  - ocx-codebase-audit/skills-agents-inventory.md
date: 2026-08
---

# Rust Data and Serialization

## Verdict

1. **Byte determinism is a property of the type, not of the writer.** The fix is
   collection choice (`BTreeMap`/`BTreeSet` everywhere order is not semantic),
   enforced at the type declaration, not a sort call before each write.
2. **Do not rely on `serde_json`'s default sortedness.** It is `BTreeMap`-backed
   only while nothing in the dependency graph enables `preserve_order`, and Cargo
   features are additive across the workspace — a transitive bump can invert
   ordering with zero code change here (det §2).
3. **Canonicalization is a per-output-format policy declared in one module**, not
   a per-struct-author `skip_serializing_if` habit: key order, `None`, empty
   collections, floats, trailing newline, line endings, Unicode NFC (det §4–§7).
4. **Adopt JCS as a policy for our own serializer; never re-canonicalize wire
   bytes.** OCI verifies the exact bytes pushed/received, so "serialize once
   deterministically, then treat the bytes as opaque" is the rule — not
   "canonicalize on read" (det §4, §11).
5. **Digests get one module and one fixed-size type.** `sha256:` + lowercase hex
   is OCI grammar, not style (`[A-F]` MUST NOT appear); `Vec<u8>` throws away the
   length invariant `sha2` already handed us (det §8–§9).
6. **Constant-time comparison is for secrets only.** Content digests are public;
   `subtle` on a `Digest` is cargo-cult that costs short-circuiting for nothing
   (det §10).
7. **Every on-disk format is born with a first-field `serde_repr` version enum**,
   read via probe-then-exhaustive-match, with a raw-`u8` fallback probe that
   distinguishes "written by a newer binary" from "corrupt" (fmt §1–§4). grim
   already does all three; this makes it a rule instead of a habit.
8. **Strict vs tolerant is a per-type decision on the producer axis**, not a
   project default. This resolves the live disagreement: ocx's `arch-principles`
   argues *against* `deny_unknown_fields` for fleet-compat
   (rules-inventory.md:1077-1082) while grim applies it to lock/cache/state
   (fmt §6). Both are right — strict for files this binary wrote and reads back,
   tolerant for anything a sibling binary, plugin, or LLM may extend.
9. **`#[serde(default)]` on a semantically required field is the single most
   common LLM shortcut in this domain**; cross-field validation belongs in one
   `#[serde(try_from = "RawT")]` impl (fmt §8).
10. **`#[non_exhaustive]` only where a `match` lives outside the defining crate.**
    ocx's own convention already says this (rules-inventory.md:928); the research
    confirms it against the Rust reference — inside the crate the attribute does
    nothing but convert a compile error into a silent wildcard.
11. **The only reliable determinism gate is build-twice-and-diff.** `HashMap`
    reseeding is per-process, so a single CI run cannot tell "deterministic" from
    "lucky" (det §12).
12. **Golden fixture files per format version are a real, named gap in grim
    today** — every from-the-future test is an inline string literal
    (fmt §12, line 352).

## The ruleset

Twenty rules, merged from nineteen candidates across the two sub-artifacts.
Overlaps collapsed: the two "one module owns the policy" candidates (canonical
policy, digest module) stayed separate because they have different greps;
"version field shape" and "version field position" merged into DATA-FMT-01.

### Determinism and canonical output

**DATA-DET-01 — Never let a `HashMap`/`HashSet` reach a `Serialize` field, a
`serde_json::to_*` call, a hasher, or a writer. Use `BTreeMap`/`BTreeSet`.**
*Rationale:* iteration order is per-instance randomly seeded by design (HashDoS
resistance), so identical logical content serializes to different bytes every
process (det §1).
*Verification:* cross-reference `grep -rn "HashMap\|HashSet" --include=*.rs src/`
against `grep -rln "derive(Serialize)\|serde_json::to_" src/`; flag any shared
file. The map is usually built elsewhere and only *consumed* at the serialization
boundary, so grepping the write site alone misses it.
*Severity:* **MUST**

**DATA-DET-02 — Use `IndexMap`/`IndexSet` only where insertion order *is* the
declared semantics, and put an adjacent `// order: <reason>` comment on the
field.**
*Rationale:* `BTreeMap` is self-sorting regardless of insertion order, removing
"did we insert in the right sequence" as a bug class; `IndexMap` reintroduces it
and is worth that cost only for a lockfile section that must mirror declaration
order (det §3).
*Verification:* `grep -rn "IndexMap\|IndexSet" src/` — every hit needs a nearby
`// order:` comment.
*Severity:* **SHOULD**

**DATA-DET-03 — Never depend on `serde_json`'s default key sortedness. Either
fail CI if `preserve_order` appears anywhere in the feature graph, or call
`.sort_keys()` explicitly before every hash/write.**
*Rationale:* the default is `BTreeMap`-backed (sorted), but `preserve_order`
switches it to `IndexMap` insertion order project-wide, invisibly, from a
transitive dependency's own feature choice (det §2).
*Verification:* `cargo tree -e features -i serde_json | grep -i preserve_order`
as a CI step; `grep -rn "sort_keys()" src/` to confirm coverage if the feature is
knowingly enabled.
*Severity:* **MUST**

**DATA-DET-04 — Declare one canonicalization policy per output format
(lockfile, cache index, `--json`, SBOM) in a single module or doc, covering: key
order; `None` (omit vs `null`); empty collections (omit vs `[]`/`{}`); floats
(forbidden in any hashed document, else `-0.0` → `0.0`); trailing newline;
`\n` line endings written as raw bytes; Unicode NFC at the input boundary.**
*Rationale:* two structurally identical documents differing only in one author's
`skip_serializing_if` habit is a silent, undiagnosable digest mismatch. Serde's
default is to *emit* `null`/`[]`/`{}`; omission is opt-in per field. Neither JCS
nor serde_json normalizes Unicode, and `serde_json` renders `-0.0` as `-0.0`
where JCS demands `0`, so the two are not interchangeable for a hashed document
(det §5–§7).
*Verification:* a `canonical.rs` / `serialization.md` exists and every serializer
entrypoint references it; review checklist item. Grep
`grep -rn "f32\|f64" src/` in any file reachable from a hashing path.
*Severity:* **MUST**

**DATA-DET-05 — When this tool builds a tar/OCI layer, normalize all four axes
explicitly: entry order byte-sorted by path (`LC_ALL=C`-equivalent, never
`readdir` order), a single fixed mtime from `SOURCE_DATE_EPOCH` or a project
constant, `uid`/`gid` = 0, one fixed file-mode policy.**
*Rationale:* none of these is the default of a `WalkDir` + `tar::Builder`
loop, and OS `readdir` order is unspecified — the same nondeterminism class as
DATA-DET-01 at the filesystem layer (det §11).
*Verification:* `grep -rn "SystemTime::now()" $(grep -rln "tar::Builder\|tar::Header" src/)`
must return nothing; build the layer twice and `cmp` the bytes.
*Severity:* **MUST**

**DATA-DET-06 — CI builds every reproducibility-sensitive artifact twice in one
run and diffs the bytes; a second job pins a golden fixture's digest.**
*Rationale:* `HashMap` reseeding is per-process, so a single run genuinely cannot
distinguish "deterministic" from "got lucky"; a golden fixture alone only fails
after someone regenerates it against a specific known bug (det §12).
*Verification:* grep the CI workflow for a step that runs the serialize command
twice and pipes both outputs to `diff`/`cmp`.
*Severity:* **MUST**

### Digests

**DATA-DIG-01 — All digest formatting and parsing lives in one `digest` module.
`format!("{:x}", ..)`, `hex::encode`, `hex::encode_upper`, or a hand-rolled byte
loop for a digest anywhere else is a defect.**
*Rationale:* ad hoc encoding is exactly how a case or padding mismatch makes two
logically equal digests compare unequal — and it fails as a silent cache miss or
a bogus "content changed," never as a crash (det §8).
*Verification:* `grep -rn 'format!("{:[xX]}"' src/ | grep -v src/digest.rs` and
`grep -rn "hex::encode" src/ | grep -v src/digest.rs` — any hit fails review.
*Severity:* **MUST**

**DATA-DIG-02 — `Digest`'s `Display` emits `algorithm:` + lowercase hex always;
`FromStr` rejects uppercase hex rather than silently lowercasing it.**
*Rationale:* the OCI descriptor grammar states `[A-F]` MUST NOT be used —
uppercase output is spec non-compliant, and quietly accepting uppercase input
masks a non-compliant upstream producer (det §8).
*Verification:* round-trip proptest `Digest::from_str(&d.to_string()) == Ok(d)`;
a unit test asserting `Digest::from_str("sha256:ABCD…")` is `Err`.
*Severity:* **MUST**

**DATA-DIG-03 — Digest storage is a fixed-size type (`[u8; 32]`/`[u8; 64]`) in an
algorithm-tagged enum, never `Vec<u8>` plus a separate algorithm field.**
*Rationale:* `sha2::finalize()` already returns a fixed-size `GenericArray`;
converting to `Vec<u8>` discards a compile-time length invariant the dependency
gave you free, and a `(Vec<u8>, Algorithm)` pair lets length and tag drift apart
(det §9).
*Verification:* `grep -rni "digest.*Vec<u8>\|Vec<u8>.*digest" src/` — reading
heuristic; clippy cannot see this one.
*Severity:* **SHOULD**

**DATA-DIG-04 — Hash exactly the bytes received from the registry. Never
re-serialize a parsed value before computing a digest for verification.**
*Rationale:* OCI's verification model is "hash the bytes that arrived," so
re-serializing produces a digest matching *our* idea of canonical form rather
than the one the registry and every other client computed (det §4, §11).
*Verification:* at every verify/pull path, trace that the slice handed to the
hasher is the original response `Bytes`/`&[u8]`, never the output of
`serde_json::to_*` on a re-parsed `Value`. Regression test: a hand-crafted
fixture manifest with non-canonical whitespace and key order must still verify.
*Severity:* **MUST**

**DATA-DIG-05 — Reserve `subtle::ConstantTimeEq` for secret-vs-secret comparisons
(registry tokens, credentials). Compare content digests with `==`.**
*Rationale:* content digests are public values compared for integrity, not
secrecy — there is no timing channel to defend, and constant-time comparison
forgoes short-circuiting for zero benefit (det §10).
*Verification:* `grep -rn "ConstantTimeEq\|ct_eq" src/` — every hit must be
adjacent to a secret/credential type and carry a one-line justification naming
the secret; a `Digest`-typed argument fails review.
*Severity:* **SHOULD**

### On-disk format evolution

**DATA-FMT-01 — Every top-level on-disk struct carries a `version` field as its
literal first field, typed as a closed `#[repr(u8)]` enum via `serde_repr`, from
the commit that creates the format.**
*Rationale:* a version field retrofitted later cannot distinguish "old file, no
version" from "corrupt file" — Cargo carries a `None` arm forever purely because
it shipped before it had one. `serde_repr` gives compile-time exhaustiveness on
known arms and hard rejection with no silent fallback on unknown ones
(fmt §1–§2, §5).
*Verification:* every struct matching `*File|*Lock|*State|*Cache|*Manifest` has a
`version` field whose type derives `Deserialize_repr`. Repo-history smell:
`git log -p --follow -- <file>` showing the field added in a *later* commit than
the struct.
*Severity:* **MUST**

**DATA-FMT-02 — The read path is probe-the-version-then-dispatch on an exhaustive
`match` over the closed enum. Never a direct
`serde_json::from_slice::<Current>` / `toml::from_str::<Current>` on raw bytes.**
*Rationale:* a direct typed parse turns "this file predates a field" into an
opaque, misleading field-level error, leaving the reader unable to tell old from
corrupt from parser bug (fmt §3).
*Verification:* `grep -rn "match .*version" src/` shows one arm per variant; the
probe struct itself must *not* carry `deny_unknown_fields`. An accidental `_` arm
on a closed internal enum is a review finding
(`clippy::wildcard_enum_match_arm` if enabled).
*Severity:* **MUST**

**DATA-FMT-03 — When the typed version probe fails, fall back to an untyped
`{ version: u8 }` probe before surfacing a parse error; if that number exceeds
the highest known variant, return an error naming the version and instructing
the user to upgrade.**
*Rationale:* the `serde_repr` probe itself fails on an unrecognized discriminant,
so by the error branch there is no typed version left to compare — a raw `u8`
probe is the only thing that can still answer "well-formed but from the future"
(fmt §4).
*Verification:* `grep -rn "RawVersionProbe\|raw.version >" src/`; for any format
lacking it, feeding `{"version": 255, …}` into the load path must produce an
error string containing "newer"/"upgrade", not a bare `serde_json::Error`.
*Severity:* **MUST**

**DATA-FMT-04 — Strict vs tolerant is a declared per-type decision with the
reason in the struct's doc comment. `#[serde(deny_unknown_fields)]` for anything
this binary wrote and reads back, or that mirrors a hand-authored declaration
where a typo must be loud. `#[serde(flatten)] extra: BTreeMap<..>` (no
`deny_unknown_fields`) for anything a different or newer producer — a sibling
binary, a plugin author, an LLM caller — may legitimately extend.**
*Rationale:* the two attributes are mutually exclusive at the serde level, so the
choice is forced once per type; making it implicitly yields either silent
operator typos or spurious cross-version failures. Strict is safe for a
disposable cache precisely because the consequence is a rebuild, not data loss
(fmt §6).
*Verification:* `grep -rn "serde(deny_unknown_fields)" src/` and
`grep -rn "serde(flatten)" src/` — every hit needs a preceding doc comment
containing "strict", "tolerant", or "forward-compat" and the reason. A
persisted struct with *neither* attribute is the smell: implicitly tolerant, with
no stated reason.
*Severity:* **MUST**

**DATA-FMT-05 — Never `#[serde(default)]` a semantically required field (a name,
hash, digest, URL, identifier, version). Route cross-field validation
(mutual exclusion, "either A or B+C") through `#[serde(try_from = "RawT")]` with
one hand-written `TryFrom`.**
*Rationale:* `#[serde(default)]` converts a loud load-time parse error into a
silently wrong empty/zero value discovered far from its cause; centralizing the
check in `TryFrom` means every deserialization path gets it, instead of relying
on each call site to remember an inline `if` (fmt §8).
*Verification:* for every `#[serde(default)]` in a diff, confirm the field type
has a genuinely safe zero value (`Option`, `Vec`, `bool`, an enum with an
explicit "unset" `#[default]`). `String`, a digest type, or a numeric id getting
`#[serde(default)]` is close to always wrong. `grep -rln "serde(try_from" src/`
and `grep -rln "impl TryFrom<Raw" src/` should return the same file set.
*Severity:* **MUST**

**DATA-FMT-06 — Apply `#[non_exhaustive]` only where a `match` on the type
genuinely lives outside the defining crate (public error enums, cross-binary wire
enums). Internal version/kind enums stay total.**
*Rationale:* inside the defining crate the attribute has zero effect; outside it,
applying it to an internally-matched type only converts a "forgotten variant"
compile error into a silent wildcard absorption — backwards from the goal
(fmt §9). This matches ocx's own written convention (rules-inventory.md:928) and
its heavy use on *error* enums (errors-async-security.md:41).
*Verification:* `grep -rn "non_exhaustive" src/` — for each hit, confirm at least
one match site outside the crate; otherwise it is ceremony.
*Severity:* **SHOULD**

**DATA-FMT-07 — Wire enums expected to gain variants use serde's externally-
tagged (default) or adjacently-tagged representation. `#[serde(untagged)]` only
when variants are trivially field-shape-distinguishable *and* a test asserts on
the actual error-message content for a no-variant-matched input.**
*Rationale:* untagged tries every variant and discards each failure's reason, so
total failure yields "data did not match any variant" with no indication which
field was wrong — the worst error quality of the four representations, exactly
when the file came from an unfamiliar producer (fmt §10).
*Verification:* `grep -rn "serde(untagged)" src/`; for each, a test must feed a
value matching no variant and assert on message content, not just `is_err()`.
*Severity:* **SHOULD**

**DATA-FMT-08 — Mark every on-disk-format type with the literal doc-comment first
line `/// On-disk format:`.**
*Rationale:* there is currently no grep that finds the full set — grim signals it
through non-uniform informal phrases ("Closed internal on-disk discriminant",
"on-disk shape", "versioned envelope persisted at…") that a grep for one misses
(fmt §12, line 62/396).
*Verification:* `grep -rn "^/// On-disk format:" src/` returns every marked type;
a CI script asserts every struct containing a `version` field typed as a
`*Version` enum also carries the marker.
*Severity:* **SHOULD**

**DATA-FMT-09 — Keep a checked-in fixture file per format version
(`tests/fixtures/<format>/v1.json`, `v2.json`, plus a synthetic `v99`), loaded by
one table-driven test asserting every historical version still parses or
migrates, and that the future version refuses with the expected error kind.**
*Rationale:* inline string literals in each test work functionally but leave no
artifact a reviewer can diff when the format changes, and no single place
enumerating "every version this binary must still read" (fmt §12).
*Verification:* `ls tests/fixtures/` per format; the assertion must be on the
specific error kind, not `is_err()`.
*Severity:* **SHOULD**

**DATA-FMT-10 — Reserialize machine-generated files with plain `serde`; reach for
`toml_edit` only for a file a human hand-authors *and* the tool rewrites.**
*Rationale:* plain `toml`/`serde_json` reconstructs output from the typed value,
destroying comments and ordering. For `grimoire.lock`/`tags.json`/`state.json`
that loss is the *desired* normalization (there are no comments to lose and
determinism is the point); for `grimoire.toml`, if `grim add` ever writes to it,
it is data loss (fmt §11).
*Verification:* for any file documented as both hand-editable and
tool-rewritten, a test loads a fixture *containing a comment* and asserts the
comment string literally survives the round-trip. A round-trip test comparing
deserialized structs cannot see comment loss.
*Severity:* **CONSIDER** (upgrades to MUST the moment a command writes to
`grimoire.toml`)

## Applied to OCX

### Satisfied

- **DATA-FMT-01/02/03.** grim already implements the full envelope: `LockVersion`,
  `TagCacheVersion`, `InstallStateVersion` are `serde_repr` closed enums as first
  fields, with `install_state.rs`'s two-stage `VersionProbe` → `RawVersionProbe`
  fallback producing *"was written by a newer version of grim (version N); upgrade
  grim to read it"* (fmt §1, §3, §4). The pattern is already a written rule
  (rules-inventory.md:99-109), which the research validates against Cargo's own
  `bail!` text (fmt §5). These rules formalize existing practice; they cost
  nothing to adopt.
- **DATA-FMT-05.** `LockedArtifact`, `LockedBundle`, and `InstallRecord` all route
  through `#[serde(try_from = "RawT")]` with cross-field validation in one impl
  (fmt §8). Already correct.
- **DATA-FMT-06.** ocx's `arch-principles.md` already states *"omit
  `#[non_exhaustive]` on internal non-error enums so matches stay total across the
  workspace (binary is the only consumer); error enums exempt"*
  (rules-inventory.md:928), and error enums use it heavily — 82 hits in ocx_lib,
  66 in grimoire (errors-async-security.md:41). The research independently
  confirms this against the Rust reference. No change.
- **DATA-DIG-03 (partially).** The `Digest`-newtype-over-`String` convention is
  already written down twice — as the newtype example in `quality-rust.md`
  (rules-inventory.md:87) and as grimoire's *"domain types over `String`"* row
  (rules-inventory.md:934-936). What is *not* established is the `[u8; N]`
  representation underneath; the audit records only that `sha2` is used across
  65/47/19 files with dedicated mismatch error variants
  (errors-async-security.md:79), not what the type wraps.
- **DATA-DET-01, by precedent.** The existing async rule is a strict analogue:
  `join_next()` returns in completion order, so *"every consumer must sort by a
  stable key before returning"* is already mandatory
  (skills-agents-inventory.md:281-283). The collection-level version of the same
  reasoning is simply missing — the principle is already accepted here.

### Violated / absent

- **The whole determinism block (DATA-DET-01…06) is unowned.** The rules
  inventory names it directly as gap #10: *"no broader guidance on serde attribute
  conventions … backward/forward-compatible field addition, or schemars/JSON-schema
  generation conventions"* beyond the one `serde_repr` pattern
  (rules-inventory.md:1077-1082). No rule file mentions `HashMap`-in-serialized-
  output, `preserve_order`, canonical key order, or reproducible tar construction.
- **DATA-FMT-09 is a confirmed gap in grim.** There are *no* checked-in
  golden/fixture files for any on-disk format; every from-the-future test builds
  the bad input as an inline literal — `tag_cache.rs::rejects_unknown_version`,
  `grimoire_lock.rs::reject_future_lock_version` (fmt §12, line 352).
- **DATA-FMT-04 is the live disagreement, and it resolves cleanly.** ocx's
  `arch-principles.md` argues *against* `deny_unknown_fields` for a fleet-compat
  reason, which the audit itself flags as *"a product decision, not a general
  rule"* (rules-inventory.md:1079-1081); grim applies `deny_unknown_fields` to
  `GrimoireLock`, `TagCacheFile`, `InstallStateFile` and tolerant-flatten to
  `SkillFrontmatter`/`RuleFrontmatter`/MCP tool args (fmt §6). **Resolution:** the
  producer axis is the discriminator, not the project. ocx's fleet-compat argument
  governs cross-binary payloads; it is not a workspace default, and grim's strict
  caches are correct because the failure mode is a cheap rebuild. Both codebases
  are already compliant with DATA-FMT-04 as written — what is missing is the
  *stated reason* on each type.
- **DATA-FMT-08 has no marker anywhere.** The informal phrases exist and are
  inconsistent (fmt §12, line 62).
- **DATA-DIG-01 is unmeasured.** The audit establishes breadth (`sha2` in 65/47/19
  files) but never checks whether digest hex encoding is centralized. Given ocx
  routes JSON I/O through a single `SerdeExt::read_json`/`write_json` seam with
  path context (rules-inventory.md:901), a comparable digest seam is plausible but
  unverified — see Open questions.

### New commitments

1. **A `canonical` module per workspace** (DATA-DET-04) hung off the existing
   `SerdeExt` JSON seam (ocx_lib/src/utility/serde_ext.rs:6, crate-architecture.md:247)
   rather than a new abstraction — that trait is already the single choke point
   every JSON write passes through.
2. **A build-twice-and-diff CI job** (DATA-DET-06) alongside the existing
   `verify-basic.yml` / `verify-licenses.yml` workflows
   (errors-async-security.md:89).
3. **`serde_ignored` for `grimoire.toml`.** ocx already carries the dependency
   with a fleet-forward-compat comment in `ocx/Cargo.toml`
   (errors-async-security.md:41); grim uses it nowhere, and its hand-edited config
   is the exact "tolerant but reported" case the crate exists for (fmt §7). This
   is a port, not a research question.
4. **`/// On-disk format:` markers** across grim's three formats and any ocx
   equivalents (DATA-FMT-08) — a mechanical pass, one grep to verify afterwards.
5. **Per-version fixture directories** for lock, tag-cache, and install-state
   (DATA-FMT-09).

## AI-agent failure modes

Ranked by frequency of occurrence in unattended Rust work.

1. **Reaches for `#[serde(default)]` to make a failing test pass.** A missing-field
   test failure is trivially silenced by one attribute, and the agent moves on
   having converted a loud error into a silent wrong value. This is the single most
   common shortcut in this domain (fmt, AI-agent angle). Catch: any
   `#[serde(default)]` in a diff on a `String`, digest, or numeric-id field.
2. **Defaults to `HashMap` for "a map of X to Y"** without any signal that a struct
   three call sites downstream derives `Serialize`. The type choice and the
   reproducibility requirement are not co-located in the code, so there is nothing
   local to reason from (det, AI-agent angle).
3. **Version-blind recall on `serde_json` ordering.** Told "make output
   deterministic," an LLM adds `preserve_order` plus manual sorting — inverting the
   actual default and making things strictly worse, because generic training data
   conflates `serde_json::Map` with `std::collections::HashMap` (det §2).
4. **Writes `serde_json::from_str::<CurrentShape>` because it is the shortest code
   that passes the happy path.** Every fixture the agent writes for its own PR is
   freshly generated, so cross-version reads are never exercised (fmt, AI-agent
   angle).
5. **Hashes a re-serialized `Value` instead of the response bytes.** Invisible in
   any test that round-trips locally-constructed values, because those never expose
   the byte-vs-recanonicalized distinction (det §4, §11).
6. **Adds the version field on the second format-changing PR, not the first** —
   "there's only one shape so far" — leaving already-written files
   indistinguishable from corrupt ones forever (fmt, AI-agent angle).
7. **Builds a tar layer with a plain `WalkDir` + `append_file` loop**, inheriting
   `readdir` order, real mtimes, and the building machine's uid/gid/umask. All four
   normalization axes are wrong by default and none surfaces as a compile error or
   a single-run test failure (det §11).
8. **Marks an internal enum `#[non_exhaustive]` because "future-proofing"
   pattern-matches to it**, adding a wildcard arm that silently absorbs the next
   forgotten variant (fmt §9).
9. **Reaches for `subtle`/`ConstantTimeEq` on anything security-adjacent**,
   including public content digests, because the crate name reads as
   unconditionally more secure (det §10).
10. **Uses `#[serde(untagged)]` for a "one of several shapes" enum** because it is
    the least code, never testing the no-variant-matched error message (fmt §10).
11. **Reserializes a hand-edited TOML with plain `serde`**, dropping every comment,
    because the round-trip test compares parsed values rather than bytes
    (fmt, AI-agent angle).

## Open questions

- **Does ocx/grim actually build OCI layers, and where?** `grim build` / `grim
  release` exist per the grim-authoring skill, but the codebase audit never traced
  the layer-construction path. DATA-DET-05 is written on the assumption that it
  does; if the tar-building code is real, **this subarea deserves another research
  round**: reproducible-layer construction with the `tar` crate specifically, since
  the crate has no reproducible mode and every guarantee in
  reproducible-builds.org's guidance must be reimplemented by hand (det, Contested).
  Scope it to: `tar` crate `Header` normalization, `SOURCE_DATE_EPOCH` plumbing,
  and whether shelling out to GNU `tar --sort=name` is the lazier correct answer.
- **Is digest hex encoding centralized today?** Unmeasured. A single grep
  (`grep -rn 'hex::encode\|format!("{:x}"' ocx_lib/src grimoire/src`) settles
  DATA-DIG-01's status; do this before writing the rule as a violation.
- **`schemars` / JSON-schema generation conventions.** Named as part of the same
  gap (rules-inventory.md:1082), and `RawLockedArtifact` already derives
  `schemars::JsonSchema` (fmt §8). **Deserves its own round** if the generated
  schema is published as a contract: how it stays in sync with the strict/tolerant
  decision, whether `deny_unknown_fields` implies `additionalProperties: false`,
  and whether schema drift is CI-gated.
- **Cross-binary format compatibility between ocx and grim.** Both sub-artifacts
  reason about a single binary reading its own files. If ocx ever reads a
  grim-written cache (or vice versa), DATA-FMT-04's producer axis and DATA-FMT-06's
  crate boundary both flip. The on-disk-format research flags this as the exact
  trigger to revisit (fmt, Contested).
- **JCS compliance if signing arrives.** No cosign/sigstore hits anywhere in the
  three codebases (errors-async-security.md:87). SBOM/attestation tooling is
  increasingly JCS-aware, so the "OCI doesn't require canonicalization" conclusion
  (det §4) does not transfer to signed attestations. Revisit on adoption.
- **`cargo-semver-checks` as the backstop for on-disk types.** Named as absent
  despite heavy `#[non_exhaustive]` use (rules-inventory.md:1060,
  skills-agents-inventory.md:508). It diffs Rust API, not file formats — whether
  a marker-scoped variant is worth wiring is unresolved (fmt §12).
- **Zero-copy / borrowed deserialization for manifest bodies** was scoped out to
  the performance wave (topic-map.md:99) and is untouched here. Note the tension:
  borrowed deserialization interacts with DATA-DIG-04's "keep the original bytes,"
  and the two could be made to reinforce each other rather than compete.

## Sub-artifacts

- [rust-data-and-serialization/deterministic-and-canonical-serialized-output.md](rust-data-and-serialization/deterministic-and-canonical-serialized-output.md)
  — Byte reproducibility of everything written to disk or emitted as `--json`:
  collection iteration order, `serde_json`'s `preserve_order` trap, JCS vs OCI's
  raw-bytes model, digest string encoding and fixed-size digest types, constant-time
  comparison scope, reproducible tar construction, and the build-twice CI gate.
- [rust-data-and-serialization/on-disk-format-evolution.md](rust-data-and-serialization/on-disk-format-evolution.md)
  — How a struct written by one binary version stays readable (or correctly
  refuses) by another: `serde_repr` version envelopes, probe-then-dispatch read
  paths, the raw-`u8` future-version fallback, strict-vs-tolerant per type,
  `try_from` validation, `#[non_exhaustive]` scope, enum representations, and
  fixture testing — grounded in grim's own lock/cache/state formats against
  Cargo's lockfile history.

## Key sources

| URL | Why |
|---|---|
| [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785) | The reference canonicalization algorithm our own serializer policy is measured against: key sort, number rendering, NaN/Infinity rejection, `-0` normalization |
| [OCI image-spec — descriptor.md](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) | Exact digest grammar (`algorithm:hex`), the explicit `[A-F]` MUST NOT rule, registered algorithms |
| [OCI distribution-spec — spec.md](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) | Client verification model — hash the bytes received — the basis for "never re-serialize before hashing" |
| [docs.rs — serde_json::map::Map](https://docs.rs/serde_json/latest/serde_json/map/struct.Map.html) | The counter-intuitive default: `BTreeMap`-backed (sorted) unless `preserve_order` flips it to insertion order |
| [doc.rust-lang.org — std::collections::HashMap](https://doc.rust-lang.org/std/collections/struct.HashMap.html) | Authoritative statement that iteration order is arbitrary and per-instance randomly seeded, deliberately, for HashDoS resistance |
| [serde.rs — container attributes](https://serde.rs/container-attrs.html) | `deny_unknown_fields` semantics, its incompatibility with `flatten` (which forces the per-type choice), and `try_from` |
| [serde.rs — field attributes](https://serde.rs/field-attrs.html) | `#[serde(default)]` and `skip_serializing_if` semantics — the mechanism behind both the required-field trap and the omit-vs-null decision |
| [serde.rs — enum representations](https://serde.rs/enum-representations.html) | The four wire shapes and why untagged has the worst unknown-variant diagnostics |
| [Cargo `src/resolver/encode.rs`](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/encode.rs) | The canonical worked example: "support first, default later" migration protocol and the literal refuse-and-explain `bail!` text |
| [Cargo `src/resolver/resolve.rs` — `ResolveVersion`](https://raw.githubusercontent.com/rust-lang/cargo/master/src/resolver/resolve.rs) | The V1–V5 lockfile timeline with per-variant introduced/default versions |
| [Rust reference — `#[non_exhaustive]`](https://doc.rust-lang.org/reference/attributes/type_system.html) | Exact in-crate vs out-of-crate effect — the basis for "internal enums stay total" |
| [docs.rs — serde_repr](https://docs.rs/serde_repr/latest/serde_repr/) | Integer-on-the-wire, closed-enum-in-memory semantics every grim version field relies on |
| [docs.rs — serde_ignored](https://docs.rs/serde_ignored/latest/serde_ignored/) | The tolerant-but-reported middle ground for hand-authored config |
| [reproducible-builds.org — Archives](https://reproducible-builds.org/docs/archives/) | The four tar normalization axes (order, mtime, ownership, mode) with concrete flags |
| [reproducible-builds.org — SOURCE_DATE_EPOCH](https://reproducible-builds.org/specs/source-date-epoch/) | Standard mechanism for eliminating embedded "now" from any hashed artifact |
| [docs.rs — subtle](https://docs.rs/subtle/latest/subtle/) | `ConstantTimeEq`'s actual scope and its own best-effort caveat — grounds the secret-vs-public-digest distinction |
| [protobuf.dev — proto3 guide](https://protobuf.dev/programming-guides/proto3/) | Cross-language prior art: additive-safe, renumber-unsafe, unknown fields preserved by older readers |
