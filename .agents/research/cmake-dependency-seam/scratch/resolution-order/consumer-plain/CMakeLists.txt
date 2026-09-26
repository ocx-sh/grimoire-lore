cmake_minimum_required(VERSION 3.27)
project(consumer2 LANGUAGES C)
find_package(dep CONFIG REQUIRED)
message(STATUS "[scenario] dep_DIR=${dep_DIR} dep_VERSION=${dep_VERSION}")
