// Templates routes - admin upload, public list

import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '@/middleware/error';
import { requireAdmin, requireAuth, AuthedRequest } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { templatesService } from './templates.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const templatesRouter = Router();

// Public (cho user xem template available khi tạo contract)
templatesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const items = await templatesService.list();
    res.json({ success: true, items });
  })
);

templatesRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const t = await templatesService.findById(id);
    res.json({ success: true, template: t });
  })
);

// Admin: upload template DOCX
export const adminTemplatesRouter = Router();

adminTemplatesRouter.get(
  '/',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const items = await templatesService.list();
    res.json({ success: true, items });
  })
);

adminTemplatesRouter.post(
  '/',
  requireAdmin,
  upload.single('file'),
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    if (!file) throw HttpError.badRequest('Thiếu file');
    const { code, name, description } = req.body as { code?: string; name?: string; description?: string };
    if (!code) throw HttpError.badRequest('Thiếu code template');
    if (!name) throw HttpError.badRequest('Thiếu tên template');

    const tpl = await templatesService.upload({
      code,
      name,
      description,
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      adminId: req.user!.userId,
    });
    res.json({ success: true, template: tpl, message: 'Đã upload template' });
  })
);

adminTemplatesRouter.get(
  '/:id/download-url',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { url, template } = await templatesService.getSignedDownloadUrl(id);
    res.json({ success: true, url, template });
  })
);
