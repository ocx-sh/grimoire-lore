function flush() { if (p != "") print f ":" ln ": " p "_UNPARSED_ARGUMENTS never read"; p = "" }
function prefix(s,   t) {
  split(s, t, /[[:space:]()"]+/)
  if (t[1] == "") return ""
  if (t[1] == "PARSE_ARGV") return t[3]
  if (t[1] == "PARSE_ARGN") return t[2]
  return t[1]
}
FNR == 1 { flush(); q = ""; want = 0 }
/^[[:space:]]*(end)?(function|macro)[[:space:]]*\(/ { flush(); q = ""; want = 0 }
want && NF { p = prefix($0); sub(/^[[:space:]]+/, "", p); q = p; want = 0; next }
/cmake_parse_arguments[[:space:]]*\(/ {
  flush(); s = $0; sub(/.*cmake_parse_arguments[[:space:]]*\([[:space:]]*/, "", s)
  f = FILENAME; ln = FNR; p = prefix(s); q = p
  if (p == "") want = 1
  next
}
p != "" && (index($0, p "_UNPARSED_ARGUMENTS") || index($0, "(" p ")")) { p = "" }
q != "" && match($0, /\$\{[A-Za-z0-9_]+_UNPARSED_ARGUMENTS\}/) {
  u = substr($0, RSTART + 2, RLENGTH - 3)
  if (u != q "_UNPARSED_ARGUMENTS") print FILENAME ":" FNR ": message reads " u ", parse prefix is " q
}
END { flush() }
