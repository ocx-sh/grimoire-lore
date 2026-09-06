---
title: "Action-key path sensitivity and the execution log, measured"
slug: action-key-path-sensitivity-and-execlog
agent: measurement-wave-2-followup
model: claude-sonnet-5
date_measured: 2026-09-05
bazel_versions: ["8.7.0", "9.2.0"]
host: "Linux 6.18.33.2-microsoft-standard-WSL2 (WSL2), 32 vCPU, 31 GiB RAM"
affects_rule_ids:
  - BZL-HERM-01
  - BZL-HERM-04
  - BZL-HERM-10
  - BZL-CACHE-16
  - BZL-CACHE-18
  - BZL-CACHE-19
  - BZL-CACHE-20
  - BZL-CACHE-21
  - BZL-CACHE-22
answers:
  - "bazel-hermeticity-determinism open question: action-key path sensitivity (M-C-13)"
  - "bazel-hermeticity-determinism / bazel-caching-rbe: execution-log rows (BZL-CACHE-16 diagnostic procedure)"
---

# Action-key path sensitivity and the execution log, measured

## Table of contents

- [Environment](#environment)
- [Q1/Q2: does an action key depend on the workspace's absolute path?](#q1q2-does-an-action-key-depend-on-the-workspaces-absolute-path)
- [Q3: `--incompatible_strict_action_env`, measured from the log](#q3---incompatible_strict_action_env-measured-from-the-log)
- [Q4: `--experimental_output_paths=strip` and path mapping](#q4---experimental_output_pathsstrip-and-path-mapping)
- [Q5: is the execution log byte-identical across two clean builds?](#q5-is-the-execution-log-byte-identical-across-two-clean-builds)
- [Q6: the execution log cannot see output non-determinism](#q6-the-execution-log-cannot-see-output-non-determinism)
- [Not settled](#not-settled)
- [Re-run](#re-run)

## Environment

- Host: `free -g` → `total 31, used 19, free 0, shared 4, buff/cache 16, available 12` (Mem); `total 32, used 18, free 13` (Swap). `nproc` → 32. Kernel: `6.18.33.2-microsoft-standard-WSL2`.
- Total RAM (31 GiB) is above the 16 GiB threshold in the protocol, so `--host_jvm_args=-Xmx1g` was **not** added.
- Bazel versions actually run: `bazelisk --version` → `bazel 8.7.0` and `bazel 9.2.0` (both via `USE_BAZEL_VERSION`, through `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk`).
- `bazelisk info` (8.7.0, ws-a): `execution_root` and `output_base` sit under `<output_user_root>/c9e79b55611b6fe06d45b31b5649ea7d/...`; ws-b's own `output_base` hashed to `e53b251ef86f5f1467116560c1aca38b` — confirming Bazel derives a distinct, workspace-path-keyed output tree per checkout even under a shared `--output_user_root`.
- Spawn strategy: every build summary line read `N processes: ... linux-sandbox` and the execution-log `runner` field read `"linux-sandbox"` (or `"disk cache hit"` on a hit). `--subcommands` output confirmed the wrapper form `(cd <execroot> && ...)`. All findings below are **linux-sandbox-specific**; WSL2's sandbox is Linux-native here (no `processwrapper-sandbox` fallback was observed), so nothing here bears on the Windows-native CI legs `bazel-hermeticity-determinism.md` flags separately.
- **Environmental incident, recorded rather than worked around silently:** partway through the run, the shared host `/tmp` tmpfs (16 GiB, shared across concurrent agent sessions per the isolation contract) hit `100% used, ~4.7 MiB free` — a host-wide condition, not something in this measurement's own ~600 MB scratch usage. This happened exactly when the protocol's Bazel-9 leg needed to fetch `rules_shell` (plus its transitive `protobuf` dependency) to restore `sh_binary` under `--incompatible_autoload_externally`'s empty Bazel-9 default (wave-1 correction 2, confirmed live: `sh_binary` failed with `name 'sh_binary' is not defined` on 9.2.0 until an explicit `load()` was added). Rather than block on a host condition outside this measurement's control, the **9.2.0 leg substitutes a plain executable script referenced directly via `tools = ["runner.sh"]`** for the `sh_binary`-driven genrule, avoiding any new Bzlmod dependency. The **8.7.0 leg uses the real `sh_binary`** (it autoloads natively on Bazel 8, no fetch needed) for every other question. This substitution is confined to Q1/Q2's 9.2.0 cross-checkout comparison; it does not weaken that result because the actual mechanic under test — an action whose `tools=` attribute points at an on-disk executable invoked via `$(location)` — is exercised identically either way. Host `/tmp` recovered to `6.8 GiB free` by the end of the run with no action taken by this session.

## Q1/Q2: does an action key depend on the workspace's absolute path?

### Protocol

Built one scratch Bzlmod module (`module(name = "m")`, no other deps for the decisive runs) with five actions in one `BUILD.bazel`:

- `loc_test` — genrule writing `$(location src.txt)`, `$$PWD`, and `$(execpath src.txt)` to its output.
- `env_test` — genrule running `env | sort > $@`.
- `sh_test` — genrule with `tools = [":runner"]` (8.7.0: a real `sh_binary`; 9.2.0: the bare script, see caveat above) invoking the tool on `$(location src.txt)`.
- `date_test` — genrule running `date > $@` (Q6 fixture).
- `ls_test` — genrule running `ls -f $(dirname $(location src.txt)) > $@` (Q6 fixture; `-f` disables sorting).

Copied the identical workspace to two absolute paths: `.../scratchpad/measure/.../ws-a` and `.../scratchpad/measure/.../deep/er/ws-b` (`diff -rq` confirmed byte-identical source trees). Built both with `--execution_log_json_file=<path>` after `bazel clean --expunge` (forces real re-execution; `--execution_log_compact_file` was tried first but the compact format needs `//src/tools/execlog:parser` from a Bazel source checkout, which the protocol allows swapping for JSON — done here). Parsed the JSON with a small streaming-decoder script (`parse_execlog.py`, written for this run) because **`--execution_log_json_file` emits concatenated pretty-printed JSON objects with no separator and no wrapping array** — `json.loads()` on the raw file, or on any single line, fails; only a `JSONDecoder().raw_decode()` loop works. This is itself worth recording as a tooling trap for anyone scripting this flag.

Then ran the decisive test: populated a **shared `--disk_cache`** from a clean build of ws-a, then built ws-b (different absolute path, freshly expunged `output_base`) against that same disk cache and checked whether Bazel served the actions as **disk cache hits** — a hit is only possible if the action key computed at ws-b matches the key stored under ws-a's absolute path.

### Raw result

Both checkouts built cleanly (`exit=0`, `10 total actions` each incl. internal actions). Diffing the two normalized JSON logs with **no path substitution applied** showed zero differences in `commandArgs`, `inputs[].digest`, `environmentVariables`, or `listedOutputs` for any of the five actions — the only differences were in `actualOutputs[].digest.hash` for `date_test`, `env_test`, `loc_test`, `sh_test` (not `ls_test`), explained below.

Reading the actual output content confirmed why: `$(location src.txt)` and `$(execpath src.txt)` resolve to the exec-root-relative string `./src.txt` in **both** checkouts — never an absolute path. `$$PWD`, evaluated at run time inside the sandbox, differs only because it resolves to `<output_base-hash>/sandbox/linux-sandbox/<slot>/execroot/_main`, and `output_base` is itself an MD5-style hash **derived from** the absolute workspace path:

```
ws-a loc_out.txt: PWD=.../out/c9e79b55611b6fe06d45b31b5649ea7d/sandbox/linux-sandbox/4/execroot/_main
ws-b loc_out.txt: PWD=.../out/e53b251ef86f5f1467116560c1aca38b/sandbox/linux-sandbox/4/execroot/_main
```

Decisive disk-cache experiment (8.7.0):

```
ws-a (fresh, --disk_cache=$DISK): 10 processes: 5 internal, 5 linux-sandbox.  exit=0
ws-b (fresh output_base, same --disk_cache=$DISK, different absolute path):
  10 processes: 5 disk cache hit, 5 internal.  exit=0
```

All five genrule actions were served as `disk cache hit` in ws-b from cache entries written by ws-a. The execution log's top-level `digest` field (present **only** when a disk/remote cache is configured — absent entirely without one, confirmed by re-checking the earlier no-cache logs) is byte-identical between the executing run and the cache-hit run for every action:

| Target | ws-a digest (executed) | ws-b digest (disk cache hit) | Match |
|---|---|---|---|
| `date_test` | `0d9d3e2f9146e243…` | `0d9d3e2f9146e243…` | yes |
| `env_test` | `b5ed237b608d2112…` | `b5ed237b608d2112…` | yes |
| `loc_test` | `e7a656e9994dc7ba…` | `e7a656e9994dc7ba…` | yes |
| `ls_test` | `820d6a97ca91519e…` | `820d6a97ca91519e…` | yes |
| `sh_test` | `5bd396babc3f7ecc…` | `5bd396babc3f7ecc…` | yes |

Repeated the same digest comparison on **9.2.0** (script-file `sh_test` variant, see caveat): same result — `6 processes: 1 internal, 5 linux-sandbox` executing in ws-a, then `6 processes: 5 disk cache hit, 1 internal` in ws-b, all five digests byte-identical across checkouts.

Cache-hit content is stale-but-served: ws-b's post-hit `loc_out.txt` and `env_out.txt` literally contain **ws-a's** `output_base` hash in the `PWD=` line, proving the served bytes were never regenerated at ws-b — direct behavioral confirmation, not just a matching-field inference.

`--explain=<path> --verbose_explanations` was also captured on the ws-b disk-cache-hit build: it reported **`no entry in the cache (action is new)` for every single action, including the ones that were disk-cache hits.** `--explain` reasons from the *local* action-cache/metadata layer under `output_base` (which is fresh after `clean --expunge` and is itself workspace-hash-keyed), and cannot see a disk-cache or remote-cache hit at all — a real, previously undocumented-here tooling trap for anyone using `--explain` to diagnose cache behavior.

### Verdict

On Bazel 8.7.0 and 9.2.0, for `genrule`-shaped actions using `$(location)`/`$(execpath)` Make-variable substitution and `tools=` (whether a wrapped `sh_binary` on 8.7.0 or a bare executable file on 9.2.0), **the action key does not depend on the workspace's absolute checkout path.** The mechanism: `$(location)`/`$(execpath)` are resolved to exec-root-relative paths at analysis time, never absolute ones, so the recorded `commandArgs` and `inputs` — the material Bazel hashes into the action key — carry no absolute path. The *illusion* of path-dependence some builds exhibit comes from a different source entirely: a command that evaluates `$PWD` (or any ambient absolute-path-revealing state) **at run time** picks up the sandbox's exec root, whose parent directory (`output_base`) is a hash **derived from** the workspace's absolute path — so the *output content* differs across checkouts even though the *action key* does not. This is exactly the gap M-C-13 asked about: the key is stable, but a naive assumption that "stable key ⇒ stable/portable output" is false whenever an action reads ambient run-time state. No `--experimental_output_paths=strip`/path-mapping mechanism was needed to get key stability for these actions — they never had path sensitivity in the key to begin with, because native `$(location)` substitution already avoids it. Caveat: this was tested for genrule/native-substitution actions only; a hand-written action that shells out to `pwd`, embeds `$0`, or otherwise captures its own absolute exec root into a *tool argument* (not just output content) was not tested and could plausibly destabilize the key — out of scope here, flagged under Not settled.

### Affects

- **BZL-HERM-10** (no absolute paths in a declared output) — **confirms and sharpens**: the rule already covers emitted absolute paths; this measurement supplies the mechanism (`output_base` hash derived from workspace path, reached via `$PWD` at run time, not via any Bazel-injected literal) and a concrete repro.
- **M-C-13** — **settled**: action key is workspace-path-independent for this action shape; direct behavioral proof via cross-checkout disk-cache hit, not just field inspection.
- **BZL-CACHE-18** (host-resolved tool bypasses the cache key) — **confirms** by contrast: our `tools=` actions *do* trace to a declared `File` (a genrule tool or, on 8.7.0, an `sh_binary`), and their keys were exactly as stable as the pure-genrule actions — consistent with BZL-CACHE-18's claim that it's specifically *un-declared*, bare-PATH-resolved executables that escape the key.
- **BZL-CACHE-16** (diagnose from the execution log with the real `execlog:parser`, never `--explain`) — **confirms and extends**: `--explain` was directly observed reporting "action is new" on a confirmed disk-cache hit, positively demonstrating why BZL-CACHE-16 insists on the execution log (or the cache-hit summary line) rather than `--explain` for this diagnosis.

## Q3: `--incompatible_strict_action_env`, measured from the log

### Protocol

Built `//:env_test` with an ambient `LD_LIBRARY_PATH=/opt/fake-lib-path-marker` and `FOO_AMBIENT_MARKER=leaked-if-you-see-this` exported in the invoking shell, under three conditions, each after `bazel clean --expunge`: (a) 8.7.0 default flags, (b) 8.7.0 with `--incompatible_strict_action_env=true`, (c) 9.2.0 default flags (no override). Read the result from both the produced `env_out.txt` (ground truth: what the sandboxed process actually saw) and the JSON execution log's `environmentVariables` field (Bazel's own record).

### Raw result

```
8.7.0 default:            LD_LIBRARY_PATH=/opt/fake-lib-path-marker   (present)
                           FOO_AMBIENT_MARKER                          (absent)
8.7.0 --incompatible_strict_action_env=true:
                           LD_LIBRARY_PATH                             (absent)
                           FOO_AMBIENT_MARKER                          (absent)
9.2.0 default (no flag):  LD_LIBRARY_PATH                             (absent)
                           FOO_AMBIENT_MARKER                          (absent)
```

The execution log's own `environmentVariables` array for the 8.7.0-default run listed exactly `LD_LIBRARY_PATH = /opt/fake-lib-path-marker` alongside the full inherited `PATH` — confirmed at the log level, not just in the output file. Under strict mode (either the explicit 8.7.0 flag or 9.2.0's default), the recorded `PATH` collapsed to the fixed `/bin:/usr/bin:/usr/local/bin` and `LD_LIBRARY_PATH` was not present in the array at all.

Also notable: the arbitrary `FOO_AMBIENT_MARKER` never leaked, even under non-strict 8.7.0 — non-strict mode is not "inherit the whole client environment" but "inherit a fixed, named set of client variables (`PATH`, `LD_LIBRARY_PATH`, and similar), plus whatever `--action_env` names explicitly." That distinction was not in either wave-2 dive as measured fact.

### Verdict

Directly measured, not read from documentation: `--incompatible_strict_action_env` defaults **false** on Bazel 8.7.0 (both `PATH` and `LD_LIBRARY_PATH` from the invoking shell reach the sandboxed action) and **true** on Bazel 9.2.0 with no flag set (neither reaches it; `PATH` is pinned to `/bin:/usr/bin:/usr/local/bin`). This directly reproduces, by measurement, the version split that wave-2's `bazel-hermeticity-determinism.md` Verdict 1 established from `BazelRuleClassProvider.java` source reads — this run supplies the runtime confirmation the "deserves another research round" framing implicitly wanted, for this specific flag. A second, narrower fact this run adds: non-strict inheritance is a **named allowlist**, not a full-environment passthrough — an arbitrary developer-set variable did not leak even under the permissive default.

### Affects

- **BZL-HERM-01** — **confirms**, at the runtime level, the version split the rule is built on (Bazel 8.x false / Bazel 9.x+ true), closing the "needs a human decision" open question's premise (the flag's *default behavior* is no longer something a dive report claims — it's now something this run watched happen).
- **BZL-HERM-04** (Bazel 8: `--action_env` still reaches `repository_ctx.getenv()`; Bazel 9: silently not) — **touches, not settled**: this run measured the *action* environment (spawn env), not the repository-rule environment `BZL-HERM-04` is about; the allowlist-vs-full-inheritance nuance found here is adjacent evidence but does not itself confirm or contradict HERM-04's specific `getenv()` claim.

## Q4: `--experimental_output_paths=strip` and path mapping

### Protocol

`bazel help build --long` grep for `output_paths`, `path_mapping`, `remap`, `hermetic` on both pinned versions. Then built `//:loc_test` with `--experimental_output_paths=strip` set (8.7.0) and inspected the execution log's `commandArgs` and output paths for any change.

### Raw result

```
8.7.0: --experimental_output_paths (off, content or strip; default: "off")
9.2.0: --experimental_output_paths (off or strip; default: "off")
```

9.2.0 dropped the `content` mode present on 8.7.0. No flag named `path_mapping` exists on either version; the mechanism is `--experimental_output_paths=strip` plus, per `bazel help build --long`'s own text: *"Starlark actions can opt into path mapping by adding the key 'supports-path-mapping' to the 'execution_requirements' dict."*

With the flag set, `loc_test`'s recorded `commandArgs` and `listedOutputs`/`actualOutputs` paths were **byte-identical** to the unflagged build — still `bazel-out/k8-fastbuild/bin/loc_out.txt`, nothing stripped.

### Verdict

`--experimental_output_paths=strip` exists on both 8.7.0 and 9.2.0 (8.7.0 additionally offers a now-removed `content` mode) but has **zero observable effect on a native `genrule`**, because path mapping is strictly opt-in per action via `execution_requirements = {"supports-path-mapping": ...}`, and `genrule` does not set that key. The flag is real; it is simply not wired to the rule class this protocol used to probe it. This is a clean negative result, not an absence of a mechanism — a rule author would need to set the execution requirement explicitly (as some first-party rule implementations for compiled languages do) to see any effect.

### Affects

- No `BZL-HERM`/`BZL-CACHE` rule currently claims `--experimental_output_paths=strip` applies to genrule or shell-driven actions; this measurement is a **negative confirmation** that keeps the ruleset from over-claiming that flag's reach, and supplies the exact opt-in mechanism (`supports-path-mapping`) if a future rule wants to recommend it for rule authors specifically.

## Q5: is the execution log byte-identical across two clean builds?

### Protocol

Two consecutive `bazel clean --expunge` + `build --execution_log_json_file=<path>` cycles on ws-a (8.7.0, same absolute path both times, no disk cache). Byte-diffed the raw files, then field-diffed the parsed, normalized JSON (flattened to leaf key paths) to name exactly which fields differ.

### Raw result

Raw files differed (`diff -q` non-zero). Field-level diff, per target:

```
date_test: .actualOutputs[0].digest.hash, .metrics.executionWallTime, .metrics.startTime, .metrics.totalTime
env_test:  .actualOutputs[0].digest.hash, .metrics.executionWallTime, .metrics.startTime, .metrics.totalTime
loc_test:  .actualOutputs[0].digest.hash, .metrics.executionWallTime, .metrics.startTime, .metrics.totalTime
sh_test:   .actualOutputs[0].digest.hash, .metrics.executionWallTime, .metrics.startTime, .metrics.totalTime
ls_test:   .metrics.executionWallTime, .metrics.startTime, .metrics.totalTime   (no output digest change this run)
```

`commandArgs`, `inputs[].digest`, `listedOutputs`, and `environmentVariables` were identical for every action across both runs. Root cause of the `actualOutputs` differences, confirmed via `loc_out.txt`: the sandbox's numeric instance slot (`sandbox/linux-sandbox/<N>/`) is **not stable across separate build invocations** even in the same `output_base` — run 1 used slot `4`, run 2 used slot `2` for the same target — so any action reading `$PWD` (or, for `date_test`, wall-clock time directly) produces a different output byte-for-byte, even though its declared inputs never changed.

### Verdict

The execution log is byte-identical across two clean builds of the same workspace **after removing the `metrics` object** (`startTime`, `executionWallTime`, `totalTime` — always volatile, present on every action, safe to strip unconditionally) — **provided no action reads ambient state** (`$PWD`, `date`, unsorted directory listings that happen to vary, etc.). Where an action does read such state, its `actualOutputs[].digest` is a *legitimate* signal of non-determinism, not log noise, and must not be stripped as if it were volatile — conflating the two categories is the exact mistake BZL-CACHE-16's "diagnose from the execution log" procedure warns against. Re-runnable recipe:

```
bazel clean --expunge
bazel build --execution_log_json_file=run1.json //...
bazel clean --expunge
bazel build --execution_log_json_file=run2.json //...
python3 - <<'PY'
# load run1.json / run2.json as concatenated JSON (see parse_execlog.py:load_all),
# drop the top-level "metrics" object per entry, then diff.
PY
```

### Affects

- **BZL-CACHE-16** — **confirms**, with a concrete volatile-field list (`metrics.startTime`, `metrics.executionWallTime`, `metrics.totalTime`) that the rule's own text did not enumerate; also supplies the reusable stripping recipe the rule's verification section gestures at but does not spell out.
- **BZL-CACHE-20** (unstable `STABLE_` workspace-status keys) — adjacent, not directly settled: the mechanism (per-invocation sandbox slot number, not workspace status) is different from what BZL-CACHE-20 targets, but both land on the same class of "looked stable, was not" defect.

## Q6: the execution log cannot see output non-determinism

### Protocol

Reused `date_test` (embeds wall-clock time) and `ls_test` (`ls -f`, unsorted directory listing) as the two Q6 fixtures. Ran the exact catching command pair: `bazel clean --expunge && bazel build //... && sha256sum bazel-out/.../bin/*.txt`, twice, diffing the two `sha256sum` outputs — independent of, and in addition to, the Q5 execution-log diff.

### Raw result

```
$ diff run1.sha256 run2.sha256
1,3c1,3
< 4341e6128334cda7…  date_out.txt
< c8a3b216b18e074d…  env_out.txt
< f124d90606090b8c…  loc_out.txt
---
> d9fb59dede1ef991…  date_out.txt
> 750419d0cc164fe8…  env_out.txt
> ff958678c0cd11e8…  loc_out.txt
(exit=1 — diff caught it)
```

`ls_out.txt` and `sh_out.txt` matched in this particular pair of runs — not proof they always will (directory-entry order and sandbox-slot parity happened to coincide), which is itself the point: **a clean run of the execution-log diff alone (Q5) already reported these same three targets' `commandArgs`/`inputs` as byte-identical across both runs** — i.e., inspecting the log's declared "key material" gives zero indication that `date_out.txt`, `env_out.txt`, and `loc_out.txt`'s *content* changed. Only the independent `sha256sum` pass over the actual build outputs caught it.

### Verdict

Confirmed by direct pairing of the two techniques on the same two builds: the execution log (even fully parsed and diffed) answers "did the action's declared inputs/command change" — it does not and cannot answer "did the output change for the same declared inputs." Catching output non-determinism requires a **separate, explicit two-run output-digest comparison** (`sha256sum` over `bazel-out`, or equivalent), run in addition to — never instead of — an execution-log diff. The exact re-runnable command pair: `bazel clean --expunge; bazel build //...; sha256sum bazel-out/<config>/bin/*.txt` executed twice, diffed.

### Affects

- **BZL-CACHE-16** — **confirms and delimits scope**: the rule's execution-log procedure is for action-key/cache-key instability specifically; this measurement is the missing companion evidence that a *different* check (output digest diffing) is required for output non-determinism, and that the two do not substitute for each other. A future edit to BZL-CACHE-16 or a sibling `BZL-HERM` rule should state this scope boundary explicitly, citing this pairing.
- **BZL-HERM** action-nondeterminism taxonomy (general) — **confirms** the taxonomy's implicit premise that "action key stable" and "output deterministic" are different properties, now with a concrete, reproducible counter-example pair (`date`, `$PWD`-embedding genrule) rather than an assertion.

## Not settled

- **Whether an action key can be destabilized by an absolute path in a *tool's own argument construction*** (e.g., a custom rule or `run_shell` action that shells `pwd` into an argument rather than reading it at run time inside the command body) was not tested — only native `$(location)`/`$(execpath)` substitution and `$PWD`-in-output were measured. This is the natural next probe if M-C-13 is reopened for non-genrule rule authors.
- **`--experimental_output_paths=strip`'s effect on an action that *does* set `supports-path-mapping`** was not measured (no such action was built in this run) — only the negative (genrule, which doesn't set it) was confirmed.
- **Remote execution / RBE-side key comparison** was out of scope — everything here used local `linux-sandbox` plus a local `--disk_cache`; whether an RBE backend's own action-cache lookup behaves identically was not tested (`rules_ocx` is RBE-out-of-reach by design per the frame, so this was not prioritized).
- **Windows / `processwrapper-sandbox`** path sensitivity was not tested — this host is WSL2's native Linux sandbox throughout; the frame's own Windows CI legs use a different spawn strategy this run never exercised.
- The `content` mode of `--experimental_output_paths` (8.7.0 only, removed by 9.2.0) was not exercised — only `strip` and the default `off` were measured.

## Re-run

```
BASE=<some clean scratch dir>
mkdir -p "$BASE/ws-a" "$BASE/deep/er/ws-b" "$BASE/out"
# ... write MODULE.bazel (module(name="m")) and the BUILD.bazel with the five
# genrules described in Q1/Q2's Protocol into ws-a, then:
cp -a "$BASE/ws-a/." "$BASE/deep/er/ws-b/"
for WS in "$BASE/ws-a" "$BASE/deep/er/ws-b"; do
  ( cd "$WS" && USE_BAZEL_VERSION=8.7.0 bazelisk --output_user_root="$BASE/out" \
      clean --expunge && \
    USE_BAZEL_VERSION=8.7.0 bazelisk --output_user_root="$BASE/out" build \
      --disk_cache="$BASE/disk-cache-shared" \
      --execution_log_json_file="$BASE/log-$(basename "$WS").json" \
      //:loc_test //:env_test //:sh_test //:date_test //:ls_test )
done
# Compare the top-level "digest" field per target across the two logs
# (parse with a JSONDecoder().raw_decode() loop — the file is concatenated
# pretty-printed objects, not one JSON value or JSON-lines).
```
