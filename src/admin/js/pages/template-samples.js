// Admin: quản lý mẫu hợp đồng hiển thị trên trang chủ
// Khác với contract_templates (file DOCX gốc) — đây chỉ là card hiển thị có thể trỏ tới template_id thật.

export function templateSamplesPageJs() {
  return `
window.adminPageTemplateSamples = async function() {
  document.getElementById('page-content').innerHTML = \`
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <i data-lucide="layout-grid" class="w-6 h-6"></i> Mẫu hiển thị trang chủ
      </h1>
      <button onclick="sampleOpenForm(null)" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2">
        <i data-lucide="plus" class="w-4 h-4"></i> Thêm mẫu
      </button>
    </div>
    <p class="text-sm text-slate-400 mb-4">Đây là card hiển thị trên trang chủ. Có thể liên kết tới mẫu hợp đồng thật (Template ID) hoặc chỉ là demo.</p>
    <div id="samples-list"></div>
  \`;
  if (window.lucide) window.lucide.createIcons();
  await sampleReload();
};

async function sampleReload() {
  const list = document.getElementById('samples-list');
  list.innerHTML = '<div class="text-center text-slate-500 py-8"><i data-lucide="loader" class="w-5 h-5 animate-spin inline-block"></i> Đang tải...</div>';
  if (window.lucide) window.lucide.createIcons();
  try {
    const data = await adminApi('/api/admin/template-samples');
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '<div class="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-12 text-center text-slate-400">Chưa có mẫu nào.</div>';
      return;
    }
    list.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">' +
      items.map(sampleCard).join('') + '</div>';
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    list.innerHTML = '<div class="text-red-400 py-8 text-center">Lỗi: ' + escHtml(e.message) + '</div>';
  }
}

function sampleCard(s) {
  const img = s.previewImageUrl
    ? '<img src="' + escHtml(s.previewImageUrl) + '" alt="" class="w-full h-36 object-cover" />'
    : '<div class="w-full h-36 bg-slate-700/40 flex items-center justify-center text-slate-500"><i data-lucide="file-text" class="w-10 h-10"></i></div>';
  return \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
      \${img}
      <div class="p-4">
        <div class="flex items-start justify-between gap-2 mb-1">
          <h3 class="font-semibold text-sm flex-1">\${escHtml(s.name)}</h3>
          \${s.isActive
            ? '<span class="bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded text-xs flex-shrink-0">Bật</span>'
            : '<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs flex-shrink-0">Tắt</span>'}
        </div>
        \${s.category ? '<span class="inline-block text-xs text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded mb-2">' + escHtml(s.category) + '</span>' : ''}
        \${s.description ? '<p class="text-xs text-slate-400 line-clamp-2 mb-2">' + escHtml(s.description) + '</p>' : ''}
        <div class="text-xs text-slate-500 mb-3">
          Template ID: <span class="text-slate-300">\${s.templateId || '—'}</span>
          • Thứ tự: <span class="text-slate-300">\${s.sortOrder}</span>
        </div>
        <div class="flex gap-1 flex-wrap">
          <button onclick="sampleOpenForm(\${s.id})" class="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded">Sửa</button>
          <button onclick="sampleToggle(\${s.id}, \${!s.isActive})" class="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded">\${s.isActive ? 'Tắt' : 'Bật'}</button>
          <button onclick="sampleDelete(\${s.id})" class="text-xs px-2.5 py-1 bg-red-900/50 text-red-300 hover:bg-red-900 rounded">Xóa</button>
        </div>
      </div>
    </div>\`;
}

window.sampleOpenForm = async function(id) {
  let item = { name: '', description: '', previewImageUrl: '', category: '', templateId: null, sortOrder: 0, isActive: true };
  if (id) {
    try { const r = await adminApi('/api/admin/template-samples/' + id); item = r.item; }
    catch (e) { adminToast(e.message, 'error'); return; }
  }
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto';
  overlay.innerHTML = \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg my-auto">
      <div class="p-5 border-b border-slate-700">
        <h3 class="font-semibold text-lg">\${id ? 'Sửa mẫu' : 'Thêm mẫu mới'}</h3>
      </div>
      <form id="sample-form" class="p-5 space-y-3">
        <div>
          <label class="text-xs text-slate-400 block mb-1">Tên mẫu <span class="text-red-400">*</span></label>
          <input name="name" required maxlength="200" value="\${escAttr(item.name)}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1">Mô tả</label>
          <textarea name="description" maxlength="2000" rows="3" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500">\${escHtml(item.description || '')}</textarea>
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1">Ảnh preview (URL)</label>
          <input name="previewImageUrl" type="url" value="\${escAttr(item.previewImageUrl || '')}" placeholder="https://..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Phân loại</label>
            <input name="category" maxlength="80" value="\${escAttr(item.category || '')}" placeholder="vd: Tặng QSDĐ" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Template ID (liên kết)</label>
            <input name="templateId" type="number" min="1" value="\${item.templateId || ''}" placeholder="bỏ trống nếu chỉ demo" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Thứ tự</label>
            <input name="sortOrder" type="number" value="\${Number(item.sortOrder) || 0}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div class="flex items-end">
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isActive" \${item.isActive ? 'checked' : ''} class="w-4 h-4 accent-brand-500" />
              <span class="text-sm">Bật hiển thị</span>
            </label>
          </div>
        </div>
      </form>
      <div class="p-5 border-t border-slate-700 flex justify-end gap-2">
        <button data-cancel class="px-4 py-2 border border-slate-600 hover:bg-slate-700 rounded-md text-sm">Hủy</button>
        <button data-save class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium">Lưu</button>
      </div>
    </div>\`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('[data-cancel]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('[data-save]').addEventListener('click', async () => {
    const form = overlay.querySelector('#sample-form');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const tplIdRaw = fd.get('templateId');
    const body = {
      name: fd.get('name'),
      description: fd.get('description'),
      previewImageUrl: fd.get('previewImageUrl') || null,
      category: fd.get('category'),
      templateId: tplIdRaw ? Number(tplIdRaw) : null,
      sortOrder: Number(fd.get('sortOrder')) || 0,
      isActive: fd.get('isActive') === 'on',
    };
    try {
      if (id) await adminApi('/api/admin/template-samples/' + id, { method: 'PATCH', body: JSON.stringify(body) });
      else await adminApi('/api/admin/template-samples', { method: 'POST', body: JSON.stringify(body) });
      adminToast(id ? 'Đã cập nhật' : 'Đã thêm', 'success');
      overlay.remove();
      sampleReload();
    } catch (e) { adminToast(e.message, 'error'); }
  });
};

window.sampleToggle = async function(id, isActive) {
  try {
    await adminApi('/api/admin/template-samples/' + id, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    sampleReload();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.sampleDelete = async function(id) {
  if (!confirm('Xóa mẫu này?')) return;
  try {
    await adminApi('/api/admin/template-samples/' + id, { method: 'DELETE' });
    adminToast('Đã xóa', 'success');
    sampleReload();
  } catch (e) { adminToast(e.message, 'error'); }
};

function escHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s); }
`;
}
