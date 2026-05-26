// Users service (admin operations + user device management)
// Workflow phê duyệt: pending → approved | rejected | blocked

import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';

class UsersService {
  async list(opts: { page: number; limit: number; search?: string; status?: UserStatus }) {
    const where: Prisma.UserWhereInput = {};
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: 'insensitive' } },
        { fullName: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts.status) where.status = opts.status;

    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isAdmin: true,
          status: true,
          registerNote: true,
          rejectReason: true,
          approvedAt: true,
          approvedById: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { device: true, approvedBy: { select: { id: true, email: true, fullName: true } } },
    });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    // Đừng leak password hash
    const { passwordHash: _ph, passwordSalt: _ps, ...safe } = user;
    return safe;
  }

  async resetDevice(userId: number, adminId: number, ip?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { device: true } });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    if (user.device) {
      await prisma.device.update({
        where: { id: user.device.id },
        data: { resetCount: { increment: 1 } },
      });
      await prisma.device.delete({ where: { id: user.device.id } });
    }
    await prisma.auditLog.create({
      data: {
        adminId,
        userId,
        event: 'admin_reset_device',
        targetType: 'user',
        targetId: userId,
        ipAddress: ip || null,
      },
    });
  }

  /**
   * Approve: pending/rejected → approved
   */
  async approve(userId: number, adminId: number, ip?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    if (user.status === 'approved') throw HttpError.badRequest('Tài khoản đã được duyệt');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'approved',
        rejectReason: null,
        approvedAt: new Date(),
        approvedById: adminId,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        userId,
        event: 'USER_APPROVED',
        targetType: 'user',
        targetId: userId,
        ipAddress: ip || null,
        detail: { previousStatus: user.status },
      },
    });

    // Đánh dấu notification user_registered cho user này = đã đọc
    await prisma.adminNotification.updateMany({
      where: { type: 'user_registered', targetUserId: userId, isRead: false },
      data: { isRead: true },
    });

    return updated;
  }

  /**
   * Reject: pending → rejected (lưu lý do)
   */
  async reject(userId: number, adminId: number, reason: string, ip?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    if (user.isAdmin) throw HttpError.badRequest('Không thể từ chối tài khoản admin');

    const trimmedReason = reason?.trim();
    if (!trimmedReason) throw HttpError.badRequest('Vui lòng nhập lý do từ chối');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'rejected', rejectReason: trimmedReason },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        userId,
        event: 'USER_REJECTED',
        targetType: 'user',
        targetId: userId,
        ipAddress: ip || null,
        detail: { previousStatus: user.status, reason: trimmedReason },
      },
    });

    await prisma.adminNotification.updateMany({
      where: { type: 'user_registered', targetUserId: userId, isRead: false },
      data: { isRead: true },
    });

    return updated;
  }

  /**
   * Block: bất kỳ → blocked
   */
  async block(userId: number, adminId: number, ip?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    if (user.isAdmin) throw HttpError.badRequest('Không thể khóa tài khoản admin');
    if (user.status === 'blocked') throw HttpError.badRequest('Tài khoản đã bị khóa');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'blocked' },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        userId,
        event: 'USER_BLOCKED',
        targetType: 'user',
        targetId: userId,
        ipAddress: ip || null,
        detail: { previousStatus: user.status },
      },
    });

    return updated;
  }

  /**
   * Unblock: blocked → approved (đưa về trạng thái hoạt động)
   */
  async unblock(userId: number, adminId: number, ip?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    if (user.status !== 'blocked') throw HttpError.badRequest('Tài khoản không ở trạng thái bị khóa');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'approved', approvedAt: new Date(), approvedById: adminId },
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        userId,
        event: 'USER_UNBLOCKED',
        targetType: 'user',
        targetId: userId,
        ipAddress: ip || null,
      },
    });

    return updated;
  }

  async getUserStats() {
    const [total, pending, approved, rejected, blocked, admins, activeDevices] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { status: 'approved' } }),
      prisma.user.count({ where: { status: 'rejected' } }),
      prisma.user.count({ where: { status: 'blocked' } }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.device.count({ where: { status: 'active' } }),
    ]);
    return {
      total,
      pending,
      approved,
      rejected,
      blocked,
      admins,
      activeDevices,
      // Backward-compat alias
      active: approved,
      suspended: blocked,
    };
  }
}

export const usersService = new UsersService();
