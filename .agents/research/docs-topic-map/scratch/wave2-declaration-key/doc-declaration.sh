#!/usr/bin/env sh
# checks/doc-declaration.sh — list every docs page with no valid doc_type declaration.
# Reads file content only. Never reads a path, a directory or a file name.
# Accepts the comment opener of each markup family: markdown/HTML, MDX, reStructuredText, MyST.
TYPES='tutorial|how-to|reference|explanation|troubleshooting|runbook|landing|readme|changelog'
TIERS='first-steps|everyday|integration'
OPEN='(<!--|\{/\*|\.\.|%)'
fail=0
for f in "$@"; do
  head -n 12 "$f" | grep -qE "^[[:space:]]*${OPEN}[[:space:]]*doc_type:[[:space:]]*(${TYPES})\b" || {
    echo "$f: no doc_type declaration in the first 12 lines"; fail=1; continue; }
  head -n 12 "$f" | grep -qE "^[[:space:]]*${OPEN}[[:space:]]*doc_type:[[:space:]]*(tutorial|how-to|landing)\b" || continue
  head -n 12 "$f" | grep -qE "^[[:space:]]*${OPEN}[[:space:]]*doc_tier:[[:space:]]*(${TIERS})\b" || {
    echo "$f: doc_type needs a doc_tier and none was declared"; fail=1; }
done
exit $fail
