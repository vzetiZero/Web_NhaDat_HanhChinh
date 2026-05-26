// Trang chi tiết hợp đồng

import { renderPageShell } from '../components/layout.js';

export function renderContractDetailPage(env, id) {
  return renderPageShell(env, {
    title: 'Chi tiết hợp đồng',
    requireAuth: true,
    bodyHtml: `
      <div class="max-w-4xl mx-auto px-4 py-8">
        <a href="/bang-dieu-khien" class="text-sm text-slate-500 hover:text-primary-500">
          <i data-lucide="arrow-left" class="w-4 h-4 inline"></i> Quay lại danh sách
        </a>
        <div id="root" class="mt-4">
          <div class="text-center py-12 text-slate-500"><i data-lucide="loader" class="w-6 h-6 inline-block animate-spin"></i> Đang tải...</div>
        </div>
      </div>
    `,
    pageScript: `
      (async function() {
        try {
          const res = await api('/api/contracts/${id}');
          const c = res.contract;
          const form = c.form_data_parsed || {};
          document.getElementById('root').innerHTML = \`
            <div class="bg-white border border-slate-200 rounded-xl p-6">
              <div class="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h1 class="text-xl font-bold font-mono">\${c.contract_number}</h1>
                  <p class="text-sm text-slate-500 mt-1">\${c.status === 'rendered' ? '<span class="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Đã xuất file</span>' : '<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">Nháp</span>'}</p>
                </div>
                <div class="space-x-2">
                  \${c.docx_r2_key ? \`<a href="/api/contracts/\${c.id}/download/docx" target="_blank" class="btn-primary inline-block text-sm"><i data-lucide="download" class="w-3 h-3 inline"></i> DOCX</a>\` : ''}
                  \${c.pdf_r2_key ? \`<a href="/api/contracts/\${c.id}/download/pdf" target="_blank" class="btn-secondary inline-block text-sm"><i data-lucide="download" class="w-3 h-3 inline"></i> PDF</a>\` : ''}
                </div>
              </div>
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><dt class="text-slate-500">Ngày tạo</dt><dd>\${new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleString('vi-VN')}</dd></div>
                <div><dt class="text-slate-500">Cập nhật</dt><dd>\${new Date(c.updated_at.replace(' ', 'T') + 'Z').toLocaleString('vi-VN')}</dd></div>
                <div><dt class="text-slate-500">Bên A</dt><dd>\${esc(form.benA?.hoTen || '-')}</dd></div>
                <div><dt class="text-slate-500">Bên B</dt><dd>\${esc(form.benB?.hoTen || '-')}</dd></div>
                <div class="md:col-span-2"><dt class="text-slate-500">Thửa đất</dt><dd>\${esc(form.thuaDat?.diaChi || '-')} - \${esc(form.thuaDat?.dienTich || '-')} m²</dd></div>
                <div class="md:col-span-2"><dt class="text-slate-500">Giá trị</dt><dd class="font-semibold">\${Number(form.thuaDat?.giaTri || 0).toLocaleString('vi-VN')} VNĐ</dd></div>
              </dl>
            </div>
          \`;
          if (window.lucide) window.lucide.createIcons();
        } catch (e) {
          document.getElementById('root').innerHTML = '<div class="text-red-500 py-8 text-center">Lỗi: ' + e.message + '</div>';
        }
      })();
      function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    `,
  });
}
