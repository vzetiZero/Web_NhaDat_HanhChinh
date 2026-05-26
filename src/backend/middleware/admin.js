// Require admin middleware

import { requireAuth } from './auth.js';
import { jsonErr } from '../utils/common.js';

export async function requireAdmin(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth;
  if (!auth.isAdmin) {
    return {
      error: true,
      response: jsonErr('FORBIDDEN', 'Bạn không có quyền truy cập trang quản trị', 403),
    };
  }
  return auth;
}
