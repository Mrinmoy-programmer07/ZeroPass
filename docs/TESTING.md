# Contract verification

Run `npm ci`, then `npm run validate`. The suite uses Node's built-in test runner
and the real generated Compact contract, with no network or proof server needed.
After modifying Compact source, run `npm run compile` before testing.

Coverage includes initial state; admin and issuer authorization; issuance and
ledger transitions; successful verification of a fresh credential; rejection of
wrong secrets, salts, types and unknown credentials; issuer-owned revocation;
duplicate issuance; replay rejection; and repeat verification in a new scope.

The privacy regression test inspects actual public transcripts and outputs for
raw holder/admin/issuer secrets and salt. It also confirms those values occurred
in the private witness transcript, and that public commitments and issuer IDs
remain observable. It is a regression check, not a cryptographic privacy audit.

These tests exercise circuit execution and assertions locally. They do not
generate SNARKs or prove that a transaction has finalized on Preview/Preprod.
Network deployment and transaction evidence are tracked separately.
