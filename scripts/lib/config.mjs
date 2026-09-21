import { validatePassword } from '@midnight-ntwrk/midnight-js-utils';

export class ConfigurationError extends Error {}

export function networkConfig(env = process.env) {
  const network = env.MIDNIGHT_NETWORK || 'preprod';
  if (!['preview', 'preprod'].includes(network)) {
    throw new ConfigurationError('MIDNIGHT_NETWORK must be preview or preprod.');
  }
  const proofServer = new URL(env.PROOF_SERVER_URL || 'http://127.0.0.1:6300');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(proofServer.hostname)) {
    throw new ConfigurationError('Use a local proof server: proving requests contain private witness material.');
  }
  return {
    network,
    indexerHttpUrl: `https://indexer.${network}.midnight.network/api/v4/graphql`,
    indexerWsUrl: `wss://indexer.${network}.midnight.network/api/v4/graphql/ws`,
    node: `https://rpc.${network}.midnight.network`,
    proofServer: proofServer.href,
  };
}

export function secretBytes(env, name, length = 32) {
  const value = env[name];
  if (!value || !new RegExp(`^[a-fA-F0-9]{${length * 2}}$`).test(value)) {
    throw new ConfigurationError(`${name} must be ${length} bytes encoded as hexadecimal in your local .env.`);
  }
  return new Uint8Array(Buffer.from(value, 'hex'));
}

export function deploymentSecrets(env = process.env) {
  const walletSeed = secretBytes(env, 'WALLET_SEED');
  const adminSecret = secretBytes(env, 'ADMIN_SECRET');
  const storagePassword = env.PRIVATE_STATE_PASSWORD;
  if (!storagePassword) throw new ConfigurationError('PRIVATE_STATE_PASSWORD is required in your local .env.');
  try { validatePassword(storagePassword); } catch {
    throw new ConfigurationError('PRIVATE_STATE_PASSWORD must meet the SDK strength policy: 16+ characters, 3 character classes, no repeated/sequential runs.');
  }
  return { walletSeed, adminSecret, storagePassword };
}
