cmake_minimum_required(VERSION 3.19)
project(cred_cache_demo NONE)
# Anti-pattern: naively snapshotting every ENV{} knob into CACHE STRING,
# including one that happens to be a credential-shaped name.
foreach(_v IN ITEMS MY_TOOL_HOME MY_TOOL_MIRROR MY_TOOL_AUTH_TOKEN)
  if(DEFINED ENV{${_v}})
    set(${_v} "$ENV{${_v}}" CACHE STRING "snapshotted from environment")
  endif()
endforeach()
