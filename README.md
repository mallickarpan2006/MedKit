# MedKit

MedKit is a privacy-preserving aid distribution application. Noir/UltraHonk proofs establish eligibility, Soroban contracts verify proofs and release native XLM, and a React/Vite console gives NGOs live operational visibility without putting beneficiary names on-chain.

## Features

- ZK eligibility, identity, and medical credential flows.
- Soroban aid pool with admin access control, root updates, nullifiers, address binding, balance checks, and typed events.
- Inter-contract verifier call from the pool to `verify_proof`.
- Freighter-compatible wallet deposits and transaction status handling.
- Soroban RPC event synchronization with cursor persistence and retry/reconnect behavior.
- Responsive Vite frontend, API demo backend, Rust tests, frontend tests, CI artifacts, and deployment runbook.

## Deployed Testnet addresses

These are the current addresses from the checked-in [`medkit_claim/deployment.json`](medkit_claim/deployment.json) for the 2026-07-19 Stellar Testnet deployment. Each address links to its Testnet contract explorer page.

| Component | Contract address |
| --- | --- |
| Claim verifier | [`CAUQC7WHWXHAAW3DYQIV2O2E5NKRE5DR7CT65YDW5UXDRUX4LDABRPWY`](https://stellar.expert/explorer/testnet/contract/CAUQC7WHWXHAAW3DYQIV2O2E5NKRE5DR7CT65YDW5UXDRUX4LDABRPWY) |
| Identity verifier | [`CD2CLFLMV7LJ3WNJS2KRIXKIWJFP2ZQUSRLJFG3IP53KSHCKSFQLQMW2`](https://stellar.expert/explorer/testnet/contract/CD2CLFLMV7L3JWNJS2KRIXKIWJFP2ZQUSRLJFG3IP53KSHCKSFQLQMW2) |
| Aid pool | [`CCETTCRECCT2IV6M4K7SLTLFPI4YUKVFILV3JL23VPAL2XKFT77UB5TA`](https://stellar.expert/explorer/testnet/contract/CCETTCRECCT2IV6M4K7SLTLFPI4YUKVFILV3JL23VPAL2XKFT77UB5TA) |
| Native asset contract | [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| Tornado-compatible mixer | [`CD7JCCJU64NYRSECIXHOSHBKU2LDUF72JWUHIBKAUCKLTYW7YYA4HZMI`](https://stellar.expert/explorer/testnet/contract/CD7JCCJU64NYRSECIXHOSHBKU2LDUF72JWUHIBKAUCKLTYW7YYA4HZMI) |

The repository contains no verified interaction transaction hash. The `POST /anchor` endpoint and the deployment runbook produce one from a live testnet invocation; it must be recorded from the CLI/RPC output rather than fabricated.

## Architecture

`frontend/` is the React/Vite client. `medkit_claim/server.mjs` is the demo/API orchestration layer. `contracts/pool` holds the aid pool. `contracts/verifier-v26` holds the Soroban UltraHonk verifier, identity contract, and Noir circuits. The pool validates the root, address binding, amount, and nullifier, then calls the verifier contract before transferring tokens.

Important events are `set_root`, `deposit`, `withdraw`, and `claim`. The client queries Soroban RPC `getEvents`, persists its cursor in session storage, retries on transient errors, and refreshes the API snapshot after new events.

## Local installation

Requirements: Node.js 22, Rust, `wasm32v1-none`, Nargo `1.0.0-beta.9`, Barretenberg `v0.87.0`, and Stellar CLI 27+.

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

To run the demo API, install `medkit_claim` dependencies and start `MEDKIT_SOURCE=medkit-testnet-20260719 node server.mjs`; then run `npm run dev` in `frontend`. The frontend defaults to the checked-in testnet manifest and can be overridden with `VITE_*` variables.

## Contracts and deployment

```bash
cargo test --manifest-path contracts/pool/Cargo.toml
cargo test --manifest-path contracts/verifier-v26/contracts/identity/Cargo.toml
cargo build --manifest-path contracts/pool/Cargo.toml --target wasm32v1-none --release
```

Build fresh circuits and verifier artifacts before changing a verification key. Deploy a new verifier and a new pool together, then update the manifest. Use [`scripts/deploy-testnet.sh`](scripts/deploy-testnet.sh) with a protected Stellar CLI identity. Rollback means repointing the manifest to the prior immutable contract pair; see [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

## CI/CD

<img width="1458" height="813" alt="Screenshot 2026-07-19 at 11 05 08 PM" src="https://github.com/user-attachments/assets/18f6bbde-a6e4-4739-a10e-dc40f2230080" />

## Demo walkthrough

1. Open `/demo` and build a recipient list from the supplied CSV/XLSX template.
2. Publish the Merkle root and inspect the Funding and Audits panels.
3. Connect Freighter on Stellar Testnet and deposit XLM.
4. Use the recipient flow to generate/verify a proof and submit the claim.
5. Observe the returned transaction hash and the Audits live-event synchronization.

## Screenshots

The existing visual assets used by the demo are in `frontend/src/assets/` and `frontend/public/`. Add captured browser screenshots to `docs/screenshots/` during release qualification; screenshots cannot be generated or verified in this headless workspace.

## Troubleshooting

- Wallet errors: install Freighter, select Testnet, and ensure the account is funded.
- RPC errors: check the network passphrase and `VITE_STELLAR_RPC_URL`.
- Invalid proof: rebuild the circuit artifacts and deploy a matching verifier/pool pair.
- Empty live activity: wait for the RPC cursor poll or clear `medkit_event_cursor` in session storage.
- CI deployment gate: configure environment variable `STELLAR_NETWORK`; signing stays in the protected Stellar CLI environment.

## Repository quality

This checkout has no `.git` directory, so commit count, commit authorship, and commit history cannot be verified or modified from this workspace. Use the recommended progression: `contracts: harden pool`, `contracts: add verifier tests`, `frontend: add wallet states`, `frontend: add event sync`, `test: add contract coverage`, `test: add frontend coverage`, `ci: add verification workflow`, `deploy: add protected workflow`, `docs: add operations runbook`, `release: record deployment evidence`.
