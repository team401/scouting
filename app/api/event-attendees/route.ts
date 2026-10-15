import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';

const updateSchema = z.object({ userIds: z.array(z.string().min(1)) });

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
    return Response.json(
      { error: 'Sign in to view event attendance.' },
      { status: 401 },
    );
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(actor.membership.organizationId)
    .first<{ id: string }>();
  if (!event) return Response.json({ userIds: [], configured: false });
  const rows = await env.DB.prepare(
    'SELECT user_id AS userId FROM event_attendees WHERE event_id = ?',
  )
    .bind(event.id)
    .all<{ userId: string }>();
  const setting = await env.DB.prepare(
    'SELECT 1 FROM event_attendance_settings WHERE event_id = ?',
  )
    .bind(event.id)
    .first();
  return Response.json({
    userIds: rows.results.map((row) => row.userId),
    configured: Boolean(setting) || rows.results.length > 0,
  });
}

export async function PUT(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can set event attendance.' },
      { status: actor ? 403 : 401 },
    );
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Choose a valid event roster.' },
      { status: 400 },
    );
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(actor.membership.organizationId)
    .first<{ id: string }>();
  if (!event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const active = await env.DB.prepare(
    'SELECT user_id AS userId FROM memberships WHERE organization_id = ? AND disabled = 0',
  )
    .bind(actor.membership.organizationId)
    .all<{ userId: string }>();
  const allowed = new Set(active.results.map((row) => row.userId));
  const userIds = [...new Set(parsed.data.userIds)].filter((id) =>
    allowed.has(id),
  );
  const scheduled = await env.DB.prepare(
    `SELECT user_id AS userId FROM event_role_assignments WHERE event_id = ?
     UNION SELECT scout_user_id AS userId FROM scout_shifts WHERE event_id = ?`,
  )
    .bind(event.id, event.id)
    .all<{ userId: string }>();
  const selected = new Set(userIds);
  const removedWithAssignments = scheduled.results.filter(
    (item) => !selected.has(item.userId),
  );
  if (removedWithAssignments.length)
    return Response.json(
      {
        error:
          'Remove this person’s scheduled assignments before removing them from the event roster.',
      },
      { status: 409 },
    );
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM event_attendees WHERE event_id = ?').bind(
      event.id,
    ),
    env.DB.prepare(`INSERT INTO event_attendance_settings (event_id, configured_at) VALUES (?, ?)
      ON CONFLICT(event_id) DO UPDATE SET configured_at = excluded.configured_at`).bind(
      event.id,
      now,
    ),
    ...userIds.map((userId) =>
      env.DB.prepare(
        'INSERT INTO event_attendees (event_id, user_id, created_at) VALUES (?, ?, ?)',
      ).bind(event.id, userId, now),
    ),
  ]);
  return Response.json({ userIds });
}
