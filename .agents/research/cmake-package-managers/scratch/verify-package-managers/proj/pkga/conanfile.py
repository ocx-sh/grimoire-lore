from conan import ConanFile


class Pkga(ConanFile):
    name = "pkga"
    version = "1.0"
    package_type = "header-library"

    def package_info(self):
        self.cpp_info.names["cmake_find_package"] = "Alpha"
        self.cpp_info.names["cmake_find_package_multi"] = "Alpha"
        self.cpp_info.filenames["cmake_find_package"] = "AlphaFile"
