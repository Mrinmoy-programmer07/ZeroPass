// Served by Vite only for verification; not a production entry point.
// Every value here is a public, disposable fixture. No wallet or chain access.
import * as RT from '@midnight-ntwrk/compact-runtime';
import { ZswapSecretKeys, ZswapChainState, LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createUnprovenDeployTx, createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Contract, pureCircuits, ledger } from '../../contract/managed/contract/index.js';
import { browserContract } from '../src/lib/contract.ts';
import type { Action } from '../src/lib/contract.ts';

export async function runBrowserProof() {
  setNetworkId('preprod');
  const value = (n: number) => new Uint8Array(32).fill(n);
  const state = { adminSecret: value(1), issuerSecret: value(2), secret: value(3), salt: value(4), credentialType: value(5) };
  const keys = ZswapSecretKeys.fromSeed(value(6));
  const zk = new FetchZkConfigProvider<Action['circuit']>(new URL('/zeropass/', location.origin).href);
  const walletProvider = {
    getCoinPublicKey: () => keys.coinPublicKey,
    getEncryptionPublicKey: () => keys.encryptionPublicKey,
    balanceTx: async () => { throw new Error('Offline fixture cannot balance or submit'); },
  };
  const deploy = await createUnprovenDeployTx({ zkConfigProvider: zk, walletProvider }, {
    compiledContract: browserContract, signingKey: RT.sampleSigningKey(), initialPrivateState: state,
    args: [pureCircuits.identity(state.adminSecret)],
  });
  const initialContractState = deploy.public.initialContractState;
  const contract = new Contract<typeof state>({
    get_secret: ({ privateState }) => [privateState, privateState.secret],
    get_salt: ({ privateState }) => [privateState, privateState.salt],
    get_credential_type: ({ privateState }) => [privateState, privateState.credentialType],
    get_admin_secret: ({ privateState }) => [privateState, privateState.adminSecret],
    get_issuer_secret: ({ privateState }) => [privateState, privateState.issuerSecret],
  });
  let context = RT.createCircuitContext(deploy.public.contractAddress, keys.coinPublicKey, initialContractState, state);
  context = contract.impureCircuits.register_issuer(context, pureCircuits.identity(state.issuerSecret)).context;
  context = contract.impureCircuits.issue_credential(context, pureCircuits.credential_commitment(state.secret, state.salt, state.credentialType), state.credentialType).context;
  initialContractState.data = context.currentQueryContext.state;
  const call = await createUnprovenCallTxFromInitialStates(zk, {
    compiledContract: browserContract, circuitId: 'verify_credential', contractAddress: deploy.public.contractAddress,
    args: [state.credentialType, value(7)], initialPrivateState: state, initialContractState,
    coinPublicKey: keys.coinPublicKey, initialZswapChainState: new ZswapChainState(), ledgerParameters: LedgerParameters.initialParameters(),
  }, keys.encryptionPublicKey);
  if (ledger(call.public.nextContractState).total_verified !== 1n) throw new Error('Wrong fixture transition');
  const proof = await httpClientProofProvider('http://127.0.0.1:6300', zk).proveTx(call.private.unprovenTx);
  if (proof.serialize().length === 0) throw new Error('Empty proof');
  return 'PASS: browser WASM built a real verify_credential transaction and the local server generated its proof. No on-chain transaction was submitted.';
}
