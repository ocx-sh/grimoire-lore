#!/usr/bin/env bash
# canary.sh: SW-CORE-03, the empty-operand canary. A grep, find or awk gate that scans the tree is trusted
# only after this exits 0.
# Usage: cd ROOT && bash canary.sh      (ROOT = the repository root, `git rev-parse --show-toplevel`)
# Exit: 0 and no output when at least one *.swift file sits below the current directory outside .build;
#       1 and "CANARY: no Swift file scanned" on stderr when none does.
# The find form is deliberate: an `import ` grep exits 1 on a valid tree whose files import nothing.
# Symlinks: `find -L ... -type f` counts what `grep -R` and `find -L` read, the form every cell with a `Sources`
# operand uses. A bare `find` lists symlinks that `grep -r` skips (RxSwift `Sources/` is 412 file symlinks: `grep -rl`
# saw 1 file), so the canary stayed green while the gate scanned nothing. A dangling symlink is not a file and goes red.
# Watched red on an empty tree, a wrong root and a Sources of dangling symlinks, green on a stdlib-only tree and on a
# Sources of live file symlinks (measured 2026-10-10).
find -L . -name '*.swift' -type f -not -path '*/.build/*' |
  awk 'END { if (NR == 0) { print "CANARY: no Swift file scanned" > "/dev/stderr"; exit 1 } }'
