// Shared drive team rules. Kept free of imports so the node test runner can
// load it directly.

// Column order matches the drive team sheet: Driver, Operator, Human Player,
// Technician, Coach.
export const drivePositions = [
  { key: 'driverUserId', label: 'Driver' },
  { key: 'operatorUserId', label: 'Operator' },
  { key: 'humanPlayerUserId', label: 'Human Player' },
  { key: 'technicianUserId', label: 'Technician' },
  { key: 'coachUserId', label: 'Coach' },
] as const;

export type DrivePositionKey = (typeof drivePositions)[number]['key'];

export type DriveTeamSlotMembers = Record<DrivePositionKey, string | null>;

// Qualification rows are numbered; playoff rows are a separate block.
export const drivePhases = ['qual', 'playoff'] as const;
export type DrivePhase = (typeof drivePhases)[number];

export const maxExpectedMatches = 200;

export function emptyDriveTeamMembers(): DriveTeamSlotMembers {
  return {
    driverUserId: null,
    operatorUserId: null,
    humanPlayerUserId: null,
    technicianUserId: null,
    coachUserId: null,
  };
}

// A person may hold only one position in a single planned match.
export function hasDuplicateDriveMember(members: DriveTeamSlotMembers) {
  const ids = Object.values(members).filter((id): id is string => Boolean(id));
  return new Set(ids).size !== ids.length;
}

// Coaches fill the Technician and Coach positions. Students drive, operate,
// and play human player, so coaches are not eligible for those.
export function canFillDrivePosition(
  key: DrivePositionKey,
  opsRole: string | null | undefined,
) {
  const coach = opsRole === 'coach';
  if (key === 'coachUserId') return coach;
  if (key === 'technicianUserId') return true;
  return !coach;
}

// Planned match N is the Nth match counted from startMatchNumber. Returns the
// matching official match id, or null when that number is not in the schedule.
export function matchForSlot(
  slotNumber: number,
  startMatchNumber: number,
  officialMatches: ReadonlyArray<{ id: string; matchNumber: number }>,
) {
  const target = startMatchNumber + slotNumber - 1;
  return (
    officialMatches.find((match) => match.matchNumber === target)?.id ?? null
  );
}

// Returns the match id for every planned slot, in slot order.
export function mapSlotsToMatches(
  slotNumbers: readonly number[],
  startMatchNumber: number,
  officialMatches: ReadonlyArray<{ id: string; matchNumber: number }>,
) {
  return slotNumbers.map((slotNumber) => ({
    slotNumber,
    matchId: matchForSlot(slotNumber, startMatchNumber, officialMatches),
  }));
}

export function matchLabel(
  matchNumber: number | null,
  compLevel: string | null,
) {
  if (matchNumber === null) return 'Not released yet';
  return compLevel && compLevel !== 'qm'
    ? `${compLevel.toUpperCase()} ${matchNumber}`
    : `Quals ${matchNumber}`;
}

export function plannedLabel(phase: DrivePhase, slotNumber: number) {
  return phase === 'playoff'
    ? `Planned playoff ${slotNumber}`
    : `Planned match ${slotNumber}`;
}
