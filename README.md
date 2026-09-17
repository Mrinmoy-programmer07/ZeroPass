# ZeroPass

> Anonymous Credential Verification on Midnight Network

ZeroPass lets anyone prove they hold a valid credential without disclosing the credential itself. Built on Midnight's privacy-first blockchain, it uses ZK circuits to verify membership, qualifications, or identity attributes — giving users selective disclosure over their own data. Think of it as a privacy-native alternative to "Login with Google."

## Privacy Model: Public State vs Private Witness

In ZeroPass, privacy is maintained through a clear boundary:

*   **Private Witness (Off-Chain)**: The actual credential details (e.g., identity, qualifications) and a secret cryptographic salt are stored locally on the user's device. This data is **never** sent to the blockchain.
*   **Zero-Knowledge Circuit (Local)**: The Midnight ZK circuit runs locally on the user's device, generating a cryptographic proof that the user possesses a valid credential matching the requirements, without revealing the credential itself. It also generates a unique "nullifier" to prevent replay attacks.
*   **Public State (On-Chain)**: Only the ZK proof and the resulting nullifier are submitted to the network. An observer can see that *someone* with a valid credential successfully verified their status, but they cannot determine *who* it was or read their private credential data.

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
