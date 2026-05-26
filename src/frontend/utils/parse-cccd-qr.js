// Parser cho QR CCCD/Căn cước Việt Nam
// Định dạng: cccd|cmndCu|hoTen|ngaySinh(ddmmyyyy)|gioiTinh|noiThuongTru|ngayCap(ddmmyyyy)|...
// VD: 036098006519||Trần Minh Việt|20111998|Nam|Xóm ABC, Giao Minh, Ninh Bình|06102025||||
//
// LƯU Ý: KHÔNG dùng filter(Boolean) vì cmndCu có thể rỗng → tạo "||".
// Phải split bằng "|" và giữ nguyên vị trí.
//
// Export dưới dạng string để inline vào page script (project dùng Vanilla JS template literal).

export function parseCccdQrJs() {
  return `
/**
 * Parse raw QR string của CCCD.
 * @param {string} raw - chuỗi từ QR decoder
 * @returns {object|null} - object đã chuẩn hóa, null nếu format không hợp lệ
 */
window.parseCccdQr = function(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.includes('|')) return null;

  // GIỮ NGUYÊN vị trí: KHÔNG filter(Boolean)
  const parts = trimmed.split('|');
  if (parts.length < 7) return null;

  // CCCD: 9 hoặc 12 chữ số
  const cccd = (parts[0] || '').trim();
  if (!/^[0-9]{9,12}$/.test(cccd)) return null;

  const cmndCu = (parts[1] || '').trim();
  const hoTen = (parts[2] || '').trim();
  const ngaySinhRaw = (parts[3] || '').trim();
  const gioiTinh = (parts[4] || '').trim();
  const noiThuongTru = (parts[5] || '').trim();
  const ngayCapRaw = (parts[6] || '').trim();

  if (!hoTen) return null;

  return {
    cccd,
    cmndCu,
    hoTen,
    ngaySinh: ddmmyyyyToISO(ngaySinhRaw),    // yyyy-mm-dd (cho input type=date)
    ngaySinhRaw,                              // gốc ddmmyyyy
    gioiTinh: normalizeGioiTinh(gioiTinh),
    noiThuongTru,
    ngayCap: ddmmyyyyToISO(ngayCapRaw),
    ngayCapRaw,
    raw: trimmed,
  };
};

/**
 * Convert ddmmyyyy → yyyy-mm-dd
 * Trả về '' nếu format sai.
 */
function ddmmyyyyToISO(s) {
  if (!s || !/^[0-9]{8}$/.test(s)) return '';
  const dd = s.slice(0, 2);
  const mm = s.slice(2, 4);
  const yyyy = s.slice(4, 8);
  const d = parseInt(dd, 10), m = parseInt(mm, 10), y = parseInt(yyyy, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return '';
  return yyyy + '-' + mm + '-' + dd;
}

/**
 * Convert yyyy-mm-dd → dd/mm/yyyy (cho preview hiển thị).
 */
window.isoToDDMMYYYY = function(iso) {
  if (!iso || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return d + '/' + m + '/' + y;
};

function normalizeGioiTinh(s) {
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower === 'nam' || lower === 'male' || lower === 'm') return 'Nam';
  if (lower === 'nữ' || lower === 'nu' || lower === 'female' || lower === 'f') return 'Nữ';
  return s;
}

/**
 * Mask CCCD: 0360 **** 6519
 */
window.maskCccd = function(cccd) {
  if (!cccd) return '';
  const s = String(cccd);
  if (s.length < 8) return s;
  return s.slice(0, 4) + ' **** ' + s.slice(-4);
};
`;
}
