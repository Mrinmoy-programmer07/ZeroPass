import { fileURLToPath } from 'node:url';
import { Contract, pureCircuits } from '../../contract/managed/contract/index.js';
import { witnesses } from '../../contract/witnesses.mjs';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { walletProviderFor } from './wallet.mjs';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';

export const managedDirectory = fileURLToPath(new URL('../../contract/managed/', import.meta.url));
export const compiledContract = CompiledContract.withCompiledFileAssets(
  CompiledContract.withWitnesses(CompiledContract.make('zeropass', Contract), witnesses), managedDirectory);

export function deployOptions(adminSecret) {
  return {
    compiledContract, privateStateId: 'zeropass-admin',
    initialPrivateState: { adminSecret }, args: [pureCircuits.identity(adminSecret)],
  };
}

export function createProviders(config, walletContext, storagePassword, dbDirectory) {
  const zkConfigProvider = new NodeZkConfigProvider(managedDirectory);
  const walletProvider = walletProviderFor(walletContext);
  return {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: dbDirectory,
      privateStateStoreName: 'zeropass-state', signingKeyStoreName: 'zeropass-signing-keys',
      privateStoragePasswordProvider: () => storagePassword,
      accountId: String(walletContext.unshieldedKeystore.getBech32Address()),
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexerHttpUrl, config.indexerWsUrl),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider, midnightProvider: walletProvider,
  };
}

// Deliberately whitelist public fields. The SDK result also contains secrets.
export function deploymentReceipt(result, network, sourceHash) {
  const { contractAddress, txId, blockHeight } = result.deployTxData.public;
  if (!contractAddress || !txId || blockHeight === undefined) {
    throw new Error('Deployment did not return finalized transaction evidence.');
  }
  return {
    network, contractAddress, txId, blockHeight: String(blockHeight),
    sourceHash, compiler: '0.31.1', deployedAt: new Date().toISOString(),
  };
}

export function verifyReceiptTransaction(receipt, transaction) {
  // Balancing adds another intent. The submitted ID and the deployment action's
  // ID may differ, but both must belong to the same successful transaction.
  if (transaction.status !== SucceedEntirely || !transaction.identifiers?.includes(receipt.txId)
      || !transaction.identifiers.includes(transaction.txId)
      || String(transaction.blockHeight) !== String(receipt.blockHeight)) {
    throw new Error('On-chain deployment finality does not match the receipt.');
  }
}
