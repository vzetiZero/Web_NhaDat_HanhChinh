// Database layer - audit_logs
// Mọi sự kiện quan trọng đều log vào đây

/**
 * Ghi audit log. Không throw nếu lỗi, chỉ console.error.
 */
export async function logAudit(env, {
  user_id = null,
  admin_id = null,
  event,
  target_type = null,
  target_id = null,
  ip_address = null,
  user_agent = null,
  device_fingerprint = null,
  detail = null,
}) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs
        (user_id, admin_id, event, target_type, target_id, ip_address, user_agent, device_fingerprint, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        user_id,
        admin_id,
        event,
        target_type,
        target_id,
        ip_address,
        user_agent,
        device_fingerprint,
        typeof detail === 'object' ? JSON.stringify(detail) : detail
      )
      .run();
  } catch (e) {
    console.error('[audit log]', e?.message);
  }
}

export async function listAuditLogs(env, { page = 1, limit = 50, event = null, user_id = null } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const args = [];
  if (event) {
    where.push('a.event = ?');
    args.push(event);
  }
  if (user_id) {
    where.push('a.user_id = ?');
    args.push(user_id);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM audit_logs a ${whereSql}`)
    .bind(...args)
    .first();
  const total = countRow?.cnt || 0;

  const rows = await env.DB.prepare(
    `SELECT a.*, u.email as user_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${whereSql}
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...args, limit, offset)
    .all();

  return { items: rows.results || [], total, page, limit };
}
