#!/usr/bin/env bash
# Research-lang Nix toolchain wrapper (reconstructed 2026-09-27 after the
# original file vanished mid-session from this shared cache dir — verbatim
# from the bwrap invocation captured live via `ps aux` while a build using
# it was still running, not reinvented). Enters the shared on-disk store
# through bwrap directly (bypassing nix-portable's own launcher, which forces
# WAL off and races on start-up). Usage: run.sh <command> [args...]
set -euo pipefail
T="$HOME/.cache/research-lang/nix-tools"
exec /usr/sbin/bwrap \
  --die-with-parent \
  --bind "$T/.nix-portable/emptyroot" / \
  --dev-bind /dev /dev \
  --bind "$T/.nix-portable/nix" /nix \
  --bind /afs /afs \
  --bind /bin /bin \
  --bind /etc /etc \
  --bind /home /home \
  --bind /init /init \
  --bind /lib /lib \
  --bind /lib64 /lib64 \
  --bind "/lost+found" "/lost+found" \
  --bind /media /media \
  --bind /mnt /mnt \
  --bind /opt /opt \
  --bind /proc /proc \
  --bind /root /root \
  --bind /run /run \
  --bind /sbin /sbin \
  --bind /srv /srv \
  --bind /sys /sys \
  --bind /tmp /tmp \
  --bind /usr /usr \
  --bind /var /var \
  --bind /.autorelabel /.autorelabel \
  --bind /.profile /.profile \
  --chdir "$PWD" \
  --setenv NIX_CONF_DIR "$T/conf" \
  --setenv NIX_CONFIG "access-tokens = github.com=$(gh auth token 2>/dev/null)" \
  --setenv XDG_CACHE_HOME "$T/xdg-cache" \
  --setenv SSL_CERT_FILE /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem \
  --setenv NIX_SSL_CERT_FILE /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem \
  --setenv PATH "/nix/store/5jir1nspka2hhr405c1f68yfccjjv7z7-nix-research-tools/bin:/usr/bin:/bin" \
  "$@"
