// Admin: Cấu hình website
// Form đầy đủ: tên/logo/favicon/liên hệ admin/nội dung pending+rejected/modal welcome

export function settingsPageJs() {
  return `
window.adminPageSettings = async function() {
  let s = {};
  try {
    const r = await adminApi('/api/admin/settings');
    s = r.settings || {};
  } catch (e) { adminToast(e.message, 'error'); return; }

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="settings" class="w-6 h-6"></i> Cấu hình website
    </h1>
    <p class="text-sm text-slate-400 mb-5">Các thay đổi áp dụng cho mọi user (favicon, tên site, liên hệ admin, nội dung thông báo, modal chào).</p>

    <form id="settings-form" class="space-y-6 max-w-3xl">

      <fieldset class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <legend class="px-2 text-sm font-semibold text-slate-300">Thương hiệu</legend>
        \${textField('Tên website', 'siteName', s.siteName, 'Chứng Từ Nhà Đất')}
        \${assetField('Logo', 'siteLogoUrl', s.siteLogoUrl, 'logo')}
        \${assetField('Favicon', 'faviconUrl', s.faviconUrl, 'favicon')}
        \${textField('Màu chủ đạo (hex)', 'primaryColor', s.primaryColor, '#1e40af')}
        \${textField('Footer text', 'footerText', s.footerText, 'Hệ thống tạo chứng từ nhà đất')}
      </fieldset>

      <fieldset class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <legend class="px-2 text-sm font-semibold text-slate-300">Hero trang chủ (mặc định)</legend>
        \${textField('Tiêu đề Hero', 'heroTitle', s.heroTitle, 'Tạo hợp đồng nhà đất tự động')}
        \${textareaField('Mô tả Hero', 'heroSubtitle', s.heroSubtitle, 'Điền thông tin nhanh, quét CCCD, xuất file PDF/DOCX', 2)}
        <p class="text-xs text-slate-500">Banner active sẽ ghi đè giá trị này khi user vào trang chủ.</p>
      </fieldset>

      <fieldset class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <legend class="px-2 text-sm font-semibold text-slate-300">Liên hệ quản trị viên</legend>
        \${textField('Số điện thoại', 'adminPhone', s.adminPhone, '0901234567')}
        \${textField('Email hỗ trợ', 'adminEmail', s.adminEmail, 'admin@example.com', 'email')}
        \${textField('Link Zalo', 'adminZaloUrl', s.adminZaloUrl, 'https://zalo.me/0901234567')}
        \${textField('Link Facebook', 'adminFacebookUrl', s.adminFacebookUrl, 'https://facebook.com/...')}
        \${textField('Link Telegram', 'adminTelegramUrl', s.adminTelegramUrl, 'https://t.me/...')}
      </fieldset>

      <fieldset class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <legend class="px-2 text-sm font-semibold text-slate-300">Thông báo cho user</legend>
        \${textareaField('Tiêu đề thông báo chung', 'supportNoticeTitle', s.supportNoticeTitle, '', 2)}
        \${textareaField('Nội dung thông báo chung', 'supportNoticeContent', s.supportNoticeContent, '', 3)}
        \${textareaField('Nội dung cho user chờ duyệt (pending)', 'pendingUserMessage', s.pendingUserMessage, 'Tài khoản đang chờ duyệt...', 3)}
        \${textareaField('Nội dung cho user bị từ chối (rejected)', 'rejectedUserMessage', s.rejectedUserMessage, 'Tài khoản chưa được phê duyệt...', 3)}
      </fieldset>

      <fieldset class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <legend class="px-2 text-sm font-semibold text-slate-300">Modal chào (welcome)</legend>
        <label class="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" id="f-modalEnabled" \${s.modalEnabled ? 'checked' : ''} class="w-4 h-4" />
          <span class="text-sm">Bật modal chào trên trang public</span>
        </label>
        \${textField('Tiêu đề modal', 'modalTitle', s.modalTitle, 'Chào mừng bạn')}
        \${textareaField('Nội dung modal', 'modalContent', s.modalContent, '', 3)}
        \${textField('Text nút modal', 'modalButtonText', s.modalButtonText, 'Tìm hiểu thêm')}
        \${textField('Link nút modal', 'modalButtonUrl', s.modalButtonUrl, 'https://...')}
      </fieldset>

      <div class="flex justify-end gap-2 sticky bottom-0 bg-slate-900/95 backdrop-blur py-3 -mx-4 px-4 border-t border-slate-700">
        <button type="button" onclick="window.adminPageSettings()" class="px-4 py-2 border border-slate-600 hover:bg-slate-700 rounded-md text-sm">
          <i data-lucide="rotate-cw" class="w-4 h-4 inline"></i> Tải lại
        </button>
        <button id="save-btn" type="submit" class="bg-brand-600 hover:bg-brand-700 px-5 py-2 rounded-md text-sm font-medium">
          <i data-lucide="save" class="w-4 h-4 inline"></i> Lưu cấu hình
        </button>
      </div>
    </form>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
};

function textField(label, name, value, placeholder, type) {
  return \`
    <div class="mb-3">
      <label class="block text-sm font-medium text-slate-300 mb-1">\${label}</label>
      <input type="\${type || 'text'}" name="\${name}" id="f-\${name}" value="\${escAttr(value || '')}" placeholder="\${escAttr(placeholder || '')}"
        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
    </div>
  \`;
}

/**
 * Asset field: text URL + file upload + preview.
 * type = 'logo' | 'favicon' để báo backend folder lưu.
 */
function assetField(label, name, value, assetType) {
  const accept = assetType === 'favicon'
    ? '.png,.jpg,.jpeg,.svg,.ico,.webp,image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp'
    : '.png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp';
  const note = assetType === 'favicon' ? 'PNG/SVG/ICO • ≤200KB khuyến nghị' : 'PNG/JPG/SVG • ≤2MB';
  return \`
    <div class="mb-4">
      <label class="block text-sm font-medium text-slate-300 mb-1">\${label}</label>
      <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
        <div class="flex-1">
          <input type="text" name="\${name}" id="f-\${name}" value="\${escAttr(value || '')}" placeholder="URL hoặc upload bên cạnh"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          <div class="text-xs text-slate-500 mt-1">\${note}</div>
        </div>
        <div class="flex flex-col items-center">
          <label class="cursor-pointer bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm whitespace-nowrap inline-flex items-center gap-1" for="upload-\${name}">
            <i data-lucide="upload" class="w-4 h-4"></i>
            <span id="upload-label-\${name}">Tải lên</span>
          </label>
          <input type="file" id="upload-\${name}" accept="\${accept}" class="hidden"
            onchange="handleAssetUpload(event, '\${name}', '\${assetType}')" />
        </div>
        <div class="flex items-center justify-center w-16 h-16 bg-slate-900 border border-slate-700 rounded-md overflow-hidden flex-shrink-0">
          <img id="preview-\${name}" src="\${escAttr(value || '')}" alt="\${label}" class="max-w-full max-h-full object-contain \${value ? '' : 'hidden'}" />
          <i id="preview-empty-\${name}" data-lucide="image" class="w-6 h-6 text-slate-600 \${value ? 'hidden' : ''}"></i>
        </div>
      </div>
    </div>
  \`;
}

window.handleAssetUpload = async function(event, fieldName, assetType) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const labelEl = document.getElementById('upload-label-' + fieldName);
  const urlInput = document.getElementById('f-' + fieldName);
  const imgEl = document.getElementById('preview-' + fieldName);
  const emptyEl = document.getElementById('preview-empty-' + fieldName);
  const originalLabel = labelEl.textContent;

  // Validate client-side
  const MAX = 2 * 1024 * 1024;
  if (file.size > MAX) {
    adminToast('File quá lớn (>2MB)', 'error');
    event.target.value = '';
    return;
  }
  if (!file.type.startsWith('image/')) {
    adminToast('Chỉ chấp nhận file ảnh', 'error');
    event.target.value = '';
    return;
  }

  labelEl.textContent = 'Đang tải...';
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', assetType);
    // KHÔNG dùng adminApi vì cần FormData (no Content-Type)
    const url = (window.adminApiBase || '') + window.adminTranslatePath('/api/admin/settings/upload-asset?type=' + assetType);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminState.token },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || ('HTTP ' + res.status));

    urlInput.value = data.url;
    imgEl.src = data.url;
    imgEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    adminToast('Đã upload. Nhớ bấm "Lưu cấu hình" để áp dụng.', 'success');
  } catch (e) {
    adminToast('Upload thất bại: ' + e.message, 'error');
  } finally {
    labelEl.textContent = originalLabel;
    event.target.value = '';
  }
};

function textareaField(label, name, value, placeholder, rows) {
  return \`
    <div class="mb-3">
      <label class="block text-sm font-medium text-slate-300 mb-1">\${label}</label>
      <textarea name="\${name}" id="f-\${name}" rows="\${rows || 3}" placeholder="\${escAttr(placeholder || '')}"
        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500">\${escHtml(value || '')}</textarea>
    </div>
  \`;
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  const fields = ['siteName','siteLogoUrl','faviconUrl','primaryColor','footerText','heroTitle','heroSubtitle','adminPhone','adminEmail','adminZaloUrl','adminFacebookUrl','adminTelegramUrl','supportNoticeTitle','supportNoticeContent','pendingUserMessage','rejectedUserMessage','modalTitle','modalContent','modalButtonText','modalButtonUrl'];
  const body = {};
  for (const f of fields) {
    const el = document.getElementById('f-' + f);
    if (el) body[f] = el.value;
  }
  body.modalEnabled = document.getElementById('f-modalEnabled').checked;
  try {
    await adminApi('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(body) });
    adminToast('Đã lưu cấu hình. Mọi user sẽ thấy cập nhật trong vòng 5 phút (hoặc khi clear cache).', 'success');
    // Clear cache phía admin client
    try { localStorage.removeItem('ctnd_public_settings'); } catch {}
  } catch (e) {
    adminToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" class="w-4 h-4 inline"></i> Lưu cấu hình';
    if (window.lucide) window.lucide.createIcons();
  }
}

function escHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s); }
`;
}
