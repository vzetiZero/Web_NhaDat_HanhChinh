// Router chính - pattern matching URL và dispatch sang handler tương ứng
// Pattern: thay vì framework, dùng switch/case + regex match (lightweight cho Workers)

import { handleCorsPreflight, addCorsHeaders } from './middleware/cors.js';

// ==== API handlers ====
import * as authApi from './api/auth.js';
import * as deviceApi from './api/device.js';
import * as addressApi from './api/address.js';
import * as contractsApi from './api/contracts.js';
import * as renderApi from './api/render.js';
import * as setupApi from './api/setup.js';

// ==== Admin API handlers ====
import * as adminAuthApi from './api/admin-auth.js';
import * as adminUsersApi from './api/admin-users.js';
import * as adminContractsApi from './api/admin-contracts.js';
import * as adminDashboardApi from './api/admin-dashboard.js';
import * as adminAuditApi from './api/admin-audit.js';
import * as adminTemplatesApi from './api/admin-templates.js';

// ==== Frontend page renderers ====
import { renderHomePage } from '../frontend/pages/home.js';
import { renderLoginPage } from '../frontend/pages/login.js';
import { renderRegisterPage } from '../frontend/pages/register.js';
import { renderDashboardPage } from '../frontend/pages/dashboard.js';
import { renderContractNewPage } from '../frontend/pages/contract-new.js';
import { renderContractDetailPage } from '../frontend/pages/contract-detail.js';
import { renderContractPreviewPage } from '../frontend/pages/contract-preview.js';

// ==== Admin panel HTML ====
import { renderAdminLayout } from '../admin/layout.js';

/**
 * Match URL pattern với params (vd: /api/contracts/:id)
 * Trả về object params hoặc null nếu không match
 */
function matchPath(pattern, pathname) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function notFound() {
  return jsonResponse(
    { success: false, error: 'NOT_FOUND', message: 'Không tìm thấy endpoint' },
    404
  );
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function handleRequest(request, env, ctx) {
  // Handle CORS preflight
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // ===================================================
  // ============= API ROUTES ===========================
  // ===================================================
  if (pathname.startsWith('/api/') || pathname.startsWith('/admin/api/')) {
    const res = await routeApi(method, pathname, request, env, ctx);
    return addCorsHeaders(res);
  }

  // ===================================================
  // ============= ADMIN PANEL HTML =====================
  // ===================================================
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return htmlResponse(renderAdminLayout(env));
  }

  // ===================================================
  // ============= FRONTEND PAGES =======================
  // ===================================================
  if (method === 'GET') {
    if (pathname === '/' || pathname === '/trang-chu') {
      return htmlResponse(renderHomePage(env));
    }
    if (pathname === '/dang-nhap') {
      return htmlResponse(renderLoginPage(env));
    }
    if (pathname === '/dang-ky') {
      return htmlResponse(renderRegisterPage(env));
    }
    if (pathname === '/bang-dieu-khien') {
      return htmlResponse(renderDashboardPage(env));
    }
    if (pathname === '/hop-dong/moi') {
      return htmlResponse(renderContractNewPage(env));
    }
    let m = matchPath('/hop-dong/:id', pathname);
    if (m) return htmlResponse(renderContractDetailPage(env, m.id));
    m = matchPath('/hop-dong/:id/xem', pathname);
    if (m) return htmlResponse(renderContractPreviewPage(env, m.id));
  }

  // 404 cho mọi thứ còn lại
  if (pathname.startsWith('/api/')) return addCorsHeaders(notFound());
  return htmlResponse(renderHomePage(env), 404);
}

/**
 * Route API requests
 */
async function routeApi(method, pathname, request, env, ctx) {
  let m;

  // ============ Setup (1 lần) ============
  if (pathname === '/api/setup') return setupApi.handleSetup(request, env);

  // ============ Auth ============
  if (pathname === '/api/auth/register' && method === 'POST') {
    return authApi.handleRegister(request, env);
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    return authApi.handleLogin(request, env);
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    return authApi.handleLogout(request, env);
  }
  if (pathname === '/api/auth/me' && method === 'GET') {
    return authApi.handleMe(request, env);
  }

  // ============ Device ============
  if (pathname === '/api/device/current' && method === 'GET') {
    return deviceApi.handleGetCurrent(request, env);
  }
  // (moved /api/device/request-reset xuống dưới để truyền ctx)

  // ============ Address (public) ============
  if (pathname === '/api/address/provinces' && method === 'GET') {
    return addressApi.handleProvinces(request, env);
  }
  if (pathname === '/api/address/districts' && method === 'GET') {
    return addressApi.handleDistricts(request, env);
  }
  if (pathname === '/api/address/wards' && method === 'GET') {
    return addressApi.handleWards(request, env);
  }
  if (pathname === '/api/address/search' && method === 'GET') {
    return addressApi.handleSearch(request, env);
  }

  // ============ Contracts (user) ============
  if (pathname === '/api/contracts' && method === 'GET') {
    return contractsApi.handleList(request, env);
  }
  if (pathname === '/api/contracts' && method === 'POST') {
    return contractsApi.handleCreate(request, env);
  }
  m = matchPath('/api/contracts/:id', pathname);
  if (m) {
    if (method === 'GET') return contractsApi.handleGet(request, env, m.id);
    if (method === 'PUT') return contractsApi.handleUpdate(request, env, m.id);
    if (method === 'DELETE') return contractsApi.handleDelete(request, env, m.id);
  }
  m = matchPath('/api/contracts/:id/render', pathname);
  if (m && method === 'POST') return renderApi.handleRender(request, env, m.id, ctx);

  m = matchPath('/api/contracts/:id/download/:format', pathname);
  if (m && method === 'GET') return renderApi.handleDownload(request, env, m.id, m.format);

  if (pathname === '/api/device/request-reset' && method === 'POST') {
    return deviceApi.handleRequestReset(request, env, ctx);
  }

  // ============ Admin Auth ============
  if (pathname === '/admin/api/auth/login' && method === 'POST') {
    return adminAuthApi.handleLogin(request, env);
  }

  // ============ Admin Dashboard ============
  if (pathname === '/admin/api/dashboard/stats' && method === 'GET') {
    return adminDashboardApi.handleStats(request, env);
  }

  // ============ Admin Users ============
  if (pathname === '/admin/api/users' && method === 'GET') {
    return adminUsersApi.handleList(request, env);
  }
  m = matchPath('/admin/api/users/:id', pathname);
  if (m && method === 'GET') return adminUsersApi.handleGet(request, env, m.id);
  m = matchPath('/admin/api/users/:id/reset-device', pathname);
  if (m && method === 'POST') return adminUsersApi.handleResetDevice(request, env, m.id);
  m = matchPath('/admin/api/users/:id/suspend', pathname);
  if (m && method === 'POST') return adminUsersApi.handleSuspend(request, env, m.id);

  // ============ Admin Contracts ============
  if (pathname === '/admin/api/contracts' && method === 'GET') {
    return adminContractsApi.handleList(request, env);
  }
  m = matchPath('/admin/api/contracts/:id', pathname);
  if (m && method === 'GET') return adminContractsApi.handleGet(request, env, m.id);

  // ============ Admin Audit ============
  if (pathname === '/admin/api/audit' && method === 'GET') {
    return adminAuditApi.handleList(request, env);
  }

  // ============ Admin Templates ============
  if (pathname === '/admin/api/templates' && method === 'GET') {
    return adminTemplatesApi.handleList(request, env);
  }
  if (pathname === '/admin/api/templates' && method === 'POST') {
    return adminTemplatesApi.handleUpload(request, env);
  }

  return notFound();
}
