from conan import ConanFile
from conan.tools.cmake import CMakeDeps


class App(ConanFile):
    settings = "os", "arch", "compiler", "build_type"
    requires = "pkgb/1.0"
    tool_requires = "tool/1.0"

    def generate(self):
        deps = CMakeDeps(self)
        deps.build_context_activated = ["tool"]
        deps.generate()
