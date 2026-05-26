// Admin login endpoint riêng (bỏ qua device-binding)

import { jsonOk, jsonErr, parseJsonBody } from '../utils/common.js';
import { comparePassword, generateToken, getClientIp } from '../utils/auth.js';
import { getUserByEmail, updateLastLogin } from '../db/users.js';
import { logAudit } from '../db/audit.js';

export async function handleLogin(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonErr('BAD_REQUEST', 'Body không hợp lệ');

  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  if (!email || !password) return jsonErr('MISSING_FIELDS', 'Thiếu email hoặc mật khẩu');

  const user = await getUserByEmail(env, email);
  if (!user || !user.is_admin) {
    return jsonErr('INVALID_CREDENTIALS', 'Tài khoản admin không tồn tại', 401);
  }
  if (user.status !== 'active') {
    return jsonErr('ACCOUNT_DISABLED', 'Tài khoản đã bị khóa', 403);
  }
  const ok = await comparePassword(password, user.password_hash, user.password_salt);
  if (!ok) {
    await logAudit(env, {
      user_id: user.id, event: 'admin_login_failed',
      ip_address: getClientIp(request),
    });
    return jsonErr('INVALID_CREDENTIALS', 'Mật khẩu không đúng', 401);
  }

  await updateLastLogin(env, user.id);
  const token = await generateToken(user.id, true, env);

  await logAudit(env, {
    user_id: user.id, admin_id: user.id, event: 'admin_login',
    ip_address: getClientIp(request),
  });

  return jsonOk({
    token,
    user: {
      id: user.id, email: user.email, full_name: user.full_name, is_admin: true,
    },
  });
}
