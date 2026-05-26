// Trang đăng ký tài khoản

import { renderPageShell } from '../components/layout.js';

export function renderRegisterPage(env) {
  return renderPageShell(env, {
    title: 'Đăng ký',
    bodyHtml: `
      <div class="max-w-md mx-auto px-4 py-12">
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div class="text-center mb-5">
            <i data-lucide="user-plus" class="w-10 h-10 text-primary-500 inline-block mb-2"></i>
            <h1 class="text-2xl font-bold">Đăng ký tài khoản</h1>
            <p class="text-sm text-slate-500 mt-1">Thiết bị hiện tại sẽ được gắn với tài khoản</p>
          </div>

          <div id="err-box" class="hidden mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md"></div>

          <form id="reg-form" class="space-y-3">
            <div>
              <label class="form-label">Họ và tên <span class="req">*</span></label>
              <input type="text" name="full_name" required class="form-input" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label class="form-label">Email <span class="req">*</span></label>
              <input type="email" name="email" required class="form-input" autocomplete="email" />
            </div>
            <div>
              <label class="form-label">Số điện thoại</label>
              <input type="tel" name="phone" class="form-input" placeholder="0912345678" />
            </div>
            <div>
              <label class="form-label">Mật khẩu <span class="req">*</span></label>
              <input type="password" name="password" required class="form-input" autocomplete="new-password" />
              <div class="form-hint">Tối thiểu 8 ký tự, có chữ và số</div>
            </div>
            <button type="submit" class="w-full btn-primary">
              <span id="submit-text">Tạo tài khoản</span>
            </button>
          </form>

          <div class="mt-4 text-center text-sm text-slate-500">
            Đã có tài khoản? <a href="/dang-nhap" class="text-primary-500 hover:underline">Đăng nhập</a>
          </div>
        </div>
      </div>
    `,
    pageScript: `
      document.getElementById('reg-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-text');
        const errBox = document.getElementById('err-box');
        errBox.classList.add('hidden');
        btn.textContent = 'Đang xử lý...';
        try {
          const fp = await getFingerprint();
          const fd = new FormData(e.target);
          const data = await api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: fd.get('email'),
              password: fd.get('password'),
              full_name: fd.get('full_name'),
              phone: fd.get('phone'),
              fingerprint: fp,
            }),
          });
          localStorage.setItem('ctnd_token', data.token);
          localStorage.setItem('ctnd_user', JSON.stringify(data.user));
          location.href = '/bang-dieu-khien';
        } catch (err) {
          errBox.textContent = err.message;
          errBox.classList.remove('hidden');
          btn.textContent = 'Tạo tài khoản';
        }
      });
    `,
  });
}
