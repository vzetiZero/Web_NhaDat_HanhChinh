// Content routes:
// Public (no auth):
//   GET /api/public/home           — aggregate
//   GET /api/public/banners        — active banners
//   GET /api/public/faqs           — active faqs
//   GET /api/public/template-samples — active samples
// Admin:
//   GET/POST  /api/admin/banners
//   GET/PATCH/DELETE /api/admin/banners/:id
//   (same for faqs, template-samples)

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { requireAdmin } from '@/middleware/auth';
import { HttpError } from '@/lib/http-error';
import { contentService } from './content.service';
import { settingsService } from '@/modules/settings/settings.service';

// ===================== PUBLIC =====================
export const publicContentRouter = Router();

publicContentRouter.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const [banners, faqs, samples, settings] = await Promise.all([
      contentService.listBanners(true),
      contentService.listFaqs(true),
      contentService.listSamples(true),
      settingsService.getPublic(),
    ]);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, banners, faqs, samples, settings });
  })
);

publicContentRouter.get(
  '/banners',
  asyncHandler(async (_req, res) => {
    const items = await contentService.listBanners(true);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, items });
  })
);

publicContentRouter.get(
  '/faqs',
  asyncHandler(async (_req, res) => {
    const items = await contentService.listFaqs(true);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, items });
  })
);

publicContentRouter.get(
  '/template-samples',
  asyncHandler(async (_req, res) => {
    const items = await contentService.listSamples(true);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, items });
  })
);

publicContentRouter.get(
  '/site-settings',
  asyncHandler(async (_req, res) => {
    const settings = await settingsService.getPublic();
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, settings });
  })
);

// ===================== ADMIN: BANNERS =====================
export const adminBannersRouter = Router();

adminBannersRouter.use(requireAdmin);

adminBannersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await contentService.listBanners(false);
    res.json({ success: true, items, total: items.length });
  })
);

adminBannersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const item = await contentService.createBanner(req.body || {});
      res.json({ success: true, item, message: 'Đã tạo banner' });
    } catch (e) {
      throw HttpError.badRequest(e instanceof Error ? e.message : 'Lỗi tạo banner');
    }
  })
);

adminBannersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const item = await contentService.getBanner(id);
    if (!item) throw HttpError.notFound('Không tìm thấy banner');
    res.json({ success: true, item });
  })
);

adminBannersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    try {
      const item = await contentService.updateBanner(id, req.body || {});
      res.json({ success: true, item, message: 'Đã cập nhật banner' });
    } catch (e) {
      throw HttpError.badRequest(e instanceof Error ? e.message : 'Lỗi cập nhật');
    }
  })
);

adminBannersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await contentService.deleteBanner(id);
    res.json({ success: true, message: 'Đã xóa banner' });
  })
);

// ===================== ADMIN: FAQS =====================
export const adminFaqsRouter = Router();

adminFaqsRouter.use(requireAdmin);

adminFaqsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await contentService.listFaqs(false);
    res.json({ success: true, items, total: items.length });
  })
);

adminFaqsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const item = await contentService.createFaq(req.body || {});
      res.json({ success: true, item, message: 'Đã tạo FAQ' });
    } catch (e) {
      throw HttpError.badRequest(e instanceof Error ? e.message : 'Lỗi tạo FAQ');
    }
  })
);

adminFaqsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const item = await contentService.getFaq(id);
    if (!item) throw HttpError.notFound('Không tìm thấy FAQ');
    res.json({ success: true, item });
  })
);

adminFaqsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    try {
      const item = await contentService.updateFaq(id, req.body || {});
      res.json({ success: true, item, message: 'Đã cập nhật FAQ' });
    } catch (e) {
      throw HttpError.badRequest(e instanceof Error ? e.message : 'Lỗi cập nhật');
    }
  })
);

adminFaqsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await contentService.deleteFaq(id);
    res.json({ success: true, message: 'Đã xóa FAQ' });
  })
);

// ===================== ADMIN: TEMPLATE SAMPLES =====================
export const adminTemplateSamplesRouter = Router();

adminTemplateSamplesRouter.use(requireAdmin);

adminTemplateSamplesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await contentService.listSamples(false);
    res.json({ success: true, items, total: items.length });
  })
);

adminTemplateSamplesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const item = await contentService.createSample(req.body || {});
      res.json({ success: true, item, message: 'Đã tạo mẫu' });
    } catch (e) {
      throw HttpError.badRequest(e instanceof Error ? e.message : 'Lỗi tạo mẫu');
    }
  })
);

adminTemplateSamplesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    const item = await contentService.getSample(id);
    if (!item) throw HttpError.notFound('Không tìm thấy mẫu');
    res.json({ success: true, item });
  })
);

adminTemplateSamplesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    try {
      const item = await contentService.updateSample(id, req.body || {});
      res.json({ success: true, item, message: 'Đã cập nhật mẫu' });
    } catch (e) {
      throw HttpError.badRequest(e instanceof Error ? e.message : 'Lỗi cập nhật');
    }
  })
);

adminTemplateSamplesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw HttpError.badRequest('ID không hợp lệ');
    await contentService.deleteSample(id);
    res.json({ success: true, message: 'Đã xóa mẫu' });
  })
);
