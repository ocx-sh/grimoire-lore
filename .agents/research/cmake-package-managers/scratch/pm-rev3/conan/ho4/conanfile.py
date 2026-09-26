from conan import ConanFile


class P(ConanFile):
    name = "ho4"
    version = "1.0"
    settings = "os", "arch", "compiler", "build_type"
    package_type = "header-library"
    no_copy_source = True
