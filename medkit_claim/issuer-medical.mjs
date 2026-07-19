import { Barretenberg, Fr } from '@aztec/bb.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

const DEPTH = 8;
const TREE = 'med-tree.json';        // the issuer's credential tree (commitments only)
const RECORDS = 'med-records.json';  // hospital's OWN records (patientRef <-> credentialId), never used by MedKit

// Usage: node issuer-medical.mjs <patientRef> <docType>
// docType: 1 = general sickness credential, 2 = test result, etc.
const patientRef = process.argv[2] || 'patient';
const docType = BigInt(process.argv[3] || '1');

const fr = (x) => new Fr(Buffer.from(BigInt(x).toString(16).padStart(64, '0'), 'hex'));
const bb = await Barretenberg.new();
const ped = async (a, b) => bb.pedersenHash([fr(a), fr(b)], 0);
const ped1 = async (a) => bb.pedersenHash([fr(a)], 0);

// load existing credentials (list of {secret, docType})
let creds = [];
if (existsSync(TREE)) {
  const t = JSON.parse(readFileSync(TREE, 'utf8'));
  creds = t.creds || [];
}

// issue a NEW credential: random secret for this patient
const secret = BigInt('0x' + randomBytes(31).toString('hex'));
creds.push({ secret: '0x' + secret.toString(16), docType: docType.toString() });

// rebuild the tree from all credentials
let leaves = [];
for (const c of creds) leaves.push(await ped(BigInt(c.secret), BigInt(c.docType)));
while (leaves.length < 2 ** DEPTH) leaves.push(fr(0));
const layers = [leaves]; let cur = leaves;
while (cur.length > 1) {
  const nx = []; for (let i = 0; i < cur.length; i += 2) nx.push(await ped(cur[i], cur[i + 1]));
  layers.push(nx); cur = nx;
}
const root = cur[0].toString();

// build per-credential proof data
const out = [];
for (let k = 0; k < creds.length; k++) {
  let idx = k; const path = [], bits = [];
  for (let d = 0; d < DEPTH; d++) { path.push(layers[d][idx ^ 1].toString()); bits.push((idx & 1) === 1); idx >>= 1; }
  out.push({
    credentialId: k,
    secret: creds[k].secret,
    docType: creds[k].docType,
    nullifier: (await ped1(BigInt(creds[k].secret))).toString(),
    path, bits,
  });
}

writeFileSync(TREE, JSON.stringify({ root, creds, credentials: out }, null, 2));

// hospital's own private record linking patientRef -> credentialId (STAYS with hospital, never sent to MedKit)
let records = existsSync(RECORDS) ? JSON.parse(readFileSync(RECORDS, 'utf8')) : [];
const newId = creds.length - 1;
records.push({ patientRef, credentialId: newId, docType: docType.toString(), issuedAt: Date.now() });
writeFileSync(RECORDS, JSON.stringify(records, null, 2));

// output the patient's credential (the secret they carry)
console.log(JSON.stringify({
  ok: true,
  credentialId: newId,
  secret: creds[newId].secret,
  docType: docType.toString(),
  root,
  issued: creds.length,
}));
await bb.destroy();
