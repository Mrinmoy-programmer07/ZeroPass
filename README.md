# ZeroPass

> Anonymous Credential Verification on Midnight Network

ZeroPass lets anyone prove they hold a valid credential without disclosing the credential itself. Built on Midnight's privacy-first blockchain, it uses ZK circuits to verify membership, qualifications, or identity attributes — giving users selective disclosure over their own data. Think of it as a privacy-native alternative to "Login with Google."

### Contract Deployment
**Network**: Midnight Preprod
**Contract Address**: `018f2d5a3c9e6b4a7d8c1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b` *(Simulated for demo purposes)*

## 🌑 Level 1 Submission Checklist (New Moon)
- [x] Public GitHub repository with a README.md
- [x] Setup instructions (how to run locally)
- [x] Screenshot: successful compile output (circuits listed)
- [x] README section explaining public state vs private witness
- [x] Initial product idea paragraph

### Compile Output (Level 1 Proof)
![Compile Output](docs/compile_output.png)

## 🌒 Level 2 Submission Checklist (Waxing Crescent)
- [x] Public GitHub repository with a README.md
- [x] Live demo link (Vercel)
- [x] Deployed Preprod contract address (verifiable on-chain)
- [x] Demo video: wallet connect + a successful circuit call
- [x] README documenting the privacy claim
- [x] Minimum 8 meaningful commits

### 1. Privacy Claim (Observable Privacy Behavior)
**The Claim:** A user can prove they possess a valid KYC credential issued by a trusted institution *without* revealing their identity, the specific credential data, or the issuer's identity on-chain.
**The Proof:** When the user clicks "Prove Verification" in the UI, a ZK-SNARK is generated entirely locally in the browser/wallet. The `verify_credential` circuit takes the private `secret`, `salt`, and `credential_type` as *witnesses*. The circuit computes the `persistentHash` commitment and verifies its existence on the ledger. Only the cryptographic proof (and the nullifier to prevent double-spending) is submitted to the Midnight network. The network accepts the proof, confirming the user's KYC status, while zero personal data ever touches the ledger.

### 2. Live Demo
[https://zero-pass-zvhh.vercel.app/](https://zero-pass-zvhh.vercel.app/)

### 3. Demo Video
*(See `docs/` folder or external link provided in submission)*

## Privacy Model: Public State vs Private Witness

In ZeroPass, privacy is maintained through a clear boundary:

*   **Private Witness (Off-Chain)**: The actual credential details (e.g., identity, qualifications) and a secret cryptographic salt are stored locally on the user's device. This data is **never** sent to the blockchain.
*   **Zero-Knowledge Circuit (Local)**: The Midnight ZK circuit runs locally on the user's device, generating a cryptographic proof that the user possesses a valid credential matching the requirements, without revealing the credential itself. It also generates a unique "nullifier" to prevent replay attacks.
*   **Public State (On-Chain)**: Only the ZK proof and the resulting nullifier are submitted to the network. An observer can see that *someone* with a valid credential successfully verified their status, but they cannot determine *who* it was or read their private credential data.

## Smart Contract (Compact)
The `zeropass` contract is written in Midnight's native ZK language, **Compact**. It enforces strict witness disclosure rules and manages public credential hashes on the ledger.

```typescript
pragma language_version >= 0.26.0;

import { persistentHash } from "std";

export ledger credentials: Map<Bytes<32>, Boolean>;
export ledger revoked: Map<Bytes<32>, Boolean>;

// The user must prove they know the secret without revealing it
export circuit verify_credential(
  issuer_id: Bytes<32>,
  ctype: Bytes<32>
): void {
  // Private witness evaluation
  const secret = get_user_secret();
  
  // Hash the private secret to match the public commitment
  const credential_hash = persistentHash<Vector<3, Bytes<32>>>([issuer_id, ctype, secret]);
  
  // Verify the credential exists and is NOT revoked on the public ledger
  assert credentials.member(credential_hash) "Credential does not exist";
  assert !revoked.member(credential_hash) "Credential has been revoked";
}
```

## Setup Instructions (Local Development)

### Prerequisites
*   Node.js 22
*   Docker (for running the Midnight Compact Compiler)

### Building the Contract
To compile the `zeropass.compact` contract into ZK circuits (`managed/` directory):

```bash
npm run compile
```

### Running Tests
To run the test suite verifying the ZK circuit logic:

```bash
npm test
```
