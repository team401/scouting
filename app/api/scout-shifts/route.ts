import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';

const station = z.enum(['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3']);
const createSchema = z.object({
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  assignments: z
    .array(z.object({ station, scoutUserId: z.string().min(1) }))
    .min(1),
});

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

export async function GET(request: Request) {
  const actor = await identity(request);
  if (!actor)
    return Response.json({ error: 'Sign in to view shifts.' }, { status: 401 });
  const event = await env.DB.prepare(
    'SELECT id, timezone FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(actor.membership.organizationId)
    .first<{ id: string; timezone: string | null }>();
  if (!event) return Response.json({ shifts: [], timezone: null });
  const all =
    canManageAssignments(actor.membership.role) &&
    new URL(request.url).searchParams.get('all') === '1';
  const shiftTable = all ? 'scout_shifts' : 'published_scout_shifts';
  const shifts = await env.DB.prepare(
    `SELECT shifts.id, shifts.station, shifts.scout_user_id AS scoutUserId,
     users.name AS scoutName, shifts.starts_at AS startsAt, shifts.ends_at AS endsAt
     FROM ${shiftTable} shifts JOIN users ON users.id = shifts.scout_user_id
     WHERE shifts.organization_id = ? AND shifts.event_id = ?
     ORDER BY shifts.starts_at, shifts.station`,
  )
    .bind(actor.membership.organizationId, event.id)
    .all();
  return Response.json({ shifts: shifts.results, timezone: event.timezone });
}

export async function POST(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage shifts.' },
      { status: actor ? 403 : 401 },
    );
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    return Response.json(
      { error: 'Choose a valid shift time and scouts.' },
      { status: 400 },
    );
  if (
    new Set(parsed.data.assignments.map((item) => item.station)).size !==
    parsed.data.assignments.length
  )
    return Response.json(
      { error: 'Each station can only appear once in a shift.' },
      { status: 400 },
    );
  const event = await env.DB.prepare(
    'SELECT id, scouting_enabled AS scoutingEnabled FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(actor.membership.organizationId)
    .first<{ id: string; scoutingEnabled: number }>();
  if (!event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const day = parsed.data.date
    ? await env.DB.prepare(
        'SELECT scouting_enabled AS scoutingEnabled FROM event_schedule_days WHERE event_id = ? AND date = ?',
      )
        .bind(event.id, parsed.data.date)
        .first<{ scoutingEnabled: number }>()
    : null;
  if (!(day?.scoutingEnabled ?? event.scoutingEnabled))
    return Response.json(
      { error: 'Scouting is turned off for this event.' },
      { status: 400 },
    );
  const memberRows = await env.DB.prepare(
    'SELECT user_id AS userId FROM memberships WHERE organization_id = ? AND disabled = 0',
  )
    .bind(actor.membership.organizationId)
    .all<{ userId: string }>();
  const members = new Set(memberRows.results.map((item) => item.userId));
  if (parsed.data.assignments.some((item) => !members.has(item.scoutUserId)))
    return Response.json(
      { error: 'One or more scouts are unavailable.' },
      { status: 400 },
    );
  const attendeeRows = await env.DB.prepare(
    'SELECT user_id AS userId FROM event_attendees WHERE event_id = ?',
  )
    .bind(event.id)
    .all<{ userId: string }>();
  const attendees = new Set(attendeeRows.results.map((item) => item.userId));
  const attendanceConfigured = await env.DB.prepare(
    'SELECT 1 FROM event_attendance_settings WHERE event_id = ?',
  )
    .bind(event.id)
    .first();
  if (
    (attendanceConfigured || attendees.size > 0) &&
    parsed.data.assignments.some((item) => !attendees.has(item.scoutUserId))
  )
    return Response.json(
      { error: 'One or more selected scouts are not on this event roster.' },
      { status: 400 },
    );
  const individualAssignments = parsed.data.assignments.filter(
    (item) => !item.scoutUserId.startsWith('guest:'),
  );
  if (
    new Set(individualAssignments.map((item) => item.scoutUserId)).size !==
    individualAssignments.length
  )
    return Response.json(
      { error: 'A scout cannot cover two stations during the same shift.' },
      { status: 400 },
    );
  const overlaps = await env.DB.prepare(
    `SELECT station, scout_user_id AS scoutUserId FROM scout_shifts WHERE organization_id = ? AND event_id = ?
     AND starts_at < ? AND ends_at > ?`,
  )
    .bind(
      actor.membership.organizationId,
      event.id,
      parsed.data.endsAt,
      parsed.data.startsAt,
    )
    .all<{ station: string; scoutUserId: string }>();
  const overlapStations = new Set(overlaps.results.map((item) => item.station));
  if (parsed.data.assignments.some((item) => overlapStations.has(item.station)))
    return Response.json(
      {
        error:
          'This time overlaps an existing assignment for one or more stations.',
      },
      { status: 409 },
    );
  const busyScouts = new Set(overlaps.results.map((item) => item.scoutUserId));
  if (
    parsed.data.assignments.some(
      (item) =>
        !item.scoutUserId.startsWith('guest:') &&
        busyScouts.has(item.scoutUserId),
    )
  )
    return Response.json(
      { error: 'A selected scout already has a station during this time.' },
      { status: 409 },
    );
  const eventRoleConflicts = await env.DB.prepare(
    `SELECT user_id AS userId FROM event_role_assignments
     WHERE organization_id = ? AND event_id = ? AND starts_at < ? AND ends_at > ?`,
  )
    .bind(
      actor.membership.organizationId,
      event.id,
      parsed.data.endsAt,
      parsed.data.startsAt,
    )
    .all<{ userId: string }>();
  const roleBusy = new Set(
    eventRoleConflicts.results.map((item) => item.userId),
  );
  if (parsed.data.assignments.some((item) => roleBusy.has(item.scoutUserId)))
    return Response.json(
      {
        error:
          'A selected scout already has another event role during this time.',
      },
      { status: 409 },
    );
  const now = Date.now();
  const created = parsed.data.assignments.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
  }));
  await env.DB.batch([
    ...created.map((item) => {
      return env.DB.prepare(
        `INSERT INTO scout_shifts
         (id, organization_id, event_id, station, scout_user_id, starts_at, ends_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        item.id,
        actor.membership.organizationId,
        event.id,
        item.station,
        item.scoutUserId,
        parsed.data.startsAt,
        parsed.data.endsAt,
        now,
        now,
      );
    }),
    env.DB.prepare(
      `INSERT INTO event_schedule_publications (event_id, draft_updated_at)
       VALUES (?, ?) ON CONFLICT(event_id) DO UPDATE SET draft_updated_at = excluded.draft_updated_at`,
    ).bind(event.id, now),
  ]);
  return Response.json({
    shifts: created.map((item) => ({
      id: item.id,
      station: item.station,
      scoutUserId: item.scoutUserId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    })),
  });
}

export async function DELETE(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage shifts.' },
      { status: actor ? 403 : 401 },
    );
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Choose a shift.' }, { status: 400 });
  const shift = await env.DB.prepare(
    'SELECT event_id AS eventId, starts_at AS startsAt, ends_at AS endsAt FROM scout_shifts WHERE id = ? AND organization_id = ?',
  )
    .bind(id, actor.membership.organizationId)
    .first<{ eventId: string; startsAt: number; endsAt: number }>();
  if (!shift)
    return Response.json({ error: 'Shift not found.' }, { status: 404 });
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM scout_shifts WHERE id = ? AND organization_id = ?',
    ).bind(id, actor.membership.organizationId),
    env.DB.prepare(
      `INSERT INTO event_schedule_publications (event_id, draft_updated_at)
       VALUES (?, ?) ON CONFLICT(event_id) DO UPDATE SET draft_updated_at = excluded.draft_updated_at`,
    ).bind(shift.eventId, now),
  ]);
  return Response.json({ deleted: true });
}
