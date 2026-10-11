# shell-integration

A procedure for code that writes shell code for several shells or edits their startup files. That includes a tool `init` command, a PATH or prompt hook, an rc or profile block, a generated completion script and a cmd.exe Batch line.

```sh
grim add ghcr.io/ocx-sh/lore/shell-integration
```

Run it when someone asks to generate shell code from Rust, Go or Python, add a `PROMPT_COMMAND` or `precmd` hook, edit `.bashrc` or a PowerShell profile, install completions, quote a value for fish, nu, elvish or pwsh, or when completions are installed and nothing happens. It cites `shell-quality` rule IDs and expects that rule installed for the scripts it names.

## What it does

It builds or audits one quoter per target and refuses values a target cannot carry. It proves the quoters with a 36-case hostile round trip, picks the right rc file and edits it byte-safe, keeps hooks append-safe, proves completion registration by reading it back, and ships an undo. A harness kit runs on the oldest and newest interpreter of each family.

## What agents get wrong by default

Ranked by how often the mistake appeared across surveyed emitters. One shared `shlex.quote` helper is used for every shell, which scores 32 of 35 on fish and 29 on nushell. PowerShell quoting doubles `'` and stops, so the Unicode smart quotes run as code. An rc file gets `echo >>` with no marker. A hook is registered by clobber or naive append. Each has one mechanical check in the skill.

## Siblings

`shell-port` for scripts that quote for themselves, `shell-diagnose` for a failing script, `installer-script` for curl-to-sh installers. Part of `shell-essentials`.
