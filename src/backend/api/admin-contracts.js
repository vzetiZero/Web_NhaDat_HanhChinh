// Admin contracts API - list, view

import { jsonOk, jsonErr, getPagination } from '../utils/common.js';
import { requireAdmin } from '../middleware/admin.js';
import { listAllContracts, getContractById } from '../db/contracts.js';

export async function handleList(request, env) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const url = new URL(request.url);
  const { page, limit } = getPagination(url);
  const status = url.searchParams.get('status') || null;
  const search = url.searchParams.get('search') || '';
  const data = await listAllContracts(env, { page, limit, status, search });
  return jsonOk(data);
}

export async function handleGet(request, env, id) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const c = await getContractById(env, id);
  if (!c) return jsonErr('NOT_FOUND', 'Không tìm thấy hợp đồng', 404);
  return jsonOk({ contract: c });
}
