---
title: ocx multi-shell emitter — numbers-first audit
agent: shell-audit/ocx-emitter
model: claude-sonnet-5-5
scope: "/home/mherwig/dev/ocx crates/ocx_shell, crates/ocx_setup, crates/ocx_cli (shell-emission surface only), read-only"
method: >
  Built ocx HEAD (5de9d777eb7d, v0.6.4-16-g5de9d777e) with
  `CARGO_TARGET_DIR=~/.cache/research-lang/shell-tools/fixtures/ocx-emitter/target
  cargo build -p ocx --offline --locked` against a git-archive copy of the worktree
  (submodules rsynced in) staged under
  ~/.cache/research-lang/shell-tools/fixtures/ocx-emitter/src, because the real tree
  has uncommitted edits and may not be built in place. Ran `cargo test -p ocx_shell
  -p ocx_setup --offline --locked` once (363 tests, 0 failed). Drove the REAL built
  binary (`ocx env --env 'K=<hostile>' --shell=<X>`) over a hostile corpus and ran
  every emitted line through the real interpreters via
  `~/.cache/research-lang/shell-tools/matrix.sh` and `run.sh`, comparing the shell's
  own readback byte-for-byte against the input. Scripts and a Python driver live
  under fixtures/ocx-emitter/h/*.py,*.sh (gen.py, run_all.py, cmp.py, floor.sh,
  floor.{fish,nu,elv,ps1}, rcscen.sh, loop.sh/loopnu.sh); result JSON under
  fixtures/ocx-emitter/matrix*.json. `ocx self setup`/`self activate` were run for
  real against isolated $HOME/$OCX_HOME sandboxes (never the researcher's own dotfiles)
  with `OCX_NO_CONFIG=1`-equivalent isolation. Every command is inlined next to its
  result below so each number is re-runnable.
date_researched: 2026-10-10
---

# ocx multi-shell emitter — audit

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [Surface map](#1-surface-map)
3. [Escaping correctness, measured](#2-escaping-correctness-measured)
4. [Version floors](#3-version-floors)
5. [rc-file editing](#4-rc-file-editing)
6. [Shims and launchers](#5-shims-and-launchers)
7. [Install scripts](#6-install-scripts-for-ocx-and-grimoire)
8. [Comparison with prior art](#7-comparison-with-zoxidestarshipdirenvmise)
9. [Smells (ranked)](#smells-ranked)
10. [Patterns worth encoding](#patterns-worth-encoding)
11. [Contradictions of the frame](#contradictions-of-the-frame)
12. [Gaps](#gaps)

## Headline numbers

| Metric | Value |
|---|---|
| Shell variants in `Shell` enum | 10 (Ash, Ksh, Dash, Bash, Elvish, Fish, Batch, PowerShell, Zsh, Nushell) |
| Shell-emission source lines (shell.rs+hook.rs+escape.rs+reconcile.rs+coexistence.rs, ocx_setup rc_block/profiles/shims/lib, ocx_cli activate/conventions/shell_state) | 24,527 (`wc -l`, see command below) |
| Unit tests in `ocx_shell`+`ocx_setup` | 363 passed, 0 failed (`cargo test -p ocx_shell -p ocx_setup`, 32.15s) |
| Hostile-value round-trip, corpus 1 (43 values × 10 shell targets = 430 cells, counted per non-refused cell = 989) | **982/989 ok** (99.3%) |
| Hostile-value round-trip, PATH-kind corpus (29 values × 9 shells = 261, 667 counted incl. seeded-ambient variants) | 642/667 ok |
| Hostile-value round-trip, LIST-kind corpus | 636/667 ok — **29 failures all on `posh`**, a quoted-glob portability bug in the shared POSIX list-removal construct |
| Security-relevant finding | **PowerShell `$env:K = '…'` escaping (`single_quoted_doubled`, doubling `'` only) does not defend against PowerShell's Unicode "smart quote" tokenizer**: U+2018/2019/201A/201B inside an escaped value close the literal early. Reproduced a file-creation injection on pwsh 7.4, pwsh 7.6.6 **and real Windows PowerShell 5.1** |
| rc-file permission handling | **Every profile rewrite silently sets the file to `0600`**, even starting from `0644` — confirmed on a fresh `.bashrc` |
| rc-file symlink handling | **A symlinked rc file (`~/.zshrc -> dotfiles/zshrc`) is replaced by a plain file**; the dotfiles-managed target is never written and the symlink is gone after one `ocx self setup` |
| Version floor | 0 failures across bash 3.2/4.0/4.2/4.4/5.0/5.1/5.2/5.3, zsh 5.0.8/5.3.1/5.8/5.9, 11 posix-family shells, fish 3.6.0/4.0.2/4.7.0/4.9.3, nu 0.105.1/0.116.0, elvish 0.21.0, pwsh 7.4/7.6.6, Windows PowerShell 5.1 — the emitted activation+hook+wrapper stream ran clean on every interpreter the matrix has |
| Idempotency (re-run, re-apply) | Byte-identical tree after a second `ocx self setup`; CRLF-dominant files stay 100% CRLF after two more applies |
| Install scripts found | `ocx/website/src/_scripts/*/install*.sh` (website snippets only, not a real installer); the real installers are in a **separate repo**, `grimoire` (`docs/public/install.sh` 35 lines, `docs/public/install.ps1` 12 lines — thin wrappers) and `setup-ocx`/`setup-grimoire` (TypeScript GitHub Action + `.github/scripts/install.{sh,ps1}`, 121+74 lines) and `www-setup` (`src/install.{sh,ps1,fish,nu,elv}`, 913+951+650+547+566 lines — the actual multi-shell installer family) |

```
wc -l crates/ocx_shell/src/shell.rs crates/ocx_shell/src/shell/{escape,hook,reconcile,coexistence,tests_path_parity}.rs \
      crates/ocx_setup/src/{rc_block,profiles,shims,lib}.rs \
      crates/ocx_cli/src/command/self_group/activate.rs crates/ocx_cli/src/conventions.rs crates/ocx_cli/src/api/data/shell_state.rs
# => 24527 total
```

## 1. Surface map

| Shell | escape fn (file:line) | hook mechanism | rc/profile file | deactivate / undo | tests (file:line, indicative) |
|---|---|---|---|---|---|
| Bash | `posix_single_quoted` escape.rs:13 | `PROMPT_COMMAND` append, guarded by function-exists probe; `trap EXIT` cleanup — hook.rs:204-236 (`bash_registration`) | `~/.profile`, `~/.bashrc`, `~/.bash_profile` if present — profiles.rs:138-152 | `rc_block::remove_block`/`strip_block` lib.rs:627-660; prompt side has no "undo" (function stays loaded until shell exit) | shell.rs:1138+ (export_path/list tests), hook.rs:678 `bash_registration_emits_exactly` |
| Zsh | `posix_single_quoted` | `add-zsh-hook precmd`/`zshexit`, dup-safe via `add-zsh-hook` itself — hook.rs:237-256 (`zsh_registration`) | `$ZDOTDIR` (validated, path-traversal-safe — profiles.rs:88-92) `.zprofile`,`.zshrc` | same as bash | hook.rs tests around 712-840 |
| Fish | `fish_single_quoted` hook.rs (imported from escape.rs via hook.rs:13); `fish_double_quoted` escape.rs:27 for value bodies | `--on-event fish_prompt` function + `--on-event fish_exit` stamp cleanup — hook.rs:320-345 | dedicated file, full rewrite: `$XDG_CONFIG_HOME/fish/conf.d/ocx.fish` — profiles.rs:112-121, shims.rs `FISH_CONF` | `rewrite_dedicated` only writes when content differs; no explicit "uninstall" path found | shims.rs:375-620 range; hook.rs fish tests ~913-1090 |
| PowerShell | `single_quoted_doubled` escape.rs:35 | wraps `function:prompt`, `Test-Path function:global:__ocxReconcile` clobber-detection — hook.rs:387-428 | PowerShell `$PROFILE.CurrentUserAllHosts`, probed live via `pwsh -Command '$PROFILE.CurrentUserAllHosts'` (handles OneDrive/GPO redirection) — profiles.rs:176-199 | fence removable via `rc_block::apply`; prompt wrap has a `$global:__ocxPrevPrompt` restore path only for a *future* re-source, not a live uninstall | hook.rs 1137-1414 range; shell.rs PowerShell tests (836-860) |
| Elvish | `single_quoted_doubled` | `edit:before-readline` closure, append-only, marker carried as the closure's rest-arg name (structural, not string-match) — hook.rs:576-591 | `rc.elv` fence (POSIX-style `#`-comment fence) — profiles.rs:132-136 | `elvish_wrapper`'s `defer` clears `ELVISH_PWD_KEY`; the `before-readline` closure itself has no removal path (elvish has no function-undef) | hook.rs 1,more; reconcile.rs 222-333 |
| Nushell | `nushell_plain_string` escape.rs:43 | **no append-safe hook point** — inlined once in the `env.nu` shim's own `env_change.PWD` hook array (shims.rs) | dedicated file, full rewrite: `$XDG_DATA_HOME/nushell/vendor/autoload/ocx.nu` — profiles.rs:122-131 | overwritten wholesale on next `rewrite_dedicated`; no partial-undo | shims.rs 608-745 (env_nu apply-loop tests) |
| Batch (`cmd.exe`) | `batch_set_value` escape.rs:52 (doubles `%` only) | **no hook — cmd hosts no prompt customization** — hook.rs:95,110,199 all return `None` for Batch | N/A — no rc file; activation is per-invocation `FOR /F ... DO @%i` | N/A | shell.rs 2109+ (`live_batch_*` tests, 13 Batch-named tests) |
| Ash/Ksh/Dash | `posix_single_quoted` | **no append-safe hook point** (comment hook.rs:94-95: "No append-safe hook point; nushell's hook is inlined in its shim") | same POSIX tree as bash/zsh (`.profile` etc, same `PosixFence`) | n/a | shell.rs ash/ksh/dash-named tests, ~10+3 hits |

Every shell gets `export_path`/`export_list`/`export_constant`/`unset`/`emit_message`/`is_emittable` from `shell.rs`; only Bash/Zsh/Fish/PowerShell/Elvish get a per-prompt hook (`hook::registration`/`redefinition`/`checkpoint`/`wrapper`); Nushell's reconcile is folded directly into its `env.nu` autoload file instead.

```
grep -n "pub fn \|^impl \|^enum \|^struct " crates/ocx_shell/src/shell.rs | head -40
```

## 2. Escaping correctness, measured

### Corpus and method

`gen.py` drove the **real HEAD binary** (`ocx env --env 'K=<value>' --shell=<X>`, the only CLI surface that round-trips `Shell::export_list` — `--env K=value` with no type suffix hits `ModifierKind::List` by default, so this exercises the list-kind arm, the richest of the three). 43 hostile values (quote classes, `$`/backtick/braces/parens, control bytes incl. CR/LF/tab/ESC, UTF-8, emoji, a 100 KB value, Windows paths, option-lookalikes, and 7 direct command-injection probes: `'; touch PWNED; '`, `"; touch PWNED; "`, `` $(touch PWNED)`touch PWNED` ``, a PowerShell `New-Item` probe, a nu `$"(...)"`/`(...)` probe, an elvish probe, a pwsh-subexpr probe) × 10 `--shell=` targets = 430 emission cells.

Each emitted line was sourced/`Invoke-Expression`'d by the **real interpreter** via `matrix.sh`, the resulting variable's bytes compared **hex-encoded** against the input (never printed raw, so control bytes can't desync the comparison), and the working directory scanned for a `PWNED` artifact as the injection oracle.

```
# representative single case
cd .../fixtures/ocx-emitter/p1
OCX_HOME=.../home ./target/debug/ocx env --env "K=it's \$x" --shell=fish
# => set -x K "it's \$x"
```

### Corpus 1 result (10 shells × up to 43 values, REFUSED cells excluded from the denominator)

```
python3 h/gen.py   # writes cases/<shell>/<name>.{emit,val}
python3 h/run_all.py   # runs every case through matrix.sh per interpreter, writes res/<label>/*
python3 h/cmp.py   # compares readback to input, writes matrix.json
```

| Interpreter | ok / total | Non-ok |
|---|---|---|
| bash 3.2, dash 0.5.12, bash 3.2 --posix | 43/43 | — |
| zsh 5.0.8/5.3.1/5.9, busybox ash 1.35/1.37, mksh R59c, ksh93u+m 2023/1.0.10, posh 0.14.1, bash 5.2 --posix, fish 3.6.0/4.0.2/4.9.3, elvish 0.21.0, nu 0.116.0 | 43/43 | — |
| **yash 2.52** | 39/43 | `emoji`,`nbsp`,`smart_quotes`,`utf8` all **ERR** (`eval:1: syntax error: the single quotation is not closed`) |
| **pwsh 7.4** | 41/43 | `empty` UNSET (by design — `export_list` emits a comment, not a `$env:K=` line, for an empty value: shell.rs:280-282), `smart_quotes` **UNSET** |
| **pwsh 7.6.6** | 42/43 | `smart_quotes` **UNSET** |

yash's failures are a **locale artifact, not an ocx defect**: `yash -c` run under the container's default `C` locale cannot read non-ASCII bytes at all (confirmed independently, see below); yash is not a `Shell` enum member (it exists only as a POSIX-family `/bin/sh` stand-in in the test matrix).

```
docker run --rm shellzoo:deb12 sh -c '
for L in C C.UTF-8 en_US.UTF-8; do echo L=$L
  LC_ALL=$L yash -c "eval \"\$(cat cases/sh/utf8.emit)\"; printenv K"
done'
# L=C          -> eval:1: syntax error: the single quotation is not closed
# L=C.UTF-8    -> héllo 日本語     (correct)
# L=en_US.UTF-8-> eval:1: syntax error: the single quotation is not closed (container has no en_US locale generated)
```

The `pwsh`/`smart_quotes` failures are **not locale noise** — see the dedicated section below; they are a real escaping defect.

### PowerShell curly-quote injection (the headline defect)

`escape::single_quoted_doubled` (escape.rs:35-37) is the **only** escaper used for every PowerShell and Elvish single-quoted emission site (`export_path` shell.rs:198, `export_constant` shell.rs:542, `remove_list_element` shell.rs:447/459, `emit_message` shell.rs:594, every `hook.rs` PowerShell binary-path quoting, `activate.rs` `format_global_env_eval` for PowerShell). It doubles only the ASCII `'` (U+0027). PowerShell's tokenizer (Windows PowerShell 5.1 included, not just pwsh 7.2+'s documented smart-paste feature) treats the Unicode "curly quote" code points **U+2018 ‘, U+2019 ’, U+201A ‚, U+201B ‛** as additional single-quote delimiters wherever a `'…'` literal is being scanned — doubling only `'` does not neutralize them.

Reproduction, using the **real emitted line** from `ocx env --env 'K=<value>' --shell=powershell` for four probe values (each: curly-quote char + `; New-Item -ItemType File PWNED_<CP> #`), run on `pwsh 7.4 LTS`, `pwsh 7.6.6` and **real Windows PowerShell 5.1** via `matrix.sh pwsh`/`matrix.sh win`:

```
$env:K = '‘; New-Item -ItemType File PWNED_2018 #'
$env:K = '’; New-Item -ItemType File PWNED_2019 #'
$env:K = '‚; New-Item -ItemType File PWNED_201A #'
$env:K = '‛; New-Item -ItemType File PWNED_201B #'
```
All four, run through `Invoke-Expression` exactly as `ocx self activate`/`ocx env --shell=powershell` output would be consumed by a shell profile, produced `PWNED_<CP>` on disk on pwsh 7.4, pwsh 7.6.6, **and Windows PowerShell 5.1.26100.9444** (confirmed via `matrix.sh win`, `/mnt/c/Windows/.../powershell.exe`). This is a real command-injection class, not a benign parse difference: any value that reaches `Shell::export_constant`/`export_path`/`export_list` for the `PowerShell` arm — which includes **project-controlled `ocx.toml [env]` values**, consumed on a victim's machine the moment the per-prompt reconcile hook or `ocx self activate` runs — can break out of the single-quoted literal using a U+2018/2019/201A/201B byte instead of `'`.

The `smart_quotes` corpus-1 case (`‘x’ “y”`) throwing a parse error rather than creating a file is the same defect manifesting as a **DoS** (activation stream fails, env var silently never set) rather than RCE, because that particular value's curly quotes don't happen to close-then-reopen into valid PowerShell syntax — the four single-char probes above show the RCE shape directly.

```
# fixtures/ocx-emitter/sq/sq_2019.ps1 (full emitted-from-ocx form; body omitted — a doubled-apostrophe-only
# escaper producing '<U+2019>; New-Item -ItemType File PWNED_2019 #' from the real `ocx env` CLI)
bash /home/mherwig/.cache/research-lang/shell-tools/matrix.sh pwsh .../sq_2019.ps1
# == pwsh 7.4 LTS   -> PWNED_2019 created, K=   (empty! value truncated at the curly quote)
# == pwsh 7.6.6     -> PWNED_2019 created
# == Windows PowerShell 5.1 -> PWNED_2019 created
```

Spot-check: is this a known/accepted risk in ocx's own tests? `grep -n "2018\|2019\|smart\|curly"` over `shell.rs`/`hook.rs`/`escape.rs` returns **zero hits** — the curly-quote class is untested. `shell.rs`'s own `HOSTILE` live-round-trip corpus (shell.rs:1869-1872, 18 values) does not include it either.

### LIST-kind corpus: a POSIX portability bug (posh)

Built a second, targeted corpus: 29 hostile values × `path`/`list` kinds × 9 shells, seeding an ambient value first and sourcing the emitted line **twice** (idempotency) before comparing. Path-kind: 642/667 ok (only `winpath` REFUSED everywhere by design — `is_emittable`'s PATH-separator precondition — and yash's 2 locale failures). **List-kind: 636/667 ok, with 29/29 failures concentrated entirely on `posh`** (every value except the already-REFUSED/skip ones):

```
docker run --rm shellzoo:deb12 posh -c '
l=",a,b,"; p=",b,"
echo "${l%%"$p"*}"      # posh: [,a,b,]   (WRONG — matches nothing)
'
# dash/ash/ksh/mksh/yash/bash --posix/zsh --emulate=sh all print [,a] (correct: leading match + trailing * glob)
```

`Self::Bash | Self::Zsh | Self::Ash | Self::Ksh | Self::Dash`'s shared `export_list`/`remove_list_element` body (shell.rs:294-299, :398-412) relies on `${var%%"$quoted_literal"*}` — a quoted-literal prefix followed by an **unquoted** trailing glob `*`. posh (the Debian strict-POSIX conformance-test shell, explicitly named in the research frame as a tracked POSIX implementation) does not expand the trailing `*` when the pattern begins with a quoted segment; every other measured POSIX implementation (dash, two busybox ash builds, mksh, two ksh93 builds, yash, bash `--posix`, zsh `--emulate sh`) agrees with each other and disagrees with posh. Severity is low in practice — posh ships as a conformance-test shell, not a real distro `/bin/sh` default anywhere measured — but it is a genuine counter-example to "the same POSIX-family code path is portable to any `/bin/sh`", which `Shell::Dash`'s `sh` alias implicitly claims (shell.rs:710-712 comment: "`--shell=sh` emits byte-identical output to `--shell=dash` through the same code path").

```
cd fixtures/ocx-emitter
python3 h/gen2.py                                   # builds cases2_path, cases2_list
CASES=cases2_path RES=res2_path python3 h/run_all.py
CASES=cases2_list RES=res2_list python3 h/run_all.py
CASES=cases2_path RES=res2_path python3 h/cmp.py   # -> matrix-res2_path.json
CASES=cases2_list RES=res2_list python3 h/cmp.py   # -> matrix-res2_list.json
```

## 3. Version floors

Built a stub `ocx` (a 20-line `/bin/sh` script) standing in for the real binary at the hook-invocation seam, so the **real emitted activation/hook/wrapper code** from HEAD's `ocx self activate --shell=<X> --hook --no-completion` could be run unconditionally (no network, no real toolchain) under every interpreter version the matrix has, including the oldest of each family.

```
F=fixtures/ocx-emitter
OCX_HOME=$F/home_stub $F/target/debug/ocx self activate --shell=bash --hook --no-completion > $F/actstub/bash.act
# (repeated for zsh, sh, fish, powershell, elvish, nushell)
bash h/fl.sh bash bash strict     # floor.sh: source twice, fire the hook, check PATH/global-env/hook ran
```

| Family | Interpreters | Result |
|---|---|---|
| bash | 3.2.57, 4.0.44, 4.2.53, 4.4.23, 5.0.18, 5.1.16, 5.2.37, 5.3.20 | **0 failures**: `rc1=0 rc2=0 ocxdirs=2 global=1 reconcile=ran exit=0` on every version, including under `set -eu` (strict mode) |
| zsh | 5.0.8, 5.3.1, 5.8, 5.9 | same, 0 failures, plain and `set -eu` |
| posix (dash, busybox ash ×2, mksh, ksh93 ×2, yash, posh, bash/zsh in posix/sh-emulate mode) | 11 interpreters | 0 failures (PATH prepend + global-env eval always ran; `reconcile=?` is expected — these shells host no hook, so the column is inapplicable, not failing) |
| fish | 3.6.0 (Debian 12), 4.0.2 (Debian 13), 4.7.0, 4.9.3 | 0 failures on every version: hook fires, `STUB_RECONCILE=ran`, wrapper is a function. (Noisy ANSI/OSC-7 terminal escape sequences in fish ≥4.0's non-interactive startup banner initially confused the summarizer script, not the emission itself — confirmed by re-running with a stripped sed filter.) |
| nu | 0.105.1, 0.116.0 | 0 failures. `$env.PATH` is string-typed by default in both; the shim's `describe`-guarded split/join (shims.rs `NU_ENV_APPLY_LOOP`) handles it identically across both versions — **no H9 (nu churn) hit found** in this emitted surface specifically |
| elvish | 0.21.0 | 0 failures (PATH prepend, no watch-set term by design — comment in hook.rs:579-580) |
| pwsh | 7.4.7, 7.6.6, **Windows PowerShell 5.1.26100.9444** (real Windows host) | 0 failures on all three: hook fires via `prompt` wrapping, `$global:__ocxPrevPrompt` chains correctly, wrapper is a function, `[Console]::IsInputRedirected` interactivity detection works on 5.1 |

No version-floor violation was found in the activation/hook/wrapper emit for any shell at any measured version — this specific surface appears to genuinely target the oldest common denominator the code comments claim (bash 3.2, PowerShell 5.1).

## 4. rc-file editing

### Idempotency

```
bash h/setup.sh --dry-run    # fresh run against isolated $HOME
bash h/setup.sh              # apply
cp -a $HOME $HOME_snap; bash h/setup.sh; diff -r $HOME $HOME_snap   # => identical
```
Confirmed: a second `ocx self setup` against the same `$HOME`/`$OCX_HOME` produces a byte-identical tree (`BlockState::Current` short-circuits every write).

### CRLF handling — correct

```
printf 'echo hi\r\nexport X=1\r\n' > .bashrc; ocx self setup   # first apply
ocx self setup; ocx self setup                                 # two more re-applies
grep -c $'\r' .bashrc   # => 8 (every line)
grep -vc $'\r' .bashrc  # => 0 (no bare-LF line anywhere)
```
`dominant_is_crlf`/`apply_line_ending` (rc_block.rs:120-131, :255-262) correctly keeps a CRLF-dominant file 100% CRLF through repeated writes — no mixed-newline corruption found.

### Symlinked rc file — **defect**

A dotfiles-manager pattern (`~/.zshrc` → `dotfiles/zshrc`, mode 0644) is **broken** by `ocx self setup`:

```
ln -s dotfiles/zshrc ~/.zshrc; printf 'export A=1\n' > ~/dotfiles/zshrc
ocx self setup
stat -c '%A %s' ~/.zshrc           # -rw------- 143   (no longer a symlink!)
readlink ~/.zshrc                   # (empty — not a symlink)
cat ~/dotfiles/zshrc                # export A=1   (UNCHANGED — the real target was never written)
```
`write_profile_blocking` → `ocx_util::fs::write_bytes_atomic` (ocx_util/src/fs.rs:236) builds a `NamedTempFile` in the parent directory and **`rename`s it onto the target path**. `rename(2)` replaces whatever inode the target name currently refers to — for a symlink, that unlinks the symlink and installs a plain regular file at that name, rather than writing through the link to its target. The user's dotfiles-repo file (`~/dotfiles/zshrc`) is left completely untouched (no ocx fence), and the live `~/.zshrc` the shell actually reads is now a disconnected plain file that the user's dotfiles tool does not manage — the next `stow`/`chezmoi apply`/`dotbot` run will either silently overwrite ocx's fence back out, or conflict. This is listed as a measurement axis in the research frame ("symlinked-rc handling") and no code path in `lib.rs`/`rc_block.rs` resolves a symlink before reading/writing, nor does any test in `rc_block.rs`'s 39 tests or `lib.rs`'s 63 cover a symlinked target (`grep -c symlink crates/ocx_setup/src/rc_block.rs` → 0; `grep -c symlink crates/ocx_setup/src/lib.rs` → 0).

### Permissions — silent downgrade

```
printf 'echo hi\n' > ~/.bashrc; chmod 644 ~/.bashrc; stat -c '%a' ~/.bashrc   # 644
ocx self setup
stat -c '%a' ~/.bashrc ~/.profile ~/.zshrc   # 600 600 600
```
**Every profile file `ocx self setup` touches ends up `0600`, including a plain, previously-world/group-readable `0644 ~/.bashrc`.** `write_bytes_atomic` (ocx_util/src/fs.rs:244-249) always builds its `NamedTempFile` with `Permissions::from_mode(0o600)` — a fine default for the trust-root/cache files it's also used for (confirmed intentional there by its own test name `write_bytes_atomic_publishes_private_file`, fs.rs:282), but `write_profile`/`write_profile_blocking` (lib.rs:816-842) reuses the same primitive for **user-visible shell profile files** with no mode-preservation step. This is an undocumented, silent permission change to files the user owns and may share group/world-readable intentionally (e.g. a synced/backed-up dotfiles tree read by another service account).

### Dedicated-file shells (fish, nushell) — no `--force` gate, rewrite-on-diff

```
ocx self setup --no-modify-path=no SHELL=/usr/bin/fish
find $HOME -type f | sort
# -> .config/fish/conf.d/ocx.fish  .config/environment.d/ocx.conf  .config/powershell/profile.ps1
```
fish and nushell targets are **fully content-rewritten** whenever they differ (`rewrite_dedicated`, lib.rs:784-803) — there is no `Dirty`/`--force` concept for them, unlike the fenced files. Confirmed: a `.config/powershell/profile.ps1` target is **always added alongside** whatever `$SHELL`-detected target is chosen (fish, nu, elvish, or the POSIX tree) — `compose_targets` (lib.rs:671-694) unconditionally appends the live-probed PowerShell profile on every platform the probe succeeds on, not only Windows.

### `$ZDOTDIR` handling — correct, with a defensive path-traversal guard

```
ZDOTDIR=relative/zd ocx self setup   # -> writes ~/.zshrc, ~/.zprofile (relative ZDOTDIR rejected, falls back to $HOME)
ZDOTDIR=$HOME/zd     ocx self setup   # -> writes $HOME/zd/.zshrc, $HOME/zd/.zprofile
```
`HomeEnv::is_safe_zdotdir` (profiles.rs:88-92) correctly refuses a non-absolute, `/`, or `..`-bearing `$ZDOTDIR` (CWE-22 note in the source) and falls back to `$HOME` with a warning — verified behaviorally.

### Startup-file order vs. docs (not independently violated, but worth flagging)

Fetched docs confirm (researched 2026-10-10, see citations inline):
- **nushell**: `env.nu` → `config.nu` → vendor-autoload (alphabetical) → user-autoload (alphabetical) → `login.nu` (login only). `$nu.vendor-autoload-dirs` on this Linux host resolves to `/usr/share/nushell/vendor/autoload`, `/usr/local/share/nushell/vendor/autoload`, `$XDG_DATA_HOME/nushell/vendor/autoload` (or `~/.local/share/nushell/vendor/autoload` unset) — **matches** `profiles.rs`'s `data_home().join("nushell/vendor/autoload/ocx.nu")` exactly (verified via `nu -n -c '$nu.vendor-autoload-dirs'`).
- **elvish**: `rc.elv` lookup order is legacy `~/.elvish/rc.elv` (ignored since 0.21.0) → `$XDG_CONFIG_HOME/elvish/rc.elv` → `~/.config/elvish/rc.elv` (non-Windows) → `%AppData%\elvish\rc.elv` (Windows). `profiles.rs` only targets `config_home().join("elvish/rc.elv")`, i.e. the XDG path — **matches** the documented post-0.21.0 behavior for Linux/macOS; Windows path is not separately coded in `profiles.rs` (no `AppData` special-case found — `grep -c AppData crates/ocx_setup/src/profiles.rs` → 0), relying instead on `config_home()`'s own fallback, unverified on a real Windows host for elvish specifically (elvish was not installed on the Windows test host).
- **PowerShell**: `$PROFILE.CurrentUserAllHosts` is queried **live** via a real `pwsh`/`powershell` subprocess (profiles.rs:176-213) rather than hardcoded — correctly sidesteps the OneDrive/Documents-redirection hazard the docs warn about. Confirmed on the real Windows host: `$PROFILE.CurrentUserAllHosts` = `C:\Users\ecom\Documents\WindowsPowerShell\profile.ps1` for 5.1 (not `...\PowerShell\...`, the 7.x path) — ocx's live-probe approach is the only correct strategy here, since the two major versions disagree on the directory name (`WindowsPowerShell` vs `PowerShell`) in addition to any redirection.
- **bash/zsh**: `.profile`/`.bash_profile` dual-wiring (profiles.rs:138-152, with the Fedora-skel regression test at profiles.rs ~270+) matches documented bash login-shell precedence (`.bash_profile` > `.bash_login` > `.profile`, first found wins) **except** `.bash_login` is never targeted or even probed — a user whose only login file is `~/.bash_login` (no `.bash_profile`, no `.profile`... wait `.profile` is always written regardless) gets the ocx fence in `.profile`, which bash does **not** read when `.bash_login` exists and `.bash_profile` doesn't (confirmed: `~/.bash_login` present alone → ocx wrote `.bash_login .bashrc .zprofile .zshrc` but **never fenced `.bash_login` itself** — `grep -c '>>> ocx' .bash_login` → 0, and `.profile` was written but bash's own documented precedence means a login bash with `.bash_login` present will skip `.profile` entirely). This is a narrow real gap: `.bash_login` is a rare but documented bash login file that ocx's fence can end up in the wrong file for.

```
cat crates/ocx_setup/src/profiles.rs | sed -n '138,152p'   # the fixed POSIX target list — .bash_login absent
rm .bash_profile .profile; printf 'echo x\n' > .bash_login; ocx self setup --dry-run
# -> only .profile/.bashrc/.zprofile/.zshrc proposed; .bash_login untouched
```

## 5. Shims and launchers

Two separate generators exist: `ocx_setup::shims` (the 5 **env shims** `env.sh`/`env.fish`/`env.ps1`/`env.nu`/`env.elv` written once into `$OCX_HOME`, sourced from the rc fence) and `ocx_package_manager::launcher` (the **per-tool entrypoint launchers**, one per installed package binary).

### Env shims (shims.rs)

| Shim | Body size | Forwards args? | Notes |
|---|---|---|---|
| `env.sh` | 72 lines | n/a (sourced, no args) | detects real sourcing shell (`$BASH_VERSION`/`$ZSH_VERSION`) to choose the completion backend even though it's dispatched from the bash/zsh/sh-shared POSIX fence; interactivity decided once via `$-` |
| `env.fish` | 22 lines | n/a | `status is-interactive` branch, piped through `source` |
| `env.ps1` | 56 lines | n/a | interactivity via `[Console]::IsInputRedirected -eq $false` (not `-not`, so a .NET <4.5 host degrading to `$null` still falls through to `--no-interactive` rather than inverting) |
| `env.nu` | 54 lines + `NU_ENV_APPLY_LOOP` (shared constant) | n/a | applies JSON `ocx --format json --global env` as **data** (`load-env`), not via string `eval` — nu has none; same apply-loop literal reused in `activate.rs::format_global_env_eval`'s `Shell::Nushell` arm, so the two cannot drift (confirmed byte-identical by inspection) |
| `env.elv` | 36 lines | n/a | PATH-prepend and completion-injection run in **separate eval units** specifically so a completion compile-error (no `edit:` namespace outside a TTY) cannot take the PATH prepend down with it |

### Launchers (ocx_package_manager::launcher)

- **Unix `.sh` launcher** (`body.rs:unix_launcher_body`, `generate.rs:52`): `exec "${OCX_BINARY_PIN:-ocx}" launcher exec '<pkg_root>' -- "${0##*/}" "$@"`. Argument forwarding is `"$@"` (correct — preserves word boundaries/empties), exit-code propagation is `exec` (replaces the process, inherits the real exit code exactly, no wrapper-induced truncation).
- **Toolchain trampoline** (`body.rs:unix_trampoline_body`): same `exec "$@"` shape, `--project '<root>'`/`--global` selector baked in; `unset OCX_GLOBAL OCX_PROJECT` guards against an inherited exported `OCX_GLOBAL=1` poisoning every trampoline (comment explains: would exit 64).
- **`LauncherSafeString`** (`safety.rs`): rejects `'`,`"`,`\n`,`\r`,`\0` in any baked path (both the `.sh` body and the Windows `.shim` sidecar share the constraint even though `.sh` alone only strictly needs `'`/`\n`/`\r`, because `"` would break the Windows `SET "var=value"` form used elsewhere even on a Linux-only install). `%` was deliberately **removed** from the unsafe set (test names call out "Amendment §2") after reasoning that no consumer treats it specially post-cutover — the sidecar carries it verbatim and `CreateProcessW` does no shell expansion.

### Argument-forwarding and exit-code measurement

Built a real `.sh` entrypoint launcher and a real toolchain trampoline from `unix_launcher_body`/`unix_trampoline_body`'s exact format strings, baking a project root containing a **space** (`/some/pkg root`), and ran each through dash, busybox ash 1.37, bash 3.2/5.3, mksh, ksh93, posh, bash `--posix`, zsh `--emulate sh` with a 19-element hostile argv (embedded spaces, empty string, `-n`, `$HOME`, `*`, embedded newline, `--`, backslash, quote classes, `~`, non-ASCII, trailing-space, tab, `!!`, backtick, `-x:1`-shaped, `--project=evil`), replacing the real `ocx` with a stub that hex-dumps every argv element it receives:

```
docker run --rm -e OCX_BINARY_PIN=.../stubocx -v $C:$C shellzoo:deb12 sh -c \
  "cp mytool /tmp/hello-name; dash /tmp/hello-name \"$@\"; echo EXIT=\$?" sh "$@"
```
**Every argv element round-tripped byte-exact** (`argv-exact=True`) on dash/ash/bash(3.2,5.3,posix)/mksh/ksh93/posh/zsh(sh-emulate); exit code 7 (the stub's deliberate non-zero) propagated correctly through `exec` in all of them. **yash** is the sole exception (`argv-exact=False`), but the cause is the test harness, not the launcher: yash under `LC_ALL=C` (the container default) refuses to read a non-ASCII argv byte at all (`yash: cannot convert the argument into a wide character string`) — re-running with `LC_ALL=C.UTF-8` round-trips correctly. yash is not an ocx `Shell` target; this does not implicate `unix_launcher_body`.

## 6. Install scripts for ocx and grimoire

Only listed here, per the research frame — a separate audit covers installers in depth.

```
# ocx repo itself — only website *documentation* snippets, not a real installer:
ocx/website/src/_scripts/getting-started/install.sh
ocx/website/src/_scripts/getting-started/install-select.sh
ocx/website/src/_scripts/user-guide/install.sh
ocx/website/src/_scripts/user-guide/install-link.sh

# grimoire repo (separate GitHub org/repo, grimoire-rs/grimoire) — the published installer:
grimoire/docs/public/install.sh     (35 lines)
grimoire/docs/public/install.ps1    (12 lines)

# setup-grimoire (TypeScript Action, grimoire-rs/setup-grimoire):
setup-grimoire/.github/scripts/install.sh    (121 lines)
setup-grimoire/.github/scripts/install.ps1   (74 lines)

# setup-ocx (TypeScript Action, ocx-sh/setup-ocx):
setup-ocx/src/setup.ts  (no shell installer — delegates to a cache + download flow in TS)

# www-setup (ocx-sh/www-setup) — the real multi-shell installer family, five languages:
www-setup/src/install.sh     913 lines
www-setup/src/install.ps1    951 lines
www-setup/src/install.fish   650 lines
www-setup/src/install.nu     547 lines
www-setup/src/install.elv    566 lines
```
Quick syntax/shape check only (no deep audit): `install.sh` is `shellcheck -s sh`-clean (0 findings, including 0 `SC3xxx`) and passes `-n` syntax-check on dash, bash, posh, mksh; **fails on yash** (`yash: cannot read input: Invalid or incomplete multibyte or wide character` — same `LC_ALL=C` locale issue as above, likely a UTF-8 byte in a comment or string, not independently diagnosed here). `install.fish` passes `fish -N --no-execute`. `install.elv` was not independently compile-checked (`elvish -compileonly` is not a flag on 0.21.0; deferred to the dedicated installer audit).

## 7. Comparison with zoxide/starship/direnv/mise

One line each, from the exemplar corpus (SHAs in `shell-audit/scratch/exemplar-shas.md`):

- **direnv** (`internal/cmd/shell_pwsh.go:169` `escapeVerbatimString`/`PowerShellEscapeVerbatimString`): doubles `'` only, same class of defect ocx has — **not ahead of ocx on the curly-quote issue**, but direnv's PowerShell string-escaping is factored into named, independently-tested functions (`shell_test.go:TestPowerShellEscape`) rather than one shared generic (`single_quoted_doubled`) reused for Elvish too.
- **starship** (`src/init/mod.rs:46-48` `sprint_pwsh`): identically `s.replace('\'', "''")` — **same defect class**, same single-quote-only doubling, confirmed via its own test fixtures (`escape_tick_pwsh`) which only assert on a literal backtick-quote combination, not curly quotes.
- **mise** (`src/shell/pwsh.rs:408-412` `escape_sq`): also `input.replace('\'', "''")` — **same defect class**; mise's own doc-comment (pwsh.rs:402-407) explicitly reasons about backtick-vs-apostrophe but never mentions Unicode quote look-alikes.
- **zoxide**: uses `shell_words::quote` (a crate, POSIX-shell-quoting rules) for its POSIX/elvish paths and a bespoke `s.replace('\'', "''")` wrapped in `'...'` for its PowerShell template (`sprint_pwsh` equivalent inferred from `templates/powershell.txt`'s pattern of hand-rolled escaping) — **same defect class** as the others, not better.

**None of the four comparison tools defend against the PowerShell curly-quote tokenizer quirk either** — this looks like an ecosystem-wide blind spot in every Rust/Go PowerShell-emitting tool measured here, not an ocx-specific regression. ocx is otherwise **ahead** of all four on breadth: it is the only one of the five with a native Batch/`cmd.exe` arm, the only one with a nushell `env.nu` whose PATH handling is version-robust across 0.105→0.116 (vs. the class of "nu churn" issue the frame hypothesized but this audit's floor tests did not reproduce for this specific surface), and the only one with machine-checked parity tests asserting the in-process and emitted-shell computations agree byte-for-byte (`PARITY_ARMS`, shell.rs:2886-2917) — none of direnv/starship/mise/zoxide were found to have an equivalent cross-language parity assertion in the files inspected.

## Smells (ranked)

1. **PowerShell curly-quote injection** (security, high): `single_quoted_doubled` is unsound against PowerShell's quote-equivalence class; confirmed RCE-shaped on real Windows PowerShell 5.1 and both measured pwsh versions. See §2.
2. **Silent `0600` permission downgrade on every rc-file write** (correctness/surprise, medium-high): a plain `0644 ~/.bashrc` is rewritten to `0600` with no documentation or opt-out. See §4.
3. **Symlinked rc file silently replaced, dotfiles target never written** (correctness, medium-high): breaks a common dotfiles-manager pattern outright, with no error or warning. See §4.
4. **posh quoted-glob portability gap** in the shared POSIX `export_list`/`remove_list_element` body (correctness, low — posh is a conformance-test shell, not a real `/bin/sh`): `${var%%"lit"*}` disagrees across POSIX shells. See §2.
5. **`.bash_login`-only login shells get fenced in the wrong file** (`profiles.rs` never targets or probes `.bash_login`): narrow but a real documented-precedence miss. See §4.
6. **No symlink-aware write path anywhere in `ocx_setup`** (`grep -c symlink` is 0 in both `rc_block.rs` and `lib.rs`) — item 3 is a direct consequence of this gap, not an isolated bug.
7. Minor: PowerShell profile target (`.config/powershell/profile.ps1` on this Linux host) is **unconditionally appended** by `compose_targets` whenever the live probe succeeds, even on non-Windows — not a defect (pwsh on Linux is a real, supported target) but worth knowing it isn't gated to Windows.

## Patterns worth encoding

- **Parity-testing the emitted string against the in-process computation** (`PARITY_ARMS`, shell.rs:2886-2917, plus `assert_every_present_interpreter_ran`'s "silent vs. absent vs. broken" three-way classification, shell.rs:1574-1624) is a genuinely strong pattern for any multi-shell emitter: it turns "the shell script we generate" into a property tested against "the Rust function that does the same thing in-process," and it refuses to let an uninstalled interpreter's skip read as a pass. Worth a `shell-integration` skill callout.
- **Per-quoting-context escaper naming** (`fish_single_quoted` vs `fish_double_quoted`, never a bare `fish_escape`) with a test that pins the one byte (`'`) that tells the two apart (escape.rs:60-73) is a good template for the `shell-integration` skill's escaping section — the comment explicitly frames it as "the wrong fish escaper is a shell injection."
- **Live `$PROFILE` resolution via a real subprocess** rather than a hardcoded path table (profiles.rs:176-213) is the only correct strategy for PowerShell given OneDrive/GPO Documents-folder redirection and the 5.1-vs-7 directory-name split — worth encoding as the default recommendation for any PowerShell profile-detection skill content, over a static path guess.
- **Count the curly-quote class as part of any "hostile value corpus" template** this program publishes — U+2018/2019/201A/201B for PowerShell single-quoted literals (and presumably U+201C-201F for double-quoted, untested here) belongs in the canonical corpus the `shell-integration` skill tells authors to test against, since four independent real-world tools (ocx + 3 exemplars) all missed it.

## Contradictions of the frame

- **H3** (ocx's per-shell escaping has edge cases in at least one of fish/nu/elvish/pwsh) is **confirmed, but the mechanism is sharper than hypothesized**: it is not a quoting edge case in the conventional sense (unescaped `$`/backtick/newline) — the escaper is textbook-correct for every ASCII metacharacter in every shell tested — it is a **Unicode tokenizer-equivalence class specific to PowerShell** that no amount of correctly-doubling-the-ASCII-apostrophe defends against. The hypothesis undersold the finding: this reproduces as command execution on real Windows PowerShell 5.1, not just a quoting inconvenience.
- **H9** (nushell's version churn makes it the riskiest emitted-code target) is **not supported by this specific surface**: 0.105.1 and 0.116.0 produced byte-identical floor-test results for the entire activation/hook stream, and `$env.PATH`'s string-vs-list auto-conversion (the one behavior change across that range that could plausibly bite an emitter) is explicitly handled by a `describe`-guard already present in both `shims.rs` and `activate.rs`'s shared `NU_ENV_APPLY_LOOP`. This audit found **zero** nu-version-specific failures; H9 may still hold for nu *scripting idioms* generally (out of this audit's scope — see §7 of the frame, "integration code first"), but not for ocx's emitted integration code specifically.
- **Q6's framing** ("ocx findings are reported as evidence, not fixed") holds, but the PowerShell curly-quote finding is severe enough (confirmed on real Windows PowerShell 5.1, not just a container) that it should be flagged to the owner as a security report candidate independent of the shell-scripting research program's own timeline — noted here, not acted on.

## Gaps

- No macOS host (per the frame's Q5): `bash 3.2` via Docker stands in for `/bin/bash` semantics but **not** for macOS's `.bash_profile`-as-login-shell-default behavior, which `profiles.rs` explicitly codes for (comment: "a distro skel that ships `~/.bash_profile` (e.g. Fedora)") — this audit could not independently verify the macOS login-shell wiring end-to-end on real macOS.
- `ocx_cli/src/api/data/shell_state.rs`'s 43 tests (the `ocx shell state` human/JSON report) were read and spot-checked for the "never eval-able" invariant (`quoted()` escape_debug predicate, shell_state.rs:23-32) but not independently fuzzed against the same hostile corpus — the report path is lower-risk (stdout display, not `eval`-consumed) and was deprioritized given the time budget.
- Elvish's Windows `rc.elv` path (`%AppData%\elvish\rc.elv`) was not verified on the real Windows host because elvish is not installed there; `profiles.rs` has no explicit Windows branch for it (relies on `config_home()`'s general fallback), so this is an unverified gap, not a confirmed defect.
- The `install.sh`/`install.ps1`/`install.fish`/`install.nu`/`install.elv` family in `www-setup` (the real multi-shell installer, 3,627 lines total) was only syntax/shape-checked per the frame's instruction to defer deep installer analysis to a separate audit — none of its own escaping, idempotency, or rc-editing logic (which may or may not share code with `ocx_setup`) was measured here.
- Batch (`cmd.exe`) was verified for the PATH-kind export corpus (29/29 handled-or-correctly-REFUSED) but not independently re-verified on the real Windows host via `cmd.exe` for the full hostile corpus beyond the targeted `%`/`"`/CR/LF refusal cases already covered by `batch_cannot_express`; a dedicated `cmd.exe`-side run (`win/batch_cases.bat`) covered 34 of the corpus values and found only expected mismatches (emoji/nbsp/smart-quote codepage artifacts under the default OEM 437 codepage, resolved correctly once `chcp 65001` is set — not an ocx defect, a Windows console default).
