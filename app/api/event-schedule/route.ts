import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { roleEnabled } from '@/lib/event-coverage';
import { eventRoleNames } from '@/lib/event-roles';
import { canManageAssignments } from '@/lib/scouting-policy';

const createSchema = z.object({
  userId: z.string().min(1),
  role: z.string().refine((value) => eventRoleNames.includes(value as never)),
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

async function actor(request: Request) {
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
  const identity = await actor(request);
  if (!identity)
    return Response.json(
      { error: 'Sign in to view the event schedule.' },
      { status: 401 },
    );
  const event = await env.DB.prepare(
    `SELECT id, scouting_enabled AS scoutingEnabled,
      outreach_enabled AS outreachEnabled
     FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1`,
  )
    .bind(identity.membership.organizationId)
    .first<{ id: string }>();
  if (!event) return Response.json({ assignments: [] });
  const all =
    canManageAssignments(identity.membership.role) &&
    new URL(request.url).searchParams.get('all') === '1';
  const assignmentTable = all
    ? 'event_role_assignments'
    : 'published_event_role_assignments';
  const result = await env.DB.prepare(
    `SELECT assignments.id, assignments.user_id AS userId,
      users.name AS userName, assignments.role,
      assignments.starts_at AS startsAt, assignments.ends_at AS endsAt
     FROM ${assignmentTable} assignments
     JOIN users ON users.id = assignments.user_id
     WHERE assignments.organization_id = ? AND assignments.event_id = ?
       ${all ? '' : 'AND assignments.user_id = ?'}
     ORDER BY assignments.starts_at, users.name`,
  )
    .bind(
      ...(all
        ? [identity.membership.organizationId, event.id]
        : [
            identity.membership.organizationId,
            event.id,
            identity.session.user.id,
          ]),
    )
    .all();
  const scoutCounts = all
    ? await env.DB.prepare(
        `SELECT scout_user_id AS userId, COUNT(*) AS count FROM scout_shifts
         WHERE organization_id = ? AND event_id = ? GROUP BY scout_user_id`,
      )
        .bind(identity.membership.organizationId, event.id)
        .all()
    : { results: [] };
  return Response.json({
    assignments: result.results,
    scoutCounts: scoutCounts.results,
  });
}

export async function POST(request: Request) {
  const identity = await actor(request);
  if (!identity || !canManageAssignments(identity.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage the event schedule.' },
      { status: identity ? 403 : 401 },
    );
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    return Response.json(
      { error: 'Choose a person, role, and valid time range.' },
      { status: 400 },
    );
  const event = await env.DB.prepare(
    `SELECT id, scouting_enabled AS scoutingEnabled,
      outreach_enabled AS outreachEnabled
     FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1`,
  )
    .bind(identity.membership.organizationId)
    .first<{ id: string; scoutingEnabled: number; outreachEnabled: number }>();
  if (!event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const dayControls = parsed.data.date
    ? await env.DB.prepare(
        `SELECT scouting_enabled AS scoutingEnabled,
          outreach_enabled AS outreachEnabled
         FROM event_schedule_days WHERE event_id = ? AND date = ?`,
      )
        .bind(event.id, parsed.data.date)
        .first<{ scoutingEnabled: number; outreachEnabled: number }>()
    : null;
  if (
    !roleEnabled(parsed.data.role, {
      scoutingEnabled: Boolean(
        dayControls?.scoutingEnabled ?? event.scoutingEnabled,
      ),
      outreachEnabled: Boolean(
        dayControls?.outreachEnabled ?? event.outreachEnabled,
      ),
    })
  )
    return Response.json(
      { error: 'That role is turned off for this event.' },
      { status: 400 },
    );
  const member = await env.DB.prepare(
    'SELECT 1 FROM memberships WHERE organization_id = ? AND user_id = ? AND disabled = 0',
  )
    .bind(identity.membership.organizationId, parsed.data.userId)
    .first();
  if (!member)
    return Response.json(
      { error: 'That person is not an active member.' },
      { status: 400 },
    );
  const attendeeCount = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM event_attendees WHERE event_id = ?',
  )
    .bind(event.id)
    .first<{ count: number }>();
  const attendanceConfigured = await env.DB.prepare(
    'SELECT 1 FROM event_attendance_settings WHERE event_id = ?',
  )
    .bind(event.id)
    .first();
  if (attendanceConfigured || Number(attendeeCount?.count ?? 0) > 0) {
    const attendee = await env.DB.prepare(
      'SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ?',
    )
      .bind(event.id, parsed.data.userId)
      .first();
    if (!attendee)
      return Response.json(
        { error: 'That person is not on this event roster.' },
        { status: 400 },
      );
  }
  const conflict = await env.DB.prepare(
    `SELECT 'event role' AS source FROM event_role_assignments
       WHERE organization_id = ? AND event_id = ? AND user_id = ? AND starts_at < ? AND ends_at > ?
     UNION ALL
     SELECT 'scouting shift' AS source FROM scout_shifts
       WHERE organization_id = ? AND event_id = ? AND scout_user_id = ? AND starts_at < ? AND ends_at > ?
     LIMIT 1`,
  )
    .bind(
      identity.membership.organizationId,
      event.id,
      parsed.data.userId,
      parsed.data.endsAt,
      parsed.data.startsAt,
      identity.membership.organizationId,
      event.id,
      parsed.data.userId,
      parsed.data.endsAt,
      parsed.data.startsAt,
    )
    .first<{ source: string }>();
  if (conflict)
    return Response.json(
      { error: `That person already has an overlapping ${conflict.source}.` },
      { status: 409 },
    );
  const now = Date.now();
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO event_role_assignments
       (id, organization_id, event_id, user_id, role, starts_at, ends_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      identity.membership.organizationId,
      event.id,
      parsed.data.userId,
      parsed.data.role,
      parsed.data.startsAt,
      parsed.data.endsAt,
      identity.session.user.id,
      now,
      now,
    ),
    env.DB.prepare(
      `INSERT INTO event_schedule_publications (event_id, draft_updated_at)
       VALUES (?, ?) ON CONFLICT(event_id) DO UPDATE SET draft_updated_at = excluded.draft_updated_at`,
    ).bind(event.id, now),
  ]);
  return Response.json({
    assignment: {
      id,
      userId: parsed.data.userId,
      role: parsed.data.role,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    },
  });
}

export async function DELETE(request: Request) {
  const identity = await actor(request);
  if (!identity || !canManageAssignments(identity.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage the event schedule.' },
      { status: identity ? 403 : 401 },
    );
  const id = new URL(request.url).searchParams.get('id');
  if (!id)
    return Response.json({ error: 'Choose a schedule item.' }, { status: 400 });
  const assignment = await env.DB.prepare(
    'SELECT event_id AS eventId FROM event_role_assignments WHERE id = ? AND organization_id = ?',
  )
    .bind(id, identity.membership.organizationId)
    .first<{ eventId: string }>();
  if (!assignment)
    return Response.json(
      { error: 'Schedule item not found.' },
      { status: 404 },
    );
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM event_role_assignments WHERE id = ? AND organization_id = ?',
    ).bind(id, identity.membership.organizationId),
    env.DB.prepare(
      `INSERT INTO event_schedule_publications (event_id, draft_updated_at)
       VALUES (?, ?) ON CONFLICT(event_id) DO UPDATE SET draft_updated_at = excluded.draft_updated_at`,
    ).bind(assignment.eventId, now),
  ]);
  return Response.json({ deleted: true });
}
