---
title: "Artifact parameterization — decision"
topic: artifact-parameterization
date: 2026-08-14
status: decided
---

# Artifact parameterization — decision

## Decision

**Accept the hardcoded OCX values for now, ship no parameterization mechanism,
and fix the verification cells instead.** The owner's question is aimed at the
wrong token: `src/ crates/` occurs as an exact pair **8 times** in the whole
corpus, while **188 command spans across 18 files** carry a `\|` that the
Markdown table forced on them and that silently rewrites the command — 159 of
them turn a `rg` alternation into a search for a literal `|` character, so the
check exits clean, prints nothing, and is bit-identical to "verified clean"
(`agent-fit.md` failure mode 1, the highest-severity one). Every proposed
mechanism would have faithfully distributed a *correct* path into a *dead*
regex. So: sweep the cells (kill the pipes, drop the path arguments, add
`--type rust`, define the placeholders), leave the pinned exit-code table in
`cli-contract.md` exactly where it is, write no `project-facts`, add no
`[values]` table, and file **one** grimoire issue — a `grim build` lint that
refuses to publish a command span containing a pipe inside a Markdown table
cell, which is the enforcement gap the sweep otherwise leaves open. "For now"
is conditioned on exactly one observable event: **a second repository declaring
`rust-quality`**. On that day, split `cli-contract.md` into a portable
mechanism rule plus an `ocx-exit-codes` rule and group both in
`rust-essentials` — two artifacts, one bundle, no tags on members, zero
grimoire code. Not before.

## Why

**The decisive argument came from all three judges independently, and it
reproduces.** proposal-no-mechanism was the only paper that read the cell
closely enough to find that `rg -n 'ExitCode::from\(\|exit\('` cannot match
anything. Verified here from scratch:

```
pattern as shipped: ExitCode::from\(\|exit\(
  'ExitCode::from(1)'      -> no match
  'std::process::exit(1)'  -> no match
  'ExitCode::from(|exit('  -> match
```

Measured scale (my own scan of `rules/` + `skills/`, 27 files):

| Defect | Count | Files |
|---|---:|---|
| Command spans containing `\|`, **100% of them inside table rows** | 188 | 18 |
| — of those, `\|` inside a quoted regex (vacuous pass) | 159 | — |
| — of those, a shell pipeline degraded to literal argv | 28 | — |
| `rg`/`grep` cells carrying a hardcoded path argument | 93 | 13 |
| The exact pair `src/ crates/` | **8** | 5 |

The escape is not an author's slip: GFM requires `\|` inside a table cell even
within a code span, so **the table format generates this bug and will keep
generating it**. That is why a one-time sweep is necessary but not sufficient,
and why the one feature worth asking grimoire for is a publish-time lint rather
than a values subsystem.

**Second measurement, and it is the one that answers the owner directly:**
`/home/mherwig/dev/ocx` has no top-level `src/` — it is flat `crates/*`. So
`rg … src/ crates/` half-runs against our own flagship consumer, prints a real
correct-looking hit from the surviving path, and reads as green. A multi-path
cell *cannot* fail loud, because a sibling path always matches. Our flagship
rule is already broken against the repo it was written for; portability is not
what is wrong with it.

**Rejected: proposal-grim-values, outright.** Two facts kill it independently.
`RawConfig` at `/home/mherwig/dev/grimoire/src/config/project_config.rs:78`
carries `#[serde(deny_unknown_fields)]`, so a `[values]` table is a **hard
parse failure on every grim binary older than the release that adds it** — a
co-worker or CI runner one release behind dies on a file they never touched,
and making it genuinely additive costs an unpriced two-release rollout. And the
coverage is 8 of 113 path tokens plus ~4 non-derivable name strings, bought
with a permanent occurrence-count obligation on a corpus that concurrent agents
are editing right now. Its own worked example renders `kernel/ modules/` into
`rg -n 'ExitCode::from\(\|exit\(' kernel/ modules/` — an accurate path in a
dead regex, with the foreign-ness tell removed. Nothing in it survives.

**Rejected: `project-facts` as a shipped companion.** +25 always-on lines
(12% of the budget, its own honest number) to install a second always-on
document with no resolver, whose arbiter is a language model reading a prose
claim of primacy — and it converts executing literals (`OCX_`/`GRIM_`,
`task verify`) into paraphrasable prose ("this repo's env prefix"), which
CFG-05 says makes those rows *worse*. Its own §5 concedes derivation does
~102 of ~102 path tokens with no file at all. `grim add ./ai/project-facts.md`
remains available to any adopter who wants one; we do not write one, do not
require one, and do not reference one from the shared rules.

**Where the judges disagreed, resolved:**

- *`expects:` frontmatter (maintainer and adopter for, agent against).*
  **Against.** It is a warning about a companion file we have decided not to
  ask anyone to write; with `project-facts` rejected it warns about nothing.
  The packaging insight stands and is recorded for later:
  `docs/src/artifacts.md:207` documents *"(any other key) — Preserved verbatim
  (forward compatibility)"* for rule frontmatter, so if we ever adopt a facts
  convention the key can ship inert first and be honoured later with no
  republish.
- *Split the exit-code table now (adopter) vs. record the trigger
  (maintainer, agent).* **Record the trigger.** The adopter's harm — a file
  that reads universal while mandating `DirtyRcBlock = 82` — is real, and it
  is already mitigated in the file the owner is looking at:
  `cli-contract.md:13-21` says in six lines that the numbers are a pinned
  decision and *"another project adopting this rule keeps the mechanism and
  assigns its own numbers above 78."* The one place that mitigation is missing
  is the always-on index, and that is a two-line edit, not an artifact split.
  Splitting today costs a rewiring of `rust-quality.md` non-negotiable #7 and
  `errors.md` ERR-12 for a second adopter who does not exist.
- *`--type rust` (no-mechanism) vs. `-g '!**/tests/**'` (composition).*
  **`--type rust` as the default**, exclusion globs only per-cell where the
  narrowing is load-bearing. Dropping the path widens the scan to
  `.agents/research/`, which quotes the banned patterns verbatim; the type
  filter kills that, the glob does not.
- *Occurrence counts of the pipe bug (187 / 108 / 162).* My count is **188**
  command spans, all in table rows. The disagreement was filter width, not
  substance.

**One thing all three judges missed.** Their sweeps keyed on spans starting
with `rg`/`grep`. Roughly a dozen more broken-but-runnable spans do not:
`` `<bin> list \| head -1` `` (CLI-05), `` `.persist(\|fs::rename(` ``
(durable-state), `` `token\|secret\|password\|key\|credential\|auth` ``
(api-and-idioms), and a `\|\|` inside a `for` loop in architecture.md. The
sweep is over *every code span in a table row that the agent will run*, not
over `rg` lines.

**Finally, one correction to the proposal we are taking.** no-mechanism's
flagship rewrite, `rg -tn rust 'pat'`, does not run: ripgrep's short-value
grammar makes `-t` consume the next token, so `-tn rust` is `--type n` with
`rust` as the pattern (`unrecognized file type: n`). Two judges verified this
independently. The spelling is `rg -n --type rust`. Shipping the checklist with
that typo would have re-committed the exact sin it diagnoses.

## What changes in this repository, now

Ordered by severity × count. Items 1–3 are one mechanical pass; nothing here
needs a grimoire feature, a new artifact, or a consumer action.

1. **Kill every pipe in a verification cell — 188 spans, 18 files.**
   Replace `rg -n 'A\|B'` with `rg -n -e 'A' -e 'B'` (repeatable `-e` is an OR
   in both ripgrep and grep, and no pipe character appears, so the table escape
   never fires). Where the alternation is a suffix, a group is shorter:
   `'print(ln)?!'`. For the 28 shell pipelines, delete the second stage where
   it is inert — `rg -n 'process::exit' … \| rg -v 'fn main'` filters nothing,
   the two never share a line — or hoist the command out of the table into a
   fenced block. **New authoring rule: a verification cell contains no `|`,
   raw or escaped.** Heaviest files: `platform-and-paths.md` (27),
   `api-and-idioms.md` (15), `package-manager-domain.md` (13),
   `performance.md` (12), `testing.md` (12), `architecture.md` /
   `data-and-formats.md` / `durable-state.md` (11 each).
   Include the non-`rg` runnable spans named above.

2. **Delete the path argument from all 93 `rg`/`grep` cells; add
   `--type rust`.** `rg -n 'pat' src/ crates/` → `rg -n --type rust 'pat'`.
   Never `-tn rust`. ripgrep already honours `.gitignore`, so `target/` and
   vendored trees stay out. Keep an exclusion glob (`-g '!**/tests/**'`) only
   where the cell is specifically about production code — CLI-01's `println!`
   is the clear case. Heaviest files: `errors.md` (17), `testing.md` (17),
   `async.md` (14), `package-manager-domain.md` (11), `tui.md` (10),
   `rust-cargo.md` (9). Non-Rust path arguments (`.github/`, `taskfiles/`)
   stay — there is no cargo oracle for "where is CI", and a wrong CI path
   fails loud rather than vacuously.

3. **`rules/rust-quality.md` — three small edits, ~6 lines total.**
   - *The Gate*, one line: "Run every verification cell from the workspace
     root — `cargo locate-project --workspace --message-format plain` names
     it."
   - A four-line placeholder glossary: `<bin>` = a binary target in this
     workspace, `<crate>` = a workspace member, `<src>` = a target's source
     root, `<mod>` = the module under review, `<diff>` = the diff under
     review. 39 distinct placeholders occur 154 times and **not one is defined
     anywhere in the corpus**; four lines fixes all of them. Cheapest item in
     the whole design space.
   - Lines 20–24 currently assert, in the **always-on** index, that the
     exit-code table is "pinned, already scripted against, and locked by
     tests" without carrying the numbers. Add the adopter clause that
     `cli-contract.md:13-21` already has: this is OCX's allocation; an
     adopting repo keeps the mechanism and assigns its own numbers above 78.

4. **`rules/rust-quality/cli-contract.md` — the file the owner is looking at.**
   Items 1 and 2 land here as 7 pipe fixes and 3 path-arg fixes. EXIT-01
   becomes `rg -n --type rust -e 'ExitCode::from\(' -e 'process::exit\('` with
   the tail "every hit is the enum's own `From` impl or `main`'s return path".
   CLI-14's `xtask` is a Rust-community convention, not an OCX directory —
   leave it. CLI-12's `task verify` and CLI-13's `OCX_`/`GRIM_` stay as
   **literals**: literals get executed, prose gets paraphrased, and they are
   the honest signal that this file came from somewhere. The exit-code table,
   the two-layer preamble, and the 19 pinned values are untouched.

5. **Nothing moves out of the shared artifact, and no artifact is split.** No
   `ocx-exit-codes` rule, no `project-facts`, no change to `publish.toml` or
   `bundles/rust-essentials.toml`.

**Explicitly not worth doing now:** outcome-phrasing cells that lose a runnable
command (a cell that can never go red or green is worse than one with a wrong
path — treat a new outcome-phrased cell as a review finding); `cargo metadata |
jq` path derivation as a default (three lines of ceremony against a 200-line
budget — reach for it in at most two cells corpus-wide); rewriting the
`rust-review` skill's rule-ID citations (a composition problem, not a layout
one).

## The grimoire feature request

One issue, and it is not parameterization. Paste as-is.

---

**Title:** `grim build`: reject a shell pipe inside a command span in a Markdown table cell

**Labels:** `C-feature-request`, `A-build`, `A-validation`

**Problem**

I publish rule artifacts whose value is runnable verification commands — every
rule row is `| ID | rule | verification command | severity |`. GitHub-flavored
Markdown requires a `|` inside a table cell to be escaped as `\|`, **including
inside a code span**. The agent that consumes the rule reads the raw Markdown,
not the rendered table, so it copies the escaped form and runs it. In a regex,
`\|` is an escaped *literal* pipe, not alternation. The command silently stops
doing what it says.

Concretely, from a rule I publish today (`rust-cli-contract`, rule EXIT-01):

```
| EXIT-01 | No bare integer literal reaches a process exit. | `rg -n 'ExitCode::from\(\|exit\(' src/ crates/` — hits must be the enum's own From impl or main | MUST |
```

```
pattern as shipped: ExitCode::from\(\|exit\(
  'ExitCode::from(1)'      -> no match
  'std::process::exit(1)'  -> no match
  'ExitCode::from(|exit('  -> match
```

The check exits clean with zero output. That is bit-identical to "verified
clean", so an agent records the rule as satisfied and moves on. Across my own
corpus of 27 published files there are **188 such command spans in 18 files,
100% of them inside table rows** — 159 with the pipe inside a quoted regex
(silently vacuous) and 28 shell pipelines degraded into literal argv entries.
Every one of them shipped through `grim build` and `grim release` without a
word.

This is a distribution problem, not just my problem: grim's whole premise is
that an artifact installs **verbatim** into N clients
(`docs/src/artifacts.md:77-79`; `src/install/materializer.rs:41-42`, *"the
canonical bytes land verbatim"*). Verbatim distribution of a broken command
means every consumer of every affected artifact runs a check that cannot fail.
An author cannot catch this by reading the rendered Markdown — rendered, the
table looks perfect.

**What exists today, and why it is not enough**

- `grim build` already validates artifacts and already fails with
  `DataError` / exit 65 (`src/command/build.rs`, e.g. the `MetadataInvalid ⇒
  DataError 65` paths) — but every check is about *metadata*: names,
  frontmatter, references, catalog fields. Nothing looks at the body.
- Body content is packed and shipped untouched. The only body transform that
  exists anywhere is deterministic vendor-frontmatter projection
  (`src/install/render.rs`), and the mcp env-ref syntax translation
  (`src/install/mcp_config.rs:19,42`) — neither inspects prose or commands.
- There is no post-install hook, no lint plugin surface, and no `grim eject`,
  so a consumer who spots the defect cannot fix it in place either: the drift
  gate refuses (exit 65) or clobbers with `--force`
  (`src/command/update.rs:13-24`). The only place the defect can be caught is
  at build time, on the author's machine, before publish.

**Proposed mechanism**

A body lint in `grim build`. For each Markdown file in the artifact tree, for
each line that is a table row (first non-space character is `|`), for each
backtick code span in that row whose first token is a known shell command:
if the span contains `|` or `\|`, fail the build with exit 65, naming
`file:line`, the offending span, and the fix.

```
error: escaped pipe in a command span inside a Markdown table cell
  --> rules/rust-quality/cli-contract.md:58
   |
   | `rg -n 'ExitCode::from\(\|exit\(' src/ crates/`
   |                       ^^ a Markdown table forces this escape; the regex
   |                          then matches a literal '|' and can never fire
   |
help: use repeated -e instead of alternation, so no pipe appears at all
   |   rg -n -e 'ExitCode::from\(' -e 'process::exit\('
```

Command list for the MVP, hardcoded, no config: `rg`, `grep`, `cargo`, `git`,
`jq`, `sed`, `awk`, `find`. Keying on a leading command verb is what keeps
prose spans out of it — a cell documenting `` `--color=auto\|always\|never` ``
or `` `open(O_CREAT\|O_EXCL)` `` is not a command and must not trip the lint.

**Alternatives considered and rejected**

- *Parameterization / a `[values]` table + install-time substitution.* This is
  the feature I originally came to ask for, and it is the wrong one. It would
  have rendered a *correct* path into a *dead* regex — the mechanism cannot see
  that the command is broken. It also cannot be added additively today:
  `RawConfig` is `#[serde(deny_unknown_fields)]`
  (`src/config/project_config.rs:78`), so a new top-level table is a hard parse
  failure on every older grim binary, breaking shared repos and CI runners that
  are one release behind. Not asking for it.
- *A warn-only `expects:` frontmatter key* (declare a companion artifact, warn
  when absent). Cheap and additive — rule frontmatter already preserves unknown
  keys verbatim (`docs/src/artifacts.md:207`) — but it solves a different,
  hypothetical problem and would warn about a file nobody is being asked to
  write.
- *Fix it in the renderer / unescape at install time.* Rejected: it would break
  the verbatim-bytes guarantee that content addressing rests on, and it would
  fix consumers of new grim while leaving the broken bytes in the registry for
  everyone else. The defect belongs to the author, and so should the error.
- *A separate `grim lint` subcommand.* Rejected as a first move: a check that
  only runs when someone remembers to run it does not stop a bad publish. If
  the check list grows, hoisting it later is easy.
- *Do nothing; it is the author's job.* This is exactly the class the corpus's
  own rule names — a check that can never go red is indistinguishable from one
  that passed. 188 spans got through careful review in one repo. Authors do not
  catch it because the rendered table looks right.

**Scoped MVP that can ship on its own**

Just the pipe check, error-level, no configuration, no new flags, no opt-out:

1. Walk the Markdown files already collected for the artifact layer.
2. For table rows only, extract backtick code spans.
3. If the span's first token is in the command list **and** the span contains
   `|` or `\|`, push a validation error.
4. Report all occurrences (do not stop at the first), fail with exit 65.

~50 lines plus tests, hanging off the existing build-validation seam. No
config schema, no lockfile, no state file, no resolver, no media type, no
install-path contact.

A possible follow-up, explicitly **not** in this MVP because its false-positive
rate needs thought: warn when a `rg`/`grep` span in a table cell ends in a bare
directory literal (`src/`, `crates/`), which is the same class of silent
half-run when the artifact is installed into a repo with a different layout.

---

## What we accept, and the tripwire

**Accepted as imperfect:**

- `cli-contract.md` keeps a pinned 0/1/64–82 exit-code table, `DirtyRcBlock`
  and all, that is binding OCX policy in an artifact anyone can install. The
  two-layer preamble is the whole mitigation, and it is prose.
- `OCX_`/`GRIM_`, `task verify`, and the governed binary names stay as
  literals. Deliberate: literals get executed, prose gets paraphrased.
- ~15 CI-path cells (`.github/`, `taskfiles/`) keep a hardcoded path. There is
  no cargo oracle for "where is CI", and these fail loud rather than
  vacuously, which is the acceptable side of the trade.
- The authoring discipline in items 1–3 has no enforcement until the `grim
  build` lint lands. File 28 can reintroduce a piped cell.
- 42% of the corpus by line is policy-bearing. Nothing here makes that
  portable, and nothing here pretends to.

**Tripwire — the one observable condition that reopens this:** a second
repository declares `rust-quality` (or `rust-essentials`) in its
`grimoire.toml`. On that event, and not before:

1. Split `rules/rust-quality/cli-contract.md` into the portable mechanism
   (typed enum, sysexits alignment, no bare integer, stdout/stderr discipline,
   a non-binding sysexits reference table) and a new `rules/ocx-exit-codes.md`
   carrying the binding 79–82 allocation and the "allocate upward from 83"
   claim.
2. Add `[rules.ocx-exit-codes]` to `publish.toml`, add it as a member of a new
   `ocx-house` bundle alongside `rust-essentials`, and leave
   `rust-essentials` carrying the mechanism only.
3. Rewire `rust-quality.md` non-negotiable #7 and `errors.md` ERR-12.

Costs zero grimoire features: bundles are already flat name→member maps,
members already carry no tag, and the consumer's `grimoire.lock` already
freezes. One artifact, one digest, byte-identical for everyone.

**Second tripwire, smaller:** if a `[values]`-shaped need survives *after* the
cell sweep — i.e. an adopter names a specific string that derivation cannot
produce and prose cannot carry — reopen `proposal-grim-values`, but price the
two-release additive rollout that `deny_unknown_fields` forces.

## Sources

Grounding artifacts:

- [grimoire-capability.md](./grimoire-capability.md) — what grim can and cannot do today
- [lore-hardcoding.md](./lore-hardcoding.md) — the measured size of the problem
- [prior-art.md](./prior-art.md) — how other systems solved it, and where they failed
- [agent-fit.md](./agent-fit.md) — whether a stale path actually hurts an agent

Proposals:

- [proposal-no-mechanism.md](./proposal-no-mechanism.md) — taken as the base, with its `-tn rust` typo corrected and its pipe fix generalised from 4 cells to 188
- [proposal-composition.md](./proposal-composition.md) — derivation half taken; `project-facts` and `expects:` rejected
- [proposal-grim-values.md](./proposal-grim-values.md) — rejected in full

Primary sources verified for this decision:

- `/home/mherwig/dev/grimoire/src/config/project_config.rs:78` — `#[serde(deny_unknown_fields)]` on `RawConfig`
- `/home/mherwig/dev/grimoire/docs/src/artifacts.md:207` — rule frontmatter preserves unknown keys verbatim
- `/home/mherwig/dev/grimoire/src/install/materializer.rs:41-42` — canonical bytes land verbatim
- `/home/mherwig/dev/grimoire/src/command/update.rs:13-24` — the exit-65 drift gate
- `/home/mherwig/dev/ocx` — no top-level `src/`; flat `crates/*`
