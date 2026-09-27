---
title: Inputs and the Lock
summary: The NIX-INP family, owning how a flake declares, follows, pins and refreshes its inputs, what its committed flake.lock may hold, and how submodule, LFS and eval-time fetches reach the build
---

# Inputs and the Lock

Measured 2026-09-27 on CppNix 2.35.2, nixpkgs 26.11pre `8d5d2709`; floor `nix_2_31` = 2.31.5; Lix 2.95.2; nixfmt 1.5.0, deadnix 1.3.2, flake-checker 0.2.15.

Owns the input graph: which inputs follow the root `nixpkgs`, what a `url`
names and what the lock pins, which local and indirect inputs a committed
`flake.lock` may never hold, how the lock is moved and refreshed, and how
submodule, LFS and eval-time fetches reach a build. The shape of `flake.nix`
outputs and the `git add` discipline are `NIX-FLK`. The gate block, the
flake-checker crash classification, action pinning, the installer and the
implementation legs are `NIX-GATE`. FlakeHub, flake-compat and README install
wording are `NIX-REL`. A generated flake's committed data and its update PR are
`NIX-GEN`. `nixConfig`, evaluating a flake you do not own and the lock-bump
owner diff are `NIX-SEC`. Fetchers inside a derivation are `NIX-PKG`.

Contents: [Dates and Floors](#dates-and-floors) · [The Lock Graph](#the-lock-graph) ·
[Moving the Lock](#moving-the-lock) · [What the Fetch Reads](#what-the-fetch-reads) ·
[Lock Refresh in CI](#lock-refresh-in-ci) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

- **Implementations.** CppNix is gated, Lix is an advisory leg, and Determinate Nix is untested but never deliberately broken (**pinned** default, NIX-GATE-16). CppNix 2.31.5 behaves like 2.35.2 on every row here unless the row says otherwise.
- **Floors.** A relative `path:` input needs Nix 2.26 (its lock format adds `"parent": []`, which older Nix cannot parse). `inputs.self.submodules` and `inputs.self.lfs` need CppNix 2.27. `nix flake update <input>` needs 2.19. All sit below the consumer floor, which is **pinned** to NIX-GATE-16's computed floor (today `nix_2_31` = 2.31.5) and never hardcoded.
- **Lix 2.95.2 gaps** (re-check at each Lix release): it rejects `--update-input` with exit 1, accepts `inputs.self.submodules` only with `--extra-experimental-features flake-self-attrs`, has no `inputs.self.lfs` at all (`error: flake 'self' attribute 'lfs' is not supported`), and reports a follow cycle as `error: stack overflow (possible infinite recursion)`.
- **Pinned defaults** an adopter overrides once: the root `nixpkgs` tracks `nixos-unstable` (stable `nixos-26.05` only for a flake that promises NixOS-release compatibility). The lock refreshes weekly through a PR a human merges, opened under a GitHub App token (fallback: a fine-grained token scoped to `contents` and `pull-requests`). No FlakeHub input (NIX-REL-06).
- **Shapes.** A app or CLI, B library, C module set, D generated, E template (ships lockless). Each Severity cell names the shapes it binds.
- Every command runs from the flake root. The update-alias grep excludes `.claude`, where an installed copy of these rules names both flags: replace it with the directory your agent client installs rules and skills into. Each command was watched red on a planted violation and green on its twin on 2026-09-27 (CppNix 2.35.2, warm store, jq 1.8.1), and the Verification cell says where the evidence is older.

## The Lock Graph

```sh
# Q1-transitive (NIX-INP-01): prints the transitive nixpkgs nodes. `[]` is the pass.
jq -c '((.nodes.root.inputs // {}) | [.[] | strings]) as $d
  | [.nodes | to_entries[] | select(.key != "root" and ((.key | IN($d[])) | not))
     | select(((.value.original.repo // .value.locked.repo // "") | ascii_downcase) == "nixpkgs"
              or .value.original.id == "nixpkgs"
              or ((.value.original.url // "") | test("nixos\\.org/(nixpkgs|nixos-)|flakehub\\.com/f/(pinned/)?NixOS/nixpkgs/"; "i")))
     | .key]' flake.lock
# lib-root (NIX-INP-02): `false` is the pass, `true` the finding. No flake.lock after `nix flake lock` means zero inputs, a pass.
jq '(.nodes.root.inputs // {}) | has("nixpkgs")' flake.lock
# frozen-rev (NIX-INP-03): `[]` is the pass. Each printed name needs a frozen-on-purpose comment.
jq -c '[.nodes.root.inputs[]? | strings] as $d | [.nodes | to_entries[] | select((.key | IN($d[])) and .value.original.rev != null) | .key]' flake.lock
# local-input (NIX-INP-04): `[]` is the pass.
jq -c '[.nodes | to_entries[] | select((.value.original.type == "git" and ((.value.original.url // "") | startswith("file:"))) or (.value.original.type == "path" and ((.value.original.path // "") | startswith("/")))) | .key]' flake.lock
# cross-tree (NIX-INP-04): candidates to read. Empty output (exit 1) is the pass. A hit passes when the path resolves inside the repository's git tree and is the finding when it leaves it.
grep -rn -e 'path:\.\./' --include='*.nix' .
# indirect (NIX-INP-05): `true` with exit 0 is the pass, `false` with exit 1 the finding.
jq -e '[.nodes[] | select(.original.type == "indirect")] | length == 0' flake.lock
# tar-xz (NIX-INP-05): empty output (exit 1) is the pass.
grep -rn -e 'nixexprs\.tar\.xz' --include='*.nix' .
# flake-checker (NIX-INP-06): exit 0 passes. Exit 1 is a finding unless stderr holds `Error: Invalid(` or `Error: FlakeLock(`, which is a crash (NIX-GATE-11).
flake-checker --no-telemetry --fail-mode --condition "numDaysOld < 30 && ((gitRef == '' && owner == '') || (supportedRefs.contains(gitRef) && owner == 'NixOS'))" flake.lock
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-INP-01 | Decide `inputs.helpers.inputs.nixpkgs.follows = "nixpkgs"` by how the input is consumed. Follow when it is a library, module or overlay you compose against your own `pkgs`. Do not follow when you take its `packages` from its author's cache, and put a one-line comment at the input saying so. Never follow an input whose README forbids overriding its nixpkgs (nixpkgs-python does). After every lock change, every node Q1-transitive prints is removed by a follows or justified by such a comment. | A reflexive follows on a cache-backed input turns every cache hit into a local rebuild. A missing follows on a library puts a second nixpkgs in the lock, and `flake.lock` never deduplicates by content (three inputs on one byte-identical rev gave 4 nixpkgs nodes). The Nix manual calls a transitive nixpkgs "usually irrelevant" for modules and overlays, so follows is a consumption decision, not hygiene. | Q1-transitive, then read each printed node's input for a follows or a comment. Watched red on a lock with an unfollowed library and a channel-tarball nixpkgs (`["nixpkgs_2","nixpkgs_3"]`), green on the followed twin (`[]`). It matches nixpkgs by repo, registry id or URL, so FlakeHub and `channels.nixos.org` nodes count. | SHOULD (A-D) | any |
| NIX-INP-02 | A B flake's root takes zero inputs (functions take `pkgs`) or only `nixpkgs-lib`, and a C flake's modules use the consumer's `pkgs` module argument. Test and dev inputs (a second nixpkgs, rust-overlay, advisory-db, flake-utils) live in a sub-flake such as `test/flake.nix`, which CI drives with `--override-input` pointing the library at `./.` or which takes the parent as `inputs.lib.url = "path:..";` (NIX-INP-04). | Every root input of a flake consumed as an input becomes a lock node in every consumer. NixOS/nix's test-only `nixpkgs-regression` and `nixpkgs-23-11` sit in nix-installer's lock through its `nix` input. crane is the fix: an empty root lock and tests in `test/flake.nix`. Whether a consumer also fetches the inherited node is unmeasured, which keeps this a SHOULD. | lib-root on a flake that exports no `packages` and no `apps` (shape B or C, NIX-CORE-05). Watched red on a library lock with a root `nixpkgs` (`true`), green on the `nixpkgs-lib` twin (`false`). The `path:..` sub-flake evaluates on 2.35.2 and 2.31.5 (research rerun, 2026-09-27). | SHOULD (B, C) | any. A `path:` sub-flake needs 2.26. |
| NIX-INP-03 | Name a branch or tag in each input's `url` (`github:NixOS/nixpkgs/nixos-unstable`) and let `flake.lock` carry the rev. Put a 40-hex rev in `url` only for an input frozen on purpose, such as a regression baseline or a NIX-INP-14 wrap, with a comment saying so. | A rev in `url` makes `nix flake update systems` exit 0 with the rev unchanged, so the lock never refreshes, flake-checker's 30-day bar fails forever, and an agent reports the update as done. The cost of branch refs is the follows-removal drift that NIX-INP-08 guards. | frozen-rev. Watched red on a rev in `url` (`["systems"]`), green on the branch twin (`[]`). The update freeze itself was watched on 2.35.2 in research (rev `4e9a51a15ceb` unchanged versus moved). | SHOULD (A-E) | any |
| NIX-INP-04 | A published flake's committed `flake.lock` holds no local input: no absolute `path:`, no `git+file:`, and no relative `path:` that leaves the flake's own git tree. The only relative form allowed is a `path:` that resolves inside the flake's own git tree (`path:./sub` from the root; `path:..`, `path:../` or `path:../..` from a nested sub-flake), and a flake using it states a consumer floor of 2.26 or later. Develop against a sibling checkout with `--override-input` on the command line, never in `flake.nix`. | An absolute path or `git+file:` resolves only on the author's machine, and a dirty `git+file:` input is refused at lock time. A cross-tree relative path fails with `access to absolute path '…' is forbidden in pure evaluation mode` on 2.31.5 and 2.35.2. Lix 2.95.2 words it `relative path '…' points outside of its parent's store path '…-source'` (re-check at each Lix release). | local-input, then cross-tree for candidates to read. Watched red on a lock with an absolute `path:` and a `git+file:` node (`["a","b"]`), green on a `path:./sub` lock (`[]`). cross-tree watched red on `path:../sibling-b`, green on `path:..`. Watched 2026-09-27: `path:../..` and `path:../` inside one tree exit 0 on CppNix 2.35.2, 2.31.5 and Lix 2.95.2. | MUST (A-E) | 2.26 for relative `path:` |
| NIX-INP-05 | Give every input an explicit scheme: `github:` (fetched as a tarball), `git+https:` or `git+ssh:` for other forges and for any input needing submodule or LFS content (NIX-INP-14), or `https://channels.nixos.org/nixos-unstable/nixexprs.tar.zst`. Never a bare registry name (`nixpkgs`, `nixpkgs/nixos-unstable`), and never `nixexprs.tar.xz`. FlakeHub URLs are NIX-REL-06's. | An `indirect` input resolves through registry state at lock time, and today it locks to a `releases.nixos.org` tarball, not `github`, visible only in `locked.type`. nixpkgs 26.11's release notes end `.tar.xz` channels after 2027-12-31 (re-check at nixpkgs 27.05). | indirect and tar-xz. Watched red on an indirect lock (`false`, exit 1) and a `.tar.xz` URL, green on a `github:` lock and the `.tar.zst` twin. | MUST (A-E) | any. `.tar.zst` channels exist today. |
| NIX-INP-06 | An A or D flake's root `nixpkgs` tracks a branch the installed flake-checker binary supports (0.2.15: `nixos-unstable`, `nixpkgs-unstable`, `nixos-26.05`, their `-small` variants, `nixpkgs-26.05-darwin`) and stays under 30 days old, checked by the flake-checker command above as an advisory step. The index's gate block runs this exact command, and NIX-GATE-11 owns telling a crash from a finding. | The corpus's median nixpkgs lock is 65 days old and the oldest 566 (per flake lock, so nixpkgs itself, which ships no lock, is outside the count). The 0.2.15 binary rejects `nixos-25.11` although its README lists it, and the binary wins (re-check at each flake-checker bump). | flake-checker. Watched red on an 88-day `nixos-25.11` lock (exit 1, 1 issue), green on a 3-day `nixos-unstable` twin (exit 0). A `channels.nixos.org` tarball input carries no `gitRef` and no `owner`, so the tarball clause keeps a fresh `.tar.zst` channel green; read its branch from `original.url` (a FlakeHub tarball passes the same way and is NIX-REL-06's). A ref-less `github:` input has an owner and no `gitRef`, tracks the default branch and stays red. Watched on planted locks: fresh tarball exit 0, 100-day tarball exit 1, fresh ref-less `github:NixOS/nixpkgs` exit 1. | SHOULD, advisory (A, D) | flake-checker 0.2.15 |

```nix
# wrong: the cache-backed input now rebuilds locally, and the library still drags in its own nixpkgs
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    tool-bin.url = "github:example/tool-bin";
    tool-bin.inputs.nixpkgs.follows = "nixpkgs";
    helpers.url = "github:example/helpers";
  };
}
```

```nix
# right: the library composes against this nixpkgs, and the cache-backed input keeps its own pin
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    helpers.url = "github:example/helpers";
    helpers.inputs.nixpkgs.follows = "nixpkgs";
    # No follows on purpose: its packages come from its author's cache, built against its own nixpkgs.
    tool-bin.url = "github:example/tool-bin";
  };
}
```

## Moving the Lock

```sh
# update-alias (NIX-INP-07): empty output (exit 1) is the pass.
grep -rn --exclude-dir=.git --exclude-dir=.claude --exclude='CHANGELOG*' -e 'nix .*--update-[i]nput' -e 'nix .*--recreate-lock-[f]ile' .
# path-narhash (NIX-INP-07): run before and after `nix flake update mylib`. The two outputs must differ.
INPUT=mylib # substitute the path: input whose target you edited
jq -r --arg i "$INPUT" '.nodes[$i].locked.narHash' flake.lock
# follows-drift (NIX-INP-08): after removing a follows and running `nix flake lock`. The two revs must be equal.
DEP=dep # substitute the input whose follows you removed
nix flake metadata --json --inputs-from . "$DEP" | jq -r '.locks.nodes.nixpkgs.locked.rev'
jq -r --arg d "$DEP" '.nodes[.nodes[$d].inputs.nixpkgs].locked.rev' flake.lock
# restore (NIX-INP-08): substitute the rev the first follows-drift command printed.
REV=0123456789abcdef0123456789abcdef01234567
nix flake lock --override-input "$DEP/nixpkgs" "github:NixOS/nixpkgs/$REV"
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-INP-07 | Move an existing lock entry, including a `path:` input whose target you just edited, with `nix flake update mylib` (or `nix flake update` for all). `nix flake lock` only adds missing entries and applies follows edits. Never write `nix flake lock --update-input` or `--recreate-lock-file` in a script or doc. README install wording is NIX-REL-09's. | The manual: entries "already up-to-date are not modified". After a `path:` target changes, plain `nix flake lock` keeps the old `narHash`, and the consumer evaluates stale content with no warning. `--update-input` is a hard error on Lix and a deprecated alias on CppNix, which only warns. | update-alias, and path-narhash around the update. Watched red: a script with `--update-input` hit, and after editing a `path:` target `nix flake lock` left the `narHash` and the evaluated value (`v1`) unchanged. Watched green: the `nix flake update` twin script, and `nix flake update mylib` moved the hash and gave `v2`. Lix 2.95.2 exit 1 on the alias, CppNix 2.31.5 and 2.35.2 exit 0 with a warning (research run). | MUST (A-E) | `nix flake update mylib` 2.19. Lix rejects the alias. |
| NIX-INP-08 | After any `follows` edit, run `nix flake lock` and read `git diff -- flake.lock` before committing. After removing a follows, compare the dependency's own pin with the node the lock now holds (follows-drift). When they differ, restore the pin with the restore command. | Removing a follows re-resolves the dependency's branch-named nixpkgs at today's tip instead of reading its committed lock (NixOS/nix#14339, open). NIX-INP-03 makes branch refs the norm, so every removal is exposed. A follow cycle is a clean `follow cycle detected` error on CppNix and a stack overflow on Lix. | follows-drift. Watched red on a local fixture: the dependency pins rev A, the consumer's node took the drifted tip B. Watched green after restore: both print A, and the dependency's output evaluates to its pinned value. The dependency-pin command also reads A on 2.31.5. | SHOULD (A-D) | drift measured on CppNix 2.35.2. Cycle diagnostic CppNix 2.31 or later. |

## What the Fetch Reads

```sh
# self-flags (NIX-INP-09): each line exits 0 to pass, exit 1 is the finding.
test ! -s .gitmodules || grep -rq -e 'self\.submodules' --include='flake.nix' .
! grep -qs -e 'filter=lfs' .gitattributes || grep -rq -e 'self\.lfs' --include='flake.nix' .
# eval-fetchers (NIX-INP-10): empty output (exit 1) is the pass. A hit in a flake-compat default.nix shim is exempt.
grep -rn -e 'builtins.fetchTree' -e 'builtins.fetchGit' -e 'builtins.fetchTarball' -e 'builtins.fetchurl' --include='*.nix' .
# eval-fetchers-bare (NIX-INP-10): the global spellings, in flake.nix only, where no flake-compat shim lives. Empty output (exit 1) is the pass.
grep -rn -e 'fetchTarball' -e 'fetchGit' -e 'fetchTree' --include='flake.nix' .
# watchdog (NIX-INP-13), needs gawk: prints one line. A max-gap of 60 or less is the pass.
# Over 60 is an alarm naming the stalled step. `nix-exit 124` in eval.log means the timeout fired.
{ timeout 300 nix flake check --no-build -v . 2>&1; echo "nix-exit $?"; } | gawk '{ print systime(), $0; fflush() }' > eval.log
gawk 'NR > 1 && $1 - t > gap { gap = $1 - t; after = line } { t = $1; line = $0 } END { print "max-gap", gap + 0, "after:", after }' eval.log
# github-submodules (NIX-INP-14): empty output (exit 1) is the pass.
grep -rn -e 'github:[^"]*[?&]submodules=' -e 'github:[^"]*[?&]lfs=' --include='*.nix' .
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-INP-09 | A flake whose build reads Git submodule content declares `inputs.self.submodules = true;`, and one whose build reads LFS-tracked files declares `inputs.self.lfs = true;`. When the repo ships its own `flake.nix`, never tell consumers to append `?submodules=1` (a repo without one is NIX-INP-14). CI that exercises `self.lfs` clones over a real `https://` LFS remote. The Lix leg passes `--extra-experimental-features flake-self-attrs` (NIX-GATE-16), and a flake declaring `self.lfs` marks that leg expected-fail with a comment naming Lix's missing `self.lfs`, never dropping the flag to turn it green. | Without the flag a consumer fetching by locked rev gets an empty submodule directory, or the LFS pointer text as file content: no eval error, wrong bytes at build time. Nix's LFS client speaks only the HTTP batch API, so a `file://` remote fails. An end-to-end HTTPS LFS run is still unverified (GitHub answered HTTP 429, 2026-09-27). | self-flags. Watched red on `.gitmodules` without the flag and on `filter=lfs` without `self.lfs` (exit 1), green on each declared twin and on a repo with neither (exit 0). A `filter=lfs` hit whose files the build never reads is a reviewed exception. Mechanism (research runs): without the flag the submodule file is missing (`does not exist` on 2.35.2, `No such file or directory` on 2.31.5) and LFS reads as pointer text. | MUST (A-D) | CppNix 2.27. Lix 2.95.2: submodules behind `flake-self-attrs`, no `lfs`. |
| NIX-INP-10 | No `builtins.fetchTree`, `fetchGit`, `fetchTarball` or `fetchurl` is reachable from a published flake's outputs. Declare the source as an input (`flake = false` for a non-flake) so the lock pins it and `nix flake update` moves it, or fetch it inside a derivation with `pkgs.fetchurl` or `fetchFromGitHub`. | An eval-time fetcher makes `nix flake show` and `check` network-bound with nothing in `inputs` or the lock to warn a reviewer. helix runs 303 `builtins.fetchTree` calls, one per grammar, from 2 declared inputs. | eval-fetchers and eval-fetchers-bare, then `nix flake check --no-build .` must download nothing. eval-fetchers-bare catches the bare global `fetchTarball`, which eval-fetchers misses (watched red on ipetkov/crane `flake.nix:25` at `73b98051`, green on the adopt template). Watched red on a `builtins.fetchTarball` output, green on the `flake = false` input twin. Behaviourally (research run): the eager fetch fails `--no-build` with `unable to download`, the `pkgs.fetchurl` twin passes. | SHOULD (A-D). D: NIX-GEN-01 makes it MUST. | any |
| NIX-INP-13 | Run the CI eval step (`nix flake check --no-build`, `nix flake show`) with `-v` under a wall-clock `timeout`, timestamp each line, and report the largest gap and the line before it (watchdog). A gap over 60 s is an alarm that names the stalled step for investigation, never a kill or a failure by itself. A slow flake whose `-v` output keeps moving is a scope problem: exclude heavy outputs such as `hydraJobs` from the check, and never raise the timeout. | Wall time alone cannot tell a slow fan-out from a stall. Without `-v` nix-installer's `hydraJobs` evaluation looked silent for 300 s, and with it the output never paused more than 34 s. One legitimate fetch or IFD build over 60 s looks the same as a hang, which is why this is an alarm. | watchdog. Watched red on a fetch from a listener that never answers: `max-gap 90 after: … downloading 'http://127.0.0.1:18089/blackhole.tar.gz'...`, `nix-exit 124` under `timeout 90`. Watched green on a fetch-free twin: `max-gap 0`, `nix-exit 0`. | SHOULD, advisory (A-D) | any. Line wording is CppNix 2.35.2's. |
| NIX-INP-14 | Consume a repo that ships no `flake.nix` and whose build needs its submodule or LFS content as a `flake = false` input with the `git+https:` (or `git+ssh:`) scheme, a full `rev` frozen on purpose under NIX-INP-03, and `submodules=1` or `lfs=1`. Never use `github:` for it. Once the upstream ships a flake declaring `inputs.self.submodules` or `lfs`, drop the parameters (NIX-INP-09). | A `github:` input is a tarball and carries neither submodule nor LFS content. CppNix 2.35.2 refuses to lock it: as a flake input it prints `path URL 'path:github:…?submodules=1' has unsupported parameter 'submodules'`, and through `builtins.fetchTree` `URL 'github:…?submodules=1' contains unknown parameter 'submodules'`. Key on the input's shape, never on either string. | github-submodules. Watched red on a `github:…?submodules=1` input, green on the `git+https:` twin. Real remote (research run, 2.35.2 and 2.31.5): with `submodules=1` a file inside the submodule reads back, without it the read fails. | SHOULD (A-C when wrapping a non-flake repo) | CppNix 2.31.5 verified. Lix: see What Agents Get Wrong Here, item 12. |

```nix
# wrong: a github: input is a tarball, so the parameter is rejected and no submodule can arrive
{
  inputs.vendored = {
    url = "github:example/vendored?submodules=1";
    flake = false;
  };
}
```

```nix
# right: the git fetcher clones the submodules at a rev frozen on purpose (bump it by editing the rev)
{
  inputs.vendored = {
    url = "git+https://github.com/example/vendored?rev=0123456789abcdef0123456789abcdef01234567&submodules=1";
    flake = false;
  };
}
```

## Lock Refresh in CI

```sh
# refresh-workflow (NIX-INP-11): both commands must list the same workflow file. Empty output from either is the finding.
grep -rln -e 'update-flake-lock' -e 'update-flake-inputs' -e 'nix flake update' .github/workflows
grep -rln -e 'schedule:' .github/workflows
# refresh-token (NIX-INP-11): empty output is the pass. NIX-SEC-03's access-tokens and github_access_token lines are filtered out, because they feed Nix's fetches. Read each remaining hit: one in the PR-opening step is the finding.
grep -rln -e 'update-flake-lock' -e 'update-flake-inputs' -e 'nix flake update' .github/workflows | xargs -r grep -Hn -e 'secrets.GITHUB_TOKEN' | grep -v -e 'access-tokens' -e 'github_access_token'
# no-committed-override (NIX-INP-12): exit 0 after the override leg is the pass.
git diff --exit-code -- flake.lock
```

| ID | Rule | Rationale | Verification | Severity | Floor / impl |
|---|---|---|---|---|---|
| NIX-INP-11 | **Pinned** cadence: refresh the lock weekly from a scheduled workflow that opens a PR and never pushes, and a human merges it (NIX-SEC-07). The workflow runs `DeterminateSystems/update-flake-lock`, or `nix flake update --commit-lock-file` plus a PR action, SHA-pinned (NIX-GATE-12), after CppNix is installed per NIX-GATE-13, and opens the PR under a GitHub App or fine-grained token so the gate runs on it. A D flake bumps its lock inside NIX-GEN-16's data PR instead. | Only 3 of 37 exemplar repositories automate the refresh, which is why the median lock is 65 days old. update-flake-lock's own README examples use `@main` and the Determinate installer, and it warns that a PR opened with the default token does not trigger CI. | refresh-workflow and refresh-token. Watched red on a scheduled workflow passing `secrets.GITHUB_TOKEN` (one hit) and on a repo with no refresh workflow (both lists empty), green on the App-token twin (empty). Whether CI actually ran on the PR is a reading heuristic on GitHub. | SHOULD (A, and a B or C test sub-flake) | Nix 2.19 |
| NIX-INP-12 | For a flake consumed as an input by others (B, C, or a widely followed D), add a CI leg that re-runs the gate with `--override-input nixpkgs github:NixOS/nixpkgs/nixpkgs-unstable`, as fenix does, and never commit the override. Evaluating a flake you do not own is NIX-SEC-05's. | It catches breakage against a consumer's newer nixpkgs, which is exactly what a follows exposes. It doubles build cost, so an A flake consumed only as an app skips it. | no-committed-override after the leg. A cost judgement, so no red and green pair was run. | CONSIDER (B, C, widely followed D) | any |

## What Agents Get Wrong Here

Ranked by how often each bites an agent working on a flake.

1. **A follows on every input as hygiene**, cache-backed ones included (NIX-INP-01).
2. **`nix flake lock` or nothing after editing a local `path:` library**, then debugging the consumer against stale content (NIX-INP-07).
3. **`nix flake lock --update-input x` from pre-2023 habit.** CppNix only warns, so the agent never sees the Lix leg fail (NIX-INP-07).
4. **"Pinning for reproducibility" with a rev in `url`**, then reporting `nix flake update` as done (NIX-INP-03).
5. **Committing a lock with `path:/home/…` or `git+file:` left from local development** (NIX-INP-04).
6. **Copying `channels.nixos.org/…/nixexprs.tar.xz` from NixOS/nix's `flake.nix`, or writing `nixpkgs.url = "nixpkgs/…"` and calling it GitHub.** Read the fetch from `locked.type`, never `original.type` (NIX-INP-05).
7. **A library flake with a full `nixpkgs`, flake-utils and a test nixpkgs at the root**, inherited by every consumer (NIX-INP-02).
8. **Killing a slow `nix flake check` run without `-v` as "hung", or raising the timeout.** A moving `-v` stream means the check needs a narrower scope (NIX-INP-13).
9. **Reading flake-checker's exit 0 without `--fail-mode` as clean**, or "fixing" its crash on a nixpkgs-less lock by adding a nixpkgs input (NIX-INP-06, NIX-GATE-11).
10. **Removing a follows and committing the re-lock unread.** The dependency's nixpkgs jumps to today's branch tip (NIX-INP-08).
11. **Trusting a remembered error string.** `points outside of its parent's store path` is the CppNix 2.20 and Lix 2.95.2 wording, while CppNix 2.31.5 and 2.35.2 print `access to absolute path '…' is forbidden in pure evaluation mode` (re-check at each Lix release), a missing submodule file reads differently on 2.31.5 and 2.35.2, and the "follow cycle segfaults Nix" story is historical on CppNix. Diagnose by the input's shape (NIX-INP-04, NIX-INP-08, NIX-INP-09).
12. **`?submodules=1` in consumer instructions when the repo ships a flake, `github:o/r?submodules=1` for a non-flake repo, or deleting `self.lfs` to turn a `file://` mirror or the Lix leg green** (NIX-INP-09, NIX-INP-14). A Lix fetch of a third-party repo that fails with `smudge filter lfs failed` comes from incidental LFS files on a host whose git config has an LFS filter, whatever files you read. Read the target's `.gitattributes` for `filter=lfs` before wrapping it (reading heuristic).
13. **Calling an unreferenced input "free", or "a fetch for every consumer", without separating the flake that declares it (fetches at lock time, measured) from a consumer inheriting it through a lock (unmeasured)** (NIX-INP-02).
14. **Hiding a fetch-heavy dependency in a `builtins.fetchTree` loop**, so `inputs` looks small while `show` and `check` crawl (NIX-INP-10).
15. **Setting `nixConfig.warn-dirty = false` to quiet dirty-tree warnings.** It is inert without `accept-flake-config`, and `nixConfig` is NIX-SEC-01's.
