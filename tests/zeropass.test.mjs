import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../contract/managed/contract/index.js';
import { witnesses } from '../contract/witnesses.mjs';

const bytes = (label) => new Uint8Array(createHash('sha256').update(label).digest());
const coin = '0'.repeat(64);
const type = bytes('membership');
const scope = bytes('verifier.example/session-1');

function fixture() {
  const state = {
    secret: bytes('holder-secret'), salt: bytes('holder-salt'), credentialType: type,
    adminSecret: bytes('admin-secret'), issuerSecret: bytes('issuer-secret'),
  };
  const contract = new Contract(witnesses);
  const adminId = pureCircuits.identity(state.adminSecret);
  const issuerId = pureCircuits.identity(state.issuerSecret);
  const commitment = pureCircuits.credential_commitment(state.secret, state.salt, type);
  const initial = contract.initialState(RT.createConstructorContext(state, coin), adminId);
  let context = RT.createCircuitContext(RT.sampleContractAddress(), coin, initial.currentContractState, state);
  return {
    contract, state, adminId, issuerId, commitment,
    get context() { return context; },
    get ledger() { return ledger(context.currentQueryContext.state); },
    call(name, args = [], privateState = state) {
      const result = contract.impureCircuits[name]({ ...context, currentPrivateState: privateState }, ...args);
      context = result.context;
      return result;
    },
    issue(issuedType = type) {
      this.call('register_issuer', [issuerId]);
      this.call('issue_credential', [commitment, issuedType]);
    },
  };
}

const serialize = (value) => JSON.stringify(value, (_key, item) =>
  item instanceof Uint8Array ? Buffer.from(item).toString('hex') :
  typeof item === 'bigint' ? item.toString() : item);

describe('ZeroPass generated Compact contract', () => {
  it('initializes the administrator and empty public state', () => {
    const f = fixture();
    assert.deepEqual(f.ledger.admin, f.adminId);
    assert.equal(f.ledger.total_issued, 0n);
    assert.equal(f.ledger.total_verified, 0n);
    assert.equal(f.ledger.credential_exists.size(), 0n);
  });

  it('rejects issuer registration by a non-administrator', () => {
    const f = fixture();
    assert.throws(() => f.call('register_issuer', [f.issuerId],
      { ...f.state, adminSecret: bytes('attacker') }), /Not admin/);
    assert.equal(f.ledger.issuer_registry.size(), 0n);
  });

  it('rejects issuance by an unregistered issuer', () => {
    const f = fixture();
    assert.throws(() => f.call('issue_credential', [f.commitment, type]), /Unauthorized issuer/);
    assert.equal(f.ledger.total_issued, 0n);
  });

  it('issues a credential and records its type, owner and non-revoked status', () => {
    const f = fixture(); f.issue();
    assert.equal(f.ledger.credential_exists.lookup(f.commitment), true);
    assert.equal(f.ledger.credential_revoked.lookup(f.commitment), false);
    assert.deepEqual(f.ledger.credential_type.lookup(f.commitment), type);
    assert.deepEqual(f.ledger.credential_issuer.lookup(f.commitment), f.issuerId);
    assert.equal(f.ledger.total_issued, 1n);
  });

  it('successfully verifies a newly issued, non-revoked credential', () => {
    const f = fixture(); f.issue();
    const result = f.call('verify_credential', [type, scope]);
    const nullifier = pureCircuits.verification_nullifier(f.state.secret, type, scope);
    assert.deepEqual(result.result, []);
    assert.equal(f.ledger.total_verified, 1n);
    assert.equal(f.ledger.used_nullifiers.member(nullifier), true);
    assert.deepEqual(f.ledger.verification_scopes.lookup(nullifier), scope);
  });

  it('rejects the same verification scope twice without advancing counters', () => {
    const f = fixture(); f.issue(); f.call('verify_credential', [type, scope]);
    assert.throws(() => f.call('verify_credential', [type, scope]), /Credential already used/);
    assert.equal(f.ledger.total_verified, 1n);
  });

  it('allows the holder to verify in a different session scope', () => {
    const f = fixture(); f.issue(); f.call('verify_credential', [type, scope]);
    f.call('verify_credential', [type, bytes('verifier.example/session-2')]);
    assert.equal(f.ledger.total_verified, 2n);
    assert.equal(f.ledger.used_nullifiers.size(), 2n);
  });

  it('rejects a requested credential type that the holder does not have', () => {
    const f = fixture(); f.issue();
    assert.throws(() => f.call('verify_credential', [bytes('different-type'), scope]), /Wrong credential type/);
    assert.equal(f.ledger.total_verified, 0n);
  });

  it('binds verification to the type recorded by the issuer', () => {
    const f = fixture(); f.issue(bytes('issuer-recorded-other-type'));
    assert.throws(() => f.call('verify_credential', [type, scope]), /Issued credential type mismatch/);
  });

  for (const field of ['secret', 'salt', 'credentialType']) {
    it(`rejects a forged private ${field}`, () => {
      const f = fixture(); f.issue();
      assert.throws(() => f.call('verify_credential', [type, scope],
        { ...f.state, [field]: bytes('forged') }), /Credential not registered/);
    });
  }

  it('lets the issuing institution revoke and then rejects verification', () => {
    const f = fixture(); f.issue(); f.call('revoke_credential', [f.commitment]);
    assert.equal(f.ledger.credential_revoked.lookup(f.commitment), true);
    assert.throws(() => f.call('verify_credential', [type, scope]), /Credential revoked/);
    assert.equal(f.ledger.total_verified, 0n);
  });

  it('prevents a different registered issuer from revoking the credential', () => {
    const f = fixture(); f.issue();
    const other = { ...f.state, issuerSecret: bytes('other-issuer') };
    f.call('register_issuer', [pureCircuits.identity(other.issuerSecret)]);
    assert.throws(() => f.call('revoke_credential', [f.commitment], other), /Only issuing institution can revoke/);
    assert.equal(f.ledger.credential_revoked.lookup(f.commitment), false);
  });

  it('rejects revocation of an unknown credential', () => {
    const f = fixture(); f.call('register_issuer', [f.issuerId]);
    assert.throws(() => f.call('revoke_credential', [bytes('unknown')]), /Credential not found/);
  });

  it('prevents duplicate issuance from overwriting owner or revocation state', () => {
    const f = fixture(); f.issue(); f.call('revoke_credential', [f.commitment]);
    const other = { ...f.state, issuerSecret: bytes('other-issuer') };
    f.call('register_issuer', [pureCircuits.identity(other.issuerSecret)]);
    assert.throws(() => f.call('issue_credential', [f.commitment, bytes('other-type')], other), /Credential already registered/);
    assert.deepEqual(f.ledger.credential_issuer.lookup(f.commitment), f.issuerId);
    assert.equal(f.ledger.credential_revoked.lookup(f.commitment), true);
    assert.equal(f.ledger.total_issued, 1n);
  });

  it('keeps raw secret preimages out of public transcripts while disclosing commitments', () => {
    const f = fixture();
    const results = [f.call('register_issuer', [f.issuerId]),
      f.call('issue_credential', [f.commitment, type]),
      f.call('verify_credential', [type, scope]),
      f.call('revoke_credential', [f.commitment])];
    const publicData = serialize(results.map(({ proofData }) => ({
      publicTranscript: proofData.publicTranscript, output: proofData.output,
    })));
    for (const field of ['secret', 'salt', 'adminSecret', 'issuerSecret']) {
      const hex = Buffer.from(f.state[field]).toString('hex');
      assert.equal(publicData.includes(hex), false, `${field} leaked into public data`);
      assert.equal(serialize(results.map(r => r.proofData.privateTranscriptOutputs)).includes(hex), true,
        `${field} was not actually supplied as a witness`);
    }
    assert.equal(publicData.includes(Buffer.from(f.commitment).toString('hex')), true);
    assert.equal(publicData.includes(Buffer.from(f.issuerId).toString('hex')), true);
  });

  it('fails clearly when required witness material is missing', () => {
    const f = fixture(); f.issue();
    assert.throws(() => f.call('verify_credential', [type, scope], {}), /Missing or invalid private state field: secret/);
  });
});
