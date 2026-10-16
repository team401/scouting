import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { summarizeEntries, type ScoutingPayload } from '@/lib/scouting-metrics';
import { teamNumberFromTbaKey } from '@/lib/scouting-policy';
import { getMatch13EventTeams } from '@/lib/match13';

type TbaOprs = { oprs?: Record<string, number> };
type TbaRankings = {
  rankings?: Array<{
    rank: number;
    team_key: string;
    matches_played?: number;
    record?: { wins?: number; losses?: number; ties?: number };
  }>;
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
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership)
    return Response.json(
      { error: 'An active scouting account is required.' },
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
  const registeredTeams = await env.DB.prepare(
    `SELECT event_teams.team_number AS teamNumber
     FROM event_teams
     JOIN events ON events.id = event_teams.event_id
     WHERE event_teams.organization_id = ? AND events.is_current = 1
     ORDER BY event_teams.team_number`,
  )
    .bind(membership.organization_id)
    .all<{ teamNumber: number }>();
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
  const rankings = new Map<
    number,
    {
      eventRank: number;
      matchesPlayed: number;
      wins: number;
      losses: number;
      ties: number;
    }
  >();
  const xps = new Map<number, number>();
  const match13Oprs = new Map<number, number>();
  const phaseXps = new Map<
    number,
    { xAuto: number | null; xTele: number | null; xEnd: number | null }
  >();
  if (event) {
    const [tbaResult, rankingsResult, match13Result] = await Promise.allSettled(
      [
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
        env.TBA_AUTH_KEY
          ? fetch(
              `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(event.eventKey)}/rankings`,
              {
                headers: {
                  'X-TBA-Auth-Key': env.TBA_AUTH_KEY,
                  'User-Agent': 'Team401-Scouting/1.0',
                },
              },
            )
          : Promise.reject(new Error('TBA is not configured.')),
        getMatch13EventTeams(env.DB, event.eventKey, env.MATCH13_API_KEY),
      ],
    );
    if (tbaResult.status === 'fulfilled' && tbaResult.value.ok) {
      // TBA returns null for events without OPR data.
      const data = (await tbaResult.value.json()) as TbaOprs | null;
      oprs = data?.oprs ?? {};
    }
    if (rankingsResult.status === 'fulfilled' && rankingsResult.value.ok) {
      const data = (await rankingsResult.value.json()) as TbaRankings | null;
      for (const row of data?.rankings ?? []) {
        const teamNumber = teamNumberFromTbaKey(row.team_key);
        if (!teamNumber) continue;
        rankings.set(teamNumber, {
          eventRank: row.rank,
          matchesPlayed: row.matches_played ?? 0,
          wins: row.record?.wins ?? 0,
          losses: row.record?.losses ?? 0,
          ties: row.record?.ties ?? 0,
        });
      }
    }
    if (match13Result.status === 'fulfilled' && match13Result.value) {
      for (const row of match13Result.value.teams ?? []) {
        const xp = finiteNumber(row.xpEnd) ?? finiteNumber(row.xpMean);
        if (row.teamNumber) {
          if (xp !== null) xps.set(row.teamNumber, xp);
          const opr = finiteNumber(row.opr);
          if (opr !== null) match13Oprs.set(row.teamNumber, opr);
          phaseXps.set(row.teamNumber, {
            xAuto: finiteNumber(row.xAuto),
            xTele: finiteNumber(row.xTele),
            xEnd: finiteNumber(row.xEnd),
          });
        }
      }
    }
  }
  const teamNumbers = new Set([
    ...registeredTeams.results.map((team) => team.teamNumber),
    ...scheduled.keys(),
    ...grouped.keys(),
  ]);
  const teams = [...teamNumbers]
    .sort((a, b) => a - b)
    .map((teamNumber) => {
      const summary = summarizeEntries(grouped.get(teamNumber) ?? []);
      return {
        teamNumber,
        xp: xps.get(teamNumber) ?? null,
        xAuto: phaseXps.get(teamNumber)?.xAuto ?? null,
        xTele: phaseXps.get(teamNumber)?.xTele ?? null,
        xEnd: phaseXps.get(teamNumber)?.xEnd ?? null,
        opr:
          finiteNumber(oprs[`frc${teamNumber}`]) ??
          match13Oprs.get(teamNumber) ??
          null,
        eventRank: rankings.get(teamNumber)?.eventRank ?? null,
        matchesPlayed: rankings.get(teamNumber)?.matchesPlayed ?? 0,
        wins: rankings.get(teamNumber)?.wins ?? 0,
        losses: rankings.get(teamNumber)?.losses ?? 0,
        ties: rankings.get(teamNumber)?.ties ?? 0,
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
