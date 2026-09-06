---
title: Flag defaults and trivial builds across Bazel versions
slug: flag-defaults-and-trivial-builds-across-versions
agent: sonnet
model: claude-sonnet-5
date_measured: 2026-09-05
bazel_versions: [8.7.0, 8.8.0, 9.2.0]
host: WSL2 (Linux 6.18.33.2-microsoft-standard-WSL2), 32 GB RAM (31 shown by `free -g`), 32 vCPU
affects_rule_ids:
  - BZL-HERM-01
  - BZL-MOD-14
  - BZL-MOD-16
  - BZL-LARK-10
  - BZL-LARK-11
  - BZL-ARCH-04
  - BZL-CACHE (BwoB/eviction flag family)
answers:
  - "bazel-hermeticity-determinism.md: needs-a-human-decision #1 (strict_action_env split) — the flag's exact per-version default"
  - "bazel-bzlmod-and-repo-rules.md: deserves-another-research-round — repo-contents cache defaults on 8.8.0 and 9.2.0"
  - "bazel-bzlmod-and-repo-rules.md: deserves-another-research-round — does a live run surface module-extension purity (repo_metadata existence check, precondition)"
  - "bazel-starlark-and-build.md: deserves-another-research-round — depset-union-status on 8.7.0 and 9.2.0"
  - "bazel-starlark-and-build.md: deserves-another-research-round — autoload-coverage for py_*/sh_*"
  - "bazel-architecture-monorepo.md: deserves-another-research-round — transitive_visibility existence on 8.7.0/8.8.0/9.2.0"
  - "bazel-architecture-monorepo.md: deserves-another-research-round — ambiguous select() specialization still reproducible"
  - "bazel-architecture-monorepo.md: M-G-24 / bazel-bzlmod-and-repo-rules.md — lockfile version and schema per pinned version"
---

# Flag defaults and trivial builds across Bazel versions

## Table of contents

- [Environment](#environment)
- [Q1: Flag defaults from the binary itself](#q1-flag-defaults-from-the-binary-itself)
- [Q2: package() transitive_visibility and repository_ctx.repo_metadata](#q2-package-transitive_visibility-and-repository_ctxrepo_metadata)
- [Q3: depset union](#q3-depset-union)
- [Q4: Autoload on 9.2.0 vs 8.7.0](#q4-autoload-on-920-vs-870)
- [Q5: select() ambiguous specialization](#q5-select-ambiguous-specialization)
- [Q6: Lockfile version](#q6-lockfile-version)
- [Not settled](#not-settled)
- [Re-run](#re-run)

## Environment

- `free -g`: total 31 GB, used 18 GB, free 0 GB, buff/cache 16 GB, available 12 GB (swap 32 GB, 18 GB used). `nproc`: 32. Kernel: `Linux Workstation 6.18.33.2-microsoft-standard-WSL2`.
- Total RAM ≥ 16 GB, so `--host_jvm_args=-Xmx1g` was **not** required by protocol and was not passed. `bazel info` on all three versions reported `local_resources: RAM=32091MB, CPU=32.0` and `max-heap-size: 8413MB`.
- `bazelisk --version` via `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec --`: 8.7.0 (already cached), 8.8.0 and 9.2.0 (downloaded fresh from `releases.bazel.build`, signed by the Bazel APT key). All three ran successfully.
- **Spawn strategy**: a `genrule` built with `--subcommands` on 8.7.0 showed `# Runner: sandbox-fallback` and `INFO: 2 processes: 1 internal, 1 linux-sandbox.` — this host uses the real `linux-sandbox`, not a `processwrapper-sandbox` fallback. Any hermeticity conclusion elsewhere that depends on sandbox class applies as measured on Linux, not Windows or macOS.
- **Environment caveat — tmpfs exhaustion.** `/tmp` here is a 16 GB `tmpfs`, shared by every concurrent agent on this host (confirmed via `ps aux`: sibling Bazel servers for other measurement clusters — `buildifier-gate-reach-and-generated-starlark`, `action-key-path-sensitivity-and-execlog`, plus an unrelated `tmp-exit39-bazel-scratch` — were running at the same time). Fetching `rules_cc`/`protobuf`/`rules_python`/`rules_shell` transitive closures for Q4's second half filled it to 100% and one run (Q2's `repository_ctx.repo_metadata()` probe on 8.7.0) failed with a genuine `IOException: ... write (No space left on device)` — recorded as-is below, then re-run. After that failure this run (a) deleted its own `--output_user_root` contents from the tmpfs scratch dir once their content was extracted into this report, and (b) relocated the remaining `--output_user_root` for Q2/Q6/spawn-strategy checks to `/home/mherwig/.cache/bazel-measure-scratch/out` (the real disk, `/dev/sdd`, 731 GB free at the time) — outside both `/tmp` and `/home/mherwig/dev`, deleted again at the end of this run. This is a deviation from the literal isolation instruction (output root under the given `/tmp` scratch path) made necessary by a hard, observed resource ceiling; no other file or path was touched. Every measurement below reproduces from a from-scratch workspace regardless of which output root it used.
- BCR versions pinned for Q4's loaded half: `rules_python 2.3.3`, `rules_shell 0.8.0`, `rules_cc 0.2.22`, `protobuf 36.1.bcr.1` (latest BCR releases as of 2026-09-05, queried from `bcr.bazel.build/modules/<name>/metadata.json`).

## Q1: Flag defaults from the binary itself

`bazel help all --long` is not a real subcommand (`ERROR: 'all' is not a known command`); the working equivalent that lists every common option plus the `build` command's own is `bazel help build --long`. Startup-only options (parsed before the command) are separately enumerated by `bazel help startup_options` and do **not** appear in `help build --long` — this matters for two rows below.

| Flag | 8.7.0 | 8.8.0 | 9.2.0 | Present? |
|---|---|---|---|---|
| `--incompatible_strict_action_env` | `false` | `false` | **`true`** | all three |
| `--repo_contents_cache` | `""` (disabled) | `""` (disabled) | **enabled**: `""` disables, else defaults to `{--repository_cache}/contents` | all three, default flips at 9.2.0 |
| `--experimental_remote_repo_contents_cache` | **absent** | `false` (startup option) | `false` (startup option) | 8.8.0+ only, and it's a *startup* option, never a build-command one |
| `--remote_download_outputs` | `"toplevel"` | `"toplevel"` | `"toplevel"` | all three |
| `--remote_download_minimal` / `--remote_download_toplevel` | absent from `--long` docs, but **accepted and functional** as flags (`bazel build --remote_download_minimal //:g` → exit 0) | same | same | undocumented aliases, still work on all three |
| `--experimental_remote_cache_eviction_retries` | `5` | `5` | `5` | all three |
| `--experimental_remote_cache_ttl` | `"3h"` | `"3h"` | `"3h"` | all three |
| `--experimental_remote_cache_lease_extension` | `false` | `false` | `false` | all three |
| `--incompatible_autoload_externally` | `"+@rules_python,+java_common,...,+@rules_shell,+@rules_android"` (full allowlist) | same as 8.7.0 | **`""`** (empty) | all three, value changes at 9.0+ |
| `--incompatible_disallow_empty_glob` | `true` | `true` | `true` | all three |
| `--experimental_remote_discard_merkle_trees` | `true` | `true` | `true` | all three |
| `--experimental_remote_merkle_tree_cache` | `false` | `false` | **absent** | 8.7.0, 8.8.0 only |
| `--incompatible_remote_use_new_exit_code_for_lost_inputs` | `true` | `true` | **absent** | 8.7.0, 8.8.0 only — removed by 9.2.0, not "removed everywhere" |
| `--remote_cache_compression` | `false` | `false` | `false` | all three |
| `--incompatible_remote_local_fallback_for_remote_cache` | `false` | `false` | `false` | all three |
| `--remote_local_fallback` | `false` | `false` | `false` | all three |
| `--experimental_use_hermetic_linux_sandbox` | `false` | `false` | `false` | all three |
| `--sandbox_default_allow_network` | `true` | `true` | `true` | all three |
| `--incompatible_no_implicit_watch_label` | `true` | `true` | `true` | all three |
| `--experimental_remote_cache_chunking` | `false` | `false` | `false` | all three |
| `--enable_workspace` | `false` (startup + build option) | `false` | **absent entirely** (not in `--long`, not in `help startup_options`) | 8.7.0, 8.8.0 only |
| `--enable_bzlmod` | `true` | `true` | **absent entirely** | 8.7.0, 8.8.0 only |
| `--vendor_dir` | path, default "see description" | same | same | all three |
| `--lockfile_mode` | `"update"` | `"update"` | `"update"` | all three |
| `--max_computation_steps` | `0` (no limit) | `0` | `0` | all three |
| `--incompatible_enable_deprecated_label_apis` | `true` | `true` | `true` | all three |

**Verdict.** `--incompatible_strict_action_env` flips false→true exactly at the 8→9 boundary tested here (8.7.0 and 8.8.0 both false, 9.2.0 true) — this **confirms** wave-2 correction 2 and BZL-HERM-01's stated default with a live read of the actual binary, not a source-tag inference. `--repo_contents_cache`'s *default value* is unchanged text ("") through 8.8.0 but its documented behavior changes at 9.2.0: the flag is no longer disabled by default, it now resolves to `{--repository_cache}/contents` unless explicitly emptied — this **promotes** BZL-MOD-16 from "no source states it was re-enabled" to a confirmed, version-scoped fact (still off through 8.8.0 Maintenance, on by default starting somewhere at/before 9.2.0 Active LTS). `--experimental_remote_repo_contents_cache` is a genuinely new datum: it does not exist at all on 8.7.0 (not even as a disabled stub) and appears as a *startup* option starting 8.8.0 — no source in the corpus states this, and any verification that only checks `help build --long` will silently miss it since it never appears there. The two "expect absent" flags in the protocol are only absent on 9.2.0; both are present-but-presumably-dead on 8.7.0 and 8.8.0, which sharpens (rather than contradicts) wave-2 correction 6's "deleted 2025-02" framing — the removal is an at-or-before-9.0 event, and Bazel 8.x's branch still carries the corpse. `--remote_download_minimal`/`--remote_download_toplevel` are confirmed live, working aliases on both tested majors (not just "not rejected" — a real genrule build using them completed with exit 0). `--enable_workspace`/`--enable_bzlmod` are not merely no-ops on 9.2.0, they are gone from every help surface (`--long` and `startup_options` both) — consistent with "WORKSPACE support code is deleted (not disabled)".

**Affects**: BZL-HERM-01 — confirms. BZL-MOD-16 — promotes (CONSIDER → version-scoped fact worth a MUST-adjacent note: "default flips to enabled on 9.x"). BZL-CACHE flag-default rows — confirms, with the `--experimental_remote_repo_contents_cache` startup-option datum added as new. General flag-table hygiene — any future verification must run `help build --long` **and** `help startup_options`; a flag can live in either.

## Q2: package() transitive_visibility and repository_ctx.repo_metadata

`bazel help package` is not a real subcommand (`ERROR: 'package' is not a known command`) on any of the three versions — there is no `bazel help <BUILD-file-function>` surface. The only way to test `package(transitive_visibility = …)` is to write it into a real `BUILD.bazel` and load it.

**Protocol (transitive_visibility), each version, fresh `module(name="m")` workspace:**
```
package(transitive_visibility = ["//visibility:public"])
filegroup(name = "f", srcs = [])
```
then `bazel build --nobuild //...`.

**Raw result:**
- 8.7.0: `Error in package: unexpected keyword argument: transitive_visibility` — exit 1.
- 8.8.0: `Error in package: unexpected keyword argument: transitive_visibility` — exit 1.
- 9.2.0: `Error in package: expected value of type 'string' for package() argument 'transitive_visibility', but got ["//visibility:public"] (list)` — exit 1, but a **different** error: the argument **exists** and type-checks against a `string`, not a list.

Follow-up on 9.2.0 with a string value pointing at a `package_group` label:
```
package(transitive_visibility = ":allowed")
package_group(name = "allowed", packages = ["//..."])
filegroup(name = "f", srcs = [])
```
`bazel build --nobuild //...` → `INFO: Build completed successfully, 0 total actions`, exit 0. (An intermediate attempt with the literal string `"//visibility:public"` analysed further and failed trying to resolve it as a real target label — confirming the argument takes one `package_group` label, not the `//visibility:public` sentinel and not a list.)

**Protocol (repo_metadata), each version, fresh `module(name="m")` workspace with a one-line `repository_rule`:**
```python
def _impl(ctx):
    meta = ctx.repo_metadata(reproducible = True)
    print("repo_metadata result: %s" % meta)
    ctx.file("BUILD.bazel", "")
    ctx.file("WORKSPACE", "")
my_repo = repository_rule(implementation = _impl)
```
`bazel fetch @myrepo` on all three versions printed `DEBUG: .../repo.bzl:3:10: repo_metadata result: <unknown object com.google.devtools.build.lib.bazel.repository.starlark.RepoMetadata>` before failing on an unrelated test-harness detail (the target pattern `@myrepo` needs a `//:myrepo` target inside the repo, which this minimal rule never declares) — the DEBUG line firing, and the `BUILD.bazel`/`WORKSPACE` writes it made completing, prove the `_impl` (and `ctx.repo_metadata()` inside it) ran to completion on 8.7.0, 8.8.0 and 9.2.0 alike. (The 8.7.0 attempt initially failed on the unrelated tmpfs exhaustion described in Environment; re-run on a real-disk output root gave the identical DEBUG line.)

**Verdict.** `transitive_visibility` does **not** exist on 8.7.0 or 8.8.0 (hard `unexpected keyword argument` at package-declaration time) and **does** exist and function on 9.2.0, where it takes a single `package_group` label (not a list, not the `//visibility:public` sentinel) and a `filegroup` under it builds cleanly. This is new evidence, not present in the corpus's own dated release-page reads (which checked 8.1.0 and 9.1.0 and found it absent from both — Conflict 8 in wave-2 correction 10). Because 9.2.0 is the current Active LTS and the fleet's own decision table (frame, row 2) explicitly weighs a move off 8.7.0 to 9.x, this changes the answer from "no mechanism exists to express 'shareable but must not leak transitively' today" to "one exists starting somewhere between 9.1.0 and 9.2.0, but the exact minor it shipped in was not pinned down here." `repository_ctx.repo_metadata()` runs successfully on all three pinned versions, live-confirming (not just source-confirming) wave-2 correction 3's "Bazel 8.3.0+" dating.

**Affects**: BZL-ARCH (visibility family, e.g. the row citing Conflict 8) — **contradicts** the "absent from every numbered release checked" framing for 9.2.0 specifically, while leaving 8.7.0/8.8.0 (the fleet's actual pin) unaffected; recommend the rule state it as "absent through 8.8.0, present on 9.2.0, exact ship version between 9.1.0–9.2.0 not measured." BZL-MOD-14 (module-extension purity / repo-contents-cache precondition) — confirms; `repo_metadata()` is real and callable, so the map's proposed precondition check is testable.

## Q3: depset union

**Protocol**, each version, fresh `module(name="m")` workspace, a `.bzl` that computes the union at load time and a `BUILD.bazel` that loads and calls it:
```python
# check.bzl
_RESULT = depset([1]) + depset([2])
def noop(): pass
```
```python
# BUILD.bazel
load(":check.bzl", "noop")
noop()
filegroup(name = "f", srcs = [])
```
`bazel build //...`.

**Raw result** (identical on both versions, only the traceback path differs):
```
ERROR: Traceback (most recent call last):
	File ".../check.bzl", line 1, column 23, in <toplevel>
		_RESULT = depset([1]) + depset([2])
Error: unsupported binary operation: depset + depset
...
ERROR: error loading package under directory '': error loading package '': initialization of module 'check.bzl' failed
```
Exit code 1 on both 8.7.0 and 9.2.0.

**Verdict.** `depset1 + depset2` is **already a hard error on 8.7.0**, the fleet's current pin — not "deprecated but working." It is identically a hard error on 9.2.0. This decisively settles the two-dive disagreement the map recorded: the "hard error" inference was right, the "deprecated-but-working" inference was wrong, and it was wrong **today**, not only as of some future Bazel major.

**Affects**: BZL-LARK-11 — **confirms** the hard-error half and **contradicts/removes** any "permanent legacy, still works" framing; the rule's rationale should read "hard error since at least 8.7.0" with no version caveat needed, since both tested majors agree.

## Q4: Autoload on 9.2.0 vs 8.7.0

**Protocol A (bare rule, no load, no bazel_dep)**, one `BUILD.bazel` per rule kind, each in its own fresh `module(name="m")` workspace, `bazel build --nobuild //...`:

| Rule | 8.7.0 | 9.2.0 |
|---|---|---|
| `py_library(name="p", srcs=["a.py"])` | exit 0 (autoload covers it) | exit 1: `name 'py_library' is not defined (did you mean 'cc_library'?)` |
| `sh_binary(name="s", srcs=["a.sh"])` | exit 0 | exit 1: `name 'sh_binary' is not defined (did you mean 'cc_binary'?)` |
| `cc_library(name="c", srcs=["a.cc"])` | exit 0 | exit 1, **different shape** — a real traceback into `/virtual_builtins_bzl/bazel/exports.bzl:40` (`_removed_rule_failure`): `Error in fail: This rule has been removed from Bazel. Please add a \`load()\` statement for it. This can also be done automatically by running: buildifier --lint=fix <path-to-BUILD-or-bzl-file>` |
| `proto_library(name="pr", srcs=["a.proto"])` | exit 0 | exit 1: `name 'proto_library' is not defined` |

**Protocol B (correct `load()` + pinned `bazel_dep`)**, one workspace, all four rules together:
```
bazel_dep(name = "rules_python", version = "2.3.3")
bazel_dep(name = "rules_shell", version = "0.8.0")
bazel_dep(name = "rules_cc", version = "0.2.22")
bazel_dep(name = "protobuf", version = "36.1.bcr.1")
```
with `load("@rules_python//python:defs.bzl", "py_library")`, `load("@rules_shell//shell:sh_binary.bzl", "sh_binary")`, `load("@rules_cc//cc:defs.bzl", "cc_library")`, `load("@protobuf//bazel:proto_library.bzl", "proto_library")`. `bazel build --nobuild //...` → `INFO: Analyzed 4 targets ... Found 4 targets... Build completed successfully` on **both** 8.7.0 (139 packages loaded, 5877 targets configured) and 9.2.0 (114 packages loaded, 5141 targets configured), exit 0 both.

**Verdict.** On 8.7.0 all four bare rules resolve silently via autoload; on 9.2.0 none do — this **settles the autoload-coverage open question decisively**: `py_*` and `sh_*` are **not** exempt from `--incompatible_autoload_externally`'s empty 9.x default, contrary to any buildifier documentation implying otherwise. A second, unrequested but load-bearing finding: the four rule kinds do not fail identically on 9.2.0. `py_library`, `sh_binary` and `proto_library` fail with a plain Starlark `NameError`-style message and a `did you mean` suggestion pointing at the wrong rule family; `cc_library` alone gets a purpose-built `_removed_rule_failure` stub that names the fix and even names `buildifier --lint=fix` as an automatic remedy. Any rule or skill that shows an agent "the exact error text to recognize" must show both shapes, not one. Adding the correct `bazel_dep` + `load()` fixes all four on both majors with no other change.

**Affects**: BZL-LARK-10 — **promotes** the defensive second clause to a confirmed MUST; the "did buildifier's docs simply not catch up" question is answered: yes, `py_*`/`sh_*` are not exempt, full stop. Recommend the rule (or a `BZL-CC`-adjacent note) also document the `cc_*`-specific error shape as a distinct, more forgiving trap.

## Q5: select() ambiguous specialization

**Protocol**, each version, fresh `module(name="m")` workspace, one `config_setting` on `values=`, one on `constraint_values=`, both matching a declared platform, one `genrule` whose `cmd` selects between them:
```
config_setting(name = "values_setting", values = {"cpu": "k8"})
constraint_setting(name = "my_constraint_setting")
constraint_value(name = "my_constraint_value", constraint_setting = ":my_constraint_setting")
platform(name = "my_platform", constraint_values = [":my_constraint_value"])
config_setting(name = "constraint_setting", constraint_values = [":my_constraint_value"])
genrule(name = "g", outs = ["out.txt"], cmd = select({
    ":values_setting": "echo values > $@",
    ":constraint_setting": "echo constraint > $@",
}))
```
`bazel build --platforms=//:my_platform //:g`.

**Raw result**, both versions, exit 1:
```
ERROR: .../BUILD.bazel:22:8: Illegal ambiguous match on configurable attribute "cmd" in //:g:
//:values_setting
//:constraint_setting
Multiple matches are not allowed unless one is unambiguously more specialized or they resolve to the same value. See https://bazel.build/reference/be/functions#select.
```
9.2.0 additionally emits (non-fatal) `WARNING: ... select() on cpu is deprecated. Use platform constraints instead ...` before the same fatal error.

**Verdict.** bazelbuild/bazel#14604's ambiguous-match failure is **still fully reproducible today**, byte-for-byte the same fatal message, on both the fleet's current pin (8.7.0) and the current Active LTS (9.2.0). The only difference at 9.2.0 is an added deprecation warning on the `values=`-based `config_setting`, which does not change the outcome. This moves the question from "flagged historical, not confirmed-current" to confirmed-current on both tested majors.

**Affects**: BZL-ARCH (select/platforms family) — **promotes** the open item from "historical, unconfirmed" to a live, MUST-grade trap description with exact reproducible text and versions.

## Q6: Lockfile version

**Protocol**, each version, fresh workspace with `module(name="m")` + `bazel_dep(name = "rules_python", version = "2.3.3")`, `bazel mod deps`, then read `MODULE.bazel.lock` top-level keys with `python3 -c "import json..."`.

| | 8.7.0 | 8.8.0 | 9.2.0 |
|---|---|---|---|
| `lockFileVersion` | **24** | **28** | **28** |
| top-level keys | `lockFileVersion, registryFileHashes, selectedYankedVersions, moduleExtensions, facts` | `lockFileVersion, registryFileHashes, selectedYankedVersions, moduleExtensions, facts, factsVersions` | same as 8.8.0 |

Fleet's committed lock, read (not modified): `/home/mherwig/dev/rules_ocx/MODULE.bazel.lock` → `lockFileVersion: 24`, keys `lockFileVersion, registryFileHashes, selectedYankedVersions, moduleExtensions, facts` — an **exact match** to a fresh 8.7.0 lockfile's shape.

**Verdict.** The fleet's committed lockfile is not just "version 24 versus master's 28" as a number — it is the precise, current-for-8.7.0 shape, key-for-key. The important new fact: the jump to version 28 (and the new `factsVersions` key) happens **already at 8.8.0**, the latest 8.x Maintenance release — not only when crossing into Bazel 9. Any framing that treats "stay on 8.x" as lockfile-format-stable is wrong the moment the pin moves from 8.7.0 to 8.8.0; 8.8.0 and 9.2.0 are identical to each other on this axis. No source in the corpus stated this; it required running `bazel mod deps` on the actual binaries.

**Affects**: BZL-MOD (lockfile hygiene family) and the frame's decision-table row 2 assumption ("stardoc goldens match only 8.7.0; moving [to 9.x] costs the docs-freshness signal") — **contradicts** the implicit assumption that 8.7.0→8.8.0 is a lockfile-safe move; it crosses the exact same schema boundary as 8.7.0→9.2.0. A rule documenting `lockFileVersion` must never hardcode "24" as current — it is already stale one Maintenance release later.

## Not settled

- The exact Bazel release in which `transitive_visibility` shipped is bracketed only as "absent through 8.8.0, present at 9.2.0" — 9.0.0/9.1.0 were not tested here.
- `--repo_contents_cache`'s 9.2.0 default was confirmed from its documented text and from a successful trivial build; a populated-cache-directory check (does `{--repository_cache}/contents` actually appear on disk after a real fetch) was not performed.
- `--experimental_remote_repo_contents_cache`'s *runtime effect* (not just its existence and default) was not exercised — no remote cache was configured in this run.
- The buildifier-gate-reach and generated-Starlark-validation open items from `bazel-starlark-and-build.md` belong to a different measurement cluster (observed running concurrently on this host as sibling agent `buildifier-gate-reach-and-generated-starlark`) and were not attempted here.
- Exit-39 reachability, RBE readiness, and cache-server capability-survey items from `bazel-caching-rbe.md` are out of this protocol's scope.

## Re-run

```bash
mkdir -p /tmp/bazel-flag-defaults-repro && cd /tmp/bazel-flag-defaults-repro
for V in 8.7.0 8.8.0 9.2.0; do
  mkdir -p "ws-$V" && cd "ws-$V"
  echo 'module(name = "m")' > MODULE.bazel
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root=/tmp/bazel-flag-defaults-repro/out help build --long > "../help-build-$V.txt"
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root=/tmp/bazel-flag-defaults-repro/out help startup_options > "../help-startup-$V.txt"
  cd ..
done
grep -E "incompatible_strict_action_env|repo_contents_cache|autoload_externally" help-build-*.txt
```
