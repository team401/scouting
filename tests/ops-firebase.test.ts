import assert from 'node:assert/strict';
import test from 'node:test';
import { profileFromDocument } from '../lib/ops-profile.ts';

void test('parses an Ops Firestore user profile', () => {
  assert.deepEqual(
    profileFromDocument({
      name: 'projects/team401/databases/(default)/documents/users/firebase-1',
      fields: {
        email: { stringValue: ' Scout@Team401.org ' },
        displayName: { stringValue: 'Scout One' },
        role: { stringValue: 'student' },
      },
    }),
    {
      uid: 'firebase-1',
      email: 'scout@team401.org',
      displayName: 'Scout One',
      role: 'student',
    },
  );
});

void test('rejects an Ops profile without an email', () => {
  assert.equal(
    profileFromDocument({
      name: 'projects/team401/databases/(default)/documents/users/firebase-1',
      fields: { displayName: { stringValue: 'Scout One' } },
    }),
    null,
  );
});

void test('uses the email prefix when an Ops display name is missing', () => {
  assert.equal(
    profileFromDocument({
      name: 'projects/team401/databases/(default)/documents/users/firebase-2',
      fields: { email: { stringValue: 'scout.two@team401.org' } },
    })?.displayName,
    'scout.two',
  );
});
