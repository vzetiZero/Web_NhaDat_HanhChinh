// Express app factory - tách khỏi index.ts để test/integration test dễ hơn

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, isProd, getCorsOrigins } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/error';

import { authRouter, adminAuthRouter } from '@/modules/auth/auth.routes';
import { deviceRouter, adminUsersRouter } from '@/modules/users/users.routes';
import { addressRouter } from '@/modules/address/address.routes';
import { contractsRouter } from '@/modules/contracts/contracts.routes';
import { templatesRouter, adminTemplatesRouter } from '@/modules/templates/templates.routes';
import { filesRouter } from '@/modules/files/files.routes';
import { adminRouter, adminContractsRouter } from '@/modules/admin/admin.routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // Railway/CF front - lấy đúng client IP

  // ==== Security & utilities ====
  app.use(
    helmet({
      contentSecurityPolicy: false, // API only, không serve HTML
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
      maxAge: 86400,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  if (!isProd) app.use(morgan('dev'));
  else app.use(morgan('combined'));

  // Rate limit cho /api/*
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' },
  });

  // ==== Health ====
  app.get('/healthz', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
  app.get('/', (_req, res) =>
    res.json({
      name: 'Chứng Từ Nhà Đất API',
      version: process.env.npm_package_version || '0.1.0',
      docs: '/api',
    })
  );

  // ==== Routes ====
  app.use('/api', limiter);

  // User-facing
  app.use('/api/auth', authRouter);
  app.use('/api/device', deviceRouter);
  app.use('/api/address', addressRouter);
  app.use('/api/contracts', contractsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/files', filesRouter);

  // Admin
  app.use('/api/admin/auth', adminAuthRouter);
  app.use('/api/admin/users', adminUsersRouter);
  app.use('/api/admin/contracts', adminContractsRouter);
  app.use('/api/admin/templates', adminTemplatesRouter);
  app.use('/api/admin', adminRouter);

  // 404 + error handler (luôn đặt cuối cùng)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
