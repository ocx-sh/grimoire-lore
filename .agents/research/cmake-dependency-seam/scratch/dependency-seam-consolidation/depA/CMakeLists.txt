cmake_minimum_required(VERSION 3.10)
project(depA LANGUAGES NONE)
option(depA_TESTS "" ON)
message(STATUS "[depA] depA_TESTS=${depA_TESTS}")
