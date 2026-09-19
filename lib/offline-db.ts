export type PendingMutation = {
  id: string;
  organizationId: string;
  entity: 'scoutEntry' | 'pitEntry' | 'matchPlan' | 'pickList';
  operation: 'upsert' | 'delete';
  payload: unknown;
  createdAt: number;
  attempts: number;
};

export type OfflineDraft<T = unknown> = {
  id: string;
  payload: T;
  updatedAt: number;
};

const DB_NAME = 'team401-scouting-offline';
const DB_VERSION = 2;
const OUTBOX_STORE = 'outbox';
const DRAFT_STORE = 'drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OUTBOX_STORE)) request.result.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(DRAFT_STORE)) request.result.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueMutation(mutation: PendingMutation) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, 'readwrite');
    transaction.objectStore(OUTBOX_STORE).put(mutation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(OUTBOX_STORE).objectStore(OUTBOX_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingMutations(ids: string[]) {
  if (ids.length === 0) return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, 'readwrite');
    const store = transaction.objectStore(OUTBOX_STORE);
    ids.forEach((id) => store.delete(id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function synchronizePendingMutations() {
  const mutations = await getPendingMutations();
  if (mutations.length === 0) return { pending: 0, accepted: 0, errors: [] as string[] };
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  const result = await response.json() as { error?: string; accepted?: string[]; rejected?: { error: string }[] };
  if (!response.ok) throw new Error(result.error ?? 'Synchronization failed.');
  await deletePendingMutations(result.accepted ?? []);
  return {
    pending: (await getPendingMutations()).length,
    accepted: result.accepted?.length ?? 0,
    errors: result.rejected?.map((item) => item.error) ?? [],
  };
}

export async function saveDraft<T>(draft: OfflineDraft<T>) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE, 'readwrite');
    transaction.objectStore(DRAFT_STORE).put(draft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getDraft<T>(id: string): Promise<OfflineDraft<T> | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE).objectStore(DRAFT_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
