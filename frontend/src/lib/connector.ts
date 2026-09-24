import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { UserError, withTimeout } from './core.ts';
import type { Network } from './core.ts';

export type WalletChoice = { id: string; api: InitialAPI };
export function discoverWallets(registry: Record<string, InitialAPI> = window.midnight ?? {}): WalletChoice[] {
  const choices = Object.entries(registry).filter(([, api]) => api && /^4\.(0|[1-9]\d*)\.(0|[1-9]\d*)(\+[\w.-]+)?$/.test(api.apiVersion) && typeof api.connect === 'function' && typeof api.name === 'string' && typeof api.rdns === 'string');
  const names = choices.map(([, api]) => api.rdns.trim().toLowerCase());
  if (new Set(names).size !== names.length) throw new UserError('Duplicate wallet identities detected. Disable the duplicate extension before connecting.');
  return choices.map(([id, api]) => ({ id, api }));
}
export async function assertNetwork(api: ConnectedAPI, network: Network): Promise<void> {
  const [status, config] = await Promise.all([api.getConnectionStatus(), api.getConfiguration()]);
  if (status.status !== 'connected' || status.networkId !== network || config.networkId !== network) {
    throw new UserError(`Wallet network mismatch. Switch your Midnight wallet to ${network} and reconnect.`);
  }
}
export async function connectWallet(choice: WalletChoice, network: Network) {
  const api = await withTimeout(choice.api.connect(network), 120_000, 'Wallet connection timed out. Open the extension to review the request.');
  await assertNetwork(api, network);
  const addresses = await api.getShieldedAddresses();
  if (!addresses.shieldedAddress) throw new UserError('The wallet did not return a shielded address.');
  return { api, addresses, name: choice.api.name };
}
export type WalletConnection = Awaited<ReturnType<typeof connectWallet>>;

export async function requireWalletDust(api: Pick<ConnectedAPI, 'getDustBalance'>): Promise<void> {
  const { balance, cap } = await api.getDustBalance();
  if (balance <= 0n) {
    throw new UserError(cap <= 0n
      ? 'This Lace wallet has no DUST capacity. Fund its own test-network NIGHT address and enable DUST generation in Lace. Funding the separate SDK deployment wallet does not fund Lace.'
      : 'This Lace wallet has no spendable DUST yet. Wait for DUST to accrue and for the wallet to finish syncing before retrying.');
  }
}
