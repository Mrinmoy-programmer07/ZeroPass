import { WebSocket } from 'ws';
import { firstValueFrom, combineLatest, interval, startWith, map, filter, tap, timeout } from 'rxjs';
import {
  HDWallet, Roles, WalletFacade, ShieldedWallet, DustWallet,
  UnshieldedWallet, createKeystore, PublicKey, NoOpTransactionHistoryStorage, DustAddress, MidnightBech32m,
} from '@midnightntwrk/wallet-sdk';
import { ZswapSecretKeys, DustSecretKey, LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { walletCache } from './wallet-cache.mjs';

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
  const cache = walletCache(seed, config.network, String(keys.unshieldedKeystore.getBech32Address()));
  const cached = await cache.load();
  if (cached) console.log('Restoring encrypted wallet checkpoint.');
  const configuration = {
    networkId: config.network,
    indexerClientConnection: {
      indexerHttpUrl: config.indexerHttpUrl, indexerWsUrl: config.indexerWsUrl,
    },
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, 'ws')),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    // Catch up in bounded batches without scheduling a delay after every few events.
    batchUpdates: { size: 1000, timeout: 100, spacing: 0 },
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };
  const wallet = await WalletFacade.init({
    configuration,
    shielded: cfg => cached ? ShieldedWallet(cfg).restore(cached.shielded) : ShieldedWallet(cfg).startWithSecretKeys(keys.shieldedSecretKeys),
    unshielded: cfg => cached ? UnshieldedWallet(cfg).restore(cached.unshielded) : UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keys.unshieldedKeystore)),
    dust: cfg => cached ? DustWallet(cfg).restore(cached.dust) : DustWallet(cfg).startWithSecretKey(keys.dustSecretKey, LedgerParameters.initialParameters().dust),
  });
  try {
    await wallet.start(keys.shieldedSecretKeys, keys.dustSecretKey);
    let latest;
    let saving = Promise.resolve();
    const subscription = wallet.state().subscribe(state => { latest = state; });
    const checkpoint = () => {
      if (!latest) return saving;
      const state = latest;
      saving = saving.catch(() => {}).then(() => cache.save({
        shielded: state.shielded.serialize(), unshielded: state.unshielded.serialize(), dust: state.dust.serialize(),
      }));
      return saving;
    };
    const timer = setInterval(() => checkpoint().catch(() => console.error('Wallet checkpoint could not be saved.')), 60_000);
    return { wallet, ...keys, checkpoint, async stop() {
      clearInterval(timer);
      subscription.unsubscribe();
      try { await checkpoint(); } finally { await wallet.stop(); }
    } };
  } catch (error) {
    await wallet.stop();
    throw error;
  }
}

export async function syncedState(wallet, timeoutMs = 1_800_000) {
  let lastReport = 0;
  return firstValueFrom(wallet.state().pipe(
    tap(state => {
      if (Date.now() - lastReport < 20_000 && !state.isSynced) return;
      lastReport = Date.now();
      // Only report connection state and chain cursors, never wallet state or keys.
      const progress = ['shielded', 'unshielded', 'dust'].map(name => {
        const p = state[name].progress;
        return `${name}: ${p.isConnected ? 'connected' : 'disconnected'} ${p.appliedId ?? p.appliedIndex}/${p.highestTransactionId ?? p.highestRelevantWalletIndex}`;
      });
      console.log(`Wallet sync (${state.isSynced ? 'complete' : 'pending'}): ${progress.join('; ')}`);
    }),
    filter(state => state.isSynced), timeout(timeoutMs),
  ));
}

export async function registerDustForState(ctx, state, network) {
  const coins = state.unshielded.availableCoins.filter(c => c.meta?.registeredForDustGeneration !== true);
  if (coins.length === 0) return undefined;
  const receiver = MidnightBech32m.parse(String(DustAddress.encodePublicKey(network, state.dust.publicKey)))
    .decode(DustAddress, network);
  const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(coins,
    ctx.unshieldedKeystore.getPublicKey(), payload => ctx.unshieldedKeystore.signData(payload), receiver);
  const tx = await ctx.wallet.finalizeRecipe(recipe);
  return ctx.wallet.submitTransaction(tx);
}

export async function waitForDust(wallet, minimum = 500_000_000_000_000n, timeoutMs = 600_000) {
  // DUST accrues with time even when the wallet emits no new ledger state.
  return firstValueFrom(combineLatest([wallet.state(), interval(5000).pipe(startWith(0))]).pipe(
    map(([state]) => state),
    filter(state => state.isSynced && state.dust.balance(new Date()) >= minimum),
    timeout(timeoutMs),
  ));
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
