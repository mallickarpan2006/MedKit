import deployment from '../../medkit_claim/deployment.json';

export const STELLAR = {
  network: import.meta.env.VITE_STELLAR_NETWORK || deployment.network,
  networkPassphrase: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || deployment.networkPassphrase,
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL || deployment.rpcUrl,
  horizonUrl: import.meta.env.VITE_STELLAR_HORIZON_URL || deployment.horizonUrl,
  claimVerifierId: import.meta.env.VITE_CLAIM_VERIFIER_ID || deployment.claimVerifierId,
  identityVerifierId: import.meta.env.VITE_IDENTITY_VERIFIER_ID || deployment.identityVerifierId,
  poolId: import.meta.env.VITE_POOL_ID || deployment.poolId,
  nativeTokenId: import.meta.env.VITE_NATIVE_TOKEN_ID || deployment.nativeTokenId,
};
