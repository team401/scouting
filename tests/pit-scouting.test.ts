import assert from 'node:assert/strict';
import test from 'node:test';
import { isPitReportComplete } from '../lib/pit-scouting.ts';

const completeReport = {
  drivetrain: 'Swerve',
  swerveModule: 'MK4i',
  motorTypes: 'Kraken X60',
  weightLbs: 120,
  fuelCapacity: 0,
  climbCapability: 'None',
  fieldAccess: 'Both',
  fieldAccessPreference: 'No preference',
  shooterMount: 'Fixed',
  shooterBarrels: '1',
  adjustableHood: false,
  autonomousStart: ['Unknown'],
  autonomousSwipe: ['None'],
  autonomousDepot: false,
  autonomousOutpost: false,
};

void test('pit reports are complete when every non-notes field is filled', () => {
  assert.equal(isPitReportComplete(completeReport), true);
  assert.equal(
    isPitReportComplete({
      ...completeReport,
      notes: '',
      autonomousNotes: '',
    }),
    true,
  );
});

void test('blank required pit fields keep a report in progress', () => {
  assert.equal(
    isPitReportComplete({ ...completeReport, weightLbs: null }),
    false,
  );
  assert.equal(
    isPitReportComplete({ ...completeReport, fuelCapacity: null }),
    false,
  );
  assert.equal(
    isPitReportComplete({ ...completeReport, motorTypes: '' }),
    false,
  );
  assert.equal(
    isPitReportComplete({ ...completeReport, swerveModule: '' }),
    false,
  );
});

void test('non-swerve drivetrains do not require a swerve module', () => {
  assert.equal(
    isPitReportComplete({
      ...completeReport,
      drivetrain: 'Tank',
      swerveModule: '',
      motorTypes: ['NEO'],
    }),
    true,
  );
});
