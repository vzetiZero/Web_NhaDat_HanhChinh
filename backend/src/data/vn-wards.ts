// Wrapper data hành chính VN 2025 (sau sáp nhập)
// PROVINCES, getWardsByProvince, searchWards

import { VN_WARDS_BY_PROVINCE } from './vn-wards-source';

function makeCode(name: string): string {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalize(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWardType(name: string): string {
  if (name.startsWith('Phường')) return 'phuong';
  if (name.startsWith('Xã')) return 'xa';
  if (name.startsWith('Thị trấn')) return 'thi-tran';
  if (name.startsWith('Đặc khu')) return 'dac-khu';
  return 'khac';
}

interface Province {
  code: string;
  name: string;
  full_name: string;
}

interface Ward {
  code: string;
  name: string;
  type: string;
}

interface SearchResult {
  ward: string;
  province: string;
  provinceCode: string;
  full: string;
  score: number;
}

interface FlatIndexItem {
  ward: string;
  province: string;
  provinceCode: string;
  full: string;
  norm: string;
  wardNorm: string;
}

const wardsMap = VN_WARDS_BY_PROVINCE as Record<string, string[]>;

export const PROVINCES: Province[] = Object.keys(wardsMap)
  .sort((a, b) => a.localeCompare(b, 'vi'))
  .map((name) => ({
    code: makeCode(name),
    name,
    full_name: name,
  }));

const PROVINCE_BY_CODE: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.code, p.name])
);

export function getProvinceName(code: string): string | null {
  return PROVINCE_BY_CODE[code] || null;
}

export function getWardsByProvince(provinceCode: string): Ward[] {
  const name = PROVINCE_BY_CODE[provinceCode];
  if (!name) return [];
  const wards = wardsMap[name] || [];
  return wards.map((w, idx) => ({
    code: `${provinceCode}__${idx}`,
    name: w,
    type: getWardType(w),
  }));
}

let flatIndex: FlatIndexItem[] | null = null;
function buildFlatIndex(): FlatIndexItem[] {
  if (flatIndex) return flatIndex;
  const arr: FlatIndexItem[] = [];
  for (const provinceName of Object.keys(wardsMap)) {
    const provinceCode = makeCode(provinceName);
    for (const w of wardsMap[provinceName] || []) {
      const full = `${w}, ${provinceName}`;
      arr.push({
        ward: w,
        province: provinceName,
        provinceCode,
        full,
        norm: normalize(full),
        wardNorm: normalize(w),
      });
    }
  }
  flatIndex = arr;
  return arr;
}

export function searchWards(query: string, limit = 10): SearchResult[] {
  const q = normalize(query);
  if (!q || q.length < 2) return [];
  const tokens = q.split(' ').filter((t) => t.length >= 1);
  if (!tokens.length) return [];

  const idx = buildFlatIndex();
  const results: SearchResult[] = [];
  for (const item of idx) {
    let score = 0;
    let allMatch = true;
    for (const t of tokens) {
      if (!item.norm.includes(t)) {
        allMatch = false;
        break;
      }
      if (item.wardNorm.includes(t)) score += 5;
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
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
