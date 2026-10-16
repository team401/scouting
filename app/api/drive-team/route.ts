import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  canFillDrivePosition,
  drivePhases,
  drivePositions,
  hasDuplicateDriveMember,
  mapSlotsToMatches,
  maxExpectedMatches,
} from '@/lib/drive-team';
import { canManageAssignments } from '@/lib/scouting-policy';

const phaseSchema = z.enum(drivePhases);

const expectedSchema = z.object({
  phase: phaseSchema,
  expectedMatches: z.number().int().min(1).max(maxExpectedMatches),
});

const slotSchema = z.object({
  phase: phaseSchema,
  slotNumber: z.number().int().min(1).max(maxExpectedMatches),
  driverUserId: z.string().min(1).nullable(),
  operatorUserId: z.string().min(1).nullable(),
  humanPlayerUserId: z.string().min(1).nullable(),
  technicianUserId: z.string().min(1).nullable(),
  coachUserId: z.string().min(1).nullable(),
  matchId: z.string().min(1).nullable(),
});

const mapSchema = z.object({
  startMatchNumber: z.number().int().min(1).max(999),
});

type PublishedRow = {
  phase: string;
  slotNumber: number;
  driverUserId: string | null;
  operatorUserId: string | null;
  humanPlayerUserId: string | null;
  technicianUserId: string | null;
  coachUserId: string | null;
  matchNumber: number | null;
  compLevel: string | null;
  startsAt: number | null;
};

async function identity(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    'SELECT organization_id AS organizationId, role FROM memberships WHERE user_id = ? AND disabled = 0 LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organizationId: string; role: string }>();
  return membership ? { session, membership } : null;
}

async function currentEventId(organizationId: string) {
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(organizationId)
    .first<{ id: string }>();
  return event?.id ?? null;
}

// Same rules as the shift schedule (an active member, on the roster when the
// event has one), plus the position's eligibility by ops role.
async function personError(
  organizationId: string,
  eventId: string,
  userId: string,
  key: (typeof drivePositions)[number]['key'],
) {
  const member = await env.DB.prepare(
    'SELECT 1 FROM memberships WHERE organization_id = ? AND user_id = ? AND disabled = 0',
  )
    .bind(organizationId, userId)
    .first();
  if (!member) return 'That person is not an active member.';
  const attendeeCount = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM event_attendees WHERE event_id = ?',
  )
    .bind(eventId)
    .first<{ count: number }>();
  const attendanceConfigured = await env.DB.prepare(
    'SELECT 1 FROM event_attendance_settings WHERE event_id = ?',
  )
    .bind(eventId)
    .first();
  if (attendanceConfigured || Number(attendeeCount?.count ?? 0) > 0) {
    const attendee = await env.DB.prepare(
      'SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ?',
    )
      .bind(eventId, userId)
      .first();
    if (!attendee) return 'That person is not on this event roster.';
  }
  const user = await env.DB.prepare(
    'SELECT ops_role AS opsRole FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ opsRole: string | null }>();
  if (!canFillDrivePosition(key, user?.opsRole)) {
    return key === 'coachUserId'
      ? 'Only coaches can fill the Coach position.'
      : 'Coaches can only fill the Technician and Coach positions.';
  }
  return null;
}

function markDraftChanged(eventId: string, now: number) {
  return env.DB.prepare(
    `INSERT INTO drive_team_publications (event_id, draft_updated_at)
     VALUES (?, ?) ON CONFLICT(event_id) DO UPDATE SET draft_updated_at = excluded.draft_updated_at`,
  ).bind(eventId, now);
}

// D1 batches are capped, so larger plans are written in chunks.
async function runInChunks(statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 50)
    await env.DB.batch(statements.slice(index, index + 50));
}

export async function GET(request: Request) {
  const actor = await identity(request);
  if (!actor)
    return Response.json(
      { error: 'Sign in to view drive teams.' },
      { status: 401 },
    );
  const organizationId = actor.membership.organizationId;
  const all =
    canManageAssignments(actor.membership.role) &&
    new URL(request.url).searchParams.get('all') === '1';
  const eventId = await currentEventId(organizationId);
  if (!eventId)
    return Response.json(
      all ? { slots: [], matches: [] } : { assignments: [] },
    );

  if (all) {
    const [slots, matches] = await Promise.all([
      env.DB.prepare(
        `SELECT phase, slot_number AS slotNumber, driver_user_id AS driverUserId,
          operator_user_id AS operatorUserId, human_player_user_id AS humanPlayerUserId,
          technician_user_id AS technicianUserId, coach_user_id AS coachUserId,
          match_id AS matchId
         FROM drive_team_slots WHERE organization_id = ? AND event_id = ?
         ORDER BY CASE phase WHEN 'qual' THEN 0 ELSE 1 END, slot_number`,
      )
        .bind(organizationId, eventId)
        .all(),
      env.DB.prepare(
        `SELECT id, match_number AS matchNumber, comp_level AS compLevel,
          scheduled_at AS scheduledAt, predicted_at AS predictedAt
         FROM matches WHERE organization_id = ? AND event_id = ?
         ORDER BY comp_level, match_number`,
      )
        .bind(organizationId, eventId)
        .all(),
    ]);
    return Response.json({ slots: slots.results, matches: matches.results });
  }

  // Members only see published slots where they hold a position.
  const rows = await env.DB.prepare(
    `SELECT slots.phase AS phase, slots.slot_number AS slotNumber,
      slots.driver_user_id AS driverUserId, slots.operator_user_id AS operatorUserId,
      slots.human_player_user_id AS humanPlayerUserId,
      slots.technician_user_id AS technicianUserId, slots.coach_user_id AS coachUserId,
      matches.match_number AS matchNumber, matches.comp_level AS compLevel,
      COALESCE(matches.predicted_at, matches.scheduled_at) AS startsAt
     FROM published_drive_team_slots slots
     LEFT JOIN matches ON matches.id = slots.match_id
     WHERE slots.organization_id = ? AND slots.event_id = ?
       AND ? IN (slots.driver_user_id, slots.operator_user_id,
         slots.human_player_user_id, slots.technician_user_id, slots.coach_user_id)
     ORDER BY CASE slots.phase WHEN 'qual' THEN 0 ELSE 1 END, slots.slot_number`,
  )
    .bind(organizationId, eventId, actor.session.user.id)
    .all<PublishedRow>();
  const assignments = rows.results.flatMap((row) =>
    drivePositions
      .filter((position) => row[position.key] === actor.session.user.id)
      .map((position) => ({
        phase: row.phase,
        slotNumber: row.slotNumber,
        position: position.label,
        matchNumber: row.matchNumber,
        compLevel: row.compLevel,
        startsAt: row.startsAt,
      })),
  );
  return Response.json({ assignments });
}

export async function POST(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage drive teams.' },
      { status: actor ? 403 : 401 },
    );
  const parsed = expectedSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: `Choose between 1 and ${maxExpectedMatches} expected matches.` },
      { status: 400 },
    );
  const organizationId = actor.membership.organizationId;
  const eventId = await currentEventId(organizationId);
  if (!eventId)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const { phase } = parsed.data;
  const count = parsed.data.expectedMatches;

  const existing = await env.DB.prepare(
    `SELECT slot_number AS slotNumber,
      (driver_user_id IS NOT NULL OR operator_user_id IS NOT NULL
        OR human_player_user_id IS NOT NULL OR technician_user_id IS NOT NULL
        OR coach_user_id IS NOT NULL OR match_id IS NOT NULL) AS used
     FROM drive_team_slots WHERE event_id = ? AND phase = ? ORDER BY slot_number`,
  )
    .bind(eventId, phase)
    .all<{ slotNumber: number; used: number }>();
  const current = existing.results.reduce(
    (highest, row) => Math.max(highest, row.slotNumber),
    0,
  );
  const blocking = existing.results.find(
    (row) => row.slotNumber > count && row.used,
  );
  if (blocking)
    return Response.json(
      {
        error: `Clear ${phase === 'playoff' ? 'playoff' : 'planned'} match ${blocking.slotNumber} before lowering the count to ${count}.`,
      },
      { status: 409 },
    );

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  if (count < current)
    statements.push(
      env.DB.prepare(
        'DELETE FROM drive_team_slots WHERE event_id = ? AND phase = ? AND slot_number > ?',
      ).bind(eventId, phase, count),
    );
  for (let slot = current + 1; slot <= count; slot++)
    statements.push(
      env.DB.prepare(
        `INSERT INTO drive_team_slots
         (id, organization_id, event_id, phase, slot_number, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        organizationId,
        eventId,
        phase,
        slot,
        now,
        now,
      ),
    );
  if (count !== current) statements.push(markDraftChanged(eventId, now));
  await runInChunks(statements);
  return Response.json({ phase, expectedMatches: count });
}

export async function PUT(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage drive teams.' },
      { status: actor ? 403 : 401 },
    );
  const parsed = slotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Choose a valid planned match.' },
      { status: 400 },
    );
  const organizationId = actor.membership.organizationId;
  const eventId = await currentEventId(organizationId);
  if (!eventId)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const { phase, slotNumber } = parsed.data;
  const slot = await env.DB.prepare(
    'SELECT id FROM drive_team_slots WHERE event_id = ? AND phase = ? AND slot_number = ?',
  )
    .bind(eventId, phase, slotNumber)
    .first<{ id: string }>();
  if (!slot)
    return Response.json(
      { error: 'Planned match not found. Set the expected matches first.' },
      { status: 404 },
    );

  const members = {
    driverUserId: parsed.data.driverUserId,
    operatorUserId: parsed.data.operatorUserId,
    humanPlayerUserId: parsed.data.humanPlayerUserId,
    technicianUserId: parsed.data.technicianUserId,
    coachUserId: parsed.data.coachUserId,
  };
  if (hasDuplicateDriveMember(members))
    return Response.json(
      {
        error:
          'The same person cannot hold two positions in one planned match.',
      },
      { status: 400 },
    );
  for (const position of drivePositions) {
    const userId = members[position.key];
    if (!userId) continue;
    const error = await personError(
      organizationId,
      eventId,
      userId,
      position.key,
    );
    if (error) return Response.json({ error }, { status: 400 });
  }

  if (parsed.data.matchId) {
    const match = await env.DB.prepare(
      'SELECT id, comp_level AS compLevel FROM matches WHERE id = ? AND organization_id = ? AND event_id = ?',
    )
      .bind(parsed.data.matchId, organizationId, eventId)
      .first<{ id: string; compLevel: string }>();
    if (!match)
      return Response.json(
        { error: 'That match is not in the current event.' },
        { status: 400 },
      );
    const isQualification = match.compLevel === 'qm';
    if (isQualification !== (phase === 'qual'))
      return Response.json(
        {
          error:
            phase === 'qual'
              ? 'Qualification rows take a qualification match.'
              : 'Playoff rows take a playoff match.',
        },
        { status: 400 },
      );
    const taken = await env.DB.prepare(
      'SELECT phase, slot_number AS slotNumber FROM drive_team_slots WHERE event_id = ? AND match_id = ? AND id <> ?',
    )
      .bind(eventId, parsed.data.matchId, slot.id)
      .first<{ phase: string; slotNumber: number }>();
    if (taken)
      return Response.json(
        {
          error: `That match is already planned in ${taken.phase === 'playoff' ? 'playoff' : 'planned'} match ${taken.slotNumber}.`,
        },
        { status: 409 },
      );
  }

  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE drive_team_slots SET driver_user_id = ?, operator_user_id = ?,
        human_player_user_id = ?, technician_user_id = ?, coach_user_id = ?,
        match_id = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      members.driverUserId,
      members.operatorUserId,
      members.humanPlayerUserId,
      members.technicianUserId,
      members.coachUserId,
      parsed.data.matchId,
      now,
      slot.id,
    ),
    markDraftChanged(eventId, now),
  ]);
  return Response.json({ ok: true, updatedAt: now });
}

// Maps planned qualification match N onto official qualification match
// (start + N - 1). Replaces existing mappings, so the planner reports how many
// slots matched. Playoff rows are mapped by hand.
export async function PATCH(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage drive teams.' },
      { status: actor ? 403 : 401 },
    );
  const parsed = mapSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Choose a valid starting match number.' },
      { status: 400 },
    );
  const organizationId = actor.membership.organizationId;
  const eventId = await currentEventId(organizationId);
  if (!eventId)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const [slots, matches] = await Promise.all([
    env.DB.prepare(
      `SELECT slot_number AS slotNumber FROM drive_team_slots
       WHERE event_id = ? AND phase = 'qual' ORDER BY slot_number`,
    )
      .bind(eventId)
      .all<{ slotNumber: number }>(),
    env.DB.prepare(
      `SELECT id, match_number AS matchNumber FROM matches
       WHERE organization_id = ? AND event_id = ? AND comp_level = 'qm'
       ORDER BY match_number`,
    )
      .bind(organizationId, eventId)
      .all<{ id: string; matchNumber: number }>(),
  ]);
  const mapping = mapSlotsToMatches(
    slots.results.map((slot) => slot.slotNumber),
    parsed.data.startMatchNumber,
    matches.results,
  );
  const now = Date.now();
  const statements = mapping.map(({ slotNumber, matchId }) =>
    env.DB.prepare(
      `UPDATE drive_team_slots SET match_id = ?, updated_at = ?
       WHERE event_id = ? AND phase = 'qual' AND slot_number = ?`,
    ).bind(matchId, now, eventId, slotNumber),
  );
  if (statements.length) statements.push(markDraftChanged(eventId, now));
  await runInChunks(statements);
  return Response.json({
    mapped: mapping.filter((item) => item.matchId).length,
    unmatched: mapping.filter((item) => !item.matchId).length,
  });
}
