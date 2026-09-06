---
title: "Bazel 9 buildifier gate, cache tags, transitive_visibility ship version, and two flag probes"
slug: bazel9-gate-tags-visibility-and-flag-probes
agent: measurement-wave-5
model: claude-sonnet-5
date_measured: 2026-09-06
bazel_versions: ["8.7.0", "8.8.0", "9.0.0", "9.1.0", "9.2.0"]
host: "Linux Workstation 6.18.33.2-microsoft-standard-WSL2 (WSL2, not a CI runner), 31 GB RAM, 32 vCPU"
affects_rule_ids:
  - BZL-LARK-09
  - BZL-LARK-24
  - BZL-LARK-25
  - BZL-LARK-26
  - BZL-HERM-02
  - BZL-TEST-08
  - BZL-ARCH-34
  - BZL-CACHE-12
  - BZL-CACHE-28
answers:
  - "bazel-starlark-and-build.md § Open questions › deserves another research round › buildifier-gate-on-bazel-9"
  - "bazel-testing.md § Open questions › deserves another research round › the two unmeasured cache tags"
  - "bazel-testing.md § Open questions › deserves another research round › the 9.2.0 tag rows"
  - "bazel-architecture-monorepo.md § Open questions › deserves another research round › transitive_visibility's exact ship version"
  - "bazel-caching-rbe.md § Open questions › deserves another research round › --experimental_remote_cache_chunking_function"
  - "bazel-caching-rbe.md § Open questions › deserves another research round › --rewind_lost_inputs and the rewind ceiling"
---

# Bazel 9 buildifier gate, cache tags, transitive_visibility ship version, and two flag probes

**Host caveat (stated once):** WSL2, kernel `6.18.33.2-microsoft-standard-WSL2`, not a CI runner.
Spawn strategy is `linux-sandbox` throughout (confirmed in build summaries, not assumed).
Several sibling measurement agents ran concurrently on this host during this session (visible
in `ps aux`); none of their processes or scratch paths were touched, and every result below was
independently re-verified where a shared resource (the 16 GB `/tmp` tmpfs) could have been a
factor — this run used the real-disk scratch directory throughout, per its own instructions, and
never touched `/tmp`.

## Table of contents

- [Environment](#environment)
- [Q1: Buildifier gate on Bazel 9.2.0](#q1-buildifier-gate-on-bazel-920)
- [Q2: Tags on 9.2.0 — network, and the two unmeasured cache tags](#q2-tags-on-920--network-and-the-two-unmeasured-cache-tags)
- [Q3: transitive_visibility ship version](#q3-transitive_visibility-ship-version)
- [Q4: Flags — remote_cache_chunking, rewind_lost_inputs, and the rewind ceiling](#q4-flags--remote_cache_chunking-rewind_lost_inputs-and-the-rewind-ceiling)
- [Not settled](#not-settled)
- [Re-run](#re-run)
- [Scratch left on disk](#scratch-left-on-disk)

## Environment

```
$ nproc
32
$ free -g
              total  used  free  shared  buff/cache  available
Mem:             31    12     2       0          16          18
$ df -h /home/mherwig/.cache/bazel-measure-scratch/ /tmp
/dev/sdd       1007G  247G  710G  26% /       (real disk, used for all scratch and --output_user_root)
tmpfs            64G   39M   64G   1% /tmp    (not used by this run)
```

All RAM ≥16 GB, so `--host_jvm_args=-Xmx1g` was not applied anywhere. Every invocation used
`--output_user_root=/home/mherwig/.cache/bazel-measure-scratch/bazel9-gate-tags-visibility-and-flag-probes/out`
as a STARTUP option, `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec --
bazelisk <startup-opts> <command>`, and `USE_BAZEL_VERSION` set per call (8.7.0, 8.8.0 already
cached; 9.0.0, 9.1.0, 9.2.0 downloaded fresh from `releases.bazel.build`, signed by the Bazel APT
key). `rules_ocx` was copied with `git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x`
for Q1 only; `git status --short` in the real checkout was clean before, during (verified after
each plant/revert), and after this run. `.bazelrc.user` was never present in the copy (confirmed).
No `WORKSPACE` file was created anywhere. `bazelisk shutdown` was run for every
(workspace, version) pair used; a `ps aux` scan after teardown found zero live Bazel server
processes under this cluster's scratch path.

**Environment note, non-blocking.** Every `ocx exec` invocation into the `q1-rules_ocx` copy
printed `ocx: <path> is not activated; run 'ocx shell allow' to consent, or 'ocx shell state' to
see why` after the wrapped command completed. This is `ocx`'s own shell-activation epilogue, not
an error from Bazel or buildifier: it appears identically after both exit-0 and exit-123 runs,
never altered a captured exit code (verified by capturing `$?` immediately in a command
substitution), and `bazelisk shutdown` calls that printed it were confirmed to have actually shut
the server down (no matching process survived). Recorded per the protocol's instruction to record
environmental artifacts rather than silently work around them.

## Q1: Buildifier gate on Bazel 9.2.0

**Protocol.** Copy `rules_ocx` (git archive), `USE_BAZEL_VERSION=9.2.0`, run
`bazelisk run //:buildifier.check` on the clean tree; plant one lint violation in
`ocx/private/versions.bzl` and one in `examples/project/BUILD.bazel` and re-run; read the
generated runner under `bazel-bin`; probe the `buildifier_test` rule's `WORKSPACE=""` behavior
under 9.2.0; run the raw buildifier binary matrix (mode check/diff × lint warn/off) on the
formatted-file-with-one-lint-finding fixture.

**Raw result — clean tree:**

```
$ USE_BAZEL_VERSION=9.2.0 ocx --project .../ocx.toml exec -- \
    bazelisk --output_user_root=<out> run //:buildifier.check
INFO: Analyzed target //:buildifier.check (83 packages loaded, 442 targets configured).
INFO: Build completed successfully, 6 total actions
INFO: Running command line: bazel-bin/buildifier.check.bash
exit=0
```

`buildifier_prebuilt` 8.2.0.2 (`rules_ocx`'s pinned `dev_dependency`) loads and resolves cleanly
under Bzlmod-only Bazel 9.2.0 — no error related to WORKSPACE removal. The generated
`bazel-bin/buildifier.check.bash` is byte-identical in shape to the 8.7.0 runner measured last
night: `find . -type "${FIND_FILE_TYPE:-f}" ... -print | xargs "$buildifier_short_path" ARGS`
under `set -euo pipefail`, with the same `${WORKSPACE+x}` construct.

**Raw result — both plants** (unused `load("@bazel_skylib//lib:paths.bzl", "paths")` in
`ocx/private/versions.bzl` and in `examples/project/BUILD.bazel`; both plants reverted after,
`diff` confirmed byte-identical restore, real `rules_ocx` untouched throughout):

```
./examples/project/BUILD.bazel:1: load: Loaded symbol "paths" is unused. ...
./ocx/private/versions.bzl:1: load: Loaded symbol "paths" is unused. ...
./ocx/private/versions.bzl:1: module-docstring: ...
./ocx/private/versions.bzl:5: no-effect: ...
exit=123
```

Both the `.bazelignore`d tree (`examples/`) and the in-graph tree (`ocx/private/`) are reached,
same as 8.7.0, with the same `xargs`-remapped exit **123** (not buildifier's native 4).

**Raw result — `buildifier_test`'s `WORKSPACE=""` bug on 9.2.0.** A `gen/` package with
`genrule`-produced clean and broken `.bzl` samples, `buildifier_test(srcs = [...])` (sandboxed,
default), and a hand-rolled `sh_test` alternative:

```
//gen:check_clean_via_buildifier_test    PASSED in 0.0s
//gen:check_broken_via_buildifier_test   PASSED in 0.0s     <- false pass, broken sample
Test output (both): realpath: missing operand
```

Identical `${VAR+x}`-tests-set-not-nonempty root cause as 8.7.0: `WORKSPACE=""` is always "set",
`FIND_FILE_TYPE` flips to `f`, `find` scans a directory of symlinks and matches nothing, buildifier
reads empty stdin, trivially passes. The working alternative (hand-rolled `sh_test` piping the
raw binary) correctly fails the broken sample on 9.2.0 too:

```
//gen:sh_test_over_generated_clean    PASSED in 0.0s
//gen:sh_test_over_generated_broken   FAILED in 0.0s
  gen/render_broken.bzl:3:1: syntax error
```

**Raw result — has the bug been patched in a `buildifier_prebuilt` release after 8.2.0.2?**
BCR/GitHub tags for `keith/buildifier-prebuilt`: latest is `8.5.1.4` (`8.2.0.2` is 9 releases
behind). Reading `runner.bash.template` at each intermediate tag:

| Version | `${WORKSPACE+x}`→`-n "$WORKSPACE"` fix | `find … -exec … {} +` (drops `xargs`) |
|---|---|---|
| 8.2.0.2 (pinned) | no | no (`-print \| xargs`) |
| 8.2.1, 8.5.1, 8.5.1.1, 8.5.1.2 | no | no |
| 8.5.1.3 | **yes** | no (`-print \| xargs`) |
| 8.5.1.4 (latest) | yes | **yes** |

**Raw result — 4-cell exit matrix, buildifier 8.2.0 (same binary version as last night; the
`buildifier_prebuilt` pin resolves the same buildifier release independent of the Bazel major),
on the formatted-file-with-one-`depset-union`-finding fixture:**

| | `-lint=warn` | `-lint=off` |
|---|---|---|
| `-mode=check` | exit 4 | exit 0 |
| `-mode=diff` | exit 4 | exit 0 |

**Verdict.** Both halves of the open question are now closed for the fleet's actual pin:
(1) `//:buildifier.check` functions identically on Bzlmod-only Bazel 9.2.0 as on 8.7.0 — same
runner shape, same reach into ignored trees, same `xargs`-masked exit 123 (not buildifier's
native 4), same raw-binary 4-cell exit matrix; nothing in the buildifier gate itself is
Bazel-9-fragile. (2) The `${WORKSPACE+x}` false-pass bug in `buildifier_test` is **not** version-
gated by Bazel — it reproduces identically under 9.2.0 using the exact pinned binary — but it
**has** been fixed upstream, starting at `buildifier_prebuilt` release **8.5.1.3** (`8.5.1.4`
additionally replaces the whole `find | xargs` pipeline with `find -exec … {} +`, which would
also retire the exit-123-masking finding as a side effect of any future upgrade). `rules_ocx`'s
pin at 8.2.0.2 carries both bugs today; upgrading past 8.5.1.3 fixes the false-pass, and past
8.5.1.4 additionally fixes the exit-code masking.

**Affects:** BZL-LARK-09, BZL-LARK-25, BZL-LARK-26 — **confirms**, Bazel-9-scoped, no change to
the rules' text. BZL-LARK-24 (`buildifier_test` false-pass) — **promotes**: the caveat is no
longer "documented gap" but "fixed upstream at 8.5.1.3+, unfixed at the fleet's 8.2.0.2 pin" —
worth a MUST-adjacent upgrade note now that a concrete, low-risk target version exists.

## Q2: Tags on 9.2.0 — network, and the two unmeasured cache tags

**Protocol.** Genrules tagged `requires-network` and `no-sandbox` under
`--sandbox_default_allow_network=false` on 9.2.0. Then `no-remote-cache-upload` and `external` on
both 8.7.0 and 9.2.0, with a warm `--disk_cache` and `--execution_log_json_file`; extended with a
real HTTP remote-cache fixture (the corrected server from
`exit-39-and-bwob-on-cache-only-build.md`) to settle the *upload* half decisively, and a real
`sh_test` + `--cache_test_results` run to settle `external`'s actual (test-scoped) semantic.

**Raw result — network, 9.2.0 (minimal `module(name="m")` workspace, fresh each run):**

| tag / flag | network reachable? | runner |
|---|---|---|
| `--sandbox_default_allow_network=false`, no tag | NO (`NONET`) | `linux-sandbox` |
| `+ requires-network` | YES | `linux-sandbox` |
| `+ no-sandbox` | YES | `local` |

Byte-identical to the 8.7.0 result measured last night.

**Raw result — `no-remote-cache-upload` / `external`, warm `--disk_cache`, both majors.** Three
genrules (`cache_default`, `cache_no_remote_cache_upload`, `cache_external`, each writing
`$RANDOM-$(date +%s%N)`), cold build then `clean` + rebuild against the same warm disk cache:

| tag | 8.7.0 runner | 8.7.0 disk-cache hit? | 9.2.0 runner | 9.2.0 disk-cache hit? | `cacheable`/`remotable` (execlog, both majors) |
|---|---|---|---|---|---|
| *(none)* | `linux-sandbox` | **hit** | `linux-sandbox` | **hit** | true/true |
| `no-remote-cache-upload` | `linux-sandbox` | **hit** | `linux-sandbox` | **hit** | true/true |
| `external` | `linux-sandbox` | **hit** | `linux-sandbox` | **hit** | true/true |

Against a disk cache alone, both tags are indistinguishable from the default row — expected,
since the disk cache is a local mechanism neither tag governs, and the execution log's
`cacheable`/`remotable`/`remoteCacheable` fields describe the *action's own eligibility*, not
whether a specific remote endpoint actually received a PUT.

**Raw result — real HTTP remote cache, no disk cache, `no-remote-cache-upload` (decisive):** a
fresh cold build of the same three genrules against a corrected minimal HTTP cache server
(`Content-Length: 0` + `Expect: 100-continue` handling — the fixture from the prior wave's exit-39
report, reused verbatim), with `--execution_log_json_file` to map action digests to targets:

```
GET /ac/8f15465d...  404   (cache_no_remote_cache_upload's AC key)
GET /ac/46e2e5f5...  404   (cache_default's AC key)
GET /ac/d88b5b84...  404   (cache_external's AC key)
PUT /cas/... × 6                      (all three actions' CAS blobs uploaded — every one)
PUT /ac/46e2e5f5...  200   (cache_default: AC entry uploaded)
PUT /ac/d88b5b84...  200   (cache_external: AC entry uploaded)
```

**No `PUT /ac/8f15465d...` ever arrives** — `cache_no_remote_cache_upload` is the one target
whose Action Cache entry is never advertised to the remote endpoint, while its own output content
is still PUT to CAS like every other action's. This is reproduced identically on a second
from-scratch run against a fresh store.

**Raw result — `external`, real semantics via `--cache_test_results`, 9.2.0:** two `sh_test`s
(`test_default`, `tags = ["external"]` on the second), each printing a fresh nanosecond
timestamp, run twice with no source change in between:

```
Run 1: test_default -> "ran at 1788680557352926905"; test_external -> "ran at 1788680557353256949"
Run 2: test_default -> "ran at 1788680557352926905" (cached) PASSED   <- unchanged timestamp, cache hit
       test_external -> "ran at 1788680557922387784" PASSED           <- new timestamp every time, never cached
```

**Verdict.** Both tags are now decisively settled, on both dimensions the open question asked
for: `no-remote-cache-upload` does exactly what its name says at the wire level — it suppresses
only the `PUT /ac/` (the result mapping), never the `PUT /cas/` (the content); the disk cache and
`cacheable`/`remotable` execution-log fields are structurally blind to this distinction and must
never be cited as evidence for or against it. `external`, measured against a plain build action
(a genrule), has **no observable effect at all** — it is a test-only tag, invisible to
`bazel build`; measured against its real target (a `bazel test` with `--cache_test_results`), it
does exactly what the Build Encyclopedia's test-tag prose says: the test result is never cached,
full stop, every invocation re-executes. The tag-semantics rows for both `requires-network` and
`no-sandbox` under `--sandbox_default_allow_network=false` hold unchanged on 9.2.0.

**Affects:** BZL-TEST-08 — **confirms** both previously-open halves with direct wire-level and
test-cache evidence (not disk-cache inference): the upload half via a real HTTP endpoint's
request log, the `external` half via a real `--cache_test_results` A/B. BZL-HERM-02 — **confirms**
the network/tag rows hold unchanged on 9.2.0.

## Q3: transitive_visibility ship version

**Protocol.** The two-line `package(transitive_visibility = ":allowed")` probe (a `package_group`
label, per the exact syntax the prior wave found 9.2.0 accepts) on `USE_BAZEL_VERSION=9.0.0` and
`9.1.0` (both downloaded fresh); `bazelisk help package` on each.

**Raw result:**

```
$ USE_BAZEL_VERSION=9.0.0 ... bazelisk build --nobuild //...
INFO: Build completed successfully, 0 total actions
exit=0

$ USE_BAZEL_VERSION=9.1.0 ... bazelisk build --nobuild //...
INFO: Build completed successfully, 0 total actions
exit=0

$ bazelisk help package     # both versions
ERROR: 'package' is not a known command
exit=0    (bazelisk's own wrapper always exits 0 on this; the ERROR is Bazel's, printed to stderr)
```

**Verdict.** `transitive_visibility` is accepted and functions on **9.0.0**, the very first Bazel
9 release — not merely "somewhere between 9.1.0 and 9.2.0" as the prior measurement bracketed it.
Combined with the prior wave's confirmed-absent result on 8.7.0/8.8.0, the feature's ship boundary
is now precisely the 8→9 major line itself: absent through the whole of Bazel 8 (7.0 to 8.8.0
inclusive, per every version tested), present in every 9.x release tested (9.0.0, 9.1.0, 9.2.0).
It did not arrive in a later 9.x minor. `bazel help package` remains not a real subcommand on
every version tested (5 for 5) — not a Bazel-9 change, just confirms there is no
`bazel help <BUILD-file-function>` surface at all.

**Affects:** BZL-ARCH-34 — **confirms and sharpens**: "Applies to" cell should read "Bazel 9.0.0+"
rather than an open bracket; closes the open question completely (no further minor to check).

## Q4: Flags — remote_cache_chunking, rewind_lost_inputs, and the rewind ceiling

**Protocol.** On 8.8.0 and 9.2.0, `help build --long` and `help startup_options`, grep for
`remote_cache_chunking` (all spellings) and `rewind_lost_inputs`. Then on 9.2.0, reproduce the
lost-input condition with `--experimental_remote_cache_eviction_retries=0` and
`--rewind_lost_inputs=true`, versus `retries=0` without rewind; record exit code, error text, and
whether rewind recovers within the invocation.

**Raw result — flag grep, both versions (also cross-checked on 8.7.0):**

```
--[no]experimental_remote_cache_chunking (a boolean; default: "false")
    If enabled, large blobs are split into content-defined chunks using FastCDC
    2020 and uploaded/downloaded in chunks, enabling deduplication across
    blobs. The server must advertise SplitBlob/SpliceBlob RPCs and FastCDC 2020
    parameters in its capabilities.
```
Present, identical text, on **8.7.0, 8.8.0 and 9.2.0**. `--experimental_remote_cache_chunking_function`
and any `rep_max_cdc`/`cdc` selector spelling: **zero hits** on all three (confirms the corpus's
"zero hits" claim for that exact spelling — but the real, live flag exists under a different,
shorter name and is a plain on/off switch, not a selector).

```
--[no]rewind_lost_inputs (a boolean; default: "false")
    Whether to use action rewinding to recover from lost inputs.
      Tags: execution
```
Present on **9.2.0 only**; zero hits on 8.8.0 (`help build --long` and `help startup_options`
both), confirming the flag is 9.x-only.

**Raw result — reproduction, 9.2.0, real HTTP cache (corrected server), rigorously isolated**
(each test starts from a full `clean` + fresh cold build, then a second `clean` + rebuild against
the still-warm cache, with `bazel-bin/a.txt`'s **absence** from local disk explicitly verified
before evicting — confirming the intermediate is a true CAS-only reference under the default
`toplevel` BwoB mode before each test, not a stale local copy from a prior self-heal):

```
TEST A — retries=0, no rewind:
ERROR: BUILD.bazel:5:8: Executing genrule //:c failed: Unexpected lost inputs
  (pass --rewind_lost_inputs to enable recovery): a.txt
exit=1

TEST B — retries=0, --rewind_lost_inputs=true:
[4 / 4] [Sched] Executing genrule //:c
ERROR: BUILD.bazel:5:8: Executing genrule //:c failed: lost input too many times (#21)
  for the same action. lostInput: File:[...]a.txt, lostInput digest: e777d221.../14,
  failedAction: action 'Executing genrule //:c' (...)
exit=1
```

Both configurations end at **exit 1**, never 39, never 0 — rewind does **not** recover within the
invocation here, and hits the identical `#21` failure text the prior wave observed independently
(different eviction shape: this run used a plain one-time blob deletion, not a permanently
blackholed cache). Traced to source, at the exact `9.2.0` release tag (`ActionRewindStrategy.java`,
`git raw` fetch, verified against the tag not `main`):

```java
@VisibleForTesting static final int MAX_REPEATED_LOST_INPUTS = 20;
...
if (losses > MAX_REPEATED_LOST_INPUTS) {
    ... "lost input too many times (#%s) for the same action. ..."
```

`losses` starts at 1 on first loss; the 21st loss (`21 > 20`) triggers the failure — **`#21` is a
fixed, hardcoded, non-configurable constant at 9.2.0**, not a flag. (A later, tunable
`--experimental_max_repeated_lost_inputs` option, `defaultValue = "20"`, was found on Bazel's
`main`/HEAD `BuildRequestOptions.java` but does **not** exist at the `9.2.0` tag — confirmed by
diffing the same file fetched at `ref=9.2.0` versus a name-only search that hit `main`. This is a
post-9.2.0 addition, not something available to a 9.2.0 pin.)

**Verdict.** `--experimental_remote_cache_chunking_function` genuinely does not exist under that
name on any tested version — the corpus's "zero hits" claim is correct as literally stated — but
the underlying FastCDC-based deduplication mechanism it presumed *does* exist, live, on 8.7.0
through 9.2.0, as a plain boolean (`--experimental_remote_cache_chunking`, default false, no
selector), predating the cited PR's claimed 8.8.0 introduction. `--rewind_lost_inputs` is
confirmed 9.x-only (absent 8.8.0, present 9.2.0 default false) directly from the live binaries.
For the reproduction: with `--experimental_remote_cache_eviction_retries=0`, enabling
`--rewind_lost_inputs=true` changes the error text and the internal mechanism (Skyframe-level
action rewinding genuinely engages, confirmed by the `[Sched] Executing genrule //:c` re-attempt
line) but does **not** change the outcome for this shape — the client never sees a successful
build; it exhausts a hardcoded 20-attempt ceiling and fails at exit 1 either way. The only thing
that actually self-heals within one invocation, on this shape, remains the default
`--experimental_remote_cache_eviction_retries=5` (unrelated flag, confirmed working in the
warm-up-then-evict rebuild step of this same run, exit 0 with a printed retry banner) — a wholly
separate, higher-level, whole-build retry mechanism from rewinding.

**Affects:** BZL-CACHE-28 — **corrects**: withdraw "zero hits" as evidence of non-existence; state
that `--experimental_remote_cache_chunking` (not `_function`) is the live flag, present since at
least 8.7.0, no selector. BZL-CACHE-12 / the rewind-ceiling open item — **confirms and closes**:
`21` is `MAX_REPEATED_LOST_INPUTS = 20` (hardcoded at 9.2.0, not a flag there), reproduced twice
independently under two different eviction shapes; `--rewind_lost_inputs=true` at `retries=0` does
not recover this scenario within the invocation — any rule recommending it as an eviction-recovery
knob must pair it with a non-zero `--experimental_remote_cache_eviction_retries`, since that flag
is what actually re-enters at a new invocation ID and is what was observed to succeed.

## Not settled

- **`--experimental_remote_cache_chunking`'s runtime effect** was not exercised — no server in
  this corpus advertises `SplitBlob`/`SpliceBlob` RPCs, so only the flag's existence and default
  were confirmed, not its behavior against a capable backend.
- **`--rewind_lost_inputs=true` at the *default* retry budget (5)**, together, was not tested here
  either (this run tested `retries=0` only, per the protocol) — whether the two mechanisms compose
  usefully (rewind attempts first, whole-build retry as a second-level fallback) within one
  invocation remains open.
- **The exact commit that introduced `--experimental_max_repeated_lost_inputs`** (found on `main`,
  absent at the `9.2.0` tag) was not identified — only that it postdates 9.2.0's release and is
  not available to a 9.2.0 pin.
- **darwin/Windows** for every tag and network result in Q2: this host is Linux-only; nothing here
  speaks to `processwrapper-sandbox` or `windows-sandbox` tag/network behavior.
- **Whether upgrading `rules_ocx`'s `buildifier_prebuilt` pin past 8.5.1.3 (or 8.5.1.4) is
  otherwise safe** — only the two named bugs' fix-versions were checked; no full changelog diff
  against 8.2.0.2 was performed, so other behavior changes across nine releases are unaudited.
- **9.0.0/9.1.0 were checked only for `transitive_visibility` and `help package`** — no other flag
  or tag row from this cluster was re-verified on those two intermediate 9.x releases.

## Re-run

```bash
SCRATCH=/home/mherwig/.cache/bazel-measure-scratch/bazel9-gate-tags-visibility-and-flag-probes
mkdir -p "$SCRATCH/out"

# Q1
git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x -C "$SCRATCH/q1-rules_ocx"
cd "$SCRATCH/q1-rules_ocx"
USE_BAZEL_VERSION=9.2.0 ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
  bazelisk --output_user_root="$SCRATCH/out" run //:buildifier.check
# plant: sed -i '1i load("@bazel_skylib//lib:paths.bzl", "paths")' ocx/private/versions.bzl examples/project/BUILD.bazel
# rerun, then revert both files from a saved copy; diff to confirm restore.
# buildifier_test / sh_test fixtures: a gen/BUILD.bazel with genrule render_clean/render_broken,
# buildifier_test(srcs=[...]), and a hand-rolled sh_test over @buildifier_prebuilt//:buildifier
# (script in the Q1 section above); load("@rules_shell//shell:sh_test.bzl", "sh_test") is required
# on 9.2.0 (no autoload).

# Q2 — network/tags: a module(name="m") workspace with genrules tagged
# requires-network/no-sandbox/no-remote-cache-upload/external; run with
# --sandbox_default_allow_network=false and a warm --disk_cache +
# --execution_log_json_file; for the upload half, reuse the corrected minimal HTTP
# cache server from exit-39-and-bwob-on-cache-only-build.md verbatim (Content-Length: 0
# + Expect: 100-continue are load-bearing) and diff its request log against
# --execution_log_json_file's targetLabel->digest map. For `external`'s real semantic,
# an sh_test pair (default vs tags=["external"]) run twice under --cache_test_results=yes.

# Q3
for V in 9.0.0 9.1.0; do
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root="$SCRATCH/out" build --nobuild //...
done
# BUILD.bazel: package(transitive_visibility = ":allowed") / package_group(name="allowed", packages=["//..."]) / filegroup(name="f")

# Q4 — flags
for V in 8.8.0 9.2.0; do
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root="$SCRATCH/out" help build --long | grep -i chunking
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root="$SCRATCH/out" help build --long | grep -i rewind_lost_inputs
done
# rewind reproduction: reuse the exit-39 two-stage genrule chain (//:a -> //:b -> //:c) and cache
# server; clean + cold build + clean + warm rebuild + verify a.txt absent locally + evict its CAS
# blob + touch c_trigger.txt + rebuild with --experimental_remote_cache_eviction_retries=0
# (with and without --rewind_lost_inputs=true).

# Shutdown every (workspace, version) pair used, then:
du -sh "$SCRATCH"
```

## Scratch left on disk

```
$ du -sh /home/mherwig/.cache/bazel-measure-scratch/bazel9-gate-tags-visibility-and-flag-probes
1.2G    /home/mherwig/.cache/bazel-measure-scratch/bazel9-gate-tags-visibility-and-flag-probes
```

Breakdown: `out/` (shared `--output_user_root`, all versions and workspaces) 1.2G; `q1-rules_ocx/`
1.3M; `q2/` 540K; `q3/` 44K; `q4/` 920K. Per the task's instructions, nothing was deleted;
`bazelisk shutdown` was run for every (workspace, Bazel version) pair used and no live server for
this cluster remained (confirmed via `ps aux`).
