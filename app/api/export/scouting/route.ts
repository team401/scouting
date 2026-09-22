import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import type { ScoutingPayload } from '@/lib/scouting-metrics';

function csvCell(value: unknown) {
  let text = '';
  if (typeof value === 'string') text = value;
  else if (typeof value === 'number' || typeof value === 'boolean')
    text = `${value}`;
  else if (value != null) text = JSON.stringify(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to export scouting data.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership || !['owner', 'admin', 'strategy'].includes(membership.role))
    return Response.json(
      { error: 'Strategy access is required.' },
      { status: 403 },
    );
  const event = await env.DB.prepare(
    'SELECT id, tba_event_key FROM events WHERE organization_id = ? AND is_current = 1',
  )
    .bind(membership.organization_id)
    .first<{ id: string; tba_event_key: string }>();
  if (!event)
    return Response.json({ error: 'No current event.' }, { status: 404 });
  const rows =
    await env.DB.prepare(`SELECT scout_entries.id, matches.tba_match_key AS matchKey, scout_entries.team_number AS teamNumber,
    scout_entries.station, users.name AS scoutName, scout_entries.payload, scout_entries.client_updated_at AS clientUpdatedAt
    FROM scout_entries JOIN matches ON matches.id = scout_entries.match_id JOIN users ON users.id = scout_entries.scout_user_id
    WHERE scout_entries.organization_id = ? AND scout_entries.event_id = ? ORDER BY matches.match_number, scout_entries.station`)
      .bind(membership.organization_id, event.id)
      .all<{
        id: string;
        matchKey: string;
        teamNumber: number;
        station: string;
        scoutName: string;
        payload: string;
        clientUpdatedAt: number;
      }>();
  const columns = [
    'schema_version',
    'entry_id',
    'event_key',
    'match_key',
    'team_number',
    'station',
    'scout_name',
    'auto_fuel',
    'auto_tower',
    'active_fuel',
    'inactive_attempts',
    'cycles',
    'cycle_seconds',
    'shooting_range',
    'field_path',
    'defense_rating',
    'endgame_tower',
    'disabled',
    'no_show',
    'penalties',
    'notes',
    'client_updated_at',
  ];
  const records = rows.results.map((row) => {
    const payload = JSON.parse(row.payload) as ScoutingPayload;
    return [
      1,
      row.id,
      event.tba_event_key,
      row.matchKey,
      row.teamNumber,
      row.station,
      row.scoutName,
      payload.autoFuel,
      payload.autoTower,
      payload.activeFuel,
      payload.inactiveFuel,
      payload.cycles,
      payload.cycleSeconds,
      payload.shootingRange,
      payload.path,
      payload.defenseRating,
      payload.tower,
      payload.disabled,
      payload.noShow,
      payload.penalties,
      payload.notes,
      new Date(row.clientUpdatedAt).toISOString(),
    ];
  });
  const csv = [columns, ...records]
    .map((record) => record.map(csvCell).join(','))
    .join('\r\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${event.tba_event_key}-scouting-v1.csv"`,
      'cache-control': 'no-store',
    },
  });
}
