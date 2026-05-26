// Admin audit logs API

import { jsonOk, getPagination } from '../utils/common.js';
import { requireAdmin } from '../middleware/admin.js';
import { listAuditLogs } from '../db/audit.js';

export async function handleList(request, env) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;
  const url = new URL(request.url);
  const { page, limit } = getPagination(url, 50);
  const event = url.searchParams.get('event') || null;
  const userId = url.searchParams.get('user_id') || null;
  const data = await listAuditLogs(env, { page, limit, event, user_id: userId });
  return jsonOk(data);
}
