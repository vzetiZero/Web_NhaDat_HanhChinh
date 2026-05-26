// API contracts - CRUD hợp đồng của user

import { jsonOk, jsonErr, parseJsonBody, generateContractNumber, getPagination } from '../utils/common.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeviceMatch } from '../middleware/device-check.js';
import { validateContractForm } from '../utils/validation.js';
import { getConfig } from '../../config/config.js';
import {
  listContractsByUser,
  createContract,
  updateContract,
  getContractById,
  deleteContract,
  getNextContractSequence,
} from '../db/contracts.js';
import { getActiveTemplates, getTemplateByCode } from '../db/templates.js';
import { logAudit } from '../db/audit.js';
import { getClientIp, extractFingerprint } from '../utils/auth.js';

async function authAndDevice(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return { error: true, response: auth.response };
  const dev = await requireDeviceMatch(request, env, auth);
  if (dev.error) return { error: true, response: dev.response };
  return { error: false, auth };
}

export async function handleList(request, env) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;
  const url = new URL(request.url);
  const { page, limit } = getPagination(url);
  const status = url.searchParams.get('status') || null;
  const data = await listContractsByUser(env, r.auth.userId, { page, limit, status });
  return jsonOk(data);
}

export async function handleCreate(request, env) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;

  const body = await parseJsonBody(request);
  if (!body) return jsonErr('BAD_REQUEST', 'Body không hợp lệ');

  const form = body.form_data || {};
  // Validation - chỉ cảnh báo, vẫn cho lưu draft kể cả khi chưa hoàn chỉnh
  const validate = validateContractForm(form);
  const isDraftOnly = body.draft !== false;
  if (!isDraftOnly && !validate.ok) {
    return jsonErr('VALIDATION_FAILED', 'Form chưa hợp lệ', 400, { errors: validate.errors });
  }

  // Resolve template
  const templateCode = body.template_code || 'HD_TANG_QSDD_V1';
  const template = await getTemplateByCode(env, templateCode);
  if (!template) return jsonErr('TEMPLATE_NOT_FOUND', `Không tìm thấy template ${templateCode}`, 404);

  // Generate contract number
  const cfg = getConfig(env);
  const year = new Date().getFullYear();
  const seq = await getNextContractSequence(env, year);
  const contractNumber = generateContractNumber(cfg.CONTRACT_NUMBER_PREFIX, seq, year);

  const contract = await createContract(env, {
    contract_number: contractNumber,
    user_id: r.auth.userId,
    template_id: template.id,
    form_data: form,
    status: isDraftOnly ? 'draft' : 'rendered',
  });

  await logAudit(env, {
    user_id: r.auth.userId,
    event: 'contract_created',
    target_type: 'contract',
    target_id: contract.id,
    ip_address: getClientIp(request),
    device_fingerprint: extractFingerprint(request),
    detail: { contract_number: contractNumber },
  });

  return jsonOk({ contract });
}

export async function handleGet(request, env, id) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;
  const c = await getContractById(env, id);
  if (!c) return jsonErr('NOT_FOUND', 'Không tìm thấy hợp đồng', 404);
  if (c.user_id !== r.auth.userId && !r.auth.isAdmin) {
    return jsonErr('FORBIDDEN', 'Bạn không có quyền xem hợp đồng này', 403);
  }
  return jsonOk({ contract: c });
}

export async function handleUpdate(request, env, id) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;
  const c = await getContractById(env, id);
  if (!c) return jsonErr('NOT_FOUND', 'Không tìm thấy hợp đồng', 404);
  if (c.user_id !== r.auth.userId) {
    return jsonErr('FORBIDDEN', 'Bạn không có quyền sửa hợp đồng này', 403);
  }
  if (c.status !== 'draft') {
    return jsonErr('NOT_EDITABLE', 'Hợp đồng đã được xuất file, không thể chỉnh sửa', 400);
  }

  const body = await parseJsonBody(request);
  if (!body) return jsonErr('BAD_REQUEST', 'Body không hợp lệ');
  if (!body.form_data) return jsonErr('MISSING_FORM', 'Thiếu form_data');

  const updated = await updateContract(env, id, { form_data: body.form_data });
  return jsonOk({ contract: updated });
}

export async function handleDelete(request, env, id) {
  const r = await authAndDevice(request, env);
  if (r.error) return r.response;
  const c = await getContractById(env, id);
  if (!c) return jsonErr('NOT_FOUND', 'Không tìm thấy hợp đồng', 404);
  if (c.user_id !== r.auth.userId) {
    return jsonErr('FORBIDDEN', 'Bạn không có quyền xóa hợp đồng này', 403);
  }
  if (c.status !== 'draft') {
    return jsonErr('NOT_DELETABLE', 'Chỉ có thể xóa hợp đồng ở trạng thái nháp', 400);
  }
  await deleteContract(env, id);
  await logAudit(env, {
    user_id: r.auth.userId,
    event: 'contract_deleted',
    target_type: 'contract',
    target_id: id,
  });
  return jsonOk({ message: 'Đã xóa hợp đồng' });
}
