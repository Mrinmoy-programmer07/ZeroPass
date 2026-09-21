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

There are 18 generated-circuit regressions and seven offline deployment tests.
The latter build an actual SDK deployment transaction, read all four circuit
assets, restore a deterministic test wallet, and persist/reload encrypted private
state through the real provider. No test uses production wallet secrets.

`npm run validate` exercises circuit execution and assertions locally. It does
not generate SNARKs or prove that a transaction finalized on Preview/Preprod.

For the separate proof integration check, run the 8.1.0 local proof server
(`npm run proof-server`), then `npm run prove:local`. This builds a real SDK
verification transaction from fixture issuance state and generates its proof.
The fixtures are public test data. This check succeeded locally; it still does
not establish network acceptance or a deployed contract address.

See [DEPLOYMENT.md](DEPLOYMENT.md) for finalization and public receipt evidence.

## Captured results

The 2026-09-21 verification run used the source hash recorded in each log:

- [Compilation](compile-current.txt): exit 0, four circuits compiled.
- [Toolchain/artifacts](check-current.txt): all four proof asset sets and generated imports passed.
- [Tests](tests-current.txt): 25 passed, zero failures.
- [Real local proof](proof-current.txt): verification proof generated successfully.
- [Build-log screenshot](compile-current.png): rendered captured output, not a terminal window.
- [Frontend checks](FRONTEND_VERIFICATION.md): build, lint and browser walkthrough passed.

These files are a point-in-time record. Re-run the commands after changing source.
