// API auth - register, login, logout, me
// Bao gồm cơ chế device binding khi login

import { jsonOk, jsonErr, parseJsonBody } from '../utils/common.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  extractFingerprint,
  getClientIp,
} from '../utils/auth.js';
import { validateEmail, validatePassword, validateFingerprint, sanitizeString } from '../utils/validation.js';
import { getUserByEmail, createUser, updateLastLogin, getUserById } from '../db/users.js';
import { getDeviceByUserId, bindDevice } from '../db/devices.js';
import { logAudit } from '../db/audit.js';
import { requireAuth } from '../middleware/auth.js';

export async function handleRegister(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonErr('BAD_REQUEST', 'Body không hợp lệ', 400);

  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const fullName = sanitizeString(body.full_name || '', 200);
  const phone = sanitizeString(body.phone || '', 20);
  const fingerprint = String(body.fingerprint || '');

  if (!validateEmail(email)) return jsonErr('INVALID_EMAIL', 'Email không hợp lệ');
  if (!validatePassword(password)) {
    return jsonErr('WEAK_PASSWORD', 'Mật khẩu tối thiểu 8 ký tự, có chữ và số');
  }
  if (!validateFingerprint(fingerprint)) {
    return jsonErr('INVALID_FINGERPRINT', 'Thiếu thông tin thiết bị');
  }

  const existed = await getUserByEmail(env, email);
  if (existed) return jsonErr('EMAIL_EXISTS', 'Email đã được sử dụng');

  const { hash, salt } = await hashPassword(password);
  const user = await createUser(env, {
    email,
    password_hash: hash,
    password_salt: salt,
    full_name: fullName,
    phone,
  });

  const ip = getClientIp(request);
  const ua = request.headers.get('User-Agent') || null;
  await bindDevice(env, { userId: user.id, fingerprint, userAgent: ua, ipAddress: ip });

  const token = await generateToken(user.id, false, env);
  await updateLastLogin(env, user.id);

  await logAudit(env, {
    user_id: user.id,
    event: 'register',
    ip_address: ip,
    user_agent: ua,
    device_fingerprint: fingerprint,
  });

  return jsonOk({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: !!user.is_admin,
    },
  });
}

export async function handleLogin(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonErr('BAD_REQUEST', 'Body không hợp lệ', 400);

  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const fingerprint = String(body.fingerprint || '');

  if (!email || !password) return jsonErr('MISSING_FIELDS', 'Thiếu email hoặc mật khẩu');
  if (!validateFingerprint(fingerprint)) {
    return jsonErr('INVALID_FINGERPRINT', 'Thiếu thông tin thiết bị');
  }

  const user = await getUserByEmail(env, email);
  if (!user) return jsonErr('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401);
  if (user.status !== 'active') {
    return jsonErr('ACCOUNT_DISABLED', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403);
  }

  const ok = await comparePassword(password, user.password_hash, user.password_salt);
  if (!ok) {
    await logAudit(env, {
      user_id: user.id,
      event: 'login_failed',
      ip_address: getClientIp(request),
      device_fingerprint: fingerprint,
    });
    return jsonErr('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401);
  }

  const ip = getClientIp(request);
  const ua = request.headers.get('User-Agent') || null;

  // ====== Device binding logic ======
  if (!user.is_admin) {
    const device = await getDeviceByUserId(env, user.id);
    if (!device) {
      // Lần đầu - bind device
      await bindDevice(env, { userId: user.id, fingerprint, userAgent: ua, ipAddress: ip });
      await logAudit(env, {
        user_id: user.id, event: 'login_first_device',
        ip_address: ip, user_agent: ua, device_fingerprint: fingerprint,
      });
    } else if (device.fingerprint !== fingerprint) {
      await logAudit(env, {
        user_id: user.id, event: 'login_blocked_device',
        ip_address: ip, user_agent: ua, device_fingerprint: fingerprint,
        detail: { boundFingerprint: device.fingerprint.slice(0, 8) + '...' },
      });
      return jsonErr(
        'DEVICE_MISMATCH',
        'Tài khoản đã được gắn với thiết bị khác. Vui lòng liên hệ quản trị viên để đặt lại thiết bị.',
        403
      );
    } else {
      await logAudit(env, {
        user_id: user.id, event: 'login',
        ip_address: ip, user_agent: ua, device_fingerprint: fingerprint,
      });
    }
  } else {
    await logAudit(env, {
      user_id: user.id, event: 'login_admin',
      ip_address: ip, user_agent: ua, device_fingerprint: fingerprint,
    });
  }

  await updateLastLogin(env, user.id);
  const token = await generateToken(user.id, !!user.is_admin, env);

  return jsonOk({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: !!user.is_admin,
    },
  });
}

export async function handleLogout(request, env) {
  // JWT stateless - logout chỉ là client xóa token. Log audit để biết.
  const auth = await requireAuth(request, env);
  if (!auth.error) {
    await logAudit(env, {
      user_id: auth.userId,
      event: 'logout',
      ip_address: getClientIp(request),
      device_fingerprint: extractFingerprint(request),
    });
  }
  return jsonOk({ message: 'Đăng xuất thành công' });
}

export async function handleMe(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.response;
  const user = await getUserById(env, auth.userId);
  if (!user) return jsonErr('NOT_FOUND', 'Không tìm thấy tài khoản', 404);
  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      is_admin: !!user.is_admin,
      status: user.status,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    },
  });
}
