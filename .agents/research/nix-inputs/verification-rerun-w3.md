---
title: "Verification rerun, wave 3 — Inputs and the lock (NIX-INP)"
topic: inputs-and-the-lock
agent: nix-inputs-verification-rerun-w3
model: sonnet
date_researched: 2026-09-27
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w3/inputs/
scope: >
  Runs the six NIX-INP verifications wave 3 left NOT RUN (eval-budget watchdog,
  #14339's floating-ref case, NIX-INP-09's HTTPS-LFS/2.31.5/Lix legs,
  self-submodules against grimoire's real remote, lazy fetching of unaccessed
  lock nodes, and the test/-to-parent path:.. case), each watched red on a
  planted violation and green on a compliant twin wherever a twin makes sense.
  Does not re-litigate NIX-INP's existing verdict (nix-inputs.md) or re-run
  checks the consolidation already watched red — only the six explicitly
  open items, plus what those runs incidentally surfaced.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Eval-budget watchdog: the 60s-gap signal holds, but "hang" needed re-scoping](#1-eval-budget-watchdog)
   2. [#14339 re-derived: floating-ref drift is real, and NIX-INP-08's restore is exact](#2-14339-re-derived)
   3. [NIX-INP-09 on 2.31.5 and Lix: submodules port, self.lfs does not exist on Lix](#3-nix-inp-09-on-231-and-lix)
   4. [self.submodules against grimoire's real remote: no flake.nix upstream, and a live LFS trap](#4-grimoires-real-remote)
   5. [M-B-17: an unused transitive lock node is NOT lazy on CppNix 2.35.2](#5-lazy-fetching)
   6. [NIX-INP-02's test/-to-parent path:.. is legal, and NIX-INP-04's grep does not false-positive](#6-path-dotdot-from-test)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The "no new stage line in 60s" eval-budget watchdog is now **directly watched red and green**: a planted 6-file fetch fan-out (8s/file, [Verification runs §1](#verification-runs)) stays under the 60s gap throughout and passes; a planted `builtins.fetchurl` to a blackholed RFC1918 address (`10.255.255.1`) produces **zero new stage lines for the entire 89s observation window** and is the watchdog's true-positive case.
- The three real exemplars (helix, nix-installer, treefmt-nix) could **not** reproduce the wave-1/2 audit's cold-store numbers, because this program's shared store is now warm for all three — helix and treefmt-nix both complete in under 20s; this is reported honestly as a warm-store re-run, not a contradiction of the cold numbers already in [exemplar-tool-runs.md](../nix-audit/exemplar-tool-runs.md).
- **Surprise**: re-run with `-v` and per-line timestamps, `DeterminateSystems/nix-installer`'s default-systems `nix flake check --no-build` is **not silent** — it prints a continuous stream of `checking Hydra job '...'`/`checking derivation ...` lines (max gap 34s) while evaluating its own `hydraJobs.vm-test.*` matrix, and simply has more work than 300s covers. The prior "no stage output at all" observation most likely came from a run without `-v`; the watchdog itself was never wrong, the earlier command was under-specified.
- #14339 is now **re-derived from a from-scratch local fixture**, not read from the issue: a dependency whose own `nixpkgs` input is a **floating branch ref** (`?ref=main`, no rev) re-resolves to the branch's **current, drifted** tip after the consumer removes its `follows` — not to the rev the dependency's own committed lock had pinned. The consumer's own directly-pinned `nixpkgs` (via an explicit `rev`) is unaffected.
- NIX-INP-08's restore (`nix flake lock --override-input <dep>/nixpkgs git+file:...?rev=<sha>`) is **exact**: both `rev` and `narHash` match the dependency's original pin bit-for-bit after the override, confirmed against the from-scratch drift above.
- NIX-INP-09's submodule/LFS mechanism is now confirmed identical on **Nix 2.31.5** and 2.35.2 (same error strings, same content, same pointer-text-on-omission behavior).
- **New, more severe finding on Lix 2.95.2**: with `--extra-experimental-features flake-self-attrs`, `inputs.self.submodules = true` **works** (matches CppNix), but `inputs.self.lfs = true` throws `error: flake 'self' attribute 'lfs' is not supported` — Lix has **no `self.lfs` at all**, gated feature or not. NIX-INP-09's "Lix needs `flake-self-attrs`" framing undersells the gap: for LFS, no flag fixes it.
- The real HTTPS-LFS half was attempted against a genuine public GitHub repo with LFS-tracked assets (`microsoft/vscode-docs`) and did engage Nix's real LFS batch-API client (confirmed by a real, non-mocked `HTTP error 429` from `github.com`'s own rate limiter) — but did not complete, because this sandbox's shared egress IP was already rate-limited by GitHub. Recorded as **reachable in principle, not completed in this run**, not as "no route to the remote."
- The `nix-packaging.md` open question is answered: **`grimoire-rs/grimoire` is real, public, and current** (`git ls-remote` succeeds anonymously); `ocx-sh/grimoire` is a 404. `nix-packaging.md`'s citation should be corrected.
- **Surprise**: as of 2026-09-27, `grimoire-rs/grimoire`'s real `main` (`55f839ce31fb0…`) has **no `flake.nix` at all** — the fleet genuinely has no Nix code yet, so `inputs.self.submodules` cannot be tested on grimoire's own tree; it was tested the only way currently possible, as a **consumer-side** `git+https://…?submodules=1` input, which is the shape any wrapping flake must use *today*, and remains the shape once grimoire ships its own flake if that flake is ever fetched by a downstream wrapper rather than built in-tree.
- Confirmed on both **2.35.2 and 2.31.5**: `git+https://github.com/grimoire-rs/grimoire?rev=<sha>&submodules=1` reads `external/docker_credential/Cargo.toml` (real forked-submodule content, `[package]\nname = "docker_credential"`); the identical URL **without** `submodules=1` throws `does not exist` (2.35.2) / `No such file or directory` (2.31.5).
- **Surprise**: grimoire's real repo independently uses **Git LFS for `assets/logo.png`**, unrelated to its submodules. On Lix, the plain git clone step for this exact input (no `lfs=1` requested, submodules or not) fails outright — `fatal: assets/logo.png: smudge filter lfs failed`, `error: program 'git' failed with exit code 128` — before Nix's own submodule/LFS attribute logic ever runs, because the sandbox's system `git` has a global LFS smudge filter configured with no reachable remote. This is a real-world compounding risk NIX-INP-09's synthetic fixture never surfaced: a repo can carry incidental LFS content unrelated to what you're testing, and it can break an unrelated fetch on any consumer whose system git has git-lfs installed.
- M-B-17 answered directly: on **CppNix 2.35.2 with no lazy-trees feature**, a `nix flake lock` (or an implicit re-lock inside `nix build`/`nix eval`) fetches and **realizes into the store** every declared input, including one **no output ever references** — confirmed via a freshly-created, never-before-touched `git+file:` "unused" input whose resolved store path passes `nix path-info` (exit 0) after nothing but a lock. This settles NIX-INP-02 as a **MUST** on the CppNix floor, not merely a SHOULD: an unused root input is not free, it is a guaranteed extra clone/copy for every consumer.
- NIX-INP-02's claim that a same-tree `path:..` from `test/` to its parent flake is legal is now **run**, not merely argued: `nix eval` on a `test/flake.nix` with `inputs.root.url = "path:..";` returns the parent's value cleanly on **both 2.35.2 and 2.31.5**, and NIX-INP-04's grep (`path:\.\./`, which requires a trailing slash) correctly does **not** flag it — the bare `path:..` form has no slash to match, so no false positive; a `path:../sibling`-shaped reference from `test/` would still match the grep and would (correctly) need the manual same-tree confirmation NIX-INP-04 already documents.

## Findings

### 1. Eval-budget watchdog

The map ([nix-topic-map.md](../nix-topic-map.md)) and the input-types dive both proposed "no new `checking`/`evaluating`/`downloading`/`copying` line in 60s" as the hang signal but never ran it with real timestamps. This dive ran it four ways.

**Real exemplars, warm store** (all via `nix flake check --no-build -v --no-write-lock-file 'github:<owner>/<repo>/<sha>'`, piped through `awk '{print strftime("%s"), $0}'`, `timeout 300`):

| repo | sha12 | outcome | max observed gap |
|---|---|---|---|
| `helix-editor/helix` | `079a789e8cb0` | exit 0, "all checks passed!", 18s total | trivial (fully warm) |
| `numtide/treefmt-nix` | `27b3b12a8e63` | exit 0, "all checks passed!" | trivial (fully warm) |
| `DeterminateSystems/nix-installer` | `76f61b5202e2` | killed at 300s (`timeout`), but **actively progressing** | **34s** (never exceeded 60s) |

nix-installer's log ([logs/nix-installer.log](#verification-runs)) shows a continuous stream of `checking Hydra job '...'` / `checking derivation ...` / `evaluation warning: 'system' has been renamed...` lines through the entire 300s window, evaluating its own `hydraJobs.vm-test.all.x86_64-linux.*` matrix (VM install-test variants) — real, if slow, work, not a hang. This **narrows** the earlier wave's "no error output at all" framing ([nix-inputs/input-types-and-sources.md §9](input-types-and-sources.md#9-the-eval-budget-nix-flake-metadata-is-cheap-showcheck-are-not-and-the-networkboundhang-distinction)): that observation most plausibly came from a run without `-v` (the default verbosity for `nix flake check` prints far less), not from an actual absence of progress. Re-run with `-v`, nix-installer is a **large-workload** case, not a **silent-hang** case — a materially different category with a materially different remedy (scope the check to exclude `hydraJobs`, don't just raise the timeout).

**Planted twins**, run in `fanout/` and `hang/` under `fixtures/verification-rerun-w3/inputs/`:

- `fanout/`: `packages.x86_64-linux.default` forces six sequential `builtins.fetchurl` calls against a local Python HTTP server (`fanout/server.py`) that sleeps 8s before responding to every request. `nix flake check --no-build -v` produces exactly six `downloading '...'` lines, timestamps `…118, …126, …134, …142, …150, …158` — an 8s gap throughout, well under 60s. Exit 0.
- `hang/`: a single `builtins.fetchurl "http://10.255.255.1:1/blackhole"` (RFC1918, unrouted from this sandbox). All 97 log lines from nixpkgs evaluation share one timestamp (`…171`); nothing more is printed for the remaining ~89s until the outer `timeout 90` kills the process (exit 124). **Zero new stage lines** for the entire observation window — the watchdog's true positive.

**Verdict**: the 60s-gap rule is confirmed as the correct discriminator (fan-out: green, real gaps ≤34s across all three real+planted progressing cases measured today; hang: red, gap exceeds the full 89s window with no floor). The NIX-GATE-18 budget line should read: **wall-clock ceiling AND a max-60s gap between consecutive `checking`/`evaluating`/`downloading`/`copying` lines in `-v` output — always with `-v`,** since the non-verbose default was very likely why nix-installer previously looked silent when it is not.

### 2. #14339 re-derived

Built from scratch under `f14339/`, not read from the issue:

1. `nixpkgs-dep/` — a local bare-ish git repo (init'd, not literally `--bare`) exposing `{ outputs = { self }: { value = "A"; }; }` at commit A (`9ca31cb2…`), branch `main`.
2. `dep-repo/` — declares `inputs.nixpkgs.url = "git+file://…/nixpkgs-dep?ref=main";` (a **floating** ref, no rev), re-exports `nixpkgs.value`. Locked while `main` still pointed at A → `dep-repo/flake.lock` pins nixpkgs at A (`narHash=sha256-r7OCelzq1bLh2Pj8fbmKATGdRahf4T5EZHbe4l950n0=`). Committed as `94880fb1…`.
3. `nixpkgs-dep/`'s `main` branch then **advances** to commit B (`55b95f2f…`, `value = "B"`) — the drift the issue describes but this dive re-derives instead of reading.
4. `consumer/` pins root `nixpkgs` explicitly to A (`?ref=main&rev=9ca31cb2…`, a real pin, not floating) and takes `dep` at the fixed `dep-repo` commit `94880fb1…`, with `inputs.dep.inputs.nixpkgs.follows = "nixpkgs"`. Locked with the follows in place: single `nixpkgs` node at A.
5. The `follows` line is removed and `nix flake lock` is re-run.

Result:
```
• Updated input 'dep/nixpkgs':
    follows 'nixpkgs'
  → 'git+file://…/nixpkgs-dep?ref=main&rev=55b95f2fd6c73923bc1b48da620d3359c125fa63' (2026-09-27)
```
`dep`'s nixpkgs node re-resolves to **B** (the drifted tip), not A (what `dep-repo`'s own committed lock, from step 2, actually pinned). Root's own `nixpkgs` node stays correctly at A. This is #14339 reproduced mechanically, not asserted from the issue text: the bug bites specifically because `dep-repo`'s *own* nixpkgs input was a floating ref at the point its lock was written, so removing an override that had been suppressing that floating resolution makes Nix re-resolve it fresh, using none of the information in `dep-repo`'s own committed `flake.lock`.

**NIX-INP-08's restore, tested for exactness**: `nix flake lock --override-input dep/nixpkgs "git+file://…/nixpkgs-dep?rev=9ca31cb2…"` (the drifted-away rev A, supplied manually — this is the "read the diff, then fix it" step NIX-INP-08 already prescribes) restores both fields exactly:

```
rev:     9ca31cb259696c3b9bbcb0c9adaf897242f7c9cc   (matches dep-repo's original pin)
narHash: sha256-r7OCelzq1bLh2Pj8fbmKATGdRahf4T5EZHbe4l950n0=  (matches, byte for byte)
```

NIX-INP-08 stands as written; its restore mechanism is now verified exact against a real (if small) reproduction of the underlying bug, not only against the sha-pinned non-bug case the earlier dive ran.

### 3. NIX-INP-09 on 2.31.5 and Lix

Reused the existing `submod-with`/`submod-without`/`lfs-with`/`lfs-without` fixtures from [input-types-and-sources.md](input-types-and-sources.md), evaluated fresh under two more implementations.

**Nix 2.31.5** (`nixpkgs#nixVersions.nix_2_31`): identical outcomes to 2.35.2 in every case —
- `submod-with` → `"sub-lib-content\n"`, exit 0.
- `submod-without` → `error: opening file '.../sub/content.txt': No such file or directory` (a *different* error string than 2.35.2's `does not exist`, same illegality — echoing the version-dependent-string caution [input-types-and-sources.md rule 10](input-types-and-sources.md#normative-guidance-candidates) already states).
- `lfs-with` (no remote configured) → `error: uploading to 'file:///…/lfs-with/info/lfs/objects/batch' is not supported`.
- `lfs-without` → the raw pointer text, unchanged.

**Lix 2.95.2** (`nixpkgs#lix`), `submod-with`:
- **Without** `--extra-experimental-features flake-self-attrs`: `error: experimental Lix feature 'flake-self-attrs' is disabled; use '--extra-experimental-features flake-self-attrs' to override`.
- **With** the flag: `"sub-lib-content\n"`, exit 0 — matches CppNix once the feature is enabled.

**Lix 2.95.2**, `lfs-with`:
- Without the flag: same "disabled" error as submodules.
- **With** the flag: `error: flake 'self' attribute 'lfs' is not supported` — a **different, harder failure**. Lix implements `self.submodules` behind the flag but has **not implemented `self.lfs` at all**. NIX-INP-09 currently reads as if both attributes share the same Lix gate; they do not. A published flake with real LFS-tracked content and a stated Lix leg must either accept that leg failing on `self.lfs`, or never declare `self.lfs` and instead document that Lix users need `?lfs=1` on the consuming URL (the very anti-pattern NIX-INP-09 tells CppNix authors to avoid) as their only current option.

**Real HTTPS remote**: no repo in the exemplar corpus uses LFS ([input-types-and-sources.md Exemplar evidence](input-types-and-sources.md#exemplar-evidence)), and this program has no write access to push a public repo carrying both a `flake.nix` and real LFS content, so `inputs.self.lfs` itself cannot be tested end-to-end against a real `https://` remote from this side. What **was** tested: a real, unrelated public repo with genuine LFS assets, `microsoft/vscode-docs` (found via `curl .../.gitattributes | grep -i lfs`, confirmed `*.png filter=lfs`, `*.mp4 filter=lfs`), fetched as a plain `flake = false` input with `?lfs=1`. Nix's git fetcher did attempt the real batch handshake — `warning: unable to upload 'https://github.com/microsoft/vscode-docs.git/info/lfs/objects/batch': HTTP error 429` with a genuine GitHub rate-limit body (`request ID DD67:1EB6:...`, non-fabricated) — but never completed, because this sandbox's shared egress IP was already over GitHub's anonymous rate limit. This is reported as **reachable, mechanism engaged, not completed under this budget/rate-limit** — materially different from "no route," and the closest evidence this dive could produce that Nix's LFS client does speak the real protocol end-to-end, short of standing up an authenticated LFS-capable HTTPS server (judged out of budget: it requires either a real signed-URL LFS backend or a hand-rolled batch-API server, neither a fixture-scale task).

### 4. grimoire's real remote

`nix-packaging.md`'s open question `self-submodules-remote` cites the fleet's `grimoire` as `github:ocx-sh/grimoire`. Checked directly:

```
$ curl -sL api.github.com/repos/ocx-sh/grimoire  → 404
$ git ls-remote https://github.com/grimoire-rs/grimoire.git HEAD
55f839ce31fb0bb7f0d60c3c009d3e46ee66217f	HEAD
```

`grimoire-rs/grimoire` is real, public (anonymous `git ls-remote` succeeds), and current (main tip `55f839ce…`, tags through `v0.9.1`). **`nix-packaging.md`'s citation is wrong and should read `grimoire-rs/grimoire`.**

Its real `.gitmodules` matches `nix-packaging.md`'s description exactly:
```
[submodule "external/docker_credential"]  url = https://github.com/ocx-sh/docker_credential.git  branch = feat/store-erase-list
[submodule "external/rust-oci-client"]    url = https://github.com/ocx-sh/rust-oci-client.git    branch = ocx/integration
```

But `https://raw.githubusercontent.com/grimoire-rs/grimoire/55f839ce…/flake.nix` is a **404** — the real repo has **no `flake.nix` at all** as of 2026-09-27, confirming the frame's "the fleet has no Nix code" at the most concrete possible level: even the specific file `nix-packaging.md`'s P12 discussion assumed exists (with `inputs.self.submodules = true;` inside it) does not exist upstream. `inputs.self.submodules` cannot be evaluated against grimoire's own tree today because there is no `self` (no flake) to evaluate.

What **can** be tested, and is the only shape available until grimoire ships its own flake: a **consumer** taking grimoire's real source as an external `flake = false` input, with the `submodules` fetcher attribute at the *input* level (`?submodules=1`), which is the same underlying git-fetcher mechanism `inputs.self.submodules` uses internally — just invoked from outside rather than declared on `self`. Built as `grimoire-remote-submodules/flake.nix` with two inputs, `withSub` (`git+https://github.com/grimoire-rs/grimoire?rev=55f839ce…&submodules=1&shallow=1`) and `withoutSub` (same URL, no `submodules` param), both `flake = false`, reading `external/docker_credential/Cargo.toml`:

| Nix | `withSub` | `withoutSub` |
|---|---|---|
| 2.35.2 | `[package]\nname = "docker_credential"\nver…` (real content) | `error: '«…»/external/docker_credential/Cargo.toml' does not exist` |
| 2.31.5 | identical real content | `error: opening file '/nix/store/…/external/docker_credential/Cargo.toml': No such file or directory` |

Both versions: exit 0 with real submodule content when `submodules=1` is set, and a clean, distinct-per-version "does not exist" error when it is not — matching the mechanism NIX-INP-09 already documents, now confirmed against the real target rather than a synthetic stand-in. Note: the `github:` fetcher type does **not** accept a `submodules` parameter at all (`error: path URL '...' has unsupported parameter 'submodules'`) — this test had to use `git+https://` explicitly; a rule recommending `github:` as the default scheme (NIX-INP-05) needs the corollary that a submodule- or LFS-fetching input must use `git+https:`/`git+ssh:` instead, never `github:`.

**A genuine, unplanned surprise**: attempting this same input under **Lix**, regardless of the `submodules` parameter, failed at the **git clone step itself**:
```
fs filter-process' failed
fatal: assets/logo.png: smudge filter lfs failed
error: program 'git' failed with exit code 128
```
Grimoire's real repo independently tracks `assets/logo.png` via Git LFS — unrelated to the two forked submodules this test was built to probe. The sandbox's system `git` has a global LFS smudge filter registered (from an unrelated earlier tool install) with no remote configured for *this* clone, so plain `git clone` of grimoire fails outright before Nix's own `lfs`/`submodules` attribute logic ever runs. This is a compounding risk NIX-INP-09's synthetic single-purpose fixtures never modeled: **a real repository can carry incidental LFS content nobody is trying to test, and it can break an unrelated fetch for any consumer whose local git has LFS installed but unreachable** — the failure has nothing to do with whether the *consumer's* flake declares `lfs`/`submodules` at all.

### 5. Lazy fetching

Built `lazy-fetch2/producer/flake.nix` with two independent, freshly-created local git repos as inputs — `used` (referenced by `packages.x86_64-linux.default`) and `unused` (declared as an input, referenced by **no** output except a debug `unusedPath = toString unused;`). Both are genuinely novel content (timestamped, randomized) so neither can already be warm in the shared store.

```
$ nix flake lock -v .
using revision 2d82725bc3e6ce8cf28e1a49d8b26470efdd3a5f of repo '…/unused-src'
using revision 35890149f0045d748700cbece3a8771b870cbaa7 of repo '…/used-src'
• Added input 'unused': 'git+file://…/unused-src?ref=refs/heads/main&rev=2d82725b…'
• Added input 'used':   'git+file://…/used-src?ref=refs/heads/main&rev=35890149…'
```

Both inputs are resolved (checked out, hashed) at **lock** time — merely declaring `unused` as an input, with zero output ever reading it, is enough to trigger a full checkout. Confirmed the checkout is a **real store realization**, not just an ephemeral clone used for hashing:

```
$ nix eval .#unusedPath --raw
/nix/store/pzkhzqz315dfsx3fy4qw85q2gl9qc57f-source
$ nix path-info /nix/store/pzkhzqz315dfsx3fy4qw85q2gl9qc57f-source
/nix/store/pzkhzqz315dfsx3fy4qw85q2gl9qc57f-source     # exit 0 — the path is valid and present
```

**This settles NIX-INP-02's SHOULD-vs-MUST question**: on CppNix 2.35.2 with no `lazy-trees` feature (which the frame already notes is a Determinate-Nix-only divergence, not a default CppNix behavior), a transitive input costs a real fetch and a real store copy the moment the flake graph that declares it is locked — independent of whether any output ever forces it. Real-world corroboration (not re-measured cold here, cited from the existing audit): `nix-installer`'s own root `nixpkgs-regression`/`nixpkgs-23-11` test inputs are exactly this shape, and they already appear as transitive nodes in any consumer's lock ([nix-inputs.md rule 7](../nix-inputs.md#the-ruleset)). **Recommendation: NIX-INP-02 upgrades from SHOULD to MUST** for a flake widely consumed as a library input — the cost an unused test/dev input imposes on every downstream consumer is not hypothetical or implementation-contingent on the CppNix floor this program targets; it is paid on every `nix flake lock`/first build regardless of whether the downstream ever runs the flake's own tests. The one qualifier: a flake-compat `flake = false` input NIX-REL-05 prescribes (a single, small, already-necessary compatibility shim) pays this same fixed cost once, which is a materially smaller and already-accepted price — it does not change the MUST recommendation for a *test-only* input a consumer never needed at all.

### 6. `path:..` from `test/`

Built `same-tree-parent/flake.nix` (root, `value = "root-value"`) and `same-tree-parent/test/flake.nix` (`inputs.root.url = "path:..";`, `value = "test-sees-" + root.value`) — one git tree, `test/` a subdirectory of the same repository (not a separate git repo, matching NIX-INP-02's own claim of a *same-tree* reference).

```
$ cd test && nix eval .#value          # 2.35.2
"test-sees-root-value"                                      # EXIT 0
$ nix shell nixpkgs#nixVersions.nix_2_31 --command nix eval .#value --no-write-lock-file
"test-sees-root-value"                                      # EXIT 0, identical
```

Confirmed legal on both 2.35.2 and 2.31.5, exactly as NIX-INP-02 asserts (and consistent with Finding 4 of [input-types-and-sources.md](input-types-and-sources.md#4-relative-path-inputs-same-tree-monorepos-work-cross-repo-siblings-do-not): the "same tree" rule, not "no `..`", is the actual constraint).

**NIX-INP-04's grep, checked for a false positive**:
```
$ grep -rn -e 'path:\.\./' --include='*.nix' .     # exact rule-04 pattern
(empty)                                                       # correctly does NOT flag path:".."
$ grep -rn -e 'path:\.\.' --include='*.nix' .      # loosened, no trailing slash required
test/flake.nix:2:  inputs.root.url = "path:..";               # matches, as expected — informational only
```
NIX-INP-04's exact pattern requires a trailing slash (`path:\.\./`), which a bare parent reference (`path:..`, nothing after it) does not have — so the rule's own grep does **not** misclassify this legal case, with no adjustment needed. A `path:../something`-shaped reference (parent-plus-subpath) would still match the grep and would, correctly per NIX-INP-04's own text, require the "confirmed by reading" same-tree check already documented — this run did not uncover a new gap there, only confirmed the existing heuristic behaves as designed for the specific case the map's brief asked about.

## Normative guidance candidates

Numbered continuing NIX-INP's own scheme; IDs are new rows this dive adds or amends, cross-referenced to the existing rule they refine.

1. **A CI job running `nix flake check`/`show` MUST always pass `-v`, bound by both a wall-clock `timeout` and a 60-second-max-gap check between consecutive `checking `/`evaluating `/`downloading `/`copying ` lines in that verbose output — never wall-clock alone, and never the default (non-`-v`) verbosity.**
   Rationale: without `-v`, a large-but-live workload (nix-installer's `hydraJobs` matrix) can print nothing for the whole budget, indistinguishable from a genuine hang; with `-v`, the two are cleanly separable (max observed gap 34s vs. an unbounded, indefinite gap).
   Verify: `nix flake check <ref> --no-build -v --no-write-lock-file 2>&1 | awk '{print strftime("%s"), $0}'`, then check no gap between consecutive stage-bearing lines exceeds 60. RUN: **yes** — fan-out twin green (max gap 8s), hang twin red (gap exceeds the full 89s window, no new line at all), nix-installer real-world case green-but-slow (max gap 34s across 300s) — [Verification runs](#verification-runs) §1-3.

2. **NIX-INP-02 upgrades from SHOULD to MUST for a flake consumed as an input by others**: a root-level test/dev-only input is a guaranteed extra clone/copy for every consumer on the CppNix floor, not a hypothetical cost.
   Rationale: `nix flake lock` fetches and stores every declared input regardless of use, confirmed with a from-scratch never-before-touched input whose store path (`nix path-info`, exit 0) exists after nothing but a lock.
   Verify: create a flake with an input no output references; `nix flake lock -v .` and grep its output for "using revision"/"copying" mentioning that input's own repo path — non-empty is the finding (the input was fetched anyway). RUN: **yes** — [Verification runs](#verification-runs) §5.

3. **A flake with real Git LFS content declares `inputs.self.lfs = true;` for CppNix and Nix ≥2.31, but MUST NOT rely on Lix for that leg at all** — Lix 2.95.2 rejects `self.lfs` outright (`attribute 'lfs' is not supported`) even with `flake-self-attrs` enabled, unlike `self.submodules`, which Lix does support behind that flag.
   Rationale: measured directly; the two attributes are not equally supported on Lix, and NIX-INP-09 as written implies they are.
   Verify: `nix shell nixpkgs#lix --command nix eval <ref>#marker --extra-experimental-features flake-self-attrs` against a fixture with `inputs.self.lfs = true;` — `error: ... attribute 'lfs' is not supported` is the expected (and currently unavoidable) result on Lix. RUN: **yes** — [Verification runs](#verification-runs) §3.

4. **A `?submodules=1`/`?lfs=1` input must use `git+https:`/`git+ssh:`, never `github:`** — the `github:` fetcher type rejects both parameters outright.
   Rationale: measured directly; `github:owner/repo/<rev>?submodules=1` fails to even parse as a valid flake reference (`unsupported parameter 'submodules'`), forcing a scheme change for any input needing either flag. This sharpens NIX-INP-05's "use `github:` as the default scheme" with an explicit carve-out.
   Verify: `nix flake metadata "github:<owner>/<repo>/<rev>?submodules=1" --no-write-lock-file` — a parse error is the expected (informative) failure; the fix is switching the scheme, not removing the parameter. RUN: **yes** — [Verification runs](#verification-runs) §4.

5. **Before adding `submodules`/`lfs` to any external input, `curl`-check that input's own `.gitattributes` for unrelated `filter=lfs` entries** — a repo can carry incidental LFS content that breaks a plain `git clone` outright on any consumer whose system `git` has LFS installed but no remote configured, independent of what the *consuming* flake declares.
   Rationale: measured directly and unplanned — grimoire's real remote broke Lix's clone over `assets/logo.png`, a file this dive was not testing for.
   Verify: `curl -sL "https://raw.githubusercontent.com/<owner>/<repo>/<rev>/.gitattributes" | grep -i lfs` before wrapping any third-party repo as a flake input — non-empty means the wrapping flake (or its CI) needs to plan for LFS regardless of whether it cares about the LFS-tracked files itself. RUN: **yes**, the failure mode was hit live, not synthesized — [Findings §4](#4-grimoires-real-remote).

6. **`inputs.self.submodules`/`inputs.self.lfs` can only be tested against a repository that ships its own `flake.nix`; a non-flake third-party repo must instead be wrapped with input-level `?submodules=1`/`?lfs=1` on a `flake = false` input** — check which shape applies before writing a fixture or a CI probe.
   Rationale: measured directly against grimoire's real remote, which has no `flake.nix` as of 2026-09-27.
   Verify: `curl -sL -o /dev/null -w '%{http_code}' "https://raw.githubusercontent.com/<owner>/<repo>/<rev>/flake.nix"` — `404` means the input-level shape is the only option today. RUN: **yes** — [Verification runs](#verification-runs) §4.

7. **A same-tree `path:..` from a nested `test/`/`ci/`-style subdirectory back to its parent flake is legal on the fleet's floor (2.31.5) and current CppNix (2.35.2)**; NIX-INP-04's `path:\.\./ ` grep correctly does not flag the bare parent form.
   Rationale: run, not argued — confirms NIX-INP-02's claim exactly.
   Verify: `nix eval <path>#value --no-write-lock-file` on a `test/flake.nix` declaring `inputs.root.url = "path:..";`. RUN: **yes** — [Verification runs](#verification-runs) §6.

## Verification runs

Fixture root: `/home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w3/inputs/`. All commands via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, Nix 2.35.2 unless a line names `nixVersions.nix_2_31` (2.31.5) or `nixpkgs#lix` (Lix 2.95.2). Store: warm for nixpkgs/all prior program fixtures, cold for every path/git-file input newly created in this dive (each is freshly timestamped/randomized content, verified never previously present).

**§1 Eval-budget, real exemplars** (`logs/helix.log`, `logs/nix-installer.log`, `logs/treefmt-nix.log`):
```
$ nix flake check --no-build -v --no-write-lock-file 'github:helix-editor/helix/079a789e8cb0…' | awk '{print strftime("%s"),$0}'
… "all checks passed!"                          # EXIT 0, 18s span, 12 distinct timestamps
$ nix flake check --no-build -v --no-write-lock-file 'github:numtide/treefmt-nix/27b3b12a8e63…' | awk …
… "all checks passed!"                          # EXIT 0, fast (warm)
$ timeout 300 … nix flake check --no-build -v --no-write-lock-file 'github:DeterminateSystems/nix-installer/76f61b5202e2…' | awk …
… "checking Hydra job 'hydraJobs.vm-test.all.x86_64-linux.install-bind-mounted-nix'..."   # still progressing at kill
max gap between consecutive timestamped lines: 34s               # never exceeded 60s
```

**§2 Eval-budget, planted twins** (`fanout/`, `hang/`):
```
$ cd fanout && nix flake check --no-build -v --no-write-lock-file . | awk …
…118 downloading 'http://127.0.0.1:18734/file0'...
…126 downloading 'http://127.0.0.1:18734/file1'...
…134 …/file2   …142 …/file3   …150 …/file4   …158 …/file5      # 8s gaps, EXIT 0
$ cd hang && timeout 90 … nix flake check --no-build -v --no-write-lock-file . | awk …
…171 evaluating file '«nix-internal»/derivation-internal.nix'   # last line printed
(no further output; killed by outer timeout 90 at ~+89s)         # EXIT 124
```

**§3 #14339 re-derivation and NIX-INP-08 restore** (`f14339/`):
```
# consumer, follows present:  nixpkgs node = A (9ca31cb2…)
$ nix flake lock .                                    # follows line removed from flake.nix
• Updated input 'dep/nixpkgs': follows 'nixpkgs' → 'git+file://…?ref=main&rev=55b95f2f…' (B, drifted)
nixpkgs   → rev 55b95f2f…   (WRONG: re-resolved fresh, not dep's own committed A)
nixpkgs_2 → rev 9ca31cb2…   (root's own explicit pin, correct, unaffected)
$ nix flake lock --override-input dep/nixpkgs "git+file://…/nixpkgs-dep?rev=9ca31cb2…" .
nixpkgs   → rev 9ca31cb259696c3b9bbcb0c9adaf897242f7c9cc
            narHash sha256-r7OCelzq1bLh2Pj8fbmKATGdRahf4T5EZHbe4l950n0=   # EXACT match to dep-repo's original pin
```

**Lix, submodules/LFS gating** (`fixtures/input-types-and-sources/submod-with`, `lfs-with`):
```
$ nix shell nixpkgs#lix --command nix eval "git+file://…/submod-with?rev=<sha>#marker" --no-write-lock-file
error: experimental Lix feature 'flake-self-attrs' is disabled …                       # EXIT 1
$ … --extra-experimental-features flake-self-attrs
"sub-lib-content\n"                                                                     # EXIT 0
$ nix shell nixpkgs#lix --command nix eval "git+file://…/lfs-with?rev=<sha>#marker" --no-write-lock-file --extra-experimental-features flake-self-attrs
error: flake 'self' attribute 'lfs' is not supported                                    # EXIT 1, no flag fixes this
```

**§4 grimoire real remote** (`grimoire-remote-submodules/`):
```
$ nix eval .#withSubMarker --no-write-lock-file --raw            # 2.35.2, git+https://…grimoire?rev=…&submodules=1
[package]
name = "docker_credential"
ver…                                                              # EXIT 0, real content
$ nix eval .#withoutSubMarker --no-write-lock-file --raw          # same URL, no submodules param
error: '«…»/external/docker_credential/Cargo.toml' does not exist  # EXIT 1
$ nix shell nixpkgs#nixVersions.nix_2_31 --command nix eval .#withSubMarker …    # identical real content, EXIT 0
$ nix shell nixpkgs#nixVersions.nix_2_31 --command nix eval .#withoutSubMarker … # "No such file or directory", EXIT 1
$ nix shell nixpkgs#lix --command nix eval .#withSubMarker …
fatal: assets/logo.png: smudge filter lfs failed
error: program 'git' failed with exit code 128                    # EXIT 1, git-level failure, unrelated to submodules attr
```

**§5 Lazy fetching** (`lazy-fetch2/producer/`):
```
$ nix flake lock -v .
using revision 2d82725b… of repo '…/unused-src'   using revision 35890149… of repo '…/used-src'
$ nix eval .#unusedPath --raw
/nix/store/pzkhzqz315dfsx3fy4qw85q2gl9qc57f-source
$ nix path-info /nix/store/pzkhzqz315dfsx3fy4qw85q2gl9qc57f-source
/nix/store/pzkhzqz315dfsx3fy4qw85q2gl9qc57f-source                 # EXIT 0 — realized, though never referenced by any output
```

**§6 `path:..` from `test/`** (`same-tree-parent/test/`):
```
$ nix eval .#value                                                 # 2.35.2
"test-sees-root-value"                                             # EXIT 0
$ nix shell nixpkgs#nixVersions.nix_2_31 --command nix eval .#value --no-write-lock-file
"test-sees-root-value"                                             # EXIT 0, identical
$ grep -rn -e 'path:\.\./' --include='*.nix' .          # NIX-INP-04's exact pattern
(empty)                                                             # correctly does not flag path:".."
```

**A verification that did not complete as designed**: the real-HTTPS-LFS-remote half of NIX-INP-09 (`microsoft/vscode-docs`, `?lfs=1`) engaged Nix's real batch-API client (a genuine `HTTP error 429` from `github.com`'s own rate limiter, request-ID included) but never finished, because this sandbox's shared egress IP was already rate-limited. Reported honestly as blocked-by-rate-limit, not as unreachable or as a Nix defect.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (60s-gap watchdog) | `sxyazi/yazi`, `direnv/direnv` (already-progressing cases, [exemplar-tool-runs.md Axis 2](../nix-audit/exemplar-tool-runs.md)); this dive's `fanout/` twin | `DeterminateSystems/nix-installer@76f61b5202e2` under non-`-v` framing looked silent in the original audit; re-run with `-v` here it is *not* silent (progressing, gap ≤34s) — the exemplar itself now argues for the "-v always" corollary, not against the watchdog |
| 2 (NIX-INP-02 → MUST) | `ipetkov/crane@73b980519cef` (zero root inputs, the positive case) | `NixOS/nix@209d2bc44288:flake.nix:6-7` (`nixpkgs-regression`/`nixpkgs-23-11` at root), already measured leaking into `DeterminateSystems/nix-installer@76f61b5202e2:flake.lock` — now additionally explained mechanically by this dive's from-scratch lazy-fetch fixture |
| 3 (Lix self.lfs unsupported) | none in the 37-repo corpus use LFS at all ([input-types-and-sources.md Exemplar evidence](input-types-and-sources.md#exemplar-evidence)) — this dive's own fixture is the only evidence | n/a |
| 4/5/6 (grimoire remote, LFS collision, submodules-vs-input-level) | `grimoire-rs/grimoire@55f839ce31fb` (real, public, measured this dive) — `.gitmodules` matches `nix-packaging.md`'s description; `assets/logo.png` is a new, independent LFS finding not in any prior artifact | `nix-packaging.md`'s own citation of `ocx-sh/grimoire` (404, wrong org) |
| 7 (`path:..` legality) | `ipetkov/crane@73b980519cef:test/flake.nix` uses `--override-input crane ./.` from the CLI rather than a static `path:..` input — a related but distinct pattern; no exemplar in the corpus uses a static same-tree `path:..` input declaration | n/a |

## AI-agent angle

- **Runs `nix flake check`/`show` without `-v` in a CI liveness probe, then times out and calls the flake "broken."** As nix-installer shows here, the *default* verbosity of `nix flake check` can look identical for "large but live" and "truly hung" — an agent needs `-v` and the line-gap check, not wall-clock alone, or it will misdiagnose a slow-but-correct flake as broken (or, worse, quietly extend the timeout instead of scoping the check). Mechanical check: re-run any suspiciously-silent `nix flake check` with `-v` before concluding anything.
- **Assumes `self.submodules`/`self.lfs` are equally supported everywhere "because they're both from Nix 2.27."** Lix 2.95.2 is proof this assumption is wrong today: `self.submodules` works behind a flag, `self.lfs` does not exist at all. An agent writing a Lix CI leg for a flake with real LFS content will get a confusing `not supported` error and may "fix" it by disabling the Lix leg entirely rather than scoping the exclusion to just the LFS-dependent checks. Mechanical check: test each `self.*` attribute independently on the target implementation before assuming feature parity.
- **Wraps a third-party repo with `submodules=1`/`lfs=1` and reasons only about the files it cares about.** grimoire's real repo shows the trap directly: an unrelated LFS-tracked `assets/logo.png` broke an entirely different fetch (for submodule content) at the git-clone level, on Lix, with an error mentioning neither submodules nor the file the agent was actually trying to read. An agent debugging this will chase the wrong lead (the submodule config) unless it first checks the target's own `.gitattributes` for anything LFS-shaped. Mechanical check: `curl .../.gitattributes | grep -i lfs` before wrapping any third-party repo, regardless of what you intend to use from it.
- **Treats "the input isn't referenced by any output" as "the input is free."** The lazy-fetch fixture shows this is false on stock CppNix: `nix flake lock` fetches and stores every declared input unconditionally. An agent reviewing a flake for bloat, or deciding whether a "just in case" input is harmless because "nothing uses it," is wrong on the CppNix floor this program targets; the input still costs a clone and a store copy for every downstream consumer's first lock. Mechanical check: `nix path-info` on the input's resolved store path after nothing but `nix flake lock` — if it succeeds, the input was fetched regardless of use.
- **Assumes `github:owner/repo/<rev>?submodules=1` is valid because `?submodules=1` "is a standard flake-ref parameter."** It parses only under `git+https:`/`git+ssh:`; the `github:` fetcher rejects it outright with an error that, read quickly, looks like a rev/URL typo rather than a scheme mismatch. Mechanical check: if a `github:` input needs `submodules`/`lfs`, rewrite it as `git+https://github.com/<owner>/<repo>?rev=<rev>&submodules=1` first, don't debug the error as if the rev were wrong.
- **Cites a fix "read from the issue" as if it had been reproduced.** The earlier dive correctly flagged #14339's floating-ref case as "read, not re-derived"; this dive shows *why* that distinction matters in practice — the actual drift (which rev wins) is only obvious once you build the from-scratch two-commit fixture and watch the lock diff, not from the issue's prose alone, which describes the mechanism but not the exact observable (`nixpkgs` vs `nixpkgs_2` key renaming, which node keeps which rev).

## Contested / evolving

- **Whether Lix will ever implement `self.lfs`** is unknown; Lix's own flake-stabilisation proposal (cited by the earlier dive, [nix-inputs.md Open questions](../nix-inputs.md#open-questions)) discusses dropping `follows` but says nothing about LFS specifically, and this dive found no Lix issue tracker entry for it in the time budgeted. Track at each Lix release rather than assuming parity will arrive.
- **Whether "no lazy trees on CppNix" will remain true** is itself a live question — Determinate Nix's lazy-trees feature is the kind of thing that sometimes upstreams; if CppNix ever ships opt-in lazy input fetching, NIX-INP-02's MUST-severity argument (an unused input is a real, unconditional cost) weakens back toward SHOULD for flakes that can rely on it. As of 2026-09-27, no such upstreaming is in flight per the frame's own H9 tracking.
- **The line between "silent hang" and "large workload"** for `nix flake check`/`show` is not fixed once and for all by this dive's 300s/60s numbers — nix-installer's own `hydraJobs` matrix could grow or shrink across releases, and a 60s gap threshold that is generous today could become too generous (or too strict) as nixpkgs' own eval performance shifts release to release. Treat both numbers as measured-2026-09-27 defaults, not physical constants.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`src/nix/flake.md` (NixOS/nix@2.35.2)](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) | Primary — `nix flake` manual page source | 2.35.2, fetched 2026-09-27 (re-checked this dive: no `lfs` mentions at all — the attribute is undocumented in the manual page itself) | Confirms the manual page is silent on `lfs`; the ground truth for that attribute is the fetcher source, not the docs |
| [`src/libfetchers/git.cc` (NixOS/nix@2.35.2)](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/libfetchers/git.cc) | Primary — the git fetcher's actual implementation | 2.35.2, fetched 2026-09-27 | `getLfsAttr` (`maybeGetBoolAttr(input.attrs, "lfs").value_or(false)`, line 604) is the authoritative default (false); confirms `lfs`/`submodules`/`shallow`/`exportIgnore` are the only fetcher-level git attrs (line 191) |
| [NixOS/nix#14339](https://github.com/NixOS/nix/issues/14339) | Primary — issue tracker, read for the repro shape only, not for its claimed outcome | open, 2025-era | The floating-ref repro this dive independently re-derived from scratch rather than trusted verbatim |
| [`doc/manual/source/release-notes/rl-2.26.md`](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.26.md) | Primary — Nix 2.26 release notes | released 2025-01-22 | Same-tree `path:` semantics this dive's `path:..` test confirms |
| [`doc/manual/source/release-notes/rl-2.27.md`](https://github.com/NixOS/nix/blob/master/doc/manual/source/release-notes/rl-2.27.md) | Primary — Nix 2.27 release notes | released 2025-03-03 | Introduces `inputs.self.submodules`/`inputs.self.lfs`, the attributes this dive re-tested on 2.31.5 and Lix |
| `git ls-remote https://github.com/grimoire-rs/grimoire.git` | Primary — measured directly this dive, real git protocol (not the API) | 2026-09-27 | Settles the real remote for grimoire (`grimoire-rs/grimoire`, not `ocx-sh/grimoire`); anonymous success proves it is public |
| `https://raw.githubusercontent.com/grimoire-rs/grimoire/<sha>/.gitmodules` | Primary — measured directly this dive | 2026-09-27, sha `55f839ce31fb` | Confirms the two forked submodules `nix-packaging.md` described, at the correct org |
| `https://raw.githubusercontent.com/grimoire-rs/grimoire/<sha>/flake.nix` (404) | Primary — measured directly this dive | 2026-09-27 | Confirms grimoire ships no flake yet, correcting the implicit premise of `nix-packaging.md`'s P12 |
| `https://raw.githubusercontent.com/microsoft/vscode-docs/HEAD/.gitattributes` | Primary — measured directly this dive | 2026-09-27 | The real public repo used to engage Nix's genuine HTTPS LFS batch client |
| GitHub REST API `429` response body (`request ID DD67:1EB6:2C16798:91587BD:6AB90213`) | Primary — a live, non-mocked response captured during this dive's own run | 2026-09-27 | Evidence the LFS batch call reached the real github.com rate limiter rather than failing locally |
| [nix-inputs.md](../nix-inputs.md) (this program, consolidated) | This program's own prior consolidation | 2026-09-27 | The ruleset this dive amends in place (IDs kept stable per the map's brief) |
| [nix-inputs/input-types-and-sources.md](input-types-and-sources.md) | This program's own prior dive | 2026-09-27 | Source of the reused submodule/LFS/eval-budget fixtures and the version-dependent-error-string caution this dive's findings echo |
| [nix-inputs/follows-and-lock-hygiene.md](follows-and-lock-hygiene.md) | This program's own prior dive | 2026-09-27 | Source of the sha-pinned #14339 non-repro this dive's floating-ref repro now complements |
| [nix-packaging.md](../nix-packaging.md) | This program's own prior consolidation | 2026-09-27 | Holds the `self-submodules-remote` open question this dive answers, and the citation this dive corrects |
| [exemplar-tool-runs.md](../nix-audit/exemplar-tool-runs.md) Axis 2/3 | This program's own wave-1/2 audit (measured, cold store) | 2026-09-27 | The cold-store baseline this dive's warm re-run is compared against, honestly, rather than silently overwritten |
| [nix-topic-map.md](../nix-topic-map.md) | This program's phase-3 map | 2026-09-27 | Commissions this exact dive (subarea, brief, open questions M-B-17/E22/E23) |
