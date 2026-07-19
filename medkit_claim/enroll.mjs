import { Barretenberg, Fr } from '@aztec/bb.js';
import { writeFileSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const DEPTH = 8;
const PROGRAM_ID = process.argv[2] || '1'; // which aid program

// Beneficiaries the NGO enrolls (in-person registration -> issue secret credential)
const lines = readFileSync('enrollees.csv', 'utf8').trim().split('\n');
const rows = lines[0].toLowerCase().includes('id') ? lines.slice(1) : lines;
const enrollees = rows.map(l => {
  const [id] = l.split(',').map(s => s.trim());
  const secret = BigInt('0x' + randomBytes(31).toString('hex'));
  return { id, secret };
});

const fr = (x) => new Fr(Buffer.from(BigInt(x).toString(16).padStart(64, '0'), 'hex'));
const bb = await Barretenberg.new();
const ped = async (a, b) => bb.pedersenHash([fr(a), fr(b)], 0);
const ped1 = async (a) => bb.pedersenHash([fr(a)], 0);

const prog = BigInt(PROGRAM_ID);
let leaves = [];
for (const e of enrollees) leaves.push(await ped(e.secret, prog));
while (leaves.length < 2 ** DEPTH) leaves.push(fr(0));

const layers = [leaves]; let cur = leaves;
while (cur.length > 1) {
  const nx = []; for (let i = 0; i < cur.length; i += 2) nx.push(await ped(cur[i], cur[i + 1]));
  layers.push(nx); cur = nx;
}
const id_root = cur[0].toString();

const out = [];
for (let k = 0; k < enrollees.length; k++) {
  let idx = k; const path = [], bits = [];
  for (let d = 0; d < DEPTH; d++) { path.push(layers[d][idx ^ 1].toString()); bits.push((idx & 1) === 1); idx >>= 1; }
  out.push({
    id: enrollees[k].id,
    secret: '0x' + enrollees[k].secret.toString(16),
    programId: prog.toString(),
    nullifier: (await ped1(enrollees[k].secret)).toString(),
    path, bits,
  });
}

writeFileSync('id-tree.json', JSON.stringify({ root: id_root, programId: prog.toString(), enrollees: out }, null, 2));
writeFileSync('id-cards.json', JSON.stringify(out.map(e => ({ id: e.id, secret: e.secret })), null, 2));
console.log('ID ROOT:', id_root);
console.log('Enrolled', out.length, 'beneficiaries in program', prog.toString(), '-> id-tree.json, id-cards.json');
await bb.destroy();
