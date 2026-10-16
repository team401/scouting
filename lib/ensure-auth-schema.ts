const statements = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, firebase_uid TEXT, email TEXT NOT NULL, name TEXT NOT NULL, ops_role TEXT, email_verified INTEGER DEFAULT 0 NOT NULL, image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid)`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, expires_at INTEGER NOT NULL, token TEXT NOT NULL, ip_address TEXT, user_agent TEXT, location TEXT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, access_token TEXT, refresh_token TEXT, id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts (user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider ON accounts (provider_id, account_id)`,
  `CREATE TABLE IF NOT EXISTS verifications (id TEXT PRIMARY KEY NOT NULL, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications (identifier)`,
  `CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, frc_team_number INTEGER, owner_user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS memberships (organization_id TEXT NOT NULL REFERENCES organizations(id), user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL, disabled INTEGER DEFAULT 0 NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (organization_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships (user_id)`,
  `CREATE TABLE IF NOT EXISTS guest_access_passes (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL, token_code TEXT NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER, created_by TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_access_token ON guest_access_passes (token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_guest_access_org ON guest_access_passes (organization_id)`,
  `CREATE TABLE IF NOT EXISTS organization_settings (organization_id TEXT PRIMARY KEY NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, invite_code_hash TEXT, invite_code_salt TEXT, invite_code_encrypted TEXT, invite_code_iv TEXT, test_team_number INTEGER, test_previous_event_id TEXT, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, last_request INTEGER NOT NULL)`,
];

let initialized: Promise<unknown> | undefined;

async function ensureColumn(
  db: D1Database,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await db
    .prepare(`PRAGMA table_info(${table})`)
    .all<{ name: string }>();
  if (columns.results.some((item) => item.name === column)) return;
  await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${definition}`).run();
}

async function initialize(db: D1Database) {
  await db.batch(statements.map((sql) => db.prepare(sql)));
  await ensureColumn(db, 'sessions', 'location', 'location TEXT');
  await ensureColumn(
    db,
    'organization_settings',
    'test_team_number',
    'test_team_number INTEGER',
  );
  await ensureColumn(
    db,
    'organization_settings',
    'test_previous_event_id',
    'test_previous_event_id TEXT',
  );
}

export function ensureAuthSchema(db: D1Database) {
  initialized ??= initialize(db);
  return initialized;
}
