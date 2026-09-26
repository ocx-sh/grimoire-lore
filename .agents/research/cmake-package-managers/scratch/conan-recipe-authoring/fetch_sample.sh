#!/bin/bash
set -u
CORPUS=/home/mherwig/.cache/research-lang/exemplars/cmake/conan-io__conan-center-index
SCR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad
mkdir -p "$SCR/sample"
: > "$SCR/sample_paths.txt"
while read -r r; do
  if [ "$r" = "b2" ]; then
    v="standard"
  elif [ "$r" = "gdal" ]; then
    v="post_3.5.0"
  else
    v="all"
  fi
  echo "recipes/$r/$v" >> "$SCR/sample_paths.txt"
done < "$SCR/sample40.txt"

while read -r p; do
  name=$(echo "$p" | tr '/' '_')
  if git -C "$CORPUS" cat-file -e HEAD:"$p/conanfile.py" 2>/dev/null; then
    git -C "$CORPUS" show HEAD:"$p/conanfile.py" > "$SCR/sample/${name}__conanfile.py"
  else
    echo "MISSING $p/conanfile.py"
  fi
done < "$SCR/sample_paths.txt"
ls "$SCR/sample" | wc -l
