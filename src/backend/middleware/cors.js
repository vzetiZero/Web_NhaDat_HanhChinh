// CORS middleware

export function getCorsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Device-Fingerprint, X-Turnstile-Token',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsPreflight(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders() });
  }
  return null;
}

export function addCorsHeaders(response, origin = '*') {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(getCorsHeaders(origin))) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
