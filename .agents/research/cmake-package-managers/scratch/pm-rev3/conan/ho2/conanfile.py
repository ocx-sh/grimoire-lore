from conan import ConanFile
class P(ConanFile):
    name = "ho2"
    version = "1.0"
    settings = "os", "arch", "compiler", "build_type"
    package_type = "header-library"
    implements = ["auto_header_only"]
