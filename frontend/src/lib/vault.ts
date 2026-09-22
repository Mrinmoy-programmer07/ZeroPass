import { bytes, hex, UserError, validateCredential } from './core.ts';
import type { Credential, Target } from './core.ts';

const iterations = 600_000;
export const vaultKey = (target: Target, account: string) => `zeropass:v1:${target.network}:${target.contractAddress}:${account}`;
async function key(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (password.length < 16 || password.length > 1024) throw new UserError('Use a vault passphrase between 16 and 1,024 characters.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(credential: Credential, password: string, account: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(vaultKey(credential, account));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, await key(password, salt), new TextEncoder().encode(JSON.stringify(credential)));
  return JSON.stringify({ format: 'zeropass-vault', version: 1, iterations, salt: hex(salt), iv: hex(iv), ciphertext: hex(new Uint8Array(ciphertext)) });
}
export async function unseal(text: string, password: string, expected: Target, account: string): Promise<Credential> {
  if (text.length > 32_768) throw new UserError('Credential backup is too large.');
  try {
    const data = JSON.parse(text);
    if (data.format !== 'zeropass-vault' || data.version !== 1 || data.iterations !== iterations || typeof data.ciphertext !== 'string' || data.ciphertext.length < 32 || data.ciphertext.length % 2) throw new Error();
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(data.iv, 12), additionalData: new TextEncoder().encode(vaultKey(expected, account)) }, await key(password, bytes(data.salt)), bytes(data.ciphertext, data.ciphertext.length / 2));
    return validateCredential(JSON.parse(new TextDecoder().decode(clear)), expected);
  } catch { throw new UserError('Cannot unlock this backup. Check the passphrase, connected wallet, network and contract.'); }
}
