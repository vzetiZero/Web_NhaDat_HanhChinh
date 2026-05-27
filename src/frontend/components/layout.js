// Shared frontend layout - HTML shell với Tailwind + light theme dịch vụ công VN

import { getConfig } from '../../config/config.js';

export function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/**
 * Render trang public với header + footer + body
 */
export function renderPageShell(env, {
  title,
  bodyHtml,
  pageScript = '',
  requireAuth = false,
  hideHeader = false,
}) {
  const cfg = getConfig(env);
  const siteName = cfg.SITE_NAME;

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(title)} - ${escHtml(siteName)}</title>
<meta name="description" content="${escHtml(cfg.SITE_DESC)}" />
<link rel="icon" id="dynamic-favicon" href="/favicon.svg" type="image/svg+xml" />
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>
  tailwind.config = {
    theme: { extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',500:'#1e40af',600:'#1e3a8a',700:'#172554' },
        accent:  { 500:'#dc2626',600:'#b91c1c' }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui'],
      }
    }}
  };
</script>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<style>
  html, body { max-width: 100%; overflow-x: hidden; }
  body { font-family: "Be Vietnam Pro", ui-sans-serif, system-ui; background: #f8fafc; color: #0f172a; }
  /* Touch target tối thiểu 44px theo Apple HIG & WCAG */
  .btn-primary {
    background:#1e40af; color:#fff; padding:0.75rem 1.25rem; border-radius:0.5rem; font-weight:500;
    min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background .15s;
  }
  .btn-primary:hover { background:#172554; }
  .btn-primary:disabled { background:#94a3b8; cursor:not-allowed; }
  .btn-secondary {
    background:#fff; border:1px solid #cbd5e1; color:#334155; padding:0.75rem 1.25rem; border-radius:0.5rem; font-weight:500;
    min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background .15s;
  }
  .btn-secondary:hover { background:#f1f5f9; }
  .form-label { display:block; font-size:0.875rem; font-weight:500; color:#334155; margin-bottom:0.25rem; }
  .form-label .req { color:#dc2626; margin-left:2px; }
  .form-input, .form-select, .form-textarea {
    width:100%; padding:0.625rem 0.75rem; border:1px solid #cbd5e1; border-radius:0.5rem;
    background:#fff; font-size:1rem; line-height: 1.4; outline:none; transition: border-color .15s;
    min-height: 44px; box-sizing: border-box;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color:#1e40af; box-shadow:0 0 0 3px rgba(30,64,175,0.1); }
  .form-error {
    color:#dc2626; font-size:0.8125rem; margin-top:0.25rem;
    display: flex; align-items: flex-start; gap: 4px;
  }
  .form-error::before { content: "⚠"; flex-shrink: 0; }
  .form-input.invalid, .form-select.invalid, .form-textarea.invalid {
    border-color: #dc2626; background: #fef2f2;
  }
  .form-input.invalid:focus, .form-select.invalid:focus, .form-textarea.invalid:focus {
    box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
  }
  .form-hint  {
    color:#475569; font-size:0.8125rem; margin-top:0.375rem; line-height: 1.4;
    background: #f1f5f9; border-left: 3px solid #1e40af;
    padding: 6px 10px; border-radius: 0 6px 6px 0;
    /* Ẩn mặc định, chỉ hiện khi focus vào input cùng field-row */
    display: none;
    animation: hintFadeIn .12s ease-out;
  }
  .form-hint .ex { color:#0f172a; font-family: ui-monospace, monospace; background:#fff; padding:0 4px; border-radius:3px; border: 1px solid #e2e8f0; }
  .field-row { margin-bottom: 1rem; position: relative; }
  .field-row:focus-within .form-hint { display: block; }
  @keyframes hintFadeIn {
    from { opacity: 0; transform: translateY(-2px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  /* Icon "?" nhỏ bên cạnh label để hint cho user biết có hint */
  .form-label.has-hint::after {
    content: "ⓘ"; color: #94a3b8; font-size: 0.85em; margin-left: 6px;
    cursor: help; transition: color .15s;
  }
  .field-row:focus-within .form-label.has-hint::after { color: #1e40af; }

  /* Autocomplete dropdown */
  .ac-wrap { position: relative; }
  .ac-dropdown {
    position: absolute; z-index: 30; top: 100%; left: 0; right: 0;
    background: #fff; border: 1px solid #cbd5e1; border-radius: 0.5rem;
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
    max-height: 280px; overflow-y: auto; margin-top: 4px;
  }
  .ac-item {
    padding: 8px 12px; cursor: pointer; font-size: 0.875rem;
    border-bottom: 1px solid #f1f5f9;
  }
  .ac-item:last-child { border-bottom: none; }
  .ac-item:hover, .ac-item.focused { background: #eff6ff; }
  .ac-item .sub { color: #64748b; font-size: 0.75rem; }
  .ac-loading { padding: 8px 12px; color: #94a3b8; font-size: 0.8125rem; font-style: italic; }
  .ac-empty { padding: 12px; color: #94a3b8; font-size: 0.8125rem; text-align: center; }

  /* Toggle pill */
  .toggle-pill {
    display: inline-flex; background: #f1f5f9; border-radius: 8px; padding: 3px;
    font-size: 0.8125rem;
  }
  .toggle-pill button {
    padding: 4px 12px; border-radius: 6px; color: #64748b;
    border: none; background: transparent; cursor: pointer; transition: all .15s;
  }
  .toggle-pill button.active { background: #1e40af; color: #fff; font-weight: 500; }

  /* Suggestion banner (đề xuất địa chỉ mới) */
  .suggest-banner {
    margin-top: 6px; padding: 8px 12px; background: #fef9c3; border: 1px solid #fde047;
    border-radius: 0.5rem; font-size: 0.8125rem; color: #713f12;
    display: flex; align-items: flex-start; gap: 8px;
  }
  .suggest-banner button {
    background: #eab308; color: #fff; padding: 2px 10px; border: none; border-radius: 4px;
    font-size: 0.75rem; cursor: pointer; flex-shrink: 0;
  }
  .suggest-banner button:hover { background: #ca8a04; }
  .step-dot {
    width: 36px; height: 36px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 600; background: #e2e8f0; color: #64748b; transition: all .2s;
  }
  .step-dot.active { background: #1e40af; color: #fff; }
  .step-dot.done { background: #16a34a; color: #fff; }
  .step-line { flex: 1; height: 2px; background: #e2e8f0; transition: background .2s; }
  .step-line.done { background: #16a34a; }

  /* Multi-line truncate (line-clamp) */
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

  /* Hide native disclosure marker on <summary> */
  details > summary::-webkit-details-marker { display: none; }
  details > summary { list-style: none; }
</style>
</head>
<body>

${hideHeader ? '' : renderHeader(siteName, requireAuth)}

<main class="min-h-[calc(100dvh-180px)]">
${bodyHtml}
</main>

${renderFooter(siteName)}

<div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

<script>
${commonJs()}
</script>
${pageScript ? `<script>${pageScript}</script>` : ''}
<script>
  if (window.lucide) window.lucide.createIcons();
  ${requireAuth ? 'if (!localStorage.getItem("ctnd_token")) { location.href = "/dang-nhap?next=" + encodeURIComponent(location.pathname + location.search); }' : ''}
</script>

</body>
</html>`;
}

function renderHeader(siteName, requireAuth) {
  return `
<header class="bg-white border-b border-slate-200 sticky top-0 z-40">
  <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 text-primary-500 font-bold text-lg">
      <span data-site-logo><i data-lucide="building-2" class="w-6 h-6"></i></span>
      <span data-site-name>${escHtml(siteName)}</span>
    </a>
    <nav class="hidden md:flex items-center gap-5 text-sm">
      <a href="/" class="hover:text-primary-500">Trang chủ</a>
      <a href="/#mau-hop-dong" class="hover:text-primary-500">Mẫu hợp đồng</a>
      <a href="/bang-dieu-khien" class="hover:text-primary-500">Hợp đồng của tôi</a>
      <a href="/hop-dong/moi" class="hover:text-primary-500">Tạo mới</a>
      <a href="/#lien-he" class="hover:text-primary-500">Liên hệ</a>
      <a href="/tai-khoan" class="hover:text-primary-500">Tài khoản</a>
    </nav>
    <div id="user-menu" class="flex items-center gap-2"></div>
  </div>
</header>`;
}

function renderFooter(siteName) {
  return `
<footer class="bg-white border-t border-slate-200 mt-8">
  <div class="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
    © ${new Date().getFullYear()} <span data-site-name>${escHtml(siteName)}</span> - Hệ thống tạo chứng từ nhà đất.
    <div class="mt-1 text-xs">Tuân thủ Luật Bảo vệ dữ liệu cá nhân (Nghị định 13/2023).</div>
    <div id="footer-contact"></div>
  </div>
</footer>`;
}

function commonJs() {
  return `
// ============ API BASE URL & PATH TRANSLATION ============
// Backend Node.js đứng riêng port 3000. CF Workers (dev) phục vụ HTML port 8787.
// API_BASE có thể override qua localStorage.setItem('ctnd_api_base', 'https://...')
window.API_BASE = (function() {
  const stored = localStorage.getItem('ctnd_api_base');
  if (stored) return stored;
  // Mặc định: trỏ Node backend ở port 3000 cùng host
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? \`\${location.protocol}//\${location.hostname}:3000\`
    : ''; // production: giả định same-origin
})();

// Translate CF Workers paths → Node backend paths
function translatePath(p) {
  if (!p) return p;
  // /admin/api/* → /api/admin/*
  p = p.replace(/^\\/admin\\/api\\//, '/api/admin/');
  // /api/admin/dashboard/stats → /api/admin/dashboard
  p = p.replace(/^\\/api\\/admin\\/dashboard\\/stats(\\?|$)/, '/api/admin/dashboard$1');
  // /api/admin/audit → /api/admin/audit-logs
  p = p.replace(/^\\/api\\/admin\\/audit(\\?|$)/, '/api/admin/audit-logs$1');
  // /api/contracts/:id/render → /api/contracts/:id/generate
  p = p.replace(/^(\\/api\\/contracts\\/[^/]+)\\/render(\\?|$)/, '$1/generate$2');
  return p;
}

window.api = async function(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = localStorage.getItem('ctnd_token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const fp = localStorage.getItem('ctnd_fp');
  if (fp) headers['X-Device-Fingerprint'] = fp;

  const translated = translatePath(path);
  const url = translated.startsWith('http') ? translated : window.API_BASE + translated;

  async function doFetch(targetUrl) {
    const response = await fetch(targetUrl, { ...opts, headers });
    let payload = null;
    try { payload = await response.json(); } catch {}
    return { response, payload };
  }

  let res, data;
  try {
    const r = await doFetch(url);
    res = r.response;
    data = r.payload;
  } catch (err) {
    const canRetrySameOrigin =
      !translated.startsWith('http') &&
      window.API_BASE &&
      translated.startsWith('/api/');
    if (!canRetrySameOrigin) throw err;
    const r = await doFetch(translated);
    res = r.response;
    data = r.payload;
    localStorage.removeItem('ctnd_api_base');
    window.API_BASE = '';
  }

  if (res.status === 401) {
    localStorage.removeItem('ctnd_token');
    localStorage.removeItem('ctnd_user');
    if (!location.pathname.startsWith('/dang-')) location.href = '/dang-nhap';
    throw new Error('Chưa đăng nhập');
  }
  if (res.status === 403 && data?.error === 'DEVICE_MISMATCH') {
    localStorage.removeItem('ctnd_token');
    location.href = '/dang-nhap?err=device';
    throw new Error('Thiết bị không khớp');
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || ('HTTP ' + res.status));
  }
  return data;
};

/**
 * Lấy signed URL cho 1 file đã upload lên Supabase Storage rồi mở tab mới tải.
 * Dùng cho dashboard/contract-detail: thay vì <a href="/api/.../download/docx">
 * dùng: <button onclick="downloadFile(fileId)">.
 */
window.downloadFile = async function(fileId) {
  if (!fileId) { toast('File chưa được tạo', 'warn'); return; }
  try {
    const res = await api('/api/files/' + fileId + '/signed-url');
    window.open(res.url, '_blank');
  } catch (e) {
    toast('Không tải được file: ' + e.message, 'error');
  }
};

window.toast = function(msg, type = 'info') {
  const cont = document.getElementById('toast-container');
  if (!cont) return;
  const colors = { info:'bg-slate-700', success:'bg-emerald-600', error:'bg-red-600', warn:'bg-amber-600' };
  const el = document.createElement('div');
  el.className = (colors[type] || colors.info) + ' text-white px-4 py-2 rounded-md shadow-lg text-sm max-w-md';
  el.textContent = msg;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

// Render user menu
(function renderUserMenu() {
  const el = document.getElementById('user-menu');
  if (!el) return;
  const user = (() => { try { return JSON.parse(localStorage.getItem('ctnd_user') || 'null'); } catch { return null; } })();
  if (user) {
    el.innerHTML = \`
      <span class="text-sm text-slate-600 hidden sm:inline">\${user.full_name || user.email}</span>
      <a href="/tai-khoan" class="text-sm text-slate-600 hover:text-primary-500 px-3 py-1.5 border border-slate-200 rounded-md">Tài khoản</a>
      <button onclick="logout()" class="text-sm text-slate-600 hover:text-red-600 px-3 py-1.5 border border-slate-200 rounded-md">Đăng xuất</button>
    \`;
  } else {
    el.innerHTML = \`
      <a href="/dang-nhap" class="text-sm px-3 py-1.5 text-slate-600 hover:text-primary-500">Đăng nhập</a>
      <a href="/dang-ky" class="text-sm px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600">Đăng ký</a>
    \`;
  }
})();

window.logout = async function() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('ctnd_token');
  localStorage.removeItem('ctnd_user');
  location.href = '/';
};

// ============ Public site settings — fetch 1 lần, cache localStorage 5 phút ============
window.loadPublicSettings = async function(forceRefresh) {
  const CACHE_KEY = 'ctnd_public_settings';
  const TTL_MS = 5 * 60 * 1000;
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && (Date.now() - cached.ts) < TTL_MS) return cached.data;
    } catch {}
  }
  try {
    const res = await fetch(window.API_BASE + '/api/settings/public');
    const j = await res.json();
    const data = j.settings || {};
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
    return data;
  } catch {
    return {};
  }
};

// Áp settings vào DOM: title, favicon, brand name trong header, contact buttons trong footer
window.applyPublicSettings = function(s) {
  if (!s) return;
  // Favicon
  if (s.faviconUrl) {
    const link = document.getElementById('dynamic-favicon');
    if (link) link.href = s.faviconUrl;
  }
  // Màu chủ đạo - override CSS custom properties
  if (s.primaryColor && /^#[0-9a-fA-F]{6}$/.test(s.primaryColor)) {
    document.documentElement.style.setProperty('--brand-color', s.primaryColor);
  }
  // Footer text custom
  if (s.footerText) {
    document.querySelectorAll('[data-footer-text]').forEach(el => { el.textContent = s.footerText; });
  }
  // Site name trong header
  if (s.siteName) {
    document.querySelectorAll('[data-site-name]').forEach(el => { el.textContent = s.siteName; });
  }
  // Logo trong header
  if (s.siteLogoUrl) {
    document.querySelectorAll('[data-site-logo]').forEach(el => {
      el.innerHTML = '<img src="' + s.siteLogoUrl + '" alt="logo" class="w-7 h-7 object-contain" />';
    });
  }
  // Footer contact (nếu trang có placeholder)
  const footerContact = document.getElementById('footer-contact');
  if (footerContact && hasAnyContact(s)) {
    const links = [];
    if (s.adminPhone) links.push('<a href="tel:' + s.adminPhone + '" class="hover:text-primary-500"><i data-lucide="phone" class="w-3 h-3 inline"></i> ' + s.adminPhone + '</a>');
    if (s.adminZaloUrl) links.push('<a href="' + s.adminZaloUrl + '" target="_blank" rel="noopener" class="hover:text-primary-500"><i data-lucide="message-circle" class="w-3 h-3 inline"></i> Zalo</a>');
    if (s.adminFacebookUrl) links.push('<a href="' + s.adminFacebookUrl + '" target="_blank" rel="noopener" class="hover:text-primary-500"><i data-lucide="facebook" class="w-3 h-3 inline"></i> Facebook</a>');
    if (s.adminEmail) links.push('<a href="mailto:' + s.adminEmail + '" class="hover:text-primary-500"><i data-lucide="mail" class="w-3 h-3 inline"></i> ' + s.adminEmail + '</a>');
    footerContact.innerHTML = '<div class="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-slate-500">' + links.join('<span class="text-slate-300">•</span>') + '</div>';
    if (window.lucide) window.lucide.createIcons();
  }
  // Welcome modal (chỉ hiện 1 lần mỗi 24h nếu enabled)
  if (s.modal && s.modal.enabled && s.modal.title) {
    const lastShown = Number(localStorage.getItem('ctnd_modal_last') || 0);
    if (Date.now() - lastShown > 24 * 60 * 60 * 1000) {
      window.showSiteModal(s.modal);
    }
  }
};

window.showSiteModal = function(m) {
  if (document.getElementById('site-modal')) return;
  const overlay = document.createElement('div');
  overlay.id = 'site-modal';
  overlay.className = 'fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4';
  overlay.innerHTML = '<div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 sm:p-6">' +
    '<h3 class="text-lg font-semibold mb-2">' + escapeText(m.title || '') + '</h3>' +
    (m.content ? '<p class="text-sm text-slate-600 whitespace-pre-wrap mb-4">' + escapeText(m.content) + '</p>' : '') +
    '<div class="flex justify-end gap-2 mt-3">' +
      '<button data-site-modal-close class="btn-secondary text-sm">Đóng</button>' +
      (m.buttonUrl && m.buttonText ? '<a href="' + m.buttonUrl + '" target="_blank" rel="noopener" class="btn-primary text-sm">' + escapeText(m.buttonText) + '</a>' : '') +
    '</div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.matches('[data-site-modal-close]')) {
      try { localStorage.setItem('ctnd_modal_last', String(Date.now())); } catch {}
      overlay.remove();
    }
  });
};

function hasAnyContact(s) {
  return !!(s.adminPhone || s.adminZaloUrl || s.adminFacebookUrl || s.adminTelegramUrl || s.adminEmail);
}
function escapeText(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Auto-load settings on every page (non-blocking)
(function autoLoadSettings() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.loadPublicSettings().then(window.applyPublicSettings));
  } else {
    window.loadPublicSettings().then(window.applyPublicSettings);
  }
})();

// FingerprintJS - lazy load + cache
window.getFingerprint = async function() {
  let fp = localStorage.getItem('ctnd_fp');
  if (fp) return fp;
  // Dùng FingerprintJS v4 open-source
  if (!window.FingerprintJS) {
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://openfpcdn.io/fingerprintjs/v4/iife.min.js';
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
  }
  if (window.FingerprintJS) {
    const agent = await window.FingerprintJS.load();
    const r = await agent.get();
    fp = r.visitorId;
  } else {
    // Fallback: random hex (kém an toàn hơn nhưng không block flow)
    fp = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  localStorage.setItem('ctnd_fp', fp);
  return fp;
};
`;
}
