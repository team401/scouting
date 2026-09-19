export type TeamRole = 'owner' | 'admin' | 'strategy' | 'scout' | 'video';

export function canManageAssignments(role: string) {
  return role === 'owner' || role === 'admin';
}

export function canReopenEntries(role: string) {
  return role === 'owner' || role === 'admin' || role === 'strategy';
}

export function canOverwriteLockedEntry(role: string, reopened: boolean) {
  return reopened || canReopenEntries(role);
}

export function teamNumberFromTbaKey(key: unknown) {
  if (typeof key !== 'string' || !/^frc\d+$/.test(key)) return null;
  return Number(key.slice(3));
}

export function scoutEntryMutationId(eventKey: string, matchKey: string, teamNumber: number, userId: string) {
  return `scout-entry:${eventKey}-${matchKey}-${teamNumber}:${userId}`;
}
