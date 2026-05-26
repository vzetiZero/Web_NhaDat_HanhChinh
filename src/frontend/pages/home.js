// Trang chủ - giới thiệu dịch vụ

import { renderPageShell, escHtml } from '../components/layout.js';
import { getConfig } from '../../config/config.js';

export function renderHomePage(env) {
  const cfg = getConfig(env);
  return renderPageShell(env, {
    title: 'Trang chủ',
    bodyHtml: `
      <section class="bg-gradient-to-b from-primary-500 to-primary-600 text-white">
        <div class="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 class="text-3xl md:text-4xl font-bold mb-3">${escHtml(cfg.SITE_NAME)}</h1>
          <p class="text-lg opacity-90 max-w-2xl mx-auto">${escHtml(cfg.SITE_DESC)}</p>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/hop-dong/moi" class="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-slate-100">
              <i data-lucide="file-plus" class="w-4 h-4 inline mr-1"></i> Tạo hợp đồng mới
            </a>
            <a href="/bang-dieu-khien" class="border border-white/40 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10">
              <i data-lucide="folder" class="w-4 h-4 inline mr-1"></i> Hợp đồng của tôi
            </a>
          </div>
        </div>
      </section>

      <section class="max-w-6xl mx-auto px-4 py-12">
        <h2 class="text-2xl font-bold text-center mb-2">Quy trình 5 phút</h2>
        <p class="text-slate-500 text-center mb-10">Đơn giản như khai báo dịch vụ công trực tuyến</p>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
          ${feature('1', 'Đăng nhập an toàn', 'Mỗi tài khoản gắn 1 thiết bị duy nhất', 'shield-check')}
          ${feature('2', 'Điền thông tin', 'Form chia bước rõ ràng, gợi ý từng trường', 'edit-3')}
          ${feature('3', 'Xem trước', 'Preview hợp đồng đúng chuẩn văn bản hành chính', 'eye')}
          ${feature('4', 'Tải về PDF/DOCX', 'Xuất file ngay, in ấn hoặc nộp công chứng', 'download')}
        </div>
      </section>

      <section class="bg-white border-t border-slate-200">
        <div class="max-w-5xl mx-auto px-4 py-12 text-center">
          <h2 class="text-xl font-bold mb-3">Hỗ trợ pháp lý</h2>
          <p class="text-slate-600">
            Hệ thống cung cấp các mẫu hợp đồng được biên soạn dựa trên Bộ luật Dân sự 2015 và Luật Đất đai 2024.<br/>
            Tuy nhiên, để có giá trị pháp lý đầy đủ, hợp đồng cần được công chứng tại văn phòng có thẩm quyền.
          </p>
        </div>
      </section>
    `,
  });
}

function feature(num, title, desc, icon) {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
      <div class="w-12 h-12 mx-auto rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mb-3">
        <i data-lucide="${icon}" class="w-6 h-6"></i>
      </div>
      <div class="text-xs text-slate-400 font-semibold mb-1">BƯỚC ${num}</div>
      <h3 class="font-semibold mb-1">${title}</h3>
      <p class="text-sm text-slate-500">${desc}</p>
    </div>
  `;
}
