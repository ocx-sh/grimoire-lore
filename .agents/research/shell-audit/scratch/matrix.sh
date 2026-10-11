#!/usr/bin/env bash
# matrix.sh <shell-family> <script-file> [args...]
# Runs one script under every interpreter of a family, prints "== <interp>" then
# its stdout+stderr and "-> exit N". Script must live under $HOME/.cache/research-lang.
# Families: posix (dash, busybox ash x2, mksh, ksh93 x2, yash, posh, bash --posix, zsh --emulate sh)
#           bash (3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3)   zsh (5.0.8 5.3.1 5.8 5.9)
#           fish (3.6.0 4.0.2 4.7.0 4.9.3)   nu (0.105.1 0.116.0)   elvish (0.21.0)
#           pwsh (7.4 LTS, 7.6.6, Windows PowerShell 5.1)   win (Git Bash, Windows PowerShell 5.1)
set -u
T="$(cd "$(dirname "$0")" && pwd)"
fam=$1; f=$(readlink -f "$2"); shift 2
d=$(dirname "$f"); C=/home/mherwig/.cache/research-lang
dk() { local img=$1; shift; docker run --rm -i -v "$C:$C" -w "$d" "$img" "$@"; }
run() { local name=$1; shift; echo "== $name"; "$@" 2>&1; echo "-> exit $?"; }
win_stage() { local w=/mnt/c/Users/ecom/shell-wintest; mkdir -p "$w"; cp "$f" "$w/"; echo "$w/$(basename "$f")"; }
case $fam in
  posix)
    run "dash 0.5.12 (deb12)"     dk shellzoo:deb12 dash "$f" "$@"
    run "busybox ash 1.35 (deb12)" dk shellzoo:deb12 busybox ash "$f" "$@"
    run "busybox ash 1.37 (alpine 3.22)" dk alpine:3.22 sh "$f" "$@"
    run "mksh R59c"               dk shellzoo:deb12 mksh "$f" "$@"
    run "ksh93u+m 2023 (deb12)"   dk shellzoo:deb12 ksh "$f" "$@"
    run "ksh93u+m 1.0.10 (deb13)" dk shellzoo:deb13 ksh "$f" "$@"
    run "yash 2.52"               dk shellzoo:deb12 yash "$f" "$@"
    run "posh 0.14.1"             dk shellzoo:deb12 posh "$f" "$@"
    run "bash 3.2 --posix"        dk bash:3.2 bash --posix "$f" "$@"
    run "bash 5.2 --posix"        dk shellzoo:deb12 bash --posix "$f" "$@"
    run "zsh 5.9 emulate sh"      dk shellzoo:deb12 zsh --emulate sh "$f" "$@" ;;
  bash) for v in 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3; do run "bash $v" dk bash:$v bash "$f" "$@"; done ;;
  zsh)  for v in 5.0.8 5.3.1 5.8 5.9; do run "zsh $v" dk zshusers/zsh:$v zsh "$f" "$@"; done ;;
  fish)
    run "fish 3.6.0 (deb12)" dk shellzoo:deb12 fish "$f" "$@"
    run "fish 4.0.2 (deb13)" dk shellzoo:deb13 fish "$f" "$@"
    run "fish 4.7.0" env RUN_GROUP=old "$T/run.sh" fish "$f" "$@"
    run "fish 4.9.3" "$T/run.sh" fish "$f" "$@" ;;
  nu)
    run "nu 0.105.1" env RUN_GROUP=old "$T/run.sh" nu "$f" "$@"
    run "nu 0.116.0" "$T/run.sh" nu "$f" "$@" ;;
  elvish) run "elvish 0.21.0" "$T/run.sh" elvish "$f" "$@" ;;
  pwsh|win)
    if [ "$fam" = pwsh ]; then
      run "pwsh 7.4 LTS" dk mcr.microsoft.com/powershell:lts-7.4-ubuntu-22.04 pwsh -NoProfile -NonInteractive -File "$f" "$@"
      run "pwsh 7.6.6"   "$T/run.sh" pwsh -NoProfile -NonInteractive -File "$f" "$@"
    else
      case $f in *.ps1) ;; *) wf=$(win_stage); run "Git Bash (Windows)" bash -c 'cd /mnt/c/Users/ecom/shell-wintest && "/mnt/c/Program Files/Git/bin/bash.exe" "$(basename "$1")" "${@:2}"' _ "$wf" "$@"; exit 0 ;; esac
    fi
    case $f in *.ps1) ;; *) exit 0 ;; esac
    wf=$(win_stage); run "Windows PowerShell 5.1" bash -c 'cd /mnt/c/Users/ecom/shell-wintest && /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$(basename "$1")" "${@:2}"' _ "$wf" "$@" ;;
  *) echo "unknown family $fam" >&2; exit 64 ;;
esac
