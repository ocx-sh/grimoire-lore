#!/bin/sh
exec /opt/zig/zig cc -target aarch64-linux-musl -static "$@"
