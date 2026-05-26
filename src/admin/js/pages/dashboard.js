// Dashboard page - hiển thị stats tổng quát

export function dashboardPageJs() {
  return `
window.adminPageDashboard = async function() {
  const data = await adminApi('/admin/api/dashboard/stats');
  const c = data.contracts || {};
  const u = data.users || {};
  const d = data.devices || { active: u.activeDevices || 0, total: 0, other: 0 };
  const days = data.contractsLast7Days || [];
  const pendingCount = u.pending || 0;

  const html = \`
    <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <i data-lucide="layout-dashboard" class="w-6 h-6"></i> Tổng quan
    </h1>

    \${pendingCount > 0 ? \`
    <a href="#/users?status=pending" class="block mb-6 group">
      <div class="bg-amber-500/10 border-2 border-amber-500 rounded-xl p-4 flex items-center gap-3 hover:bg-amber-500/20 transition">
        <div class="relative w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white">
          <i data-lucide="user-plus" class="w-5 h-5"></i>
          <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">\${pendingCount > 9 ? '9+' : pendingCount}</span>
        </div>
        <div class="flex-1">
          <div class="font-semibold text-amber-200">Có \${pendingCount} tài khoản chờ duyệt</div>
          <div class="text-xs text-amber-300/80">Bấm để xem danh sách và phê duyệt</div>
        </div>
        <i data-lucide="chevron-right" class="w-5 h-5 text-amber-300"></i>
      </div>
    </a>
    \` : ''}

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      \${statCard('Hợp đồng', c.total, 'file-text', 'blue', 'Tổng số hợp đồng')}
      \${statCard('Đã xuất file', c.rendered, 'check-circle-2', 'green', 'Hợp đồng đã tạo PDF/DOCX')}
      \${statCard('Chờ duyệt', pendingCount, 'user-plus', 'amber', 'Tài khoản mới đăng ký')}
      \${statCard('Người dùng', u.approved || u.active || 0, 'users', 'slate', \`\${u.blocked || u.suspended || 0} bị khóa • \${u.rejected || 0} bị từ chối\`)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 class="font-semibold mb-4 flex items-center gap-2"><i data-lucide="trending-up" class="w-4 h-4"></i> 7 ngày gần đây</h2>
        \${renderChart(days)}
      </div>
      <a href="#/devices" class="block bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-brand-500 transition">
        <h2 class="font-semibold mb-4 flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i> Thiết bị đã gắn</h2>
        <div class="text-4xl font-bold text-brand-500">\${d.active || 0}</div>
        <div class="text-sm text-slate-400 mt-2">Số thiết bị đang hoạt động • Bấm để quản lý</div>
        <div class="mt-4 pt-4 border-t border-slate-700 text-sm text-slate-300">
          <div class="flex justify-between mb-1"><span>Admin:</span><span>\${u.admins || 0}</span></div>
          <div class="flex justify-between mb-1"><span>User đã duyệt:</span><span class="text-emerald-400">\${u.approved || u.active || 0}</span></div>
          <div class="flex justify-between mb-1"><span>Chờ duyệt:</span><span class="text-amber-400">\${u.pending || 0}</span></div>
          <div class="flex justify-between"><span>Bị khóa/từ chối:</span><span class="text-red-400">\${(u.blocked || u.suspended || 0) + (u.rejected || 0)}</span></div>
        </div>
      </a>
    </div>
  \`;
  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

function statCard(label, value, icon, color, sub) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    slate: 'text-slate-300 bg-slate-500/10',
  };
  return \`
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-slate-400">\${label}</span>
        <div class="w-9 h-9 rounded-lg flex items-center justify-center \${colorMap[color]}"><i data-lucide="\${icon}" class="w-4 h-4"></i></div>
      </div>
      <div class="text-3xl font-bold">\${value}</div>
      <div class="text-xs text-slate-500 mt-1">\${sub}</div>
    </div>
  \`;
}

function renderChart(days) {
  if (!days.length) return '<div class="text-slate-500 text-center py-8">Chưa có dữ liệu</div>';
  const max = Math.max(...days.map(d => d.cnt), 1);
  return \`
    <div class="flex items-end gap-2 h-40">
      \${days.map(d => {
        const h = Math.round((d.cnt / max) * 100);
        return \`<div class="flex-1 flex flex-col items-center gap-1">
          <div class="text-xs text-slate-400">\${d.cnt}</div>
          <div class="w-full bg-brand-600 rounded-t" style="height: \${h}%; min-height: 4px"></div>
          <div class="text-xs text-slate-500">\${d.d.slice(5)}</div>
        </div>\`;
      }).join('')}
    </div>
  \`;
}
`;
}
