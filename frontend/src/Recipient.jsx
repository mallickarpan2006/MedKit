import { useState, useEffect } from 'react';
import { useXlmUsd } from './usePrice';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FREIGHTER_ID, FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import PassMedical from './PassMedical';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

StellarWalletsKit.init({
  network: Networks.TESTNET,
  modules: [new FreighterModule()],
});

const STEPS = [
  { n: 1, label: 'Verify Enrollment', sub: 'Prove you\'re registered' },
  { n: 2, label: 'Verify Eligibility', sub: 'Check if you qualify' },
  { n: 3, label: 'Confirm & Claim', sub: 'Receive aid privately' },
  { n: 4, label: 'Complete', sub: 'Claim successful' },
];

const WORKS = [
  { t: 'Verify Eligibility', d: 'We check your eligibility using zero-knowledge proofs.' },
  { t: 'Confirm Claim', d: 'Review the aid details and confirm your claim anonymously.' },
  { t: 'Receive Aid', d: 'Funds are sent securely to your wallet.' },
  { t: 'Complete', d: 'Your claim is recorded without exposing your identity.' },
];

export default function Recipient() {
  const xlmUsd = useXlmUsd();
  const [ids, setIds] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [sel, setSel] = useState('');
  const [busy, setBusy] = useState('');
  const [claim, setClaim] = useState(null);
  const [attacks, setAttacks] = useState({});
  const [err, setErr] = useState('');
  const [addr, setAddr] = useState('');
  const [verified, setVerified] = useState(false);
  const [ticketInput, setTicketInput] = useState('');
  const [verifiedId, setVerifiedId] = useState('');
  const [idVerified, setIdVerified] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [idSel, setIdSel] = useState('');
  const [enrollees, setEnrollees] = useState([]);
  const [idNullifier, setIdNullifier] = useState('');
  const [blocked, setBlocked] = useState(null);
  const [mode, setMode] = useState('key');

  const loadRecipients = () => {
    fetch(`${API}/recipients`).then(r => r.json()).then(d => {
      const list = d.ids || [];
      setIds(list);
      const m = {};
      (d.recipients || []).forEach(r => { m[r.id] = r.amount; });
      setAmounts(m);
      setSel(prev => (list.includes(prev) ? prev : (list[0] || '')));
    }).catch(() => {});
  };

  const loadEnrollees = () => {
    fetch(`${API}/enrollees`).then(r => r.json()).then(d => {
      const list = (d.enrollees || []).map(e => e.id);
      setEnrollees(list);
      setIdSel(prev => (list.includes(prev) ? prev : (list[0] || '')));
    }).catch(() => {});
  };
  useEffect(() => {
    const refresh = () => { loadRecipients(); loadEnrollees(); };
    refresh();
    // Refetch whenever the user returns to this tab/page or the hash route changes,
    // so the list always reflects the current published distribution (no stale names).
    window.addEventListener('focus', refresh);
    window.addEventListener('hashchange', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('hashchange', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const connect = async () => {
    setErr('');
    try {
      const { address } = await StellarWalletsKit.authModal();
      if (address) setAddr(address);
    } catch (e) {
      const msg = String(e.message || e);
      // User dismissing the wallet modal is not an error — say nothing.
      if (/reject|cancel|close|dismiss|denied|user/i.test(msg)) return;
      setErr('Wallet connect failed: ' + msg);
    }
  };

  const doClaim = async () => {
    if (!addr) { setErr('Connect your wallet first — you have not claimed yet.'); return; }
    setErr(''); setBusy('claim'); setClaim(null); setAttacks({}); setBlocked(null);
    try {
      const res = await fetch(`${API}/claim`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: sel, payoutAddress: addr }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      if (d.ok) { setClaim(d); setBlocked(null); }
      else if (d.doubleClaimBlocked) { setBlocked(d); setErr(''); }
      else setErr(d.reason || 'Claim rejected');
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  const attack = async (kind) => {
    setBusy(kind);
    try {
      const body = kind === 'double' ? { id: sel } : { id: sel, wrong: true };
      const res = await fetch(`${API}/claim`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      setAttacks(a => ({ ...a, [kind]: d }));
    } catch (e) { setAttacks(a => ({ ...a, [kind]: { ok: false, reason: String(e.message) } })); }
    setBusy('');
  };

  const amount = amounts[sel] ?? 0;
  const usd = (Number(amount) * xlmUsd).toFixed(2);
  const step = claim ? 4 : (verified && addr) ? 3 : idVerified ? 2 : 1;
  const eligible = ids.includes(sel);

  const verifyIdentity = async () => {
    setErr(''); setBusy('idverify');
    try {
      const body = idInput.trim() ? { secret: idInput.trim() } : { id: idSel };
      const res = await fetch(`${API}/verify-identity`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.verified) {
        setIdVerified(true);
        setIdNullifier(d.nullifier || '');
        // Unified credential: the same key resolved eligibility on the backend.
        // Auto-fill it so the user doesn't paste a second secret.
        if (d.eligibility && d.eligibility.eligible) {
          setSel(d.eligibility.id);
          setVerifiedId(d.eligibility.id);
          setAmounts(a => ({ ...a, [d.eligibility.id]: Number(d.eligibility.amount) }));
          setVerified(true);
        }
      }
      else setErr(d.error || 'Enrollment could not be verified.');
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };
  const verify = async () => {
    setErr(''); setBusy('verify');
    try {
      const body = ticketInput.trim() ? { secret: ticketInput.trim() } : { id: sel };
      const res = await fetch(`${API}/verify`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.eligible) { setSel(d.id); setVerifiedId(d.id); setVerified(true); }
      else setErr('This ticket is not on the published eligibility list.');
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  // ---- Two-step entry: choose qualification path ----
  if (mode === null) {
    return (
      <div className="claim-chooser">
        <h2 className="claim-chooser-title">How do you qualify for aid?</h2>
        <div className="claim-choice-grid">
          <button className="claim-choice-card" onClick={() => setMode('key')}>
            <div className="claim-choice-name">I have an aid key</div>
            <div className="claim-choice-desc">You were enrolled by an aid organization and received a private claim key.</div>
          </button>
          <button className="claim-choice-card" onClick={() => setMode('credential')}>
            <div className="claim-choice-name">I have a verified credential</div>
            <div className="claim-choice-desc">You have a document from a hospital, school, or authority that qualifies you for a category of aid.</div>
          </button>
        </div>
      </div>
    );
  }
  if (mode === 'credential') {
    return (
      <div className="claim-cat">
        <button className="claim-back" onClick={() => setMode(null)}>&larr; Back</button>
        <h2 className="claim-chooser-title">What kind of aid?</h2>
        <div className="claim-cat-grid">
          <button className="claim-cat-card active" onClick={() => setMode('medical')}>Medical</button>
          <button className="claim-cat-card soon" disabled>Education<span>Coming soon</span></button>
          <button className="claim-cat-card soon" disabled>Refugee<span>Coming soon</span></button>
        </div>
      </div>
    );
  }
  if (mode === 'medical') {
    return (
      <div>
        <button className="claim-back" onClick={() => setMode('credential')}>&larr; Back</button>
        <PassMedical />
      </div>
    );
  }

  // ---- mode === 'key': existing direct-claim flow ----
  return (
    <div className="claim">
      <button className="claim-back" onClick={() => setMode(null)} style={{ marginBottom: 12 }}>&larr; Back</button>
      <div className="claim-steps">
        {STEPS.map((s, i) => (
          <div key={s.n} className={`claim-step ${step >= s.n ? 'on' : ''}`}>
            <div className="claim-step-num">{step > s.n ? '✓' : s.n}</div>
            <div className="claim-step-text">
              <div className="claim-step-label">{s.label}</div>
              <div className="claim-step-sub">{s.sub}</div>
            </div>
            {i < STEPS.length - 1 && <div className="claim-step-line" />}
          </div>
        ))}
      </div>

      {idVerified && (
        <div className="rcp-idbanner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
          <span><b>Enrollment verified</b> — unique &amp; private · identity never revealed on-chain · program 1</span>
        </div>
      )}
      {!idVerified ? (
        <div className="claim-elig pending">
          <div className="claim-elig-icon pending">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><circle cx="12" cy="11" r="2.5"/></svg>
          </div>
          <div className="claim-elig-body">
            <div className="claim-elig-title">Verify Your Aid Key</div>
            <div className="claim-elig-sub">Enter the private key your NGO gave you at registration. This one key proves you're an enrolled, unique beneficiary and unlocks your aid — your identity is never revealed, even to the NGO.</div>
            <input className="claim-ticket-input" value={idInput} placeholder="Paste your aid key (0x…)" onChange={(e) => setIdInput(e.target.value)} />
            <div className="claim-demo-fallback">
              <span>Demo: no key? pick a beneficiary</span>
              <select className="claim-elig-select" value={idSel} onChange={(e) => setIdSel(e.target.value)}>
                {enrollees.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>
          <div className="claim-elig-amt">
            <button className="btn-primary claim-verify-btn" onClick={verifyIdentity} disabled={busy === 'idverify'}>
              {busy === 'idverify' ? 'Verifying…' : 'Verify Enrollment →'}
            </button>
          </div>
        </div>
      ) : !verified ? (
        <div className="claim-elig pending">
          <div className="claim-elig-icon pending">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          </div>
          <div className="claim-elig-body">
            <div className="claim-elig-title">Check your eligibility</div>
            <div className="claim-elig-sub">Paste the claim ticket your distributor gave you. Your amount stays hidden until verified — no name or list position is revealed.</div>
            <input className="claim-ticket-input" value={ticketInput} placeholder="Paste your claim ticket (0x…)" onChange={(e) => setTicketInput(e.target.value)} />
            <div className="claim-demo-fallback">
              <span>Demo: no ticket? pick a sample recipient</span>
              <select className="claim-elig-select" value={sel} onChange={(e) => setSel(e.target.value)}>
                {ids.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>
          <div className="claim-elig-amt">
            <button className="btn-primary claim-verify-btn" onClick={verify} disabled={busy === 'verify'}>
              {busy === 'verify' ? 'Verifying…' : 'Verify My Eligibility'}
            </button>
          </div>
        </div>
      ) : (
        <div className="claim-elig">
          <div className="claim-elig-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1f7a3d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <div className="claim-elig-body">
            <div className="claim-elig-title">You are eligible!</div>
            <div className="claim-elig-sub">You qualify to claim the following aid.</div>
            <div className="claim-elig-pills">
              <span className="claim-pill green">✓ Verified</span>
              <span className="claim-pill blue">◈ Unique</span>
              <span className="claim-pill blue">⧉ No Duplicates</span>
            </div>
          </div>
          <div className="claim-elig-amt">
            <div className="claim-elig-amt-label">Eligible Amount</div>
            <div className="claim-elig-amt-val">{Number(amount).toFixed(2)} XLM</div>
            <div className="claim-elig-amt-usd">≈ ${usd} USD</div>
            <button className="claim-elig-reset" onClick={() => setVerified(false)}>Change recipient</button>
          </div>
        </div>
      )}

      {verified && (<>
      <div className="claim-details">
        <div className="claim-details-title">Aid Details</div>
        <div className="claim-details-grid">
          <div className="claim-detail"><span className="claim-detail-k">Program</span><span className="claim-detail-v">Aid Distribution</span></div>
          <div className="claim-detail"><span className="claim-detail-k">Batch ID</span><span className="claim-detail-v">BATCH-001</span></div>
          <div className="claim-detail"><span className="claim-detail-k">Distributed By</span><span className="claim-detail-v">Helping Hands Org</span></div>
          <div className="claim-detail"><span className="claim-detail-k">Network</span><span className="claim-detail-v">Stellar Testnet</span></div>
        </div>
        <div className="claim-details-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/></svg>
          This aid is part of a verified distribution. All recipients are verified using privacy-preserving technology.
        </div>
      </div>

      <div className="claim-works">
        <div className="claim-works-title">How Claiming Works</div>
        <div className="claim-works-grid">
          {WORKS.map((w, i) => (
            <div key={i} className="claim-work">
              <div className="claim-work-num">{i + 1}</div>
              <div className="claim-work-t">{w.t}</div>
              <div className="claim-work-d">{w.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="claim-cta">
        <div className="claim-cta-head">Ready to Claim?</div>
        <div className="claim-cta-sub">Connect your wallet to continue. Your identity will remain private throughout the process.</div>
        {addr ? (
          <div className="claim-wallet-on">
            <span className="claim-wallet-dot" />
            <span>Freighter connected</span>
            <code>{addr.slice(0, 6)}…{addr.slice(-6)}</code>
            <button onClick={connect}>Change</button>
          </div>
        ) : (
          <button className="claim-connect" onClick={connect}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            Connect Wallet
          </button>
        )}
        {addr && !claim && (
          <button className="btn-primary claim-go" onClick={doClaim} disabled={busy === 'claim'}>
            {busy === 'claim' ? 'Generating proof & claiming…' : 'Generate Proof & Claim'}
          </button>
        )}
        <div className="claim-cta-foot">⚿ Your data is never stored or shared. All claims are private and verifiable.</div>
      </div>
      </>)}

      {err && <div className="demo-err">⚠ {err}</div>}

      {blocked && (
        <div className="rcp-blocked">
          <div className="rcp-blocked-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
            Double-claim blocked by the protocol
          </div>
          <div className="rcp-blocked-sub">This enrollment already claimed once. The nullifier is spent on-chain, so the protocol itself rejects the second attempt — no central database needed. This is the Sybil-resistance guarantee working, with the beneficiary's identity still private.</div>
          {blocked.nullifier && <div className="rcp-blocked-null"><span>Spent nullifier</span><code>{blocked.nullifier.slice(0,10)}…{blocked.nullifier.slice(-8)}</code></div>}
        </div>
      )}

      {claim && (
        <div className="rcp-success">
          <div className="rcp-success-head">✓ Claim verified &amp; paid — anonymously</div>
          <div className="rcp-row"><span>Amount paid</span><b>{claim.amount} XLM</b></div>
          <div className="rcp-row"><span>Payout wallet</span><code>{claim.to.slice(0, 8)}…{claim.to.slice(-6)}</code></div>
          <div className="rcp-row"><span>Nullifier (one-time)</span><code>{claim.nullifier.slice(0, 14)}…</code></div>
          <div className="rcp-note">No name, ID, or list position was revealed — this payout is unlinkable to you on-chain.</div>

          <div className="rcp-redteam">
            <div className="rcp-redteam-title">Now try to break it:</div>
            <div className="rcp-attacks">
              <button onClick={() => attack('double')} disabled={busy === 'double'}>
                {busy === 'double' ? 'Trying…' : '↻ Try double-claim'}
              </button>
              <button onClick={() => attack('steal')} disabled={busy === 'steal'}>
                {busy === 'steal' ? 'Trying…' : '⚷ Try stealing the proof'}
              </button>
            </div>
            {attacks.double && (
              <div className={`rcp-attack-res ${attacks.double.ok ? 'bad' : 'good'}`}>
                {attacks.double.ok ? '⚠ Double-claim succeeded (bug!)' : `🛡 Blocked — ${attacks.double.reason}`}
              </div>
            )}
            {attacks.steal && (
              <div className={`rcp-attack-res ${attacks.steal.ok ? 'bad' : 'good'}`}>
                {attacks.steal.ok ? '⚠ Proof redirected (bug!)' : `🛡 Rejected — ${attacks.steal.reason}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
