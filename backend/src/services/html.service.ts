// HTML renderer cho 4 văn bản (Hợp đồng + Tờ khai TNCN + Tờ khai LPTB + Đơn đăng ký)
// Dùng làm input cho PDF service, hoặc fallback HTML nếu PDF generation thất bại

function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] || c));
}

interface Person {
  hoTen?: string;
  danhXung?: string;
  ngaySinh?: string;
  cccd?: string;
  ngayCapCCCD?: string;
  noiCapCCCD?: string;
  diaChi?: string;
  dienThoai?: string;
  maSoThue?: string;
  loaiGiayToText?: string;
  giayToLabel?: string;
}

interface ContractData {
  contractNumber: string;
  ngayKy: string;
  noiKy: string;
  benA: { chuHo: Person; thanhVien: Person[] };
  benB: { chuHo: Person; thanhVien: Person[] };
  thuaDat: Record<string, string | number>;
  dieuKhoan: Record<string, string>;
  thue: Record<string, string>;
}

function personLine(p: Person): string {
  if (!p?.hoTen) return '';
  const dx = p.danhXung || '';
  const label = p.giayToLabel || p.loaiGiayToText || 'Căn cước';
  return `<div>${dx ? esc(dx) + ' ' : ''}<b>${esc(p.hoTen)}</b>${p.ngaySinh ? ' &nbsp;&nbsp; sinh ngày: ' + esc(p.ngaySinh) : ''}</div>
    <div>&nbsp;&nbsp;&nbsp;&nbsp;${esc(label)} số: ${esc(p.cccd)} do ${esc(p.noiCapCCCD)} cấp ngày: ${esc(p.ngayCapCCCD)}</div>
    <div>&nbsp;&nbsp;&nbsp;&nbsp;Địa chỉ: ${esc(p.diaChi)}</div>`;
}

function renderHopDong(d: ContractData): string {
  const t = d.thuaDat;
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
    ${d.benA.thanhVien.map(personLine).join('')}

    <h3 class="section-title">BÊN ĐƯỢC TẶNG CHO (sau đây gọi là bên B)</h3>
    ${personLine(d.benB.chuHo)}
    ${d.benB.thanhVien.map(personLine).join('')}

    <p>Hai bên đồng ý thực hiện việc tặng cho quyền sử dụng đất theo các thỏa thuận sau đây:</p>

    <h4 class="article">ĐIỀU 1. QUYỀN SỬ DỤNG ĐẤT TẶNG CHO</h4>
    <p>1. Theo Giấy chứng nhận QSDĐ số: <b>${esc(t.soGCN)}</b>; Số vào sổ cấp GCN: <b>${esc(t.soVaoSoCapGCN)}</b> do: <b>${esc(t.coQuanCapGCN)}</b> cấp ngày ${esc(t.ngayCapGCN)}.</p>
    <p>Thông tin thửa đất:</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;a) Thửa đất số: <b>${esc(t.thuaDatSo)}</b>, Tờ bản đồ số: <b>${esc(t.toBanDoSo)}</b></p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;b) Địa chỉ: ${esc(t.diaChi)}${t.diaChiMoi ? ' <i>(Nay là ' + esc(t.diaChiMoi) + ')</i>' : ''}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;c) Diện tích: <b>${esc(t.dienTich)} m²</b> (bằng chữ: ${esc(t.dienTichBangChu)})</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;d) Hình thức sử dụng: ${esc(t.hinhThucSuDung)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;đ) Mục đích sử dụng: ${esc(t.mucDichSuDung)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;e) Thời hạn sử dụng: ${esc(t.thoiHanSuDung)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;g) Nguồn gốc sử dụng: ${esc(t.nguonGocSuDung)}</p>

    <h4 class="article">ĐIỀU 2. VIỆC GIAO VÀ ĐĂNG KÝ QUYỀN SỬ DỤNG ĐẤT</h4>
    <p>1. Bên A có nghĩa vụ giao thửa đất nêu tại Điều 1 cùng giấy tờ về QSDĐ cho bên B vào thời điểm hợp đồng có hiệu lực.</p>
    <p>2. Bên B có nghĩa vụ đăng ký QSDĐ tại cơ quan có thẩm quyền.</p>

    <h4 class="article">ĐIỀU 3. TRÁCH NHIỆM NỘP THUẾ, LỆ PHÍ</h4>
    <p>Thuế, lệ phí liên quan đến việc tặng cho QSDĐ theo Hợp đồng này do <b>${esc(d.dieuKhoan.benChiuThue)}</b> chịu trách nhiệm nộp.</p>

    <h4 class="article">ĐIỀU 4. PHƯƠNG THỨC GIẢI QUYẾT TRANH CHẤP</h4>
    <p>Nếu phát sinh tranh chấp, hai bên thương lượng giải quyết; nếu không giải quyết được thì khởi kiện tòa án có thẩm quyền.</p>

    <h4 class="article">ĐIỀU 5. CAM ĐOAN CỦA CÁC BÊN</h4>
    <p>Hai bên cam đoan thông tin trong hợp đồng là đúng sự thật, hoàn toàn tự nguyện ký kết.</p>

    <h4 class="article">ĐIỀU 6. ĐIỀU KHOẢN CUỐI CÙNG</h4>
    <p>Hai bên đã tự đọc Hợp đồng, đã hiểu và đồng ý tất cả các điều khoản.</p>
    ${d.dieuKhoan.ghiChu ? `<p><i>Ghi chú: ${esc(d.dieuKhoan.ghiChu)}</i></p>` : ''}

    <div class="signature">
      <div class="col"><b>BÊN A</b><div class="italic">(Ký và ghi rõ họ tên)</div><div class="name">${esc(d.benA.chuHo.hoTen)}</div></div>
      <div class="col"><b>BÊN B</b><div class="italic">(Ký và ghi rõ họ tên)</div><div class="name">${esc(d.benB.chuHo.hoTen)}</div></div>
    </div>
  </div>`;
}

function renderToKhaiTNCN(d: ContractData): string {
  const t = d.thuaDat;
  return `
  <div class="document page-break">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
    </div>
    <h2 class="title">TỜ KHAI THUẾ THU NHẬP CÁ NHÂN</h2>
    <p>[01] Kỳ tính thuế: Lần phát sinh ngày ${esc(d.ngayKy)}</p>
    <h4 class="section-title">I. THÔNG TIN NGƯỜI TẶNG CHO</h4>
    <p>[04] Tên: <b>${esc(d.benA.chuHo.hoTen)}</b>; sinh ngày: ${esc(d.benA.chuHo.ngaySinh)}</p>
    <p>[06] CMND/CCCD: ${esc(d.benA.chuHo.cccd)}</p>
    <p>[06.1] Ngày cấp: ${esc(d.benA.chuHo.ngayCapCCCD)} - [06.2] Nơi cấp: ${esc(d.benA.chuHo.noiCapCCCD)}</p>
    <p>[08] Địa chỉ: ${esc(d.benA.chuHo.diaChi)}</p>
    <p>[30.1] Số GCN: ${esc(t.soGCN)} - [30.2] Do cơ quan: ${esc(t.coQuanCapGCN)} - [30.3] Cấp ngày: ${esc(t.ngayCapGCN)}</p>

    <h4 class="section-title">II. THÔNG TIN NGƯỜI NHẬN TẶNG CHO</h4>
    <p>[33] Họ tên: <b>${esc(d.benB.chuHo.hoTen)}</b></p>
    <p>[35] CMND/CCCD: ${esc(d.benB.chuHo.cccd)}</p>
    <p>[35.1] Ngày cấp: ${esc(d.benB.chuHo.ngayCapCCCD)} - [35.2] Nơi cấp: ${esc(d.benB.chuHo.noiCapCCCD)}</p>

    <h4 class="section-title">IV. ĐẶC ĐIỂM BẤT ĐỘNG SẢN</h4>
    <p>[41.1] Thửa đất số: <b>${esc(t.thuaDatSo)}</b>; Tờ bản đồ: <b>${esc(t.toBanDoSo)}</b></p>
    <p>[41.3] Địa chỉ: ${esc(t.diaChi)}</p>
    <p>[41.7] Loại đất: ${esc(t.maLoaiDat)}; Diện tích: <b>${esc(t.dienTich)} m²</b></p>

    <h4 class="section-title">V. THU NHẬP TỪ TẶNG CHO</h4>
    <p>[45] Giá trị: <b>${esc(t.giaTri)} đồng</b></p>
    <p>[50] Thuế TNCN phải nộp (10% sau khi trừ 10.000.000đ): <b>${esc(d.thue.tncn)} đồng</b></p>

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

function renderToKhaiLPTB(d: ContractData): string {
  const t = d.thuaDat;
  return `
  <div class="document page-break">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
    </div>
    <h2 class="title">TỜ KHAI LỆ PHÍ TRƯỚC BẠ</h2>
    <p>[01] Kỳ tính thuế: Theo từng lần phát sinh ngày ${esc(d.ngayKy)}</p>
    <p>[04] Người nộp thuế: <b>${esc(d.benB.chuHo.hoTen)}</b>; Sinh ngày: ${esc(d.benB.chuHo.ngaySinh)}</p>
    <p>[06] CMND/CCCD: ${esc(d.benB.chuHo.cccd)}</p>
    <p>[07] Địa chỉ: ${esc(d.benB.chuHo.diaChi)}</p>

    <h4 class="section-title">ĐẶC ĐIỂM NHÀ ĐẤT</h4>
    <p>1.1. Thửa đất số: <b>${esc(t.thuaDatSo)}</b>; Tờ bản đồ: <b>${esc(t.toBanDoSo)}</b></p>
    <p>1.2. Địa chỉ: ${esc(t.diaChi)}</p>
    <p>1.4. Mục đích sử dụng: ${esc(t.maLoaiDat)}</p>
    <p>1.5. Diện tích: <b>${esc(t.dienTich)} m²</b></p>
    <p>1.6. Nguồn gốc:</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;a) Tên cá nhân chuyển giao QSDĐ: <b>${esc(d.benA.chuHo.hoTen)}</b></p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;CMND/CCCD: ${esc(d.benA.chuHo.cccd)}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;Địa chỉ: ${esc(d.benA.chuHo.diaChi)}</p>
    <p>3. Giá trị thực tế nhận tặng cho: <b>${esc(t.giaTri)} đồng</b></p>

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

function renderDonDangKy(d: ContractData): string {
  const t = d.thuaDat;
  return `
  <div class="document page-break">
    <div class="header">
      <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="italic">Độc lập - Tự do - Hạnh phúc</div>
    </div>
    <h2 class="title">ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI,<br/>TÀI SẢN GẮN LIỀN VỚI ĐẤT</h2>
    <p class="center italic">Kính gửi: Chi nhánh Văn phòng Đăng ký đất đai khu vực</p>

    <p><b>1. Người sử dụng đất:</b></p>
    ${personLine(d.benB.chuHo)}

    <p><b>2. Nội dung biến động:</b></p>
    <p>Nhận tặng cho <b>${esc(t.dienTich)}m²</b> đất <i>${esc(t.mucDichSuDung)}</i> từ ông/bà <b>${esc(d.benA.chuHo.hoTen)}</b>.</p>

    <p><b>3. Giấy tờ liên quan:</b></p>
    <p>(1) Giấy chứng nhận đã cấp; (2) Số ${esc(t.soGCN)}; Số vào sổ: ${esc(t.soVaoSoCapGCN)}</p>

    <p style="margin-top:14px"><i>Cam đoan nội dung kê khai là đúng sự thật.</i></p>

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

export function generateContractHtml(data: unknown, contractNumber: string): string {
  const d = { ...(data as ContractData), contractNumber: (data as ContractData).contractNumber || contractNumber };
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Hồ sơ ${esc(d.contractNumber)}</title>
<style>
  @page { size: A4; margin: 2cm 2cm; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 13pt; line-height: 1.5; color: #000;
    max-width: 210mm; margin: 0 auto; padding: 10px;
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
