from conan import ConanFile
class P(ConanFile):
    name = "ho1"
    version = "1.0"
    settings = "os", "arch", "compiler", "build_type"
    package_type = "header-library"
    def package_id(self):
        self.info.header_only()
