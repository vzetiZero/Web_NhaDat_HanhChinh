// Users management — dùng AdminDataTable.
// Action tuỳ status: pending → Duyệt/Từ chối; approved → Reset device/Khóa/Xem thiết bị;
// rejected → Duyệt lại; blocked → Mở khóa.

export function usersPageJs() {
  return `
window.adminPageUsers = async function() {
  // Hash có thể có query: #/users?status=pending
  const hash = location.hash || '';
  const qIdx = hash.indexOf('?');
  const qs = qIdx >= 0 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
  const initialStatus = qs.get('status') || '';
  const detailId = qs.get('id');
  if (detailId) return window.adminPageUserDetail(detailId);

  document.getElementById('page-content').innerHTML = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="users" class="w-6 h-6"></i> Người dùng
    </h1>
    <div id="users-table"></div>
  \`;
  if (window.lucide) window.lucide.createIcons();

  window.AdminDataTable.mount({
    container: '#users-table',
    endpoint: '/api/admin/users',
    initialState: { page: 1, limit: 25, filters: { status: initialStatus } },
    search: { placeholder: 'Tìm theo email, họ tên, SĐT...', param: 'search' },
    filters: [
      { key: 'status', label: 'Trạng thái', options: [
        { value: '', label: 'Tất cả' },
        { value: 'pending', label: 'Chờ duyệt' },
        { value: 'approved', label: 'Đã duyệt' },
        { value: 'rejected', label: 'Từ chối' },
        { value: 'blocked', label: 'Khóa' },
      ]},
    ],
    columns: [
      { key: '__stt', label: 'STT', width: '60px' },
      {
        key: 'name', label: 'Họ tên / Email',
        render: (r) => \`
          <div class="font-medium">\${escHtml(r.full_name || '(chưa có tên)')}</div>
          <div class="text-xs text-slate-400">\${escHtml(r.email)}</div>
          \${r.is_admin ? '<span class="text-xs text-blue-400">Admin</span>' : ''}
        \`
      },
      { key: 'phone', label: 'SĐT', render: (r) => escHtml(r.phone || '-') },
      {
        key: 'register_note', label: 'Ghi chú đăng ký',
        render: (r) => {
          const note = r.register_note || '';
          const rej = r.reject_reason || '';
          return (note ? \`<div class="text-xs text-slate-300 line-clamp-2 max-w-xs" title="\${escAttr(note)}">\${escHtml(note)}</div>\` : '<span class="text-slate-500 text-xs">—</span>')
            + (rej ? \`<div class="text-xs text-red-400 mt-1 max-w-xs line-clamp-2" title="\${escAttr(rej)}"><i data-lucide="alert-circle" class="w-3 h-3 inline"></i> \${escHtml(rej)}</div>\` : '');
        }
      },
      {
        key: 'created_at', label: 'Đăng ký lúc',
        render: (r) => \`<span class="text-xs whitespace-nowrap">\${adminFmt.date(r.created_at)}</span>\`
      },
      {
        key: 'status', label: 'Trạng thái',
        render: (r) => userStatusBadge(r.status)
      },
      {
        key: 'last_login_at', label: 'Đăng nhập cuối',
        render: (r) => r.last_login_at
          ? \`<span class="text-xs whitespace-nowrap">\${adminFmt.date(r.last_login_at)}</span>\`
          : '<span class="text-slate-500 text-xs">Chưa</span>'
      },
    ],
    actions: (r) => {
      const list = [{ label: 'Xem chi tiết', icon: 'eye', color: 'blue', onClick: () => location.hash = '#/users?id=' + r.id }];
      if (r.is_admin) return list;
      if (r.status === 'pending') {
        list.push({ label: 'Duyệt', icon: 'check', color: 'green', onClick: () => userApprove(r.id, r.email) });
        list.push({ label: 'Từ chối', icon: 'x', color: 'red', onClick: () => userReject(r.id, r.email) });
      } else if (r.status === 'rejected') {
        list.push({ label: 'Duyệt lại', icon: 'rotate-ccw', color: 'green', onClick: () => userApprove(r.id, r.email) });
      } else if (r.status === 'approved') {
        list.push({ label: 'Reset device', icon: 'rotate-cw', color: 'amber', onClick: () => userResetDevice(r.id, r.email) });
        list.push({ label: 'Xem thiết bị', icon: 'smartphone', color: 'blue', onClick: () => location.hash = '#/devices?user_id=' + r.id });
        list.push({ label: 'Khóa', icon: 'lock', color: 'red', onClick: () => userBlock(r.id, r.email) });
      } else if (r.status === 'blocked') {
        list.push({ label: 'Mở khóa', icon: 'unlock', color: 'green', onClick: () => userUnblock(r.id, r.email) });
      }
      return list;
    },
    emptyMessage: 'Không có người dùng phù hợp',
  });
};

function userStatusBadge(s) {
  if (s === 'pending')  return adminFmt.badge('Chờ duyệt', 'amber');
  if (s === 'approved') return adminFmt.badge('Đã duyệt', 'green');
  if (s === 'rejected') return adminFmt.badge('Từ chối', 'red');
  if (s === 'blocked')  return adminFmt.badge('Bị khóa', 'red');
  return adminFmt.badge(s, 'slate');
}

window.adminPageUserDetail = async function(id) {
  document.getElementById('page-content').innerHTML = '<div class="text-slate-400 py-8">Đang tải chi tiết user...</div>';
  try {
    const res = await adminApi('/api/admin/users/' + id);
    const u = res.user;
    document.getElementById('page-content').innerHTML = \`
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold flex items-center gap-2"><i data-lucide="user" class="w-6 h-6"></i> Chi tiết người dùng</h1>
        <button onclick="location.hash='#/users'" class="px-3 py-2 border border-slate-600 rounded-md text-sm hover:bg-slate-700">Quay lại</button>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section class="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 class="font-semibold mb-3">Thông tin cá nhân</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            \${detailRow('Họ tên', u.fullName)}
            \${detailRow('Email', u.email)}
            \${detailRow('Số điện thoại', u.phone)}
            \${detailRow('Trạng thái', userStatusBadge(u.status), true)}
            \${detailRow('Role', u.isAdmin ? 'admin' : 'user')}
            \${detailRow('Ngày sinh', u.dateOfBirth ? adminFmt.date(u.dateOfBirth) : '-')}
            \${detailRow('Giới tính', u.gender)}
            \${detailRow('Địa chỉ', u.address || u.locationText)}
            \${detailRow('Ngày đăng ký', adminFmt.date(u.createdAt))}
            \${detailRow('Ngày duyệt', u.approvedAt ? adminFmt.date(u.approvedAt) : '-')}
          </dl>
        </section>
        <section class="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 class="font-semibold mb-3">Thiết bị</h2>
          \${u.device ? \`<div class="text-sm space-y-2">
            <div>Fingerprint: \${escHtml((u.device.fingerprint || '').slice(0, 12))}...</div>
            <div>Trạng thái: \${escHtml(u.device.status || '-')}</div>
            <div>Gắn lúc: \${adminFmt.date(u.device.boundAt)}</div>
            <div>Dùng cuối: \${adminFmt.date(u.device.lastUsedAt)}</div>
          </div>\` : '<div class="text-sm text-slate-500">Chưa gắn thiết bị.</div>'}
        </section>
        <section class="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 class="font-semibold mb-3">Hợp đồng gần đây</h2>
          \${(u.contracts || []).length ? u.contracts.map(c => \`<div class="border-b border-slate-700 py-2 text-sm">
            <div class="font-medium">\${escHtml(c.contractNumber)}</div>
            <div class="text-xs text-slate-400">\${escHtml(c.status)} · \${adminFmt.date(c.createdAt)}</div>
          </div>\`).join('') : '<div class="text-sm text-slate-500">Chưa có hợp đồng.</div>'}
        </section>
        <section class="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h2 class="font-semibold mb-3">Audit log gần đây</h2>
          \${(u.auditLogs || []).length ? u.auditLogs.map(a => \`<div class="border-b border-slate-700 py-2 text-sm">
            <div class="font-medium">\${escHtml(a.event)}</div>
            <div class="text-xs text-slate-400">\${adminFmt.date(a.createdAt)}</div>
          </div>\`).join('') : '<div class="text-sm text-slate-500">Chưa có log.</div>'}
        </section>
      </div>
    \`;
    if (window.lucide) window.lucide.createIcons();
  } catch (e) {
    adminToast(e.message, 'error');
    location.hash = '#/users';
  }
};

function detailRow(label, value, raw) {
  return \`<div><dt class="text-slate-400 text-xs">\${escHtml(label)}</dt><dd class="mt-1">\${raw ? value : escHtml(value || '-')}</dd></div>\`;
}

// ============ Confirm modal generator ============
function showAdminModal({ title, body, confirmText = 'Xác nhận', confirmClass = 'bg-brand-600 hover:bg-brand-700', onConfirm }) {
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
  if (window.lucide) window.lucide.createIcons();
  return new Promise((resolve) => {
    el.querySelector('[data-cancel]').addEventListener('click', () => { el.remove(); resolve(null); });
    el.addEventListener('click', (e) => { if (e.target === el) { el.remove(); resolve(null); } });
    el.querySelector('[data-confirm]').addEventListener('click', () => {
      const val = onConfirm ? onConfirm(el) : true;
      if (val === false) return;
      el.remove();
      resolve(val);
    });
  });
}

window.userApprove = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Duyệt tài khoản',
    body: 'Bạn chắc chắn muốn duyệt tài khoản <strong>' + escHtml(email) + '</strong>?',
    confirmText: 'Duyệt',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/users/' + id + '/approve', { method: 'PATCH' });
    adminToast('Đã duyệt tài khoản', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userReject = async function(id, email) {
  const result = await showAdminModal({
    title: 'Từ chối tài khoản',
    body: \`
      <p class="mb-3">Lý do từ chối <strong>\${escHtml(email)}</strong>:</p>
      <textarea id="reject-reason" rows="3" maxlength="1000" placeholder="Vd: Không xác minh được thông tin..."
        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500"></textarea>
      <div id="reject-error" class="text-red-400 text-xs mt-1 hidden">Vui lòng nhập lý do</div>
    \`,
    confirmText: 'Từ chối',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: (el) => {
      const reason = el.querySelector('#reject-reason').value.trim();
      if (!reason) { el.querySelector('#reject-error').classList.remove('hidden'); return false; }
      return { reason };
    },
  });
  if (!result) return;
  try {
    await adminApi('/api/admin/users/' + id + '/reject', {
      method: 'PATCH',
      body: JSON.stringify({ reject_reason: result.reason }),
    });
    adminToast('Đã từ chối tài khoản', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userBlock = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Khóa tài khoản',
    body: 'Khóa <strong>' + escHtml(email) + '</strong>? User sẽ không thể đăng nhập cho đến khi được mở khóa.',
    confirmText: 'Khóa',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/users/' + id + '/block', { method: 'PATCH' });
    adminToast('Đã khóa tài khoản', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userUnblock = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Mở khóa tài khoản',
    body: 'Mở khóa và chuyển <strong>' + escHtml(email) + '</strong> sang Đã duyệt?',
    confirmText: 'Mở khóa',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/users/' + id + '/unblock', { method: 'PATCH' });
    adminToast('Đã mở khóa', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userResetDevice = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Reset thiết bị',
    body: 'Reset thiết bị đã gắn của <strong>' + escHtml(email) + '</strong>? User có thể đăng nhập từ thiết bị mới ở lần tiếp theo.',
    confirmText: 'Reset',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi('/api/admin/users/' + id + '/reset-device', { method: 'POST' });
    adminToast('Đã reset thiết bị', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

function escHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s); }
`;
}
