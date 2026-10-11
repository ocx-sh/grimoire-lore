# exported_any.awk: read `go doc -all .` on stdin and print each declaration or
# indented member line that names any or interface{}, minus indented comment lines.
# A tab is matched as \t inside awk, so the shell needs no ANSI-C quoting. POSIX awk.
/^(func |type |var |const |\t)/ && !/^\t+\/\// && /(^|[^[:alnum:]_])any([^[:alnum:]_]|$)|interface\{\}/
