# file_gate.awk: a file-level grep gate that needs no -Z and no GNU-only flag.
# Reads the files named on the command line (git-fed through xargs -0).
# Patterns arrive as POSIX ERE in the environment, so no shell escaping applies:
#   HAS    required  a file must contain a line matching this
#   ALSO   optional  ... and a line matching this
#   LACKS  optional  ... and no line matching this
#   SHOW   optional  print FILE:LINE:TEXT of the lines matching this, not the file name
# Prints the name of each file that passes. POSIX awk; gawk and busybox awk run it.
BEGIN {
  H = ENVIRON["HAS"]; A = ENVIRON["ALSO"]; L = ENVIRON["LACKS"]; S = ENVIRON["SHOW"]
  if (H == "") { print "file_gate.awk: HAS is required" > "/dev/stderr"; bad = 1; exit 2 }
}
FNR == 1 { flush(); file = FILENAME; h = a = l = 0; buf = "" }
{
  if ($0 ~ H) h = 1
  if (A != "" && $0 ~ A) a = 1
  if (L != "" && $0 ~ L) l = 1
  if (S != "" && $0 ~ S) buf = buf FILENAME ":" FNR ":" $0 "\n"
}
END { if (!bad) flush() }
function flush() {
  if (file == "") return
  if (h && (A == "" || a) && !l) printf "%s", (S == "" ? file "\n" : buf)
}
