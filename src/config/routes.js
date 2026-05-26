// Bảng route - dùng để tra cứu nhanh, không bắt buộc dùng (router dùng pattern matching)
// Đây chỉ là tài liệu sống cho dev xem nhanh các endpoint.

export const PUBLIC_ROUTES = [
  ['POST', '/api/auth/register'],
  ['POST', '/api/auth/login'],
  ['GET', '/api/address/provinces'],
  ['GET', '/api/address/districts'],
  ['GET', '/api/address/wards'],
  ['GET', '/api/setup'], // chỉ chạy 1 lần
];

export const USER_ROUTES = [
  ['POST', '/api/auth/logout'],
  ['GET', '/api/auth/me'],
  ['GET', '/api/device/current'],
  ['POST', '/api/device/request-reset'],
  ['GET', '/api/contracts'],
  ['POST', '/api/contracts'],
  ['GET', '/api/contracts/:id'],
  ['PUT', '/api/contracts/:id'],
  ['DELETE', '/api/contracts/:id'],
  ['POST', '/api/contracts/:id/render'],
  ['GET', '/api/contracts/:id/download/:format'],
];

export const ADMIN_ROUTES = [
  ['POST', '/admin/api/auth/login'],
  ['GET', '/admin/api/dashboard/stats'],
  ['GET', '/admin/api/users'],
  ['GET', '/admin/api/users/:id'],
  ['POST', '/admin/api/users/:id/reset-device'],
  ['POST', '/admin/api/users/:id/suspend'],
  ['GET', '/admin/api/contracts'],
  ['GET', '/admin/api/contracts/:id'],
  ['GET', '/admin/api/audit'],
  ['GET', '/admin/api/templates'],
  ['POST', '/admin/api/templates'],
];

export const FRONTEND_PAGES = [
  '/',                  // home
  '/dang-nhap',         // login
  '/dang-ky',           // register
  '/bang-dieu-khien',   // user dashboard
  '/hop-dong/moi',      // tạo hợp đồng mới
  '/hop-dong/:id',      // chi tiết
  '/hop-dong/:id/xem',  // preview
  '/admin',             // admin panel SPA
];
