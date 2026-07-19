#!/usr/bin/env bash
node -e '
const fs=require("fs");
const { Address }=require("@stellar/stellar-sdk");
const { keccak256 }=require("js-sha3");
const t=JSON.parse(fs.readFileSync("tree.json"));
const r=t.recipients.find(x=>x.id===process.argv[1]);
if(!r){console.error("no recipient");process.exit(1);}
const h=keccak256.array(Buffer.from(Address.fromString(process.argv[2]).toScVal().toXDR())); h[0]=0;
const payout="0x"+Buffer.from(h).toString("hex");
fs.writeFileSync("Prover.toml",
`secret = "${r.secret}"
amount = "${r.amount}"
path = [${r.path.map(p=>`"${p}"`).join(", ")}]
index_bits = [${r.bits.join(", ")}]
root = "${t.root}"
nullifier = "${r.nullifier}"
payout_address = "${payout}"
`);
' "$1" "$2"
nargo execute witness
BBJS="./node_modules/@aztec/bb.js/dest/node/main.js"
node "$BBJS" write_vk_ultra_keccak_honk -b ./target/medkit_claim.json -o ./target/vk
node "$BBJS" prove_ultra_keccak_honk -b ./target/medkit_claim.json -w ./target/witness.gz -o ./target/proof.with_public_inputs
head -c 128 target/proof.with_public_inputs > target/public_inputs
tail -c +129 target/proof.with_public_inputs > target/proof
echo "Proof ready for $1 (bound to $2)"
