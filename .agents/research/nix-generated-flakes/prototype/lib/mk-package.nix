{
  lib,
  stdenv,
  autoPatchelfHook,
  makeWrapper,
  fetchurl,
}:
let
  fetchLayer = import ./fetch-layer.nix { inherit lib fetchurl; };
  ocxEnv = import ./mk-ocx-env.nix { inherit lib; };
  mkEnvArgs = ocxEnv.mkEnvArgs;
in
{
  ns,
  pkg,
  version,
  entry,
  plat,
  header ? true,
  patchelf ? true,
}:
let
  licenses = lib.filter (l: l != null) (map (id: lib.getLicenseFromSpdxIdOr id null) entry.licenses);
  # NIX-GEN-11 (fixed 2026-09-27, was gated on `plat.libc == "glibc"`):
  # every *-linux package gets the hook, whatever its libc tag. "Bare" does
  # not mean static -- libc tagging drifts (12/125 packages sit in both the
  # bare and the tagged set), and the hook is a measured no-op on a real
  # static ELF (identical closure, 6 paths, with or without it).
  isLinux = lib.hasSuffix "-linux" stdenv.hostPlatform.system;
  autoPatchelf = isLinux && patchelf;
  # ponytail: `synthetic` lets this prototype demonstrate M-E-11's env/
  # dependency translation on amazon/corretto's REAL metadata (env array,
  # binaries list — fetched live from ghcr.io 2026-09-27, see README)
  # without downloading its real 209MB layer; the fetch mechanism itself
  # is already proven for actionlint/ninja/cmake below and is not what
  # this branch tests.
  synthetic = plat.synthetic or false;
in
stdenv.mkDerivation (
  {
    pname = "${ns}-${pkg}";
    inherit version;
    nativeBuildInputs = [ makeWrapper ] ++ lib.optional autoPatchelf autoPatchelfHook;
    buildInputs = lib.optional autoPatchelf stdenv.cc.cc.lib;
    # M-E-11 finding: autoPatchelfHook fails the WHOLE derivation if any
    # one bundled binary has an unresolved shared-library dependency,
    # even when that binary is not one ocx's `entrypoints` names as a
    # runnable command (kitware/cmake's bundled `cmake-gui` needs
    # libxcb/fontconfig/freetype; none of the other 4 binaries do).
    # Per-soname opt-out, sourced from the data file, never a blanket ["*"].
    autoPatchelfIgnoreMissingDeps = entry.autoPatchelfIgnoreMissingDeps or [ ];
    dontConfigure = true;
    dontBuild = true;
  }
  // (
    if synthetic then
      {
        dontUnpack = true;
      }
    else
      {
        src = fetchLayer {
          repo = "ocx-contrib/${ns}/${pkg}";
          digest = plat.layerDigest;
          inherit header;
        };
        unpackPhase = ''
          mkdir unpacked
          tar -xJf "$src" -C unpacked --strip-components=${toString plat.stripComponents}
        '';
      }
  )
  // {
    # M-E-11: ocx's `${installPath}` interpolation token is valid bash
    # parameter-expansion syntax already (metadata.md §Interpolation
    # Tokens) — mk-ocx-env.nix rewrites it to the literal text
    # `$installPath`, and setting that shell variable here lets bash's
    # own expansion resolve it when makeWrapper's args are evaluated
    # below, matching what ocx's own runtime would substitute.
    installPhase = ''
      mkdir -p "$out/libexec/${pkg}" "$out/bin"
    ''
    + (
      if synthetic then
        # No real payload: one stub script per declared binary, so the
        # env-wrapper mechanism under test has something to wrap.
        (lib.concatMapStringsSep "\n" (b: ''
          printf '#!/bin/sh\necho "%s ran"\n' "${b}" > "$out/libexec/${pkg}/${b}"
          chmod +x "$out/libexec/${pkg}/${b}"
        '') entry.binaries)
        + "\n"
      else
        ''
          cp -r unpacked/. "$out/libexec/${pkg}/"
        ''
    )
    + ''
      installPath="$out/libexec/${pkg}"
      ${lib.concatMapStringsSep "\n" (b: ''
        for c in "$out/libexec/${pkg}/${b}" "$out/libexec/${pkg}/bin/${b}"; do
          if [ -f "$c" ]; then
            makeWrapper "$c" "$out/bin/${b}" \
              ${mkEnvArgs (entry.env or [ ])}
            break
          fi
        done
        test -e "$out/bin/${b}"
      '') entry.binaries}
    '';
    meta = {
      description = "Prebuilt ${ns}/${pkg} from the ocx index";
      sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
      platforms = [ stdenv.hostPlatform.system ];
    }
    // lib.optionalAttrs (licenses != [ ]) { license = licenses; }
    // lib.optionalAttrs (lib.length entry.binaries == 1) { mainProgram = lib.head entry.binaries; };
  }
)
