// Password hashing với Argon2id (OWASP recommended)
// Argon2 lưu params + salt trong hash → không cần lưu salt riêng

import argon2 from 'argon2';

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    // Hỗ trợ backward compat: nếu hash dạng cũ (không bắt đầu $argon2), reject
    if (!hash.startsWith('$argon2')) return false;
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
