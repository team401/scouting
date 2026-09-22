import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  canManageAssignments,
  teamNumberFromTbaKey,
} from '@/lib/scouting-policy';

const schema = z.object({
  matchId: z.string(),
  teamNumber: z.number().int().positive(),
  station: z.string().regex(/^(red|blue)[1-3]$/),
  scoutUserId: z.string(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to manage assignments.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership || !canManageAssignments(membership.role))
    return Response.json(
      { error: 'Only an owner or admin can manage assignments.' },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Invalid assignment.' }, { status: 400 });
  const match = await env.DB.prepare(
    'SELECT id, event_id, alliances FROM matches WHERE id = ? AND organization_id = ?',
  )
    .bind(parsed.data.matchId, membership.organization_id)
    .first<{ id: string; event_id: string; alliances: string }>();
  const scout = await env.DB.prepare(
    'SELECT 1 AS found FROM memberships WHERE organization_id = ? AND user_id = ?',
  )
    .bind(membership.organization_id, parsed.data.scoutUserId)
    .first();
  if (!match || !scout)
    return Response.json(
      { error: 'Match or scout not found.' },
      { status: 404 },
    );
  const alliances = JSON.parse(match.alliances) as Record<
    'red' | 'blue',
    { team_keys: string[] }
  >;
  const color = parsed.data.station.startsWith('red') ? 'red' : 'blue';
  const index = Number(parsed.data.station.at(-1)) - 1;
  if (
    teamNumberFromTbaKey(alliances[color].team_keys[index]) !==
    parsed.data.teamNumber
  )
    return Response.json(
      { error: 'That team is not in the selected station.' },
      { status: 400 },
    );
  const now = Date.now();
  const id = `${match.id}:${parsed.data.station}`;
  await env.DB.prepare(`INSERT INTO scout_assignments (id, organization_id, event_id, match_id, team_number, scout_user_id, station, source, shift_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', NULL, ?, ?) ON CONFLICT(organization_id, match_id, station) DO UPDATE SET team_number = excluded.team_number, scout_user_id = excluded.scout_user_id, source = 'manual', shift_id = NULL, updated_at = excluded.updated_at`)
    .bind(
      id,
      membership.organization_id,
      match.event_id,
      match.id,
      parsed.data.teamNumber,
      parsed.data.scoutUserId,
      parsed.data.station,
      now,
      now,
    )
    .run();
  return Response.json({
    assignment: {
      matchId: match.id,
      teamNumber: parsed.data.teamNumber,
      scoutUserId: parsed.data.scoutUserId,
      station: parsed.data.station,
    },
  });
}
