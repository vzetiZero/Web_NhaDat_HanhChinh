// Admin: quản lý thiết bị
// Dùng AdminDataTable + actions: khóa/mở khóa/gỡ.

export function devicesPageJs() {
  return `
window.adminPageDevices = async function() {
  // Parse query hash: #/devices?user_id=123
  const hash = location.hash || '';
  const qIdx = hash.indexOf('?');
  const qs = qIdx >= 0 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
  const userIdFilter = qs.get('user_id');

  document.getElementById('page-content').innerHTML = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="smartphone" class="w-6 h-6"></i> Thiết bị đăng nhập
      \${userIdFilter ? '<span class="text-sm text-slate-400 font-normal ml-2">— Lọc theo user #' + escHtml(userIdFilter) + '</span>' : ''}
    </h1>
    \${userIdFilter ? '<a href="#/devices" class="text-xs text-brand-400 hover:underline mb-4 inline-block"><i data-lucide="x" class="w-3 h-3 inline"></i> Bỏ filter user</a>' : ''}
    <div id="devices-table"></div>
  \`;
  if (window.lucide) window.lucide.createIcons();

  const initialFilters = userIdFilter ? { user_id: userIdFilter } : {};

  window.AdminDataTable.mount({
    container: '#devices-table',
    endpoint: '/api/admin/devices',
    initialState: { page: 1, limit: 25, filters: initialFilters },
    search: { placeholder: 'Tìm theo email, họ tên, SĐT của user...', param: 'search' },
    filters: [
      { key: 'status', label: 'Trạng thái', options: [
        { value: '', label: 'Tất cả' },
        { value: 'active', label: 'Đang hoạt động' },
        { value: 'blocked', label: 'Bị khóa' },
      ]},
    ],
    columns: [
      { key: '__stt', label: 'STT', width: '60px' },
      {
        key: 'user', label: 'Người dùng',
        render: (r) => \`
          <div class="font-medium">\${escHtml(r.user?.fullName || '(chưa có tên)')}</div>
          <div class="text-xs text-slate-400">\${escHtml(r.user?.email || '')}</div>
          \${r.user?.isAdmin ? '<span class="text-xs text-blue-400">Admin</span>' : ''}
        \`
      },
      {
        key: 'device', label: 'Thiết bị / Trình duyệt',
        render: (r) => \`
          <div class="flex items-center gap-1.5">
            <i data-lucide="\${deviceIcon(r.deviceType)}" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>\${escHtml(r.deviceType || 'Không rõ')}</span>
          </div>
          <div class="text-xs text-slate-400">\${escHtml(r.browser)} / \${escHtml(r.os)}</div>
        \`
      },
      {
        key: 'ipAddress', label: 'IP',
        render: (r) => \`<span class="font-mono text-xs text-slate-400">\${escHtml(r.ipAddress || '-')}</span>\`
      },
      {
        key: 'lastUsedAt', label: 'Đăng nhập gần nhất',
        render: (r) => \`<span class="text-xs whitespace-nowrap">\${adminFmt.date(r.lastUsedAt)}</span>\`
      },
      {
        key: 'status', label: 'Trạng thái',
        render: (r) => deviceStatusBadge(r.status)
      },
      {
        key: 'resetCount', label: 'Số lần reset',
        render: (r) => \`<span class="text-xs text-slate-400">\${r.resetCount || 0}</span>\`
      },
    ],
    actions: (r) => {
      const list = [];
      if (r.status === 'active') {
        list.push({ label: 'Khóa', icon: 'lock', color: 'red', onClick: () => deviceBlock(r.id, r.user?.email) });
      } else if (r.status === 'blocked') {
        list.push({ label: 'Mở khóa', icon: 'unlock', color: 'green', onClick: () => deviceUnblock(r.id, r.user?.email) });
      }
      list.push({ label: 'Gỡ thiết bị', icon: 'trash-2', color: 'amber', onClick: () => deviceRemove(r.id, r.user?.email) });
      return list;
    },
    emptyMessage: 'Không có thiết bị nào',
  });
};

function deviceIcon(type) {
  if (!type) return 'help-circle';
  if (type === 'iPhone' || type.startsWith('Android Phone') || type === 'Mobile') return 'smartphone';
  if (type === 'iPad' || type.startsWith('Android Tablet')) return 'tablet';
  return 'monitor';
}

function deviceStatusBadge(s) {
  if (s === 'active') return adminFmt.badge('Hoạt động', 'green');
  if (s === 'blocked') return adminFmt.badge('Bị khóa', 'red');
  if (s === 'reset_pending') return adminFmt.badge('Chờ reset', 'amber');
  return adminFmt.badge(s, 'slate');
}

// ============ Action handlers ============
async function adminConfirm({ title, body, confirmText = 'Xác nhận', confirmClass = 'bg-brand-600 hover:bg-brand-700' }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4';
    el.innerHTML = \`
      <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-5">
        <h3 class="font-semibold text-lg mb-3">\${title}</h3>
        <div class="mb-4 text-sm text-slate-300">\${body}</div>
        <div class="flex justify-end gap-2">
          <button data-cancel class="px-4 py-2 border border-slate-600 hover:bg-slate-700 rounded-md text-sm">Hủy</button>
          <button data-confirm class="\${confirmClass} text-white px-4 py-2 rounded-md text-sm">\${confirmText}</button>
        </div>
      </div>
    \`;
    document.body.appendChild(el);
    el.querySelector('[data-cancel]').addEventListener('click', () => { el.remove(); resolve(false); });
    el.addEventListener('click', (e) => { if (e.target === el) { el.remove(); resolve(false); } });
    el.querySelector('[data-confirm]').addEventListener('click', () => { el.remove(); resolve(true); });
  });
}

window.deviceBlock = async function(id, email) {
  const ok = await adminConfirm({
    title: 'Khóa thiết bị',
    body: 'Khóa thiết bị của <strong>' + escHtml(email || '') + '</strong>? User sẽ không đăng nhập được dù đúng fingerprint.',
    confirmText: 'Khóa',
    confirmClass: 'bg-red-600 hover:bg-red-700',
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/devices/' + id + '/block', { method: 'PATCH' });
    adminToast('Đã khóa thiết bị', 'success');
    window.adminPageDevices();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.deviceUnblock = async function(id, email) {
  const ok = await adminConfirm({
    title: 'Mở khóa thiết bị',
    body: 'Mở khóa thiết bị của <strong>' + escHtml(email || '') + '</strong>?',
    confirmText: 'Mở khóa',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/devices/' + id + '/unblock', { method: 'PATCH' });
    adminToast('Đã mở khóa thiết bị', 'success');
    window.adminPageDevices();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.deviceRemove = async function(id, email) {
  const ok = await adminConfirm({
    title: 'Gỡ thiết bị',
    body: 'Gỡ thiết bị của <strong>' + escHtml(email || '') + '</strong>? User có thể gắn thiết bị mới ở lần đăng nhập tiếp theo.',
    confirmText: 'Gỡ',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/devices/' + id, { method: 'DELETE' });
    adminToast('Đã gỡ thiết bị', 'success');
    window.adminPageDevices();
  } catch (e) { adminToast(e.message, 'error'); }
};

function escHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
`;
}
