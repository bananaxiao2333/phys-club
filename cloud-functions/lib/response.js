// Standard JSON response builder with CORS headers for EdgeOne cloud functions.

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

export function jsonError(status, message) {
  return json({ message }, status);
}

export function ok(data) {
  return json(data, 200);
}

export function created(data) {
  return json(data, 201);
}

// Check if an error is a structured JSON error we should return directly.
export function isJsonError(error) {
  return error?.__jsonResponse === true;
}

// Standard error handler for route functions. Converts errors to JSON responses.
export function handleError(error) {
  if (isJsonError(error)) {
    return json({ message: error.message }, error.status);
  }
  if (error.status && error.message) {
    return json({ message: error.message }, error.status);
  }
  console.error(error);
  return json({ message: error.message || '请求处理失败。' }, 400);
}

// Handle CORS preflight requests. Cloud functions should export this
// when the route needs to handle non-GET methods from browsers.
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}
