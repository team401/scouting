import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeCoverageTargets,
  coverageCount,
  coverageTargets,
  roleEnabled,
  summarizeShifts,
  type CoverageItem,
  type EventControls,
} from '../lib/event-coverage.ts';

const allOn: EventControls = { scoutingEnabled: true, outreachEnabled: true };
const scoutingOff: EventControls = { ...allOn, scoutingEnabled: false };
const outreachOff: EventControls = { ...allOn, outreachEnabled: false };

void test('outreach roles follow the outreach control', () => {
  assert.equal(roleEnabled('Pit Outreach', allOn), true);
  assert.equal(roleEnabled('Pit Outreach', outreachOff), false);
  assert.equal(roleEnabled('Pit Outreach', scoutingOff), true);
});

void test('scouting roles follow the scouting control, Pit Scouting stays available', () => {
  for (const role of ['Scouting', 'Scouting Lead']) {
    assert.equal(roleEnabled(role, allOn), true);
    assert.equal(roleEnabled(role, scoutingOff), false);
  }
  assert.equal(roleEnabled('Pit Scouting', scoutingOff), true);
  assert.equal(roleEnabled('Pit Crew', scoutingOff), true);
});

void test('all eight coverage targets apply when both controls are on', () => {
  assert.equal(activeCoverageTargets(allOn).length, coverageTargets.length);
  assert.equal(coverageTargets.length, 8);
});

void test('scouting targets disappear when scouting is off, not counted as missing', () => {
  const labels = activeCoverageTargets(scoutingOff).map(
    (target) => target.label,
  );
  assert.equal(labels.includes('Red scouts'), false);
  assert.equal(labels.includes('Blue scouts'), false);
  assert.equal(labels.includes('Scouting Lead'), false);
  assert.equal(labels.includes('Pit Outreach'), true);
});

void test('outreach target disappears when outreach is off', () => {
  const labels = activeCoverageTargets(outreachOff).map(
    (target) => target.label,
  );
  assert.equal(labels.includes('Pit Outreach'), false);
  assert.equal(labels.includes('Red scouts'), true);
});

void test('counts red and blue station coverage separately', () => {
  const items: CoverageItem[] = [
    { kind: 'scouting', label: 'Red 1' },
    { kind: 'scouting', label: 'Red 2' },
    { kind: 'scouting', label: 'Blue 3' },
    { kind: 'role', label: 'Pit Crew' },
  ];
  const byLabel = Object.fromEntries(
    coverageTargets.map((target) => [
      target.label,
      coverageCount(target, items),
    ]),
  );
  assert.equal(byLabel['Red scouts'], 2);
  assert.equal(byLabel['Blue scouts'], 1);
  assert.equal(byLabel['Pit Crew'], 1);
  assert.equal(byLabel['Pit Lead'], 0);
});

void test('summarizes scouting, pit, and total roles', () => {
  const items: CoverageItem[] = [
    { kind: 'scouting', label: 'Red 1' },
    { kind: 'scouting', label: 'Blue 2' },
    { kind: 'role', label: 'Pit Crew' },
    { kind: 'role', label: 'Pit Outreach' },
    { kind: 'role', label: 'Pit Scouting' },
    { kind: 'role', label: 'Team Media' },
  ];
  assert.deepEqual(summarizeShifts(items), { scouting: 2, pit: 2, total: 6 });
});
