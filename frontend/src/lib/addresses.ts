import { bech32m } from '@scure/base';
import { hex, UserError } from './core.ts';
import type { Network } from './core.ts';

export function shieldedKeys(address: string, network: Network) {
  try {
    // Midnight's shielded address has a 64-byte payload and exceeds Bech32's
    // usual 90-character limit. Keep checksum validation and bound input size.
    if (address.length > 256) throw new Error();
    const decoded = bech32m.decodeToBytes(address, false);
    if (decoded.prefix !== `mn_shield-addr_${network}` || decoded.bytes.length !== 64) throw new Error();
    return { coinPublicKey: hex(decoded.bytes.slice(0, 32)), encryptionPublicKey: hex(decoded.bytes.slice(32)) };
  } catch { throw new UserError('The wallet returned an invalid shielded address for this network.'); }
}
