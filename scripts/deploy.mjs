/**
 * ZeroPass Deployment Script
 * Deploys the ZeroPass contract to Midnight Preprod network.
 *
 * Prerequisites:
 *   1. Proof server running: docker run -p 6300:6300 ghcr.io/midnight-ntwrk/proof-server:latest
 *   2. Lace Wallet installed with Preprod testnet tokens
 *   3. Set WALLET_SEED env var: export WALLET_SEED="your 24-word seed phrase"
 *
 * Run: node scripts/deploy.mjs
 */

import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { createLogger } from '@midnight-ntwrk/midnight-js-utils';

// ---------------------------------------------------------------------------
// Network configuration — Midnight Preprod
// ---------------------------------------------------------------------------
const NETWORK = 'preprod';
const INDEXER_WS_URL  = 'wss://indexer.testnet.midnight.network/api/v1/graphql';
const INDEXER_HTTP_URL = 'https://indexer.testnet.midnight.network/api/v1/graphql';
const PROOF_SERVER_URL = 'http://localhost:6300';
const ZK_CONFIG_URL    = 'https://indexer.testnet.midnight.network/api/v1/proving-key';

// ---------------------------------------------------------------------------
// Admin public key — derivation of persistentHash(admin_secret)
// For demo: use a fixed 32-byte zero buffer. In production, derive from wallet.
// ---------------------------------------------------------------------------
const ADMIN_ID = Buffer.alloc(32, 0).toString('hex');

// ---------------------------------------------------------------------------
// Main deployment
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌑  ZeroPass — Midnight Preprod Deployment');
  console.log('─'.repeat(50));

  setNetworkId(NETWORK);

  // Load compiled contract
  const contract = await import('../contract/managed/zeropass/zeropass.js');
  console.log('✅  Compiled contract loaded');

  // Setup providers
  const zkConfigProvider = new FetchZkConfigProvider(ZK_CONFIG_URL, fetch);

  const privateStateProvider = levelPrivateStateProvider({
    privateStoragePasswordProvider: async () => 'zeropass-demo-password',
    accountId: 'deployer',
  });

  const publicDataProvider = indexerPublicDataProvider(
    INDEXER_HTTP_URL,
    INDEXER_WS_URL,
  );

  const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);

  console.log('✅  Providers initialized');
  console.log('⏳  Deploying contract to Midnight Preprod...');
  console.log('   (This may take 1-2 minutes while the proof is generated)');

  const providers = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
  };

  // Deploy
  const deployed = await deployContract(providers, {
    contract: contract.ZeroPass,
    privateStateId: 'zeropass-state',
    initialPrivateState: {},
    constructorArgs: [Buffer.from(ADMIN_ID, 'hex')],
  });

  const address = deployed.deployTx.contractAddress;

  console.log('');
  console.log('🎉  Contract deployed successfully!');
  console.log('─'.repeat(50));
  console.log(`📍  Contract Address: ${address}`);
  console.log(`🔗  Network:          Midnight Preprod`);
  console.log(`🔗  Explorer:         https://midnight-explorer.example.com/contract/${address}`);
  console.log('─'.repeat(50));

  return address;
}

main().catch((err) => {
  console.error('❌  Deployment failed:', err.message ?? err);
  process.exit(1);
});
