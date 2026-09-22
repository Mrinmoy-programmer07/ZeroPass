import { useState } from 'react';
import { bytes, parseRequest } from '../lib/core.ts';
import type { Target } from '../lib/core.ts';
import type { Midnight } from '../hooks/useMidnight.ts';

export function IssuerTools({ midnight, config }: { midnight: Midnight; config: Target }) {
  const [role, setRole] = useState<'issuer' | 'admin'>('issuer');
  const [secret, setSecret] = useState('');
  const [request, setRequest] = useState('');
  const [publicId, setPublicId] = useState('');
  const [commitment, setCommitment] = useState('');
  return <details className="panel">
    <summary>Institution and administrator tools</summary>
    <p className="hint">Authorization is enforced by the contract. Secrets are masked, held in memory and cleared after use. Your wallet pays test-network fees.</p>
    <label>Role<select disabled={midnight.busy} value={role} onChange={e => { setRole(e.target.value as 'issuer' | 'admin'); setSecret(''); setPublicId(''); }}><option value="issuer">Issuing institution</option><option value="admin">Contract administrator</option></select></label>
    <label>{role === 'issuer' ? 'Issuer' : 'Administrator'} authorization secret<input type="password" autoComplete="off" value={secret} disabled={midnight.busy} onChange={e => setSecret(e.target.value.trim())} placeholder="32-byte hexadecimal secret" /></label>
    {role === 'admin' ? <>
      <label>Public issuer ID<input value={publicId} disabled={midnight.busy} onChange={e => setPublicId(e.target.value.trim())} placeholder="Issuer’s public identity hash" spellCheck={false} /></label>
      <button disabled={midnight.busy || !/^[a-fA-F0-9]{64}$/.test(secret) || !/^[a-fA-F0-9]{64}$/.test(publicId)} onClick={() => { const adminSecret = secret; setSecret(''); void midnight.call({ circuit: 'register_issuer', adminSecret, issuerId: publicId }); }}>Register issuer</button>
    </> : <>
      <div className="actions"><button className="secondary" disabled={midnight.busy || !/^[a-fA-F0-9]{64}$/.test(secret)} onClick={() => void midnight.run(async () => { const module = await import('../lib/contract.ts'); setPublicId(module.issuerIdentity(secret)); })}>Derive public issuer ID</button></div>
      {publicId && <p className="mono break-all">Public issuer ID: {publicId}</p>}
      <label>Holder’s public issuance request<textarea rows={5} value={request} disabled={midnight.busy} onChange={e => setRequest(e.target.value)} placeholder="Paste the holder’s public JSON request" /></label>
      <button disabled={midnight.busy || !/^[a-fA-F0-9]{64}$/.test(secret) || !request} onClick={() => {
        const issuerSecret = secret; setSecret('');
        void midnight.call(() => ({ circuit: 'issue_credential', issuerSecret, request: parseRequest(request, config) }));
      }}>Issue credential</button>
      <hr />
      <label>Commitment to revoke<input value={commitment} disabled={midnight.busy} onChange={e => setCommitment(e.target.value.trim())} placeholder="Public credential commitment" spellCheck={false} /></label>
      <button className="secondary" disabled={midnight.busy || !/^[a-fA-F0-9]{64}$/.test(secret) || !/^[a-fA-F0-9]{64}$/.test(commitment)} onClick={() => { bytes(commitment); const issuerSecret = secret; setSecret(''); void midnight.call({ circuit: 'revoke_credential', issuerSecret, commitment }); }}>Revoke credential</button>
    </>}
  </details>;
}
