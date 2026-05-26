// /api/setup - Init DB schema lần đầu + tạo admin bootstrap
// Endpoint này nên được gọi 1 lần sau khi deploy, hoặc protect bằng setup token

import { SCHEMA_STATEMENTS, SEED_TEMPLATES } from '../../config/schema.js';
import { getConfig } from '../../config/config.js';
import { jsonOk, jsonErr } from '../utils/common.js';
import { hashPassword } from '../utils/auth.js';
import { getUserByEmail, createUser } from '../db/users.js';
import { upsertTemplateByCode } from '../db/templates.js';
import { logAudit } from '../db/audit.js';

export async function handleSetup(request, env) {
  try {
    const cfg = getConfig(env);

    // 1. Tạo schema
    const results = [];
    for (const stmt of SCHEMA_STATEMENTS) {
      try {
        await env.DB.prepare(stmt).run();
        results.push({ ok: true, sql: stmt.split('\n')[0] });
      } catch (e) {
        results.push({ ok: false, sql: stmt.split('\n')[0], error: e?.message });
      }
    }

    // 2. Seed templates
    for (const tpl of SEED_TEMPLATES) {
      await upsertTemplateByCode(env, tpl);
    }

    // 3. Bootstrap admin nếu chưa có
    let adminCreated = false;
    const existing = await getUserByEmail(env, cfg.ADMIN_BOOTSTRAP_EMAIL);
    if (!existing) {
      const { hash, salt } = await hashPassword(cfg.ADMIN_BOOTSTRAP_PASSWORD);
      await createUser(env, {
        email: cfg.ADMIN_BOOTSTRAP_EMAIL,
        password_hash: hash,
        password_salt: salt,
        full_name: 'Administrator',
        is_admin: 1,
      });
      adminCreated = true;
    }

    await logAudit(env, {
      event: 'setup_run',
      detail: { adminCreated, schemaStatements: SCHEMA_STATEMENTS.length },
    });

    return jsonOk({
      message: 'Setup hoàn tất',
      schema: results,
      adminCreated,
      adminEmail: cfg.ADMIN_BOOTSTRAP_EMAIL,
      hint: adminCreated
        ? 'Admin tài khoản đã tạo. Đổi mật khẩu ngay sau khi đăng nhập.'
        : 'Admin đã tồn tại, không tạo lại.',
    });
  } catch (e) {
    return jsonErr('SETUP_FAILED', e?.message || 'Lỗi khởi tạo', 500);
  }
}
