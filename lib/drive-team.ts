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

// Technician and Coach are open to coaches and all students. Driver, Operator,
// and Human Player are student positions, so coaches cannot fill them.
export function canFillDrivePosition(
  key: DrivePositionKey,
  opsRole: string | null | undefined,
) {
  if (key === 'technicianUserId' || key === 'coachUserId') return true;
  return opsRole !== 'coach';
}

// The Event Roster tracks attending students. Ops coaches are intentionally
// excluded from it, but can still serve as Technician or Coach on a drive team.
export function requiresEventRosterForDriveTeam(
  opsRole: string | null | undefined,
) {
  return opsRole !== 'coach';
}

// A match as stored from the event schedule. `alliances` is the JSON text of
// the alliances column: { red: { team_keys }, blue: { team_keys } }.
export type ScheduleMatch = {
  id: string;
  compLevel: string;
  matchNumber: number;
  alliances: string;
};

export type OfficialMatch = ScheduleMatch;

// Team numbers in a match's alliances. Malformed JSON yields no teams.
export function teamNumbersInAlliances(alliances: string): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(alliances);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  return Object.values(parsed).flatMap((side) => {
    const keys = (side as { team_keys?: unknown } | null)?.team_keys;
    if (!Array.isArray(keys)) return [];
    return keys.flatMap((key) => {
      const match = typeof key === 'string' ? /^frc(\d+)$/.exec(key) : null;
      return match ? [Number(match[1])] : [];
    });
  });
}

const playoffOrder: Record<string, number> = { ef: 0, qf: 1, sf: 2, f: 3 };

// Our team's matches for one level, in play order: qualifications by match
// number, playoffs by round and then match number.
export function teamMatchesInOrder<T extends ScheduleMatch>(
  matches: readonly T[],
  teamNumber: number,
): { quals: T[]; playoffs: T[] } {
  const ours = matches.filter((match) =>
    teamNumbersInAlliances(match.alliances).includes(teamNumber),
  );
  const quals = ours
    .filter((match) => match.compLevel === 'qm')
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const playoffs = ours
    .filter((match) => match.compLevel !== 'qm')
    .sort(
      (a, b) =>
        (playoffOrder[a.compLevel] ?? 99) - (playoffOrder[b.compLevel] ?? 99) ||
        a.matchNumber - b.matchNumber,
    );
  return { quals, playoffs };
}

// Planned row k of a phase is our team's kth match in that phase. Returns the
// official match for each row keyed by `${phase}:${slotNumber}`, or null when
// the schedule does not have that match yet.
export function autoMapDriveTeamMatches<T extends ScheduleMatch>(
  slots: ReadonlyArray<{ phase: DrivePhase; slotNumber: number }>,
  matches: readonly T[],
  teamNumber: number | null,
) {
  const mapped = new Map<string, T | null>();
  const ours: { quals: T[]; playoffs: T[] } =
    teamNumber === null
      ? { quals: [], playoffs: [] }
      : teamMatchesInOrder(matches, teamNumber);
  for (const slot of slots) {
    const list = slot.phase === 'qual' ? ours.quals : ours.playoffs;
    mapped.set(
      `${slot.phase}:${slot.slotNumber}`,
      list[slot.slotNumber - 1] ?? null,
    );
  }
  return mapped;
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
