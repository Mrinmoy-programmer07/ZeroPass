import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hex, bytes, target, typeBytes, publicRequest, parseRequest, localProofUrl, safeError } from '../src/lib/core.ts';
import { seal, unseal } from '../src/lib/vault.ts';
import { discoverWallets, connectWallet, requireWalletDust } from '../src/lib/connector.ts';
import { executeTransaction, confirmTransaction } from '../src/lib/transactions.ts';
import { shieldedKeys } from '../src/lib/addresses.ts';
import { bech32m } from '@scure/base';

const config = target('preprod', '12'.repeat(32));
const credential = { version: 1, ...config, label: 'MEMBERSHIP', secret: 'ab'.repeat(32), salt: 'cd'.repeat(32), credentialType: hex(typeBytes('MEMBERSHIP')), commitment: 'ef'.repeat(32) };
const password = 'This-is-a-test-passphrase-293!';
const account = 'public-fixture-account';
const txId = '34'.repeat(32);
const success = { status: 'SucceedEntirely', txId, blockHeight: 42 };

describe('Credential privacy and recovery', () => {
  it('exports only public issuance fields and rejects cross-contract requests', () => {
    const request = publicRequest(credential);
    assert.deepEqual(Object.keys(request).sort(), ['version', 'network', 'contractAddress', 'commitment', 'credentialType'].sort());
    assert.ok(!JSON.stringify(request).includes(credential.secret));
    assert.ok(!JSON.stringify(request).includes(credential.salt));
    assert.deepEqual(parseRequest(JSON.stringify(request), config), request);
    assert.throws(() => parseRequest(JSON.stringify(request), { ...config, contractAddress: '00'.repeat(32) }), /different/);
    assert.throws(() => parseRequest(JSON.stringify({ ...request, credentialType: 'bad' }), config));
  });
  it('encrypts and restores the actual credential without plaintext secrets in storage', async () => {
    const encrypted = await seal(credential, password, account);
    assert.ok(!encrypted.includes(credential.secret)); assert.ok(!encrypted.includes(credential.salt));
    assert.deepEqual(await unseal(encrypted, password, config, account), credential);
    assert.notEqual(encrypted, await seal(credential, password, account));
  });
  it('rejects a wrong passphrase and modified ciphertext', async () => {
    const encrypted = await seal(credential, password, account);
    await assert.rejects(unseal(encrypted, 'A-different-password-99!', config, account), /Cannot unlock/);
    const altered = JSON.parse(encrypted); altered.ciphertext = `${altered.ciphertext.startsWith('00') ? 'ff' : '00'}${altered.ciphertext.slice(2)}`;
    await assert.rejects(unseal(JSON.stringify(altered), password, config, account), /Cannot unlock/);
  });
  it('binds encrypted backups to their wallet, network and contract', async () => {
    const encrypted = await seal(credential, password, account);
    await assert.rejects(unseal(encrypted, password, config, 'another-account'));
    await assert.rejects(unseal(encrypted, password, { ...config, network: 'preview' }, account));
    await assert.rejects(unseal(encrypted, password, { ...config, contractAddress: '56'.repeat(32) }, account));
  });
  it('rejects weak passphrases, oversized backups and unsupported KDF work factors', async () => {
    await assert.rejects(seal(credential, 'short', account), /16/);
    await assert.rejects(unseal('x'.repeat(32_769), password, config, account), /too large/);
    await assert.rejects(unseal(JSON.stringify({ format: 'zeropass-vault', version: 1, iterations: 2 ** 31 }), password, config, account));
  });
  it('validates network, address, type encoding and local proving boundaries', () => {
    assert.throws(() => target('mainnet', config.contractAddress));
    assert.throws(() => target('preprod', 'fabricated-address'));
    assert.equal(bytes(config.contractAddress).length, 32);
    assert.equal(typeBytes('MEMBERSHIP').length, 32);
    assert.throws(() => typeBytes('lowercase')); assert.throws(() => typeBytes('X'.repeat(33)));
    assert.equal(localProofUrl(), 'http://127.0.0.1:6300/');
    for (const url of ['https://remote.example', 'file:///tmp/proof', 'http://localhost.evil.example', 'http://user:pass@localhost']) assert.throws(() => localProofUrl(url));
  });
});

const api = (overrides = {}) => ({
  getConnectionStatus: async () => ({ status: 'connected', networkId: 'preprod' }),
  getConfiguration: async () => ({ networkId: 'preprod' }),
  getShieldedAddresses: async () => ({ shieldedAddress: 'fixture-address' }), ...overrides,
});
const wallet = (connected = api(), overrides = {}) => ({ name: 'Test-only wallet double', rdns: 'test.fixture', apiVersion: '4.0.1', connect: async () => connected, ...overrides });
describe('Midnight wallet connector', () => {
  it('decodes long shielded addresses with checksum, network and payload validation', () => {
    const payload = new Uint8Array(64); payload.fill(17, 0, 32); payload.fill(34, 32);
    const encoded = bech32m.encode('mn_shield-addr_preprod', bech32m.toWords(payload), false);
    assert.ok(encoded.length > 90);
    assert.deepEqual(shieldedKeys(encoded, 'preprod'), { coinPublicKey: '11'.repeat(32), encryptionPublicKey: '22'.repeat(32) });
    assert.throws(() => shieldedKeys(encoded, 'preview'));
    assert.throws(() => shieldedKeys(`${encoded.slice(0, -1)}${encoded.endsWith('q') ? 'p' : 'q'}`, 'preprod'));
    assert.throws(() => shieldedKeys(bech32m.encode('mn_shield-addr_preprod', bech32m.toWords(payload.slice(0, 32)), false), 'preprod'));
  });
  it('discovers supported connectors and ignores old Cardano/unsupported APIs', () => {
    assert.deepEqual(discoverWallets({}), []);
    assert.equal(discoverWallets({ fixture: wallet(), old: wallet(api(), { apiVersion: '3.0.0' }), prerelease: wallet(api(), { apiVersion: '4.1.0-beta.1' }) }).length, 1);
  });
  it('rejects duplicate wallet identities instead of silently choosing one', () => {
    assert.throws(() => discoverWallets({ a: wallet(), b: wallet() }), /Duplicate/);
  });
  it('connects with the explicit test network and returns the real API address', async () => {
    let requested;
    const choice = { id: 'a', api: wallet(api(), { connect: async network => { requested = network; return api(); } }) };
    const connection = await connectWallet(choice, 'preprod');
    assert.equal(requested, 'preprod'); assert.equal(connection.addresses.shieldedAddress, 'fixture-address');
  });
  it('rejects network mismatch and disconnected state', async () => {
    await assert.rejects(connectWallet({ id: 'a', api: wallet(api({ getConfiguration: async () => ({ networkId: 'preview' }) })) }, 'preprod'), /mismatch/);
    await assert.rejects(connectWallet({ id: 'a', api: wallet(api({ getConnectionStatus: async () => ({ status: 'disconnected' }) })) }, 'preprod'), /mismatch/);
  });
  it('preserves a user rejection and sanitizes private SDK errors', async () => {
    await assert.rejects(connectWallet({ id: 'a', api: wallet(api(), { connect: async () => { throw { code: 'Rejected' }; } }) }, 'preprod'));
    assert.match(safeError({ code: 'Rejected' }), /rejected/);
    assert.ok(!safeError(new Error(credential.secret)).includes(credential.secret));
    for (const code of ['InternalError', 'InvalidRequest']) {
      const message = safeError({ code, reason: credential.secret });
      assert.match(message, new RegExp(code));
      assert.ok(!message.includes(credential.secret));
    }
  });
  it('distinguishes missing DUST capacity from waiting for accrual before wallet balancing', async () => {
    await assert.rejects(requireWalletDust({ getDustBalance: async () => ({ balance: 0n, cap: 0n }) }), /no DUST capacity/);
    await assert.rejects(requireWalletDust({ getDustBalance: async () => ({ balance: 0n, cap: 10n }) }), /accrue/);
    await requireWalletDust({ getDustBalance: async () => ({ balance: 1n, cap: 10n }) });
  });
});

function steps(overrides = {}) {
  return { build: async () => 'unproven', prove: async () => 'proven', balance: async () => ({ transaction: 'balanced', txId }), submit: async () => {}, watch: async () => success, ...overrides };
}
describe('Honest transaction lifecycle', () => {
  it('shows success only after the indexer reports full finalization', async () => {
    const history = [];
    const result = await executeTransaction(steps(), value => history.push(value));
    assert.deepEqual(history.map(v => v.phase), ['building', 'proving', 'approval', 'submitting', 'pending', 'success']);
    assert.equal(result.blockHeight, 42); assert.equal(result.txId, txId);
  });
  it('stops before submission when proving fails and does not leak its error', async () => {
    let submitted = false;
    const result = await executeTransaction(steps({ prove: async () => { throw new Error(credential.secret); }, submit: async () => { submitted = true; } }), () => {});
    assert.equal(result.phase, 'failed'); assert.equal(submitted, false); assert.ok(!result.message.includes(credential.secret));
    assert.match(result.message, /Stopped during proving/);
  });
  it('handles wallet rejection without reporting a submitted transaction', async () => {
    const result = await executeTransaction(steps({ balance: async () => { throw { code: 'Rejected' }; } }), () => {});
    assert.equal(result.phase, 'failed'); assert.equal(result.txId, undefined);
    assert.match(result.message, /Stopped during approval/);
  });
  it('retains an identifier on submission transport failure for later reconciliation', async () => {
    const result = await executeTransaction(steps({ submit: async () => { throw new Error('network timeout'); } }), () => {});
    assert.equal(result.phase, 'unknown'); assert.equal(result.txId, txId);
    assert.match(result.message, /Stopped during submitting/);
  });
  it('never treats a failed fallible operation as verification success', async () => {
    const result = await executeTransaction(steps({ watch: async () => ({ ...success, status: 'FailFallible' }) }), () => {});
    assert.equal(result.phase, 'failed'); assert.equal(result.blockHeight, 42);
  });
  it('keeps a finalization timeout unknown and can recheck without resubmission', async () => {
    let submissions = 0;
    const result = await executeTransaction(steps({ submit: async () => { submissions++; }, watch: () => new Promise(() => {}) }), () => {}, 10);
    assert.equal(result.phase, 'unknown'); assert.equal(result.txId, txId);
    assert.equal((await confirmTransaction(txId, async () => success, () => {})).phase, 'success');
    assert.equal(submissions, 1);
  });
  it('rejects a finalization response for a different transaction', async () => {
    const result = await confirmTransaction(txId, async () => ({ ...success, txId: '99'.repeat(32) }), () => {});
    assert.equal(result.phase, 'unknown');
  });
});
