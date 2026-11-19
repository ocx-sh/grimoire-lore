---
name: powershell-quality-reference
description: Depth files and checks scripts behind the powershell-quality rule, loaded on demand. Use when the powershell-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the powershell-quality rule
  keywords: powershell,pwsh,windows-powershell,ps1,psm1,psd1,psscriptanalyzer,pester,installer,irm-iex,encoding,native-commands,reference
  claude.user-invocable: "false"
---

# powershell-quality-reference

Depth for the `powershell-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [compat.md](compat.md) | Windows PowerShell 5.1 versus 7.x syntax and cmdlets, `#Requires`, `.psd1` manifests |
| [encoding.md](encoding.md) | File encodings, BOMs, non-ASCII text, `GITHUB_ENV` and `GITHUB_PATH` appends |
| [errors.md](errors.md) | `$ErrorActionPreference`, native exit codes, `try/catch`, CI step status |
| [gates.md](gates.md) | PSScriptAnalyzer, the 5.1 parse gate, gate wrapper, Pester tests (SH-TEST-18 to 22) |
| [native.md](native.md) | Calling native executables: argument arrays, splatting, `curl.exe`, `Start-Process` |
| [security.md](security.md) | `install.ps1` and `irm \| iex`: hashes, signatures, TLS, `Invoke-Expression` |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/powershell-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/powershell-quality-reference/checks` when installed globally).
