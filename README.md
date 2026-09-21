# ZeroPass

Credential verification on Midnight using private secret possession.

ZeroPass is a prototype for issuing and verifying credentials without publishing
their secret preimages. A trusted issuer registers a credential commitment; its
holder proves possession while the contract checks its type and revocation state.
The product idea is reusable membership or qualification verification with less
disclosure than handing each service a copy of the underlying document.

**Current status:** four compiled transaction circuits, 25 passing regression and
deployment-wiring tests, and a real locally generated verification proof. There
is **no confirmed Preview/Preprod deployment receipt**. The frontend is an
explicitly labeled interactive demo; it does not connect a wallet or submit proofs.

## Level 1 readiness

| Requirement | Evidence / status |
| --- | --- |
| Own Compact contract | [contract/zeropass.compact](contract/zeropass.compact) |
| Successful compilation | Pinned compiler 0.31.1; four circuits and generated proof assets; [current output](docs/compile-current.txt) |
| At least three meaningful passing tests | 25 tests; `npm run validate` |
| Public/private state explanation | Table below and inline contract comments |
| Product idea and reproducible setup | This README and linked guides |
| Meaningful Git history | Five focused repair commits, following the original project history |
| Actual Preview or Preprod deployment | **Pending funded test wallet, finalization and public receipt** |

See [the gap analysis](docs/LEVEL1_REVIEW.md) for the original problems, fixes and
remaining work. Current command evidence is documented in [TESTING.md](docs/TESTING.md).
The image below renders captured command output with exit codes and the source
hash; it is a build-log report, not a terminal screenshot or deployment receipt.
The older `docs/compile_output.png` remains historical compiler 0.34 evidence.

![Current compilation, artifact and local proof evidence](docs/compile-current.png)

## Contract behavior

| Circuit | Authorization and effect |
| --- | --- |
| `register_issuer(issuer_id)` | Admin secret must hash to the constructor's admin ID; registers an issuer |
| `issue_credential(commitment, cred_type)` | Registered issuer only; rejects duplicate commitments; records owner/type |
| `verify_credential(expected_type, scope)` | Checks secret/salt commitment, issued type and revocation; records a scoped nullifier |
| `revoke_credential(commitment)` | Only the recorded issuing institution can revoke |

The holder computes `credential_commitment(secret, salt, ctype)` using the
generated pure helper. Admin and issuer IDs use `identity(secret)`. The same
holder secret and type can verify once per scope, allowing subsequent sessions
with different scopes. A verifier must generate and validate its session scope
and bind the resulting transaction to that session. The contract alone is not
a complete login protocol.

## Privacy: what is actually public

| Data | Visibility |
| --- | --- |
| Holder secret and salt | Private witness preimages |
| Admin and issuer secrets | Private authorization preimages |
| Credential type | Supplied as a witness, but also stored and checked publicly; not confidential |
| Credential commitment, existence and revocation | Public ledger and verification lookups |
| Credential issuer, issuer registry and admin ID | Public identifiers; secret preimages remain private |
| Issuance/verification counters | Public |
| Used nullifiers and their verification scopes | Public |

Verification discloses the credential commitment, linking activity to its recorded
issuer and type. ZeroPass does **not** currently provide anonymous membership,
hidden issuers or unlinkable presentations. Possession of a secret is not proof
of a person's real-world identity; credential sharing is not prevented.

Witness material is sent to the proving process. The scripts require a loopback
proof server so that this stays on the local machine. Only public transaction
data and the resulting proof are intended for the chain. The transcript regression
test checks for raw preimage leakage; it is not an independent security audit.

## Run locally

Prerequisites: Node.js 22+, the Compact CLI, and Linux/macOS or Ubuntu WSL on
Windows. Docker is needed for proving/deployment, not for the offline test suite.
Follow Midnight's [developer documentation](https://docs.midnight.network/)
to install the CLI, then install the compiler used by this repository:

```sh
git clone https://github.com/Mrinmoy-programmer07/ZeroPass.git
cd ZeroPass
npm ci
compact update --no-set-default 0.31.1
npm run compile
npm run validate
```

On Windows, run `compact update` inside Ubuntu WSL. The compile script invokes
that compiler through WSL automatically; the other commands run with Windows
Node. PowerShell users can use `npm.cmd` if script execution policy blocks `npm`.
See [VERSIONS.md](docs/VERSIONS.md) for the pinned compatibility matrix.

To generate a real proof with public test fixtures, start Docker and run these
in separate terminals:

```sh
npm run proof-server
```

```sh
npm run prove:local
```

This proves `verify_credential` locally without submitting a transaction. See
[TESTING.md](docs/TESTING.md) for what each verification layer establishes.

## Deploy to Preview or Preprod

Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md) to configure a private SDK wallet,
fund it with test tNIGHT, register DUST generation, and deploy. The script uses
the actual generated contract and saves only finalized public evidence to
`deployments/<network>.json`. No placeholder address is a deployment.

| Network | Confirmed address |
| --- | --- |
| Preprod | Pending |
| Preview | Pending |

## Frontend walkthrough

```sh
cd frontend
npm ci
npm run dev
```

Choose **Explore demo**, then **Run demo**. All credentials and progress steps
are illustrative. `npm run build` checks TypeScript and creates the production
bundle; `npm run lint` runs the frontend linter.

The historical hosted demo and [legacy video](docs/demo_video.mp4) are not evidence
of wallet connectivity, a real proof or network finalization. Level 2 still needs
real Midnight wallet integration, credential handling, session verification and
an end-to-end transaction demonstration.

## Repository map

- `contract/zeropass.compact`: source of the four transaction circuits and hash helpers.
- `contract/managed/`: compiler-generated JavaScript, type definitions and proof assets.
- `contract/witnesses.mjs`: validated local witness accessors.
- `tests/`: actual generated-circuit regressions and offline deployment integration.
- `scripts/`: pinned compilation, wallet, proof and deployment commands.
- `frontend/`: React/Vite interactive demo.
- `docs/`: review, version, testing and deployment guidance.
