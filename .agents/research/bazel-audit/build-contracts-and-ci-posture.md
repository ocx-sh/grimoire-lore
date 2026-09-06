---
title: rules_ocx build contracts and CI posture — numbers-first audit
agent: bazel-audit-worker
model: sonnet
scope: /home/mherwig/dev/rules_ocx (the fleet's only Bazel repository)
method: >
  Read-only shell commands run from the repo root (cat -n, grep -n, sed -n,
  wc -l/-c, python3 -c 'json.load(...)', find, git ls-files, git status
  --porcelain --ignored=matching). Excludes .agents/worktrees and .git per
  instruction. Every number below is re-derivable from the inline command
  next to it. The credential line in .bazelrc.user was located and its
  structure described but never printed in full or copied into this file.
date_researched: 2026-09-05
---

# rules_ocx build contracts and CI posture

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Every flag in every rc file](#1-every-flag-in-every-rc-file)
- [2. Bazel version posture](#2-bazel-version-posture)
- [3. MODULE.bazel and the lockfile](#3-modulebazel-and-the-lockfile)
- [4. Remote cache posture](#4-remote-cache-posture)
- [5. Hermeticity posture of repository rules and actions](#5-hermeticity-posture-of-repository-rules-and-actions)
- [6. The ocx CLI contract: doc vs. code](#6-the-ocx-cli-contract-doc-vs-code)
- [7. Release and BCR posture](#7-release-and-bcr-posture)
- [8. Examples and e2e as consumers](#8-examples-and-e2e-as-consumers)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

- **5,855** lines of Starlark/BUILD.bazel/MODULE.bazel (`find . -path ./.git -prune -o -path './.agents/worktrees' -prune -o \( -name "*.bzl" -o -name "BUILD.bazel" -o -name "MODULE.bazel" \) -print | xargs wc -l | tail -1`) — matches the frame exactly.
- **0** `cc_binary`/`cc_library`/`cc_toolchain` targets anywhere in the repo (`grep -rn "cc_binary\|cc_library\|cc_toolchain"` over every `.bzl`/`BUILD.bazel` → no output). The `.bazelrc.user` `CC=`/`layering_check` overrides govern a toolchain nothing in this repo ever compiles against.
- **12** distinct flag kinds across all rc files (root `.bazelrc` 5, `.bazelrc.user` 5 across 5 lines — one line sets two features flags — examples/e2e add no new kind, CI append adds `remote_upload_local_results`/`remote_header`).
- **6** CI jobs in `ci.yml`: lint, test, examples, bcr-parity, pin-completeness, offline. **2 of 6** (lint, test) wire the remote cache; **2 of 6** (bcr-parity, offline) explicitly refuse it with an inline comment; **1 of 6** (examples) has neither the action nor a comment explaining the omission.
- Test matrix: **3 OS × 3 Bazel versions = 9 shards**; `rolling` runs with `continue-on-error: true` (ci.yml:38). Examples matrix: 3 OS × 3 examples on 8.7.0 (9 shards) **+ 3** Linux-only 9.x shards = **12**. BCR-parity: 2 Bazel versions × 4 platforms = **8 shards**, deliberately uncached. Offline: 2 Bazel versions × 1 OS = **2 shards**, deliberately uncached.
- `MODULE.bazel.lock`: **166,136 bytes** (`wc -c`), **5** top-level keys, `lockFileVersion` **24**, **141** `registryFileHashes` entries, **1** registry host (`bcr.bazel.build`). It is the *only* committed lockfile — `examples/*/MODULE.bazel.lock` and `e2e/*/MODULE.bazel.lock` are `.gitignore`d (confirmed with `git ls-files | grep MODULE.bazel.lock` → one hit).
- `SYSEXIT_HINTS` maps **12** of the 13 sysexits AGENTS.md's contract table names (64,65,69,74,75,77,78,79,80,81,83,84,85); **82** is deliberately absent, with a comment explaining exactly why (`ocx/private/repo_utils.bzl:152-155`) — doc and code agree, this is not a drift.
- **5** `ocx.package()` blocks across the three example dirs + e2e: **1** floating tag with no pin (`examples/package/MODULE.bazel:20-23`), **2** index-frozen (`examples/package/MODULE.bazel:28-32`, `examples/cross_platform/MODULE.bazel:19-28`), **2** digest-pinned (`examples/package/MODULE.bazel:38-47,52-62`, plus `e2e/bzlmod/MODULE.bazel:23-33`).
- **No CI job or task target checks `MODULE.bazel.lock` freshness** against `MODULE.bazel` (`grep -rn "bazel mod" taskfile.yml taskfiles/*.yml .github/workflows/*.yml` → no output). Absent, not merely unasserted.
- Remote execution is a **stated non-goal**, not a missing feature: README.md:246-249 gives the architectural reason (launchers hold absolute `OCX_HOME` store paths — the nixpkgs model — which an RBE worker cannot reproduce).

## 1. Every flag in every rc file

Commands: `cat -n .bazelrc .bazelrc.user`, `cat -n examples/*/.bazelrc e2e/bzlmod/.bazelrc`, `cat -n .github/actions/remote-cache/action.yml`. The credential value itself was never printed; its line is described in words only.

### `.bazelrc` (root, committed)

| Flag | Phase | Config | Rationale (stated / absent) | file:line |
|---|---|---|---|---|
| `--enable_platform_specific_config` | `common` | — | absent (no comment) | `.bazelrc:2` |
| `--windows_enable_symlinks` | `startup` | — | stated: "sh_test data needs a real runfiles tree, not just a manifest" | `.bazelrc:4-5` |
| `--enable_runfiles` | `common` | `windows` | same comment, covers both flags | `.bazelrc:6` |
| `--incompatible_disallow_empty_glob` | `build` | — | absent | `.bazelrc:8` |
| `--test_output=errors` | `test` | — | absent | `.bazelrc:9` |
| `try-import %workspace%/.bazelrc.user` | (directive) | — | comment above (line 11-13) explains repo-rule env visibility, not the import itself | `.bazelrc:14` |

Hermeticity-relevant: `--enable_platform_specific_config` (changes which `common:<os>`/`build:<os>` stanzas apply — indirect), `--incompatible_disallow_empty_glob` (an `--incompatible_*` flag). Neither `--windows_enable_symlinks` nor `--enable_runfiles` is a hermeticity flag; both are sandboxing/runfiles-fidelity flags for Windows `sh_test`.

### `.bazelrc.user` (gitignored, developer machine only — **not what CI builds with**)

9 lines total (`wc -l` → 9). Structure (`awk '{print NR": "length($0)" chars, starts with: "substr($0,1,20)}'`), values described without the credential:

| Line | Content (described) | Phase | Hermeticity-relevant | Notes |
|---|---|---|---|---|
| 1 | comment: "host-specific: no g++ on this box, use zig as C compiler" | — | — | states *why* line 2 exists |
| 2 | `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc` | `common` | **yes** — `--repo_env` | absolute path baked to this one machine's home directory |
| 3 | `build --features=-layering_check --host_features=-layering_check` | `build` | **yes** — weakens a C++ strictness check | two flags on one line |
| 4 | (blank) | — | — | — |
| 5-6 | comments: shared remote cache at `bazel-cache.ocx.sh`; "Reads are anonymous; the credential authorises writes. This file is gitignored — keep it that way." | — | — | matches AGENTS.md/frame description exactly |
| 7 | `build --remote_cache=https://bazel-cache.ocx.sh` | `build` | **yes** — `remote_*` | not secret, safe to quote |
| 8 | `build --remote_header=authorization="Basic <credential>"` | `build` | **yes** — `remote_*`, carries the write credential | **value never reproduced in this audit** |
| 9 | `build --remote_timeout=60` | `build` | **yes** — `remote_*` | no stated rationale for the value `60` |

**What this means for reproducibility**: CI never reads this file's content — it is regenerated at CI runtime by `.github/actions/remote-cache/action.yml` (see [§4](#4-remote-cache-posture)), and its `CC=`/`layering_check` lines are appended by *nobody* in CI. So the `zig-bazel-cc` / `layering_check` pair is **not** part of what CI, the release archive, or BCR ever build — it is purely local developer-machine configuration, and (per the headline number above) it currently governs zero targets since the repo compiles no C++.

### `examples/{cross_platform,package,project}/.bazelrc` (three files, byte-identical)

| Flag | Phase | Config | file:line |
|---|---|---|---|
| `--enable_platform_specific_config` | `common` | — | `:1` |
| `--windows_enable_symlinks` | `startup` | — | `:4` |
| `--enable_runfiles` | `common` | `windows` | `:5` |
| `--test_output=errors` | `test` | — | `:7` |

No `--incompatible_disallow_empty_glob`, no remote-cache flags, no `.bazelrc.user` try-import — each example is its own Bazel module (`local_path_override`) and does not inherit the root's rc.

### `e2e/bzlmod/.bazelrc`

Same three flags as examples, minus `--test_output=errors` (this module has no tests, only a `filegroup`). Comment at lines 1-2: "Consumer defaults, mirrored from the repo root so the launcher resolves the host platform and works under Windows runfiles."

### CI-appended flags (`.github/actions/remote-cache/action.yml`)

Appends to `.bazelrc.user` at CI runtime (this file does not exist pre-checkout in CI; the action creates it):

| Flag | Condition | file:line |
|---|---|---|
| `build --remote_cache=https://bazel-cache.ocx.sh` | always | `action.yml:27` |
| `build --remote_timeout=60` | always | `action.yml:28` |
| `build --remote_header=authorization="Basic $BAZEL_CACHE_AUTH"` | `auth` input non-empty (push to `main` only) | `action.yml:32` |
| `build --remote_upload_local_results=false` | `auth` input empty (PRs, forks) | `action.yml:34` |

Comment at `action.yml:30-31` documents *why* the header is quoted: "Bazel's rc parser splits on whitespace, so an unquoted 'Basic \<token\>' is read as a second argument." `auth` wiring: `ci.yml:30,56` → `${{ github.event_name == 'push' && secrets.BAZEL_CACHE_AUTH || '' }}` — read-write only on a push event (i.e., `main`), read-only (anonymous) everywhere else including PRs from forks.

## 2. Bazel version posture

`.bazelversion` = **8.7.0**, identical in the root and all four consumer dirs (`examples/{cross_platform,package,project}`, `e2e/bzlmod`) — `for f in .../.bazelversion; do echo "$f: $(cat $f)"; done`.

| Job | `USE_BAZEL_VERSION` values | Set at | Excludes | Rationale |
|---|---|---|---|---|
| lint | none (reads `.bazelversion` = 8.7.0 via bazelisk) | — | — | — |
| test | `8.7.0`, `9.x`, `rolling` | `ci.yml:44-45` | `//docs/...` when `!= 8.7.0` (`ci.yml:62`) | comment `ci.yml:57-60`: stardoc under Bazel 9+ emits extra `repo_mapping` rows; only the dev-pinned 8.7.0 golden `docs/*.md` matches |
| examples | `8.7.0` (all), `9.x` (3 Linux-only `include` rows) | `ci.yml:80-81` | — | comment `ci.yml:73-75`: keeps the live-registry fan-out bounded while still proving Bazel 9 consumption |
| bcr-parity | `8.7.0`, `9.x` | `ci.yml:112-113` | — | mirrors BCR's own presubmit matrix (`.bcr/presubmit.yml`: `bazel: ["8.x","9.x"]`) |
| pin-completeness | none — no bazel/bazelisk invocation at all, pure `grep`/bash | — | n/a | deterministic, arch-independent guard |
| offline | `8.7.0`, `9.x` | `ci.yml:179-180` | — | — |

`rolling` runs **only** in the test job, is not part of any other job's matrix, and is the sole `continue-on-error: true` leg (`ci.yml:38`) — "forward-compat early-warning only — never blocks" (comment on the same line).

**Bazelisk provisioning**: not a separate download — `ocx.toml:4` declares `bazelisk = "ocx.sh/bazelbuild/bazelisk:latest"`, resolved to a per-platform sha256 in `ocx.lock` (dogfooding: rules_ocx provisions its own dev toolchain through itself, MODULE.bazel:23). CI's `ocx-sh/setup-ocx@v1` action (pinned `version: "0.6.0"` at **6** call sites — `ci.yml:26,52,88,120,187`, `release.yml:22`) installs the `ocx` CLI itself; every job then runs `ocx exec -- bazelisk ...`, and it is `bazelisk` (via `USE_BAZEL_VERSION`) that fetches the actual Bazel major per matrix cell. The `0.6.0` pin matches `DEFAULT_OCX_VERSION` in `ocx/private/versions.bzl:15`, kept in lockstep by `scripts/bump_ocx.py` (see [§7](#7-release-and-bcr-posture)).

## 3. MODULE.bazel

`cat -n MODULE.bazel` (32 lines):

| Declaration | Name | Version | dev_dependency | file:line |
|---|---|---|---|---|
| `bazel_dep` | `bazel_skylib` | `1.9.0` | no | `:13` |
| `bazel_dep` | `platforms` | `1.0.0` | no | `:14` |
| `bazel_dep` | `rules_shell` | `0.6.1` | **yes** | `:16` |
| `bazel_dep` | `stardoc` | `0.8.0` | **yes** | `:17` |
| `bazel_dep` | `buildifier_prebuilt` | `8.2.0.2` | **yes** | `:18` |

**3 of 5** `bazel_dep`s are dev-only. `use_extension`: **2** — `ocx = use_extension("//ocx:extensions.bzl", "ocx")` (`:20`, non-dev, `use_repo(ocx, "ocx_tool")` at `:21`) and `ocx_dev = use_extension(..., dev_dependency = True)` (`:26`, dogfooding, `use_repo(ocx_dev, "dev_tools")` at `:32`). The second carries one `ocx_dev.project(name="dev_tools", ocx_lock="//:ocx.lock", ocx_toml="//:ocx.toml")` tag (`:27-31`).

**Tag classes** (`ocx/extensions.bzl:19-213`, `tag_classes = {...}` at `:341-346`): `download`, `project`, `package`, `policy` — **4** total.

| Tag class | Root-only? | At most one? | Enforcement site |
|---|---|---|---|
| `download` | **yes** | **yes** | `extensions.bzl:239-244` — `fail()` if `not mod.is_root`; a second tag hits `download_tags > 1` |
| `project` | **yes** | no (multiple named repos allowed) | `extensions.bzl:258-259` — same `fail()` pattern |
| `package` | **no** | no | no `is_root` check at all (`extensions.bzl:276-278` only guards duplicate names) — non-root modules may declare packages |
| `policy` | **yes** | **yes** | `ocx/private/repo_utils.bzl:499-533` (`resolve_policy()`), enforced at lines 523-526; called from `extensions.bzl:222-235` before any repo is declared |

Extension impl returns `module_ctx.extension_metadata(reproducible = True)` at `extensions.bzl:331` — matches the doc comment (`extensions.bzl:7-10`) that the impl is a pure function of tags with all host detection pushed into repository rules, and matches AGENTS.md's claim that the extension "stays out of MODULE.bazel.lock" (verified: `moduleExtensions` key in the lock is present per `lockFileVersion` schema but the `ocx` extension is reproducible, so bzlmod does not need to hash its result — see `python3 -c 'json.load(...)' ` below).

**`MODULE.bazel.lock`**:

```
python3 -c "
import json
d = json.load(open('MODULE.bazel.lock'))
print(len(d.keys()), list(d.keys()))
print(d['lockFileVersion'])
print(len(d['registryFileHashes']))
"
# → 5 ['lockFileVersion', 'registryFileHashes', 'selectedYankedVersions', 'moduleExtensions', 'facts']
# → 24
# → 141
```

`wc -c MODULE.bazel.lock` → **166,136 bytes** (matches the frame's "166 KB" note). All 141 `registryFileHashes` keys start with `https://bcr.bazel.build` — **one** registry, no mirrors, no private registry configured.

**Lockfile/MODULE.bazel sync check**: absent. `grep -rn "bazel mod" taskfile.yml taskfiles/*.yml .github/workflows/*.yml` and `grep -rn "MODULE.bazel.lock\|lockfile" taskfile.yml taskfiles/*.yml .github/workflows/*.yml` both return nothing beyond the `.gitattributes` merge-strategy line. No CI job or task target ever runs `bazel mod deps --lockfile_mode=error` (or equivalent) to prove the committed lockfile matches the committed `MODULE.bazel`. This is a real gap, not merely undocumented — see [Gaps](#gaps).

## 4. Remote cache posture

Backend (described, not quoted): an HTTP remote cache reachable at `bazel-cache.ocx.sh`.

| Job | Uses `.github/actions/remote-cache`? | Mode | Stated reason (quoted) |
|---|---|---|---|
| lint | yes (`ci.yml:27-30`) | read-write on push, read-only on PR | — |
| test | yes (`ci.yml:53-56`) | read-write on push, read-only on PR | — |
| examples | **no** | n/a | **no comment anywhere explains the omission** |
| bcr-parity | no | n/a | `ci.yml:98-100`: "Deliberately NO remote cache: this job has to build exactly what BCR's own presubmit builds, on infrastructure BCR cannot reach. A cache hit here would hide a break that BCR would then find in the submission PR." |
| pin-completeness | no | n/a | job runs no Bazel invocation |
| offline | no | n/a | `ci.yml:171-172`: "Deliberately NO remote cache: this job asserts hermetic offline behaviour, which a network-backed cache would mask." |

**Read-only vs. read-write mechanism**: not two different endpoints — the same `build --remote_cache=` URL is used in both cases. Read-only is enforced by `--remote_upload_local_results=false` (`action.yml:34`) when the `auth` input is empty; read-write is enforced by supplying `--remote_header=authorization="Basic $BAZEL_CACHE_AUTH"` (`action.yml:32`) when it is not. `auth` is populated **only** on a `push` event (`ci.yml:30,56`: `github.event_name == 'push' && secrets.BAZEL_CACHE_AUTH || ''`) — every PR, including same-repo PRs, gets the empty string and therefore read-only, anonymous-read access. Per `.bazelrc.user:5-6`'s comment, reads need no credential at all; the `secrets.BAZEL_CACHE_AUTH` token is a write-only credential the anonymous read path never touches.

**`--remote_timeout=60`**: present in both `.bazelrc.user:9` and `action.yml:28`; no comment anywhere states why 60 (seconds, presumably) was chosen.

**Absent everywhere in the repo** (`grep -rn "remote_executor\|bes_backend\|disk_cache\|remote_download"` over every `.bazelrc*`/workflow/action file → no output):
- No `--remote_executor` / RBE of any kind.
- No `--bes_backend` / Build Event Service.
- No disk cache (`--disk_cache`).
- No `--remote_download_*` flag (i.e., no explicit BwoB tuning; whatever the Bazel-version default is applies unmodified).

The absence of RBE is not a footnote — it is architecturally motivated. README.md:246-249: *"Remote execution is a non-goal for now: launchers reference absolute `OCX_HOME` store paths (the nixpkgs model). Use `isolated_home = True` to keep a store per repository if you need stricter isolation — at the cost of a full per-repository re-download, and it cannot be combined with `bins`."* An RBE worker cannot honor a launcher script's hard-coded `/home/<user>/.ocx/...` path, so remote caching (action results only) is the ceiling this design can reach without a rewrite of the store model.

## 5. Hermeticity posture of the repository rules and actions

Repository rules are **unsandboxed by design** — they talk to the shared `OCX_HOME` (default `~/.ocx`) so the content-addressed store is reused across every repo rule invocation and every Bazel workspace on the machine (AGENTS.md:34-39; `ocx/private/repo_utils.bzl:628-640` resolves `OCX_HOME` from `ctx.getenv("OCX_HOME")` or falls back to `$HOME/.ocx`/`%USERPROFILE%\.ocx`). `isolated_home = True` moves the store inside the repository (trading the shared-store win for stricter isolation) but is documented to still watch `/etc` on POSIX and the user config dir (AGENTS.md:36-38).

**Env vars read through `getenv` and tracked** (`grep -n getenv ocx/private/*.bzl`):

| Site | Var | file:line |
|---|---|---|
| `download.bzl` | `OCX_INSTALL_DIST_URL` | `download.bzl:36` |
| `download.bzl` | `OCX_INSTALL_MIRROR_URL` | `download.bzl:44` |
| `repo_utils.bzl` | `OCX_HOME` | `repo_utils.bzl:630` |
| `repo_utils.bzl` | `USERPROFILE`/`HOME` | `repo_utils.bzl:632` |
| `repo_utils.bzl` | every `site`/`translucent` `OCX_ENV_CLASSES` key, generic loop | `repo_utils.bzl:659` |
| `repo_utils.bzl` | `OCX_NO_CONFIG` | `repo_utils.bzl:724` |
| `repo_utils.bzl` | `XDG_CONFIG_HOME`/`HOME`/`APPDATA` (`_CONFIG_HOME_ENV`) | `repo_utils.bzl:728` |

`OCX_ENV_CLASSES` (`repo_utils.bzl:45-82`) is the single source of truth: **10** `site` vars forwarded verbatim, **4** `translucent` vars (ambient unless an attr overrides), **2** `explicit` vars (`OCX_NO_VERIFY`, `OCX_ALLOW_YANKED` — never read from the environment, only ever written from a resolved `ocx.policy()`), **5** `pinned` vars (fixed value every invocation). Env passthrough is exactly `site ∪ translucent` = 14 vars (AGENTS.md:240).

**Paths watched** (`ctx.watch()`, `grep -nF ".watch("`): `repo_utils.bzl:708` (config tiers via `ambient_config_paths()`, defined `:368-…`), `:722` (sigstore trust root), `:735` (guarded by a comment at `:733` — "crash ctx.watch(). Skip the tier instead" — i.e., a watch that could itself crash is wrapped defensively).

**Hand-constructed paths that fail open** (`.claude/rules/starlark.md:13-31`, cross-checked against code):
1. `ambient_config_paths()` (`repo_utils.bzl:368`) hand-builds `$OCX_HOME/config.toml`, `state/managed-config/snapshot.json`, `state/managed-config/config.toml` — ocx has no read-only command that reports these paths, so rules_ocx guesses the layout. Starlark.md:21-24: *"the watch fails open: relocate the directory upstream and it silently covers nothing, with no error."*
2. `sigstore_trust_root_path()` (`repo_utils.bzl:572`, called at `:720`) hand-builds `$OCX_HOME/sigstore/trusted-root.json` the same way, same fail-open property.
3. `manifest_sha256()` (referenced in starlark.md:26-31, not part of the getenv/watch set) hand-parses a `dist/<sha256>.json` naming convention out of `dist/dist.json`'s own filename; any other filename downloads the ocx CLI **unverified** — also fails open, also flagged for re-verification on every ocx bump.

**Actions that read the host, and the C++ toolchain story**: `.bazelrc.user:2-3` sets `--repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc` and disables `layering_check` — both host-specific (an absolute path under one user's `$HOME`) and non-hermetic by construction. As established in [Headline numbers](#headline-numbers), this repo defines **zero** `cc_binary`/`cc_library`/`cc_toolchain` targets, and neither `bazel_skylib`'s `native_binary` (used at `repo_utils.bzl:1563,1569` to wrap ocx-provisioned executables) nor `rules_shell`'s `sh_test` requires compiling anything — both are pure wrappers around pre-built binaries. So this flag pair, real and checked-in-spirit as "the developer's own local override," presently governs no build action in `rules_ocx` itself; it exists only because Bazel's built-in `@bazel_tools` C++ autoconfiguration probes for a working C compiler at workspace setup regardless of whether any `cc_*` target is ever requested, and this machine has none. The comment at `.bazelrc.user:1` ("no g++ on this box, use zig as C compiler") is the whole rationale; there is no comment addressing what disabling `layering_check` protects against, since there is no C++ compilation to protect.

**How the offline job proves determinism** (`ci.yml:170-199`, quoted):
1. *Warm fetch*: `ocx exec -- bazelisk fetch @dev_tools//...` — populates the shared `OCX_HOME` store normally.
2. *Refetch offline against the warmed store (must succeed)*: `OCX_OFFLINE=1 ocx exec -- bazelisk fetch --force @dev_tools//...` — proves a fully-warmed store needs no network.
3. *Refetch offline against an empty store (must fail)*: a fresh `OCX_HOME="$RUNNER_TEMP/empty-ocx-home"` with `OCX_OFFLINE=1` is asserted to **fail** (`if ... ; then echo "expected the offline fetch against an empty store to fail" >&2; exit 1; fi`) — proves the store, not luck, is what makes step 2 succeed.

No remote cache in this job (see [§4](#4-remote-cache-posture)) — a cache hit on step 3 would make the job pass for the wrong reason.

## 6. The ocx CLI contract: doc vs. code

AGENTS.md's "Two-tier ocx CLI contract" (AGENTS.md:104-250) diffed against `ocx/private/repo_utils.bzl`, `package.bzl`, `project.bzl`:

| Doc claim | Code site | Match? |
|---|---|---|
| Sysexits 64,65,69,74,75,77,78,79,80,81,83,84,85 hinted; 82 deliberately absent | `SYSEXIT_HINTS` dict, `repo_utils.bzl:121-185`, all 12 codes present with prose hints; 82's absence explained in a comment at `:152-155` | **match** — doc and code agree, including on the deliberate gap |
| Sysexit 75 retried, others settled on first answer | `_RETRYABLE = [69, 74, 75]` (`:196`), `_TRANSIENT_RETRIES = 2` (`:188`), applied in `run_ocx()` (`:754-802`) | **match** |
| `ocx --format json env` → `.entries` parsed, three sibling arrays ignored but always present | `project.bzl:192`: `entries = decode_json(stdout, "ocx env")["entries"]` | **match** — only `.entries` is read, as claimed |
| `ocx --format json package install` → `{"<raw>": {identifier, metadata, path}}`, only `identifier` read | `package.bzl:196`: `report = decode_json(stdout, "ocx package install")`; `:197`: `identifier = report.values()[0]["identifier"]` | **match** |
| `ocx --format json package which` → `{"<raw>": {"path", "kind"}}` (0.5.8: object not bare string); `kind != "package"` is a `fail()` | `package.bzl:~209`: `answer = decode_json(stdout, "ocx package which").values()[0]`; path validated `:217-222`; `answer.get("kind")` checked at `:240` | **match** |
| `[package] inspect --closure` → `{"packages": [...]}`, drift in shape is a `fail()` naming the pin to move, not a mapped sysexit | `closure_packages()`, `repo_utils.bzl:818-880` — validates `packages` is a list, each entry is a dict with `identifier` and a well-typed `closure.surface.interface`; `fail()` at the end names "upgrade rules_ocx... or pin an ocx release... with ocx.download(version = ...)" | **match**, and the code's docstring (`:829-878`) is more precise than the AGENTS.md prose about exactly which fields are/aren't guarded |
| `OCX_ENV_CLASSES` is "one classified table" | `repo_utils.bzl:45-82`, single dict, 4 classes (`site`/`translucent`/`explicit`/`pinned`), consumed generically by `make_ocx_env()` (`:604-`) rather than four parallel structures | **match** |
| Extension impl pure, `reproducible = True`, no `module_ctx.os`/getenv in the extension | `extensions.bzl:331` sets `reproducible = True`; `grep -n "module_ctx.os\|module_ctx.getenv" ocx/extensions.bzl` → no output | **match** |

**No mismatch found** between AGENTS.md's contract and the code it describes — every sysexit named in the doc has a corresponding `SYSEXIT_HINTS` row or an explicit, code-commented reason for its absence, and every JSON shape claim has a parse site that enforces exactly the fields the doc says are read. **The doc is authoritative and current**; nothing here contradicts it. This is worth noting precisely because the audit brief expected doc/code drift to be the norm — see [Contradictions of the frame](#contradictions-of-the-frame).

## 7. Release and BCR posture

**`release.yml`** (tag push `v*`): (1) verifies the tag matches `MODULE.bazel`'s `version` via `sed` extraction (`:23-30`); (2) builds a BCR-compatible source archive with `git archive` and computes a `sha256-` integrity string via `openssl` (`:31-38`); (3) generates release notes with `git-cliff --latest --strip header` (`:40`); (4) publishes a GitHub Release, marking prereleases (tag contains `-`) with `--prerelease` (`:44-51`).

**`publish-to-bcr`** job (`release.yml:53-62`) is skipped for prereleases (`if: ${{ !contains(github.ref_name, '-') }}`) and calls the reusable `publish.yaml`, which delegates to `bazel-contrib/publish-to-bcr@v1.4.1` (`publish.yaml:22`) pointed at `registry_fork: ocx-sh/bazel-central-registry` (`:27`), `attest: false` (`:30`, comment: "Enable later once release artifacts are attested"), `draft: false` (`:33`, comment: draft PRs need a manual click). Credential: `secrets.BCR_PUBLISH_TOKEN`, described as "Classic PAT (repo + workflow scopes)" (`:37-39`).

**`.bcr/presubmit.yml`**: `bazel_test_module` at `module_path: "e2e/bzlmod"`, matrix `platform: [debian11, ubuntu2204, macos, windows]` (4) × `bazel: [8.x, 9.x]` (2) = **8 cells**, one task `verify_test_module` building `//...`. Comment (`:1-4`): "Runs the module under test as a non-root dep, so its dogfooding `ocx.project` dev tags are ignored"; build-only, no OCI pull (matches the lazy+digest-pinned `jq_lazy` package in `e2e/bzlmod/MODULE.bazel`).

**`bcr-parity` job** in `ci.yml` (`:93-141`) reproduces this presubmit inside the repo's own CI, across the same 4 platforms × 2 Bazel versions (macOS Intel emulated via Rosetta on an arm64 runner — `:125-141`, with a documented rationale for why `arch -x86_64` alone can't downgrade an arm64 bazelisk). Deliberately uncached (quoted in [§4](#4-remote-cache-posture)).

**`pin-completeness` job** (`ci.yml:143-168`) — quoted assertion: for `e2e/bzlmod/MODULE.bazel` and `examples/package/MODULE.bazel`, every `pins = {` block (`blocks=$(grep -c 'pins = {' "$f")`) must mention all four BCR platform strings (`darwin/amd64`, `darwin/arm64`, `linux/amd64`, `windows/amd64`) exactly `$blocks` times each — i.e., every pins map is complete, not just present. Comment (`:144-146`): "Deterministic, arch-independent guard for the class of bug that broke the BCR macOS presubmit."

**`update-dist.yml`** (weekly cron + `workflow_dispatch` + `repository_dispatch` on `ocx-released`): runs `scripts/bump_ocx.py` (no flags) to refresh `dist/dist.json` and move `DEFAULT_OCX_VERSION` + every `setup-ocx` pin **in lockstep**; opens a PR via a PAT (`secrets.DIST_UPDATE_TOKEN`, because `GITHUB_TOKEN`-authored PRs don't trigger CI — comment `:42-43`). `bump_ocx.py`'s guards (module docstring, `bump_ocx.py:9-16`): a refresh may only *add* rows; every row (not just the pinned one) must be `stable` channel, 64-lowercase-hex sha256, a URL on the ocx release host, and a known archive extension; the incoming pin must cover at least 8 targets and must not drop any target the outgoing pin covered. **No override flag** — a guard trip opens no PR (`update-dist.yml:33-36`, `dist-snapshot.md:25-28`).

**What is NOT asserted anywhere**:
- **Lockfile freshness** (`MODULE.bazel.lock` vs. `MODULE.bazel`) — no CI job or task target checks it (see [§3](#3-modulebazel-and-the-lockfile)).
- **Buildifier lint on examples/e2e** — `taskfile.yml:22-34`'s `lint` task runs `{{.BAZEL}} run //:buildifier.check` from the root workspace only; there is no `cd examples/X && buildifier` step and no dedicated lint task for those directories anywhere in `ci.yml` or `taskfile.yml`. Since `.bazelignore` lists `examples`, `e2e`, `.agents/worktrees` (`.bazelignore:1-3`), the root Bazel workspace's package graph never includes those directories' `BUILD.bazel` files at all — whatever `buildifier_prebuilt`'s underlying file-discovery mechanism is, no CI step is *designed* to lint them. (This audit did not execute `bazel run //:buildifier.check` to observe its actual file-walk behavior — see [Gaps](#gaps).)
- **Bazel 9 docs freshness** — the `//docs/...` test target is explicitly excluded whenever `matrix.bazel != '8.7.0'` (`ci.yml:62`), so the stardoc-generated `docs/*.md` is verified fresh against 8.7.0 only, never against 9.x or rolling.
- **`.bazelrc.user`'s C-toolchain flags on any CI machine** — never asserted, because CI never sources this file's committed content (it doesn't exist until the remote-cache action creates it fresh, containing only cache flags).

## 8. Examples and e2e as consumers

All four consumer modules use `local_path_override(module_name = "rules_ocx", path = "../..")` against a placeholder `bazel_dep(name = "rules_ocx", version = "0.0.0")` — standard local-override idiom, not a real version pin.

**`examples/project`** (flagship — project tier): `ocx.project(name="tools", ocx_lock="//:ocx.lock", ocx_toml="//:ocx.toml")` (eager), plus a `tools_lazy` variant with `bins=["shellcheck","shfmt"]` and a `tools_arm64` cross-platform variant (`platform="linux/arm64"`, no runnable launchers on this host). `.bazelrc` sets the standard 4 flags (no cache, no `.bazelrc.user`).

**`examples/package`** — the pinning-strategy showcase, 4 `ocx.package()` blocks:
```starlark
# Floating tag: resolves at fetch time; the fetch log prints the digest to pin.
ocx.package(name = "jq", package = "ocx.sh/jqlang/jq:latest")          # :20-23, UNPINNED
# Frozen index: ':latest' resolves from the committed snapshot in index/
ocx.package(name = "jq_frozen", index = "//:index", package = "...")   # :28-32, index-frozen
# Digest-pinned: fully reproducible.
ocx.package(name = "jq_pinned", package = "...", pins = {...4 platforms})  # :38-47, digest-pinned
# Lazy: nothing installed at fetch time — pins required.
ocx.package(name = "jq_lazy", bins = ["jq"], package = "...", pins = {...})  # :52-62, digest-pinned + lazy
```
Also declares `ocx.policy()` at its defaults (`:17`, comment: "a no-op that exercises the tag class end to end. Root module only; at most one.") — per AGENTS.md:259-261, this is the *only* example/e2e module that exercises the policy tag's acceptance path at all; its weakening effects (`allow_unverified`/`allow_yanked`) have unit coverage only, never integration coverage.

**`examples/cross_platform`** — 1 `ocx.package()`, index-frozen, `platforms = ["linux/amd64","linux/arm64","windows/amd64"]` (3, not all 4 BCR platforms — darwin is absent here because this example demonstrates a `select()`ed hub, not BCR conformance).

**`e2e/bzlmod`** — 1 `ocx.package()`, `jq_lazy`, digest-pinned + lazy (same shape as `examples/package`'s `jq_lazy`), explicitly for BCR presubmit: "Build-only smoke test... never pulls tool content from an OCI registry, keeping the BCR platform matrix reliable" (module docstring `:1-8`).

**Pin/float tally across all 5 `ocx.package()` blocks**: 1 floating (unpinned), 2 index-frozen, 2 digest-pinned. **0 of 5** are left floating *and* uncommitted-index at the same time except the one explicitly labeled as a demonstration of that state (`examples/package`'s plain `jq`).

**Hermeticity flags in examples/e2e**: none set `config`, `no_config`, `patch_snapshot`, or `sigstore_trusted_root` (AGENTS.md:257-259 states this explicitly and it checks out — `grep -rn "no_config\|patch_snapshot\|sigstore_trusted_root" examples/*/MODULE.bazel e2e/*/MODULE.bazel` → no output). That tier of the contract has **unit test coverage only** (`ocx/tests/policy_test.bzl` and friends), never integration coverage through a live example.

## Smells (ranked)

1. **Examples job runs uncached with no stated reason, unlike its two siblings.** `bcr-parity` and `offline` both carry an inline comment justifying "deliberately NO remote cache"; `examples` simply omits the `remote-cache` action step with zero explanation. Either it's deliberate (live-registry dogfooding shouldn't be masked by a stale cache, similar to `bcr-parity`'s logic) or it's an oversight that's quietly wasting CI minutes across 12 shards — as written, a reader cannot tell which. `ci.yml:64-91`.
2. **No lockfile-freshness guard.** `MODULE.bazel.lock` (166 KB, 141 registry entries) is committed and could silently drift from `MODULE.bazel` (e.g., after a manual edit that forgot `bazel mod deps`) with no CI signal. Every other supply-chain-adjacent surface in this repo (dist snapshot, pin completeness) has an explicit guard script; this one does not.
3. **`.bazelrc.user`'s C-toolchain override is dead configuration.** `CC=zig-bazel-cc` and `-layering_check` exist to work around a missing `g++` on one machine, but zero `cc_*` targets exist anywhere in the repo to be compiled — the flag pair currently protects nothing. It will silently start mattering the moment any dependency (present or future) pulls in a `cc_library`, at which point its correctness has never been exercised in CI (CI never sees this file's committed content at all).
4. **Buildifier lint reach over `examples`/`e2e` is unverified, not merely undocumented.** `.bazelignore` excludes those directories from the root workspace's package graph, and no task/CI step separately lints them; whether `buildifier_prebuilt`'s default scan reaches them by walking the raw filesystem is untested in this audit.
5. **Bazel-9 docs freshness has zero coverage.** The one thing 8.7.0-only testing intentionally sacrifices in the 9.x/rolling legs is exactly the surface (`stardoc`-generated docs) most likely to shift shape across a major Bazel version.
6. **No stated rationale for `--remote_timeout=60`.** Every other flag in this repo that lacks a comment is either self-explanatory (`--test_output=errors`) or a well-known idiom (`--enable_platform_specific_config`); a timeout value is a tuning knob that usually *does* need a "why this number" note and doesn't have one here.

## Patterns worth encoding

- **A single classified env-var table (`OCX_ENV_CLASSES`) beats four parallel structures.** One dict keyed by variable name, tagged with a class (`site`/`translucent`/`explicit`/`pinned`), consumed by one generic loop in `make_ocx_env()`. Adding a new env var is one row, not four call sites that can silently disagree. Directly transferable to any repository-rule env-forwarding design.
- **`fail()` messages that name the user-fixable command, not just the error.** Every sysexit hint and every JSON-shape-drift `fail()` in this codebase ends with the literal command to run (`ocx lock`, `ocx patch freeze`, `ocx.download(version = "…")` in `MODULE.bazel`) rather than a bare description of what went wrong. This is the single most reusable idiom for a repository-rule quality rule.
- **Pin-completeness as a deterministic bash guard, not a build.** `pin-completeness` needs no Bazel invocation at all — a `grep -c` count-matching check over committed `MODULE.bazel` text catches an entire class of "missing platform" bug with zero flakiness and zero runtime cost, faster and more reliable than exercising the actual platform matrix.
- **Three-way pinning ladder for a floating upstream tag**: floating (`:latest`, resolved and logged at fetch time) → frozen index (a committed snapshot directory that locks `:latest` until refreshed) → digest pin (`pins = {platform: sha256}`, fully reproducible, required for `bins`/lazy mode). `examples/package/MODULE.bazel` demonstrates all three side by side with comments explaining the tradeoff of each — a strong worked example for a "pin your dependency" rule that needs more than one right answer depending on the reproducibility/ergonomics tradeoff a team wants.
- **A `--check` mode that shares code with the refresh, not a weaker duplicate.** `scripts/bump_ocx.py --check` runs the exact same per-row validation the refresh path uses, over the already-committed file — so CI enforcement and the refresh guard can never drift apart from each other. Directly reusable pattern for "pinned manifest" rules generally (crate_universe lockfiles, npm lockfiles, uv.lock).
- **Deliberately uncached CI legs as a hermeticity assertion, not a performance regression.** Both `bcr-parity` and `offline` treat "no remote cache" as a *feature* of the job (it would hide the exact class of bug the job exists to catch), and say so in a comment. Worth encoding as a named CI pattern: "when a job's job is to prove something is possible without help, giving it help defeats the job."

## Contradictions of the frame

- **The frame's own list of hermeticity suspects treats the CC/layering_check override as self-evidently a live hermeticity problem** ("a host-specific, non-hermetic C toolchain arrangement that is itself a finding"). Measurement shows something sharper: it is real, non-hermetic, and correctly flagged as a smell — but it is currently **inert**, because the repository builds zero C++ targets. The finding worth encoding is not "rules_ocx has a non-hermetic C toolchain" but "a non-hermetic override that nothing currently exercises is a latent trap, not an active one" — a distinction a rule author should preserve rather than flatten.
- **Bazel-frame.md's hypothesis #2 ("remote execution and caching are a first-class topic, not a CI footnote") is contradicted for this specific codebase's *architecture*, not just its CI.** `rules_ocx` doesn't merely lack RBE configuration — its launcher model (absolute host-store paths, "the nixpkgs model," README.md:246-249) is stated to be incompatible with remote execution as designed. For a tool-provisioning ruleset in this family, RBE is not a missing CI knob to turn on; it would require a different content-addressing strategy for the store itself. Any Bazel-adoption guide that treats "add `--remote_executor`" as a mechanical step should carry this counter-example: some designs must change shape first.
- **The doc/code drift the audit brief expected to find (per demand axis 6: "Report mismatches, and say whether the doc or the code is authoritative in practice") did not materialize.** Every sysexit and every JSON-shape claim in AGENTS.md's CLI contract has a corresponding, currently-correct code site — including the *deliberate* absences (sysexit 82) being explained identically in both places. Where the frame's suspicion was "find where the doc lies," the actual finding is "this one doc doesn't" — worth stating plainly rather than manufacturing a mismatch, per the audit's own instruction to report contradicting evidence.
- **The frame describes the BCR-parity job as "(4 platforms, deliberately no cache)"**, which undercounts its actual matrix: it is 4 platforms **× 2 Bazel versions = 8 shards** (`ci.yml:106-111`), not 4. Minor, but the per-shard count matters for anyone estimating this job's CI-minutes cost.

## Gaps

- **`buildifier_prebuilt`'s actual file-discovery behavior was not verified.** This audit did not execute `bazel run //:buildifier.check` (out of scope for a read-only measurement pass, and would require a Bazel invocation with network/fetch side effects). Whether it reaches `examples/`/`e2e/`'s BUILD files despite `.bazelignore` is stated as unresolved above, not asserted either way.
- **No count of how many `examples/*/index/ocx.sh/**/*.json` files exist per example** — the frozen-index snapshots are real committed files (seen in the initial `find`) but their content/freshness was not audited; out of scope for build-contracts/CI posture.
- **`.claude/rules/mirror-auth.md`, `release.md`, and the ADR (`adr_0001_policy-tag-and-env-classes.md`) were located but not read in full** — this audit's scope was build contracts, hermeticity, and CI, and those three files' content (mirror authentication procedure, a shorter release doc, and the policy-tag ADR) looked adjacent rather than load-bearing for the eight measurement axes; a later authoring pass on the policy/env-classes topic specifically should read the ADR directly rather than relying on this audit's AGENTS.md-derived summary.
- **The exact Bazel version(s) actually installed in this sandbox's `~/.cache/bazel` output base were not cross-checked against `.bazelversion`** — a `bazel-bin`/`bazel-out` symlink set exists from a prior local run, but this audit did not run `bazel version` or inspect the output base further, staying consistent with "read-only, don't modify anything outside the output file."
- **`renovate.json` was listed by `find` but never opened** — dependency-update-bot configuration is adjacent to (not the same as) the release/BCR/lockfile posture this audit measured; worth a follow-up pass if renovate is expected to touch `MODULE.bazel`/`bazel_dep` versions.
