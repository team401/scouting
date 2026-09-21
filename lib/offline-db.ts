export type PendingMutation = {
  id: string;
  organizationId: string;
  entity: 'scoutEntry' | 'pitEntry' | 'matchPlan' | 'pickList';
  operation: 'upsert' | 'delete';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
  retryable?: boolean;
};

export type OfflineDraft<T = unknown> = {
  id: string;
  payload: T;
  updatedAt: number;
};

const DB_NAME = 'team401-scouting-offline';
const DB_VERSION = 4;
const OUTBOX_STORE = 'outbox';
const DRAFT_STORE = 'drafts';
const CACHE_STORE = 'cache';
const DEVICE_STORE = 'devices';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OUTBOX_STORE))
        request.result.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(DRAFT_STORE))
        request.result.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(CACHE_STORE))
        request.result.createObjectStore(CACHE_STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(DEVICE_STORE))
        request.result.createObjectStore(DEVICE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export type RelayDevice = {
  id: 'qr-relay';
  deviceId: string;
  privateKey: CryptoKey;
  publicKey: JsonWebKey;
  registered: boolean;
};

export async function getRelayDevice(): Promise<RelayDevice> {
  const db = await openDb();
  const existing = await new Promise<RelayDevice | undefined>(
    (resolve, reject) => {
      const request = db
        .transaction(DEVICE_STORE)
        .objectStore(DEVICE_STORE)
        .get('qr-relay');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );
  if (existing) return existing;
  const keys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    await crypto.subtle.exportKey('jwk', keys.privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const device: RelayDevice = {
    id: 'qr-relay',
    deviceId: crypto.randomUUID(),
    privateKey,
    publicKey: await crypto.subtle.exportKey('jwk', keys.publicKey),
    registered: false,
  };
  await saveRelayDevice(device);
  return device;
}

export async function saveRelayDevice(device: RelayDevice) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DEVICE_STORE, 'readwrite');
    transaction.objectStore(DEVICE_STORE).put(device);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
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
    const request = db
      .transaction(OUTBOX_STORE)
      .objectStore(OUTBOX_STORE)
      .getAll();
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
  if (mutations.length === 0)
    return {
      pending: 0,
      accepted: 0,
      acceptedIds: [] as string[],
      rejected: [] as { id: string; error: string; retryable: boolean }[],
      errors: [] as string[],
    };
  const retryableMutations = mutations.filter(
    (mutation) => mutation.retryable !== false,
  );
  if (retryableMutations.length === 0)
    return {
      pending: mutations.length,
      accepted: 0,
      acceptedIds: [] as string[],
      rejected: [] as { id: string; error: string; retryable: boolean }[],
      errors: mutations.flatMap((mutation) =>
        mutation.lastError ? [mutation.lastError] : [],
      ),
    };
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mutations: retryableMutations }),
  });
  const result = (await response.json()) as {
    error?: string;
    accepted?: string[];
    rejected?: { id: string; error: string; retryable: boolean }[];
  };
  if (!response.ok) throw new Error(result.error ?? 'Synchronization failed.');
  await deletePendingMutations(result.accepted ?? []);
  for (const rejection of result.rejected ?? []) {
    const mutation = mutations.find((item) => item.id === rejection.id);
    if (mutation)
      await queueMutation({
        ...mutation,
        attempts: mutation.attempts + 1,
        lastError: rejection.error,
        retryable: rejection.retryable,
      });
  }
  return {
    pending: (await getPendingMutations()).length,
    accepted: result.accepted?.length ?? 0,
    acceptedIds: result.accepted ?? [],
    rejected: result.rejected ?? [],
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

export async function getDraft<T>(
  id: string,
): Promise<OfflineDraft<T> | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(DRAFT_STORE)
      .objectStore(DRAFT_STORE)
      .get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDrafts(): Promise<OfflineDraft[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(DRAFT_STORE)
      .objectStore(DRAFT_STORE)
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAllDrafts() {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE, 'readwrite');
    transaction.objectStore(DRAFT_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveCachedValue<T>(id: string, value: T) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, 'readwrite');
    transaction
      .objectStore(CACHE_STORE)
      .put({ id, value, updatedAt: Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getCachedValue<T>(id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(CACHE_STORE)
      .objectStore(CACHE_STORE)
      .get(id);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}
