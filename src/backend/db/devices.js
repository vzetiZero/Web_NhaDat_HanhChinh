// Database layer - devices
// 1 user = 1 device (UNIQUE constraint trên user_id)

export async function getDeviceByUserId(env, userId) {
  if (!userId) return null;
  return await env.DB.prepare('SELECT * FROM devices WHERE user_id = ? LIMIT 1').bind(userId).first();
}

export async function bindDevice(env, { userId, fingerprint, userAgent, ipAddress }) {
  // Upsert: nếu chưa có thì INSERT, có thì UPDATE
  const existing = await getDeviceByUserId(env, userId);
  if (existing) {
    await env.DB.prepare(
      `UPDATE devices
       SET fingerprint = ?, user_agent = ?, ip_address = ?,
           bound_at = datetime('now'), last_used_at = datetime('now'), status = 'active'
       WHERE id = ?`
    )
      .bind(fingerprint, userAgent || null, ipAddress || null, existing.id)
      .run();
    return await getDeviceByUserId(env, userId);
  }
  const r = await env.DB.prepare(
    `INSERT INTO devices (user_id, fingerprint, user_agent, ip_address, bound_at, last_used_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
  )
    .bind(userId, fingerprint, userAgent || null, ipAddress || null)
    .run();
  return await env.DB.prepare('SELECT * FROM devices WHERE id = ?')
    .bind(r.meta.last_row_id)
    .first();
}

export async function touchDevice(env, deviceId) {
  await env.DB.prepare(
    `UPDATE devices SET last_used_at = datetime('now') WHERE id = ?`
  ).bind(deviceId).run();
}

/**
 * Reset device cho user - admin gọi
 * Xóa bản ghi device, lần login tiếp theo sẽ tự bind device mới.
 */
export async function resetDevice(env, userId) {
  const existing = await getDeviceByUserId(env, userId);
  if (existing) {
    await env.DB.prepare(
      `UPDATE devices SET reset_count = reset_count + 1 WHERE id = ?`
    ).bind(existing.id).run();
  }
  await env.DB.prepare('DELETE FROM devices WHERE user_id = ?').bind(userId).run();
}
