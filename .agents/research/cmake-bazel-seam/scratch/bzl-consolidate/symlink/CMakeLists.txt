cmake_minimum_required(VERSION 3.25)
project(symprobe NONE)
install(FILES hdr.h DESTINATION include)
install(DIRECTORY sub/ DESTINATION include/sub)
