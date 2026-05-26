// Users routes - user-facing /me/device + admin operations

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { requireAuth, requireAdmin, AuthedRequest, getClientIp } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { prisma } from '@/lib/prisma';
import { usersService } from './users.service';

// Routes cho user xem device của mình
export const deviceRouter = Router();

deviceRouter.get(
  '/current',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const device = await prisma.device.findUnique({ where: { userId: req.user!.userId } });
    if (!device) return res.json({ success: true, device: null });
    res.json({
      success: true,
      device: {
        id: device.id,
        fingerprint_short: device.fingerprint.slice(0, 8) + '...',
        user_agent: device.userAgent,
        bound_at: device.boundAt,
        last_used_at: device.lastUsedAt,
        reset_count: device.resetCount,
      },
    });
  })
);

deviceRouter.post(
  '/request-reset',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        event: 'device_reset_requested',
        ipAddress: getClientIp(req),
      },
    });
    res.json({
      success: true,
      message: 'Yêu cầu đã được ghi nhận. Quản trị viên sẽ xử lý sớm nhất.',
    });
  })
);

// Admin: quản lý users
export const adminUsersRouter = Router();

adminUsersRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = (req.query.search as string) || undefined;
    const status = (req.query.status as 'active' | 'suspended' | 'deleted') || undefined;
    const data = await usersService.list({ page, limit, search, status });
    res.json({ success: true, ...data });
  })
);

adminUsersRouter.get(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const user = await usersService.findById(id);
    res.json({ success: true, user });
  })
);

adminUsersRouter.post(
  '/:id/reset-device',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await usersService.resetDevice(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã reset thiết bị' });
  })
);

adminUsersRouter.post(
  '/:id/suspend',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const status = await usersService.toggleSuspend(id, req.user!.userId, getClientIp(req));
    res.json({
      success: true,
      status,
      message: status === 'suspended' ? 'Đã khóa tài khoản' : 'Đã kích hoạt tài khoản',
    });
  })
);
