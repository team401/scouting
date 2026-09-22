import assert from 'node:assert/strict';
import test from 'node:test';
import { shiftCoversMatch } from '../lib/shift-scheduling.ts';

void test('uses a predicted match time when one is available', () => {
  const shift = { startsAt: 100, endsAt: 200 };
  assert.equal(
    shiftCoversMatch(shift, { scheduledAt: 250, predictedAt: 150 }),
    true,
  );
});

void test('falls back to scheduled time and treats the end as exclusive', () => {
  const shift = { startsAt: 100, endsAt: 200 };
  assert.equal(
    shiftCoversMatch(shift, { scheduledAt: 100, predictedAt: null }),
    true,
  );
  assert.equal(
    shiftCoversMatch(shift, { scheduledAt: 200, predictedAt: null }),
    false,
  );
});

void test('does not assign a match without a known time', () => {
  assert.equal(
    shiftCoversMatch(
      { startsAt: 100, endsAt: 200 },
      { scheduledAt: null, predictedAt: null },
    ),
    false,
  );
});
