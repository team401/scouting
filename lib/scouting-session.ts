import { env } from 'cloudflare:workers';

const COOKIE_NAME = 'team401-scouting-session';
const SESSION_LENGTH_MS = 24 * 60 * 60 * 1000;

export type ScoutingSession = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  };
};

function cookieValue(headers: Headers) {
  const cookie = headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(value.join('='));
  }
  return null;
}

export async function getSessionFromHeaders(
  headers: Headers,
): Promise<ScoutingSession | null> {
  const token = cookieValue(headers);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT sessions.id AS sessionId, sessions.user_id AS userId, sessions.expires_at AS expiresAt,
     sessions.created_at AS createdAt, sessions.updated_at AS updatedAt, sessions.ip_address AS ipAddress,
     sessions.user_agent AS userAgent, users.email, users.name, users.email_verified AS emailVerified
     FROM sessions JOIN users ON users.id = sessions.user_id
     JOIN memberships ON memberships.user_id = users.id
     WHERE sessions.token = ? AND sessions.expires_at > ?
       AND memberships.organization_id = 'team-401' AND memberships.disabled = 0
     LIMIT 1`,
  )
    .bind(token, Date.now())
    .first<{
      sessionId: string;
      userId: string;
      expiresAt: number;
      createdAt: number;
      updatedAt: number;
      ipAddress: string | null;
      userAgent: string | null;
      email: string;
      name: string;
      emailVerified: number;
    }>();
  if (!row) return null;
  return {
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      emailVerified: Boolean(row.emailVerified),
    },
    session: {
      id: row.sessionId,
      userId: row.userId,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    },
  };
}

export async function createScoutingSession(
  request: Request,
  userId: string,
  maximumExpiresAt?: number,
) {
  const id = crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const now = Date.now();
  const expiresAt = Math.min(
    now + SESSION_LENGTH_MS,
    maximumExpiresAt ?? Number.POSITIVE_INFINITY,
  );
  await env.DB.prepare(
    `INSERT INTO sessions (id, expires_at, token, ip_address, user_agent, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      expiresAt,
      token,
      request.headers.get('cf-connecting-ip'),
      request.headers.get('user-agent'),
      userId,
      now,
      now,
    )
    .run();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const maxAge = Math.max(0, Math.floor((expiresAt - now) / 1000));
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function revokeCurrentSession(headers: Headers) {
  const token = cookieValue(headers);
  if (token)
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?')
      .bind(token)
      .run();
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
