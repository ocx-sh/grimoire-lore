#!/usr/bin/env bash
# Blob-less depth-1 clones of C# exemplars. Full checkout except binaries/docs;
# monorepos get a sparse path list (REPO=path1,path2).
set -u
DEST="$1"
REPOS=(
  Tyrrrz/CliWrap adamralph/simple-exec madelson/MedallionShell pulumi/pulumi-dotnet
  testcontainers/testcontainers-dotnet nuke-build/nuke cake-build/cake dotnet/command-line-api
  spectreconsole/spectre.console octokit/octokit.net stripe/stripe-dotnet openai/openai-dotnet
  anthropics/anthropic-sdk-csharp App-vNext/Polly npgsql/npgsql nodatime/nodatime serilog/serilog
  xunit/xunit Humanizr/Humanizer FluentValidation/FluentValidation DapperLib/Dapper
  StackExchange/StackExchange.Redis MessagePack-CSharp/MessagePack-CSharp dotnet/BenchmarkDotNet
  meziantou/Meziantou.Analyzer DotNetAnalyzers/StyleCopAnalyzers dotnet/roslynator microsoft/vs-threading
  microsoft/testfx dotnet/sourcelink coverlet-coverage/coverlet GitTools/GitVersion
  Azure/azure-sdk-for-net=sdk/core/Azure.Core,eng/Directory.Build.Common.props,eng/Packages.Data.props,Directory.Build.props,global.json,.editorconfig,NuGet.Config
  dotnet/aspire=src/Aspire.Hosting/Dcp,Directory.Build.props,Directory.Packages.props,global.json,.editorconfig,eng/Versions.props
  PowerShell/PowerShell=src/System.Management.Automation/engine/NativeCommandProcessor.cs,Directory.Build.props,global.json,.editorconfig,nuget.config
)
one() {
  local spec="$1" repo="${1%%=*}" dir="$DEST/${1%%=*}"; dir="${dir//\//__}"; dir="$DEST/${repo//\//__}"
  [ -d "$dir/.git" ] && { echo "skip $repo"; return; }
  git clone -q --filter=blob:none --depth 1 --no-checkout "https://github.com/$repo.git" "$dir" 2>&1 | tail -1 || return
  if [[ "$spec" == *=* ]]; then
    IFS=, read -ra P <<< "${spec#*=}"; git -C "$dir" sparse-checkout set --no-cone "${P[@]/#//}" 2>/dev/null
  else
    git -C "$dir" sparse-checkout set --no-cone '/*' '!/**/*.png' '!/**/*.jpg' '!/**/*.gif' '!/**/*.svg' '!/**/*.ico' '!/**/*.dll' '!/**/*.nupkg' '!/**/*.zip' '!/docs/**' '!/**/*.pdf' 2>/dev/null
  fi
  git -C "$dir" checkout -q 2>&1 | tail -1
  echo "ok   $repo $(git -C "$dir" rev-parse --short=12 HEAD) $(find "$dir" -name '*.cs' -not -path '*/.git/*' | wc -l) cs"
}
export -f one; export DEST
printf '%s\n' "${REPOS[@]}" | xargs -P 6 -I{} bash -c 'one "{}"'
echo DONE
