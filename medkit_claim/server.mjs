import express from 'express';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const deployment = JSON.parse(readFileSync(join(ROOT, 'deployment.json')));
const NET = process.env.MEDKIT_NETWORK || deployment.network;
const SRC = process.env.MEDKIT_SOURCE || 'medkit-testnet-20260719';
const VW = process.env.MEDKIT_VERIFIER_WASM || join(ROOT, '../contracts/verifier-v26/target/wasm32v1-none/release/rs_soroban_ultrahonk.wasm');
const PW = process.env.MEDKIT_POOL_WASM || join(ROOT, '../contracts/pool/target/wasm32v1-none/release/medkit_pool.wasm');
const BBJS = './node_modules/@aztec/bb.js/dest/node/main.js';
const STATE = join(ROOT, 'demo-state.json');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const sh = (cmd) => { try { return execSync(cmd + ' 2>&1', { encoding: 'utf8', cwd: ROOT }); } catch (e) { const o = (e.stdout || '') + (e.stderr || ''); if (o) return o; throw e; } };
const SAFE_ID = /^[A-Za-z0-9_.-]{1,128}$/;
const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;
const assertSafeId = (value, label = 'id') => {
  if (!SAFE_ID.test(String(value || ''))) throw new Error(`Invalid ${label}`);
  return String(value);
};
const assertAccount = (value) => {
  if (!STELLAR_ACCOUNT.test(String(value || ''))) throw new Error('Invalid Stellar payout address');
  return String(value);
};

// ---- hybrid narration: human story + real commands ----
const C = { dim:'\x1b[2m', cyan:'\x1b[36m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', bold:'\x1b[1m', reset:'\x1b[0m' };
const banner = (emoji, title) => {
  const line = '\u2501'.repeat(54);
  console.log(`\n${C.cyan}${line}${C.reset}`);
  console.log(`${C.bold}${emoji}  ${title}${C.reset}`);
  console.log(`${C.cyan}${line}${C.reset}`);
};
const step = (msg) => console.log(`   ${C.yellow}\u2192${C.reset} ${msg}`);
const ok   = (msg) => console.log(`   ${C.green}\u2713${C.reset} ${msg}`);
const fail = (msg) => console.log(`   ${C.red}\u2717${C.reset} ${msg}`);
// wrap sh to echo the command + a trimmed result
const shLog = (cmd, label) => {
  const short = cmd.replace(/\s+/g, ' ').slice(0, 90);
  console.log(`   ${C.dim}$ ${short}${cmd.length > 90 ? ' \u2026' : ''}${C.reset}`);
  const out = sh(cmd);
  if (label) {
    const m = out.match(/C[A-Z2-7]{55}/);
    if (m) ok(`${label}: ${m[0].slice(0,10)}\u2026`);
  }
  return out;
};

const cid = (out) => { const m = out.match(/C[A-Z2-7]{55}/g); return m ? m[m.length - 1] : null; };
const loadState = () => existsSync(STATE) ? JSON.parse(readFileSync(STATE)) : { deposits: [], claims: [] };
const saveState = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2));


// ---- list published recipients (for the demo dropdown) ----
app.post('/verify', (req, res) => {
  try {
    const { secret, id } = req.body;
    if (id) assertSafeId(id, 'recipient id');
    const t = JSON.parse(readFileSync('tree.json'));
    const tickets = JSON.parse(readFileSync('tickets.json'));
    let match = null;
    if (secret) {
      const norm = String(secret).trim().toLowerCase();
      const tk = tickets.find(x => String(x.secret).toLowerCase() === norm);
      if (tk) match = t.recipients.find(r => r.id === tk.id);
    } else if (id) {
      match = t.recipients.find(r => r.id === id);
    }
    if (!match) return res.json({ eligible: false });
    res.json({ eligible: true, id: match.id, amount: (Number(match.amount) / 1e7).toString() });
  } catch (e) { res.json({ eligible: false, error: String(e.message) }); }
});

// ---- Identity layer: enrolled-beneficiary list + on-chain enrollment verification ----
const ID_VERIFIER = process.env.MEDKIT_IDENTITY_VERIFIER_ID || deployment.identityVerifierId;

app.get('/enrollees', (req, res) => {
  try {
    const t = JSON.parse(readFileSync('id-tree.json'));
    res.json({
      root: t.root,
      programId: t.programId,
      enrollees: t.enrollees.map(e => ({ id: e.id })),
    });
  } catch (e) { res.json({ root: null, enrollees: [] }); }
});

app.post('/verify-identity', (req, res) => {
  try {
    const { secret, id } = req.body;
    if (id) assertSafeId(id, 'enrollee id');
    const tree = JSON.parse(readFileSync('id-tree.json'));
    const cards = JSON.parse(readFileSync('id-cards.json'));
    let enrolleeId = null;
    if (secret) {
      const norm = String(secret).trim().toLowerCase();
      const card = cards.find(x => String(x.secret).toLowerCase() === norm);
      if (card) enrolleeId = card.id;
    } else if (id) {
      enrolleeId = id;
    }
    const e = enrolleeId ? tree.enrollees.find(x => x.id === enrolleeId) : null;
    if (!e) return res.json({ verified: false, error: 'Not an enrolled beneficiary' });

    // generate enrollment proof + verify on-chain
    sh(`./prove-identity-testnet.sh ${enrolleeId}`);
    sh(`stellar contract invoke --id ${ID_VERIFIER} --source ${SRC} --network ${NET} -- verify_proof --public_inputs-file-path ./target/id_public_inputs --proof_bytes-file-path ./target/id_proof`);

    // Unified credential: the same key also identifies the recipient — resolve eligibility now.
    let eligibility = null;
    try {
      const rtree = JSON.parse(readFileSync('tree.json'));
      const rec = rtree.recipients.find(x => x.id === enrolleeId);
      if (rec) eligibility = { eligible: true, id: rec.id, amount: (Number(rec.amount) / 1e7).toString() };
      else eligibility = { eligible: false };
    } catch {}
    res.json({ verified: true, nullifier: e.nullifier, programId: e.programId, verifier: ID_VERIFIER, eligibility });
  } catch (err) {
    const out = String(err.message || err);
    res.json({ verified: false, error: out.includes('#4') ? 'Enrollment proof invalid' : 'Verification failed' });
  }
});

// ---- MedKit-Pass: verify a hospital-issued medical credential, then issue a reusable medical Pass ----
const MED_VERIFIER = process.env.MEDKIT_CLAIM_VERIFIER_ID || deployment.claimVerifierId;

app.post('/pass/verify-medical', (req, res) => {
  try {
    const { secret } = req.body; // patient's hospital credential secret
    if (!secret) return res.json({ verified: false, error: 'No credential provided' });
    if (!/^0x[0-9a-f]+$/i.test(String(secret).trim())) return res.json({ verified: false, error: 'Invalid credential format' });
    // 1. prove the hospital credential is in the issuer's medical tree + verify on-chain
    sh(`./prove-medical-testnet.sh ${String(secret).trim()}`);
    sh(`stellar contract invoke --id ${MED_VERIFIER} --source ${SRC} --network ${NET} -- verify_proof --public_inputs-file-path ./target/med_public_inputs --proof_bytes-file-path ./target/med_proof`);
    // 2. valid -> issue a reusable MedKit-Pass (category: medical). Nothing about identity is learned.
    const out = sh(`node issue-pass.mjs medical`);
    const pass = JSON.parse(out.trim().split('\n').pop());
    res.json({ verified: true, category: 'medical', pass: pass.secret, passId: pass.passId, passRoot: pass.root });
  } catch (err) {
    const o = String(err.stdout || '') + String(err.stderr || '') + String(err.message || '');
    res.json({ verified: false, error: /#4|No credential for/.test(o) ? 'Not a valid medical credential' : 'Verification failed' });
  }
});

app.get('/pass/status', (req, res) => {
  try {
    const t = JSON.parse(readFileSync('pass-tree-medical.json'));
    res.json({ category: 'medical', root: t.root, issued: (t.passes || []).length });
  } catch (e) { res.json({ category: 'medical', root: null, issued: 0 }); }
});

// ---- MedKit-Pass: claim medical aid using a valid Pass (flat category grant) ----
const MED_GRANT_XLM = 100; // flat medical grant per valid Pass
app.post('/pass/claim-medical', (req, res) => {
  try {
    const { pass, payoutAddress } = req.body;
    if (!pass) return res.json({ ok: false, error: 'No Pass provided' });
    if (payoutAddress) assertAccount(payoutAddress);
    if (!/^0x[0-9a-f]+$/i.test(String(pass).trim())) return res.json({ ok: false, error: 'Invalid Pass format' });
    const tree = JSON.parse(readFileSync('pass-tree-medical.json'));
    const c = tree.credentials.find(x => x.secret.toLowerCase() === String(pass).trim().toLowerCase());
    if (!c) return res.json({ ok: false, error: 'Unrecognized Pass' });
    // double-claim guard by nullifier
    const st = loadState();
    st.passClaims = st.passClaims || [];
    if (st.passClaims.some(x => x.nullifier === c.nullifier)) {
      const prev = st.passClaims.find(x => x.nullifier === c.nullifier);
      return res.json({ ok: false, reason: 'This Pass has already claimed its medical grant.', to: prev.to });
    }
    // 1. prove the Pass on-chain (real ZK verification against reused verifier)
    sh(`./prove-pass-testnet.sh medical ${String(pass).trim()}`);
    sh(`stellar contract invoke --id ${MED_VERIFIER} --source ${SRC} --network ${NET} -- verify_proof --public_inputs-file-path ./target/pass_public_inputs --proof_bytes-file-path ./target/pass_proof`);
    // 2. pay the flat medical grant on-chain
    let addr = payoutAddress;
    if (!addr) {
      const kn = `passclaim_${Date.now()}`;
      sh(`stellar keys generate ${kn} --network ${NET} --fund`);
      addr = sh(`stellar keys address ${kn}`).trim();
    }
    sh(`stellar tx new payment --destination ${addr} --amount ${MED_GRANT_XLM * 1e7} --source ${SRC} --network ${NET}`);
    st.passClaims.push({ category: 'medical', nullifier: c.nullifier, to: addr, amount: String(MED_GRANT_XLM), ts: Date.now() });
    saveState(st);
    res.json({ ok: true, amount: String(MED_GRANT_XLM), to: addr, category: 'medical' });
  } catch (err) {
    const o = String(err.stdout || '') + String(err.stderr || '') + String(err.message || '');
    res.json({ ok: false, reason: /#4/.test(o) ? 'Invalid Pass proof' : 'Claim failed', detail: o.slice(0, 200) });
  }
});

app.get('/recipients', (req, res) => {
  try {
    const t = JSON.parse(readFileSync('tree.json'));
    res.json({
      root: t.root,
      ids: t.recipients.map(r => r.id),
      recipients: t.recipients.map(r => ({ id: r.id, amount: Number(r.amount) / 1e7 })),
    });
  } catch (e) { res.json({ root: null, ids: [] }); }
});

// ---- NGO: build the Merkle tree from a recipient list ----
app.post('/build-list', (req, res) => {
  try {
    const recipients = req.body.recipients || [];
    const csv = 'id,amount\n' + recipients.map(r => `${r.id},${Math.round(Number(r.amount) * 1e7)}`).join('\n') + '\n';
    writeFileSync('recipients.csv', csv);
    sh('node tree.mjs');
    const t = JSON.parse(readFileSync('tree.json'));
    const tickets = JSON.parse(readFileSync('tickets.json'));
    res.json({ root: t.root, recipients: t.recipients.map(r => ({ id: r.id, amount: (Number(r.amount)/1e7).toString() })), tickets });
  } catch (e) { res.status(400).json({ error: String(e.stderr || e.message).slice(0, 400) }); }
});

// ---- NGO: publish root on the immutable deployment recorded in deployment.json ----
app.post('/publish', (req, res) => {
  try {
    const t = JSON.parse(readFileSync('tree.json'));
    const root = t.root.replace(/^0x/, '');
    let st = loadState();
    const poolId = deployment.poolId;
    sh(`stellar contract invoke --id ${poolId} --source ${SRC} --network ${NET} -- set_root --root ${root}`);
    st = { ...st, verifierId: deployment.claimVerifierId, poolId, token: deployment.nativeTokenId, root,
           deposits: st.deposits || [], claims: st.claims || [] };
    saveState(st);
    res.json({ poolId: st.poolId, verifierId: st.verifierId, root });
  } catch (e) { res.status(400).json({ error: String(e.stderr || e.message).slice(0, 400) }); }
});

// ---- Recipient: prove + claim (real on-chain). wrong=true redirects payout to test #4 ----
app.post('/claim', (req, res) => {
  try {
    const { id, wrong, payoutAddress } = req.body;
    assertSafeId(id, 'recipient id');
    if (payoutAddress) assertAccount(payoutAddress);
    const t = JSON.parse(readFileSync('tree.json'));
    const r = t.recipients.find(x => x.id === id);
    if (!r) return res.status(400).json({ error: 'unknown recipient' });
    const st = loadState();
    // Honest demo guard: only report "already claimed" if THIS recipient truly has a paid claim on record.
    if (!wrong && (st.claims || []).some(c => c.id === id && c.status === 'paid')) {
      const prev = st.claims.filter(c => c.id === id && c.status === 'paid').slice(-1)[0];
      return res.json({ ok: false, alreadyClaimed: true, reason: 'This beneficiary has already claimed their aid — each enrollment can claim once.', to: prev.to });
    }
    banner(wrong ? 'RED' : 'ZK', (wrong ? 'RED TEAM - stealing proof for ' : 'RECIPIENT - proving eligibility for ') + id);

    const kn = `demo_${id}_${Date.now()}`;
    let addr;
    if (payoutAddress) {
      addr = payoutAddress;
      ok('binding proof to connected wallet ' + addr.slice(0,8) + '...');
    } else {
      sh(`stellar keys generate ${kn} --network ${NET} --fund`);
      addr = sh(`stellar keys address ${kn}`).trim();
    }
    sh(`./prove-testnet.sh ${id} ${addr}`);

    let submitTo = addr;
    if (wrong) {
      const kn2 = `attacker_${Date.now()}`;
      sh(`stellar keys generate ${kn2} --network ${NET} --fund`);
      submitTo = sh(`stellar keys address ${kn2}`).trim();
    }

    let out = '';
    try { out = sh(`stellar contract invoke --id ${st.poolId} --source ${SRC} --network ${NET} --send=yes -- claim --public_inputs-file-path ./target/public_inputs --proof-file-path ./target/proof --to ${submitTo}`); }
    catch (e) { out = String(e.stdout || '') + String(e.stderr || '') + String(e.message || ''); }

    const failed = /error|Error\(Contract|#[0-9]|panicked|failed/.test(out);
    if (failed) {
      const reason = /#4|AddressMismatch/.test(out) ? 'Payout address mismatch — proof can\'t be redirected'
                   : /#3|AlreadyClaimed/.test(out) ? 'Nullifier already used — double-claim blocked'
                   : /#2|RootMismatch/.test(out) ? 'Root mismatch — list not published to this pool'
                   : /#5|BadAmount/.test(out) ? 'Amount check failed'
                   : 'Rejected on-chain';
      fail(`REJECTED on-chain \u2014 ${reason}`);
      return res.json({ ok: false, reason, to: submitTo });
    }
    st.claims.push({ id, amount: (Number(r.amount)/1e7).toString(), to: submitTo, nullifier: r.nullifier, ts: Date.now(), status: 'paid', poolId: st.poolId });
    saveState(st);
    ok(`PAID ${(Number(r.amount)/1e7)} XLM to ${submitTo.slice(0,8)}\u2026 \u2014 no name, ID, or list position revealed`);
    res.json({ ok: true, amount: (Number(r.amount)/1e7).toString(), to: submitTo, nullifier: r.nullifier });
  } catch (e) { res.status(400).json({ error: String(e.stderr || e.message).slice(0, 400) }); }
});

app.post('/record-deposit', (req, res) => {
  try {
    const { amount, from, hash } = req.body;
    const st = loadState();
    if (!st.poolId) return res.status(400).json({ error: 'no pool' });
    st.deposits = st.deposits || [];
    st.deposits.push({ from: from || 'Donor', amount: Math.round(Number(amount) * 1e7), ts: Date.now(), hash: hash || null });
    saveState(st);
    let balance = null;
    try { const b = sh(`stellar contract invoke --id ${st.poolId} --source ${SRC} --network ${NET} -- balance`); const m = b.match(/"?(\d{3,})"?/); balance = m ? m[1] : null; } catch {}
    ok(`DONOR DEPOSIT recorded - ${amount} XLM (signed by donor wallet)`);
    res.json({ ok: true, balance });
  } catch (e) { res.status(400).json({ error: String(e.message) }); }
});

app.post('/deposit', (req, res) => {
  try {
    const xlm = Number(req.body.amount);
    if (!xlm || xlm <= 0) return res.status(400).json({ error: 'invalid amount' });
    const st = loadState();
    if (!st.poolId) return res.status(400).json({ error: 'no pool published' });
    const stroops = Math.round(xlm * 1e7);
    banner('FUND', `DONOR - depositing ${xlm} XLM into the aid pool`);
    const out = sh(`stellar contract invoke --id ${st.poolId} --source ${SRC} --network ${NET} --send=yes -- deposit --from ${SRC} --amount ${stroops}`);
    st.deposits = st.deposits || [];
    st.deposits.push({ from: 'Donor', amount: stroops, ts: Date.now() });
    saveState(st);
    let balance = null;
    try { const b = sh(`stellar contract invoke --id ${st.poolId} --source ${SRC} --network ${NET} -- balance`); const m = b.match(/"?(\d{3,})"?/); balance = m ? m[1] : null; } catch {}
    ok(`DEPOSITED ${xlm} XLM - pool funded`);
    res.json({ ok: true, amount: xlm, balance });
  } catch (e) { res.status(400).json({ error: String(e.stderr || e.message).slice(0, 400) }); }
});

// ---- Auditor: pool balance + deposits + claims (no names) ----
app.get('/pool', (req, res) => {
  const st = loadState();
  let balance = null;
  try {
    const out = sh(`stellar contract invoke --id ${st.poolId} --source ${SRC} --network ${NET} -- balance`);
    const m = out.match(/"?(\d{3,})"?/);
    balance = m ? m[1] : null;
  } catch {}
  res.json({ poolId: st.poolId || null, verifierId: st.verifierId || null, token: st.token || null, root: st.root || null,
             balance, deposits: st.deposits || [], claims: st.claims || [] });
});

// ---- reset demo (for retakes) ----
app.get('/published', (req, res) => {
  try {
    const st = loadState();
    if (!st.poolId) return res.json({ published: false });
    const tree = JSON.parse(readFileSync('tree.json'));
    const tickets = JSON.parse(readFileSync('tickets.json'));
    const claimedIds = new Set((st.claims || []).filter(c => c.status === 'paid').map(c => c.id));
    const recipients = tree.recipients.map(r => {
      const tk = tickets.find(t => t.id === r.id);
      return {
        id: r.id,
        amount: (Number(r.amount) / 1e7).toString(),
        key: tk ? tk.secret : null,
        claimed: claimedIds.has(r.id),
      };
    });
    res.json({
      published: true,
      poolId: st.poolId,
      root: st.root,
      recipients,
      claimedCount: claimedIds.size,
      total: recipients.length,
    });
  } catch (e) {
    res.json({ published: false, error: String(e.message) });
  }
});

app.post('/reset', (req, res) => { if (existsSync(STATE)) unlinkSync(STATE); res.json({ ok: true }); });

// ---- Anchor the published root on public testnet (browsable proof) ----
app.post('/anchor', (req, res) => {
  const TNET = deployment.network, TSRC = SRC;
  const exTx = (h) => `https://stellar.expert/explorer/testnet/tx/${h}`;
  const exC  = (c) => `https://stellar.expert/explorer/testnet/contract/${c}`;
  const digest = (out) => { const u = out.match(/explorer\/testnet\/tx\/([0-9a-f]{64})/); if (u) return u[1]; const m = out.match(/Signing transaction: ([0-9a-f]{64})/); return m ? m[1] : null; };
  try {
    try { sh(`stellar keys fund ${TSRC} --network ${TNET}`); } catch {}

    const t = JSON.parse(readFileSync('tree.json'));
    const root = t.root.replace(/^0x/, '');
    const txs = [];

    // The native asset contract is network-global and is already in the manifest.

    const pid = deployment.poolId;
    const dOut = sh(`stellar contract invoke --id ${pid} --source ${TSRC} --network ${TNET} --send=yes -- deposit --from ${TSRC} --amount 100000000`);
    txs.push({ label: 'Fund pool (deposit)', hash: digest(dOut), url: exTx(digest(dOut)) });

    res.json({ network: TNET, poolId: pid, verifierId: deployment.claimVerifierId, contractUrl: exC(pid), txs: txs.filter(x => x.hash) });
  } catch (e) { res.status(400).json({ error: String(e.stderr || e.message).slice(0, 500) }); }
});

app.listen(8787, () => console.log('MedKit demo backend on http://localhost:8787'));
