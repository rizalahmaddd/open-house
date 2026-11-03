// Native Web Crypto utilities for Cloudflare Workers

export function createId(prefix?: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_juragankos_malang_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === storedHash;
}
