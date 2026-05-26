// AdminDataTable - reusable table component for admin SPA
// Features:
//   - STT (auto-numbered)
//   - Search (debounced 400ms)
//   - Filter chips (status tabs) hoặc dropdown
//   - Pagination (prev/next + jump to page)
//   - Page-size selector (10/25/50/100)
//   - Sticky header khi scroll dọc
//   - Horizontal scroll khi nhiều cột (overflow-x-auto)
//   - Loading / empty / error states
//   - Action column with mobile dropdown (kebab menu)
//
// Cách dùng:
//   const table = AdminDataTable.mount({
//     container: document.getElementById('xyz'),
//     endpoint: '/api/admin/users',
//     columns: [
//       { key: '__stt', label: 'STT', width: '60px' },
//       { key: 'fullName', label: 'Họ tên', render: row => row.fullName || '-' },
//       { key: 'email', label: 'Email' },
//       { key: 'status', label: 'Trạng thái', render: row => statusBadge(row.status) },
//     ],
//     filters: [
//       { key: 'status', label: 'Trạng thái', options: [
//         { value: '', label: 'Tất cả' },
//         { value: 'pending', label: 'Chờ duyệt', count: row => row.status === 'pending' },
//       ]}
//     ],
//     search: { placeholder: 'Tìm email...', param: 'search' },
//     actions: (row) => [
//       { label: 'Duyệt', icon: 'check', color: 'green', onClick: () => userApprove(row.id) },
//       { label: 'Từ chối', icon: 'x', color: 'red', onClick: () => userReject(row.id) },
//     ],
//     emptyMessage: 'Chưa có dữ liệu',
//     initialState: { page: 1, limit: 25, search: '', filters: {} },
//   });
//
//   table.reload();   // refresh manually
//   table.destroy();  // cleanup nếu cần

export function adminDataTableJs() {
  return `
window.AdminDataTable = (function() {
  let _idCounter = 0;

  function mount(opts) {
    const tableId = 'adt-' + (++_idCounter);
    const state = {
      page: opts.initialState?.page || 1,
      limit: opts.initialState?.limit || 25,
      search: opts.initialState?.search || '',
      filters: opts.initialState?.filters || {},
      items: [],
      total: 0,
      loading: false,
      error: null,
    };

    const container = typeof opts.container === 'string'
      ? document.querySelector(opts.container)
      : opts.container;
    if (!container) {
      console.error('[AdminDataTable] container not found');
      return null;
    }

    let searchDebounce = null;

    function buildQuery() {
      const params = new URLSearchParams();
      params.set('page', state.page);
      params.set('limit', state.limit);
      if (state.search) params.set(opts.search?.param || 'search', state.search);
      for (const [k, v] of Object.entries(state.filters)) {
        if (v) params.set(k, v);
      }
      return params.toString();
    }

    async function load() {
      state.loading = true;
      state.error = null;
      render();
      try {
        const data = await adminApi(opts.endpoint + '?' + buildQuery());
        state.items = (opts.parseResponse ? opts.parseResponse(data) : data).items || [];
        state.total = (opts.parseResponse ? opts.parseResponse(data) : data).total || 0;
      } catch (e) {
        state.error = e.message;
        state.items = [];
        state.total = 0;
      } finally {
        state.loading = false;
        render();
      }
    }

    function render() {
      const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
      const startIdx = (state.page - 1) * state.limit;

      container.innerHTML = \`
        <div id="\${tableId}" class="bg-slate-800 border border-slate-700 rounded-xl">

          \${renderToolbar()}
          \${renderFilters()}

          <div class="relative">
            <div class="overflow-x-auto overflow-y-visible max-h-[70vh]">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-slate-800 z-10 shadow-[0_1px_0_0_rgba(71,85,105,0.5)]">
                  <tr>
                    \${opts.columns.map(c => \`<th class="px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-400 whitespace-nowrap" style="\${c.width ? 'width:' + c.width + ';' : ''}">\${c.label}</th>\`).join('')}
                    \${opts.actions ? '<th class="px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-400 whitespace-nowrap sticky right-0 bg-slate-800">Hành động</th>' : ''}
                  </tr>
                </thead>
                <tbody>\${renderBody(startIdx)}</tbody>
              </table>
            </div>
          </div>

          \${renderPagination(totalPages)}
        </div>
      \`;
      if (window.lucide) window.lucide.createIcons();
      wireEvents();
    }

    function renderToolbar() {
      const search = opts.search;
      return \`
        <div class="px-4 py-3 border-b border-slate-700 flex flex-col sm:flex-row gap-2 sm:items-center">
          \${search ? \`
            <div class="flex-1 relative">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="\${tableId}-search" placeholder="\${esc(search.placeholder || 'Tìm kiếm...')}"
                value="\${escAttr(state.search)}"
                class="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-brand-500" />
            </div>
          \` : '<div class="flex-1"></div>'}
          <div class="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span>Hiển thị</span>
            <select id="\${tableId}-pagesize" class="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-sm">
              \${[10, 25, 50, 100].map(n => \`<option value="\${n}" \${state.limit === n ? 'selected' : ''}>\${n}</option>\`).join('')}
            </select>
            <span>dòng/trang</span>
            <button id="\${tableId}-refresh" class="ml-2 p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Tải lại">
              <i data-lucide="rotate-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      \`;
    }

    function renderFilters() {
      if (!opts.filters || !opts.filters.length) return '';
      return \`
        <div class="px-4 py-2 border-b border-slate-700 flex flex-wrap gap-2 items-center">
          \${opts.filters.map(f => renderFilter(f)).join('')}
        </div>
      \`;
    }

    function renderFilter(filter) {
      const current = state.filters[filter.key] || '';
      // Filter dạng chip (tabs)
      if (filter.style !== 'select' && filter.options.length <= 6) {
        return \`
          <span class="text-xs text-slate-400 mr-1">\${esc(filter.label)}:</span>
          \${filter.options.map(opt => \`
            <button data-filter-key="\${filter.key}" data-filter-value="\${escAttr(opt.value)}"
              class="px-2.5 py-1 rounded-md text-xs \${current === opt.value ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              \${esc(opt.label)}
            </button>
          \`).join('')}
        \`;
      }
      // Dropdown
      return \`
        <label class="text-xs text-slate-400 flex items-center gap-1">
          \${esc(filter.label)}:
          <select data-filter-select="\${filter.key}" class="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs">
            \${filter.options.map(opt => \`<option value="\${escAttr(opt.value)}" \${current === opt.value ? 'selected' : ''}>\${esc(opt.label)}</option>\`).join('')}
          </select>
        </label>
      \`;
    }

    function renderBody(startIdx) {
      const colCount = opts.columns.length + (opts.actions ? 1 : 0);
      if (state.loading) {
        return \`<tr><td colspan="\${colCount}" class="px-3 py-12 text-center text-slate-500">
          <i data-lucide="loader" class="w-6 h-6 inline-block animate-spin"></i>
          <div class="mt-2 text-sm">Đang tải...</div>
        </td></tr>\`;
      }
      if (state.error) {
        return \`<tr><td colspan="\${colCount}" class="px-3 py-12 text-center text-red-400">
          <i data-lucide="alert-triangle" class="w-6 h-6 inline-block"></i>
          <div class="mt-2 text-sm">Lỗi: \${esc(state.error)}</div>
          <button onclick="document.getElementById('\${tableId}-refresh').click()" class="mt-2 text-brand-400 text-xs hover:underline">Thử lại</button>
        </td></tr>\`;
      }
      if (!state.items.length) {
        return \`<tr><td colspan="\${colCount}" class="px-3 py-12 text-center text-slate-500">
          <i data-lucide="inbox" class="w-6 h-6 inline-block"></i>
          <div class="mt-2 text-sm">\${esc(opts.emptyMessage || 'Chưa có dữ liệu')}</div>
        </td></tr>\`;
      }
      return state.items.map((row, i) => renderRow(row, startIdx + i + 1)).join('');
    }

    function renderRow(row, stt) {
      const cells = opts.columns.map(col => {
        if (col.key === '__stt') {
          return \`<td class="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap border-t border-slate-700/50">\${stt}</td>\`;
        }
        let val;
        if (typeof col.render === 'function') {
          val = col.render(row, stt);
        } else {
          val = row[col.key];
        }
        if (val === null || val === undefined || val === '') val = '<span class="text-slate-500">—</span>';
        return \`<td class="px-3 py-2.5 border-t border-slate-700/50 \${col.cellClass || ''}">\${val}</td>\`;
      }).join('');

      let actionsCell = '';
      if (opts.actions) {
        const actions = opts.actions(row);
        if (!actions || !actions.length) {
          actionsCell = '<td class="px-3 py-2.5 border-t border-slate-700/50 text-right sticky right-0 bg-slate-800"><span class="text-slate-600 text-xs">—</span></td>';
        } else {
          actionsCell = \`<td class="px-3 py-2.5 border-t border-slate-700/50 text-right whitespace-nowrap sticky right-0 bg-slate-800">
            \${renderActions(actions, row)}
          </td>\`;
        }
      }
      return \`<tr class="hover:bg-slate-700/30">\${cells}\${actionsCell}</tr>\`;
    }

    function renderActions(actions, row) {
      // Desktop: inline buttons (≥ md). Mobile: kebab dropdown.
      const colorMap = {
        green: 'text-emerald-400',
        red: 'text-red-400',
        amber: 'text-amber-400',
        blue: 'text-brand-400',
        slate: 'text-slate-400',
      };
      const inline = actions.map((a, i) => \`
        <button data-row-id="\${row.id}" data-action-idx="\${i}"
          class="\${colorMap[a.color] || 'text-slate-300'} hover:underline text-xs mr-2 last:mr-0" title="\${escAttr(a.label)}">
          <i data-lucide="\${a.icon || 'circle'}" class="w-3.5 h-3.5 inline"></i> \${esc(a.label)}
        </button>
      \`).join('');

      const menuId = 'menu-' + row.id + '-' + Date.now();
      const dropdown = \`
        <div class="relative inline-block md:hidden">
          <button data-menu-toggle="\${menuId}" class="p-1.5 hover:bg-slate-700 rounded">
            <i data-lucide="more-vertical" class="w-4 h-4"></i>
          </button>
          <div id="\${menuId}" data-menu="\${menuId}" class="hidden absolute right-0 top-full mt-1 w-44 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-20 py-1">
            \${actions.map((a, i) => \`
              <button data-row-id="\${row.id}" data-action-idx="\${i}"
                class="block w-full text-left px-3 py-2 text-sm \${colorMap[a.color] || 'text-slate-200'} hover:bg-slate-600">
                <i data-lucide="\${a.icon || 'circle'}" class="w-3.5 h-3.5 inline"></i> \${esc(a.label)}
              </button>
            \`).join('')}
          </div>
        </div>
        <div class="hidden md:inline-block">\${inline}</div>
      \`;
      return dropdown;
    }

    function renderPagination(totalPages) {
      const from = state.total === 0 ? 0 : ((state.page - 1) * state.limit) + 1;
      const to = Math.min(state.total, state.page * state.limit);
      return \`
        <div class="px-4 py-3 border-t border-slate-700 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-sm text-slate-400">
          <div>Hiển thị <strong class="text-slate-200">\${from}-\${to}</strong> / <strong class="text-slate-200">\${state.total}</strong></div>
          <div class="flex items-center gap-1">
            <button id="\${tableId}-first" \${state.page <= 1 ? 'disabled' : ''} class="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <i data-lucide="chevrons-left" class="w-4 h-4"></i>
            </button>
            <button id="\${tableId}-prev" \${state.page <= 1 ? 'disabled' : ''} class="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <span class="px-3 text-xs">Trang <strong class="text-slate-200">\${state.page}</strong> / \${totalPages}</span>
            <button id="\${tableId}-next" \${state.page >= totalPages ? 'disabled' : ''} class="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
            <button id="\${tableId}-last" \${state.page >= totalPages ? 'disabled' : ''} class="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <i data-lucide="chevrons-right" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      \`;
    }

    function wireEvents() {
      const el = (sel) => container.querySelector(sel);
      const all = (sel) => Array.from(container.querySelectorAll(sel));

      // Search debounce
      const searchInput = el('#' + tableId + '-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(() => {
            state.search = e.target.value;
            state.page = 1;
            load();
          }, 400);
        });
      }

      // Page size
      const psEl = el('#' + tableId + '-pagesize');
      if (psEl) psEl.addEventListener('change', (e) => {
        state.limit = Number(e.target.value);
        state.page = 1;
        load();
      });

      // Refresh
      const refreshBtn = el('#' + tableId + '-refresh');
      if (refreshBtn) refreshBtn.addEventListener('click', () => load());

      // Pagination
      const firstBtn = el('#' + tableId + '-first');
      if (firstBtn) firstBtn.addEventListener('click', () => { state.page = 1; load(); });
      const prevBtn = el('#' + tableId + '-prev');
      if (prevBtn) prevBtn.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); load(); });
      const nextBtn = el('#' + tableId + '-next');
      if (nextBtn) nextBtn.addEventListener('click', () => { state.page = state.page + 1; load(); });
      const lastBtn = el('#' + tableId + '-last');
      if (lastBtn) lastBtn.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
        state.page = totalPages;
        load();
      });

      // Filter chips
      all('[data-filter-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.filters[btn.dataset.filterKey] = btn.dataset.filterValue;
          state.page = 1;
          load();
        });
      });
      // Filter dropdowns
      all('[data-filter-select]').forEach(sel => {
        sel.addEventListener('change', () => {
          state.filters[sel.dataset.filterSelect] = sel.value;
          state.page = 1;
          load();
        });
      });

      // Action buttons (inline + dropdown)
      all('[data-action-idx]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const rowId = Number(btn.dataset.rowId);
          const idx = Number(btn.dataset.actionIdx);
          const row = state.items.find(r => r.id === rowId);
          if (!row) return;
          const actions = opts.actions(row);
          if (actions && actions[idx]) {
            // Close any open menu
            all('[data-menu]').forEach(m => m.classList.add('hidden'));
            actions[idx].onClick(row);
          }
        });
      });

      // Mobile kebab toggle
      all('[data-menu-toggle]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.menuToggle;
          const menu = container.querySelector('#' + id);
          // Close all others
          all('[data-menu]').forEach(m => { if (m.id !== id) m.classList.add('hidden'); });
          menu.classList.toggle('hidden');
        });
      });
      // Click outside → close menus
      document.addEventListener('click', closeAllMenus, { once: true });
    }

    function closeAllMenus() {
      container.querySelectorAll('[data-menu]').forEach(m => m.classList.add('hidden'));
    }

    function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function escAttr(s) { return esc(s); }

    // Initial render + load
    render();
    load();

    return {
      reload: load,
      getState: () => ({ ...state }),
      setFilter: (key, value) => { state.filters[key] = value; state.page = 1; load(); },
      setSearch: (q) => { state.search = q; state.page = 1; load(); },
    };
  }

  return { mount };
})();
`;
}
