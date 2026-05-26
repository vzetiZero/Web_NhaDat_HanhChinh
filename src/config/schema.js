// Schema SQL cho Cloudflare D1 (SQLite)
// Dùng trong /api/setup để khởi tạo DB lần đầu

export const SCHEMA_STATEMENTS = [
  // ============ 1. USERS ============
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    cccd_encrypted TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin)`,

  // ============ 2. DEVICES (cốt lõi device binding) ============
  `CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    bound_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
    reset_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint)`,

  // ============ 3. CONTRACT TEMPLATES ============
  `CREATE TABLE IF NOT EXISTS contract_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    docx_r2_key TEXT NOT NULL,
    field_schema TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // ============ 4. CONTRACTS ============
  `CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_number TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    form_data TEXT NOT NULL,
    docx_r2_key TEXT,
    pdf_r2_key TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (template_id) REFERENCES contract_templates(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_contracts_user ON contracts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_contracts_created ON contracts(created_at)`,

  // ============ 5. AUDIT LOGS ============
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    admin_id INTEGER,
    event TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`,

  // ============ 6. SETTINGS (key-value) ============
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// Seed mặc định
export const SEED_TEMPLATES = [
  {
    code: 'HD_TANG_QSDD_V1',
    name: 'Hợp đồng tặng quyền sử dụng đất kèm tài sản gắn liền',
    description: 'Mẫu hợp đồng dân sự tặng QSDĐ kèm tài sản gắn liền với đất (nhà ở, cây trồng)',
    docx_r2_key: 'templates/hd-tang-qsdd-mau-01.docx',
    field_schema: JSON.stringify({
      steps: [
        'thongTinChung',
        'benA',
        'benB',
        'thuaDat',
        'dieuKhoan',
      ],
    }),
  },
];
