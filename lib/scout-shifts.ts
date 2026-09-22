import { teamNumberFromTbaKey } from '@/lib/scouting-policy';
import { shiftCoversMatch } from '@/lib/shift-scheduling';

type MatchRow = {
  id: string;
  alliances: string;
  scheduledAt: number | null;
  predictedAt: number | null;
  result: string | null;
};

type ShiftRow = {
  id: string;
  station: string;
  scoutUserId: string;
  startsAt: number;
  endsAt: number;
};

export async function reconcileShiftAssignments(
  db: D1Database,
  organizationId: string,
  eventId: string,
) {
  const [matches, shifts] = await Promise.all([
    db
      .prepare(
        `SELECT id, alliances, scheduled_at AS scheduledAt, predicted_at AS predictedAt, result
         FROM matches WHERE organization_id = ? AND event_id = ?`,
      )
      .bind(organizationId, eventId)
      .all<MatchRow>(),
    db
      .prepare(
        `SELECT id, station, scout_user_id AS scoutUserId, starts_at AS startsAt, ends_at AS endsAt
         FROM scout_shifts WHERE organization_id = ? AND event_id = ? ORDER BY starts_at`,
      )
      .bind(organizationId, eventId)
      .all<ShiftRow>(),
  ]);
  const upcoming = matches.results.filter((match) => {
    const result = match.result
      ? (JSON.parse(match.result) as { actualTime?: number | null })
      : null;
    return !result?.actualTime;
  });
  const now = Date.now();
  const statements = upcoming.map((match) =>
    db
      .prepare(
        "DELETE FROM scout_assignments WHERE organization_id = ? AND match_id = ? AND source = 'shift'",
      )
      .bind(organizationId, match.id),
  );
  for (const match of upcoming) {
    if (match.predictedAt === null && match.scheduledAt === null) continue;
    const alliances = JSON.parse(match.alliances) as Record<
      'red' | 'blue',
      { team_keys: string[] }
    >;
    for (const shift of shifts.results.filter((item) =>
      shiftCoversMatch(item, match),
    )) {
      const color = shift.station.startsWith('red') ? 'red' : 'blue';
      const index = Number(shift.station.at(-1)) - 1;
      const teamNumber = teamNumberFromTbaKey(
        alliances[color]?.team_keys[index] ?? '',
      );
      if (!teamNumber) continue;
      statements.push(
        db
          .prepare(
            `INSERT INTO scout_assignments
             (id, organization_id, event_id, match_id, team_number, scout_user_id, station, source, shift_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'shift', ?, ?, ?)
             ON CONFLICT(organization_id, match_id, station) DO UPDATE SET
             team_number = excluded.team_number, scout_user_id = excluded.scout_user_id,
             source = 'shift', shift_id = excluded.shift_id, updated_at = excluded.updated_at
             WHERE scout_assignments.source = 'shift'`,
          )
          .bind(
            `${match.id}:${shift.station}`,
            organizationId,
            eventId,
            match.id,
            teamNumber,
            shift.scoutUserId,
            shift.station,
            shift.id,
            now,
            now,
          ),
      );
    }
  }
  for (let index = 0; index < statements.length; index += 50)
    await db.batch(statements.slice(index, index + 50));
}
