import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createUnprovenDeployTx } from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey, sampleContractAddress } from '@midnight-ntwrk/compact-runtime';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { ledger, pureCircuits } from '../contract/managed/contract/index.js';
import { networkConfig, deploymentSecrets } from '../scripts/lib/config.mjs';
import { deriveWalletKeys, walletProviderFor } from '../scripts/lib/wallet.mjs';
import { createProviders, deployOptions, deploymentReceipt, managedDirectory } from '../scripts/lib/deployment.mjs';

const seed = new Uint8Array(32).fill(7); // Deterministic, unfunded test fixture only.
const adminSecret = new Uint8Array(32).fill(9);
setNetworkId('preprod');

describe('Deployment wiring (offline)', () => {
  it('selects testnet endpoints and rejects mainnet or remote proving', () => {
    assert.match(networkConfig({}).indexerHttpUrl, /preprod.*v4/);
    assert.match(networkConfig({ MIDNIGHT_NETWORK: 'preview' }).indexerWsUrl, /preview.*graphql\/ws/);
    assert.throws(() => networkConfig({ MIDNIGHT_NETWORK: 'mainnet' }), /preview or preprod/);
    assert.throws(() => networkConfig({ PROOF_SERVER_URL: 'https://example.com' }), /local proof server/);
  });

  it('fails without real secret configuration instead of using zero defaults', () => {
    assert.throws(() => deploymentSecrets({}), /WALLET_SEED/);
    assert.throws(() => deploymentSecrets({ WALLET_SEED: '07'.repeat(32) }), /ADMIN_SECRET/);
  });

  it('restores the same testnet wallet deterministically', () => {
    const first = deriveWalletKeys(seed, 'preprod');
    const second = deriveWalletKeys(seed, 'preprod');
    assert.equal(String(first.unshieldedKeystore.getBech32Address()), String(second.unshieldedKeystore.getBech32Address()));
    assert.match(String(first.unshieldedKeystore.getBech32Address()), /^mn_addr_preprod1/);
  });

  it('builds a real SDK deployment transaction using compiled artifacts and the hashed administrator', async () => {
    const keys = deriveWalletKeys(seed, 'preprod');
    const providers = {
      zkConfigProvider: new NodeZkConfigProvider(managedDirectory),
      walletProvider: walletProviderFor({ ...keys, wallet: undefined }),
    };
    const result = await createUnprovenDeployTx(providers, { ...deployOptions(adminSecret), signingKey: sampleSigningKey() });
    assert.ok(result.private.unprovenTx);
    assert.deepEqual(ledger(result.public.initialContractState.data).admin, pureCircuits.identity(adminSecret));
    assert.equal(ledger(result.public.initialContractState.data).total_issued, 0n);
  });

  it('loads prover, verifier and ZKIR assets for every transaction circuit', async () => {
    const provider = new NodeZkConfigProvider(managedDirectory);
    for (const name of ['register_issuer', 'issue_credential', 'verify_credential', 'revoke_credential']) {
      assert.ok((await provider.getProverKey(name)).length > 0);
      assert.ok((await provider.getVerifierKey(name)).length > 0);
      assert.ok((await provider.getZKIR(name)).length > 0);
    }
  });

  it('persists and restores encrypted private state with all six providers wired', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'zeropass-test-'));
    try {
      const keys = deriveWalletKeys(seed, 'preprod');
      const providers = createProviders(networkConfig({}), { ...keys, wallet: undefined },
        'Local-Test!Password92', join(directory, 'state'));
      assert.equal(providers.midnightProvider, providers.walletProvider);
      assert.equal(Object.keys(providers).length, 6);
      const address = sampleContractAddress();
      providers.privateStateProvider.setContractAddress(address);
      await providers.privateStateProvider.set('zeropass-admin', { adminSecret });
      assert.deepEqual(await providers.privateStateProvider.get('zeropass-admin'), { adminSecret });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('exports only finalized public evidence, never private SDK fields', () => {
    const receipt = deploymentReceipt({ deployTxData: {
      public: { contractAddress: 'a'.repeat(64), txId: 'b'.repeat(64), blockHeight: 42n },
      private: { signingKey: 'must-not-leak', initialPrivateState: { adminSecret } },
    } }, 'preprod', 'source-hash');
    assert.equal(receipt.blockHeight, '42');
    assert.equal(receipt.network, 'preprod');
    assert.equal(JSON.stringify(receipt).includes('must-not-leak'), false);
    assert.equal('private' in receipt, false);
    assert.throws(() => deploymentReceipt({ deployTxData: { public: {} } }, 'preprod', 'hash'), /finalized/);
  });
});
