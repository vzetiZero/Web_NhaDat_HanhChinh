// AES-256-GCM cho mã hóa dữ liệu nhạy cảm (CCCD, SĐT)
// Output: "iv:ciphertext:authTag" hex-encoded

import crypto from 'node:crypto';
import { env } from '@/config/env';

function getKey(): Buffer {
  // ENCRYPTION_KEY có thể là hex 64 chars (32 bytes), hoặc plain text
  // Dùng SHA-256 để derive 32 bytes key từ bất kỳ string nào
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

export function encryptSensitive(plain: string): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

export function decryptSensitive(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const [ivHex, encHex, tagHex] = ciphertext.split(':');
    if (!ivHex || !encHex || !tagHex) return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getKey(),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}
