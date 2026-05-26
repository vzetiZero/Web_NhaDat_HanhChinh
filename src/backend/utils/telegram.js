// Telegram notification helper
// Gửi tin nhắn cho admin khi có sự kiện quan trọng

import { getConfig } from '../../config/config.js';

export async function sendTelegram(env, message, options = {}) {
  const cfg = getConfig(env);
  if (!cfg.TELEGRAM_BOT_TOKEN || !cfg.TELEGRAM_CHAT_ID) {
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...options,
        }),
      }
    );
    const data = await res.json();
    return { ok: data.ok === true, data };
  } catch (e) {
    console.error('[telegram]', e?.message);
    return { ok: false, reason: e?.message };
  }
}

export function notifyAdmin(env, ctx, event, detail = '') {
  const msg = `<b>[Chứng Từ Nhà Đất]</b>\n<b>Sự kiện:</b> ${event}\n${detail}`;
  // Chạy background, không block response
  if (ctx?.waitUntil) {
    ctx.waitUntil(sendTelegram(env, msg).catch(() => {}));
  } else {
    sendTelegram(env, msg).catch(() => {});
  }
}
