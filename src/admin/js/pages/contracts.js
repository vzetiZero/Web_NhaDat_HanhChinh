// Contracts list page

export function contractsPageJs() {
  return `
window.adminPageContracts = async function() {
  const url = new URL(location.href);
  const search = url.searchParams.get('s') || '';
  const status = url.searchParams.get('st') || '';
  const data = await adminApi(\`/admin/api/contracts?page=1&limit=50\${search ? '&search=' + encodeURIComponent(search) : ''}\${status ? '&status=' + status : ''}\`);
  const items = data.items || [];

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="file-text" class="w-6 h-6"></i> Hợp đồng
      <span class="text-sm text-slate-400 font-normal ml-2">(\${data.total})</span>
    </h1>

    <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex gap-2">
      <input id="contracts-search" type="text" placeholder="Tìm số HĐ, email người tạo..." value="\${escapeAttr(search)}"
        class="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
      <select id="contracts-status" class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm">
        <option value="">-- Tất cả trạng thái --</option>
        <option value="draft" \${status === 'draft' ? 'selected' : ''}>Nháp</option>
        <option value="rendered" \${status === 'rendered' ? 'selected' : ''}>Đã xuất</option>
      </select>
      <button onclick="contractsFilter()" class="bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-md text-sm flex items-center gap-1">
        <i data-lucide="search" class="w-4 h-4"></i> Tìm
      </button>
    </div>

    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr>
          <th>Số HĐ</th>
          <th>Người tạo</th>
          <th>Trạng thái</th>
          <th>Tạo lúc</th>
          <th class="text-right">Hành động</th>
        </tr></thead>
        <tbody>
          \${items.length === 0 ? '<tr><td colspan="5" class="text-center text-slate-500 py-8">Chưa có hợp đồng nào</td></tr>' :
            items.map(c => \`
            <tr>
              <td class="font-mono">\${c.contract_number}</td>
              <td>
                <div>\${escapeHtml(c.user_full_name || '')}</div>
                <div class="text-xs text-slate-400">\${escapeHtml(c.user_email || '')}</div>
              </td>
              <td>\${c.status === 'rendered' ? adminFmt.badge('Đã xuất', 'green') : adminFmt.badge('Nháp', 'amber')}</td>
              <td>\${adminFmt.date(c.created_at)}</td>
              <td class="text-right">
                \${c.docx_r2_key ? \`<a href="/api/contracts/\${c.id}/download/docx" target="_blank" class="text-brand-400 hover:underline text-xs mr-2"><i data-lucide="download" class="w-3 h-3 inline"></i> DOCX</a>\` : ''}
                \${c.pdf_r2_key ? \`<a href="/api/contracts/\${c.id}/download/pdf" target="_blank" class="text-brand-400 hover:underline text-xs"><i data-lucide="download" class="w-3 h-3 inline"></i> PDF</a>\` : ''}
              </td>
            </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

window.contractsFilter = function() {
  const s = document.getElementById('contracts-search').value;
  const st = document.getElementById('contracts-status').value;
  const params = new URLSearchParams();
  if (s) params.set('s', s);
  if (st) params.set('st', st);
  location.href = '#/contracts' + (params.toString() ? '?' + params.toString() : '');
  window.adminPageContracts();
};

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
`;
}
