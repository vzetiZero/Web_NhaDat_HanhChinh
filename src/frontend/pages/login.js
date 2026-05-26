// Trang đăng nhập

import { renderPageShell } from '../components/layout.js';

export function renderLoginPage(env) {
  return renderPageShell(env, {
    title: 'Đăng nhập',
    bodyHtml: `
      <div class="max-w-md mx-auto px-4 py-12">
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div class="text-center mb-5">
            <i data-lucide="log-in" class="w-10 h-10 text-primary-500 inline-block mb-2"></i>
            <h1 class="text-2xl font-bold">Đăng nhập</h1>
            <p class="text-sm text-slate-500 mt-1">Sử dụng tài khoản đã được cấp</p>
          </div>

          <div id="err-box" class="hidden mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md"></div>

          <form id="login-form" class="space-y-3">
            <div>
              <label class="form-label">Email <span class="req">*</span></label>
              <input type="email" name="email" required class="form-input" autocomplete="email" />
            </div>
            <div>
              <label class="form-label">Mật khẩu <span class="req">*</span></label>
              <input type="password" name="password" required class="form-input" autocomplete="current-password" />
            </div>
            <button type="submit" class="w-full btn-primary">
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
          const errBox = document.getElementById('err-box');
          errBox.classList.add('hidden');
          btn.textContent = 'Đang đăng nhập...';
          try {
            const fp = await getFingerprint();
            const fd = new FormData(e.target);
            const data = await api('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({
                email: fd.get('email'),
                password: fd.get('password'),
                fingerprint: fp,
              }),
            });
            localStorage.setItem('ctnd_token', data.token);
            localStorage.setItem('ctnd_user', JSON.stringify(data.user));
            const next = params.get('next') || (data.user.is_admin ? '/admin' : '/bang-dieu-khien');
            location.href = next;
          } catch (err) {
            errBox.textContent = err.message;
            errBox.classList.remove('hidden');
            btn.textContent = 'Đăng nhập';
          }
        });
      })();
    `,
  });
}
