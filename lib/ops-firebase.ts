import { env } from 'cloudflare:workers';
import {
  profileFromDocument,
  shouldRecoverScoutingOwner,
  type FirestoreDocument,
  type OpsProfile,
} from '@/lib/ops-profile';

type FirebaseSignIn = { idToken: string; localId: string; email: string };

function firebaseError(value: unknown) {
  if (!value || typeof value !== 'object') return 'Firebase request failed.';
  return (
    (value as { error?: { message?: string } }).error?.message ??
    'Firebase request failed.'
  );
}

export async function signInToOps(email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(firebaseError(body));
  return body as FirebaseSignIn;
}

export async function loadOpsRoster(idToken: string) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'users' }] },
      }),
    },
  );
  if (!response.ok) throw new Error('Could not read the Team 401 Ops roster.');
  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
  }>;
  return rows
    .map((row) => (row.document ? profileFromDocument(row.document) : null))
    .filter((profile): profile is OpsProfile => profile !== null);
}

export async function synchronizeOpsRoster(
  profiles: OpsProfile[],
  signedInUid: string,
) {
  const now = Date.now();
  let organization = await env.DB.prepare(
    "SELECT id FROM organizations WHERE id = 'team-401' LIMIT 1",
  ).first();
  const rosterUsers = new Map<string, string>();
  for (const profile of profiles) {
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE firebase_uid = ? OR lower(email) = ? LIMIT 1',
    )
      .bind(profile.uid, profile.email)
      .first<{ id: string }>();
    const userId = existing?.id ?? `firebase:${profile.uid}`;
    rosterUsers.set(profile.uid, userId);
    if (existing)
      await env.DB.prepare(
        'UPDATE users SET firebase_uid = ?, email = ?, name = ?, email_verified = 1, updated_at = ? WHERE id = ?',
      )
        .bind(profile.uid, profile.email, profile.displayName, now, userId)
        .run();
    else
      await env.DB.prepare(
        `INSERT INTO users (id, firebase_uid, email, name, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
        .bind(userId, profile.uid, profile.email, profile.displayName, now, now)
        .run();
  }
  const user = await env.DB.prepare(
    'SELECT id FROM users WHERE firebase_uid = ? LIMIT 1',
  )
    .bind(signedInUid)
    .first<{ id: string }>();
  if (!user) throw new Error('Your Ops roster profile could not be linked.');
  if (!organization) {
    await env.DB.prepare(
      `INSERT INTO organizations (id, name, frc_team_number, owner_user_id, created_at, updated_at)
       VALUES ('team-401', 'Team 401', 401, ?, ?, ?)`,
    )
      .bind(user.id, now, now)
      .run();
    organization = { id: 'team-401' };
  }
  for (const profile of profiles) {
    const userId = rosterUsers.get(profile.uid);
    if (!userId) continue;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO memberships (organization_id, user_id, role, disabled, created_at, updated_at)
       VALUES ('team-401', ?, ?, 0, ?, ?)`,
    )
      .bind(userId, profile.role === 'coach' ? 'admin' : 'scout', now, now)
      .run();
  }
  const owner = await env.DB.prepare(
    `SELECT organizations.owner_user_id AS ownerUserId, users.firebase_uid AS firebaseUid
     FROM organizations JOIN users ON users.id = organizations.owner_user_id
     WHERE organizations.id = 'team-401'`,
  ).first<{ ownerUserId: string; firebaseUid: string | null }>();
  const shouldRecoverOwner = shouldRecoverScoutingOwner(
    owner?.firebaseUid ?? null,
    profiles,
    signedInUid,
  );
  const effectiveOwnerId = shouldRecoverOwner ? user.id : owner?.ownerUserId;
  if (shouldRecoverOwner)
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE memberships SET role = 'scout', updated_at = ? WHERE organization_id = 'team-401' AND role = 'owner' AND user_id <> ?",
      ).bind(now, user.id),
      env.DB.prepare(
        "UPDATE organizations SET owner_user_id = ?, updated_at = ? WHERE id = 'team-401'",
      ).bind(user.id, now),
    ]);
  if (effectiveOwnerId)
    await env.DB.prepare(
      "UPDATE memberships SET role = 'owner', disabled = 0, updated_at = ? WHERE organization_id = 'team-401' AND user_id = ?",
    )
      .bind(now, effectiveOwnerId)
      .run();
  return user.id;
}
