import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConsensus, type PickListData } from '../lib/pick-list.ts';

const list = (teams: number[]): PickListData => ({
  entries: teams.map((teamNumber) => ({
    teamNumber,
    note: '',
    tier: 'first',
    avoid: false,
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

void test('excludes avoided and do-not-pick teams from consensus', () => {
  const ballot = list([401, 254, 111]);
  ballot.entries[0].avoid = true;
  ballot.entries[1].tier = 'do-not-pick';
  assert.deepEqual(
    buildConsensus([ballot]).map((entry) => entry.teamNumber),
    [111],
  );
});
