#!/usr/bin/env bash
# Shell exemplar corpus for the research-lang shell program (2026-10-10).
# Blob-less depth-1 clones. Small repos: full checkout minus binaries.
# Large repos: sparse checkout of shell sources only (SHELL_PATS + per-repo dirs).
# Usage: fetch-exemplars.sh <dest-dir>   (never tmpfs; use ~/.cache/research-lang/exemplars/shell)
set -u
DEST="$1"; mkdir -p "$DEST"
SHELL_PATS="*.sh *.bash *.zsh *.ksh *.fish *.nu *.elv *.ps1 *.psm1 *.psd1 .shellcheckrc /.github/ /*.md /.editorconfig"
REPOS=(
  # POSIX sh / bash installers and tools
  "rust-lang/rustup" "nvm-sh/nvm" "Homebrew/install" "denoland/deno_install" "docker/docker-install"
  "acmesh-official/acme.sh" "axodotdev/cargo-dist" "dotnet/install-scripts" "pyenv/pyenv" "rbenv/rbenv"
  "dylanaraps/pure-bash-bible" "bats-core/bats-core" "shellspec/shellspec"
  "k3s-io/k3s|/install.sh /scripts/" "microsoft/vcpkg|/scripts/ /bootstrap-vcpkg.sh /bootstrap-vcpkg.bat"
  "git/git|/t/ /git-sh-setup.sh /git-sh-i18n.sh" "oils-for-unix/oils|/spec/ /doc/"
  # zsh
  "ohmyzsh/ohmyzsh" "romkatv/powerlevel10k" "zsh-users/zsh-autosuggestions"
  # multi-shell emitters (activation, hooks, completions)
  "ajeetdsouza/zoxide" "direnv/direnv" "junegunn/fzf" "starship/starship|/src/init/ /install/"
  "jdx/mise|/src/shell/ /e2e/" "atuinsh/atuin|/crates/atuin/src/shell/" "conda/conda|/conda/shell/ /conda/activate.py"
  "JanDeDobbeleer/oh-my-posh|/src/shell/"
  # fish, nushell, elvish
  "fish-shell/fish-shell|/share/ /tests/checks/ /CHANGELOG.rst" "jorgebucaran/fisher" "nushell/nu_scripts"
  "nushell/nushell|/crates/nu-std/ /crates/nu-utils/src/default_files/" "elves/elvish|/pkg/mods/ /website/"
  # PowerShell
  "PowerShell/PowerShell|/tools/ /build.psm1" "PowerShell/PSScriptAnalyzer" "pester/Pester"
  "ScoopInstaller/Install" "ScoopInstaller/Scoop" "dahlbyk/posh-git"
  # platform facts
  "actions/runner-images|/images/"
)
clone() {
  local spec="$1" repo="${1%%|*}" extra="" dir
  [[ "$spec" == *"|"* ]] && extra="${spec#*|}"
  dir="$DEST/${repo//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --single-branch --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1
  if [ -n "$extra" ]; then
    # shellcheck disable=SC2086
    git -C "$dir" sparse-checkout set --no-cone $SHELL_PATS $extra 2>/dev/null
  else
    git -C "$dir" sparse-checkout set --no-cone '/*' '!/**/*.png' '!/**/*.jpg' '!/**/*.jpeg' '!/**/*.gif' \
      '!/**/*.pdf' '!/**/*.mp4' '!/**/*.zip' '!/**/*.tar.gz' '!/**/*.ttf' '!/**/*.woff*' 2>/dev/null
  fi
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse HEAD) $(git -C "$dir" ls-files | wc -l) files"
}
export -f clone; export DEST SHELL_PATS
printf '%s\n' "${REPOS[@]}" | grep -v '^#' | xargs -P 6 -I{} bash -c 'clone "$1"' _ {}
# ShellCheck wiki (SC code catalog) as a corpus document
[ -d "$DEST/koalaman__shellcheck.wiki/.git" ] || git clone -q --depth 1 https://github.com/koalaman/shellcheck.wiki.git "$DEST/koalaman__shellcheck.wiki" && echo "ok   shellcheck.wiki $(git -C "$DEST/koalaman__shellcheck.wiki" rev-parse HEAD)"
echo DONE
