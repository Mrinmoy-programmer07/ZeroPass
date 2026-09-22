import { useRef, useState } from 'react';
import { connectWallet, discoverWallets } from '../lib/connector.ts';
import type { WalletChoice, WalletConnection } from '../lib/connector.ts';
import { safeError, UserError } from '../lib/core.ts';
import type { Target } from '../lib/core.ts';
import type { Action, ZeroPassClient } from '../lib/contract.ts';
import type { Progress } from '../lib/transactions.ts';

export function useMidnight() {
  const [connection, setConnection] = useState<WalletConnection>();
  const [client, setClient] = useState<ZeroPassClient>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<Progress>({ phase: 'idle', message: '' });
  const busyRef = useRef(false);
  const receiptKey = useRef('');
  async function run(task: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await task(); } catch (failure) { setError(safeError(failure)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const update = (value: Progress) => {
    setProgress(value);
    if (value.txId && receiptKey.current) {
      // Only public transaction metadata. A storage failure must not hide a submission.
      try { localStorage.setItem(receiptKey.current, JSON.stringify(value)); } catch { setError('Could not save transaction history locally. Keep the transaction ID before closing this page.'); }
    }
  };
  const connect = (choice: WalletChoice, config: Target) => run(async () => {
    const connected = await connectWallet(choice, config.network);
    const module = await import('../lib/contract.ts');
    const nextClient = module.createClient(config, connected, new URL(`${import.meta.env.BASE_URL}zeropass/`, window.location.origin).href);
    receiptKey.current = `zeropass:receipt:${config.network}:${config.contractAddress}:${connected.addresses.shieldedAddress}`;
    let previous: Progress = { phase: 'idle', message: '' };
    try {
      const stored = JSON.parse(localStorage.getItem(receiptKey.current) || 'null');
      if (stored && typeof stored.txId === 'string' && /^[a-fA-F0-9]{64}$/.test(stored.txId)) {
        // Recheck all recovered receipts with the indexer, never trust local success flags.
        previous = { phase: 'unknown', txId: stored.txId, message: 'A previous transaction was found. Check its network status before submitting another.' };
      }
    } catch { /* Malformed local metadata is not a trusted receipt. */ }
    setProgress(previous); setClient(nextClient); setConnection(connected);
  });
  const disconnect = () => {
    if (busyRef.current) return;
    setConnection(undefined); setClient(undefined); setError('');
    setProgress({ phase: 'idle', message: '' }); receiptKey.current = '';
  };
  const call = (action: Action | (() => Action)) => run(async () => {
    if (!client) throw new UserError('Connect a Midnight wallet first.');
    if (progress.txId && ['pending', 'unknown', 'submitting'].includes(progress.phase)) throw new UserError('Check the previous transaction before submitting another.');
    await client.call(typeof action === 'function' ? action() : action, update);
  });
  const confirm = () => run(async () => {
    if (client && progress.txId) await client.confirm(progress.txId, update);
  });
  const discover = () => discoverWallets();
  const dismiss = () => {
    if (busyRef.current) return;
    try { if (receiptKey.current) localStorage.removeItem(receiptKey.current); } catch { /* State can still be cleared for this session. */ }
    setProgress({ phase: 'idle', message: '' });
  };
  return { connection, client, busy, error, progress, run, connect, disconnect, call, confirm, discover, dismiss };
}
export type Midnight = ReturnType<typeof useMidnight>;
