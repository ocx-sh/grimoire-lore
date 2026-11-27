---
title: UX-CLI-08 no-network clause on macOS and Windows
program: product
topic: ux-cli-interaction
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 12
---

# UX-CLI-08 no-network clause on macOS and Windows

## Question

Does UX-CLI-08's no-network clause have a usable check on macOS (`sandbox-exec`, not run in wave 1) and on Windows, using the local Windows harness under `/mnt/c/Users/ecom/`?

## Answer

Partly, and the first draft of this file was wrong on one point. Neither platform could be run: this host is native Linux, with no `/mnt/c`, no `cmd.exe` and no `sandbox-exec` (measured below). Both platforms do have a sourced way to see an attempted connection, not only to block it:

- macOS: a Seatbelt denial is written to the unified log. Apple documents the line `Sandbox: SampleApp(12447) deny(1) network-outbound ...` and the Console filter `subsystem:com.apple.sandbox.reporting` ([Apple, Discovering and diagnosing App Sandbox violations](https://developer.apple.com/tutorials/data/documentation/security/discovering-and-diagnosing-app-sandbox-violations.md), page copyright 2026, no page date). That page is about App Sandbox; the same log stream predicate is shown for `sandbox-exec` profiles by [Chromium's sandbox debugging notes](https://chromium.googlesource.com/chromium/src/+show/91d16c2b01d59d12e02b4b4f0116ea028beb94de/docs/mac/sandbox_debugging.md) (commit page, no date shown; the sample `--start` in it is 2020-09-21) and by an Apple Developer Forums post (bswift, September 2021). So the earlier claim that `sandbox-exec` network denial "does not log the attempt" is retracted. It was unsourced.
- Windows: event 5157 "The Windows Filtering Platform has blocked a connection" records `Application` (full path of the executable), `Direction` (Inbound or Outbound) and the destination address, under audit subcategory "Audit Filtering Platform Connection" ([Microsoft Learn, event 5157](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-5157), ms.date 2021-09-08, updated 2026-04-27, archived page).

Neither was run, so neither is a verified check. The macOS profile string and the Windows audit setup are unrun. The result: UX-CLI-08 keeps the Linux `strace` form as the only gate, and the macOS and Windows forms become SHOULD-level checks that must end with a recorded `not run` or a recorded result. A Linux pass must not be reported as a macOS or Windows pass.

## What was measured (2026-11-27, this host)

### The Windows harness and macOS tools are absent

```
$ ls /mnt/c
ls: cannot access '/mnt/c': No such file or directory
$ uname -a
Linux ocx.sh 6.8.0-149-generic #149-Ubuntu SMP PREEMPT_DYNAMIC Fri Oct 23 13:21:10 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
$ which sandbox-exec bwrap
sandbox-exec not found
bwrap not found
```

### The Linux gate has teeth (control run) and passes on grim and ocx

```
$ strace -f -qq -e trace=connect -o t.txt grim --version; echo ec=$?; grep -cE 'AF_INET6?' t.txt
grim 0.16.0
ec=0
0
$ strace -f -qq -e trace=connect -o t2.txt ocx version; echo ec=$?; grep -cE 'AF_INET6?' t2.txt
0.6.8
ec=0
0
$ strace -f -qq -e trace=connect -o t3.txt curl -s -m 2 http://192.0.2.1/ ; grep -cE 'AF_INET6?' t3.txt
1
```

The control (`curl` to a documentation-range address) prints `1`, so the grep counts a real attempt. Without it, `0` would prove nothing. The binaries were `grim` from the project toolchain and `ocx` 0.6.8 from the user install, run with a temporary `HOME`.

### ocx `--version` and `-V` exit 64 (the wave-1 claim, now measured)

```
$ ocx --version; echo "ec=$?"
error: unexpected argument '--version' found

Usage: ocx [OPTIONS] [COMMAND]

For more information, try '--help'.
ec=64
$ ocx -V; echo "ec=$?"
error: unexpected argument '-V' found
... ec=64
$ ocx version; echo "ec=$?"
0.6.8
ec=0
$ grim --version; echo "ec=$?"
grim 0.16.0
ec=0
$ grim -V; echo "ec=$?"
grim 0.16.0
ec=0
```

Source, read-only, `/home/mherwig/dev/ocx-sh/ocx` at commit `02b8434e6d9d5f4e6173713703fce3aa4d7ce8a4` (committed 2026-11-26), `crates/ocx_cli/src/app.rs` lines 54-58:

```
#[derive(Parser)]
#[command(name = "ocx", about, long_about = None)]
#[command(about = "A simple package manager for pre-built binaries.", long_about = None)]
```

No `version` in the root `#[command(...)]`, which is why clap registers no `--version`. The file has no `cfg(windows)`, `cfg(target_os)` or `cfg(unix)` line (`grep -nE 'cfg\((windows|target_os|unix)' crates/ocx_cli/src/app.rs` printed nothing). `app.rs:46` declares `pub(crate) mod update_check;` and `app.rs:180` calls `update_check::check_for_update(&context)`, so ocx does have an update check that UX-CLI-31 is meant to keep off the `--version` path. `grep -nE 'reqwest|hyper|ureq|Client::new|http' crates/ocx_cli/src/app/version.rs crates/ocx_cli/src/app/update_check.rs` printed nothing for both files: the HTTP client is not named there, so this grep is a weak check (the call goes through `context`) and the `strace` gate stays the proof.

### The proxy test, run on grim

```
$ HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 timeout 2 grim --version; echo ec=$?
grim 0.16.0
ec=0
(0.005 s total)
```

It passes in 5 ms. It is a weak test: grim passes it because it never connects, and a client that ignores proxy variables would also pass.

## What the sources say

| Platform | Mechanism | Operative text | Source, date, kind |
|---|---|---|---|
| macOS | `sandbox-exec` status | "The `sandbox-exec` command is DEPRECATED." Developers should use App Sandbox. Synopsis includes `-p profile-string`. | [man page mirror](https://keith.github.io/xcode-man-pages/sandbox-exec.1.html), page footer date March 9, 2017. Vendor documentation (mirror). |
| macOS | Support status | Apple DTS (Quinn), October 2019: "the sandbox profile format is not documented for third party use. Feel free to experiment with this stuff, but please don't try to ship a product based on it." | [Apple Developer Forums thread 124284](https://developer.apple.com/forums/thread/124284), October 2019. Vendor staff statement. |
| macOS | Denial logging | Console filter `subsystem:com.apple.sandbox.reporting`; a violation reads `Sandbox: SampleApp(12447) deny(1) network-outbound /private/var/run/mDNSResponder`. | Apple App Sandbox page above, no page date (copyright 2026). Vendor documentation, for App Sandbox, not for `sandbox-exec` profiles. |
| macOS | Log command for `sandbox-exec` profiles | `log stream --style compact --info --debug --predicate '(((processID == 0) AND (senderImagePath CONTAINS "/Sandbox")) OR (subsystem == "com.apple.sandbox.reporting"))'`, quoted from a community poster who says it comes from a system profile. "When developing profiles for `sandbox-exec`, monitoring sandbox log messages is very helpful to understanding exactly what is being denied." | [Apple Developer Forums thread 124284](https://developer.apple.com/forums/thread/124284), community post September 2021. Community, not Apple. |
| macOS | Same predicate, second source | `log stream --predicate '((processID == 0) AND (senderImagePath CONTAINS "/Sandbox")) OR (subsystem == "com.apple.sandbox.reporting")'` and `log show --start ... --predicate ...` for history. | [Chromium sandbox debugging](https://chromium.googlesource.com/chromium/src/+show/91d16c2b01d59d12e02b4b4f0116ea028beb94de/docs/mac/sandbox_debugging.md), no commit date on the page. Project documentation. |
| macOS | Tool in use | `sandbox-runtime`: "tap into the system's sandbox violation log store" for real-time alerts; "By default, all network access is denied." Command shown: `log stream --predicate 'process == "sandbox-exec"' --style syslog`. | [anthropic-experimental/sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime), page shows only "(c) 2026 GitHub" and no release date; no releases listed. Vendor project (Anthropic). |
| macOS | The profile string | `(version 1)(allow default)(deny network*)` passed with `sandbox-exec -p`, in a third-party blog that also says it uses `log stream` or Console.app to see the sandbox output. It does not state that network denials are logged. | [mybyways blog](https://mail.mybyways.com/blog/run-code-in-a-macos-sandbox), published 2023-06-11. Third-party, not Apple. Not run here. |
| Windows | Blocked-connection record | Event 5157 fields `Application` ("full path and the name of the executable"), `Direction` ("Inbound ... Outbound"), `DestAddress`. Subcategory "Audit Filtering Platform Connection". | Microsoft Learn event 5157 page above, ms.date 2021-09-08. Vendor documentation. Its sample event is dated 2015-09-22. |
| Windows | Firewall log file | Default path `%windir%\system32\logfiles\firewall\pfirewall.log`. "No logging occurs until you set" log dropped packets or log successful connections. The page's wording is about "an incoming network packet" being dropped; it does not say outbound drops are logged. Commands: `netsh advfirewall>set allprofiles logging droppedconnections enable`. | [Microsoft Learn, Configure Windows Firewall logging](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/configure-logging), ms.date 2025-04-07, updated 2026-10-08. Vendor documentation. Use 5157 for outbound, not this page. |
| Windows | Per-program outbound block | `-Program` is "the full path to an application file", `-Direction` default Inbound, `-Action Block`. Searching the fetched page for "elevat" and "administrator" found only a sentence about GPO precedence, no statement that elevation is needed. | [Microsoft Learn, New-NetFirewallRule](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule), ms.date 2016-12-27, updated 2025-05-14. Vendor documentation. |
| Windows | Windows Sandbox | `<Networking>Disable</Networking>`: "Disables networking in the sandbox." Default is on. | [Microsoft Learn, .wsb configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file), ms.date 2026-03-29. Vendor documentation. |
| Windows | AppContainer | "Granular access can be granted for Internet access, Intranet access, and acting as a server." No launch command for a console tool. Not a usable check. | [Microsoft Learn, AppContainer isolation](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation), ms.date 2025-07-08. Vendor documentation. |

Retracted from the first draft: the claim that App Sandbox cannot wrap an arbitrary CLI binary. It was from memory, no fetched page states it, and it is not needed. What the sources do say is narrower: `sandbox-exec` is deprecated (2017 man page) and its profile language is undocumented for third parties (DTS, 2019).

## Findings

1. **macOS can in principle detect an attempt.** Run the `sandbox-exec` command while a `log stream` with the sourced predicate runs in a second process, and any `deny(1) network-outbound` line for the binary is an attempt. This is sourced for the log mechanism, but the pairing of that log with a `(deny network*)` `sandbox-exec` profile is two sources joined by inference and was never run. It needs one Mac run before it can be a gate.
2. **Windows can in principle detect an attempt** through event 5157 with outbound direction and the binary's path, after the "Audit Filtering Platform Connection" subcategory is enabled and a block rule exists. The commands to enable the audit and to read the event were not fetched, so none is given here. Changing audit policy and firewall rules changes host state and needs elevation on a real machine; this page set does not say so for `New-NetFirewallRule`.
3. **The local Windows harness is not available on this host.** Whether it runs on the owner's WSL2 machine is untested here. Adding firewall rules inside it is a host-state change and is the owner's decision.
4. **The Linux gate is the only one measured.** It has a control and passes for grim and ocx. ocx's `--version` fails UX-CLI-08 on exit code (64), independent of the network question. Because `app.rs` has no platform `cfg`, the version flag registration is the same on all platforms; whether the Windows build connects is unmeasured.

## Effect on the ruleset

### UX-CLI-08: change

Replace the network sentence of the Verification column with this text (rule text and the stdout, stderr and exit assertions stay):

> Network, Linux (the gate): `strace -f -qq -e trace=connect -o t.txt <bin> --version; grep -cE 'AF_INET6?' t.txt` prints `0`. Prove the grep works once per environment: `strace -f -qq -e trace=connect -o c.txt curl -s -m 2 http://192.0.2.1/; grep -cE 'AF_INET6?' c.txt` prints a number above `0`. Repeat for `-V`. macOS and Windows (SHOULD, evidence only, never counted as a pass when not run): record `not run` unless a Mac or Windows host is available. macOS, untested form: in one shell `log stream --style compact --predicate '((processID == 0) AND (senderImagePath CONTAINS "/Sandbox")) OR (subsystem == "com.apple.sandbox.reporting")' > deny.log`, in another `sandbox-exec -p '(version 1)(allow default)(deny network*)' <bin> --version`; pass is exit 0, the same one line, and `grep -c 'deny(1) network' deny.log` printing `0`. The `sandbox-exec` tool is deprecated and its profile language is undocumented; record the macOS version and the date of the run. Windows: no command here is verified; use the Windows Filtering Platform event 5157 (outbound, `Application` equal to the binary path) as the attempt record and Windows Sandbox with `<Networking>Disable</Networking>` or a per-program outbound block as the enforcement, and record the result or `not run`. Do not report a Linux pass as a macOS or Windows pass; state instead that the version code path has no platform `cfg` branch (`grep -rnE 'cfg\((windows|target_os)' <modules on the --version path>` lists none).

Severity: MUST for the behaviour and the Linux gate. SHOULD for the macOS and Windows forms. Proposed `sandbox-exec` form is marked untested and must say so until one run on a Mac is recorded.

### UX-CLI-31 (new, SHOULD): the `--version` path builds no network client

- **Rule:** The `--version` and `-V` code path never constructs a network client and never calls an update check. An update check runs only from other commands.
- **Rationale:** The platform checks above are unrun, so the property is pinned in code and in a test. ocx has an update check (`app.rs:180`, `update_check::check_for_update`), so the risk is real, and ocx's `--version` currently exits 64 before reaching any of it.
- **Severity:** SHOULD.
- **Verification:** (1) Review: find the function that handles `--version` (for clap, `version` in the root `#[command(...)]`) and confirm that no call from it reaches an update check or HTTP client; `grep -nE 'update_check|reqwest|hyper|ureq|Client::new' <files on the path>` is a hint only (it printed nothing for ocx's `version.rs`, which proves little because the call goes through `context`). (2) Test: run `HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 timeout 2 <bin> --version; echo $?` and expect `0` (measured for grim: 5 ms, exit 0). This catches a client that retries or waits. It cannot catch a connection that ignores proxy variables, so it complements the `strace` gate and does not replace it.

### Open question 2 (consolidation): update

Replace the network part with: "UX-CLI-08's Linux `strace` gate is measured with a control. The macOS check (`log stream` plus `sandbox-exec`) and the Windows check (event 5157, firewall block) have sourced mechanisms but were not run. Run each once on a real host and record the date."

## Dated facts

| Fact | Source | Date |
|---|---|---|
| `sandbox-exec` is deprecated; options include `-p`. | [man page mirror](https://keith.github.io/xcode-man-pages/sandbox-exec.1.html) | page footer March 9, 2017 |
| Sandbox profile format is "not documented for third party use". | [Apple Forums 124284](https://developer.apple.com/forums/thread/124284) | October 2019 |
| `sandbox-exec` log predicate (community post). | same thread | September 2021 |
| Apple documents `Sandbox: ... deny(1) network-outbound` and the `com.apple.sandbox.reporting` filter (App Sandbox). | [Apple](https://developer.apple.com/tutorials/data/documentation/security/discovering-and-diagnosing-app-sandbox-violations.md) | no page date, copyright 2026 |
| `(version 1)(allow default)(deny network*)` appears in a blog. | [mybyways](https://mail.mybyways.com/blog/run-code-in-a-macos-sandbox) | 2023-06-11 |
| Event 5157 records blocked connections with application path and direction. | [Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-5157) | ms.date 2021-09-08, updated 2026-04-27 |
| Firewall log: default path and "no logging occurs until" enabled. | [Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/configure-logging) | ms.date 2025-04-07, updated 2026-10-08 |
| Windows Sandbox `Networking` Disable. | [Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file) | ms.date 2026-03-29 |
| `New-NetFirewallRule -Program/-Direction/-Action`. | [Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule) | ms.date 2016-12-27, updated 2025-05-14 |
| grim 0.16.0 `--version`: 0 connects; ocx 0.6.8 `version`: 0 connects; control `curl`: 1. | commands above | 2026-11-27 |
| ocx `--version` and `-V` exit 64; `app.rs:54-58` has no `version`. | commands above; ocx commit 02b8434e (2026-11-26) | 2026-11-27 |

## What could not be determined

- **Windows harness run:** `/mnt/c` does not exist on this host (native Linux, not WSL). Missing: the owner's WSL2 machine, or any Windows host with a built `.exe`.
- **macOS run:** no Mac and no `sandbox-exec` here. Missing: one run of the macOS form in UX-CLI-08, with the `log stream` output captured. Until then, whether `(deny network*)` parses on current macOS and whether its denials reach the log predicate is unconfirmed.
- **Windows audit commands:** how to enable "Audit Filtering Platform Connection" and read event 5157 from a script were not fetched. No command is claimed.
- **Elevation for `New-NetFirewallRule`:** the fetched page does not state it.
- **Whether outbound drops reach `pfirewall.log`:** the fetched page speaks of incoming packets only.
- **Whether Windows builds of ocx or grim connect on `--version`:** unmeasured.
- **The `ESC[2A` and console questions** in open question 2 are outside this commission.
