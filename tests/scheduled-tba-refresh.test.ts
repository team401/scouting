import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRefreshTbaEvent } from '../lib/scheduled-tba-refresh-policy.ts';

const hour = 60 * 60 * 1000;

void test('refreshes frequently during the event window', () => {
  const now = new Date('2026-04-03T12:00:00Z').getTime();
  assert.equal(
    shouldRefreshTbaEvent(
      {
        startDate: '2026-04-04',
        endDate: '2026-04-06',
        updatedAt: now - hour,
      },
      now,
    ),
    true,
  );
});

void test('limits refreshes to every six hours outside the event window', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime();
  const event = {
    startDate: '2026-04-04',
    endDate: '2026-04-06',
    updatedAt: now - hour,
  };
  assert.equal(shouldRefreshTbaEvent(event, now), false);
  assert.equal(
    shouldRefreshTbaEvent({ ...event, updatedAt: now - 6 * hour }, now),
    true,
  );
});

void test('events without dates still receive an idle refresh', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime();
  assert.equal(
    shouldRefreshTbaEvent(
      { startDate: null, endDate: null, updatedAt: now - 6 * hour },
      now,
    ),
    true,
  );
});
