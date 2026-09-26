cmake_minimum_required(VERSION 3.25)
project(consumer LANGUAGES NONE)
include(FetchContent)
FetchContent_Declare(old37
  GIT_REPOSITORY "file:///home/mherwig/.cache/cmake-measure-scratch/triage/f6-fetched-old37-git"
  GIT_TAG ac8924d
  PATCH_COMMAND sed -i "s/VERSION 3.7/VERSION 3.10/" CMakeLists.txt
  UPDATE_DISCONNECTED TRUE
)
FetchContent_MakeAvailable(old37)
