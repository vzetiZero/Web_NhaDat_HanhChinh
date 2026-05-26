// Trang trạng thái tài khoản: pending | rejected | blocked
// - Hiển thị thông báo theo settings (lấy từ /api/settings/public)
// - Hiển thị info user đã gửi (từ sessionStorage hoặc query string)
// - Render nút liên hệ admin: Phone / Zalo / Facebook / Telegram / Email

import { renderPageShell } from '../components/layout.js';

export function renderAccountStatusPage(env) {
  return renderPageShell(env, {
    title: 'Trạng thái tài khoản',
    bodyHtml: `
      <div class="min-h-[calc(100dvh-180px)] flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div class="w-full max-w-2xl">
          <div id="status-card" class="bg-white border border-slate-200 rounded-2xl shadow-md p-5 sm:p-8">
            <div class="text-center py-8 text-slate-500">
              <i data-lucide="loader" class="w-8 h-8 inline-block animate-spin"></i>
              <div class="mt-2 text-sm">Đang tải...</div>
            </div>
          </div>
        </div>
      </div>
    `,
    pageScript: `
      (async function() {
        const params = new URLSearchParams(location.search);
        const status = params.get('status') || 'pending';
        const fresh = params.get('fresh') === '1';

        let user = {};
        try { user = JSON.parse(sessionStorage.getItem('ctnd_pending_user') || '{}'); } catch {}

        // Fetch public settings để lấy nội dung + liên hệ admin
        let settings = {};
        try {
          const r = await fetch(window.API_BASE + '/api/settings/public');
          const j = await r.json();
          settings = j.settings || {};
        } catch {}

        renderStatus(status, user, settings, fresh);
      })();

      function renderStatus(status, user, settings, fresh) {
        const cfg = {
          pending: {
            icon: 'clock',
            color: 'amber',
            title: 'Tài khoản đang chờ duyệt',
            message: settings.pendingUserMessage || 'Tài khoản của bạn đã được tạo và đang chờ quản trị viên duyệt.',
          },
          rejected: {
            icon: 'x-octagon',
            color: 'red',
            title: 'Tài khoản chưa được chấp thuận',
            message: settings.rejectedUserMessage || 'Tài khoản của bạn không được phê duyệt.',
          },
          blocked: {
            icon: 'lock',
            color: 'red',
            title: 'Tài khoản đã bị khóa',
            message: 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.',
          },
        }[status] || { icon: 'info', color: 'slate', title: 'Trạng thái tài khoản', message: '' };

        const colorMap = {
          amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
          red:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   icon: 'text-red-500' },
          slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-500' },
        }[cfg.color];

        const rejectReason = user.rejectReason || '';
        const html = \`
          \${fresh ? '<div class="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md flex items-start gap-2"><i data-lucide="check-circle" class="w-4 h-4 mt-0.5"></i><span>Đăng ký thành công! Hệ thống đã ghi nhận yêu cầu của bạn.</span></div>' : ''}

          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full \${colorMap.bg} \${colorMap.icon} mb-3">
              <i data-lucide="\${cfg.icon}" class="w-8 h-8"></i>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold">\${esc(cfg.title)}</h1>
            <p class="text-sm text-slate-600 mt-2 max-w-md mx-auto">\${esc(cfg.message)}</p>
          </div>

          \${status === 'rejected' && rejectReason ? \`
            <div class="\${colorMap.bg} \${colorMap.border} border rounded-lg p-4 mb-5">
              <div class="text-xs font-semibold uppercase tracking-wide \${colorMap.text} mb-1">Lý do từ chối</div>
              <div class="text-sm \${colorMap.text}">\${esc(rejectReason)}</div>
            </div>
          \` : ''}

          \${(user.fullName || user.email || user.phone) ? \`
            <fieldset class="border border-slate-200 rounded-lg p-4 mb-5">
              <legend class="text-xs font-semibold text-slate-500 px-2 uppercase">Thông tin bạn đã gửi</legend>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                \${user.fullName ? \`<div><dt class="text-slate-500 text-xs">Họ tên</dt><dd class="font-medium">\${esc(user.fullName)}</dd></div>\` : ''}
                \${user.email ? \`<div><dt class="text-slate-500 text-xs">Email</dt><dd class="font-medium break-all">\${esc(user.email)}</dd></div>\` : ''}
                \${user.phone ? \`<div><dt class="text-slate-500 text-xs">Số điện thoại</dt><dd class="font-medium">\${esc(user.phone)}</dd></div>\` : ''}
                \${user.registerNote ? \`<div class="sm:col-span-2"><dt class="text-slate-500 text-xs">Ghi chú đăng ký</dt><dd class="text-sm">\${esc(user.registerNote)}</dd></div>\` : ''}
              </dl>
            </fieldset>
          \` : ''}

          <fieldset class="border border-slate-200 rounded-lg p-4 mb-5">
            <legend class="text-xs font-semibold text-slate-500 px-2 uppercase">Liên hệ quản trị viên</legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              \${contactButton('phone', 'Gọi điện', settings.adminPhone ? 'tel:' + settings.adminPhone : '', settings.adminPhone)}
              \${contactButton('message-circle', 'Chat Zalo', settings.adminZaloUrl, 'Mở Zalo')}
              \${contactButton('facebook', 'Facebook', settings.adminFacebookUrl, 'Mở Facebook')}
              \${contactButton('send', 'Telegram', settings.adminTelegramUrl, 'Mở Telegram')}
              \${contactButton('mail', 'Email', settings.adminEmail ? 'mailto:' + settings.adminEmail : '', settings.adminEmail)}
            </div>
            \${!hasAnyContact(settings) ? '<p class="text-sm text-slate-400 italic mt-2">Quản trị viên chưa cấu hình thông tin liên hệ.</p>' : ''}
          </fieldset>

          <div class="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <a href="/" class="btn-secondary text-sm text-center"><i data-lucide="home" class="w-4 h-4 inline"></i> Về trang chủ</a>
            <a href="/dang-nhap" class="btn-primary text-sm text-center"><i data-lucide="log-in" class="w-4 h-4 inline"></i> Đăng nhập lại</a>
          </div>
        \`;
        document.getElementById('status-card').innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
      }

      function contactButton(icon, label, href, displayText) {
        if (!href || !displayText) {
          return \`<div class="px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-400 text-sm flex items-center gap-2">
            <i data-lucide="\${icon}" class="w-4 h-4"></i> \${esc(label)} <span class="text-xs">— chưa có</span>
          </div>\`;
        }
        return \`<a href="\${esc(href)}" target="_blank" rel="noopener noreferrer"
          class="px-3 py-2.5 rounded-md border border-primary-500 bg-white text-primary-500 hover:bg-blue-50 text-sm flex items-center gap-2 min-h-[44px]">
          <i data-lucide="\${icon}" class="w-4 h-4 flex-shrink-0"></i>
          <span class="truncate"><strong>\${esc(label)}:</strong> \${esc(displayText)}</span>
        </a>\`;
      }

      function hasAnyContact(s) {
        return !!(s.adminPhone || s.adminZaloUrl || s.adminFacebookUrl || s.adminTelegramUrl || s.adminEmail);
      }

      function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    `,
  });
}
