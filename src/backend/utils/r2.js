// R2 Storage utilities
// Wraps env.R2 binding cho upload/download/delete

/**
 * Upload buffer/arrayBuffer/stream lên R2
 */
export async function uploadR2(env, key, data, contentType = 'application/octet-stream', metadata = {}) {
  if (!env.R2) throw new Error('R2 binding chưa được cấu hình');
  await env.R2.put(key, data, {
    httpMetadata: { contentType },
    customMetadata: metadata,
  });
  return { key, contentType };
}

/**
 * Download file từ R2 - trả về Response stream sẵn sàng để trả về client
 */
export async function downloadR2AsResponse(env, key, filename = null) {
  if (!env.R2) {
    return new Response('R2 không khả dụng', { status: 500 });
  }
  const obj = await env.R2.get(key);
  if (!obj) {
    return new Response(
      JSON.stringify({ success: false, error: 'NOT_FOUND', message: 'File không tồn tại' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  if (filename) {
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  }
  return new Response(obj.body, { headers });
}

/**
 * Đọc file R2 thành ArrayBuffer (dùng nội bộ cho render PDF từ DOCX, etc.)
 */
export async function readR2Buffer(env, key) {
  if (!env.R2) return null;
  const obj = await env.R2.get(key);
  if (!obj) return null;
  return await obj.arrayBuffer();
}

export async function deleteR2(env, key) {
  if (!env.R2) return false;
  await env.R2.delete(key);
  return true;
}

export async function existsR2(env, key) {
  if (!env.R2) return false;
  const head = await env.R2.head(key);
  return head !== null;
}
