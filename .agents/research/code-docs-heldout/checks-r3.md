# code-docs held-out round 3

Part A repos: `/home/mherwig/dev/{bob,obere-heide-planer,kate-middlechild,
ocx-mirror-sdk,setup-ocx,vscode-ocx}`, read-only, existing checkouts.
Part B repos: cloned blob-less via `/usr/bin/git clone --filter=blob:none`
into `~/.cache/research-lang/code-docs-heldout/r3/{codex,llm}`. All commands
run against `rules/code-docs/checks/*.py` in the catalog worktree.

## Part A — regression verdict (5 fixed classes)

| Fixed class (round) | Verdict | Evidence |
|---|---|---|
| `.vue/.svelte/.astro` unscanned (r1 #7) | **FIXED** | `kate-middlechild/packages/web/src/components/TopBar.astro:2` now flags `LEN-02` (20-line doc block) — the exact instance r1 said was invisible. `obere-heide-planer`'s 10 `.astro` files all appear in `--list-blocks` (e.g. `src/pages/planner.astro:2`), just under cap so no finding — not a miss. |
| `records` silent when no record file matched (r1 #4 root cause) | **FIXED** | Forcing `scanned=0` (bogus glob on `ocx-mirror-sdk`) now prints `records: no file matched the record globs; name the repo's records under \`records\` in the config` to stderr; `bob`/others with `scanned>0` print no such warning (correctly conditional). |
| YAML surfaces scanned as raw text (r2 class 1) | **FIXED** | `interface_leak.py action.yml` on `setup-ocx` now returns 0 findings (was 2 FP on `runs.main`/`runs.post`); `_yaml_rendered()` walks only `description`/`title`/`deprecationMessage` keys. Injected a real leak into a copy of the same file (`src/setup.ts` in a description) — caught it, so the fix didn't just go silent. |
| Bare root filename in records treated as citation (r2 class 3) | **FIXED to advisory** | `vscode-ocx` records run: the `ocx.toml`/`ocx.lock` bare-filename hits are now `"severity": "should"` with message suffix `"; a bare root filename, confirm it names this repo's file"`, and the run exits 0 (advisory never sets exit code) — matches the task's "now advisory" framing exactly. |
| Actions/VS Code manifests missing from rule (r2 finding) | **FIXED** | `rules/code-docs/surfaces.md` now has explicit rows for GitHub Action and VS Code extension in both the "What Interface Text Is" table and the Output Gate table, plus an explicit bundled-dist warning ("Never feed a bundle... one Action bundle produced 3,003 hits, none real"). |

All five confirmed gone/resolved on the original repos that exposed them.

## Part B — codex (codex-rs, CLI crates: cli/, exec/, tui/, cloud-tasks/, file-search/, execpolicy/, config-schema/)

- `comment_census --report`: whole `codex-rs` is 706,977 code lines, 285
  over-cap findings tree-wide, ratio 0.06 (huge TUI-heavy app). Restricted to
  the 7 CLI-derived crates: 111 over-cap findings.
- `comment_census --over-cap`, sampled 20 across both codex (14, stratified
  random) and llm (6): **20/20 TRUE POSITIVE** — every block read (module
  `//!` essays up to 280 lines in `tui/src/bottom_pane/chat_composer.rs:1`,
  plain guard blocks, an `LEN-08` interface doc on `cli/src/doctor.rs:158`)
  was a genuine over-cap block, correctly bounded and counted by hand.
- `linkage_check.py ids --discover`: 2 candidates, `GPT-` (`apply-patch/src/
  parser.rs:158`, model name "GPT-4.1") and `ANSI-` (`tui/src/bottom_pane/
  effort_ignition.rs:10`, "ANSI-256/truecolor"). Both correctly non-ID
  domain vocabulary — discover surfacing candidates for a verdict is working
  as designed.
- `linkage_check.py ids`: 24 findings, all `LNK-13` short-label, 0 `LNK-01`.
  Read every one: `X11` (`tui/src/clipboard_copy.rs:11`, the X Window
  System), `D65` (`tui/src/color.rs:41`, CIE white point), `C0`
  (`tui/src/key_hint.rs:5`, ASCII control-char range), `L49/L57/L90/L99`
  (`git-utils/src/fsmonitor.rs:8`, `#L49-L57` GitHub URL line anchors),
  `L2`/`W1`/`U1..U3`/`E04` (test-scenario labels). 24/24 are the known
  LNK-13 domain-vocabulary-collision class, not real undefined process IDs.
- `linkage_check.py pointers`: 0 findings — true negative (no pointer-form
  citations in codex-rs).
- `interface_leak.py --source --lang rust .`: 14 findings, exit 0
  (advisory). All in `app-server-protocol/`, `config/`, `protocol/`,
  `utils/path-uri/` — confirmed by grep that every one is a `#[derive(...,
  JsonSchema, ...)]` struct/enum (schema-rendered interface text, not plain
  internal types). 11 intra-doc-link leaks (` [`Self::Extension`]`,
  `[`crate::types::Notice`]`) and 1 real source-path leak
  (`config/src/config_toml.rs:301`, a literal `github.com/openai/codex/
  blob/main/.../oauth.rs#L2` URL in a field doc that renders into the
  emitted JSON Schema) — **genuine SRF-01 violations in upstream code**, not
  scanner noise. 2 are MCP-spec-version ISO dates (`2025-11-25`,
  `2025-06-18`) embedded in external spec URLs — see failure class 1 below.
- Zero LNK-01/LNK-07/SRF-03-source crashes; `--source` ran in seconds over
  2,863 files / 3,510 interface lines, no build required.

### Five clap-derived structs read by hand (task requirement)

| Struct | File | Internal references found | Source scan caught it? |
|---|---|---|---|
| `MultitoolCli` | `cli/src/main.rs:113` | none | n/a — nothing to catch |
| `DoctorCommand` | `cli/src/doctor.rs:158` | none (a `hide=true` field mentions "Internal isolated filesystem probe" but that's user-facing framing, not a source/plan reference) | n/a |
| `tui::Cli` | `tui/src/cli.rs:9` | several `#[clap(skip)]` fields document internal wiring ("Internal: resume a specific recorded session... Set by the top-level `codex resume <SESSION_ID>` wrapper") but `clap(skip)` fields never render into `--help`, so this is out of SRF-01's scope by rule (row 10 governs *rendered* text) | n/a — correctly not flagged |
| `exec::Cli` | `exec/src/cli.rs:10` | none | n/a |
| `SandboxStateArgs` / `SeatbeltCommand` | `cli/src/lib.rs:25,48` | none (a `//` line above `SeatbeltCommand` explaining shared sandbox options is a plain comment, not a doc comment — correctly not interface text) | n/a |

Zero internal references across all 5; the `--source` scan's silence on
these exact files (0 of 14 findings fall in `cli/`, `exec/`, `tui/cli.rs`,
etc.) is a **true negative**, not a miss.

## Part B — llm (simonw/llm)

- `pyproject.toml` self-describes as "CLI utility and Python library" — no
  `.code-docs.json` present, so it is treated as app-kind (cap 10) though it
  is genuinely a consumed library. Recurrence of the known library-kind
  gap (see failure classes).
- `comment_census --report`: 12,702 code lines, ratio 0.153, 41 over-cap
  findings.
- `comment_census --over-cap`, sampled 6 (all of `models.py:451/1369`,
  `logs.py:665`, `cli.py:3546/3728`, `parts.py:1`): **6/6 TRUE POSITIVE** —
  genuine over-cap prose (a `PauseChain` docstring, `LogStore.verify()`'s
  docstring, a `similar` command's click docstring at `LEN-08`).
- `linkage_check.py ids --discover`: 1 candidate, `GPT-`
  (`llm/default_plugins/openai_models.py:76`, model names) — correctly
  non-ID.
- `linkage_check.py ids`: 1 finding, `LNK-13` on `tests/test_openai_messages.
  py:378` (`Q1, A1, Q2` — chat-turn test fixture labels). Known class.
- `linkage_check.py pointers`: 0 findings — true negative.
- `interface_leak.py --source --lang python .`: 0 findings. Manually read
  every `click.option(help=...)` and command docstring in `llm/cli.py`
  (`prompt`, `embed_multi`, `similar`, the `keys`/`chat`/`logs` groups) plus
  an AST scan of every function docstring for ID-shaped tokens, ISO dates
  and `.py:` refs: none found. True negative, not a miss.
- Output gate, real rendered help: `python3 interface_leak.py --lang python
  --help-walk "uvx --from llm llm"` (network, 120s budget) → **0 findings**,
  62 screens captured (`llm --help` plus every subcommand/sub-subcommand up
  to depth 4, including the click-default-group `prompt*`/`aliases list*`
  style entries — click's `*`-suffixed default-command name is accepted
  verbatim as an alias, so the walker's `Commands:`-section parser, written
  for clap/commander, recurses correctly into a click CLI without special
  casing). Manually read all 62 screens: no process ID, record filename,
  source path or ISO date anywhere — agrees with `--source`'s 0 findings and
  confirms the gate isn't just silently failing to invoke subcommands.
- Skimmed `llm/migrations.py`, `llm/parts.py`, `llm/models.py` beyond the
  sampled blocks: no further misses (comments are library-internal
  rationale or public API contract, no internal references anywhere).

## Failure classes

1. **(NEW) SRF-01's `iso-date` family has no exception for a date that is
   part of an external, versioned specification's own URL, unlike the
   bare-ID family's RFC-number carve-out.** Check: `interface_leak.py`
   (`SRF01_PATTERNS`, `iso-date` pattern `\b20\d\d-\d\d-\d\d\b`). Instance:
   `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:429`, doc comment
   "matches the `requestedSchema` shape from the MCP 2025-11-25
   `ElicitRequestFormParams` schema" on a `JsonSchema`-derived struct — the
   date is the MCP protocol spec's own version identifier
   (`modelcontextprotocol.io/specification/2025-11-25/...`), not an internal
   process/plan date, yet it is indistinguishable to the regex from one. At
   fault: rule text — `surfaces.md`'s Token Set table has a blank "Must not
   match" cell for `ISO dates` (every other family has a documented
   exception or false-positive rate), so an adopter has no signal this is a
   known, accepted case that needs `--allow` rather than a rewording. The
   `--allow FILE` mechanism already covers it operationally; only the
   documentation gap is new. Fix: add a "Must not match" entry for ISO
   dates: a date that is itself part of a cited external spec's own version
   scheme, resolved via `--allow`.

2. **(KNOWN, r1 class 1, unchanged) LNK-13 short-label regex still collides
   with ordinary technical vocabulary at high volume on a large real repo.**
   Check: `linkage_check.py ids`. Instance: `codex-rs/tui/src/clipboard_copy.
   rs:11`, `short label X11 is not defined` — `X11` is the X Window System,
   never a plan/process ID. 24/24 (100%) of codex's `ids` findings and 1/1
   of llm's are this class (`D65`, `C0`, `L49`/`L57`/`L90`/`L99` GitHub URL
   line anchors, `Q1`/`A1`/`Q2` test fixture labels). Advisory-only (SHOULD,
   exit 0 unaffected) by design — consistent with the task's stated known
   gap. No new evidence the fix proposed in r1 (allow-list or same-label
   cross-file threshold) has been applied, but severity keeps it from
   blocking.

3. **(KNOWN, r1 class 3, unchanged) Library-kind classification is still
   manual-only with no heuristic assist.** Check: `comment_census.py`
   (`--report`/`--over-cap`, cap selection). Instance: `llm`'s own
   `pyproject.toml` description says "CLI utility and **Python library**"
   (plugin authors `import llm`), yet no `.code-docs.json` declares it
   library-kind, so 7 of `llm`'s 41 over-cap findings (`models.py:1794`
   13 lines, `:1829` 11, `:2121` 13, `:2772` 11, `:2790` 13; `parts.py:1`
   12; `utils.py:723` 13) are false "over cap" results purely because they
   sit between the 10-line app cap and the 15-line library cap that should
   apply. At fault: rule text (`length.md`'s adopting walkthrough never
   prompts "does `pyproject.toml`/`package.json` describe this as a
   library?"). Fix unchanged from r1: check publish-signal files before the
   first baseline and suggest `.code-docs.json`.

No crashes, no wrong exit codes, and no confusing messages were found in
either repo. `--help-walk` handling of a click `DefaultGroup`'s `name*`
display convention worked without any special-casing needed — not a defect,
noted only because it was the one place a non-clap/commander CLI could
plausibly have broken the walker and did not.

## Precision per check (round 3)

| Check | TP | FP | Precision | Notes |
|---|---|---|---|---|
| comment_census --over-cap (codex, sampled 14/111 CLI-scope) | 14 | 0 | 1.00 | |
| comment_census --over-cap (llm, sampled 6/41) | 6 | 0 | 1.00 | 7/41 are cap-tier misclassifications (class 3, known), not scanner FPs |
| linkage_check ids (codex, 24) | 0* | 24 | 0.00* | *all class 2 (known, advisory-by-design) — not counted as a defect |
| linkage_check ids (llm, 1) | 0* | 1 | 0.00* | same, known class |
| linkage_check ids --discover (codex 2, llm 1) | n/a | n/a | n/a | correctly surfaced non-ID candidates for a verdict, as designed |
| linkage_check pointers (both) | — | — | n/a | 0 findings, true negative both repos |
| interface_leak --source (codex, 14) | 14 | 0 | 1.00 | includes 1 genuine source-path leak and 11 intra-doc leaks in upstream schemars types — real, actionable findings |
| interface_leak --source (llm, 0) | — | — | n/a | true negative, confirmed by manual AST + grep read |
| interface_leak output gate, --help-walk (llm, 0/62 screens) | — | — | n/a | true negative, confirmed by manually reading all 62 screens |
| interface_leak output gate, action.yml (setup-ocx regression) | 0 | 0 | 1.00 (was 0.00 pre-fix) | class fixed; verified with injected true-positive leak |
