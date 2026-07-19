import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function PassMedical() {
  const [credInput, setCredInput] = useState('');
  const [busy, setBusy] = useState('');
  const [pass, setPass] = useState(null);      // { pass, passId, passRoot }
  const [claim, setClaim] = useState(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const verify = async () => {
    setErr(''); setBusy('verify'); setClaim(null);
    try {
      const res = await fetch(`${API}/pass/verify-medical`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: credInput.trim() }),
      });
      const d = await res.json();
      if (d.verified) setPass(d);
      else setErr(d.error || 'Could not verify this credential.');
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  const doClaim = async () => {
    setErr(''); setBusy('claim');
    try {
      const res = await fetch(`${API}/pass/claim-medical`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pass: pass.pass }),
      });
      const d = await res.json();
      if (d.ok) setClaim(d);
      else setErr(d.reason || d.error || 'Claim rejected');
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  const copyPass = async () => {
    try { await navigator.clipboard.writeText(pass.pass); }
    catch { const t=document.createElement('textarea'); t.value=pass.pass; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); }
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="pass-wrap">
      <div className="pass-hero">
        <div className="pass-badge">MedKit-Pass · Medical</div>
        <h2 className="pass-title">Verify once. Prove forever. Reveal nothing.</h2>
        <p className="pass-sub">Bring your hospital-issued medical credential. MedKit confirms it's authentic and issues you a reusable, anonymous Medical Pass — without ever learning who you are or what your condition is.</p>
      </div>

      {!pass ? (
        <div className="pass-card">
          <div className="pass-step">Step 1 · Verify your medical credential</div>
          <input className="pass-input" value={credInput} placeholder="Paste your hospital credential (0x…)"
                 onChange={(e) => setCredInput(e.target.value)} />
          <button className="btn-primary pass-btn" onClick={verify} disabled={busy === 'verify' || !credInput.trim()}>
            {busy === 'verify' ? 'Verifying on Stellar…' : 'Verify & Get Pass →'}
          </button>
          <div className="pass-note">Your credential is proven in zero-knowledge against the issuer's registry. The document itself never leaves your device.</div>
        </div>
      ) : (
        <div className="pass-card issued">
          <div className="pass-issued-head">✓ Medical Pass issued — reusable &amp; anonymous</div>
          <div className="pass-issued-sub">This Pass proves you qualify for medical aid. Your identity and diagnosis were never revealed — not to MedKit, not on-chain.</div>
          <div className="pass-passrow">
            <span className="pass-passlabel">Your Medical Pass</span>
            <code className="pass-passval">{pass.pass}</code>
            <button className="ngo-copy" onClick={copyPass}>{copied ? '✓ Copied' : '⧉ Copy'}</button>
          </div>
          {!claim ? (
            <button className="btn-primary pass-btn" onClick={doClaim} disabled={busy === 'claim'}>
              {busy === 'claim' ? 'Claiming medical aid…' : 'Claim Medical Aid →'}
            </button>
          ) : (
            <div className="pass-claimed">
              <div className="pass-claimed-head">✓ Medical aid claimed — anonymously</div>
              <div className="pass-claimed-row"><span>Amount paid</span><b>{claim.amount} XLM</b></div>
              {claim.to && <div className="pass-claimed-row"><span>Paid to</span><code>{claim.to.slice(0,8)}…{claim.to.slice(-6)}</code></div>}
            </div>
          )}
        </div>
      )}

      {err && <div className="demo-err">⚠ {err}</div>}
    </div>
  );
}
