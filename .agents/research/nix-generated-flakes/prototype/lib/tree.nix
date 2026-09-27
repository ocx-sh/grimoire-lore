# Reader: committed data -> { latest = flat "<ns>-<pkg>" set; byVersion = <ns>.<pkg>."<version>" tree }.
{
  pkgs,
  data,
  header ? true,
  patchelf ? true,
}:
let
  inherit (pkgs) lib;
  system = pkgs.stdenv.hostPlatform.system;
  mk = pkgs.callPackage ./mk-package.nix { };
  onSystem = e: e.platforms ? ${system};
  byVersion = lib.mapAttrs (
    ns:
    lib.mapAttrs (
      pkg: e:
      let
        vs = lib.mapAttrs (
          version: entry:
          mk {
            inherit
              ns
              pkg
              version
              entry
              header
              patchelf
              ;
            plat = entry.platforms.${system};
          }
        ) (lib.filterAttrs (_: onSystem) e.versions);
      in
      vs // lib.mapAttrs (_: t: vs.${t}) (lib.filterAttrs (_: t: vs ? ${t}) e.aliases)
    )
  ) data;
  latest = lib.listToAttrs (
    lib.concatLists (
      lib.mapAttrsToList (
        ns:
        lib.mapAttrsToList (
          pkg: e: lib.nameValuePair "${ns}-${pkg}" (byVersion.${ns}.${pkg}.${e.latest} or null)
        )
      ) data
    )
  );
in
{
  inherit byVersion;
  latest = lib.filterAttrs (_: v: v != null) latest;
}
