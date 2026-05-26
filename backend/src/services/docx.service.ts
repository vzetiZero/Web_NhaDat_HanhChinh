// DOCX renderer - dùng docxtemplater + pizzip
// Template DOCX cần có placeholder dạng {benA.chuHo.hoTen}, {#benA.thanhVien}...{/}

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { templatesService } from '@/modules/templates/templates.service';
import { numberToVietnamese, areaToVietnamese } from '@/utils/number-to-vietnamese';
import { formatDateVN, formatVND } from '@/utils/format';
import { HttpError } from '@/lib/http-error';

interface PersonInput {
  hoTen?: string;
  danhXung?: string;
  ngaySinh?: string;
  cccd?: string;
  ngayCapCCCD?: string;
  noiCapCCCD?: string;
  diaChi?: string;
  dienThoai?: string;
  maSoThue?: string;
  loaiGiayTo?: 'canCuoc' | 'canCuocCongDan' | 'cmnd';
}

function loaiGiayToLabel(code?: string): string {
  if (code === 'cmnd') return 'Chứng minh nhân dân';
  if (code === 'canCuocCongDan') return 'Căn cước công dân';
  return 'Căn cước';
}

function preparePerson(person: PersonInput = {}) {
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

export interface ContractFormData {
  thongTinChung?: { ngayKy?: string; noiKy?: string; soHopDong?: string };
  benA?: { chuHo?: PersonInput; thanhVien?: PersonInput[] };
  benB?: { chuHo?: PersonInput; thanhVien?: PersonInput[] };
  thuaDat?: Record<string, unknown>;
  dieuKhoan?: { benChiuThue?: string; ghiChu?: string; ngayLapHDTK?: string };
}

/**
 * Chuẩn hóa form data trước khi inject vào template
 */
export function prepareContractData(form: ContractFormData, contractNumber: string) {
  const f = form || {};
  const benA = f.benA || {};
  const benB = f.benB || {};
  const t = (f.thuaDat || {}) as Record<string, string | number | undefined>;
  const dk = f.dieuKhoan || {};
  const giaTri = Number(t.giaTri || 0);

  const benA_chuHo = preparePerson(benA.chuHo);
  const benA_thanhVien = Array.isArray(benA.thanhVien)
    ? benA.thanhVien.filter((x) => x && (x.hoTen || x.cccd)).map(preparePerson)
    : [];
  const benB_chuHo = preparePerson(benB.chuHo);
  const benB_thanhVien = Array.isArray(benB.thanhVien)
    ? benB.thanhVien.filter((x) => x && (x.hoTen || x.cccd)).map(preparePerson)
    : [];

  const diaChiParts = String(t.diaChi || '').split(',').map((s) => s.trim());

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
      soGCN: t.soGCN || '',
      soVaoSoCapGCN: t.soVaoSoCapGCN || '',
      coQuanCapGCN: t.coQuanCapGCN || '',
      ngayCapGCN: formatDateVN(String(t.ngayCapGCN || '')),
      thuaDatSo: t.thuaDatSo || '',
      toBanDoSo: t.toBanDoSo || '',
      diaChi: t.diaChi || '',
      diaChiMoi: t.diaChiMoi || '',
      diaChiThon: diaChiParts[0] || '',
      diaChiXa: diaChiParts.find((s) => /^(xã|phường)/i.test(s)) || '',
      diaChiHuyen: diaChiParts.find((s) => /^(huyện|quận)/i.test(s)) || '',
      diaChiTinh: diaChiParts.find((s) => /^(tỉnh|thành phố|tp)/i.test(s)) || '',
      dienTich: t.dienTich || '',
      dienTichBangChu: t.dienTichBangChu || areaToVietnamese(t.dienTich as number, 'mét vuông'),
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

    thue: {
      giaTriChuyenNhuong: formatVND(giaTri),
      tncn: formatVND(Math.round(giaTri * 0.02)),
      tncnBangChu: numberToVietnamese(Math.round(giaTri * 0.02)),
      lepRBac: formatVND(Math.round(giaTri * 0.005)),
    },
  };
}

class DocxService {
  /**
   * Render template với data, trả về buffer
   */
  async render(templateId: number, data: unknown): Promise<Buffer> {
    const buf = await templatesService.loadTemplateBuffer(templateId);
    let zip: PizZip;
    try {
      zip = new PizZip(buf);
    } catch (e) {
      throw HttpError.unprocessable('Template DOCX hỏng hoặc không hợp lệ');
    }
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
      nullGetter: () => '',
    });
    try {
      doc.render(data);
    } catch (e) {
      const err = e as Error;
      throw HttpError.unprocessable(`Lỗi render DOCX: ${err.message}`);
    }
    return doc.getZip().generate({ type: 'nodebuffer' });
  }
}

export const docxService = new DocxService();
