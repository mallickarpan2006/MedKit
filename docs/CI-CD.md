# MedKit CI/CD pipeline

The repository uses a sequential, fail-fast delivery pipeline. Every stage has
an explicit dependency on the stage before it; a failed quality gate prevents
contract builds and release packaging from running.

```mermaid
flowchart LR
    A[01 Checkout<br/>source revision] --> B[02 Frontend quality<br/>npm install → lint → typecheck → test]
    B --> C[03 Contract tests<br/>Pool → Identity]
    C --> D[04 Production build<br/>Vite + Pool WASM + Verifier WASM + Identity WASM]
    D --> E[05 Release package<br/>frontend + WASM + manifest + source archive]
    E --> F{Protected environment<br/>manual approval}
    F -->|approved| G[Deploy<br/>Verifier → Pool → Frontend/API]
    F -->|rejected| H[Stop safely]
    G --> I[Read-only health check\nthen authenticated smoke test]
    I -->|failure| J[Rollback\nrestore prior immutable manifest]
```

## Execution contract

`ci.yml` runs stages 01–05 for every push and pull request. The `needs` chain
is deliberate: `frontend` waits for `checkout`, `contracts` waits for
`frontend`, `build` waits for `contracts`, and `package` waits for `build`.

The build stage produces the deployable frontend and Soroban WASM artifacts.
The package stage checks that the manifest, frontend bundle, contract WASM,
and source archive all exist and are non-empty before marking CI green.

`deploy.yml` is a manually dispatched, environment-scoped workflow. GitHub
Environment approvals and secrets remain outside the repository. Deployment
must publish the verifier before the pool, update the manifest only after RPC
confirmation, and finish with a read-only balance check plus an authenticated
deposit/claim smoke test. If validation fails, restore the previous immutable
contract manifest as documented in [`OPERATIONS.md`](OPERATIONS.md).

## Green criteria

- Frontend dependencies install reproducibly from the lockfile-aware package manifest.
- Lint, typecheck, frontend tests, and production build pass.
- Aid pool and identity contract tests pass.
- All three contract targets compile to `wasm32v1-none`.
- The release package contains the frontend, deployment manifest, WASM files,
  and reproducibility source archive.

No signing key is required by CI. Signing and chain mutation belong only to the
protected deployment environment.
