import assert from 'node:assert/strict';
import test from 'node:test';
import { isOffseasonDemoTeam } from '../lib/event-team-aliases.ts';

void test('detects the complete FRC offseason demo-team range', () => {
  assert.equal(isOffseasonDemoTeam(99, 9980), true);
  assert.equal(isOffseasonDemoTeam(99, 9999), true);
});

void test('does not treat regular teams or official events as demo teams', () => {
  assert.equal(isOffseasonDemoTeam(99, 9979), false);
  assert.equal(isOffseasonDemoTeam(99, 10_000), false);
  assert.equal(isOffseasonDemoTeam(0, 9980), false);
  assert.equal(isOffseasonDemoTeam(null, 9980), false);
});
