import { Barretenberg, Fr } from '@aztec/bb.js';
import { writeFileSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const DEPTH = 8;
const PROGRAM_ID = 1n; // aid program id for the identity layer

const lines = readFileSync('recipients.csv', 'utf8').trim().split('\n');
const rows = lines[0].toLowerCase().includes('id') ? lines.slice(1) : lines;
const recipients = rows.map(l => {
  const [id, amount] = l.split(',').map(s => s.trim());
  const secret = BigInt('0x' + randomBytes(31).toString('hex')); // ONE key per person
  return { id, amount: BigInt(amount), secret };
});

const fr = (x) => new Fr(Buffer.from(BigInt(x).toString(16).padStart(64, '0'), 'hex'));
const bb = await Barretenberg.new();
const ped = async (a, b) => bb.pedersenHash([fr(a), fr(b)], 0);
const ped1 = async (a) => bb.pedersenHash([fr(a)], 0);

// helper: build a Merkle tree from leaves, return {root, layers}
const buildTree = (leaves) => {
  const padded = [...leaves];
  // (caller pre-pads)
  const layers = [padded]; let cur = padded;
  return { layers, cur };
};

// ---- RECIPIENT TREE (claim): leaf = pedersen(secret, amount) ----
let rLeaves = [];
for (const r of recipients) rLeaves.push(await ped(r.secret, r.amount));
while (rLeaves.length < 2 ** DEPTH) rLeaves.push(fr(0));
let rLayers = [rLeaves]; let rCur = rLeaves;
while (rCur.length > 1) {
  const nx = []; for (let i = 0; i < rCur.length; i += 2) nx.push(await ped(rCur[i], rCur[i + 1]));
  rLayers.push(nx); rCur = nx;
}
const root = rCur[0].toString();

// ---- IDENTITY TREE (enrollment): leaf = pedersen(secret, program_id) ----
let iLeaves = [];
for (const r of recipients) iLeaves.push(await ped(r.secret, PROGRAM_ID));
while (iLeaves.length < 2 ** DEPTH) iLeaves.push(fr(0));
let iLayers = [iLeaves]; let iCur = iLeaves;
while (iCur.length > 1) {
  const nx = []; for (let i = 0; i < iCur.length; i += 2) nx.push(await ped(iCur[i], iCur[i + 1]));
  iLayers.push(nx); iCur = nx;
}
const idRoot = iCur[0].toString();

// ---- per-person proofs data for BOTH trees, keyed to the same secret ----
const rOut = [], iOut = [];
for (let k = 0; k < recipients.length; k++) {
  // recipient path
  let idx = k; const rPath = [], rBits = [];
  for (let d = 0; d < DEPTH; d++) { rPath.push(rLayers[d][idx ^ 1].toString()); rBits.push((idx & 1) === 1); idx >>= 1; }
  // identity path
  let idx2 = k; const iPath = [], iBits = [];
  for (let d = 0; d < DEPTH; d++) { iPath.push(iLayers[d][idx2 ^ 1].toString()); iBits.push((idx2 & 1) === 1); idx2 >>= 1; }

  const secretHex = '0x' + recipients[k].secret.toString(16);
  rOut.push({
    id: recipients[k].id,
    secret: secretHex,
    amount: recipients[k].amount.toString(),
    nullifier: (await ped1(recipients[k].secret)).toString(),
    path: rPath, bits: rBits,
  });
  iOut.push({
    id: recipients[k].id,
    secret: secretHex,
    programId: PROGRAM_ID.toString(),
    nullifier: (await ped1(recipients[k].secret)).toString(),
    path: iPath, bits: iBits,
  });
}

// recipient tree (claim contract reads this)
writeFileSync('tree.json', JSON.stringify({ root, recipients: rOut }, null, 2));
// identity tree (enrollment verifier reads this)
writeFileSync('id-tree.json', JSON.stringify({ root: idRoot, programId: PROGRAM_ID.toString(), enrollees: iOut }, null, 2));
// ONE key per person — used for BOTH identity proof and claim
writeFileSync('tickets.json', JSON.stringify(rOut.map(r => ({ id: r.id, secret: r.secret })), null, 2));
writeFileSync('id-cards.json', JSON.stringify(iOut.map(e => ({ id: e.id, secret: e.secret })), null, 2));

console.log('RECIPIENT ROOT:', root);
console.log('IDENTITY ROOT: ', idRoot);
console.log('Built unified trees for', rOut.length, 'people — one key each (tree.json, id-tree.json, tickets.json, id-cards.json)');
await bb.destroy();
