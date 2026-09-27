# FOD for one OCI layer. The OCI digest "sha256:<hex>" is passed verbatim as `hash`
# (a Nix-accepted prefixed hash): no conversion, no second stored copy, no prefetch.
# Transport: nixpkgs fetchurl with ghcr.io's anonymous bearer placeholder.
{ lib, fetchurl }:
{
  repo,
  digest,
  header ? true,
}:
fetchurl (
  {
    name = "ocx-layer-${builtins.substring 7 12 digest}.tar.xz";
    url = "https://ghcr.io/v2/${repo}/blobs/${digest}";
    hash = digest;
  }
  // lib.optionalAttrs header {
    curlOptsList = [
      "-H"
      "Authorization: Bearer QQ=="
    ];
  }
)
