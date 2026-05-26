// Auth middleware - verify JWT, attach userId vào kết quả

import { verifyToken, extractToken } from '../utils/auth.js';
import { jsonErr } from '../utils/common.js';

/**
 * Require auth - trả về { error, response } nếu thất bại
 * hoặc { error: false, userId, isAdmin, payload }
 */
export async function requireAuth(request, env) {
  const token = extractToken(request);
  if (!token) {
    return {
      error: true,
      response: jsonErr('UNAUTHORIZED', 'Vui lòng đăng nhập', 401),
    };
  }
  const payload = await verifyToken(token, env);
  if (!payload) {
    return {
      error: true,
      response: jsonErr('UNAUTHORIZED', 'Phiên đăng nhập hết hạn hoặc không hợp lệ', 401),
    };
  }
  return {
    error: false,
    userId: payload.userId,
    isAdmin: payload.isAdmin,
    payload,
  };
}

/**
 * Optional auth - không lỗi nếu không có token
 */
export async function optionalAuth(request, env) {
  const token = extractToken(request);
  if (!token) return { userId: null, isAdmin: false };
  const payload = await verifyToken(token, env);
  if (!payload) return { userId: null, isAdmin: false };
  return { userId: payload.userId, isAdmin: payload.isAdmin, payload };
}
