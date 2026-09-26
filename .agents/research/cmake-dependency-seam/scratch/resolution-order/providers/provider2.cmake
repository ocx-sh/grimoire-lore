message(STATUS "[provider2] file included")
function(my_provider2 method package_name)
  message(STATUS "[provider2] called: method=${method} package_name=${package_name}")
endfunction()
cmake_language(SET_DEPENDENCY_PROVIDER my_provider2
  SUPPORTED_METHODS FIND_PACKAGE)
message(STATUS "[provider2] registered")
