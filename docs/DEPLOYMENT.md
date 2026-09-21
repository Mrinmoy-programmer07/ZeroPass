# Deploy ZeroPass to a test network

No finalized network deployment has been established by this work. A local proof
is not a deployment receipt. The deployment command uses the generated contract,
all six SDK providers, an encrypted private-state database and a funded wallet.

## Prepare

Use Node.js 22 or newer, Docker and the pinned compiler from [VERSIONS.md](VERSIONS.md).
Run `npm ci`, `npm run compile` and `npm run validate` from the repository root.
Start Docker, then run `npm run proof-server` in a separate terminal. This starts
`midnightntwrk/proof-server:8.1.0`, listening only on `127.0.0.1:6300`.
Skip this command if the `zeropass-proof-server` container is already running.

Run `npm run prove:local` to generate a real verification proof using public test
fixtures. This needs the local proof server but no funded wallet or network
transaction. It does not establish on-chain acceptance.

## Configure and fund a test wallet

For a new test-only wallet, run:

```sh
npm run setup -- --new-wallet
npm run wallet -- address
```

Setup creates a private `.env` without overwriting an existing file and prints
only the public address. Alternatively, copy `.env.example` to `.env` and supply
your existing SDK wallet seed (32 bytes in hexadecimal), a fresh 32-byte admin
secret, and a strong private-state password. A mnemonic or wallet extension
connection is not a substitute for this SDK seed format.

Never commit or share `.env` or `.zeropass`. Back up both privately: losing the
admin secret prevents future issuer registration. On Windows, check that your
user account alone can read the file; POSIX mode flags do not set Windows ACLs.

The default network is Preprod. Get test tNIGHT from the
[Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/), then run:

```sh
npm run wallet -- status
npm run wallet -- register-dust
npm run wallet -- status
```

Registration submits a test-network transaction. Allow registered NIGHT to
generate DUST before deployment. Wallet synchronization can take several minutes.
For Preview, set `MIDNIGHT_NETWORK=preview` and use its corresponding faucet.
These scripts reject mainnet and remote proof servers: proving requests contain
private witness material.

## Deploy and retain evidence

```sh
npm run deploy -- --check
npm run deploy
```

`--check` validates local configuration and artifacts only; it does not test
funding or connectivity. Deployment checks proof-server health/version, waits
for wallet synchronization, checks DUST, and submits the actual SDK transaction.
The constructor receives the hash of your admin secret, never a zero placeholder.

After finalization, the script prints and writes a public receipt to
`deployments/preprod.json` (or `preview.json`): contract address, transaction ID,
block height, source hash, compiler version and timestamp. It refuses to replace
an existing receipt. Verify the address and transaction in the network explorer
before claiming Level 1 deployment completion. If execution is interrupted after
submission, inspect the public network/wallet history before trying again.

The local encrypted database is under `.zeropass/<network>/`. SDK exceptions are
not dumped because they may contain private transaction data. A stage-specific
failure message identifies which service to investigate.

See the official [deployment guide](https://docs.midnight.network/guides/deploy-and-operate),
[token guide](https://docs.midnight.network/guides/acquire-tokens), and
[local proving guide](https://docs.midnight.network/guides/local-proving).
