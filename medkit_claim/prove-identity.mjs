import { readFileSync, writeFileSync } from 'fs';

const id = process.argv[2] || 'amina';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const CIRCUIT = join(dirname(fileURLToPath(import.meta.url)), '../contracts/verifier-v26/circuits/medkit_identity');
const tree = JSON.parse(readFileSync('id-tree.json', 'utf8'));
const e = tree.enrollees.find(x => x.id === id);
if (!e) { console.error('No enrollee:', id); process.exit(1); }

const toml = `enroll_secret = "${e.secret}"
program_id = "${e.programId}"
path = [${e.path.map(p => `"${p}"`).join(', ')}]
index_bits = [${e.bits.join(', ')}]
id_root = "${tree.root}"
id_nullifier = "${e.nullifier}"
`;

writeFileSync(CIRCUIT + '/Prover.toml', toml);
console.log('Prover.toml written for', id, '(program', e.programId + ')');
