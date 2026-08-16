# Proposal: composition, not substitution

Position paper. Answers the owner's three-way question — *is the rule the
wrong shape, do we accept and file a feature request, or does a mechanism
already exist* — with: **the rule is very slightly the wrong shape, the
mechanism already exists and needs no grimoire change, and the feature
request that follows is one optional frontmatter key.**

## The proposal

Split the hardcoding into two kinds and fix each with the cheaper tool.
**Path-shaped** hardcoding (`src/`, `crates/` — 102 tokens across 16 files,
8 of them the exact pair `src/ crates/`) is not a parameterization problem at
all: it is a *derivation* problem, and the fix is to delete the path argument
and add an exclusion glob, so the cell scans the worktree it is actually run
in and can never go stale against a layout it was not written for.
**Value-shaped** hardcoding (binary names, the `OCX_`/`GRIM_` env prefix, the
crate that owns `ExitCode`, `task verify`, the pinned numbers 79–82 — 18 hits
in `cli-contract.md` alone, ~65 corpus-wide) is irreducible: no derivation
produces `ocx`, and it is exactly the residue that composition handles. For
that residue, the consumer ships **one thin local rule they own**, named
`project-facts`, declared in `grimoire.toml` as a local path source and
installed by grim into every configured client alongside the shared rule.
The shared artifact names `project-facts` **once, in its header, with a
stated default**, and never again — zero per-cell ceremony. Nothing is
templated, nothing is patched, nothing is flattened; the two files are peers
in one context window. Grimoire needs no change for this to work today. The
one thing it should later add is a `expects:` frontmatter key that warns when
the companion is missing — and because grim already preserves unknown rule
frontmatter keys verbatim, we can ship that key now and grim can start
honoring it later without a republish.

## Worked example

### `rules/rust-quality/cli-contract.md` — before

Opening block (lines 13–24, unchanged in the "after"), then:

```
| EXIT-01 | Every process exit value comes from the shared `ExitCode` enum. No bare
integer literal reaches a process exit. | `rg -n 'ExitCode::from\(|exit\(' src/ crates/`
— hits must be the enum's own `From` impl or `main` | MUST |

| CLI-01 | The result goes to stdout; logs, progress, warnings, prompts and errors go
to stderr, unconditionally. | `rg -n 'println!|print!' src/ crates/` — hits outside
result formatting are findings | MUST |

| CLI-12 | A `///` on a clap-facing surface states the user contract and nothing else…
| Help-text gates in `task verify`: ASCII, no internal references, valid definition | MUST |

| CLI-13 | Config, cache and data paths come from `directories::ProjectDirs`. Every tool
env var is prefixed (`OCX_`/`GRIM_`) and documented next to its flag. | … | MUST |
```

Run against `/home/mherwig/dev/ocx`, EXIT-01's cell is **already broken and
does not look broken**. Measured just now:

```
$ cd /home/mherwig/dev/ocx && grep -rn 'enum ExitCode' src/ crates/
grep: src/: No such file or directory
crates/ocx_lib/src/cli/exit_code.rs:20:pub enum ExitCode {
```

ocx has no top-level `src/` — it is flat `crates/*`. The command still
prints a real, correct-looking hit from the surviving path, so stdout reads
as a clean run; only one line on stderr says half the scan never happened.
(GNU grep does set exit 2 here, but 2 is also its generic error code and
`rg`'s behaviour differs by version — the exit code is not a signal anyone
reads when stdout looks right.) This is `agent-fit.md` failure mode 2
collapsing into mode 1: a **multi-path cell cannot fail loud**, because a
sibling path always matches.

### `rules/rust-quality/cli-contract.md` — after

The paragraph that goes into the file, immediately after the existing
"Two layers" block. **This is the entire agent-facing cost of the mechanism:**

```markdown
Three things below are this repo's, not this rule's: the binary names, the
env-var prefix, and the crate that owns `ExitCode`. Take them from the
`project-facts` rule this repo owns, never from the examples printed here.
With no `project-facts` loaded, what is printed here is the OCX family's own
(`ocx`/`grim`/`ocx-mirror`, `OCX_`/`GRIM_`, codes 79–82, already shipped and
scripted against) and is wrong for every other repo — keep the mechanism,
write a `project-facts`, assign your own numbers above 78.

Verification cells below take no path argument. They scan the worktree they
are run in and exclude test trees by glob, so no cell can silently half-run
against a layout it was not written for.
```

Eight lines, once. Then the cells lose their literals and gain nothing:

```
| EXIT-01 | … | `rg -n 'ExitCode::from\(|exit\(' -g '!**/tests/**'` — hits must be
the enum's own `From` impl or `main` | MUST |

| CLI-01 | … | `rg -n 'println!|print!' -g '!**/tests/**' -g '!**/examples/**'` —
hits outside result formatting are findings | MUST |

| CLI-12 | … | Help-text gates in this repo's verify task: ASCII, no internal
references, valid definition | MUST |

| CLI-13 | Config, cache and data paths come from `directories::ProjectDirs`. Every
tool env var carries this repo's env prefix and is documented next to its flag. | … |
```

Note what did **not** happen: no `${VAR}`, no `<placeholder>`, no `see §X`
marker on 18 rows. The cells got *shorter*.

### `ai/project-facts.md` — the file ocx would write

Real values, read off `/home/mherwig/dev/ocx` at commit time:

```markdown
---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
summary: What the shared Rust rules mean by "this repo" — layout, binaries, and the values ocx owns
keywords: ocx,project-facts,layout,exit-codes
---

# Project Facts — ocx

The shared `rust-quality` and `rust-cargo` rules state mechanisms; this file
states the values they resolve against. Nothing here blocks a merge. Where a
shared rule and this file disagree about a name, a path, or a prefix, **this
file is right** — it is the one written against this repo.

| Fact | Value |
|---|---|
| Workspace shape | Flat `crates/*`. There is **no** top-level `src/`. |
| Production source | `crates/{ocx_cli,ocx_lib,ocx_schema,ocx_shim}/src` |
| Test trees, excluded from every source scan | `crates/*/tests`, `test/` |
| Binaries | `ocx` (from `ocx_cli`), `ocx-shim` (from `ocx_shim`) |
| Shared types crate | `ocx_lib`; `ExitCode` is `crates/ocx_lib/src/cli/exit_code.rs` |
| Env-var prefix | `OCX_` (`OCX_HOME`, `OCX_CONFIG`, `OCX_DEFAULT_REGISTRY`, …) |
| Verify task | `task verify` (`taskfile.yml` + `taskfiles/`) |
| Exit codes | The pinned 0/1/64–82 table applies verbatim — ocx is the family it was written for |

Refresh the crate rows after any crate add or remove:

    cargo metadata --no-deps --format-version 1 | jq -r '.packages[].name'
```

25 lines. Path-scoped on `**/*.rs`, the **same trigger as `rust-quality.md`**
— which is the whole reason the cross-reference is not a lookup: by the time
an agent has been routed into `cli-contract.md`, `project-facts` is already
in the same context window, loaded by the same glob that loaded the index.

## Mechanics

**Install, end to end.**

1. `grim add ghcr.io/ocx-sh/lore/rust-quality:1` — declared in
   `grimoire.toml`, digest-pinned in `grimoire.lock`, materialized to
   `.claude/rules/rust-quality.md` plus the support directory
   `.claude/rules/rust-quality/*.md`, and to each other configured client in
   that client's own format.
2. The consumer writes `ai/project-facts.md` in their own repo, in git.
3. `grim add ./ai/project-facts.md` — this already works. `docs/src/commands.md`
   §*Local path sources*: `add` "declares it verbatim, pins it by the SHA-256
   of its canonical packed layer instead of a registry digest, and installs it
   exactly like a registry reference"; kind is inferred (a bare `.md` is a
   rule); the binding name defaults to the file stem, so it lands as
   `.claude/rules/project-facts.md`, `.cursor/rules/project-facts.mdc`,
   `.github/instructions/project-facts.instructions.md` — one authored file,
   every client, each in its native shape. A relative CLI path "is rewritten
   to be relative to the config file's directory before it is declared, so
   the recorded value is portable when a co-worker clones the repo."

**Why the shared rule names a binding, not a path.** The installed filename
differs per client (`.md`, `.mdc`, `.instructions.md`) and the depth files
sit one directory below the index, so a relative markdown link would resolve
in Claude and break in Cursor. The binding **name** is the one stable handle
across every client — grim guarantees it, since the name *is* the install
filename stem. So the header says `project-facts`, never a path.

**Absence.** Nothing breaks. The shared rule carries the OCX values inline as
its stated default and says so — Ansible's `defaults/main.yml` position:
usable as shipped, designed to be outranked. A repo with no `project-facts`
gets exactly today's behaviour, minus the stale paths.

**Update.** The two artifacts are separate declarations with separate
sources, so they never collide:

- Upstream bumps `rust-quality` → `grim update` overwrites machine-managed
  content with no flag (the rolling-release contract). `project-facts` is a
  different declaration and is not touched. No merge, no `--force`, no
  conflict — prior-art tier 2, "survives cleanly *because the consumer's
  override never lives inside the shared artifact in the first place*."
- Consumer edits `ai/project-facts.md` → they edit the **source**, which grim
  re-packs and re-materializes on the next `update`. They never touch the
  installed copy, so the `content_hash` drift gate (exit 65) never fires. The
  failure mode that gate exists for is structurally unreachable here.

**Content addressing.** Untouched. The shared artifact's installed bytes stay
byte-identical to the published tar layer — no flatten, no patch, no
substitution pass. `grimoire.lock` still freezes both: a registry digest for
the shared rule, a canonical-layer SHA-256 for the local one. Reproducibility
is *better* than today, because the project facts are now a committed,
hashed, reviewable file rather than an assumption.

**Client work at load time: zero.** Both halves are ordinary instruction
files the client already loads. This is the constraint that kills every
alternative below, and composition is the only option that respects it for
free.

### The three alternatives, and why not

| Option | Verdict |
|---|---|
| **`extends:` flattened by grim at install** | Reject. The installed bytes would no longer equal the published layer, so `content_hash` needs a second notion of "expected", and the flattened file is a new artifact nobody published. `RawBundleSource` is `deny_unknown_fields`, so this is a grammar change too. It buys nothing over two peer files: to a model reading one context window, concatenated and adjacent are the same thing. |
| **Patch/overlay at install (literal Kustomize)** | Reject, and this is where the Kustomize analogy actually breaks. Kustomize patches work because YAML has *addressable structure*. Prose has none, so an overlay degenerates to a text patch — which is `agent-fit.md`'s RUST-13 failure mode #3 verbatim: "a literal string tied to one exact source layout… stops matching the moment `cargo fmt` or any refactor rewraps it." Every upstream rewrap breaks every consumer's overlay. |
| **grim generates project-facts from `cargo metadata` at add time** | Reject as the *first* move, though it is the most attractive: it kills staleness at the source, which is `agent-fit.md`'s own recommendation. But it puts a Rust-specific ecosystem probe inside a language-agnostic package manager, and it is a post-install hook by another name — the mechanism Kustomize rejects because build-time side effects "contradict the best practice of storing complete configurations in version control; would compromise reproducibility." The lazy form of this option is: **the consumer runs `cargo metadata` once and commits the answer.** Identical output, zero grim code, and the result is reviewable in a PR. That is the `cargo metadata` line at the bottom of the file above. |

### The one grimoire feature request

`expects:` — an optional rule-frontmatter list of binding names the artifact
assumes are installed. `grim install` and `grim status` warn (never block,
never exit nonzero) when a named binding is absent for a client that received
the rule.

```yaml
# rules/rust-quality.md
expects:
  - project-facts
```

This is the whole ask. It converts the convention from a documentation
promise into something the installer can observe — the gap `prior-art.md`
identifies as Terraform's one genuine advantage ("the only mechanism
surveyed that gives the *consumer* a machine-checked contract… rather than a
documentation promise"), obtained for roughly fifty lines of grim rather than
a variable system.

**We can ship the key before grim honors it.** `docs/src/artifacts.md`'s rule
frontmatter table ends with *"(any other key) | no | any YAML | Preserved
verbatim (forward compatibility)"* — so `expects:` is legal today, survives
into the published layer, and a future grim turns it on with no republish.
Confirm the per-client render preserves it before relying on that.

## What it costs

**Author (us).** One 8-line header block in `cli-contract.md`, and the same
treatment in the three other value-bearing files (`errors.md`,
`package-manager-domain.md`, `performance.md`). Deleting the path arguments
is a net *reduction*: 102 tokens removed across 16 files, cells get shorter.
One new key in `rust-quality.md` frontmatter. One paragraph in the bundle
description telling adopters to write a `project-facts`. No new artifact to
publish, no new packaging concept, no bundle-grammar change.

**Consumer.** One 25-line file they author and own, plus one command
(`grim add ./ai/project-facts.md`). Both committed. Real recurring cost: the
file goes stale if the workspace is restructured and nobody updates it —
same as any hand-maintained doc, mitigated by the `cargo metadata` line but
not eliminated. Context cost: ~25 always-on lines against a ~200-line budget
— **12%, and that is the honest number, not a rounding error.**

**Grimoire maintainer.** Zero today. Later, `expects:`: parse an optional
string list, cross-check against the install record after materialize, emit a
warning row. No new resolution path, no new file format, no change to
digests, locking, or the drift gate.

## Failure modes

1. **The consumer never writes one.** Most likely outcome by far. Mitigation
   is the stated default (the rule remains correct-as-shipped for OCX, and
   honest about being wrong elsewhere) plus `expects:` later. Until
   `expects:` lands, nothing detects this. **This is the mode to expect.**
2. **Two always-on documents disagree and nothing resolves it.** `project-facts`
   claims primacy in its own first paragraph, which is a prose contract, not
   a merge algorithm. A model can read both and follow the wrong one. There
   is no `grim` pass, no precedence order, and no diagnostic. See *The case
   against* — this is the real weakness.
3. **Upstream renames a fact.** We change "env prefix" to "env namespace";
   every `project-facts` in the wild still says "env prefix" and nothing
   errors. `prior-art.md` names this exactly for Ansible ("silently stops
   working, with no error, if the role renames or restructures a default the
   consumer was overriding") and for Helm. `expects:` does not catch it —
   only a typed contract would, which is Terraform's cost.
4. **Clients that decline rules get neither half.** Codex, Gemini, Zed, and
   Amp are `✗` for rules in grim's client matrix. This degrades
   *symmetrically* — you never get the shared rule without the facts — which
   is a genuine virtue over templating, where a half-rendered artifact is
   possible. But those clients get nothing from this work.
5. **The consumer edits the installed copy instead of the source.** Trips the
   exit-65 drift gate on the next update; the fix ("edit `ai/project-facts.md`,
   not `.claude/rules/project-facts.md`") is not stated anywhere the consumer
   will look. Needs one line in the bundle description.
6. **Name collision.** `project-facts` is a global binding name in the
   consumer's config. A second bundle that also wants a facts file must reuse
   the same name (fine, if both read it) or pick another (and then the
   shared rules point at different files). Nothing arbitrates.

## The case against

Argued at full strength. Four of these are real and one is fatal-if-ignored.

**1. ESLint collapsed exactly this cascade on purpose, and said why.** The
flat-config rationale is not "composition is good" — it is *"One way to
define configs,"* and the team "didn't want folks to have multiple ways to do
the same thing any longer." The old `overrides` system was, in their own
words, *"the source of a lot of complexity."* What ESLint kept is composition
**with a defined resolution order** — an explicit array where "later objects
override previous objects when there is a conflict." My proposal has the
composition and **not** the resolver: two markdown files, both always-on, and
the arbiter is a language model reading prose. This is the strongest argument
against, it is not fully answerable, and the honest reply is only that the
alternative resolvers (flatten, patch) each break content addressing or
prose, so the choice is *no resolver* versus *no mechanism* — not *no
resolver* versus *a good one*.

**2. Cargo refused to ship this ambiguity deliberately.** RFC 3389 constrains
`[lints] workspace = true` so that "when `workspace` is present, no other
fields are allowed" — all-or-nothing, specifically to avoid "the ambiguity of
'which specific lints did this crate override'," and a preset system was
*considered and rejected*. My `project-facts` is precisely a partial
override with no record of what it overrode. Cargo looked at this shape and
said no.

**3. Kustomize has no removal semantics, and neither does this.** From its
eschewed-features doc: removal "would introduce many possibilities for
inconsistency, and the need to add code to detect, report and reject it." A
consumer whose repo genuinely must not honor EXIT-04 cannot say so. Their
only move is to not install the rule — which is `prior-art.md`'s worst tier,
"editing in place *is* the fork."

**4. The indirection may simply be ignored, and the agent-fit artifact does
not clear this.** The strong reply is structural: because `project-facts`
carries the same `paths: ["**/*.rs"]` trigger as `rust-quality.md`, it is
*already in the context window* when the agent reads `cli-contract.md`. There
is no file to fetch, no link to follow, no tool call — every client grim
supports concatenates its instruction files into one prompt. So "indirection
costs a lookup" is false here in the literal sense. But the weaker form of
the objection survives and `agent-fit.md` supports it: failure mode 5,
**instruction dilution** — Anthropic's own guidance that *"bloated CLAUDE.md
files cause Claude to ignore your actual instructions"*, and the corpus's own
"rule-file bloat… monotonic growth with no deletions is the tell." I am
proposing +25 always-on lines and +8 on-demand lines. That is monotonic
growth. And `agent-fit.md` failure mode 3 cuts directly at me: agents run
what is written, literally, and *nothing in the surveyed corpus documents an
agent reconciling a written value against a second document before acting.*
A cell that says "this repo's env prefix" instead of `OCX_` is a **prose
description of a value**, and CFG-05's finding is that prose gets paraphrased
where literals get executed. It is entirely possible the after-version is
*worse* on the value rows than the before-version, and no evidence in the
corpus settles it either way.

**5. The uncomfortable one: derivation does most of the work, and composition
may be riding its coattails.** Deleting the path arguments fixes 102 of the
~102 layout tokens with no mechanism, no local file, no `grim add`, and no
feature request. Composition earns its keep on ~18 value tokens in
`cli-contract.md` and ~65 corpus-wide. If a judge asks "what does the
`project-facts` file buy that the exclusion globs did not," the honest answer
is: the binary names, the env prefix, the ExitCode home, and the verify task
— genuinely irreducible, genuinely fewer than the derivation half. The
minimum viable version of this proposal is **the globs alone**, and it is
defensible to ship that and stop. I argue for the second half because the
value residue is where the *pinned* content lives — the 42%-by-line
policy-bearing bucket that `lore-hardcoding.md` measured — and that residue
is exactly what a second adopter must change and today has nowhere to write
it down.

## What it does NOT solve

- **The pinned policy bucket.** 11 files, 1,632 lines, 42% of the corpus by
  line count. `project-facts` can say "our env prefix is `ACME_`". It cannot
  express "we use `eyre`, not `thiserror`+`anyhow`" (ERR-25), "we allow
  `parking_lot`" (async pins), or "our method ceiling is 40, not 25"
  (ARCH-03). Those are *disagreements with the rule*, not missing values, and
  composition without removal semantics has no way to state them. A second
  adopter forks.
- **Verification that a fact is true.** Nothing checks that
  `project-facts` still describes the repo. `agent-fit.md`'s central finding
  — a check that cannot go red is indistinguishable from one that passed —
  applies to the facts file itself, one level up. The `cargo metadata` line
  is a manual refresh ritual, not a gate.
- **The rule-ID coupling in `rust-review`.** `dimensions.md` cites this
  corpus's own IDs throughout. A facts file does not help; that is a genuine
  dependency on the rule set, correctly modelled as a bundle member.
- **Clients that decline rules.** Codex, Gemini, Zed, Amp. Unchanged.
- **Drift between the shared rule's assumed fact names and the consumer's
  file.** Failure mode 3. Only a typed contract (Terraform) closes it, and
  that is a different, larger proposal.
- **Discovery.** Until `expects:` ships, nothing tells an adopter that
  `project-facts` is a thing they should write. Bundle description prose is
  the whole mechanism, and `prior-art.md`'s repeated lesson is that
  documentation promises are the weakest tier.
