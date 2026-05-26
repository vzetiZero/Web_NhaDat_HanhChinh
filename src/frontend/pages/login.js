// Trang đăng nhập

import { renderPageShell } from '../components/layout.js';

export function renderLoginPage(env) {
  return renderPageShell(env, {
    title: 'Đăng nhập',
    bodyHtml: `
      <div class="min-h-[calc(100dvh-180px)] flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div class="w-full max-w-md">
          <div class="bg-white border border-slate-200 rounded-2xl shadow-md p-5 sm:p-7">
            <div class="text-center mb-5">
              <i data-lucide="log-in" class="w-9 h-9 sm:w-10 sm:h-10 text-primary-500 inline-block mb-2"></i>
              <h1 class="text-xl sm:text-2xl font-bold">Đăng nhập</h1>
              <p class="text-sm text-slate-500 mt-1">Sử dụng tài khoản đã được cấp</p>
            </div>

            <div id="err-box" class="hidden mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md break-words"></div>

            <form id="login-form" class="space-y-4">
              <div>
                <label class="form-label" for="login-email">Email <span class="req">*</span></label>
                <input id="login-email" type="email" name="email" required class="form-input" autocomplete="email" inputmode="email" />
              </div>
              <div>
                <label class="form-label" for="login-password">Mật khẩu <span class="req">*</span></label>
                <input id="login-password" type="password" name="password" required class="form-input" autocomplete="current-password" />
              </div>
              <button id="login-submit" type="submit" class="w-full btn-primary">
                <span id="submit-text">Đăng nhập</span>
              </button>
            </form>

            <div class="mt-4 text-center text-sm text-slate-500">
              Chưa có tài khoản? <a href="/dang-ky" class="text-primary-500 hover:underline">Đăng ký ngay</a>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
              <i data-lucide="shield-check" class="w-3 h-3 inline"></i>
              Tài khoản của bạn được gắn với 1 thiết bị duy nhất để đảm bảo an toàn
            </div>
          </div>
        </div>
      </div>
    `,
    pageScript: `
      (function() {
        const params = new URLSearchParams(location.search);
        if (params.get('err') === 'device') {
          const box = document.getElementById('err-box');
          box.textContent = 'Tài khoản đã gắn với thiết bị khác. Vui lòng liên hệ quản trị viên để reset.';
          box.classList.remove('hidden');
        }

        document.getElementById('login-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submit-text');
          const submitBtn = document.getElementById('login-submit');
          const errBox = document.getElementById('err-box');
          errBox.classList.add('hidden');
          submitBtn.disabled = true;
          btn.textContent = 'Đang đăng nhập...';
          try {
            const fp = await getFingerprint();
            const fd = new FormData(e.target);
            // Gọi raw fetch để parse 403 status response thay vì throw
            const url = window.API_BASE + '/api/auth/login';
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Device-Fingerprint': fp },
              body: JSON.stringify({
                email: fd.get('email'),
                password: fd.get('password'),
                fingerprint: fp,
              }),
            });
            const data = await res.json().catch(() => ({}));

            // Status-specific responses (403 + error code)
            if (res.status === 403 && data && data.error && data.error.startsWith('ACCOUNT_')) {
              try { sessionStorage.setItem('ctnd_pending_user', JSON.stringify(data.details || {})); } catch {}
              const statusKey = data.error === 'ACCOUNT_PENDING' ? 'pending'
                : data.error === 'ACCOUNT_REJECTED' ? 'rejected'
                : 'blocked';
              location.href = '/tai-khoan-cho-duyet?status=' + statusKey;
              return;
            }
            if (!res.ok || data?.success === false) {
              throw new Error(data?.message || ('HTTP ' + res.status));
            }
            localStorage.setItem('ctnd_token', data.token);
            localStorage.setItem('ctnd_user', JSON.stringify(data.user));
            const next = params.get('next') || (data.user.is_admin ? '/admin' : '/bang-dieu-khien');
            location.href = next;
          } catch (err) {
            errBox.textContent = err.message;
            errBox.classList.remove('hidden');
            btn.textContent = 'Đăng nhập';
            submitBtn.disabled = false;
          }
        });
      })();
    `,
  });
}
