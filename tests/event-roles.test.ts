import assert from 'node:assert/strict';
import test from 'node:test';
import { assignableEventRoles, eventRoleNames } from '../lib/event-roles.ts';

void test('generic Scouting remains compatible but is not assignable', () => {
  assert.equal(eventRoleNames.includes('Scouting'), true);
  assert.equal(
    assignableEventRoles.some(([name]) => name === 'Scouting'),
    false,
  );
});
