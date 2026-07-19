import { Barretenberg, Fr } from '@aztec/bb.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

const DEPTH = 8;
// category passed as arg: 'medical' -> programId 1
const CATEGORY = process.argv[2] || 'medical';
const CAT_ID = { medical: 1n, education: 2n, refugee: 3n }[CATEGORY] || 1n;
const TREE = `pass-tree-${CATEGORY}.json`;

const fr = (x) => new Fr(Buffer.from(BigInt(x).toString(16).padStart(64, '0'), 'hex'));
const bb = await Barretenberg.new();
const ped = async (a, b) => bb.pedersenHash([fr(a), fr(b)], 0);
const ped1 = async (a) => bb.pedersenHash([fr(a)], 0);

let passes = [];
if (existsSync(TREE)) { const t = JSON.parse(readFileSync(TREE, 'utf8')); passes = t.passes || []; }

// issue a NEW pass: fresh random secret, bound to category
const secret = BigInt('0x' + randomBytes(31).toString('hex'));
passes.push({ secret: '0x' + secret.toString(16), catId: CAT_ID.toString() });

let leaves = [];
for (const p of passes) leaves.push(await ped(BigInt(p.secret), BigInt(p.catId)));
while (leaves.length < 2 ** DEPTH) leaves.push(fr(0));
const layers = [leaves]; let cur = leaves;
while (cur.length > 1) {
  const nx = []; for (let i = 0; i < cur.length; i += 2) nx.push(await ped(cur[i], cur[i + 1]));
  layers.push(nx); cur = nx;
}
const root = cur[0].toString();

const out = [];
for (let k = 0; k < passes.length; k++) {
  let idx = k; const path = [], bits = [];
  for (let d = 0; d < DEPTH; d++) { path.push(layers[d][idx ^ 1].toString()); bits.push((idx & 1) === 1); idx >>= 1; }
  out.push({
    passId: k,
    secret: passes[k].secret,
    catId: passes[k].catId,
    nullifier: (await ped1(BigInt(passes[k].secret))).toString(),
    path, bits,
  });
}

writeFileSync(TREE, JSON.stringify({ root, category: CATEGORY, catId: CAT_ID.toString(), passes, credentials: out }, null, 2));
const newId = passes.length - 1;
console.log(JSON.stringify({ ok: true, passId: newId, secret: passes[newId].secret, category: CATEGORY, catId: CAT_ID.toString(), root, issued: passes.length }));
await bb.destroy();
