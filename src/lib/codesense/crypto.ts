/**
 * Client-side encryption for BYOK API keys stored in localStorage.
 *
 * Keys are encrypted with AES-GCM using a session-only crypto key held in
 * memory. On page reload the session key is lost, so previously stored
 * ciphertext cannot be decrypted and the user must re-enter their key.
 * This is intentional: the plaintext key never persists in localStorage.
 */
const ALGO = "AES-GCM";
const KEY_USAGES = ["encrypt", "decrypt"] as const;

let sessionKey: CryptoKey | null = null;

async function ensureSessionKey(): Promise<CryptoKey> {
  if (sessionKey) return sessionKey;
  sessionKey = await crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    true,
    KEY_USAGES,
  );
  return sessionKey;
}

function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export async function encryptKey(plaintext: string): Promise<string> {
  const key = await ensureSessionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encode(plaintext) as unknown as BufferSource,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptKey(ciphertextB64: string): Promise<string | null> {
  try {
    const key = await ensureSessionKey();
    const combined = Uint8Array.from(
      atob(ciphertextB64),
      (c) => c.charCodeAt(0),
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      data,
    );
    return decode(new Uint8Array(plaintext));
  } catch {
    return null;
  }
}
