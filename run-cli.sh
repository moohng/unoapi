#!/bin/bash
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
node packages/cli/dist/cli.js "$@"
