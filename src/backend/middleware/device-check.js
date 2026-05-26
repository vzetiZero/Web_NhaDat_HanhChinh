// Device-check middleware
// Kiểm tra X-Device-Fingerprint khớp với device đã gắn của user
// Chạy sau requireAuth, không áp dụng cho admin (admin có thể đăng nhập đa thiết bị)

import { extractFingerprint } from '../utils/auth.js';
import { getDeviceByUserId, touchDevice } from '../db/devices.js';
import { jsonErr } from '../utils/common.js';
import { logAudit } from '../db/audit.js';

/**
 * Yêu cầu device khớp. Trả về { error, response } hoặc { error: false }.
 * Admin được bypass.
 */
export async function requireDeviceMatch(request, env, auth) {
  // Admin không cần device check
  if (auth?.isAdmin) return { error: false };

  const fp = extractFingerprint(request);
  if (!fp) {
    return {
      error: true,
      response: jsonErr(
        'DEVICE_REQUIRED',
        'Thiếu thông tin thiết bị. Vui lòng làm mới trang và đăng nhập lại.',
        403
      ),
    };
  }

  const device = await getDeviceByUserId(env, auth.userId);
  if (!device) {
    return {
      error: true,
      response: jsonErr(
        'DEVICE_NOT_BOUND',
        'Tài khoản chưa được gắn thiết bị. Vui lòng đăng nhập lại.',
        403
      ),
    };
  }

  if (device.fingerprint !== fp) {
    await logAudit(env, {
      user_id: auth.userId,
      event: 'device_mismatch_blocked',
      device_fingerprint: fp,
      ip_address: request.headers.get('CF-Connecting-IP') || null,
      user_agent: request.headers.get('User-Agent') || null,
      detail: JSON.stringify({ expected: device.fingerprint.slice(0, 8) + '...', got: fp.slice(0, 8) + '...' }),
    });
    return {
      error: true,
      response: jsonErr(
        'DEVICE_MISMATCH',
        'Tài khoản đã được gắn với thiết bị khác. Vui lòng liên hệ quản trị viên để đặt lại.',
        403
      ),
    };
  }

  // Update last_used_at (không cần await)
  touchDevice(env, device.id).catch(() => {});
  return { error: false, device };
}
