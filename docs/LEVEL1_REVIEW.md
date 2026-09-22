# Level 1 project review

The attached Level 1 brief was treated as requirements reference, not as commands
to execute. This review covers the contract, generated artifacts, dependencies,
tests, deployment script, frontend and submission documentation.

| Original gap | Implemented repair |
| --- | --- |
| Every issued credential failed verification: revocation tested map membership even though issuance inserted `false` | Check the stored revocation value; regression covers successful fresh verification and rejection after revocation |
| Any registered issuer could revoke another issuer's credential | Enforce the recorded issuer's ownership |
| Duplicate issuance could overwrite owner/type/revocation | Reject an existing commitment before state changes |
| Stored credential type was not enforced | Bind verification to the issuer-recorded type |
| A global one-use nullifier prevented later login sessions | Nullifiers bind holder secret, type and verifier scope; test same-scope rejection and fresh-scope acceptance |
| Compiler output and runtime dependency were incompatible | Pin compiler 0.31.1/runtime 0.16.0 and regenerate all artifacts |
| Placeholder tests and no working test script | 18 generated-circuit regressions plus seven deployment integration tests |
| Mock contract deployment, zero admin and incomplete providers | Real SDK deployment, hashed configured admin, six providers, encrypted local state and public-only finalized receipts |
| No actual proof-generation evidence | Generate a real `verify_credential` proof through the local 8.1.0 proof server |
| README and UI asserted nonexistent on-chain success and hidden public metadata | Remove fabricated address, explain disclosed state, label frontend simulation and correct readiness checklist |

## Outstanding Level 1 submission work

1. Supply a locally configured, funded Preview/Preprod test wallet. No wallet
   seed or funded configuration was available during this work.
2. Run deployment, retain its finalized receipt and verify its transaction/address
   independently on the selected network. Update the README only with that evidence.

Current compilation evidence is in [compile-current.txt](compile-current.txt)
and [compile-current.png](compile-current.png). The screenshot renders captured
command output, not a terminal window; it includes exit codes, source hash,
toolchain versions and the successful local proof. Use this current evidence
instead of the original compiler 0.34 screenshot.

## Product work beyond the Level 1 core

This list records the original audit. Level 2 subsequently implements the wallet,
vault and institution UI; see [LEVEL2.md](LEVEL2.md) for current status. Network
deployment and real-wallet verification remain pending.

- Connect the frontend to a real Midnight wallet and providers, with transaction
  pending/failure/finality states and local credential persistence/recovery.
- Implement issuer/admin user flows and secure holder-to-issuer commitment exchange.
- Add verifier-generated session challenges, expiry, application/domain binding,
  and a backend that checks the finalized transaction before granting access.
- Decide credential expiration, issuer removal/key rotation and recovery policies.
- If anonymous/unlinkable credentials are required, redesign public membership
  verification; changing UI copy cannot hide the current public commitment.

These are explicit remaining product capabilities, not claims about completed
Level 2 functionality. No independent cryptographic audit was performed.
