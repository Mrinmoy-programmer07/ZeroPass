import { Contract, ledger, pureCircuits } from '../../../contract/managed/contract/index.js';
import type { Witnesses } from '../../../contract/managed/contract/index.js';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createUnprovenCallTxFromInitialStates, verifyContractState } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { shieldedKeys } from './addresses.ts';
import { bytes, hex, localProofUrl, typeBytes, UserError, withTimeout } from './core.ts';
import type { Credential, Target, IssuanceRequest } from './core.ts';
import { assertNetwork, requireWalletDust } from './connector.ts';
import type { WalletConnection } from './connector.ts';
import { confirmTransaction, executeTransaction } from './transactions.ts';
import type { Progress } from './transactions.ts';
import { checkLocalProver } from './prover.ts';

type PrivateState = Partial<Record<'secret' | 'salt' | 'credentialType' | 'adminSecret' | 'issuerSecret', Uint8Array>>;
const read = (name: keyof PrivateState) => ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] => {
  const value = privateState[name];
  if (!(value instanceof Uint8Array) || value.length !== 32) throw new UserError('Required private input is missing.');
  return [privateState, value];
};
const witnesses: Witnesses<PrivateState> = { get_secret: read('secret'), get_salt: read('salt'), get_credential_type: read('credentialType'), get_admin_secret: read('adminSecret'), get_issuer_secret: read('issuerSecret') };
const contractDefinition = CompiledContract.make<Contract<PrivateState>, PrivateState>('zeropass', Contract<PrivateState>);
const contractWithWitnesses = CompiledContract.withWitnesses(contractDefinition, witnesses);
export const browserContract = CompiledContract.withCompiledFileAssets(contractWithWitnesses, 'zeropass');
const circuits = ['register_issuer', 'issue_credential', 'verify_credential', 'revoke_credential'] as const;
export type Action =
  | { circuit: 'verify_credential'; credential: Credential; scope: string }
  | { circuit: 'register_issuer'; adminSecret: string; issuerId: string }
  | { circuit: 'issue_credential'; issuerSecret: string; request: IssuanceRequest }
  | { circuit: 'revoke_credential'; issuerSecret: string; commitment: string };
export type PublicSummary = { issued: string; verified: string; credential?: 'not-issued' | 'active' | 'revoked' };
export function createCredential(config: Target, label: string): Credential {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const ctype = typeBytes(label);
  return { version: 1, ...config, label, secret: hex(secret), salt: hex(salt), credentialType: hex(ctype), commitment: hex(pureCircuits.credential_commitment(secret, salt, ctype)) };
}
export function checkCredential(credential: Credential): void {
  const commitment = pureCircuits.credential_commitment(bytes(credential.secret), bytes(credential.salt), bytes(credential.credentialType));
  if (hex(commitment) !== credential.commitment) throw new UserError('Credential commitment does not match the encrypted private inputs.');
}
export function issuerIdentity(secret: string): string { return hex(pureCircuits.identity(bytes(secret))); }

export function createClient(config: Target, connection: WalletConnection, assetUrl: string) {
  setNetworkId(config.network);
  const publicData = indexerPublicDataProvider(`https://indexer.${config.network}.midnight.network/api/v4/graphql`, `wss://indexer.${config.network}.midnight.network/api/v4/graphql/ws`);
  // The SDK invokes fetch as a provider method; browsers require Window as its receiver.
  const zk = new FetchZkConfigProvider<typeof circuits[number]>(assetUrl, globalThis.fetch.bind(globalThis));
  const { coinPublicKey, encryptionPublicKey } = shieldedKeys(connection.addresses.shieldedAddress, config.network);
  const assertSession = async () => {
    await assertNetwork(connection.api, config.network);
    const current = await connection.api.getShieldedAddresses();
    if (current.shieldedAddress !== connection.addresses.shieldedAddress) throw new UserError('Your wallet account changed. Disconnect, then reconnect before continuing.');
  };
  const states = async () => {
    const result = await withTimeout(publicData.queryZSwapAndContractState(config.contractAddress), 30_000, 'The indexer did not respond. Check the test network and try again.');
    if (!result) throw new UserError('No contract was found at this address on the selected network.');
    const [zswapChainState, contractState, ledgerParameters] = result;
    const verifierKeys = await Promise.all(circuits.map(async name => [name, await zk.getVerifierKey(name)] as [typeof name, Awaited<ReturnType<typeof zk.getVerifierKey>>]));
    try { verifyContractState(verifierKeys, contractState); } catch { throw new UserError('The deployed contract does not match this ZeroPass build. Check its address and compiled artifacts.'); }
    return { zswapChainState, contractState, ledgerParameters };
  };
  const watch = (txId: string) => publicData.watchForTxData(txId);
  return {
    async summary(credential?: Credential): Promise<PublicSummary> {
      const state = ledger((await states()).contractState.data);
      return { issued: String(state.total_issued), verified: String(state.total_verified), credential: credential ? (!state.credential_exists.member(bytes(credential.commitment)) ? 'not-issued' : state.credential_revoked.lookup(bytes(credential.commitment)) ? 'revoked' : 'active') : undefined };
    },
    confirm: (txId: string, update: (value: Progress) => void) => confirmTransaction(txId, watch, update),
    async call(action: Action, update: (value: Progress) => void) {
      const build = async (): Promise<UnprovenTransaction> => {
        await assertSession();
        const { zswapChainState, contractState, ledgerParameters } = await states();
        const state = ledger(contractState.data);
        let initialPrivateState: PrivateState;
        let args: [Uint8Array] | [Uint8Array, Uint8Array];
        if (action.circuit === 'verify_credential') {
          const c = action.credential;
          if (c.network !== config.network || c.contractAddress !== config.contractAddress) throw new UserError('Credential network or contract mismatch.');
          checkCredential(c);
          const commitment = bytes(c.commitment);
          if (!state.credential_exists.member(commitment)) throw new UserError('This credential has not been issued yet. Send its public request to your issuer.');
          if (state.credential_revoked.lookup(commitment)) throw new UserError('This credential has been revoked.');
          initialPrivateState = { secret: bytes(c.secret), salt: bytes(c.salt), credentialType: bytes(c.credentialType) };
          const scope = bytes(action.scope);
          const nullifier = pureCircuits.verification_nullifier(initialPrivateState.secret!, initialPrivateState.credentialType!, scope);
          if (state.used_nullifiers.member(nullifier)) throw new UserError('This verification scope was already used. Request a fresh scope from the verifier.');
          args = [bytes(c.credentialType), scope];
        } else if (action.circuit === 'register_issuer') {
          initialPrivateState = { adminSecret: bytes(action.adminSecret) };
          if (hex(pureCircuits.identity(initialPrivateState.adminSecret!)) !== hex(state.admin)) throw new UserError('This administrator secret does not match the contract.');
          args = [bytes(action.issuerId)];
        } else {
          initialPrivateState = { issuerSecret: bytes(action.issuerSecret) };
          const issuer = pureCircuits.identity(initialPrivateState.issuerSecret!);
          if (!state.issuer_registry.member(issuer)) throw new UserError('This issuer has not been registered by the administrator.');
          if (action.circuit === 'issue_credential') {
            if (action.request.network !== config.network || action.request.contractAddress !== config.contractAddress) throw new UserError('Issuance request network or contract mismatch.');
            if (state.credential_exists.member(bytes(action.request.commitment))) throw new UserError('This commitment is already issued.');
            args = [bytes(action.request.commitment), bytes(action.request.credentialType)];
          } else {
            const commitment = bytes(action.commitment);
            if (!state.credential_exists.member(commitment)) throw new UserError('Credential not found.');
            if (hex(state.credential_issuer.lookup(commitment)) !== hex(issuer)) throw new UserError('Only the issuing institution can revoke this credential.');
            args = [commitment];
          }
        }
        const result = await createUnprovenCallTxFromInitialStates(zk, {
          compiledContract: browserContract, circuitId: action.circuit, contractAddress: config.contractAddress,
          args, initialPrivateState, coinPublicKey, initialContractState: contractState,
          initialZswapChainState: zswapChainState, ledgerParameters,
        }, encryptionPublicKey);
        return result.private.unprovenTx;
      };
      return executeTransaction({
        build,
        async prove(unproven) {
          // Holder witnesses must stay on this device, independently of Lace's
          // remote prover preference for its own wallet operations.
          const proofUrl = localProofUrl();
          await checkLocalProver();
          return httpClientProofProvider(proofUrl, zk).proveTx(unproven);
        },
        async balance(proven) {
          await assertSession();
          await requireWalletDust(connection.api);
          const response = await connection.api.balanceUnsealedTransaction(hex(proven.serialize()));
          const transaction = Transaction.deserialize('signature', 'proof', 'binding', bytes(response.tx, response.tx.length / 2));
          const txId = transaction.identifiers()[0];
          if (!txId) throw new UserError('The wallet returned a transaction without an identifier.');
          return { transaction, txId };
        },
        async submit(transaction) { await assertSession(); await connection.api.submitTransaction(hex(transaction.serialize())); },
        watch,
      }, update);
    },
  };
}
export type ZeroPassClient = ReturnType<typeof createClient>;
