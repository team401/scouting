import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
}

async function inviteCodeMatches(candidate: string, expected: string) {
  const [left, right] = await Promise.all([
    digest(candidate),
    digest(expected),
  ]);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export const auth = betterAuth({
  database: env.DB,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== '/sign-up/email') return;
      const expected = env.TEAM_INVITE_CODE;
      const candidate = context.headers?.get('x-team-invite-code') ?? '';
      if (!expected)
        throw APIError.from('SERVICE_UNAVAILABLE', {
          code: 'INVITE_CODE_NOT_CONFIGURED',
          message: 'Account creation is not configured.',
        });
      if (!(await inviteCodeMatches(candidate, expected)))
        throw APIError.from('FORBIDDEN', {
          code: 'INVALID_INVITE_CODE',
          message: 'That Team 401 invite code is not valid.',
        });
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const now = Date.now();
          await env.DB.prepare(
            `INSERT OR IGNORE INTO organizations (id, name, frc_team_number, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          )
            .bind('team-401', 'Team 401', 401, user.id, now, now)
            .run();
          const organization = await env.DB.prepare(
            `SELECT owner_user_id FROM organizations WHERE id = ?`,
          )
            .bind('team-401')
            .first<{ owner_user_id: string }>();
          const role =
            organization?.owner_user_id === user.id ? 'owner' : 'scout';
          await env.DB.prepare(
            `INSERT OR IGNORE INTO memberships (organization_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
          )
            .bind('team-401', user.id, role, now, now)
            .run();
        },
      },
    },
  },
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  session: {
    modelName: 'sessions',
    fields: {
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      userId: 'user_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: 'accounts',
    fields: {
      accountId: 'account_id',
      providerId: 'provider_id',
      userId: 'user_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  verification: {
    modelName: 'verifications',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  advanced: {
    database: { generateId: 'uuid', validateSchema: false },
    cookiePrefix: 'team401-scouting',
  },
});
