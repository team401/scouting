import {
  getRelayDevice,
  saveRelayDevice,
  type PendingMutation,
  type RelayDevice,
} from '@/lib/offline-db';

export const QR_PREFIX = 'T401QR1';
const CHUNK_SIZE = 850;

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function compress(value: string) {
  const stream = new Blob([value])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array) {
  const stream = new Blob([Uint8Array.from(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export type RelayEnvelope = {
  version: 1;
  deviceId: string;
  payload: string;
  signature: string;
};

export async function ensureRelayDeviceRegistered(online: boolean) {
  const device = await getRelayDevice();
  if (!online && !device.registered)
    throw new Error(
      'Connect this device once to register it before using offline QR relay.',
    );
  if (online) {
    const response = await fetch('/api/relay-devices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: device.deviceId,
        publicKey: device.publicKey,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(result.error ?? 'Could not register this device.');
    if (!device.registered) {
      const registered = { ...device, registered: true };
      await saveRelayDevice(registered);
      return registered;
    }
  }
  return device;
}

export async function createRelayFrames(
  device: RelayDevice,
  organizationId: string,
  eventKey: string,
  mutations: PendingMutation[],
) {
  const payload = JSON.stringify({
    version: 1,
    organizationId,
    eventKey,
    createdAt: Date.now(),
    mutations: mutations
      .filter((mutation) => mutation.entity === 'scoutEntry')
      .slice(0, 24)
      .map(({ id, createdAt, payload }) => ({ id, createdAt, payload })),
  });
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      device.privateKey,
      new TextEncoder().encode(payload),
    ),
  );
  const packed = toBase64Url(
    await compress(
      JSON.stringify({
        version: 1,
        deviceId: device.deviceId,
        payload,
        signature: toBase64Url(signature),
      } satisfies RelayEnvelope),
    ),
  );
  const transferId = crypto.randomUUID();
  const chunks = Array.from(
    { length: Math.ceil(packed.length / CHUNK_SIZE) },
    (_, index) => packed.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );
  return chunks.map(
    (chunk, index) =>
      `${QR_PREFIX}|${transferId}|${index + 1}|${chunks.length}|${chunk}`,
  );
}

export function parseRelayFrame(frame: string) {
  const [prefix, transferId, partText, totalText, chunk] = frame.split('|');
  const part = Number(partText);
  const total = Number(totalText);
  if (
    prefix !== QR_PREFIX ||
    !transferId ||
    !chunk ||
    !Number.isInteger(part) ||
    !Number.isInteger(total) ||
    part < 1 ||
    part > total ||
    total > 100
  )
    throw new Error('This is not a valid Team 401 relay QR code.');
  return { transferId, part, total, chunk };
}

export async function assembleRelayEnvelope(
  chunks: Map<number, string>,
  total: number,
) {
  if (chunks.size !== total) throw new Error('More QR frames are required.');
  const packed = Array.from(
    { length: total },
    (_, index) => chunks.get(index + 1) ?? '',
  ).join('');
  return JSON.parse(await decompress(fromBase64Url(packed))) as RelayEnvelope;
}
