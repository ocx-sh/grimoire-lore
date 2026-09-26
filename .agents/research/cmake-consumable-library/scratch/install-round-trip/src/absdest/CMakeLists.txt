cmake_minimum_required(VERSION 3.20)
project(absdest LANGUAGES NONE)
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/payload.txt" DESTINATION /opt/absdest-payload)
