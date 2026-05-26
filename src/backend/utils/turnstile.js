// Cloudflare Turnstile - verify captcha token
// Bỏ qua kiểm tra nếu ENABLE_TURNSTILE != 'true'

import { getConfig } from '../../config/config.js';

export async function verifyTurnstile(env, token, ip = null) {
  const cfg = getConfig(env);
  if (cfg.ENABLE_TURNSTILE !== 'true') {
    return { ok: true, skipped: true };
  }
  if (!token) return { ok: false, reason: 'no_token' };
  if (!cfg.TURNSTILE_SECRET) return { ok: false, reason: 'no_secret_configured' };

  try {
    const formData = new FormData();
    formData.append('secret', cfg.TURNSTILE_SECRET);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    return { ok: data.success === true, data };
  } catch (e) {
    return { ok: false, reason: e?.message };
  }
}
