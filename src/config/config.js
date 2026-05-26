// Cấu hình tập trung - đọc từ env (wrangler vars + secrets)
// Không hardcode secrets ở đây - chỉ dùng default cho dev local

const DEFAULTS = {
  SITE_NAME: 'Chứng Từ Nhà Đất',
  SITE_DESC: 'Tạo hợp đồng tặng quyền sử dụng đất nhanh chóng, đúng quy định',
  JWT_SECRET: 'dev-secret-change-me-in-production-please-make-it-long',
  JWT_EXPIRES_IN: '7d',
  CONTRACT_NUMBER_PREFIX: 'HĐTCTSGLĐ',
  ENABLE_TURNSTILE: 'false',
  TURNSTILE_SECRET: '',
  TURNSTILE_SITE_KEY: '',
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  ENCRYPTION_KEY: 'dev-encryption-key-32-bytes-only', // override in prod
  ADMIN_BOOTSTRAP_EMAIL: 'admin@local',
  ADMIN_BOOTSTRAP_PASSWORD: 'admin@123456',
};

export function getConfig(env = {}) {
  const cfg = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (env[key] !== undefined && env[key] !== null && env[key] !== '') {
      cfg[key] = env[key];
    }
  }
  return cfg;
}

// Alias để giữ tương thích với pattern Web_Trader_InAn (getConfigSync)
export function getConfigSync(env) {
  return getConfig(env);
}
