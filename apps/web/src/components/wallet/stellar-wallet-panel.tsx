"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import {
  connectWallet,
  detectFreighter,
  signTx,
} from "../../lib/stellar-wallet";
import { useWallet } from "../../hooks/use-stellar-wallet";

export function StellarWalletPanel(): ReactElement {
  const wallet = useWallet();
  const [freighterDetected, setFreighterDetected] = useState<boolean | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    void detectFreighter()
      .then(setFreighterDetected)
      .catch(() => setFreighterDetected(false));
  }, []);

  async function handleSend(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    try {
      const result = await wallet.sendXlm(destination.trim(), amount.trim());
      setFeedback({ type: "success", message: `Transaction sent! Hash: ${result.hash}` });
      setDestination("");
      setAmount("");
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Transaction failed.",
      });
    }
  }

  const busy = wallet.isLoading;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-slate-900">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">Stellar testnet</p>
        <h1 className="text-3xl font-bold">Stellar Wallet — Freighter Integration</h1>
        <p className="mt-2 text-slate-600">Connect, inspect your XLM balance, and send a testnet payment.</p>

        {freighterDetected === false && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Freighter was not detected. <a className="font-semibold underline" href="https://freighter.app" target="_blank" rel="noreferrer">Install Freighter</a>
          </div>
        )}

        {wallet.error && <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{wallet.error}</p>}
        {feedback && (
          <div className={`mt-6 rounded-lg p-4 ${feedback.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {feedback.type === "success" ? (
              <>Transaction sent! Hash: <a className="break-all underline" href={`https://stellar.expert/explorer/testnet/tx/${feedback.message.split("Hash: ")[1]}`} target="_blank" rel="noreferrer">{feedback.message.split("Hash: ")[1]}</a></>
            ) : feedback.message}
          </div>
        )}

        {!wallet.isConnected ? (
          <button className="mt-8 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50" onClick={() => void wallet.connect()} disabled={busy || freighterDetected === false}>
            {busy ? "Connecting…" : "Connect Wallet"}
          </button>
        ) : (
          <>
            <div className="mt-8 rounded-xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Connected address</p>
              <p className="mt-1 break-all font-mono text-sm">{wallet.address}</p>
              <p className="mt-5 text-sm text-slate-500">XLM balance</p>
              <p className="mt-1 text-4xl font-bold">{wallet.balance ?? "0"} XLM</p>
              {wallet.balance === "0" && <p className="mt-1 text-sm text-slate-500">0 XLM (account not funded)</p>}
              <div className="mt-5 flex gap-3">
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={() => void wallet.refreshBalance()} disabled={busy}>Refresh Balance</button>
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={wallet.disconnect}>Disconnect</button>
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={(event) => void handleSend(event)}>
              <h2 className="text-xl font-semibold">Send XLM</h2>
              <label className="block text-sm font-medium">Destination address<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="G…" required /></label>
              <label className="block text-sm font-medium">Amount (XLM)<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3" value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.0000001" step="0.0000001" required /></label>
              <button className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50" type="submit" disabled={busy}>{busy ? "Sending…" : "Send XLM"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

void connectWallet;
void signTx;
