#!/bin/bash
set -u
SCR=/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-java/c4f22277-6831-442c-8bc3-1be41a79fdff/scratchpad/sample
cd "$SCR"
printf '%-24s|%-4s|%-4s|%-6s|%-5s|%-4s|%-6s|%-4s|%-4s|%-4s|%-4s|%-4s|%-4s|%-4s\n' \
  "recipe" "lay" "cmL" "CMTC" "CMD" "CCD" "setp" "nres" "rmd" "pkid" "val" "chkc" "impl" "fpic"
for f in *__conanfile.py; do
  r=$(echo "$f" | sed -E 's/recipes_([^_]+)_.*/\1/')
  lay=$(grep -qc 'def layout' "$f" && echo Y || echo .)
  lay=$(grep -q 'def layout' "$f" && echo Y || echo .)
  cml=$(grep -q 'cmake_layout' "$f" && echo Y || echo .)
  cmtc=$(grep -q 'CMakeToolchain' "$f" && echo Y || echo .)
  cmd=$(grep -q '\bCMakeDeps\b' "$f" && echo Y || echo .)
  ccd=$(grep -q 'CMakeConfigDeps' "$f" && echo Y || echo .)
  setp=$(grep -q 'cmake_target_name\|cmake_file_name' "$f" && echo Y || echo .)
  nres=$(grep -q 'cpp_info\.names\|cpp_info\[.*\]\.names' "$f" && echo Y || echo .)
  rmd=$(grep -q 'rmdir' "$f" && echo Y || echo .)
  pkid=$(grep -q 'def package_id' "$f" && echo Y || echo .)
  val=$(grep -q 'def validate' "$f" && echo Y || echo .)
  chkc=$(grep -q 'check_min_cppstd' "$f" && echo Y || echo .)
  impl=$(grep -q 'auto_shared_fpic' "$f" && echo Y || echo .)
  fpic=$(grep -q '"fPIC"' "$f" && echo Y || echo .)
  printf '%-24s|%-4s|%-4s|%-6s|%-5s|%-4s|%-6s|%-4s|%-4s|%-4s|%-4s|%-4s|%-4s|%-4s\n' \
    "$r" "$lay" "$cml" "$cmtc" "$cmd" "$ccd" "$setp" "$nres" "$rmd" "$pkid" "$val" "$chkc" "$impl" "$fpic"
done
