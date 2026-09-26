#!/bin/sh
# Needs a Conan 2.32.0 venv: CONAN=/path/to/venv/bin/conan sh run.sh
D=$(cd "$(dirname "$0")" && pwd)
export CONAN_HOME="${CONAN_HOME:-$HOME/.cache/cmake-measure-scratch/pm-rev3/conanhome}"
mkdir -p "$CONAN_HOME/profiles" && cp "$D/profiles/default" "$CONAN_HOME/profiles/default"
for d in ho1 ho2 ho3 ho4; do
  echo "== $d"
  "${CONAN:-conan}" graph info "$D/$d" --format=json > "$CONAN_HOME/$d.json" 2> "$CONAN_HOME/$d.err"
  echo "rc=$?"; grep -e Error -e AttributeError "$CONAN_HOME/$d.err"
  python3 -c "import json,sys; print('info=', json.load(open(sys.argv[1]))['graph']['nodes']['0'].get('info'))" "$CONAN_HOME/$d.json" 2>/dev/null
done
