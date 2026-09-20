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

export type PickListData = {
  entries: PickListEntry[];
  selections: AllianceSelection[];
};

export type ConsensusEntry = {
  teamNumber: number;
  averageRank: number;
  ballots: number;
};

export const emptyPickList: PickListData = { entries: [], selections: [] };

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
