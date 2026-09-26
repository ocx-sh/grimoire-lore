# Re-running this dive's measurements

Fixtures under `fixtures/` reproduce the sysroot/host/manager/hint layout the
findings cite (`sysroot`, `host`, `hintroot`, `managerpath`, `gsearch`). Copy
`fixtures/*` to real paths (or edit the absolute paths embedded in the
`proj-*/CMakeLists.txt` files and `toolchains/*.cmake`, which point at
`/home/mherwig/.cache/cmake-measure-scratch/cross/...` — the exact commands
quoted in `cross-compile-find-root.md` were run from that scratch root, not
from this copy) to re-run.

Compiler wrappers (`toolchains/zig-cc-cross.sh`, `zig-cxx-cross.sh`) need
`/opt/zig/zig` and target `aarch64-linux-musl -static` (works transparently
under this host's qemu-user binfmt registration). `toolchains/fake-emulator.sh`
is the `CMAKE_CROSSCOMPILING_EMULATOR` stand-in.

`conan-cross-profile` + `conanfile.txt` regenerate the measured Conan 2.32.0
cross `conan_toolchain.cmake` via:

```sh
conan install conanfile.txt -pr:h=conan-cross-profile -pr:b=default \
  --output-folder=<out> -g CMakeToolchain \
  -c tools.cmake.cmaketoolchain:user_toolchain="['<path>/toolchains/tc-modes-from-env.cmake']"
```

`proj-vcpkgchain` chainloads the REAL local vcpkg checkout's
`scripts/buildsystems/vcpkg.cmake` (not a reproduction) — point
`CMAKE_TOOLCHAIN_FILE` at `<vcpkg-root>/scripts/buildsystems/vcpkg.cmake` from
`/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/vcpkg/root`
(wave-2 fixture, no network needed, bootstrap not run — scripts only).

`proj-tcread/wholeproj` is the source-tree target for the whole-project
`try_compile()` re-read count (5 reads: 2 for `project()`, 1 for the
compiler's own ABI-detection try_compile, 1 per explicit `try_compile()`).
