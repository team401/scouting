import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { teamNumberFromTbaKey } from '@/lib/scouting-policy';
import { syncTbaEvent } from '@/lib/tba-event-sync';

const eventRequestSchema = z.object({
  eventKey: z
    .string()
    .regex(/^\d{4}[a-z0-9]+$/i)
    .max(30),
});
type EventRow = {
  id: string;
  season_year: number;
  tba_event_key: string;
  name: string;
  updated_at: number;
};
type MatchRow = {
  id: string;
  tba_match_key: string;
  comp_level: string;
  match_number: number;
  scheduled_at: number | null;
  predicted_at: number | null;
  alliances: string;
  result: string | null;
};
type PitEntryRow = {
  teamNumber: number;
  drivetrain: string | null;
  swerveModule: string | null;
  motorTypes: string | null;
  weightLbs: number | null;
  dimensions: string | null;
  payload: string;
  photoObjectKey: string | null;
  updatedAt: number;
};
async function getMembership(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  let membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership) {
    const userCount = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM users',
    ).first<{ count: number }>();
    if (userCount?.count === 1) {
      const now = Date.now();
      await env.DB.prepare(`INSERT OR IGNORE INTO organizations (id, name, frc_team_number, owner_user_id, created_at, updated_at)
        VALUES ('team-401', 'Team 401', 401, ?, ?, ?)`)
        .bind(session.user.id, now, now)
        .run();
      await env.DB.batch([
        env.DB.prepare(
          'UPDATE organizations SET owner_user_id = ?, updated_at = ? WHERE id = ?',
        ).bind(session.user.id, now, 'team-401'),
        env.DB.prepare(`INSERT INTO memberships (organization_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'owner', ?, ?)
          ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', updated_at = excluded.updated_at`).bind(
          'team-401',
          session.user.id,
          now,
          now,
        ),
      ]);
      membership = { organization_id: 'team-401', role: 'owner' };
    }
  }
  if (membership) {
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM memberships WHERE organization_id = ?',
    )
      .bind(membership.organization_id)
      .first<{ count: number }>();
    if (count?.count === 1 && membership.role !== 'owner') {
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare(
          'UPDATE organizations SET owner_user_id = ?, updated_at = ? WHERE id = ?',
        ).bind(session.user.id, now, membership.organization_id),
        env.DB.prepare(
          "UPDATE memberships SET role = 'owner', updated_at = ? WHERE organization_id = ? AND user_id = ?",
        ).bind(now, membership.organization_id, session.user.id),
      ]);
      membership = { ...membership, role: 'owner' };
    }
  }
  return membership ? { session, membership } : null;
}

export async function GET(request: Request) {
  const identity = await getMembership(request);
  if (!identity)
    return Response.json(
      { error: 'Sign in to load the event pack.' },
      { status: 401 },
    );
  const organization = await env.DB.prepare(
    'SELECT frc_team_number AS teamNumber FROM organizations WHERE id = ?',
  )
    .bind(identity.membership.organization_id)
    .first<{ teamNumber: number | null }>();
  const organizationTeamNumber = organization?.teamNumber ?? 401;
  const members = await env.DB.prepare(
    'SELECT users.id, users.name, users.email, memberships.role, memberships.disabled FROM memberships JOIN users ON users.id = memberships.user_id WHERE memberships.organization_id = ? ORDER BY users.name',
  )
    .bind(identity.membership.organization_id)
    .all();
  let event = await env.DB.prepare(
    'SELECT id, season_year, tba_event_key, name, updated_at FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(identity.membership.organization_id)
    .first<EventRow>();
  if (!event)
    return Response.json({
      event: null,
      matches: [],
      assignments: [],
      members: members.results,
      pitEntries: [],
      organizationId: identity.membership.organization_id,
      organizationTeamNumber,
      role: identity.membership.role,
      userId: identity.session.user.id,
    });
  const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1';
  if (
    env.TBA_AUTH_KEY &&
    (forceRefresh || Date.now() - Number(event.updated_at) > 60_000)
  ) {
    await syncTbaEvent(
      identity.membership.organization_id,
      String(event.tba_event_key),
    ).catch(() => undefined);
    event =
      (await env.DB.prepare(
        'SELECT id, season_year, tba_event_key, name, updated_at FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
      )
        .bind(identity.membership.organization_id)
        .first<EventRow>()) ?? event;
  }
  const matches = await env.DB.prepare(
    "SELECT id, tba_match_key, comp_level, match_number, scheduled_at, predicted_at, alliances, result FROM matches WHERE organization_id = ? AND event_id = ? ORDER BY CASE comp_level WHEN 'qm' THEN 1 WHEN 'ef' THEN 2 WHEN 'qf' THEN 3 WHEN 'sf' THEN 4 WHEN 'f' THEN 5 ELSE 6 END, match_number",
  )
    .bind(identity.membership.organization_id, event.id)
    .all<MatchRow>();
  const assignments = await env.DB.prepare(
    'SELECT match_id AS matchId, team_number AS teamNumber, scout_user_id AS scoutUserId, station FROM scout_assignments WHERE organization_id = ? AND event_id = ?',
  )
    .bind(identity.membership.organization_id, event.id)
    .all();
  const pitEntries = await env.DB.prepare(
    'SELECT team_number AS teamNumber, drivetrain, swerve_module AS swerveModule, motor_types AS motorTypes, weight_lbs AS weightLbs, dimensions, payload, photo_object_key AS photoObjectKey, updated_at AS updatedAt FROM pit_entries WHERE organization_id = ? AND event_id = ? ORDER BY team_number',
  )
    .bind(identity.membership.organization_id, event.id)
    .all<PitEntryRow>();
  const normalizedMatches = matches.results.map((match) => {
    const alliances = JSON.parse(match.alliances) as {
      red?: { team_keys?: string[] };
      blue?: { team_keys?: string[] };
    };
    const teamNumbers = (color: 'red' | 'blue') =>
      (alliances[color]?.team_keys ?? [])
        .map(teamNumberFromTbaKey)
        .filter((team): team is number => team !== null);
    return {
      id: match.id,
      key: match.tba_match_key,
      compLevel: match.comp_level,
      matchNumber: match.match_number,
      scheduledAt: match.scheduled_at,
      predictedAt: match.predicted_at,
      alliances: { red: teamNumbers('red'), blue: teamNumbers('blue') },
      result: match.result ? JSON.parse(match.result) : null,
    };
  });
  return Response.json({
    event: {
      id: event.id,
      year: event.season_year,
      key: event.tba_event_key,
      name: event.name,
      updatedAt: event.updated_at,
    },
    matches: normalizedMatches,
    assignments: assignments.results,
    members: members.results,
    pitEntries: pitEntries.results.map((entry) => ({
      ...entry,
      motorTypes: entry.motorTypes ? JSON.parse(entry.motorTypes) : [],
      dimensions: entry.dimensions ? JSON.parse(entry.dimensions) : null,
      payload: JSON.parse(entry.payload),
    })),
    organizationId: identity.membership.organization_id,
    organizationTeamNumber,
    role: identity.membership.role,
    userId: identity.session.user.id,
  });
}

export async function POST(request: Request) {
  const identity = await getMembership(request);
  if (!identity)
    return Response.json(
      { error: 'Sign in to configure an event.' },
      { status: 401 },
    );
  if (!['owner', 'admin'].includes(identity.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can change the current event.' },
      { status: 403 },
    );
  if (!env.TBA_AUTH_KEY)
    return Response.json(
      { error: 'The TBA API key has not been configured on this Worker.' },
      { status: 503 },
    );
  const parsed = eventRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Enter a valid TBA event key, such as 2026vablacksburg.' },
      { status: 400 },
    );

  try {
    const result = await syncTbaEvent(
      identity.membership.organization_id,
      parsed.data.eventKey,
    );
    return Response.json({
      event: {
        key: result.event.key,
        name: result.event.name,
        year: result.event.year,
      },
      matchCount: result.matchCount,
      refreshedAt: result.refreshedAt,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'TBA refresh failed.',
      },
      { status: 502 },
    );
  }
}
