// Admin: quản lý FAQ
// CRUD đơn giản với list + modal form

export function faqsPageJs() {
  return `
window.adminPageFaqs = async function() {
  document.getElementById('page-content').innerHTML = \`
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <i data-lucide="help-circle" class="w-6 h-6"></i> Câu hỏi thường gặp (FAQ)
      </h1>
      <button onclick="faqOpenForm(null)" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2">
        <i data-lucide="plus" class="w-4 h-4"></i> Thêm câu hỏi
      </button>
    </div>
    <p class="text-sm text-slate-400 mb-4">Hiển thị ở section FAQ trang chủ. Câu hỏi có thứ tự nhỏ hiển thị trước.</p>
    <div id="faqs-list"></div>
  \`;
  if (window.lucide) window.lucide.createIcons();
  await faqReload();
};

async function faqReload() {
  const list = document.getElementById('faqs-list');
  list.innerHTML = '<div class="text-center text-slate-500 py-8"><i data-lucide="loader" class="w-5 h-5 animate-spin inline-block"></i> Đang tải...</div>';
  if (window.lucide) window.lucide.createIcons();
  try {
    const data = await adminApi('/api/admin/faqs');
    const items = data.items || [];
    if (!items.length) {
      list.innerHTML = '<div class="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-12 text-center text-slate-400">Chưa có câu hỏi nào.</div>';
      return;
    }
    list.innerHTML = '<div class="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">' +
      items.map(faqRow).join('') + '</div>';
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    list.innerHTML = '<div class="text-red-400 py-8 text-center">Lỗi: ' + escHtml(e.message) + '</div>';
  }
}

function faqRow(f) {
  return \`
    <div class="p-4 flex items-start gap-3 flex-wrap">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          \${f.isActive
            ? '<span class="bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded text-xs">Bật</span>'
            : '<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">Tắt</span>'}
          \${f.category ? '<span class="bg-blue-700 text-blue-100 px-2 py-0.5 rounded text-xs">' + escHtml(f.category) + '</span>' : ''}
          <span class="text-xs text-slate-500">#\${f.sortOrder}</span>
        </div>
        <div class="font-medium text-sm mb-1">\${escHtml(f.question)}</div>
        <div class="text-xs text-slate-400 line-clamp-2 whitespace-pre-wrap">\${escHtml(f.answer)}</div>
      </div>
      <div class="flex gap-1 flex-shrink-0">
        <button onclick="faqOpenForm(\${f.id})" class="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded">Sửa</button>
        <button onclick="faqToggle(\${f.id}, \${!f.isActive})" class="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded">\${f.isActive ? 'Tắt' : 'Bật'}</button>
        <button onclick="faqDelete(\${f.id})" class="text-xs px-2.5 py-1 bg-red-900/50 text-red-300 hover:bg-red-900 rounded">Xóa</button>
      </div>
    </div>\`;
}

window.faqOpenForm = async function(id) {
  let item = { question: '', answer: '', category: '', sortOrder: 0, isActive: true };
  if (id) {
    try { const r = await adminApi('/api/admin/faqs/' + id); item = r.item; }
    catch (e) { adminToast(e.message, 'error'); return; }
  }
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto';
  overlay.innerHTML = \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg my-auto">
      <div class="p-5 border-b border-slate-700">
        <h3 class="font-semibold text-lg">\${id ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</h3>
      </div>
      <form id="faq-form" class="p-5 space-y-3">
        <div>
          <label class="text-xs text-slate-400 block mb-1">Câu hỏi <span class="text-red-400">*</span></label>
          <input name="question" required maxlength="500" value="\${escAttr(item.question)}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1">Trả lời <span class="text-red-400">*</span></label>
          <textarea name="answer" required maxlength="5000" rows="6" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500">\${escHtml(item.answer)}</textarea>
          <p class="text-xs text-slate-500 mt-1">Hỗ trợ xuống dòng. Không nhập HTML — script và iframe sẽ bị strip.</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Phân loại</label>
            <input name="category" maxlength="80" value="\${escAttr(item.category || '')}" placeholder="vd: Tài khoản" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Thứ tự</label>
            <input name="sortOrder" type="number" value="\${Number(item.sortOrder) || 0}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          </div>
        </div>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isActive" \${item.isActive ? 'checked' : ''} class="w-4 h-4 accent-brand-500" />
          <span class="text-sm">Bật hiển thị</span>
        </label>
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
    const form = overlay.querySelector('#faq-form');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const body = {
      question: fd.get('question'),
      answer: fd.get('answer'),
      category: fd.get('category'),
      sortOrder: Number(fd.get('sortOrder')) || 0,
      isActive: fd.get('isActive') === 'on',
    };
    try {
      if (id) await adminApi('/api/admin/faqs/' + id, { method: 'PATCH', body: JSON.stringify(body) });
      else await adminApi('/api/admin/faqs', { method: 'POST', body: JSON.stringify(body) });
      adminToast(id ? 'Đã cập nhật' : 'Đã thêm', 'success');
      overlay.remove();
      faqReload();
    } catch (e) { adminToast(e.message, 'error'); }
  });
};

window.faqToggle = async function(id, isActive) {
  try {
    await adminApi('/api/admin/faqs/' + id, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    faqReload();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.faqDelete = async function(id) {
  if (!confirm('Xóa câu hỏi này?')) return;
  try {
    await adminApi('/api/admin/faqs/' + id, { method: 'DELETE' });
    adminToast('Đã xóa', 'success');
    faqReload();
  } catch (e) { adminToast(e.message, 'error'); }
};

function escHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s); }
`;
}
