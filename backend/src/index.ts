// Entry point - boot server

import { createApp } from './app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { storage } from '@/services/storage.service';
import { disconnectPrisma } from '@/lib/prisma';
import { pdfService } from '@/services/pdf.service';

async function bootstrap() {
  // Tạo buckets nếu chưa có (idempotent)
  try {
    await storage.ensureBucket(env.SUPABASE_STORAGE_BUCKET, false);
    await storage.ensureBucket(env.SUPABASE_TEMPLATE_BUCKET, false);
  } catch (err) {
    const e = err as Error;
    logger.warn('[boot] Không tự tạo được Supabase buckets - tạo thủ công trong dashboard', {
      message: e.message,
    });
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => logger.info('HTTP server closed'));
    await pdfService.close().catch(() => {});
    await disconnectPrisma().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal boot error', { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
