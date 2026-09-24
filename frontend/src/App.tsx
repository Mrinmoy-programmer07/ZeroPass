import { useState } from 'react';
import { Fingerprint, ShieldCheck, LockKeyhole } from 'lucide-react';
import { useMidnight } from './hooks/useMidnight.ts';
import type { Midnight } from './hooks/useMidnight.ts';
import { WalletConnect } from './components/WalletConnect.tsx';
import { CredentialVault } from './components/CredentialVault.tsx';
import { CircuitCall } from './components/CircuitCall.tsx';
import { IssuerTools } from './components/IssuerTools.tsx';
import type { Credential, Target } from './lib/core.ts';

function ConnectedWorkspace({ midnight, config }: { midnight: Midnight; config: Target }) {
  const [credential, setCredential] = useState<Credential>();
  return <>
    <div className="workspace-grid">
      <CredentialVault config={config} midnight={midnight} credential={credential} onCredential={setCredential} />
      <CircuitCall midnight={midnight} credential={credential} />
    </div>
    <IssuerTools midnight={midnight} config={config} />
  </>;
}

export default function App() {
  const midnight = useMidnight();
  const [config, setConfig] = useState<Target>();
  const { progress } = midnight;
  return <div className="app-shell">
    <header className="site-header">
      <div className="brand"><Fingerprint size={36} /><div><h1>ZeroPass</h1><p>Credential verification</p></div></div>
      <span className="network-pill">{config?.network || 'Test networks only'} · Level 2</span>
    </header>
    <main>
      <section className="hero">
        <p className="eyebrow">YOUR CREDENTIAL. YOUR SECRET.</p>
        <h2>Prove possession.<br /><span>Keep your secrets.</span></h2>
        <p>Connect a Midnight wallet, keep your credential in an encrypted local vault, and prove that it is valid.</p>
        <div className="privacy-note"><LockKeyhole size={18} /><span>Private secret and salt. Public commitment, issuer, type and verification activity.</span></div>
      </section>
      <WalletConnect midnight={midnight} config={config} onConfigure={setConfig} />
      {midnight.error && <div role="alert" className="error panel">{midnight.error}</div>}
      {progress.phase !== 'idle' && <section className={`panel transaction ${progress.phase}`} aria-live="polite" aria-atomic="true">
        <div className="section-title"><ShieldCheck size={20} /><h2>Transaction status</h2><span className="badge">{progress.phase}</span></div>
        <p>{progress.message}</p>
        {progress.txId && <><p className="hint">Public transaction ID</p><p className="mono break-all">{progress.txId}</p></>}
        {progress.blockHeight !== undefined && <p className="hint">Finalized block: {progress.blockHeight}</p>}
        {progress.phase === 'success' && <p className="success-label">Proved without revealing your secret inputs to the chain.</p>}
        {progress.txId && <div className="actions">
          <button className="secondary" disabled={midnight.busy} onClick={() => void midnight.confirm()}>Check network status</button>
          <button className="text-button" disabled={midnight.busy} onClick={() => {
            if (window.confirm('Clear this app’s transaction tracking? This does not cancel the transaction. Check the network or wallet history before submitting again.')) midnight.dismiss();
          }}>Dismiss tracking</button>
        </div>}
      </section>}
      {midnight.connection && config ? <ConnectedWorkspace key={`${config.network}:${config.contractAddress}:${midnight.connection.addresses.shieldedAddress}`} midnight={midnight} config={config} /> :
        <section className="panel empty-state"><ShieldCheck size={32} /><h2>A real contract connection</h2><p>Connect your wallet to open the vault and institution tools. No sample credentials, simulated proofs or placeholder transactions are used.</p><p className="hint">ZeroPass is deployed on Preprod. Use the confirmed contract address from the README and a Midnight wallet on the same network.</p></section>}
      <section className="privacy-footer"><h2>What stays private?</h2><p>Holder secrets and salts are never rendered or sent to the indexer. Proving runs through your local proof server, which receives those inputs. Public commitments make credential activity linkable; this is not anonymous identity or a complete login service.</p><p>Use test credentials only. Losing your vault backup or passphrase can make a credential unrecoverable.</p></section>
    </main>
    <footer>ZeroPass · Compact circuits on Midnight · Preview / Preprod</footer>
  </div>;
}
