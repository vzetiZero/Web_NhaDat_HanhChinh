// Device routes
// User: GET /api/device/me     — xem thiết bị của mình
// Admin: GET /api/admin/devices, GET /api/admin/users/:id/devices,
//        PATCH /:id/block|unblock, DELETE /:id

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { requireAuth, requireAdmin, AuthedRequest, getClientIp } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { devicesService } from './devices.service';

export const userDevicesRouter = Router();

userDevicesRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = await devicesService.listMine(req.user!.userId);
    res.json({ success: true, ...data });
  })
);

export const adminDevicesRouter = Router();

adminDevicesRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const search = (req.query.search as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
    const data = await devicesService.listForAdmin({ page, limit, search, status, userId });
    res.json({ success: true, ...data });
  })
);

adminDevicesRouter.get(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const device = await devicesService.findById(id);
    res.json({ success: true, device });
  })
);

adminDevicesRouter.patch(
  '/:id/block',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await devicesService.block(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã khóa thiết bị' });
  })
);

adminDevicesRouter.patch(
  '/:id/unblock',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await devicesService.unblock(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã mở khóa thiết bị' });
  })
);

adminDevicesRouter.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await devicesService.remove(id, req.user!.userId, getClientIp(req));
    res.json({ success: true, message: 'Đã gỡ thiết bị. User có thể gắn thiết bị mới ở lần đăng nhập tiếp theo.' });
  })
);

// Sub-route: thiết bị của 1 user cụ thể — gắn vào /api/admin/users/:id/devices
export const adminUserDevicesRouter = Router({ mergeParams: true });

adminUserDevicesRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) throw HttpError.badRequest('User ID không hợp lệ');
    const data = await devicesService.listForAdmin({ page: 1, limit: 50, userId });
    res.json({ success: true, ...data });
  })
);
