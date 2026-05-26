// Templates page - list & upload DOCX template

export function templatesPageJs() {
  return `
window.adminPageTemplates = async function() {
  const data = await adminApi('/admin/api/templates');
  const items = data.items || [];

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="file-cog" class="w-6 h-6"></i> Mẫu hợp đồng
    </h1>

    <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
      <h2 class="font-semibold mb-3 flex items-center gap-2">
        <i data-lucide="upload" class="w-4 h-4"></i> Upload template mới
      </h2>
      <form id="tpl-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="text" name="code" required placeholder="Code (vd: HD_TANG_QSDD_V2)"
          class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
        <input type="text" name="name" required placeholder="Tên hiển thị"
          class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
        <textarea name="description" placeholder="Mô tả (tùy chọn)" rows="2"
          class="md:col-span-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500"></textarea>
        <input type="file" name="file" accept=".docx" required class="md:col-span-2 text-sm" />
        <div class="md:col-span-2">
          <button type="submit" class="bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-md text-sm">
            <i data-lucide="upload" class="w-4 h-4 inline"></i> Upload
          </button>
          <p class="text-xs text-slate-500 mt-2">
            File DOCX phải chứa placeholder dạng \\\`{benA.hoTen}\\\`, \\\`{thuaDat.dienTich}\\\`, ...
          </p>
        </div>
      </form>
    </div>

    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr>
          <th>Code</th><th>Tên</th><th>Mô tả</th><th>R2 Key</th><th>Cập nhật</th>
        </tr></thead>
        <tbody>
          \${items.length === 0 ? '<tr><td colspan="5" class="text-center text-slate-500 py-8">Chưa có template</td></tr>' :
            items.map(t => \`<tr>
              <td class="font-mono text-xs">\${escHtml(t.code)}</td>
              <td>\${escHtml(t.name)}</td>
              <td class="text-sm text-slate-400">\${escHtml(t.description || '')}</td>
              <td class="font-mono text-xs text-slate-500">\${escHtml(t.docx_r2_key)}</td>
              <td class="text-xs">\${adminFmt.date(t.updated_at)}</td>
            </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
  document.getElementById('tpl-form').addEventListener('submit', handleTplUpload);
};

async function handleTplUpload(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    // Translate /admin/api/templates → /api/admin/templates và prefix API_BASE
    const url = (window.adminApiBase || '') + window.adminTranslatePath('/admin/api/templates');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminState.token }, // KHÔNG set Content-Type cho FormData
      body: fd,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Upload thất bại');
    adminToast('Đã upload template', 'success');
    window.adminPageTemplates();
  } catch (err) {
    adminToast(err.message, 'error');
  }
}

function escHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
`;
}
