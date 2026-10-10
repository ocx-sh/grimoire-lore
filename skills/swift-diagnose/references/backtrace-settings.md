# Backtrace settings

Keys read from the runtime's Backtracing.rst on 2026-10-10. The measured table
ran on Swift 6.4.0 and 6.3.3, Linux x86_64 (measured 2026-10-10). The static
Linux SDK, macOS and Windows are `unverified: read only`.

Contents: [Keys](#keys) · [What the setting changes](#what-the-setting-changes) ·
[Settings for CI and diagnosis](#settings-for-ci-and-diagnosis) ·
[Where enable=no is deliberate](#where-enableno-is-deliberate) · [Platforms not measured](#platforms-not-measured)

## Keys

`SWIFT_BACKTRACE` is a comma-separated list of `key=value` pairs (read 2026-10-10).

| Key | Values | Default |
|---|---|---|
| `enable` | `yes`, `no`, `tty` | `yes` on Linux. `tty` on macOS 26 and later, `no` earlier |
| `interactive` | `yes`, `no`, `tty` | `tty` |
| `color` | `yes`, `no`, `tty` | `tty` |
| `timeout` | seconds | 30 |
| `preset` | `friendly`, `medium`, `full`, `auto` | `auto`, which is `full` when not interactive |
| `threads` | `all`, `crashed` | by preset |
| `registers`, `images` | preset values | by preset |
| `symbolicate` | `full`, `fast`, `off` | `full` |
| `format` | `text`, `json` | `text` |
| `output-to` | `stderr`, `stdout`, or a path (a directory gets unique file names) | `stderr` |
| `limit`, `top` | counts | 64 and 16 |
| `sanitize`, `swift-backtrace` | flag, path to the helper | off |

Linux unwinds by frame pointer, so `-Xcc -fno-omit-frame-pointer` gives
complete traces on optimised Intel builds (read 2026-10-10).

## What the setting changes

The exit code never depends on the variable. The evidence does. Measured on
6.4.0 and 6.3.3 for a force unwrap (`unwrap`) and a null pointer in a C call
(`segv`):

| `SWIFT_BACKTRACE` | `unwrap` exit | `segv` exit | `segv` stderr |
|---|---|---|---|
| unset | 132 | 139 | 52 lines, header `*** Signal 11: Backtracing from ... done ***` |
| `enable=no` | 132 | 139 | 0 lines (the runtime's own message for `unwrap` stays, 14 lines) |
| `enable=yes,interactive=no,color=no,format=json,output-to=crash.json` | 132 | 139 | 3 lines, and a 4.1 KB `crashReport` JSON in `crash.json` |

An empty stderr with exit 139 means check `SWIFT_BACKTRACE` in the
environment, the Dockerfile and the unit before concluding there is nothing to
read. Step 0 of the skill reads the variable from the live process.

`enable=no` also changes what SIGQUIT does (exit 131 instead of a dump, see
section B of the skill) and the exit of a worker-thread trap (0 under the default
backtracer, 132 under `enable=no`, see section A of the skill). Toggle it per
command, never in a file, to tell those cases apart.

## Settings for CI and diagnosis

- Leave the variable unset, or use `enable=yes,interactive=no,color=no`.
  Interactive mode triggers only when stdin and stdout are both terminals
  (swift.org 5.9 backtrace post, read 2026-10-10), so CI is non-interactive
  already. The explicit form protects a runner with a pseudo-terminal.
- To keep a machine-readable report, add `format=json,output-to=` and a
  writable directory. A directory gets unique file names per crash.
- Never set `enable=no` in a Dockerfile, a unit or a CI file of a process you
  will diagnose (SW-CORE-18). The grep that finds it is in Step 0 of the skill
  (one copy, covering Dockerfile and Containerfile variants, systemd units,
  quoted CI values, `.env` and Makefile), and empty output is the pass.

## Where enable=no is deliberate

- **A test that asserts a trap's exit code** sets it as a per-command prefix
  (`SWIFT_BACKTRACE=enable=no ./app args`), because under the default
  backtracer a worker-thread trap can exit 0 (section A of the skill). This is the
  SW-CORE-18 carve-out, taken by SW-CONC-34 and SW-CONC-26. A CI line that
  carries it lists that reason in the justification SW-CORE-01 asks for.
- **Swift Testing's exit-test child** sets it on purpose "to reduce the noise
  level" (`swift-testing@c7d68ca20cd7:Sources/Testing/ExitTests/ExitTest.swift:887-890`).
  It is the only setting of the variable among the 40 public repositories read.

## Platforms not measured

- **macOS.** The backtracer is off by default before macOS 26 and `tty` on 26 and
  later, and it needs the `com.apple.security.get-task-allow` entitlement
  (documentation, `unverified: read only`). `.ips` crash logs and Instruments
  are not covered.
- **Static Linux SDK.** A binary built with the static SDK needs
  `swift-backtrace-static` installed next to it and ptrace-related kernel
  settings, per the backtracer author's reply in the Swift Forums thread on
  static-SDK backtraces (`unverified: read only`). Whether the SIGQUIT dump
  survives there is open.
- **arm64.** The trap exit is reported as 133, not measured.
