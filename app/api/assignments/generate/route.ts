import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canManageAssignments } from '@/lib/scouting-policy';

const schema = z.object({ scoutUserIds: z.array(z.string()).min(1), startMatch: z.number().int().positive().default(1), endMatch: z.number().int().positive().optional() });

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Sign in to generate assignments.' }, { status: 401 });
  const membership = await env.DB.prepare('SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1').bind(session.user.id).first<{ organization_id: string; role: string }>();
  if (!membership || !canManageAssignments(membership.role)) return Response.json({ error: 'Only an owner or admin can generate assignments.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Select at least one scout and a valid match range.' }, { status: 400 });
  const validMembers = await env.DB.prepare(`SELECT user_id FROM memberships WHERE organization_id = ?`).bind(membership.organization_id).all<{ user_id: string }>();
  const validIds = new Set(validMembers.results.map((item) => item.user_id));
  if (parsed.data.scoutUserIds.some((id) => !validIds.has(id))) return Response.json({ error: 'One or more scouts are not team members.' }, { status: 400 });
  const event = await env.DB.prepare('SELECT id FROM events WHERE organization_id = ? AND is_current = 1').bind(membership.organization_id).first<{ id: string }>();
  if (!event) return Response.json({ error: 'Load a current event first.' }, { status: 409 });
  const matches = await env.DB.prepare(`SELECT id, match_number, alliances FROM matches WHERE organization_id = ? AND event_id = ? AND comp_level = 'qm' AND match_number >= ? AND match_number <= ? ORDER BY match_number`)
    .bind(membership.organization_id, event.id, parsed.data.startMatch, parsed.data.endMatch ?? 999).all<{ id: string; match_number: number; alliances: string }>();
  const now = Date.now();
  const statements = matches.results.flatMap((match, matchIndex) => {
    const alliances = JSON.parse(match.alliances) as Record<'red' | 'blue', { team_keys: string[] }>;
    return (['red', 'blue'] as const).flatMap((color, colorIndex) => alliances[color].team_keys.map((key, index) => {
      const slot = colorIndex * 3 + index;
      const station = `${color}${index + 1}`;
      const scoutUserId = parsed.data.scoutUserIds[(matchIndex * 6 + slot) % parsed.data.scoutUserIds.length];
      return env.DB.prepare(`INSERT INTO scout_assignments (id, organization_id, event_id, match_id, team_number, scout_user_id, station, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(organization_id, match_id, station) DO UPDATE SET team_number = excluded.team_number, scout_user_id = excluded.scout_user_id, updated_at = excluded.updated_at`)
        .bind(`${match.id}:${station}`, membership.organization_id, event.id, match.id, Number(key.replace('frc', '')), scoutUserId, station, now, now);
    }));
  });
  for (let index = 0; index < statements.length; index += 50) await env.DB.batch(statements.slice(index, index + 50));
  return Response.json({ matchesAssigned: matches.results.length, slotsAssigned: statements.length });
}
