import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLocalProver } from '../src/lib/prover.ts';

test('prover preflight contacts only loopback and sends no credential payload', async () => {
  await checkLocalProver(async (url, options) => {
    assert.equal(url.href, 'http://127.0.0.1:6300/version');
    assert.equal(options.body, undefined);
    assert.ok(options.signal);
    return new Response('midnight-proof-server 8.1.0');
  });
});
test('prover preflight rejects an unhealthy service or incompatible version', async () => {
  await assert.rejects(checkLocalProver(async () => new Response('', { status: 503 })), /not ready/);
  await assert.rejects(checkLocalProver(async () => new Response('7.0.0')), /wrong version/);
});
test('blocked or timed-out prover requests show actionable instructions without raw errors', async () => {
  await assert.rejects(checkLocalProver(async () => { throw new Error('private diagnostic'); }), error => {
    assert.match(error.message, /localhostAccess/);
    assert.ok(!error.message.includes('private diagnostic'));
    return true;
  });
});
