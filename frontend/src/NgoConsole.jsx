import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function NgoConsole({ onPublished, onRoot }) {
  const [rows, setRows] = useState(() => {
    // Restore this session's working list synchronously (before first render) to avoid
    // a blank-overwrite race. New session => blank row.
    try {
      const saved = sessionStorage.getItem('medkit_rows');
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length) return p; }
    } catch {}
    return [{ id: '', amount: '' }];
  });
  const [built, setBuilt] = useState(null);   // { root, tickets }
  const [copied, setCopied] = useState('');
  const [published, setPublished] = useState(null); // { poolId, root }
  const [pubDist, setPubDist] = useState(null); // durable published distribution (keys + claim status)
  // Derive a stable, verifier-style handle from a recipient's key. The NGO's stored/shared
  // records show this handle, never a name — so distribution records can't trace to people.
  const handleFor = (key) => 'REC-' + String(key || '').replace(/^0x/, '').slice(0, 11);
  const viewPublished = async () => {
    setErr('');
    try {
      const r = await fetch(`${API}/published`).then(x => x.json());
      if (r.published) setPubDist(r);
      else { setPubDist(null); setErr('No published distribution yet — build & publish a list first.'); }
    } catch (e) { setErr(String(e.message)); }
  };

  // Persist the working list whenever it changes, but skip the very first render so the
  // initial value never overwrites restored data.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    try { sessionStorage.setItem('medkit_rows', JSON.stringify(rows)); } catch {}
  }, [rows]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [showTickets, setShowTickets] = useState(false);
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = async (file) => {
    setErr('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      if (!json.length) throw new Error('File looks empty');

      // detect header row + name/amount columns
      let startRow = 0, nameCol = 0, amtCol = 1;
      const first = json[0].map(x => String(x).toLowerCase());
      const hasHeader = first.some(h => /name|id|recipient|beneficiary/.test(h)) || first.some(h => /amount|value|xlm|sum/.test(h));
      if (hasHeader) {
        startRow = 1;
        const ni = first.findIndex(h => /name|id|recipient|beneficiary/.test(h));
        const ai = first.findIndex(h => /amount|value|xlm|sum/.test(h));
        if (ni >= 0) nameCol = ni;
        if (ai >= 0) amtCol = ai;
      }

      // detect whether a usable name/id column exists
      const hasNameCol = hasHeader ? first.some(h => /name|id|recipient|beneficiary/.test(h)) : false;
      // if only one column and it's numeric, treat it as the amount column
      if (json[startRow] && json[startRow].length === 1) { amtCol = 0; }

      const parsed = [];
      let seq = 1;
      for (let i = startRow; i < json.length; i++) {
        const row = json[i];
        const rawId = hasNameCol ? String(row[nameCol] ?? '').trim() : '';
        const amount = Number(String(row[amtCol] ?? '').replace(/[^0-9.]/g, '')) || 0;
        if (amount <= 0 && !rawId) continue;
        const id = rawId || `recipient-${seq++}`;
        parsed.push({ id, amount });
      }
      if (!parsed.length) throw new Error('No recipients found — expected name + amount columns');

      // append, skipping blank starter rows
      setRows((prev) => [...prev.filter(r => r.id.trim()), ...parsed]);
    } catch (e) { console.error('parseFile error:', e); setErr('Could not parse file: ' + e.message); }
  };

  const loadPublished = async () => {
    try {
      const [rRes, pRes] = await Promise.all([
        fetch(`${API}/recipients`),
        fetch(`${API}/pool`),
      ]);
      const r = await rRes.json();
      const pool = await pRes.json();
      const list = r.recipients && r.recipients.length
        ? r.recipients.map(x => ({ id: x.id, amount: Number(x.amount) }))
        : null;
      if (list) {
        // Restore the editable recipient list only. Do NOT restore "built"/"published"
        // state on mount — the root, tickets, and publish UI appear only when the user
        // actively builds the list this session. "Clear all" is the only thing that wipes it.
        setRows(list);
      }
    } catch {}
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      parseFile(files[0]);
    }
  };

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const over = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
    const leave = (e) => { e.preventDefault(); setDragOver(false); };
    const drop = (e) => {
      e.preventDefault(); e.stopPropagation(); setDragOver(false);
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) parseFile(f);
    };
    el.addEventListener('dragover', over);
    el.addEventListener('dragleave', leave);
    el.addEventListener('drop', drop);
    return () => { el.removeEventListener('dragover', over); el.removeEventListener('dragleave', leave); el.removeEventListener('drop', drop); };
  }, []);

  const [anchor, setAnchor] = useState(null);

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const downloadTemplate = () => {
    const csv = 'name,amount\nalice,250\nbob,400\ncarol,150\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'medkit-recipients-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const update = (i, k, v) => setRows(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows([...rows, { id: '', amount: 0 }]);
  const copyTicket = async (id, secret) => {
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = secret; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(id); setTimeout(() => setCopied(''), 1500);
  };
  const clearAll = () => { setRows([{ id: '', amount: 0 }]); setBuilt(null); setPublished(null); setErr(''); try { sessionStorage.removeItem('medkit_rows'); } catch {} };
  const delRow = (i) => setRows(rows.filter((_, j) => j !== i));

  const build = async () => {
    setErr(''); setBusy('build'); setPublished(null);
    try {
      const clean = rows.filter(r => r.id.trim()).map(r => ({ id: r.id.trim(), amount: Number(r.amount) || 0 }));
      const res = await fetch(`${API}/build-list`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipients: clean }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBuilt(data);
      onRoot?.(data);
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  const publish = async () => {
    setErr(''); setBusy('publish');
    try {
      const res = await fetch(`${API}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPublished(data);
      onPublished?.(data);
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  const doAnchor = async () => {
    setErr(''); setBusy('anchor');
    try {
      const res = await fetch(`${API}/anchor`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnchor(data);
    } catch (e) { setErr(String(e.message)); }
    setBusy('');
  };

  return (
    <div className="ngo">
      <div className="ngo-head">
        <p className="demo-intro">
          Build your eligibility list. Only a cryptographic <strong>root</strong> goes on-chain — names never leave this device.
        </p>
        <button className="ngo-template" onClick={downloadTemplate}>⬇ Download template</button>
      </div>


      <div
        ref={dropRef}
        className={`ngo-drop ${dragOver ? 'over' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden
               onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])} />
        <span className="ngo-drop-icon">⬆</span>
        <span className="ngo-drop-text">Drag and drop your CSV or Excel file here</span>
        <span className="ngo-drop-or">or</span>
        <button type="button" className="ngo-choose" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>Choose file</button>
        <span className="ngo-drop-sub">CSV, XLSX up to 10MB</span>
      </div>

      <div className="ngo-table">
        <div className="ngo-tr ngo-th">
          <span>Recipient ID</span><span>Amount (XLM)</span><span>Status</span><span></span>
        </div>
        {rows.map((r, i) => (
          <div className="ngo-tr" key={i}>
            <div className="ngo-idcell">
              <span className="ngo-rec">REC-{String(i + 1).padStart(3, '0')}</span>
              <input value={r.id} placeholder="name or id" onChange={(e) => update(i, 'id', e.target.value)} />
            </div>
            <input type="number" value={r.amount} onChange={(e) => update(i, 'amount', e.target.value)} />
            <span className={`ngo-status ${Number(r.amount) > 0 && r.id.trim() ? 'valid' : 'pending'}`}>
              <span className="ngo-status-dot" />{Number(r.amount) > 0 && r.id.trim() ? 'Valid' : 'Incomplete'}
            </span>
            <button className="ngo-del" onClick={() => delRow(i)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        ))}
      </div>

      <div className="ngo-meta">
        <div className="ngo-meta-btns">
          <button className="ngo-add" onClick={addRow}>+ Add recipient</button>
          <button className="ngo-clear" onClick={clearAll}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Clear all</button>
        </div>
        <span>{rows.length} recipients · {total} XLM total</span>
      </div>

      <div className="ngo-actions">
        {!built ? (
          <button className="btn-primary ngo-cta" onClick={build} disabled={busy === 'build'}>
            {busy === 'build' ? 'Building…' : 'Preview & Publish List'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        ) : (
          <button className="btn-primary ngo-cta" onClick={publish} disabled={busy === 'publish'}>
            {busy === 'publish' ? 'Publishing…' : 'Publish On-Chain'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        )}
      </div>
      <p className="ngo-help">{built ? 'Root generated — publish to sign it on-chain.' : "You'll sign the list root on the next step."}</p>

      {err && <div className="demo-err">⚠ {err}</div>}

      {built && (
        <div className="ngo-result">
          <div className="ngo-result-row">
            <span className="ngo-label">Merkle Root</span>
            <code className="ngo-mono">{built.root}</code>
          </div>
          <div className="ngo-note">✓ {built.tickets.length} secret claim tickets generated — handed privately to recipients.</div>
          <button className="ngo-link" onClick={() => setShowTickets(!showTickets)}>
            {showTickets ? 'Hide' : 'View'} tickets
          </button>
          {showTickets && (
            <div className="ngo-tickets">
              {built.tickets.map((t) => (
                <div key={t.id} className="ngo-ticket">
                  <b>{t.id}</b>
                  <code>{t.secret}</code>
                  <button className="ngo-copy" onClick={() => copyTicket(t.id, t.secret)} title="Copy ticket">
                    {copied === t.id ? '✓ Copied' : '⧉ Copy'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ngo-pubmgr">
        <div className="ngo-pubmgr-head">
          <span>Published Distribution &amp; Keys</span>
          <button className="ngo-copy" onClick={viewPublished}>↻ View current list &amp; keys</button>
        </div>
        {pubDist && (
          <div className="ngo-pubmgr-body">
            <div className="ngo-pubmgr-meta">
              Pool <code>{pubDist.poolId.slice(0,8)}…{pubDist.poolId.slice(-6)}</code> · <b>{pubDist.claimedCount}/{pubDist.total}</b> claimed
            </div>
            {pubDist.recipients.map(r => (
              <div key={r.id} className="ngo-pubrow">
                <span className="ngo-pubrow-cell">
                  <span className="ngo-pubrow-label">Handle</span>
                  <b className="ngo-pubrow-id" title="Verifier-issued handle — no name stored by the NGO">{handleFor(r.key)}</b>
                </span>
                <span className="ngo-pubrow-amt">{r.amount} XLM</span>
                <span className="ngo-pubrow-cell ngo-pubrow-keycell">
                  <span className="ngo-pubrow-label">Aid key</span>
                  <code className="ngo-pubrow-key">{r.key}</code>
                </span>
                <button className="ngo-copy" onClick={() => copyTicket(r.id, r.key)} title="Copy key">
                  {copied === r.id ? '✓' : '⧉'}
                </button>
                <span className={r.claimed ? 'ngo-badge claimed' : 'ngo-badge pending'}>
                  {r.claimed ? '✓ Claimed' : '○ Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {published && (
        <div className="ngo-success">
          <div className="ngo-success-head">✓ Live on Stellar · Names exposed: <b>0</b></div>
          <div className="ngo-result-row"><span className="ngo-label">Pool Contract</span><code className="ngo-mono">{published.poolId}</code></div>
          <div className="ngo-split">
            <div><span className="ngo-split-k">Public on-chain</span><span className="ngo-split-v">1 root hash</span></div>
            <div><span className="ngo-split-k">Kept private</span><span className="ngo-split-v">Every name, ID &amp; list position</span></div>
          </div>
          <button className="ngo-anchor-btn" onClick={doAnchor} disabled={busy === 'anchor'}>
            {busy === 'anchor' ? 'Anchoring on testnet…' : 'Anchor on public testnet ↗'}
          </button>
          {anchor && (
            <div className="ngo-anchor">
              <div className="ngo-anchor-head">✓ Anchored on Stellar testnet — publicly verifiable</div>
              {anchor.txs.map((t, i) => (
                <a key={i} className="ngo-tx" href={t.url} target="_blank" rel="noreferrer">
                  <span>{t.label}</span>
                  <code>{t.hash.slice(0, 10)}…{t.hash.slice(-6)} ↗</code>
                </a>
              ))}
              <a className="ngo-tx ngo-tx-contract" href={anchor.contractUrl} target="_blank" rel="noreferrer">
                <span>View pool contract</span><code>on stellar.expert ↗</code>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
