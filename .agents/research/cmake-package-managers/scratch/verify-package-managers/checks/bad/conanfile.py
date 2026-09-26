from conans import ConanFile


class Bad(ConanFile):
    generators = "cmake"
    build_requires = "protobuf/3.21.12"
    requires = "zlib/[>=1.2 <2]"

    def package_info(self):
        self.cpp_info.names["cmake_find_package"] = "Bad"
