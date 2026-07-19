import { STELLAR } from '../stellarConfig';

const EVENT_TYPES = new Set(['deposit', 'claim', 'withdraw', 'set_root']);

export function normalizeContractEvents(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return events
    .map((event) => ({
      id: event.id || `${event.ledger || 0}:${event.txHash || ''}:${event.type || ''}`,
      type: String(event.type || event.topic || '').toLowerCase(),
      ledger: event.ledger,
      txHash: event.txHash || null,
      value: event.value ?? null,
      timestamp: event.timestamp || null,
    }))
    .filter((event) => EVENT_TYPES.has(event.type));
}

export async function fetchPoolEvents({ cursor = 0, signal } = {}) {
  if (!STELLAR.poolId) return { events: [], cursor };
  const response = await fetch(STELLAR.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: Date.now(), method: 'getEvents',
      params: {
        filters: [{ type: 'contract', contractIds: [STELLAR.poolId] }],
        pagination: { cursor: String(cursor || ''), limit: 100 },
      },
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Event sync failed (${response.status}).`);
  const rpc = await response.json();
  if (rpc.error) throw new Error(rpc.error.message || 'RPC event query failed.');
  const payload = rpc.result || {};
  return { events: normalizeContractEvents(payload), cursor: payload.pagination?.cursor ?? cursor };
}

export function subscribeToPoolEvents(onEvents, { intervalMs = 5000 } = {}) {
  let stopped = false;
  let cursor = Number(sessionStorage.getItem('medkit_event_cursor') || 0);
  let timer;

  const sync = async () => {
    if (stopped) return;
    try {
      const result = await fetchPoolEvents({ cursor });
      cursor = result.cursor;
      sessionStorage.setItem('medkit_event_cursor', String(cursor));
      if (result.events.length) onEvents(result.events);
    } catch {
      // Keep the cursor and retry: this handles transient RPC/network failures.
    } finally {
      if (!stopped) timer = setTimeout(sync, intervalMs);
    }
  };
  sync();
  return () => { stopped = true; clearTimeout(timer); };
}
