/**
 * Password hashing utilities using PBKDF2-SHA256 via the Web Crypto API.
 * Compatible with the Convex runtime (no Node.js-only APIs).
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const ALGORITHM = "PBKDF2";
const HASH = "SHA-256";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hash a plaintext password. Returns a string in the format:
 *   `pbkdf2:iterations:saltHex:derivedKeyHex`
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(plaintext),
    ALGORITHM,
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    { name: ALGORITHM, hash: HASH, salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    KEY_BYTES * 8,
  );

  return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt.buffer as ArrayBuffer)}:${toHex(derived)}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 * Returns `true` if the password matches.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const salt = fromHex(parts[2]);
  const expectedKey = parts[3];

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(plaintext),
    ALGORITHM,
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    { name: ALGORITHM, hash: HASH, salt: salt.buffer as ArrayBuffer, iterations },
    keyMaterial,
    KEY_BYTES * 8,
  );

  const derivedHex = toHex(derived);

  // Constant-time comparison to prevent timing attacks
  if (derivedHex.length !== expectedKey.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < derivedHex.length; i++) {
    mismatch |= derivedHex.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  return mismatch === 0;
}
