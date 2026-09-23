import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { networkConfig, deploymentSecrets, ConfigurationError } from './lib/config.mjs';
import { startWallet, syncedState, registerDustForState, waitForDust } from './lib/wallet.mjs';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createProviders, deployOptions, deploymentReceipt } from './lib/deployment.mjs';

let stage = 'configuration';
let walletContext;
let heartbeat;
try {
  await import('./check-toolchain.mjs');
  const config = networkConfig();
  const secrets = deploymentSecrets();
  const options = deployOptions(secrets.adminSecret);
  if (process.argv.includes('--check')) {
    console.log(`Deployment configuration is valid for ${config.network}. No transaction submitted.`);
  } else {
    const receiptUrl = new URL(`../deployments/${config.network}.json`, import.meta.url);
    try {
      await access(receiptUrl);
      throw new ConfigurationError('A deployment receipt already exists. Archive it deliberately before deploying again.');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    stage = 'local proof server health check';
    const health = await fetch(new URL('health', config.proofServer), { signal: AbortSignal.timeout(10_000) });
    if (!health.ok) throw new ConfigurationError('Proof server health check failed. Run npm run proof-server.');
    const version = await fetch(new URL('version', config.proofServer), { signal: AbortSignal.timeout(10_000) });
    if (!version.ok || !(await version.text()).includes('8.1.0')) {
      throw new ConfigurationError('Expected local proof server 8.1.0. Run npm run proof-server.');
    }
    stage = 'wallet synchronization';
    walletContext = await startWallet(config, secrets.walletSeed);
    console.log(`Network: ${config.network}`);
    console.log(`Wallet: ${walletContext.unshieldedKeystore.getBech32Address()}`);
    heartbeat = setInterval(() => console.log(`Waiting: ${stage}...`), 20_000);
    let state = await syncedState(walletContext.wallet);
    await walletContext.checkpoint();
    console.log(`tNIGHT (smallest units): ${state.unshielded.balances[unshieldedToken().raw] ?? 0n}`);
    if (process.argv.includes('--register-dust')) {
      if ((state.unshielded.balances[unshieldedToken().raw] ?? 0n) === 0n && state.dust.balance(new Date()) === 0n) {
        throw new ConfigurationError('Fund the configured deployment wallet with test tNIGHT first.');
      }
      stage = 'DUST registration';
      const txId = await registerDustForState(walletContext, state, config.network);
      if (txId) console.log(`DUST registration transaction: ${txId}`);
      stage = 'DUST accrual (at least 0.5 DUST; final fee checked during balancing)';
      state = await waitForDust(walletContext.wallet);
    }
    console.log(`DUST (smallest units): ${state.dust.balance(new Date())}`);
    if (state.dust.balance(new Date()) <= 0n) {
      throw new ConfigurationError('Wallet has no DUST. Fund its tNIGHT address, then run npm run wallet -- register-dust.');
    }
    const dbUrl = new URL(`../.zeropass/${config.network}/`, import.meta.url);
    await mkdir(dbUrl, { recursive: true });
    const providers = createProviders(config, walletContext, secrets.storagePassword, fileURLToPath(new URL('state', dbUrl)));
    stage = 'contract deployment and finalization';
    const result = await deployContract(providers, options);
    const sourceHash = createHash('sha256').update(await readFile(new URL('../contract/zeropass.compact', import.meta.url))).digest('hex');
    const receipt = deploymentReceipt(result, config.network, sourceHash);
    // Print public evidence immediately, so a disk write failure cannot hide a finalized deployment.
    console.log(JSON.stringify(receipt, null, 2));
    await mkdir(new URL('../deployments/', import.meta.url), { recursive: true });
    await writeFile(receiptUrl, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    console.log(`Saved deployments/${config.network}.json. Keep .env and .zeropass backed up privately.`);
  }
} catch (error) {
  // SDK exceptions can embed private transactions: never dump their objects or stacks.
  console.error(error instanceof ConfigurationError ? error.message : `Deployment failed during ${stage}. Check the local service and network configuration; private error data was not logged.`);
  process.exitCode = 1;
} finally {
  clearInterval(heartbeat);
  if (walletContext) await walletContext.stop();
}
