import { renderPageShell } from '../components/layout.js';

export function renderForgotPasswordPage(env) {
  return renderPageShell(env, {
    title: 'Quên mật khẩu',
    hideHeader: true,
    bodyHtml: `
      <div class="min-h-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-[420px] bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h1 class="text-xl font-bold mb-1">Quên mật khẩu</h1>
          <p class="text-sm text-slate-500 mb-5">Nhập email hoặc số điện thoại đã đăng ký.</p>
          <form id="forgot-form" class="space-y-4">
            <div>
              <label class="form-label">Email hoặc số điện thoại</label>
              <input name="identifier" class="form-input min-h-[44px]" required />
            </div>
            <button id="forgot-submit" class="btn-primary w-full min-h-[44px]">Gửi hướng dẫn</button>
          </form>
          <div id="forgot-result" class="hidden mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"></div>
          <div class="mt-4 text-center text-sm"><a href="/dang-nhap" class="text-primary-500 hover:underline">Quay lại đăng nhập</a></div>
        </div>
      </div>
    `,
    pageScript: `
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = String(new FormData(e.target).get('identifier') || '').trim();
  const payload = identifier.includes('@') ? { email: identifier } : { phone: identifier };
  const btn = document.getElementById('forgot-submit');
  const box = document.getElementById('forgot-result');
  btn.disabled = true; btn.textContent = 'Đang gửi...';
  try {
    const res = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
    box.textContent = res.message || 'Nếu thông tin tồn tại trong hệ thống, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.';
    if (res.dev_reset_token) box.innerHTML += '<div class="mt-2 text-xs break-all">Dev token: ' + res.dev_reset_token + '</div>';
    box.classList.remove('hidden');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Gửi hướng dẫn';
  }
});
`,
  });
}

export function renderResetPasswordPage(env) {
  return renderPageShell(env, {
    title: 'Đặt lại mật khẩu',
    hideHeader: true,
    bodyHtml: `
      <div class="min-h-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-[420px] bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h1 class="text-xl font-bold mb-1">Đặt lại mật khẩu</h1>
          <p class="text-sm text-slate-500 mb-5">Nhập token/OTP và mật khẩu mới.</p>
          <form id="reset-form" class="space-y-4">
            <div>
              <label class="form-label">Token/OTP</label>
              <input name="token" class="form-input min-h-[44px]" required />
            </div>
            <div>
              <label class="form-label">Mật khẩu mới</label>
              <input type="password" name="new_password" class="form-input min-h-[44px]" required />
            </div>
            <div>
              <label class="form-label">Nhập lại mật khẩu mới</label>
              <input type="password" name="confirm_password" class="form-input min-h-[44px]" required />
            </div>
            <button id="reset-submit" class="btn-primary w-full min-h-[44px]">Đặt lại mật khẩu</button>
          </form>
          <div class="mt-4 text-center text-sm"><a href="/dang-nhap" class="text-primary-500 hover:underline">Quay lại đăng nhập</a></div>
        </div>
      </div>
    `,
    pageScript: `
const tokenFromUrl = new URLSearchParams(location.search).get('token');
if (tokenFromUrl) document.querySelector('[name="token"]').value = tokenFromUrl;
document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  if (payload.new_password !== payload.confirm_password) return toast('Xác nhận mật khẩu mới không khớp', 'error');
  const btn = document.getElementById('reset-submit');
  btn.disabled = true; btn.textContent = 'Đang xử lý...';
  try {
    await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) });
    toast('Đặt lại mật khẩu thành công.', 'success');
    setTimeout(() => location.href = '/dang-nhap', 700);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Đặt lại mật khẩu';
  }
});
`,
  });
}
