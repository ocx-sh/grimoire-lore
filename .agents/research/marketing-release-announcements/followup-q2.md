---
title: Can MKT-REL-02 (c) and MKT-REL-08 be automated against the ocx interface-contract ledger
program: product
topic: marketing-release-announcements
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 3
---

# Follow-up q2: automating MKT-REL-02 (c) and MKT-REL-08 against the ocx contract ledger

Repair pass of the first version. Three things in the first version were wrong and are corrected below, each by re-measuring: (1) the ledger is not empty at release tags, (2) the deprecation windows are 14, not 3, (3) the real compat gate was never run, now it is.

`sources_fetched: 3` = two web pages and one network clone: the issue [ocx-sh/ocx#765](https://github.com/ocx-sh/ocx/issues/765) (fetched 2026-11-27; closed 2026-11-24 by commit [`e36c5a1c`](https://github.com/ocx-sh/ocx/commit/e36c5a1c)), the raw [`AGENTS.md` at v0.6.8](https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/AGENTS.md) (fetched 2026-11-27), and a `--depth 1 --recurse-submodules` clone of `https://github.com/ocx-sh/ocx.git` at tag `v0.6.8` (`720f08a6`) into a throwaway directory. Everything else is the local checkout `/home/mherwig/dev/ocx-sh/ocx` at `02b8434e` (2026-11-26), read with `git show`. Nothing in that checkout was changed. Scratch files: `~/.cache/research-lang/exemplars/product/wave2/mkt-rel-q2/` (`repair/` holds every script named below, `gate/` holds the clone and `gate_v068.log`).

Shell note: all loops below ran in `bash`. In `zsh`, `"$t:crates/..."` is parsed as a history modifier and silently reads the wrong blob. The first version's "0 `[[break]]` tables at v0.6.6, v0.6.7, v0.6.8" came from that mistake.

## Answer

**Yes, in the direction contract to marker, and the machinery exists, ran, and is checkable.** Three results carry it:

1. The ledger is diffable per tag. `ledger.toml` at `v0.6.7` holds 15 tables (8 non-`doc`), at `v0.6.8` 16 (8 non-`doc`); `baseline/RELEASE` at both tags reads `v0.6.6`, so the ledger lists every break since that release. Rotation (`chore(contract): rotate the baseline to v0.6.8`, [`8a265e26`](https://github.com/ocx-sh/ocx/commit/8a265e26), 2026-11-18) comes three days after the `v0.6.8` tag (`720f08a6`, 2026-11-15), and empties the ledger for the next cycle.
2. All 8 non-`doc` entries at `v0.6.7` and `v0.6.8`, and all 3 at HEAD, are introduced by a commit whose subject has `!`. The check script is below, with output.
3. The real differ, `crates/ocx_sdkgen/tests/compat_gate.rs`, ran: 25 passed at `v0.6.8`. With one flag deleted from the golden `cli.json` it went red with the exact ledger entry to add. With that entry added it went green. So an agent runs the existing gate; it does not write a differ.

The other direction is not automatable: 7 of 15 `!` commits in two ranges touch no contract file (Evidence 3).

Deprecation (MKT-REL-08): the contract publishes **14** open windows, all removed in 0.7 or 0.7.0: 3 in the top-level `retired` list (env variables) and 11 as a `deprecated` object on commands and flags. The `v0.6.6`, `v0.6.7` and `v0.6.8` `CHANGELOG.md` files contain 0 `### Deprecated` headings, so 0 of 14 are announced in the notes, while the shipped binary warns for each one tried (Evidence 5).

## Evidence

### 1. Ledger per tag, and the baseline it diffs against

Command (bash, run in the ocx checkout), output 2026-11-27:

```
for r in v0.6.6 v0.6.7 v0.6.8; do L=$(git show "${r}:crates/ocx_schema/contract/ledger.toml" 2>/dev/null); \
 echo "$r $(git rev-parse --short "$r^{commit}") baseline=$(git show "${r}:crates/ocx_schema/contract/baseline/RELEASE" 2>&1 | head -1 | cut -c1-30) breaks=$(echo "$L" | grep -c '^\[\[break\]\]') nondoc=$(echo "$L" | grep '^rule = ' | grep -vc '"doc"')"; done
v0.6.6 a536e92f baseline=fatal: path 'crates/ocx_schema/contract/baseline/RELEASE' ex breaks=0 nondoc=0
v0.6.7 c21f238b baseline=v0.6.6 breaks=15 nondoc=8
v0.6.8 720f08a6 baseline=v0.6.6 breaks=16 nondoc=8
```

At HEAD, `cat crates/ocx_schema/contract/baseline/RELEASE` prints `v0.6.8` and the ledger holds 36 tables: `grep -E '^rule = ' ledger.toml | sort | uniq -c` gives 33 `doc`, 1 `semantic`, 1 `B02`, 1 `G14`. The contract first exists in `v0.6.6`: `git ls-tree -r --name-only v0.6.0 -- crates/ocx_schema/contract | wc -l` prints 0, the same for `v0.6.6` prints 72 (introducing commit [`6daf9a16`](https://github.com/ocx-sh/ocx/commit/6daf9a16), 2026-10-08). So the first diffable cycle is `v0.6.6` to `v0.6.7`.

### 2. A cli.json diff between tags (own script) finds the surface changes

`contract_diff.py` walks `cli.json` (`root.commands[].args[]` keyed by long or short name, command `version`, `env[]`). Commands and raw output, 2026-11-27:

```
$ python3 -I contract_diff.py v0.6.6/cli.json v0.6.7/cli.json
ADDED   arg ocx package prune forge
CHANGED cmd ocx package push 1 -> 2
CHANGED cmd ocx package sbom 1 -> 2
CHANGED cmd ocx package verify 1 -> 2
$ python3 -I contract_diff.py v0.6.7/cli.json v0.6.8/cli.json
(no output; 0 lines)
$ python3 -I contract_diff.py v0.6.8/cli.json HEAD_cli.json | cut -d' ' -f1,2 | sort | uniq -c
     20 ADDED arg
      4 ADDED cmd
     23 ADDED env
     10 CHANGED (1 cmd, 9 env)
```

The 10 CHANGED lines at HEAD, abbreviated: `CHANGED cmd ocx self setup 1 -> 2`; `CHANGED env OCX_CONFIG ('path', ...) -> ('path_list', ...)`; and 8 env variables whose tuple differs only in the 4th element, `accepts_reference` `False -> True`: `OCX_ANNOUNCE_GIT_TOKEN`, `OCX_ANNOUNCE_GIT_USERNAME`, `OCX_ANNOUNCE_TOKEN`, `OCX_AUTH_{REGISTRY}_TOKEN`, `OCX_AUTH_{REGISTRY}_USER`, `OCX_IDENTITY_TOKEN`, `OCX_KEY_PASSWORD`, `OCX_SIGNING_KEY`. The 4 added commands are `export`, `import`, `package export`, `package import`. (The first version said 7 variables; the list was 8.) `v0.6.7` to `v0.6.8` shows no `cli.json` change, but `git diff --stat v0.6.7 v0.6.8 -- crates/ocx_schema/tests/golden` shows `reports.json | 45 +++++---` (1 file changed), so a `cli.json`-only diff misses report changes. The repo's gate reads all three documents.

Raw JSON-pointer diffs of `errors.json` are unusable: inserting 42 enum values shifts every later index (`v0.6.8` to HEAD printed `removed 0 added 42 changed 1370`, `pdiff.py`). `compat.rs` matches by identity and is the correct tool (Evidence 6).

### 3. Which `!` commits leave a contract trace

Script `repair/bang_trace.sh` (bash), run `bash bang_trace.sh v0.6.6..v0.6.7 v0.6.7..v0.6.8 v0.6.8..HEAD` in the ocx checkout, 2026-11-27. `n` = files touched under `crates/ocx_schema/tests/golden` or `crates/ocx_schema/contract` by that commit (`git show --name-only --format= <c> -- <both paths> | wc -l`):

```
=== v0.6.6..v0.6.7   non-merge commits: 49
-- bang commits
aeca7182 n=0 fix(config)!: the system config on Windows is %ProgramFiles%\ocx\config.toml
79f53b5a n=2 fix(cli)!: package sbom fails when every candidate is refused
f2f9829a n=2 fix(cli)!: the push report no longer lists a failed attestation status
0c7c3ffc n=0 ci(release)!: Windows release archives are named for the gnullvm target they contain
6dbde183 n=4 fix(cli)!: a failed package push --sign or --sbom writes no tag and returns the error docu...
214b9539 n=0 feat(cli)!: package verify and sbom default to the host platform
cc773077 n=0 feat(install)!: --no-verify is refused when the system config locks signatures to required
7741b282 n=0 ci(release)!: releases, candidates and dev builds are dispatched from release.yml and sign...
2e375085 n=9 feat(trust)!: verify packages against publishers declared in the index
-- other commits with n>0
c9b5cc22 n=1 feat(cli): package prune accepts an index-named GitHub Enterprise host listed in trusted_h...
ecde383c n=1 fix(cli): package prune reports shared_version as the reason for a refused tag
d5205543 n=1 fix(cli): announce --tags-from-registry indexes version tags only
=== v0.6.7..v0.6.8   non-merge commits: 2
-- bang commits: (none)
-- other commits with n>0
4af88d17 n=2 fix(cascade): cascade repair points every alias a build owns at the build tag's own index
=== v0.6.8..HEAD   non-merge commits: 45
-- bang commits
aed283dc n=0 fix(auth)!: OCX_AUTH_<REGISTRY>_USER without a token is a configuration error and no crede...
521becc7 n=3 feat(env)!: secret variables accept file://, env:// and plain:// references
1affd092 n=3 feat(telemetry)!: opt-in usage export to an OpenTelemetry collector
1a22c8e1 n=0 fix(config)!: config parse errors no longer quote the source line
f905733b n=7 feat(config)!: OCX_CONFIG takes a list of config files, and shell state reports config_pat...
94205e89 n=3 fix!: ocx keeps the symlink, mode and owner of a user file it rewrites; self setup skips a...
-- other commits with n>0
02b8434e n=3 feat(export): export writes one archive file with --archive, and import reads it
e36c5a1c n=1 chore(contract): record how a change in meaning of an OCX_* variable is published
ad1000ea n=4 feat(package): export and import packages as directories, with blob directories and an opt...
8a265e26 n=5 chore(contract): rotate the baseline to v0.6.8
5dfa339a n=9 docs: task-first getting started, a terminal frame for every command, a linked glossary and...
```

Totals: 15 `!` commits; 8 touched a contract file (`79f53b5a`, `f2f9829a`, `6dbde183`, `2e375085` and `521becc7`, `1affd092`, `f905733b`, `94205e89`); **7 touched none** (`aeca7182`, `0c7c3ffc`, `214b9539`, `cc773077`, `7741b282`, `aed283dc`, `1a22c8e1`). Non-`!` commits touching a contract file: 9 (the first version said 6 and omitted `4af88d17`, `e36c5a1c`, `8a265e26`). Of those, `8a265e26` is the rotation and `e36c5a1c` a ledger comment; `4af88d17` and `5dfa339a` add `doc` ledger entries (descriptions reworded, `4af88d17` also edits `reports.json`); the other five add flags, commands or report fields. `git show --name-status` on each shows only `M` lines for goldens, so none is a removal.

The 7 untraced commits are the gnullvm class: archive names, OS paths, exit conditions, config-lock semantics, release dispatch. The contract covers CLI grammar, report roots, the error document and the env manifest and nothing else. `214b9539` touched no golden in its own commit although the `verify` and `sbom` command versions were bumped by `v0.6.7` (Evidence 2), so the per-commit mapping is exact for ledger entries, not for version bumps.

### 4. MKT-REL-02 (c): every non-doc ledger entry comes from a `!` commit

Script `repair/ledger_check.sh` (bash; run at the repo root; arguments `REV [nondoc|doc]`). It reads `ledger.toml` at `REV`, takes `BASE` from `baseline/RELEASE` at `REV`, and for each table of the selected kind (awk keeps `rule` and `pointer` per `[[break]]` table, so `doc` entries are excluded in `nondoc` mode) finds the first commit in `BASE..REV` that introduced the pointer (`git log --format=%h BASE..REV -S"$pointer" -- crates/ocx_schema/contract/ledger.toml | tail -1`) and prints `ok` when its subject matches `^[a-z]+(\([^)]*\))?!:`, `NO-BANG` otherwise. Output 2026-11-27:

```
$ ledger_check.sh v0.6.7 nondoc        (BASE=v0.6.6)
ok      semantic 2e375085 /root/commands/14/commands/17/args/1
ok      semantic 6dbde183 /root/commands/14/commands/22/args/0
ok      semantic 6dbde183 /root/commands/14/commands/17/args/0
ok      semantic 6dbde183 /root/commands/14/commands/15/args/10
ok      B05 6dbde183 /$defs/AttestationStatus/x-ocx-enum/1
ok      B02 f2f9829a /$defs/AttestationOutcome/properties/kind
ok      B02 f2f9829a /$defs/AttestationOutcome/properties/message
ok      semantic 79f53b5a /root/commands/14/commands/17/args/2
$ ledger_check.sh v0.6.8 nondoc        (BASE=v0.6.6)   -> the same 8 lines, all ok
$ ledger_check.sh HEAD nondoc          (BASE=v0.6.8)
ok      semantic 94205e89 /root/commands/21/commands/1/args/7
ok      B02 f905733b /$defs/PolicyReport/properties/config_path
ok      G14 f905733b /env/5
$ ledger_check.sh HEAD doc | cut -d' ' -f1,2 | sort | uniq -c
     31 NO-BANG doc
      2 ok
```

So the check as first written, which looped over every pointer, would print 31 lines for the `doc` entries (not 33: 2 of them sit in the `!` commit `f905733b`). The awk restriction removes them: `nondoc` mode prints only `ok` lines, and a defect shows as `NO-BANG`. The `doc` entries record reworded descriptions with an unchanged meaning (their `reason` fields say so), so a missing `!` there is correct. Limits: a pointer string that also occurred in an earlier cycle may resolve to the wrong commit (the `BASE..REV` bound limits this to the current cycle); the check proves ledger to `!`, never `!` to ledger.

The ledger `reason` is migration prose, for example the HEAD entry for `/env/5`: "OCX_CONFIG is now a path list (platform path-list separator) instead of one path; a value holding the separator is split into several files" (read from `ledger.toml`).

### 5. MKT-REL-08 and MKT-REL-07/09: 14 windows, warned at runtime, absent from the notes

The contract carries two window records, both removal 0.7: the top-level `retired` list and a `deprecated` object on commands and args (`crates/ocx_schema/src/cli.rs`, `RetiredSpec` and `Deprecation`; [`cli.rs` at v0.6.8](https://github.com/ocx-sh/ocx/blob/v0.6.8/crates/ocx_schema/src/cli.rs)). `retired` entries have the fields `name`, `replacement`, `change`, `status`, `removal`; the first version's script used `name`, which exists (printed by `json.dumps(d['retired'])`), but ignored the 11 `deprecated` objects. All three tags carry the same set: `v0.6.6`, `v0.6.7`, `v0.6.8` print `[('OCX_NO_COMPLETIONS','window','0.7.0'), ('OCX_LOG','window','0.7.0'), ('OCX_GLOBAL','window','0.7.0')]` for `retired`, and each `CHANGELOG.md` has 0 lines matching `^### Deprecated` (`grep -c`). The introducing commit [`6daf9a16`](https://github.com/ocx-sh/ocx/commit/6daf9a16) says in its body: "Deprecated in 0.6, removed in 0.7: OCX_LOG (now OCX_LOG_LEVEL), OCX_NO_COMPLETIONS (now OCX_NO_COMPLETION), the -c/-l shorts of --cascade and --compression-level, index catalog --tags, package copy --description, and --out on package announce and package claim."

Script `repair/rel08.py` collects the 3 `retired` windows plus every `deprecated` object on a command or arg, and reports a window as "not announced" unless the notes' `### Deprecated` section (text between that heading and the next heading of level 1 to 3) contains the old spelling, the replacement and the removal version. Run 2026-11-27 against the `v0.6.8` golden and the `v0.6.8` `CHANGELOG.md` (`git show "v0.6.8:..."` into `cli_v0.6.8.json` and `CHANGELOG_v0.6.8.md`):

```
$ python3 -I rel08.py cli_v0.6.8.json CHANGELOG_v0.6.8.md
windows checked: 14                       (stderr)
not announced: OCX_NO_COMPLETIONS -> OCX_NO_COMPLETION removal 0.7.0
not announced: OCX_LOG -> OCX_LOG_LEVEL removal 0.7.0
not announced: OCX_GLOBAL -> --global removal 0.7.0
not announced: config push -c -> config push --cascade removal 0.7
not announced: index catalog --tags -> index catalog --with-tags removal 0.7
not announced: package announce --out -> package announce --output removal 0.7
not announced: package claim --out -> package claim --output removal 0.7
not announced: package copy -c -> package copy --cascade removal 0.7
not announced: package copy --description -> package copy --with-description removal 0.7
not announced: package create -l -> package create --compression-level removal 0.7
not announced: package describe -> package description push removal 0.7
not announced: package info -> package description pull removal 0.7
not announced: package push -c -> package push --cascade removal 0.7
not announced: run -> exec removal 0.7
```

Controls: (A) a notes file made from those 14 lines under `### Deprecated` prints nothing; (B) the same file with the `package info` line removed prints exactly `not announced: package info -> package description pull removal 0.7`; (C) the same text under `### Changed` prints 14 lines. Control A is built from the script's own output, so it tests the matching, not the golden. The earlier `grep -nE ... OCX_GLOBAL` hit at `CHANGELOG.md:115` ("A tool run under `ocx --global exec` no longer inherits `OCX_GLOBAL`") is an unrelated fix and would have hidden `OCX_GLOBAL` from a whole-file name search, which is why the script checks the Deprecated section only. The only other `CHANGELOG.md` hits for the old command spellings are `ocx run --env` lines (660-661, 690), which are earlier unrelated changes, not deprecation notices.

Runtime warning (MKT-REL-09): the installed `ocx` is 0.6.8 (`ocx version` prints `0.6.8`). Commands run 2026-11-27 with `HOME` and `OCX_HOME` pointing at a temporary directory inside the scratch area, `--offline`, no credentials, no network; the directory was deleted afterwards. Deprecated form versus replacement form:

```
$ ocx --offline index catalog --tags
exit=0 stdout=[Repository  Tag] stderr=[warning: `ocx index catalog --tags` is renamed to `ocx index catalog --with-tags` and is removed in 0.7]
$ ocx --offline index catalog --with-tags
exit=0 stdout=[Repository  Tag] stderr=[]
$ ocx --offline package info example.invalid/x:1
exit=81 stdout=[] stderr=[warning: `ocx package info` is renamed to `ocx package description pull` and is removed in 0.7 | error: network operation attempted in offline mode]
$ ocx --offline package description pull example.invalid/x:1
exit=81 stdout=[] stderr=[error: network operation attempted in offline mode]
$ ocx --offline run example.invalid/x:1 -- true
exit=64 stdout=[] stderr=[warning: `ocx run` is renamed to `ocx exec` and is removed in 0.7 | error: no ocx.toml found ...]
$ ocx --offline exec example.invalid/x:1 -- true
exit=64 stdout=[] stderr=[error: no ocx.toml found ...]
$ env OCX_LOG=info ocx --offline index catalog
exit=0 stdout=[Repository] stderr=[warning: OCX_LOG is renamed to OCX_LOG_LEVEL; the old name is removed in 0.7.0]
$ env OCX_NO_COMPLETIONS=1 ocx --offline index catalog
exit=0 stdout=[Repository] stderr=[warning: OCX_NO_COMPLETIONS is renamed to OCX_NO_COMPLETION; the old name is removed in 0.7.0]
$ env OCX_GLOBAL=1 ocx --offline index catalog
exit=0 stdout=[Repository] stderr=[warning: OCX_GLOBAL is no longer read; pass --global instead (the variable is removed in 0.7.0)]
$ env OCX_LOG_LEVEL=info ocx --offline index catalog        exit=0, stderr=[] (replacement name, no warning)
```

Each deprecated form prints one stderr line naming the replacement and the removal version; stdout and exit code match the replacement form in the same state. 6 of 14 windows were exercised (3 env variables, 1 flag, 2 commands); the rest were not run. `ocx version` with a deprecated variable set printed no warning (`OCX_LOG=info ocx version` gave empty stderr), so the warning fires when the variable is consulted by a running command, not on every invocation.

[`AGENTS.md:21` at v0.6.8](https://raw.githubusercontent.com/ocx-sh/ocx/v0.6.8/AGENTS.md) (fetched 2026-11-27) states: "**Even interfaces break pre-1.0.** A break is announced in the changelog and nowhere else — no migration prose in user docs, no dual-form parsing, no warning schedule." The shipped binary has both dual-form parsing and a warning schedule for these 14 windows. The ADR (`.claude/artifacts/adr_ocx_interface_contract.md` [at v0.6.8](https://github.com/ocx-sh/ocx/blob/v0.6.8/.claude/artifacts/adr_ocx_interface_contract.md), file last changed `e36c5a1c`, 2026-11-24, line 340) says: "within a rename window the old name warns once (name only) and is honoured; after the removal release it exits 78 naming the replacement; never silently ignored." The conflict between the line and the implementation is an owner question (below).

Wave-1 rows being corrected (read from [`marketing-release-announcements.md`](../marketing-release-announcements.md), Applied table, lines 90-92): MKT-REL-07 "No fleet repository has deprecated its own surface."; MKT-REL-09 "No CLI warning for a deprecated ocx or grim flag exists, because nothing has been deprecated."; MKT-REL-08 "0 of 26 removals deprecated first ... ocx has not called its surface stable, so its removals are not MKT-REL-08 violations". The first two are false as written, by the measurements above (ocx deprecated 14 spellings, 6 exercised). The third survives for grimoire; for ocx the 14 windows are deprecation-first.

### 6. The gate itself ran

The first version's clone failed because `--depth 1` omits submodules. The throwaway clone this time used `git clone --depth 1 --branch v0.6.8 --recurse-submodules --shallow-submodules https://github.com/ocx-sh/ocx.git` into `gate/ocx` (3 submodules checked out), `CARGO_TARGET_DIR=gate/target`, toolchain 1.95.0 (`rust-toolchain.toml`). Command and result, 2026-11-27 (`gate_v068.log`):

```
$ cargo test -p ocx_sdkgen --test compat_gate
running 25 tests
test the_live_goldens_hold_against_the_baseline_and_the_ledger ... ok
test a_break_without_an_entry_is_unacknowledged ... ok
test the_grammar_gates_env_narrowing_and_renames_without_a_window ... ok
... (22 more)
test result: ok. 25 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.88s
```

Mutation 1: with Python I deleted the `--sign` flag object from `package push` in the clone's `tests/golden/cli.json` and ran `cargo test -p ocx_sdkgen --test compat_gate the_live_goldens_hold`:

```
test the_live_goldens_hold_against_the_baseline_and_the_ledger ... FAILED
the goldens break the last release; make each edit below:
cli: long flag removed at /root/commands/14/commands/15/args/10 (G02); acknowledge it by adding to ledger.toml:
[[break]]
document = "cli"
subjects = ["package push"]
rule = "G02"
pointer = "/root/commands/14/commands/15/args/10"
reason = "<why the break is accepted>"
```

Mutation 2: appending exactly that table (with a throwaway `reason`) to the clone's `ledger.toml` turned the same test `ok` (1 passed). So a removed flag cannot pass the gate without a ledger entry, and the entry has a human `reason`. Mutation 3 (not a finding): removing the `OCX_LOG` entry from `retired` in the golden left the test green at this baseline, so the G13 "variable absent and no window" path was not shown firing by this edit; rule G13 stays documented-by-source, not demonstrated. All clone edits were reverted (`git status --short | wc -l` printed 0).

## Effect on the ruleset

**MKT-REL-02 (c): change.** Replace clause (c) with:

> (c) Where the repository publishes a machine-readable contract and a compat gate (ocx: `crates/ocx_schema/contract/` with `baseline/` and `ledger.toml`), the gate is green, and every non-`doc` `[[break]]` entry in `ledger.toml` is introduced by a commit whose subject carries `!`; the commit's `BREAKING CHANGE:` footer restates that entry's `reason`. A `!` commit with no contract diff is not a defect: the contract does not cover archive names, OS paths, exit conditions or config semantics, so clauses (a) and (b) alone apply to it. In a repository with no contract, a diff that removes a public CLI flag carries a breaking marker, read by hand.

Severity MUST, scoped to the fleet repository that has the contract (ocx), SHOULD elsewhere. Verification (run in the repo root after `git submodule update --init`): `cargo test -p ocx_sdkgen --test compat_gate` exits 0 (measured: 25 passed at `v0.6.8`; red with a pasted ledger entry when a flag is deleted, Evidence 6), and `repair/ledger_check.sh HEAD nondoc` prints no line starting `NO-BANG` (measured: 8 `ok` at `v0.6.7` and `v0.6.8`, 3 `ok` at HEAD, Evidence 4). The footer half is covered by (a), which compares per commit.

**MKT-REL-02 (a), (b): confirm.** 7 of 15 `!` commits touch no contract file, so the per-commit footer check cannot be replaced by a contract diff. Over-marking such as the `CHANGELOG.md:231` crate split is not detectable by the ledger and stays a reading heuristic (b).

**MKT-REL-03 / MKT-REL-12: confirm, one rationale addition.** The ADR's "Machine-facing break records" note (line 404) says: "The ledger is not release notes and adds no migration prose to user docs." Users "learn about it from the changelog, through the commit subject, and nowhere else." Add this as the reason the footer route is needed.

**MKT-REL-08: change.** Append:

> For a surface a repository's contract marks Public, the compat gate forbids removal outside a window; the rule's remaining work is announcement. Every open window the contract publishes (ocx: `retired[]` with `status = "window"`, and each `deprecated` object on a command or arg in `cli.json`) is named, with its replacement and removal version, under `### Deprecated` in the notes of the release that first ships it.

Verification, on the release candidate with `notes.md` rendered: `python3 -I rel08.py crates/ocx_schema/tests/golden/cli.json notes.md` prints nothing (exit 0). At `v0.6.8` it prints 14 `not announced:` lines, shown in Evidence 5, and controls A, B, C show it passes when all 14 are listed, names the one missing, and rejects the wrong heading. A window already announced in an earlier release's notes is checked against that release's notes, from the tag whose golden first carries it (`git log -S` on the golden).

**MKT-REL-07: change (evidence in the Applied row, and the rule gains a verification).** Applied row replacement: "ocx deprecated 14 spellings in 0.6 (3 env variables, 11 commands and flags), removal 0.7 or 0.7.0, recorded in `cli.json`; the `v0.6.6` to `v0.6.8` notes contain 0 `### Deprecated` headings, so the trailer rule is violated for ocx." Verification for the rule: the MKT-REL-08 command above, plus the existing awk and grep from the rule text on the `### Deprecated` section.

**MKT-REL-09: confirm, Applied row change.** The rule stands. Applied row replacement: "ocx implements it for 6 of 14 windows exercised (2026-11-27, 0.6.8): one stderr line naming the replacement and the removal version; stdout and exit code match the replacement form" with the commands of Evidence 5. Verification for a repository with a binary: run the deprecated form and the replacement form with a throwaway home; `diff` the two stdout files and compare exit codes (both equal), and `grep -E 'removed in [0-9]'` on stderr of the deprecated run succeeds while the replacement run has empty stderr.

**NEW MKT-REL-19** (SHOULD; fleet-scoped to repositories with a contract baseline). Text:

> At the release whose version is at or above a window's removal version, that window is not still open: the entry is `status = "removed"` (or gone) in the new golden, and the notes list the spelling under `### Removed` with its replacement. Treat any window due at the version being prepared as a blocker for the release preparer.

Rationale: all 14 windows fall due at 0.7.0 while the notes never announced them, so users meet the refusal (exit 78 per the ADR) without notice. Verification, run at release preparation with the version as argument:

```
python3 -I rel19.py crates/ocx_schema/tests/golden/cli.json 0.7.0
```

must print nothing in the golden prepared for 0.7.0. Measured against the `v0.6.8` golden (the golden before the 0.7.0 preparation), 2026-11-27: the version argument `0.6.8` prints 0 lines; `0.7.0` prints 14 lines (`window due: OCX_NO_COMPLETIONS -> OCX_NO_COMPLETION removal 0.7.0`, ..., `window due: run -> exec removal 0.7`). A control with every `retired` entry flipped to `"status": "removed"` prints none for the three env entries. The 0.7.0 golden itself cannot be tested because the tag does not exist, so the "must print nothing" half is shown only by that control, not on a real 0.7.0 tree.

## Dated facts

- Local ocx checkout `02b8434e`, 2026-11-26; tags `v0.6.6` (`a536e92f`), `v0.6.7` (`c21f238b`, 2026-11-15), `v0.6.8` (`720f08a6`, 2026-11-15); `baseline/RELEASE` at HEAD reads `v0.6.8`; rotation commit `8a265e26`, 2026-11-18 (read 2026-11-27).
- `6daf9a16`, 2026-10-08: first commit to ship the contract and the deprecation windows, first in `v0.6.6`.
- [ocx-sh/ocx#765](https://github.com/ocx-sh/ocx/issues/765): "Interface contract records a change in meaning of an OCX_* variable", opened 2026-11-23, closed as completed 2026-11-24 in `e36c5a1c` (fetched 2026-11-27). The ADR decision text, dated 2026-11-23, is in the ADR at line 343: a change in meaning of an `OCX_*` variable is "recorded in `cli.json` and in the commit subject, not in the ledger". The issue page itself shows the question as open in its body and the closing commit; the decision wording is read from the ADR.
- 15 `!` commits measured: `v0.6.6..v0.6.7` (9) and `v0.6.8..HEAD` (6); `v0.6.7..v0.6.8` has none.
- Compat gate run 2026-11-27 on `v0.6.8`: 25 passed in 0.88 s.

## What could not be determined

- Whether the 0.7.0 release golden will pass `rel19.py` silently. Missing: the 0.7.0 tag. Only the control above was run.
- Whether the gate rule G13 (a Public variable absent with no window) fires as described. Mutation 3 was green, so this is documented by source and ADR only. Missing: a mutation that removes a Public variable still present in the baseline.
- 8 of the 14 windows were not run through the binary (for example `package announce --out`, `package claim --out`, `-c`, `-l`, `package describe`, `package copy --description`). The wiring exists for all 14 in the same `deprecated` table, but only the 6 shown were observed.
- Whether any of the 7 untraced `!` commits is a genuine break by the Conventional Commits definition. Not judged here; classification of all `!` lines by two readers is still open question 4 of the consolidation.
- Owner decisions, unchanged: whether the `AGENTS.md:21` pre-1.0 sentence ("no dual-form parsing, no warning schedule") yields to the windows the contract already implements, and whether the ledger `reason` may feed the footer automatically.
