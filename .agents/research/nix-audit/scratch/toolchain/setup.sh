#!/usr/bin/env bash
# Rebuild the rootless Nix research toolchain and the exemplar corpus from this directory.
# Result: ~/.cache/research-lang/nix-tools/run.sh (Nix 2.35.2 + nixfmt/statix/deadnix/...)
# and ~/.cache/research-lang/exemplars/nix at the SHAs the audits cite. Idempotent.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
D="$HOME/.cache/research-lang/nix-tools"
mkdir -p "$D/toolchain" "$D/conf" "$D/fixtures"
[ -x "$D/nix-portable" ] || { curl -fsSL -o "$D/nix-portable" https://github.com/DavHau/nix-portable/releases/latest/download/nix-portable-x86_64; chmod +x "$D/nix-portable"; }
cp "$HERE/flake.nix" "$HERE/flake.lock" "$D/toolchain/" 2>/dev/null || cp "$HERE/flake.nix" "$D/toolchain/"
cp "$HERE/run.sh" "$D/run.sh"
cat > "$D/conf/nix.conf" <<CONF
build-users-group =
experimental-features = nix-command flakes
ignored-acls = security.selinux system.nfs4_acl
use-sqlite-wal = true
sandbox = true
sandbox-paths = /bin/sh=$D/.nix-portable/busybox/bin/busybox
max-jobs = 2
connect-timeout = 20
stalled-download-timeout = 120
CONF
# One-time bootstrap through the launcher, single process only (it forces WAL off and races).
NP_LOCATION="$D" NP_RUNTIME=bwrap NIX_CONFIG="access-tokens = github.com=$(gh auth token)" \
  "$D/nix-portable" nix build "$D/toolchain" --out-link "$D/toolchain/result"
"$D/run.sh" nix --version
"$HERE/../fetch-at-sha.sh" "$HOME/.cache/research-lang/exemplars/nix"
cp "$HERE/../nix-fetch.log" "$HOME/.cache/research-lang/exemplars/nix-fetch.log"
