import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { verifyInviteCode } from '@/lib/invite-code';

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
      const candidate = context.headers?.get('x-team-invite-code') ?? '';
      const organization = await env.DB.prepare(
        'SELECT id FROM organizations LIMIT 1',
      ).first<{ id: string }>();
      // The very first account bootstraps the organization and becomes owner.
      if (!organization) return;
      const setting = await env.DB.prepare(
        'SELECT invite_code_hash, invite_code_salt FROM organization_settings WHERE organization_id = ?',
      )
        .bind(organization.id)
        .first<{
          invite_code_hash: string | null;
          invite_code_salt: string | null;
        }>();
      if (!setting?.invite_code_hash || !setting.invite_code_salt)
        throw APIError.from('SERVICE_UNAVAILABLE', {
          code: 'INVITE_CODE_NOT_CONFIGURED',
          message:
            'Account creation is closed until an admin configures an invite code.',
        });
      if (
        !(await verifyInviteCode(
          candidate,
          setting.invite_code_hash,
          setting.invite_code_salt,
        ))
      )
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
