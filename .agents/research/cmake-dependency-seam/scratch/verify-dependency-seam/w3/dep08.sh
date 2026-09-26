#!/bin/sh
# DEP-08: line-grain grep (current) vs -z file-grain grep on single-line and split target_link_libraries.
S=$(cd "$(dirname "$0")" && pwd)
NAME=dep
for t in bad good split8 good8; do
  cur=$(cd "$S/$t" && grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e "target_link_libraries.*[[:space:]]$NAME[[:space:])]" -e "target_link_libraries.*[[:space:]]$NAME\$" . | wc -l)
  z=$(cd "$S/$t" && grep -rlzE --include='*.cmake' --include='CMakeLists.txt' -e "target_link_libraries\([^)]*[[:space:]]$NAME[[:space:])]" . | wc -l)
  echo "$t current=$cur z=$z"
done
