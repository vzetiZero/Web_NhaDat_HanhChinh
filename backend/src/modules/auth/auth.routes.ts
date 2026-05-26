// Auth routes

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { validate } from '@/middleware/validate';
import { requireAuth, getClientIp, getDeviceFingerprint, AuthedRequest } from '@/middleware/auth';
import { registerSchema, loginSchema, adminLoginSchema } from './auth.schemas';
import { authService } from './auth.service';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });
    res.json({ success: true, ...result });
  })
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });
    res.json({ success: true, ...result });
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.user) {
      await authService.logout(req.user.userId, {
        ip: getClientIp(req),
        fingerprint: getDeviceFingerprint(req),
      });
    }
    res.json({ success: true, message: 'Đăng xuất thành công' });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) return;
    const user = await authService.me(req.user.userId);
    res.json({ success: true, user });
  })
);

// Admin login - không cần device fingerprint
export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  validate(adminLoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.adminLogin(req.body.email, req.body.password, {
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });
    res.json({ success: true, ...result });
  })
);
