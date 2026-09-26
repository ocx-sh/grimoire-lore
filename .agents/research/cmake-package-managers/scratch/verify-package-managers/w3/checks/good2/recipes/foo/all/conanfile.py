from conan import ConanFile
from conan.tools.files import get


class Foo(ConanFile):
    name = "foo"
    package_type = "header-library"
    settings = "os", "arch", "compiler", "build_type"
    no_copy_source = True

    def source(self):
        get(self, **self.conan_data["sources"][self.version], strip_root=True)

    def package_id(self):
        # was: self.info.header_only()
        self.info.clear()
