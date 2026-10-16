import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';

const updateSchema = z.object({
  scoutingEnabled: z.boolean(),
  outreachEnabled: z.boolean(),
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
    return Response.json(
      { error: 'Sign in to view event controls.' },
      { status: 401 },
    );
  const event = await env.DB.prepare(
    `SELECT scouting_enabled AS scoutingEnabled, outreach_enabled AS outreachEnabled
     FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1`,
  )
    .bind(actor.membership.organizationId)
    .first<{ scoutingEnabled: number; outreachEnabled: number }>();
  return Response.json({
    scoutingEnabled: event ? Boolean(event.scoutingEnabled) : true,
    outreachEnabled: event ? Boolean(event.outreachEnabled) : true,
  });
}

export async function PUT(request: Request) {
  const actor = await identity(request);
  if (!actor || !canManageAssignments(actor.membership.role))
    return Response.json(
      { error: 'Only an owner or admin can change event controls.' },
      { status: actor ? 403 : 401 },
    );
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Choose valid event controls.' },
      { status: 400 },
    );
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(actor.membership.organizationId)
    .first<{ id: string }>();
  if (!event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  await env.DB.prepare(
    'UPDATE events SET scouting_enabled = ?, outreach_enabled = ?, updated_at = ? WHERE id = ?',
  )
    .bind(
      parsed.data.scoutingEnabled ? 1 : 0,
      parsed.data.outreachEnabled ? 1 : 0,
      Date.now(),
      event.id,
    )
    .run();
  return Response.json(parsed.data);
}
