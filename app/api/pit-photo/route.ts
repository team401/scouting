import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;

async function identity(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare('SELECT organization_id FROM memberships WHERE user_id = ? LIMIT 1')
    .bind(session.user.id).first<{ organization_id: string }>();
  return membership ? { session, organizationId: membership.organization_id } : null;
}

export async function POST(request: Request) {
  const user = await identity(request);
  if (!user) return Response.json({ error: 'Sign in before uploading robot photos.' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('photo');
  const teamNumber = Number(form.get('teamNumber'));
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes)
    return Response.json({ error: 'Choose a JPEG, PNG, or WebP image no larger than 10 MB.' }, { status: 400 });
  if (!Number.isInteger(teamNumber) || teamNumber <= 0) return Response.json({ error: 'Choose a valid team.' }, { status: 400 });

  const event = await env.DB.prepare('SELECT id, tba_event_key FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1')
    .bind(user.organizationId).first<{ id: string; tba_event_key: string }>();
  if (!event) return Response.json({ error: 'Load a current event first.' }, { status: 409 });
  const pitEntry = await env.DB.prepare('SELECT id, photo_object_key FROM pit_entries WHERE organization_id = ? AND event_id = ? AND team_number = ?')
    .bind(user.organizationId, event.id, teamNumber).first<{ id: string; photo_object_key: string | null }>();
  if (!pitEntry) return Response.json({ error: 'Save and synchronize the pit report before uploading its photo.' }, { status: 409 });

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectKey = `${user.organizationId}/${event.tba_event_key}/robots/${teamNumber}/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'private, max-age=3600' }, customMetadata: { teamNumber: String(teamNumber), uploaderUserId: user.session.user.id } });
  const now = Date.now();
  const mediaId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO media (id, organization_id, event_id, match_id, team_number, uploader_user_id, kind, object_key, content_type, bytes, status, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, 'robot_photo', ?, ?, ?, 'ready', ?, ?)`)
      .bind(mediaId, user.organizationId, event.id, teamNumber, user.session.user.id, objectKey, file.type, file.size, now, now),
    env.DB.prepare('UPDATE pit_entries SET photo_object_key = ?, updated_at = ? WHERE id = ?').bind(objectKey, now, pitEntry.id),
  ]);
  if (pitEntry.photo_object_key) await env.FILES.delete(pitEntry.photo_object_key);
  return Response.json({ ok: true, mediaId });
}

export async function GET(request: Request) {
  const user = await identity(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const teamNumber = Number(new URL(request.url).searchParams.get('team'));
  if (!Number.isInteger(teamNumber) || teamNumber <= 0) return new Response('Invalid team', { status: 400 });
  const row = await env.DB.prepare(`SELECT pit_entries.photo_object_key FROM pit_entries JOIN events ON events.id = pit_entries.event_id
    WHERE pit_entries.organization_id = ? AND pit_entries.team_number = ? AND events.is_current = 1 LIMIT 1`)
    .bind(user.organizationId, teamNumber).first<{ photo_object_key: string | null }>();
  if (!row?.photo_object_key) return new Response('Not found', { status: 404 });
  const object = await env.FILES.get(row.photo_object_key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers); headers.set('etag', object.httpEtag); headers.set('cache-control', 'private, max-age=3600');
  return new Response(object.body, { headers });
}
