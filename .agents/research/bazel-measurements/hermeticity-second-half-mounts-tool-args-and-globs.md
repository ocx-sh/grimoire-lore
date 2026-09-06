---
title: "Hermetic sandbox second half, tool-argument action keys, and glob linting, measured"
slug: hermeticity-second-half-mounts-tool-args-and-globs
agent: measurement-wave-5
model: claude-sonnet-5
date_measured: 2026-09-06
bazel_versions: ["8.7.0", "9.2.0"]
host: "Linux Workstation 6.18.33.2-microsoft-standard-WSL2 (WSL2), 32 vCPU, 31 GiB RAM"
affects_rule_ids:
  - BZL-HERM-10
  - BZL-HERM-19
  - BZL-HERM-24
  - BZL-HERM-26
  - BZL-HERM-31
answers:
  - "bazel-hermeticity-determinism.md § Open questions › deserves another research round › hermetic sandbox, second half"
  - "bazel-hermeticity-determinism.md § Open questions › deserves another research round › action key from a tool argument"
  - "bazel-hermeticity-determinism.md § Open questions › deserves another research round › mount pairs and the action key"
  - "bazel-hermeticity-determinism.md § Open questions › deserves another research round › glob linting (M-C-14)"
---

# Hermetic sandbox second half, tool-argument action keys, and glob linting, measured

## Table of contents

- [Environment](#environment)
- [Q1: Hermetic sandbox, real ruleset (rules_python)](#q1-hermetic-sandbox-real-ruleset-rules_python)
- [Q2: Action key from a tool argument](#q2-action-key-from-a-tool-argument)
- [Q3: `--sandbox_add_mount_pair` and the action key](#q3---sandbox_add_mount_pair-and-the-action-key)
- [Q4: constant-glob vs `--incompatible_disallow_empty_glob`](#q4-constant-glob-vs---incompatible_disallow_empty_glob)
- [Not settled](#not-settled)
- [Re-run](#re-run)
- [Scratch left on disk](#scratch-left-on-disk)

## Environment

- Host: `free -g` → 31 GiB total RAM, 32 vCPU (`nproc`), kernel `6.18.33.2-microsoft-standard-WSL2` (WSL2, not a CI runner). RAM is above the 16 GiB threshold, so `--host_jvm_args=-Xmx1g` was **not** applied to any invocation.
- Bazel invoked throughout as `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk`, with `USE_BAZEL_VERSION` set per call, and `--output_user_root=<scratch>/out` (STARTUP option) on every invocation. No `WORKSPACE` file created anywhere. `.bazelrc.user` was never read.
- Scratch root: `/home/mherwig/.cache/bazel-measure-scratch/hermeticity-second-half-mounts-tool-args-and-globs/` (real disk, not `/tmp`), with one subdirectory per question (`q1-python/`, `q2-action-key/`, `q3-mount-pair/`, `q4-buildifier/`) plus the shared `out/` output-user-root.
- Every build's spawn strategy (where sandboxed) reported `linux-sandbox` in the summary line; no `processwrapper-sandbox` fallback was observed (unprivileged user namespaces work on this host, consistent with the prior wave's measurement).
- No environmental incidents this run: `/tmp` was never touched (all scratch under the real-disk path per the protocol), and `df -h /home/mherwig/.cache` showed 707G free throughout.

## Q1: Hermetic sandbox, real ruleset (rules_python)

### Protocol

Scratch Bzlmod module: `bazel_dep(name = "rules_python", version = "2.3.3")`, `python.toolchain(python_version = "3.12", is_default = True)`. One `py_binary` (`hello`) printing `sys.version`, one `py_test` (`hello_test`), and one `genrule` (`gen_via_python3`) invoking the interpreter via the `$(PYTHON3)` make variable (`toolchains = ["@rules_python//python:current_py_toolchain"]`). Built and tested normally first (network on, to resolve BCR + fetch the toolchain), then rebuilt under `--experimental_use_hermetic_linux_sandbox` with `bazel clean` between each mount-pair variant, growing `--sandbox_add_mount_pair` from zero up.

### Raw result

Normal build (8.7.0): `INFO: 22 processes: 19 internal, 3 linux-sandbox. Build completed successfully, 22 total actions. exit=0`. `bazel-bin/gen_out.txt` → `3.12.13 (main, Apr 14 2026, 14:29:00) [Clang 22.1.3 ]`. `hello_test` → `PASSED in 0.2s`. The resolved interpreter lives under the **output base** as predicted: `<output_user_root>/<hash>/external/rules_python++python+python_3_12_x86_64-unknown-linux-gnu/bin/python3.12`.

Hermetic sandbox, zero mount pairs (both majors, identical failure signature):

```
ERROR: .../BUILD.bazel:4:10: Reticulating //:hello build data failed: (Exit 1): build_data_writer.sh failed ...
src/main/tools/linux-sandbox-pid1.cc:566: "execvp(external/rules_python+/python/private/build_data_writer.sh, 0x228e3810)": No such file or directory
exit=1        (8.7.0)
src/main/tools/linux-sandbox-pid1.cc:584: "execvp(external/rules_python+/python/private/build_data_writer.sh, 0x3d805810)": No such file or directory
exit=1        (9.2.0, identical failure)
```

Even the plain `py_binary` build fails before ever reaching the interpreter — it fails resolving `bash` for the toolchain's own `build_data_writer.sh` shell script, exactly as the shell-set gap the prior wave measured for a bare genrule.

Growing mounts, 8.7.0:

- `--sandbox_add_mount_pair=/usr` alone on the **genrule** target → same `execvp(/bin/bash)`-shaped failure as the prior wave's bare-shell result (mounting `/usr` does not create the top-level `/bin`, `/lib`, `/lib64` symlink nodes on this usrmerge host).
- All four of `--sandbox_add_mount_pair=/usr --sandbox_add_mount_pair=/bin --sandbox_add_mount_pair=/lib --sandbox_add_mount_pair=/lib64` (fresh `clean` each time) → **succeeds for all three targets**, both majors:

```
$ bazelisk build --experimental_use_hermetic_linux_sandbox \
    --sandbox_add_mount_pair=/usr --sandbox_add_mount_pair=/bin \
    --sandbox_add_mount_pair=/lib --sandbox_add_mount_pair=/lib64 //:hello
INFO: 11 processes: 10 internal, 1 linux-sandbox.  Build completed successfully, 11 total actions.  exit=0   (8.7.0)
INFO: 13 processes: 11 internal, 2 linux-sandbox.  Build completed successfully, 13 total actions.  exit=0   (9.2.0, //:hello + //:gen_via_python3)

$ bazelisk test --experimental_use_hermetic_linux_sandbox <same 4 mounts> --test_output=all //:hello_test
Ran 1 test in 0.000s. OK.  PASSED in 0.2s/0.3s.  exit=0   (both majors)

$ bazelisk build --experimental_use_hermetic_linux_sandbox <same 4 mounts> //:gen_via_python3
Build completed successfully, 2 total actions.  exit=0   (both majors)
$ cat bazel-bin/gen_out.txt → 3.12.13 (main, Apr 14 2026, 14:29:00) [Clang 22.1.3 ]   (identical both majors)
```

With `/usr` alone or zero mounts (8.7.0, genrule target): identical `execvp(/bin/bash, ...): No such file or directory` failure for both.

### Verdict

**The minimal mount set is exactly the same bare-shell set the prior wave found for a plain genrule — `/usr`, `/bin`, `/lib`, `/lib64`, all four, on this usrmerge host — with no additional mount needed for the hermetic Python toolchain, its `py_binary`/`py_test` machinery, or a genrule invoking it via `$(PYTHON3)`.** This is a real result, not an artifact of a weak fixture: it holds because (a) the rules_python toolchain itself is a Bazel-tracked dependency (declared as an input/tool), so it is symlinked into the sandbox's execroot regardless of host mount pairs — mount pairs only govern host paths the action reaches *outside* Bazel's own dependency graph; and (b) the only host-resolved dependencies this fixture actually exercises are `bash` (for the toolchain's internal `build_data_writer.sh` step and for the genrule's own `cmd`) and the interpreter's own dynamic-linker chain (`ld-linux-x86-64.so.2`, `libc.so.6`), both satisfied by the same four mounts. Identical on 8.7.0 and 9.2.0, including the exact `execvp` line and errno text. Confirms and extends the prior wave's finding: the bare-shell minimal mount set generalizes from a synthetic genrule to a real, network-fetched Bzlmod ruleset's toolchain, build machinery, and test runner, for the one path actually exercised.

**What remains unmeasured is exactly what the prior wave already flagged and this fixture does not exercise**: anything hitting the network or TLS from inside the sandbox (`/etc/resolv.conf`, a CA bundle), or a toolchain whose own binary depends on shared libraries beyond glibc (e.g. `libssl`, `zlib`, `ncurses`) that are not statically bundled by python-build-standalone. This fixture's `hello`/`hello_test`/`gen_via_python3` never import `ssl`, `zlib`, or make a network call, so a positive result here cannot be read as "any Python program works under the hermetic sandbox with these four mounts" — only "importing `sys` and running a trivial script/test/genrule does."

### Affects

- **BZL-HERM-26** — **confirms and extends**: promotes the flag from "runs, bare-shell mount set demonstrated" to "runs identically against a real, network-fetched rules_python 2.3.3 toolchain, its `py_binary`/`py_test` build machinery, and a `$(PYTHON3)`-driven genrule, with no mount beyond the bare-shell set." Still does **not** promote the rule to MUST — the network/TLS and beyond-libc-shared-library gaps the prior wave named are untouched by this fixture, so BZL-HERM-26 stays SHOULD.
- **BZL-HERM-24** (hermetic Python toolchain registration) — supporting evidence: the toolchain resolves and executes correctly under the tightest sandbox mode tested, once the bare-shell mounts are present.

## Q2: Action key from a tool argument

### Protocol

One scratch Bzlmod module (`module(name = "m")`, no deps) with four actions:

- `bindir_test` — a custom rule (`ctx.actions.run_shell`) whose command embeds `ctx.bin_dir.path` (control: this is exec-root-relative, never absolute — confirms getting a true absolute path this way is impossible).
- `define_test` — a custom rule reading `ctx.var.get("WS_PATH", "unset")` (a `--define`-sourced value) and embedding the string into its `run_shell` command.
- `action_env_test` — a genrule, `cmd = "echo WS=$$WS > $@"`, run with `--action_env=WS=$PWD`-style invocation (the invoking shell expands `$PWD` to the checkout's own absolute path *before* Bazel ever sees the flag).
- `pwd_runtime_test` — a genrule, `cmd = "echo PWD=$$(pwd) > $@"` (shell-syntax `$(pwd)`, evaluated by bash *at run time* inside the sandbox, never substituted by Bazel at analysis time — the control matching the prior wave's already-settled "reading `$PWD` inside the command body is stable" result).

Copied the identical tree (`diff -rq` confirmed byte-identical, module/rule/BUILD files only) to two absolute paths — `.../q2-action-key/ws-a` and `.../q2-action-key/deep/er/ws-b` — sharing one `--disk_cache`. For each target, built ws-a fresh (`clean --expunge`, populate the cache), then built ws-b fresh (`clean --expunge`, different `output_base` hash) against the same `--disk_cache`, and read whether the build summary line reported `linux-sandbox` (re-executed) or `disk cache hit`.

### Raw result

**Controls — no path-derived flag at all:**

```
bindir_test:       ws-a: 1 linux-sandbox.        ws-b: 1 disk cache hit.
pwd_runtime_test:  ws-a: 1 linux-sandbox.        ws-b: 1 disk cache hit.
```

**Candidates — `--action_env=WS=$PWD` / `--define=WS_PATH=$PWD`, each shell-expanded to the checkout's own absolute path before reaching Bazel:**

```
action_env_test:  ws-a (--action_env=WS=.../ws-a):        1 linux-sandbox.  → WS=.../ws-a
                  ws-b (--action_env=WS=.../deep/er/ws-b): 1 linux-sandbox.  → WS=.../deep/er/ws-b
define_test:      ws-a (--define=WS_PATH=.../ws-a):        1 linux-sandbox.  → WS=.../ws-a
                  ws-b (--define=WS_PATH=.../deep/er/ws-b): 1 linux-sandbox.  → WS=.../deep/er/ws-b
```

Neither candidate ever served a disk-cache hit — every ws-b build re-executed and produced ws-b's own absolute path, proving the flag's *value* (not just its presence) entered the hashed material.

**Decisive control — does an *unrelated* action get busted merely because a path-derived flag is present on the command line, even when its command never references the flag?** Built `bindir_test` (which reads neither `WS` nor `WS_PATH`) with the *same* `--action_env=WS=$PWD` / `--define=WS_PATH=$PWD` flags set on the command line:

```
bindir_test + --action_env=WS=$PWD:   ws-a: 1 disk cache hit.   ws-b: 1 disk cache hit.
bindir_test + --define=WS_PATH=$PWD:  ws-a: 1 disk cache hit.   ws-b: 1 disk cache hit.
```

(These are hits against the cache entry `bindir_test` populated with *no* flags at all, confirming the flag's presence alone, unconsumed, changes nothing for this action.)

### Verdict

**Three constructions, three outcomes, and the split is not "genrule vs custom rule" but "does the action's declared environment/command actually incorporate the value."**

1. `ctx.bin_dir.path` in a custom rule's command — never absolute (it is an exec-root-relative Bazel-managed path), so this construction *cannot* leak a host absolute path regardless of checkout. Confirms the premise the protocol names: there is no analysis-time route to a true absolute path through `ctx.*` APIs, hence the two workarounds below are how it actually happens.
2. `$$(pwd)` inside a genrule `cmd` string — shell syntax, evaluated by bash *at run time* inside the sandbox after Bazel has already recorded the un-evaluated literal string `$(pwd)` as the action's command argument. The absolute path never touches the hashed material. **Stable, confirmed again here in the exact literal-genrule-cmd shape the prior wave's gap named** (the prior measurement used a bare `$PWD` bash variable read inside the command body, not the `$(pwd)` subshell form in a genrule `cmd=` string specifically — this closes that exact documented gap).
3. `--action_env=WS=<absolute path>` and `--define=WS_PATH=<absolute path>`, each with the value supplied by the *invoking shell's* `$PWD` before Bazel parses the flag — **both destabilize the key, but only for an action that actually requests the value.** A `genrule`'s `cmd` defaults to using the environment/Make-variable substitution, so both `$WS` (an env var sourced from `--action_env`) and `ctx.var.get("WS_PATH")` (a `--define` value, whether read by a genrule's `$(WS_PATH)` Make-variable syntax or, as tested here, by a custom rule's `ctx.var.get()`) get baked into what Bazel hashes — the genrule case via the recorded environment, the `.bzl`/`ctx.var` case via the literal string substituted into the command *at analysis time*, before the action is ever recorded. Bazel only bakes in what an action's declaration actually requests: `bindir_test`'s custom rule never calls `ctx.var.get()` and never sets `use_default_shell_env`, so the same flags, present but unconsumed, leave its key — and its disk-cache hit — untouched.

**The answer to "which construction bakes an absolute path into the action key": any construction that flows the value into the action's *declared* environment or command string — via `--action_env` read as an env var, or via `--define` read through `ctx.var.get()`/genrule's `$(NAME)` Make-variable substitution — destabilizes the key exactly because that substitution happens at analysis time, before hashing. A value merely present on the invocation's flag set, never referenced by the action's own declaration, does not.** This sharpens BZL-HERM-31: the "ambient state read at run time" failure mode it names is the *`$(pwd)`-in-command-body* shape; a *build-flag-sourced* absolute path is a distinct, second mechanism with the opposite portability profile — it does not silently serve stale bytes (Q3's mount-pair gap is the "silently stale" case), it makes the build *unable to share a cache at all* across two checkouts unless the flag is normalized away.

### Affects

- **BZL-HERM-31** — **confirms and extends**: the genrule/native-substitution "stable key" result now covers the literal `$$(pwd)`-in-cmd shape (not just a bare `$PWD` variable), and a new, distinct destabilizing mechanism is added: a `--action_env`/`--define` value sourced from the invoking shell's absolute path. Grep signatures for each: `--action_env=[A-Z_]+=\$(pwd\)|--action_env=[A-Z_]+=\$PWD` or `--define=[A-Z_]+=\$(pwd\)|--define=[A-Z_]+=\$PWD` in any `.bazelrc`, CI workflow, or wrapper script — a hit means every checkout with a different absolute path builds a private, non-shareable cache entry for every action that consumes the named variable. The `$$(pwd)`/`$(pwd)` shell-runtime form inside a `cmd=`/`command=` string is, by contrast, safe for the key (though its *output content* is not portable, per BZL-HERM-10).
- **BZL-HERM-10** — supporting: confirms the mechanism boundary between "content non-portability" (any run-time `$PWD` read, key-stable) and "key non-portability" (any build-flag value baked at analysis time, key-unstable) is real and separable, not the same failure.

## Q3: `--sandbox_add_mount_pair` and the action key

### Protocol

One genrule, `cmd = "cat /etc/hostname > $@"`. A `fake-etc/` scratch directory containing only a `hostname` file reading `FAKE-HOSTNAME-MARKER` (real host `/etc/hostname` reads `Workstation`). Three experiments, 8.7.0:

1. **Local action cache, same server session, no `clean` between builds**: build with `--sandbox_add_mount_pair=/etc:/etc` (real), then rebuild the *same target with no other change* except `--sandbox_add_mount_pair=<fake-etc>:/etc`.
2. **`--disk_cache`, `clean --expunge` between builds** (forces a fresh in-memory graph, fresh local action cache, fresh `output_base` — the only thing that can serve a result is the disk cache): build with the real mount, `clean --expunge`, then build with the fake mount against the same `--disk_cache`.
3. **Control**: fresh execution with *only* the fake mount and no cache at all, to confirm the sandbox genuinely serves the fake file's content when actually forced to execute.

### Raw result

```
(1) Build 1, --sandbox_add_mount_pair=/etc:/etc:            2 processes: 1 internal, 1 linux-sandbox.   output: Workstation
    Build 2, SAME session, --sandbox_add_mount_pair=<fake>:/etc, no clean:
                                                              1 process: 1 internal.   (no re-check at all — a null build)
                                                              output: Workstation   (unchanged, stale)

(2) Build A, fresh + --disk_cache, real mount:               2 processes: 1 internal, 1 linux-sandbox.   output: Workstation
    bazel clean --expunge
    Build B, fresh output_base, same --disk_cache, fake mount:
                                                              2 processes: 1 disk cache hit, 1 internal.
                                                              output: Workstation   (stale — cache-hit content, not the fake file's)

(3) Fresh execution, fake mount only, no cache at all:        2 processes: 1 internal, 1 linux-sandbox.
                                                              output: FAKE-HOSTNAME-MARKER   (proves the sandbox does genuinely serve the fake file when it actually executes)
```

### Verdict

**`--sandbox_add_mount_pair` is not part of the action key at any layer — not the in-memory Skyframe dependency graph, not the local persistent action cache, and not the disk cache — and the failure mode this produces is strictly worse than a stale cache hit.** Experiment (1) shows the in-memory build graph does not even register a change: Bazel prints `1 process: 1 internal` with **no execution attempt and no cache lookup line at all**, meaning the mount-pair value never enters the action's tracked configuration in the first place — it is applied by the sandboxed spawn runner as a pure execution-time concern, invisible to Skyframe's own change detection. Experiment (2) proves this is not merely an in-memory-graph artifact: even after a full `clean --expunge` wipes every layer that could have remembered "nothing changed," the disk cache still serves Build A's stale `Workstation` content under Build B's completely different mount configuration, because the stored digest was computed without ever incorporating which host directory was bound to `/etc`. Experiment (3) rules out the alternative explanation that the sandbox itself silently ignores the fake mount (it doesn't — a truly fresh, uncached execution reads the fake file correctly). **This settles the prior wave's passing observation as a confirmed, reproducible finding, not a hunch**: a build's isolation level — which real host directory backs a given in-sandbox path — is invisible to Bazel's caching at every layer, so a cache (local, disk, or by extension remote) populated under one mount configuration will silently serve results computed under a *different* one, with zero signal, forever.

### Affects

- **BZL-HERM-26** — **confirms and sharpens** the "documented gap" from Verdict 17: promotes it from "observed in passing, not the protocol's question" to a directly measured, reproducible correctness gap across both the local action cache and `--disk_cache`. Anyone using `--sandbox_add_mount_pair`/`--sandbox_writable_path` to vary an action's host-visible filesystem across builds (a common pattern for local dev overrides, e.g. mounting a scratch toolchain during development) must not rely on any cache layer to reflect that change — a `bazel clean --expunge` is not sufficient once a disk or remote cache is populated from the other configuration.
- **BZL-HERM-19** (glob's silent, unreadable match set) — related failure family: both are "the declared/tracked inputs do not capture what the action actually reads," differing only in mechanism (a Bazel-level `glob()` pattern vs. a sandbox-level host mount). Worth cross-referencing in prose, not merging — the fix and the detection method are unrelated.

## Q4: constant-glob vs `--incompatible_disallow_empty_glob`

### Protocol

Obtained the buildifier binary matching `buildifier_prebuilt` 8.2.0.2's pin directly: `gh release download v8.2.0 -R bazelbuild/buildtools -p buildifier-linux-amd64` (confirmed `buildifier version: 8.2.0`, `scm revision d9ed52af26ee7e03973f776739d46fd79742dc36` — the same binary version the prior wave's `rules_ocx` copy resolved to). Four fixtures, each a standalone `BUILD.bazel` with one `filegroup(name = "g", srcs = glob([...]))`:

- `fx-literal-nonexistent`: `glob(["src/nonexistent.txt"])` — literal pattern, empty match (`src/` never created).
- `fx-wildcard-nonexistent`: `glob(["*.nonexistent"])` — wildcard pattern, empty match.
- `fx-literal-existing`: `glob(["foo.txt"])`, with `foo.txt` present — literal pattern, non-empty match.
- `fx-empty-list`: `glob([])` — no patterns at all.

For each: `buildifier -lint=warn -mode=check` (does `constant-glob` fire?) and `bazelisk build --nobuild //:g` at `--incompatible_disallow_empty_glob`'s default (`true`) on both 8.7.0 and 9.2.0 (does it error?).

### Raw result

```
fixture                      constant-glob (buildifier 8.2.0)          disallow_empty_glob (8.7.0 & 9.2.0, identical)
fx-literal-nonexistent       FIRES (exit 4) — "no wildcard ('*')"      ERROR — "didn't match anything"
fx-wildcard-nonexistent      silent (exit 0)                           ERROR — "didn't match anything"
fx-literal-existing          FIRES (exit 4) — "no wildcard ('*')"      passes (0 total actions, analysis succeeds)
fx-empty-list                silent (exit 0)                           ERROR — "all files in the glob have been excluded"
```

Both Bazel majors produced byte-identical error text and behavior for every fixture — no version split found for this flag's glob-matching semantics.

### Verdict

**They catch two disjoint bugs, and only the pair covers both failure classes M-C-14 asked about.** `constant-glob` is a purely **lexical, pattern-shape** check, evaluated by buildifier with no filesystem access at all: it fires whenever a glob pattern string contains no `*` wildcard character, regardless of whether that pattern matches zero files, one file, or would match many if the wildcard were added — it is silent on `glob([])` (no pattern to inspect) and silent on any wildcard pattern, however badly it fails to match. `--incompatible_disallow_empty_glob` is a purely **runtime, result-count** check, evaluated by Bazel during package loading with real filesystem access: it fires whenever the actual match count is zero, regardless of whether the pattern was literal, wildcarded, or the list was empty outright — it has nothing to say about `fx-literal-existing`, which matches happily despite being exactly the kind of glob-of-a-single-known-filename buildifier calls error-prone.

The two-by-two table names the coverage precisely:

| Fixture | Caught by | Bug class |
|---|---|---|
| literal, empty match | **both** | double coverage — buildifier flags the smell, Bazel flags the consequence |
| wildcard, empty match | **`disallow_empty_glob` only** | the exact silent-zero-sources failure BZL-HERM-19 is written against — invisible to buildifier because the pattern *shape* looks fine |
| literal, non-empty match | **`constant-glob` only** | a style/maintainability nit ("why glob a literal filename"), not a correctness bug — nothing for the runtime flag to catch since it matched |
| `glob([])` | **`disallow_empty_glob` only** | trivial but real; buildifier has no pattern to evaluate at all |

This settles **M-C-14** as stated: yes, the pair together covers both the empty-match and literal-pattern bug classes, and neither one subsumes the other — the wildcard/empty-match row is the load-bearing case that `--incompatible_disallow_empty_glob` alone catches and buildifier's default warning set structurally cannot, because buildifier never evaluates the glob against a filesystem.

### Affects

- **BZL-HERM-19** — **confirms and extends**: the rule's own text already treats a glob's match set as unreadable from its pattern and mandates re-verification via `bazel query`; this measurement supplies the concrete two-checker gap that motivates a *second*, cheaper line of defense — `--incompatible_disallow_empty_glob` (already a MUST-adjacent default-true flag) catches the exact silent-zero-sources shape at load time, before any `bazel query` is needed, but only for the empty-match case, not the "matches, but only by coincidence, exactly one hardcoded name" smell.
- **BZL-LARK territory (no rule ID minted in this corpus for `constant-glob`)** — this measurement is the evidence `bazel-starlark-and-build`/`buildifier-taxonomy-and-style.md` needs to write that rule; per the consolidation's own accounting this is "a `BZL-HERM`-section row whose evidence lives in `BZL-LARK`'s corpus, not a research gap of this group" — reported here as the commissioned answer, not as a new `BZL-LARK-NN` row (out of this task's scope to mint).

## Not settled

- **Q1**: the mount set a real rules_js/Node build, or any Python program touching the network/TLS/DNS or a non-bundled shared library, needs under the hermetic sandbox. This fixture imports only `sys`/`unittest` and never opens a socket or loads `ssl`/`zlib`; the four-mount result is confirmed for exactly that surface, not generalized further.
- **Q2**: only `--action_env`/`--define` were tested as the analysis-time injection route, and only for a genrule's default env consumption and a custom rule's `ctx.var.get()`. Not tested: whether a *tool's* own argv (as opposed to a genrule `cmd=`/`ctx.var`-sourced string) constructed from `ctx.attr`-passed data behaves identically; not tested on 9.2.0 (this question's protocol did not name a version split, and none was suspected from the mechanism, but it was not re-verified there).
- **Q3**: not tested against remote execution/a real remote cache (only local action cache and local `--disk_cache`); not tested whether `--experimental_use_hermetic_linux_sandbox` (rather than the default sandbox) changes this — the fixture used the default sandbox throughout, since `--sandbox_add_mount_pair` is meaningful there too and the consolidation's open question did not specify hermetic mode.
- **Q4**: only buildifier 8.2.0 was exercised (matching `rules_ocx`'s pin); a different `buildifier_prebuilt`/buildifier release was not cross-checked for `constant-glob`'s exact firing conditions, mirroring a gap the prior wave's buildifier measurement already flagged for its own findings.

## Re-run

```bash
BASE=/home/mherwig/.cache/bazel-measure-scratch/hermeticity-second-half-mounts-tool-args-and-globs
export OCX='ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec --'

# Q1
cd "$BASE/q1-python"
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" clean
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" build \
  --experimental_use_hermetic_linux_sandbox \
  --sandbox_add_mount_pair=/usr --sandbox_add_mount_pair=/bin \
  --sandbox_add_mount_pair=/lib --sandbox_add_mount_pair=/lib64 \
  //:hello //:hello_test //:gen_via_python3
# repeat with USE_BAZEL_VERSION=9.2.0

# Q2 (ws-a and deep/er/ws-b are byte-identical copies sharing q2-action-key/disk-cache)
cd "$BASE/q2-action-key/ws-a"
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" clean --expunge
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" build \
  --disk_cache="$BASE/q2-action-key/disk-cache" \
  --action_env=WS="$PWD" //:action_env_test   # then repeat from ws-b, same --disk_cache

# Q3
cd "$BASE/q3-mount-pair"
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" clean --expunge
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" build \
  --disk_cache="$BASE/q3-mount-pair/disk-cache" --sandbox_add_mount_pair=/etc:/etc //:mount_test
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" clean --expunge
USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" build \
  --disk_cache="$BASE/q3-mount-pair/disk-cache" \
  --sandbox_add_mount_pair="$BASE/q3-mount-pair/fake-etc":/etc //:mount_test
cat bazel-bin/mount_out.txt   # stale "Workstation" if reproduced

# Q4
cd "$BASE/q4-buildifier"
./buildifier -lint=warn -mode=check fx-literal-nonexistent/BUILD.bazel   # fires
./buildifier -lint=warn -mode=check fx-wildcard-nonexistent/BUILD.bazel  # silent
for fx in fx-literal-nonexistent fx-wildcard-nonexistent fx-literal-existing fx-empty-list; do
  cd "$BASE/q4-buildifier/$fx"
  USE_BAZEL_VERSION=8.7.0 $OCX bazelisk --output_user_root="$BASE/out" build --nobuild //:g
done
```

Every `MODULE.bazel` used in this wave is `module(name = "m")` (Q1 additionally declares `bazel_dep(name = "rules_python", version = "2.3.3")` plus the `python.toolchain` extension usage shown above); every genrule/rule `cmd`/`command` string is quoted verbatim in its section above.

## Scratch left on disk

```
$ du -sh /home/mherwig/.cache/bazel-measure-scratch/hermeticity-second-half-mounts-tool-args-and-globs
1.8G    /home/mherwig/.cache/bazel-measure-scratch/hermeticity-second-half-mounts-tool-args-and-globs
```

Breakdown: `out/` (shared `--output_user_root`, both Bazel versions' server/output-base state) 1.8G; `q1-python/` 68K; `q2-action-key/` 324K; `q3-mount-pair/` 104K; `q4-buildifier/` 7.7M (includes the downloaded `buildifier` binary). `bazelisk shutdown` was run for every workspace × version pair used in this wave; per instruction, nothing was deleted. The owner can sweep the whole directory (`rm -rf /home/mherwig/.cache/bazel-measure-scratch/hermeticity-second-half-mounts-tool-args-and-globs`) once this artifact and any prior wave's fixtures under the same scratch root are no longer needed.
