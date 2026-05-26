// Database layer - contracts

export async function getNextContractSequence(env, year) {
  const prefix = `%/${year}`;
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM contracts WHERE contract_number LIKE ?`
  )
    .bind(prefix)
    .first();
  return (row?.cnt || 0) + 1;
}

export async function createContract(env, { contract_number, user_id, template_id, form_data, status = 'draft' }) {
  const r = await env.DB.prepare(
    `INSERT INTO contracts (contract_number, user_id, template_id, form_data, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  )
    .bind(
      contract_number,
      user_id,
      template_id,
      typeof form_data === 'string' ? form_data : JSON.stringify(form_data),
      status
    )
    .run();
  return await getContractById(env, r.meta.last_row_id);
}

export async function updateContract(env, id, updates) {
  const fields = [];
  const args = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    args.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
  }
  if (!fields.length) return await getContractById(env, id);
  fields.push(`updated_at = datetime('now')`);
  args.push(id);
  await env.DB.prepare(
    `UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`
  )
    .bind(...args)
    .run();
  return await getContractById(env, id);
}

export async function getContractById(env, id) {
  if (!id) return null;
  const row = await env.DB.prepare('SELECT * FROM contracts WHERE id = ? LIMIT 1')
    .bind(id)
    .first();
  if (row && row.form_data) {
    try { row.form_data_parsed = JSON.parse(row.form_data); } catch {}
  }
  return row;
}

export async function deleteContract(env, id) {
  await env.DB.prepare('DELETE FROM contracts WHERE id = ?').bind(id).run();
}

export async function listContractsByUser(env, userId, { page = 1, limit = 20, status = null } = {}) {
  const offset = (page - 1) * limit;
  const where = ['user_id = ?'];
  const args = [userId];
  if (status) {
    where.push('status = ?');
    args.push(status);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM contracts ${whereSql}`)
    .bind(...args)
    .first();
  const total = countRow?.cnt || 0;

  const rows = await env.DB.prepare(
    `SELECT id, contract_number, status, created_at, updated_at, docx_r2_key, pdf_r2_key
     FROM contracts ${whereSql}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...args, limit, offset)
    .all();

  return { items: rows.results || [], total, page, limit };
}

export async function listAllContracts(env, { page = 1, limit = 20, status = null, search = '' } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const args = [];
  if (status) {
    where.push('c.status = ?');
    args.push(status);
  }
  if (search) {
    where.push('(c.contract_number LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
    const s = `%${search}%`;
    args.push(s, s, s);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM contracts c LEFT JOIN users u ON u.id = c.user_id ${whereSql}`
  )
    .bind(...args)
    .first();
  const total = countRow?.cnt || 0;

  const rows = await env.DB.prepare(
    `SELECT c.id, c.contract_number, c.status, c.created_at, c.docx_r2_key, c.pdf_r2_key,
            u.id as user_id, u.email as user_email, u.full_name as user_full_name
     FROM contracts c LEFT JOIN users u ON u.id = c.user_id
     ${whereSql}
     ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...args, limit, offset)
    .all();

  return { items: rows.results || [], total, page, limit };
}

export async function getContractStats(env) {
  const [total, draft, rendered, today] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM contracts`).first(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM contracts WHERE status = 'draft'`).first(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM contracts WHERE status = 'rendered'`).first(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM contracts WHERE date(created_at) = date('now')`).first(),
  ]);
  return {
    total: total?.cnt || 0,
    draft: draft?.cnt || 0,
    rendered: rendered?.cnt || 0,
    today: today?.cnt || 0,
  };
}
