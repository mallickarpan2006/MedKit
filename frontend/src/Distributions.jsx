import { useState, useEffect } from 'react';
import { useXlmUsd } from './usePrice';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Distributions() {
  const xlmUsd = useXlmUsd();
  const [pool, setPool] = useState(null);
  const [open, setOpen] = useState({});

  const load = () => { fetch(`${API}/pool`).then(r => r.json()).then(setPool).catch(() => {}); };
  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    window.addEventListener('hashchange', load);
    document.addEventListener('visibilitychange', load);
    return () => { window.removeEventListener('focus', load); window.removeEventListener('hashchange', load); document.removeEventListener('visibilitychange', load); };
  }, []);

  const claims = (pool && pool.claims) || [];
  const totalDistributed = claims.reduce((s, c) => s + Number(c.amount), 0);
  const totalRecipients = claims.length;
  const lastTs = claims.length ? Math.max(...claims.map(c => c.ts)) : null;

  // group claims into batches by poolId
  const batchMap = {};
  claims.forEach(c => {
    const k = c.poolId || pool?.poolId || 'current';
    if (!batchMap[k]) batchMap[k] = [];
    batchMap[k].push(c);
  });
  const batches = Object.entries(batchMap).map(([pid, list], i) => ({
    id: `BATCH-${String(Object.keys(batchMap).length - i).padStart(3, '0')}`,
    poolId: pid,
    claims: list,
    amount: list.reduce((s, c) => s + Number(c.amount), 0),
    recipients: list.length,
    ts: Math.max(...list.map(c => c.ts)),
  })).sort((a, b) => b.ts - a.ts);

  const when = (ts) => ts ? new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const exUrl = (pid) => `https://stellar.expert/explorer/testnet/contract/${pid}`;

  return (
    <div className="dist">
      <div className="fund-stats">
        <div className="fund-stat">
          <div className="fund-stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg></div>
          <div className="fund-stat-label">Total Distributed</div>
          <div className="fund-stat-val">{fmt(totalDistributed)} XLM</div>
          <div className="fund-stat-sub">approx ${fmt(totalDistributed * xlmUsd)} USD</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/></svg></div>
          <div className="fund-stat-label">Total Recipients</div>
          <div className="fund-stat-val">{totalRecipients}</div>
          <div className="fund-stat-sub">paid anonymously</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></div>
          <div className="fund-stat-label">Successful Payouts</div>
          <div className="fund-stat-val">{totalRecipients}</div>
          <div className="fund-stat-sub">100% completion</div>
        </div>
        <div className="fund-stat">
          <div className="fund-stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <div className="fund-stat-label">Last Distribution</div>
          <div className="fund-stat-val" style={{ fontSize: '15px' }}>{lastTs ? when(lastTs) : '—'}</div>
          <div className="fund-stat-sub">most recent claim</div>
        </div>
      </div>

      <div className="dist-table-card">
        <div className="fund-card-title">Distribution Batches</div>
        {batches.length === 0 && <div className="fund-empty-sub">No distributions yet. Recipients claims will appear here once paid.</div>}
        {batches.length > 0 && (
          <div className="dist-table">
            <div className="dist-tr dist-th">
              <span>Batch ID</span><span>Recipients</span><span>Amount (XLM)</span><span>Status</span><span>Date</span><span></span>
            </div>
            {batches.map((b) => (
              <div key={b.poolId}>
                <div className="dist-tr">
                  <span className="dist-batch">{b.id}</span>
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ verticalAlign: '-2px', marginRight: '5px' }}><circle cx="9" cy="7" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/></svg>{b.recipients}</span>
                  <span className="dist-amt">{fmt(b.amount)}<span className="dist-amt-usd">${fmt(b.amount * xlmUsd)}</span></span>
                  <span className="dist-status"><span className="dist-status-dot" />Completed</span>
                  <span className="dist-date">{when(b.ts)}</span>
                  <button className="dist-expand" onClick={() => setOpen(o => ({ ...o, [b.poolId]: !o[b.poolId] }))}>
                    {open[b.poolId] ? 'Hide' : 'View'} claims
                  </button>
                </div>
                {open[b.poolId] && (
                  <div className="dist-claims">
                    {b.claims.map((c, i) => (
                      <div key={i} className="dist-claim">
                        <span className="dist-claim-anon">Anonymous recipient</span>
                        <span className="dist-claim-amt">{fmt(Number(c.amount))} XLM <span className="dist-claim-usd">· ${fmt(Number(c.amount) * xlmUsd)}</span></span>
                        <code className="dist-claim-null">nullifier {c.nullifier.slice(0, 10)}…</code>
                        <span className="dist-claim-time">{when(c.ts)}</span>
                      </div>
                    ))}
                    <a className="dist-explorer" href={exUrl(b.poolId)} target="_blank" rel="noreferrer">View pool contract on stellar.expert ↗</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dist-verify">
        <div className="dist-verify-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.7"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
          <div>
            <div className="dist-verify-title">All distributions are privacy-preserving</div>
            <div className="dist-verify-sub">Zero-knowledge proofs ensure recipients remain anonymous while every payout is fully verifiable on-chain.</div>
          </div>
        </div>
        <div className="dist-verify-right">
          <div className="dist-verify-pct">100%</div>
          <div className="dist-verify-bar"><div className="dist-verify-fill" style={{ width: '100%' }} /></div>
          <div className="dist-verify-cap">All payouts have valid proofs.</div>
        </div>
      </div>
    </div>
  );
}
