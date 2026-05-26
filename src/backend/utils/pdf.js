// Render PDF từ HTML preview
// HTML chứa 4 văn bản (Hợp đồng + Tờ khai TNCN + Tờ khai LPTB + Đơn đăng ký biến động)

import { uploadR2 } from './r2.js';
import { slugify } from './common.js';

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function loaiGiayToLabel(code) {
  if (code === 'cmnd') return 'Chứng minh nhân dân';
  if (code === 'canCuocCongDan') return 'Căn cước công dân';
  return 'Căn cước';
}

function personLine(p, danhXung = '') {
  if (!p?.hoTen) return '';
  const dx = danhXung || (p.danhXung || '');
  const giayToLabel = p.giayToLabel || p.loaiGiayToText || loaiGiayToLabel(p.loaiGiayTo);
  return `<div>${dx ? esc(dx) + ' ' : ''}<b>${esc(p.hoTen)}</b>${p.ngaySinh ? ' &nbsp;&nbsp; sinh ngày: ' + esc(p.ngaySinh) : ''}</div>
    <div>&nbsp;&nbsp;&nbsp;&nbsp;${esc(giayToLabel)} số: ${esc(p.cccd)} do ${esc(p.noiCapCCCD)} cấp ngày: ${esc(p.ngayCapCCCD)}</div>
    <div>&nbsp;&nbsp;&nbsp;&nbsp;Địa chỉ: ${esc(p.diaChi)}</div>`;
}

function renderHopDong(d) {
  return `
  <div class="document">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
      <div>-----o0o-----</div>
    </div>

    <h2 class="title">HỢP ĐỒNG TẶNG CHO QUYỀN SỬ DỤNG ĐẤT</h2>
    ${d.contractNumber ? `<div class="center italic">Số: ${esc(d.contractNumber)}</div>` : ''}

    <h3 class="section-title">BÊN TẶNG CHO (sau đây gọi là bên A)</h3>
    ${personLine(d.benA.chuHo)}

    ${d.benA.thanhVien.length ? '<div style="margin-top:6px"><i>Cùng các thành viên trong hộ:</i></div>' : ''}
    ${d.benA.thanhVien.map((tv) => personLine(tv)).join('')}

    <h3 class="section-title">BÊN ĐƯỢC TẶNG CHO (sau đây gọi là bên B)</h3>
    ${personLine(d.benB.chuHo)}
    ${d.benB.thanhVien.map((tv) => personLine(tv)).join('')}

    <p>Hai bên đồng ý thực hiện việc tặng cho quyền sử dụng đất theo các thỏa thuận sau đây:</p>

    <h4 class="article">ĐIỀU 1. QUYỀN SỬ DỤNG ĐẤT TẶNG CHO</h4>
    <p>Quyền sử dụng đất của bên A đối với thửa đất như sau:</p>
    <p>1. Theo Giấy chứng nhận QSDĐ số: <b>${esc(d.thuaDat.soGCN)}</b>; Số vào sổ cấp GCN: <b>${esc(d.thuaDat.soVaoSoCapGCN)}</b> do: <b>${esc(d.thuaDat.coQuanCapGCN)}</b> cấp ngày ${esc(d.thuaDat.ngayCapGCN)}.</p>
    <p>Thông tin thửa đất:</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;a) Thửa đất số: <b>${esc(d.thuaDat.thuaDatSo)}</b>, Tờ bản đồ số: <b>${esc(d.thuaDat.toBanDoSo)}</b></p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;b) Địa chỉ: ${esc(d.thuaDat.diaChi)}${d.thuaDat.diaChiMoi ? ' <i>(Nay là ' + esc(d.thuaDat.diaChiMoi) + ')</i>' : ''}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;c) Diện tích: <b>${esc(d.thuaDat.dienTich)}m²</b> (bằng chữ: ${esc(d.thuaDat.dienTichBangChu)})</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;d) Hình thức sử dụng: ${esc(d.thuaDat.hinhThucSuDung)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;đ) Mục đích sử dụng: ${esc(d.thuaDat.mucDichSuDung)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;e) Thời hạn sử dụng: ${esc(d.thuaDat.thoiHanSuDung)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;g) Nguồn gốc sử dụng: ${esc(d.thuaDat.nguonGocSuDung)}</p>
    <p>Khi đo đạc thực tế diện tích đất tăng hay giảm; thửa đất; tờ bản đồ có thay đổi, hai bên vẫn đồng ý tặng cho theo diện tích, thửa đất, tờ bản đồ thực tế.</p>

    <h4 class="article">ĐIỀU 2. VIỆC GIAO VÀ ĐĂNG KÝ QUYỀN SỬ DỤNG ĐẤT</h4>
    <p>1. Bên A có nghĩa vụ giao thửa đất nêu tại Điều 1 cùng giấy tờ về quyền sử dụng đất cho bên B vào thời điểm hợp đồng có hiệu lực.</p>
    <p>2. Bên B có nghĩa vụ đăng ký quyền sử dụng đất tại cơ quan có thẩm quyền theo quy định của pháp luật.</p>

    <h4 class="article">ĐIỀU 3. TRÁCH NHIỆM NỘP THUẾ, LỆ PHÍ</h4>
    <p>Thuế, lệ phí liên quan đến việc tặng cho quyền sử dụng đất theo Hợp đồng này do <b>${esc(d.dieuKhoan.benChiuThue)}</b> chịu trách nhiệm nộp.</p>

    <h4 class="article">ĐIỀU 4. PHƯƠNG THỨC GIẢI QUYẾT TRANH CHẤP</h4>
    <p>Trong quá trình thực hiện Hợp đồng này, nếu phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết trên nguyên tắc tôn trọng quyền lợi của nhau; trong trường hợp không giải quyết được thì một trong hai bên có quyền khởi kiện để yêu cầu tòa án có thẩm quyền giải quyết theo quy định pháp luật.</p>

    <h4 class="article">ĐIỀU 5. CAM ĐOAN CỦA CÁC BÊN</h4>
    <p><b>1. Bên A cam đoan:</b></p>
    <p>1.1. Những thông tin về nhân thân, về thửa đất đã ghi trong Hợp đồng này là đúng sự thật;</p>
    <p>1.2. Thửa đất thuộc trường hợp được tặng cho quyền sử dụng đất theo quy định pháp luật;</p>
    <p>1.3. Tại thời điểm giao kết: a) Thửa đất không có tranh chấp; b) Quyền sử dụng đất không bị kê biên để bảo đảm thi hành án;</p>
    <p>1.4. Việc giao kết hợp đồng hoàn toàn tự nguyện, không bị lừa dối, không bị ép buộc;</p>
    <p><b>2. Bên B cam đoan:</b></p>
    <p>2.1. Những thông tin về nhân thân đã ghi trong Hợp đồng này là đúng sự thật;</p>
    <p>2.2. Đã xem xét kỹ, biết rõ về thửa đất nêu tại Điều 1 và các giấy tờ về quyền sử dụng đất;</p>
    <p>2.3. Việc giao kết Hợp đồng hoàn toàn tự nguyện, không bị lừa dối, không bị ép buộc.</p>

    <h4 class="article">ĐIỀU 6. ĐIỀU KHOẢN CUỐI CÙNG</h4>
    <p>Hai bên đã tự đọc Hợp đồng, đã hiểu và đồng ý tất cả các điều khoản ghi trong Hợp đồng.</p>
    ${d.dieuKhoan.ghiChu ? `<p><i>Ghi chú: ${esc(d.dieuKhoan.ghiChu)}</i></p>` : ''}

    <div class="signature">
      <div class="col">
        <b>BÊN A</b>
        <div class="italic">(Ký và ghi rõ họ tên)</div>
        <div class="name">${esc(d.benA.chuHo.hoTen)}</div>
      </div>
      <div class="col">
        <b>BÊN B</b>
        <div class="italic">(Ký và ghi rõ họ tên)</div>
        <div class="name">${esc(d.benB.chuHo.hoTen)}</div>
      </div>
    </div>
  </div>`;
}

function renderToKhaiTNCN(d) {
  return `
  <div class="document page-break">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
    </div>

    <h2 class="title">TỜ KHAI THUẾ THU NHẬP CÁ NHÂN</h2>
    <div class="center italic">(Áp dụng đối với cá nhân có thu nhập từ chuyển nhượng bất động sản;<br/>thu nhập từ nhận thừa kế và nhận quà tặng là bất động sản)</div>

    <p>[01] Kỳ tính thuế: Lần phát sinh ngày ${esc(d.ngayKy)}</p>
    <p>[02] Lần đầu: ☑ &nbsp;&nbsp; [03] Bổ sung lần thứ: …</p>

    <h4 class="section-title">I. THÔNG TIN NGƯỜI CHUYỂN NHƯỢNG / TẶNG CHO</h4>
    <p>[04] Tên người nộp thuế: <b>${esc(d.benA.chuHo.hoTen)}</b> &nbsp;&nbsp; sinh ngày: ${esc(d.benA.chuHo.ngaySinh)}</p>
    <p>[05] Mã số thuế (nếu có): ${esc(d.benA.chuHo.maSoThue)}</p>
    <p>[06] Số CMND/CCCD: ${esc(d.benA.chuHo.cccd)}</p>
    <p>[06.1] Ngày cấp: ${esc(d.benA.chuHo.ngayCapCCCD)} &nbsp;&nbsp; [06.2] Nơi cấp: ${esc(d.benA.chuHo.noiCapCCCD)}</p>
    <p>[08] Địa chỉ chỗ ở hiện tại: ${esc(d.benA.chuHo.diaChi)}</p>
    <p>[10] Tỉnh/Thành phố: ${esc(d.thuaDat.diaChiTinh || d.noiKy)}</p>
    <p>[11] Điện thoại: ${esc(d.benA.chuHo.dienThoai)}</p>

    <p>[30] Giấy tờ về quyền sử dụng đất:</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;[30.1] Số: ${esc(d.thuaDat.soGCN)} &nbsp;&nbsp; [30.2] Do cơ quan: ${esc(d.thuaDat.coQuanCapGCN)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;[30.3] Cấp ngày: ${esc(d.thuaDat.ngayCapGCN)}</p>

    <h4 class="section-title">II. THÔNG TIN NGƯỜI NHẬN CHUYỂN NHƯỢNG / TẶNG CHO</h4>
    <p>[33] Họ và tên đại diện: <b>${esc(d.benB.chuHo.hoTen)}</b></p>
    <p>[34] Mã số thuế: ${esc(d.benB.chuHo.maSoThue)}</p>
    <p>[35] Số CMND/CCCD: ${esc(d.benB.chuHo.cccd)}</p>
    <p>[35.1] Ngày cấp: ${esc(d.benB.chuHo.ngayCapCCCD)} &nbsp;&nbsp; [35.2] Nơi cấp: ${esc(d.benB.chuHo.noiCapCCCD)}</p>

    <h4 class="section-title">III. LOẠI BẤT ĐỘNG SẢN</h4>
    <p>[37] ☑ Quyền sử dụng đất và tài sản gắn liền trên đất</p>

    <h4 class="section-title">IV. ĐẶC ĐIỂM BẤT ĐỘNG SẢN</h4>
    <p>[41.1] Thửa đất số: <b>${esc(d.thuaDat.thuaDatSo)}</b> &nbsp; Tờ bản đồ số: <b>${esc(d.thuaDat.toBanDoSo)}</b></p>
    <p>[41.3] Địa chỉ: ${esc(d.thuaDat.diaChi)}</p>
    <p>[41.6] Tỉnh/Thành phố: ${esc(d.thuaDat.diaChiTinh)}</p>
    <p>[41.7] Loại đất: <b>${esc(d.thuaDat.maLoaiDat)}</b> &nbsp;&nbsp; Diện tích: <b>${esc(d.thuaDat.dienTich)} m²</b></p>

    <h4 class="section-title">V. THU NHẬP TỪ TẶNG CHO BẤT ĐỘNG SẢN</h4>
    <p>[44.2] ☑ Thu nhập từ nhận thừa kế, quà tặng</p>
    <p>[45] Giá trị nhận tặng cho: <b>${esc(d.thuaDat.giaTri)} đồng</b></p>
    <p>[50] Thuế TNCN phải nộp (10% sau khi trừ 10.000.000đ): <b>${esc(d.thue.tncn)} đồng</b></p>

    <p style="margin-top:20px"><i>Tôi cam đoan những nội dung kê khai là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã khai./.</i></p>

    <div class="signature">
      <div class="col">&nbsp;</div>
      <div class="col">
        <div class="italic">${esc(d.noiKy)}, ngày ${esc(d.dieuKhoan.ngayLapHDTK)}</div>
        <b>NGƯỜI NỘP THUẾ</b>
        <div class="italic">(Ký, ghi rõ họ tên)</div>
        <div class="name">${esc(d.benA.chuHo.hoTen)}</div>
      </div>
    </div>
  </div>`;
}

function renderToKhaiLPTB(d) {
  return `
  <div class="document page-break">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
    </div>

    <h2 class="title">TỜ KHAI LỆ PHÍ TRƯỚC BẠ</h2>
    <div class="center italic">(Áp dụng đối với nhà, đất)</div>

    <p>[01] Kỳ tính thuế: Theo từng lần phát sinh ngày ${esc(d.ngayKy)}</p>
    <p>[02] Lần đầu: ☑</p>

    <p>[04] Người nộp thuế: <b>${esc(d.benB.chuHo.hoTen)}</b> &nbsp;&nbsp; Sinh ngày: ${esc(d.benB.chuHo.ngaySinh)}</p>
    <p>[05] Mã số thuế: ${esc(d.benB.chuHo.maSoThue)}</p>
    <p>[06] Số CMND/CCCD: ${esc(d.benB.chuHo.cccd)}</p>
    <p>[07] Địa chỉ: ${esc(d.benB.chuHo.diaChi)}</p>
    <p>[09] Tỉnh/Thành phố: ${esc(d.thuaDat.diaChiTinh)}</p>

    <h4 class="section-title">ĐẶC ĐIỂM NHÀ ĐẤT</h4>
    <p><b>1. Đất:</b></p>
    <p>1.1. Thửa đất số: <b>${esc(d.thuaDat.thuaDatSo)}</b>; Tờ bản đồ số: <b>${esc(d.thuaDat.toBanDoSo)}</b></p>
    <p>1.2. Địa chỉ thửa đất: ${esc(d.thuaDat.diaChi)}</p>
    <p>1.4. Mục đích sử dụng đất: ${esc(d.thuaDat.maLoaiDat)}</p>
    <p>1.5. Diện tích (m²): <b>${esc(d.thuaDat.dienTich)} m²</b></p>
    <p>1.6. Nguồn gốc nhà đất:</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;a) Tên cá nhân chuyển giao QSDĐ: <b>${esc(d.benA.chuHo.hoTen)}</b></p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;Số CMND/CCCD: ${esc(d.benA.chuHo.cccd)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;Địa chỉ người giao QSDĐ: ${esc(d.benA.chuHo.diaChi)}</p>

    <p>3. Giá trị nhà, đất thực tế nhận tặng cho: <b>${esc(d.thuaDat.giaTri)} đồng</b></p>

    <p style="margin-top:20px"><i>Tôi cam đoan số liệu khai trên là đúng và chịu trách nhiệm trước pháp luật về số liệu đã khai./.</i></p>

    <div class="signature">
      <div class="col">&nbsp;</div>
      <div class="col">
        <div class="italic">${esc(d.noiKy)}, ngày ${esc(d.dieuKhoan.ngayLapHDTK)}</div>
        <b>NGƯỜI NỘP THUẾ</b>
        <div class="italic">(Ký, ghi rõ họ tên)</div>
        <div class="name">${esc(d.benB.chuHo.hoTen)}</div>
      </div>
    </div>
  </div>`;
}

function renderDonDangKy(d) {
  return `
  <div class="document page-break">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
      <div>---------------</div>
    </div>

    <h2 class="title">ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI,<br/>TÀI SẢN GẮN LIỀN VỚI ĐẤT</h2>
    <p class="center"><i>Kính gửi: Chi nhánh Văn phòng Đăng ký đất đai khu vực</i></p>

    <p><b>1. Người sử dụng đất, chủ sở hữu tài sản gắn liền với đất:</b></p>
    ${personLine(d.benB.chuHo)}
    <p>Điện thoại liên hệ: ${esc(d.benB.chuHo.dienThoai)}</p>

    <p><b>2. Nội dung biến động:</b></p>
    <p>Nhận tặng cho <b>${esc(d.thuaDat.dienTich)}m²</b> đất <i>${esc(d.thuaDat.mucDichSuDung)}</i> từ ông/bà <b>${esc(d.benA.chuHo.hoTen)}</b>.</p>

    <p><b>3. Giấy tờ liên quan đến nội dung biến động nộp kèm theo đơn này gồm có:</b></p>
    <p>(1) Giấy chứng nhận đã cấp;</p>
    <p>(2) Số ${esc(d.thuaDat.soGCN)}; Số vào sổ cấp GCN: ${esc(d.thuaDat.soVaoSoCapGCN)}</p>

    <p style="margin-top:14px"><i>Cam đoan nội dung kê khai trên đơn là đúng sự thật và chịu trách nhiệm trước pháp luật.</i></p>

    <div class="signature">
      <div class="col">&nbsp;</div>
      <div class="col">
        <div class="italic">${esc(d.noiKy)}, ngày ${esc(d.dieuKhoan.ngayLapHDTK)}</div>
        <b>NGƯỜI VIẾT ĐƠN</b>
        <div class="italic">(Ký, ghi rõ họ tên)</div>
        <div class="name">${esc(d.benB.chuHo.hoTen)}</div>
      </div>
    </div>
  </div>`;
}

/**
 * Generate HTML preview của toàn bộ hồ sơ (4 văn bản)
 */
export function generateContractHtml(data, contractNumber, siteName = 'Chứng Từ Nhà Đất') {
  const d = { ...data, contractNumber: data.contractNumber || contractNumber };
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Hồ sơ ${esc(d.contractNumber)}</title>
<style>
  @page { size: A4; margin: 2cm 2cm; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    color: #000;
    max-width: 210mm;
    margin: 0 auto;
    padding: 10px;
  }
  .document { margin-bottom: 40px; }
  .page-break { page-break-before: always; }
  .header { text-align: center; margin-bottom: 16px; }
  .header .bold { font-weight: bold; }
  .header .italic { font-style: italic; }
  .title { text-align: center; font-size: 15pt; font-weight: bold; margin: 18px 0 8px; text-transform: uppercase; }
  .section-title { font-weight: bold; margin: 14px 0 6px; }
  .article { font-weight: bold; text-align: center; margin: 16px 0 6px; text-transform: uppercase; }
  .center { text-align: center; }
  .italic { font-style: italic; }
  .bold { font-weight: bold; }
  p { margin: 4px 0; text-align: justify; }
  .signature { display: flex; justify-content: space-around; margin-top: 40px; }
  .signature .col { text-align: center; width: 45%; }
  .signature .col .name { margin-top: 60px; font-weight: bold; }
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${renderHopDong(d)}
${renderToKhaiTNCN(d)}
${renderToKhaiLPTB(d)}
${renderDonDangKy(d)}
</body>
</html>`;
}

/**
 * Render PDF từ HTML bằng Browser Rendering API (cần Workers Paid)
 */
export async function renderPdfWithBrowser(env, html, contractNumber) {
  if (!env.BROWSER) {
    return { ok: false, reason: 'browser_not_configured' };
  }
  try {
    const puppeteer = await import('@cloudflare/puppeteer');
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });
    await browser.close();

    const fileName = `ho-so-${slugify(contractNumber || 'no-number')}-${Date.now()}.pdf`;
    const r2Key = `contracts/pdf/${fileName}`;
    await uploadR2(env, r2Key, pdfBuffer, 'application/pdf', { contractNumber: contractNumber || '' });
    return { ok: true, r2Key };
  } catch (e) {
    console.error('[renderPdfWithBrowser]', e?.message);
    return { ok: false, reason: e?.message };
  }
}
