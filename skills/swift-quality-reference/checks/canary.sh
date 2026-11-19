#!/usr/bin/env bash
# canary.sh: SW-CORE-03, the empty-operand canary. A grep or awk gate that scans the tree is trusted
# only after this exits 0.
# Usage: cd ROOT && bash canary.sh      (ROOT = the repository root, `git rev-parse --show-toplevel`)
# Exit: 0 and no output when at least one readable *.swift file sits below the current directory outside .build;
#       1 and "CANARY: no Swift file scanned" on stderr when none does.
# The list form is deliberate: an `import ` grep exits 1 on a valid tree whose files import nothing, so the canary reads
# every line count instead (`grep -c -e ''` prints one line per readable file, an empty file included).
# Symlinks: the list is `git ls-files`, the list every cell reads. A symlinked file is one entry and counts when it resolves,
# which is what the cells scan (RxSwift `Sources/` is 412 file symlinks: a recursive grep over `.` saw 1 file, the list sees
# all of them). A dangling symlink is listed but not readable and goes red when it is the only candidate. A symlinked
# directory is one entry the list does not descend, so name its real directory.
# Watched red on an empty tree, a wrong root and a Sources of dangling symlinks, green on a stdlib-only tree and on a
# Sources of live file symlinks (measured 2026-10-10; git-fed form translated 2026-10-11, re-watched on GNU and busybox).
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.swift' ':(exclude,glob)**/.build/**' |
  xargs -0 -r grep -c -e '' -- |
  awk 'END { if (NR == 0) { print "CANARY: no Swift file scanned" > "/dev/stderr"; exit 1 } }'
