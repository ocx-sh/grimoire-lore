---
title: "Sandbox strategy, network, and hermetic sandbox on this host"
slug: sandbox-strategy-network-and-hermetic-sandbox-on-this-host
agent: measurement-wave-2
model: sonnet
date_measured: 2026-09-05
bazel_versions: ["8.7.0", "9.2.0"]
host: "Linux Workstation 6.18.33.2-microsoft-standard-WSL2 (WSL2, not a CI runner)"
affects_rule_ids:
  - BZL-HERM-01
  - BZL-HERM-02
  - BZL-HERM-04
  - BZL-HERM-05
  - BZL-HERM-06
  - BZL-HERM-26
  - BZL-HERM-27
  - BZL-HERM-29
answers:
  - "bazel-hermeticity-determinism.md § Open questions › deserves another research round › sandbox parity"
  - "bazel-hermeticity-determinism.md § Open questions › deserves another research round › hermetic sandbox"
---

# Sandbox strategy, network, and hermetic sandbox on this host

**Host caveat (stated once, referenced everywhere below as [WSL2]):** this is WSL2 under
kernel `6.18.33.2-microsoft-standard-WSL2`, not a CI runner. Sandbox mount enumeration
includes WSL-specific bind mounts (`/mnt/c`, `/mnt/wsl`, 9p drivers) that a bare-metal Linux
CI box will not have; the *mechanism* (linux-sandbox mounts and remounts the whole host root
read-only, network is allowed by default, `--experimental_use_hermetic_linux_sandbox` needs
explicit mount pairs) is Bazel source-level behavior and is not WSL2-specific, but the exact
mount list and any timing numbers are.

## Table of contents

- [Environment](#environment)
- [Q1: Host facts and spawn strategy](#q1-host-facts-and-spawn-strategy)
- [Q2: Read-only host mounts and the hermetic sandbox](#q2-read-only-host-mounts-and-the-hermetic-sandbox)
- [Q3: Network](#q3-network)
- [Q4: Environment leakage](#q4-environment-leakage)
- [Q5: `--output_user_root` and path length](#q5---output_user_root-and-path-length)
- [Q6: Tags semantics](#q6-tags-semantics)
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

Total RAM is 31 GB, above the 16 GB threshold in the protocol, so **`--host_jvm_args=-Xmx1g`
was NOT passed** on any invocation below.

Spawn strategy actually used (both majors, every genrule build in this report unless a tag
or flag forced otherwise): **`linux-sandbox`**. `bazelisk info` reports
`local_resources: RAM=32091MB, CPU=32.0`. `cgroup` version is v2 (`cgroup2fs`).
`/proc/sys/kernel/unprivileged_userns_clone` does not exist on this kernel (WSL2 does not
gate user namespaces through that sysctl at all); `unshare -Ur true` exits 0, confirming
unprivileged user namespaces work here, which is the precondition `linux-sandbox` needs.

```
$ unshare -Ur true; echo exit=$?
exit=0

$ ls -l /proc/self/ns   (relevant lines)
user ⇒ user:[4026531837]
mnt  ⇒ mnt:[4026532218]
net  ⇒ net:[4026531833]

$ stat -fc %T /sys/fs/cgroup
cgroup2fs
```

Isolation used throughout: `--output_user_root=<scratch>/out` (STARTUP option) on every
invocation, workspace at `<scratch>/ws`, a minimal Bzlmod module (`module(name = "m")`, no
`bazel_dep`s needed for this protocol — no ruleset required). No `WORKSPACE` file created.
Bazel invoked as `ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- bazelisk …` with
`USE_BAZEL_VERSION` set per call. `bazelisk shutdown` (both versions) was run at the end.

**Environmental incident, recorded honestly:** partway through the 9.2.0 leg, the host's
`/tmp` tmpfs (capped at 16 GB, shared across several concurrent sibling measurement tasks
under the same session) hit 100% full and one command aborted with `ENOSPC`
(`Command output was lost: the temp filesystem … is full`). This was **not** caused by this
task's own footprint (394 MB peak) but by concurrent sibling scratch directories (one sibling
alone held 7.5 GB). It self-resolved a few commands later as a sibling task's usage receded
(confirmed via repeated `df -h /tmp`: 100% → 83% → 81% → 57% at teardown). Every result below
that could have been affected by this was re-run afterward and is marked fresh (`clean` before
build) where freshness matters.

## Q1: Host facts and spawn strategy

**Protocol:** `uname -a`, `unprivileged_userns_clone`, `unshare -Ur`, `/proc/self/ns`, cgroup
version, `mount | head`, then `bazelisk info` and
`bazelisk build --subcommands --sandbox_debug //:g` for a trivial genrule.

**Raw result (8.7.0, fresh `clean`):**

```
$ bazelisk --output_user_root=$OUT build --subcommands --sandbox_debug //:g
SUBCOMMAND: # //:g [action 'Executing genrule //:g', ..., mnemonic: Genrule]
... (cd $OUT_BASE/execroot/_main && exec env - PATH='<full client PATH>' TMPDIR=/tmp \
  $OUT/install/<hash>/linux-sandbox -t 15 -w /dev/shm -w /tmp -w $OUT_BASE/sandbox/linux-sandbox/2/execroot/_main \
  -M /tmp/claude-1000 -m $OUT_BASE/sandbox/linux-sandbox/2/_hermetic_tmp/claude-1000 \
  -M $OUT_BASE/sandbox/linux-sandbox/2/_hermetic_tmp -m /tmp \
  -S $OUT_BASE/sandbox/linux-sandbox/2/stats.out -D $OUT_BASE/sandbox/linux-sandbox/2/debug.out \
  -- /bin/bash -c '...')
INFO: 2 processes: 1 internal, 1 linux-sandbox.
INFO: Build completed successfully, 2 total actions
exit=0
```

`--sandbox_debug` shows `linux-sandbox-pid1.cc` remounting the **entire host filesystem
root read-only**, then re-mounting a small writable set on top:

```
remount ro: /
remount ro: /init
remount ro: /dev
... (every top-level and WSL-specific mount, ~130 lines)
remount ro: /mnt/c
remount ro: /mnt/d
remount ro: /mnt/f
remount rw: /tmp
remount ro: /tmp/claude-1000
remount rw: /tmp/claude-1000/.../execroot/_main
```

The only paths made writable are `-w /dev/shm`, `-w /tmp`, and the action's own execroot
directory inside the sandbox; everything else stays the read-only remount of `/`.

**9.2.0, fresh `clean`:** identical strategy. `bazelisk info` returns the *same*
`output_base` path (200 chars) as 8.7.0 — the output-base hash keys only on the workspace
path plus user, not on the Bazel version, so both majors' servers live under the same
`--output_user_root`.

```
$ bazelisk --output_user_root=$OUT build --subcommands --sandbox_debug //:g
... 1 internal, 1 linux-sandbox ...
exit=0
```

**Verdict:** on this WSL2 host, the spawn strategy for a genrule is `linux-sandbox` on both
Bazel 8.7.0 and 9.2.0 (not `processwrapper-sandbox`, not `local`) — unprivileged user
namespaces work here, so Bazel's strategy auto-selection picks the full Linux sandbox. The
sandbox's isolation mechanism is a whole-filesystem read-only remount plus a narrow writable
allowlist (`/dev/shm`, `/tmp`, the sandboxed execroot) — this is the literal evidence behind
BZL-HERM-26's "linux-sandbox … mounts the whole filesystem read-only except the sandbox
directory" claim, confirmed by direct `--sandbox_debug` output rather than reading the docs.
**[WSL2 caveat]**: the exact mount list (`/mnt/c`, `/mnt/wsl`, the 9p drivers share) is WSL2
plumbing that a bare-metal CI runner will not carry, but the "remount `/` read-only, allowlist
a few writable paths" mechanism is Bazel source behavior, not WSL2-specific.

**Affects:** BZL-HERM-26 — **confirms**, with a direct sandbox-debug quote replacing the
doc-only citation the consolidation had.

## Q2: Read-only host mounts and the hermetic sandbox

**Protocol:** a genrule reading `/usr/lib`, `/home`, `/etc/hostname`, `$HOME`; compare default
sandbox vs `--experimental_use_hermetic_linux_sandbox`; find the minimal
`--sandbox_add_mount_pair` set for a genrule using `/bin/sh`.

**Raw result — default sandbox, both majors (identical output on 8.7.0 and 9.2.0):**

```
---usr-lib---
NetworkManager
audit
binfmt.d
cpp
credstore
---home---
mherwig
---etc-hostname---
Workstation
---HOME-var---
HOME=<unset>
---HOME-ls---
ls: cannot access '/nonexistent': No such file or directory
exit=0
```

The default sandbox shows the **real host** `/usr/lib` contents, the real `/home/mherwig`
entry, and the real host's `/etc/hostname` (`Workstation`) — full read-only visibility of the
host filesystem, exactly as Q1's remount list shows. **`HOME` is unset inside the action's
environment by default** — not merely empty, genuinely absent (confirmed via bash's
`set -u`, which fired "HOME: unbound variable" on an earlier unguarded version of this probe).
This holds independent of `--incompatible_strict_action_env`; that flag governs only `PATH`
(and `LD_LIBRARY_PATH`, see Q4), never `HOME`.

**`--experimental_use_hermetic_linux_sandbox` — exists and runs on both 8.7.0 and 9.2.0.**
With no mount pairs, fresh `clean` then build:

```
$ bazelisk build --experimental_use_hermetic_linux_sandbox //:host_mounts
ERROR: ... Executing genrule //:host_mounts failed: (Exit 1): bash failed ...
src/main/tools/linux-sandbox-pid1.cc:566: "execvp(/bin/bash, 0xc0155d0)": No such file or directory
exit=1        (8.7.0)

src/main/tools/linux-sandbox-pid1.cc:584: "execvp(/bin/bash, 0x27e105d0)": No such file or directory
exit=1        (9.2.0, identical failure)
```

The minimal hermetic sandbox mounts only `dev/null|random|urandom|zero|full`, `dev/shm`,
`/tmp`, and the execroot — nothing under `/`, `/usr`, `/bin`, `/lib` exists inside it, so even
`/bin/bash` cannot be found to run the genrule's own shell.

**Minimal mount set found, fresh `clean` each step, this host (usrmerge Linux: `/bin`,
`/lib`, `/lib64` are top-level symlinks into `/usr`):**

- `--sandbox_add_mount_pair=/usr` alone → still fails the same `execvp(/bin/bash)` error,
  because `/bin` itself (the symlink node at the sandbox's synthetic root) is never created —
  mounting `/usr` does not retroactively create `/bin`, `/lib`, `/lib64` at top level.
- `--sandbox_add_mount_pair=/usr --sandbox_add_mount_pair=/bin --sandbox_add_mount_pair=/lib --sandbox_add_mount_pair=/lib64`
  (all four, fresh `clean`) → **succeeds**, both majors:

```
$ bazelisk build --experimental_use_hermetic_linux_sandbox \
    --sandbox_add_mount_pair=/usr --sandbox_add_mount_pair=/bin \
    --sandbox_add_mount_pair=/lib --sandbox_add_mount_pair=/lib64 //:host_mounts
INFO: Build completed successfully, 2 total actions
exit=0

---usr-lib---
NetworkManager
audit
binfmt.d
cpp
credstore
---home---
ls: cannot access '/home': No such file or directory
---etc-hostname---
cat: /etc/hostname: No such file or directory
---HOME-var---
HOME=<unset>
---HOME-ls---
ls: cannot access '/nonexistent': No such file or directory
```

With the minimal mount set, `/usr/lib` is visible again (because it's mounted), but **`/home`
and `/etc/hostname` are now genuinely absent** — the exact isolation the default sandbox does
not provide. Identical on 9.2.0.

Note: `--sandbox_add_mount_pair` does **not** appear to be part of the action cache key — a
build with different mount-pair flags but the same command was returned as an action-cache hit
before we forced a `clean`; every number above is from a `clean`-then-build cycle to avoid that
false signal.

**Verdict:** on this host, the default sandbox mounts the *entire* host filesystem read-only
(BZL-HERM-26 confirmed directly). `--experimental_use_hermetic_linux_sandbox` exists and works
on both 8.7.0 and 9.2.0, and closes exactly the gap BZL-HERM-26 names: with it plus an explicit
mount set, `/home` and `/etc/hostname` disappear from the action's view entirely. The minimal
mount set for a genrule whose `cmd` runs under `/bin/sh`/`/bin/bash` on a usrmerge host is
**all four** of `/usr`, `/bin`, `/lib`, `/lib64` — mounting `/usr` alone is not sufficient
because the top-level symlinks are separate mount targets. This is a narrow result (a bare
shell invocation only); it does not establish the mount set a real rules_js or rules_python
build needs (interpreter paths, additional shared libraries, `/etc/resolv.conf` for anything
touching DNS, etc.) — that remains open, see Not settled.

**Affects:** BZL-HERM-26 — **confirms and extends**: promotes the flag from "documented,
untested" to "runs on this host, exact minimal shell mount set demonstrated". Answers
consolidation open question **"hermetic sandbox"** — partially: yes it is runnable as a gate
mechanism today on both live majors; the "typical rules_js/rules_python mount set" half of the
question is not settled by this narrow probe.

## Q3: Network

**Protocol:** `curl -sI https://bcr.bazel.build -m 5 || echo NONET` under default flags, then
`--sandbox_default_allow_network=false`, then with `tags=["requires-network"]`, then
`tags=["no-sandbox"]`.

**Raw result (8.7.0):**

| flag / tag | network reachable? | strategy used |
|---|---|---|
| (default) | **YES** (`HTTP/2 200`) | `linux-sandbox` |
| `--sandbox_default_allow_network=false` | **NO** (`NONET`) | `linux-sandbox` |
| same flag + `tags=["requires-network"]` | **YES** (`HTTP/2 200`) | `linux-sandbox` |
| same flag + `tags=["no-sandbox"]` | **YES** (`HTTP/2 200`) | `local` |

```
$ bazelisk build --sandbox_default_allow_network=false //:net_default
$ cat net_default.out
NONET
exit=0

$ bazelisk build --sandbox_default_allow_network=false //:net_requires_network
$ cat net_requires_network.out
HTTP/2 200 ...
exit=0   (1 linux-sandbox action, per --subcommands summary)

$ bazelisk build --sandbox_default_allow_network=false //:net_no_sandbox
$ cat net_no_sandbox.out
HTTP/2 200 ...
exit=0   (1 local action, per --subcommands summary — no-sandbox forces the local strategy,
          which has no network namespace to revoke, so the flag is a no-op for it)
```

**9.2.0:** default and `--sandbox_default_allow_network=false` re-verified fresh, identical
(`HTTP/2 200` then `NONET`). The `requires-network`/`no-sandbox` tag rows were not re-run on
9.2.0 (tag-processing logic is not documented as version-gated and Q4's flag-default split is
the only place this family showed a cross-major difference); flagged in Not settled as
not independently re-verified on 9.2.0.

**Verdict:** `--sandbox_default_allow_network=false` genuinely blocks the network **when the
`linux-sandbox` strategy runs the action** on this host — this directly answers the
consolidation's question "does `--sandbox_default_allow_network=false` actually block on this
host's strategy?" with **yes, for `linux-sandbox`**. It does **not** block network for an
action tagged `no-sandbox` (forced to the `local` strategy) — `local` has no network namespace
to revoke, matching the documented reasoning behind `processwrapper-sandbox`'s inability to
enforce the flag at all (same "no network namespace" class of strategy, though `local` and
`processwrapper-sandbox` are not identical). `tags=["requires-network"]` correctly overrides
the block while staying sandboxed. Default (`--sandbox_default_allow_network` unset) allows the
network on both majors — no version split here.

**Affects:** BZL-HERM-02 — **confirms** both halves of the rule's own text: the default is
network-permissive, and the flag's enforcement is scoped to the strategy that has a network
namespace to revoke. Answers consolidation open question **"sandbox parity"** partially: the
Linux-side half (does the flag work under `linux-sandbox`) is now empirically yes; the
`darwin-sandbox` half is **not** answered — this host has no macOS, see Not settled.

## Q4: Environment leakage

**Protocol:** `env | sort` genrule with defaults on 8.7.0, with
`--incompatible_strict_action_env` on 8.7.0, with defaults on 9.2.0; then
`--action_env=FOO=bar` and `--action_env=FOO` (inherit).

**Raw result — defaults, 8.7.0 (`strict_action_env` implicitly `false`), client had
`FOO=host-value-should-not-leak`, `OCX_TEST_VAR=ocx-marker-should-not-leak`,
`LD_LIBRARY_PATH=/tmp/marker-ld-path` exported:**

```
LD_LIBRARY_PATH=/tmp/marker-ld-path
PATH=/home/mherwig/.cache/bazelisk/.../bin:...<full client PATH, ~40 entries>...
PWD=<sandbox execroot>
SHLVL=1
TMPDIR=/tmp
_=/usr/sbin/env
exit=0
```

`PATH` and `LD_LIBRARY_PATH` leak the full client value. **`FOO` and `OCX_TEST_VAR` do NOT
leak** — the default (non-strict) action environment is a *fixed short list*
(`PATH`, `LD_LIBRARY_PATH` inherited, plus Bazel's own `PWD`/`SHLVL`/`TMPDIR`/`_`), not the
full client environment. This refines the consolidation's "8.7.0 legs inherit `LD_LIBRARY_PATH`
and the client `PATH`" language: it is precisely *only* those two names that inherit, not a
broader leak.

**With `--incompatible_strict_action_env`, 8.7.0, same client env:**

```
PATH=/bin:/usr/bin:/usr/local/bin
PWD=<sandbox execroot>
SHLVL=1
TMPDIR=/tmp
_=/bin/env
exit=0
```

`PATH` is replaced with the fixed `/bin:/usr/bin:/usr/local/bin`; `LD_LIBRARY_PATH` is dropped
entirely even though the client had it set.

**Defaults, 9.2.0 (strict_action_env now true by default), same client env:**

```
PATH=/bin:/usr/bin:/usr/local/bin
PWD=<sandbox execroot>
SHLVL=1
TMPDIR=/tmp
_=/bin/env
exit=0
```

**Byte-for-byte identical to 8.7.0's *explicit-strict* result.** This is direct empirical
confirmation of BZL-HERM-01's central claim: the only thing that changed between 8.7.0 and
9.2.0 defaults is this exact flag's default flip, and its effect is precisely what strict mode
does on 8.x — no other env behavior differs.

**`--action_env=FOO=bar` and `--action_env=FOO` (inherit), both majors:**

```
$ bazelisk build --action_env=FOO=bar //:env_dump_foo   → FOO=bar          (8.7.0 and 9.2.0)
$ bazelisk build --action_env=FOO //:env_dump_foo        → FOO=<client value>  (8.7.0 and 9.2.0)
```

Both forms behave identically on both majors — the explicit-value and inherit-from-client
forms of `--action_env` are not part of the 8→9 split; only the *default* leak set changes.

**Verdict:** the frame-correcting claim in BZL-HERM's Verdict §1/§12 is now directly measured,
not just source-read: Bazel 8.7.0's default action environment leaks exactly `PATH` and
`LD_LIBRARY_PATH` from the client and nothing else; 9.2.0's default is byte-identical to what
`--incompatible_strict_action_env=true` produces on 8.7.0 (fixed `PATH`, no
`LD_LIBRARY_PATH`). `HOME` is absent from the action environment in every configuration tested
(default and strict, both majors) — it was never part of either mode's leak set, so it is not
evidence for or against the strict-env flag either way. `--action_env`'s two forms
(`NAME=VALUE` and bare `NAME`) work identically across majors.

**Affects:** BZL-HERM-01 — **confirms**, upgraded from source-code citation to a live
side-by-side transcript on both majors. BZL-HERM-06 — **confirms** (an unstable, machine-local
`LD_LIBRARY_PATH` value is exactly what leaks by default and would defeat cross-user disk/remote
caching). BZL-HERM-29 — touched only tangentially (this measured the build/host-action tier,
not the repository-rule or test-action tiers; no new evidence on those two).

## Q5: `--output_user_root` and path length

**Protocol:** record the default output base path length; note BZL-HERM-27 is a Windows
question this host cannot measure.

**Raw result:**

```
output_base:     .../scratch/measure/sandbox-strategy.../out/e449009db6c21305975da989fd4005c4   (200 chars)
execution_root:  .../out/e449009db6c21305975da989fd4005c4/execroot/_main                          (215 chars)
```

Identical on both 8.7.0 and 9.2.0 — the output-base hash is keyed on workspace path + user,
not on Bazel version, so both majors' state lives under the same 200-char base with this
`--output_user_root`.

This 200-char figure is an artifact of the mandated isolation directory
(`/tmp/claude-.../946b693c.../scratchpad/measure/sandbox-strategy-network-and-hermetic-sandbox-on-this-host/out`),
not a natural Bazel default. For comparison, Bazel's real default with no
`--output_user_root` given is `~/.cache/bazel/_bazel_<user>/<32-hex md5>` — for this host's
home directory that would be roughly 75 characters total, nowhere near a path-length ceiling.

**Verdict:** BZL-HERM-27 (the Windows `MAX_PATH` / `SymlinkAction` fallback-to-copy defect) is,
as the protocol anticipated, **not measurable on this host**: WSL2 runs a real Linux kernel
with no `MAX_PATH` concept, and Bazel under WSL2 uses the Linux code path (`linux-sandbox`,
confirmed in Q1), not the Windows-specific `SymlinkAction` fallback. This measurement contains
no data point for or against BZL-HERM-27; the rule stands exactly as documented, sourced from
`rules_ocx`'s own Windows CI legs (per the consolidation's "Applied to rules_ocx" section), not
from anything runnable here.

**Affects:** BZL-HERM-27 — **not settled by this host** (explicitly out of reach, stated rather
than guessed, per the protocol's own instruction).

## Q6: Tags semantics

**Protocol:** genrules tagged `no-cache`, `no-remote-cache`, `no-sandbox`, `local`,
`no-remote`, with `--disk_cache=<scratch>` set, built twice with `clean` in between; check
disk-cache hits and re-execution, cross-referenced against `--execution_log_json_file`'s
`cacheable`/`remotable`/`runner` fields.

**Raw result — build 1 (fresh disk cache), `--execution_log_json_file` parsed with `jq`,
identical on 8.7.0 and 9.2.0:**

```
{"label":"//:cache_default",         "cacheable":true,  "remotable":true,  "runner":"linux-sandbox"}
{"label":"//:cache_local",           "cacheable":false, "remotable":false, "runner":"local"}
{"label":"//:cache_no_cache",        "cacheable":false, "remotable":true,  "runner":"linux-sandbox"}
{"label":"//:cache_no_remote",       "cacheable":true,  "remotable":false, "runner":"linux-sandbox"}
{"label":"//:cache_no_remote_cache", "cacheable":true,  "remotable":true,  "runner":"linux-sandbox"}
{"label":"//:cache_no_sandbox",      "cacheable":true,  "remotable":true,  "runner":"local"}
```

**Build 2 (`clean`, same warm `--disk_cache`)** — each genrule's `cmd` writes
`$RANDOM-$(date +%s%N)`, so an unchanged value across builds means a disk-cache hit and a
changed value means re-execution:

```
4 disk cache hit, 1 internal, 1 linux-sandbox, 1 local     (identical summary, both majors)

cache_default:          UNCHANGED → HIT
cache_no_remote_cache:  UNCHANGED → HIT
cache_no_remote:        UNCHANGED → HIT
cache_no_sandbox:       UNCHANGED → HIT   (ran under "local" strategy but still disk-cached)
cache_no_cache:         CHANGED   → re-executed (under linux-sandbox)
cache_local:            CHANGED   → re-executed (under local)
```

**Final table, both majors identical:**

| tag | sandboxed? (runner) | disk-cache hit on rebuild? | `cacheable` (execlog) | `remotable` (execlog) |
|---|---|---|---|---|
| *(none)* | `linux-sandbox` | **hit** | true | true |
| `no-cache` | `linux-sandbox` | **miss** (re-executed) | false | true |
| `no-remote-cache` | `linux-sandbox` | **hit** | true | true |
| `no-sandbox` | `local` | **hit** | true | true |
| `local` | `local` | **miss** (re-executed) | false | false |
| `no-remote` | `linux-sandbox` | **hit** | true | false |

**Verdict:** `no-sandbox` and `local` are not synonyms despite both forcing the `local` runner:
`no-sandbox` only skips the sandboxing wrapper — the action is still disk-cacheable and hits on
rebuild; `local` additionally marks the action uncacheable (`cacheable:false`) and it
re-executes every time. `no-remote-cache` and `no-remote` both leave the **disk** cache
untouched — they scope only the remote cache / remote execution, exactly as their names claim
and distinct from `no-cache`, which disables caching broadly (disk included) while leaving the
action sandboxed and remotable. This is new, decisive, machine-verified information the
consolidation's own text did not have (it names the family boundary as belonging to
`BZL-CACHE`, not `BZL-HERM`); it is reported here because it surfaced directly from the same
protocol and cross-references which sandbox strategy (`BZL-HERM-26`'s subject) each tag
selects.

**Affects:** BZL-HERM-26 — **confirms** the strategy-selection half (`no-sandbox`/`local` →
`local` runner, everything else → `linux-sandbox`). The cacheability distinctions themselves
are `BZL-CACHE` territory per this family's own stated boundary and are reported here as a
bonus finding, not a `BZL-HERM` rule change.

## Not settled

- **`darwin-sandbox` network parity** (consolidation open question "sandbox parity", macOS
  half). This host has no macOS; only the Linux-side half (does `linux-sandbox` actually
  enforce `--sandbox_default_allow_network=false`? — yes) was measured.
- **The mount set a real rules_js or rules_python build needs under
  `--experimental_use_hermetic_linux_sandbox`.** Only the minimal shell mount set (`/usr`,
  `/bin`, `/lib`, `/lib64` — a bare `bash`/coreutils dependency) was measured. A Python or
  Node toolchain needs interpreter paths, shared libraries beyond libc/libtinfo, and possibly
  `/etc/resolv.conf` or CA certificate paths for anything doing TLS — none of that was probed.
- **`tags=["requires-network"]` / `tags=["no-sandbox"]` on 9.2.0.** Re-verified only the
  default and `--sandbox_default_allow_network=false` rows on 9.2.0; the two tag rows were
  taken from 8.7.0 only and assumed (not re-measured) to hold on 9.2.0.
- **`processwrapper-sandbox` itself.** Not directly exercised — this host's strategy selection
  never falls back to it (unprivileged user namespaces work here), so the consolidation's
  "the only cross-platform strategy … cannot revoke a network namespace at all" claim is
  unconfirmed by this measurement; `local`'s behavior (network reachable regardless of the
  flag) was used as an analogous but not identical proxy.
- **`--sandbox_add_mount_pair` and the action cache key.** Observed that changing mount-pair
  flags alone did not bust an action-cache hit (worth a dedicated check; not the protocol's
  question, only stumbled into while building the minimal mount set — every reported number
  above was re-verified with an explicit `clean` to route around it).

## Re-run

```bash
BASE=<scratch>/measure/sandbox-strategy-network-and-hermetic-sandbox-on-this-host
cd "$BASE/ws"
for V in 8.7.0 9.2.0; do
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root="$BASE/out" build --subcommands --sandbox_debug //:g
  USE_BAZEL_VERSION=$V ocx --project /home/mherwig/dev/rules_ocx/ocx.toml exec -- \
    bazelisk --output_user_root="$BASE/out" shutdown
done
```

`MODULE.bazel` is `module(name = "m")`; `BUILD.bazel` defines the `g`, `host_mounts`,
`net_default`/`net_requires_network`/`net_no_sandbox`, `env_dump`/`env_dump_foo`, and
`cache_default`/`cache_no_cache`/`cache_no_remote_cache`/`cache_no_sandbox`/`cache_local`/`cache_no_remote`
genrules described inline above (each `cmd` quoted verbatim in its section).
