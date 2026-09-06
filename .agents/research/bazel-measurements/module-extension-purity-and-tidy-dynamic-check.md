---
title: "Module-extension purity, tidy drift, and the repo-contents-cache dynamic checks"
slug: module-extension-purity-and-tidy-dynamic-check
agent: measurement-wave-2
model: sonnet
date_measured: 2026-09-05
bazel_versions: ["8.7.0", "8.8.0", "9.2.0"]
host: "Linux Workstation 6.18.33.2-microsoft-standard-WSL2 (WSL2, not a CI runner)"
affects_rule_ids:
  - BZL-MOD-02
  - BZL-MOD-10
  - BZL-MOD-14
  - BZL-MOD-15
  - BZL-MOD-16
  - BZL-MOD-26
answers:
  - "bazel-bzlmod-and-repo-rules.md § Open questions › deserves another research round › Module-extension purity, dynamic half"
  - "bazel-bzlmod-and-repo-rules.md § Open questions › deserves another research round › Repo-contents cache defaults"
  - "bazel-bzlmod-and-repo-rules.md § Open questions › deserves another research round › Remote repo-contents cache"
---

# Module-extension purity, tidy drift, and the repo-contents-cache dynamic checks

**Host caveat (stated once, referenced everywhere below as [WSL2]):** WSL2 under kernel
`6.18.33.2-microsoft-standard-WSL2`, not a CI runner. No question below built or ran an
action (every `fetch`/`mod deps` in this file reports "0 total actions"), so no spawn
strategy or sandbox behavior is exercised anywhere in this file — that axis is out of scope
here, not measured-and-omitted.

**Host tmpfs caveat:** `/tmp` on this host is a 16 GB tmpfs shared by every concurrent agent
session, not private to this measurement. A `fetch --all` (Q3, first attempt) on a
near-empty module with `--repo_contents_cache` set filled it to 3.6 GB by caching Bazel's
*implicit* bootstrap repos (`local_config_cc` and friends), not the two custom repos under
test, and drove the shared filesystem to 100% full, hanging an unrelated bazel client on
`epoll` for both. Recorded as an environment caveat, not a Bazel finding: production
`--repo_contents_cache` retains hermeticity-probe repos, not just the module's own, and a
scratch-dir choice for one can starve every co-located tenant on a shared tmpfs. All
subsequent Q3 work used targeted `fetch --repo=@name`, not `--all`.

## Table of contents

- [Environment](#environment)
- [Q1: Baseline — does tidy/mod-deps drift the checked-in files?](#q1-baseline--does-tidymod-deps-drift-the-checked-in-files)
- [Q2: Dynamic purity check](#q2-dynamic-purity-check)
- [Q3: Repo-contents cache](#q3-repo-contents-cache)
- [Q4: Freshness gate](#q4-freshness-gate)
- [Q5: `configure = True`](#q5-configure--true)
- [Not settled](#not-settled)
- [Re-run](#re-run)

## Environment

```
$ free -g
               total        used        free      shared  buff/cache   available
Mem:              31          19           0           4          16          12
Swap:             32          18          13

$ nproc
32

$ uname -a
Linux Workstation 6.18.33.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Thu Jun 18 21:54:43 UTC 2026 x86_64 GNU/Linux
```

Total RAM is 31 GB (rounded from 32091 MB per `bazel info`), above the 16 GB threshold in the
protocol, so `--host_jvm_args=-Xmx1g` was **not** used for any invocation in this file.

`bazel info` (8.7.0, isolated `--output_user_root`):

```
local_resources: RAM=32091MB, CPU=32.0
repository_cache: <scratch>/out/cache/repos/v1
```

No build or test action ran anywhere in this file (every `mod deps`/`fetch`/`build --nobuild`
reported `0 total actions`), so `--subcommands`/`--sandbox_debug` and the spawn strategy are
not applicable to any question here.

## Q1: Baseline — does tidy/mod-deps drift the checked-in files?

### Protocol

```
git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x -C <scratch>/rules_ocx
cd <scratch>/rules_ocx
cp MODULE.bazel MODULE.bazel.lock /tmp/…before
USE_BAZEL_VERSION=8.7.0 ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
  bazelisk --output_user_root=<scratch>/out mod deps --lockfile_mode=update
cmp before/after MODULE.bazel, MODULE.bazel.lock
… bazelisk mod tidy … cmp again
```

### Raw result

`mod deps --lockfile_mode=update`: exit 0. `MODULE.bazel` and `MODULE.bazel.lock`
byte-identical before/after (`cmp` silent both times). `mod tidy`: exit 0. Both files
byte-identical again after tidy. `lockFileVersion` is `24` throughout (matches the fleet's
committed lock, matches wave-2 Verdict 3).

`moduleExtensions` keys in the lock, both before and after:

```
@@pybind11_bazel+//:python_configure.bzl%extension
@@rules_fuzzing+//fuzzing/private:extensions.bzl%non_module_dependencies
@@rules_kotlin+//src/main/starlark/core/repositories:bzlmod_setup.bzl%rules_kotlin_extensions
@@rules_python+//python/private:pip.bzl%pip_internal
```

`//ocx:extensions.bzl%ocx` is absent from the lock in every run.

### Verdict

On `rules_ocx` 0.4.0 at the pinned 8.7.0, neither `bazel mod deps --lockfile_mode=update` nor
`bazel mod tidy` changes `MODULE.bazel` or `MODULE.bazel.lock` at all — the checked-in state
is already fully tidy and up to date, with zero `use_repo()` drift. The `ocx` extension is
confirmed absent from the lock (its `reproducible = True` claim holding), exactly as Wave-1
correction 3 and the "Applied to rules_ocx" section already state. This is a clean baseline,
not a new fact by itself — its value here is as the unmodified starting point for Q2 and Q4.

### Affects

- **BZL-MOD-10** (`mod tidy` behind a diff gate): confirms — a `git diff --exit-code`-style
  gate after `mod tidy` would currently pass with an empty diff on `rules_ocx`; the rule's own
  verification is directly reproducible.
- **BZL-MOD-14/15**: confirms the "Applied to rules_ocx" claim that the `ocx` extension is
  absent from the lock (no new information — a baseline check for Q2).

## Q2: Dynamic purity check

### Protocol

In the `extensions.bzl` copy, `return module_ctx.extension_metadata(reproducible = True)` →
`return module_ctx.extension_metadata()` (drop the claim). Then, all on 8.7.0:

1. `mod deps --lockfile_mode=update` (establish the extension's lock entry).
2. Re-run unchanged (control, same env) — confirm no spurious drift between identical runs.
3. Re-run with `--repo_env=OCX_MIRRORS=http://127.0.0.1:1` (a *site*-class variable per
   `AGENTS.md`, forwarded verbatim into the repo rules the extension instantiates).
4. Re-run with `--repo_env=HOME=/tmp/fake-home-xyz` (`OCX_HOME` is documented in `AGENTS.md`
   as "resolved, not forwarded" — i.e. derived from `HOME` inside a repo rule, not the
   extension).

Diff the extension's lock entry (`bzlTransitiveDigest`, `usagesDigest`,
`recordedRepoMappingEntries`, `generatedRepoSpecs`, `envVariables`) across all four runs.

### Raw result

Without `reproducible = True`, `//ocx:extensions.bzl%ocx` appears in the lock with:

```json
"envVariables": {},
"generatedRepoSpecs": {
  "ocx_tool": { "repoRuleId": "@@//ocx/private:download.bzl%ocx_download", "attributes": {"version": "0.6.0", "dist_manifest": "@@//dist:dist.json", "triple": ""} },
  "dev_tools": { "repoRuleId": "@@//ocx/private:project.bzl%ocx_project_repo", "attributes": {"ocx_toml": "@@//:ocx.toml", "ocx_lock": "@@//:ocx.lock", "bins": [], "groups": [], "platform": "", "isolated_home": false, "no_config": false, "allow_unverified": false, "allow_yanked": false} }
},
"recordedRepoMappingEntries": [["", "bazel_skylib", "bazel_skylib+"]]
```

Run 2 (control, unchanged env): lock byte-identical to run 1.
Run 3 (`--repo_env=OCX_MIRRORS=…`): `bzlTransitiveDigest`, `usagesDigest`,
`recordedRepoMappingEntries`, `generatedRepoSpecs`, `envVariables` — **all SAME** as run 1.
Run 4 (`--repo_env=HOME=…`): same five fields — **all SAME** as run 1.

`extensions.bzl` restored to `reproducible = True` and `MODULE.bazel.lock` restored to the Q1
baseline afterward; both confirmed byte-identical to the pristine copy.

### Verdict

On Bazel 8.7.0, the `ocx` module extension's evaluated lock entry is completely insensitive
to `OCX_MIRRORS` (a site-class variable its own repository rules read) and to `HOME` (the
variable `OCX_HOME` is documented to derive from). One live run promotes this from a named
procedure to a measured fact: **the extension implementation itself is pure with respect to
environment** — its `bzlTransitiveDigest`/`usagesDigest`/`generatedRepoSpecs`/`envVariables`
never move under an env change, because it never reads the environment; the env reads
(`getenv`, `OCX_HOME` resolution) live entirely in the repository rules the extension
instantiates (`ocx_download`, `ocx_project_repo`), which are evaluated later and separately
and are outside what `mod deps` inspects. This directly confirms the "expect yes" framing in
the open question: purity holds, dynamically, not just by source-comment inspection. Caveat:
this is one extension, tested against two variables (one site-class, one HOME-ish); it shows
the mechanism works as documented for this extension, not that every conceivable env read is
excluded from extension-level effects in general (a repo rule's `configure=True`/host-probing
path was not exercised here — that is Q5).

### Affects

- **BZL-MOD-14**: **promotes.** The rule's static grep-based verification (`ctx.os`/`getenv`
  absent from the extension's `.bzl` closure) now has a dynamic confirmation behind it for
  this concrete case: an env change genuinely produces zero lock-entry drift when the grep is
  clean. The rule's rationale sentence ("an impure impl marked reproducible produces silently
  divergent repos... with no lockfile diff to catch it") is validated from the *negative*
  side — a genuinely pure impl shows no diff, which is what makes the positive claim
  meaningful.
- **BZL-MOD-15**: confirms — the `reproducible = True` opt-in is measured as sound for this
  extension, not merely asserted by the source comment at `ocx/extensions.bzl:6-10`.

## Q3: Repo-contents cache

### Protocol

Part A — `bazel help fetch --long` on 8.7.0, 8.8.0, 9.2.0, grepping `repo_contents_cache` and
`experimental_remote_repo_contents_cache`.

Part B — scratch module `m` with two `repository_rule`s, `rcc_a` (`ctx.repo_metadata(reproducible
= True)` only) and `rcc_b` (same, plus `ctx.getenv("HOME")`). Targeted `bazel fetch
--repo=@rcc_a --repo=@rcc_b --repo_contents_cache=<dir>`, inspect `<dir>`, `bazel clean
--expunge`, fetch again, check whether the rule bodies re-execute (a `print()` DEBUG line) or
the cache is hit.

### Raw result

**Part A**, `bazel help fetch --long`, all runs exit 0:

| Version | `--repo_contents_cache` default | `--experimental_remote_repo_contents_cache` |
|---|---|---|
| 8.7.0 | `""` (explicit text: "An empty string... requests the repo contents cache to be disabled") | absent (0 hits across `fetch`/`build`/`mod`/`query`) |
| 8.8.0 | `""` (identical wording) | absent |
| 9.2.0 | `"see description"` → "requests the repo contents cache to be disabled, **otherwise the default of `{--repository_cache}/contents` is used**" | absent |

Confirmed live: on 9.2.0, running `bazel fetch --repo=@rcc_a --repo=@rcc_b` with **no**
`--repo_contents_cache` flag at all still created
`<out>/cache/repos/v1/contents/` and `.../content_addressable/` under the default
`repository_cache` path — the derived-default text is real, not aspirational.

**Part B**, 8.7.0, targeted fetch (`--repo_contents_cache=<dir>` set explicitly), exit 0:

```
DEBUG: rules.bzl:4:10: RCC_A_FETCHED
DEBUG: rules.bzl:13:10: RCC_B_FETCHED
INFO: Build completed successfully, 0 total actions
```

Cache dir populated with one entry per fetched repo; `grep -rl "fetched rcc_a"`/`"fetched
rcc_b"` on the cache directory each find exactly one match, each holding the repo's
`marker.txt` (including `rcc_b`'s, which recorded a real `HOME` value from `getenv`). After
`bazel clean --expunge` (fresh output-base `external/`) and a re-fetch of the same two repos
against the **same** cache dir: exit 0, **zero** `DEBUG` lines — neither rule body re-executed.
`INFO: All external dependencies for the requested targets fetched successfully.`

### Verdict

`--repo_contents_cache`'s live default flips between the 8.x line and 9.x: **still opt-in
(empty string) on 8.7.0 and 8.8.0** — the 8.4.0 walkback (Verdict 5) is not undone anywhere in
the 8.x line as of these two pins — and **on by default on 9.2.0**, derived from
`--repository_cache`, confirmed by an actual populated cache directory with no flag passed.
No source states this re-enablement; it is a genuine, version-gated default change that BZL-MOD-16
should carry explicitly rather than treating "opt-in" as true across all of Bazel 8/9.
`--experimental_remote_repo_contents_cache` does not exist as a flag on any of the three
pinned versions — a phantom-flag name of the same shape as `--experimental_remote_merkle_tree_cache`
(wave-2 correction 2), so BZL-MOD-16's "9.0.0+ experimental for the remote cache" line must
name a real flag or drop the claim of a dedicated flag entirely.

On the local mechanics: a `repository_rule` returning `repo_metadata(reproducible = True)`
**is** cached and **is** hit across `clean --expunge` — confirmed by absence of its DEBUG
print on the second fetch, not merely by a populated directory (a populated-but-unused
directory would be a weaker claim). Critically, `getenv()` usage inside the rule (`rcc_b`)
does **not** exclude it from the **local** repo-contents cache — both rules cached and both
hit. This sharpens BZL-MOD-16's remote-cache exclusion language: the `getenv`/`watch`
exclusion is a **remote**-cache-only bar per the rule text, and this measurement is the first
positive confirmation that the **local** cache draws no such line — the only local gate
observed is `repo_metadata(reproducible = True)` itself.

### Affects

- **BZL-MOD-16**: **promotes** (with a correction). The rule's core claim — an explicit
  `repo_metadata(reproducible = True)` return is what gates local-cache eligibility, and an
  implicit `return None` (never tested directly here, but consistent with every source cited)
  grants none — is now backed by an end-to-end cache-hit measurement, not just documentation
  reading. The rule's version note ("8.3.0+ (`repo_metadata`)") needs a second, version-gated
  line: the cache is opt-in through 8.8.0 and on-by-default from (at least) 9.2.0. The
  "9.0.0+ experimental for the remote cache" clause cites a flag that does not exist under
  that name on any pinned version; either the real flag name is unfound in this corpus or the
  clause should be removed.
- **Remote repo-contents cache** open question: partially answered — the flag-existence half
  is settled (absent on 8.7.0/8.8.0/9.2.0); the runtime-dependency-exclusion-is-temporary half
  is not (no remote cache server was exercised; see Not settled).

## Q4: Freshness gate

### Protocol

In the `rules_ocx` copy, bump `bazel_dep(name = "bazel_skylib", version = "1.9.0")` →
`"1.7.1"` without touching `MODULE.bazel.lock`. Run `mod deps --lockfile_mode=error` and
`build --nobuild --lockfile_mode=error //...`, both on 8.7.0 and (against a lock regenerated
under 9.2.0 first, so the failure isn't just a lockfile-version mismatch) on 9.2.0.

### Raw result

**8.7.0**, both invocations, exit `37` — but not the clean, documented lockfile-mismatch
message. Both crash:

```
FATAL: bazel crashed due to an internal error. Printing stack trace:
java.lang.RuntimeException: Unrecoverable error while evaluating node
  'Key[moduleName=bazel_skylib, registryUrl=https://bcr.bazel.build/]' …
Caused by: java.lang.IllegalStateException: Cannot fetch a file without a checksum in
  ENFORCE mode. This is a bug in Bazel, please report at
  https://github.com/bazelbuild/bazel/issues/new/choose.
  at …IndexRegistry.doGrabFile
  at …IndexRegistry.grabFile
  at …IndexRegistry.grabJsonFile
  at …IndexRegistry.grabJson
  at …IndexRegistry.getYankedVersions
  at …YankedVersionsFunction.compute
```

Network connectivity to `bcr.bazel.build` was verified live (HTTP 200 on both the module's
`source.json` and its `metadata.json`) — the crash is not a network-availability artifact.

**9.2.0**, with a lock freshly regenerated under 9.2.0 first (`lockFileVersion 28`), then the
same `bazel_skylib` bump applied and both invocations re-run: exit `37` again, **the identical
stack trace and cause** (`YankedVersionsFunction` → `IndexRegistry.getYankedVersions` →
"Cannot fetch a file without a checksum in ENFORCE mode"). Reproduces across both pinned
majors.

(A separate, earlier 9.2.0 run against the *stale, 8.7.0-schema* lock — before regenerating it
— did produce the clean, documented message: `ERROR: The version of MODULE.bazel.lock is not
supported by this version of Bazel. Please run 'bazel mod deps --lockfile_mode=update'…`,
exit 37. That is the lockFileVersion-mismatch path from Verdict 2, working exactly as
described — a different failure mode from the bazel_dep-bump path above.)

MODULE.bazel and MODULE.bazel.lock restored to the Q1 baseline afterward.

### Verdict

The CI invocation BZL-MOD-02 prescribes (`--lockfile_mode=error`) does go red on an
undeclared `bazel_dep` version bump — exit 37, non-zero, so a CI gate built on exit code alone
still catches the drift — but on **both** 8.7.0 and 9.2.0 it goes red via an **unhandled
internal Bazel crash** (`IllegalStateException`, "This is a bug in Bazel, please report"), not
via the clean, named lockfile-mismatch diagnostic that Verdict 2 describes for a
`lockFileVersion` mismatch. The two failure modes are triggered by different causes
(lockFileVersion mismatch vs. an in-graph module version bump reaching an unpinned yanked-versions
check) and produce different messages; a reader of Verdict 2 alone would reasonably expect the
named-message path for *any* stale-lock scenario, which this measurement shows is false for
the specific, very common scenario of "someone bumped a bazel_dep and forgot to run `mod
deps`." This is a real, reproducible Bazel defect at both pinned majors, not an environment
artifact (network confirmed live; reproduced twice per version).

### Affects

- **BZL-MOD-02**: **demotes, with a new finding attached.** The rule's own verification
  ("A hit... = FINDING (no freshness gate)") still holds — the gate does fire — but its
  supporting rationale ("`error`... fails loudly") needs a caveat: "loudly" here is an
  unhandled JVM crash and a stack trace, not the named message the rest of this family
  documents. A CI consumer parsing stderr for a specific string (rather than just the exit
  code) will not find one here. Worth a follow-on: file or find the upstream Bazel issue for
  `YankedVersionsFunction`/`IndexRegistry.getYankedVersions` crashing in `--lockfile_mode=error`
  when a new module version has no locked registry-file checksum yet.

## Q5: `configure = True`

### Protocol

Scratch module `m` with two `repository_rule`s reading `ctx.os.name` and writing a
timestamped `stamp.txt`: `cfg_repo` (`configure = True`) and `nocfg_repo` (no `configure`
attr). On 8.7.0: initial `fetch --repo=@cfg_a --repo=@nocfg_a` to populate both, then compare
`fetch --force --configure` (bare, whole-graph, filtered to `configure`-marked repos) against
`fetch --force --repo=@cfg_a --repo=@nocfg_a` (explicit names, force, no `--configure`
filter).

### Raw result

`bazel help fetch --long`, live text:

```
--[no]configure: Only fetches repositories marked as 'configure' for system-configuration
  purpose. Only works when --enable_bzlmod is on.
--[no]force: Ignore existing repository if any and force fetch the repository again.
  Only works when --enable_bzlmod is on.
```

Initial fetch — both ran, stamps recorded:
`cfg_a: time=1788645589918666649`, `nocfg_a: time=1788645589922848115`.

`bazel fetch --force --configure` (no explicit target — bare sweep): exit 0. Output shows
**one** DEBUG line — `CFG_A_RAN os=linux` — no `NOCFG_A_RAN`. Stamp check: `cfg_a` moved to
`1788645597284199838`; `nocfg_a` **unchanged**, still `1788645589922848115`.

`bazel fetch --force --repo=@cfg_a --repo=@nocfg_a` (no `--configure`, both named explicitly):
exit 0. **Both** DEBUG lines appear (`CFG_A_RAN`, `NOCFG_A_RAN`). Both stamps moved to
`1788645618076757870` / `1788645618077831005` respectively.

### Verdict

On Bazel 8.7.0, `configure = True` on a `repository_rule` is exactly what `bazel fetch --force
--configure` uses to decide which already-fetched repos to re-run: the bare sweep re-executed
only the `configure`-marked rule and left the non-configure rule's fetched state completely
untouched (byte-identical stamp). The same rules under a plain `--force` (with repos named
explicitly, bypassing the `--configure` filter) both re-ran unconditionally, regardless of
the `configure` attribute. This is a clean, decisive, reproducible confirmation of the
`configure`/`fetch --force --configure` contract this rule asserts — not merely restated
documentation.

### Affects

- **BZL-MOD-26**: **confirms**, end to end. "`configure` is the only knob `bazel fetch --force
  --configure` respects" is now a measured fact for a rule declaring `configure = True` versus
  one that does not, on the pinned 8.7.0. The rule's SHOULD severity and grep-based
  verification stand unchanged; no correction needed.

## Not settled

- **Remote repo-contents cache eligibility** (the `.marker`-file line-count heuristic
  BZL-MOD-16 proposes) was not exercised — no remote cache server was stood up in this
  measurement. Q3 settled only that the flag name the open question cited does not exist;
  whether the runtime-dependency exclusion itself has been lifted needs a real remote-cache
  round-trip, which this measurement's scope and the shared-tmpfs incident argued against
  attempting here.
- **The Q4 crash's root cause below the observed stack frame** — whether it reproduces for
  *any* bazel_dep version bump (tested here: one specific downgrade, `bazel_skylib` 1.9.0 →
  1.7.1) or is specific to this module/version pairing not having a locked
  `registryFileHashes` entry for that module's `metadata.json` — was not isolated further.
  Recorded as observed behavior, not as a fully root-caused defect.
- **Whether the `--repo_contents_cache` on-by-default change on 9.2.0 was introduced exactly
  at 9.0.0 or later** was not bisected; only the three pinned versions (8.7.0, 8.8.0, 9.2.0)
  were measured.

## Re-run

```bash
SC=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/946b693c-7b64-4917-9d73-8efea67c92ab/scratchpad/measure/module-extension-purity-and-tidy-dynamic-check
git -C /home/mherwig/dev/rules_ocx archive HEAD | tar -x -C "$SC/rules_ocx"
cd "$SC/rules_ocx" && USE_BAZEL_VERSION=8.7.0 ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
  bazelisk --output_user_root="$SC/out" mod deps --lockfile_mode=update && \
  bazelisk --output_user_root="$SC/out" mod tidy   # Q1: expect zero diff on MODULE.bazel / .lock
```

Full sequence (extension purity edit, the two `--repo_env` variants, the `bazel_skylib`
downgrade, the two scratch `repository_rule` modules, and every `bazelisk shutdown`) is
reconstructable from the Protocol/Raw result blocks above; no state outside this repository
was modified.
