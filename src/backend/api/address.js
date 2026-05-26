// API địa chỉ hành chính VN (sau cải cách 2025: bỏ cấp huyện, sáp nhập tỉnh/xã)

import { jsonOk, jsonErr } from '../utils/common.js';
import {
  PROVINCES,
  getWardsByProvince,
  searchWards,
} from '../../data/vn-wards-2025.js';

export async function handleProvinces(request, env) {
  return jsonOk({
    items: PROVINCES.map((p) => ({ code: p.code, name: p.name, full_name: p.full_name })),
    count: PROVINCES.length,
  });
}

export async function handleDistricts(request, env) {
  return jsonOk({
    items: [],
    message: 'Việt Nam đã bỏ cấp huyện từ 2025, dùng /api/address/wards?province= hoặc /api/address/search?q=',
  });
}

export async function handleWards(request, env) {
  const url = new URL(request.url);
  const provinceCode = url.searchParams.get('province') || url.searchParams.get('district');
  if (!provinceCode) return jsonErr('MISSING_PROVINCE', 'Thiếu tham số province');
  const items = getWardsByProvince(provinceCode);
  return jsonOk({ items, count: items.length });
}

/**
 * GET /api/address/search?q=...&limit=10
 * Fuzzy search xã/phường + tỉnh - dùng cho autocomplete địa chỉ
 */
export async function handleSearch(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 30);
  if (!q || q.length < 2) {
    return jsonOk({ items: [], message: 'Nhập tối thiểu 2 ký tự' });
  }
  const items = searchWards(q, limit);
  return jsonOk({ items, count: items.length });
}
