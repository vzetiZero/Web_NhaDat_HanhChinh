// Admin routes - dashboard stats + audit logs + contracts admin view

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { requireAdmin } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { contractsService } from '@/modules/contracts/contracts.service';
import { usersService } from '@/modules/users/users.service';
import { HttpError } from '@/lib/http-error';

export const adminRouter = Router();

adminRouter.get(
  '/dashboard',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [contracts, users, deviceCounts] = await Promise.all([
      contractsService.getStats(),
      usersService.getUserStats(),
      prisma.$transaction([
        prisma.device.count(),
        prisma.device.count({ where: { status: 'active' } }),
        prisma.device.count({ where: { status: { not: 'active' } } }),
      ]),
    ]);
    const [deviceTotal, deviceActive, deviceOther] = deviceCounts;
    res.json({
      success: true,
      contracts,
      users,
      devices: { total: deviceTotal, active: deviceActive, other: deviceOther },
      contractsLast7Days: contracts.byDay,
    });
  })
);

adminRouter.get(
  '/audit-logs',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const event = (req.query.event as string) || undefined;
    const userId = req.query.user_id ? Number(req.query.user_id) : undefined;

    const where: { event?: string; userId?: number } = {};
    if (event) where.event = event;
    if (userId) where.userId = userId;

    const [total, items] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ success: true, items, total, page, limit });
  })
);

// Admin contracts view
export const adminContractsRouter = Router();

adminContractsRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = (req.query.status as 'draft' | 'rendered' | 'signed' | 'archived') || undefined;
    const search = (req.query.search as string) || undefined;
    const data = await contractsService.listAll({ page, limit, status, search });
    res.json({ success: true, ...data });
  })
);

adminContractsRouter.get(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const contract = await contractsService.findById(id, undefined, true);
    res.json({ success: true, contract });
  })
);
