# goleak_coverage.awk: print each directory that starts a goroutine in non-test
# code and holds no test file calling goleak.VerifyTestMain.
# Feed it every .go file of the module (git-fed through xargs -0). POSIX awk.
FNR == 1 { dir = FILENAME; sub(/\/?[^\/]*$/, "", dir); if (dir == "") dir = "."; test = (FILENAME ~ /_test\.go$/) }
test && /goleak\.VerifyTestMain/ { covered[dir] = 1 }
!test && ($0 ~ /[[:space:]]go [[:alnum:]_.]*\(/ || /\.Go\(/ || /\.TryGo\(/ || /iter\.Pull/) { starts[dir] = 1 }
END { for (d in starts) if (!(d in covered)) print d }
