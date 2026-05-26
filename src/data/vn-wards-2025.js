// Wrapper cho data hành chính VN 2025
// Sau cải cách 2025, VN bỏ cấp huyện - chỉ còn tỉnh + xã/phường
// Data nguồn: vn-wards-source.js (copy từ vn-provinces-wards@1.0.2)
//
// Export:
//   - PROVINCES: array { code, name, full_name }
//   - getWardsByProvince(code): array { code, name, type }
//   - Backward compat: getDistrictsByProvince(code) trả [], getWardsByDistrict(code) lookup theo province

import { VN_WARDS_BY_PROVINCE } from './vn-wards-source.js';

// Slugify để làm code ổn định cho province (vd: "Hà Nội" -> "ha-noi")
function makeCode(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getType(wardName) {
  if (wardName.startsWith('Phường')) return 'phuong';
  if (wardName.startsWith('Xã')) return 'xa';
  if (wardName.startsWith('Thị trấn')) return 'thi-tran';
  if (wardName.startsWith('Đặc khu')) return 'dac-khu';
  return 'khac';
}

// Build PROVINCES
export const PROVINCES = Object.keys(VN_WARDS_BY_PROVINCE)
  .sort((a, b) => a.localeCompare(b, 'vi'))
  .map((name) => ({
    code: makeCode(name),
    name,
    full_name: name,
  }));

const PROVINCE_BY_CODE = Object.fromEntries(PROVINCES.map((p) => [p.code, p.name]));

export function getProvinceName(code) {
  return PROVINCE_BY_CODE[code] || null;
}

export function getWardsByProvince(provinceCode) {
  const name = PROVINCE_BY_CODE[provinceCode];
  if (!name) return [];
  const wards = VN_WARDS_BY_PROVINCE[name] || [];
  return wards.map((w, idx) => ({
    code: `${provinceCode}__${idx}`,
    name: w,
    type: getType(w),
  }));
}

// ===== Backward compat (nếu code cũ vẫn gọi /districts /wards?district=) =====
export function getDistrictsByProvince(_code) {
  return [];
}

export function getWardsByDistrict(districtCode) {
  return getWardsByProvince(districtCode);
}

// ===== Fuzzy search for autocomplete =====
// Bỏ dấu, lowercase, normalize spaces để so sánh không phân biệt diacritics
function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build flat index 1 lần
let _flatIndex = null;
function buildFlatIndex() {
  if (_flatIndex) return _flatIndex;
  const arr = [];
  for (const provinceName of Object.keys(VN_WARDS_BY_PROVINCE)) {
    const provinceCode = makeCode(provinceName);
    const wards = VN_WARDS_BY_PROVINCE[provinceName] || [];
    for (const w of wards) {
      const fullAddress = `${w}, ${provinceName}`;
      arr.push({
        ward: w,
        province: provinceName,
        provinceCode,
        full: fullAddress,
        norm: normalize(fullAddress),
        wardNorm: normalize(w),
      });
    }
  }
  _flatIndex = arr;
  return arr;
}

/**
 * Fuzzy search xã/phường + tỉnh
 * - Tokenize query, mỗi token phải xuất hiện trong full address
 * - Score = ưu tiên match ở ward name + bắt đầu chuỗi
 * Trả về array { ward, province, full, score } đã sort
 */
export function searchWards(query, limit = 10) {
  const q = normalize(query);
  if (!q || q.length < 2) return [];
  const tokens = q.split(' ').filter((t) => t.length >= 1);
  if (!tokens.length) return [];

  const idx = buildFlatIndex();
  const results = [];
  for (const item of idx) {
    let score = 0;
    let allMatch = true;
    for (const t of tokens) {
      if (!item.norm.includes(t)) {
        allMatch = false;
        break;
      }
      // Bonus nếu match trong ward name (vs chỉ trong province)
      if (item.wardNorm.includes(t)) score += 5;
      // Bonus nếu prefix
      if (item.wardNorm.startsWith(t)) score += 3;
      score += 1;
    }
    if (allMatch) {
      results.push({
        ward: item.ward,
        province: item.province,
        provinceCode: item.provinceCode,
        full: item.full,
        score,
      });
    }
    if (results.length > 200) break; // hard cap để tránh build hết list khi query rất ngắn
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
