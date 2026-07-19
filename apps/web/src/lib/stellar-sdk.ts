import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  HORIZON_TESTNET_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "./stellar-wallet";

const server = new Horizon.Server(HORIZON_TESTNET_URL);
const nativeAsset = Asset.native();

type HorizonBalance = {
  asset_type?: string;
  balance?: string;
};

type HorizonAccountResponse = {
  balances?: HorizonBalance[];
};

export async function fetchXlmBalance(address: string): Promise<string> {
  const response = await fetch(`${HORIZON_TESTNET_URL}/accounts/${address}`);

  if (response.status === 404) {
    return "0";
  }
  if (!response.ok) {
    throw new Error(`Horizon balance request failed (${response.status}).`);
  }

  const account = (await response.json()) as HorizonAccountResponse;
  const nativeBalance = account.balances?.find(
    (balance) => balance.asset_type === "native",
  );

  return nativeBalance?.balance ?? "0";
}

export async function buildPaymentXdr(
  from: string,
  to: string,
  amount: string,
): Promise<string> {
  const account = await server.loadAccount(from);

  const transaction = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: to,
        asset: nativeAsset,
        amount,
      }),
    )
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

export async function submitSignedTx(
  signedXdr: string,
): Promise<{ hash: string }> {
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    STELLAR_TESTNET_PASSPHRASE,
  );
  const result = await server.submitTransaction(transaction);
  return { hash: result.hash };
}
