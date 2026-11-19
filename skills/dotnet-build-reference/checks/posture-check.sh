#!/usr/bin/env bash
# posture-check.sh: CS-SEC-02 and CS-BUILD-11, the analyzer posture holds. Usage: bash posture-check.sh <repo-root>
# Run it from CI on the installed tree; the directory this script sits in is skipped, so an installed copy of checks/ is not read.
# Asserts: (1) no symbol appears twice across the BannedSymbols*.txt files (RS0031 is an error); (2) RS0030 and RS0031 are set to
# error, once, in a .globalconfig or .editorconfig; (3) every BannedSymbols*.txt is an AdditionalFiles item in a props, csproj or
# targets file (a file not registered bans nothing); (4) no dotnet_diagnostic ID appears twice in one .globalconfig; (5) every
# severity and option line of the shipped analyzers.globalconfig and analyzers.editorconfig is still present, so a deleted or
# lowered line is a finding (CS-CORE-01). Comments after `#` are ignored in (5).
# Output: one "posture-check: ..." line per finding. Exit: 0 clean, 1 at least one finding, 64 usage.
# Watched red on a concatenated duplicate fragment, a deleted ID line, a lowered RS0030, an unregistered file and a duplicated
# ID line, and green on the shipped set (measured 2026-10-11, SDK 10.0.401).
set -u
[ -d "${1:-}" ] || { echo 'usage: posture-check.sh <repo-root>' >&2; exit 64; }
root=$(cd "$1" && pwd); here=$(cd "$(dirname "$0")" && pwd); bad=0
say() { echo "posture-check: $*"; bad=1; }
files() { find "$root" \( -name .git -o -name bin -o -name obj -o -name node_modules -o -path "$here" \) -prune -o -type f "$@"; }
gcfg() { files \( -name .globalconfig -o -name '*.globalconfig' \) "$@"; }
norm() { sed -E 's/[[:space:]]*#.*$//; s/[[:space:]]*=[[:space:]]*/=/; s/^[[:space:]]+//' | grep -E '^(dotnet_diagnostic|dotnet_code_quality|dotnet_style|generated_code|MA0053)[._a-z]*'; }
cfg() { { gcfg -exec cat {} +; files -name .editorconfig -exec cat {} +; } | norm | sort -u; }

names=$(files -name 'BannedSymbols*.txt' -exec basename {} \; | sort -u)
[ -n "$names" ] || say 'no BannedSymbols*.txt found'
dups=$(files -name 'BannedSymbols*.txt' -exec cat {} + | grep -E '^[TMPFE]:' | cut -d';' -f1 | sort | uniq -d)
[ -z "$dups" ] || say "symbol listed twice (RS0031): $(echo "$dups" | tr '\n' ' ')"

for n in $names; do
  re=$(echo "$n" | sed 's/\./\\./g')
  files \( -name '*.props' -o -name '*.csproj' -o -name '*.targets' \) -exec grep -lE "AdditionalFiles[^>]*[^A-Za-z0-9_.-]$re\"" {} + |
    grep -q . || say "$n is not an AdditionalFiles item in any props, csproj or targets file"
done

have=$(cfg)
for id in RS0030 RS0031; do
  got=$(echo "$have" | grep "^dotnet_diagnostic\.$id\.severity=")
  [ "$got" = "dotnet_diagnostic.$id.severity=error" ] || say "$id must be set to error exactly once, found: ${got:-nothing}"
done

dupid=$(gcfg -exec awk -F'[ \t]*=' '/^dotnet_diagnostic\./ { if (seen[FILENAME, $1]++) print FILENAME ": " $1 }' {} +)
[ -z "$dupid" ] || say "ID line listed twice: $(echo "$dupid" | tr '\n' ' ')"

for s in analyzers.globalconfig analyzers.editorconfig; do
  while read -r line; do
    say "line missing or changed (from $s): $line"
  done < <(comm -23 <(norm < "$here/$s" | sort -u) <(echo "$have"))
done
exit $bad
