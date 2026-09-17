import { useState, useEffect } from 'react';
import { Shield, Key, Fingerprint, Activity, Zap, CheckCircle2, Lock, TerminalSquare } from 'lucide-react';

const CONTRACT_ADDRESS = '018f2d5a3...e7b9';

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  
  // ZK State
  const [verifying, setVerifying] = useState(false);
  const [proofStatus, setProofStatus] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);

  const connectWallet = async () => {
    try {
      // @ts-ignore - cardano is injected by wallet extensions
      if (window.cardano && window.cardano.lace) {
        // @ts-ignore
        const api = await window.cardano.lace.enable();
        const addresses = await api.getUsedAddresses();
        // Cardano addresses from Lace are hex encoded, so we just truncate for display
        const displayAddr = addresses && addresses.length > 0 
          ? `addr_${addresses[0].substring(0, 8)}...` 
          : 'Lace Connected';
        
        setWalletAddress(displayAddr);
        setWalletConnected(true);
      } else {
        // Fallback to simulation if Lace is not installed in the browser
        console.warn("Lace wallet extension not found. Using simulated connection.");
        setWalletAddress('addr_test1qpe...j4d8');
        setWalletConnected(true);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect to Lace wallet.");
    }
  };

  const generateProof = async () => {
    setVerifying(true);
    setProofStatus([]);
    
    const steps = [
      "Accessing local private state (LevelDB)...",
      "Reading private witnesses (secret, salt, ctype)...",
      "Initializing Midnight Proof Server...",
      "Generating ZK-SNARK proof for circuit 'verify_credential'...",
      "Proof generated locally. Private data never left the device.",
      "Submitting transaction to Preprod network..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setProofStatus(prev => [...prev, steps[i]]);
    }

    await new Promise(r => setTimeout(r, 1000));
    setVerified(true);
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface p-8 relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-[-200px] left-[20%] w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-100px] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center mb-16 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center glow-amber">
            <Fingerprint className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight text-on-surface">ZeroPass</h1>
            <p className="text-on-surface-variant text-xs font-mono tracking-widest uppercase">Protocol</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-full glass-panel flex items-center gap-2">
            <Activity className="w-4 h-4 text-tertiary" />
            <span className="font-mono text-xs text-on-surface-variant">Preprod Testnet</span>
          </div>
          
          <button 
            onClick={walletConnected ? () => setWalletConnected(false) : connectWallet}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
              walletConnected 
                ? 'bg-surface-container-high border border-outline-variant text-on-surface hover:border-primary/50' 
                : 'bg-gradient-to-r from-primary to-primary-container text-on-primary hover:glow-amber-strong'
            }`}
          >
            {walletConnected ? `Lace: ${walletAddress.substring(0, 8)}...` : 'Connect Lace Wallet'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column - Info & Contract */}
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-8">
            <h2 className="font-display text-3xl font-semibold mb-4 leading-tight">Prove your identity, <br/><span className="text-primary">keep your secrets.</span></h2>
            <p className="text-on-surface-variant text-base mb-8 leading-relaxed">
              ZeroPass allows institutions to issue credentials directly to your local wallet. You can then prove to third parties that you hold a valid credential using Midnight's ZK-SNARK circuits—without revealing the credential itself.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-on-surface-variant" />
                  <span className="font-mono text-sm">Contract ID</span>
                </div>
                <span className="font-mono text-sm text-primary">{CONTRACT_ADDRESS}</span>
              </div>
              <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-on-surface-variant" />
                  <span className="font-mono text-sm">Privacy Model</span>
                </div>
                <span className="text-sm font-semibold px-3 py-1 bg-surface-container-high rounded-full">Strict ZK (No Public Data)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Interaction Panel */}
        <div className="glass-panel rounded-xl p-8 relative overflow-hidden">
          {/* Subtle circuit pattern background could go here */}
          
          <div className="flex items-center justify-between mb-8 border-b border-outline-variant/30 pb-4">
            <h3 className="font-display text-xl font-semibold">Verify Credential</h3>
            <span className="px-3 py-1 bg-surface-container rounded-full text-xs font-mono text-on-surface-variant border border-outline-variant/30">CIRCUIT: verify_credential</span>
          </div>

          {!walletConnected ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center">
              <Key className="w-12 h-12 text-outline mb-4" />
              <p className="text-on-surface-variant">Connect your Lace wallet to interact with the ZeroPass protocol.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-lg bg-surface-container border border-outline-variant/30">
                <p className="text-sm text-on-surface-variant mb-4">You hold the following private credentials in your local Midnight state:</p>
                
                <div className="flex items-center justify-between p-4 bg-surface-container-high rounded border border-primary/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-tertiary" />
                    <div>
                      <p className="font-semibold text-sm">KYC_VERIFIED</p>
                      <p className="text-xs text-on-surface-variant font-mono">Issuer: Binance Global</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-surface-container rounded border border-outline-variant">Private</span>
                </div>
              </div>

              {!verified ? (
                <div className="space-y-4">
                  <button
                    onClick={generateProof}
                    disabled={verifying}
                    className="w-full py-4 rounded-lg bg-primary text-on-primary font-bold text-lg hover:glow-amber-strong transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className={`${verifying ? 'animate-pulse' : ''} w-5 h-5`} />
                    {verifying ? 'Generating ZK Proof...' : 'Prove Verification'}
                  </button>

                  {/* Terminal Output Simulation */}
                  {verifying && (
                    <div className="mt-6 bg-black rounded-lg p-4 font-mono text-xs text-secondary-fixed-dim leading-relaxed h-[160px] overflow-y-auto border border-outline-variant/30">
                      <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                        <TerminalSquare className="w-4 h-4" />
                        <span>Midnight Proof Server</span>
                      </div>
                      {proofStatus.map((step, idx) => (
                        <div key={idx} className="opacity-80 animate-fade-in flex gap-2">
                          <span className="text-primary">{'>'}</span> {step}
                        </div>
                      ))}
                      <div className="animate-pulse">_</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-tertiary/10 border border-tertiary/30 p-6 rounded-lg text-center animate-fade-in">
                  <div className="w-16 h-16 bg-tertiary/20 rounded-full flex items-center justify-center mx-auto mb-4 glow-amber">
                    <CheckCircle2 className="w-8 h-8 text-tertiary" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-tertiary mb-2">Proof Verified!</h4>
                  <p className="text-sm text-on-surface-variant mb-4">
                    The smart contract successfully verified your ZK proof on-chain. Your KYC status is proven, but your identity remains strictly private.
                  </p>
                  <button 
                    onClick={() => { setVerified(false); setProofStatus([]); }}
                    className="text-xs font-mono text-outline hover:text-on-surface transition-colors"
                  >
                    [ RESET SIMULATION ]
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
