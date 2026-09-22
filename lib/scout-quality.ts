export function isAllianceScoreOutlier(
  reported: number,
  official: number,
  reportCount: number,
) {
  return (
    reportCount === 3 &&
    Math.abs(reported - official) > Math.max(35, official * 0.35)
  );
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function isTeamTrendOutlier(points: number, history: number[]) {
  if (history.length < 3) return false;
  const typical = median(history);
  return Math.abs(points - typical) > Math.max(30, typical * 0.75);
}
