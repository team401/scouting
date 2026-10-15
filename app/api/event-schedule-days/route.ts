import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
});

async function context(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    'SELECT organization_id AS organizationId, role FROM memberships WHERE user_id = ? AND disabled = 0 LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organizationId: string; role: string }>();
  if (!membership) return null;
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(membership.organizationId)
    .first<{ id: string }>();
  return { membership, event };
}

export async function GET(request: Request) {
  const actor = await context(request);
  if (!actor)
    return Response.json(
      { error: 'Sign in to view schedule days.' },
      { status: 401 },
    );
  if (!actor.event) return Response.json({ days: [] });
  const days = await env.DB.prepare(
    'SELECT date, start_hour AS startHour, end_hour AS endHour FROM event_schedule_days WHERE event_id = ? ORDER BY date',
  )
    .bind(actor.event.id)
    .all();
  return Response.json({ days: days.results });
}

export async function PUT(request: Request) {
  const actor = await context(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can configure event days.' },
      { status: actor ? 403 : 401 },
    );
  if (!actor.event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const parsed = daySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.endHour <= parsed.data.startHour)
    return Response.json(
      { error: 'Choose a valid day and time range.' },
      { status: 400 },
    );
  await env.DB.prepare(
    `INSERT INTO event_schedule_days (event_id, date, start_hour, end_hour)
     VALUES (?, ?, ?, ?) ON CONFLICT(event_id, date) DO UPDATE SET
     start_hour = excluded.start_hour, end_hour = excluded.end_hour`,
  )
    .bind(
      actor.event.id,
      parsed.data.date,
      parsed.data.startHour,
      parsed.data.endHour,
    )
    .run();
  return Response.json({ day: parsed.data });
}

export async function DELETE(request: Request) {
  const actor = await context(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can configure event days.' },
      { status: actor ? 403 : 401 },
    );
  if (!actor.event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const date = new URL(request.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: 'Choose an event day.' }, { status: 400 });
  await env.DB.prepare(
    'DELETE FROM event_schedule_days WHERE event_id = ? AND date = ?',
  )
    .bind(actor.event.id, date)
    .run();
  return Response.json({ deleted: true });
}
