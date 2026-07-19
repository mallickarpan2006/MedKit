#!/usr/bin/env bash
# prove-identity-testnet.sh <enrolleeId>
set -e
ID="$1"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.nargo/bin:$HOME/.bb/bin:$PATH"

cd "$REPO/medkit_claim"
# 1. write Prover.toml for this enrollee
node prove-identity.mjs "$ID"

# 2. build proof with v26 toolchain
cd "$REPO/contracts/verifier-v26"
bash ./circuits/scripts/build_all.sh medkit_identity >/dev/null 2>&1

# 3. copy artifacts back for server.mjs
cp "$REPO/contracts/verifier-v26/circuits/medkit_identity/target/proof" "$REPO/medkit_claim/target/id_proof"
cp "$REPO/contracts/verifier-v26/circuits/medkit_identity/target/public_inputs" "$REPO/medkit_claim/target/id_public_inputs"
echo "identity proof ready for $ID"
