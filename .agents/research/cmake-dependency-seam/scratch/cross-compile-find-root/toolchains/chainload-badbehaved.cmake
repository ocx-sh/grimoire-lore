message(STATUS "CHAINLOAD-BADBEHAVED-RAN")
# A project-level command inside a chainloaded toolchain file: this is what
# the brief asks us to break on purpose.
project(should_not_be_called_here LANGUAGES NONE)
