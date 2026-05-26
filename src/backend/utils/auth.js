// Auth utilities cho Cloudflare Workers
// - JWT (HS256) ký bằng Web Crypto API
// - Password hash bằng PBKDF2-SHA256 + salt
// - Extract token + verify admin

import { getConfig } from '../../config/config.js';

const base64Url = (input) => {
  let str;
  if (typeof input === 'string') {
    str = btoa(unescape(encodeURIComponent(input)));
  } else {
    let bin = '';
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    str = btoa(bin);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64UrlDecode = (str) => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (str.length % 4)) % 4;
  str += '='.repeat(padding);
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
};

/**
 * Parse "7d", "12h", "60m" -> seconds
 */
function parseExpiresIn(s) {
  if (!s) return 7 * 24 * 60 * 60;
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 60 * 60;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return n;
  }
}

/**
 * Tạo JWT token
 * @param {object} payloadExtra - thêm fields vào JWT payload (vd: deviceId, fingerprint)
 */
export async function generateToken(userId, isAdmin, env, payloadExtra = {}) {
  const cfg = getConfig(env);
  const secret = cfg.JWT_SECRET;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiresIn(cfg.JWT_EXPIRES_IN);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { userId, isAdmin: !!isAdmin, iat: now, exp, ...payloadExtra };

  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return `${message}.${base64Url(new Uint8Array(signature))}`;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token, env) {
  try {
    if (!token || typeof token !== 'string') return null;
    const cfg = getConfig(env);
    const secret = cfg.JWT_SECRET;

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(signatureB64),
      encoder.encode(message)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    console.error('[verifyToken]', e?.message);
    return null;
  }
}

/**
 * Hash password với PBKDF2-SHA256 (100k iterations)
 * Trả về { hash, salt } - cả 2 đều là hex string
 */
export async function hashPassword(password, providedSalt = null) {
  const salt = providedSalt ? hexToBytes(providedSalt) : crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: bytesToHex(salt),
  };
}

/**
 * So sánh password với hash đã lưu (cần salt)
 */
export async function comparePassword(password, storedHash, storedSalt) {
  if (!storedSalt) {
    // Backward compat - legacy SHA-256 hash không có salt
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return bytesToHex(new Uint8Array(buf)) === storedHash;
  }
  const { hash } = await hashPassword(password, storedSalt);
  // Constant-time compare
  if (hash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  return diff === 0;
}

/**
 * Extract Bearer token từ header
 */
export function extractToken(request) {
  const h = request.headers.get('Authorization');
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.substring(7).trim() || null;
}

/**
 * Extract device fingerprint từ header
 */
export function extractFingerprint(request) {
  return request.headers.get('X-Device-Fingerprint') || null;
}

/**
 * Lấy IP của client từ Cloudflare headers
 */
export function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Encrypt sensitive data (CCCD, SĐT) bằng AES-GCM
 * Trả về string "iv:ciphertext" hex-encoded
 */
export async function encryptSensitive(plaintext, env) {
  if (!plaintext) return null;
  const cfg = getConfig(env);
  const keyMaterial = new TextEncoder().encode(cfg.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(ct))}`;
}

export async function decryptSensitive(ciphertext, env) {
  if (!ciphertext) return null;
  try {
    const cfg = getConfig(env);
    const [ivHex, ctHex] = ciphertext.split(':');
    const keyMaterial = new TextEncoder().encode(cfg.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(ivHex) },
      key,
      hexToBytes(ctHex)
    );
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.error('[decryptSensitive]', e?.message);
    return null;
  }
}
