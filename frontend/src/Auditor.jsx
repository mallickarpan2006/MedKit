import { useState, useEffect } from 'react';
import { useXlmUsd } from './usePrice';
import { subscribeToPoolEvents } from './lib/event-stream';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Auditor() {
  const xlmUsd = useXlmUsd();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);

  const load = async () => {
    setBusy(true);
    try { const res = await fetch(`${API}/pool`); setData(await res.json()); }
    catch { setData(null); }
    setBusy(false);
  };
  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    window.addEventListener('hashchange', load);
    document.addEventListener('visibilitychange', load);
    const stopEvents = subscribeToPoolEvents((events) => { setLiveEvents((current) => [...events, ...current].slice(0, 20)); load(); });
    return () => { stopEvents(); window.removeEventListener('focus', load); window.removeEventListener('hashchange', load); document.removeEventListener('visibilitychange', load); };
  }, []);

  const paid = (data && data.claims ? data.claims : []).filter(c => c.status === 'paid');
  const claimTotal = paid.reduce((s, c) => s + Number(c.amount), 0);
  const balance = data && data.balance ? Number(data.balance) / 1e7 : 0;
  const when = (ts) => ts ? new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const exContract = (id) => 'https://stellar.expert/explorer/testnet/contract/' + id;

  return (
    <div className="aud">
      <div className="aud-banner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
        <div>
          <div className="aud-banner-title">Anyone can verify the money. No one can see the people.</div>
          <div className="aud-banner-sub">Every payout below is a zero-knowledge proof verified on-chain — provably legitimate, with zero identities exposed.</div>
        </div>
      </div>

      <div className="fund-stats">
        <div className="fund-stat">
          <div className="fund-stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></div>
          <div className="fund-stat-label">Proofs Verified</div>
          <div className="fund-stat-val">{paid.length}</div>
          <div className="fund-stat-sub">all valid on-chain</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg></div>
          <div className="fund-stat-label">Total Verified Payouts</div>
          <div className="fund-stat-val">{fmt(claimTotal)} XLM</div>
          <div className="fund-stat-sub">approx ${fmt(claimTotal * xlmUsd)} USD</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
          <div className="fund-stat-label">Pool Balance</div>
          <div className="fund-stat-val">{fmt(balance)} XLM</div>
          <div className="fund-stat-sub">on-chain, live</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/></svg></div>
          <div className="fund-stat-label">Names Exposed</div>
          <div className="fund-stat-val" style={{ color: '#1f7a3d' }}>0</div>
          <div className="fund-stat-sub">zero, by design</div>
        </div>
      </div>

      <div className="aud-root-card">
        <div className="aud-root-row">
          <div>
            <div className="aud-root-k">Public Merkle Root</div>
            <code className="aud-root-v">{data && data.root ? data.root : '—'}</code>
          </div>
          <div className="aud-root-tag">The only thing on-chain</div>
        </div>
        {data && data.poolId && (
          <a className="aud-pool-link" href={exContract(data.poolId)} target="_blank" rel="noreferrer">
            Pool contract: <code>{data.poolId.slice(0, 8)}…{data.poolId.slice(-6)}</code> ↗
          </a>
        )}
      </div>

      <div className="aud-ledger-card">
        <div className="fund-card-title">Proof Verification Log</div>
        <div className="aud-ledger">
          <div className="aud-tr aud-th">
            <span>Status</span><span>Nullifier (one-time)</span><span>Payout wallet</span><span>Amount</span><span>Verified</span>
          </div>
          {paid.length === 0 && <div className="fund-empty-sub" style={{ padding: '16px 0' }}>No proofs verified yet. Claims will appear here once recipients prove eligibility.</div>}
          {paid.map((c, i) => (
            <div className="aud-tr" key={i}>
              <span className="aud-ok"><span className="aud-ok-dot" />proof verified</span>
              <code className="aud-mono">{c.nullifier ? c.nullifier.slice(0, 14) + '…' : '—'}</code>
              <code className="aud-mono">{c.to.slice(0, 8)}…{c.to.slice(-6)}</code>
              <b>{fmt(Number(c.amount))} XLM <span className="aud-amt-usd">· ${fmt(Number(c.amount) * xlmUsd)}</span></b>
              <span className="aud-time">{when(c.ts)}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="aud-refresh" onClick={load} disabled={busy}>
        {busy ? 'Refreshing…' : '↻ Refresh ledger'}
      </button>
      <div className="fund-empty-sub" aria-live="polite">{liveEvents.length ? `${liveEvents.length} live contract event${liveEvents.length === 1 ? '' : 's'} synchronized` : 'Live event sync ready'}</div>
    </div>
  );
}
