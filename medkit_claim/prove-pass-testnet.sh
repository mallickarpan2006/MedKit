#!/usr/bin/env bash
set -e
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.nargo/bin:$HOME/.bb/bin:$PATH"
cd "$REPO/medkit_claim"
node prove-pass.mjs "$1" "$2"
cd "$REPO/contracts/verifier-v26"
bash ./circuits/scripts/build_all.sh medkit_identity >/dev/null 2>&1
cp "$REPO/contracts/verifier-v26/circuits/medkit_identity/target/proof" "$REPO/medkit_claim/target/pass_proof"
cp "$REPO/contracts/verifier-v26/circuits/medkit_identity/target/public_inputs" "$REPO/medkit_claim/target/pass_public_inputs"
echo "pass proof ready"
