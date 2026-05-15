// Minimal JWT HS256 implementation using Web Crypto API.
// Replaces jsonwebtoken for EdgeOne cloud functions compatibility.

const encoder = new TextEncoder();

function base64url(bytes) {
  const str = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return new Uint8Array(sig);
}

async function hmacVerify(data, secret, signature) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
}

export async function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(`${headerB64}.${payloadB64}`, secret);
  return `${headerB64}.${payloadB64}.${base64url(sig)}`;
}

export async function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const sigBytes = base64urlDecode(parts[2]);
    const valid = await hmacVerify(`${parts[0]}.${parts[1]}`, secret, sigBytes);
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));

    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
