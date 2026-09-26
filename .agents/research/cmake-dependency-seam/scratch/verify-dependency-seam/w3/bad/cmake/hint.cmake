function(hint name dir)
  set(${name}_ROOT "${dir}" CACHE PATH
    "hint" FORCE)
endfunction()
cmake_language(SET_DEPENDENCY_PROVIDER myprov SUPPORTED_METHODS FIND_PACKAGE)
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM ONLY)
