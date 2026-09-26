type FirestoreValue = { stringValue?: string };
export type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};
export type OpsProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
};

export function profileFromDocument(
  document: FirestoreDocument,
): OpsProfile | null {
  const uid = document.name.split('/').at(-1) ?? '';
  const email = document.fields?.email?.stringValue?.trim().toLowerCase() ?? '';
  if (!uid || !email) return null;
  return {
    uid,
    email,
    displayName:
      document.fields?.displayName?.stringValue?.trim() || email.split('@')[0],
    role: document.fields?.role?.stringValue ?? 'student',
  };
}

export function shouldRecoverScoutingOwner(
  currentOwnerFirebaseUid: string | null,
  profiles: OpsProfile[],
  signedInUid: string,
) {
  if (
    currentOwnerFirebaseUid &&
    profiles.some(
      (profile) =>
        profile.uid === currentOwnerFirebaseUid && profile.role === 'coach',
    )
  )
    return false;
  return profiles.some(
    (profile) => profile.uid === signedInUid && profile.role === 'coach',
  );
}
