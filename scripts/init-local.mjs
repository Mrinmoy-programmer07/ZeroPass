import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { deriveWalletKeys } from './lib/wallet.mjs';

if (!process.argv.includes('--new-wallet')) {
  console.error('To create a new test-only wallet and private .env, run npm run setup -- --new-wallet. Existing files are never overwritten.');
  process.exitCode = 1;
} else {
  const seed = randomBytes(32);
  const content = [
    'MIDNIGHT_NETWORK=preprod', 'PROOF_SERVER_URL=http://127.0.0.1:6300',
    `WALLET_SEED=${seed.toString('hex')}`, `ADMIN_SECRET=${randomBytes(32).toString('hex')}`,
    `PRIVATE_STATE_PASSWORD=Zp!${randomBytes(32).toString('base64url')}`, '',
  ].join('\n');
  try {
    await writeFile(new URL('../.env', import.meta.url), content, { flag: 'wx', mode: 0o600 });
    const keys = deriveWalletKeys(seed, 'preprod');
    console.log('Created .env with private testnet secrets. Back it up privately; do not share it.');
    console.log(`Fund this public address: ${keys.unshieldedKeystore.getBech32Address()}`);
    console.log('Faucet: https://midnight-tmnight-preprod.nethermind.dev/');
  } catch (error) {
    console.error(error.code === 'EEXIST' ? '.env already exists and was not changed.' : 'Local setup failed; inspect file permissions.');
    process.exitCode = 1;
  } finally { seed.fill(0); }
}
