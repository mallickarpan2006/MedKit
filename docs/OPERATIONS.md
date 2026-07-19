# Operations runbook

## Event architecture

`AidPool` emits typed `set_root`, `deposit`, `withdraw`, and `claim` contract events. The browser polls Soroban RPC `getEvents` every five seconds using a persisted pagination cursor. A transient failure leaves the cursor intact and retries; a successful event causes the auditor view to refresh its authoritative `/pool` snapshot. This snapshot-plus-events design prevents missed updates from becoming permanent UI state.

## Deployment

1. Run the CI workflow and retain its build artifacts.
2. Build the circuit and verifier before deploying a new verification key.
3. Deploy the verifier, then deploy a new pool pointing at the verifier, token, root, and allotment.
4. Update `medkit_claim/deployment.json` only after RPC reads confirm the contract IDs.
5. Run a read-only `balance` invocation and an authenticated deposit/claim smoke test.

The deployer identity is a Stellar CLI key name, not a secret in the repository. GitHub Actions should use environment-scoped secrets or an external signer. Never put `STELLAR_SECRET_KEY` in source, logs, or frontend variables.

## Rollback

Soroban contracts are immutable in this deployment model. Roll back by switching the frontend/API manifest to the prior verified pool and verifier IDs, then redeploying the frontend artifact. Do not mutate a deployed verification key.

## Required environment variables

`VITE_STELLAR_NETWORK`, `VITE_STELLAR_NETWORK_PASSPHRASE`, `VITE_STELLAR_RPC_URL`, `VITE_STELLAR_HORIZON_URL`, `VITE_POOL_ID`, `VITE_CLAIM_VERIFIER_ID`, `VITE_IDENTITY_VERIFIER_ID`, `VITE_API_URL`, `MEDKIT_SOURCE`, and `STELLAR_NETWORK` are documented configuration values. Secret signing material belongs only in a wallet or protected CI environment.
