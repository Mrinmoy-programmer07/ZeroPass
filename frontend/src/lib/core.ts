export type Network = 'preprod' | 'preview';
export type Target = { network: Network; contractAddress: string };
export type Credential = Target & { version: 1; label: string; secret: string; salt: string; credentialType: string; commitment: string };
export type IssuanceRequest = Target & { version: 1; commitment: string; credentialType: string };
export class UserError extends Error {}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export function bytes(value: string, length = 32): Uint8Array<ArrayBuffer> {
  if (!new RegExp(`^[a-fA-F0-9]{${length * 2}}$`).test(value)) throw new UserError(`Expected ${length} bytes encoded as hexadecimal.`);
  return Uint8Array.from(value.match(/.{2}/g)!, pair => parseInt(pair, 16));
}
export function target(network: string, address: string): Target {
  if (network !== 'preprod' && network !== 'preview') throw new UserError('Select Preview or Preprod. Mainnet is not supported.');
  bytes(address);
  return { network, contractAddress: address.toLowerCase() };
}
export function typeBytes(label: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(label)) throw new UserError('Use a credential type of 1–32 uppercase letters, digits or underscores, starting with a letter.');
  const value = new Uint8Array(32);
  value.set(new TextEncoder().encode(label));
  return value;
}
export function publicRequest(credential: Credential): IssuanceRequest {
  const { network, contractAddress, commitment, credentialType } = credential;
  return { version: 1, network, contractAddress, commitment, credentialType };
}
export function parseRequest(text: string, expected: Target): IssuanceRequest {
  let value;
  try { value = JSON.parse(text); } catch { throw new UserError('The issuance request must be valid JSON.'); }
  if (!value || value.version !== 1 || value.network !== expected.network || value.contractAddress !== expected.contractAddress) {
    throw new UserError('This request belongs to a different network or contract.');
  }
  if (typeof value.commitment !== 'string' || typeof value.credentialType !== 'string') throw new UserError('Incomplete issuance request.');
  bytes(value.commitment); bytes(value.credentialType);
  return { version: 1, ...expected, commitment: value.commitment, credentialType: value.credentialType };
}
export function validateCredential(value: unknown, expected: Target): Credential {
  if (!value || typeof value !== 'object') throw new UserError('Invalid credential backup.');
  const c = value as Credential;
  if (c.version !== 1 || c.network !== expected.network || c.contractAddress !== expected.contractAddress || typeof c.label !== 'string') {
    throw new UserError('The credential belongs to a different network or contract.');
  }
  for (const key of ['secret', 'salt', 'credentialType', 'commitment'] as const) {
    if (typeof c[key] !== 'string') throw new UserError('Invalid credential backup.');
    bytes(c[key]);
  }
  if (hex(typeBytes(c.label)) !== c.credentialType) throw new UserError('Credential type does not match its label.');
  return { version: 1, ...expected, label: c.label, secret: c.secret, salt: c.salt, credentialType: c.credentialType, commitment: c.commitment };
}
export function localProofUrl(value = 'http://127.0.0.1:6300'): string {
  let url;
  try { url = new URL(value); } catch { throw new UserError('Invalid local proof-server URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) {
    throw new UserError('Use a loopback proof server: proving requests contain private inputs.');
  }
  return url.href;
}
export function safeError(error: unknown): string {
  if (error instanceof UserError) return error.message;
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'Rejected' || code === 'PermissionRejected') return 'The wallet request was rejected. No success is assumed; review the transaction status before retrying.';
  if (code === 'Disconnected') return 'The wallet disconnected. Reconnect to the selected test network.';
  if (code === 'InternalError') return 'Lace reported InternalError. Check its DUST balance, synchronization and extension version. Private wallet error details were not displayed.';
  if (code === 'InvalidRequest') return 'Lace rejected the transaction format (InvalidRequest). Check that your wallet version supports the current Preprod protocol. Private wallet error details were not displayed.';
  // SDK errors may embed witnesses or transaction preimages. Never echo them.
  return 'The operation could not finish. Check your wallet, network, local proof server and credential status. Private error details were not displayed.';
}
export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new UserError(message)), ms); })]); }
  finally { clearTimeout(timer); }
}
