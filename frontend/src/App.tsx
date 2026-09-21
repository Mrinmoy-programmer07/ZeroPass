import { useState } from 'react';
import { Fingerprint, Activity, Zap, CheckCircle2, Key, TerminalSquare } from 'lucide-react';

export default function App() {
  const [demoActive, setDemoActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);

  const reset = () => { setComplete(false); setSteps([]); };
  const runDemo = async () => {
    setRunning(true);
    setSteps([]);
    const examples = [
      'Example: the holder supplies a secret and salt.',
      'Example: match the credential commitment and requested type.',
      'Example: reject revoked credentials and reused session scopes.',
      'Example: record a public nullifier for the accepted scope.',
    ];
    for (const step of examples) {
      await new Promise(resolve => setTimeout(resolve, 700));
      setSteps(previous => [...previous, step]);
    }
    setComplete(true);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-200px] left-[20%] w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <header className="flex flex-wrap gap-6 justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center glow-amber">
            <Fingerprint className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight">ZeroPass</h1>
            <p className="text-on-surface-variant text-xs font-mono tracking-widest uppercase">Credential verification</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="px-4 py-2 rounded-full glass-panel flex items-center gap-2">
            <Activity className="w-4 h-4 text-tertiary" />
            <span className="font-mono text-xs text-on-surface-variant">Interactive demo</span>
          </div>
          <button
            disabled={running}
            onClick={() => { reset(); setDemoActive(active => !active); }}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {demoActive ? 'End demo' : 'Explore demo'}
          </button>
        </div>
      </header>
      <p className="max-w-4xl mx-auto mb-6 p-4 rounded-lg border border-primary/30 text-sm text-on-surface-variant relative z-10">
        Sample credential walkthrough. This interface does not connect a wallet, generate a proof or send an on-chain transaction.
      </p>
      <main className="max-w-4xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="glass-panel rounded-xl p-6 sm:p-8">
          <h2 className="font-display text-3xl font-semibold mb-4 leading-tight">Prove possession,<br /><span className="text-primary">keep your secrets.</span></h2>
          <p className="text-on-surface-variant mb-8 leading-relaxed">
            ZeroPass checks possession of a registered, non-revoked credential. Its contract keeps secret preimages private while publishing credential commitments and verification metadata.
          </p>
          <dl className="space-y-4 text-sm">
            <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/30">
              <dt className="font-mono text-on-surface-variant mb-2">Contract status</dt>
              <dd className="text-primary">Deployment pending</dd>
            </div>
            <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/30">
              <dt className="font-mono text-on-surface-variant mb-2">Privacy model</dt>
              <dd>Private secrets · public metadata</dd>
              <dd className="text-on-surface-variant mt-2 leading-relaxed">Issuer IDs, credential types, commitments, revocation status, scopes and nullifiers are public. Credential activity can be linked through its commitment.</dd>
            </div>
          </dl>
        </section>
        <section className="glass-panel rounded-xl p-6 sm:p-8 min-w-0">
          <h2 className="font-display text-xl font-semibold mb-6 border-b border-outline-variant/30 pb-4">Verification walkthrough</h2>
          {!demoActive ? (
            <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
              <Key className="w-12 h-12 text-outline mb-4" />
              <p className="text-on-surface-variant">Choose Explore demo to try a sample credential. No wallet is needed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-lg bg-surface-container border border-outline-variant/30">
                <p className="text-sm text-on-surface-variant mb-4">Illustrative credential</p>
                <p className="font-semibold">MEMBERSHIP</p>
                <p className="text-xs text-on-surface-variant mt-2">Issuer: Example institution · sample data</p>
              </div>
              {!complete ? (
                <>
                  <button onClick={runDemo} disabled={running} className="w-full py-4 rounded-lg bg-primary text-on-primary font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Zap className="w-5 h-5" />{running ? 'Playing walkthrough…' : 'Run demo'}
                  </button>
                  {running && (
                    <div role="status" aria-live="polite" className="bg-black rounded-lg p-4 font-mono text-xs text-secondary-fixed-dim leading-relaxed space-y-3">
                      <div className="flex items-center gap-2 text-on-surface-variant"><TerminalSquare className="w-4 h-4" />Illustrative steps</div>
                      {steps.map(step => <p key={step}>{step}</p>)}
                    </div>
                  )}
                </>
              ) : (
                <div role="status" className="bg-tertiary/10 border border-tertiary/30 p-6 rounded-lg text-center">
                  <CheckCircle2 className="w-10 h-10 text-tertiary mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold text-tertiary mb-2">Demo complete</h3>
                  <p className="text-sm text-on-surface-variant mb-4">This shows the intended verification flow. No proof was generated or transaction sent by this interface.</p>
                  <button onClick={reset} className="text-sm underline underline-offset-4">Reset demo</button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
