#!/usr/bin/env bash
# Blob-less clones of the reference corpus for the code-docs program.
# Writes shas.tsv: repo, lang, kind, head_sha, head_date, snap_sha, snap_date.
# Snapshot = last commit before 2022-01-01, the pre-assistant baseline.
set -u
DEST=${DEST:-$HOME/.cache/research-lang/exemplars/code-docs}
CUTOFF=2022-01-01
mkdir -p "$DEST"
cd "$DEST"
REPOS="
rust app BurntSushi/ripgrep
rust app rust-lang/cargo
rust lib tokio-rs/tokio
rust lib serde-rs/serde
rust app sharkdp/fd
rust app sharkdp/bat
rust lib clap-rs/clap
rust app rust-lang/rust-analyzer
rust app jj-vcs/jj
rust app astral-sh/uv
rust app casey/just
rust app helix-editor/helix
rust lib rustls/rustls
go lib spf13/cobra
go app cli/cli
go app junegunn/fzf
go lib etcd-io/bbolt
go app restic/restic
go app caddyserver/caddy
python lib psf/requests
python lib pallets/flask
python app pypa/pip
python lib encode/httpx
python lib python-attrs/attrs
python app psf/black
ts app vitejs/vite
ts lib colinhacks/zod
ts app typescript-eslint/typescript-eslint
ts lib denoland/std
java lib google/guava
java lib square/retrofit
kotlin lib square/okhttp
kotlin lib Kotlin/kotlinx.coroutines
"
: > shas.tsv.tmp
echo "$REPOS" | while read -r lang kind repo; do
  [ -z "$repo" ] && continue
  dir=${repo//\//__}
  if [ ! -d "$dir/.git" ]; then
    git clone -q --filter=blob:none --no-checkout "https://github.com/$repo.git" "$dir" || { echo "FAIL $repo" >&2; continue; }
  fi
  head=$(git -C "$dir" rev-parse HEAD)
  hdate=$(git -C "$dir" log -1 --format=%cs "$head")
  snap=$(git -C "$dir" rev-list -1 --before=$CUTOFF HEAD)
  sdate=$( [ -n "$snap" ] && git -C "$dir" log -1 --format=%cs "$snap" || echo -)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$repo" "$lang" "$kind" "$head" "$hdate" "${snap:--}" "$sdate" >> shas.tsv.tmp
  echo "ok $repo head=$hdate snap=$sdate"
done
mv shas.tsv.tmp shas.tsv
