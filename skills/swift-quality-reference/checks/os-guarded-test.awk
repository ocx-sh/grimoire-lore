# os-guarded-test.awk: SW-TEST-06. An @Test or a func test... that sits inside a #if os(...) region (no #endif between the
# #if line and the test line). Prints FILE:LINE:the line. Usage: xargs -0 -r awk -f os-guarded-test.awk -- FILES
FNR == 1 { open = 0 }
open && /@Test([^[:alnum:]_]|$)|func test[[:alnum:]_]*\(/ { print FILENAME ":" FNR ":" $0; open = 0 }
/#endif/ { open = 0 }
/#if.*(^|[^[:alnum:]_])os\(/ { open = 1 }
