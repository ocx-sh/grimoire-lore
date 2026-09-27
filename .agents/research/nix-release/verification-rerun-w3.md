---
title: "NIX-REL wave-3 verification rerun — nix-update write-back, implementation matrix, pushed-tag REL-16"
topic: nix-release.md (NIX-REL) — reruns the blocked/unmeasured wave-3 verifications; findings fold into nix-release.md as a revision that keeps every ID stable and appends a revision log
agent: verification-rerun-w3
model: sonnet
date_researched: 2026-09-27
sources_count: 14
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/verification-rerun-w3/{nix-update-probe,nix-update-probe-literal,nix-update-probe-rev-literal,nix-update-probe-tag-form,nix-update-probe-tag-literal}/
scope: |
  Covers exactly the three wave-3 items assigned: (1) nix-update -F write-back
  isolation plus the rev-vs-tag form comparison (REL-13); (2) the CppNix
  2.31.5 / Lix 2.95.2 implementation matrix for REL-09's README lines,
  REL-05's flake-compat bridge, and REL-16; (3) REL-16 against a real pushed
  github: tag. Does not touch REL-01/02/03/04/06/07/08/10/11/14/15, does not
  prototype flakehub-push (owner Q1 stands), and does not re-derive the
  NIX-REL verdict text — that is the consolidator's job when folding this in.
---

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1. The "cannot rename" error is real but is not why the hash wasn't written back](#f1)
   - [F2. `replace_hash` is a verbatim text substitution over the OLD evaluated hash value](#f2)
   - [F3. REL-13's true failure mode is silent, not a build break](#f3)
   - [F4. The `tag` form (map E24) behaves identically to `rev`, given the F2 precondition](#f4)
   - [F5. Implementation matrix: CppNix 2.31.5 and Lix 2.95.2 add nothing new to C3](#f5)
   - [F6. flake-compat bridge is implementation-agnostic](#f6)
   - [F7. REL-16 generalizes from `git+file:` to a real pushed `github:` tag](#f7)
   - [F8. Determinate Nix 3.22.5 cannot be supplied by this corpus](#f8)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The wave-1 "ENVIRONMENT FAULT" hypothesis for REL-13 is **wrong**: the nested-bwrap `cannot rename: Permission denied` is real, reproducible, and printed by Nix itself — but Nix labels it `error (ignored)` and still emits the `got: sha256-…` line nix-update needs, so it never blocked hash discovery.
- The actual cause: `nix-update`'s `replace_hash()` does a **verbatim text substring replace** of the *old evaluated hash value* in the source file (`nix_update/dependency_hashes.py:24-30`, v1.16.0). It never special-cases the `lib.fakeHash` symbol.
- **If a `package.nix` writes `hash = lib.fakeHash;`** (the symbol), `nix-update -F --version=X --src-only` bumps `version` but leaves the file containing the literal text `lib.fakeHash` — exit 0, no warning, no diagnostic. Reviewers must grep for leftover `lib.fakeHash`/`lib.fakeSha256` after any nix-update run.
- **If the file instead writes the literal SRI string** (`hash = "sha256-AAAA…=";`, the value `lib.fakeHash` evaluates to), the same command replaces it with the real hash correctly — proven on both the `rev`-interpolated and the nixpkgs-preferred `tag`-interpolated forms.
- **REL-13's real defect is worse than "nothing happens."** With a **literal, non-interpolated** `rev`/`tag` (`rev = "v0.2.14";` instead of `rev = "v${finalAttrs.version}";`), `nix-update -F --version=0.2.15` bumps `version` to `0.2.15` **and rewrites the hash** — to the hash of the **stale 0.2.14 source**, because the fetch never moved. The package now claims 0.2.15 but silently ships 0.2.14's bytes, and `git diff` shows both `version` and `hash` changed, which looks like a correct update.
- **This falsifies the wave-1/consolidation verification method for REL-13.** "Confirm `rev` or the hash changed too" ([vt] run 7 / nix-release.md's REL-13 check) is **not sufficient**: in the violation case the hash *does* change. The correct mechanical check is a grep for a literal, version-shaped `rev =`/`tag =` value, not a diff of the hash.
- **REL-13 should move from SHOULD to MUST.** A silent, review-passing version/content mismatch is a supply-chain-grade defect, not a style nit.
- **REL-13's example should switch from `rev` to `tag`** (map E24, resolved): `tag = "v${finalAttrs.version}";` inside `mkDerivation (finalAttrs: {…})` behaves identically to the interpolated `rev` form and matches nixpkgs's own documented preference for a named tag.
- **The implementation matrix adds no new divergence beyond C3.** On CppNix 2.31.5: `nix run`, `nix profile add`, and `nix profile install` (deprecation warning only) all exit 0, matching 2.35.2. On Lix 2.95.2: `nix run` and `nix profile install` exit 0; `nix profile add` exits 1 with `'add' is not a recognised command` — the exact C3 result, now confirmed at the README-consumer-flow level, not just `--help`.
- **The `NixOS/flake-compat` bridge is implementation-agnostic.** `nix-build` on the `compat-nixos` fixture exits 0 and produces the identical store path on both CppNix 2.31.5 and Lix 2.95.2; `nix-shell --run true` exits 0 on both (a `<nixpkgs>`-not-in-`NIX_PATH` warning appears identically on both engines — an artifact of this sandbox having no channel, not an implementation difference, and not a REL-05 finding).
- **REL-16 generalizes to a real pushed tag.** `nix run --no-write-lock-file "github:Mic92/nixpkgs-review/4.0.0" -- --version` resolves a default program with no attribute path given, builds (mostly cache-substituted), and prints `nixpkgs-review 4.0.0`, exit 0 — the same shape as the local `git+file:` `run-good` twin.
- **Determinate Nix 3.22.5 cannot be measured from this corpus.** The pinned nixpkgs (26.11pre, rev `8d5d2709`) packages `fh` (the FlakeHub CLI) but has no `determinate-nix` attribute at all; Determinate ships its own installer, not a nixpkgs derivation. Per owner Q6, record as untested, not broken.
- **No wording change needed for REL-05 or REL-09** beyond citing the implementation floor explicitly (2.31.5, 2.35.2, Lix 2.95.2 all pass identically). **REL-16's wording gains one clause**: "also holds against a real pushed `github:owner/repo/vX.Y.Z` ref, not only a local `git+file:` one," plus the Determinate Nix untested note.
- Every run in this artifact used `/home/mherwig/.cache/research-lang/nix-tools/run.sh`; the environment check (`timeout 60 … nix --version` → `nix (Nix) 2.35.2`) passed before any work, so there is no environment fault to report.

## Findings

### F1. The "cannot rename" error is real but is not why the hash wasn't written back {#f1}

Re-running `nix-update -F --version=0.2.15 --src-only flake-checker-probe` against a fresh copy of the wave-1 `nix-update-probe` fixture (rebuilt at its pre-update state: `version = "0.2.14"`, `rev = "v${finalAttrs.version}"`, `hash = lib.fakeHash;`) reproduced the exact stderr from wave 1 when the underlying hash-discovery build was run directly:

```
unpacking source archive /build/download.tar.gz
error (ignored): filesystem error: cannot rename: Permission denied [/nix/store/hxp6…-source.drv.chroot/root/nix/store/bqfq…-source] [/nix/store/bqfq…-source]
error: hash mismatch in fixed-output derivation '/nix/store/hxp6…-source.drv':
         specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
            got:    sha256-J0RAJJdpKYgMeV8+aojCRKVkXWa4PzdaAJHLjZInB4E=
```
(`nix-build` exit 102.) The rename failure is a genuine, reproducible artifact of running Nix's own fixed-output-derivation sandbox **nested inside** run.sh's outer bwrap: the inner build tries to `rename()` its finalized output across the bind-mount boundary from `…drv.chroot/root/nix/store/…` to the real `/nix/store/…`, and the nested user namespace denies the cross-mount rename. This is the same class of issue as [NixOS/nix#4295](https://github.com/NixOS/nix/issues/4295) ("moving build output … from the sandbox to the Nix store: Permission denied"), a known failure mode of nested/chroot-inside-chroot Nix sandboxes.

Critically, **Nix prints this as `error (ignored):`** and proceeds to the real fixed-output hash-mismatch comparison, which is what actually fails (by design — this is how `nix-update` discovers the true hash: it deliberately builds with a wrong `outputHash` and parses the mismatch's `got:` line). The rename failure never reaches nix-update as an exception; nix-update's `run(..., check=False)` captures the subprocess's stderr regardless of exit code and regex-matches it (`nix_update/dependency_hashes.py`, `extract_hash_from_nix_error`). Both twins built in this rerun (fake-hash-symbol and literal-fake-hash-text) hit the identical rename message, yet one of them **did** get its hash written back correctly (F2). This proves the rename message is a constant, harmless artifact of the sandboxing setup, not the variable that explains the write-back outcome — the wave-1 "environment fault" attribution was a misdiagnosis.

### F2. `replace_hash` is a verbatim text substitution over the OLD evaluated hash value {#f2}

Reading `nix-update` 1.16.0's own source (matches `/nix/store/5iaf8jhfy3p2snck3b321pjhgfk6n8z7-nix-update-1.16.0` inside the toolchain and the public [`v1.16.0` tag](https://github.com/Mic92/nix-update/blob/v1.16.0/nix_update/dependency_hashes.py#L24-L30)):

```python
def replace_hash(filename: str, current: str, target: str) -> None:
    normalized_hash = to_sri(target)
    if to_sri(current) != normalized_hash:
        with fileinput.FileInput(filename, inplace=True) as f:
            for original_line in f:
                modified_line = original_line.replace(current, normalized_hash)
                print(modified_line, end="")
```

`current` is `package.hash`, which `eval.nix` sets to `pkg.src.outputHash or null` — the **evaluated value**, not source text (`nix_update/eval.nix`, no `hash_position` is ever exported; only `version_position` gets `unsafeGetAttrPos` treatment). For `hash = lib.fakeHash;`, that evaluated value is nixpkgs's well-known placeholder `"sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="` — but the **file's raw text** contains the six characters `lib.fakeHash`, never that string. `original_line.replace(current, normalized_hash)` therefore finds nothing to replace, the loop still rewrites the file byte-for-byte via `fileinput`, and the command exits 0 with **no diagnostic whatsoever**.

Verified with a controlled pair, same version bump, same everything else:

| Fixture | `hash =` as written | After `nix-update -F --version=0.2.15 --src-only` |
|---|---|---|
| `nix-update-probe` (symbol) | `lib.fakeHash;` | `version` → `0.2.15`; `hash` **unchanged**, still `lib.fakeHash;` — silent no-op |
| `nix-update-probe-literal` (literal text) | `"sha256-AAAA…=";` | `version` → `0.2.15`; `hash` → `"sha256-J0RAJJdp…=";` — correct |

Neither run printed an error; both exited 0. `nix-update`'s own README ([raw](https://raw.githubusercontent.com/Mic92/nix-update/main/README.md)) documents no `lib.fakeHash`-priming workflow at all — its examples all assume an existing real hash is already on disk as literal text and only that gets swapped for a new real hash.

### F3. REL-13's true failure mode is silent, not a build break {#f3}

The wave-1/consolidated check for REL-13 was: *"`nix-update -F --version=<new> --src-only <attr>`, then `git diff`: `rev` or the hash must change as well as `version`."* This rerun shows that check is **insufficient** — it can pass on a violation.

Built a literal (non-interpolated) rev twin: `rec { version = "0.2.14"; src = fetchFromGitHub { … rev = "v0.2.14"; hash = "sha256-AAAA…="; }; }`. Running the identical command:

```
version = "0.2.15"   # bumped, as expected
rev      = "v0.2.14" # UNCHANGED — the fetch still points at the old release
hash     = "sha256-MUbF2mOrcoODe26j0OaXHLk73yFhB+0/d2yPaeBEi6M=" # CHANGED — but to the hash of the STALE v0.2.14 tarball
```

`nix-update` re-derived the hash for whatever `rev` currently says (`v0.2.14`, since the literal wasn't touched), got a real, correct hash **for that stale content**, and wrote it in. Both `version` and `hash` changed, exactly what the old check looked for — and the check would report PASS on a package that now claims to be `0.2.15` while actually building `0.2.14`'s bytes. This is a **silent divergence** a reviewer's `git diff` will not catch either: two attributes changed, everything looks like a normal version bump, and `nix build` succeeds (the hash matches the content it actually fetched).

The nixpkgs-preferred `tag` attribute reproduces the identical defect when written as a literal (`tag = "v0.2.14";`): `version` → `0.2.15`, `tag` unchanged at `v0.2.14`, hash rewritten to match the stale content. Interpolating `tag`/`rev` from `finalAttrs.version` is not a style preference — it is the only thing that makes the fetch and the version move together at all.

### F4. The `tag` form (map E24) behaves identically to `rev`, given the F2 precondition {#f4}

nixpkgs's own fetchers documentation states the preference directly: *"If you need to fetch a tag however, you should prefer to use the `tag` parameter which achieves this in a safer way with less boilerplate."* ([`doc/build-helpers/fetchers.chapter.md:866`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/doc/build-helpers/fetchers.chapter.md), and again at line 770: *"This is safer than just setting `rev = version` w.r.t. possible branch and tag name conflicts."*) `NIX-PKG-02` already used `tag`; `REL-13` had only measured `rev` (map conflict E24).

Ran the same four-way matrix on `tag`:

| Form | Result |
|---|---|
| `tag = "v${finalAttrs.version}";`, hash as literal text | `version`→0.2.15, `tag` moves with it (still an unresolved interpolation, correctly re-evaluated), `hash`→ correct new hash. Same as the `rev` compliant twin. |
| `tag = "v0.2.14";` (literal, not interpolated) | `version`→0.2.15, `tag` **stays** `v0.2.14`, `hash`→ hash of the stale v0.2.14 content. Same silent defect as F3. |

`tag` and `rev` are interchangeable for nix-update's purposes; the interpolation requirement is what matters, not which attribute name is used. E24 is resolved: REL-13 keeps its interpolation-requirement text, and its example becomes the `tag` form.

### F5. Implementation matrix: CppNix 2.31.5 and Lix 2.95.2 add nothing new to C3 {#f5}

Ran the README-consumer-flow commands (not just `--help`) against the `run-good` fixture (tag `v1.2.3`, `reltool` reads its version from `Cargo.toml`) on both floors, each against a fresh isolated `--profile`:

| Command | CppNix 2.31.5 | Lix 2.95.2 |
|---|---|---|
| `nix run --no-write-lock-file "git+file://…/run-good?ref=refs/tags/v1.2.3" --` | `reltool 1.2.3`, exit 0 | `reltool 1.2.3`, exit 0 |
| `nix profile add --profile <iso> …` | exit 0, no warning | `error: 'add' is not a recognised command`, **exit 1** |
| `nix profile install --profile <iso> …` | `warning: 'install' is a deprecated alias for 'add'`, exit 0 | exit 0, no warning (this is Lix's only verb) |

This is exactly [C3](../nix-release.md#consolidation-verification-runs)'s `--help`-level result, now confirmed at the level a consumer actually runs, and matches the public report ["`nix profile add` doesn't exist in lix" (ryanccn/attic-action#49)](https://github.com/ryanccn/attic-action/issues/49) and Lix's own [`nix profile install` reference](https://docs.lix.systems/manual/lix/stable/command-ref/new-cli/nix3-profile-install.html), which documents no `add` verb at all. No new divergence surfaced; REL-09's three-line README block (with the `install` fallback comment) is necessary and sufficient on all three floors measured to date (2.31.5, 2.35.2, Lix 2.95.2).

### F6. flake-compat bridge is implementation-agnostic {#f6}

Ran the `compat-nixos` fixture (`inputs.flake-compat = { url = "github:NixOS/flake-compat"; flake = false; }`, `default.nix`/`shell.nix` reading `flake.lock` for the pin) on both floors:

| Command | CppNix 2.31.5 | Lix 2.95.2 |
|---|---|---|
| `nix-build . --no-out-link` | `/nix/store/abf9fs49lfx8jz6340h4mwnla472djbj-octool-fixture-0.1.0`, exit 0 | **identical store path**, exit 0 |
| `nix-shell . --run true` | exit 0 | exit 0 |

Both engines also print, identically, `error: file 'nixpkgs' was not found in the Nix search path` followed by `uses/will use bash from your environment` during `nix-shell` — this is `nix-shell`'s own bootstrap looking for `<nixpkgs>` in `$NIX_PATH` to find an interactive bash (this sandbox has no channel registered), a step unrelated to whether the fixture's `shell.nix` content is reachable, and it does not affect the exit code. It is not a REL-05 finding: it reproduces identically on both implementations and both runs still exit 0. No REL-05 wording change; add a footnote so a future author does not misread that stderr line as a flake-compat failure.

### F7. REL-16 generalizes from `git+file:` to a real pushed `github:` tag {#f7}

The consolidated REL-16 check was only run against `git+file:` fixtures (C8: `run-good`/`run-bad`). Ran it against `Mic92/nixpkgs-review`'s real, pushed `4.0.0` tag (latest of 20 tags on the remote, confirmed via `git ls-remote --tags`):

```
$ nix run --no-write-lock-file "github:Mic92/nixpkgs-review/4.0.0" -- --version 2>/dev/null | grep -F -w 4.0.0
nixpkgs-review 4.0.0
```
Exit 0. `nix run` resolved a runnable default with **no attribute path given at all** (`packages.x86_64-linux.default` or an `apps` entry), fetched the release's tarball, substituted most Python/nix dependency closure paths from `cache.nixos.org`, built the package itself, and ran it — the same shape REL-16 verifies locally, now against a real remote release. One correction to the brief's premise: this exemplar's own flake/`default.nix` set no literal `meta.mainProgram` attribute findable by grep (`grep -rn -e mainProgram --include='*.nix' .` in the exemplar tree is empty); the runnable default most likely comes from `buildPythonApplication`'s default of `meta.mainProgram = pname` (nixpkgs default since pname/mainProgram unification), not from an attribute this repository wrote itself. REL-16 does not require the exemplar to declare `mainProgram` explicitly — only that `nix run <tag>` resolves *a* default and prints the tag's version — and that held.

### F8. Determinate Nix 3.22.5 cannot be supplied by this corpus {#f8}

Enumerated `nixVersions` in the pinned nixpkgs (`github:NixOS/nixpkgs/8d5d2709…#nixVersions`, `builtins.attrNames`): `nix_2_4` through `nix_2_35`, `nixComponents_2_27`…`_2_35`, `stable`, `unstable`, `latest`, `minimum` — **no `determinate` entry**. Direct attribute probes for `determinate-nix`, `determinate`, `determinate-nixd` all fail with "does not provide attribute"; only `fh` (the FlakeHub CLI, `0.1.27`) exists. Determinate Nix is not a nixpkgs derivation — Determinate Systems ships it as its own installer/binary bundle ([docs.determinate.systems/determinate-nix](https://docs.determinate.systems/determinate-nix/)), and the current series (3.22.2, based on upstream Nix 2.35.2 per its [changelog](https://determinate.systems/blog/changelog-determinate-nix-3-22-2/)) is not reachable through `nix shell nixpkgs#…` at all. Fetching and running a third-party installer binary is outside this program's store-discipline rules (only `run.sh`, no second store, no direct nix-portable invocation). Per owner Q6's default ("untested, never deliberately broken"): record Determinate Nix as **untested by this corpus**, not as failing.

## Normative guidance candidates

1. **After any `nix-update -F` run that touches a source hash, grep the touched file(s) for a leftover `lib.fakeHash`/`lib.fakeSha256` symbol.** Rationale: `replace_hash` is a verbatim text match against the *value* nix-update evaluated, and the symbol's source text never equals that value, so a leftover symbol means the write-back silently did nothing (F1, F2). Verify: `grep -rn -e 'lib\.fakeHash' -e 'lib\.fakeSha256' --include='*.nix' .` (directory operand `.`); nonzero output = the update did not complete. **RUN**, fixtures `nix-update-probe` (hit, exit 0) / `nix-update-probe-literal` (empty, exit 1).
2. **When priming a placeholder for `nix-update` to discover a hash, write the literal current SRI text (e.g. the exact string `"sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="`), not the `lib.fakeHash` symbol, if the write-back must happen automatically** — or treat the symbol form as requiring a manual follow-up hash paste. Rationale: same as (1); this is the operational fix. Verify: same grep as (1), run before committing the "final" diff. **RUN**, same fixtures as (1).
3. **MUST (revised from SHOULD): `rev`/`tag` in any `fetchFromGitHub`/`fetchFromGitLab`-style `package.nix` that is meant to track `version` MUST be interpolated (`rev/tag = "v${finalAttrs.version}"`), never a literal that merely looks like the current version.** Rationale: a literal ref lets `nix-update -F --version=X` bump `version` and rewrite `hash` to match the *unrelated, stale* content the un-bumped ref still points at — a silent, review-passing correctness defect, not a build failure (F3). This is a severity escalation from nix-release.md's current SHOULD: the failure is undetectable by the diff itself. Verify: `grep -rn -e 'rev = "v[0-9]' -e 'tag = "v[0-9]' --include='*.nix' .`; any hit is a literal, version-shaped ref that must be re-checked against the current `version` by hand or replaced with interpolation. Empty output = pass. **RUN**, fixtures `nix-update-probe-rev-literal` (hit line 8, exit 0) / `nix-update-probe-tag-literal` (hit line 8, exit 0) / `nix-update-probe` and `-tag-form` (empty, exit 1).
4. **Never trust "the hash also changed" as proof that a version bump was correct.** Rationale: F3 shows the hash changing is consistent with both a correct bump *and* a silently-stale one; the hash always matches whatever content was actually fetched, correct or not. Verify: rule 3's grep is the actual proof; a hash diff alone is not. **RUN** (this is a correction to a previously-relied-on check, not a new command — same evidence as rule 3).
5. **Prefer nixpkgs's `tag` argument over `rev` when the target is a real tag, for both `fetchFromGitHub` and the sibling forge fetchers.** Rationale: nixpkgs's own docs state this preference plainly, and this rerun shows `tag` and `rev` are equivalent from `nix-update`'s perspective, so there is no write-back cost to preferring `tag` (F4). Verify: reading heuristic over nixpkgs `doc/build-helpers/fetchers.chapter.md`; no command distinguishes "should" from "did," since both work when interpolated. **NO** (documentation-preference rule, not independently runnable beyond rule 3's mechanical check, which covers both attribute names).
6. **The README's `nix profile add` / `nix profile install` fallback pairing (REL-09) needs no per-implementation variant.** Rationale: identical exit-code behavior confirmed on CppNix 2.31.5, CppNix 2.35.2, and Lix 2.95.2 (F5). Verify: `nix profile add --profile <iso-dir> <ref>` then `nix profile install --profile <iso-dir> <ref>` against a throwaway `--profile`, once per floor; exit 0/1 pattern must match the table in F5. **RUN**, `fixtures/nix-release/run-good` at tag `v1.2.3`, three floors.
7. **The `NixOS/flake-compat` bridge (REL-05) needs no per-implementation variant either.** Rationale: `nix-build`/`nix-shell` both exit 0 and produce the same store path on CppNix 2.31.5 and Lix 2.95.2 (F6). A `<nixpkgs>`-not-in-`$NIX_PATH` warning from `nix-shell`'s own bash bootstrap is not evidence against this — it appears identically on both engines and does not change the exit code. Verify: `nix-build <dir> --no-out-link && nix-shell <dir> --run true`, both must exit 0; ignore the `NIX_PATH` warning line specifically. **RUN**, `fixtures/publishing-and-consumer-ux/compat-nixos`, two floors.
8. **REL-16's smoke test holds against a real pushed `github:` tag, not only a local `git+file:` ref; run it that way whenever the tag is already pushed.** Rationale: proves the actual public resolution path, not a simulation of it (F7). Verify: `nix run "github:<owner>/<repo>/<tag>" -- --version 2>/dev/null | grep -F -w <tag-without-v>`; exit 0 = pass. **RUN**, `github:Mic92/nixpkgs-review/4.0.0` → `nixpkgs-review 4.0.0`, exit 0.
9. **Do not claim Determinate Nix compatibility (or incompatibility) without a direct measurement against its own installer; nixpkgs cannot substitute for it.** Rationale: the pinned nixpkgs has no `determinate-nix` package to test against (F8), so any claim about Determinate Nix behavior in this program is a reading heuristic, not a run. Verify: `nix eval --raw "github:NixOS/nixpkgs/<rev>#nixVersions" --apply 'v: builtins.attrNames v'` must not contain a `determinate` entry for this statement to still hold; re-measure if it ever does. **RUN** (probe itself, confirming absence) — the underlying compatibility claim stays **NO** (not run).

## Verification runs

All commands ran through `/home/mherwig/.cache/research-lang/nix-tools/run.sh`. Environment check: `timeout 60 run.sh nix --version` → `nix (Nix) 2.35.2`, immediate — no environment fault, no ENVIRONMENT FAULT report needed. Store was warm for nixpkgs `8d5d2709` eval/toolchain closures throughout (fetched in earlier waves); the `flake-checker` source tarball fetch was cold (fresh network download) on every hash-discovery build; the Lix/2.31.5 `nixVersions`/`lix` closures were binary-substituted from `cache.nixos.org` (cold session-cache, no compiling); the `nixpkgs-review` build at F7 substituted its whole Python dependency closure from `cache.nixos.org` and only actually built the `nixpkgs-review.drv` derivation itself.

```sh
# --- Item 1: nix-update write-back isolation (F1-F3) ---
# All four fixtures below start from version=0.2.14 and are bumped to 0.2.15 with:
#   nix-update -F --version=0.2.15 --src-only flake-checker-probe   (TMPDIR set inside the fixture)

# R1 — symbolic fakeHash, interpolated rev: version-only, silent no-op on hash
cd fixtures/verification-rerun-w3/nix-update-probe
env TMPDIR=$PWD/tmp nix-update -F --version=0.2.15 --src-only flake-checker-probe
# exit=0; no error printed
grep -rn -e 'lib\.fakeHash' --include='*.nix' .   # hit at package.nix:9 -> exit=0 (RED: hash never replaced)

# R2 — literal fakeHash text, interpolated rev: version AND hash both correct
cd fixtures/verification-rerun-w3/nix-update-probe-literal
env TMPDIR=$PWD/tmp nix-update -F --version=0.2.15 --src-only flake-checker-probe
# exit=0; hash -> sha256-J0RAJJdpKYgMeV8+aojCRKVkXWa4PzdaAJHLjZInB4E=
grep -rn -e 'lib\.fakeHash' --include='*.nix' .   # empty -> exit=1 (GREEN)

# R3 — literal (non-interpolated) rev, literal fakeHash text: SILENT STALE UPDATE
cd fixtures/verification-rerun-w3/nix-update-probe-rev-literal
env TMPDIR=$PWD/tmp nix-update -F --version=0.2.15 --src-only flake-checker-probe
# exit=0; version -> 0.2.15, rev UNCHANGED "v0.2.14", hash -> sha256-MUbF2mOrcoODe26j0OaXHLk73yFhB+0/d2yPaeBEi6M= (hash of STALE v0.2.14 content)
grep -rn -e 'rev = "v[0-9]' -e 'tag = "v[0-9]' --include='*.nix' .   # hit "rev = \"v0.2.14\";" -> exit=0 (RED)

# R4 — tag form, interpolated (map E24): behaves exactly like R2
cd fixtures/verification-rerun-w3/nix-update-probe-tag-form
env TMPDIR=$PWD/tmp nix-update -F --version=0.2.15 --src-only flake-checker-probe
# exit=0; hash -> sha256-J0RAJJdpKYgMeV8+aojCRKVkXWa4PzdaAJHLjZInB4E= (identical to R2)
grep -rn -e 'rev = "v[0-9]' -e 'tag = "v[0-9]' --include='*.nix' .   # empty -> exit=1 (GREEN)

# R5 — tag form, literal (non-interpolated): behaves exactly like R3
cd fixtures/verification-rerun-w3/nix-update-probe-tag-literal
env TMPDIR=$PWD/tmp nix-update -F --version=0.2.15 --src-only flake-checker-probe
# exit=0; version -> 0.2.15, tag UNCHANGED "v0.2.14", hash -> sha256-MUbF2mOrcoODe26j0OaXHLk73yFhB+0/d2yPaeBEi6M=
grep -rn -e 'rev = "v[0-9]' -e 'tag = "v[0-9]' --include='*.nix' .   # hit "tag = \"v0.2.14\";" -> exit=0 (RED)

# R6 — direct repro of the raw hash-discovery build behind nix-update (isolates F1)
nix-build --expr 'let src = (let flake = builtins.getFlake "<probe-dir>"; in
  flake.packages.${builtins.currentSystem}."flake-checker-probe" or flake."flake-checker-probe").src;
  in (src.overrideAttrs or (f: src // f src)) (_: { outputHash = ""; outputHashAlgo = "sha256"; })' \
  --extra-experimental-features 'flakes nix-command'
# stderr: "error (ignored): filesystem error: cannot rename: Permission denied […]"
#         "error: hash mismatch … got:    sha256-J0RAJJdpKYgMeV8+aojCRKVkXWa4PzdaAJHLjZInB4E="
# exit=102 (the standard fixed-output hash-mismatch exit code) — the rename error is present but harmless

# --- Item 2: implementation matrix (F5, F6) ---
# R7 — README consumer flow, CppNix 2.31.5
nix shell nixpkgs#nixVersions.nix_2_31 --command nix run --no-write-lock-file \
  "git+file://<FX>/nix-release/run-good?ref=refs/tags/v1.2.3" --          # "reltool 1.2.3", exit=0
nix shell nixpkgs#nixVersions.nix_2_31 --command nix profile add --profile <iso> \
  --no-write-lock-file "git+file://<FX>/nix-release/run-good?ref=refs/tags/v1.2.3"   # exit=0
nix shell nixpkgs#nixVersions.nix_2_31 --command nix profile install --profile <iso2> \
  --no-write-lock-file "git+file://<FX>/nix-release/run-good?ref=refs/tags/v1.2.3"   # warns "deprecated alias", exit=0

# R8 — README consumer flow, Lix 2.95.2
nix shell nixpkgs#lix --command nix run --no-write-lock-file \
  "git+file://<FX>/nix-release/run-good?ref=refs/tags/v1.2.3" --          # "reltool 1.2.3", exit=0
nix shell nixpkgs#lix --command nix profile add --profile <iso> \
  --no-write-lock-file "git+file://<FX>/nix-release/run-good?ref=refs/tags/v1.2.3"   # "error: 'add' is not a recognised command", exit=1
nix shell nixpkgs#lix --command nix profile install --profile <iso2> \
  --no-write-lock-file "git+file://<FX>/nix-release/run-good?ref=refs/tags/v1.2.3"   # exit=0, no warning

# R9 — flake-compat bridge, both floors, fixtures/publishing-and-consumer-ux/compat-nixos
nix shell nixpkgs#nixVersions.nix_2_31 --command nix-build <dir> --no-out-link   # …-octool-fixture-0.1.0, exit=0
nix shell nixpkgs#nixVersions.nix_2_31 --command nix-shell <dir> --run true      # NIX_PATH warning (harmless), exit=0
nix shell nixpkgs#lix --command nix-build <dir> --no-out-link                    # same store path, exit=0
nix shell nixpkgs#lix --command nix-shell <dir> --run true                       # same NIX_PATH warning, exit=0

# --- Item 3: REL-16 on a real pushed tag (F7) ---
# R10
git ls-remote --tags https://github.com/Mic92/nixpkgs-review.git   # newest: refs/tags/4.0.0
nix run --no-write-lock-file "github:Mic92/nixpkgs-review/4.0.0" -- --version 2>/dev/null | grep -F -w 4.0.0
# "nixpkgs-review 4.0.0", exit=0

# --- Item 2 (continued): Determinate Nix availability (F8) ---
# R11
nix eval --raw --no-write-lock-file "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439#nixVersions" \
  --apply 'v: builtins.concatStringsSep " " (builtins.attrNames v)'
# lists nix_2_4 .. nix_2_35, nixComponents_2_27..2_35, stable/unstable/latest/minimum/override/… — no "determinate" entry
nix eval --raw --no-write-lock-file "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439#fh.version"   # 0.1.27 (exists)
nix eval --raw --no-write-lock-file "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439#determinate-nix.version"
# error: … does not provide attribute … 'determinate-nix.version'
```

## Exemplar evidence

- **F2/F3 (write-back and interpolation).** No exemplar in the corpus currently ships a literal, non-interpolated `rev`/`tag` next to a version it's meant to track — this rerun's fixtures are the first planted repro of the defect class. The compliant pattern (`rev = "v${finalAttrs.version}"`) already used by `sxyazi/yazi@0ea4c5d9ef75:flake.nix` (cited in nix-release.md's Applied section) is exactly `nix-update-probe-literal`'s shape and is now confirmed to write back correctly when the hash line is literal text.
- **F4 (`tag` preference).** `nixpkgs`'s own fetchers doc ([`doc/build-helpers/fetchers.chapter.md:866`](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/doc/build-helpers/fetchers.chapter.md)) is itself the normative source for E24; no exemplar in the 38-repo corpus was audited here for `tag =` usage specifically (out of scope for this rerun — a packaging-dive question).
- **F5 (implementation matrix).** `sxyazi/yazi`, `DeterminateSystems/flake-checker`, and the fleet's planned A/D flakes all rely on the README block this confirms; no exemplar text changed as a result of this rerun.
- **F7 (REL-16 remote).** `Mic92__nixpkgs-review@c8982ae494f6` (in the exemplar corpus at `~/.cache/research-lang/exemplars/nix/Mic92__nixpkgs-review`, fetched 2026-09-26) is the exemplar; its `flake.nix` uses `flake-parts` (`config.packages.nixpkgs-review`, line 35) and sets no explicit `meta.mainProgram` findable in-tree (`grep -rn -e mainProgram --include='*.nix' Mic92__nixpkgs-review/` is empty), so the runnable default at the pushed `4.0.0` tag comes from `buildPythonApplication`'s implicit `mainProgram = pname` default, not an explicit attribute in this repository. This is a minor correction to the brief's premise that the exemplar "sets mainProgram."
- **F8 (Determinate Nix).** `DeterminateSystems/nix-installer@76f61b5202e2` and `DeterminateSystems/flake-checker@cddc8afc9733` (both in the corpus) are Determinate-authored tools but neither packages Determinate Nix itself; both are ordinary CppNix-compatible flakes.

## AI-agent angle

1. **Trusting `git diff` after `nix-update -F` as proof of a correct bump.** An agent sees `version` and `hash` both changed and concludes the update is correct — exactly the failure this rerun found (F3). Check: rule 3's grep (`rev = "v[0-9]`/`tag = "v[0-9]`) *before* trusting any nix-update diff on a package whose ref isn't interpolated.
2. **Writing `hash = lib.fakeHash;` and assuming a later `nix-update` run will resolve it, with no re-check.** It silently won't, and nothing in the command's output says so (F2). Check: rule 1's grep for leftover `lib.fakeHash`/`lib.fakeSha256` after any such run.
3. **Reading the nested-sandbox `cannot rename: Permission denied` line as a fatal error** and concluding the whole toolchain is broken, when Nix itself has already labeled it `(ignored)` and moved on to the real signal. Check: look for the `error: hash mismatch … got:` line that follows it before treating a nix-update or nix-build run as failed.
4. **Copying a non-interpolated `rev = "vX.Y.Z"` from an older nixpkgs example** (many still exist pre-`finalAttrs`) into a new `finalAttrs`-shaped derivation without switching to `"v${finalAttrs.version}"`. Check: rule 3's grep.
5. **Assuming Lix and CppNix are drop-in equivalents for every command in a README** because most of them (this rerun: `nix run`, `nix-build`, `nix-shell`, `nix profile install`) do behave identically. `nix profile add` is the one exception that still bites (F5). Check: the README must show both `add` and the `install` fallback, per REL-09; an agent authoring a fresh README from a CppNix-only test session will drop the fallback.
6. **Treating "Determinate Nix" as measurable via nixpkgs** (`nixpkgs#determinate-nix` or similar) because so many other Nix distributions are one `nixVersions.*` attribute away. It is not packaged there at all (F8); measuring it requires its own installer, out of scope for a corpus-bound toolchain.

## Contested / evolving

- **REL-13's severity.** This rerun argues for MUST given the silent-corruption failure mode (F3); the standing consolidated text has it as SHOULD. This is a genuine severity dispute for the consolidator to resolve, not a reading disagreement — the evidence is unambiguous, but "MUST" vs "SHOULD" is a policy call about how hard a fleet gate should block on it.
- **Whether `nix-update` should special-case `lib.fakeHash`.** Nothing in this rerun or in `nix-update`'s own README suggests upstream considers the symbol a supported priming value; this may simply be expected behavior from the tool's author's point of view (write the real, if wrong, hash text; let `nix-update` correct it) rather than a bug. As of 2026-09-27, no upstream issue confirming or denying this was found in the research budget for this rerun.
- **`nix-shell`'s `<nixpkgs>`-not-in-`$NIX_PATH` warning.** Whether a fleet's CI should set `$NIX_PATH`/register a channel to silence this line, or whether it's fine to leave it (since it doesn't affect `nix-shell`'s exit code for a flake-compat `shell.nix`) is a nix-gates/CI-setup question, not a NIX-REL one; flagged here so it isn't mistaken for a REL-05 regression later.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/Mic92/nix-update/blob/v1.16.0/nix_update/dependency_hashes.py](https://github.com/Mic92/nix-update/blob/v1.16.0/nix_update/dependency_hashes.py) | nix-update source, `replace_hash`/`extract_hash_from_nix_error` | v1.16.0, pinned toolchain version | Primary: the exact mechanism behind F1/F2, line-level |
| [github.com/Mic92/nix-update/blob/v1.16.0/nix_update/update.py](https://github.com/Mic92/nix-update/blob/v1.16.0/nix_update/update.py) | nix-update source, `update()`/`update_dependency_hashes` gating | v1.16.0 | Primary: shows `--src-only` still calls `update_src_hash`, ruling out a flag-gating explanation |
| [github.com/Mic92/nix-update (eval.nix, via toolchain store path)](https://github.com/Mic92/nix-update/blob/v1.16.0/nix_update/eval.nix) | nix-update's Nix-side eval expression | v1.16.0 | Primary: proves `hash` is a pure evaluated value, never a source position |
| [raw.githubusercontent.com/Mic92/nix-update/main/README.md](https://raw.githubusercontent.com/Mic92/nix-update/main/README.md) | nix-update's own usage docs | fetched 2026-09-27 | Primary: no fakeHash-priming workflow documented; confirms F2's scope |
| [raw.githubusercontent.com/NixOS/nixpkgs/…/doc/build-helpers/fetchers.chapter.md](https://raw.githubusercontent.com/NixOS/nixpkgs/7e35f59c1f8277732ccd2cff8f79a4617590ce33/doc/build-helpers/fetchers.chapter.md) | nixpkgs manual, fetchers chapter | rev `8d5d2709`, nixpkgs 26.11pre | Primary: line 866/770, the `tag`-over-`rev` preference behind E24/F4 |
| [github.com/NixOS/nix/issues/4295](https://github.com/NixOS/nix/issues/4295) | NixOS/nix issue, nested-sandbox rename permission error | long-standing, still open pattern | Primary: the known issue class matching F1's rename artifact |
| [github.com/ryanccn/attic-action/issues/49](https://github.com/ryanccn/attic-action/issues/49) | third-party report, `nix profile add` absent on Lix | 2026 | Primary: independent corroboration of F5/C3 at user-report level |
| [docs.lix.systems/manual/lix/stable/command-ref/new-cli/nix3-profile-install.html](https://docs.lix.systems/manual/lix/stable/command-ref/new-cli/nix3-profile-install.html) | Lix reference manual, `nix profile install` | Lix stable manual, 2026 | Primary: Lix's own CLI reference confirms only `install` exists |
| [docs.determinate.systems/determinate-nix/](https://docs.determinate.systems/determinate-nix/) | Determinate Systems product docs | 2026 | Primary: confirms Determinate Nix is installer-distributed, not a nixpkgs package |
| [determinate.systems/blog/changelog-determinate-nix-3-22-2/](https://determinate.systems/blog/changelog-determinate-nix-3-22-2/) | Determinate Nix 3.22.2 changelog | 2026-08-26 | Primary: confirms the 3.22 series' upstream Nix 2.35.2 base, and that no nixpkgs package is offered |
| [raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md](https://raw.githubusercontent.com/NixOS/nix/2.35.2/src/nix/flake.md) | Nix 2.35.2 flake reference | 2.35.2 tag | Primary: `self`/input metadata semantics, reused context from the standing consolidation |
| [raw.githubusercontent.com/NixOS/rfcs/master/rfcs/0136-stabilize-incrementally.md](https://raw.githubusercontent.com/NixOS/rfcs/master/rfcs/0136-stabilize-incrementally.md) | RFC 136 | undated (living RFC) | Primary: the "flakes may break" promise REL-12 relies on |
| [raw.githubusercontent.com/NixOS/flake-compat/master/README.md](https://raw.githubusercontent.com/NixOS/flake-compat/master/README.md) | `NixOS/flake-compat` README | fetched in prior wave, still current | Primary: canonical bridge, reused context for F6 |
| [github.com/Mic92/nixpkgs-review/releases/tag/4.0.0](https://github.com/Mic92/nixpkgs-review/releases/tag/4.0.0) | the pushed tag exercised in F7/R10 | tagged 2026 | Secondary: names the exact release measured |
