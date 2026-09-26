from conan import ConanFile


class Pkgb(ConanFile):
    name = "pkgb"
    version = "1.0"
    package_type = "header-library"

    def package_info(self):
        self.cpp_info.set_property("cmake_file_name", "Beta")
        self.cpp_info.set_property("cmake_target_name", "Beta::beta")
