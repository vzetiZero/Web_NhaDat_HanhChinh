// API device - user xem device hiện tại + gửi yêu cầu reset
// Reset thật sự do admin thực hiện (admin-users.js)

import { jsonOk, jsonErr } from '../utils/common.js';
import { requireAuth } from '../middleware/auth.js';
import { getDeviceByUserId } from '../db/devices.js';
import { logAudit } from '../db/audit.js';
import { extractFingerprint, getClientIp } from '../utils/auth.js';
import { notifyAdmin } from '../utils/telegram.js';

export async function handleGetCurrent(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.response;
  const device = await getDeviceByUserId(env, auth.userId);
  if (!device) return jsonOk({ device: null });
  return jsonOk({
    device: {
      id: device.id,
      fingerprint_short: device.fingerprint.slice(0, 8) + '...',
      user_agent: device.user_agent,
      bound_at: device.bound_at,
      last_used_at: device.last_used_at,
      reset_count: device.reset_count,
    },
  });
}

export async function handleRequestReset(request, env, ctx) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.response;

  await logAudit(env, {
    user_id: auth.userId,
    event: 'device_reset_requested',
    ip_address: getClientIp(request),
    device_fingerprint: extractFingerprint(request),
  });

  notifyAdmin(env, ctx, 'Yêu cầu reset thiết bị', `User ID: ${auth.userId} yêu cầu reset thiết bị.`);

  return jsonOk({
    message: 'Yêu cầu đã được ghi nhận. Quản trị viên sẽ xử lý sớm nhất.',
  });
}
