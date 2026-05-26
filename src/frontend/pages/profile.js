import { renderPageShell } from '../components/layout.js';

export function renderProfilePage(env, section = 'profile') {
  const isSecurity = section === 'security';
  return renderPageShell(env, {
    title: isSecurity ? 'Bảo mật tài khoản' : 'Thông tin cá nhân',
    requireAuth: true,
    bodyHtml: `
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold">${isSecurity ? 'Bảo mật tài khoản' : 'Thông tin cá nhân'}</h1>
            <p class="text-sm text-slate-500">Quản lý thông tin tài khoản và bảo mật đăng nhập.</p>
          </div>
          <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <a href="/tai-khoan" class="px-3 py-2 rounded-md ${!isSecurity ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-50'}">Thông tin cá nhân</a>
            <a href="/tai-khoan/bao-mat" class="px-3 py-2 rounded-md ${isSecurity ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-50'}">Đổi mật khẩu</a>
          </div>
        </div>
        <div id="profile-root"></div>
      </div>
    `,
    pageScript: profileScript(isSecurity),
  });
}

function profileScript(isSecurity) {
  return `
const root = document.getElementById('profile-root');
let currentUser = null;

function fmtDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('vi-VN');
}
function dateValue(s) {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function statusLabel(s) {
  const map = { pending:'Chờ duyệt', approved:'Đã duyệt', rejected:'Từ chối', blocked:'Bị khóa' };
  return map[s] || s || '-';
}
function avatar(user) {
  if (user.avatar_url) return '<img src="' + esc(user.avatar_url) + '" class="w-24 h-24 rounded-full object-cover border border-slate-200" alt="Avatar" />';
  const text = (user.full_name || user.email || '?').trim().slice(0, 1).toUpperCase();
  return '<div class="w-24 h-24 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-3xl font-bold border border-primary-100">' + esc(text) + '</div>';
}
function renderLoading() {
  root.innerHTML = '<div class="text-center py-12 text-slate-500"><i data-lucide="loader" class="w-6 h-6 animate-spin inline-block"></i> Đang tải...</div>';
  if (window.lucide) window.lucide.createIcons();
}
async function loadProfile() {
  renderLoading();
  try {
    const res = await api('/api/me');
    currentUser = res.user;
    ${isSecurity ? 'renderSecurity();' : 'renderProfile();'}
  } catch (e) {
    root.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">' + esc(e.message) + '</div>';
  }
}
function accountCards(user) {
  return \`
    <section class="bg-white border border-slate-200 rounded-lg p-5">
      <div class="flex flex-col items-center text-center gap-3">
        \${avatar(user)}
        <div>
          <div class="font-semibold text-lg">\${esc(user.full_name || '(Chưa có tên)')}</div>
          <div class="text-sm text-slate-500">\${esc(user.email)}</div>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">\${esc(statusLabel(user.status))}</span>
      </div>
      <div class="mt-5 space-y-3 text-sm">
        <div class="flex justify-between gap-3"><span class="text-slate-500">Ngày tạo</span><span class="text-right">\${fmtDate(user.created_at)}</span></div>
        <div class="flex justify-between gap-3"><span class="text-slate-500">Đăng nhập cuối</span><span class="text-right">\${fmtDate(user.last_login_at)}</span></div>
        <div class="flex justify-between gap-3"><span class="text-slate-500">Thiết bị</span><span class="text-right">\${esc(user.device?.fingerprint_short || 'Chưa gắn')}</span></div>
      </div>
    </section>
    <section class="bg-white border border-slate-200 rounded-lg p-5">
      <h2 class="font-semibold mb-3">Bảo mật tài khoản</h2>
      <div class="text-sm text-slate-600 space-y-2">
        <div>Role: \${esc(user.role || 'user')}</div>
        <div>Thiết bị hiện tại: \${esc(user.device?.status || 'Không có')}</div>
      </div>
      <a href="/tai-khoan/bao-mat" class="btn-secondary mt-4 inline-flex min-h-[44px] items-center">Đổi mật khẩu</a>
    </section>
  \`;
}
function renderProfile() {
  const u = currentUser;
  root.innerHTML = \`
    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <aside class="space-y-4">\${accountCards(u)}</aside>
      <section class="bg-white border border-slate-200 rounded-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-lg">Thông tin liên hệ</h2>
          <button id="profile-cancel" type="button" class="btn-secondary hidden min-h-[44px]">Hủy</button>
        </div>
        <form id="profile-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Họ và tên <span class="req">*</span></label>
            <input name="full_name" class="form-input min-h-[44px]" required value="\${esc(u.full_name || '')}" />
          </div>
          <div>
            <label class="form-label">Email đăng nhập</label>
            <input class="form-input min-h-[44px] bg-slate-50" value="\${esc(u.email || '')}" disabled />
          </div>
          <div>
            <label class="form-label">Số điện thoại</label>
            <input name="phone" class="form-input min-h-[44px]" value="\${esc(u.phone || '')}" placeholder="0912345678" />
          </div>
          <div>
            <label class="form-label">Ngày sinh</label>
            <input type="date" name="date_of_birth" class="form-input min-h-[44px]" value="\${dateValue(u.date_of_birth)}" />
          </div>
          <div>
            <label class="form-label">Tuổi</label>
            <input type="number" name="age" min="0" max="130" class="form-input min-h-[44px]" value="\${u.age ?? ''}" />
          </div>
          <div>
            <label class="form-label">Giới tính</label>
            <select name="gender" class="form-select min-h-[44px]">
              <option value="">-- Chọn --</option>
              <option value="male" \${u.gender === 'male' ? 'selected' : ''}>Nam</option>
              <option value="female" \${u.gender === 'female' ? 'selected' : ''}>Nữ</option>
              <option value="other" \${u.gender === 'other' ? 'selected' : ''}>Khác</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Avatar URL</label>
            <input name="avatar_url" class="form-input min-h-[44px]" value="\${esc(u.avatar_url || '')}" placeholder="https://..." />
          </div>
          <div>
            <label class="form-label">Tỉnh/Thành</label>
            <input name="province" class="form-input min-h-[44px]" value="\${esc(u.province || '')}" />
          </div>
          <div>
            <label class="form-label">Quận/Huyện</label>
            <input name="district" class="form-input min-h-[44px]" value="\${esc(u.district || '')}" />
          </div>
          <div>
            <label class="form-label">Xã/Phường</label>
            <input name="ward" class="form-input min-h-[44px]" value="\${esc(u.ward || '')}" />
          </div>
          <div>
            <label class="form-label">Vị trí/địa chỉ ngắn</label>
            <input name="location_text" class="form-input min-h-[44px]" value="\${esc(u.location_text || '')}" />
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Địa chỉ chi tiết</label>
            <textarea name="address" rows="3" class="form-textarea">\${esc(u.address || '')}</textarea>
          </div>
          <div class="md:col-span-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button id="profile-save" type="submit" class="btn-primary min-h-[44px]">Lưu thay đổi</button>
          </div>
        </form>
      </section>
    </div>
  \`;
  document.getElementById('profile-form').addEventListener('submit', saveProfile);
  if (window.lucide) window.lucide.createIcons();
}
async function saveProfile(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const fullName = String(fd.get('full_name') || '').trim();
  const phone = String(fd.get('phone') || '').trim();
  if (!fullName) return toast('Tên không được rỗng', 'error');
  if (phone && !/^(\\+84|0)[1-9][0-9]{8,9}$/.test(phone)) return toast('Số điện thoại không hợp lệ', 'error');
  const btn = document.getElementById('profile-save');
  btn.disabled = true; btn.textContent = 'Đang lưu...';
  try {
    const payload = Object.fromEntries(fd.entries());
    payload.age = payload.age ? Number(payload.age) : null;
    payload.date_of_birth = payload.date_of_birth || null;
    const res = await api('/api/me', { method: 'PATCH', body: JSON.stringify(payload) });
    currentUser = res.user;
    localStorage.setItem('ctnd_user', JSON.stringify({ ...(JSON.parse(localStorage.getItem('ctnd_user') || '{}')), full_name: currentUser.full_name }));
    toast('Cập nhật thông tin thành công.', 'success');
    renderProfile();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Lưu thay đổi';
  }
}
function renderSecurity() {
  root.innerHTML = \`
    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <aside class="space-y-4">\${accountCards(currentUser)}</aside>
      <section class="bg-white border border-slate-200 rounded-lg p-5">
        <h2 class="font-semibold text-lg mb-4">Đổi mật khẩu</h2>
        <form id="password-form" class="max-w-md space-y-4">
          <div>
            <label class="form-label">Mật khẩu hiện tại</label>
            <input type="password" name="current_password" class="form-input min-h-[44px]" required />
          </div>
          <div>
            <label class="form-label">Mật khẩu mới</label>
            <input type="password" name="new_password" class="form-input min-h-[44px]" required />
          </div>
          <div>
            <label class="form-label">Nhập lại mật khẩu mới</label>
            <input type="password" name="confirm_password" class="form-input min-h-[44px]" required />
          </div>
          <button id="password-save" class="btn-primary min-h-[44px] w-full sm:w-auto">Đổi mật khẩu</button>
        </form>
      </section>
    </div>
  \`;
  document.getElementById('password-form').addEventListener('submit', changePassword);
  if (window.lucide) window.lucide.createIcons();
}
async function changePassword(e) {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  if (payload.new_password !== payload.confirm_password) return toast('Xác nhận mật khẩu mới không khớp', 'error');
  if (!/[a-z]/.test(payload.new_password) || !/[A-Z]/.test(payload.new_password) || !/[0-9]/.test(payload.new_password) || payload.new_password.length < 8) {
    return toast('Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa, chữ thường và số', 'error');
  }
  const btn = document.getElementById('password-save');
  btn.disabled = true; btn.textContent = 'Đang đổi...';
  try {
    await api('/api/me/password', { method: 'PATCH', body: JSON.stringify(payload) });
    e.target.reset();
    toast('Đổi mật khẩu thành công.', 'success');
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Đổi mật khẩu'; }
}
function esc(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
loadProfile();
`;
}
