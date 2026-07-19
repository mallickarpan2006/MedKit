#!/usr/bin/env bash
set -euo pipefail

: "${STELLAR_NETWORK:=testnet}"
: "${STELLAR_SOURCE:?Set STELLAR_SOURCE to a local Stellar CLI identity; never pass a secret key here}"
: "${POOL_WASM:=contracts/pool/target/wasm32v1-none/release/medkit_pool.wasm}"

if [[ ! -f "$POOL_WASM" ]]; then
  cargo build --manifest-path contracts/pool/Cargo.toml --target wasm32v1-none --release
fi

echo "Deploying pool artifact on ${STELLAR_NETWORK} with source ${STELLAR_SOURCE}"
POOL_ID="$(stellar contract deploy --wasm "$POOL_WASM" --source "$STELLAR_SOURCE" --network "$STELLAR_NETWORK")"
echo "POOL_ID=${POOL_ID}"
echo "Record the returned deployment transaction hash from the Stellar CLI in deployment.json and release evidence."
