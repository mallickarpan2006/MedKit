import { readFileSync, writeFileSync } from 'fs';

// prove-pass.mjs <category> <secretOr passId>
const category = process.argv[2] || 'medical';
const arg = process.argv[3];
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const CIRCUIT = join(dirname(fileURLToPath(import.meta.url)), '../contracts/verifier-v26/circuits/medkit_identity');
const tree = JSON.parse(readFileSync(`pass-tree-${category}.json`, 'utf8'));

let c = null;
if (arg && arg.startsWith('0x')) c = tree.credentials.find(x => x.secret.toLowerCase() === arg.toLowerCase());
else c = tree.credentials.find(x => String(x.passId) === String(arg));
if (!c) { console.error('No pass for', arg); process.exit(1); }

const toml = `enroll_secret = "${c.secret}"
program_id = "${c.catId}"
path = [${c.path.map(p => `"${p}"`).join(', ')}]
index_bits = [${c.bits.join(', ')}]
id_root = "${tree.root}"
id_nullifier = "${c.nullifier}"
`;
writeFileSync(CIRCUIT + '/Prover.toml', toml);
console.log('Prover.toml written for pass', c.passId, '(category', category + ')');
