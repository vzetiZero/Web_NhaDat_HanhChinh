// Web Chứng Từ Nhà Đất - Cloudflare Worker Entry Point
// Entry chính, mọi request được forward sang backend/router.js

import { handleRequest } from './backend/router.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      console.error('[Worker] Unhandled error:', error?.stack || error?.message || error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INTERNAL_ERROR',
          message: error?.message || 'Lỗi máy chủ nội bộ',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
