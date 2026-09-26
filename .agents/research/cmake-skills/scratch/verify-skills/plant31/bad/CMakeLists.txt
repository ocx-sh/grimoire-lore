include(FetchContent)
FetchContent_Declare(old37 GIT_REPOSITORY file:///x GIT_TAG HEAD
  PATCH_COMMAND sed -i "s/VERSION 3.7/VERSION 3.10/" CMakeLists.txt)
