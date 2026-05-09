// Standard JSON response builder with CORS headers for EdgeOne cloud functions.

function buildCorsHeaders(origin) {
  const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  let allowOrigin = null;
  if (!allowed.length) {
    // Dev mode: allow localhost
    if (origin && (origin.startsWith('http://127.0.0.1') || origin.startsWith('http://localhost'))) {
      allowOrigin = origin;
    }
  } else if (allowed.includes('*')) {
    allowOrigin = '*';
  } else if (allowed.includes(origin)) {
    allowOrigin = origin;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  }
  return headers;
}

function jsonHeaders() {
  const h = { 'Content-Type': 'application/json' };
  // In production (CORS_ORIGIN set), use the configured origin. In dev, allow localhost.
  if (process.env.CORS_ORIGIN) {
    h['Access-Control-Allow-Origin'] = process.env.CORS_ORIGIN;
    h['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    h['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  }
  return h;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders() });
}

// Check if an error is a structured JSON error we should return directly.
export function isJsonError(error) {
  return error?.__jsonResponse === true;
}

// Standard error handler. Don't leak internal error details to clients.
export function handleError(error) {
  if (isJsonError(error)) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (error.status && error.message) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  console.error(error);
  return new Response(JSON.stringify({ message: '服务器处理请求时发生错误。' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Handle CORS preflight requests.
export function onRequestOptions(context) {
  const origin = context?.request?.headers?.get?.('Origin') || '';
  return new Response(null, { status: 204, headers: buildCorsHeaders(origin) });
}
