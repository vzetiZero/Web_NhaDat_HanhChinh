// Helper functions chung

/**
 * Tạo response JSON với chuẩn { success, ... }
 */
export function jsonOk(data = {}, status = 200) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function jsonErr(code, message, status = 400, extras = {}) {
  return new Response(
    JSON.stringify({ success: false, error: code, message, ...extras }),
    {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

/**
 * Parse JSON body, trả về null nếu lỗi
 */
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Sinh contract number kiểu: 001/HĐTCTSGLĐ/2026
 */
export function generateContractNumber(prefix, sequence, year = new Date().getFullYear()) {
  const seq = String(sequence).padStart(3, '0');
  return `${seq}/${prefix}/${year}`;
}

/**
 * Slug hóa (cho file name, etc.)
 */
export function slugify(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Format ngày yyyy-mm-dd hoặc Date -> dd/mm/yyyy
 */
export function formatDateVN(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    // có thể là dd/mm/yyyy rồi
    return String(input);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format số tiền VND có dấu phẩy nghìn
 */
export function formatVND(n) {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString('vi-VN');
}

/**
 * Sinh random ID hex
 */
export function randomHex(bytes = 16) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get pagination params từ URL (page, limit)
 */
export function getPagination(url, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  let limit = parseInt(url.searchParams.get('limit') || String(defaultLimit), 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, offset: (page - 1) * limit };
}
