# code-docs-cleanup: held-out validation (2026-09-27)

This run followed the shipped artifacts only: `skills/code-docs-cleanup/` (SKILL.md and
references), `rules/code-docs.md`, `rules/code-docs/*.md` and `rules/code-docs/checks/*.py`
from the `code-docs` worktree at `ddb2515`. Nothing under `.agents/research` was read.

The procedure ran in sweep mode with one file per commit and `BASE=HEAD` for each file.
The re-check was capped at 4 guards per repo, as the brief asked. The skill requires every
shortened guard in a sweep to be re-checked, so this cap is the one deviation from it.

- **Clones** (never pushed; the originals were not touched):
  - `~/.cache/research-lang/code-docs-heldout/cleanup/bob`, branch `code-docs-sweep`
  - `~/.cache/research-lang/code-docs-heldout/cleanup/obere-heide-planer`, branch `code-docs-sweep`
- **Evidence:** `~/.cache/research-lang/code-docs-heldout/cleanup/_evidence/`. It holds the
  worklist, which was written before any edit, every probe prompt with its answer and
  tool trace, the gate logs, and the base baselines.
- **Vendoring:** the rule was installed nowhere. The skill's Setup step 1 says to run
  `grim add` and stop. Instead, the tracked `rules/code-docs.md` and `rules/code-docs/`
  were copied into each clone's `.claude/rules/` and committed first: `209df33` in bob and
  `ba45534` in obere. Both self-tests exit 0.

## Headline

| | bob (Rust) | obere-heide-planer (TS) |
|---|---|---|
| Files in scope | 4 | 3 |
| Comment lines in scope, before → after | 448 → 385 | 196 → 174 |
| Lines in over-cap blocks in scope, before → after | 162 → 0 | 53 → 0 |
| Repo over-cap lines, before → after | 226 → 64 | 218 → 165 |
| Guards found in scope (my reading) | ~41 | ~21 |
| Guards shortened, reworded or moved | 10 | 5 |
| Guards kept verbatim | ~31 | ~16 |
| Guards credited to a proven owner (shrunk to a pointer) | 0 | 0 |
| Tests proven red by a planted edit but not named by the block, so the prose stayed | 3 | 1 (plus 1 check script) |
| Re-checks passed on the first run | 3 of 4 | 2 of 4 |
| Re-checks passed after one rewrite | 4 of 4 | 2 of 4 (the other 2 are listed for a human) |
| Diff | 4 files, +86 / -149 | 3 files, +30 / -52 |

The "Guards found" and "kept verbatim" rows are my per-block reading of the in-scope files.
No check produces those numbers.

## bob (Rust)

### Scope

Files were picked by `comment_census.py --over-cap`, most over-cap lines first. The fifth
file, `bob_expander_script/src/api.rs` with 25 lines, was not included.

| File | Blocks | Comment lines, before → after | Over-cap lines, before → after | Commit |
|---|---|---|---|---|
| `crates/bob_engine/src/lib.rs` | 49 | 205 → 179 | 65 → 0 | `b825167` |
| `crates/bob_cli/src/main.rs` | 37 → 39 | 151 → 136 | 43 → 0 | `b6722ff` |
| `crates/bob_cas/src/lib.rs` | 17 → 19 | 63 → 54 | 27 → 0 | `c01b10a` |
| `playground/crates/bob_expander_script/src/lib.rs` | 3 | 29 → 16 | 27 → 0 | `0b245fb` |

Both in-flight commands printed nothing. In the clone that proves little (see D18).

### Guards

| Guard | What was done | Owner evidence |
|---|---|---|
| E1: engine `eval_node`, resolve before keying | Shortened from 7 to 5 lines. Constraint, consequence and tempting edit kept. | None claimed. Not re-checked because of the cap. |
| E2: engine, the produced row decides the boundary seal | Shortened from 8 to 5 lines. | Planted edit: dropping the check turns `a_boundary_over_an_uncacheable_subgraph_is_never_sealed` red. The block never named the test, so the prose stays. |
| Ha: cli `advances_frontier`, the `Access` spin | 12-line doc essay split. The hazard moved to a plain comment at `!event.kind.is_access()` (GRD-04, LEN-05). | None. |
| Hb: cli, `SKIP` itself and not a second list | Moved to a plain comment at `!SKIP.contains`. | None. |
| Ja: cas `write_durable`, EXDEV | Doc hazard moved to a plain comment at `new_in(parent)`. | None. |
| Jb: cas, a failed fsync is never retried | Moved to a plain comment at `sync_all`. | None. |
| K: cas `put`, a torn write served forever | Guard shortened from 6 to 4 lines. The `ponytail:` label stays on its own line. | Planted edit: trusting the file's existence turns `a_corrupt_entry_is_rewritten_rather_than_trusted` red. Not named, so the prose stays. |
| L: cas `walk`, a symlink drops out of the frontier | "Used to drop out" rewritten as a present-tense guard (RTE-11). | Planted edit: deleting the branch turns `a_symlink_in_the_tree_is_an_error_rather_than_an_omission` red. Not named, so the prose stays. |
| M: expander_script module doc, deterministic because no capability is granted | Tightened. `ponytail:` label kept. The Starlark argument was dropped. | None. |
| N: expander_script, the pinned rhai hashing seed | One edit with two consequences, plus the discard rationale. Shortened from 6 to 4 lines, then rewritten after the re-check. | None. |

Other edits in scope:

- Contract and why blocks tightened: `ExpanderFn`, `check` and `run` docs (the `AGENTS.md`
  pointer kept), the cli module doc and the `inspect` doc.
- Short labels D1, D8 and D3 removed from prod comments (LNK-13).

Left for another change:

- `Digest` doc cites `eval::key`. No such symbol exists: the function is `bob_engine`'s
  private `key`.
- The D8 short label stays in the `bob_cli` test region (CLN-05).
- The D1 argument stays in `docs/design/decisions.md`, with no pointer to it (see D5).
- `RUSTDOCFLAGS='-D warnings' cargo doc` was already red at the base: the
  `bob_expander_script` module doc links `[api]`, a private module.

### Re-check results

Each probe was a fresh `claude -p --model sonnet --setting-sources project,local` session
with `--allowedTools Read Grep Glob Bash`, `--disallowedTools Edit Write NotebookEdit
WebFetch WebSearch Agent Task` and `--max-budget-usd 2`. The unled turn came first; each led
turn resumed the same session. No probe read the base through `git show` or `git diff`: the
tool traces are in the evidence directory.

| Guard | Unled answer, summarised | Mechanism and consequence named? | Led verdict | Result |
|---|---|---|---|---|
| E2, seal | Cacheability is derived from the produced effects, so a `net.write` subtree is never memoised into the boundary cache. | Yes | keep | Pass |
| Ha and Hb, `advances_frontier` | Dropping `Access` breaks the snapshot → open → `Access` loop. Reusing `SKIP` keeps the engine's own `.bob/` and `out/` writes out, and keeps the watch and the snapshot from drifting apart. | Yes, both | keep, keep | Pass |
| K, torn write | The read and rehash exist because a crash can leave the right name over wrong bytes, and a mismatch self-heals. Cites the unnamed test. | Yes | keep | Pass |
| N, seed pin, first run | Pinned for determinism, and `let _` covers the second call. Did not mention the trap. | Mechanism plus one of two consequences | keep | Not passed. A base probe named both the trap and non-determinism, so the rewrite was changed to lead with the trap. |
| N, seed pin, second run | The component traps because `wasi:random` is not granted, and resolution varies per process. | Yes, both | keep, keep | Pass |

Probe spend: about $13.7 for bob, over 6 sessions including 1 base probe.

### Check results for bob

| Check | Result |
|---|---|
| `cleanup_check.py --base 209df33` | Exit 0: 0 blocking, 5 `CLN-02 review` items. All 5 were read against the worklist and every breaking edit keeps its own sentence. |
| `comment_census.py --check` against a baseline built at the base | Exit 0. 4 files dropped. |
| `linkage_check.py ids --check` and `pointers --check` | Exit 0. 3 `short-label` drops. |
| `linkage_check.py records --base 209df33` | Exit 0. No protected records exist. |
| `cargo fmt --check`, `cargo check --locked`, `cargo clippy -D warnings` | All exit 0. |
| `cargo test --workspace` | Exit 0, 21 passed. |
| `RUSTDOCFLAGS='-D warnings' cargo doc --workspace` | Exit 101, before and after. Same error, already present at the base. |
| `cargo test --doc -p bob_cli` and `-p bob_expander_script` | Exit 101: "no library targets". These crates have no lib target. |
| Step-8 pointer `comm` lines | Nothing dropped, nothing added. |

## obere-heide-planer (TypeScript)

### Scope

This repo took the top 3 files. `src/catalog/index.ts` and `src/planer/view.ts` tie at 12
over-cap lines and were left out.

| File | Blocks | Comment lines, before → after | Over-cap lines, before → after | Commit |
|---|---|---|---|---|
| `src/catalog/schema.ts` | 62 → 64 | 107 → 96 | 23 → 0 | `fc4a1cd` |
| `src/planer/catalogs.ts` | 14 | 42 → 35 | 17 → 0 | `93e771c` |
| `src/planer/gear.ts` | 19 | 47 → 43 | 13 → 0 | `5fd2d2b` |

The JSDoc in `schema.ts` renders into the checked-in `schema.json` through
`tools/catalog-schema.mjs`. Only plain `//` comments were touched. `tools/check.mjs`
confirms that the schema did not drift.

### Guards

| Guard | What was done | Owner evidence |
|---|---|---|
| S1: schema header, "change a type here, regenerate, commit both" | This was an order with no consequence (GRD-05). Rewritten as a fact plus a consequence. The consequence is one the code shows. | Planted edit (add a field, do not regenerate): `tools/check.mjs` goes red; `tests/unit/catalog.test.ts` stays green (23 passed). Only `check.mjs` is named. The generator's own comment names the test, which does not catch this. |
| S2: ports are the truth, never counted again under `specs` | Moved from the header to a plain comment above `Specs`. | The test "no file counts its ports a second time under `specs`" exists. It is a universal-negative candidate (RTE-04). |
| S3: the FRITZ!Box SFP cage and the UCG WAN uplinks are typed `wan` | Moved to the `Port.type` field. | None. |
| G1: gear header, "ports are never counted by hand" | Reflowed. Pointer changed to `docs/DATA-MODEL.md#ports`. | None. |
| G2: `jbCap`, a media converter adds no port | Shortened from 7 to 5 lines. | Planted edit (drop `dist`): "a converter next to a switch adds nothing — its port feeds the switch" goes red. Not named, so the prose stays. |
| C1: catalogs header | Contract. Keeps "currently 09/2026", which `tools/check.mjs` asserts (see D10). | — |
| C2: conduit model | Contract plus one why sentence. | — |

Left for another change:

- S2's rule is written in 4 places: `CLAUDE.md`, `docs/DATA-MODEL.md`, the schema comment
  and the gear header. That makes it an RTE-07 rule candidate, and the probe's led answer
  cited `CLAUDE.md`.
- The comment in `tools/catalog-schema.mjs` credits `tests/unit/catalog.test.ts` with
  catching schema drift. The planted edit shows that test stays green.

### Re-check results

| Guard | Unled answer, summarised | Mechanism and consequence named? | Led verdict | Result |
|---|---|---|---|---|
| S1, regenerate (anchored on `Codecs`) | Explained why `main` is required and `sub` optional. Nothing about regeneration. | No | keep, citing the rewritten header | Not passed. A base probe did no better on the unled turn, and its led verdict was `may-change`. Rewrite kept and listed for a human (see D8). |
| S2, ports under `specs` (anchored on `Specs`) | Explained why every field is optional. Nothing about port counts. | No | keep, citing `CLAUDE.md` | Not passed. Base probe no better. Rewrite kept and listed (see D8). |
| S3, `wan` typing | Typed `wan` because typing it as a LAN cage lands fibre on the WAN port. | Yes | keep | Pass |
| G2, converter | The `dist` fallback avoids double-counting a converter that feeds a switch. | Yes | keep | Pass |

Probe spend: about $7.3 for obere, over 6 sessions including 2 base probes. Across both
repos, the 12 sessions cost about $21.

### Check results for obere

| Check | Result |
|---|---|
| `cleanup_check.py --base ba45534` | Exit 0. 0 blocking, 0 review. |
| Census `--check`, ids and pointers `--check`, records | All exit 0. 3 files dropped. |
| `astro check` | 0 errors. It ran through a local `pnpm exec`, because `ocx exec -- pnpm` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, an environment problem. |
| `oxfmt --check src tools tests` | Exit 0. |
| `oxlint .` (`task lint`, run in CI) | Exit 1. All 5 errors are in the vendored `.claude/rules/code-docs/checks/fixtures/**/*.ts` (D11). `oxlint src tools tests` exits 0; its warnings were already there. |
| `vitest run` | 148 passed. |
| `astro build` | Exit 0. |
| `playwright test` | 100 passed. It ran with `PW_BASE_URL` pointed at the clone's own dev server, because the config's `ocx` webServer failed and port 4321 belonged to an unrelated project. |
| `tools/check.mjs` | Exit 0. It was exit 1 on the first draft of the `catalogs.ts` header (D10). |

## Friction and defects

Each entry gives the skill step or rule ID, what happened, and the smallest fix.

### Defects

**D2. Setup steps 2 and 3, CLN-05. The checks trip over their own bytecode.**

- *What happened:* running any check writes `__pycache__/*.pyc` into the vendored `checks/`
  directory. `cleanup_check.py --base HEAD` then reported 2 blocking CLN-05 findings for
  those `.pyc` files. The bob repo does not gitignore `__pycache__`.
- *Smallest fix:* set `sys.dont_write_bytecode = True` in each script, or have
  `cleanup_check.py` skip `__pycache__/` and installed rule directories.

**D10. Step 8 and GRD-06: a comment a repo check requires is invisible.**

- *What happened:* `tools/check.mjs` asserts that the string `09/2026` appears in the
  `catalogs.ts` header. Nothing in the comment says so, and the recogniser stays silent. A
  draft that dropped "currently 09/2026" as stale provenance passed `cleanup_check.py`
  (exit 0) and failed `tools/check.mjs`.
- *Why step 8 misses it:* step 8 says to run "the repo's own gate, the one CI runs", but
  `ci.yml` never runs `tools/check.mjs`. Only `task check` does.
- *Smallest fix:* in step 1, run `git grep -n -F "$FILE" -- tools scripts .github Taskfile*`
  and treat any check that reads the file as an owner of its comment text. In step 8, name
  the full local check chain, not only what CI runs.

**D11. Adopting the rule turns the adopter's linter red.**

- *What happened:* vendoring the rule adds `.ts` fixtures under
  `.claude/rules/code-docs/checks/fixtures/`. `oxlint .`, which CI runs, fails with 5
  `no-unused-vars` errors, all of them in those fixtures. The checks skip `.claude/rules/`;
  the repo's own tools do not.
- *Smallest fix:* ship the fixtures with a non-source suffix such as `.ts.txt` and map it
  back in `--self-test`, or have `--self-test` generate them in a temp directory. Otherwise,
  document the linter ignore.

**D19. CLN-05 and LNK-05 (MUST row 11): `cleanup_check.py` does not check added pointers.**

- *What happened:* in a temporary edit, a new `docs/design/decisions.md#d1` pointer in a
  comment-only diff got exit 0 from `cleanup_check.py`. Only the manual `comm` line in step
  8 prints it.
- *Smallest fix:* move the added-pointer comparison into `cleanup_check.py`, which already
  holds the diff.

**D7. LNK-02 and GRD-11: the pointer grammar cannot see this repo's records.**

- *What happened:* bob's records are `docs/design/decisions.md` and `graph-ir.md`, cited as
  "docs §7". Neither matches a record stem or an `adr/` or `decisions/` directory. In a
  temporary edit, a dead anchor `docs/design/decisions.md#zz9` got `lnk02=0`. No config key
  adds a stem or a directory.
- *Smallest fix:* add a `pointer_globs` key to `.code-docs-linkage-config.json`, or reuse
  the `records` globs for pointer detection.

**D6. LNK-13's definition heuristic reads a citation as a definition.**

- *What happened:* "D1:" at the start of a doc line in the `check` doc cites
  `decisions.md` D1, but the check takes a label plus a colon at line start as the
  definition. That line goes unflagged, while a later citation of the same label is
  flagged. "D8:" behaves the same way.
- *Smallest fix:* treat a label as defined only in the file where its heading or definition
  list lives, or when it is followed by the definition text and cited nowhere else.

### Contradictions and missing cases

**D5. Step 6 contradicts step 8 and LNK-05.**

- *What happened:* step 6 says that when a tracked record already holds an argument, you
  delete it and keep one pointer. The `check` doc restates `decisions.md#d1`. Adding that
  pointer fails step 8's added-pointer check. Declaring the record with `--relocation`
  fails CLN-04 ("contains none of the prose"). No legal path exists, so I dropped the label
  with no pointer.
- *Smallest fix:* step 8 also accepts an added pointer to a tracked record that already
  holds the removed argument, which is the RTE-09 path.

**D4. Step 5 and the decision list, section 2, are stricter than GRD-08 and RTE-03.**

- *What happened:* the skill credits a test only when the original block names it. The rule
  only asks for a proven planted-edit failure.
- *Cost:* 4 guards had tests that went red on the planted edit (E2, K, L, G2) and still keep
  their full prose. Nothing says whether this strictness is intended.
- *Smallest fix:* state it as intended ("unnamed proven owners: keep the prose, and you may
  add the owner line"), or align the skill with the rule.

**D8. Step 9 cannot probe a guard with no implementing line.**

- *What happened:* S1 is a file-level rule (any type change needs a regeneration). S2 guards
  against an addition (a port count under `specs`). An unled question anchored on a code
  line cannot reach either. The rewrite and the base both missed on the unled turn, which
  cost 4 extra sessions and still left both unresolved.
- *Smallest fix:* for RTE-04 or file-level guards, anchor the probe on the test or check that
  asserts them, or skip the probe and list the guard. Say which in `reason-recheck.md`.

**D9. `reason-recheck.md` scoring has no rule for one edit with two consequences.**

- *What happened:* guard N's first unled answer named the mechanism and one of its two
  consequences. The table would score that "mechanism plus consequence" and pass it. The
  base comparison showed the trap consequence had been lost.
- *Smallest fix:* the top level requires every consequence recorded for the edit; score a
  partial answer as Mechanism.

**D20. No routing row for a guard whose breaking edit lands in a data file that holds no
comments.**

- *What happened:* S3's rule is enforced in the `product.json` files. I put it at the schema
  field, `Port.type`, and was unsure that was right.
- *Smallest fix:* add a routing row: the type or field that constrains the data, or the test
  that asserts it.

**D12. Steps 3 and 4 do not say whether a well-formed guard within the cap must be
rewritten.**

- *What happened:* step 3 says every block goes through classification, and step 4 says to
  rewrite each guard. Taken literally, that means about 47 rewrites across the two repos. I
  left well-formed guards within the cap byte-identical.
- *Smallest fix:* "Steps 4 to 7 apply to over-cap blocks, bare IDs and guards that fail
  GRD-01 or GRD-05. Everything else stays byte-identical."

**D17. The checks cannot see a TS-to-JSON-Schema generator.**

- *What happened:* the JSDoc in `schema.ts` renders into `schema.json` through a custom
  generator. `cleanup_check.py` would not freeze those lines. Only `tools/check.mjs` catches
  drift, and CI does not run it.
- *Smallest fix:* let `.code-docs.json` declare extra interface files, or tell the adopter to
  grep for generators that read the file.

**D21. Step 8 does not say what to do when the gate is already red at the base.**

- *What happened:* bob's `cargo doc -D warnings` fails at the base.
- *Smallest fix:* "Run the gate at BASE first; only new failures count."

### Friction

- **D1. Setup step 1: no vendor or offline path.** The only instruction is to run
  `grim add` and stop. The rule is not published yet, so I copied it into `.claude/rules/`
  by hand. *Fix:* "Or copy `code-docs.md` and `code-docs/` into the client's rules
  directory, and commit that before the cleanup."
- **D3. Step 8 names `cargo test --doc` unconditionally.** On a crate with no lib target it
  exits 101 with "no library targets". Here that was `bob_cli` (a bin) and
  `bob_expander_script` (a cdylib). *Fix:* "on crates with a lib target".
- **D16. Step 5's scratch worktree gives no advice on dependencies or build cache.** With
  the default `target/`, each proof would need a cold wasmtime build. With a shared
  `CARGO_TARGET_DIR`, each proof took seconds. The TS scratch copy needed `node_modules`
  symlinked in. *Fix:* one line each for reusing `CARGO_TARGET_DIR` and linking
  `node_modules`.
- **D18. Scope's in-flight check fails silently.** `gh pr list` against a remote that is not
  on GitHub prints its error to stderr and nothing to stdout. The skill's rule is "prints
  nothing means clear". *Fix:* append `|| echo "in-flight check unavailable"`.
- **D14. Step 9's timing does not fit the sweep.** The re-check runs "before you commit",
  but a sweep commits one file at a time. Picking the most-shortened guards across the repo
  therefore meant reading every file first. That was a minor cost caused by the brief's cap.

### Numbers for calibration

- **Proofs:** 6 planted edits in total (bob 3, obere 3). Each took 1 to 5 seconds on a warm
  build.
- **Probes:** 12 sessions, about $21 in total. Each unled turn cost $0.35 to $1.17, and each
  led turn $0.37 to $1.23.
- **Wall time:** 2.5 to 3 hours for 7 files. The probes and the reading of every block
  dominated.
