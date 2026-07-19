import {
  getAddress,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

function freighterError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return new Error(message);
    }
  }

  return new Error("Freighter request failed.");
}

export async function detectFreighter(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch (error: unknown) {
    throw freighterError(error);
  }
}

export async function connectWallet(): Promise<string> {
  try {
    const allowed = await isAllowed();
    if (allowed.error) {
      throw freighterError(allowed.error);
    }

    if (!allowed.isAllowed) {
      const access = await requestAccess();
      if (access.error) {
        throw freighterError(access.error);
      }
    }

    const wallet = await getAddress();
    if (wallet.error) {
      throw freighterError(wallet.error);
    }
    if (!wallet.address) {
      throw new Error("Freighter did not return a wallet address.");
    }

    return wallet.address;
  } catch (error: unknown) {
    throw freighterError(error);
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const allowed = await isAllowed();
    if (allowed.error) {
      throw freighterError(allowed.error);
    }
    if (!allowed.isAllowed) {
      return null;
    }

    const wallet = await getAddress();
    if (wallet.error) {
      throw freighterError(wallet.error);
    }

    return wallet.address || null;
  } catch (error: unknown) {
    throw freighterError(error);
  }
}

export async function signTx(xdr: string): Promise<string> {
  try {
    const result = await signTransaction(xdr, {
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    });
    if (result.error) {
      throw freighterError(result.error);
    }
    if (!result.signedTxXdr) {
      throw new Error("Freighter did not return a signed transaction.");
    }

    return result.signedTxXdr;
  } catch (error: unknown) {
    throw freighterError(error);
  }
}
