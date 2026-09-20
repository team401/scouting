import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { summarizeEntries, type ScoutingPayload } from '@/lib/scouting-metrics';
import { teamNumberFromTbaKey } from '@/lib/scouting-policy';

type TbaOprs = { oprs?: Record<string, number> };
type StatboticsTeamEvent = {
  team?: number;
  epa_end?: number;
  epa?: { total_points?: { mean?: number } };
};

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to view strategy.' },
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
  const event = await env.DB.prepare(
    'SELECT tba_event_key AS eventKey FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(membership.organization_id)
    .first<{ eventKey: string }>();
  const matches = await env.DB.prepare(
    'SELECT alliances FROM matches JOIN events ON events.id = matches.event_id WHERE matches.organization_id = ? AND events.is_current = 1',
  )
    .bind(membership.organization_id)
    .all<{ alliances: string }>();
  const scheduled = new Map<number, number>();
  for (const row of matches.results) {
    const alliances = JSON.parse(row.alliances) as {
      red: { team_keys: string[] };
      blue: { team_keys: string[] };
    };
    for (const key of [
      ...alliances.red.team_keys,
      ...alliances.blue.team_keys,
    ]) {
      const team = teamNumberFromTbaKey(key);
      if (team) scheduled.set(team, (scheduled.get(team) ?? 0) + 1);
    }
  }
  const rows =
    await env.DB.prepare(`SELECT scout_entries.team_number AS teamNumber, scout_entries.payload FROM scout_entries JOIN events ON events.id = scout_entries.event_id
    WHERE scout_entries.organization_id = ? AND events.is_current = 1`)
      .bind(membership.organization_id)
      .all<{ teamNumber: number; payload: string }>();
  const grouped = new Map<number, ScoutingPayload[]>();
  for (const row of rows.results)
    grouped.set(row.teamNumber, [
      ...(grouped.get(row.teamNumber) ?? []),
      JSON.parse(row.payload) as ScoutingPayload,
    ]);
  let oprs: Record<string, number> = {};
  const epas = new Map<number, number>();
  if (event) {
    const [tbaResult, statboticsResult] = await Promise.allSettled([
      env.TBA_AUTH_KEY
        ? fetch(
            `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(event.eventKey)}/oprs`,
            {
              headers: {
                'X-TBA-Auth-Key': env.TBA_AUTH_KEY,
                'User-Agent': 'Team401-Scouting/1.0',
              },
            },
          )
        : Promise.reject(new Error('TBA is not configured.')),
      fetch(
        `https://api.statbotics.io/v3/team_events?event=${encodeURIComponent(event.eventKey)}&limit=1000`,
      ),
    ]);
    if (tbaResult.status === 'fulfilled' && tbaResult.value.ok) {
      const data = (await tbaResult.value.json()) as TbaOprs;
      oprs = data.oprs ?? {};
    }
    if (statboticsResult.status === 'fulfilled' && statboticsResult.value.ok) {
      const data =
        (await statboticsResult.value.json()) as StatboticsTeamEvent[];
      for (const row of data) {
        const epa =
          finiteNumber(row.epa?.total_points?.mean) ??
          finiteNumber(row.epa_end);
        if (row.team && epa !== null) epas.set(row.team, epa);
      }
    }
  }
  const teams = [...scheduled.keys()]
    .sort((a, b) => a - b)
    .map((teamNumber) => {
      const summary = summarizeEntries(grouped.get(teamNumber) ?? []);
      return {
        teamNumber,
        epa: epas.get(teamNumber) ?? null,
        opr: finiteNumber(oprs[`frc${teamNumber}`]),
        scheduledMatches: scheduled.get(teamNumber) ?? 0,
        coverage:
          (scheduled.get(teamNumber) ?? 0)
            ? summary.samples / (scheduled.get(teamNumber) ?? 1)
            : 0,
        ...summary,
      };
    });
  return Response.json({ teams });
}
