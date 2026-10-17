import assert from 'node:assert/strict';
import test from 'node:test';
import {
  autoMapDriveTeamMatches,
  canFillDrivePosition,
  drivePositionClasses,
  drivePositionClassForLabel,
  drivePositions,
  defaultPlayoffMatches,
  emptyDriveTeamMembers,
  hasDuplicateDriveMember,
  matchLabel,
  plannedLabel,
  requiresEventRosterForDriveTeam,
  teamMatchesInOrder,
  teamNumbersInAlliances,
  type ScheduleMatch,
} from '../lib/drive-team.ts';

function alliances(red: string[], blue: string[]) {
  return JSON.stringify({
    red: { team_keys: red },
    blue: { team_keys: blue },
  });
}

function match(
  id: string,
  compLevel: string,
  matchNumber: number,
  red: string[],
  blue: string[] = ['frc1', 'frc2', 'frc3'],
): ScheduleMatch {
  return { id, compLevel, matchNumber, alliances: alliances(red, blue) };
}

const us = 'frc401';
const schedule: ScheduleMatch[] = [
  match('qm-3', 'qm', 3, ['frc401', 'frc10', 'frc11']),
  match('qm-1', 'qm', 1, ['frc5', 'frc6', 'frc7'], ['frc401', 'frc8', 'frc9']),
  match(
    'qm-2',
    'qm',
    2,
    ['frc20', 'frc21', 'frc22'],
    ['frc23', 'frc24', 'frc25'],
  ),
  match(
    'qm-4',
    'qm',
    4,
    ['frc30', 'frc31', 'frc32'],
    ['frc33', 'frc34', 'frc35'],
  ),
  match(
    'qf-2',
    'qf',
    2,
    ['frc40', 'frc41', 'frc42'],
    ['frc401', 'frc43', 'frc44'],
  ),
  match(
    'sf-1',
    'sf',
    1,
    ['frc401', 'frc50', 'frc51'],
    ['frc52', 'frc53', 'frc54'],
  ),
  match(
    'f-1',
    'f',
    1,
    ['frc60', 'frc61', 'frc62'],
    ['frc401', 'frc63', 'frc64'],
  ),
];

const teamNumber = Number(us.slice(3));

void test('alliance team keys parse to team numbers from both sides', () => {
  assert.deepEqual(
    teamNumbersInAlliances(alliances(['frc401', 'frc10'], ['frc7', 'frc8'])),
    [401, 10, 7, 8],
  );
});

void test('malformed alliances and non-FRC keys are ignored', () => {
  assert.deepEqual(teamNumbersInAlliances('not json'), []);
  assert.deepEqual(teamNumbersInAlliances('null'), []);
  assert.deepEqual(
    teamNumbersInAlliances(
      JSON.stringify({ red: { team_keys: ['2024frc401', 'frcx', 12] } }),
    ),
    [],
  );
});

void test('our matches are ordered: quals by number, playoffs by round', () => {
  const { quals, playoffs } = teamMatchesInOrder(schedule, teamNumber);
  assert.deepEqual(
    quals.map((item) => item.id),
    ['qm-1', 'qm-3'],
  );
  assert.deepEqual(
    playoffs.map((item) => item.id),
    ['qf-2', 'sf-1', 'f-1'],
  );
});

void test("planned qualification rows map to our team's qualification matches in order", () => {
  const mapped = autoMapDriveTeamMatches(
    [
      { phase: 'qual', slotNumber: 1 },
      { phase: 'qual', slotNumber: 2 },
      { phase: 'qual', slotNumber: 3 },
    ],
    schedule,
    teamNumber,
  );
  assert.equal(mapped.get('qual:1')?.id, 'qm-1');
  assert.equal(mapped.get('qual:2')?.id, 'qm-3');
  assert.equal(mapped.get('qual:3') ?? null, null);
});

void test('planned playoff rows map to our playoff matches in round order', () => {
  const mapped = autoMapDriveTeamMatches(
    [
      { phase: 'playoff', slotNumber: 1 },
      { phase: 'playoff', slotNumber: 2 },
      { phase: 'playoff', slotNumber: 3 },
      { phase: 'playoff', slotNumber: 4 },
    ],
    schedule,
    teamNumber,
  );
  assert.equal(mapped.get('playoff:1')?.id, 'qf-2');
  assert.equal(mapped.get('playoff:2')?.id, 'sf-1');
  assert.equal(mapped.get('playoff:3')?.id, 'f-1');
  assert.equal(mapped.get('playoff:4') ?? null, null);
});

void test('rows stay unmapped until the schedule is released or without our team number', () => {
  const rows = [{ phase: 'qual' as const, slotNumber: 1 }];
  assert.equal(
    autoMapDriveTeamMatches(rows, [], teamNumber).get('qual:1') ?? null,
    null,
  );
  assert.equal(
    autoMapDriveTeamMatches(rows, schedule, null).get('qual:1') ?? null,
    null,
  );
});

void test('positions follow the drive team sheet order and include Coach', () => {
  assert.deepEqual(
    drivePositions.map((position) => position.label),
    ['Driver', 'Operator', 'Human Player', 'Technician', 'Coach'],
  );
});

void test('personal schedules reuse each drive position color', () => {
  for (const position of drivePositions) {
    assert.equal(
      drivePositionClassForLabel(position.label),
      drivePositionClasses[position.key],
    );
  }

  assert.match(drivePositionClassForLabel('Unknown position'), /purple/);
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

void test('Technician and Coach accept coaches and all students', () => {
  for (const key of ['technicianUserId', 'coachUserId'] as const)
    for (const opsRole of ['coach', 'student', null, undefined])
      assert.equal(canFillDrivePosition(key, opsRole), true);
});

void test('Driver, Operator, and Human Player exclude coaches', () => {
  for (const key of [
    'driverUserId',
    'operatorUserId',
    'humanPlayerUserId',
  ] as const) {
    assert.equal(canFillDrivePosition(key, 'coach'), false);
    assert.equal(canFillDrivePosition(key, 'student'), true);
    assert.equal(canFillDrivePosition(key, null), true);
  }
});

void test('only students must belong to the Event Roster for drive teams', () => {
  assert.equal(requiresEventRosterForDriveTeam('coach'), false);
  assert.equal(requiresEventRosterForDriveTeam('student'), true);
  assert.equal(requiresEventRosterForDriveTeam(null), true);
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

void test('drive team planning always reserves six playoff matches', () => {
  assert.equal(defaultPlayoffMatches, 6);
});
