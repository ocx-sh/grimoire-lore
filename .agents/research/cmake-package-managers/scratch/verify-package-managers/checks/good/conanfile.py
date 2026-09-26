from conan import ConanFile
from conan.tools.cmake import CMakeDeps


class Good(ConanFile):
    generators = "CMakeToolchain"
    tool_requires = "protobuf/3.21.12"
    requires = "zlib/[>=1.2 <2]"

    def build_requirements(self):
        self.tool_requires("cmake/3.31.0")

    def generate(self):
        deps = CMakeDeps(self)
        deps.build_context_activated = ["protobuf"]
        deps.generate()

    def package_info(self):
        self.cpp_info.set_property("cmake_file_name", "Good")
        self.cpp_info.set_property("cmake_target_name", "Good::good")
