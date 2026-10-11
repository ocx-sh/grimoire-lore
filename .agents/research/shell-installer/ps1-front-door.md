---
title: "install.ps1 front door: irm | iex delivery, TLS, integrity and 5.1 safety (PS-SEC)"
topic: "shell scripting across operating systems and shells; PowerShell installer scripts, delivery by irm | iex, integrity, archive extraction, TLS, execution policy"
agent: "W3-2 installer/ps1-front-door"
model: sonnet
date_researched: 2026-10-11
sources_count: 27
fixtures: "/home/mherwig/.cache/research-lang/shell-tools/fixtures/ps1-front-door/"
scope: |
  Covers rows M-U-01, M-U-03, M-U-04, M-Q-03 (follow-up), M-P-06 (follow-up) and M-N-02 (the ps1 half): what an iex-delivered
  installer may contain, TLS on Windows PowerShell 5.1, hash-before-extract, zip containment, runner-file writes (X8), and the verdict on grimoire's front-door claim.
  Measured on Windows PowerShell 5.1.26100.9444 (real Windows host, .NET Framework 4.8.1), pwsh 7.4.7 (docker) and pwsh 7.6.6 (ocx toolchain), PSScriptAnalyzer 1.25.0.
  Not covered: execution policy as a gate (M-U-02, owned by PS-GATE-07), ConstrainedLanguage (M-U-05) and credentials (M-U-06), both parked by the map; the sh half of
  the installer pair (SH-INST); macOS and non-Windows pwsh hosts beyond the engine rows (no macOS host: any macOS claim is "unverified: read only").
---

# install.ps1 front door: delivery, TLS, integrity, 5.1 safety

Date 2026-10-11. Builds on `shell-pwsh.md` (cited by ID, not restated): PS-COMPAT-01/06/09, PS-ENC-01..03, PS-ERR-05, PS-NATIVE-01/02, PS-GATE-07; and on `shell-ci.md` SH-CI-11. New rule IDs below are PS-SEC-01..PS-SEC-13. Everything marked "measured" was run on all three engines unless it says otherwise; fixture paths are relative to `fixtures/ps1-front-door/` (abbreviated `FX/`).

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The owner verdict: grimoire's front door claims a check its installer does not have](#f1)
   2. [What `irm | iex` runs, and what it silently drops](#f2)
   3. [`exit`, `break` and the two host models](#f3)
   4. [Scope leaks: iex runs in the caller's scope](#f4)
   5. [TLS on 5.1: measured defaults and the right guard](#f5)
   6. [Integrity: hash before extract, fail closed, and where the digest comes from](#f6)
   7. [Extraction and zip-slip: what is actually vulnerable](#f7)
   8. [`Get-FileHash`, `Expand-Archive` and `-LiteralPath`](#f8)
   9. [Execution policy under iex (the cargo-dist gate)](#f9)
   10. [Invoke-Expression: the lint and the front door](#f10)
   11. [Runner-file writes on 5.1 (X8): SH-CI-11 versus PS-ENC-03](#f11)
   12. [Negative results (what is not a hazard)](#f12)
   13. [Fleet and ocx defects with reproducers](#f13)
   14. [The PowerShell half of the installer-script skill](#f14)
3. [Normative guidance candidates](#normative)
4. [Verification runs](#verification)
5. [Exemplar evidence](#exemplars)
6. [AI-agent angle](#ai-angle)
7. [Contested / evolving](#contested)
8. [Sources](#sources)

## Summary

- **Verdict for the owner:** the claim "the real installer ... verifies the downloaded archive's SHA-256 before installing" (`grimoire@4650ad830375:docs/public/install.ps1:3-6`, live at `https://setup.grimoire.rs/ps1` and `https://grimoire.rs/install.ps1`, and `docs/src/content/docs/installation.md:49-52`) is **false for PowerShell and true for sh**. The shipped `grimoire-installer.ps1` v0.14.3 (22,541 B, sha256 `17b1140b...bead`) has 0 occurrences of checksum, sha256, FileHash or hash and extracts with `Expand-Archive` at :317. cargo-dist 0.33.0 (latest, 2026-09-10) has the same gap; the upstream fix is an open, unmerged PR ([axodotdev/cargo-dist#2497](https://github.com/axodotdev/cargo-dist/pull/2497), 2026-09-03) for an open issue ([#2397](https://github.com/axodotdev/cargo-dist/issues/2397), 2026-05-17).
- The release already publishes eight `.sha256` sidecars plus `sha256.sum` (843 B) and `dist-manifest.json`; the ps1 installer reads none of them. The sh installer embeds the digests (`grimoire-installer.sh:220-285`).
- `exit` inside an `irm | iex` script kills the user's host shell on 5.1.26100.9444, 7.4.7 and 7.6.6, success or failure. The scoop idiom (`$Global:LASTEXITCODE = $c; break`) survives an interactive prompt but **swallows the failure in a non-interactive host** (step exit 0, wrapper trailer never reached). The shape that is green in both models is one guarded `exit` at script top level with `return` for iex (PS-SEC-09, amends PS-ERR-05).
- PS-ERR-05's detection formula `$null -eq $MyInvocation.MyCommand.Path` **throws under `Set-StrictMode -Version Latest`** when iex-delivered ("The property 'Path' cannot be found on this object"); `[string]::IsNullOrEmpty($PSCommandPath)` is safe (PS-SEC-08). www-setup sets StrictMode Latest at `install.ps1:63`, so adopting the formula verbatim would break it.
- `#Requires` is a comment to iex (a `#Requires -Version 99.0` body ran on all three engines), `param(...)` binds only defaults (a `Mandatory` param is silently empty, no prompt, no error), `$PSScriptRoot` is the empty string (not `$null`), and `Join-Path $PSScriptRoot x` throws.
- iex runs **in the caller's scope**: `$ErrorActionPreference = 'Stop'`, `Set-StrictMode -Version Latest`, every `function` and `$Version` persist in the user's session afterwards. grimoire's front door line 10 and www-setup's `Say/Err/Warn/Main/Download-File` do this; wrapping the body in `& { ... }` leaks nothing (measured).
- `(Invoke-WebRequest ...).Content | iex` is a **silent no-op on `application/octet-stream`** (Content is `byte[]`, iex prints the byte values 39 76 73 ...); `irm | iex` and `iwr | iex` work. GitHub release assets and `setup.grimoire.rs/ps1` are served as octet-stream.
- TLS: the 5.1 host's default is `SystemDefault` (.NET 4.8.1, registry values unset). Microsoft says not to set `SecurityProtocol` on .NET 4.7+. A simulated legacy default (`Ssl3, Tls`) fails `github.com` with "Could not create SSL/TLS secure channel"; setting `Tls12` fixes it. The right guard sets only when the value is not `SystemDefault`, to exactly `3072` (+`12288` when the `Tls13` member exists), and never names a `Tls13`/`Tls11`/`Tls`/`Ssl3` literal (www-setup `:337,:355` does).
- Hash before extract, fail closed: a tampered archive is extracted by the cargo-dist order (RED) and by www-setup's empty-digest path (`Verify-Checksum` warns and returns, `:410-413`, RED); a closed verifier aborts before extraction on all three engines, including for an empty expected digest (GREEN).
- The digest root of trust matters more than the call: a sidecar fetched from the same release as the archive (setup-grimoire `install.ps1:53-56`) detects corruption and a swapped asset on a CDN, not a compromised release; an inline digest from a manifest on another origin (www-setup `dist.json`) or one embedded in the script does better (PS-SEC-02).
- Zip-slip, measured: hand-rolled `Join-Path` + `ExtractToFile` writes outside the destination for `../` and `..\` entries on all three engines (RED); `ZipFile.ExtractToDirectory`, www-setup's `Expand-ZipSafely` and `Expand-Archive` (which errors, with a misleading "Cannot find path") wrote nothing outside on 5.1.26100.9444, 7.4.7 and 7.6.6. The comment "Expand-Archive only validates entry paths from PS 7.4 onwards" (`www-setup@a251c3631047:src/install.ps1:424-426`) was **not reproduced** on the current 5.1 host; older .NET Framework builds are unverified.
- `Get-FileHash -Path` (and `Expand-Archive -Path`) treats `[` `]` as wildcards: `ocx[1].zip` returns no result and **no error** on all three engines. `www-setup/src/install.ps1:415` and `setup-grimoire/.github/scripts/install.ps1:55,:61` use `-Path`. `-LiteralPath` fixes it (PS-SEC-05).
- The cargo-dist gate (`Get-ExecutionPolicy -notin Unrestricted,RemoteSigned,Bypass` then `throw`, `grimoire-installer-v0.14.3.ps1:599-608`) rejects a stock Windows-client user (policy Restricted, per [about_Execution_Policies 5.1](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Core/About/about_Execution_Policies.md)) although iex text is not subject to the policy: measured under `-ExecutionPolicy Restricted`, a harmless iex ran, the gate threw, and `-File` was refused by the policy itself. It also tells users to run `Set-ExecutionPolicy RemoteSigned -scope CurrentUser`, which PS-GATE-07 forbids installers to do.
- Runner files on 5.1 (X8): `Out-File -Encoding utf8 -Append` onto the runner's empty file is GREEN (BOM once at the start, consumed by `File.ReadAllLines(path, Encoding.UTF8)`, `actions/runner FileCommandManager.cs:138`); `Add-Content` corrupts a non-ASCII path (U+FFFD, RED); any mix with `>>` is RED; `[IO.File]::AppendAllText(..., UTF8NoBOM)` is GREEN alone and in mixes with `Out-File`. One writer per file; prefer AppendAllText (matches PS-ENC-03).
- `irm | iex` is truncation-safe (measured with a short `Content-Length` and a cut chunked body: the cmdlet errors before iex on all three engines); unlike `curl | sh`, no `main()` wrapper is needed for truncation.
- Local simulation trap: `Get-Content file | iex` (no `-Raw`) pipes one line at a time and fails on any multi-line construct; use `-Raw`.
- Seven greps, one AST script and a PSScriptAnalyzer rule were watched RED on planted fixtures and GREEN on twins (see Verification runs); the `Invoke-Expression` rule is a token lint: replacing it with `& ([scriptblock]::Create(...))` is lint-green with identical power, so the security value is the hash check, not the token.

## Findings

<a id="f1"></a>
### 1. The owner verdict: grimoire's front door claims a check its installer does not have

**Claim sites** (all say the downloaded archive's SHA-256 is verified):
- `grimoire@4650ad830375:docs/public/install.ps1:3-6` ("The real installer is generated by cargo-dist and verifies the downloaded archive's SHA-256 before installing"); the same sentence is in `docs/public/install.sh:4-7`.
- Live copies, fetched 2026-10-11: `https://setup.grimoire.rs/ps1` (605 B, `content-type: application/octet-stream`, lines 3-5 carry the claim) and `https://grimoire.rs/install.ps1` (612 B, byte-identical to the repo file).
- Docs: `grimoire@4650ad830375:docs/src/content/docs/installation.md:49-52` ("downloads the matching archive ... verifies its SHA-256 checksum") for both `curl ... | sh` and `irm https://setup.grimoire.rs/ps1 | iex`.

**Evidence against the PowerShell half:**

| Evidence | Result |
|---|---|
| Shipped artifact: `https://github.com/grimoire-rs/grimoire/releases/download/v0.14.3/grimoire-installer.ps1` (release published 2026-09-28T09:40:28Z), 22,541 B, `application/octet-stream`, sha256 `17b1140b274c94ddf59aa912ce1c90f2c4dd68150f4ce3fb8b5e8cb044bdbead` | `grep -i -e checksum -e sha256 -e filehash -e hash` finds nothing; `Expand-Archive -Path $dir_path -DestinationPath "$tmp"` at `:317`; download is `Net.Webclient.DownloadFile` at `:272-278,:298` |
| Template: [cargo-dist v0.33.0 `installer.ps1.j2`](https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.ps1.j2) | 0 hits for `hash`; `Expand-Archive` at `:325`; pinned by `grimoire@4650ad830375:dist-workspace.toml` (`cargo-dist-version = "0.33.0"`, `installers = ["shell", "powershell"]`) |
| Upstream state ([CHANGELOG](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md) at `axodotdev/cargo-dist@d1055f48071e`, 2026-10-04) | newest release is 0.33.0 (2026-09-10), "Unreleased: Nothing Yet!"; sh checksum verification landed earlier ([PR 1497](https://github.com/axodotdev/cargo-dist/pull/1497)) |
| Upstream issue/PR | [#2397](https://github.com/axodotdev/cargo-dist/issues/2397) "Support for checksum verification for `installer.ps1`" open since 2026-05-17; [#2497](https://github.com/axodotdev/cargo-dist/pull/2497) "Verify archive checksums in PowerShell installers" open since 2026-09-03, not merged (`gh api`, 2026-10-11) |
| What the release already offers | 8 per-archive `.sha256` sidecars, `sha256.sum` (843 B, archives only), `dist-manifest.json` (37,648 B); none is read by the ps1 installer |
| The sh half | `grimoire-installer.sh:220-285` embeds `_checksum_style="sha256"` and a digest per target: the sh claim is **true** |

**Verdict:** the claim is true for `install.sh` and false for `install.ps1` as of v0.14.3 and cargo-dist 0.33.0; every Windows user running the documented one-liner gets an unverified `Expand-Archive`. This is a documentation-versus-code mismatch with a security consequence (the user believes a check ran). It is evidence for the owner, not fixed here (owner Q6).

**Options the owner can pick** (each is one decision, none is taken here):
1. Make the claim true for ps1: carry the front door's own hash step (PS-SEC-01/03: download the archive and its `.sha256`, verify, then extract; the www-setup installer is the in-fleet model), or adopt cargo-dist once [#2497](https://github.com/axodotdev/cargo-dist/pull/2497) ships and pin a version that contains it.
2. Make the text true now: drop the SHA-256 sentence from `docs/public/install.ps1:3-6`, `setup.grimoire.rs/ps1` and `installation.md:49-52` for the PowerShell path.
3. Keep delegation but verify the delegate's *input*: not possible, because `sha256.sum` does not list `grimoire-installer.ps1` itself (843 B, archives only); the installer script has no published digest.

**Other front-door defects measured on the same files** (each with a reproducer below): the front door line 10 sets `$ErrorActionPreference = 'Stop'` in the caller's scope (finding 4); the generated installer ends `catch { Write-Information $_; exit 1 }` (`grimoire-installer-v0.14.3.ps1:642`, template `:672`) and `Exit` at `:87`, which kill the host shell when iex-delivered (finding 3); the policy gate (finding 9); TLS is only *checked* for the presence of `Tls12` (`:612-613`), never set (finding 5). A fix pass should read PS-SEC-01, -03, -06, -08, -09, -10, -11 together.

<a id="f2"></a>
### 2. What `irm | iex` runs, and what it silently drops

Measured with `FX/iex-semantics.ps1` (`FX/out/iex-semantics.out`): each probe is written to a file and run in a child host of the same engine, once through `Get-Content -Raw f | Invoke-Expression` and once through `-File`. Results are identical on 5.1.26100.9444, 7.4.7 and 7.6.6.

| Probe | iex | `-File` | Consequence |
|---|---|---|---|
| `#Requires -Version 99.0` then output | body **ran** | refused (`ScriptRequiresUnmatchedPSVersion`) | `#Requires` (PS-COMPAT-01) does not guard an iex script; add an in-code version test (www-setup `:731`) |
| `[CmdletBinding()] param([string]$Version='dflt', [switch]$Force)` | works with defaults, `$args.Count` = 0 | same | params can never be passed by `irm | iex`; defaults only |
| `param([Parameter(Mandatory)][string]$Version)` | `Version=` (empty): **no prompt, no error** | `Cannot process command because of one or more missing mandatory parameters` | a Mandatory param is silently empty under iex |
| `$PSScriptRoot`, `$PSCommandPath` | `[]` (empty string, `$null -eq $PSScriptRoot` is **False**) | the real path | `Join-Path $PSScriptRoot x` throws "Cannot bind argument to parameter 'Path' because it is an empty string" |
| `$MyInvocation.MyCommand.Path` | `$null` | the real path | `Split-Path -Parent $MyInvocation.MyCommand.Path` throws ("because it is null") |
| the same under `Set-StrictMode -Version Latest` | **throws** "The property 'Path' cannot be found on this object" | works | PS-ERR-05's `$IsIex` formula fails under StrictMode (finding 3) |
| `& ([scriptblock]::Create($text)) -Version 0.5.0` | binds `-Version` | n/a | the supported flag channel (www-setup documents it, `install.ps1:24`) |

The brief called `$PSScriptRoot` "null under iex"; measured, it is **empty**, which changes the test: `$null -eq $PSScriptRoot` is False under iex, `[string]::IsNullOrEmpty($PSScriptRoot)` is True. [about_Automatic_Variables](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Automatic_Variables.md) says `$PSScriptRoot` is "populated only when the caller is a script".

Delivery forms (`FX/iwr-iex.ps1`, `FX/irm-type.ps1`, local server serving `application/octet-stream`):

```powershell
# WRONG (silent no-op on octet-stream: Content is byte[]; iex evaluates each byte as a number)
(Invoke-WebRequest -Uri $u -UseBasicParsing).Content | Invoke-Expression      # prints 39, 76, 73, 78 ... on 5.1 and 7.6.6

# RIGHT (all three print "LINE1 ran / LINE2 ran / LINE3 ran")
irm $u | iex                                  # irm returns [string] for octet-stream on 5.1, 7.4.7, 7.6.6
iwr -UseBasicParsing $u | iex                 # the response object stringifies to the body
& ([scriptblock]::Create((irm $u))) -Force    # flags, see PS-SEC-07
```

`irm` on `https://setup.grimoire.rs/ps1` and on the release asset returns `System.String` on all three engines (lengths 603 on 7.x vs 605 on 5.1 for the 605-byte front door: 5.1 decodes the octet-stream body without a charset as a single-byte encoding, so a UTF-8 em dash becomes three characters; the front door has one em dash in a comment, harmless, but this is why PS-ENC-01 applies to served scripts). Local simulation trap (`FX/getcontent-raw.ps1`): `Get-Content f | iex` without `-Raw` feeds one line at a time and throws a parse error on a function or `if` block that spans lines; `-Raw` or `-join "`n"` behaves like `irm`.

**Truncation** (`FX/trunc-server.py`, `FX/trunc-client.ps1`, `FX/out/truncation.out`): with a `Content-Length` larger than the body, and with a chunked body cut before the terminator, `Invoke-RestMethod` raised ("The response ended prematurely" on 7.x, "The connection was closed" on 5.1) and **iex never ran** on all three engines. `irm` buffers the whole body, so the `curl | sh` partial-execution hazard does not exist for `irm | iex`.

<a id="f3"></a>
### 3. `exit`, `break` and the two host models

PS-ERR-05 (carried, not restated) bans `exit` under iex. This round measured the *replacement* in two host models with `FX/check-iex-survival.ps1` (`FX/run-iex.sh`, `FX/out/iex-survival.out`): **repl** (the one-liner pasted at an interactive prompt: the delivery and a marker are two statements fed on stdin) and **ci** (a step: both statements in one script, plus the trailer the GitHub Actions `pwsh` wrapper appends, `if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }`).

| Served script (failing step, code 3) | repl | ci | Reading |
|---|---|---|---|
| `served.ps1`: `function Err { ...; exit $Code }` (PLANT; the www-setup and generated-cargo-dist shape) | **RED**: host terminated (child exit 3, marker never printed) on 5.1, 7.4.7, 7.6.6 | GREEN: step exits 3 | `exit` is right in a step, fatal at a prompt |
| `served-twin.ps1`: scoop `Exit-Install` (`$Global:LASTEXITCODE = $c; break`) | GREEN: host survives, `lastexit=3` | **RED**: step exit **0**, marker never printed | `break` outside a loop ends the caller's whole statement list, and the wrapper trailer is never reached: the failure is swallowed |
| `served-twin-return.ps1`: status flows back as a value, top-level `return` | GREEN | GREEN (step exit 3) | |
| `served-twin-single-exit.ps1`: functions throw, one guarded exit at top level (below) | GREEN | GREEN (step exit 3) | recommended |
| `served-throw.ps1`: `throw` under Stop | GREEN (error shown, `lastexit` empty) | GREEN (step exit 1) | |
| same plants through `& ([scriptblock]::Create(...))` | `exit` RED, single-exit GREEN | | `[scriptblock]::Create` has the same host-kill |
| `& file.ps1` (download-then-run) with `exit` | GREEN (child scope; `$LASTEXITCODE` set) | | `exit` is safe when the script is *called*, not evaluated |

```powershell
# WRONG: kills the user's shell when delivered by irm | iex
function Err { param([string]$Message, [int]$Code = 1)
    [Console]::Error.WriteLine("installer: error: $Message"); exit $Code }

# WRONG in a non-interactive host: scoop shape, the step succeeds with exit 0
$IsIex = ($null -eq $MyInvocation.MyCommand.Path)        # also throws under StrictMode Latest
function Exit-Install { param([int]$Code = 1) if ($IsIex) { $Global:LASTEXITCODE = $Code; break } else { exit $Code } }

# RIGHT: functions never exit/break; one guarded exit at script top level
$IsIex = [string]::IsNullOrEmpty($PSCommandPath)          # safe under StrictMode Latest and under [scriptblock]::Create
function Step { throw 'download failed' }
function Main { Write-Output 'installer: start'; Step }
$rc = 0
try { Main } catch { [Console]::Error.WriteLine("installer: error: $($_.Exception.Message)"); $rc = 3 }
if ($rc -ne 0) {
    if ($IsIex) { $Global:LASTEXITCODE = $rc; return }    # repl: host survives with $LASTEXITCODE; ci: the wrapper trailer exits $LASTEXITCODE
    exit $rc                                              # -File: process exit code (measured 3 on all engines)
}
```

Scoop avoids the swallow by construction: `if ((-not $env:CI) -and $IS_EXECUTED_FROM_IEX)` (`ScoopInstaller/Install@1e2f334083d6:install.ps1:96`) uses `break` only outside CI. That works but is a hand-maintained special case; the single-exit shape needs none. Scoop's `$IS_EXECUTED_FROM_IEX = ($null -eq $MyInvocation.MyCommand.Path)` (`:743`) is safe there because the file sets `Set-StrictMode -Off` (`:70`).

<a id="f4"></a>
### 4. Scope leaks: iex runs in the caller's scope

[Invoke-Expression](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Invoke-Expression.md): "Expressions are evaluated and run in the current scope." Measured (`s4-leak` / `s4b-scoped`, all three engines):

```text
iex of:  $ErrorActionPreference='Stop'; Set-StrictMode -Version Latest; function Say {..}; function Main {..}; $Version='leaked-var'
after:   EAP=Stop  Say=True  Main=True  Version=leaked-var   and  $undefinedVar -> "The variable '$undefinedVar' cannot be retrieved because it has not been set."
iex of the same body wrapped in  & { ... }
after:   EAP=Continue  Say=False  Version=[]                  and  $undefinedVar -> no error
```

So an iex installer that sets Stop or StrictMode Latest at file level changes the user's interactive session; one that defines `Say`, `Err`, `Warn`, `Main`, `Download-File` (www-setup `install.ps1:173-188,:728`) shadows or defines global commands. grimoire's front door line 10 (`$ErrorActionPreference = 'Stop'`) leaks Stop. Scoop saves and restores the preference in `finally` (`install.ps1:759-786` area, `$oldErrorActionPreference`). Fix: run the body in `& { ... }` (function definitions then stay local), or restore in `finally`. The `$callerVersion = Get-Variable -Name 'Version' -Scope 1` idiom (www-setup `:742`) reads a *caller* variable on purpose, so it must be read before any child scope hides it and is documented as `$Version = '0.5.0'; irm ... | iex`.

<a id="f5"></a>
### 5. TLS on 5.1: measured defaults and the right guard

Measured by `FX/env.ps1` and `FX/tls.ps1` (`FX/out/tls.out`):

| Engine | default `ServicePointManager.SecurityProtocol` | `SecurityProtocolType` names |
|---|---|---|
| Windows PowerShell 5.1.26100.9444, CLR 4.0.30319.42000, .NET Framework Release 533509 (4.8.1) | `SystemDefault` (value 0); registry `SchUseStrongCrypto` and `SystemDefaultTlsVersions` unset | `SystemDefault, Ssl3, Tls, Tls11, Tls12, Tls13` (Tls13 present) |
| pwsh 7.4.7, 7.6.6 | `SystemDefault` | same names; `HttpClient` ignores the setting; assigning `Ssl3, Tls` throws "The requested security protocol is not supported." |

**Simulation (labelled as such: the host is .NET 4.8.1, the legacy default is set by hand)**: setting `SecurityProtocol = 'Ssl3, Tls'` on 5.1 and requesting `https://github.com/` gave `The request was aborted: Could not create SSL/TLS secure channel.` (RED); after `-bor Tls12` a request to `https://api.github.com/` succeeded (a different host per probe, because .NET reuses connections per host and would hide a protocol change). A legacy host (.NET 4.5/4.6 without the registry opt-in, for example Windows Server 2012 R2 or an unpatched Windows 7) is read-only here.

Microsoft's guidance ([TLS best practices with .NET Framework](https://raw.githubusercontent.com/dotnet/docs/main/docs/framework/network-programming/tls.md), ms.date 2026-06-04): "Do not specify the TLS version explicitly ... If you must set ServicePointManager.SecurityProtocol, then set it to SystemDefault"; "Don't set a value for the SecurityProtocol property (for HTTP networking)" on .NET 4.7 and later; and if you cannot avoid it, "specify TLS 1.2 or TLS 1.3". Scoop implements exactly that (`Optimize-SecurityProtocol`, `ScoopInstaller/Install@1e2f334083d6:install.ps1:211-226`: do nothing when the framework knows `SystemDefault` and the value is `SystemDefault`, else assign `3072 -bor 768 -bor 192`).

The Tls13 literal hazard: `[Net.SecurityProtocolType]::Tls99` (a member that does not exist) returns `$null` in non-strict mode and **throws `PropertyNotFoundException`** under `Set-StrictMode -Version Latest` (measured on all three). www-setup sets StrictMode Latest at `:63` and names `Tls13` as a literal at `:337,:355`; the member exists only on .NET Framework 4.8+, so on an older 5.1 host the literal is an unguarded failure (the member's absence on old frameworks is read-only here). It also assigns unconditionally, replacing `SystemDefault` and persisting in the caller's session under iex. vcpkg avoids the whole class by shipping a helper binary (`microsoft/vcpkg@e456309491fd:scripts/bootstrap.ps1:53-55`, `tls12-download.exe`).

```powershell
# WRONG (www-setup@a251c3631047:src/install.ps1:337): unconditional, names a member that may not exist, persists in the caller's session
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

# RIGHT: only on Desktop, only when the OS default is not in force; numeric values cannot throw; drops Ssl3/Tls/Tls11
if ($PSVersionTable.PSEdition -eq 'Desktop' -and [Net.ServicePointManager]::SecurityProtocol -ne 'SystemDefault') {
    $want = 3072                                                                  # Tls12
    if ([enum]::GetNames([Net.SecurityProtocolType]) -contains 'Tls13') { $want = $want -bor 12288 }
    [Net.ServicePointManager]::SecurityProtocol = $want
}
```

Measured: from a simulated legacy value the guarded form yields `[Tls12, Tls13]` (value 15360) on 5.1 and a following request succeeds; on `SystemDefault` and on pwsh 7 it is a no-op. The cargo-dist installer only checks that `Tls12` exists (`installer.ps1.j2:643`, `grimoire-installer-v0.14.3.ps1:612-613`) and never sets it, so on a legacy host its `WebClient` download fails (simulated RED above). PS-COMPAT-09 (SHOULD, "set TLS explicitly ... `-bor Tls12`") needs this refinement for installers: see PS-SEC-06.

<a id="f6"></a>
### 6. Integrity: hash before extract, fail closed, and where the digest comes from

`FX/hash-order.ps1 -Variant ...` (`FX/run-hash.sh`, `FX/out/hash.out`) models a release that publishes the good archive and a download that returns a valid zip with swapped bytes (the realistic tamper; a flipped byte would just fail to extract). Exit 1 means the tampered archive was extracted:

| Variant | Shape | 7.4.7 | 7.6.6 | 5.1.26100.9444 |
|---|---|---|---|---|
| `nohash` | cargo-dist order: download then `Expand-Archive` (`installer.ps1.j2:325`) | RED exit 1, `EVIL-BINARY` extracted | RED | RED |
| `failopen` | www-setup `Verify-Checksum` with an empty expected digest (`install.ps1:410-413`: warns "skipping verification", returns) | RED | RED | RED |
| `closed` | digest compared before extraction, mismatch throws | GREEN exit 0, "aborted before extraction" | GREEN | GREEN |
| `closed-empty` | same, empty expected digest also throws | GREEN | GREEN | GREEN |

How www-setup reaches `failopen`: `$sha = ... else { '' }` at `install.ps1:854` when the manifest row has no `sha256` key, then `Verify-Checksum` at `:880` skips. A manifest that omits the key is accepted silently. (The attacker who controls the manifest can also supply a matching digest, so this is defense in depth against an artifact-host compromise with a stale or partial manifest, not a new boundary.)

**Provenance** (the question behind M-N-02 "where does the checksum come from"):

| Installer | Digest source | Independent of the archive's origin? |
|---|---|---|
| www-setup `install.ps1` | inline in `dist.json` from `setup.ocx.sh` (`:854`); optional content-addressed manifest pin (`:547-574`) | yes (manifest origin differs from the GitHub asset host) |
| setup-grimoire `.github/scripts/install.ps1:53-56` | `<asset>.sha256` sidecar from the same release URL | no: detects corruption and a swapped asset, not a compromised release |
| cargo-dist 0.33.0 ps1 | none | n/a |
| Scoop, deno_install, dotnet-install.ps1 | none | n/a |

A front door that wants "the installer is verified" has two honest choices: embed or serve the digest from a second origin, or say that only transport integrity (TLS) is provided. The wording of a claim must match which of these the code does (PS-SEC-03).

`Get-FileHash` facts needed by a verifier, measured by `FX/filehash.ps1` on all three engines: default algorithm SHA256; `.Hash` is UPPERCASE; `-eq` is case-insensitive (`'abc' -eq 'ABC'` is True) while `-ceq` is not; the sidecar line `<hex> *<name>` parses with `($line -split '\s+')[0]`; `SHA3_256` is not a valid algorithm (`ParameterBindingValidationException`) on 5.1, 7.4.7 and 7.6.6; a missing file with `-ErrorAction Stop` throws and with `SilentlyContinue` returns `$null` (so `.Hash` on it is a null dereference under StrictMode). [Get-FileHash 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Get-FileHash.md): "By default ... SHA256".

<a id="f7"></a>
### 7. Extraction and zip-slip: what is actually vulnerable

`FX/zipcheck.ps1 -Zip <z> -Method <m>` (`FX/run-zip.sh`, `FX/out/zip.out`, `FX/out/zip-manual.out`; archives built by `FX/build-zips.py` with entry names written verbatim): extract into `work-zip/<case>/dest`, then list any file outside `dest`. Exit 1 = a file escaped.

| Method | `zip-slip.zip` (`../evil-dotdot.txt`) | `zip-slip-backslash.zip` (`..\evil-backslash.txt`) | `zip-slip-nested.zip` (`app/sub/../../evil-nested.txt`) | `zip-clean.zip` |
|---|---|---|---|---|
| **Manual**: `Join-Path $dest $e.FullName` + `ExtractToFile` | **RED** on 5.1, 7.4.7, 7.6.6 (`evil-dotdot.txt` outside) | **RED** on all three | GREEN (normalises to `dest/evil-nested.txt`, inside) | GREEN |
| `[ZipFile]::ExtractToDirectory` | GREEN: throws "Extracting Zip entry would have resulted in a file outside the specified destination directory." | 5.1: GREEN (same exception); 7.x: GREEN (a file literally named `..\evil-backslash.txt` inside `dest`) | GREEN | GREEN |
| `Expand-Archive -LiteralPath ... -Force` | GREEN: **errors** "Cannot find path '.../dest/app/readme.txt' because it does not exist." and extracts nothing | same | GREEN (inside `dest`) | GREEN |
| `Expand-ZipSafely` (www-setup `:427-467`, fixture copy) | GREEN: throws "Archive contains unsafe entry: ../evil-dotdot.txt" | GREEN | GREEN: throws on the `..` segment | GREEN |
| `tar.exe -xf` (Windows 5.1 host only) | GREEN: exit 1, nothing outside | GREEN | GREEN | GREEN |

Pinned versions: Archive module 1.0.1.0 on 5.1, 1.2.5 on 7.4.7, 1.2.6 on 7.6.6. The map's source comment (`www-setup@a251c3631047:src/install.ps1:424-426`, "Expand-Archive only validates entry paths from PS 7.4 onwards") is therefore **not reproduced** on 5.1.26100.9444 with .NET Framework 4.8.1; whether an older .NET Framework or an older Archive module is vulnerable is unverified (read only; a web search found no advisory and no changelog entry, and [ZipFile.ExtractToDirectory docs](https://raw.githubusercontent.com/dotnet/dotnet-api-docs/main/xml/System.IO.Compression/ZipFile.xml) document the "outside the directory" exception without a version note). What *is* reproducibly vulnerable on every engine is the hand-rolled loop, and that is what an agent writes when told to "avoid Expand-Archive". The upstream exemplar `dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.ps1:895-897` has that exact shape (`Get-Absolute-Path (Join-Path $OutPath $entry.FullName)` then `ExtractToFile`; `Get-Absolute-Path` at `:827-832` normalises with `GetUnresolvedProviderPathFromPSPath` and checks nothing). It matches the plant's pattern; no exploit was built against its entry filter.

Other measured differences relevant to the 5.1 floor (`FX/expand-quirks.ps1`):
- `Expand-Archive` on 5.1 requires the `.zip` extension: `.bin is not a supported archive file format. .zip is the only supported archive file format.` pwsh 7.4.7/7.6.6 extract a `.bin`; `ZipFile.ExtractToDirectory` extracts it everywhere ([Expand-Archive 5.1 docs](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Archive/Expand-Archive.md): "only works with zip archives, which typically have the file extension .zip").
- `[System.IO.Compression.ZipFile]` resolves in a fresh pwsh 7 host without `Add-Type` and does **not** resolve on 5.1; `Add-Type -AssemblyName System.IO.Compression.FileSystem` is required there (www-setup `:433`).
- Extracting twice without `-Force` throws on both `Expand-Archive` (`Failed to create file`) and `ExtractToDirectory` (`already exists`).
- `Expand-Archive -Path 'ocx[1].zip'` throws "The path '' either does not exist or is not a valid file system path" (wildcard); `-LiteralPath` works (finding 8).

<a id="f8"></a>
### 8. `Get-FileHash`, `Expand-Archive` and `-LiteralPath`

```powershell
# WRONG: [ ] are wildcards. ocx[1].zip -> $null, no error, on 5.1, 7.4.7, 7.6.6 (FX/filehash-bracket.ps1)
$actual = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLower()        # www-setup@a251c3631047:src/install.ps1:415
Expand-Archive -Path (Join-Path $tmp $asset) -DestinationPath $tmp                # setup-grimoire@1259e35b2550:.github/scripts/install.ps1:61

# RIGHT
$actual = (Get-FileHash -LiteralPath $FilePath -Algorithm SHA256).Hash
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
```

`(Get-FileHash -Path 'ocx[1].zip')` printed `-Path result is null: True; errors:` (empty error list) on all three engines; with the www-setup call shape the null `.Hash.ToLower()` surfaces as a confusing "You cannot call a method on a null-valued expression", not a clean checksum error. A temp directory whose parent has `[` in the profile name is enough to trigger it.

<a id="f9"></a>
### 9. Execution policy under iex (the cargo-dist gate)

`FX/policy-check.ps1` (`FX/out/policy.out`, `FX/out/policy51.out`), with the gate text copied verbatim from `grimoire-installer-v0.14.3.ps1:599-608` and a child host launched with `-ExecutionPolicy Restricted` (the documented client default, [about_Execution_Policies 5.1](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Core/About/about_Execution_Policies.md): "Restricted for Windows clients", "Permits individual commands, but doesn't allow scripts"; the host itself is CurrentUser=RemoteSigned, so Restricted is simulated):

```text
Windows PowerShell 5.1.26100.9444, -ExecutionPolicy Restricted
  iex of a harmless string      exit=0 :: plain iex text ran
  iex of the gate text          exit=0 :: THREW: Error: PowerShell requires an execution policy in [Unrestricted, RemoteSigned, Bypass] to run grim. ... Set-ExecutionPolicy RemoteSigned -scope CurrentUser
  -File of the same gate        exit=1 :: File ...gate.ps1 cannot be loaded because running scripts is disabled on this system.
-ExecutionPolicy Bypass: all three run ("gate passed").  pwsh 7.4.7 / 7.6.6 on Linux: Get-ExecutionPolicy is Unrestricted, everything passes.
```

[about_Execution_Policies 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Execution_Policies.md): "The execution policy isn't a security boundary, it's defense in depth. For example, users can easily bypass a policy by typing the script contents at the command line". iex text is exactly that case, so the policy neither blocks the delivery nor is a meaningful property of the user's safety. The gate therefore (a) refuses users the policy would not have stopped, and (b) tells them to make a persistent change, which PS-GATE-07 forbids installers to do (`-ExecutionPolicy Bypass` on the command line instead). The docs' one-liner `irm https://setup.grimoire.rs/ps1 | iex` fails with that throw for a default Windows-client user; the `-ExecutionPolicy Bypass -c "irm ... | iex"` form is the PS-GATE-07 escape. M-U-02 itself stays carried by PS-GATE-07.

<a id="f10"></a>
### 10. Invoke-Expression: the lint and the front door

`PSAvoidUsingInvokeExpression` ([rule doc](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/AvoidUsingInvokeExpression.md), ms.date 2026-07-21): Severity **Warning**, "Always enabled", "isn't configurable"; opt out by a custom rule list or by suppression attributes. Measured with PSScriptAnalyzer 1.25.0 on pwsh 7.6.6 (`FX/pssa.ps1`, `FX/out/pssa-iex.out`): the front-door file (`Invoke-Expression (Invoke-RestMethod ...)`, `plant/iex-fd.ps1:12`) and the alias form (`irm ... | iex`, `plant/iex-alias.ps1:2`) each give one finding and exit 1; `& ([scriptblock]::Create($text))` gives none (exit 0); a script-level `[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingInvokeExpression', '', Justification='...')]` before `param()` also gives none.

Honest reading: the rule detects a token. `[scriptblock]::Create` runs the same text with the same power and the same host-kill behaviour (finding 3), so swapping the token is not a security improvement by itself. The improvement is what happens **before** the text runs: an in-memory SHA-256 of the fetched script (`[Security.Cryptography.SHA256]::Create().ComputeHash(bytes)`) against a digest that is not served by the same response, or no second-stage fetch at all. The user's own `irm ... | iex` one-liner (documentation text) is the one legitimate use of iex; inside a delivered script it should not appear.

<a id="f11"></a>
### 11. Runner-file writes on 5.1 (X8): SH-CI-11 versus PS-ENC-03

The two consolidations read as conflicting: SH-CI-11 prescribes `Out-File -Encoding utf8 -Append` for `$GITHUB_PATH/ENV/OUTPUT`, PS-ENC-03 forbids `-Encoding utf8` ("BOM on 5.1") and prescribes `[IO.File]::AppendAllText` with `UTF8Encoding $false`. `FX/runner-file.ps1` (`FX/out/runner-file.out`) writes a non-ASCII path (`C:\Users\J` + U+00FC + `rgen\bin`, built from `[char]0x00FC` so the source stays ASCII) and `D:\tools\bin` to an **empty** file (what the runner hands a step) and reads it back exactly as the runner does: `File.ReadAllLines(filePath, Encoding.UTF8)` (`actions/runner` `FileCommandManager.cs:127-139`, [source](https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/FileCommandManager.cs)).

| Writer(s) | pwsh 7.4.7 / 7.6.6 | Windows PowerShell 5.1.26100.9444 |
|---|---|---|
| `Add-Content` | GREEN | **RED**: `C:\Users\JU+FFFDrgen\bin` (ANSI bytes decoded as UTF-8); GREEN for ASCII-only values |
| `$v >> $f` alone | GREEN | GREEN (UTF-16LE with BOM `ff fe`, 72 bytes, decoded by BOM detection) |
| `Out-File -Encoding utf8 -Append` alone | GREEN | GREEN: BOM `ef bb bf` once at the start of the empty file, none mid-file; consumed by the reader |
| `Add-Content -Encoding utf8` alone | GREEN | GREEN (same BOM-once behaviour) |
| `[IO.File]::AppendAllText(f, "$v`n", UTF8 no BOM)` alone | GREEN | GREEN, no BOM, 34 bytes |
| `>>` then AppendAllText | GREEN | **RED**: second line `U+3A44U+745C...` (UTF-8 bytes read inside UTF-16 text) |
| AppendAllText then `>>` | GREEN | **RED**: 4 lines of NUL-interleaved text |
| `Out-File utf8` then AppendAllText; `Add-Content` then `Out-File utf8` (ASCII values) | GREEN | GREEN |

Resolution: SH-CI-11's measured claim stands (a lone `Out-File -Encoding utf8 -Append` is GREEN and mixing `>>` is RED). PS-ENC-03's rule is stricter because the BOM is harmful to *other* consumers; for runner files the BOM-once is consumed. The single rule that satisfies both and avoids the mix hazard is **one writer per file, and that writer is `AppendAllText` with `UTF8Encoding $false`** (PS-SEC-12). `www-setup@a251c3631047:src/install.ps1:721` uses `Add-Content -Path $env:GITHUB_PATH`: GREEN for an ASCII path (a stock `runneradmin` profile), RED for a non-ASCII user profile on 5.1 (`FX/runner-file.ps1` row `Add-Content`). Low severity, reproducer below.

<a id="f12"></a>
### 12. Negative results (what is not a hazard)

- `irm` return type for `application/octet-stream`: `String`, not `byte[]`, on all three engines. The *Content* property of `iwr` is the byte-array trap, not `irm`.
- Truncation (finding 2): not a hazard for `irm | iex`.
- `Expand-Archive` with `../` and `..\` entries on the current 5.1 host: nothing escaped; it fails with a misleading "Cannot find path".
- `Get-FileHash` with `-Path` on ordinary paths: fine; only wildcard characters bite.
- Windows `tar.exe` (bsdtar) on the 5.1 host refused all three slip archives (exit 1) and extracted the clean one; deno_install's `tar.exe xf` (`denoland/deno_install@41d4676f8677:install.ps1:48`) is not a zip-slip vector on that build.
- pwsh 7 ignores `ServicePointManager.SecurityProtocol` (the TLS guard is Desktop-only).

<a id="f13"></a>
### 13. Fleet and ocx defects with reproducers (reported, not fixed; owner Q6)

| # | Defect | Where | Reproducer (all measured RED on 5.1.26100.9444, 7.4.7, 7.6.6) |
|---|---|---|---|
| D1 | The ps1 front door claims SHA-256 verification the installer lacks | `grimoire@4650ad830375:docs/public/install.ps1:3-6`; `docs/src/content/docs/installation.md:49-52`; live `setup.grimoire.rs/ps1` | `grep -c -i -e checksum -e sha256 -e filehash FX/src/grimoire-installer-v0.14.3.ps1` prints 0; `greps.sh` G5 lists `plant/iex-fd.ps1` |
| D2 | `exit` in `Err` kills the host under `irm | iex` | `www-setup@a251c3631047:src/install.ps1:182` (`exit $Code`), `:734` (`exit 2`, unreachable on supported hosts) | `FX/runall.sh check-iex-survival.ps1 -Path served/www-setup-install.ps1 -HostModel repl -EnvVar 'OCX_INSTALL_DIST_URL=http://invalid.example/dist.json'` -> `RED [iex/repl] host terminated ... child process exit 3` x3 (stderr: `ocx-install: error: refusing insecure (non-https) URL`); the same with `-HostModel ci` is GREEN (step exit 3) |
| D3 | Generated installer ends `exit 1` / `Exit` | `grimoire-installer-v0.14.3.ps1:642,:87`; template `:672` | `check-iex-survival.ps1` on the plant of finding 3 (same mechanism); the front door's `Invoke-Expression (Invoke-RestMethod ...)` delivers it |
| D4 | Empty expected digest skips verification (fail open) | `www-setup@a251c3631047:src/install.ps1:410-413`, source of the empty value `:854` | `hash-order.ps1 -Variant failopen` -> RED exit 1 |
| D5 | `Get-FileHash -Path` / `Expand-Archive -Path` wildcard hazard | `www-setup install.ps1:415`; `setup-grimoire@1259e35b2550:.github/scripts/install.ps1:55,:61` | `FX/ast-sec.ps1` reports `NO-LITERALPATH`; `filehash-bracket.ps1` shows the null result |
| D6 | Unconditional `Tls12 -bor Tls13` literal assignment under StrictMode Latest | `www-setup install.ps1:337,:355` (StrictMode at `:63`) | `greps.sh` G3 on `plant/tls.ps1`; `tls.ps1` shows the strict-mode throw on a missing member |
| D7 | Global functions and preference leak into the caller's session | front door `install.ps1:10`; www-setup `:173-188,:728` | `iex-semantics.ps1` probe `s4-leak` (EAP=Stop, Say/Main defined, strict mode left on) |
| D8 | `Add-Content` to `$GITHUB_PATH` on 5.1 | `www-setup install.ps1:721`; `setup-grimoire install.ps1:70` | `runner-file.ps1` row `Add-Content` RED only for non-ASCII values |
| D9 | Policy gate and persistent `Set-ExecutionPolicy` advice | `grimoire-installer-v0.14.3.ps1:599-608` | `policy-check.ps1` on 5.1 |

D2 was already in the installer audit (`shell-audit/installers.md` Smell 3, probe p7); this round adds the host-model split (finding 3), the strict-mode trap in the proposed fix (finding 3), and D4-D9.

<a id="f14"></a>
### 14. The PowerShell half of the installer-script skill

The map's `installer-script` skill ("write or review the `install.sh` plus `install.ps1` pair") needs this PowerShell half, kept to a bounded procedure with the MUST-rows table and a receipt (SKILL.md stays under 500 lines; depth lives in `powershell-quality/security.md`, family PS-SEC).

**Procedure (install.ps1):**
1. **Target and header.** Floor is Windows PowerShell 5.1 (Q2). Header lists the one-liners (`irm <url> | iex`; `$env:KNOB=...; irm ... | iex`; `& ([scriptblock]::Create((irm <url>))) -Flag`), the knob names, and an exit-code table; it states only checks the code performs (PS-SEC-03). In-code version test, not `#Requires` alone (PS-COMPAT-01).
2. **Delivery shape.** Body is iex-safe: params with defaults only, no Mandatory, no `$PSScriptRoot`, ASCII only (PS-ENC-01/02), whole body in `& { ... }` or preferences restored in `finally` (PS-SEC-08).
3. **Network.** `-UseBasicParsing` (PS-COMPAT-06), HTTPS-only with redirect re-checks (the www-setup `Resolve-DownloadUrl`/`Assert-HttpsUrl` pair, `install.ps1:273-331`), custom bounded retry (5.1 has no `-MaximumRetryCount`), the guarded TLS block (PS-SEC-06), `curl.exe`/`tar.exe` never `curl`/`tar` aliases where applicable (PS-NATIVE-01/02).
4. **Digest.** Obtain the expected SHA-256 from a source other than the archive's response (PS-SEC-02); `Get-FileHash -LiteralPath -Algorithm SHA256`; compare before any extraction; absent or malformed digest aborts (PS-SEC-01, exit 4).
5. **Extract.** `[ZipFile]::ExtractToDirectory` after `Add-Type -AssemblyName System.IO.Compression.FileSystem`, or the per-entry-checked loop; `.zip` extension if `Expand-Archive` is used on 5.1 (PS-SEC-04, -05, -13). Exit 5 on failure.
6. **Install.** User scope; no `Set-ExecutionPolicy` beyond `-Scope Process` (PS-GATE-07); no policy gate (PS-SEC-11); runner files via AppendAllText (PS-SEC-12).
7. **Exit.** Functions throw or return; one guarded top-level exit (PS-SEC-09); taxonomy follows the cli-contract and www-setup's header (`install.ps1:40-48`: 0 success, 2 argument, 3 network, 4 checksum, 5 extraction, 6 setup, 7 unsupported platform).
8. **Run the matrix** (below), record the receipt.

**MUST-rows table the skill carries:** PS-SEC-01, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12 plus the carried PS-COMPAT-01/06, PS-ENC-01..03, PS-ERR-05 (amended by PS-SEC-09), PS-NATIVE-01/02, PS-GATE-07.

**Receipt (fields):** engines run (5.1 build, pwsh 7.4/7.6 build), `check-iex-survival` in repl and ci models (exit codes), `hash-order` variants `nohash`/`closed-empty` exit codes, `zipcheck` Manual/Safe on `zip-slip.zip`, PSScriptAnalyzer version and rule exit code, the grep set G1-G10 outputs (empty = pass), and one line stating where the expected digest comes from.

## Normative guidance candidates

Numbering is PS-SEC-nn. "Watched" says whether the verification was RUN against a planted violation and its compliant twin, with the fixture path. All grep/AST commands take an explicit directory operand, print the violation as output (empty output = pass) and are run as `FX/greps.sh` (plant/ and twin/) unless noted. Engines: 5.1 = Windows PowerShell 5.1.26100.9444.

**PS-SEC-01 (MUST)** In every `install.ps1` that extracts or runs a downloaded payload, compare the payload's SHA-256 (`Get-FileHash -LiteralPath $f -Algorithm SHA256`) to an expected digest **before** `Expand-Archive`, `ExtractToDirectory`, `ExtractToFile` or `& $payload`; a mismatch, an unreadable file, or an absent/blank expected digest aborts (throw inside functions, exit code 4 at the top level).
- Why: the cargo-dist order (download, extract) and www-setup's empty-digest path both install a swapped archive.
- Verify: `grep -rLZ --include='*.ps1' -e 'Get-FileHash' -e 'ComputeHash' DIR | xargs -r -0 grep -l -e 'Expand-Archive' -e 'ExtractToDirectory' -e 'ExtractToFile'` (output = extractors with no hash call); behavioural `FX/runall.sh hash-order.ps1 -Variant nohash|failopen|closed|closed-empty` (exit 1 if the tampered archive was extracted).
- Watched: yes. `hash-order.ps1`: `nohash` and `failopen` exit 1 (RED) and `closed`, `closed-empty` exit 0 (GREEN) on 5.1, 7.4.7, 7.6.6; G1 lists `plant/zipslip.ps1`, `plant/hash.ps1`, empty on `twin/`. The grep proves presence, not order: the behavioural run proves order.

**PS-SEC-02 (MUST)** The expected digest comes from a source other than the archive's own download response: embedded in the script, inline in a manifest served from a different origin than the archive, or covered by a signature. A sidecar fetched from the same release as the archive may be used but the header and docs must call it corruption detection, not a trust root.
- Why: a compromised release replaces the archive and its sidecar together; www-setup's separate-origin manifest is the stronger model, setup-grimoire's sidecar the weaker.
- Verify: named reading heuristic: for each `Get-FileHash` comparison, trace where the expected value is fetched from and compare the host with the archive URL host. No runnable check.
- Watched: no (reading heuristic only).

**PS-SEC-03 (MUST)** Never claim verification the delivered file does not perform: a header comment, README or docs sentence containing `SHA-256`/`sha256`/`checksum` requires a `Get-FileHash` or `ComputeHash` call in the same `.ps1`; a front door that delegates to a generated installer either verifies itself or states what is not verified.
- Why: grimoire's front door says "verifies the downloaded archive's SHA-256" while the generated installer has no hash code (finding 1).
- Verify: `grep -rliE --include='*.ps1' -e 'sha-?256' -e 'checksum' DIR | xargs -r grep -L -e 'Get-FileHash' -e 'ComputeHash'` (output = files that claim a check and contain no hash call); docs prose is a reading heuristic.
- Watched: yes. G5: lists `plant/iex-fd.ps1` (the grimoire front door), empty on `twin/` (`twin/iex-scriptblock.ps1` has `ComputeHash`); on the real shipped files it lists `FX/src/grimoire-rs-install-ps1.ps1` and `setup-grimoire-rs-ps1.ps1`.

**PS-SEC-04 (MUST)** Extract zip archives only with `[System.IO.Compression.ZipFile]::ExtractToDirectory` (after `Add-Type -AssemblyName System.IO.Compression.FileSystem` on 5.1) or with a per-entry loop that rejects rooted, drive-letter and `..` entries and requires `[IO.Path]::GetFullPath([IO.Path]::Combine($root, $name)).StartsWith($root + $sep, OrdinalIgnoreCase)`. Never `Join-Path $dest $entry.FullName` + `ExtractToFile` without that check.
- Why: the hand-rolled loop wrote `evil-dotdot.txt` and `evil-backslash.txt` outside the destination on all three engines; `ExtractToDirectory` and the checked loop did not.
- Verify: `grep -rl --include='*.ps1' -e 'ExtractToFile' DIR | xargs -r grep -L -e 'GetFullPath('` (output = files that call ExtractToFile with no `GetFullPath(` call); behavioural `FX/runall.sh zipcheck.ps1 -Zip zip-slip.zip -Method Manual|ZipFile|Safe` (exit 1 if a file escaped).
- Watched: yes. `Manual` exit 1 x3 engines on `zip-slip.zip` and `zip-slip-backslash.zip`; `ZipFile`, `Safe`, `ExpandArchive` exit 0; G2 lists `plant/zipslip.ps1`, empty on `twin/`. `Expand-Archive` is contained on the current 5.1 host, so it is allowed; older .NET Framework hosts are unverified (read only).

**PS-SEC-05 (MUST)** Pass `-LiteralPath` to `Get-FileHash` and `Expand-Archive` (and to `Test-Path`, `Remove-Item` on computed paths); never `-Path` or a positional path.
- Why: `[` `]` in a path make `Get-FileHash -Path` return nothing with no error.
- Verify: `grep -rnE --include='*.ps1' -e 'Get-FileHash( +-Algorithm +[A-Za-z0-9]+)? +-Path' -e 'Expand-Archive +-Path' DIR` (output = violations; positional forms need the AST script); `FX/ast-sec.ps1 -Dir DIR` prints `NO-LITERALPATH` for `Get-FileHash`/`Expand-Archive` without `-LiteralPath` (exit 1).
- Watched: yes. G7 and the AST check: RED on `plant/lp.ps1` (2 lines), GREEN on `twin/`; real fleet hits listed in D5.

**PS-SEC-06 (MUST for installers; refines PS-COMPAT-09)** Touch `ServicePointManager.SecurityProtocol` only when running on the Desktop edition and the current value is not `SystemDefault`; then assign exactly `3072` (Tls12) `-bor 12288` (Tls13) only if `[enum]::GetNames([Net.SecurityProtocolType]) -contains 'Tls13'`. Never name `[Net.SecurityProtocolType]::Tls13`, `::Tls11`, `::Tls` or `::Ssl3` as a literal and never `-bor` onto a legacy value.
- Why: Microsoft says not to set it on .NET 4.7+ and to use TLS 1.2/1.3 when you must; a missing enum member throws under StrictMode Latest; assigning persists in the caller's session under iex.
- Verify: `grep -rnE --include='*.ps1' -e 'SecurityProtocolType\]::(Tls13|Tls11|Tls|Ssl3)' -e "SecurityProtocol *= *'?(Ssl3|Tls|Tls11)" DIR` (output = violations); behavioural `FX/runall.sh tls.ps1` (5.1 row: legacy `Ssl3, Tls` request RED, guarded form GREEN).
- Watched: yes. G3: RED on `plant/tls.ps1:2-3`, GREEN on `twin/`; `tls.ps1` on 5.1: `legacy Ssl3,Tls (github.com) -> TLS FAILED`, `guarded Set-Tls12Plus from legacy -> [Tls12, Tls13]`, `guarded form (codeload.github.com) -> TLS ok, HTTP 200`. The legacy default is simulated on a .NET 4.8.1 host (labelled in finding 5).

**PS-SEC-07 (MUST)** Document the iex one-liner as `irm <https-url> | iex` or `iwr -UseBasicParsing <https-url> | iex` (both deliver one string/object that iex stringifies), never `(iwr ...).Content | iex`; document flags through environment variables and the `& ([scriptblock]::Create((irm <url>))) -Flag` form.
- Why: `.Content` is `byte[]` for `application/octet-stream`, so iex evaluates numbers and the installer silently does not run; params cannot be bound by iex.
- Verify: `grep -rnE --include='*.ps1' --include='*.md' -e '[.]Content *[|] *(iex|Invoke-Expression)' DIR` (output = violations); behavioural `FX/runall.sh iwr-iex.ps1 -BaseUrl http://127.0.0.1:PORT` against `FX/trunc-server.py`.
- Watched: yes. G8: RED on `plant/content-iex.ps1:3`, GREEN on `twin/`; `iwr-iex.ps1`: `(iwr).Content | iex` printed `39 76 73 78 ...` on 5.1 and 7.6.6 while `iwr | iex` printed `LINE1 ran / LINE2 ran / LINE3 ran`.

**PS-SEC-08 (MUST)** An iex-delivered script (a) tests the PowerShell version in code, never relying on `#Requires`; (b) declares params with defaults only, never `Mandatory`; (c) never uses `$PSScriptRoot`, `$PSCommandPath` or `$MyInvocation.MyCommand.Path` for resources; (d) detects iex with `[string]::IsNullOrEmpty($PSCommandPath)` (never `$null -eq $MyInvocation.MyCommand.Path` once `Set-StrictMode -Version` is in effect); (e) runs its body in `& { ... }` or restores `$ErrorActionPreference`, StrictMode and `SecurityProtocol` in `finally`, and defines no global function named like a common command (`Say`, `Err`, `Warn`, `Main`).
- Why: `#Requires` is a comment to iex; Mandatory is silently empty; `$PSScriptRoot` is empty; the Path formula throws under StrictMode; iex leaks into the caller's scope.
- Verify: `grep -rl --include='*.ps1' -e 'Set-StrictMode -Version' DIR | xargs -r grep -n -H -e 'MyInvocation.MyCommand.Path'` (output = violations of (d)); (a)-(c), (e): `FX/runall.sh iex-semantics.ps1` read against the table in finding 2, and reading heuristic.
- Watched: yes for (d) and the semantics (G6 RED on `plant/strict.ps1:2`, GREEN on `twin/strict.ps1`; `iex-semantics.ps1` probes s1-s5 on 3 engines); (a)-(c), (e) only through those probes, no grep.

**PS-SEC-09 (MUST; amends PS-ERR-05)** In an iex-delivered script no function calls `exit`, and no code uses `break`/`continue` outside a loop as an exit. Functions `throw` or `return` a status; a single guarded exit sits at script top level: `if ($rc -ne 0) { if ($IsIex) { $Global:LASTEXITCODE = $rc; return }; exit $rc }`.
- Why: `exit` kills an interactive host; the scoop `break` idiom survives an interactive host but swallows the failure (step exit 0) in a non-interactive one; the single-exit shape passes both models and `-File`.
- Verify: `FX/ast-sec.ps1 -Dir DIR` (prints `EXIT-IN-FUNCTION` and `BREAK-OUTSIDE-LOOP`; exit 1); behavioural `check-iex-survival.ps1 -Path f -HostModel repl` and `-HostModel ci` (both must exit 0 to pass); PS-ERR-05's grep remains the coarse locator.
- Watched: yes. `served.ps1` repl RED, ci GREEN; `served-twin.ps1` (break) repl GREEN, ci RED; `served-twin-single-exit.ps1` repl and ci GREEN, `-File` exit 3, scriptblock GREEN; all on 5.1, 7.4.7, 7.6.6. AST: `plant/` RED (5 findings), `twin/` GREEN.

**PS-SEC-10 (MUST)** `Invoke-Expression`/`iex` does not appear inside a delivered `.ps1` except in a front door whose payload is hash-verified in memory first and which carries a justified `SuppressMessageAttribute('PSAvoidUsingInvokeExpression', ...)`; prefer `& ([scriptblock]::Create($text)) @args` after the in-memory hash. Run `PSAvoidUsingInvokeExpression` (default Warning) in the gate; never treat a token swap as the fix.
- Why: the rule is a token lint (the scriptblock form has the same power); the security property is the verification and the absence of a second-stage fetch.
- Verify: `Invoke-ScriptAnalyzer -Path . -Recurse -IncludeRule PSAvoidUsingInvokeExpression` (exit via `FX/pssa.ps1`); `grep -rLZ --include='*.ps1' -e 'SuppressMessage.*PSAvoidUsingInvokeExpression' DIR | xargs -r -0 grep -nE -e '^[^#]*(Invoke-Expression|[|;(] *iex( |$))'` (output = unsuppressed iex).
- Watched: yes. PSSA 1.25.0: `plant/iex-fd.ps1:12` and `plant/iex-alias.ps1:2` exit 1 (Warning), `twin/iex-scriptblock.ps1`, `twin/iex-suppressed.ps1`, `twin/content-iex.ps1` exit 0; G4 RED on the plants, GREEN on `twin/`.

**PS-SEC-11 (MUST)** Do not gate an installer on `Get-ExecutionPolicy` and do not print `Set-ExecutionPolicy` advice beyond `-Scope Process`; document `powershell -ExecutionPolicy Bypass -c "irm <url> | iex"` for hosts that block scripts (PS-GATE-07 carries the policy rule).
- Why: iex text is not subject to the policy (measured under Restricted), so the gate refuses users the policy would not stop and recommends a persistent change.
- Verify: `grep -rn --include='*.ps1' -e 'Get-ExecutionPolicy' DIR` (output = violations).
- Watched: yes. G9 RED on `plant/policy-gate.ps1:3`, GREEN on `twin/`; `policy-check.ps1` on 5.1: harmless iex exit 0 under Restricted, gate throws, `-File` refused by policy.

**PS-SEC-12 (MUST; reconciles SH-CI-11 and PS-ENC-03)** In 5.1-capable code write `$GITHUB_PATH`, `$GITHUB_ENV` and `$GITHUB_OUTPUT` with `[System.IO.File]::AppendAllText($env:GITHUB_PATH, "$value`n", (New-Object System.Text.UTF8Encoding $false))`, one writer per file; never mix `>>` with another writer; `Add-Content` only for values proven ASCII.
- Why: measured on 5.1: `Add-Content` corrupts non-ASCII, any `>>` mix corrupts; AppendAllText is GREEN alone and with `Out-File`. A lone `Out-File -Encoding utf8 -Append` (SH-CI-11) is also GREEN, so SH-CI-11 stays valid; this rule makes the writer the PS-ENC-03 one.
- Verify: SH-CI-11's grep pair, run as `grep -rnE --include='*.ps1' -e 'Add-Content[^|]*GITHUB_(PATH|ENV|OUTPUT)' -e 'Set-Content[^|]*GITHUB_(PATH|ENV|OUTPUT)' -e '>>[[:space:]]*[$]env:GITHUB_(PATH|ENV|OUTPUT)' DIR`; behavioural `FX/runall.sh runner-file.ps1`.
- Watched: yes. G10 RED on `plant/runner-addcontent.ps1:1`, GREEN on `twin/runner-append.ps1`; `runner-file.ps1` rows on 5.1 as in finding 11.

**PS-SEC-13 (SHOULD)** If `Expand-Archive` is used on the 5.1 floor, the archive path ends in `.zip` (name the download file accordingly) and `-LiteralPath` is used; prefer `ExtractToDirectory`, which has no extension requirement.
- Why: `Expand-Archive` on 5.1 throws ".bin is not a supported archive file format"; pwsh 7 does not.
- Verify: `FX/runall.sh expand-quirks.ps1` (row 1); reading heuristic for the file name.
- Watched: yes (behavioural, 5.1 row differs from 7.4.7/7.6.6); no grep.

Row decisions (what the brief asked to decide):

| Row | Decision |
|---|---|
| M-U-01 (iex hygiene, where else iex is allowed) | PS-SEC-07, -08, -10; iex only as the documented one-liner and a hash-verified suppressed front door |
| M-U-02 | carried by PS-GATE-07; PS-SEC-11 adds the gate-on-policy rule |
| M-U-03 (TLS 1.2 on 5.1) | PS-SEC-06 (MUST for installers; refines the SHOULD PS-COMPAT-09) |
| M-U-04 (zip-slip, hash first) | PS-SEC-01, -04, -05 |
| M-Q-03 (exit under iex) | PS-SEC-09 amends PS-ERR-05 (formula and `break`) |
| M-P-06 (-UseBasicParsing, ps1 follow-up) | PS-COMPAT-06 stands; fleet: www-setup passes it (`:344,:357`); the generated installer uses `Net.Webclient` (no IWR); the front door uses `Invoke-RestMethod` (needs nothing on 5.1 per PS-COMPAT-06) |
| M-N-02 (ps1 half) | PS-SEC-01, -02, -03 and the verdict in finding 1 |
| M-U-05, M-U-06 | stay parked per the map; Scoop's `Test-LanguageMode` (`install.ps1:117-124`) is the pointer if an adopter asks |

## Verification runs

Fixture root `/home/mherwig/.cache/research-lang/shell-tools/fixtures/ps1-front-door/` (`FX`). `FX/runall.sh <script> [args]` runs a script on pwsh 7.4.7 (docker, `-NoProfile -NonInteractive -File`), pwsh 7.6.6 (`run.sh`) and Windows PowerShell 5.1.26100.9444 (the fixture tree staged under `C:/Users/ecom/shell-wintest/ps1-front-door`, `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File`, removed afterwards), the same flags as `matrix.sh pwsh|win`. Raw outputs: `FX/out/*.out`. "x3" = identical on 5.1, 7.4.7, 7.6.6.

**V1. Host survival, plant (a)** (`check-iex-survival.ps1`, `run-iex.sh`; exit 1 = RED):
```text
$ ./runall.sh check-iex-survival.ps1 -Path served/served.ps1 -HostModel repl
RED [iex/repl] host terminated by the served script (child process exit 3; host marker never printed)   -> exit 1   (x3)
$ ./runall.sh check-iex-survival.ps1 -Path served/served-twin-single-exit.ps1 -HostModel repl
GREEN [iex/repl] host survived (HOST-SURVIVED ... child exit 0)                                         -> exit 0   (x3; child printed HOST-SURVIVED lastexit=3)
$ ... served/served-twin.ps1 -HostModel ci     RED [iex/ci] failure was swallowed or never reached (step exit 0; host marker printed: False)   -> exit 1 (x3)
$ ... served/served-twin-single-exit.ps1 -HostModel ci   GREEN [iex/ci] step failed loudly (step exit 3)  -> exit 0 (x3)
$ ./runall.sh served/served-twin-single-exit.ps1    (non-iex, -File)   -> exit 3 (x3)
$ ... served/served.ps1 -Mode scriptblock -HostModel repl   RED (x3)    $ ... served-twin-single-exit.ps1 -Mode scriptblock   GREEN (x3)
$ ... served/served.ps1 -Mode call -HostModel repl           GREEN (x3)  (download-then-run: exit is contained)
```
**V2. Real fleet defect D2** (`out/www-setup-iex.out`):
```text
$ ./runall.sh check-iex-survival.ps1 -Path served/www-setup-install.ps1 -HostModel repl -EnvVar 'OCX_INSTALL_DIST_URL=http://invalid.example/dist.json'
  err: ocx-install: error: refusing insecure (non-https) URL: http://invalid.example/dist.json
RED [iex/repl] host terminated by the served script (child process exit 3; host marker never printed)   -> exit 1   (x3)
... -HostModel ci   GREEN [iex/ci] step failed loudly (step exit 3)   -> exit 0 (x3)
```
**V3. Zip-slip** (`zipcheck.ps1`, `out/zip.out`, `out/zip-manual.out`):
```text
$ ./runall.sh zipcheck.ps1 -Zip zip-slip.zip -Method Manual
  files OUTSIDE dest: evil-dotdot.txt
RED   Manual-zip-slip : wrote outside the destination   -> exit 1   (x3)         [same for zip-slip-backslash.zip: evil-backslash.txt]
$ ... -Method Safe        extraction raised: Archive contains unsafe entry: ../evil-dotdot.txt     GREEN Safe-zip-slip     -> exit 0 (x3)
$ ... -Method ZipFile     "Extracting Zip entry would have resulted in a file outside the specified destination directory."  GREEN -> exit 0 (x3)
$ ... -Method ExpandArchive   extraction raised: Cannot find path '.../dest/app/readme.txt' because it does not exist.   GREEN -> exit 0 (x3)
$ ... -Zip zip-clean.zip  (Manual, ZipFile, Safe, ExpandArchive)   GREEN -> exit 0 (x3)
$ ONLY=51 ./runall.sh zipcheck.ps1 -Zip zip-slip.zip -Method Tar    extraction raised: tar exit 1    GREEN -> exit 0 (5.1 host only)
```
**V4. Hash before extract** (`hash-order.ps1`, `out/hash.out`):
```text
-Variant nohash        RED   nohash : tampered archive EXTRACTED (content: EVIL-BINARY)        -> exit 1 (x3)
-Variant failopen      warning: No inline checksum in the manifest - skipping verification.
                       RED   failopen : tampered archive EXTRACTED                             -> exit 1 (x3)
-Variant closed        aborted: SHA-256 mismatch for download.zip: expected ee145a85... got 18DFC17D...
                       GREEN closed : aborted before extraction                                -> exit 0 (x3)
-Variant closed-empty  aborted: no expected SHA-256 for this archive: refusing to install (fail closed)
                       GREEN closed-empty : aborted before extraction                          -> exit 0 (x3)
```
**V5. Greps** (`greps.sh`, `out/greps.out`; the verdict is the output, the pipeline status `st` is informational because `xargs` and `grep -L` use their own conventions):
```text
[G1-extract-without-hash] plant: RED  plant/zipslip.ps1 plant/hash.ps1          twin: GREEN empty
[G2-extracttofile-without-fullpath] plant: RED plant/zipslip.ps1                twin: GREEN empty
[G3-tls-literal] plant: RED plant/tls.ps1:2:...Tls12 -bor ...Tls13  plant/tls.ps1:3:...Tls -bor ...Tls11    twin: GREEN empty
[G4-iex-token] plant: RED plant/iex-alias.ps1:2  plant/content-iex.ps1:3  plant/iex-fd.ps1:12              twin: GREEN empty
[G5-claims-without-hash] plant: RED plant/iex-fd.ps1                            twin: GREEN empty
[G6-strict-with-myinvocation-path] plant: RED plant/strict.ps1:2                twin: GREEN empty
[G7-path-not-literalpath] plant: RED plant/lp.ps1:1 plant/lp.ps1:2              twin: GREEN empty
[G8-content-pipe-iex] plant: RED plant/content-iex.ps1:3                        twin: GREEN empty
[G9-policy-gate] plant: RED plant/policy-gate.ps1:3                             twin: GREEN empty
[G10-addcontent-runner-file] plant: RED plant/runner-addcontent.ps1:1           twin: GREEN empty
```
**V6. AST** (`ast-sec.ps1`, pwsh 7.6.6): `plant/` -> `lp.ps1:1 NO-LITERALPATH (Get-FileHash)`, `lp.ps1:2 NO-LITERALPATH (Expand-Archive)`, `served-break.ps1:4 BREAK-OUTSIDE-LOOP`, `served-break.ps1:4 EXIT-IN-FUNCTION`, `served-exit.ps1:3 EXIT-IN-FUNCTION`, `RED (5)` exit 1; `twin/` -> `GREEN` exit 0.

**V7. PSScriptAnalyzer 1.25.0** (`pssa.ps1`, rule `PSAvoidUsingInvokeExpression`, pwsh 7.6.6): `plant/iex-fd.ps1` `iex-fd.ps1:12 [Warning]` exit 1; `plant/iex-alias.ps1:2` exit 1; `twin/iex-scriptblock.ps1`, `twin/iex-suppressed.ps1`, `twin/content-iex.ps1` `GREEN (no findings)` exit 0.

**V8. TLS** (`tls.ps1`, `out/tls.out`), 5.1 row: `default SecurityProtocol=[SystemDefault] value=0`; `simulated legacy default now=[Ssl3, Tls]`; `legacy Ssl3,Tls (github.com) -> TLS FAILED: The request was aborted: Could not create SSL/TLS secure channel.`; `after -bor Tls12 = [Ssl3, Tls, Tls12]`; `legacy -bor Tls12 (api.github.com) -> TLS ok, HTTP 200`; `[SecurityProtocolType]::Tls99 (Strict) -> THREW PropertyNotFoundException` (x3); `guarded Set-Tls12Plus from legacy -> [Tls12, Tls13] value=15360`; 7.x rows: `could not set Ssl3,Tls: ... The requested security protocol is not supported.`, guarded form no-op.

**V9. iex semantics** (`iex-semantics.ps1`, x3; excerpts):
```text
s1-requires via iex   -> S1 body ran            via -File -> ... "#requires" statement for PowerShell 99.0 ... (child exit 1)
s2b-param-mandatory via iex -> S2b Version=     via -File -> Cannot process command because of one or more missing mandatory parameters: Version.
s3-scriptroot via iex -> PSScriptRoot=[] null=False; MyCommand.Path=[] null=True; Join-Path THREW: Cannot bind argument to parameter 'Path' because it is an empty string.
s3c-detect-strict via iex -> IsIex via PSCommandPath = True; MyInvocation.MyCommand.Path THREW under StrictMode: The property 'Path' cannot be found on this object.
s4-leak via iex -> after iex: EAP=Stop Say=True Main=True Version=leaked-var ; strict leak: The variable '$undefinedVar' cannot be retrieved because it has not been set.
s4b-scoped via iex -> after iex: EAP=Continue Say=False Version=[] ; strict leak: none
s5 scriptblock::Create form with -Version 0.5.0 -> S5 Version=0.5.0
```
**V10. Runner file** (`runner-file.ps1`): see the table in finding 11; 5.1 rows `Add-Content ... first=[C:\Users\JU+FFFDrgen\bin] -> RED`, `MIXED >> then AppendAllText ... -> RED`, `MIXED AppendAllText then >> ... lines=4 -> RED`, `Out-File -Encoding utf8 ... head=[ef bb bf ...] -> GREEN`, `[IO.File]::AppendAllText UTF8 no BOM ... -> GREEN`; 7.x all GREEN.

**V11. Policy** (`policy-check.ps1`, 5.1 row): shown in finding 9. **V12. Octet-stream and truncation** (`iwr-iex.ps1`, `trunc-client.ps1`, `irm-type.ps1`): shown in findings 2 and 12 (negative results flagged). **V13. Others**: `filehash.ps1` (default SHA256, UPPERCASE, `-eq` case-insensitive, `SHA3_256` rejected, x3), `filehash-bracket.ps1` (`-Path result is null: True; errors:` x3), `expand-quirks.ps1` (5.1 row: `.bin is not a supported archive file format`; `ZipFile type does NOT resolve without Add-Type`), `getcontent-raw.ps1` (`Get-Content | iex` without `-Raw` throws, `-Raw` prints `multi-line block ran`, x3), `env.ps1` (host facts).

**V14. Fleet and exemplar scan** (`fleet-scan.sh`, `out/fleet-scan.out`; read-only on the repos): results are in the Exemplar evidence section. The one check that did **not** go red as first written: G2 with `-e 'GetFullPath'` was green on `dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.ps1` because the string occurs in a comment at `:989`; tightening to `'GetFullPath('` made it flag the file (`:895-897`) while keeping the plant RED and the twin GREEN. G6 first matched Scoop because the file contains `Set-StrictMode -Off`; it now requires `-Version`.

## Exemplar evidence

SHAs: `www-setup@a251c3631047`, `grimoire@4650ad830375`, `setup-grimoire@1259e35b2550`, `ScoopInstaller/Install@1e2f334083d6`, `denoland/deno_install@41d4676f8677`, `dotnet/install-scripts@e5cf1dd2d154`, `microsoft/vcpkg@e456309491fd`, `axodotdev/cargo-dist@d1055f48071e` (template tag v0.33.0), grimoire release v0.14.3.

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| PS-SEC-01 | `www-setup:src/install.ps1:880` (hash at `:407-420` before extract at `:885`); `setup-grimoire:.github/scripts/install.ps1:53-61` (sidecar hash before `Expand-Archive`) | cargo-dist `installer.ps1.j2:325` / release `grimoire-installer.ps1:317`; Scoop `install.ps1:317`; `deno_install:install.ps1:46-48`; `dotnet-install.ps1:895-897`; `www-setup` `:410-413` fail-open (empty digest) |
| PS-SEC-02 | `www-setup` inline manifest digest from another origin (`:854`, pin `:547-574`) | `setup-grimoire:53-56` same-origin sidecar (weaker; honest only if described as corruption detection) |
| PS-SEC-03 | `www-setup:install.ps1:14-17` header matches the code | `grimoire:docs/public/install.ps1:3-6`, live `setup.grimoire.rs/ps1:3-5`, `installation.md:49-52` (claim without code, ps1 only) |
| PS-SEC-04 | `www-setup:install.ps1:427-467` `Expand-ZipSafely` (rejects rooted, drive, `..`, requires `StartsWith($destRoot + $sep)`) | `dotnet-install.ps1:895-897` hand-rolled `Join-Path` + `ExtractToFile` (G2 hit; pattern match, no exploit built); Scoop and cargo-dist use `Expand-Archive`, contained on the measured builds |
| PS-SEC-05 | none of the audited installers | `www-setup:415`; `setup-grimoire:55,61`; Scoop `:317`; cargo-dist `:325`; `grimoire-installer.ps1:317` |
| PS-SEC-06 | Scoop `Optimize-SecurityProtocol` `:211-226` (SystemDefault left alone, else numeric TLS 1.2 set); vcpkg `bootstrap.ps1:53-55` (helper binary) | `www-setup:337,355` (unconditional literal Tls12+Tls13 under StrictMode Latest); cargo-dist checks `Tls12` presence only (`:643`, `grimoire-installer.ps1:612-613`) and sets nothing |
| PS-SEC-07 | `www-setup:22-25` documents `irm | iex`, env knobs and the `[scriptblock]::Create` flag form | no audited file uses `(iwr).Content | iex` (G8 found none); the pattern is documented as an agent tell |
| PS-SEC-08 | Scoop `Set-StrictMode -Off` `:70` + saved/restored `$ErrorActionPreference`; www-setup `Get-Variable -Name Version -Scope 1` idiom `:742`; cargo-dist param block has defaults only (`:38-43`) | grimoire front door `:10` (EAP leak); www-setup global `Say/Err/Warn/Main` (`:173-188,:728`) and StrictMode Latest at `:63` |
| PS-SEC-09 | Scoop `Exit-Install` `:91-104` + `$IS_EXECUTED_FROM_IEX` `:743` (interactive-safe; swallows in non-CI non-interactive hosts, guarded by `-not $env:CI`) | www-setup `:182,:734`; cargo-dist `:672` / release `:642`, `Exit` `:87`; setup-grimoire `exit 1` (`:23,:58,:65`) is fine because it is `pwsh` step, not iex |
| PS-SEC-10 | none | grimoire front door `install.ps1:12` (`Invoke-Expression (Invoke-RestMethod ...)`) without verification or suppression |
| PS-SEC-11 | no audited installer calls `Set-ExecutionPolicy` (PS-GATE-07 evidence) | cargo-dist gate and advice `grimoire-installer.ps1:599-608`; Scoop checks the policy too (`install.ps1:200-207`) |
| PS-SEC-12 | none uses AppendAllText | `www-setup:721`, `setup-grimoire:70` (`Add-Content`) |
| M-U-05 pointer | Scoop `Test-LanguageMode` `:117-124` | n/a |

## AI-agent angle

What an LLM characteristically gets wrong writing or reviewing `install.ps1`, and the smallest mechanical check:

| Mistake | Why it passes the author's test | Smallest check |
|---|---|---|
| `exit 1` in a helper in a script documented as `irm | iex` | works with `-File`; kills the console only when pasted | `FX/ast-sec.ps1` (`EXIT-IN-FUNCTION`), `check-iex-survival.ps1` repl |
| `$Global:LASTEXITCODE = $c; break` "to be safe" (copied from Scoop) | survives at a prompt | `ast-sec.ps1` (`BREAK-OUTSIDE-LOOP`), `check-iex-survival.ps1 -HostModel ci` |
| `$IsIex = ($null -eq $MyInvocation.MyCommand.Path)` after `Set-StrictMode -Version Latest` | non-strict tests pass | G6 |
| Header says "verifies SHA-256" with no hash call (hallucinated safety) | the comment reads right | G5 |
| Checksum fetched from the same URL base as the archive, called "verification" | looks standard | reading heuristic (PS-SEC-02) |
| `(Invoke-WebRequest $u).Content | iex` | works on text/plain test servers; silent no-op on octet-stream | G8 |
| Hand-rolled zip loop "to avoid Expand-Archive" | clean test archives | G2, `zipcheck.ps1 -Method Manual` |
| `Get-FileHash -Path`, `Expand-Archive -Path` | no brackets in the test path | G7, `ast-sec.ps1` |
| `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12` (or `-bor Tls13`) unconditionally | works on a modern host, leaks to the caller, throws for a missing member under strict mode | G3 |
| `#Requires -Version 5.1` as the only version guard in an iex script | the file-based test refuses correctly | `iex-semantics.ps1` probe s1 |
| `param([Parameter(Mandatory)]...)` in an iex-served installer | `-File` prompts | `iex-semantics.ps1` probe s2b |
| `Join-Path $PSScriptRoot ...` in an iex script | works from a checkout | `iex-semantics.ps1` probe s3 |
| `Set-ExecutionPolicy Bypass -Scope CurrentUser/LocalMachine` "to be sure the script runs" | works | PS-GATE-07 grep; G9 for the gate |
| `-MaximumRetryCount`, `-AsHashtable`, `$IsWindows` on a 5.1 target (carried) | pwsh 7 authoring host | PS-COMPAT rows |
| `Add-Content`/`>>` to `$env:GITHUB_PATH` from `shell: powershell` | ASCII test path | G10 |
| Simulating `irm | iex` locally with `Get-Content f | iex` | fails on multi-line scripts, then the "fix" is to strip functions | use `-Raw` (`getcontent-raw.ps1`) |
| Sh-style reasoning: wrapping the PowerShell installer in a `main` function against truncation | `curl | sh` habit | not needed: `irm` buffers (`trunc-client.ps1`) |

## Contested / evolving

- **TLS: set it or leave it.** Microsoft's .NET guidance (ms.date 2026-06-04) says leave `SystemDefault`; Scoop sets only when not SystemDefault; cargo-dist only checks; www-setup pins unconditionally; vcpkg ships a helper. As of 2026-10-11 the direction is "leave the OS default, guard the legacy case"; the legacy host population (.NET < 4.7) is shrinking but real (Server 2012 R2/2016 images) and unmeasured here.
- **iex versus download-then-run.** `& $file` is subject to the execution policy and gives `exit` a safe scope; `irm | iex` bypasses the policy by design (the docs call the policy defense in depth) and is the documented install idiom of Scoop, cargo-dist and uv-style installers. The trade-off is unresolved; this research keeps iex as the documented entry and moves the hazards into the body (PS-SEC-07..10). A hash-verified front door that runs the second stage as a script block is the hardened middle.
- **Digest provenance.** Same-origin sidecars (setup-grimoire, cargo-dist's own sh) versus separate-origin manifests (www-setup) versus signing. cargo-dist 0.33.0 (2026-09-10) added Azure Artifact Signing for Windows binaries and installers (its CHANGELOG); whether the `.ps1` installer text itself gets a signature is not documented in what was read, and an Authenticode signature on a script delivered by iex is not checked by iex at all. Trend: signing the binaries, not the delivery text.
- **Upstream cargo-dist ps1 checksum** ([#2497](https://github.com/axodotdev/cargo-dist/pull/2497)) is open as of 2026-10-11. If it lands, D1 closes for installs that pin the new version; the front-door text still needs to match the pinned version.
- **Expand-Archive and zip-slip.** www-setup's comment (`:424-426`) says 7.4+ only; not reproduced on 5.1.26100.9444 (it errors, writing nothing). Older .NET Framework builds are the open question; until measured the per-entry check or `ExtractToDirectory` stays the rule (PS-SEC-04).
- **`exit` versus `break` versus `return`.** Scoop's `-not $env:CI` special case and the single-exit shape both work; the shipped consolidation text (PS-ERR-05) names `break`, which is host-model-dependent (finding 3). PS-SEC-09 is the proposed amendment.
- **PSScriptAnalyzer's `AvoidUsingInvokeExpression`** is always-on and unconfigurable (ms.date 2026-07-21); the front door needs a justified suppression, so the gate must allow that one attribute and nothing broader.
- **Windows PowerShell 5.1** is frozen but remains the preinstalled floor (Q2); pwsh 7.4/7.5 reach end of support 2026-11-10 (map correction), which does not change any rule here.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Execution_Policies.md | about_Execution_Policies 7.6 (primary) | ms.date 2026-08-31 | "isn't a security boundary"; non-Windows behaviour |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Core/About/about_Execution_Policies.md | about_Execution_Policies 5.1 (primary) | 5.1 docs | defaults: Restricted for clients, RemoteSigned for servers |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/AvoidUsingInvokeExpression.md | PSAvoidUsingInvokeExpression rule doc (primary) | ms.date 2026-07-21 | severity, "always enabled, not configurable", suppression |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Invoke-Expression.md | Invoke-Expression cmdlet doc (primary) | 7.6 | "evaluated and run in the current scope" |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Get-FileHash.md | Get-FileHash doc (primary) | 7.6 | default SHA256, `-LiteralPath` semantics |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Get-FileHash.md | Get-FileHash doc, 5.1 (primary) | 5.1 | parameter sets on the floor |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Archive/Expand-Archive.md | Expand-Archive doc, 5.1 (primary) | 5.1 | zip-only statement, `-LiteralPath` example for `[v1]` |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Automatic_Variables.md | about_Automatic_Variables (primary) | 7.6 | `$PSScriptRoot`/`$PSCommandPath` populated only for scripts |
| https://raw.githubusercontent.com/dotnet/docs/main/docs/framework/network-programming/tls.md | TLS best practices with .NET Framework (primary) | ms.date 2026-06-04 | do not set SecurityProtocol; use SystemDefault |
| https://raw.githubusercontent.com/dotnet/dotnet-api-docs/main/xml/System.IO.Compression/ZipFile.xml | System.IO.Compression.ZipFile API docs (primary) | current | ExtractToDirectory "outside the directory" exception |
| https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/FileCommandManager.cs | actions/runner source, GITHUB_PATH reader (primary) | main | `File.ReadAllLines(filePath, Encoding.UTF8)` at :138 |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.ps1.j2 | cargo-dist 0.33.0 PowerShell installer template (primary) | 2026-09-10 | no hash code, `Expand-Archive`, `exit 1`, policy gate |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md | cargo-dist changelog (primary) | through 0.33.0, 2026-09-10 | sh checksum verification history; Azure signing |
| https://github.com/axodotdev/cargo-dist/pull/2497 | PR "Verify archive checksums in PowerShell installers" (primary) | opened 2026-09-03, open | the upstream fix, not merged |
| https://github.com/axodotdev/cargo-dist/issues/2397 | Issue "Support for checksum verification for installer.ps1" (primary) | opened 2026-05-17, open | confirms the gap |
| https://github.com/grimoire-rs/grimoire/releases/download/v0.14.3/grimoire-installer.ps1 | the shipped generated installer (primary, artifact) | released 2026-09-28 | direct evidence for the verdict |
| https://github.com/grimoire-rs/grimoire/releases/download/v0.14.3/sha256.sum | release digest file (primary, artifact) | 2026-09-28 | 843 B, archives only |
| https://setup.grimoire.rs/ps1 and https://grimoire.rs/install.ps1 | live front doors | fetched 2026-10-11 | the claim as users see it |
| https://github.com/ScoopInstaller/Install/blob/1e2f334083d6/install.ps1 | Scoop installer (exemplar) | SHA 1e2f334083d6 | Exit-Install, Optimize-SecurityProtocol, Test-LanguageMode |
| https://github.com/denoland/deno_install/blob/41d4676f8677/install.ps1 | deno installer (exemplar) | SHA 41d4676f8677 | `curl.exe` + `tar.exe`, no hash |
| https://github.com/dotnet/install-scripts/blob/e5cf1dd2d154/src/dotnet-install.ps1 | dotnet-install.ps1 (exemplar) | SHA e5cf1dd2d154 | hand-rolled ExtractToFile loop |
| https://github.com/microsoft/vcpkg/blob/e456309491fd/scripts/bootstrap.ps1 | vcpkg bootstrap (exemplar) | SHA e456309491fd | helper binary for TLS 1.2 |
| `www-setup@a251c3631047:src/install.ps1`, `setup-grimoire@1259e35b2550:.github/scripts/install.ps1`, `grimoire@4650ad830375:docs/public/install.ps1` | fleet installers (local, read-only) | 2026-10-11 | the files under test |
| `FX/out/*.out` and the fixture scripts | the measurements of this round | 2026-10-11 | reproduce every claim |
| https://github.com/PowerShell/PSScriptAnalyzer | PSScriptAnalyzer 1.25.0 (tool run) | 2026-03 | rule behaviour measured |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Invoke-RestMethod.md | Invoke-RestMethod doc (primary) | 7.6 | response-type handling context |
| Local consolidations `shell-pwsh.md`, `shell-ci.md`, `shell-audit/installers.md`, `shell-topic-map.md` | prior art in this program | 2026-10-10/11 | rule IDs and audit evidence this round builds on |
