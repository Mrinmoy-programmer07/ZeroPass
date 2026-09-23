import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Cache only SDK state, encrypted with a domain-separated key derived from the
// existing random wallet seed. No seed or raw wallet state is written to disk.
export function walletCache(seed, network, address, directory = fileURLToPath(new URL('../../.zeropass/', import.meta.url))) {
  if (!['preprod', 'preview'].includes(network)) throw new Error('Unsupported cache network.');
  const binding = Buffer.from(`zeropass-wallet-cache-v1:${network}:${address}:sdk-1.2.0`);
  const key = Buffer.from(hkdfSync('sha256', seed, binding, 'wallet-state-encryption', 32));
  const account = createHash('sha256').update(address).digest('hex').slice(0, 24);
  const path = `${directory}/${network}/wallet-${account}.json`;
  function validate(state) {
    if (!state || !['shielded', 'unshielded', 'dust'].every(name => typeof state[name] === 'string')) {
      throw new Error('Invalid wallet checkpoint.');
    }
    return state;
  }
  return {
    async load() {
      let data;
      try { data = JSON.parse(await readFile(path, 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return undefined; throw new Error('Cannot read encrypted wallet checkpoint.'); }
      try {
        if (data.version !== 1) throw new Error('Unsupported cache format.');
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'hex'));
        decipher.setAAD(binding);
        decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
        return validate(JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.ciphertext, 'base64')), decipher.final()]).toString('utf8')));
      } catch { throw new Error('Cannot authenticate encrypted wallet checkpoint.'); }
    },
    async save(state) {
      validate(state);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(binding);
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(state)), cipher.final()]);
      const data = JSON.stringify({ version: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('base64') });
      await mkdir(dirname(path), { recursive: true });
      const temporary = `${path}.next`;
      await writeFile(temporary, data, { mode: 0o600 });
      await rename(temporary, path);
    },
  };
}
