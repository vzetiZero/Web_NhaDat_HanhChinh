// Trang tạo hồ sơ - form 5 bước với multi-member + đầy đủ trường GCN
// - Hint chi tiết + error inline cho mọi field bắt buộc
// - Address picker: chọn Tỉnh → Xã (dropdown), KHÔNG gõ tay tự do
// - Toggle "địa chỉ cũ ↔ địa chỉ mới sau sáp nhập" với gợi ý qua API

import { renderPageShell } from '../components/layout.js';

export function renderContractNewPage(env) {
  return renderPageShell(env, {
    title: 'Tạo hồ sơ',
    requireAuth: true,
    bodyHtml: `
      <div class="max-w-7xl mx-auto px-4 py-6">

        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold">Tạo hồ sơ tặng cho QSDĐ</h1>
            <p class="text-slate-500 text-sm">Hệ thống tạo 1 file Word gồm: Hợp đồng + Tờ khai thuế + Lệ phí trước bạ + Đơn đăng ký biến động</p>
          </div>
          <a href="/bang-dieu-khien" class="text-sm text-slate-500 hover:text-primary-500">
            <i data-lucide="x" class="w-4 h-4 inline"></i> Hủy
          </a>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div>
            <div class="bg-white border border-slate-200 rounded-xl p-3 mb-4">
              <div class="flex items-center gap-2" id="stepper">${stepperHtml()}</div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-6">
              <div id="step-content"></div>
              <div class="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <button id="btn-prev" class="btn-secondary" disabled>
                  <i data-lucide="arrow-left" class="w-4 h-4 inline"></i> Quay lại
                </button>
                <button id="btn-next" class="btn-primary">Tiếp theo</button>
              </div>
            </div>
          </div>

          <aside class="space-y-3">
            <div class="bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl p-4 shadow">
              <div class="flex items-center gap-2 mb-2">
                <i data-lucide="download" class="w-5 h-5"></i>
                <h3 class="font-semibold">Xuất Hồ Sơ</h3>
              </div>
              <div class="bg-white/10 rounded-lg p-3">
                <div class="font-semibold text-sm mb-1">Xuất Toàn Bộ Văn Bản</div>
                <p class="text-xs opacity-90">Gồm Hợp đồng, Tờ khai thuế, Lệ phí trước bạ, Đơn đăng ký (Trong cùng 1 file Word)</p>
              </div>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
              <div class="flex items-center gap-1 mb-1">
                <i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-500"></i>
                <span class="font-medium">Auto-save</span>
              </div>
              Form được lưu nháp tự động vào trình duyệt
            </div>
            <div id="autosave-indicator" class="text-xs text-slate-400 px-1"></div>
          </aside>
        </div>
      </div>
    `,
    pageScript: contractFormScript(),
  });
}

function stepperHtml() {
  const steps = [
    { id: 1, label: 'Bên A' },
    { id: 2, label: 'Bên B' },
    { id: 3, label: 'Thửa đất' },
    { id: 4, label: 'Điều khoản' },
    { id: 5, label: 'Xem & Xuất' },
  ];
  return steps
    .map((s, i) => {
      const isLast = i === steps.length - 1;
      return `
      <div class="flex items-center gap-2">
        <div class="step-dot" data-step="${s.id}">${s.id}</div>
        <span class="text-xs text-slate-600 hidden md:inline whitespace-nowrap">${s.label}</span>
      </div>
      ${isLast ? '' : '<div class="step-line"></div>'}
    `;
    })
    .join('');
}

function contractFormScript() {
  return `
const DRAFT_KEY = 'ctnd_draft_form_v3';

const emptyAddress = () => ({
  // địa chỉ cấu trúc: thôn/ấp/số nhà tự do + ward + province có code
  chiTiet: '',           // Số nhà / ấp / thôn (text tự do)
  wardName: '',          // "Xã Mỹ Hiệp"
  provinceCode: '',      // "dong-thap"
  provinceName: '',      // "Đồng Tháp"
  full: '',              // gộp toàn bộ - dùng cho hợp đồng
});

const emptyPerson = () => ({
  danhXung: 'Ông', hoTen: '',
  ngaySinh: '', ngaySinhISO: '',
  loaiGiayTo: 'canCuoc',
  cccd: '',
  ngayCapCCCD: '', ngayCapCCCDISO: '',
  noiCapCCCD: '',
  diaChi: emptyAddress(),
  dienThoai: '', maSoThue: '',
});

const initialForm = () => ({
  thongTinChung: { ngayKy: '', ngayKyISO: '', noiKy: '', noiKyCode: '', soHopDong: '' },
  benA: { chuHo: emptyPerson(), thanhVien: [] },
  benB: { chuHo: emptyPerson(), thanhVien: [] },
  thuaDat: {
    soGCN: '', soVaoSoCapGCN: '', coQuanCapGCN: '',
    coQuanCapGCNProvinceCode: '', coQuanCapGCNProvinceName: '', coQuanCapGCNOldDistrict: '',
    ngayCapGCN: '', ngayCapGCNISO: '',
    thuaDatSo: '', toBanDoSo: '',
    // Địa chỉ thửa đất hỗ trợ "theo GCN cũ" và "mới sau sáp nhập"
    diaChiMode: 'gcn',   // 'gcn' = nhập từ GCN cũ; 'moi' = mới sau sáp nhập
    diaChiGcnText: '',   // Free text từ GCN gốc
    diaChiMoi: emptyAddress(), // Cấu trúc cho địa chỉ mới
    dienTich: '', dienTichBangChu: '',
    hinhThucSuDung: 'Sử dụng riêng',
    mucDichSuDung: '', maLoaiDat: '',
    thoiHanSuDung: '', nguonGocSuDung: '',
    hanCheQuyen: 'Không có',
    taiSanGanLien: '', giayToTaiSan: '',
    giaTri: '',
  },
  dieuKhoan: { benChiuThue: 'B', ghiChu: '', ngayLapHDTK: '', ngayLapHDTKISO: '' },
});

let form;
try {
  const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  form = saved || initialForm();
} catch { form = initialForm(); }
form = Object.assign(initialForm(), form);
// Backfill địa chỉ cũ nếu là string -> object
function backfillAddr(p) {
  if (typeof p?.diaChi === 'string') p.diaChi = { ...emptyAddress(), chiTiet: p.diaChi, full: p.diaChi };
  if (!p?.diaChi) p.diaChi = emptyAddress();
}
backfillAddr(form.benA.chuHo);
backfillAddr(form.benB.chuHo);
form.benA.thanhVien.forEach(backfillAddr);
form.benB.thanhVien.forEach(backfillAddr);

let currentStep = 1;
const TOTAL_STEPS = 5;

// ===== Province cache =====
let provincesCache = null;
async function loadProvinces() {
  if (provincesCache) return provincesCache;
  const d = await api('/api/address/provinces');
  provincesCache = d.items;
  return provincesCache;
}

let wardsCache = {}; // provinceCode -> wards[]
async function loadWards(provinceCode) {
  if (!provinceCode) return [];
  if (wardsCache[provinceCode]) return wardsCache[provinceCode];
  const d = await api('/api/address/wards?province=' + encodeURIComponent(provinceCode));
  wardsCache[provinceCode] = d.items;
  return d.items;
}

async function searchAddress(query) {
  if (!query || query.length < 2) return [];
  const d = await api('/api/address/search?q=' + encodeURIComponent(query) + '&limit=8');
  return d.items || [];
}

let _saveTimer = null;
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  clearTimeout(_saveTimer);
  const ind = document.getElementById('autosave-indicator');
  if (ind) {
    ind.textContent = '✓ Đã lưu nháp ' + new Date().toLocaleTimeString('vi-VN');
    _saveTimer = setTimeout(() => { ind.textContent = ''; }, 3000);
  }
}

function updateStepper() {
  document.querySelectorAll('.step-dot').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s === currentStep);
    el.classList.toggle('done', s < currentStep);
    el.textContent = s < currentStep ? '✓' : s;
  });
  document.querySelectorAll('.step-line').forEach((el, i) => {
    el.classList.toggle('done', i + 1 < currentStep);
  });
  document.getElementById('btn-prev').disabled = currentStep === 1;
  document.getElementById('btn-next').innerHTML = currentStep === TOTAL_STEPS
    ? '<i data-lucide="file-down" class="w-4 h-4 inline"></i> Xuất Toàn Bộ Văn Bản'
    : 'Tiếp theo <i data-lucide="arrow-right" class="w-4 h-4 inline"></i>';
  if (window.lucide) window.lucide.createIcons();
}

// ============ Helper render field ============
// Hint ẩn mặc định, chỉ hiện khi focus vào input (CSS :focus-within).
// Label có icon ⓘ để báo có hint.
function field({ label, required, hint, errorId, inputHtml }) {
  return \`
    <div class="field-row">
      <label class="form-label\${hint ? ' has-hint' : ''}">\${esc(label)}\${required ? ' <span class="req">*</span>' : ''}</label>
      \${inputHtml}
      \${hint ? '<div class="form-hint">' + hint + '</div>' : ''}
      <div class="form-error hidden" id="\${errorId}"></div>
    </div>
  \`;
}

// Input ngày dạng dd/mm/yyyy với mask tự động:
// - Người dùng chỉ gõ số → tự thêm dấu / vào đúng chỗ
// - Validate khi blur: ngày tồn tại, trong khoảng [minISO, maxISO]
// - data-bind trỏ tới key gốc (vd "ngayCapCCCD"); ISO được set vào key + "ISO"
function dateInput({ bindPath, value, required, min, max, placeholder, id }) {
  const inputId = id || ('date_' + bindPath.replace(/[^a-zA-Z0-9]/g, '_'));
  const isoValue = vnToISO(value);
  return \`
    <div class="relative" data-date-root>
      <input type="text" inputmode="numeric" maxlength="10"
        data-date data-bind="\${bindPath}"
        id="\${inputId}"
        \${required ? 'data-required' : ''}
        \${min ? 'data-date-min="' + min + '"' : ''}
        \${max ? 'data-date-max="' + max + '"' : ''}
        class="form-input pr-12"
        value="\${esc(value || '')}"
        placeholder="\${placeholder || 'dd/mm/yyyy'}"
        autocomplete="off" />
      <input type="date"
        data-date-picker="\${bindPath}"
        \${min ? 'min="' + min + '"' : ''}
        \${max ? 'max="' + max + '"' : ''}
        class="absolute right-0 top-0 h-full w-11 cursor-pointer opacity-0"
        value="\${esc(isoValue || '')}"
        aria-label="Chon ngay" />
      <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <i data-lucide="calendar-days" class="w-4 h-4"></i>
      </div>
    </div>\`;
}

const today = new Date().toISOString().slice(0, 10);

// ============ Address picker ============
// Person address: chọn Tỉnh + Xã (dropdown 2 select) + thêm chi tiết (số nhà/ấp)
function renderAddressPicker(addr, pathPrefix, opts = {}) {
  const idBase = pathPrefix.replace(/[^a-zA-Z0-9]/g, '_');
  return \`
    <div class="space-y-2" data-addr-root="\${pathPrefix}">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div class="relative" data-addr-combo="province">
          <button type="button" class="form-select flex items-center justify-between gap-2 text-left" data-addr-combo-btn="province">
            <span data-addr-province-label>-- Chọn Tỉnh/Thành phố --</span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
          </button>
          <div class="ac-dropdown hidden" data-addr-combo-menu="province">
            <div class="p-2 border-b border-slate-100">
              <input type="search" class="form-input" data-addr-province-search="\${pathPrefix}" placeholder="Tìm tỉnh/thành..." autocomplete="off" />
            </div>
            <div data-addr-province-list></div>
          </div>
        </div>
        <select class="hidden" data-addr-province="\${pathPrefix}" id="\${idBase}_prov">
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
        </select>
        <div class="relative" data-addr-combo="ward">
          <button type="button" class="form-select flex items-center justify-between gap-2 text-left" data-addr-combo-btn="ward" \${addr.provinceCode ? '' : 'disabled'}>
            <span data-addr-ward-label>-- Chọn Xã/Phường --</span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
          </button>
          <div class="ac-dropdown hidden" data-addr-combo-menu="ward">
            <div class="p-2 border-b border-slate-100">
              <input type="search" class="form-input" data-addr-ward-search="\${pathPrefix}" placeholder="Tìm xã/phường..." autocomplete="off" \${addr.provinceCode ? '' : 'disabled'} />
            </div>
            <div data-addr-ward-list></div>
          </div>
        </div>
        <select class="hidden" data-addr-ward="\${pathPrefix}" id="\${idBase}_ward" disabled>
          <option value="">-- Chọn Xã/Phường --</option>
        </select>
      </div>
      <input type="text" class="form-input" placeholder="Chi tiết (Số nhà, Ấp/Thôn/Tổ...) - tùy chọn"
        value="\${esc(addr.chiTiet || '')}" data-addr-chitiet="\${pathPrefix}" />
      \${opts.preview !== false ? \`<div class="text-xs text-slate-500" data-addr-preview="\${pathPrefix}">\${esc(addr.full || '(chưa có địa chỉ)')}</div>\` : ''}
    </div>
  \`;
}

async function bindAddressPicker(rootEl, addr, pathPrefix) {
  const provSel = rootEl.querySelector('[data-addr-province]');
  const wardSel = rootEl.querySelector('[data-addr-ward]');
  const provSearch = rootEl.querySelector('[data-addr-province-search]');
  const wardSearch = rootEl.querySelector('[data-addr-ward-search]');
  const provBtn = rootEl.querySelector('[data-addr-combo-btn="province"]');
  const wardBtn = rootEl.querySelector('[data-addr-combo-btn="ward"]');
  const provMenu = rootEl.querySelector('[data-addr-combo-menu="province"]');
  const wardMenu = rootEl.querySelector('[data-addr-combo-menu="ward"]');
  const provLabel = rootEl.querySelector('[data-addr-province-label]');
  const wardLabel = rootEl.querySelector('[data-addr-ward-label]');
  const provList = rootEl.querySelector('[data-addr-province-list]');
  const wardList = rootEl.querySelector('[data-addr-ward-list]');
  const chiTietEl = rootEl.querySelector('[data-addr-chitiet]');
  const previewEl = rootEl.querySelector('[data-addr-preview]');

  // Populate provinces
  const provs = await loadProvinces();
  provSel.innerHTML = '<option value="">-- Chọn Tỉnh/Thành phố --</option>' +
    provs.map(p => \`<option value="\${esc(p.code)}" \${addr.provinceCode === p.code ? 'selected' : ''}>\${esc(p.name)}</option>\`).join('');

  // Populate wards if province already chosen
  if (addr.provinceCode) {
    const wards = await loadWards(addr.provinceCode);
    wardSel.disabled = false;
    wardSel.innerHTML = '<option value="">-- Chọn Xã/Phường --</option>' +
      wards.map(w => \`<option value="\${esc(w.name)}" \${addr.wardName === w.name ? 'selected' : ''}>\${esc(w.name)}</option>\`).join('');
  }

  let currentWards = addr.provinceCode ? await loadWards(addr.provinceCode) : [];

  function normalizeText(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  }

  function matchesSearch(text, query) {
    return !query || normalizeText(text).includes(normalizeText(query));
  }

  function closeAddrMenus() {
    document.querySelectorAll('[data-addr-combo-menu]').forEach(menu => menu.classList.add('hidden'));
  }

  function openAddrMenu(kind) {
    const isProvince = kind === 'province';
    closeAddrMenus();
    const menu = isProvince ? provMenu : wardMenu;
    const search = isProvince ? provSearch : wardSearch;
    if (!menu || (kind === 'ward' && !addr.provinceCode)) return;
    menu.classList.remove('hidden');
    setTimeout(() => search?.focus(), 0);
  }

  function renderProvinceOptions() {
    const q = provSearch?.value || '';
    let items = provs.filter(p => matchesSearch(p.name, q));
    const selected = provs.find(p => p.code === addr.provinceCode);
    if (selected && !items.some(p => p.code === selected.code)) items = [selected, ...items];
    if (provLabel) provLabel.textContent = selected?.name || '-- Chọn Tỉnh/Thành phố --';
    provSel.innerHTML = '<option value="">-- Chọn Tỉnh/Thành phố --</option>' +
      items.map(p => \`<option value="\${esc(p.code)}" \${addr.provinceCode === p.code ? 'selected' : ''}>\${esc(p.name)}</option>\`).join('');
    if (provList) {
      provList.innerHTML = items.length
        ? items.map(p => \`<button type="button" class="ac-item w-full text-left \${addr.provinceCode === p.code ? 'focused' : ''}" data-province-code="\${esc(p.code)}">\${esc(p.name)}</button>\`).join('')
        : '<div class="ac-empty">Không tìm thấy tỉnh/thành</div>';
      provList.querySelectorAll('[data-province-code]').forEach(btn => {
        btn.addEventListener('click', () => {
          provSel.value = btn.dataset.provinceCode;
          provSel.dispatchEvent(new Event('change'));
          closeAddrMenus();
        });
      });
    }
  }

  function renderWardOptions() {
    const q = wardSearch?.value || '';
    let items = currentWards.filter(w => matchesSearch(w.name, q));
    const selected = currentWards.find(w => w.name === addr.wardName);
    if (selected && !items.some(w => w.name === selected.name)) items = [selected, ...items];
    if (wardLabel) wardLabel.textContent = selected?.name || '-- Chọn Xã/Phường --';
    wardSel.innerHTML = '<option value="">-- Chọn Xã/Phường --</option>' +
      items.map(w => \`<option value="\${esc(w.name)}" \${addr.wardName === w.name ? 'selected' : ''}>\${esc(w.name)}</option>\`).join('');
    if (wardList) {
      wardList.innerHTML = items.length
        ? items.map(w => \`<button type="button" class="ac-item w-full text-left \${addr.wardName === w.name ? 'focused' : ''}" data-ward-name="\${esc(w.name)}">\${esc(w.name)}</button>\`).join('')
        : '<div class="ac-empty">Không tìm thấy xã/phường</div>';
      wardList.querySelectorAll('[data-ward-name]').forEach(btn => {
        btn.addEventListener('click', () => {
          wardSel.value = btn.dataset.wardName;
          wardSel.dispatchEvent(new Event('change'));
          closeAddrMenus();
        });
      });
    }
  }

  renderProvinceOptions();
  renderWardOptions();
  if (wardSearch) wardSearch.disabled = !addr.provinceCode;
  if (wardBtn) wardBtn.disabled = !addr.provinceCode;

  function rebuildFull() {
    const parts = [];
    if (addr.chiTiet?.trim()) parts.push(addr.chiTiet.trim());
    if (addr.wardName) parts.push(addr.wardName);
    if (addr.provinceName) parts.push('tỉnh ' + addr.provinceName.replace(/^t[ìi]nh\\s*/i, '').replace(/^th[àa]nh\\s*ph[ốo]\\s*/i, 'thành phố '));
    addr.full = parts.join(', ');
    if (previewEl) previewEl.textContent = addr.full || '(chưa có địa chỉ)';
  }

  provBtn?.addEventListener('click', () => openAddrMenu('province'));
  wardBtn?.addEventListener('click', () => openAddrMenu('ward'));
  provSearch?.addEventListener('input', renderProvinceOptions);
  wardSearch?.addEventListener('input', renderWardOptions);
  rootEl.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', closeAddrMenus);

  provSel.addEventListener('change', async () => {
    const code = provSel.value;
    addr.provinceCode = code;
    const found = provs.find(p => p.code === code);
    addr.provinceName = found?.name || '';
    addr.wardName = '';
    wardSel.value = '';
    wardSel.disabled = !code;
    if (provSearch) provSearch.value = '';
    if (wardBtn) wardBtn.disabled = !code;
    if (wardSearch) {
      wardSearch.value = '';
      wardSearch.disabled = !code;
    }
    if (code) {
      const wards = await loadWards(code);
      wardSel.innerHTML = '<option value="">-- Chọn Xã/Phường --</option>' +
        wards.map(w => \`<option value="\${esc(w.name)}">\${esc(w.name)}</option>\`).join('');
    }
    currentWards = code ? await loadWards(code) : [];
    renderProvinceOptions();
    renderWardOptions();
    rebuildFull();
    saveDraft();
    clearError(rootEl);
  });

  wardSel.addEventListener('change', () => {
    addr.wardName = wardSel.value;
    if (wardSearch) wardSearch.value = '';
    renderWardOptions();
    rebuildFull();
    saveDraft();
    clearError(rootEl);
  });

  chiTietEl.addEventListener('input', () => {
    addr.chiTiet = chiTietEl.value;
    rebuildFull();
    saveDraft();
  });

  rebuildFull();
}

function clearError(root) {
  const err = root.parentElement?.querySelector('.form-error');
  if (err) err.classList.add('hidden');
}

// ============ Hints catalog ============
const HINTS = {
  hoTen: 'Họ tên đầy đủ theo CCCD. VD: <span class="ex">NGUYỄN VĂN A</span>',
  ngaySinh: 'Chọn ngày sinh. Phải lớn hơn 14 tuổi.',
  cccd: 'Chọn đúng loại giấy tờ theo mặt trước của thẻ. CMND cũ thường <b>9 chữ số</b>; Căn cước/Căn cước công dân thường <b>12 chữ số</b>. VD: <span class="ex">087065003989</span>',
  ngayCapCCCD: 'Ngày cấp ghi trên giấy tờ. Không được sau hôm nay.',
  noiCapCCCD: 'VD: <span class="ex">Bộ Công An</span>, <span class="ex">Cục CSQLHC về TTXH</span>, <span class="ex">CA tỉnh Đồng Tháp</span>',
  diaChi: 'Chọn Tỉnh → Xã/Phường (dữ liệu cập nhật theo sáp nhập 2025). Có thể nhập thêm số nhà/ấp ở ô bên dưới.',
  dienThoai: 'Số điện thoại Việt Nam, bắt đầu bằng 0 hoặc +84. VD: <span class="ex">0912345678</span>',
  maSoThue: 'Mã số thuế cá nhân (10 chữ số) nếu có. Có thể để trống.',
  soGCN: 'Số trên Giấy chứng nhận QSDĐ (sổ đỏ). VD: <span class="ex">DN 750008</span>',
  soVaoSoCapGCN: 'Số vào sổ cấp GCN. VD: <span class="ex">CN10253</span>',
  coQuanCapGCN: 'Cơ quan cấp GCN. VD: <span class="ex">CHI NHÁNH VPĐK ĐẤT ĐAI HUYỆN CAO LÃNH TỈNH ĐỒNG THÁP</span>',
  ngayCapGCN: 'Ngày ghi trên sổ đỏ (mục "ngày cấp").',
  thuaDatSo: 'Số thửa đất trên bản đồ. VD: <span class="ex">99</span>',
  toBanDoSo: 'Số tờ bản đồ địa chính. VD: <span class="ex">5</span>',
  diaChiThuaDat: 'Nếu đất chưa cập nhật theo sáp nhập 2025, chọn "Theo GCN cũ" để giữ nguyên text từ sổ đỏ.',
  dienTich: 'Đơn vị m². Có thể dùng dấu chấm hoặc dấu phẩy cho thập phân. VD: <span class="ex">1180.4</span> hoặc <span class="ex">1180,4</span>',
  hinhThucSuDung: 'Chọn theo ghi trên GCN: Sử dụng riêng / chung / cả hai.',
  mucDichSuDung: 'Theo GCN. VD: <span class="ex">Đất trồng cây hằng năm khác</span>, <span class="ex">Đất ở tại nông thôn</span>',
  maLoaiDat: 'Mã loại đất viết tắt: <span class="ex">HNK</span> (cây hằng năm khác), <span class="ex">ONT</span> (đất ở nông thôn), <span class="ex">LUC</span> (lúa)...',
  thoiHanSuDung: 'VD: <span class="ex">Đến ngày 15/10/2063</span> hoặc <span class="ex">Lâu dài</span>',
  nguonGocSuDung: 'VD: <span class="ex">Công nhận QSDĐ như giao đất không thu tiền</span>',
  giaTri: 'Giá trị tự khai để tính thuế. Nếu để trống, tờ khai thuế sẽ không tự fill số tiền.',
  ngayKy: 'Ngày hai bên ký hợp đồng. Mặc định là hôm nay - thay đổi nếu cần.',
  noiKy: 'Tỉnh/Thành phố nơi ký - sẽ in vào dòng "Hôm nay, ngày... tại...".',
  benChiuThue: 'Bên B (người nhận) thường chịu thuế. Nếu khác, chọn lựa chọn phù hợp.',
};

const CCCD_ISSUERS = [
  'Bộ Công An',
  'Cục CSQLHC về TTXH',
  'Cục Cảnh sát QLHC về TTXH',
  'Công an tỉnh Đồng Tháp',
  'Công an Thành phố Hồ Chí Minh',
  'Công an Thành phố Hà Nội',
  'CA tỉnh Đồng Tháp',
  'CA TP Hồ Chí Minh',
  'CA TP Hà Nội',
];

const GIAY_TO_OPTIONS = [
  ['canCuoc', 'Căn cước'],
  ['canCuocCongDan', 'Căn cước công dân'],
  ['cmnd', 'Chứng minh nhân dân'],
];

function loaiGiayToLabel(code) {
  return (GIAY_TO_OPTIONS.find(([value]) => value === code)?.[1]) || 'Căn cước';
}

function noiCapCCCDInput(person, pathPrefix) {
  const listId = 'noiCapCCCD_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_');
  return \`
    <input type="text"
      list="\${listId}"
      data-bind="\${pathPrefix}.noiCapCCCD"
      data-required
      class="form-input"
      value="\${esc(person.noiCapCCCD)}"
      placeholder="Chọn nơi cấp hoặc tự nhập nếu không có" />
    <datalist id="\${listId}">
      \${CCCD_ISSUERS.map(item => \`<option value="\${esc(item)}"></option>\`).join('')}
    </datalist>
  \`;
}

function coQuanCapGCNInput(t) {
  return \`
    <div class="space-y-2" data-gcn-agency-root>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <select class="form-select" id="gcn-agency-province">
          <option value="">-- Chọn tỉnh/thành cấp GCN --</option>
        </select>
        <input type="text" class="form-input" id="gcn-agency-old-district"
          value="\${esc(t.coQuanCapGCNOldDistrict || '')}"
          placeholder="Huyện/quận cũ nếu có, VD: Huyện Cao Lãnh" />
      </div>
      <input type="text" data-bind="thuaDat.coQuanCapGCN" data-required class="form-input"
        value="\${esc(t.coQuanCapGCN)}"
        placeholder="Chọn gợi ý bên dưới hoặc tự nhập chính xác theo GCN" />
      <div class="flex flex-wrap gap-2" id="gcn-agency-suggestions"></div>
    </div>
  \`;
}

// ============ Render person form ============
function renderPersonForm(person, pathPrefix, title, isChuHo = false) {
  const idx = pathPrefix.includes('[') ? parseInt(pathPrefix.split('[')[1].split(']')[0], 10) : -1;
  const side = pathPrefix.split('.')[0];
  return \`
    <div class="border border-slate-200 rounded-lg p-4 mb-3 \${isChuHo ? 'bg-blue-50/50' : 'bg-slate-50'}" data-person-path="\${pathPrefix}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <i data-lucide="\${isChuHo ? 'user-check' : 'user'}" class="w-4 h-4 text-primary-500"></i>
          \${title}
        </div>
        \${!isChuHo ? \`<button type="button" class="text-red-500 text-xs hover:underline" onclick="removeThanhVien('\${side}', \${idx})"><i data-lucide="trash-2" class="w-3 h-3 inline"></i> Xóa</button>\` : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        \${field({
          label: 'Họ và tên', required: true, hint: HINTS.hoTen,
          errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_hoTen',
          inputHtml: \`
            <div class="flex gap-2">
              <select data-bind="\${pathPrefix}.danhXung" class="form-select" style="max-width:90px">
                \${['Ông','Bà','Anh','Chị'].map(o => \`<option value="\${o}" \${person.danhXung === o ? 'selected' : ''}>\${o}</option>\`).join('')}
              </select>
              <input type="text" data-bind="\${pathPrefix}.hoTen" data-required class="form-input" value="\${esc(person.hoTen)}" placeholder="NGUYỄN VĂN A" />
            </div>\`
        })}
        \${field({
          label: 'Ngày sinh', required: false, hint: HINTS.ngaySinh,
          errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_ngaySinh',
          inputHtml: dateInput({ bindPath: pathPrefix + '.ngaySinh', value: person.ngaySinh || isoToVN(person.ngaySinhISO), min: '1900-01-01', max: today })
        })}
        \${field({
          label: 'Loại giấy tờ & số', required: true, hint: HINTS.cccd,
          errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_cccd',
          inputHtml: \`
            <div class="flex gap-2">
              <select data-bind="\${pathPrefix}.loaiGiayTo" class="form-select" style="min-width:220px;max-width:240px">
                \${GIAY_TO_OPTIONS.map(([value, label]) => \`<option value="\${value}" \${(person.loaiGiayTo || 'canCuoc') === value ? 'selected' : ''}>\${label}</option>\`).join('')}
              </select>
              <input type="text" inputmode="numeric" data-bind="\${pathPrefix}.cccd" data-required data-pattern="cccd" class="form-input" value="\${esc(person.cccd)}" placeholder="087065003989" maxlength="12" />
            </div>\`
        })}
        \${field({
          label: 'Ngày cấp giấy tờ', required: true, hint: HINTS.ngayCapCCCD,
          errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_ngayCap',
          inputHtml: dateInput({ bindPath: pathPrefix + '.ngayCapCCCD', value: person.ngayCapCCCD || isoToVN(person.ngayCapCCCDISO), required: true, min: '2000-01-01', max: today })
        })}
        \${field({
          label: 'Nơi cấp giấy tờ', required: true, hint: HINTS.noiCapCCCD,
          errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_noiCap',
          inputHtml: noiCapCCCDInput(person, pathPrefix)
        })}
        <div class="md:col-span-2">
          \${field({
            label: 'Địa chỉ thường trú', required: true, hint: HINTS.diaChi,
            errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_diaChi',
            inputHtml: renderAddressPicker(person.diaChi, pathPrefix + '.diaChi')
          })}
        </div>
        \${isChuHo ? \`
          \${field({
            label: 'Điện thoại', required: false, hint: HINTS.dienThoai,
            errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_phone',
            inputHtml: \`<input type="tel" data-bind="\${pathPrefix}.dienThoai" data-pattern="phone" class="form-input" value="\${esc(person.dienThoai)}" placeholder="0912345678" />\`
          })}
          \${field({
            label: 'Mã số thuế', required: false, hint: HINTS.maSoThue,
            errorId: 'err_' + pathPrefix.replace(/[^a-zA-Z0-9]/g, '_') + '_mst',
            inputHtml: \`<input type="text" inputmode="numeric" data-bind="\${pathPrefix}.maSoThue" class="form-input" value="\${esc(person.maSoThue)}" placeholder="Tùy chọn" maxlength="13" />\`
          })}
        \` : ''}
      </div>
    </div>
  \`;
}

window.addThanhVien = function(side) {
  form[side].thanhVien.push(emptyPerson());
  saveDraft();
  renderStep();
};

window.removeThanhVien = function(side, idx) {
  if (!confirm('Xóa thành viên này?')) return;
  form[side].thanhVien.splice(idx, 1);
  saveDraft();
  renderStep();
};

// ============ Render steps ============
function renderStep() {
  const root = document.getElementById('step-content');
  let html;
  switch (currentStep) {
    case 1: html = renderStepParty('benA', 'I. Thông Tin Bên Tặng Cho (Bên A)'); break;
    case 2: html = renderStepParty('benB', 'II. Thông Tin Bên Nhận Tặng Cho (Bên B)'); break;
    case 3: html = renderStepThuaDat(); break;
    case 4: html = renderStepDieuKhoan(); break;
    case 5: html = renderStepPreview(); break;
  }
  root.innerHTML = html;
  bindStepHandlers();
  updateStepper();
}

function renderStepParty(side, title) {
  const b = form[side];
  return \`
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center">
        <i data-lucide="user-plus" class="w-4 h-4"></i>
      </div>
      <h2 class="text-lg font-bold">\${title}</h2>
    </div>
    \${renderPersonForm(b.chuHo, side + '.chuHo', 'Người đại diện (Chủ hộ)', true)}
    \${b.thanhVien.map((tv, idx) => renderPersonForm(tv, side + '.thanhVien[' + idx + ']', 'Thành viên ' + (idx + 1))).join('')}
    <button type="button" onclick="addThanhVien('\${side}')" class="w-full border-2 border-dashed border-slate-300 hover:border-primary-500 hover:bg-primary-50 text-slate-500 hover:text-primary-500 py-3 rounded-lg text-sm transition">
      <i data-lucide="plus-circle" class="w-4 h-4 inline"></i> Thêm thành viên
    </button>
  \`;
}

function renderStepThuaDat() {
  const t = form.thuaDat;
  return \`
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center">
        <i data-lucide="map-pin" class="w-4 h-4"></i>
      </div>
      <h2 class="text-lg font-bold">III. Thông Tin Thửa Đất</h2>
    </div>

    <fieldset class="border border-slate-200 rounded-lg p-4 mb-4">
      <legend class="text-sm font-semibold text-slate-600 px-2">Giấy chứng nhận (Sổ đỏ)</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        \${field({ label: 'Số GCN', required: true, hint: HINTS.soGCN, errorId: 'err_soGCN',
          inputHtml: \`<input type="text" data-bind="thuaDat.soGCN" data-required class="form-input" value="\${esc(t.soGCN)}" placeholder="DN 750008" />\` })}
        \${field({ label: 'Số vào sổ cấp GCN', required: true, hint: HINTS.soVaoSoCapGCN, errorId: 'err_soVao',
          inputHtml: \`<input type="text" data-bind="thuaDat.soVaoSoCapGCN" data-required class="form-input" value="\${esc(t.soVaoSoCapGCN)}" placeholder="CN10253" />\` })}
        <div class="md:col-span-2">
          \${field({ label: 'Cơ quan cấp GCN', required: true, hint: HINTS.coQuanCapGCN, errorId: 'err_coQuan',
            inputHtml: coQuanCapGCNInput(t) })}
        </div>
        \${field({ label: 'Ngày cấp GCN', required: true, hint: HINTS.ngayCapGCN, errorId: 'err_ngayCapGCN',
          inputHtml: dateInput({ bindPath: 'thuaDat.ngayCapGCN', value: t.ngayCapGCN || isoToVN(t.ngayCapGCNISO), required: true, min: '1990-01-01', max: today }) })}
      </div>
    </fieldset>

    <fieldset class="border border-slate-200 rounded-lg p-4 mb-4">
      <legend class="text-sm font-semibold text-slate-600 px-2">Vị trí thửa đất</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        \${field({ label: 'Thửa đất số', required: true, hint: HINTS.thuaDatSo, errorId: 'err_thua',
          inputHtml: \`<input type="text" data-bind="thuaDat.thuaDatSo" data-required class="form-input" value="\${esc(t.thuaDatSo)}" placeholder="99" />\` })}
        \${field({ label: 'Tờ bản đồ số', required: true, hint: HINTS.toBanDoSo, errorId: 'err_to',
          inputHtml: \`<input type="text" data-bind="thuaDat.toBanDoSo" data-required class="form-input" value="\${esc(t.toBanDoSo)}" placeholder="5" />\` })}
      </div>

      <!-- ĐỊA CHỈ THỬA ĐẤT - có toggle GCN cũ / mới sau sáp nhập -->
      <div class="border-t border-slate-200 pt-3">
        <div class="flex items-center justify-between mb-2">
          <label class="form-label" style="margin-bottom:0">Địa chỉ thửa đất <span class="req">*</span></label>
          <div class="toggle-pill">
            <button type="button" id="addr-mode-gcn" class="\${t.diaChiMode === 'gcn' ? 'active' : ''}">📜 Theo GCN cũ</button>
            <button type="button" id="addr-mode-moi" class="\${t.diaChiMode === 'moi' ? 'active' : ''}">🆕 Sau sáp nhập 2025</button>
          </div>
        </div>
        <div class="form-hint mb-2">\${HINTS.diaChiThuaDat}</div>

        <!-- Mode: theo GCN cũ - free text + suggest -->
        <div id="addr-mode-gcn-content" class="\${t.diaChiMode === 'gcn' ? '' : 'hidden'}">
          <input type="text" id="diaChiGcnText" class="form-input"
            value="\${esc(t.diaChiGcnText)}"
            placeholder="VD: xã Bình Thạnh, huyện Cao Lãnh, tỉnh Đồng Tháp (gõ tên xã/huyện cũ)" autocomplete="off" />
          <div id="diaChiGcnSuggest" class="ac-wrap"></div>
          <div id="diaChiMoiBanner" class="\${t.diaChiMoi?.full ? '' : 'hidden'} suggest-banner">
            <i data-lucide="info" class="w-4 h-4 flex-shrink-0"></i>
            <div class="flex-1">
              <div><b>Địa chỉ mới đã chọn:</b> <span id="diaChiMoiBannerText">\${esc(t.diaChiMoi?.full || '')}</span></div>
              <div class="text-xs opacity-75 mt-1">Hệ thống sẽ in cả 2 địa chỉ vào hợp đồng (cũ + nay là...).</div>
            </div>
            <button type="button" id="diaChiMoiClear">Xóa</button>
          </div>
          <div class="form-error hidden" id="err_diaChiGcn"></div>
        </div>

        <!-- Mode: mới sau sáp nhập - dropdown Tỉnh + Xã -->
        <div id="addr-mode-moi-content" class="\${t.diaChiMode === 'moi' ? '' : 'hidden'}">
          \${renderAddressPicker(t.diaChiMoi, 'thuaDat.diaChiMoi')}
          <div class="form-error hidden" id="err_diaChiMoi"></div>
        </div>
      </div>
    </fieldset>

    <fieldset class="border border-slate-200 rounded-lg p-4 mb-4">
      <legend class="text-sm font-semibold text-slate-600 px-2">Diện tích & mục đích</legend>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        \${field({ label: 'Diện tích (m²)', required: true, hint: HINTS.dienTich, errorId: 'err_dt',
          inputHtml: \`<input type="text" inputmode="decimal" data-bind="thuaDat.dienTich" data-required data-pattern="decimal" class="form-input" value="\${esc(t.dienTich)}" placeholder="1180.4" />
            <div class="form-hint" id="dt-chu" style="margin-top:4px"></div>\` })}
        \${field({ label: 'Diện tích bằng chữ', required: false, hint: '(tự sinh từ số diện tích - có thể chỉnh sửa)', errorId: 'err_dtChu',
          inputHtml: \`<input type="text" data-bind="thuaDat.dienTichBangChu" class="form-input" value="\${esc(t.dienTichBangChu)}" placeholder="một nghìn..." />\` })}
        \${field({ label: 'Hình thức sử dụng', required: true, hint: HINTS.hinhThucSuDung, errorId: 'err_hinhthuc',
          inputHtml: \`<select data-bind="thuaDat.hinhThucSuDung" data-required class="form-select">
            \${['Sử dụng riêng', 'Sử dụng chung', 'Sử dụng riêng và chung'].map(o => \`<option value="\${o}" \${t.hinhThucSuDung === o ? 'selected' : ''}>\${o}</option>\`).join('')}
          </select>\` })}
        \${field({ label: 'Mã loại đất', required: false, hint: HINTS.maLoaiDat, errorId: 'err_maloai',
          inputHtml: \`<input type="text" data-bind="thuaDat.maLoaiDat" class="form-input" value="\${esc(t.maLoaiDat)}" placeholder="HNK" maxlength="10" />\` })}
        <div class="md:col-span-2">
          \${field({ label: 'Mục đích sử dụng', required: true, hint: HINTS.mucDichSuDung, errorId: 'err_mdsd',
            inputHtml: \`<input type="text" data-bind="thuaDat.mucDichSuDung" data-required class="form-input" value="\${esc(t.mucDichSuDung)}" placeholder="Đất trồng cây hằng năm khác" />\` })}
        </div>
        \${field({ label: 'Thời hạn sử dụng', required: true, hint: HINTS.thoiHanSuDung, errorId: 'err_thsd',
          inputHtml: \`<input type="text" data-bind="thuaDat.thoiHanSuDung" data-required class="form-input" value="\${esc(t.thoiHanSuDung)}" placeholder="Đến ngày 15/10/2063" />\` })}
        <div class="md:col-span-2">
          \${field({ label: 'Nguồn gốc sử dụng', required: true, hint: HINTS.nguonGocSuDung, errorId: 'err_ngsd',
            inputHtml: \`<input type="text" data-bind="thuaDat.nguonGocSuDung" data-required class="form-input" value="\${esc(t.nguonGocSuDung)}" placeholder="Công nhận QSDĐ như giao đất không thu tiền" />\` })}
        </div>
      </div>
    </fieldset>

    <fieldset class="border border-slate-200 rounded-lg p-4 mb-4">
      <legend class="text-sm font-semibold text-slate-600 px-2">Tài sản gắn liền & giá trị</legend>
      <div class="grid grid-cols-1 gap-3">
        \${field({ label: 'Tài sản gắn liền với đất', required: false, hint: 'Mô tả nhà, công trình, cây trồng (để trống nếu không có)', errorId: 'err_tsgl',
          inputHtml: \`<textarea data-bind="thuaDat.taiSanGanLien" rows="2" class="form-textarea" placeholder="Nhà cấp 4 50m²; cây ăn quả lâu năm...">\${esc(t.taiSanGanLien)}</textarea>\` })}
        \${field({ label: 'Hạn chế quyền', required: false, hint: 'Mặc định "Không có". Nếu có thì ghi rõ.', errorId: 'err_han',
          inputHtml: \`<input type="text" data-bind="thuaDat.hanCheQuyen" class="form-input" value="\${esc(t.hanCheQuyen)}" placeholder="Không có" />\` })}
        \${field({ label: 'Giá trị (VNĐ)', required: false, hint: HINTS.giaTri, errorId: 'err_giatri',
          inputHtml: \`<input type="number" min="0" data-bind="thuaDat.giaTri" class="form-input" value="\${esc(t.giaTri)}" placeholder="500000000" />
            <div class="form-hint" id="gia-tri-chu" style="margin-top:4px"></div>\` })}
      </div>
    </fieldset>
  \`;
}

function renderStepDieuKhoan() {
  const v = form.dieuKhoan;
  const tc = form.thongTinChung;
  return \`
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center">
        <i data-lucide="file-check-2" class="w-4 h-4"></i>
      </div>
      <h2 class="text-lg font-bold">IV. Điều Khoản & Thông Tin Lập Hồ Sơ</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      \${field({ label: 'Ngày ký hợp đồng', required: true, hint: HINTS.ngayKy, errorId: 'err_ngayKy',
        inputHtml: dateInput({ id: 'f-ngayKy', bindPath: 'thongTinChung.ngayKy', value: tc.ngayKy || isoToVN(tc.ngayKyISO || today), required: true, min: '2000-01-01', max: nextYearISO() }) })}
      \${field({ label: 'Nơi ký (tỉnh/thành)', required: true, hint: HINTS.noiKy, errorId: 'err_noiKy',
        inputHtml: \`<select id="f-noiKy" data-required class="form-select"><option value="">-- Đang tải... --</option></select>\` })}
      \${field({ label: 'Ngày lập HĐ/TK', required: false, hint: 'Ngày lập tờ khai thuế (thường = ngày ký).', errorId: 'err_ngLap',
        inputHtml: dateInput({ bindPath: 'dieuKhoan.ngayLapHDTK', value: v.ngayLapHDTK || isoToVN(v.ngayLapHDTKISO || today), min: '2000-01-01', max: nextYearISO() }) })}
      \${field({ label: 'Số hợp đồng', required: false, hint: 'Để trống = tự sinh theo định dạng 001/HĐTCTSGLĐ/năm', errorId: 'err_soHd',
        inputHtml: \`<input type="text" id="f-soHopDong" class="form-input" value="\${esc(tc.soHopDong)}" placeholder="Tự sinh nếu để trống" />\` })}
    </div>

    \${field({
      label: 'Bên chịu trách nhiệm nộp thuế, lệ phí', required: true, hint: HINTS.benChiuThue,
      errorId: 'err_benThue',
      inputHtml: \`<div class="space-y-2 mt-1">
        \${[
          ['A', 'Bên A (Bên tặng)'],
          ['B', 'Bên B (Bên nhận) - phổ biến nhất'],
          ['chiaDoi', 'Hai bên chia đôi'],
        ].map(([opt, lbl]) => \`
          <label class="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 \${v.benChiuThue === opt ? 'border-primary-500 bg-primary-50' : ''}">
            <input type="radio" name="benChiuThue" value="\${opt}" \${v.benChiuThue === opt ? 'checked' : ''} data-bind="dieuKhoan.benChiuThue" />
            <span>\${lbl}</span>
          </label>
        \`).join('')}
      </div>\`
    })}

    \${field({
      label: 'Ghi chú khác', required: false, hint: 'Tùy chọn — thêm điều khoản đặc biệt nếu có.', errorId: 'err_gc',
      inputHtml: \`<textarea data-bind="dieuKhoan.ghiChu" rows="3" class="form-textarea" placeholder="Để trống nếu không có">\${esc(v.ghiChu)}</textarea>\`
    })}
  \`;
}

function renderStepPreview() {
  return \`
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center">
        <i data-lucide="eye" class="w-4 h-4"></i>
      </div>
      <h2 class="text-lg font-bold">V. Xem trước & Xuất hồ sơ</h2>
    </div>
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-900">
      <i data-lucide="info" class="w-4 h-4 inline"></i>
      Khi xuất, hệ thống tạo <b>1 file Word</b> chứa: Hợp đồng tặng cho + Tờ khai TNCN + Tờ khai LPTB + Đơn đăng ký biến động.
    </div>
    <div id="preview-summary" class="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-[400px] overflow-y-auto text-sm"></div>
    <div id="render-result" class="hidden mt-4 p-4 bg-green-50 border border-green-200 rounded-lg"></div>
  \`;
}

// ============ Bindings ============
function setByPath(obj, path, val) {
  const parts = path.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] === undefined || cur[k] === null) cur[k] = /^\\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = val;
}

function getByPath(obj, path) {
  const parts = path.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
  let cur = obj;
  for (const k of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[k];
  }
  return cur;
}

// ===== Field-level validators =====
function validatePattern(name, value) {
  if (!value) return null;
  if (name === 'cccd') {
    const v = String(value).replace(/\\s/g, '');
    if (!/^[0-9]{9}$|^[0-9]{12}$/.test(v)) return 'CCCD/CMND phải là 9 hoặc 12 chữ số';
  }
  if (name === 'phone') {
    if (!/^(\\+84|0)[1-9][0-9]{8,9}$/.test(String(value).replace(/[\\s.-]/g, ''))) return 'SĐT Việt Nam: bắt đầu bằng 0 hoặc +84, 10-11 chữ số';
  }
  if (name === 'decimal') {
    if (!/^-?\\d+([.,]\\d+)?$/.test(String(value))) return 'Phải là số (vd: 1180.4 hoặc 1180,4)';
  }
  return null;
}

function showError(errorId, msg) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(errorId) {
  const el = document.getElementById(errorId);
  if (el) el.classList.add('hidden');
}

function maskVNDate(value) {
  const digits = String(value || '').replace(/\\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

function vnToISO(value) {
  const m = String(value || '').trim().match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
  if (!m) return '';
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
  return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function syncDateInput(el) {
  const path = el.dataset.bind;
  const val = maskVNDate(el.value);
  if (el.value !== val) el.value = val;
  const rawIso = vnToISO(val);
  let iso = rawIso;
  if (iso && el.dataset.dateMin && iso < el.dataset.dateMin) iso = '';
  if (iso && el.dataset.dateMax && iso > el.dataset.dateMax) iso = '';
  const picker = el.closest('[data-date-root]')?.querySelector('[data-date-picker]');
  if (picker) picker.value = rawIso || '';
  setByPath(form, path, val);
  setByPath(form, path + 'ISO', iso);
  return val;
}

function validateDateInput(el, errorId) {
  const val = syncDateInput(el).trim();
  const iso = vnToISO(val);
  if (el.dataset.required && !val) return 'Truong nay la bat buoc';
  if (!val) return null;
  if (!/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(val)) return 'Nhap ngay theo dinh dang dd/mm/yyyy';
  if (!iso) return 'Ngay khong hop le';
  if (el.dataset.dateMin && iso < el.dataset.dateMin) return 'Ngay khong duoc truoc ' + isoToVN(el.dataset.dateMin);
  if (el.dataset.dateMax && iso > el.dataset.dateMax) return 'Ngay khong duoc sau ' + isoToVN(el.dataset.dateMax);
  hideError(errorId);
  el.classList.remove('invalid');
  return null;
}

function bindStepHandlers() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const path = el.dataset.bind;
    const isISO = path.endsWith('ISO');
    const pattern = el.dataset.pattern;
    const errorEl = el.closest('.field-row')?.querySelector('.form-error');
    const errorId = errorEl?.id;

    function onInput() {
      if (el.dataset.date !== undefined) {
        syncDateInput(el);
        saveDraft();
        return;
      }
      let val = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      setByPath(form, path, val);
      if (isISO) {
        const vnPath = path.replace(/ISO$/, '');
        setByPath(form, vnPath, isoToVN(val));
      }
      saveDraft();
      if (path === 'thuaDat.giaTri') updateGiaTriChu();
      if (path === 'thuaDat.dienTich') updateDienTichChu();

      // Real-time pattern validation
      if (pattern) {
        const err = validatePattern(pattern, val);
        if (err) { showError(errorId, err); el.classList.add('invalid'); }
        else { hideError(errorId); el.classList.remove('invalid'); }
      }
    }
    el.addEventListener('input', onInput);
    if (el.tagName === 'SELECT') el.addEventListener('change', onInput);

    el.addEventListener('blur', () => {
      if (el.dataset.date !== undefined) {
        const err = validateDateInput(el, errorId);
        if (err) {
          showError(errorId, err);
          el.classList.add('invalid');
        }
        saveDraft();
      } else if (el.dataset.required && !el.value?.toString().trim()) {
        showError(errorId, 'Trường này là bắt buộc');
        el.classList.add('invalid');
      } else if (!pattern) {
        hideError(errorId);
        el.classList.remove('invalid');
      }
    });
  });

  document.querySelectorAll('[data-date-picker]').forEach(picker => {
    picker.addEventListener('change', () => {
      const root = picker.closest('[data-date-root]');
      const textInput = root?.querySelector('[data-date]');
      if (!textInput) return;
      textInput.value = isoToVN(picker.value);
      syncDateInput(textInput);
      hideError(textInput.closest('.field-row')?.querySelector('.form-error')?.id);
      textInput.classList.remove('invalid');
      saveDraft();
    });
  });

  // Bind address pickers
  document.querySelectorAll('[data-addr-root]').forEach(rootEl => {
    const path = rootEl.dataset.addrRoot;
    const addr = getByPath(form, path);
    if (addr) bindAddressPicker(rootEl, addr, path);
  });

  if (currentStep === 3) {
    updateGiaTriChu();
    updateDienTichChu();
    bindCoQuanCapGCN();
    bindStepThuaDatAddress();
  }

  if (currentStep === 4) {
    // Sync default today date
    const ngayKyEl = document.getElementById('f-ngayKy');
    if (ngayKyEl?.value && !form.thongTinChung.ngayKyISO) {
      form.thongTinChung.ngayKy = ngayKyEl.value;
      form.thongTinChung.ngayKyISO = vnToISO(ngayKyEl.value);
      saveDraft();
    }
    const ngayLapEl = document.querySelector('[data-bind="dieuKhoan.ngayLapHDTK"]');
    if (ngayLapEl?.value && !form.dieuKhoan.ngayLapHDTKISO) {
      form.dieuKhoan.ngayLapHDTK = ngayLapEl.value;
      form.dieuKhoan.ngayLapHDTKISO = vnToISO(ngayLapEl.value);
      saveDraft();
    }

    const sel = document.getElementById('f-noiKy');
    loadProvinces().then(provs => {
      sel.innerHTML = '<option value="">-- Chọn tỉnh/thành --</option>' + provs.map(p =>
        \`<option value="\${esc(p.code)}" \${form.thongTinChung.noiKyCode === p.code ? 'selected' : ''}>\${esc(p.name)}</option>\`
      ).join('');
    });
    sel.addEventListener('change', (e) => {
      form.thongTinChung.noiKyCode = e.target.value;
      const provs = provincesCache || [];
      const p = provs.find(x => x.code === e.target.value);
      form.thongTinChung.noiKy = p?.name || '';
      saveDraft();
      hideError('err_noiKy');
    });
    document.getElementById('f-soHopDong').addEventListener('input', (e) => {
      form.thongTinChung.soHopDong = e.target.value;
      saveDraft();
    });
  }

  if (currentStep === 5) renderPreviewSummary();
}

async function bindCoQuanCapGCN() {
  const root = document.querySelector('[data-gcn-agency-root]');
  if (!root) return;
  const provinceEl = document.getElementById('gcn-agency-province');
  const oldDistrictEl = document.getElementById('gcn-agency-old-district');
  const agencyEl = root.querySelector('[data-bind="thuaDat.coQuanCapGCN"]');
  const suggestEl = document.getElementById('gcn-agency-suggestions');
  const provinces = await loadProvinces();
  if (form.thuaDat.coQuanCapGCNProvinceCode && !form.thuaDat.coQuanCapGCNProvinceName) {
    const found = provinces.find(p => p.code === form.thuaDat.coQuanCapGCNProvinceCode);
    form.thuaDat.coQuanCapGCNProvinceName = found?.name || '';
  }

  provinceEl.innerHTML = '<option value="">-- Chọn tỉnh/thành cấp GCN --</option>' +
    provinces.map(p => \`<option value="\${esc(p.code)}" \${form.thuaDat.coQuanCapGCNProvinceCode === p.code ? 'selected' : ''}>\${esc(p.name)}</option>\`).join('');

  function upperVN(value) {
    return String(value || '').trim().toLocaleUpperCase('vi-VN');
  }

  function normalizeProvinceName(name) {
    return upperVN(name).replace(/^TỈNH\\s+/i, 'TỈNH ').replace(/^THÀNH PHỐ\\s+/i, 'THÀNH PHỐ ');
  }

  function buildAgencySuggestions() {
    const provinceName = form.thuaDat.coQuanCapGCNProvinceName || '';
    const provinceText = normalizeProvinceName(provinceName);
    const oldDistrict = upperVN(form.thuaDat.coQuanCapGCNOldDistrict);
    const items = [];
    if (provinceText) {
      items.push('SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG ' + provinceText);
      items.push('SỞ TÀI NGUYÊN VÀ MÔI TRƯỜNG ' + provinceText);
      items.push('VĂN PHÒNG ĐĂNG KÝ ĐẤT ĐAI ' + provinceText);
      items.push('ỦY BAN NHÂN DÂN ' + provinceText);
      if (oldDistrict) {
        items.unshift('CHI NHÁNH VĂN PHÒNG ĐĂNG KÝ ĐẤT ĐAI ' + oldDistrict + ' ' + provinceText);
        items.push('ỦY BAN NHÂN DÂN ' + oldDistrict);
      }
    }
    return [...new Set(items)];
  }

  function renderAgencySuggestions() {
    const items = buildAgencySuggestions();
    if (!items.length) {
      suggestEl.innerHTML = '<span class="text-xs text-slate-500">Chọn tỉnh/thành để hiện gợi ý cơ quan cấp.</span>';
      return;
    }
    suggestEl.innerHTML = items.map(name =>
      \`<button type="button" class="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-blue-50 hover:border-primary-500 text-xs text-slate-700 text-left" data-gcn-agency="\${esc(name)}">\${esc(name)}</button>\`
    ).join('');
    suggestEl.querySelectorAll('[data-gcn-agency]').forEach(btn => {
      btn.addEventListener('click', () => {
        form.thuaDat.coQuanCapGCN = btn.dataset.gcnAgency;
        agencyEl.value = form.thuaDat.coQuanCapGCN;
        saveDraft();
        hideError('err_coQuan');
        agencyEl.classList.remove('invalid');
      });
    });
  }

  provinceEl.addEventListener('change', () => {
    const found = provinces.find(p => p.code === provinceEl.value);
    form.thuaDat.coQuanCapGCNProvinceCode = found?.code || '';
    form.thuaDat.coQuanCapGCNProvinceName = found?.name || '';
    saveDraft();
    renderAgencySuggestions();
  });

  oldDistrictEl.addEventListener('input', () => {
    form.thuaDat.coQuanCapGCNOldDistrict = oldDistrictEl.value;
    saveDraft();
    renderAgencySuggestions();
  });

  renderAgencySuggestions();
}

// ============ Special: địa chỉ thửa đất với toggle + suggest ============
let _searchTimer = null;
function bindStepThuaDatAddress() {
  const t = form.thuaDat;
  const btnGcn = document.getElementById('addr-mode-gcn');
  const btnMoi = document.getElementById('addr-mode-moi');
  const cntGcn = document.getElementById('addr-mode-gcn-content');
  const cntMoi = document.getElementById('addr-mode-moi-content');
  const gcnInput = document.getElementById('diaChiGcnText');
  const suggestEl = document.getElementById('diaChiGcnSuggest');
  const banner = document.getElementById('diaChiMoiBanner');
  const bannerText = document.getElementById('diaChiMoiBannerText');
  const bannerClear = document.getElementById('diaChiMoiClear');

  function switchMode(mode) {
    t.diaChiMode = mode;
    btnGcn.classList.toggle('active', mode === 'gcn');
    btnMoi.classList.toggle('active', mode === 'moi');
    cntGcn.classList.toggle('hidden', mode !== 'gcn');
    cntMoi.classList.toggle('hidden', mode !== 'moi');
    saveDraft();
  }
  btnGcn.addEventListener('click', () => switchMode('gcn'));
  btnMoi.addEventListener('click', () => switchMode('moi'));

  // Mode GCN: gõ text + fuzzy suggest
  gcnInput.addEventListener('input', () => {
    t.diaChiGcnText = gcnInput.value;
    saveDraft();
    clearTimeout(_searchTimer);
    const q = gcnInput.value.trim();
    if (q.length < 3) { suggestEl.innerHTML = ''; return; }
    suggestEl.innerHTML = '<div class="ac-dropdown"><div class="ac-loading">🔎 Đang tìm địa chỉ mới sau sáp nhập...</div></div>';
    _searchTimer = setTimeout(async () => {
      try {
        const items = await searchAddress(q);
        if (!items.length) {
          suggestEl.innerHTML = '<div class="ac-dropdown"><div class="ac-empty">Không tìm thấy gợi ý. Bạn có thể chuyển sang tab "Sau sáp nhập" để chọn thủ công.</div></div>';
          return;
        }
        suggestEl.innerHTML = '<div class="ac-dropdown">' +
          '<div class="ac-loading">✨ Gợi ý địa chỉ mới (click để áp dụng):</div>' +
          items.map((it, i) => \`
            <div class="ac-item" data-i="\${i}">
              <div><b>\${esc(it.ward)}</b></div>
              <div class="sub">tỉnh \${esc(it.province)}</div>
            </div>\`).join('') + '</div>';
        suggestEl.querySelectorAll('.ac-item').forEach((el) => {
          el.addEventListener('click', () => {
            const i = parseInt(el.dataset.i, 10);
            const it = items[i];
            t.diaChiMoi = {
              chiTiet: '',
              wardName: it.ward,
              provinceCode: it.provinceCode,
              provinceName: it.province,
              full: it.ward + ', tỉnh ' + it.province.replace(/^t[ìi]nh\\s*/i, ''),
            };
            bannerText.textContent = t.diaChiMoi.full;
            banner.classList.remove('hidden');
            suggestEl.innerHTML = '';
            saveDraft();
            toast('Đã chọn địa chỉ mới sau sáp nhập', 'success');
          });
        });
      } catch (e) {
        suggestEl.innerHTML = '<div class="ac-dropdown"><div class="ac-empty">Lỗi tìm kiếm: ' + esc(e.message) + '</div></div>';
      }
    }, 350);
  });

  bannerClear?.addEventListener('click', () => {
    t.diaChiMoi = emptyAddress();
    banner.classList.add('hidden');
    saveDraft();
  });

  // Click outside to close suggest dropdown
  document.addEventListener('click', (e) => {
    if (!suggestEl.contains(e.target) && e.target !== gcnInput) {
      suggestEl.innerHTML = '';
    }
  });
}

function updateGiaTriChu() {
  const el = document.getElementById('gia-tri-chu');
  if (!el) return;
  const n = Number(form.thuaDat.giaTri || 0);
  if (!n) { el.textContent = ''; return; }
  el.innerHTML = '💰 Bằng chữ: <b>' + esc(numberToVN(n)) + '</b>';
}

function updateDienTichChu() {
  const el = document.getElementById('dt-chu');
  if (!el) return;
  const v = String(form.thuaDat.dienTich || '').replace(',', '.');
  const n = Number(v);
  if (!n) { el.textContent = ''; return; }
  const chu = areaToVN(v);
  el.innerHTML = '📏 Bằng chữ: <b>' + esc(chu) + '</b>';
  // Auto-fill dienTichBangChu if user hasn't manually edited
  const dtChuEl = document.querySelector('[data-bind="thuaDat.dienTichBangChu"]');
  if (dtChuEl && !form.thuaDat.dienTichBangChu) {
    dtChuEl.value = chu;
    form.thuaDat.dienTichBangChu = chu;
  }
}

function renderPreviewSummary() {
  const f = form;
  const tvA = f.benA.thanhVien.filter(t => t.hoTen);
  const tvB = f.benB.thanhVien.filter(t => t.hoTen);
  const addr = (p) => p.diaChi?.full || '(chưa nhập)';
  const thuaAddr = f.thuaDat.diaChiMode === 'moi'
    ? (f.thuaDat.diaChiMoi?.full || '(chưa chọn địa chỉ mới)')
    : (f.thuaDat.diaChiGcnText + (f.thuaDat.diaChiMoi?.full ? ' (nay là: ' + f.thuaDat.diaChiMoi.full + ')' : ''));

  document.getElementById('preview-summary').innerHTML = \`
    <h3 class="font-bold mb-2 text-base">HỢP ĐỒNG TẶNG CHO QUYỀN SỬ DỤNG ĐẤT</h3>
    <p class="mb-3"><b>Ngày ký:</b> \${esc(f.thongTinChung.ngayKy || '...')} tại \${esc(f.thongTinChung.noiKy || '...')}</p>

    <div class="mb-3">
      <div class="font-semibold">Bên A (Bên tặng): \${1 + tvA.length} người</div>
      <div>• \${esc(f.benA.chuHo.danhXung)} \${esc(f.benA.chuHo.hoTen)} - \${esc(loaiGiayToLabel(f.benA.chuHo.loaiGiayTo))} \${esc(f.benA.chuHo.cccd)}</div>
      <div class="text-xs text-slate-500 ml-3">Địa chỉ: \${esc(addr(f.benA.chuHo))}</div>
      \${tvA.map(t => '<div>• ' + esc(t.danhXung) + ' ' + esc(t.hoTen) + ' - ' + esc(loaiGiayToLabel(t.loaiGiayTo)) + ' ' + esc(t.cccd) + '</div>').join('')}
    </div>

    <div class="mb-3">
      <div class="font-semibold">Bên B (Bên nhận): \${1 + tvB.length} người</div>
      <div>• \${esc(f.benB.chuHo.danhXung)} \${esc(f.benB.chuHo.hoTen)} - \${esc(loaiGiayToLabel(f.benB.chuHo.loaiGiayTo))} \${esc(f.benB.chuHo.cccd)}</div>
      <div class="text-xs text-slate-500 ml-3">Địa chỉ: \${esc(addr(f.benB.chuHo))}</div>
      \${tvB.map(t => '<div>• ' + esc(t.danhXung) + ' ' + esc(t.hoTen) + ' - ' + esc(loaiGiayToLabel(t.loaiGiayTo)) + ' ' + esc(t.cccd) + '</div>').join('')}
    </div>

    <div class="mb-3">
      <div class="font-semibold">Thửa đất:</div>
      <div>• GCN: \${esc(f.thuaDat.soGCN)} / Số vào sổ: \${esc(f.thuaDat.soVaoSoCapGCN)}</div>
      <div>• Thửa số \${esc(f.thuaDat.thuaDatSo)}, tờ bản đồ \${esc(f.thuaDat.toBanDoSo)}</div>
      <div>• Địa chỉ: \${esc(thuaAddr)}</div>
      <div>• Diện tích: <b>\${esc(f.thuaDat.dienTich)} m²</b> (\${esc(f.thuaDat.dienTichBangChu || areaToVN(f.thuaDat.dienTich))})</div>
      <div>• Mục đích: \${esc(f.thuaDat.mucDichSuDung)} (\${esc(f.thuaDat.maLoaiDat)})</div>
    </div>

    <div class="mb-3">
      <div class="font-semibold">Giá trị & thuế:</div>
      <div>• Giá trị: \${Number(f.thuaDat.giaTri || 0).toLocaleString('vi-VN')} VNĐ</div>
      <div>• Thuế TNCN (ước 2%): \${Math.round((f.thuaDat.giaTri || 0) * 0.02).toLocaleString('vi-VN')} VNĐ</div>
      <div>• Lệ phí trước bạ (0.5%): \${Math.round((f.thuaDat.giaTri || 0) * 0.005).toLocaleString('vi-VN')} VNĐ</div>
      <div>• Bên chịu thuế: \${f.dieuKhoan.benChiuThue === 'A' ? 'Bên A' : f.dieuKhoan.benChiuThue === 'B' ? 'Bên B' : 'Hai bên chia đôi'}</div>
    </div>
  \`;
}

// ============ Validation ============
function isAddressValid(addr) {
  return !!(addr && addr.provinceCode && addr.wardName);
}

function validateStep(step) {
  const errs = [];
  function checkPerson(p, label) {
    if (!p.hoTen?.trim()) errs.push(label + ': họ tên');
    if (!p.cccd || !/^[0-9]{9}$|^[0-9]{12}$/.test(String(p.cccd).replace(/\\s/g, ''))) errs.push(label + ': số giấy tờ (9 hoặc 12 chữ số)');
    if (!p.ngayCapCCCDISO) errs.push(label + ': ngày cấp giấy tờ');
    if (!p.noiCapCCCD?.trim()) errs.push(label + ': nơi cấp');
    if (!isAddressValid(p.diaChi)) errs.push(label + ': địa chỉ (chọn Tỉnh & Xã)');
  }
  if (step === 1 || step === 2) {
    const side = step === 1 ? 'benA' : 'benB';
    const label = step === 1 ? 'Bên A chủ hộ' : 'Bên B chủ hộ';
    checkPerson(form[side].chuHo, label);
    form[side].thanhVien.forEach((tv, i) => {
      if (tv.hoTen || tv.cccd) checkPerson(tv, (step === 1 ? 'Bên A TV' : 'Bên B TV') + (i + 1));
    });
  }
  if (step === 3) {
    const t = form.thuaDat;
    if (!t.soGCN?.trim()) errs.push('Số GCN');
    if (!t.soVaoSoCapGCN?.trim()) errs.push('Số vào sổ cấp GCN');
    if (!t.coQuanCapGCN?.trim()) errs.push('Cơ quan cấp GCN');
    if (!t.ngayCapGCNISO) errs.push('Ngày cấp GCN');
    if (!t.thuaDatSo?.toString().trim()) errs.push('Thửa đất số');
    if (!t.toBanDoSo?.toString().trim()) errs.push('Tờ bản đồ số');
    // Địa chỉ: phải có ít nhất 1 trong 2 modes
    if (t.diaChiMode === 'gcn' && !t.diaChiGcnText?.trim()) errs.push('Địa chỉ thửa đất (theo GCN)');
    if (t.diaChiMode === 'moi' && !isAddressValid(t.diaChiMoi)) errs.push('Địa chỉ thửa đất (sau sáp nhập)');
    if (!t.dienTich) errs.push('Diện tích');
    if (!t.mucDichSuDung?.trim()) errs.push('Mục đích sử dụng');
    if (!t.thoiHanSuDung?.trim()) errs.push('Thời hạn sử dụng');
    if (!t.nguonGocSuDung?.trim()) errs.push('Nguồn gốc sử dụng');
  }
  if (step === 4) {
    if (!form.thongTinChung.ngayKyISO) errs.push('Ngày ký');
    if (!form.thongTinChung.noiKyCode) errs.push('Nơi ký');
    if (!form.dieuKhoan.benChiuThue) errs.push('Bên chịu thuế');
  }
  return errs;
}

// ============ Navigation ============
document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentStep > 1) { currentStep--; renderStep(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});

document.getElementById('btn-next').addEventListener('click', async () => {
  const errs = validateStep(currentStep);
  if (errs.length) {
    toast('Thiếu: ' + errs.slice(0, 3).join('; ') + (errs.length > 3 ? '...' : ''), 'warn');
    return;
  }
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    await submitContract();
  }
});

async function submitContract() {
  const btn = document.getElementById('btn-next');
  try {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 inline animate-spin"></i> Đang tạo file...';
    if (window.lucide) window.lucide.createIcons();

    // Bổ sung diện tích bằng chữ nếu chưa nhập
    if (!form.thuaDat.dienTichBangChu && form.thuaDat.dienTich) {
      form.thuaDat.dienTichBangChu = areaToVN(form.thuaDat.dienTich);
    }
    // Build địa chỉ string cho từng người (cho backend tương thích)
    function flattenAddr(p) {
      if (p.diaChi && typeof p.diaChi === 'object') p.diaChi = p.diaChi.full || '';
    }
    const submitForm = JSON.parse(JSON.stringify(form));
    flattenAddr(submitForm.benA.chuHo);
    flattenAddr(submitForm.benB.chuHo);
    submitForm.benA.thanhVien.forEach(flattenAddr);
    submitForm.benB.thanhVien.forEach(flattenAddr);
    // Build địa chỉ thửa đất
    const t = submitForm.thuaDat;
    if (t.diaChiMode === 'moi') {
      t.diaChi = t.diaChiMoi?.full || '';
      t.diaChiMoi = t.diaChiMoi?.full || '';
    } else {
      t.diaChi = t.diaChiGcnText || '';
      t.diaChiMoi = t.diaChiMoi?.full || '';
    }

    const created = await api('/api/contracts', {
      method: 'POST',
      body: JSON.stringify({ form_data: submitForm, draft: true }),
    });
    const id = created.contract.id;

    const rendered = await api('/api/contracts/' + id + '/render', { method: 'POST' });
    const box = document.getElementById('render-result');
    box.classList.remove('hidden');
    box.innerHTML = \`
      <div class="font-semibold text-green-800 mb-2">
        <i data-lucide="check-circle-2" class="w-5 h-5 inline"></i>
        Đã tạo hồ sơ số <span class="font-mono">\${esc(rendered.contract.contract_number)}</span>
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <a href="\${rendered.download.docx}" target="_blank" class="btn-primary inline-flex items-center gap-1">
          <i data-lucide="file-text" class="w-4 h-4"></i> Tải file Word (.docx)
        </a>
        <a href="\${rendered.download.pdf}" target="_blank" class="btn-secondary inline-flex items-center gap-1">
          <i data-lucide="file-text" class="w-4 h-4"></i> \${rendered.pdfMethod === 'html_fallback' ? 'Xem HTML (in → PDF)' : 'Tải PDF'}
        </a>
        <a href="/bang-dieu-khien" class="text-primary-500 underline self-center">Về danh sách</a>
      </div>
    \`;
    if (window.lucide) window.lucide.createIcons();
    localStorage.removeItem(DRAFT_KEY);
    toast('Tạo hồ sơ thành công!', 'success');
  } catch (e) {
    toast('Lỗi: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="file-down" class="w-4 h-4 inline"></i> Xuất Toàn Bộ Văn Bản';
    if (window.lucide) window.lucide.createIcons();
  }
}

// ============ Helpers ============
function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function nextYearISO() { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); }
function isoToVN(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + '/' + m + '/' + y; }

function numberToVN(n) {
  if (!n) return 'Không đồng';
  const DIGITS = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  const SCALE = ['','nghìn','triệu','tỷ'];
  const readTriple = (num, full) => {
    const tram = Math.floor(num/100), chuc = Math.floor((num%100)/10), donVi = num%10;
    let parts = [];
    if (tram > 0 || full) parts.push(DIGITS[tram] + ' trăm');
    if (chuc === 0) { if (donVi > 0) { if (tram > 0 || full) parts.push('lẻ'); parts.push(DIGITS[donVi]); } }
    else if (chuc === 1) { parts.push('mười'); if (donVi === 5) parts.push('lăm'); else if (donVi > 0) parts.push(DIGITS[donVi]); }
    else { parts.push(DIGITS[chuc] + ' mươi'); if (donVi === 1) parts.push('mốt'); else if (donVi === 5) parts.push('lăm'); else if (donVi > 0) parts.push(DIGITS[donVi]); }
    return parts.join(' ');
  };
  let num = Math.floor(n), groups = [];
  while (num > 0) { groups.unshift(num % 1000); num = Math.floor(num/1000); }
  let result = '';
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i], sc = groups.length - 1 - i;
    if (g > 0) { const isFirst = result === ''; result += (result ? ' ' : '') + readTriple(g, !isFirst) + (SCALE[sc] ? ' ' + SCALE[sc] : ''); }
  }
  result = result.replace(/\\s+/g, ' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
}

function areaToVN(v) {
  const s = String(v).replace(',', '.');
  const num = Number(s);
  if (isNaN(num)) return '';
  const intPart = Math.floor(num);
  const decStr = s.includes('.') ? s.split('.')[1].replace(/0+$/, '') : '';
  const DIGITS = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  let r = numberToVN(intPart).replace(' đồng chẵn', '').toLowerCase();
  if (decStr) r += ' phẩy ' + decStr.split('').map(d => DIGITS[parseInt(d, 10)]).join(' ');
  return r + ' mét vuông';
}

renderStep();
`;
}
