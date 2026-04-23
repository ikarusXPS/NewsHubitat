import http from 'k6/http';
import { check } from 'k6';

/**
 * Login user and return JWT token
 * @param {string} email
 * @param {string} password
 * @param {string} baseUrl
 * @returns {string|null} JWT token or null on failure
 */
export function login(email, password, baseUrl) {
  const res = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email,
    password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth' },
  });

  const success = check(res, {
    'login success': (r) => r.status === 200,
    'has token': (r) => r.json('data.token') !== undefined,
  });

  return success ? res.json('data.token') : null;
}
