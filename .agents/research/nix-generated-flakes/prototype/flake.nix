{
  description = "ocx-index generated-flake prototype: real fetch (actionlint/ninja/cmake) + M-E-11 env translation (corretto)";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439";
  outputs =
    { self, nixpkgs }:
    let
      # x86_64-darwin dropped: nixpkgs 26.11 removed support for it
      # (NIX-GEN-04's darwin/amd64-drop rule; map conflict 15).
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      data = builtins.fromJSON (builtins.readFile ./data.json);
      tree = pkgs: import ./lib/tree.nix { inherit pkgs data; };
    in
    {
      packages = forAllSystems (system: (tree nixpkgs.legacyPackages.${system}).latest);
      legacyPackages = forAllSystems (system: (tree nixpkgs.legacyPackages.${system}).byVersion);
      overlays.default = final: _prev: { ocx = (tree final).byVersion; };
      # Smoke check: every x86_64-linux package's declared binary actually
      # runs inside the build sandbox (NIX-GEN-15). corretto's `java`/`javac`
      # are synthetic stubs (see data.json) so this exercises the env
      # wrapper (JAVA_HOME/PATH), not a real JVM.
      checks.x86_64-linux.smoke =
        let
          pkgs = nixpkgs.legacyPackages.x86_64-linux;
          p = self.packages.x86_64-linux;
        in
        pkgs.runCommand "ocx-smoke" { } ''
          ${pkgs.lib.getExe p.actionlint-actionlint} --version
          ${pkgs.lib.getExe p.ninja-build-ninja} --version
          "${p.kitware-cmake}/bin/cmake" --version
          JAVA_HOME_OUT=$("${p.amazon-corretto}/bin/java")
          echo "$JAVA_HOME_OUT" | grep -q "ran"
          touch $out
        '';
      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}
