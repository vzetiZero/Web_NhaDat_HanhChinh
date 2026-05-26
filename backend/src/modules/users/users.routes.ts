// Users routes - user-facing /me/device + admin operations

import { Router } from 'express';
import { z } from 'zod';
import { UserStatus } from '@prisma/client';
import { asyncHandler } from '@/middleware/error';
import { validate } from '@/middleware/validate';
import { requireAuth, requireAdmin, AuthedRequest, getClientIp } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { prisma } from '@/lib/prisma';
import { usersService } from './users.service';

const phoneSchema = z
  .string()
  .regex(/^(\+84|0)[1-9][0-9]{8,9}$/, 'SĐT Việt Nam không hợp lệ')
  .optional()
  .or(z.literal(''));

const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200).optional(),
  phone: phoneSchema,
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  age: z.number().int().min(0).max(130).nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  location_text: z.string().max(1000).nullable().optional(),
  avatar_url: z.string().url().nullable().optional().or(z.literal('')),
  province: z.string().max(120).nullable().optional(),
  district: z.string().max(120).nullable().optional(),
  ward: z.string().max(120).nullable().optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
});

export const meRouter = Router();

meRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await usersService.getProfile(req.user!.userId);
    res.json({ success: true, user });
  })
);

meRouter.patch(
  '/',
  requireAuth,
  validate(profileUpdateSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await usersService.updateProfile(req.user!.userId, req.body, {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });
    res.json({ success: true, user, message: 'Cập nhật thông tin thành công.' });
  })
);

meRouter.patch(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    await usersService.changePassword(req.user!.userId, req.body, {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });
    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  })
);

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

const VALID_STATUSES: UserStatus[] = ['pending', 'approved', 'rejected', 'blocked'];

adminUsersRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = (req.query.search as string) || undefined;
    const statusRaw = req.query.status as string | undefined;
    const status = statusRaw && VALID_STATUSES.includes(statusRaw as UserStatus)
      ? (statusRaw as UserStatus)
      : undefined;
    const role = req.query.role === 'admin' || req.query.role === 'user' ? String(req.query.role) : undefined;
    const data = await usersService.list({ page, limit, search, status, role });
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
    await prisma.auditLog.create({
      data: {
        adminId: (req as AuthedRequest).user!.userId,
        userId: id,
        event: 'ADMIN_VIEW_USER_DETAIL',
        targetType: 'user',
        targetId: id,
        ipAddress: getClientIp(req),
      },
    });
    res.json({ success: true, user });
  })
);

const adminStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'blocked']),
  reason: z.string().max(1000).optional(),
});

adminUsersRouter.patch(
  '/:id/status',
  requireAdmin,
  validate(adminStatusSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const user = await usersService.updateStatus(id, req.user!.userId, req.body, getClientIp(req));
    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        userId: id,
        event: 'ADMIN_UPDATE_USER_STATUS',
        targetType: 'user',
        targetId: id,
        ipAddress: getClientIp(req),
        detail: { status: req.body.status, reason: req.body.reason || null },
      },
    });
    res.json({ success: true, user, message: 'Đã cập nhật trạng thái tài khoản' });
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

// Approve / Reject / Block / Unblock — dùng PATCH theo spec
adminUsersRouter.patch(
  '/:id/approve',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const user = await usersService.approve(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã duyệt tài khoản', user });
  })
);

const rejectSchema = z.object({ reject_reason: z.string().min(1).max(1000) });
adminUsersRouter.patch(
  '/:id/reject',
  requireAdmin,
  validate(rejectSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const user = await usersService.reject(id, req.user!.userId, req.body.reject_reason, getClientIp(req));
    res.json({ success: true, message: 'Đã từ chối tài khoản', user });
  })
);

adminUsersRouter.patch(
  '/:id/block',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const user = await usersService.block(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã khóa tài khoản', user });
  })
);

adminUsersRouter.patch(
  '/:id/unblock',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const user = await usersService.unblock(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã mở khóa tài khoản', user });
  })
);

// Backward-compat: /suspend → block toggle (giữ cho admin SPA cũ chưa update)
adminUsersRouter.post(
  '/:id/suspend',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) throw HttpError.notFound('Không tìm thấy user');
    if (current.status === 'blocked') {
      await usersService.unblock(id, req.user!.userId, getClientIp(req));
      res.json({ success: true, status: 'approved', message: 'Đã mở khóa tài khoản' });
    } else {
      await usersService.block(id, req.user!.userId, getClientIp(req));
      res.json({ success: true, status: 'blocked', message: 'Đã khóa tài khoản' });
    }
  })
);
