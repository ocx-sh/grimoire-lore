---
title: Can a cargo-dist installer print a custom final line
program: product
topic: ux-cli-interaction
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# Can a cargo-dist installer print a custom final line

## Answer

No. cargo-dist 0.33.0 can replace one line, not the last one. The setting `install-success-msg` swaps the text of the "everything's installed!" line. In both generated installers (shell and powershell) that line prints before the PATH-activation block. With default PATH handling the block prints last, so the custom text is never the final line. UX-CLI-14 therefore needs the wrapper (`docs/public/install.sh:35`, `sh "$tmp" "$@"`) to print the last line. The setting is still worth setting as a second layer for people who run the generated installer directly.

All work below ran in `~/.cache/research-lang/exemplars/product/wave2/q2` (scratch). Nothing in any repository was changed; the grimoire files were fetched with `curl` to scratch.

## Evidence

### 1. grim's dist config and wrapper (fetched, not recalled)

Source: `https://raw.githubusercontent.com/grimoire-rs/grimoire/main/` (vendor repository, fetched 2026-11-27).

```
curl -sLf --proto '=https' https://raw.githubusercontent.com/grimoire-rs/grimoire/main/dist-workspace.toml -o dist-workspace.toml
grep -n "cargo-dist-version\|^installers\|install-success" dist-workspace.toml
5:cargo-dist-version = "0.33.0"
9:installers = ["shell", "powershell"]
```

No `install-success-msg` line (the grep prints no third match). The wrapper:

```
curl -sLf --proto '=https' https://raw.githubusercontent.com/grimoire-rs/grimoire/main/docs/public/install.sh -o install.sh
wc -l install.sh
35 install.sh
grep -n '^set -eu\|^sh "\$tmp"' install.sh
14:set -eu
35:sh "$tmp" "$@"
```

The wrapper honours `GRIMOIRE_INSTALL_DIR` only by forwarding the environment to the generated installer (header comment, lines 11 to 13).

### 2. The setting and the changelog (primary text)

Config reference ([dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html), page undated, fetched 2026-11-27), extracted with `curl -sL ... -o cfg.html` and a text strip around `id="install-success-msg"`:

> install-success-msg since 0.15.0 ... default = "everything's installed!" ... The message to display on success in the shell and powershell installers.

Search of the page for other output hooks:

```
grep -o -i 'id="[a-z-]*"' cfg.html | grep -i "hook\|post\|script\|custom"
id="github-custom-job-permissions"
id="github-custom-runners"
id="custom-ci-jobs"
id="post-announce-jobs"
id="packagedescription"
```

These are CI-job settings, not installer-output settings. The whole changelog was searched, not only 0.15.0 ([CHANGELOG.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md), 2430 lines, newest entry 0.34.0 dated 2026-11-01):

```
curl -sL https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md -o cl.md
grep -n -i "success-msg\|post-install\|install-success\|installer output\|final message\|success message" cl.md
927:## Custom installer output
929:When a shell or powershell installer runs successfully it will print out "everything's installed!", but if you want a different message ... you can now do that with [the `install-success-msg` setting]...
931:* [docs](.../config.html#install-success-msg)
awk 'NR<=927 && /^# Version /{h=$0} END{print h}' cl.md
# Version 0.15.0 (2024-05-31)
grep -n -i "hook\|post-install\|postinstall\|after install" cl.md | head
1445:### New hooks for custom jobs in CI
1447:... custom jobs ... [phases of the build process]
1546:The installer now updates additional shell configuration files ...
1812:... experimental new system for user-defined hooks, allowing you to write custom publish jobs ...
```

The only "hook" entries are CI custom jobs. No installer post-install hook exists in the changelog through 0.34.0 (2026-11-01). Related 0.33.0 (2026-09-10) entry: "Shell installers now place `env` helper alongside receipts for flat installs" (line 33), so the path of the `env` script depends on the layout and dist version.

### 3. dist 0.33.0 honours the setting in both installers (measured)

I downloaded the dist 0.33.0 release binary, built a minimal scratch crate with grim's installer settings plus `install-success-msg`, and generated the installers.

```
curl -sLf -o d.tgz https://github.com/axodotdev/cargo-dist/releases/download/v0.33.0/cargo-dist-x86_64-unknown-linux-gnu.tar.xz
tar xf d.tgz && dist --version
cargo-dist 0.33.0
# mini/dist-workspace.toml: cargo-dist-version "0.33.0", installers ["shell","powershell"],
#   targets [x86_64-unknown-linux-gnu, x86_64-pc-windows-msvc], hosting github,
#   install-success-msg = "next: grim init", allow-dirty = ["ci"], source-tarball = false
dist build --artifacts=global --tag v0.17.0
...  mini/target/distrib/grim-installer.sh  mini/target/distrib/grim-installer.ps1
grep -n "next: grim init\|everything's installed" grim-installer.sh grim-installer.ps1
grim-installer.ps1:510:  Write-Information "next: grim init"
grim-installer.sh:719:    say "next: grim init"
```

So 0.33.0 does apply the setting (no "everything's installed" left). The Windows installer, order of lines 506 to 518:

```
510:  Write-Information "next: grim init"
511:  if (-not $NoModifyPath) {
513:    if (Add-Path $dest_dir) {
514:        Write-Information ""
515:        Write-Information "To add $dest_dir to your PATH, either restart your shell or run:"
517:        Write-Information "    set Path=$dest_dir;%Path%   (cmd)"
518:        Write-Information "    `$env:Path = `"$dest_dir;`$env:Path`"   (powershell)"
```

The custom message prints first and the PATH instructions follow, the same shape as the shell installer. I could not run the powershell installer here (no Windows run), so its runtime output is read from the generated source, not executed.

### 4. Order in grim's published 0.17.0 shell installer

```
curl -sLf --proto '=https' -o grim-installer.sh https://github.com/grimoire-rs/grimoire/releases/latest/download/grimoire-installer.sh
grep -n "everything's installed\|add_install_dir_to_path \|To add \$_install\|source \$_\|warn \"The following" grim-installer.sh | awk -F: '$1>940 && $1<1030'
966:    say "everything's installed!"
995:        add_install_dir_to_path "$_install_dir_expr" "$_env_script_path" "$_env_script_path_expr" ".profile" "sh"
999:        add_install_dir_to_path ... ".zshrc .zshenv" "sh"
1004:        add_install_dir_to_path ... ".config/fish/conf.d/$APP_NAME.env.fish" "fish"
1018:        warn "The following commands are shadowed by other commands in your PATH:$_shadowed_bins"
```

and `sed -n 960,1016p` shows the block at lines 1008 to 1014 (`say "To add $_install_dir_expr to your PATH, either restart your shell or run:"`, then the two `source` lines), printed only `if [ "${exit1:-0}" = 1 ] || ... ` and only inside `if [ "0" = "$NO_MODIFY_PATH" ]`. Order: success say (966), PATH edits (995 to 1004), PATH block (1008 to 1014), shadow warn (1018).

### 5. Runs of the real installer, default and custom (both with a temporary HOME)

The custom copy is made with an exact `sed`, so it can be reproduced:

```
sed 's/say "everything.s installed!"/say "next: grim init"/' grim-installer.sh > grim-custom.sh
diff grim-installer.sh grim-custom.sh
966c966
<     say "everything's installed!"
---
>     say "next: grim init"
for f in grim-installer.sh grim-custom.sh; do
  H=$(mktemp -d); HOME=$H SHELL=/bin/bash PATH=/usr/bin:/bin sh $f 2>&1 | tail -8
done
```

Output, default copy:

```
installing to $H/.cargo/bin
  grim
everything's installed!

To add $HOME/.cargo/bin to your PATH, either restart your shell or run:

    source $HOME/.cargo/env (sh, bash, zsh)
    source $HOME/.cargo/env.fish (fish)
```

Output, custom copy:

```
installing to $H/.cargo/bin
  grim
next: grim init

To add $HOME/.cargo/bin to your PATH, either restart your shell or run:

    source $HOME/.cargo/env (sh, bash, zsh)
    source $HOME/.cargo/env.fish (fish)
```

Last non-blank line (`... 2>&1 | grep -v '^$' | tail -1`), both copies: `    source $HOME/.cargo/env.fish (fish)`. With `--no-modify-path` on the custom copy (`sh grim-custom.sh --no-modify-path 2>&1 | grep -v '^$' | tail -2`): `  grim` then `next: grim init`, so the custom line is last only when the user opts out of PATH changes.

### 6. The wrapper can add the last line (measured)

I appended one `printf` to a scratch copy of the wrapper and ran it end to end (it downloads the real 0.17.0 installer):

```
{ cat install.sh; echo 'printf "next: %s/bin/grim init\n" "${GRIMOIRE_INSTALL_DIR:-$HOME/.cargo}"'; } > wrap.sh
HOME=$H SHELL=/bin/bash PATH=/usr/bin:/bin sh wrap.sh 2>&1 | grep -v '^$' | tail -2
    source $HOME/.cargo/env.fish (fish)
next: $H/.cargo/bin/grim init
HOME=$H PATH=/usr/bin:/bin GRIMOIRE_INSTALL_DIR=$H/c sh wrap.sh 2>&1 | grep -v '^$' | tail -2
    source $HOME/c/env.fish (fish)
next: $H/c/bin/grim init
$H/c/bin/grim --version
grim 0.17.0
```

The wrapper line is last in both cases, and it is correct for a custom `GRIMOIRE_INSTALL_DIR` because it is built from that variable. The absolute binary path works in a piped `sh`, which cannot activate PATH in the user's shell. A line that sources the env helper is fragile: with a custom install dir the helper is at `$H/c/env` (found with `find $H -name 'env*'`: `$H/c/env`, `$H/c/env.fish`), not in `bin/`, and dist 0.33.0 moved the helper for flat installs (changelog line 33). Print the absolute binary path instead.

## Effect on the ruleset

- **UX-CLI-14: change (add one sentence to the rule, one step to the verification).** Append to the rule: "For a cargo-dist installer, `install-success-msg` is not enough, because the generated script prints its PATH block after that message; the last line is printed by a wrapper script or a post-install step the project owns, and it names the headline command by absolute path (built from the install-dir variable), not by a PATH lookup or a sourced helper." Add to the verification as step (1b): "Run the documented install command once with the installer's default PATH handling (not `--no-modify-path`) under a temporary `HOME`: `HOME=$(mktemp -d) PATH=/usr/bin:/bin sh -c '<documented command>' 2>&1 | grep -v '^$' | tail -1`. The printed line must be the headline-command line and the command in it must run: execute it. Repeat with the install-dir variable set to a second temporary directory; the printed path must follow it." A project that sets only `install-success-msg` fails this step, as measured in section 5.
- **Applied table, UX-CLI-14, grim row: change.** Replace "only the 35-line wrapper can add a line after it delegates" with: "the generated installer cannot end on a custom line: `install-success-msg` (cargo-dist 0.15.0 and later) replaces the success line, which prints before the PATH block in both the shell (line 966 of the 0.17.0 installer) and powershell (line 510 of a 0.33.0-generated installer) installers. The wrapper must print the line after `sh "$tmp" "$@"` at `docs/public/install.sh:35`, as `${GRIMOIRE_INSTALL_DIR:-$HOME/.cargo}/bin/grim init`." Verification for this row: `tail -2 docs/public/install.sh` shows a `printf` after the `sh "$tmp" "$@"` line, and the section 6 run prints `next: <dir>/bin/grim init` as its last non-blank line for the default dir and for `GRIMOIRE_INSTALL_DIR=<tmp>`.
- **Open question 5: answered.** Remove from the list.
- **CR-3 (installer-script) / SH-INST last-line row: confirm, with an addition.** Add to the row: "A cargo-dist-generated installer cannot end on a custom line, because its PATH block prints after the success message; the project's wrapper or post-install step prints the last line." Verification: run the installer under a temporary `HOME` with default PATH handling and assert the last non-blank line of combined output is the project's line (`... 2>&1 | grep -v '^$' | tail -1`); on a cargo-dist installer that sets only `install-success-msg` the command prints a `source $HOME/.cargo/env...` line and the row fails.
- **NEW rule, UX-CLI-31 (SHOULD).** Imperative: "A project that ships a cargo-dist installer sets `install-success-msg` to its headline-command line, so the generated script's success line is useful when the installer is run directly." Rationale: the setting is the only supported installer-output hook (config reference; no other in the changelog through 0.34.0) and costs one config line; it does not satisfy UX-CLI-14 alone. Verification: `grep -n 'install-success-msg' dist-workspace.toml dist.toml` has a hit, and after `dist build --artifacts=global`, `grep -c "everything's installed" target/distrib/*-installer.sh target/distrib/*-installer.ps1` prints `0` for each file (measured: the setting is applied in both, section 3). Severity SHOULD, because UX-CLI-14 is the gate. The owner decides the message text with the headline command (see "What an agent must ask a human").

## Dated facts

| Fact | Source | Date |
|---|---|---|
| `install-success-msg` exists since 0.15.0, default "everything's installed!", shell and powershell installers | [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html) | page undated, fetched 2026-11-27 |
| 0.15.0 introduced it ("Custom installer output") | [CHANGELOG.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md) line 927 | 2024-05-31 |
| No installer post-install hook in the changelog through 0.34.0; "hooks" there are CI custom jobs | same file, `grep` in section 2 | 0.34.0 dated 2026-11-01, fetched 2026-11-27 |
| dist 0.33.0 applies the setting in both generated installers; message prints before the PATH block in the powershell one | measured with the dist 0.33.0 binary | 2026-11-27 |
| grim `dist-workspace.toml`: cargo-dist-version 0.33.0, installers shell + powershell, no `install-success-msg`; wrapper is 35 lines | [grimoire-rs/grimoire](https://github.com/grimoire-rs/grimoire) main (vendor repository) | fetched 2026-11-27 |
| grim installer 0.17.0: success line 966, PATH block after the PATH edits, shadow warn after that | `grimoire-installer.sh` from the latest GitHub release (vendor-generated) | measured 2026-11-27 |
| 0.33.0 moved the `env` helper alongside receipts for flat installs | CHANGELOG.md line 33 | 0.33.0 dated 2026-09-10 |

## What could not be determined

- The Windows installer was read from generated source and its line order is shown, but I did not execute it (no Windows run here). Missing: `grimoire-installer.ps1` run on Windows (or via the host `cmd.exe`) with default PATH handling, to confirm the last printed line there.
- The generation used a minimal scratch crate with grim's installer settings, not the full grimoire repository, because its `external/docker_credential` submodule is absent in a depth-1 clone. The generator is the same 0.33.0 binary and the setting is installer-level, so the finding should hold, but the full repository was not generated.
- I did not run the cargo-dist-generated installer with the setting set against a real release archive (the scratch crate has none); the runs in section 5 use grim's published installer with an exact `sed` of the one line the setting changes, and section 3 shows the generated line is the one the `sed` targets.
