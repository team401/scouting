import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  FRC_DEMO_TEAM_MAX,
  FRC_DEMO_TEAM_MIN,
  isOffseasonDemoTeam,
} from '@/lib/event-team-aliases';

const updateSchema = z.object({
  eventKey: z.string().trim().min(1).max(50),
  teamNumber: z.number().int().min(FRC_DEMO_TEAM_MIN).max(FRC_DEMO_TEAM_MAX),
  name: z.string().trim().max(100).nullable(),
});

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to update event team names.' },
      { status: 401 },
    );

  const membership = await env.DB.prepare(
    `SELECT memberships.organization_id AS organizationId, memberships.role
     FROM memberships WHERE memberships.user_id = ? LIMIT 1`,
  )
    .bind(session.user.id)
    .first<{ organizationId: string; role: string }>();
  if (!membership || !['owner', 'admin'].includes(membership.role))
    return Response.json(
      { error: 'Owner or admin access is required.' },
      { status: 403 },
    );

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Choose a demo team and enter a name up to 100 characters.' },
      { status: 400 },
    );

  const event = await env.DB.prepare(
    `SELECT id, event_type AS eventType FROM events
     WHERE organization_id = ? AND tba_event_key = ? LIMIT 1`,
  )
    .bind(membership.organizationId, parsed.data.eventKey)
    .first<{ id: string; eventType: number | null }>();
  if (!event)
    return Response.json(
      { error: 'That event is not available.' },
      { status: 404 },
    );
  if (!isOffseasonDemoTeam(event.eventType, parsed.data.teamNumber))
    return Response.json(
      { error: 'Demo-team names can only be changed for offseason events.' },
      { status: 400 },
    );

  const name = parsed.data.name || null;
  const result = await env.DB.prepare(
    `UPDATE event_teams SET name_override = ?, updated_at = ?
     WHERE organization_id = ? AND event_id = ? AND team_number = ?`,
  )
    .bind(
      name,
      Date.now(),
      membership.organizationId,
      event.id,
      parsed.data.teamNumber,
    )
    .run();
  if (!result.meta.changes)
    return Response.json(
      { error: 'That demo team is not on the current event roster.' },
      { status: 404 },
    );

  return Response.json({ teamNumber: parsed.data.teamNumber, name });
}
