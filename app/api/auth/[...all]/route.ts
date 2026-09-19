import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { ensureAuthSchema } from '@/lib/ensure-auth-schema';

async function handler(request: Request) {
  await ensureAuthSchema(env.DB);
  return auth.handler(request);
}

export const GET = handler;
export const POST = handler;
