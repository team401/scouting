import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import {
  observedPoints,
  summarizeEntries,
  type ScoutingPayload,
} from '@/lib/scouting-metrics';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to view analysis.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string }>();
  if (!membership)
    return Response.json(
      { error: 'No team membership found.' },
      { status: 403 },
    );
  const teamNumber = Number(new URL(request.url).searchParams.get('team'));
  if (!Number.isInteger(teamNumber) || teamNumber <= 0)
    return Response.json({ error: 'Invalid team number.' }, { status: 400 });
  const rows =
    await env.DB.prepare(`SELECT scout_entries.id, scout_entries.payload, matches.tba_match_key AS matchKey, matches.match_number AS matchNumber, users.name AS scoutName
    FROM scout_entries JOIN events ON events.id = scout_entries.event_id JOIN matches ON matches.id = scout_entries.match_id JOIN users ON users.id = scout_entries.scout_user_id
    WHERE scout_entries.organization_id = ? AND scout_entries.team_number = ? AND events.is_current = 1 ORDER BY matches.match_number`)
      .bind(membership.organization_id, teamNumber)
      .all<{
        id: string;
        payload: string;
        matchKey: string;
        matchNumber: number;
        scoutName: string;
      }>();
  const payloads = rows.results.map(
    (row) => JSON.parse(row.payload) as ScoutingPayload,
  );
  const scheduled = await env.DB.prepare(
    'SELECT alliances FROM matches JOIN events ON events.id = matches.event_id WHERE matches.organization_id = ? AND events.is_current = 1',
  )
    .bind(membership.organization_id)
    .all<{ alliances: string }>();
  const scheduledMatches = scheduled.results.filter((row) => {
    const alliances = JSON.parse(row.alliances) as {
      red: { team_keys: string[] };
      blue: { team_keys: string[] };
    };
    return [...alliances.red.team_keys, ...alliances.blue.team_keys].includes(
      `frc${teamNumber}`,
    );
  }).length;
  return Response.json({
    teamNumber,
    ...summarizeEntries(payloads),
    scheduledMatches,
    coverage: scheduledMatches ? payloads.length / scheduledMatches : 0,
    trends: rows.results.map((row, index) => ({
      matchKey: row.matchKey,
      matchNumber: row.matchNumber,
      points: observedPoints(payloads[index]),
      activeFuel: payloads[index].activeFuel,
      cycleSeconds: payloads[index].cycleSeconds ?? 0,
    })),
    entries: rows.results.map((row, index) => ({
      id: row.id,
      matchKey: row.matchKey,
      scoutName: row.scoutName,
      reopened: Boolean(
        (payloads[index] as ScoutingPayload & { reopened?: boolean }).reopened,
      ),
    })),
  });
}
