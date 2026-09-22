import { useState } from 'react';
import type { Credential } from '../lib/core.ts';
import { bytes, hex } from '../lib/core.ts';
import type { Midnight } from '../hooks/useMidnight.ts';
import type { PublicSummary } from '../lib/contract.ts';

export function CircuitCall({ midnight, credential }: { midnight: Midnight; credential?: Credential }) {
  const [scope, setScope] = useState('');
  const [summary, setSummary] = useState<PublicSummary>();
  return <section className="panel">
    <div className="section-title"><span className="step">03</span><h2>Verify your credential</h2></div>
    <p className="hint">Prove possession without publishing your secret or salt. Your commitment, issuer, type and session scope remain public.</p>
    <label>Verifier’s public session scope<input value={scope} maxLength={64} disabled={midnight.busy} onChange={e => setScope(e.target.value.trim())} placeholder="32-byte hexadecimal challenge" spellCheck={false} /></label>
    <button className="text-button" disabled={midnight.busy} onClick={() => setScope(hex(crypto.getRandomValues(new Uint8Array(32))))}>Generate a scope for testing</button>
    <p className="hint">A real verifier must issue and check this challenge. A test scope does not establish an authenticated login.</p>
    <div className="actions">
      <button disabled={midnight.busy || !credential || !/^[a-fA-F0-9]{64}$/.test(scope)} onClick={() => {
        if (credential) { bytes(scope); void midnight.call({ circuit: 'verify_credential', credential, scope }); }
      }}>{midnight.busy ? 'Transaction in progress…' : 'Prove and submit'}</button>
      <button className="secondary" disabled={midnight.busy} onClick={() => void midnight.run(async () => { if (midnight.client) setSummary(await midnight.client.summary(credential)); })}>Refresh public state</button>
    </div>
    {!credential && <p className="hint">Unlock your credential to verify it.</p>}
    {summary && <p role="status" className="hint">Public ledger: {summary.issued} issued · {summary.verified} verifications{summary.credential ? ` · Credential ${summary.credential}` : ''}. Refresh after a transaction.</p>}
  </section>;
}
