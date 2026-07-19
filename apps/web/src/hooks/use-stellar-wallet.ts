"use client";

import { useCallback, useState } from "react";
import {
  buildPaymentXdr,
  fetchXlmBalance,
  submitSignedTx,
} from "../lib/stellar-sdk";
import {
  connectWallet,
  signTx,
} from "../lib/stellar-wallet";

export type StellarWalletState = {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<StellarWalletState>({
    address: null,
    balance: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const connect = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const address = await connectWallet();
      const balance = await fetchXlmBalance(address);
      setState({ address, balance, isConnected: true, isLoading: false, error: null });
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to connect wallet.",
      }));
    }
  }, []);

  const disconnect = useCallback((): void => {
    setState({ address: null, balance: null, isConnected: false, isLoading: false, error: null });
  }, []);

  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!state.address) return;
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const balance = await fetchXlmBalance(state.address);
      setState((current) => ({ ...current, balance, isLoading: false }));
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unable to refresh balance.",
      }));
    }
  }, [state.address]);

  const sendXlm = useCallback(async (to: string, amount: string): Promise<{ hash: string }> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      if (!state.address) {
        throw new Error("Connect a wallet before sending XLM.");
      }
      const xdr = await buildPaymentXdr(state.address, to, amount);
      const signedXdr = await signTx(xdr);
      const result = await submitSignedTx(signedXdr);
      const balance = await fetchXlmBalance(state.address);
      setState((current) => ({ ...current, balance, isLoading: false }));
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to send XLM.";
      setState((current) => ({ ...current, isLoading: false, error: message }));
      throw new Error(message);
    }
  }, [state.address]);

  return { ...state, connect, disconnect, refreshBalance, sendXlm };
}
