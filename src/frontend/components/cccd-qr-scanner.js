// CCCD QR Scanner Modal
// - Tạo modal lazy (chỉ inject DOM lần đầu open)
// - 2 tab: Camera | Tải ảnh
// - Sau khi đọc được QR → preview thông tin, 3 nút: Áp dụng | Quét lại | Hủy
// - Bảo mật: KHÔNG upload ảnh lên server, parse hoàn toàn ở client
//
// API:
//   window.cccdQr.open(party, onApply)
//     party: 'benA' | 'benB' (chỉ dùng để hiển thị tiêu đề + truyền cho callback)
//     onApply: function(parsedData, party) — caller tự fill form
//
// Phụ thuộc:
//   window.parseCccdQr, window.decodeQrFromImage, window.decodeQrFromVideo
//   (được nạp từ parse-cccd-qr.js + qr-image-decoder.js cùng page)

export function cccdQrScannerJs() {
  return `
(function() {
  let modalEl = null;
  let videoStream = null;
  let videoEl = null;
  let scanRAF = null;
  let currentParty = null;
  let currentOnApply = null;
  let parsedData = null;
  let lastScanError = '';
  let isScanning = false;

  function buildModal() {
    if (modalEl) return modalEl;
    const wrapper = document.createElement('div');
    wrapper.id = 'cccd-qr-modal';
    wrapper.className = 'fixed inset-0 z-[100] hidden';
    wrapper.innerHTML = \`
      <div class="absolute inset-0 bg-black/60" data-qr-backdrop></div>
      <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
            <h3 class="font-semibold flex items-center gap-2">
              <i data-lucide="scan-line" class="w-5 h-5 text-primary-500"></i>
              <span data-qr-title>Quét QR CCCD</span>
            </h3>
            <button data-qr-close class="text-slate-400 hover:text-slate-700">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="px-5 pt-4" data-qr-scan-view>
            <div class="flex border-b border-slate-200 -mx-5 px-5 text-sm">
              <button data-qr-tab="camera" class="px-3 py-2 border-b-2 border-primary-500 text-primary-500 font-medium">
                <i data-lucide="camera" class="w-4 h-4 inline"></i> Camera
              </button>
              <button data-qr-tab="upload" class="px-3 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700">
                <i data-lucide="upload" class="w-4 h-4 inline"></i> Tải ảnh
              </button>
            </div>

            <!-- Camera panel -->
            <div data-qr-panel="camera" class="mt-3">
              <div class="bg-slate-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
                <video data-qr-video class="w-full h-full object-cover hidden" autoplay playsinline muted></video>
                <div data-qr-camera-placeholder class="text-slate-400 text-sm text-center px-4">
                  <i data-lucide="camera-off" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
                  Bấm "Bật camera" để bắt đầu quét
                </div>
                <div data-qr-camera-overlay class="absolute inset-0 pointer-events-none hidden">
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-emerald-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-3">
                <button data-qr-camera-start class="btn-primary text-sm">
                  <i data-lucide="play" class="w-4 h-4 inline"></i> Bật camera
                </button>
                <button data-qr-camera-stop class="btn-secondary text-sm hidden">
                  <i data-lucide="square" class="w-4 h-4 inline"></i> Tắt
                </button>
                <span data-qr-camera-status class="text-xs text-slate-500"></span>
              </div>
            </div>

            <!-- Upload panel -->
            <div data-qr-panel="upload" class="mt-3 hidden">
              <label class="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 hover:bg-blue-50/50 transition">
                <input type="file" accept="image/*" data-qr-file class="hidden" />
                <i data-lucide="image-up" class="w-10 h-10 mx-auto text-slate-400 mb-2"></i>
                <div class="text-sm font-medium text-slate-700">Chọn ảnh mặt sau CCCD</div>
                <div class="text-xs text-slate-500 mt-1">JPG, PNG. Tối đa 10MB.</div>
              </label>
              <div data-qr-upload-preview class="mt-3 hidden">
                <img data-qr-upload-img class="w-full max-h-64 object-contain border border-slate-200 rounded-lg bg-slate-50" />
              </div>
            </div>

            <!-- Status / error -->
            <div data-qr-status class="mt-3 text-sm text-center text-slate-600 min-h-[24px]"></div>
          </div>

          <!-- Preview view (sau khi parse thành công) -->
          <div class="px-5 pt-4 hidden" data-qr-preview-view>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-3 text-primary-500 font-semibold">
                <i data-lucide="id-card" class="w-5 h-5"></i>
                <span>Thông tin từ QR CCCD</span>
              </div>
              <dl class="space-y-2 text-sm" data-qr-preview-list></dl>
            </div>
            <div class="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
              <span>Thông tin này được lấy từ mã QR in trên CCCD/Căn cước. Hệ thống chỉ dùng để hỗ trợ tự điền biểu mẫu, không xác thực tính chính chủ của giấy tờ.</span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 mt-4">
            <button data-qr-cancel class="btn-secondary text-sm">Hủy</button>
            <button data-qr-rescan class="btn-secondary text-sm hidden">
              <i data-lucide="rotate-cw" class="w-4 h-4 inline"></i> Quét lại
            </button>
            <button data-qr-apply class="btn-primary text-sm hidden">
              <i data-lucide="check" class="w-4 h-4 inline"></i> Áp dụng vào form
            </button>
          </div>
        </div>
      </div>
    \`;
    document.body.appendChild(wrapper);
    modalEl = wrapper;
    wireEvents();
    if (window.lucide) window.lucide.createIcons();
    return wrapper;
  }

  function wireEvents() {
    const m = modalEl;
    m.querySelector('[data-qr-close]').addEventListener('click', close);
    m.querySelector('[data-qr-backdrop]').addEventListener('click', close);
    m.querySelector('[data-qr-cancel]').addEventListener('click', close);
    m.querySelector('[data-qr-rescan]').addEventListener('click', rescan);
    m.querySelector('[data-qr-apply]').addEventListener('click', applyResult);
    m.querySelectorAll('[data-qr-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.qrTab));
    });
    m.querySelector('[data-qr-camera-start]').addEventListener('click', startCamera);
    m.querySelector('[data-qr-camera-stop]').addEventListener('click', stopCamera);
    m.querySelector('[data-qr-file]').addEventListener('change', handleFileSelect);
  }

  function switchTab(tab) {
    const m = modalEl;
    m.querySelectorAll('[data-qr-tab]').forEach(b => {
      const active = b.dataset.qrTab === tab;
      b.classList.toggle('border-primary-500', active);
      b.classList.toggle('text-primary-500', active);
      b.classList.toggle('border-transparent', !active);
      b.classList.toggle('text-slate-500', !active);
    });
    m.querySelectorAll('[data-qr-panel]').forEach(p => {
      p.classList.toggle('hidden', p.dataset.qrPanel !== tab);
    });
    if (tab !== 'camera') stopCamera();
    setStatus('', '');
  }

  function setStatus(msg, type) {
    const el = modalEl.querySelector('[data-qr-status]');
    el.textContent = msg || '';
    el.className = 'mt-3 text-sm text-center min-h-[24px] ' +
      (type === 'error' ? 'text-red-600' :
       type === 'success' ? 'text-emerald-600' :
       type === 'info' ? 'text-slate-600' : 'text-slate-600');
  }

  async function startCamera() {
    setStatus('Đang khởi động camera...', 'info');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      videoStream = stream;
      videoEl = modalEl.querySelector('[data-qr-video]');
      videoEl.srcObject = stream;
      videoEl.classList.remove('hidden');
      modalEl.querySelector('[data-qr-camera-placeholder]').classList.add('hidden');
      modalEl.querySelector('[data-qr-camera-overlay]').classList.remove('hidden');
      modalEl.querySelector('[data-qr-camera-start]').classList.add('hidden');
      modalEl.querySelector('[data-qr-camera-stop]').classList.remove('hidden');
      modalEl.querySelector('[data-qr-camera-status]').textContent = 'Đang quét...';
      setStatus('Hướng camera vào mã QR mặt sau CCCD', 'info');
      scanLoop();
    } catch (e) {
      setStatus('Không truy cập được camera: ' + (e?.message || e), 'error');
    }
  }

  function stopCamera() {
    if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    if (videoEl) { videoEl.srcObject = null; videoEl.classList.add('hidden'); }
    if (!modalEl) return;
    modalEl.querySelector('[data-qr-camera-placeholder]')?.classList.remove('hidden');
    modalEl.querySelector('[data-qr-camera-overlay]')?.classList.add('hidden');
    modalEl.querySelector('[data-qr-camera-start]')?.classList.remove('hidden');
    modalEl.querySelector('[data-qr-camera-stop]')?.classList.add('hidden');
    const cs = modalEl.querySelector('[data-qr-camera-status]');
    if (cs) cs.textContent = '';
  }

  let _videoScanInflight = false;
  async function scanLoop() {
    if (!videoEl || !videoStream) return;
    if (!_videoScanInflight) {
      _videoScanInflight = true;
      try {
        const r = await window.decodeQrFromVideo(videoEl);
        if (r && r.text) {
          stopCamera();
          handleRawText(r.text, 'camera (' + r.source + ')');
          return;
        }
      } catch {}
      _videoScanInflight = false;
    }
    scanRAF = requestAnimationFrame(scanLoop);
  }

  async function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setStatus('Ảnh quá lớn (>10MB)', 'error');
      return;
    }
    const preview = modalEl.querySelector('[data-qr-upload-preview]');
    const img = modalEl.querySelector('[data-qr-upload-img]');
    img.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
    setStatus('Đang đọc QR từ ảnh... (có thể mất vài giây)', 'info');
    isScanning = true;
    try {
      // Đợi img load để có natural size
      await new Promise(res => {
        if (img.complete) res();
        else img.onload = res;
      });
      const r = await window.decodeQrFromImage(img);
      if (r && r.text) {
        handleRawText(r.text, 'upload (' + r.source + ')');
      } else {
        setStatus('Không đọc được QR. Hãy chụp gần vùng QR hơn, đủ sáng, không lóa, không bị mờ.', 'error');
      }
    } catch (err) {
      setStatus('Lỗi đọc ảnh: ' + (err?.message || err), 'error');
    } finally {
      isScanning = false;
    }
  }

  function handleRawText(raw, source) {
    const data = window.parseCccdQr(raw);
    if (!data) {
      setStatus('QR đọc được nhưng không phải định dạng CCCD/Căn cước Việt Nam.', 'error');
      lastScanError = raw.slice(0, 40);
      return;
    }
    parsedData = data;
    // Log event (chỉ event name, KHÔNG raw)
    try {
      console.info('[CCCD] IDENTITY_QR_SCANNED', { party: currentParty, source });
    } catch {}
    showPreview(data);
  }

  function showPreview(data) {
    const m = modalEl;
    m.querySelector('[data-qr-scan-view]').classList.add('hidden');
    m.querySelector('[data-qr-preview-view]').classList.remove('hidden');
    m.querySelector('[data-qr-rescan]').classList.remove('hidden');
    m.querySelector('[data-qr-apply]').classList.remove('hidden');

    const rows = [
      ['Số CCCD',     data.cccd || ''],
      ['CMND cũ',     data.cmndCu || '(không có)'],
      ['Họ và tên',   data.hoTen || ''],
      ['Giới tính',   data.gioiTinh || ''],
      ['Ngày sinh',   window.isoToDDMMYYYY(data.ngaySinh) || data.ngaySinhRaw || ''],
      ['Nơi thường trú', data.noiThuongTru || ''],
      ['Ngày cấp CCCD',  window.isoToDDMMYYYY(data.ngayCap) || data.ngayCapRaw || ''],
    ];
    const list = m.querySelector('[data-qr-preview-list]');
    list.innerHTML = rows.map(([k, v]) => \`
      <div class="flex">
        <dt class="w-36 flex-shrink-0 text-slate-500">\${escAttr(k)}</dt>
        <dd class="flex-1 font-medium text-slate-800 break-words">\${escAttr(v) || '<span class="text-slate-400">—</span>'}</dd>
      </div>
    \`).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  function escAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function rescan() {
    parsedData = null;
    const m = modalEl;
    m.querySelector('[data-qr-scan-view]').classList.remove('hidden');
    m.querySelector('[data-qr-preview-view]').classList.add('hidden');
    m.querySelector('[data-qr-rescan]').classList.add('hidden');
    m.querySelector('[data-qr-apply]').classList.add('hidden');
    setStatus('', '');
    // Reset file input
    const fileInput = m.querySelector('[data-qr-file]');
    if (fileInput) fileInput.value = '';
    m.querySelector('[data-qr-upload-preview]').classList.add('hidden');
  }

  function applyResult() {
    if (!parsedData || !currentOnApply) {
      close();
      return;
    }
    try {
      currentOnApply(parsedData, currentParty);
      try {
        console.info('[CCCD] IDENTITY_QR_APPLIED_TO_FORM', { party: currentParty });
      } catch {}
      if (window.toast) window.toast('Đã điền thông tin CCCD vào form', 'success');
    } catch (e) {
      if (window.toast) window.toast('Lỗi áp dụng: ' + e.message, 'error');
    }
    close();
  }

  function open(party, onApply, customLabel) {
    currentParty = party || 'benA';
    currentOnApply = onApply || null;
    parsedData = null;
    buildModal();
    modalEl.classList.remove('hidden');
    const partyLabel = customLabel
      || (currentParty === 'benA' ? 'Bên A (người tặng)' : 'Bên B (người nhận)');
    modalEl.querySelector('[data-qr-title]').textContent = 'Quét QR CCCD cho ' + partyLabel;
    // Reset về scan view
    rescan();
    // Default tab = camera
    switchTab('camera');
  }

  function close() {
    stopCamera();
    if (modalEl) modalEl.classList.add('hidden');
    parsedData = null;
    currentOnApply = null;
  }

  window.cccdQr = { open, close };
})();
`;
}
