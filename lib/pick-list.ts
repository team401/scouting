export type PickTier = 'first' | 'second' | 'do-not-pick';

export type PickListEntry = {
  teamNumber: number;
  note: string;
  tier: PickTier;
  avoid: boolean;
};

export type AllianceSelection = {
  teamNumber: number;
  allianceNumber: number;
};

export type UnavailableTeam = {
  teamNumber: number;
  reason: 'declined' | 'ineligible';
};

export type PickListData = {
  entries: PickListEntry[];
  selections: AllianceSelection[];
  unavailable?: UnavailableTeam[];
};

export type ConsensusEntry = {
  teamNumber: number;
  averageRank: number;
  ballots: number;
};

export const emptyPickList: PickListData = {
  entries: [],
  selections: [],
  unavailable: [],
};

export function nextAllianceAfterSelection(
  allianceNumber: number,
  previousPickCount: number,
  allianceCount = 8,
) {
  if (previousPickCount === 0)
    return allianceNumber < allianceCount ? allianceNumber + 1 : 1;
  if (previousPickCount === 1)
    return allianceNumber < allianceCount ? allianceNumber + 1 : allianceCount;
  return allianceNumber > 1 ? allianceNumber - 1 : 1;
}

export function nextAllianceSlot(pickCount: number) {
  return ['Captain', 'First pick', 'Second pick'][pickCount] ?? 'Complete';
}

export function buildConsensus(lists: PickListData[]): ConsensusEntry[] {
  const ranks = new Map<number, number[]>();
  for (const list of lists) {
    list.entries.forEach((entry, index) => {
      if (entry.avoid || entry.tier === 'do-not-pick') return;
      ranks.set(entry.teamNumber, [
        ...(ranks.get(entry.teamNumber) ?? []),
        index + 1,
      ]);
    });
  }
  return [...ranks.entries()]
    .map(([teamNumber, values]) => ({
      teamNumber,
      averageRank: values.reduce((sum, rank) => sum + rank, 0) / values.length,
      ballots: values.length,
    }))
    .sort(
      (a, b) => a.averageRank - b.averageRank || a.teamNumber - b.teamNumber,
    );
}
