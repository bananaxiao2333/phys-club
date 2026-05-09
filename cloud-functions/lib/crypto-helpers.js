// Web Crypto API equivalents for Node crypto operations used by database.js.
// EdgeOne cloud functions run on a Workers-like runtime where Node's crypto
// module may not be available.

export function randomHex(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate a unique ID with timestamp prefix, matching the pattern from server code.
export function makeId(prefix) {
  const ts = Date.now().toString(36);
  const rand = randomHex(5);
  return `${prefix}_${ts}_${rand}`;
}
