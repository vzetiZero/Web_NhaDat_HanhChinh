// Render DOCX từ template - dùng docxtemplater + pizzip
// Template DOCX phải có placeholder kiểu {benA.chuHo.hoTen}, {thuaDat.dienTich}, etc.
// Vòng lặp: {#benA.thanhVien} ... {/benA.thanhVien}

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readR2Buffer, uploadR2 } from './r2.js';
import { numberToVietnamese, areaToVietnamese } from './number-to-vietnamese.js';
import { formatDateVN, formatVND, slugify } from './common.js';

function loaiGiayToLabel(code) {
  if (code === 'cmnd') return 'Chứng minh nhân dân';
  if (code === 'canCuocCongDan') return 'Căn cước công dân';
  return 'Căn cước';
}

function p(person = {}) {
  const loaiGiayTo = person.loaiGiayTo || 'canCuoc';
  const loaiGiayToText = loaiGiayToLabel(loaiGiayTo);
  const cccd = person.cccd || '';
  const noiCapCCCD = person.noiCapCCCD || '';
  const ngayCapCCCD = formatDateVN(person.ngayCapCCCD);
  return {
    hoTen: person.hoTen || '',
    danhXung: person.danhXung || '',
    ngaySinh: formatDateVN(person.ngaySinh),
    loaiGiayTo,
    loaiGiayToText,
    giayToLabel: loaiGiayToText,
    giayToLine: cccd ? `${loaiGiayToText} số: ${cccd} do ${noiCapCCCD} cấp ngày: ${ngayCapCCCD}` : '',
    cccd,
    ngayCapCCCD,
    noiCapCCCD,
    diaChi: person.diaChi || '',
    dienThoai: person.dienThoai || '',
    maSoThue: person.maSoThue || '',
  };
}

/**
 * Chuẩn hóa form data trước khi inject vào template
 */
export function prepareContractData(form, contractNumber) {
  const f = form || {};
  const giaTri = Number(f.thuaDat?.giaTri || 0);
  const benA = f.benA || {};
  const benB = f.benB || {};
  const t = f.thuaDat || {};
  const dk = f.dieuKhoan || {};

  const benA_chuHo = p(benA.chuHo);
  const benA_thanhVien = Array.isArray(benA.thanhVien)
    ? benA.thanhVien.filter((x) => x && (x.hoTen || x.cccd)).map(p)
    : [];
  const benB_chuHo = p(benB.chuHo);
  const benB_thanhVien = Array.isArray(benB.thanhVien)
    ? benB.thanhVien.filter((x) => x && (x.hoTen || x.cccd)).map(p)
    : [];

  // Tách địa chỉ thửa đất (cho tờ khai thuế cần xã/huyện/tỉnh riêng)
  const diaChiParts = (t.diaChi || '').split(',').map((s) => s.trim());

  return {
    contractNumber: contractNumber || '',

    ngayKy: formatDateVN(f.thongTinChung?.ngayKy),
    noiKy: f.thongTinChung?.noiKy || '',

    benA: {
      chuHo: benA_chuHo,
      thanhVien: benA_thanhVien,
      coThanhVien: benA_thanhVien.length > 0,
      tongSoNguoi: 1 + benA_thanhVien.length,
    },
    benB: {
      chuHo: benB_chuHo,
      thanhVien: benB_thanhVien,
      coThanhVien: benB_thanhVien.length > 0,
      tongSoNguoi: 1 + benB_thanhVien.length,
    },

    thuaDat: {
      // GCN
      soGCN: t.soGCN || '',
      soVaoSoCapGCN: t.soVaoSoCapGCN || '',
      coQuanCapGCN: t.coQuanCapGCN || '',
      ngayCapGCN: formatDateVN(t.ngayCapGCN),

      // Vị trí
      thuaDatSo: t.thuaDatSo || '',
      toBanDoSo: t.toBanDoSo || '',
      diaChi: t.diaChi || '',
      diaChiMoi: t.diaChiMoi || '',
      diaChiThon: diaChiParts[0] || '',
      diaChiXa: diaChiParts.find((s) => /^(xã|xã|phường|phường)/i.test(s)) || '',
      diaChiHuyen: diaChiParts.find((s) => /^(huyện|huyện|quận|quận)/i.test(s)) || '',
      diaChiTinh: diaChiParts.find((s) => /^(tỉnh|tỉnh|thành phố|tp)/i.test(s)) || '',

      // Diện tích
      dienTich: t.dienTich || '',
      dienTichBangChu: t.dienTichBangChu || areaToVietnamese(t.dienTich, 'mét vuông'),

      // Loại đất
      hinhThucSuDung: t.hinhThucSuDung || 'Sử dụng riêng',
      mucDichSuDung: t.mucDichSuDung || '',
      maLoaiDat: t.maLoaiDat || '',
      thoiHanSuDung: t.thoiHanSuDung || '',
      nguonGocSuDung: t.nguonGocSuDung || '',

      hanCheQuyen: t.hanCheQuyen || 'Không có',
      taiSanGanLien: t.taiSanGanLien || 'Không có',
      giayToTaiSan: t.giayToTaiSan || '',
      giaTri: formatVND(giaTri),
      giaTriBangChu: numberToVietnamese(giaTri),
      giaTriRaw: giaTri,
    },

    dieuKhoan: {
      benChiuThue:
        dk.benChiuThue === 'A'
          ? 'Bên A (Bên tặng)'
          : dk.benChiuThue === 'B'
          ? 'Bên B (Bên nhận)'
          : 'Hai bên chia đôi',
      benChiuThueCode: dk.benChiuThue || 'B',
      ghiChu: dk.ghiChu || '',
      ngayLapHDTK: formatDateVN(dk.ngayLapHDTK || f.thongTinChung?.ngayKy),
    },

    // Tính toán thuế (cho tờ khai phụ)
    thue: {
      giaTriChuyenNhuong: formatVND(giaTri),
      tncn: formatVND(Math.round(giaTri * 0.02)), // 2% thu nhập cá nhân
      tncnBangChu: numberToVietnamese(Math.round(giaTri * 0.02)),
      lepRBac: formatVND(Math.round(giaTri * 0.005)), // 0.5% lệ phí trước bạ
    },
  };
}

/**
 * Render DOCX từ template R2
 */
export async function renderDocx(env, templateKey, data) {
  const templateBuffer = await readR2Buffer(env, templateKey);
  if (!templateBuffer) {
    throw new Error(`Template DOCX không tìm thấy trên R2: ${templateKey}. Vui lòng upload template trong trang admin trước.`);
  }
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    nullGetter: () => '', // null → chuỗi rỗng thay vì "undefined"
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'uint8array' });
}

export async function renderAndUploadDocx(env, templateKey, data, contractNumber) {
  const buffer = await renderDocx(env, templateKey, data);
  const fileName = `ho-so-${slugify(contractNumber || 'no-number')}-${Date.now()}.docx`;
  const r2Key = `contracts/docx/${fileName}`;
  await uploadR2(
    env,
    r2Key,
    buffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    { contractNumber: contractNumber || '' }
  );
  return r2Key;
}
