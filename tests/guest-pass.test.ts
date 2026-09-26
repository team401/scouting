import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGuestPassCode,
  hashGuestPassCode,
  normalizeGuestPassCode,
} from '../lib/guest-pass.ts';

void test('creates a readable high-entropy Team 401 guest pass', () => {
  assert.match(createGuestPassCode(), /^401-[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/);
});

void test('normalizes guest passes before hashing', async () => {
  assert.equal(normalizeGuestPassCode(' 401-abcd '), '401-ABCD');
  assert.equal(
    await hashGuestPassCode('401-abcd'),
    await hashGuestPassCode(' 401-ABCD '),
  );
});
