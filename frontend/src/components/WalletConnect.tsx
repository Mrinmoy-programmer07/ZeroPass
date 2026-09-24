import { useState } from 'react';
import type { WalletChoice } from '../lib/connector.ts';
import { safeError, target } from '../lib/core.ts';
import type { Network, Target } from '../lib/core.ts';
import type { Midnight } from '../hooks/useMidnight.ts';
import preprodDeployment from '../../../deployments/preprod.json';

const initialNetwork: Network = import.meta.env.VITE_MIDNIGHT_NETWORK === 'preview' ? 'preview' : 'preprod';
const addressFor = (network: Network) => (network === initialNetwork ? import.meta.env.VITE_CONTRACT_ADDRESS : '') || (network === 'preprod' ? preprodDeployment.contractAddress : '');

export function WalletConnect({ midnight, config, onConfigure }: { midnight: Midnight; config?: Target; onConfigure: (config: Target) => void }) {
  const [network, setNetwork] = useState<Network>(initialNetwork);
  const [address, setAddress] = useState(addressFor(initialNetwork));
  const [wallets, setWallets] = useState<WalletChoice[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const scan = () => {
    try {
      setError('');
      const choices = midnight.discover(); setWallets(choices); setSelected(choices[0]?.id || '');
      if (!choices.length) setError('No compatible Midnight wallet found. Install or unlock Midnight Lace with connector API 4, then scan again.');
    } catch (failure) { setWallets([]); setSelected(''); setError(safeError(failure)); }
  };
  return <section className="panel">
    <div className="section-title"><span className="step">01</span><h2>Connect your wallet</h2><span className="badge">{midnight.connection ? 'Connected' : 'Disconnected'}</span></div>
    {!midnight.connection ? <>
      <div className="form-grid">
        <label>Test network<select value={network} disabled={midnight.busy} onChange={e => { const next = e.target.value as Network; setNetwork(next); setAddress(addressFor(next)); }}><option value="preprod">Preprod</option><option value="preview">Preview</option></select></label>
        <label>Deployed contract address<input value={address} disabled={midnight.busy} onChange={e => setAddress(e.target.value.trim())} placeholder="64-character hexadecimal address" spellCheck={false} /></label>
      </div>
      <p className="hint">Use the finalized Level 1 deployment address. Wallet fees require test-network DUST.</p>
      <div className="actions">
        <button className="secondary" disabled={midnight.busy} onClick={scan}>Find Midnight wallets</button>
        {wallets.length > 0 && <label>Wallet<select value={selected} disabled={midnight.busy} onChange={e => setSelected(e.target.value)}>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.api.name}</option>)}</select></label>}
        <button disabled={midnight.busy || !selected} onClick={() => {
          try { setError(''); const next = target(network, address); const choice = wallets.find(wallet => wallet.id === selected); if (choice) { onConfigure(next); void midnight.connect(choice, next); } }
          catch (failure) { setError(safeError(failure)); }
        }}>{midnight.busy ? 'Working…' : 'Connect wallet'}</button>
      </div>
    </> : <>
      <p className="hint">{midnight.connection.name} · {config?.network}</p>
      <p className="mono break-all" aria-label="Connected wallet address">{midnight.connection.addresses.shieldedAddress}</p>
      <button className="secondary" disabled={midnight.busy} onClick={midnight.disconnect}>Disconnect and lock</button>
      <p className="hint">Disconnect clears this app’s session. Revoke its permissions separately in your wallet if needed.</p>
    </>}
    <p className="hint">Credential proofs use your local server at http://127.0.0.1:6300. Start it with npm run proof-server and allow local-network access if your browser asks.</p>
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
