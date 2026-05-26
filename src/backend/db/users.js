// Database layer cho bảng users
// Tất cả truy vấn D1 đi qua đây

export async function getUserByEmail(env, email) {
  if (!email) return null;
  const e = email.toLowerCase().trim();
  return await env.DB.prepare(
    'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1'
  ).bind(e).first();
}

export async function getUserById(env, id) {
  if (!id) return null;
  return await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first();
}

export async function createUser(env, { email, password_hash, password_salt, full_name, phone, cccd_encrypted, is_admin = 0 }) {
  const result = await env.DB.prepare(
    `INSERT INTO users (email, password_hash, password_salt, full_name, phone, cccd_encrypted, is_admin, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`
  )
    .bind(
      email.toLowerCase().trim(),
      password_hash,
      password_salt,
      full_name || null,
      phone || null,
      cccd_encrypted || null,
      is_admin ? 1 : 0
    )
    .run();
  return await getUserById(env, result.meta.last_row_id);
}

export async function updateLastLogin(env, userId) {
  await env.DB.prepare(
    `UPDATE users SET last_login_at = datetime('now') WHERE id = ?`
  ).bind(userId).run();
}

export async function listUsers(env, { page = 1, limit = 20, search = '', status = null, isAdmin = null } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const args = [];
  if (search) {
    where.push('(LOWER(email) LIKE ? OR LOWER(full_name) LIKE ? OR phone LIKE ?)');
    const s = `%${search.toLowerCase()}%`;
    args.push(s, s, `%${search}%`);
  }
  if (status) {
    where.push('status = ?');
    args.push(status);
  }
  if (isAdmin !== null) {
    where.push('is_admin = ?');
    args.push(isAdmin ? 1 : 0);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM users ${whereSql}`)
    .bind(...args)
    .first();
  const total = countRow?.cnt || 0;

  const rows = await env.DB.prepare(
    `SELECT id, email, full_name, phone, is_admin, status, created_at, last_login_at
     FROM users ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...args, limit, offset)
    .all();

  return { items: rows.results || [], total, page, limit };
}

export async function setUserStatus(env, userId, status) {
  await env.DB.prepare(
    `UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, userId).run();
}
