// Admin SPA - inline JS string trả về từ getAdminAppScript()
// Tất cả import từ các page module được nối lại thành 1 string

import { dashboardPageJs } from './pages/dashboard.js';
import { contractsPageJs } from './pages/contracts.js';
import { usersPageJs } from './pages/users.js';
import { templatesPageJs } from './pages/templates.js';
import { auditPageJs } from './pages/audit.js';
import { agenciesPageJs } from './pages/agencies.js';

export function getAdminAppScript() {
  return `
'use strict';

// ============ State & helpers ============
const TOKEN_KEY = 'ctnd_admin_token';
const USER_KEY = 'ctnd_admin_user';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: (() => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } })(),
  currentRoute: null,
};

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function toast(msg, type = 'info') {
  const container = $('#toast-container');
  const colors = { info: 'bg-slate-700', success: 'bg-emerald-600', error: 'bg-red-600', warn: 'bg-amber-600' };
  const el = document.createElement('div');
  el.className = \`\${colors[type] || colors.info} text-white px-4 py-2 rounded-md shadow-lg text-sm max-w-sm animate-pulse\`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ============ API BASE & PATH TRANSLATION ============
const API_BASE = (function() {
  const stored = localStorage.getItem('ctnd_api_base');
  if (stored) return stored;
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? \`\${location.protocol}//\${location.hostname}:3000\`
    : '';
})();

// /admin/api/audit → /api/admin/audit-logs (cùng các path translation khác)
function translatePath(p) {
  if (!p) return p;
  p = p.replace(/^\\/admin\\/api\\//, '/api/admin/');
  p = p.replace(/^\\/api\\/admin\\/dashboard\\/stats(\\?|$)/, '/api/admin/dashboard$1');
  p = p.replace(/^\\/api\\/admin\\/audit(\\?|$)/, '/api/admin/audit-logs$1');
  return p;
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const translated = translatePath(path);
  const url = translated.startsWith('http') ? translated : API_BASE + translated;
  const res = await fetch(url, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.status === 401) {
    logout();
    throw new Error('Phiên đăng nhập hết hạn');
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || \`HTTP \${res.status}\`);
  }
  return data;
}

// Helper: lấy URL upload chuẩn (vì multer fetch không qua adminApi wrapper)
window.adminApiBase = API_BASE;
window.adminTranslatePath = translatePath;

// adminDownload: lấy signed URL file rồi mở tab mới tải
window.adminDownload = async function(fileId) {
  if (!fileId) { toast('File không tồn tại', 'warn'); return; }
  try {
    const res = await api('/api/files/' + fileId + '/signed-url');
    window.open(res.url, '_blank');
  } catch (e) {
    toast('Lỗi tải file: ' + e.message, 'error');
  }
};

window.adminApi = api;
window.adminToast = toast;
window.adminState = state;
window.adminFmt = {
  date(s) {
    if (!s) return '-';
    // Hỗ trợ cả ISO (Node) và "YYYY-MM-DD HH:MM:SS" (CF SQLite)
    const d = new Date(typeof s === 'string' && !s.includes('T') ? s.replace(' ', 'T') + 'Z' : s);
    return d.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },
  bool(v, t = 'Có', f = 'Không') { return v ? t : f; },
  truncate(s, n = 40) { if (!s) return ''; return s.length > n ? s.slice(0, n) + '...' : s; },
  badge(text, color = 'slate') {
    const map = {
      slate: 'bg-slate-700 text-slate-200',
      green: 'bg-emerald-700 text-emerald-100',
      red: 'bg-red-700 text-red-100',
      blue: 'bg-blue-700 text-blue-100',
      amber: 'bg-amber-700 text-amber-100',
    };
    return \`<span class="\${map[color] || map.slate} px-2 py-0.5 rounded text-xs">\${text}</span>\`;
  },
};

// ============ Auth ============
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  state.token = null; state.user = null;
  showLogin();
}
window.adminLogout = logout;

function showLogin() {
  $('#app-shell').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  $('#login-screen').classList.add('flex');
}

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#login-screen').classList.remove('flex');
  $('#app-shell').classList.remove('hidden');
  $('#app-shell').classList.add('flex');
  $('#user-info').textContent = state.user?.email || '';
  navigate();
  if (window.lucide) window.lucide.createIcons();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errBox = $('#login-error');
  errBox.classList.add('hidden');
  try {
    const data = await api('/admin/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    });
    state.token = data.token; state.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    showApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
}

// ============ Router ============
const routes = {
  dashboard: { title: 'Tổng quan', render: () => window.adminPageDashboard() },
  contracts: { title: 'Hợp đồng', render: () => window.adminPageContracts() },
  users: { title: 'Người dùng', render: () => window.adminPageUsers() },
  templates: { title: 'Mẫu hợp đồng', render: () => window.adminPageTemplates() },
  agencies: { title: 'Cơ quan cấp GCN', render: () => window.adminPageAgencies() },
  audit: { title: 'Nhật ký', render: () => window.adminPageAudit() },
};

function navigate() {
  const hash = location.hash.replace(/^#\\//, '') || 'dashboard';
  const route = routes[hash] || routes.dashboard;
  state.currentRoute = hash;
  $$('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash);
  });
  $('#page-content').innerHTML = '<div class="text-center text-slate-500 py-12"><i data-lucide="loader" class="w-6 h-6 animate-spin inline-block"></i> Đang tải...</div>';
  if (window.lucide) window.lucide.createIcons();
  Promise.resolve(route.render()).catch(err => {
    $('#page-content').innerHTML = \`<div class="text-red-400 py-8">Lỗi: \${err.message}</div>\`;
  });
}

// ============ Page modules ============
${dashboardPageJs()}
${contractsPageJs()}
${usersPageJs()}
${templatesPageJs()}
${agenciesPageJs()}
${auditPageJs()}

// ============ Boot ============
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  $('#login-form').addEventListener('submit', handleLoginSubmit);
  $('#logout-btn').addEventListener('click', logout);
  window.addEventListener('hashchange', navigate);

  if (state.token && state.user) {
    showApp();
  } else {
    showLogin();
  }
});
`;
}
