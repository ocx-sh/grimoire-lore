#!/bin/sh
# Script-mode gate: does -Werror=dev / -Werror=author / -Wdev promote AUTHOR_WARNING under cmake -P?
S=/home/mherwig/.cache/cmake-measure-scratch/module-authoring-consolidation
cd /home/mherwig/dev/grimoire-lore/.agents/worktrees/java || exit 1
for v in 3.31 4.3 4.4; do
  echo "== $v"
  for flags in "" "-Werror=dev" "-Wdev -Werror=dev" "-Werror=author" "-Wauthor -Werror=author"; do
    # shellcheck disable=SC2086
    out=$(ocx package exec "kitware/cmake:$v" -- cmake $flags -P "$S/t1/aw.cmake" 2>&1)
    rc=$?
    printf '%-26s rc=%s first=%s\n' "[$flags]" "$rc" "$(printf '%s' "$out" | head -1)"
  done
done
