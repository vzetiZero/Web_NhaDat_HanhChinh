// Admin users API - list, view, reset device, suspend

import { jsonOk, jsonErr, getPagination } from '../utils/common.js';
import { requireAdmin } from '../middleware/admin.js';
import { listUsers, getUserById, setUserStatus } from '../db/users.js';
import { getDeviceByUserId, resetDevice } from '../db/devices.js';
import { logAudit } from '../db/audit.js';
import { getClientIp } from '../utils/auth.js';

export async function handleList(request, env) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const url = new URL(request.url);
  const { page, limit } = getPagination(url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || null;
  const data = await listUsers(env, { page, limit, search, status });
  return jsonOk(data);
}

export async function handleGet(request, env, id) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const user = await getUserById(env, id);
  if (!user) return jsonErr('NOT_FOUND', 'Không tìm thấy user', 404);
  const device = await getDeviceByUserId(env, id);
  delete user.password_hash;
  delete user.password_salt;
  return jsonOk({
    user,
    device: device
      ? {
          id: device.id,
          fingerprint_short: device.fingerprint.slice(0, 8) + '...',
          user_agent: device.user_agent,
          ip_address: device.ip_address,
          bound_at: device.bound_at,
          last_used_at: device.last_used_at,
          reset_count: device.reset_count,
        }
      : null,
  });
}

export async function handleResetDevice(request, env, id) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const user = await getUserById(env, id);
  if (!user) return jsonErr('NOT_FOUND', 'Không tìm thấy user', 404);
  await resetDevice(env, id);
  await logAudit(env, {
    admin_id: auth.userId,
    user_id: id,
    event: 'admin_reset_device',
    target_type: 'user',
    target_id: id,
    ip_address: getClientIp(request),
  });
  return jsonOk({ message: 'Đã reset thiết bị. User có thể đăng nhập từ thiết bị mới.' });
}

export async function handleSuspend(request, env, id) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const user = await getUserById(env, id);
  if (!user) return jsonErr('NOT_FOUND', 'Không tìm thấy user', 404);
  if (user.is_admin) return jsonErr('CANT_SUSPEND_ADMIN', 'Không thể khóa tài khoản admin', 400);

  const newStatus = user.status === 'active' ? 'suspended' : 'active';
  await setUserStatus(env, id, newStatus);
  await logAudit(env, {
    admin_id: auth.userId,
    user_id: id,
    event: newStatus === 'suspended' ? 'admin_suspend_user' : 'admin_activate_user',
    target_type: 'user',
    target_id: id,
    ip_address: getClientIp(request),
  });
  return jsonOk({
    message: newStatus === 'suspended' ? 'Đã khóa tài khoản' : 'Đã kích hoạt tài khoản',
    status: newStatus,
  });
}
