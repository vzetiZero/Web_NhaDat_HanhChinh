// JWT auth middleware
// Verify Bearer token, attach req.user
// requireAuth - bắt buộc; optionalAuth - cho phép không có token

import { Request, Response, NextFunction } from 'express';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { env } from '@/config/env';
import { HttpError } from '@/lib/http-error';

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export interface AuthPayload extends JWTPayload {
  userId: number;
  isAdmin: boolean;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

/**
 * Sinh JWT token
 * @param expiresIn - ví dụ '7d', '1h', '30m'
 */
export async function signToken(
  payload: Omit<AuthPayload, 'iat' | 'exp'>,
  expiresIn: string = env.JWT_EXPIRES_IN
): Promise<string> {
  return await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyJwt(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId !== 'number') return null;
    return {
      userId: payload.userId,
      isAdmin: !!payload.isAdmin,
      ...payload,
    } as AuthPayload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(HttpError.unauthorized('Thiếu token'));
  const payload = await verifyJwt(token);
  if (!payload) return next(HttpError.unauthorized('Token không hợp lệ hoặc hết hạn'));
  req.user = payload;
  next();
}

export async function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(HttpError.unauthorized('Thiếu token'));
  const payload = await verifyJwt(token);
  if (!payload) return next(HttpError.unauthorized('Token không hợp lệ'));
  if (!payload.isAdmin) return next(HttpError.forbidden('Yêu cầu quyền admin'));
  req.user = payload;
  next();
}

export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  const payload = await verifyJwt(token);
  if (payload) req.user = payload;
  next();
}

/**
 * Lấy IP của client - hỗ trợ proxy (Railway, Cloudflare front)
 */
export function getClientIp(req: Request): string {
  return (
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
}

export function getDeviceFingerprint(req: Request): string | null {
  return (req.headers['x-device-fingerprint'] as string) || null;
}
