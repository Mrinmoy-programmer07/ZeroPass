import { networkConfig, secretBytes, ConfigurationError } from './lib/config.mjs';
import { deriveWalletKeys, startWallet, syncedState } from './lib/wallet.mjs';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { DustAddress, MidnightBech32m } from '@midnightntwrk/wallet-sdk';

let ctx;
let heartbeat;
try {
  const config = networkConfig();
  const seed = secretBytes(process.env, 'WALLET_SEED');
  const action = process.argv[2] || 'address';
  if (!['address', 'status', 'register-dust'].includes(action)) {
    throw new ConfigurationError('Usage: npm run wallet -- address|status|register-dust');
  }
  const keys = deriveWalletKeys(seed, config.network);
  console.log(`Network: ${config.network}`);
  console.log(`Wallet: ${keys.unshieldedKeystore.getBech32Address()}`);
  if (action !== 'address') {
    ctx = await startWallet(config, seed);
    heartbeat = setInterval(() => console.log('Waiting for wallet synchronization...'), 20_000);
    const state = await syncedState(ctx.wallet);
    console.log(`tNIGHT (smallest units): ${state.unshielded.balances[unshieldedToken().raw] ?? 0n}`);
    console.log(`DUST (smallest units): ${state.dust.balance(new Date())}`);
    if (action === 'register-dust') {
      const coins = state.unshielded.availableCoins.filter(c => c.meta?.registeredForDustGeneration !== true);
      if (coins.length === 0) {
        console.log('No unregistered coins. Fund the wallet or wait for already registered NIGHT to generate DUST.');
      } else {
        const receiver = MidnightBech32m.parse(String(DustAddress.encodePublicKey(config.network, state.dust.publicKey)))
          .decode(DustAddress, config.network);
        const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(coins,
          ctx.unshieldedKeystore.getPublicKey(), payload => ctx.unshieldedKeystore.signData(payload), receiver);
        const tx = await ctx.wallet.finalizeRecipe(recipe);
        console.log(`Registration transaction: ${await ctx.wallet.submitTransaction(tx)}`);
        console.log('Allow DUST to accrue, then run npm run wallet -- status.');
      }
    }
  }
} catch (error) {
  console.error(error instanceof ConfigurationError ? error.message : 'Wallet operation failed. Check network, funding and the local proof server. Private error data was not logged.');
  process.exitCode = 1;
} finally {
  clearInterval(heartbeat);
  if (ctx) await ctx.wallet.stop();
}
