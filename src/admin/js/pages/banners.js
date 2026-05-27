// Admin: quản lý banner trang chủ
// CRUD + sort_order + toggle active

export function bannersPageJs() {
  return `
window.adminPageBanners = async function() {
  document.getElementById('page-content').innerHTML = \`
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <i data-lucide="image" class="w-6 h-6"></i> Banner trang chủ
      </h1>
      <button onclick="bannerOpenForm(null)" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2">
        <i data-lucide="plus" class="w-4 h-4"></i> Thêm banner
      </button>
    </div>
    <p class="text-sm text-slate-400 mb-4">Banner hiển thị trong khu vực Hero của trang chủ. Có thể bật/tắt từng banner và sắp xếp thứ tự.</p>
    <div id="banners-list"></div>
  \`;
  if (window.lucide) window.lucide.createIcons();

  await bannerReload();
};

async function bannerReload() {
  const list = document.getElementById('banners-list');
  list.innerHTML = '<div class="text-center text-slate-500 py-8"><i data-lucide="loader" class="w-5 h-5 animate-spin inline-block"></i> Đang tải...</div>';
  if (window.lucide) window.lucide.createIcons();
  try {
    const data = await adminApi('/api/admin/banners');
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '<div class="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-12 text-center text-slate-400">Chưa có banner nào. Bấm "Thêm banner" để bắt đầu.</div>';
      return;
    }
    list.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">' +
      items.map(bannerCard).join('') + '</div>';
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    list.innerHTML = '<div class="text-red-400 py-8 text-center">Lỗi: ' + escHtml(e.message) + '</div>';
  }
}

function bannerCard(b) {
  const img = b.imageUrl
    ? '<img src="' + escHtml(b.imageUrl) + '" alt="" class="w-full h-32 object-cover" />'
    : '<div class="w-full h-32 bg-slate-700/40 flex items-center justify-center text-slate-500"><i data-lucide="image-off" class="w-8 h-8"></i></div>';
  return \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
      \${img}
      <div class="p-4">
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="font-semibold text-sm flex-1">\${escHtml(b.title)}</h3>
          \${b.isActive
            ? '<span class="bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded text-xs flex-shrink-0">Bật</span>'
            : '<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs flex-shrink-0">Tắt</span>'}
        </div>
        \${b.subtitle ? '<p class="text-xs text-slate-400 mb-2 line-clamp-2">' + escHtml(b.subtitle) + '</p>' : ''}
        <div class="text-xs text-slate-500 mb-3">Thứ tự: <span class="text-slate-300 font-medium">\${b.sortOrder}</span></div>
        <div class="flex gap-1 flex-wrap">
          <button onclick="bannerOpenForm(\${b.id})" class="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded">Sửa</button>
          <button onclick="bannerToggle(\${b.id}, \${!b.isActive})" class="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded">\${b.isActive ? 'Tắt' : 'Bật'}</button>
          <button onclick="bannerDelete(\${b.id})" class="text-xs px-2.5 py-1 bg-red-900/50 text-red-300 hover:bg-red-900 rounded">Xóa</button>
        </div>
      </div>
    </div>\`;
}

window.bannerOpenForm = async function(id) {
  let item = { title: '', subtitle: '', imageUrl: '', buttonText: '', buttonUrl: '', sortOrder: 0, isActive: true };
  if (id) {
    try { const r = await adminApi('/api/admin/banners/' + id); item = r.item; }
    catch (e) { adminToast(e.message, 'error'); return; }
  }
  bannerShowModal(item, id);
};

function bannerShowModal(item, id) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto';
  overlay.innerHTML = \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg my-auto">
      <div class="p-5 border-b border-slate-700">
        <h3 class="font-semibold text-lg">\${id ? 'Sửa banner' : 'Thêm banner mới'}</h3>
      </div>
      <form id="banner-form" class="p-5 space-y-3">
        <div>
          <label class="text-xs text-slate-400 block mb-1">Tiêu đề <span class="text-red-400">*</span></label>
          <input name="title" required maxlength="200" value="\${escAttr(item.title)}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1">Mô tả phụ</label>
          <textarea name="subtitle" maxlength="500" rows="2" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500">\${escHtml(item.subtitle || '')}</textarea>
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1">Ảnh nền (URL)</label>
          <input name="imageUrl" type="url" value="\${escAttr(item.imageUrl || '')}" placeholder="https://..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          <p class="text-xs text-slate-500 mt-1">Dùng URL ảnh đã upload (tạm thời chưa hỗ trợ upload tại đây — dùng tab Cấu hình → Upload asset).</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Text nút CTA</label>
            <input name="buttonText" maxlength="80" value="\${escAttr(item.buttonText || '')}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">URL nút CTA</label>
            <input name="buttonUrl" type="url" value="\${escAttr(item.buttonUrl || '')}" placeholder="https://..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Thứ tự (nhỏ → lên trước)</label>
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
    const form = overlay.querySelector('#banner-form');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const body = {
      title: fd.get('title'),
      subtitle: fd.get('subtitle'),
      imageUrl: fd.get('imageUrl') || null,
      buttonText: fd.get('buttonText'),
      buttonUrl: fd.get('buttonUrl') || null,
      sortOrder: Number(fd.get('sortOrder')) || 0,
      isActive: fd.get('isActive') === 'on',
    };
    try {
      if (id) await adminApi('/api/admin/banners/' + id, { method: 'PATCH', body: JSON.stringify(body) });
      else await adminApi('/api/admin/banners', { method: 'POST', body: JSON.stringify(body) });
      adminToast(id ? 'Đã cập nhật banner' : 'Đã tạo banner', 'success');
      overlay.remove();
      bannerReload();
    } catch (e) { adminToast(e.message, 'error'); }
  });
}

window.bannerToggle = async function(id, isActive) {
  try {
    await adminApi('/api/admin/banners/' + id, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    adminToast(isActive ? 'Đã bật' : 'Đã tắt', 'success');
    bannerReload();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.bannerDelete = async function(id) {
  if (!confirm('Xóa banner này?')) return;
  try {
    await adminApi('/api/admin/banners/' + id, { method: 'DELETE' });
    adminToast('Đã xóa', 'success');
    bannerReload();
  } catch (e) { adminToast(e.message, 'error'); }
};

function escHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s); }
`;
}
