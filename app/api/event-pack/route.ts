import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { teamNumberFromTbaKey } from '@/lib/scouting-policy';

const eventRequestSchema = z.object({ eventKey: z.string().regex(/^\d{4}[a-z0-9]+$/i).max(30) });
type TbaEvent = { key: string; name: string; year: number };
type TbaMatch = {
  key: string; comp_level: string; match_number: number; time: number | null; predicted_time: number | null;
  alliances: unknown; winning_alliance: string; actual_time: number | null;
};

async function getMembership(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare('SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1')
    .bind(session.user.id).first<{ organization_id: string; role: string }>();
  return membership ? { session, membership } : null;
}

export async function GET(request: Request) {
  const identity = await getMembership(request);
  if (!identity) return Response.json({ error: 'Sign in to load the event pack.' }, { status: 401 });
  const members = await env.DB.prepare('SELECT users.id, users.name, users.email, memberships.role FROM memberships JOIN users ON users.id = memberships.user_id WHERE memberships.organization_id = ? ORDER BY users.name')
    .bind(identity.membership.organization_id).all();
  const event = await env.DB.prepare('SELECT id, season_year, tba_event_key, name, updated_at FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1')
    .bind(identity.membership.organization_id).first();
  if (!event) return Response.json({ event: null, matches: [], assignments: [], members: members.results, pitEntries: [], organizationId: identity.membership.organization_id, role: identity.membership.role, userId: identity.session.user.id });
  const matches = await env.DB.prepare('SELECT id, tba_match_key, comp_level, match_number, scheduled_at, predicted_at, alliances, result FROM matches WHERE organization_id = ? AND event_id = ? ORDER BY CASE comp_level WHEN \'qm\' THEN 1 WHEN \'ef\' THEN 2 WHEN \'qf\' THEN 3 WHEN \'sf\' THEN 4 WHEN \'f\' THEN 5 ELSE 6 END, match_number')
    .bind(identity.membership.organization_id, event.id).all();
  const assignments = await env.DB.prepare('SELECT match_id AS matchId, team_number AS teamNumber, scout_user_id AS scoutUserId, station FROM scout_assignments WHERE organization_id = ? AND event_id = ?')
    .bind(identity.membership.organization_id, event.id).all();
  const pitEntries = await env.DB.prepare('SELECT team_number AS teamNumber, drivetrain, swerve_module AS swerveModule, motor_types AS motorTypes, weight_lbs AS weightLbs, dimensions, payload, photo_object_key AS photoObjectKey, updated_at AS updatedAt FROM pit_entries WHERE organization_id = ? AND event_id = ? ORDER BY team_number')
    .bind(identity.membership.organization_id, event.id).all();
  const normalizedMatches = matches.results.map((match) => {
    const row = match as Record<string, unknown>;
    const alliances = JSON.parse(String(row.alliances)) as { red?: { team_keys?: string[] }; blue?: { team_keys?: string[] } };
    const teamNumbers = (color: 'red' | 'blue') => (alliances[color]?.team_keys ?? []).map(teamNumberFromTbaKey).filter((team): team is number => team !== null);
    return {
      id: row.id, key: row.tba_match_key, compLevel: row.comp_level, matchNumber: row.match_number,
      scheduledAt: row.scheduled_at, predictedAt: row.predicted_at,
      alliances: { red: teamNumbers('red'), blue: teamNumbers('blue') },
      result: row.result ? JSON.parse(String(row.result)) : null,
    };
  });
  return Response.json({ event: { id: event.id, year: event.season_year, key: event.tba_event_key, name: event.name, updatedAt: event.updated_at }, matches: normalizedMatches, assignments: assignments.results, members: members.results, pitEntries: pitEntries.results.map((entry) => ({ ...entry, motorTypes: entry.motorTypes ? JSON.parse(String(entry.motorTypes)) : [], dimensions: entry.dimensions ? JSON.parse(String(entry.dimensions)) : null, payload: JSON.parse(String(entry.payload)) })), organizationId: identity.membership.organization_id, role: identity.membership.role, userId: identity.session.user.id });
}

export async function POST(request: Request) {
  const identity = await getMembership(request);
  if (!identity) return Response.json({ error: 'Sign in to configure an event.' }, { status: 401 });
  if (!['owner', 'admin'].includes(identity.membership.role)) return Response.json({ error: 'Only an owner or admin can change the current event.' }, { status: 403 });
  if (!env.TBA_AUTH_KEY) return Response.json({ error: 'The TBA API key has not been configured on this Worker.' }, { status: 503 });
  const parsed = eventRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Enter a valid TBA event key, such as 2026vablacksburg.' }, { status: 400 });

  const headers = { 'X-TBA-Auth-Key': env.TBA_AUTH_KEY, 'User-Agent': 'Team401-Scouting/1.0' };
  const base = `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(parsed.data.eventKey)}`;
  const [eventResponse, matchesResponse] = await Promise.all([fetch(base, { headers }), fetch(`${base}/matches`, { headers })]);
  if (!eventResponse.ok || !matchesResponse.ok) return Response.json({ error: `TBA could not load that event (${eventResponse.status}/${matchesResponse.status}).` }, { status: 502 });
  const event = await eventResponse.json() as TbaEvent;
  const matches = await matchesResponse.json() as TbaMatch[];
  const organizationId = identity.membership.organization_id;
  const eventId = `${organizationId}:${event.key}`;
  const now = Date.now();
  const statements = [
    env.DB.prepare('INSERT INTO seasons (year, game_key, schema_version, field_definition, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT(year) DO UPDATE SET updated_at = excluded.updated_at')
      .bind(event.year, `${event.year}-rebuilt`, JSON.stringify({ year: event.year, version: 1 }), now, now),
    env.DB.prepare('UPDATE events SET is_current = 0, updated_at = ? WHERE organization_id = ?').bind(now, organizationId),
    env.DB.prepare(`INSERT INTO events (id, organization_id, season_year, tba_event_key, name, is_current, tba_etag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?) ON CONFLICT(organization_id, tba_event_key) DO UPDATE SET name = excluded.name, is_current = 1, tba_etag = excluded.tba_etag, updated_at = excluded.updated_at`)
      .bind(eventId, organizationId, event.year, event.key, event.name, matchesResponse.headers.get('etag'), now, now),
    ...matches.map((match) => env.DB.prepare(`INSERT INTO matches
      (id, organization_id, event_id, tba_match_key, comp_level, match_number, scheduled_at, predicted_at, alliances, result, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(organization_id, tba_match_key) DO UPDATE SET
      comp_level = excluded.comp_level, match_number = excluded.match_number, scheduled_at = excluded.scheduled_at,
      predicted_at = excluded.predicted_at, alliances = excluded.alliances, result = excluded.result, updated_at = excluded.updated_at`)
      .bind(`${organizationId}:${match.key}`, organizationId, eventId, match.key, match.comp_level, match.match_number,
        match.time ? match.time * 1000 : null, match.predicted_time ? match.predicted_time * 1000 : null,
        JSON.stringify(match.alliances), JSON.stringify({ winningAlliance: match.winning_alliance, actualTime: match.actual_time }), now, now)),
  ];
  await env.DB.batch(statements);
  return Response.json({ event: { key: event.key, name: event.name, year: event.year }, matchCount: matches.length });
}
