import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConsensus,
  nextAllianceAfterSelection,
  nextAlliancePick,
  nextAllianceSlot,
  type PickListData,
} from '../lib/pick-list.ts';

const list = (teams: number[]): PickListData => ({
  entries: teams.map((teamNumber) => ({
    teamNumber,
    note: '',
    tier: 'first',
  })),
  selections: [],
});

void test('builds consensus from average personal rank', () => {
  const result = buildConsensus([list([401, 254, 111]), list([254, 401, 111])]);
  assert.deepEqual(
    result.map((entry) => entry.teamNumber),
    [254, 401, 111],
  );
  assert.equal(result[0].averageRank, 1.5);
  assert.equal(result[0].ballots, 2);
});

void test('excludes do-not-pick teams from consensus', () => {
  const ballot = list([401, 254, 111]);
  ballot.entries[0].tier = 'do-not-pick';
  assert.deepEqual(
    buildConsensus([ballot]).map((entry) => entry.teamNumber),
    [254, 111],
  );
});

void test('advances captain and first picks forward, then second picks backward', () => {
  assert.equal(nextAllianceAfterSelection(8, 0), 8);
  assert.equal(nextAllianceAfterSelection(8, 1), 8);
  assert.equal(nextAllianceAfterSelection(8, 2), 7);
  assert.equal(nextAllianceAfterSelection(1, 2), 1);
  assert.equal(nextAllianceSlot(0), 'Captain');
  assert.equal(nextAllianceSlot(3), 'Complete');
});

void test('highlights captain and first pick together before reversing second picks', () => {
  assert.deepEqual(nextAlliancePick([], 2), {
    allianceNumber: 1,
    pickCount: 0,
  });
  assert.deepEqual(
    nextAlliancePick([{ teamNumber: 401, allianceNumber: 1 }], 2),
    { allianceNumber: 1, pickCount: 1 },
  );
  assert.deepEqual(
    nextAlliancePick(
      [
        { teamNumber: 401, allianceNumber: 1 },
        { teamNumber: 422, allianceNumber: 1 },
      ],
      2,
    ),
    { allianceNumber: 2, pickCount: 0 },
  );
  assert.deepEqual(
    nextAlliancePick(
      [
        { teamNumber: 401, allianceNumber: 1 },
        { teamNumber: 422, allianceNumber: 1 },
        { teamNumber: 346, allianceNumber: 2 },
        { teamNumber: 540, allianceNumber: 2 },
      ],
      2,
    ),
    { allianceNumber: 2, pickCount: 2 },
  );
});
