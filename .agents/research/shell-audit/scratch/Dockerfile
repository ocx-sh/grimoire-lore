ARG BASE=debian:12-slim
FROM ${BASE}
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    dash mksh ksh yash posh zsh fish bash busybox procps coreutils && rm -rf /var/lib/apt/lists/*
