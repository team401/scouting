const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createGuestPassCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const value = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `401-${value.slice(0, 4).join('')}-${value.slice(4, 8).join('')}-${value.slice(8, 12).join('')}-${value.slice(12).join('')}`;
}

export function normalizeGuestPassCode(code: string) {
  return code.trim().toUpperCase();
}

export async function hashGuestPassCode(code: string) {
  const bytes = new TextEncoder().encode(normalizeGuestPassCode(code));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
