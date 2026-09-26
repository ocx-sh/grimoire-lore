Re-run: W=<scratch>/patch; put dep.CMakeLists.txt in $W/dep as CMakeLists.txt and git-init it,
a.CMakeLists.txt and b.CMakeLists.txt as $W/a and $W/b CMakeLists.txt (replace the absolute
scratch path inside them), copy dep into $W/pristine, then per CMake line (3.31: -Werror=dev,
4.4: -Werror=author): configure a, configure b, configure b with
-DFETCHCONTENT_SOURCE_DIR_OLD37=$W/pristine. Measured 2026-09-26: rc 0 / 0 / 1 on 3.31.12 and 4.4.2.
asub/: configure asub with -G Ninja, then `cmake --build <dir> --target help`; the gated
mylib_unit_tests must be absent and the ungated mylib_examples_leaked present.
