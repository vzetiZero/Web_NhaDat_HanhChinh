// Users service (admin operations + user device management)
// Workflow phê duyệt: pending → approved | rejected | blocked

import crypto from 'crypto';
import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';
import { hashPassword, verifyPassword } from '@/utils/password';

const RESET_PASSWORD_GENERIC_MESSAGE =
  'Nếu thông tin tồn tại trong hệ thống, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.';

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function assertStrongPassword(password: string) {
  if (password.length < 8) throw HttpError.badRequest('Mật khẩu mới tối thiểu 8 ký tự');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw HttpError.badRequest('Mật khẩu mới phải có chữ hoa, chữ thường và số');
  }
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  const s = String(value || '').trim();
  return s ? s : null;
}

class UsersService {
  async list(opts: { page: number; limit: number; search?: string; status?: UserStatus; role?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: 'insensitive' } },
        { fullName: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts.status) where.status = opts.status;
    if (opts.role === 'admin') where.isAdmin = true;
    if (opts.role === 'user') where.isAdmin = false;

    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          dateOfBirth: true,
          age: true,
          gender: true,
          address: true,
          locationText: true,
          province: true,
          district: true,
          ward: true,
          isAdmin: true,
          status: true,
          registerNote: true,
          rejectReason: true,
          approvedAt: true,
          approvedById: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          device: { select: { id: true, fingerprint: true, userAgent: true, boundAt: true, lastUsedAt: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
    ]);
    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.fullName,
        fullName: u.fullName,
        phone: u.phone,
        avatar_url: u.avatarUrl,
        date_of_birth: u.dateOfBirth,
        age: u.age,
        gender: u.gender,
        address: u.address,
        location_text: u.locationText,
        province: u.province,
        district: u.district,
        ward: u.ward,
        is_admin: u.isAdmin,
        isAdmin: u.isAdmin,
        role: u.isAdmin ? 'admin' : 'user',
        status: u.status,
        register_note: u.registerNote,
        reject_reason: u.rejectReason,
        approved_at: u.approvedAt,
        approved_by_id: u.approvedById,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
        last_login_at: u.lastLoginAt,
        device: u.device,
      })),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        device: true,
        approvedBy: { select: { id: true, email: true, fullName: true } },
        contracts: {
          select: { id: true, contractNumber: true, status: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        auditLogs: {
          select: { id: true, event: true, targetType: true, targetId: true, createdAt: true, detail: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!user) throw HttpError.notFound('Không tìm thấy user');
    // Đừng leak password hash
    const { passwordHash: _ph, passwordSalt: _ps, ...safe } = user;
    return safe;
  }

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { device: true, approvedBy: { select: { id: true, email: true, fullName: true } } },
    });
    if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');
    if (user.status !== 'approved') throw HttpError.forbidden('Tài khoản chưa được duyệt');
    return this.toProfileResponse(user);
  }

  async updateProfile(
    userId: number,
    input: {
      full_name?: string;
      name?: string;
      phone?: string;
      date_of_birth?: string | null;
      age?: number | null;
      gender?: string | null;
      address?: string | null;
      location_text?: string | null;
      avatar_url?: string | null;
      province?: string | null;
      district?: string | null;
      ward?: string | null;
    },
    ctx: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw HttpError.notFound('Không tìm thấy tài khoản');
    if (current.status !== 'approved') throw HttpError.forbidden('Tài khoản chưa được duyệt');

    const fullName = normalizeOptionalString(input.full_name ?? input.name);
    if (fullName !== undefined && !fullName) throw HttpError.badRequest('Họ tên không được rỗng');

    const data: Prisma.UserUpdateInput = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (input.phone !== undefined) data.phone = normalizeOptionalString(input.phone);
    if (input.avatar_url !== undefined) data.avatarUrl = normalizeOptionalString(input.avatar_url);
    if (input.gender !== undefined) data.gender = normalizeOptionalString(input.gender);
    if (input.address !== undefined) data.address = normalizeOptionalString(input.address);
    if (input.location_text !== undefined) data.locationText = normalizeOptionalString(input.location_text);
    if (input.province !== undefined) data.province = normalizeOptionalString(input.province);
    if (input.district !== undefined) data.district = normalizeOptionalString(input.district);
    if (input.ward !== undefined) data.ward = normalizeOptionalString(input.ward);
    if (input.age !== undefined) data.age = input.age === null ? null : input.age;
    if (input.date_of_birth !== undefined) {
      data.dateOfBirth = input.date_of_birth ? new Date(input.date_of_birth) : null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: { device: true, approvedBy: { select: { id: true, email: true, fullName: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        event: 'USER_PROFILE_UPDATED',
        targetType: 'user',
        targetId: userId,
        ipAddress: ctx.ip || null,
        userAgent: ctx.userAgent || null,
        detail: { fields: Object.keys(data) },
      },
    });

    return this.toProfileResponse(updated);
  }

  async changePassword(
    userId: number,
    input: { current_password: string; new_password: string; confirm_password: string },
    ctx: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Không tìm thấy tài khoản');
    if (user.status !== 'approved') throw HttpError.forbidden('Tài khoản chưa được duyệt');
    if (input.new_password !== input.confirm_password) throw HttpError.badRequest('Xác nhận mật khẩu mới không khớp');
    assertStrongPassword(input.new_password);

    const ok = await verifyPassword(user.passwordHash, input.current_password);
    if (!ok) throw HttpError.badRequest('Mật khẩu hiện tại không đúng');

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.new_password) },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        event: 'USER_PASSWORD_CHANGED',
        targetType: 'user',
        targetId: userId,
        ipAddress: ctx.ip || null,
        userAgent: ctx.userAgent || null,
      },
    });
  }

  async forgotPassword(identifier: string, ctx: { ip?: string | null; userAgent?: string | null } = {}) {
    const value = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: value }, { phone: identifier.trim() }] },
    });

    let devToken: string | undefined;
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      devToken = token;
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          ipAddress: ctx.ip || null,
          userAgent: ctx.userAgent || null,
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          event: 'USER_FORGOT_PASSWORD_REQUESTED',
          targetType: 'user',
          targetId: user.id,
          ipAddress: ctx.ip || null,
          userAgent: ctx.userAgent || null,
        },
      });
      await this.sendResetPasswordEmail(user.email, token);
    }

    return {
      message: RESET_PASSWORD_GENERIC_MESSAGE,
      dev_reset_token: process.env.NODE_ENV === 'production' ? undefined : devToken,
    };
  }

  async resetPassword(
    input: { token: string; new_password: string; confirm_password: string },
    ctx: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    if (input.new_password !== input.confirm_password) throw HttpError.badRequest('Xác nhận mật khẩu mới không khớp');
    assertStrongPassword(input.new_password);

    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(input.token) } });
    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
      throw HttpError.badRequest('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const newHash = await hashPassword(input.new_password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: newHash } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          userId: reset.userId,
          event: 'USER_PASSWORD_RESET_SUCCESS',
          targetType: 'user',
          targetId: reset.userId,
          ipAddress: ctx.ip || null,
          userAgent: ctx.userAgent || null,
        },
      }),
    ]);
  }

  async updateStatus(userId: number, adminId: number, input: { status: UserStatus; reason?: string }, ip?: string | null) {
    if (input.status === 'approved') return this.approve(userId, adminId, ip);
    if (input.status === 'rejected') return this.reject(userId, adminId, input.reason || 'Không đạt yêu cầu duyệt', ip);
    if (input.status === 'blocked') return this.block(userId, adminId, ip);
    throw HttpError.badRequest('Trạng thái không được hỗ trợ');
  }

  private async sendResetPasswordEmail(_email: string, _token: string) {
    // Placeholder tích hợp email/SMS sau. Không log token ở production.
    return;
  }

  private toProfileResponse(user: Prisma.UserGetPayload<{ include: { device: true; approvedBy: { select: { id: true; email: true; fullName: true } } } }>) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      phone: user.phone,
      avatar_url: user.avatarUrl,
      date_of_birth: user.dateOfBirth,
      age: user.age,
      gender: user.gender,
      address: user.address,
      location_text: user.locationText,
      province: user.province,
      district: user.district,
      ward: user.ward,
      is_admin: user.isAdmin,
      role: user.isAdmin ? 'admin' : 'user',
      status: user.status,
      approved_at: user.approvedAt,
      approved_by: user.approvedBy,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt,
      device: user.device
        ? {
            id: user.device.id,
            fingerprint_short: user.device.fingerprint.slice(0, 8) + '...',
            user_agent: user.device.userAgent,
            ip_address: user.device.ipAddress,
            bound_at: user.device.boundAt,
            last_used_at: user.device.lastUsedAt,
            reset_count: user.device.resetCount,
            status: user.device.status,
          }
        : null,
    };
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
        event: 'ADMIN_RESET_USER_DEVICE',
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
