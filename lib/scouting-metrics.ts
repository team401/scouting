export type ScoutingPayload = {
  autoFuel: number;
  activeFuel: number;
  centerSwipes?: number;
  passedFuel?: number;
  autoTower: string;
  tower: string;
  path: string;
  defenseRating?: number | null;
  autoStartPosition?: string;
  disabled?: boolean;
  noShow?: boolean;
  penalties?: number;
  shootingRange?: string;
  autoDepot?: boolean;
  autoOutpost?: boolean;
  autoPenalties?: number;
  teleopPenalties?: number;
  notes?: string;
};

export function towerPoints(level: string, autonomous = false) {
  if (autonomous) return level === 'Level 1' ? 15 : 0;
  return level === 'Level 3'
    ? 30
    : level === 'Level 2'
      ? 20
      : level === 'Level 1'
        ? 10
        : 0;
}

export function observedPoints(payload: ScoutingPayload) {
  return (
    payload.autoFuel +
    payload.activeFuel +
    towerPoints(payload.autoTower, true) +
    towerPoints(payload.tower)
  );
}

export function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeEntries(payloads: ScoutingPayload[]) {
  const played = payloads.filter((payload) => !payload.noShow);
  const defenseRatings = played.flatMap((payload) =>
    typeof payload.defenseRating === 'number' ? [payload.defenseRating] : [],
  );
  const points = played.map(observedPoints);
  const towerLevelCounts = {
    level1: played.reduce(
      (count, payload) =>
        count +
        (payload.autoTower === 'Level 1' ? 1 : 0) +
        (payload.tower === 'Level 1' ? 1 : 0),
      0,
    ),
    level2: played.filter((payload) => payload.tower === 'Level 2').length,
    level3: played.filter((payload) => payload.tower === 'Level 3').length,
  };
  const disabledMatches = played.filter((payload) => payload.disabled).length;
  const meanPoints = points.length
    ? points.reduce((sum, value) => sum + value, 0) / points.length
    : 0;
  return {
    samples: payloads.length,
    medianPoints: median(played.map(observedPoints)),
    medianActiveFuel: median(played.map((payload) => payload.activeFuel)),
    towerSuccessRate: played.length
      ? played.filter((payload) => payload.tower !== 'None').length /
        played.length
      : 0,
    towerLevelCounts,
    disabledMatches,
    disabledRate: played.length ? disabledMatches / played.length : 0,
    averageDefense: defenseRatings.length
      ? defenseRatings.reduce((sum, rating) => sum + rating, 0) /
        defenseRatings.length
      : 0,
    pointStdDev: points.length
      ? Math.sqrt(
          points.reduce((sum, value) => sum + (value - meanPoints) ** 2, 0) /
            points.length,
        )
      : 0,
  };
}
