#!/usr/bin/env bash
set -e

sed 's/\(google\/protobuf\)/\.\/\1/' trezor-common/protob/config.proto > trezor-common/protob/config_fixed.proto

$(npm bin)/proto2js trezor-common/protob/config_fixed.proto -commonjs > config_proto_compiled.js 

rm trezor-common/protob/config_fixed.proto

