#!/usr/bin/env bash
# Per repo: GitHub workflow files that run ctest, and how many of them carry
# --timeout (or a step-level timeout) and --no-tests=error / CTEST_NO_TESTS_ACTION.
# Reads blobs with git show, so sparse checkouts are fine. No pipefail on purpose
# (grep -q on a pipe under pipefail gives SIGPIPE false negatives, CMK-CORE-05);
# each grep reads a here-string instead.
CORPUS=${CORPUS:-/home/mherwig/.cache/research-lang/exemplars/cmake}
for d in "$CORPUS"/*/; do
  r=$(basename "$d")
  mapfile -t files < <(git -C "$d" ls-tree -r --name-only HEAD -- .github/workflows 2>/dev/null | grep -e '\.ya\?ml$')
  c=0; t=0; n=0
  for p in "${files[@]}"; do
    body=$(git -C "$d" show "HEAD:$p" 2>/dev/null)
    grep -q -e 'ctest' <<<"$body" || continue
    c=$((c + 1))
    grep -q -e '--timeout' <<<"$body" && t=$((t + 1))
    grep -q -e 'no-tests=error' -e 'CTEST_NO_TESTS_ACTION' <<<"$body" && n=$((n + 1))
  done
  [ "$c" -gt 0 ] && echo "$r ctest_files=$c timeout=$t no_tests_error=$n"
done
exit 0
