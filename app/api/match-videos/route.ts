import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const allowedTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const uploadRoles = new Set(['owner', 'admin', 'strategy', 'video']);
const maxBytes = 2 * 1024 * 1024 * 1024;

const initSchema = z.object({
  action: z.literal('init'),
  matchId: z.string().min(1),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  bytes: z.number().int().positive().max(maxBytes),
});
const completeSchema = z.object({
  action: z.literal('complete'),
  mediaId: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({ partNumber: z.number().int().positive(), etag: z.string() }),
    )
    .min(1)
    .max(400),
});

async function identity(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    'SELECT organization_id, role, disabled FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string; disabled: number }>();
  return membership && !membership.disabled
    ? {
        userId: session.user.id,
        organizationId: membership.organization_id,
        role: membership.role,
      }
    : null;
}

async function ownedUpload(mediaId: string, organizationId: string) {
  return env.DB.prepare(
    `SELECT id, object_key AS objectKey, uploader_user_id AS uploaderUserId, status
     FROM media WHERE id = ? AND organization_id = ? AND kind = 'match_video'`,
  )
    .bind(mediaId, organizationId)
    .first<{
      id: string;
      objectKey: string;
      uploaderUserId: string;
      status: string;
    }>();
}

export async function GET(request: Request) {
  const user = await identity(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const url = new URL(request.url);
  const mediaId = url.searchParams.get('mediaId');
  if (mediaId) {
    const media = await ownedUpload(mediaId, user.organizationId);
    if (!media || media.status !== 'ready')
      return new Response('Not found', { status: 404 });
    const rangeHeader = request.headers.get('range');
    const metadata = await env.FILES.head(media.objectKey);
    if (!metadata) return new Response('Not found', { status: 404 });
    const match = rangeHeader?.match(/^bytes=(\d+)-(\d*)$/);
    const start = match ? Number(match[1]) : 0;
    const requestedEnd = match?.[2] ? Number(match[2]) : metadata.size - 1;
    const end = Math.min(requestedEnd, metadata.size - 1);
    if (match && (start < 0 || start > end))
      return new Response('Invalid range', {
        status: 416,
        headers: { 'content-range': `bytes */${metadata.size}` },
      });
    const object = await env.FILES.get(
      media.objectKey,
      match ? { range: { offset: start, length: end - start + 1 } } : undefined,
    );
    if (!object || !('body' in object))
      return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', 'private, max-age=3600');
    if (match) {
      headers.set('content-range', `bytes ${start}-${end}/${metadata.size}`);
      headers.set('content-length', String(end - start + 1));
      return new Response(object.body, { status: 206, headers });
    }
    headers.set('content-length', String(object.size));
    return new Response(object.body, { headers });
  }

  const matchId = url.searchParams.get('matchId');
  if (!matchId)
    return Response.json({ error: 'Choose a match.' }, { status: 400 });
  const match = await env.DB.prepare(
    'SELECT id FROM matches WHERE id = ? AND organization_id = ?',
  )
    .bind(matchId, user.organizationId)
    .first();
  if (!match)
    return Response.json({ error: 'Match not found.' }, { status: 404 });
  const videos = await env.DB.prepare(
    `SELECT media.id, media.content_type AS contentType, media.bytes, media.created_at AS createdAt,
      media.uploader_user_id AS uploaderUserId, users.name AS uploaderName
     FROM media JOIN users ON users.id = media.uploader_user_id
     WHERE media.organization_id = ? AND media.match_id = ? AND media.kind = 'match_video' AND media.status = 'ready'
     ORDER BY media.created_at DESC`,
  )
    .bind(user.organizationId, matchId)
    .all<{
      id: string;
      contentType: string;
      bytes: number;
      createdAt: number;
      uploaderUserId: string;
      uploaderName: string;
    }>();
  return Response.json({
    videos: videos.results,
    canUpload: uploadRoles.has(user.role),
    canDeleteAny: ['owner', 'admin'].includes(user.role),
    userId: user.userId,
  });
}

export async function POST(request: Request) {
  const user = await identity(request);
  if (!user)
    return Response.json(
      { error: 'Sign in to manage match videos.' },
      { status: 401 },
    );
  if (!uploadRoles.has(user.role))
    return Response.json(
      { error: 'Your role cannot upload match videos.' },
      { status: 403 },
    );
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'part') {
    const mediaId = url.searchParams.get('mediaId') ?? '';
    const uploadId = url.searchParams.get('uploadId') ?? '';
    const partNumber = Number(url.searchParams.get('partNumber'));
    const media = await ownedUpload(mediaId, user.organizationId);
    if (
      !media ||
      media.status !== 'uploading' ||
      media.uploaderUserId !== user.userId ||
      !uploadId ||
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > 400 ||
      !request.body
    )
      return Response.json({ error: 'Invalid upload part.' }, { status: 400 });
    const upload = env.FILES.resumeMultipartUpload(media.objectKey, uploadId);
    const part = await upload.uploadPart(partNumber, request.body);
    return Response.json(part);
  }

  const body = await request.json().catch(() => null);
  if (action === 'complete') {
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        { error: 'Invalid completion request.' },
        { status: 400 },
      );
    const media = await ownedUpload(parsed.data.mediaId, user.organizationId);
    if (
      !media ||
      media.status !== 'uploading' ||
      media.uploaderUserId !== user.userId
    )
      return Response.json({ error: 'Upload not found.' }, { status: 404 });
    const upload = env.FILES.resumeMultipartUpload(
      media.objectKey,
      parsed.data.uploadId,
    );
    await upload.complete(parsed.data.parts);
    await env.DB.prepare(
      "UPDATE media SET status = 'ready', updated_at = ? WHERE id = ?",
    )
      .bind(Date.now(), media.id)
      .run();
    return Response.json({ ok: true, mediaId: media.id });
  }

  const parsed = initSchema.safeParse(body);
  if (!parsed.success || !allowedTypes.has(parsed.data?.contentType ?? ''))
    return Response.json(
      { error: 'Choose an MP4, WebM, or MOV video no larger than 2 GB.' },
      { status: 400 },
    );
  const match = await env.DB.prepare(
    `SELECT matches.id, matches.event_id AS eventId, events.tba_event_key AS eventKey
     FROM matches JOIN events ON events.id = matches.event_id
     WHERE matches.id = ? AND matches.organization_id = ? AND events.is_current = 1`,
  )
    .bind(parsed.data.matchId, user.organizationId)
    .first<{ id: string; eventId: string; eventKey: string }>();
  if (!match)
    return Response.json(
      { error: 'Choose a current-event match.' },
      { status: 404 },
    );
  const extension =
    parsed.data.fileName
      .split('.')
      .at(-1)
      ?.replace(/[^a-z0-9]/gi, '') || 'mp4';
  const mediaId = crypto.randomUUID();
  const objectKey = `${user.organizationId}/${match.eventKey}/matches/${match.id}/${mediaId}.${extension}`;
  const upload = await env.FILES.createMultipartUpload(objectKey, {
    httpMetadata: {
      contentType: parsed.data.contentType,
      cacheControl: 'private, max-age=3600',
    },
    customMetadata: {
      uploaderUserId: user.userId,
      originalName: parsed.data.fileName,
    },
  });
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO media (id, organization_id, event_id, match_id, team_number, uploader_user_id, kind, object_key, content_type, bytes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, 'match_video', ?, ?, ?, 'uploading', ?, ?)`,
  )
    .bind(
      mediaId,
      user.organizationId,
      match.eventId,
      match.id,
      user.userId,
      objectKey,
      parsed.data.contentType,
      parsed.data.bytes,
      now,
      now,
    )
    .run();
  return Response.json({ mediaId, uploadId: upload.uploadId });
}

export async function DELETE(request: Request) {
  const user = await identity(request);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const url = new URL(request.url);
  const mediaId = url.searchParams.get('mediaId') ?? '';
  const uploadId = url.searchParams.get('uploadId');
  const media = await ownedUpload(mediaId, user.organizationId);
  if (!media)
    return Response.json({ error: 'Video not found.' }, { status: 404 });
  if (
    media.uploaderUserId !== user.userId &&
    !['owner', 'admin'].includes(user.role)
  )
    return Response.json(
      { error: 'You cannot delete this video.' },
      { status: 403 },
    );
  if (media.status === 'uploading' && uploadId) {
    await env.FILES.resumeMultipartUpload(media.objectKey, uploadId).abort();
  } else {
    await env.FILES.delete(media.objectKey);
  }
  await env.DB.prepare('DELETE FROM media WHERE id = ? AND organization_id = ?')
    .bind(media.id, user.organizationId)
    .run();
  return Response.json({ ok: true });
}
