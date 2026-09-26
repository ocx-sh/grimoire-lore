#!/bin/sh
echo "EMULATOR-WRAPPED: $*"
exec "$@"
