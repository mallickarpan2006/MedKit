import { readFileSync, writeFileSync } from 'fs';

// prove-medical.mjs <credentialId>  (or the secret directly via --secret)
const arg = process.argv[2];
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const CIRCUIT = join(dirname(fileURLToPath(import.meta.url)), '../contracts/verifier-v26/circuits/medkit_identity');
const tree = JSON.parse(readFileSync('med-tree.json', 'utf8'));

let c = null;
if (arg && arg.startsWith('0x')) {
  // find by secret (patient pastes their secret)
  c = tree.credentials.find(x => x.secret.toLowerCase() === arg.toLowerCase());
} else {
  // find by credentialId
  c = tree.credentials.find(x => String(x.credentialId) === String(arg));
}
if (!c) { console.error('No credential for', arg); process.exit(1); }

// Reuse the medkit_identity circuit: docType plays the role of program_id.
const toml = `enroll_secret = "${c.secret}"
program_id = "${c.docType}"
path = [${c.path.map(p => `"${p}"`).join(', ')}]
index_bits = [${c.bits.join(', ')}]
id_root = "${tree.root}"
id_nullifier = "${c.nullifier}"
`;

writeFileSync(CIRCUIT + '/Prover.toml', toml);
console.log('Prover.toml written for credential', c.credentialId, '(docType', c.docType + ')');
