// Admin notifications routes
// GET /api/admin/notifications        — list, paginate, filter is_read
// PATCH /api/admin/notifications/:id/read
// GET /api/admin/notifications/unread-count

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { requireAdmin } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { prisma } from '@/lib/prisma';

export const adminNotificationsRouter = Router();

adminNotificationsRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';

    const where = unreadOnly ? { isRead: false } : {};
    const [total, items] = await prisma.$transaction([
      prisma.adminNotification.count({ where }),
      prisma.adminNotification.findMany({
        where,
        include: {
          targetUser: { select: { id: true, email: true, fullName: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ success: true, items, total, page, limit });
  })
);

adminNotificationsRouter.get(
  '/unread-count',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const count = await prisma.adminNotification.count({ where: { isRead: false } });
    res.json({ success: true, count });
  })
);

adminNotificationsRouter.patch(
  '/:id/read',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await prisma.adminNotification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true });
  })
);

adminNotificationsRouter.patch(
  '/read-all',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const r = await prisma.adminNotification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    res.json({ success: true, updated: r.count });
  })
);
