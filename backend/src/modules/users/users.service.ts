// Users service (admin operations + user device management)

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
      include: { device: true },
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

  async toggleSuspend(userId: number, adminId: number, ip?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    if (user.isAdmin) throw HttpError.badRequest('Không thể khóa tài khoản admin');

    const newStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    await prisma.user.update({ where: { id: userId }, data: { status: newStatus } });
    await prisma.auditLog.create({
      data: {
        adminId,
        userId,
        event: newStatus === 'suspended' ? 'admin_suspend_user' : 'admin_activate_user',
        targetType: 'user',
        targetId: userId,
        ipAddress: ip || null,
      },
    });
    return newStatus;
  }

  async getUserStats() {
    const [total, active, suspended, admins, activeDevices] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.device.count({ where: { status: 'active' } }),
    ]);
    return { total, active, suspended, admins, activeDevices };
  }
}

export const usersService = new UsersService();
