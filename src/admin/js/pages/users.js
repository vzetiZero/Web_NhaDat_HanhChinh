// Users management page - list + reset device + suspend

export function usersPageJs() {
  return `
window.adminPageUsers = async function() {
  const data = await adminApi('/admin/api/users?page=1&limit=50');
  const items = data.items || [];

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="users" class="w-6 h-6"></i> Người dùng
      <span class="text-sm text-slate-400 font-normal ml-2">(\${data.total})</span>
    </h1>

    <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex gap-2">
      <input id="users-search" type="text" placeholder="Tìm theo email, họ tên, SĐT..."
        class="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
      <button onclick="usersSearch()" class="bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-md text-sm flex items-center gap-1">
        <i data-lucide="search" class="w-4 h-4"></i> Tìm
      </button>
    </div>

    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr>
          <th>Email</th>
          <th>Họ tên</th>
          <th>SĐT</th>
          <th>Vai trò</th>
          <th>Trạng thái</th>
          <th>Đăng nhập cuối</th>
          <th class="text-right">Hành động</th>
        </tr></thead>
        <tbody>
          \${items.length === 0 ? '<tr><td colspan="7" class="text-center text-slate-500 py-8">Chưa có người dùng</td></tr>' :
            items.map(u => \`
            <tr>
              <td>\${escHtml(u.email)}</td>
              <td>\${escHtml(u.full_name || '')}</td>
              <td>\${escHtml(u.phone || '')}</td>
              <td>\${u.is_admin ? adminFmt.badge('Admin', 'blue') : adminFmt.badge('User', 'slate')}</td>
              <td>\${u.status === 'active' ? adminFmt.badge('Hoạt động', 'green') : adminFmt.badge(u.status, 'red')}</td>
              <td class="text-xs">\${u.last_login_at ? adminFmt.date(u.last_login_at) : '<span class="text-slate-500">Chưa đăng nhập</span>'}</td>
              <td class="text-right whitespace-nowrap">
                \${u.is_admin ? '' : \`
                <button onclick="userResetDevice(\${u.id}, '\${escAttr(u.email)}')" class="text-amber-400 hover:underline text-xs mr-3">
                  <i data-lucide="rotate-cw" class="w-3 h-3 inline"></i> Reset device
                </button>
                <button onclick="userToggleStatus(\${u.id}, '\${u.status}')" class="text-\${u.status === 'active' ? 'red' : 'green'}-400 hover:underline text-xs">
                  <i data-lucide="\${u.status === 'active' ? 'lock' : 'unlock'}" class="w-3 h-3 inline"></i>
                  \${u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                </button>\`}
              </td>
            </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

window.userResetDevice = async function(id, email) {
  if (!confirm(\`Reset thiết bị đã gắn của \${email}?\\nUser sẽ có thể đăng nhập từ thiết bị mới ở lần đăng nhập tiếp theo.\`)) return;
  try {
    await adminApi(\`/admin/api/users/\${id}/reset-device\`, { method: 'POST' });
    adminToast('Đã reset thiết bị', 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.userToggleStatus = async function(id, currentStatus) {
  const action = currentStatus === 'active' ? 'khóa' : 'mở khóa';
  if (!confirm(\`Xác nhận \${action} tài khoản này?\`)) return;
  try {
    await adminApi(\`/admin/api/users/\${id}/suspend\`, { method: 'POST' });
    adminToast(\`Đã \${action}\`, 'success');
    window.adminPageUsers();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.usersSearch = function() {
  // Đơn giản: reload trang với search query
  adminToast('Chức năng search đang được phát triển', 'info');
};

function escHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escAttr(s) { return escHtml(s).replace(/'/g, "\\\\'"); }
`;
}
