function(my_provider3 method package_name)
endfunction()
cmake_language(SET_DEPENDENCY_PROVIDER my_provider3
  SUPPORTED_METHODS FIND_PACKAGE FIND_LIBRARY)
