export type PendingMutation = {
  id: string;
  organizationId: string;
  entity: 'scoutEntry' | 'pitEntry' | 'matchPlan' | 'pickList';
  operation: 'upsert' | 'delete';
  payload: unknown;
  createdAt: number;
  attempts: number;
};

const DB_NAME = 'scoutline-offline';
const STORE_NAME = 'outbox';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueMutation(mutation: PendingMutation) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(mutation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
