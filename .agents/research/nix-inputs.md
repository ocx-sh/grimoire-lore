---
title: Inputs and the lock — consolidated (NIX-INP)
topic: inputs-and-the-lock
model: opus
id_family: NIX-INP
consolidates:
  - nix-inputs/follows-and-lock-hygiene.md
  - nix-inputs/input-types-and-sources.md
  - nix-inputs/verification-rerun-w3.md
  - nix-audit/exemplar-flake-shape.md (§2, §9)
  - nix-audit/exemplar-tool-runs.md (Axis 1, Axis 2, Axis 4, smell 6)
  - nix-topic-map.md (section B rows M-B-01..17, M-F-18; conflicts 3, 9, 15, 21; wave-3 contradictions E12, E17, E18, E20, E22, E23)
date: 2026-09-27
revised: 2026-09-27
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/nix-inputs/
---

# Inputs and the lock (NIX-INP)

All runs were done on 2026-09-27 through `/home/mherwig/.cache/research-lang/nix-tools/run.sh`.
The implementations are CppNix 2.35.2 (the default), CppNix 2.31.5
(`nixpkgs#nixVersions.nix_2_31`, the fleet's consumer floor per NIX-GATE-16),
and Lix 2.95.2 (`nixpkgs#lix`). The nixpkgs pin is `8d5d2709…` (26.11pre)
unless a row says otherwise. The consolidation planted new fixtures under
`fixtures/nix-inputs/`. Rows marked "(dive)" cite a sub-artifact's own run;
rows marked "(w3)" cite `nix-inputs/verification-rerun-w3.md`, whose fixtures
live under `fixtures/verification-rerun-w3/inputs/`.

**Revision note (2026-09-27).** This revision folds in the wave-3 verification
rerun. Re-running any w3 row to settle a conflict was attempted and **blocked**:
`run.sh nix --version` → `bwrap: Can't find source path
/home/mherwig/.cache/research-lang/nix-tools/.nix-portable/emptyroot: No such
file or directory`, exit 1; the `fixtures/` tree is also absent. Every w3 result
below is therefore taken from its recorded command, exit code and output, and
one w3 conclusion (NIX-INP-02 → MUST) is rejected on reading because its fixture
did not measure the question it answers (Conflicts resolved 10).

## Verdict

1. **Follows are decided by how an input is consumed, not applied as general hygiene.**
   - Inputs consumed as libraries, modules or overlays follow the root `nixpkgs`.
   - Inputs whose *packages* you want from the author's cache do not follow. Each such case carries a one-line comment in `flake.nix` saying why. `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:11` is the model.
   - Map conflict 3 stands. The Nix manual's own "usually irrelevant" sentence settles that follows are not hygiene.
2. **The duplicate-nixpkgs check lists transitive nixpkgs nodes. It does not count all of them.**
   - The map's Q1 filter and the follows dive's filter both key on `repo == "nixpkgs"`. That misses every FlakeHub and `channels.nixos.org` nixpkgs.
   - Measured over the 35 corpus locks, both filters report 0 for 5 flakes that do carry a nixpkgs, and both undercount nix-installer.
   - A direct second nixpkgs is a root author's deliberate choice (for example nixpkgs-terraform's three branches). The finding is a *transitive* nixpkgs node that has no justification.
3. **`flake.nix` names a branch and `flake.lock` is the pin.**
   - The follows dive's rule 3 (put a 40-hex rev in every url) is rejected. A rev in `url` makes `nix flake update <x>` a silent no-op (exit 0, rev unchanged, measured). Every lock-freshness rule then fails forever.
   - A rev in `url` is only for a deliberately frozen input, such as a regression baseline, and it gets a comment.
   - Consequence, now measured (w3): because dependencies also name branches, removing a `follows` re-resolves the dependency's input at the branch's *current* tip, not at the rev its own lock pinned (#14339). NIX-INP-08's read-the-diff-and-restore step is the guard, and its restore is exact.
4. **A published flake's committed lock holds no local inputs.**
   - Local inputs are an absolute `path:`, `git+file:`, or a relative `path:` that leaves the flake's own git tree.
   - Relative `path:` that stays in the same git tree is allowed and needs Nix ≥2.26: `path:./sub` from a root, and `path:..` from a nested `test/` flake back to its parent (w3: both 2.31.5 and 2.35.2 evaluate it, exit 0). Map E23 applied.
   - Cross-repo local work goes through `--override-input` and is never committed. This overrules the input-types dive, which offered absolute `path:` or `git+file:?rev=` as "the fix". Those work only on the author's machine.
5. **Every input has an explicit scheme.**
   - Use `github:` (or `git+https:`), or a `channels.nixos.org/…/nixexprs.tar.zst`.
   - Never use a bare registry name, and never `.tar.xz` (it ends after 2027-12-31). FlakeHub inputs are banned by NIX-REL-06, which owns that clause (map E18).
   - A `github:` input is a tarball and carries no submodule or LFS content; an input that needs either uses `git+https:`/`git+ssh:` (NIX-INP-14).
6. **Use `nix flake update <input>` to move an entry and never `--update-input`.**
   - The map's claim that it is "gone since 2.19" is wrong for CppNix: 2.31.5 and 2.35.2 accept it with a deprecation warning, exit 0.
   - It is right for Lix: 2.95.2 rejects it, exit 1, which fails the advisory Lix leg of NIX-GATE-16 (owner Q6).
7. **Library and module flakes keep dev and test inputs out of the root flake.**
   - A B flake takes zero inputs or only `nixpkgs-lib`. Its tests live in a sub-flake that CI drives with `--override-input <self> ./.` (or a same-tree `path:..` input), as in `ipetkov/crane@73b980519cef:test/flake.nix` with `.github/workflows/test.yml:134`.
   - Without this, test pins leak into every consumer's lock. Measured: NixOS/nix's `nixpkgs-regression` and `nixpkgs-23-11` appear in nix-installer's lock.
   - **Severity stays SHOULD.** Whether a consumer *fetches* a transitive node it never accesses (M-B-17) is still unmeasured. w3 answered a different question: the flake that *declares* an input fetches it when it locks (true, and expected). It did not lock a consumer against a dependency's pre-existing lock (Conflicts resolved 10).
8. **Locks refresh weekly through a reviewed PR that runs the full gate.**
   - This binds A flakes and B flakes' test sub-flakes.
   - The generated flake (D) bumps its lock inside NIX-GEN-16's data-update PR and has no separate cadence.
9. **Submodules and LFS: the flags are portable across CppNix, not across implementations.**
   - CppNix 2.31.5 behaves like 2.35.2 in every `self.submodules`/`self.lfs` case (w3). Only the missing-file error string differs: `does not exist` (2.35.2), `No such file or directory` (2.31.5).
   - Lix 2.95.2 accepts `inputs.self.submodules` only with `--extra-experimental-features flake-self-attrs` (map E12, NIX-GATE-16's Lix command adds the flag). **Documented gap: Lix 2.95.2 has no `inputs.self.lfs` at all**: `error: flake 'self' attribute 'lfs' is not supported`, even with the flag. A flake that declares `self.lfs` marks its Lix leg as an expected failure. It never deletes the flag to turn Lix green.
   - **Documented gap: `self.lfs` against a real HTTPS LFS remote is unverified end to end.** w3 reached GitHub's real LFS batch endpoint (`microsoft/vscode-docs`, `?lfs=1`) and got `HTTP error 429` from the shared egress IP. The mechanism is engaged, but the round trip did not complete.
   - A repo that ships no `flake.nix` cannot declare `self.*`. A wrapper takes it as a `flake = false` `git+https:` input with `submodules=1` (NIX-INP-14). grimoire is that case today: `grimoire-rs/grimoire@55f839ce31fb` has no `flake.nix`.
10. **The eval budget: a line-gap watchdog on `-v` output finds a stalled step. It does not prove a hang.**
    - `nix flake check --no-build -v`, timestamped per line: a 6-fetch fan-out (8 s per fetch) never exceeds an 8 s gap and passes. A fetch to a blackholed address prints nothing for the whole 89 s window (w3).
    - The wave-1 "silent hang" of `DeterminateSystems/nix-installer@76f61b5202e2` is corrected. Under `-v` it prints `checking Hydra job …` continuously (max gap 34 s) while it evaluates its `hydraJobs.vm-test.*` matrix. It is a large workload, and the remedy is to scope the check, not to raise the timeout.
    - **Documented gap:** the red twin is one fetch that never ends. One legitimate fetch or IFD build longer than 60 s prints the same single line and then goes silent, and that twin was not run. So a gap over 60 s is an alarm that names the last line, never an automatic kill (NIX-INP-13).
11. **Shape bindings:**
    - A (fleet CLIs) takes 01, 03-11 and 13. It takes 14 when it wraps a non-flake repo.
    - B and C take 02 in addition, and 12 when widely consumed.
    - D (ocx-nix) takes all but 02 and 14. Consumers may follow its nixpkgs, because the layer FODs are invariant.
    - E (template) takes 03-05 and 07 in the template's own `flake.nix`, and ships lockless.

## The ruleset

### NIX-INP

Legend: **Red/green** means watched failing on a planted violation and
passing on a compliant twin. A **floor** is the oldest Nix whose behaviour the
rule depends on.

#### Check A — `jq` over `flake.lock` (the lock graph)

The one-liner **Q1-transitive** is referenced below. It prints the transitive nixpkgs nodes; empty output passes:

```sh
jq -c '((.nodes.root.inputs // {}) | [.[] | strings]) as $d
  | [.nodes | to_entries[] | select(.key != "root" and ((.key | IN($d[])) | not))
     | select(((.value.original.repo // .value.locked.repo // "") | ascii_downcase) == "nixpkgs"
              or .value.original.id == "nixpkgs"
              or ((.value.original.url // "") | test("nixos\\.org/(nixpkgs|nixos-)|flakehub\\.com/f/(pinned/)?NixOS/nixpkgs/"; "i")))
     | .key]' flake.lock
```

| ID | Rule | Rationale (failure prevented) | Verification | Red/green | Sev | Floor / impl |
|---|---|---|---|---|---|---|
| **NIX-INP-01** | Decide `inputs.<x>.inputs.nixpkgs.follows = "nixpkgs"` by how `<x>` is consumed. **Follow** when it is a library, module or overlay you compose against your own `pkgs`. **Do not follow** when you take its `packages` from its author's cache, and put a one-line comment at the input saying so. If the input's README forbids overriding (nixpkgs-python), never follow. After every lock change, every entry Q1-transitive prints is either removed by a `follows` or justified by such a comment. | A reflexive follows on a cache-backed input turns every hit into a local rebuild ("The cached builds are tied to the pinned nixpkgs revision", `cachix/nixpkgs-python@4d2bd16c09ba:README.md:44-45`). A missing follows on a library input puts a second nixpkgs into the lock without anyone noticing: `flake.lock` never deduplicates by content, and three inputs pinned to the byte-identical rev give 4 nixpkgs nodes (dive, follows §2). Following a much newer nixpkgs "time-travels" the input (fzakaria: 3,261 revisions among 10,754 flakes). The manual: a transitive nixpkgs "is usually irrelevant" for modules and overlays. | Q1-transitive, then read each hit's input for a follows or a comment. | **Yes.** `consumer-nofollows` → `["nixpkgs","nixpkgs_2","nixpkgs_3"]`; `consumer-follows` → `[]` (this consolidation, jq 1.8.1, on the dive's fixtures). | SHOULD | any |
| **NIX-INP-02** | A B (library) flake's root takes **zero inputs**, with functions taking `pkgs`, or **only `nixpkgs-lib`**. A C (module) flake's modules use the consumer's `pkgs` module argument. Test and dev inputs (a second nixpkgs, rust-overlay, advisory-db, flake-utils) live in a sub-flake such as `test/flake.nix`. CI runs it with `--override-input <self> ./.` (optionally `--reference-lock-file ./test/flake.lock`), or the sub-flake takes the parent as a same-tree `inputs.<self>.url = "path:..";` (NIX-INP-04). | Every root input of a flake consumed as an input becomes a lock node for every consumer. Measured: `NixOS/nix@209d2bc44288:flake.nix:6-7` pins test-only `nixpkgs-regression` and `nixpkgs-23-11`. Both appear as transitive nodes in `DeterminateSystems/nix-installer@76f61b5202e2:flake.lock` through its `nix` input (Q1-transitive → `["nixpkgs","nixpkgs-23-11","nixpkgs-regression"]`). crane shows the fix: root lock `{"nodes":{"root":{}}}`, tests in `test/flake.nix`. Whether the leaked node also costs each consumer a *fetch* is open (M-B-17). The lock bytes, the update churn and the Q1-transitive findings are already measured. | `jq '(.nodes.root.inputs // {}) \| has("nixpkgs")' flake.lock` on a flake whose `flake.nix` defines no derivation (NIX-FLK-14's grep). `true` is a finding. No `flake.lock` after `nix flake lock` means zero inputs, which passes. | **Yes.** Planted `nix-inputs/lib-with-nixpkgs` → `true`; `follows-and-lock-hygiene/lib-nixpkgs-lib-input` → `false`; `lib-zero-inputs` → no lock written (dive run 8 plus this consolidation). The `path:..` sub-flake form evaluates on 2.35.2 and 2.31.5: `same-tree-parent/test` → `"test-sees-root-value"`, exit 0 (w3 §6). | SHOULD (w3 proposed MUST; rejected, Conflicts resolved 10) | any. A `path:` sub-flake needs ≥2.26 (NIX-INP-04). |
| **NIX-INP-03** | Name a **branch or tag** in each input's `url` (`github:NixOS/nixpkgs/nixos-unstable`). Let `flake.lock` carry the rev. Put a 40-hex rev in `url` only for an input that is frozen on purpose, such as a regression baseline, with a comment saying so. | A rev in `url` makes `nix flake update <x>` exit 0 with the rev unchanged, so the lock can never refresh. flake-checker's 30-day bar then fails permanently, and an agent "updating" sees success. The price of branch refs is #14339's drift when a follows is removed (w3 reproduced it). NIX-INP-08 pays that price by reading the diff, not by freezing. | `jq -c '[.nodes.root.inputs[]? \| strings] as $d \| [.nodes \| to_entries[] \| select((.key \| IN($d[])) and .value.original.rev != null) \| .key]' flake.lock`. Every hit needs a "frozen on purpose" comment. | **Yes.** Planted `nix-inputs/frozen-sha` (url `github:nix-systems/default/4e9a51a1…`): `nix flake update systems` exit 0, rev `4e9a51a15ceb` → `4e9a51a15ceb`, and jq → `["systems"]`. Twin `nix-inputs/tracked-branch` (url without rev, locked to the same old rev): exit 0, rev `4e9a51a15ceb` → `da67096a3b9b`, and jq → `[]`. | SHOULD | any |
| **NIX-INP-04** | A published flake's committed `flake.lock` contains **no local input**: no `path:` with an absolute path, no `git+file:`, and no relative `path:` that leaves the flake's own git tree. The only relative form allowed is **a relative `path:` that stays inside the flake's own git tree**: `path:./sub` from the root, or `path:..` from a nested sub-flake back to its parent. A flake using either states a consumer floor of Nix ≥2.26. Develop against a sibling checkout with `--override-input <x> path:/abs/sibling` on the command line, never in `flake.nix`. | An absolute path or `git+file:` resolves only on the author's machine. A dirty `git+file:` input is refused outright at lock time ("lock file contains unlocked input", NixOS/nix#10815 → #11181). Cross-tree relative paths are illegal by design ("the resolved path must be in the same tree", nix3-flake). The 2.26 lock format (`"parent": []`) cannot be parsed by older Nix (rl-2.26). | `jq -c '[.nodes \| to_entries[] \| select((.value.original.type=="git" and ((.value.original.url//"") \| startswith("file:"))) or (.value.original.type=="path" and ((.value.original.path//"") \| startswith("/")))) \| .key]' flake.lock`: empty passes. Candidates for the cross-tree case: `grep -rn -e 'path:\.\./' --include='*.nix' .`, each confirmed by reading. The bare parent form `path:..` has no trailing slash, so it is not a candidate. | **Yes.** jq on `follows-and-lock-hygiene/consumer-nofollows` (absolute `path:` inputs) → `["a","b","c"]`. On `input-types-and-sources/monorepo` (`path:./sub`) → `[]`. Cross-tree `path:../sibling-b` fails on 2.35.2 and 2.31.5 with `access to absolute path '…' is forbidden in pure evaluation mode`, exit 1. `path:./sub` locks and is read by 2.31.5, exit 0 (dive, input-types runs). Same-tree `path:..` from `test/` → exit 0 on 2.35.2 and 2.31.5, and the candidate grep prints nothing for it (w3 §6). | **MUST** | ≥2.26 for relative `path:`; the fleet floor is 2.31.5 |
| **NIX-INP-05** | Give every input an **explicit scheme**: `github:` (the default, fetched as a tarball), `git+https:`/`git+ssh:` for other forges and for any input that needs submodule or LFS content (NIX-INP-14), or `https://channels.nixos.org/<branch>/nixexprs.tar.zst`. Never use a bare registry name (`nixpkgs`, `nixpkgs/nixos-unstable`). Never use `nixexprs.tar.xz`. `flakehub.com/f/…` inputs are governed by NIX-REL-06 (map E18). | An `indirect` input resolves through registry state at lock time (NixOS/nix#7422, open). What it actually fetches is visible only in `locked.type`, which today is a `releases.nixos.org` **tarball**, not `github` (measured). nixpkgs 26.11's release notes end `.tar.xz` "together with Nixpkgs 27.05 after 2027-12-31". | `jq -e '[.nodes[] \| select(.original.type == "indirect")] \| length == 0' flake.lock` and `grep -rn -e 'nixexprs\.tar\.xz' --include='*.nix' .`. Empty passes. The FlakeHub grep is NIX-REL-06's. | **Yes.** `input-types-and-sources/indirect-input` → indirect node `{"nixpkgs":"tarball"}`, finding. `consumer-follows` → none (this consolidation). `.tar.xz` grep red on a planted copy of `NixOS/nix@209d2bc44288:flake.nix:4`, green on the `.tar.zst` edit (dive). | **MUST** | any. `.tar.zst` channels exist today. |
| **NIX-INP-06** | An A or D flake's root `nixpkgs` tracks a branch that the **installed** flake-checker binary lists as supported. For 0.2.15 that means `nixos-unstable`, `nixpkgs-unstable`, `nixos-26.05`, their `-small` variants, or `nixpkgs-26.05-darwin`. Keep it under 30 days old, checked by `flake-checker --no-telemetry --fail-mode --condition "supportedRefs.contains(gitRef) && numDaysOld < 30 && owner == 'NixOS'" flake.lock` as an advisory step. Tell a crash from a finding per NIX-GATE-11. | Median corpus nixpkgs lock age is 65 days, max 566 (`numtide/blueprint@8be75245e274`), and 20/31 locks are outdated (shape §2, runs Axis 4). The 0.2.15 binary rejects `nixos-25.11`, although its `main` README lists it. The binary wins (map conflict 15), and the list is re-read at every flake-checker bump. | The command in the rule: exit 1 is a finding, unless stderr has `Error: Invalid(` or `Error: FlakeLock(`. | **Yes.** `follows-and-lock-hygiene/branch-2511-check` (nixos-25.11, 88 days old): default exit 0 with 2 findings printed, `--fail-mode` exit 1 (dive run 6). The clean twin is NIX-GATE-11's V17. | SHOULD (advisory, map conflict 21) | flake-checker 0.2.15 |

#### Check B — lock mutation discipline (`nix flake lock` vs `update`)

| ID | Rule | Rationale | Verification | Red/green | Sev | Floor / impl |
|---|---|---|---|---|---|---|
| **NIX-INP-07** | To move an existing entry, including a `path:` input whose target you just edited, run `nix flake update <input>` (or `nix flake update` for all). `nix flake lock` only adds missing entries and applies structural follows edits. Never write `nix flake lock --update-input` or `--recreate-lock-file` in scripts or docs. Install-command wording in READMEs is NIX-REL-09's (map E20). | The manual says entries "already up-to-date are not modified. If you want to update existing lock entries, use `nix flake update`" (flake-lock.md 2.35.2). After a `path:` input's target changes, plain `lock` silently keeps the **old `narHash`**, so the consumer builds stale code (dive run 4). `--update-input` is a hard error on Lix, which fails NIX-GATE-16's advisory Lix leg, and CppNix warns that it is deprecated. | `grep -rn -e '--update-input' -e '--recreate-lock-file' .` must be empty. After editing a `path:` target, `jq .nodes.<x>.locked.narHash flake.lock` must change. | **Yes.** `nix-inputs/tracked-branch`: `nix flake lock --update-input systems` gives **Lix 2.95.2 exit 1** (`` `nix flake lock --update-input systems` has been replaced by `nix flake update systems` ``) and **CppNix 2.31.5 and 2.35.2 exit 0** with `warning: '--update-input' is a deprecated alias for 'flake update'`. The twin `nix flake update systems` exits 0 on 2.35.2. The `path:` staleness: `nix flake lock` left `sha256-+xD4…`, and `nix flake update genflake` moved it to `sha256-kidz…` (dive run 4). | **MUST** | `nix flake update <input>` ≥2.19. Lix rejects the alias. |
| **NIX-INP-08** | After any `follows` edit, run `nix flake lock` and read `git diff -- flake.lock` before committing. After **removing** a follows, check that the dependency's re-created nixpkgs node carries the rev the dependency's own lock pins (`nix flake metadata <dep-ref> --json \| jq -r .locks.nodes.nixpkgs.locked.rev`). If it does not, restore it with `nix flake lock --override-input <dep>/nixpkgs github:NixOS/nixpkgs/<that-rev>`. | NixOS/nix#14339 (open), now reproduced from scratch (w3): when a follows is removed, a dependency whose own input names a *floating* branch re-resolves it at the branch's current tip. It does not read the dependency's committed lock. Because NIX-INP-03 makes branch refs the norm, every follows removal is exposed. A sha-pinned dependency restored its pin exactly (dive run 3). Follow cycles are no longer a segfault on CppNix (#5393 fixed), but Lix still fails with no useful diagnostic. | `nix flake lock; git diff --stat -- flake.lock`, plus the rev comparison in the rule. | **Yes.** Drift: `f14339/consumer` with the follows removed → `• Updated input 'dep/nixpkgs': follows 'nixpkgs' → '…?ref=main&rev=55b95f2f…'` (the drifted tip B, not dep's pinned A `9ca31cb2…`). Restore: `--override-input dep/nixpkgs "git+file://…?rev=9ca31cb2…"` → rev `9ca31cb259696c3b9bbcb0c9adaf897242f7c9cc` and narHash `sha256-r7OCelzq1bLh2Pj8fbmKATGdRahf4T5EZHbe4l950n0=`, both equal to dep's own pin (w3 §2, 2.35.2). Cycle: `nix-inputs/self-follow`, CppNix 2.35.2 **and** 2.31.5 exit 1, `error: follow cycle detected: [nixpkgs -> a/nixpkgs -> nixpkgs]`. **Lix 2.95.2 exit 1, `error: stack overflow (possible infinite recursion)`** (this consolidation). | SHOULD | any. The cycle diagnostic is CppNix ≥2.31. The drift was measured on 2.35.2 only. |

#### Check C — fetch behaviour (evaluate or fetch the planted twin)

| ID | Rule | Rationale | Verification | Red/green | Sev | Floor / impl |
|---|---|---|---|---|---|---|
| **NIX-INP-09** | A flake whose build reads Git submodule content declares `inputs.self.submodules = true;`. A flake whose build reads LFS-tracked files declares `inputs.self.lfs = true;`. When the repo ships its own `flake.nix`, never tell its consumers to append `?submodules=1`. (Wrapping a repo that ships no flake is NIX-INP-14.) CI that exercises `self.lfs` clones over a real `https://` LFS remote. The Lix leg (NIX-GATE-16) passes `--extra-experimental-features flake-self-attrs`, per map E12. A flake that declares `self.lfs` marks that leg expected-fail with a comment naming Lix's missing `self.lfs`, and never drops the flag to pass it. | Without the flag, a consumer fetching by locked rev gets an **empty submodule directory**, or the **LFS pointer text** as file content: no eval error, wrong bytes at build time. Nix's LFS client speaks only the HTTP(S) batch API, so a `file://` remote fails with `uploading to '…' is not supported`. The flags exist since CppNix 2.27 (rl-2.27, PRs #12421, #10153/#12468). Lix 2.95.2 gates `self.submodules` behind `flake-self-attrs` and does not implement `self.lfs` (w3). | `test ! -f .gitmodules \|\| grep -rq 'self\.submodules' --include=flake.nix .` and `! grep -rqs 'filter=lfs' .gitattributes \|\| grep -rq 'self\.lfs' --include=flake.nix .`. Both exit 0 to pass. A `filter=lfs` hit whose files the build never reads is a reviewed exception, not a finding. | **Yes, on the mechanism.** 2.35.2 (dive): `submod-without` → `'…/sub/content.txt' does not exist`, exit 1; `submod-with` → `"sub-lib-content\n"`, exit 0; `lfs-without` → pointer text, exit 0 (wrong bytes); `lfs-with` smudges (`while smudging git-lfs file`). 2.31.5 (w3): identical outcomes, but the missing file reads `No such file or directory`. Lix 2.95.2 (w3): `submod-with` without the flag → `experimental Lix feature 'flake-self-attrs' is disabled`, exit 1, and with it → `"sub-lib-content\n"`, exit 0; `lfs-with` with the flag → `error: flake 'self' attribute 'lfs' is not supported`, exit 1. The HTTPS remote half was attempted: GitHub's LFS batch endpoint answered `HTTP error 429`, so it is **not completed**. | **MUST** | CppNix ≥2.27 (fleet floor 2.31.5 verified). Lix 2.95.2: submodules behind `flake-self-attrs`; `lfs` unsupported. |
| **NIX-INP-10** | No `builtins.fetchTree`/`fetchGit`/`fetchTarball`/`fetchurl` is reachable from a published flake's outputs. Declare the source as an input (`flake = false` for non-flakes) so the lock pins it and `nix flake update` moves it. Or fetch it inside a derivation with `pkgs.fetchurl`/`fetchFromGitHub` (a fixed-output derivation realized at build time). flake-compat `default.nix` shims are exempt. | An eval-time fetcher makes `nix flake show`/`check` network-bound, with nothing in `inputs` or `flake.lock` to warn a reviewer. `helix-editor/helix@079a789e8cb0:grammars.nix:35-46` runs one `builtins.fetchTree` per grammar (303), which is why helix's `show --all-systems` hit 300 s. helix has 2 inputs and 0 `flake = false` (shape §2). | `grep -rn -e 'builtins.fetchTree' -e 'builtins.fetchGit' -e 'builtins.fetchTarball' -e 'builtins.fetchurl' --include='*.nix' .`. Each hit outside a flake-compat shim is a finding. Behaviourally: `nix flake check --no-build .` must not download anything. | **Yes.** Planted `nix-inputs/eval-fetch-eager` (`builtins.fetchurl` from `http://127.0.0.1:9/…` inside `packages.default`): `nix flake check --no-build` exit 1, `error: unable to download 'http://127.0.0.1:9/grammar.tar.gz'`. Twin `eval-fetch-fod` (same URL via `pkgs.fetchurl`): exit 0, `all checks passed!`. The grep hits the eager twin only (this consolidation). | SHOULD (D: NIX-GEN-01 already makes eval-time data fetch a MUST) | any |
| **NIX-INP-13** | Run the CI eval step (`nix flake check --no-build`, `nix flake show`) with **`-v`**, under a wall-clock `timeout`, and timestamp each output line (`2>&1 \| awk '{print strftime("%s"), $0}'`). Report the largest gap between consecutive lines and the last line printed. A gap over 60 s is an **alarm** that names the stalled step for investigation. It never kills the job or fails it by itself. A slow flake whose `-v` output keeps moving is a scope problem: exclude heavy outputs such as `hydraJobs` from the check. Do not raise the timeout. | Wall time alone cannot separate a slow-but-live fan-out from a stall. Without `-v`, nix-installer's `hydraJobs.vm-test.*` evaluation looked silent for 300 s (wave-1 audit); with `-v` it prints continuously (max gap 34 s, w3). The alarm is not a hang proof, because the red twin is a single fetch that never returns. One legitimate fetch or IFD build over 60 s prints the same way, and that twin was not run (Verdict 10). | The command in the rule, then the max gap over consecutive timestamps. | **Yes** (w3 §1-2). Planted `hang/` (`builtins.fetchurl "http://10.255.255.1:1/blackhole"`): last line `evaluating file '«nix-internal»/derivation-internal.nix'` at `…171`, then nothing until `timeout 90` → exit 124, gap ≥89 s. Twin `fanout/` (six fetches from a local server sleeping 8 s each): `downloading` lines at `…118, 126, 134, 142, 150, 158`, exit 0, max gap 8 s. Real: nix-installer `@76f61b5202e2` max gap 34 s over 300 s, killed while progressing; helix and treefmt-nix pass warm (<20 s). | SHOULD (advisory) | any. Line wording is CppNix 2.35.2's. |

#### Check D — workflow reading (CI)

| ID | Rule | Rationale | Verification | Red/green | Sev | Floor / impl |
|---|---|---|---|---|---|---|
| **NIX-INP-11** | A and E flakes, and B flakes' test sub-flakes, refresh the lock **weekly** from a scheduled workflow that **opens a PR and never pushes**. The workflow runs `DeterminateSystems/update-flake-lock` or `nix flake update --commit-lock-file` plus a PR action, SHA-pinned (NIX-GATE-12), after CppNix installed per NIX-GATE-13. It uses a GitHub App or fine-grained token so the gate runs on the PR. D flakes bump their lock inside NIX-GEN-16's data PR. | Only 3/37 exemplars automate lock refresh (shape §9), which is why the median lock is 65 days old. update-flake-lock's own README examples use `@main` and `determinate-nix-action`, which conflicts with NIX-GATE-12 and 13. It also warns that without a personal token, CI does not run on its PR ("close and reopen the pull request manually to kick off CI", README §"Running GitHub Actions CI"). | `grep -rn -e 'schedule:' .github/workflows` alongside `grep -rn -e 'update-flake-lock' -e 'nix flake update' .github/workflows`: both are needed. `grep -rn -e 'secrets.GITHUB_TOKEN' <that workflow>` in the PR step is a finding. | No (needs GitHub; a reading heuristic) | SHOULD | Nix ≥2.19 |
| **NIX-INP-12** | For a flake consumed *as an input* by others (B, C, or a widely followed D), CONSIDER a CI leg that re-runs the gate with `--override-input nixpkgs github:NixOS/nixpkgs/nixpkgs-unstable`, as in `nix-community/fenix@5f7e7d793cb2:.github/workflows/ci.yml:16-24`. The override is never committed. Evaluate any flake you do not own at a full commit SHA with `--no-write-lock-file`. | It catches breakage against the consumer's newer nixpkgs, which is exactly what a follows exposes. It doubles build cost, so fleet A flakes, which are consumed as apps, skip it (dive §8). | `git diff --exit-code -- flake.lock` after the CI run must exit 0. | No (a cost judgement) | CONSIDER | any |
| **NIX-INP-14** | To consume a repo that ships **no `flake.nix`** and whose build needs its submodule or LFS content, declare it as a `flake = false` input with the `git+https:` (or `git+ssh:`) scheme, a full `rev`, and `submodules=1` and/or `lfs=1`, for example `git+https://github.com/<o>/<r>?rev=<40-hex>&submodules=1`. Never use `github:` for it. Once the upstream ships a flake that declares `inputs.self.submodules`/`lfs`, drop the parameters (NIX-INP-09). | A `github:` input is a tarball archive, and it carries neither submodule nor LFS content. w3 recorded `github:…?submodules=1` failing to parse (`unsupported parameter 'submodules'`). Without the parameter, the submodule directory is empty. grimoire (`grimoire-rs/grimoire@55f839ce31fb`) has two Cargo path-dependency submodules and no `flake.nix` today, so this is the only shape that can fetch its tree. | `grep -rn -e 'github:[^"]*[?&]\(submodules\|lfs\)=' --include='*.nix' .` must be empty. Behaviourally, read one file inside the submodule from the input and expect content, not an error. | **Yes** (w3 §4, real remote). `withSub` (`git+https://github.com/grimoire-rs/grimoire?rev=55f839ce…&submodules=1&shallow=1`) → `external/docker_credential/Cargo.toml` content `[package] name = "docker_credential"`, exit 0, on 2.35.2 and 2.31.5. `withoutSub` (same URL, no `submodules`) → exit 1: `'…/Cargo.toml' does not exist` (2.35.2), `No such file or directory` (2.31.5). The `github:` parse error is recorded in prose only; this revision's re-run was blocked, and the grep is a reading check. | SHOULD | any CppNix with `submodules` on `git+` (2.31.5 verified). Lix: see failure mode 13. |

**Rows dropped as rules**, and where each went:
- `nixConfig.warn-dirty = false` is inert without `accept-flake-config` (verified by the dive, #9885). It is already excluded by map conflict 7's `nixConfig` allowlist (Q12), so it is an AI-failure-mode entry here.
- The dirty-tree `git status --porcelain` check is NIX-FLK-16 / Q6.
- "Trust the flake-checker binary over its README" folded into NIX-INP-06.
- FOD-invariance under follows (dive rule 9) is a fact for NIX-GEN's README commitment, not a rule.
- M-B-15 (lock scaling past thousands of inputs) is moot, because generated packages are never inputs (map conflict 17).
- w3 candidate 5 ("curl the target's `.gitattributes` for `filter=lfs` before wrapping it") is failure mode 13, not a rule. The failure it guards depends on the host's git configuration and on Lix shelling out to `git`, and no red/green pair was run.
- w3 candidate 6 ("`self.*` is testable only on a repo with a `flake.nix`") is folded into NIX-INP-09's scope and NIX-INP-14.
- w3 candidate 1's "MUST always pass `-v`" became NIX-INP-13 at SHOULD, advisory (Conflicts resolved 12).

**MUST count: 4** (NIX-INP-04, 05, 07, 09). Each has a normative source (nix3-flake path semantics and rl-2.26; the rl-2611 deadline and #7422; flake-lock.md; rl-2.27) and a verification watched red.

### Consolidation verification runs (new, 2026-09-27)

```
# Q1 formulations over all 35 corpus locks (host jq 1.8.1), counts map / dive / nixpkgs-by-url:
DeterminateSystems/flake-checker 0/0/1   ghostty 0/0/1   home-manager 0/0/1   nixd 0/0/1
the-nix-way/dev-templates 0/0/1          nix-index 1/0/1  NixOS/nix 2/2/3      nix-installer 2/2/4
(all others agree; nixpkgs-terraform 3/3/3). Q1-transitive: nix-installer ["nixpkgs","nixpkgs-23-11","nixpkgs-regression"],
devenv ["nixpkgs-src"] (fork cachix/devenv-nixpkgs wraps it), all others [].
# self-follow cycle (nix-inputs/self-follow): 2.35.2 exit 1 / 2.31.5 exit 1 "follow cycle detected"; Lix 2.95.2 exit 1 "stack overflow (possible infinite recursion)"
# rev-in-url freeze: frozen-sha update exit 0 4e9a51a15ceb->4e9a51a15ceb ; tracked-branch update exit 0 4e9a51a15ceb->da67096a3b9b
# --update-input: Lix 2.95.2 exit 1 ; CppNix 2.31.5, 2.35.2 exit 0 + deprecation warning
# B shape: lib-with-nixpkgs has("nixpkgs") true ; lib-nixpkgs-lib-input false ; lib-zero-inputs no lock
# eval-time fetcher: eval-fetch-eager `nix flake check --no-build` exit 1 "unable to download" ; eval-fetch-fod exit 0
# local-input jq: consumer-nofollows ["a","b","c"] ; monorepo [] ; indirect jq: indirect-input {"nixpkgs":"tarball"} ; consumer-follows []
```

### Wave-3 fold (runs recorded in verification-rerun-w3.md; not re-run here)

```
# revision re-run attempt, 2026-09-27: run.sh nix --version
#   bwrap: Can't find source path …/nix-tools/.nix-portable/emptyroot: No such file or directory   EXIT 1  (blocked; fixtures/ also absent)
# §1-2 watchdog (INP-13): hang/ last line …171, killed by timeout 90 EXIT 124 (gap >=89 s) ; fanout/ 8 s gaps EXIT 0
#      nix-installer@76f61b5202e2 -v: max gap 34 s, killed at 300 s while "checking Hydra job 'hydraJobs.vm-test…'"
# §2 #14339 (INP-08): follows removed -> dep/nixpkgs rev 55b95f2f… (drifted B) ; override restore -> rev 9ca31cb2… + narHash r7OCel… (exact)
# §3 INP-09: 2.31.5 == 2.35.2 (submod-without "No such file or directory"); Lix submod-with needs flake-self-attrs, lfs-with "attribute 'lfs' is not supported"
#      HTTPS LFS (microsoft/vscode-docs ?lfs=1): "unable to upload '…/info/lfs/objects/batch': HTTP error 429"   (not completed)
# §4 INP-14: grimoire-rs/grimoire@55f839ce31fb withSub EXIT 0 (real Cargo.toml) / withoutSub EXIT 1, on 2.35.2 and 2.31.5 ; Lix clone "smudge filter lfs failed" EXIT 1
# §5 lazy fetch: root inputs of the locking flake are fetched at lock ("using revision … of repo '…/unused-src'") -- does NOT answer M-B-17 (Conflicts resolved 10)
# §6 INP-02/04: test/ path:.. -> "test-sees-root-value" EXIT 0 on 2.35.2 and 2.31.5 ; grep 'path:\.\./' prints nothing
```

## Applied to the exemplars and the future consumers

**Already satisfied (strict exemplars).**
- NIX-INP-02:
  - `ipetkov/crane@73b980519cef`: zero-input root; tests in `test/flake.nix`, driven by `--override-input crane ./.` and `--reference-lock-file ./test/flake.lock` (`.github/workflows/test.yml:133-134`).
  - `hercules-ci/flake-parts@31729ca8cbdb:flake.nix:5`: `nixpkgs-lib` only.
- NIX-INP-01: `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix:11` ("Omitting `inputs.nixpkgs.follows` on purpose") and `:16-23` (follows where the input is used only for static binaries, with the reason written) is the comment form this rule asks for.
- NIX-INP-06:
  - `numtide/llm-agents.nix@efb10f28f724`: lock 0 days old.
  - 11/36 are flake-checker clean (runs Axis 4).
- NIX-INP-05: `ghostty-org/ghostty@b40acce58dcf:flake.nix:12` and `nix-community/home-manager@7b4c5ec4beda:flake.nix:4` already use `.tar.zst`.
- NIX-INP-11: flake-checker, nix-installer and crane run a scheduled update workflow (shape §9).
- NIX-INP-12: fenix's override leg.
- NIX-INP-13: helix and treefmt-nix pass the warm `-v` run, and sxyazi/yazi and direnv/direnv are slow but progressing (runs Axis 2).
- NIX-INP-09 / 14: no corpus repo uses submodules or LFS. Evidence is the fixtures plus grimoire's real remote.

**Violated (prominent exemplars).**

| Rule | Where | What |
|---|---|---|
| 02 | `NixOS/nix@209d2bc44288:flake.nix:6-7` | test-only `nixpkgs-regression`/`nixpkgs-23-11` in the root flake. Measured leaking into `DeterminateSystems/nix-installer@76f61b5202e2:flake.lock` via `nix` |
| 05 | `NixOS/nix@209d2bc44288:flake.nix:4`, `nix-community/nixd@77bb1cacfa8a:flake.nix:3` | `channels.nixos.org/…/nixexprs.tar.xz` (the input-types dive named only NixOS/nix. A corpus re-grep added nixd) |
| 05 | `nix-community/nix-index@dd6792b23059:flake.nix:5` | indirect `nixpkgs/nixos-unstable`, locks to a `tarball` |
| 03 | `nix-community/nix-vscode-extensions@329083cd32e0:flake.nix:8` | `nixpkgs.url = "github:nixos/nixpkgs/0c2094806c9e…"`, a live nixpkgs frozen in `url` with no comment (lock 68 days) |
| 06 | `numtide/blueprint@8be75245e274` (566 days), `oxalica/rust-overlay@4e9bb05a9ab6` (531), `cachix/devenv@6d76db3889de` (`rolling` fork, >30 days, non-upstream owner: all three findings) | stale or unsupported nixpkgs (shape §2, runs Axis 4) |
| 10 | `helix-editor/helix@079a789e8cb0:grammars.nix:35-46` | 303 eval-time `builtins.fetchTree` calls reachable from `packages.<system>.helix` |
| 13 | `DeterminateSystems/nix-installer@76f61b5202e2` | `nix flake check` walks `hydraJobs.vm-test.*` and exceeds 300 s while progressing (max gap 34 s). This is a scope finding, not a hang |
| out of family (map conflict 7, Q13) | `ipetkov/crane@73b980519cef:.github/workflows/test.yml:104` | CI passes `--accept-flake-config`. The exemplar for NIX-INP-02 violates NIX-SEC |

**New commitments.**
- **Fleet A flakes (`ocx`, `grimoire`, `ocx-sdk-python`)**:
  - The root takes `nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"` plus `flake-compat` as a `flake = false` input (NIX-REL-05; map E22). The lock has 3 nodes and Q1-transitive gives `[]`. Whether the flake-compat node costs flake consumers a fetch is M-B-17.
  - Any dev-only tool comes from that nixpkgs, never from a second input.
  - Weekly update PR (11). The README says a consumer who follows nixpkgs builds against a nixpkgs this flake did not test (NIX-REL-09's wording). There is no author cache (owner Q2), so cache hits are not the cost (map E17).
  - **grimoire** (remote `grimoire-rs/grimoire`, not `ocx-sh/grimoire`): its `flake.nix` declares `inputs.self.submodules = true`, because `external/docker_credential` and `external/rust-oci-client` are Cargo path dependencies (09). Its LFS files (`assets/logo.png`, `docs/public/favicon.png`, `docs/public/og-card.png`) are not read by the build (`src/skill/skill_package.rs` names `logo.png` only as a packaged filename). So no `self.lfs` is declared, and the Lix leg stays runnable with `flake-self-attrs`. Until grimoire ships that flake, a wrapper uses NIX-INP-14's form.
- **ocx generated flake (`ocx-sh/ocx-nix`, D)**:
  - Root `nixpkgs` from `github:` on `nixos-unstable` (05, 06), so flake-checker runs (NIX-GATE-11).
  - The index data is committed per NIX-GEN-01, never an eval-time fetch (10) and never a `flake = false` index input read at eval time.
  - The README documents that following its nixpkgs is safe, because layer FODs are invariant: `fod.outPath` was identical with and without follows, and only the wrapper's drvPath moved (dive §6).
  - The lock bump rides the NIX-GEN-16 PR.
  - Its eval step runs under NIX-INP-13. At 1,720 indexes, a flat `-v` stream is the expected green shape.
- **A future B/C fleet flake (a `setup-ocx`-style Nix module, if owner Q7 changes)**: 02 and 12 apply.
- **General adopter**: 03-05, 07, 09 and 14 are the portable core.

## AI-agent failure modes

Ranked by how often each bites an agent working on a flake.

1. **It adds `inputs.<x>.inputs.nixpkgs.follows = "nixpkgs"` to every input as hygiene**, including cache-backed ones such as nixpkgs-python or a `-bin` flake. Check: Q1-transitive, plus a follows on an input whose README forbids overriding (NIX-INP-01).
2. **It runs `nix flake lock` (or nothing) after editing a local `path:` library, then debugs the consumer against stale code.** Check: the `narHash` of the `path:` node must change after `nix flake update <x>` (NIX-INP-07).
3. **It writes `nix flake lock --update-input x` from pre-2023 muscle memory.** CppNix only warns, so the agent never notices, but the Lix leg fails. Check: the `--update-input` grep (NIX-INP-07).
4. **It "pins for reproducibility" by writing a rev into `url`, then reports `nix flake update` as done.** Check: the `original.rev` jq (NIX-INP-03).
5. **It commits a lock with `path:/home/<user>/…` or `git+file:` left over from local development.** Check: the local-input jq (NIX-INP-04).
6. **It copies `channels.nixos.org/…/nixexprs.tar.xz` from NixOS/nix's own `flake.nix`**, or writes `nixpkgs.url = "nixpkgs/…"`, and describes it as "GitHub". Check: the indirect jq plus the `.tar.xz` grep (NIX-INP-05). Reason about the fetch from `locked.type`, not `original.type`.
7. **It gives a library flake a full `nixpkgs` input plus flake-utils and a test nixpkgs at the root**, so every consumer inherits them. Check: `has("nixpkgs")` on a B flake (NIX-INP-02).
8. **It kills or "fixes" a slow `nix flake check` without `-v`**, calling it hung, or it quietly raises the timeout. nix-installer looked silent for 300 s and was progressing all along. Check: re-run with `-v` and timestamps. A moving stream means the check needs a narrower scope (NIX-INP-13).
9. **It reads flake-checker's exit 0 as clean**, or takes its crash on a nixpkgs-less lock as a finding and "fixes" it by adding a nixpkgs input. Check: `--fail-mode` plus the stderr grep (NIX-INP-06, NIX-GATE-11).
10. **It trusts a remembered error string.**
    - `points outside of its parent's store path` (2.20.6) became `access to absolute path '…' is forbidden in pure evaluation mode` (2.31.5, 2.35.2).
    - A missing submodule file reads `does not exist` on 2.35.2 and `No such file or directory` on 2.31.5.
    - The "follow cycle segfaults Nix" story is historical on CppNix but still shows up as `stack overflow` on Lix.
    - Check: diagnose by the input's *shape* (NIX-INP-04, 08, 09).
11. **It removes a `follows` and commits the re-lock unread.** The dependency's nixpkgs silently jumps to today's branch tip (#14339, reproduced). Check: compare the rev with `nix flake metadata <dep-ref>` and restore with `--override-input` (NIX-INP-08).
12. **It tells users `?submodules=1`** when the repo ships a flake, instead of declaring `inputs.self.submodules`. Or it writes `github:o/r?submodules=1` for a non-flake repo. Or it "fixes" a `self.lfs` failure against a local `file://` mirror, or on Lix, by deleting the flag. Check: the `.gitmodules`/`.gitattributes` greps (NIX-INP-09) and the `github:…submodules=` grep (NIX-INP-14). On Lix, `self.lfs` is unsupported, so mark the leg expected-fail.
13. **It debugs the wrong thing when a Lix fetch of a third-party repo fails with `smudge filter lfs failed`.** grimoire's incidental LFS `assets/logo.png` broke Lix's `git` clone of the repo on a host whose global git config has an LFS filter. The error names neither submodules nor the file the agent wanted (w3 §4). Check: `curl -sL https://raw.githubusercontent.com/<o>/<r>/<rev>/.gitattributes | grep -i lfs` before wrapping a repo. A hit means plan for LFS on Lix and CI hosts, whatever files you read. This is a reading heuristic, not red/green.
14. **It claims an unreferenced input is "free", or that it "costs every consumer a fetch", without separating the flake that declares it from a consumer that inherits it through a lock.** The declaring flake fetches at lock time (measured). The consumer case is unmeasured (M-B-17). Check: cite which case was measured.
15. **It hides a fetch-heavy dependency in a `builtins.fetchTree` loop**, so `inputs` looks small while `show` and `check` crawl. Check: the builtin-fetcher grep plus `nix flake check --no-build` with no downloads (NIX-INP-10).
16. **It sets `nixConfig.warn-dirty = false` to quiet dirty-tree warnings.** The setting is inert without `accept-flake-config` (#9885, verified). Check: map conflict 7's Q12 allowlist.

## Conflicts resolved

1. **Q1's formulation.**
   - The map's Q1 (`locked.repo == "nixpkgs" or original.id == "nixpkgs"`) and the follows dive's filter (`original.type == "github" and original.repo == "nixpkgs"`) both miss FlakeHub and channel tarballs. The dive's filter also misses indirect inputs.
   - Over 35 locks, they report 0 nixpkgs for 5 flakes that have one, and give nix-installer 2 where the lock has 4.
   - This also explains the shape-vs-runs discrepancy: shape §2 counted 2 for nix-installer and Axis 1 counted 4. Axis 1's "nixpkgs-shaped" count also caught `nixpkgs-lib` (nixd 2), which is not a nixpkgs.
   - **Resolved:** match on repo, id *or* URL, and list only transitive nodes (Q1-transitive).
2. **`--update-input` "gone since 2.19"** (map M-B-06, conflict 15).
   - Measured: CppNix 2.31.5 and 2.35.2 accept it as a deprecated alias (exit 0). Lix 2.95.2 rejects it (exit 1).
   - **Resolved:** it stays a MUST, because Lix rejects it and CppNix deprecates it. This is not based on CppNix removing it (map: no conflict with GATE-16's advisory Lix leg).
3. **#5393 as a live guard** (map M-B-12) vs "fixed" (the follows dive).
   - Measured: the cycle is a clean error on CppNix 2.31.5 and 2.35.2, and a `stack overflow` on Lix 2.95.2.
   - **Resolved:** fixed on CppNix, still a poor diagnostic on Lix. NIX-INP-08 keeps the re-lock-and-read-the-diff habit.
4. **Pin revs in `url`** (follows dive, rule 3) vs a branch in `url` (NIX-FLK skeleton A).
   - Measured: a rev in `url` freezes `nix flake update`.
   - **Resolved:** branch in `url`, lock as the pin, rev only for deliberately frozen inputs (NIX-INP-03). w3's #14339 reproduction is the known cost, and NIX-INP-08 guards it.
5. **The cross-repo sibling "fix"** (input-types dive: absolute `path:` or `git+file:?rev=`) vs publishability.
   - **Resolved:** both are local-development-only, through `--override-input`. A committed lock never holds them (NIX-INP-04).
6. **helix "~100 flake = false tree-sitter inputs"** (map M-B-08, runs smell 6 and Axis 1 "metadata timed out") vs shape §2 (2 inputs, 0 `flake = false`) and the input-types dive (303 eval-time `fetchTree` calls; `metadata` takes 0.18 s warm).
   - **Resolved:** the cost comes from eval-time fetchers, not inputs (NIX-INP-10). The Axis 1 timeout came from wave 1's store contention (frame correction M1).
7. **update-flake-lock's README shape** (`@main`, Determinate installer, a personal token) vs NIX-GATE-12 and 13 and NIX-GEN-16.
   - **Resolved:** SHA-pinned, CppNix installer, and an App or fine-grained token (NIX-INP-11).
8. **flake-checker's README vs its binary branch list.** The binary wins, confirmed again (NIX-INP-06).
9. **Follows as hygiene (H2) vs the manual and nixpkgs-python.** Map conflict 3's resolution is kept and made concrete as NIX-INP-01's consumption rule, with a justification comment.
10. **w3 "NIX-INP-02 upgrades to MUST" (M-B-17 "answered") vs what its fixture measured.**
    - `lazy-fetch2/producer` declared `used` and `unused` as *root* inputs of the flake being locked. That flake must fetch them to compute their `narHash`.
    - Its `nix path-info` proof ran after `nix eval .#unusedPath`, an output that forces the path.
    - The question M-B-17 asks is different: does a *consumer* locking against a dependency's existing lock fetch the dependency's never-accessed node (nix-installer's `nixpkgs-regression`, REL-05's flake-compat)?
    - Reading CppNix's `lockFlake`, entries copied from an existing lock are not refetched, and `call-flake.nix` fetches inputs lazily. That predicts "no fetch", but it is unverified.
    - **Resolved:** NIX-INP-02 stays SHOULD. M-B-17 goes back to Open questions with a fixture that isolates the consumer case.
11. **"nix-installer and treefmt-nix hang silently"** (input-types dive §9, runs Axis 2) vs w3 (nix-installer under `-v` prints continuously, max gap 34 s).
    - **Resolved:** nix-installer is a large `hydraJobs` workload, not a hang. The silence was most plausibly the default verbosity. treefmt-nix now passes warm in under 20 s, so its cold silence is unexplained and not re-examined.
12. **w3 "CI MUST always pass `-v` and fail on a 60 s gap"** vs its own evidence (the red twin is a single never-ending fetch, which a single long legitimate fetch would imitate).
    - **Resolved:** NIX-INP-13 is SHOULD and advisory. The gap is an alarm that names the stalled step, not a kill.
13. **Map E12 (GATE-16's Lix leg vs `inputs.self.*`)** and w3's Lix `self.lfs` result.
    - **Resolved:** the Lix leg adds `--extra-experimental-features flake-self-attrs` (GATE-16 keeps the leg). A flake with `self.lfs` marks that leg expected-fail and keeps the flag (NIX-INP-09).
14. **Map E23 (INP-02's `path:..` vs INP-04's "only `path:./sub`")**. w3 §6 measured the parent form on 2.31.5 and 2.35.2 and found the grep silent on it.
    - **Resolved:** NIX-INP-04 now reads "a relative `path:` that stays inside the flake's own git tree".
15. **Map E17, E18, E20, E22 applied.**
    - E17: the Applied wording drops "cost of cache hits" in favour of NIX-REL-09's "untested nixpkgs".
    - E18: NIX-INP-05's FlakeHub clause defers to NIX-REL-06.
    - E20: NIX-INP-07's grep keeps only `--update-input` and `--recreate-lock-file`.
    - E22: the fleet skeleton takes nixpkgs plus flake-compat.
16. **w3's `github:` rejection string** (`path URL '…' has unsupported parameter 'submodules'`). "path URL" is the path fetcher's wording, not the GitHub fetcher's, so the string is suspect.
    - **Resolved:** the mechanism stands, because `github:` inputs are tarball archives without submodule or LFS objects. NIX-INP-14 keys on the input's shape, never on that string.
17. **`nix-packaging.md`'s grimoire remote `ocx-sh/grimoire`** vs measured `grimoire-rs/grimoire` (map (d), w3 §4: `ocx-sh/grimoire` is a 404).
    - **Resolved here** for NIX-INP's Applied text. The packaging file's own citation is its owner's to fix.

## Open questions

**Owner decisions (defaults applied).**
- Weekly lock-bump token: the default reuses NIX-GEN-16's GitHub App for fleet A flakes. The fallback is a fine-grained PAT scoped to `contents` and `pull-requests`.
- Branch for fleet A flakes: the default is `nixos-unstable`. Stable `nixos-26.05` is chosen only if a CLI promises NixOS-release compatibility, which none does today.
- The nixd and NixOS/nix `.tar.xz` findings are upstream. The default is no upstream PR from this program.

**Another research round.**
- **Lazy fetch of an inherited lock node (inputs-lock, M-B-17).** This sets NIX-INP-02's severity and NIX-REL-05's flake-compat cost. The fixture:
  1. Give a dependency a declared, never-accessed input (`flake = false` and a flake variant) whose hand-written lock entry points at `http://127.0.0.1:9/…` with a fake `narHash`.
  2. Lock and evaluate a consumer of that dependency. Success means the node was never fetched.
  3. The twin consumer output that accesses the input must fail `unable to download`.
  4. Run it on CppNix 2.35.2, 2.31.5 and Lix 2.95.2.
- **Watchdog false positive (checks-ci, M-F-18).** Does a single legitimate fetch or IFD build longer than 60 s red NIX-INP-13's gap check? Plant a local server that sleeps 90 s and then serves a correct FOD. The result decides whether the alarm can ever become a gate.
- **`self.lfs` over a real HTTPS LFS remote (inputs-lock).** Retry off the rate-limited egress IP, or against an owner-provided repo that carries a `flake.nix` with `inputs.self.lfs = true` and real LFS content.
- **Lix tracking (impls).** Lix fails a follow cycle with a stack overflow, lacks `self.lfs`, and its stabilisation proposal wants to drop follows (M-B-13). Re-check at each Lix release.
- **Toolchain.** The shared store under `nix-tools/.nix-portable` and `fixtures/` were missing at this revision. Every row above needs it restored before any re-run.

## Sub-artifacts

- [nix-inputs/follows-and-lock-hygiene.md](nix-inputs/follows-and-lock-hygiene.md) covers:
  - the follows-by-consumption table
  - lock non-deduplication (4 vs 1 nodes)
  - #5393 and #14339 fixtures
  - `lock` vs `update` and the `path:` staleness
  - flake-checker's CEL condition and binary-vs-README drift
  - FOD invariance under follows
  - the B-shape locks and fenix's override leg
- [nix-inputs/input-types-and-sources.md](nix-inputs/input-types-and-sources.md) covers:
  - URL schemes and corpus counts
  - `self.submodules` and `self.lfs` fixtures
  - same-tree vs cross-repo `path:` on 2.35.2 and 2.31.5
  - the 2.26 lock break, indirect → tarball, and dirty trees
  - the inert `warn-dirty`
  - the eval budget, including helix's 303 fetchers
- [nix-inputs/verification-rerun-w3.md](nix-inputs/verification-rerun-w3.md) covers:
  - the timestamped `-v` watchdog: hang and fan-out twins, plus nix-installer
  - #14339 re-derived on a floating ref, and the exact restore
  - `self.submodules`/`self.lfs` on 2.31.5 and Lix
  - grimoire's real remote: submodules by rev, no `flake.nix`, and incidental LFS
  - a lazy-fetch fixture (root-input case only)
  - `path:..` from `test/`

## Revision log

- 2026-09-27, NIX-INP-02: Red/green adds the w3 `path:..` sub-flake run, and the text names `path:..` as a sub-flake option. The severity **stays SHOULD**. w3's MUST upgrade was rejected because its fixture measured the declaring flake's root inputs and an eval-forced path, not a consumer's inherited node (Conflicts resolved 10).
- 2026-09-27, NIX-INP-03: rationale now cites #14339 as reproduced (w3), replacing "read from the issue".
- 2026-09-27, NIX-INP-04: text changed in place per map E23. "Only same-tree `path:./sub`" became "a relative `path:` that stays inside the flake's own git tree", because w3 measured `path:..` from `test/` on 2.31.5 and 2.35.2 and the grep does not flag it.
- 2026-09-27, NIX-INP-05: the FlakeHub clause and its grep move to NIX-REL-06 (map E18). A pointer to NIX-INP-14 is added for inputs that need submodules or LFS. It stays a MUST.
- 2026-09-27, NIX-INP-07: grep and text drop `nix profile install`/`nix-env -i` (map E20; NIX-REL-09 owns README install wording). The Lix leg is described as advisory (owner Q6).
- 2026-09-27, NIX-INP-08: Red/green upgraded from "read from #14339's repro" to watched. w3 reproduced the floating-ref drift and confirmed the `--override-input` restore is exact on rev and narHash.
- 2026-09-27, NIX-INP-09: this rule **overclaimed implementation parity**, and that is fixed in place. Lix 2.95.2 needs `flake-self-attrs` for `self.submodules` (map E12) and has no `self.lfs` at all. The rule now prescribes the flag and an expected-fail Lix leg for `self.lfs`. It is scoped to repos that ship a `flake.nix` (the non-flake case moves to 14). It gains a reviewed exception for LFS files the build never reads. 2.31.5 is verified. The HTTPS half is recorded as attempted and blocked by HTTP 429.
- 2026-09-27, NIX-INP-13 (new): an eval-budget line-gap watchdog on `-v` output. It is SHOULD and advisory, from w3 §1-2 (red on the hang twin, green on the fan-out twin). It is demoted from w3's proposed MUST because the red twin cannot be told apart from one long legitimate step.
- 2026-09-27, NIX-INP-14 (new): wrap a non-flake repo that needs submodules or LFS as a `git+https:` `flake = false` input with a `rev` and `submodules=1`, never `github:`. Watched on grimoire's real remote on 2.35.2 and 2.31.5.
- 2026-09-27, Verdict: items 3, 4, 5, 6 and 7 amended. Items 9 (submodules and LFS across implementations, with two documented gaps) and 10 (the eval-budget watchdog, with one documented gap) are new. The shape bindings are renumbered to 11 and gain 13 and 14.
- 2026-09-27, Applied: fleet skeleton is now nixpkgs plus flake-compat (E22). The follow wording follows NIX-REL-09 (E17). grimoire's remote is corrected to `grimoire-rs/grimoire`, with its submodule/LFS commitment. D takes NIX-INP-13. nix-installer is listed under 13 as a scope finding.
- 2026-09-27, AI failure modes: added 8 (killing a slow check without `-v`), 11 (#14339), 13 (incidental LFS on Lix clones) and 14 (the fetch-cost claim without the root-vs-inherited split). Items 10 and 12 are extended. The list is renumbered.
- 2026-09-27, Open questions: removed #14339 (answered) and the eval-budget watchdog (answered; its residual false-positive question is re-commissioned). Removed the `self.lfs` on 2.31.5 and Lix question (answered; the Lix gap is in Verdict 9). The HTTPS half stays open as a gap plus a retry. M-B-17 is kept with a corrected fixture design. The toolchain blocker is recorded.
- 2026-09-27, frontmatter: consolidates now lists `nix-inputs/verification-rerun-w3.md`, M-B-17, M-F-18 and map E12/E17/E18/E20/E22/E23, and the `revised:` key is added.

## Key sources

- https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md: flake reference types, the same-tree rule for `path:`, the "usually irrelevant" follows passage, and the `nixConfig` allowlist
- https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake-lock.md: "already up-to-date … not modified"
- https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/libfetchers/git.cc: `lfs` defaults to false; `lfs`, `submodules`, `shallow` and `exportIgnore` are the git fetcher's attributes (w3)
- https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.26.md: relative `path:` inputs and the lock-format break
- https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.27.md: `inputs.self.submodules` and `inputs.self.lfs`
- https://github.com/NixOS/nixpkgs/blob/master/doc/release-notes/rl-2611.section.md: the `nixexprs.tar.xz` end date
- https://github.com/NixOS/nix/issues/14339: removing a follows ignores the dependency's lock (reproduced in w3)
- https://github.com/NixOS/nix/issues/5393: the follow-cycle segfault, now fixed on CppNix
- https://github.com/NixOS/nix/issues/7422: registry-indirect inputs as mutable global state
- https://github.com/NixOS/nix/issues/10815: dirty `git+file:` inputs refused at lock time
- https://github.com/NixOS/nix/issues/9885: `warn-dirty` inert in `nixConfig`
- https://fzakaria.com/2026/08/31/how-safe-is-follows: 3,261 nixpkgs revisions in 10,754 flakes, and revision age as the safety signal
- https://github.com/cachix/nixpkgs-python/blob/main/README.md: "Do not override the `nixpkgs` input"
- https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md: the CEL condition and the branch list
- https://raw.githubusercontent.com/DeterminateSystems/update-flake-lock/main/README.md: the weekly-PR shape and the note that CI does not run without a personal token
- https://github.com/nix-community/fenix/blob/5f7e7d793cb2553410f857554de86f277ebe2f71/.github/workflows/ci.yml: `--override-input` as a CI test leg
- `git ls-remote https://github.com/grimoire-rs/grimoire.git` → `55f839ce31fb…` (w3): grimoire's real remote, with `.gitmodules` and no `flake.nix`
