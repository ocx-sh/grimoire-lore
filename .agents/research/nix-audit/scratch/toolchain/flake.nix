{
  description = "research-lang nix program measurement toolchain";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/8d5d270900d3fc75655ea2d9d248b234f6631439";
  outputs = { nixpkgs, ... }:
    let pkgs = nixpkgs.legacyPackages.x86_64-linux; in {
      packages.x86_64-linux.default = pkgs.buildEnv {
        name = "nix-research-tools";
        paths = with pkgs; [
          nixVersions.latest nixfmt statix deadnix nixd nil flake-checker
          nix-update nurl nix-prefetch-git nix-tree nix-diff treefmt
          git jq coreutils findutils gnugrep gnused bash curl skopeo
        ];
      };
    };
}
