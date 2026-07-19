# UltraHonk Soroban Verifier

This directory contains the Rust verifier workspace and Noir circuits used by the RWA project.

## Layout

- `circuits/` — Noir circuit sources and circuit build utilities.
- `contracts/` — Soroban contracts, including the verifier and identity contracts.
- `crates/` — verifier implementation and shared test utilities.
- `scripts/invoke_ultrahonk/` — optional local invocation helper.
- `scripts/measure_ultrahonk_costs/` — optional measurement helper.

## Development

Install Rust with the `wasm32v1-none` target, Noir, Barretenberg, Node.js, and the Stellar CLI as needed by the selected circuit or contract. The task runner exposes the source-building commands:

```bash
just --list
just build-circuits
just build-contract
just build-identity-contract
```

Run the Rust test suite after building any circuit artifacts required by the tests:

```bash
cargo test --workspace --all-features --release
```

The workspace contains the verifier implementation, contracts, circuits, and test fixtures. Project-specific usage and operational documentation can be added here as the RWA project evolves.
