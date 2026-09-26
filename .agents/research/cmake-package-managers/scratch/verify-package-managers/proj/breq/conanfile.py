from conan import ConanFile


class Breq(ConanFile):
    name = "breq"
    version = "1.0"
    build_requires = "tool/1.0"

    def build_requirements(self):
        self.build_requires("tool/1.0")
