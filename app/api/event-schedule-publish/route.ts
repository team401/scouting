import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';
import { reconcileShiftAssignments } from '@/lib/scout-shifts';

async function context(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    `SELECT organization_id AS organizationId, role FROM memberships
     WHERE user_id = ? AND disabled = 0 LIMIT 1`,
  )
    .bind(session.user.id)
    .first<{ organizationId: string; role: string }>();
  if (!membership || !canManageAssignments(membership.role)) return null;
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
      { error: 'Admin access is required.' },
      { status: 403 },
    );
  if (!actor.event)
    return Response.json({ publishedAt: null, hasUnpublishedChanges: false });
  const publication = await env.DB.prepare(
    `SELECT published_at AS publishedAt, draft_updated_at AS draftUpdatedAt
     FROM event_schedule_publications WHERE event_id = ?`,
  )
    .bind(actor.event.id)
    .first<{ publishedAt: number | null; draftUpdatedAt: number }>();
  const draftCount = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM event_role_assignments WHERE event_id = ?) +
      (SELECT COUNT(*) FROM scout_shifts WHERE event_id = ?) AS count`,
  )
    .bind(actor.event.id, actor.event.id)
    .first<{ count: number }>();
  return Response.json({
    publishedAt: publication?.publishedAt ?? null,
    hasUnpublishedChanges: publication
      ? publication.publishedAt === null ||
        publication.draftUpdatedAt > publication.publishedAt
      : Number(draftCount?.count ?? 0) > 0,
  });
}

export async function POST(request: Request) {
  const actor = await context(request);
  if (!actor)
    return Response.json(
      { error: 'Admin access is required.' },
      { status: 403 },
    );
  if (!actor.event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM published_event_role_assignments WHERE event_id = ?',
    ).bind(actor.event.id),
    env.DB.prepare(
      'DELETE FROM published_scout_shifts WHERE event_id = ?',
    ).bind(actor.event.id),
    env.DB.prepare(
      `INSERT INTO published_event_role_assignments
       (id, organization_id, event_id, user_id, role, starts_at, ends_at, created_at, updated_at)
       SELECT id, organization_id, event_id, user_id, role, starts_at, ends_at, created_at, updated_at
       FROM event_role_assignments WHERE event_id = ?`,
    ).bind(actor.event.id),
    env.DB.prepare(
      `INSERT INTO published_scout_shifts
       (id, organization_id, event_id, station, scout_user_id, starts_at, ends_at, created_at, updated_at)
       SELECT id, organization_id, event_id, station, scout_user_id, starts_at, ends_at, created_at, updated_at
       FROM scout_shifts WHERE event_id = ?`,
    ).bind(actor.event.id),
    env.DB.prepare(
      `INSERT INTO event_schedule_publications (event_id, published_at, draft_updated_at)
       VALUES (?, ?, ?) ON CONFLICT(event_id) DO UPDATE SET
       published_at = excluded.published_at, draft_updated_at = excluded.draft_updated_at`,
    ).bind(actor.event.id, now, now),
  ]);
  await reconcileShiftAssignments(
    env.DB,
    actor.membership.organizationId,
    actor.event.id,
  );
  return Response.json({ publishedAt: now, hasUnpublishedChanges: false });
}
