// Auth service - business logic
// Login/register có device binding (1 user = 1 device cho non-admin)
// Register: tạo user status=pending, KHÔNG cấp token. Admin phải duyệt.
// Login: chỉ status=approved mới được token; pending/rejected/blocked trả 403 kèm status code.

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';
import { hashPassword, verifyPassword } from '@/utils/password';
import { signToken } from '@/middleware/auth';
import { RegisterInput, LoginInput } from './auth.schemas';

export interface AuthResult {
  token: string;
  user: {
    id: number;
    email: string;
    full_name: string | null;
    is_admin: boolean;
    status: string;
  };
}

export interface RegisterResult {
  user: {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    status: string;
    register_note: string | null;
  };
  pendingApproval: true;
  message: string;
}

export interface RequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

class AuthService {
  async register(input: RegisterInput, ctx: RequestContext = {}): Promise<RegisterResult> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw HttpError.conflict('Email đã được sử dụng');

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.full_name || null,
        phone: input.phone || null,
        registerNote: input.register_note || null,
        status: 'pending',
      },
    });

    // Gắn device đầu tiên (vẫn lưu fingerprint, để khi approve user login lại từ thiết bị này)
    await prisma.device.create({
      data: {
        userId: user.id,
        fingerprint: input.fingerprint,
        userAgent: ctx.userAgent || null,
        ipAddress: ctx.ip || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        event: 'USER_REGISTERED',
        ipAddress: ctx.ip || null,
        userAgent: ctx.userAgent || null,
        deviceFingerprint: input.fingerprint,
        detail: { fullName: user.fullName, phone: user.phone, registerNote: user.registerNote },
      },
    });

    // Thông báo admin
    await prisma.adminNotification.create({
      data: {
        type: 'user_registered',
        title: 'Tài khoản mới chờ duyệt',
        content: `${user.fullName || user.email} đã đăng ký, đang chờ phê duyệt.`,
        targetUserId: user.id,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        status: user.status,
        register_note: user.registerNote,
      },
      pendingApproval: true,
      message: 'Đăng ký thành công. Tài khoản đang chờ quản trị viên duyệt.',
    };
  }

  async login(input: LoginInput, ctx: RequestContext = {}): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { device: true },
    });

    if (!user) throw HttpError.unauthorized('Email hoặc mật khẩu không đúng');

    // Verify mật khẩu TRƯỚC khi tiết lộ trạng thái → tránh user enumeration
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          event: 'login_failed',
          ipAddress: ctx.ip || null,
          deviceFingerprint: input.fingerprint,
        },
      });
      throw HttpError.unauthorized('Email hoặc mật khẩu không đúng');
    }

    // Sau khi xác thực mật khẩu → kiểm tra status
    if (user.status === 'pending') {
      throw new HttpError(403, 'ACCOUNT_PENDING', 'Tài khoản đang chờ quản trị viên duyệt.', {
        status: user.status,
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        registerNote: user.registerNote,
      });
    }
    if (user.status === 'rejected') {
      throw new HttpError(403, 'ACCOUNT_REJECTED', 'Tài khoản chưa được phê duyệt.', {
        status: user.status,
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        rejectReason: user.rejectReason,
      });
    }
    if (user.status === 'blocked') {
      throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', {
        status: user.status,
        userId: user.id,
        email: user.email,
      });
    }
    if (user.status !== 'approved') {
      throw HttpError.forbidden('Trạng thái tài khoản không hợp lệ.');
    }

    // Device binding logic - chỉ áp dụng cho non-admin
    if (!user.isAdmin) {
      if (!user.device) {
        await prisma.device.create({
          data: {
            userId: user.id,
            fingerprint: input.fingerprint,
            userAgent: ctx.userAgent || null,
            ipAddress: ctx.ip || null,
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            event: 'login_first_device',
            ipAddress: ctx.ip || null,
            userAgent: ctx.userAgent || null,
            deviceFingerprint: input.fingerprint,
          },
        });
      } else if (user.device.status === 'blocked') {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            event: 'login_device_blocked',
            ipAddress: ctx.ip || null,
            userAgent: ctx.userAgent || null,
            deviceFingerprint: input.fingerprint,
          },
        });
        throw new HttpError(403, 'DEVICE_BLOCKED', 'Thiết bị của bạn đã bị quản trị viên khóa. Vui lòng liên hệ admin.', {
          deviceStatus: 'blocked',
        });
      } else if (user.device.fingerprint !== input.fingerprint) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            event: 'login_blocked_device',
            ipAddress: ctx.ip || null,
            userAgent: ctx.userAgent || null,
            deviceFingerprint: input.fingerprint,
            detail: {
              boundFingerprint: user.device.fingerprint.slice(0, 8) + '...',
            },
          },
        });
        throw new HttpError(403, 'DEVICE_MISMATCH', 'Tài khoản đã được gắn với thiết bị khác. Vui lòng liên hệ quản trị viên để đặt lại thiết bị.', {
          deviceStatus: 'mismatch',
        });
      } else {
        await prisma.device.update({
          where: { id: user.device.id },
          data: { lastUsedAt: new Date(), ipAddress: ctx.ip || null },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            event: 'login',
            ipAddress: ctx.ip || null,
            userAgent: ctx.userAgent || null,
            deviceFingerprint: input.fingerprint,
          },
        });
      }
    } else {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          event: 'login_admin',
          ipAddress: ctx.ip || null,
          userAgent: ctx.userAgent || null,
          deviceFingerprint: input.fingerprint,
        },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signToken({ userId: user.id, isAdmin: user.isAdmin });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        is_admin: user.isAdmin,
        status: user.status,
      },
    };
  }

  async adminLogin(email: string, password: string, ctx: RequestContext): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isAdmin) {
      throw HttpError.unauthorized('Tài khoản admin không tồn tại');
    }
    if (user.status !== 'approved') throw HttpError.forbidden('Tài khoản admin chưa được kích hoạt');

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      await prisma.auditLog.create({
        data: { userId: user.id, event: 'admin_login_failed', ipAddress: ctx.ip || null },
      });
      throw HttpError.unauthorized('Mật khẩu không đúng');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({
      data: { userId: user.id, adminId: user.id, event: 'admin_login', ipAddress: ctx.ip || null },
    });

    const token = await signToken({ userId: user.id, isAdmin: true });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        is_admin: true,
        status: user.status,
      },
    };
  }

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('Tài khoản không tồn tại');
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      phone: user.phone,
      is_admin: user.isAdmin,
      status: user.status,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
    };
  }

  async logout(userId: number, ctx: RequestContext & { fingerprint?: string | null }) {
    // JWT stateless - chỉ log audit
    await prisma.auditLog.create({
      data: {
        userId,
        event: 'logout',
        ipAddress: ctx.ip || null,
        deviceFingerprint: ctx.fingerprint || null,
      },
    });
  }
}

export const authService = new AuthService();
