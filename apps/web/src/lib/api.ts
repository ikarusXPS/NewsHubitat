// Shared API client (todo 40-07-shared-api-fetch).
//
// Every authenticated fetch in the frontend used to inline its own
// `Authorization: Bearer ${localStorage.getItem('newshub-auth-token')}`
// header. Each new authMiddleware-gated backend endpoint risked another
// silent 401 the next time someone forgot the dance. This file
// centralizes JWT attachment + token reads behind one wrapper so the
// surface stays correct as the backend grows.
//
// Single source of truth: `AuthContext` writes the token, this file
// reads it. No other call site should touch the localStorage key
// directly.

const TOKEN_KEY = 'newshub-auth-token';

// SSR-safe read of the stored JWT. Returns null when no token exists or
// when window is undefined (test/SSR contexts).
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage access can throw inside sandboxed iframes / privacy modes.
    return null;
  }
}

// Build the bearer header value or an empty object if no token. Useful
// when the caller assembles the headers manually (e.g. inside a
// useQuery queryFn that already manages other headers).
export function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type HeadersRecord = Record<string, string>;

// Normalise any HeadersInit shape to a plain object so we can merge.
function headersToObject(input: HeadersInit | undefined): HeadersRecord {
  if (!input) return {};
  if (input instanceof Headers) {
    const out: HeadersRecord = {};
    input.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (Array.isArray(input)) {
    const out: HeadersRecord = {};
    for (const [k, v] of input) out[k] = v;
    return out;
  }
  return { ...(input as HeadersRecord) };
}

// fetch wrapper that automatically attaches the JWT when one is stored
// in localStorage. Caller-supplied Authorization headers always win
// (escape hatch for one-off auth flows).
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const callerHeaders = headersToObject(init.headers);
  const hasAuthHeader = Object.keys(callerHeaders).some((k) => k.toLowerCase() === 'authorization');

  const merged: HeadersRecord = hasAuthHeader
    ? callerHeaders
    : { ...authHeader(), ...callerHeaders };

  return fetch(input, { ...init, headers: merged });
}
