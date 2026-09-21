export type TbaWebhookPayload = {
  message_type: string;
  message_data: unknown;
};

function fromHex(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2)
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  return bytes;
}

export async function verifyTbaWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader || !secret) return false;
  const signature = fromHex(signatureHeader.replace(/^sha256=/i, '').trim());
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(rawBody));
}

export function findWebhookEventKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if (
    'event_key' in value &&
    typeof value.event_key === 'string' &&
    /^\d{4}[a-z0-9]+$/i.test(value.event_key)
  )
    return value.event_key;
  for (const child of Object.values(value)) {
    const key = findWebhookEventKey(child);
    if (key) return key;
  }
  return null;
}

export function parseTbaWebhook(rawBody: string): TbaWebhookPayload | null {
  try {
    const value = JSON.parse(rawBody) as Partial<TbaWebhookPayload>;
    if (typeof value.message_type !== 'string' || !('message_data' in value))
      return null;
    return {
      message_type: value.message_type,
      message_data: value.message_data,
    };
  } catch {
    return null;
  }
}
