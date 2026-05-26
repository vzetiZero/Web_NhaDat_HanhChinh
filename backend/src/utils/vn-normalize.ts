// Chuẩn hóa text tiếng Việt cho fuzzy search
// - Bỏ dấu (NFD + filter combining marks)
// - đ/Đ → d
// - Lowercase
// - Mở rộng viết tắt (VPĐKĐĐ → văn phòng đăng ký đất đai)
// - Chuẩn hóa khoảng trắng

// Mapping viết tắt (lowercase, sorted by length desc để match longer first)
const ABBREVIATIONS: Record<string, string> = {
  vpdkdd: 'van phong dang ky dat dai',
  vpdk: 'van phong dang ky',
  cn: 'chi nhanh',
  ubnd: 'uy ban nhan dan',
  stnmt: 'so tai nguyen moi truong',
  snnmt: 'so nong nghiep moi truong',
  ctncb: 'co quan thue nha dat',
  h: 'huyen',
  tp: 'thanh pho',
  tx: 'thi xa',
  q: 'quan',
  p: 'phuong',
  x: 'xa',
};

// Sort theo độ dài giảm dần (longer abbreviations match first)
const ABBR_KEYS = Object.keys(ABBREVIATIONS).sort((a, b) => b.length - a.length);

export function stripDiacritics(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalize text: bỏ dấu, lowercase, trim, dedupe spaces
 */
export function normalizeText(s: string): string {
  if (!s) return '';
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expand viết tắt trong text đã normalize.
 * Vd: "cn vpdkdd cao lanh" → "chi nhanh van phong dang ky dat dai cao lanh"
 * Mở rộng cả 2 chiều: original + expanded để fuzzy match được cả 2.
 */
export function expandAbbreviations(normalized: string): string {
  if (!normalized) return '';
  // Tokenize, expand từng token nếu match
  const tokens = normalized.split(' ');
  const expanded: string[] = [];
  for (const t of tokens) {
    if (ABBREVIATIONS[t]) {
      expanded.push(ABBREVIATIONS[t]);
    } else {
      expanded.push(t);
    }
  }
  return expanded.join(' ');
}

/**
 * Full normalize: dùng cho cả input của user lẫn dữ liệu trong DB
 * Trả về dạng đã bỏ dấu, lowercase, expanded abbreviations.
 */
export function fullNormalize(s: string): string {
  return expandAbbreviations(normalizeText(s));
}

/**
 * Tokenize - cho việc match từng token độc lập
 */
export function tokenize(s: string): string[] {
  return fullNormalize(s).split(' ').filter((t) => t.length >= 1);
}

/**
 * Tính score giữa query và target (cả 2 đã normalize)
 * - Mỗi token query xuất hiện trong target: +1
 * - Token match exact word (boundary): +2
 * - Tất cả tokens match: +3 bonus
 * Returns 0 nếu không phải tất cả tokens đều match.
 */
export function tokenMatchScore(queryNormalized: string, targetNormalized: string): number {
  const qTokens = queryNormalized.split(' ').filter(Boolean);
  if (!qTokens.length) return 0;
  let score = 0;
  let allMatch = true;
  for (const t of qTokens) {
    if (targetNormalized.includes(t)) {
      score += 1;
      // Bonus nếu match word boundary
      if (new RegExp('\\b' + t + '\\b').test(targetNormalized)) {
        score += 2;
      }
    } else {
      allMatch = false;
    }
  }
  return allMatch ? score + 3 : 0;
}
