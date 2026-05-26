// Validation utilities - dùng cả server lẫn (mirror) client

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(\+84|0)[1-9][0-9]{8,9}$/.test(cleaned);
}

export function normalizePhone(phone) {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[\s.-]/g, '');
  if (cleaned.startsWith('+84')) return '0' + cleaned.slice(3);
  return cleaned;
}

export function validateCCCD(cccd) {
  if (!cccd || typeof cccd !== 'string') return false;
  const cleaned = cccd.replace(/\s/g, '');
  return /^[0-9]{9}$/.test(cleaned) || /^[0-9]{12}$/.test(cleaned);
}

export function validateBirthYear(year) {
  const n = Number(year);
  if (!Number.isInteger(n)) return false;
  const now = new Date().getFullYear();
  return n >= 1900 && n <= now - 14;
}

export function validateDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function validateDateVN(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return validateDate(dateStr);
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return false;
  const [, dd, mm, yyyy] = m;
  const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
  return !isNaN(d.getTime()) && d.getDate() === parseInt(dd, 10);
}

export function validateNumber(value, min, max) {
  const n = Number(value);
  if (isNaN(n)) return false;
  if (min !== undefined && n < min) return false;
  if (max !== undefined && n > max) return false;
  return true;
}

export function validateRequired(data, fields) {
  const errors = {};
  for (const f of fields) {
    const v = data?.[f];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      errors[f] = `Trường "${f}" là bắt buộc`;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function sanitizeString(input, maxLen = 500) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').slice(0, maxLen);
}

export function validateFingerprint(fp) {
  if (!fp || typeof fp !== 'string') return false;
  return /^[a-fA-F0-9]{16,128}$/.test(fp);
}

/**
 * Validate 1 cá nhân (chủ hộ hoặc thành viên)
 */
function validatePerson(p, label, errors, prefix) {
  if (!p) {
    errors[prefix] = `${label}: thiếu thông tin`;
    return;
  }
  if (!p.hoTen?.trim()) errors[`${prefix}.hoTen`] = `${label}: nhập họ tên`;
  if (p.ngaySinh) {
    if (!validateDateVN(p.ngaySinh)) {
      errors[`${prefix}.ngaySinh`] = `${label}: ngày sinh không hợp lệ (dd/mm/yyyy)`;
    }
  }
  if (!validateCCCD(p.cccd)) {
    errors[`${prefix}.cccd`] = `${label}: số giấy tờ phải 9 hoặc 12 chữ số`;
  }
  if (p.loaiGiayTo && !['canCuoc', 'canCuocCongDan', 'cmnd'].includes(p.loaiGiayTo)) {
    errors[`${prefix}.loaiGiayTo`] = `${label}: loại giấy tờ không hợp lệ`;
  }
  if (!validateDateVN(p.ngayCapCCCD)) {
    errors[`${prefix}.ngayCapCCCD`] = `${label}: ngày cấp giấy tờ không hợp lệ`;
  }
  if (!p.noiCapCCCD?.trim()) errors[`${prefix}.noiCapCCCD`] = `${label}: nhập nơi cấp giấy tờ`;
  if (!p.diaChi?.trim()) errors[`${prefix}.diaChi`] = `${label}: nhập địa chỉ`;
  if (p.dienThoai && !validatePhone(p.dienThoai)) {
    errors[`${prefix}.dienThoai`] = `${label}: SĐT không đúng định dạng VN`;
  }
}

/**
 * Validate form hợp đồng tặng QSDĐ (cấu trúc multi-member)
 *
 * Cấu trúc:
 * {
 *   thongTinChung: { ngayKy, noiKy, soHopDong },
 *   benA: { chuHo: {...}, thanhVien: [{...}, ...] },
 *   benB: { chuHo: {...}, thanhVien: [{...}, ...] },
 *   thuaDat: { soGCN, soVaoSoCapGCN, coQuanCapGCN, ngayCapGCN,
 *              thuaDatSo, toBanDoSo, diaChi, diaChiMoi,
 *              dienTich, dienTichBangChu,
 *              hinhThucSuDung, mucDichSuDung, maLoaiDat,
 *              thoiHanSuDung, nguonGocSuDung,
 *              hanCheQuyen, taiSanGanLien, giayToTaiSan, giaTri },
 *   dieuKhoan: { benChiuThue, ghiChu, ngayLapHDTK }
 * }
 */
export function validateContractForm(form) {
  const errors = {};
  const f = form || {};

  // Thông tin chung
  if (!f.thongTinChung?.ngayKy && !f.thongTinChung?.ngayKyISO) {
    errors['thongTinChung.ngayKy'] = 'Chọn ngày ký';
  }
  if (!f.thongTinChung?.noiKy?.trim()) {
    errors['thongTinChung.noiKy'] = 'Chọn nơi ký';
  }

  // Bên A & B: ít nhất chủ hộ phải đầy đủ; thành viên tùy chọn nhưng nếu có thì phải đủ
  for (const side of ['benA', 'benB']) {
    const label = side === 'benA' ? 'Bên A' : 'Bên B';
    const b = f[side] || {};
    if (!b.chuHo) {
      errors[`${side}.chuHo`] = `${label}: thiếu thông tin chủ hộ`;
    } else {
      validatePerson(b.chuHo, `${label} - Chủ hộ`, errors, `${side}.chuHo`);
    }
    if (Array.isArray(b.thanhVien)) {
      b.thanhVien.forEach((tv, idx) => {
        // Thành viên có thông tin một phần coi như cần hoàn thiện
        const hasAny = tv && (tv.hoTen || tv.cccd);
        if (hasAny) {
          validatePerson(tv, `${label} - Thành viên ${idx + 1}`, errors, `${side}.thanhVien[${idx}]`);
        }
      });
    }
  }

  // Thửa đất
  const t = f.thuaDat || {};
  if (!t.thuaDatSo?.toString().trim()) errors['thuaDat.thuaDatSo'] = 'Nhập thửa đất số';
  if (!t.toBanDoSo?.toString().trim()) errors['thuaDat.toBanDoSo'] = 'Nhập tờ bản đồ số';
  if (!t.diaChi?.trim()) errors['thuaDat.diaChi'] = 'Nhập địa chỉ thửa đất';
  if (!validateNumber(t.dienTich, 0)) errors['thuaDat.dienTich'] = 'Diện tích phải là số dương';
  if (!t.mucDichSuDung?.trim()) errors['thuaDat.mucDichSuDung'] = 'Nhập mục đích sử dụng';
  if (!t.thoiHanSuDung?.trim()) errors['thuaDat.thoiHanSuDung'] = 'Nhập thời hạn sử dụng';
  if (!t.nguonGocSuDung?.trim()) errors['thuaDat.nguonGocSuDung'] = 'Nhập nguồn gốc sử dụng';
  // giaTri có thể trống khi tặng cho (không bắt buộc) - chỉ cảnh báo nếu cần xuất tờ khai thuế
  if (t.giaTri && !validateNumber(t.giaTri, 0)) errors['thuaDat.giaTri'] = 'Giá trị phải là số';

  // Điều khoản
  const dk = f.dieuKhoan || {};
  if (!['A', 'B', 'chiaDoi'].includes(dk.benChiuThue)) {
    errors['dieuKhoan.benChiuThue'] = 'Chọn bên chịu thuế';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
