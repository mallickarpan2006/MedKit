import { useState, useEffect } from 'react';
import { useXlmUsd } from './usePrice';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { donorDeposit } from './donorDeposit';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const xlm = (stroops) => (Number(stroops) / 1e7);
const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

try { StellarWalletsKit.init({ network: Networks.TESTNET, modules: [new FreighterModule()] }); } catch {}

export default function Funding() {
  const xlmUsd = useXlmUsd();
  const [donor, setDonor] = useState('');
  const [step, setStep] = useState('');
  const [pool, setPool] = useState(null);
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const load = () => { fetch(`${API}/pool`).then(r => r.json()).then(setPool).catch(() => {}); };
  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    window.addEventListener('hashchange', load);
    document.addEventListener('visibilitychange', load);
    return () => { window.removeEventListener('focus', load); window.removeEventListener('hashchange', load); document.removeEventListener('visibilitychange', load); };
  }, []);

  const connectDonor = async () => {
    setErr('');
    try {
      const { address } = await StellarWalletsKit.authModal();
      setDonor(address);
    } catch (e) { setErr('Wallet connect failed: ' + String(e.message || e)); }
  };

  const deposit = async () => {
    setErr(''); setBusy(true);
    try {
      if (!donor) { await connectDonor(); setBusy(false); return; }
      if (!pool || !pool.poolId || !pool.token) throw new Error('No pool published');
      const hash = await donorDeposit({ poolId: pool.poolId, donorAddress: donor, xlm: Number(amount), onStep: setStep });
      await fetch(`${API}/record-deposit`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), from: donor.slice(0,4) + '…' + donor.slice(-4), hash }),
      });
      setToast(`Deposited ${amount} XLM - signed on-chain`);
      setTimeout(() => setToast(''), 3000);
      load();
    } catch (e) { setErr(String(e.message || e)); }
    setStep(''); setBusy(false);
  };

  const balance = pool && pool.balance ? xlm(pool.balance) : 0;
  const deposits = (pool && pool.deposits) || [];
  const claims = (pool && pool.claims) || [];
  const totalDeposited = deposits.reduce((s, d) => s + xlm(d.amount), 0);
  const totalClaimed = claims.reduce((s, c) => s + Number(c.amount), 0);
  const locked = balance;
  const pct = totalDeposited > 0 ? Math.min(100, (locked / totalDeposited) * 100) : 0;

  const activity = [
    ...deposits.map(d => ({ kind: 'deposit', label: 'Deposit received', sub: `${fmt(xlm(d.amount))} XLM from ${d.from}`, ts: d.ts })),
    ...claims.map(c => ({ kind: 'claim', label: 'Aid claimed', sub: `${fmt(c.amount)} XLM paid - anonymous`, ts: c.ts })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 6);

  const when = (ts) => new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!pool || !pool.poolId) {
    return (
      <div className="fund-empty">
        <div className="fund-empty-title">No pool published yet</div>
        <div className="fund-empty-sub">Publish an eligibility list from the Recipients page to create and fund the aid pool.</div>
      </div>
    );
  }

  return (
    <div className="fund">
      <div className="fund-stats">
        <div className="fund-stat">
          <div className="fund-stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
          <div className="fund-stat-label">Total Pool Balance</div>
          <div className="fund-stat-val">{fmt(balance)} XLM</div>
          <div className="fund-stat-sub">approx ${fmt(balance * xlmUsd)} USD</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg></div>
          <div className="fund-stat-label">Total Deposited</div>
          <div className="fund-stat-val">{fmt(totalDeposited)} XLM</div>
          <div className="fund-stat-sub">approx ${fmt(totalDeposited * xlmUsd)} USD</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg></div>
          <div className="fund-stat-label">Total Claimed</div>
          <div className="fund-stat-val">{fmt(totalClaimed)} XLM</div>
          <div className="fund-stat-sub">approx ${fmt(totalClaimed * xlmUsd)} USD</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
          <div className="fund-stat-label">Locked for Payouts</div>
          <div className="fund-stat-val">{fmt(locked)} XLM</div>
          <div className="fund-stat-sub">approx ${fmt(locked * xlmUsd)} USD</div>
        </div>
      </div>

      <div className="fund-cols">
        <div className="fund-overview">
          <div className="fund-card-title">Aid Pool Overview</div>
          <div className="fund-card-sub">Funds in this pool are locked and can only be used for verified payouts.</div>
          <div className="fund-bar-pct">{pct.toFixed(1)}%</div>
          <div className="fund-bar"><div className="fund-bar-fill" style={{ width: pct + '%' }} /></div>
          <div className="fund-bar-row">
            <div><div className="fund-bar-v">{fmt(locked)} XLM</div><div className="fund-bar-k">Locked for payouts · ${fmt(locked * xlmUsd)}</div></div>
            <div className="r"><div className="fund-bar-v">{fmt(totalDeposited)} XLM</div><div className="fund-bar-k">Total deposited · ${fmt(totalDeposited * xlmUsd)}</div></div>
          </div>
          <div className="fund-secure"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/></svg> Funds are non-custodial and secured by smart contracts on Stellar.</div>
        </div>

        <div className="fund-actions">
          <div className="fund-card-title">Pool Actions</div>
          <div className="fund-action-label">Add Funds</div>
          <div className="fund-action-sub">Deposit XLM into the aid pool.</div>
          <div className="fund-deposit-row">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <span className="fund-deposit-unit">XLM</span>
          </div>
          {donor ? (
            <div className="fund-donor-on"><span className="fund-donor-dot" />Donor: <code>{donor.slice(0,5)}…{donor.slice(-5)}</code><button onClick={connectDonor}>Change</button></div>
          ) : null}
          <button className="btn-primary fund-deposit-btn" onClick={deposit} disabled={busy}>
            {busy ? (step || 'Processing…') : donor ? 'Deposit to Pool' : 'Connect Wallet to Deposit'}
          </button>
          {toast && <div className="fund-toast">{toast}</div>}
          {err && <div className="demo-err">{err}</div>}
          <div className="fund-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/></svg> All transactions are public and verifiable on-chain.</div>
        </div>
      </div>

      <div className="fund-activity">
        <div className="fund-card-title">Recent Activity</div>
        {activity.length === 0 && <div className="fund-empty-sub">No activity yet.</div>}
        {activity.map((a, i) => (
          <div key={i} className="fund-act">
            <div className={`fund-act-icon ${a.kind}`}>
              {a.kind === 'deposit'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
            </div>
            <div className="fund-act-body"><div className="fund-act-label">{a.label}</div><div className="fund-act-sub">{a.sub}</div></div>
            <div className="fund-act-time">{when(a.ts)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
