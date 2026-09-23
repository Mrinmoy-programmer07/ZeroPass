import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { verifyContractState } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { networkConfig } from './lib/config.mjs';
import { managedDirectory } from './lib/deployment.mjs';

// This command reads public chain data only and never submits a transaction.
const deadline = setTimeout(() => {
  console.error('Public deployment verification timed out. No transaction was submitted.');
  process.exit(1);
}, 90_000);
try {
  const config = networkConfig();
  setNetworkId(config.network);
  const receipt = JSON.parse(await readFile(new URL(`../deployments/${config.network}.json`, import.meta.url), 'utf8'));
  if (receipt.network !== config.network || !/^[a-f0-9]{64}$/i.test(receipt.contractAddress)) {
    throw new Error('Invalid deployment receipt for this network.');
  }
  const sourceHash = createHash('sha256').update(await readFile(new URL('../contract/zeropass.compact', import.meta.url))).digest('hex');
  if (sourceHash !== receipt.sourceHash) throw new Error('Contract source differs from the deployment receipt.');
  const provider = indexerPublicDataProvider(config.indexerHttpUrl, config.indexerWsUrl);
  const deployedState = await provider.queryDeployContractState(receipt.contractAddress);
  if (!deployedState) throw new Error('The indexer has no deployment at this address.');
  const info = JSON.parse(await readFile(new URL('../contract/managed/compiler/contract-info.json', import.meta.url), 'utf8'));
  const circuits = info.circuits.filter(c => c.proof).map(c => c.name);
  const keys = await new NodeZkConfigProvider(managedDirectory).getVerifierKeys(circuits);
  verifyContractState(keys, deployedState);
  const transaction = await provider.watchForDeployTxData(receipt.contractAddress);
  if (transaction.status !== SucceedEntirely || transaction.txId !== receipt.txId || String(transaction.blockHeight) !== String(receipt.blockHeight)) {
    throw new Error('On-chain deployment finality does not match the receipt.');
  }
  const verification = {
    network: config.network, contractAddress: receipt.contractAddress,
    txId: transaction.txId, txHash: transaction.txHash, blockHeight: String(transaction.blockHeight),
    blockHash: transaction.blockHash, sourceHash, verifiedCircuits: circuits, verifiedAt: new Date().toISOString(),
  };
  await writeFile(new URL(`../deployments/${config.network}.verification.json`, import.meta.url), JSON.stringify(verification, null, 2) + '\n');
  console.log(JSON.stringify(verification, null, 2));
  console.log('PASS: public deployment receipt and all compiled circuit verifier keys match the chain.');
} catch {
  console.error('Deployment verification failed. Check the receipt, compiled artifacts and public indexer.');
  process.exitCode = 1;
} finally { clearTimeout(deadline); }
