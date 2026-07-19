import {
  rpc as StellarRpc,
  TransactionBuilder,
  Contract,
  Address,
  nativeToScVal,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { STELLAR } from './stellarConfig';

const RPC_URL = STELLAR.rpcUrl;
const PASSPHRASE = STELLAR.networkPassphrase;

// Deposit `xlm` (whole XLM) from the connected donor wallet into the pool.
// Returns the transaction hash on success; throws on failure.
export async function donorDeposit({ poolId, donorAddress, xlm, onStep }) {
  const step = (m) => { try { onStep && onStep(m); } catch {} };
  const server = new StellarRpc.Server(RPC_URL);
  const stroops = BigInt(Math.round(Number(xlm) * 1e7));

  step('Building transaction…');
  const account = await server.getAccount(donorAddress);
  const contract = new Contract(poolId);

  const op = contract.call(
    'deposit',
    new Address(donorAddress).toScVal(),
    nativeToScVal(stroops, { type: 'i128' }),
  );

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  // Simulate + assemble (adds the from.require_auth() soroban auth + resource fees)
  step('Simulating on-chain…');
  tx = await server.prepareTransaction(tx);

  // Freighter signs (authorizes the transfer from the donor wallet)
  step('Awaiting your signature…');
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(tx.toXDR(), {
    networkPassphrase: PASSPHRASE,
    address: donorAddress,
  });

  const signed = TransactionBuilder.fromXDR(signedTxXdr, PASSPHRASE);
  step('Submitting…');
  const sent = await server.sendTransaction(signed);

  if (sent.status === 'ERROR') {
    throw new Error('Submit failed: ' + JSON.stringify(sent.errorResult || sent));
  }

  // Poll for confirmation
  step('Confirming on-chain…');
  let result = await server.getTransaction(sent.hash);
  let tries = 0;
  while (result.status === 'NOT_FOUND' && tries < 30) {
    await new Promise((r) => setTimeout(r, 500));
    result = await server.getTransaction(sent.hash);
    tries++;
  }

  if (result.status !== 'SUCCESS') {
    throw new Error('Transaction did not succeed: ' + result.status);
  }
  return sent.hash;
}
