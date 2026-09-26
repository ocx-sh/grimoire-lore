#!/bin/sh
# Re-run: recount find_package CONFIG/MODULE keyword usage at the 2026-09-26 corpus SHAs.
# Corpus: /home/mherwig/.cache/research-lang/exemplars/cmake
set -eu
python3 "$(dirname "$0")/extract-find-package-calls.py" \
  | awk -F'\t' '$4=="find_package"' \
  | grep -v '/Kitware__CMake/Tests/' \
  | grep -v '^grpc__grpc	CMakeLists.txt' \
  > /tmp/find_package.tsv
TOTAL=$(wc -l < /tmp/find_package.tsv)
CONFIG=$(awk -F'\t' '{print $5}' /tmp/find_package.tsv | grep -ciE '(^| )CONFIG( |$)')
MODULE=$(awk -F'\t' '{print $5}' /tmp/find_package.tsv | grep -ciE '(^| )MODULE( |$)')
echo "total=$TOTAL CONFIG=$CONFIG MODULE=$MODULE"
