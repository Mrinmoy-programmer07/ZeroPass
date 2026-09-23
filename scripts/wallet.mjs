import { networkConfig, secretBytes, ConfigurationError } from './lib/config.mjs';
import { deriveWalletKeys, startWallet, syncedState, registerDustForState } from './lib/wallet.mjs';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';

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
      const txId = await registerDustForState(ctx, state, config.network);
      if (!txId) {
        console.log('No unregistered coins. Fund the wallet or wait for already registered NIGHT to generate DUST.');
      } else {
        console.log(`Registration transaction: ${txId}`);
        console.log('Allow DUST to accrue, then run npm run wallet -- status.');
      }
    }
  }
} catch (error) {
  console.error(error instanceof ConfigurationError ? error.message : 'Wallet operation failed. Check network, funding and the local proof server. Private error data was not logged.');
  process.exitCode = 1;
} finally {
  clearInterval(heartbeat);
  if (ctx) await ctx.stop();
}
