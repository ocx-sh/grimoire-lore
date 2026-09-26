from conan import ConanFile


class Bar(ConanFile):
    name = "bar"

    def package_info(self):
        self.cpp_info.set_property("cmake_file_name", "Bar")
        self.cpp_info.set_property("cmake_target_name", "Bar::bar")
        self.cpp_info.names["cmake_find_package"] = "Bar"
