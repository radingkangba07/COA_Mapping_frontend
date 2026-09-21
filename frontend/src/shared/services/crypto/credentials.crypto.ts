// RSA-OAEP encryption for MCP credentials — prevents raw secrets appearing
// in the network payload visible via browser DevTools.
// The server's public key is fetched once and cached for the page session.
// A server restart regenerates the key; the cache is cleared automatically
// if the backend returns 400 on a decryption failure.

import { env } from '@/config/env';

let _cachedKey: CryptoKey | null = null;

async function loadPublicKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey;

  const res = await fetch(`${env.API_BASE_URL}/api/v1/auth/public-key`);
  if (!res.ok) throw new Error('Failed to fetch encryption key');
  const { public_key } = (await res.json()) as { public_key: string };

  const pemBody = public_key
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/[\r\n]/g, '');

  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  _cachedKey = await window.crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  return _cachedKey;
}

export function clearKeyCache(): void {
  _cachedKey = null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export async function encryptCredentials(
  credentials: Record<string, string>,
): Promise<string> {
  const rsaKey = await loadPublicKey();

  // Hybrid RSA-OAEP + AES-256-GCM: RSA encrypts the 32-byte AES key (within the
  // 190-byte RSA-OAEP/SHA-256 limit); AES-GCM encrypts the data with no size cap.
  // This handles OAuth2 access tokens (JWTs) which exceed the direct RSA limit.
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(credentials));

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintext,
  );

  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaKey,
    rawAesKey,
  );

  return btoa(
    JSON.stringify({
      iv: toBase64(iv),
      key: toBase64(new Uint8Array(encryptedKey)),
      data: toBase64(new Uint8Array(encryptedData)),
    }),
  );
}
