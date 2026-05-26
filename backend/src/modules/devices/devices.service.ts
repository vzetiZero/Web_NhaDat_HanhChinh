// Devices service - quản lý thiết bị đăng nhập
// Schema hiện tại: 1 user = 1 device (UNIQUE userId). Vẫn build API list-style
// để sau này dễ mở rộng multi-device.
//
// Status (string, không enum):
//   active        - đang hoạt động
//   reset_pending - admin đã reset, user sẽ gắn lại ở lần login kế tiếp
//   blocked       - admin chặn, user không login được dù đúng fingerprint

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http-error';

export interface DeviceListOpts {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  userId?: number;
}

/**
 * Parser nhẹ User-Agent → browser + OS.
 * Không phụ thuộc lib ngoài. Đủ dùng cho admin xem nhanh.
 */
export function parseUA(ua: string | null | undefined): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Không rõ', os: 'Không rõ', device: 'Không rõ' };
  let browser = 'Không rõ';
  let os = 'Không rõ';
  let device = 'Desktop';

  // Browser
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  // OS
  if (/Windows NT 10/.test(ua)) os = 'Windows';
  else if (/Windows NT 11/.test(ua)) os = 'Windows 11';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod|iOS/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  // Device type
  if (/iPhone|iPod/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android.*Mobile/.test(ua)) device = 'Android Phone';
  else if (/Android/.test(ua)) device = 'Android Tablet';
  else if (/Mobile/.test(ua)) device = 'Mobile';

  return { browser, os, device };
}

function enrichDevice<T extends { userAgent: string | null; fingerprint: string }>(d: T) {
  const meta = parseUA(d.userAgent);
  return {
    ...d,
    browser: meta.browser,
    os: meta.os,
    deviceType: meta.device,
    fingerprintShort: d.fingerprint ? d.fingerprint.slice(0, 8) + '...' : null,
  };
}

class DevicesService {
  /**
   * Admin: list tất cả thiết bị + thông tin user gắn vào.
   */
  async listForAdmin(opts: DeviceListOpts) {
    const where: Prisma.DeviceWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.userId) where.userId = opts.userId;
    if (opts.search) {
      where.user = {
        OR: [
          { email: { contains: opts.search, mode: 'insensitive' } },
          { fullName: { contains: opts.search, mode: 'insensitive' } },
          { phone: { contains: opts.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await prisma.$transaction([
      prisma.device.count({ where }),
      prisma.device.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true, phone: true, status: true, isAdmin: true } },
        },
        orderBy: { lastUsedAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
    ]);

    return {
      items: items.map(enrichDevice),
      total,
      page: opts.page,
      limit: opts.limit,
    };
  }

  /**
   * User: xem thiết bị của chính mình (1 record do schema UNIQUE userId).
   */
  async listMine(userId: number) {
    const device = await prisma.device.findUnique({ where: { userId } });
    if (!device) return { items: [] };
    return { items: [enrichDevice(device)] };
  }

  async findById(id: number) {
    const d = await prisma.device.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, fullName: true, status: true } } },
    });
    if (!d) throw HttpError.notFound('Thiết bị không tồn tại');
    return enrichDevice(d);
  }

  async block(deviceId: number, adminId: number, ip?: string | null) {
    const d = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!d) throw HttpError.notFound('Thiết bị không tồn tại');
    if (d.status === 'blocked') throw HttpError.badRequest('Thiết bị đã bị khóa');

    await prisma.device.update({ where: { id: deviceId }, data: { status: 'blocked' } });
    await prisma.auditLog.create({
      data: {
        adminId,
        userId: d.userId,
        event: 'DEVICE_BLOCKED',
        targetType: 'device',
        targetId: deviceId,
        ipAddress: ip || null,
      },
    });
  }

  async unblock(deviceId: number, adminId: number, ip?: string | null) {
    const d = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!d) throw HttpError.notFound('Thiết bị không tồn tại');
    if (d.status === 'active') throw HttpError.badRequest('Thiết bị đang hoạt động');

    await prisma.device.update({ where: { id: deviceId }, data: { status: 'active' } });
    await prisma.auditLog.create({
      data: {
        adminId,
        userId: d.userId,
        event: 'DEVICE_UNBLOCKED',
        targetType: 'device',
        targetId: deviceId,
        ipAddress: ip || null,
      },
    });
  }

  /**
   * Gỡ device — user có thể login từ thiết bị mới ở lần kế tiếp.
   * Khác reset ở users.service: route này xoá theo deviceId thay vì userId.
   */
  async remove(deviceId: number, adminId: number, ip?: string | null) {
    const d = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!d) throw HttpError.notFound('Thiết bị không tồn tại');

    await prisma.device.update({
      where: { id: deviceId },
      data: { resetCount: { increment: 1 } },
    });
    await prisma.device.delete({ where: { id: deviceId } });
    await prisma.auditLog.create({
      data: {
        adminId,
        userId: d.userId,
        event: 'DEVICE_REMOVED',
        targetType: 'device',
        targetId: deviceId,
        ipAddress: ip || null,
        detail: { resetCount: d.resetCount + 1 },
      },
    });
  }
}

export const devicesService = new DevicesService();
