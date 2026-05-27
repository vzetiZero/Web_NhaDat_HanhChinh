// Trang chủ - chuyên nghiệp + CMS-driven
// Sections: Hero/Banner slider, Quy trình, Tính năng, Mẫu hợp đồng, FAQ, Liên hệ
// Dữ liệu lấy từ /api/public/home — admin cấu hình banners/faqs/samples/site-settings.

import { renderPageShell, escHtml } from '../components/layout.js';
import { getConfig } from '../../config/config.js';

export function renderHomePage(env) {
  const cfg = getConfig(env);
  return renderPageShell(env, {
    title: 'Trang chủ',
    bodyHtml: `
      <!-- ============ HERO / BANNER SLIDER ============ -->
      <section id="hero" class="relative">
        <div id="hero-slider" class="relative bg-gradient-to-br from-primary-600 to-primary-500 text-white min-h-[420px] md:min-h-[480px]">
          <div class="absolute inset-0 overflow-hidden" id="hero-slides"></div>
          <div class="relative max-w-6xl mx-auto px-4 py-16 md:py-20">
            <div id="hero-content" class="text-center">
              <h1 class="text-3xl md:text-5xl font-bold mb-4 drop-shadow">${escHtml(cfg.SITE_NAME)}</h1>
              <p class="text-base md:text-xl opacity-95 max-w-3xl mx-auto leading-relaxed">${escHtml(cfg.SITE_DESC)}</p>
              <div class="mt-8 flex flex-wrap justify-center gap-3">
                <a href="/hop-dong/moi" id="cta-primary" class="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition shadow-lg inline-flex items-center gap-2">
                  <i data-lucide="file-plus" class="w-4 h-4"></i> Tạo hợp đồng ngay
                </a>
                <a href="#mau-hop-dong" id="cta-secondary" class="border-2 border-white/60 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition inline-flex items-center gap-2">
                  <i data-lucide="layout-grid" class="w-4 h-4"></i> Xem mẫu
                </a>
              </div>
            </div>
          </div>
          <!-- Pagination dots -->
          <div id="hero-dots" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2"></div>
        </div>
      </section>

      <!-- ============ QUY TRÌNH 4 BƯỚC ============ -->
      <section class="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div class="text-center mb-10">
          <h2 class="text-2xl md:text-3xl font-bold mb-2">Quy trình sử dụng</h2>
          <p class="text-slate-500">Đơn giản như khai báo dịch vụ công trực tuyến</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          ${procStep('1', 'Đăng nhập an toàn', 'Mỗi tài khoản gắn 1 thiết bị duy nhất', 'shield-check')}
          ${procStep('2', 'Chọn mẫu hợp đồng', 'Đa dạng mẫu, có preview trước khi dùng', 'layout-template')}
          ${procStep('3', 'Quét QR CCCD / nhập tay', 'Tự điền thông tin từ thẻ CCCD trong vài giây', 'scan-line')}
          ${procStep('4', 'Tải về PDF / DOCX', 'Xuất file ngay, in ấn hoặc nộp công chứng', 'download')}
        </div>
      </section>

      <!-- ============ TÍNH NĂNG NỔI BẬT ============ -->
      <section class="bg-slate-50 border-y border-slate-200">
        <div class="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold mb-2">Tính năng nổi bật</h2>
            <p class="text-slate-500">Mọi thứ bạn cần để soạn hợp đồng nhanh và chuẩn</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${featureCard('scan-line', 'Quét QR CCCD', 'Tự động điền họ tên, năm sinh, địa chỉ thường trú từ thẻ căn cước.')}
            ${featureCard('wand-2', 'Tự động điền hợp đồng', 'Số tiền chuyển thành chữ, định dạng địa chỉ chuẩn hành chính 2025.')}
            ${featureCard('file-down', 'Xuất PDF / DOCX', 'Hai định dạng song song, đúng chuẩn văn bản hành chính.')}
            ${featureCard('save', 'Lưu lịch sử', 'Mọi hợp đồng được lưu trong tài khoản, tải lại bất cứ lúc nào.')}
            ${featureCard('user-check', 'Admin duyệt tài khoản', 'Cơ chế duyệt thủ công đảm bảo người dùng được xác minh.')}
            ${featureCard('shield', 'Bảo mật thiết bị', 'Mỗi tài khoản chỉ đăng nhập trên 1 thiết bị duy nhất.')}
          </div>
        </div>
      </section>

      <!-- ============ MẪU HỢP ĐỒNG ============ -->
      <section id="mau-hop-dong" class="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div class="text-center mb-10">
          <h2 class="text-2xl md:text-3xl font-bold mb-2">Mẫu hợp đồng</h2>
          <p class="text-slate-500">Chọn mẫu phù hợp để bắt đầu</p>
        </div>
        <div id="samples-root">
          ${skeletonGrid(3)}
        </div>
      </section>

      <!-- ============ FAQ ============ -->
      <section class="bg-white border-t border-slate-200">
        <div class="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold mb-2">Câu hỏi thường gặp</h2>
            <p class="text-slate-500">Giải đáp những thắc mắc phổ biến</p>
          </div>
          <div id="faq-root" class="space-y-2">
            ${skeletonRows(4)}
          </div>
        </div>
      </section>

      <!-- ============ LIÊN HỆ ============ -->
      <section id="lien-he" class="bg-gradient-to-b from-slate-50 to-white border-t border-slate-200">
        <div class="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
          <h2 class="text-2xl md:text-3xl font-bold mb-3">Cần hỗ trợ?</h2>
          <p class="text-slate-500 mb-8">Liên hệ với chúng tôi qua các kênh sau</p>
          <div id="contact-root" class="flex flex-wrap items-center justify-center gap-3">
            <span class="text-slate-400 text-sm">Đang tải...</span>
          </div>
        </div>
      </section>

      <!-- ============ FOOTER NOTICE ============ -->
      <section class="bg-white border-t border-slate-200">
        <div class="max-w-5xl mx-auto px-4 py-10 text-center text-sm text-slate-600">
          <p class="leading-relaxed">
            Hệ thống cung cấp các mẫu hợp đồng được biên soạn dựa trên Bộ luật Dân sự 2015 và Luật Đất đai 2024.<br/>
            Để có giá trị pháp lý đầy đủ, hợp đồng cần được công chứng tại văn phòng có thẩm quyền.
          </p>
        </div>
      </section>
    `,
    pageScript: `
      (async function() {
        try {
          const data = await api('/api/public/home');
          renderHero(data.banners || [], data.settings || {});
          renderSamples(data.samples || []);
          renderFaqs(data.faqs || []);
          renderContact(data.settings || {});
        } catch (e) {
          console.warn('home: load /api/public/home failed', e);
          // Fallback render empty state
          renderHero([], {});
          renderSamples([]);
          renderFaqs([]);
          renderContact({});
        }
      })();

      // ============ HERO SLIDER ============
      let heroIndex = 0;
      let heroTimer = null;
      function renderHero(banners, settings) {
        // Apply hero title/subtitle override từ settings (nếu admin nhập)
        if (settings.heroTitle) {
          const h1 = document.querySelector('#hero-content h1');
          if (h1) h1.textContent = settings.heroTitle;
        }
        if (settings.heroSubtitle) {
          const p = document.querySelector('#hero-content p');
          if (p) p.textContent = settings.heroSubtitle;
        }

        const slides = document.getElementById('hero-slides');
        const dots = document.getElementById('hero-dots');
        if (!banners.length) {
          // Không có banner active → ẩn dots, giữ nguyên gradient
          dots.innerHTML = '';
          return;
        }
        slides.innerHTML = banners.map((b, i) => \`
          <div class="hero-slide absolute inset-0 transition-opacity duration-700 \${i === 0 ? 'opacity-100' : 'opacity-0'}"
               style="\${b.imageUrl ? 'background-image: url(' + escAttr(b.imageUrl) + '); background-size: cover; background-position: center;' : ''}">
            \${b.imageUrl ? '<div class="absolute inset-0 bg-gradient-to-br from-primary-600/85 to-primary-500/70"></div>' : ''}
          </div>
        \`).join('');
        dots.innerHTML = banners.map((_, i) => \`
          <button data-dot="\${i}" aria-label="Slide \${i+1}"
            class="w-2 h-2 rounded-full transition-all \${i === 0 ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}"
            style="min-height: 16px; min-width: 16px; padding: 6px;"></button>
        \`).join('');

        // Override hero content theo banner đầu tiên nếu có title/subtitle
        const applyContent = (b) => {
          if (!b) return;
          const h1 = document.querySelector('#hero-content h1');
          const p = document.querySelector('#hero-content p');
          if (b.title && h1) h1.textContent = b.title;
          if (b.subtitle && p) p.textContent = b.subtitle;
          const cta = document.getElementById('cta-primary');
          if (cta && b.buttonText && b.buttonUrl) {
            cta.textContent = '';
            cta.innerHTML = '<i data-lucide="arrow-right" class="w-4 h-4"></i> ' + escText(b.buttonText);
            cta.setAttribute('href', b.buttonUrl);
            if (window.lucide) window.lucide.createIcons();
          }
        };
        applyContent(banners[0]);

        if (banners.length > 1) {
          dots.querySelectorAll('[data-dot]').forEach((btn) => {
            btn.addEventListener('click', () => goSlide(Number(btn.dataset.dot), banners, applyContent));
          });
          // Auto-rotate every 5s, pause on hover
          const heroSection = document.getElementById('hero-slider');
          heroTimer = setInterval(() => goSlide(heroIndex + 1, banners, applyContent), 5000);
          heroSection.addEventListener('mouseenter', () => heroTimer && clearInterval(heroTimer));
          heroSection.addEventListener('mouseleave', () => {
            heroTimer = setInterval(() => goSlide(heroIndex + 1, banners, applyContent), 5000);
          });
        }
      }

      function goSlide(target, banners, applyContent) {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('#hero-dots [data-dot]');
        if (!slides.length) return;
        const next = ((target % banners.length) + banners.length) % banners.length;
        heroIndex = next;
        slides.forEach((s, i) => s.style.opacity = (i === next) ? '1' : '0');
        dots.forEach((d, i) => {
          if (i === next) { d.className = 'w-2 h-2 rounded-full bg-white w-6 transition-all'; }
          else { d.className = 'w-2 h-2 rounded-full bg-white/50 hover:bg-white/80 transition-all'; }
          d.style.minHeight = '16px'; d.style.minWidth = '16px'; d.style.padding = '6px';
        });
        applyContent(banners[next]);
      }

      // ============ SAMPLES ============
      function renderSamples(items) {
        const root = document.getElementById('samples-root');
        if (!items.length) {
          root.innerHTML = \`
            <div class="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
              <i data-lucide="file-stack" class="w-12 h-12 mx-auto text-slate-300 mb-3"></i>
              <h3 class="font-semibold text-slate-700">Chưa có mẫu hợp đồng</h3>
              <p class="text-sm text-slate-500 mt-2">Admin chưa cấu hình mẫu nào. Quay lại sau nhé!</p>
            </div>\`;
          if (window.lucide) window.lucide.createIcons();
          return;
        }
        root.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">' +
          items.map(sampleCard).join('') + '</div>';
        if (window.lucide) window.lucide.createIcons();
      }

      function sampleCard(s) {
        const img = s.previewImageUrl
          ? '<img src="' + escAttr(s.previewImageUrl) + '" alt="' + escAttr(s.name) + '" class="w-full h-44 object-cover" loading="lazy" />'
          : '<div class="w-full h-44 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center"><i data-lucide="file-text" class="w-12 h-12 text-primary-500/60"></i></div>';
        const useUrl = s.templateId
          ? '/hop-dong/moi?template=' + encodeURIComponent(s.templateId)
          : '/hop-dong/moi';
        return \`
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
            \${img}
            <div class="p-5 flex-1 flex flex-col">
              \${s.category ? '<span class="inline-block self-start text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded mb-2">' + escText(s.category) + '</span>' : ''}
              <h3 class="font-semibold text-lg mb-1">\${escText(s.name)}</h3>
              <p class="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">\${escText(s.description || '')}</p>
              <div class="flex gap-2 mt-auto">
                <a href="\${useUrl}" class="flex-1 bg-primary-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-600 transition text-center">Dùng mẫu này</a>
              </div>
            </div>
          </div>\`;
      }

      // ============ FAQ ACCORDION ============
      function renderFaqs(items) {
        const root = document.getElementById('faq-root');
        if (!items.length) {
          root.innerHTML = \`
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
              <i data-lucide="help-circle" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
              <p class="text-sm text-slate-500">Chưa có câu hỏi nào. Quay lại sau!</p>
            </div>\`;
          if (window.lucide) window.lucide.createIcons();
          return;
        }
        root.innerHTML = items.map((f, i) => \`
          <details class="group bg-white border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-primary-200">
            <summary class="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 font-medium text-slate-800 select-none"
                     style="min-height: 56px;">
              <span class="flex-1">\${escText(f.question)}</span>
              <i data-lucide="chevron-down" class="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0"></i>
            </summary>
            <div class="px-5 pb-4 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-3">\${escText(f.answer)}</div>
          </details>
        \`).join('');
        if (window.lucide) window.lucide.createIcons();
      }

      // ============ CONTACT ============
      function renderContact(s) {
        const root = document.getElementById('contact-root');
        const links = [];
        if (s.adminPhone) links.push(contactBtn('phone', 'Hotline', s.adminPhone, 'tel:' + s.adminPhone, 'bg-emerald-500 hover:bg-emerald-600'));
        if (s.adminZaloUrl) links.push(contactBtn('message-circle', 'Zalo', 'Nhắn Zalo', s.adminZaloUrl, 'bg-blue-500 hover:bg-blue-600'));
        if (s.adminFacebookUrl) links.push(contactBtn('facebook', 'Facebook', 'Messenger', s.adminFacebookUrl, 'bg-indigo-500 hover:bg-indigo-600'));
        if (s.adminEmail) links.push(contactBtn('mail', 'Email', s.adminEmail, 'mailto:' + s.adminEmail, 'bg-slate-700 hover:bg-slate-800'));
        if (!links.length) {
          root.innerHTML = '<div class="text-sm text-slate-400">Thông tin liên hệ sẽ được cập nhật sớm.</div>';
          return;
        }
        root.innerHTML = links.join('');
        if (window.lucide) window.lucide.createIcons();
      }

      function contactBtn(icon, label, text, href, color) {
        const isExt = href.startsWith('http');
        const target = isExt ? ' target="_blank" rel="noopener"' : '';
        return \`
          <a href="\${href}"\${target} class="\${color} text-white px-5 py-3 rounded-xl font-medium inline-flex items-center gap-2 transition shadow-sm hover:shadow-md" style="min-height: 48px;">
            <i data-lucide="\${icon}" class="w-4 h-4"></i>
            <span>\${escText(text)}</span>
          </a>\`;
      }

      function escText(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      }
      function escAttr(s) { return escText(s); }
    `,
  });
}

function procStep(num, title, desc, icon) {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md hover:border-primary-200 transition-all relative">
      <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">BƯỚC ${num}</div>
      <div class="w-14 h-14 mx-auto rounded-full bg-primary-50 text-primary-500 flex items-center justify-center mb-3 mt-3">
        <i data-lucide="${icon}" class="w-7 h-7"></i>
      </div>
      <h3 class="font-semibold mb-1">${title}</h3>
      <p class="text-sm text-slate-500 leading-relaxed">${desc}</p>
    </div>
  `;
}

function featureCard(icon, title, desc) {
  return `
    <div class="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary-200 transition-all duration-200">
      <div class="w-12 h-12 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center mb-4">
        <i data-lucide="${icon}" class="w-6 h-6"></i>
      </div>
      <h3 class="font-semibold text-lg mb-2">${title}</h3>
      <p class="text-sm text-slate-500 leading-relaxed">${desc}</p>
    </div>
  `;
}

function skeletonGrid(n) {
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${
    Array.from({ length: n }).map(() => `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
        <div class="w-full h-44 bg-slate-100"></div>
        <div class="p-5">
          <div class="h-4 bg-slate-100 rounded w-3/4 mb-3"></div>
          <div class="h-3 bg-slate-100 rounded w-full mb-2"></div>
          <div class="h-3 bg-slate-100 rounded w-5/6"></div>
        </div>
      </div>
    `).join('')
  }</div>`;
}

function skeletonRows(n) {
  return Array.from({ length: n }).map(() => `
    <div class="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
      <div class="h-4 bg-slate-100 rounded w-2/3"></div>
    </div>
  `).join('');
}
