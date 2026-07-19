import { useState, useEffect } from 'react';
import heroBg from './assets/hero-bg.png';
import cardEligibility from './assets/card-eligibility.png';
import cardDistribution from './assets/card-distribution.png';
import cardPool from './assets/card-pool.png';
import girlMobile from './assets/girl-mobile.png';
import './App.css';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const els = document.querySelectorAll('[data-fade]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('in');
        else e.target.classList.remove('in');
      });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <>
    <div className="hero" style={{ backgroundImage: `url(${heroBg})`, "--hero-img": `url(${heroBg})` }}>
      <div className="hero-overlay" />
      <div className="hero-banner" />

      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-shield">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="#fff" opacity=".25"/>
              <path d="M12 2L4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" stroke="#fff" strokeWidth="1.5" fill="none"/>
              <path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="nav-name">MedKit</span>
        </div>

        {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />}
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a onClick={() => setMenuOpen(false)} href="#how">How it Works</a>
          <a onClick={() => setMenuOpen(false)} href="#features">Features</a>
          <a onClick={() => setMenuOpen(false)} href="#usecases">Use Cases</a>
          <a onClick={() => setMenuOpen(false)} href="#tech">Technology</a>
          <a onClick={() => setMenuOpen(false)} href="#about">About Us</a>
        </div>

        <button className="nav-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <button className="nav-cta">Launch Demo <span>→</span></button>
      </nav>

      <div className="hero-content">
        <h1 className="headline">
          Aid distribution<br/>
          <span className="headline-blue">without the exposure.</span>
        </h1>
        <p className="subhead">
          MedKit uses zero-knowledge proofs to ensure aid reaches eligible
          people&mdash;without revealing who they are.
        </p>
        <div className="hero-img-mobile">
          <img src={girlMobile} alt="" />
        </div>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => window.location.href='/demo'}>Launch Demo <span>&rarr;</span></button>
          <button className="btn-secondary" onClick={() => window.location.href='/demo'}>
            <span className="play">&#9658;</span> How It Works
          </button>
        </div>
        <div className="trust-row">
          <span>Built on Stellar</span>
          <span className="dot">&bull;</span>
          <span>Zero-Knowledge Powered</span>
          <span className="dot">&bull;</span>
          <span>Publicly Auditable</span>
        </div>
      </div>


      <div className="proof-cards">
        <div className="pcard">
          <div className="pcard-icon ic-shield">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" fill="#1f6feb"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div><div className="pcard-title">Proof Verified</div><div className="pcard-sub">Eligibility confirmed</div></div>
        </div>
        <div className="pcard">
          <div className="pcard-icon ic-lock">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="#0a1f44"/><path d="M8 11V8a4 4 0 018 0v3" stroke="#0a1f44" strokeWidth="2" fill="none"/></svg>
          </div>
          <div><div className="pcard-title">Identity Hidden</div><div className="pcard-sub">No personal data revealed</div></div>
        </div>
        <div className="pcard">
          <div className="pcard-icon ic-users">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="3" fill="#1f6feb"/><circle cx="16" cy="10" r="2.4" fill="#7ea8f5"/><path d="M4 19c0-3 2.5-5 5-5s5 2 5 5" stroke="#1f6feb" strokeWidth="2" fill="none"/></svg>
          </div>
          <div><div className="pcard-title">Double Claim Prevented</div><div className="pcard-sub">One-time nullifier verified</div></div>
        </div>
        <div className="pcard">
          <div className="pcard-icon ic-wallet">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="3" fill="#0a1f44"/><circle cx="17" cy="12.5" r="1.8" fill="#f5b73d"/></svg>
          </div>
          <div><div className="pcard-title">Funds Released</div><div className="pcard-sub">Payment sent securely</div></div>
        </div>
      </div>
    </div>

      <section className="problem">
        <div className="eyebrow eyebrow-dark"><span className="eyebrow-line"></span>THE PROBLEM</div>
        <h2 className="lead-title" data-fade>Aid systems force an impossible choice.</h2>

        <div className="steps">
          <div className="step" data-fade>
            <div className="step-ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 5.2A9.7 9.7 0 0112 5c5 0 9 4.5 10 7-.5 1.3-1.6 3-3.3 4.4M6.1 6.2C3.8 7.6 2.4 9.7 2 12c1 2.5 5 7 10 7 1 0 2-.2 2.9-.5" stroke="#1f6feb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 className="step-title">Exposed beneficiaries</h3>
            <p className="step-body">Publishing recipient lists turns vulnerable people into targets for theft, fraud, or persecution.</p>
          </div>
          <div className="step-arrow">&rarr;</div>
          <div className="step" data-fade>
            <div className="step-ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" stroke="#1f6feb" strokeWidth="2" fill="none" strokeLinejoin="round"/><path d="M12 8v4M12 15h.01" stroke="#1f6feb" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <h3 className="step-title">Unverifiable spending</h3>
            <p className="step-body">Keep the list private and donors can't confirm aid actually reached real, eligible people.</p>
          </div>
          <div className="step-arrow">&rarr;</div>
          <div className="step" data-fade>
            <div className="step-ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="#1f6feb" strokeWidth="2"/><circle cx="16" cy="9" r="2.4" stroke="#1f6feb" strokeWidth="2"/><path d="M4 19c0-3 2.2-5 5-5s5 2 5 5M15 14c2.5 0 4 1.8 4 4" stroke="#1f6feb" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <h3 className="step-title">Fraud hides in the dark</h3>
            <p className="step-body">Phantom recipients and duplicate claims go undetected, quietly draining funds meant for others.</p>
          </div>
          <div className="step-arrow">&rarr;</div>
          <div className="step" data-fade>
            <div className="step-ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 21h20L12 2z" stroke="#1f6feb" strokeWidth="2" strokeLinejoin="round"/><path d="M12 9v5M12 17h.01" stroke="#1f6feb" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <h3 className="step-title">Trust collapses</h3>
            <p className="step-body">One leak or scandal and donor confidence evaporates&mdash;funding dries up before anyone notices.</p>
          </div>
        </div>
      </section>

      <section className="solution" id="features">
        <span className="pill"><span className="pill-dot">&bull;</span> The Solution</span>
        <h2 className="sec-title" data-fade>
          Privacy-Preserving Aid.<br/>
          Proven for <span className="accent">Everyone.</span>
        </h2>
        <p className="sec-intro">
          MedKit uses zero-knowledge proofs to verify aid distribution without exposing recipient identities.
          Organizations can prove funds reached eligible people. Recipients remain completely anonymous.
        </p>
        <div className="sol-cards">

          <div className="sol-card" data-fade>
            <div className="sol-visual"><img src={cardEligibility} alt="" /></div>
            <div className="sol-head">
              <h3>Private Eligibility Verification</h3>
            </div>
            <div className="sol-line"></div>
            <p>Recipients prove they belong to an approved aid list without revealing who they are. No names, IDs, or personal records ever go on-chain.</p>
          </div>

          <div className="sol-card" data-fade>
            <div className="sol-visual"><img src={cardDistribution} alt="" /></div>
            <div className="sol-head">
              <h3>Fraud-Proof Distribution</h3>
            </div>
            <div className="sol-line"></div>
            <p>Each recipient receives a unique claim ticket and can only claim once. Nullifiers prevent duplicate payouts while preserving anonymity.</p>
          </div>

          <div className="sol-card" data-fade>
            <div className="sol-visual">
              <img src={cardPool} alt="" />
            </div>
            <div className="sol-head">
              <h3>Publicly Auditable Funds</h3>
            </div>
            <div className="sol-line"></div>
            <p>Donors and auditors can verify every payout was legitimate and every proof was valid without seeing a single beneficiary name.</p>
          </div>

        </div>
        <div className="swipe-hint">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 11c4-6 9-3 9 1 0 2-2 3-3 2s0-4 3-4c3 0 5 2 6 4" stroke="#8194b5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 11l2.5 3-3.5 1.5" stroke="#8194b5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Swipe left
        </div>
      </section>

      <section className="howto" id="how">
        <div className="howto-inner">
          <div className="eyebrow"><span className="eyebrow-line"></span>HOW IT WORKS</div>
          <h2 className="howto-title" data-fade>
            Four steps from list <span className="howto-dim">to anonymous payout.</span>
          </h2>
          <div className="howto-cards">
            <div className="howto-card" data-fade>
              <span className="howto-num">01</span>
              <h3>NGO registers the list</h3>
              <p>The organization builds its eligibility list and publishes only a cryptographic fingerprint on-chain. No names ever go public.</p>
            </div>
            <div className="howto-card" data-fade>
              <span className="howto-num">02</span>
              <h3>Recipient proves eligibility</h3>
              <p>Using their private claim ticket, the recipient generates a zero-knowledge proof &mdash; without revealing who they are.</p>
            </div>
            <div className="howto-card" data-fade>
              <span className="howto-num">03</span>
              <h3>Stellar verifies the proof</h3>
              <p>The contract checks the proof on-chain and a one-time nullifier blocks any double-claim attempt.</p>
            </div>
            <div className="howto-card" data-fade>
              <span className="howto-num">04</span>
              <h3>Funds released privately</h3>
              <p>The exact assigned amount is sent to the recipient&rsquo;s own wallet. Anonymous, verified, paid once.</p>
            </div>
          </div>
        <div className="swipe-hint">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 11c4-6 9-3 9 1 0 2-2 3-3 2s0-4 3-4c3 0 5 2 6 4" stroke="#8194b5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 11l2.5 3-3.5 1.5" stroke="#8194b5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Swipe left
        </div>
        </div>
      </section>

      <section className="usecases" id="usecases">
        <div className="uc-inner">
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-line"></span>USE CASES</div>
          <h2 className="uc-title" data-fade>
            One engine. <span className="lead-dim">Every kind of private payout.</span>
          </h2>
          <div className="uc-cards">
            <div className="uc-card" data-fade>
              <span className="uc-num">01</span>
              <h3>Humanitarian &amp; refugee aid</h3>
              <p>Pay verified people in crisis zones without ever exposing them. Aid that can&rsquo;t become a target list.</p>
            </div>
            <div className="uc-card" data-fade>
              <span className="uc-num">02</span>
              <h3>Government subsidies</h3>
              <p>Distribute welfare and benefits to eligible citizens without leaking a national database of recipients.</p>
            </div>
            <div className="uc-card" data-fade>
              <span className="uc-num">03</span>
              <h3>Universal Basic Income</h3>
              <p>Recurring payments with provable eligibility and one-time claims, while every recipient stays anonymous.</p>
            </div>
            <div className="uc-card" data-fade>
              <span className="uc-num">04</span>
              <h3>Private payroll</h3>
              <p>Pay a workforce or contractors on-chain without publishing who earns what to the entire network.</p>
            </div>
            <div className="uc-card" data-fade>
              <span className="uc-num">05</span>
              <h3>DAO grants &amp; airdrops</h3>
              <p>Prove contributor eligibility and block sybil double-claims, without doxxing wallets or identities.</p>
            </div>
            <div className="uc-card" data-fade>
              <span className="uc-num">06</span>
              <h3>Disaster relief payouts</h3>
              <p>Push instant, verified payouts to affected people the moment they prove eligibility &mdash; privately.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="tech" id="tech">
        <div className="tech-inner">
          <div className="eyebrow eyebrow-dark"><span className="eyebrow-line"></span>TECHNOLOGY</div>
          <h2 className="tech-title" data-fade>
            The stack that makes it <span className="lead-dim">provable.</span>
          </h2>
                    <div className="tech-cards">
            <div className="tech-card" data-fade>
              <span className="tech-num">01</span>
              <h3>Noir ZK Circuit</h3>
              <p>Proves Merkle inclusion, a one-time nullifier, and payout-address binding &mdash; the logic that lets a recipient prove eligibility without revealing who they are.</p>
            </div>
            <div className="tech-card" data-fade>
              <span className="tech-num">02</span>
              <h3>UltraHonk Proofs</h3>
              <p>Compact zero-knowledge proofs generated off the recipient&rsquo;s wallet and verified on-chain. No interaction, no trusted setup.</p>
            </div>
            <div className="tech-card" data-fade>
              <span className="tech-num">03</span>
              <h3>Soroban Verifier</h3>
              <p>A Stellar smart contract verifies every proof using the network&rsquo;s native BN254 cryptography &mdash; no oracle, no third party, no off-chain trust.</p>
            </div>
            <div className="tech-card" data-fade>
              <span className="tech-num">04</span>
              <h3>Pedersen Merkle Tree</h3>
              <p>The entire eligibility list is compressed to a single root published on-chain. Names, IDs, and amounts never touch the ledger.</p>
            </div>
            <div className="tech-card" data-fade>
              <span className="tech-num">05</span>
              <h3>Nullifier Registry</h3>
              <p>Root-bound, one-time claim codes block double-spending while keeping every claim fully anonymous and unlinkable.</p>
            </div>
            <div className="tech-card" data-fade>
              <span className="tech-num">06</span>
              <h3>Non-Custodial Pool</h3>
              <p>Funds sit in the contract and are released only against a valid proof for the proven amount. Every flow is publicly auditable.</p>
            </div>
          </div>
        <div className="swipe-hint">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 11c4-6 9-3 9 1 0 2-2 3-3 2s0-4 3-4c3 0 5 2 6 4" stroke="#8194b5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 11l2.5 3-3.5 1.5" stroke="#8194b5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Swipe left
        </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner" data-fade>
          <h2 className="cta-title">Aid that can&rsquo;t become a target list.</h2>
          <p className="cta-sub">Prove every payout reached an eligible person &mdash; without exposing a single name.</p>
          <div className="cta-buttons">
            <button className="btn-primary cta-primary" onClick={() => window.location.href='/demo'}>Launch Demo <span>&rarr;</span></button>
            <a className="btn-ghost" href="#">Project documentation</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo">
              <span className="nav-shield">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" stroke="#fff" strokeWidth="1.5" fill="none"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className="nav-name">MedKit</span>
            </div>
            <p className="footer-tag">Infrastructure for confidential aid distribution. Auditable for donors, invisible for recipients.</p>
            <p className="footer-built">Privacy-preserving infrastructure for real-world applications.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#how">How it Works</a>
              <a href="#features">Features</a>
              <a href="#usecases">Use Cases</a>
              <a href="#tech">Technology</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#">Documentation</a>
              <a href="#">Litepaper</a>
              <a href="#">Docs</a>
            </div>
            <div className="footer-col">
              <h4>Connect</h4>
              <a href="#">Project updates</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 MedKit. All rights reserved.</span>
          <span>Aid distribution without the exposure.</span>
        </div>
      </footer>
    </>
  );
}
