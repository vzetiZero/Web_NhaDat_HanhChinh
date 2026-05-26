// Middleware: chỉ cho phép user status='approved' truy cập route.
// - Admin tự động bypass (trust JWT payload isAdmin).
// - Re-check DB mỗi request để bắt thay đổi status real-time (admin block sau khi user login).
// Áp dụng SAU requireAuth.

import { NextFunction, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';
import { AuthedRequest } from './auth';

export async function requireApproved(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(HttpError.unauthorized('Thiếu token'));
  if (req.user.isAdmin) return next(); // admin bypass

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { status: true },
  });
  if (!user) return next(HttpError.unauthorized('Tài khoản không tồn tại'));

  if (user.status === 'approved') return next();

  const codeMap: Record<string, string> = {
    pending: 'ACCOUNT_PENDING',
    rejected: 'ACCOUNT_REJECTED',
    blocked: 'ACCOUNT_BLOCKED',
  };
  const msgMap: Record<string, string> = {
    pending: 'Tài khoản đang chờ phê duyệt',
    rejected: 'Tài khoản chưa được phê duyệt',
    blocked: 'Tài khoản đã bị khóa',
  };
  return next(new HttpError(403, codeMap[user.status] || 'FORBIDDEN', msgMap[user.status] || 'Không có quyền truy cập', { status: user.status }));
}
