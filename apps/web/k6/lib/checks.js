/**
 * Check HTTP status code (allowing 429 rate limits per D-07)
 * @param {Response} res
 * @param {number[]} allowedCodes
 * @returns {boolean}
 */
export function checkStatus(res, allowedCodes = [200]) {
  // D-07: 429 rate limit responses are expected, not failures
  const validCodes = [...allowedCodes, 429];
  return validCodes.includes(res.status);
}

/**
 * Check response has expected schema structure
 * @param {Response} res
 * @param {string[]} requiredFields
 * @returns {boolean}
 */
export function checkSchema(res, requiredFields) {
  if (res.status !== 200) return true; // Skip schema check for non-200

  const body = res.json();
  return requiredFields.every(field => body.hasOwnProperty(field));
}
