// Admin panel HTML - Tailwind dark theme, SPA hash-routing
// Toàn bộ admin app inline để giảm số request

import { getConfig } from '../config/config.js';
import { getAdminAppScript } from './js/app.js';

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

export function renderAdminLayout(env) {
  const cfg = getConfig(env);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Admin - ${escapeHtml(cfg.SITE_NAME)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: { extend: {
      colors: {
        brand: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' }
      }
    }}
  };
</script>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
  .nav-item.active { background-color: rgb(51 65 85); color: #60a5fa; border-left: 3px solid #3b82f6; }
  .btn-primary { @apply bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md font-medium; }
  table th { @apply px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400 border-b border-slate-700; }
  table td { @apply px-3 py-2 text-sm border-b border-slate-700/50; }
  table tbody tr:hover { background: rgba(51,65,85,0.4); }
</style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">

<!-- LOGIN SCREEN -->
<div id="login-screen" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900">
  <div class="w-full max-w-sm bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
    <div class="text-center mb-6">
      <i data-lucide="shield-check" class="w-12 h-12 mx-auto text-brand-500 mb-2"></i>
      <h1 class="text-xl font-bold">Đăng nhập quản trị</h1>
      <p class="text-sm text-slate-400 mt-1">${escapeHtml(cfg.SITE_NAME)}</p>
    </div>
    <form id="login-form" class="space-y-3">
      <input type="email" name="email" placeholder="Email admin" required
        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:border-brand-500" />
      <input type="password" name="password" placeholder="Mật khẩu" required
        class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:border-brand-500" />
      <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-md font-medium">
        Đăng nhập
      </button>
      <div id="login-error" class="text-red-400 text-sm hidden"></div>
    </form>
  </div>
</div>

<!-- APP SHELL -->
<div id="app-shell" class="hidden h-screen">
  <aside class="w-60 bg-slate-800 border-r border-slate-700 flex flex-col fixed inset-y-0 left-0">
    <div class="px-4 py-4 border-b border-slate-700">
      <div class="flex items-center gap-2">
        <i data-lucide="building-2" class="w-6 h-6 text-brand-500"></i>
        <div>
          <div class="font-bold text-sm">${escapeHtml(cfg.SITE_NAME)}</div>
          <div class="text-xs text-slate-400">Quản trị</div>
        </div>
      </div>
    </div>
    <nav id="sidebar-nav" class="flex-1 overflow-y-auto scrollbar-thin py-2">
      <a data-route="dashboard" href="#/dashboard" class="nav-item flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 cursor-pointer border-l-3 border-transparent">
        <i data-lucide="layout-dashboard" class="w-4 h-4"></i> Tổng quan
      </a>
      <a data-route="contracts" href="#/contracts" class="nav-item flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 cursor-pointer">
        <i data-lucide="file-text" class="w-4 h-4"></i> Hợp đồng
      </a>
      <a data-route="users" href="#/users" class="nav-item flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 cursor-pointer">
        <i data-lucide="users" class="w-4 h-4"></i> Người dùng
      </a>
      <a data-route="templates" href="#/templates" class="nav-item flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 cursor-pointer">
        <i data-lucide="file-cog" class="w-4 h-4"></i> Mẫu hợp đồng
      </a>
      <a data-route="audit" href="#/audit" class="nav-item flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 cursor-pointer">
        <i data-lucide="scroll-text" class="w-4 h-4"></i> Nhật ký
      </a>
    </nav>
    <div class="p-3 border-t border-slate-700">
      <div id="user-info" class="text-xs text-slate-400 mb-2 truncate"></div>
      <button id="logout-btn" class="w-full text-sm px-3 py-1.5 border border-slate-600 hover:bg-slate-700 rounded-md flex items-center justify-center gap-2">
        <i data-lucide="log-out" class="w-4 h-4"></i> Đăng xuất
      </button>
    </div>
  </aside>

  <main class="flex-1 overflow-y-auto ml-60">
    <div id="page-content" class="p-6 max-w-7xl mx-auto"></div>
  </main>
</div>

<div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

<script>
${getAdminAppScript()}
</script>

</body>
</html>`;
}
