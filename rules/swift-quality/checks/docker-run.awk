# docker-run.awk: SW-REL-04 container-scratch. A `docker run` or `podman run` of a swift build, test, run or package
# command that lacks --scratch-path or lacks -u/--user. Backslash-continued lines are joined first, and the line number
# printed is the first line of the joined command. Usage: xargs -0 -r awk -f docker-run.awk -- FILES
FNR == 1 { buf = "" }
{
  if (buf == "") start = FNR
  if ($0 ~ /\\$/) { part = $0; sub(/\\$/, "", part); buf = buf part; next }
  buf = buf $0
  if (buf ~ /(docker|podman) run.*swift (build|test|run|package)/ && !(buf ~ /--scratch-path/ && buf ~ /( -u | --user)/))
    print FILENAME ":" start ": " buf
  buf = ""
}
