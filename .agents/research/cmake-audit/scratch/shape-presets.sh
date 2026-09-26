#!/usr/bin/env bash
# Axis 10: CMakePresets.json presence, schema version, preset counts, inherits/hidden/toolchainFile, CMakeUserPresets.json + gitignore.
set -uo pipefail
CORPUS=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/exemplars
SCRATCH=/home/mherwig/dev/grimoire-lore/.agents/worktrees/java/.agents/research/cmake-audit/scratch
OUT="$SCRATCH/presets.tsv"
echo -e "repo\thas_CMakePresets\tschema_version\tconfigurePresets\tbuildPresets\ttestPresets\tpackagePresets\tworkflowPresets\tinherits_uses\thidden_true\ttoolchainFile_uses\tcondition_uses\thas_UserPresets_tracked\tUserPresets_gitignored" > "$OUT"
declare -A PRESET_SUBDIR=(
  [apache__arrow]="cpp"
  [llvm__llvm-project]="llvm"
)

for d in "$CORPUS"/*/; do
  repo=$(basename "$d")
  sub="${PRESET_SUBDIR[$repo]:-}"
  f="$d/${sub:+$sub/}CMakePresets.json"
  if [ ! -f "$f" ]; then
    echo -e "$repo\tn\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-" >> "$OUT"
    continue
  fi
  schema=$(command grep -oE '"version"[[:space:]]*:[[:space:]]*[0-9]+' "$f" | head -1 | command grep -oE '[0-9]+$')
  cp=$(command grep -c '"name"' "$f")  # rough total names, refine per-array below
  configureP=$(python3 -c "
import json,sys
try:
    d=json.load(open('$f'))
    print(len(d.get('configurePresets',[])))
except Exception:
    print('parse-error')
" 2>/dev/null)
  buildP=$(python3 -c "
import json
try:
    d=json.load(open('$f'))
    print(len(d.get('buildPresets',[])))
except Exception:
    print('parse-error')
" 2>/dev/null)
  testP=$(python3 -c "
import json
try:
    d=json.load(open('$f'))
    print(len(d.get('testPresets',[])))
except Exception:
    print('parse-error')
" 2>/dev/null)
  packageP=$(python3 -c "
import json
try:
    d=json.load(open('$f'))
    print(len(d.get('packagePresets',[])))
except Exception:
    print('parse-error')
" 2>/dev/null)
  workflowP=$(python3 -c "
import json
try:
    d=json.load(open('$f'))
    print(len(d.get('workflowPresets',[])))
except Exception:
    print('parse-error')
" 2>/dev/null)
  inherits=$(command grep -c '"inherits"' "$f")
  hidden=$(command grep -c '"hidden"[[:space:]]*:[[:space:]]*true' "$f")
  toolchain=$(command grep -c '"toolchainFile"' "$f")
  condition=$(command grep -c '"condition"' "$f")
  userf="$d/${sub:+$sub/}CMakeUserPresets.json"
  has_user="n"; [ -f "$userf" ] && has_user="y"
  gi_ignored="n/a"
  gi="$d${sub:+$sub/}.gitignore"
  if [ -f "$gi" ]; then
    command grep -qi 'CMakeUserPresets' "$gi" && gi_ignored="y" || gi_ignored="n"
  elif [ -f "$d/.gitignore" ]; then
    command grep -qi 'CMakeUserPresets' "$d/.gitignore" && gi_ignored="y" || gi_ignored="n"
  fi
  echo -e "$repo\ty\t${schema:-?}\t${configureP}\t${buildP}\t${testP}\t${packageP}\t${workflowP}\t$inherits\t$hidden\t$toolchain\t$condition\t$has_user\t$gi_ignored" >> "$OUT"
done
echo "Wrote $OUT"
column -t -s$'\t' "$OUT"
