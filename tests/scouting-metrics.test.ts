import assert from 'node:assert/strict';
import test from 'node:test';
import { median, observedPoints, summarizeEntries } from '../lib/scouting-metrics.ts';

test('calculates observed REBUILT points', () => {
  assert.equal(observedPoints({ autoFuel: 5, activeFuel: 30, inactiveFuel: 9, cycles: 4, autoTower: 'Level 1', tower: 'Level 2', path: 'Both' }), 70);
});

test('calculates median for odd and even samples', () => {
  assert.equal(median([9, 2, 5]), 5);
  assert.equal(median([2, 4, 8, 10]), 6);
  assert.equal(median([]), 0);
});

test('excludes no-shows from performance aggregates', () => {
  const summary = summarizeEntries([
    { autoFuel: 5, activeFuel: 20, inactiveFuel: 0, cycles: 4, autoTower: 'None', tower: 'Level 1', path: 'Trench' },
    { autoFuel: 0, activeFuel: 0, inactiveFuel: 0, cycles: 0, autoTower: 'None', tower: 'None', path: 'Trench', noShow: true },
  ]);
  assert.equal(summary.samples, 2);
  assert.equal(summary.medianActiveFuel, 20);
  assert.equal(summary.towerSuccessRate, 1);
  assert.equal(summary.averageDefense, 0);
  assert.equal(summary.pointStdDev, 0);
});
