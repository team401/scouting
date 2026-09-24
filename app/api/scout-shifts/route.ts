import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';
import { reconcileShiftAssignments } from '@/lib/scout-shifts';

const station = z.enum(['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3']);
const createSchema = z.object({
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive(),
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
  const shifts = await env.DB.prepare(
    `SELECT scout_shifts.id, scout_shifts.station, scout_shifts.scout_user_id AS scoutUserId,
     users.name AS scoutName, scout_shifts.starts_at AS startsAt, scout_shifts.ends_at AS endsAt
     FROM scout_shifts JOIN users ON users.id = scout_shifts.scout_user_id
     WHERE scout_shifts.organization_id = ? AND scout_shifts.event_id = ?
     ORDER BY scout_shifts.starts_at, scout_shifts.station`,
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
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(actor.membership.organizationId)
    .first<{ id: string }>();
  if (!event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
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
  if (
    new Set(parsed.data.assignments.map((item) => item.scoutUserId)).size !==
    parsed.data.assignments.length
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
  if (parsed.data.assignments.some((item) => busyScouts.has(item.scoutUserId)))
    return Response.json(
      { error: 'A selected scout already has a station during this time.' },
      { status: 409 },
    );
  const now = Date.now();
  await env.DB.batch(
    parsed.data.assignments.map((item) => {
      const id = crypto.randomUUID();
      return env.DB.prepare(
        `INSERT INTO scout_shifts
         (id, organization_id, event_id, station, scout_user_id, starts_at, ends_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
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
  );
  await reconcileShiftAssignments(
    env.DB,
    actor.membership.organizationId,
    event.id,
  );
  return Response.json({ created: parsed.data.assignments.length });
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
  await env.DB.prepare(
    'DELETE FROM scout_shifts WHERE organization_id = ? AND event_id = ? AND starts_at = ? AND ends_at = ?',
  )
    .bind(
      actor.membership.organizationId,
      shift.eventId,
      shift.startsAt,
      shift.endsAt,
    )
    .run();
  await reconcileShiftAssignments(
    env.DB,
    actor.membership.organizationId,
    shift.eventId,
  );
  return Response.json({ deleted: true });
}
