import assert from 'node:assert/strict';
import test from 'node:test';
import {
  profileFromDocument,
  shouldRecoverScoutingOwner,
  type OpsProfile,
} from '../lib/ops-profile.ts';

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

const roster: OpsProfile[] = [
  {
    uid: 'coach-1',
    email: 'coach@team401.org',
    displayName: 'Coach',
    role: 'coach',
  },
  {
    uid: 'student-1',
    email: 'student@team401.org',
    displayName: 'Student',
    role: 'student',
  },
];

void test('allows an Ops coach to recover an unlinked scouting owner', () => {
  assert.equal(shouldRecoverScoutingOwner(null, roster, 'coach-1'), true);
});

void test('does not let a student recover scouting ownership', () => {
  assert.equal(shouldRecoverScoutingOwner(null, roster, 'student-1'), false);
});

void test('allows a coach to recover ownership from a non-coach owner', () => {
  assert.equal(
    shouldRecoverScoutingOwner('student-1', roster, 'coach-1'),
    true,
  );
});

void test('does not replace an owner who is already an Ops coach', () => {
  assert.equal(
    shouldRecoverScoutingOwner('coach-1', roster, 'student-1'),
    false,
  );
});
