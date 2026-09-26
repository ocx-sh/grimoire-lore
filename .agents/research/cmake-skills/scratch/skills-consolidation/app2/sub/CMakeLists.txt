find_package(Gamma REQUIRED)
find_program(TOOL_SUB NAMES gammatool)
message(STATUS "[subdir, after find_package] find_program(gammatool)=${TOOL_SUB}")
