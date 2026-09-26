# Simulates an external toolchain file supplied by a Bazel rules_foreign_cc
# cmake() wrap, per M-K-01. Deliberately does not set CMAKE_SYSTEM_NAME so
# this stays a same-platform build (setting it would flip on
# CMAKE_CROSSCOMPILING even when host and target match).
set(CMAKE_C_COMPILER gcc)
