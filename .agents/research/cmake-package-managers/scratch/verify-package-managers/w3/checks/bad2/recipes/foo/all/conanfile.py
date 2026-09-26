from conan import ConanFile
from conan.tools.files import download


class Foo(ConanFile):
    name = "foo"
    package_type = "header-library"
    settings = "os", "arch", "compiler", "build_type"

    def source(self):
        download(self, "https://example.invalid/foo-1.0.tgz", "foo.tgz")

    def package_id(self):
        self.info.header_only()
