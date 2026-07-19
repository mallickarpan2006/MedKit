import { useState } from 'react';
import './Demo.css';
import './dashboard.css';
import NgoConsole from './NgoConsole';
import Recipient from './Recipient';
import Auditor from './Auditor';
import Funding from './Funding';
import Distributions from './Distributions';
import PassMedical from './PassMedical';

const NAV = [
  { id: 'recipients',    label: 'Recipients',    sub: 'Manage eligibility list', stub: false, page: 'Recipients',    psub: 'Build and publish your eligibility list.' },
  { id: 'distributions', label: 'Distributions', sub: 'View payouts',          stub: false, page: 'Distributions', psub: 'Track and manage aid payouts securely.' },
  { id: 'funding',       label: 'Funding',       sub: 'Pool & deposits',       stub: false, page: 'Funding',       psub: 'Manage your aid pool and track contributions.' },
  { id: 'claim',         label: 'Claim Aid',     sub: 'Claim your aid',        stub: false, page: 'Claim Aid',     psub: "Check your eligibility and securely claim the aid you're entitled to." },
  { id: 'audits',        label: 'Audits',        sub: 'Verify & reports',      stub: false, page: 'Audits',        psub: 'Verify totals with zero names exposed.' },
];

function Icon({ name }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    recipients: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></>,
    distributions: <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    funding: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
    claim: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M12 8S10 3 7.5 3 5 5.5 7 8M12 8s2-5 4.5-5S19 5.5 17 8"/></>,
    audits: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
}

export default function Demo() {
  const validIds = NAV.map(n => n.id);
  const initialNav = (typeof window !== 'undefined' && validIds.includes(window.location.hash.slice(1))) ? window.location.hash.slice(1) : 'recipients';
  const [nav, setNavState] = useState(initialNav);
  const setNav = (id) => { setNavState(id); if (typeof window !== 'undefined') window.location.hash = id; };
  const [rootInfo, setRootInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const current = NAV.find((n) => n.id === nav) || NAV[1];

  return (
    <div className="dash">
      <aside className="dash-side">
        <a href="/" className="dash-logo">
          <span className="dash-logo-shield">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" stroke="#fff" strokeWidth="1.5" fill="none"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span className="dash-logo-text">MedKit</span>
          <span className="dash-logo-badge">Live Demo</span>
        </a>
        <div className="dash-orgcard">
          <div className="dash-orgcard-top">NGO Console</div>
          <div className="dash-orgcard-label">Organization</div>
          <div className="dash-orgcard-row">
            <span className="dash-orgcard-name">Helping Hands Org</span>
            <span className="dash-orgcard-chev">⌄</span>
          </div>
        </div>

        <nav className="dash-nav">
          {NAV.map((n) => (
            <button key={n.id} className={`dash-link ${nav === n.id ? 'active' : ''}`} onClick={() => setNav(n.id)}>
              <Icon name={n.id} />
              <span className="dash-link-text">
                <span className="dash-link-label">{n.label}</span>
                <span className="dash-link-sub">{n.sub}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="dash-privacy">
          <span className="dash-privacy-dot" />
          <div>
            <div className="dash-privacy-title">Privacy by Design</div>
            <div className="dash-privacy-sub">Zero identities exposed on-chain</div>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          <div className="dash-top-right">
            <span className="dash-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6M12 3v6M12 15v6"/></svg>
              Testnet
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </span>
            <span className="dash-avatar">NG</span>
          </div>
        </header>

        <main className="dash-body">
         <div className="dash-canvas">
          <div className="dash-pagehead">
            <div>
              <h1 className="dash-pagetitle">{current.page}</h1>
              <p className="dash-pagesub">{current.psub}</p>
            </div>
            {nav === 'recipients' && (
              <div className="dash-rootchip">
                <div className="dash-rootchip-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11v3M7 13a5 5 0 0 1 10 0M4.5 13a7.5 7.5 0 0 1 15 0M9.5 17.5a3 3 0 0 0 5 0"/></svg>
                </div>
                <div className="dash-rootchip-body">
                  <div className="dash-rootchip-title">Eligibility Root</div>
                  <div className="dash-rootchip-row">
                    <code className="dash-rootchip-val">{rootInfo ? rootInfo.root.slice(0, 8) + '...' + rootInfo.root.slice(-6) : 'Not generated yet'}</code>
                    {rootInfo && (
                      <button className="dash-rootchip-copy" onClick={() => { navigator.clipboard.writeText(rootInfo.root); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                      </button>
                    )}
                    <span className={`dash-rootchip-pill ${rootInfo ? 'ready' : ''}`}>{copied ? 'Copied!' : rootInfo ? 'Ready to publish' : 'Build to generate'}</span>
                  </div>
                  <div className="dash-rootchip-foot">Only this root is stored on-chain.</div>
                </div>
              </div>
            )}
          </div>
          <div className="dash-panel" style={{ display: nav === 'recipients' ? 'block' : 'none' }}><NgoConsole onRoot={setRootInfo} /></div>
          <div className="dash-panel" style={{ display: nav === 'claim' ? 'block' : 'none' }}><Recipient /></div>
          <div className="dash-panel" style={{ display: nav === 'audits' ? 'block' : 'none' }}><Auditor /></div>
          <div className="dash-panel" style={{ display: nav === 'funding' ? 'block' : 'none' }}><Funding /></div>
          <div className="dash-panel" style={{ display: nav === 'distributions' ? 'block' : 'none' }}><Distributions /></div>
          {current.stub && (
            <div className="dash-stub">
              <Icon name={current.id} />
              <div className="dash-stub-title">{current.page}</div>
              <div className="dash-stub-sub">Wiring this view next.</div>
            </div>
          )}
         </div>
        </main>
      </div>
    </div>
  );
}
