# Level 2 verification

Verified locally on 2026-09-22. Implemented code, test doubles, actual browser
execution and network evidence are distinguished below.

## Passed

| Layer | Evidence |
| --- | --- |
| Contract/deployment regressions | `npm run validate`: 25 passed |
| Frontend regressions | `npm --prefix frontend test`: 19 passed |
| Production build and lint | TypeScript, Vite and oxlint passed |
| Production dependency audit | `npm audit --omit=dev`: zero reported vulnerabilities at verification time |
| Browser SDK | Real Midnight SDK/WASM loaded after browser polyfill fixes |
| Address decoder | Long shielded addresses handled with checksum, network and payload validation |
| Production UI connection | Isolated connector test double opened the workspace; not a real Lace demonstration |
| Vault recovery | Production UI created, encrypted, locked and unlocked a randomly generated disposable credential |
| Privacy DOM check | Secret/salt absent from rendered text and input values; public commitment present |
| Encrypted storage | Secret/salt absent from stored ciphertext |
| Disconnect | Connected workspace removed and vault locked |
| Mobile layout | At 390px, document width did not exceed viewport; screenshot visually inspected |
| Browser errors | None reported during successful production UI/vault checks |

The 19 frontend tests cover encrypted round-trip, wrong password, tampering,
wallet/network/contract binding, malformed backups, public-only issuance export,
loopback proving, wallet discovery/duplicates, network mismatch, rejection,
successful finalization, proof failure, submission ambiguity, failed fallible
execution and timeout recovery without resubmission. Lifecycle tests use explicit
test doubles; they do not establish network finality.

## Additional browser proof harness

With the development server and local proof server running, open
`http://127.0.0.1:5173/tests/proof.html` and choose Generate real local proof.
The harness builds a real SDK transaction from a synthetic ledger and asks the
loopback server to prove it. It uses public fixtures only and cannot submit to a
network. It is not a production entry point.

The page loaded, but its proof run was **not completed during this verification**:
the browser automation executable subsequently failed to start (`spawn UNKNOWN`),
and the alternate browser tool had no available browser. This is not recorded as
a passing browser-proof test. The earlier Level 1 Node local proof result remains
documented separately in `proof-current.txt`.

## Not yet verified

- A real installed wallet connecting, approving fees and submitting a transaction.
- Browser proof generation through the local server, including hosted-origin
  local-network permission/CORS behavior.
- A successful browser wallet circuit call on Preview or Preprod.
- A deployed Level 2 frontend URL and real-wallet demonstration video.

Funding was initially deferred. On September 23, 2026, the SDK wallet was funded,
DUST was registered, and the Level 1 contract finalized on Preprod. Its public
[deployment receipt](../deployments/preprod.json) and
[verification receipt](../deployments/preprod.verification.json) are retained.
The wallet's `.env` and encrypted local state remain ignored; no secret was
published. Public frontend hosting and its browser wallet demonstration remain pending.

The production site lazily loads the SDK. Vite reports a large SDK chunk; the
ledger/runtime WASM assets total roughly 11 MB before compression. Expect a
heavier first connection than the initial page load.
