import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
};

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    image: text('image'),
    ...timestamps,
  },
  (table) => [uniqueIndex('idx_users_email').on(table.email)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_sessions_token').on(table.token),
    index('idx_sessions_user').on(table.userId),
  ],
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [
    index('idx_accounts_user').on(table.userId),
    uniqueIndex('idx_accounts_provider').on(table.providerId, table.accountId),
  ],
);

export const verifications = sqliteTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ...timestamps,
  },
  (table) => [index('idx_verifications_identifier').on(table.identifier)],
);

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  frcTeamNumber: integer('frc_team_number'),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const organizationSettings = sqliteTable('organization_settings', {
  organizationId: text('organization_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  inviteCodeHash: text('invite_code_hash'),
  inviteCodeSalt: text('invite_code_salt'),
  inviteCodeEncrypted: text('invite_code_encrypted'),
  inviteCodeIv: text('invite_code_iv'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const memberships = sqliteTable(
  'memberships',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', {
      enum: ['owner', 'admin', 'strategy', 'scout', 'video'],
    }).notNull(),
    disabled: integer('disabled', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index('idx_memberships_user').on(table.userId),
  ],
);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  lastRequest: integer('last_request', { mode: 'timestamp_ms' }).notNull(),
});

export const webhookVerifications = sqliteTable('webhook_verifications', {
  provider: text('provider').primaryKey(),
  verificationCode: text('verification_code').notNull(),
  receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
});

export const webhookDeliveryStatus = sqliteTable('webhook_delivery_status', {
  provider: text('provider').primaryKey(),
  lastReceivedAt: integer('last_received_at', { mode: 'timestamp_ms' }).notNull(),
  status: text('status').notNull(),
  messageType: text('message_type'),
});

export const relayDevices = sqliteTable(
  'relay_devices',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    publicKeyJwk: text('public_key_jwk', { mode: 'json' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('idx_relay_devices_user').on(table.organizationId, table.userId),
  ],
);

export const seasons = sqliteTable('seasons', {
  year: integer('year').primaryKey(),
  gameKey: text('game_key').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  fieldDefinition: text('field_definition', { mode: 'json' }).notNull(),
  ...timestamps,
});

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    seasonYear: integer('season_year')
      .notNull()
      .references(() => seasons.year),
    tbaEventKey: text('tba_event_key').notNull(),
    name: text('name').notNull(),
    isCurrent: integer('is_current', { mode: 'boolean' })
      .notNull()
      .default(false),
    tbaEtag: text('tba_etag'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_events_org_tba').on(
      table.organizationId,
      table.tbaEventKey,
    ),
    index('idx_events_current').on(table.organizationId, table.isCurrent),
  ],
);

export const matches = sqliteTable(
  'matches',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    tbaMatchKey: text('tba_match_key').notNull(),
    compLevel: text('comp_level').notNull(),
    matchNumber: integer('match_number').notNull(),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
    predictedAt: integer('predicted_at', { mode: 'timestamp_ms' }),
    alliances: text('alliances', { mode: 'json' }).notNull(),
    result: text('result', { mode: 'json' }),
    videos: text('videos', { mode: 'json' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_matches_org_tba').on(
      table.organizationId,
      table.tbaMatchKey,
    ),
    index('idx_matches_event_order').on(
      table.eventId,
      table.compLevel,
      table.matchNumber,
    ),
  ],
);

export const scoutEntries = sqliteTable(
  'scout_entries',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    teamNumber: integer('team_number').notNull(),
    scoutUserId: text('scout_user_id')
      .notNull()
      .references(() => users.id),
    station: text('station').notNull(),
    seasonYear: integer('season_year')
      .notNull()
      .references(() => seasons.year),
    schemaVersion: integer('schema_version').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    clientUpdatedAt: integer('client_updated_at', {
      mode: 'timestamp_ms',
    }).notNull(),
    syncVersion: integer('sync_version').notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_entries_assignment').on(
      table.organizationId,
      table.matchId,
      table.teamNumber,
      table.scoutUserId,
    ),
    index('idx_entries_analysis').on(
      table.organizationId,
      table.eventId,
      table.teamNumber,
    ),
  ],
);

export const entryAudit = sqliteTable(
  'entry_audit',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    entryId: text('entry_id')
      .notNull()
      .references(() => scoutEntries.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_entry_audit_org_time').on(table.organizationId, table.createdAt),
  ],
);

export const scoutAssignments = sqliteTable(
  'scout_assignments',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    teamNumber: integer('team_number').notNull(),
    scoutUserId: text('scout_user_id')
      .notNull()
      .references(() => users.id),
    station: text('station').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_assignment_station').on(
      table.organizationId,
      table.matchId,
      table.station,
    ),
    index('idx_assignment_scout').on(table.scoutUserId, table.eventId),
  ],
);

export const pitEntries = sqliteTable(
  'pit_entries',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    teamNumber: integer('team_number').notNull(),
    scoutUserId: text('scout_user_id')
      .notNull()
      .references(() => users.id),
    seasonYear: integer('season_year')
      .notNull()
      .references(() => seasons.year),
    drivetrain: text('drivetrain'),
    swerveModule: text('swerve_module'),
    motorTypes: text('motor_types', { mode: 'json' }),
    weightLbs: integer('weight_lbs'),
    dimensions: text('dimensions', { mode: 'json' }),
    payload: text('payload', { mode: 'json' }).notNull(),
    photoObjectKey: text('photo_object_key'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_pit_team_event').on(
      table.organizationId,
      table.eventId,
      table.teamNumber,
    ),
  ],
);

export const matchPlans = sqliteTable(
  'match_plans',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    matchId: text('match_id')
      .notNull()
      .references(() => matches.id),
    authorUserId: text('author_user_id')
      .notNull()
      .references(() => users.id),
    plan: text('plan', { mode: 'json' }).notNull(),
    ...timestamps,
  },
  (table) => [index('idx_plans_match').on(table.organizationId, table.matchId)],
);

export const pickLists = sqliteTable(
  'pick_lists',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    isOfficial: integer('is_official', { mode: 'boolean' })
      .notNull()
      .default(false),
    rankings: text('rankings', { mode: 'json' }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('idx_picklists_event').on(table.organizationId, table.eventId),
  ],
);

export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    matchId: text('match_id').references(() => matches.id),
    teamNumber: integer('team_number'),
    uploaderUserId: text('uploader_user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind', { enum: ['robot_photo', 'match_video'] }).notNull(),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    bytes: integer('bytes').notNull(),
    status: text('status', {
      enum: ['uploading', 'ready', 'failed'],
    }).notNull(),
    ...timestamps,
  },
  (table) => [index('idx_media_match').on(table.organizationId, table.matchId)],
);
