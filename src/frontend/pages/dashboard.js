// User dashboard - danh sách hợp đồng của tôi

import { renderPageShell } from '../components/layout.js';

export function renderDashboardPage(env) {
  return renderPageShell(env, {
    title: 'Hợp đồng của tôi',
    requireAuth: true,
    bodyHtml: `
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Hợp đồng của tôi</h1>
            <p class="text-slate-500 text-sm mt-1">Quản lý các hợp đồng bạn đã tạo</p>
          </div>
          <a href="/hop-dong/moi" class="btn-primary">
            <i data-lucide="file-plus" class="w-4 h-4 inline"></i> Tạo hợp đồng mới
          </a>
        </div>

        <div id="device-info" class="hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-900"></div>

        <div id="contracts-list">
          <div class="text-center py-12 text-slate-500">
            <i data-lucide="loader" class="w-6 h-6 inline-block animate-spin"></i> Đang tải...
          </div>
        </div>
      </div>
    `,
    pageScript: `
      (async function() {
        try {
          // Hiển thị thiết bị hiện tại
          try {
            const d = await api('/api/device/current');
            if (d.device) {
              const box = document.getElementById('device-info');
              const bound = new Date(d.device.bound_at.replace(' ', 'T') + 'Z');
              box.innerHTML = '<i data-lucide="shield-check" class="w-4 h-4 inline"></i> Thiết bị này đã được gắn từ ' + bound.toLocaleDateString('vi-VN') + ' (' + d.device.fingerprint_short + ')';
              box.classList.remove('hidden');
              if (window.lucide) window.lucide.createIcons();
            }
          } catch {}

          const res = await api('/api/contracts?page=1&limit=50');
          renderList(res.items || []);
        } catch (e) {
          document.getElementById('contracts-list').innerHTML = '<div class="text-red-500 py-8 text-center">Lỗi: ' + e.message + '</div>';
        }
      })();

      function renderList(items) {
        const root = document.getElementById('contracts-list');
        if (items.length === 0) {
          root.innerHTML = \`
            <div class="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <i data-lucide="folder-open" class="w-16 h-16 text-slate-300 inline-block mb-3"></i>
              <h3 class="font-semibold text-slate-700">Chưa có hợp đồng nào</h3>
              <p class="text-slate-500 mt-2">Bắt đầu bằng cách tạo hợp đồng đầu tiên</p>
              <a href="/hop-dong/moi" class="btn-primary inline-block mt-4">Tạo hợp đồng</a>
            </div>\`;
        } else {
          root.innerHTML = \`
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Số hợp đồng</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trạng thái</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cập nhật</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  \${items.map(c => {
                    // Hỗ trợ cả 2 format: camelCase (Node backend) và snake_case (CF legacy)
                    const num = c.contractNumber || c.contract_number;
                    const updatedAt = c.updatedAt || c.updated_at;
                    const createdAt = c.createdAt || c.created_at;
                    const dt = new Date(updatedAt || createdAt);
                    const docxFileId = c.docxFile?.id || c.docxFileId;
                    const pdfFileId = c.pdfFile?.id || c.pdfFileId;
                    return \`
                    <tr class="border-b border-slate-100 hover:bg-slate-50">
                      <td class="px-4 py-3 font-mono text-sm">\${num}</td>
                      <td class="px-4 py-3"><span class="\${c.status === 'rendered' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded text-xs">\${c.status === 'rendered' ? 'Đã xuất file' : 'Nháp'}</span></td>
                      <td class="px-4 py-3 text-sm text-slate-600">\${dt.toLocaleString('vi-VN')}</td>
                      <td class="px-4 py-3 text-right whitespace-nowrap">
                        \${docxFileId ? \`<button onclick="downloadFile(\${docxFileId})" class="text-primary-500 hover:underline text-sm mr-3 cursor-pointer"><i data-lucide="download" class="w-3 h-3 inline"></i> DOCX</button>\` : ''}
                        \${pdfFileId ? \`<button onclick="downloadFile(\${pdfFileId})" class="text-primary-500 hover:underline text-sm mr-3 cursor-pointer"><i data-lucide="download" class="w-3 h-3 inline"></i> PDF</button>\` : ''}
                        <a href="/hop-dong/\${c.id}" class="text-slate-600 hover:underline text-sm"><i data-lucide="eye" class="w-3 h-3 inline"></i> Xem</a>
                      </td>
                    </tr>\`;
                  }).join('')}
                </tbody>
              </table>
            </div>\`;
        }
        if (window.lucide) window.lucide.createIcons();
      }
    `,
  });
}
