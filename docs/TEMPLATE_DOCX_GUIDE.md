# Hướng dẫn soạn DOCX template (gồm 4 văn bản)

File template `.docx` được render bằng [docxtemplater](https://docxtemplater.com/). Bạn soạn 1 file Word chứa cả 4 văn bản (Hợp đồng + Tờ khai TNCN + Tờ khai LPTB + Đơn đăng ký), dùng các placeholder dưới đây — khi user submit form, hệ thống sẽ thay tất cả `{...}` bằng data thực và xuất ra file `.docx` y hệt định dạng gốc.

## Cú pháp

| Cú pháp | Ý nghĩa |
|---|---|
| `{benA.chuHo.hoTen}` | Chèn giá trị một trường |
| `{#benA.thanhVien} ... {/benA.thanhVien}` | Lặp qua mảng (cho danh sách thành viên) |
| `{#thuaDat.taiSanGanLien} ... {/}` | Hiển thị block nếu trường tồn tại/truthy |

**Lưu ý**: Hệ thống config delimiters `{` `}`. Đừng dùng ký tự `{` `}` cho mục đích khác trong file Word.

## Cách bắt đầu nhanh

1. Mở file **`HOP_DONG_CONVERTED.docx`** đã được convert từ file `.doc` của bạn (nằm ở thư mục gốc dự án).
2. Save As → giữ định dạng `.docx`.
3. Dùng **Find & Replace** (Ctrl+H) thay từng dữ liệu mẫu → placeholder theo bảng dưới.
4. Vào admin panel `/admin#/templates`, upload với code `HD_TANG_QSDD_V1`.

## Bảng mapping đầy đủ — text trong file mẫu → placeholder

### Phần Hợp đồng tặng cho

| Text trong file mẫu | Thay bằng |
|---|---|
| `001/HĐTCTSGLĐ` (hoặc số HĐ) | `{contractNumber}` |
| `15/06/2026` (ngày ký) | `{ngayKy}` |
| `Đồng Tháp` (nơi ký) | `{noiKy}` |

### Bên A (chủ hộ)

| Text mẫu | Placeholder |
|---|---|
| `ÔNG` (danh xưng) | `{benA.chuHo.danhXung}` |
| `PHẠM VĂN BƠ` | `{benA.chuHo.hoTen}` |
| `10/01/1965` (ngày sinh) | `{benA.chuHo.ngaySinh}` |
| `087065003989` (CCCD) | `{benA.chuHo.cccd}` |
| `15/05/2025` (ngày cấp) | `{benA.chuHo.ngayCapCCCD}` |
| `Bộ Công An` (nơi cấp) | `{benA.chuHo.noiCapCCCD}` |
| `Ấp Bình Hòa, xã Mỹ Hiệp, tỉnh Đồng Tháp` | `{benA.chuHo.diaChi}` |

### Bên A — thành viên (BẢNG LẶP)

Thay khối từ dòng "Cùng các thành viên trong hộ:" đến hết các thành viên thành:

```
Cùng các thành viên trong hộ:
{#benA.thanhVien}
   {danhXung} {hoTen}        Sinh ngày: {ngaySinh}
   Giấy CCCD số: {cccd} do {noiCapCCCD} cấp ngày {ngayCapCCCD}
   Địa chỉ: {diaChi}
{/benA.thanhVien}
```

**Quan trọng**: Trong khối `{#benA.thanhVien}...{/}`, bạn dùng `{hoTen}` chứ KHÔNG phải `{benA.thanhVien.hoTen}` (docxtemplater tự scope vào item của vòng lặp).

### Bên B — tương tự Bên A

| Text mẫu | Placeholder |
|---|---|
| `BÀ PHẠM THANH TRÚC` | `{benB.chuHo.danhXung} {benB.chuHo.hoTen}` |
| `16/08/1990` | `{benB.chuHo.ngaySinh}` |
| `087190014991` | `{benB.chuHo.cccd}` |
| `03/01/2022` | `{benB.chuHo.ngayCapCCCD}` |
| `Cục CSQLHC về TTXH` | `{benB.chuHo.noiCapCCCD}` |

Vòng lặp: `{#benB.thanhVien}...{/benB.thanhVien}` (tương tự bên A).

### Thửa đất (Điều 1)

| Text mẫu | Placeholder |
|---|---|
| `DN 750008` | `{thuaDat.soGCN}` |
| `CN10253` | `{thuaDat.soVaoSoCapGCN}` |
| `CHI NHÁNH VPĐK ĐẤT ĐAI HUYỆN CAO LÃNH TỈNH ĐỒNG THÁP` | `{thuaDat.coQuanCapGCN}` |
| `21/03/2024` (cấp ngày GCN) | `{thuaDat.ngayCapGCN}` |
| `99` (thửa đất số) | `{thuaDat.thuaDatSo}` |
| `5` (tờ bản đồ số) | `{thuaDat.toBanDoSo}` |
| `xã Bình Thạnh, huyện Cao Lãnh, tỉnh Đồng Tháp` | `{thuaDat.diaChi}` |
| `xã Mỹ Hiệp, tỉnh Đồng Tháp` (địa chỉ mới) | `{thuaDat.diaChiMoi}` |
| `1180,4` | `{thuaDat.dienTich}` |
| `một nghìn một trăm tám mươi phẩy bốn` | `{thuaDat.dienTichBangChu}` |
| `Sử dụng riêng` | `{thuaDat.hinhThucSuDung}` |
| `Đất trồng cây hằng năm khác` | `{thuaDat.mucDichSuDung}` |
| `HNK` | `{thuaDat.maLoaiDat}` |
| `Đến ngày 15/10/2063` | `{thuaDat.thoiHanSuDung}` |
| `Công nhận QSDĐ như giao đất không thu tiền` | `{thuaDat.nguonGocSuDung}` |

### Điều 3 — Trách nhiệm thuế

| Text mẫu | Placeholder |
|---|---|
| `bên B chịu trách nhiệm nộp` (hoặc tương tự) | `{dieuKhoan.benChiuThue}` chịu trách nhiệm nộp |

### Phần Tờ khai TNCN

| Text mẫu | Placeholder |
|---|---|
| `[01] Kỳ tính thuế: ... ngày 25 tháng 05 năm 2026` | `[01] Kỳ tính thuế: Lần phát sinh ngày {dieuKhoan.ngayLapHDTK}` |
| `[04] PHẠM VĂN BƠ ... sinh ngày: 10/01/1965` | `[04] Tên người nộp thuế: {benA.chuHo.hoTen} ... sinh ngày: {benA.chuHo.ngaySinh}` |
| `[06] 087065003989` | `[06] {benA.chuHo.cccd}` |
| `[06.1] 15/05/2025` | `[06.1] Ngày cấp: {benA.chuHo.ngayCapCCCD}` |
| `[06.2] Bộ Công An cấp` | `[06.2] Nơi cấp: {benA.chuHo.noiCapCCCD}` |
| `[08] Ấp Bình Hòa, xã Mỹ Hiệp` | `[08] {benA.chuHo.diaChi}` |
| `[10] Đồng Tháp` | `[10] {thuaDat.diaChiTinh}` |
| `[30.2] CHI NHÁNH VPĐK...` | `[30.2] Do cơ quan: {thuaDat.coQuanCapGCN}` |
| `[30.3] 21/03/2024` | `[30.3] Cấp ngày: {thuaDat.ngayCapGCN}` |
| `[33] PHẠM THANH TRÚC` | `[33] Họ và tên đại diện: {benB.chuHo.hoTen}` |
| `[35] 087190014991` | `[35] {benB.chuHo.cccd}` |
| `[41.1] 99 ... 5` | `[41.1] Thửa đất số: {thuaDat.thuaDatSo}; Tờ bản đồ số: {thuaDat.toBanDoSo}` |
| `[41.6] Đồng Tháp` | `[41.6] Tỉnh/thành: {thuaDat.diaChiTinh}` |
| `+ Loại đất 1: HNK ... Diện tích: 1180,4 m²` | `+ Loại đất 1: {thuaDat.maLoaiDat} ... Diện tích: {thuaDat.dienTich} m²` |
| `[45] (giá trị)` | `[45] {thuaDat.giaTri} đồng` |
| `[50] (thuế TNCN)` | `[50] {thue.tncn} đồng` |

### Phần Tờ khai Lệ phí trước bạ

| Text mẫu | Placeholder |
|---|---|
| `[04] PHẠM THANH TRÚC ... Sinh ngày: 16/08/1990` | `[04] {benB.chuHo.hoTen} ... Sinh ngày: {benB.chuHo.ngaySinh}` |
| `[06] 087190014991` | `[06] {benB.chuHo.cccd}` |
| `[07] Ấp Bình Hòa, xã Mỹ Hiệp` | `[07] {benB.chuHo.diaChi}` |
| `[09] Đồng Tháp` | `[09] {thuaDat.diaChiTinh}` |
| `1.1. 99 ... 5` | `1.1. Thửa đất số: {thuaDat.thuaDatSo}; Tờ bản đồ số: {thuaDat.toBanDoSo}` |
| `1.4. HNK` | `1.4. Mục đích sử dụng đất: {thuaDat.maLoaiDat}` |
| `1.5. 1180,4` | `1.5. Diện tích: {thuaDat.dienTich} m²` |
| `a) PHẠM VĂN BƠ` | `a) Tên cá nhân chuyển giao QSDĐ: {benA.chuHo.hoTen}` |
| `Số CMND: 087065003989` | `Số CMND/CCCD: {benA.chuHo.cccd}` |
| `Ấp Bình Hòa, xã Mỹ Hiệp, tỉnh Đồng Tháp` (người giao) | `{benA.chuHo.diaChi}` |

### Phần Đơn đăng ký biến động

| Text mẫu | Placeholder |
|---|---|
| `BÀ PHẠM THANH TRÚC ... Sinh ngày: 16/08/1990` (người sử dụng đất) | `{benB.chuHo.danhXung} {benB.chuHo.hoTen} ... Sinh ngày: {benB.chuHo.ngaySinh}` |
| `Giấy CCCD số: 087190014991` | `Giấy CCCD số: {benB.chuHo.cccd}` |
| `Cục CSQLHC về TTXH` | `{benB.chuHo.noiCapCCCD}` |
| `03/01/2022` | `{benB.chuHo.ngayCapCCCD}` |
| `Ấp Bình Hòa, xã Mỹ Hiệp, tỉnh Đồng Tháp` (người sử dụng đất) | `{benB.chuHo.diaChi}` |
| `Nhận tặng cho 1180,4m² đất trồng cây hằng năm khác từ ông PHẠM VĂN BƠ.` | `Nhận tặng cho {thuaDat.dienTich}m² đất {thuaDat.mucDichSuDung} từ {benA.chuHo.danhXung} {benA.chuHo.hoTen}.` |
| `Số DN 750008; Số vào sổ cấp GCN: CN10253` | `Số {thuaDat.soGCN}; Số vào sổ cấp GCN: {thuaDat.soVaoSoCapGCN}` |
| `Mỹ Hiệp, ngày ... tháng ... năm 2026` | `{noiKy}, ngày {dieuKhoan.ngayLapHDTK}` |

## Danh sách đầy đủ tất cả placeholder có sẵn

```
contractNumber
ngayKy                    // dd/mm/yyyy
noiKy                     // tên tỉnh

benA.chuHo.danhXung       // Ông | Bà | Anh | Chị
benA.chuHo.hoTen
benA.chuHo.ngaySinh
benA.chuHo.cccd
benA.chuHo.ngayCapCCCD
benA.chuHo.noiCapCCCD
benA.chuHo.diaChi
benA.chuHo.dienThoai
benA.chuHo.maSoThue

{#benA.thanhVien}{danhXung} {hoTen} {ngaySinh} {cccd} {ngayCapCCCD} {noiCapCCCD} {diaChi}{/benA.thanhVien}
benA.coThanhVien          // true/false
benA.tongSoNguoi          // integer

benB.chuHo.*              // tương tự benA
{#benB.thanhVien}...{/benB.thanhVien}

thuaDat.soGCN
thuaDat.soVaoSoCapGCN
thuaDat.coQuanCapGCN
thuaDat.ngayCapGCN
thuaDat.thuaDatSo
thuaDat.toBanDoSo
thuaDat.diaChi
thuaDat.diaChiMoi
thuaDat.diaChiTinh        // tự trích từ diaChi
thuaDat.diaChiHuyen
thuaDat.diaChiXa
thuaDat.dienTich
thuaDat.dienTichBangChu   // auto-gen
thuaDat.hinhThucSuDung
thuaDat.mucDichSuDung
thuaDat.maLoaiDat         // HNK, ONT...
thuaDat.thoiHanSuDung
thuaDat.nguonGocSuDung
thuaDat.hanCheQuyen
thuaDat.taiSanGanLien
thuaDat.giayToTaiSan
thuaDat.giaTri            // có dấu phẩy nghìn
thuaDat.giaTriBangChu     // tiếng Việt
thuaDat.giaTriRaw         // số nguyên

dieuKhoan.benChiuThue     // "Bên A" | "Bên B" | "Hai bên chia đôi"
dieuKhoan.benChiuThueCode // "A" | "B" | "chiaDoi"
dieuKhoan.ghiChu
dieuKhoan.ngayLapHDTK     // dd/mm/yyyy

// Tính toán thuế (tự auto-fill cho tờ khai)
thue.giaTriChuyenNhuong
thue.tncn                 // 2% giá trị
thue.tncnBangChu
thue.lepRBac              // 0.5% giá trị
```

## Upload vào hệ thống

1. Vào admin panel: `/admin#/templates`
2. Điền:
   - **Code**: `HD_TANG_QSDD_V1` (giữ đúng — đây là code hệ thống tìm)
   - **Tên**: `Hợp đồng tặng QSDĐ + 3 tờ khai`
   - **Mô tả**: `File Word đầy đủ gồm Hợp đồng + Tờ khai TNCN + Tờ khai LPTB + Đơn đăng ký`
   - **File**: chọn file `.docx` đã thêm placeholder
3. Click Upload.

Sau đó user vào `/hop-dong/moi`, điền form 5 bước → nhấn "Xuất Toàn Bộ Văn Bản" sẽ được 1 file Word giống y hệt mẫu của bạn nhưng với data user nhập.
