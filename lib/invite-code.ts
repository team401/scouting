const iterations = 120_000;

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function derive(code: string, salt: Uint8Array) {
  const saltBuffer = Uint8Array.from(salt).buffer;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations },
      key,
      256,
    ),
  );
}

export async function hashInviteCode(code: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(code, salt);
  return { hash: bytesToBase64(hash), salt: bytesToBase64(salt) };
}

export async function verifyInviteCode(
  code: string,
  hash: string,
  salt: string,
) {
  const candidate = await derive(code, base64ToBytes(salt));
  const expected = base64ToBytes(hash);
  let difference = candidate.length ^ expected.length;
  for (
    let index = 0;
    index < Math.max(candidate.length, expected.length);
    index += 1
  )
    difference |= (candidate[index] ?? 0) ^ (expected[index] ?? 0);
  return difference === 0;
}
