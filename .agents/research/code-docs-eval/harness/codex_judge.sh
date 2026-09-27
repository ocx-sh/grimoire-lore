#!/usr/bin/env bash
# Cross-family calibration judge: codex exec grades one packet with the same rubric.
# Usage: codex_judge.sh PACKETS_DIR OUT_DIR SITE...
set -u
H=$(cd "$(dirname "$0")" && pwd)
P=$1; O=$2; shift 2
mkdir -p "$O"
for s in "$@"; do
  [ -s "$O/$s.x.json" ] && continue
  {
    echo "You are a strict evaluator. Grade every probe in the packet below by the rubric below."
    echo "Output ONLY the JSON array the rubric specifies, no prose, no code fence."
    echo; echo "=== RUBRIC ==="; cat "$H/fixtures/judge-rubric.md"
    echo; echo "=== PACKET ==="; cat "$P/$s.json"
  } > "$O/$s.x.prompt"
  timeout 900 codex exec --skip-git-repo-check -s read-only -C "$O" -o "$O/$s.x.raw" - < "$O/$s.x.prompt" > "$O/$s.x.log" 2>&1
  python3 - "$O/$s.x.raw" "$O/$s.x.json" <<'PY'
import json, re, sys
t = open(sys.argv[1]).read()
m = re.search(r"\[.*\]", t, re.S)
json.dump(json.loads(m.group(0)), open(sys.argv[2], "w"), indent=1)
PY
  echo "codex judged $s: $?"
done
