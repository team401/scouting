import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { summarizeEntries, type ScoutingPayload } from '@/lib/scouting-metrics';
import { teamNumberFromTbaKey } from '@/lib/scouting-policy';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Sign in to view strategy.' }, { status: 401 });
  const membership = await env.DB.prepare('SELECT organization_id FROM memberships WHERE user_id = ? LIMIT 1').bind(session.user.id).first<{ organization_id: string }>();
  if (!membership) return Response.json({ error: 'No team membership found.' }, { status: 403 });
  const matches = await env.DB.prepare('SELECT alliances FROM matches JOIN events ON events.id = matches.event_id WHERE matches.organization_id = ? AND events.is_current = 1').bind(membership.organization_id).all<{ alliances: string }>();
  const scheduled = new Map<number, number>();
  for (const row of matches.results) {
    const alliances = JSON.parse(row.alliances) as { red: { team_keys: string[] }; blue: { team_keys: string[] } };
    for (const key of [...alliances.red.team_keys, ...alliances.blue.team_keys]) {
      const team = teamNumberFromTbaKey(key);
      if (team) scheduled.set(team, (scheduled.get(team) ?? 0) + 1);
    }
  }
  const rows = await env.DB.prepare(`SELECT scout_entries.team_number AS teamNumber, scout_entries.payload FROM scout_entries JOIN events ON events.id = scout_entries.event_id
    WHERE scout_entries.organization_id = ? AND events.is_current = 1`).bind(membership.organization_id).all<{ teamNumber: number; payload: string }>();
  const grouped = new Map<number, ScoutingPayload[]>();
  for (const row of rows.results) grouped.set(row.teamNumber, [...(grouped.get(row.teamNumber) ?? []), JSON.parse(row.payload) as ScoutingPayload]);
  const teams = [...scheduled.keys()].sort((a, b) => a - b).map((teamNumber) => {
    const summary = summarizeEntries(grouped.get(teamNumber) ?? []);
    return { teamNumber, scheduledMatches: scheduled.get(teamNumber) ?? 0, coverage: (scheduled.get(teamNumber) ?? 0) ? summary.samples / (scheduled.get(teamNumber) ?? 1) : 0, ...summary };
  });
  return Response.json({ teams });
}
