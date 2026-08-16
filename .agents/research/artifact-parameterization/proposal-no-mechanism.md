---
title: "No mechanism: rewrite the rules layout-agnostic"
topic: artifact-parameterization
position: grimoire needs no new feature; the rules are the wrong shape
date: 2026-08-14
grounding:
  - grimoire-capability.md
  - lore-hardcoding.md
  - prior-art.md
  - agent-fit.md
---

# No mechanism: rewrite the rules layout-agnostic

## The proposal

File no feature request and add no substitution, overlay, or values layer to
grimoire. Instead, rewrite the verification cells so they stop naming a
layout at all: run every cell from the workspace root, let `rg` default to
the tree below cwd with `--type rust` doing the filtering that `src/ crates/`
was pretending to do, prefer a cargo-native command (`cargo clippy
--workspace`, `cargo metadata`, `cargo tree -i`) wherever cargo can answer
the question itself, let the index rule's `paths:` frontmatter carry the
scoping that the command bodies currently duplicate (wrongly), and phrase a
check as an observable outcome where no honest command exists. This removes
every one of the 144 measured layout literals (`lore-hardcoding.md`) with
zero cost to the consumer, zero change to `grim build`/`install`/`update`,
and zero change to content addressing — because nothing about the artifact
changes at all; only the words inside it do. It does **not** touch the 140
pinned-policy values, and it is not meant to: the exit-code table is the
rule's *content*, not its coupling, and a rule with a hole where its table
was is not worth the 200-line context budget it occupies.

## Worked example

`rules/rust-quality/cli-contract.md` carries exactly 7 layout literals
(`src/` ×3, `crates/` ×3, `xtask` ×1). Every one is in the trailing path
argument of an `rg` invocation. Here is each, verbatim before and after.

### EXIT-01

Before:

> | EXIT-01 | Every process exit value comes from the shared `ExitCode` enum. No bare integer literal reaches a process exit. | `` rg -n 'ExitCode::from\(\|exit\(' src/ crates/ `` — hits must be the enum's own `From` impl or `main` | MUST |

After:

> | EXIT-01 | Every process exit value comes from the shared `ExitCode` enum. No bare integer literal reaches a process exit. | `` rg -tn rust 'ExitCode::from\(' `` and `` rg -tn rust 'process::exit\(' `` — every hit is the enum's own `From` impl or `main`'s return path | MUST |

**Two defects removed, not one.** The path is gone, and so is a live
vacuous-pass bug: `\|` inside a Rust-regex is an *escaped literal pipe*, not
alternation. The markdown table cell required escaping the `|`, and that
escape silently changed the regex. Verified:

```
pattern: ExitCode::from\(\|exit\(
'ExitCode::from(1)'      -> False
'std::process::exit(1)'  -> False
'ExitCode::from(|exit('  -> True
```

The cell as shipped matches nothing an agent will ever encounter and exits
clean — `agent-fit.md` failure mode 1, the highest-severity one, generated
not by a stale path but by the table syntax. The same bug is live in CLI-01
(`'println!\|print!'`), EXIT-03 (`'get_matches\(\)\|::parse\(\)'`), and
CLI-13. **Splitting alternation into two cells is the layout-agnostic fix
and the correctness fix at the same time**, which is the shape of the whole
argument: the hardcoded path is a symptom of cells written by copying a
shell line into a table, and the rewrite pass is where they get fixed.

### EXIT-02

Before:

> | EXIT-02 | … | `` rg -n 'process::exit' src/ crates/ \| rg -v 'fn main' `` | MUST |

After:

> | EXIT-02 | … | `` rg -tn rust 'process::exit' `` — each hit is `main`'s return path or the documented signal re-raise | MUST |

The `| rg -v 'fn main'` filter was also inert: `process::exit` and `fn main`
are essentially never on the same line, so the inverse-match drops nothing.
Two hits in a real workspace is a list an agent reads, not a list it filters.

### EXIT-03

Before:

> | EXIT-03 | … | Integration test: `<bin> --bogus` exits 64. `` rg -n 'get_matches\(\)\|::parse\(\)' `` finds un-intercepted sites | MUST |

After:

> | EXIT-03 | … | `cargo run -q --bin <bin> -- --bogus`; `$?` is 64. Separately, `` rg -tn rust 'get_matches\(\)' `` and `` rg -tn rust '::parse\(\)' `` — each hit is inside a `try_` wrapper | MUST |

`<bin>` stays, but stops being an undefined token: see checklist item 7.
Note this cell was *already* half layout-agnostic — the behavioural half
(`<bin> --bogus` exits 64) has never had a path in it and never needed one.
The best cells in this file are the ones with no layout coupling; that is
evidence, not coincidence.

### CLI-01

Before:

> | CLI-01 | The result goes to stdout; logs, progress, warnings, prompts and errors go to stderr, unconditionally. | `` rg -n 'println!\|print!' src/ crates/ `` — hits outside result formatting are findings | MUST |

After:

> | CLI-01 | The result goes to stdout; logs, progress, warnings, prompts and errors go to stderr, unconditionally. | `` rg -tn rust 'print(ln)?!' `` — every hit is in the one result-formatting module | MUST |

### CLI-14 (`xtask`)

Before:

> | CLI-14 | Completions and man pages are generated from the same `clap::Command` used for parsing, via `clap_complete`/`clap_mangen` in an xtask. | A checked-in completion script with no generator is a finding | SHOULD |

After: **unchanged.** `xtask` is a Rust-community convention (the
`cargo-xtask` pattern), not an OCX directory. The measurement's regex counted
it as a layout literal; it is a false positive. 1 of the 7 literals in this
file does not exist. Report it rather than rewrite around it.

### The two prose references

The preamble already says the entry point "is not reliably named `main.rs` or
`exit_code.rs`, which is why this is routed to by subject rather than matched
by path." That is not coupling — it is this proposal's own thesis, already
written into the file by its author. Keep it.

CLI-12's "Help-text gates in `task verify`" becomes "the repo's help-text
gate." This one is a **real precision loss** with no cargo-native
replacement; see *What it does NOT solve*.

### Net for `cli-contract.md`

6 real layout literals removed, 1 was never a literal, 3 vacuous-pass regex
bugs fixed in passing, 1 cell degraded from a command to a description. Zero
lines added. The 19 pinned exit-code values are untouched.

## Mechanics

**Authoring.** One pass over 27 files against a 7-item checklist:

1. **Anchor once, in the preamble, not per cell.** Add one line to
   `rules/rust-quality.md`'s *Gate* section: *"Run every verification cell
   from the workspace root — `cargo locate-project --workspace
   --message-format plain` names it."* Verified: that command prints
   `/…/Cargo.toml` for the workspace root. One sentence amortised over 144
   literals is the single largest win available.
2. **Delete the path argument; add `--type rust`.** `rg -n 'pat' src/
   crates/` → `rg -tn rust 'pat'`. ripgrep defaults to the tree below cwd and
   already honours `.gitignore` (so `target/` and vendored dirs are skipped);
   `--type` filters by *extension*, which is a property of the file, not of
   where someone put it. The path argument only ever narrowed, and a wrong
   narrowing is a silent green.
3. **Prefer the cargo-native command.** Anything cargo can answer, cargo
   answers with no paths: `cargo clippy --workspace --all-targets` discovers
   members; `cargo tree -i <crate>` answers presence; `cargo metadata
   --no-deps` yields every target's exact `src_path` (verified — it returns
   `/…/src/main.rs` per target). The corpus already does this in TEST-28,
   TEST-33, TEST-35, TEST-40. Generalise the habit.
4. **Derive a path set only when the narrowing is load-bearing.**
   `cargo metadata --no-deps --format-version 1 | jq -r
   '.packages[].targets[].src_path'` is the correct primitive
   (`agent-fit.md`: *"a derived path can't go stale the way a hardcoded one
   can"*) — but it is three lines of ceremony in a 200-line budget. Reach for
   it in maybe two cells corpus-wide, not as the default.
5. **Let frontmatter scope, not the command body.** `rust-quality.md` already
   declares `paths: ["**/*.rs"]` — extension-based, already layout-agnostic,
   already doing the job. Repeating that scope, wrongly, in 144 command
   bodies is duplication, not information.
6. **Split alternation into separate cells.** A `|` in a markdown table must
   be escaped, and the escape changes the regex. Never write alternation in a
   table cell.
7. **Define the placeholders once.** `lore-hardcoding.md`'s sharpest finding
   is that 39 distinct angle placeholders occur 154 times and **not one is
   ever defined**. A four-line glossary in `rust-quality.md` (`<bin>` = a
   binary target in this workspace; `<crate>` = a workspace member; `<src>` =
   a target's source root, from `cargo metadata`) fixes all 154 at once and
   costs four lines. This is the cheapest single item on the list.
8. **Outcome phrasing is a last resort, not an escape hatch.** Only where no
   command exists (CI-file checks, review heuristics). A non-runnable cell is
   *worse* than a wrong path — it can never go red or green.

**Build / publish / install / update: nothing changes.** `grim build` packs
the same tree, `grim release` computes the same kind of digest, the
materializer lands the same verbatim bytes (`materializer.rs:41-42`, *"the
canonical bytes land verbatim"*), and `grimoire.lock` pins the same way.

The update path is where this quietly wins. `grimoire-capability.md` §4
records the only two states an installed file can be in — `Intact` or
`Modified` — and the only two outcomes on drift: refuse with exit 65, or
clobber with `--force`. A layout-agnostic rule gives the consumer **nothing
to edit**, so the file stays `Intact` forever and every `grim update` takes
the "untouched, new digest → overwrite, no flag needed" branch
(`update.rs:140-148`). Every other proposal in this design space creates a
reason for the consumer to touch the installed file, and touching it is
precisely what drops them into clobber-or-refuse.

**Content addressing is not merely preserved, it is strengthened.** One
artifact, one digest, byte-identical for every consumer — two teams can
compare `grimoire.lock` digests and know they hold the same rule. Any
substitution mechanism forfeits that: either the digest covers the template
(and the installed bytes are no longer the addressed bytes) or it covers the
rendered output (and one artifact has N digests).

**Client work at load time: zero.** The rule stays a static markdown file,
which is the only artifact shape every client in `prior-art.md`'s survey
supports — Cursor, Copilot, OpenCode and Amp are documented as having no
variable surface whatsoever.

**Context budget: net negative.** The rewrite deletes characters (`src/
crates/` ×3 is 24 bytes per cell) and adds one preamble line and a four-line
glossary. No ceremony lands in the rule text.

## What it costs

**Author (us).** One focused pass, ~27 files. Judgement per cell on whether
the narrowing was load-bearing — most were not. The recurring cost is
discipline with no enforcement behind it: nothing in `grim build` rejects a
directory literal in a table cell, so file 28 can reintroduce `src/`. A
~50-line `grim build` lint would close that, and is a much smaller feature
request than a parameterization subsystem — but it is not zero, and this
proposal does not pretend to reach zero.

**Consumer.** Zero. No new file, no new syntax, no values to supply, no
answers file to protect from hand-editing, no context spent on ceremony. Set
against `prior-art.md`'s survey, that is the whole comparative case: Helm
costs a values file, Terraform costs supplying typed variables, Copier costs
a `.copier-answers.yml` that *"you should never manually change"* on pain of
*"unpredictable behavior of the smart diff algorithm."*

**Grimoire maintainer.** Zero. No feature, no docs page, no new state in
`.grimoire/state.json`, no new failure mode in `install`/`update`/`status`,
no new interaction with the drift gate, no new question about what a digest
covers. This is the only proposal in this design space whose grimoire-side
diff is empty.

## Failure modes

1. **The rule stops smelling foreign.** Today, `src/ crates/` in a cell is a
   visible signal that the artifact came from somewhere else — a consumer
   reading it knows to check. After the rewrite the file reads as universal
   while the exit-code table is still binding and still OCX's. This makes
   mis-adoption *easier*, and it is the failure mode I am least comfortable
   with. Mitigation: the two-layer mechanism/pinned preamble that
   `cli-contract.md` and `testing.md` already carry must go on **every**
   policy-bearing file (11 by `lore-hardcoding.md`'s count), not just those
   two. That is a real new obligation this proposal creates.
2. **The loud-failure signal is traded away.** `agent-fit.md` mode 2: `rg` on
   a nonexistent path exits nonzero with stderr — genuinely useful on a port.
   Dropping the path removes it. The trade is deliberate: mode 1 (existing-
   but-wrong path → structurally vacuous green) is rated the higher-severity
   and higher-frequency mode by the same artifact, because `src/` exists in
   almost every Rust repo while holding none of the code you care about.
   Trading a rare loud failure for the removal of a common silent one is
   right, but it is a trade.
3. **Over-broad match.** Removing the path widens the scan to docs, research
   markdown, and fixtures. In *this* repo that is a live regression —
   `.agents/research/` quotes the banned patterns verbatim. `--type rust`
   kills it outright, which is why the checklist mandates the type filter
   rather than merely deleting the path. Residual: a Rust vendor directory
   committed and un-gitignored.
4. **Convention decay.** No enforcement; see *What it costs*.
5. **Cargo-shaped assumption.** Every cargo-native cell fails when the agent
   is invoked from a subdirectory of a polyglot monorepo. The mitigation
   (the "run from the workspace root" preamble line) is itself a convention.
6. **Outcome phrasing metastasises.** "Phrase it as an outcome" is a licence
   to stop writing runnable commands, which is a direct regression against
   CFG-05 and VERIFY-07. The checklist ranks it last on purpose; a reviewer
   should treat a new outcome-phrased cell as a finding unless the cell
   argues why no command exists.

## The case against

Argued at strength, from `prior-art.md`.

**(a) "No mechanism" is the bottom of prior art's own ranking, and it is
where rustfmt lives.** `prior-art.md` places "static file, no mechanism" at
tier 9 of 9 on the update axis, alongside Cursor/Copilot/OpenCode/Amp, and
documents rust-lang/rustfmt#5313 — open for years — where a maintainer of
multiple Rust services asks for exactly Prettier's shareable-config model
because *"any style guide updates require manually copying updated files to
every project."* My rewrite improves *portability*, which is a different
axis from *parameterizability*. A consumer who needs a different exit-code
table still has rustfmt's exact problem: fork the file, lose upstream
forever. I am solving the axis where the pain is smaller.

**(b) The measured split is against me by line count.** `lore-hardcoding.md`
buckets the corpus at 31% layout-only and 42% policy-bearing by line. I fully
solve the 31% and none of the 42%. If the owner's question is really "could
another team adopt this," the answer after my pass is still *"not without
forking eleven files."* The flagship example the owner is looking at —
`cli-contract.md` — is in bucket C, and my rewrite leaves its 19 pinned
values exactly where they were.

**(c) The trick is Rust-specific and grimoire is polyglot.** My whole
mechanism leans on cargo being a layout oracle. That is true in Rust and
false almost everywhere else — there is no `cargo metadata` for "where is a
TypeScript monorepo's source" and none for "where is CI." A parameterization
feature in grimoire generalises across every ecosystem lore will ever
publish for; my checklist has to be reinvented per ecosystem and will
sometimes have nothing to reinvent it *from*.

**(d) Terraform's `variable` block is genuinely the better artifact for one
real class here.** `prior-art.md` shortlists it as the strongest model for
values that must land *inside* the artifact body: typed, defaulted,
validated, machine-checked. There is a class of hardcoding my rewrite cannot
touch because it is a *name*, not a path — `BatchReport`, `OciTransport`,
`CredentialStore`, the `OCX_`/`GRIM_` env prefixes. No amount of `cargo
metadata` derives a type name a consuming project chose. My answer is "there
are few enough to spell out in prose," which is an argument from current
volume, not from principle — and volume grows.

**(e) Kustomize's rationale does not actually support "no mechanism."**
I lean on Kustomize's eschewed-features document, but Kustomize did not
answer "templating is bad" with "write your YAML more generically" — it built
patches and overlays, a real mechanism with real machinery. The precedent
argues against *string substitution*, not against having any mechanism at
all. Using it to justify zero features overreads it, and `prior-art.md`'s own
conclusion is explicitly *composition over templating*, not *nothing over
templating*.

**(f) The composition answer is available today with no feature, and I am
declining it.** Publishing `rust-cli-contract` (portable mechanism) and
`ocx-exit-codes` (the table) as two rules that a bundle groups is pure
grimoire-as-it-exists — the ESLint/Cargo-`workspace.lints` shape
`prior-art.md` ranks first. I defer it on YAGNI grounds (one consumer today;
splitting means rewiring `rust-quality.md` non-negotiable #7 and `errors.md`
ERR-12's cross-references). But "the better answer exists and I am not doing
it yet" is a weaker position than "no better answer exists," and I should not
pretend otherwise.

**(g) A convention beats no convention only while someone enforces it.**
VERIFY-07 — this corpus's own rule — distrusts exactly the class of guarantee
I am offering: *"prove a check can go red before trusting it green."* A
mechanism is enforced by construction. A checklist is enforced by whoever
reviews the next PR.

## What it does NOT solve

- **The 140 pinned-policy values.** The exit-code table, the 14 named
  restriction lints, MSRV, the toolchain channel, the pinned crate set, the
  25-method/2-impl ceiling. No rewrite makes these portable. **On the
  exit-code table specifically:** leave it exactly as it is, and rely on the
  two-layer preamble already at `cli-contract.md:13-21` — *"another project
  adopting this rule keeps the mechanism and assigns its own numbers above
  78."* That is the parameterization mechanism, implemented in six lines of
  prose, costing the consumer nothing at install time and grimoire nothing at
  all. Parameterizing it produces a rule that says "use an enum with numbers
  you chose," which clig.dev already says for free and which does not justify
  200 lines of always-on context. Splitting it into a second artifact (case
  against, (f)) is the right move the day a second project adopts — not
  before.
- **Named project types and env prefixes.** `BatchReport`, `OciTransport`,
  `CredentialStore`, `ClassifyExitCode`, `OCX_`/`GRIM_`, the `oci.*` tracing
  field convention. Not derivable, not paths.
- **CI-file paths.** `.github/`, `taskfiles/` — ~15 cells across `testing.md`
  and `rust-cargo.md` (TEST-22, TEST-24, TEST-37 and siblings). There is no
  cargo command for "where is CI." Best available is outcome phrasing, which
  loses a runnable command. This is the one place the proposal makes cells
  measurably weaker.
- **`rust-review/references/dimensions.md`'s rule-ID citations.** A consumer
  who takes the skill without the rule corpus gets dangling `ARCH-01`/
  `ERR-19` references. That is a composition problem, not a layout one.
- **Any non-cargo ecosystem.**
- **Enforcement.** Nothing in `grim build` validates the checklist.
- **Fork-and-diverge.** A consumer who edits an installed rule is still in
  `grimoire-capability.md`'s clobber-or-refuse trap, with no three-way merge
  and no `grim eject`. This proposal only removes most of the *reasons* to
  edit; it does not change what happens when someone does.
