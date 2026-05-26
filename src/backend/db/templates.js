// Database layer - contract_templates

export async function getTemplateById(env, id) {
  return await env.DB.prepare('SELECT * FROM contract_templates WHERE id = ?').bind(id).first();
}

export async function getTemplateByCode(env, code) {
  return await env.DB.prepare('SELECT * FROM contract_templates WHERE code = ?').bind(code).first();
}

export async function getActiveTemplates(env) {
  const rows = await env.DB.prepare(
    `SELECT * FROM contract_templates WHERE is_active = 1 ORDER BY id`
  ).all();
  return rows.results || [];
}

export async function createTemplate(env, { code, name, description, docx_r2_key, field_schema }) {
  const r = await env.DB.prepare(
    `INSERT INTO contract_templates (code, name, description, docx_r2_key, field_schema, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
  )
    .bind(code, name, description || null, docx_r2_key, field_schema || null)
    .run();
  return await getTemplateById(env, r.meta.last_row_id);
}

export async function upsertTemplateByCode(env, data) {
  const existing = await getTemplateByCode(env, data.code);
  if (existing) {
    await env.DB.prepare(
      `UPDATE contract_templates
       SET name = ?, description = ?, docx_r2_key = ?, field_schema = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        data.name,
        data.description || null,
        data.docx_r2_key,
        data.field_schema || null,
        existing.id
      )
      .run();
    return await getTemplateById(env, existing.id);
  }
  return await createTemplate(env, data);
}
