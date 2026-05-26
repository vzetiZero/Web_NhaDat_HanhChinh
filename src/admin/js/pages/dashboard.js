// Dashboard page - hiển thị stats tổng quát

export function dashboardPageJs() {
  return `
window.adminPageDashboard = async function() {
  const data = await adminApi('/admin/api/dashboard/stats');
  const c = data.contracts, u = data.users, d = data.devices;
  const days = data.contractsLast7Days || [];

  const html = \`
    <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <i data-lucide="layout-dashboard" class="w-6 h-6"></i> Tổng quan
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      \${statCard('Hợp đồng', c.total, 'file-text', 'blue', 'Tổng số hợp đồng')}
      \${statCard('Đã xuất file', c.rendered, 'check-circle-2', 'green', 'Hợp đồng đã tạo PDF/DOCX')}
      \${statCard('Hôm nay', c.today, 'calendar-check', 'amber', 'Hợp đồng tạo trong ngày')}
      \${statCard('Người dùng', u.total, 'users', 'slate', \`\${u.active} hoạt động • \${u.suspended} bị khóa\`)}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 class="font-semibold mb-4 flex items-center gap-2"><i data-lucide="trending-up" class="w-4 h-4"></i> 7 ngày gần đây</h2>
        \${renderChart(days)}
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 class="font-semibold mb-4 flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i> Thiết bị đã gắn</h2>
        <div class="text-4xl font-bold text-brand-500">\${d.active}</div>
        <div class="text-sm text-slate-400 mt-2">Số thiết bị đang hoạt động</div>
        <div class="mt-4 pt-4 border-t border-slate-700 text-sm text-slate-300">
          <div class="flex justify-between mb-1"><span>Admin:</span><span>\${u.admins}</span></div>
          <div class="flex justify-between mb-1"><span>User hoạt động:</span><span>\${u.active}</span></div>
          <div class="flex justify-between"><span>User bị khóa:</span><span class="text-red-400">\${u.suspended}</span></div>
        </div>
      </div>
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
