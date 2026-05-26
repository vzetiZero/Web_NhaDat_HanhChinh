// Trang preview hợp đồng dạng A4 (in được)

import { renderPageShell } from '../components/layout.js';

export function renderContractPreviewPage(env, id) {
  return renderPageShell(env, {
    title: 'Xem hợp đồng',
    requireAuth: true,
    hideHeader: true,
    bodyHtml: `
      <div class="fixed top-2 right-2 print:hidden">
        <button onclick="window.print()" class="btn-primary">
          <i data-lucide="printer" class="w-4 h-4 inline"></i> In / Lưu PDF
        </button>
        <a href="/hop-dong/${id}" class="btn-secondary ml-2">Đóng</a>
      </div>
      <div id="root" class="bg-white max-w-[210mm] mx-auto p-12 my-4 shadow"></div>
    `,
    pageScript: `
      (async function() {
        try {
          const res = await api('/api/contracts/${id}');
          const c = res.contract;
          // Reuse pdf.js HTML generator (server-side via fallback download)
          // Đơn giản: redirect tới /api/contracts/:id/download/pdf (HTML fallback)
          if (c.pdf_r2_key && c.pdf_r2_key.endsWith('.html')) {
            location.href = '/api/contracts/${id}/download/pdf';
          } else if (c.pdf_r2_key) {
            location.href = '/api/contracts/${id}/download/pdf';
          } else {
            document.getElementById('root').innerHTML = '<div class="text-center text-slate-500 py-12">Hợp đồng chưa được render. <a href="/hop-dong/${id}" class="text-primary-500 underline">Quay lại</a></div>';
          }
        } catch (e) {
          document.getElementById('root').innerHTML = '<div class="text-red-500 py-8 text-center">Lỗi: ' + e.message + '</div>';
        }
      })();
    `,
  });
}
