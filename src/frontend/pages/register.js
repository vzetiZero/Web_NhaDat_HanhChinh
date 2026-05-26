// Trang đăng ký tài khoản

import { renderPageShell } from '../components/layout.js';

export function renderRegisterPage(env) {
  return renderPageShell(env, {
    title: 'Đăng ký',
    bodyHtml: `
      <div class="min-h-[calc(100dvh-180px)] flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div class="w-full max-w-md">
          <div class="bg-white border border-slate-200 rounded-2xl shadow-md p-5 sm:p-7">
            <div class="text-center mb-5">
              <i data-lucide="user-plus" class="w-9 h-9 sm:w-10 sm:h-10 text-primary-500 inline-block mb-2"></i>
              <h1 class="text-xl sm:text-2xl font-bold">Đăng ký tài khoản</h1>
              <p class="text-sm text-slate-500 mt-1">Thiết bị hiện tại sẽ được gắn với tài khoản</p>
            </div>

            <div id="err-box" class="hidden mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md break-words"></div>

            <form id="reg-form" class="space-y-4">
              <div>
                <label class="form-label" for="reg-name">Họ và tên <span class="req">*</span></label>
                <input id="reg-name" type="text" name="full_name" required class="form-input" placeholder="Nguyễn Văn A" autocomplete="name" />
              </div>
              <div>
                <label class="form-label" for="reg-email">Email <span class="req">*</span></label>
                <input id="reg-email" type="email" name="email" required class="form-input" autocomplete="email" inputmode="email" />
              </div>
              <div>
                <label class="form-label" for="reg-phone">Số điện thoại</label>
                <input id="reg-phone" type="tel" name="phone" class="form-input" placeholder="0912345678" autocomplete="tel" inputmode="tel" />
              </div>
              <div>
                <label class="form-label" for="reg-password">Mật khẩu <span class="req">*</span></label>
                <input id="reg-password" type="password" name="password" required class="form-input" autocomplete="new-password" minlength="8" />
                <div class="text-xs text-slate-500 mt-1">Tối thiểu 8 ký tự, có chữ và số</div>
              </div>
              <div>
                <label class="form-label" for="reg-note">Ghi chú (gửi cho admin)</label>
                <textarea id="reg-note" name="register_note" rows="3" class="form-input" placeholder="Vd: Tôi là cộng tác viên của VP Công chứng A, mong được duyệt tài khoản." maxlength="1000"></textarea>
                <div class="text-xs text-slate-500 mt-1">Giúp admin xác minh nhanh hơn (tuỳ chọn)</div>
              </div>
              <div class="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
                <i data-lucide="info" class="w-3.5 h-3.5 inline"></i>
                Tài khoản cần được admin phê duyệt trước khi sử dụng.
              </div>
              <button id="reg-submit" type="submit" class="w-full btn-primary">
                <span id="submit-text">Tạo tài khoản</span>
              </button>
            </form>

            <div class="mt-4 text-center text-sm text-slate-500">
              Đã có tài khoản? <a href="/dang-nhap" class="text-primary-500 hover:underline">Đăng nhập</a>
            </div>
          </div>
        </div>
      </div>
    `,
    pageScript: `
      document.getElementById('reg-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-text');
        const submitBtn = document.getElementById('reg-submit');
        const errBox = document.getElementById('err-box');
        errBox.classList.add('hidden');
        submitBtn.disabled = true;
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
              register_note: fd.get('register_note') || '',
              fingerprint: fp,
            }),
          });
          // KHÔNG nhận token — tài khoản phải chờ admin duyệt.
          // Lưu tạm info user để trang pending hiển thị thông tin đã gửi.
          try { sessionStorage.setItem('ctnd_pending_user', JSON.stringify(data.user || {})); } catch {}
          location.href = '/tai-khoan-cho-duyet?status=pending&fresh=1';
        } catch (err) {
          errBox.textContent = err.message;
          errBox.classList.remove('hidden');
          btn.textContent = 'Tạo tài khoản';
          submitBtn.disabled = false;
        }
      });
    `,
  });
}
