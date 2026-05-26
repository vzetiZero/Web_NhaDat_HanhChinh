// Environment variables - validated bằng Zod ở boot time
// Crash sớm nếu thiếu config thay vì lỗi runtime mơ hồ

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_STORAGE_BUCKET: z.string().default('contract-files'),
  SUPABASE_TEMPLATE_BUCKET: z.string().default('contract-templates'),
  SUPABASE_SIGNED_URL_TTL: z.coerce.number().int().positive().default(600),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải >= 32 ký tự'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY phải >= 32 ký tự'),

  // Admin bootstrap (chỉ cần khi chạy seed) - cho phép cả local hostname (admin@local)
  ADMIN_BOOTSTRAP_EMAIL: z
    .string()
    .min(3)
    .regex(/^[^\s@]+@[^\s@]+$/, 'Email phải có dạng user@host')
    .default('admin@example.com'),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).default('ChangeMe@123'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Rate limit
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Optional
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),
  TURNSTILE_SITE_KEY: z.string().optional(),
  DVCQG_AGENCY_API_URL: z.string().url().optional(),
  DVCQG_API_KEY: z.string().optional(),
});

let parsed: z.infer<typeof envSchema>;
try {
  parsed = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('❌ Environment variables invalid:');
    for (const issue of err.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\n👉 Copy .env.example → .env và điền giá trị thật.');
    process.exit(1);
  }
  throw err;
}

export const env = parsed;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

/**
 * Trả về list origins parsed từ CORS_ORIGIN
 * "*" → tất cả; "http://a,http://b" → ['http://a', 'http://b']
 */
export function getCorsOrigins(): string | string[] {
  if (env.CORS_ORIGIN === '*') return '*';
  return env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
}
