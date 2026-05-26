// Address API - provinces, wards (theo tỉnh), fuzzy search
// Sau cải cách 2025: bỏ cấp huyện. Còn 2 cấp: tỉnh + xã/phường.

import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { HttpError } from '@/lib/http-error';
import { PROVINCES, getWardsByProvince, searchWards } from '@/data/vn-wards';

export const addressRouter = Router();

addressRouter.get(
  '/provinces',
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      items: PROVINCES.map((p) => ({ code: p.code, name: p.name, full_name: p.full_name })),
      count: PROVINCES.length,
    });
  })
);

addressRouter.get(
  '/districts',
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      items: [],
      message: 'Việt Nam đã bỏ cấp huyện từ 2025, dùng /api/address/wards?province=',
    });
  })
);

addressRouter.get(
  '/wards',
  asyncHandler(async (req, res) => {
    const provinceCode = (req.query.province || req.query.district) as string | undefined;
    if (!provinceCode) throw HttpError.badRequest('Thiếu tham số province');
    const items = getWardsByProvince(provinceCode);
    res.json({ success: true, items, count: items.length });
  })
);

addressRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 10, 30);
    if (q.length < 2) {
      return res.json({ success: true, items: [], message: 'Nhập tối thiểu 2 ký tự' });
    }
    const items = searchWards(q, limit);
    res.json({ success: true, items, count: items.length });
  })
);
