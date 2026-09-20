export type ScoutingPayload = {
  autoFuel: number; activeFuel: number; inactiveFuel: number; cycles: number;
  autoTower: string; tower: string; path: string; defenseRating?: number;
  disabled?: boolean; noShow?: boolean; penalties?: number; shootingRange?: string;
  cycleSeconds?: number; notes?: string;
};

export function towerPoints(level: string, autonomous = false) {
  if (autonomous) return level === 'Level 1' ? 15 : 0;
  return level === 'Level 3' ? 30 : level === 'Level 2' ? 20 : level === 'Level 1' ? 10 : 0;
}

export function observedPoints(payload: ScoutingPayload) {
  return payload.autoFuel + payload.activeFuel + towerPoints(payload.autoTower, true) + towerPoints(payload.tower);
}

export function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeEntries(payloads: ScoutingPayload[]) {
  const played = payloads.filter((payload) => !payload.noShow);
  const points = played.map(observedPoints);
  const meanPoints = points.length ? points.reduce((sum, value) => sum + value, 0) / points.length : 0;
  return {
    samples: payloads.length,
    medianPoints: median(played.map(observedPoints)),
    medianActiveFuel: median(played.map((payload) => payload.activeFuel)),
    medianFuelPerCycle: median(played.map((payload) => payload.activeFuel / Math.max(1, payload.cycles))),
    towerSuccessRate: played.length ? played.filter((payload) => payload.tower !== 'None').length / played.length : 0,
    disabledRate: played.length ? played.filter((payload) => payload.disabled).length / played.length : 0,
    averageDefense: played.length ? played.reduce((sum, payload) => sum + (payload.defenseRating ?? 0), 0) / played.length : 0,
    pointStdDev: points.length ? Math.sqrt(points.reduce((sum, value) => sum + (value - meanPoints) ** 2, 0) / points.length) : 0,
  };
}
