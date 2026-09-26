import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { createD1RateLimitStorage } from '@/lib/d1-rate-limit';
import { ensureAuthSchema } from '@/lib/ensure-auth-schema';

const schema = z.object({ email: z.string().email().max(320) });

export async function POST(request: Request) {
  await ensureAuthSchema(env.DB);
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const limit = await createD1RateLimitStorage(env.DB).consume(
    `ops-password-reset:${clientIp}`,
    { window: 300, max: 3 },
  );
  if (!limit.allowed)
    return Response.json(
      { error: 'Too many reset requests. Try again later.' },
      {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfter ?? 300) },
      },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Enter a valid email address.' },
      { status: 400 },
    );
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: parsed.data.email.trim().toLowerCase(),
      }),
    },
  ).catch(() => undefined);
  return Response.json({ sent: true });
}
