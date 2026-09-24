# Level 2 usage and submission

The frontend calls the real Midnight SDK. The Level 1 contract is deployed and
verified on Preprod; its confirmed address is in the root README and
`frontend/.env.example`. The frontend is published at
https://zero-pass-zvhh.vercel.app. Browser wallet verification calls still need
end-to-end confirmation. Credential issuance and success results
come from actual transactions.

## Local setup

From the repository root:

```sh
npm ci
npm --prefix frontend ci
npm run validate
npm --prefix frontend test
npm run proof-server
```

In another terminal, run `npm --prefix frontend run dev`. The predev/prebuild
script copies only public prover keys, verifier keys and ZKIR assets from
`contract/managed/` into the static site. Generated JavaScript is bundled directly
from the original contract. Run `npm run compile` after any Compact source change.

The interface defaults to the confirmed Preprod deployment receipt. Override
public `VITE_MIDNIGHT_NETWORK` and `VITE_CONTRACT_ADDRESS` in
`frontend/.env.local`, or enter them in the interface. Only Preview and Preprod
are supported. Connect Midnight Lace or another compatible connector API 4 wallet;
ordinary Cardano Lace integration is insufficient.

ZeroPass sends credential proofs to `http://127.0.0.1:6300`, independently of
the wallet's own prover preference. Start proof server 8.1.0 on that address. A hosted HTTPS
site may require browser permission to reach a local service; the app does not
silently switch to a remote prover. Witness material reaches the local proving
process, not the public indexer. The browser orchestrates proving; the Docker
server performs proof computation.

Choose **Check local proof server** to test reachability before submitting any
private inputs. In Brave, open `brave://settings/content/localhostAccess` and
allow `https://zero-pass-zvhh.vercel.app`; if a separate Local network access
setting is shown for the site, allow that as well. Reload after changing the
permission. This is a per-site setting; global protections need not be disabled.
See [Brave's localhost permission guidance](https://brave.com/privacy-updates/27-localhost-permission/).

## Credential lifecycle

1. Obtain the finalized contract address using [DEPLOYMENT.md](DEPLOYMENT.md).
2. Connect a funded wallet to that address and network.
3. Create a holder credential. The browser generates its 32-byte secret and salt
   cryptographically; neither is rendered. Credential type labels use uppercase
   ASCII padded to 32 bytes, matching the generated Compact helper's encoding.
4. Export an encrypted backup. Share only the public issuance request with the
   institution; it includes network, address, commitment and credential type.
5. The institution uses a private issuer secret to derive a public issuer ID. The
   administrator registers that ID using the separate deployment admin secret.
   Enter authorization secrets only into the masked institution/admin field;
   do not record that step in a public video or paste secrets into chat.
6. The registered issuer pastes the public request and submits issuance. Contract
   authorization and duplicate prevention remain enforced on-chain.
7. The holder refreshes public state, obtains a verifier scope and verifies.
   Test-scope generation is available for the circuit demonstration, not login.
8. Only the issuing institution can revoke the commitment. A revoked credential
   cannot subsequently verify.

Secrets for an institution can be generated with a cryptographic password/key
manager as 32 random bytes encoded in hexadecimal. Store them privately. Wallet
seeds, issuer secrets, admin secrets and holder secrets have different purposes;
do not interchange them or use public test fixtures in a real deployment.

## Vault and recovery

One credential is stored per wallet-address/network/contract combination. The
vault uses AES-256-GCM, random IV/salt and PBKDF2-SHA-256 with 600,000 iterations.
Its authenticated context prevents moving ciphertext to another wallet, network
or contract. A passphrase is never saved; unlocked values exist only in memory.
Locking or disconnecting removes the holder credential from the active UI state.

To restore: connect the same wallet on the same network and contract, enter the
backup's passphrase, and choose Restore encrypted backup. Export before removing
a local copy. Removal affects browser storage only, not the public contract.
Clearing browser data, changing website origin or using another browser requires
restoring the backup. A forgotten passphrase cannot be recovered by ZeroPass.

The local vault is not a defense against compromised application code, an XSS
attack, a malicious extension or device compromise. This prototype has not had
an independent security audit.

## Transaction evidence

The UI exposes building, proving, wallet approval, submission and finalization
separately. It decodes the wallet's balanced transaction and saves its public ID
before submission. Success requires `SucceedEntirely` from the public indexer;
a failed fallible operation is a failure, not successful verification.

On a submission error or finalization timeout, the result remains unknown. Check
the retained transaction ID rather than resubmitting. Reconnecting recovers that
ID and requires a fresh network check; local storage's old success flag is not
trusted. Dismiss tracking only after reviewing network/wallet history. Dismissing
does not cancel an in-flight transaction.

## Vercel deployment

Use the existing ZeroPass project, with **Root Directory set to the repository
root**, not `frontend`. The root `vercel.json` installs both lockfiles, builds
the frontend and publishes `frontend/dist`. Generated contract code and assets
must be accessible from the repository root.

```sh
npx vercel login
npx vercel link
npx vercel env add VITE_MIDNIGHT_NETWORK
npx vercel env add VITE_CONTRACT_ADDRESS
npx vercel deploy
```

Set the public values for Preview and Production when prompted. After checking
the preview with the actual wallet, finalized contract and local proof server:

```sh
npx vercel deploy --prod
```

No application secret belongs in Vercel or a `VITE_*` value. The Level 2 hosted
URL is live; hosted-origin proof-server access and a real wallet transaction
must still be confirmed in the user's browser.

## Demo video (under two minutes)

Prepare an issued credential and unlocked vault before recording; exclude
authorization inputs, passphrases, backups and developer tools showing memory.

1. Show the selected test network and confirmed contract address.
2. Connect Midnight Lace and show the public wallet address.
3. Unlock off-record if necessary, then show only the public credential type.
4. Provide a fresh public scope and click Prove and submit; show actual proving
   progress and the wallet's approval request.
5. Show finalized success, public transaction ID and block height; refresh public
   state to show the updated verification count.
6. Explain that the secret/salt were not shown, while commitment, issuer and type
   remain public. Do not claim anonymity or show the legacy simulated video.

If proving or network confirmation takes longer, edit waiting time with a clear
cut; never replace a failed/unknown result with a simulated success.

## Remaining submission requirements

- Exercise the complete flow using a real installed Midnight wallet.
- Verify hosted-origin local-network permission and the resulting transaction.
- Record the real successful call and update README evidence links.

Level 1 deployment and Level 2 frontend publication are complete. The demo
credential's administrator/issuer setup has finalized on Preprod; see
`deployments/preprod.level2-setup.json`. Localhost and the public site have
separate vault storage. Export the encrypted backup from localhost, then connect
the same wallet and restore that backup on the public site using its passphrase.
Creating a new vault creates a different commitment that needs separate issuance.

Session expiry, server-side access decisions, issuer rotation/removal, credential
expiry and unlinkable presentations are future product work, not implemented
login guarantees.
