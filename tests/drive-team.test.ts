import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canFillDrivePosition,
  drivePositions,
  emptyDriveTeamMembers,
  hasDuplicateDriveMember,
  mapSlotsToMatches,
  matchForSlot,
  matchLabel,
  plannedLabel,
} from '../lib/drive-team.ts';

const officialMatches = [
  { id: 'qm-10', matchNumber: 10 },
  { id: 'qm-11', matchNumber: 11 },
  { id: 'qm-12', matchNumber: 12 },
];

void test('planned slots map onto official match numbers from the start number', () => {
  assert.deepEqual(mapSlotsToMatches([1, 2, 3], 10, officialMatches), [
    { slotNumber: 1, matchId: 'qm-10' },
    { slotNumber: 2, matchId: 'qm-11' },
    { slotNumber: 3, matchId: 'qm-12' },
  ]);
});

void test('slots past the released schedule stay unmapped', () => {
  assert.deepEqual(mapSlotsToMatches([3, 4], 10, officialMatches), [
    { slotNumber: 3, matchId: 'qm-12' },
    { slotNumber: 4, matchId: null },
  ]);
  assert.equal(matchForSlot(1, 20, officialMatches), null);
});

void test('a start number before the first released match leaves early slots unmapped', () => {
  assert.equal(matchForSlot(1, 1, officialMatches), null);
  assert.equal(matchForSlot(3, 1, officialMatches), null);
});

void test('positions follow the drive team sheet order and include Coach', () => {
  assert.deepEqual(
    drivePositions.map((position) => position.label),
    ['Driver', 'Operator', 'Human Player', 'Technician', 'Coach'],
  );
});

void test('duplicate people in one planned match are detected, including the coach slot', () => {
  const members = emptyDriveTeamMembers();
  members.driverUserId = 'ana';
  members.operatorUserId = 'ben';
  assert.equal(hasDuplicateDriveMember(members), false);
  members.coachUserId = 'ana';
  assert.equal(hasDuplicateDriveMember(members), true);
});

void test('empty positions never count as duplicates', () => {
  assert.equal(hasDuplicateDriveMember(emptyDriveTeamMembers()), false);
});

void test('coaches fill the Technician and Coach positions only', () => {
  assert.equal(canFillDrivePosition('coachUserId', 'coach'), true);
  assert.equal(canFillDrivePosition('technicianUserId', 'coach'), true);
  for (const key of [
    'driverUserId',
    'operatorUserId',
    'humanPlayerUserId',
  ] as const)
    assert.equal(canFillDrivePosition(key, 'coach'), false);
});

void test('students fill driving positions and technician, not coach', () => {
  for (const opsRole of [null, undefined, 'student']) {
    assert.equal(canFillDrivePosition('coachUserId', opsRole), false);
    assert.equal(canFillDrivePosition('technicianUserId', opsRole), true);
    assert.equal(canFillDrivePosition('driverUserId', opsRole), true);
    assert.equal(canFillDrivePosition('humanPlayerUserId', opsRole), true);
  }
});

void test('match labels describe qualification and playoff matches', () => {
  assert.equal(matchLabel(null, null), 'Not released yet');
  assert.equal(matchLabel(12, 'qm'), 'Quals 12');
  assert.equal(matchLabel(2, 'sf'), 'SF 2');
});

void test('planned labels distinguish quals from playoffs', () => {
  assert.equal(plannedLabel('qual', 4), 'Planned match 4');
  assert.equal(plannedLabel('playoff', 2), 'Planned playoff 2');
});
