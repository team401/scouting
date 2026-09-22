import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAllianceScoreOutlier,
  isTeamTrendOutlier,
  median,
} from '../lib/scout-quality.ts';

void test('only compares complete three-robot alliance coverage to TBA', () => {
  assert.equal(isAllianceScoreOutlier(90, 150, 2), false);
  assert.equal(isAllianceScoreOutlier(90, 150, 3), true);
  assert.equal(isAllianceScoreOutlier(130, 150, 3), false);
});

void test('flags large deviations from an established team trend', () => {
  assert.equal(median([40, 60, 50]), 50);
  assert.equal(isTeamTrendOutlier(100, [45, 50]), false);
  assert.equal(isTeamTrendOutlier(100, [45, 50, 55]), true);
});
