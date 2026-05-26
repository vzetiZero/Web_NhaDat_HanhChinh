// Simple structured logger - đủ dùng cho MVP
// Sau này có thể swap sang pino/winston nếu cần JSON logging cho Datadog/Sentry

import { env } from '@/config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = LEVELS[env.LOG_LEVEL];

function fmt(level: Level, msg: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const m = meta ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] [${level.toUpperCase()}] ${msg}${m}`;
}

function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < minLevel) return;
  const out = fmt(level, msg, meta);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
