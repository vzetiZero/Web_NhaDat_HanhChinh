// Admin dashboard - stats tổng quát

import { jsonOk } from '../utils/common.js';
import { requireAdmin } from '../middleware/admin.js';
import { getContractStats } from '../db/contracts.js';

export async function handleStats(request, env) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.response;

  const [contracts, users, activeDevices, last7days] = await Promise.all([
    getContractStats(env),
    env.DB.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
        SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admins
       FROM users`
    ).first(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM devices WHERE status = 'active'`).first(),
    env.DB.prepare(
      `SELECT date(created_at) as d, COUNT(*) as cnt
       FROM contracts
       WHERE date(created_at) >= date('now', '-6 days')
       GROUP BY date(created_at)
       ORDER BY d`
    ).all(),
  ]);

  return jsonOk({
    contracts,
    users: {
      total: users?.total || 0,
      active: users?.active || 0,
      suspended: users?.suspended || 0,
      admins: users?.admins || 0,
    },
    devices: { active: activeDevices?.cnt || 0 },
    contractsLast7Days: last7days.results || [],
  });
}
