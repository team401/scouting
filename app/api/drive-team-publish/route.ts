import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { draftSlotsWithMatches } from '@/lib/drive-team-schedule';
import { canManageAssignments } from '@/lib/scouting-policy';

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
     FROM drive_team_publications WHERE event_id = ?`,
  )
    .bind(actor.event.id)
    .first<{ publishedAt: number | null; draftUpdatedAt: number }>();
  const draftCount = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM drive_team_slots WHERE event_id = ?',
  )
    .bind(actor.event.id)
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
  // Official matches are mapped automatically, so publishing stores each
  // planned row with the match it maps to right now.
  const slots = await draftSlotsWithMatches(
    env.DB,
    actor.membership.organizationId,
    actor.event.id,
  );
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      'DELETE FROM published_drive_team_slots WHERE event_id = ?',
    ).bind(actor.event.id),
    ...slots.map((slot) =>
      env.DB.prepare(
        `INSERT INTO published_drive_team_slots
         (id, organization_id, event_id, phase, slot_number, driver_user_id, operator_user_id,
          human_player_user_id, technician_user_id, coach_user_id, match_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        slot.id,
        slot.organizationId,
        slot.eventId,
        slot.phase,
        slot.slotNumber,
        slot.driverUserId,
        slot.operatorUserId,
        slot.humanPlayerUserId,
        slot.technicianUserId,
        slot.coachUserId,
        slot.match?.id ?? null,
        slot.createdAt,
        slot.updatedAt,
      ),
    ),
    env.DB.prepare(
      `INSERT INTO drive_team_publications (event_id, published_at, draft_updated_at)
       VALUES (?, ?, ?) ON CONFLICT(event_id) DO UPDATE SET
       published_at = excluded.published_at, draft_updated_at = excluded.draft_updated_at`,
    ).bind(actor.event.id, now, now),
  ];
  // D1 batches are capped, so larger plans are written in chunks. The
  // publication timestamp is written last, after every slot.
  for (let index = 0; index < statements.length; index += 50)
    await env.DB.batch(statements.slice(index, index + 50));
  return Response.json({ publishedAt: now, hasUnpublishedChanges: false });
}

export async function DELETE(request: Request) {
  const actor = await context(request);
  if (!actor)
    return Response.json(
      { error: 'Admin access is required.' },
      { status: 403 },
    );
  if (!actor.event)
    return Response.json({ error: 'Load an event first.' }, { status: 409 });
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM published_drive_team_slots WHERE event_id = ?',
    ).bind(actor.event.id),
    env.DB.prepare(
      `UPDATE drive_team_publications SET published_at = NULL WHERE event_id = ?`,
    ).bind(actor.event.id),
  ]);
  return Response.json({ publishedAt: null, hasUnpublishedChanges: true });
}
