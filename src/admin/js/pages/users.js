// Users management page - filter theo status (pending/approved/rejected/blocked)
// + Approve/Reject/Block/Unblock với confirm modal
// + Reject yêu cầu nhập lý do (textarea)
// + Mobile responsive: bảng → card list trên màn hình nhỏ

export function usersPageJs() {
  return `
window.adminPageUsers = async function() {
  // Đọc status từ hash query: #/users?status=pending
  const hash = location.hash || '';
  const qIdx = hash.indexOf('?');
  const qs = qIdx >= 0 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
  const statusFilter = qs.get('status') || '';

  const url = '/admin/api/users?page=1&limit=50' + (statusFilter ? '&status=' + encodeURIComponent(statusFilter) : '');
  const data = await adminApi(url);
  const items = data.items || [];

  const tabs = [
    { key: '',         label: 'Tất cả', icon: 'users' },
    { key: 'pending',  label: 'Chờ duyệt', icon: 'user-plus', color: 'amber' },
    { key: 'approved', label: 'Đã duyệt', icon: 'check-circle-2', color: 'green' },
    { key: 'rejected', label: 'Từ chối', icon: 'x-octagon', color: 'red' },
    { key: 'blocked',  label: 'Khóa', icon: 'lock', color: 'red' },
  ];

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="users" class="w-6 h-6"></i> Người dùng
      <span class="text-sm text-slate-400 font-normal ml-2">(\${data.total})</span>
    </h1>

    <div class="flex flex-wrap gap-1 mb-4 border-b border-slate-700">
      \${tabs.map(t => \`
        <a href="#/users\${t.key ? '?status=' + t.key : ''}"
          class="px-3 py-2 text-sm \${statusFilter === t.key ? 'text-brand-500 border-b-2 border-brand-500 font-medium' : 'text-slate-400 hover:text-slate-200'} flex items-center gap-1">
          <i data-lucide="\${t.icon}" class="w-4 h-4"></i> \${t.label}
        </a>
      \`).join('')}
    </div>

    <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex gap-2">
      <input id="users-search" type="text" placeholder="Tìm theo email, họ tên, SĐT..."
        class="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
      <button onclick="usersSearch()" class="bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-md text-sm flex items-center gap-1">
        <i data-lucide="search" class="w-4 h-4"></i> Tìm
      </button>
    </div>

    <!-- Desktop: bảng -->
    <div class="hidden md:block bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr>
          <th>Họ tên / Email</th>
          <th>SĐT</th>
          <th>Ghi chú</th>
          <th>Ngày đăng ký</th>
          <th>Trạng thái</th>
          <th class="text-right">Hành động</th>
        </tr></thead>
        <tbody>
          \${items.length === 0
            ? '<tr><td colspan="6" class="text-center text-slate-500 py-8">Không có người dùng</td></tr>'
            : items.map(u => userRow(u)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Mobile: card list -->
    <div class="md:hidden space-y-3">
      \${items.length === 0
        ? '<div class="text-center text-slate-500 py-8">Không có người dùng</div>'
        : items.map(u => userCard(u)).join('')}
    </div>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

function statusBadge(s) {
  if (s === 'pending')  return adminFmt.badge('Chờ duyệt', 'amber');
  if (s === 'approved') return adminFmt.badge('Đã duyệt', 'green');
  if (s === 'rejected') return adminFmt.badge('Từ chối', 'red');
  if (s === 'blocked')  return adminFmt.badge('Bị khóa', 'red');
  return adminFmt.badge(s, 'slate');
}

function actionsHtml(u) {
  if (u.is_admin) return '<span class="text-xs text-slate-500">Admin</span>';
  const parts = [];
  if (u.status === 'pending') {
    parts.push(\`<button onclick="userApprove(\${u.id}, '\${escAttr(u.email)}')" class="text-emerald-400 hover:underline text-xs"><i data-lucide="check" class="w-3 h-3 inline"></i> Duyệt</button>\`);
    parts.push(\`<button onclick="userReject(\${u.id}, '\${escAttr(u.email)}')" class="text-red-400 hover:underline text-xs"><i data-lucide="x" class="w-3 h-3 inline"></i> Từ chối</button>\`);
  } else if (u.status === 'rejected') {
    parts.push(\`<button onclick="userApprove(\${u.id}, '\${escAttr(u.email)}')" class="text-emerald-400 hover:underline text-xs"><i data-lucide="rotate-ccw" class="w-3 h-3 inline"></i> Duyệt lại</button>\`);
  } else if (u.status === 'approved') {
    parts.push(\`<button onclick="userResetDevice(\${u.id}, '\${escAttr(u.email)}')" class="text-amber-400 hover:underline text-xs"><i data-lucide="rotate-cw" class="w-3 h-3 inline"></i> Reset device</button>\`);
    parts.push(\`<button onclick="userBlock(\${u.id}, '\${escAttr(u.email)}')" class="text-red-400 hover:underline text-xs"><i data-lucide="lock" class="w-3 h-3 inline"></i> Khóa</button>\`);
  } else if (u.status === 'blocked') {
    parts.push(\`<button onclick="userUnblock(\${u.id}, '\${escAttr(u.email)}')" class="text-emerald-400 hover:underline text-xs"><i data-lucide="unlock" class="w-3 h-3 inline"></i> Mở khóa</button>\`);
  }
  return parts.join('<span class="mx-2 text-slate-600">|</span>');
}

function userRow(u) {
  return \`<tr>
    <td>
      <div class="font-medium">\${escHtml(u.full_name || '(chưa có tên)')}</div>
      <div class="text-xs text-slate-400">\${escHtml(u.email)}</div>
    </td>
    <td>\${escHtml(u.phone || '-')}</td>
    <td class="max-w-xs">
      \${u.register_note ? '<div class="text-xs text-slate-300 line-clamp-2" title="' + escAttr(u.register_note) + '">' + escHtml(u.register_note) + '</div>' : '<span class="text-slate-500 text-xs">—</span>'}
      \${u.reject_reason ? '<div class="text-xs text-red-400 mt-1"><i data-lucide="alert-circle" class="w-3 h-3 inline"></i> ' + escHtml(u.reject_reason) + '</div>' : ''}
    </td>
    <td class="text-xs">\${adminFmt.date(u.created_at)}</td>
    <td>\${statusBadge(u.status)}</td>
    <td class="text-right whitespace-nowrap">\${actionsHtml(u)}</td>
  </tr>\`;
}

function userCard(u) {
  return \`<div class="bg-slate-800 border border-slate-700 rounded-lg p-3">
    <div class="flex items-start justify-between mb-2 gap-2">
      <div class="min-w-0 flex-1">
        <div class="font-medium truncate">\${escHtml(u.full_name || '(chưa có tên)')}</div>
        <div class="text-xs text-slate-400 truncate">\${escHtml(u.email)}</div>
      </div>
      <div class="flex-shrink-0">\${statusBadge(u.status)}</div>
    </div>
    <div class="text-xs text-slate-400 space-y-1 mb-2">
      <div><i data-lucide="phone" class="w-3 h-3 inline"></i> \${escHtml(u.phone || '-')}</div>
      <div><i data-lucide="calendar" class="w-3 h-3 inline"></i> \${adminFmt.date(u.created_at)}</div>
      \${u.register_note ? '<div class="text-slate-300"><i data-lucide="message-square" class="w-3 h-3 inline"></i> ' + escHtml(u.register_note) + '</div>' : ''}
      \${u.reject_reason ? '<div class="text-red-400"><i data-lucide="alert-circle" class="w-3 h-3 inline"></i> ' + escHtml(u.reject_reason) + '</div>' : ''}
    </div>
    <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-700">\${actionsHtml(u)}</div>
  </div>\`;
}

// ============ Confirm modal generator ============
function showAdminModal({ title, body, confirmText = 'Xác nhận', confirmClass = 'bg-brand-600 hover:bg-brand-700', onConfirm }) {
  const id = 'admin-modal-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4';
  el.innerHTML = \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-5">
      <h3 class="font-semibold text-lg mb-3">\${title}</h3>
      <div class="mb-4">\${body}</div>
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
      if (val === false) return; // validate failed, modal vẫn mở
      el.remove();
      resolve(val);
    });
  });
}

window.userApprove = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Duyệt tài khoản',
    body: '<p class="text-sm text-slate-300">Bạn chắc chắn muốn duyệt tài khoản <strong class="text-white">' + escHtml(email) + '</strong>? Sau khi duyệt, user có thể đăng nhập và sử dụng hệ thống.</p>',
    confirmText: 'Duyệt tài khoản',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi(\`/api/admin/users/\${id}/approve\`, { method: 'PATCH' });
    adminToast('Đã duyệt tài khoản', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userReject = async function(id, email) {
  const result = await showAdminModal({
    title: 'Từ chối tài khoản',
    body: \`
      <p class="text-sm text-slate-300 mb-3">Lý do từ chối tài khoản <strong class="text-white">\${escHtml(email)}</strong>:</p>
      <textarea id="reject-reason" rows="3" maxlength="1000" placeholder="Vd: Không xác minh được thông tin đăng ký..."
        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500"></textarea>
      <div id="reject-error" class="text-red-400 text-xs mt-1 hidden">Vui lòng nhập lý do</div>
    \`,
    confirmText: 'Từ chối',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: (el) => {
      const reason = el.querySelector('#reject-reason').value.trim();
      if (!reason) {
        el.querySelector('#reject-error').classList.remove('hidden');
        return false;
      }
      return { reason };
    },
  });
  if (!result) return;
  try {
    await adminApi(\`/api/admin/users/\${id}/reject\`, {
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
    body: '<p class="text-sm text-slate-300">Khóa tài khoản <strong class="text-white">' + escHtml(email) + '</strong>? User sẽ không thể đăng nhập cho đến khi được mở khóa.</p>',
    confirmText: 'Khóa',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi(\`/api/admin/users/\${id}/block\`, { method: 'PATCH' });
    adminToast('Đã khóa tài khoản', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userUnblock = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Mở khóa tài khoản',
    body: '<p class="text-sm text-slate-300">Mở khóa và chuyển <strong class="text-white">' + escHtml(email) + '</strong> sang trạng thái Đã duyệt?</p>',
    confirmText: 'Mở khóa',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi(\`/api/admin/users/\${id}/unblock\`, { method: 'PATCH' });
    adminToast('Đã mở khóa', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userResetDevice = async function(id, email) {
  const ok = await showAdminModal({
    title: 'Reset thiết bị',
    body: '<p class="text-sm text-slate-300">Reset thiết bị đã gắn của <strong class="text-white">' + escHtml(email) + '</strong>? User sẽ có thể đăng nhập từ thiết bị mới ở lần tiếp theo.</p>',
    confirmText: 'Reset',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
    onConfirm: () => true,
  });
  if (!ok) return;
  try {
    await adminApi(\`/admin/api/users/\${id}/reset-device\`, { method: 'POST' });
    adminToast('Đã reset thiết bị', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.usersSearch = function() {
  adminToast('Tính năng search nâng cao đang phát triển — dùng tab status để lọc', 'info');
};

function escHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s).replace(/'/g, "\\\\'"); }
`;
}
