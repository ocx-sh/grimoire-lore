from conan import ConanFile


class Pkgc(ConanFile):
    name = "pkgc"
    version = "1.0"
    package_type = "header-library"

    def package_info(self):
        self.cpp_info.set_property("cmake_find_mode", "both")
        self.cpp_info.set_property("cmake_file_name", "Gamma")
