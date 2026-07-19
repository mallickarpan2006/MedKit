#!/usr/bin/env bash
# prove-testnet.sh <recipientId> <stellarAddress>
set -e
ID="$1"; ADDR="$2"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIRCUIT="$REPO/contracts/verifier-v26/circuits/medkit"
export PATH="$HOME/.nargo/bin:$HOME/.bb/bin:$PATH"

# 1. generate Prover.toml bound to ADDR (reuse existing prove.sh logic)
cd "$REPO/medkit_claim"
node -e '
const fs=require("fs");
const { Address }=require("@stellar/stellar-sdk");
const { keccak256 }=require("js-sha3");
const t=JSON.parse(fs.readFileSync("tree.json"));
const r=t.recipients.find(x=>x.id===process.argv[1]);
if(!r){console.error("no recipient");process.exit(1);}
const h=keccak256.array(Buffer.from(Address.fromString(process.argv[2]).toScVal().toXDR())); h[0]=0;
const payout="0x"+Buffer.from(h).toString("hex");
fs.writeFileSync(process.argv[3],
`secret = "${r.secret}"
amount = "${r.amount}"
path = [${r.path.map(p=>`"${p}"`).join(", ")}]
index_bits = [${r.bits.join(", ")}]
root = "${t.root}"
nullifier = "${r.nullifier}"
payout_address = "${payout}"
`);
' "$ID" "$ADDR" "$CIRCUIT/Prover.toml"

# 2. build proof with v26 toolchain (bb v0.87.0)
cd "$REPO/contracts/verifier-v26"
bash ./circuits/scripts/build_all.sh medkit >/dev/null 2>&1

# 3. copy artifacts back for server.mjs
cp "$CIRCUIT/target/proof" "$REPO/medkit_claim/target/proof"
cp "$CIRCUIT/target/public_inputs" "$REPO/medkit_claim/target/public_inputs"
echo "proof ready for $ID -> $ADDR"
