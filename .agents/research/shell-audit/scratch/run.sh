#!/usr/bin/env bash
# Run a command with the current shell toolchain on PATH (fish 4.9.3, nu 0.116.0,
# elvish 0.21.0, pwsh 7.6.6, shellcheck 0.11.0, shfmt 3.13.1).
# RUN_GROUP=old selects fish 4.7.0 / nu 0.105.1 instead.
T="$(cd "$(dirname "$0")" && pwd)"
exec ocx --project "$T/ocx.toml" exec ${RUN_GROUP:+-g "$RUN_GROUP"} -- "$@"
