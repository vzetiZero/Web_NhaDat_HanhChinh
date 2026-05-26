// Trang "Thiết bị của tôi" cho user
// Hiển thị thiết bị đã gắn — chỉ 1 record do schema 1-user-1-device.

import { renderPageShell } from '../components/layout.js';

export function renderMyDevicesPage(env) {
  return renderPageShell(env, {
    title: 'Thiết bị của tôi',
    requireAuth: true,
    bodyHtml: `
      <div class="max-w-3xl mx-auto px-4 py-6">
        <div class="mb-4">
          <a href="/bang-dieu-khien" class="text-sm text-slate-500 hover:text-primary-500">
            <i data-lucide="arrow-left" class="w-4 h-4 inline"></i> Về bảng điều khiển
          </a>
        </div>
        <h1 class="text-2xl font-bold mb-2 flex items-center gap-2">
          <i data-lucide="smartphone" class="w-6 h-6 text-primary-500"></i> Thiết bị của tôi
        </h1>
        <p class="text-sm text-slate-500 mb-5">Tài khoản của bạn được giới hạn 1 thiết bị tại một thời điểm. Để chuyển sang thiết bị mới, hãy liên hệ admin để reset.</p>

        <div id="device-root">
          <div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
            <i data-lucide="loader" class="w-6 h-6 inline-block animate-spin"></i>
            <div class="mt-2 text-sm">Đang tải...</div>
          </div>
        </div>

        <div id="contact-admin" class="mt-5"></div>
      </div>
    `,
    pageScript: `
      (async function() {
        try {
          const data = await api('/api/device/me');
          renderDevices(data.items || []);
        } catch (e) {
          document.getElementById('device-root').innerHTML =
            '<div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">Lỗi tải dữ liệu: ' + esc(e.message) + '</div>';
        }
        // Render contact admin từ public settings
        try {
          const s = await window.loadPublicSettings();
          renderContactAdmin(s);
        } catch {}
      })();

      function renderDevices(items) {
        if (!items.length) {
          document.getElementById('device-root').innerHTML = \`
            <div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
              <i data-lucide="smartphone-nfc" class="w-10 h-10 mx-auto opacity-30 mb-2"></i>
              <div class="text-sm">Chưa có thiết bị nào gắn với tài khoản. Hãy đăng nhập từ thiết bị bạn dùng thường xuyên.</div>
            </div>
          \`;
          if (window.lucide) window.lucide.createIcons();
          return;
        }

        const html = items.map(d => deviceCard(d)).join('');
        document.getElementById('device-root').innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
      }

      function deviceCard(d) {
        const isBlocked = d.status === 'blocked';
        const statusBadge = isBlocked
          ? '<span class="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Bị khóa</span>'
          : '<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">Đang hoạt động</span>';

        return \`
          <div class="bg-white rounded-xl border \${isBlocked ? 'border-red-200' : 'border-slate-200'} p-5">
            <div class="flex items-start justify-between mb-4 gap-3 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <i data-lucide="\${deviceIcon(d.deviceType)}" class="w-6 h-6 text-primary-500"></i>
                </div>
                <div>
                  <div class="font-semibold">\${esc(d.deviceType || 'Thiết bị không xác định')}</div>
                  <div class="text-sm text-slate-500">\${esc(d.browser)} trên \${esc(d.os)}</div>
                </div>
              </div>
              \${statusBadge}
            </div>

            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-4">
              <div>
                <dt class="text-xs text-slate-500">Mã thiết bị</dt>
                <dd class="font-mono text-xs">\${esc(d.fingerprintShort || '-')}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">IP gần nhất</dt>
                <dd class="font-mono text-xs">\${esc(d.ipAddress || '-')}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Gắn lần đầu</dt>
                <dd>\${safeDate(d.boundAt)}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Đăng nhập gần nhất</dt>
                <dd>\${safeDate(d.lastUsedAt)}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-slate-500">Số lần đã reset</dt>
                <dd>\${d.resetCount || 0} lần</dd>
              </div>
            </dl>

            \${isBlocked ? \`
              <div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                <i data-lucide="alert-triangle" class="w-4 h-4 mt-0.5"></i>
                <span>Thiết bị này đang bị quản trị viên khóa. Vui lòng liên hệ admin bên dưới để được hỗ trợ.</span>
              </div>
            \` : ''}
          </div>
        \`;
      }

      function deviceIcon(type) {
        if (!type) return 'help-circle';
        if (type === 'iPhone' || (typeof type === 'string' && (type.startsWith('Android Phone') || type === 'Mobile'))) return 'smartphone';
        if (type === 'iPad' || (typeof type === 'string' && type.startsWith('Android Tablet'))) return 'tablet';
        return 'monitor';
      }

      function renderContactAdmin(s) {
        if (!s || (!s.adminPhone && !s.adminZaloUrl && !s.adminFacebookUrl && !s.adminEmail)) return;
        const links = [];
        if (s.adminPhone) links.push('<a href="tel:' + esc(s.adminPhone) + '" class="px-3 py-2 border border-primary-500 text-primary-500 rounded-md text-sm inline-flex items-center gap-1 hover:bg-blue-50"><i data-lucide="phone" class="w-4 h-4"></i> ' + esc(s.adminPhone) + '</a>');
        if (s.adminZaloUrl) links.push('<a href="' + esc(s.adminZaloUrl) + '" target="_blank" rel="noopener" class="px-3 py-2 border border-primary-500 text-primary-500 rounded-md text-sm inline-flex items-center gap-1 hover:bg-blue-50"><i data-lucide="message-circle" class="w-4 h-4"></i> Zalo</a>');
        if (s.adminFacebookUrl) links.push('<a href="' + esc(s.adminFacebookUrl) + '" target="_blank" rel="noopener" class="px-3 py-2 border border-primary-500 text-primary-500 rounded-md text-sm inline-flex items-center gap-1 hover:bg-blue-50"><i data-lucide="facebook" class="w-4 h-4"></i> Facebook</a>');
        if (s.adminEmail) links.push('<a href="mailto:' + esc(s.adminEmail) + '" class="px-3 py-2 border border-primary-500 text-primary-500 rounded-md text-sm inline-flex items-center gap-1 hover:bg-blue-50"><i data-lucide="mail" class="w-4 h-4"></i> Email</a>');
        document.getElementById('contact-admin').innerHTML = \`
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h2 class="font-semibold mb-3 text-slate-700 flex items-center gap-2"><i data-lucide="life-buoy" class="w-4 h-4"></i> Cần hỗ trợ?</h2>
            <div class="flex flex-wrap gap-2">\${links.join('')}</div>
          </div>
        \`;
        if (window.lucide) window.lucide.createIcons();
      }

      function safeDate(s) { try { return s ? new Date(s).toLocaleString('vi-VN') : '-'; } catch { return s || '-'; } }
      function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    `,
  });
}
