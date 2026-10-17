const activeWindowMs = 7 * 24 * 60 * 60 * 1000;
const afterEventMs = 24 * 60 * 60 * 1000;
const idleRefreshMs = 6 * 60 * 60 * 1000;

function dateAtUtcNoon(value: string) {
  return new Date(`${value}T12:00:00Z`).getTime();
}

export function shouldRefreshTbaEvent(
  event: {
    startDate: string | null;
    endDate: string | null;
    updatedAt: number;
  },
  now: number,
) {
  if (!event.startDate || !event.endDate)
    return event.updatedAt <= now - idleRefreshMs;
  const startsAt = dateAtUtcNoon(event.startDate);
  const endsAt = dateAtUtcNoon(event.endDate);
  const inActiveWindow =
    now >= startsAt - activeWindowMs && now <= endsAt + afterEventMs;
  return inActiveWindow || event.updatedAt <= now - idleRefreshMs;
}
