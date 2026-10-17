import assert from 'node:assert/strict';
import test from 'node:test';
import {
  eventLocalTime,
  normalizeQualificationSchedule,
} from '../lib/frc-events.ts';

void test('converts FIRST event-local schedule times with the event timezone', () => {
  assert.equal(
    eventLocalTime('2026-10-17T11:55:00', 'America/New_York'),
    Date.parse('2026-10-17T15:55:00Z'),
  );
});

void test('normalizes a FIRST qualification schedule to TBA-compatible matches', () => {
  const matches = normalizeQualificationSchedule(
    '2026mdbob',
    'America/New_York',
    {
      Schedule: [
        {
          matchNumber: 5,
          startTime: '2026-10-17T11:55:00',
          teams: [
            { teamNumber: 401, station: 'Blue2' },
            { teamNumber: 1727, station: 'Red1' },
            { teamNumber: 836, station: 'Red2' },
            { teamNumber: 686, station: 'Blue1' },
          ],
        },
      ],
    },
  );
  assert.equal(matches[0].key, '2026mdbob_qm5');
  assert.deepEqual(matches[0].alliances.red.team_keys, ['frc1727', 'frc836']);
  assert.deepEqual(matches[0].alliances.blue.team_keys, ['frc686', 'frc401']);
  assert.equal(matches[0].time, Date.parse('2026-10-17T15:55:00Z'));
});
