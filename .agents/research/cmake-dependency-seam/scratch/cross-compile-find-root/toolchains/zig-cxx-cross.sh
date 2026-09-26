#!/bin/sh
exec /opt/zig/zig c++ -target aarch64-linux-gnu "$@"
