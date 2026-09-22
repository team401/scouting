export type ShiftWindow = { startsAt: number; endsAt: number };
export type ScheduledMatch = {
  scheduledAt: number | null;
  predictedAt: number | null;
};

export function matchTime(match: ScheduledMatch) {
  return match.predictedAt ?? match.scheduledAt;
}

export function shiftCoversMatch(shift: ShiftWindow, match: ScheduledMatch) {
  const time = matchTime(match);
  return time !== null && shift.startsAt <= time && time < shift.endsAt;
}
