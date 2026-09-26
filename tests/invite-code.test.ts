import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INVITE_CODE_PBKDF2_ITERATIONS,
  decryptInviteCode,
  encryptInviteCode,
  hashInviteCode,
  verifyInviteCode,
} from '../lib/invite-code.ts';

void test('uses a PBKDF2 iteration count supported by Cloudflare Workers', () => {
  assert.equal(INVITE_CODE_PBKDF2_ITERATIONS, 100_000);
});

void test('hashes invite codes for validation', async () => {
  const result = await hashInviteCode('team-401-join');
  assert.equal(
    await verifyInviteCode('team-401-join', result.hash, result.salt),
    true,
  );
  assert.equal(
    await verifyInviteCode('wrong-code', result.hash, result.salt),
    false,
  );
});

void test('encrypts invite codes for authorized recovery', async () => {
  const result = await encryptInviteCode(
    'team-401-join',
    'a-test-secret-that-is-long-enough',
    'team-401',
  );
  assert.equal(
    await decryptInviteCode(
      result.encrypted,
      result.iv,
      'a-test-secret-that-is-long-enough',
      'team-401',
    ),
    'team-401-join',
  );
  await assert.rejects(() =>
    decryptInviteCode(
      result.encrypted,
      result.iv,
      'a-test-secret-that-is-long-enough',
      'another-team',
    ),
  );
});
