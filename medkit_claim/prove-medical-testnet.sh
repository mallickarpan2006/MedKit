#!/usr/bin/env bash
# prove-medical-testnet.sh <secretOrCredentialId>
set -e
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.nargo/bin:$HOME/.bb/bin:$PATH"
cd "$REPO/medkit_claim"
node prove-medical.mjs "$1"
cd "$REPO/contracts/verifier-v26"
bash ./circuits/scripts/build_all.sh medkit_identity >/dev/null 2>&1
cp "$REPO/contracts/verifier-v26/circuits/medkit_identity/target/proof" "$REPO/medkit_claim/target/med_proof"
cp "$REPO/contracts/verifier-v26/circuits/medkit_identity/target/public_inputs" "$REPO/medkit_claim/target/med_public_inputs"
echo "medical proof ready"
