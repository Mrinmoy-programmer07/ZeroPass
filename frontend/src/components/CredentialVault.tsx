import { useState } from 'react';
import type { Credential, Target } from '../lib/core.ts';
import { publicRequest, UserError } from '../lib/core.ts';
import { seal, unseal, vaultKey } from '../lib/vault.ts';
import type { Midnight } from '../hooks/useMidnight.ts';

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CredentialVault({ config, midnight, credential, onCredential }: { config: Target; midnight: Midnight; credential?: Credential; onCredential: (value?: Credential) => void }) {
  const account = midnight.connection!.addresses.shieldedAddress;
  const storageKey = vaultKey(config, account);
  const [exists, setExists] = useState(() => { try { return !!localStorage.getItem(storageKey); } catch { return false; } });
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('MEMBERSHIP');
  const [notice, setNotice] = useState('');
  return <section className="panel">
    <div className="section-title"><span className="step">02</span><h2>Private credential vault</h2><span className="badge">{credential ? 'Unlocked' : 'Locked'}</span></div>
    <p className="hint">Your secret and salt stay off-screen. Only an encrypted credential is saved in this browser. Keep an encrypted backup and its passphrase.</p>
    {!credential ? <>
      {!exists && <label>Credential type<input value={label} maxLength={32} onChange={e => setLabel(e.target.value.toUpperCase())} disabled={midnight.busy} /></label>}
      <label>Vault passphrase<input type="password" autoComplete={exists ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} disabled={midnight.busy} placeholder="At least 16 characters" /></label>
      <div className="actions">
        <button disabled={midnight.busy || password.length < 16} onClick={() => void midnight.run(async () => {
          setNotice('');
          try {
            const module = await import('../lib/contract.ts');
            if (exists) {
              const encrypted = localStorage.getItem(storageKey);
              if (!encrypted) throw new UserError('The local vault was removed. Restore its encrypted backup.');
              const value = await unseal(encrypted, password, config, account); module.checkCredential(value); onCredential(value);
            } else {
              if (localStorage.getItem(storageKey)) throw new UserError('A vault already exists. Reload before continuing.');
              const value = module.createCredential(config, label);
              const encrypted = await seal(value, password, account);
              localStorage.setItem(storageKey, encrypted); setExists(true); onCredential(value);
              setNotice('Credential created locally. It still needs issuance by a registered institution.');
            }
          } finally { setPassword(''); }
        })}>{exists ? 'Unlock vault' : 'Create private credential'}</button>
        {!exists && <label className="file-button">Restore encrypted backup<input type="file" accept=".json,application/json" disabled={midnight.busy || password.length < 16} onChange={e => {
          const file = e.target.files?.[0]; e.target.value = '';
          if (file) void midnight.run(async () => {
            try {
              if (file.size > 32_768) throw new UserError('Backup is too large.');
              if (localStorage.getItem(storageKey)) throw new UserError('A vault already exists. Export and remove its local copy before restoring another.');
              const encrypted = await file.text(); const value = await unseal(encrypted, password, config, account);
              const module = await import('../lib/contract.ts'); module.checkCredential(value);
              localStorage.setItem(storageKey, encrypted); setExists(true); onCredential(value); setNotice('Encrypted backup restored.');
            } finally { setPassword(''); }
          });
        }} /></label>}
      </div>
    </> : <>
      <p className="credential-label">{credential.label}</p>
      <label>Public issuance request<textarea readOnly rows={6} value={JSON.stringify(publicRequest(credential), null, 2)} spellCheck={false} /></label>
      <p className="hint">Send this public request to your issuer. It contains no holder secret or salt.</p>
      <div className="actions">
        <button className="secondary" disabled={midnight.busy} onClick={() => void midnight.run(async () => { await navigator.clipboard.writeText(JSON.stringify(publicRequest(credential), null, 2)); setNotice('Public request copied.'); })}>Copy request</button>
        <button className="secondary" disabled={midnight.busy} onClick={() => void midnight.run(async () => {
          const encrypted = localStorage.getItem(storageKey); if (!encrypted) throw new UserError('No encrypted backup is available.');
          download('zeropass-encrypted-credential.json', encrypted); setNotice('Encrypted backup downloaded. Keep it with your private backups.');
        })}>Export encrypted backup</button>
        <button className="secondary" disabled={midnight.busy} onClick={() => { onCredential(undefined); setPassword(''); setNotice('Vault locked.'); }}>Lock vault</button>
      </div>
    </>}
    {exists && !credential && <button className="text-button" disabled={midnight.busy} onClick={() => {
      if (window.confirm('Remove this browser’s encrypted credential? You will need your backup and passphrase to recover it. On-chain state will not change.')) {
        void midnight.run(async () => { localStorage.removeItem(storageKey); setExists(false); setNotice('Local copy removed.'); });
      }
    }}>Remove local copy</button>}
    {notice && <p role="status" className="hint">{notice}</p>}
  </section>;
}
