// Admin contract templates - upload DOCX template gốc lên R2

import { jsonOk, jsonErr } from '../utils/common.js';
import { requireAdmin } from '../middleware/admin.js';
import { getActiveTemplates, upsertTemplateByCode } from '../db/templates.js';
import { uploadR2 } from '../utils/r2.js';
import { logAudit } from '../db/audit.js';

export async function handleList(request, env) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const items = await getActiveTemplates(env);
  return jsonOk({ items });
}

/**
 * Upload bằng multipart/form-data:
 * - file: DOCX file
 * - code: 'HD_TANG_QSDD_V1'
 * - name: tên hiển thị
 * - description: mô tả
 */
export async function handleUpload(request, env) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonErr('BAD_REQUEST', 'Yêu cầu multipart/form-data');
  }
  const file = formData.get('file');
  const code = String(formData.get('code') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();

  if (!file || typeof file === 'string') return jsonErr('NO_FILE', 'Thiếu file DOCX');
  if (!code) return jsonErr('NO_CODE', 'Thiếu code template');
  if (!name) return jsonErr('NO_NAME', 'Thiếu tên template');

  // Upload R2
  const r2Key = `templates/${code.toLowerCase()}-${Date.now()}.docx`;
  const arrayBuf = await file.arrayBuffer();
  await uploadR2(
    env,
    r2Key,
    arrayBuf,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  const template = await upsertTemplateByCode(env, {
    code,
    name,
    description,
    docx_r2_key: r2Key,
  });

  await logAudit(env, {
    admin_id: auth.userId,
    event: 'admin_upload_template',
    target_type: 'template',
    target_id: template.id,
    detail: { code, r2Key, size: arrayBuf.byteLength },
  });

  return jsonOk({ template, message: 'Đã upload template' });
}
