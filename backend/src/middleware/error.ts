// Centralized error handler
// Mọi error trong route được catch và format chuẩn { success, error, message, details? }

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '@/lib/http-error';
import { logger } from '@/lib/logger';
import { isProd } from '@/config/env';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Endpoint không tồn tại',
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Zod validation error
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(422).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Dữ liệu nhập không hợp lệ',
      details,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma errors - bắt 1 vài case phổ biến
  const anyErr = err as { code?: string; meta?: unknown; message?: string };
  if (anyErr?.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'CONFLICT',
      message: 'Bản ghi đã tồn tại',
      details: anyErr.meta,
    });
  }
  if (anyErr?.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Không tìm thấy bản ghi',
    });
  }

  // Fallback
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    message: anyErr?.message,
    stack: !isProd && err instanceof Error ? err.stack : undefined,
  });
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: isProd ? 'Lỗi máy chủ nội bộ' : anyErr?.message || 'Unknown error',
  });
}

/**
 * Wrap async route handler để propagate error sang errorHandler
 * Express 4 không auto-catch Promise rejection.
 */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
