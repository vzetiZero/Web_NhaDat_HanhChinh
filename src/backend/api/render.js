// API render - tạo DOCX/PDF từ hợp đồng và trả về link tải

import { jsonOk, jsonErr } from '../utils/common.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeviceMatch } from '../middleware/device-check.js';
import { getContractById, updateContract } from '../db/contracts.js';
import { getTemplateById } from '../db/templates.js';
import { renderAndUploadDocx, prepareContractData } from '../utils/docx.js';
import { generateContractHtml, renderPdfWithBrowser } from '../utils/pdf.js';
import { uploadR2, downloadR2AsResponse } from '../utils/r2.js';
import { logAudit } from '../db/audit.js';
import { slugify } from '../utils/common.js';
import { getClientIp, extractFingerprint } from '../utils/auth.js';
import { validateContractForm } from '../utils/validation.js';
import { notifyAdmin } from '../utils/telegram.js';

async function authAndDevice(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return { error: true, response: auth.response };
  const dev = await requireDeviceMatch(request, env, auth);
  if (dev.error) return { error: true, response: dev.response };
  return { error: false, auth };
}

export async function handleRender(request, env, id, ctx) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;

  const contract = await getContractById(env, id);
  if (!contract) return jsonErr('NOT_FOUND', 'Không tìm thấy hợp đồng', 404);
  if (contract.user_id !== r.auth.userId) {
    return jsonErr('FORBIDDEN', 'Không có quyền', 403);
  }

  const form = contract.form_data_parsed || {};
  const validate = validateContractForm(form);
  if (!validate.ok) {
    return jsonErr('VALIDATION_FAILED', 'Form chưa đầy đủ để xuất hợp đồng', 400, { errors: validate.errors });
  }

  const template = await getTemplateById(env, contract.template_id);
  if (!template) return jsonErr('TEMPLATE_NOT_FOUND', 'Template không tồn tại', 404);

  const prepared = prepareContractData(form, contract.contract_number);

  // 1. Render DOCX
  let docxKey = null;
  try {
    docxKey = await renderAndUploadDocx(env, template.docx_r2_key, prepared, contract.contract_number);
  } catch (e) {
    console.error('[render docx]', e?.message);
    return jsonErr('DOCX_RENDER_FAILED', `Lỗi tạo DOCX: ${e?.message}`, 500);
  }

  // 2. Render PDF (best-effort)
  let pdfKey = null;
  const html = generateContractHtml(prepared, contract.contract_number);
  const pdfResult = await renderPdfWithBrowser(env, html, contract.contract_number);
  if (pdfResult.ok) {
    pdfKey = pdfResult.r2Key;
  } else {
    // Fallback: lưu HTML để client có thể print → PDF
    const htmlKey = `contracts/html/${slugify(contract.contract_number)}-${Date.now()}.html`;
    await uploadR2(env, htmlKey, new TextEncoder().encode(html), 'text/html; charset=utf-8');
    pdfKey = htmlKey;
  }

  // 3. Update contract
  const updated = await updateContract(env, id, {
    docx_r2_key: docxKey,
    pdf_r2_key: pdfKey,
    status: 'rendered',
  });

  await logAudit(env, {
    user_id: r.auth.userId,
    event: 'contract_rendered',
    target_type: 'contract',
    target_id: id,
    ip_address: getClientIp(request),
    device_fingerprint: extractFingerprint(request),
    detail: { docxKey, pdfKey, pdfMethod: pdfResult.ok ? 'browser' : 'html_fallback' },
  });

  notifyAdmin(env, ctx, 'Hợp đồng mới',
    `Hợp đồng ${contract.contract_number} đã được tạo bởi user ${r.auth.userId}.`);

  return jsonOk({
    contract: updated,
    download: {
      docx: `/api/contracts/${id}/download/docx`,
      pdf: `/api/contracts/${id}/download/pdf`,
    },
    pdfMethod: pdfResult.ok ? 'pdf' : 'html_fallback',
  });
}

export async function handleDownload(request, env, id, format) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;

  const contract = await getContractById(env, id);
  if (!contract) return jsonErr('NOT_FOUND', 'Không tìm thấy hợp đồng', 404);
  if (contract.user_id !== r.auth.userId && !r.auth.isAdmin) {
    return jsonErr('FORBIDDEN', 'Không có quyền', 403);
  }

  let key, ext, mime;
  if (format === 'docx') {
    key = contract.docx_r2_key;
    ext = 'docx';
    mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (format === 'pdf') {
    key = contract.pdf_r2_key;
    // Có thể là HTML fallback
    if (key && key.endsWith('.html')) {
      ext = 'html';
      mime = 'text/html; charset=utf-8';
    } else {
      ext = 'pdf';
      mime = 'application/pdf';
    }
  } else {
    return jsonErr('INVALID_FORMAT', 'Định dạng không hỗ trợ', 400);
  }

  if (!key) return jsonErr('NOT_RENDERED', 'Hợp đồng chưa được xuất file', 404);

  const filename = `hop-dong-${slugify(contract.contract_number)}.${ext}`;
  return await downloadR2AsResponse(env, key, filename);
}
