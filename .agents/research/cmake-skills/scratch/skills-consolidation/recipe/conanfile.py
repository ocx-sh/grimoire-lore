import os

from conan import ConanFile
from conan.tools.files import save


class Gamma(ConanFile):
    name = "gamma"
    version = "1.0"
    package_type = "static-library"

    def package(self):
        tool = os.path.join(self.package_folder, "bin", "gammatool")
        save(self, tool, "#!/bin/sh\n")
        os.chmod(tool, 0o755)
        save(self, os.path.join(self.package_folder, "lib", "libgamma.a"), "!<arch>\n")
        save(self, os.path.join(self.package_folder, "include", "gamma.h"), "\n")

    def package_info(self):
        self.cpp_info.libs = ["gamma"]
        self.cpp_info.set_property("cmake_file_name", "Gamma")
        self.cpp_info.set_property("cmake_target_name", "Gamma::gamma")
