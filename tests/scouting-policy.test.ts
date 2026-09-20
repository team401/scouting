import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageAssignments, canOverwriteLockedEntry, canReopenEntries, scoutEntryMutationId, teamNumberFromTbaKey } from '../lib/scouting-policy.ts';

test('enforces assignment and reopening roles', () => {
  assert.equal(canManageAssignments('owner'), true);
  assert.equal(canManageAssignments('admin'), true);
  assert.equal(canManageAssignments('strategy'), false);
  assert.equal(canReopenEntries('strategy'), true);
  assert.equal(canReopenEntries('scout'), false);
});

test('only privileged users or reopened records can overwrite a locked entry', () => {
  assert.equal(canOverwriteLockedEntry('scout', false), false);
  assert.equal(canOverwriteLockedEntry('scout', true), true);
  assert.equal(canOverwriteLockedEntry('admin', false), true);
});

test('rejects malformed TBA team keys', () => {
  assert.equal(teamNumberFromTbaKey('frc401'), 401);
  assert.equal(teamNumberFromTbaKey('401'), null);
  assert.equal(teamNumberFromTbaKey('frcNaN'), null);
});

test('builds deterministic mutation identifiers', () => {
  const first = scoutEntryMutationId('2026vabla', '2026vabla_qm1', 401, 'user-1');
  const second = scoutEntryMutationId('2026vabla', '2026vabla_qm1', 401, 'user-1');
  assert.equal(first, second);
});
