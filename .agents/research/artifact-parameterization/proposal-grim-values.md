---
title: "Declared inputs and install-time rendering for grimoire artifacts"
topic: artifact-parameterization
position: advocacy — grimoire should gain a declared-inputs + install-time rendering mechanism
date: 2026-08-14
grounded_in:
  - .agents/research/artifact-parameterization/grimoire-capability.md
  - .agents/research/artifact-parameterization/lore-hardcoding.md
  - .agents/research/artifact-parameterization/prior-art.md
  - .agents/research/artifact-parameterization/agent-fit.md
---

# Declared inputs and install-time rendering (`grim-inputs.toml` + `[values]`)

## The proposal

An artifact author declares a small set of **anchored inputs** in a
`grim-inputs.toml` that ships inside the artifact's existing tar layer; each
input names a *literal string that already appears verbatim in the shipped
prose*, its type, its validation, the files it occurs in, and how many times.
The consumer supplies overrides in one project-wide `[values]` table in
`grimoire.toml`. At `grim install`/`update`, after materializing the blob and
before writing to disk, grim replaces each declared anchor with the resolved
value — a total, deterministic literal substitution, in the same seam where
`src/install/render.rs` already does deterministic vendor-frontmatter
projection. The critical inversion versus every templating system in the
prior-art survey: **there is no placeholder syntax**. The published blob is
not a template with holes; it is a complete, correct, readable artifact whose
default values are its own prose, and the declaration is a machine-readable
map saying "these exact bytes are a knob." A client that reads the published
blob with no grim in the loop gets byte-for-byte what it gets today. Rendering
is not how the artifact becomes valid; it is how a non-default consumer stops
being lied to.

## Worked example

Real text, `rules/rust-quality/cli-contract.md`. Counts below are measured,
not illustrative: `src/ crates/` occurs 5× inside the `rust-quality` artifact
(3× in `cli-contract.md`, 1× in `docs-and-tracing.md`, 1× in `performance.md`),
`` `ocx`, `grim`, `ocx-mirror` `` occurs 2×, `` `OCX_`/`GRIM_` `` occurs 1×.

### Before — shipped today (unchanged by this proposal)

```markdown
The exit codes, streams, and interface behaviour every OCX-family binary
(`ocx`, `grim`, `ocx-mirror`) honours.

| EXIT-01 | Every process exit value comes from the shared `ExitCode` enum. No bare integer literal reaches a process exit. | `rg -n 'ExitCode::from\(\|exit\(' src/ crates/` — hits must be the enum's own `From` impl or `main` | MUST |
| CLI-01  | The result goes to stdout; logs, progress, warnings, prompts and errors go to stderr, unconditionally. | `rg -n 'println!\|print!' src/ crates/` — hits outside result formatting are findings | MUST |
| CLI-13  | Config, cache and data paths come from `directories::ProjectDirs`. Every tool env var is prefixed (`OCX_`/`GRIM_`) and documented next to its flag. | … | MUST |
```

### The declaration — new file, `rules/rust-quality/grim-inputs.toml`

Ships inside the rule's existing support directory, which `grim publish`
already discovers and packs into the same layer (`publish.toml:48-49`).

```toml
# Inputs for the `rust-quality` rule and its depth files.
#
# `default` is not a fallback — it is the literal text that appears in the
# shipped artifact. Rendering replaces that exact text. `grim build` fails
# if the default does not occur, or does not occur `occurrences` times, in
# `files`. That check is why an upstream edit cannot silently orphan a
# consumer's override.
schema = 1

[[input]]
name        = "rust_source_roots"
type        = "string"
default     = "src/ crates/"
occurrences = 5
files       = ["rust-quality/cli-contract.md",
               "rust-quality/docs-and-tracing.md",
               "rust-quality/performance.md"]
pattern     = '^[A-Za-z0-9_./-]+( [A-Za-z0-9_./-]+)*$'
max_len     = 120
description = "Space-separated roots the `rg` verification cells scan."

[[input]]
name        = "governed_binaries"
type        = "string"
default     = "`ocx`, `grim`, `ocx-mirror`"
occurrences = 2
files       = ["rust-quality/cli-contract.md", "rust-quality/performance.md"]
max_len     = 200
description = "The binaries this contract governs, as inline-code Markdown."

[[input]]
name        = "env_var_prefixes"
type        = "string"
default     = "`OCX_`/`GRIM_`"
occurrences = 1
files       = ["rust-quality/cli-contract.md"]
pattern     = '^`[A-Z][A-Z0-9_]*_`(/`[A-Z][A-Z0-9_]*_`)*$'
```

### The consumer's `grimoire.toml`

```toml
[rules]
rust-quality = "ghcr.io/ocx-sh/lore/rust-quality:0"

[values]
rust_source_roots = "kernel/ modules/"
governed_binaries = "`zfsd`"
env_var_prefixes  = "`ZFSD_`"
```

### After — what lands at `.claude/rules/rust-quality/cli-contract.md`

```markdown
The exit codes, streams, and interface behaviour every OCX-family binary
(`zfsd`) honours.

| EXIT-01 | Every process exit value comes from the shared `ExitCode` enum. No bare integer literal reaches a process exit. | `rg -n 'ExitCode::from\(\|exit\(' kernel/ modules/` — hits must be the enum's own `From` impl or `main` | MUST |
| CLI-01  | The result goes to stdout; logs, progress, warnings, prompts and errors go to stderr, unconditionally. | `rg -n 'println!\|print!' kernel/ modules/` — hits outside result formatting are findings | MUST |
| CLI-13  | Config, cache and data paths come from `directories::ProjectDirs`. Every tool env var is prefixed (`ZFSD_`) and documented next to its flag. | … | MUST |
```

Note the residue: "every OCX-family binary (`zfsd`)" is now grammatically odd.
That is a real defect of literal substitution and it is filed honestly under
[Failure modes](#failure-modes) and [The case against](#the-case-against), not
hidden. Fixing it means the author writes the anchor to include the phrase
(`governed_binaries = "OCX-family binary (\`ocx\`, \`grim\`, \`ocx-mirror\`)"`),
which is exactly the kind of author burden the case-against holds against this
design.

## Mechanics

### Types, validation, required-vs-optional

- **Types**: `string`, `list<string>` (rendered as a joined literal, separator
  declared), `bool`, `int`. In practice `string` covers everything in the lore
  corpus; the others exist because `pattern`/`max_len` are the wrong validators
  for a number and a typed error at install time is worth four lines of code.
- **Validation**: `pattern` (regex, anchored, applied to the *supplied* value),
  `max_len`, `one_of` for enumerations. Validation failure is a hard
  `grim install` error, exit 65, naming the input, the offending value, and the
  artifact that declared it. No silent coercion, ever.
- **Required vs optional**: **every input is optional, and every input MUST
  carry a default, because the default is the shipped text.** An input without
  a default is unrepresentable — the anchor *is* the default. This is a
  deliberate divergence from Terraform's `variable` block (where a
  default-less variable forces a prompt) and it is what makes the un-rendered
  fallback correct rather than merely tolerable. `grim build` rejects a
  declaration with a missing or non-occurring `default`.
- **No prompt at `grim add`.** There is no required input, so there is nothing
  to prompt for. `grim add` prints a one-line notice — `rust-quality declares
  3 inputs; see grim describe rust-quality --inputs` — and installs with
  defaults. A prompt would be interactive state that does not round-trip into
  version control, which is the specific thing Kustomize's design document
  rejects about build-time side effects, and Helm's `--set` in practice.

### Precedence

Lowest to highest, three tiers, no more:

1. The artifact's declared `default` (the shipped text).
2. `[values]` in the global config (`~/.config/grimoire/config.toml`).
3. `[values]` in the project `grimoire.toml`.

Explicitly **not** included: environment variables, a `--set` flag, per-client
values. All three break the property that the rendered output is a pure
function of two committed files. Kustomize's eschewed-features document
rejects env-driven build side effects for exactly this reason
(`prior-art.md`, Kustomize entry), and Helm's `--set` is named in the same
survey as the layer that "doesn't round-trip into version control, undermining
reproducibility." Omitting them is not laziness; it is the reproducibility
constraint.

Values are keyed by **input name, project-wide**, not per artifact. Two
artifacts declaring `rust_source_roots` both get the project's value — which
is the correct behaviour for the only real use case, and one table instead of
N. Per-artifact scoping is deliberately deferred (see
[What it does NOT solve](#what-it-does-not-solve)).

### What is published, what is rendered, what lands

| Stage | Bytes | Digest |
|---|---|---|
| Author's working tree | `cli-contract.md` with `src/ crates/` + `grim-inputs.toml` | — |
| `grim build`/`publish` layer | identical to the working tree, verbatim | `sha256:…` — **this is the content address** |
| `grim install` materialize | the layer, extracted | same |
| render pass | anchors replaced from resolved values; `grim-inputs.toml` stripped | — |
| on disk | `kernel/ modules/` | `content_hash` in `.grimoire/state.json` |

**The published blob is the artifact, not a template.** Content addressing and
reproducibility are untouched: the digest addresses exactly the bytes an
author reviewed, and any two consumers pulling the same digest and supplying
the same `[values]` get byte-identical output — rendering is a pure function
of (blob, resolved values), which is the same determinism guarantee
`src/install/render.rs` already documents for the frontmatter projection
("identical input yields byte-identical output, so rendered files can be
integrity-hashed like any generated file").

**The lockfile records nothing new.** `grimoire.lock` pins the upstream digest,
which is unchanged by rendering — the lock's job is "which upstream version,"
and this proposal does not change what version means. The consumer's values
are covered by `metadata.declaration_hash` for free, provided `[values]` is
folded into the canonical hash input. `src/config/hash.rs` already establishes
the pattern for doing that without a format break: the `agents`, `bundles` and
`mcp` keys are "emitted **only when at least one entry of that kind is
declared**, so an agent-free/bundle-free declaration hashes identically to one
written before those kinds existed — existing locks stay valid with no version
bump." A `"values"` key emitted only when non-empty follows the same rule and
sorts last in JCS order. **No `lock_version` bump, no
`declaration_hash_version` bump, every existing lock stays valid.** A
consequence worth naming: `grim install --frozen` in CI already fails when
someone edits `[values]` without relocking, with no new code.

**`.grimoire/state.json` gains one field.** Each record adds
`"values": {"rust_source_roots": "kernel/ modules/"}` — the resolved map used
at last materialize. Version 2 → 3. Nothing else changes: `content_hash` is
already the hash of the bytes actually written, so drift detection keeps
working unmodified, because rendered output is deterministic.

### `grim update`: upstream changed AND the consumer changed a value

Four cases, and only one of them is new machinery:

1. **Values unchanged, template changed.** Render the new blob with the same
   resolved values. Existing integrity gate applies verbatim: if the on-disk
   bytes equal `render(old_blob, old_values)` — computable, because both are
   recorded — there are no hand edits and the file is overwritten with no
   flag, exactly as `update.rs:140-148` does today for a rolling digest.
2. **Values changed, template unchanged.** Same path. A `[values]` edit is a
   declaration change, so it is already a relock event.
3. **Both changed.** Still the same path. There is no three-way merge to do,
   because the consumer's customization never lives in the installed file as
   an *edit* — it lives in `grimoire.toml` as *data*. This is the structural
   trick the prior-art survey credits to ESLint/Prettier/Ruff/Cargo:
   "survives cleanly *because the consumer's override never lives inside the
   shared artifact in the first place*." Anchored rendering buys that property
   for prose without needing an `extends` construct the clients cannot read.
4. **The consumer hand-edited the rendered file.** Unchanged from today:
   `content_hash` mismatch → `Modified` → refuse, exit 65, until `--force`.
   No new semantics, no merge, no backup. Deliberately.

The genuinely new failure, and the one that matters most:

5. **Upstream changed the text around an anchor.** If `rust-quality` v0.4
   rewrites `EXIT-01`'s verification cell to `src/ crates/ xtask/`, the anchor
   `src/ crates/` still occurs but now 6× not 5×, or an anchor disappears
   entirely. This is precisely the Helm failure the prior-art artifact
   documents: "if the upstream author restructures which values keys exist
   (renames `image.tag` to `image.version`), every consumer's values file
   silently stops affecting the chart with no error." **The occurrence count is
   the fix.** `grim build` refuses to publish when the declared
   `occurrences` does not match the actual count, so upstream cannot ship the
   drift; and `grim install` re-checks at render time, so a consumer pulling a
   blob built by an older or buggier tool gets exit 65 naming the input rather
   than a silently ineffective override. A value that stops working must fail
   loudly — that is Kustomize's "connect errors to their cause," which the
   survey ranks above Helm precisely on this axis.
6. **Input removed upstream, consumer still supplies it.** Warn, list it under
   `grim status`, do not fail. A `[values]` key may legitimately target an
   artifact not installed for the currently-selected clients. This is the one
   place the design tolerates a silent-ish no-op, and it is a knowingly
   accepted weak spot.

### Un-rendered fallback

**Solved by construction, not by careful default choice.** A Cursor user who
`curl`s the blob, a reviewer reading the layer in a registry UI, a consumer on
a grim build predating this feature — all of them see today's file, verbatim,
with `src/ crates/` in it. There is no `{{ }}`, no `${}`, no Jinja, no Go
template. Nothing renders to garbage because nothing needs rendering to be
valid.

Is "defaults that render to something sane" enough? For *content* yes,
completely — but it is not the whole answer, and the argument that it is
would be dishonest in two places:

- **Discoverability is lost.** A human forking `cli-contract.md` by hand
  cannot tell that `src/ crates/` is a knob and `128+N` is not. `grim describe
  <name> --inputs` fixes this for grim users and does nothing for everyone
  else. A one-line prose note in the artifact would fix it for everyone and
  costs context budget in an always-on file — the trade the constraint list
  explicitly flags. I would not add the note.
- **A rendered install no longer matches its digest byte-for-byte**, so
  "compare the file on disk to the registry blob" stops being a valid
  integrity check for a human. `grim status` must therefore report
  `Installed (rendered, 3 overrides)` rather than `Installed`, or the
  transparency the digest was buying quietly evaporates. That is a required
  part of this proposal, not a nicety.

### Blast radius

| Surface | Touched? | Detail |
|---|---|---|
| OCI media types | **No** | Declaration ships inside the existing `application/vnd.grimoire.artifact.layer.v1.tar` |
| Manifest schema | **No** (one optional annotation) | `com.grimoire.inputs` = comma-separated input names, so `grim search`/`describe` can list inputs without pulling the layer. Purely additive, alongside `com.grimoire.keywords`/`.summary` |
| Lockfile format | **No** | No `lock_version` bump. `"values"` enters the declaration hash under the existing omit-when-empty rule (`src/config/hash.rs`) — no `declaration_hash_version` bump, existing locks stay valid |
| Resolver | **No** | Values never affect what is fetched |
| `.grimoire/state.json` | Yes, minor | v2 → v3, one `values` field per record |
| Config schema | Yes, minor | One new `[values]` table, project and global |
| Install path | **Yes — this is the whole feature** | One pass in `src/install/`, beside `render.rs`, between materialize and write; strip `grim-inputs.toml` from the output set |
| `grim build`/`publish` | Yes | Validate declaration: default occurs, count matches, files exist, patterns compile |
| `grim status`/`describe` | Yes, cosmetic | Report rendered-with-overrides; `--inputs` listing |

Backward compatibility both ways: an old grim installing a new artifact writes
a stray `grim-inputs.toml` next to the depth files and renders nothing — the
rule text is still correct, because defaults *are* the text. A new grim
installing an old artifact finds no declaration and takes today's path.

## What it costs

**Author.** One TOML file per artifact, and a permanent obligation: any edit
touching an anchored string must keep `occurrences` accurate or the build
fails. On a corpus that the lore-hardcoding measurement found is edited
constantly — files moved between directories mid-session by concurrent agents
— this is friction on the hot path, not a one-time setup cost. Choosing good
anchors is also a skill: `src/ crates/` is a good anchor (distinctive,
5 occurrences, all of them genuinely paths-to-scan); `crates/` alone is a
terrible one (18 occurrences corpus-wide, most of them claims about Cargo's
layout, not scan targets).

**Consumer.** Three lines of TOML, once, in a file they already own, plus
knowing the mechanism exists. No new syntax, no template language, no
understanding of the artifact's internal structure — strictly less than
Kustomize's "write a patch shaped like the thing you're patching."

**Grimoire maintainer.** One install-path pass (literal replace over a
declared file set — the substitution itself is a `str::replace` with a count
assertion), one config table, one state-file version bump, one build-time
validator, two report-string changes. No new media type, no resolver work, no
merge engine, no lockfile migration. Ongoing: a documented input-naming
convention and a support burden for authors who pick bad anchors.

## Failure modes

Ranked by damage, most severe first.

1. **A semantically wrong substitution that is textually right.** `crates/` in
   `rg -n 'x' src/ crates/` is a scan target; `crates/` in "flat under
   `crates/*`, the layout ripgrep, rust-analyzer and uv all converged on" is a
   claim about the world. A global literal replace cannot distinguish them,
   and replacing the second produces a confidently false statement about a
   pinned decision, in an always-on rule, with no syntax error anywhere. The
   `files` list narrows the blast radius; it does not eliminate this. This is
   Kustomize's "breaks structure" objection transposed from YAML to prose, and
   it is the single most dangerous property of the design.
2. **A stale occurrence count that upstream force-published.** Build-time
   validation is the defence, but a maintainer with `--force` or a patched
   tool can ship an artifact whose declaration lies. Install-time re-checking
   catches it at the cost of a second failure mode: a *correct* upstream edit
   that changes the count breaks every consumer's install until they take the
   new version, which is loud but disruptive.
3. **Bad anchor choice fragments the corpus.** An author who anchors `ocx`
   (bare word, 15 occurrences) instead of a distinctive phrase renders
   nonsense into prose that was fine. There is no automated check for "is this
   a good anchor" beyond the occurrence count.
4. **Grammatical residue.** As in the worked example: "every OCX-family binary
   (`zfsd`)". Substitution respects byte boundaries, not sentences.
5. **An orphaned `[values]` key.** Warned, never fatal (case 6 above). A typo
   in an input name is therefore a silent no-op until the consumer reads a
   warning they may not see in CI.
6. **Values that make a rule internally inconsistent.** Setting
   `rust_source_roots = "lib/"` renders the verification cells correctly and
   leaves untouched every prose sentence that says "the crate shape is flat
   under `crates/*`." The file now contradicts itself. Nothing detects this.

## The case against

Argued at full strength. Four of these five I consider genuinely unanswered.

**1. For the exact case the owner is looking at, the correct fix deletes the
feature.** `agent-fit.md` does not merely say a stale path is dangerous — it
prescribes the remedy, and the remedy is not parameterization: *"the fix for
mode 1 has to come from the rule design, e.g. deriving the scanned path set
from the repo itself (`find . -name Cargo.toml -exec dirname {} \;`, or `cargo
metadata`'s workspace member list) rather than hardcoding `src/ crates/`. A
derived path can't go stale the way a hardcoded one can."* Rewriting EXIT-01's
cell as `rg -n 'ExitCode::from\(' -- $(git ls-files '*.rs')` is a
five-character-per-cell edit to a handful of lines in one repo, needs no
package-manager feature, works for every consumer including those with no grim
at all, and is *strictly more correct* than a rendered literal because it
tracks the repo's real shape rather than a value someone typed into
`grimoire.toml` two years ago. The proposal above builds a mechanism into the
package manager in order to distribute a value that the rule should never have
needed. That is the whole argument, and I do not have a rebuttal to it for
`rust_source_roots` specifically. What survives is narrower than the feature:
`governed_binaries`, `env_var_prefixes`, the `ExitCode` type name, the
`crates/<name>-types/` shape — values genuinely not derivable from the target
repo. Whether ~4 non-derivable strings justify a mechanism is a real question
and the honest answer is "probably not on their own."

**2. The prior-art artifact names this design and rejects it.** Not by
implication — by name, in its concluding paragraph: *"The one mechanism this
survey argues against reaching for is Helm-style string templating of the
artifact body: every documented criticism of it (broken structure,
disconnected errors, 'unintelligible… as projects scale across dimensions')
applies at least as strongly to a skill or rule file, where the 'structure'
being protected is prose an LLM has to parse correctly under a time/token
budget, not just YAML a parser has to accept."* This proposal is
install-time string substitution into the artifact body. The anchored-default
inversion defuses two of Kustomize's three named objections — output is never
structurally broken (the pre-render form is already valid), and errors are
connected to their cause (an unmatched anchor is a hard exit-65 naming the
input, versus Helm's silent no-op). It does **not** defuse the third.
"Unintelligible as projects scale across dimensions" is a scaling claim, and
lore-hardcoding measured the scale: 144 layout literals, 39 distinct
placeholders, 72 named-artifact references across 27 files. A fully anchored
`rust-quality` is not 3 inputs; it is plausibly 20, spread across 14 depth
files, each with an occurrence count that must stay true. At that size the
declaration is a second artifact that has to be maintained in lockstep with
the first, and Kustomize's objection lands cleanly.

**3. Composition is lazier and grim already supports most of it.** ESLint,
Prettier, Stylelint, Ruff and Cargo `workspace.lints` all solve the update
problem *for free* — the survey's own framing: "survives cleanly because the
consumer's override never lives inside the shared artifact in the first
place… composition instead of textual patching." The grim-shaped version costs
zero grimoire code: the consumer writes a local `.claude/rules/rust-local.md`
saying "in this repo the Rust source roots are `kernel/ modules/`; read every
`src/ crates/` in `rust-quality` as that," commits it, and is done forever. Two
lines of context budget. No feature request, no build validator, no state-file
version bump, no occurrence counts. Measured against that, this proposal is a
package-manager feature whose entire purpose is to avoid writing two lines of
Markdown.

The counter-argument is real but not decisive, and I will not overstate it:
prose composition fixes the *statement* and not the *command*. `agent-fit.md`
failure mode 3 — *"nothing in the surveyed convention set… documents an agent
silently reconciling a stale literal command against the real repo layout
before running it"* — means the agent still runs `rg … src/ crates/` verbatim
and still gets failure mode 1, the vacuous pass: a clean, empty, error-free
result bit-identical to "verified clean." An override note the model reads is
not an override the model *executes*. Rendering is. That is the strongest
thing I can say for this proposal over composition, and it is weaker than
objection 1, which fixes the command without either mechanism.

**4. It addresses the smallest third of the measured problem.** lore-hardcoding
buckets the corpus at 26% universal / 31% layout-dependent / 42%
policy-bearing by line count. This mechanism serves bucket B and a few naming
strings in C. The pinned exit-code table, the fourteen named restriction
lints, the MSRV, the `multi_thread` runtime default, `unsafe_code = "forbid"`,
the 25-method ceiling — none of it is literal-replaceable, and all of it is
the larger share. If the owner's real complaint is "this corpus is
OCX-shaped," this feature answers the least of it while permanently enlarging
grim's surface area.

**5. No AI-config client has anything like this, and grim would be inventing
an input contract alone.** Every system in the survey's AI-config section is
flatly static; the one exception, Claude Code's `$ARGUMENTS`/
`${CLAUDE_PROJECT_DIR}`, is invocation- and environment-scoped, not
install-scoped, and does not persist across an upstream update. Being first is
not automatically wrong — grim is first at digest-pinned AI config too — but
it means carrying a bespoke mechanism indefinitely if the ecosystem converges
elsewhere, and it means artifact authors targeting both grim and direct
distribution maintain a declaration that only one channel honours.

## What it does NOT solve

- **Pinned policy values** — the exit-code table, the lint set, MSRV, the
  25-method/2-impl ceiling, the runtime and TLS choices. 42% of the corpus by
  line, and unreachable by literal substitution: you cannot anchor `64`.
  Retargeting those needs the artifact split (mechanism vs. pin) or a
  composition/override mechanism, not this.
- **The 39 undefined angle placeholders** (`<src>`, `<mod>`, `<diff>`,
  `<store>`, …, 154 occurrences, never once defined in any file). These are
  *invocation*-scoped — "the module you are reviewing" — not install-scoped.
  They need a defining sentence in the prose, which is a documentation bug
  with a documentation fix. Do not let this proposal be read as covering them.
- **Rule-ID coupling.** `skills/rust-review/references/dimensions.md` cites
  this corpus's own `ARCH-01`/`ERR-19` IDs throughout. Anchoring individual
  IDs is absurd; a consumer without the rule corpus needs the citations
  stripped, which is a fork, not a value.
- **Per-artifact values for the same input name.** Deliberately omitted. Two
  artifacts declaring `rust_source_roots` share one value. If that ever bites,
  the escape hatch is a namespaced input name (`rustquality_source_roots`),
  not a new config tier.
- **Consumer hand-edits to installed files.** Unchanged: refuse or `--force`.
  No three-way merge, no Copier-style drift replay. Values are the supported
  customization channel; editing the output is still a dead end, exactly as
  chezmoi documents for its templated files.
- **Anything at model-load time.** Values reach the file, never the client.
  No per-session, per-invocation, or per-conversation variation.
- **Non-grim consumers.** A Cursor user copying the blob gets OCX's defaults
  and no signal that anything was parameterizable. By design — and a real
  limit on how much of the "make lore portable" goal this can carry.
