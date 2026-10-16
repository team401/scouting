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
  teamNumber: z.number().int().positive().max(99_999).optional(),
});
type EventRow = {
  id: string;
  season_year: number;
  tba_event_key: string;
  name: string;
  updated_at: number;
  timezone: string | null;
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
  videos: string | null;
};
type PitEntryRow = {
  teamNumber: number;
  scoutUserId: string;
  scoutName: string;
  drivetrain: string | null;
  swerveModule: string | null;
  motorTypes: string | null;
  weightLbs: number | null;
  payload: string;
  photoObjectKey: string | null;
  updatedAt: number;
};

function guestPoolUserId(userId: string) {
  if (!userId.startsWith('guest:')) return userId;
  const [prefix, passId] = userId.split(':');
  return passId ? `${prefix}:${passId}` : userId;
}

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
    `SELECT organizations.frc_team_number AS baseTeamNumber,
      organization_settings.test_team_number AS testTeamNumber
     FROM organizations LEFT JOIN organization_settings
       ON organization_settings.organization_id = organizations.id
     WHERE organizations.id = ?`,
  )
    .bind(identity.membership.organization_id)
    .first<{ baseTeamNumber: number | null; testTeamNumber: number | null }>();
  const organizationTeamNumber =
    organization?.testTeamNumber ?? organization?.baseTeamNumber ?? 401;
  const members = await env.DB.prepare(
    'SELECT users.id, users.name, users.email, users.ops_role AS opsRole, memberships.role, memberships.disabled FROM memberships JOIN users ON users.id = memberships.user_id WHERE memberships.organization_id = ? ORDER BY users.name',
  )
    .bind(identity.membership.organization_id)
    .all();
  let event = await env.DB.prepare(
    'SELECT id, season_year, tba_event_key, name, updated_at, timezone FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(identity.membership.organization_id)
    .first<EventRow>();
  if (!event)
    return Response.json({
      event: null,
      matches: [],
      teams: [],
      assignments: [],
      members: members.results,
      attendingUserIds: null,
      pitEntries: [],
      scoutEntries: [],
      scoutShifts: [],
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
        'SELECT id, season_year, tba_event_key, name, updated_at, timezone FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
      )
        .bind(identity.membership.organization_id)
        .first<EventRow>()) ?? event;
  }
  const matches = await env.DB.prepare(
    "SELECT id, tba_match_key, comp_level, match_number, scheduled_at, predicted_at, alliances, result, videos FROM matches WHERE organization_id = ? AND event_id = ? ORDER BY CASE comp_level WHEN 'qm' THEN 1 WHEN 'ef' THEN 2 WHEN 'qf' THEN 3 WHEN 'sf' THEN 4 WHEN 'f' THEN 5 ELSE 6 END, match_number",
  )
    .bind(identity.membership.organization_id, event.id)
    .all<MatchRow>();
  const teams = await env.DB.prepare(
    'SELECT team_number AS teamNumber, name FROM event_teams WHERE organization_id = ? AND event_id = ? ORDER BY team_number',
  )
    .bind(identity.membership.organization_id, event.id)
    .all<{ teamNumber: number; name: string }>();
  const assignments = await env.DB.prepare(
    'SELECT match_id AS matchId, team_number AS teamNumber, scout_user_id AS scoutUserId, station FROM scout_assignments WHERE organization_id = ? AND event_id = ?',
  )
    .bind(identity.membership.organization_id, event.id)
    .all();
  const attendees = await env.DB.prepare(
    'SELECT user_id AS userId FROM event_attendees WHERE event_id = ?',
  )
    .bind(event.id)
    .all<{ userId: string }>();
  const attendanceSetting = await env.DB.prepare(
    'SELECT 1 FROM event_attendance_settings WHERE event_id = ?',
  )
    .bind(event.id)
    .first();
  const pitEntries = await env.DB.prepare(
    `SELECT pit_entries.team_number AS teamNumber,
      pit_entries.scout_user_id AS scoutUserId, users.name AS scoutName,
      pit_entries.drivetrain, pit_entries.swerve_module AS swerveModule,
      pit_entries.motor_types AS motorTypes, pit_entries.weight_lbs AS weightLbs,
      pit_entries.payload,
      pit_entries.photo_object_key AS photoObjectKey,
      pit_entries.updated_at AS updatedAt
     FROM pit_entries
     JOIN users ON users.id = pit_entries.scout_user_id
     WHERE pit_entries.organization_id = ? AND pit_entries.event_id = ?
     ORDER BY pit_entries.team_number`,
  )
    .bind(identity.membership.organization_id, event.id)
    .all<PitEntryRow>();
  const scoutEntries = await env.DB.prepare(
    `SELECT match_id AS matchId, team_number AS teamNumber, station, payload, updated_at AS updatedAt
     FROM scout_entries WHERE organization_id = ? AND event_id = ? AND scout_user_id = ?`,
  )
    .bind(
      identity.membership.organization_id,
      event.id,
      identity.session.user.id,
    )
    .all<{
      matchId: string;
      teamNumber: number;
      station: string;
      payload: string;
      updatedAt: number;
    }>();
  const scoutShifts = await env.DB.prepare(
    `SELECT id, station, starts_at AS startsAt, ends_at AS endsAt
     FROM published_scout_shifts WHERE organization_id = ? AND event_id = ?
       AND scout_user_id IN (?, ?)
     ORDER BY starts_at`,
  )
    .bind(
      identity.membership.organization_id,
      event.id,
      identity.session.user.id,
      guestPoolUserId(identity.session.user.id),
    )
    .all();
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
      videos: match.videos ? JSON.parse(match.videos) : [],
    };
  });
  return Response.json({
    event: {
      id: event.id,
      year: event.season_year,
      key: event.tba_event_key,
      name: event.name,
      updatedAt: event.updated_at,
      timezone: event.timezone,
    },
    matches: normalizedMatches,
    teams: teams.results,
    assignments: assignments.results.map((assignment) =>
      assignment.scoutUserId === guestPoolUserId(identity.session.user.id)
        ? { ...assignment, scoutUserId: identity.session.user.id }
        : assignment,
    ),
    members: members.results,
    attendingUserIds:
      attendanceSetting || attendees.results.length > 0
        ? attendees.results.map((attendee) => attendee.userId)
        : null,
    pitEntries: pitEntries.results.map((entry) => ({
      ...entry,
      motorTypes: entry.motorTypes ? JSON.parse(entry.motorTypes) : [],
      payload: JSON.parse(entry.payload),
    })),
    scoutEntries: scoutEntries.results.map((entry) => ({
      ...entry,
      payload: JSON.parse(entry.payload),
    })),
    scoutShifts: scoutShifts.results,
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
    const organization = await env.DB.prepare(
      'SELECT frc_team_number AS teamNumber FROM organizations WHERE id = ?',
    )
      .bind(identity.membership.organization_id)
      .first<{ teamNumber: number | null }>();
    const baseTeamNumber = organization?.teamNumber ?? 401;
    const previousEvent = await env.DB.prepare(
      'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
    )
      .bind(identity.membership.organization_id)
      .first<{ id: string }>();
    const result = await syncTbaEvent(
      identity.membership.organization_id,
      parsed.data.eventKey,
    );
    const now = Date.now();
    if (parsed.data.teamNumber && parsed.data.teamNumber !== baseTeamNumber) {
      await env.DB.prepare(
        `INSERT INTO organization_settings
         (organization_id, test_team_number, test_previous_event_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(organization_id) DO UPDATE SET
           test_team_number = excluded.test_team_number,
           test_previous_event_id = CASE
             WHEN organization_settings.test_team_number IS NULL
             THEN excluded.test_previous_event_id
             ELSE organization_settings.test_previous_event_id
           END,
           updated_at = excluded.updated_at`,
      )
        .bind(
          identity.membership.organization_id,
          parsed.data.teamNumber,
          previousEvent?.id ?? null,
          now,
        )
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE organization_settings SET test_team_number = NULL,
         test_previous_event_id = NULL, updated_at = ? WHERE organization_id = ?`,
      )
        .bind(now, identity.membership.organization_id)
        .run();
    }
    return Response.json({
      event: {
        key: result.event.key,
        name: result.event.name,
        year: result.event.year,
      },
      matchCount: result.matchCount,
      refreshedAt: result.refreshedAt,
      organizationTeamNumber: parsed.data.teamNumber ?? baseTeamNumber,
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

export async function DELETE(request: Request) {
  const identity = await getMembership(request);
  if (!identity)
    return Response.json(
      { error: 'Sign in to stop test mode.' },
      { status: 401 },
    );
  if (!['owner', 'admin'].includes(identity.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can stop test mode.' },
      { status: 403 },
    );
  const settings = await env.DB.prepare(
    `SELECT test_team_number AS testTeamNumber,
      test_previous_event_id AS previousEventId
     FROM organization_settings WHERE organization_id = ?`,
  )
    .bind(identity.membership.organization_id)
    .first<{ testTeamNumber: number | null; previousEventId: string | null }>();
  if (!settings?.testTeamNumber)
    return Response.json({ restored: true, testMode: false });

  const now = Date.now();
  const statements = [
    env.DB.prepare(
      'UPDATE events SET is_current = 0, updated_at = ? WHERE organization_id = ?',
    ).bind(now, identity.membership.organization_id),
  ];
  if (settings.previousEventId)
    statements.push(
      env.DB.prepare(
        `UPDATE events SET is_current = 1, updated_at = ?
         WHERE id = ? AND organization_id = ?`,
      ).bind(
        now,
        settings.previousEventId,
        identity.membership.organization_id,
      ),
    );
  statements.push(
    env.DB.prepare(
      `UPDATE organization_settings SET test_team_number = NULL,
       test_previous_event_id = NULL, updated_at = ? WHERE organization_id = ?`,
    ).bind(now, identity.membership.organization_id),
  );
  await env.DB.batch(statements);
  return Response.json({ restored: true, testMode: false });
}
