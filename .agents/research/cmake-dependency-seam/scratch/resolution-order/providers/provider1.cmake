message(STATUS "[provider1] file included, PROJECT_NAME=${PROJECT_NAME}")
function(my_provider1 method package_name)
  message(STATUS "[provider1] called: method=${method} package_name=${package_name} ARGN=${ARGN}")
endfunction()
cmake_language(SET_DEPENDENCY_PROVIDER my_provider1
  SUPPORTED_METHODS FIND_PACKAGE FETCHCONTENT_MAKEAVAILABLE_SERIAL)
message(STATUS "[provider1] registered")
