import { WebSocket } from 'ws';
import { firstValueFrom, filter, timeout } from 'rxjs';
import {
  HDWallet, Roles, WalletFacade, ShieldedWallet, DustWallet,
  UnshieldedWallet, createKeystore, PublicKey, NoOpTransactionHistoryStorage,
} from '@midnightntwrk/wallet-sdk';
import { ZswapSecretKeys, DustSecretKey, LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export function deriveWalletKeys(seed, network) {
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== 'seedOk') throw new Error('Invalid wallet seed.');
  try {
    const derived = hd.hdWallet.selectAccount(0)
      .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
    if (derived.type !== 'keysDerived') throw new Error('Wallet key derivation failed.');
    return {
      shieldedSecretKeys: ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]),
      dustSecretKey: DustSecretKey.fromSeed(derived.keys[Roles.Dust]),
      unshieldedKeystore: createKeystore(derived.keys[Roles.NightExternal], network),
    };
  } finally {
    hd.hdWallet.clear();
  }
}

export async function startWallet(config, seed) {
  setNetworkId(config.network);
  globalThis.WebSocket = WebSocket;
  const keys = deriveWalletKeys(seed, config.network);
  const configuration = {
    networkId: config.network,
    indexerClientConnection: {
      indexerHttpUrl: config.indexerHttpUrl, indexerWsUrl: config.indexerWsUrl,
    },
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, 'ws')),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };
  const wallet = await WalletFacade.init({
    configuration,
    shielded: cfg => ShieldedWallet(cfg).startWithSecretKeys(keys.shieldedSecretKeys),
    unshielded: cfg => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keys.unshieldedKeystore)),
    dust: cfg => DustWallet(cfg).startWithSecretKey(keys.dustSecretKey, LedgerParameters.initialParameters().dust),
  });
  try {
    await wallet.start(keys.shieldedSecretKeys, keys.dustSecretKey);
    return { wallet, ...keys };
  } catch (error) {
    await wallet.stop();
    throw error;
  }
}

export async function syncedState(wallet, timeoutMs = 600_000) {
  return firstValueFrom(wallet.state().pipe(filter(state => state.isSynced), timeout(timeoutMs)));
}

export function walletProviderFor({ wallet, shieldedSecretKeys, dustSecretKey }) {
  return {
    getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx, ttl = new Date(Date.now() + 60 * 60 * 1000)) {
      const recipe = await wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys, dustSecretKey }, { ttl });
      return wallet.finalizeRecipe(recipe);
    },
    submitTx: tx => wallet.submitTransaction(tx),
  };
}
