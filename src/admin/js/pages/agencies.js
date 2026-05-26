// Land agencies moderation page

export function agenciesPageJs() {
  return `
window.adminPageAgencies = async function() {
  const status = window.agencyStatusFilter || 'pending';
  const [suggestions, agencies] = await Promise.all([
    adminApi('/admin/api/agencies/suggestions?status=' + encodeURIComponent(status) + '&limit=50'),
    adminApi('/admin/api/agencies?limit=100'),
  ]);
  const pending = suggestions.items || [];
  const agencyItems = agencies.items || [];

  const html = \`
    <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
      <i data-lucide="building-2" class="w-6 h-6"></i> Cơ quan cấp GCN
      <span class="text-sm text-slate-400 font-normal ml-2">(\${agencies.total || 0})</span>
    </h1>

    <div class="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
      <section class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold">Đề xuất chờ duyệt</h2>
            <p class="text-xs text-slate-400">Duyệt các cơ quan người dùng tự nhập khi không tìm thấy gợi ý.</p>
          </div>
          <select id="agency-status-filter" class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm">
            \${['pending','approved','rejected','merged'].map(s => \`<option value="\${s}" \${status === s ? 'selected' : ''}>\${s}</option>\`).join('')}
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr>
              <th>Tên cơ quan</th><th>Tỉnh</th><th>User</th><th>Ngày</th><th class="text-right">Xử lý</th>
            </tr></thead>
            <tbody>
              \${pending.length === 0 ? '<tr><td colspan="5" class="text-center text-slate-500 py-8">Không có đề xuất</td></tr>' :
                pending.map(s => \`
                  <tr>
                    <td>
                      <div class="font-medium">\${escHtml(s.rawInput)}</div>
                      <div class="text-xs text-slate-500">\${escHtml(s.normalizedInput || '')}</div>
                    </td>
                    <td>\${escHtml(s.province?.nameCurrent || '-')}</td>
                    <td class="text-xs">\${escHtml(s.user?.email || 'Ẩn danh')}</td>
                    <td class="text-xs">\${adminFmt.date(s.createdAt)}</td>
                    <td class="text-right whitespace-nowrap">
                      \${status === 'pending' ? \`
                        <button onclick="agencyApprove(\${s.id})" class="text-emerald-400 hover:underline text-xs mr-2">Duyệt</button>
                        <button onclick="agencyReject(\${s.id})" class="text-red-400 hover:underline text-xs mr-2">Từ chối</button>
                        <button onclick="agencyMergePrompt(\${s.id})" class="text-amber-400 hover:underline text-xs">Gộp</button>
                      \` : adminFmt.badge(s.adminStatus, status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber')}
                    </td>
                  </tr>\`
                ).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <aside class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h2 class="font-semibold mb-3">Tạo cơ quan đã xác minh</h2>
        <form id="agency-create-form" class="space-y-3">
          <input name="officialName" required minlength="5" placeholder="Tên cơ quan chính thức"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          <input name="shortName" placeholder="Tên viết tắt"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          <select name="agencyType" required class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm">
            <option value="land_registration_office">Văn phòng ĐKĐĐ</option>
            <option value="land_registration_branch">Chi nhánh VPĐKĐĐ</option>
            <option value="department_of_agriculture_environment">Sở NN&MT</option>
            <option value="province_people_committee">UBND tỉnh</option>
            <option value="district_people_committee">UBND huyện cũ</option>
            <option value="tax_department">Cơ quan thuế</option>
            <option value="notary_office">Công chứng</option>
            <option value="other">Khác</option>
          </select>
          <input name="parentAgency" placeholder="Cơ quan chủ quản"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
          <button class="bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-md text-sm">Tạo cơ quan</button>
        </form>

        <h2 class="font-semibold mt-6 mb-3">Danh sách cơ quan</h2>
        <div class="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin">
          \${agencyItems.map(a => \`
            <div class="border border-slate-700 rounded-lg p-3 text-sm">
              <div class="font-medium">\${escHtml(a.officialName)}</div>
              <div class="text-xs text-slate-400 mt-1">#\${a.id} · \${escHtml(a.agencyType)} · \${escHtml(a.trustLevel)}</div>
            </div>
          \`).join('')}
        </div>
      </aside>
    </div>
  \`;

  document.getElementById('page-content').innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
  document.getElementById('agency-status-filter').addEventListener('change', (e) => {
    window.agencyStatusFilter = e.target.value;
    window.adminPageAgencies();
  });
  document.getElementById('agency-create-form').addEventListener('submit', agencyCreate);
};

window.agencyApprove = async function(id) {
  try {
    await adminApi('/admin/api/agencies/suggestions/' + id + '/approve', { method: 'POST', body: JSON.stringify({}) });
    adminToast('Đã duyệt đề xuất', 'success');
    window.adminPageAgencies();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.agencyReject = async function(id) {
  const note = prompt('Lý do từ chối (tuỳ chọn):') || '';
  try {
    await adminApi('/admin/api/agencies/suggestions/' + id + '/reject', { method: 'POST', body: JSON.stringify({ note }) });
    adminToast('Đã từ chối đề xuất', 'success');
    window.adminPageAgencies();
  } catch (e) { adminToast(e.message, 'error'); }
};

window.agencyMergePrompt = async function(id) {
  const targetAgencyId = Number(prompt('Nhập ID cơ quan đích để gộp:'));
  if (!targetAgencyId) return;
  try {
    await adminApi('/admin/api/agencies/suggestions/' + id + '/merge', {
      method: 'POST',
      body: JSON.stringify({ targetAgencyId }),
    });
    adminToast('Đã gộp đề xuất', 'success');
    window.adminPageAgencies();
  } catch (e) { adminToast(e.message, 'error'); }
};

async function agencyCreate(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await adminApi('/admin/api/agencies', {
      method: 'POST',
      body: JSON.stringify({
        officialName: fd.get('officialName'),
        shortName: fd.get('shortName') || undefined,
        agencyType: fd.get('agencyType'),
        parentAgency: fd.get('parentAgency') || undefined,
      }),
    });
    adminToast('Đã tạo cơ quan', 'success');
    e.target.reset();
    window.adminPageAgencies();
  } catch (err) {
    adminToast(err.message, 'error');
  }
}

function escHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
`;
}
