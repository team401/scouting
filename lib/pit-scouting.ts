type PitReportFields = {
  drivetrain?: unknown;
  swerveModule?: unknown;
  motorTypes?: unknown;
  weightLbs?: unknown;
  fuelCapacity?: unknown;
  climbCapability?: unknown;
  fieldAccess?: unknown;
  fieldAccessPreference?: unknown;
  shooterMount?: unknown;
  shooterBarrels?: unknown;
  adjustableHood?: unknown;
  autonomousStart?: unknown;
  autonomousSwipe?: unknown;
  autonomousDepot?: unknown;
  autonomousOutpost?: unknown;
  autonomousNotes?: unknown;
  notes?: unknown;
};

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPitReportComplete(report: PitReportFields) {
  const hasMotorTypes = Array.isArray(report.motorTypes)
    ? report.motorTypes.some(hasText)
    : hasText(report.motorTypes);

  return Boolean(
    hasText(report.drivetrain) &&
    (report.drivetrain !== 'Swerve' || hasText(report.swerveModule)) &&
    hasMotorTypes &&
    typeof report.weightLbs === 'number' &&
    report.weightLbs > 0 &&
    typeof report.fuelCapacity === 'number' &&
    report.fuelCapacity >= 0 &&
    hasText(report.climbCapability) &&
    hasText(report.fieldAccess) &&
    hasText(report.fieldAccessPreference) &&
    hasText(report.shooterMount) &&
    hasText(report.shooterBarrels) &&
    typeof report.adjustableHood === 'boolean' &&
    Array.isArray(report.autonomousStart) &&
    report.autonomousStart.length > 0 &&
    Array.isArray(report.autonomousSwipe) &&
    report.autonomousSwipe.length > 0 &&
    typeof report.autonomousDepot === 'boolean' &&
    typeof report.autonomousOutpost === 'boolean',
  );
}
