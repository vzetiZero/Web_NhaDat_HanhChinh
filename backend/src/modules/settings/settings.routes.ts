// Settings routes
// - Public: GET /api/settings/public (no auth)
// - Admin: GET/PATCH /api/admin/settings
// - Admin: POST /api/admin/settings/upload-asset (logo/favicon → public Supabase bucket)

import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '@/middleware/error';
import { requireAdmin, AuthedRequest, getClientIp } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { prisma } from '@/lib/prisma';
import { storage } from '@/services/storage.service';
import { settingsService } from './settings.service';

const ASSET_BUCKET = 'site-assets';
const MAX_ASSET_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ASSET_BYTES },
});

let _bucketEnsured = false;
async function ensureAssetBucket() {
  if (_bucketEnsured) return;
  await storage.ensureBucket(ASSET_BUCKET, true);
  _bucketEnsured = true;
}

export const publicSettingsRouter = Router();

publicSettingsRouter.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const s = await settingsService.getPublic();
    // Cache 60s ở client để giảm load
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, settings: s });
  })
);

export const adminSettingsRouter = Router();

adminSettingsRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const s = await settingsService.getAll();
    res.json({ success: true, settings: s });
  })
);

adminSettingsRouter.patch(
  '/',
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    try {
      const updated = await settingsService.update(req.body || {});
      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          event: 'SITE_SETTINGS_UPDATED',
          ipAddress: getClientIp(req),
          detail: { fields: Object.keys(req.body || {}) },
        },
      });
      res.json({ success: true, settings: updated, message: 'Đã lưu cấu hình' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi cập nhật cấu hình';
      throw HttpError.badRequest(msg);
    }
  })
);

/**
 * POST /api/admin/settings/upload-asset?type=logo|favicon
 * multipart/form-data field: file
 * Trả về { url } — public URL trên Supabase CDN, có thể paste vào field siteLogoUrl/faviconUrl rồi PATCH.
 */
adminSettingsRouter.post(
  '/upload-asset',
  requireAdmin,
  upload.single('file'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    if (!file) throw HttpError.badRequest('Thiếu file');

    const type = String(req.query.type || req.body?.type || '').toLowerCase();
    if (type !== 'logo' && type !== 'favicon') {
      throw HttpError.badRequest('Tham số type phải là "logo" hoặc "favicon"');
    }
    const ext = ALLOWED_MIMES[file.mimetype];
    if (!ext) {
      throw HttpError.badRequest('Chỉ chấp nhận PNG/JPG/WEBP/SVG/ICO');
    }
    if (file.size > MAX_ASSET_BYTES) {
      throw HttpError.badRequest('File tối đa 2MB');
    }
    // Favicon dùng kích thước nhỏ thêm 1 cảnh báo (không chặn)
    if (type === 'favicon' && file.size > 200 * 1024) {
      // chỉ log, không throw — admin có thể chủ ý upload favicon to
    }

    await ensureAssetBucket();
    const safeName = storage.sanitizeFilename(file.originalname || `${type}.${ext}`);
    const key = `${type}/${Date.now()}-${safeName}`;

    await storage.upload({
      bucket: ASSET_BUCKET,
      key,
      body: file.buffer,
      contentType: file.mimetype,
      upsert: true,
      cacheControl: '604800', // 7 ngày — asset đổi tên mỗi lần upload nên cache lâu OK
    });
    const url = storage.getPublicUrl(ASSET_BUCKET, key);

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        event: 'SITE_ASSET_UPLOADED',
        ipAddress: getClientIp(req),
        detail: { type, key, size: file.size, mime: file.mimetype },
      },
    });

    res.json({ success: true, url, key, type, size: file.size });
  })
);
