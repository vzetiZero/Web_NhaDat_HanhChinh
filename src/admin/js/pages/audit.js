// Audit log viewer

export function auditPageJs() {
  return `
window.adminPageAudit = async function() {
  const data = await adminApi('/admin/api/audit?page=1&limit=100');
  const items = data.items || [];

  const eventBadge = (ev) => {
    if (ev.includes('failed') || ev.includes('blocked') || ev.includes('mismatch')) return adminFmt.badge(ev, 'red');
    if (ev.startsWith('admin_')) return adminFmt.badge(ev, 'blue');
    if (ev.includes('reset')) return adminFmt.badge(ev, 'amber');
    return adminFmt.badge(ev, 'slate');
  };

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="scroll-text" class="w-6 h-6"></i> Nhật ký hệ thống
      <span class="text-sm text-slate-400 font-normal ml-2">(\${data.total})</span>
    </h1>

    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr>
          <th>Thời gian</th>
          <th>Sự kiện</th>
          <th>User</th>
          <th>IP</th>
          <th>Chi tiết</th>
        </tr></thead>
        <tbody>
          \${items.length === 0 ? '<tr><td colspan="5" class="text-center text-slate-500 py-8">Chưa có log</td></tr>' :
            items.map(a => \`<tr>
              <td class="text-xs whitespace-nowrap">\${adminFmt.date(a.created_at)}</td>
              <td>\${eventBadge(a.event)}</td>
              <td class="text-sm">\${a.user_email ? escHtml(a.user_email) : (a.user_id ? '#' + a.user_id : '-')}</td>
              <td class="text-xs font-mono text-slate-400">\${escHtml(a.ip_address || '-')}</td>
              <td class="text-xs text-slate-400 max-w-md truncate" title="\${escAttr(a.detail || '')}">\${escHtml(a.detail || '')}</td>
            </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

function escHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }
`;
}
