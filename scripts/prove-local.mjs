// Integration check: synthetic local ledger + disposable fixture secrets.
// Generates a real verify_credential proof; never submits a network transaction.
import assert from 'node:assert/strict';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createUnprovenDeployTx, createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Contract, pureCircuits, ledger } from '../contract/managed/contract/index.js';
import { witnesses } from '../contract/witnesses.mjs';
import { deriveWalletKeys, walletProviderFor } from './lib/wallet.mjs';
import { compiledContract, deployOptions, managedDirectory } from './lib/deployment.mjs';

setNetworkId('preprod');
const value = n => new Uint8Array(32).fill(n);
const state = { adminSecret: value(1), issuerSecret: value(2), secret: value(3), salt: value(4), credentialType: value(5) };
const keys = deriveWalletKeys(value(6), 'preprod');
const walletProvider = walletProviderFor({ ...keys, wallet: undefined });
const zkConfigProvider = new NodeZkConfigProvider(managedDirectory);
const deployment = await createUnprovenDeployTx({ zkConfigProvider, walletProvider }, {
  ...deployOptions(state.adminSecret), signingKey: RT.sampleSigningKey(),
});
const contractState = deployment.public.initialContractState;
const address = deployment.public.contractAddress;
const contract = new Contract(witnesses);
let context = RT.createCircuitContext(address, keys.shieldedSecretKeys.coinPublicKey, contractState, state);
context = contract.impureCircuits.register_issuer(context, pureCircuits.identity(state.issuerSecret)).context;
const commitment = pureCircuits.credential_commitment(state.secret, state.salt, state.credentialType);
context = contract.impureCircuits.issue_credential(context, commitment, state.credentialType).context;
contractState.data = context.currentQueryContext.state;
const call = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  compiledContract, circuitId: 'verify_credential', contractAddress: address,
  args: [state.credentialType, value(7)], initialPrivateState: state,
  coinPublicKey: keys.shieldedSecretKeys.coinPublicKey, initialContractState: contractState,
  initialZswapChainState: new ZswapChainState(), ledgerParameters: LedgerParameters.initialParameters(),
}, keys.shieldedSecretKeys.encryptionPublicKey);
assert.equal(ledger(call.public.nextContractState).total_verified, 1n);
console.log('Real SDK verify_credential transaction constructed from a synthetic local ledger.');
console.log('Generating proof with local proof server 8.1.0...');
const started = Date.now();
const progress = setInterval(() => console.log('Local proof generation is running...'), 20_000);
try {
  const proof = await httpClientProofProvider('http://127.0.0.1:6300', zkConfigProvider).proveTx(call.private.unprovenTx);
  assert.ok(proof.serialize().length > 0);
  console.log(`PASS: verify_credential proof generated in ${((Date.now() - started) / 1000).toFixed(1)} seconds.`);
  console.log('This validates local proving only. No wallet funds used; no transaction submitted on-chain.');
} finally { clearInterval(progress); }
