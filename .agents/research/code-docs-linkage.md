---
title: "code-docs linkage: code and records, both directions"
topic: linkage
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-linkage/pointer-form-and-check.md
  - .agents/research/code-docs-linkage/plan-ids.md
  - .agents/research/code-docs-linkage/record-to-code-rot.md
  - .agents/research/code-docs-linkage/plan-ids-fleet.md
  - .agents/research/code-docs-ratchet/gate-replays.md
date: 2026-09-27
revised: 2026-09-27
---

# code-docs linkage: code and records, both directions

Question: what pointer form resolves, what check proves it, which ID shapes are
banned, and how do records' citations of code survive refactors? Paths are
relative to the worktree `/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs`
unless they carry a `repo:` prefix, which means that fleet repo under
`/home/mherwig/dev/`. Everything here was researched or re-verified on 2026-09-27.
`gate-replays.md` is consolidated only for its LNK-06 findings (1-3). Its LEN-06
and GRD-06 findings belong to the ratchet and guards consolidations.

## Verdict

1. **Pointer form:** `[repo:]path/to/record.md[#anchor]`. The file must be tracked
   and the pointer must resolve (MUST). The anchor is the shortest unique heading
   prefix, usually the section ID (`#a2`), and is only a SHOULD. It is never a full
   generated slug and never a line number (conflict C1).
2. **Bare process IDs are banned** in every comment and doc comment, in prod and test
   scope (C4). The MUST ban covers the 10 prefixed families, `ADR-N` included
   (LNK-01). Sampled fleet-wide, 0 of 200 hits were false positives. The families
   also hit 0 lines in 33 human repos. Short labels such as `A2` and `H1` are an
   open shape with residual false positives, so they are a separate SHOULD (LNK-13,
   C11). The ratchet counts per file, not per package (C12). The default
   replacement is deletion, and the cleanup never invents a pointer.
   - **Documented gap: the fixed family list is not the repo's whole ID
     vocabulary.** Every repo mints its own families. The list misses about 948
     hits in creeptd-ng (`SIM-`, `SEAM-`, `SHARED-`, `LOBBY-` and 7 more), about 338
     in ocx-indexbot (`G-`, `BD-`, `FP-` and others) and about 700 in ocx itself
     (`E-`, `M-`, `W-`, `ML-` and others). A green LNK-01 does not mean a repo is
     free of IDs until the adopter has run LNK-14's discovery step (C14).
3. **No pointer and no ID in text that renders to users.** The leak is verified end
   to end, and file-qualified pointers leak like bare IDs do (C9).
4. **From records back to code:** a diff-time gate over ADRs and path-scoped rules is
   the one MUST (C7). It checks each citation, not whether the record changed at all
   (C13). Replayed over ocx's last 300 commits, it fired 3 times and all 3 fires
   were real. It never fired on a record whose subject is the old layout, because it
   reads only records that existed before the change. Repairs happen at the
   citation site (C2). Naming the symbol is a SHOULD (C3).
   - **Documented gap: fragment citations.** The gate protects only citations that
     resolve exactly. 305 of ocx's 1,106 record citations are path fragments, and
     those wait for the scheduled job (LNK-12).
5. **One check** (`linkage_check.py`), ported from the scratchpad prototypes. URL
   liveness runs on a schedule, not per commit (C10). Test-name IDs: SHOULD strip.
   That now rests on 3 repos, not 1: the pattern appears only in the repos built
   through hex plans. Changing how hex mints IDs is the owner's call (C5).

## The ruleset

### Conflicts resolved

- **C1. Anchor form.**
  - The conflict: pointer-form makes a full GitHub-slug anchor a MUST. census §4 and
    config §4 use file plus ID.
  - Decided: the anchor is a unique hyphen-boundary heading prefix, as a SHOULD.
    Resolution of the file is the MUST.
  - Why:
    - Three slugifiers disagree: `links_raw.py`, github-slugger and the prototype.
    - Headings carry dates and dead paths (`adr_index_indirection.md:221`, `adr_windows_exe_shim.md:524`).
    - 0 of 1,062 current pointers carry an anchor.
    - The 8 dead ocx pointers died from file renames, which an anchor does not
      prevent. docs-quality's DOC-NAV-07 reaches the same verdict: key the link to
      the stable part of the heading.
- **C2. How a record's stale citation is repaired.**
  - The conflict: record-to-code-rot says "append a `## Citation updates` note, never edit".
  - Decided: repair at the citation site.
  - Why:
    - The dive's own premise is that a citation is metadata, not decision substance,
      and that supports editing in place.
    - ocx ADRs have a median of 443 lines, so a trailing note sits far from the
      stale path.
    - Stale paths sit inside headings (grimoire `adr_client_compat_matrix.md:70`).
    - The fleet already puts dated addenda beside the section they amend (`adr_index_indirection.md:433`).
- **C3. Symbol-only citation.**
  - The conflict: record-to-code-rot makes "name a unique symbol" a MUST.
  - Decided: SHOULD.
  - Why:
    - The evidence is 3 symbols.
    - Its regex matches Rust only.
    - The LNK-06 gate stops path rot at the source, which removes most of the case for it.
- **C4. Test scope.**
  - The conflict: plan-ids bans IDs in test comments, but its ratchet gates prod only.
  - Decided: gate both scopes.
  - Why:
    - Hex requires IDs in test *names*, not in comments (`protocol.md:762`), so the
      gate does not fight the protocol.
    - 7 of 15 ocx guards live on a test's own doc comment (records.md §4).
- **C5. Plan IDs in test names.**
  - The conflict: plan-ids says MUST strip or slug-qualify.
  - Decided: SHOULD strip, which is one option instead of two.
  - Why:
    - 322 ocx names carry an ID (plan-ids-fleet §5, which also counts inline test
      modules; the earlier 272 used a narrower digit width). Fixing them is a
      harness change that waits for the owner's decision on hex.
    - The pattern appears in exactly the 3 hex-built repos (ocx, grimoire,
      ocx-mirror) and in none of the other 6, so a MUST would fail only those 3.
    - The archived plan already keeps the WP-to-test map.
- **C6. The ratchet counts the form plan-ids calls correct.**
  - The conflict: plan-ids cites `local_index.rs:1531` (`adr_index_indirection.md` A2)
    as correct, but its own `short2char` regex counts it.
  - Decided: the lowercase anchor `file.md#a2` is invisible to the case-sensitive
    family regexes, so pointer and ban compose with no exemption. The transitional
    `file.md A2` counts under LNK-13's `short-label` key (it counted under LNK-01
    before C11), and the cleanup converts it.
- **C7. What the record gate protects.**
  - The conflict: record-to-code-rot protected only `adr_*.md`.
  - Decided: protect ADRs and path-scoped rules, not plans, specs, reviews or research.
  - Why:
    - At `c6a97029`, the widest scope flagged 10 records. 8 of them are
      point-in-time working documents.
    - The same commit also stranded citations in two subsystem rules that agents
      load (`subsystem-ci.md:21`, `subsystem-cli-commands.md:63`).
- **C8. The pointer-only eval arm.**
  - The conflict: eval-arms-and-sites §2 allows `file:line`.
  - Decided: the arm uses LNK grammar only, so it tests the form the rule ships.
- **C9. The interface leak.**
  - The conflict: pointer-form said its 29 interface lines were not yet confirmed
    in any golden schema.
  - Decided: confirmed. `ocx_config/src/lib.rs:98` and `:124` reach
    `golden/config.json`, and 20 golden lines in 4 files name a record.
- **C10. URL liveness.**
  - The conflict: pointer-form makes it a MUST policy.
  - Decided: CONSIDER, as a scheduled job (LNK-12) that reuses docs-quality's lychee
    config. It is check infrastructure, not something an agent writes.
- **C11. Short-label severity.**
  - The conflict: plan-ids and LNK-01 as first written ban short labels (`A2`, `H1`)
    at MUST with the prefixed families. plan-ids-fleet says SHOULD.
  - Decided: SHOULD, as the new LNK-13. LNK-01 keeps the 10 prefixed families at MUST.
  - Why:
    - The prefixed families are a positive list with one literal prefix each. They
      scored 0 false positives in 200 fleet samples and 0 hits in 33 human repos.
    - Short labels are an open shape. RFC section shorthand (`RFC 9111 S4.3.4`) is
      104 of 551 short-label hits in the human corpus.
    - About 90 fleet lines in docs-tooling checks use `H1` to `H6` as their subject,
      and no exclusion exists for them yet.
    - The verified definition exemption works per line, not per block.
- **C12. Ratchet key unit.**
  - The conflict: plan-ids and this ruleset keyed the ratchet per package.
    plan-ids-fleet keys it per file.
  - Decided: per file (`FILE::key`), for every key.
  - Why:
    - One file, `crates/ocx_package_manager/src/tasks/render_toolchain.rs`, holds
      325 of its crate's 983 ID lines. That is a third of the crate and 8.9% of
      ocx's prod total. (plan-ids-fleet says 8.9% of the fleet's total, but the
      fleet total is 6,172, which makes it 5.3%.)
    - A package key lets a rise in that file net to zero against cleanup in a
      sibling file.
    - `lint_ratchet.py --by-file` already exists for exactly this reason. Its
      documented cost: moving a file reds the ratchet until
      `--update --allow-regression` is run, and that prompt is intended.
- **C13. What "updated the record" means for LNK-06.**
  - The conflict: LNK-06 said the branch "must update that record", and its command
    cleared a record if the file changed at all. gate-replays measures that as
    a false negative.
  - Decided: per citation. Every line that names the old path must drop it or also
    name the new path, and a record edited for another reason does not count.
  - Why:
    - At `b79abbe8d3` the whole-file test cleared `adr_toolchain_activation.md`,
      because it had a 3-line edit elsewhere. It still cites 21 dead `crates/ocx_lib/`
      paths on 29 lines at ocx HEAD `2691d3c`.
    - Over 300 commits, the whole-file test called 11 (commit, record) pairs
      "repaired", and 1 of them still cited the old path.
    - This revision re-ran the per-citation form over the same 300 commits. It fires
      on the same 3 commits. The only addition is that record, so it adds no new
      false fires.
- **C14. Whether the family list is complete.**
  - The conflict: LNK-01 called its list "a fleet default the adopter replaces", but
    gave no step for replacing it. plan-ids-fleet measured what the list misses.
  - Decided: add the discovery step as LNK-14 (SHOULD). The fleet default stays the
    10 sampled families. Unsampled ocx prefixes (`E-`, `M-`, `W-`, `ML-`) join a
    repo's list through discovery, not through the default.
  - Why:
    - The catch-all scan that finds `SIM-` also finds standards and rule IDs. In ocx
      that is `CWE-` 383, `UTF-` 155, `SHA-` 127 and `DOC-TYPE-01`. A prefix count
      alone is not a verdict, so a person gives one per prefix.

### Rules

Five MUST, eight SHOULD, one CONSIDER. Every command below runs as written from the
adopting repo's root. `linkage_check.py` is the check this program ships. Its
contract is `repo:scripts/lint_ratchet.py` from ocx in `--by-file` mode: a flat JSON
`{key: count}` baseline, `--check` fails on any increase per key, `--update` accepts
decreases freely and refuses increases unless `--allow-regression` is passed, and a
missing key counts as 0. Its keys are `FILE::bare-id-prod`, `FILE::bare-id-test`,
`FILE::short-label`, `FILE::dead-pointer`, `FILE::interface-pointer` and
`FILE::id-test-name` (C12). Spot checks list files with `git ls-files`, because `rg .`
skips hidden directories such as `.claude/` and descends into submodules.

**LNK-01. MUST. Portable. The family list is a fleet default the adopter replaces (LNK-14).**
- **Rule.** Write no bare plan or process ID from a banned family in a comment or doc
  comment. State the constraint in the present tense, or cite the record in LNK-02's
  form.
- **Families.**
  - The 10 prefixed families: `C-`, `S-`, `WP-`, `DEC-`, `DX-`, `RUL-`, `A-`, `D-`,
    `D-V` and `ADR-N`. Match `D-V` before `D-`.
  - Short labels (`A2`, `H1`) are LNK-13, not this rule (C11).
  - `SPDX-2.3`, `UTF-8`, `SHA-256`, `CWE-79`, `RFC 8259` and `#1234` are negative
    fixtures, not runtime exclusions.
- **Rationale.** It prevents a cold reader from chasing an ID that names several
  decisions:
  - 0 of 30 sampled `C-` IDs resolve to one document.
  - 14 of the top 15 ocx IDs name 3 to 5 unrelated decisions.
  - Humans write none: 0 of 200 blocks, and 0 hits for any prefixed family across
    33 human repos (about 2 million lines).
  - The families match nothing else: 20 hits per family across 8 fleet repos, and
    all 200 are real IDs.
- **Verification.** The gate is `python3 rules/code-docs/checks/linkage_check.py --root . --baseline .code-docs-linkage.json --check`.
  The spot check for today, which finds `//` comments only, is
  `git ls-files -z -- '*.rs' '*.ts' | xargs -r -0 rg -n -e '//.*\bC-[0-9]{1,4}\b' -e '//.*\bS-[0-9]{1,3}\b' -e '//.*\bWP-[0-9]{1,3}\b' -e '//.*\bRUL-[0-9]{1,3}\b' -e '//.*\bDEC-[A-Za-z0-9]{1,6}\b' -e '//.*\bDX-[0-9]{1,3}\b' -e '//.*\bA-[0-9]{1,3}\b' -e '//.*\bD-V?[0-9]{1,3}\b' -e '//.*\bADR-[0-9]{1,4}\b'`.
  It returned 5,092 lines on ocx. Docstrings need the gate, which reads comments
  through `comment_census.classify()`.

**LNK-02. MUST. Portable. The fleet map is fleet-only.**
- **Rule.** Every record pointer must resolve:
  - The file is in `git ls-files` of the repo the pointer names. That is the citing
    repo, unless the pointer carries a `repo:` qualifier.
  - An anchor, when present, is a hyphen-boundary prefix of exactly one heading slug,
    or of exactly one `**ID**` definition at the start of a line, in that file.
- **Rationale.** It prevents dead and ambiguous pointers:
  - ocx has 120 dead pointer mentions out of 992 hits.
  - `plan_toolchain_activation.md` is cited 27 times, but the file was renamed to
    `adr_toolchain_activation.md`.
  - About 24 of 30 "dead" mentions in the leaf repos are live in another fleet repo,
    and nothing in the pointer says which one.
- **Verification.** The gate is `linkage_check.py --check`, using the
  `dead-pointer` key. The spot check is
  `git ls-files -z -- '*.rs' '*.py' '*.ts' | xargs -r -0 rg -o -N --no-filename -e 'adr_[a-z0-9_]+\.md' -e 'plan_[a-z0-9_]+\.md' -e 'rulings_[a-z0-9_]+\.md' | sort -u | xargs -r -I{} sh -c 'git ls-files | grep -q -F -e "/{}" || echo "dead: {}"'`.
  Each line it prints is a finding. It prints 7 distinct names on grimoire, all in
  `.claude/`, where the earlier `rg .` form printed none.

**LNK-03. SHOULD. Fleet default; the adopter may override it.**
- **Rule.** Anchor a pointer into a record that holds more than one decision. Use
  the shortest unique heading prefix (`adr_index_indirection.md#a2`). Never use a
  full generated slug or a line number.
- **Rationale.** It prevents a pointer into a 443-line median ADR that names no
  section, and an anchor that breaks when a heading is reworded. Headings carry
  dates and code paths that change:
  - `repo:ocx:.claude/artifacts/adr_index_indirection.md:221` ends in "(owner decision 2026-07-18)".
  - `repo:ocx:.claude/artifacts/adr_windows_exe_shim.md:524` names a dead `crates/ocx_lib/` path.
  - `adr_index_indirection.md` has two headings that start `C2` (lines 391 and 433),
    which is why the check demands uniqueness.
- **Verification.** `linkage_check.py` resolves each anchor. The spot check that
  lists pointers without an anchor is
  `git ls-files -z -- '*.rs' '*.py' '*.ts' | xargs -r -0 rg -n -o -e 'adr_[a-z0-9_]+\.md[^#a-z0-9_]'`
  (616 lines on ocx).

**LNK-04. MUST. Portable.**
- **Rule.** Keep record pointers, record filenames and process IDs out of any doc
  text that renders to a user surface. That covers the census `interface` class:
  clap and schemars derives, click and typer commands, and pydantic models.
- **Rationale.** It prevents unresolvable internal references from shipping to users:
  - `repo:ocx:crates/ocx_config/src/lib.rs:98` (`adr_managed_config_tier.md`) and
    `:124` (`adr_index_indirection.md` F5b) both reach `crates/ocx_schema/tests/golden/config.json`.
  - 20 golden schema lines in 4 files name a record file.
  - The golden schemas also carry 64 distinct IDs in 182 occurrences.
- **Verification.** The source side is `linkage_check.py --check`, using the
  `interface-pointer` key. The output side must print nothing:
  `rg -n -e 'adr_[a-z0-9_]+\.md' -e 'plan_[a-z0-9_]+\.md' -e '\bC-[0-9]{1,4}\b' -e '\bRUL-[0-9]{1,3}\b' crates/ocx_schema/tests/golden`.
  An adopter points this at its own golden or captured-output directory.

**LNK-05. MUST. Portable.**
- **Rule.** When a cleanup removes a bare ID, delete it or restate the constraint.
  Add a record pointer only when the same comment block already names that file.
- **Rationale.** It prevents an agent from guessing which of a colliding ID's 3 to 5
  documents was meant. A wrong pointer that resolves passes LNK-02. Evidence that
  deleting is safe: 0 of 30 sampled sites needed a new pointer, and the split was
  22 deletions, 6 rewrites and 2 pointers to a file already named nearby.
- **Verification.** Two lists: the record names on added lines, from
  `git diff -U0 origin/main | rg -N -e '^\+' | rg -o -N -e 'adr_[a-z0-9_]+\.md' -e 'plan_[a-z0-9_]+\.md' | sort -u`,
  and the same command with `-e '^-'` for removed lines. Every name in the first
  list must appear in the second. The cleanup skill runs this on its own diff.

**LNK-06. MUST. Portable. The record globs are a fleet default.**
- **Rule.** A branch that deletes or renames a path must repair every citation of
  that path in the decision records and path-scoped rules that existed before the
  branch. By the end of the branch, each line that names the old path either no
  longer names it or also names its new path (LNK-08's subject case). Editing the
  record somewhere else does not count (C13).
- **Rationale.** It prevents structural refactors from silently rotting citations:
  - One crate split (`b79abbe8d3`) deleted or renamed 429 paths. 66 records cited
    them on 375 lines. The commit repaired 25 lines in 8 rules and left 350 lines in
    58 records stale. All 350 are still stale at ocx HEAD `2691d3c`.
  - The one record whose subject is the old layout, `adr_crate_split_workspace.md`,
    was added by that same commit, so a check that reads records from before the
    change never flags it.
  - Replayed over ocx's last 300 commits, the gate fired 3 times, and all 3 were
    real. The third (`e0cd8a33e`) is still unrepaired at HEAD.
  - The earlier whole-file test missed `adr_toolchain_activation.md`, which an
    unrelated edit had touched (gate-replays §2).
- **Verification.** The following must print nothing:
  `B=$(git merge-base origin/main HEAD); git diff -M --name-status "$B" HEAD | awk '$1 ~ /^[DR]/ {print $2}' | sort -u | xargs -r -I{} sh -c 'git grep -l -F -e "$2" "$0" -- ".claude/artifacts/adr_*.md" ".claude/rules/*.md" ".agents/adr/*.md" ".agents/adrs/*.md" | sed "s/^[^:]*://" | xargs -r git grep -n -F -e "$2" "$1" --' "$B" HEAD {}`.
  A printed line that also names the rename destination is LNK-08's subject case;
  `linkage_check.py` passes it, and a reader passes it by eye.
  - Replay a single commit by setting `B` to its parent and replacing both `HEAD`s
    with the commit.
  - At `b79abbe8d3` it prints 350 lines in 58 records, including
    `adr_toolchain_activation.md`. At `c6a97029` it prints 4 lines in 4 records:
    `adr_crate_split_workspace.md:577`, `adr_per_platform_lock_pinning.md:593`,
    `subsystem-ci.md:21` and `subsystem-cli-commands.md:63`. At `e0cd8a33e` it
    prints 6 lines in 2 records.

**LNK-07. SHOULD. Portable.**
- **Rule.** Write a cross-repo record pointer as `repo:path#anchor`, not as a URL. A
  record URL that has to stay is pinned to a commit, never to `blob/main`.
- **Rationale.** It prevents pointers to mutable refs. Unpinned external links were
  the fragile ones in the human sample (a gmane archive, a personal gist). Hata et al.
  found about 10% of 9.6 million comment links dead.
- **Verification.** Each line printed by
  `git ls-files -z -- '*.rs' '*.py' '*.ts' | xargs -r -0 rg -n -e 'github\.com/[^ )]*/blob/main/' -e 'github\.com/[^ )]*/blob/master/'`
  that targets a record file is a finding. The other lines are external specs,
  which this rule does not cover.

**LNK-08. SHOULD. Portable.**
- **Rule.** Repair a stale citation in a record at the citation site:
  - Where the citation says where the code lives now, replace the path in place.
  - Where the old path is the record's subject, add the new path beside it.
  - Never edit decision text in a citation-repair commit.
- **Rationale.** It prevents a correction that a cold reader never reaches:
  - A trailing `## Citation updates` section in a 443-line median ADR sits hundreds
    of lines from the stale path.
  - Stale paths sit inside headings: `repo:grimoire:.agents/adr/adr_client_compat_matrix.md:70`.
- **Verification.** This is a reading check. In
  `git diff --word-diff=plain origin/main...HEAD -- '.claude/artifacts/adr_*.md' '.agents/adr/*.md' '.agents/adrs/*.md'`,
  every `[-..-]{+..+}` pair must be a path or symbol token, and no new trailing
  heading may appear.

**LNK-09. SHOULD. Portable.**
- **Rule.** When a record cites code that has a symbol, cite the path plus a
  distinctive symbol: `crates/ocx_oci/src/package_ref.rs::segment_is_host`.
- **Rationale.** It prevents a citation from dying on a second file move. Evidence:
  - `segment_is_host` survived two moves.
  - Its path, with one rename traced, did not.
  - A generic name fails the other way: `Identifier` matches 705 files.
- **Verification.** Run `SYMBOL=segment_is_host; git ls-files -z | xargs -r -0 rg -n -e "fn $SYMBOL\b" -e "struct $SYMBOL\b" -e "enum $SYMBOL\b" -e "def $SYMBOL\b" -e "class $SYMBOL\b" -e "function $SYMBOL\b"`.
  It should print exactly one definition line. Zero lines means the symbol is
  gone. More than one means the record should qualify it with its module.

**LNK-10. SHOULD. Portable. A step in the repair skill.**
- **Rule.** Trace a missing cited path in three steps:
  1. Find the commit that deleted it.
  2. Read that commit's unfiltered rename map.
  3. Confirm the destination exists at HEAD.

  Never run `git log --follow` on the missing path.
- **Rationale.** It prevents a false "no rename" verdict. `--follow` on a path that no
  longer exists returns nothing with exit 0. Adding a pathspec to `git show` turns an
  `R085` rename into a plain `D` (re-run on `crates/ocx_lib/src/oci/client.rs`).
  Step 3 is not optional: 2 of the 138 rename destinations cited in stale crate-split
  lines have since moved again.
- **Verification.**
  `OLD=crates/ocx_lib/src/oci/client.rs; C=$(git log --diff-filter=D --pretty=%H -- "$OLD" | head -1); git show -M --name-status --format= "$C" | rg -F -e "$OLD"`
  prints `R085 ... crates/ocx_oci/src/client.rs`. Then run
  `git ls-files --error-unmatch crates/ocx_oci/src/client.rs` on the destination.

**LNK-11. SHOULD. Fleet-only; it depends on the hex protocol.**
- **Rule.** A test name that lands on the default branch carries no plan-ID prefix.
  Strip the `c050_s022_` prefix and keep the behaviour sentence.
- **Rationale.** It prevents a plan-scoped ID from outliving its plan. `C-050`
  already names 3 documents. The WP-to-test mapping lives in the archived plan.
  Hex only needs the ID during its Specify-to-Review window
  (`~/.claude/skills/hex-core/references/protocol.md:762`). The pattern is a
  signature of hex adoption: 322 in ocx, 52 in grimoire, 24 in ocx-mirror, and 0 in
  the other 6 fleet repos.
- **Verification.** The gate is `linkage_check.py --check` with the `id-test-name`
  key. The spot check is `git ls-files -z -- '*.rs' '*.py' | xargs -r -0 rg -n -e 'fn [cs][0-9]{2,4}_' -e 'def test_[cs][0-9]{2,4}_'`.
  The earlier `rg .` form found 2 in grimoire, because it skipped `.claude/tests/`.
  It found 305 in ocx-mirror, because it counted the `external/ocx` submodule.
  plan-ids' own command used `rg -r`, which in ripgrep means `--replace`, not recursive.

**LNK-12. CONSIDER. Fleet default.**
- **Rule.** Schedule a weekly job to cover what the gates cannot:
  - Citations in records that name only a file fragment, resolved by matching the
    last two path segments.
  - Cross-repo citations, resolved through the fleet map.
  - URL liveness.

  Report only entries that are new since the last baseline.
- **Rationale.** LNK-06 protects only citations that resolve exactly (305 of ocx's
  1,106 record citations are fragments). URL checks need the network, and a
  per-commit gate must not.
- **Verification.** Run `lychee --config rules/docs-quality/checks/lychee.toml --include-fragments .`
  and the ported `rot_scan.py` from cron, and diff each result against the last
  baseline.

**LNK-13. SHOULD. Portable. New in this revision (C11).**
- **Rule.** Do not cite a short label (`A2`, `H1`, `F5b`) outside the block that
  defines it. A label defined as `H1:` at the start of a comment line, after any
  banner leader such as `──`, and used in the same block is allowed.
- **Exclusions.** Each one is measured, and each runs after LNK-01's families:
  - A bare version token (`V2`) is excluded only after `D-V` has claimed its IDs.
    The other order discards 155 real `D-V` IDs to save 61 version numbers.
  - RFC section shorthand (`RFC 9111 S4.3.4`) is excluded. It is 104 of 551
    human-corpus hits, and no fleet line uses it.
  - A match inside a backtick span that holds a `[...]` character class is excluded.
    It affects 1 fleet line (`grimoire:src/oci/identifier.rs:435`).
  - Primitive type names (`U8`, `I32`) are **not** excluded. 10 of the 11 fleet hits
    are real IDs (`ocx:crates/ocx_script/src/guard.rs:174`, "U7/U8/U13/U14").
  - A letter-hyphen-letter-digit shape is **not** excluded either. It matches 489
    fleet hits, nearly all of them compound IDs such as `C-S1-1` and `D-T4`.
- **Rationale.** It prevents the `C-050` collision in a shorter form. `H1` has no
  local definition at `ocx:test/tests/test_project_env.py:988`,
  `ocx:crates/ocx_config/src/tls.rs:1034` or `ocx:crates/ocx_config/src/edit.rs:444`
  ("review H1:"). `hardlink.rs` and `equivalence.rs` each define their own unrelated
  `H1`, and `config.rs:1369` defines the one `test_project_env.py` probably means.
  It is SHOULD, not MUST, because the shape is open (C11).
- **Verification.** The gate is `linkage_check.py --check` with the `short-label`
  key. The verified patterns score 20 of 20 on true-positive fixtures and exempt 15
  of 15 addressed false positives. On a held-out sample of 50 fleet hits, all 50 are
  classified correctly. The spot check for the commonest reference shape, a label in
  parentheses, is
  `git ls-files -z -- '*.rs' '*.py' '*.ts' | xargs -r -0 rg -n -e '//.*\([A-Z][0-9]{1,2}[a-z]?\)' -e '#.*\([A-Z][0-9]{1,2}[a-z]?\)'`
  (424 lines on ocx).

**LNK-14. SHOULD. Portable. New in this revision (C14).**
- **Rule.** Before enabling LNK-01's gate in a repo, run `linkage_check.py --discover`.
  List every prefix outside the family list that has 5 or more prod comment hits,
  and give each one a verdict. Either add it to the repo's family list, or record it
  as a non-ID: a standard such as `CWE-`, `UTF-` or `SHA-`, or a lore rule ID.
- **Rationale.** It prevents a green LNK-01 from hiding most of a repo's own IDs:
  - creeptd-ng: about 948 hits the fixed list cannot see, including `SIM-` 452,
    `SEAM-` 112, `SHARED-` 104, `LOBBY-` 93 and `AI-` 91. The fixed list sees 846
    lines in that repo. `crates/creeptd-bot/src/archetypes/economist.rs:61`
    cites "spec:SIM-024, D-006", and the ban catches only `D-006`.
  - ocx-indexbot: about 338 more, including `G-` 147, `BD-` 85 and `FP-` 65.
  - ocx: about 700 more, including `E-` 132, `M-` 71 and `W-` 41.
  - It is SHOULD because `--discover` is not built yet and its 5-hit threshold is
    unvalidated.
- **Verification.** A fixture repo with `FOO-1` to `FOO-6` must flag `FOO` at the
  default threshold, and `FOO-1` to `FOO-4` must not. Until `--discover` exists, the
  spot check (whole files, so code lines are counted too) is
  `git ls-files -z -- '*.rs' '*.py' '*.ts' | xargs -r -0 rg -o -N --no-filename -e '\b[A-Z]{1,6}-[0-9]{1,4}\b' | sed 's/-[0-9]*$//' | sort | uniq -c | sort -rn`.
  Each prefix in its output that is outside the family list needs a verdict.

**Check design notes for the author** (`linkage_check.py`):
- Read comments through `comment_census.classify()`. The census has no
  `comment_lines()` function, although both dives cited one.
- Join each comment block's wrapped lines before matching. A formatter wrapped
  `adr_platform_model_unification.md` across two lines at `repo:ocx:crates/ocx_project/src/lock.rs:191`.
- Require the `.md` suffix in a pointer.
- Strip bracketed intra-doc links before matching.
- Skip identifiers that the repo defines (`plan_for`).
- Resolve anchors with docs-quality's `anchors()` in `rules/docs-quality/checks/links_raw.py`.
  Extend it to read `**ID**` definitions. Do not write a third slugifier:
  - `links_raw.py` collapses runs of hyphens.
  - github-slugger does not, so `—` becomes `--`.
  - The pointer-form prototype collapses hyphens and strips underscores.
- Match record citations as substrings, not whole backtick spans, so that
  `path.py:61,206-247` still counts. The rot dive's regex missed that case.
- LNK-04 is the linkage half of the surfaces group's leak check. Merge the two when
  that group lands.
- **Short-label definitions (LNK-13).**
  - Match the definition on marker-stripped text, and absorb a banner leader first:
    `^[\s\-─━=*#]{0,8}[A-Z]\d{1,2}[a-z]?:\s`.
  - plan-ids' regex required a `//` or `#` marker, which `classify()` has already
    stripped. So it exempted nothing, and it would have flagged its own proof
    example, the banner at `ocx:crates/ocx_package/src/cascade/equivalence.rs:376`.
  - The plan-ids-fleet module (`plan_id_patterns.classify_hit(text, raw_line)`)
    breaks the same way if `raw_line` is passed. Re-run in this revision, the plain
    definition `/// H1: create()` from `hardlink.rs:114` is then flagged. Call it
    with stripped text only.
  - The module exempts only the defining line. A later "see H1" in the same block
    needs the block join above.
- **LNK-06.**
  - Read the protected records at the merge base, not at HEAD. A record added by the
    branch, which may describe the old layout on purpose, is then never protected.
  - For each rename pair, print the destination path in the finding. At
    `b79abbe8d3`, 331 of the 350 stale lines cite a path that git paired as a
    rename, so the fix is a mechanical replacement. The other 19 lines cite 5
    deleted paths and need a person to judge them.
  - Guard against an empty old-path list. `git grep -f` with an empty pattern list
    matches every line (verified), and the `xargs -r` form above avoids that.
  - An old path matches as a substring. So a short top-level path such as `build.rs`
    also matches every nested `build.rs`. No such collision appeared in 72 citing
    files across 3 fires, but it is possible by construction, so match on a
    path boundary.
- **Discovery (LNK-14).** Fold `generic_scan.py` (`[A-Z]{1,6}-\d{1,4}` over comment
  text) into `--discover`. Ship its reviewed non-ID list with the check.
- **Spot checks.** List files with `git ls-files`, not `rg .`. `rg .` skips hidden
  directories, so it found 2 grimoire test names instead of 52. It also descends into
  submodules, so it counted 5,013 LNK-01 lines in ocx-mirror instead of 505.

## Applied to the fleet

| Rule | Status | Evidence |
|---|---|---|
| LNK-01 | Violated everywhere | These are prod comment lines from the prefixed families (plan-ids-fleet counts): ocx 2,415, arcana 614, creeptd-ng 604, ocx-mirror 306, grimoire 162, ocx-indexbot 122, ocx-catalog 76, ocx-sdk-python 56, grimoire-vscode 26. `ocx:crates/ocx_cli/src/api/data/shell_state.rs:292` cites `C-050`, which has 3 definitions. ocx-indexbot has 190 `ADR-N` references (80 of them `ADR-4`), mapped only in `index:.claude/artifacts/decision_log_2026-07-16.md:295`. `~/.claude/skills/hex-retro/scripts/retro.py:48` and `:54` sit among 27 lines of `C-14xx` IDs with no definition anywhere. |
| LNK-02 | Violated | `plan_toolchain_activation.md` is cited 27 times in `ocx:crates`, but only `adr_toolchain_activation.md` is tracked. ocx has 120 dead of 992 hits. All 13 grimoire dead pointers sit in `.claude/` hooks, tests and scripts that cite ocx ADRs (`grimoire:.claude/hooks/post_tool_use_tracker.py:187`), so qualifying them at the source repo fixes every copy. `ocx-indexbot:src/ocx_indexbot/__init__.py:14` names its repo in prose, not in a form a check can read. |
| LNK-02 | Satisfied | `ocx:crates/ocx_index/src/local_index.rs:1531` and `ocx:crates/ocx_index/src/store.rs:5` both resolve. |
| LNK-03 | New commitment | 0 of 1,062 resolved pointers carry an anchor. The file-plus-ID form at `local_index.rs:1531` (`adr_index_indirection.md` A2) becomes `adr_index_indirection.md#a2`. |
| LNK-04 | Violated | `ocx:crates/ocx_config/src/lib.rs:98` and `:124` reach `ocx:crates/ocx_schema/tests/golden/config.json`. ocx has 29 interface-class lines that name a record, and the golden schemas carry 64 IDs in 182 occurrences. |
| LNK-04 | Satisfied | 0 of 73 `ocx --help` screens leak (census §5). |
| LNK-05 | New commitment | The cleanup skill does not exist yet. The 30-site sample says deletion is safe. |
| LNK-06 | Violated | 350 citation lines in 58 ocx records have been stale since `b79abbe8d3` and remain so at HEAD `2691d3c`. They include `ocx:.claude/artifacts/adr_toolchain_activation.md:205` and `:225`, which the old whole-file test cleared. `ocx:.claude/artifacts/adr_tier_model_correlation.md:241` and `ocx:.claude/artifacts/adr_package_entry_points.md:18` cite `.claude/skills/swarm-*` paths deleted in `e0cd8a33e`. `ocx:.claude/artifacts/adr_crate_split_workspace.md:577` cites `test/tests/test_smoke_coverage.py`, which was renamed to `test/lint/` in `c6a9702932`. `ocx:.claude/artifacts/adr_per_platform_lock_pinning.md:593` cites an untracked `test/tests/test_schema_generation.py`. `grimoire:.agents/adr/adr_client_compat_matrix.md:70`, `:96` and `:137` cite `docs/src/clients.md`, which moved in `77558454fd`. |
| LNK-06 | Partly satisfied | `b79abbe8d3` repaired its own 25 citation lines in 8 rule files. At `c6a97029`, `ocx:.claude/rules/subsystem-ci.md:21` and `subsystem-cli-commands.md:63` cited the renamed path, and both are fixed at HEAD. The rules agents load get fixed; the ADRs stay stale. |
| LNK-07 | Violated once | `ocx:crates/ocx_python/src/lib.rs:12` links to `.../ocx-mirror/blob/main/...design_spec_ocx_python.md`. The spot check prints 7 more ocx lines, all external specs (OCI image-spec, sigstore, rustc), which are outside this rule. |
| LNK-08 | New, matches fleet habit | Dated addenda already sit beside the section they amend: `ocx:.claude/artifacts/adr_index_indirection.md:433` ("C2 addendum (2026-09-24)"). |
| LNK-09 | New commitment | No fleet record names symbols as its rule. |
| LNK-11 | Violated in the hex-built repos | 322 test fns in ocx carry a `c050_`-style prefix, 52 in grimoire (mostly `.claude/tests/`) and 24 in ocx-mirror. The other 6 fleet repos have 0. `ocx:crates/ocx_cli/src/api/data/shell_state.rs:1775` is `c050_s022_every_reason_and_note_variant_is_in_the_arm_corpus`. |
| LNK-13 | Violated | Raw short-label hits before exclusions: 1,791 prod and 2,931 test fleet-wide, 1,238 prod in ocx. Bare references with no local definition: `ocx:test/tests/test_project_env.py:988` `(H1)`, `ocx:crates/ocx_config/src/tls.rs:1034`, `ocx:crates/ocx_config/src/edit.rs:444`, and `arcana:nox/src/nox/workspace.py:1195` ("Security-H5"). |
| LNK-13 | Satisfied | Local labels defined and used in one block: `ocx:crates/ocx_store/src/hardlink.rs:114` (`H1:` through `H6:`), and the banner `ocx:crates/ocx_package/src/cascade/equivalence.rs:376`. |
| LNK-14 | Not yet run | No adopter has a local family list. The families it would surface are in LNK-14's rationale. |
| Record numbering | Collides | arcana reuses 4 of its ADR numbers (0002, 0009, 0011, 0013) across 23 tracked ADRs. That is the adr-tools and MADR sequential-number failure in this fleet, and the reason pointers name files, not numbers. |

## AI-agent failure modes

Ranked by how often each one bites in the fleet today.

1. **Echoing plan vocabulary into code.** An agent implementing `C-018` writes
   `C-018` into the comment, because the plan is the most salient thing in its
   context and no instruction says to (config.md §3). Measured: thousands of lines
   in ocx, 398 test names across the 3 hex-built repos, and 27 lines in the
   harness's own `retro.py`. Caught by LNK-01, LNK-11 and LNK-13.
2. **Citing a record under a stale or never-committed name.** The agent has no
   signal that a file it read earlier was renamed. Examples: 27 citations of
   `plan_toolchain_activation.md`, and 120 dead ocx mentions. Caught by LNK-02.
3. **Writing pointers and IDs into text that renders.** From the diff, the agent
   cannot see that a `///` on a `JsonSchema` item becomes a schema `description`.
   Measured: 29 lines, 182 schema occurrences. Caught by LNK-04.
4. **Citing across repos without saying which repo.** About 24 of 30 leaf-repo
   "dead" mentions are this case, and all 13 in grimoire come from harness files
   copied out of ocx. Caught by LNK-02.
5. **Refactoring without touching the records that cite the moved paths.**
   Measured: 3 of 300 ocx commits, but one of them left 350 citation lines stale
   in 58 records. Caught by LNK-06.
6. **Building a naive detector and trusting it.** The fixes belong in the check
   design, not in a rule. Measured instances:
   - An extensionless regex gives 43% false positives on `plan_for`-style
     identifiers.
   - Backtick-path scans overcount rot 4 times in ocx and 15 to 40 times in
     arcana, because arcana's ADRs cite other repos and other clients' config paths.
   - A "did the record change" test clears a record that still cites the dead path.
   - A definition regex expects a comment marker the classifier has already
     stripped.
   - An `rg .` spot check skips `.claude/` and walks into submodules.
7. **Trusting `git log --follow` on a deleted path, or stopping after the first
   rename hop.** The result is a silent false negative that reads as a clean answer.
   Caught by LNK-10.
8. **Minting a repo-local ID family the fixed list cannot see.** Measured: about 948
   hits in 11 creeptd-ng families, and about 700 in ocx outside the list. Caught by
   LNK-14.
9. **Inventing a plausible pointer during cleanup, because citing a source looks
   thorough.** Not measured in the fleet. The collision data predicts a wrong
   guess, and LNK-02 passes it. Caught by LNK-05. The eval measures it
   (next section).

## Decisions for the eval

- **The `pointer-only` arm uses this grammar and nothing else.**
  - Its line is `// see adr_x.md#a2`, and it resolves in the snapshot.
  - eval-arms-and-sites §2 allows `file:line`. That is overridden: the arm has to
    test the pointer form the rule ships.
  - The arm's fabricated reason fixture goes at a tracked, record-shaped path, so
    that it passes LNK-02.
  - Report results separately for real-record sites and fixture sites. The eval
    dive named the fixture's fairness as unresolved (eval-arms-and-sites.md:228),
    and this split calibrates it.
- **New site property: record-backed.** The reason exists in a tracked record
  section that an anchor can address.
  - Only 2 of 48 sites have one: OCX-04 (`adr_shim_hermetic_zigbuild.md`) and OCX-05
    (`adr_windows_exe_shim.md#contract-3`).
  - Add 4 or more from the candidates `ocx:crates/ocx_index/src/store.rs:4`
    (`#a2`), `ocx:crates/ocx_index/src/local_index.rs:1034` (`#c2-structural`) and
    `ocx:crates/ocx_config/src/lib.rs:124` (`#f5b`). Vet each one as a guard first.
- **New site property: carries a bare ID.** 0 of 48 sites carry one. Add 4 or more
  from plan-ids' 30-line sample, such as `ocx:crates/ocx_config/src/lib.rs:699`
  (`C-019`) and `ocx:crates/ocx_package_manager/src/launcher/body.rs:576` (`WP-6`).
  Take them from LNK-01's prefixed families, so the `rules` arm tests the MUST rule.
  On these sites the `rules` arm applies LNK-01's rewrite.
- **New stratum: misdirected pointer.** On 2 to 4 bare-ID sites, point at the wrong
  one of the colliding documents (for `C-050`, `design_spec_shell_env_overhaul.md`
  instead of `plan_index_claim_command.md`). Score it against `stripped`. If it
  recovers the reason worse than `stripped` does, LNK-05's premise holds.
- **Where the reason was found.** `extract.py` must tag "opened the pointer target"
  separately from other record reads. That tag is how often cold agents follow a
  pointer, which is H5's pointer half.
- **Rules that need the eval before they change severity:**
  - LNK-03 stays SHOULD unless anchored pointers beat file-only pointers on reason
    recovery.
  - LNK-05 ships as MUST, because it is justified by construction, but the
    misdirected stratum must not contradict it.
  - LNK-01, LNK-02, LNK-04, LNK-06, LNK-13 and LNK-14 do not depend on the eval.
    They rest on resolution, leak and detector-precision data, not on agent
    behaviour.

## Open questions

**Owner decisions (one-way doors only):**
1. **The pointer grammar, `[repo:]path.md#anchor`.** The cleanup will write it into
   thousands of lines, so changing it later means a second mass rewrite. Default: as
   decided above, with the fleet map at `rules/code-docs/checks/fleet.json`.
2. **Minting plan IDs in hex.** Proposal: prefix each ID with the plan's slug at
   `~/.claude/skills/hex-init/assets/templates/plan.md:116-123`, the same fix
   log4brains ships. It changes every future plan and test name across the harness
   and lands outside lore (topic map Q1). The ID-in-test-name pattern now shows up
   in exactly the 3 hex-built repos, which places its source in hex. Default: LNK-01
   and LNK-11 ship either way.

**Research rounds worth running:**
1. **The discovery threshold and the non-ID list (LNK-14).** Run the catch-all scan
   on all 9 fleet repos. Check that 5 prod hits separates real families from strays,
   and write the reviewed non-ID list. That list must cover standards (`CWE-`,
   `UTF-`, `SHA-`) and decide whether lore rule IDs (`DOC-11`, `LINT-16`) may stay in
   comments. LNK-14 cannot rise above SHOULD until this is done.
2. **A path-scope exclusion for docs-tooling files (LNK-13).** About 90 fleet lines
   in `rules/*/checks/`-style files use `H1` to `H6` as their subject. Build the
   exclusion and re-measure LNK-13's residual false positives. LNK-13 cannot rise
   above SHOULD until this is done.

## Sub-artifacts

- [code-docs-linkage/pointer-form-and-check.md](code-docs-linkage/pointer-form-and-check.md):
  - The code-to-record pointer form.
  - The stdlib `pointer_check.py` prototype, which found 1,213 hits and 150 dead
    across four repos.
  - The cross-repo breakdown, the interface-leak count and the URL policy.
- [code-docs-linkage/plan-ids.md](code-docs-linkage/plan-ids.md):
  - 10 ID families with measured false positives, and the D-V ordering.
  - The split between a label's definition and a reference to it.
  - The 22/6/2 replacement sample, the test-name policy, the `plan_id_ratchet.py`
    prototype and the hex minting proposal.
- [code-docs-linkage/record-to-code-rot.md](code-docs-linkage/record-to-code-rot.md):
  - A full scan of ADR citation rot in ocx, grimoire and arcana.
  - The `--follow` gotcha, the path-versus-symbol natural experiment, the diff-time
    gate replay and the edit-versus-addendum sources.
- [code-docs-linkage/plan-ids-fleet.md](code-docs-linkage/plan-ids-fleet.md):
  - Family counts across 9 fleet repos and 33 human repos, with a 200-hit sample.
  - The short-label false-positive classes, kept and rejected.
  - The catch-all scan behind LNK-14, and the definition-regex bug.
  - Test-name counts per repo, and the per-file ratchet argument.
  - The `plan_id_patterns.py` module, its fixture, and a held-out 50-hit sample.
- [code-docs-ratchet/gate-replays.md](code-docs-ratchet/gate-replays.md), Findings 1-3:
  - The citation-by-citation replay of `b79abbe8d3`.
  - The false negative in the whole-file test.
  - The 300-commit replay.

## Key sources

- `.agents/research/code-docs-audit/census.md` §3-5: the ID collision table, 8 dead pointers, the schemars leak trace.
- `.agents/research/code-docs-audit/records.md` §1-3: 444 records, 0 of 30 IDs unique, the 45% rot sample.
- `.agents/research/code-docs-audit/config.md` §3-4: where IDs leak from hex, the 10-site routing spot check.
- `.agents/research/code-docs-audit/human-sample.md` "How humans point elsewhere": durability of 15 human pointers.
- `/home/mherwig/.claude/skills/hex-core/references/protocol.md:749-768`: the traceability-ID design.
- `/home/mherwig/dev/ocx/scripts/lint_ratchet.py`: the baseline contract the check reuses. Its `--by-file` docstring states the per-file argument and the cost of a file move.
- `rules/docs-quality/navigation.md` DOC-NAV-07 and `rules/docs-quality/checks/links_raw.py`: explicit anchors, the anchor resolver to reuse.
- `/home/mherwig/.cache/research-lang/code-docs-scratch/plan-ids-fleet/`: `family_scan.py`, `generic_scan.py`, `plan_id_patterns.py` and their outputs.
- `/home/mherwig/.cache/research-lang/code-docs-scratch/gate-replays/`: the LNK-06 replay scripts and the `ocx-scratch` clone at `2691d3c`.
- `/home/mherwig/.cache/research-lang/code-docs-scratch/linkage-revise/`: this revision's re-runs. `lnk06_percitation_300.py` gives 3 fires in 300 commits. `lnk06_repairability.py` splits the crate-split lines into 331 renamed and 19 deleted.
- [github-slugger index.js](https://github.com/Flet/github-slugger/blob/master/index.js): does not collapse hyphens, unlike `links_raw.py`.
- [Hata et al., arXiv 1901.07440](https://arxiv.org/abs/1901.07440): about 10% of source-comment links dead.
- [log4brains README](https://github.com/thomvaill/log4brains): drops numbering to avoid merge collisions, and states the immutability doctrine.
- [Nygard, Documenting Architecture Decisions (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): the single-writer sequential numbering scheme.
- [matklad, ARCHITECTURE.md (2021)](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html): "name, don't link", and where it stops holding.
- [git-log manual](https://git-scm.com/docs/git-log): `--follow` works on one existing file, walking backwards.
- [Joel Parker Henderson, architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record): amend by adding, or supersede.
- [todocheck README](https://github.com/preslavmihaylov/todocheck): the nearest prior art, which resolves only TODOs to issues.
- [Software Engineering at Google, ch. 20](https://abseil.io/resources/swe-book/html/ch20.html): a check needs under 10% effective false positives to run in review at all, and a gating check needs about zero. LNK-06's 3 of 3 clears that bar.
- [typos design doc](https://github.com/crate-ci/typos/blob/master/docs/design.md): a positive list beats excluding shapes from an open pattern. That is why LNK-01 is MUST and LNK-13 is SHOULD.
- [RFC 9110 §15](https://www.rfc-editor.org/rfc/rfc9110.html#section-15): the section-citation convention behind the `RFC NNNN S<n>` shorthand that LNK-13 excludes.

## Revision log

Revised 2026-09-27. One line per change:

- LNK-01 narrowed to the 10 prefixed families; short labels moved out to LNK-13. Why: 0 of 200 fleet false positives and 0 human-repo hits for prefixed families, against an open shape for short labels. Source: plan-ids-fleet §1-2 (C11).
- LNK-13 added (SHOULD): short labels, with 3 kept exclusions after the D-V ordering and 2 rejected ones. Source: plan-ids-fleet §2, §4.
- LNK-14 added (SHOULD): the discovery step at adoption. Verdict item 2 gains the documented gap. Source: plan-ids-fleet §3 (C14).
- Ratchet keys moved from package to file, and a `short-label` key was added. Affects the LNK-01, LNK-02, LNK-04, LNK-11 and LNK-13 keys. Source: plan-ids-fleet §6 (C12). plan-ids-fleet's "8.9% of the fleet" is corrected to 8.9% of ocx (5.3% of the fleet).
- Check notes: the short-label definition regex runs on stripped text with banner leaders. It exempts per line only, and `classify_hit` must not get `raw_line`. Source: plan-ids-fleet §4, and this revision re-ran the module.
- LNK-06 rule text changed from "update that record" to "repair every citation, or pair it with the destination". Why: the old wording overclaimed, because any edit satisfied it. Source: gate-replays §2 (C13).
- LNK-06 verification switched from the whole-file `git diff --quiet` test to a per-citation command that reads records at the merge base. Source: gate-replays §2. This revision re-ran it over 300 commits (3 fires, the same commits) and verbatim on `c6a97029` (4 records).
- LNK-06 rationale numbers updated: "108 citations across more than 40 ADRs" became 375 lines in 66 records, 350 of them stale in 58. "2 fires in 200 commits" became 3 fires in 300. Source: gate-replays §1, §3. This revision found all 350 still stale at HEAD.
- Verdict item 4 now says the gate checks per citation, is 3 of 3 precise and has the fragment gap. Source: gate-replays §1-3.
- Open question "record-gate precision" removed. gate-replays §1 answered it: the historical-subject record is excluded by construction. 331 of 350 lines are rename-paired and so mechanically fixable (this revision measured that).
- Open question "plan-ids across the fleet" removed. Answered by plan-ids-fleet §1-5.
- Two research rounds added: the discovery threshold and non-ID list, and the docs-tooling path scope. Source: plan-ids-fleet §3, and its guidance candidate 7.
- LNK-11 evidence changed from ocx 272+16 and grimoire 2 to 322, 52 and 24 across the 3 hex-built repos, with 0 in the other 6. SHOULD is confirmed. Source: plan-ids-fleet §5 (C5 updated).
- Spot checks for LNK-01, 02, 03, 07, 09, 11 now list files with `git ls-files`. Why: `rg .` skipped `.claude/` (grimoire LNK-02 found 0 dead instead of 7, and LNK-11 found 2 instead of 52) and walked into the ocx-mirror submodule (5,013 LNK-01 lines instead of 505). Source: this revision, prompted by plan-ids-fleet §5's counts.
- LNK-01 spot check gains `S-` and `A-`: 4,530 became 5,092 lines on ocx. Source: this revision.
- LNK-07 text scoped to record URLs, which is what its "violated once" evidence already meant. The spot check prints 7 external-spec lines on ocx that the rule does not cover. Source: this revision.
- LNK-10 rationale gains the second-hop evidence: 2 of 138 cited crate-split rename destinations moved again. Source: this revision.
- C6 updated: the transitional `file.md A2` now counts under LNK-13's key. Source: follows from C11.
- Applied table: new LNK-06 violations (`adr_toolchain_activation.md`, and the `swarm-*` citations in 2 ADRs), rows for LNK-13 and LNK-14, and per-repo LNK-01 counts. Source: gate-replays §2-3, plan-ids-fleet §1.
- AI-agent failure modes: #1, #5 and #6 updated, and #8 (local ID families) added. Source: plan-ids-fleet §3, gate-replays §2-3.
